# Story 7.4 — The Graph Lights Up

**Status:** Not started
**Epic:** [Epic 7 — Deterministic Investigation Engine](../EPIC.md)
**Depends on:** 7.2
**Epic scope covered:** `get_related_securities`, `highlight_graph_nodes`
and `set_graph_encoding`; the first `WORKSPACE_COMMAND` event this epic
produces.

## Description

**This is the one story in this epic that makes two separate epics'
finished work visibly agree with each other, which is why it is sequenced
ahead of the risk-reduction stories around it.** Epic 6 closed having
built the market-as-a-graph model specifically so a later, non-browser
consumer could read it — `packages/shared/src/topology.ts`'s own
`no-renderer-type-in-the-graph-model` invariant names its reversal trigger
as _"the first consumer of the graph model that is not a browser"_ in as
many words. This story is that consumer.

**`get_related_securities` is answerable today, directly from
`TopologyGraph`, with no new computation** — a node's sector membership,
its cluster's other members, and the hub-and-spoke relationship to `SPY`
are already graph edges. This story's own peer-comparison step (Story
7.2) is the natural caller: once the tool knows the investigated
security's sector benchmark, this tool answers which other securities
share it.

**`highlight_graph_nodes` needs `TopologyLayout` too**, because
"highlight these nodes" is meaningless without knowing where they are —
this story reads `layout.placements`, never invents a second coordinate
system, and respects `TOPOLOGY_NODE_FOOTPRINT` when deciding how close is
close.

**The emitted command is deterministic, not AI-chosen, which is the
needle this story threads.** `WorkspaceCommand` generation by a model is
explicitly Epic 10/11's territory (`PRODUCT_SPEC.md` §18) — but a
deterministic tool's own output can still drive one: when the
peer-comparison step completes, the investigation orchestrator emits a
`WORKSPACE_COMMAND` whose payload is this tool's own answer, validated
and permission-checked exactly as invariant 2 requires for any
`WorkspaceCommand`, executed against the trusted, pre-existing topology
component. No code is generated; a typed command is, by a deterministic
step, exactly as a database migration or a nightly job is "automatic"
without being AI.

**One fact this epic's own model cannot answer, named so this story does
not try to invent it.** `EPIC.md`'s own amendment from Epic 6's close
states that a reader's current filter (Story 6.8) and the live anomaly
band (Story 6.3/6.7) are not in the shared graph model at all — the
filter lives in the URL, the band is frontend-only live state. This story
highlights nodes **regardless of the reader's current filter and
regardless of band** — if a highlighted peer is currently filtered out
of view, the highlight still fires and the topology's own filter-blind
layout (`ADR 0048` Decision 3) still draws it; this story does not change
that decision, only uses the model within its existing bound.

## What the user can see when this story lands

Running an investigation now visibly highlights the investigated
security's real peers on `/`'s topology graph while the peer-comparison
step runs — the first moment in this product where starting an
investigation on one page visibly changes another.

## Acceptance criteria

1. `get_related_securities` answers from `TopologyGraph` directly, with
   no new graph computation, for the three relationship kinds already
   present as edges.
2. `highlight_graph_nodes` reads `TopologyLayout`'s own placements and
   respects `TOPOLOGY_NODE_FOOTPRINT`; it invents no second coordinate
   system.
3. The peer-comparison step (Story 7.2) calls `get_related_securities`
   and the result becomes a `WORKSPACE_COMMAND` event carrying a
   `highlightNodes`-shaped payload, validated and permission-checked
   through the same pipeline invariant 2 requires of any
   `WorkspaceCommand`.
4. The highlight fires regardless of the topology's own current
   sector/band filter and regardless of any node's live anomaly band —
   confirmed this does not require, and does not receive, any change to
   `ADR 0048`'s filter-blind layout decision.
5. `set_graph_encoding` exists as a typed tool, with its own scope
   stated plainly: whatever this story settles it can deterministically
   encode (confirm at this story's own shaping which encodings are
   reachable without a model choosing one — likely none beyond the
   highlight itself, in which case this tool ships as a narrow,
   explicitly-scoped wrapper rather than a general-purpose one).
6. No code or markup is generated anywhere in this path — the command is
   a typed object the topology component already knows how to execute,
   and `pnpm invariants` confirms no new call site bypasses the existing
   validate → permission-check → execute → record pipeline.
7. The highlight is visible on `/` while the peer-comparison step is
   running, on the same browser session the investigation was started
   from.
8. Clearing the investigation (or its own completion) clears the
   highlight, leaving the topology exactly as a reader would have left
   it themselves.

## Open decisions — for the Product Owner

- **What does `set_graph_encoding` actually ship as, given this epic has
  no model to choose an encoding?** The recommendation is a narrow tool
  scoped to exactly the highlight this story already builds, with its own
  reversal trigger (_the first time Epic 10/11 wants to choose an
  encoding dynamically_) rather than a general-purpose encoding API built
  ahead of a caller that needs one.

## Out of scope

Any encoding choice not already covered by the peer-comparison highlight.
A model choosing which nodes to highlight (Epic 10/11). Persisting a
highlight past the investigation's own session.
