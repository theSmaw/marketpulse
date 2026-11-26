// What the checklist draws, built up from decoded events — a pure reducer,
// tested without a component or a stream (Task 7.1.4).
//
// **One step, today, and the shape is written for more than one anyway.**
// Story 7.2 adds a second tool; a reducer keyed on `stepId` rather than on
// "the one step" is the difference between that story widening an array and
// that story rewriting this file.

import type { WireInvestigationEvent } from "./investigation-event.js";
import {
  FINDING_TYPE_FOR_TOOL,
  TOOL_INAPPLICABILITIES,
  TOOL_NAMES,
  inapplicableClaim,
  type Confidence,
  type ToolInapplicability,
  type ToolName,
} from "@marketpulse/shared";

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
  /**
   * **What this step actually measured, in one line** (Task 7.3.1) — the
   * backend's own `Finding.claim`, arriving on `FINDING_CREATED`.
   *
   * `undefined` in three distinct, correct cases, and they are not one case:
   * a **queued** row (nothing has run), a **running** row (the claim arrives
   * with the outcome), and a completed row whose outcome was
   * **`inapplicable`** — *the question does not arise*, which mints no
   * finding at all and draws the inapplicability sentence Story 7.2 already
   * ships rather than an `UNKNOWN` claim inviting a reader to come back
   * later.
   */
  readonly claim: string | undefined;
  /**
   * How well evidenced the claim is. `undefined` wherever {@link claim} is,
   * and additionally where the level the backend sent is one this bundle does
   * not recognise — dropped rather than guessed, and never a reason to drop
   * the claim with it (`investigation-event.ts`'s own decoder case).
   *
   * **Nothing draws it yet.** Task 7.3.2 ships the `ConfidenceMark`; this
   * task puts the value on the view so that component has something real to
   * read on its first commit rather than a prop threaded through afterwards.
   */
  readonly confidence: Confidence | undefined;
  /**
   * **A second press's own carried-forward claim, not yet replaced by this
   * run's own finding** (Task 7.3.3, AC 11). `false` everywhere except a row
   * that survived {@link resetForNewRun} with a prior-run claim still on it —
   * `optimisticChecklist`'s own fresh placeholders are never stale, because
   * there is nothing on them to be old.
   *
   * Mirrors `bar-series-view.ts`'s own `stale` idiom exactly: a carried
   * answer, marked old, cleared by the first new fact that actually replaces
   * it. `STEP_STARTED` deliberately does NOT clear it — a row's queued and
   * running states render exactly as they do today, claim and all, until
   * that row's own `FINDING_CREATED` or `STEP_COMPLETED` does.
   */
  readonly stale: boolean;
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
  claim: undefined,
  confidence: undefined,
  stale: false,
};

/**
 * How many rows the checklist paints on press, before any network response —
 * the number of tools `index.ts`' own `investigationTools` runs (Task 7.2.7).
 *
 * **A COUNT and not the descriptions, deliberately.** Each step's sentence is
 * declared once, in the tool that owns it (`tool-return-percentile.ts`'s
 * `description: "Measure price anomaly"`, and five more beside it), and
 * arrives here on that step's own `STEP_STARTED`. Seeding the labels too
 * would put six strings in a second home on the other side of the wire, where
 * nothing could tell a stale copy from a current one; seeding the COUNT puts
 * one number there, and `pnpm invariants`' `the-checklist-seeds-one-row-per-
 * tool` fails the build when it disagrees with the pipeline's own length. A
 * seeded row therefore holds reserved room rather than a guessed sentence —
 * the same treatment the single placeholder row has had since Task 7.1.4,
 * now six deep instead of one.
 *
 * **Why the count matters at all**: a checklist that grows from one row to six
 * as the events land moves everything beneath it six times, inside a panel
 * Story 7.1 measured at 601px against a 605px budget at 390×780. The rows are
 * a fixed, known list — the pipeline is not model-driven until Epic 10 — so
 * there is nothing to discover here at run time.
 */
export const INVESTIGATION_STEP_COUNT = 6;

/**
 * The checklist's first paint, before any network response — Done-when 3's
 * own requirement: a reader presses `Investigate` and sees the whole queued
 * checklist in the same frame, not after a round trip, and not one row that
 * grows into six (Story 7.2's own Gate 1 decision, and `PRODUCT_SPEC.md`
 * §14's own example shape, which draws every row at once with some complete
 * and some pending).
 */
export function optimisticChecklist(symbol: string): ChecklistState {
  return {
    symbol,
    investigationId: undefined,
    steps: Array.from({ length: INVESTIGATION_STEP_COUNT }, () => ({
      ...PLACEHOLDER_STEP,
    })),
    terminal: false,
    connectionLost: false,
  };
}

/**
 * **The second press's own paint** (Task 7.3.3, AC 11) — a previous run's
 * claims persist, dimmed, rather than `optimisticChecklist`'s blank six,
 * which would be exactly the case ADR 0028 forbids by name the moment a row
 * carries a real finding rather than a never-yet-answered placeholder.
 *
 * Every field but `claim`/`confidence` resets to the placeholder's own
 * values, `id` included — the fresh run's `STEP_STARTED` events must fill
 * rows positionally exactly as a first press does (`updateStep`'s own
 * `id === undefined` clause), so a row carrying a stale claim forward is
 * otherwise indistinguishable from a freshly seeded one until its own next
 * event lands.
 *
 * `use-investigation.ts`'s `start()` is the one caller, and only for a
 * second-or-later press of the SAME symbol — a fresh symbol or a genuine
 * first press reach `optimisticChecklist` instead, which has nothing to
 * carry forward.
 */
export function resetForNewRun(previous: ChecklistState): ChecklistState {
  return {
    symbol: previous.symbol,
    investigationId: undefined,
    terminal: false,
    connectionLost: false,
    steps: previous.steps.map((step) =>
      step.claim === undefined
        ? { ...PLACEHOLDER_STEP }
        : {
            ...PLACEHOLDER_STEP,
            claim: step.claim,
            confidence: step.confidence,
            stale: true,
          },
    ),
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

/** `investigation-event.ts`'s own `isConfidence` idiom, one vocabulary over:
 * the wire duplicates `ToolName` as a bare `string` (it is a fact about
 * JSON, not about the domain object), so this reducer narrows it before
 * using it as a typed index. */
function isToolName(value: string): value is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(value);
}

/** Same idiom, for `WireToolOutcome`'s `because` field on an `inapplicable`
 * outcome. */
function isToolInapplicability(value: string): value is ToolInapplicability {
  return (TOOL_INAPPLICABILITIES as readonly string[]).includes(value);
}

function updateStep(
  steps: readonly ChecklistStepView[],
  stepId: string,
  update: (step: ChecklistStepView) => ChecklistStepView,
): readonly ChecklistStepView[] {
  // A seeded placeholder (no `id` yet) is what a real `stepId` first
  // replaces rather than merely updates; everything after that step's own
  // `STEP_STARTED` matches by id. The two clauses are ordered, and that
  // order is what makes six seeded rows fill left-to-right: a step the
  // pipeline has already named is found by its id wherever it sits, and a
  // step arriving for the first time takes the EARLIEST row still holding
  // room, which under a sequential orchestrator (Story 7.2's own Gate 1
  // decision) is the next one down.
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
      // The steps stay the seeded placeholders a moment longer — this event's own
      // decoded shape carries only `id`/`title`/`subjectSymbols` (see
      // `investigation-event.ts`), and the real step arrives on its own
      // `STEP_STARTED`, which always follows in the same stream.
      return { ...state, investigationId: event.investigation.id };

    case "STEP_STARTED":
      // **Spreads the existing row rather than rebuilding it** (Task
      // 7.3.3) — the one change that lets a second press's stale claim
      // survive into this run's own queued-then-running states exactly as
      // AC 11 asks: "queued/running states render exactly as they do
      // today otherwise." A first press's row is the untouched
      // `PLACEHOLDER_STEP`, so spreading it is a no-op there; only a row
      // `resetForNewRun` carried a claim onto actually keeps anything.
      return {
        ...state,
        steps: updateStep(state.steps, event.stepId, (step) => ({
          ...step,
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

    case "TOOL_CALL_COMPLETED": {
      // **Corrected 2026-11-23 (Task 7.3.1), and corrected again 2026-11-24
      // (Task 7.3.5), on two different mistakes about the same case.** The
      // first correction was right about `ok`/`refused`: the reader for
      // those is the **backend's** own `toFinding`, which derives a claim
      // from the tool's TYPED output before the erasure to `JsonValue` —
      // invariant 1, since a browser assembling a sentence from a wire
      // record would be a second producer of a figure nobody can eyeball.
      // That part is unchanged: `ok` and `refused` still change nothing
      // here, because what they draw is `FINDING_CREATED`'s own claim,
      // arriving on its own event a moment later.
      //
      // **What was wrong is `inapplicable`.** Story 7.3's own Gate 1 settled
      // "the row draws the inapplicability's own sentence with no
      // confidence mark at all" — and `inapplicable` mints no `Finding` at
      // all (AC 3's own refusal to let *the question does not arise*
      // collapse onto `UNKNOWN`), so there is no `FINDING_CREATED` coming
      // for this row, ever. The claim has to be built HERE, from this
      // event's own closed, already-known `because` word — never a figure,
      // never invariant 1's concern, because nothing was measured.
      if (event.outcome.kind !== "inapplicable") return state;

      const tool = isToolName(event.tool) ? event.tool : undefined;
      const because = isToolInapplicability(event.outcome.because)
        ? event.outcome.because
        : undefined;
      // Defensive rather than reachable in practice: both come off this
      // product's OWN wire, and `tool` is validated by `STEP_STARTED` three
      // events earlier for the same step. A sentence this bundle cannot
      // build is a silent no-op — the same shape as a confidence level it
      // does not recognise (`investigation-event.ts`'s own decoder case) —
      // rather than a thrown error over a cosmetic sentence.
      if (tool === undefined || because === undefined) return state;

      return {
        ...state,
        steps: updateStep(state.steps, event.stepId, (step) => ({
          ...step,
          claim: inapplicableClaim(FINDING_TYPE_FOR_TOOL[tool], because),
          // **Explicit, not merely the default** — a stale carried-forward
          // claim (Task 7.3.3) can bring a REAL confidence level with it
          // (`SUPPORTED`, say), and spreading `...step` alone would leave
          // that stale confidence sitting beside this run's own claim,
          // which has none. Caught by this task's own test before it
          // reached a browser.
          confidence: undefined,
          stale: false,
        })),
      };
    }

    case "FINDING_CREATED":
      // **Keyed on the FINDING's own `stepId`**, which is the one home for
      // *which step produced this* — the envelope deliberately carries no
      // second copy, so there is no second field here to disagree with it.
      //
      // The claim lands on a row that is still `running`: the orchestrator
      // emits this before that step's `STEP_COMPLETED`, so a reader's row
      // learns what was measured in the same frame it learns the step
      // finished rather than completing first and growing a line afterwards.
      // `stale: false` in the same write — this IS the row's own
      // re-completion AC 11 names: a second press's carried-forward claim
      // is replaced by a real one here, not merely covered by it.
      return {
        ...state,
        steps: updateStep(state.steps, event.finding.stepId, (step) => ({
          ...step,
          claim: event.finding.claim,
          confidence: event.finding.confidence,
          stale: false,
        })),
      };

    case "STEP_COMPLETED":
      // **A row still `stale` here never got THIS run's own
      // `FINDING_CREATED`** — that event always precedes `STEP_COMPLETED`
      // and clears the flag itself, so `stale` surviving to this point
      // means this run's own outcome was `inapplicable` (or otherwise
      // minted nothing). The carried-forward claim is a PREVIOUS run's
      // answer to a question this run never asked, and is dropped here
      // rather than left to read as current — the same honest-absence
      // shape a first-press `inapplicable` step already draws.
      return {
        ...state,
        steps: updateStep(state.steps, event.stepId, (step) => ({
          ...step,
          status: "completed",
          completedAt: step.startedAt,
          durationMs: event.durationMs,
          ...(step.stale ? { claim: undefined, confidence: undefined } : {}),
          stale: false,
        })),
      };

    case "INVESTIGATION_COMPLETED":
      return { ...state, terminal: true };

    case "INVESTIGATION_FAILED":
      // **`terminal` and nothing else, which is the whole of the repair**
      // (Task 7.3.1). This event has had a backend wire case since Task
      // 7.2.1 and no decoder case at all, so a thrown tool was dropped as
      // `unsupported`, the stream then ended with no terminal event this
      // reducer had seen, and `withConnectionLost` drew the
      // dropped-connection sentence — a run that failed reported as a
      // network fault.
      //
      // **No new reader-facing sentence, by decision.** `terminal` is what
      // stops the wrong one being drawn; the right one — what a reader is
      // told about a failed run, and the per-step degradation around it — is
      // Story 7.5's scope, and that story's own `STORY.md` carries this as a
      // constraint it inherits. A sentence written here would be the second
      // home that story would then have to find.
      return { ...state, terminal: true };

    case "WORKSPACE_COMMAND":
      // **The checklist's state is unchanged by a workspace command, and that
      // is a decision rather than a stub** (Task 7.4.1).
      //
      // A command is an instruction to a DIFFERENT surface — `/`'s topology —
      // and Story 7.4's Gate 1 settled where it is held: lifted into
      // `App.tsx`, outside `<Routes>`, mirroring the existing `onLiveSymbols`
      // upward callback, because the checklist itself stays pinned to the
      // security page per Story 7.1's own decision. Holding it here as well
      // would be a second home for one fact, and the checklist draws no row
      // for it: the command is not a step, has no outcome a reader grades, and
      // adding one would make `INVESTIGATION_STEP_COUNT` disagree with the
      // pipeline (`the-checklist-seeds-one-row-per-tool`).
      //
      // The case exists rather than falling to `default` so this reducer stays
      // exhaustive: a tenth event type is a compile error here, which is the
      // only form of that reminder nobody can forget.
      return state;

    default: {
      // Exhaustive over the nine members `WireInvestigationEvent` has today.
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
