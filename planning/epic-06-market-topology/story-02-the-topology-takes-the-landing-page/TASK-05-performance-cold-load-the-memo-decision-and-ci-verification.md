# Task 6.2.5 — Performance: Cold Load, the Memo Decision, & CI Verification

**Status:** Not started
**Story:** [6.2 The Topology Takes the Landing Page](STORY.md)
**Depends on:** 6.2.1, 6.2.3, 6.2.4

## Objective

This story's AC 8 and AC 9 both need real measurement, not an activity that
cannot fail. This task also exploits something new: `buildTopologyGraph`
needs only `GET /securities`, which CI's gated runner actually has (516
securities, zero bars) — the first region on `/` whose real content a gated
machine can verify rather than permanently render `empty`.

## What the user can see when this lands

**Nothing new.** This task measures and proves what the previous four
already built.

## Work

- **AC 8, the memo decision — record it, don't just decide it.** `STORY.md`'s
  own technical finding is precise: the mount effect's deps (`[securities,
probe]`) are stable across every live-feed batch, so the canvas does not
  re-mount and a host re-render touches nothing the renderer owns. **Decline
  a `React.memo` boundary** and write the reversal trigger into the
  component's own docblock: _the first prop this region takes that changes at
  feed cadence_. Hold the claim with a **producer-side** test: drive several
  applied batches through the shipped socket path against a mounted
  `MarketTopology`, assert `framesDrawn()` is unchanged — this is the "prove
  it on the producer, the wire cannot see it" shape, not a render-count
  assertion.
- **AC 9, split into two measurements:**
  - **Cold load**, for real, via `overview-instrument.mjs`'s `pageInstrument()`
    against the built pair (not `topology-instrument.mjs`, which has no route
    arm at all — it serves Storybook's own static build). Three channels
    (`longtask`, `long-animation-frame`, rAF-gap), each proved by its own
    plant, `assertProductionBuild`, `visibilityState` checked first, machine
    load read before the run. Compare against the 447-node / 24.7ms p50 /
    34.7ms p95 baseline. Note `devicePixelRatio` beside every figure — the
    canvas's backing-store cost scales with it, and a DPR-1 CI runner and a
    DPR-2 laptop are not measuring the same thing.
  - **Frame rate under interaction** stays a **Storybook-measured, stated
    bound** (ADR 0048's own figures), because `probe` has no entry point on
    the real route today (it is wired only in `MarketTopology.stories.tsx`).
    Do not invent a route-level entry point for this task; state the
    limitation in `TOPOLOGY.md` instead.
  - If the cold-load figure crosses §28's 50ms, **stop and report to the
    Product Owner before closing this task** — the decision to ship anyway
    with the figure handed to Epic 14 is theirs, per this story's own Gate 1
    decision record, not a default outcome of taking the measurement.
- **New browser-level assertions, exploiting CI's real capability:**
  - A `&lt;canvas&gt;` exists in the region with non-zero `width`/`height`
    attributes, derived from the box × `devicePixelRatio` (never a constant).
  - The renderer's refusal sentence is **absent** — a real negative no other
    `/` region can assert, because every other region's browser-level
    verification is permanently blind on CI's zero-bar store.
  - **Out-of-frame grounding**: the drawn node census agrees with `GET
/securities`' own active-security count — not inferred from the frame,
    independently recomputed, per this repository's own rule that a
    frame-derived assertion is green against a lying producer and only an
    independent recompute catches it.
- **Confirm the existing suite stays green**: `overview-region-order.spec.ts`,
  `landing-route.spec.ts`, `overview-no-element-per-security.spec.ts`,
  `expectEveryRegionIsATabStop`.

## Done when

1. The memo boundary is declined, recorded with a reversal trigger in the
   component's own docblock, and held by a producer-side `framesDrawn()`
   assertion across several applied batches.
2. The route's cold load is measured for real on three proved channels,
   against the 447-node baseline, with the verdict (pass, or handed to Epic
   14 with figures) stated plainly — and if over budget, reported to the
   Product Owner before this task closes.
3. The frame-rate-under-interaction claim is documented as a Storybook-bound
   limitation in `TOPOLOGY.md`, not invented for the route.
4. New CI-capable browser assertions exist: canvas dimensions from the real
   box, refusal sentence absent, drawn census independently verified against
   `GET /securities`.
5. `pnpm e2e` is green on every touched and newly-added spec.
6. `pnpm build && pnpm lint && pnpm format:check` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
