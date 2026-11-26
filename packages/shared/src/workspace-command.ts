/**
 * **The first `WorkspaceCommand` this product produces** (Task 7.4.1, ADR
 * 0051) — architectural invariant 2's own vocabulary, as a type rather than as
 * prose.
 *
 * Invariant 2: *the AI manipulates typed application state, never markup or
 * code.* Nothing in this epic is an AI, and that is the point of shipping the
 * shape here first: a deterministic backend step produces the same typed,
 * schema-shaped object Epic 10's model-driven producer will, so the pipeline —
 * **validate → permission-check → execute → record** — exists and is correct
 * before anything that cannot be reasoned about is allowed to drive it.
 *
 * ## Its own file, not `investigation.ts` and not `topology.ts`
 *
 * `investigation.ts` is ~920 lines and has already been split once
 * (`finding.ts`). `topology.ts` must stay *a pure function of the curated
 * universe alone* — three readers depend on that (Epic 7's server-side
 * questions, Epic 13's replay refusal, Story 6.1's renderer comparison), and a
 * command type living there would make the graph model import the
 * investigation engine's vocabulary.
 *
 * ## No coordinates, ever, in either direction
 *
 * A command names **symbols**. Both sides re-derive position by running
 * `buildTopologyLayout` over the same graph, which is exactly what ADR 0048
 * Decision 3's closed-form, weight-blind, filter-blind layout buys: two
 * processes, one input, byte-identical placements. A coordinate on the wire
 * would be a second home for a fact both ends already compute, and the failure
 * mode is the quiet one — a highlight landing beside the right node because the
 * server's ring radius and the browser's disagreed by a release.
 *
 * ## It is NOT the real-`Symbol` mint-site brand, deliberately
 *
 * `CLAUDE.md`'s TypeScript section names that convention (a real `Symbol`, a
 * non-empty explanation tuple, an absent arm with no member, exactly two mint
 * sites) and it is for **a constructed value with an explanation to protect** —
 * `Finding`, `AnomalyScore`. A `WorkspaceCommand` has no explanation and no
 * arithmetic: it is validated at the boundary by **structure** (is the type in
 * the producer's capability set, does every symbol resolve to a placement),
 * which is a behavioural check a brand cannot make and a brand is no evidence
 * of. It sits closer to `InvestigationId`'s string-literal tag — a value that
 * only needs to round-trip — and that asymmetry is written down here so nobody
 * copies the weaker guarantee believing it is the stronger one, or adds the
 * stronger one believing it proves something it cannot.
 */

import { asIs, toWire } from "./wire-serialiser.js";
import type { JsonValue, WireFields } from "./wire-serialiser.js";
import type { TopologyEdgeKind } from "./topology.js";
import type { Ticker } from "./ticker.js";

/**
 * The command vocabulary. **One member, deliberately** — Story 7.4's Gate 1
 * settled `set_graph_encoding` as a narrow wrapper around this one highlight
 * rather than a general encoding API, on all four shaping passes' independent
 * convergence that no reachable scenario in that story's scope needs a second
 * encoding.
 *
 * `PRODUCT_SPEC.md` §18 names several more (`focusSymbols`, `openPriceChart`,
 * `compareSymbols`, `setTimeWindow`, `pinEvidence`); each arrives as a new
 * member here with its own producer, never as a widened payload on this one.
 */
export const WORKSPACE_COMMAND_TYPES = ["highlightNodes"] as const;

/** One of {@link WORKSPACE_COMMAND_TYPES}. */
export type WorkspaceCommandType = (typeof WORKSPACE_COMMAND_TYPES)[number];

/**
 * **Highlight these securities on the market topology.**
 *
 * ## `relations` is plural, and that is this task's own judgement
 *
 * The task's draft shape carried `relation: TopologyEdgeKind`, singular. The
 * real answer **spans kinds**: `get_related_securities` answers a subject's
 * sector benchmark and sector-mates (`sector_membership`), its index parent or
 * children (`index_membership`), and every retained correlation edge touching
 * it (`return_correlation`) — and ~82–84% of drawn correlation edges join two
 * securities already in the same visible cluster, so a mixed set is the
 * COMMON case rather than an edge one. A singular field over that set is a
 * fully-formed claim that the set is one kind, which is the class of thing ADR
 * 0029 refuses; the note Task 7.4.2 writes beside the highlight would say
 * *sector peers* over a set that also holds correlated securities.
 *
 * It is the **set of kinds present**, in {@link WORKSPACE_COMMAND_TYPES}'
 * sibling `TOPOLOGY_EDGE_KINDS` declaration order, non-empty by type exactly as
 * {@link symbols} is — not a per-symbol annotation. That is the simplest shape
 * Task 7.4.2 can use honestly, because the treatment Gate 1 settled is
 * **complement de-emphasis**: one set-level visual change (dim the non-peers,
 * add no new ink to the peers) and one note. A per-symbol relation would be a
 * field with no reader, which is ADR 0029's own first rule arriving on a type.
 * The per-symbol fact is not lost — `get_related_securities`' own `Output`
 * carries each related security's own kinds — so the day a story needs
 * per-node phrasing, the command grows a field and the tool grows nothing.
 *
 * ## Why `subject` travels
 *
 * The highlighted set is *related to something*, and the thing is not derivable
 * from the set: the subject is not a member of its own highlight. A note that
 * cannot name it can only say *these are related*, which is not a sentence.
 */
export interface HighlightNodesCommand {
  readonly type: "highlightNodes";
  /** The securities to highlight. **Non-empty by type** — an empty highlight
   * is a fully-formed claim about zero nodes, which ADR 0029 refuses, and a
   * tuple makes that structural rather than a test somebody deletes. */
  readonly symbols: readonly [Ticker, ...Ticker[]];
  /** Which kinds of relationship the set was gathered by. See this type's own
   * note for why it is plural and why it is not per-symbol. */
  readonly relations: readonly [TopologyEdgeKind, ...TopologyEdgeKind[]];
  /** What they are related **to**. Never a member of {@link symbols}. */
  readonly subject: Ticker;
}

/**
 * One command.
 *
 * A one-member union, which is a shape rather than an oversight: every reader
 * switches on `type` from the first line, so the second member costs a case
 * rather than a refactor.
 */
export type WorkspaceCommand = HighlightNodesCommand;

/**
 * **Why a command was refused** — a closed vocabulary, one word per conjunct of
 * the permission check, so a refusal names which gate it failed.
 *
 * - `type-not-permitted` — the producer's declared capability set does not
 *   carry this command's own `type`. Unreachable from this epic's one
 *   deterministic producer and reachable the moment Epic 10's is not.
 * - `symbol-has-no-placement` — a named symbol resolves to no placement in the
 *   layout. **This is the conjunct that catches a wrong highlight**: a stale
 *   command naming a security untracked since it was minted, which would
 *   otherwise be a highlight drawn on nothing with no error raised.
 */
export const WORKSPACE_COMMAND_REFUSALS = [
  "type-not-permitted",
  "symbol-has-no-placement",
] as const;

/** One of {@link WORKSPACE_COMMAND_REFUSALS}. */
export type WorkspaceCommandRefusal =
  (typeof WORKSPACE_COMMAND_REFUSALS)[number];

/**
 * **What the permission stage answered** — and it is a value on the wire rather
 * than a branch taken quietly.
 *
 * `because`, never `reason`, mirroring `ToolOutcome`'s own `inapplicable` arm:
 * a handler that reads `.reason` off one of these does not compile. The two
 * vocabularies are separate on purpose — a tool refusal is *not enough
 * evidence*, and this is *we will not execute that*, which is a statement about
 * the command rather than about the market.
 *
 * `kind: "permitted"` carries the command because the **recorded** fact is the
 * command as permitted, not as proposed: a later reader of an investigation's
 * own history must be unable to tell them apart only by looking harder.
 */
export type WorkspaceCommandOutcome =
  | { readonly kind: "permitted"; readonly command: WorkspaceCommand }
  | { readonly kind: "refused"; readonly because: WorkspaceCommandRefusal };

// -------------------------------------------------------------- wire shape

const highlightNodesFields: WireFields<HighlightNodesCommand> = {
  type: asIs,
  symbols: asIs,
  relations: asIs,
  subject: asIs,
};

/**
 * One command's own wire projection — `toWireStep`'s own shape, switching on
 * `type` to the matching member's map.
 *
 * The `WireFields` idiom rather than a spread, for the reason
 * `toWireInvestigationEvent`'s own docblock gives: SSE bypasses
 * `fast-json-stringify`'s stripping entirely, so a frame built by a bare
 * `JSON.stringify` has **no** mechanical protection against carrying a field
 * the wire contract does not name.
 *
 * **There is no `switch` and no `never` guard here, and that is correct rather
 * than an omission.** `WorkspaceCommand` is a one-member alias rather than a
 * union, so a discriminant `switch` narrows nothing and a
 * `const unhandled: never = command` in a `default` does not compile — which
 * is what the first draft of this did. The exhaustiveness is held by the
 * `toWire` call itself: the day a second member joins the union, this
 * parameter stops being assignable to `WireFields<HighlightNodesCommand>`'s
 * subject and `tsc -b` names the member. `toWireStep`'s own `switch` shape is
 * the right one to adopt at that point, not before.
 */
export const toWireWorkspaceCommand = (
  command: WorkspaceCommand,
): Readonly<Record<string, JsonValue>> => toWire(highlightNodesFields, command);

/** {@link WorkspaceCommandOutcome}'s own projection. Two arms, both named. */
export const toWireWorkspaceCommandOutcome = (
  outcome: WorkspaceCommandOutcome,
): Readonly<Record<string, JsonValue>> =>
  outcome.kind === "permitted"
    ? { kind: outcome.kind, command: toWireWorkspaceCommand(outcome.command) }
    : { kind: outcome.kind, because: outcome.because };
