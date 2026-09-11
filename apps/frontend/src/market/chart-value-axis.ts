import type { Bar } from "@marketpulse/shared";

import { formatPrice } from "./price-format.js";

// The vertical extent of a price chart, and which prices get a gridline
// (Task 2.12.3).
//
// Two questions, and they are the same question twice: *what range of prices
// does the plot cover*, and *which of them does a person want written down*. The
// second is the one `CHARTING.md` §1 priced `d3-array` at 1,167 B gzipped for
// and then declined, on the grounds that a wrong tick fails **visibly** — which
// is this repository's own stated test for when to keep a library. That price is
// pre-approved if this file turns out to be wrong twice; §1's second reversal
// trigger is the condition, and taking it beats grinding.
//
// Nothing here touches the DOM, reads a token or reads a clock.

/**
 * How much of the plot's height is empty space, at each end.
 *
 * **Ten per cent, and the top half of it is already spent.** The lower pad is
 * legibility: a line that touches its own frame reads as clipped, and the bottom
 * of this plot is the one rule the chart draws. The upper pad is legibility
 * *and* **Epic 5's anomaly-marker lane** — `VISUAL-LANGUAGE.md`'s _Room reserved
 * for what arrives later_ puts a 16 px lane inside the plot's top padding so
 * that the markers arrive as a placement rather than as a retrofit.
 *
 * So this constant is not free to tighten. A later task that shaves it to make
 * the line fill more of the frame is spending a lane that has been allocated,
 * and the arithmetic says how much room there is: the padded domain is `1.2 ×`
 * the data's extent, so the top pad is `plotHeight / 12` — **23.3 px at
 * `--chart-height` (280) and 18.3 px at `--chart-height-compact` (220)**. Both
 * clear 16 px, and the condition that stops being true is a plot shorter than
 * **192 px**, which is below every height the density table defines.
 */
export const PRICE_DOMAIN_PAD = 0.1;

/**
 * The half-height of the domain given to a series that did not move, as a
 * fraction of its price.
 *
 * A flat series is a real case — an illiquid security, or one minute repeated —
 * and its extent is zero, which is a domain that divides by zero and paints
 * `NaN` into every coordinate. SVG draws `NaN` as **nothing**, so the symptom
 * would be a correct, empty frame rather than an error: the exact failure shape
 * this repository keeps writing down.
 *
 * Half a per cent, which puts the flat line across the middle of a plot whose
 * gridlines say how little happened. The alternatives were both worse: a fixed
 * number of cents is wrong at two different orders of magnitude across a
 * universe trading between $3 and $700, and a zero-height domain drawn as a
 * single line at the top or bottom of the frame claims a move that did not
 * happen.
 */
export const FLAT_DOMAIN_FRACTION = 0.005;

/**
 * The smallest domain half-height, in dollars, for a price at or near zero.
 *
 * A cent, so that {@link FLAT_DOMAIN_FRACTION} cannot produce a zero-height
 * domain for a zero price. No equity closes at zero and a bar that says so is
 * corrupt rather than cheap, but the arithmetic above must not be the thing that
 * discovers it.
 */
const MIN_FLAT_HALF_EXTENT = 0.01;

/**
 * The smallest gap between two gridlines, in dollars.
 *
 * One cent, because {@link formatPrice} renders two decimals and a step below a
 * cent produces **two gridlines carrying the same label** — a chart that appears
 * to have drawn the same price twice at two different heights. Rounding the
 * label and choosing the step have to agree, which is the same rule
 * `directionOf` follows for a rounded percentage.
 */
const MIN_TICK_STEP = 0.01;

/** A price that gets a gridline and a label in the value gutter. */
export interface ValueTick {
  /** The price itself, exact to the step rather than to floating-point noise. */
  readonly value: number;
  /** What the gutter writes, through this product's one price spelling. */
  readonly label: string;
}

/**
 * The vertical extent of the plot: the series' low to its high, padded.
 *
 * **Over the bars' `high` and `low`, not over their closes**, although the line
 * this chart draws is a line of closes (`CHARTING.md` §2). Three reasons, and
 * the third is the one that would be found late:
 *
 *  1. A close always sits inside its own bar's high–low, so a domain taken from
 *     the extremes can never clip the line. The reverse is not true.
 *  2. Task 2.12.5's high–low envelope, if it ships, has to fit in the frame that
 *     already exists rather than rescale it.
 *  3. The panel beside the chart prints **High** and **Low** for the same window
 *     (`series-facts.ts`'s `seriesPrices`, computed the same way). A frame that
 *     excluded a figure printed next to it would be the product disagreeing with
 *     itself in two channels at once.
 *
 * A single pass rather than `Math.min(...bars.map(…))`, for `seriesPrices`'
 * reason: the spread form applies a 10,000-bar array as an **argument list**,
 * which throws `RangeError: Maximum call stack size exceeded` on some engines —
 * a crash whose frequency depends on the window the reader chose.
 *
 * Comparison rather than summation, which is the only reason arithmetic over
 * money is allowed in JavaScript here at all: `min` and `max` are
 * order-independent, so they cannot disagree with themselves between two renders
 * the way float addition can.
 */
export function priceDomain(
  bars: readonly [Bar, ...Bar[]],
): readonly [number, number] {
  const [first, ...rest] = bars;

  let low = first.low;
  let high = first.high;

  for (const bar of rest) {
    if (bar.low < low) low = bar.low;
    if (bar.high > high) high = bar.high;
  }

  if (high > low) {
    const pad = (high - low) * PRICE_DOMAIN_PAD;
    return [low - pad, high + pad];
  }

  // Flat: every bar's high and low are the same number. See
  // FLAT_DOMAIN_FRACTION — the pad above would be zero, and a zero-height
  // domain paints NaN into every coordinate.
  const half = Math.max(
    Math.abs(high) * FLAT_DOMAIN_FRACTION,
    MIN_FLAT_HALF_EXTENT,
  );
  return [high - half, high + half];
}

/**
 * The prices that get a gridline, on numbers a person would have chosen.
 *
 * The **nice-number** rule: the step is 1, 2 or 5 times a power of ten, so the
 * labels land on 230.00 / 230.50 / 231.00 rather than on whatever the domain
 * divided into five. That is the whole difference between an axis an analyst
 * reads and one they decode, and it is the piece `CHARTING.md` §1 called "the
 * one genuinely fiddly piece".
 *
 * **Inside the domain, never beyond it.** A tick past the padded high is an axis
 * whose last label is above the top of the frame, which is the second failure
 * the task brief names by hand. The consequence is that `count` is a *target*
 * rather than a promise — a domain of 229.8 to 231.4 at a step of 0.5 has three
 * ticks in it whatever was asked for — and a caller that needed exactly five
 * would have to move the domain to get them, which would undo
 * {@link PRICE_DOMAIN_PAD}'s reserved lane.
 */
export function valueTicks(
  domain: readonly [number, number],
  count: number,
): readonly ValueTick[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `Tick count must be a positive integer, received ${String(count)}.`,
    );
  }

  const [low, high] = domain;

  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) {
    throw new RangeError(
      `Tick domain must be a real ascending interval, received ` +
        `[${String(low)}, ${String(high)}].`,
    );
  }

  const step = niceStep(high - low, count);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));

  const ticks: ValueTick[] = [];

  // Counting in whole multiples of the step rather than adding the step to a
  // running total: repeated addition of 0.1 reaches 0.30000000000000004 in four
  // steps, and a gridline at that price is one whose label and whose height
  // disagree about which number it is.
  const firstMultiple = Math.ceil(low / step);
  const lastMultiple = Math.floor(high / step);

  for (let multiple = firstMultiple; multiple <= lastMultiple; multiple += 1) {
    const value = Number((multiple * step).toFixed(decimals));
    ticks.push({ value, label: formatPrice(value) });
  }

  return ticks;
}

/**
 * The 1, 2 or 5 times a power of ten that divides `extent` into roughly `count`
 * pieces.
 *
 * The comparisons are against the boundaries where one choice stops being closer
 * than the next — 1.5, 3 and 7 — rather than against the candidates themselves,
 * so a raw step of 2.9 rounds to 2 and 3.1 rounds to 5 instead of everything
 * between 2 and 5 collapsing onto one of them.
 */
function niceStep(extent: number, count: number): number {
  const raw = extent / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;

  const nice =
    normalised < 1.5 ? 1 : normalised < 3 ? 2 : normalised < 7 ? 5 : 10;

  return Math.max(MIN_TICK_STEP, nice * magnitude);
}
