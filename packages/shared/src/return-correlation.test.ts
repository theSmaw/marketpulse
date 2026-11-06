import { describe, expect, it } from "vitest";

import {
  CORRELATION_LOOKBACK_SESSIONS,
  CORRELATION_MINIMUM_OVERLAP,
  CORRELATION_REFUSALS,
  correlationIsSignificant,
  pearsonCorrelation,
} from "./return-correlation.js";
import type { CorrelationOutcome } from "./return-correlation.js";
import { BASELINE_LOOKBACK_SESSIONS } from "./return-baseline.js";

/**
 * **The pairwise correlation's arithmetic, against hand-computed answers**
 * (Task 6.5.1).
 *
 * Every expectation below is either a value Pearson's own definition fixes
 * exactly (`±1` for a linear pair, `0` for an orthogonal one) or a figure
 * stated beside its cross-check. **Nothing here re-expresses the
 * implementation** — a test that recomputed `r` the same way would be a second
 * copy of the thing under test.
 *
 * ## The cross-check for the significance figures
 *
 * `correlationIsSignificant` is a two-tailed 95% Fisher-z interval, so for any
 * `n` the implied floor on `|r|` is `tanh(1.96 / √(n − 3))`. That is one line
 * of arithmetic a reader can take independently, and the figures the cases
 * below straddle were taken that way:
 *
 * | `n`   | implied `|r|` floor |
 * | ----- | ------------------- |
 * | 4     | **0.96109**         |
 * | 10    | 0.62963             |
 * | 100   | **0.19642**         |
 * | 1,000 | 0.06199             |
 * | 4,620 | **0.02884**         |
 *
 * The transform and its standard error are Fisher's — `z = atanh(r)`,
 * `SE(z) = 1/√(n − 3)` — which is the form every statistics text gives for a
 * confidence interval on a correlation coefficient, and is why
 * `CORRELATION_MINIMUM_OVERLAP` is 4 rather than a number anybody chose.
 */

/** A series on the four anchors `0, 1, 2, 3` minutes, as epoch-ish keys. */
const seriesOf = (returns: readonly number[]): ReadonlyMap<number, number> =>
  new Map(returns.map((value, index) => [index * 60_000, value]));

describe("the window is the price baseline's own, not a second number", () => {
  it("is BASELINE_LOOKBACK_SESSIONS itself", () => {
    // Story 6.5's Open Decision 2: the same 60-session grid, read in the same
    // pass. A second constant here would drift the first time one moved.
    expect(CORRELATION_LOOKBACK_SESSIONS).toBe(BASELINE_LOOKBACK_SESSIONS);
  });
});

describe("the refusal vocabulary", () => {
  it("holds the two words and no others", () => {
    expect([...CORRELATION_REFUSALS]).toEqual([
      "too-few-overlapping-samples",
      "zero-variance",
    ]);
  });
});

/**
 * **The measured residual of the shipped single-pass form: `2.22e-16`.**
 *
 * A perfectly linear pair comes out at `0.9999999999999998` rather than at
 * `1`, which is two ulps and is the documented cost of accumulating sums in
 * one walk instead of centring the series in two. The tolerance is stated and
 * asserted rather than hidden, because `toEqual({ r: 1 })` would be asserting
 * something the implementation does not do — and `toBeCloseTo`'s default of
 * two decimal places would assert almost nothing.
 */
const EXACT_TO = 12;

/** `r`, narrowed — a refusal has no coefficient at all, which is the point. */
const coefficientOf = (outcome: CorrelationOutcome): number => {
  if ("refusal" in outcome) {
    throw new Error(`expected a coefficient, got ${outcome.refusal}`);
  }
  return outcome.r;
};

/** `n`, narrowed, so a refusal cannot satisfy a count assertion. */
const overlapOf = (outcome: CorrelationOutcome): number => {
  if ("refusal" in outcome) {
    throw new Error(`expected an overlap, got ${outcome.refusal}`);
  }
  return outcome.n;
};

describe("pearsonCorrelation — the values the definition fixes exactly", () => {
  it("answers 1 for a perfectly, positively linear pair", () => {
    const outcome = pearsonCorrelation(
      seriesOf([1, 2, 3, 4]),
      // `2x`, so every point is on one upward line.
      seriesOf([2, 4, 6, 8]),
    );

    expect(coefficientOf(outcome)).toBeCloseTo(1, EXACT_TO);
    expect(overlapOf(outcome)).toBe(4);
  });

  it("answers −1 for a perfectly anti-correlated pair", () => {
    const outcome = pearsonCorrelation(
      seriesOf([1, 2, 3, 4]),
      seriesOf([-1, -2, -3, -4]),
    );

    expect(coefficientOf(outcome)).toBeCloseTo(-1, EXACT_TO);
    expect(overlapOf(outcome)).toBe(4);
  });

  it("answers 0 for a constructed orthogonal pair", () => {
    // `x = [1, −1, 1, −1]`, `y = [1, 1, −1, −1]`: both sum to zero and their
    // products sum to `1 − 1 − 1 + 1 = 0`, so the numerator is exactly zero
    // while both variances are positive. This is the one case where `r = 0` is
    // a **measurement** rather than the refusal a zero denominator earns.
    const outcome = pearsonCorrelation(
      seriesOf([1, -1, 1, -1]),
      seriesOf([1, 1, -1, -1]),
    );

    // Exactly zero, with no tolerance: the numerator is a sum of terms that
    // cancel in binary without rounding, so this is the one definitional value
    // the single-pass form reaches exactly.
    expect(outcome).toEqual({ r: 0, n: 4 });
  });

  it("counts the OVERLAP rather than either leg's own length", () => {
    // Median stored coverage is 82.8%, so this is the ordinary case rather
    // than an edge: the longer leg's extra anchors are not samples.
    const outcome = pearsonCorrelation(
      seriesOf([1, 2, 3, 4, 5, 6, 7, 8]),
      seriesOf([2, 4, 6, 8]),
    );

    expect(coefficientOf(outcome)).toBeCloseTo(1, EXACT_TO);
    expect(overlapOf(outcome)).toBe(4);
  });

  it("gives the same answer whichever way round the two legs are handed in", () => {
    const sparse = seriesOf([1, 2, 3, 4]);
    const dense = seriesOf([2, 4, 6, 8, 10, 12]);

    // The implementation walks the SMALLER map and probes the larger, so the
    // two call orders take different code paths to one answer.
    expect(pearsonCorrelation(sparse, dense)).toEqual(
      pearsonCorrelation(dense, sparse),
    );
  });
});

describe("pearsonCorrelation — the two refusals, never a NaN and never a zero", () => {
  it("refuses an overlap below the floor", () => {
    expect(
      pearsonCorrelation(seriesOf([1, 2, 3]), seriesOf([2, 4, 6])),
    ).toEqual({ refusal: "too-few-overlapping-samples" });
  });

  it("computes AT the floor, which is what makes the floor a floor", () => {
    expect(CORRELATION_MINIMUM_OVERLAP).toBe(4);

    const outcome = pearsonCorrelation(
      seriesOf([1, 2, 3, 4]),
      seriesOf([2, 4, 6, 8]),
    );

    expect(coefficientOf(outcome)).toBeCloseTo(1, EXACT_TO);
    expect(overlapOf(outcome)).toBe(4);
  });

  it("refuses two series that share no anchor at all", () => {
    const early = new Map([
      [0, 1],
      [60_000, 2],
      [120_000, 3],
      [180_000, 4],
    ]);
    const late = new Map([
      [900_000, 1],
      [960_000, 2],
      [1_020_000, 3],
      [1_080_000, 4],
    ]);

    expect(pearsonCorrelation(early, late)).toEqual({
      refusal: "too-few-overlapping-samples",
    });
  });

  it("refuses a leg with no variance rather than answering NaN or 0", () => {
    // A halted security, a stub, or an overlap that is one close repeated.
    // Pearson's denominator is zero here, and **both** wrong answers are
    // reachable from the same arithmetic: `0/0` is `NaN`, and a `?? 0` over it
    // is the claim *these two do not move together* — which is a statement
    // about the market made from a division by zero.
    const outcome = pearsonCorrelation(
      seriesOf([1, 2, 3, 4]),
      seriesOf([5, 5, 5, 5]),
    );

    expect(outcome).toEqual({ refusal: "zero-variance" });
    expect(outcome).not.toHaveProperty("r");
  });

  it("refuses when BOTH legs are constant", () => {
    expect(
      pearsonCorrelation(seriesOf([5, 5, 5, 5]), seriesOf([7, 7, 7, 7])),
    ).toEqual({ refusal: "zero-variance" });
  });
});

describe("correlationIsSignificant — a derived floor rather than a chosen one", () => {
  it("refuses an overlap below the definedness floor at ANY coefficient", () => {
    // `SE(z) = 1/√(n − 3)` divides by zero at `n = 3`. A perfect correlation
    // over three shared anchors is still not evidence this product will draw.
    expect(correlationIsSignificant(1, 3)).toBe(false);
    expect(correlationIsSignificant(0.99, 3)).toBe(false);
    expect(correlationIsSignificant(1, 0)).toBe(false);
  });

  it("never calls a coefficient of zero significant, at any overlap", () => {
    for (const n of [4, 10, 100, 1_000, 4_620]) {
      expect(correlationIsSignificant(0, n)).toBe(false);
    }
  });

  it("straddles the implied floor at n = 4 — 0.96109", () => {
    expect(correlationIsSignificant(0.95, 4)).toBe(false);
    expect(correlationIsSignificant(0.99, 4)).toBe(true);
    // Perfect correlation at the floor: `atanh(1)` is infinite and the
    // interval collapses onto the bound, which is the right answer rather
    // than an accident of IEEE arithmetic.
    expect(correlationIsSignificant(1, 4)).toBe(true);
    expect(correlationIsSignificant(-1, 4)).toBe(true);
  });

  it("straddles the implied floor at n = 100 — 0.19642", () => {
    expect(correlationIsSignificant(0.15, 100)).toBe(false);
    expect(correlationIsSignificant(0.25, 100)).toBe(true);
  });

  it("straddles the implied floor at n = 4,620 — 0.02884", () => {
    // The per-security ceiling the price baseline measured. The floor here is
    // **0.029**, which is why a chosen `|r| ≥ 0.5` would have refused real
    // relationships in the most liquid names in the universe.
    expect(correlationIsSignificant(0.02, 4_620)).toBe(false);
    expect(correlationIsSignificant(0.03, 4_620)).toBe(true);
  });

  it("is symmetric in the sign, because the interval is two-tailed", () => {
    for (const n of [4, 10, 100, 4_620]) {
      for (const r of [0.02, 0.15, 0.25, 0.95, 0.99]) {
        expect(correlationIsSignificant(-r, n)).toBe(
          correlationIsSignificant(r, n),
        );
      }
    }
  });

  it("gets STRICTER as the overlap falls, which is the whole argument", () => {
    // One coefficient, four overlaps. A fixed threshold cannot express this
    // and would therefore admit noise in thin names while refusing real
    // relationships in liquid ones.
    expect(correlationIsSignificant(0.3, 4_620)).toBe(true);
    expect(correlationIsSignificant(0.3, 100)).toBe(true);
    expect(correlationIsSignificant(0.3, 10)).toBe(false);
    expect(correlationIsSignificant(0.3, 4)).toBe(false);
  });

  it("answers false for a non-finite coefficient rather than throwing", () => {
    expect(correlationIsSignificant(Number.NaN, 4_620)).toBe(false);
    expect(correlationIsSignificant(Number.POSITIVE_INFINITY, 4_620)).toBe(
      false,
    );
  });
});
