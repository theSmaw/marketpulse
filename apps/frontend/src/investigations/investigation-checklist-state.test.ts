import { describe, expect, it } from "vitest";

import type { WireInvestigationEvent } from "./investigation-event.js";
import {
  applyInvestigationEvent,
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
  it("is one queued, idless placeholder step — the client-optimistic paint", () => {
    const state = optimisticChecklist("NVDA");
    expect(state.symbol).toBe("NVDA");
    expect(state.steps).toHaveLength(1);
    expect(state.steps[0]).toStrictEqual({
      id: undefined,
      description: undefined,
      status: "queued",
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
    });
    expect(state.terminal).toBe(false);
    expect(state.connectionLost).toBe(false);
  });
});

describe("applyInvestigationEvent", () => {
  it("INVESTIGATION_STARTED sets the real id and leaves the placeholder step", () => {
    const state = applyInvestigationEvent(optimisticChecklist("NVDA"), BASE);
    expect(state.investigationId).toBe("inv-1");
    expect(state.steps).toHaveLength(1);
    expect(state.steps[0]?.status).toBe("queued");
  });

  it("STEP_STARTED replaces the placeholder with the real step, running", () => {
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

    expect(state.steps).toHaveLength(1);
    expect(state.steps[0]).toStrictEqual({
      id: "step-1",
      description: "Measure move",
      status: "running",
      startedAt: "2026-11-16T14:00:00.000Z",
      completedAt: undefined,
      durationMs: undefined,
    });
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
