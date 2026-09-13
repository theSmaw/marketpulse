import { useId } from "react";

import { cx } from "../../cx.js";
import type { BarSeriesView } from "../../market/index.js";
import { useChartAxis } from "./chart-axis-context.js";
import { volumeAlternative } from "./chart-alternative.js";
import { volumeFrame, volumeTicks } from "./chart-geometry.js";
import { chartSubject, drawsAFrame } from "./chart-subject.js";
import { usePlotBox } from "./use-plot-box.js";
import { VolumeReading } from "./VolumeReading.js";
import styles from "./VolumeChart.module.css";

// **Traded volume, under the price and on the same axis** (Task 2.13.4).
//
// This fills the Volume region that `PRODUCT_SPEC.md` §8.3 named and Story
// 2.11's shell has been holding open since 2026-09-11. It is the second noun in
// this epic's exit criterion — *recent historical price **and volume** data* —
// and the first thing in this product drawn **per bar** rather than per series.
//
// ## The one thing this component must get right
//
// **The two plots stop at the same pixel.** `CHARTING.md` §17.5 item 4 names it
// as the property most likely to be got wrong by a second plot, and the way it
// goes wrong is not a bug anybody sees: two charts that each built an axis from
// the same window agree at every width, until one of them is measured a frame
// later than the other and the volume columns are three pixels out from the
// price line above them.
//
// It is structural here rather than remembered, in two halves:
//
//  - `volumeFrame` is handed a `TimeFrame` and a height and **cannot build an
//    axis** — there is no window in its arguments (Task 2.13.3).
//  - That `TimeFrame` comes from `ChartAxis` above both regions, so the seams,
//    the ticks, the slot scale and the coverage span are the *same values* the
//    price chart drew, not a second derivation of them.
//
// ## What it draws, and the four defaults it declines
//
// `VOLUME-AND-WINDOW.md` §9.4 is the table. **No gridlines** — volume is read
// comparatively, this bar against its neighbours, not off a scale, and a second
// set of horizontal rules doubles the chrome for the supporting series. **No
// intraday times** — two session dates, which is `chart-density.ts`'s existing
// `sessionLabels: "ends"` reused with no viewport branch of its own. **No
// directional colour** (§12). **One value label**, the window's peak.
//
// The seams are drawn **under** the columns: a 1.70:1 dashed rule crossing a
// 3.50:1 filled column is the column's pixel, because the mark carrying data
// wins every pixel it shares with the mark carrying chrome. On the price plot
// the two never overlap, because a line is a line.
//
// ## The fill trap, which this is the second instance of
//
// `CHARTING.md` §14.5: a fill is opaque where a stroke is not, and the plot's
// bottom border **is** the axis rule, so `getBoundingClientRect()` reports a box
// one pixel taller than there is to draw in. `usePlotBox`'s
// `offsetHeight - clientHeight` subtraction is the correction; jsdom implements
// neither property, so it is zero there and no component test can see it.
// `e2e/specs/security-price-chart.spec.ts` asserts it for **both** plots.
//
// ## The end columns, looked at rather than reasoned about
//
// `scaleSlot` puts the first bar at x = 0 and the last at x = width, so a column
// centred on either end has half of itself outside the plot. Two things follow,
// and they are different:
//
//  1. **The half outside is clipped** — by the `<clipPath>` below, and that is
//     not a judgement. Without it the stroke is painted *outside* the SVG's box
//     (the canvas declares `overflow: visible`, which every other mark needs),
//     putting up to 14px of column in the panel's padding at a thirty-bar
//     window. That is a defect, not a trade-off.
//  2. **The end columns therefore render half-width, and that is accepted.**
//     Looked at in the workshop at thirty bars, which is the density §10.3 says
//     it is visible at: two narrower columns at the ends of a plot whose columns
//     are all different heights anyway, and nothing a reader misreads — the
//     height is the datum and the height is exact. The only repair that keeps
//     the shared axis is an inset x-domain in **both** plots, which would move
//     the price chart's first and last points off the frame's edges and make the
//     coverage edge stop somewhere other than where the window does. A real
//     change to a shipped chart, to round two columns.

export interface VolumeChartProps {
  /**
   * Everything this application knows about the series. **Taken whole and never
   * spread** (`FRONTEND-STATE.md` §1) — the same value the price chart is given
   * and the same value `ChartAxis` builds the window from, because two plots
   * reading two states is two charts.
   */
  readonly view: BarSeriesView;

  /**
   * The security, from the address.
   *
   * A prop rather than `view.series.symbol`, for the price chart's reason:
   * three of the six states carry no series, and the text alternative has to
   * name its subject in every state it can speak in.
   */
  readonly symbol: string;
}

export function VolumeChart({ view, symbol }: VolumeChartProps) {
  const { frame: time, report } = useChartAxis();
  const { chartRef, plotRef, plot } = usePlotBox(report, "volume");

  const id = useId().replace(/[^a-zA-Z0-9]/gu, "");
  const coveredId = `${id}-covered`;
  const plotId = `${id}-plot`;
  const alternativeId = `${id}-alt`;

  // The shared width, this plot's own height — see `PriceChart.tsx` for why the
  // width comes from the frame rather than from this component's measurement.
  const box = { width: time.width, height: plot.height };
  const volume = volumeFrame(time, plot.height, chartSubject(view)?.bars ?? []);
  const ticks = volumeTicks(time);
  const alternative = volumeAlternative(view, symbol);

  const clipToCovered =
    time.coverage.uncovered.length > 0 && time.coverage.covered !== null
      ? `url(#${coveredId})`
      : undefined;

  // `refused` and `failed` carry no window, so there is nothing here to be a
  // picture of — the same answer the price chart gives, from the same function,
  // because a volume frame under an absent price frame is half an instrument.
  if (!drawsAFrame(view)) return null;

  return (
    <div
      className={cx(
        styles.chart,
        time.density.compact ? styles.compact : undefined,
      )}
      ref={chartRef}
    >
      <div className={styles.plot} ref={plotRef}>
        {/*
         * `aria-hidden`, and `focusable="false"` for the one engine that still
         * puts an SVG in the tab order. What a listener gets instead is the
         * paragraph below, which states the peak, when it happened and how much
         * of the frame is covered — the facts the picture carries and an
         * abbreviated number in a gutter does not.
         */}
        <svg
          className={styles.canvas}
          width={box.width}
          height={box.height}
          aria-hidden="true"
          focusable="false"
        >
          {/*
           * **The uncovered ground, painted in this plot rather than inherited
           * from the one above** (§13.1). It is a statement about a *frame*, and
           * there are two frames — a wash drawn once across both regions would
           * have to cross a panel boundary and a heading.
           *
           * First, under everything: a mark derived from the window runs the
           * full frame, and a seam that stopped at the coverage edge would be
           * the frame shrinking to the data.
           */}
          {time.coverage.uncovered.map((span) => (
            <rect
              className={styles.uncovered}
              height={box.height}
              key={span.from}
              width={span.to - span.from}
              x={span.from}
              y={0}
            />
          ))}
          <defs>
            {/*
             * The plot's own box. Not the coverage clip — this one always
             * applies, and it is what keeps the half of an end column that sits
             * outside the frame from being painted into the panel beside it.
             */}
            <clipPath id={plotId}>
              <rect height={box.height} width={box.width} x={0} y={0} />
            </clipPath>
            {time.coverage.covered !== null &&
              time.coverage.uncovered.length > 0 && (
                <clipPath id={coveredId}>
                  <rect
                    height={box.height}
                    width={
                      time.coverage.covered.to - time.coverage.covered.from
                    }
                    x={time.coverage.covered.from}
                    y={0}
                  />
                </clipPath>
              )}
          </defs>
          <g shapeRendering="crispEdges">
            {time.seams.map((x) => (
              <line
                className={styles.seam}
                key={x}
                x1={x}
                x2={x}
                y1={0}
                y2={box.height}
              />
            ))}
            {time.coverage.edges.map((x) => (
              <line
                className={styles.coverageEdge}
                key={x}
                x1={x}
                x2={x}
                y1={0}
                y2={box.height}
              />
            ))}
          </g>
          {/*
           * **One path, whatever the window** — 30 bars or 9,750. `CHARTING.md`
           * §1 forbids the obvious implementation outright: one `<rect>` per bar
           * at the cap is 9,790 plot elements and five main-thread tasks of
           * 137–254 ms, against `PRODUCT_SPEC.md` §28's 50 ms.
           *
           * Two clips, on two elements, because an element takes one
           * `clip-path`: the group clips to the plot and the path clips to the
           * covered span. Only the columns stop at the coverage edge — the
           * baseline they grow from is the axis rule, which is derived from the
           * window and runs the full frame.
           */}
          {volume.columns !== null && (
            <g clipPath={`url(#${plotId})`}>
              <path
                className={styles.columns}
                clipPath={clipToCovered}
                d={volume.columns}
                strokeWidth={volume.columnWidth}
              />
            </g>
          )}
        </svg>
      </div>

      {alternative !== null && (
        <p className={styles.visuallyHidden} id={alternativeId}>
          {alternative}
        </p>
      )}

      {/*
       * **One label, top-aligned**, and hidden from the accessibility tree for
       * the price scale's reason: it is a label *on a picture*, abbreviated to
       * three significant figures, and read aloud between a heading and a
       * paragraph it is a bare number with no subject. The paragraph above
       * states the same figure as a magnitude word and says what it is of.
       */}
      <div aria-hidden="true" className={styles.gutter}>
        {volume.peak !== null && (
          <span className={styles.peakLabel}>{volume.peak}</span>
        )}
      </div>

      {/*
       * Two dates and no times (§9.4). Enough to anchor a plot that at one
       * column is read a screen away from the price chart, and visibly less
       * chrome than the six labels above it.
       */}
      <div aria-hidden="true" className={styles.axis}>
        {ticks.map((tick) => (
          <span
            className={cx(
              styles.timeLabel,
              tick.kind === "session" ? styles.sessionLabel : undefined,
              tick.x === 0 ? styles.firstLabel : undefined,
            )}
            key={`${tick.kind}-${String(tick.x)}`}
            style={{ left: `${String(tick.x)}px` }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      {/*
       * **The reading layer, a sibling for the price chart's reason** (Task
       * 2.13.5).
       *
       * It draws this plot's crosshair and the strip under its axis, and it
       * holds none of the state: the read position lives in `ChartAxis`, in a
       * context **this component does not consume**. That is the whole of the
       * repair — a pointer move re-renders the two overlays and neither frame
       * owner, so nothing rebuilds a 726-stem silhouette to move one vertical
       * rule. `chart-reading-context.ts` carries the argument, and
       * `PriceChart.test.tsx` counts all three frame builders across forty
       * arrow presses with both plots on screen rather than trusting it.
       */}
      <VolumeReading
        peakBar={volume.peakBar}
        plot={box}
        readings={volume.readings}
        slots={time.slots}
        timeframe={time.axis?.timeframe ?? null}
      />
    </div>
  );
}
