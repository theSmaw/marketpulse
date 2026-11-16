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
export interface RunnableTool {
  readonly name: ToolName;
  readonly description: string;
  readonly run: (
    subjectSymbols: readonly Ticker[],
    context: ToolContext,
  ) => Promise<ToolOutcome<Readonly<Record<string, JsonValue>>>>;
}

/**
 * Closes over a tool's own `Input`/`Output` and its two conversions —
 * how to build its input from an investigation's subject, how to turn its
 * output into the JSON shape a `TOOL_CALL_COMPLETED` event carries — and
 * hands back the erased shape above.
 */
export function toRunnableTool<Input, Output>(
  tool: AnalyticalTool<Input, Output>,
  buildInput: (subjectSymbols: readonly Ticker[]) => Input,
  toWire: (value: Output) => Readonly<Record<string, JsonValue>>,
): RunnableTool {
  return {
    name: tool.name,
    description: tool.description,
    async run(subjectSymbols, context) {
      const outcome = await tool.run(buildInput(subjectSymbols), context);
      return outcome.kind === "ok"
        ? { kind: "ok", value: toWire(outcome.value) }
        : outcome;
    },
  };
}
