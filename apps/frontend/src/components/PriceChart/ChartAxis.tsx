import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import type { BarSeriesView } from "../../market/index.js";
import { chartDensity } from "../../market/index.js";
import type { ChartPlotRole } from "./chart-axis-context.js";
import { ChartAxisProvider } from "./chart-axis-context.js";
import { timeFrame } from "./chart-geometry.js";
import type { ChartRead } from "./chart-reading-context.js";
import { ChartReadingProvider, NO_READING } from "./chart-reading-context.js";
import { chartSubject } from "./chart-subject.js";

// **The axis, once, for every plot under it** (Task 2.13.4), **and the one
// position both of them are read at** (Task 2.13.5).
//
// See `chart-axis-context.ts` and `chart-reading-context.ts` for the two
// arguments. What is here is the mechanism: two pieces of state, one
// `timeFrame` call, **two context values that are memoised separately**, and
// `children` rendered through untouched.
//
// The separation is the load-bearing part and it is invisible on screen. React
// re-renders a context consumer only when that context's value changes by
// identity, so a pointer move re-renders this component, leaves the frame
// memo's inputs untouched, and reaches **only** the two reading overlays.
// `children` is the same element tree it was handed, so the subtree between
// this provider and the plots does not render at all — which is what keeps the
// 518-row universe table below this route out of the pointer path.
//
// **This is not a store, and `FRONTEND-STATE.md` §1's trigger has not fired.**
// That trigger is *the first piece of state two features must agree about that
// neither owns*; this is two components inside one feature on one route, and a
// wrapper answers it. A later reader should not read this file as the trigger
// having fired quietly.

/** A plot's measurement of itself. */
interface PlotMeasurement {
  readonly regionWidth: number;
  readonly width: number;
}

const UNMEASURED: PlotMeasurement = { regionWidth: 0, width: 0 };

export interface ChartAxisProps {
  /**
   * Everything this application knows about the series. **Taken whole and never
   * spread** (`FRONTEND-STATE.md` §1) — the window on the axis comes from it,
   * and three of the six members carry no window at all.
   */
  readonly view: BarSeriesView;
  /**
   * Rendered through unchanged. **That is the whole design**: anything between
   * the provider and the plots would re-render on a measurement, and Task
   * 2.13.5 puts the read position in this same component, where anything
   * between would re-render on a pointer move.
   */
  readonly children: ReactNode;
}

export function ChartAxis({ view, children }: ChartAxisProps) {
  // Two slots rather than one, and the precedence is the decision.
  //
  // The price plot is authoritative because it is the one that must exist for
  // the other to mean anything — a volume plot with no price above it is a
  // supporting series supporting nothing. The fallback exists so a plot can be
  // reviewed on its own in the workshop and so that Epic 11's agent, which can
  // open a chart of its choosing, is not obliged to open two.
  //
  // What this avoids is not a disagreement — the two are the same width by
  // construction — but two components with no ordering between them writing the
  // same state on every resize.
  const [price, setPrice] = useState(UNMEASURED);
  const [volume, setVolume] = useState(UNMEASURED);

  // **The read position, and it is deliberately not in the value above.** See
  // `chart-reading-context.ts`: both frame owners call `useChartAxis`, so a
  // read position on that value would rebuild a 1,950-point path string and a
  // 726-stem silhouette on every mouse event.
  const [read, setRead] = useState<ChartRead>(NO_READING);

  const report = useCallback(
    (role: ChartPlotRole, regionWidth: number, width: number) => {
      const set = role === "price" ? setPrice : setVolume;

      // The same equality guard `usePlotBox` keeps, for the same reason and one
      // more: a `ResizeObserver` fires on every observed box, so an unguarded
      // setter here would re-render both plots twice per resize.
      set((current) =>
        current.regionWidth === regionWidth && current.width === width
          ? current
          : { regionWidth, width },
      );
    },
    [],
  );

  const value = useMemo(() => {
    const measured = price.width > 0 ? price : volume;

    return {
      // Density keys on the **region** and not the plot, and it is computed
      // inside the memo rather than beside it: `chartDensity` returns a fresh
      // object every call, so a `density` computed in the render body would be a
      // dependency that changes on every render and a memo that never hits.
      frame: timeFrame(
        measured.width,
        chartDensity(measured.regionWidth),
        chartSubject(view),
      ),
      report,
    };
  }, [price, volume, view, report]);

  // `setRead` is a `useState` setter and therefore stable, so this value changes
  // exactly when the reading does — which is the property the guard counts.
  const reading = useMemo(() => ({ read, setRead }), [read]);

  return (
    <ChartAxisProvider value={value}>
      <ChartReadingProvider value={reading}>{children}</ChartReadingProvider>
    </ChartAxisProvider>
  );
}
