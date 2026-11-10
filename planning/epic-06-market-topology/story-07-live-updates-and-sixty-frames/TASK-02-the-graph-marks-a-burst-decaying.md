# Task 6.7.2 — The graph marks a burst, decaying

**Status:** Not started
**Story:** [6.7 Live Updates, & the Graph That Stays at 60 FPS](STORY.md)
**Depends on:** 6.7.1

## Objective

Open Decision 1 settled on one graph-level decaying mark per burst, fired
by the aggregate's own observation instant advancing — not a per-node
mark. This task builds it: the first mechanism in this renderer that
redraws without a user gesture, and the first new motion this product has
shipped since the identity block's own 900ms arrival disc.

## What the user can see when this lands

A brief decaying highlight on the topology region, once a minute, when a
live batch arrives — the graph visibly "breathing" rather than updating by
silently swapping state.

## Work

- **The self-re-arming animation mechanism**, per the technical-architect's
  own verdict: extend the renderer's existing `invalidate()`/`pending`
  coalescing scheduler (`renderer-canvas.ts`) rather than building a new
  loop. `draw()` ends by calling `invalidate()` again iff the mark is still
  live; the stop condition is the mark's own elapsed time exceeding the
  decay duration. No `setTimeout` burst, no second rAF handle, no `running`
  flag — reuse the one scheduler this renderer already has.
- **Progress derived from the clock** (`performance.now()`), never a frame
  counter, so a frame drawn for an unrelated reason (a pan) shows the mark
  at the correct progress and a dropped frame shortens the remainder rather
  than extending the fade.
- **Bound the draw-call cost regardless of what's live**, per the
  technical-analyst's own finding: quantise elapsed-time into a small
  number of alpha steps (the chart layer's own precedent — one batched path
  per class, not one draw call per element) rather than a continuous
  per-mark `fill()`.
- **The imperative handle**, following `setBands`'s exact shape: a new
  `TopologyRendererOptions`/`MarketTopologyHandle` method, called from
  `MarketOverview.tsx`'s own effect watching the aggregate's observation
  instant — never a re-passed prop, which would fire the component's own
  documented memo-boundary reversal trigger. Record in the module docblock
  that the trigger was evaluated a third time and did not fire, the same
  wording Task 6.3.3 used.
- **Reduced motion via the token layer.** Add `--motion-duration-decay` to
  `TOKEN_NAMES` (`styles/tokens.ts`) and read it as a string at mount,
  resolving to `0ms` under `prefers-reduced-motion` — never a second,
  parallel `matchMedia` read. State the mount-time-only limitation (an OS
  preference changed mid-session is not picked up) explicitly, since this
  is a real, if minor, product behaviour.
- **What survives under reduced motion**: nothing persists where the mark
  would have been — the observation instant the mark would have announced
  is Task 6.7.3's plate line, which already exists independent of whether
  the mark ran.

## Done when

1. A live burst produces one decaying graph-level mark, matching
   `--motion-duration-decay`'s 900ms figure and its hold-then-fade shape.
2. The mechanism reuses the existing `invalidate()`/`pending` scheduler;
   no second animation primitive exists in this renderer.
3. The loop starts on a live update and stops when the mark finishes —
   proved via `framesDrawn()` sampled before/during/after, not assumed.
4. `MarketTopology.tsx`'s declined-memo-boundary docblock records this
   trigger's third evaluation and non-firing, with the producer-side test
   extended (interleaving bands and the new mark across repeated
   re-renders) to prove it.
5. Reduced motion is honoured: `page.emulateMedia` + a `framesDrawn()`
   before/after sample shows the loop does not run; a control arm with no
   preference set shows it does.
6. `pnpm verify` green; the new mechanism's tests pass at the component
   level (producer-side, against the fake renderer) and a targeted browser
   spec covers what cannot be seen below one.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
