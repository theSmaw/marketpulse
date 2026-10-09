# Task 4.8.10 — §28, the sweeps, and the close

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.2 … 4.8.9

## Objective

**A figure taken after the epic is called done is a figure nobody re-takes**,
and a measurement that falsifies a governing document is swept the same day
rather than at the close. This task is the close that does the sweeping.

## What the user can see when this lands

**Nothing.** The story is finished.

## Work

### §28, amended or explicitly not

AC 6. §28 names two exceptions today, both the universe table, both Epic 14's.
**A third entry is a published admission on the product's front door**; the
alternative is owning it in this epic. If it is not amended, say **where it was
checked** — §28's exception list is also quoted in `planning/EPICS.md`, Epic
14's `EPIC.md` and `CLAUDE.md`.

### The upward sweep, with what is already known to be owed

- Epic 14's **false `Intl` construction claim** (Task 4.8.7 carries it).
- `docs/GAPS.md`'s **stale owner clause** for the four-route re-render, whose
  condition fired on 2026-09-27 (Task 4.8.2).
- The **one-to-sixteen sentence** at three live sites (Task 4.8.2).
- The **431-byte** frame size, and the `6.9 KiB/min` and `12% on top`
  arithmetic derived from it (Task 4.8.4).
- The hand-off's **_does not scale with connections_** claim (Task 4.8.3).
- Every inherited figure this story supersedes, with the old one left standing
  where it is a historical record and amended where it is a live claim.

### The sideways sweep — and run BOTH passes

Grep this story's documents for every `Story N.M` and `Owner:` line **and then
walk the epic's own story list asking _did 4.8 measure anything that story acts
on_**. **The second pass is what found three missing hand-offs in Story 4.6 and
two in 4.4, each after the grep found none.** Record the miss count.

Known candidates before you start: **Story 4.7** (its degraded grid runs on the
same instrument, and `/` re-renders on every batch in every degraded state);
**Story 4.9** (the flake characterisation, the code-free control, and the frame
composition); **Epic 5** (clause A and clause B, which Task 4.8.8 writes); and
**Epic 14** (what it still owns after this story, and what it does not).

### `docs/GAPS.md`

An entry for every claim this story leaves standing that nothing mechanical
guards — and **anything that can be made mechanical is made mechanical
instead**, as a `pnpm invariants` entry with a break. The strongest candidate,
already identified: **the cadence** — no offline feed reproduces ~16 batches a
minute, so every local per-tick figure on `/` is a sixteenth of the real render
count.

### And the frame composition, which the owner moved

**Frame composition goes to Story 4.9 with a named condition** — each `bars`
frame's symbol list, which **no replay or fixture can structurally produce** and
which three later stories were told to size against. It expires with every
session that passes. Write it into 4.9's own file.

### The close

`STORY.md`; `CLAUDE.md`'s _Current state_ and its _Where the record lives_ table
if this story added a subject; `LIVE-REHEARSAL.md` if it needs a person. Then
Gate 2.

## Done when

1. §28 amended, or explicitly not with where it was checked
2. Every falsified live claim corrected the same day, historical records left
   standing, and the count stated
3. Both sideways passes run and **the miss count recorded**
4. `docs/GAPS.md` entries written, with anything mechanisable made mechanical
5. Story 4.9 carries the frame composition and whatever 4.8.9 discharged
6. `pnpm verify` and `pnpm e2e` green, and Gate 2 put to the owner
