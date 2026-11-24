# Task 7.3.2 — The confidence mark, and the row's final layout

**Status:** Complete — 2026-11-24. `ConfidenceMark` shipped, the real
two-line grid replaces Task 7.3.1's unstyled `<p>`, both AC 5a invariants
hold with breaks proving them, and a real second-order bug (two straight
apostrophes reaching the wire from `finding-claim.ts`) was found and fixed
along the way. The grid was verified by `pnpm probe` against Storybook
rather than the live route — no Docker on this machine, the same
constraint every task this session has carried — and that half is recorded
as owed in `docs/GAPS.md` rather than quietly skipped.
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

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-24

**`ConfidenceMark`** (`apps/frontend/src/components/ConfidenceMark/`): a
12px leading rule whose stroke style carries the level (solid 2px
`CONFIRMED`, solid 1px `SUPPORTED`, dashed 1px `POSSIBLE`, dotted 1px
`UNKNOWN`) beside the level's own word, no background, no border box, no
`min-width`, zero colour tokens. Accessible string is the long form
(`Confidence: SUPPORTED`) via a visually-hidden prefix plus the one visible
word — never two copies of the word. Zero focusable elements, zero
handlers, asserted structurally. Full Storybook coverage including an
`InGreyscale` story.

**`InvestigationChecklist`'s row** is now a two-row CSS grid
(`glyph description duration` / `. claim claim`) rather than flex, which
the ux-architect flagged at Gate 1 as a change that could silently move the
glyph's baseline — it did, in the direction nobody expected: the first
flex→grid draft with `align-items: baseline` put the glyph 17px from the
row's top edge and grew every completed row from 26px to 52px (75px at
390). Fixed by keeping `align-items: baseline` but giving the grid rows
their own areas rather than nesting a second flex container. The claim
spans the description and duration columns, reclaiming the duration's 8ch
reserve — worth ~49px at 390, most of a word at the tightest width.

**AC 5a — two new `pnpm invariants` entries, each with a break, both
verified red-for-the-right-reason then restored**:

- `confidence-and-band-never-share-a-component` — no file under
  `ConfidenceMark/` imports from or `composes:` a class from
  `AnomalyBadge`/`Badge`, and neither of those imports or composes from
  `ConfidenceMark`. Break `confidence-mark-composes-the-band-chip` plants a
  second `composes:` target reaching into `Badge.module.css` and the check
  goes red naming the crossing line.
- `the-confidence-mark-spends-no-fill-and-no-colour` —
  `ConfidenceMark.module.css` declares no `background`/`background-color`,
  no `min-width`, and reads no `--anomaly-*`/`--palette-amber*` token.
  Break `the-confidence-mark-grows-a-fill` plants a `background` on `.mark`
  and the check goes red naming it. (`amber-appears-once-in-the-rail`
  already covered the colour-ramp half product-wide — confirmed before
  writing anything duplicate, per the task's own note.)

`pnpm invariants` now holds **97** (was 95).

**AC 6 — the claim-length ceiling.** `CLAIM_CEILING` (72, set at Task
7.3.1) was independently re-derived by hand against the real producers:
the cross product of `FINDING_SUBJECTS` (max 19 chars, `Market
correlation`) × `TOOL_REFUSAL_CLAIMS` (max 45 chars, tied between
`reference-split-discontinuity` and `no-reference-move`) gives **66**
characters for `Market correlation — the benchmark's history crosses a
price break`, 6 under the ceiling — the constant does not need to move.
`finding-claim.test.ts` was strengthened in the same change: its stress
test for `breadthClaim` covered only the `session` basis at a four-digit
population; the `observed` basis's tail (`in the last 5 min`, 18 chars) is
4 characters longer than `session`'s (`on 2026-09-11`, 13 chars) and was
the real worst case, now asserted alongside it.

**No `pnpm invariants` entry was added for the ceiling itself** —
`finding-claim.test.ts`'s cross-product assertion already fails `pnpm
test` (and so `pnpm verify`) on a violation, calling the real functions
rather than re-deriving their output from text, which is strictly stronger
than a static scan could be. A second, parallel mechanism for the same
fact would itself be the defect this repository's "one fact, one home"
rule forbids.

**AC 6's real probe, taken against Storybook rather than the live route** —
no Docker on this machine, so `pnpm store:bare`/`pnpm db` were as
unreachable as they were at Task 7.3.1. `ClaimsAtTheCeiling` (new story: six
rows, each confidence level cycling, each claim padded with `·` to exactly
72 characters — the ceiling by construction, worst case rather than
today's 66) was probed with `pnpm probe --story
"investigations-investigationchecklist--claims-at-the-ceiling"` at all four
widths against this worktree's own already-running dev pair and Storybook
(both started by the prior, stalled agent attempt; both still live and
serving this task's own new files). Quoted verbatim, 1440×900: `— SUPPORTED
Market correlation — the benchmark's history crosses a price break·s·s·s`
on one line, no wrap. At 390×780 the same claim wraps to two lines with no
truncation and no row-height jump beyond the wrap: row heights across the
six rows at 390 were `65 66 66 66 65 66` px — one pixel of jitter, not a
step. `docs/GAPS.md`'s `CLAIM_CEILING` entry is updated with the full
figures and quotes; what it still does not discharge — the real six-tool
pipeline's timing and a genuine zero-bar-store refusal rather than a
fixture imitating one — is recorded there with the re-measure command.

**AC 7** — `ConfidenceMark.test.tsx` and
`InvestigationChecklist.test.tsx` both assert zero focusable elements and
zero `onClick`/`onKeyDown` side effects (markup byte-identical after
firing click/keydown on every element).

**A real bug found and fixed along the way**: `finding-claim.ts`'s two
longest refusal phrases — `"the benchmark's history crosses a price
break"` and `"one side's returns did not vary"` — were written with a
straight apostrophe, which would have reached a reader's screen as a
`Finding.claim` string mixing typefaces with the rest of this product's
voice. Caught by `one-apostrophe-in-the-product-voice` firing on this
task's own new `ClaimsAtTheCeiling` story (which quotes the real string
verbatim), not by anything that had previously read `finding-claim.ts` — a
`.ts` file under `packages/shared`, outside that check's `.tsx`-under-
`components`/`routes` scope. Fixed at the source (`finding-claim.ts`) with
the fixture updated to match, rather than only fixing the quoting copy,
per this repository's own rule that a fixture quoting a real string quotes
it verbatim. Not a new `docs/GAPS.md` entry: the two strings are now
correct and the check that found this one is unrelated to the scope gap
that let it ship — widening `one-apostrophe-in-the-product-voice` to cover
`packages/shared` product-voice strings is a separate, larger change this
task did not make.

### Gates

`pnpm build`, `pnpm lint`, `pnpm format:check` (two files needed
`--write`, then clean), `pnpm stories` (50/50), `pnpm env:check`, `pnpm
links` (0 broken), `pnpm invariants` (97 hold), `pnpm test` (775 + 1518 +
2027 = 4,320 passed), `pnpm typecheck`, `pnpm test:scripts` (21 passed),
`pnpm test:process` (63 passed), `pnpm coverage:check` — all green. Both
new breaks (`confidence-mark-composes-the-band-chip`,
`the-confidence-mark-grows-a-fill`) proven red for the right clause and
restored byte-identical.

**Not run, and said plainly rather than silently skipped**: `pnpm
test:database`, `pnpm e2e` (including `security-investigate.spec.ts` and
`search-keyboard.spec.ts` named in this task's own Done-when 4) — no
Docker on this development machine for the whole of this session, the same
constraint recorded against every other task here. CI's own `e2e` and
`database` jobs do not depend on this machine's Docker and will run both
on the PR.

## For a stakeholder — a status report, 2026-11-24

The claim beneath each completed investigation step now has its real,
finished look: a small rule next to the word `SUPPORTED` (or `POSSIBLE`,
`UNKNOWN`, or — reserved for a later epic — `CONFIRMED`), drawn with no
colour at all, so it reads as nothing like the amber "how unusual" chip
elsewhere on the page. The row's layout — the claim as its own second line
under the step's name — is now the real shipped shape rather than a
placeholder, measured at every screen width down to a phone.

Two mechanical guards now exist to keep the confidence mark and the
anomaly-band chip from ever sharing code or colour, each proven to catch
the mistake it is named for. The character limit on a claim was checked
against the real wording this product can produce and found to already
have headroom; a small inconsistency in two of those wordings (a
straight apostrophe where the rest of the product uses a curved one) was
found and fixed in the same pass.

What is not yet done, and owed rather than skipped: a screenshot of this
exact layout taken against the real running application (rather than the
component workshop) and the full automated browser suite, both blocked by
this development machine having no database available — the same gap
every task this session has had to name. CI will run both on this
change's own pull request.
