# Task 6.4.5 — The sweeps, & this story's close

**Status:** Not started
**Story:** [6.4 Hover, Select, & the Way Out](STORY.md)
**Depends on:** 6.4.4

## Objective

A collection of completed tasks is not automatically a completed story.
This task verifies the integrated behaviour end to end, sweeps what this
story measured upward and sideways, and closes the story at Gate 2.

## What the user can see when this lands

Nothing new — this is verification and documentation.

## Work

- **Verification**: the tester runs the full behaviour end to end (pointer
  and keyboard, all four acceptance-criteria-bearing states), plus
  regression on Stories 6.1–6.3's own specs, `pnpm verify`, `pnpm e2e`.
  UX/design check the integrated experience with `pnpm probe` at all four
  widths and look at the screenshots, not just the numbers. The BA checks
  every acceptance criterion in `STORY.md` against evidence.
- **Upward sweep**: grep for every figure this story measured that
  contradicts something `CLAUDE.md`, `TOPOLOGY.md`, or an ADR currently
  states as fact — in particular the hit-test unit-mismatch finding (Task
  6.4.1 fixed the code; the two docblocks that currently claim the
  footprint "is already sized to be the thing a cursor or a focus ring
  targets" need a dated correction, not a rewrite) and the frame-rate-under-
  interaction gap `TOPOLOGY.md` §4 has carried since Task 6.2.5 (closed by
  Task 6.4.3's harness, or re-stated with a narrower scope if it is not
  fully closed).
- **Sideways sweep**: grep this story's own documents for every
  `Story N.M` / `Owner:` line and check each against that story's own
  file — record the count found and the count missing. At minimum:
  Story 6.5 (correlation edges) and Story 6.6 (node size) both change the
  layout density the hover hit-test and the tree-walk's disjointness
  argument rely on (`17.83` world units between the closest pair, found
  while shaping this story) — write that constraint into both stories'
  own files, in words they can act on, not a link back. Story 6.7 (live
  updates) is the likely trigger for re-opening whether selection state
  needs to leave this region (Gate 1 decision 2's own stated reversal
  condition) — write the condition into 6.7's file too.
- **One already-fired, unrecorded trigger found while shaping this
  story**: `MarketOverview.tsx`'s own docblock states a reversal trigger
  — _the first surface on this screen needing a second field from the
  universe_ — that fired silently at Task 6.3.3 (`equitySymbols` reading
  `security.kind`) and was never recorded. Record it now, in
  `MarketOverview.tsx`'s own docblock, since this story is what found it.
- **`docs/GAPS.md`**: the screen-reader listening entry from Task 6.4.4,
  plus any other claim this story leaves standing that nothing mechanical
  guards (a hover/selection pass on the deployed product against a real
  composite score, since CI's permanent `unscored` state means no gated
  machine has ever rendered a real band in this readout).
- **`TOPOLOGY.md`** gains a dated section recording what this story
  shipped, following the same minimal pattern Stories 6.2 and 6.3 used.
- **`CLAUDE.md`**'s Epic 6 status line and Current-state paragraph updated
  to reflect four of nine stories complete and what a user can now do from
  the graph.
- **`STORY.md`** status set to Complete, with the PR links.

## Done when

1. `pnpm verify` and `pnpm e2e` are green; the tester's end-to-end pass and
   the BA's acceptance-criteria check are both recorded with evidence.
2. The upward sweep is complete and recorded, including the two docblocks
   that need a dated correction.
3. The sideways sweep's grep count and findings are recorded, with the
   named constraints written into Stories 6.5, 6.6, and 6.7's own files.
4. `docs/GAPS.md`, `TOPOLOGY.md`, and `CLAUDE.md` are updated.
5. Gate 2 is presented to the Product Owner with evidence per acceptance
   criterion, and the story is accepted and closed.

---

## What was done — TBD

## For a stakeholder — a status report, TBD
