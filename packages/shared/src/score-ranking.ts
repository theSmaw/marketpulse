/**
 * **The order a list of composite scores goes in, and the only place it is
 * decided** (Task 5.6.3).
 *
 * ## A THIRD sibling, not a widening of either of the first two
 *
 * `sector-ranking.ts`' `compareByMove` ranks two **moves** — a signed
 * percentage against a close. `percentile-ranking.ts`' `compareByPercentile`
 * ranks two **ordinals** — integers `0`–`99` saying where a magnitude sits in
 * one security's own history. This ranks two **composite scores**: integers
 * `0`–`100` summed from a weighted set of factors, whose *maximum* differs
 * between two rows (`AnomalyScore.max`).
 *
 * Neither existing guard can see it, which is why this module exists rather
 * than a third call site in one of theirs:
 * `one-comparator-for-the-order-of-a-percentile` keys on
 * `\.(?:rank|ordinal|percentile)` either side of an operator and
 * `one-comparator-for-the-order-of-a-move` on `(?:percent|change|move)` — and
 * `a.score - b.score` matches **neither**. ADR 0043's lesson a third quantity
 * over: two quantities sharing a shape are not one quantity, and the check that
 * cannot tell them apart is the one that routes the next author wrongly.
 * `one-comparator-for-the-order-of-a-composite-score` is this module's, keyed
 * on two `.score` reads either side of one operator.
 *
 * ## The scores are compared RAW, and the maxima are deliberately not reconciled
 *
 * Story 5.6's Gate 1 decision 2 and AC 3: a reduced-factor score lives on a
 * lower scale and **that is the rule working**, not a defect to normalise away.
 * Ranking on `score ÷ max` would be renormalisation arriving at the comparator
 * — AC 3's own refusal one layer further out than the band layer it was written
 * against — and it is exactly the promotion that criterion names: it would lift
 * the **worst-covered** securities into the top ten, because a score computed
 * from one factor has the higher variance.
 *
 * So a 2-of-3 score of 73 sorts above a 1-of-3 score of 40, and the region
 * states each row's factor count and maximum beside it. *"A 2-of-4 score is
 * reported, labelled, and not ranked against a 4-of-4 score"* is honoured by
 * the **label** rather than by a second list: two lists would be two rankings
 * of one region, and `UNUSUAL_ROWS` is ten rows total.
 *
 * ## The tie-break is DECLARED, for `compareByPercentile`'s measured reason
 *
 * An integer score over 501 securities makes ties **routine rather than rare**
 * — at most 101 distinct values for 501 candidates, so by the pigeonhole
 * principle some score is shared whenever more than 101 are scored, and the
 * measured distribution is worse than that bound suggests: over 34,318 scores
 * the two-factor maximum is **75**, so the shipped scale holds **76** values.
 *
 * A comparator answering `0` for a tie delegates the answer to the array's
 * arrival order, which is the join's — filtered by a live eligibility pass that
 * changes membership up to ~16 times a minute. So two securities on the same
 * score would swap under a reader with nothing having changed, which
 * [ADR 0041](../../../docs/adr/0041-a-ranked-surface-re-orders-under-live-data.md)
 * forbids in terms. Ties break on **ticker ascending**, a total order over a
 * set whose members are unique by construction, so the same set of rows
 * produces the same list on every frame, in every process, for ever.
 */

/**
 * What the order needs to know about a row: the score, and which security it
 * is.
 *
 * **The minimum rather than `AnomalyScore`**, for `PercentileRanked`'s reason:
 * the comparator is a rule about two integers, and a function taking the
 * branded score would be a rule that cannot be stated about the backend's own
 * pre-encode candidates or about a browser spec's independent recompute.
 */
export interface ScoreRanked {
  /** The composite score, `0`–`100`. */
  readonly score: number;
  /** The security, and the declared tie-break. */
  readonly symbol: string;
}

/** `a` sorts before `b` — `percentile-ranking.ts`' two sign values, by name. */
const STRONGER = -1;

/** `a` sorts after `b`. */
const WEAKER = 1;

/**
 * **The one comparison of two composite scores in this repository** — highest
 * first, then ticker ascending.
 *
 * It returns a **sign** rather than a difference, `compareByPercentile`'s shape
 * for its reason: a bounded selection asks *which of these two is more
 * unusual* without testing a magnitude against zero.
 *
 * **A non-finite or non-integer score is refused rather than ordered**, for the
 * same reason one quantity over: a `NaN` in a comparator has no defined result
 * for the whole array, and this runs in-process before any encode, inside the
 * gap the serialiser's guarantee cannot reach.
 */
export function compareByScore(a: ScoreRanked, b: ScoreRanked): number {
  const scored = Number.isInteger(a.score);
  const other = Number.isInteger(b.score);

  if (scored && other && a.score !== b.score) {
    // **The one comparison of two composite scores in this repository**, and
    // the anchor `one-comparator-for-the-order-of-a-composite-score` is keyed
    // on: a second ranking of these figures cannot be written without putting
    // two of them either side of one operator.
    //
    // **The operands are spelled as property reads rather than bound to
    // locals, and that is the check's pattern rather than a style** —
    // `compareByPercentile`'s own note, for the defect its first draft had:
    // `right > left` with the two scores in locals is a comparison no grep can
    // see, and this is written in front of the check on purpose.
    return b.score > a.score ? WEAKER : STRONGER;
  }

  // Two rows with no honest score are not *equally ordinary*, they are equally
  // unrankable, so they fall through to the tie-break and stay deterministic.
  if (!scored && other) return WEAKER;
  if (scored && !other) return STRONGER;

  // **The declared tie-break, and never a `0`.** See the header: a `0` here
  // delegates to the array's arrival order, which is not stable between frames.
  if (a.symbol === b.symbol) return 0;
  return a.symbol > b.symbol ? WEAKER : STRONGER;
}

/**
 * **Is this list in {@link compareByScore}'s own order?** — `isRankedByPercentile`'s
 * shape one quantity over, and a decoder's strongest check about an order
 * computed somewhere it cannot see.
 *
 * The comparator is **total** — ties break on ticker ascending — so a correct
 * frame is not merely non-increasing, it is the **unique** order its own rows
 * admit, and a swapped pair is refused rather than tolerated.
 *
 * `false` on a hole in the array: `noUncheckedIndexedAccess` makes the gap
 * explicit, and an order this function cannot read is not one it may vouch for.
 */
export function isRankedByScore(rows: readonly ScoreRanked[]): boolean {
  for (let at = 1; at < rows.length; at += 1) {
    const earlier = rows[at - 1];
    const later = rows[at];

    if (earlier === undefined || later === undefined) return false;
    if (compareByScore(earlier, later) !== STRONGER) return false;
  }

  return true;
}
