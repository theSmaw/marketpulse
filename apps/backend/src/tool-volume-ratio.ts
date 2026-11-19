// `calculate_volume_ratio` — the volume-anomaly step (Task 7.2.3), and the
// third tool this product has.
//
// It wraps `volumeFactorAnswer()` (`market-composite.ts`), which takes no
// argument and answers `{ state: "no-distribution" }` for every security at
// every instant, on every store that exists. `0015_volume_baselines.sql`
// stores a **median and a dispersion, not a distribution**, so there is no
// history of this factor's own quantity to rank a multiple against — for ANY
// security, anywhere. The absence is a fact about this product's stored
// aggregates rather than about this security's coverage, which is why the
// answer does not vary and this file reads nothing.
//
// ## Two refusals, and the second one is the whole tool
//
// 1. `not-tracked` — the universe-membership question, decided before
//    anything else is consulted, through the one home every tool in this
//    story shares (`tool-universe.ts`). It is deliberately FIRST even though
//    the next answer is unconditional: `PSKY` and `WBD` run the full
//    checklist with each tool answering the same membership refusal
//    independently (Story 7.2's Gate 1), and *we do not track this security*
//    is a different fact from *nobody can rank volume yet*.
// 2. `no-distribution` — the word `FACTOR_ANSWER_STATES` already owns,
//    reused verbatim rather than synonymised, per Gate 1's own rule. It is
//    neither *no data* nor *we will not answer*: the figure exists and the
//    **history to rank it against** does not.
//
// **The honest sentence has ONE home and it is not here.** The reader-facing
// wording for this fact is `anomaly-score.ts`' `NO_DISTRIBUTION_REASON` —
// `no history to rank it` — which the security page's own factor ledger has
// drawn since 2026-10-28. This tool carries the WORD across the wire and no
// sentence at all, because a second copy of that sentence in the backend
// would be ADR 0029's one-fact-one-home broken in the one place this product
// has already decided it. Nothing on the checklist renders a tool refusal's
// reason today (Story 7.3's own scope — `TOOL_CALL_COMPLETED`'s outcome is
// read by nothing in `investigation-checklist-state.ts`), so the word is
// where the fact stops travelling for now.
//
// ## Deliberately NOT Story 5.5's `volumeRateOf`
//
// That is the richer, database-backed `× typical` ratio against a same-tape
// `iex` baseline, drawable on 4 of 39,928 buckets on the deployment and
// carrying six refusals of its own. It answers a different question and is a
// different, later scope; this tool stays the structural percentile refusal
// `EPIC.md` named.
//
// ## What EVERY machine sees, which is unusual for this epic
//
// Every other tool in this story has an arm no gated machine can reach.
// This one is the opposite: its answer is identical on CI, on a laptop and
// on the deployment, for ever, because it depends on no store at all. That
// is what makes it the one step in the pipeline whose interesting case a
// gated machine can actually exercise.

import { volumeFactorAnswer } from "./market-composite.js";
import { untrackedRefusal } from "./tool-universe.js";
import { trackedSymbols } from "./universe.js";

import type { AnalyticalTool } from "./analytical-tool.js";
import type {
  JsonValue,
  MarketFeed,
  Ticker,
  ToolOutcome,
} from "@marketpulse/shared";

/**
 * The mint-site brand — `tool-return-percentile.ts`'s pattern and its
 * reason: the symbol is declared and never exported, so the only way to
 * produce one of these is through {@link createVolumeRatioTool}'s own `run`.
 * A figure a caller could assemble from a literal is a figure the model
 * could assemble too, which is invariant 1's whole subject.
 *
 * It is load-bearing here in a way it is not elsewhere. **Nothing in this
 * product can construct a {@link VolumeRatioReading} today** — not even this
 * module — because the `ok` arm is unreachable while `volumeFactorAnswer`
 * answers `no-distribution` unconditionally. The brand is what stops a later
 * reader "helpfully" filling the gap with a literal rather than with a
 * stored distribution.
 */
const brand = Symbol("volume-ratio-reading");

/**
 * **The reading this tool would carry the day a distribution exists, and
 * carries never until then.**
 *
 * Declared rather than deferred for three reasons. It keeps
 * `toRunnableTool`'s `toWire` well-typed rather than erased through a
 * `never`; it says in a type what the refusal arm's own docblock says in
 * prose, which is that the missing thing is the DENOMINATOR and not the
 * figure; and it makes the reversal concrete — the day
 * `0015_volume_baselines.sql`'s successor stores a **distribution** of this
 * quantity, {@link createVolumeRatioTool}'s `no-distribution` arm is
 * **DELETED rather than widened**, in the same commit as `FactorAnswer`'s own
 * reversal trigger and `ANOMALY_BAND_FLOORS`' trigger 1, and this interface
 * is what that commit fills in.
 *
 * Every field is the shape the figure's own existing homes already use, so
 * that commit is a fill rather than a design: a RATE and a label that says
 * so (ADR 0045 — `5 × median` is not the typical five-minute volume), the
 * integer ordinal `returnPercentileOf`'s own `50/√n ≤ 1` derivation
 * licenses, the counted `n` rather than a constant, and the TAPE, because
 * ADR 0045's own subject is that a volume LEVEL is not comparable across two
 * of them.
 */
export interface VolumeRatioReading {
  readonly symbol: Ticker;
  /**
   * The current volume RATE against its typical — `Σvolume / spanMinutes`
   * over the median of **one** minute, which is Story 5.5's own decision
   * about what this quantity is a ratio of.
   */
  readonly ratio: number;
  /** The integer ordinal, `0`–`99`. **Never `100`** — above the highest
   * order statistic there is no sample. */
  readonly rank: number;
  /** The counted `n` the ranking was taken against — never a constant. */
  readonly sampleCount: number;
  /** The tape both the numerator and the baseline came from — invariant 6's
   * field, and ADR 0045's: a volume level is a level, so the two halves must
   * be the same tape or the ratio is not one. */
  readonly feed: MarketFeed;
  readonly [brand]: true;
}

export interface VolumeRatioInput {
  readonly symbol: Ticker;
}

/**
 * Builds the volume-anomaly tool. Takes the universe membership set as its
 * one argument — defaulted, so production reads the curated file and a test
 * supplies a two-symbol universe — because the membership question is the
 * only question this tool has anything to consult for.
 *
 * There is deliberately **no second dependency**. A store handle here would
 * be a parameter read for nothing, which is the next reader looking for a
 * branch that does not exist: `volumeFactorAnswer`'s own signature takes no
 * argument for exactly that reason, and this factory inherits it rather than
 * re-litigating it.
 */
export function createVolumeRatioTool(
  universe: ReadonlySet<string> = trackedSymbols(),
): AnalyticalTool<VolumeRatioInput, VolumeRatioReading> {
  return {
    name: "calculate_volume_ratio",
    // `EPIC.md`'s second of five, and `PRODUCT_SPEC.md` §14's own sentence
    // for this step: the checklist draws this, never the tool's identifier.
    description: "Measure volume anomaly",
    // Never `async`: there is nothing to await, and a tool that is not
    // actually asynchronous should not look like one. `asOf` is not read at
    // all — this file reads no clock and no store, which
    // `a-tool-reads-no-clock` holds.
    run({ symbol }): Promise<ToolOutcome<VolumeRatioReading>> {
      const untracked = untrackedRefusal(symbol, universe);
      if (untracked !== undefined) return Promise.resolve(untracked);

      // **The one branch, and it is a type-level question rather than a
      // market one.** `volumeFactorAnswer()` is called rather than its
      // answer assumed, so the day it stops being unconditional this tool
      // follows it — reading the owning module's answer is what keeps this
      // from becoming a second home for the same fact. The `state` is
      // checked rather than trusted for the same reason: a widened
      // `FactorAnswer` reaches here as a `tsc -b` error about the
      // unreachable `ok` arm, which is the signal the reversal is due.
      const answer = volumeFactorAnswer();
      if (answer.state === "no-distribution") {
        return Promise.resolve({ kind: "refused", reason: "no-distribution" });
      }

      // Unreachable today, and that is the whole point of the arm above.
      // `volumeFactorAnswer` answers one state; a second one arriving here
      // means a distribution got stored, and this is where the figure goes.
      // It refuses rather than fabricating one, because a reading this
      // product cannot MEASURE is a reading invariant 1 forbids it to mint.
      return Promise.resolve({ kind: "refused", reason: "no-distribution" });
    },
  };
}

/**
 * The wire projection for a `TOOL_CALL_COMPLETED` event's `outcome.value` —
 * named fields rather than a spread, for `toWireSecuritySnapshot`'s reason: a
 * field added to {@link VolumeRatioReading} without being added here is never
 * read, so it cannot reach the wire unexamined.
 *
 * **Never called today**, because the `ok` arm is unreachable. It exists so
 * `toRunnableTool`'s own contract is satisfied with a real projection rather
 * than a throw or a cast — and so the reversal commit has nothing to invent.
 */
export function toWireVolumeRatio(
  reading: VolumeRatioReading,
): Readonly<Record<string, JsonValue>> {
  return {
    symbol: reading.symbol,
    ratio: reading.ratio,
    rank: reading.rank,
    sampleCount: reading.sampleCount,
    feed: reading.feed,
  };
}
