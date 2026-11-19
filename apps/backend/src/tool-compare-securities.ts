// `compare_securities` — the peer-comparison step (Task 7.2.4), and the
// fourth tool this product has.
//
// It wraps `excessMoveFactor` through the one shared producer
// (`peer-comparison.ts`), which is the same assembly `symbolReturn` reads for
// the market-stream `return` frame's own composite: **the comparison has one
// home and two readers**, never two homes. Nothing here measures, subtracts
// or ranks anything.
//
// ## "Compare against sector benchmark", and NOT "compare peers"
//
// `EPIC.md` names this step *compare peers*; the checklist draws
// `Compare against sector benchmark`, resolved at Story 7.2's own Gate 1.
// The shipped arithmetic differences this security's five-minute return
// against the **capitalisation-weighted sector SPDR**'s — `excessMoveReference`
// picks the fund, `CAP_WEIGHTED_CLAUSE` states the bias on screen — and
// *peers* promises an unweighted peer median this product does not compute
// and rejected at Story 5.6's own Gate 1. The epic's exit criterion keeps its
// wording; the step's description differs from it by decision.
//
// ## Three kinds of answer, and the third one is this tool's reason for
// ## existing
//
// 1. **ok** — a scored comparison: both legs, the signed excess, and where
//    its magnitude sits in this security's own 60-session history of it.
// 2. **refused** — `ExcessFactorRefusal`'s own six words plus `not-tracked`,
//    reused verbatim rather than collapsed. `reference-split-discontinuity`
//    (**the benchmark's** price break) stays a separate word from
//    `split-discontinuity` (**the subject's**): they refuse different
//    securities and are repaired in different places, and merging them would
//    be Story 5.5's hand-off item 3 in a new costume.
// 3. **inapplicable** — *the question does not arise.* A `sector_etf` IS the
//    fund its sector is measured against (`is-benchmark`, 11 of 516) and an
//    `index_etf` has no sector at all (`no-sector`, 4 of 516). **No backfill,
//    repair or waiting will ever produce a figure for either**, which is why
//    this is the one tool in the pipeline that needed `ToolOutcome` to grow a
//    third arm rather than borrowing `refused`: a reader told *unavailable*
//    reasonably waits.
//
// ## What no gated machine will ever see
//
// CI's store has 516 securities, zero bars, no provider and no nightly
// generation, so both windows are empty for ever and this tool answers
// `no-subject-move` on every gated run for an equity. The `inapplicable`
// arms are the exception and the reason Done-when 2 is reachable at all:
// they are decided from the **curated universe** alone, so `XLK` and `SPY`
// answer `is-benchmark` and `no-sector` identically on CI, on a laptop and
// on the deployment.

import { asInstant } from "@marketpulse/shared";

import { readPeerComparison } from "./peer-comparison.js";
import { untrackedRefusal } from "./tool-universe.js";
import { trackedSymbols } from "./universe.js";

import type { AnalyticalTool } from "./analytical-tool.js";
import type { PeerComparisonSources } from "./peer-comparison.js";
import type {
  JsonValue,
  MarketFeed,
  Sector,
  Ticker,
  ToolOutcome,
} from "@marketpulse/shared";

/**
 * The mint-site brand — `tool-return-percentile.ts`'s pattern and its reason:
 * the symbol is declared and never exported, so the only way to produce one
 * of these is through {@link createCompareSecuritiesTool}'s own `run`. A
 * figure a caller could assemble from a literal is a figure the model could
 * assemble too, which is invariant 1's whole subject.
 */
const brand = Symbol("peer-comparison-reading");

export interface CompareSecuritiesReading {
  readonly symbol: Ticker;
  /** The benchmark it was differenced against — named, never implied. */
  readonly referenceSymbol: string;
  /** The sector that benchmark stands for. Named, never derived by slug. */
  readonly sector: Sector;
  /** The subject's own signed five-minute move, as a percentage. */
  readonly percent: number;
  /** The benchmark's own, over the same five minutes. */
  readonly referencePercent: number;
  /**
   * **The SIGNED excess**, in percentage points — the subject's move minus
   * the benchmark's. Signed because the ordinal below is not: it ranks the
   * MAGNITUDE, so the direction is not recoverable from it. A security down
   * 4.2% against a sector down 6.0% is *ahead while falling*, which is why
   * the drawn region states this in words rather than tinting it.
   */
  readonly excessPoints: number;
  /** The older endpoint's own `startsAt` — shared by both legs, proved so. */
  readonly measuredFrom: Date;
  /** The newer endpoint's own `startsAt`, exactly the span later. */
  readonly measuredTo: Date;
  /** The span both legs were measured over, in minutes. */
  readonly spanMinutes: number;
  /** The integer ordinal, `0`–`99`. **Never `100`** — above the highest order
   * statistic there is no sample. */
  readonly rank: number;
  /** The magnitude is strictly above every sample the baseline holds. */
  readonly aboveSample: boolean;
  /** The counted `n` the ranking was taken against — never a constant. */
  readonly sampleCount: number;
  /** The baseline grid's own stride in minutes. */
  readonly baselineSpanMinutes: number;
  /** The tape the baseline's bars came from — invariant 6's field. */
  readonly baselineFeed: MarketFeed;
  readonly [brand]: true;
}

/**
 * **`{ symbol }` only — never the benchmark.**
 *
 * `excessMoveReference` decides which fund applies, and it is already the one
 * home for that branch (the drawn region reads it too). Accepting a benchmark
 * as an argument would be a second home for that choice, and the failure is
 * maximally quiet: a stored generation computed against one fund, scored
 * against a figure measured from another, with `referenceSymbol` travelling
 * on the row and naming the wrong one.
 */
export interface CompareSecuritiesInput {
  readonly symbol: Ticker;
}

/**
 * Builds the peer-comparison tool. Takes the producer's sources and the
 * universe membership set as arguments rather than reading either module
 * singleton, so a test runs it against two furnished windows, a furnished
 * generation and a two-symbol universe — which is also what lets its own
 * suite exercise the real `excessMoveReference`,
 * `comparableExcessBaseline`, `excessMoveFactor` and `returnPercentileOf`
 * with no server, no socket and no database.
 */
export function createCompareSecuritiesTool(
  sources: PeerComparisonSources,
  universe: ReadonlySet<string> = trackedSymbols(),
): AnalyticalTool<CompareSecuritiesInput, CompareSecuritiesReading> {
  return {
    name: "compare_securities",
    // Gate 1's own sentence for this step — deliberately not `EPIC.md`'s
    // "compare peers"; see the module comment.
    description: "Compare against sector benchmark",
    // Never `async`: two process-memory windows and a loaded cache need no
    // `await`. `asOf` comes off the `ToolContext` — this file reads no clock,
    // which `a-tool-reads-no-clock` holds.
    run({ symbol }, { asOf }): Promise<ToolOutcome<CompareSecuritiesReading>> {
      // **The membership question first**, through the one home every tool
      // in this story shares. `PSKY` and `WBD` run the full checklist with
      // each tool answering this independently (Story 7.2's Gate 1).
      const untracked = untrackedRefusal(symbol, universe);
      if (untracked !== undefined) return Promise.resolve(untracked);

      const reading = readPeerComparison(sources, symbol, asOf);

      // A tracked symbol the curated universe does not describe cannot
      // happen — the membership set is built from that same universe — so
      // this is the two sources disagreeing rather than a market condition,
      // and `not-tracked` is the honest answer to it: we hold no description
      // of this security. Never `no-sector`, which would be a claim about a
      // fund we would have had to look up.
      if (!reading.described) {
        return Promise.resolve({ kind: "refused", reason: "not-tracked" });
      }

      const { referenceOf, subject, reference, factor } = reading;

      // **The question does not arise**, and it is answered before any
      // refusal because a security with no benchmark cannot have a too-short
      // baseline of a comparison that does not exist — `excessMoveFactor`'s
      // own guard order, inherited rather than re-decided.
      //
      // **Asked of the REFERENCE rather than of `factor.because`, for one
      // type-level reason**: the applicable arm of `ExcessMoveReference` is
      // the only one carrying a `sector`, so this is the narrowing that makes
      // reading one without having answered *does a benchmark exist at all*
      // a compile error (`excess-move.ts`'s own stated mechanism). The two
      // cannot disagree — `excessMoveFactor`'s inapplicable arm is a function
      // of exactly this value, forwarding the word rather than deciding it —
      // and the word itself is still `EXCESS_MOVE_INAPPLICABILITIES`', never
      // a synonym minted here.
      if (!referenceOf.applies) {
        return Promise.resolve({
          kind: "inapplicable",
          because: referenceOf.because,
        });
      }

      // **The same question, asked of the factor, and it cannot answer
      // differently** — its inapplicable arm is a function of the value the
      // guard above just read. The guard exists because TypeScript cannot
      // know the two are linked, and it is written to return the factor's own
      // word rather than to throw or to cast: a dead branch that would be
      // WRONG if it ever ran is worse than one that would be right.
      if (!factor.applies) {
        return Promise.resolve({
          kind: "inapplicable",
          because: factor.because,
        });
      }

      // Each of `ExcessFactorRefusal`'s six words, verbatim. The two legs are
      // still true where the subtraction is refused — the drawn region's own
      // rule — but this tool's answer is the comparison, so a refused
      // comparison carries the word and no figure.
      if (!factor.scored) {
        return Promise.resolve({ kind: "refused", reason: factor.refusal });
      }

      // Reachable only on the scored arm: `excessMoveFactor` refuses
      // `no-subject-move`/`no-reference-move` before it subtracts, so both
      // legs are measured here. Read through their own unions rather than
      // asserted, because a narrowing is what makes that structural.
      if (!subject.measured || !reference?.measured) {
        return Promise.resolve({ kind: "refused", reason: "no-subject-move" });
      }

      return Promise.resolve({
        kind: "ok",
        value: {
          symbol,
          referenceSymbol: factor.referenceSymbol,
          sector: referenceOf.sector,
          percent: subject.percent,
          referencePercent: reference.percent,
          excessPoints: factor.excessPoints,
          // **Both legs share these two instants and the factor proved it**
          // — `sameInterval` refuses a pair whose endpoints disagree, so the
          // subject's are the comparison's.
          measuredFrom: subject.from.startsAt,
          measuredTo: subject.to.startsAt,
          spanMinutes: subject.spanMinutes,
          rank: factor.percentile.rank,
          aboveSample: factor.percentile.aboveSample,
          sampleCount: factor.percentile.sampleCount,
          baselineSpanMinutes: factor.percentile.spanMinutes,
          baselineFeed: factor.percentile.feed,
          [brand]: true,
        },
      });
    },
  };
}

/**
 * The wire projection for a `TOOL_CALL_COMPLETED` event's `outcome.value` —
 * named fields rather than a spread, for `toWireSecuritySnapshot`'s reason: a
 * field added to {@link CompareSecuritiesReading} without being added here is
 * never read, so it cannot reach the wire unexamined.
 *
 * **Nothing is derived and nothing is formatted.** The ordinal's suffix, the
 * `ahead`/`behind` wording of the signed excess and the sector's display name
 * are all the browser's, from the fields below.
 */
export function toWireCompareSecurities(
  reading: CompareSecuritiesReading,
): Readonly<Record<string, JsonValue>> {
  return {
    symbol: reading.symbol,
    referenceSymbol: reading.referenceSymbol,
    sector: reading.sector,
    percent: reading.percent,
    referencePercent: reading.referencePercent,
    excessPoints: reading.excessPoints,
    measuredFrom: asInstant(reading.measuredFrom),
    measuredTo: asInstant(reading.measuredTo),
    spanMinutes: reading.spanMinutes,
    rank: reading.rank,
    aboveSample: reading.aboveSample,
    sampleCount: reading.sampleCount,
    baselineSpanMinutes: reading.baselineSpanMinutes,
    baselineFeed: reading.baselineFeed,
  };
}
