import { BASELINE_MINIMUM_SAMPLE, scoreAnomaly } from "@marketpulse/shared";

import type {
  AnomalyOutcome,
  CompositeFactor,
  FactorAnswer,
} from "@marketpulse/shared";

import type { ExcessMoveFactor } from "./excess-move-factor.js";
import type {
  BaselineComparison,
  ReturnPercentile,
} from "./return-percentile.js";

/**
 * **The composite's producer — the one site that turns three factors' own
 * answers into one {@link AnomalyOutcome}** (Task 5.6.4).
 *
 * ## It decides nothing and computes nothing
 *
 * Every arithmetic in the score is `packages/shared`'s `scoreAnomaly`: the
 * weights, the `round(w × u / 100)`, the sum, the maximum and the band. Every
 * figure is its own factor's producer's — `returnPercentileOf`,
 * `excessMoveFactor`, `volumeRateOf`. What is here is the **translation**: one
 * mapper per factor from the vocabulary that factor speaks into the one
 * vocabulary the scorer narrows on, and nothing else. `five-minute-return-wire.ts`
 * is the precedent and the reason it is a module rather than four lines in
 * `index.ts`: a mapping is a thing with a test.
 *
 * ## Two coarsenings, declared, and they lose no information a reader can see
 *
 * A factor's absent clause in the composite's explanation is **not** the only
 * place that factor's own reason reaches the browser: the `return` frame
 * carries the figure's own refusal word beside the score, on both halves. So
 * where the composite's vocabulary cannot carry a factor's exact word, the
 * clause states the coarser **true** thing and the frame states the fine one.
 *
 * 1. **A 5-minute return that could not be measured refuses the price factor
 *    with `no-subject-move`.** The return's own three words —
 *    `nothing-observed`, `no-earlier-endpoint`, `no-basis` — are not members of
 *    `FactorRefusal`, and `no-subject-move` is the shipped word for exactly
 *    this fact: *we hold no move for the security at all*. It is a **borrow**
 *    across factor vocabularies, which is why `FactorRefusal` is one union over
 *    all three rather than three per-factor types, and the frame's `return`
 *    half still says which of the three it was.
 * 2. **The volume factor is `no-distribution`, unconditionally.** See
 *    {@link volumeFactorAnswer}.
 *
 * ## Nothing here reads a clock, a socket or a handle
 *
 * `excess-move-factor.ts`' property, for its reason: every input is a value
 * three pure producers already returned, so Epic 13's replay reaches this with
 * a generation addressed as-of a past session and gets the same score.
 */

/**
 * **A five-minute return, as the price factor's builder reads it: did we get
 * one?** See {@link PriceFactorInput.figure}.
 *
 * Both `MeasuredReturn` and `MeasuredSessionReturn` satisfy it, as do their
 * refused arms, and a `WireOverviewFigure` does not — it has no `measured`
 * discriminant at all.
 */
export interface PriceFactorFigure {
  readonly measured: boolean;
}

/**
 * **What the price factor is: the percentile of this security's own 5-minute
 * return**, as the three values the wiring site is already holding.
 *
 * A record rather than three positional arguments because two of the three are
 * `undefined` on ordinary paths and a positional call would be unreadable at
 * the one site that makes it.
 */
export interface PriceFactorInput {
  /**
   * **Whether there is a move at all** — and that is the whole of what this
   * builder reads of the figure, which is why the type says so (Task 5.6.6).
   *
   * It was `FiveMinuteReturn` and the number was never read here: the ordinal
   * is {@link PriceFactorInput.percentile}'s and the history is
   * {@link PriceFactorInput.comparison}'s, so the figure's only job in this
   * function is to distinguish *we hold no move for this security* from *we
   * hold one and could not rank it*. There are now **two** producers of that
   * answer — `fiveMinuteReturn` over a live trailing window and
   * `sessionClosingReturn` over stored closes, which may not be forged from
   * each other (`session-percentile.ts` says why) — and a contract naming the
   * one member that is read admits both with no adapter and no cast.
   */
  readonly figure: PriceFactorFigure;
  /**
   * Whether there is a baseline to rank it against at all —
   * `comparableBaseline`'s answer. **Required**, because *how much history do
   * you have* is the first question asked of a refusal and this is the only
   * value that knows.
   */
  readonly comparison: BaselineComparison;
  /**
   * Where the magnitude sat, where it could be taken. `undefined` is either a
   * refused comparison or a malformed distribution, and the two are told apart
   * by {@link PriceFactorInput.comparison}.
   */
  readonly percentile: ReturnPercentile | undefined;
}

/** How much history the price baseline held, whichever arm it took. */
const priceSampleCount = (comparison: BaselineComparison): number =>
  comparison.ranked
    ? comparison.distribution.sampleCount
    : comparison.sampleCount;

/**
 * **The price factor's answer.** The order of the guards is the order a reader
 * needs the answers in, and each is a different sentence.
 */
export function priceFactorAnswer(input: PriceFactorInput): FactorAnswer {
  const { figure, comparison, percentile } = input;

  // **The bound is the comparison's own where it has one**, and
  // `BASELINE_MINIMUM_SAMPLE` otherwise — the same constant that function
  // applies, imported rather than re-derived, because the bound is a function
  // of the **printed precision** and both factors print at the same one.
  const minimumSampleCount = comparison.ranked
    ? BASELINE_MINIMUM_SAMPLE
    : comparison.minimumSampleCount;
  const sampleCount = priceSampleCount(comparison);

  // **No move, so nothing to rank** — the return's own refusal, coarsened to
  // the word the composite's vocabulary has for it. See the header, coarsening
  // 1: the fine word travels on the same frame, on the `return` half.
  if (!figure.measured) {
    return {
      state: "refused",
      refusal: "no-subject-move",
      sampleCount,
      minimumSampleCount,
    };
  }

  if (percentile !== undefined) {
    return {
      state: "ranked",
      rank: percentile.rank,
      aboveSample: percentile.aboveSample,
      sampleCount: percentile.sampleCount,
    };
  }

  if (!comparison.ranked) {
    return {
      state: "refused",
      refusal: comparison.refusal,
      sampleCount,
      minimumSampleCount,
    };
  }

  // **A distribution the arithmetic refused**, which the database makes
  // unrepresentable (`return_baselines_breakpoint_count`) and which therefore
  // means a row written by something that is not this product's pass. There is
  // no honest sentence for it, so it takes the word for *nothing we can rank
  // against* with the distribution's own counted `n` beside it —
  // `excess-move-factor.ts`' treatment of the same state, inherited rather than
  // re-decided.
  return {
    state: "refused",
    refusal: "too-few-samples",
    sampleCount,
    minimumSampleCount,
  };
}

/** **The excess-move factor's answer** — `excessMoveFactor`'s three arms, mapped. */
export function excessFactorAnswer(factor: ExcessMoveFactor): FactorAnswer {
  if (!factor.applies) {
    // **The question does not arise** — a broad-market fund has no sector and a
    // sector ETF is its own benchmark. Carried across as its own arm, because
    // a reader told *unavailable* reasonably waits.
    return { state: "inapplicable", because: factor.because };
  }

  if (!factor.scored) {
    return {
      state: "refused",
      refusal: factor.refusal,
      sampleCount: factor.sampleCount,
      minimumSampleCount: factor.minimumSampleCount,
    };
  }

  return {
    state: "ranked",
    rank: factor.percentile.rank,
    aboveSample: factor.percentile.aboveSample,
    sampleCount: factor.percentile.sampleCount,
  };
}

/**
 * **The volume factor's answer, and it is `no-distribution` for every security
 * at every instant** — the one construction site of that arm.
 *
 * ## Why unconditionally, which is the owner's decision 1 reaching the wire
 *
 * Story 5.6's Gate 1 verified that `0015` stores `bucket_medians`,
 * `bucket_samples` and `bucket_errors` — **a median and a dispersion, and not a
 * distribution** — so there is no history of this factor's own quantity to rank
 * a multiple against, for **any** security. The absence is a fact about this
 * product's stored aggregates rather than about this security's coverage, so
 * the answer does not vary at all and is not written behind a
 * condition implying the factor is sometimes rankable.
 *
 * ## Why the volume's own six refusal words are not carried here
 *
 * Because they cannot be, and the attempt would have fabricated a figure.
 * `FactorAnswer`'s `refused` arm carries a `minimumSampleCount`, the volume
 * baseline's bound is a **function** of a per-bucket measured dispersion
 * (`n ≥ (√(π/2)·CV / target)²`) rather than a count, and `readAnomalyScore`
 * refuses `minimumSampleCount === 0` — so a volume refusal has no bound to
 * state, in principle and not only in this tree. The word is not lost: it
 * travels on the same frame, on the `volume` half, with the two counts its
 * sentences need. See this module's header, coarsening 2.
 *
 * ## It takes NO ARGUMENT, and that is the argument stated as a type
 *
 * A parameter read for nothing is a parameter the next reader looks for a
 * branch on. There is none: the answer does not depend on the volume's state,
 * on this security, or on anything this process holds — so the signature says
 * so, and no call site can imply otherwise.
 *
 * The day a nightly pass stores a **distribution** of this quantity, this
 * function grows the inputs the other two have and this arm is **deleted**
 * rather than widened; see `FactorAnswer`'s own reversal trigger, which fires
 * together with `ANOMALY_BAND_FLOORS`' trigger 1, in the same commit.
 */
export function volumeFactorAnswer(): FactorAnswer {
  return { state: "no-distribution" };
}

/**
 * The factors' own answers, as the one producer takes them.
 *
 * **Two members for three factors**, which is {@link volumeFactorAnswer}'s
 * signature arriving at the call site: there is no volume input because the
 * volume answer has no input. The scorer's own record is still over all three,
 * so a factor added to `COMPOSITE_FACTORS` is a compile error in
 * {@link compositeAnomaly} naming the missing member.
 */
export interface CompositeInput {
  readonly price: PriceFactorInput;
  readonly excess: ExcessMoveFactor;
}

/**
 * **The three factors' answers, at one site** — the translation, with no mint
 * in it (extracted at Task 5.6.6).
 *
 * The record is keyed on `CompositeFactor`, so a fourth factor is a compile
 * error **here** naming the missing member rather than a slot silently absent
 * from every score.
 *
 * ## Why it is exported beside {@link compositeAnomaly} rather than inlined
 *
 * The nightly pass stores the **answers** as the row's content and the minted
 * score beside them (`0017` §5), so it needs both halves of one evaluation.
 * Calling `compositeAnomaly` and then rebuilding the answers would be two
 * evaluations of one thing — and deriving the answers back out of the
 * outcome's clauses would be a second mapping between the two vocabularies,
 * in the direction nothing else in this product goes.
 *
 * So the pass calls this and then `scoreAnomaly`, which **is**
 * {@link compositeAnomaly} written out; the live gateway calls
 * {@link compositeAnomaly}, because it needs the outcome alone.
 */
export function compositeAnswers(
  input: CompositeInput,
): Record<CompositeFactor, FactorAnswer> {
  return {
    price: priceFactorAnswer(input.price),
    excess: excessFactorAnswer(input.excess),
    volume: volumeFactorAnswer(),
  };
}

/**
 * **The composite, at one site** — AC 5's *a score cannot be constructed
 * without its explanation*, met by there being exactly one route to one.
 *
 * `scoreAnomaly` is the mint; {@link compositeAnswers} is the translation in
 * front of it, and this is the pair.
 */
export function compositeAnomaly(input: CompositeInput): AnomalyOutcome {
  return scoreAnomaly(compositeAnswers(input));
}
