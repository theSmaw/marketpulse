# Task 6.7.4 — 60 FPS, measured for the first time, and the close

**Status:** Not started
**Story:** [6.7 Live Updates, & the Graph That Stays at 60 FPS](STORY.md)
**Depends on:** 6.7.1, 6.7.2, 6.7.3

## Objective

`PRODUCT_SPEC.md` §28's market-topology target — 60 FPS at the real
shipped graph's size during pan, zoom and a live update — has never been
measured, because nothing rendered until Story 6.1. This task builds the
missing measurement infrastructure (a gap TOPOLOGY.md §4 has named twice
without closing), takes the figure for real, verifies the whole story end
to end, and closes it.

## What the user can see when this lands

Nothing new — this is the measurement and verification pass.

## Work

- **Build the route-level interaction harness.** `pnpm probe`'s own
  pan/zoom path has only ever been wired to `MarketTopology.stories.tsx`'s
  fixed Storybook container — extend `scripts/topology-instrument.mjs`
  with a `live` arm that drives the real `/` route's resizable content box,
  with a live-update mechanism actively firing arrivals concurrently with
  pan/zoom, not just a static path.
- **AC1, as the three-part conjunction**: the loop ran (frame count
  advanced), the loop kept up (rAF-gap p50 ≤ 16.7 ms, p95 near quantum, 0
  gaps over 50 ms), nothing blocked (0 `longtask`, 0
  `long-animation-frame` over 50 ms) — at 516 nodes and the real edge
  count. Run both `--headed` (authoritative) and headless (the regression
  floor), with the GPU/renderer string recorded beside every figure, and
  an interleaved unaffected control arm (`membership`, per ADR 0048's own
  precedent) in every run.
- **AC2's plant**, proved landing on a frame the live-update mechanism
  scheduled, pointer still — not a wheel-provoked frame.
- **AC3, the burst**, measured via `e2e/support/feed.ts`'s `serveFeed`/
  `send` — the real 516-subscribed population and a furnished arm, each
  labelled, over at least 3 consecutive bursts.
- **AC6's producer-side test and new invariant**: the renderer is never
  handed a second layout across live updates (component level); a new
  `pnpm invariants` clause, a mechanical sibling of
  `the-topology-layout-reads-no-edge`, refusing any read of an arrival key
  or observation instant inside the renderer's own placement/draw-position
  code — with its own `pnpm break`.
- **AC4's invariant widened**, per the story's own rewritten criterion:
  `an-arrival-mark-is-keyed-on-the-arrival` extended to see the renderer's
  own arrival-marking call site, with a break planting the defect the next
  author would write (keying the mark on the score), confirmed to pass
  wrongly first.
- **Full verification**: `pnpm verify`, `pnpm e2e`, `pnpm test:database`.
  `pnpm probe` at all four widths, greyscale crops checking the new mark
  and the plate's two new lines against the existing band ring and focus
  ring in the same 4-unit annulus (three treatments now sharing it).
- **Upward/sideways sweeps**, `docs/GAPS.md` (CI's permanent absence of
  any arrival/staleness state — no socket on a gated machine means no
  burst ever fires there, unlike every other live topology feature which
  is store-gated; this one is socket-gated and is therefore reachable in a
  browser spec even on CI, which is worth stating as a genuine
  differentiator), the headed/headless GPU caveat extended from Task
  6.6.1's entry, `TOPOLOGY.md`, `CLAUDE.md`, `LIVE-REHEARSAL.md` row 6.7.
- **`STORY.md` status** set to Complete, with the PR links.
- **Gate 2** presented to the Product Owner.

## Done when

1. A route-level interaction harness exists and AC1 is measured through
   it, both `--headed` and headless, with the figures recorded.
2. AC2, AC3 are measured and recorded per their rewritten forms.
3. AC6's new invariant and break are in place, proved red-then-green.
4. AC4's widened invariant and break are in place, proved red-then-green.
5. `pnpm verify`, `pnpm e2e`, `pnpm test:database` are green; `pnpm probe`
   results and greyscale crops are recorded.
6. The sweeps are complete and recorded, with the sideways grep count
   stated.
7. `docs/GAPS.md`, `TOPOLOGY.md`, `CLAUDE.md`, `LIVE-REHEARSAL.md` are
   updated.
8. Gate 2 is presented with evidence per acceptance criterion and per Open
   Decision, and the story is accepted and closed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
