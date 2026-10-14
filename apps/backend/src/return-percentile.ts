import {
  BASELINE_BREAKPOINT_COUNT,
  BASELINE_MINIMUM_SAMPLE,
} from "@marketpulse/shared";

import type { MarketFeed, PercentileRefusal } from "@marketpulse/shared";
// **A type-only import of a domain row, which is not a handle.** This module
// still reads no clock, no socket, no protocol and no pool; what it gained in
// Task 5.3.4 is the narrowing that stands between a stored generation and the
// arithmetic, and that narrowing has to name the thing it narrows.
import type { StoredReturnBaseline } from "./return-baseline-store.js";

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

/**
 * **Why a figure has no percentile beside it, and the two numbers the sentence
 * needs** (Task 5.3.4).
 *
 * It is the shape {@link WireRefusedPercentile} carries, built here rather than
 * in the transport: *which refusal* is a judgement about data and the wire
 * mapper copies fields.
 */
export interface PercentileRefused {
  readonly ranked: false;
  readonly refusal: PercentileRefusal;
  readonly sampleCount: number;
  readonly minimumSampleCount: number;
}

/**
 * **A baseline this move may be ranked against, or the refusal instead — and
 * the refused arm has NO DISTRIBUTION MEMBER AT ALL** (Task 5.3.4, AC 6).
 *
 * ## This is the refusal as a TYPE rather than as a document
 *
 * AC 6 asks for a percentile to be *refused rather than printed below a stated
 * minimum sample*. A constant and a branch satisfy the words and leave the
 * defect one `if` away: the next reader holding a `StoredReturnBaseline` with
 * 737 samples can call {@link returnPercentileOf} on it and get a perfectly
 * well-formed `47th percentile` whose last digit is noise (the standard error
 * at the median of 737 samples is **1.84 percentile points** —
 * `BASELINE_MINIMUM_SAMPLE` has the arithmetic).
 *
 * So the narrowing is the only way across: {@link comparableBaseline} is
 * the one function that produces a {@link ReturnBaselineDistribution}, and on
 * the refused arm there is **no member to read**. `comparison.distribution` on
 * an un-narrowed value is a compile error, and
 * `return-percentile.test.ts` holds that claim as a `@ts-expect-error` — which
 * fails the **build** if the member ever appears on both arms, because an
 * unused `@ts-expect-error` is itself an error. A test asserting that the
 * constant exists would be green on every defect this prevents.
 */
export type BaselineComparison =
  | { readonly ranked: true; readonly distribution: ReturnBaselineDistribution }
  | PercentileRefused;

/** The answer a frame carries: a rank, or why there is none. */
export type PercentileAnswer =
  | { readonly ranked: true; readonly percentile: ReturnPercentile }
  | PercentileRefused;

/** The sampler's grid and the store's tape — both read, neither spelled. */
export interface BaselineGrid {
  readonly spanMinutes: number;
  readonly feed: MarketFeed;
}

/**
 * **Whether this stored generation may be ranked against at all.**
 *
 * Four inputs, one answer, and the three refusing cases are deliberately **one
 * word** rather than three:
 *
 * - `undefined` — no generation is loaded, or this security has no row in the
 *   one that is. A cold replica for its first seconds, every security whose
 *   stored `sip` history is empty, and **every security on CI, for ever**.
 *   `sampleCount` is `0`, which is the true figure.
 * - a row the pass **refused** — today a session-boundary price break
 *   (`SPLIT_DISCONTINUITY_RATIO`). Carried through with its own word, because
 *   *we have too little history* and *the history we have contains a price
 *   break we cannot adjust* are different facts with different repairs.
 * - a row whose counted `n` is below `BASELINE_MINIMUM_SAMPLE` — AC 6, applied
 *   **at the read** so that a generation computed before the bound existed is
 *   refused without being recomputed. Measured on this machine's store: 11 of
 *   511.
 *
 * **`0` and *too short* share a word on purpose**: `0 of 2,500 returns` is a
 * true sentence about a cold replica, and a second refusal word for it would
 * be a second sentence saying the same thing. `WireRefusedPercentile` carries
 * that argument to the wire.
 */
export function comparableBaseline(
  stored: StoredReturnBaseline | undefined,
  grid: BaselineGrid,
): BaselineComparison {
  const minimumSampleCount = BASELINE_MINIMUM_SAMPLE;

  if (stored === undefined) {
    return {
      ranked: false,
      refusal: "too-few-samples",
      sampleCount: 0,
      minimumSampleCount,
    };
  }

  // **The store's own union, narrowed once.** `stored.refusal` is the row's
  // word and widens into `PercentileRefusal` — the type-level assertion in
  // `packages/shared/src/return-baseline.ts` is what keeps that true when the
  // stored vocabulary grows.
  if (stored.refusal !== null) {
    return {
      ranked: false,
      refusal: stored.refusal,
      sampleCount: stored.sampleCount,
      minimumSampleCount,
    };
  }

  if (stored.sampleCount < minimumSampleCount) {
    return {
      ranked: false,
      refusal: "too-few-samples",
      sampleCount: stored.sampleCount,
      minimumSampleCount,
    };
  }

  return {
    ranked: true,
    distribution: {
      breakpoints: stored.breakpoints,
      sampleCount: stored.sampleCount,
      spanMinutes: grid.spanMinutes,
      feed: grid.feed,
    },
  };
}
