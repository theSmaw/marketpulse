import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubBarSeries } from "../fixtures/stub-fetch.js";
import { useBarSeries } from "./use-bar-series.js";

// The test the cache's reset exists for, and it is deliberately the only file in
// this package that clears nothing of its own (Task 2.10.6).
//
// `barSeriesCache` is module-level, so it is imported once per worker and every
// entry one test writes is visible to the next. `src/test-setup.ts` clears it in
// the same `afterEach` that unmounts, and **this pair is what would go red
// without that line** — two tests over one request, passing individually and
// disagreeing when run together.
//
// The assertion is the *first rendered state*, not the eventual one, and that is
// the whole point. `useBarSeries` reads the cache while rendering so a held
// series paints in the first commit rather than a frame later — so an inherited
// entry makes the second test's first state `loaded`, and both tests still reach
// `loaded` in the end. A test asserting only where it lands passes either way,
// which is exactly how an ordering hazard survives into a suite.
//
// **Verified by substitution**, per `CLAUDE.md`'s rule that a break which does
// not go red is not evidence the check works: with `clearBarSeriesCache()`
// removed from `test-setup.ts`, this file reports 1 passed / 1 failed —
// `expected 'loaded' to be 'loading'` on the second test — and passes again when
// the second test is run alone with `-t`. With the line restored, both pass.
//
// Note the hazard is invisible to a single-file run in the other direction too:
// nothing here is wrong if the file is the only one in the suite. It is the
// **suite** this protects, and a file that renders a series without knowing this
// cache exists is the case it protects it from.

/** One request, shared by both tests, so both key the same cache entry. */
const REQUEST = {
  symbol: "NVDA",
  timeframe: "1m",
  window: { form: "named", sessions: 5 },
} as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the series cache between tests", () => {
  it("starts at loading and leaves an entry behind", async () => {
    stubBarSeries("full");

    const { result } = renderHook(() => useBarSeries(REQUEST));

    expect(result.current.view.state).toBe("loading");
    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });
  });

  it("starts at loading again, because the entry did not survive", async () => {
    stubBarSeries("full");

    const { result } = renderHook(() => useBarSeries(REQUEST));

    // The assertion the reset is for. Without it this reads `loaded`, painted
    // from the entry the test above wrote, before `fetch` has been asked
    // anything at all.
    expect(result.current.view.state).toBe("loading");

    await waitFor(() => {
      expect(result.current.view.state).toBe("loaded");
    });
  });
});
