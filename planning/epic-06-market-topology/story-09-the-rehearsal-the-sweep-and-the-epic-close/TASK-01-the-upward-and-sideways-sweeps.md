# Task 6.9.1 — The upward and sideways sweeps

**Status:** Complete — 2026-11-12. Four sideways hand-offs walked, one found
missing (Epic 10 had none) — this epic's own eighth data point in the
sequence is **1**.
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

---

## What was done — 2026-11-12

**The upward sweep — `PRODUCT_SPEC.md` §10 and §28.** §10 gained a dated
amendment closing all five node encodings by name (size refused/6.6,
intensity/6.7, shape-icon/6.2, border/6.3, cluster/6.2) and recording the
three edge relationships' real status (common industry + ETF/index shipped
as membership edges in 6.2, correlation shipped in 6.5 with N=5 measured in
6.5.3, supply-chain/ownership/fundamental-similarity untouched in "Later").
§28's "Market topology" subsection gained a dated amendment citing Story
6.7's real figure — **16.7 ms median frame time, the 60 FPS line exactly**,
on both the headless floor and a real Apple M3 GPU — against the real
516-node/~2,372-edge graph, both headless and headed, with the real-GPU
contention caveat named. §28's "Synthetic topology" subsection gained a
one-line amendment confirming it is unattempted here, Epic 14's by scope.

**`ADR 0048`** gained the amendment Story 6.8's own `STORY.md` said was
owed: Decision 3 (closed-form, weight-blind layout) now also reads
**filter-blind**, quoting Story 6.8's own filter module's docblock and the
`the-topology-layout-is-built-from-the-whole-universe` invariant rather than
re-deriving the argument.

**`TOPOLOGY.md` §6** gained one citation sentence naming ADR 0045 as the
source of the volume-inversely-with-liquidity finding behind the node-size
refusal — confirmed via `grep` that ADR 0045 was never cited in this file
before this edit (0 results).

**`VISUAL-LANGUAGE.md` — confirmed, no action needed.** Task 6.1.4's own
2026-10-30 amendment (line 757, found via `grep -an` — this file is
misdetected as binary `data` by `file(1)`) already states the topology
"is still not an inheritor of this document's chart-lane vocabulary"
regardless of which renderer shipped. The claim this task was asked to
check is already correctly discharged.

**`ADR 0045`'s own citation — confirmed present, action taken.** It was
**not** cited in `TOPOLOGY.md` before this task (0 grep hits); it is now,
per the edit above.

**The sideways hand-offs — four walked, one found missing.**

- **Epic 7** — `planning/epic-07-deterministic-investigation-engine/
EPIC.md`. Its existing hand-off (Story 6.1's close, 2026-10-30) claimed
  "no edge carries a strength today, by design... `TopologyEdge` has no
  `weight` field." **Confirmed stale by reading the real current types**
  (`grep -an` on `packages/shared/src/topology.ts`, required for the same
  file(1) misdetection): `TopologyEdge = TopologyMembershipEdge |
TopologyCorrelationEdge`, and `TopologyCorrelationEdge` carries a
  **required** `weight: number`. Wrote a dated amendment: correlation
  edges now exist with real weight and a reader should check `kind` before
  assuming every edge is shaped alike; the anomaly band/treatment
  (`TopologyAnomalyTreatment`) is confirmed, by reading
  `apps/frontend/src/topology/renderer.ts:51`, to exist **only** on the
  frontend — never in `packages/shared` — so it is live application state
  a server-side tool cannot read from the graph model, only from the same
  composite-score source the frontend reads; and the sector/band filter
  (Story 6.8) is likewise positional state outside the shared model.
- **Epic 10** — `planning/epic-10-ai-assisted-investigations/EPIC.md`.
  **Confirmed to have no existing Epic-6-sourced hand-off at all** (grep
  for "Handed here" found only Epics 4 and 5). Wrote a brand-new section
  naming `symbol` and `Sector` as the stable addresses a `WorkspaceCommand`
  could reference, and naming the filter and the live anomaly band as two
  facts with **no** stable address — the filter lives in the URL/component
  state, the band is frontend-only live state — so a command cannot target
  either today.
- **Epic 13** — `planning/epic-13-market-replay/EPIC.md`. Read both
  existing hand-offs in full (Story 6.1's close on `buildTopologyGraph`'s
  own membership bound, and Task 6.5.4's on `withCorrelationEdges`'
  silent-drop behaviour). **Confirmed current, no amendment needed**:
  neither Story 6.7's live updates nor Story 6.8's filtering introduces a
  new membership-sensitive site — both are read-side concerns over an
  already-built graph, not new builders or mergers.
- **Epic 14** — `planning/epic-14-performance-scale-validation/EPIC.md`.
  Its existing hand-off (Story 6.1's close) quoted a stale node/edge count
  (518/514, predating the 2026-10-12 untracking and Story 6.5's correlation
  edges) and stated the shipped renderer's standing against §28's first
  line was wholly unmeasured. **Confirmed partially stale**: wrote a dated
  amendment correcting the count to 516 nodes/~2,372 edges, and correcting
  the "unmeasured" claim to **half-true** — Story 6.7's real `--live`
  route-level measurement (16.7 ms median, cited above) now answers §28's
  500-node/5,000-edge line at the real scale this product runs today; the
  5,000/25,000 synthetic line remains entirely Epic 14's own and
  unmeasured. Also noted Story 6.8's filter ships filter-blind, so a
  synthetic-mode instrument needs no filtered arm.

**Count: 4 hand-offs walked, 1 missing before this task (Epic 10).**
Continuing the sequence `1, 6, 3, 6, 2, 8, 10` — this epic's own eighth data
point is **1**.

### Gates

`pnpm links` — 653 documents, 2034 cross-file links, 39 anchor links, 0
broken. `pnpm format` — all files unchanged (no reformatting needed).
`pnpm verify` — green: build, lint, format:check, stories, env:check,
links, invariants (**86 hold**, Epic 4's own waived rehearsal row 4.7
printed as expected), coverage:check, test (packages/shared 711 tests,
backend 1388, frontend 1956, all passed), test:scripts (21 passed),
test:process (60 passed). Load read beforehand via `uptime`: `3.65 2.91
2.75`.

## For a stakeholder — a status report, 2026-11-12

This task is pure record-correction — nothing changed on any screen. It
closed a gap this epic's own documents had been carrying since earlier
stories: `PRODUCT_SPEC.md` still described two of this epic's biggest
decisions (the five node encodings, the 60 FPS target) as open questions
with no figure, when every one of them had already been answered and
measured by a named story. It also found, and fixed, a real factual error
sitting in Epic 7's own planning file — it claimed this product's topology
edges never carry a measured strength, which was true when it was written
and has been false since Story 6.5 shipped weighted correlation edges three
weeks ago. And it found a gap nobody had noticed: Epic 10, which will let
an AI agent drive this screen, had no guidance at all on how to address it
— that guidance is now written. Epic 13's existing guidance checked out as
still accurate. Epic 14's guidance had a stale headcount and an overstated
claim about what remained unmeasured, both corrected. Full verification is
green on the corrected tree.
