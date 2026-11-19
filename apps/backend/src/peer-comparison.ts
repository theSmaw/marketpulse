// **The two-leg read-and-score path, in ONE place** (Task 7.2.4).
//
// `index.ts`'s `symbolReturn` has assembled this since Task 5.6.4 — resolve
// which fund this security is differenced against, read the subject's
// five-minute return, read the BENCHMARK's at the same instant, address the
// excess-move generation for that session, and score. `compare_securities`
// needs the identical assembly, and a second copy of it is two homes for one
// figure: the two could drift on which `asOf` the generation is addressed at,
// on which resolver decides the benchmark, or — the expensive one — on
// whether the two legs are read against one instant or two.
//
// **That last one is why this module exists rather than the tool duplicating
// four lines.** Two legs read at two instants subtract to a well-formed,
// correctly-signed figure that is WRONG, and nothing downstream can see it:
// `one-instant-for-a-subject-and-its-benchmark` is the check that holds it,
// and what that check watches is *the interval expression every
// `fiveMinuteReturn` read in the calling file shares*. Putting both reads
// here puts them in one argument list in one file, which is the only shape
// that cannot be two intervals.
//
// ## It decides nothing and computes nothing
//
// Every judgement in it was taken elsewhere and is deliberately left there:
// which fund applies is `excessMoveReference`'s (`packages/shared`, read by
// the drawn region too), the endpoints and their refusals are
// `five-minute-return.ts`'s, *may this be ranked at all* is
// `comparableExcessBaseline`'s, and the subtraction, the span agreement and
// the ordinal are `excessMoveFactor`'s. What this module owns is the ORDER of
// those calls and the instant they share, and nothing else.
//
// ## No clock, no handle, no protocol
//
// `price-anomaly.ts`' property, for its reason: `asOf` arrives as an argument
// and every read arrives as a function, so a replay (Epic 13) addressing a
// past session gets the same answer the live path gets. Invariant 4 made
// structural rather than instructed.

import { excessMoveFactor } from "./excess-move-factor.js";
import { fiveMinuteReturn } from "./five-minute-return.js";

import type { ExcessGrid, ExcessMoveFactor } from "./excess-move-factor.js";
import type { StoredExcessBaseline } from "./excess-move-baseline-store.js";
import type { FiveMinuteReturn } from "./five-minute-return.js";
import type { LiveObservation } from "./market-data-stream.js";
import type { ExcessMoveReference, Ticker } from "@marketpulse/shared";

/**
 * Where the three reads come from.
 *
 * **All three are functions rather than the stores themselves**, so this
 * module never learns that one is a process-memory window, one a nightly
 * cache over a pool and one the curated universe — and a test supplies three
 * literals without building any of them.
 */
export interface PeerComparisonSources {
  /**
   * Which fund this security is differenced against, from the ONE shared
   * resolver (`excessMoveReference`) — `undefined` only for a symbol the
   * curated universe does not describe at all, which is a membership answer
   * rather than an inapplicability.
   */
  readonly referenceOf: (symbol: Ticker) => ExcessMoveReference | undefined;
  /** One security's trailing window, oldest first — `TrailingWindow.read`. */
  readonly windowOf: (symbol: Ticker) => readonly LiveObservation[];
  /**
   * That security's stored excess-move generation **as of the instant asked
   * about**, for `PriceAnomalySources.baselineOf`'s reason: the caller owns
   * the UTC→session-date conversion, and Epic 13's replay hands a past
   * instant to the same call.
   */
  readonly baselineOf: (
    symbol: Ticker,
    asOf: Date,
  ) => StoredExcessBaseline | undefined;
  /** The sampler's stride and the store's tape, read rather than spelled. */
  readonly grid: ExcessGrid;
}

/**
 * **The four values, and they are four different claims.**
 *
 * - `referenceOf` — which fund applies, or why none does.
 * - `subject` — the security's own five-minute return, measured or refused in
 *   `five-minute-return.ts`'s own words.
 * - `reference` — the benchmark's, at the SAME instant. `undefined` only
 *   where there is no benchmark to read.
 * - `factor` — the scored excess, the refusal, or the inapplicability.
 *
 * All four travel because the two legs are drawn beside the comparison on the
 * security page: each figure is true even where the subtraction is refused,
 * which is `Relative performance`'s own rule and the reason a caller is given
 * the legs rather than only the verdict.
 */
export interface DescribedPeerComparison {
  readonly described: true;
  readonly referenceOf: ExcessMoveReference;
  readonly subject: FiveMinuteReturn;
  readonly reference: FiveMinuteReturn | undefined;
  readonly factor: ExcessMoveFactor;
}

/**
 * **A reading with NO FACTOR MEMBER AT ALL**, for a symbol the curated
 * universe does not describe.
 *
 * `ExcessComparison`'s mechanism: the narrowing is the only way across, so a
 * caller holding this cannot read a factor, because the member does not
 * exist on this arm — rather than being handed a fabricated refusal about a
 * security nothing here knows anything about. Which word that deserves is the
 * CALLER's to say in its own vocabulary (the gateway answers a thin frame,
 * the tool answers `not-tracked`), because membership is a universe question
 * and this module holds no membership set.
 */
export interface UndescribedPeerComparison {
  readonly described: false;
}

export type PeerComparisonReading =
  DescribedPeerComparison | UndescribedPeerComparison;

/**
 * **One security's five-minute move against its sector benchmark's, both read
 * at one instant.**
 *
 * Synchronous, with no `await`: the windows are process memory and the
 * generation is a loaded cache, which is what lets `symbolReturn` call this
 * from inside the market socket's own callback, where an unhandled rejection
 * is a crashed process.
 *
 * **A symbol the universe does not describe gets a reading with no factor to
 * score.** The caller decides what that means — the gateway answers a thin
 * frame, the tool answers `not-tracked` — because *we do not describe this
 * security* is a membership fact and this module holds no membership set.
 */
export function readPeerComparison(
  sources: PeerComparisonSources,
  symbol: Ticker,
  asOf: Date,
): PeerComparisonReading {
  const referenceOf = sources.referenceOf(symbol);

  // **Answered before either window is read**, because a symbol the universe
  // does not describe has nothing to compare and nothing to refuse:
  // `no-sector` would be a claim about a fund we hold no description of.
  if (referenceOf === undefined) return { described: false };

  // **Both legs, one `asOf`, one argument list.** The adjacency is the whole
  // point of this function existing — see the module comment.
  const subject = fiveMinuteReturn(sources.windowOf(symbol), { asOf });
  const reference = referenceOf.applies
    ? fiveMinuteReturn(sources.windowOf(referenceOf.symbol), { asOf })
    : undefined;

  return {
    described: true,
    referenceOf,
    subject,
    reference,
    factor: excessMoveFactor({
      subject,
      reference,
      referenceOf,
      stored: sources.baselineOf(symbol, asOf),
      grid: sources.grid,
    }),
  };
}
