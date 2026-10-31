# Task 6.2.3 — Interaction Scope: Scroll, Zoom, & the Way Back

**Status:** Not started
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

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
