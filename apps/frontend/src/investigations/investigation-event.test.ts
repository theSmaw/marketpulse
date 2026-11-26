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
    // **`FINDING_CREATED` until Task 7.3.1, when this bundle learnt it.** The
    // subject of the test is the `unsupported` ARM, not that one particular
    // name is unknown — so the furnished type is a name no story has ever
    // shipped, which is the state a tab left open across a deploy is really
    // in. `EVIDENCE_ADDED` is the honest choice: it is in the shared
    // `INVESTIGATION_EVENT_TYPES` vocabulary and deliberately carries no
    // payload until the story where evidence can be pinned with no attached
    // finding.
    expect(
      readInvestigationEvent({
        type: "EVIDENCE_ADDED",
        seq: 7,
        investigationId: "inv-1",
      }),
    ).toStrictEqual({ kind: "unsupported", type: "EVIDENCE_ADDED" });
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

describe("readInvestigationEvent — FINDING_CREATED (Task 7.3.1)", () => {
  const frame = (finding: unknown) => ({
    type: "FINDING_CREATED",
    seq: 5,
    investigationId: "inv-1",
    finding,
  });

  it("decodes only the three fields the browser reads, off the FINDING's own stepId", () => {
    const decoded = readInvestigationEvent(
      frame({
        evidenced: true,
        id: "finding-1",
        stepId: "step-1",
        type: "PRICE_MOVE",
        claim: "−4.20% over 5 min — 94th of 4,620",
        confidence: "SUPPORTED",
        evidence: [
          {
            kind: "market_observation",
            source: "alpaca:iex",
            retrievedAt: "2026-11-23T14:01:00.500Z",
            rawData: "trailing-window:NVDA",
          },
        ],
      }),
    );

    // `INVESTIGATION_STARTED`'s own shipped precedent of partial decoding:
    // the id, the type, the discriminant and the evidence are all on the
    // wire and read by nothing in this bundle, so they are not declared.
    expect(decoded).toStrictEqual({
      kind: "event",
      event: {
        type: "FINDING_CREATED",
        seq: 5,
        investigationId: "inv-1",
        finding: {
          stepId: "step-1",
          claim: "−4.20% over 5 min — 94th of 4,620",
          confidence: "SUPPORTED",
        },
      },
    });
  });

  it("DROPS a confidence level it does not recognise and keeps the claim", () => {
    // `readReturnPercentile`'s own rule, one vocabulary over: a level a newer
    // backend knows and this bundle does not must not refuse a frame the
    // producer is being honest in — and must not take the claim down with
    // it. A row with a measured figure and no confidence mark is the same
    // honest-absence shape an `inapplicable` step already draws.
    const decoded = readInvestigationEvent(
      frame({
        stepId: "step-1",
        claim: "−4.20% over 5 min — 94th of 4,620",
        confidence: "COROBORATED",
      }),
    );

    expect(decoded).toStrictEqual({
      kind: "event",
      event: {
        type: "FINDING_CREATED",
        seq: 5,
        investigationId: "inv-1",
        finding: {
          stepId: "step-1",
          claim: "−4.20% over 5 min — 94th of 4,620",
        },
      },
    });
  });

  it("answers unreadable for a missing finding, a missing stepId or an empty claim", () => {
    expect(readInvestigationEvent(frame(undefined))).toMatchObject({
      kind: "unreadable",
    });
    expect(readInvestigationEvent(frame({ claim: "something" }))).toMatchObject(
      { kind: "unreadable" },
    );
    expect(
      readInvestigationEvent(frame({ stepId: "step-1", claim: "" })),
    ).toMatchObject({ kind: "unreadable" });
  });
});

describe("readInvestigationEvent — INVESTIGATION_FAILED (the B2 repair)", () => {
  it("decodes the terminal failure event this bundle used to DROP", () => {
    // **A pre-existing defect, shipped since Task 7.2.1 and found while
    // shaping this story's event-type/decoder-parity invariant.** With no
    // case here, a thrown tool decoded as `unsupported`, the stream then
    // ended with no terminal event the reducer had seen, and the row drew
    // the dropped-connection sentence — a run that failed reported as a
    // network fault.
    expect(
      readInvestigationEvent({
        type: "INVESTIGATION_FAILED",
        seq: 7,
        investigationId: "inv-1",
        status: "failed",
        failedAt: "2026-11-23T14:01:00.012Z",
        stepCount: 2,
      }),
    ).toStrictEqual({
      kind: "event",
      event: {
        type: "INVESTIGATION_FAILED",
        seq: 7,
        investigationId: "inv-1",
        status: "failed",
        failedAt: "2026-11-23T14:01:00.012Z",
        stepCount: 2,
      },
    });
  });

  it("answers unreadable for a malformed one rather than throwing", () => {
    expect(
      readInvestigationEvent({
        type: "INVESTIGATION_FAILED",
        seq: 7,
        investigationId: "inv-1",
        status: "failed",
        // `failedAt` missing.
        stepCount: 2,
      }),
    ).toMatchObject({ kind: "unreadable" });
  });
});

// --------------------------------------------------------------------------
// Task 7.4.1 — invariant 2's own event
// --------------------------------------------------------------------------

describe("readInvestigationEvent — WORKSPACE_COMMAND", () => {
  const frame = (outcome: unknown) => ({
    type: "WORKSPACE_COMMAND",
    seq: 9,
    investigationId: "inv-1",
    stepId: "step-4",
    outcome,
  });

  const PERMITTED = {
    kind: "permitted",
    command: {
      type: "highlightNodes",
      symbols: ["AMD", "XLK"],
      relations: ["sector_membership", "return_correlation"],
      subject: "NVDA",
    },
  };

  it("decodes a permitted highlight", () => {
    expect(readInvestigationEvent(frame(PERMITTED))).toStrictEqual({
      kind: "event",
      event: {
        type: "WORKSPACE_COMMAND",
        seq: 9,
        investigationId: "inv-1",
        stepId: "step-4",
        outcome: PERMITTED,
      },
    });
  });

  it("decodes the REFUSED arm rather than dropping it", () => {
    // A refusal is ADR 0029's first-class, countable outcome; a decoder that
    // dropped it would make the one thing the permission stage exists to
    // produce invisible above the server's own stderr.
    expect(
      readInvestigationEvent(
        frame({ kind: "refused", because: "symbol-has-no-placement" }),
      ),
    ).toMatchObject({
      kind: "event",
      event: {
        outcome: { kind: "refused", because: "symbol-has-no-placement" },
      },
    });
  });

  it("refuses a refusal spelled `reason` rather than `because`", () => {
    expect(
      readInvestigationEvent(
        frame({ kind: "refused", reason: "symbol-has-no-placement" }),
      ),
    ).toMatchObject({ kind: "unreadable" });
  });

  it("refuses an EMPTY highlight — a fully-formed claim about zero nodes", () => {
    expect(
      readInvestigationEvent(
        frame({ ...PERMITTED, command: { ...PERMITTED.command, symbols: [] } }),
      ),
    ).toMatchObject({ kind: "unreadable" });
  });

  it("refuses a highlight with no relations — one the note cannot explain", () => {
    expect(
      readInvestigationEvent(
        frame({
          ...PERMITTED,
          command: { ...PERMITTED.command, relations: [] },
        }),
      ),
    ).toMatchObject({ kind: "unreadable" });
  });

  it("refuses an unknown command type inside a permitted outcome", () => {
    expect(
      readInvestigationEvent(
        frame({
          ...PERMITTED,
          command: { ...PERMITTED.command, type: "openPriceChart" },
        }),
      ),
    ).toMatchObject({ kind: "unreadable" });
  });

  it("refuses an outcome kind it does not know", () => {
    expect(readInvestigationEvent(frame({ kind: "deferred" }))).toMatchObject({
      kind: "unreadable",
    });
  });

  it("never throws on anything in the outcome slot", () => {
    for (const outcome of [undefined, null, 7, "permitted", [], {}]) {
      expect(() => readInvestigationEvent(frame(outcome))).not.toThrow();
    }
  });
});
