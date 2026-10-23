// The fourth baseline cache's three rules (Task 5.6.4).
//
// `return-baseline-cache.test.ts`' shape, for its reason: the **memoisation
// key** — the repair this family of modules exists for — needs two real
// generations in a real table and is driven in
// `excess-move-baselines.database.test.ts`. What is here is the pair of
// properties that need no store at all: **a failed refresh never empties the
// held map**, and **nothing on the read path awaits or throws** — the second
// being AC 7 held by there being nothing to await, because `symbolReturn` runs
// inside the socket's own callback where an unhandled rejection is a crashed
// process.
//
// No socket, no database, no clock. The store is a function and the clock is a
// seam.

import { describe, expect, it, vi } from "vitest";

import { marketDateAt, toMarketDate, toTicker } from "@marketpulse/shared";

import { createExcessBaselineCache } from "./excess-move-baseline-cache.js";
import type { StoredExcessBaseline } from "./excess-move-baseline-store.js";

/** A generation for 2026-11-27's close — one security, one answer. */
const OBSERVED_AT = new Date("2026-11-27T18:00:00.000Z");

const GENERATION: readonly StoredExcessBaseline[] = [
  {
    symbol: toTicker("ZZZZ"),
    observedAt: OBSERVED_AT,
    referenceKind: "sector_etf",
    referenceSymbol: "XLK",
    lookbackSessions: 60,
    sampleCount: 3_100,
    breakpoints: Array.from({ length: 101 }, (_, rank) => rank / 100),
    refusal: null,
  },
];

const HELD_SESSION = marketDateAt(OBSERVED_AT);
const LATER_SESSION = toMarketDate("2026-11-30");

describe("createExcessBaselineCache", () => {
  it("is empty before the first load, and that is the true answer", () => {
    // A security with no generation has no excess percentile, and
    // `0 of 2,500 excess moves` is a true sentence about a cold replica rather
    // than a degraded one.
    const cache = createExcessBaselineCache({
      store: { readNewestGeneration: () => Promise.resolve([]) },
      now: () => 0,
    });

    expect(cache.size()).toBe(0);
    expect(cache.heldThrough()).toBeUndefined();
  });

  it("keeps the generation it holds when a refresh fails", () => {
    let answer: () => Promise<readonly StoredExcessBaseline[]> = () =>
      Promise.resolve(GENERATION);
    let clock = 0;
    const warn = vi.fn();

    const cache = createExcessBaselineCache({
      store: { readNewestGeneration: () => answer() },
      now: () => clock,
      warn,
    });

    return (async () => {
      await cache.load(HELD_SESSION);
      expect(cache.size()).toBe(1);
      expect(cache.heldThrough()).toBe(HELD_SESSION);

      answer = () => Promise.reject(new Error("the store is unreachable"));
      clock += 60 * 60_000;

      // **Synchronous, and it does not throw.**
      expect(cache.baselineAsOf(LATER_SESSION).size).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(cache.size()).toBe(1);
      expect(cache.heldThrough()).toBe(HELD_SESSION);
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({ securities: 1 }),
        expect.stringContaining("keeping the generation we hold"),
      );
    })();
  });

  it("memoises on the window end the ROWS carry, not the session asked about", () => {
    // **`last-closes-cache.ts`' recorded defect, not copied** — it memoises on
    // the session it was ASKED about, so a refresh that runs before the nightly
    // pass records today's date against yesterday's data and can never fire
    // again that day. Here the row **is** the session it is for.
    const cache = createExcessBaselineCache({
      store: { readNewestGeneration: () => Promise.resolve(GENERATION) },
      now: () => 0,
    });

    return (async () => {
      await cache.load(LATER_SESSION);
      expect(cache.heldThrough()).toBe(HELD_SESSION);
      expect(cache.heldThrough()).not.toBe(LATER_SESSION);
    })();
  });

  it("does not re-read inside the floor, and does once past it", async () => {
    let clock = 0;
    let reads = 0;

    const cache = createExcessBaselineCache({
      store: {
        readNewestGeneration: () => {
          reads += 1;
          return Promise.resolve(GENERATION);
        },
      },
      now: () => clock,
    });

    await cache.load(LATER_SESSION);
    expect(reads).toBe(1);

    cache.baselineAsOf(LATER_SESSION);
    clock += 14 * 60_000;
    cache.baselineAsOf(LATER_SESSION);
    expect(reads).toBe(1);

    clock += 2 * 60_000;
    cache.baselineAsOf(LATER_SESSION);
    expect(reads).toBe(2);
  });

  it("says out loud when no generation is stored at all", async () => {
    // CI's permanent state, and every store `pnpm baselines` has not run
    // against: the honest answer is an empty map and a named log line rather
    // than a silence that reads like a healthy load.
    const warn = vi.fn();
    const cache = createExcessBaselineCache({
      store: { readNewestGeneration: () => Promise.resolve([]) },
      now: () => 0,
      warn,
    });

    await cache.load(LATER_SESSION);

    expect(cache.size()).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ securities: 0 }),
      expect.stringContaining("no excess-move baseline generation is stored"),
    );
  });
});
