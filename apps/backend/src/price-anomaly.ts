// **The read-and-rank path, in ONE place** (Task 7.2.2).
//
// `index.ts`'s `symbolReturn` has assembled this since Task 5.3.3 — read the
// security's trailing window, measure its 5-minute return, address the
// baseline generation for that session, narrow it, and rank the magnitude
// against it. `calculate_return_percentile` needs the identical assembly, and
// a second copy of it is two homes for one figure: the two could drift on
// which `asOf` the generation is addressed at, on whether the narrowing is
// asked unconditionally, or on whether a malformed distribution is a refusal
// or a rank. So the assembly moved here and both callers read it.
//
// ## It decides nothing and computes nothing
//
// Every judgement in it was taken elsewhere and is deliberately left there:
// the window holds the bars (`trailing-window.ts`), the endpoints and their
// refusals are `five-minute-return.ts`'s, *may this be ranked at all* is
// `comparableBaseline`'s, and the ordinal is `returnPercentileOf`'s. What this
// module owns is the ORDER of those four calls and nothing else, which is why
// its answer is the three values rather than a sentence: a frame and a tool
// say different things about the same reading, and neither may re-derive it.
//
// ## No clock, no handle, no protocol
//
// `asOf` arrives as an argument and the two reads arrive as functions, so
// invariant 4 is structural here for the same reason it is in
// `five-minute-return.ts`: a module that reads nothing cannot read something
// timestamped after a replay clock. `a-tool-reads-no-clock` holds the tool
// side of that; this is the producer side.

import { fiveMinuteReturn } from "./five-minute-return.js";
import { comparableBaseline, returnPercentileOf } from "./return-percentile.js";

import type { FiveMinuteReturn } from "./five-minute-return.js";
import type { LiveObservation } from "./market-data-stream.js";
import type { StoredReturnBaseline } from "./return-baseline-store.js";
import type {
  BaselineComparison,
  BaselineGrid,
  ReturnPercentile,
} from "./return-percentile.js";
import type { Ticker } from "@marketpulse/shared";

/**
 * Where the two halves of the reading come from.
 *
 * **Both are functions rather than the stores themselves**, so this module
 * never learns that one is a process-memory window and the other a nightly
 * cache over a pool — and a test supplies two literals without building
 * either.
 */
export interface PriceAnomalySources {
  /** One security's trailing window, oldest first — `TrailingWindow.read`. */
  readonly windowOf: (symbol: Ticker) => readonly LiveObservation[];
  /**
   * That security's stored baseline generation **as of the instant asked
   * about**, which is why `asOf` is a parameter here rather than something
   * this module resolves: the caller owns the UTC→session-date conversion
   * (`marketDateAt`), and Epic 13's replay hands a past instant to the same
   * call.
   */
  readonly baselineOf: (
    symbol: Ticker,
    asOf: Date,
  ) => StoredReturnBaseline | undefined;
  /** The sampler's stride and the store's tape, read rather than spelled. */
  readonly grid: BaselineGrid;
}

/**
 * **The three values, and they are three different claims.**
 *
 * - `figure` — is there a move at all, and which of
 *   `five-minute-return.ts`'s own refusals if not.
 * - `comparison` — is there a baseline to rank it against at all, and which
 *   `PercentileRefusal` if not. Asked **unconditionally**, because *we have no
 *   move* and *we have no history* are two facts a reader is owed both of.
 * - `percentile` — where the magnitude sat, where it could be taken.
 *   `undefined` is either a refused comparison or a malformed distribution,
 *   told apart by `comparison` (`market-composite.ts`'s own wording, because
 *   that file reads exactly this triple).
 */
export interface PriceAnomalyReading {
  readonly figure: FiveMinuteReturn;
  readonly comparison: BaselineComparison;
  readonly percentile: ReturnPercentile | undefined;
}

/**
 * **One security's 5-minute move and where it sits in its own history.**
 *
 * Synchronous, with no `await`: the window is process memory and the baseline
 * is a loaded cache, which is what lets `symbolReturn` call this from inside
 * the market socket's own callback, where an unhandled rejection is a crashed
 * process.
 */
export function readPriceAnomaly(
  sources: PriceAnomalySources,
  symbol: Ticker,
  asOf: Date,
): PriceAnomalyReading {
  const figure = fiveMinuteReturn(sources.windowOf(symbol), { asOf });

  // **The narrowing is ONE CALL and the type is what carries it** (Task
  // 5.3.4): the refused arm `comparableBaseline` returns has no distribution
  // member, so neither caller can reach the arithmetic without having
  // answered *may this be ranked*.
  const comparison = comparableBaseline(
    sources.baselineOf(symbol, asOf),
    sources.grid,
  );

  const percentile =
    figure.measured && comparison.ranked
      ? returnPercentileOf(figure.percent, comparison.distribution)
      : undefined;

  return { figure, comparison, percentile };
}
