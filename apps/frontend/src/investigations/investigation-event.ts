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

import { CONFIDENCE_LEVELS } from "@marketpulse/shared";

import type { Confidence } from "@marketpulse/shared";

/** The event types this bundle can decode. The remaining `PRODUCT_SPEC.md`
 * §33 names have no payload shape here — a frame carrying one of those
 * decodes as `unsupported`, exactly as a frame from a type this bundle
 * predates would, until the story that ships one adds its own member below.
 *
 * **Eight since 2026-11-23 (Task 7.3.1), and two of the additions are not the
 * same kind of change.** `FINDING_CREATED` is this story's own new event.
 * `INVESTIGATION_FAILED` is a **repair**: it has carried a backend wire case
 * since Task 7.2.1 (2026-11-18) with no case here, so a tool that threw was
 * decoded as `unsupported` and dropped, the stream then ended with no
 * terminal event this reducer had seen, and the row drew the
 * **dropped-connection** sentence instead of the truth about the failure.
 * Found while shaping this story's event-type/decoder-parity invariant — the
 * check would have been **red on `main`** before a line of Story 7.3 existed
 * — and fixed here, with **no new reader-facing sentence**: what a reader is
 * told about a failed run is Story 7.5's scope by decision, and that story's
 * own `STORY.md` carries the constraint it inherits. */
export const KNOWN_INVESTIGATION_EVENT_TYPES = [
  "INVESTIGATION_STARTED",
  "STEP_STARTED",
  "TOOL_CALL_STARTED",
  "TOOL_CALL_COMPLETED",
  "FINDING_CREATED",
  "STEP_COMPLETED",
  "INVESTIGATION_COMPLETED",
  "INVESTIGATION_FAILED",
  // **Nine since 2026-11-25 (Task 7.4.1).** Invariant 2's own event. It is
  // decoded and validated here and **drawn by nothing yet** — the highlight
  // itself is Task 7.4.2's — which is deliberate rather than an omission: a
  // type the backend serialises and this bundle has no case for decodes as
  // `unsupported` and is dropped without a word, which is the defect
  // `every-serialised-event-type-has-a-decoder-case` exists to refuse and
  // which it caught once already (`INVESTIGATION_FAILED`, above).
  "WORKSPACE_COMMAND",
] as const;

export type KnownInvestigationEventType =
  (typeof KNOWN_INVESTIGATION_EVENT_TYPES)[number];

/** A tool's outcome, exactly as `WireToolOutcome` describes it on the wire —
 * duplicated rather than imported for the same reason the event shape is:
 * this is a fact about JSON, not about the domain object either side holds
 * it as.
 *
 * **The `inapplicable` arm arrived 2026-11-19 (Task 7.2.4), and the
 * duplication is exactly what made it dangerous**: `readToolOutcome` below is
 * a closed whitelist, and an outcome kind it does not branch on makes the
 * WHOLE event `unreadable` — which `use-investigation.ts` then silently
 * ignores, so the first `inapplicable` outcome this product ever produced
 * would have been dropped on the floor with every test green.
 * `the-tool-outcome-decoder-branches-on-every-kind` is the check that stops
 * that happening again, with a `pnpm break` planting the fourth kind. The
 * field is `because`, never `reason` — see `packages/shared/src/
 * investigation.ts`'s own `ToolOutcome` docblock for why that is a decision
 * rather than a spelling. */
export type WireToolOutcome =
  | { readonly kind: "ok"; readonly value: Readonly<Record<string, unknown>> }
  | { readonly kind: "refused"; readonly reason: string }
  | { readonly kind: "inapplicable"; readonly because: string };

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
  /**
   * One step's claim (Task 7.3.1) — **declaring only the fields the browser
   * reads**, which is `INVESTIGATION_STARTED`'s own shipped precedent of
   * partial decoding two members up.
   *
   * The backend's `Finding` carries an id, a type, a discriminant and either
   * its evidence inline or the refusal word it answered with. The checklist
   * needs three fields: which row (`stepId`, off the **finding** — the
   * envelope deliberately carries no second copy), what to draw (`claim`),
   * and how well evidenced it is (`confidence`). Declaring the rest would be
   * a wire shape this bundle has no reader for, which Epic 8's evidence panel
   * widens when it has one.
   *
   * `confidence` is optional **here and not on the wire**: the backend always
   * sends one, and a level this bundle does not recognise is dropped rather
   * than guessed — see `readInvestigationEvent`'s own case.
   */
  | (WireEventBase & {
      readonly type: "FINDING_CREATED";
      readonly finding: {
        readonly stepId: string;
        readonly claim: string;
        readonly confidence?: Confidence;
      };
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
    })
  /**
   * **The repair, not a feature** (Task 7.3.1) — see
   * {@link KNOWN_INVESTIGATION_EVENT_TYPES}. It carries no reason, no message
   * and no step id, because the backend's own member does not: a thrown
   * message is internal detail for the same reason a 5xx never carries one,
   * and WHICH step failed is Story 7.5's. What this member buys is that the
   * reducer sees a terminal event at all, so a failed run stops being
   * reported as a dropped connection.
   */
  | (WireEventBase & {
      readonly type: "INVESTIGATION_FAILED";
      readonly status: "failed";
      readonly failedAt: string;
      readonly stepCount: number;
    })
  /**
   * **Invariant 2's own event** (Task 7.4.1) — a typed instruction to a
   * surface rather than a figure about the market, and the first of those this
   * product has ever carried.
   *
   * **Declared as the wire's own shape, not the domain's**, exactly as this
   * module's header requires: the backend's `WorkspaceCommand` holds `Ticker`s
   * and a `TopologyEdgeKind` union, and both are plain strings here. The
   * browser re-narrows them where it uses them — a symbol against the universe
   * it has already fetched, a relation against the vocabulary it imports — and
   * Task 7.4.2 is the first reader that needs either.
   *
   * **The outcome's refused arm is decoded too**, not skipped. A refusal is
   * ADR 0029's first-class, countable outcome, and a decoder that dropped it
   * would make the one thing the permission stage exists to produce invisible
   * to everything above the server's own stderr.
   *
   * `relations` is plural — see `packages/shared/src/workspace-command.ts` for
   * why the set of kinds travels rather than one dominant kind.
   */
  | (WireEventBase & {
      readonly type: "WORKSPACE_COMMAND";
      readonly stepId: string;
      readonly outcome: WireWorkspaceCommandOutcome;
    });

/** A command, as it travels. See the event member above for the duplication
 * rule this follows. */
export interface WireHighlightNodesCommand {
  readonly type: "highlightNodes";
  readonly symbols: readonly string[];
  readonly relations: readonly string[];
  readonly subject: string;
}

/** The permission stage's answer, as it travels. */
export type WireWorkspaceCommandOutcome =
  | {
      readonly kind: "permitted";
      readonly command: WireHighlightNodesCommand;
    }
  | { readonly kind: "refused"; readonly because: string };

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
 * **One of the four levels this bundle knows.**
 *
 * Read off the SHARED vocabulary rather than a fourth copy of it — which is
 * the one duplication this module deliberately does not make, and the reason
 * is the opposite of the one in its own header. The event SHAPE is a fact
 * about JSON (a `startedAt` is a `string` here, not a `Date`) and is declared
 * locally on purpose; a confidence **level** is a closed domain vocabulary
 * whose members mean the same thing on both sides of the wire, so a local list
 * would be a second list to keep in step with nothing checking that it is.
 */
function isConfidence(value: unknown): value is Confidence {
  return (
    typeof value === "string" &&
    (CONFIDENCE_LEVELS as readonly string[]).includes(value)
  );
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

    case "FINDING_CREATED": {
      const finding = raw.finding;
      if (!isRecord(finding)) {
        return { kind: "unreadable", reason: "missing finding" };
      }
      const { stepId, claim, confidence } = finding;
      if (!isNonEmptyString(stepId) || !isNonEmptyString(claim)) {
        return { kind: "unreadable", reason: "malformed FINDING_CREATED" };
      }
      // **A confidence level this bundle does not recognise is DROPPED, never
      // guessed — and is never a reason to drop the claim with it.**
      //
      // `readReturnPercentile`'s own rule, one vocabulary over: a level a
      // newer backend knows and this bundle does not would otherwise refuse a
      // frame the producer is being honest in. And the claim is the thing a
      // reader came for — a row with a measured figure and no confidence mark
      // is the same honest-absence shape an `inapplicable` step already
      // draws, whereas a dropped event is a row that silently says nothing.
      const known = isConfidence(confidence);
      return {
        kind: "event",
        event: {
          type,
          seq,
          investigationId,
          finding: {
            stepId,
            claim,
            ...(known ? { confidence } : {}),
          },
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

    case "INVESTIGATION_FAILED": {
      const { status, failedAt, stepCount } = raw;
      if (
        status !== "failed" ||
        !isNonEmptyString(failedAt) ||
        !isFiniteNumber(stepCount)
      ) {
        return {
          kind: "unreadable",
          reason: "malformed INVESTIGATION_FAILED",
        };
      }
      return {
        kind: "event",
        event: { type, seq, investigationId, status, failedAt, stepCount },
      };
    }

    case "WORKSPACE_COMMAND": {
      const { stepId, outcome } = raw;
      const decodedOutcome = readWorkspaceCommandOutcome(outcome);
      if (!isNonEmptyString(stepId) || decodedOutcome === undefined) {
        return { kind: "unreadable", reason: "malformed WORKSPACE_COMMAND" };
      }
      return {
        kind: "event",
        event: {
          type,
          seq,
          investigationId,
          stepId,
          outcome: decodedOutcome,
        },
      };
    }

    default:
      return { kind: "unsupported", type };
  }
}

/**
 * The permission stage's outcome, read off a frame.
 *
 * **An empty `symbols` array is `undefined` here**, which is the browser's own
 * half of the guarantee the backend holds in a non-empty tuple: an empty
 * highlight is a fully-formed claim about zero nodes (ADR 0029), and a
 * malformed frame carrying one must not reach a reader as *nothing is
 * related*. `relations` is held to the same rule for the same reason — a
 * highlight the note cannot explain is a highlight with no sentence.
 *
 * `because`, never `reason`, mirroring `readToolOutcome` above it and the
 * shared type both sides read: a flattened frame fails to decode here rather
 * than rendering as a refusal of an unnamed kind.
 */
function readWorkspaceCommandOutcome(
  raw: unknown,
): WireWorkspaceCommandOutcome | undefined {
  if (!isRecord(raw)) return undefined;
  const { kind } = raw;

  if (kind === "refused") {
    return typeof raw.because === "string"
      ? { kind: "refused", because: raw.because }
      : undefined;
  }

  if (kind !== "permitted") return undefined;

  const command = raw.command;
  if (!isRecord(command)) return undefined;

  const { type, symbols, relations, subject } = command;
  if (type !== "highlightNodes") return undefined;
  if (!isNonEmptyString(subject)) return undefined;
  if (!Array.isArray(symbols) || symbols.length === 0) return undefined;
  if (!symbols.every((value) => isNonEmptyString(value))) return undefined;
  if (!Array.isArray(relations) || relations.length === 0) return undefined;
  if (!relations.every((value) => isNonEmptyString(value))) return undefined;

  return {
    kind: "permitted",
    command: {
      type,
      symbols,
      relations,
      subject,
    },
  };
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
  // *The question does not arise* — a third claim rather than a refusal, and
  // read off `because` rather than `reason` so a flattened frame fails to
  // decode here rather than rendering as *unavailable* to a reader who would
  // then reasonably wait.
  if (kind === "inapplicable") {
    return typeof raw.because === "string"
      ? { kind: "inapplicable", because: raw.because }
      : undefined;
  }
  return undefined;
}
