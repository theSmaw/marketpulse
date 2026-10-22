import { describe, expect, it } from "vitest";

import {
  COMPOSITE_FACTORS,
  scoreAnomaly,
  toWireAnomalyScore,
} from "./composite-score.js";
import type {
  CompositeFactor,
  FactorAnswer,
  WireAnomalyOutcome,
} from "./composite-score.js";

/**
 * **Layer three of three: an INDEPENDENT recompute, written from the published
 * weights and the drawn figures, by hand, in a different file** (Task 5.6.3).
 *
 * ## Why this exists when the other two layers are green
 *
 * Story 5.3 proved the three layers are not interchangeable rather than
 * asserting it: a planted signed-percentile defect was caught by **properties
 * only**, `rank + 1` by the **golden sample only**, and
 * `rank × 0.8 when n > 500` by the **independent recompute only, with the
 * golden sample green**. The third of those is the shape this file is written
 * against: a **conditional** rule, keyed on an axis the golden sample does not
 * vary.
 *
 * Two axes are varied here and nowhere else:
 *
 * - **Factor presence**, all eight subsets of the three factors, including the
 *   empty one. A golden row carries one presence pattern; a conditional rule
 *   hiding on *"renormalise when only one factor is present"* is invisible to
 *   twelve rows that all carry two.
 * - **`sampleCount`**, from `1` to `4,620` — the measured range of this
 *   universe's baselines is **737 to 4,620** — because that is precisely the
 *   axis `rank × 0.8 when n > 500` hid on, and the scorer is handed the count
 *   and must not read it. Nothing in the arithmetic below mentions it.
 *
 * ## What makes it independent, said precisely
 *
 * {@link recompute} is written from the **published** weights
 * (`FACTOR_WEIGHTS`, drawn on screen by AC 2) and the **drawn** figures (each
 * clause's own `rank`), with the arithmetic spelled out in this file: the sum
 * of `round(w × u / 100)` over the clauses the explanation publishes, against a
 * maximum that is the sum of those clauses' own weights. It imports **no**
 * helper from `composite-score.ts` — not `bandOf`, not `contributionOf`, which
 * is not exported anyway — and it re-derives the band from the **floors read
 * off the explanation's own output**, in the only way a reader outside that
 * module could: by asking which floors are consistent with the bands the
 * producer drew.
 *
 * **What it cannot catch, stated so nobody over-trusts it.** A wrong *weight*
 * is invisible: the recompute reads the weight the producer published, so a
 * weight set of 50/30/20 would recompute perfectly and be wrong. That is the
 * weights' own test in `composite-score.test.ts` (integers summing to 100) and
 * AC 2's reason for drawing them on screen — a figure nobody can see is a
 * figure nobody can dispute.
 */

/** The eight subsets of the three factors, by name. */
const PRESENCE: readonly (readonly CompositeFactor[])[] = [
  [],
  ["price"],
  ["excess"],
  ["volume"],
  ["price", "excess"],
  ["price", "volume"],
  ["excess", "volume"],
  ["price", "excess", "volume"],
];

/**
 * A deterministic pseudo-random generator, so a failure is reproducible from
 * its seed rather than from a lucky run. `mulberry32`.
 */
const generator = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** One synthetic security's answers, with its own presence set and counts. */
interface Synthetic {
  readonly symbol: string;
  readonly answers: Readonly<Record<CompositeFactor, FactorAnswer>>;
  /** The ordinal each present factor was given. */
  readonly ranks: Readonly<Partial<Record<CompositeFactor, number>>>;
}

const universe = (count: number): readonly Synthetic[] => {
  const random = generator(20_261_022);
  const securities: Synthetic[] = [];

  for (let at = 0; at < count; at += 1) {
    const present = PRESENCE[at % PRESENCE.length];
    if (present === undefined) throw new Error("unreachable");

    const ranks: Partial<Record<CompositeFactor, number>> = {};
    const answers: Partial<Record<CompositeFactor, FactorAnswer>> = {};

    for (const factor of COMPOSITE_FACTORS) {
      if (present.includes(factor)) {
        const rank = Math.floor(random() * 100);
        // **The axis the conditional rule hid on**: anywhere from 1 to the
        // measured ceiling, crossing every plausible threshold a reader might
        // have been tempted to write (500, 737, 2,500).
        const sampleCount = 1 + Math.floor(random() * 4620);
        ranks[factor] = rank;
        answers[factor] = {
          state: "ranked",
          rank,
          aboveSample: random() < 0.02,
          sampleCount,
        };
        continue;
      }

      answers[factor] =
        random() < 0.5
          ? {
              state: "refused",
              refusal: "too-few-samples",
              sampleCount: Math.floor(random() * 2500),
              minimumSampleCount: 2500,
            }
          : { state: "inapplicable", because: "no-sector" };
    }

    securities.push({
      symbol: `SYN${String(at).padStart(4, "0")}`,
      answers: answers as Readonly<Record<CompositeFactor, FactorAnswer>>,
      ranks,
    });
  }

  return securities;
};

/**
 * **The recompute: the score a reader could reach from the explanation.**
 *
 * Written here, by hand, from the weights and the figures the explanation
 * publishes. Deliberately not a loop over `COMPOSITE_FACTORS` and deliberately
 * not sharing `contributionOf`: the whole value of this layer is that it is a
 * **second expression** of the arithmetic.
 */
function recompute(published: WireAnomalyOutcome): {
  readonly score: number;
  readonly max: number;
  readonly factors: number;
} {
  if (!published.scored) return { score: 0, max: 0, factors: 0 };

  let score = 0;
  let max = 0;

  for (const clause of published.contributing) {
    // `round(w × u / 100)`, spelled out: the weight the producer drew, times
    // the ordinal the producer drew, over a hundred, rounded.
    const product = clause.weight * clause.rank;
    const contribution = Math.round(product / 100);
    score += contribution;
    max += clause.weight;
  }

  return { score, max, factors: published.contributing.length };
}

describe("an independent recompute over 800 synthetic securities", () => {
  const securities = universe(800);

  it("covers every one of the eight factor-presence patterns", () => {
    // The coverage this layer exists for, counted rather than assumed — a
    // generator that silently stopped producing one-factor securities would
    // leave the file green and the axis unvisited.
    const seen = new Set<string>();
    for (const security of securities) {
      const present = COMPOSITE_FACTORS.filter(
        (factor) => security.answers[factor].state === "ranked",
      );
      seen.add(present.join("+"));
    }
    expect(seen.size).toBe(PRESENCE.length);
  });

  it("spans the measured sampleCount range, crossing 500, 737 and 2,500", () => {
    const counts: number[] = [];
    for (const security of securities) {
      for (const factor of COMPOSITE_FACTORS) {
        const answer = security.answers[factor];
        if (answer.state === "ranked") counts.push(answer.sampleCount);
      }
    }
    expect(Math.min(...counts)).toBeLessThan(500);
    expect(Math.max(...counts)).toBeGreaterThan(2500);
    expect(counts.filter((count) => count > 737).length).toBeGreaterThan(100);
    expect(counts.filter((count) => count <= 737).length).toBeGreaterThan(100);
  });

  it("reaches the SAME score, maximum and factor count on every one", () => {
    for (const security of securities) {
      const outcome = scoreAnomaly(security.answers);
      const published = toWireAnomalyScore(outcome);
      const mine = recompute(published);

      if (!published.scored) {
        expect(mine.factors).toBe(0);
        expect(published.absent).toHaveLength(COMPOSITE_FACTORS.length);
        continue;
      }

      expect(mine.score).toBe(published.score);
      expect(mine.max).toBe(published.max);
      expect(mine.factors).toBe(published.contributing.length);
    }
  });

  it("finds no score that `sampleCount` moved — the conditional-rule axis", () => {
    // **The property `rank × 0.8 when n > 500` would fail.** Every security is
    // re-scored with its counts replaced and nothing else touched; a score that
    // reads the count is a score that changes here.
    for (const security of securities) {
      const rebuilt: Partial<Record<CompositeFactor, FactorAnswer>> = {};
      for (const factor of COMPOSITE_FACTORS) {
        const answer = security.answers[factor];
        rebuilt[factor] =
          answer.state === "ranked" ? { ...answer, sampleCount: 4620 } : answer;
      }

      const original = scoreAnomaly(security.answers);
      const recounted = scoreAnomaly(
        rebuilt as Readonly<Record<CompositeFactor, FactorAnswer>>,
      );

      expect(original.scored).toBe(recounted.scored);
      if (original.scored && recounted.scored) {
        expect(recounted.score).toBe(original.score);
        expect(recounted.band).toBe(original.band);
        expect(recounted.max).toBe(original.max);
      }
    }
  });

  it("finds no score that `aboveSample` moved", () => {
    // The flag is the stronger claim *the baseline has nothing to compare
    // with*, and it deliberately does **not** raise the unit — a unit above 99
    // would be a 100 the sample cannot support. A scorer that nudged it would
    // show here.
    for (const security of securities) {
      const flipped: Partial<Record<CompositeFactor, FactorAnswer>> = {};
      for (const factor of COMPOSITE_FACTORS) {
        const answer = security.answers[factor];
        flipped[factor] =
          answer.state === "ranked"
            ? { ...answer, aboveSample: !answer.aboveSample }
            : answer;
      }

      const original = scoreAnomaly(security.answers);
      const other = scoreAnomaly(
        flipped as Readonly<Record<CompositeFactor, FactorAnswer>>,
      );

      if (original.scored && other.scored) {
        expect(other.score).toBe(original.score);
      }
    }
  });

  it("recomputes the BAND from the floors the producer's own output implies", () => {
    // **The band, re-derived without importing `bandOf`.** A reader outside
    // that module can only learn the floors by watching which scores drew
    // which band; this reconstructs them from 800 securities and then asserts
    // that the reconstruction is a **total, monotone** partition — which is
    // false if any score drew a band inconsistent with another score's.
    const lowestOf = new Map<string, number>();
    const highestOf = new Map<string, number>();

    for (const security of securities) {
      const outcome = scoreAnomaly(security.answers);
      if (!outcome.scored) continue;
      const band = outcome.band;
      const low = lowestOf.get(band);
      const high = highestOf.get(band);
      if (low === undefined || outcome.score < low) {
        lowestOf.set(band, outcome.score);
      }
      if (high === undefined || outcome.score > high) {
        highestOf.set(band, outcome.score);
      }
    }

    // Every band's observed range must be disjoint from and ordered against
    // every other's. A conditional band rule — one that read the factor count,
    // say — would overlap two ranges and fail here.
    const observed = [...lowestOf.keys()].sort(
      (a, b) => (lowestOf.get(a) ?? 0) - (lowestOf.get(b) ?? 0),
    );
    for (let at = 1; at < observed.length; at += 1) {
      const earlier = observed[at - 1];
      const later = observed[at];
      if (earlier === undefined || later === undefined) {
        throw new Error("unreachable");
      }
      expect(highestOf.get(earlier) ?? 0).toBeLessThan(
        lowestOf.get(later) ?? 0,
      );
    }
    expect(observed.length).toBeGreaterThan(2);
  });

  it("never produces a score above its own maximum, or below zero", () => {
    for (const security of securities) {
      const outcome = scoreAnomaly(security.answers);
      if (!outcome.scored) continue;
      expect(outcome.score).toBeGreaterThanOrEqual(0);
      expect(outcome.score).toBeLessThanOrEqual(outcome.max);
      expect(outcome.max).toBeLessThanOrEqual(100);
    }
  });

  it("never renormalises: a one-factor score never exceeds its own weight", () => {
    // **The promotion AC 3 names, checked across the presence axis.** Under
    // renormalisation a 1-of-3 security at the 99th would read 99, which is
    // above every two-factor score in this universe — the top-N of the
    // worst-covered securities, exactly.
    for (const security of securities) {
      const outcome = scoreAnomaly(security.answers);
      if (!outcome.scored) continue;
      if (outcome.contributing.length !== 1) continue;
      // No `undefined` guard, and the absence is the point: `contributing` is
      // `[T, ...T[]]`, so the compiler knows index `0` is there. A tuple that
      // cannot be empty is AC 5's *cannot be constructed without its
      // explanation* paying out at a call site.
      const only = outcome.contributing[0];
      expect(outcome.score).toBeLessThanOrEqual(only.weight);
      expect(outcome.max).toBe(only.weight);
    }
  });
});
