// `calculate_return_percentile` — the price-anomaly step (Task 7.2.2), and
// the second tool this product has.
//
// It wraps `returnPercentileOf` through the one shared producer
// (`price-anomaly.ts`), which is the same assembly `symbolReturn` reads for
// the market-stream `return` frame: **the figure has one home and two
// readers**, never two homes. Nothing here measures or ranks anything.
//
// ## Three refusals from three different questions, in the order a reader
// ## needs them
//
// 1. `not-tracked` — a universe-membership question, decided before either
//    store is consulted, through the one home every tool in this story
//    shares (`tool-universe.ts`).
// 2. **The numerator**: is there a 5-minute move to rank at all? Carried in
//    `five-minute-return.ts`'s own words — `nothing-observed`,
//    `no-earlier-endpoint`, `no-basis`.
// 3. **The denominator**: is there a baseline to rank it against? Carried in
//    `PERCENTILE_REFUSALS`' own words — `too-few-samples`,
//    `split-discontinuity`.
//
// Steps 2 and 3 are deliberately not one word. A silent security and an
// under-sampled one are different facts with different repairs — one waits
// for the feed, the other waits for sessions to accumulate — and the step's
// own outcome is the only place an investigation can say which.
//
// ## What no gated machine will ever see
//
// CI's store has 516 securities, zero bars and no provider, so the trailing
// window is empty for ever and this tool answers `nothing-observed` on every
// gated run — the numerator refuses before the baseline is even consulted. A
// rank needs a live feed AND a nightly generation, which only the deployment
// has.

import {
  FINDING_TYPE_FOR_TOOL,
  asInstant,
  createEvidencedFinding,
  createUnevidencedFinding,
  formatChangePercent,
  formatCount,
  percentileOrdinal,
  refusalClaim,
} from "@marketpulse/shared";

import { readPriceAnomaly } from "./price-anomaly.js";
import { untrackedRefusal } from "./tool-universe.js";
import { trackedSymbols } from "./universe.js";

import type { AnalyticalTool } from "./analytical-tool.js";
import type { ReturnRefusal } from "./five-minute-return.js";
import type { PriceAnomalySources } from "./price-anomaly.js";
import type {
  Finding,
  FindingStamp,
  JsonValue,
  MarketFeed,
  Ticker,
  ToolOutcome,
  ToolRefusal,
} from "@marketpulse/shared";

/**
 * Every return refusal is a tool refusal. **A type-level assertion rather
 * than a test**, the backend half of `TOOL_REFUSALS`' own pair: a fourth
 * member of {@link ReturnRefusal} that is not also a `ToolRefusal` fails
 * `tsc -b` here, rather than reaching this tool's `run` as a word the
 * outcome union cannot carry.
 */
export type ReturnRefusalIsAToolRefusal = ReturnRefusal extends ToolRefusal
  ? true
  : never;

/** Satisfied only while the assertion above holds. */
export const TOOL_REFUSALS_COVER_THE_RETURN_ONES: ReturnRefusalIsAToolRefusal = true;

/**
 * The mint-site brand — `tool-security-snapshot.ts`'s pattern and its
 * reason: the symbol is declared and never exported, so the only way to
 * produce one of these is through {@link createReturnPercentileTool}'s own
 * `run`. A figure a caller could assemble from a literal is a figure the
 * model could assemble too, which is invariant 1's whole subject.
 */
const brand = Symbol("return-percentile-reading");

export interface ReturnPercentileReading {
  readonly symbol: Ticker;
  /**
   * The signed move between the two endpoints, as a percentage — **the
   * figure, not the ranking**. The rank below is taken on its MAGNITUDE
   * (`returnPercentileOf` takes the `abs` itself, against a pooled
   * distribution of absolute moves), so the sign lives here and nowhere
   * else.
   */
  readonly percent: number;
  /** The older endpoint's own `startsAt`. */
  readonly measuredFrom: Date;
  /** The newer endpoint's own `startsAt`, exactly the span later. */
  readonly measuredTo: Date;
  /** How many of the span's minutes were actually printed, `1`–`spanMinutes`. */
  readonly observed: number;
  /** The measurement span the move was taken over — five minutes. */
  readonly spanMinutes: number;
  /** The integer ordinal, `0`–`99`. **Never `100`** — see `returnPercentileOf`. */
  readonly rank: number;
  /** The magnitude is strictly above every sample the baseline holds; a
   * surface draws this as `>99th` rather than as a rank. */
  readonly aboveSample: boolean;
  /** The counted `n` the ranking was taken against — never a constant. */
  readonly sampleCount: number;
  /** The baseline grid's own stride in minutes. */
  readonly baselineSpanMinutes: number;
  /** The tape the baseline's bars came from — invariant 6's field. */
  readonly baselineFeed: MarketFeed;
  readonly [brand]: true;
}

export interface ReturnPercentileInput {
  readonly symbol: Ticker;
}

/**
 * Builds the price-anomaly tool. Takes the producer's sources and the
 * universe membership set as arguments rather than reading either module
 * singleton, so a test runs it against a furnished window, a furnished
 * baseline row and a two-symbol universe — which is also what lets its own
 * suite exercise the real `fiveMinuteReturn`, `comparableBaseline` and
 * `returnPercentileOf` with no server, no socket and no database.
 */
export function createReturnPercentileTool(
  sources: PriceAnomalySources,
  universe: ReadonlySet<string> = trackedSymbols(),
): AnalyticalTool<ReturnPercentileInput, ReturnPercentileReading> {
  return {
    name: "calculate_return_percentile",
    // `PRODUCT_SPEC.md` §14's own sentence for this step, and `EPIC.md`'s
    // first of five: the checklist draws this, never the tool's identifier.
    description: "Measure price anomaly",
    // Never `async`: a process-memory window and a loaded cache need no
    // `await`, and a tool that is not actually asynchronous should not look
    // like one. `asOf` comes off the `ToolContext` — this file reads no
    // clock, which `a-tool-reads-no-clock` holds.
    run({ symbol }, { asOf }): Promise<ToolOutcome<ReturnPercentileReading>> {
      const untracked = untrackedRefusal(symbol, universe);
      if (untracked !== undefined) return Promise.resolve(untracked);

      const { figure, comparison, percentile } = readPriceAnomaly(
        sources,
        symbol,
        asOf,
      );

      // **The numerator first, in its own vocabulary.** There is nothing to
      // rank, so the baseline's own answer — however good it is — is not the
      // sentence this step owes a reader.
      if (!figure.measured) {
        return Promise.resolve({ kind: "refused", reason: figure.refusal });
      }

      // **The denominator, in its own.** `too-few-samples` covers *we hold a
      // distribution and it is too short* and *we hold none at all* by
      // `PERCENTILE_REFUSALS`' own decision, which this tool inherits rather
      // than re-litigates.
      if (!comparison.ranked) {
        return Promise.resolve({ kind: "refused", reason: comparison.refusal });
      }

      // **A distribution the arithmetic refused** — not 101 points, or a
      // non-finite breakpoint — which `0013_return_baselines.sql`'s own
      // `return_baselines_breakpoint_count` makes unrepresentable, so a row
      // like it was written by something that is not this product's pass.
      // There is no honest sentence for it, so it takes the word for
      // *nothing we can rank against*, which is `market-composite.ts`'s
      // treatment of the identical state, inherited rather than re-decided.
      if (percentile === undefined) {
        return Promise.resolve({ kind: "refused", reason: "too-few-samples" });
      }

      return Promise.resolve({
        kind: "ok",
        value: {
          symbol,
          percent: figure.percent,
          measuredFrom: figure.from.startsAt,
          measuredTo: figure.to.startsAt,
          observed: figure.observed,
          spanMinutes: figure.spanMinutes,
          rank: percentile.rank,
          aboveSample: percentile.aboveSample,
          sampleCount: percentile.sampleCount,
          baselineSpanMinutes: percentile.spanMinutes,
          baselineFeed: percentile.feed,
          [brand]: true,
        },
      });
    },
  };
}

/**
 * The wire projection for a `TOOL_CALL_COMPLETED` event's `outcome.value` —
 * named fields rather than a spread, for `toWireSecuritySnapshot`'s reason: a
 * field added to {@link ReturnPercentileReading} without being added here is
 * never read, so it cannot reach the wire unexamined.
 *
 * **Nothing is derived and nothing is formatted IN THIS FUNCTION.** The
 * ordinal's suffix, the `>99th` reading of `aboveSample` and the thousands
 * separator on `sampleCount` are all the browser's, from the fields below.
 *
 * **Narrowed 2026-11-23 (Task 7.3.1), because the file-level version of that
 * sentence went false and the claim had to be repointed rather than left
 * standing.** This module's own header used to say *nothing is derived and
 * nothing is formatted — all the browser's* about the whole file, and
 * {@link toReturnPercentileFinding} below now formats three figures into a
 * sentence the backend prints. The division of labour is unchanged for the
 * **wire projection**: a figure crossing the wire as data is raw, and a reader
 * spells it. What is new is a second kind of payload — a **claim**, which is
 * prose by construction and has to be built where the typed reading is. It
 * spells nothing of its own: `formatChangePercent`, `percentileOrdinal` and
 * `formatCount` all moved into `packages/shared` in the same change so there
 * is one spelling of each figure and not two.
 */
export function toWireReturnPercentile(
  reading: ReturnPercentileReading,
): Readonly<Record<string, JsonValue>> {
  return {
    symbol: reading.symbol,
    percent: reading.percent,
    measuredFrom: asInstant(reading.measuredFrom),
    measuredTo: asInstant(reading.measuredTo),
    observed: reading.observed,
    spanMinutes: reading.spanMinutes,
    rank: reading.rank,
    aboveSample: reading.aboveSample,
    sampleCount: reading.sampleCount,
    baselineSpanMinutes: reading.baselineSpanMinutes,
    baselineFeed: reading.baselineFeed,
  };
}

/** This step's claim kind, read from the one home rather than spelled. */
const TYPE = FINDING_TYPE_FOR_TOOL.calculate_return_percentile;

/**
 * **This step's claim** (Task 7.3.1) — `−4.20% over 5 min — 94th of 4,620`.
 *
 * ## Confidence: `SUPPORTED` on every `ok`, and `POSSIBLE` is correctly
 * ## UNREACHABLE here
 *
 * The rule is a stated function of the reading's own counted evidence: `ok`
 * below the tool's own shipped sufficiency floor is `POSSIBLE`, above it
 * `SUPPORTED`. **This tool's floor is enforced upstream as a refusal.**
 * `returnPercentileOf`'s minimum sample is derived rather than chosen —
 * `50/√n ≤ 1` gives `n ≥ 2500` exactly, because an integer ordinal's last
 * digit is one percentile point — and `comparableBaseline` answers
 * `too-few-samples` below it, which this tool forwards verbatim. So an `ok`
 * from this tool is above the floor **by construction**.
 *
 * **No second floor was invented to fill that arm**, which is the decision
 * worth recording: a `POSSIBLE` here would need a threshold nobody has
 * derived, sitting beside a refusal threshold somebody did, and the two would
 * disagree about what *enough* means for one figure.
 *
 * ## Two evidence items, because two independent reads happened
 *
 * The **numerator** is an observation — two bars from the trailing window —
 * and the **denominator** is a stored aggregate the nightly pass computed.
 * They refuse for unrelated reasons (this module's own header), they come from
 * different stores, and a reader asking *what is this ranked against* is
 * asking about the second one specifically.
 *
 * **The observation's own tape is not on this reading, and is not guessed.**
 * `ReturnPercentileReading` carries `baselineFeed` and no feed for the
 * numerator, so that item's `source` names the **producer** —
 * `trailing-window` — rather than asserting `iex`. AC 9's rule reaches
 * provenance as well as figures: an item must carry nothing it did not
 * actually read.
 */
export function toReturnPercentileFinding(
  outcome: ToolOutcome<ReturnPercentileReading>,
  stamp: FindingStamp,
): Finding | undefined {
  if (outcome.kind === "inapplicable") return undefined;

  if (outcome.kind === "refused") {
    return createUnevidencedFinding(
      {
        type: TYPE,
        claim: refusalClaim(TYPE, outcome.reason),
        because: outcome.reason,
      },
      stamp,
    );
  }

  const reading = outcome.value;

  return createEvidencedFinding(
    {
      type: TYPE,
      claim:
        `${formatChangePercent(reading.percent)} over ` +
        `${String(reading.spanMinutes)} min — ` +
        `${percentileOrdinal(reading)} of ` +
        formatCount(reading.sampleCount),
      confidence: "SUPPORTED",
      evidence: [
        {
          kind: "market_observation",
          source: "trailing-window",
          // The NEWER endpoint's own instant — the move is measured between
          // two bars and this is the one a reader would check a chart against.
          observedAt: reading.measuredTo,
          security: reading.symbol,
          rawData: `trailing-window:${reading.symbol}`,
        },
        {
          kind: "calculated_metric",
          source: `alpaca:${reading.baselineFeed}`,
          // **No `observedAt`.** The baseline is 60 sessions of returns, which
          // has no single instant at which it was true — and inventing one
          // would be exactly the fabrication AC 9 forbids.
          method: "returnPercentileOf",
          security: reading.symbol,
          rawData: `return_baselines:${reading.symbol}`,
        },
      ],
    },
    stamp,
  );
}
