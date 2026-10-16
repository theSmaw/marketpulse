import { marketSessionStateAt } from "@marketpulse/shared";

import type {
  PercentileRefusal,
  WireRefusedPercentile,
  WireReturnPercentile,
} from "@marketpulse/shared";

// **The percentile's words** (Task 5.3.3) — the first thing this product says
// about how unusual something is, and the first sentence on this screen that
// describes a SAMPLE rather than an observation.
//
// ## Nothing here computes a percentile
//
// The rank, the ceiling flag, the counted `n`, the grid stride and the
// baseline's tape are all the backend's, off the frame
// (`apps/backend/src/return-percentile.ts` against a 60-session distribution
// no browser holds). What this module does is **spell** them — which is
// `five-minute-return.ts`' own division of labour one file over, and invariant
// 1's: every figure a reader sees comes from deterministic code, and a renderer
// that derived a rank would be a second producer for a number nobody can
// eyeball.
//
// ## Four channels tell a percentile from a change, and three carry no colour
//
// A percentile and a change are the same kind of glyph — digits, a decimal
// point, a dot separator — and one of them is a price move. So: the **ordinal
// suffix**, because no numeral anywhere else in this product ends in `st`,
// `nd`, `rd` or `th`; the **absence of `%`**, which is AC 7 made visible rather
// than only true; the **word** `percentile` immediately after the figure; and
// the untinted ink, which is the one channel that is only a channel in colour
// and is therefore the one that does not count on its own.
//
// ## And it reads no clock — the bias clause is conditional on the FIGURE
//
// `computedAt`, `sentAt` and `Date.now()` appear nowhere in this module or in
// the component that draws it, which is the region's rule since Task 5.2.3.
// The opening-30-minutes condition is read off the figure's own `from`/`to`,
// which are bars' own `startsAt` — so a window that **ended** at 09:45 and is
// read at 11:00 still carries the clause, and the whole band stays correct
// under Epic 13's replay. A wall-clock version would drop the clause at
// exactly 10:00 for a figure that still needs it, and would be the second
// surface in this product to date a fact by when the page was opened (Task
// 4.8.12's defect).

/**
 * **How long after the bell the pooled distribution reads high: thirty
 * minutes.**
 *
 * ## Why a threshold at all, and why this is not a second observation window
 *
 * AC 8: the open is **structurally** the fattest-tailed bucket of the trading
 * day — overnight news clears into it, the auction prints into it, and spreads
 * are widest in it — and the baseline pools all 77 buckets of a session into
 * one distribution (Story 5.1's decision 3, chosen because a per-bucket
 * distribution cannot express a 99th at all). So a percentile taken in the
 * first half hour is measured against a sample whose typical member came from
 * a quieter part of the day, and it reads a perfectly ordinary open as more
 * unusual than it is.
 *
 * It is **not** a cutoff over observations and not a measurement span: it is a
 * boundary **inside** a session, expressed as an offset from that session's own
 * `open`, and `one-home-for-the-observation-window` is silent about it for the
 * same reason it is silent about the baseline's grid stride — there is no
 * minute-scaled subtraction from an instant anywhere in it.
 *
 * ## Thirty rather than five or sixty
 *
 * Thirty minutes is **six** of the baseline's 5-minute buckets, which is where
 * the published intraday volatility curve has flattened to within sight of the
 * midday level; five minutes would be the auction alone and would leave the
 * next five buckets uncovered, and an hour would put the clause on screen for
 * 15% of the session, which teaches a reader to stop reading it.
 *
 * **Reversal trigger, a condition:** the first time this product measures its
 * own by-bucket distribution — which is the per-bucket baseline Story 5.1
 * rejected and the thing that would replace this clause with arithmetic
 * instead of a sentence.
 */
export const OPENING_BIAS_MINUTES = 30;

const MS_PER_MINUTE = 60_000;

/**
 * **Does the figure's own measured window reach into the opening bucket?**
 *
 * Read off the two instants the frame already carries, and `false` for
 * anything outside a session — a pre-market or after-hours window is a
 * different and larger bias (the baseline's grid is regular-session only), and
 * one clause cannot carry two facts.
 *
 * The test is an **overlap** rather than a containment: a window running
 * 09:28 → 09:33 is mostly the auction, and a window running 09:55 → 10:00 is
 * not the open at all.
 *
 * `marketSessionStateAt` is the one home for *which session is this instant
 * in*, and it is already read on this screen from a bar's instant — the
 * identity block's `pre-market` qualifier is `extendedHoursAt`, the same
 * function one layer down. It refuses a date outside the checked-in calendar
 * rather than guessing, which is deliberate there and inherited here.
 */
function reachesTheOpen(from: Date, to: Date): boolean {
  const state = marketSessionStateAt(from);
  if (state.status === "holiday" || state.status === "weekend") return false;

  const open = state.session.open.getTime();

  return (
    to.getTime() > open &&
    from.getTime() < open + OPENING_BIAS_MINUTES * MS_PER_MINUTE
  );
}

/**
 * `1st`, `2nd`, `3rd`, `11th`, `42nd` — the suffix, for an integer rank.
 *
 * The teens are the whole reason this is a function: `11st`, `12nd` and `13rd`
 * are what a `% 10` alone produces, and the rank this draws most often is in
 * the nineties where a `% 10` is right.
 */
function ordinalSuffix(rank: number): string {
  if (rank % 100 >= 11 && rank % 100 <= 13) return "th";

  switch (rank % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * **The figure's second cell: `99th percentile`, or `>99th percentile` at the
 * ceiling.**
 *
 * ## Integer ordinals, and the ceiling is the owner's decision
 *
 * Gate 1 decision 2. The binomial standard error at the 99th of n = 4,620 is
 * **0.146 points**, so `99.1st percentile` — `PRODUCT_SPEC.md` §11's own
 * example, which now carries a dated amendment — is a precision the sample
 * cannot resolve. And `100th` is never drawn: above the highest order statistic
 * there is no sample, so it would assert a strict maximum over a distribution
 * that deliberately excludes the window being scored.
 *
 * `>99th` is therefore the **stronger** statement rather than a clamp hiding
 * one — it says the baseline holds nothing as large as this move, which is what
 * a reader at the extreme actually wants to know. The producer decides which
 * of the two this is (`aboveSample`), so the renderer cannot invent a ceiling.
 *
 * **No `%`, ever** (AC 7), and the word is spelled out: a `99` beside a
 * `+0.42%` formatted by the same decimals is two numbers of visibly the same
 * kind, and only one of them is a price move.
 */
export const percentileReading = (percentile: PercentileFigure): string =>
  `${percentileOrdinal(percentile)} percentile`;

/**
 * **What the two surfaces that draw a percentile have in common, and it is
 * two fields** (Task 5.4.3).
 *
 * `WireReturnPercentile` is the security page's shape and carries the sample,
 * the span and the baseline's tape beside the ordinal; `WireUnusualRow` is a
 * ranked row on the landing page and hoists those three to its section,
 * because they are the same for every row on a frame. Neither is the other,
 * and widening one to the other would put three fields on a row for 124 bytes
 * apiece.
 *
 * So the **reading** takes the minimum it reads. A `Pick` rather than a new
 * interface, so a rename of either field on the wire is a compile error here
 * rather than a structural type that silently stops matching.
 */
type PercentileFigure = Pick<WireReturnPercentile, "rank" | "aboveSample">;

/**
 * **The ordinal alone — `99th`, or `>99th` at the ceiling** (Task 5.4.3).
 *
 * ## One fact, two renderings, and the short one is DERIVED from the long one
 *
 * `Unusual activity` draws ten ordinals in a 64 px cell on a 308 px row, where
 * `>99th percentile` is sixteen glyphs and 143.6 px in the cold-load face —
 * which leaves the company name about six characters. So the **word** moves to
 * the list heading, once, and the row draws this; a listener still gets the
 * whole phrase from a visually-hidden sibling built by
 * {@link percentileReading}.
 *
 * That is ADR 0029's *a drawn sentence and its spoken twin are one string with
 * two renderings* rather than a second copy of the ordinal's spelling — and
 * the dependency runs this way round deliberately: `percentileReading` is the
 * sentence the security page has shipped since Story 5.3, so the new, shorter
 * form is the one that must not be able to drift.
 *
 * **The ceiling cannot move.** `100th` is never printed — above the highest
 * order statistic there is no sample — so `>99th` is the widest string this
 * cell will ever hold, which is why the 64 px track has no reversal trigger.
 */
export const percentileOrdinal = (percentile: PercentileFigure): string =>
  `${percentile.aboveSample ? ">" : ""}${String(percentile.rank)}${ordinalSuffix(percentile.rank)}`;

/**
 * **What the percentile was taken against — the sample's size and its shape,
 * in one line, with no terminal stop.**
 *
 * ## The denominator is not a caveat, it is what the figure IS
 *
 * `Market breadth`'s rule, one route over: a figure over a sample states the
 * sample. A `99th percentile` with nothing beside it is the same claim whether
 * `n` is 737 or 4,620 — and the measured range over this universe is exactly
 * that (Task 5.3.2) — so the count travels and is **read**, never a constant.
 * `5-minute` is read off the frame too, because the baseline's grid stride is
 * the sampler's constant and the product already spells `5` three times with
 * three homes (ADR 0043, and `return-baseline.ts`' `SAMPLE_SPAN_MINUTES`).
 *
 * ## `all times of day pooled` is always there, and that is AC 8's answer
 *
 * The sample's **shape** beside its size. The distribution pools every
 * five-minute bucket of every session in the window, which is a fact about
 * what the figure means rather than a warning about it — the same register
 * breadth uses for *heard from in the last 5 minutes*. Three words, always,
 * so a reader learns once what kind of comparison this is.
 *
 * Then, when **the figure's own window** reaches the opening bucket, the three
 * words are replaced by the thing a reader needs at that moment: the open is
 * the fattest-tailed part of the day, so this reading is high for a structural
 * reason and not because the market is unusual. It replaces rather than
 * appends, because *pooled* is the subject of both.
 */
export function percentileSample(
  percentile: WireReturnPercentile,
  from: Date,
  to: Date,
): string {
  const of =
    `of ${percentile.sampleCount.toLocaleString("en-US")} ` +
    `${String(percentile.spanMinutes)}-minute returns`;

  if (!reachesTheOpen(from, to)) return `${of} · all times of day pooled`;

  return (
    `${of} · opening ${String(OPENING_BIAS_MINUTES)} minutes, ` +
    "the fattest-tailed bucket — pooled, this reads high"
  );
}

/**
 * **The two sentences for a figure with no percentile beside it** (Task 5.3.4)
 * — and the whole reason there are two is that *we have too little history*
 * and *the history we have contains a price break we cannot adjust* are
 * different facts with different repairs.
 *
 * ## Why neither is one of the twelve already approved
 *
 * The register is inherited — short, no connection word, no status word, no
 * terminal stop — and the strings are not. `five-minute-return.ts`' four say
 * *no figure*: `No bars observed yet`, `No bar five minutes back`, `No basis
 * for a percentage` and the region's own `No return yet.`, and
 * `relative-performance.ts`' eight are about a **comparison between two
 * securities**. Every one of them stands **where a figure would be**, and
 * these two stand in the **footer** where the sample would be, beside a figure
 * that drew perfectly well. A refusal of the comparison is not a refusal of
 * the number, and reusing a sentence that means *there is no figure* would say
 * the one thing that is false here.
 *
 * ## The sample one covers TWO facts, so there is no thirteenth sentence
 *
 * `Baseline too short to rank — 737 of 2,500 returns` is the sentence, and
 * `0 of 2,500 returns` is a **true** statement about a cold replica, a
 * security with no stored `sip` history and every gated run. *We hold too
 * little* and *we hold none* differ in a number the sentence already prints,
 * which is `Market breadth`'s rule — a figure over a sample states the sample
 * — rather than the collapse Story 5.1 shipped for a day, where two states
 * with **different** repairs shared one string.
 *
 * **Both numbers are read, neither spelled.** The count is the pass's
 * (Gate 1 decision 2) and the bound is **the one the producer applied** rather
 * than the one this bundle believes in: a rollback can put a gateway and a
 * bundle two values apart, which is `spanMinutes`' own argument one sentence
 * up.
 *
 * ## And the split one must not read like it
 *
 * It names a **price break** rather than a split, because that is all the
 * detector knows: `SPLIT_DISCONTINUITY_RATIO` catches a session-boundary jump
 * beyond a ratio, and Task 5.3.2 measured five securities over it of which
 * **four** sit on exact split factors and one — `MRNA` — is a reverse split
 * *or a genuine event*. A sentence saying *split* would be a claim about a
 * corporate action this product has not read a calendar for, which is
 * invariant 5's confidence level smuggled into prose.
 *
 * `not comparable` rather than a count, because the count is not the problem:
 * the security may have all 4,620 samples and every one of them is measured
 * across a price we cannot adjust.
 *
 * **A total record over `PercentileRefusal`**, so a third refusal word on the
 * wire is a **compile error naming the missing member** rather than an
 * `undefined` reaching the footer row — `MARKET_FEED_DESCRIPTIONS`' guard and
 * `five-minute-return.ts`' `REFUSALS`, pointed at a union that crosses a
 * socket.
 */
const BASELINE_REFUSALS: Readonly<
  Record<PercentileRefusal, (refused: WireRefusedPercentile) => string>
> = {
  "too-few-samples": (refused) =>
    "Baseline too short to rank — " +
    `${refused.sampleCount.toLocaleString("en-US")} of ` +
    `${refused.minimumSampleCount.toLocaleString("en-US")} returns`,
  "split-discontinuity": () =>
    "Baseline crosses an unadjusted price break — not comparable",
};

/**
 * **Why this figure has no percentile, in the row the sample would have
 * used** (Task 5.3.4).
 *
 * It replaces a clause rather than adding a row, which is what keeps the
 * region one height: the footer row is reserved for the bias clause at every
 * width and both of these are shorter than it.
 */
export const percentileRefusal = (refused: WireRefusedPercentile): string =>
  BASELINE_REFUSALS[refused.refusal](refused);
