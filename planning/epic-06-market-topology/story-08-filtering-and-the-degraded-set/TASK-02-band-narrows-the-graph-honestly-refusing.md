# Task 6.8.2 — Band narrows the graph too, honestly refusing where nothing is scored

**Status:** Complete — 2026-11-11
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

## What was done, and what was decided where this file left it open

`TOPOLOGY.md` §9 is the maintained account and **wins** where this file
disagrees. What follows is what this task itself found.

### The shape

- **`topology/filter.ts`** — `TopologyFilter` gained `bands` and
  `unrecognisedBands`; `narrowTopology` applies both cuts in order and returns
  the counts the sentence states; `topologyCriterion` is the one conversion
  from _what the address says_ to _what the renderer draws_;
  `topologyBandPath` toggles; `topologyClearPath` drops both;
  `TOPOLOGY_BAND_REFUSAL` is the Gate-1 sentence, verbatim, with one home.
- **`components/FilterDisclosure/`** — **extracted** from `SectorFilter`,
  which is a departure from this file's own Work item and is argued rather
  than skipped: what that component held was a trigger, a panel and four
  dismissals, none of which is about sectors, and its own docblock already
  carried the argument against writing it twice (_two controls side by side
  that were built twice are two controls that drift_). `SectorFilter` is now
  twelve links and a value; `BandFilter` is five links, four of them toggles,
  and a value that stops spelling the vocabulary out at three bands for a
  measured width reason.
- **`renderer-canvas.ts`** — one `renarrow(pinned)` shared by `setFilter` and
  `setBands`, the `button`/`isPrimary` guard, and a pin released when a
  selection is let go.
- **`MarketTopology.tsx`** — `appliedBands` (a ref, read from effects only),
  a band-blind account at render, and a second imperative writer at reader
  cadence.

### Decisions this file left open

1. **A second control beside the sector's, not a combined one.** The two axes
   are different kinds of criterion and a reader stacks them, so two triggers
   each naming their own subject is what says _sector AND band_. One combined
   trigger would have to name both values in one `nowrap` string, which is
   width this header does not have at 390.
2. **All four `ANOMALY_BANDS` are offered and `"unscored"` is not.** It is the
   absence of a score rather than a reading of one, so offering it would make
   _we have no answer_ look like a fifth kind of answer; what this product says
   about that state is the refusal.
3. **An unrecognised value in EITHER parameter applies no cut at all**, and the
   words name which parameter was not understood (`Not a band we score — the
whole market is drawn`). A partially-honoured address a reader mistyped is the
   silent snap `readTopologyFilter` already refuses one level up.
4. **The population count excludes a pinned selection.** The figure is the
   criterion's own answer; the drawn set can be one larger, and the selection
   itself is what says why.

### What went red, and what that proved

- `overview-market-topology-keyboard.spec.ts`' `tabToCanvas` asserted **3** and
  is now **4** — the second time in two tasks that assertion has done exactly
  what its docblock says it is for.
- `overview-market-topology-hover.spec.ts`' four exhaustive `regionControls`
  enumerations each gained an entry, for the third time.
- **`every-break-can-still-land` caught a break rotting in the same run that
  rotted it**: `a-second-topology-layout-call-site` pointed at a line
  `renarrow` had just absorbed. Repointed.
- **`no-imputed-zero-in-a-figure` caught a real `?? 0`** on `matched` in the
  words builder — _none of the 501 are extreme_ and _we did not count_ are two
  claims and the second must never be drawn as the first. Replaced with a
  proven-unreachable branch.
- **The refusal arm went red against the real backend, and the red was the
  feature working.** See below.

### Measured

- **A band cut drawn, on a real store, for the first time anywhere**:
  `/?band=high,extreme` on this developer's own populated store reads `122 of
the 501 companies we track are high or extreme`, consistent with Task 6.3.1's
  measured session (21.9% + 3.3% of 485 ≈ 122). Photographed at 1440, 1024 and
  390 with `?sector=technology&band=high,extreme`: `73 of the 501 companies we
track are in Technology, and 11 of those are high or extreme`, eleven ringed
  nodes drawn, ten muted benchmarks, and the picture reads as designed at every
  width.
- **The refusal against a real `pnpm store:bare` run**, which is this file's own
  Work item and the one thing that could not be assumed. A backend on
  `marketpulse_bare` serves an `overview` frame with `anomalyBands present:
false`, read off the socket; a browser against it draws, verbatim:

  ```
  /?band=high,extreme
    note line : "Nothing here has been scored yet, so the graph can't be narrowed by band."
    band ctrl : "Band high or extreme"
  /?sector=energy&band=extreme
    note line : "21 of the 501 companies we track are in Energy. Nothing here has been scored yet, so the graph can't be narrowed by band."
  /?sector=energy
    note line : "21 of the 501 companies we track — Energy"
  page errors: []
  ```

- **The chrome's cost, and the seven pixels that decided it** —
  `TOPOLOGY.md` §9.5 carries the table. 1440 and 768 unchanged; 1024 restored
  to the baseline by a 4 px column gap; 390 loses 36 px of canvas and no page
  movement at any width.
- **The burst arm with a filter active**: 0 frames over 50 ms across 3 bursts,
  worst rAF gap 17.6–17.7 ms, indistinguishable from the two unfiltered arms
  in the same run.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
