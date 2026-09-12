import type { Bar, Timeframe, TimeRange } from "@marketpulse/shared";

import type {
  ChartDensity,
  LinearScale,
  SlotScale,
} from "../../market/index.js";
import {
  linearScale,
  placeBars,
  priceDomain,
  scaleSlot,
  scaleValue,
  seamSlots,
  slotScale,
  timeAxis,
  timeTicks,
  valueTicks,
} from "../../market/index.js";

// **What to draw, in pixels, as plain data** (Task 2.12.4).
//
// `src/market/` owns the arithmetic — scales, domains, ticks and the market gap
// — and this file is the one step after it: it turns a plot box and a series
// into the handful of numbers an SVG element needs, and it knows nothing about
// React or the DOM.
//
// ## Why the split is here rather than inside the component
//
// Three reasons, and the third is the one that decided it.
//
//  1. **`CHARTING.md` §1 chose hand-built SVG**, so there is no library
//     boundary to put the seam at. Without one, a component that computed its
//     own coordinates inline would be a renderer with its arithmetic scattered
//     through JSX, which is the shape that cannot be tested.
//  2. **Epic 11 opens charts from an agent command.** The task brief asks for
//     props that are *a declarative description of what to draw*; this type is
//     that description one level further down, and it is what makes the
//     component a renderer of a value rather than a procedure.
//  3. **Nothing below `pnpm e2e` computes a layout.** jsdom applies no
//     stylesheet and has no `ResizeObserver`, so a component test cannot see a
//     single coordinate this file produces. Acceptance criterion 1 —
//     *the series is verified against the stored bars rather than by eye* — is
//     therefore only checkable at this level, and `chart-geometry.test.ts`
//     checks it against the **recorded** response body rather than against a
//     hand-written series.
//
// ## The rule this file exists to hold
//
// **The x-domain comes from `coverage.requested`, never from the bars**
// (`CHARTING.md` §6.2). It is one argument to one call — `timeAxis(requested,
// timeframe)` — and getting it wrong is invisible: a `partial` answer whose
// axis came from its own bars rescales to fill the frame and *looks complete*.
// No error, nothing red, and no test below `pnpm e2e` able to see it. The
// signature below makes the window a separate parameter from the bars so the
// two cannot be confused at a call site.

/** The plot's own box, measured from the laid-out element. */
export interface PlotBox {
  /** Pixels across, **excluding the value gutter** — see {@link chartFrame}. */
  readonly width: number;
  readonly height: number;
}

/** A horizontal gridline, and what the value gutter writes beside it. */
export interface GridLine {
  readonly y: number;
  /**
   * The price, already through this product's one price spelling — or `null`
   * when there is no domain yet.
   *
   * A gridline with no label is the frame-first rule in one field: the plot's
   * height, its rule and its gridlines are computable from the box alone, and
   * **only the labels need data**. So a chart waiting for its first answer
   * draws a real scale with nothing written on it rather than an empty box.
   */
  readonly label: string | null;
}

/** A labelled position under the time axis. */
export interface TimeLabel {
  readonly x: number;
  readonly label: string;
  /** A session's first slot carries the date; everything between carries a time. */
  readonly kind: "session" | "time";
}

/** Everything an SVG needs, and nothing about how it is drawn. */
export interface ChartFrame {
  readonly gridlines: readonly GridLine[];
  /** Session boundaries, in pixels. The only vertical rules this chart draws. */
  readonly seams: readonly number[];
  readonly ticks: readonly TimeLabel[];
  /**
   * The close line as an SVG path, or `null` when there is nothing to draw.
   *
   * A string rather than a list of points because a path is what the element
   * takes and building it here keeps one spelling of the coordinate order.
   */
  readonly series: string | null;
}

/**
 * What the chart is about, which is **a window and the bars that fell in it**
 * rather than just the bars.
 *
 * `bars` may be empty: an `empty` answer is a 200 with a real window in it, and
 * the honest drawing of one is a correct, labelled axis with no line on it.
 */
export interface ChartSubject {
  readonly requested: TimeRange;
  readonly timeframe: Timeframe;
  readonly bars: readonly Bar[];
}

/**
 * The frame, the scale and the line — for a plot box of a given size.
 *
 * **`plot.width` excludes the value gutter.** `CHARTING.md`'s §10 amendment is
 * emphatic that the gutter is an input to the horizontal range rather than
 * padding applied afterwards, because a scale built against the whole region
 * draws a line that runs under its own labels. Here that is structural instead
 * of remembered: the caller measures the plot element, and the gutter is a
 * sibling column that element never contains.
 *
 * A zero-sized box answers with an **empty frame rather than a throw**. An
 * element reports zero before it has been laid out, and `linearScale` refuses a
 * zero-width range on purpose — so the check belongs here, once, rather than at
 * the one call site that would otherwise take the region's error boundary down
 * on its own first paint.
 *
 * `subject` is `null` before the first answer arrives. That is the frame-first
 * rule (`PRODUCT_SPEC.md` §28, and the task brief's own bullet): the scale, the
 * gridlines and the rule are drawn from the box, and the data fills in labels
 * and a line.
 */
export function chartFrame(
  plot: PlotBox,
  density: ChartDensity,
  subject: ChartSubject | null,
): ChartFrame {
  if (!(plot.width > 0) || !(plot.height > 0)) return EMPTY_FRAME;

  if (subject === null) {
    return { ...EMPTY_FRAME, gridlines: unscaledGridlines(plot, density) };
  }

  const axis = timeAxis(subject.requested, subject.timeframe);
  const x = slotScale(axis.slots, [0, plot.width]);

  const seams = seamSlots(axis).map((slot) => round(scaleSlot(x, slot)));
  const ticks = timeTicks(axis, density).map((tick) => ({
    x: round(scaleSlot(x, tick.slot)),
    label: tick.label,
    kind: tick.kind,
  }));

  const [first, ...rest] = subject.bars;

  // No bars is a real answer rather than a missing one, and it is what CI's
  // store returns for every window: `verify.yml` runs the migrations and the
  // universe loader and never a backfill. A labelled axis with no line on it is
  // the honest picture of *we asked for this window and hold nothing in it*.
  if (first === undefined) {
    return {
      gridlines: unscaledGridlines(plot, density),
      seams,
      ticks,
      series: null,
    };
  }

  const domain = priceDomain([first, ...rest]);
  // `[height, 0]` and not `[0, height]`: SVG's y grows downwards, so the
  // domain's high belongs at pixel zero. `chart-scale.ts` takes the inversion
  // as an input for exactly this reason, so that no renderer spells
  // `height - y` anywhere.
  const y = linearScale(domain, [plot.height, 0]);

  return {
    gridlines: valueTicks(domain, density.valueTicks).map((tick) => ({
      y: round(scaleValue(y, tick.value)),
      label: tick.label,
    })),
    seams,
    ticks,
    series: linePath(placeBars(axis, subject.bars), x, y),
  };
}

const EMPTY_FRAME: ChartFrame = {
  gridlines: [],
  seams: [],
  ticks: [],
  series: null,
};

/**
 * Gridlines at even fractions of the plot, with nothing written on them.
 *
 * Used before there is a domain to nice — which is both the loading state and
 * the `empty` answer. They are spaced so that none lands on the baseline or on
 * the top edge: a gridline sitting exactly on the axis rule would read as a
 * thicker rule, and one at the top would read as the closed frame this language
 * refuses.
 */
function unscaledGridlines(
  plot: PlotBox,
  density: ChartDensity,
): readonly GridLine[] {
  const lines: GridLine[] = [];

  for (let index = 1; index <= density.valueTicks; index += 1) {
    lines.push({
      y: round((plot.height * index) / (density.valueTicks + 1)),
      label: null,
    });
  }

  return lines;
}

/**
 * The close line.
 *
 * **A move to the first point and a line to every other**, in slot order, which
 * `placeBars` already guarantees because the bars arrive in it. A bar the axis
 * has no slot for was dropped there rather than here — see `placeBars` for why
 * a stray point at the left-hand edge is the alternative.
 *
 * Returns `null` for a single point as well as for none: a one-bar window is a
 * real request and an SVG path of one point draws **nothing at all**, which
 * would be a silently empty plot rather than a visible answer. The dot that
 * case deserves is the crosshair's disc, and that is Task 2.12.6's.
 */
function linePath(
  placed: readonly { readonly bar: Bar; readonly slot: number }[],
  x: SlotScale,
  y: LinearScale,
): string | null {
  if (placed.length < 2) return null;

  return placed
    .map(({ bar, slot }, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${String(round(scaleSlot(x, slot)))} ${String(round(scaleValue(y, bar.close)))}`;
    })
    .join(" ");
}

/**
 * One decimal place.
 *
 * A tenth of a CSS pixel is below a device pixel on every display this product
 * runs on, so nothing visible is lost — and at the default window the path
 * carries 1,950 points, where full floating-point coordinates are tens of
 * kilobytes of string that the browser parses on the main thread against
 * `PRODUCT_SPEC.md` §28's 50 ms budget. Task 2.12.9 measures what that budget
 * actually goes on; this is the part that was free.
 */
function round(pixel: number): number {
  return Math.round(pixel * 10) / 10;
}
