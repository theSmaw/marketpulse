# Task 5.3.5 — The Sweeps & the Close

**Status:** Not started
**Story:** [5.3 The Baseline, & the Price Percentile](STORY.md)
**Depends on:** 5.3.4

## Objective

**A collection of completed tasks is not automatically a completed story**, and
this one falsified more governing text than any story in the epic so far.

## What the user can see when this lands

**Nothing.** A story whose figures can be re-taken rather than cited.

## Work

- **Every acceptance criterion verdicted**, with an instrument and a kind —
  **and ACs 3, 4 and 5 verdicted AS AMENDED, with the originals quoted**,
  because the owner changed all three at Gate 1 and a close that quietly
  verdicts the amended form destroys the record of what was asked for.
- **The fourth conjunct of `one-home-for-the-observation-window`, which is owed
  and is NOT what the hand-off said.** Story 5.2's close told this story the
  check _will refuse your lookback_. **It will not** — the `CUTOFF` regex matches
  only minute-scaled subtraction from an instant's milliseconds, and a
  60-**trading-session** lookback goes through the calendar with no `getTime()`
  and no minute factor, so it matches **neither** half and the run prints its
  usual counts with the lookback on disk. **The conjunct must key on the SESSION
  count**, and the break must be the file the **next** story writes — confirming
  the check passes **wrongly** first. Correct the hand-off in Story 5.2's own
  file by date.
- **The upward sweep**, with these named before you start:
  - **`PRODUCT_SPEC.md` §11's `99.1st percentile`** — a dated amendment, since
    integer ordinals are what 4,620 samples support.
  - **Story 5.1's Gate 1 decision 1** — amended in Task 5.3.1; check it reads
    correctly beside the owner's 2026-10-14 decision.
  - **`PROVIDER.md` §3.5** — its refusal is about _computing_ an adjustment and
    this story _detects and refuses_; make sure the distinction is written where
    the refusal lives, not only here.
  - **`HOSTING.md`'s 10 MiB/s against its own 120 provisioned IOPS** — the
    story's cost band is bandwidth arithmetic and the disk is provisioned for
    IOPS. Whichever regime the deployed measurement supports, the document that
    gets quoted next should say which applies to a per-security pass.
  - **`BARS.md` §2** — the story cited the **daily** 2024-01-01 cap for a
    **minute** baseline; the conclusion held and the mechanism quoted did not.
- **The sideways enumeration.** Known recipients: **Story 5.4** (it ranks these
  figures, and ADR 0040's reversal trigger — _the first aggregate on `/` whose
  honest window is not breadth's_ — **fires on it**, taking ADR 0038's frame
  grain with it: `windowMinutes` stops being one number per frame and the shared
  eligibility pass splits); **Story 5.5** (the same store read, the same tape
  rule, and the baseline table it may extend rather than duplicate); **Story
  5.6** (the percentile is a scored factor and inherits the refusals); **Epic
  13** (the table is covered by the temporal plugin **by its column naming**,
  which diverges from ADR 0042 deliberately); **Epic 14** (the periodic pass is
  a new cost class on a Burstable tier with a CPU-credit model, and
  `PRODUCT_SPEC.md` §28 has nothing to say about a background pass — that
  silence is worth a decision rather than an assumption).
- **Epic 14's three conditions and ADR 0040's trigger, all evaluated in
  writing**, with what would change each verdict.
- **`docs/GAPS.md`** for every claim nothing mechanical guards — the deployed
  cost, the two-tape inflation's ~25%-of-steady-state exposure, the bias's
  magnitude (nothing measures **by how much** the open is fatter), and the fact
  that **no gated machine will ever see a percentile**.
- **`LIVE-REHEARSAL.md`** row **5.3**, written **before** the sitting. The
  percentile has **no external check at all** short of a person with a public
  chart and a calculator, and it is the third consecutive row this epic owes.
- **`STORY.md` status, the subject document, `CLAUDE.md`'s _Current state_.**

## Done when

1. Every criterion has a verdict, an instrument and a kind, with the three
   amended ones quoted in **both** forms.
2. The fourth conjunct exists, keyed on the **session** count, with a break
   performed in both directions and the passing transcript kept — and Story
   5.2's hand-off corrected by date.
3. Both sweeps are run and **both counts recorded**, including if either is zero.
4. All three of Epic 14's conditions and ADR 0040's trigger are evaluated in
   writing.
5. `docs/GAPS.md` updated; anything mechanisable made mechanical with a break.
6. Row 5.3 is in the ledger with what a sitting must take deliberately.
7. The four gates run **once on the final tree** with their numbers, the load
   read **before** each, and Gate 2 put to the owner with what was **not**
   verified and why.

---

## What was done — 2026-10-14

<!-- written at completion -->
