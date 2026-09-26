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
