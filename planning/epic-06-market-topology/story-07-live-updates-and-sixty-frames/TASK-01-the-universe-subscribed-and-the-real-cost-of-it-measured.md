# Task 6.7.1 — The universe subscribed, and the real cost of it measured

**Status:** Not started
**Story:** [6.7 Live Updates, & the Graph That Stays at 60 FPS](STORY.md)
**Depends on:** nothing in this story (Story 6.6 merged)

## Objective

Open Decision 0 (new at this story's own Gate 1) settled that `/` widens its
live subscription from ~25–30 symbols (the four proxies, eleven sectors,
ten movers, five unusual) to the full tracked universe. Every other task in
this story depends on that data existing. This task takes the decision,
measures its real cost — which nobody has taken, because the existing
per-batch browser-cost figure (3.7–5.1 ms) was measured at ~30
observations — and confirms the three existing memo boundaries
(`sectors`/`movers`/`unusual`) stay cheap at a 516-entry map.

## What the user can see when this lands

Nothing new — this is the data foundation the rest of the story needs. No
visible change to `/`.

## Work

- **Widen the subscription.** `MarketOverview.tsx`'s `symbolKey` currently
  unions `figures` + `sectors` + `moverSymbols` + `unusualSymbols`. Change
  it to the full tracked universe — `trackedTickers()` (Task 4.4.4's own
  call site, the one positive-membership list this product already has) —
  so `liveFeed.observations` holds a bar for all 516 rather than ~30.
- **Re-measure `/`'s per-batch browser cost at 516 observations**, against
  the existing 3.7–5.1 ms figure (Task 4.8.6, taken at ~30). Use the same
  three-channel method (`longtask`, `long-animation-frame`, an rAF-gap
  recorder), each proved by a plant, with a quiet control at the same
  cadence.
- **Confirm the three memo boundaries stay cheap.** `sectors`, `movers` and
  `unusual` in `MarketOverview.tsx` all take `observations` as a
  dependency; their own lookups are per-row rather than per-map, so the
  expectation is no new cost — confirm rather than assume, with the same
  measurement pass above.
- **Measure the resubscribe-rate consequence.** The existing 12–24
  resubscribes a session exist because the movers/unusual sets re-rank and
  the subscribe key is the symbol list; a fixed, universe-wide subscription
  should not need to change when rankings shift. Take the real figure
  against a produced re-rank.
- **Confirm the gateway's own scoping composes.** `market-gateway.ts`'s
  `wanted.has(...)` check already generalises to a larger `wanted` set —
  confirm with a real connection at 516 subscribed rather than assuming the
  existing code path scales for free.

## Done when

1. `/` subscribes to the full tracked universe; `liveFeed.observations`
   holds up to 516 entries on a real connection.
2. The real per-batch browser cost at 516 observations is measured and
   recorded, compared against the existing ~30-observation figure.
3. The three memo boundaries are confirmed cheap at the new scale, with a
   measurement rather than an assertion.
4. The resubscribe-rate consequence is measured against a produced
   re-rank.
5. `pnpm verify`, `pnpm test:database` (if touched) are green; the
   existing live-feed test suite is extended to cover the widened
   subscription rather than merely not broken by it.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->
