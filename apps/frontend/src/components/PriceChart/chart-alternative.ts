import { MARKET_FEED_DESCRIPTIONS } from "@marketpulse/shared";
import type { TimeRange, Timeframe } from "@marketpulse/shared";

import type {
  BarSeriesView,
  PopulatedBarSeries,
  TimeAxis,
} from "../../market/index.js";
import {
  directionOf,
  formatChangePercent,
  formatPrice,
  positionOfInstant,
  timeAxis,
} from "../../market/index.js";
import {
  changePercent,
  formatCount,
  formatMarketInstant,
  formatMarketRange,
  seriesPrices,
} from "../BarSeriesPanel/series-facts.js";

// **What the chart says to somebody who cannot see it** (Task 2.12.8).
//
// A pure function of the state, built the way `series-announcement.ts` was
// built and reusing `series-facts.ts`' vocabulary rather than inventing a
// second one for the same facts. The component holds the element; this holds
// the words, and a test that reads it as text is the only instrument that can
// argue with a clause.
//
// ## Where this sentence lives, which is the decision this task owns
//
// Task 2.12.4 took half of it: the plot's `<svg>` is `aria-hidden` with
// `focusable="false"`, because the picture is not the evidence on this page —
// the stated facts beneath it are — so a `role="img"` with a name invented for
// it would have been a promise that task had not earned. It deliberately left
// the other half open, and the choice was between two shapes:
//
//  1. Drop the `aria-hidden`, give the plot's `<svg>` `role="img"` and name it
//     with this sentence. One element carries the picture and its description,
//     which is the conventional answer.
//  2. Leave the plot hidden and put the sentence in a **sibling** — a visually
//     hidden paragraph in the picture's own position in reading order.
//
// **The second, and the argument against it is answered rather than ignored.**
// That argument is that a screen-reader user arrowing the document meets an
// image-shaped hole where a sighted reader meets a chart. It would be a real
// cost if the hole existed — and since Task 2.12.6 it does not: the reading
// layer *is* a `role="img"` with a name, sitting in the same grid cell as the
// plot, focusable, because reading a point is a thing a person does. So the
// picture already has an element, and what it lacked was a description.
//
// This sentence is therefore **one string reached two ways**: it is the
// paragraph a document reader meets where the chart is, and it is what the
// reading layer's `aria-describedby` points at, so a person who arrives on the
// chart's tab stop is told what they have arrived at before the arrow-key hint
// tells them what to do with it. One copy, two routes, and no live region — the
// rate this page announces at was settled by Task 2.12.6 and this task does not
// reopen it.
//
// The states that draw no chart — `refused` and `failed` — get `null`, and that
// is the same decision seen from the other side. Neither carries a window, the
// panel's own sentence two lines below says what happened, and a chart
// announcing its own absence would be the two-surfaces-one-sentence defect in
// the one place nothing on screen would show it.
//
// ## Why the coverage clause counts slots rather than restating the panel
//
// `BarSeriesPanel`'s coverage sentence already states the arithmetic — *how
// many bars, through which instant, of a window running to which instant* — and
// `CLAUDE.md`'s rule is that two surfaces describing one fact must not use the
// same words. What this sentence can say that the panel's cannot is where the
// data stops **on the axis it is describing**: the line covers the first 780 of
// 1,950 trading minutes and the rest of the frame is empty ground. That is the
// shape of the answer rather than the arithmetic of it, and it is the only
// channel a picture-reader has for a fact that reaches a sighted reader as a
// change of ground behind the plot.
//
// The count comes from `timeAxis` and `positionOfInstant` — the same two
// functions `chart-geometry.ts` derives the wash from — so the words and the
// pixels cannot disagree about how much of the window is drawn. It is derived
// rather than shared because the geometry's answer is in **pixels**, which are
// zero everywhere below a browser; a sentence built from those would be silent
// in exactly the environment that tests it.

/**
 * Everything the picture says, in a sentence — or `null` where there is no
 * picture.
 *
 * `null` rather than an empty string, for `readingAnnouncement`'s reason: the
 * absence is a real answer and keeping it in the type stops a caller rendering
 * an empty description that a screen reader then has to make sense of.
 */
export function chartAlternative(
  view: BarSeriesView,
  symbol: string,
): string | null {
  switch (view.state) {
    case "loading":
      // The frame is real and nothing is on it. Said plainly, because the
      // alternative — silence — is indistinguishable from a chart that has
      // finished and found nothing, which is a different state with a different
      // treatment.
      return `${symbol} price chart: the frame is drawn and the series has not arrived yet.`;

    case "empty":
      return (
        `${symbol} price chart: no line is drawn. ` +
        `No bars are stored anywhere in the window asked for, ` +
        `${formatMarketRange(view.series.coverage.requested)}, so the whole ` +
        `frame is empty ground.`
      );

    case "loaded":
    case "partial":
      return describeSeries(view.series, symbol);

    case "refused":
    case "failed":
      // No window, no frame, nothing drawn — see the header.
      return null;
  }
}

/** The picture, when there is a line on it. */
function describeSeries(series: PopulatedBarSeries, symbol: string): string {
  const prices = seriesPrices(series);
  const percent = changePercent(prices);

  return [
    `${symbol} price chart: a line of ${formatCount(series.bars.length)} ` +
      `closing prices, one per ${intervalWord(series.timeframe)}, ` +
      `opening at ${formatPrice(prices.open)} and ending at ` +
      `${formatPrice(prices.close)}${move(percent)}.`,
    `The highest price on it is ${formatPrice(prices.high)} and the lowest ` +
      `${formatPrice(prices.low)}.`,
    coverageClause(series),
    feedClause(series),
  ].join(" ");
}

/**
 * Which way the window went, as a **word**.
 *
 * The one fact on this chart that three channels carry and that only this one
 * survives the screen being off: the geometry says it, the two washes repeat
 * it, and neither reaches a listener. `formatChangePercent`'s sign is stripped
 * for `series-announcement.ts`' measured reason — a Unicode minus is read as
 * "minus", as "dash", and as nothing at all, depending on the reader — so the
 * direction is spoken and the magnitude is a plain number.
 *
 * Empty for a corrupt bar whose open is zero, which is the same case
 * `changePercent`, the reference rule and the readout all decline together.
 */
function move(percent: number | null): string {
  if (percent === null) return "";

  const direction = directionOf(percent);
  const figure = formatChangePercent(percent).replace(SIGNS, "");

  if (direction === "unchanged") return ", unchanged across the window";
  return `, ${direction === "positive" ? "up" : "down"} ${figure} across the window`;
}

/** The two signs `formatChangePercent` may put in front of a figure. */
const SIGNS = /[+\u2212]/gu;

/**
 * **How much of the frame the line actually occupies**, counted in the units
 * the axis is made of.
 *
 * The clause a picture-reader most needs and the one the Work section's minimum
 * list did not have, because it was written before the uncovered ground
 * existed. *That* the answer is short is already said in words beneath the
 * plot; what is only on the picture is *how much* of it is short — a window
 * covered to four sessions of five and one covered to 780 minutes of 990 are
 * the same sentence otherwise.
 *
 * A complete answer says so rather than saying nothing, for `Coverage`'s
 * reason: silence would make *we hold all of it* and *nobody checked* sound
 * identical.
 */
function coverageClause(series: PopulatedBarSeries): string {
  const { requested, covered } = series.coverage;
  const { total, from, to } = axisSpan(requested, series.timeframe, covered);
  const unit = slotWord(series.timeframe, total);

  if (from === 0 && to === total) {
    if (!isShort(requested, covered))
      return `The line runs the full width of the window asked for, ${formatMarketRange(requested)}.`;

    // **A short answer with nothing to draw**, which is `CHARTING.md` §10.1's
    // finding said in words rather than in pixels: the shortfall is a weekend
    // or a night, the axis is session-ordinal, and a period that contributes no
    // slots has no width for a ground to be painted in. The picture is
    // therefore complete and the answer is not, and this is the one clause in
    // this module that exists to stop the sentence agreeing with the picture
    // when the picture cannot say the thing.
    return (
      `The line runs the full width of the frame and there is no empty ground ` +
      `on it, but it is not the whole window: the window asked for runs to ` +
      `${formatMarketInstant(requested.end)} and the bars stop at ` +
      `${formatMarketInstant(covered.end)}. What is missing falls outside ` +
      `trading hours — a night, a weekend or a holiday — which this axis gives ` +
      `no width to.`
    );
  }

  const held = to - from;

  if (from === 0)
    return (
      `The line covers the first ${formatCount(held)} of ${formatCount(total)} ` +
      `${unit} in the window and stops at ${formatMarketInstant(covered.end)}; ` +
      `the rest, running to ${formatMarketInstant(requested.end)}, has no ` +
      `stored bars and is drawn as empty ground.`
    );

  // The store is missing the start of the window as well — a security listed
  // mid-window, or a backfill that began late. Cheap to be right about, because
  // both ends come off the same range.
  return (
    `The line covers ${formatCount(held)} of ${formatCount(total)} ${unit} in ` +
    `the window, from ${formatMarketInstant(covered.start)} to ` +
    `${formatMarketInstant(covered.end)}; the window asked for runs ` +
    `${formatMarketRange(requested)}, and what is not covered at either end is ` +
    `drawn as empty ground.`
  );
}

/**
 * Is this answer short of the window that was asked for?
 *
 * By instant rather than by slot, and the two genuinely differ: a shortfall
 * made of a weekend occupies no slots at all, which is the case the clause
 * above exists for.
 */
function isShort(requested: TimeRange, covered: TimeRange): boolean {
  return (
    covered.start.getTime() > requested.start.getTime() ||
    covered.end.getTime() < requested.end.getTime()
  );
}

/**
 * The window as the axis divides it, and where the covered range falls in it.
 *
 * **Through `positionOfInstant`, which is what makes this right on a
 * session-ordinal axis.** The window between Friday's close and Monday's open
 * contributes no slots at all, so a clause computed from elapsed time would
 * report a gap of two and a half days where the picture draws nothing — the
 * words disagreeing with the pixels about a fact neither can check against the
 * other.
 *
 * Clamped for `coverageOf`'s recorded reason: an instant after the last session
 * answers *one slot past the end*, which is the honest ordinal answer and is
 * one past the frame.
 */
function axisSpan(
  requested: TimeRange,
  timeframe: Timeframe,
  covered: TimeRange,
): { readonly total: number; readonly from: number; readonly to: number } {
  const axis = timeAxis(requested, timeframe);

  return {
    total: axis.slots,
    from: clamp(slotOf(axis, covered.start, 0), axis.slots),
    to: clamp(slotOf(axis, covered.end, axis.slots), axis.slots),
  };
}

/**
 * A whole slot for an instant, with an answer for the position an ordinal axis
 * genuinely does not have.
 *
 * `outside` is unreachable for a covered range — the server clamps it to the
 * requested window — so the fallback is what this file believes rather than
 * what it has seen, and it is the same pair `pixelOfInstant` chooses.
 */
function slotOf(axis: TimeAxis, instant: Date, fallback: number): number {
  const position = positionOfInstant(axis, instant);
  return position.kind === "outside" ? fallback : Math.round(position.slot);
}

function clamp(slot: number, slots: number): number {
  return Math.min(Math.max(slot, 0), slots);
}

/** What one point on the line is. */
function intervalWord(timeframe: Timeframe): string {
  return timeframe === "1m" ? "minute of trading" : "trading session";
}

/** What the axis is divided into, pluralised. */
function slotWord(timeframe: Timeframe, count: number): string {
  if (timeframe === "1d") return count === 1 ? "session" : "sessions";
  return count === 1 ? "trading minute" : "trading minutes";
}

/**
 * Which feed these prices came from, in the shipped vocabulary.
 *
 * `MARKET_FEED_DESCRIPTIONS`' words and never this module's, for `Provenance`'s
 * reason: a second table of user-facing sentences derived from the same slugs
 * is the copy that drifts. **The label only, without its sentence** — the
 * sentence is on screen beside the label, and repeating it here would make this
 * alternative the longest thing on the page for the sake of a clause a listener
 * reaches two paragraphs later anyway.
 *
 * The distinct feeds rather than one, because a stitched series truthfully
 * names more than one (`PRODUCT_SPEC.md` §7.1 — provenance is per series, and
 * there is no single true answer to *which feed is this?*).
 */
function feedClause(series: PopulatedBarSeries): string {
  const feeds = [...new Set(series.provenance.sources.map((s) => s.feed))];
  const labels = feeds.map((feed) => MARKET_FEED_DESCRIPTIONS[feed].label);

  return labels.length > 1
    ? `Market feeds: ${listOf(labels)}.`
    : `Market feed: ${listOf(labels)}.`;
}

/** `a`, `a and b`, `a, b and c` — the one place this module builds a list. */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "an unnamed feed";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1] ?? ""}`;
}
