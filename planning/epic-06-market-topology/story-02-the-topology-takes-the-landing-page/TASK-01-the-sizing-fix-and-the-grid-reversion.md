# Task 6.2.1 — The Sizing Fix, & the Grid Reversion

**Status:** **In progress — 2026-10-31**
**Story:** [6.2 The Topology Takes the Landing Page](STORY.md)
**Depends on:** nothing

## Objective

Every later task in this story needs the topology mounted on `/`, in its real
box, at the right size — the renderer, the fit math and the absence states
already exist from Story 6.1. This task is where the route meets the
component for the first time, and it is where the one shipped defect that
blocks everything else (`--topology-height`'s unset `520px` fallback) gets
fixed before anyone builds on top of it.

## What the user can see when this lands

**The real graph, in its real place on `/`, correctly sized at every width.**
No census line, no retry wiring, no interaction polish yet — a reader sees the
market, fitted to its box, where the hatched placeholder used to be. The four
displaced regions (sector performance, movers in a 2-up row beneath it;
unusual activity, breadth, investigations untouched in the right column) read
exactly as they did, just lower.

## Work

- **Fix the sizing defect.** `MarketTopology.module.css`'s `.frame` resolves to
  `520px` always (`var(--topology-height, 520px)`, nothing sets the variable).
  Give `.frame` a real box from its container — `block-size: 100%` requires
  the chain above it to resolve, which touches `Panel`. Two shapes, with their
  blast radius stated in STORY.md's technical findings:
  - `Panel.body { flex: 1 }` + `.frame { block-size: 100% }` — correct and
    minimal, but `Panel` has one importer (`Region`) used by 7 regions on `/`
    and 8 on `/securities/:symbol`. **Photograph all 15 region bodies at four
    widths on both routes before taking this** — a `flex: 1` changes how every
    one of them distributes free space.
  - `.frame { position: absolute; inset: 0 }` inside a `position: relative`
    sizer this component owns — self-contained, no shared-component change,
    needs its own sizer to have a resolved height.
  - Pick based on what the photograph in the first option shows; if it is
    clean, prefer it (one mechanism, not two).
- **Revert the grid** (`MarketOverview.module.css`'s `grid-template-areas`) to
  the end state: topology spans the full width of the shipped
  `minmax(0, 3fr) minmax(0, 1fr)` primary column (not the canvas's literal
  `span 8`/`span 4` — Decision 7); sector performance and movers become a 2-up
  row beneath it in that same column; the right column is untouched. Region
  height at 1440: **520px** (Decision 1).
- **Mount `MarketTopology`** in `MarketOverview.tsx`, passing `universe` from
  the existing `useSecurities()` call (already there since Task 4.5.5 for the
  movers' name map — no new fetch). `onRetry` wiring is Task 6.2.4's; pass a
  no-op or defer the prop until then, whichever keeps this task's own build
  green without inventing throwaway code.
- **Delete the reserved panel** and its `filledBy` sentence in
  `MarketOverview.tsx` (_"in WebGL … sized by liquidity … moving with the
  market"_), and the matching sibling string in
  `e2e/specs/security-explorer-shell.spec.ts`.
- **Sweep the remaining stale "WebGL"/"sized by liquidity" strings** ADR 0048
  falsified: `apps/frontend/src/components/Region/Region.stories.tsx` (two
  sites — also drop its stale "Story 1.4's render check" aside, removed
  2026-09-25) and `apps/frontend/src/styles/tokens.ts` (two sites — "Epic 6's
  Sigma.js/WebGL renderer…" prediction, already falsified and recorded in ADR
  0048's Consequences; correct the comment to match).
- **Measure before/after displacement** at the thirteen width/height pairs
  Task 4.6.6 used (correcting Story 6.1-era attribution drift that had this as
  Task 4.9.4) — `pnpm probe` on a clean `main` worktree, then on this branch,
  diffing the `top` of every displaced region and the document's own scroll
  height. State the figures in this task's own record (AC 2).
- **`pnpm probe` review** at 1440/1024/768/390 plus the 680/700/500-height
  pairs: confirm `clientHeight` === `scrollHeight` (no scroll) and look at the
  screenshots for a clipped graph, which `overflow: hidden` makes invisible to
  any mechanical check.

## Done when

1. `--topology-height`'s `520px` fallback is gone; the frame is sized from its
   resolved box at all thirteen width/height pairs, with no scroll and no
   clipping (confirmed by probe screenshots, not just `clientHeight`).
2. The grid matches the end state: topology full-width in the primary column,
   sector performance/movers in a 2-up row beneath it, right column untouched,
   at 520px region height at 1440.
3. `MarketTopology` is mounted and drawing the real universe on `/`.
4. `e2e/specs/overview-region-order.spec.ts` and `landing-route.spec.ts` are
   green with the topology's real content.
5. Every live "WebGL"/"sized by liquidity" string this epic has falsified is
   corrected, in application code and in test strings.
6. The before/after displacement is measured and recorded, at all thirteen
   pairs, for every region AC 2 names.
7. `pnpm build && pnpm lint && pnpm format:check` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
