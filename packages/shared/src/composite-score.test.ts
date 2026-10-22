import { describe, expect, it } from "vitest";

import { ANOMALY_BANDS } from "./anomaly.js";
import type { AnomalyBand } from "./anomaly.js";
import {
  ANOMALY_BAND_FLOORS,
  COMPOSITE_FACTORS,
  FACTOR_WEIGHTS,
  bandOf,
  readAnomalyScore,
  scoreAnomaly,
  toWireAnomalyScore,
} from "./composite-score.js";
import type {
  AnomalyOutcome,
  CompositeFactor,
  FactorAnswer,
  FactorClause,
} from "./composite-score.js";

/**
 * **Layer one and layer two of three** (Task 5.6.3) — the properties and the
 * golden sample. The third, an independent recompute written from the published
 * weights by hand, is `composite-score-recompute.test.ts`, in a **different
 * file** on purpose: Story 5.3 proved the three are not interchangeable (a
 * signed-percentile defect caught by properties only, `rank + 1` by the golden
 * sample only, and `rank × 0.8 when n > 500` by the recompute only, **with the
 * golden sample green**), and a recompute sharing a file with the thing it
 * recomputes drifts into sharing its helpers.
 *
 * ## TWO PROPERTIES ARE FALSE AND ARE DELIBERATELY NOT WRITTEN
 *
 * Stated here rather than omitted, so the next author does not write them, find
 * them red, and "fix" them by renormalising.
 *
 * 1. **Monotonicity over `|return|` is false of the PIPELINE.** `|return|`
 *    feeds **both** the price percentile and the excess move, so a larger
 *    return *in the sector's direction* raises the first term and **lowers**
 *    the second — the security moved more and tracked its sector more closely.
 *    *Everything else equal* is a state of the **combination function**, which
 *    {@link scoreAnomaly} is, and not of the pipeline that feeds it. The
 *    monotonicity written below is therefore **per factor over factor inputs**,
 *    which is the true statement and the one AC 12 can gate.
 * 2. **Monotonicity across differing factor sets is false by design.** A
 *    2-of-3 score at the 99th on both factors is 75; a 1-of-3 score at the
 *    99th is 40, and 40 < 75 with *more* unusualness per factor. That is AC 3
 *    working: a reduced-factor score lives on a lower scale, and the property
 *    that IS true is the one-directional `score(P) ≤ score(P ∪ {j})` — adding
 *    evidence never lowers the number. Writing the symmetric version and
 *    "fixing" it would be renormalisation, which AC 3 refuses in terms.
 */

/** A ranked answer at one ordinal. `sampleCount` fixed where it is irrelevant. */
const ranked = (rank: number, aboveSample = false): FactorAnswer => ({
  state: "ranked",
  rank,
  aboveSample,
  sampleCount: 4620,
});

/** The refusal every machine that exists produces for the volume factor. */
const noVolume: FactorAnswer = {
  state: "refused",
  refusal: "no-same-tape-baseline",
  sampleCount: 0,
  minimumSampleCount: 2500,
};

const tooFewReturns: FactorAnswer = {
  state: "refused",
  refusal: "too-few-samples",
  sampleCount: 737,
  minimumSampleCount: 2500,
};

const noSector: FactorAnswer = { state: "inapplicable", because: "no-sector" };

/** The shipped shape today: both percentiles, volume refused. */
const twoFactor = (price: number, excess: number) =>
  scoreAnomaly({
    price: ranked(price),
    excess: ranked(excess),
    volume: noVolume,
  });

/** A score, or a thrown assertion. Keeps every row below one line. */
const scored = (outcome: AnomalyOutcome) => {
  if (!outcome.scored) throw new Error("expected a scored outcome");
  return outcome;
};

const clauseFor = (outcome: AnomalyOutcome, factor: CompositeFactor) => {
  if (!outcome.scored) throw new Error("expected a scored outcome");
  const clause = outcome.contributing.find((entry) => entry.factor === factor);
  if (clause === undefined) throw new Error(`no ${factor} clause`);
  return clause;
};

describe("the weights", () => {
  it("are integers summing to 100 over the FULL factor set", () => {
    // **A test rather than a type, because TypeScript cannot add.** The sum is
    // what makes `38 of its 40` readable: the weight has to be the term's own
    // maximum in the score's own unit, so a set summing to 90 or 110 puts the
    // reader's arithmetic in a different unit from the figure beside it.
    let sum = 0;
    for (const factor of COMPOSITE_FACTORS) {
      expect(Number.isInteger(FACTOR_WEIGHTS[factor])).toBe(true);
      expect(FACTOR_WEIGHTS[factor]).toBeGreaterThan(0);
      sum += FACTOR_WEIGHTS[factor];
    }
    expect(sum).toBe(100);
  });

  it("gives every factor a weight, and no factor two", () => {
    expect(Object.keys(FACTOR_WEIGHTS).sort()).toStrictEqual(
      [...COMPOSITE_FACTORS].sort(),
    );
  });
});

describe("the bands", () => {
  it("tile 0 to 100 exhaustively — no gap, no overlap", () => {
    // Exhaustive rather than sampled: the scale is 101 integers, so the
    // complete check is cheaper than an argument about which three to try.
    const drawn = new Set<AnomalyBand>();
    for (let score = 0; score <= 100; score += 1) {
      const band = bandOf(score);
      expect(ANOMALY_BANDS).toContain(band);
      drawn.add(band);
    }
    expect([...drawn].sort()).toStrictEqual([...ANOMALY_BANDS].sort());
  });

  it("is monotone non-decreasing in the score", () => {
    const ladder = ANOMALY_BANDS as readonly AnomalyBand[];
    let previous = 0;
    for (let score = 0; score <= 100; score += 1) {
      const at = ladder.indexOf(bandOf(score));
      expect(at).toBeGreaterThanOrEqual(previous);
      previous = at;
    }
  });

  it("puts `extreme` above what any reduced-factor score can reach", () => {
    // **Gate 1 decision 2, as a check rather than a comment.** The largest
    // single-factor score is the largest weight, because `round(w × 99/100) = w`
    // for every weight in this set.
    const largestWeight = Math.max(
      ...COMPOSITE_FACTORS.map((factor) => FACTOR_WEIGHTS[factor]),
    );
    expect(ANOMALY_BAND_FLOORS.extreme).toBeGreaterThan(largestWeight);
    expect(ANOMALY_BAND_FLOORS.high).toBeGreaterThan(largestWeight);
    // And the graduation: `elevated` is **at or below** it, so less evidence is
    // less claim rather than no claim. p75 = 49 fails this and p50 = 32 passes,
    // which is what selected the quantile.
    expect(ANOMALY_BAND_FLOORS.elevated).toBeLessThanOrEqual(largestWeight);
  });

  it("is a strictly ascending ladder", () => {
    expect(ANOMALY_BAND_FLOORS.elevated).toBeLessThan(ANOMALY_BAND_FLOORS.high);
    expect(ANOMALY_BAND_FLOORS.high).toBeLessThan(ANOMALY_BAND_FLOORS.extreme);
  });
});

describe("the combination rule", () => {
  it("makes every contribution `round(w × rank / 100)`, in `[0, w]`", () => {
    for (let rank = 0; rank <= 99; rank += 1) {
      const outcome = twoFactor(rank, rank);
      for (const clause of scored(outcome).contributing) {
        expect(clause.contribution).toBe(
          Math.round((clause.weight * clause.rank) / 100),
        );
        expect(clause.contribution).toBeGreaterThanOrEqual(0);
        expect(clause.contribution).toBeLessThanOrEqual(clause.weight);
      }
    }
  });

  it("makes the score the SUM of the rounded contributions, exactly", () => {
    // The whole of checkability 6: a reader adding the drawn contributions
    // reaches the drawn score, on every input, with no ±1.
    for (let price = 0; price <= 99; price += 7) {
      for (let excess = 0; excess <= 99; excess += 11) {
        const outcome = scored(twoFactor(price, excess));
        let sum = 0;
        for (const clause of outcome.contributing) sum += clause.contribution;
        expect(outcome.score).toBe(sum);
      }
    }
  });

  it("differs from `round(Σ w·u/100)` by at most ±1 per factor, and the cost is REAL rather than theoretical", () => {
    // **The stated cost, demonstrated rather than asserted.** If this test
    // found no disagreement the decision would be free, and a free decision
    // does not need a reversal trigger — so the disagreement is counted.
    let disagreements = 0;
    let worst = 0;
    for (let price = 0; price <= 99; price += 1) {
      for (let excess = 0; excess <= 99; excess += 1) {
        const outcome = scored(twoFactor(price, excess));
        const unrounded =
          (FACTOR_WEIGHTS.price * price + FACTOR_WEIGHTS.excess * excess) / 100;
        const gap = Math.abs(outcome.score - Math.round(unrounded));
        if (gap > 0) disagreements += 1;
        worst = Math.max(worst, gap);
      }
    }
    expect(disagreements).toBeGreaterThan(0);
    expect(worst).toBeLessThanOrEqual(2);
  });

  it("reports the maximum as `Σ w_i` over the PRESENT factors, never 100", () => {
    expect(scored(twoFactor(50, 50)).max).toBe(
      FACTOR_WEIGHTS.price + FACTOR_WEIGHTS.excess,
    );

    const priceOnly = scoreAnomaly({
      price: ranked(99),
      excess: tooFewReturns,
      volume: noVolume,
    });
    expect(scored(priceOnly).max).toBe(FACTOR_WEIGHTS.price);

    const all = scoreAnomaly({
      price: ranked(50),
      excess: ranked(50),
      volume: ranked(50),
    });
    expect(scored(all).max).toBe(100);
  });
});

describe("the absent-factor rule — AC 3", () => {
  it("adding a factor never LOWERS the score: `score(P) ≤ score(P ∪ {j})`", () => {
    // **The formal statement of no-renormalisation, and the only property that
    // catches it.** Under renormalisation this is false in both directions: a
    // 1-of-3 at the 99th renormalises to 99 and adding a 10th-percentile
    // second factor drops it to ~55.
    for (let price = 0; price <= 99; price += 3) {
      for (let excess = 0; excess <= 99; excess += 7) {
        const alone = scored(
          scoreAnomaly({
            price: ranked(price),
            excess: tooFewReturns,
            volume: noVolume,
          }),
        );
        const pair = scored(twoFactor(price, excess));
        expect(pair.score).toBeGreaterThanOrEqual(alone.score);

        const trio = scored(
          scoreAnomaly({
            price: ranked(price),
            excess: ranked(excess),
            volume: ranked(0),
          }),
        );
        expect(trio.score).toBeGreaterThanOrEqual(pair.score);
      }
    }
  });

  it("imputes nothing: a refused factor contributes no clause and no points", () => {
    const outcome = scored(twoFactor(99, 99));
    expect(outcome.contributing.map((clause) => clause.factor)).toStrictEqual([
      "price",
      "excess",
    ]);
    expect(outcome.absent.map((clause) => clause.factor)).toStrictEqual([
      "volume",
    ]);
    expect(outcome.score).toBe(75);
    expect(outcome.max).toBe(75);
  });

  it("is INDEPENDENT of an absent factor's adversarial slot values", () => {
    // **The property that catches `?? 0` without grepping for it.** A reader
    // that defaulted a missing rank would be visible here as a changed score;
    // one that read `100` would be visible as an inflated one. The junk is cast
    // in deliberately: the absent arms have no `rank` member at all, so this is
    // a check on the implementation rather than on the type.
    const baseline = scored(twoFactor(80, 40));

    for (const junk of [0, 100, Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const poisoned = scoreAnomaly({
        price: ranked(80),
        excess: ranked(40),
        volume: {
          ...noVolume,
          rank: junk,
          contribution: junk,
          unit: junk,
        } as unknown as FactorAnswer,
      });
      expect(scored(poisoned).score).toBe(baseline.score);
      expect(scored(poisoned).max).toBe(baseline.max);
      expect(scored(poisoned).band).toBe(baseline.band);
    }
  });

  it("distinguishes *we will not answer* from *the question does not arise* by SHAPE", () => {
    const refused = scoreAnomaly({
      price: ranked(50),
      excess: tooFewReturns,
      volume: noVolume,
    });
    const inapplicable = scoreAnomaly({
      price: ranked(50),
      excess: noSector,
      volume: noVolume,
    });

    const refusedClause = refused.absent.find(
      (clause) => clause.factor === "excess",
    );
    const inapplicableClause = inapplicable.absent.find(
      (clause) => clause.factor === "excess",
    );

    if (refusedClause === undefined || inapplicableClause === undefined) {
      throw new Error("expected an excess clause on both");
    }

    expect(refusedClause.state).toBe("refused");
    expect(inapplicableClause.state).toBe("inapplicable");
    // The members differ, which is the structural half: `because` does not
    // exist on the refused arm and `minimumSampleCount` does not exist on the
    // inapplicable one, so a surface cannot print one's sentence for the other.
    expect("because" in refusedClause).toBe(false);
    expect("minimumSampleCount" in inapplicableClause).toBe(false);
    // And both scores are the same, because neither contributed.
    expect(scored(refused).score).toBe(scored(inapplicable).score);
  });

  it("produces NO SCORE when every factor refused — CI's permanent state", () => {
    const outcome = scoreAnomaly({
      price: tooFewReturns,
      excess: noSector,
      volume: noVolume,
    });
    expect(outcome.scored).toBe(false);
    if (outcome.scored) throw new Error("unreachable");
    expect(outcome.absent).toHaveLength(COMPOSITE_FACTORS.length);
    // There is no `score` member to read, which is the mechanism rather than a
    // convention: a constant and a branch would leave the defect one `if` away.
    expect("score" in outcome).toBe(false);
    expect("max" in outcome).toBe(false);
  });
});

describe("monotonicity — PER FACTOR over factor inputs", () => {
  it("never scores lower for a higher ordinal on one factor, others fixed", () => {
    for (const excess of [0, 17, 50, 83, 99]) {
      let previous = -1;
      for (let price = 0; price <= 99; price += 1) {
        const score = scored(twoFactor(price, excess)).score;
        expect(score).toBeGreaterThanOrEqual(previous);
        previous = score;
      }
    }

    for (const price of [0, 17, 50, 83, 99]) {
      let previous = -1;
      for (let excess = 0; excess <= 99; excess += 1) {
        const score = scored(twoFactor(price, excess)).score;
        expect(score).toBeGreaterThanOrEqual(previous);
        previous = score;
      }
    }
  });

  it("is monotone in the band too, because the floors are monotone in the score", () => {
    const ladder = ANOMALY_BANDS as readonly AnomalyBand[];
    let previous = 0;
    for (let price = 0; price <= 99; price += 1) {
      const at = ladder.indexOf(scored(twoFactor(price, 50)).band);
      expect(at).toBeGreaterThanOrEqual(previous);
      previous = at;
    }
  });
});

describe("unsignedness — AC 4", () => {
  it("has no signed input at all, so `score(+x) === score(−x)` is structural", () => {
    // **The scorer never sees a sign.** Its only numeric input is an integer
    // ordinal of a MAGNITUDE — `returnPercentileOf` takes `Math.abs` inside, so
    // the direction is removed one module down and is unrecoverable here.
    // Asserted through a monotone magnitude→ordinal mapper, which is the shape
    // of that pipeline: if a sign ever reached this function the two arms would
    // differ.
    const ordinalOf = (percent: number) =>
      Math.min(99, Math.floor(Math.abs(percent) * 10));

    for (const percent of [0.1, 1.4, 3.7, 6.2, 9.9, 12.5]) {
      const up = twoFactor(ordinalOf(percent), ordinalOf(percent / 2));
      const down = twoFactor(ordinalOf(-percent), ordinalOf(-percent / 2));
      expect(JSON.stringify(toWireAnomalyScore(up))).toBe(
        JSON.stringify(toWireAnomalyScore(down)),
      );
    }
  });

  it("carries no direction on the score, the band or any clause", () => {
    const outcome = scored(twoFactor(99, 99));
    const wire = JSON.stringify(toWireAnomalyScore(outcome));
    for (const word of [
      "direction",
      "sign",
      "positive",
      "negative",
      "up",
      "down",
    ]) {
      expect(wire).not.toContain(word);
    }
  });
});

describe("explanation totality and determinism — AC 12", () => {
  it("produces exactly one clause per factor, on every input", () => {
    const answers: FactorAnswer[] = [
      ranked(0),
      ranked(50),
      ranked(99, true),
      tooFewReturns,
      noVolume,
      noSector,
    ];

    for (const price of answers) {
      for (const excess of answers) {
        for (const volume of answers) {
          const outcome = scoreAnomaly({ price, excess, volume });
          const clauses = outcome.scored
            ? outcome.contributing.length + outcome.absent.length
            : outcome.absent.length;
          expect(clauses).toBe(COMPOSITE_FACTORS.length);
        }
      }
    }
  });

  it("gives identical inputs an identical score, byte for byte", () => {
    const answers = {
      price: ranked(91),
      excess: ranked(74),
      volume: noVolume,
    };
    const first = JSON.stringify(toWireAnomalyScore(scoreAnomaly(answers)));
    const second = JSON.stringify(toWireAnomalyScore(scoreAnomaly(answers)));
    expect(first).toBe(second);
  });

  it("orders the clauses by the declared constant, not by key order", () => {
    // A reversed input object must produce the same clause order, because an
    // explanation whose clause order depends on how the caller built its record
    // is an explanation that reads differently from two call sites.
    const forward = scoreAnomaly({
      price: ranked(60),
      excess: ranked(30),
      volume: noVolume,
    });
    const reversed = scoreAnomaly({
      volume: noVolume,
      excess: ranked(30),
      price: ranked(60),
    });
    expect(JSON.stringify(toWireAnomalyScore(forward))).toBe(
      JSON.stringify(toWireAnomalyScore(reversed)),
    );
  });

  it("reads no clock, socket or handle — and the scope is what makes that a LINT error", () => {
    // This test cannot prove purity; `eslint.config.mjs`' four
    // `no-restricted-syntax` entries over `packages/shared/src/**` do, and they
    // are why the module is here. What this asserts is the half a test CAN see:
    // the same answers give the same score with no second call, which a module
    // reading a clock would fail on the second tick.
    const answers = { price: ranked(45), excess: ranked(45), volume: noVolume };
    expect(scoreAnomaly(answers)).toStrictEqual(scoreAnomaly(answers));
  });
});

/**
 * **The golden sample — twelve rows, input to `{score, band, every clause}`,
 * with the arithmetic written out.**
 *
 * Chosen adversarially **about the boundaries**: one row on each of the three
 * cut-points and one either side, plus the two ends of the scale, plus the
 * mapping rows. If a row below cannot be verified by addition, the combination
 * rule is not the one the story chose.
 *
 * Story 5.3's lesson is why this layer exists at all: `rank + 1` was caught by
 * the golden sample **only** — properties and an independent recompute that
 * share a mapping are both blind to an off-by-one in it. Row 2 is the row that
 * pins it.
 */
describe("the golden sample", () => {
  interface GoldenRow {
    readonly label: string;
    readonly price: number;
    readonly excess: number;
    /** `round(40 × price / 100)`, written out. */
    readonly priceContribution: number;
    /** `round(35 × excess / 100)`, written out. */
    readonly excessContribution: number;
    readonly score: number;
    readonly band: AnomalyBand;
  }

  // Every `score` below is `priceContribution + excessContribution`, and every
  // contribution is the rounding in its own comment. Nothing here is computed.
  const ROWS: readonly GoldenRow[] = [
    // round(40 × 0/100) = 0 ; round(35 × 0/100) = 0 ; 0 + 0 = 0
    {
      label: "both at the 0th",
      price: 0,
      excess: 0,
      priceContribution: 0,
      excessContribution: 0,
      score: 0,
      band: "normal",
    },
    // round(40 × 1/100) = round(0.4) = 0 ; round(35 × 1/100) = round(0.35) = 0 ; 0 + 0 = 0
    // **The `rank + 1` row.** Under `u = rank + 1` this is
    // round(0.8) + round(0.7) = 1 + 1 = 2, so a score of 0 is the only answer
    // the shipped mapping gives. Properties cannot see this; this row can.
    {
      label: "both at the 1st — the rank+1 row",
      price: 1,
      excess: 1,
      priceContribution: 0,
      excessContribution: 0,
      score: 0,
      band: "normal",
    },
    // round(40 × 50/100) = 20 ; round(35 × 31/100) = round(10.85) = 11 ; 20 + 11 = 31
    {
      label: "one below the `elevated` floor",
      price: 50,
      excess: 31,
      priceContribution: 20,
      excessContribution: 11,
      score: 31,
      band: "normal",
    },
    // round(40 × 50/100) = 20 ; round(35 × 34/100) = round(11.9) = 12 ; 20 + 12 = 32
    {
      label: "ON the `elevated` floor",
      price: 50,
      excess: 34,
      priceContribution: 20,
      excessContribution: 12,
      score: 32,
      band: "elevated",
    },
    // round(40 × 50/100) = 20 ; round(35 × 37/100) = round(12.95) = 13 ; 20 + 13 = 33
    {
      label: "one above the `elevated` floor",
      price: 50,
      excess: 37,
      priceContribution: 20,
      excessContribution: 13,
      score: 33,
      band: "elevated",
    },
    // round(40 × 80/100) = 32 ; round(35 × 86/100) = round(30.1) = 30 ; 32 + 30 = 62
    {
      label: "one below the `high` floor",
      price: 80,
      excess: 86,
      priceContribution: 32,
      excessContribution: 30,
      score: 62,
      band: "elevated",
    },
    // round(40 × 80/100) = 32 ; round(35 × 89/100) = round(31.15) = 31 ; 32 + 31 = 63
    {
      label: "ON the `high` floor",
      price: 80,
      excess: 89,
      priceContribution: 32,
      excessContribution: 31,
      score: 63,
      band: "high",
    },
    // round(40 × 80/100) = 32 ; round(35 × 91/100) = round(31.85) = 32 ; 32 + 32 = 64
    {
      label: "one above the `high` floor",
      price: 80,
      excess: 91,
      priceContribution: 32,
      excessContribution: 32,
      score: 64,
      band: "high",
    },
    // round(40 × 92/100) = round(36.8) = 37 ; round(35 × 99/100) = round(34.65) = 35 ; 37 + 35 = 72
    {
      label: "one below the `extreme` floor",
      price: 92,
      excess: 99,
      priceContribution: 37,
      excessContribution: 35,
      score: 72,
      band: "high",
    },
    // round(40 × 95/100) = 38 ; round(35 × 99/100) = round(34.65) = 35 ; 38 + 35 = 73
    {
      label: "ON the `extreme` floor",
      price: 95,
      excess: 99,
      priceContribution: 38,
      excessContribution: 35,
      score: 73,
      band: "extreme",
    },
    // round(40 × 97/100) = round(38.8) = 39 ; round(35 × 99/100) = 35 ; 39 + 35 = 74
    {
      label: "one above the `extreme` floor",
      price: 97,
      excess: 99,
      priceContribution: 39,
      excessContribution: 35,
      score: 74,
      band: "extreme",
    },
    // round(40 × 99/100) = round(39.6) = 40 ; round(35 × 99/100) = round(34.65) = 35 ; 40 + 35 = 75
    {
      label: "both at the 99th — the ceiling of the shipped factor set",
      price: 99,
      excess: 99,
      priceContribution: 40,
      excessContribution: 35,
      score: 75,
      band: "extreme",
    },
  ];

  it.each(ROWS)(
    "$label: $priceContribution + $excessContribution = $score ($band)",
    (row) => {
      const outcome = scored(twoFactor(row.price, row.excess));

      expect(outcome.score).toBe(row.score);
      expect(outcome.band).toBe(row.band);
      expect(outcome.max).toBe(75);

      // **Every clause verbatim, through the wire mapper**, which is the form a
      // reader is handed and the form with no brand in it.
      const wire = toWireAnomalyScore(outcome);
      if (!wire.scored) throw new Error("expected a scored wire outcome");
      expect(wire.contributing).toStrictEqual([
        {
          factor: "price",
          weight: 40,
          rank: row.price,
          aboveSample: false,
          sampleCount: 4620,
          contribution: row.priceContribution,
        },
        {
          factor: "excess",
          weight: 35,
          rank: row.excess,
          aboveSample: false,
          sampleCount: 4620,
          contribution: row.excessContribution,
        },
      ]);
      expect(wire.absent).toStrictEqual([
        {
          factor: "volume",
          weight: 25,
          state: "refused",
          refusal: "no-same-tape-baseline",
          sampleCount: 0,
          minimumSampleCount: 2500,
        },
      ]);

      // **The addition, performed in the test rather than quoted.**
      expect(row.priceContribution + row.excessContribution).toBe(row.score);
    },
  );

  // Three reduced-factor rows, which the twelve above cannot express because
  // they all carry both factors.
  it("a price-only score at the 79th is `elevated`: round(40 × 79/100) = 32", () => {
    const outcome = scored(
      scoreAnomaly({
        price: ranked(79),
        excess: tooFewReturns,
        volume: noVolume,
      }),
    );
    expect(outcome.score).toBe(32);
    expect(outcome.max).toBe(40);
    expect(outcome.band).toBe("elevated");
    expect(outcome.contributing).toHaveLength(1);
  });

  it("a price-only score at the 78th is `normal`: round(40 × 78/100) = 31", () => {
    const outcome = scored(
      scoreAnomaly({
        price: ranked(78),
        excess: tooFewReturns,
        volume: noVolume,
      }),
    );
    expect(outcome.score).toBe(31);
    expect(outcome.band).toBe("normal");
  });

  it("a price-only score at the 99th is 40 of 40 and `elevated`, NEVER `extreme`", () => {
    // Gate 1 decision 2 at its sharpest, and the exact reading Story 5.4's own
    // Gate 1 refused a chip to avoid: `extreme` on price alone.
    const outcome = scored(
      scoreAnomaly({
        price: ranked(99, true),
        excess: noSector,
        volume: noVolume,
      }),
    );
    expect(outcome.score).toBe(40);
    expect(outcome.max).toBe(40);
    expect(outcome.band).toBe("elevated");
  });
});

describe("the reader — the repair for a brand that dies at JSON.parse", () => {
  const overTheWire = (outcome: AnomalyOutcome): unknown =>
    JSON.parse(JSON.stringify(toWireAnomalyScore(outcome)));

  it("round-trips a score, clause for clause", () => {
    const outcome = scored(twoFactor(95, 99));
    const read = readAnomalyScore(overTheWire(outcome));
    expect(read).toStrictEqual(outcome);
  });

  it("round-trips an unscored outcome", () => {
    const outcome = scoreAnomaly({
      price: tooFewReturns,
      excess: noSector,
      volume: noVolume,
    });
    expect(readAnomalyScore(overTheWire(outcome))).toStrictEqual(outcome);
  });

  it("REFUSES a score the published contributions do not re-add to", () => {
    // **The check a pass-through spec cannot make** — `CLAUDE.md`'s note that a
    // pass-through proves fidelity and never correctness. A producer broken
    // into inventing a score draws a well-formed, correctly-banded figure; this
    // is what sees it.
    const body = overTheWire(scored(twoFactor(95, 99))) as Record<
      string,
      unknown
    >;
    body.score = 74;
    expect(readAnomalyScore(body)).toBeUndefined();
  });

  it("REFUSES a contribution that is not `round(w × rank / 100)`", () => {
    const body = overTheWire(scored(twoFactor(50, 50))) as {
      score: number;
      contributing: { contribution: number }[];
    };
    const first = body.contributing[0];
    if (first === undefined) throw new Error("expected a clause");
    first.contribution += 3;
    body.score += 3;
    // The sum still re-adds — this is the SECOND check, re-deriving each
    // contribution from the published weight and the drawn figure.
    expect(readAnomalyScore(body)).toBeUndefined();
  });

  it("REFUSES a maximum the published weights do not re-add to", () => {
    const body = overTheWire(scored(twoFactor(50, 50))) as Record<
      string,
      unknown
    >;
    body.max = 100;
    expect(readAnomalyScore(body)).toBeUndefined();
  });

  it("REFUSES a band that is not this bundle's own answer for the score", () => {
    const body = overTheWire(scored(twoFactor(50, 50))) as Record<
      string,
      unknown
    >;
    body.band = "extreme";
    expect(readAnomalyScore(body)).toBeUndefined();
  });

  it("REFUSES a factor named twice", () => {
    const body = overTheWire(scored(twoFactor(50, 50))) as {
      score: number;
      contributing: Record<string, unknown>[];
    };
    const first = body.contributing[0];
    if (first === undefined) throw new Error("expected a clause");
    body.contributing = [first, { ...first }];
    body.score = 40;
    expect(readAnomalyScore(body)).toBeUndefined();
  });

  it("REFUSES a rank of 100, a fractional rank and a sample of 0", () => {
    for (const poison of [
      { rank: 100 },
      { rank: 50.5 },
      { rank: -1 },
      { sampleCount: 0 },
      { sampleCount: 1.5 },
      { weight: 0 },
    ]) {
      const body = overTheWire(scored(twoFactor(50, 50))) as {
        contributing: Record<string, unknown>[];
      };
      const first = body.contributing[0];
      if (first === undefined) throw new Error("expected a clause");
      Object.assign(first, poison);
      expect(readAnomalyScore(body)).toBeUndefined();
    }
  });

  it("is TOTAL — every malformed input is `undefined` rather than a throw", () => {
    for (const value of [
      undefined,
      null,
      0,
      "",
      [],
      {},
      { scored: true },
      { scored: true, absent: [] },
      { scored: true, absent: [], contributing: [] },
      { scored: false, absent: [] },
      { scored: "yes", absent: [] },
      { absent: [{ factor: "price" }] },
    ]) {
      expect(readAnomalyScore(value)).toBeUndefined();
    }
  });

  it("drops nothing that is not on the wire type — the brand does not cross", () => {
    const wire = toWireAnomalyScore(scored(twoFactor(50, 50)));
    // `JSON.stringify` of a value holding a symbol key drops it silently, which
    // is why the mapper is field by field: the keys below are the whole type.
    expect(Object.keys(wire).sort()).toStrictEqual([
      "absent",
      "band",
      "contributing",
      "max",
      "score",
      "scored",
    ]);
    const roundTripped = JSON.parse(JSON.stringify(wire)) as unknown;
    expect(roundTripped).toStrictEqual(wire);
  });
});

describe("what the TYPE refuses, and what it cannot", () => {
  it("refuses an unbranded clause-shaped object", () => {
    const takesAClause = (clause: FactorClause) => clause.contribution;

    // @ts-expect-error — the brand is not exported, so no module but
    // `composite-score.ts` can mint one. This is the whole of AC 5's compile
    // half: `{ label: "Volume", figure: 3.8 }` is a type error wherever a
    // clause is wanted.
    takesAClause({ label: "Volume", figure: 3.8 });

    // @ts-expect-error — and so is a structurally complete one. Every field is
    // right; the brand is the only thing missing, and it cannot be supplied.
    takesAClause({
      factor: "volume",
      weight: 25,
      rank: 50,
      aboveSample: false,
      sampleCount: 2500,
      contribution: 13,
    });

    expect(takesAClause(clauseFor(twoFactor(50, 50), "price"))).toBe(20);
  });

  it("CANNOT prove the number inside a clause came from the calculation it names", () => {
    // **The honest half, asserted so nobody over-trusts the brand.** The brand
    // is a compile error about which module minted the value. That the value is
    // `round(w × u / 100)` of the right inputs is this file's business, and
    // `readAnomalyScore`'s — a test and a runtime check, not a type.
    //
    // Demonstrated: a clause minted by this module with a wrong-but-typed
    // number would typecheck perfectly. The only reason none exists is the
    // tests above.
    const clause = clauseFor(twoFactor(99, 99), "price");
    expect(clause.contribution).toBe(40);
    expect(typeof clause.contribution).toBe("number");
  });
});
