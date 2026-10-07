# Task 4.4.1 — The arrival mark that cannot fire, and the filter that would flood the strip

**Status:** Not started
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** nothing

## Objective

**Two defects in one file, found by shaping this story rather than by any
check — and the second one is a trap the next task springs.**

**1. The sector arrival mark is dead code in production.** The landing route
subscribes to `overview.figures` only — `MarketOverview.tsx`'s `symbolKey` is the
four proxies — and the gateway scopes both `bars` and `snapshot` to what a client
asked for (`if (!wanted.has(…)) continue`). The eleven sector ETFs ride in
`overview.sectors`, **which never reaches the subscription**. So
`observations.get("XLK")` is permanently `undefined`, and the arrival mark Story
4.3 designed, drew, tested and shipped **can never fire on the deployed page.**

**It is invisible to every test**: the unit tests hand `sectorPerformance` an
observations map directly, and the browser specs furnish their own frames. It is
the furnished-fixture lesson one layer below where Task 4.3.8 caught it.

**2. The proxy filter is a NEGATIVE membership test, and Task 4.4.4 widens the
join to 518.** `index.ts` splits the join's answer with
`entries.filter((e) => !isSectorSymbol.has(e.symbol))`. Widen `symbols` and
**every non-sector security lands in `overview.figures`** — hundreds of cells in
the strip, a ~56 KB frame, and `newest`, `sharedBasis` and `sharedClosingSession`
folding over 507 figures. **No compile error, no failing test.** Story 4.3's
comment there warns against a _slice_ and does not cover this, because the sector
predicate is positive and the proxy one is not.

## What the user can see when this lands

**The arrival mark starts firing on the sector rows** — a disc beside a sector
whose bar has just arrived, which is what Story 4.3 intended and never delivered.
**On a live feed only**: CI's store has zero bars, so no gated machine will ever
show it.

## Work

- **Decide how the eleven reach the subscription.** The obvious repair is to
  include the sector symbols in `symbolKey`, and it has a cost: `MarketOverview.tsx`'s
  own docblock argues that a changing symbol list pushes a new array into `App`'s
  state and re-renders the tree. Fifteen symbols rather than four is small, but
  **measure it rather than assuming** — Task 3.6.5 spent two memo boundaries
  removing a per-tick cost on the neighbouring page.
- **Rewrite the proxy filter as a POSITIVE membership test**, so widening the
  join cannot flood `figures`. Everything that lands in a _section_ is positive
  membership; only breadth reads the whole answer.
- **A guard for the thing that has no symptom**: the frame carries exactly four
  figures. The assertion belongs on a **pass-through** spec — one that records
  what this product's own server sent — because a furnished frame cannot see it.
  `overview-sector-ranking.spec.ts` is the shape. **A check owes a break.**
- **Do not widen the join here.** That is Task 4.4.4's, and doing it before the
  filter is positive is the defect this task exists to prevent.

## Done when

1. A sector row's arrival mark fires against a driven frame in a browser —
   asserted, not reasoned
2. The proxy split is a positive membership test, and a comment says why
3. A pass-through assertion holds `figures` at exactly four, with a break that
   goes red when the filter is inverted
4. The subscription's cost is measured, not assumed, and the figure recorded
