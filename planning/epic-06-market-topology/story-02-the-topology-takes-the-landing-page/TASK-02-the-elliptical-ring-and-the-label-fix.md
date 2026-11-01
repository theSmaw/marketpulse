# Task 6.2.2 — The Elliptical Ring, & the Label-Collision Fix

**Status:** **Complete — 2026-11-01.** The elliptical ring (`800×340`) with
arc-length-proportional wedge allocation ships; disjointness clears by
131.40 units (up from 57.69 circular), and the label collision this story
inherited is **closed rather than narrowed** — at the one real content box
that clears the renderer's own new fit-scale threshold (1440, scale 0.4604),
every label clears by +14.99px; at the other three real widths (1024, 768, 390) the renderer draws no sector label at all, so the negative geometry
there never reaches a reader.
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

**Done-when #3's own premise is corrected by this task's own measurement**:
"a regression floor (not yet zero) at the ≤860 box" assumed some real box
would draw a label with imperfect-but-floored clearance. Measured against
the real content boxes Task 6.2.1 found, that case does not occur — the
renderer's own fit-scale threshold means a sector label either draws
correctly (1440) or does not draw at all (1024, 768, 390). See "What was
done" below for the real figures.

---

## What was done — 2026-11-01

**The ring, and the allocation.** `buildTopologyLayout(graph, options?)` now
takes `{ ringRadiusX?, ringRadiusY? }`, defaulting to
`TOPOLOGY_RING_RADIUS_X = 800` / `TOPOLOGY_RING_RADIUS_Y = 340`. Centroid
placement is `x = ringRadiusX·sin(turn), y = −ringRadiusY·cos(turn)`. Wedge
allocation is **arc-length**-proportional rather than angle-proportional: a
fixed composite Simpson's-rule pass (`buildArcLengthTable`, 3600 sub-intervals,
no adaptive convergence) builds the ellipse's own cumulative arc-length table
once per `(ringRadiusX, ringRadiusY)` pair, and each sector's wedge midpoint is
found by inverting it (`bearingAtArcLength`, binary search + linear
interpolation) at the midpoint of its own allocated arc-length share. Both
are pure functions of the graph and the radii — same input, same output,
asserted by the existing determinism tests, which still pass unchanged.
`topologyClusterRadius`, the golden-angle member spiral and the hole radius
are untouched; the closest NODE pair is still exactly **17.83** units,
confirmed by the pre-existing test.

**Proved wrong before right, twice**, per the house discipline:

1. The canvas's own naive elliptical recommendation (`540×185`, same
   angle-proportional allocation) reproduces the Design work's **−53.2-unit**
   `health_care`/`financials` overlap exactly (measured −53.30). The SHIPPED
   `buildTopologyLayout`, called with those same `540×185` radii, clears by
   **+21.59 units** at the same pair — proving the allocation rule, not the
   stretch, is the fix, even beyond the radii actually shipped.
2. The superseded CIRCULAR ring (`buildTopologyLayout(graph, {ringRadiusX:
400, ringRadiusY: 400})`, Task 6.1.3's own radius) still fails the real
   1440 content box by **−33.63 px** on the same
   `communication_services`/`consumer_discretionary` pair; the shipped
   ellipse clears it by **+14.99 px** (a different worst pair,
   `consumer_staples`/`energy`, because the longer `x` axis moves which
   bearing is tightest).

**Disjointness, measured.** Every sector now receives `3728.74 / 839.75 ≈
4.44 · r_s` of arc against the `2 · r_s` it occupies — **122% more arc than
it occupies**, against the circular ring's ~50%. Closest cluster-circle
clearance: **131.40 units** (`energy`/`utilities`), up from 57.69.

**The label collision — closed, not narrowed, and the resolution corrects
this task's own premise.** The task file's Done-when #3 expected "a
correctness claim at the two-column boxes, and a regression floor (not yet
zero) at the ≤860 box." Measured against the REAL content boxes Task 6.2.1's
probe found (not the `1026×520`-style boxes `STORY.md`'s Design work
assumed before the route existed), that premise turned out to be wrong in a
good way: fit scale at the four real widths is **0.4604, 0.3033, 0.3650,
0.1639** (1440/1024/768/390). A derived threshold —
`TOPOLOGY_SECTOR_LABEL_MIN_SCALE = 0.38` in `renderer-canvas.ts`, re-derived
by binary search (bare crossover ≈0.3727, rounded up for margin) rather than
cited from the `~0.365` the design canvas guessed — means only 1440 ever
draws a sector label, and it clears. There is no width left where a label
draws with imperfect-but-floored clearance; it is binary, correct at one
real box, suppressed at the other three. `topology-layout.test.ts` carries
both halves as mechanical tests.

**The renderer.** `renderer-canvas.ts`'s `DrawableLabel` gained a `sector:
boolean` discriminator (tickers and the `MARKET PROXIES` heading are never
gated — they sit in the column, clear by construction). The draw loop skips
a sector label when `view.scale * view.zoom < TOPOLOGY_SECTOR_LABEL_MIN_SCALE`
— the CURRENT effective scale, including interactive zoom, so a reader who
zooms into a cramped box earns the label back rather than it staying
suppressed at the initial fit. The `MARKET PROXIES` column filter changed
from an `x > TOPOLOGY_RING_RADIUS` threshold (meaningless once the ring has
two radii) to `proxy.symbol !== TOPOLOGY_HUB` — clearer and shape-independent.

**Verified visually, not just by assertion.** `pnpm probe --story
components-markettopology--whole-universe` (Storybook's own generous box) and
`pnpm probe /` (the real route, all four widths) both confirm: at 1440,
`COMMUNICATION SERVICES` and every other sector label sits clearly clear of
its neighbours; at 1024 (and 768, 390), no sector label draws at all — a
clean, legible graph rather than a cluttered or colliding one.

**`pnpm invariants` caught one real defect during implementation**:
`no-imputed-zero-in-a-figure` refused `arcTable[arcTable.length -
1]?.s ?? 0` — a structurally-impossible absence dressed as a default.
Repaired by having `buildArcLengthTable` return `{ entries, totalArcLength }`
directly (capturing the accumulator rather than re-reading the array), which
needs no `?? 0` because `totalArcLength` is a plain `number` by construction.

**Two new `pnpm break` entries**, both proved for real against the committed
tree: `angle-proportional-wedge-allocation-returns` (reverts `turn`'s
arc-length formula to its angle-proportional equivalent, algebraically
re-derived from the in-scope variables — goes red on both the new
540×185 stress test and the 1440 label-clearance test) and
`the-ring-shrinks-under-the-label-threshold` (shrinks `TOPOLOGY_RING_RADIUS_X`
800→600, pushing the 1024 real box's fit scale above the renderer's
threshold — goes red on the "draws no sector label" precondition test).

**`docs/GAPS.md`'s entry is closed** (not narrowed) and **ADR 0048's Decision
3 carries a third dated amendment**, both quoting the figures above.

### Gates

- `pnpm build` — green.
- `pnpm lint` — green, 0 warnings.
- `pnpm format:check` — green.
- `pnpm --filter @marketpulse/shared test` — 659/659 pass (16 in
  `topology-layout.test.ts`, up from 12).
- `pnpm test` (full workspace) — green.
- `pnpm invariants` — 80/80 hold (one caught and fixed mid-task, see above).
- `pnpm e2e overview-region-order.spec.ts landing-route.spec.ts
overview-sector-order.spec.ts` — 7/7 pass.
- `pnpm probe --story components-markettopology--whole-universe` and
  `pnpm probe /` — reviewed visually at every width; no collision, correct
  suppression below threshold.
- Both new `pnpm break` entries pass for real, on the committed tree.

### What was not done, deliberately out of scope

`topologySource`'s memo key (`apps/frontend/src/topology/graph-source.ts`)
was **not** widened to include the radii pair, despite `STORY.md`'s Design
work naming it as a "mechanical consequence." No caller passes non-default
radii anywhere in this story, so the memo key only needs to vary when it
would actually receive a different pair — which never happens yet. Flagged
here rather than silently skipped; the next story that calls
`buildTopologyLayout` with a non-default box should widen the key in the
same change.

## For a stakeholder — a status report, 2026-11-01

**What a user can see:** the market topology graph on `/` now fills its
whole band — wider than before, because the ring is an ellipse rather than a
circle — and every sector name is legible with no label crossing into a
neighbouring cluster. At narrower screen widths the graph still draws
cleanly; it simply stops labelling individual sectors once there is not
enough room to do so without crowding, rather than drawing a collision.

**What was found:** the real boxes this graph renders into on the live page
are narrower than this story's own design work had assumed before the route
existed (measured in the previous task). Re-deriving the fix against those
real numbers turned what was expected to be a partial improvement into a
full close of a defect this epic has carried since Story 6.1.

**What's next:** Task 6.2.3, interaction scope — scroll and zoom behaviour on
the real page rather than in an isolated Storybook frame.
