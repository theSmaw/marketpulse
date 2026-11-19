import { asInstant, asIs, toWire } from "./wire-serialiser.js";
import type { JsonValue, WireFields } from "./wire-serialiser.js";
import type {
  ExcessFactorRefusal,
  ExcessMoveInapplicability,
} from "./excess-move.js";
import type { PercentileRefusal } from "./return-baseline.js";
import type { Ticker } from "./ticker.js";

/**
 * The investigation engine's own domain model (`PRODUCT_SPEC.md` §13/§14),
 * and the two things Story 7.1's own Gate 1 shaping found wrong in this
 * story's first draft before any of it was built.
 *
 * **`Investigation` and `Step` are two SEPARATE status vocabularies, never
 * one shared union.** `queued` exists only on a `Step`; `awaiting_user`
 * exists only on an `Investigation`. A shared type would let a `Step` be
 * `awaiting_user` and an `Investigation` be `queued`, neither of which this
 * product means — found by this story's own business-analyst shaping pass,
 * reading §13 and §14 as two tables rather than one.
 *
 * **A tool never throws; it refuses.** `ToolOutcome<T>` is a closed,
 * two-member union (`ok` / `refused`) rather than a function that can throw
 * — invariant 5's "not enough evidence" is a first-class outcome, and a
 * thrown error is not a value a `TOOL_CALL_COMPLETED` event can carry
 * honestly.
 *
 * **Amended 2026-11-19 (Task 7.2.4): the union has THREE members, and the
 * sentence above is otherwise unchanged.** The *no-thrown-path* half is the
 * load-bearing half and it is still true — nothing was added that a tool can
 * throw. What changed is the count: `inapplicable` joined `ok` and `refused`
 * because *the question does not arise* is a third claim this product had
 * already decided differs in shape (`packages/shared/src/excess-move.ts`
 * chose the word, over four others, in Story 5.6). The arity is corrected
 * here rather than the paragraph rewritten, because the paragraph's own
 * subject is the absence of a throw and not the number of arms.
 */

// --------------------------------------------------------------- lifecycle

/** `PRODUCT_SPEC.md` §13. Only `running` → `completed` is reachable from
 * Story 7.1; `failed`/`cancelled` arrive at Story 7.5; `awaiting_user` has
 * no producer anywhere in this epic and may never gain one — nothing in a
 * deterministic pipeline asks a reader a mid-run question. */
export const INVESTIGATION_STATUSES = [
  "running",
  "awaiting_user",
  "completed",
  "failed",
  "cancelled",
] as const;

export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

/** `PRODUCT_SPEC.md` §14. A `Step`'s own, separate vocabulary — `queued`
 * is reachable only here, never on an `Investigation`. */
export const STEP_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type StepStatus = (typeof STEP_STATUSES)[number];

/**
 * A trivial totality-checked label, so adding or removing a status is a
 * compile error for whoever presents it — the `satisfies Record<keyof T,
 * …>` idiom this repository already uses for a response schema, applied
 * to a status vocabulary. Task 7.1.4's real presenter (the checklist's
 * glyph/treatment map) is checked the same way; this stub exists so that
 * guarantee is proven here, before any UI reads either vocabulary.
 */
export const INVESTIGATION_STATUS_LABEL = {
  running: "Running",
  awaiting_user: "Awaiting input",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
} satisfies Record<InvestigationStatus, string>;

export const STEP_STATUS_LABEL = {
  queued: "Queued",
  running: "Running",
  completed: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
} satisfies Record<StepStatus, string>;

/** `"replay"` exists in the type from this story on so invariant 4's own
 * seam (temporal isolation structural rather than instructed) has
 * somewhere to land the day Epic 13 calls it — nothing in this epic
 * produces a `"replay"` investigation. */
export type InvestigationMode = "live" | "replay";

// -------------------------------------------------------------------- ids

/** Opaque, server-minted — never a symbol, never derived from a symbol.
 * `subjectSymbols` is a list even in this story, because a future tool
 * (Story 7.4's peer comparison) can have more than one subject, and an
 * id keyed on the first symbol would already be wrong the day that
 * lands. */
export type InvestigationId = string & { readonly __brand: "InvestigationId" };

export type StepId = string & { readonly __brand: "StepId" };

/** The one place either id is minted from a bare string — every other
 * file receives one, never constructs one from a literal. */
export const toInvestigationId = (value: string): InvestigationId =>
  value as InvestigationId;

export const toStepId = (value: string): StepId => value as StepId;

// --------------------------------------------------------------- the tool

/** The tool vocabulary, closed and shared so the frontend can render a
 * step's own tool name without inventing a second list. Extended by each
 * later tool story, never re-spelled. */
export const TOOL_NAMES = [
  "get_security_snapshot",
  // Story 7.2's price-anomaly step (Task 7.2.2) — `returnPercentileOf` read
  // through the tool contract. Named for the arithmetic it wraps rather than
  // for the checklist sentence it draws (`Measure price anomaly`), which is a
  // separate field for a separate reader.
  "calculate_return_percentile",
  // Story 7.2's volume-anomaly step (Task 7.2.3) — `volumeFactorAnswer()`
  // read through the tool contract. Named for the figure it would carry
  // rather than for the refusal it always answers: the name is the question
  // asked, and the answer is `no-distribution` on every store that exists.
  "calculate_volume_ratio",
  // Story 7.2's peer-comparison step (Task 7.2.4) — `excessMoveFactor` read
  // through the tool contract. Named for the comparison it performs rather
  // than for the checklist sentence it draws (`Compare against sector
  // benchmark`), which is deliberately NOT the epic's own "compare peers":
  // the shipped arithmetic is a comparison against the capitalisation-
  // weighted sector SPDR, and *peers* promises an unweighted peer median
  // this product does not compute (Story 5.6's own Gate 1 rejected it).
  "compare_securities",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

/** Why a tool answered "not enough evidence" rather than a figure —
 * invariant 5's first-class outcome, named rather than thrown.
 * `nothing-observed`: the security is tracked but has no current
 * observation (property 3 of `current-market-state.ts`'s own hand-off —
 * CI's permanent state). `not-tracked`: the security is not a member of
 * the curated universe at all (e.g. `PSKY`/`WBD`) — a genuinely different
 * check from the first, and the two must not share one answer.
 *
 * **Widened by Task 7.2.2 with words this product already owns, never with
 * synonyms for them.** `calculate_return_percentile` has two halves that
 * refuse for unrelated reasons — a NUMERATOR (is there a 5-minute move to
 * rank: `five-minute-return.ts`'s `ReturnRefusal`) and a DENOMINATOR (is
 * there a baseline to rank it against: `PERCENTILE_REFUSALS`) — and
 * collapsing them would say one sentence for a silent security and an
 * under-sampled one, which are different facts with different repairs. So
 * this list is the union of the vocabularies the owning modules export, each
 * spelled exactly as they spell it:
 *
 * - `no-earlier-endpoint` / `no-basis` — `ReturnRefusal`'s other two members
 *   (`nothing-observed` it already shared with this list).
 * - `too-few-samples` / `split-discontinuity` — `PERCENTILE_REFUSALS`, whole.
 *
 * {@link PercentileRefusalIsAToolRefusal} is the structural half on the one
 * vocabulary that lives in this package: a third member of
 * `PERCENTILE_REFUSALS` is a compile error here rather than a refusal a tool
 * cannot name. `ReturnRefusal` lives in the backend, so its own assertion
 * lives beside the tool that reads it (`tool-return-percentile.ts`).
 *
 * **Widened again by Task 7.2.3, with one more word this product already
 * owns.** `no-distribution` is `FACTOR_ANSWER_STATES`' own member, reused
 * verbatim by `calculate_volume_ratio` — and it is a third kind of claim
 * rather than a synonym for either word above it: `refused` is *we will not
 * answer, a backfill may change it*, `inapplicable` is *the question does not
 * arise*, and this is *the figure exists and the history to rank it against
 * does not* — a fact about this product's stored aggregates
 * (`0015_volume_baselines.sql` holds a median and a dispersion, never a
 * distribution) rather than about any one security's coverage. The day a
 * distribution is stored, the word leaves this list with the arm that
 * produces it.
 *
 * **Widened again by Task 7.2.4 with `EXCESS_FACTOR_REFUSALS`' own four
 * remaining words, each spelled exactly as `excess-move.ts` spells it** —
 * `compare_securities` reads that vocabulary verbatim rather than collapsing
 * it, and two of the four are the pair that must never merge:
 *
 * - `reference-split-discontinuity` — **the benchmark's** history crosses a
 *   price break. A separate word from `split-discontinuity` (**the
 *   subject's**) because the two refuse different securities and are
 *   repaired in different places: one is about the thing on screen, the
 *   other refuses every constituent of that sector at once.
 * - `mixed-basis` — the two legs were measured over different five minutes.
 * - `no-subject-move` / `no-reference-move` — one leg had no five-minute
 *   return at all, and the second is the one the whole numerator rests on: a
 *   benchmark that printed nothing has **not** been flat.
 *
 * {@link ExcessFactorRefusalIsAToolRefusal} is the structural half, exactly
 * as `PercentileRefusalIsAToolRefusal` is for the price factor's. */
export const TOOL_REFUSALS = [
  "nothing-observed",
  "not-tracked",
  "no-earlier-endpoint",
  "no-basis",
  "too-few-samples",
  "split-discontinuity",
  "no-distribution",
  "reference-split-discontinuity",
  "mixed-basis",
  "no-subject-move",
  "no-reference-move",
] as const;

export type ToolRefusal = (typeof TOOL_REFUSALS)[number];

/**
 * **Why a tool's question does not arise at all — a closed vocabulary beside
 * {@link TOOL_REFUSALS} rather than three more members of it** (Task 7.2.4).
 *
 * A refusal promises that something might one day produce a figure: a
 * backfill, a nightly generation, a repair. These do not. No amount of
 * waiting gives a broad-market fund a sector, and no pass will ever compute
 * `XLK`'s move against its own sector's benchmark, because that benchmark is
 * `XLK`. `packages/shared/src/excess-move.ts` chose the word `inapplicable`
 * over four others (*not applicable*, *unavailable*, *exempt*, *undefined*)
 * and the whole argument is there; what is here is the same vocabulary
 * reaching the tool contract.
 *
 * - `no-sector` — an `index_etf` has `sector: null`. **4 of 516** today.
 * - `is-benchmark` — a `sector_etf` **is** the fund its own sector is
 *   measured against. **11 of 516** today.
 * - `is-the-market-proxy` — the subject **is** the proxy a correlation would
 *   be measured against, so `r = 1` is vacuous. Story 7.2's Gate 1 settled
 *   that this is `SPY` **only**: `QQQ`/`DIA`/`IWM` against `SPY` is a real,
 *   if unsurprising, measurement. Minted here rather than in
 *   `excess-move.ts`, because it is not an excess-move word — it belongs to
 *   `calculate_rolling_correlation` (Task 7.2.6), which reuses this union
 *   unchanged rather than deriving its own shape.
 */
export const TOOL_INAPPLICABILITIES = [
  "no-sector",
  "is-benchmark",
  "is-the-market-proxy",
] as const;

export type ToolInapplicability = (typeof TOOL_INAPPLICABILITIES)[number];

/**
 * Every percentile refusal is a tool refusal. **A type-level assertion rather
 * than a test** — `PercentileRefusalIsASuperset`'s own mechanism, one layer
 * further out: widening `PERCENTILE_REFUSALS` without widening
 * {@link TOOL_REFUSALS} fails `tsc -b`, which is the only thing that cannot
 * be forgotten.
 */
export type PercentileRefusalIsAToolRefusal =
  PercentileRefusal extends ToolRefusal ? true : never;

/** Satisfied only while the assertion above holds. */
export const TOOL_REFUSALS_COVER_THE_PERCENTILE_ONES: PercentileRefusalIsAToolRefusal = true;

/**
 * Every excess-move factor refusal is a tool refusal — the same mechanism
 * one vocabulary over (Task 7.2.4). A seventh member of
 * `EXCESS_FACTOR_REFUSALS` fails `tsc -b` here rather than reaching
 * `compare_securities`' `run` as a word the outcome union cannot carry.
 */
export type ExcessFactorRefusalIsAToolRefusal =
  ExcessFactorRefusal extends ToolRefusal ? true : never;

/** Satisfied only while the assertion above holds. */
export const TOOL_REFUSALS_COVER_THE_EXCESS_ONES: ExcessFactorRefusalIsAToolRefusal = true;

/**
 * Every excess-move inapplicability is a tool inapplicability. **The free
 * half of Task 7.2.4's decision**: a fourth word in
 * `EXCESS_MOVE_INAPPLICABILITIES` is a compile error here rather than a word
 * a tool cannot name — which is the same failure mode, one union over, as
 * the refusal assertions above.
 */
export type ExcessMoveInapplicabilityIsAToolInapplicability =
  ExcessMoveInapplicability extends ToolInapplicability ? true : never;

/** Satisfied only while the assertion above holds. */
export const TOOL_INAPPLICABILITIES_COVER_THE_EXCESS_ONES: ExcessMoveInapplicabilityIsAToolInapplicability = true;

/**
 * **The two vocabularies can never share a word**, which is the assertion
 * that makes the distinction below worth having at all: *we will not answer
 * yet* and *the question does not arise* are different claims, and a word
 * carried by both would let a surface print either sentence for it with
 * nothing saying which is right. The tuple wrapping is deliberate — a naked
 * conditional over a union distributes, and `[X] extends [never]` is the one
 * form that asks the question about the whole intersection.
 */
export type ToolRefusalsAndInapplicabilitiesAreDisjoint = [
  Extract<ToolRefusal, ToolInapplicability>,
] extends [never]
  ? true
  : never;

/** Satisfied only while the assertion above holds. */
export const THE_TWO_TOOL_VOCABULARIES_ARE_DISJOINT: ToolRefusalsAndInapplicabilitiesAreDisjoint = true;

/**
 * A tool's result. **Three members, and no fourth "thrown" path exists in
 * the type** — the shape every later tool's own story is checked against.
 *
 * **`inapplicable` arrived 2026-11-19 (Task 7.2.4), additively**: every
 * existing `kind: "ok" | "refused"` call site stays correct, because nothing
 * was removed and nothing changed shape. Two details of it are decisions
 * rather than style:
 *
 * - **The field is `because`, never `reason`.** It mirrors
 *   `excess-move.ts`'s own `because: ExcessMoveInapplicability` and makes
 *   the distinction type-level rather than a naming convention: a handler
 *   that reads `.reason` off a collapsed outcome does not compile.
 * - **There is no `applies: false` flag.** This union already discriminates
 *   on `kind`, so a second discriminant would be a second home for one
 *   fact. What is mirrored from `excess-move.ts` is its **vocabulary and its
 *   word**, not its record shape — that shape is right for a reference
 *   record with no other discriminant, which is not this.
 *
 * **Reversal trigger, as a condition**: the first tool whose `inapplicable`
 * arm needs to carry a PAYLOAD rather than a bare word from a closed
 * vocabulary. At that point this stops being a vocabulary extension and
 * wants its own ADR.
 */
export type ToolOutcome<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "refused"; readonly reason: ToolRefusal }
  | { readonly kind: "inapplicable"; readonly because: ToolInapplicability };

// ------------------------------------------------------------------- step

interface StepBase {
  readonly id: StepId;
  /** The human sentence `PRODUCT_SPEC.md` §14 draws — `"Measure move"` —
   * what the checklist shows. The tool's own identifier travels
   * separately and is never the headline. */
  readonly description: string;
  readonly tool: ToolName;
}

export interface QueuedStep extends StepBase {
  readonly status: "queued";
}

export interface RunningStep extends StepBase {
  readonly status: "running";
  readonly startedAt: Date;
}

export interface CompletedStep extends StepBase {
  readonly status: "completed";
  readonly startedAt: Date;
  readonly completedAt: Date;
  /** Server-measured (`completedAt − startedAt`), never a subtraction a
   * reader performs — and never padded. A sub-millisecond read (this
   * tool is a `Map` lookup) is a legitimate `0`. */
  readonly durationMs: number;
}

export interface FailedStep extends StepBase {
  readonly status: "failed";
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly durationMs: number;
  /** Never a thrown message — the same rule as "a 5xx never carries the
   * thrown message." Unreachable from Story 7.1; typed here so Story
   * 7.5 has a shape to produce rather than inventing one under
   * pressure. */
  readonly reason: string;
}

export interface CancelledStep extends StepBase {
  readonly status: "cancelled";
  readonly startedAt: Date;
  readonly completedAt: Date;
}

/** A discriminated union on `status`, never a flat record with optional
 * fields — `exactOptionalPropertyTypes` enforcing structurally that a
 * `queued` step cannot spell a `completedAt` and a `completed` step
 * cannot omit one. */
export type Step =
  QueuedStep | RunningStep | CompletedStep | FailedStep | CancelledStep;

// ------------------------------------------------------------ investigation

/**
 * `PRODUCT_SPEC.md` §13's own fields, minus four deliberately omitted
 * rather than shipped empty (ADR 0029: a fully-formed record about
 * nothing is a false impression). `findings`/`evidence` arrive at Story
 * 7.3; `workspaceState`/`messages` are Epic 10/11's.
 */
export interface Investigation {
  readonly id: InvestigationId;
  /** Derived deterministically from the subject — `"Investigate NVDA"` —
   * never free text, or the title becomes a second home for the
   * subject. */
  readonly title: string;
  readonly createdAt: Date;
  readonly mode: InvestigationMode;
  readonly status: InvestigationStatus;
  readonly subjectSymbols: readonly Ticker[];
  /** The as-of instant. Invariant 4's own hook: every tool receives this
   * and reads no clock of its own, so a replay is structurally isolated
   * rather than told to be. */
  readonly currentTime: Date;
  readonly steps: readonly Step[];
}

// ------------------------------------------------------------------ events

/** All ten names `PRODUCT_SPEC.md` §33 lists, as a closed vocabulary —
 * later stories add a payload for one of the remaining four, never a
 * second list. Story 7.1 ships six; `FINDING_CREATED`/`EVIDENCE_ADDED`
 * wait for Story 7.3's domain types, `WORKSPACE_COMMAND` for a tool that
 * produces one (Story 7.4). **Corrected 2026-11-18 (Task 7.2.1): this
 * used to say `INVESTIGATION_FAILED` waits for Story 7.5 — it ships here,
 * as the terminal event alone, and Story 7.5 still owns what a reader is
 * told about a failed run.** */
export const INVESTIGATION_EVENT_TYPES = [
  "INVESTIGATION_STARTED",
  "STEP_STARTED",
  "TOOL_CALL_STARTED",
  "TOOL_CALL_COMPLETED",
  "FINDING_CREATED",
  "EVIDENCE_ADDED",
  "WORKSPACE_COMMAND",
  "STEP_COMPLETED",
  "INVESTIGATION_COMPLETED",
  "INVESTIGATION_FAILED",
] as const;

export type InvestigationEventType = (typeof INVESTIGATION_EVENT_TYPES)[number];

/** The event types that end a stream.
 *
 * **Amended 2026-11-18 (Task 7.2.1): `INVESTIGATION_FAILED` is a member.**
 * The sentence above used to read "not a member yet — Story 7.5's to add,
 * when a run can fail outright rather than merely refuse one step", and
 * its own condition fired one story early: Story 7.2 gives the
 * orchestrator four more tools with real throw paths (a database read, a
 * calendar edge) that Story 7.1's single in-memory `Map` lookup never
 * had, so a run CAN now fail outright. What stays Story 7.5's is the
 * reader-facing half — the honest sentence a checklist draws for a failed
 * run, and the per-step degradation around it. This is the terminal event
 * alone, so a thrown tool cannot leave an investigation `running` for
 * ever (which, through `POST /investigations`' second-press idempotency,
 * permanently disables `Investigate` for that symbol until a restart). */
export const TERMINAL_EVENT_TYPES = [
  "INVESTIGATION_COMPLETED",
  "INVESTIGATION_FAILED",
] as const;

export const isTerminalEventType = (type: InvestigationEventType): boolean =>
  (TERMINAL_EVENT_TYPES as readonly string[]).includes(type);

interface InvestigationEventBase {
  /** 1-based, monotonic per investigation. Without this, the events
   * emitted between a client's start request and its attach to the
   * stream are lost and the checklist draws nothing — not a corner
   * case, the common one. */
  readonly seq: number;
  readonly investigationId: InvestigationId;
}

/** The six events Story 7.1 ships, fully typed. The other four exist as
 * names only in {@link INVESTIGATION_EVENT_TYPES} — their payload shape
 * is each one's own story's to add, as a new member of this union. */
export type InvestigationEvent =
  | (InvestigationEventBase & {
      readonly type: "INVESTIGATION_STARTED";
      readonly investigation: Investigation;
    })
  | (InvestigationEventBase & {
      readonly type: "STEP_STARTED";
      readonly stepId: StepId;
      readonly description: string;
      readonly tool: ToolName;
      readonly startedAt: Date;
    })
  | (InvestigationEventBase & {
      readonly type: "TOOL_CALL_STARTED";
      readonly stepId: StepId;
      readonly tool: ToolName;
    })
  | (InvestigationEventBase & {
      readonly type: "TOOL_CALL_COMPLETED";
      readonly stepId: StepId;
      readonly tool: ToolName;
      readonly durationMs: number;
      readonly outcome: WireToolOutcome;
    })
  | (InvestigationEventBase & {
      readonly type: "STEP_COMPLETED";
      readonly stepId: StepId;
      readonly status: "completed";
      readonly durationMs: number;
    })
  | (InvestigationEventBase & {
      readonly type: "INVESTIGATION_COMPLETED";
      readonly status: "completed";
      readonly completedAt: Date;
      readonly stepCount: number;
    })
  /**
   * **Added 2026-11-18 (Task 7.2.1).** The terminal event for a run whose
   * tool threw. It carries **no reason, no message and no step id** — a
   * thrown message is internal detail for the same reason "a 5xx never
   * carries the thrown message", and WHICH step failed and what a reader
   * is told about it are Story 7.5's, with `FailedStep.reason` already
   * typed and waiting for it. What this member exists for is narrower and
   * structural: `isTerminalEventType` has to answer `true` for something
   * after a throw, or the SSE response never ends and the investigation
   * sits `running` for ever.
   */
  | (InvestigationEventBase & {
      readonly type: "INVESTIGATION_FAILED";
      readonly status: "failed";
      readonly failedAt: Date;
      readonly stepCount: number;
    });

// -------------------------------------------------------------- wire shape

/** A tool outcome, as it travels. Mirrors {@link ToolOutcome} with the
 * payload narrowed to JSON — including the `inapplicable` arm since Task
 * 7.2.4, carrying the same `because` word rather than being flattened into a
 * refusal on the way out. */
export type WireToolOutcome =
  | { readonly kind: "ok"; readonly value: Readonly<Record<string, JsonValue>> }
  | { readonly kind: "refused"; readonly reason: ToolRefusal }
  | { readonly kind: "inapplicable"; readonly because: ToolInapplicability };

/**
 * One map per member of {@link Step}, for `WireMarketBreadth`'s own
 * reason: `keyof` a union is the **intersection** of its members' keys, so
 * one map over `Step` would cover only `id`/`description`/`tool`/`status`
 * and wave every status-specific field through unexamined — exactly the
 * leak ADR 0031 describes, arriving through the type system. Every field
 * of each member is required on that member, so there is no `Omit` here;
 * a field added to any member fails to compile, naming itself.
 */
const queuedStepFields: WireFields<QueuedStep> = {
  id: asIs,
  description: asIs,
  tool: asIs,
  status: asIs,
};

const runningStepFields: WireFields<RunningStep> = {
  id: asIs,
  description: asIs,
  tool: asIs,
  status: asIs,
  startedAt: asInstant,
};

const completedStepFields: WireFields<CompletedStep> = {
  id: asIs,
  description: asIs,
  tool: asIs,
  status: asIs,
  startedAt: asInstant,
  completedAt: asInstant,
  durationMs: asIs,
};

const failedStepFields: WireFields<FailedStep> = {
  id: asIs,
  description: asIs,
  tool: asIs,
  status: asIs,
  startedAt: asInstant,
  completedAt: asInstant,
  durationMs: asIs,
  reason: asIs,
};

const cancelledStepFields: WireFields<CancelledStep> = {
  id: asIs,
  description: asIs,
  tool: asIs,
  status: asIs,
  startedAt: asInstant,
  completedAt: asInstant,
};

/** `Step`'s own wire projection — switches on `status` to the matching
 * member's own map, per the module comment above. */
export const toWireStep = (step: Step): Readonly<Record<string, JsonValue>> => {
  switch (step.status) {
    case "queued":
      return toWire(queuedStepFields, step);
    case "running":
      return toWire(runningStepFields, step);
    case "completed":
      return toWire(completedStepFields, step);
    case "failed":
      return toWire(failedStepFields, step);
    case "cancelled":
      return toWire(cancelledStepFields, step);
    default: {
      // Exhaustive: a sixth Step status fails the build here rather than
      // being silently unserialisable.
      const unhandled: never = step;
      return unhandled;
    }
  }
};

const investigationFields: WireFields<Investigation> = {
  id: asIs,
  title: asIs,
  createdAt: asInstant,
  mode: asIs,
  status: asIs,
  subjectSymbols: asIs,
  currentTime: asInstant,
  steps: (steps) => steps.map(toWireStep),
};

export const toWireInvestigation = (
  investigation: Investigation,
): Readonly<Record<string, JsonValue>> =>
  toWire(investigationFields, investigation);

// ------------------------------------------------------------ event wire shape

/**
 * One map per member of {@link InvestigationEvent}, for the reason the five
 * {@link Step} maps above exist: `keyof` a union is the members' own
 * **intersection** (`seq`/`investigationId`/`type` here), so one map over
 * the whole union would wave every event-specific field through unexamined —
 * the exact leak this idiom exists to close. This is Task 7.1.3's own reason
 * for existing at all: SSE bypasses `fast-json-stringify`'s stripping
 * entirely, so a frame built any other way (a bare `JSON.stringify`, a
 * spread) has no mechanical protection against carrying something the wire
 * contract does not name.
 */
const investigationStartedFields: WireFields<
  Extract<InvestigationEvent, { type: "INVESTIGATION_STARTED" }>
> = {
  type: asIs,
  seq: asIs,
  investigationId: asIs,
  investigation: toWireInvestigation,
};

const stepStartedFields: WireFields<
  Extract<InvestigationEvent, { type: "STEP_STARTED" }>
> = {
  type: asIs,
  seq: asIs,
  investigationId: asIs,
  stepId: asIs,
  description: asIs,
  tool: asIs,
  startedAt: asInstant,
};

const toolCallStartedFields: WireFields<
  Extract<InvestigationEvent, { type: "TOOL_CALL_STARTED" }>
> = {
  type: asIs,
  seq: asIs,
  investigationId: asIs,
  stepId: asIs,
  tool: asIs,
};

const toolCallCompletedFields: WireFields<
  Extract<InvestigationEvent, { type: "TOOL_CALL_COMPLETED" }>
> = {
  type: asIs,
  seq: asIs,
  investigationId: asIs,
  stepId: asIs,
  tool: asIs,
  durationMs: asIs,
  // Already the JSON shape {@link WireToolOutcome} names — minted once, in
  // `tool-security-snapshot.ts`'s own `toWireSecuritySnapshot` (or each
  // later tool's equivalent), never recomposed here.
  outcome: asIs,
};

const stepCompletedFields: WireFields<
  Extract<InvestigationEvent, { type: "STEP_COMPLETED" }>
> = {
  type: asIs,
  seq: asIs,
  investigationId: asIs,
  stepId: asIs,
  status: asIs,
  durationMs: asIs,
};

const investigationCompletedFields: WireFields<
  Extract<InvestigationEvent, { type: "INVESTIGATION_COMPLETED" }>
> = {
  type: asIs,
  seq: asIs,
  investigationId: asIs,
  status: asIs,
  completedAt: asInstant,
  stepCount: asIs,
};

const investigationFailedFields: WireFields<
  Extract<InvestigationEvent, { type: "INVESTIGATION_FAILED" }>
> = {
  type: asIs,
  seq: asIs,
  investigationId: asIs,
  status: asIs,
  failedAt: asInstant,
  stepCount: asIs,
};

/**
 * One `InvestigationEvent`'s own wire projection — switches on `type` to the
 * matching member's own map, exactly `toWireStep`'s own shape. The SSE
 * route's one rule (Task 7.1.3): every frame is built by calling this,
 * never a bare `JSON.stringify` of an orchestration value.
 */
export const toWireInvestigationEvent = (
  event: InvestigationEvent,
): Readonly<Record<string, JsonValue>> => {
  switch (event.type) {
    case "INVESTIGATION_STARTED":
      return toWire(investigationStartedFields, event);
    case "STEP_STARTED":
      return toWire(stepStartedFields, event);
    case "TOOL_CALL_STARTED":
      return toWire(toolCallStartedFields, event);
    case "TOOL_CALL_COMPLETED":
      return toWire(toolCallCompletedFields, event);
    case "STEP_COMPLETED":
      return toWire(stepCompletedFields, event);
    case "INVESTIGATION_COMPLETED":
      return toWire(investigationCompletedFields, event);
    case "INVESTIGATION_FAILED":
      return toWire(investigationFailedFields, event);
    default: {
      // Exhaustive over the seven members this product emits —
      // `INVESTIGATION_FAILED` became the seventh on 2026-11-18 (Task
      // 7.2.1). An eighth (`FINDING_CREATED`, `EVIDENCE_ADDED`,
      // `WORKSPACE_COMMAND`) fails the build here the day its own
      // story gives it a payload, naming the member rather than leaving
      // it silently unserialisable.
      const unhandled: never = event;
      return unhandled;
    }
  }
};
