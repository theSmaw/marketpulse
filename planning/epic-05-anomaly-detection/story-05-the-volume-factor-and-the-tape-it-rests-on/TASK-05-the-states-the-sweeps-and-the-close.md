# Task 5.5.5 — The states, the sweeps, and the close

**Status:** Not started
**Story:** [5.5 The Volume Factor, & the Tape It Rests On](STORY.md)
**Depends on:** 5.5.4

## Objective

A collection of completed tasks is not a completed story.

## What the user can see when this lands

**Nothing new.**

## Work

- **The ADR this story owes: _what a cross-tape comparison is, and when it is
  refused._** Not because volume is new, but because **this product already
  ships a cross-tape comparison and has no decision record for it**: the live
  `iex` five-minute return is ranked against a `sip` baseline (`index.ts:1092`,
  `BASELINE_FEED`). That is legitimate — a return is scale-free and tape-invariant
  to first order — and volume is not, because the share **is** the quantity. The
  ADR states the invariance test (_is this quantity a ratio within one tape, or a
  level across tapes?_), retro-documents the price case, governs volume, and
  governs every Epic 6 and 9 factor afterwards. It is also where AC 1's
  measurement and the **no-multiplier** rule belong. **It is already disclosed on
  screen** — `Measured on IEX · baseline on All US exchanges` — so what is
  missing is the record, not the disclosure.
- **ADR 0035 is VINDICATED, not amended.** _A record of an observation rather
  than a cache of the best number_ is precisely what makes a same-tape `iex`
  baseline possible at all; had the store kept one row a minute under
  `SERVED_TAPE_RANK`, Gate 1 decision 1 would have been unimplementable. Cite
  it. **0034 needs no amendment** — no new per-bar field, so its trigger does not
  fire. **0043** needs a note only if the bucket width arrives as a third
  minute-scaled quantity.
- **The states into the kept grid** if the region's states changed — and note
  Story 5.4.6's finding: that grid keys on **surface text, not geometry**, so its
  silence is **not** evidence for the region's height.
- **Sweep upward** every figure this story falsified, and **sweep sideways by
  grepping for every `Story N.M` and `Owner:` line**, checking each against that
  story's own file and **recording the count that were missing**. Story 5.4's
  close was 1 of 4 missing; Story 5.3's missed its own epic file.
  **Known already**: Story 5.6 needs the volume factor's refusal set and the
  `>999×` cap; Epic 14 needs to know this story did **not** re-fire its condition
  and does **not** owe the `/` re-take.
- `docs/GAPS.md` for every claim left standing — at minimum that **no gated
  machine and no person can draw this figure**, and the measurement's n=1.
- **`LIVE-REHEARSAL.md` row 5.5, and it is a new KIND of row**: the figure is
  **unwatchable** rather than unwatched, because it becomes available on a
  **date nobody controls** — when `iex` depth crosses the floor. Say that on the
  row's face; no previous row has had to.
- `STORY.md` status; `MARKET-OVERVIEW.md` and `CLAUDE.md` only if what a user can
  see changed.

## Done when

1. The ADR exists, with alternatives and a **reversal trigger as a condition**.
2. The sideways sweep is **enumerated** and the missing count recorded.
3. `LIVE-REHEARSAL.md` row 5.5 states the unwatchable condition.
4. `pnpm verify` green, and the full suite run at **two workers** — four workers
   was measured at three or four front-of-margin failures a run, two workers at
   **none**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
