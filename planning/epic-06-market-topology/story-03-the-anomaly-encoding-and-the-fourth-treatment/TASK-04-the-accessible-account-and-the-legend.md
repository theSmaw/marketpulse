# Task 6.3.4 — The Accessible Account, & the Legend If There's Room

**Status:** **Complete — 2026-11-03** — the sentence states the band
vocabulary and a measured `high`/`extreme` count rather than nothing; a
static legend shipped at 1440/1024/768 and was measured, not assumed, to
not fit at 390 (hidden there, condition stated); `amber-appears-once-in-
the-rail`'s claim was corrected from "exactly one reader" to "exactly two"
rather than merely rescoped, with a new `pnpm break` proving the widened
check; fixing this task's own real consequence — a now-false purity
assumption in `overview-degraded-grid.spec.ts` — took more of the task
than the sentence itself did.
**Story:** [6.3 The Anomaly Encoding, & the Fourth Treatment a Canvas Needs](STORY.md)
**Depends on:** 6.3.3

## Objective

A canvas has no accessible content of its own, and after Task 6.3.3 the
graph's one sentence is the _only_ account a non-sighted reader gets of the
fact that it now encodes something beyond structure. This task writes that
account, and gives sighted readers a key to the vocabulary if the region has
the vertical room for one.

## What the user can see when this lands

**A screen reader gets a real account of the encoding** — the band
vocabulary, and how many securities are in the bands that matter. **Sighted
readers may get a static key** naming the four bands, if `pnpm probe` shows
the room without pushing the sector-label or elevated-ring fit-scale
thresholds.

## Work

- **`topologyDrawnSentence` gains its new content**, in outline (final
  wording is a copy decision, held to these constraints):
  1. Keep the structural clause (sectors, benchmark ETFs, the broad market
     at the centre) — unchanged from Story 6.2.
  2. One clause naming the quantity: each equity also carries how unusual
     its recent behaviour is, on this product's four-band vocabulary —
     name the bands.
  3. One clause of counts for `high`/`extreme` only — the two bands that
     answer "where is it clustering." Never restate `Unusual activity`'s
     own cohort/population sentence.
  4. Point once to `Unusual activity` for the ten named securities. Say it
     once and stop — ADR 0029's one-fact-one-home rule.
  5. The honest-nothing clause where nothing is scored (CI's permanent
     state, and the first ~46s of a cold load) — distinct wording from "the
     structure is drawn but nothing is scored yet," not a silent gap.
  - **No live region.** The band set changes at feed cadence; the sentence
    stays current when read rather than announced when it changes — same
    decision Story 6.2 took for the structural sentence, restated rather
    than re-argued, with its own reversal trigger unchanged (the first
    change a reader must be told about without asking).
  - **Never states the raw score** (AC 8) — band words only.
- **A legend, gated on `pnpm probe`.** If the region's content box has the
  vertical room (measure against the real boxes — 998×425 at 1440 down to
  308×425 at 390 — without lowering the fit scale below the sector-label or
  elevated-ring thresholds Task 6.3.2 derived): a static, non-interactive
  key in the region's existing head slot, following `Unusual activity`'s
  `Top 10 · all extreme` precedent rather than inventing a new block. No
  focusable children, no new tab stop, never a filter control (that is
  Story 6.8's). **If there is no room, defer it explicitly** — state the
  measured shortfall in this task's own record and hand the condition to
  whichever later story first changes the region's chrome height, rather
  than silently dropping it.
- **`amber-appears-once-in-the-rail`'s own claim gets corrected.** Its check
  counts `.module.css` files; the topology reads the same ramp through
  `getTokens()` in TypeScript (`palette.ts`). Either widen the check's
  clause to cover palette token readers, or give the invariant's own claim
  text a dated amendment saying it is `.module.css`-scoped and naming the
  topology as the documented exception — whichever makes the claim true
  rather than merely unfalsified. A check you add or correct owes a
  `pnpm break` entry.

## Done when

1. `topologyDrawnSentence` states the band vocabulary and a `high`/`extreme`
   count, never a raw score, with no live region.
2. A legend exists if `pnpm probe` shows the room; if not, the shortfall is
   measured and stated, with an owner and a condition.
3. `amber-appears-once-in-the-rail` either covers the topology's token
   reads or carries a dated amendment saying why it does not, with a
   `pnpm break` entry proving whichever is true.
4. A component test asserts the sentence's content (band words present, no
   3+ digit numbers that could be a raw score, no cohort restatement).
5. `pnpm build && pnpm lint && pnpm format:check && pnpm test` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-11-03

**`topologyDrawnSentence` gained a second function, `topologyAnomalySentence`,
rather than being rewritten in place.** The original stays exactly what it
was (the structural clause, still the initial React-rendered text before any
batch has ever arrived); the new function extends it with the band
vocabulary and the `high`/`extreme` counts, or — one of exactly two
branches, never a third, since the two producers in `anomaly-treatments.ts`
never mix "unscored" with a real band — the honest-nothing clause. Band
words: `"normal through elevated and high to extreme"`. Counts:
`"${high} are high and ${extreme} are extreme."`, read off the SAME
treatment map the renderer draws from, never re-derived. Never `elevated`'s
own count (STORY.md note 2: usually close to half the scored universe,
would read as an alarm) and never the raw score (AC 8). Points to
`Unusual activity` once for the ten named securities, never restates its
own cohort sentence (`"Of the N companies we track…"`).

**Written into the DOM imperatively, not through a new React prop or a
live region.** The `<p id={sentenceId}>` keeps its original React
children exactly as Story 6.2 shipped them — this is load-bearing, not
incidental: because that JSX expression is a pure function of a value
stable across re-renders, React's own reconciler never finds a reason to
touch the node again after the first commit, so a SEPARATE, new function
(`applyAnomalyBands`, called from both `MarketTopologyHandle.setBands` and
the `bands` prop's own effect — the exact two callers Task 6.3.3 built) can
safely overwrite `sentence.current.textContent` on every batch without
React fighting back and reverting it. This is what let this task avoid
adding a `bands`-shaped prop to `MarketTopology` for the sentence's sake,
which would have reopened the declined-memo-boundary question Task 6.3.3
had just closed by construction.

**One real closure-staleness bug caught before it shipped, not found by a
test.** The first draft gave `useImperativeHandle`'s factory `[]` as its
dep array (matching Task 6.3.2/6.3.3's own code) and had it close over
`topology` directly — correct for `resetView`, wrong for the new
`setBands`, because a stale `topology.graph` from the FIRST render would
survive a later universe retry and rebuild the sentence against the wrong
cluster count. Fixed by giving the factory `[topology]` instead (recreated
only on a genuine universe reload, which is rare) rather than adding a
`topologyRef`-syncing effect — caught by reasoning through the retry path
while writing the docblock, before any test was run.

**A static legend, measured with `pnpm probe` rather than assumed — and the
measurement found a real constraint, not a rubber stamp.** `normal ·
elevated · high · extreme`, `Unusual activity`'s own `.bound` micro-label
treatment copied exactly (same composed class, same ink, same
`white-space: nowrap`), placed in the region's `meta` slot beside `Reset
view`. At 1440/1024/768 it fits with the content box completely unchanged
(998×413 / 570×413 / 686×413, identical before and after — confirmed by
re-probing, not inferred). **At 390 it did not**: `meta` (351 px — the
legend's 227 plus the button's 116 plus an 8 px gap) exceeds the 340 px
header, which measured as the title collapsing to 0 px width, the header
growing 59 → 69 px, and the content box losing exactly that 10 px
(413 → 403). Hidden there with `@media (width <= 390px)`, per this task's
own instruction to defer explicitly rather than silently drop: the
shortfall and its condition are stated in the CSS itself (_the first story
that grows this region's header at 390, or narrows the Reset view control
enough to leave room beside it_).

**`amber-appears-once-in-the-rail`'s claim corrected from "exactly one" to
"exactly two", with the check's own protective power widened to match
rather than narrowed to avoid it.** The alternative the task offered —
a dated amendment saying the check is `.module.css`-scoped and naming the
topology as an undocumented exception — was rejected: it would have left
the check **blind** to a THIRD TypeScript reader appearing later, which is
exactly the gap `styles/tokens.ts`'s own docblock predicted before Task
6.3.2 made it real. Instead, `check-invariants.mjs`'s check gained a second,
parallel scan over `.ts`/`.tsx` files for `tokens["--anomaly-…"]`-shaped
reads (the literal syntax `palette.ts` uses), anchored on `palette.ts` the
same way the original is anchored on `AnomalyBadge.module.css` — so a THIRD
reader, anywhere, still fails the check. The pattern deliberately does not
match `tokens.ts`'s own `TOKEN_NAMES` array entries (which name the tokens
without reading them), confirmed by grep before writing it. A new
`pnpm break` entry (`a-second-typescript-file-reads-the-anomaly-ramp`,
planted in `AbnormalMove.tsx`, which has no real `tokens` variable at all —
the break only needs the TEXT pattern, since `check-invariants.mjs` scans
source text rather than executing it) proves the new clause actually
catches the defect it is written against; the two pre-existing CSS-side
breaks were re-run and still pass.

**One real, substantive regression found and fixed — not a flake, and
larger than the feature itself.** `pnpm e2e overview-degraded-grid.spec.ts`
failed at all four widths on the first run after this task's changes, with
a real assertion failure rather than a timeout: that file's own Task
6.2.4-era claim — "the topology region is a pure function of the universe
request, so all fifteen `aggregate-only` rows must read byte-for-byte
identical" — went false the moment `topologyAnomalySentence` made the
sentence depend on whether an overview frame has ever arrived. Investigated
and fixed (by a forked agent, given the file's own size): every state in
that grid gets its own fresh page, so the true split is not "which row ran
first" but "did THIS row's own fixture ever call `serveFeed` with an
`overview` at all" — true for fourteen of the fifteen aggregate-only rows,
false for exactly one (`02-no-aggregate-after-the-floor`, "the terminal
no-frame state"). The assertion is now two groups rather than one: the lone
row must never carry the fallback clause, the other fourteen must carry it
and agree with each other byte-for-byte (none of this file's fixtures ever
construct a real `anomalyBands` section, so AC 4's fallback is uniform
across all of them). The fix is entirely within the spec's own
expectations — nothing in `MarketTopology.tsx`, `MarketOverview.tsx` or
`anomaly-treatments.ts` changed for it, because the NEW behaviour is
correct and intended; the OLD assumption was what needed correcting.

### Gates

`pnpm --filter @marketpulse/frontend test MarketTopology` → 16/16 (13 + 3
new). `pnpm --filter @marketpulse/frontend typecheck` and
`pnpm --filter e2e typecheck` → exit 0. `pnpm lint` → exit 0.
`pnpm format:check` → exit 0. `pnpm build` → exit 0. `pnpm test` → shared
667/667, backend 1344/1344, frontend 1729/1729. `node scripts/check-
invariants.mjs` → 80 hold. `pnpm break a-second-typescript-file-reads-the-
anomaly-ramp`, `pnpm break the-score-is-tinted-to-match-its-chip`,
`pnpm break the-band-chip-puts-its-ramp-in-the-ink` → all three plant, go
red on `amber-appears-once-in-the-rail` specifically, and restore
byte-identical.

`pnpm e2e` on the five specs this task touches or could have broken —
`overview-market-topology.spec.ts`, `overview-market-topology-anomaly-
bands.spec.ts` (all 3), `overview-degraded-grid.spec.ts` (all 4 widths,
after the fix above), `overview-region-order.spec.ts` (both widths it
runs), `landing-route.spec.ts` — **all green**, confirmed in two separate
runs (once before the degraded-grid fix, showing the real failure; once
after, showing it resolved). A full `pnpm e2e` run was attempted twice more
as a final sweep and was killed both times by this machine's own memory
pressure (a pre-existing, session-wide condition — confirmed via `uptime`
and a count of ~33 stray Chromium/Playwright processes dated across the
prior month and a half, none from this session, already recorded in Task
6.3.3's own completion record) rather than by anything in the suite
itself. The five directly-affected specs were independently confirmed
green regardless; the full-suite sweep is left to CI's own clean runner.

## For a stakeholder — a status report, 2026-11-03

A screen reader now gets a real account of what the graph encodes, not just
that it exists: it names the four-band vocabulary, states how many
securities are currently in the two bands worth a closer look, and says
plainly when nothing has been scored yet rather than leaving a reader to
guess. Sighted readers get a small, permanent key next to the graph's
title — `normal · elevated · high · extreme` — at every screen width except
the narrowest, where it was measured to genuinely not fit without breaking
the header; that gap is recorded as something a later change can pick up
rather than silently dropped.

One correctness guard in this codebase — "the amber colour used for
warnings appears in exactly one place" — was updated to reflect that the
new graph ring is now a second, deliberate place it appears, in a way that
still catches a third, accidental one if it ever shows up.

The most significant finding this task produced wasn't in the task's own
brief: making the graph's sentence aware of live data broke an existing,
carefully-built automated check elsewhere in the test suite that had
encoded an assumption from two tasks ago — that the graph's accessible
text never changes based on anything but the list of tracked securities.
That assumption was true until this task and needed to be updated to the
new, correct reality rather than the new feature being held back to avoid
disturbing it. That update is the single largest piece of work in this
task's diff.
