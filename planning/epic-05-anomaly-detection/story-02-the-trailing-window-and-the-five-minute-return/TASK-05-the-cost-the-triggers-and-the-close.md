# Task 5.2.5 — The Cost, the Triggers, the Sweeps & the Close

**Status:** Not started
**Story:** [5.2 The Trailing Window, & the 5-Minute Return](STORY.md)
**Depends on:** 5.2.4

## Objective

**An unevaluated trigger and one that did not fire read identically**, and this
story stands next to three of them. It also adds work to the one callback the
whole live path runs through, and AC 8 wants that measured rather than argued.

## What the user can see when this lands

**Nothing.** A story whose figures can be re-taken rather than cited.

## Work

- **AC 8, measured on a production artefact with a calibrator**, and reported as
  **three arms rather than one number**: a **tight-loop Node** figure, which is
  the only defensible absolute and is an **understatement** of production; a
  **gapped** figure labelled _an upper bound on the shape and nothing more_,
  with its own discard rate; and the cadence **furnished** at both ends of
  6.8–16.1 batches a minute, printed beside every figure.
  - **The two caveats are stated separately and neither is optional.** A gapped
    Node sample inflates and the calibrator **does not divide out** — subject
    **4.38×** against calibrator **2.29×**, a factor of ~1.9 apart — while a
    browser figure reads **×1.00**. A browser figure wearing the Node caveat is
    as misleading as a Node figure without it.
  - **Expect the subject to be below the floor and plan to report that.** Task
    4.5.8 measured **0.0 ms net at p50 over 45 bursts** and recorded that the
    instrument cannot see a regression smaller than a millisecond. A bounded
    push plus an eviction scan over a batch of **284–450 bars** (not 516) is
    plausibly ≪1 ms. _Indistinguishable from a fixed-cost control at n=45_ is a
    result, not a failure — say so rather than hunting a number.
  - **Read the load average BEFORE each run, never during it.** A suite is its
    own plant.
- **Epic 14's trigger, all THREE conditions, evaluated in writing.** The two in
  `epic-14`'s file (a second surface at universe scale on `/securities`; the
  first surface on `/` rendering one element per tracked security) and the
  **third, backend one** in Epic 5's own file: _the first computation added to
  that callback that **derives a figure per security**, rather than ranking or
  counting figures the join has already produced._
  - **A ring-buffer push is storage rather than derivation**, and the return is
    computed for **one** security on demand — so the expectation is that none of
    the three fires. **Write the verdict either way**, and say what would change
    it: computing the return per security inside the callback so `/`'s frame can
    carry it fires the third, and the moment it reaches `/` it fires the second.
- **The ADR the architect says is owed: the two five minutes.** ADR 0040's is an
  **eligibility cutoff over a population**; this story's is a **measurement span
  between two endpoints of one security**. Two things in this product called a
  five-minute window is exactly the collision this repository's documents keep
  paying for, and the check that would otherwise conflate them was widened in
  Task 5.2.2. The ADR records the distinction, the naming rule, and that
  **ADR 0040's own trigger did not fire**.
- **The upward sweep.** Known candidates: `EPIC.md`'s _five properties_ section,
  which says _there is no series in memory_ — true until this story and false
  after it; `LIVE-DATA.md`'s and `STREAM-SEAM.md`'s descriptions of what the
  process holds; and `docs/GAPS.md`'s entry about an aggregate being checkable
  by nothing, whose **second condition this story trips verbatim** — _the first
  aggregate region whose figures cannot be reconstructed from the frame the
  browser received_ — unless the frame carries both endpoints, which Task 5.2.3
  makes it do. Check that and record the count either way.
- **The sideways enumeration.** Grep this story's documents for every
  `Story N.M`, `Epic N` and `Owner:` and check each against the **recipient's
  own** file. Known recipients: **Story 5.3** (the window it reads, its depth,
  the span constant it must not reuse, and the percentile's own lookback firing
  the widened check); **Story 5.4** (the figure it ranks, and that computing it
  for 516 in the callback is what fires Epic 14's third condition); **Story
  5.5** (the volume factor over the same window, and the tape rule);
  **Epic 13** (the window is process memory with no point-in-time bound, and
  must be constructed from replayed bars or not read at all).
- **`docs/GAPS.md`** gains an entry for every claim nothing mechanical guards —
  the memory figure, the cost figures, the cold-start refusal, and every
  behaviour unreachable on a gated machine — each with a `Re-measure:`.
- **`STORY.md` status, the subject document, and `CLAUDE.md`'s _Current state_**,
  because this story changes what a user can see.
- **`LIVE-REHEARSAL.md`**: row **5.2**, written **before** the sitting. The
  figure is unreachable on every gated machine, so a person is the only thing
  that can see it at all. Epic 5 is already in `REHEARSAL_LEDGER_EPICS` and the
  gate will refuse the epic's close with the row unwatched.

## Done when

1. AC 8 is reported as three arms with both caveats stated separately, the
   cadence printed beside every figure, and the load read before each run.
2. **All three** of Epic 14's conditions are evaluated in writing, with what
   would change each verdict.
3. The ADR is written and indexed, recording the two five minutes and
   ADR 0040's unfired trigger.
4. Both sweeps are run and **both counts recorded**, including if either is
   zero.
5. `docs/GAPS.md` is updated and anything mechanisable is mechanical, with a
   break in both directions.
6. `LIVE-REHEARSAL.md` carries row 5.2 with what a sitting must take
   deliberately, each item unobtainable afterwards.
7. The four gates are run **once on the final tree** with their numbers, and
   Gate 2 is put to the owner with what was **not** verified and why.

---

## What was done — 2026-10-13

<!-- written at completion -->
