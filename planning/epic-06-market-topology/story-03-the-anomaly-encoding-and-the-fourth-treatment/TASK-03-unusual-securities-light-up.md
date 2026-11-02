# Task 6.3.3 — Unusual Securities Light Up On `/`

**Status:** Not started
**Story:** [6.3 The Anomaly Encoding, & the Fourth Treatment a Canvas Needs](STORY.md)
**Depends on:** 6.3.1, 6.3.2

## Objective

Wire the wire section (6.3.1) into the renderer's update channel (6.3.2) on
the real route. This is the story's visible payoff — the graph's nodes
carry their band for real, live, without losing a reader's pan or zoom —
and it is where the two reversal triggers Story 6.2's close already named
actually fire.

## What the user can see when this lands

**The unusual securities light up on `/`.** A reader watching the page sees
nodes change treatment as the market moves, in place, with no jump, no
reload and no lost pan/zoom.

## Work

- **`MarketTopology.tsx` reads the new section off the live feed hook** and
  calls the renderer's `setBands()` on each batch — **not** through the
  mount effect's dependency array. `topology` (deps: `[topology, probe,
sentenceId]`) stays keyed on `securities` only; the band map is a
  separate piece of state/ref that calls the imperative method directly,
  the same shape `resize`/`reset` already use.
- **The "never blanked" rule** (AC 5): if a batch's frame carries no band
  section at all (rollback, previous image, two-nightly-tables-apart), keep
  the last bands drawn rather than clearing to hollow. If a batch's section
  _is_ present but a specific equity has dropped out of every array, that
  equity goes hollow — the rule is about the **section's own absence**, not
  about one symbol's.
- **Re-take the declined `React.memo` boundary**, for real this time.
  `MarketTopology.test.tsx`'s existing "the declined memo boundary" describe
  block asserted the mount effect doesn't re-run across applied batches —
  extend it (or add beside it) a producer-side measurement that `setBands()`
  is called every batch **without** `mountCanvasTopology` being called
  again. The boundary decision itself may still be "decline a wrapping
  `React.memo`" — what changes is that the renderer now has an update path
  that must be proven cheap, not that the component re-renders differently.
- **Rewrite `topologyDrawnSentence`** (beside `topologyFailureSentence`,
  same file, same convention Story 6.2 used): drop "nothing in it is a
  measurement," since it is no longer true. New content lands in Task
  6.3.4 — this task only removes the now-false clause and leaves a minimal
  correct sentence in its place (the full accessible account, including
  band vocabulary and counts, is 6.3.4's).
- **CI's and a cold load's unscored state, for real**: on a store with zero
  bars and no provider, every equity in the graph draws hollow because the
  section is permanently absent — confirmed against the real backend, not
  simulated. A restarted replica's ~46s thin-aggregate window draws the
  same way until its own feed authenticates.
- **The fifteen landmarks stay untouched**, confirmed on the real route —
  they were never in the wire section (6.3.1) and never in the renderer's
  unscored branch (6.3.2); this task just confirms the wiring doesn't
  accidentally catch them (e.g. a `Map` keyed by symbol that silently
  includes everything).
- **No regression to pan/zoom or `Reset view`** across repeated band
  updates — a browser-level assertion, not only a unit one, since this is
  exactly the failure mode a wrong implementation produces.

## Done when

1. The graph's nodes carry their real band on `/`, live, confirmed against
   the running backend.
2. A batch updating bands does not re-mount the canvas — a reader's pan,
   zoom and `Reset view` state survive repeated updates (browser-level
   assertion).
3. A frame with the band section missing leaves the picture exactly as it
   was (AC 5), held by a test that removes the section between two frames.
4. The declined memo boundary is re-verified with a producer-side
   measurement covering the new update path.
5. `topologyDrawnSentence` no longer claims the graph encodes no
   measurement.
6. CI's and a cold-load's all-hollow state is real on the actual route, not
   simulated.
7. The fifteen landmark nodes are confirmed unchanged on the real route
   across several batches.
8. `pnpm e2e` is green on `overview-market-topology.spec.ts`,
   `overview-region-order.spec.ts`, `landing-route.spec.ts` and any new
   specs this task adds.
9. `pnpm build && pnpm lint && pnpm format:check && pnpm test` all exit 0.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
