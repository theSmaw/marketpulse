import { useEffect, useRef, useState } from "react";

import { cx } from "../../cx.js";
import type { BarSeriesView } from "../../market/index.js";
import { chartDensity } from "../../market/index.js";
import type { ChartSubject, PlotBox } from "./chart-geometry.js";
import { chartFrame } from "./chart-geometry.js";
import styles from "./PriceChart.module.css";

// **The first chart in MarketPulse** (Task 2.12.4) — one security's closes, on
// a session-ordinal axis, drawn in hand-built SVG with no charting dependency.
//
// ## The fence this component takes down
//
// `BarSeriesPanel` stated that it drew nothing and
// `e2e/specs/security-series.spec.ts` asserted it: no `<canvas>` and no `<svg>`
// in the Price region. Story 2.10 built that fence so that the charting
// decision would be taken against a data layer already known to be right rather
// than against both at once. It has served its purpose —
// [`CHARTING.md`](../../../../../planning/epic-02-security-universe-historical-data/story-12-price-chart/CHARTING.md)
// §0's measurements were taken against it — and this component is what comes
// through it. The spec was changed to assert what is now true rather than
// deleted, so the instrument survives the fence.
//
// ## What it draws, and what it deliberately does not
//
// Every mark here is a decision recorded in `VISUAL-LANGUAGE.md`'s _The chart_,
// which was taken on the design canvas ADR 0026 makes the source of truth.
// There are **no renderer defaults to override** — the frame is one near-black
// hairline along the bottom, the value scale sits in a right-hand gutter,
// gridlines are horizontal only, the one vertical rule is the session seam, and
// the series is achromatic whatever the window did.
//
// Three things that look like this component's job and are not:
//
//  - **The dashed reference rule at the opening close, and the directional
//    wash.** Task 2.12.5's, and they are inseparable — the rule is the geometry
//    that carries direction and the wash is the hue that repeats it. Drawing the
//    wash here and the rule there is how a chart ships with a tint and nothing
//    under it.
//  - **`--chart-uncovered` and the dashed coverage edge.** Task 2.12.7's. What
//    *is* this task's is the x-domain coming from `coverage.requested`, which is
//    one argument in `chart-geometry.ts` and is what decides whether that task
//    draws a state or retrofits an axis.
//  - **The crosshair, the readout and the keyboard path to a point.** Task
//    2.12.6's. The SVG below is `aria-hidden` and carries no interaction at all,
//    which is honest rather than a gap: every fact the picture shows is stated
//    in text beneath it by `BarSeriesPanel`, and Task 2.12.8 owns the text
//    alternative that says something a picture-reader would want.
//
// ## The frame is never conditional on the data
//
// `PRODUCT_SPEC.md` §28 wants visible feedback within 500 ms and §36 wants
// loading to be a designed state. The default window now answers in ~400 ms
// from the UK (`CHARTING.md` §4), which is exactly why this rule matters: it
// would be easy to conclude it is no longer needed. It is — Story 2.13's
// control offers the month that still costs ~1.2 s and Epic 13's replay will
// ask for windows nobody has measured.
//
// So the plot's height, its rule, its gutter and its gridlines come from the
// **box alone**; only the labels and the line need an answer. A chart waiting
// for its first is a real scale with nothing written on it, not a box.
//
// ## How it gets its size, and why it reads no token
//
// Task 2.12.3's amendment says to read `--chart-height` / `--chart-gutter`
// through `styles/tokens.ts` and hand the numbers to the scales. **This
// measures the laid-out elements instead**, and the deviation is deliberate and
// recorded in the task file. Three reasons:
//
//  1. `getTokens()` **throws in the test environment** — no stylesheet is
//     applied there — so a component that called it would take every one of its
//     own jsdom tests down.
//  2. The measurement *is* the token, resolved: the plot element's height is
//     whatever `--chart-height` says, after the density class has chosen which
//     of the pair applies. Reading the token and re-deriving the box would be
//     the second spelling.
//  3. It collapses the duplication `CHARTING.md` §10.3 recorded. The 600px
//     boundary is spelled **once**, in `chart-density.ts`; the stylesheet keys
//     on a class this component sets from it rather than on a second copy of
//     the number.
//
// The gutter is an input to the horizontal range rather than padding applied
// afterwards — structurally, because the measured element is the plot and the
// gutter is a sibling column it never contains.

export interface PriceChartProps {
  /**
   * Everything this application knows about the series. **Taken whole and
   * never spread** (`FRONTEND-STATE.md` §1).
   *
   * A component receives the state and renders the member it is given. Spread
   * into props, the six-member union becomes sixteen impossible combinations
   * and the exhaustive `switch` that catches a seventh member stops existing.
   */
  readonly view: BarSeriesView;
}

export function PriceChart({ view }: PriceChartProps) {
  const { chartRef, plotRef, regionWidth, plot } = usePlotSize();

  const density = chartDensity(regionWidth);
  const frame = chartFrame(plot, density, chartSubject(view));

  // Two states have no window to draw an axis for: a refusal is an answer about
  // the *request* and a failure never got one. A frame under either would be a
  // picture of a window nobody asked for, and the panel beneath already says
  // what happened in a sentence. What those two eventually look like is Task
  // 2.12.7's, which owns every state drawn.
  if (!drawsAFrame(view)) return null;

  return (
    <div
      className={cx(styles.chart, density.compact ? styles.compact : undefined)}
      ref={chartRef}
    >
      <div className={styles.plot} ref={plotRef}>
        {/*
         * `aria-hidden`, and `focusable="false"` for the one engine that still
         * puts an SVG in the tab order. The picture is not the evidence here —
         * the stated facts beneath it are, every one of them checkable against
         * the store — so a `role="img"` with a name invented for it would be a
         * promise this task has not earned. Task 2.12.8 owns the text
         * alternative and the screen-reader walk that proves it.
         */}
        <svg
          className={styles.canvas}
          width={plot.width}
          height={plot.height}
          aria-hidden="true"
          focusable="false"
        >
          {/*
           * `crispEdges` on the chrome and not on the series: a hairline at a
           * fractional y renders as two grey pixels, which reads as a heavier
           * rule rather than as a sharper one. The line keeps its antialiasing,
           * because a 1.5px stroke over 1,950 points is where it is doing work.
           */}
          <g shapeRendering="crispEdges">
            {frame.gridlines.map((gridline) => (
              <line
                className={styles.gridline}
                key={gridline.y}
                x1={0}
                x2={plot.width}
                y1={gridline.y}
                y2={gridline.y}
              />
            ))}
            {frame.seams.map((x) => (
              <line
                className={styles.seam}
                key={x}
                x1={x}
                x2={x}
                y1={0}
                y2={plot.height}
              />
            ))}
          </g>
          {frame.series !== null && (
            <path className={styles.series} d={frame.series} />
          )}
        </svg>
      </div>

      {/*
       * The value scale, on the **right**, because right is where the latest
       * price is: the last point of the line, the current-value reading above
       * and the scale all land in the same place. Labels drawn inside the plot
       * were tried on the canvas and abandoned — at the measured 1,019px region
       * the topmost one sat on the series.
       */}
      <div className={styles.gutter}>
        {frame.gridlines.map(
          (gridline) =>
            gridline.label !== null && (
              <span
                className={styles.valueLabel}
                key={gridline.y}
                style={{ top: `${String(gridline.y)}px` }}
              >
                {gridline.label}
              </span>
            ),
        )}
      </div>

      {/*
       * The time axis. A session boundary carries the date and everything
       * between carries a time, which is the whole of what a reader is told
       * about the night the ordinal axis did not draw.
       *
       * The row is `--chart-filing-lane` tall above the labels rather than
       * flush: `VISUAL-LANGUAGE.md` reserves 14px between the baseline and the
       * labels for Epic 9's filing markers, and reserving it from today is
       * three sentences against a retrofit.
       */}
      <div className={styles.axis}>
        {frame.ticks.map((tick) => (
          <span
            className={cx(
              styles.timeLabel,
              tick.kind === "session" ? styles.sessionLabel : undefined,
              // The first label would otherwise be centred on pixel zero and
              // hang half its width off the left edge — into a `Region` that
              // declares `overflow: auto`, which turns a label into a
              // horizontal scrollbar. There is no matching clamp on the right:
              // the gutter is 56px of empty space in this row and a label
              // reaching into it costs nothing.
              tick.x === 0 ? styles.firstLabel : undefined,
            )}
            key={`${tick.kind}-${String(tick.x)}`}
            style={{ left: `${String(tick.x)}px` }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}

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
 *
 * An exhaustive `switch` rather than a property check, so a seventh union member
 * is a compile error here.
 */
function chartSubject(view: BarSeriesView): ChartSubject | null {
  switch (view.state) {
    case "loaded":
    case "partial":
    case "empty":
      return {
        requested: view.series.coverage.requested,
        timeframe: view.series.timeframe,
        bars: view.series.bars,
      };
    case "loading":
    case "refused":
    case "failed":
      return null;
  }
}

/** Is there a window for a frame to be about? */
function drawsAFrame(view: BarSeriesView): boolean {
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

/** Nothing measured yet, which is every render in jsdom and the first in a browser. */
const UNMEASURED = { regionWidth: 0, plot: { width: 0, height: 0 } };

/**
 * The region's width, and the plot's own box, measured from the DOM.
 *
 * **A `ResizeObserver` and not a one-off read**, for `AppHeader`'s reason and
 * one more: the Price region is full width on a grid that reflows, so its width
 * changes without this component re-rendering — and `CHARTING.md` §2's table is
 * the whole argument for keying the chart's density on the *region* rather than
 * on the viewport. The region is 1,019px at a 1920 viewport and 342px at 390.
 *
 * **Feature-detected, exactly as `AppHeader` detects it**, and the fallback is
 * right rather than merely safe: jsdom has no observer *and* no layout, so the
 * honest measurement there is zero — which `chartFrame` renders as a frame with
 * no marks in it, and `chartDensity` answers for deliberately rather than
 * throwing.
 *
 * The equality guard is not defensive padding. An observer whose callback sets
 * state that changes the observed box is an infinite loop; nothing here does
 * that today — the SVG is absolutely positioned inside a plot whose height is a
 * token — but the guard is what keeps that true if a later task puts something
 * in the flow.
 */
function usePlotSize() {
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

      setSize((current) =>
        current.regionWidth === region.width &&
        current.plot.width === box.width &&
        current.plot.height === box.height
          ? current
          : {
              regionWidth: region.width,
              plot: { width: box.width, height: box.height },
            },
      );
    });

    // Both, and in one observer: the density keys on the region's width and the
    // scales key on the plot's box, and the two are different numbers because
    // the value gutter sits between them.
    observer.observe(chart);
    observer.observe(plot);

    return () => {
      observer.disconnect();
    };
  }, []);

  return {
    chartRef,
    plotRef,
    regionWidth: size.regionWidth,
    plot: size.plot satisfies PlotBox,
  };
}
