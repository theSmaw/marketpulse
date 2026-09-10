import type { Bar, BarSeries } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import type { BarSeriesView } from "./bar-series-view.js";
import type { CacheableBarSeriesView } from "./series-cache.js";
import { createSeriesCache, isCacheableBarSeriesView } from "./series-cache.js";

// What is tested here is the two bounds and the recency order, and one property
// that is easy to state and easy to lose: **there is no clock in this file.**
// A test cannot assert the absence of a `Date`, so the closest true assertion
// is the one below — an entry is still there after time has passed, and it is
// only ever removed by another entry arriving.

/**
 * A cacheable state carrying a stated number of bars.
 *
 * The bars are not real and do not need to be: nothing in this file reads one,
 * and building 10,000 coherent bars through `toBarSeries` to test an eviction
 * rule would be testing the constructor. Cast at exactly one place, here, for
 * that reason.
 */
function answer(
  bars: number,
  state: CacheableBarSeriesView["state"] = "loaded",
): CacheableBarSeriesView {
  const series = {
    bars: Array.from({ length: bars }) as readonly Bar[],
  } as unknown as BarSeries;

  return {
    state,
    series,
    securityStatus: "active",
    stale: false,
  } as CacheableBarSeriesView;
}

describe("isCacheableBarSeriesView", () => {
  // The three answers are kept and the three non-answers are not, and each of
  // the latter for its own reason — `failed` is the one that would actually
  // hurt, because a remembered failure painted before a new request has had its
  // chance reports a fault that may already be fixed.
  it("keeps the three answers and refuses the three that are not", () => {
    const kept: BarSeriesView[] = [
      answer(1),
      answer(1, "partial"),
      answer(0, "empty"),
    ];
    for (const view of kept) expect(isCacheableBarSeriesView(view)).toBe(true);

    const refused: BarSeriesView[] = [
      { state: "loading" },
      { state: "refused", message: "That window is 98,280 bars." },
      {
        state: "failed",
        failure: "unreachable",
        requestId: null,
        retryable: true,
        retrying: false,
      },
    ];
    for (const view of refused)
      expect(isCacheableBarSeriesView(view)).toBe(false);
  });
});

describe("createSeriesCache", () => {
  it("hands back what it was given, under the key it was given", () => {
    const cache = createSeriesCache();
    const held = answer(390);

    expect(cache.read("symbol=NVDA")).toBeUndefined();
    cache.write("symbol=NVDA", held);

    // `toEqual` and not `toBe`: since Task 2.10.8 `write` normalises `stale`
    // off the entry, so what comes back is an equal answer rather than the same
    // object. The next assertion is the one that says why.
    expect(cache.read("symbol=NVDA")).toEqual(held);
    // Two spellings of one request would be two misses; two genuinely different
    // requests must not share an entry, and this is the assertion that says the
    // key is the whole request rather than the symbol.
    expect(cache.read("symbol=AMD")).toBeUndefined();
  });

  it("stores an answer, never the fact that one was painted from here", () => {
    // `stale` is a fact about the **screen** — this answer is one request old —
    // and not about the answer. The hook writes back whatever painted,
    // including an entry it had itself just marked, so an entry that remembered
    // the mark would hand every future reader a claim it had not earned. The
    // mark is applied at the read instead, where an accompanying request is
    // what makes it true.
    const cache = createSeriesCache();
    cache.write("symbol=NVDA", { ...answer(10), stale: true });

    expect(cache.read("symbol=NVDA")).toMatchObject({ stale: false });
  });

  // The entry bound: the degenerate case the bar budget cannot see, because an
  // empty series weighs nothing at all and is a correct answer.
  it("evicts the least recently written entry when the entry bound is passed", () => {
    const cache = createSeriesCache(3, 1_000_000);

    cache.write("a", answer(0));
    cache.write("b", answer(0));
    cache.write("c", answer(0));
    cache.write("d", answer(0));

    expect(cache.size).toBe(3);
    expect(cache.read("a")).toBeUndefined();
    expect(cache.read("d")).toBeDefined();
  });

  // The bar budget: the bound that is actually about memory, and the reason
  // this cache does not simply count entries. Three entries of 400 bars fit a
  // budget of 1,000 no better than one of 10,000 does.
  it("evicts until the bar budget holds, however few entries that is", () => {
    const cache = createSeriesCache(32, 1_000);

    cache.write("a", answer(400));
    cache.write("b", answer(400));
    expect(cache.size).toBe(2);
    expect(cache.bars).toBe(800);

    cache.write("c", answer(400));

    // "a" goes, "b" and "c" fit. An entry bound of 32 would have kept all three
    // and 1,200 bars with it — which is the whole argument for the second
    // bound written out as an assertion.
    expect(cache.size).toBe(2);
    expect(cache.bars).toBe(800);
    expect(cache.read("a")).toBeUndefined();
  });

  // A single series can be larger than the entire budget — a 10,000-bar answer
  // against a tab that has been asked to hold 50,000 is only five of them, and
  // a test budget of 1,000 makes the same point in one write. The entry being
  // written must survive: evicting the answer about to be painted would empty
  // the cache exactly when it is being used.
  it("keeps an entry that is bigger than the whole budget", () => {
    const cache = createSeriesCache(32, 1_000);

    cache.write("a", answer(400));
    cache.write("huge", answer(10_000));

    expect(cache.size).toBe(1);
    expect(cache.read("huge")).toBeDefined();
    expect(cache.read("a")).toBeUndefined();
  });

  // Re-writing a key moves it to the end of the order rather than leaving it
  // where it was — which is the difference between an LRU and a FIFO wearing
  // its name, and it is one `delete` in the implementation.
  it("promotes an entry that is written again", () => {
    const cache = createSeriesCache(2, 1_000_000);

    cache.write("a", answer(1));
    cache.write("b", answer(1));
    cache.write("a", answer(2));
    cache.write("c", answer(1));

    // "b" is the oldest write now, not "a".
    expect(cache.read("b")).toBeUndefined();
    expect(cache.read("a")).toBeDefined();
    expect(cache.read("c")).toBeDefined();
  });

  // Re-writing must not double-count towards the budget. A leak here is
  // invisible: the cache reports the right entries and quietly evicts them
  // sooner and sooner as one key is refreshed.
  it("does not count a re-written entry twice", () => {
    const cache = createSeriesCache(32, 1_000_000);

    cache.write("a", answer(400));
    cache.write("a", answer(390));

    expect(cache.size).toBe(1);
    expect(cache.bars).toBe(390);
  });

  // The closest a test can get to *there is no clock in that file*: nothing
  // expires. The five-minute ceiling on serving an invalidated body is the
  // browser's and the server's, and this layer has no opinion about time at
  // all — a second lifetime here would defeat that ceiling silently.
  it("has no lifetime: an entry survives time passing", async () => {
    const cache = createSeriesCache();
    cache.write("a", answer(390));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cache.read("a")).toBeDefined();
  });

  it("forgets everything on clear, bars included", () => {
    const cache = createSeriesCache();
    cache.write("a", answer(390));
    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.bars).toBe(0);
  });
});
