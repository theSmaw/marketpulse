import { asInstant } from "./wire-serialiser.js";

import type { StepId, ToolName, ToolRefusal } from "./investigation.js";
import type { Ticker } from "./ticker.js";
import type { JsonValue } from "./wire-serialiser.js";

/**
 * **A finding and its evidence** (`PRODUCT_SPEC.md` §15/§16, invariant 5) —
 * Story 7.3, Task 7.3.1.
 *
 * Every tool in Story 7.2 already produces a value. This module is what turns
 * a value into the object invariant 5 names: a **claim** with a **confidence
 * level**, carrying the **evidence** that licenses it — *"confidence and
 * provenance are part of the domain model, not prose"*.
 *
 * ## Why it is here and not in `investigation.ts`
 *
 * That module already holds three closed vocabularies, the step and
 * investigation lifecycles, the event union and the whole wire projection, at
 * ~850 lines. A fourth vocabulary with its own brand, its own two mint sites
 * and its own mapper is a module.
 *
 * ## Why it is in `packages/shared/src` — the purity argument, inherited
 *
 * `composite-score.ts`'s, verbatim in its consequences: `eslint.config.mjs`
 * scopes **four** clock rules to this directory and permits nothing at all
 * there. A `Finding` carries two instants — an observation's and a retrieval's
 * — and **both arrive as arguments**, the second on a {@link FindingStamp} the
 * orchestrator fills from its own injected clock. So there is no store, no
 * cache, no socket and no instant in this file, and Epic 13's replay mints the
 * same finding for the same answers with no second code path.
 *
 * ## Two arms that differ in SHAPE, never in a nullable field
 *
 * {@link EvidencedFinding} carries `evidence: readonly [Evidence,
 * ...Evidence[]]`, so **an evidence-less evidenced finding is untypeable** —
 * AC 2's *cannot be constructed without at least one evidence item*, as a
 * compile error rather than a test. {@link UnevidencedFinding} has **no
 * `evidence` member at all**, never `evidence: []`: an empty array is a
 * constant and a branch away from the defect this type exists to forbid, and a
 * surface that read `.length` off it would draw *no evidence gathered* for a
 * refusal that gathered nothing because there was nothing to gather. Its
 * `confidence` is the **literal** `"UNKNOWN"` rather than {@link Confidence},
 * which makes AC 3's rule — *a refused outcome always produces
 * `UNKNOWN`* — a type-level statement.
 *
 * `AnomalyScore`/`UnscoredAnomaly`'s shape exactly, including the real-symbol
 * brand and exactly two exported mint sites, held by `pnpm invariants`'
 * `two-mint-sites-for-a-finding` with the break
 * `a-third-mint-site-for-a-finding`.
 *
 * ## There is no `security` field on either arm
 *
 * Settled at Story 7.3's Gate 1: the subject is already named by the
 * investigation's own `subjectSymbols`, by the route and by the identity block
 * a few centimetres up the page, so a claim omits the investigated ticker.
 * {@link Evidence.security} is the one per-security home, **absent** for
 * breadth — which is AC 8 (*the breadth finding carries no `security` field at
 * all*) held more strongly than its own wording asks: a four-arm union
 * discriminated on `type` is not needed, because no finding anywhere carries
 * one.
 *
 * ## The brand dies at `JSON.parse` and is NEVER restored, and this is the one
 * ## place the `composite-score.ts` analogy breaks
 *
 * `JSON.stringify` drops symbol keys, so a finding that has crossed a socket
 * carries no brand. `composite-score.ts` answers that with `readAnomalyScore`,
 * a second mint site that re-adds the published contributions and refuses an
 * explanation that does not sum to its own score. **There is no `readFinding`
 * here and there must not be one.** The browser declares its own wire shape
 * (`apps/frontend/src/investigations/investigation-event.ts`, which describes
 * JSON rather than the domain) and reads three fields off it — `stepId`,
 * `claim`, `confidence` — never reconstituting a domain `Finding`. So AC 2's
 * guarantee is a **backend** guarantee, and it is stated plainly here so
 * nobody over-trusts it: nothing in this type system stops a browser drawing a
 * claim whose evidence never arrived. What stops that is the wire carrying the
 * evidence **inline** on the same event (Gate 1's decision) rather than a
 * reference to an `EVIDENCE_ADDED` that may not have been sent.
 *
 * ## What the brand does NOT prove
 *
 * `composite-score.ts`'s own sentence, because a claimed mechanism that is
 * really prose is this repository's most-recorded failure mode. TypeScript
 * cannot prove that a claim **matches** the evidence beside it. The brand is a
 * compile error about **which module minted the value**; that the claim states
 * the figure the evidence was read from is a **test** — each tool's own
 * `toFinding` suite, and the pairwise-distinctness assertion AC 10 asks for —
 * and nothing more. Two halves, and they are not the same half.
 * `finding.test.ts` holds that as a named test rather than a comment.
 */

/**
 * **The six kinds of claim this pipeline can make, one per step — named for
 * the QUESTION ASKED rather than for the tool that answers it.**
 *
 * The distinction is not cosmetic and the docblock says so because the map
 * below invites the opposite reading: {@link FINDING_TYPE_FOR_TOOL} is 1:1
 * today and is **not** a permanent property. Epic 10's model-driven
 * orchestration can ask one question with two tools, or one tool twice with
 * different inputs, and the claim's kind is a fact about the question either
 * way.
 *
 * Five of the six are this product's own shipped words:
 *
 * - `PRICE_MOVE` — the five-minute return and where it sits in its own
 *   history.
 * - `VOLUME_RATE` — a **rate**, `Σvolume / spanMinutes`, which is ADR 0045's
 *   own decision about what that quantity is; never `VOLUME_RATIO`, which
 *   would name the arithmetic rather than the quantity.
 * - `RELATIVE_MOVE` — `PRODUCT_SPEC.md` §15's own value, verbatim, rather
 *   than a synonym for it.
 * - `MARKET_BREADTH` — the counts, over the tracked equities.
 * - `RETURN_CORRELATION` — this product's shipped word for that arithmetic
 *   (the topology edge kind, the `return_correlations` table), never a new
 *   spelling.
 *
 * **`PRICE_OBSERVATION` is the sixth and was settled over `LATEST_PRICE`**
 * (Task 7.3.1). The other five name a **quantity** with no freshness
 * adjective, and freshness in this product has exactly one home — the status
 * bar's `LIVE`/`STALE`/`DISCONNECTED` cell, which `pnpm invariants` refuses a
 * second of. `LATEST_` would be a claim kind whose name asserts a currency the
 * claim itself does not state and the step cannot guarantee.
 */
export const FINDING_TYPES = [
  "PRICE_OBSERVATION",
  "PRICE_MOVE",
  "VOLUME_RATE",
  "RELATIVE_MOVE",
  "MARKET_BREADTH",
  "RETURN_CORRELATION",
] as const;

/** One of {@link FINDING_TYPES}. */
export type FindingType = (typeof FINDING_TYPES)[number];

/**
 * **Which claim kind each tool's step produces** — `satisfies Record<ToolName,
 * FindingType>`, so a **seventh tool is a compile error here** until it
 * declares its own claim kind.
 *
 * Task 7.2.7's own guard going blind at the fifth tool is the precedent this
 * is written against: a check keyed on a count, or a map with an index
 * signature, is green on the tool nobody added it for. A total record over the
 * shared vocabulary is the one shape that cannot be forgotten.
 *
 * It is **not** read to build a claim. Each tool's own `toFinding` names its
 * type at the mint, from its own typed `Output`; this map exists so the
 * totality is checkable and so a reader can see the six questions in one
 * place.
 */
export const FINDING_TYPE_FOR_TOOL = {
  get_security_snapshot: "PRICE_OBSERVATION",
  calculate_return_percentile: "PRICE_MOVE",
  calculate_volume_ratio: "VOLUME_RATE",
  compare_securities: "RELATIVE_MOVE",
  get_market_breadth: "MARKET_BREADTH",
  calculate_rolling_correlation: "RETURN_CORRELATION",
} satisfies Record<ToolName, FindingType>;

/**
 * **How well evidenced a claim is — invariant 5's own four words, all four
 * shipped now.**
 *
 * `CONFIRMED` has **no producer anywhere in this epic** and that is a
 * decision rather than an omission, taken at Story 7.3's Gate 1 and
 * documented here exactly as `INVESTIGATION_STATUSES`' `awaiting_user`
 * already is: it is reserved for a finding corroborated against a
 * **primary source**, which is Epic 9's SEC filings. Shipping the word now
 * keeps the vocabulary whole on the wire and in the type, so the epic that
 * produces one widens no union.
 *
 * The other three are a **stated function of the reading's own counted
 * evidence**, never a per-tool judgement — see each tool's own `toFinding`:
 * `refused` → `UNKNOWN` always; `ok` below the tool's own shipped sufficiency
 * floor → `POSSIBLE`; `ok` above it → `SUPPORTED`. An `inapplicable` outcome
 * produces **no finding at all**, because *the question does not arise* is a
 * different, permanent fact from *not enough evidence* and the two must not
 * collapse onto one word.
 *
 * **Ordered strongest first**, which is the order a surface may rely on.
 */
export const CONFIDENCE_LEVELS = [
  "CONFIRMED",
  "SUPPORTED",
  "POSSIBLE",
  "UNKNOWN",
] as const;

/** One of {@link CONFIDENCE_LEVELS}. */
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/**
 * **The two kinds of evidence this story can actually produce, and the other
 * six §16 names stay undeclared.**
 *
 * ADR 0029's rule arriving at a vocabulary: a declared member with no producer
 * is a fully-formed record about nothing, and a surface switching on it would
 * have a branch nobody has ever seen render. So the condition for each absent
 * word is named here rather than the word being shipped empty:
 *
 * - `sec_filing` — the first tool that reads EDGAR (Epic 9).
 * - `news_item` — never in V1; news aggregation is out of scope by name.
 * - `price_series` — the first evidence item whose raw-data reference is a
 *   **window** of bars rather than a single read. Today's observations are
 *   one bar or one aggregate.
 * - `peer_comparison` — the first evidence item about a **pair** that is not
 *   already a calculated metric over one. `compare_securities`' excess is a
 *   metric, and the pair it was taken over is in its own `rawData`.
 * - `insider_transaction` / `institutional_holding` — the first filings tool
 *   that reads a Form 4 or a 13F (Epic 9), and each needs the other's
 *   absence to stay meaningful.
 *
 * **`market_observation`** is something we READ — a bar, an aggregate — and
 * carries an `observedAt`. **`calculated_metric`** is something we COMPUTED
 * from reads, and carries a `method`. The two differ in which optional field
 * is present, and that is a property of the producer rather than of this type,
 * because `exactOptionalPropertyTypes` cannot express *present exactly when
 * the kind is this* without splitting the union — which would be a second
 * discriminant for one fact.
 */
export const EVIDENCE_KINDS = [
  "market_observation",
  "calculated_metric",
] as const;

/** One of {@link EVIDENCE_KINDS}. */
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/**
 * **One item of evidence** — `PRODUCT_SPEC.md` §16's own required fields, as a
 * type rather than as prose.
 *
 * `observedAt` is **absent** rather than `undefined` where there is no
 * observation, which under `exactOptionalPropertyTypes` are different types:
 * ADR 0029's *a claim about data requires data* at the field level, and AC 1's
 * own wording. A refusal's finding has no `Evidence` at all, so the absence
 * here is for the narrower case — a metric computed over stored rows, where
 * the thing we hold is a window rather than an instant.
 */
export interface Evidence {
  readonly kind: EvidenceKind;
  /**
   * **Where it came from** — invariant 6's field, and the feed is named rather
   * than implied. `"alpaca:iex"` for a live observation, `"alpaca:sip"` for a
   * stored one, `"market-overview-pass"` for the one retained aggregate.
   */
  readonly source: string;
  /** **When it was true in the market.** Absent where there is no single
   * instant to name — never `undefined`, and never fabricated. */
  readonly observedAt?: Date;
  /**
   * **When this process recorded the claim** — stamped by the orchestrator at
   * the moment it emits `FINDING_CREATED`, never supplied by a tool and never
   * read inside this package.
   *
   * Story 7.3's Gate 1 rejected `retrievedAt = asOf`, which **lies in
   * replay**: it would claim a past figure was retrieved on the day it
   * happened. What this field means is bounded by the step's own already-
   * published `durationMs` — honest and checkable rather than falsely
   * precise.
   */
  readonly retrievedAt: Date;
  /** The named calculation, where there was one — `"pearsonCorrelation"`.
   * Absent for a plain read. */
  readonly method?: string;
  /** The security this item concerns. **Absent for a group fact** — breadth is
   * a count over the tracked equities and has no subject. */
  readonly security?: Ticker;
  /**
   * **A REFERENCE to the read, never a copy of the figure** — `"current-
   * market-state:NVDA"`, `"return_baselines:NVDA"`.
   *
   * §16 asks for a raw-data reference and this is the whole of it. A copy of
   * the value would be a second home for a figure the claim already states,
   * and the two could disagree with nothing on screen saying which is right.
   */
  readonly rawData: string;
}

/**
 * **What a tool supplies for one evidence item: everything but the stamp.**
 *
 * `retrievedAt` is deliberately not in here. It does not exist when a tool's
 * `run` returns — it is the instant the orchestrator later stamps, at emission
 * — so a tool that could supply one would have to read a clock, which
 * `a-tool-reads-no-clock` forbids and which is the whole reason the mint takes
 * a {@link FindingStamp}.
 *
 * An `Omit` rather than a parallel interface, so a field added to
 * {@link Evidence} is carried here without a second declaration to keep in
 * step — and under `exactOptionalPropertyTypes` the optionality survives the
 * `Omit`, which is what keeps *absent* and *present as `undefined`* different
 * types on the way in as well as out.
 */
export type EvidenceFacts = Omit<Evidence, "retrievedAt">;

/** Opaque, server-minted — `InvestigationId`/`StepId`'s own shape. */
export type FindingId = string & { readonly __brand: "FindingId" };

/** The one place a {@link FindingId} is minted from a bare string. */
export const toFindingId = (value: string): FindingId => value as FindingId;

/**
 * **What the orchestrator supplies at the mint, and the whole of it.**
 *
 * Three fields, and the absences are as deliberate as the members.
 *
 * **There is no `evidenceId` generator**, which Task 7.3.1's own shaping
 * corrected: nothing in this story addresses an evidence item by id, because
 * `EVIDENCE_ADDED` is not emitted and the items travel inline on their
 * finding. A field with no reader is ADR 0029's own subject, and Epic 8 adds
 * one beside the pinning that needs it.
 *
 * **`retrievedAt` is the orchestrator's own injected clock** — the one line in
 * this product that legitimately reads the real one
 * (`scripted-agent-provider.ts`'s `now`) — read at the instant
 * `FINDING_CREATED` is appended, which is after the step's `completedAt` is
 * known. That ordering is why the tool contract hands back a **thunk**
 * (`ToolRun.mintFinding`) rather than a finished finding: the stamp does not
 * exist when `run` returns.
 */
export interface FindingStamp {
  readonly findingId: FindingId;
  readonly stepId: StepId;
  readonly retrievedAt: Date;
}

/**
 * **A real symbol rather than a `declare const`, and the difference is
 * load-bearing** — `composite-score.ts`'s own argument, produced there rather
 * than reasoned about.
 *
 * A branded **object** has to be *constructed*, and a `declare`d symbol has no
 * runtime value — so `[brand]: …` would be a `ReferenceError` and the only way
 * to mint would be `as unknown as`, a type assertion that **checks none of the
 * fields beside it**. With a real symbol the mint is an ordinary **checked**
 * object construction — a missing or mistyped field is a compile error naming
 * it — and the brand is still unforgeable outside this module, because the
 * symbol is not exported.
 */
const brand = Symbol("finding");

/** What both arms carry. Never minted on its own — see the two arms. */
interface FindingFacts {
  readonly id: FindingId;
  /** Which step produced it. **The one home for that fact** — the
   * `FINDING_CREATED` envelope deliberately carries no second copy. */
  readonly stepId: StepId;
  readonly type: FindingType;
  /**
   * **One clause, past tense, the figure and its denominator stated, no
   * verdict adjective and no terminal stop** — the claim voice Story 7.3's
   * Gate 1 settled, and the investigated ticker is omitted.
   *
   * Bounded by {@link CLAIM_CEILING}, enforced in each tool's own unit tests
   * rather than thrown here — see that constant.
   */
  readonly claim: string;
}

/**
 * **A claim with the evidence that licenses it.**
 *
 * `evidence` is `[Evidence, ...Evidence[]]`, so this type **cannot be
 * constructed with no evidence** — AC 2 as a compile error. A step that
 * gathered nothing is {@link UnevidencedFinding}, which is a different type
 * with no `evidence` member at all.
 */
export interface EvidencedFinding extends FindingFacts {
  readonly evidenced: true;
  readonly confidence: Confidence;
  readonly evidence: readonly [Evidence, ...Evidence[]];
  readonly [brand]: "EvidencedFinding";
}

/**
 * **A refusal's finding: the word it answered with, and no evidence member at
 * all.**
 *
 * Never `evidence: []`. An empty array is a constant and a branch away from
 * the defect the type above exists to forbid, and a surface reading `.length`
 * off one would draw *no evidence gathered* — which is true and useless — for
 * a step that gathered nothing because there was nothing to gather.
 *
 * `confidence` is the **literal** `"UNKNOWN"` rather than {@link Confidence},
 * which is AC 3's rule stated in the type: a refused outcome cannot be minted
 * as anything else.
 */
export interface UnevidencedFinding extends FindingFacts {
  readonly evidenced: false;
  readonly confidence: "UNKNOWN";
  /**
   * **The refusal word, verbatim from the tool's own vocabulary** — never a
   * sentence and never a thrown message. The sentence is the `claim` above,
   * built once in `finding-claim.ts`; this is the machine-readable half, so a
   * later surface can treat `too-few-samples` differently from
   * `split-discontinuity` without parsing prose.
   */
  readonly because: ToolRefusal;
  readonly [brand]: "UnevidencedFinding";
}

/** A claim with its evidence, or a claim with the refusal it answered. */
export type Finding = EvidencedFinding | UnevidencedFinding;

/**
 * **How long a claim may be: 72 characters.**
 *
 * ## Why a ceiling at all
 *
 * AC 6: the claim is a second line inside a checklist row, drawn at every
 * width down to 390 with **no truncation and no narrow-width hiding** — so the
 * bound has to be fixed at the mint rather than enforced by CSS, which is the
 * composite ledger's own ≤24-character absence reason one surface over.
 *
 * ## Where 72 comes from, and the part that is NOT measured
 *
 * It is the **longest claim the six shipped `toFinding` functions can
 * produce**, rounded up to the next multiple of eight — `MARKET_BREADTH`'s
 * session grammar at a four-digit population (`1,048 up, 1,048 down, 1,048
 * flat of 3,144 measured on 2026-09-11` is longer than the universe can reach;
 * at this product's own 501 equities it is 51). Each tool's own suite asserts
 * its claims against this constant, on every arm it can reach, which is what
 * makes the bound a measurement of the producers rather than a guess.
 *
 * **It is NOT the probe measurement AC 6 asks for, and that is recorded rather
 * than quietly substituted.** That criterion wants the ceiling taken from
 * `pnpm probe` against a **zero-bar store** at all four widths — refusal
 * claims are the longest sentences this product draws, so the empty store is
 * the worst case rather than an edge case — and the surface that can be probed
 * is Task 7.3.2's real two-line grid rather than this task's deliberately
 * unstyled `<p>`. Task 7.3.1's record and `docs/GAPS.md` carry it as owed.
 *
 * **Reversal trigger, a condition:** the first probe of a drawn claim at 390
 * that wraps to a third line, or the first claim a tool wants to mint that
 * this constant refuses — at which point the figure comes from that
 * measurement rather than from the producers.
 */
export const CLAIM_CEILING = 72;

/**
 * **The first of exactly two mint sites.**
 *
 * `scoreAnomaly`'s shape: one argument carrying the facts, one carrying the
 * stamp, and the brand written as a key so the construction is **checked** by
 * the compiler rather than asserted past it.
 *
 * The evidence tuple's non-emptiness is the caller's to satisfy and the
 * compiler's to enforce — this function cannot widen it, which is the point.
 * `retrievedAt` is written onto every item from the one stamp, so a finding's
 * items cannot disagree about when this process recorded the claim.
 *
 * **Nothing here validates that the claim matches the evidence**, and the
 * module header says why in full: the brand is a compile error about which
 * module minted the value, and the match is a test.
 */
export function createEvidencedFinding(
  facts: {
    readonly type: FindingType;
    readonly claim: string;
    readonly confidence: Confidence;
    readonly evidence: readonly [EvidenceFacts, ...EvidenceFacts[]];
  },
  stamp: FindingStamp,
): EvidencedFinding {
  const [head, ...rest] = facts.evidence;

  return {
    evidenced: true,
    id: stamp.findingId,
    stepId: stamp.stepId,
    type: facts.type,
    claim: facts.claim,
    confidence: facts.confidence,
    evidence: [
      withStamp(head, stamp.retrievedAt),
      ...rest.map((item) => withStamp(item, stamp.retrievedAt)),
    ],
    // **The mint.** `brand` is in scope only in this module, so this is a
    // checked object construction rather than a type assertion — every field
    // is validated by the compiler, which a cast would have skipped.
    [brand]: "EvidencedFinding",
  };
}

/**
 * **The second and last mint site** — a refusal's finding.
 *
 * It takes no `confidence`, because there is only one it could be: AC 3's rule
 * lives in {@link UnevidencedFinding}'s own literal type, and a parameter here
 * would be a second place to decide a thing that is not a decision.
 *
 * It takes no evidence either, and cannot: the type has no member for it. A
 * refusal's claim **names the read that refused and carries nothing it did not
 * actually read** (AC 9) — no fabricated `observedAt`, no invented figure, no
 * `rawData` reference to something nobody looked at.
 */
export function createUnevidencedFinding(
  facts: {
    readonly type: FindingType;
    readonly claim: string;
    readonly because: ToolRefusal;
  },
  stamp: FindingStamp,
): UnevidencedFinding {
  return {
    evidenced: false,
    id: stamp.findingId,
    stepId: stamp.stepId,
    type: facts.type,
    claim: facts.claim,
    confidence: "UNKNOWN",
    because: facts.because,
    [brand]: "UnevidencedFinding",
  };
}

/** One item with the orchestrator's instant written onto it. Two branches
 * rather than a spread of a possibly-`undefined` value, because
 * `exactOptionalPropertyTypes` makes *absent* and *present as `undefined`*
 * different types and the whole point of `observedAt?` is the first one. */
function withStamp(facts: EvidenceFacts, retrievedAt: Date): Evidence {
  return {
    kind: facts.kind,
    source: facts.source,
    ...(facts.observedAt === undefined ? {} : { observedAt: facts.observedAt }),
    retrievedAt,
    ...(facts.method === undefined ? {} : { method: facts.method }),
    ...(facts.security === undefined ? {} : { security: facts.security }),
    rawData: facts.rawData,
  };
}

/**
 * **One evidence item as it crosses the wire** — field by field, never a
 * spread.
 *
 * An absent optional stays absent rather than becoming a `null`, which is ADR
 * 0029 at the field level: a `null` `observedAt` is a fully-formed answer to a
 * question nobody could answer.
 */
function evidenceToWire(item: Evidence): Readonly<Record<string, JsonValue>> {
  return {
    kind: item.kind,
    source: item.source,
    ...(item.observedAt === undefined
      ? {}
      : { observedAt: asInstant(item.observedAt) }),
    retrievedAt: asInstant(item.retrievedAt),
    ...(item.method === undefined ? {} : { method: item.method }),
    ...(item.security === undefined ? {} : { security: item.security }),
    rawData: item.rawData,
  };
}

/**
 * **The finding as it crosses the wire — a HAND-WRITTEN, field-by-field
 * mapper, and neither of the two obvious alternatives.**
 *
 * **Not a named `WireFinding` interface.** `WireFields<T>` constrains its
 * subject to something with an index signature; an interface has none, so the
 * map would not typecheck against it and the next reader's repair is a cast.
 *
 * **And emphatically not `WireFields<Finding>`.** That is a mapped type over
 * `keyof` a **union**, which is its members' *intersection* — so
 * `evidence`/`because` would pass through unexamined, which is the leak this
 * idiom exists to close (`toWireStep`'s own five-map argument). Worse, the
 * brand's symbol key is part of `keyof EvidencedFinding`: the map would
 * **require** an entry for it, the entry would typecheck, and `toWire`'s
 * `Object.keys` walk would **never read it** — so nothing would be wrong on
 * the type and the finding would silently never encode at all. That is
 * `composite-score.ts`'s `toWireAnomalyScore` finding, met one type over.
 *
 * `evidenced` travels as the discriminant so a browser that decodes only part
 * of this shape can still tell the two arms apart without inferring it from
 * which field is present.
 */
export function toWireFinding(
  finding: Finding,
): Readonly<Record<string, JsonValue>> {
  if (!finding.evidenced) {
    return {
      evidenced: false,
      id: finding.id,
      stepId: finding.stepId,
      type: finding.type,
      claim: finding.claim,
      confidence: finding.confidence,
      because: finding.because,
    };
  }

  return {
    evidenced: true,
    id: finding.id,
    stepId: finding.stepId,
    type: finding.type,
    claim: finding.claim,
    confidence: finding.confidence,
    evidence: finding.evidence.map(evidenceToWire),
  };
}
