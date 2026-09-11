// Domain to pixels, and pixels back, for the chart layer (Task 2.12.3).
//
// `CHARTING.md` §1 chose hand-built SVG with **no charting dependency, not even
// `d3-array`**, so nothing arrives with a scale already written. This file is
// the whole of it: two scales, each with its inverse, and no DOM anywhere near
// them.
//
// ## Why both directions are written here rather than one now and one later
//
// The task brief is explicit, and it is worth restating because it is the sort
// of instruction that looks like tidiness and is not: *"an inverse written later
// against a forward function written earlier is where an off-by-a-half-pixel
// lives"*. Task 2.12.6's crosshair is the caller of `unscale*`, and by then the
// forward function will be on screen and correct-looking, which makes a
// disagreement between the two invisible from either end.
//
// So the round trip is a test in this task, not a bug report in that one.
//
// ## A scale is plain data and a pair of functions, not an object with methods
//
// `d3` returns a callable closure. This returns a record, and callers pass it
// back in. Three reasons, all of them this repository's existing rules:
//
//  1. **`FRONTEND-STATE.md` §1's rule 4** — the shapes this application passes
//     around stay describable: plain serialisable data, no closures. A scale
//     ends up inside what Epic 11 renders from a `WorkspaceCommand` and Epic 12
//     persists, and a closure is un-comparable, un-serialisable and awkward to
//     write in a story.
//  2. **It is inspectable in a test failure.** `expect(scale)` prints a domain
//     and a range; a closure prints `[Function]`.
//  3. **It costs nothing.** These are two multiplications.
//
// ## Nothing here reads a token, an element or a clock
//
// A range is a pair of pixel numbers the caller computed. Where those numbers
// come from — `--chart-gutter`, `--chart-height`, a measured region — is Task
// 2.12.4's problem and is deliberately not visible from here, which is what lets
// every case below be tested with no layout, no stylesheet and no browser.

/**
 * A linear mapping between a numeric domain and a pixel range.
 *
 * **The range is routinely descending**, and that is the ordinary case rather
 * than a trick: SVG's y axis grows downwards, so a price scale maps the domain's
 * *high* to pixel 0 and its *low* to the plot's height. Writing that as
 * `range: [plotHeight, 0]` keeps the inversion in one place — the value handed
 * to {@link linearScale} — instead of scattering `plotHeight - y` through a
 * renderer.
 */
export interface LinearScale {
  /** `[min, max]` in the units of the thing being drawn. Strictly ascending. */
  readonly domain: readonly [number, number];
  /** `[atMin, atMax]` in pixels. May descend; may not be zero-width. */
  readonly range: readonly [number, number];
}

/**
 * Builds a {@link LinearScale}, refusing the two inputs that produce silent
 * nonsense.
 *
 * - A **zero-height or reversed domain** divides by zero and returns `Infinity`
 *   or `NaN` for every value. On a chart that is not an error anybody sees: a
 *   `NaN` in an SVG path attribute draws *nothing*, so the symptom is an empty
 *   plot with a correct frame around it. A flat series is a real case and it is
 *   handled where it arises, in {@link priceDomain} — by the time a domain
 *   reaches here it has to be a real interval.
 * - A **zero-width range** is a plot with no pixels in it, which is what a chart
 *   asked to draw into an unmeasured element produces. Refusing it here turns a
 *   blank chart into a thrown error naming the input.
 *
 * Throws rather than returning a result, as `toTimeRange` and `toTicker` do:
 * both refusals are programming errors, and a caller that could ignore them
 * would render an empty chart instead.
 */
export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): LinearScale {
  const [low, high] = domain;

  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) {
    throw new RangeError(
      `Scale domain must be a real ascending interval, received ` +
        `[${String(low)}, ${String(high)}]. A zero-height domain divides by ` +
        `zero and produces NaN coordinates, which SVG draws as nothing at all.`,
    );
  }

  const [atLow, atHigh] = range;

  if (!Number.isFinite(atLow) || !Number.isFinite(atHigh) || atLow === atHigh) {
    throw new RangeError(
      `Scale range must be two different finite pixel positions, received ` +
        `[${String(atLow)}, ${String(atHigh)}]. A zero-width range is a plot ` +
        `with no pixels in it.`,
    );
  }

  return { domain, range };
}

/** Where a value sits, in pixels. Not clamped — see {@link clampToRange}. */
export function scaleValue(scale: LinearScale, value: number): number {
  const [low, high] = scale.domain;
  const [atLow, atHigh] = scale.range;
  return atLow + ((value - low) / (high - low)) * (atHigh - atLow);
}

/**
 * What value a pixel position represents. The exact inverse of
 * {@link scaleValue}.
 */
export function unscaleValue(scale: LinearScale, pixel: number): number {
  const [low, high] = scale.domain;
  const [atLow, atHigh] = scale.range;
  return low + ((pixel - atLow) / (atHigh - atLow)) * (high - low);
}

/**
 * A pixel position, held inside the scale's range.
 *
 * Separate from {@link scaleValue} rather than built into it, because the two
 * callers want opposite things. A *mark* outside the domain should be drawn
 * outside the plot and clipped by the frame — clamping it would pin it to the
 * edge and tell the reader the price went there. A *pointer* outside the plot
 * should be clamped, because a crosshair dragged past the edge still means the
 * nearest point.
 */
export function clampToRange(scale: LinearScale, pixel: number): number {
  const [atLow, atHigh] = scale.range;
  const min = Math.min(atLow, atHigh);
  const max = Math.max(atLow, atHigh);
  return Math.min(max, Math.max(min, pixel));
}

/**
 * The x axis: **slots, not instants** (`CHARTING.md` §3).
 *
 * Slot `i` sits at `i / (slots - 1)` of the range. There is no gap between
 * Friday's last minute and Monday's first, because on a continuous time axis the
 * product's own default window would open on a picture that is roughly
 * two-thirds empty.
 *
 * What a slot *is* — a trading minute, or a session — is
 * `chart-time-axis.ts`'s, and deliberately not visible here. This file knows
 * only that there are `slots` of them in a row.
 */
export interface SlotScale {
  /** How many slots the axis has. At least one. */
  readonly slots: number;
  /** `[atFirst, atLast]` in pixels. */
  readonly range: readonly [number, number];
}

/**
 * Builds a {@link SlotScale}.
 *
 * **A single slot is a real case and it is placed at the range's start.** The
 * formula is `i / (slots - 1)`, which is `0 / 0` at one slot, so the answer has
 * to be chosen rather than computed. The start is the right choice because it is
 * what every other slot already does: slot `i` marks where its interval
 * *begins*, so the last slot of a five-session window is the 15:59 bar sitting
 * on the right-hand edge, and a window one minute wide is one bar sitting on the
 * left-hand edge of a frame one minute wide. Centring it instead would make a
 * one-bar chart the only chart whose mark does not mean "this interval starts
 * here".
 */
export function slotScale(
  slots: number,
  range: readonly [number, number],
): SlotScale {
  if (!Number.isInteger(slots) || slots < 1) {
    throw new RangeError(
      `A slot axis needs at least one whole slot, received ${String(slots)}. ` +
        `An empty window is an empty *series*, which is a state the chart ` +
        `renders rather than an axis it builds.`,
    );
  }

  const [atFirst, atLast] = range;

  if (!Number.isFinite(atFirst) || !Number.isFinite(atLast)) {
    throw new RangeError(
      `Slot range must be two finite pixel positions, received ` +
        `[${String(atFirst)}, ${String(atLast)}].`,
    );
  }

  return { slots, range };
}

/**
 * Where a slot sits, in pixels.
 *
 * Takes a **fractional** slot on purpose: `CHARTING.md` §3's rule 1 positions an
 * instant *inside* a bar proportionally within that bar's slot, which is what
 * Epic 9's filing markers need and what the crosshair uses to sit between two
 * points rather than snapping first.
 */
export function scaleSlot(scale: SlotScale, slot: number): number {
  const [atFirst, atLast] = scale.range;
  if (scale.slots === 1) return atFirst;
  return atFirst + (slot / (scale.slots - 1)) * (atLast - atFirst);
}

/**
 * What slot a pixel position falls on, as a fraction. The exact inverse of
 * {@link scaleSlot}.
 *
 * One slot returns `0` for every pixel, which is the only answer a one-slot axis
 * can give and is why it is stated rather than divided for.
 */
export function unscaleSlot(scale: SlotScale, pixel: number): number {
  const [atFirst, atLast] = scale.range;
  if (scale.slots === 1) return 0;
  return ((pixel - atFirst) / (atLast - atFirst)) * (scale.slots - 1);
}

/**
 * The whole slot nearest a pixel position, clamped to the axis.
 *
 * **The inverse a reader wants is a slot rather than an instant**, which is the
 * consequence of the ordinal axis that Task 2.12.1's amendment asked this task
 * to build in: returning an instant and re-finding the bar would be the second
 * spelling of the scale, with the seam — where an instant maps to two positions
 * — as the place the two spellings would disagree.
 */
export function nearestSlot(scale: SlotScale, pixel: number): number {
  const slot = Math.round(unscaleSlot(scale, pixel));
  return Math.min(scale.slots - 1, Math.max(0, slot));
}
