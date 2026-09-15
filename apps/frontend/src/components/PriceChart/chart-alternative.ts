import { describeSeriesFeeds, distinctSeriesFeeds } from "@marketpulse/shared";
import type { BarSeries, TimeRange, Timeframe } from "@marketpulse/shared";

import type {
  BarSeriesView,
  PopulatedBarSeries,
  TimeAxis,
} from "../../market/index.js";
import type { StoredHistory } from "./chart-vacancy.js";
import {
  directionOf,
  formatBarInstant,
  formatChangePercent,
  formatPrice,
  positionOfInstant,
  spokenVolume,
  timeAxis,
  volumePeak,
  volumePeakBar,
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
  pending = false,
  stored: StoredHistory = "unknown",
): string | null {
  const described = chartAlternativeBody(view, symbol, stored);

  return described === null ? null : `${described}${waitClause(pending)}`;
}

function chartAlternativeBody(
  view: BarSeriesView,
  symbol: string,
  stored: StoredHistory,
): string | null {
  switch (view.state) {
    case "loading":
      // The frame is real and nothing is on it. Said plainly, because the
      // alternative — silence — is indistinguishable from a chart that has
      // finished and found nothing, which is a different state with a different
      // treatment.
      return `${symbol} price chart: the frame is drawn and the series has not arrived yet.`;

    case "empty":
      // **The schedule clause is here and nowhere else** (2026-09-14). It used
      // to be the second half of `BarSeriesPanel`'s `EmptyState`, which moved
      // into the plot as `ChartVacancy` — and `ChartVacancy` is `aria-hidden`,
      // because everything it says is already said here. Moving a visible
      // sentence out of the accessibility tree without checking what it carried
      // is how a fact disappears for one audience only, so this is the clause
      // that had no spoken home and now has exactly one: the price chart's, not
      // the volume chart's, for the same reason the visible detail line is on
      // the price plot alone.
      //
      // **And it is the clause Task 2.14.6 had to fork**, because it was case
      // two's explanation asserted for both. *Stored history is caught up
      // overnight* is a true and useful thing to hear about a window that
      // reaches into the current session, and a wrong one about a security we
      // hold nothing for at all — where nothing the listener does helps and
      // waiting for tonight's backfill is precisely what does. A visible
      // sentence forked while the spoken one was left saying the old thing
      // would be the same defect with one audience left in it.
      //
      // **Worded to be heard rather than lifted from the plot**, which is this
      // module's standing rule and which a browser run insisted on: the drawn
      // sentence says *changing the window will not help* beside a control the
      // reader can see, and this one says *a different window will not change
      // that*, referring back to the empty frame it has just described. Two
      // channels quoting one string is also a strict-mode failure for any spec
      // matching on it — `readable()` does not filter a visually-hidden
      // paragraph, because `clip` is still `:visible`.
      if (stored === "none") {
        return (
          `${symbol} price chart: no line is drawn. ` +
          `${frameClause(view.series)} ` +
          `No history is stored for ${symbol} at this timeframe, so the ` +
          `whole frame is empty ground. A different window will not change ` +
          `that; the store is filled overnight.`
        );
      }

      return (
        `${symbol} price chart: no line is drawn. ` +
        `${frameClause(view.series)} ` +
        `No bars are stored anywhere in the window asked for, ` +
        `${formatMarketRange(view.series.coverage.requested)}, so the whole ` +
        `frame is empty ground. Stored history is caught up overnight.`
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

/**
 * **Which mark the coverage sentence is about**, so that one clause can serve
 * two plots without either of them reading as the other's leftovers.
 *
 * The coverage *fact* is one fact — both plots hang on one axis and stop at one
 * pixel — but a sentence has a subject, and `FRONTEND-STATE.md` §7's rule is
 * that a surface's sentences name theirs. Two hidden paragraphs that both said
 * "the line" would be the two-surfaces-one-sentence defect with the volume plot
 * describing the price plot's picture.
 *
 * A verb per subject rather than a pluralisation helper: there are two of them,
 * for ever, and "the columns run" is easier to read in the template than a call
 * that agrees it.
 */
interface Mark {
  readonly subject: string;
  readonly run: string;
  readonly cover: string;
  /**
   * The **second** verb of the short-answer clause, and it is here because it
   * was missing (Task 2.13.8).
   *
   * `The columns cover the first 780 of 990 trading minutes in the window and
   * stops at 16:00` shipped in Task 2.13.4 and was heard for the first time on
   * this story's walk. The plural subject was parameterised and the verb three
   * clauses later was not — which is the shape of defect a singular-only test
   * suite cannot see, and `volumeAlternative` had no unit test at all until
   * this task gave it one.
   */
  readonly stop: string;
  readonly behind: string;
}

const LINE: Mark = {
  subject: "The line",
  run: "runs",
  cover: "covers",
  stop: "stops",
  behind: "on it",
};

const COLUMNS: Mark = {
  subject: "The columns",
  run: "run",
  cover: "cover",
  stop: "stop",
  behind: "behind them",
};

/**
 * **The volume plot, in a sentence** (Task 2.13.4) — or `null` where there is no
 * picture.
 *
 * The volume plot's SVG, its one value label and its two dates are all
 * `aria-hidden`, for the same reasons the price chart's are: they are labels
 * *on a picture* rather than facts, and read aloud in document order they are a
 * bare abbreviated number and two dates with no subject between them. Without
 * this paragraph the Volume region would be a heading with nothing in the
 * accessibility tree under it at all.
 *
 * It states the **peak and when it happened**, which is the figure this plot
 * exists to make checkable and the one Epic 5 later qualifies as a multiple
 * ("volume 3.8× normal"). Abbreviation is for the axis; the sentence speaks the
 * magnitude as a word (`spokenVolume`), so the two channels quote the same
 * figure to the same precision and only the magnitude differs.
 *
 * **Task 2.13.5's readout replaces none of this.** A readout answers *what is
 * this bar*; this answers *what is this picture*, which is the question a
 * listener cannot ask a crosshair.
 */
export function volumeAlternative(
  view: BarSeriesView,
  symbol: string,
  pending = false,
  stored: StoredHistory = "unknown",
): string | null {
  const described = volumeAlternativeBody(view, symbol, stored);

  return described === null ? null : `${described}${waitClause(pending)}`;
}

function volumeAlternativeBody(
  view: BarSeriesView,
  symbol: string,
  stored: StoredHistory,
): string | null {
  switch (view.state) {
    case "loading":
      return `${symbol} volume chart: the frame is drawn and the columns have not arrived yet.`;

    case "empty":
      // Its own subject, in both cases — the shipped convention, and the
      // reason the drawn answer is four literals rather than two. The schedule
      // clause stays on the price chart's sentence alone, which is where the
      // visible detail line is for the same reason.
      if (stored === "none") {
        return (
          `${symbol} volume chart: no columns are drawn. ` +
          `${frameClause(view.series)} ` +
          `No volume history is stored for ${symbol} at this timeframe, so ` +
          `the whole frame is empty ground.`
        );
      }

      return (
        `${symbol} volume chart: no columns are drawn. ` +
        `${frameClause(view.series)} ` +
        `No bars are stored anywhere in the window asked for, ` +
        `${formatMarketRange(view.series.coverage.requested)}, so the whole ` +
        `frame is empty ground.`
      );

    case "loaded":
    case "partial":
      return describeVolume(view.series, symbol);

    case "refused":
    case "failed":
      return null;
  }
}

/** The picture, when there are columns on it. */
function describeVolume(series: PopulatedBarSeries, symbol: string): string {
  return [
    `${symbol} volume chart: ${formatCount(series.bars.length)} columns of ` +
      `traded volume, one per ${intervalWord(series.timeframe)}, measured from ` +
      `a baseline of zero to the window's busiest ${slotUnit(series.timeframe)}.`,
    frameClause(series),
    peakClause(series),
    coverageClause(series, COLUMNS),
    feedClause(series),
  ].join(" ");
}

/**
 * The window's peak, and when it happened.
 *
 * **The plot's ceiling is the peak** (§9.3 — the domain is zero to the peak,
 * unpadded), so this sentence is what the tallest column means, said once. The
 * gutter writes the same figure abbreviated; a listener gets it as a magnitude
 * word and an instant, because "the top of the scale" is not a fact anybody can
 * read off a picture they cannot see.
 *
 * A window in which nothing traded is a real answer and says so, rather than
 * reporting a peak of zero shares at an arbitrary minute — `FLAT_VOLUME_TOP`
 * exists on the scale for exactly that window.
 */
function peakClause(series: PopulatedBarSeries): string {
  const peak = volumePeak(series.bars);
  if (peak <= 0) return "No shares changed hands anywhere in the window.";

  // **The same derivation the strip's resting state reads** (Task 2.13.5).
  // It was a `find` here and would have been a second one there, which is two
  // sites deriving one fact — and the way a sentence and a strip come to name
  // two different busiest minutes with neither obviously wrong.
  const busiest = volumePeakBar(series.bars);

  // **`formatBarInstant` and not `formatMarketInstant`** since Task 2.13.6, and
  // the difference is the subject rather than the precision. This instant belongs
  // to a **bar**, and at `1d` a bar is a session with no time of day in it — so
  // it is spelled the way the two readout strips spell a bar, which is also the
  // one place that rule lives. `formatMarketInstant` keeps the instants in this
  // file that belong to a **window**, where a second genuinely exists.
  return (
    `The tallest column is ${spokenVolume(peak)}` +
    (busiest === null
      ? ""
      : `, at ${formatBarInstant(busiest.startsAt, series.timeframe)}`) +
    "."
  );
}

/** The singular of `slotWord`, for a sentence that names one of them. */
function slotUnit(timeframe: Timeframe): string {
  return timeframe === "1d" ? "session" : "trading minute";
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
    frameClause(series),
    `The highest price on it is ${formatPrice(prices.high)} and the lowest ` +
      `${formatPrice(prices.low)}.`,
    coverageClause(series, LINE),
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
 * **Which window this is a picture of**, said as the number the reader chose
 * (Task 2.13.8).
 *
 * Until Task 2.13.6 there was one window and nobody had picked it, so a
 * sentence that named its two instants named everything there was to name. Now
 * the window is a **choice**, made on a control whose readout says `5 SESSIONS`
 * and reported by the held-window rail as *the 5-session window* — and this
 * sentence was the one surface describing the picture that never said which of
 * the five it was describing. A `1m` frame states its width in trading minutes,
 * so a listener on the `1M` window heard *8,190 trading minutes* and had to do
 * the division; a `1d` frame that is completely covered stated no count at all.
 *
 * **The count is the resolved one and it comes off the axis**, which is the
 * half that makes it true rather than merely present: `?sessions=7` is an
 * address this product honours (§4b), an agent's `setTimeWindow` may ask for
 * thirty, and a window resolved across a holiday is **five sessions over seven
 * calendar days**. `axis.sessions` is what the picture is actually divided
 * into, so this clause and the seams a sighted reader counts are the same
 * number by construction.
 *
 * It is `timeAxis` again rather than a second derivation, for the reason
 * `CLAUDE.md`'s gap list carries: the sentence and the wash agree only because
 * both count the same axis, and a clause computed from elapsed days would
 * report *eight* here — one for Thanksgiving and two for the weekend, neither
 * of which this axis gives any width to at all.
 *
 * One vocabulary with the control and the rail: **sessions**, never `1M`. §4(e)
 * settled that the count is the fact and the label is the approximation.
 *
 * *"Drawn across"* rather than *"N sessions wide"*, which is a smaller word and
 * a real difference: an **absolute** window can ask for one hour of one session
 * — `flat.json` is exactly that, and Epic 13's scrubber will produce them
 * routinely — and a frame holding sixty minutes of a session is drawn *across*
 * one session without being one session wide. The named form the control sends
 * is always whole sessions, so the two readings only diverge where the address
 * cannot go today; the wording that stays true in both costs nothing.
 */
function frameClause(series: BarSeries): string {
  const axis = timeAxis(series.coverage.requested, series.timeframe);
  const sessions = axis.sessions.length;

  return (
    `The frame is drawn across ${formatCount(sessions)} trading ` +
    `${sessions === 1 ? "session" : "sessions"}.`
  );
}

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
function coverageClause(series: PopulatedBarSeries, mark: Mark): string {
  const { requested, covered } = series.coverage;
  const { total, from, to } = axisSpan(requested, series.timeframe, covered);
  const unit = slotWord(series.timeframe, total);

  if (from === 0 && to === total) {
    if (!isShort(requested, covered))
      return `${mark.subject} ${mark.run} the full width of the window asked for, ${formatMarketRange(requested)}.`;

    // **A short answer with nothing to draw**, which is `CHARTING.md` §10.1's
    // finding said in words rather than in pixels: the shortfall is a weekend
    // or a night, the axis is session-ordinal, and a period that contributes no
    // slots has no width for a ground to be painted in. The picture is
    // therefore complete and the answer is not, and this is the one clause in
    // this module that exists to stop the sentence agreeing with the picture
    // when the picture cannot say the thing.
    // **"What is stored reaches only to" and not "the bars stop at"**, which
    // was the wording until Task 2.13.8's walk heard it at `1d`. Both instants
    // here belong to a **window** rather than to a bar (§30.2), and at `1d` the
    // two are genuinely different facts: `daily.json`'s last bar is Sep 11 and
    // its ledger's covered range runs to `Sep 13 00:04:11`, the moment a
    // backfill finished. *The bars stop at Sep 13* was therefore false by two
    // sessions on every daily window, and true-by-coincidence on every minute
    // one, where a covered range ends at a session close.
    return (
      `${mark.subject} ${mark.run} the full width of the frame and there is no ` +
      `empty ground ${mark.behind}, but it is not the whole window: the window ` +
      `asked for runs to ` +
      `${formatMarketInstant(requested.end)} and what is stored reaches only ` +
      `to ${formatMarketInstant(covered.end)}. What is missing falls outside ` +
      `trading hours — a night, a weekend or a holiday — which this axis gives ` +
      `no width to.`
    );
  }

  const held = to - from;

  if (from === 0)
    return (
      `${mark.subject} ${mark.cover} the first ${formatCount(held)} of ${formatCount(total)} ` +
      `${unit} in the window and ${mark.stop} at ${formatMarketInstant(covered.end)}; ` +
      `the rest, running to ${formatMarketInstant(requested.end)}, has no ` +
      `stored bars and is drawn as empty ground.`
    );

  // The store is missing the start of the window as well — a security listed
  // mid-window, or a backfill that began late. Cheap to be right about, because
  // both ends come off the same range.
  return (
    `${mark.subject} ${mark.cover} ${formatCount(held)} of ${formatCount(total)} ${unit} in ` +
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
 * `MARKET_FEED_DESCRIPTIONS`' words and never this module's, for the source
 * note's reason: a second table of user-facing sentences derived from the same
 * slugs is the copy that drifts. **The label only, without its sentence** — the
 * sentence is on screen beside the label, and repeating it here would make this
 * alternative the longest thing on the page for the sake of a clause a listener
 * reaches two paragraphs later anyway.
 *
 * ## Two feeds name the split, with its counts — 2026-09-14 (Task 2.14.3)
 *
 * A stitched series truthfully names more than one feed (`PRODUCT_SPEC.md`
 * §7.1 — provenance is per series, and there is no single true answer to *which
 * feed is this?*). What this clause used to say about one was `Market feeds:
 * All US exchanges and IEX.`, which names both and says **which bars are
 * which** about neither — so a listener to a 782-bar chart whose last two bars
 * are IEX and a listener to one that is half and half were told the same thing.
 *
 * `PROVENANCE.md` §2.2 settles that for the whole product: the split is named
 * in contribution order **with the bar counts**, never sorted and never
 * collapsed to whichever feed is first. The structure comes from
 * `describeSeriesFeeds`, which the source note reads too — so the visible claim
 * and the spoken one are the same facts in two media rather than two
 * vocabularies for one fact.
 *
 * The single-feed sentence is unchanged, which is every series a server can
 * currently produce.
 */
function feedClause(series: PopulatedBarSeries): string {
  const stretches = describeSeriesFeeds(series.provenance);

  if (distinctSeriesFeeds(series.provenance).length <= 1) {
    return `Market feed: ${stretches[0].label}.`;
  }

  const split = stretches.map(
    (stretch) => `${formatCount(stretch.barCount)} from ${stretch.label}`,
  );

  return `Stitched: ${listOf(split)}.`;
}

/** `a`, `a and b`, `a, b and c` — the one place this module builds a list. */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "an unnamed feed";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1] ?? ""}`;
}

/**
 * **What a listener is told while the pending panel is up** (2026-09-14, §80).
 *
 * The panel is a wordless block and it is `aria-hidden`, so without this clause
 * a sighted reader is told a newer answer is coming and a listener is told
 * nothing at all — a fact with one audience, which is the shape of defect this
 * chart's alternative exists to prevent.
 *
 * Appended to whatever the state already says rather than replacing it, because
 * both facts are true at once and the reader needs the first one more: the
 * picture under the panel is still a true picture of the window it is labelled
 * with, and *that* is what a listener is most likely to have been reading.
 *
 * Empty rather than a sentence when nothing is pending, so the common case adds
 * no characters and the concatenation stays one string.
 */
function waitClause(pending: boolean): string {
  return pending ? " A newer answer is on its way." : "";
}
