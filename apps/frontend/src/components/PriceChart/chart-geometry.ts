import type {
  Bar,
  MarketFeed,
  Timeframe,
  TimeRange,
} from "@marketpulse/shared";

import type {
  ChartDensity,
  LinearScale,
  SlotScale,
  TimeAxis,
  TimeTickOptions,
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
  volumeDomain,
  volumePeakBar,
  volumePeakLabel,
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
  /** Pixels across, **excluding the value gutter** — see {@link timeFrame}. */
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

/**
 * **The horizontal axis, in pixels — computed once and handed to every plot that
 * hangs on it** (Task 2.13.3).
 *
 * `STORY.md`'s scope calls axis alignment between the price and volume plots "a
 * structural property rather than a coincidence", and this type is that property:
 * it is the only thing in this file that takes a window, and {@link priceFrame}
 * and {@link volumeFrame} both take one of these instead. Neither of them can
 * spell `timeAxis(...)`, because neither is handed a `TimeRange` or a
 * {@link Timeframe} to call it with.
 *
 * ## Why one object rather than two plots calling `timeAxis` with the same arguments
 *
 * Because those are different guarantees. **Two plots that agree because they
 * were given the same numbers cannot drift; two that agree because they were
 * written the same way can** — and the specific drift is the defect
 * `CHARTING.md` §6.2 and §17.5 item 1 name as the worst-shaped one in the chart
 * layer: an axis derived from its own bars rather than from `coverage.requested`
 * rescales a short answer to fill the frame and **looks complete**. It is already
 * held for the price plot by two tests in `chart-geometry.test.ts`; a second plot
 * deriving its own x-domain would reintroduce it somewhere those tests do not
 * look, on a plot whose own coverage sentence sits above it in a different panel.
 *
 * ## What is on it, and why coverage is here rather than per plot
 *
 * Everything derived from the **window**: the axis, the x scale, the session
 * seams, the tick labels and the coverage spans. Coverage is horizontal —
 * `CHARTING.md` §14's rule is about *where along the axis* an answer stops — so
 * two plots sharing this object stop at the same pixel by arithmetic rather than
 * by agreement (`VOLUME-AND-WINDOW.md` §13.1, which names this as the item most
 * likely to be got wrong). The **ground** it implies is still drawn once per plot,
 * because it is a statement about a frame and there are two frames.
 *
 * `width` is on it because both plots are the same width — they declare the same
 * span on the same grid and spend the same `--chart-gutter` — and a second plot
 * that measured its own would be the one place the alignment could silently fail.
 */
export interface TimeFrame {
  /**
   * The session-ordinal axis, or `null` before there is a window to build one
   * from. Kept so a plot can place its own bars without re-deriving it.
   */
  readonly axis: TimeAxis | null;
  /** Pixels across, shared by every plot on this axis. */
  readonly width: number;
  /** What the region's width bought, decided once for the pair. */
  readonly density: ChartDensity;
  /** Session boundaries, in pixels. The only vertical rules this chart draws. */
  readonly seams: readonly number[];
  readonly ticks: readonly TimeLabel[];
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
}

/**
 * What the **price** plot draws, given a {@link TimeFrame} and a height.
 *
 * Takes bars and no window (see {@link priceFrame}), which is the half of the
 * one-axis property that applies to this plot: it could not build an axis if it
 * wanted to.
 */
export interface PricePlot {
  readonly gridlines: readonly GridLine[];
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
 * One value with two fields rather than two fields on {@link PricePlot}, and
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

  /**
   * **The tapes the answer is drawn from**, in first-contribution order
   * (Task 3.9.8).
   *
   * Here rather than read off the view at a call site for this module's own
   * stated reason: two plots that answered a question about the series
   * differently would be two charts on one axis disagreeing. One reader today
   * — the volume strip's silent-window sentence, whose **scope** is a fact
   * about the feeds rather than about the bars — and it is the same shape as
   * `covered`: a separate field because it is a separate fact.
   */
  readonly feeds: readonly MarketFeed[];
}

/**
 * **The axis, once** — see {@link TimeFrame} for why this is a separate value.
 *
 * Takes the width alone rather than a {@link PlotBox}, because nothing derived
 * from the window is derived from a height: two plots of different heights hang
 * on one of these. That is also what makes the type unusable as a plot frame,
 * which is the point.
 *
 * **`width` excludes the value gutter.** `CHARTING.md`'s §10 amendment is
 * emphatic that the gutter is an input to the horizontal range rather than
 * padding applied afterwards, because a scale built against the whole region
 * draws a line that runs under its own labels. Here that is structural instead
 * of remembered: the caller measures the plot element, and the gutter is a
 * sibling column that element never contains.
 *
 * A zero width answers with an **empty axis rather than a throw**. An element
 * reports zero before it has been laid out, and `slotScale` refuses a zero-width
 * range on purpose — so the check belongs here, once, rather than at the call
 * sites that would otherwise take the region's error boundary down on a first
 * paint.
 *
 * `subject` is `null` before the first answer arrives. That is the frame-first
 * rule (`PRODUCT_SPEC.md` §28): the scale, the gridlines and the rule are drawn
 * from the box, and the data fills in labels and a line.
 */
export function timeFrame(
  width: number,
  density: ChartDensity,
  subject: ChartSubject | null,
): TimeFrame {
  if (!(width > 0) || subject === null) {
    return emptyTimeFrame(width > 0 ? width : 0, density);
  }

  const axis = timeAxis(subject.requested, subject.timeframe);
  const x = slotScale(axis.slots, [0, width]);

  return {
    axis,
    width,
    density,
    seams: seamSlots(axis).map((slot) => round(scaleSlot(x, slot))),
    ticks: timeTicks(axis, density).map((tick) => ({
      x: round(scaleSlot(x, tick.slot)),
      label: tick.label,
      kind: tick.kind,
    })),
    slots: x,
    // No bars is a real answer rather than a missing one, and it is what CI's
    // store returns for every window: `verify.yml` runs the migrations and the
    // universe loader and never a backfill. A labelled axis with no line on it is
    // the honest picture of *we asked for this window and hold nothing in it*.
    coverage: coverageOf(axis, x, width, subject.covered),
  };
}

/**
 * The price plot: its value scale, its line, its readings and its direction.
 *
 * **Takes a {@link TimeFrame} and bars, and no window at all.** There is nothing
 * here to call `timeAxis` with, which is the half of the one-axis property that
 * applies to this plot — see {@link TimeFrame}.
 *
 * A zero or unmeasured height answers with the empty plot, for the same reason
 * {@link timeFrame} answers a zero width with an empty axis.
 */
export function priceFrame(
  time: TimeFrame,
  height: number,
  bars: readonly Bar[],
): PricePlot {
  if (!(height > 0)) return EMPTY_PRICE_PLOT;

  const unscaled = {
    ...EMPTY_PRICE_PLOT,
    gridlines: unscaledGridlines(height, time.density),
  };

  const { axis, slots: x } = time;
  const [first, ...rest] = bars;
  if (axis === null || x === null || first === undefined) return unscaled;

  const placed = placeBars(axis, bars);
  const domain = priceDomain([first, ...rest]);
  // `[height, 0]` and not `[0, height]`: SVG's y grows downwards, so the
  // domain's high belongs at pixel zero. `chart-scale.ts` takes the inversion
  // as an input for exactly this reason, so that no renderer spells
  // `height - y` anywhere.
  const y = linearScale(domain, [height, 0]);

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
    gridlines: valueTicks(domain, time.density.valueTicks).map((tick) => ({
      y: round(scaleValue(y, tick.value)),
      label: tick.label,
    })),
    series,
    readings: points,
    direction: directionalArea(points, series, y),
  };
}

/**
 * An axis with no window on it — an unmeasured element, or a state with no
 * answer yet.
 *
 * The density is carried through rather than defaulted, because it comes from the
 * region's width and is known before any answer is: a plot waiting for its first
 * body still draws the right number of gridlines.
 */
function emptyTimeFrame(width: number, density: ChartDensity): TimeFrame {
  return {
    axis: null,
    width,
    density,
    seams: [],
    ticks: [],
    slots: null,
    // Nothing is known to be missing before anything has been answered, which is
    // a different value from "all of it is missing" and is why `loading` draws no
    // wash. See {@link ChartCoverage}.
    coverage: { covered: null, uncovered: [], edges: [] },
  };
}

/**
 * What the **volume** plot draws, given a {@link TimeFrame} and a height.
 *
 * One path and one stroke width, at every window from 11.5 px per bar to
 * 0.089 px per bar — see {@link volumeFrame} for the three regimes and
 * `VOLUME-AND-WINDOW.md` §10 for the argument.
 */
export interface VolumePlot {
  /**
   * Every column, as one stroked SVG path — or `null` when there is nothing to
   * draw.
   *
   * **Butt-capped vertical stems on a single `<path>`**, whose `stroke-width` is
   * {@link columnWidth}. One element at every window, exactly as the price line
   * is one element at every window: `CHARTING.md` §1 forbids the obvious
   * implementation outright, because one `<rect>` per bar at the cap is 9,790
   * plot elements and main-thread tasks of 137–254 ms.
   */
  readonly columns: string | null;
  /**
   * The stroke width the path is drawn with, in pixels.
   *
   * Never zero while {@link columns} is set. The renderer must not choose it: the
   * gap between columns is arithmetic that produces a coordinate, and
   * `PriceChart.module.css` already records that coordinates come from this
   * module because **a computed pixel is data rather than design** (§10.6). That
   * is also why there is no `--chart-volume-gap` token — one number in a
   * stylesheet with its threshold in a module is the two-homes trap
   * `CHARTING.md` §10.3 spent a task closing.
   */
  readonly columnWidth: number;
  /** How many stems the path holds. One per bar, or one per pixel — see §10.2. */
  readonly stems: number;
  /**
   * Every bar that has a place on the axis, with the pixel it was drawn at and
   * the top of **its own** column (Task 2.13.5).
   *
   * The volume plot's half of the shared reading, and it is the same shape as
   * {@link PricePlot.readings} for a reason that is load-bearing rather than
   * tidy: **both are `placeBars(axis, bars)` in the same order**, so one index
   * addresses the same bar in both. That is what lets one read position drive a
   * crosshair in two regions without either plot knowing the other exists.
   *
   * `y` is the bar's own volume, **not** the pixel column's tallest. Below a
   * pixel per bar the drawn silhouette carries the column's maximum (§10.5), so
   * the disc genuinely sits below the ink under it — which is the picture
   * admitting what it rounded rather than a mark that missed.
   */
  readonly readings: readonly ChartPoint[];
  /**
   * The bar that traded the window's peak, or `null` where there are no bars.
   *
   * What the volume readout states at rest (§15). The abbreviated {@link peak}
   * is the gutter's; this is the fact behind it, carried here so the strip does
   * not walk the bars a second time.
   */
  readonly peakBar: Bar | null;
  /**
   * What the value gutter writes: the window's peak, abbreviated — or `null`
   * where there are no bars.
   *
   * **One label and not a scale** (§9.4). Volume keeps price's full 56 px gutter
   * for a label it does not need, because two charts that disagree about where
   * their value scale starts cannot be stacked, and alignment outranks tightness.
   */
  readonly peak: string | null;
}

const EMPTY_VOLUME_PLOT: VolumePlot = {
  columns: null,
  columnWidth: 0,
  stems: 0,
  readings: [],
  peakBar: null,
  peak: null,
};

/**
 * The widest a column can be before it earns a gap.
 *
 * Two pixels, and **the threshold is the device rather than a taste**: below it
 * there is no room for a 1 px gap *and* a 1 px column, and the column wins,
 * because a column that is not drawn says nothing at all while a missing gap only
 * makes neighbours touch.
 */
const MIN_GAPPED_SLOT_PX = 2;

/** The gap between columns, where there is room for one. */
const COLUMN_GAP_PX = 1;

/**
 * The volume plot: one path of stems, its width, and the one label beside it.
 *
 * **Takes a {@link TimeFrame} and bars, and no window at all** — the other half
 * of the one-axis property. This function could not build an axis if it wanted
 * to, which is what makes `VOLUME-AND-WINDOW.md` §13.1's rule structural: the two
 * plots stop at the same pixel because they were handed the same `coverage`,
 * rather than because two files were written the same way.
 *
 * ## Three regimes from one rule — *does a bar have a pixel of its own?*
 *
 * | Slot        | Column              | Stems                                  |
 * | ----------- | ------------------- | -------------------------------------- |
 * | ≥ 2 px      | `slot − 1`, a gap   | one per bar                            |
 * | 1 – 2 px    | `slot`, no gap      | one per bar                            |
 * | < 1 px      | 1 px                | one per **pixel**, carrying its maximum |
 *
 * **The third regime is the one that needs arguing for.** Below a pixel per bar
 * the stems overlap completely, so only the tallest in each pixel column can be
 * seen — drawing the other ten is overdraw rather than detail. Taking the
 * column's maximum paints the *identical picture* and bounds the cost by the
 * plot's width instead of by the bar count: measured at 1M, 8,190 stems and a
 * 158 kB path attribute become 726 stems and 16.8 kB, and it does not grow again
 * (§10.3).
 *
 * That claim is a **property**, and `chart-geometry.test.ts` asserts it as one —
 * every pixel column's height equals the maximum of the bars falling in it —
 * rather than as a stem count. A reduction that dropped the wrong bar would
 * produce a plausible chart, not a broken one.
 *
 * ## What the picture rounds, the reading does not
 *
 * The silhouette changes what is **drawn** and nothing about what is **read**: the
 * crosshair still resolves to a bar, the readout still states that bar's exact
 * integer, and the arrow keys still step bars (§10.5). That split already exists
 * on the price line at 0.47 px per bar; here the drawing says so explicitly
 * rather than relying on overdraw to hide it.
 *
 * ## The baseline is the axis rule, so there is no second mark to clip
 *
 * Volume's zero **is** the plot's bottom rule, and it is derived from the window
 * rather than from the bars — so it runs the full frame like every other mark of
 * that kind (§14, §13.1). What stops at the coverage edge is the columns, which
 * the renderer clips with the shared `coverage.covered` span.
 */
export function volumeFrame(
  time: TimeFrame,
  height: number,
  bars: readonly Bar[],
): VolumePlot {
  if (!(height > 0)) return EMPTY_VOLUME_PLOT;

  const { axis, slots: x } = time;
  if (axis === null || x === null || bars.length === 0) {
    return EMPTY_VOLUME_PLOT;
  }

  // `[height, 0]` for the same reason the price scale takes it: SVG's y grows
  // downwards, so the domain's top belongs at pixel zero and no renderer spells
  // `height - y`. The domain runs zero to the window's peak, unpadded —
  // `chart-volume-axis.ts` carries why, and §9.2's proportion depends on it.
  const y = linearScale(volumeDomain(bars), [height, 0]);
  const placed = placeBars(axis, bars);
  const peak = volumePeakLabel(bars);
  const peakBar = volumePeakBar(bars);

  // **The reading's points, scaled once and never from the drawn path** (Task
  // 2.13.5). Each bar's own x and the top of its own column — the same
  // `placeBars` order the price plot's readings are in, which is what makes one
  // index mean one bar in both plots.
  const readings = placed.map(({ bar, slot }) => ({
    bar,
    slot,
    x: round(scaleSlot(x, slot)),
    y: round(scaleValue(y, bar.volume)),
  }));

  // **How far apart two stems are actually drawn**, which is `slots - 1` and not
  // `slots`: `scaleSlot` puts the first bar at 0 and the last at the width, so the
  // pitch is the width divided by the gaps between them.
  //
  // `VOLUME-AND-WINDOW.md` §10.3's table divides by `slots`, and that difference
  // was measured rather than reasoned about: at 30 bars on an 867 px plot a column
  // of `width / slots − 1` leaves a **2.0 px** gap and at 63 bars a 1.22 px one,
  // where §10.2 specifies **1 px**. The gap is the load-bearing part of that
  // decision — it is what makes columns read as columns rather than as a filled
  // area — so it is measured against the pitch, and the table's figures stand as a
  // description of a bar's share of the plot. Above a few hundred bars the two are
  // the same number to three decimal places.
  //
  // A single-slot axis has no pitch at all — reachable only through the absolute
  // window form at `1d` — and the bar owns the whole plot there.
  const slotWidth = axis.slots > 1 ? time.width / (axis.slots - 1) : time.width;

  if (slotWidth < 1) {
    return {
      ...silhouette(placed, x, y, time.width, height),
      columnWidth: COLUMN_GAP_PX,
      readings,
      peakBar,
      peak,
    };
  }

  const stems = placed.map(({ bar, slot }) => ({
    // The bar's own x, **unsnapped and identical to the price point above it**.
    // Alignment between the two plots outranks a crisp edge on a column: a stem
    // nudged half a pixel to a device boundary is a stem that no longer sits under
    // the close it belongs to.
    x: round(scaleSlot(x, slot)),
    top: round(scaleValue(y, bar.volume)),
  }));

  return {
    columns: stemPath(stems, height),
    columnWidth:
      slotWidth >= MIN_GAPPED_SLOT_PX ? slotWidth - COLUMN_GAP_PX : slotWidth,
    stems: stems.length,
    readings,
    peakBar,
    peak,
  };
}

/**
 * The volume plot's own time labels — **the first and last session date, and
 * nothing else** (`VOLUME-AND-WINDOW.md` §9.4).
 *
 * A separate function rather than a field on {@link VolumePlot}, because it is
 * the one thing the two plots draw *differently* from the same axis and the
 * difference is a policy rather than a measurement: `timeFrame` already put the
 * price chart's ticks on the frame, and volume needs the same slots labelled
 * under a narrower policy.
 *
 * **`sessionLabels: "ends"` is reused, not invented**: it is the value
 * `chart-density.ts` already gives a narrow region, and reusing it is what keeps
 * the policy in one vocabulary. **It is a constant here and not a branch** —
 * there is no viewport test and no media query, for `CHARTING.md` §11.1's
 * reason. The volume plot carries two dates at every width, which is enough to
 * anchor it where §9.1 says it will sometimes be read a screen away from the
 * price chart, and visibly less than the six labels above it.
 *
 * Intraday times are declined outright. Volume is read comparatively — this bar
 * against its neighbours — and a second full time axis doubles the chrome for
 * the supporting series.
 */
export function volumeTicks(time: TimeFrame): readonly TimeLabel[] {
  const { axis, slots: x } = time;
  if (axis === null || x === null) return [];

  return timeTicks(axis, VOLUME_TICKS).map((tick) => ({
    x: round(scaleSlot(x, tick.slot)),
    label: tick.label,
    kind: tick.kind,
  }));
}

/** §9.4's row, as the one value that produces it. */
const VOLUME_TICKS: TimeTickOptions = {
  sessionLabels: "ends",
  intraday: false,
};

/**
 * The sub-pixel regime: one stem per pixel column, carrying that column's tallest
 * bar.
 *
 * The pixel a bar belongs to is the one its `x` falls into, and the stem is drawn
 * at that pixel's **centre** — which is the one place snapping is right: at this
 * density there is no price point to stay aligned with, because a dozen of them
 * share the pixel too.
 */
function silhouette(
  placed: readonly { readonly bar: Bar; readonly slot: number }[],
  x: SlotScale,
  y: LinearScale,
  width: number,
  height: number,
): { readonly columns: string | null; readonly stems: number } {
  const tallest = new Map<number, number>();

  for (const { bar, slot } of placed) {
    // **The pixel the bar's x falls into**, floored rather than rounded: pixel
    // columns run `0` to `width − 1`, and flooring is what puts every stem's
    // centre inside the plot. The last slot sits *at* the width, so it belongs to
    // the last column rather than to one past it.
    const lastColumn = Math.max(0, Math.ceil(width) - 1);
    const column = Math.min(
      // `round` first, so the column is derived from **the same x the price point
      // above it was drawn at** rather than from a raw coordinate a tenth of a
      // pixel away — which is one more way two plots on one axis could disagree.
      Math.max(Math.floor(round(scaleSlot(x, slot))), 0),
      lastColumn,
    );
    const held = tallest.get(column);
    if (held === undefined || bar.volume > held)
      tallest.set(column, bar.volume);
  }

  const stems = [...tallest]
    .sort(([left], [right]) => left - right)
    .map(([column, volume]) => ({
      // The pixel's centre, so a 1 px stroke lands on one device pixel rather than
      // across two.
      x: column + COLUMN_GAP_PX / 2,
      top: round(scaleValue(y, volume)),
    }));

  return { columns: stemPath(stems, height), stems: stems.length };
}

/**
 * The stems as one path — a move to the baseline and a vertical line up, per
 * column.
 *
 * `V` rather than `L`: a vertical-line command carries one coordinate instead of
 * two, which is a third off the attribute at the densities that matter, and it
 * cannot express a stem that is accidentally not vertical.
 *
 * `baseline` is the plot's own bottom, and it is passed rather than assumed
 * because {@link silhouette} has already scaled its tops against the same height.
 */
function stemPath(
  stems: readonly { readonly x: number; readonly top: number }[],
  baseline: number,
): string | null {
  if (stems.length === 0) return null;

  return stems
    .map(({ x, top }) => `M${String(x)} ${String(baseline)}V${String(top)}`)
    .join(" ");
}

const EMPTY_PRICE_PLOT: PricePlot = {
  gridlines: [],
  series: null,
  readings: [],
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
  width: number,
  covered: TimeRange | null,
): ChartCoverage {
  // Nothing held at all: the whole frame was asked for and none of it is
  // answered. One span, no edges — `empty`, and it is this treatment at its
  // limit rather than a fourth one.
  if (covered === null) {
    return {
      covered: null,
      uncovered: [{ from: 0, to: round(width) }],
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
    clampToPlot(pixelOfInstant(axis, x, covered.start, 0), width),
  );
  const to = round(
    clampToPlot(pixelOfInstant(axis, x, covered.end, width), width),
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
  if (round(width) - to >= MIN_UNCOVERED_PX) {
    uncovered.push({ from: to, to: round(width) });
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
function clampToPlot(pixel: number, width: number): number {
  return Math.min(Math.max(pixel, 0), width);
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
  height: number,
  density: ChartDensity,
): readonly GridLine[] {
  const lines: GridLine[] = [];

  for (let index = 1; index <= density.valueTicks; index += 1) {
    lines.push({
      y: round((height * index) / (density.valueTicks + 1)),
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
