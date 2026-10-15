# Task 5.4.4 — The denominators, the cut, and the third source

**Status:** Not started
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.3

## Objective

**A ranked list looks equally confident whether its input was complete or not.**
This region has **three** populations where breadth and movers have one, and a
figure derived from 60 sessions of stored bars that nothing on `/` can currently
attribute.

## What the user can see when this lands

**The region says what it ranked over and how much of it got past the line** —
and the screen's source note names the **third** kind of data `/` now rests on.

## Work

- **Three populations, two sentences, one builder.** (1) the **501 equities**,
  read never typed; (2) how many were **heard from in the last 5 minutes**; (3)
  how many of those have a baseline **long enough to rank** — a different
  quantity at a different lookback, which 11 securities fail on sample size and
  a further class fails on an unadjusted split. `describeMeasuredSet` unchanged
  for (1)+(2); a **second `MeasuredSet` instance** through the same function
  gives (3) in the same grammar. **This satisfies AC 3 without widening
  `MeasuredQualifier`**, which `Market breadth` and `Movers` both read.
- **The cut** — how many are above the line, not only how many were heard from.
  One home; a second builder is the duplication this repository fails a build
  over.
- **Two refusal kinds that must not read alike**: `Baseline too short to rank`
  and `Baseline crosses an unadjusted price break — not comparable`, verbatim
  from `percentileRefusal`'s existing home. Both are **clauses in the footer**,
  not rows — a refused security given a rank is the over-claim, and a silently
  dropped one is `Movers`' own lesson: the population is part of the claim.
- **A third `dt` on `OverviewSourceNote`.** It has exactly two terms today,
  `Observed prices` and `Closing prices`. The baseline is a **third source
  class** — 60 sessions of stored bars, preferring consolidated **SIP**, while
  the numerator is **IEX** — so `/` would otherwise draw a figure resting on
  data it never attributes. That is invariant 6's own sentence. It goes on the
  **screen note**, not inside the region: the region owns the ranking, the note
  owns provenance, and a region-level feed line is the `BarSeriesPanel`
  duplicate this product deleted.
- **Disclose the coverage bias.** IEX per-symbol coverage runs ~2.1% to
  near-complete and a top-N **selects the tail**, so a sparsely covered security
  enters the ranking only on the minutes it happens to hold an exact pair. No
  criterion covers this. Either the sentence says so or `docs/GAPS.md` carries
  it with a condition — decide, with the owner if it changes what is drawn.

## Done when

1. The two sentences are drawn, from one builder, in the grammar keyed on the
   basis the wire sent, and a browser spec reads them.
2. The region reserves its lines so it is **one height in every state** —
   measured, the claim having cost `Movers` a third line at 390.
3. A guard that exactly one shipped file holds the cut phrase **and** reads
   `tracked` from the wire rather than spelling a number — two conjuncts,
   because a one-conjunct draft of the neighbouring check reported
   `52 invariants hold.` against the defect. Break hand-performed and **proved
   green first** on a region that imports the builder _and_ appends its own
   local template literal: one import, two builders.
4. `OverviewSourceNote` names the baseline's tape and generation date.
5. The coverage bias is disclosed on screen or recorded in `docs/GAPS.md` with a
   re-measure.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
