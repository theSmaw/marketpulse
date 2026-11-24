# Task 7.3.4 — The measured pass, and the sweep

**Status:** Complete — 2026-11-24. AC 5b's photograph could not be taken
(no database on any machine this story was built on, and no screen yet
puts the two chips in one row — Epic 8's). The mint-site CLAUDE.md
write-up was already mostly done by Task 7.3.1; this task added the one
missing caveat (the forgeable `InvestigationId` variant not to copy).
`PRODUCT_SPEC.md` §33's amendment was also already done by Task 7.3.1.
`INVESTIGATIONS.md` gained a new §12 for Tasks 7.3.2–7.3.4. The grep sweep
found one real discharge worth recording: Task 7.2.4's "no reader has ever
seen a step's own outcome" gap is now genuinely closed (implicitly, by a
claim's presence or absence) and is marked so in `docs/GAPS.md`.
**Story:** [7.3 Findings, Evidence, & Confidence](STORY.md)
**Depends on:** 7.3.1, 7.3.2, 7.3.3

## Objective

Close out AC 5b (the one half of the confidence-mark/band-chip
distinction no check can see), document the mint-site pattern this story
makes a third use of, and do the sweep every story owes: `docs/GAPS.md`,
the subject document, and `PRODUCT_SPEC.md` §33's dated amendment for
this story's deviation from its literal event order.

## What the user can see when this lands

Nothing new — this task is measurement and documentation, named as such.

## Work

- **AC 5b**: with a populated store carrying a real composite score (so
  `Abnormal-move indicators` draws a real band chip above a real
  checklist), photograph both chips together at all four widths, in
  greyscale. Confirm the confidence mark and the band chip are
  distinguishable by shape/stroke alone, with no reliance on hue —
  this repository's own precedent (four greyscale simulations once
  passed against a chart that was wrong) means "I looked and it seemed
  fine" is not enough; take the screenshots and look at them. Record the
  figures in this task file. Add a `docs/GAPS.md` entry for the
  re-measure condition (the first screen that draws both in one row —
  Epic 8's).
- **The mint-site convention**: add a short section to `CLAUDE.md`'s
  TypeScript conventions (about six lines) describing the brand +
  non-empty-tuple + two-mint-sites pattern now used at `AnomalyScore`,
  the five analytical-tool `Reading` types, and `Finding` — pointing at
  `composite-score.ts`'s own fuller argument rather than restating it.
  Note the one variant **not** to copy (`investigation.ts`'s
  `__brand: "InvestigationId"` string-literal shape, which is forgeable).
- **`PRODUCT_SPEC.md` §33**: a dated amendment recording that this
  story's `FINDING_CREATED` carries its evidence inline and
  `EVIDENCE_ADDED` is not emitted — the literal event-by-event order the
  section lists is not what shipped, and the amendment says why, without
  rewriting the section's own text.
- **`INVESTIGATIONS.md`**: amend with this story's account — the
  `Finding`/`Evidence` types, the wire deviation, the confidence-mark
  decision, what's now reachable (a real claim per step) and what still
  isn't (the evidence panel, Epic 8's).
- **Confirm every dated correction named across Tasks 7.3.1–7.3.3 landed**
  — grep for "Story 7.3" across the docs this story touches, same
  discipline Task 7.2.7 used.
- **`CLAUDE.md`'s Current state**: a short paragraph for Story 7.3,
  following Story 7.2's own, once this task closes.

## Done when

1. AC 5b's screenshots exist, are described in this task's record with
   the verdict stated plainly, and the `docs/GAPS.md` entry is in place.
2. `CLAUDE.md`'s TypeScript section carries the mint-site convention.
3. `PRODUCT_SPEC.md` §33 and `INVESTIGATIONS.md` carry their amendments.
4. Every dated correction from Tasks 7.3.1–7.3.3 is confirmed present by
   grep, reported in this task's record.
5. `pnpm verify` is green.

---

## What was done — 2026-11-24

**AC 5b — could not be taken, and the reasons are recorded rather than
worked around.** Two independent, compounding blockers: no Docker on any
machine this story was built on, so `AnomalyBadge` never draws a real band
at all (CI's and every fresh store's own permanent `0 of 3 factors` state
renders no chip); and no screen in this product yet draws the two
components in **one row**, which is AC 5b's own literal word —
`/securities/NVDA` stacks `InvestigationChecklist` then `AbnormalMove` as
vertical siblings today, roughly 12px apart, and Epic 8's evidence panel
is the first surface that will put them in a row. What was checked
instead, read directly from both components' own stylesheets rather than
photographed: `AnomalyBadge` draws a fixed-`min-width` rectangular box in
every state (filled for `elevated`/`high`/`extreme`, bordered for
`normal`); `ConfidenceMark` draws no box, no border and no `min-width` at
all — a real, `pnpm invariants`-enforced structural fact, but reasoned
from text rather than confirmed by looking at a rendered screen, which is
what the criterion actually asks for and this repository's own standing
greyscale lesson says not to substitute for. `docs/GAPS.md` carries the
full account, owned by Epic 8, with the nearer re-measure (the stacked
arrangement, on a populated store) stated as a still-unwatched interim
step.

**The mint-site convention**: `CLAUDE.md`'s TypeScript section already
carried the full write-up from Task 7.3.1 (verified accurate: `grep -rln
"const brand = Symbol(" packages/shared/src apps/backend/src` returns
exactly eight files — `composite-score.ts`, `finding.ts`, and six
`tool-*.ts` files — matching the "eight sites in three variants" claim
exactly). What was missing and is now added: a short paragraph naming
`investigation.ts`'s `InvestigationId`/`StepId` as the one variant **not**
to copy — a string-literal `__brand` tag rather than a real `Symbol`,
forgeable by an ordinary type assertion anywhere, deliberately accepted
because an opaque id that only round-trips through a URL and a wire frame
was never at risk of the defect the four rules exist to forbid.

**`PRODUCT_SPEC.md` §33**: already carried its dated amendment from Task
7.3.1 in full — no action needed, confirmed by reading the section rather
than assumed.

**`INVESTIGATIONS.md`**: gained a new `## 12. Story 7.3, Tasks 7.3.2–7.3.4`
section (five subsections: the confidence mark's own design reasoning,
second-press persistence and the `stale` flag, the live-region summary,
the `<ul>`/`<li>` restructuring, and what is owed), and §0's own bounding
sentence gained a fourth dated amendment recording that "no `Finding` or
`Evidence` rendered on screen" is now false for `Finding` (and still true
for `Evidence` itself, which is Epic 8's).

**The grep sweep for "Story 7.3"** across `docs/`, `planning/` and
`CLAUDE.md` (excluding this story's own directory), re-taken AFTER this
task's own edits rather than before (`grep -rn "Story 7\.3\b" docs/
planning/ CLAUDE.md --include="*.md" | grep -v ".../story-03-.../"`):
**32 lines across 9 files** — a figure that includes this task's own new
references (the `CLAUDE.md` Current-state paragraph and the `GAPS.md`
entries just written), so it is not a count of what existed before this
task started. All but one of the pre-existing references are historical
forward-references ("the surface that would draw one is Story 7.3's by
design") that remain accurate as dated records and need no edit — this
repository's own rule that a story file records what was true when it was
written. **One real discharge was found and recorded**: Task 7.2.4's GAPS
entry ("no reader
has ever seen a step's own outcome") named its own re-measure (`XLK`'s
checklist against an equity with a thin window, "byte-identical today")
and its own condition ("the first surface that draws a step's own
outcome — Story 7.3 by intent"). That condition fired: an `inapplicable`
step now draws a bare tick with no second line, while a `refused` step
draws the tick **and** a claim sentence — the two are no longer
byte-identical. Marked discharged in `docs/GAPS.md` with the verified
fact and an honest caveat (the distinction is implicit — a line present
or absent — rather than an explicit word, and whether that reads clearly
to someone who has not read this document is unconfirmed, the standing
screen-reader item's own question arriving again).

**`CLAUDE.md`'s Current state**: a new paragraph for Story 7.3, following
Story 7.2's own, covering what shipped, the `pnpm invariants` count (97),
the real wire bug found and fixed (the `INVESTIGATION_FAILED` decoder
gap), and what no machine or person has seen.

### Gates

`pnpm build`, `pnpm lint`, `pnpm format:check`, `pnpm stories` (50/50),
`pnpm env:check`, `pnpm links` (0 broken), `pnpm invariants` (97 hold,
unchanged — this task is documentation only), `pnpm typecheck`, `pnpm
test` (775 + 1518 + 2039 = 4,332 passed, unchanged from Task 7.3.3's own
count), `pnpm test:scripts` (21 passed), `pnpm test:process` (63 passed),
`pnpm coverage:check` — all green.

**Not run**: `pnpm test:database`, `pnpm e2e` — no Docker on this
development machine for the whole of this session, the same constraint
named in every task's own record this story carries.

## For a stakeholder — a status report, 2026-11-24

This task closes Story 7.3 with documentation and one measured attempt
rather than new product behaviour — nothing changed on screen. Two
things of substance happened: a real, previously-open gap was confirmed
discharged by this story's own earlier work (a reader can now tell a
"we will never answer this" step apart from a "measured, here's the
figure" step, by whether a sentence is there), and one acceptance
criterion (comparing the new confidence mark side by side with the
existing anomaly band chip, by eye, in greyscale) could not be measured
at all on this development machine — for two separate reasons, both
honestly recorded rather than argued around, with an owner and a
re-measure method.
