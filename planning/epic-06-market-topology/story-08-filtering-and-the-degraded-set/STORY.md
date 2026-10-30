# Story 6.8 — Filtering, & the Degraded Set

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.7
**Epic scope covered:** Filtering

## Description

Two halves that belong together because they are the same question asked twice:
**what does the graph draw when it is showing less than everything** — once
because a reader asked, and once because the data is not there.

**The second half is the one this epic cannot skip.** On CI the store has 516
securities, **zero bars, no provider and no composite generation**, so the graph
there has nodes, sector edges, **no correlations and no scores, permanently**.
That is not an edge case to handle later; it is the state every gated run is in
for ever, and the state a reviewer sees.

**And the degraded set is a KEPT spec with a row this epic added.**
`e2e/specs/overview-degraded-grid.spec.ts` compares thirteen states × four
widths × seven surfaces and asserts the collapse as **declared collision
classes** rather than as a count — so it fails both when two rows collapse
accidentally and when a documented exception stops holding. Task 3.10.9's
earlier grid was **deleted** and took a repair with it that had to be
re-derived two epics later, which is why this one is kept.

## What the user can see when this story lands

**A reader can narrow the graph** — by sector, and by band — and the graph is
honest in every state where it has less to draw than a full market.

## Acceptance criteria

1. **Filtering states its own population**, the way every ranked and counted
   surface in this product does: _of the 501 companies we track…_. A graph
   showing 40 nodes with no statement of what was excluded is a confident claim
   over a filtered set.
2. **A filter is reflected in the URL** where it is a selection a reader would
   share or return to — ADR 0023's rule, and the window control's precedent
   (`?sessions=21`).
3. **Filtering never blanks the screen.** The last answer stays until a newer
   one replaces it, and a wait over 160 ms draws a cover over the picture rather
   than over a number (ADR 0028).
4. **Every degraded state is PRODUCED rather than furnished where it can be** —
   through the shipped socket, the shipped decoder and a real store — which is
   how Story 4.7's grid found **six lying aggregates** and a duplicate provenance
   line two years old. A state nobody can produce is named as unproducible.
5. **The states this epic has to draw, each distinguishable from the others at
   all four widths**: the whole market; one sector; a store with no bars (nodes
   and sector edges, no correlations, no scores); no provider; the aggregate
   arrived carrying nothing; the backend unreachable; and **a degradation that
   omits the topology section**, which must not look like a region nobody has
   built.
6. **No two states read identically at any width**, which is the claim the
   degraded grid exists to hold, and the thing the nine-state pass proved for
   the security page.
7. **The canvas's accessible fallback carries the state in words**, because that
   is what the grid reads and what a screen reader gets.

## Open decisions — for the Product Owner

1. **Filter by what?** Sector and band are the obvious two. Filtering by
   correlation strength is a third and is closer to a query than a filter.
2. **Does a filter hide nodes or dim them?** Hiding re-flows a spatial surface
   and loses the shape; dimming keeps it and costs contrast — and contrast is
   already carrying four bands.

## Out of scope

The rehearsal, the sweeps and the close (6.9).
