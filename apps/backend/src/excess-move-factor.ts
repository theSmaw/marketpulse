import {
  BASELINE_MINIMUM_SAMPLE,
  basisOf,
  moveRankingKey,
  sharedBasis,
} from "@marketpulse/shared";

import type {
  ExcessFactorRefusal,
  ExcessMoveInapplicability,
  ExcessMoveReference,
  MarketFeed,
  WireOverviewFigure,
} from "@marketpulse/shared";

import { returnPercentileOf } from "./return-percentile.js";
import type { ReturnPercentile } from "./return-percentile.js";
import type { StoredExcessBaseline } from "./excess-move-baseline-store.js";

/**
 * **The relative-move factor, scored in THIS process** (Task 5.6.2) — the
 * composite's second scored factor, and the first thing in this product that
 * scores a figure the browser was already drawing.
 *
 * ## Why it had to move, which is not a style question
 *
 * `apps/frontend/src/market/relative-performance.ts` builds all three moves and
 * both differences correctly, and says so in its own header: *"Nothing here
 * fetches, and nothing here is a second join."* That is right for a **drawn**
 * figure and wrong for a **scored** one. Invariant 1 — *every number a user
 * sees comes from deterministic code* — and ADR 0038's rejected alternative
 * *"compute the aggregate in the browser"*, refused by the owner on the
 * recorded grounds that **"Epic 5's scores cannot live in a browser."**
 *
 * ADR 0038 decision 2 is the precedent for how: `changeFromClose` went to
 * `packages/shared` as *one implementation, two processes*. So the two things
 * this module must not re-decide — *which field a figure's move lives in* and
 * *what that move was measured from* — are `moveRankingKey` and `basisOf`, both
 * shared, and the predicate over them is `sharedBasis`, also shared since this
 * task. **`relativePerformance`'s drawn output is unchanged**; nothing was
 * rewritten, two functions moved house and the browser goes on calling them.
 *
 * ## Nothing here reads a clock, a handle, a socket or a protocol
 *
 * `return-percentile.ts`' property, for its reason: Epic 13's replay calls this
 * with a generation addressed as-of a past session and gets the same answer the
 * live path gets, because the only inputs are two wire figures, a stored row
 * and a reference. Invariant 4 made structural rather than instructed.
 *
 * ## Three kinds of no-answer, and the third is new to this product
 *
 * - **refused** — `ExcessFactorRefusal`, six words, each its own sentence.
 * - **absent** — folded into `too-few-samples` at `0 of 2,500`, which is
 *   `comparableBaseline`'s own choice and its argument: `0 of 2,500 excess
 *   moves` is a true sentence about a cold replica and a second word for it
 *   would be a second sentence saying it.
 * - **inapplicable** — *the question does not arise*. See
 *   `packages/shared/src/excess-move.ts` for the whole of why that word and
 *   not one of four others, and why it must not read as *unavailable*: a reader
 *   told *unavailable* reasonably waits, and no amount of waiting will give a
 *   broad-market fund a sector.
 *
 * ## The `?? 0` rule arriving at a cache rather than at an arithmetic
 *
 * `closesAsOf` is **synchronous and never throws**, and returns an **empty
 * map** until its first successful load — documented there as *"the true answer
 * rather than a degraded one"*. A reader that treated an absent close as `0`
 * would compute this factor against **no reference** and draw a number that is
 * wrong by the whole size of the market's move. Nothing here can: an absent
 * close makes a figure `state: "unknown"`, `moveRankingKey` answers
 * `undefined`, and this module refuses with `no-reference-move`. Asserted
 * rather than argued, in `excess-move-factor.test.ts`.
 */

/** The baseline a figure may be ranked against, as the arithmetic needs it. */
export interface ExcessDistribution {
  /** 101 ascending magnitudes in percentage points. */
  readonly breakpoints: readonly number[];
  readonly sampleCount: number;
  /** The baseline grid's stride, and the tape both legs were read on. */
  readonly spanMinutes: number;
  readonly feed: MarketFeed;
}

/** Why there is no distribution to rank against. `PercentileRefused`'s shape. */
export interface ExcessRefused {
  readonly scored: false;
  readonly refusal: ExcessFactorRefusal;
  readonly sampleCount: number;
  readonly minimumSampleCount: number;
}

/**
 * **A baseline this excess may be ranked against, or the refusal instead — and
 * the refused arm has NO DISTRIBUTION MEMBER AT ALL.**
 *
 * `BaselineComparison`'s mechanism (Task 5.3.4): the narrowing is the only way
 * across, so a caller holding a refused generation **cannot read its
 * breakpoints** because the member does not exist on that arm. A constant and a
 * branch would satisfy the words and leave the defect one `if` away.
 */
export type ExcessComparison =
  | { readonly scored: true; readonly distribution: ExcessDistribution }
  | ExcessRefused;

/** The grid the pass applied — read from its producers, never spelled. */
export interface ExcessGrid {
  readonly spanMinutes: number;
  readonly feed: MarketFeed;
}

/**
 * **Whether this stored generation may be ranked against at all.**
 *
 * `comparableBaseline`'s three refusing cases, with the same bound for the same
 * reason: the printed figure is an **integer ordinal**, so the last digit is one
 * percentile point, and `50/√n ≤ 1` gives `n ≥ 2500` exactly.
 * {@link BASELINE_MINIMUM_SAMPLE} carries the arithmetic.
 *
 * **It is the same constant rather than a second one**, and that is a
 * derivation rather than a convenience: the bound is a function of the
 * **printed precision**, this factor prints at the same precision as the price
 * factor, so re-deriving it would produce the same number with a second place
 * to forget to change. The day either figure prints a decimal ordinal, that
 * constant's own reversal trigger fires for both.
 *
 * Applied **at the read**, so a generation computed before the bound existed is
 * refused without being recomputed.
 */
export function comparableExcessBaseline(
  stored: StoredExcessBaseline | undefined,
  grid: ExcessGrid,
): ExcessComparison {
  const minimumSampleCount = BASELINE_MINIMUM_SAMPLE;

  if (stored === undefined) {
    return {
      scored: false,
      refusal: "too-few-samples",
      sampleCount: 0,
      minimumSampleCount,
    };
  }

  if (stored.refusal !== null) {
    // The stored word widens into the read vocabulary, and
    // `ExcessFactorRefusalIsASuperset` is what keeps that true when the stored
    // list grows: a member added there and not here is a compile error.
    return {
      scored: false,
      refusal: stored.refusal,
      sampleCount: stored.sampleCount,
      minimumSampleCount,
    };
  }

  if (stored.sampleCount < minimumSampleCount) {
    return {
      scored: false,
      refusal: "too-few-samples",
      sampleCount: stored.sampleCount,
      minimumSampleCount,
    };
  }

  return {
    scored: true,
    distribution: {
      breakpoints: stored.breakpoints,
      sampleCount: stored.sampleCount,
      spanMinutes: grid.spanMinutes,
      feed: grid.feed,
    },
  };
}

/** The factor's figure, where there is one. */
export interface ExcessMoveScored {
  readonly scored: true;
  readonly applies: true;
  /**
   * **The SIGNED excess**, in percentage points — the subject's move minus the
   * benchmark's.
   *
   * Signed because the percentile is not: the ordinal ranks the **magnitude**
   * (AC 4), so the direction is not recoverable from it and the explanation has
   * to carry it separately. `behind` / `ahead` is the drawn region's word for
   * this number and stays there.
   */
  readonly excessPoints: number;
  /** Where the magnitude sits in this security's own history of it. */
  readonly percentile: ReturnPercentile;
  /** The benchmark it was differenced against — named, never implied. */
  readonly referenceSymbol: string;
}

/** The factor refused, with its reason and the bound it was refused against. */
export interface ExcessMoveRefused extends ExcessRefused {
  readonly applies: true;
}

/**
 * **The question does not arise** — a third kind, and not a refusal.
 *
 * `scored: false` beside `applies: false` rather than a member of the refusal
 * union, so a surface cannot print *unavailable* for it by accident: the two
 * arms are different types and `applies` is the discriminant the explanation
 * branches on.
 */
export interface ExcessMoveInapplicable {
  readonly scored: false;
  readonly applies: false;
  readonly because: ExcessMoveInapplicability;
}

/** The factor, in one value. */
export type ExcessMoveFactor =
  ExcessMoveScored | ExcessMoveRefused | ExcessMoveInapplicable;

export interface ExcessMoveFactorInput {
  /**
   * The security's own figure — a live minute against a close, or a stored
   * session's close-to-close move.
   *
   * **`undefined` since Task 5.6.4**, which is a symbol the pass that produced
   * these figures is not about: an untracked ticker, or anything outside the
   * join's own `symbols`. It refuses with `no-subject-move`, which is that
   * word's own meaning — *we hold no move for the security at all* — rather
   * than a fourth refusal for the same fact.
   *
   * It is optional so that the subject and the reference can be **read side by
   * side in one argument list**, off one `OverviewPass`, with no guard between
   * them: `one-pass-for-a-subject-and-its-benchmark` keys on exactly that
   * shape, because the two figures are subtracted from each other and a
   * difference of two instants is a well-formed, correctly-signed figure that
   * is wrong.
   */
  readonly subject: WireOverviewFigure | undefined;
  /**
   * Its sector benchmark's, from the same aggregate and therefore from the same
   * pass over the same market state. `undefined` where the frame carried none.
   */
  readonly reference: WireOverviewFigure | undefined;
  /** Which fund applies, from `excessMoveReference` — never branched on here. */
  readonly referenceOf: ExcessMoveReference;
  /**
   * The generation held for this security, or `undefined`.
   *
   * **A row computed against a DIFFERENT benchmark is treated as `undefined`**
   * here rather than at the call site; see the function.
   */
  readonly stored: StoredExcessBaseline | undefined;
  readonly grid: ExcessGrid;
}

/**
 * **The factor: a signed excess, and where its magnitude sits in this
 * security's own 60-session history of it.**
 *
 * The order of the guards is the order a reader needs the answers in, and each
 * one is a different sentence:
 *
 * 1. **inapplicable** — there is no reference at all. It outranks everything
 *    because a security with no sector cannot have a too-short baseline of a
 *    comparison that does not exist.
 * 2. **no move on either side** — the subject's first, because that is the
 *    thing on screen. Each figure is still true; only the difference is
 *    withheld, which is the drawn region's own rule.
 * 3. **mixed basis** — the two moves were measured from different closes.
 *    **Inherited, not re-derived**: `sharedBasis` over `basisOf`, the same
 *    implementation the drawn region refuses with, now in `packages/shared`.
 *    Reachable **every day between the overnight backfill and the next bell**.
 * 4. **the baseline** — too short, or refused for a price break on either leg.
 *
 * **The subtraction happens after all four**, which is the whole point: a
 * factor that scored first and checked afterwards would have produced a
 * well-formed, correctly-coloured number that is wrong in exactly the way the
 * region above it declined to be.
 */
export function excessMoveFactor(
  input: ExcessMoveFactorInput,
): ExcessMoveFactor {
  const { subject, reference, referenceOf, grid } = input;

  if (!referenceOf.applies) {
    return { scored: false, applies: false, because: referenceOf.because };
  }

  // **A generation computed against another benchmark is not a baseline for
  // this comparison** (Task 5.6.4), and the check is here because this is the
  // one function that holds both the row and the reference — so no caller can
  // forget it.
  //
  // `0016` §3 puts the reference in the key precisely so *a reader holding
  // either can say which question it answers*; a reader that held a row and
  // did not ask would discard that protection one layer up, and the failure is
  // maximally quiet, because `referenceSymbol` travels on the row and the
  // drawn sentence would name the benchmark the **wrong** baseline was
  // computed against.
  //
  // **It is absence rather than a word**, which is the owner's own rule about
  // vocabularies: a reader cannot act on *we hold a baseline against a
  // different benchmark*, and `too-few-samples` at `0 of 2,500` already means
  // *nothing to rank against*. Inventing a seventh refusal would be a sentence
  // nobody could write.
  const stored =
    input.stored?.referenceSymbol === referenceOf.symbol
      ? input.stored
      : undefined;

  const minimumSampleCount = BASELINE_MINIMUM_SAMPLE;

  // **How much history we hold, stated beside every refusal** — *how much did
  // you have* is the first question asked of one. It is written as a branch and
  // **not as `stored?.sampleCount ?? 0`**: `?? 0` is the shape this epic has
  // forbidden in four consecutive stories and `docs/GAPS.md` records that
  // nothing checks for it, so the one place it would read as correct is the one
  // place a grep would stop being usable. The `0` here is the **true** figure —
  // `0 of 2,500 excess moves` about a store with no generation — rather than a
  // measurement substituted for an absent one.
  const held = stored === undefined ? 0 : stored.sampleCount;

  const refuse = (refusal: ExcessFactorRefusal): ExcessMoveRefused => ({
    scored: false,
    applies: true,
    refusal,
    sampleCount: held,
    minimumSampleCount,
  });

  // **`moveRankingKey` rather than a field name**, which is the one question
  // that function exists to answer once: an `observed` figure's move is
  // `changePercent` and a `stored` figure's is `sessionChangePercent`, and
  // reading either off the wrong state is how a drawn figure went missing once.
  // It also closes the non-finite gap, so no `NaN` reaches the subtraction.
  if (subject === undefined) {
    return refuse("no-subject-move");
  }

  const ours = moveRankingKey(subject);
  if (ours === undefined) {
    return refuse("no-subject-move");
  }

  if (reference === undefined) {
    return refuse("no-reference-move");
  }

  const theirs = moveRankingKey(reference);
  if (theirs === undefined) {
    return refuse("no-reference-move");
  }

  if (!sharedBasis(basisOf(subject), basisOf(reference))) {
    return refuse("mixed-basis");
  }

  const comparison = comparableExcessBaseline(stored, grid);
  if (!comparison.scored) return { ...comparison, applies: true };

  // **Two percentages either side of one operator, each on its own line.**
  // This is a DIFFERENCE and not an order, which is why
  // `one-comparator-for-the-order-of-a-move` is silent about it — the drawn
  // region's `comparisonOf` carries the same note for the same shape.
  const excessPoints = ours - theirs;

  // **The SIGNED excess goes in and the magnitude is taken inside**, which is
  // `returnPercentileOf`'s own property and the reason it is reused rather than
  // copied: `percentileOf(+x) === percentileOf(−x)` is a property of that
  // module rather than a discipline of its callers, so this factor cannot score
  // higher for falling behind than for running ahead. AC 4, by construction.
  const percentile = returnPercentileOf(excessPoints, comparison.distribution);

  // **No word at all for a malformed distribution**, which is the producer's
  // own treatment of this state (`market-unusual.ts`): inventing a refusal for
  // something no reader can act on would be a sentence nobody could write. The
  // database makes it unrepresentable — `excess_move_baselines_breakpoint_count`
  // — so this arm exists for a row written by something that is not this pass.
  if (percentile === undefined) {
    // **Not `held`** — this arm is reached only with a generation in hand, so
    // the count is the distribution's own and the two agree.
    return {
      scored: false,
      applies: true,
      refusal: "too-few-samples",
      sampleCount: comparison.distribution.sampleCount,
      minimumSampleCount,
    };
  }

  return {
    scored: true,
    applies: true,
    excessPoints,
    percentile,
    referenceSymbol: referenceOf.symbol,
  };
}
