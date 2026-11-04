# Task 6.4.2 — Select, & the one way out

**Status:** Not started
**Story:** [6.4 Hover, Select, & the Way Out](STORY.md)
**Depends on:** 6.4.1

## Objective

A graph a reader can only look at is still a picture. This task makes a
node something a reader can _commit to_ and _leave from_ — by pointer, for
now; by keyboard is Task 6.4.3's. It is the half of AC2 pointer input can
exercise, and all of AC6.

**The mechanism matters more than it looks like it should.** `/`'s one
navigation rule (`one-home-for-imperative-navigation`, `pnpm invariants`)
forbids every file but `SecurityExplorer.tsx` from moving the address
imperatively — every other destination on this product is a
`<Link to={securityPath(symbol)}>` resolved at render. A Canvas2D node has
no per-node DOM element, so it cannot hold 516 such links — and 516 overlay
anchors would trip `CLAUDE.md`'s named Epic 14 condition (_the first
surface on `/` that renders one element per tracked security_, priced at
≈48 ms of added frame) besides being the wrong shape entirely. The
resolution found while shaping this story needs **no change to the
invariant**: **one** DOM anchor — the ticker in the hover/selection
readout Task 6.4.1 built — whose `href` always points at whichever node is
currently selected, resolved at render from that selection's own identity.
Clicking it, or (Task 6.4.3) pressing Enter while it is the focused
element, is the browser's own native anchor activation. No `navigate()`
call exists anywhere in the topology code.

## What the user can see when this lands

Click a node: it gains a persisting ring (survives a pan, unlike hover),
and its ticker in the readout plate becomes the one thing on this surface
a reader can open. Click it (or click elsewhere on the canvas to clear the
selection) and either the security's own page opens, or the selection is
gone. Gate 1 decision: **two-step** — selecting and navigating are
different acts, matching this screen's existing "the figure is never the
link" rule and avoiding a stray pan that ends over a node from
accidentally navigating away.

No `Investigate` control or any second affordance exists on a node — a
node has exactly one activatable thing, same reasoning Epic 5's Gate 1
already settled for a list row.

## Work

- **Selection is a third state, distinct from hover** (6.4.1 made hover
  renderer-internal and transient). Selection **persists**: it survives
  the pointer leaving the node, survives a pan, and is what the ring and
  the readout's anchor resolve from. It is cleared by clicking empty
  canvas, or by `Escape` (wired fully in 6.4.3, but the clearing behaviour
  itself belongs here since a mouse-only reader needs a way back too).
- **Disambiguate a click from a drag.** `onPointerDown` today
  unconditionally starts a potential drag with no movement threshold.
  Add one (distance and/or short time) so a drag that happens to end over
  a node does not select it, and a genuine click (no meaningful movement)
  does. `pointercancel` must clear any pending click state.
- **The selection ring and ground, per the design canvas**
  ([`Hover, select, and the way out.dc.html`](https://claude.ai/design/p/727b5b14-fe78-47c1-9d9c-fb84b6ce5280)):
  the hover ground disc's dark twin (`--surface-inverse`, 16.4:1), drawn
  under the node's existing body/halo/anomaly-ring layers — selection adds
  a ground, it never re-encodes anything Story 6.3 already draws. Measured:
  contrast only improves on every existing treatment (equity body 3.50 →
  4.88:1, `high` ring 1.92 → 8.89:1, `extreme` 3.05 → 5.60:1).
- **The one anchor.** The readout plate's ticker line becomes
  `<a href={securityPath(selectedSymbol)}>`, rendered from React state
  holding the selected symbol (lifted out of the renderer for this one
  purpose — hover stays renderer-internal per 6.4.1, selection is the one
  piece of state that needs to reach React, because only React can render
  a `<Link>`/`<a>`). Keep this state inside `MarketTopology`, not lifted to
  `MarketOverview` — nothing outside this region needs it (Gate 1 decision
  2: selection stays local).
- **`Reset view` does not clear a selection.** It resets pan and zoom only
  — the control is named for the view, and Gate 1's decision keeps
  clearing to `Escape` and to clicking empty canvas. Update
  `MarketTopologyHandle.resetView`'s docblock to say so explicitly, since
  it predates selection existing.
- **AC6, as three bounded, checkable claims rather than one unwritable
  negative:**
  1. A `pnpm invariants` corpus grep: the word `Investigate` (or an
     `investigate(` handler) appears in no file under
     `apps/frontend/src/topology/` or
     `apps/frontend/src/components/MarketTopology/`, with a `pnpm break`
     entry planting it.
  2. A component-level exhaustive control enumeration: in the selected
     state, the region's activatable controls resolve to an exact
     declared list (`Reset view`, the one ticker anchor, `Try again` only
     where applicable) — proving one activatable thing per node by
     enumeration, not by absence of a name.
  3. A browser-level determinism assertion: activating the anchor (click
     or, once 6.4.3 lands, Enter) produces exactly one outcome.
- A browser spec: click a node (ring + anchor appear, URL unchanged);
  click its ticker (URL changes to that security); click empty canvas
  (selection clears); a drag that ends over a different node selects
  neither the start nor end node; the exact-control-enumeration assertion
  above.

## Done when

1. Clicking a node selects it (persisting ring, ticker anchor in the
   readout) without navigating; clicking the anchor navigates to that
   security's page; clicking empty canvas clears the selection.
2. A drag that ends over a node does not select it; a genuine click does.
3. `pnpm invariants`' `one-home-for-imperative-navigation` passes with no
   change to its allowance list, and a new `pnpm break`-verified entry
   confirms no `Investigate` affordance exists in the topology's own
   source files.
4. `Reset view` leaves an active selection untouched.
5. A browser spec drives pointer selection and navigation end to end,
   grounded against an independent `GET /securities` fetch.
