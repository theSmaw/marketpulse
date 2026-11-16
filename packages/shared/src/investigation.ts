import { asInstant, asIs, toWire } from "./wire-serialiser.js";
import type { JsonValue, WireFields } from "./wire-serialiser.js";
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
export const TOOL_NAMES = ["get_security_snapshot"] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

/** Why a tool answered "not enough evidence" rather than a figure —
 * invariant 5's first-class outcome, named rather than thrown.
 * `nothing-observed`: the security is tracked but has no current
 * observation (property 3 of `current-market-state.ts`'s own hand-off —
 * CI's permanent state). `not-tracked`: the security is not a member of
 * the curated universe at all (e.g. `PSKY`/`WBD`) — a genuinely different
 * check from the first, and the two must not share one answer. */
export const TOOL_REFUSALS = ["nothing-observed", "not-tracked"] as const;

export type ToolRefusal = (typeof TOOL_REFUSALS)[number];

/** A tool's result. **Two members, and no third "thrown" path exists in
 * the type** — the shape every later tool's own story is checked
 * against. */
export type ToolOutcome<T> =
  | { readonly kind: "ok"; readonly value: T }
  | { readonly kind: "refused"; readonly reason: ToolRefusal };

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
 * produces one (Story 7.4), `INVESTIGATION_FAILED` for Story 7.5. */
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

/** The event types that end a stream. `INVESTIGATION_FAILED` is not a
 * member yet — Story 7.5's to add, when a run can fail outright rather
 * than merely refuse one step. */
export const TERMINAL_EVENT_TYPES = ["INVESTIGATION_COMPLETED"] as const;

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
    });

// -------------------------------------------------------------- wire shape

/** A tool outcome, as it travels. Mirrors {@link ToolOutcome} with the
 * payload narrowed to JSON. */
export type WireToolOutcome =
  | { readonly kind: "ok"; readonly value: Readonly<Record<string, JsonValue>> }
  | { readonly kind: "refused"; readonly reason: ToolRefusal };

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
    default: {
      // Exhaustive over the six members this story emits. A seventh
      // (`FINDING_CREATED`, `EVIDENCE_ADDED`, `WORKSPACE_COMMAND`,
      // `INVESTIGATION_FAILED`) fails the build here the day its own
      // story gives it a payload, naming the member rather than leaving
      // it silently unserialisable.
      const unhandled: never = event;
      return unhandled;
    }
  }
};
