import { describe, expect, it } from "vitest";

import {
  BASELINE_BREAKPOINT_COUNT,
  BASELINE_MINIMUM_SAMPLE,
  toTicker,
} from "@marketpulse/shared";

import { breakpointsOf } from "./return-baseline.js";
import { comparableBaseline, returnPercentileOf } from "./return-percentile.js";

import type {
  RankableReturnBaseline,
  StoredReturnBaseline,
} from "./return-baseline-store.js";
import type {
  BaselineComparison,
  ReturnBaselineDistribution,
} from "./return-percentile.js";

// **Where a magnitude sits in a baseline** (Task 5.3.3).
//
// Task 5.3.4 owns the three correctness layers this figure needs — a golden
// sample, an independent recompute by a different method, and the properties —
// and deliberately so: they are what catch a **lying producer**, and a test
// written beside the producer by the same author in the same hour is the layer
// least likely to. What is here is the shape and the two rules the owner
// decided: **the integer ceiling** and **the counted `n`**.

/** A distribution over a sample with a known shape. */
const over = (samples: readonly number[]): ReturnBaselineDistribution => ({
  breakpoints: breakpointsOf(samples),
  sampleCount: samples.length,
  spanMinutes: 5,
  feed: "sip",
});

/** `0`, `1`, … `100` — one sample per rank, so the answer is the input. */
const ONE_PER_RANK = Array.from({ length: 101 }, (_unused, index) => index);

describe("returnPercentileOf", () => {
  it("answers the rank whose breakpoint the magnitude has reached", () => {
    // With 101 evenly spaced samples the `n`th breakpoint IS `n`, so a
    // magnitude of 42 is the 42nd percentile and the arithmetic is readable by
    // eye rather than by argument.
    const baseline = over(ONE_PER_RANK);

    expect(returnPercentileOf(42, baseline)?.rank).toBe(42);
    expect(returnPercentileOf(0, baseline)?.rank).toBe(0);
    expect(returnPercentileOf(99, baseline)?.rank).toBe(99);
  });

  it("floors rather than rounding, so every rank it names is earned", () => {
    // A magnitude between two breakpoints has reached the lower one and not
    // the upper, and the floor is the only reading that cannot over-claim:
    // 42% of the sample really is at or below 42.9.
    expect(returnPercentileOf(42.9, over(ONE_PER_RANK))?.rank).toBe(42);
  });

  it("never answers 100, and says when the move is above every sample", () => {
    // **Gate 1 decision 2.** Above the highest order statistic there is no
    // sample, so `100th` asserts a strict maximum over a distribution that
    // excludes the very window being scored — and no reader can falsify it.
    const baseline = over(ONE_PER_RANK);

    // At the maximum exactly: a legitimate 99th, because 1% of the baseline is
    // at or above it. **Not** `aboveSample`, which is the stronger claim.
    expect(returnPercentileOf(100, baseline)).toMatchObject({
      rank: 99,
      aboveSample: false,
    });

    // Strictly above every sample: the baseline has nothing to compare it
    // with, which the surface draws as `>99th`.
    expect(returnPercentileOf(100.1, baseline)).toMatchObject({
      rank: 99,
      aboveSample: true,
    });

    // The ceiling holds for any magnitude, however extreme.
    expect(returnPercentileOf(10_000, baseline)?.rank).toBe(
      BASELINE_BREAKPOINT_COUNT - 2,
    );
  });

  it("ranks a magnitude, so a fall and a rise of one size are one answer", () => {
    // Story 5.1's decisions 2 and 3: the baseline is a pooled distribution of
    // **absolute** moves, and the `abs` is taken inside the producer so this
    // is a property of the module rather than a discipline of its callers.
    // The direction is already on screen, carried by the glyph and the sign.
    const baseline = over(ONE_PER_RANK);

    expect(returnPercentileOf(-42, baseline)).toStrictEqual(
      returnPercentileOf(42, baseline),
    );
  });

  it("carries the counted `n`, the stride and the tape, unchanged", () => {
    // **The counted `n`, never a constant** (Gate 1 decision 2): the measured
    // range over this universe is 737 to 4,620, so a sentence quoting a
    // nominal 4,680 would be wrong for almost every security on the list.
    //
    // The stride and the tape travel for invariant 6's reason and the span's:
    // the sentence a reader sees says what was counted, and the browser spells
    // neither of them.
    const baseline = over(ONE_PER_RANK);

    expect(returnPercentileOf(42, baseline)).toStrictEqual({
      rank: 42,
      aboveSample: false,
      sampleCount: 101,
      spanMinutes: 5,
      feed: "sip",
    });
  });

  it("refuses rather than ranking against a distribution of the wrong size", () => {
    // The ranks are the array's own indices, so a shorter array would silently
    // rename every one of them — a wrong number with no symptom. `undefined`
    // rather than a rank of `0`, because *we cannot compare this* and *this is
    // the least unusual move on record* are different facts.
    const baseline = over(ONE_PER_RANK);

    expect(
      returnPercentileOf(42, {
        ...baseline,
        breakpoints: baseline.breakpoints.slice(0, 21),
      }),
    ).toBeUndefined();
  });

  it.each([
    ["a non-finite magnitude", { percent: Number.NaN }],
    ["an infinite magnitude", { percent: Number.POSITIVE_INFINITY }],
  ])("refuses %s", (_label, { percent }) => {
    expect(returnPercentileOf(percent, over(ONE_PER_RANK))).toBeUndefined();
  });

  it("refuses a distribution whose sample count is not a count", () => {
    // A refusal row carries a `sample_count` and no breakpoints, so the two
    // fields can legitimately disagree in the store — but a distribution
    // claiming zero samples has no order statistics to have produced it.
    const baseline = over(ONE_PER_RANK);

    expect(
      returnPercentileOf(42, { ...baseline, sampleCount: 0 }),
    ).toBeUndefined();
    expect(
      returnPercentileOf(42, { ...baseline, sampleCount: 4620.5 }),
    ).toBeUndefined();
  });

  it("refuses a distribution with a non-finite breakpoint", () => {
    // `float8[]` out of `pg` is parsed per element, so one unreadable value is
    // reachable without the array changing length — and a comparison against
    // `NaN` is always false, which would quietly answer the rank below it.
    const baseline = over(ONE_PER_RANK);
    const holed = [...baseline.breakpoints];
    holed[50] = Number.NaN;

    expect(
      returnPercentileOf(42, { ...baseline, breakpoints: holed }),
    ).toBeUndefined();
  });

  it("is monotone over a real-shaped distribution", () => {
    // A tail-heavy sample rather than the even one above, because the even one
    // is the arithmetic's own best case. 300 magnitudes with a fat upper tail;
    // a bigger move is never a smaller percentile.
    const samples = Array.from(
      { length: 300 },
      (_unused, index) => (index / 299) ** 3 * 8,
    );
    const baseline = over(samples);

    let previous = -1;
    for (let magnitude = 0; magnitude <= 8; magnitude += 0.05) {
      const answer = returnPercentileOf(magnitude, baseline);
      expect(answer).toBeDefined();
      expect(answer?.rank).toBeGreaterThanOrEqual(previous);
      previous = answer?.rank ?? -1;
    }
  });
});

// ===========================================================================
// The three correctness layers (Task 5.3.4)
// ===========================================================================
//
// **A percentile is a number nobody can eyeball**, and it can be wrong in two
// unrelated ways: the convention can drift (a nearest-rank inverse, an
// exclusive quantile, a signed baseline) or the producer can simply lie at a
// scale no hand-written sample reaches. Each layer below is blind to what
// another catches, which is why there are three and not one.
//
// - the **golden sample** is the only test a reviewer can check by eye, and it
//   is where a convention change shows up. It is blind to a producer that is
//   right on eleven samples and wrong on four thousand.
// - the **independent recompute** answers the same question by a different
//   method — *what fraction of the sample is below this magnitude* — and never
//   touches `breakpointsOf`'s interpolation or its sort. **This is the layer
//   that catches a lying producer.** It is blind to a convention both methods
//   share.
// - the **properties** hold over any corpus, which is their strength and their
//   whole weakness: every one of them is invariant under a permutation, so a
//   producer with the wrong convention satisfies all five.

/**
 * A hand-written distribution with **ties**, and the tie convention is the
 * part worth reviewing.
 *
 * Fifty samples of `0.5` then fifty-one of `2`, which is 101 samples — so the
 * `r`th breakpoint is literally the `r`th sorted sample and no interpolation
 * is involved: `Q(r) = 0.5` for `r ≤ 49` and `Q(r) = 2` for `r ≥ 50`.
 *
 * A magnitude of exactly `0.5` has therefore reached forty-nine ranks' worth
 * of breakpoints and not the fiftieth, and the producer answers the
 * **greatest** rank it has reached — which is the only reading that does not
 * over-claim, because every one of those ranks' samples really is at or below
 * it.
 */
const TIED: readonly number[] = [
  ...Array.from({ length: 50 }, () => 0.5),
  ...Array.from({ length: 51 }, () => 2),
];

describe("the golden sample — a known answer at six probe points", () => {
  it.each([
    ["the exact bottom of the sample", 0, 0],
    ["an exact knot, the median", 50, 50],
    ["between two knots, floored", 50.9, 50],
    ["the exact 99th", 99, 99],
    ["the sample maximum exactly", 100, 99],
    ["the same magnitude, negated", -50, 50],
  ])("%s", (_label, magnitude, rank) => {
    // 101 evenly spaced samples, so the `r`th breakpoint IS `r` and every
    // answer below is readable without doing any arithmetic.
    expect(returnPercentileOf(magnitude, over(ONE_PER_RANK))?.rank).toBe(rank);
  });

  it.each([
    ["the tied value itself — the TOP of the tied block", 0.5, 49],
    ["above the tie and below the next block", 1, 49],
    ["the second block, at the ceiling", 2, 99],
    ["below every sample", 0.4, 0],
  ])("with ties: %s", (_label, magnitude, rank) => {
    expect(returnPercentileOf(magnitude, over(TIED))?.rank).toBe(rank);
  });

  it("answers the 0th for a magnitude below every sample, and says nothing more", () => {
    // **Recorded rather than asserted as desirable.** The floor and *below the
    // floor* are one answer — `0th` — because the rank is the greatest
    // breakpoint reached and no breakpoint has been reached. It is the honest
    // reading for a surface that draws `0th percentile`: the least unusual
    // thing on record. `aboveSample`'s mirror at the bottom end would be a
    // second flag nothing on screen would draw.
    expect(returnPercentileOf(0.4, over(TIED))).toMatchObject({
      rank: 0,
      aboveSample: false,
    });
  });
});

/**
 * A deterministic corpus with a realistic shape — **1,000 signed returns**, so
 * the recompute below runs at three orders of magnitude above the golden
 * sample.
 *
 * A linear congruential generator rather than `Math.random`, because a test
 * that fails on one run in fifty is a test nobody trusts; the constants are
 * `glibc`'s. The values are **signed** on purpose: the baseline is a
 * magnitude distribution and a producer that forgot the `abs` would otherwise
 * be handed only positive input.
 */
function pseudoReturns(count: number): readonly number[] {
  let state = 20_261_014;
  const values: number[] = [];
  for (let index = 0; index < count; index += 1) {
    state = (1_103_515_245 * state + 12_345) % 2_147_483_648;
    const uniform = state / 2_147_483_648;
    // A tail-heavy, two-sided shape: most moves tiny, a few large.
    values.push((uniform - 0.5) * 2 * (1 - uniform) ** 2 * 12);
  }
  return values;
}

describe("the independent recompute — a different method, over 1,000 samples", () => {
  /**
   * **The percentile by counting, which is not how the producer computes it.**
   *
   * The producer interpolates 101 order statistics and then inverts the grid.
   * This sorts nothing of the producer's and calls none of its functions: it
   * asks the textbook question — *what fraction of the sample is strictly
   * below this magnitude* — straight off the corpus.
   *
   * The two definitions are not identical and are not asserted to be. The
   * inclusive-interpolation convention and the fraction-below convention
   * differ by at most one position of the sample, which is `100/(n−1)` points
   * — **0.1 points at n = 1,000** — plus the floor each applies, so the
   * agreement is asserted to **one printed ordinal**. That tolerance is
   * derived from `n`, not chosen, and it is three orders of magnitude tighter
   * than the defect it is here to catch.
   */
  const byCounting = (magnitude: number, corpus: readonly number[]): number => {
    const target = Math.abs(magnitude);
    let below = 0;
    for (const value of corpus) {
      if (Math.abs(value) < target) below += 1;
    }
    return Math.min(Math.floor((100 * below) / corpus.length), 99);
  };

  const CORPUS = pseudoReturns(1000);

  it("agrees with the producer to one ordinal at fifty probe points", () => {
    const baseline = over(CORPUS.map((value) => Math.abs(value)));
    const sorted = [...CORPUS.map((value) => Math.abs(value))].sort(
      (left, right) => left - right,
    );
    const largest = sorted[sorted.length - 1] ?? 0;

    let compared = 0;
    for (let step = 0; step < 50; step += 1) {
      // Probe points spread across the whole range rather than sampled from
      // the corpus, so the comparison includes magnitudes that fall between
      // samples — which is exactly where two conventions disagree.
      const magnitude = (largest * step) / 49;
      const answer = returnPercentileOf(magnitude, baseline);

      expect(answer).toBeDefined();
      expect(
        Math.abs((answer?.rank ?? -1) - byCounting(magnitude, CORPUS)),
        `at magnitude ${String(magnitude)}`,
      ).toBeLessThanOrEqual(1);
      compared += 1;
    }

    // **The count is asserted**, because a loop that compared nothing — an
    // empty corpus, a `largest` of zero — would pass every assertion above.
    expect(compared).toBe(50);
  });

  it("agrees at the tail, which is the only end a reader looks at", () => {
    // The tail is where the figure is read and where a convention error is
    // largest in consequence, so it is probed separately rather than left to
    // two of fifty evenly spaced points.
    const magnitudes = CORPUS.map((value) => Math.abs(value));
    const baseline = over(magnitudes);
    const sorted = [...magnitudes].sort((left, right) => left - right);

    for (const position of [950, 975, 990, 995, 999]) {
      const magnitude = sorted[position] ?? 0;
      expect(
        Math.abs(
          (returnPercentileOf(magnitude, baseline)?.rank ?? -1) -
            byCounting(magnitude, CORPUS),
        ),
        `at sorted position ${String(position)}`,
      ).toBeLessThanOrEqual(1);
    }
  });
});

describe("the properties", () => {
  const MAGNITUDES = pseudoReturns(500).map((value) => Math.abs(value));
  const rankOf = (
    magnitude: number,
    samples: readonly number[],
  ): number | undefined => returnPercentileOf(magnitude, over(samples))?.rank;

  it("is monotone: a larger magnitude is never a smaller rank", () => {
    const baseline = over(MAGNITUDES);
    let previous = -1;

    for (let step = 0; step <= 400; step += 1) {
      const rank = returnPercentileOf((step * 12) / 400, baseline)?.rank ?? -1;
      expect(rank).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
  });

  it("is bounded: every answer is an integer in 0…99", () => {
    const baseline = over(MAGNITUDES);

    for (const magnitude of [0, 0.0001, 1, 3, 11, 1000, Number.MAX_VALUE]) {
      const rank = returnPercentileOf(magnitude, baseline)?.rank;
      expect(Number.isInteger(rank)).toBe(true);
      expect(rank).toBeGreaterThanOrEqual(0);
      expect(rank).toBeLessThanOrEqual(99);
    }
  });

  it("is permutation-invariant: the order the samples arrived in is not data", () => {
    // The pass reads one ordered index scan per security, so the corpus's
    // order is an artefact of the heap. A producer that depended on it would
    // be reading the store's physical layout as if it were the market's.
    const shuffled = [...MAGNITUDES];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      // A deterministic shuffle, for `pseudoReturns`' reason.
      const swap = (index * 7 + 3) % (index + 1);
      const left = shuffled[index];
      const right = shuffled[swap];
      if (left !== undefined && right !== undefined) {
        shuffled[index] = right;
        shuffled[swap] = left;
      }
    }

    expect(shuffled).not.toStrictEqual(MAGNITUDES);
    for (const magnitude of [0.05, 0.4, 1.2, 4, 9]) {
      expect(rankOf(magnitude, shuffled)).toBe(rankOf(magnitude, MAGNITUDES));
    }
  });

  it("survives duplicating the corpus, to one ordinal", () => {
    // **A distribution is its SHAPE and not its size**, so the same corpus
    // twice over must rank a magnitude the same way — which is also the
    // property that catches a producer reading `sampleCount` into the
    // arithmetic rather than only reporting it.
    //
    // **To one ordinal rather than exactly, and the reason is the convention
    // rather than a tolerance for error.** Inclusive linear interpolation
    // takes the order statistic at position `p·(n−1)`, and doubling `n` moves
    // that position to `p·(2n−1)` — which is one half-sample further through
    // the corpus, not the same place. The ranks agree to within one printed
    // ordinal and **exact equality is not a property of this convention**;
    // asserting it would have been asserting a bug.
    const doubled = [...MAGNITUDES, ...MAGNITUDES];

    for (const magnitude of [0.05, 0.4, 1.2, 4, 9]) {
      const once = rankOf(magnitude, MAGNITUDES) ?? -1;
      const twice = rankOf(magnitude, doubled) ?? -1;
      expect(
        Math.abs(once - twice),
        `at magnitude ${String(magnitude)}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("is magnitude-symmetric: `pct(+x)` is `pct(−x)`, exactly", () => {
    // **The one property that catches a signed percentile shipped against a
    // magnitude baseline** — the defect where a −3% move ranks near the 0th
    // because it is the smallest *number* in the corpus, and the surface then
    // draws the single most reassuring figure on the page about the largest
    // fall of the day. Exact rather than within one, because the `abs` is
    // taken inside the producer: there is nothing here to be approximate
    // about.
    const baseline = over(MAGNITUDES);

    for (const magnitude of [0.0001, 0.05, 0.4, 1.2, 4, 9, 1000]) {
      expect(returnPercentileOf(-magnitude, baseline)).toStrictEqual(
        returnPercentileOf(magnitude, baseline),
      );
    }
  });
});

// ===========================================================================
// The refusal as a TYPE (Task 5.3.4, AC 6)
// ===========================================================================

/** A stored generation, with whatever the case under test needs changed. */
const stored = (
  overrides: Partial<RankableReturnBaseline>,
): StoredReturnBaseline => ({
  symbol: toTicker("NVDA"),
  observedAt: new Date("2026-09-11T20:00:00.000Z"),
  lookbackSessions: 60,
  sampleCount: BASELINE_MINIMUM_SAMPLE,
  refusal: null,
  breakpoints: breakpointsOf(ONE_PER_RANK),
  ...overrides,
});

const GRID = { spanMinutes: 5, feed: "sip" } as const;

describe("comparableBaseline — the minimum sample, as a type", () => {
  it("hands back a distribution at the minimum exactly", () => {
    const comparison = comparableBaseline(
      stored({ sampleCount: BASELINE_MINIMUM_SAMPLE }),
      GRID,
    );

    expect(comparison.ranked).toBe(true);
    if (!comparison.ranked) throw new Error("expected a distribution");
    expect(comparison.distribution.sampleCount).toBe(BASELINE_MINIMUM_SAMPLE);
    // The grid and the tape are the producers', carried rather than spelled.
    expect(comparison.distribution.spanMinutes).toBe(5);
    expect(comparison.distribution.feed).toBe("sip");
  });

  it("has NO distribution member at all one sample below the minimum", () => {
    // **The assertion done-when 1 asks for, at `min − 1`.** It is not *the
    // field is `undefined`* — the member does not exist, which is what makes
    // the omission a compile error for every caller rather than a branch each
    // one has to remember. `exactOptionalPropertyTypes` is why *absent* and
    // *present as `undefined`* are different types in this repository.
    const comparison = comparableBaseline(
      stored({ sampleCount: BASELINE_MINIMUM_SAMPLE - 1 }),
      GRID,
    );

    expect(comparison.ranked).toBe(false);
    expect("distribution" in comparison).toBe(false);
    expect(comparison).toStrictEqual({
      ranked: false,
      refusal: "too-few-samples",
      sampleCount: BASELINE_MINIMUM_SAMPLE - 1,
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    });
  });

  it("refuses the floor this universe actually has", () => {
    // `ERIE`, measured at **737** samples over this machine's own store on
    // 2026-10-14 — the real floor over 511 measured securities, where the
    // standard error of the printed ordinal at the median is **1.84
    // percentile points**, i.e. the last digit is noise.
    const comparison = comparableBaseline(stored({ sampleCount: 737 }), GRID);

    expect(comparison).toMatchObject({
      ranked: false,
      refusal: "too-few-samples",
      sampleCount: 737,
    });
  });

  it("carries the pass's own refusal through with its own word", () => {
    // *We have too little history* and *the history we have contains a price
    // break we cannot adjust* are different facts with different repairs, so
    // the stored word survives rather than collapsing into the sample one —
    // and the sample count travels with it, because a refused row carries the
    // count it reached.
    const comparison = comparableBaseline(
      // A refused row has no breakpoints, which is the store's own union.
      {
        symbol: toTicker("CRWD"),
        observedAt: new Date("2026-09-11T20:00:00.000Z"),
        lookbackSessions: 60,
        sampleCount: 4620,
        refusal: "split-discontinuity",
      },
      GRID,
    );

    expect(comparison).toStrictEqual({
      ranked: false,
      refusal: "split-discontinuity",
      sampleCount: 4620,
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    });
  });

  it("answers `0 of the minimum` where there is no generation at all", () => {
    // A cold replica, a security with no stored `sip` history, and **every
    // security on CI, for ever**. `0` is the true count and the sentence it
    // draws — `Baseline too short to rank — 0 of 2,500 returns` — is true of
    // all three, which is why there is no second refusal word for them.
    expect(comparableBaseline(undefined, GRID)).toStrictEqual({
      ranked: false,
      refusal: "too-few-samples",
      sampleCount: 0,
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    });
  });

  it("cannot be read for a distribution without being narrowed", () => {
    // **This assertion is the COMPILER's and the body is incidental.** The
    // `@ts-expect-error` below fails `tsc -b` if the error ever stops
    // happening — an unused expectation is itself an error — so the day
    // somebody puts `distribution` on both arms, or makes it optional, the
    // build goes red rather than a reviewer noticing. A test that asserted
    // `BASELINE_MINIMUM_SAMPLE` exists would be green on every one of those.
    const comparison: BaselineComparison = comparableBaseline(
      stored({ sampleCount: 10 }),
      GRID,
    );

    // @ts-expect-error — `distribution` does not exist on the refused arm
    const unreachable: unknown = comparison.distribution;

    expect(unreachable).toBeUndefined();
  });
});
