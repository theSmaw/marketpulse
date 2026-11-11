# Task 6.8.2 — Band narrows the graph too, honestly refusing where nothing is scored

**Status:** Not started
**Story:** [6.8 Filtering, & the Degraded Set](STORY.md)
**Depends on:** 6.8.1

## Objective

Sector membership is curated and static for the life of a page load; band
membership updates at feed cadence, up to 16 times a minute, from a value that
does not exist at all on CI or any fresh store. Task 6.8.1's filter
architecture (a narrowed graph object, a draw-time mask, one population
sentence through both writers) has to extend to an axis that can change under
a reader's stationary hands without reopening the declined `React.memo`
boundary three earlier stories in this epic rely on by name, and without
re-ordering or re-walking a keyboard reader's position.

## What the user can see when this lands

A band control stacks with the sector control from Task 6.8.1 (sector and
band together narrow by intersection; two bands chosen together narrow by
union — `high` and `extreme` shows either). On a store where nothing has been
scored — which is CI's and every fresh deployment's permanent or near-permanent
state — picking a band states plainly that the graph can't be narrowed that way
yet, rather than drawing an empty market.

## Work

- **The band control and its stacking semantics.** Multi-value
  (`?band=high,extreme`), using the existing `AnomalyBand`/`TopologyAnomalyTreatment`
  type so a second spelling is a compile error. The population sentence's
  two-clause grammar: sector narrows the population stated, band is a cut
  within it (`"69 are in Technology and 12 of those are high or extreme"`),
  following this product's own `describeMeasuredSet`-style discipline (a
  conjunct is withheld entirely at a zero count, using `countInWords`'
  `none`, never a bare `0`).
- **The refusal.** Where the scored cohort is zero, a band filter (alone or
  stacked) refuses with a stated reason rather than silently drawing zero
  nodes — settled at this story's own Gate 1. The sentence names what's
  missing, not a verdict: `"Nothing here has been scored yet, so the graph
can't be narrowed by band."` Verify this is reachable and correctly worded
  against a real `pnpm store:bare` run, not only a furnished fixture.
  Where the cohort is non-zero but a specific band combination matches
  nothing, that is Task 6.8.1's existing no-match state, reused rather than
  re-invented.
- **Live-update safety.** The band filter predicate must not become a prop
  `MarketTopology` takes that changes at feed cadence — the same reversal
  trigger (`"the first surface where it fires more than once a second"` /
  `"the first prop this region takes that changes at feed cadence"`) three
  earlier tasks in this epic evaluated and left unfired stays unfired here:
  the filter criterion changes at reader cadence, the underlying data it is
  applied against changes at feed cadence, and only the renderer's own
  imperative re-partition (the existing `setBands`/`regroupAnomalyTreatments`
  shape) touches the live side. A selection is **never dropped** by its own
  band changing under a live update — the node stays drawn and reachable even
  if it falls outside the active band filter mid-session (the same "a reading
  that is stale about the minute it names is wrong in a way a not-the-latest
  one is not" reasoning this product already applies to a revised bar). The
  population sentence may update silently on a live batch; the `role="status"`
  announcement region must **not** re-speak on a band-driven population
  change — only on a reader-driven filter press — or this ships the first
  surface in the product that interrupts a listener at feed cadence.
- **New invariant**: `the-topology-walk-reads-no-band` — `walk.ts` never reads
  a treatment, a band, an arrival key, or a bar's own instant; its membership
  stays a pure function of the curated graph, never of anything that changes
  at feed cadence. New `pnpm break` entry planting the defect (keying
  `groupOf`'s members or `index.ring` on a live treatment), confirmed to pass
  wrongly first.
- **The context-menu bug fix**, bundled here because it touches the same
  pointer-handling code this task is already in: `onPointerDown` does not
  filter `event.button`/`isPrimary`, so a right-click currently also moves the
  node selection. Filter it — one press, one response; the native menu itself
  is left alone per this story's own Gate 1.
- **Burst-absorption regression**, extending Story 6.7's own permanent spec
  (`overview-market-topology-burst-absorption.spec.ts`) with a filtered arm:
  a burst arriving while a band filter is active still produces zero frames
  over the 50ms ceiling, and the filter's own population sentence updates
  correctly across it.

## Done when

1. A reader can stack sector and band filters; the population sentence states
   both clauses correctly, including at zero (using the house "none" idiom).
2. A band filter against an unscored store (`pnpm store:bare`) refuses with
   the stated sentence rather than drawing an empty market.
3. A live band update never drops a selection, never re-speaks the
   `role="status"` region, and never reopens the declined memo boundary
   (verified: `MarketTopology` takes no new feed-cadence prop).
4. The new invariant and its break are in place, proved red-then-green.
5. The right-click/selection bug is fixed and covered by a test; the native
   context menu is otherwise untouched.
6. Story 6.7's burst-absorption spec passes with a new filtered arm.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
