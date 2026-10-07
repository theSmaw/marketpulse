# Task 4.4.2 — One direction, one home

**Status:** Not started
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** nothing — runs beside 4.4.1

## Objective

**Breadth is counted on the backend and the rule for which bucket a figure falls
into lives in the frontend.** `directionOf` and `PRICE_DIRECTIONS` are in
`apps/frontend/src/market/price-format.ts`, unreachable from a backend producer —
so without this task the classification gets written a second time, and the second
one is the one that drifts.

**This is the `changeFromClose` precedent firing exactly as recorded.**
`price-format.ts`'s own note says `PriceDirection` is _"not in
`@marketpulse/shared` … the direction of a move is arithmetic on a number both
sides already hold"_ — **that sentence expires here**, and the task is to retire
it rather than work around it.

**And the rounding expression already has two homes.**
`Number(percent.toFixed(PERCENT_DISPLAY_DECIMALS))` appears in `directionOf` and
in `displayedPercent`. Breadth would be the third. One helper, one home.

## What the user can see when this lands

**Nothing.** A move with no behaviour change, proved by the suite staying green.
Task 4.4.5 is the payoff.

## Work

- **Move `PRICE_DIRECTIONS`, `PriceDirection` and `directionOf` to
  `packages/shared`**, beside `displayedPercent`, and collapse the duplicated
  rounding into one helper both call.
- **`price-format.ts` re-exports or imports** so no component changes — the
  frontend's public surface is unchanged and `PriceChange` keeps its own spoken
  words.
- **The classification is keyed on the DISPLAYED figure**, not the raw sign, and
  this is the decision to preserve rather than rediscover: a `+0.004%` move prints
  `0.00%`, and an up arrow beside it is _three channels disagreeing with each
  other_ — `price-format.ts`'s own words. A breadth count on the raw sign would
  call that security an advancer while the sector row prints `0.00%`.
- **A non-finite move is not classifiable.** `directionOf(NaN)` returns
  `"unchanged"` today, because `NaN > 0` and `NaN < 0` are both false — so a
  naive breadth count **silently counts non-finite figures as unchanged**.
  `sectorRankingKey` closes exactly this gap in-process and says why; close it
  here, once, rather than in each caller.
- **A check that there is one classifier**, because the existing three cannot see
  a second one: `one-producer-of-the-overview-aggregate` counts join call sites,
  and `one-home-for-the-live-change`'s third clause keys on **a division by a
  close** — a count classifies by **comparison**, so it has no division to match.
  **A check owes a break**, and write the file the next author would write first.

## Done when

1. One module exports the direction vocabulary and one function decides it, with
   no second rounding expression anywhere
2. `directionOf(NaN)`, `directionOf(Infinity)` and `directionOf(-Infinity)` are
   not `"unchanged"` — asserted
3. A check fails when a second classifier is written, proved by writing one
4. `pnpm verify` is green with no component changed
