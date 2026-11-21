# Task 7.3.2 — The confidence mark, and the row's final layout

**Status:** Not started
**Story:** [7.3 Findings, Evidence, & Confidence](STORY.md)
**Depends on:** 7.3.1

## Objective

Task 7.3.1 shipped the claim as plain, unstyled text. This task gives it
its real visual form — a `ConfidenceMark` that cannot be confused with
the anomaly-band chip twelve pixels below it — and makes the row's
two-line layout the actual shipped shape rather than a placeholder,
measured rather than argued.

## What the user can see when this lands

Each completed row's claim line now carries a confidence mark —
`SUPPORTED`, `POSSIBLE`, `UNKNOWN` or (reserved, unproduced today)
`CONFIRMED` — set as plain text with a short leading rule whose stroke
style (solid/dashed/dotted) carries the level, spending no colour at all.
It reads as nothing like the filled amber band chip in `Abnormal-move
indicators` just below it.

## Work

- **`apps/frontend/src/components/ConfidenceMark/`** (new component):
  `microLabel` text, a 12px leading rule (solid 2px `CONFIRMED`, solid
  1px `SUPPORTED`, dashed 1px `POSSIBLE`, dotted 1px `UNKNOWN`), no
  background, no border box, no `min-width`. Imports nothing from
  `AnomalyBadge`/`Badge`; composes nothing from their stylesheets. The
  accessible string is the long form (`Confidence: SUPPORTED`) — the two
  chips sit close enough on screen that a bare word is ambiguous to a
  listener.
- **`InvestigationChecklist.tsx`/`.module.css`**: replace Task 7.3.1's
  plain-text line with the real two-line CSS grid — `glyph | description
  | duration` on row 1, the claim + `ConfidenceMark` spanning the
  description and duration columns on row 2 (reclaiming the duration's
  reserved width for the claim line). Use an explicit `{" "}` between the
  mark and the claim sentence (a flex `gap` is invisible to a screen
  reader — this product has the fix shipped twice already, in
  `ScoreBand` and `AbnormalMove`'s percentile cell; copy the idiom).
  `pnpm probe /securities/NVDA --within "Abnormal-move indicators"`
  **before and after**, at all four widths, to confirm the glyph's
  baseline survives the flex→grid change — do not assume it does.
- **AC 5a's two invariants**, each with a `pnpm break`:
  `confidence-and-band-never-share-a-component` (no file imports both
  `ConfidenceMark` and `AnomalyBadge`; neither module imports the
  other), and a check that `ConfidenceMark.module.css` declares no
  `background`/`background-color`/`min-width` and reads no
  `--anomaly-*`/`--palette-amber*` token or raw colour literal. (The
  colour-ramp half of AC 5 is **already** covered today by
  `amber-appears-once-in-the-rail` — confirm this with `pnpm invariants`
  before writing anything new for it.)
- **AC 6's claim-length ceiling**: pick the character cap from a real
  measurement — `pnpm probe` against **`pnpm store:bare`** (the zero-bar
  store; refusal claims are the longest sentences this product draws,
  so this is the worst case, not an edge case) at all four widths, with a
  spike claim near the likely ceiling. Enforce the cap at the mint (in
  `packages/shared/src/finding.ts` or at each `toFinding` call), with a
  `pnpm invariants` entry + break proving a claim over the cap fails the
  build rather than silently wrapping or truncating.
- **AC 7's component assertion**: a test asserting the claim + mark add
  zero focusable elements and zero `onClick`/`onKeyDown` handlers to a
  row.

## Done when

1. `ConfidenceMark` renders all four levels with no colour and no shared
   code with `AnomalyBadge`; both new AC 5a invariants hold and their
   breaks go red for the right clause.
2. `pnpm probe` confirms the two-line grid at all four widths with no
   glyph/baseline drift and no row shift to the rows around it beyond
   what AC 6's own ceiling allows.
3. The claim-length invariant holds, with its number taken from the bare-
   store probe (quoted verbatim in this task's own record) rather than
   argued.
4. `pnpm e2e security-investigate.spec.ts search-keyboard.spec.ts` is
   green.
5. `pnpm verify` is green.
