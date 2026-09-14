import { useId } from "react";

import { cx } from "../../cx.js";
import type { BarSeriesView } from "../../market/index.js";
import { useChartAxis } from "./chart-axis-context.js";
import { chartAlternative } from "./chart-alternative.js";
import { priceFrame } from "./chart-geometry.js";
import { chartSubject, drawsAFrame } from "./chart-subject.js";
import { usePlotBox } from "./use-plot-box.js";
import { ChartReading } from "./ChartReading.js";
import { ChartPending } from "./ChartPending.js";
import { ChartVacancy } from "./ChartVacancy.js";
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
// ## Direction, and the reason it is not a colour (Task 2.12.5)
//
// A dashed rule sits at the price the window opened at, and the area between it
// and the close line is filled. **The side of the rule the line finishes on is
// the direction**; the tint says the same thing again and says nothing new. That
// ordering is forced rather than chosen: `VISUAL-LANGUAGE.md` measured
// `--price-positive-wash` against `--price-negative-wash` at **1.009:1 under
// `grayscale(1)`**, so washed back to a fill the two are the same colour. Cover
// the tint entirely and this chart still says which way the window went.
//
// Two consequences are structural here rather than remembered:
//
//  - **The rule and the fill are one value.** `chart-geometry.ts` returns a
//    `DirectionalArea` carrying both, so a render with the tint and no geometry
//    under it is unrepresentable.
//  - **The tint is a function of position, not of the window.** The area is one
//    path drawn twice, clipped above and below the rule: green where the line
//    is above the price it opened at, red where it is below. So the hue repeats
//    *exactly* what survives the hue being removed, at every point rather than
//    only at the end.
//
// **That split is a 2026-09-12 revision and the first version was wrong.** The
// whole area originally took one tint chosen by where the line finished, which
// painted a window that dipped and recovered **green throughout** — the hue
// contradicting the geometry everywhere the line was under the rule. One fact
// painted over regions that locally disagreed with it. `CHARTING.md` §12.6
// carries the argument, and it cost `--price-unchanged-wash` its consumer: a
// split has no neutral state, because every point is above or below.
//
// **The high–low extent band is decided and is not drawn**, which is a stated
// decision rather than an absence — `CHARTING.md` §12 carries the measurement.
// At `1m` a bar's high and low sit within a few hundredths of a percent of its
// close, so the envelope is a hairline around the line at every window this
// story serves. It earns its space at `1d`, which Story 2.13's window control is
// what brings, and `CHARTING.md` §5 keeps High and Low as *stated facts*
// underneath in the meantime.
//
// ## Every state drawn, and the one rule that decides them (Task 2.12.7)
//
// **A mark derived from the window runs the full frame; a mark derived from the
// bars stops at the coverage edge.** The axis rule, the gridlines, the seams and
// every tick label come from the window that was *asked for* — the reader asked
// for it, and a frame that shrank to the data would be §6.2's defect. The line,
// the two washes and the reference rule describe bars, so one `clipPath` takes
// all three.
//
// That gives four of the six states their whole treatment, from one number:
//
//  - **`loading`** — a real scale with nothing written on it, and **no wash**.
//    Nothing is known to be missing before anything has been answered.
//  - **`loaded`** — the covered span is the frame, so there is no edge to draw.
//  - **`partial`** — the ordinary case here, and the one this task exists for.
//  - **`empty`** — coverage zero, which is one uncovered span across the whole
//    plot. Not a fourth treatment: it is this one at its limit, and it is what
//    tells the state apart from `loading` at a glance.
//
// **`refused` and `failed` still draw nothing at all, and that was reviewed
// rather than inherited.** The argument is structural: neither member carries a
// series, so neither carries a requested window, and a frame under either would
// have to *invent* one to be a picture of. The case for drawing one — that it
// holds the region's height so the page below does not jump when a retry
// succeeds — is real and is paid elsewhere, by the sentence, its detail and the
// retry occupying the region.
//
// **And a stale answer looks exactly like a fresh one.** No dim, no blur, no
// fade, no second style: `FRONTEND-STATE.md` §2's rule, and declining it here
// keeps that rule's stated reversal trigger — *a chart that redraws a held
// series in a second style* — unfired. The mark's subject is the answer as a
// whole, and `BarSeriesPanel`'s dashed rail already sits above all of it.
//
// One thing that looks like this component's job and is not:
//
//  - **The crosshair, the readout and the keyboard path to a point.** Task
//    2.12.6's, and it landed on 2026-09-12 as `ChartReading` — a *sibling*
//    rather than a change to this component. The base SVG below is still
//    `aria-hidden` with no interaction on it; what a person reaches is an
//    overlay in the same grid cell, which is what keeps a pointer move from
//    re-rendering this component and recomputing the frame. Task 2.12.8 still
//    owns the text alternative that says something a picture-reader would want.
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
   * **Is a slow answer in flight?** (2026-09-14, §80.) `false` by default, which
   * is what every story and every settled screen wants.
   *
   * A boolean rather than a state member, because it is not one: the wait is a
   * property of *how long* a request has taken, and `BarSeriesView` is a total
   * answer to *what came back*. `BarSeriesScreen.pending` is where it is decided;
   * this prop is that value arriving.
   */
  readonly pending?: boolean;

  /**
   * Everything this application knows about the series. **Taken whole and
   * never spread** (`FRONTEND-STATE.md` §1).
   *
   * A component receives the state and renders the member it is given. Spread
   * into props, the six-member union becomes sixteen impossible combinations
   * and the exhaustive `switch` that catches a seventh member stops existing.
   */
  readonly view: BarSeriesView;

  /**
   * The security, from the address (Task 2.12.6).
   *
   * A prop rather than `view.series.symbol`, for `BarSeriesPanel`'s reason:
   * three of the six states carry no series, and the reading's live region has
   * to name its subject in every state it can speak in. It is only ever used by
   * the reading layer — the picture itself says nothing about what it is of,
   * which is Task 2.12.8's to change.
   */
  readonly symbol: string;
}

export function PriceChart({ view, symbol, pending = false }: PriceChartProps) {
  // **The axis comes from above and the height from this element** (Task
  // 2.13.4). Every mark whose x this component draws is the same value the
  // volume plot draws its columns at, because both read one `TimeFrame` — which
  // is `VOLUME-AND-WINDOW.md` §13.1's "two plots stop at the same pixel" made
  // arithmetic rather than coincidence.
  const { frame: time, report } = useChartAxis();
  const { chartRef, plotRef, plot } = usePlotBox(report, "price");

  // The box the marks are drawn in: **the shared width, this plot's own
  // height.** Taking the width from the frame rather than from the measurement
  // is the load-bearing half — two equal-width elements measured a frame apart
  // are two different numbers for one render, and a chart that is one pixel out
  // for one frame on every resize is exactly the defect nothing below a browser
  // can see.
  const box = { width: time.width, height: plot.height };
  const density = time.density;
  const subject = chartSubject(view);
  const frame = {
    ...time,
    ...priceFrame(time, plot.height, subject?.bars ?? []),
  };

  // Four document-unique ids: the fill's definition, its two clips, and the
  // coverage clip Task 2.12.7 added.
  //
  // **Stripped to alphanumerics**, which is not decoration: `useId` returns a
  // value wrapped in delimiters that differ by React major — colons in 18,
  // guillemets in 19 — and both land inside `url(#…)`, where a non-ASCII or
  // punctuation-bearing fragment is at best engine-dependent. Deriving a safe
  // id from it keeps the uniqueness React guarantees without depending on the
  // shape of what it returns. No test asserts these, which is `CLAUDE.md`'s
  // rule about `useId` and the reason it is there.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const areaId = `${id}-area`;
  const aboveId = `${id}-above`;
  const belowId = `${id}-below`;
  const coveredId = `${id}-covered`;

  // The text alternative's own id, which is what makes one string reachable two
  // ways: the paragraph a document reader meets where the picture is, and the
  // description the reading layer's `role="img"` points at. `chart-alternative.ts`
  // carries the argument for both halves.
  const alternativeId = `${id}-alt`;

  // **The clip that holds this task's one rule** — everything derived from bars
  // stops at the coverage edge. `undefined` rather than a clip over the whole
  // plot when there is nothing to clip against, so a complete answer carries no
  // extra element and `pnpm e2e`'s element count stays about the chart rather
  // than about a state it is not in.
  const clipToCovered =
    frame.coverage.uncovered.length > 0 && frame.coverage.covered !== null
      ? `url(#${coveredId})`
      : undefined;

  const alternative = chartAlternative(view, symbol, pending);

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
         * promise Task 2.12.4 had not earned.
         *
         * **Task 2.12.8 confirmed it rather than reversing it**, and where the
         * description went instead is the paragraph below: the picture already
         * has an element in the tree — the reading layer's own `role="img"`,
         * which is focusable because reading a point is a thing a person does —
         * so what was missing was never a role, it was a description. Two
         * elements claiming to be the same image would have been the
         * two-surfaces-one-sentence defect with a role on it.
         */}
        <svg
          className={styles.canvas}
          width={box.width}
          height={box.height}
          aria-hidden="true"
          focusable="false"
        >
          {/*
           * `crispEdges` on the chrome and not on the series: a hairline at a
           * fractional y renders as two grey pixels, which reads as a heavier
           * rule rather than as a sharper one. The line keeps its antialiasing,
           * because a 1.5px stroke over 1,950 points is where it is doing work.
           */}
          {/*
           * **The wash is the first thing drawn and the last thing that
           * matters.** Under the gridlines deliberately: the grid drops from
           * 1.27:1 to 1.11:1 where a fill passes beneath it, which is the one
           * cost `tokens.css` accepts here, and the repair if it is ever needed
           * is a darker grid rather than a paler wash. Over the ground, under
           * everything with a meaning.
           *
           * **One path, referenced twice.** The area is defined once and drawn
           * through two `<use>` elements clipped above and below the reference
           * rule, which is what makes the split cost two small elements rather
           * than a second copy of a 1,950-point string in the DOM. Defining it
           * as two geometrically-split paths would have been the obvious way
           * and would have doubled both the arithmetic and the parse — the one
           * part of this chart that is genuinely linear in the bar count.
           *
           * The `<use>` carries the class and the `<path>` in `<defs>` sets no
           * fill of its own, so the ink inherits into the cloned content. A
           * `<path>` with no fill at all would render **black**, not invisible —
           * which is the opposite of the `--marker-color` trap and is why the
           * browser spec reads three channels rather than asking whether it is
           * painted.
           */}
          {/*
           * **The uncovered ground, and it is the first thing painted** (Task
           * 2.12.7). Under the wash, under the grid, under everything: it is a
           * statement about the *frame* rather than about any mark on it, and a
           * gridline that stopped at the coverage edge would be the frame
           * shrinking to the data, which is the defect §6.2 exists to prevent.
           *
           * Zero of these on a complete answer, one on the ordinary short one,
           * two where the store is missing the start as well, and one across
           * the whole plot for an `empty` answer — which is the state's entire
           * drawn content and the thing that tells it apart from `loading`.
           */}
          {frame.coverage.uncovered.map((span) => (
            <rect
              className={styles.uncovered}
              height={box.height}
              key={span.from}
              width={span.to - span.from}
              x={span.from}
              y={0}
            />
          ))}
          {frame.coverage.covered !== null &&
            frame.coverage.uncovered.length > 0 && (
              <defs>
                <clipPath id={coveredId}>
                  <rect
                    height={box.height}
                    width={
                      frame.coverage.covered.to - frame.coverage.covered.from
                    }
                    x={frame.coverage.covered.from}
                    y={0}
                  />
                </clipPath>
              </defs>
            )}
          {frame.direction !== null && (
            <>
              <defs>
                <path d={frame.direction.fill} id={areaId} />
                <clipPath id={aboveId}>
                  <rect
                    height={frame.direction.reference}
                    width={box.width}
                    x={0}
                    y={0}
                  />
                </clipPath>
                <clipPath id={belowId}>
                  <rect
                    height={box.height - frame.direction.reference}
                    width={box.width}
                    x={0}
                    y={frame.direction.reference}
                  />
                </clipPath>
              </defs>
              {/*
               * A `<g>` around the pair rather than a second `clipPath` on each
               * `<use>`: an element takes one `clip-path`, and these two already
               * spend theirs on the split at the reference rule. The group is
               * where the coverage clip goes, which is also the honest shape —
               * the wash is one statement about the held bars and is clipped
               * once.
               */}
              <g clipPath={clipToCovered}>
                <use
                  className={styles.washAbove}
                  clipPath={`url(#${aboveId})`}
                  href={`#${areaId}`}
                />
                <use
                  className={styles.washBelow}
                  clipPath={`url(#${belowId})`}
                  href={`#${areaId}`}
                />
              </g>
            </>
          )}
          <g shapeRendering="crispEdges">
            {frame.gridlines.map((gridline) => (
              <line
                className={styles.gridline}
                key={gridline.y}
                x1={0}
                x2={box.width}
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
                y2={box.height}
              />
            ))}
            {/*
             * The reference rule — the price the window opened at, and the
             * datum the whole direction reading is taken against. Drawn over
             * the grid and under the series: it is louder than a gridline
             * because it carries more, and quieter than the data it is a
             * baseline for.
             */}
            {/*
             * **Clipped since Task 2.12.7, and that was the open question.** It
             * ran the full plot width when it shipped, because there was
             * nothing to stop at. It is a statement about the bars — the price
             * the first one we hold opened at — so it stops where they do.
             *
             * Three things decided it, and the third is the one that closed it:
             * the rule is the loudest mark on the plot at 4.48:1 and the
             * uncovered wash is the quietest at 1.107:1, so an unclipped rule
             * puts the loudest mark inside the quietest region; the line and
             * the wash already stop at the edge, so a rule that did not would
             * be a third convention for one boundary; and the argument for
             * keeping it — that it carries the seam where the two washes meet —
             * is vacuous, because the washes exist only where the bars do,
             * which is the side of the edge the rule survives on.
             */}
            {frame.direction !== null && (
              <line
                className={styles.reference}
                clipPath={clipToCovered}
                x1={0}
                x2={box.width}
                y1={frame.direction.reference}
                y2={frame.direction.reference}
              />
            )}
            {/*
             * The coverage edge, **last in this group so it is over the seam**.
             * The two coincide most of the time rather than rarely: a store
             * caught up to a previous session's close stops exactly on a session
             * boundary, which is precisely where a seam is drawn. They are told
             * apart by ink and rhythm — 4.05:1 and `6 3` against the seam's
             * 1.54:1 and `3 3` — and what actually carries the boundary is
             * neither dash but the ground changing behind it.
             */}
            {frame.coverage.edges.map((x) => (
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
          {frame.series !== null && (
            <path
              className={styles.series}
              clipPath={clipToCovered}
              d={frame.series}
            />
          )}
        </svg>

        {/*
         * **Why the frame is empty, on the frame** (2026-09-14).
         *
         * The condition is geometric rather than a branch on the state, which
         * keeps §14.1's one rule intact: `coverage.covered === null` with a span
         * of uncovered ground across the whole plot is coverage zero, and the
         * same pair with *no* uncovered span at all is `loading` — nothing is
         * yet known to be missing, which is a different value from all of it
         * missing rather than the same absence. Neither is a state name read
         * here.
         *
         * A sibling of the `<svg>` and not a child of it: `ChartVacancy`'s
         * header carries the three reasons, and the shortest is that SVG text
         * does not wrap.
         */}
        {/*
         * **A wait that has gone on long enough to be worth showing** (§80).
         *
         * Over whatever frame is already here, rather than instead of it: the
         * held chart, the loading scale, an empty answer's wash. The panel above
         * is untouched, so the figures stay at full ink and the plot does not
         * move — which is the reserved rail slot's own rule (2026-09-13) surviving
         * a change that could easily have broken it.
         *
         * `pending` is false for the whole of an ordinary window change, so this
         * is the slow case by construction.
         */}
        {pending && <ChartPending />}

        {subject !== null &&
          frame.coverage.covered === null &&
          frame.coverage.uncovered.length > 0 && (
            <ChartVacancy
              compact={density.compact}
              requested={subject.requested}
              subject="bars"
            />
          )}
      </div>

      {/*
       * The value scale, on the **right**, because right is where the latest
       * price is: the last point of the line, the current-value reading above
       * and the scale all land in the same place. Labels drawn inside the plot
       * were tried on the canvas and abandoned — at the measured 1,019px region
       * the topmost one sat on the series.
       */}
      {/*
       * **The text alternative, in the picture's own place in reading order**
       * (Task 2.12.8).
       *
       * A sibling rather than a `role="img"` name on the `<svg>` above, and the
       * argument for that shape — including the answer to the objection against
       * it — is in `chart-alternative.ts`. Two things about it are structural
       * rather than stylistic: it is **not** a live region, because the rate
       * this page announces at was settled by Task 2.12.6 and a fourth polite
       * region driven by a request landing would be queued against the panel's
       * own; and it is rendered in every state that draws a frame, so `empty`
       * and `loading` say what they are rather than reading as a chart that
       * failed to load.
       */}
      {alternative !== null && (
        <p className={styles.visuallyHidden} id={alternativeId}>
          {alternative}
        </p>
      )}

      {/*
       * **The value scale and the time axis are hidden from the accessibility
       * tree, deliberately** (Task 2.12.8).
       *
       * They are labels *on a picture* rather than facts: both are sampled and
       * niced, so the scale has no tick at the true high and six labels across
       * 1,950 bars have none at the first instant — `CHARTING.md` §5's
       * distinction between drawing a fact and stating one. Read aloud in
       * document order they are a dozen bare numbers and times with no subject
       * between them, immediately before a paragraph that states the same range
       * in words and a facts block that states every figure exactly.
       *
       * Nothing is lost by hiding them, and that is the test this decision had
       * to pass rather than a claim about noise: the alternative carries the
       * window and the high and the low, and `BarSeriesPanel` carries the four
       * prices, both windows and the bar count. What goes is the sampling.
       */}
      <div aria-hidden="true" className={styles.gutter}>
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
      <div aria-hidden="true" className={styles.axis}>
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

      {/*
       * **The reading layer, and it is a sibling rather than a branch of this
       * component** (Task 2.12.6).
       *
       * It renders the crosshair over the plot and the readout strip under the
       * axis, and it holds the one piece of state that changes on every pointer
       * move. That is the whole point: Task 2.12.4's amendment left
       * `chartFrame` unmemoised and this task is what would have made that a
       * defect — a crosshair re-rendering the frame's owner rebuilds the axis,
       * re-walks the trading calendar and rebuilds a 1,950-point path string to
       * move one vertical rule. With the state one level down, this component
       * does not render at all while somebody reads the chart.
       */}
      <ChartReading
        describedBy={alternative === null ? undefined : alternativeId}
        plot={box}
        readings={frame.readings}
        slots={frame.slots}
        symbol={symbol}
        // **Off the shared axis and not off this component's own view** (Task
        // 2.13.6). The axis is the one thing that knows what a slot is, and the
        // strip's instant has to agree with the tick labels above it: at `1d`
        // both stop printing times of day in the same render.
        timeframe={time.axis?.timeframe ?? null}
      />
    </div>
  );
}
