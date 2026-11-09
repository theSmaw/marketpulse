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

## Handed here by Task 6.6.2 — 2026-11-09: whether a correlation edge is an affordance at all, deferred here from Task 6.5.2's own close with the measurements already taken

**Story 6.5 shipped correlation edges as pure ink — not an affordance of
any kind.** A reader cannot hover, select, or keyboard-reach one, even
though an edge is a measurement (a signed coefficient, a counted overlap
`n`, a 60-session window, a tape) a reader might reasonably want to
interrogate. Task 6.5.2's own close raised three distinct questions about
this and explicitly declined to answer them; Story 6.6 (which drew edge
strength into the stroke) was asked whether it wanted to take them and
declined too, at Gate 1, on the grounds that interaction is a different
kind of work from encoding and this story already owns what a filtered
or degraded edge-set looks like — the natural next owner.

**The three questions, unchanged from Task 6.5.2's own wording:**

1. **Is an edge hoverable at all?** `hit-test.ts` answers _which node is
   under this pointer_ and has no concept of a segment. A point-to-segment
   test over up to ~1,900 edges is a different cost and a different
   ambiguity problem from the node test — which is already measured as
   **contested at 0.0 px** in the `TECHNOLOGY` cluster at 390 (Story 6.4's
   own hand-off, re-confirmed since by Task 6.5.3 and Task 6.5.4's own
   probe runs) — and an edge passes _through_ that same crowding, so an
   edge hit-test inside a dense cluster would be resolving between a node
   and several edges in the same few pixels.
2. **If it is, what does the plate say?** The hover/selection readout has
   **five reserved line slots** and a fixed height (`Movers`' held-row
   lesson, carried from rows to lines) — an edge's facts (two tickers, a
   signed coefficient, a counted overlap, a window) do not obviously fit
   the ticker/name/sector/band shape a node's five slots already hold, and
   a second plate layout is a second height this region has never needed
   before.
3. **Can a keyboard reader reach one?** `walk.ts` is a tree walk over
   nodes, keyed on ticker. An edge has no position in that tree, and the
   obvious answer — _from a selected node, walk its own edges_ — would
   make the walk's own shape depend on the correlation set, which changes
   **nightly** and is **absent entirely on CI** (this story's own second
   half, the degraded set, is exactly the surface that has to answer what
   a keyboard walk does when the thing it would walk does not exist).
   Story 6.4's own rule that the band must never move a reader's position
   under their stationary hands applies here with more force.

**What is already true and should not be re-derived.** The edge's own
weight reaches the renderer (Task 6.6.1) and is spent entirely on the
stroke; the counted overlap `n` is on the wire (`CorrelationPayload`) but
**deliberately not on the shared model** (`TopologyCorrelationEdge`),
because nothing has ever drawn it — carrying it to the model is this
story's own decision to take, not an oversight to fix blindly.

**Why this story rather than another.** Open Decision 1 above already
asks _filter by what_, and names correlation strength as a candidate
("closer to a query than a filter") — a reader who can filter by
correlation strength but cannot select an individual edge to see its
own coefficient is a half-finished version of exactly this question.
Whether this story answers all three edge-affordance questions, some of
them, or refuses them again (a third refusal, this time with a stated
reversal trigger rather than a silent deferral) is this story's own
shaping to do — nothing above is a decision already taken.
