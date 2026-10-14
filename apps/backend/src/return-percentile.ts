import { BASELINE_BREAKPOINT_COUNT } from "@marketpulse/shared";

import type { MarketFeed } from "@marketpulse/shared";

/**
 * **A magnitude, against a security's own baseline** (Task 5.3.3) — the
 * inverse of `breakpointsOf`, and the first thing in this product that says
 * how unusual something is.
 *
 * ## Nothing here reads a clock, a handle, a socket or a protocol
 *
 * `five-minute-return.ts`' property, for its reason: Epic 13's replay calls
 * this with a baseline generation addressed as-of a past session and gets the
 * same answer the live path gets, because the only inputs are a number and an
 * array. The wire shape is `five-minute-return-wire.ts`' and the words are the
 * browser's.
 *
 * ## It is a MAGNITUDE percentile, and the `abs` is taken here
 *
 * Story 5.1's decisions 2 and 3: the baseline is a pooled distribution of
 * **absolute** five-minute moves, so *how unusual is this* asks how far from
 * zero the move is and not which way it went. Taking the absolute value inside
 * this function rather than at the call site is what makes
 * `percentileOf(+x) === percentileOf(−x)` a property of the module rather than
 * a discipline of its callers — Task 5.3.4 asserts it, and a signed percentile
 * shipped against a magnitude baseline is the defect it catches. The
 * **direction** is already on screen, carried by `PriceChange`'s glyph and
 * sign, so nothing is lost.
 *
 * ## Why the inverse is a floor and not an interpolation
 *
 * `breakpointsOf` interpolates **linearly between the two neighbouring order
 * statistics** — the inclusive convention — precisely so that this direction is
 * possible at all: a nearest-rank definition is a step function whose inverse
 * is a range rather than a number. Going back the other way, the answer printed
 * is the **greatest rank whose breakpoint the magnitude has reached**, which is
 * the only reading that cannot over-claim: every one of those ranks' samples
 * really is at or below this move.
 */

/**
 * One security's distribution, as this function needs it.
 *
 * **Its own interface rather than `StoredReturnBaseline`**, which carries a
 * ticker, an `observed_at`, a lookback and a nullable refusal — none of which
 * the arithmetic has an opinion about. The narrowing is the caller's job and is
 * where *a refused security has no percentile* is decided, once, at the wiring
 * site.
 */
export interface ReturnBaselineDistribution {
  /**
   * {@link BASELINE_BREAKPOINT_COUNT} ascending magnitudes — the `0th` through
   * the `100th` — as `breakpointsOf` produced them.
   */
  readonly breakpoints: readonly number[];
  /** The counted `n` the breakpoints were taken from. */
  readonly sampleCount: number;
  /**
   * The baseline grid's stride in minutes, and the tape its bars came from.
   * Both travel to the screen; neither is re-derived there.
   */
  readonly spanMinutes: number;
  readonly feed: MarketFeed;
}

/** Where a magnitude sits in a baseline. */
export interface ReturnPercentile {
  /** The integer ordinal, `0`–`99`. **Never `100`** — see below. */
  readonly rank: number;
  /** The magnitude is strictly above every sample the baseline holds. */
  readonly aboveSample: boolean;
  readonly sampleCount: number;
  readonly spanMinutes: number;
  readonly feed: MarketFeed;
}

/**
 * **Where this move's magnitude sits in that baseline, or `undefined` where
 * the question has no answer.**
 *
 * `undefined` rather than a rank of `0` for a malformed distribution, because
 * *we cannot compare this* and *this is the least unusual move on record* are
 * different facts and only one of them is true. ADR 0029's defer rule at the
 * producer: the surface draws nothing where there is nothing, and
 * `return-percentile.ts`' refusals get their own words in Task 5.3.4.
 *
 * ## The ceiling, and why `aboveSample` is not `rank === 99`
 *
 * Gate 1 decision 2 forbids printing `100th`: above the highest order
 * statistic there is **no sample**, so a `100th` asserts a strict maximum over
 * a distribution that deliberately **excludes the window being scored** (AC 4),
 * and no reader can falsify it. Two things follow, and they are different
 * claims:
 *
 * - a magnitude between the 99th breakpoint and the sample maximum is a
 *   legitimate **`99th`** — 1% of the baseline is at or above it;
 * - a magnitude **strictly greater than every sample** is `aboveSample`, which
 *   the surface draws as `>99th`. That is the stronger and more useful
 *   statement: the baseline has nothing to compare it with at all.
 *
 * So the rank is clamped to 99 and the flag is read off the top order
 * statistic, which means the pair cannot disagree: `aboveSample` implies the
 * rank was 100 before the clamp.
 */
export function returnPercentileOf(
  percent: number,
  baseline: ReturnBaselineDistribution,
): ReturnPercentile | undefined {
  const { breakpoints, sampleCount, spanMinutes, feed } = baseline;

  // **A distribution of the wrong size is not a distribution.** The ranks are
  // the array's own indices — 101 points over `0`–`100` inclusive — so a
  // shorter array would silently rename every rank, which is a wrong number
  // with no symptom. `BASELINE_BREAKPOINT_COUNT` is read rather than spelled
  // for exactly that reason.
  if (breakpoints.length !== BASELINE_BREAKPOINT_COUNT) return undefined;
  if (!Number.isFinite(percent)) return undefined;
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) return undefined;
  if (breakpoints.some((value) => !Number.isFinite(value))) return undefined;

  const magnitude = Math.abs(percent);
  const top = breakpoints.length - 1;

  // The greatest rank whose breakpoint this magnitude has reached. Walked from
  // the top because the interesting end is the top: a baseline is read for the
  // tail, and the loop that finds the 99th in two steps finds the 3rd in 98
  // either way.
  let rank = 0;
  for (let index = top; index >= 0; index -= 1) {
    const breakpoint = breakpoints[index];
    if (breakpoint !== undefined && magnitude >= breakpoint) {
      rank = index;
      break;
    }
  }

  const highest = breakpoints[top];

  return {
    rank: Math.min(rank, BASELINE_BREAKPOINT_COUNT - 2),
    aboveSample: highest !== undefined && magnitude > highest,
    sampleCount,
    spanMinutes,
    feed,
  };
}
