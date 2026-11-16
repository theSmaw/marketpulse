import { toInvestigationId, toTicker } from "@marketpulse/shared";
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
