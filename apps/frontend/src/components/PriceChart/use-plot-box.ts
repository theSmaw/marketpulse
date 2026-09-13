import { useEffect, useRef, useState } from "react";

import type { PlotBox } from "./chart-geometry.js";
import type { ChartPlotRole } from "./chart-axis-context.js";

/** Nothing measured yet, which is every render in jsdom and the first in a browser. */
const UNMEASURED = { regionWidth: 0, plot: { width: 0, height: 0 } };

/**
 * The region's width and the plot's own box, measured from the DOM.
 *
 * Extracted from `PriceChart` by Task 2.13.4, unchanged in behaviour, because
 * the volume plot measures itself exactly the same way and the one-pixel
 * correction below is the thing that must not exist in two versions.
 *
 * **A `ResizeObserver` and not a one-off read**, for `AppHeader`'s reason and
 * one more: both chart regions are full width on a grid that reflows, so their
 * width changes without the component re-rendering — and `CHARTING.md` §2's
 * table is the whole argument for keying density on the *region* rather than on
 * the viewport. The region is 1,019px at a 1920 viewport and 342px at 390.
 *
 * **Feature-detected, exactly as `AppHeader` detects it**, and the fallback is
 * right rather than merely safe: jsdom has no observer *and* no layout, so the
 * honest measurement there is zero — which the geometry renders as a frame with
 * no marks in it, and `chartDensity` answers for deliberately rather than
 * throwing.
 *
 * The equality guard is not defensive padding. An observer whose callback sets
 * state that changes the observed box is an infinite loop; nothing here does
 * that today — each SVG is absolutely positioned inside a plot whose height is a
 * token — but the guard is what keeps that true if a later task puts something
 * in the flow.
 *
 * @param report where the measurement goes so that both plots hang on one axis.
 *   See `chart-axis-context.ts`: this hook measures, and something else decides
 *   what the pair's shared width is.
 * @param role which plot is reporting, which is how that decision is made
 *   without two equal-width plots taking turns to set the same state.
 */
export function usePlotBox(
  report: (role: ChartPlotRole, regionWidth: number, width: number) => void,
  role: ChartPlotRole,
) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(UNMEASURED);

  useEffect(() => {
    const chart = chartRef.current;
    const plot = plotRef.current;
    if (chart === null || plot === null) return;
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      const region = chart.getBoundingClientRect();
      const box = plot.getBoundingClientRect();

      // **The axis rule's own pixel, subtracted** (Task 2.12.7, and the trap
      // Task 2.13.4 inherits a second fill for).
      //
      // The plot's bottom border *is* the axis rule and
      // `getBoundingClientRect()` includes it, so the measured height is one
      // pixel taller than the area there is to draw in. Every stroke tolerated
      // that; a **fill** does not — the uncovered ground painted over the axis
      // for three tasks, and the volume columns are the second fill this axis
      // carries.
      //
      // jsdom implements neither `offsetHeight` nor `clientHeight`, so the
      // correction is zero there and no component test can see it.
      // `e2e/specs/security-price-chart.spec.ts` is the only instrument that
      // can, and it now asserts it for both plots.
      const axisRule = plot.offsetHeight - plot.clientHeight;
      const height = box.height - axisRule;

      setSize((current) =>
        current.regionWidth === region.width &&
        current.plot.width === box.width &&
        current.plot.height === height
          ? current
          : {
              regionWidth: region.width,
              plot: { width: box.width, height },
            },
      );

      report(role, region.width, box.width);
    });

    // Both: the region decides the density and the plot decides the pixels, and
    // the two do not change together — a gutter that swaps at a breakpoint moves
    // the plot's width without moving the region's.
    observer.observe(chart);
    observer.observe(plot);

    return () => {
      observer.disconnect();
    };
  }, [report, role]);

  return {
    chartRef,
    plotRef,
    plot: size.plot satisfies PlotBox,
  };
}
