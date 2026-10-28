import { COMPOSITE_FACTORS } from "./composite-score.js";

import type { AnomalyScore, CompositeFactor } from "./composite-score.js";

/**
 * **Which composite scores may be ranked against each other, and the only
 * place that is decided** (Task 5.6.7) — AC 3 arriving at a ranked surface.
 *
 * ## The rule, and it is a correctness constraint rather than a preference
 *
 * **Two scores are comparable iff they were computed over the same factor
 * set.** AC 3 says so in terms — *"a 2-of-4 score is reported, labelled, and
 * not ranked against a 4-of-4 score"* — and the reason is the one that
 * criterion names: with unequal weights even a count-based cohort mixes
 * scales, so a mixed ranking systematically promotes the **worst-covered**
 * securities. A score computed from one factor has the higher variance, so the
 * extreme tail of a top-N over mixed cohorts fills with the securities we know
 * least about. That is what `UNIVERSE.md` rule 4 spent ~19 discretionary
 * curation slots preventing, arriving at a different layer.
 *
 * `score-ranking.ts` holds the complementary half and the two must not be
 * confused: **within** a cohort the scores are compared **raw**, maxima
 * unreconciled, because ranking on `score ÷ max` is AC 3's renormalisation
 * arriving at the comparator. This module is what makes that safe — a raw
 * comparison is only honest over one scale, and a cohort **is** a scale.
 *
 * ## Rank within the largest non-empty cohort, state which, count the others
 *
 * The two alternatives were each refused for a stated reason. **Ranking only
 * full-factor scores** empties the region permanently on CI and for months on
 * the deployment — the volume factor is `no-distribution` unconditionally
 * (`market-composite.ts`' `volumeFactorAnswer`), so a three-factor cohort has
 * **no members anywhere, for ever**, and a region that refuses every row is
 * not a stricter region, it is an absent one. **Ranking across cohorts** is
 * refused by AC 3 above.
 *
 * So the region ranks the largest cohort, names it on screen, and says how
 * many scored securities it is **not** ranking. The reader is told the scale
 * they are reading and the size of what was set aside, which is the honest
 * version of a restriction.
 *
 * ## It is INVISIBLE in this tree, measured rather than assumed
 *
 * Task 5.6.6 measured the local store: 501 tracked, **485 scored, 0
 * single-factor scores**, `max = 75` on every row — so `{price, excess}` is
 * not merely the dominant cohort, it is the **sole** one, and
 * {@link selectLargestCohort}' `others` is `0` on every state any machine can
 * produce today. The reason is structural rather than lucky: the price and
 * excess factors refuse for the same root causes (no bar the span back, no
 * stored generation), so a security whose price factor refuses has an excess
 * factor that refuses too.
 *
 * **This machinery is therefore correct and untested against a real second
 * cohort**, which is said here rather than left for a reader to discover. It
 * is written so that the second cohort's arrival is a **data** change rather
 * than a code change — the day a nightly pass stores a distribution of the
 * volume rate, a three-factor cohort appears, outranks `{price, excess}` the
 * moment it is larger, and the sentence on screen changes with it.
 *
 * ## The cohort is a property of the SECTION, never of a row
 *
 * Every drawn row shares the ranked cohort by construction, so the factor set
 * and its maximum are stated **once** in the region's footer rather than ten
 * times down a 308 px column. That is also what keeps the row drawable: `2 of
 * 3 · max 75` on each of ten rows is a sentence repeated where the figure it
 * qualifies does not vary.
 */

/**
 * **A cohort: the factor set a score was computed over, and that set's own
 * ceiling.**
 *
 * Both halves travel, because the **count** has lost its discriminating power
 * and the **maximum** has not — AC 3's 2026-10-23 labelling note: with volume
 * permanently unrankable, `contributing.length` is `2`, `1` or `0` for every
 * security for ever, and `2 of 3` has three different maxima depending on
 * **which** two. So the set is named rather than counted, and the maximum is
 * read off the score rather than re-derived from the weights.
 */
export interface AnomalyCohort {
  /**
   * The contributing factors, in {@link COMPOSITE_FACTORS}' declared order —
   * so two scores over the same set always produce the same cohort, whatever
   * order the scorer's clauses happened to be built in.
   */
  readonly factors: readonly [CompositeFactor, ...CompositeFactor[]];
  /**
   * `Σ w` over those factors — {@link AnomalyScore.max}, **read off the score
   * rather than summed here**.
   *
   * A second summation would be a second copy of the weights' arithmetic, and
   * the figure that must be published is the one the **producer** applied
   * (`0014` §5): out of hours the score was minted against the nightly pass's
   * weights, which a rollback can put two values apart from this bundle's.
   */
  readonly max: number;
}

/**
 * **A cohort's identity as a string, for grouping and for nothing else.**
 *
 * The factors joined in the declared order, so it is stable across processes
 * and across frames. It is deliberately **not** on the wire: a browser needs
 * the factor set and the maximum, which are the facts a sentence is built
 * from, and a key is an implementation detail of a `Map`.
 */
export type AnomalyCohortKey = string;

/** See {@link AnomalyCohortKey}. */
export const cohortKeyOf = (cohort: AnomalyCohort): AnomalyCohortKey =>
  cohort.factors.join("+");

/**
 * **The cohort one score belongs to**, read off its own explanation.
 *
 * `contributing` is a non-empty tuple on {@link AnomalyScore}, so the factor
 * list is non-empty by construction and there is no empty cohort to represent
 * — a security with no contributing factor is `UnscoredAnomaly`, a different
 * type with no `score` member at all.
 *
 * The iteration is over {@link COMPOSITE_FACTORS} rather than over the clauses,
 * which is `scoreAnomaly`'s own rule for its own reason: the order is a
 * declared constant rather than an object's key order, so the key cannot
 * depend on how a producer built its record.
 */
export function cohortOf(score: AnomalyScore): AnomalyCohort {
  const present = new Set(score.contributing.map((clause) => clause.factor));
  const factors = COMPOSITE_FACTORS.filter((factor) => present.has(factor));

  const [first, ...rest] = factors;
  if (first === undefined) {
    // Unreachable: `AnomalyScore.contributing` is `[T, ...T[]]` and every
    // clause's factor is a member of `COMPOSITE_FACTORS`. A `throw` rather
    // than a fallback, for `scoreAnomaly`'s own reason — a default cohort here
    // would be a scale nobody can trace.
    throw new RangeError(
      "a scored anomaly produced no contributing factor, which requires " +
        "AnomalyScore.contributing to be empty.",
    );
  }

  return { factors: [first, ...rest], max: score.max };
}

/** What {@link selectLargestCohort} answers. */
export interface CohortSelection<T> {
  /**
   * The cohort the members were ranked within, or `undefined` where nothing
   * was scored at all — CI's permanent state, and every store's before its
   * first nightly pass.
   *
   * `undefined` is **the absence of a cohort** rather than an empty one: a
   * region with no scored security has no scale to name, and naming one would
   * be ADR 0029's fully-formed record about zero rows.
   */
  readonly cohort: AnomalyCohort | undefined;
  /**
   * The rows in that cohort, **in the order they were handed over** — this
   * function partitions and does not rank. The order is `compareByScore`'s,
   * applied by `selectByScore` afterwards, because
   * `one-comparator-for-the-order-of-a-composite-score` permits exactly one
   * home for it and a partition that sorted would be the second.
   */
  readonly members: readonly T[];
  /**
   * **How many scored securities are in some other cohort** — the figure the
   * region states so that a restriction is visible rather than silent.
   *
   * A count rather than the rows: the region cannot draw them (they are on
   * another scale) and a sentence does not need them. `0` in every state this
   * tree can produce — see the header.
   */
  readonly others: number;
}

/**
 * **Partition scored rows by cohort and return the largest**, with the rest
 * counted.
 *
 * ## The tie-break between two cohorts of equal size is declared
 *
 * `compareByScore`'s own rule one grain out, and for its reason: a cohort
 * chosen by a `Map`'s insertion order is chosen by the join's arrival order,
 * which changes up to ~16 times a minute — so the region would swap **which
 * scale it is ranking on** under a reader with nothing having changed, which
 * is ADR 0041's prohibition at its most severe (every figure in the region
 * would change, not merely the order).
 *
 * Equal size breaks on the **higher maximum** first — more evidence wins,
 * which is Gate 1 decision 2's *less evidence means less claim* taken the
 * other way — and then on the key ascending, which is a total order over a set
 * whose members are unique by construction.
 */
export function selectLargestCohort<T>(
  rows: readonly T[],
  scoreOf: (row: T) => AnomalyScore,
): CohortSelection<T> {
  const groups = new Map<
    AnomalyCohortKey,
    { readonly cohort: AnomalyCohort; readonly members: T[] }
  >();

  for (const row of rows) {
    const cohort = cohortOf(scoreOf(row));
    const key = cohortKeyOf(cohort);
    const group = groups.get(key);

    if (group === undefined) {
      groups.set(key, { cohort, members: [row] });
      continue;
    }

    group.members.push(row);
  }

  let best:
    { key: AnomalyCohortKey; cohort: AnomalyCohort; members: T[] } | undefined;

  for (const [key, group] of groups) {
    if (best === undefined) {
      best = { key, cohort: group.cohort, members: group.members };
      continue;
    }

    if (group.members.length !== best.members.length) {
      if (group.members.length > best.members.length) {
        best = { key, cohort: group.cohort, members: group.members };
      }
      continue;
    }

    // **The declared tie-break**; see the header. Spelled as two comparisons
    // rather than one chained expression so that neither is a comparison of two
    // composite **scores** — `one-comparator-for-the-order-of-a-composite-score`
    // keys on exactly that, and a cohort's `max` is a sum of weights rather
    // than a score.
    if (group.cohort.max !== best.cohort.max) {
      if (group.cohort.max > best.cohort.max) {
        best = { key, cohort: group.cohort, members: group.members };
      }
      continue;
    }

    if (key < best.key) {
      best = { key, cohort: group.cohort, members: group.members };
    }
  }

  if (best === undefined) return { cohort: undefined, members: [], others: 0 };

  return {
    cohort: best.cohort,
    members: best.members,
    others: rows.length - best.members.length,
  };
}
