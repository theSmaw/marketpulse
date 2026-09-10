// The immutability rule, either side of a session close, and the cache that
// spends it (Task 2.9.8).
//
// Everything here is a pure function or a `Map`, so there is no server, no
// database and no clock — `now` is an argument at every level, which is the
// property Epic 13 needs and the reason a rule about *closed sessions* is
// testable at all without waiting for one to close.

import {
  toSeriesProvenance,
  toBarSeries,
  toTicker,
  toTimeRange,
} from "@marketpulse/shared";
import type { BarSeries, TimeRange } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  CLOSED_ANSWER_SECONDS,
  CLOSED_ANSWER_TTL_MS,
  closedThrough,
  createSeriesCache,
  isClosedWindow,
  LIVE_ANSWER_TTL_MS,
  MAX_CACHED_ANSWERS,
  MAX_CACHED_BARS,
  seriesCacheControl,
} from "./series-cache.js";
import { MAX_SERIES_BARS } from "./series-request.js";
import type { ServedSeries } from "./serve-series.js";

const NVDA = toTicker("NVDA");

/** Tuesday 2026-09-08 and Wednesday 2026-09-09, both ordinary sessions. */
const TUESDAY_CLOSE = "2026-09-08T20:00:00.000Z";
const WEDNESDAY_OPEN = "2026-09-09T13:30:00.000Z";
const WEDNESDAY_CLOSE = "2026-09-09T20:00:00.000Z";

describe("closedThrough", () => {
  it.each([
    {
      state: "mid-session",
      now: "2026-09-09T18:00:00.000Z",
      expected: TUESDAY_CLOSE,
      why: "today is still accumulating, so the last thing that is over is yesterday",
    },
    {
      state: "after the close",
      now: "2026-09-09T20:00:00.000Z",
      expected: WEDNESDAY_CLOSE,
      why: "the close is exclusive: at exactly 16:00 the session is over",
    },
    {
      state: "before the open",
      now: "2026-09-09T12:00:00.000Z",
      expected: TUESDAY_CLOSE,
      why: "today has not started, so it is not over either",
    },
    {
      state: "a weekend",
      now: "2026-09-12T18:00:00.000Z",
      expected: "2026-09-11T20:00:00.000Z",
      why: "Saturday's answer is Friday's close",
    },
    {
      state: "a holiday",
      now: "2026-11-26T18:00:00.000Z",
      expected: "2026-11-25T21:00:00.000Z",
      why: "Thanksgiving's answer is Wednesday's close, at 16:00 EST",
    },
    {
      state: "after a half day's early close",
      now: "2026-11-27T18:30:00.000Z",
      expected: "2026-11-27T18:00:00.000Z",
      why: "the calendar closes this one at 13:00, and a clock comparing against 16:00 would call it open",
    },
  ])("$state → $why", ({ now, expected }) => {
    expect(closedThrough(new Date(now)).toISOString()).toBe(expected);
  });

  it("refuses an instant outside the calendar rather than guessing", () => {
    // The same refusal every other reader of the calendar gets. A cache that
    // guessed here would be guessing about immutability, which is the one thing
    // it must not do.
    expect(() => closedThrough(new Date("2029-06-01T18:00:00.000Z"))).toThrow();
  });
});

/** A half-open window, from two instants. */
function window(start: string, end: string): TimeRange {
  return toTimeRange(new Date(start), new Date(end));
}

describe("isClosedWindow", () => {
  const midSession = new Date("2026-09-09T18:00:00.000Z");

  it("calls a window ending exactly at the last close closed", () => {
    // Half-open, `[start, end)`, so a window ending at the close touches
    // nothing after it. The same boundary `marketSessionStateAt` draws, and
    // drawing it differently here is how the two disagree at the one instant it
    // matters at.
    expect(
      isClosedWindow(
        window("2026-09-08T13:30:00.000Z", TUESDAY_CLOSE),
        midSession,
      ),
    ).toBe(true);
  });

  it("calls a window reaching one millisecond past it open", () => {
    expect(
      isClosedWindow(
        window("2026-09-08T13:30:00.000Z", "2026-09-08T20:00:00.001Z"),
        midSession,
      ),
    ).toBe(false);
  });

  it("calls a window ending in the live session open", () => {
    // The negative case, which is the one that goes wrong silently: the store's
    // own catch-up will change this answer, so nothing about it may be
    // presented as settled.
    expect(
      isClosedWindow(window(WEDNESDAY_OPEN, WEDNESDAY_CLOSE), midSession),
    ).toBe(false);
  });

  it("calls the same window closed once that session has closed", () => {
    expect(
      isClosedWindow(
        window(WEDNESDAY_OPEN, WEDNESDAY_CLOSE),
        new Date("2026-09-09T20:30:00.000Z"),
      ),
    ).toBe(true);
  });
});

describe("seriesCacheControl", () => {
  const afterClose = new Date("2026-09-09T20:30:00.000Z");
  const closed = window(WEDNESDAY_OPEN, WEDNESDAY_CLOSE);

  it("lets an absolute window inside closed sessions be reused", () => {
    expect(seriesCacheControl("absolute", closed, afterClose)).toBe(
      `private, max-age=${String(CLOSED_ANSWER_SECONDS)}`,
    );
  });

  it("makes a named window revalidate even when it resolved to closed sessions", () => {
    // The trap this whole function exists to close. `?sessions=1` at 16:30 has
    // resolved to a window that is entirely over — and tomorrow morning the
    // same URL means a different window. Every HTTP cache keys on the URL, so
    // the only form whose address and meaning are the same thing is the
    // absolute one.
    expect(seriesCacheControl("named", closed, afterClose)).toBe(
      "private, no-cache",
    );
    expect(seriesCacheControl("named", closed, afterClose)).not.toContain(
      "max-age",
    );
  });

  it("makes a live window revalidate whichever form asked for it", () => {
    const live = new Date("2026-09-09T18:00:00.000Z");

    for (const form of ["absolute", "named"] as const) {
      expect(seriesCacheControl(form, closed, live)).toBe("private, no-cache");
    }
  });
});

// ---------------------------------------------------------------------------
// The cache
// ---------------------------------------------------------------------------

/**
 * A served answer holding `bars` bars, which is all this cache reads of it.
 *
 * Built through the real `toBarSeries` rather than by hand, so this suite
 * cannot cache a series the domain would refuse to construct. The requested
 * window is derived from the bar count for exactly that reason: the constructor
 * refuses a covered range reaching outside the requested one, which is how a
 * first draft of this file asking for 30,000 minute bars over one session went
 * red rather than quietly caching a series nothing could serve.
 */
function answer(bars: number): ServedSeries {
  const start = new Date(WEDNESDAY_OPEN);
  const end = new Date(start.getTime() + Math.max(bars, 390) * 60_000);

  const series: BarSeries = toBarSeries({
    symbol: NVDA,
    timeframe: "1m",
    bars: Array.from({ length: bars }, (_unused, index) => ({
      startsAt: new Date(start.getTime() + index * 60_000),
      open: 200,
      high: 200,
      low: 200,
      close: 200,
      volume: 100,
    })),
    provenance: toSeriesProvenance("raw", {
      provider: "alpaca",
      feed: "sip",
      retrievedAt: WEDNESDAY_CLOSE,
      barCount: bars,
    }),
    coverage: {
      requested: toTimeRange(start, end),
      covered:
        bars === 0
          ? null
          : toTimeRange(start, new Date(start.getTime() + bars * 60_000)),
    },
  });

  return {
    series,
    held: undefined,
    tail: { attempted: false, reason: "covered" },
  };
}

/** The key for the Nth distinct window, all of them inside closed sessions. */
function key(n: number) {
  return {
    symbol: NVDA,
    timeframe: "1m" as const,
    range: window(
      new Date(new Date(WEDNESDAY_OPEN).getTime() + n * 60_000).toISOString(),
      WEDNESDAY_CLOSE,
    ),
  };
}

const AFTER_CLOSE = new Date("2026-09-09T20:30:00.000Z");
const MID_SESSION = new Date("2026-09-09T18:00:00.000Z");

describe("the series cache", () => {
  it("hands back the same answer for the same resolved window", () => {
    const cache = createSeriesCache();
    const served = answer(3);

    cache.write(key(0), served, AFTER_CLOSE);

    expect(cache.read(key(0), AFTER_CLOSE)).toBe(served);
  });

  it("keys on the resolved range and not on the request", () => {
    // `?sessions=1` after the close and the equivalent `start`/`end` pair are
    // the same question, so they share one entry. The stable-URL trap is a
    // property of a *client's* cache, which keys on an address; ours keys on
    // what the address resolved to.
    const cache = createSeriesCache();
    const served = answer(2);

    cache.write(key(0), served, AFTER_CLOSE);

    expect(
      cache.read(
        { symbol: NVDA, timeframe: "1m", range: key(0).range },
        AFTER_CLOSE,
      ),
    ).toBe(served);
  });

  it("does not confuse two timeframes over one window", () => {
    const cache = createSeriesCache();
    cache.write(key(0), answer(2), AFTER_CLOSE);

    expect(
      cache.read({ ...key(0), timeframe: "1d" }, AFTER_CLOSE),
    ).toBeUndefined();
  });

  it("expires a live window after a bar's worth of time", () => {
    // The bound `MARKET-DATA-API.md` §5 hands this task: a window ending now is
    // a metered vendor request on a miss, so what this number bounds is how
    // often we ask the vendor — once a minute per window, whatever the traffic.
    const cache = createSeriesCache();
    cache.write(key(0), answer(2), MID_SESSION);

    const justInside = new Date(MID_SESSION.getTime() + LIVE_ANSWER_TTL_MS - 1);
    expect(cache.read(key(0), justInside)).toBeDefined();

    const atTheEdge = new Date(MID_SESSION.getTime() + LIVE_ANSWER_TTL_MS);
    expect(cache.read(key(0), atTheEdge)).toBeUndefined();
  });

  it("expires a closed window too, and that is the backfill answer", () => {
    // What happens when the store is backfilled underneath a cached answer: the
    // nightly catch-up fills gaps in sessions that are already closed, so an
    // honest-and-partial answer can go stale without anything in the window
    // changing. The calendar cannot see that — it is a fact about our store —
    // so every entry expires, immutable or not.
    const cache = createSeriesCache();
    cache.write(key(0), answer(2), AFTER_CLOSE);

    expect(
      cache.read(
        key(0),
        new Date(AFTER_CLOSE.getTime() + CLOSED_ANSWER_TTL_MS - 1),
      ),
    ).toBeDefined();
    expect(
      cache.read(
        key(0),
        new Date(AFTER_CLOSE.getTime() + CLOSED_ANSWER_TTL_MS),
      ),
    ).toBeUndefined();
  });

  it("gives a closed window the longer of the two lifetimes", () => {
    // The two are told apart by the calendar and by nothing else, so this is
    // the assertion that the write path reads the same predicate the header
    // does.
    const cache = createSeriesCache();
    cache.write(key(0), answer(2), AFTER_CLOSE);

    const pastALiveLifetime = new Date(
      AFTER_CLOSE.getTime() + LIVE_ANSWER_TTL_MS,
    );
    expect(cache.read(key(0), pastALiveLifetime)).toBeDefined();
  });

  it("drops the least recently used answer when it runs out of bars", () => {
    const cache = createSeriesCache();
    const big = Math.floor(MAX_CACHED_BARS / 2);

    cache.write(key(0), answer(big), AFTER_CLOSE);
    cache.write(key(1), answer(big), AFTER_CLOSE);
    // Reading the first moves it to the end, so the second is now the oldest.
    expect(cache.read(key(0), AFTER_CLOSE)).toBeDefined();

    cache.write(key(2), answer(big), AFTER_CLOSE);

    expect(cache.read(key(1), AFTER_CLOSE)).toBeUndefined();
    expect(cache.read(key(0), AFTER_CLOSE)).toBeDefined();
    expect(cache.read(key(2), AFTER_CLOSE)).toBeDefined();
  });

  it("bounds the count as well as the weight, because an empty answer weighs nothing", () => {
    // A symbol we hold nothing for returns an empty series, which is an
    // ordinary answer costing zero bars — so the bar budget alone would let a
    // client walking the universe mint 518 free entries.
    const cache = createSeriesCache();

    for (let n = 0; n <= MAX_CACHED_ANSWERS; n += 1) {
      cache.write(key(n), answer(0), AFTER_CLOSE);
    }

    expect(cache.size).toBe(MAX_CACHED_ANSWERS);
    expect(cache.read(key(0), AFTER_CLOSE)).toBeUndefined();
  });

  it("holds several full-sized answers at once", () => {
    // The budget is stated in bars precisely so this is checkable: a cache that
    // could not hold two responses at the cap would evict on every other chart
    // interaction, which is the interaction it exists for.
    expect(MAX_CACHED_BARS).toBeGreaterThanOrEqual(MAX_SERIES_BARS * 2);
  });
});
