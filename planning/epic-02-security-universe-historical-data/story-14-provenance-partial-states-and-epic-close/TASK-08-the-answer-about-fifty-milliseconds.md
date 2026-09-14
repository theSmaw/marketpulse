# Task 2.14.8 — The answer this epic owes about §28, and it is the table's

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.4

> **Amended 2026-09-14 by Task 2.14.1.** The dependency read _"which may have
> added markup to the table in question"_. [`PROVENANCE.md`](PROVENANCE.md) §5
> settled the classification onto `SourceNote` and explicitly **not** onto the
> universe table, so 2.14.4 adds nothing per-row and the re-measure below is a
> **confirmation** rather than a reading of new markup. Still take it — a figure
> cited is a figure nobody checked — but expect it unchanged, and if it has moved,
> something other than this story moved it.

## Objective

Discharge the one published-target breach this epic ships with, by **deciding**
rather than by measuring again.

`PRODUCT_SPEC.md` §28 states _no routine main-thread task over 50 ms_. On every
cold load of `/securities` and `/securities/:symbol` there is one task of
**50–66 ms**, and it is the **518-row tracked universe**, not the chart. Proved
from both ends: present on `/securities` where no chart exists, absent with a
20-row universe while a **9,750-bar** chart is still drawn, with 40 of those
milliseconds in the engine's own style, layout and paint over a 10,331-node
document.

Task 2.13.9 re-measured it with a second plot and a window control on the page
and it is unchanged — and added an instrument the first run did not have: the
largest gap between consecutive `requestAnimationFrame` callbacks, continuous
where `longtask` is not. It says something the original could not. **Every
20-row page sits at 32–34 ms, which is two frames and is the floor; every
518-row page sits at 67–84 ms.** This is not a page marginally over a line.

The record is `SEARCH-AND-SELECTION.md` §10 (the measurement, the attribution and
three candidate repairs) and `CHARTING.md` §16.1 (why it was raised rather than
absorbed).

## What the user can see when this lands

**Either a faster first paint on the two most-visited routes, or nothing at
all** — depending on which of the three dispositions is taken. If it is a
deferral, say "nothing visible" plainly and name Epic 14.

## Work

Take **one** of three dispositions, in writing, with the argument:

1. **Repair it.** One of §10's three candidates, followed by a re-measure using
   2.13.9's instrument — both `longtask` and the rAF gap, ten cold loads, at 518
   rows and at 20 — so the before and after are comparable rather than
   differently taken.
2. **Accept the breach.** Defensible today and getting less so: one task, just
   over the line, on a load rather than during interaction. If this is the
   choice, it is recorded in `docs/GAPS.md` with the figures, the argument, and
   the existing trigger — **the first time a second surface renders per-row
   markup at universe scale** — and `PRODUCT_SPEC.md` §28 gains a dated
   amendment beside it, because a published target the product knowingly misses
   and does not annotate is the exact failure `CLAUDE.md` describes as a stated
   invariant quietly stopping being true.
3. **Hand it to Epic 14 by name.** The performance epic; a virtualised or
   paginated 518-row table is precisely its kind of work. This is materially
   different from acceptance: a named owner and a live trigger, written into
   `planning/epic-14-performance-scale-validation/EPIC.md` so it arrives with
   that epic rather than being rediscovered.

Whichever is chosen:

- **Re-measure once with the current tree** before deciding. ~~Task 2.14.4 may
  have added a per-row element to that table~~ — it did not, by decision; so the
  expected result is 2.13.9's figure unchanged, and the value of taking it is that
  an unchanged figure you measured and an unchanged figure you assumed look
  identical in a document and nowhere else.
- **Falsification travels upward.** If the number has moved, what it invalidates
  is a premise in `SEARCH-AND-SELECTION.md`, in `CHARTING.md` §16.1 and possibly
  in §28 — grep for the claim, correct the live sites, leave the historical
  records standing, and give any ADR a dated amendment rather than a rewrite.
- **A figure that has moved looks exactly like a figure that was mis-recorded.**
  If it disagrees with 2.13.9's, only rebuilding that commit tells them apart —
  and that is worth doing before publishing a different number.

## Done when

- One disposition is taken, argued, and written where it will be read: `GAPS.md`
  for an acceptance, Epic 14's `EPIC.md` for a hand-off, the measurement record
  for a repair.
- The current figure is in the record, taken with both instruments, and it is
  dated.
- No document in the tree now states §28 as met on those two routes without a
  qualifier.
- `pnpm verify` passes.

## Notes

The failure mode here is a fourth disposition nobody chooses on purpose:
mentioning it in the close, not writing it anywhere durable, and shipping. Three
of the four options are fine. That one is not.
