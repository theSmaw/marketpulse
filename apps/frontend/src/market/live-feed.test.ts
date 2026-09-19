import {
  DISCONNECTED_AFTER_MS,
  MARKET_STREAM_PROTOCOL_VERSION,
  OBSERVATION_INTERVAL_MS,
  STALE_AFTER_MS,
  type MarketStreamMessage,
  type WireFeedState,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  type LiveFeedConnection,
  type LiveFeedEvent,
  advanceLiveFeed,
  firstUnreadable,
  initialLiveFeed,
  liveFeedView,
  sameLiveFeedView,
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
