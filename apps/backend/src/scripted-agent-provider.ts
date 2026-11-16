// The deterministic `AgentProvider` (`PRODUCT_SPEC.md` §32, invariant 7) —
// "scripted" because nothing here calls a model. It runs a fixed list of
// tools in order and narrates the run as the same six events a real agent
// will eventually produce, so Task 7.1.3's route and Task 7.1.4's UI are
// built against the real shape of a run rather than a stub that happens to
// look similar.
//
// `runInvestigation(context, tools)` rather than `runInvestigation(tools)`:
// the investigation's id, subject and `asOf` are minted by the CALLER
// (Task 7.1.3's route) and threaded in, because this story's own
// `investigation-store.ts` holds more than one investigation at once
// (`Current investigations` is a list) — an id-addressed design from the
// start, rather than the parameterless `streamEvents()`/`cancel()` §32's own
// pseudocode sketches, which assumes exactly one run exists to talk about.

import { randomUUID } from "node:crypto";

import { isTerminalEventType, toStepId } from "@marketpulse/shared";

import type {
  CompletedStep,
  Investigation,
  InvestigationEvent,
  InvestigationId,
  InvestigationMode,
  QueuedStep,
  RunningStep,
  Step,
  Ticker,
} from "@marketpulse/shared";
import type { RunnableTool, ToolContext } from "./analytical-tool.js";
import type { InvestigationStore } from "./investigation-store.js";

export interface RunInvestigationContext {
  readonly id: InvestigationId;
  readonly title: string;
  readonly subjectSymbols: readonly Ticker[];
  readonly mode: InvestigationMode;
  /** Invariant 4's own hook — threaded to every tool call this run makes,
   * never read from a clock inside this module. */
  readonly asOf: Date;
}

export interface AgentProvider {
  runInvestigation: (
    context: RunInvestigationContext,
    tools: readonly RunnableTool[],
  ) => Promise<Investigation>;
  /** Replays `eventsFrom(id, fromSeq)` and then live-follows until a
   * terminal event — "replay from the beginning is not a corner case, it
   * is the common one" (a client attaching after the run started). */
  streamEvents: (
    id: InvestigationId,
    fromSeq: number,
  ) => AsyncIterable<InvestigationEvent>;
  /** A documented no-op this story: nothing in a scripted, single-tool
   * pipeline can be meaningfully interrupted mid-run. Story 7.5 gives
   * this a real effect once a run can take long enough to want one. */
  cancel: (id: InvestigationId) => void;
}

export interface ScriptedAgentProviderOptions {
  readonly store: InvestigationStore;
  /** The clock, seamed as a required dependency rather than read inside
   * this module — the one way to measure a step's own duration without
   * this file itself calling `Date.now()` or a zero-argument `new
   * Date()`. */
  readonly now: () => Date;
}

function withStep(investigation: Investigation, step: Step): Investigation {
  return {
    ...investigation,
    steps: investigation.steps.map((existing) =>
      existing.id === step.id ? step : existing,
    ),
  };
}

export function createScriptedAgentProvider(
  options: ScriptedAgentProviderOptions,
): AgentProvider {
  const { store, now } = options;

  async function runInvestigation(
    context: RunInvestigationContext,
    tools: readonly RunnableTool[],
  ): Promise<Investigation> {
    const { id, title, subjectSymbols, mode, asOf } = context;

    let seq = 0;
    const nextSeq = (): number => {
      seq += 1;
      return seq;
    };

    const queuedSteps: QueuedStep[] = tools.map((tool) => ({
      id: toStepId(randomUUID()),
      description: tool.description,
      tool: tool.name,
      status: "queued",
    }));

    let investigation: Investigation = {
      id,
      title,
      createdAt: now(),
      mode,
      status: "running",
      subjectSymbols,
      currentTime: asOf,
      steps: queuedSteps,
    };

    store.create(investigation);
    store.appendEvent(id, {
      type: "INVESTIGATION_STARTED",
      seq: nextSeq(),
      investigationId: id,
      investigation,
    });

    for (const [index, tool] of tools.entries()) {
      const queuedStep = queuedSteps[index];
      // `queuedSteps` was built by mapping over this same `tools` array,
      // so the two are always the same length.
      if (queuedStep === undefined) continue;

      const startedAt = now();
      const runningStep: RunningStep = {
        ...queuedStep,
        status: "running",
        startedAt,
      };
      investigation = withStep(investigation, runningStep);
      store.update(id, investigation);
      store.appendEvent(id, {
        type: "STEP_STARTED",
        seq: nextSeq(),
        investigationId: id,
        stepId: queuedStep.id,
        description: queuedStep.description,
        tool: queuedStep.tool,
        startedAt,
      });

      store.appendEvent(id, {
        type: "TOOL_CALL_STARTED",
        seq: nextSeq(),
        investigationId: id,
        stepId: queuedStep.id,
        tool: queuedStep.tool,
      });

      const toolContext: ToolContext = {
        investigationId: id,
        asOf,
        mode,
      };
      const outcome = await tool.run(subjectSymbols, toolContext);

      const completedAt = now();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      store.appendEvent(id, {
        type: "TOOL_CALL_COMPLETED",
        seq: nextSeq(),
        investigationId: id,
        stepId: queuedStep.id,
        tool: queuedStep.tool,
        durationMs,
        outcome,
      });

      const completedStep: CompletedStep = {
        ...runningStep,
        status: "completed",
        completedAt,
        durationMs,
      };
      investigation = withStep(investigation, completedStep);
      store.update(id, investigation);
      store.appendEvent(id, {
        type: "STEP_COMPLETED",
        seq: nextSeq(),
        investigationId: id,
        stepId: queuedStep.id,
        status: "completed",
        durationMs,
      });
    }

    const completedAt = now();
    investigation = { ...investigation, status: "completed" };
    store.update(id, investigation);
    store.appendEvent(id, {
      type: "INVESTIGATION_COMPLETED",
      seq: nextSeq(),
      investigationId: id,
      status: "completed",
      completedAt,
      stepCount: tools.length,
    });

    return investigation;
  }

  function streamEvents(
    id: InvestigationId,
    fromSeq: number,
  ): AsyncIterable<InvestigationEvent> {
    return (async function* stream() {
      const seen = new Set<number>();

      for (const event of store.eventsFrom(id, fromSeq)) {
        seen.add(event.seq);
        yield event;
        if (isTerminalEventType(event.type)) return;
      }

      const pending: InvestigationEvent[] = [];
      let wake: (() => void) | undefined;

      const unsubscribe = store.onEvent(id, (event) => {
        if (seen.has(event.seq)) return;
        pending.push(event);
        wake?.();
      });

      try {
        for (;;) {
          const event = pending.shift();
          if (event === undefined) {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
            continue;
          }
          seen.add(event.seq);
          yield event;
          if (isTerminalEventType(event.type)) return;
        }
      } finally {
        unsubscribe();
      }
    })();
  }

  function cancel(): void {
    // Documented no-op for this story — see the interface comment above.
    // No parameter: a function with fewer parameters than the
    // `AgentProvider.cancel` type still satisfies it, and naming an
    // argument this body never reads is the thing `no-unused-vars` exists
    // to catch. `scripted-agent-provider.test.ts` asserts the target
    // investigation's status is unchanged by calling this.
  }

  return { runInvestigation, streamEvents, cancel };
}
