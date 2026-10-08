# Task 4.5.5 — Movers on the landing page

**Status:** **Complete — 2026-10-08.** The region draws, the page grew exactly as predicted (**+363 at 768, +345 at 390, nothing at 1440 or 1024**), and the disc is proved on a movers row through the shipped socket path — with the omission produced and the spec confirmed red on it. **The brief was silent on where a row's COMPANY NAME comes from**, and the frame does not carry one: the landing page now reads the universe, measured at **20,034 gzipped bytes**. The subscription churn was measured over three real sessions at **0.21–0.44 membership changes a minute** and the current top-N is subscribed to. An existing assertion in `overview-frame-sections.spec.ts` was **legitimately falsified** by the widened subscription and was rewritten as two claims.
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

---

## What was done — 2026-10-08

### The region fills

`marketMovers` in `apps/frontend/src/market/movers.ts` reads the frame's
section into the view the component already took, `sector-performance.ts`'
shape with two differences, both recorded in the file:

- **An empty section is not the absence.** `sectorPerformance` treats
  `sectors: []` as _no section_, because eleven benchmarks are a roster; a
  movers list's membership is an **answer**, so two empty lists are drawn — ten
  held rows under two headings — rather than reserved invisibly. That state is
  CI's permanent one, most of a weekend and the first minute of every session.
- **The rank is a count over the order the producer sent**, never a comparison.
  A figure with no ranking key gets no rank and `RankedList` drops it, which is
  the honest end of a producer defect rather than a state to draw.

`awaiting="Story 4.5"` is gone; `filledBy` now renders only in the rollback
state (a frame present with no section) and its **wording is untouched**, with
a comment saying 4.5.6 owns it.

### The price cell, and the labelling decision it forced

`SectorRow.price` — optional, for `held`'s reason, so the eleven sector rows
say nothing about it — read from **`price` on an observed figure and `close` on
a stored one**. The cell is `RankedList`'s fourth child in the mover anatomy,
auto-placing into the 80 px track Task 4.5.3 reserved, and **`display: none` at
<37rem**, which is the owner's Gate 1 decision and also the `.bar` trap: a
fifth grid item in a four-track `subgrid` becomes a second row of the `<li>`,
+7 px on every row.

**It carries no session, no instant and no noun.** The argument and the
condition-shaped reversal trigger are on the field in `sector-performance.ts`;
the short form is that the basis is uniform over the section by construction,
so it is one claim about the region with one home — Task 4.5.6's footer — and
the 80 px track cannot hold `2026-10-07 close` (82 px measured) anyway. **The
constraint was written into `TASK-06`'s own file**, in words it can act on.

### The company name — the gap the brief did not have

**The frame carries no name.** `WireOverviewFigure` is a symbol, a state and a
figure, and the story's own acceptance wants the company name on the row; the
80-character flexible name track exists for it. Nothing in Tasks 4.5.1–4.5.4
decided where it comes from.

Taken: **the route reads the tracked universe** through the `useSecurities`
hook the Security Explorer already uses, and `marketMovers` takes a
`symbol → name` lookup, labelling a symbol it does not know **with itself**
(`labelOf`'s rule). Measured on the dev pair: `GET /securities` is **190,701
bytes, 20,034 gzipped, 124 ms**, with an `ETag` and `cache-control: private,
no-cache`, so a second load revalidates to a 304.

Rejected: **the name on the wire** — a fact that never changes, re-sent at the
cadence of the most volatile thing on the page, on a type the proxy and sector
sections share and neither needs. Rejected: **a narrower endpoint**, as
premature at one consumer. **Reversal trigger**: the first surface on this
screen needing a _second_ field from the universe.

The failure is quiet by construction: an unreachable universe leaves every row
labelled with its ticker and changes nothing else — no sentence, no retry.

### `symbolKey`, and the churn measured before it was chosen

The movers' ten are in the key, through `moverSymbols(overview)` — taken from
the **frame**, so the held pads' non-breaking spaces can never reach a
`subscribe`.

A throwaway instrument (deleted) replayed `market_bars` minute by minute over
the 503 tracked equities, reproduced the five-minute eligibility window and ran
the **shipped** `selectMovers` at `MOVERS_PER_SIDE`:

| session    | minutes | membership changes | per minute | entering/leaving | distinct names drawn | monotonic-union resubscribes |
| ---------- | ------- | ------------------ | ---------- | ---------------- | -------------------- | ---------------------------- |
| 2026-09-11 | 390     | 171                | **0.44**   | 209 / 209        | 39 of 514            | 18 (0.05/min)                |
| 2026-09-10 | 390     | 105                | **0.27**   | 136 / 136        | 39 of 514            | 24 (0.06/min)                |
| 2026-09-04 | 390     | 83                 | **0.21**   | 92 / 92          | 22 of 514            | 12 (0.03/min)                |

Busiest ten-minute block across the three: **10 changes**, just after the open.

**Decided: subscribe to the current top-N.** 0.21–0.44 gateway rebuilds a
minute per browser against the sixteen a minute it performs anyway — **under
3%** — for a subscription that is exactly the set on screen.

**Alternative measured and rejected: the monotonic union** (every name the
lists have drawn since the page opened). Cheaper on resubscribes — 12–24 a
session — and it settles at 22–39 names, but those names then stream bars the
page draws nothing from for the rest of the session, the subscription stops
being _what this screen is showing_, and nothing bounds the union on a volatile
day.

**Reversal trigger**, as a condition: a measured membership rate above ~4 a
minute sustained over a session, **or** a second churning section on this
frame — two of them multiply on one key rather than adding.

What the instrument **cannot** see, stated rather than implied: the gateway
recomputes up to sixteen times a minute and a minute's bars may arrive across
more than one batch, so intra-minute churn is not in these figures. The
per-minute rate is a floor.

### The growth, measured at all four widths

Before (this task's own reading, matching the brief's) and after, in pixels,
`pnpm probe /`:

| width | region         | before | after    | moved    |
| ----- | -------------- | ------ | -------- | -------- |
| 1440  | **Movers**     | 486    | **486**  | **0**    |
| 1440  | Sectors        | 486    | 486      | 0        |
| 1440  | Breadth        | 486    | 486      | 0        |
| 1440  | `main`         | 1646   | **1646** | **0**    |
| 1024  | **Movers**     | 486    | **486**  | **0**    |
| 1024  | `main`         | 1646   | **1646** | **0**    |
| 768   | **Movers**     | 103    | **466**  | **+363** |
| 768   | Sectors        | 486    | 486      | 0        |
| 768   | Breadth        | 475    | 475      | 0        |
| 768   | Topology       | 121    | 121      | 0        |
| 768   | Unusual        | 103    | 103      | 0        |
| 768   | Investigations | 103    | 103      | 0        |
| 768   | source note    | 53     | 53       | 0        |
| 768   | `main`         | 1996   | **2359** | **+363** |
| 390   | **Movers**     | 121    | **466**  | **+345** |
| 390   | Sectors        | 462    | 462      | 0        |
| 390   | Breadth        | 475    | 475      | 0        |
| 390   | Topology       | 139    | 139      | 0        |
| 390   | Unusual        | 139    | 139      | 0        |
| 390   | Investigations | 121    | 121      | 0        |
| 390   | source note    | 105    | 105      | 0        |
| 390   | `main`         | 2220   | **2565** | **+345** |

**The prediction held to the pixel**: 486 / 486 / 466 / 466, nothing moves at
1440 or 1024, and **every box below the region is the same size as it was** —
the three remaining reserved panels and the source note only move down, by
exactly the region's growth.

**The pictures were looked at**, at all four widths, by photographing the
region itself (the probe's screenshots are viewport-sized and the region is
below the fold at 1440). Nothing is clipped: at 1440 and 768 the longest name
on screen sets in full; at 390 the price is gone, the names ellipsise and the
rows are still 26 px, so the region is 466 at every width. The figures read
`▲ +12.44%` and `▼ −3.76%` with **U+2212**, confirmed from the DOM rather than
from the picture.

A row's accessible text is `1 HPE Hewlett Packard Enterprise Company 62.09 ▲ up
+12.44%` — the row in the order it is drawn, with the price in it.

### The disc, proved in a browser

`e2e/specs/overview-frame-sections.spec.ts` gains a fourth test: the harness
serves a movers section of four real universe symbols, the page subscribes, a
bar is pushed for `NVDA`, and the mark appears keyed on that observation's
identity with **no other row in the region marked**.

**The defect was produced and the test confirmed red on it.** With
`moverSymbols(overview)` removed from the symbol key, the run fails at the
harness's refusal rather than at a missing element:

> `Error: the page has not subscribed to NVDA — it asked for DIA, IWM, QQQ, SPY, XLB, XLC, XLE, XLF, XLI, XLK, XLP, XLRE, XLU, XLV, XLY.`

### What the change falsified in an existing spec

**The pass-through test's subscription assertion could no longer be an
equality.** It asserted the page asks the real gateway for exactly
`PROXIES + SECTOR_BENCHMARKS`; the subscription is now those fifteen **plus
whatever the lists currently name** — up to ten more on a store with bars, none
on CI. It is also newly flaky in principle, because membership changes during a
session and the union of everything ever subscribed legitimately exceeds the
latest frame's set.

Rewritten as **two** claims, neither weaker than the original: every one of the
fifteen is subscribed to (the omission half), and **nothing is subscribed to
that no frame ever named** (the flood half — a hard-coded list, the whole
universe, or a symbol read off the drawn rows all fail it).

### The stories, re-pointed

Task 4.5.3's header recorded that its views were typed because no reader
existed, and that **Task 4.5.4 owed this file a re-point**. 4.5.4 did not take
it; it is taken here. Every `view` in `Movers.stories.tsx` is now a real
`WireMarketMovers` section put through `marketMovers`, so the change string,
the direction and the price are all derived the way the application derives
them — and no story can hold a price that disagrees with its figure's state.

### No new check, and therefore no new break

Nothing mechanical was added: the claim this task could get wrong is _the page
subscribes to the symbols the frame names_, which is a browser-level fact and
is now asserted by a spec that was produced red against the real defect. The
`each-overview-section-names-its-own-set` invariant already covers the producer
half.

### What shipped open

- **The empty state still says nothing**, and it is now reachable on every
  gated run rather than only photographable: with no bars the frame carries a
  movers section with two empty lists, so the region draws 466 px of labelled,
  empty box and the `filledBy` sentence is correctly absent. `docs/GAPS.md`
  entry 13, owned by **Task 4.5.6** done-when 4, with the change in reachability
  written into that task's file.
- **The price's basis is unstated on screen** until 4.5.6's footer states it.
  Handed over with its measurement and its reversal trigger.
- **The `securities we track` copy defect** is untouched by decision, and is
  now rarer: it renders only in the rollback state.
