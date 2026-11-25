# Task 7.4.1 — The tool, the wire, and the full command pipeline

**Status:** In progress — 2026-11-25
**Story:** [7.4 The Graph Lights Up](STORY.md)
**Depends on:** none (first task)

## Objective

This is the first real implementation of invariant 2's `validate →
permission-check → execute → record` pipeline anywhere in this product.
Everything later in this story — the highlight drawing, its clearing, its
edge cases — depends on the pipeline existing and being correct, so it ships
first and alone, before anything is drawn. Gate 1 settled the open decisions
this task would otherwise have had to make unilaterally: the highlight's
lifetime is investigation-scoped (not step-scoped), the cross-route holder
lives in `App.tsx`, the permission check ships as a capability allowlist
(identity-blind by decision, V1 only), and `set_graph_encoding` ships as a
narrow wrapper around this one highlight rather than a general API.

## What the user can see when this lands

Nothing on screen. A `WORKSPACE_COMMAND` event reaches the browser's decoder
and is validated, but nothing draws it yet — that is Task 7.4.2. This is the
backbone task the rest of the story draws on, not a vertical slice in its own
right; say so plainly rather than inventing a visible effect.

## Work

- **The backend tool.** A real `AnalyticalTool<Input, Output>` — read
  `apps/backend/src/analytical-tool.ts` and `tool-compare-securities.ts` for
  the shape. Reads `buildTopologyGraph`/`buildTopologyLayout`
  (`packages/shared/src/topology.ts`, `topology-layout.ts`) over the curated
  universe and, where available, the stored correlation generation. Answers
  three relationship kinds, each row carrying a typed `relation`
  (`sector_membership` / `index_membership` / `return_correlation`), per the
  table in the business-analyst's shaping report: an equity's sector ETF plus
  its other sector-mates; a sector ETF's constituents and its one
  `index_membership` parent (`SPY`); `SPY`'s eleven sector ETFs; `QQQ`/`DIA`/
  `IWM` answer **honestly empty** for both membership kinds (they carry no
  membership edge of any kind — this is correct, not a gap). Correlation is
  the **union of every retained edge touching the node** (Gate-1-settled
  scope), not a separately bounded top-5, and is distinguished on the wire
  from "not yet measured" (CI, fresh stores — zero correlation edges, no
  nightly generation has ever run) vs "measured as none" (a real session ran,
  this security has no edge in the retained set).
  - Name it for the facts it actually answers. It covers membership AND the
    stored correlation generation, so `get_related_securities` is accurate
    scope-wise — but its docblock must say explicitly that it does **not**
    read `/market-data/relationships` (the live, on-demand measured-relation
    wire `relationships-cache.ts`/`return-correlation-selection.ts` already
    serve) and that its correlation answer is the stored nightly generation
    only. Two clearly-named facts beat one ambiguous name.
  - An untracked security (`status != 'active'`, e.g. `PSKY`/`WBD`) has no
    graph node and no placement — refuse with a named outcome distinct from
    both "unknown symbol" and "no related securities".
  - A security with zero related securities under all three kinds (`QQQ`,
    `DIA`, `IWM` today) produces **no command at all**, never an empty
    `highlightNodes` payload — an empty highlight is a fully-formed claim
    about zero nodes, which ADR 0029 refuses.
- **`packages/shared/src/workspace-command.ts`** — new file, not
  `investigation.ts` (already ~850 lines, split once already) and not
  `topology.ts` (must stay a pure function of the curated universe alone).
  ```ts
  export const WORKSPACE_COMMAND_TYPES = ["highlightNodes"] as const;
  export interface HighlightNodesCommand {
    readonly type: "highlightNodes";
    readonly symbols: readonly [Ticker, ...Ticker[]]; // non-empty by type
    readonly relation: TopologyEdgeKind;
    readonly subject: Ticker;
  }
  export type WorkspaceCommand = HighlightNodesCommand; // one member, deliberately
  ```
  No coordinates on the wire, ever — both sides re-derive the closed-form
  layout independently (preserves ADR 0048 Decision 3's server/browser
  coordinate agreement). **Do not** apply the real-`Symbol`/non-empty-tuple
  mint-site brand convention here — `CLAUDE.md`'s own statement of that
  convention is for a constructed value with an explanation to protect
  (`Finding`, `AnomalyScore`); a `WorkspaceCommand` is validated at the
  boundary by a schema and its correctness is behavioural (do these symbols
  resolve to placements?), closer to `InvestigationId`'s shape than to
  `Finding`'s. `exactOptionalPropertyTypes`: no optional fields in V1.
- **The event.** `WORKSPACE_COMMAND` gains its payload in `InvestigationEvent`
  (`packages/shared/src/investigation.ts`): `{ type: "WORKSPACE_COMMAND",
stepId, command: WorkspaceCommand }`, carrying `stepId` (unlike
  `FINDING_CREATED`, which has `Finding.stepId` as its one home — a
  `WorkspaceCommand` has no such field). Appended **after** the peer step's
  `STEP_COMPLETED`.
- **Orchestrator-level emission, not a tool side effect.** The tool answers a
  question; it has no side effect on a reader's screen. The orchestrator
  (`runSteps`' loop) calls `get_related_securities` after the peer-comparison
  step's `STEP_COMPLETED` and mints the `WORKSPACE_COMMAND` event there — the
  same place every other event is minted. Emit it even when the peer step's
  own outcome is `inapplicable` or refused, deriving the command from the
  step's **subject and curated sector**, never from its measured outcome —
  this is what makes the feature reachable on CI's permanently-zero-bar
  store, rather than permanently unreachable the way most of Epic 5 is.
- **The tool registry's two classes, declared.** `get_related_securities` is
  an `AnalyticalTool` reached from `runSteps` without being one of the six
  `toRunnableTool(` calls in `investigationTools`
  (`apps/backend/src/index.ts`) — widen `the-checklist-seeds-one-row-per-tool`
  to assert the partition explicitly (every `AnalyticalTool` is declared
  pipeline-step or orchestrator-called; the checklist count equals the first
  set only), or anchor a sibling invariant on a named second export. Do not
  ship two undeclared classes of registry member.
- **The permission check.** `permitWorkspaceCommand(command, capability,
layout): { kind: "permitted" } | { kind: "refused"; because: ... }`
  (`because`, matching `ToolOutcome`'s `inapplicable` arm — not `reason`).
  Two conjuncts: the command's `type` is in the producer's declared
  capability set, AND every target symbol resolves to a placement in
  `layout.placements`. Both real; the second is what actually catches a wrong
  highlight (an untracked symbol named by a stale command).
- **The record stage.** A permitted command is recorded into the
  `Investigation`'s own history — this stage is currently unspecified
  anywhere in STORY.md or the shaping reports and was flagged by the
  technical architect as missing. Without it, a command that executed left no
  trace, which is invariant 5's territory (provenance) arriving on a
  different surface uncovered.
- **Observable refusal.** A refused command is a first-class, countable
  outcome on the wire (ADR 0029's rule) — never a silent drop.
- **Two new `pnpm invariants` entries, each with a `pnpm break`:**
  1. The server's answer about where a node is comes from `buildTopologyLayout`
     and nowhere else — a corpus clause over `apps/backend/src/**` refusing
     any arithmetic on a topology layout constant outside a call to the
     shared builder. `no-renderer-type-in-the-graph-model`'s own corpus is
     `packages/shared/src` and does **not** reach this new backend file —
     confirm that by reading `scripts/check-invariants.mjs`'s `CORPUS`
     constant directly, do not assume `EPIC.md` line 599's instruction to
     "confirm it still reaches your new file" is correct as worded (it rests
     on a misreading of that check's own scope); give `EPIC.md` a dated
     amendment there rather than a silent edit.
  2. The tool registry's two classes are declared (above).
  3. (If not already covered by #1/#2) no `WorkspaceCommand` reaches
     execution without all four pipeline stages — write this as a real check
     over the pipeline's call sites, not a test over today's one producer
     (`a-ranked-score-list-is-one-cohort`'s own lesson: a test over today's
     fixtures is green with the partition deleted).
     Per this repository's own rule: write the file the next story would write,
     confirm the check passes wrongly first, then fix, then confirm red, then
     delete the plant file.
- **One ADR, next number after 0050.** Title along the lines of "the first
  `WorkspaceCommand`: where it lives, why it carries no coordinates, which
  stream carries it, and what permission-checking means before there is an
  identity to check." Four decisions in one record: the command's home
  (`workspace-command.ts`, not `investigation.ts`/`topology.ts`); no
  coordinates on the wire; the SSE investigation stream, never the
  market-stream WebSocket (reject with its three grounds: the stack's own
  stream-separation rule, invariant 4's stale-tab replay risk, and the
  blast-radius cost of a protocol-version bump breaking every live price on a
  stale tab); and the permission stage shipping as a capability allowlist,
  **identity-blind by decision**, stated plainly in the decision text (not a
  footnote) as sufficient only while every producer is deterministic backend
  code in this repository, with the reversal trigger: _the first producer of
  a `WorkspaceCommand` that is not deterministic backend code in this
  repository_. Give ADR 0048 a dated amendment noting Decision 2's own
  reversal trigger (_"the first consumer of the graph model that is not a
  browser"_) fired at this task, without rewriting 0048's decision text.

## Done when

1. `get_related_securities` is a real, tested `AnalyticalTool` reading only
   `buildTopologyGraph`/`buildTopologyLayout` and the stored correlation
   generation; its docblock states the `/market-data/relationships` boundary.
2. `packages/shared/src/workspace-command.ts` exists with the shape above,
   built and exported; no coordinates anywhere in it or in the event.
3. The orchestrator emits `WORKSPACE_COMMAND` after the peer step's
   `STEP_COMPLETED`, including on `inapplicable`/refused peer outcomes,
   proven by a test exercising the refused/inapplicable arm specifically.
4. An untracked symbol and a zero-peers subject each produce the documented
   refusal/absence — no empty `highlightNodes` payload is ever emitted.
5. The permission check's both conjuncts are real and independently tested;
   a refusal is observable and countable; a permitted command is recorded
   onto the `Investigation`.
6. The two (or three) new `pnpm invariants` entries exist, each proven red by
   its own `pnpm break` entry before being proven green.
7. The ADR is written, numbered correctly, and ADR 0048 carries its dated
   amendment.
8. `pnpm verify` is green; the new invariants count is stated and correct.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
