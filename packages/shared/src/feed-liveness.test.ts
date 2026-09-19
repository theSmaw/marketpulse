import { describe, expect, it } from "vitest";

import {
  DISCONNECTED_AFTER_MS,
  OBSERVATION_INTERVAL_MS,
  STALE_AFTER_MS,
  type FeedLiveness,
  feedStatusFrom,
  worseFeedStatus,
} from "./feed-liveness.js";
import { FEED_STATUSES } from "./feed-status.js";

const OPEN = { marketOpen: true };

/** A connection that has heard something and seen an observation. */
const heard = (over: Partial<FeedLiveness> = {}): FeedLiveness => ({
  closed: false,
  lastInboundAt: 1_000,
  lastObservationAt: Date.parse("2026-09-16T14:01:00Z"),
  ...over,
});

describe("the observation interval — the defect this constant exists for", () => {
  // §7.3 records it with a control and a verbatim frame:
  //   "a bar stamped `14:01:00Z` arrives at `14:02:00.5Z`"
  const barStart = Date.parse("2026-09-16T14:01:00Z");
  const arrivedAt = Date.parse("2026-09-16T14:02:00.5Z");

  it("is the gap §7.3 measured, so the figure here is the vendor's", () => {
    expect(arrivedAt - barStart).toBe(60_500);
    expect(arrivedAt - barStart).toBeGreaterThan(OBSERVATION_INTERVAL_MS);
  });

  it("does not call a healthy feed stale at the instant a bar arrives", () => {
    // **Before Task 3.3.4 this was `stale`**, because the rule subtracted 60 s
    // from the instant that OPENS the minute a bar describes. Every healthy
    // delivery tripped it, so `live` was unreachable during a session — 3.2.6's
    // defect in a mirror, and invisible for the same reason: no test supplied a
    // realistic pair of bar instant and arrival.
    expect(
      feedStatusFrom(heard({ lastObservationAt: barStart, lastInboundAt: 0 }), {
        now: 0,
        wallNow: arrivedAt,
        ...OPEN,
      }),
    ).toBe("live");
  });

  it("still reports stale once the silence §11.2 specifies has actually passed", () => {
    const closedAt = barStart + OBSERVATION_INTERVAL_MS;

    expect(
      feedStatusFrom(heard({ lastObservationAt: barStart, lastInboundAt: 0 }), {
        now: 0,
        wallNow: closedAt + STALE_AFTER_MS - 1,
        ...OPEN,
      }),
    ).toBe("live");

    expect(
      feedStatusFrom(heard({ lastObservationAt: barStart, lastInboundAt: 0 }), {
        now: 0,
        wallNow: closedAt + STALE_AFTER_MS,
        ...OPEN,
      }),
    ).toBe("stale");
  });
});

describe("the two clocks", () => {
  it("measures liveness on the monotonic one and staleness on the wall one", () => {
    // The pair that makes the 2026-09-18 defect unrepresentable: a monotonic
    // reading near zero and an epoch instant near 1.76e12, both current.
    const state = heard({ lastInboundAt: 12 });

    expect(
      feedStatusFrom(state, {
        now: 12 + DISCONNECTED_AFTER_MS - 1,
        wallNow: Date.parse("2026-09-16T14:02:00.5Z"),
        ...OPEN,
      }),
    ).toBe("live");

    expect(
      feedStatusFrom(state, {
        now: 12 + DISCONNECTED_AFTER_MS,
        wallNow: Date.parse("2026-09-16T14:02:00.5Z"),
        ...OPEN,
      }),
    ).toBe("disconnected");
  });

  it("reports disconnected before anything has ever arrived", () => {
    expect(
      feedStatusFrom(
        {
          closed: false,
          lastInboundAt: undefined,
          lastObservationAt: undefined,
        },
        { now: 0, wallNow: 0, ...OPEN },
      ),
    ).toBe("disconnected");
  });

  it("reports disconnected on a closed socket however recent the traffic", () => {
    expect(
      feedStatusFrom(heard({ closed: true }), {
        now: 1_000,
        wallNow: Date.parse("2026-09-16T14:02:00.5Z"),
        ...OPEN,
      }),
    ).toBe("disconnected");
  });

  it("does not call a silent feed stale out of hours", () => {
    // §6.6 measured 76 minutes of legitimate overnight silence on bar channels.
    const seventySixMinutes = 76 * 60_000;

    expect(
      feedStatusFrom(heard({ lastInboundAt: seventySixMinutes }), {
        now: seventySixMinutes + 1_000,
        wallNow: Date.parse("2026-09-16T14:01:00Z") + seventySixMinutes,
        marketOpen: false,
      }),
    ).toBe("live");
  });
});

describe("the worse of two connections", () => {
  it("is what a browser reports, because it is downstream of both", () => {
    expect(worseFeedStatus("live", "disconnected")).toBe("disconnected");
    expect(worseFeedStatus("disconnected", "live")).toBe("disconnected");
    expect(worseFeedStatus("live", "stale")).toBe("stale");
    expect(worseFeedStatus("stale", "disconnected")).toBe("disconnected");
    expect(worseFeedStatus("live", "live")).toBe("live");
  });

  it("is commutative and idempotent over every pair of words", () => {
    for (const a of FEED_STATUSES) {
      expect(worseFeedStatus(a, a)).toBe(a);
      for (const b of FEED_STATUSES) {
        expect(worseFeedStatus(a, b)).toBe(worseFeedStatus(b, a));
      }
    }
  });
});
