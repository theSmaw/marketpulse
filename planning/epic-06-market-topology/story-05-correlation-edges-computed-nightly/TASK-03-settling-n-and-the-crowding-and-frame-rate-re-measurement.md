# Task 6.5.3 — Settling N, and the crowding/frame-rate re-measurement

**Status:** Not started
**Story:** [6.5 Correlation Edges, Computed Nightly, & the Strongest N](STORY.md)
**Depends on:** 6.5.2

## Objective

Open Decision 1 settled the selection _mechanism_ at Gate 1 (union, stored
once) but deliberately deferred the _figure_ to a measurement against the
real, running app — because N is not answerable by argument: it trades off
against §28's edge-count ceiling, against the renderer's own measured frame
rate (ADR 0048's reversal trigger is the first graph whose node or edge count
exceeds the candidate it was measured at — 518 nodes, 514 edges — and this
story can push edges well past that), and against the real crowding Story 6.4
already measured in the densest cluster. This task takes that measurement
rather than letting N stay a guess that happened to ship.

## What the user can see when this lands

Nothing new on screen — N may change from whatever Task 6.5.2 shipped with as
a working default, and the picture may get sparser or denser as a result.

## Work

- **Re-run `scripts/topology-interaction-probe.mjs`** to confirm the 0.0 px
  closest-node-pair hit-test figure Story 6.4 measured is unchanged — cheap,
  and done because this document's own standing rule is to confirm rather
  than assume a carried-forward figure, not because the result is in doubt
  (edges do not move node placements).
- **A new probe arm**, sharper than the confirmation above: whether a
  correlation edge's drawn endpoint actually lands inside the hit radius of
  the node it names, or inside a crowded neighbour's — using the probe's own
  difference method (toggle one edge, read the moved pixels, compare the
  centroid against both candidate nodes). This is the real new risk Story
  6.4's hand-off under-named: an edge drawn to the wrong node in a contested
  pair is a silent, wrong-looking claim about correlation, not a missed
  click.
- **Measure the real retained-edge count** under the union construction
  against §28's "several thousand edges" ceiling, at the working N shipped
  in 6.5.2 and at least one neighbouring candidate.
- **Measure the intra-sector share** of the retained set — the figure Open
  Decision 4 asked this story to report rather than assume. If it is near
  100%, say so plainly: the edge layer is mostly restating the clustering the
  membership edges already draw, which is a finding for Gate 2 and for
  `TOPOLOGY.md`, not a silent shrug.
- **Re-take ADR 0048's frame-rate figure** at the real shipped edge count —
  its own reversal trigger firing. If §28's 60 FPS at 500 nodes / 5k edges is
  not met at the N this task is about to settle on, that is a renderer
  decision or a smaller-N decision, and it is **routed to the Product Owner**
  rather than decided unilaterally — `PRODUCT_SPEC.md` §28 names exactly two
  standing exceptions, both owned by Epic 14, and a third is not this task's
  to create.
- **Settle N** from the measurements above, with the rejected candidates and
  the reversal trigger for revisiting it recorded in `STORY.md`'s own Open
  Decision 1, in the same dated-amendment idiom the rest of this story's
  decisions already use.
- **Extend `overview-market-topology.spec.ts` and `overview-degraded-grid.spec.ts`**
  for the new states Task 6.5.2 drew. Ground the claim correctly: the
  existing spec's independent-recompute property (fetch `GET /securities`,
  rebuild the graph, check the canvas against that answer) now covers only
  the membership half once edges have a second source. Add the equivalent
  for the correlation half — a check grounded outside the frame (does this
  deployment have a correlation pass at all, the way
  `security-abnormal-move.spec.ts` asks whether a provider exists) rather
  than a pass-through assertion that would stay green with the producer's
  selection logic deleted.

## Done when

1. The new probe arm runs and its finding (edge endpoint attribution in the
   densest cluster at the narrowest width) is recorded, not just performed.
2. The intra-sector share and the real edge count are measured and recorded
   verbatim.
3. The frame-rate re-take is recorded against §28, with either a clean pass
   or an explicit escalation to the Product Owner — never a silent third
   exception.
4. N is settled in `STORY.md` with its own dated amendment; the extended e2e
   specs are green and `pnpm e2e` passes in full for the topology battery.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
