import { COMPOSITE_FACTORS, FACTOR_WEIGHTS } from "@marketpulse/shared";

import { measuredWindow } from "./measured-set.js";

import type {
  AnomalyBand,
  CompositeFactor,
  FactorInapplicability,
  FactorRefusal,
  WireAbsentClause,
  WireAnomalyOutcome,
  WireMarketOverview,
} from "@marketpulse/shared";
import type { SymbolReturnView } from "./live-feed.js";

// **The composite score's words** (Task 5.6.5) — the first band of
// `Abnormal-move indicators` and the first 0–100 figure this product draws.
//
// ## Nothing here scores, adds or ranks
//
// The score, the band, every weight, every contribution and the maximum arrive
// decided, off the `return` frame, computed by `scoreAnomaly` in
// `packages/shared/src/composite-score.ts` and **re-checked as a value** by
// `readAnomalyScore` before this module ever sees one: the published
// contributions are re-added to the score they were sent beside and the whole
// explanation is refused on a disagreement. So `+` appears nowhere in this
// file. A browser that re-added the column would be a second producer for the
// one arithmetic this band exists to let a reader check by eye, and the
// addition on screen would be checkable against a figure this module had
// derived rather than against the one the scorer published.
//
// The one arithmetic in the drawn band is the reader's: `38 + 23 = 61`, with
// every addend and the sum on screen. That closes **by construction** — the
// score *is* the sum of the rounded contributions (`composite-score.ts`'
// `contributionOf`), so the column cannot disagree with the figure above it.
//
// ## The explanation is a LEDGER rather than prose
//
// The factor figures, their definitions, their counted samples and their tapes
// are **already drawn in this region**, a hundred pixels down: `99th
// percentile of 4,620 5-minute returns · all times of day pooled` is
// `return-percentile.ts`' sentence and has one home. A paragraph here
// restating it is a second home for one fact, which ADR 0029 forbids by name
// and which is the `BarSeriesPanel` duplicate this product has already
// deleted once. **So the ledger carries only what the factor bands cannot:
// the weight, the contribution, and a short reason for an absence.**
//
// ## Fixed arity is how a variable account reserves its room
//
// AC 6 wants one clause per contributing factor **and** one per absent factor
// — exhaustive and mutually exclusive — so the clause set is **total over the
// factors**: a row per factor in every state, in `COMPOSITE_FACTORS`' order,
// whether it contributed, refused, or has no distribution to be ranked
// against. `Movers`' held-row lesson generalised from rows to clauses, and the
// property that follows is the one the probe checks: **`3 of 3` and `0 of 3`
// are the same height.**
//
// ## It reads no clock
//
// `computedAt`, `sentAt` and `Date.now()` appear nowhere here, which is this
// region's rule since Task 5.2.3. The score is dated by the figures it is
// computed from, and those instants are drawn by the band below it.

/**
 * The micro label over the figure — **and it is the cheaper half of AC 11.**
 *
 * A 0–100 figure on an amber ramp beside a price is read as a risk meter by
 * every stranger, and §40's criterion is a first-time viewer understanding the
 * product in a minute. So the denial is **above** the figure, where a reader
 * meets it in the same glance rather than in a footnote under a ledger.
 *
 * The string in the DOM is sentence case and the drawing is uppercase, which
 * is the region's idiom: a listener is read `How unusual · not a risk measure`
 * rather than six shouted words.
 */
export const SCORE_LABEL = "How unusual · not a risk measure";

/**
 * **The scale, drawn beside the figure and doing three jobs** — of which the
 * third is the one that earns it its line.
 *
 * It says the figure is bounded; it says this is neither a price nor a
 * percentage; and it is **the cheapest defence against the risk-meter
 * misread**, because a needle on an arc says _risk_ and `61 / 100` says _a
 * count on a stated scale_. The arc is refused for exactly that reason.
 *
 * **It is the scale and never the maximum.** A two-factor score can reach 75
 * and not 100, and that is said in {@link summaryOf} where it belongs: writing
 * `61 / 75` here would be AC 3's renormalisation arriving in the
 * **denominator** instead of the arithmetic, and it would make two securities'
 * figures incomparable while looking like one scale.
 */
export const SCORE_SCALE = "/ 100";

/**
 * **AC 11's reserved line, and it is deliberately not in `SourceNote`.**
 *
 * That note is about _where numbers came from_; what a figure **means** is not
 * provenance, and a sentence filed under provenance is where boilerplate goes
 * to be ignored. It is drawn only where there is a score — there is nothing to
 * disclaim over a refusal — and the line's **room is reserved in every
 * state**, which is what keeps `0 of 3` the same height as `3 of 3`.
 */
export const SCORE_DISCLAIMER =
  "A measure of how unusual, not of risk or opportunity.";

/**
 * **The words standing where the figure would be, and `0` is not one of
 * them.**
 *
 * `0` claims _we measured, and nothing is unusual_, which is a statement about
 * the security; this state is a statement about **us**. And never a dash: `—`
 * is `unchanged` in `PriceChange`, so a dash in the figure slot asserts a
 * zero score — the same trap `five-minute-return.ts` and `volume-ratio.ts`
 * each refuse one band down.
 *
 * It is this product's permanent state on CI — 516 securities, zero bars, no
 * baseline generation — and on every store with no provider.
 */
export const NO_SCORE = "No factor could be scored";

/** The row's own name, in the register the ledger's heading sets. */
const FACTOR_NAMES: Readonly<Record<CompositeFactor, string>> = {
  price: "Price",
  // **Not `Excess move`.** The region below it is named `Relative
  // performance` and draws the same comparison, so the ledger's word is the
  // one already on the screen. `excess` is the producer's word for the
  // quantity and `relative move` is the reader's for the subject.
  excess: "Relative move",
  volume: "Volume",
};

/**
 * **The reason cell gets 24 characters, and the full sentence stays in the
 * factor's own band.**
 *
 * A refusal kind that cannot be told from its neighbour in 24 characters gets
 * a **wider cell, never a softer word** — so each string below is the shortest
 * phrase that still names the thing a reader could act on. The pair Story 5.5
 * handed over survives the compression: `baseline still filling` (22) against
 * `no IEX volume history` (21) — **a wait** against **a gap in our
 * listening**.
 *
 * **A total record over {@link FactorRefusal}**, which is the union of three
 * factors' vocabularies, so a word added to any of them is a compile error
 * naming the missing member rather than an `undefined` reaching a cell. Where
 * a word is shared by more than one factor — `split-discontinuity` is all
 * three's — the reason is shared too, because it is the same fact about the
 * same closes.
 */
const REFUSAL_REASONS: Readonly<Record<FactorRefusal, string>> = {
  // *We have some history and not enough of it.* A wait: tonight's pass adds
  // a session.
  "too-few-samples": "baseline still filling",
  "too-few-sessions": "too little IEX history",
  // *The history crosses a price break we cannot adjust.* Never the word
  // *split* — the detector reads a session-boundary ratio and has read no
  // corporate-action calendar.
  "split-discontinuity": "unadjusted price break",
  // **The benchmark's break rather than this security's**, which is a
  // different sentence, refuses every constituent of one sector at once, and
  // is repaired somewhere else entirely.
  "reference-split-discontinuity": "benchmark price break",
  // The two moves were measured from different closes, so the subtraction is
  // refused — `Relative performance`'s own refusal, inherited rather than
  // re-worded, and reachable every day between the overnight backfill and the
  // next bell.
  "mixed-basis": "moves from two closes",
  "no-subject-move": "no move for this name",
  "no-reference-move": "no benchmark move",
  // *We have never heard IEX for this security* — a gap in our listening
  // rather than a wait, and the state of every machine with no provider.
  "no-same-tape-baseline": "no IEX volume history",
  "zero-volume-baseline": "no typical IEX minute",
  "no-bar-in-bucket": "no IEX bars in 5 min",
  "bucket-partially-observed": "IEX heard in part",
};

/**
 * **Why the question does not arise**, which is not a refusal and must not
 * read like one: no waiting, backfilling or repairing will ever produce this
 * figure.
 */
const INAPPLICABLE_REASONS: Readonly<Record<FactorInapplicability, string>> = {
  "no-sector": "no sector to compare",
  "is-benchmark": "it is the benchmark",
};

/**
 * **A figure with no distribution behind it** — the arm every machine's volume
 * factor is permanently in.
 *
 * The factor **has** its figure (`4.1× typical`, drawn two bands down where it
 * is drawable) and what is missing is the history to rank it against:
 * migration `0015` stores a median and a dispersion rather than a
 * distribution, so no security in the universe has a rankable volume figure
 * and none will until a new nightly pass exists. It is neither *refused* nor
 * *inapplicable*, which is the argument at `FactorAnswer`'s fourth arm.
 */
const NO_DISTRIBUTION_REASON = "no history to rank it";

/**
 * **Breadth is a stated clause and never a weight** (Story 5.1's decision 4,
 * and this story's Gate 1 false premise 3).
 *
 * It is identical for every member of a group, so weighting it correlates a
 * whole sector's scores and fills a ranked list with one industry on the day
 * that industry moved together. **The denominator is 3.** The row is here
 * anyway, because a reader who can see three weights and a breadth sentence
 * and cannot see which of them is in the sum has to guess.
 */
const BREADTH_ROW_NAME = "Breadth";

/** What the breadth row says instead of a weight and a contribution. */
const BREADTH_REASON = "stated as context";

/**
 * **One row of the ledger. Four of them, in every state.**
 *
 * ## The reason REPLACES the figure rather than sitting beside it
 *
 * `return-percentile.ts`' own idiom two bands down — *replacing a clause
 * rather than adding a row* — and here it is forced by a measurement as well
 * as by the idiom. Probed in Chromium at 11px: a fourth column for the reason
 * leaves it **97 px** in the rail's 308 px box at 390, which is 18 characters
 * against a 22-character vocabulary, so every refused row wrapped and the
 * ledger's height became a function of the viewport. With the reason in the
 * figure's own cell the column is ~185 px at the narrowest width and every
 * sentence fits one line.
 *
 * **Exactly one of {@link contributed} and {@link reason} is defined**, which
 * is the data saying what the row is rather than a renderer deciding. A
 * factor either contributed or did not; there is no row that is both and none
 * that is neither.
 *
 * ## And there is no em dash anywhere in this band
 *
 * A cell holding `—` where a figure would go asserts a **zero contribution**,
 * because `—` is `unchanged` in `PriceChange` — the same trap the figure slot
 * above refuses and `five-minute-return.ts` and `volume-ratio.ts` each refuse
 * one band down. Here the words stand in the cell instead, so the glyph never
 * arises: the breadth row's weight is **blank room** rather than a dash,
 * explained by the words in the cell beside it.
 */
export interface ScoreLedgerRow {
  /** The factor's own name, or `Breadth`. */
  readonly factor: string;
  /** The factor's maximum in score points — blank for the breadth row. */
  readonly weight: string;
  /** What it contributed, in score points, or `undefined`. */
  readonly contributed: string | undefined;
  /** Why there is no contribution — at most 24 characters, or `undefined`. */
  readonly reason: string | undefined;
}

/** What the score band draws. {@link ReturnIndicator}'s shape, one band up. */
export interface AnomalyScoreBand {
  /** The micro label. Spelled by this module, drawn by the component. */
  readonly label: string;
  /** `61`, or `undefined` where there is no score. */
  readonly score: string | undefined;
  /** `/ 100` — drawn only beside a figure. */
  readonly scale: string | undefined;
  /** The band word, for the chip. `undefined` where there is no score. */
  readonly band: AnomalyBand | undefined;
  /** The words standing where a figure would be — never digits, never a dash. */
  readonly absent: string | undefined;
  /** `2 of 3 factors contributing · max 75`, or `undefined` before a frame. */
  readonly summary: string | undefined;
  /**
   * **A row per factor plus the breadth row, in every state** — four, always,
   * so `0 of 3` and `3 of 3` are the same height. Empty where this gateway
   * sent no score at all, which draws the ledger's room and no ink.
   */
  readonly rows: readonly ScoreLedgerRow[];
  /** The breadth clause, as context. `undefined` where none has arrived. */
  readonly context: string | undefined;
  /** AC 11's sentence, drawn only where there is a figure to disclaim. */
  readonly disclaimer: string | undefined;
}

/** The band's room with nothing in it — the paint before the first frame. */
export const RESERVED_SCORE: AnomalyScoreBand = {
  label: SCORE_LABEL,
  score: undefined,
  scale: undefined,
  band: undefined,
  absent: undefined,
  summary: undefined,
  rows: [],
  context: undefined,
  disclaimer: undefined,
};

/** Why one factor has no figure, in at most 24 characters. */
const reasonFor = (clause: WireAbsentClause): string => {
  switch (clause.state) {
    case "refused":
      return REFUSAL_REASONS[clause.refusal];
    case "inapplicable":
      return INAPPLICABLE_REASONS[clause.because];
    case "no-distribution":
      return NO_DISTRIBUTION_REASON;
  }
};

/**
 * **`2 of 3 factors contributing · max 75` — and both halves are load-bearing.**
 *
 * AC 3's own 2026-10-23 amendment says why: with the volume factor
 * permanently unrankable, `contributing.length` is `2`, `1` or `0` for every
 * security for ever, so the **count** loses its discriminating power and the
 * information is carried by the **maximum**. `2 of 3` has three different
 * maxima depending on *which* two, so a label carrying only the count is a
 * label a reader cannot act on — and the maximum is also what makes the
 * weights column's own sum visible as a ceiling rather than as an arithmetic
 * nobody checked.
 *
 * **It is never a percentage and never renormalised.** `61 of a possible 75`
 * expressed as `81 / 100` is exactly the renormalisation AC 3 refuses, and it
 * would invalidate all three band floors — measured quantiles of a max-75,
 * two-factor distribution — on the day it shipped.
 */
const summaryOf = (contributing: number, max: number | undefined): string => {
  const factors = `${String(contributing)} of 3 factors contributing`;
  return max === undefined ? factors : `${factors} · max ${String(max)}`;
};

/**
 * **How broad the move is, as context rather than as a term** — counts with
 * the set they were counted over, never a percentage.
 *
 * Every figure is **read off the frame**: a literal population is a lie with
 * no symptom the day a constituent is delisted
 * (`the-population-is-never-a-literal`), and the window is the producer's
 * (`measuredWindow`, the one home for the phrase) so a rollback cannot put the
 * clause and the count two values apart.
 *
 * ## The denominator is `measured`, and the canvas specimen's `501` is wrong
 *
 * The specimen drew `312 of 501 equities advancing`, where 501 is the equity
 * population. That is a count over one set stated against the denominator of
 * another: 312 is counted over the securities we **heard from**, and the
 * honest denominator is the one the numerator came from —
 * `MARKET-OVERVIEW.md` §5.5 is a whole document about exactly that
 * confusion. The phrase `heard from` / `with a close` is what carries the
 * subset relation in the room one line has.
 */
const breadthClause = (
  overview: WireMarketOverview | undefined,
): string | undefined => {
  const breadth = overview?.breadth;
  if (breadth === undefined) return undefined;

  const where =
    breadth.basis === "observed"
      ? `heard from in ${measuredWindow(breadth.windowMinutes)}`
      : `with a close on ${breadth.session}`;

  // **`measured: 0` is a true answer** — *we counted and heard nothing* — and
  // it gets a word rather than `0 of 0`, which reads as a rendering fault.
  if (breadth.measured === 0) return `Breadth: nothing ${where}.`;

  return (
    `Breadth: ${String(breadth.advancing)} of ` +
    `${String(breadth.measured)} advancing, ${where}.`
  );
};

/**
 * **The ledger's four rows, built from the explanation the frame carries.**
 *
 * The factor order is `COMPOSITE_FACTORS`', read rather than written here, so
 * the ledger's order is the scorer's declared constant and the two cannot
 * drift. The weight is read from the **clause** wherever one exists, because
 * the clause's weight is what the published contribution was derived from;
 * `FACTOR_WEIGHTS` stands in only for a factor this gateway sent no clause for
 * at all, which `readAnomalyScore`'s totality makes unreachable and which a
 * `Record` cannot leave blank.
 */
const ledgerOf = (outcome: WireAnomalyOutcome): readonly ScoreLedgerRow[] => {
  const contributing = outcome.scored ? outcome.contributing : [];

  const factorRows = COMPOSITE_FACTORS.map((factor): ScoreLedgerRow => {
    const clause = contributing.find((entry) => entry.factor === factor);
    if (clause !== undefined)
      return {
        factor: FACTOR_NAMES[factor],
        weight: String(clause.weight),
        contributed: String(clause.contribution),
        reason: undefined,
      };

    const absent = outcome.absent.find((entry) => entry.factor === factor);
    return {
      factor: FACTOR_NAMES[factor],
      weight: String(absent?.weight ?? FACTOR_WEIGHTS[factor]),
      contributed: undefined,
      reason: absent === undefined ? undefined : reasonFor(absent),
    };
  });

  return [
    ...factorRows,
    {
      factor: BREADTH_ROW_NAME,
      // **Blank room rather than a dash**, because breadth has no weight to
      // report and a glyph in a column of figures asserts a value. The cell
      // beside it says why.
      weight: "",
      contributed: undefined,
      reason: BREADTH_REASON,
    },
  ];
};

/**
 * **The score band, for the security this page is about.**
 *
 * The symbol is compared rather than trusted, for `fiveMinuteReturnIndicator`'s
 * reason exactly: the gateway answers the focus a browser last declared, and a
 * reader moving from NVDA to AMD has one subscribe round trip in which the
 * last answer is about NVDA. A score under the wrong name is the worst figure
 * on this page, because it is a verdict rather than a reading.
 *
 * **A `null` score draws the band's room and nothing in it**, which is ADR
 * 0029's defer rule and `volumeRatioIndicator`'s own arm: the gateway said
 * nothing about a score at all — a browser holding a bundle across a deploy —
 * and a sentence explaining an absence we were not told about would be a claim
 * of its own. It is **not** the same state as `scored: false`, which has one
 * clause per factor and gets the ledger in full.
 *
 * @param symbol The security on screen.
 * @param held What the feed is holding, or `undefined` before the first frame.
 * @param overview The aggregate the breadth clause is read from.
 */
export function anomalyScoreBand(
  symbol: string,
  held: SymbolReturnView | undefined,
  overview: WireMarketOverview | undefined,
): AnomalyScoreBand {
  if (held?.symbol !== symbol) return RESERVED_SCORE;

  const { score } = held;
  if (score === null) return RESERVED_SCORE;

  const context = breadthClause(overview);
  const rows = ledgerOf(score);

  if (!score.scored)
    return {
      label: SCORE_LABEL,
      score: undefined,
      scale: undefined,
      band: undefined,
      absent: NO_SCORE,
      summary: summaryOf(0, undefined),
      rows,
      context,
      // **Nothing to disclaim over a refusal**, and the line's room is
      // reserved by the stylesheet rather than by a blank string — which is
      // what makes this state the same height as the one below.
      disclaimer: undefined,
    };

  return {
    label: SCORE_LABEL,
    score: String(score.score),
    scale: SCORE_SCALE,
    band: score.band,
    absent: undefined,
    summary: summaryOf(score.contributing.length, score.max),
    rows,
    context,
    disclaimer: SCORE_DISCLAIMER,
  };
}
