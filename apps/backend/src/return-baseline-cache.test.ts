// The baseline cache's three rules (Task 5.3.2).
//
// The **memoisation key** — the repair this module exists for — is driven in
// `return-baselines.database.test.ts`, because the honest version of it needs
// two real generations in a real table. What is here is the pair of properties
// that need no store at all and that `last-closes-cache.ts` also holds: **a
// failed refresh never empties the held map**, and **nothing on the read path
// awaits or throws**.
//
// No socket, no database, no clock. The store is a function and the clock is a
// seam, which is the whole reason `createReturnBaselineCache` takes both.

import { describe, expect, it, vi } from "vitest";

import { marketDateAt, toMarketDate, toTicker } from "@marketpulse/shared";

import { createReturnBaselineCache } from "./return-baseline-cache.js";
import type { StoredReturnBaseline } from "./return-baseline-store.js";

/** A generation for 2026-11-27's close — one security, one answer. */
const OBSERVED_AT = new Date("2026-11-27T18:00:00.000Z");

const GENERATION: readonly StoredReturnBaseline[] = [
  {
    symbol: toTicker("ZZZZ"),
    observedAt: OBSERVED_AT,
    lookbackSessions: 60,
    sampleCount: 118,
    breakpoints: Array.from({ length: 101 }, (_, rank) => rank / 100),
    refusal: null,
  },
];

const HELD_SESSION = marketDateAt(OBSERVED_AT);
const LATER_SESSION = toMarketDate("2026-11-30");

describe("createReturnBaselineCache", () => {
  it("is empty before the first load, and that is the true answer", () => {
    // A security with no baseline has no percentile, and *not enough evidence*
    // is a first-class outcome rather than a degraded one.
    const cache = createReturnBaselineCache({
      store: { readNewestGeneration: () => Promise.resolve([]) },
      now: () => 0,
    });

    expect(cache.size()).toBe(0);
    expect(cache.heldThrough()).toBeUndefined();
  });

  it("keeps the generation it holds when a refresh fails", () => {
    // **A stale-but-true distribution beats no distribution**: the alternative
    // is a percentile that was on screen a moment ago and now is not, because
    // a database hiccuped.
    let answer: () => Promise<readonly StoredReturnBaseline[]> = () =>
      Promise.resolve(GENERATION);
    let clock = 0;
    const warn = vi.fn();

    const cache = createReturnBaselineCache({
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

      // **Synchronous, and it does not throw.** The read path is called from
      // inside a burst; a throw there is a render error in the browser's
      // equivalent and a crashed process here.
      const held = cache.baselineAsOf(LATER_SESSION);
      expect(held.size).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(cache.size()).toBe(1);
      expect(cache.heldThrough()).toBe(HELD_SESSION);
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({ securities: 1 }),
        expect.stringContaining("keeping the generation we hold"),
      );
    })();
  });

  it("does not re-read inside the floor, and does once past it", async () => {
    // The cost of the repair, bounded. The condition stays TRUE while the
    // runner has not written tonight's generation — which is the whole point —
    // so without a floor it would fire on every ask, up to ~16 times a minute,
    // for 417 KB of breakpoints.
    let clock = 0;
    let reads = 0;

    const cache = createReturnBaselineCache({
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
    // CI's permanent state, and every bare store's: `measured` is nothing, so
    // the honest answer is an empty map and a named log line rather than a
    // silence that reads like a healthy load.
    const warn = vi.fn();
    const cache = createReturnBaselineCache({
      store: { readNewestGeneration: () => Promise.resolve([]) },
      now: () => 0,
      warn,
    });

    await cache.load(LATER_SESSION);

    expect(cache.size()).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ securities: 0 }),
      expect.stringContaining("no return baseline generation is stored"),
    );
  });
});
