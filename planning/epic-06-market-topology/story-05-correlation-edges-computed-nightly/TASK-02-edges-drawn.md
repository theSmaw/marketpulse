# Task 6.5.2 — Edges, drawn

**Status:** Not started
**Story:** [6.5 Correlation Edges, Computed Nightly, & the Strongest N](STORY.md)
**Depends on:** 6.5.1

## Objective

Task 6.5.1 writes rows nobody reads. This task is what makes Story 6.5's own
promise true on screen: securities that move together are drawn together, and
the graph stops being only a sector diagram.

## What the user can see when this lands

Correlation edges, drawn between equities whose returns move together,
alongside the existing sector-membership edges — at every width, in every
data state (a store with real rows, a store that has never run the pass, and
a store that ran the pass and retained nothing).

## Work

- **A new route** serving the newest pass's retained set: session-keyed, with
  an explicit as-of parameter (never a clock read — the same discipline
  `buildTopologyGraph`'s own Epic 13 hand-off already commits to), and
  stating its own population (pairs considered, pairs measured, securities
  refused) per ADR 0029 — a graph that joins only the row table under-reports
  and looks correct. Cached by the session, not the request instant
  (`last-closes-cache.ts`'s own repaired defect is the trap to avoid).
- **`packages/shared/src/topology.ts`**: `TOPOLOGY_EDGE_KINDS` gains
  `return_correlation`; `TopologyEdge` becomes a discriminated union with the
  new kind carrying a **required** weight, structurally absent on the two
  membership kinds (the reversal trigger the module's own docblock
  pre-committed to, firing exactly as worded). `buildTopologyGraph` itself
  does **not** change signature — add a separate, equally pure merge function
  (e.g. `withCorrelationEdges(graph, correlations)`) so the model stays a
  function of the curated universe alone and the correlation set is a second,
  explicit input rather than a second thing the builder reads. Keep the
  existing byte-comparable-sort guarantee: the new edges sort deterministically
  by `from`, `to`, `kind`, which requires the pair's canonical order to agree
  between the stored rows and the graph model's own tickers.
- **`apps/frontend/src/topology/graph-source.ts`**: fix the existing memo to
  key on **every** input the merge now takes, not only the securities array's
  identity — a real latent defect the shaping found: a correlation set
  arriving while the securities array is unchanged would otherwise silently
  serve the stale, edge-less graph, invisible to any test where both inputs
  change together.
- **Renderer**: a third batched stroke for `return_correlation` edges.
  Address the short-edge-drop defect the shaping found —
  `renderer-canvas.ts`'s existing `length <= head + tail` clearance check
  silently drops any segment shorter than its own end-padding, and a
  same-sector correlation pair (adjacent nodes inside one cluster, the
  shortest segments in the whole layout) is exactly the shape most likely to
  be dropped. Either give a short correlation edge a minimum legible
  treatment with the count of anything still dropped stated honestly, or
  document and count the drop deliberately — but do not let it stay a silent,
  undocumented gap the way it has been since the membership-edge code was
  written (harmless there; not harmless here).
- **Three absence/presence states, each with its own honest account** (no new
  ink in the first two — the picture is byte-identical to today's except for
  the sentence):
  1. the pass has never run (CI, every laptop, forever) — no pass row;
  2. the pass ran and every candidate pair was refused or cut — a pass row,
     zero retained rows;
  3. the pass ran and produced rows — edges drawn.
- **The missing degraded state** the shaping found: the universe loads
  successfully but the correlation route fails or times out. The canvas and
  its membership edges must stay drawn and intact — this product's own
  failure-handling rule (a failed part leaves the rest of the workspace
  intact and clearly labelled) applies here for the first time inside this
  region, which today has only one failure state (the universe request
  itself failing). One sentence names the gap; nothing blanks what is already
  correctly on screen.
- **The accessible sentence** gains one clause stating the population/reach
  figure (never a per-edge fact, never a correlated pair named) — one builder,
  three variants for the three states above. The `role="status"` selection
  announcement Story 6.4 built stays unchanged: no per-edge or per-neighbour
  fact is added to it, deliberately, because that is exactly the shape of
  Story 6.4's own measured arrow-key-auto-repeat cadence problem at its worst.
- **No hover, no select, no keyboard reachability for an edge itself** — nodes
  only, this story. Write the gap into Story 6.6's own `STORY.md`, in words
  that story can act on, rather than leaving it implicit.

## Done when

1. A correlation edge renders, at every tested width, distinguishable from a
   membership edge, over a store holding real rows.
2. All three absence/presence states and the degraded-read state each draw
   their own correct, distinct picture, confirmed with `pnpm probe`.
3. The graph-source memo fix is covered by a test that changes one input and
   not the other and asserts the merge re-runs.
4. `pnpm invariants`, `pnpm test` and the relevant component/unit suites are
   green; `pnpm e2e`'s topology specs pass against the new route.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
