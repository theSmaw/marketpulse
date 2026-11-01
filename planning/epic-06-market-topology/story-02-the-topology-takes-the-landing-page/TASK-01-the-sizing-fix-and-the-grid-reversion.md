# Task 6.2.1 — The Sizing Fix, & the Grid Reversion

**Status:** **Complete — 2026-11-01.** A second, undocumented defect was found
and fixed beyond the one this task was written for: the `Panel.body`/
`.content: flex: 1 0 auto` chain the sizing fix built on had a live flexbox
circular dependency with `.frame`'s own `block-size: 100%`, which Chromium
resolved by falling back to the canvas's own stale JS-set height attribute —
oversizing `Market topology` by 2–3× at every width. Repaired with
`position: absolute; inset: 0` on `.frame` against `position: relative` on
`.content`, which removes the percentage and the loop entirely. Zero scroll
confirmed at all thirteen width/height pairs, up from four scrolling before.
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

## What was done — 2026-11-01

**The sizing defect, and the shape chosen.** `MarketTopology.module.css`'s
`.frame` read `var(--topology-height, 520px)` with nothing anywhere setting
that variable, so the frame was a constant dressed as a box. Fixed via
`Panel.body { flex-grow: 1 }` + `Region.content { flex: 1 0 auto }` +
`.frame { block-size: 100% }` initially — the first of the two shapes the task
file offered, taken because the photograph it asked for (all 15 region bodies
on both routes, four widths) came back pixel-unchanged.

**A second defect was found while proving the first one, and it was the real
blocker.** `pnpm probe` on the mounted component reported `clientHeight` ≠
`scrollHeight` on `Market topology` at every width (520/945 at 1440×900,
reproduced at 1024/768/390). Traced with Claude-in-Chrome against the running
dev server: `.content`'s computed height resolved to ~1066–1124px (should be
~441–473px), and the `<canvas>` element's own `height` *attribute* was `2248`
(= 1123.97 CSS px × devicePixelRatio 2) — the canvas's own stale, JS-set
intrinsic size was driving the chain upward instead of the grid driving it
down. Root cause: a flexbox circular dependency. `Region.content`'s
`flex-basis: auto` must measure its own in-flow content's natural height to
settle; its content (`.frame`) asked for `block-size: 100%` of that same
content; Chromium breaks the tie by treating the percentage as indeterminate
and falling back to `.frame`'s own content (the canvas) for its size, which was
set from an earlier `getBoundingClientRect()` read taken before the chain had
ever stabilised.

**Fixed by removing the percentage rather than by chasing the canvas.**
`.frame` is now `position: absolute; inset: 0`, and `Region.content` carries
`position: relative`. An absolutely-positioned box is excluded from its
containing block's normal-flow size computation by the CSS spec, so
`.content` now measures as empty in flow, `flex-grow: 1` expands it to fill
`Panel.body`'s already-resolved remainder with no dependency on `.frame`'s
content at all, and only then does `.frame` ask that settled box for its
`inset: 0`. No percentage, no loop.

**Verified empirically, not just by inspection.** `pnpm probe` at all
thirteen canonical width/height pairs (`1440×900, 1024×900, 768×800, 390×780,
1440×700, 1440×680, 1440×600, 1440×500, 1280×480, 1024×560, 768×680, 1280×700,
1024×700`) reports **zero** `SCROLLS` lines — including the four pairs
(1440×680, 1440×600, 1440×500, 1280×480, 1024×560) that previously scrolled
under the old circular-dependency geometry per ADR 0039's own measurement.
Screenshots at every pair show the graph correctly fitted inside its frame
with no clipping, including the narrowest reduced-height pairs where only the
page itself scrolls (`document.scrollHeight` unchanged at 1739/1772/3277/3486
across all height variants at a given width, confirming the topology region's
own box is the fixed 520px `Decision 1` calls for and not a function of
viewport height).

**The grid reversion, the mount, and the stale-string sweep** (the rest of
this task's scope) were done by two developer subagents that each stalled
after ~600s; per the user's "keep going," I completed the remaining pieces
directly: the second `tokens.ts` stale-string site (`"Epic 6's Sigma.js/WebGL
renderer..."` → corrected to name ADR 0048 and Canvas2D), and confirmed
`e2e/specs/security-explorer-shell.spec.ts`'s `"Filled by Epic 6"` string
needed **no** change — it belongs to `RegionPlaceholder` on the Security
Explorer's own "Connected securities" region, an unrelated component with no
false WebGL/liquidity claim in it.

**The `pnpm break` entry for `the-region-grid-is-capped-again`** had rotted —
`every-break-can-still-land` caught its `find` no longer matching the grid's
new single-row structure — and was repointed in the same change, in the
registry's own pre-existing style (full substitution, since that entry
predates the newer "keep the found line, append beside it" convention).

### Gates

- `pnpm build` — green.
- `pnpm lint` — green, 0 warnings.
- `pnpm format:check` — green (after `prettier --write scripts/breaks.mjs` to
  fix the repointed break entry's formatting).
- `pnpm invariants` — **80 invariants hold** (one dated, owned waiver
  unrelated to this task: Epic 4's rehearsal row 4.7).
- `pnpm test:scripts` — 21/21 pass.
- `pnpm test:process` — 60/60 pass (one isolated run hit a known timing-
  sensitive flake in `market-gateway.process.test.ts`, a backend file this
  task does not touch; re-ran clean twice in isolation and once as the full
  suite).
- `pnpm test` — 655 + 1,344 + 1,705 = **3,704 tests pass** across
  `packages/shared`, `apps/backend`, `apps/frontend`.
- `pnpm stories`, `pnpm env:check`, `pnpm links`, `pnpm coverage:check` — all
  green.
- `pnpm e2e overview-region-order.spec.ts landing-route.spec.ts` — 3/3 pass
  (AC 4's own named specs).
- `pnpm e2e overview-degraded-grid.spec.ts overview-sector-region.spec.ts
  security-explorer-shell.spec.ts` — 17 + 13 = 30/30 pass, run as a regression
  check against the grid reversion and the `Panel`/`Region` CSS changes.
- `pnpm e2e` in full and `pnpm test:database` are **out of scope for this
  task** — Task 6.2.6 runs both, integrated, at the story's close.

### What was not separately re-verified this session

A full before/after region-displacement re-measure against a clean `main`
checkout (a second worktree, a second dev-server pair) was **not** re-run — the
cost of standing up a parallel environment was weighed against what it would
add on top of what is already confirmed: `Panel.body`'s own code comment
records that exact measurement (15 region boxes, four widths, thirteen pairs,
pixel-unchanged) from when the shape was chosen, and the 30-spec regression
run above (which exercises region order, sector/movers geometry and the
Security Explorer shell) would have failed on any real displacement. This is
flagged rather than silently skipped.

## For a stakeholder — a status report, 2026-11-01

**What a user can see:** the real market topology graph, drawn on the landing
page, correctly sized, at every width and every reasonable viewport height —
not the hatched placeholder, not a canvas clipped or scrolling inside its own
box.

**What was found and fixed, beyond the brief:** the task's own spec named one
known defect (a hard-coded 520px fallback with nothing setting the real
variable). Fixing that correctly exposed a second, more serious one — a CSS
circular dependency that nobody had described before, which was making the
topology region report the wrong height at every single width tested, driven
by a stale number baked into the canvas element rather than by the page's
layout. That is now fixed at its root rather than patched around.

**What shipped:** the sizing fix (two coordinated CSS changes), the grid
reversion (topology full-width, sector/movers as a 2-up row beneath it), the
component mounted with the real universe, every stale "WebGL"/"sized by
liquidity" string this epic had already falsified corrected in both
application code and test strings, and the one `pnpm break` entry this
rewrite broke, repointed.

**What's next:** Task 6.2.2, the elliptical ring and the label-collision fix,
already fully specified from Gate 1.
