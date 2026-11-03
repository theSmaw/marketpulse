# Story 6.4 — Hover, Select, & the Way Out

**Status:** Not started
**Epic:** [Epic 6 — Market Topology](../EPIC.md)
**Depends on:** 6.3
**Epic scope covered:** Hover/select interactions

## Description

**A graph nobody can interrogate is a picture.** This story makes the topology a
place a reader _leaves from_, which is the thing Story 4.6 established for the
landing page's other regions: `/` holds **twenty-four destinations** today, and
after this story it holds those plus every node.

**The hard part is the keyboard, and it has no precedent here.** ADR 0039 makes
every region a tab stop **unconditionally**, and this product's other dense
surface — the chart — is deliberately **one** tab stop with a reading driven by
arrow keys, because the alternative was 1,950 stops. A graph of 516 nodes has the
same arithmetic and **no axis to walk along**: the chart's arrows move through
time, and a cluster has no order a reader can predict.

## What the user can see when this story lands

**Hover a node and it tells you what it is**; select it and the graph focuses;
press Enter and the security page opens. By keyboard as well as by pointer.

## Acceptance criteria

1. **A hover reads the node**: ticker, name, sector, and its band — the same
   facts `Unusual activity`'s row carries, in the same words, from the same
   builders. A second vocabulary for one fact is what ADR 0029's one-home rule
   refuses.
2. **The way out is the security page**, resolved **at render from the node's own
   identity** rather than from a search term or an index, so on a surface whose
   nodes move the activation race is unrepresentable rather than managed.
   `one-home-for-imperative-navigation` holds the corpus over **every shipped
   source file in three trees**, because a new region is a new directory by this
   repository's convention and that check's first version was green on the file
   Epic 5 would write.
3. **The keyboard answer is designed rather than defaulted**, and it is stated as
   a decision with its alternatives. The region is one tab stop by ADR 0039;
   what arrow keys do inside a graph is this story's question. **A ranking is not
   a ring** — the landing page's four roving groups clamp rather than wrap, keyed
   on **symbol** rather than on an index, because a held index is a second and
   disagreeing copy of where focus is.
4. **Focus is visible on a canvas**, which the global `:focus-visible` rule
   cannot do for a node. Whatever draws it is measured against the contrast floor
   and is not hue alone.
5. **The accessible path is not the canvas.** A WebGL node is not in the
   accessibility tree, so the reader who cannot see the graph needs a real
   answer — and `Region` already focuses its own `<section>` when the element
   that last held focus inside it is removed while `document.activeElement` is
   the body, which a canvas losing focusable children inherits as a backstop.
6. **No `Investigate` affordance on a node.** Epic 5's Gate 1 refused it on a
   list row in any form — _a row has one activatable thing and a second is two
   answers to what does Enter do_ — and that reasoning transfers exactly.
   Epic 7 owns the control and the surface it belongs on.
7. **A browser spec drives the pointer and the keyboard**, and asserts where
   focus landed — the one thing this level can see that no other can.

## Open decisions — for the Product Owner

1. **What do arrow keys do in a graph?** Options with different costs: walk the
   nodes of one cluster in a declared order (band, then ticker); walk between
   clusters; or nothing, with selection reached only through a list. The third is
   the honest minimum and the least exciting.
2. **Does selecting a node change the rest of `/`?** A selection that filtered
   `Unusual activity` or the movers would be the first cross-region interaction
   in this product, and ADR 0023's reversal trigger is _the first piece of state
   two features must agree about that neither owns_. Worth taking deliberately.

## Design work

The hover surface, the selected state, and the focus treatment on a canvas. All
three are new; none has a page.

## Out of scope

Filtering (6.8) — selecting a node is not filtering the graph.

## Handed here by Story 6.2's close — 2026-11-01: the live region this story fires, the interaction surface it inherits, and the control it shares

**The live-region reversal trigger is this story's own, by name.**
`MarketTopology.tsx`'s docblock states the drawn graph's text equivalent
carries **no live region** because the picture is static for the page's
lifetime, with the reversal trigger _"the first change to this region a
reader must be told about without having asked."_ A selection or hover that
changes what a screen-reader user is told — without them having pressed
anything new — is exactly that condition firing. Reaching for a plain
`aria-live` region on the existing hidden paragraph is the obvious shape and
is probably wrong by itself: that paragraph's whole reason for being static
is `topologyDrawnSentence`'s own one-time construction, and a second,
dynamic announcement is more likely a **second** element than a rewrite of
the first.

**The pointer/keyboard surface already has real state to coordinate with,
not a blank canvas.** `fit.ts`'s `TopologyView` (pan, zoom, a clamped
viewport) and `renderer-canvas.ts`'s `nodeAt()` hit-test already exist and
are reused rather than rebuilt: pan is drag, zoom is `ctrl`/`⌘` + wheel, and
a plain wheel scrolls the page (`touch-action: pan-y`) — a hover or a
keyboard-driven selection must not fight either gesture, and `nodeAt`'s own
16-unit footprint threshold (not the 8–12-unit ink) is already sized to be
the thing a cursor or a focus ring targets.

**`Reset view` (`MarketTopologyHandle.resetView`) is a shared control, not
this story's to re-invent.** It already exists, wired to a button in
`MarketOverview.tsx`'s region meta slot, and resets pan and zoom to the
fitted view. A node selection this story adds should decide explicitly
whether `Reset view` also clears it — the control's own docblock says it
"is a no-op while nothing is mounted," which does not yet say anything about
a selection, because none existed when it was written.

## Handed here by Story 6.3's close — 2026-11-03: the annulus is taken, and this story's focus treatment goes outside the footprint

**Resolved at Story 6.3's own Gate 1, not left for this story to discover by
collision.** `The graph at rest.dc.html` §03 reserves a 4-unit annulus
around every equity's 8-unit ink (`TOPOLOGY_NODE_FOOTPRINT` 16 minus the
ink, split evenly) and names it as double-booked: Story 6.3's anomaly ring
and this story's focus/selection treatment were both drawn against the same
4 px of room. The decision taken at 6.3's Gate 1, and acted on in
`apps/frontend/src/topology/renderer-canvas.ts` (`ANOMALY_RING_OFFSET`,
`ANOMALY_RING_WIDTH`): **Story 6.3's ring is 516-wide and must stay cheap
and quiet; this story's focus is exactly one node at a time and can afford
a louder treatment.** So 6.3 takes the annulus — `elevated`/`high`/`extreme`
draw a ring centred in it, and `extreme` additionally recolours the node's
own fill — and **this story's focus/selection ring must be drawn OUTSIDE
the 16-unit footprint**, not layered into the same 4 px.

**This costs nothing at the hit-test layer.** `nodeAt()`
(`renderer-canvas.ts`) already targets the 16-unit **footprint** rather
than the 8–12-unit ink, specifically so the 4 px annulus would be
targetable by a cursor or a focus ring — which this story's own earlier
note above already says. A focus treatment sitting outside the footprint
needs no change to that threshold; it only needs its own geometry to start
at radius 8 (half the footprint) rather than at the ink's own edge.

**One finding from building the ring worth inheriting directly, since this
story's own focus ring will face the identical question**: node ink is
**constant in CSS pixels regardless of the container's fit scale** —
`TOPOLOGY_NODE_INK[kind] * nodeScale`, where `nodeScale` answers only the
explicit user zoom (`clampNodeScale(view.zoom)`, clamped [0.5, 1.5]), never
the box the layout was fitted into. Task 6.3.2 went looking for a low-fit-
scale state where a ring might need suppressing (parallel to
`TOPOLOGY_SECTOR_LABEL_MIN_SCALE`) and found it does not exist under this
renderer's own zoom model — a focus ring sized the same way will not need
one either, and does not need re-deriving that this renderer has no such
state.

**And the live-region reversal trigger this story's own note above already
named has FIRED ONCE, with Story 6.3 restating rather than retaking "no
live region."** Task 6.3.3 wired the topology's accessible sentence to a
live batch for the first time (a real anomaly band, or the honest "nothing
scored yet" fallback, overwriting the paragraph's text on each update) —
which is precisely the condition this story's own note calls out: _"the
first change to this region a reader must be told about without having
asked."_ Task 6.3.4, given the explicit choice to add a live region or
restate the existing no-live-region decision, restated it: the sentence
stays current when read rather than announced when it changes, the same
call Story 6.2 made for the purely structural sentence. **What that means
for THIS story**: the trigger is not a clean first-fire this story would be
answering fresh — it already fired once, was looked at, and the product's
standing answer is still no live region. A hover or a selection changing
what a reader is told is a SECOND, independent firing of the same
condition, and the live paragraph it would reach into is the one
`applyAnomalyBands` (`MarketTopology.tsx`) already writes to imperatively,
outside React's own reconciliation — this story's own note above (a second,
dynamic element rather than a rewrite of the first) is the right shape to
keep for exactly that reason: a `textContent` write that bypasses React is
not a safe place to also append a transient hover/selection announcement
without the two writers colliding.
