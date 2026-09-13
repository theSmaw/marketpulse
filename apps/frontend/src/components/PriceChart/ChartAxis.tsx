import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import type { BarSeriesView } from "../../market/index.js";
import { chartDensity } from "../../market/index.js";
import type { ChartPlotRole } from "./chart-axis-context.js";
import { ChartAxisProvider } from "./chart-axis-context.js";
import { timeFrame } from "./chart-geometry.js";
import { chartSubject } from "./chart-subject.js";

// **The axis, once, for every plot under it** (Task 2.13.4).
//
// See `chart-axis-context.ts` for the argument. What is here is the mechanism:
// one piece of state, one `timeFrame` call, and `children` rendered through
// untouched.

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

  return <ChartAxisProvider value={value}>{children}</ChartAxisProvider>;
}
