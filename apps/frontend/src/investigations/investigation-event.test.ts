import { describe, expect, it } from "vitest";

import { readInvestigationEvent } from "./investigation-event.js";

// Every one of the six shapes this story emits, plus the two "never throw"
// paths: `unreadable` for something malformed, `unsupported` for a type
// this bundle has never heard of — `market-stream-protocol.ts`'s own
// `DecodedMessage` precedent, carried over rather than re-argued.

describe("readInvestigationEvent", () => {
  it("decodes INVESTIGATION_STARTED", () => {
    const decoded = readInvestigationEvent({
      type: "INVESTIGATION_STARTED",
      seq: 1,
      investigationId: "inv-1",
      investigation: {
        id: "inv-1",
        title: "Investigate NVDA",
        subjectSymbols: ["NVDA"],
      },
    });

    expect(decoded).toStrictEqual({
      kind: "event",
      event: {
        type: "INVESTIGATION_STARTED",
        seq: 1,
        investigationId: "inv-1",
        investigation: {
          id: "inv-1",
          title: "Investigate NVDA",
          subjectSymbols: ["NVDA"],
        },
      },
    });
  });

  it("decodes STEP_STARTED", () => {
    const decoded = readInvestigationEvent({
      type: "STEP_STARTED",
      seq: 2,
      investigationId: "inv-1",
      stepId: "step-1",
      description: "Measure move",
      tool: "get_security_snapshot",
      startedAt: "2026-11-16T14:00:00.000Z",
    });

    expect(decoded.kind).toBe("event");
  });

  it("decodes TOOL_CALL_STARTED", () => {
    const decoded = readInvestigationEvent({
      type: "TOOL_CALL_STARTED",
      seq: 3,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "get_security_snapshot",
    });

    expect(decoded.kind).toBe("event");
  });

  it("decodes TOOL_CALL_COMPLETED with an ok outcome", () => {
    const decoded = readInvestigationEvent({
      type: "TOOL_CALL_COMPLETED",
      seq: 4,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "get_security_snapshot",
      durationMs: 12,
      outcome: { kind: "ok", value: { symbol: "NVDA" } },
    });

    expect(decoded).toStrictEqual({
      kind: "event",
      event: {
        type: "TOOL_CALL_COMPLETED",
        seq: 4,
        investigationId: "inv-1",
        stepId: "step-1",
        tool: "get_security_snapshot",
        durationMs: 12,
        outcome: { kind: "ok", value: { symbol: "NVDA" } },
      },
    });
  });

  it("decodes TOOL_CALL_COMPLETED with a refused outcome", () => {
    const decoded = readInvestigationEvent({
      type: "TOOL_CALL_COMPLETED",
      seq: 4,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "get_security_snapshot",
      durationMs: 0,
      outcome: { kind: "refused", reason: "nothing-observed" },
    });

    expect(decoded.kind).toBe("event");
  });

  it("decodes TOOL_CALL_COMPLETED with an inapplicable outcome, carrying `because`", () => {
    // **Task 7.2.4, and the defect this test exists for.** `readToolOutcome`
    // is a closed whitelist and an unhandled `kind` makes the WHOLE event
    // `unreadable`, which `use-investigation.ts` then silently ignores — so
    // before the branch existed, the first `inapplicable` outcome this
    // product ever produced was dropped on the floor with every other test
    // still green. `compare_securities` answers this for all fifteen
    // landmark securities, on every store including CI's.
    const decoded = readInvestigationEvent({
      type: "TOOL_CALL_COMPLETED",
      seq: 4,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "compare_securities",
      durationMs: 0,
      outcome: { kind: "inapplicable", because: "is-benchmark" },
    });

    expect(decoded).toStrictEqual({
      kind: "event",
      event: {
        type: "TOOL_CALL_COMPLETED",
        seq: 4,
        investigationId: "inv-1",
        stepId: "step-1",
        tool: "compare_securities",
        durationMs: 0,
        outcome: { kind: "inapplicable", because: "is-benchmark" },
      },
    });
  });

  it("refuses an inapplicable outcome that spells `reason` instead of `because`", () => {
    // The field name is the decision (`packages/shared/src/investigation.ts`'s
    // own `ToolOutcome` docblock): a frame that flattened the third kind onto
    // a refusal's own field fails to decode here rather than reaching a
    // reader as *unavailable*, which would invite them to wait for something
    // that will never arrive.
    const decoded = readInvestigationEvent({
      type: "TOOL_CALL_COMPLETED",
      seq: 4,
      investigationId: "inv-1",
      stepId: "step-1",
      tool: "compare_securities",
      durationMs: 0,
      outcome: { kind: "inapplicable", reason: "is-benchmark" },
    });

    expect(decoded).toStrictEqual({
      kind: "unreadable",
      reason: "malformed TOOL_CALL_COMPLETED",
    });
  });

  it("decodes STEP_COMPLETED", () => {
    const decoded = readInvestigationEvent({
      type: "STEP_COMPLETED",
      seq: 5,
      investigationId: "inv-1",
      stepId: "step-1",
      status: "completed",
      durationMs: 12,
    });

    expect(decoded.kind).toBe("event");
  });

  it("decodes INVESTIGATION_COMPLETED", () => {
    const decoded = readInvestigationEvent({
      type: "INVESTIGATION_COMPLETED",
      seq: 6,
      investigationId: "inv-1",
      status: "completed",
      completedAt: "2026-11-16T14:00:00.012Z",
      stepCount: 1,
    });

    expect(decoded.kind).toBe("event");
  });

  it("answers unsupported for a type this bundle does not know, never throwing", () => {
    expect(
      readInvestigationEvent({
        type: "FINDING_CREATED",
        seq: 7,
        investigationId: "inv-1",
      }),
    ).toStrictEqual({ kind: "unsupported", type: "FINDING_CREATED" });
  });

  it("answers unreadable for something that is not an object, never throwing", () => {
    expect(readInvestigationEvent("not an object")).toMatchObject({
      kind: "unreadable",
    });
    expect(readInvestigationEvent(null)).toMatchObject({
      kind: "unreadable",
    });
    expect(readInvestigationEvent(undefined)).toMatchObject({
      kind: "unreadable",
    });
  });

  it("answers unreadable for a known type missing a required field", () => {
    expect(
      readInvestigationEvent({
        type: "STEP_STARTED",
        seq: 2,
        investigationId: "inv-1",
        // `stepId` missing.
        description: "Measure move",
        tool: "get_security_snapshot",
        startedAt: "2026-11-16T14:00:00.000Z",
      }),
    ).toMatchObject({ kind: "unreadable" });
  });

  it("answers unreadable for a non-finite seq", () => {
    expect(
      readInvestigationEvent({
        type: "TOOL_CALL_STARTED",
        seq: Number.NaN,
        investigationId: "inv-1",
        stepId: "step-1",
        tool: "get_security_snapshot",
      }),
    ).toMatchObject({ kind: "unreadable" });
  });
});
