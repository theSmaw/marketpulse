# Task 7.3.4 — The measured pass, and the sweep

**Status:** Not started
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
