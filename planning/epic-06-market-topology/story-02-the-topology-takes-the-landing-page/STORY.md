# Story 6.2 — The Topology Takes the Landing Page

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.1
**Epic scope covered:** Sector clustering · the renderer on the route

**Amended 2026-10-30 at Story 6.1's close: "WebGL renderer" above is this
story's own pre-measurement wording, now false.** Story 6.1 measured two real
candidates and shipped a hand-rolled Canvas2D renderer — Sigma.js/graphology
lost on 334× the gzipped cost for an indistinguishable frame rate, not on
quality. See the hand-off section below before starting AC 3.

## Description

**This is the story the landing page has been reserving a band for since
2026-09-25, and it is the largest visible change in the product since `/`
stopped being a placeholder.** §9 says the visualization _"should be the
product's visual centre of gravity"_ and it has never been drawn at all.

**The first rendered node trips a recorded reversal condition**, so the layout
change is not a side effect — it is this story's main work. The interim grid
reverts to the end state already drawn on the design canvas
(`Market overview.dc.html` §02): the reserved band becomes the **primary** area
and sectors and movers drop to a lower band. **The regions keep their names,
their order and their landmarks across the change**, so nothing a screen reader
or a deep link depends on moves.

**And the band as it stands cannot hold a graph.** Measured 2026-10-15 after
Story 5.4 re-areaed the grid, your region spans both columns and is
**1392 × 161** at 1440×900 — but **the height tracks the viewport**
(`calc((82vh - 2 * var(--space-24)) * 7 / 30)`), so it is **123** at 700 and
**119** at 680. A canvas sized from a remembered `161`, or from the `calc`, is
wrong; one sized from a `ResizeObserver` is not. **Row 1 is the one grid row
with no content floor**, which is why `Market topology` already scrolls by 3 px
at 1440×500 with nothing in it but a hatched placeholder.

## What the user can see when this story lands

**The landing page becomes the product.** A live graph of 516 securities
clustered by sector occupies the primary area of `/`; sector performance, movers,
breadth and unusual activity sit beneath it. This is the screen §38's demo opens
on.

## Acceptance criteria

1. **The grid reverts to the canvas's end state**, and the four displaced
   regions keep their **names, their order and their landmarks**.
2. **The before/after displacement is measured at all four widths BEFORE the
   merge**, and what moved is stated. `MARKET-OVERVIEW.md` §1.4's trigger — _the
   first reserved region whose filling would move a figure or a sentence a
   reader is reading_ — fired once already on the other route at **+74 px**
   (136 at 390) and the owner accepted it with the figures recorded. On `/`,
   this region's neighbours are **figures rather than hatch**, so the figure
   matters more.
3. **The canvas is sized from its resolved box and never from a constant**, and
   the region does not scroll at any of the thirteen width/height pairs Task
   4.9.4 measured. A canvas sized to its box **will not report an
   overflow** whichever renderer draws it (Canvas2D, shipped, or WebGL, had it
   won), so the `clientHeight`/`scrollHeight` check stops being able to see
   this — it becomes a **clipped graph** instead, which is why the sizing rule
   is an acceptance criterion rather than an implementation note.
4. **At ≤860 nothing moves.** That breakpoint sets `grid-template-rows: none`
   and its one-column order is `breadth, sectors, movers, topology, unusual,
investigations` — verified byte-identical at 768 by Task 5.4.1, and this
   story must keep it so or say what changed and why.
5. **The region adds no second clock, session word or connection word.**
   `one-caller-of-the-market-clock` and `one-home-for-the-feed-words` fail the
   build by name, and the connection's one home is the status bar.
6. **The degraded grid gains a row and still passes.**
   `e2e/specs/overview-degraded-grid.spec.ts` is a **kept** spec — thirteen
   states × four widths × seven surfaces, asserting the collapse as **declared
   collision classes** rather than as a count, so it fails both when two rows
   collapse accidentally and when a documented exception stops holding. **A
   canvas region contributes a surface whose text is whatever its accessible
   fallback says**, which this story has to decide before the grid asks.
7. **`Market topology`'s reserved panel is deleted, and what replaces it in a
   degradation is decided.** Task 4.7.9 row 08: a rollback that omits a section
   draws a region with the **same hatch, the same muted sentence and the same
   box** as one nobody has built, differing only by the **absence** of an
   `EPIC n` badge. After this story **one** badged hatch remains, so a
   badge-less hatch reads more like the house style than like a fault.
8. **A memo boundary at the region, or a measured reason not to.** `/` commits
   **2 renders per applied batch** at **6.8–16.1 batches a minute** — 13.6–32.2
   renders a minute — because `useLiveFeed` is called in `App` and every
   overview frame is a new object reference. A Sigma instance will have its host
   re-rendered at that rate whether or not any graph datum changed. Task 3.6.5
   took that boundary for the universe table; Task 4.8.5 **declined** it for the
   charts with a measured reason. Either is acceptable; deciding by accident is
   not.
9. **`/`'s cold load is re-measured against the 447-node / 24.7 ms baseline**, on
   three channels, each proved by a plant. The route had roughly **26 ms of
   frame budget** before it joins `/securities` in breach of §28.

## Open decisions — for the Product Owner

1. **Does the graph keep the full viewport height the canvas's end state draws,
   or a reduced band?** The end state is drawn; what it costs the four regions
   below it is measurable before the merge and is a product judgement.
2. **What does a degraded topology look like against a deferred one?** This has
   been recorded as _one picture_ since 2026-10-12 and this story is where it
   stops being deferrable.

## Handed here by Story 6.1's close — 2026-10-30: the renderer, the ring's real extent, and an unfinished label problem

**The renderer is decided, and it is not the one this story's own scope line
named.** A hand-rolled Canvas2D module, zero dependencies, mounted via
`mountCanvasTopology` (`apps/frontend/src/topology/renderer-canvas.ts`),
reading `TopologyGraph`/`TopologyLayout` from `packages/shared` through
`apps/frontend/src/topology/graph-source.ts`'s `topologySource`. The whole
mount path — fit, palette, pan/zoom — already exists in
`apps/frontend/src/components/MarketTopology/`; this story's own work is
**fitting that existing component into `/`'s real, narrower region**, not
building a renderer.

**The extent is bigger than the design canvas's own figure, and the reason is
load-bearing.** `The graph at rest.dc.html` names an 886 × 826 extent at
`TOPOLOGY_RING_RADIUS = 335`; Task 6.1.3 raised that constant to **400** to
reduce (not eliminate — see below) a real label-collision defect Task 6.1.2
found, so the layout's real extent is now **≈1000 × 928**
(`packages/shared/src/topology-layout.ts`'s own docblock has the figure and
the reasoning). **Re-derive this story's elliptical-ring numbers from 1000 ×
928, not from 886 × 826** — `R_x ≈ 540, R_y ≈ 185` was computed against the
smaller extent and is now stale.

**A real, open label-collision defect comes with the layout, and this story
is its most likely owner.** `communication_services`'s sector label still
visibly crosses into `consumer_discretionary`'s cluster at the component's
own current default size (measured **−28 px** of clearance at the `1392 × 520`
box this story's own region already resolves to) — `docs/GAPS.md`'s entry
(_"A sector's label still crosses into a neighbouring cluster's circle, and no
value of the ring radius fixes it generally"_) has the full account, the
swept figures, and the reasoning for why raising `TOPOLOGY_RING_RADIUS`
further is not the fix. **The real fix is architectural and was named rather
than built**: a renderer-side, scale-aware label treatment, because the
renderer is the one thing in this picture that knows its own fit scale and
`packages/shared`'s layout deliberately does not. Fitting this layout into
`/`'s real **narrower, differently-shaped** box (an ellipse, not the square
the measurement above was taken against) changes the fit scale again and is
very likely to change this defect's severity — possibly making it worse, since
a narrower box was swept down to `-37px` and beyond in the entry's own table.
**Do not inherit the gap silently**: re-measure it against the real elliptical
fit before this story's own acceptance criteria are checked off.

## Design work

`Market overview.dc.html` §02 holds the end state. The **accessible fallback**
for the canvas is new design work with no precedent here — it is what the
degraded grid will read, what a screen reader gets, and what the region says
when there is nothing to draw.

## Out of scope

The anomaly encoding (6.3), interactions (6.4), correlation edges (6.5).
