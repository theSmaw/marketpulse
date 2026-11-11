# Task 6.8.4 — The sweeps, and this story's close

**Status:** Not started
**Story:** [6.8 Filtering, & the Degraded Set](STORY.md)
**Depends on:** 6.8.1, 6.8.2, 6.8.3

## Objective

A collection of completed tasks is not automatically a completed story. This
task verifies the whole story end to end — filtering and the degraded set
together, not each task's own surface in isolation — performs the upward and
sideways sweeps, and closes Story 6.8.

## What the user can see when this lands

Nothing new — this is the verification and close.

## Work

- **Full verification**: `pnpm verify`, `pnpm e2e`, `pnpm test:database`,
  `pnpm probe` at all four widths across the combined filter × degraded-state
  space Tasks 6.8.1–6.8.3 each took separately.
- **Acceptance criteria walked one by one with evidence**, per `STORY.md`'s
  own rewritten text — including the two accepted departures (AC3's
  unreachable-by-construction cover, AC6's declared collision class).
- **Upward sweep**: grep this story's own documents and code for anything
  that falsifies a governing document (an ADR, `CLAUDE.md`, `PRODUCT_SPEC.md`);
  correct the live sites, leave historical records standing.
- **Sideways sweep**: grep every file this story touched for `Story N.M` and
  `Owner:` lines, check each against that story's own file, and state the
  count that were missing — in particular confirming whether the three
  edge-affordance questions and the correlation-strength refusal (Open
  Decision 1) need anything written into a sibling story's own `STORY.md`
  beyond this story's own record.
- **`docs/GAPS.md`**: close the native-context-menu entry (disposition taken)
  and the Task 4.7.11 hand-off (discharged or re-owed, per Task 6.8.3's
  finding); add any new entries this story leaves standing that nothing
  mechanical guards.
- **`TOPOLOGY.md`, `CLAUDE.md`, `LIVE-REHEARSAL.md`** updated if this story
  changed what a user can see (it does) — a new §8 in `TOPOLOGY.md`
  mirroring the shape §6/§7 already established; `CLAUDE.md`'s Epic 6 status
  line moved to eight of nine stories; a new `LIVE-REHEARSAL.md` row if a
  person needs to have watched any of this working, per that file's own
  rules (most of this story's own claims are producible and verified by a
  gated machine — state plainly if nothing here needs a person, rather than
  adding a row by default).
- **`STORY.md` status** set to Complete, with the four tasks' PR links.
- **Gate 2** presented to the Product Owner.

## Done when

1. `pnpm verify`, `pnpm e2e`, `pnpm test:database` are green; `pnpm probe`
   results are recorded.
2. Every acceptance criterion is walked with evidence, including the two
   accepted AC departures.
3. The sweeps are complete and recorded, with the sideways grep count stated.
4. `docs/GAPS.md`, `TOPOLOGY.md`, `CLAUDE.md`, `LIVE-REHEARSAL.md` are updated
   as warranted.
5. Gate 2 is presented with evidence per acceptance criterion and per Open
   Decision, and the story is accepted and closed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
