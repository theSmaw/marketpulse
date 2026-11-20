import { describe, expect, it } from "vitest";

import type { WireInvestigationEvent } from "./investigation-event.js";
import {
  applyInvestigationEvent,
  INVESTIGATION_STEP_COUNT,
  optimisticChecklist,
  withConnectionLost,
  withInvestigationId,
} from "./investigation-checklist-state.js";

const BASE: WireInvestigationEvent & { type: "INVESTIGATION_STARTED" } = {
  type: "INVESTIGATION_STARTED",
  seq: 1,
  investigationId: "inv-1",
  investigation: {
    id: "inv-1",
    title: "Investigate NVDA",
    subjectSymbols: ["NVDA"],
  },
};

describe("optimisticChecklist", () => {
  it("is one queued, idless placeholder row per tool in the pipeline — the client-optimistic paint", () => {
    const state = optimisticChecklist("NVDA");
    expect(state.symbol).toBe("NVDA");
    expect(state.steps).toHaveLength(INVESTIGATION_STEP_COUNT);
    for (const step of state.steps) {
      expect(step).toStrictEqual({
        id: undefined,
        description: undefined,
        status: "queued",
        startedAt: undefined,
        completedAt: undefined,
        durationMs: undefined,
      });
    }
    expect(state.terminal).toBe(false);
    expect(state.connectionLost).toBe(false);
  });
});

describe("applyInvestigationEvent", () => {
  it("INVESTIGATION_STARTED sets the real id and leaves the placeholder step", () => {
    const state = applyInvestigationEvent(optimisticChecklist("NVDA"), BASE);
    expect(state.investigationId).toBe("inv-1");
    expect(state.steps).toHaveLength(INVESTIGATION_STEP_COUNT);
    expect(state.steps.every((step) => step.status === "queued")).toBe(true);
  });

  it("STEP_STARTED replaces the first seeded placeholder with the real step, running", () => {
    const afterStart = applyInvestigationEvent(
      optimisticChecklist("NVDA"),
      BASE,
    );
    const state = applyInvestigationEvent(afterStart, {
      type: "STEP_STARTED",
      seq: 2,
      investigationId: "inv-1",
      stepId: "step-1",
      description: "Measure move",
      tool: "get_security_snapshot",
      startedAt: "2026-11-16T14:00:00.000Z",
    });

    expect(state.steps).toHaveLength(INVESTIGATION_STEP_COUNT);
    expect(state.steps[0]).toStrictEqual({
      id: "step-1",
      description: "Measure move",
      status: "running",
      startedAt: "2026-11-16T14:00:00.000Z",
      completedAt: undefined,
      durationMs: undefined,
    });
  });

  it("fills the seeded rows in order, one per step, without growing the list", () => {
    // Six steps, started and completed in the order the orchestrator runs
    // them — the shape Task 7.2.7 cares about: the row COUNT never moves,
    // which is what stops the panel beneath this checklist stepping six
    // times during one run.
    let state = applyInvestigationEvent(optimisticChecklist("NVDA"), BASE);

    for (let index = 0; index < INVESTIGATION_STEP_COUNT; index += 1) {
      const stepId = `step-${String(index + 1)}`;
      state = applyInvestigationEvent(state, {
        type: "STEP_STARTED",
        seq: 2 + index * 2,
        investigationId: "inv-1",
        stepId,
        description: `Step ${String(index + 1)}`,
        tool: "get_security_snapshot",
        startedAt: "2026-11-16T14:00:00.000Z",
      });

      // Every row before this one is already complete, this one is
      // running, and every row after it is still holding room.
      expect(state.steps).toHaveLength(INVESTIGATION_STEP_COUNT);
      expect(state.steps.map((step) => step.status)).toStrictEqual([
        ...Array.from({ length: index }, () => "completed" as const),
        "running" as const,
        ...Array.from(
          { length: INVESTIGATION_STEP_COUNT - index - 1 },
          () => "queued" as const,
        ),
      ]);

      state = applyInvestigationEvent(state, {
        type: "STEP_COMPLETED",
        seq: 3 + index * 2,
        investigationId: "inv-1",
        stepId,
        status: "completed",
        durationMs: index + 1,
      });
    }

    expect(state.steps).toHaveLength(INVESTIGATION_STEP_COUNT);
    expect(state.steps.map((step) => step.description)).toStrictEqual([
      "Step 1",
      "Step 2",
      "Step 3",
      "Step 4",
      "Step 5",
      "Step 6",
    ]);
    expect(state.steps.map((step) => step.durationMs)).toStrictEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("TOOL_CALL_STARTED and TOOL_CALL_COMPLETED do not change the checklist", () => {
    let state = applyInvestigationEvent(optimisticChecklist("NVDA"), BASE);
    state = applyInvestigationEvent(state, {
      type: "STEP_STARTED",
      seq: 2,
      investigationId: "inv-1",
      stepId: "step-1",
      description: "Measure move",
      tool: "get_security_snapshot",
      startedAt: "2026-11-16T14:00:00.000Z",
    });
    const beforeToolEvents = state;

    state = applyInvestigationEvent(state, {
      type: "TOOL_CALL_STARTED",
      seq: 3,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "get_security_snapshot",
    });
    state = applyInvestigationEvent(state, {
      type: "TOOL_CALL_COMPLETED",
      seq: 4,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "get_security_snapshot",
      durationMs: 12,
      outcome: { kind: "ok", value: { symbol: "NVDA" } },
    });

    expect(state).toStrictEqual(beforeToolEvents);
  });

  it("STEP_COMPLETED marks the step complete with its real duration", () => {
    let state = applyInvestigationEvent(optimisticChecklist("NVDA"), BASE);
    state = applyInvestigationEvent(state, {
      type: "STEP_STARTED",
      seq: 2,
      investigationId: "inv-1",
      stepId: "step-1",
      description: "Measure move",
      tool: "get_security_snapshot",
      startedAt: "2026-11-16T14:00:00.000Z",
    });
    state = applyInvestigationEvent(state, {
      type: "STEP_COMPLETED",
      seq: 5,
      investigationId: "inv-1",
      stepId: "step-1",
      status: "completed",
      durationMs: 12,
    });

    expect(state.steps[0]).toStrictEqual({
      id: "step-1",
      description: "Measure move",
      status: "completed",
      // `completedAt` is the step's own `startedAt` carried forward — this
      // story's events carry no separate completion instant, only a
      // duration measured from the start.
      startedAt: "2026-11-16T14:00:00.000Z",
      completedAt: "2026-11-16T14:00:00.000Z",
      durationMs: 12,
    });
  });

  it("INVESTIGATION_COMPLETED sets terminal, nothing else", () => {
    const state = applyInvestigationEvent(optimisticChecklist("NVDA"), {
      type: "INVESTIGATION_COMPLETED",
      seq: 6,
      investigationId: "inv-1",
      status: "completed",
      completedAt: "2026-11-16T14:00:00.012Z",
      stepCount: 1,
    });

    expect(state.terminal).toBe(true);
    expect(state.connectionLost).toBe(false);
  });
});

describe("withInvestigationId", () => {
  it("sets the id without disturbing the steps", () => {
    const before = optimisticChecklist("NVDA");
    const after = withInvestigationId(before, "inv-1");
    expect(after.investigationId).toBe("inv-1");
    expect(after.steps).toBe(before.steps);
  });
});

describe("withConnectionLost", () => {
  it("sets connectionLost on a non-terminal checklist", () => {
    const state = withConnectionLost(optimisticChecklist("NVDA"));
    expect(state.connectionLost).toBe(true);
  });

  it("is a no-op once the investigation has genuinely finished", () => {
    const completed = applyInvestigationEvent(optimisticChecklist("NVDA"), {
      type: "INVESTIGATION_COMPLETED",
      seq: 6,
      investigationId: "inv-1",
      status: "completed",
      completedAt: "2026-11-16T14:00:00.012Z",
      stepCount: 1,
    });

    expect(withConnectionLost(completed)).toStrictEqual(completed);
  });
});
