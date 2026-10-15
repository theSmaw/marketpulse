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

## Amended by Task 5.4.2 — 2026-10-15: what the counts are, and the one equality your sentence rests on

**The section ships three counts and five refusal counts, measured and
shipping.** `tracked` (read, never typed), `eligible` (heard from inside the
cutoff **and** holding a pair exactly the span apart), `scored` (also holding a
comparable baseline). They are **nested, not parallel** — `eligible ⊇ scored` —
and that nesting is the only reason one sentence can carry them honestly.

**Five refusal counts, in two closed vocabularies**: `nothing-observed`,
`no-earlier-endpoint`, `no-basis` for the figure; `too-few-samples` and
`split-discontinuity` for the comparison.

**There is no sixth, and that is a decision rather than an omission.**
`comparableBaseline` deliberately collapses _no baseline row at all_ into
`too-few-samples` with `sampleCount: 0` — Story 5.3 recorded that "`0` and _too
short_ share a word on purpose". A third count would either add a vocabulary
member, reversing that decision, or put a second home for the distinction in
this pass. Accepted at 5.4.2's review: _no row at all_ versus _row too short_ is
not a distinction a reader can act on, whereas _too short_ versus _crosses a
split_ is.

**The equality your sentence depends on, with its exact bound.**
`eligible − scored` equals the sum of the two comparison refusals **in every
reachable state, but not provably in every state**: `returnPercentileOf` also
refuses a stored distribution that is not 101 points, or a non-finite magnitude,
**with no word at all**. Migration `0013`'s constraint forbids the first and the
division forbids the second, so neither is reachable — but **do not write a
sentence that asserts the subtraction is exhaustive.** State the counts, or
state the cut; do not invite a reader to derive one from the others. Task 5.4.2
asserts the equality over the reachable states and deliberately did not invent a
refusal word no reader could act on.

**And one narrowing inherited from the intersection, worth knowing before you
write the denominator.** A security with a live bar inside the cutoff but **no
stored close** is never scored, because the shared pass already excludes it
(`change.percent === null`). So `eligible` is already narrower than _heard from
in the last five minutes_ in a way the phrase does not convey — the wording has
to survive that.

**Out of hours there is nothing to count.** Task 5.4.2 gates the pass on
`basis === "observed"` and reports `eligible: 0`, because `eligibleMoves`
answers on the `session` basis when the regular session is shut and a pass that
ignored the basis would rank **yesterday's 15:55→16:00 pair as unusual activity
right now, for ever** (eviction in `trailing-window.ts` is relative to each
security's own newest bar). So until Task 5.4.5 writes the nightly row, the
region is empty for ~80% of the week and your sentence has to be honest at zero.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
