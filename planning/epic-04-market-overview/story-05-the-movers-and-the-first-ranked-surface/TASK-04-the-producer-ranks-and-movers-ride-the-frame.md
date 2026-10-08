# Task 4.5.4 — The producer ranks, and movers ride the frame

**Status:** Not started
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** 4.5.2

## Objective

**The top-N is computed where the join already is, over the set breadth already
counts, and ships the answer rather than its input.**

## What the user can see when this lands

**Nothing.** The frame grows a section nothing reads yet. Task 4.5.5 draws it.

## Work

### The population is the 503 equities, and the binding already exists

```ts
const equities = entries.filter((entry) => isEquitySymbol.has(entry.symbol));
```

**Verified against the live store on 2026-10-08: `{equity: 503, index_etf: 4,
sector_etf: 11}`, and `active equities: 503`.** So the equity set contains **no
fund at all**, and a mover duplicating a proxy or a sector row is
**structurally impossible** rather than merely unlikely.

**Record the reason correctly rather than inheriting breadth's.** Breadth chose
503 because a count including `SPY` beside its own constituents is
non-independent with `Market proxies` and shifts the figure by up to ~2.9
points. **That argument is near-vacuous for a ranking** — a diversified fund is
an average of its constituents and essentially never out-moves the most extreme
name it holds. The reasons that do carry are **one fact has one home** (`XLE`
drawn a third time, 24 px from the sector row asserting the same figure) and
**checkable agreement** (one population makes the agreements below true by
construction rather than approximate).

### Agreeing with breadth by construction means one input, ideally one pass

Three candidate meanings, weakest first: **one `asOf`** (necessary, nowhere near
sufficient — two filters can still disagree about _who_); **one input array**
(the sufficient claim, and free); **one traversal** (the honest version).

The thing that can actually drift is **not the loop, it is the predicate**.
`observedBreadth` embeds `state === "live"`, the window on `bar.startsAt`, and
`change.percent !== null`; `sessionBreadth` embeds two more. A `topMovers` that
re-writes either set is a **second home for the window**, and the window is what
the denominator sentence is written from.

**Extract the eligibility pass once and consume it twice.** Then `eligible` on
the movers section and `measured` on the breadth section are literally the same
length and the two drawn figures cannot disagree. Two caveats: **`measured` must
stay the sum of breadth's accumulators** (its docblock makes that a property of
the single pass and `readBreadth`'s first cross-field check depends on it); and
the refactor can turn **`breadth-is-counted-over-the-equities-alone` red on the
desired state** — it greps for one `const equities =` line naming
`isEquitySymbol` and one `breadth:` line naming `equities`. **Re-scope it
deliberately; never widen the regex.**

### The wire — a two-member union, for breadth's reason

```ts
export type WireMarketMovers = WireObservedMovers | WireSessionMovers;

interface WireMoverLists {
  readonly gainers: readonly WireOverviewFigure[]; // strongest first
  readonly losers: readonly WireOverviewFigure[]; // weakest first
  readonly eligible: number; // the set the lists are a selection FROM
  readonly tracked: number; // the 503, counted never named
}
export interface WireObservedMovers extends WireMoverLists {
  readonly basis: "observed";
  readonly windowMinutes: number;
}
export interface WireSessionMovers extends WireMoverLists {
  readonly basis: "session";
  readonly session: string;
}
```

- **No `rank` field.** The order **is** the answer; a rank on the wire is a
  second home for the array's own order and the two can disagree.
- **Rows reuse `WireOverviewFigure`** rather than a dedicated shape. The session
  fallback makes a mover row a `stored` figure and the union already spells
  that; `moveRankingKey` already answers _which field this state's move lives
  in_; and ADR 0031's leak surface is per field map, so reuse adds none. Measured
  cost of the choice: **146.7 B/row against 68.7**, i.e. ~5,420 B against ~4,000
  for the whole frame.
- **`eligible` is the section's own field, not a read of `breadth.measured`.**
  `encodeBreadth` drops the **whole breadth section** on one non-finite count,
  and a ranked list with no denominator is the one thing this story must not
  ship. Self-containment costs two spellings of one number, answered by the
  single pass above rather than by a cross-section check — which would make
  `movers` unreadable whenever `breadth` is dropped.
- **Required on the producer, optional on the wire** — breadth's asymmetry, for
  its recorded reason: a frame carrying figures and no section leaves the
  region's `waiting` false, so the 2,000 ms silence floor never fires and the
  panel sits reserved and **silent for ever**. That is Task 4.3.8's produced
  defect. A missing property must be a compile error at the one call site.
- **`MARKET_STREAM_PROTOCOL_VERSION` stays at 1**, for ADR 0038's recorded
  reason: bumping makes a stale tab reject **every** frame rather than ignore one.

### `WireFields` — one free tripwire and one real trap

**Free:** adding `movers?` to `WireMarketOverview` without adding `"movers"` to
`overviewFields`' `Omit` is a **compile error naming the field**, because
`WireFields<T>` is total over `keyof T`.

**The trap: TWO maps, one per union member, never one over the union.** `keyof`
a union is the **intersection** of its members' keys, so a single map would cover
the shared five and wave **`windowMinutes` and `session` through unexamined** —
the two discriminating fields. Copy `observedBreadthFields`/`sessionBreadthFields`
verbatim in shape.

`encodeMovers` drops **the whole section** on a non-finite `eligible`, `tracked`
or `windowMinutes`, with an exhaustive `switch` on `basis` and a `never` default.
The guard lives in the serialiser, so the producer module contains **no
`Number.isFinite`**, deliberately — one rule, one home.

### `readMovers` — what a cross-field check must refuse

| Refuse                                                                  | Why                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gainers.length + losers.length > eligible`                             | A selection cannot exceed the set it is from                                                                                                                                                                        |
| `eligible > tracked`                                                    | `readBreadth`'s rule — a negative remainder counts securities that cannot exist                                                                                                                                     |
| the same symbol in both lists                                           | Reachable whenever `eligible < 2N`; breaks the hold's pin and draws a visible contradiction                                                                                                                         |
| either list not monotonic **at displayed precision**                    | **The strongest available**, and the one that catches the failure 4.3 and 4.4 both paid for: the order is computed server-side, so a reader that does not verify it cannot tell a ranked frame from a furnished one |
| a figure with no ranking key in either list                             | A top-N is a **selection**; a keyless member means a `?? 0`                                                                                                                                                         |
| `observed` with no finite `windowMinutes`, or `session` with no session | A figure nobody can qualify, refused rather than defaulted                                                                                                                                                          |

**Do not refuse on sign** — whether a gainer may carry a negative move is a
product rule, and Gate 1 settled it the other way: each list holds only rows
whose `directionOf` matches it, so the lists are disjoint by construction.

### The ADR, and the citation that is wrong

**The owner's Gate 1 decision: amend ADR 0038 here.** `"smallest thing"` appears
**nowhere in `docs/adr/`** — verified — yet this story's own file cites _"ADR
0038's grain rule"_ for it. The rule lives in Story 4.3's `STORY.md` as a rule
4.3 was told to _state_, and **ADR 0038 line 228 hands that same decision to
Story 4.3 to re-take**: _"One frame type per region. … Story 4.3 re-takes this."_
4.3 answered by shipping a nested optional section and never amended the ADR, so
a reader who checks the citation finds a **rejected alternative**.

A **dated amendment**, not a rewrite and not an ADR 0039: close 0038's own named
re-take, state the one-frame verdict with the payload table as its evidence, and
put the smallest-thing rule where this story already cites it. A second ADR would
be a second home for 0038's Decision 1 and would make the misattribution
permanent by giving it somewhere plausible to point. **Reversal trigger for
staying at one frame:** _the first overview region whose cadence must differ from
the applied-batch cadence._ Fix this story's own citation in the same change.

### The guard

`each-overview-section-names-its-own-set` iterates a **hard-coded** `SECTIONS`
list of `proxies` and `sectors`, so a third property is invisible to it — **and
its predicate clause refuses `.slice(`, which a top-N legitimately is.** Add the
`movers` row keyed on the set name, and take the two-half shape from
`breadth-is-counted-over-the-equities-alone` (the section names the binding, the
binding names the set) rather than from the check that cannot see a slice. **Its
own first draft asserted the `breadth:` section was derived from `entries`,
which the defect satisfies by being the defect** — read that transcript first.

### Boundaries

Not the browser (4.5.5). Not the sentence (4.5.6). **Do not widen
`one-producer-of-the-overview-aggregate`'s bound** — its break is the weak 1→2
signal and would pass silently under a wider one.

## Done when

1. `topMovers` ranks over the same `equities` binding breadth counts, re-using
   4.5.2's one rule, with no second window, no second classifier, no second
   rounding and no `?? 0`
2. The two-member union, **two** field maps, `encodeMovers`' whole-section drop
   and `readMovers`' six refusals all exist, each with a test naming the state it
   refuses
3. `each-overview-section-names-its-own-set` carries a `movers` row, with a break
   that is the defect **the next author** writes, confirmed passing wrongly first
4. ADR 0038 carries its dated amendment and this story's citation points at the
   rule's real home
5. The frame's new size is **measured** off a real frame, with one populated
   frame quoted verbatim, and the producer's marginal cost re-measured against
   Story 4.4's 3.497 ms baseline
6. `pnpm verify` and `pnpm e2e` green

## Handed here by Task 4.5.3 — 2026-10-08: three things the drawing fixed for you

**1. The bound is `MOVERS_PER_SIDE`, in `packages/shared/src/sector-ranking.ts`,
beside `selectMovers`.** It is **five**, and the number is a **height**: two
headed lists at five rows is 466 px against a 486 px region, measured at all
four widths. Pass it to `selectMovers` rather than typing a limit — the producer
slices to it and the drawing pads to it, and those are one fact. A sixth row
each way measures **520** and does not overflow this panel; it raises
`Sector performance` and `Market breadth` with it, because rows 2 and 3 of the
landing grid share one `fr`.

**2. The view the frontend draws is `MarketMovers` in
`apps/frontend/src/market/movers.ts`** — `{ gainers, losers }`, each a
`SectorRow[]` in rank order, each ranked **from 1**. The reader that turns your
`WireMarketMovers` into it is yours. Two rules it inherits: a row with no move
cannot appear at all (the drawing has `quietGroup="impossible"`, so a keyless
row is **dropped silently** rather than drawn unranked — your filter is the only
thing standing there), and **the producer must not pad**. The padding to five is
geometry and is `withHeldRows`' job; a held row on the wire is a row every
reader of the frame would have to know to ignore.

**3. The price track is reserved and empty, and filling it is yours or 4.5.5's.**
`RankedList.module.css` says the price cell arrives in _this_ task (4.5.3). It
could not: `SectorRow` has no price and there was no producer for one, so
drawing a figure there would have been inventing one. The 80 px track is held at
1440/1024/768 and dropped at 390, measured. Filling it needs a field on the row,
a cell in `Row`, and the price off `WireOverviewFigure` — which your section
already carries.

**4. The stories are typed, and they owe a re-point.**
`Movers.stories.tsx` builds its rows by hand because no reader existed; every
figure goes through `formatChangePercent` and `directionOf` so no story can hold
a sign that disagrees with its number, but the **state** is still one somebody
typed. When the reader exists, `view` in that file becomes a call to it over a
real section, the way `BreadthLedger.stories.tsx` and
`SectorPerformance.stories.tsx` already do.
