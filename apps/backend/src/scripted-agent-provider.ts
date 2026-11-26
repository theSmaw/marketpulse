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

import {
  isTerminalEventType,
  toFindingId,
  toStepId,
} from "@marketpulse/shared";

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
  WorkspaceCommandOutcome,
} from "@marketpulse/shared";
import type { RunnableTool, ToolContext } from "./analytical-tool.js";
import type { InvestigationStore } from "./investigation-store.js";
import type { WorkspaceCommandProducer } from "./workspace-command-pipeline.js";

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
  /**
   * **Invariant 2's producers** (Task 7.4.1) — asked after the step whose tool
   * each one names, and defaulting to none.
   *
   * A list rather than one, and a seam rather than a call, because this module
   * is the orchestrator Epic 10 replaces and it must know nothing about
   * topology, sectors or correlations. What it knows is *after this tool's
   * step completes, ask this producer whether there is a command*, which is
   * the whole of its part in the pipeline.
   *
   * Defaulted to `[]` rather than required, so every existing construction of
   * this provider — including every test — stays correct and a run with no
   * producers emits no `WORKSPACE_COMMAND` at all rather than an empty one.
   */
  readonly workspaceCommands?: readonly WorkspaceCommandProducer[];
  /**
   * **Where a workspace-command producer's own failure goes** —
   * `live-bar-writer.ts`'s own `warn` seam, same signature, for the same
   * reason: this process must log that something degraded without the logger
   * being a thing this module reaches for.
   *
   * Optional with a no-op default, because the alternative is editing twenty
   * existing provider constructions in tests that have no producer and
   * therefore no failure to report. The one real construction site
   * (`index.ts`) passes Fastify's own logger, which is where this matters.
   */
  readonly warn?: (fields: object, message: string) => void;
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
  const {
    store,
    now,
    workspaceCommands = [],
    warn = () => {
      // See `ScriptedAgentProviderOptions.warn`. A no-op is correct for a
      // provider with no producers, which is every construction in a test.
    },
  } = options;

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

    // **The thrown-tool safety net (Task 7.2.1), and why it wraps the whole
    // loop rather than one tool call.**
    //
    // `AnalyticalTool.run`'s own docblock says a tool never throws —
    // invariant 5's "not enough evidence" is a first-class `ToolOutcome`
    // and the type has no third, thrown member. That is a contract, and a
    // contract nothing enforces expires quietly: Story 7.2's four new
    // tools read a database and a trading calendar where Story 7.1's one
    // tool read an in-memory `Map`. Before this, a throw left the loop
    // with **no terminal event at all** — the investigation sat `running`
    // for ever, the SSE response never ended (its reader waits on
    // `isTerminalEventType`), the store never evicted the entry, and
    // `POST /investigations`' second-press idempotency handed the stuck
    // run back, so `Investigate` was permanently dead for that symbol
    // until a backend restart.
    //
    // `completedSteps` is declared OUT here rather than inside the loop
    // because the failure path reports it, and a count read after the
    // `catch` has to have survived the throw.
    let completedSteps = 0;

    try {
      await runSteps();
    } catch (error) {
      const failedAt = now();
      investigation = { ...investigation, status: "failed" };
      store.update(id, investigation);
      store.appendEvent(id, {
        type: "INVESTIGATION_FAILED",
        seq: nextSeq(),
        investigationId: id,
        status: "failed",
        failedAt,
        // How many steps completed before the throw — never WHICH one and
        // never the thrown message. Both are Story 7.5's, which already
        // has `FailedStep.reason` typed and waiting.
        stepCount: completedSteps,
      });
      // **Re-thrown, not swallowed.** The route's own `run.catch(...)`
      // logs it; a provider that answered a resolved `Investigation`
      // after a failure would be a second, quieter lie than the stuck
      // state this replaces.
      throw error;
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

    /** The per-tool loop, named only so the guarantee above can be written
     * once around all of it rather than per tool call. Reads and writes
     * `investigation`, `seq` and `completedSteps` from the enclosing run. */
    async function runSteps(): Promise<void> {
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
        const run = await tool.run(subjectSymbols, toolContext);

        const completedAt = now();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        store.appendEvent(id, {
          type: "TOOL_CALL_COMPLETED",
          seq: nextSeq(),
          investigationId: id,
          stepId: queuedStep.id,
          tool: queuedStep.tool,
          durationMs,
          outcome: run.outcome,
        });

        // **The claim (Task 7.3.1), and this is where `Evidence.retrievedAt`
        // comes from.**
        //
        // The stamp is filled here rather than inside the tool because the
        // instant does not exist when `run` returns: Story 7.3's Gate 1
        // settled that `retrievedAt` means *when this process recorded the
        // claim*, read from the orchestrator's own injected `now` — the one
        // seam in this product that legitimately reads the real clock — which
        // leaves `a-tool-reads-no-clock` at full strength and every tool
        // signature untouched. `completedAt` is reused rather than taken
        // again, so the field is bounded by the step's own already-published
        // `durationMs` and the two cannot disagree.
        //
        // **`undefined` is the `inapplicable` answer and no event is emitted
        // at all.** AC 3's one exception: *the question does not arise* is a
        // different, permanent fact from *not enough evidence*, so that row
        // draws the inapplicability Story 7.2 already ships with no claim and
        // no confidence mark, rather than an `UNKNOWN` finding inviting a
        // reader to come back later.
        //
        // **Before `STEP_COMPLETED`**, deliberately: a reader's row learns
        // what was measured in the same frame it learns the step finished,
        // rather than completing first and growing a line afterwards.
        const finding = run.mintFinding({
          findingId: toFindingId(randomUUID()),
          stepId: queuedStep.id,
          retrievedAt: completedAt,
        });

        if (finding !== undefined) {
          store.appendEvent(id, {
            type: "FINDING_CREATED",
            seq: nextSeq(),
            investigationId: id,
            // No top-level `stepId` — `Finding.stepId` is the one home for
            // that fact, and the envelope carries no second copy.
            finding,
          });
        }

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

        completedSteps += 1;

        // **Invariant 2's own event, after the step it follows** (Task 7.4.1).
        //
        // **After `STEP_COMPLETED` rather than before it, which is the
        // opposite of `FINDING_CREATED`'s placement a few lines up.** A
        // finding is *what that step measured* and belongs inside the step's
        // own frame; a command is *what follows from it*, and a reader must
        // not meet the consequence of a step before the step has finished.
        //
        // **Asked regardless of this step's own outcome**, which is Story
        // 7.4's AC 3 in as many words and the reason this feature is reachable
        // at all on CI: the peer-comparison step refuses there for ever (zero
        // bars, no provider), and a highlight derived from the subject's
        // curated sector is correct anyway. There is deliberately no read of
        // `run.outcome` here — `a-tool-takes-no-channel-to-another-step`'s own
        // spirit, one layer out: a producer that branched on a step's measured
        // result would make the command a function of the market rather than
        // of the universe.
        //
        // `undefined` is *nothing to say* and emits no event: an untracked
        // subject, or one with no related securities under any kind. An empty
        // `highlightNodes` payload is never produced — ADR 0029, and
        // structurally impossible besides, because `symbols` is a non-empty
        // tuple.
        //
        // **A producer that THROWS degrades locally and the run continues**
        // (added on Story 7.4's review, before merge). `propose` reaches a
        // real database read — `RelationshipsCache.generationAsOf` throws
        // rather than swallowing, deliberately, so a reader of
        // `/market-data/relationships` meets a 503 instead of a body claiming
        // there are no relationships. Here that obligation inverts: this path
        // is **purely cosmetic**, and `compare_securities` is step 4 of 6, so
        // an unwrapped throw took out market breadth and the rolling
        // correlation too, terminating the whole investigation `failed` over a
        // highlight nobody asked for. `CLAUDE.md`'s own rule —
        // *degrade incrementally and locally; a failed analytical tool must
        // leave the rest of the workspace intact* — applied to the one path in
        // this loop that is not a finding.
        //
        // The throw is **not** turned into a refusal: `refused` means *we
        // declined to execute that*, a statement about the command, and a
        // database that could not be read is a statement about us. There is no
        // third wire arm for it because there is no reader for one — Task
        // 7.4.2 draws nothing for a command that never arrived, which is
        // exactly the same picture as a subject with no related securities.
        for (const producer of workspaceCommands) {
          if (producer.afterTool !== queuedStep.tool) continue;

          let outcome: WorkspaceCommandOutcome | undefined;
          try {
            outcome = await producer.propose(subjectSymbols, asOf);
          } catch (error) {
            warn(
              {
                investigationId: id,
                stepId: queuedStep.id,
                tool: queuedStep.tool,
                err: error,
              },
              "a workspace-command producer failed; the investigation continues",
            );
            continue;
          }
          if (outcome === undefined) continue;

          store.appendEvent(id, {
            type: "WORKSPACE_COMMAND",
            seq: nextSeq(),
            investigationId: id,
            // The envelope carries `stepId`, unlike `FINDING_CREATED` —
            // a `WorkspaceCommand` has no such field of its own and must not
            // gain one. See the event's own docblock.
            stepId: queuedStep.id,
            outcome,
          });
        }
      }
    }
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
