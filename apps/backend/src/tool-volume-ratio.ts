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

import {
  FINDING_TYPE_FOR_TOOL,
  createEvidencedFinding,
  createUnevidencedFinding,
  formatCount,
  percentileOrdinal,
  refusalClaim,
} from "@marketpulse/shared";

import { volumeFactorAnswer } from "./market-composite.js";
import { untrackedRefusal } from "./tool-universe.js";
import { trackedSymbols } from "./universe.js";

import type { AnalyticalTool } from "./analytical-tool.js";
import type {
  Finding,
  FindingStamp,
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
  /**
   * The magnitude is strictly above every sample the baseline holds; a surface
   * draws this as `>99th` rather than as a rank.
   *
   * **Added 2026-11-23 (Task 7.3.1)** and it is the same fill-rather-than-
   * design this interface exists for: `percentileOrdinal` — the one home for
   * spelling an ordinal, now in `packages/shared` — takes the rank **and** the
   * ceiling flag, because `>99th` is the stronger statement rather than a
   * clamp. Without this field the claim would have to supply a `false`, which
   * is a figure nobody read, and AC 9 forbids one.
   */
  readonly aboveSample: boolean;
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
    aboveSample: reading.aboveSample,
    sampleCount: reading.sampleCount,
    feed: reading.feed,
  };
}

/** This step's claim kind, read from the one home rather than spelled. */
const TYPE = FINDING_TYPE_FOR_TOOL.calculate_volume_ratio;

/**
 * **This step's claim** (Task 7.3.1), and it is the one claim in the pipeline
 * **every** machine meets: `Volume rate — no stored distribution to rank
 * against`, on CI, on a laptop and on the deployment, for ever.
 *
 * ## The refusal arm is the whole function today
 *
 * `volumeFactorAnswer()` answers `no-distribution` unconditionally, because
 * `0015_volume_baselines.sql` stores a **median and a dispersion, not a
 * distribution**. So `confidence` is `UNKNOWN` — AC 3's *a refused outcome
 * always produces `UNKNOWN`*, which {@link UnevidencedFinding}'s own literal
 * type makes unarguable — and there is no evidence member at all, which is the
 * honest shape: nothing was read.
 *
 * ## The claim does NOT reuse the ledger's own wording, by the same test that
 * ## moved three formatters into `packages/shared`
 *
 * This module's header says in terms that the honest sentence for this fact
 * has one home and it is not here — `apps/frontend/src/market/
 * anomaly-score.ts`'s `no history to rank it`, in the composite ledger's
 * ~34-character reason cell. **That still stands.** Story 7.3's Gate 1 (B1)
 * settled a per-string test — a formatter moves only if the backend prints it
 * **verbatim** — and this is a *different grammar for the same fact*: the
 * ledger's is a fragment in a fixed column, and the claim is a clause in a
 * one-line sentence with 72 characters to spend, which lets it say the word
 * the cell could not fit. **`stored` is that word, and it is the point**: the
 * absence is a fact about this product's aggregates rather than about this
 * security's coverage, which is the distinction this tool exists to draw.
 *
 * ## The `ok` arm is unreachable and is written correctly anyway
 *
 * Its confidence is `SUPPORTED` with no `POSSIBLE` floor, for
 * `calculate_return_percentile`'s own reason: the minimum sample is the
 * percentile's own derived bound, so a rank that exists is above it. The day a
 * distribution is stored, this arm and {@link VolumeRatioReading} are a fill
 * rather than a design.
 *
 * **And its claim deliberately draws the ORDINAL rather than the multiple**,
 * which is a one-home decision rather than an omission. The `×` that makes a
 * figure a multiple has exactly one home — `formatMultiple` in
 * `apps/frontend/src/market/volume-ratio.ts`, held by
 * `one-home-for-the-multiple-glyph`, which decides five channels together (the
 * glyph glued to the digits at the same size and weight, no sign ever, one
 * decimal always, the comparand as a word beside it, untinted ink). Moving it
 * into `packages/shared` for an arm **no store can reach** would be
 * infrastructure built before the iteration that needs it, and the rank is the
 * scored form in any case — Story 5.6's Gate 1 corollary, that ADR 0045 makes
 * the percentile the only comparable form of this quantity and never the
 * `4.1×` multiple.
 *
 * **Reversal condition:** the first nightly pass that stores a distribution of
 * this factor's own quantity — the same condition
 * {@link VolumeRatioReading}'s own docblock and `FactorAnswer`'s
 * `no-distribution` arm already carry. On firing, `formatMultiple` moves into
 * `packages/shared` by Story 7.3's own per-string test (the backend would then
 * print it verbatim) and this claim takes the multiple with it.
 */
export function toVolumeRatioFinding(
  outcome: ToolOutcome<VolumeRatioReading>,
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
        `Volume rate at the ${percentileOrdinal(reading)} of ` +
        formatCount(reading.sampleCount),
      confidence: "SUPPORTED",
      evidence: [
        {
          kind: "calculated_metric",
          // **One tape for both halves** — ADR 0045: a volume LEVEL is not
          // comparable across two of them, so the numerator's feed and the
          // baseline's are one field on the reading and one field here.
          source: `alpaca:${reading.feed}`,
          method: "volumeRateOf",
          security: reading.symbol,
          rawData: `volume_baselines:${reading.symbol}`,
        },
      ],
    },
    stamp,
  );
}
