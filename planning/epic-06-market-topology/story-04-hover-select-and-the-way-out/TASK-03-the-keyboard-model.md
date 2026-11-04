# Task 6.4.3 — The keyboard model

**Status:** Not started
**Story:** [6.4 Hover, Select, & the Way Out](STORY.md)
**Depends on:** 6.4.2

## Objective

Everything Task 6.4.2 built works by pointer only. This task is the hard
part the story's own description names: ADR 0039 makes this region a tab
stop unconditionally, and there is no existing precedent for what happens
_inside_ a graph's tab stop the way there is for a ranked list (clamp, keyed
on symbol) or the price chart (one stop, arrows drive a reading along a
time axis a graph does not have).

**Gate 1 decision: a tree walk.** The graph already has the shape this
needs — 501 equities each with a membership edge to their sector ETF, 11
sector ETFs each with a hub edge to the broad-market centre. `Down` enters
(centre → first sector ETF in drawn ring order; a sector ETF → the first
member of its cluster, ticker order). `Up` exits the opposite way.
`Left`/`Right` moves among siblings — **clamped** within a cluster (ticker
order, never band order, because the band map updates at feed cadence and a
reader's position must never move under their stationary hands), **wrapped**
around the sector ring (it is drawn as a closed ellipse; wrapping matches
the picture). `Home`/`End` jump to the first/last sibling. Arriving by
keyboard seeds the selection at the centre — focus is never a state with
nothing in it.

This also builds the route-level `pnpm probe` interaction harness
`TOPOLOGY.md` has twice deferred to "the next story that changes what the
renderer draws under interaction" — scoped to what this task needs (a
scripted pointer/focus/arrow-key path against `/`'s real box, for measuring
the hit target and the focus ring's geometry), not to re-arguing Story
6.2's ADR 0048 frame-rate figures, which stay Epic 14's.

## What the user can see when this lands

Tab into `Market topology`; the canvas becomes the thing arrow keys drive.
Press an arrow and a node is selected at the centre, with a visible ring
and the same readout plate Task 6.4.1 built. `Down`/`Up`/`Left`/`Right`
walk the tree as described above; `Home`/`End` jump to the ends of
whichever group is current; `Enter` opens the selected security (the same
one-anchor mechanism Task 6.4.2 built, now reached by the browser's own
native activation rather than a click); `Escape` clears the selection and
leaves focus on the canvas.

## Work

- **One additional tab stop: the canvas itself.** `tabIndex={0}` plus
  `role="img"` (already present) plus a new `aria-describedby` pointing at
  a visually-hidden key-hint string ("Arrow keys walk the graph; Enter
  opens the security"). Mirror `ChartReading.tsx`'s shape (`switch` over
  `event.key`, `default: return`, `preventDefault()` only on a key
  actually handled) — `Tab`, `Home`/`End` outside this control, and the
  browser's own find-in-page shortcut must all still reach the page.
- **The tree walk**, as a pure function (`topology/walk.ts` or similar —
  graph and layout in, next symbol out, no DOM, no canvas, fully
  unit-testable): sector order from the layout's own drawn wedge
  allocation (`TopologyCluster`'s declared order, **not** `graph.clusters`'
  sorted-by-id order — the docblock there says plainly those are not the
  same thing); within-cluster order from `TopologyCluster.members`
  (already sorted by ticker).
- **The one anchor (Task 6.4.2) becomes reachable by Enter with no
  imperative navigation call.** The cleanest shape found while shaping
  this story: once a selection exists, keyboard focus moves to the one
  readout anchor itself (its `href`/label rewritten as arrow keys change
  the selection, the same roving-stop idea `RankedList` already uses, but
  with one physical element rather than one per row); `Enter` is then the
  anchor's own native activation. If the developer finds a cleaner shape
  that keeps zero `navigate()`/`useNavigate()`/`location.*` calls in the
  topology's own files, prefer it — that invariant is the one load-bearing
  constraint, not the specific mechanism above.
- **The focus ring**, per the design canvas
  ([`Hover, select, and the way out.dc.html`](https://claude.ai/design/p/727b5b14-fe78-47c1-9d9c-fb84b6ce5280)):
  radius `(TOPOLOGY_NODE_FOOTPRINT/2 + focus-offset + focus-width/2) ×
nodeScale`, constant 2px stroke, drawn **inset** (`.frame`'s
  `overflow: hidden` clips an outward-drawn outline on every edge — this is
  a clipping fact, not an accessibility-floor exception, so it does not
  need ADR 0026's standing-exception treatment). Two ink values depending
  on whether the node is also selected (light ink on the pale ground,
  `--ink-inverse` on the dark selected ground — `#181c23` on `#181c23`
  would be a silently deleted ring). Confirm with `pnpm probe` at minimum
  zoom that the ring does not touch Story 6.3's `extreme` ring (flagged as
  a tight/zero clearance by arithmetic during shaping; needs a real
  measurement before being trusted).
- **The interaction harness**, scoped: port the scripted pointer/wheel
  path already built for Storybook (`scripts/topology-instrument.mjs`)
  into `overview-instrument.mjs` (or equivalent) driven against `/`'s real,
  resizable box, plus a focus+arrow-key path. Use it to take the ring's
  real clearance figures and the hit target's real screen-pixel radius at
  all four widths — replacing the argued numbers above with measured ones
  before this task is called done. Do **not** use it to re-take Story
  6.2's ADR 0048 frame-rate figures; that stays a separate, explicitly
  deferred piece of work with Epic 14 as its owner.
- A browser spec: `Tab` into the region lands on the canvas; the full
  arrow sequence (`Down`, `Right`×N with clamping asserted at the cluster's
  own end, `Right` again wrapping at the sector ring, `Up`, `Home`/`End`)
  each asserted via `document.activeElement`/the selection's own ticker;
  `Enter` opens the expected security; `Escape` clears the selection
  without leaving the region; the canvas's own drawn bytes change when
  focus moves and change back when it leaves (the one machine-checkable
  proof a ring was actually drawn, following Story 6.3's own
  before/after-bytes pattern); the same sequence driven at 390px.

## Done when

1. The canvas is one additional tab stop; arrow keys walk the tree as
   specified, clamped within a cluster and wrapped around the sector ring,
   keyed on symbol never on an index.
2. `Enter` opens the selected security via the existing one-anchor
   mechanism, with zero `navigate()`/`location.*` calls in any topology
   source file — `pnpm invariants` passes unchanged.
3. A visible focus ring is drawn outside the 16-unit footprint, measured
   against the contrast floor on both grounds it can sit on, and confirmed
   not to collide with Story 6.3's rings at any zoom.
4. The route-level interaction harness exists and was used to take the
   real figures above — not argued ones.
5. A browser spec drives the full keyboard sequence at two widths and
   asserts where focus landed after every key.
