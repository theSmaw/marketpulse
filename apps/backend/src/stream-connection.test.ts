import { describe, expect, it } from "vitest";

import {
  DISCONNECTED_AFTER_MS,
  OBSERVATION_INTERVAL_MS,
  STALE_AFTER_MS,
} from "@marketpulse/shared";

import {
  advanceStreamConnection,
  feedStatusOf,
  initialStreamConnection,
  type StreamConnection,
  type StreamEvent,
} from "./stream-connection.js";

// Every instant here is a number the reducer is TOLD. Nothing reads a clock,
// which is what lets a 4h21m silence be tested in microseconds.
// One scale for both clocks. This suite constructs its own observations, so
// the epoch and the monotonic reading can be the same number here — which is
// exactly what production cannot do, and is why `FeedStatusInputs` has two
// fields. See its two-clocks note.
const T0 = 1_757_000_000_000;

const walk = (events: readonly StreamEvent[]): StreamConnection =>
  events.reduce(advanceStreamConnection, initialStreamConnection);

/** The handshake exactly as `LIVE-DATA.md` §4.1 recorded it. */
const handshake: readonly StreamEvent[] = [
  { kind: "socket-opened", at: T0 },
  { kind: "greeted", at: T0 + 2 },
  { kind: "authenticated", at: T0 + 255 },
  { kind: "subscription-acknowledged", symbolCount: 518, at: T0 + 600 },
];

describe("the handshake, as the spike recorded it", () => {
  it("walks socket-open -> greeted -> authenticated -> subscribed", () => {
    expect(walk(handshake).phase).toBe("subscribed");
    expect(walk(handshake).subscribedSymbols).toBe(518);
  });

  it("does NOT treat an open socket as a connected one", () => {
    // §4.5, and it is the finding with the widest blast radius: the socket to
    // `/v2/sip` OPENS, is greeted identically, and only refuses at
    // authentication — leaving the socket open. A client keying connected state
    // off `onopen` reports a healthy SIP connection indefinitely.
    const opened = walk([{ kind: "socket-opened", at: T0 }]);

    expect(opened.phase).toBe("socket-open");
    expect(opened.phase).not.toBe("authenticated");
  });

  it("reports the sip refusal as a refusal on a socket that is still up", () => {
    // §4.5 measured the server holding the refused socket open for 5 s and
    // still silent. `refused` is a state we are CONNECTED in.
    const refused = walk([
      { kind: "socket-opened", at: T0 },
      { kind: "greeted", at: T0 + 2 },
      { kind: "error-frame", code: 409, at: T0 + 255 },
    ]);

    expect(refused.phase).toBe("refused");
    expect(refused.lastErrorCode).toBe(409);
    // Still live: an error frame is inbound traffic, so it is evidence the
    // connection works even though the subscription does not.
    expect(
      feedStatusOf(refused, {
        now: T0 + 300,
        wallNow: T0 + 300,
        marketOpen: false,
      }),
    ).toBe("live");
  });
});

describe("the four authentication failures, which are frames rather than closures", () => {
  // §8.3: three distinct causes produce a BYTE-IDENTICAL `402`, so an operator
  // log cannot distinguish them and must not claim to. §8.4: the socket stays
  // OPEN after all of them, indefinitely.
  it.each([
    ["wrong key", 402],
    ["wrong secret", 402],
    ["no credential", 402],
    ["invalid syntax", 400],
  ])("keeps the connection up after %s (%i)", (_cause, code) => {
    const state = walk([
      { kind: "socket-opened", at: T0 },
      { kind: "greeted", at: T0 + 2 },
      { kind: "error-frame", code, at: T0 + 250 },
    ]);

    expect(state.phase).toBe("refused");
    expect(state.lastCloseElapsedMs).toBeUndefined();
    expect(
      feedStatusOf(state, {
        now: T0 + 251,
        wallNow: T0 + 251,
        marketOpen: true,
      }),
    ).not.toBe("disconnected");
  });

  it("carries the error code, because unlike a close code it discriminates", () => {
    expect(
      walk([{ kind: "error-frame", code: 400, at: T0 }]).lastErrorCode,
    ).toBe(400);
  });
});

describe("406 connection limit exceeded — wait and retry, never fatal", () => {
  it("leaves the connection alive so a caller can retry rather than stop", () => {
    // §8.2: the INCUMBENT wins. A rolling replica replacement has two processes
    // alive by design and the arriving one is us, so a client that read this as
    // terminal would have no feed after EVERY deploy until somebody restarted
    // it by hand.
    const refused = walk([
      { kind: "socket-opened", at: T0 },
      { kind: "greeted", at: T0 + 2 },
      { kind: "authenticated", at: T0 + 233 },
      { kind: "error-frame", code: 406, at: T0 + 466 },
    ]);

    expect(refused.phase).toBe("refused");
    expect(refused.lastErrorCode).toBe(406);
    expect(refused.phase).not.toBe("closed");
  });

  it("records the ~10 s close that follows, without a code", () => {
    // §8.1 measured the refused duplicate closed 9,964 ms after the error
    // frame. The code is `1006` and says nothing; the elapsed time is the
    // discriminator.
    const closed = walk([
      { kind: "error-frame", code: 406, at: T0 },
      { kind: "closed", elapsedMs: 9_964, at: T0 + 9_964 },
    ]);

    expect(closed.phase).toBe("closed");
    expect(closed.lastCloseElapsedMs).toBe(9_964);
    expect(closed).not.toHaveProperty("closeCode");
  });
});

describe("the close stopwatch — five causes, all 1006", () => {
  // §8.5's table. Nothing branches on a code anywhere in this module; these
  // assert the elapsed figure survives so Story 3.10 can.
  it.each([
    ["our own link destroyed", 1],
    ["a live socket answering", 243],
    ["the server closing a rude client", 5_999],
    ["a refused duplicate", 9_964],
    ["ws@8 timing out on a corpse", 30_016],
  ])("carries %s as %i ms", (_cause, elapsedMs) => {
    expect(
      walk([{ kind: "closed", elapsedMs, at: T0 }]).lastCloseElapsedMs,
    ).toBe(elapsedMs);
  });

  it("drops the subscription count on close, because the server remembers none", () => {
    // §8.7: subscriptions are ours to re-assert; the server holds nothing
    // across a reconnect.
    const closed = walk([
      ...handshake,
      { kind: "closed", elapsedMs: 243, at: T0 + 1_000 },
    ]);

    expect(closed.subscribedSymbols).toBe(0);
  });
});

describe("the silent death — the fault with no event at all", () => {
  it("reports disconnected after 165 s of inbound silence", () => {
    // §6.4: a capture held `readyState === OPEN` for 4h21m on a dead socket,
    // with no error, no close and no reset. Inbound silence is the ONLY signal.
    const state = walk(handshake);
    const lastFrame = T0 + 600;

    expect(
      feedStatusOf(state, {
        now: lastFrame + DISCONNECTED_AFTER_MS - 1,
        wallNow: lastFrame + DISCONNECTED_AFTER_MS - 1,
        marketOpen: true,
      }),
    ).not.toBe("disconnected");
    expect(
      feedStatusOf(state, {
        now: lastFrame + DISCONNECTED_AFTER_MS,
        wallNow: lastFrame + DISCONNECTED_AFTER_MS,
        marketOpen: true,
      }),
    ).toBe("disconnected");
  });

  it("would have caught the real 4h21m death", () => {
    const state = walk(handshake);
    const fourHours21 = 4 * 3_600_000 + 21 * 60_000;

    expect(
      feedStatusOf(state, {
        now: T0 + fourHours21,
        wallNow: T0 + fourHours21,
        marketOpen: false,
      }),
    ).toBe("disconnected");
  });

  it("keeps the connection alive on a heartbeat alone, subscribed to nothing", () => {
    // §6.3: the 54 s ping is a property of the CONNECTION, not the
    // subscription — measured on a socket subscribed to nothing as much as on
    // one subscribed to all 518. It is why no keepalive of our own exists.
    const state = walk([
      { kind: "socket-opened", at: T0 },
      { kind: "greeted", at: T0 + 2 },
      { kind: "authenticated", at: T0 + 255 },
      { kind: "heartbeat", at: T0 + 54_000 },
      { kind: "heartbeat", at: T0 + 108_000 },
    ]);

    expect(
      feedStatusOf(state, {
        now: T0 + 130_000,
        wallNow: T0 + 130_000,
        marketOpen: false,
      }),
    ).toBe("live");
  });
});

describe("stale — our socket is fine and the feed behind it is dead", () => {
  const subscribedAt = T0 + 600;
  const withObservation = (observedAt: number): StreamConnection =>
    walk([...handshake, { kind: "observations", observedAt, at: observedAt }]);

  it("is reported when the heartbeat is current but no observation arrives in session", () => {
    // §11.2, and this is the second of the two things §11.2 requires be
    // separately sayable.
    const state = walk([
      ...handshake,
      { kind: "observations", observedAt: subscribedAt, at: subscribedAt },
      // The socket is demonstrably alive throughout.
      { kind: "heartbeat", at: subscribedAt + 54_000 },
    ]);

    // **`+ OBSERVATION_INTERVAL_MS` is the correction Task 3.3.4 made**, not
    // padding. §7.3 measured that a bar's `t` opens the interval it describes,
    // so an observation is not *late* until its own minute has closed — and a
    // threshold applied to the opening instant fired on every healthy delivery.
    const observationClosedAt = subscribedAt + OBSERVATION_INTERVAL_MS;

    expect(
      feedStatusOf(state, {
        now: observationClosedAt + STALE_AFTER_MS,
        wallNow: observationClosedAt + STALE_AFTER_MS,
        marketOpen: true,
      }),
    ).toBe("stale");
  });

  it("does NOT call a healthy feed stale at the moment a bar arrives", () => {
    // **The regression this test exists for, found 2026-09-19 by Task 3.3.4 and
    // fixed the same day.** §7.3 records it with a control and a verbatim
    // frame: *"a bar stamped `14:01:00Z` arrives at `14:02:00.5Z`"*. So the
    // freshest observation a minute-bar feed can ever hold is **60.5 s old at
    // the instant it arrives** — and the shipped rule subtracted 60 s from the
    // *opening* instant, so `stale` fired on every healthy delivery and `live`
    // was unreachable during a session.
    //
    // This is 3.2.6's defect in a mirror. That one made `stale` unreachable by
    // merging two clocks; this one made `live` unreachable by measuring from
    // the wrong end of an interval. Both were invisible to every test because
    // no test supplied a realistic pair of *bar instant* and *arrival*.
    const barStart = Date.parse("2026-09-16T14:01:00Z");
    const arrivedAt = Date.parse("2026-09-16T14:02:00.5Z");

    expect(arrivedAt - barStart).toBe(60_500);

    const state = walk([
      ...handshake,
      { kind: "observations", observedAt: barStart, at: 60_500 },
    ]);

    expect(
      feedStatusOf(state, {
        now: 60_500,
        wallNow: arrivedAt,
        marketOpen: true,
      }),
    ).toBe("live");
  });

  it("is NOT reported out of hours, however long the DATA silence", () => {
    // §6.6 measured 76 minutes of legitimate overnight silence on bar
    // channels. An ungated 60 s rule would report a healthy feed as stale every
    // minute of every night.
    //
    // **The heartbeats are the point of this test rather than set dressing.**
    // A first draft omitted them and asserted `live` after 76 minutes of
    // nothing at all — which the implementation correctly called
    // `disconnected`, because 76 minutes of NO FRAMES is a dead socket however
    // shut the market is. What §6.6 actually observed is 76 minutes with no
    // *bars* and the 54 s ping arriving throughout, and the two are exactly the
    // distinction this module exists to keep apart: silence of DATA is normal,
    // silence of FRAMES is death.
    const seventySixMinutes = 76 * 60_000;
    const pings: StreamEvent[] = [];
    for (let t = 54_000; t <= seventySixMinutes; t += 54_000) {
      pings.push({ kind: "heartbeat", at: subscribedAt + t });
    }
    const state = walk([...handshake, ...pings]);

    expect(pings.length).toBeGreaterThan(80);
    expect(
      feedStatusOf(state, {
        now: subscribedAt + seventySixMinutes,
        wallNow: subscribedAt + seventySixMinutes,
        marketOpen: false,
      }),
    ).toBe("live");
  });

  it("still reports disconnected out of hours when the HEARTBEAT stops", () => {
    // The other half of the same distinction, and the one that catches a socket
    // that died at 3am: the market being shut excuses missing data, never
    // missing frames.
    const state = walk([
      ...handshake,
      { kind: "heartbeat", at: subscribedAt + 54_000 },
    ]);

    expect(
      feedStatusOf(state, {
        now: subscribedAt + 54_000 + DISCONNECTED_AFTER_MS,
        wallNow: subscribedAt + 54_000 + DISCONNECTED_AFTER_MS,
        marketOpen: false,
      }),
    ).toBe("disconnected");
  });

  it("keys on the observation's own instant, not on a frame having arrived", () => {
    // §6.7: `dailyBars` re-sends a BYTE-IDENTICAL aggregate every minute out of
    // hours. A rule keyed on arrival would call that liveness. Here a frame
    // arrives now carrying an hour-old observation, and the feed is stale.
    const now = T0 + 3_600_000;
    const state = walk([
      ...handshake,
      { kind: "observations", observedAt: T0, at: now },
    ]);

    expect(state.lastInboundAt).toBe(now);
    expect(feedStatusOf(state, { now, wallNow: now, marketOpen: true })).toBe(
      "stale",
    );
  });

  it("takes the newest observation when frames arrive out of order", () => {
    const older = walk([
      ...handshake,
      { kind: "observations", observedAt: T0 + 10_000, at: T0 + 10_000 },
      { kind: "observations", observedAt: T0 + 5_000, at: T0 + 11_000 },
    ]);

    expect(older.lastObservationAt).toBe(T0 + 10_000);
  });

  it("reports live when an observation is inside the window", () => {
    const observedAt = subscribedAt;
    expect(
      feedStatusOf(withObservation(observedAt), {
        now: observedAt + STALE_AFTER_MS - 1,
        wallNow: observedAt + STALE_AFTER_MS - 1,
        marketOpen: true,
      }),
    ).toBe("live");
  });
});

describe("the two clocks — the defect Task 3.2.6 found", () => {
  // **This is a regression guard on a bug that shipped in 3.2.5 and could never
  // have been caught by that task's own tests**, because they controlled both
  // numbers and kept them on one scale. The seam's SECOND implementation found
  // it, which is exactly what a second implementation is for.
  //
  // `lastInboundAt` is a MONOTONIC reading (`performance.now()`, near zero);
  // an observation's instant is EPOCH (~1.76e12). Subtracting an epoch from a
  // monotonic value is hugely negative, so the staleness comparison could never
  // reach its threshold: the feed would have reported `live` or `disconnected`
  // for ever and **never `stale`**, silently, in production — and §11.2 exists
  // to make precisely that state sayable.
  const monotonic = 42_000;
  const observationInstant = Date.parse("2026-09-16T14:01:00Z");

  const liveSocketWithOldObservation: StreamConnection = {
    ...initialStreamConnection,
    phase: "subscribed",
    lastInboundAt: monotonic,
    lastObservationAt: observationInstant,
  };

  it("reports stale when the observation is old, however small `now` is", () => {
    expect(
      feedStatusOf(liveSocketWithOldObservation, {
        // A monotonic reading a second after the last frame: the socket is
        // demonstrably alive.
        now: monotonic + 1_000,
        // An hour after the observation's own instant.
        wallNow: observationInstant + 3_600_000,
        marketOpen: true,
      }),
    ).toBe("stale");
  });

  it("would have reported live if one clock were used for both", () => {
    // The shape of the bug, asserted so the fix cannot be quietly undone: with
    // the monotonic value standing in for the wall clock, the subtraction is
    // negative and `stale` is unreachable.
    expect(observationInstant - monotonic).toBeGreaterThan(STALE_AFTER_MS);
    expect(monotonic - observationInstant).toBeLessThan(0);
  });

  it("still reports disconnected on monotonic silence, whatever the wall says", () => {
    expect(
      feedStatusOf(liveSocketWithOldObservation, {
        now: monotonic + DISCONNECTED_AFTER_MS,
        wallNow: observationInstant,
        marketOpen: true,
      }),
    ).toBe("disconnected");
  });
});

describe("what the reducer refuses to do", () => {
  it("never throws on an event that makes no sense in the current phase", () => {
    // The socket is a third party. `PROVIDER.md` §8.5: a throw says OUR program
    // is wrong, and a vendor sending an unexpected frame is not that.
    expect(() =>
      walk([
        { kind: "authenticated", at: T0 },
        { kind: "greeted", at: T0 + 1 },
        { kind: "subscription-acknowledged", symbolCount: 3, at: T0 + 2 },
        { kind: "socket-opened", at: T0 + 3 },
      ]),
    ).not.toThrow();
  });

  it("reports disconnected before anything has ever arrived", () => {
    expect(
      feedStatusOf(initialStreamConnection, {
        now: T0,
        wallNow: T0,
        marketOpen: true,
      }),
    ).toBe("disconnected");
  });

  it("holds the thresholds the spike measured", () => {
    // These two numbers are the story's, and a change to either is a change to
    // a measured decision rather than a tuning tweak.
    expect(DISCONNECTED_AFTER_MS).toBe(165_000);
    expect(STALE_AFTER_MS).toBe(60_000);
  });
});
