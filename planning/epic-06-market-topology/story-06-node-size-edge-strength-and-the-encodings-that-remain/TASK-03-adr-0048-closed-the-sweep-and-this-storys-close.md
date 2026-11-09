# Task 6.6.3 — ADR 0048 closed, the sweep, & this story's close

**Status:** Not started
**Story:** [6.6 Node Size, Edge Strength, & the Encodings That Remain](STORY.md)
**Depends on:** 6.6.1, 6.6.2

## Objective

ADR 0048's Decision 3 reversal trigger fired at Story 6.5's close and was
only half-evaluated (the type half). This story owns the layout half, and
the technical-architect's shaping pass gave a definitive verdict: the
layout stays closed-form and weight-blind; edge strength lives only in the
stroke. This task records that decision properly, closes the trigger, and
verifies the integrated story end to end.

## What the user can see when this lands

Nothing new — this is the architectural close and the verification pass.

## Work

- **Amend ADR 0048** with the technical-architect's drafted text: the
  layout stays closed-form and weight-blind. Include the corrected
  reasoning — the prior hand-off's "determinism" argument does not actually
  hold on its own (a weight-keyed offset would be deterministic too); the
  real reasons are (1) the server/browser coordinate agreement Epic 7's
  tools need, which a nightly-table-dependent layout would break, (2) the
  single-picture-under-absence property Story 6.4's keyboard-walk rule
  already generalises, and (3) the measured zero spatial slack at 390 (the
  closest node pair is 17.83 layout units against a 16-unit footprint).
  Record the rejected hybrid alternative (a within-cluster deterministic
  offset) with its own figure.
- **Add the new `pnpm invariants` clause + break**: `packages/shared/src/
topology-layout.ts` reads no edge — keyed on the _read_ (no `.edges`, no
  `weight`, no `TopologyEdge` import), the way `no-random-in-the-shared-
model` covers four shapes of one reach, rather than on a type name.
- **Full end-to-end verification**: `pnpm verify`, `pnpm e2e`,
  `pnpm test:database`. `pnpm probe` at all four widths, with greyscale
  crops against the real distribution (8-in-500 `extreme`, the real
  retained-edge set).
- **Upward sweep**: grep for any further claim this story's own
  measurements falsified beyond what Tasks 6.6.1/6.6.2 already corrected.
- **Sideways sweep**: grep this story's own documents for every `Story N.M`
  / `Owner:` line, check each against that story's own file, and record the
  count found and the count missing. At minimum confirm Story 6.7's and
  Story 6.8's own `STORY.md` files carry the Task 6.6.2 hand-offs in words
  they can act on.
- **`docs/GAPS.md`, `TOPOLOGY.md`, `CLAUDE.md`** updated: what this story
  shipped (edge strength only, at 1440), what it refused (node size, a
  landmark treatment), and what remains unverified by any machine (CI never
  draws a correlation edge, so the new stroke encoding is permanently
  absent there).
- **`STORY.md` status** set to Complete, with the PR links.
- **Gate 2** presented to the Product Owner.

## Done when

1. ADR 0048's Decision 3 trigger is closed with a dated amendment recording
   an actual decision, not a recommendation.
2. The new invariant and its break are in place and proved red-then-green.
3. `pnpm verify`, `pnpm e2e`, `pnpm test:database` are green; `pnpm probe`
   results and greyscale crops are recorded.
4. The upward and sideways sweeps are complete and recorded, with the
   sideways grep count stated.
5. `docs/GAPS.md`, `TOPOLOGY.md`, `CLAUDE.md` are updated.
6. Gate 2 is presented with evidence per acceptance criterion and per Open
   Decision, and the story is accepted and closed.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
