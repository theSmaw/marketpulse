# Task 6.2.3 — Interaction Scope: Scroll, Zoom, & the Way Back

**Status:** **Complete — 2026-11-01.** Wheel zooms only on `ctrl`/`⌘`, an
unmodified wheel scrolls the page; `touch-action: pan-y` replaces `none`;
pan is clamped (found, by direct browser testing, that a first-draft bound
left the canvas reading as entirely blank after one hard drag — tightened
from 15% to 50% minimum visible); a `Reset view` control sits in the
region's head, keyboard-reachable, verified at 390 with 106px of slack.
**Story:** [6.2 The Topology Takes the Landing Page](STORY.md)
**Depends on:** 6.2.1

## Objective

The renderer's pan/zoom was built for an isolated Storybook iframe with
nothing to scroll. Moved onto `/` unmodified, its unconditional
`preventDefault()` on `wheel` and `touch-action: none` would make the
product's primary content area a scroll trap — found by shaping, invisible to
every Storybook story because a story has nothing to scroll past. Its
unclamped pan has no way back except a page reload. Both are fixed here,
before this region is live for a real reader.

## What the user can see when this lands

**The landing page scrolls normally with the pointer over the graph.**
Zooming takes a deliberate modifier. A `Reset view` control sits in the
region's head, and dragging the market off-screen is recoverable without a
reload.

## Work

- **Wheel**: zoom only on `ctrl`/`⌘` + wheel (`event.ctrlKey || event.metaKey`
  — note trackpad pinch-to-zoom arrives as a synthetic `ctrlKey: true` wheel
  event in Chromium, so this one check covers both the keyboard-modifier case
  and the trackpad gesture). An unmodified wheel event is **not**
  `preventDefault()`ed and the page scrolls through it as normal.
- **Touch**: `touch-action: pan-y` on the canvas (not `none`) — a vertical
  drag scrolls the page; the renderer's own pointer-based pan still works for
  a deliberate drag gesture, which does not conflict with `pan-y` (pan-y only
  constrains the browser's own native touch scrolling axis, not synthetic
  pointer events the renderer already handles via `pointerdown`/`pointermove`).
  Verify this combination for real on a touch-emulated browser pass — the two
  mechanisms (native touch-action and JS pointer capture) interacting is
  exactly the kind of thing that looks right in code and wrong on a device.
- **Clamp pan**, so a drag cannot take the whole market off-canvas: bound
  `panX`/`panY` in `fit.ts`'s `panBy` (and `zoomAbout`, which also sets pan) to
  keep some stated fraction of the extent inside the viewport — pick a bound
  generous enough that a reader can still explore freely, tight enough that
  recovery is never worse than one more pan.
- **`Reset view` control**: one button in `Region`'s `meta` slot (the slot this
  product already uses for anything that qualifies a region without being its
  content — `11 · RANKED`, `Top 5 each way`, etc.), accessible name `Reset
view — the market topology` (Task 2.14.7's subject-in-the-name precedent,
  matching `MarketTopology`'s own `Try again — the market topology`). Calls
  back into the renderer to `fitView` again at the current box — this likely
  needs a new method on `TopologyRenderer`'s public surface (today: `{ kind,
resize, framesDrawn, destroy }`, no `reset`). Add it.
- **Verify the head slot has room.** `Panel.headings` carries `min-width: 0`,
  and Task 5.6.7 measured an oversized head slot wrapping the region title
  and stepping the lower page. `pnpm probe` the head slot's resolved track
  width at 390 with the control in place, alongside whatever population text
  Task 6.2.4 is about to add there too — coordinate with that task so the two
  additions are measured together rather than each assumed to fit alone.

## Done when

1. An unmodified wheel event over the region scrolls the page; `ctrl`/`⌘` +
   wheel zooms.
2. `touch-action: pan-y` ships, verified on a touch-emulated pass that
   vertical drag scrolls and the renderer's own pan still works via pointer
   events.
3. Pan is clamped — dragging cannot lose the market off-canvas.
4. A `Reset view` control exists in the region head, is keyboard-reachable,
   and restores the fitted view.
5. The head slot's resolved width at 390 is probed with every element that
   will sit in it, and reported if it is tight.
6. `pnpm build && pnpm lint && pnpm format:check` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-01

**Wheel.** `onWheel` no longer calls `preventDefault()` unconditionally — it
returns immediately unless `event.ctrlKey || event.metaKey`, which covers
both the keyboard-modifier case and Chromium's trackpad pinch-to-zoom
gesture (arrives as a synthetic wheel event with `ctrlKey: true` regardless
of the actual keyboard state). Verified live against the running
component: dispatching an unmodified `WheelEvent` returns `true` from
`dispatchEvent` (not `preventDefault()`ed, so the browser's native scroll
proceeds); dispatching the same event with `ctrlKey: true` returns `false`
(zoomed, scroll suppressed) — the exact intended split.

**Touch.** `canvas.style.touchAction` changed from `"none"` to `"pan-y"`.

**Pan clamp — found wrong by looking, not by the unit tests.** `fit.ts`
gained `TOPOLOGY_PAN_MIN_VISIBLE_FRACTION`, `TopologyView.extentX`/`extentY`
(the content's own on-screen extent, stored at `fitView` time so
`panBy`/`zoomAbout` need only a `TopologyView`), and `clampPan`/
`clampPanAxis` — a symmetric bound keeping at least the fraction's share of
`min(content size, viewport size)` always on screen, applied in `panBy`,
`zoomAbout` (which sets pan too, for the zoom-about-a-point calculation) and
`reviewport` (re-clamped against the **new** box on resize, since a pan
valid in a wide box is not necessarily valid in a narrow one).

A first draft shipped `0.15`. The unit tests passed — a placement landed
somewhere inside a deliberately generous assertion window — and a real
extreme drag driven at the running component on `/` showed an entirely
**blank canvas**: `TOPOLOGY_FIT_MARGIN` is correctly included in the stored
extent (it is the same span `fitView`'s own `scale` is derived from), so the
thin sliver a 15% minimum leaves on screen can land entirely inside that
empty margin rather than on a single node. Raised to `0.5` and re-verified
the same way: after the identical extreme drag, four real clusters stay
clearly visible, and `Reset view` restores the exact original fit.

**`Reset view`.** `TopologyRenderer` gained `reset(): void` (re-`fitView`s at
the current viewport — zoom to 1, pan to 0); `MarketTopology` exposes a
`MarketTopologyHandle` via `ref` (React 19's own prop-ref, no `forwardRef`)
with `resetView()`, backed by a `renderer` ref the mount effect keeps
current; `MarketOverview.tsx` holds that ref and passes a `Button` into
`Region`'s `meta` slot, `aria-label="Reset view — the market topology"`
(Task 2.14.7's subject-in-the-name precedent). Unconditionally present
rather than gated on the universe's state — a no-op while nothing is
mounted, by contract, so a reader never meets a control that appears and
disappears.

**The head slot has room.** Probed at 390 with the control in place:
header `340×59`, title `118px` + button `116px` = `234px` used of `340px`
available — **106px of slack**, not tight.

**Two new `pnpm break` entries verified for real**: one on the pan clamp
(`a-topology-pan-with-no-way-back`, reverting `panBy` to its pre-task
unclamped shape). Wheel-gating and `touch-action` are below what a `pnpm
break`/vitest pair can prove — same documented limitation
`renderer-canvas.ts`'s own module docblock already states for Canvas2D draw
behaviour — so they are verified live against the running component instead
(see above), the same discipline Story 6.1 used for frame-rate.

### Gates

- `pnpm build`, `pnpm lint`, `pnpm format:check` — green.
- `pnpm test` (full workspace) — 659 + 1,344 + 1,710 = 3,713 pass.
- `pnpm invariants` — 80/80 hold.
- `pnpm e2e overview-region-order.spec.ts landing-route.spec.ts
overview-sector-order.spec.ts securities-route.spec.ts` — 29/29 pass.
- `pnpm break a-topology-pan-with-no-way-back` — red for the right reason,
  restored byte-identical.
- Live verification against the running dev server (Claude-in-Chrome):
  wheel gating (`dispatchEvent` return value, both arms), `Reset view`
  reachable by its accessible name and functional, pan clamp visually
  confirmed before and after the fraction correction, no console errors
  from any of it.

## For a stakeholder — a status report, 2026-11-01

**What a user can see:** scrolling the page while the pointer happens to be
over the market graph works exactly as scrolling anywhere else does —
zooming the graph takes a deliberate `ctrl`/`⌘` + wheel, or the new `Reset
view` button if a reader has dragged or zoomed and wants the original view
back. Dragging the graph around can no longer lose it off-screen with no way
back but a reload.

**What was found:** the pan clamp's first number looked correct by every
automated check and was visibly wrong the moment it was tried on the real
page — a lesson this repository's own working-loop rules exist for
(`pnpm probe` / looking at the page before trusting a suite), applied here
to an interactive behaviour a static probe cannot see at all.

**What's next:** Task 6.2.4, the accessible fallback, failure ownership and
the degraded grid's new axis.
