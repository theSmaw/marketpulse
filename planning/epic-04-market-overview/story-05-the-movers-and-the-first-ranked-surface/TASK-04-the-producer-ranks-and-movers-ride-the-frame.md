# Task 4.5.4 — The producer ranks, and movers ride the frame

**Status:** **Implemented and verified — 2026-10-08.** The close is the orchestrator's.
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

---

## What was done — 2026-10-08

**The frame grows one section and nothing reads it yet.** Task 4.5.5 draws it.

### The contract, as built

```ts
export type WireMarketMovers = WireObservedMovers | WireSessionMovers;

interface WireMoverLists {
  readonly gainers: readonly WireOverviewFigure[]; // strongest first
  readonly losers: readonly WireOverviewFigure[]; // biggest fall first
  readonly eligible: number; // the set the lists are a selection FROM
  readonly tracked: number; // the 503, counted never named
}
```

As briefed, with no `rank` field, rows reusing `WireOverviewFigure`, `eligible`
as the section's own field, `movers?` optional on `WireMarketOverview` and
**required** on `WireMarketOverviewInputs`, and
`MARKET_STREAM_PROTOCOL_VERSION` still `1`. The free tripwire fired on the first
build, exactly as the brief predicted:

```
market-overview.test.ts(272,26): error TS2345: … Property 'movers' is missing in
  type '{ proxies: …; breadth: WireObservedBreadth; asOf: Date; }' but required
  in type 'WireMarketOverviewInputs'.
```

### The eligibility pass is extracted, and that is the biggest structural change

`marketBreadth(entries, options)` became **`eligibleMoves(entries, options)` →
`marketBreadth(eligible)`**, with `topMovers(eligible, figureOf)` as its second
consumer. So `movers.eligible` is the **length** of one array and
`breadth.measured` is the **tally** of the same array — the brief's _one
traversal_ rather than its weaker _one input array_. `measured` is still the sum
of the three accumulators, as the caveat required, which is why the two can
still differ by one legitimate thing: a figure with no **direction**
(non-finite) is eligible and in no bucket.

`eligibleMoves` lives in `market-breadth.ts` rather than in a new module,
deliberately: the window (`BREADTH_WINDOW_MINUTES`, Task 4.1.6's measurement) is
already there, a third module would have had to take the constant with it, and
`market-movers.ts` importing the pass from `market-breadth.ts` makes the
dependency arrow say this task's objective out loud — _the movers rank the set
breadth counts_. No cycle: `market-movers.ts` → `market-breadth.ts` is one-way,
and its reach into `market-overview.ts` is `import type`.

**`topMovers` takes the ENCODER as a parameter**, which is the one shape decision
not in the brief. The rows are `WireOverviewFigure`s and the only function
entitled to build one is `market-overview.ts`' `figureOf` — it decides what a
browser may see (ADR 0031) **and** appends each observed figure's tape to the
frame's `feeds` list. A mapping inside `market-movers.ts` would have been a
second answer to both questions, and the frame's provenance would have stopped
describing the figures the frame carries. So the selection happens inside
`toWireMarketOverview`, as the sector ranking does, and `index.ts` passes the
**pass**: `movers: eligible`.

### The two field maps, and the trap avoided

`observedMoversFields` and `sessionMoversFields`, copied in shape from
`observedBreadthFields`/`sessionBreadthFields`. One map over the union would have
covered `basis`, both lists and both counts and waved `windowMinutes` and
`session` through unexamined. Asserted on the encoded **string** rather than on a
decoded object, which is the only level where it is visible:

```
it("does not let the OTHER member's field through")
  expect(wire).toContain('"windowMinutes":5');
  expect(wire).not.toContain("2026-09-15");
```

`encodeMovers` drops the **whole section** on a non-finite `eligible`, `tracked`
or `windowMinutes`, with an exhaustive `switch` and a `never` default.
`market-movers.ts` contains no `Number.isFinite` — asserted by reading it rather
than by a check, and the reason is in its own docblock.

### `readMovers` — six refusals, one test each

| Refusal                                                      | The test                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gainers + losers > eligible`                                | `refuses a selection bigger than the set it claims to be from`                                                                                        |
| `eligible > tracked`                                         | `refuses an eligible set bigger than the universe it was taken over`                                                                                  |
| the same symbol in both lists                                | `refuses the same symbol in both lists`                                                                                                               |
| either list not monotonic **at displayed precision**         | `refuses a list that is not in the comparator's own order` (both ends) **and** `accepts a pair that is equal at DISPLAYED precision, in either order` |
| a row with no ranking key                                    | `refuses a row with no ranking key at all`                                                                                                            |
| a basis it cannot qualify (no window / no session / no name) | `refuses a basis it cannot qualify — no window, no session, no name`                                                                                  |

Plus two the brief did not list and the shape needed: **one unreadable row
refuses the whole list** (`readFigures`' drop rule is right for a 518-security
batch and wrong for a five-row ranking whose order is the answer), and **it does
NOT refuse on sign** — `does NOT refuse a gainer whose move is negative`, the
owner's Gate 1 decision asserted rather than described.

**The order check could not be written in the protocol module.** Verifying
_strongest first_ needs two moves either side of an operator, and
`one-comparator-for-the-order-of-a-move`'s clause two would have gone red on it —
correctly: that would have been the second comparator, written by the one author
with the best excuse. So the verification went where the rule lives, as
**`isRankedByMove(figures, reversed)`** in `sector-ranking.ts`, built out of
`compareByMove` and nothing else, and the protocol imports it. The back edge
(`sector-ranking.ts` → `market-stream-protocol.ts`) is type-only and erases, so
there is no runtime cycle — the same shape as the `sector-ladder.js` import
above it. It answers `true` for a display-equal pair in either order, which is
what makes the refusal a claim about **the displayed figures** rather than about
a threshold.

### The invariant, and the transcript of it passing WRONGLY

Two checks changed rather than one, because the two halves recognise the defect
by different means:

- **`each-overview-section-names-its-own-set`** gains a `movers` row keyed on the
  binding (`/\beligible\b/u`) with a per-row noun in the failure message. The
  two-half shape is `breadth-is-counted-over-the-equities-alone`'s, as briefed,
  and the `.slice(` refusal is harmless here because the slicing is inside
  `selectMovers` rather than on the call-site line.
- **`breadth-is-counted-over-the-equities-alone`** was **re-scoped rather than
  widened**: its two-link chain would have gone red on the desired state (the
  `breadth:` line no longer names `equities`). It is now three links —
  `breadth:` → `const eligible =` → `const equities =` → `isEquitySymbol` — plus
  a new clause: **exactly one `eligibleMoves(` call site**.

That last clause is the one with teeth, and the reason is a finding: **the defect
the brief names cannot be written any more.** `topMovers` takes `EligibleMoves`,
so `movers: equities` does not compile — the type system holds that door. What
compiles, runs and looks right is a **second pass**:

```ts
movers: eligibleMoves(entries, { asOf, marketOpen }),
```

which ranks over all 518, puts `SPY` and `XLE` among the movers twenty-four
pixels from two regions already asserting those same figures, and states a
denominator of 518 beside a breadth count of 503 on the same screen.

**Confirmed passing wrongly first**, with that line in `index.ts` and the checks
as they stood before the two new clauses (the `movers` row and the pass count
removed, everything else including the three-link chain in place):

```
$ node scripts/check-invariants.probe.mjs
45 invariants hold.
exit 0
```

and the shipped checks against the same tree:

```
$ node scripts/check-invariants.mjs
  ✗ each-overview-section-names-its-own-set
    the overview's `movers:` section does not name its own set:
      movers: eligibleMoves(entries, { asOf, marketOpen }),
    It must consult /\beligible\b/u — the one eligibility pass. …
  ✗ breadth-is-counted-over-the-equities-alone
    apps/backend/src/index.ts calls `eligibleMoves(` 2 time(s), expected exactly 1. …
2 of 45 invariants failed.
```

The probe copy was deleted and `index.ts` restored byte-identical.

### The breaks

One added — **`a-mover-ranked-over-the-whole-universe`** — and one **repointed**:
`the-breadth-count-includes-the-funds` named a line this task deleted, which
`every-break-can-still-land` caught on the first `pnpm invariants` of the change.
Its substitution is now the same defect written the new shortest way, and it is
red for two reasons rather than one.

**`pnpm break` could not be used, and the workaround is worth recording.**
`break-verify.mjs` refuses a dirty target, and every break that matters here
names `apps/backend/src/index.ts`, `market-overview.ts` or `market-breadth.ts` —
all three uncommitted for the length of the task, and committing is the
orchestrator's. So the breaks were run **by hand through the registry**: a
throwaway script that imports `BREAKS` from `scripts/breaks.mjs` and does exactly
what `break-verify.mjs` does — checksum, assert the `find` matches once,
substitute, run the entry's own `command`, restore, re-checksum, compare the
output against the entry's own `expect`. It touches git not at all. Every one of
the **fourteen** breaks naming a file this task edited was run that way; all
fourteen went red for the right reason, with the `expect` string present and the
file restored byte-identical:

```
a-mover-ranked-over-the-whole-universe      RED  "the one eligibility pass"
the-breadth-count-includes-the-funds        RED  "does not name"
the-proxy-section-is-taken-negatively       RED  "does not name its own set"
the-destructured-handler-hides-the-overview-frame  RED
a-second-subscriber-on-the-upstream-socket  RED
the-store-is-told-only-what-is-news         RED
the-live-stream-loses-its-consumer          RED
the-proxies-do-their-own-arithmetic         RED
a-second-basis-is-read                      RED
breadth-counted-on-the-raw-sign             RED
breadth-rounded-then-counted                RED
a-second-overview-aggregate                 RED
movers-ranked-by-a-second-comparator        RED
movers-rounded-then-sorted                  RED

and the three whose command is a browser spec, each with `build: true` honoured
either side — these are the ones worth having run, because the files they edit
are the three this task restructured:

the-breadth-buckets-are-transposed          RED  "recounted from the store's own closes"   (1 failed, 2 passed)
the-producer-forgets-to-rank-the-sectors    RED  "strongest first, keyless last"           (1 failed, 1 passed)
a-section-is-handed-the-join-whole          RED  "exactly the four index proxies"          (1 failed, 2 passed)
```

**An assertion failure with other tests still passing**, in all three — which is
the only red that proves a check works, rather than a spec that fell over.

### The frame's new size, off a real frame

One `overview` frame from this product's own gateway, 2026-10-08, local pair,
`provider: none` and the market shut, store newest session `2026-09-11` — so the
**session** basis with all 503 equities measurable:

```text
{"type":"overview","version":1,"sentAt":"2026-10-08T03:19:04.667Z","overview":{"computedAt":"2026-10-08T03:19:04.667Z","feeds":[],"figures":[{"state":"stored","symbol":"SPY","session":"2026-09-11","close":764.29,"sessionChangePercent":0.8524339231753721}, … ],"sectors":[ … ],"sectorLadderStep":2,"breadth":{"basis":"session","advancing":335,"declining":166,"unchanged":2,"measured":503,"tracked":503,"session":"2026-09-11"},"movers":{"basis":"session","gainers":[{"state":"stored","symbol":"HPE","session":"2026-09-11","close":62.09,"sessionChangePercent":12.441144512857669},{"state":"stored","symbol":"DELL","session":"2026-09-11","close":567.29,"sessionChangePercent":11.975445106786143},{"state":"stored","symbol":"NTAP","session":"2026-09-11","close":199.28,"sessionChangePercent":8.540305010893249},{"state":"stored","symbol":"ON","session":"2026-09-11","close":76.14,"sessionChangePercent":8.507909362975628},{"state":"stored","symbol":"HPQ","session":"2026-09-11","close":35.48,"sessionChangePercent":8.402077604644058}],"losers":[{"state":"stored","symbol":"ALB","session":"2026-09-11","close":117.52,"sessionChangePercent":-3.7589059045123276},{"state":"stored","symbol":"STX","session":"2026-09-11","close":830.17,"sessionChangePercent":-3.7294307283754575},{"state":"stored","symbol":"SNDK","session":"2026-09-11","close":1633.35,"sessionChangePercent":-3.4999615973153575},{"state":"stored","symbol":"WDC","session":"2026-09-11","close":447.18,"sessionChangePercent":-2.983099386023908},{"state":"stored","symbol":"EW","session":"2026-09-11","close":84.37,"sessionChangePercent":-2.7659329261265317}],"eligible":503,"tracked":503,"session":"2026-09-11"}}}
```

(The `figures` and `sectors` arrays are elided here for width; the movers section
is verbatim and complete, and the byte figures below are of the **whole**
untruncated frame.)

|                                      | bytes     |
| ------------------------------------ | --------- |
| the whole frame, three regions       | **3,256** |
| the same frame with `movers` removed | 2,013     |
| **the section, including its key**   | **1,243** |
| per row, over ten rows               | **124.3** |

So the section is **38% of the frame** and the frame is ~3.3 KB at ~16 frames a
minute — ~51 KiB/min per browser. The brief's estimate from Task 4.5.2 was
146.7 B/row and ~5,420 B for the whole frame; the measured figures are **124.3**
and **3,256**, i.e. the estimate was 18% high per row and the frame estimate
assumed a fuller one. Note what makes a row expensive and is nobody's decision
yet: `sessionChangePercent` travels at full double precision —
`12.441144512857669` is 18 characters for a figure drawn to two decimals.
Rounding it on the wire is a **product** change (it is the ranking key, and
`compareByMove` rounds for comparison but not for transport) and is not taken
here.

### The producer's marginal cost

400 timed iterations after 300 warm-up, three runs, all 518 observed with closes
— Task 4.4.4's worst case and the shape that fills both lists. The control is the
**same pipeline with the eligibility pass's `moves` emptied**, which removes
exactly the work the section adds (503 figure encodes, plus the selection) and
nothing else:

|                                        | median                       | p95                | max                |
| -------------------------------------- | ---------------------------- | ------------------ | ------------------ |
| the whole producer, **with** movers    | **3.866 / 4.002 / 3.943 ms** | 4.00 / 4.60 / 4.36 | 4.31 / 8.79 / 44.1 |
| the control — movers section empty     | **3.494 / 3.722 / 3.534 ms** | 3.57 / 8.24 / 3.78 | 3.74 / 25.7 / 4.89 |
| `selectMovers` alone, over 503 figures | **0.123–0.129 ms**           | 0.127–0.137        | 0.164–0.240        |
| the frame's encode                     | 0.012 ms                     | 0.013–0.015        | 0.029–0.062        |

**The marginal cost is 0.28–0.41 ms a batch, median — about 8–12% on top of
Story 4.4's 3.497 ms**, of which the selection is 0.12–0.13 ms and the remainder
is the 503 figure encodes. At ~16 batches a minute that is **~5–7 ms of script a
minute**, against `PRODUCT_SPEC.md` §28's 50 ms **routine** line. The control's
median — **3.494 ms** against Story 4.4's **3.497 ms** — is the strongest thing
about this table: the baseline reproduced to 0.1% on a different day and a
different instrument, which is what makes the difference attributable.

**The maxima are unusable and that is the machine, not the product.** Load
average was **2.55–2.91** across the three runs (8 cores, and the box is under
memory pressure), and the control's max moved between 3.74 ms and 25.7 ms
between runs while its median moved by 0.23 ms. The medians are the figures;
anything in the max column needs a quiet machine before it means anything. Both
instruments were deleted.

### What was wrong in the brief when I met the code

1. **The brief's named defect for the new guard is unwritable.** _"`topMovers`
   over the unfiltered universe"_ does not typecheck, because `topMovers` takes
   `EligibleMoves` rather than entries — a consequence of extracting the pass,
   which the brief asked for in the same paragraph. The writable defect is a
   **second eligibility pass**, which is what both the invariant clause and the
   break were keyed on.
2. **The price cell needs nothing from the producer.** Task 4.5.3 handed this
   task a decision — _put `price` on the mover figure, or hand it to 4.5.5_ —
   and the decision dissolves on contact: the rows **are**
   `WireOverviewFigure`s, which already carry `price` on the `observed` member
   and `close` on the `stored` one. Nothing is missing from the wire. What is
   missing is a field on `SectorRow`, a cell in `Row` and a reader; all three
   are in the browser, which this task's boundaries exclude. **Handed to 4.5.5**,
   with the note that the figure's **state** decides which field the cell reads,
   so the price cell inherits the same two-grammar problem the change cell has —
   and that out of hours every row is a `stored` figure whose `close` is the
   session's close rather than a live price, which is a labelling question rather
   than a plumbing one.
3. **The frontend reader was ambiguous between the brief and 4.5.3's hand-off.**
   Task 4.5.3 wrote _"the reader that turns your `WireMarketMovers` into it is
   yours"_; this task's Boundaries and Done-when list both exclude the browser.
   The boundaries won — nothing in `apps/frontend` changed, and
   `Movers.stories.tsx`' owed re-point stays 4.5.5's.
4. **`each-overview-section-names-its-own-set`'s `.slice(` refusal is not the
   obstacle it looked like.** A top-N is a slice, but the slice is inside
   `selectMovers` in `packages/shared`; the call-site line is `movers: eligible`.
   The row took the breadth check's shape for the **other** reason in the brief
   — the movers' population is a pass, not a membership test.

### Gates

```
pnpm verify   41 components, 41 stories files · 0 broken links · 45 invariants
              shared 437 · backend 1021 · frontend 1340 · process 41
              no Unhandled Errors block (grepped for it explicitly)
pnpm e2e overview-frame-sections.spec.ts   3 passed (5.1s)
pnpm e2e <the other seven overview specs>  26 passed (18.3s)
```

`pnpm test:database` was not run: no query, no migration and no row mapping was
touched. The movers section is computed from the join's answer, which is already
in memory.

### One e2e assertion added, and it is the one that is sharp on CI

`overview-frame-sections.spec.ts` gains a third test, on the **pass-through**
half — so what it reads is what this product's own server put on the wire:
`movers.tracked === breadth.tracked`, `movers.eligible === breadth.measured`,
same `basis`, the two bounds, and **no mover is a proxy or a sector benchmark**.
The first of those is the one a store with **zero bars** can still falsify: both
`eligible` figures are `0` there for ever, but `tracked` is read off the
universe, so a section ranked over the join's whole answer reads **518** beside
breadth's **503**. The disjointness half is the reverse — vacuous on CI, sharp on
a store with bars, which is where it was run.

### What this leaves standing

A new `docs/GAPS.md` entry: **no machine and no person has ever seen a movers
list on the `observed` basis.** The session basis has now been produced for real
(the frame above); the observed branch — the five-minute window, `live` figures,
`windowMinutes` on the wire — needs a session **and** a store backfilled to the
previous session, which have not coincided on any machine since the section
existed, and **CI can never produce it**. The entry also records what the wire's
own checks cannot see: a list correctly ordered over the **wrong population** is
internally consistent in every respect `readMovers` can test, which is why that
claim is held in-process by the invariant and on the frame by the spec.
