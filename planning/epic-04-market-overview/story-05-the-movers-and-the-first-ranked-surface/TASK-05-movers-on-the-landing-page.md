# Task 4.5.5 — Movers on the landing page

**Status:** Not started
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** 4.5.3, 4.5.4

## Objective

**The region stops saying what it is waiting for.** This is the task the story
exists for and the first thing on the landing page that answers _where should I
look_.

## What the user can see when this lands

**Two ranked lists on `/`, moving.** `GAINERS` and `LOSERS`, five rows each,
every row carrying its rank, its ticker, its company name, its price and its
change — re-ordering as the session runs, with the arrival disc firing on the
row whose bar arrived.

**What they still cannot do:** click a mover through to its security page. That
is Story 4.6, deliberately next, because a list of names nobody can open is a
list that invites the wrong repair.

## Work

### The region fills

Replace the `reserved` panel in `MarketOverview.tsx` with the component from
4.5.3, reading the frame's section through a reader in `apps/frontend/src/market/`
in `sector-performance.ts`' shape. `awaiting="Story 4.5"` goes.

### `symbolKey` owes a line, and this one has a cost sectors did not

`MarketOverview.tsx`'s subscription key is built from `overview.figures` and
`overview.sectors`, and the rule is written beside it: **a section added to this
frame owes a line here, because a region that draws a live figure or an arrival
mark from `observations` is drawing from a map this effect fills.** Omit the
movers and `observations.get(symbol)` is permanently `undefined`, so **the
arrival disc can never fire on the deployed page** — Task 4.3.6's shipped defect,
invisible at every level below a pass-through browser spec.

**But movers' membership is dynamic and sectors' was not.** The key is
`symbols.sort().join(",")`, so a pure re-rank is free — measured at sectors: 16
re-ranks produced **0** resubscribes. A **membership change** is not: each one
sends a fresh `subscribe`, and `market-gateway.ts` answers every `subscribe`
with a snapshot **plus a full `overviewMessage()` rebuild** — the ~3.5 ms join,
per browser.

**Measure the churn before choosing.** Count membership changes per minute off
recorded frames, then decide between subscribing to the current top-N and
subscribing to a stable superset. **Record the decision with its alternatives
and a condition-shaped reversal trigger.** Do not reason about it — Task 4.4.1
instrumented the analogous question and the number decided it.

### The growth at 768 and 390, measured and reported before the merge

The rule that replaced Task 4.1.4's: _a reserved region's floor is set by the
change that DRAWS its content, and that change measures and reports the movement
before it merges._

Measured on 2026-10-08, before:

| width | `Movers` | `Sector performance` | `Market breadth` |
| ----- | -------- | -------------------- | ---------------- |
| 1440  | 486      | 486                  | 486              |
| 1024  | 486      | 486                  | 486              |
| 768   | **103**  | 486                  | 475              |
| 390   | **121**  | 462                  | 475              |

**Predicted after: 486 / 486 / ~466 / ~466**, so **nothing moves at 1440 and
1024** (rows 2 and 3 share one `fr`) and the page grows by roughly **+363** and
**+345**. Movers has no bar and therefore no ladder, so unlike sectors it should
come out the **same height at all four widths** — a nice property and an
assertable one. **It is a prediction, not a measurement.** Take the full
before/after table at all four widths, confirm everything that moved below it is
another reserved panel or the source note, and **look at the screenshots** —
the box figures alone cannot show a clipped glyph.

### Boundaries

Not the denominator sentence (4.5.6) — reserve its room and leave it empty. Not
the hold's re-check at two lists (4.5.7). Not the spec or the grid (4.5.8).

## Done when

1. `/` draws two ranked lists with real figures against a store with bars, at all
   four widths
2. The arrival disc fires on a movers row against the shipped socket path,
   asserted in a browser rather than reasoned
3. The subscription decision is recorded with its measured churn figure, its
   alternatives and a condition-shaped reversal trigger
4. The before/after height table is in this file at all four widths, with the
   screenshots looked at
5. `pnpm verify` and `pnpm e2e` green

## Handed here by Task 4.5.3 — 2026-10-08: the region's height is measured, and your prediction holds

**`466 px, at all four widths, in every shipped state.`** Taken with
`pnpm probe --story market-movers--*` on 2026-10-08, inside a `Region` as this
route draws it:

| state                       | 1440    | 1024    | 768     | 390     |
| --------------------------- | ------- | ------- | ------- | ------- |
| both ends full (5 and 5)    | **466** | **466** | **466** | **466** |
| a one-sided day (5 and 2)   | **466** | **466** | **466** | **466** |
| one rankable name (1 and 0) | **466** | **466** | **466** | **466** |
| nothing rankable (0 and 0)  | **466** | **466** | **466** | **466** |
| before the first frame      | **466** | **466** | **466** | **466** |
| a sixth row each way        | 520     | 520     | 520     | 520     |

So **your prediction of `~466` at 768 and 390 is confirmed to the pixel**, the
region is the same height at all four widths as you expected (no bar, so no
ladder, so no 390 exception), and **the one-sided day moves nothing** — each
list is padded to five with held rows.

**What you still owe is the page**, not the region: the before/after table for
`/` at all four widths, with everything that moved identified, and the
screenshots looked at. At 1440 and 1024 the rows are tied and nothing should
move at all; at 768 and 390 the page grows by roughly the 466 less the 121/103
the reserved panel holds today.

**Three things to wire.** `<Movers view={…} />` in the region's body,
`<MoversMeta />` in its `meta` slot — it takes no props today and
`MoversReservation` is the body when no frame has arrived, exactly as the sector
region does it. The head slot reserves **100 px**, which is
`SectorPerformance.slot`'s measured badge width, and `TOP 5 EACH WAY` measures
**98×16** at both 1440 and 390 — so Task 4.5.7's badge fits the slot it already
has, with 2 px to spare on the string beside it.
