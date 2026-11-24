import { describe, expect, it } from "vitest";

import type { WireInvestigationEvent } from "./investigation-event.js";
import {
  applyInvestigationEvent,
  INVESTIGATION_STEP_COUNT,
  optimisticChecklist,
  resetForNewRun,
  withConnectionLost,
  withInvestigationId,
  type ChecklistState,
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
        claim: undefined,
        confidence: undefined,
        stale: false,
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
      claim: undefined,
      confidence: undefined,
      stale: false,
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
      claim: undefined,
      confidence: undefined,
      stale: false,
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

  it("is a no-op once the run has FAILED, which is the whole of the B2 repair", () => {
    // Before Task 7.3.1 `INVESTIGATION_FAILED` had no decoder case at all, so
    // it never reached this reducer, `terminal` stayed `false`, the stream
    // ended, and this function drew the dropped-connection sentence over a
    // run that had actually failed. The repair is `terminal: true` and
    // nothing else — the sentence a reader is owed is Story 7.5's.
    const failed = applyInvestigationEvent(optimisticChecklist("NVDA"), {
      type: "INVESTIGATION_FAILED",
      seq: 7,
      investigationId: "inv-1",
      status: "failed",
      failedAt: "2026-11-16T14:00:00.012Z",
      stepCount: 0,
    });

    expect(failed.terminal).toBe(true);
    expect(withConnectionLost(failed)).toStrictEqual(failed);
    expect(failed.connectionLost).toBe(false);
  });
});

describe("applyInvestigationEvent — FINDING_CREATED (Task 7.3.1)", () => {
  const started = () =>
    applyInvestigationEvent(optimisticChecklist("NVDA"), {
      type: "STEP_STARTED",
      seq: 1,
      investigationId: "inv-1",
      stepId: "step-1",
      description: "Measure price anomaly",
      tool: "calculate_return_percentile",
      startedAt: "2026-11-23T14:00:00.000Z",
    });

  it("puts the claim and the confidence on the row the FINDING names", () => {
    const state = applyInvestigationEvent(started(), {
      type: "FINDING_CREATED",
      seq: 2,
      investigationId: "inv-1",
      finding: {
        stepId: "step-1",
        claim: "−4.20% over 5 min — 94th of 4,620",
        confidence: "SUPPORTED",
      },
    });

    expect(state.steps[0]?.claim).toBe("−4.20% over 5 min — 94th of 4,620");
    expect(state.steps[0]?.confidence).toBe("SUPPORTED");
    // The row is still `running` — the orchestrator emits this BEFORE that
    // step's `STEP_COMPLETED`.
    expect(state.steps[0]?.status).toBe("running");
    // And no other row moved.
    expect(state.steps[1]?.claim).toBeUndefined();
  });

  it("survives that step's own STEP_COMPLETED", () => {
    // The completion carries no claim, so a reducer arm that rebuilt the row
    // rather than spreading it would blank the sentence the frame before.
    let state = applyInvestigationEvent(started(), {
      type: "FINDING_CREATED",
      seq: 2,
      investigationId: "inv-1",
      finding: {
        stepId: "step-1",
        claim: "0 up, 0 down, 0 flat of 0 measured in the last 5 min",
        confidence: "POSSIBLE",
      },
    });
    state = applyInvestigationEvent(state, {
      type: "STEP_COMPLETED",
      seq: 3,
      investigationId: "inv-1",
      stepId: "step-1",
      status: "completed",
      durationMs: 4,
    });

    expect(state.steps[0]?.status).toBe("completed");
    expect(state.steps[0]?.claim).toBe(
      "0 up, 0 down, 0 flat of 0 measured in the last 5 min",
    );
    expect(state.steps[0]?.confidence).toBe("POSSIBLE");
  });

  it("leaves the confidence absent where the decoder dropped an unknown level", () => {
    const state = applyInvestigationEvent(started(), {
      type: "FINDING_CREATED",
      seq: 2,
      investigationId: "inv-1",
      finding: { stepId: "step-1", claim: "−4.20% over 5 min — 94th of 4,620" },
    });

    expect(state.steps[0]?.claim).toBe("−4.20% over 5 min — 94th of 4,620");
    expect(state.steps[0]?.confidence).toBeUndefined();
  });

  it("leaves a row with NO claim if TOOL_CALL_COMPLETED is skipped entirely — the narrower, hypothetical case", () => {
    // Not the real wire sequence for an inapplicable step (that always sends
    // `TOOL_CALL_COMPLETED` first — see the next describe block for the
    // realistic path, added 2026-11-24 by Task 7.3.5), but still a real
    // property worth holding: `STEP_COMPLETED` alone never invents a claim
    // out of nothing.
    const state = applyInvestigationEvent(started(), {
      type: "STEP_COMPLETED",
      seq: 2,
      investigationId: "inv-1",
      stepId: "step-1",
      status: "completed",
      durationMs: 1,
    });

    expect(state.steps[0]?.status).toBe("completed");
    expect(state.steps[0]?.claim).toBeUndefined();
    expect(state.steps[0]?.confidence).toBeUndefined();
  });
});

describe("resetForNewRun (Task 7.3.3, AC 11)", () => {
  /** A terminal checklist with one real finding on the first row and
   * nothing on the rest — a one-step run, same shape the other describe
   * blocks in this file use. */
  function terminalWithOneFinding(): ReturnType<
    typeof applyInvestigationEvent
  > {
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
      type: "FINDING_CREATED",
      seq: 3,
      investigationId: "inv-1",
      finding: {
        stepId: "step-1",
        claim: "Traded at 184.52 on 12,480 shares in the latest bar",
        confidence: "SUPPORTED",
      },
    });
    state = applyInvestigationEvent(state, {
      type: "STEP_COMPLETED",
      seq: 4,
      investigationId: "inv-1",
      stepId: "step-1",
      status: "completed",
      durationMs: 5,
    });
    return applyInvestigationEvent(state, {
      type: "INVESTIGATION_COMPLETED",
      seq: 5,
      investigationId: "inv-1",
      status: "completed",
      completedAt: "2026-11-16T14:00:00.005Z",
      stepCount: 1,
    });
  }

  it("keeps a row's claim and confidence, marked stale, rather than blanking it", () => {
    const after = resetForNewRun(terminalWithOneFinding());

    expect(after.steps[0]).toStrictEqual({
      id: undefined,
      description: undefined,
      status: "queued",
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
      claim: "Traded at 184.52 on 12,480 shares in the latest bar",
      confidence: "SUPPORTED",
      stale: true,
    });
  });

  it("leaves a row with no prior claim as a plain, non-stale placeholder", () => {
    const after = resetForNewRun(terminalWithOneFinding());

    expect(after.steps[1]).toStrictEqual({
      id: undefined,
      description: undefined,
      status: "queued",
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
      claim: undefined,
      confidence: undefined,
      stale: false,
    });
  });

  it("resets the investigation id and the terminal/connectionLost flags, keeping the symbol", () => {
    const after = resetForNewRun(terminalWithOneFinding());

    expect(after.symbol).toBe("NVDA");
    expect(after.investigationId).toBeUndefined();
    expect(after.terminal).toBe(false);
    expect(after.connectionLost).toBe(false);
    expect(after.steps).toHaveLength(INVESTIGATION_STEP_COUNT);
  });

  it("a stale claim survives STEP_STARTED — queued/running render exactly as they do today otherwise", () => {
    let state = resetForNewRun(terminalWithOneFinding());
    state = applyInvestigationEvent(state, {
      type: "STEP_STARTED",
      seq: 1,
      investigationId: "inv-2",
      stepId: "step-1",
      description: "Measure move",
      tool: "get_security_snapshot",
      startedAt: "2026-11-17T14:00:00.000Z",
    });

    expect(state.steps[0]).toMatchObject({
      status: "running",
      claim: "Traded at 184.52 on 12,480 shares in the latest bar",
      confidence: "SUPPORTED",
      stale: true,
    });
  });

  it("a real FINDING_CREATED replaces the stale claim and clears the flag", () => {
    let state = resetForNewRun(terminalWithOneFinding());
    state = applyInvestigationEvent(state, {
      type: "STEP_STARTED",
      seq: 1,
      investigationId: "inv-2",
      stepId: "step-1",
      description: "Measure move",
      tool: "get_security_snapshot",
      startedAt: "2026-11-17T14:00:00.000Z",
    });
    state = applyInvestigationEvent(state, {
      type: "FINDING_CREATED",
      seq: 2,
      investigationId: "inv-2",
      finding: {
        stepId: "step-1",
        claim: "Traded at 185.10 on 9,200 shares in the latest bar",
        confidence: "SUPPORTED",
      },
    });

    expect(state.steps[0]).toMatchObject({
      claim: "Traded at 185.10 on 9,200 shares in the latest bar",
      stale: false,
    });
  });

  it("an INAPPLICABLE re-run drops the stale claim rather than leaving it looking current", () => {
    // The row that completes with no FINDING_CREATED this run never had its
    // `stale` flag cleared by one — which is exactly how STEP_COMPLETED
    // tells "this run re-confirmed it" from "this run never asked".
    let state = resetForNewRun(terminalWithOneFinding());
    state = applyInvestigationEvent(state, {
      type: "STEP_STARTED",
      seq: 1,
      investigationId: "inv-2",
      stepId: "step-1",
      description: "Measure move",
      tool: "get_security_snapshot",
      startedAt: "2026-11-17T14:00:00.000Z",
    });
    state = applyInvestigationEvent(state, {
      type: "STEP_COMPLETED",
      seq: 2,
      investigationId: "inv-2",
      stepId: "step-1",
      status: "completed",
      durationMs: 1,
    });

    expect(state.steps[0]?.status).toBe("completed");
    expect(state.steps[0]?.claim).toBeUndefined();
    expect(state.steps[0]?.confidence).toBeUndefined();
    expect(state.steps[0]?.stale).toBe(false);
  });
});

describe("TOOL_CALL_COMPLETED's inapplicable sentence (Task 7.3.5, closing AC 3's own gap)", () => {
  // Story 7.3's own Gate 1: "the row draws the inapplicability's own
  // sentence with no confidence mark at all." Phase 3's integrated check
  // found this had never actually been built — `inapplicable` mints no
  // `Finding`, so no `FINDING_CREATED` ever arrives, and nothing else had
  // ever read `TOOL_CALL_COMPLETED`'s own `outcome`.
  const startedCompareSecurities = () =>
    applyInvestigationEvent(optimisticChecklist("NVDA"), {
      type: "STEP_STARTED",
      seq: 1,
      investigationId: "inv-1",
      stepId: "step-1",
      description: "Compare against sector benchmark",
      tool: "compare_securities",
      startedAt: "2026-11-24T14:00:00.000Z",
    });

  it("sets the claim from the outcome's own `because`, with no confidence at all", () => {
    const state = applyInvestigationEvent(startedCompareSecurities(), {
      type: "TOOL_CALL_COMPLETED",
      seq: 2,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "compare_securities",
      durationMs: 0,
      outcome: { kind: "inapplicable", because: "is-benchmark" },
    });

    expect(state.steps[0]?.claim).toBe(
      "Sector comparison — it is the sector benchmark itself",
    );
    expect(state.steps[0]?.confidence).toBeUndefined();
    // The row is still `running` — exactly as `FINDING_CREATED` arrives
    // before `STEP_COMPLETED` for an evidenced finding, this is before it
    // too, which is the orchestrator's own real event order.
    expect(state.steps[0]?.status).toBe("running");
  });

  it("survives the step's own STEP_COMPLETED", () => {
    let state = applyInvestigationEvent(startedCompareSecurities(), {
      type: "TOOL_CALL_COMPLETED",
      seq: 2,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "compare_securities",
      durationMs: 0,
      outcome: { kind: "inapplicable", because: "no-sector" },
    });
    state = applyInvestigationEvent(state, {
      type: "STEP_COMPLETED",
      seq: 3,
      investigationId: "inv-1",
      stepId: "step-1",
      status: "completed",
      durationMs: 0,
    });

    expect(state.steps[0]?.status).toBe("completed");
    expect(state.steps[0]?.claim).toBe(
      "Sector comparison — no sector to compare against",
    );
    expect(state.steps[0]?.confidence).toBeUndefined();
  });

  it("does nothing for an `ok` or `refused` outcome — those are FINDING_CREATED's", () => {
    const beforeOk = startedCompareSecurities();
    const afterOk = applyInvestigationEvent(beforeOk, {
      type: "TOOL_CALL_COMPLETED",
      seq: 2,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "compare_securities",
      durationMs: 5,
      outcome: { kind: "ok", value: { excessPoints: -3.1 } },
    });
    expect(afterOk).toStrictEqual(beforeOk);

    const afterRefused = applyInvestigationEvent(beforeOk, {
      type: "TOOL_CALL_COMPLETED",
      seq: 2,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "compare_securities",
      durationMs: 5,
      outcome: { kind: "refused", reason: "mixed-basis" },
    });
    expect(afterRefused).toStrictEqual(beforeOk);
  });

  it("replaces a second press's stale claim with THIS run's own inapplicability — not left looking current, and not blanked either", () => {
    // The interaction Task 7.3.3's `resetForNewRun` and this task's own fix
    // both touch: a row carrying a PREVIOUS run's real claim forward,
    // `stale: true`, whose outcome THIS run is `inapplicable`. Neither
    // "keep showing the old claim as current" (the bug Task 7.3.3 fixed for
    // the no-TOOL_CALL_COMPLETED case) nor "blank it to nothing" is right —
    // the row gets THIS run's own honest sentence.
    const stale: ChecklistState = {
      symbol: "NVDA",
      investigationId: undefined,
      steps: [
        {
          id: undefined,
          description: undefined,
          status: "queued",
          startedAt: undefined,
          completedAt: undefined,
          durationMs: undefined,
          claim: "Sector comparison — −3.10 pts against XLK over 5 min",
          confidence: "SUPPORTED",
          stale: true,
        },
      ],
      terminal: false,
      connectionLost: false,
    };

    let state = applyInvestigationEvent(stale, {
      type: "STEP_STARTED",
      seq: 1,
      investigationId: "inv-2",
      stepId: "step-1",
      description: "Compare against sector benchmark",
      tool: "compare_securities",
      startedAt: "2026-11-24T14:00:00.000Z",
    });
    expect(state.steps[0]).toMatchObject({
      status: "running",
      stale: true,
      claim: "Sector comparison — −3.10 pts against XLK over 5 min",
    });

    state = applyInvestigationEvent(state, {
      type: "TOOL_CALL_COMPLETED",
      seq: 2,
      investigationId: "inv-2",
      stepId: "step-1",
      tool: "compare_securities",
      durationMs: 0,
      outcome: { kind: "inapplicable", because: "is-benchmark" },
    });

    expect(state.steps[0]).toMatchObject({
      claim: "Sector comparison — it is the sector benchmark itself",
      confidence: undefined,
      stale: false,
    });
  });
});
