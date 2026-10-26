# Task 5.6.6 — The session-basis composite

**Status:** **In progress — 2026-10-26**
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.5

## Objective

**`/`'s `Unusual activity` has TWO bases and only one of them can hold a
composite today.** `market-unusual.ts` is a two-arm discriminated union: the
`observed` arm computes live, and the `session` arm reads
`session_return_percentiles` through `sessionSection`. That stored row carries
`rank`, `aboveSample`, `sampleCount`, `percent` and two endpoints — **no score,
no band, no factor set.**

The session arm is what runs **out of hours — about 80% of the week by that
file's own header — and permanently on CI.** So without this task the region
would draw a score for a few hours a day and an ordinal the rest of the time:
**two different quantities in one column on different days**, which is precisely
what the two-arm union was built to prevent (_"a process with a stale trailing
window and a process with none must not draw the same region for different
reasons"_), and which contradicts Task 5.6.7's own objective — _so the two
surfaces finally agree about what is ranked._

**The owner chose to store the composite nightly** rather than ship the split.

## What the user can see when this lands

**Nothing.** Task 5.6.7 draws it. This is the **fifth** invisible task in a story
whose Gate 1 said three was the most it would accept — recorded plainly rather
than smoothed over, because the alternative was a region that tells a different
kind of truth depending on the hour.

## Work

- **`0017_session_composite_scores.sql`**, following `0014`'s shape — the
  nearest relative, and the one whose two-table convention (`*` plus
  `*_passes`) ADR 0044's 2026-10-16 amendment asks for. An **empty-table**
  migration: catalogue writes only.
  - **The factor set belongs in the row**, not merely the score. AC 3 says the
    number of contributing factors is part of the score's **identity**, and a
    stored score without its set cannot be ranked under the cohort rule.
  - **The weights and the band floors belong on the PASS row**, for `0014`'s own
    recorded reason about `minimum_sample_count`: a rollback must not leave a
    runner and a reader two values apart. A stored score is **a cache of a
    policy**, and both the weights and the floors carry reversal triggers.
- **The nightly pass** computes the composite for the session it is **for**,
  from the rows `0013`/`0016` already hold, after the existing baselines so it
  reuses the warm heap.
- **The store and the cache**, following `session-percentile-store.ts` and the
  four existing caches. `excess-move-baseline-cache.ts` is the newest and
  carries the `reference_kind` pinning lesson.
- **The `session` arm reads it**, and `sessionSection` ranks by the composite
  with the cohort rule — so both arms answer the same question.
- **Measure what the pass costs**, warm and cold, and how many securities get a
  row. 5.6.2's excess pass was **26.4 s cold, 17.0/19.2 s warm** for all three
  baselines together.

## Done when

1. `0017` applies; a stored composite carries its score, band, factor set and
   maximum, with the weights and floors on the pass row.
2. The nightly pass writes one, measured warm and cold.
3. The `session` arm ranks by the composite, so **both arms answer the same
   question** and the nesting sentence still closes.
4. `pnpm verify` green with its exit code printed, `pnpm test:database` green,
   every new break run.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
