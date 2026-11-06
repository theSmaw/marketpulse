# Task 6.5.4 — The sweeps, & this story's close

**Status:** Not started
**Story:** [6.5 Correlation Edges, Computed Nightly, & the Strongest N](STORY.md)
**Depends on:** 6.5.3

## Objective

A collection of completed tasks is not automatically a completed story. This
task verifies the integrated behaviour end to end, sweeps what this story
measured upward and sideways, and closes the story at Gate 2.

## What the user can see when this lands

Nothing new — this is verification and documentation.

## Work

- **Verification**: the tester runs the full behaviour end to end (every data
  state Task 6.5.2 drew, the degraded-read state, regression on Stories
  6.1–6.4's own specs), `pnpm verify`, `pnpm e2e`, `pnpm test:database`. UX
  and design check the integrated experience with `pnpm probe` at all four
  widths. The BA checks every acceptance criterion in `STORY.md`, including
  the five open decisions, against evidence.
- **Upward sweep**: grep for any further claim this story's own measurements
  falsified, beyond the four dated amendments Task 6.5.1 already made
  (ADR 0044, ADR 0045, `PRODUCT_SPEC.md` §30, `compute-baselines.ts`'s
  header).
- **Sideways sweep**: grep this story's own documents for every `Story N.M` /
  `Owner:` line and check each against that story's own file, recording the
  count found and the count missing. At minimum: confirm Story 6.6's own
  `STORY.md` carries the edge-keyboard-reachability gap Task 6.5.2 was told
  to hand it, in words that story can act on, not a link back.
- **The `SecurityExplorer.tsx` placeholder reword** (Open Decision 5):
  confirm `Connected securities`' placeholder names a condition rather than
  an epic, the same correction Task 5.7.4 made to `Anomaly history`.
- **`docs/GAPS.md`**: an entry that CI (and every laptop with no provider)
  draws zero correlation edges, for ever — the same shape as Story 6.3's
  `high`/`extreme`-ring gap — plus confirmation that the thinly-traded-security
  attenuation bias entry Task 6.5.1 wrote is still accurate after Task 6.5.3's
  real measurements, corrected if the real distribution says otherwise.
- **`TOPOLOGY.md`** gains a dated section recording what this story shipped,
  including the intra-sector-share finding from Task 6.5.3, following the
  same minimal pattern Stories 6.2–6.4 used.
- **`CLAUDE.md`**'s Epic 6 status line and Current-state paragraph updated to
  reflect five of nine stories complete and what a user can now see on the
  graph.
- **`STORY.md`** status set to Complete, with the PR links.

## Done when

1. `pnpm verify`, `pnpm e2e` and `pnpm test:database` are green; the tester's
   end-to-end pass and the BA's acceptance-criteria check are both recorded
   with evidence.
2. The upward and sideways sweeps are complete and recorded, with the
   sideways grep count stated.
3. `docs/GAPS.md`, `TOPOLOGY.md`, and `CLAUDE.md` are updated.
4. Gate 2 is presented to the Product Owner with evidence per acceptance
   criterion and per open decision, and the story is accepted and closed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
