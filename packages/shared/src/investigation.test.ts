import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  CancelledStep,
  CompletedStep,
  FailedStep,
  Investigation,
  InvestigationEvent,
  InvestigationEventType,
  QueuedStep,
  RunningStep,
  Step,
  ToolOutcome,
} from "./investigation.js";
import {
  EXCESS_FACTOR_REFUSALS,
  EXCESS_MOVE_INAPPLICABILITIES,
} from "./excess-move.js";
import { PERCENTILE_REFUSALS } from "./return-baseline.js";
import {
  INVESTIGATION_EVENT_TYPES,
  INVESTIGATION_STATUSES,
  INVESTIGATION_STATUS_LABEL,
  STEP_STATUSES,
  STEP_STATUS_LABEL,
  TERMINAL_EVENT_TYPES,
  TOOL_INAPPLICABILITIES,
  TOOL_NAMES,
  TOOL_REFUSALS,
  isTerminalEventType,
  toInvestigationId,
  toStepId,
  toWireInvestigation,
  toWireInvestigationEvent,
  toWireStep,
} from "./investigation.js";
import type { Ticker } from "./ticker.js";

describe("InvestigationStatus and StepStatus", () => {
  it("are two separate vocabularies, not one shared union", () => {
    // Story 7.1's own Gate 1 found a draft that shared one union — `queued`
    // leaking onto an Investigation and `awaiting_user` onto a Step. This is
    // the regression test for that specific defect.
    expect(INVESTIGATION_STATUSES).not.toContain("queued");
    expect(STEP_STATUSES).not.toContain("awaiting_user");
  });

  it("totality-checked labels exist for every member of both vocabularies", () => {
    // The `satisfies Record<keyof T, …>` idiom — removing a status from
    // either vocabulary without also removing its label fails the build
    // here, naming the member, rather than leaving a presenter with a
    // runtime gap.
    for (const status of INVESTIGATION_STATUSES) {
      expect(INVESTIGATION_STATUS_LABEL[status]).toBeTypeOf("string");
    }
    for (const status of STEP_STATUSES) {
      expect(STEP_STATUS_LABEL[status]).toBeTypeOf("string");
    }
  });

  it("Investigation has five members, Step has five, and they differ", () => {
    expect(INVESTIGATION_STATUSES).toStrictEqual([
      "running",
      "awaiting_user",
      "completed",
      "failed",
      "cancelled",
    ]);
    expect(STEP_STATUSES).toStrictEqual([
      "queued",
      "running",
      "completed",
      "failed",
      "cancelled",
    ]);
  });
});

describe("Step", () => {
  const queued: QueuedStep = {
    id: toStepId("step-1"),
    description: "Measure move",
    tool: "get_security_snapshot",
    status: "queued",
  };

  const running: RunningStep = {
    ...queued,
    status: "running",
    startedAt: new Date("2026-11-16T14:00:00Z"),
  };

  const completed: CompletedStep = {
    ...running,
    status: "completed",
    completedAt: new Date("2026-11-16T14:00:00.012Z"),
    durationMs: 12,
  };

  const failed: FailedStep = {
    ...running,
    status: "failed",
    completedAt: new Date("2026-11-16T14:00:00.012Z"),
    durationMs: 12,
    reason: "tool threw",
  };

  const cancelled: CancelledStep = {
    ...running,
    status: "cancelled",
    completedAt: new Date("2026-11-16T14:00:00.012Z"),
  };

  it("is a discriminated union — a queued step has no timing fields", () => {
    // Asserted with `in`, not `toBeUndefined()` — `exactOptionalPropertyTypes`
    // means "absent" and "present as undefined" are different states, and
    // `toBeUndefined()` on a genuinely absent property and on one set to
    // `undefined` both pass, which hides exactly the thing this test exists
    // to catch.
    expect("startedAt" in queued).toBe(false);
    expect("completedAt" in queued).toBe(false);
    expect("durationMs" in queued).toBe(false);
  });

  it("a completed step cannot omit any of its timing fields", () => {
    expect("startedAt" in completed).toBe(true);
    expect("completedAt" in completed).toBe(true);
    expect("durationMs" in completed).toBe(true);
  });

  it("totals over all five statuses — removing a case is a compile error", () => {
    // The exhaustive switch in `toWireStep` is the real guard; this table
    // proves every member actually produces a distinct, well-formed wire
    // object rather than merely compiling.
    const steps: Step[] = [queued, running, completed, failed, cancelled];
    const wireShapes = steps.map((step) =>
      Object.keys(toWireStep(step)).sort(),
    );

    expect(wireShapes).toStrictEqual([
      ["description", "id", "status", "tool"],
      ["description", "id", "startedAt", "status", "tool"],
      [
        "completedAt",
        "description",
        "durationMs",
        "id",
        "startedAt",
        "status",
        "tool",
      ],
      [
        "completedAt",
        "description",
        "durationMs",
        "id",
        "reason",
        "startedAt",
        "status",
        "tool",
      ],
      ["completedAt", "description", "id", "startedAt", "status", "tool"],
    ]);
  });

  it("serialises every Date field as an ISO 8601 string on the wire", () => {
    const wire = toWireStep(completed);
    expect(wire.startedAt).toBe("2026-11-16T14:00:00.000Z");
    expect(wire.completedAt).toBe("2026-11-16T14:00:00.012Z");
  });

  it("accepts a zero duration as legitimate, never padding it", () => {
    const instant = new Date("2026-11-16T14:00:00Z");
    const instantStep: CompletedStep = {
      ...queued,
      status: "completed",
      startedAt: instant,
      completedAt: instant,
      durationMs: 0,
    };
    expect(toWireStep(instantStep).durationMs).toBe(0);
  });
});

describe("ToolOutcome", () => {
  it("has exactly three members, never a thrown fourth path", () => {
    // **Amended 2026-11-19 (Task 7.2.4): three, not two.** The property this
    // test holds is unchanged and is the one that matters — every member is a
    // VALUE a `TOOL_CALL_COMPLETED` event can carry, and a new one fails the
    // build at the `never` below rather than reaching a surface unhandled.
    // `inapplicable` is *the question does not arise*, which no backfill will
    // ever turn into a figure; it is not a refusal and must not print as one.
    const ok: ToolOutcome<number> = { kind: "ok", value: 1 };
    const refused: ToolOutcome<number> = {
      kind: "refused",
      reason: "nothing-observed",
    };
    const inapplicable: ToolOutcome<number> = {
      kind: "inapplicable",
      because: "is-benchmark",
    };

    function present(outcome: ToolOutcome<number>): string {
      switch (outcome.kind) {
        case "ok":
          return "ok";
        case "refused":
          return "refused";
        case "inapplicable":
          return "inapplicable";
        default: {
          // Exhaustive: a fourth ToolOutcome member fails the build here.
          const unhandled: never = outcome;
          return unhandled;
        }
      }
    }

    expect(present(ok)).toBe("ok");
    expect(present(refused)).toBe("refused");
    expect(present(inapplicable)).toBe("inapplicable");
  });

  it("names the inapplicable field `because`, never `reason`", () => {
    // The field name is a decision rather than a spelling (Task 7.2.4): a
    // handler reading `.reason` off a collapsed outcome does not compile, so
    // *we will not answer yet* and *the question does not arise* cannot be
    // read as one another by accident.
    const inapplicable: ToolOutcome<number> = {
      kind: "inapplicable",
      because: "no-sector",
    };
    expect(Object.keys(inapplicable).sort()).toStrictEqual(["because", "kind"]);
  });

  it("TOOL_INAPPLICABILITIES shares no word with TOOL_REFUSALS", () => {
    // The type-level half is `ToolRefusalsAndInapplicabilitiesAreDisjoint`;
    // this is the runtime half over the two published lists, because a word
    // carried by both would let a surface print either sentence for it with
    // nothing saying which is right.
    const refusals = new Set<string>(TOOL_REFUSALS);
    expect(
      TOOL_INAPPLICABILITIES.filter((word) => refusals.has(word)),
    ).toStrictEqual([]);
  });

  it("TOOL_INAPPLICABILITIES carries every excess-move word plus the correlation one", () => {
    // Task 7.2.4's own hand-off to Task 7.2.6: `no-sector`/`is-benchmark` are
    // `excess-move.ts`'s, reused verbatim, and `is-the-market-proxy` is
    // minted here for the correlation tool rather than in a module whose
    // subject it is not.
    expect([...TOOL_INAPPLICABILITIES]).toStrictEqual([
      ...EXCESS_MOVE_INAPPLICABILITIES,
      "is-the-market-proxy",
    ]);
  });

  it("TOOL_REFUSALS distinguishes an unobserved security from an untracked one", () => {
    // The two are genuinely different checks (a map lookup vs. a
    // universe-membership check) and must not share one reason.
    expect(TOOL_REFUSALS.slice(0, 2)).toStrictEqual([
      "nothing-observed",
      "not-tracked",
    ]);
  });

  it("TOOL_REFUSALS reuses the two halves' own words rather than a synonym", () => {
    // Task 7.2.2: the price-anomaly tool refuses for a NUMERATOR reason
    // (`five-minute-return.ts`'s `ReturnRefusal`) or a DENOMINATOR one
    // (`PERCENTILE_REFUSALS`), and the two must not collapse — a silent
    // security and an under-sampled one are different facts. Every member
    // below is spelled by the module that owns it; none is new here.
    //
    // Task 7.2.3 adds the last one — `FACTOR_ANSWER_STATES`' own
    // `no-distribution`, which the volume-anomaly tool answers for every
    // security on every store that exists. A third kind of claim rather
    // than a synonym: the figure exists and the history to rank it against
    // does not.
    // Task 7.2.4 adds `EXCESS_FACTOR_REFUSALS`' own four remaining words,
    // including the pair that must never merge: `split-discontinuity` is the
    // SUBJECT's price break and `reference-split-discontinuity` is the
    // BENCHMARK's, which refuse different securities and are repaired in
    // different places.
    expect(TOOL_REFUSALS).toStrictEqual([
      "nothing-observed",
      "not-tracked",
      "no-earlier-endpoint",
      "no-basis",
      "too-few-samples",
      "split-discontinuity",
      "no-distribution",
      "reference-split-discontinuity",
      "mixed-basis",
      "no-subject-move",
      "no-reference-move",
    ]);
    for (const refusal of PERCENTILE_REFUSALS) {
      expect(TOOL_REFUSALS).toContain(refusal);
    }
    for (const refusal of EXCESS_FACTOR_REFUSALS) {
      expect(TOOL_REFUSALS).toContain(refusal);
    }
  });

  it("TOOL_NAMES carries the snapshot tool and Story 7.2's first three steps", () => {
    expect(TOOL_NAMES).toStrictEqual([
      "get_security_snapshot",
      "calculate_return_percentile",
      // Task 7.2.3, and `EPIC.md`'s own order: price anomaly, then volume
      // anomaly.
      "calculate_volume_ratio",
      // Task 7.2.4 — the peer comparison, third of five. Named for the
      // arithmetic, not for the `Compare against sector benchmark` sentence
      // the checklist draws.
      "compare_securities",
    ]);
  });
});

describe("INVESTIGATION_EVENT_TYPES", () => {
  it("lists all ten names from PRODUCT_SPEC.md §33", () => {
    expect(INVESTIGATION_EVENT_TYPES).toHaveLength(10);
    expect(INVESTIGATION_EVENT_TYPES).toStrictEqual([
      "INVESTIGATION_STARTED",
      "STEP_STARTED",
      "TOOL_CALL_STARTED",
      "TOOL_CALL_COMPLETED",
      "FINDING_CREATED",
      "EVIDENCE_ADDED",
      "WORKSPACE_COMMAND",
      "STEP_COMPLETED",
      "INVESTIGATION_COMPLETED",
      "INVESTIGATION_FAILED",
    ]);
  });

  it("names the type as a union of all ten, not only the six this story emits", () => {
    expectTypeOf<InvestigationEventType>().toEqualTypeOf<
      | "INVESTIGATION_STARTED"
      | "STEP_STARTED"
      | "TOOL_CALL_STARTED"
      | "TOOL_CALL_COMPLETED"
      | "FINDING_CREATED"
      | "EVIDENCE_ADDED"
      | "WORKSPACE_COMMAND"
      | "STEP_COMPLETED"
      | "INVESTIGATION_COMPLETED"
      | "INVESTIGATION_FAILED"
    >();
  });
});

describe("isTerminalEventType", () => {
  it("is true for both events that END a run", () => {
    // **Amended 2026-11-18 (Task 7.2.1).** This read "true only for
    // INVESTIGATION_COMPLETED in this story", with
    // `isTerminalEventType("INVESTIGATION_FAILED")` asserted `false` and
    // a comment deferring it to Story 7.5. Its own condition — a run
    // that can fail outright — fired at Story 7.2, whose tools read a
    // database and a calendar where Story 7.1's read a `Map`.
    expect(isTerminalEventType("INVESTIGATION_COMPLETED")).toBe(true);
    expect(isTerminalEventType("INVESTIGATION_FAILED")).toBe(true);
    expect(isTerminalEventType("STEP_STARTED")).toBe(false);
    expect(isTerminalEventType("STEP_COMPLETED")).toBe(false);
  });

  it("TERMINAL_EVENT_TYPES has exactly two members", () => {
    expect(TERMINAL_EVENT_TYPES).toStrictEqual([
      "INVESTIGATION_COMPLETED",
      "INVESTIGATION_FAILED",
    ]);
  });
});

describe("Investigation", () => {
  it("omits findings/evidence/workspaceState/messages entirely", () => {
    // ADR 0029: a fully-formed record about nothing is a false impression.
    // These four are Story 7.3's and Epic 10/11's to add — not shipped here
    // as empty arrays.
    expectTypeOf<Investigation>().not.toHaveProperty("findings");
    expectTypeOf<Investigation>().not.toHaveProperty("evidence");
    expectTypeOf<Investigation>().not.toHaveProperty("workspaceState");
    expectTypeOf<Investigation>().not.toHaveProperty("messages");
  });

  it("carries subjectSymbols as a list, never a single symbol", () => {
    // A future tool (Story 7.4's peer comparison) can have more than one
    // subject — an id or a field keyed on "the symbol" would already be
    // wrong the day that lands.
    expectTypeOf<Investigation["subjectSymbols"]>().toEqualTypeOf<
      readonly Ticker[]
    >();
  });

  it("serialises to a wire object with ISO instants and nested wire steps", () => {
    const investigation: Investigation = {
      id: toInvestigationId("inv-1"),
      title: "Investigate NVDA",
      createdAt: new Date("2026-11-16T14:00:00Z"),
      mode: "live",
      status: "running",
      subjectSymbols: ["NVDA" as Ticker],
      currentTime: new Date("2026-11-16T14:00:00Z"),
      steps: [
        {
          id: toStepId("step-1"),
          description: "Measure move",
          tool: "get_security_snapshot",
          status: "queued",
        },
      ],
    };

    const wire = toWireInvestigation(investigation);

    expect(wire.createdAt).toBe("2026-11-16T14:00:00.000Z");
    expect(wire.currentTime).toBe("2026-11-16T14:00:00.000Z");
    expect(wire.steps).toStrictEqual([
      {
        id: "step-1",
        description: "Measure move",
        tool: "get_security_snapshot",
        status: "queued",
      },
    ]);
  });
});

describe("InvestigationId and StepId", () => {
  it("are branded strings, not interchangeable with a bare string by type", () => {
    const id = toInvestigationId("inv-1");
    expectTypeOf(id).not.toEqualTypeOf<string>();
    expect(id).toBe("inv-1");
  });
});

describe("toWireInvestigationEvent", () => {
  const investigation: Investigation = {
    id: toInvestigationId("inv-1"),
    title: "Investigate NVDA",
    createdAt: new Date("2026-11-16T14:00:00Z"),
    mode: "live",
    status: "running",
    subjectSymbols: ["NVDA" as Ticker],
    currentTime: new Date("2026-11-16T14:00:00Z"),
    steps: [],
  };

  it("totals over all seven events this product emits — removing a case is a compile error", () => {
    // The exhaustive switch in `toWireInvestigationEvent` is the real
    // guard; this table proves every member actually produces a
    // distinct, well-formed wire object rather than merely compiling —
    // `toWireStep`'s own test, one union over.
    const events: InvestigationEvent[] = [
      {
        type: "INVESTIGATION_STARTED",
        seq: 1,
        investigationId: investigation.id,
        investigation,
      },
      {
        type: "STEP_STARTED",
        seq: 2,
        investigationId: investigation.id,
        stepId: toStepId("step-1"),
        description: "Measure move",
        tool: "get_security_snapshot",
        startedAt: new Date("2026-11-16T14:00:00Z"),
      },
      {
        type: "TOOL_CALL_STARTED",
        seq: 3,
        investigationId: investigation.id,
        stepId: toStepId("step-1"),
        tool: "get_security_snapshot",
      },
      {
        type: "TOOL_CALL_COMPLETED",
        seq: 4,
        investigationId: investigation.id,
        stepId: toStepId("step-1"),
        tool: "get_security_snapshot",
        durationMs: 12,
        outcome: { kind: "refused", reason: "nothing-observed" },
      },
      {
        type: "STEP_COMPLETED",
        seq: 5,
        investigationId: investigation.id,
        stepId: toStepId("step-1"),
        status: "completed",
        durationMs: 12,
      },
      {
        type: "INVESTIGATION_COMPLETED",
        seq: 6,
        investigationId: investigation.id,
        status: "completed",
        completedAt: new Date("2026-11-16T14:00:00.012Z"),
        stepCount: 1,
      },
      // The seventh, added 2026-11-18 (Task 7.2.1). It carries no
      // `stepId` and no `reason` by design — which step threw and what a
      // reader is told about it are Story 7.5's, and a thrown message is
      // internal detail for the same reason a 5xx never carries one.
      {
        type: "INVESTIGATION_FAILED",
        seq: 7,
        investigationId: investigation.id,
        status: "failed",
        failedAt: new Date("2026-11-16T14:00:00.012Z"),
        stepCount: 0,
      },
    ];

    const wireShapes = events.map((event) =>
      Object.keys(toWireInvestigationEvent(event)).sort(),
    );

    expect(wireShapes).toStrictEqual([
      ["investigation", "investigationId", "seq", "type"],
      [
        "description",
        "investigationId",
        "seq",
        "startedAt",
        "stepId",
        "tool",
        "type",
      ],
      ["investigationId", "seq", "stepId", "tool", "type"],
      [
        "durationMs",
        "investigationId",
        "outcome",
        "seq",
        "stepId",
        "tool",
        "type",
      ],
      ["durationMs", "investigationId", "seq", "status", "stepId", "type"],
      ["completedAt", "investigationId", "seq", "status", "stepCount", "type"],
      ["failedAt", "investigationId", "seq", "status", "stepCount", "type"],
    ]);
  });

  it("serialises every Date field as an ISO 8601 string on the wire", () => {
    const wire = toWireInvestigationEvent({
      type: "STEP_STARTED",
      seq: 1,
      investigationId: investigation.id,
      stepId: toStepId("step-1"),
      description: "Measure move",
      tool: "get_security_snapshot",
      startedAt: new Date("2026-11-16T14:00:00Z"),
    });
    expect(wire.startedAt).toBe("2026-11-16T14:00:00.000Z");
  });

  it("projects the nested Investigation through toWireInvestigation, never a second copy", () => {
    const wire = toWireInvestigationEvent({
      type: "INVESTIGATION_STARTED",
      seq: 1,
      investigationId: investigation.id,
      investigation,
    });
    expect(wire.investigation).toStrictEqual(
      toWireInvestigation(investigation),
    );
  });

  it("carries a tool outcome unchanged — it is already the wire shape", () => {
    const wire = toWireInvestigationEvent({
      type: "TOOL_CALL_COMPLETED",
      seq: 1,
      investigationId: investigation.id,
      stepId: toStepId("step-1"),
      tool: "get_security_snapshot",
      durationMs: 5,
      outcome: { kind: "ok", value: { symbol: "NVDA" } },
    });
    expect(wire.outcome).toStrictEqual({
      kind: "ok",
      value: { symbol: "NVDA" },
    });
  });
});
