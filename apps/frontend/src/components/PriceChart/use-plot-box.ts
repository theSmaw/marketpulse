import { useEffect, useState } from "react";

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
 * ## The two elements are **state, not refs**, and that is a repair
 *
 * Found on the running page at Task 2.13.7, by looking at it. With the elements
 * held in `useRef`, this effect ran once per mount against
 * `[report, role]` — and both plots return `null` before they have a window to
 * draw, so on a mount that begins in `refused` or `failed` the refs are empty
 * when the effect runs, the observer is never created, and **nothing ever
 * re-runs the effect to create one.** The chart then renders a frame with no
 * measurement in it for the rest of that mount: a `<svg>` at 0 × 0 inside a
 * plot 939px wide, the compact density class at a 985px region, and a panel of
 * correct figures under an empty box.
 *
 * It was reachable before this task and is reachable now by one route each. On
 * the current build: land cold on `/securities/NVDA?sessions=1000`, which the
 * address makes a refusal, then press any window with bars — the navigation is
 * client-side, so the component never remounts. A ref does not notify anything
 * when it is filled; state does, which is the whole of the change.
 *
 * `e2e/specs/security-window-change.spec.ts` holds it, and it can be held
 * nowhere else: jsdom implements no `ResizeObserver` and computes no layout, so
 * the measurement is zero there either way.
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
  const [chart, setChart] = useState<HTMLDivElement | null>(null);
  const [plot, setPlot] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState(UNMEASURED);

  useEffect(() => {
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
  }, [chart, plot, report, role]);

  return {
    // Callback refs, which is what makes the two elements observable at all —
    // see the header. React calls each with the element when it is attached and
    // with `null` when it goes, so a plot that appears three renders after its
    // component mounted starts being measured on the render it appears.
    chartRef: setChart,
    plotRef: setPlot,
    plot: size.plot satisfies PlotBox,
  };
}
