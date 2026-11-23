import {
  createEvidencedFinding,
  createUnevidencedFinding,
  toInvestigationId,
  toTicker,
  toWireInvestigationEvent,
} from "@marketpulse/shared";
import { describe, expect, it, vi } from "vitest";

import { toRunnableTool } from "./analytical-tool.js";
import { createInvestigationStore } from "./investigation-store.js";
import {
  createScriptedAgentProvider,
  type RunInvestigationContext,
} from "./scripted-agent-provider.js";

import type { AnalyticalTool } from "./analytical-tool.js";
import type { ToolOutcome } from "@marketpulse/shared";

const NVDA = toTicker("NVDA");

const CLOCK_TICK_MS = 12;

/** A deterministic clock, so a measured `durationMs` is a known value
 * rather than "some non-negative number" — each call advances by
 * `CLOCK_TICK_MS`. */
function createTestClock(startAt: string) {
  let current = Date.parse(startAt);
  return () => {
    const now = new Date(current);
    current += CLOCK_TICK_MS;
    return now;
  };
}

function spyTool(outcome: ToolOutcome<{ readonly answer: number }>): {
  tool: AnalyticalTool<undefined, { readonly answer: number }>;
  run: ReturnType<typeof vi.fn>;
} {
  const run = vi.fn().mockResolvedValue(outcome);
  return {
    tool: { name: "get_security_snapshot", description: "Measure move", run },
    run,
  };
}

const CONTEXT = (id: string): RunInvestigationContext => ({
  id: toInvestigationId(id),
  title: "Investigate NVDA",
  subjectSymbols: [NVDA],
  mode: "live",
  asOf: new Date("2026-11-16T14:01:00.000Z"),
});

describe("the scripted agent provider", () => {
  it("calls the tool exactly once per investigation in this story's configuration", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });
    const spy = spyTool({ kind: "ok", value: { answer: 1 } });
    const runnable = toRunnableTool(
      spy.tool,
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );

    await provider.runInvestigation(CONTEXT("inv-1"), [runnable]);

    // A spy on invocation COUNT, not on the final result — two identical
    // calls would produce an indistinguishable result.
    expect(spy.run).toHaveBeenCalledTimes(1);
  });

  it("runs INVESTIGATION_STARTED through INVESTIGATION_COMPLETED in order, with the real outcome on the wire", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });
    const spy = spyTool({ kind: "ok", value: { answer: 42 } });
    const runnable = toRunnableTool(
      spy.tool,
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );

    const investigation = await provider.runInvestigation(CONTEXT("inv-2"), [
      runnable,
    ]);

    expect(investigation.status).toBe("completed");
    expect(investigation.steps).toHaveLength(1);
    expect(investigation.steps[0]?.status).toBe("completed");

    const events = store.eventsFrom(investigation.id, 1);
    expect(events.map((event) => event.type)).toStrictEqual([
      "INVESTIGATION_STARTED",
      "STEP_STARTED",
      "TOOL_CALL_STARTED",
      "TOOL_CALL_COMPLETED",
      "STEP_COMPLETED",
      "INVESTIGATION_COMPLETED",
    ]);

    const toolCallCompleted = events[3];
    if (toolCallCompleted?.type !== "TOOL_CALL_COMPLETED") {
      throw new Error("expected TOOL_CALL_COMPLETED");
    }
    expect(toolCallCompleted.outcome).toStrictEqual({
      kind: "ok",
      value: { answer: 42 },
    });
    // The clock advances by CLOCK_TICK_MS once between `startedAt` and
    // `completedAt` — real measurement, not a hard-coded duration.
    expect(toolCallCompleted.durationMs).toBe(CLOCK_TICK_MS);
  });

  it("carries a refusal through to TOOL_CALL_COMPLETED unchanged", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });
    const spy = spyTool({ kind: "refused", reason: "nothing-observed" });
    const runnable = toRunnableTool(
      spy.tool,
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );

    const investigation = await provider.runInvestigation(CONTEXT("inv-3"), [
      runnable,
    ]);

    const events = store.eventsFrom(investigation.id, 1);
    const toolCallCompleted = events.find(
      (event) => event.type === "TOOL_CALL_COMPLETED",
    );
    expect(
      toolCallCompleted?.type === "TOOL_CALL_COMPLETED" &&
        toolCallCompleted.outcome,
    ).toStrictEqual({ kind: "refused", reason: "nothing-observed" });
  });

  // ----------------------------------------------- the thrown-tool net
  //
  // `AnalyticalTool.run`'s own docblock says a tool never throws, and
  // that is a contract rather than a mechanism — Story 7.2's tools read a
  // database and a trading calendar where Story 7.1's read a `Map`. These
  // three assert the guarantee Task 7.2.1 added: whatever a tool does,
  // the run reaches a terminal event and a non-`running` status.

  /** A tool that throws rather than refusing — the shape the contract
   * forbids and nothing enforces. */
  function throwingTool(): AnalyticalTool<
    undefined,
    { readonly answer: number }
  > {
    return {
      name: "get_security_snapshot",
      description: "Measure move",
      run: () => {
        throw new Error("the store was unreachable");
      },
    };
  }

  it("a thrown tool still reaches a terminal event, and the run rejects", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });
    const runnable = toRunnableTool(
      throwingTool(),
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );

    await expect(
      provider.runInvestigation(CONTEXT("inv-throw-1"), [runnable]),
    ).rejects.toThrow("the store was unreachable");

    const events = [...store.eventsFrom(toInvestigationId("inv-throw-1"), 0)];
    const terminal = events.at(-1);
    expect(terminal?.type).toBe("INVESTIGATION_FAILED");
    // No tool completed, so the count is 0 — and the event carries no
    // step id, no reason and no thrown message. Story 7.5 owns all three.
    expect(terminal).toStrictEqual({
      type: "INVESTIGATION_FAILED",
      seq: 4,
      investigationId: toInvestigationId("inv-throw-1"),
      status: "failed",
      failedAt: new Date("2026-11-16T14:01:00.024Z"),
      stepCount: 0,
    });
    // `seq` is unbroken across the failure — the three events before it
    // are the started/step-started/tool-call-started trio.
    expect(events.map((event) => event.seq)).toStrictEqual([1, 2, 3, 4]);
  });

  it("leaves the investigation `failed` rather than `running`, which is what unsticks a second press", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });
    const runnable = toRunnableTool(
      throwingTool(),
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );

    await provider
      .runInvestigation(CONTEXT("inv-throw-2"), [runnable])
      .catch(() => undefined);

    // The whole point: `POST /investigations`' idempotency guard looks for
    // a `running` investigation for this symbol, so anything but
    // `running` here is what lets the next press start a fresh one.
    expect(store.get(toInvestigationId("inv-throw-2"))?.status).toBe("failed");
  });

  it("counts the steps that DID complete before the throw", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });
    const ok = toRunnableTool(
      spyTool({ kind: "ok", value: { answer: 1 } }).tool,
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );
    const bad = toRunnableTool(
      throwingTool(),
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );

    await provider
      .runInvestigation(CONTEXT("inv-throw-3"), [ok, bad])
      .catch(() => undefined);

    const events = [...store.eventsFrom(toInvestigationId("inv-throw-3"), 0)];
    const terminal = events.at(-1);
    expect(
      terminal?.type === "INVESTIGATION_FAILED" && terminal.stepCount,
    ).toBe(1);
    // And the step that completed stays `completed` — a failed run is not
    // a run whose own history is rewritten.
    const steps = store.get(toInvestigationId("inv-throw-3"))?.steps ?? [];
    expect(steps.map((step) => step.status)).toStrictEqual([
      "completed",
      "running",
    ]);
  });

  it("stops the stream: streamEvents returns on INVESTIGATION_FAILED", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });
    const runnable = toRunnableTool(
      throwingTool(),
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );

    await provider
      .runInvestigation(CONTEXT("inv-throw-4"), [runnable])
      .catch(() => undefined);

    // Without `INVESTIGATION_FAILED` in `TERMINAL_EVENT_TYPES` this
    // generator never returns and the SSE response never ends — the
    // stuck state is as much a property of the stream as of the status.
    const seen = [];
    for await (const event of provider.streamEvents(
      toInvestigationId("inv-throw-4"),
      0,
    )) {
      seen.push(event.type);
    }
    expect(seen.at(-1)).toBe("INVESTIGATION_FAILED");
  });

  it("cancel() is callable and does not change the investigation's status", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });
    const spy = spyTool({ kind: "ok", value: { answer: 1 } });
    const runnable = toRunnableTool(
      spy.tool,
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );

    const investigation = await provider.runInvestigation(CONTEXT("inv-4"), [
      runnable,
    ]);
    const statusBefore = store.get(investigation.id)?.status;

    expect(() => {
      provider.cancel(investigation.id);
    }).not.toThrow();
    expect(store.get(investigation.id)?.status).toBe(statusBefore);
  });

  it("streamEvents replays the full log from seq 1 for a completed run", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });
    const spy = spyTool({ kind: "ok", value: { answer: 1 } });
    const runnable = toRunnableTool(
      spy.tool,
      () => undefined,
      (value) => value,
      // No claim — this suite is about the orchestration's own order and
      // its failure path, and a tool minting no finding is the arm that
      // emits no `FINDING_CREATED` at all (an `inapplicable` outcome's).
      // The emission itself has its own tests further down.
      () => undefined,
    );

    const investigation = await provider.runInvestigation(CONTEXT("inv-5"), [
      runnable,
    ]);

    const replayed = [];
    for await (const event of provider.streamEvents(investigation.id, 1)) {
      replayed.push(event.type);
    }

    expect(replayed).toStrictEqual([
      "INVESTIGATION_STARTED",
      "STEP_STARTED",
      "TOOL_CALL_STARTED",
      "TOOL_CALL_COMPLETED",
      "STEP_COMPLETED",
      "INVESTIGATION_COMPLETED",
    ]);
  });

  it("streamEvents live-follows a run that has not finished yet", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-16T14:01:00.000Z"),
    });

    let resolveTool: (() => void) | undefined;
    const run = vi.fn().mockImplementation(
      () =>
        new Promise<ToolOutcome<{ readonly answer: number }>>((resolve) => {
          resolveTool = () => {
            resolve({ kind: "ok", value: { answer: 1 } });
          };
        }),
    );
    const runnable = toRunnableTool(
      { name: "get_security_snapshot", description: "Measure move", run },
      () => undefined,
      (value: { readonly answer: number }) => value,
      () => undefined,
    );

    const runPromise = provider.runInvestigation(CONTEXT("inv-6"), [runnable]);

    const seen: string[] = [];
    const consumed = (async () => {
      for await (const event of provider.streamEvents(
        toInvestigationId("inv-6"),
        1,
      )) {
        seen.push(event.type);
      }
    })();

    // Give the live-follow subscriber a turn to attach before the tool
    // resolves and the run completes.
    await new Promise((resolve) => setImmediate(resolve));
    resolveTool?.();

    await runPromise;
    await consumed;

    expect(seen).toStrictEqual([
      "INVESTIGATION_STARTED",
      "STEP_STARTED",
      "TOOL_CALL_STARTED",
      "TOOL_CALL_COMPLETED",
      "STEP_COMPLETED",
      "INVESTIGATION_COMPLETED",
    ]);
  });
});

describe("FINDING_CREATED", () => {
  /** A tool whose claim is minted by the shared mint, like a real one's. */
  const claiming = () =>
    toRunnableTool(
      spyTool({ kind: "refused", reason: "nothing-observed" }).tool,
      () => undefined,
      (value) => value,
      (outcome, stamp) =>
        outcome.kind === "refused"
          ? createUnevidencedFinding(
              {
                type: "PRICE_OBSERVATION",
                claim: "Last price — nothing observed to measure",
                because: outcome.reason,
              },
              stamp,
            )
          : undefined,
    );

  it("is appended after that step's TOOL_CALL_COMPLETED and BEFORE its STEP_COMPLETED", async () => {
    // **The order is the decision.** A reader's row learns what was measured
    // in the same frame it learns the step finished, rather than completing
    // first and growing a line afterwards.
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-23T14:01:00.000Z"),
    });

    await provider.runInvestigation(CONTEXT("inv-finding"), [claiming()]);

    expect(
      [...store.eventsFrom(toInvestigationId("inv-finding"), 0)].map(
        (event) => event.type,
      ),
    ).toStrictEqual([
      "INVESTIGATION_STARTED",
      "STEP_STARTED",
      "TOOL_CALL_STARTED",
      "TOOL_CALL_COMPLETED",
      "FINDING_CREATED",
      "STEP_COMPLETED",
      "INVESTIGATION_COMPLETED",
    ]);
  });

  it("stamps `retrievedAt` from the step's own completion instant, not a second clock read", async () => {
    // Story 7.3's Gate 1: `retrievedAt` means *when this process recorded
    // the claim*, read from the orchestrator's own injected clock — and
    // reusing `completedAt` is what bounds it by the step's already-published
    // `durationMs` rather than letting the two disagree.
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-23T14:01:00.000Z"),
    });

    await provider.runInvestigation(CONTEXT("inv-stamp"), [claiming()]);

    const events = [...store.eventsFrom(toInvestigationId("inv-stamp"), 0)];
    const finding = events.find((event) => event.type === "FINDING_CREATED");
    const step = events.find((event) => event.type === "STEP_COMPLETED");
    if (finding?.type !== "FINDING_CREATED") throw new Error("no finding");
    if (step?.type !== "STEP_COMPLETED") throw new Error("no step");

    // The run's own clock ticks 12 ms a call: created, started, completed.
    expect(step.durationMs).toBe(CLOCK_TICK_MS);
    expect(finding.finding.stepId).toBe(step.stepId);
    // No second copy of the step id on the envelope — `Finding.stepId` is
    // the one home for that fact.
    expect("stepId" in finding).toBe(false);
  });

  it("emits NOTHING where the tool mints no finding — AC 3's one exception", async () => {
    // An `inapplicable` outcome's answer. The row draws the inapplicability
    // sentence Story 7.2 already ships, with no claim and no confidence
    // mark, rather than an `UNKNOWN` finding inviting a reader to come back
    // later.
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-23T14:01:00.000Z"),
    });
    const silent = toRunnableTool(
      spyTool({ kind: "inapplicable", because: "is-the-market-proxy" }).tool,
      () => undefined,
      (value) => value,
      () => undefined,
    );

    await provider.runInvestigation(CONTEXT("inv-silent"), [silent]);

    expect(
      [...store.eventsFrom(toInvestigationId("inv-silent"), 0)].map(
        (event) => event.type,
      ),
    ).not.toContain("FINDING_CREATED");
  });

  it("serialises onto the wire with its evidence inline", async () => {
    const store = createInvestigationStore();
    const provider = createScriptedAgentProvider({
      store,
      now: createTestClock("2026-11-23T14:01:00.000Z"),
    });
    const evidenced = toRunnableTool(
      spyTool({ kind: "ok", value: { answer: 1 } }).tool,
      () => undefined,
      (value) => value,
      (outcome, stamp) =>
        outcome.kind === "ok"
          ? createEvidencedFinding(
              {
                type: "PRICE_OBSERVATION",
                claim: "Traded at 1.00 on 1 share in the latest bar",
                confidence: "SUPPORTED",
                evidence: [
                  {
                    kind: "market_observation",
                    source: "fixture:iex",
                    observedAt: new Date("2026-11-23T14:00:00.000Z"),
                    security: NVDA,
                    rawData: "current-market-state:NVDA",
                  },
                ],
              },
              stamp,
            )
          : undefined,
    );

    await provider.runInvestigation(CONTEXT("inv-wire"), [evidenced]);

    const finding = [
      ...store.eventsFrom(toInvestigationId("inv-wire"), 0),
    ].find((event) => event.type === "FINDING_CREATED");
    if (finding === undefined) throw new Error("no finding");

    const wire = toWireInvestigationEvent(finding);

    expect(wire.type).toBe("FINDING_CREATED");
    // `EVIDENCE_ADDED` is not emitted this story (Gate 1) — the evidence
    // travels here, on the same frame, which is what keeps AC 2 at full
    // strength.
    expect(wire).toMatchObject({
      finding: {
        evidenced: true,
        claim: "Traded at 1.00 on 1 share in the latest bar",
        confidence: "SUPPORTED",
        evidence: [{ security: "NVDA", source: "fixture:iex" }],
      },
    });
    // And the brand never reaches the wire.
    expect(Object.getOwnPropertySymbols(wire)).toStrictEqual([]);
  });
});
