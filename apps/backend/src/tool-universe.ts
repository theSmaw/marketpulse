// **`not-tracked`, with one home** (Task 7.2.2).
//
// Story 7.1's one tool answered this question inside its own `run`, which was
// right while there was one tool. Story 7.2 adds four more, and its Gate 1 is
// explicit that an untracked security (`PSKY`, `WBD` since 2026-10-12) runs
// the full checklist with **each tool answering the same refusal** — so the
// predicate and the refusal object live here and every tool reads them,
// rather than five files each spelling `universe.has(symbol)` and five
// literals each spelling the word.
//
// It is a function over a membership set rather than a read of
// `trackedSymbols()`: each tool's factory already takes the set as a
// defaulted dependency so a test can supply a two-symbol universe, and that
// seam is what keeps this module from becoming a second reader of the curated
// file.

import type { ToolOutcome } from "@marketpulse/shared";

/**
 * The refusal itself, minted once.
 *
 * `ToolOutcome<never>` rather than a generic function's return: the refused
 * arm carries no value, so one frozen object satisfies `ToolOutcome<T>` for
 * every tool's own `T` — and a tool returning this cannot have mis-spelled
 * the word.
 */
export const REFUSED_NOT_TRACKED: ToolOutcome<never> = Object.freeze({
  kind: "refused",
  reason: "not-tracked",
});

/**
 * **The refusal where this security is outside the curated universe, and
 * `undefined` where it is inside it.**
 *
 * A refusal rather than a boolean, so a tool's own guard reads
 * `if (untracked !== undefined) return untracked` and cannot answer a
 * membership question with a different word — which is the defect this
 * replaces in kind: `nothing-observed` is a true sentence about an untracked
 * symbol too, and the two are genuinely different checks
 * (`TOOL_REFUSALS`' own docblock).
 */
export function untrackedRefusal(
  symbol: string,
  universe: ReadonlySet<string>,
): ToolOutcome<never> | undefined {
  return universe.has(symbol) ? undefined : REFUSED_NOT_TRACKED;
}
