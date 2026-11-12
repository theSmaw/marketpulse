# Task 6.9.1 — The upward and sideways sweeps

**Status:** Not started
**Story:** [6.9 The Rehearsal, the Sweep, & Epic 6's Close](STORY.md)
**Depends on:** nothing (first task)

## Objective

A measurement that falsifies a governing document is supposed to be corrected
the same day it's made — and this epic's own record shows that rule did not
always fire. `PRODUCT_SPEC.md` §10 still lists all five node encodings as
open questions when every one of them is now closed by a named story; §28
still carries the unmeasured 500-node/5,000-edge target with no figure beside
it, when Story 6.7 took a real one. `ADR 0048` is owed a dated amendment
Story 6.8's own `STORY.md` named explicitly and nobody wrote. And this epic
has handed real constraints to four later epics, in prose, in task files and
story closes — this task is where those constraints get written into words
the receiving epic can actually act on, rather than left for whoever opens
this epic's documents next to rediscover.

## What the user can see when this lands

Nothing — this corrects the record, not the product.

## Work

- **`PRODUCT_SPEC.md` §10**: a dated amendment (never a rewrite) recording
  that all five node encodings — size (refused, Story 6.6), intensity (the
  signed direction in the plate, Story 6.7), shape/icon (shipped with Story
  6.2, recorded as answering this spec item only at Story 6.6's close),
  border (the anomaly ring, Story 6.3) and cluster (the sector wedge, Story
  6.2) — are each closed by a named story, and that the three edge
  relationships named in §10 (common industry, correlation, ETF/index) are
  all shipped (the first two as membership and correlation edges, the third
  implicit in the hub-to-ETF edges) with supply chain/ownership/fundamental
  similarity still in §10's own "Later" list, untouched.
- **`PRODUCT_SPEC.md` §28**, "Market topology" subsection: a dated amendment
  recording Story 6.7's real measured figure (16.7 ms median frame time)
  against the **real** shipped graph (516 nodes, ~2,372 edges) rather than
  the spec's own 500-node/5,000-edge figure, citing both the headless and
  headed readings and the one open item (the real-GPU contention noise,
  already in `docs/GAPS.md`). The "Synthetic topology" subsection gets its
  own one-line amendment confirming it is unmeasured and unattempted here,
  by scope, Epic 14's by name.
- **`ADR 0048`**: the dated amendment Story 6.8's own `STORY.md` said was
  owed — Decision 3 (closed-form, weight-blind layout) extends to also be
  **filter-blind**: a reader's sector/band filter never reaches
  `buildTopologyLayout`, for the same server/browser coordinate-agreement
  reason the decision already gives. Quote Story 6.8's own filter module's
  docblock rather than re-deriving the argument.
- **Confirm (not re-derive) `VISUAL-LANGUAGE.md` needs no action** — Task
  6.1.4's own 2026-10-30 amendment already discharges the "inherits none of
  the chart layer's idioms" claim correctly; state this in the task's own
  record rather than silently skipping it, since this story's own
  description named it as something to check.
- **Confirm whether ADR 0045's ratio-within-a-tape/level-across-tapes test is
  actually cited** in Story 6.6's node-size-refusal reasoning (the `iex`
  volume-runs-inversely-with-liquidity finding is ADR 0045's own territory).
  If the citation is missing from `TOPOLOGY.md` §6's own record, add it
  there rather than inventing new reasoning.
- **The sideways hand-offs**, written into each receiving epic's own
  `EPIC.md`, in words that epic can act on — never a link back:
  - **Epic 7**: this epic's model is what `get_related_securities`,
    `highlight_graph_nodes` and `set_graph_encoding` address — name the
    exact shared types (`TopologyGraph`, `TopologyNode`, `Sector`,
    `AnomalyBand`) and the one invariant Epic 7's own tools depend on
    (`buildTopologyLayout` reads nothing live, so server and browser agree
    on node coordinates without needing to negotiate a live state).
  - **Epic 10**: the model is what a `WorkspaceCommand` addresses — name
    which of this epic's own identifiers (`symbol`, `Sector`) are the
    stable addresses a command would reference.
  - **Epic 13**: a replayed graph needs point-in-time membership, which
    `security_memberships` only begins recording 2026-10-12 and must
    refuse earlier — cite the exact invariant 4 qualification already in
    `CLAUDE.md` rather than re-deriving it.
  - **Epic 14**: the synthetic 5,000-node/25,000-edge mode remains
    unattempted and is explicitly this epic's to confirm rather than
    build; and whether this epic's own shipped work (the 516-node/~2,372
    edge real graph, the live-update mechanism, the filter architecture)
    tripped Epic 14's own second DOM-element condition (checked once
    already at this epic's own Story 6.2/6.7 closes and found unfired —
    confirm it is still unfired after Story 6.8's filter controls, which
    add DOM elements to the region's chrome rather than one per security).
  - Record the **count of hand-offs walked and the count that were
    missing** before this task, continuing the sequence `1, 6, 3, 6, 2, 8,
10` with this epic's own eighth data point.

## Done when

1. `PRODUCT_SPEC.md` §10 and §28 carry dated amendments, not rewrites, with
   every figure cited from a real story's own measurement rather than
   re-estimated.
2. `ADR 0048` carries its owed dated amendment.
3. The `VISUAL-LANGUAGE.md` and ADR 0045 checks are confirmed in writing,
   whichever way they land.
4. Epic 7, 10, 13 and 14's own `EPIC.md` files each carry this epic's
   hand-off, in words that epic can act on.
5. The sideways-sweep count is stated as this epic's own eighth data point
   in the running sequence, with the count of misses named.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
