# Story 6.1 — The Decisions, the Renderer Measured, & the Graph in the Workshop

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** nothing
**Epic scope covered:** Graph domain model · Sector/industry relationships · Graph-layout generation · WebGL renderer

## Description

**This epic has more undecided than any since Epic 3, and one of its decisions
is not ours.** `PRODUCT_SPEC.md` §27 commits the topology to WebGL and names
Sigma.js as _"a good candidate"_ — a recommendation rather than a mandate — and
nothing in this repository has ever rendered a canvas. So this story decides,
**measures rather than assumes**, and puts a real graph of the real universe in
front of a person in the **workshop**.

**It deliberately does not touch `/`.** The reserved band is **161 px** at
1440×900 and **119 px** at a 680 px viewport, which is not a graph — and _the
first commit that renders a graph node_ is the recorded reversal condition for
the landing page's interim layout. Those two facts make the route change a story
of its own, which is 6.2.

**The graph it draws needs no new data.** Nodes are the **516** tracked
securities from the curated universe; clusters are the **eleven** sectors;
`ETF/index relationship` is the sector SPDRs and the four market proxies, which
the universe file already carries. `PRODUCT_SPEC.md` §10's other two
relationships — _common industry_ and _strong historical return correlation_ —
are **not** in this story: industry is curated and free, correlation needs 60
sessions and a nightly pass, which is 6.5.

## What the user can see when this story lands

**A graph of the whole tracked market, in Storybook** — 516 nodes clustered into
eleven sectors, pannable and zoomable, at a measured frame rate.

**Nothing on any route**, and that is the point rather than a shortfall: 6.2 is
the story that pays it off, and it is next.

## Acceptance criteria

1. **The renderer is chosen by MEASUREMENT, not by §27's recommendation.** At
   least one alternative is built far enough to draw 516 nodes and compared on
   frame rate, bundle cost and what it does to `/`'s measured **447 DOM nodes**.
   §27 names Sigma.js; it does not require it, and a candidate rejected is
   recorded with its figures.
2. **The graph model lives in `packages/shared` and holds no renderer type.**
   Nodes, edges, clusters and the layout's output are domain data; the renderer
   is a reader. §26 puts `topology/` in three parts — `renderer`, `layout`,
   `interaction` — and this story establishes that seam, because the model is
   what Epic 7's `get_related_securities` and `highlight_graph_nodes` will read.
3. **The layout is deterministic and reproducible.** The same universe produces
   the same positions, so a screenshot is comparable between runs and a
   photograph in a later story means something. A force-directed layout seeded
   from a clock is refused for that reason.
4. **Node identity is the ticker, resolved from the node's own datum** — the
   rule Story 4.6 established for a surface whose members move, and the reason
   its activation race is unrepresentable rather than managed.
5. **The frame rate is measured against §28's targets at 500 nodes**, on a
   production build, with the method §28 now requires: **three channels**, each
   proved by a plant on the page that produced the figure, and
   `document.visibilityState` checked first because a tab driven over CDP
   reports `hidden` and makes every figure small, plausible and meaningless.
6. **Every colour the renderer draws is read from a token**, never a literal.
   `VISUAL-LANGUAGE.md` records that _Epic 6's WebGL renderer reads its colours
   from these tokens_ — and `styles/tokens.ts` is a reader over
   `getComputedStyle` that throws at startup for a declared token missing from
   the stylesheet. A canvas that hard-codes a hex escapes the whole chain.
7. **A Storybook story per state**, including the states this epic cannot avoid:
   the whole universe, one sector, **a store with no bars** (CI's permanent
   state), and nothing at all.
8. **The decisions are recorded with their alternatives and a reversal trigger**,
   and a trigger is a condition rather than a story number.

## Open decisions — for the Product Owner at this story's Gate 1

**1. ~~Light theme only, or light and dark?~~ SETTLED 2026-10-30 by the owner:
LIGHT THEME ONLY** — so this is a constraint on the story rather than a question
in it. The renderer reads **one** palette. Two consequences are
acceptance-grade: the contrast figures measured against one set of grounds stay
meaningful (`--chart-volume` 3.50:1; the amber ramp's steps
**1.12 / 1.43 / 1.59**), and the node's resting appearance is designed **on the
light grounds** rather than on a ground that would have flattered it.
`VISUAL-LANGUAGE.md` carries the decision, the case for reversing it, and a
reversal trigger that is a condition.

**2. There is no canvas page for the topology** — checked against the canvas on
2026-10-30, which holds **29 pages** (`DesignSync` `list_files`, 2026-10-30) and **none of them is
the topology's**. The authorisation gap is closed, so
this story **draws** the language rather than discovering it in code: ADR 0026
makes the canvas the source of truth and the chain is canvas →
`VISUAL-LANGUAGE.md` → `tokens.css` → renderer.

**The nearest relatives, and what each can and cannot lend.**
`Market overview.dc.html` draws the **landing grid's end state** 6.2 reverts
to — useful for the band, silent about the graph.
`The rail that says how unusual.dc.html` is the anomaly language and is a **DOM**
page: its band word beside every entry is precisely the affordance a canvas
cannot borrow, which is why Story 6.3 exists. And
`MarketPulse Design System.dc.html` is the foundation page the renderer's
palette must come from.

**3. What is an edge, at the start?** Sector membership is free and gives a
readable clustered graph. The alternative — wait for correlation — delays every
visible story behind a nightly pass. Recommendation: **ship sector and ETF
edges now**, and let 6.5 add correlation as a second kind with its own weight.

**4. Does the graph get its own route as well as the region?** `PATHS` has four
entries and no topology route. §8.1 puts the topology inside Market Overview and
§9 makes it the screen's _visual centre of gravity_ — so the region is required.
A dedicated route is not in §37's V1 list and is probably not wanted; worth
settling rather than drifting into.

## Design work

**The canvas is the source of truth and this epic has no page on it** (ADR
0026). What has to be drawn before anything is built: the node at rest, the
cluster, the edge, and the four anomaly states §10 calls `Border — anomaly
strength`. **A canvas cannot draw _no chip_**, which is how `AnomalyBadge`
distinguishes `normal`, so the fourth treatment is a real design problem and is
Story 6.3's subject — but the node's resting appearance is this story's.

`VISUAL-LANGUAGE.md` line 723 is the constraint to read first: **this epic
inherits none of the chart layer's idioms**, because §27 commits it to a
different renderer against a different problem.

## Out of scope

The landing page's layout (6.2), the anomaly encoding (6.3), interactions (6.4),
correlation edges (6.5), node sizing (6.6), live updates (6.7), filtering and
the degraded set (6.8).
