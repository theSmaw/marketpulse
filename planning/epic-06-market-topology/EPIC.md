# Epic 6 — Market Topology

**Status:** Not started
**Sequence:** 6 of 15 — follows Epic 5 (Anomaly Detection)
**Spec references:** PRODUCT_SPEC.md §10 (market topology visualization), §27 (high-performance rendering)

## Goal

Create MarketPulse's distinctive high-performance visual representation of the market.

## Outcome

Users can explore securities as an interactive relationship graph.

## Scope

- Graph domain model
- Sector/industry relationships
- Correlation relationships
- Graph-layout generation
- WebGL renderer
- Node sizing
- Node movement/anomaly encoding
- Edge strength
- Hover/select interactions
- Filtering
- Sector clustering
- Live visual updates

## Exit criteria

The tracked universe can be explored smoothly as an interactive graph, and unusual securities are visually obvious.

## Handed to this epic by Task 4.1.8 — 2026-09-25: the landing page changes shape the day you draw your first node, and the end state is already drawn

**Epic 4 built the market overview at `/` while this epic was still unstarted,
and it left a band reserved for the topology.** The layout running there today
is explicitly an **interim** one, and its reversal trigger is a condition this
epic will trip: **the first commit that renders a graph node on that route.**

**You do not have to design the end state.** It is drawn on the design canvas,
in `Market overview.dc.html` §02 — when the first node renders, the reserved
band becomes the **primary** area and sectors and movers drop to a lower band.
The regions keep their **names, their order and their landmarks** across the
change, so nothing a screen reader or a deep link depends on moves.

**Three things to check when you get there:**

- **The reserved band must not have grown in the meantime.** If it has,
  something went wrong that predates this epic.
- **The overview's regions are `PRODUCT_SPEC.md` §9's**, and the topology's is
  one of two that belong to later epics — the other is Epic 5's unusual-activity
  feed. Both are placeholders naming their epic today.
- **The connection has one home**, the status bar, and the landing route renders
  no clock, session word or connection word. `pnpm invariants` holds
  `one-caller-of-the-market-clock` and `one-home-for-the-feed-words`, and a
  topology surface that adds a second will fail the build by name.

> **This is written here rather than linked from Epic 4** because a pointer is
> what a reader follows when they already know to look, and the whole failure
> this repository keeps producing is that they do not. Epic 4's Story 4.1 owns
> the decision; this paragraph is the only thing that has to reach you.

## Handed here by Story 4.8's close — 2026-10-10 by Task 4.8.10: the page you land on is now measured, and Epic 14's second condition is worded for what you might draw

**Found by walking the epic list and asking _did Story 4.8 measure anything
this epic acts on_, after a grep of that story's documents named this epic
once and in passing.** Three things, in words this epic can act on.

**1. `/` has a measured cost and a measured headroom, and your first node
lands on top of it.** Production build, 1440×900, cold load, 40 interleaved
loads with every observer proved by a plant on the page that produced the
figure: `/` draws **447 DOM nodes and zero `<tr>` at 518 securities — the same
447 at 20** — for **0 tasks over 50 ms on 10 of 10 loads**, one 50.9 ms
animation frame in ten, and a worst rAF gap of **24.7 ms p50 / 34.7 p95**
against a 16.7 ms quantum. With a 20-row universe it collapses to the
**18.7 ms** one-frame floor, which is what attributes the difference — ≈
**6 ms** — to the 518-security payload the route computes over rather than to
the page's chrome. **So the landing route is not in breach of
`PRODUCT_SPEC.md` §28 and `/securities` is**, on 10 of 10 loads, and your
region arrives with roughly 26 ms of frame budget before it joins the second
category rather than the first.

**2. The page re-renders on every applied batch, so a canvas on it is not a
still canvas.** `useLiveFeed` is called in `App`; every overview frame is a new
object reference, so **`/` commits 2 renders per applied batch** at the feed's
measured **6.8–16.1 batches a minute** — **13.6–32.2 renders a minute**
(Task 4.8.2, counted on React's commit hook against the real gateway). A
Sigma.js instance mounted in a region on this page will have its host component
re-rendered at that rate whether or not any graph datum changed, and §27's
60 FPS target is a per-frame claim that has to survive it. **The cheap defence
is a memo boundary at the region**, which is what Task 3.6.5 did for the
universe table and what Task 4.8.5 declined for the charts with a measured
reason; the right one is whatever Epic 14 chooses, and the boundary is a
decision rather than a detail.

**3. Epic 14's second condition is worded against DOM elements, and your
renderer is a canvas — so read it before assuming it fires on you.** The clause
added on 2026-10-09 is _"the first surface on `/` that renders one element per
tracked security"_. A WebGL canvas at 500 nodes renders **one element**, so a
graph drawn the way ADR 0027 and this epic's scope intend **cannot trip it** —
and that is correct rather than a loophole, because the clause is a proxy for
style, layout and paint over a large document and a canvas has neither. **What
would trip it is a DOM fallback, an SVG overlay with a node per security, or a
per-node label element** — any of which puts 518 elements on `/` and makes this
epic retroactively the owner of Epic 14's entry 1 on a second page. If you
reach for one, measure it against the 447/24.7 ms baseline above before it
ships, on **three channels** (`longtask`, `long-animation-frame`, an rAF-gap
recorder), each proved by a plant on the page that produced the figure, because
`longtask` alone can no longer see this product's existing breach.
