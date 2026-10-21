# Task 5.6.2 — The excess-move baseline, and the factor in the backend

**Status:** Not started
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.1

## Objective

**The relative-move factor cannot be scored where it lives, and it has no history
to be a percentile of.** Both are blockers and both are this task's.

**It lives in the wrong process.** `apps/frontend/src/market/relative-performance.ts`
builds all three moves and both differences from figures already on the overview
frame — its own header says _"Nothing here fetches, and nothing here is a second
join"_, which is correct for a **drawn** figure. A **scored** factor cannot live
there: invariant 1, and ADR 0038's rejected alternative _"compute the aggregate in
the browser"_ was refused by the owner on the stated grounds that **"Epic 5's
scores cannot live in a browser."** ADR 0038 decision 2 is the precedent for the
move — `changeFromClose` went to `packages/shared`, _one implementation, two
processes_.

**And it has no distribution.** Migrations stop at `0015`. A percentile of the
excess move needs 60 sessions of `|excess|` per security, and the owner's Gate 1
answer makes this the story's second scored factor — so this task builds it.

**The cheap part, which is why this is a task rather than a story:** both legs are
already in `market_bars` and the machinery is already written. `return-baseline.ts`
computes 101 breakpoints over a 60-session pooled sample with a derived minimum
and a split guard; this is the same pass over a **differenced** series.

## What the user can see when this lands

**Nothing.** Task 5.6.4 is the task that pays this off. What changes is that the
excess move becomes a figure the backend produces and a distribution the store
holds.

## Work

- **`0016_excess_move_baselines.sql`**, an empty-table migration — a catalogue
  write, no heap pass, no validated constraint, so the 120 s / 10 MiB/s
  arithmetic does not bind. **Prefer a new table to an `ALTER`** on a populated
  one; `session_return_percentiles` has no live per-minute writer but an
  `ACCESS EXCLUSIVE` lock with no `lock_timeout` set anywhere in this repository
  is still a lock.
  - **Follow `0013`'s shape**, and **the companion `*_passes` row is owed** —
    ADR 0044's 2026-10-16 amendment says the generalisation is worth more than
    the table, and this is its third application.
  - **The reference goes in the key.** The owner chose the **sector ETF**, and
    that choice carries a reversal trigger, so a reference change against a
    reference-blind key would **rewrite the meaning of every stored row with
    nothing recording that the meaning changed** — ADR 0045 §3's argument
    pointed at a new target, exactly as the tape went into `0015`'s key.
- **The pass**, in `scripts/compute-baselines.mjs` after the return baseline, so
  it reuses the warm heap. Measure it: 5.3's return pass is **11.78 s warm,
  20.67 s cold** over 48.8 M bars, and this one reads two series per security.
- **Two refusals this factor owns, and both are inherited rather than invented.**
  - **`mixed-basis` must be inherited, not re-derived.** `relative-performance.ts`
    refuses the subtraction when the two moves were measured from different
    closes, and that state is reachable **every day between the overnight
    backfill and the next bell**. A scored factor that silently scores a
    mixed-basis difference produces a well-formed, correctly-coloured number
    that is wrong in exactly the way the region above it declined to be.
  - **The split guard runs on BOTH legs.** `return_baselines`' guard covers the
    subject; a reference that splits poisons the excess identically and is read
    from a second series. It refused **5 of 516** on the real store for one leg.
- **Two structural absences, which are a third kind and not a refusal**:
  `NO_SECTOR` (a broad-market fund has no sector — 4 of 516) and `IS_BENCHMARK`
  (a sector ETF **is** its own benchmark — 11 of 516). These are **not
  applicable** rather than unavailable, and the word for that does not exist in
  this product yet. Decide it here and carry it into the explanation.
- **The percentile is of `|excess|`**, never the signed excess, or the composite
  scores higher for falls than rises — AC 4, forbidden in terms. `behind` /
  `ahead` stays in the **drawn** region, untinted, in percentage points.
- **`CAP_WEIGHTED_CLAUSE` must survive the move**, and
  `one-home-for-the-cap-weighting-clause` fails the build on a second copy.
  The owner's choice is the ETF **with the bias stated on screen**, so the
  shipped sentence is already right — do not write a second one.
- **Measure the distribution**, because Task 5.6.3's band boundaries are derived
  from it rather than guessed. Report the counted `n` per security (min, median,
  max), the refusal counts by kind, and how many securities clear the minimum.
- **Epic 14's backend condition fired once already** (Task 5.4.2, at 0.474–0.509
  ms p50 a batch and 946–1,015 ns a security). This task adds to that path, and
  Epic 14's file asks the next story that changes it to **re-take the whole arm
  with a control rather than add a term to an estimate.** Calibrator in its own
  loop; load average read **before** the run; worker count stated.

## Done when

1. `0016` applies, with the reference in the key and a companion pass row.
2. The pass computes and persists breakpoints, with its cost measured warm and
   cold, and its refusals counted by kind on the real store.
3. The scored factor is produced in the backend; nothing scored is computed in a
   browser; `relativePerformance`'s drawn figures are unchanged.
4. `mixed-basis` is inherited and asserted, and both legs are split-guarded.
5. The distribution is recorded as figures, for 5.6.3's boundaries.
6. `pnpm verify`, `pnpm test:database` green; the per-batch arm re-taken whole.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
