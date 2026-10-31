# Task 6.2.2 — The Elliptical Ring, & the Label-Collision Fix

**Status:** Not started
**Story:** [6.2 The Topology Takes the Landing Page](STORY.md)
**Depends on:** 6.2.1

## Objective

The circular layout Story 6.1 shipped cannot carry a legible graph in `/`'s
real band — it is height-bound and wastes over half the width. `docs/GAPS.md`'s
open label-collision defect names this story as owner; Gate 1 found that the
right fix is a reshaped ring (not a bigger one), derived and verified in the
Design work section of `STORY.md`. This task builds it.

## What the user can see when this lands

**The graph fills its band properly, and the sector label that used to cross
into a neighbour's circle clears it.** At narrow widths, where no ring shape
can make the longest label fit, a cluster draws with no label rather than a
colliding one.

## Work

- **`packages/shared/src/topology-layout.ts`**: replace
  `TOPOLOGY_RING_RADIUS` (a single constant) with `buildTopologyLayout(graph,
options?: { ringRadiusX?: number; ringRadiusY?: number })`, defaulting to
  `ringRadiusX = 800, ringRadiusY = 340` (`STORY.md`'s Design work has the
  full derivation and the swept figures). The centroid placement
  (`fromTwelve`-style) becomes elliptical:
  `x = ringRadiusX · sin(turn), y = −ringRadiusY · cos(turn)`.
  **The wedge allocation changes from angle-proportional to arc-length-
  proportional** — this is the part that actually fixes the collision, not
  the stretch alone. Integrate (or closed-form approximate to a stated,
  tested tolerance) the ellipse's arc-length element
  `√(ringRadiusX² cos²t + ringRadiusY² sin²t) dt` and allocate each sector's
  turn span so its **arc length**, not its angle, is proportional to its own
  cluster radius. No simulation, no iteration to convergence, no random seed —
  closed form or a bounded, deterministic numerical integration (e.g. a fixed
  Simpson's-rule pass), proved by a test asserting the same input twice gives
  byte-identical output.
- **`topologyClusterRadius`, the golden-angle member spiral and the hole
  radius are unchanged** — nothing inside a cluster depends on the ring
  shape. Confirm the closest-node-pair figure (17.83 units) is unaffected by
  the new test.
- **A new disjointness test**, because the ellipse makes it allocation-
  dependent rather than unconditional: assert every pair of cluster circles
  is disjoint at the shipped radii, over the real fixture — not a comment
  claiming it, a test proving it. Write it red first against the
  angle-proportional allocation (the canvas's own naive `540 × 185` plant is
  the one to use — Design work has the −53.2-unit overlap figure), confirm it
  catches the overlap, then make it pass against the arc-length allocation.
- **`ADR 0048`'s Decision 3 gets a dated amendment** recording that
  "genuinely, unconditionally true" was true only for a circular ring, and
  naming the new test as what makes it true again for an elliptical one.
- **Update `topology-layout.test.ts`'s label-clearance test** (the
  regression-floor one Task 6.1.3 shipped) to the real resolved boxes from
  Task 6.2.1's probe pass, at the new ring shape. It should flip from a
  regression floor (`toBeGreaterThanOrEqual(-30)`) to a **correctness claim**
  (`toBeGreaterThan(0)`) at the two-column widths, per Design work's swept
  figures (+14 to +30px depending on box). Keep the same "proved wrong before
  right" discipline Task 6.1.3 established: run against the circular ring
  first, confirm it still fails there, then against the new ellipse.
- **The renderer-side fit-scale threshold** (`apps/frontend/src/topology/
renderer-canvas.ts`): below the derived threshold (~0.365, re-derive against
  the real boxes rather than citing the figure in this task file), draw no
  sector labels at all. Above it, draw them as today. This is the ≤860 half of
  the fix — no ring shape clears a label physically wider than the box.
- **`pnpm break` entries** for the new disjointness test and the fit-scale
  threshold, following this repository's "write the defect somebody else will
  write, confirm it fails wrongly first" discipline.
- **`pnpm probe --story components-markettopology--whole-universe`** and look
  directly at `COMMUNICATION SERVICES` — the GAPS entry's own re-measure
  command, which is what actually closes it, not the test passing alone.

## Done when

1. `buildTopologyLayout` takes an elliptical radius pair, defaulting to
   `800 × 340`, with arc-length wedge allocation.
2. A new test proves cluster-circle disjointness at the shipped radii —
   proved wrong against the naive angle-proportional ellipse first.
3. `topology-layout.test.ts`'s label-clearance assertion is a correctness
   claim at the real two-column boxes, and a regression floor (not yet zero)
   at the ≤860 box, both proved wrong-then-right.
4. The renderer draws no sector label below the derived fit-scale threshold.
5. `docs/GAPS.md`'s label-collision entry is updated: either closed (if the
   real resolved boxes clear it everywhere) or narrowed to name exactly which
   remaining box, with its real owner condition.
6. ADR 0048 carries its dated amendment.
7. Both new `pnpm break` entries pass for real.
8. `pnpm build && pnpm lint && pnpm format:check` all exit 0; `pnpm
--filter @marketpulse/shared test` green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
