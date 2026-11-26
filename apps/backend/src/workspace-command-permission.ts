// The permission stage of invariant 2's pipeline — `validate →
// **permission-check** → execute → record` (Task 7.4.1, ADR 0051).
//
// ## It is identity-blind, by decision, and that is written down rather than
// ## left as an absence
//
// Story 7.4's Gate 1 put this in front of the Product Owner explicitly,
// because this story is the first-ever implementation of that pipeline and
// whatever ships here is the shape Epic 10's model-driven producer inherits.
// The V1 answer is a **capability allowlist**: a producer declares which
// command types it may emit, and nothing asks WHO the producer is. That is
// sufficient only while every producer is deterministic backend code in this
// repository — stated in ADR 0051's own decision text, with the reversal
// trigger: *the first producer of a `WorkspaceCommand` that is not
// deterministic backend code in this repository*.
//
// ## Both conjuncts are real, and the second is the one that earns its keep
//
// The first (`type-not-permitted`) is unreachable from this epic's single
// producer and is written as a real check over a real capability-set argument
// anyway, because a hard-coded `true` is a stage that does not exist. The
// second (`symbol-has-no-placement`) is what actually catches a wrong
// highlight: a command naming a security with no placement in the layout the
// browser will draw. That is reachable **today**, not hypothetically — a
// command minted before a curation change, or against a universe a replica
// has not reloaded, names a symbol `buildTopologyLayout` will not place, and
// the result is a highlight drawn on nothing with no error raised anywhere.
//
// ## Pure, and it takes the layout rather than building one
//
// No clock, no handle, no graph construction. The layout is an argument so
// this module has no opinion about where a node is — `the-server-places-a-
// node-only-through-the-shared-layout` holds that mechanically for the whole
// backend tree, and a coordinate computed here would be the first thing it
// caught.

import type {
  TopologyLayout,
  WorkspaceCommand,
  WorkspaceCommandOutcome,
  WorkspaceCommandType,
} from "@marketpulse/shared";

/**
 * What a producer is allowed to emit.
 *
 * A set of command **types** and nothing else — no identity, no scope, no
 * rate. See the header for why, and for the condition under which that stops
 * being enough.
 */
export interface WorkspaceCommandCapability {
  readonly types: readonly WorkspaceCommandType[];
}

/**
 * **The one capability this epic grants**, to its one producer: the scripted,
 * deterministic orchestrator.
 *
 * Declared as a value rather than inlined at the call site so there is exactly
 * one place to read *what may this product's own orchestrator do to a
 * reader's screen*, and so Epic 10's producer arrives as a **second**
 * capability beside it rather than as a widening of this one.
 */
export const ORCHESTRATOR_CAPABILITY: WorkspaceCommandCapability =
  Object.freeze({ types: ["highlightNodes"] as const });

/**
 * Permission-check one command.
 *
 * Answers a {@link WorkspaceCommandOutcome} — the same value the
 * `WORKSPACE_COMMAND` event carries — so a refusal is a thing the caller has
 * to do something with rather than a boolean it can drop. ADR 0029's rule
 * applied to a gate: a refused command is a first-class, countable outcome.
 */
export function permitWorkspaceCommand(
  command: WorkspaceCommand,
  capability: WorkspaceCommandCapability,
  layout: TopologyLayout,
): WorkspaceCommandOutcome {
  if (!capability.types.includes(command.type)) {
    return { kind: "refused", because: "type-not-permitted" };
  }

  // A set rather than a `find` per symbol: a highlight over one sector is
  // ~40–80 symbols against 516 placements, and the quadratic version is the
  // kind of thing that is invisible until a command names a cluster.
  const placed = new Set<string>(
    layout.placements.map((placement) => placement.symbol),
  );

  for (const symbol of command.symbols) {
    if (!placed.has(symbol)) {
      return { kind: "refused", because: "symbol-has-no-placement" };
    }
  }

  // **The subject is checked too.** It is not a member of `symbols` — the
  // subject is not highlighted — but the note Task 7.4.2 writes names it, so a
  // command whose subject has no placement is a sentence about a node that is
  // not on the canvas.
  if (!placed.has(command.subject)) {
    return { kind: "refused", because: "symbol-has-no-placement" };
  }

  return { kind: "permitted", command };
}
