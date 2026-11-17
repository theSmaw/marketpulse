// The wire shape of one SSE frame's `data`, and the one function that turns
// raw JSON into something this module's reducer can trust (Task 7.1.4).
//
// This is the frontend's own description of the wire, deliberately not
// imported from the backend: `packages/shared/src/investigation.ts` exports
// the SERIALISER (`toWireInvestigationEvent`) and not a type for what it
// produces, because that type is domain-shaped (`Date`, branded ids) and the
// wire is JSON — a `startedAt` here is a `string`, not a `Date`. Shared means
// both sides depend on the same fact, and the fact the backend owns is "how
// do I serialise one of these", not "what does a browser receive".
//
// `market-stream-protocol.ts`'s own `DecodedMessage` is the precedent for the
// shape below: **a value, never a throw.** A malformed frame from a server
// this product wrote is a bug; a browser that throws on one takes the whole
// page down, which `PRODUCT_SPEC.md` §36 forbids. `readInvestigationEvent`
// therefore answers one of three kinds and nothing it is given can make it
// throw.

/** The six event types this story's own backend ever sends. The other four
 * `PRODUCT_SPEC.md` §33 names (`FINDING_CREATED`, `EVIDENCE_ADDED`,
 * `WORKSPACE_COMMAND`, `INVESTIGATION_FAILED`) have no payload shape here —
 * a frame carrying one of those decodes as `unsupported`, exactly as a
 * frame from a type this bundle predates would, until the story that ships
 * one adds its own member below. */
export const KNOWN_INVESTIGATION_EVENT_TYPES = [
  "INVESTIGATION_STARTED",
  "STEP_STARTED",
  "TOOL_CALL_STARTED",
  "TOOL_CALL_COMPLETED",
  "STEP_COMPLETED",
  "INVESTIGATION_COMPLETED",
] as const;

export type KnownInvestigationEventType =
  (typeof KNOWN_INVESTIGATION_EVENT_TYPES)[number];

/** A tool's outcome, exactly as `WireToolOutcome` describes it on the wire —
 * duplicated rather than imported for the same reason the event shape is:
 * this is a fact about JSON, not about the domain object either side holds
 * it as. */
export type WireToolOutcome =
  | { readonly kind: "ok"; readonly value: Readonly<Record<string, unknown>> }
  | { readonly kind: "refused"; readonly reason: string };

interface WireEventBase {
  readonly seq: number;
  readonly investigationId: string;
}

export type WireInvestigationEvent =
  | (WireEventBase & {
      readonly type: "INVESTIGATION_STARTED";
      readonly investigation: {
        readonly id: string;
        readonly title: string;
        readonly subjectSymbols: readonly string[];
      };
    })
  | (WireEventBase & {
      readonly type: "STEP_STARTED";
      readonly stepId: string;
      readonly description: string;
      readonly tool: string;
      readonly startedAt: string;
    })
  | (WireEventBase & {
      readonly type: "TOOL_CALL_STARTED";
      readonly stepId: string;
      readonly tool: string;
    })
  | (WireEventBase & {
      readonly type: "TOOL_CALL_COMPLETED";
      readonly stepId: string;
      readonly tool: string;
      readonly durationMs: number;
      readonly outcome: WireToolOutcome;
    })
  | (WireEventBase & {
      readonly type: "STEP_COMPLETED";
      readonly stepId: string;
      readonly status: "completed";
      readonly durationMs: number;
    })
  | (WireEventBase & {
      readonly type: "INVESTIGATION_COMPLETED";
      readonly status: "completed";
      readonly completedAt: string;
      readonly stepCount: number;
    });

/** What a decode produced — `market-stream-protocol.ts`'s own three-member
 * shape, carried over rather than re-invented. */
export type DecodedInvestigationEvent =
  | { readonly kind: "event"; readonly event: WireInvestigationEvent }
  | { readonly kind: "unreadable"; readonly reason: string }
  | { readonly kind: "unsupported"; readonly type: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Decode one SSE frame's `data` payload. Never throws: anything this
 * cannot read comes back as `unreadable`, and a `type` it does not
 * recognise comes back as `unsupported` — which is the state the common
 * case (a client attaching after Story 7.2 ships a second tool and an
 * older bundle is still open in a tab) must reach rather than crash into.
 */
export function readInvestigationEvent(
  raw: unknown,
): DecodedInvestigationEvent {
  if (!isRecord(raw)) {
    return { kind: "unreadable", reason: "not an object" };
  }

  const { type, seq, investigationId } = raw;

  if (typeof type !== "string") {
    return { kind: "unreadable", reason: "missing type" };
  }
  if (!isFiniteNumber(seq)) {
    return { kind: "unreadable", reason: "missing or non-finite seq" };
  }
  if (!isNonEmptyString(investigationId)) {
    return { kind: "unreadable", reason: "missing investigationId" };
  }

  switch (type) {
    case "INVESTIGATION_STARTED": {
      const investigation = raw.investigation;
      if (!isRecord(investigation)) {
        return { kind: "unreadable", reason: "missing investigation" };
      }
      const { id, title, subjectSymbols } = investigation;
      if (
        !isNonEmptyString(id) ||
        typeof title !== "string" ||
        !Array.isArray(subjectSymbols) ||
        !subjectSymbols.every((symbol) => typeof symbol === "string")
      ) {
        return { kind: "unreadable", reason: "malformed investigation" };
      }
      return {
        kind: "event",
        event: {
          type,
          seq,
          investigationId,
          investigation: { id, title, subjectSymbols },
        },
      };
    }

    case "STEP_STARTED": {
      const { stepId, description, tool, startedAt } = raw;
      if (
        !isNonEmptyString(stepId) ||
        typeof description !== "string" ||
        typeof tool !== "string" ||
        !isNonEmptyString(startedAt)
      ) {
        return { kind: "unreadable", reason: "malformed STEP_STARTED" };
      }
      return {
        kind: "event",
        event: {
          type,
          seq,
          investigationId,
          stepId,
          description,
          tool,
          startedAt,
        },
      };
    }

    case "TOOL_CALL_STARTED": {
      const { stepId, tool } = raw;
      if (!isNonEmptyString(stepId) || typeof tool !== "string") {
        return { kind: "unreadable", reason: "malformed TOOL_CALL_STARTED" };
      }
      return {
        kind: "event",
        event: { type, seq, investigationId, stepId, tool },
      };
    }

    case "TOOL_CALL_COMPLETED": {
      const { stepId, tool, durationMs, outcome } = raw;
      const decodedOutcome = readToolOutcome(outcome);
      if (
        !isNonEmptyString(stepId) ||
        typeof tool !== "string" ||
        !isFiniteNumber(durationMs) ||
        decodedOutcome === undefined
      ) {
        return { kind: "unreadable", reason: "malformed TOOL_CALL_COMPLETED" };
      }
      return {
        kind: "event",
        event: {
          type,
          seq,
          investigationId,
          stepId,
          tool,
          durationMs,
          outcome: decodedOutcome,
        },
      };
    }

    case "STEP_COMPLETED": {
      const { stepId, status, durationMs } = raw;
      if (
        !isNonEmptyString(stepId) ||
        status !== "completed" ||
        !isFiniteNumber(durationMs)
      ) {
        return { kind: "unreadable", reason: "malformed STEP_COMPLETED" };
      }
      return {
        kind: "event",
        event: { type, seq, investigationId, stepId, status, durationMs },
      };
    }

    case "INVESTIGATION_COMPLETED": {
      const { status, completedAt, stepCount } = raw;
      if (
        status !== "completed" ||
        !isNonEmptyString(completedAt) ||
        !isFiniteNumber(stepCount)
      ) {
        return {
          kind: "unreadable",
          reason: "malformed INVESTIGATION_COMPLETED",
        };
      }
      return {
        kind: "event",
        event: { type, seq, investigationId, status, completedAt, stepCount },
      };
    }

    default:
      return { kind: "unsupported", type };
  }
}

function readToolOutcome(raw: unknown): WireToolOutcome | undefined {
  if (!isRecord(raw)) return undefined;
  const { kind } = raw;
  if (kind === "ok") {
    return isRecord(raw.value) ? { kind: "ok", value: raw.value } : undefined;
  }
  if (kind === "refused") {
    return typeof raw.reason === "string"
      ? { kind: "refused", reason: raw.reason }
      : undefined;
  }
  return undefined;
}
