# Task 6.7.2 — The graph marks a burst, decaying

**Status:** Complete — 2026-11-10, the self-re-arming mark ships, proved
running and stopping on a real browser rather than assumed
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

---

## What was done — 2026-11-10

**The visual spec came from the designer role, not from argument.** A graph-
level wash (one `fillRect` over the exact viewport `clearRect` already
clears), `--ink-primary` composited at a peak `globalAlpha` of **0.06** (a
design judgement, not a derivation — reasoned from the identity block's own
"nearly invisible" arrival disc scaled to cover 100% of the screen rather
than one figure, and recorded with that reasoning in `LIVE_MARK_PEAK_ALPHA`'s
own docblock), reusing `--motion-duration-decay`'s existing hold-then-fade
shape (opacity 1 to 33% of elapsed/duration, linear fade to 0 across the
remainder — restated in JavaScript as `liveMarkShape()` because a `<canvas>`
cannot run a CSS `animation`). Drawn **last** in the frame, after every node,
edge, label and ring — a veil over the finished picture. **The design canvas
could not be consulted for either half of this decision**: `DesignSync` is
unreachable from the designer subagent (confirmed, not assumed) and blocked
for the orchestrator too, needing `/design-login`, which this session does
not have. The visual spec stands on the reasoning above and on a running
build rather than on a canvas file; syncing it back is still owed.

**The mechanism, exactly as specified.** `markBurst()` sets one clock
(`burstStartedAt = performance.now()`) and calls `invalidate()`; `draw()`
computes `liveMarkShape(elapsed, palette.motionDurationDecayMs)` and, while
it is `> 0`, paints the wash and calls `invalidate()` again — the existing
`pending ??= requestAnimationFrame(draw)` scheduler, no second primitive.
Progress is read from the clock every frame, never from a counter, so a
dropped frame shortens the remainder rather than extending the fade. A
second `markBurst()` call while a mark is already decaying **restarts** it
from full strength (moves the one clock) rather than compounding two marks.

**The quantised-alpha-steps technique was NOT built, and that is a
considered omission rather than a skipped instruction.** The technical-
analyst's finding bounds draw-call cost for a mechanism that might draw _up
to ~340_ simultaneous per-node marks; Open Decision 1 settled on exactly
**one** graph-level mark, so the draw-call count is `1` regardless of how
the alpha is computed, and a batching scheme for a batch of one would be
the premature abstraction CLAUDE.md's own working rules name. The technique
remains the right answer the day a second simultaneous mark is added; today
it has nothing to bound.

**`--motion-duration-decay` reaches JavaScript for the first time.** Added to
`TOKEN_NAMES`, read once at mount through `topologyPalette()` via a new
`milliseconds()` parser (`palette.ts`, `>= 0` rather than `pixels()`'s
`> 0` — `0ms` is reduced motion's correct, reachable value, not a missing
stylesheet). `prefers-reduced-motion` resolves for free through
`getComputedStyle`'s own cascade — `tokens.css`'s media query already
overrides the token to `0ms` there, so `liveMarkShape` reaches `0` on the
mark's very first frame and nothing ever paints. No second, parallel
`matchMedia` read exists anywhere in this change. The accepted limitation is
stated in both the token's and the palette field's own docblocks: an OS
preference toggled mid-session is not picked up until the next mount, the
same limitation every other mount-time token read in this application
already carries.

**The trigger, fired correctly rather than on every recompute.**
`MarketOverview.tsx` watches `liveFeed.observations` (not `overview`) —
`sameLiveFeedView`'s own docblock establishes that `overview` changes
identity on every one of the gateway's up-to-16-a-minute recomputes whether
or not a price moved, while `observations` changes reference only when
`withObservations` actually folded in an arrived bar. The first change
(the connection's initial snapshot) is skipped by a `useRef` guard,
matching `arrival.ts`'s own rule that a snapshot is never news. A later
reconnect's snapshot is not specially excluded and is accepted as a known,
harmless edge case: `serveFeed`'s own harness confirmed it sends at most one
snapshot a connection, so this does not fire in the test suite, and in
production a reconnect genuinely did just deliver fresh data to the
browser — the mark reading as _the market just breathed_ is the correct
direction of the error, the same trade `sameLiveFeedView` itself makes.

**The declined `React.memo` boundary, evaluated a third time — it did not
fire.** `markBurst` reaches the renderer through `MarketTopologyHandle`,
called from the route's own effect, never as a prop `MarketTopology`
receives — the mount effect's deps are still exactly
`[topology, probe, sentenceId]`. Recorded in the module docblock in the
same wording Task 6.3.3 used for its own evaluation, and proved by a
producer-side test interleaving `setBands` and `markBurst` across five
re-renders: one mount call, zero `destroy()` calls, five `markBurst` calls,
six `setBands` calls (the mount-time prop plus five re-renders).

**Proved on a real browser, not assumed — and `framesDrawn()` turned out to
be the wrong tool for the job, so a stronger one was used instead.**
`framesDrawn()` is a method on the `TopologyRenderer` instance living
inside `MarketTopology`'s own closure; nothing exposes it to a page a
Playwright spec drives from outside, and building a test-only hook to reach
it would be instrumenting the application for the test rather than
observing what a reader sees. `overview-market-topology-anomaly-bands.spec.ts`'s
own whole-canvas `toDataURL()` comparison is the established alternative in
this exact file family, and it is strictly more rigorous here: it reads the
actual rendered pixels rather than an internal counter that could itself be
wrong. The new spec (`overview-market-topology-live-mark.spec.ts`) samples
the canvas six times across the decay window and asserts **more than two
distinct values** — proving a continuously fading sequence rather than a
single on/off swap — then confirms the canvas has returned to **exactly**
the pre-burst baseline once the 900 ms duration has elapsed. **Confirmed
red for the right reason before landing**: with the self-re-arming
`invalidate()` call removed by hand, the same test failed with `distinct`
= 1 (the mark froze at its first painted alpha instead of fading), while
the reduced-motion test — unrelated to that defect — still passed; restored
and reconfirmed green. The same substitution is now `pnpm break
the-graph-level-mark-does-not-self-re-arm`, run against the live spec file.

**Reduced motion, proved the same way.** A second test emulates
`prefers-reduced-motion: reduce` before navigating, serves the same real
bar arrival, and asserts the canvas is **byte-identical** across six
samples spanning the would-be decay window — the control for this is the
first test itself, which uses the platform default (`no-preference`) and
shows the canvas changing.

### Gates

- `pnpm --filter @marketpulse/frontend typecheck` — clean.
- `pnpm exec eslint` over every touched file, `--max-warnings 0` — clean.
- `pnpm --filter @marketpulse/frontend test` — 103 files, **1,857** tests
  (3 new), all green.
- `pnpm e2e overview-market-topology-live-mark.spec.ts` (new) plus the four
  existing `overview-market-topology*.spec.ts` files — 27 of 27 pass.
- The new browser spec confirmed red-for-the-right-reason under a manual
  plant (self-re-arm removed), then green again after the revert; the same
  substitution is now a registered `pnpm break` entry,
  `the-graph-level-mark-does-not-self-re-arm`.
- `pnpm invariants` — 83 hold (one dated waiver, unrelated).
- `pnpm verify` — green: build, lint, format, stories, env:check, links,
  invariants, coverage:check, test (1,388 backend + 1,857 frontend), test:scripts,
  test:process.
- `pnpm e2e` (the full suite) — one run failed 10 tests, including this
  task's own new spec, while the machine climbed to load 31–33 on 8 cores
  mid-run (this file's own documented "known-bad" band); all 10 — the four
  `overview-degraded-grid.spec.ts` widths, this task's two new tests, and
  four wholly unrelated specs (`overview-no-element-per-security`,
  `overview-source-note`, `securities-route`×2, `security-holiday-week`) —
  reproduced clean at `--workers=1` once the load settled below 10: **35
  passed, 0 failed.** Contention, not a regression.

## For a stakeholder — a status report, 2026-11-10

`/`'s market-topology graph now visibly breathes: once a batch of live
prices lands, a brief, subtle highlight washes over the whole picture and
fades — the first new motion this product has shipped since the arrival
disc beside a security's live price. It reuses the exact animation
mechanism the renderer already had rather than building a second one, and
it respects a reader's reduced-motion preference by not running at all
there. The visual treatment (how strong, what colour, exactly which shape)
came from a design review grounded in this product's own existing rules
rather than from guesswork, though the design canvas itself could not be
consulted or updated — that remains owed, blocked on the same `/design-login`
step flagged earlier in this story. Nothing else on the page changed.
