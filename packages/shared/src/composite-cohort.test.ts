import { describe, expect, it } from "vitest";

import {
  cohortKeyOf,
  cohortOf,
  selectLargestCohort,
} from "./composite-cohort.js";
import { scoreAnomaly } from "./composite-score.js";

import type { AnomalyScore, CompositeFactor, FactorAnswer } from "./index.js";

// **The cohort rule** (Task 5.6.7) — AC 3 arriving at a ranked surface.
//
// Every score below is minted by `scoreAnomaly` rather than typed, which is not
// a convenience: `AnomalyScore` is branded and unforgeable outside its own
// module, and the whole point of this module is that it reads a cohort off a
// score's **own explanation**. A typed fixture would be asserting about a shape
// nothing produces.

const RANKED: FactorAnswer = {
  state: "ranked",
  rank: 60,
  aboveSample: false,
  sampleCount: 4620,
};

const REFUSED: FactorAnswer = {
  state: "refused",
  refusal: "too-few-samples",
  sampleCount: 100,
  minimumSampleCount: 2500,
};

const NO_DISTRIBUTION: FactorAnswer = { state: "no-distribution" };

/** A score over exactly the named factors, minted through the real scorer. */
const scored = (
  factors: readonly CompositeFactor[],
  rank = 60,
): AnomalyScore => {
  const answers = {
    price: factors.includes("price") ? { ...RANKED, rank } : REFUSED,
    excess: factors.includes("excess") ? { ...RANKED, rank } : REFUSED,
    volume: factors.includes("volume") ? { ...RANKED, rank } : NO_DISTRIBUTION,
  } satisfies Record<CompositeFactor, FactorAnswer>;

  const outcome = scoreAnomaly(answers);
  if (!outcome.scored) throw new Error("the fixture produced no score");
  return outcome;
};

describe("cohortOf", () => {
  it("reads the contributing factors off the score's own explanation", () => {
    expect(cohortOf(scored(["price", "excess"])).factors).toEqual([
      "price",
      "excess",
    ]);
    expect(cohortOf(scored(["excess"])).factors).toEqual(["excess"]);
  });

  it("orders the factors by COMPOSITE_FACTORS and not by the clauses", () => {
    // The key has to be stable across processes and across frames, so it may
    // not depend on how a producer happened to build its record.
    expect(cohortKeyOf(cohortOf(scored(["excess", "price"])))).toBe(
      cohortKeyOf(cohortOf(scored(["price", "excess"]))),
    );
    expect(cohortKeyOf(cohortOf(scored(["price", "excess"])))).toBe(
      "price+excess",
    );
  });

  it("reads the maximum off the score rather than summing the weights again", () => {
    // `0014` §5: the figure a screen states must be the one the producer
    // applied, and out of hours that producer is the nightly pass. A second
    // summation here would be a second copy of the weights' arithmetic.
    const two = scored(["price", "excess"]);
    const one = scored(["price"]);

    expect(cohortOf(two).max).toBe(two.max);
    expect(cohortOf(one).max).toBe(one.max);
    expect(cohortOf(two).max).toBeGreaterThan(cohortOf(one).max);
  });

  it("tells two different factor sets apart by key", () => {
    expect(cohortKeyOf(cohortOf(scored(["price"])))).not.toBe(
      cohortKeyOf(cohortOf(scored(["excess"]))),
    );
  });
});

describe("selectLargestCohort", () => {
  const rows = (...sets: readonly (readonly CompositeFactor[])[]) =>
    sets.map((factors, at) => ({
      symbol: `SYM${String(at)}`,
      outcome: scored(factors),
    }));

  it("ranks within the largest cohort and counts the rest", () => {
    const candidates = rows(
      ["price", "excess"],
      ["price", "excess"],
      ["price", "excess"],
      ["price"],
      ["excess"],
    );

    const selection = selectLargestCohort(candidates, (row) => row.outcome);

    expect(selection.cohort?.factors).toEqual(["price", "excess"]);
    expect(selection.members).toHaveLength(3);
    // **The restriction is visible rather than silent**, which is the whole
    // difference between this and dropping the two rows.
    expect(selection.others).toBe(2);
  });

  it("does NOT rank a one-factor score against a two-factor one", () => {
    // AC 3 in terms, and the reason is the one that criterion names: a score
    // computed from fewer factors has the higher variance, so a mixed ranking
    // systematically promotes the worst-covered securities.
    const candidates = rows(["price"], ["price", "excess"]);
    const selection = selectLargestCohort(candidates, (row) => row.outcome);

    expect(selection.members).toHaveLength(1);
    expect(selection.others).toBe(1);
    expect(
      selection.members.map((row) => cohortKeyOf(cohortOf(row.outcome))),
    ).toEqual([cohortKeyOf(cohortOf(scored(selection.cohort?.factors ?? [])))]);
  });

  it("partitions and does not rank — the members keep their arrival order", () => {
    // The order is `compareByScore`'s, applied afterwards, because
    // `one-comparator-for-the-order-of-a-composite-score` permits exactly one
    // home for it and a partition that sorted would be the second.
    const candidates = [
      { symbol: "AAA", outcome: scored(["price", "excess"], 10) },
      { symbol: "BBB", outcome: scored(["price", "excess"], 90) },
      { symbol: "CCC", outcome: scored(["price", "excess"], 50) },
    ];

    expect(
      selectLargestCohort(candidates, (row) => row.outcome).members.map(
        (row) => row.symbol,
      ),
    ).toEqual(["AAA", "BBB", "CCC"]);
  });

  it("breaks a tie on the higher maximum, then on the key", () => {
    // **A cohort chosen by a `Map`'s insertion order is chosen by the join's
    // arrival order**, which changes up to ~16 times a minute — so the region
    // would swap which SCALE it is ranking on under a reader with nothing
    // having changed. More evidence wins, which is Gate 1 decision 2's *less
    // evidence means less claim* taken the other way.
    const higherSecond = rows(["price"], ["price", "excess"]);
    expect(
      selectLargestCohort(higherSecond, (row) => row.outcome).cohort?.factors,
    ).toEqual(["price", "excess"]);

    const higherFirst = rows(["price", "excess"], ["price"]);
    expect(
      selectLargestCohort(higherFirst, (row) => row.outcome).cohort?.factors,
    ).toEqual(["price", "excess"]);

    // Equal size and equal maximum: `excess` alone is 35 and `price` alone is
    // 40, so a genuine max tie needs the same set — which is one cohort. The
    // key tie-break is reachable only if the weights ever coincide, and it is
    // asserted as determinism rather than as a specific winner.
    const twice = rows(["price"], ["price"]);
    expect(
      selectLargestCohort(twice, (row) => row.outcome).cohort?.factors,
    ).toEqual(["price"]);
  });

  it("is deterministic under a reordering of its input", () => {
    // ADR 0041's prohibition at its most severe: if the cohort flipped, every
    // figure in the region would change rather than merely the order.
    const forward = rows(["price", "excess"], ["price"], ["excess"]);
    const backward = [...forward].reverse();

    expect(
      selectLargestCohort(forward, (row) => row.outcome).cohort,
    ).toStrictEqual(selectLargestCohort(backward, (row) => row.outcome).cohort);
  });

  it("answers NO COHORT for an empty input rather than an empty one", () => {
    // CI's permanent state, and every store's before its first nightly pass. A
    // region with no scored security has no scale to name, and naming one
    // would be ADR 0029's fully-formed record about zero rows.
    const selection = selectLargestCohort(
      [] as readonly { readonly outcome: AnomalyScore }[],
      (row) => row.outcome,
    );

    expect(selection.cohort).toBeUndefined();
    expect(selection.members).toEqual([]);
    expect(selection.others).toBe(0);
  });

  it("reports others as ZERO where every score shares one cohort", () => {
    // **The shipped state, measured**: Task 5.6.6 found 485 scored securities
    // and 0 single-factor scores, because the two scored factors refuse for
    // the same root causes. So the machinery above is correct and invisible,
    // and this is the arm that actually runs.
    const candidates = rows(
      ["price", "excess"],
      ["price", "excess"],
      ["price", "excess"],
    );
    const selection = selectLargestCohort(candidates, (row) => row.outcome);

    expect(selection.members).toHaveLength(3);
    expect(selection.others).toBe(0);
  });
});
