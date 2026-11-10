# Task 6.7.3 — Per-node facts in the plate: staleness and direction

**Status:** Not started
**Story:** [6.7 Live Updates, & the Graph That Stays at 60 FPS](STORY.md)
**Depends on:** 6.7.1

## Objective

Open Decision 2 settled on per-node staleness as text in the readout
plate, never as node ink. The Task 6.6.2 hand-off (§10's `Intensity`
encoding) settled on taking signed direction, also in the plate, rather
than a new node-level channel. Both are powered by Task 6.7.1's widened
subscription, which is what lets either reach any selected node rather
than only the ~25–30 a narrower subscription would have covered.

## What the user can see when this lands

Selecting any node now shows, in its plate: when that security was last
heard from (an instant, no threshold, no status word), and — where the
node carries a `high`/`extreme` band — whether its current anomaly is a
rise or a fall, not just a magnitude.

## Work

- **The staleness line.** `observations.get(symbol)?.startsAt` is the raw
  instant; the honest figure is the observation interval's **end**
  (`startsAt + interval`), per Task 3.3.4's own fixed defect and
  `measured-set.ts`'s existing discipline — read from there rather than
  re-deriving. No threshold, no status word, no connection word: an age,
  stated plainly, matching `UniverseTable`'s own `Live price from 12:07`
  idiom.
- **The direction line.** Derive sign from the node's own observation
  (the composite score's own price factor is a magnitude via `Math.abs` —
  confirm the cheapest correct source of sign against the shipped
  composite/band pipeline rather than assuming one). Shown only where the node already
  carries a `high`/`extreme` band — never a new encoding on `normal`/
  `elevated`/`unscored` nodes. §10's `Intensity` is closed in writing: the
  full per-equity encoding refused, the sign taken, both recorded in
  `TOPOLOGY.md`.
- **The region's own accessible sentence states its population.** AC7's
  rewritten form: the sentence already states counts elsewhere
  (`topologyAnomalySentence`); extend it so a third of the graph drawing
  `unscored` is never silently read as "a third of the graph is broken" —
  the same discipline `Market breadth`'s and `Movers`' sentences already
  apply.
- **`pnpm probe` re-check of the plate's own height.** The plate reserves
  five line slots today; two new (conditional) lines may grow it. Measure
  before assuming it's free — this region's own displacement trigger
  (`MARKET-OVERVIEW.md` §1.4) has already fired twice.
- **Selection reaching the route, if needed.** If sourcing per-node facts
  needs the selected symbol outside the renderer, use the existing
  `onSelect` report (the same path `openable` already uses) — a lift of
  the renderer's own fact, never a second selection mechanism. Confirm in
  the record that Story 6.4's hand-off trigger stays unfired either way
  (already evaluated at Gate 1; re-confirm against what's actually built).

## Done when

1. A selected node's plate states its own staleness as an instant, with no
   threshold, status word or connection word.
2. A selected `high`/`extreme` node's plate states its direction (rise or
   fall); other bands show no direction line.
3. §10's `Intensity` encoding is closed with a one-line record in
   `TOPOLOGY.md`, matching Story 6.6's own `shape/icon` closure.
4. The region's accessible sentence states its own heard-from population.
5. `pnpm probe` confirms the plate's own height and the region's one-height
   property, at all four widths, before and after.
6. `pnpm verify` green; new tests cover both lines' presence/absence logic
   at the component level, and the real population figure
   (`breadth.measured`/501 over the 5-minute window) is taken from the
   deployment at least once and recorded.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
