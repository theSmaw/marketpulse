import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../fixtures/bar-series.js";
import type { BarSeriesView } from "./bar-series-view.js";
import { useLiveSeries } from "./use-live-series.js";

import type { Bar } from "@marketpulse/shared";

// **The accumulation the pure function cannot do for itself** (Task 3.9.2).
//
// `withLiveBars` is tested beside itself; what is tested here is the memory:
// the feed hands a page the **latest** bar per security and nothing else, so a
// chart that wants a series has to keep the ones that came before. What that
// costs is one question — when is the memory wrong? — and the answer is *when
// it belongs to a different request*.

const VIEW = barSeriesFixtureView("partial");

function seriesOf(view: BarSeriesView) {
  if (view.state !== "partial" && view.state !== "loaded") {
    throw new Error(`fixture is ${view.state}`);
  }
  return view.series;
}

/** The nth minute after the fixture's last bar. */
function minute(n: number, close = 100 + n): Bar {
  const bars = seriesOf(VIEW).bars;
  const last = bars[bars.length - 1];
  if (last === undefined) throw new Error("fixture has no bars");
  return {
    startsAt: new Date(last.startsAt.getTime() + n * 60_000),
    open: close,
    high: close,
    low: close,
    close,
    volume: 10,
  };
}

describe("remembering what arrived while the page was open", () => {
  it("keeps every minute it has been shown, not just the latest", () => {
    const { result, rerender } = renderHook(
      ({ live }: { live: Bar | undefined }) => useLiveSeries(VIEW, live),
      { initialProps: { live: undefined as Bar | undefined } },
    );

    const before = seriesOf(result.current).bars.length;

    rerender({ live: minute(1) });
    rerender({ live: minute(2) });
    rerender({ live: minute(3) });

    // Three separate frames, each carrying one bar, and the chart holds all
    // three — which is the whole reason this hook exists. The feed's map held
    // only the third.
    expect(seriesOf(result.current).bars.length).toBe(before + 3);
  });

  it("applies a correction to a minute it already holds without growing", () => {
    const { result, rerender } = renderHook(
      ({ live }: { live: Bar | undefined }) => useLiveSeries(VIEW, live),
      { initialProps: { live: undefined as Bar | undefined } },
    );

    const before = seriesOf(result.current).bars.length;

    rerender({ live: minute(1, 101) });
    rerender({ live: minute(1, 107) });

    const bars = seriesOf(result.current).bars;
    expect(bars.length).toBe(before + 1);
    expect(bars[bars.length - 1]?.close).toBe(107);
  });

  it("forgets what it watched when the request changes", () => {
    const other = barSeriesFixtureView("dense");

    const { result, rerender } = renderHook(
      ({ view, live }: { view: BarSeriesView; live: Bar | undefined }) =>
        useLiveSeries(view, live),
      {
        initialProps: {
          view: VIEW,
          live: undefined as Bar | undefined,
        },
      },
    );

    rerender({ view: VIEW, live: minute(1) });
    expect(seriesOf(result.current).bars.length).toBe(
      seriesOf(VIEW).bars.length + 1,
    );

    // A different security or a different window is a different question, and
    // NVDA's watched minutes are not part of the answer to it. `held-series.ts`
    // applies the same rule one layer up for the same reason.
    rerender({ view: other, live: undefined });
    expect(seriesOf(result.current).bars.length).toBe(
      seriesOf(other).bars.length,
    );
  });

  it("hands back the very same view when the feed has said nothing", () => {
    const { result } = renderHook(() => useLiveSeries(VIEW, undefined));

    // Referential identity, because the memo boundaries downstream depend on
    // it: a page with no feed, a shut market or a security the feed has not
    // mentioned must cost nothing and re-render nothing.
    expect(result.current).toBe(VIEW);
  });
});
