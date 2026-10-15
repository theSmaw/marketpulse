# Task 5.4.2 — The scored pass, and the frame section

**Status:** Not started
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.1

## Objective

Nothing in this product computes a percentile for more than one security at a
time. This task computes it for the **501 equities** every applied batch, ranks
them, and puts the answer on the aggregate frame with the factor values behind
each row.

## What the user can see when this lands

**Nothing.** The frame carries a new section and no surface reads it. Task 5.4.3
draws it. This is the one task in this story with no visible outcome, and it is
a layer rather than a slice on purpose: the alternative is drawing a region
against a frame section invented in the same change.

## Work

- **A second pass plus an intersection — never a split.** There is one call site
  of `eligibleMoves`, pinned by `breadth-is-counted-over-the-equities-alone`.
  This region's predicate is different (a pair exactly five minutes apart in the
  trailing window, **and** a comparable baseline), so it is computed downstream
  and leaves breadth's and movers' array **byte-identical**.
- **Reuse `BREADTH_WINDOW_MINUTES` as the freshness cutoff**, read and never
  spelled, so `windowMinutes` stays one number per frame and
  `one-home-for-the-observation-window` stays green. The **60-session lookback
  ships as section data** read off the cache's own generation, for
  `windowMinutes`' own reason. ADR 0043 is why these are different quantities.
- The section, with each nested object owing its own field map (ADR 0031): the
  rows, plus `tracked` (**read, never typed** — `the-population-is-never-a-literal`),
  `eligible`, `scored`, `windowMinutes`, `spanMinutes`, the baseline's feed,
  session, lookback and minimum sample, and the **refusal counts** split by kind.
- **A refused security is not a row.** No baseline, baseline under 2,500
  samples, split-refused, no window, nothing observed: omitted entirely and
  counted in the difference between `eligible` and `scored`. **No `?? 0`, no
  sentinel, no rank.** A `null` under `"number"` reaches the wire as **`0`** — a
  plausible 0th percentile — so the schema must not admit one.
- **The tie-break is ticker ascending** after the ordinal descending, declared
  and reproducible. Scores are integers over 501 securities so ties are routine;
  two equal at displayed precision must never swap.
- **Price Epic 14's backend condition and record it as FIRED.** It is the first
  computation in that callback deriving a figure **per security**, and it fires
  on every shape — do not look for one that avoids it. Arithmetic before
  measurement: ~60–72 ns a return (from 30.8–37.1 µs for 516 in one batch), a
  map hit, and a bounded ≤101-step walk, plus Story 4.5's measured
  0.118–0.123 ms top-N, giving **~0.25–0.6 ms a batch** against the current
  path's 1.521 ms p50. **Then measure it**, with the two caveats stated
  separately: a gapped Node sample inflates and the calibrator **does not
  divide out**, and **the calibrator goes in its own loop** or the arm measures
  itself (7.2× artefact, Task 5.2.5).
- **ADR 0040 amended** (dated, not rewritten): the primary trigger fired, and
  what did **not** fall due — the pass was not split, `windowMinutes` is still
  one per frame, the `observedAt`/`computedAt` pair still describes the frame.
  **ADR 0038 amended**: the frame-grain trigger **evaluated and unfired**, with
  `lastCloses` as the precedent.

## Done when

1. The section is on the frame for the 501 equities, with the factor values, and
   a unit/`app.inject()` test covers each refusal kind.
2. **Byte count measured rather than estimated**, at the row count 5.4.3 draws,
   and compared against the movers' 124.3 B a row.
3. Breadth's and movers' sections are **proved byte-identical** before and
   after — the assertion is on the producer, because the wire cannot see a
   defect in it.
4. A guard refusing a second comparator for this quantity, keyed on **two
   percentiles either side of one operator** over **every shipped source file in
   three trees** — with its break **hand-performed** (`pnpm break` refuses a
   dirty target) and **proved green on the defect first**: a comparator written
   inline in the section builder, no sort call and no module import, which a
   name-keyed or `.sort(`-keyed check passes wrongly.
5. Epic 14's condition recorded fired, with the measurement and its caveats.
6. `pnpm verify` green; `pnpm test:database` run, because it is the only level
   that exercises the real baseline read and the refusal classes.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
