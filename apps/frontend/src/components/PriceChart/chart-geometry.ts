import type { Bar, Timeframe, TimeRange } from "@marketpulse/shared";

import type {
  ChartDensity,
  LinearScale,
  SlotScale,
  TimeAxis,
} from "../../market/index.js";
import {
  linearScale,
  placeBars,
  positionOfInstant,
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
// `grayscale(1)`**, which is to say by nothing. Here it cannot: the rule's `y`
// and the fill's path arrive together or not at all, and the renderer splits
// that one path at that one `y` to colour it.

// ## What Task 2.12.7 added, and the rule it holds
//
// **A mark derived from the window runs the full frame; a mark derived from the
// bars stops at the coverage edge.** That one sentence decides every state this
// chart has, and {@link ChartCoverage} is it as data: the axis rule, the
// gridlines, the seams and every tick come from `requested` and are computed
// above; the line, the two washes and the reference rule describe bars and are
// clipped to `coverage.covered`.
//
// The span is derived from **`coverage.covered` against the axis**, never from
// where the last bar happened to land, and the difference is not pedantry. A
// window whose final minute never traded would put the last bar short of the
// edge; taking the edge from the bars would then wash a sliver of a *complete*
// answer and say we are missing something we are not. It also makes
// `CHARTING.md` §10.1's finding fall out rather than needing a special case:
// the recorded `partial` fixture's shortfall is a Saturday, a session-ordinal
// axis gives Saturday no slots, and `positionOfInstant` therefore puts its
// covered end at the frame's own right-hand edge — no wash, no edge, correctly.

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
   * Every bar that has a place on the axis, with the pixel it was drawn at
   * (Task 2.12.6).
   *
   * **The crosshair's whole data model.** It is the placed bars — the ones
   * `placeBars` found a slot for — carrying the two coordinates
   * {@link linePath} already computed for them, so the reading and the mark are
   * the same arithmetic rather than two spellings of it.
   *
   * Empty wherever there is nothing to read: an unmeasured box, a state with no
   * window, or an `empty` answer. A crosshair over one of those is a *state*,
   * and every state is Task 2.12.7's.
   */
  readonly readings: readonly ChartPoint[];
  /**
   * The x scale, kept so a pointer's pixel can be turned back into a slot.
   *
   * Plain data rather than a closure, which is `chart-scale.ts`'s rule and the
   * reason this can sit on a frame at all. `null` before there is an axis.
   *
   * **This is what stops the crosshair re-deriving a mapping from an element's
   * bounding box** — the task brief's own instruction, and the defect it names
   * is real: a second spelling of the scale agrees with the first everywhere
   * except the edges, which is exactly where a pointer spends its time.
   */
  readonly slots: SlotScale | null;
  /**
   * Which of the requested window this answer holds, in pixels (Task 2.12.7).
   *
   * Never `null`: every state that draws a frame has an answer to this, and
   * "nothing is known to be missing" (`loading`) and "all of it is missing"
   * (`empty`) are different values rather than the same absence.
   */
  readonly coverage: ChartCoverage;
  /**
   * What this window did — the dashed rule, the area under it, and which of the
   * three directions the pair is tinted for.
   *
   * `null` wherever there is no line to be on one side of a rule: no bars, a
   * single bar, or an opening price of zero.
   */
  readonly direction: DirectionalArea | null;
}

/** A run of pixels across the plot. `from` is always the smaller. */
export interface PixelSpan {
  readonly from: number;
  readonly to: number;
}

/**
 * **How much of the window this answer holds** (Task 2.12.7).
 *
 * Three fields rather than one, and the redundancy is deliberate: a renderer
 * that had to subtract the covered span from the plot to find the spans to wash
 * would be arithmetic in JSX, which is the shape `CHARTING.md` §1 chose this
 * file to prevent. Everything a state needs to draw is already a number here.
 *
 * ## What each is for
 *
 *  - **`covered`** is the clip. The line, the two washes and the reference rule
 *    are all statements about bars and stop at it. `null` when there are none.
 *  - **`uncovered`** is what gets `--chart-uncovered` behind it. Zero spans for
 *    a complete answer, one for the ordinary short one, **two** where the store
 *    is missing the start as well — a security listed mid-window does that, and
 *    it costs nothing to be right about because the span is derived from the
 *    covered range at both ends rather than from `covered.end` alone.
 *  - **`edges`** are the dashed verticals. Interior boundaries only: an edge at
 *    the frame's own left or right side would be a spine, which this language
 *    refuses.
 *
 * ## `empty` is this at its limit rather than a fourth treatment
 *
 * A 200 with no bars is a window we asked for and hold **none** of, so it is
 * one uncovered span across the whole plot and no edges. That is the whole of
 * `empty`'s drawn treatment, and it is what tells it apart at a glance from
 * `loading`, which is the same frame with `uncovered` empty — nothing is known
 * to be missing before anything has been answered.
 */
export interface ChartCoverage {
  readonly covered: PixelSpan | null;
  readonly uncovered: readonly PixelSpan[];
  readonly edges: readonly number[];
}

/**
 * **Direction, drawn as position first and as hue second** (Task 2.12.5).
 *
 * One value with two fields rather than two fields on {@link ChartFrame}, and
 * that is the mechanism the task asked for rather than a grouping preference.
 * `VISUAL-LANGUAGE.md` measured the two washes at **1.009:1 under
 * `grayscale(1)`** — washed back to a fill, positive and negative are the same
 * colour — so a chart that drew the tint and not the rule would be a chart with
 * no direction on it at all, rendering perfectly and saying nothing. Bundling
 * them makes that state unrepresentable rather than discouraged.
 *
 * ## The fill carries no colour decision, and that is the 2026-09-12 revision
 *
 * This shipped with a **third** field — the window's direction — because the
 * whole area took one tint chosen by where the line finished. That was wrong in
 * a way the first screenshot showed: a window that dips below its opening price
 * and recovers was painted **green throughout**, so the hue contradicted the
 * geometry everywhere the line was below the rule. It was one fact painted over
 * regions that locally disagreed with it.
 *
 * The area is now **split at the rule by the renderer** — green above, red below
 * — so the tint is a function of *position* rather than of the window, and there
 * is nothing here for a direction to decide. That is strictly stronger against
 * the measurement above rather than a matter of taste: what the hue repeats is
 * now exactly what survives the hue being removed.
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
   * **One path for both colours.** The renderer draws it twice, clipped above
   * and below the rule, so the split costs two small elements rather than a
   * second walk over the bars or a second copy of the point string.
   *
   * Built by **appending two segments and a close to the line's own `d`**
   * rather than by walking the bars a second time. At the default window that
   * is 1,950 points already in a string; re-deriving them would double both the
   * arithmetic and the main-thread parse that `PRODUCT_SPEC.md` §28's 50 ms
   * budget is spent on, for a path that is the same line with a lid on it.
   */
  readonly fill: string;
}

/**
 * One bar, its slot, and where it was drawn (Task 2.12.6).
 *
 * The `y` is the **close**, because the close is what the line is made of:
 * putting the disc anywhere else would put the crosshair's point off the mark
 * it is pointing at. The other three prices reach the reader through the
 * readout, which is the role `CHARTING.md` §2 assigned it when it chose a line
 * over candlesticks.
 */
export interface ChartPoint {
  readonly bar: Bar;
  /** The whole slot `placeBars` put it on. Ascending, which `nearestPlaced` needs. */
  readonly slot: number;
  /** Pixels across the plot. The same value the path was built from. */
  readonly x: number;
  /** Pixels down the plot, at the bar's close. */
  readonly y: number;
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
  /**
   * The part of it the answer actually holds, or `null` for none at all.
   *
   * A separate field from `bars` because it is a separate fact, and the one the
   * uncovered treatment is derived from — see the header. The contract makes
   * the two agree (`bars: []` and `covered: null` are one state), so this is
   * never a second opinion about the same thing.
   */
  readonly covered: TimeRange | null;
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
  const coverage = coverageOf(axis, x, plot, subject.covered);

  if (first === undefined) {
    return {
      gridlines: unscaledGridlines(plot, density),
      seams,
      ticks,
      series: null,
      readings: [],
      slots: x,
      coverage,
      direction: null,
    };
  }

  const placed = placeBars(axis, subject.bars);
  const domain = priceDomain([first, ...rest]);
  // `[height, 0]` and not `[0, height]`: SVG's y grows downwards, so the
  // domain's high belongs at pixel zero. `chart-scale.ts` takes the inversion
  // as an input for exactly this reason, so that no renderer spells
  // `height - y` anywhere.
  const y = linearScale(domain, [plot.height, 0]);

  // **Scaled once, here, and read by everything downstream.** The line, the
  // area's two closing segments and the crosshair's disc are all the same
  // points; deriving them three times is three chances for one of them to be a
  // pixel out, and the one that would show is the disc sitting beside the line
  // it is meant to be on.
  const points = placed.map(({ bar, slot }) => ({
    bar,
    slot,
    x: round(scaleSlot(x, slot)),
    y: round(scaleValue(y, bar.close)),
  }));

  const series = linePath(points);

  return {
    gridlines: valueTicks(domain, density.valueTicks).map((tick) => ({
      y: round(scaleValue(y, tick.value)),
      label: tick.label,
    })),
    seams,
    ticks,
    series,
    readings: points,
    slots: x,
    coverage,
    direction: directionalArea(points, series, y),
  };
}

const EMPTY_FRAME: ChartFrame = {
  gridlines: [],
  seams: [],
  ticks: [],
  series: null,
  readings: [],
  slots: null,
  // Nothing is known to be missing before anything has been answered, which is
  // a different value from "all of it is missing" and is why `loading` draws no
  // wash. See {@link ChartCoverage}.
  coverage: { covered: null, uncovered: [], edges: [] },
  direction: null,
};

/**
 * The covered span, the spans that are not, and the edges between them.
 *
 * ## Why the ends are found through the axis rather than through the bars
 *
 * `positionOfInstant` is the same function Epic 9's filing markers will use, and
 * it is what makes this correct on a **session-ordinal** axis without a special
 * case. `CHARTING.md` §10.1's finding — that a `partial` answer whose shortfall
 * is a weekend has no space to draw, because a Saturday contributes no slots —
 * is not handled here; it simply does not arise. The covered end lands on the
 * boundary slot after the last session in the window, which is the frame's own
 * right-hand edge, and the floor below drops the zero-width span.
 *
 * ## The floor, and why an edge at the frame's own side is not drawn
 *
 * A span narrower than a pixel cannot be washed legibly and its dashed edge
 * would sit on the axis rule's own end, where it reads as the left or right
 * spine this language spent `PriceChart.module.css`'s first comment refusing. So
 * a span has to be at least {@link MIN_UNCOVERED_PX} wide to exist at all, and
 * an edge exists only where a span does — which makes a complete answer produce
 * no coverage marks by arithmetic rather than by a branch on the state.
 */
function coverageOf(
  axis: TimeAxis,
  x: SlotScale,
  plot: PlotBox,
  covered: TimeRange | null,
): ChartCoverage {
  // Nothing held at all: the whole frame was asked for and none of it is
  // answered. One span, no edges — `empty`, and it is this treatment at its
  // limit rather than a fourth one.
  if (covered === null) {
    return {
      covered: null,
      uncovered: [{ from: 0, to: round(plot.width) }],
      edges: [],
    };
  }

  // **Clamped, and that is a property of the axis rather than caution.**
  // `positionOfInstant` answers *one slot past the end* for an instant after
  // the last session — which is the honest ordinal answer and is a pixel beyond
  // the frame, because the scale puts the last slot **at** the width. A covered
  // range that reaches the window's end therefore overshoots by one slot, and
  // unclamped it would leave a complete answer with a negative trailing span.
  const from = round(
    clampToPlot(pixelOfInstant(axis, x, covered.start, 0), plot),
  );
  const to = round(
    clampToPlot(pixelOfInstant(axis, x, covered.end, plot.width), plot),
  );

  const uncovered: PixelSpan[] = [];
  const edges: number[] = [];

  // Leading, which happens when the store is missing the *start* of the window
  // — a security listed mid-window, or a backfill that began late. Cheap to be
  // right about, because both ends come from the same range.
  if (from >= MIN_UNCOVERED_PX) {
    uncovered.push({ from: 0, to: from });
    edges.push(from);
  }

  // Trailing, which is the ordinary one: the store is caught up to some point
  // and the window reaches past it.
  if (round(plot.width) - to >= MIN_UNCOVERED_PX) {
    uncovered.push({ from: to, to: round(plot.width) });
    edges.push(to);
  }

  return { covered: { from, to }, uncovered, edges };
}

/**
 * Where an instant sits across the plot, with an answer for the one position an
 * ordinal axis genuinely does not have.
 *
 * `outside` is unreachable for a covered range — the server clamps it to the
 * requested window — so the fallback is what this file believes rather than
 * what it has seen: the start of the window for a start, the end for an end.
 * Getting that wrong in the unreachable case washes a span that should not be
 * washed, which is visible; silently returning slot 0 for both would put a
 * coverage edge at the left-hand edge of a complete chart, which is not.
 */
function pixelOfInstant(
  axis: TimeAxis,
  x: SlotScale,
  instant: Date,
  fallback: number,
): number {
  const position = positionOfInstant(axis, instant);
  return position.kind === "outside" ? fallback : scaleSlot(x, position.slot);
}

/** Inside the frame. See {@link coverageOf} for why an end can fall outside it. */
function clampToPlot(pixel: number, plot: PlotBox): number {
  return Math.min(Math.max(pixel, 0), plot.width);
}

/**
 * The narrowest uncovered span worth drawing.
 *
 * One CSS pixel. Below it the wash is invisible on every display this product
 * runs on and the dashed edge lands on the axis rule's own end — and the case
 * that reaches it is the ordinary one rather than a contrivance: a `loaded`
 * answer's covered range **equals** its requested one, so both ends round to
 * the frame's own sides and the difference is zero.
 */
const MIN_UNCOVERED_PX = 1;

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
function linePath(points: readonly ChartPoint[]): string | null {
  if (points.length < 2) return null;

  return points
    .map(({ x, y }, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${String(x)} ${String(y)}`;
    })
    .join(" ");
}

/**
 * The dashed rule, and the area between it and the close line.
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
  points: readonly ChartPoint[],
  series: string | null,
  y: LinearScale,
): DirectionalArea | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (series === null || first === undefined || last === undefined) return null;
  // Not a price any equity has, so a corrupt bar rather than a division to
  // attempt — `series-facts.ts` declines the same case and renders no
  // percentage. The rule is that bar's open, so a zero would put the datum on
  // the floor of a domain it does not belong to.
  if (first.bar.open === 0) return null;

  const reference = round(scaleValue(y, first.bar.open));

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
      `${series} L${String(last.x)} ${String(reference)}` +
      ` L${String(first.x)} ${String(reference)} Z`,
  };
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
