# Task 7.2.7 — The whole checklist, for real: first paint, layout, re-measurement, the sweep

**Status:** Not started
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1, 7.2.2, 7.2.3, 7.2.4, 7.2.5, 7.2.6

## Objective

Close out this story's remaining acceptance criteria, which only make
sense once all five tools exist: the checklist's first paint, its fit at
narrow widths, the full-pipeline performance re-measurement, and the
sweep (task-file corrections, dated amendments, `docs/GAPS.md` entries).

## What the user can see when this lands

Pressing `Investigate` paints all five rows at once — not a
1-then-grows-to-5 sequence — each ticking from queued to running to
completed with a real tool name, status and duration, matching
`PRODUCT_SPEC.md` §14's own example shape. The panel fits at 390px
without landing a tab stop behind the sticky chrome (Story 7.1's own
measured trap, now with four more rows' worth of height to re-check).

## Work

- **First paint.** Seed all five known step rows client-side at press
  (`optimisticChecklist`), rather than growing from one placeholder as
  each `STEP_STARTED` arrives — the five tools are a fixed, known list,
  so this needs no wire-contract change.
- **Layout fit.** `pnpm probe /securities/NVDA --viewports
1440x780,390x780 --within "Abnormal-move indicators"` with the full
  five-row checklist showing, before writing any layout fix or
  assertion. Five rows will very likely push the panel back over the
  390×780 budget Story 7.1 landed at 601px with only 4px of headroom —
  expect to re-derive the fix, not just re-apply it.
- **Update the existing e2e spec.** `security-investigate.spec.ts`'s
  locators assume one step (`toHaveCount(1)`, a single `/^\d+ ms$/`
  match) and will break under strict mode with five completed rows.
  Scope the locators to the specific step rather than the whole region;
  keep the spec's existing, deliberate insensitivity to a tool's own
  ok/refused outcome.
- **Re-measure AC7** on a developer's own populated store (CI cannot
  produce a meaningful figure — four of five tools refuse there
  permanently, which would measure "how fast can we refuse five times").
  Reuse Story 7.1's paint-anchored, `requestAnimationFrame`-polled
  instrument for press→first-paint; add press→last-`STEP_COMPLETED`
  rendered as the figure that actually answers "how long does the whole
  investigation take," plus each step's own `durationMs` (free from the
  wire). Record the correlation tool's own cost broken out separately,
  since it is the one tool doing real I/O and will dominate the run.
- **Record AC3's reuse decision** in this task file (it's already
  recorded in `STORY.md`'s Gate 1 section — cross-reference rather than
  duplicate).
- **The sweep:**
  - `docs/GAPS.md` entries: no gated machine will ever draw an `ok`
    figure from price, peers, breadth or correlation (CI refuses all
    four permanently); the correlation tool's deployed-tier cost is
    unmeasured and named as a §28 breach candidate, condition-owned;
    no person has watched a five-step run against a real session
    (`LIVE-REHEARSAL.md` still has no Epic 7 row — Story 7.7 owns
    opening it, not this task).
  - `INVESTIGATIONS.md` amended with this story's account (what's now
    reachable, what still isn't, the shared-aggregate architecture
    change).
  - Confirm every other dated correction named across Tasks 7.2.1–7.2.6
    actually landed (`HOSTING.md`, ADR 0050, ADR 0038) — grep for
    `Story 7.2` across the docs this story touched.

## Done when

1. The checklist paints all five rows immediately on press.
2. `pnpm probe` confirms the panel fits at all four widths with no tab
   stop behind the sticky chrome; `pnpm e2e` (`search-keyboard.spec.ts`,
   `security-price-chart.spec.ts`) is green.
3. `security-investigate.spec.ts` passes against five real steps.
4. AC7's figure is taken on a populated store, reported with the
   warm/cold and loopback caveats this repository's own conventions
   require, with the correlation tool's cost broken out.
5. `docs/GAPS.md` and `INVESTIGATIONS.md` are updated; every dated
   correction named in Tasks 7.2.1–7.2.6 is confirmed present.
6. `pnpm verify`, `pnpm e2e` and `pnpm test:database` are all green.
