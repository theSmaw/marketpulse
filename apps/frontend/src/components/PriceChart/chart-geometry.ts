import type { Bar, Timeframe, TimeRange } from "@marketpulse/shared";

import type {
  ChartDensity,
  LinearScale,
  PriceDirection,
  SlotScale,
} from "../../market/index.js";
import {
  directionOf,
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
//
// ## What Task 2.12.5 added, and the one rule it holds
//
// **The reference rule and the directional wash are one value**
// ({@link DirectionalArea}), not two fields a caller assembles. That is the
// whole of `VISUAL-LANGUAGE.md`'s ordering made structural: the geometry — which
// side of the rule the line finishes on — is the first channel, and the tint is
// the second. A component able to render the fill without the rule would have
// shipped a chart whose direction is carried by **1.009:1 under
// `grayscale(1)`**, which is to say by nothing. Here it cannot: the rule's `y`,
// the fill's path and the direction the wash is named for arrive together or not
// at all.

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
  /**
   * What this window did — the dashed rule, the area under it, and which of the
   * three directions the pair is tinted for.
   *
   * `null` wherever there is no line to be on one side of a rule: no bars, a
   * single bar, or an opening price of zero.
   */
  readonly direction: DirectionalArea | null;
}

/**
 * **Direction, drawn as position first and as hue second** (Task 2.12.5).
 *
 * One value with three fields rather than three fields on {@link ChartFrame},
 * and that is the mechanism the task asked for rather than a grouping
 * preference. `VISUAL-LANGUAGE.md` measured the two washes at **1.009:1 under
 * `grayscale(1)`** — washed back to a fill, positive and negative are the same
 * colour — so a chart that drew the tint and not the rule would be a chart with
 * no direction on it at all, rendering perfectly and saying nothing. Bundling
 * them makes that state unrepresentable rather than discouraged.
 *
 * ## What Epic 8 does to this
 *
 * **It removes it.** One filled area cannot serve *n* series, so the wash is a
 * single-series treatment and is dropped the moment a comparison arrives
 * (`VISUAL-LANGUAGE.md`'s _Room reserved for what arrives later_; the second
 * channel there is stroke pattern, which survives greyscale where *n* hues do
 * not). It is derived below from `subject.bars` — the one series — and the type
 * that would carry a second one does not exist yet, deliberately: scaffolding
 * Epic 8's shape today would be inventing an API against a screen nobody has
 * drawn. What is owed instead is this paragraph, and the honest note in
 * `CHARTING.md` §12 that this consequence is recorded rather than enforced.
 */
export interface DirectionalArea {
  /** The dashed rule's y, in pixels — the price the window opened at. */
  readonly reference: number;
  /**
   * The closed area between the close line and the rule, as an SVG path.
   *
   * Built by **appending two segments and a close to the line's own `d`**
   * rather than by walking the bars a second time. At the default window that
   * is 1,950 points already in a string; re-deriving them would double both the
   * arithmetic and the main-thread parse that `PRODUCT_SPEC.md` §28's 50 ms
   * budget is spent on, for a path that is the same line with a lid on it.
   */
  readonly fill: string;
  /**
   * Which of the three the window was, for the wash's ink.
   *
   * From {@link directionOf} on the same percentage `series-facts.ts` computes
   * for the reading above the plot — **the same subject and the same rounding**,
   * so the tint, the glyph, the sign and the spoken word cannot disagree about
   * which way this window went. Two channels disagreeing is worse than either
   * being wrong alone.
   */
  readonly direction: PriceDirection;
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
      direction: null,
    };
  }

  const domain = priceDomain([first, ...rest]);
  // `[height, 0]` and not `[0, height]`: SVG's y grows downwards, so the
  // domain's high belongs at pixel zero. `chart-scale.ts` takes the inversion
  // as an input for exactly this reason, so that no renderer spells
  // `height - y` anywhere.
  const y = linearScale(domain, [plot.height, 0]);

  const placed = placeBars(axis, subject.bars);
  const series = linePath(placed, x, y);

  return {
    gridlines: valueTicks(domain, density.valueTicks).map((tick) => ({
      y: round(scaleValue(y, tick.value)),
      label: tick.label,
    })),
    seams,
    ticks,
    series,
    direction: directionalArea(placed, series, x, y),
  };
}

const EMPTY_FRAME: ChartFrame = {
  gridlines: [],
  seams: [],
  ticks: [],
  series: null,
  direction: null,
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
 * The dashed rule, the area between it and the line, and the window's direction.
 *
 * ## Which price the rule sits at, which is the question this task was handed
 *
 * **The first bar we hold, and its `open`.** Task 2.12.2 settled the rule's
 * position as "the window's opening close", and that phrase has one meaning
 * while the answer is `loaded` and two while it is `partial` — which is the
 * normal case on this screen. The window that was *asked for* and the window
 * that is *covered* are different ranges, and there may be no bar at the
 * requested window's opening instant at all: a store part-way through a
 * backfill, a security listed mid-window, or a gap at the open all separate
 * them. So the literal reading names nothing, and it was taken deliberately
 * rather than inherited:
 *
 *  - **The first bar we hold** keeps the rule *on the line*, always, so the
 *    reading — *the side of the rule the line finishes on* — always works. It
 *    measures the change across what is actually drawn.
 *  - **The requested window's opening instant** is faithful to the axis and, on
 *    a short answer, floats the rule at a price nobody observed or suppresses it
 *    entirely. A direction channel that disappears exactly when coverage is
 *    short is not a channel.
 *
 * And the `open` rather than the close, which is one turn further than the
 * question was asked. `series-facts.ts` computes the reading above the plot as
 * `(lastClose − firstOpen) / firstOpen`, and the design canvas names the stated
 * `Open` figure as *the same fact* the rule draws. Sitting the rule at the first
 * bar's **close** would put the picture and the figure a bar apart — invisible
 * at 1m in almost every window, and visible in exactly the one that matters: a
 * window whose first bar straddles its own final close reads as up in one
 * channel and down in the other. The same number, or the channels are not
 * repeating each other.
 *
 * It is always inside the frame and does not have to be clamped: `priceDomain`
 * is taken over the bars' `high` and `low`, and a bar's open lies between its
 * own two.
 *
 * ## When there is none
 *
 * `null` for fewer than two points — a one-bar window draws no line, so there is
 * nothing to be on one side of a rule — and for an opening price of **zero**,
 * which is not a price any equity has and is a corrupt bar rather than a
 * division to attempt. `series-facts.ts` declines the same case for the same
 * reason and renders no percentage; this renders no wash, and the two stay one
 * statement.
 */
function directionalArea(
  placed: readonly { readonly bar: Bar; readonly slot: number }[],
  series: string | null,
  x: SlotScale,
  y: LinearScale,
): DirectionalArea | null {
  const first = placed[0];
  const last = placed[placed.length - 1];
  if (series === null || first === undefined || last === undefined) return null;
  if (first.bar.open === 0) return null;

  const reference = round(scaleValue(y, first.bar.open));
  const change =
    ((last.bar.close - first.bar.open) / first.bar.open) * PER_CENT;

  return {
    reference,
    // Down the right-hand edge to the rule, back along it to the left, and
    // closed. The `Z` is a real segment rather than a formality: it runs from
    // the rule up or down to the line's first point, which is the first bar's
    // *close* while the rule is that same bar's *open*. At 1m that is a few
    // hundredths of a percent and invisible; spelling it as `Z` rather than as
    // a third segment is what keeps it honest at 1d, where it is a real
    // distance.
    fill:
      `${series} L${String(round(scaleSlot(x, last.slot)))} ${String(reference)}` +
      ` L${String(round(scaleSlot(x, first.slot)))} ${String(reference)} Z`,
    direction: directionOf(change),
  };
}

/** A ratio as a percentage, so the direction is decided on the figure a reader sees. */
const PER_CENT = 100;

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
