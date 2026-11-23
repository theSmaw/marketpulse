import { formatCount } from "./price-format.js";

import type { FindingType } from "./finding.js";
import type { ToolRefusal } from "./investigation.js";
import type { WireMarketBreadth } from "./market-stream-protocol.js";

/**
 * **The claim's own short grammar** (Task 7.3.1) — the strings a
 * `Finding.claim` is built from, and the one home for each of them.
 *
 * ## Why this module exists rather than the claims reusing a drawn sentence
 *
 * Story 7.3's Gate 1 (B1) settled a **per-string test**: a formatter moves
 * into `packages/shared` only if the backend prints it **verbatim**, and a
 * different *grammar* for the same fact gets its own home. Three formatters
 * passed that test and moved (`formatChangePercent`, `formatPrice`,
 * `percentileOrdinal`, now in `price-format.ts` and `percentile-ranking.ts`).
 * What lives here is the half that failed it: the breadth region's own footer
 * is a multi-clause sentence over a counted population, and a `Finding.claim`
 * is **one line under a 72-character ceiling** with no heading to hang a word
 * in. Relocating that footer's file would have moved a sentence neither
 * surface could use.
 *
 * So the claims get a short grammar built from the **same counted figures** —
 * never a re-derivation, never a second rounding, never a second spelling of a
 * figure the security page already draws a few centimetres above the
 * checklist.
 *
 * ## It carries no intensity adjective, and that is a reserved word rather
 * ## than a style preference
 *
 * `measured-set.ts`'s existing reservation, inherited: `high` is one of the
 * four `ANOMALY_BANDS`, and `anomaly.ts` carries a reversal trigger naming
 * *the first surface that needs to say `high` about something other than an
 * anomaly score on the same screen*. From Epic 8 a confidence mark and a band
 * chip sit on one row, so a claim reading *volume is high* would put a band
 * word beside a band chip meaning something else. Stated here rather than
 * discovered then.
 *
 * ## And no claim names the investigated ticker
 *
 * Gate 1's decision: the subject is already named by the route, the identity
 * block and the investigation's own `subjectSymbols`. A **reference** security
 * is named — `XLK`, `SPY` — because *which benchmark* is the whole meaning of
 * a comparison and nothing else on the row says it.
 */

/**
 * **The subject noun each claim kind leads with when there is no figure.**
 *
 * ## Read the division of labour before copying the shape
 *
 * An `ok` claim **leads with its figure** and carries no subject noun at all:
 * `−4.20% over 5 min — 94th of 4,620` identifies itself, and a noun in front
 * of it would be the row's own `description` said twice (the checklist already
 * draws `Measure price anomaly` on the line above). A **refusal** has no
 * figure to lead with, so it needs to say what question went unanswered.
 *
 * **These are keyed on {@link FindingType} and never on a tool's `name` or
 * `description`, which is a decision rather than a convenience.** A claim
 * templated from the tool's name is exactly the defect Done-when 2's
 * pairwise-distinctness test exists to catch: it would produce the same
 * sentence for every outcome that tool can reach, and on a zero-bar store —
 * CI's permanent state, where every step refuses — six rows would read as six
 * labels with nothing measured and nothing said about why. A finding type
 * names the **question**; the refusal word beside it names **why it does not
 * have an answer**, and that half varies with the outcome.
 *
 * Short, because the ceiling is 72 and the refusal phrases below run to 48.
 */
export const FINDING_SUBJECTS = {
  PRICE_OBSERVATION: "Last price",
  PRICE_MOVE: "5-minute move",
  VOLUME_RATE: "Volume rate",
  RELATIVE_MOVE: "Sector comparison",
  MARKET_BREADTH: "Market breadth",
  RETURN_CORRELATION: "Market correlation",
} satisfies Record<FindingType, string>;

/**
 * **Why a step has no figure, in the claim's own register — one phrase per
 * word in `TOOL_REFUSALS`, total over it.**
 *
 * A **total record**, so a fifteenth refusal word is a compile error naming
 * the missing member rather than an `undefined` reaching a reader's row.
 * `MARKET_FEED_DESCRIPTIONS`' guard, pointed at the vocabulary a tool answers
 * with.
 *
 * ## The register, inherited rather than invented
 *
 * Lower case, no terminal stop, no connection word and no status word — these
 * are clauses that follow an em dash after {@link FINDING_SUBJECTS}' own noun,
 * which is `percentileRefusal`'s shape one surface over. Each says *what we
 * did not have*, never *we failed*: invariant 5's own sentence is that "not
 * enough evidence" is a correct, first-class outcome.
 *
 * ## Two pairs that must never merge, and they are the reason this is a record
 * ## rather than a prettifier over the word
 *
 * - **`split-discontinuity` against `reference-split-discontinuity`** — the
 *   SUBJECT's history against the BENCHMARK's. They refuse different
 *   securities and are repaired in different places, and a benchmark's break
 *   refuses every constituent of that sector at once.
 * - **`nothing-observed` against `no-aggregate-yet`** — *we have an aggregate
 *   and it counted nothing* against *we have no aggregate*. The first is a
 *   real measurement over a stated denominator; the second has no denominator
 *   to state.
 *
 * ## `no-distribution` deliberately does NOT reuse the ledger's own wording
 *
 * `apps/frontend/src/market/anomaly-score.ts` draws `no history to rank it` in
 * the composite ledger's ~34-character reason cell, and
 * `tool-volume-ratio.ts`'s own header says in terms that the honest sentence
 * has one home and it is not in the backend. That stands: this phrase is a
 * **different grammar for the same fact**, which is B1's per-string test
 * answering *do not move it* — the cell is a fragment inside a fixed column
 * and this is a clause inside a one-line claim with 72 characters to spend, so
 * it says what the ledger's budget could not (*stored*, which is the whole
 * point: the absence is a fact about this product's aggregates rather than
 * about this security's coverage).
 */
export const TOOL_REFUSAL_CLAIMS = {
  "nothing-observed": "nothing observed to measure",
  "not-tracked": "not a security we track",
  "no-earlier-endpoint": "no bar five minutes back",
  "no-basis": "no basis to measure a percentage against",
  "too-few-samples": "too little history to rank it",
  "split-discontinuity": "history crosses an unadjusted price break",
  "no-distribution": "no stored distribution to rank against",
  "reference-split-discontinuity":
    "the benchmark's history crosses a price break",
  "mixed-basis": "the two legs cover different minutes",
  "no-subject-move": "no five-minute move to compare",
  "no-reference-move": "the benchmark printed nothing to compare with",
  "no-aggregate-yet": "no aggregate computed in this process yet",
  "too-few-overlapping-samples": "too little shared history",
  "zero-variance": "one side's returns did not vary",
} satisfies Record<ToolRefusal, string>;

/**
 * **A refusal's whole claim** — the question that went unanswered, an em dash,
 * and the reason.
 *
 * `Volume rate — no stored distribution to rank against`. One clause, no
 * terminal stop, and **nothing it did not read**: no instant, no figure, no
 * raw-data reference (AC 9). The refusal word travels separately on
 * `UnevidencedFinding.because`, so a later surface can treat two refusals
 * differently without parsing this string.
 */
export const refusalClaim = (type: FindingType, refusal: ToolRefusal): string =>
  `${FINDING_SUBJECTS[type]} — ${TOOL_REFUSAL_CLAIMS[refusal]}`;

/**
 * **The breadth claim's own short grammar, built from the counted figures the
 * wire already carries.**
 *
 * `218 up, 236 down, 12 flat of 466 measured in the last 5 min`.
 *
 * ## It opens with the POPULATION and never with a ticker (AC 8)
 *
 * Breadth is a group fact — identical for every member of a group — and
 * `MarketBreadthReading` structurally cannot carry a security. The claim says
 * so by its grammar as well as by its type: a reader meets three counts and a
 * denominator, with nothing in the sentence that could be read as a verdict on
 * the security whose page this is.
 *
 * ## Counts, and the denominator is what the figure IS
 *
 * `WireBreadthCounts`' own rule, carried over: three independently-rounded
 * percentages do not sum to 100 and a percentage hides its denominator, which
 * here is *the part of the market we heard from in the last five minutes* — a
 * fact about our reach on IEX. So the claim states `measured` rather than a
 * share, and `0 up, 0 down, 0 flat of 0 measured…` is the **true** sentence on
 * CI's zero-bar store rather than a degraded one.
 *
 * ## The span is read off the frame, never spelled here
 *
 * `windowMinutes` is the producer's own figure and the session is the
 * producer's own `YYYY-MM-DD` — both for `spanMinutes`' recorded reason, that
 * a rollback can put a gateway and a bundle two values apart. The two bases
 * get two tails because they answer different questions with different
 * denominators, which is `WireMarketBreadth`'s own two-member argument
 * arriving in prose.
 *
 * `tracked` is deliberately **not** in the claim: `measured` is the
 * denominator the three counts partition, `tracked − measured` is *not heard
 * from*, and a 72-character line cannot carry two scales without a rule
 * between them. It travels on the event's own `TOOL_CALL_COMPLETED` outcome,
 * where a later surface can read it.
 */
export function breadthClaim(counts: WireMarketBreadth): string {
  const figures =
    `${formatCount(counts.advancing)} up, ` +
    `${formatCount(counts.declining)} down, ` +
    `${formatCount(counts.unchanged)} flat of ` +
    `${formatCount(counts.measured)} measured`;

  return counts.basis === "observed"
    ? `${figures} in the last ${String(counts.windowMinutes)} min`
    : `${figures} on ${counts.session}`;
}
