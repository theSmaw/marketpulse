import { createContext, useContext } from "react";

import type { TimeFrame } from "./chart-geometry.js";

// **The one axis two plots hang on** (Task 2.13.4).
//
// `VOLUME-AND-WINDOW.md` §13.1 states the property this file exists to make
// structural: *two plots sharing one x-domain must stop at the same pixel.*
// `CHARTING.md` §17.5 item 4 names it as the item most likely to be got wrong by
// a second plot, and the shape that gets it wrong is the obvious one — two
// components that each build an axis from the same window and happen to agree.
//
// Task 2.13.3 took the first half structurally: `timeFrame` is the only function
// that takes a window, and `priceFrame` and `volumeFrame` are handed a
// {@link TimeFrame} and a height, so neither *can* build an axis. This is the
// second half — **one `timeFrame` call, in one place, read by both plots** — so
// the seams, the ticks and the coverage span are literally the same values
// rather than two derivations of them.
//
// ## Why a context rather than a parent that renders both
//
// The two plots are in two `Region` panels that are **not adjacent in the DOM**:
// `PRODUCT_SPEC.md` §8.3's reading order puts the Abnormal-move region between
// them, and at one column that separation is what a reader actually walks
// through. A component rendering both as siblings would have to reorder the
// page to suit its own implementation.
//
// ## And why the state lives here rather than in the route
//
// `VOLUME-AND-WINDOW.md` §15.1: lifting chart state into `SecurityExplorer`
// would re-render the 518-row universe table, on a page already spending
// 50–66 ms of main thread on a cold load because of that table. The provider
// renders its `children` through unchanged, so React re-renders only the
// consumers.
//
// > **Amended 2026-10-10 by Task 4.8.10 — the breach is real and the UNIT has
// > moved.** Re-taken on 2026-10-09 (Task 4.8.6) over 40 interleaved cold
// > loads: `/securities` is in breach on **10 of 10** loads as a **frame** of
// > 62.8–77.4 ms — script 26–31 ms, style/layout/paint 34–38 ms — while
// > `PerformanceObserver({ entryTypes: ["longtask"] })` reports **nothing at
// > all**. So the figure above is right about the magnitude and wrong about
// > the channel, and the argument in this paragraph is unaffected: the table
// > is still what costs, and the lever is still DOM size. `PRODUCT_SPEC.md`
// > §28 now states the method as three channels, each proved by a plant on
// > the page that produced the figure.
//
// **Task 2.13.5 adds the read position to this same wrapper**, which is why it
// is a wrapper rather than a `useMemo` in the route: the shape that survives is
// state in a component whose children pass through, so a pointer move
// re-renders the two reading overlays and neither frame owner.

/**
 * Which plot a measurement came from.
 *
 * Not decoration: both plots are the same width by construction — they declare
 * the same span on the same grid — so both report the same number, and a
 * provider that simply took the last report would be set twice per resize by two
 * components with no ordering between them. Naming the source makes the shared
 * width a **decision** (see `ChartAxis`) rather than a race that happens to
 * settle.
 */
export type ChartPlotRole = "price" | "volume";

/** What a plot is handed: the shared axis, and somewhere to report its box. */
export interface ChartAxisValue {
  /**
   * The axis, the seams, the ticks and the coverage span — **for both plots**.
   *
   * Carries the width it was built at. A plot draws its marks at
   * `frame.width` rather than at its own measurement, which is what makes
   * "the two stop at the same pixel" true by arithmetic instead of by two
   * elements happening to be laid out identically.
   */
  readonly frame: TimeFrame;
  /** Report a plot's measured region width and plot width. Stable identity. */
  readonly report: (
    role: ChartPlotRole,
    regionWidth: number,
    width: number,
  ) => void;
}

const ChartAxisContext = createContext<ChartAxisValue | null>(null);

export const ChartAxisProvider = ChartAxisContext.Provider;

/**
 * The shared axis, from the nearest `ChartAxis`.
 *
 * **Throws outside one**, rather than falling back to a private frame. A
 * fallback would be a second home for the composition Task 2.13.3 spent a task
 * taking apart, and its failure mode is the quiet one: two plots that each built
 * their own axis look right at every width where they agree, which is every
 * width until one of them is measured a frame later than the other.
 */
export function useChartAxis(): ChartAxisValue {
  const value = useContext(ChartAxisContext);

  if (value === null) {
    throw new Error(
      "A chart plot must be rendered inside a <ChartAxis>, which owns the " +
        "axis both plots hang on.",
    );
  }

  return value;
}
