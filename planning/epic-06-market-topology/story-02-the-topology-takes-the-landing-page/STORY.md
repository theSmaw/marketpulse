# Story 6.2 — The Topology Takes the Landing Page

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.1
**Epic scope covered:** Sector clustering · WebGL renderer on the route

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
   4.9.4 measured. A WebGL canvas sized to its box **will not report an
   overflow**, so the `clientHeight`/`scrollHeight` check stops being able to
   see this — it becomes a **clipped graph** instead, which is why the sizing
   rule is an acceptance criterion rather than an implementation note.
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

## Design work

`Market overview.dc.html` §02 holds the end state. The **accessible fallback**
for the canvas is new design work with no precedent here — it is what the
degraded grid will read, what a screen reader gets, and what the region says
when there is nothing to draw.

## Out of scope

The anomaly encoding (6.3), interactions (6.4), correlation edges (6.5).
