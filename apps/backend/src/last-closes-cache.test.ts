import { toMarketDate, toTicker } from "@marketpulse/shared";
import { describe, expect, it, vi } from "vitest";

import {
  CLOSES_RETRY_INTERVAL_MS,
  createLastClosesCache,
} from "./last-closes-cache.js";

import type { Ticker } from "@marketpulse/shared";
import type { LastClose } from "./market-bars.js";

const SPY = toTicker("SPY");
const MONDAY = toMarketDate("2026-09-14");
const TUESDAY = toMarketDate("2026-09-15");

const row = (close: number, observedAt: string): LastClose => ({
  symbol: SPY,
  // 20:00Z is 16:00 in New York — the session's own label for a `1d` bar on
  // both sides of the DST boundary.
  observedAt: new Date(`${observedAt}T20:00:00.000Z`),
  close,
  previousClose: close - 1,
});

const rows = (
  ...records: readonly LastClose[]
): ReadonlyMap<Ticker, LastClose> =>
  new Map(records.map((record) => [record.symbol, record]));

/** A settled promise queue drained — the cache's refresh is fire-and-forget. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("the closes cache", () => {
  it("converts `observedAt` to the session, through the one module allowed to", () => {
    const cache = createLastClosesCache({
      bars: {
        readLastCloses: () => Promise.resolve(rows(row(600, "2026-09-11"))),
      },
    });

    return cache.load(MONDAY).then(() => {
      expect(cache.closesAsOf(MONDAY).get(SPY)).toEqual({
        symbol: SPY,
        session: "2026-09-11",
        close: 600,
        previousClose: 599,
      });
    });
  });

  it("is SYNCHRONOUS, which is what keeps an `await` off the socket callback", () => {
    // Asserted as a property rather than described: `closesAsOf` returns a
    // Map, not a promise. An `async` lookup would put an `await` back on the
    // one path where an unhandled rejection kills the process.
    const cache = createLastClosesCache({
      bars: { readLastCloses: () => Promise.resolve(rows()) },
    });
    const answer: unknown = cache.closesAsOf(MONDAY);
    expect(answer).toBeInstanceOf(Map);
    expect(answer).not.toHaveProperty("then");
  });

  it("refreshes on the first ask whose market date differs, and not before", async () => {
    const readLastCloses = vi.fn(() =>
      Promise.resolve(rows(row(600, "2026-09-11"))),
    );
    const cache = createLastClosesCache({ bars: { readLastCloses } });

    await cache.load(MONDAY);
    expect(readLastCloses).toHaveBeenCalledTimes(1);

    // Sixteen bursts a minute on the same market date must not be sixteen
    // 518-row reads — §9.5's measured cadence is the reason the condition is
    // a date rather than a timer.
    for (let i = 0; i < 16; i += 1) cache.closesAsOf(MONDAY);
    await settle();
    expect(readLastCloses).toHaveBeenCalledTimes(1);

    cache.closesAsOf(TUESDAY);
    await settle();
    expect(readLastCloses).toHaveBeenCalledTimes(2);

    // And once refreshed, the new date is no longer a trigger.
    cache.closesAsOf(TUESDAY);
    await settle();
    expect(readLastCloses).toHaveBeenCalledTimes(2);
  });

  it("NEVER empties on a failed refresh — a stale-but-true denominator beats no figure", async () => {
    let attempt = 0;
    const cache = createLastClosesCache({
      bars: {
        readLastCloses: () => {
          attempt += 1;
          return attempt === 1
            ? Promise.resolve(rows(row(600, "2026-09-11")))
            : Promise.reject(new Error("pool exhausted"));
        },
      },
    });

    await cache.load(MONDAY);
    expect(cache.size()).toBe(1);

    cache.closesAsOf(TUESDAY);
    await settle();

    // The read failed, and the four proxies still have a denominator.
    expect(attempt).toBe(2);
    expect(cache.size()).toBe(1);
    expect(cache.closesAsOf(TUESDAY).get(SPY)?.close).toBe(600);
  });

  it("reports a failed refresh rather than swallowing it", async () => {
    const warn = vi.fn();
    const cache = createLastClosesCache({
      bars: { readLastCloses: () => Promise.reject(new Error("no")) },
      warn,
    });

    cache.closesAsOf(MONDAY);
    await settle();

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[1]).toContain("keeping the closes we hold");
  });

  it("does not ask again inside the retry floor, and does after it", async () => {
    // **A floor rather than a poll.** Without it a refusing store would be
    // asked up to ~16 times a minute for a 518-row query, which is a database
    // under load being asked harder.
    let now = 0;
    const readLastCloses = vi.fn(() => Promise.reject(new Error("no")));
    const cache = createLastClosesCache({
      bars: { readLastCloses },
      now: () => now,
    });

    cache.closesAsOf(MONDAY);
    await settle();
    expect(readLastCloses).toHaveBeenCalledTimes(1);

    now += CLOSES_RETRY_INTERVAL_MS - 1;
    cache.closesAsOf(MONDAY);
    await settle();
    expect(readLastCloses).toHaveBeenCalledTimes(1);

    now += 1;
    cache.closesAsOf(MONDAY);
    await settle();
    expect(readLastCloses).toHaveBeenCalledTimes(2);
  });

  it("is empty before its first load, which is the true answer", () => {
    const cache = createLastClosesCache({
      bars: { readLastCloses: () => Promise.resolve(rows()) },
    });
    expect(cache.closesAsOf(MONDAY).size).toBe(0);
  });
});
