# Task 5.7.5 — The sideways hand-off, and the seventh data point

**Status:** Not started
**Story:** [5.7 The Rehearsal, the Sweep, & Epic 5's Close](STORY.md)
**Depends on:** —

## Objective

A constraint one story measures for another lives in a document the **owning**
story does not own, and nothing about a close crosses that boundary. The record
of previous runs reads **1, 6, 3, 6, 2, 8**; the walk at Gate 1 makes it
**1, 6, 3, 6, 2, 8, 7**.

**Seven missing of ten recipients walked.** The point of the number is the
shape, not the score.

## What the user can see when this lands

**Nothing.**

## Work

Write each missing constraint into the recipient's **own** file, in words that
story can act on — never a link back, because a pointer is what a reader follows
when they already know to look, and the whole failure is that they do not.

- **Epic 7 — PRESENT but POISONED, so it counts missing.** Both named
  constraints are there and correct. But `EPIC.md:219` carries the quiet-day
  falsehood as a product-integrity claim (Task 5.7.3 corrects it; do not collide),
  and `:208-213` tells Epic 7 to _expect to find already written_ four functions
  — `calculate_return_percentile`, `calculate_volume_ratio`,
  `get_market_breadth`, `compare_securities`. **Verified: zero implementations.**
  The two matches for the first are comments quoting the spec. The shipped names
  are `returnPercentileOf`, `excessFactorAnswer`, `volumeFactorAnswer`,
  `compositeAnomaly`, `scoreAnomaly`, `excessMoveReference` — and
  `calculate_volume_ratio` has no implementation producing a rankable ratio at
  all, because the volume factor is a stated absence. Give Epic 7 the real names.
- **Epic 9 — the chart's lane geometry.** Story 5.1's canvas first drew the
  anomaly lane _below_ the plot, in the band `--chart-filing-lane: 14px` already
  occupies; the correction moved it to a 16 px lane inside the plot's top
  padding. The decision is in `VISUAL-LANGUAGE.md:1057-1081` and Story 5.6's
  `STORY.md:388` — neither is a document Epic 9 reads. `grep` for `lane` in its
  `EPIC.md` returns nothing.
- **Epic 13 — `0015`'s tape in the key.** Epic 13's existing section glosses the
  family as "all four keyed by the session it is FOR with its window-end column
  named `observed_at`". `0015_volume_baselines.sql` is `unique (security_id,
observed_at, feed)` — **the only table in the family where the tape is a key
  column**, and its own migration comment says the tape choice carries a reversal
  trigger and can flip. A plugin narrowing `observed_at` covers the temporal half
  and leaves the replay with no stated rule for which tape to read. Epic 13 has
  **no section from Story 5.5 at all**.
- **Epic 14 — Story 5.2's explicit `Owner: Epic 14` line.** `story-02-…/STORY.md:266-268`:
  arm 2's calibrator inflation is non-monotonic in the gap (2.75–3.26× at 8,824 ms
  against 18.0–19.4× at 3,727 ms) and gap and order were confounded. Unpropagated
  since 2026-10-14. **This is the worst miss in the set** — it is the shape the
  prescribed grep finds most easily, and it bears on the 2.29×-against-4.38× pair
  `CLAUDE.md` cites as authority that the calibrator does not divide out.
- **`planning/EPICS.md`** — a second home for the exit criterion that missed
  Task 5.5.5's correction. Task 5.7.3 writes the rewrite; record here that the
  recipient has no `Handed here by` convention and so nothing fills it.
- **`PRODUCT_SPEC.md` §9 and §12** — Task 5.7.4 amends them; recorded here
  because they are recipients rather than merely stale documents.
- **`SecurityExplorer.tsx`** — the recipient is the shipped product and the
  reader is a user. Task 5.7.4 changes it.
- **Epics 10, 11, 12 and 15 are named ZERO times in Epic 5.** Not scored as
  misses because no constraint was found and then lost, but three look real and
  are judgement calls to take in writing rather than by silence. **Epic 10** is
  where a model first touches these numbers, and the brand on `AnomalyScore`
  **dies at `JSON.parse`** — the only thing between an LLM and an invented score
  across that boundary is `readAnomalyScore` re-adding the published
  contributions, which is invariant 1's strongest mechanism and Epic 10's file
  does not know it exists. **Epic 11** is the listening pass's deadline and Epic 5
  added three unanswerables. **Epic 12** is not told Epic 5 added five derived
  tables (`0013`–`0017`).

**Record the count and the shape.** Four of the seven are recipients that are
**not epics** and therefore have no `Handed here by` convention — but Epic 14's
miss refutes the comfortable reading of that, because it is an explicit `Owner:`
line in a `STORY.md`. The transferable lesson, which Story 5.6's own close
already stated: the hand-off that travels is the one written **where the
measurement was taken**, not at the close.

## Done when

1. Each of the seven is written into its recipient's own file in actionable words.
2. The Epic 10/11/12 judgement is taken in writing, either as a hand-off or as a
   recorded decision not to make one.
3. The count — 7 of 10 — and the method are in the record, with the previous six
   data points, and the shape finding is stated.

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
