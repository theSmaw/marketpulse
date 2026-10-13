# Task 5.1.6 — The Sweeps & the Close

**Status:** Not started
**Story:** [5.1 The Decisions, the Adjustment, & `Relative performance` Drawn](STORY.md)
**Depends on:** 5.1.5

## Objective

**A collection of completed tasks is not automatically a completed story**, and
a close sweeps only the documents the story wrote. This task does the two
sweeps nothing does on its own, and takes Story 5.1 to Gate 2.

## What the user can see when this lands

**Nothing.** A story whose figures can be re-taken rather than cited.

## Work

- **Every acceptance criterion in `STORY.md` verdicted**, with the instrument
  named and split between **re-takes from a clean clone** (which must be a
  runnable command) and **dated readings**. Epic 4's close found that only three
  of its eight stories published a per-criterion verdict of their own, so this
  story owes one that a later close can quote rather than reconstruct.
  **Note AC 2 and AC 4 were amended at Gate 1** and are verdicted as amended,
  with the originals quoted.
- **The upward sweep, against the list and against a grep.** Known candidates:
  `PRODUCT_SPEC.md` §8.3's region list; `VISUAL-LANGUAGE.md`'s anomaly prose
  after the band rename; `LiveFeedView.overview`'s docblock, which says
  _"Nothing renders it yet"_ and is about to be stale on a second route;
  `market.css`'s `--anomaly-unusual`; and the three discrepancies Task 5.1.1
  corrected. **Amend live claims by date, leave historical records standing, and
  record the count of each.**
- **The sideways enumeration.** Grep this story's documents for every
  `Story N.M`, `Epic N` and `Owner:` line and check each against the
  **recipient's own** file. The record across six runs reads **1, 6, 3, 6, 2,
  8**, and Epic 4's run found that **six of its eight were recipients the
  prescribed grep could not find** — so the walk matters more than the grep.
  Known recipients: **Story 5.2** (the rail's idiom and the slot it inherits),
  **Story 5.6** (the one amber position, the ETF-versus-peer-median decision
  this story deferred by name, and the chart marker lane), **Epic 6** (the
  `reserved`-state finding this story's filled region leaves live for theirs),
  and **Epic 13** (the membership data's start date).
- **`docs/GAPS.md`** gains an entry for every claim this story leaves standing
  that nothing mechanical guards, and anything mechanisable is **made
  mechanical** as a `pnpm invariants` entry **with a `pnpm break` in the same
  change**. The standing candidates: the dropped staleness refusal, in ADR
  0040's own terms; the `≥74rem`-only rail adjacency, which nothing asserts;
  and the co-presence of the region's sector reference with the source note's
  date, which is Gate 1 decision 11's owed mechanism.
- **The architect's two questions**, answered either way: does anything here
  deserve an ADR, and **is any guard this story described a sentence rather
  than a mechanism**. The second has one known candidate already — AC 4's
  _satisfied by construction_.
- **`STORY.md` status updated**, and `CLAUDE.md`'s _Current state_ amended,
  because this story changes what a user can see on `/securities/:symbol`.
- **`LIVE-REHEARSAL.md`**: decide whether this story needs a person to have
  watched it, and if so write the row **before** the sitting rather than at the
  close. Epic 4's gate now **refuses a close** with an unwatched row, and a
  waived row needs a date, a reason and an `Owner:`.

## Done when

1. Every `STORY.md` acceptance criterion has a verdict, an instrument and a
   kind, with the two amended criteria quoted in both forms.
2. Both sweeps are run and **both counts recorded**, including if either is
   zero.
3. `docs/GAPS.md` is updated, every mechanisable claim is mechanical, and every
   check added has a break that was performed in **both** directions — passing
   wrongly first, with the transcript kept.
4. The ADR question and the guard question are both answered in writing.
5. The four gates are run **once on the final tree** with their numbers, the
   load read **before** each.
6. Gate 2 is put to the owner with what a user can now see, each criterion's
   evidence, what shipped open with an owner and a condition, and **what was
   not verified and why**.

---

## What was done — 2026-10-13

<!-- written at completion -->
