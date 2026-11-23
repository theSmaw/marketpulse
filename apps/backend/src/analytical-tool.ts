// The analytical-tool contract (`PRODUCT_SPEC.md` §31) — backend-only, for
// the same reason `market-data-provider.ts` keeps its own interface out of
// the browser's type graph: a tool holds no credential, but its shape is
// infrastructure a frontend has no business depending on.
//
// `asOf` is a required argument on every call rather than a clock a tool
// reads for itself — invariant 4's own hook. A tool that wants "now" takes
// it from here, so a replay (Epic 13) is isolated by construction rather
// than by a convention a later tool can quietly break.

import type {
  Finding,
  FindingStamp,
  InvestigationId,
  InvestigationMode,
  JsonValue,
  Ticker,
  ToolName,
  ToolOutcome,
} from "@marketpulse/shared";

export interface ToolContext {
  readonly investigationId: InvestigationId;
  readonly asOf: Date;
  readonly mode: InvestigationMode;
}

/**
 * One analytical tool. `run` never throws — invariant 5's "not enough
 * evidence" is a first-class {@link ToolOutcome}, not an exception a caller
 * has to guess might arrive.
 */
export interface AnalyticalTool<Input, Output> {
  /** The closed, shared vocabulary name — what a `Step.tool` carries. */
  readonly name: ToolName;
  /** The checklist's own sentence for this tool — `"Measure move"` — never
   * the tool's identifier, which is a separate field for a separate
   * reader. */
  readonly description: string;
  readonly run: (
    input: Input,
    context: ToolContext,
  ) => Promise<ToolOutcome<Output>>;
}

/**
 * A tool with its `Input`/`Output` erased, for an `AgentProvider` that has
 * to hold a heterogeneous list of them — one real tool this story, more
 * later, each with its own shape.
 *
 * `Input`/`Output` are generic parameters of {@link toRunnableTool} rather
 * than of this type for exactly that reason: a type still carrying them
 * cannot go in one array without `any`, which is the thing this exists to
 * avoid. The erasure happens once, at the point each tool is wired up, and
 * nothing downstream of it ever needs to know what either type was.
 */
/**
 * **What one erased tool run produced: the wire outcome, and a THUNK that
 * mints its finding** (Task 7.3.1).
 *
 * ## Why a thunk rather than a `finding` field
 *
 * Because `Evidence.retrievedAt` **does not exist yet** when `run` returns.
 * Story 7.3's Gate 1 settled that the orchestrator stamps it from its own
 * injected clock at the moment it emits `FINDING_CREATED`, which is after the
 * step's `completedAt` is known — so a finished `Finding` here would either
 * carry an instant a tool had to read (which `a-tool-reads-no-clock` forbids)
 * or carry none at all.
 *
 * ## And it keeps the claim derived from the TYPED output
 *
 * The thunk is a closure over this tool's own `Output`, before
 * `analytical-tool.ts`'s deliberate erasure to `JsonValue`. A claim built from
 * the wire record instead would be built from a value whose types have gone —
 * every field a `JsonValue`, every narrowing lost — which is the one place a
 * `?? 0` or a `String(value)` would be unavoidable.
 *
 * `undefined` is the `inapplicable` answer and the whole of it: *the question
 * does not arise* mints no finding, so no `FINDING_CREATED` is emitted and the
 * row draws the inapplicability sentence Story 7.2 already ships.
 */
export interface ToolRun {
  readonly outcome: ToolOutcome<Readonly<Record<string, JsonValue>>>;
  readonly mintFinding: (stamp: FindingStamp) => Finding | undefined;
}

export interface RunnableTool {
  readonly name: ToolName;
  readonly description: string;
  readonly run: (
    subjectSymbols: readonly Ticker[],
    context: ToolContext,
  ) => Promise<ToolRun>;
}

/**
 * Closes over a tool's own `Input`/`Output` and its three conversions —
 * how to build its input from an investigation's subject, how to turn its
 * output into the JSON shape a `TOOL_CALL_COMPLETED` event carries, and how
 * to turn its outcome into the claim a `FINDING_CREATED` event carries — and
 * hands back the erased shape above.
 *
 * **The third conversion is a real, structural contract change** (Task
 * 7.3.1), unlike Story 7.2's own additions, which only ever widened an
 * existing union. It is forced by the erasure this function performs: the
 * orchestrator holds a heterogeneous list and cannot see any tool's `Output`,
 * so the only place a claim can be derived from a typed value is here, where
 * both are still in scope.
 *
 * `a-tool-takes-no-channel-to-another-step` is unaffected — it captures only
 * `run`'s own parameter list, which is untouched — and `a-tool-reads-no-clock`
 * is unaffected too: a `toFinding` co-located in a tool file takes
 * `retrievedAt` off the stamp and constructs no `Date` of its own.
 */
export function toRunnableTool<Input, Output>(
  tool: AnalyticalTool<Input, Output>,
  buildInput: (subjectSymbols: readonly Ticker[]) => Input,
  toWire: (value: Output) => Readonly<Record<string, JsonValue>>,
  toFinding: (
    outcome: ToolOutcome<Output>,
    stamp: FindingStamp,
  ) => Finding | undefined,
): RunnableTool {
  return {
    name: tool.name,
    description: tool.description,
    async run(subjectSymbols, context) {
      const outcome = await tool.run(buildInput(subjectSymbols), context);
      return {
        outcome:
          outcome.kind === "ok"
            ? { kind: "ok", value: toWire(outcome.value) }
            : outcome,
        // The closure holds the TYPED outcome, not the wire record above it.
        mintFinding: (stamp) => toFinding(outcome, stamp),
      };
    },
  };
}
