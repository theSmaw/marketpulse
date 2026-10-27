import { BASELINE_MINIMUM_SAMPLE } from "@marketpulse/shared";

import type {
  ExcessFactorRefusal,
  ExcessMoveInapplicability,
  ExcessMoveReference,
  MarketFeed,
} from "@marketpulse/shared";

import { returnPercentileOf } from "./return-percentile.js";
import type { ReturnPercentile } from "./return-percentile.js";
import type { StoredExcessBaseline } from "./excess-move-baseline-store.js";

/**
 * **The relative-move factor, scored in THIS process** (Task 5.6.2) — the
 * composite's second scored factor, and the first thing in this product that
 * scores a figure the browser was already drawing.
 *
 * ## THE NUMERATOR IS A FIVE-MINUTE RETURN, AND THAT IS A REPAIR
 *
 * **Corrected 2026-10-26.** This factor shipped differencing two
 * `WireOverviewFigure`s through `moveRankingKey` — `changePercent` against
 * `sessionChangePercent`, both of them *the move since the basis close*, a
 * **session-to-date** quantity. `0016`'s own header says what the stored
 * distribution is of: *"this security's five-minute return minus its sector
 * benchmark's, **over the same five minutes**, in percentage points"* — so a
 * session-to-date excess was being ranked against a distribution of
 * five-minute excesses.
 *
 * Measured on the local store at the time of the repair: 496 measured
 * baselines, **p50 breakpoint 0.0856 points**, mean 99th **0.6893**, mean max
 * **2.3391**. A session-to-date excess clears the 99th routinely, so the
 * factor contributed its **full 35 of 100** for the majority of the universe,
 * and the inflation **grew through the session**, because `changeFromClose`
 * does.
 *
 * The price factor beside it was never wrong in this way — it ranks
 * `fiveMinuteReturn(...).percent` against the same `SAMPLE_SPAN_MINUTES` grid.
 * What was missing was anything comparing **the numerator's span to the
 * baseline's**: `comparableExcessBaseline` checked the baseline's span and
 * nothing checked the figure's. Both halves of the repair are here — the
 * inputs are {@link ExcessLeg}s, so a wire figure is a **compile error**, and
 * the span agreement is asserted against the distribution's own stride before
 * the percentile is taken.
 *
 * **The parameter type was `FiveMinuteReturn` until 2026-10-26 (Task 5.6.6)**
 * and is now the minimal contract {@link ExcessLeg}, because this product has
 * **two** producers of a five-minute return — the live window's and the
 * nightly pass's over stored closes — and neither may be forged from the
 * other. See {@link MeasuredExcessLeg} for why that does not weaken the guard
 * above.
 *
 * ## Two five-minute returns, read off two trailing windows at ONE instant
 *
 * `STREAM_SYMBOLS` is `trackedTickers()`, so the trailing windows hold all 516
 * securities **including all eleven sector SPDRs** — the benchmark's own
 * five-minute return is an ordinary `fiveMinuteReturn(windows.read(XLK))` and
 * needs no new seam, no eager figure map and no second join. The two legs are
 * read with **one `asOf`**, which
 * `one-instant-for-a-subject-and-its-benchmark` holds.
 *
 * ## Nothing here reads a clock, a handle, a socket or a protocol
 *
 * `return-percentile.ts`' property, for its reason: Epic 13's replay calls this
 * with a generation addressed as-of a past session and gets the same answer the
 * live path gets, because the only inputs are two measured returns, a stored
 * row and a reference. Invariant 4 made structural rather than instructed.
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
 * ## The rule against an imputed zero, arriving at a window rather than a cache
 *
 * A benchmark that printed nothing in these five minutes **has not been flat**,
 * and reading its return as `0` would make the subject's whole move read as
 * excess. Nothing here can: a window with no pair answers a
 * `RefusedReturn`, this module refuses `no-reference-move`, and the
 * nightly sampler takes the identical side of the identical question — *"a
 * missing reference close is a sample that does not exist, never a stretch to
 * the nearest bar and never a reference return of `0`"* (`excess-move-baseline.ts`).
 * One rule, two spans, two homes that agree.
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
 * **One leg of the difference, as the minimal contract this factor reads of
 * it** (Task 5.6.6) — a signed move, the span it was measured over, and the two
 * instants it was measured between.
 *
 * ## Why a contract rather than `MeasuredReturn`
 *
 * There are **two** producers of a five-minute return in this process and they
 * are not the same type, deliberately. `fiveMinuteReturn` walks a
 * `TrailingWindow`'s `LiveObservation[]` and its endpoints carry a
 * `BarSource` — a provider and a `retrievedAt`. `sessionClosingReturn` walks
 * ~24,000 stored `sip` closes keyed by instant, and `session-percentile.ts`
 * records why it is a second walk rather than a reuse: handing that map to the
 * first function would mean **forging 24,000 `LiveObservation`s with a
 * `BarSource` nobody retrieved**, which is the shape ADR 0031 exists to refuse.
 *
 * The nightly pass needs this factor over the **stored** producer's figures —
 * the session basis — and the live gateway needs it over the window's. So what
 * the parameter asks for is what the function **reads**, which is this: four
 * members, none of them a provenance claim. `MeasuredReturn` satisfies it
 * structurally and needs no adapter; `MeasuredSessionReturn` reaches it through
 * `excessLegOf` in `session-percentile.ts`, because its endpoints are named
 * `at` rather than `startsAt`.
 *
 * ## It does NOT weaken the 2026-10-26 repair's type guard
 *
 * That repair made a `WireOverviewFigure` a **compile error** here, and it
 * still is: a wire figure has no `measured` discriminant, no `spanMinutes` and
 * no endpoint instants at all — its move is `changePercent`, the move since the
 * basis close. The thing the type refuses is *a quantity of the wrong kind*,
 * and every member below is one this factor subtracts or compares.
 */
export interface MeasuredExcessLeg {
  readonly measured: true;
  /** The signed move, as a percentage. */
  readonly percent: number;
  /** The span its two endpoints are apart, in minutes. */
  readonly spanMinutes: number;
  readonly from: ExcessLegEndpoint;
  readonly to: ExcessLegEndpoint;
}

/** One endpoint: **the bar's own `startsAt`**, and nothing else this reads. */
export interface ExcessLegEndpoint {
  readonly startsAt: Date;
}

/**
 * A leg, measured or not. The refused arm carries **nothing**: each leg's own
 * refusal word travels to the surface on the `return` frame's own half, and
 * this factor answers `no-subject-move` or `no-reference-move` — one word
 * rather than three, which is `excessMoveFactor`'s own recorded choice.
 */
export type ExcessLeg = MeasuredExcessLeg | { readonly measured: false };

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

// **There is deliberately NO `spanMinutes` on the scored arm.** The span the
// figure was measured over and the stride the distribution was sampled on are
// proved equal by the check in {@link excessMoveFactor}, and
// `percentile.spanMinutes` already carries it — so a second member would be a
// second home for one number, which this repository refuses by name. The day
// the factor scores two spans, the check becomes a branch and this member is
// what the branch owes.

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
   * **The security's own FIVE-MINUTE return**, measured between two bars whose
   * own `startsAt` are exactly the span apart — `fiveMinuteReturn` over this
   * security's trailing window.
   *
   * **It is not a `WireOverviewFigure` and that is the 2026-10-26 repair.** A
   * wire figure's move is *the move since the basis close*, a session-to-date
   * quantity, and `0016`'s distribution is of five-minute excesses: ranking
   * one against the other gave the factor its full 35 of 100 for most of the
   * universe, growing through the session. The type is the guard — a
   * re-implementer reaching for `pass.figureOf(symbol)` gets a compile error
   * rather than a plausible number — and the span check below is the other
   * half, for a figure of the right type measured over a different span.
   *
   * **{@link ExcessLeg} rather than `FiveMinuteReturn`** since Task 5.6.6, and
   * that is the same guard over two producers rather than a relaxation of it:
   * the nightly pass's figure comes from `sessionClosingReturn` over stored
   * closes, whose endpoints cannot be `fiveMinuteReturn`'s without forging a
   * `BarSource` nobody retrieved.
   *
   * **Required rather than optional.** Both producers always answer:
   * a symbol this process does not track reads an empty window and refuses
   * `nothing-observed`, so there is no fourth state for a caller to invent.
   * A refusal here is `no-subject-move`, which is that word's own meaning.
   */
  readonly subject: ExcessLeg;
  /**
   * **Its sector benchmark's own five-minute return**, read off the benchmark's
   * trailing window at the **same `asOf`** — which is what makes the two legs
   * one measurement rather than two. All eleven sector SPDRs are in
   * `STREAM_SYMBOLS`, so this needs no seam the subject does not already use.
   *
   * `undefined` only where there is no benchmark to read — the inapplicable
   * arm, which is answered before this is looked at. A benchmark that printed
   * nothing refuses `no-earlier-endpoint` or `nothing-observed` on its own
   * arm and this factor answers `no-reference-move`; it is **never** read as a
   * return of `0`.
   */
  readonly reference: ExcessLeg | undefined;
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
 * **The factor: a signed excess of two FIVE-MINUTE returns, and where its
 * magnitude sits in this security's own 60-session history of it.**
 *
 * The order of the guards is the order a reader needs the answers in, and each
 * one is a different sentence:
 *
 * 1. **inapplicable** — there is no reference at all. It outranks everything
 *    because a security with no sector cannot have a too-short baseline of a
 *    comparison that does not exist.
 * 2. **no measured return on either side** — the subject's first, because that
 *    is the thing on screen. Each leg's own refusal is still true and still
 *    drawn beside it; only the difference is withheld, which is the drawn
 *    region's own rule.
 * 3. **mixed basis** — the two returns were measured over **different five
 *    minutes**. *Basis* is the older endpoint, which is `five-minute-return.ts`'
 *    own use of the word (`no-basis` is a zero close on exactly that bar), so
 *    two legs whose endpoints differ are two moves from two bases and the
 *    subtraction is refused. Reachable whenever one leg prints a minute the
 *    other does not: IEX minute presence is 81.6% and `ERIE`'s is 2.1%.
 * 4. **the baseline** — too short, refused for a price break on either leg, or
 *    a distribution whose **stride is not this figure's span**, which is the
 *    defect this function shipped with and is now the guard.
 *
 * **The subtraction happens after all four**, which is the whole point: a
 * factor that scored first and checked afterwards would have produced a
 * well-formed, correctly-coloured number that is wrong in exactly the way the
 * region above it declined to be.
 *
 * ## `mixed-basis` is the same word for a NARROWER fact than it was
 *
 * It used to mean *the two wire figures were measured from different closes*,
 * which cannot arise here — two five-minute returns over the same endpoints
 * share a basis by construction, and that is the point of the repair. The word
 * is kept rather than retired because it is still honest about the one way two
 * legs can disagree: **they can be over different five minutes.** Inventing a
 * second word for *the legs disagree about which minutes* would be two
 * sentences saying one thing, and retiring it would leave the reachable state
 * with no word at all.
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

  // **A refused leg is read through its own union rather than a field name**,
  // which is `fiveMinuteReturn`'s whole shape: `measured: false` carries a
  // word for *why*, and the three of them — `nothing-observed`,
  // `no-earlier-endpoint`, `no-basis` — are all *we hold no five-minute move
  // for this name*. One word here rather than three, because the leg's own
  // refusal travels to the surface on the return half of the same frame and a
  // second spelling of it would be a second sentence.
  //
  // It also closes the non-finite gap the wire figures needed `moveRankingKey`
  // for: `no-basis` is a zero or non-finite older close, so no `Infinity`
  // reaches the subtraction.
  if (!subject.measured) {
    return refuse("no-subject-move");
  }

  // `?.` rather than two conjuncts: *no benchmark to read* and *the
  // benchmark's own window had no pair* are one answer here, and the optional
  // chain narrows to the measured arm either way.
  if (!reference?.measured) {
    return refuse("no-reference-move");
  }

  // **The two legs must be over the SAME five minutes**, compared on both
  // endpoints' own `startsAt`. A benchmark that printed 13:50→13:55 while the
  // subject printed 14:00→14:05 gives a correctly-signed difference of two
  // true figures about two different intervals — and the nightly sampler
  // refuses exactly this pair, needing **four** closes at **two** instants, so
  // a numerator it would not have sampled must not be ranked against what it
  // did.
  if (!sameInterval(subject, reference)) {
    return refuse("mixed-basis");
  }

  const comparison = comparableExcessBaseline(stored, grid);
  if (!comparison.scored) return { ...comparison, applies: true };

  // **THE SPAN AGREEMENT — the numerator's against the distribution's** (the
  // 2026-10-26 repair's second half, and the one the first half cannot make
  // structural). The type above fixes *what kind of quantity* the numerator
  // is; this fixes *over how long*. A distribution whose stride is not this
  // figure's span is **not a distribution of this quantity**, which is exactly
  // the malformed-row state below — so it takes the same answer for the same
  // reason, with the distribution's own counted `n` beside it, and no seventh
  // refusal word is invented for something no reader can act on.
  //
  // Both numbers are read from their producers: the figure carries
  // `RETURN_SPAN_MINUTES` from the trailing window's span, the distribution
  // carries the sampler's `SAMPLE_SPAN_MINUTES`. They are **two independent
  // constants in two modules**, which is why this is a comparison rather than
  // a comment.
  if (subject.spanMinutes !== comparison.distribution.spanMinutes) {
    return {
      scored: false,
      applies: true,
      refusal: "too-few-samples",
      sampleCount: comparison.distribution.sampleCount,
      minimumSampleCount,
    };
  }

  // **Two percentages either side of one operator, each on its own line.**
  // This is a DIFFERENCE and not an order, which is why
  // `one-comparator-for-the-order-of-a-move` is silent about it — the drawn
  // region's `comparisonOf` carries the same note for the same shape.
  const ours = subject.percent;
  const theirs = reference.percent;
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

/**
 * **Both legs measured between the same two instants.**
 *
 * The endpoints' own `startsAt` rather than a tolerance: `fiveMinuteReturn`
 * picks an endpoint on an **exact** instant match for its own stated reason —
 * *"a 47-minute pair is not a near miss to be tolerated"* — and a predicate
 * over the pair must not be looser than the pair's own selection.
 *
 * Comparing both ends rather than one is redundant while both legs come from
 * the one shared span, and is the clause that survives a second span arriving:
 * equal `to` with unequal `from` is a 5-minute return beside a 15-minute one.
 */
function sameInterval(
  ours: MeasuredExcessLeg,
  theirs: MeasuredExcessLeg,
): boolean {
  return (
    ours.from.startsAt.getTime() === theirs.from.startsAt.getTime() &&
    ours.to.startsAt.getTime() === theirs.to.startsAt.getTime()
  );
}
