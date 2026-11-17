// What the checklist draws, built up from decoded events — a pure reducer,
// tested without a component or a stream (Task 7.1.4).
//
// **One step, today, and the shape is written for more than one anyway.**
// Story 7.2 adds a second tool; a reducer keyed on `stepId` rather than on
// "the one step" is the difference between that story widening an array and
// that story rewriting this file.

import type { WireInvestigationEvent } from "./investigation-event.js";

export type ChecklistStepStatus = "queued" | "running" | "completed";

export interface ChecklistStepView {
  /** `undefined` only for the client-optimistic placeholder row painted
   * before any server reply — see {@link optimisticChecklist}. */
  readonly id: string | undefined;
  /** The step's own human sentence (`PRODUCT_SPEC.md` §14's `"Measure
   * move"`) — never the raw tool identifier. `undefined` until the real
   * step is known, which the placeholder row renders as held room rather
   * than as a guessed label. */
  readonly description: string | undefined;
  readonly status: ChecklistStepStatus;
  readonly startedAt: string | undefined;
  readonly completedAt: string | undefined;
  readonly durationMs: number | undefined;
}

export interface ChecklistState {
  readonly symbol: string;
  readonly investigationId: string | undefined;
  readonly steps: readonly ChecklistStepView[];
  /** `true` once `INVESTIGATION_COMPLETED` has actually been seen — the
   * only thing that tells a dropped stream (never reaches this) from a
   * finished one (reaches this and then the stream ends on its own). */
  readonly terminal: boolean;
  /** The stream ended with no terminal event — a fact about this browser's
   * own knowledge, never written back onto the investigation's real
   * status (`PRODUCT_SPEC.md` §13 is independent of any one response). */
  readonly connectionLost: boolean;
}

const PLACEHOLDER_STEP: ChecklistStepView = {
  id: undefined,
  description: undefined,
  status: "queued",
  startedAt: undefined,
  completedAt: undefined,
  durationMs: undefined,
};

/**
 * The checklist's first paint, before any network response — Done-when 3's
 * own requirement: a reader presses `Investigate` and sees a queued row in
 * the same frame, not after a round trip.
 */
export function optimisticChecklist(symbol: string): ChecklistState {
  return {
    symbol,
    investigationId: undefined,
    steps: [PLACEHOLDER_STEP],
    terminal: false,
    connectionLost: false,
  };
}

/** Attaches the real investigation id once the `POST` resolves, without
 * disturbing the steps — the first real event reconciles those. */
export function withInvestigationId(
  state: ChecklistState,
  investigationId: string,
): ChecklistState {
  return { ...state, investigationId };
}

function updateStep(
  steps: readonly ChecklistStepView[],
  stepId: string,
  update: (step: ChecklistStepView) => ChecklistStepView,
): readonly ChecklistStepView[] {
  // The placeholder (no `id` yet) is the one step a real `stepId` can
  // legitimately replace rather than merely update — everything after the
  // first real event matches by id.
  const index = steps.findIndex(
    (step) => step.id === stepId || step.id === undefined,
  );
  if (index === -1) return [...steps, update(PLACEHOLDER_STEP)];

  return steps.map((step, position) =>
    position === index ? update(step) : step,
  );
}

/**
 * The one reducer this module owns: a decoded event in, the next checklist
 * state out. Events for an id this state does not hold (a stale tab replaying
 * against a different investigation) are refused by the caller before this
 * is reached — see `use-investigation.ts` — so this never has to guess which
 * investigation an event belongs to.
 */
export function applyInvestigationEvent(
  state: ChecklistState,
  event: WireInvestigationEvent,
): ChecklistState {
  switch (event.type) {
    case "INVESTIGATION_STARTED":
      // The steps stay the placeholder a moment longer — this event's own
      // decoded shape carries only `id`/`title`/`subjectSymbols` (see
      // `investigation-event.ts`), and the real step arrives on its own
      // `STEP_STARTED`, which always follows in the same stream.
      return { ...state, investigationId: event.investigation.id };

    case "STEP_STARTED":
      return {
        ...state,
        steps: updateStep(state.steps, event.stepId, () => ({
          id: event.stepId,
          description: event.description,
          status: "running",
          startedAt: event.startedAt,
          completedAt: undefined,
          durationMs: undefined,
        })),
      };

    case "TOOL_CALL_STARTED":
      // Nothing on the checklist changes here — the step is already
      // `running` since `STEP_STARTED`, and this event exists for a later
      // story's own finer-grained UI (a step with more than one tool call).
      return state;

    case "TOOL_CALL_COMPLETED":
      // Likewise: `STEP_COMPLETED` is what the checklist draws. This
      // event's `outcome` is Story 7.3's own future reader (a finding), not
      // this checklist's.
      return state;

    case "STEP_COMPLETED":
      return {
        ...state,
        steps: updateStep(state.steps, event.stepId, (step) => ({
          ...step,
          status: "completed",
          completedAt: step.startedAt,
          durationMs: event.durationMs,
        })),
      };

    case "INVESTIGATION_COMPLETED":
      return { ...state, terminal: true };

    default: {
      // Exhaustive over the six members `WireInvestigationEvent` has today.
      const unhandled: never = event;
      return unhandled;
    }
  }
}

/** The stream ended with no `INVESTIGATION_COMPLETED` ever seen — the
 * dropped-stream sentence's own condition. A no-op once the investigation
 * has genuinely finished, so a stream that ends cleanly right after its
 * terminal event never flips this. */
export function withConnectionLost(state: ChecklistState): ChecklistState {
  if (state.terminal) return state;
  return { ...state, connectionLost: true };
}
