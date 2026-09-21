import {
  DISCONNECTED_AFTER_MS,
  MARKET_STREAM_PROTOCOL_VERSION,
  OBSERVATION_INTERVAL_MS,
  STALE_AFTER_MS,
  type MarketStreamMessage,
  type WireFeedState,
} from "@marketpulse/shared";
import { connectionWordFor } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  type LiveFeedConnection,
  type LiveFeedEvent,
  advanceLiveFeed,
  firstUnreadable,
  initialLiveFeed,
  liveFeedView,
  sameLiveFeedView,
  startedLiveFeed,
} from "./live-feed.js";

// The browser's feed state, decided with no socket (Task 3.3.4).
//
// Every test here is a pure function call. The socket is `market-stream-client`'s
// and the timer is `use-live-feed`'s; what this file holds is the part that has
// to be *right*, and it is the part neither of those can test.

// §7.3's measured pair, verbatim: "a bar stamped `14:01:00Z` arrives at
// `14:02:00.5Z`". Used rather than round numbers because the 60.5 s gap between
// them is the fact the staleness rule got wrong.
const BAR_START = Date.parse("2026-09-16T14:01:00Z");
const BAR_ARRIVED = Date.parse("2026-09-16T14:02:00.5Z");

const feedState = (over: Partial<WireFeedState> = {}): WireFeedState => ({
  status: "live",
  feed: "iex",
  marketOpen: true,
  ...over,
});

const snapshot = (
  feed: WireFeedState,
  observations: Readonly<Record<string, { startsAt: string }>> = {},
): MarketStreamMessage => ({
  type: "snapshot",
  version: MARKET_STREAM_PROTOCOL_VERSION,
  feed,
  observations: Object.fromEntries(
    Object.entries(observations).map(([symbol, { startsAt }]) => [
      symbol,
      { startsAt, open: 1, high: 1, low: 1, close: 1, volume: 1 },
    ]),
  ),
});

const walk = (events: readonly LiveFeedEvent[]): LiveFeedConnection =>
  events.reduce(advanceLiveFeed, initialLiveFeed);

/** Connected, told everything, at the instant §7.3 says a bar lands. */
const healthy = (over: Partial<WireFeedState> = {}): LiveFeedConnection =>
  walk([
    { kind: "opened", at: 0 },
    {
      kind: "message",
      at: 60_500,
      message: snapshot(feedState(over), {
        NVDA: { startsAt: "2026-09-16T14:01:00Z" },
      }),
    },
  ]);

const at = (state: LiveFeedConnection, now: number, wallNow: number) =>
  liveFeedView(state, { now, wallNow });

describe("the reducer", () => {
  it("does not call an open socket connected", () => {
    // §4.5's lesson one layer up: a socket that opened has told us nothing.
    const state = walk([{ kind: "opened", at: 10 }]);

    expect(state.socket).toBe("open");
    expect(state.lastInboundAt).toBeUndefined();
    expect(at(state, 10, BAR_ARRIVED).status).toBe("disconnected");
  });

  it("takes the newest observation instant across a batch", () => {
    // The vendor batches (§7.2), so one message carries many securities and
    // they are not ordered.
    const state = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: snapshot(feedState(), {
          AAPL: { startsAt: "2026-09-16T14:00:00Z" },
          NVDA: { startsAt: "2026-09-16T14:01:00Z" },
          TSLA: { startsAt: "2026-09-16T13:59:00Z" },
        }),
      },
    ]);

    expect(state.lastObservationAt).toBe(BAR_START);
  });

  it("never lets a malformed instant poison the newest one", () => {
    // `Date.parse` returns NaN for anything it cannot read, and `Math.max` with
    // one NaN is NaN — which would make the feed permanently stale from one bad
    // string. The same hazard `Number.isFinite` answers one layer over.
    const state = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: snapshot(feedState(), {
          NVDA: { startsAt: "2026-09-16T14:01:00Z" },
          WAT: { startsAt: "not an instant" },
        }),
      },
    ]);

    expect(state.lastObservationAt).toBe(BAR_START);
  });

  it("counts an unreadable message and keeps the connection alive", () => {
    // Task 3.3.1 made a malformed message a value rather than a throw; this is
    // the disposition this task owed. **Counted, never dropped** — dropping it
    // silently makes a protocol mismatch after a deploy look like a quiet feed.
    const before = walk([{ kind: "opened", at: 0 }]);
    const after = advanceLiveFeed(before, {
      kind: "unreadable",
      reason: "unknown message type",
      at: 500,
    });

    expect(after.unreadable).toBe(1);
    expect(after.lastUnreadableReason).toBe("unknown message type");
    // A message that arrived is evidence the socket is alive whatever it said.
    expect(after.lastInboundAt).toBe(500);
    expect(after.socket).toBe("open");
  });

  it("reports only the FIRST unreadable message", () => {
    const one = advanceLiveFeed(initialLiveFeed, {
      kind: "unreadable",
      reason: "x",
      at: 1,
    });
    const two = advanceLiveFeed(one, {
      kind: "unreadable",
      reason: "x",
      at: 2,
    });

    expect(firstUnreadable(initialLiveFeed, one)).toBe(true);
    expect(firstUnreadable(one, two)).toBe(false);
    expect(two.unreadable).toBe(2);
  });

  it("keeps the server's last word when a bars message arrives", () => {
    // `bars` carries no feed state (§11.1); it must not blank what we know.
    const state = advanceLiveFeed(healthy(), {
      kind: "message",
      at: 61_000,
      message: {
        type: "bars",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        observations: {},
      },
    });

    expect(state.server).toEqual(feedState());
  });
});

describe("the status a browser reports", () => {
  it("is live at the instant §7.3 says a healthy bar arrives", () => {
    // The defect this task found, from the browser's side: a rule measuring
    // from the instant that OPENS a bar's minute calls a healthy feed stale on
    // every delivery.
    expect(at(healthy(), 60_500, BAR_ARRIVED).status).toBe("live");
  });

  it("is stale once the silence §11.2 specifies has passed", () => {
    const closedAt = BAR_START + OBSERVATION_INTERVAL_MS;

    expect(at(healthy(), 60_500, closedAt + STALE_AFTER_MS).status).toBe(
      "stale",
    );
  });

  it("is not stale out of hours, however old the newest observation", () => {
    // §6.6: 76 minutes of legitimate overnight silence on bar channels.
    const shut = healthy({ marketOpen: false });

    expect(at(shut, 60_500, BAR_START + 76 * 60_000).status).toBe("live");
  });

  it("takes the WORSE of our socket and the server's feed", () => {
    // Two connections, one word. A browser whose own socket is perfect has
    // learned nothing about the market if the backend's feed is dead.
    expect(at(healthy({ status: "stale" }), 60_500, BAR_ARRIVED).status).toBe(
      "stale",
    );
    expect(
      at(healthy({ status: "disconnected" }), 60_500, BAR_ARRIVED).status,
    ).toBe("disconnected");
  });

  it("is disconnected once OUR socket goes silent, whatever the server last said", () => {
    const state = healthy();
    const silent = 60_500 + DISCONNECTED_AFTER_MS;

    expect(at(state, silent - 1, BAR_ARRIVED).backendReachable).toBe(true);
    expect(at(state, silent, BAR_ARRIVED).status).toBe("disconnected");
    expect(at(state, silent, BAR_ARRIVED).backendReachable).toBe(false);
  });

  it("is disconnected the moment the socket closes", () => {
    // §36 forbids collapsing to a global error screen; this is the state that
    // makes the honest alternative renderable.
    const closed = advanceLiveFeed(healthy(), { kind: "closed", at: 60_600 });

    expect(at(closed, 60_600, BAR_ARRIVED).status).toBe("disconnected");
    expect(at(closed, 60_600, BAR_ARRIVED).backendReachable).toBe(false);
  });

  it("is disconnected before the snapshot arrives", () => {
    // Honest rather than optimistic: the absence of evidence, not the presence
    // of health.
    const opened = walk([{ kind: "opened", at: 0 }]);

    expect(at(opened, 0, BAR_ARRIVED).status).toBe("disconnected");
    expect(at(opened, 0, BAR_ARRIVED).feed).toBeNull();
  });

  it("does NOT claim we lost the backend before we have finished asking", () => {
    // **The defect the 3.3.4 sweep found**, and it would have flashed
    // `DISCONNECTED` in the chrome on every page load: reachability was
    // measured from *nothing has ever arrived*, which is true of a connection
    // that is merely young. `BackendIndicator`'s `checking` and
    // `MarketFeedView`'s `checking` both exist to prevent exactly this, and
    // Task 1.12.1 named it — reporting a client's own ignorance as a fact
    // about the server is the opposite of §36.
    const opened = walk([{ kind: "opened", at: 0 }]);

    expect(at(opened, 0, BAR_ARRIVED).backendReachable).toBe(true);
    expect(
      connectionWordFor("disconnected", null, {
        backendReachable: at(opened, 0, BAR_ARRIVED).backendReachable,
      }),
    ).toBeNull();
  });

  it("still fails honestly if the connection simply HANGS", () => {
    // The other half, and the reason `since` exists rather than a boolean: a
    // TCP connect that hangs produces no open, no error and no close, so
    // without an instant to count from the browser would report a reachable
    // backend for ever.
    const never = startedLiveFeed(0);

    expect(
      at(never, DISCONNECTED_AFTER_MS - 1, BAR_ARRIVED).backendReachable,
    ).toBe(true);
    expect(at(never, DISCONNECTED_AFTER_MS, BAR_ARRIVED).backendReachable).toBe(
      false,
    );
  });
});

describe("a deployment with no provider", () => {
  const unconfigured = healthy({ status: "disconnected", feed: null });

  it("does not age a feed that was never asked to connect", () => {
    // Running §11.2's staleness over one produces a transition between two
    // states that both mean *nothing is configured*. The server's word stands.
    const late = BAR_START + OBSERVATION_INTERVAL_MS + STALE_AFTER_MS;

    expect(at(unconfigured, 60_500, late).status).toBe("disconnected");
    expect(at(unconfigured, 60_500, late).feed).toBeNull();
  });

  it("still reports that WE lost the backend, which is a different fact", () => {
    // `STORY.md` open decision 3. The `—` in §11.3's grid belongs to *the
    // server has no provider*; it does not belong to *we cannot reach the
    // server*, and this is the flag that tells them apart.
    expect(at(unconfigured, 60_500, BAR_ARRIVED).backendReachable).toBe(true);

    const closed = advanceLiveFeed(unconfigured, {
      kind: "closed",
      at: 60_600,
    });

    expect(at(closed, 60_600, BAR_ARRIVED).backendReachable).toBe(false);
  });
});

describe("what a keepalive must not cost", () => {
  it("produces an identical view when nothing has changed", () => {
    // Task 3.3.2's gateway re-sends the feed state every 120 s whether or not
    // anything changed, because Azure cuts a socket idle for 240 s. Thirty
    // messages an hour that each re-render the application is the defect that
    // produced 40 renders in 20 s, at a lower rate.
    const before = healthy();
    const after = advanceLiveFeed(before, {
      kind: "message",
      at: 180_000,
      message: { type: "feed", version: 1, feed: feedState() },
    });

    const a = at(before, 60_500, BAR_ARRIVED);
    const b = at(after, 180_000, BAR_ARRIVED);

    expect(sameLiveFeedView(a, b)).toBe(true);
  });

  it("does NOT call two views the same when the feed actually changed", () => {
    const a = at(healthy(), 60_500, BAR_ARRIVED);
    const b = at(healthy({ status: "stale" }), 60_500, BAR_ARRIVED);

    expect(sameLiveFeedView(a, b)).toBe(false);
  });
});

describe("the observation store (§10.3, one Map, newest only)", () => {
  const bars = (
    symbol: string,
    startsAt: string,
    close: number,
  ): MarketStreamMessage => ({
    type: "bars",
    version: MARKET_STREAM_PROTOCOL_VERSION,
    observations: {
      [symbol]: { startsAt, open: 1, high: 1, low: 1, close, volume: 1 },
    },
  });

  it("holds the latest observation per security, as a domain Bar", () => {
    // A `Date` rather than the wire's string, because §10.3's rule is that
    // every entry carries its own instant and **no reader may render a price
    // without reading it**. A string is text a renderer can print unread.
    const state = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: snapshot(feedState(), {
          NVDA: { startsAt: "2026-09-16T14:01:00Z" },
          AAPL: { startsAt: "2026-09-16T14:00:00Z" },
        }),
      },
    ]);

    expect([...state.observations.keys()].sort()).toEqual(["AAPL", "NVDA"]);
    expect(state.observations.get("NVDA")?.startsAt).toEqual(
      new Date(BAR_START),
    );
  });

  it("replaces a symbol's entry rather than accumulating a history", () => {
    // Not a history and not a buffer — a history is Story 3.8's and a chart
    // series is Story 3.9's.
    const state = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: bars("NVDA", "2026-09-16T14:01:00Z", 218.29),
      },
      {
        kind: "message",
        at: 200,
        message: bars("NVDA", "2026-09-16T14:02:00Z", 219.5),
      },
    ]);

    expect(state.observations.size).toBe(1);
    expect(state.observations.get("NVDA")?.close).toBe(219.5);
  });

  it("lets a revision replace the minute it corrects", () => {
    // §7.8: `updatedBars` re-sends a bar for a minute already seen, about
    // thirty seconds later. Holding the newer one is this task's job; telling
    // a correction apart from a movement is Task 3.4.5's.
    const state = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: bars("NVDA", "2026-09-16T14:01:00Z", 218.29),
      },
      {
        kind: "message",
        at: 30_000,
        message: bars("NVDA", "2026-09-16T14:01:00Z", 218.31),
      },
    ]);

    expect(state.observations.size).toBe(1);
    expect(state.observations.get("NVDA")?.close).toBe(218.31);
  });

  it("does not store an observation whose instant cannot be read", () => {
    // `new Date(NaN)` is an `Invalid Date` that **formats without
    // complaining** — it would reach a price row as those two words. And
    // §10.3's rule is that every entry carries its instant, so an entry that
    // cannot is not an entry: absence is §11.1's answer.
    const state = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: snapshot(feedState(), {
          NVDA: { startsAt: "2026-09-16T14:01:00Z" },
          WAT: { startsAt: "not an instant" },
        }),
      },
    ]);

    expect([...state.observations.keys()]).toEqual(["NVDA"]);
    expect(state.lastObservationAt).toBe(BAR_START);
  });

  it("is a cache of the socket: a symbol nobody has sent is simply absent", () => {
    // §10.3: after a reconnect it fills unevenly — a liquid security reappears
    // within a minute, `ERIE` may not for hours (§7.6). A reader that renders
    // absence as an error renders it constantly.
    const state = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: bars("NVDA", "2026-09-16T14:01:00Z", 218.29),
      },
    ]);

    expect(state.observations.has("ERIE")).toBe(false);
    expect(state.observations.get("ERIE")).toBeUndefined();
  });

  it("keeps the prices when the feed degrades — §36's whole point", () => {
    // *Displaying data through 10:42:17.* Blanking the Map on `disconnected`
    // would be the product removing true information because a socket died.
    const connected = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: bars("NVDA", "2026-09-16T14:01:00Z", 218.29),
      },
    ]);
    const closed = advanceLiveFeed(connected, { kind: "closed", at: 200 });

    const view = liveFeedView(closed, { now: 200, wallNow: BAR_ARRIVED });

    expect(view.status).toBe("disconnected");
    expect(view.observations.get("NVDA")?.close).toBe(218.29);
  });

  it("hands out the connection's own Map rather than a copy", () => {
    // A copy per derivation would allocate up to 518 entries every keepalive to
    // produce an object indistinguishable from the one it copied — and would
    // destroy the render gate below, which compares by reference.
    const state = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: bars("NVDA", "2026-09-16T14:01:00Z", 218.29),
      },
    ]);

    expect(
      liveFeedView(state, { now: 100, wallNow: BAR_ARRIVED }).observations,
    ).toBe(state.observations);
  });
});

describe("the gate that would have stopped the prices moving", () => {
  const bars = (startsAt: string, close: number): MarketStreamMessage => ({
    type: "bars",
    version: MARKET_STREAM_PROTOCOL_VERSION,
    observations: {
      NVDA: { startsAt, open: 1, high: 1, low: 1, close, volume: 1 },
    },
  });

  const at = (state: LiveFeedConnection, now: number) =>
    liveFeedView(state, { now, wallNow: BAR_ARRIVED });

  it("reports a NEW PRICE as a change — the negative this task exists for", () => {
    // **Without the observation check in `sameLiveFeedView` this passes the
    // Map and fails the screen.** The reducer would be right, the Map would
    // update, and nothing would render — a first moving price that does not
    // move, with every test green.
    //
    // Note the two views below have the same `status`, `feed`,
    // `backendReachable` and `unreadable`, so **every other field the gate
    // compares is identical**: this asserts the field that was added, and
    // nothing else could make it pass.
    const before = walk([
      { kind: "opened", at: 0 },
      {
        kind: "message",
        at: 100,
        message: bars("2026-09-16T14:01:00Z", 218.29),
      },
    ]);
    const after = advanceLiveFeed(before, {
      kind: "message",
      at: 200,
      message: bars("2026-09-16T14:01:00Z", 219.5),
    });

    const a = at(before, 100);
    const b = at(after, 200);

    expect(a.status).toBe(b.status);
    expect(a.observedAt).toBe(b.observedAt);
    expect(sameLiveFeedView(a, b)).toBe(false);
  });

  it("still reports a keepalive carrying nothing new as NO change", () => {
    // The property Task 3.3.2's 120 s keepalive bought, unbroken by the new
    // field: a message with no observations returns the same Map reference.
    // The snapshot first, so the server's state is already known — otherwise
    // the `feed` message below changes the status from *we have been told
    // nothing* to `live`, and the gate would be reporting that rather than the
    // observations. The fixture, not the rule.
    const before = walk([
      { kind: "opened", at: 0 },
      { kind: "message", at: 50, message: snapshot(feedState()) },
      {
        kind: "message",
        at: 100,
        message: bars("2026-09-16T14:01:00Z", 218.29),
      },
    ]);
    const after = advanceLiveFeed(before, {
      kind: "message",
      at: 120_000,
      message: { type: "feed", version: 1, feed: feedState() },
    });

    expect(after.observations).toBe(before.observations);
    expect(sameLiveFeedView(at(before, 100), at(after, 120_000))).toBe(true);
  });
});

describe("which symbols are sitting on a snapshot baseline (Task 3.5.4)", () => {
  // **A snapshot is not an arrival**, and this is the store-level half of that
  // rule. It had no direct test until Task 3.5.5's sweep: the behaviour was
  // exercised only through `SecurityIdentity` and a browser spec, so a change
  // here would have surfaced two layers away from its cause.

  const bars = (
    observations: Readonly<Record<string, { startsAt: string }>>,
  ): MarketStreamMessage => ({
    type: "bars",
    version: MARKET_STREAM_PROTOCOL_VERSION,
    observations: Object.fromEntries(
      Object.entries(observations).map(([symbol, { startsAt }]) => [
        symbol,
        { startsAt, open: 1, high: 1, low: 1, close: 1, volume: 1 },
      ]),
    ),
  });

  const message = (m: MarketStreamMessage, at: number): LiveFeedEvent => ({
    kind: "message",
    message: m,
    at,
  });

  it("marks every symbol a snapshot carries as a baseline", () => {
    const state = walk([
      message(
        snapshot(feedState(), {
          NVDA: { startsAt: "2026-09-16T14:01:00Z" },
          AAPL: { startsAt: "2026-09-16T14:01:00Z" },
        }),
        BAR_ARRIVED,
      ),
    ]);

    expect([...state.fromSnapshot].sort()).toEqual(["AAPL", "NVDA"]);
  });

  it("clears only the symbols a `bars` message carries", () => {
    // A bar for NVDA says nothing about whether AAPL's held price was a
    // baseline or an arrival, so AAPL must keep its flag.
    const state = walk([
      message(
        snapshot(feedState(), {
          NVDA: { startsAt: "2026-09-16T14:01:00Z" },
          AAPL: { startsAt: "2026-09-16T14:01:00Z" },
        }),
        BAR_ARRIVED,
      ),
      message(
        bars({ NVDA: { startsAt: "2026-09-16T14:02:00Z" } }),
        BAR_ARRIVED,
      ),
    ]);

    expect([...state.fromSnapshot]).toEqual(["AAPL"]);
  });

  it("a RECONNECT snapshot carrying fewer symbols drops the rest", () => {
    // **The case Task 3.5.4 handed forward as believed-correct and untested**,
    // because nothing before Task 3.5.5 could reconnect. The server may have
    // restarted and observed less, so the second snapshot is smaller.
    //
    // The held observation for a dropped symbol SURVIVES — §36 keeps the last
    // known prices on screen — but it leaves `fromSnapshot`, so the next bar
    // for it is a genuine arrival and marks. That is the intended behaviour
    // and this is the assertion that says so.
    const state = walk([
      message(
        snapshot(feedState(), {
          NVDA: { startsAt: "2026-09-16T14:01:00Z" },
          AAPL: { startsAt: "2026-09-16T14:01:00Z" },
        }),
        BAR_ARRIVED,
      ),
      { kind: "closed", at: BAR_ARRIVED + 1_000 },
      message(
        snapshot(feedState(), { NVDA: { startsAt: "2026-09-16T14:03:00Z" } }),
        BAR_ARRIVED + 5_000,
      ),
    ]);

    expect([...state.fromSnapshot]).toEqual(["NVDA"]);
    // AAPL's price is still on screen; it is simply no longer a baseline.
    expect(state.observations.has("AAPL")).toBe(true);
  });

  it("is the same reference when nothing changed, so the render gate holds", () => {
    // `sameLiveFeedView` compares this by reference. A new `Set` on every
    // message would make every keepalive a re-render — the cost the whole
    // no-render guarantee exists to avoid.
    const first = walk([
      message(
        snapshot(feedState(), { NVDA: { startsAt: "2026-09-16T14:01:00Z" } }),
        BAR_ARRIVED,
      ),
    ]);

    const second = advanceLiveFeed(
      first,
      message(
        bars({ AAPL: { startsAt: "2026-09-16T14:02:00Z" } }),
        BAR_ARRIVED,
      ),
    );

    expect(second.fromSnapshot).toBe(first.fromSnapshot);
  });
});
