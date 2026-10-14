import { describe, expect, it } from "vitest";

import { BASELINE_BREAKPOINT_COUNT } from "@marketpulse/shared";

import { breakpointsOf } from "./return-baseline.js";
import { returnPercentileOf } from "./return-percentile.js";

import type { ReturnBaselineDistribution } from "./return-percentile.js";

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
