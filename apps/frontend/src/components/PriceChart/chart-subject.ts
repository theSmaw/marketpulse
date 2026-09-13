import type { BarSeriesView } from "../../market/index.js";
import type { ChartSubject } from "./chart-geometry.js";

// **What a chart is about, read off the state union** (Task 2.13.4).
//
// These two functions lived in `PriceChart.tsx` until there was a second plot on
// the same axis. They are here rather than duplicated because they are not a
// price-chart decision: they are the mapping from
// [`FRONTEND-STATE.md`](../../../../../planning/epic-02-security-universe-historical-data/story-10-frontend-market-data-layer/FRONTEND-STATE.md)
// §3's six-member union onto *is there a window to draw, and what is in it* —
// and two plots that answered it differently would be two charts on one axis
// disagreeing about whether there is an axis.
//
// Both are exhaustive `switch`es rather than property checks, so a seventh union
// member is a compile error in one place.

/**
 * What the chart is about — **the window that was asked for**, and the bars
 * that came back inside it.
 *
 * `null` before there is an answer, which is the frame-first state.
 *
 * The `requested` window and never the bars' own span: derive the domain from
 * the bars and a `partial` series silently rescales to fill the frame and looks
 * complete (`CHARTING.md` §6.2). Nothing goes red, no reader can see it, and no
 * test below `pnpm e2e` can either. `loaded` is the one member where the two
 * derivations agree, which is why building against it alone would never reveal
 * the difference.
 */
export function chartSubject(view: BarSeriesView): ChartSubject | null {
  switch (view.state) {
    case "loaded":
    case "partial":
    case "empty":
      return {
        requested: view.series.coverage.requested,
        covered: view.series.coverage.covered,
        timeframe: view.series.timeframe,
        bars: view.series.bars,
      };
    case "loading":
    case "refused":
    case "failed":
      return null;
  }
}

/**
 * Is there a window for a frame to be about?
 *
 * `refused` and `failed` carry no series and therefore no window, so neither
 * plot draws a frame under them — a frame there would have to invent one. Both
 * charts ask this, and they must agree: a volume plot under an absent price
 * plot is an axis with one half of it missing.
 */
export function drawsAFrame(view: BarSeriesView): boolean {
  switch (view.state) {
    case "loading":
    case "loaded":
    case "partial":
    case "empty":
      return true;
    case "refused":
    case "failed":
      return false;
  }
}
