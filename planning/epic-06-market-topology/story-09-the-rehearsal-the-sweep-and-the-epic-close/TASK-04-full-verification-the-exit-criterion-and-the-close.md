# Task 6.9.4 — Full verification, the exit criterion verdicted, and the close

**Status:** Not started
**Story:** [6.9 The Rehearsal, the Sweep, & Epic 6's Close](STORY.md)
**Depends on:** 6.9.1, 6.9.2, 6.9.3

## Objective

A collection of completed tasks is not automatically a completed story, and
a collection of completed stories is not automatically a completed epic.
This task runs every gate once on the final tree, resolves the one question
`TOPOLOGY.md` §10.6 explicitly deferred to this story's own Gate 2, verdicts
Epic 6's own exit criterion, and performs both closes — this story's, and the
epic's.

## What the user can see when this lands

Nothing new — the verification and the close.

## Work

- **Full verification, once on the final tree**: `pnpm verify`, `pnpm
test:database`, `pnpm e2e`, with `uptime` read **before** each run (never
  during — this repository's own standing finding that a full suite is its
  own plant). Report the real numbers, not an adjective.
- **Resolve the carried-over Gate-2 question**: `TOPOLOGY.md` §10.6 found
  that the sector/band filter controls and `Reset view` stay present and
  inert over a degraded topology that has no graph to filter, and
  deliberately left whether that reads as consistent or as broken for this
  story's own Gate 2 rather than deciding it as a check. Present it to the
  Product Owner as part of Gate 2 below, with a recommendation.
- **Epic 6's own exit criterion verdicted**: "The tracked universe can be
  explored smoothly as an interactive graph, and unusual securities are
  visually obvious." _Smoothly_ has a number (§28's 60 FPS, Story 6.7's
  real figure, cited from Task 6.9.3's own table) and is met. _Visually
  obvious_ has no instrument and is a person's judgement — the thing the
  waived rehearsal row would have answered; state plainly that this half
  is **owed rather than met**, per the waiver Task 6.9.3 wrote.
- **`STORY.md`** status set to Complete, with the four tasks' PR links.
- **Epic 6's own `EPIC.md`** status set to Complete, citing the exit
  criterion's own verdict (met / owed, by half) and pointing to
  `TOPOLOGY.md` as the maintained account rather than restating its
  figures.
- **Gate 2** presented to the Product Owner — this story's own, **and**
  Epic 6's own close, together, since this is the epic's last story.

## Done when

1. `pnpm verify`, `pnpm test:database`, `pnpm e2e` are green, run once on
   the final tree, with load read before each.
2. The filter-controls-over-a-degraded-topology question is put to the
   Product Owner with a recommendation, and resolved.
3. Epic 6's exit criterion is verdicted in writing, both halves, with the
   waived half stated as owed rather than quietly marked met.
4. `STORY.md` and `EPIC.md` are both set to Complete.
5. Gate 2 is presented covering both this story's own acceptance criteria
   and Epic 6's own exit criterion, and both are accepted and closed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
