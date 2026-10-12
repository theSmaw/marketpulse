# MARKET-OVERVIEW.md — what the landing page is, what it claims, and what it costs

**Written:** 2026-10-12, by [Task 4.9.11](story-09-the-rehearsal-the-sweep-and-the-epic-close/TASK-11-the-subject-document-epic-4-never-wrote.md), at the owner's Gate 2 decision
**Epic:** [Epic 4 — Market Overview](EPIC.md) · **Spec:** [`PRODUCT_SPEC.md`](../PRODUCT_SPEC.md) §8.1, §9
**Status:** The maintained account of `/`. Where a task file disagrees with this
document, **this document wins**; where this document disagrees with an ADR about
a decision, **the ADR wins**.

This is the document a reader opens **first** when they need to understand or
change the landing page. It exists because Epic 4 produced **no subject document
at all** — Epic 2 produced seven and Epic 3 seven — so until 2026-10-12 the
answer to _how does this screen work_ was **read eighty-one task files**, and
[`CLAUDE.md`](../../CLAUDE.md)'s _Where the record lives_ table had no Epic 4
row. It is a **gathering** rather than a new argument: almost nothing below is
decided here, and every section says where its argument lives.

**Two things it deliberately does not do.** It does not restate an ADR's
reasoning — [ADR 0038](../../docs/adr/0038-the-overview-aggregate-one-join-one-frame.md)
is the aggregate seam and [ADR 0039](../../docs/adr/0039-a-region-is-a-tab-stop-unconditionally.md)
is the tab stop, both with their rejected alternatives. And it does not replace
the eight stories' own records: a figure here carries the task that took it, and
the task file is where the instrument, the n and the arms are.

---

## 0. How to read this, and how its figures were taken

### 0.1 The population is 516 today, and almost every figure below was taken over 518

**The universe is 516 securities — 501 equities, the eleven sector SPDRs and the
four index proxies — since 2026-10-12**, when Task 2.3.9 ran `pnpm universe:check`
against the vendor and `PSKY` and `WBD` came back unknown to it entirely. They are
`untracked` rather than deleted, so their rows and their stored bars survive and
nothing computed over the market we track **now** counts them.

**Every `518` and `503` below is a dated measurement left standing on purpose**,
and each one says which population it was taken over. The two figures that are
_structural_ rather than measured are unaffected, because neither is a literal:
the join reads `trackedTickers()` and the drawn denominator reads `tracked` off
the frame, which `the-population-is-never-a-literal` holds. **Take the count from
[`UNIVERSE.md`](../epic-02-security-universe-historical-data/story-03-security-domain-model-and-tracked-universe/UNIVERSE.md)
§17**, which is printed from the file, and never from a sentence in this document.

**Two stores disagree about the row count and both are right.** A store built
into an empty database holds 516 rows all active; the deployed store holds 518
rows of which 516 are active. So `GET /securities` serves 516 on CI and 518
deployed, and a browser assertion on a row count is an assertion about which
store it met.

### 0.2 Three caveats travel with every cost figure in §8, and they are not optional

They are **Story 4.8's own finding** rather than boilerplate, and a figure quoted
without the one that applies to it is misleading:

1. **The cadence is furnished.** No feed this repository can run offline produces
   the real **6.8–16.1 applied batches a minute** — `createFixtureStream` ticks at
   `tickEveryMs = 60_000` and `replay-bar-source.ts` emits one slice per minute
   across every symbol. So every per-tick figure was **driven** at both ends of
   the measured range through `routeWebSocket`, never observed. A reader following
   Task 3.6.5's recipe instead measures **one sixteenth** of the render count and
   gets a comfortable green.
2. **Every Node figure is a tight-loop upper bound; every browser figure is not.**
   A gapped Node sample on this machine inflates, and the fixed-cost calibrator
   does **not** divide the inflation out — **2.29× against 4.38× on the same
   bursts** (Task 4.8.11). The same calibrator reads **×1.00** in a visible
   renderer at gaps of 3.7 s and 8.8 s. A browser figure wearing the Node caveat
   is as misleading as a Node figure without it.
3. **The whole set is local rather than deployed, and no person has watched any of
   it.** One laptop, a local pair, `provider=none` or a furnished socket, and CI's
   store has zero bars.

### 0.3 What this document is not

It is not the record of **whether a person has looked**. That is
[`LIVE-REHEARSAL.md`](../epic-03-live-market-data/LIVE-REHEARSAL.md), the only
file in this repository about somebody looking rather than about a check passing,
and **note 5 beneath its ledger is the rule**: an instrumented row does not
satisfy the word _watched_. [`THE-SITTING.md`](THE-SITTING.md) is the protocol for
the evening that fills those rows, ordered by what expires soonest.

---

## 1. The screen

### 1.1 Seven named regions, and which epic owns each

`/` draws **seven** regions. [`PRODUCT_SPEC.md`](../PRODUCT_SPEC.md) §9 sketches
them; this epic fills **four**.

| Region                   | Holds                                                     | Owner       |
| ------------------------ | --------------------------------------------------------- | ----------- |
| `Market proxies`         | `SPY` `QQQ` `DIA` `IWM` — price, change, arrival mark     | Story 4.2 ✔ |
| `Sector performance`     | eleven ranked sector SPDRs, each its benchmark's own move | Story 4.3 ✔ |
| `Market breadth`         | three counts, a remainder and a net headline              | Story 4.4 ✔ |
| `Movers`                 | `GAINERS` and `LOSERS`, five rows each                    | Story 4.5 ✔ |
| `Market topology`        | `reserved`                                                | **Epic 6**  |
| `Unusual activity`       | `reserved`                                                | **Epic 5**  |
| `Current investigations` | `reserved`                                                | **Epic 7+** |

The three `reserved` regions are **a component state, not an absence** — hatched
ground, a dashed hairline and a tag naming whose work fills them (Task 4.1.3).
That is [ADR 0029](../../docs/adr/0029-provenance-on-screen-the-partial-states-and-what-an-honest-empty-answer-certifies.md)'s
fourth rule applied to a whole screen for the first time: a surface that owns
nothing defers, points once and stops, and never says nothing.

**Two things about that list are worth knowing before changing it.** `EPIC.md`
said _six_ regions and then named seven, corrected 2026-09-27 — the shipped
route, `landing-route.spec.ts`'s `REGION_NAMES` and `CLAUDE.md` all say seven.
And the layout running in Epic 6's row is explicitly **interim**, reverting to the
canvas's end state on a condition: _the first commit that renders a graph node_.

**`Market proxies` was renamed from `Market summary`** by Task 4.2.5, because that
was a second word for a concept the product already had (the `/securities` group
heading, and `Market proxy` on the security page) and because on a screen where
three later regions summarise the whole universe it **promises the broadest view
and delivers the narrowest**.

**Since Gate 2 on 2026-10-12 one finding about `reserved` is routed rather than
repaired, and it is Epic 5's**: `Panel`'s `reserved` state is doing **two jobs** —
in the rollback state a **degraded** region is drawn exactly like one this product
**has not built yet**, same hatch and same muted sentence, differing only by the
absence of an epic badge — and at 1440 **the three unbuilt regions read as more
intentional than the four built ones**, which are white voids with one 12 px grey
sentence.

### 1.2 The grid restates its spans at every breakpoint, and that is a correctness requirement

`MarketOverview.module.css` names **grid areas** rather than auto-placing, and the
comment there records that Task 1.5.4 argued against exactly that — correctly, for
four regions in two columns. **It does not survive seven**: the wide layout wants
topology-sectors-movers in one column and the narrow one wants a reading order
where everything with content comes before everything without, and **no single
source order satisfies both**.

| Width  | Columns                         | Areas                                                              |
| ------ | ------------------------------- | ------------------------------------------------------------------ |
| ≥ 1181 | `minmax(0, 3fr) minmax(0, 1fr)` | `topology unusual` / `sectors breadth` / `movers investigations`   |
| ≤ 1180 | `minmax(0, 5fr) minmax(0, 3fr)` | unchanged — the sidebar becomes a second column                    |
| ≤ 860  | `minmax(0, 1fr)`, `rows: none`  | `breadth` `sectors` `movers` `topology` `unusual` `investigations` |

**Every breakpoint that narrows this grid restates its areas**, and the reason is
the measured trap in `CLAUDE.md`: **a `span N` item wider than the explicit grid
is not clamped to it — it grows implicit columns.** A `span 3` region in a
two-track grid produced `134px 134px 676px`, a visibly broken page at every width
under 1184 px, with `pnpm verify` and all 54 browser tests green. **Nothing below
`pnpm e2e` can see it**: jsdom applies no stylesheet and computes no layout.

`min-height: auto` is **restated** in the ≤860 rule for the same class of reason.
With the base rule declaring a minimum rather than a height, leaving it out would
leave `min-height: 82vh` in force on a one-column layout — invisible at a tall
viewport and 82vh of padding under six panels on a short one.

### 1.3 The ≤860 collapse puts breadth first, and ≥861 deliberately disagrees with itself

**The DOM order is the ≤860 order** since Task 4.4.7: `breadth, sectors, movers,
topology, unusual, investigations`. No CSS changed, and **every region's box is
identical at all four widths**, verified box-for-box before and after.

- **At ≤ 860 the keyboard, the heading order, the swipe order and the visual order
  all agree.** Before Task 4.4.7 they did not: `grid-template-areas` reordered
  visually while the DOM did not, so the eye met `Market breadth` **second** and a
  keyboard reader met it **fifth**. That mismatch was **shipped and live from Task
  4.1.3**, not latent — Story 4.4's own premise that _"there is not one tab stop
  inside `.regions` at any width"_ was false, and there are **six**.
- **At ≥ 861 the six tab stops deliberately run across a column-major grid.**
  Accepted: in two columns the eye is not performing a sequence, so there is no
  reading order there to disagree with, and the alternative puts the mismatch back
  where sequence **is** the entire hierarchy. The cost and the argument are in
  `MarketOverview.tsx` and `docs/GAPS.md`.

**Reversal trigger, a condition:** _the first region on this screen whose content a
reader must traverse in order at a wide width_ — a numbered sequence, a stepper, a
form, or **two regions where one's figure is read against the other's**. Evaluated
by Story 4.6 and it did **not** fire: a mover row and a sector row are each
self-contained destinations and neither is read against the other.

`e2e/specs/overview-region-order.spec.ts` asserts DOM order against **geometric**
top-to-bottom order at **768 and 390**, and **deliberately not at 1440**, where an
assertion of agreement would assert the opposite of the decision and one of
disagreement would pin a cost rather than a claim. Its first draft **passed
wrongly** against a seventh region inserted first in source, because it filtered a
hard-coded list of names instead of the grid's own children (Task 4.4.7).

### 1.4 The heights, and what one shared `fr` ratio bought

Row 1 of `.regions` is a **resolved length** — `calc((82vh - 2 * var(--space-24)) * 7 / 30)`
— because Epic 6's WebGL renderer needs a resolved box. Rows 2 and 3 are
`repeat(2, minmax(min-content, 1fr))`, so they **share one ratio**.

That single decision (Task 4.3.1) is why filling three regions cost almost nothing
on screen:

| Taken                              | `Sector performance` | `Market breadth` | `Movers` |
| ---------------------------------- | -------------------- | ---------------- | -------- |
| six reserved panels                | 265                  | 265              | 265      |
| eleven sectors drawn (4.3.5)       | **461**              | 461              | 461      |
| the quiet group's reserve (4.3.7)  | **486**              | 486              | 486      |
| the age clause (4.7.4, 2026-10-11) | 486                  | **491**          | **491**  |

So **filling `Market breadth` and `Movers` moved nothing at all at 1440 and
1024** — their height was pre-paid by the sectors landing. At 768 and 390 the grid
is `grid-template-rows: none` and the rows are untied, so filling them **did** grow
the page: measured `1646 / 1646 / 2359 / 2565` after `Movers` landed against
`1646 / 1646 / 1996 / 2220` before — **+363 at 768 and +345 at 390, nothing at
1440 or 1024**.

**Three figures that moved rather than being mis-recorded, kept with both
datings**, because the gap between an estimate and a measurement is the
instructive part: Task 4.3.1 measured **383** with a throwaway rendering eleven
`<li>` and nothing else; Task 4.3.2 drew it properly and predicted **433**, adding
the printed ladder (24 px) and the benchmark claim line (28 px); the shipped figure
was **461**. The 28 px nobody modelled: the header is **47** rather than 51,
`Region` adds a **16 px `.content` margin-top** no drawing models, and the footer
reserves **two** lines at every width rather than one.

**The rule that replaced Task 4.1.4's**, taken by the owner on 2026-09-27 when a
383 px floor on two reserved panels would have put a 975 px grid with five hatched
panels on the live landing page for three tasks:

> **A reserved region's floor is set by the change that DRAWS its content, and
> that change measures and reports the movement before it merges.**

**Reversal trigger, a condition:** _the first reserved region whose filling would
move a figure or a sentence a reader is reading, rather than another reserved
panel._ At all four widths on this screen, everything that moved when each region
filled was hatch or the source note — the proxy strip, its four cells and its
qualifier were byte-identical in position and size. **That is the claim the
retirement rests on**; if filling a region moves a figure, it is the owner's
decision rather than a measurement to record.

### 1.5 A region is a tab stop unconditionally

[ADR 0039](../../docs/adr/0039-a-region-is-a-tab-stop-unconditionally.md), Task
4.6.6, after the question had been **declined twice** and three declines is how a
question stops being decidable. `Region` passes `scrollable` for every region, on
every route, in every state.

**The reframing is the load-bearing part: the question was never _does this region
scroll_, it is _can a tab stop appear and disappear under a reader_**, and the
answer must be no. Both candidate conditions fail, for different reasons — the
overflow condition because overflow is a function of **height** (see §1.6), and
the better condition, _conditional on content being focusable_, because three
regions' content is focusable only when a frame has landed: that stop would exist
at paint, **vanish when the first aggregate arrives**, and come back on a rollback,
a refused section, an empty answer or a tripped error boundary, dropping a reader's
focus to `<body>` on a timer nobody controls.

**The guard moved from axe to a browser assertion, and that is the whole reason the
ADR exists.** `scrollable-region-focusable` **does not fire while a scrolling box
contains something focusable** — which is why the original defect stood five
stories — so once Story 4.6 made rows in three regions focusable, **axe can never
report those regions again**. `expectEveryRegionIsATabStop` in `e2e/support/app.ts`
replaces it, called from `overview-region-order.spec.ts` at 768 and 390 and from
`securities-route.spec.ts` at 1280×480, over `section[aria-labelledby]` — the
population **by construction** rather than a name list, because a name list would
filter the next region out of its own check. There is a **floor on the count** —
seven on `/`, eight on `/securities` — because an empty population satisfies every
per-element assertion over a collection.

**And the rejected shape already shipped one level down**, amended into the ADR by
Task 4.7.6: the twenty **ranked ticker stops** are exactly the shape Decision 1
refused, and nobody considered them there. Two of the three removals were already
answered inside `useRovingStop`; the third — the region's content going away
entirely — dropped focus to `<body>`, measured. `Region` now remembers the element
that last held focus inside it and takes focus itself if that element is
disconnected while `document.activeElement` is the body.

### 1.6 A premise this epic quoted for two stories is false

> _No region on `/` scrolls at any of the four widths._

**It was four width/HEIGHT pairs, not four widths.** Re-taken at **thirteen**
pairs on both routes that draw regions (Task 4.6.6):

```text
=== / 1440x700      -> 0 of 7 scroll
=== / 1440x680      Unusual activity   client 117  scroll 121  SCROLLS +4
=== / 1440x500      Market topology    client  82  scroll  85  SCROLLS +3
                    Unusual activity   client  82  scroll 121  SCROLLS +39
```

**The first height at which a region on `/` scrolls is between 681 and 700 at
1440** — an ordinary laptop viewport. The cause is in the stylesheet rather than in
the content: row 1 is a `calc()` **length with no content floor** while rows 2 and
3 are `minmax(min-content, 1fr)` and have one, and the two regions on row 1 are the
two that scroll.

**The mirror is worth as much:** **0 of 8** regions on `/securities` scroll at any
of the thirteen pairs, `Tracked universe` at 18,893–31,823 px included, because the
long table makes the **page** scroll. So the route with the original defect's shape
is the route where the rule is least triggered.

---

## 2. The join

### 2.1 One pure function

[ADR 0038](../../docs/adr/0038-the-overview-aggregate-one-join-one-frame.md),
Decision 1. `apps/backend/src/market-overview.ts` is a **sibling** of
`current-market-state.ts`, not a method on it, and `buildMarketOverview` takes
everything as arguments:

```ts
export interface MarketOverviewInputs {
  readonly symbols: readonly Ticker[];
  readonly observations: ReadonlyMap<Ticker, CurrentObservation>;
  readonly closesAsOf: (
    session: MarketDate,
  ) => ReadonlyMap<Ticker, SecurityLastClose>;
  readonly asOf: Date;
}
```

No clock, no socket, no repository handle; the reach into `current-market-state.ts`
is `import type` and erases. **Do not give it a handle.**

**Calling it an aggregate is what hid it for a whole decomposition.** Story 4.2
described the seam as _"where an aggregate over the universe is computed"_ and in
the same breath called the proxies _"the one aggregate that is not an aggregate"_.
Both were right, and together they hid what was missing: **nothing in this backend
could join a live observation to the previous session's stored close.** An advancer
is the _sign_ of a change from close; a mover is ranked _by_ it; a sector's figure
is one. **The join is the primitive and every aggregate is arithmetic on top of
it.**

Three states per symbol, and the fourth combination is not a fourth member:
`observed` (with the change computed), `stored`, `unknown`. A live price with no
stored close is `observed` carrying `{ percent: null, basis: null }` — the price is
true and only the figure is absent. `unknown` is nothing-observed-**and**
nothing-stored, which is CI's store for all 516.

`closesAsOf` is **synchronous** on purpose: an `async` lookup puts an `await` back
on the socket callback, the one path where an unhandled rejection kills the
process.

### 2.2 Why that purity makes invariant 4 structural — and the bound on the claim

**A function that reads nothing cannot read something timestamped after a replay
clock.** Its only temporal inputs are `asOf` and a lookup keyed on a session, both
handed in by a caller that can be made replay-aware without touching the file, and
every later aggregate through the seam inherits the property — which is the
opposite of the usual outcome where each new surface acquires its own way of asking
what time it is. That is `CLAUDE.md` invariant 4 honoured **in the data layer rather
than in a prompt**, which is what the invariant demands.

**And here is the bound on that claim, which is as important as the claim.** A
**replayed** aggregate would compute over **today's** universe. `currentMarketState`
filters to `status = 'active'` against the universe as it stands now, and the store
records **no point-in-time membership** at all.
[`UNIVERSE.md`](../epic-02-security-universe-historical-data/story-03-security-domain-model-and-tracked-universe/UNIVERSE.md)
§12.2's rule is that a computation over the market we track _now_ filters and a read
of something we _stored_ does not; a replayed aggregate is the second and would
behave like the first. **The join's purity means the fix has somewhere to land** —
`symbols` and `closesAsOf` are arguments — **but the data to answer _which
securities were tracked on that date_ does not exist.** Task 2.3.9 untracking
`PSKY` and `WBD` on 2026-10-12 is the first instance of exactly this: a replay of
any session before that date would compute over 516 names when 518 were tracked.

**So this is a bound on what a replayed breadth count or sector mean can honestly
claim, and it is Epic 13's**, written into
[Epic 13's own `EPIC.md`](../epic-13-market-replay/EPIC.md) in words that epic can
act on rather than left as a pointer. ADR 0038 recorded the consequence as _"it is
recorded in `docs/GAPS.md`"_ and **it was not** — found 2026-10-12 by Task 4.9.4
going to use it, which is this repository's own named defect: _a claim about a
mechanism reads identically whether the mechanism is there or not_. `CLAUDE.md`'s
invariant 4 is being given a dated qualification about this in the same batch of
work as this document.

### 2.3 One producer, three paths

`one-producer-of-the-overview-aggregate` permits **exactly one** call site of
`buildMarketOverview`. **Do not widen its bound**: its break is the weak 1→2 signal
and would pass silently under a wider one. A second aggregate routes through the
existing builder and splits the answer by **positive** membership —
`isProxySymbol`, `isSectorSymbol`, `isEquitySymbol`, named sets declared beside the
symbol list, held by `each-overview-section-names-its-own-set`.

**The negative filter that preceded it is the defect worth knowing about.**
`index.ts` split the join's answer with `entries.filter(e => !isSectorSymbol.has(e.symbol))`,
and the moment Task 4.4.4 widened the join to `trackedTickers()` **every
non-sector security would have landed in `overview.figures`** — hundreds of cells
in the proxy strip, a ~56 KB frame, and `newest`, `sharedBasis` and
`sharedClosingSession` folding over 507 figures. **No compile error and no failing
test.** Task 4.4.1 closed it before 4.4.4 widened anything;
`overview-frame-sections.spec.ts` asserts `figures` holds exactly four.

**Three producer paths send the aggregate, and `pnpm invariants` counts them**
(`the-aggregate-has-three-producer-paths`, break `a-fourth-path-to-the-aggregate`):
the per-batch broadcast, the connect send and the subscribe send. Two of them stopped
being **computes** on 2026-10-11 — see §2.6.

**It may never ride the feed-state path.** That path is ~332 frames a minute
(§8.4), and `the-overview-frame-is-not-a-heartbeat` refuses an overview publish
there. It was written **before** the frame it guards — the only ordering in which
it can be proved against the real defect — and its regions are delimited by the
file's formatted shape rather than by brace counting, because **a destructured
handler parameter walks straight past the obvious version.**

### 2.4 One frame, and the grain rule

A fourth market-stream frame type, `MARKET_STREAM_PROTOCOL_VERSION` deliberately
**not** bumped:

```ts
export interface OverviewMessage {
  readonly type: "overview";
  readonly version: number; // 1 — deliberately unchanged
  readonly sentAt: string;
  readonly overview: WireMarketOverview;
}
```

**Bumping is the obvious-looking move and is strictly worse.** The deploy rolls the
backend first, so a tab on the previous bundle meets the new gateway: unbumped it
ignores one frame, bumped it rejects **every** frame. The decoder gained a third
disposition instead — neither a message nor a defect, not counted in `unreadable`
and not re-rendering.

**The grain rule, which four stories were citing and which lived nowhere until
2026-10-08:**

> **Each region ships the smallest thing that answers it, never the input its
> answer was computed from.**

Sectors ship eleven ranked figures because eleven figures **is** the answer; breadth
ships three counts and two denominators rather than 518 figures; the movers ship
**ten rows and two counts** rather than the 503 they were selected from. The
evidence, off this product's own gateway on 2026-10-08 with `provider: none`, the
session basis and 503 equities with stored closes: the whole frame is **3,256 B**
with four proxies, eleven sectors, breadth and movers, of which the movers are
**1,243 B at 124.3 B a row**. Breadth added **6–8 B**. A frame carrying every
region's input would be **~56 KB and ~875 KiB/min per browser**, decoded on all
five routes including `/replay`.

**`one frame type per region` was a named open re-take and it is closed.** ADR 0038
handed it to Story 4.3; 4.3 answered by shipping a nested optional section and never
came back, so for ten days a reader following Story 4.5's citation of _"ADR 0038's
grain rule"_ arrived at a **rejected alternative**. Task 4.5.4 repointed the
citation and amended the ADR rather than writing a second one, because a second ADR
would be a second home for Decision 1 and would make the misattribution permanent
by giving it somewhere plausible to point.

**Reversal trigger, a condition:** _the first overview region whose cadence must
differ from the applied-batch cadence._ A region arriving on its own clock cannot
share a `computedAt` with the others, and at that point a second frame type is
cheaper than a frame whose instant is true of only part of itself.

**A non-finite number is the serialiser's problem, not the caller's** (Decision 5).
Optional and non-finite is **omitted** — a true price with no measurable move, which
the union already has words for. Required and non-finite **drops the whole figure**
through a `flatMap`, so it is absent rather than a hole, because on a transport with
no schema `"price":null` reads as absent to a strict reader and as **`0`** to a
lenient one, and `0` is a plausible price. **The producer's check was removed rather
than kept as a belt**, because two homes for one rule is what this repository
refuses and the second is the one that gets forgotten.

### 2.5 The arithmetic lives in `packages/shared` — one implementation, two processes

`changeFromClose`, `changePercent` and `LiveChange` are
`packages/shared/src/live-change.ts`, and the backend calls the one
implementation. Story 4.2's AC 2 required `changeFromClose`; its own amendment
required the computation backend-side; the function was a frontend module inside
`UniverseTable/`. **The resolution was to move it rather than weaken either**, and
the criterion came out **stronger** than it was written.

**What the move carries across is the same-session branch, which is the whole
reason the guard exists.** The nightly backfill writes today, so between it and the
next open the store's last session and the live bar's session **meet** — and a
hand-written subtraction then reports ≈0.00% for every security on screen:
well-formed, correctly formatted, correctly coloured numbers saying the market did
not move.

`one-home-for-the-live-change` holds it as a **producer walk** rather than a
call-site count, because more callers is the desired state. Three clauses, and the
third is the one a re-implementer cannot evade: **a division whose denominator is a
close.** TypeScript never requires anybody to write a type name; it does require
them to write the division. A hand-written `sector-performance.ts` doing
`((observed.bar.close - close.close) / close.close) * 100` was written out and
**passed green** until the guard was keyed that way. That clause is also the only
tripwire risk in the set — a drawdown or a normalise-to-close transform is a
legitimate division by a close — and when it fires the repair is an **exemption by
declaration shape**, never a widening of the regex.

Two siblings followed by the same precedent: **`directionOf` and `PRICE_DIRECTIONS`**
(Task 4.4.2, held by `one-classifier-for-the-direction-of-a-move`) and
**`moveRankingKey`, `compareByMove`, `selectMovers`** (Task 4.5.2, held by
`one-comparator-for-the-order-of-a-move`). The direction check's **own first draft
was green on the defect**: it matched `changePercent` and missed the bare `percent`
an author is likeliest to type.

### 2.6 Three instants on the wire, and only one of them may date a figure

| Field        | Is                                                | May date a figure? |
| ------------ | ------------------------------------------------- | ------------------ |
| `sentAt`     | the gateway's wall clock at the send              | **no**             |
| `computedAt` | when the join ran                                 | **no**             |
| `observedAt` | the newest **bar's own `startsAt`** in the answer | **yes**            |

`the-send-instant-is-not-a-clock` holds the first two out of `feed-liveness.ts` and
both adapters. **`observedAt` is deliberately outside that invariant**, because it
is a fact about the market rather than about this process, and it is the field a
staleness rule over the aggregate would legitimately be built on.

**The constraint on `computedAt` was right and incomplete, and the gap cost a
shipped sentence.** ADR 0038 said where it must not go — a liveness threshold —
and nobody wrote down that it had already gone somewhere else: the landing page's
source note **drew** it, as a claim about the figures above it. Produced verbatim
against a developer's store whose newest bar is the **2026-09-11** session:

```text
CLOSING PRICES  All US exchanges
COMPUTED        Oct 9 · 21:42 EDT
```

`21:42 EDT` is the minute the page was **opened**, because the gateway runs the join
on every connect. The same page now reads:

```text
CLOSING PRICES  All US exchanges
```

So the constraint is restated at its real width: **`computedAt` is a reading of this
process's clock, and no surface may date the data from it** — not a liveness rule, a
drawn sentence or a spoken one. The note now dates the **observation**
(`OBSERVED THROUGH · Sep 25 · 14:01 EDT`) and draws **no instant at all** where
nothing has been observed, which is ADR 0029's defer rule at the producer: say
nothing rather than say now. `the-overview-note-dates-an-observation` fails the
build on a reader that reaches for the process clock again, **in two conjuncts**,
the second of which earned its place by catching the defect a one-conjunct draft
reported `52 invariants hold.` against.

Two consequences worth knowing: **the same screen hours later is now the same
string**, because two frames differing only in `computedAt` are the same claim; and
the aggregate is rebuilt up to sixteen times a minute over data that changes once,
which is why every drawn instant on this screen is **minute-precise**.

**And a fresh join is no longer a fresh compute.** Until 2026-10-11 `sendSnapshot()`
computed a new aggregate on connect **and on every subscribe**, and the three
producers behind one aggregate age at three different rates: the eligibility pass
filters on a **5-minute** window, while `buildMarketOverview` marks a proxy or
sector entry `live` for as long as the observation sits in the map, with **no expiry
at all**. So a join taken during an outage drew **four live prices and eleven ranked
sectors** at the top of `/` and `Of the 503 companies we track, none were heard from
in the last 5 minutes` in the middle — each half correct about its own subject,
**reachable by pressing F5**, and routine rather than exotic: the 2026-09-23 watch
counted a browser's socket closing **38 times in 4h 36m**.

The rule this product already held twice, said about an aggregate instead of a
series: _an aggregate that has held figures must not fall back to its empty state
because of a join the reader did not ask for._ **So the gateway keeps the aggregate
it last BROADCAST and serves that on connect and on subscribe** —
`lastBroadcastOverview`, one `let`, one `??`. A cold `/` now pays **one** join rather
than three, and **two tabs of `/` no longer disagree about the market** by however
long apart they were opened. A process with no last broadcast still serves a freshly
computed aggregate, deliberately: it has no reader whose figures it could contradict,
and withholding the frame would delete two of Story 4.2's sixteen states from every
out-of-hours visit.

**The half it cannot repair is the deploy, and that is arithmetic.** A replica
restarted mid-session has no memo **and** no market state — its own feed is refused
for **45.8–46.5 s** and the platform does not terminate the outgoing replica until
~46 s into the new one's life — so the first browser to reconnect arrives at a
process whose answer is thin. **No amount of gateway memory fixes that.** In
`docs/GAPS.md`, owned by a condition: _the first mid-session deploy somebody watches
`/` across_.

---

## 3. What `current` means

**This is the decision the whole epic was mostly written about**, and the argument
has an ADR of its own, written in the same batch of work as this document —
**[ADR 0040](../../docs/adr/0040-what-current-means-a-five-minute-observation-window.md)**, _what "current" means: a five-minute observation window_
(Task 4.9.10). What follows is
the summary and the pointer; the ADR carries the curve, the alternatives and the
reversal trigger.

### 3.1 Five minutes, measured

The owner chose **a stated freshness window** over _everything in the map_, over a
three-way count, and over last session's close-to-close. **M was measured rather
than argued** (Task 4.1.6): a Node client on the deployed gateway subscribed to all
518, sampling every 60 s from 07:13 ET through the bell, **390 of the session's 390
minutes sampled with no gaps inside the session**.

| Window | min | p10 | **median** | p90 | max | median as % of 518 |
| ------ | --- | --- | ---------- | --- | --- | ------------------ |
| 1 min  | 0   | 0   | **0**      | 0   | 0   | **0.0%**           |
| 2 min  | 1   | 292 | **325**    | 385 | 513 | **62.7%**          |
| 5 min  | 5   | 444 | **466**    | 491 | 518 | **90.0%**          |
| 15 min | 10  | 505 | **510**    | 515 | 518 | **98.5%**          |
| 60 min | 23  | 516 | **518**    | 518 | 518 | **100.0%**         |

**The worst hour is what decided it**, because a median that reads well at 11:00
and badly at 13:00 is a sentence that embarrasses this screen after lunch: at
13:00, 2 minutes is **298/518 (57.5%)** and 5 minutes is **446/518 (86.1%)**.

- **1 minute is structurally impossible rather than thin.** A bar's `startsAt` is
  the start of the minute it describes and it arrives ~0.5 s after that minute
  **ends**, so the newest observation is always 60–120 s old — **0 in every one of
  390 samples**.
- **2 minutes reads as a fault.** The chrome would say `LIVE` while the figure said
  57%, which is exactly the confusion the one-home rule exists to prevent.
- **15 minutes buys 8.5 points and costs the word _live_.**

**Every absolute figure in that table is a dated measurement over 518, and the
shipped region counts 501 equities (503 when the table was taken).** The owner chose
the equities alone at Gate 1 on 2026-10-07, because a count including `SPY` and the
eleven SPDRs alongside their own constituents makes this region and `Market proxies`
**non-independent** — in a one-sided market all fifteen fall the same way, shifting
the figure by up to **~2.9 points** toward the majority. **The choice of M does not
move**, because it was decided on the _shape_ of the curve. **Nobody may cite ~466
or 446–498 as a figure over 503**; the honest first estimate is `N − 15`, and that
is an inference the instrument said nothing about. **The re-measure is owed** and it
needs a session.

**Two coverage figures in this epic's documents measure different things**, and for
a while nothing said so: _"about 332 of 518 in a median minute, 65.1% per-symbol"_
(`LIVE-DATA.md` §7.6) counts **bars attributable to a minute**, and Task 4.1.6's
_"the 1-minute window is 0 in all 390 samples"_ counts **observations newer than
60 s at a sampling instant**. Both are true and a reader taking the first as the
1-minute denominator is 332 away from the truth.

The ceiling is held derived rather than spelled — `the-five-minute-ceiling-stays-derived`.

### 3.2 The window is measured on each bar's own `startsAt`, never on `ageMs`

**This is the clause to copy if a third consumer joins the pass.** The window is
`bar.startsAt` against the join's own `asOf`, and **not** `CurrentObservation.ageMs`
— which is computed with **its own wall clock**, would put a second clock into a
function whose purity is what makes invariant 4 structural, and **would be wrong
under replay**.

It is also **what Task 4.1.6 measured**: the curve's 1-minute row reads 0 precisely
because a bar arrives after the minute it describes has ended, so measuring on an
arrival instant **shifts every figure in that table by a minute**.

**And the same window filters the numerator and the denominator.** If the counts
fold over the whole map while N is windowed, the stated denominator and the counted
numerator disagree — invisibly, with every number well-formed — and the surplus
lands in `unchanged`, **collapsing _unchanged_ into _not heard from_, which is the
one failure Story 4.4 exists to prevent.**

### 3.3 One eligibility pass, shared

Since Task 4.5.4 there is **one** pass, not two: `eligibleMoves(entries, …)` →
`marketBreadth(eligible)` and `topMovers(eligible, figureOf)`. So `movers.eligible`
is the **length** of one array and `breadth.measured` the **tally** of the same one
— the two regions agree **by construction** rather than by a test. **A third
consumer joins that pass rather than walking `entries` again**, and anybody
attributing a per-section cost must attribute the shared pass once.

That is Story 4.4's AC 3 as restated: the criterion as written asserted that breadth
agrees with the sector rows about a denominator, and `EPIC.md`'s 2026-09-27
reassessment had removed the denominator from 4.3 entirely. **It is not falsifiable
as originally written**, and the restatement is _one call to the join and one
direction function, so a sector row's drawn direction and the bucket it is counted
in cannot disagree._

### 3.4 Two bases, and the market is shut about 80% of the week

`eligibleMoves` picks its arm from `isMarketOpen(asOf)`, and the frame says **which
count it sent** — a two-member union, `basis: "observed"` with the five-minute
coverage or `basis: "session"` with the session date.

**Out of hours `sessionMoves` runs, not `observedMoves`**: a different computation,
a different denominator (~501 with a close rather than the ~466 heard from in five
minutes) and different sentences on screen. The alternatives were rejected with
reasons — **data-driven** (the measured five-minute minimum is **5 of 518**, so thin
extended hours would produce a breadth figure over five names, which a reader will
believe) and **saying nothing outside a session** (blank whenever the market is,
which is what this epic's exit criterion worries about).

**There is no seam in `index.ts` that injects `marketOpen`**, which is worth knowing
before measuring anything: the 3.4 ms of `marketDateAt` **is** reproduced out of
hours because it sits upstream of the branch, and the breadth and movers legs are
not.

**The session basis needed a new wire field rather than a frontend fallback.**
`WireStoredFigure.sessionChangePercent` carries the last completed session's
close-to-close move, **omitted rather than zero** when there is no prior close —
and the field name had to carry the meaning because there is **no previous-session
date on `SecurityLastClose`**, only a number.

---

## 4. Counts, never percentages, and why the denominator is a fact about our reach

**`Market breadth` draws three counts, a remainder and a net headline** — not three
percentages. [`PRODUCT_SPEC.md`](../PRODUCT_SPEC.md) §9 sketches percentages and
**carries a dated amendment** saying why the shipped region does not.

**Two arguments, and the first is arithmetic.** Three independently-rounded
percentages sum to 99 or 101 — at N = 466 with an even split, `33.3 + 33.3 + 33.5
= 100.1` — so Story 4.4's AC 5 (_the three figures never sum to something a reader
can see is wrong at any rounding_) is a **defect** under percentages and **true by
construction** under counts: three integers summing to N exactly, with nothing to
round. The alternative was largest-remainder apportionment plus an exhaustive test;
Task 4.4.8 proved AC 5 **exhaustively over 21,464,520 triples** instead of
sampling.

**The second argument is the one that generalises.** A percentage hides its
denominator, and **the denominator here is _the part of the market we heard from in
the last five minutes_, which on IEX is a fact about our reach rather than about
the market.** IEX's live median per-symbol minute coverage is **65.1%** and the
worst case is **2.1%** (`ERIE`), with an ordinary maximum gap of **187 minutes** —
so **a name with no recent IEX bar is not a name that did not move**, and
`unchanged` and `not heard from` are different facts with the same appearance.
`UNIVERSE.md` calls this **breadth pollution**.

So the region states its population in words, from one builder:

- in session — `Of the 503 companies we track, 451 were heard from in the last 5 minutes`
- shut — `Of the 503 companies we track, 451 had a close-to-close move on 2026-09-11`

`describeMeasuredSet` in `apps/frontend/src/market/measured-set.ts` is the one home
(`one-home-for-the-coverage-phrase`), and **the session grammar is `had` rather than
`were` for a reason worth keeping**: the past tense is the one verb in English that
does not have to agree with the number in front of it, so `1 had` and `451 had` are
both right and an agreement disappears.

**`Not heard from` is the trailing group's label in the live grammar and `No prior
close` in the session one**, because `Not heard from` is a claim about a live feed
and is **false about a closed market**. **`unobserved` stays out of the tree and off
the screen**: it names the union `stored ∪ unknown`, it is `N` subtracted from the
population, and a fourth word beside three already on the wire leaves nobody able to
say which of the four a reader is looking at.

**Three states that look identical and must read differently**, each produced
through the shipped socket path:

| State                             | Means                                                  | Draws                              |
| --------------------------------- | ------------------------------------------------------ | ---------------------------------- |
| no `breadth` section on the frame | this gateway does not send breadth (a pinned rollback) | the reserved state — **not zeros** |
| section present, `N = 0`          | we counted and heard nothing                           | the sentence, no figures           |
| no frame at all, past the floor   | nothing reached this browser                           | the silence sentence               |

`N = 0` and `N = 1` draw **no percentage**: nothing over an empty denominator, and
`100%` over one security is technically true and reads as a statement about the
market.

**The silence floor is `useWaited` at `SAY_NOTHING_ARRIVED_AFTER_MS` (2,000 ms)**,
reused rather than reinvented, against a first frame measured at **174–277 ms** so
the ordinary load never reaches it. It exists because Task 4.3.8's state grid
**produced** a case nobody had drawn: a socket answered with the gateway's connect
snapshot and **no overview frame ever**, where `Sector performance` rendered a
titled, **empty ~440 px box indefinitely**, byte-identical at 600 ms and at 12 s,
while `Market proxies` 200 px above it said `No prices yet.` **Two regions, one
screen, one state: one explained itself and one did not.** The sentence sits in room
the reservation already holds, so **nothing moves when it appears** — and the words
are each region's own: the strip has no _prices_, sectors have no _moves_
(`No sector moves yet.`), breadth has no **count**.

**Two findings from drawing it that nothing mechanical would have caught.** **N
reached no listener at all** — the ledger is `aria-hidden`, so a screen reader got
the counts and never the denominator the story exists to show. Confirmed by reading
the accessibility tree before and after: before, `451` **appeared nowhere in it**.
Held since by `the-denominator-reaches-a-listener`. And **building the correct
version next door exposed a live defect shipped for ten days**: `visibility` on one
element un-hid the eleven held sector rows, **leaking internal sector slugs into the
tree**.

**And the headline's caption loses its direction at zero**, the owner's only Gate 2
change (2026-10-08). At `advancing === declining` it read **`NET ADVANCING`** over
**`— unchanged 0`** — a caption naming a direction the figure beneath it denies.
**Two of the eighteen produced states reach it** and neither had ever been drawn.
**Every channel was individually correct** — the glyph, the word and the sign all
agreed with each other and with `a − d = 0` — which is precisely why nothing
mechanical found it. The accepted cost is stated because it is real: **on a live
feed the label itself flickers** as `advancing − declining` crosses zero.
**Reversal trigger:** _the first sighting of the caption changing more than once in
a sitting_, which only the live rehearsal can report. The pivot is **`direction`,
never the digits** — `directionOf(net) ?? "unchanged"`, the same value `PriceChange`
renders the word from, so there is no second test of _is this zero_ to drift out of
step with the first.

`breadth-is-counted-over-the-equities-alone` holds the population.

---

## 5. The ranked surfaces

### 5.1 One comparator, one home, and it is no longer named for sectors

`moveRankingKey`, `compareByMove` and `selectMovers` live in `packages/shared`,
with `one-comparator-for-the-order-of-a-move` refusing a second — **keyed on two
moves either side of one operator** rather than on `.sort(`, which is the clause a
re-implementer cannot avoid writing.

**The absent-key rule is the part to reuse rather than re-derive:**

> A figure with no move has **no ranking key**. Every keyless figure sorts after
> every keyed one, and keyless figures hold the order they arrived in. **There is no
> default and no `?? 0` anywhere.**

`?? 0` would place a security we have not heard from **among the genuinely flat
ones** — ADR 0029's false impression expressed as a **rank position**. A non-finite
value counts as absent too, because a comparator returning `NaN` leaves
`Array.prototype.sort` with no defined order at all.

**And two figures equal at DISPLAYED precision do not swap.** Eleven sector ETFs
cluster tightly, and two sectors 0.003% apart would trade places on every frame, ~16
times a minute, both reading `+0.41%` throughout. Keyed on display precision rather
than on a chosen threshold, which buys a checkable invariant: **the displayed order
never contradicts the displayed figures.** `PERCENT_DISPLAY_DECIMALS` lives in
`packages/shared` and `formatChangePercent` reads it; **round anywhere else and the
drawn order can contradict the drawn figures.**

The comparator was put in `packages/shared` at eleven rows **precisely because of
the movers**: a top-N over the universe in a browser means shipping the whole
figure set, so the ranking is server-side, and a browser-only comparator would have
set the wrong precedent at eleven.

### 5.2 A top-N is a SELECTION, not a reduction — which is what makes it checkable

**The framing correction is worth more than the question it answers.** Story 4.5's
risk was briefed as _the same shape as breadth's irreducibility, only sharper_.
That is wrong. **Breadth is a reduction** — five integers reach the browser and
nothing can recompute one. **A top-N is a selection, and its rows carry their own
keys:**

| Sub-claim                            | Recoverable from          |
| ------------------------------------ | ------------------------- |
| the rows are in descending key order | **the frame**             |
| N distinct symbols, N rows           | **the frame**             |
| every row is in the population       | `GET /securities`         |
| **the cut**                          | **both bases, see below** |

**In the `session` basis `GET /securities` settles the cut completely** — it carries
`close` and `previousClose` for the whole equity set, so the entire ranking is
independently reconstructible. **In the `observed` basis the
snapshot-beside-aggregate pairing settles it**: `sendSnapshot()` sends the snapshot
and `overviewMessage()` back to back with **zero `await`s between them** (verified),
and `currentMarketState` is written only from the socket callback, which cannot
interleave inside a synchronous tick — so **the snapshot is provably the input the
aggregate beside it was computed from, guaranteed by the event loop rather than by a
tolerance.**

**Why that matters, measured:** Task 4.5.8 broke the cut and **every
frame-checkable claim stayed green** while **271 of 503 securities outranked the
weakest row drawn.** Only the independent recompute saw it.

**What stays irreducible** is the ~50 names never heard from, and our one-venue
tape. That is what the denominator sentence exists to confess.

**And a furnished frame cannot see a server-side computation.** Task 4.3.8 found
**four overview specs passing against a server with the ranking deleted** — each one
**furnished** the order it then checked, so it was asserting its own fixture.
`overview-sector-ranking.spec.ts`'s `openWithRecordedStream` is the pass-through
shape; copy it rather than the furnished harness.

### 5.3 The re-order treatment, and `ORDER HELD`

**Decided on eleven rows rather than on a top-N**, which is why the decision moved
from Story 4.5 to Story 4.3 on 2026-09-27: 4.3's own AC 5 deferred the rule to a
story **two ahead of itself**, leaving it three bad options — an untreated re-order
(the defect Task 3.6.3 forbade in as many words, _a row that moves while it is being
read is a row that cannot be read_), no ranking at all, or a rule invented and
retracted.

**What shipped:** a FLIP, **transform only**, offsets a multiple of the row pitch,
one settle for the whole list, **no stagger**, and the two events separated in
**TIME rather than in space** — `--motion-duration-settle` of stillness, then
`--motion-duration-settle` of travel. **The same existing token twice**; no new
token, no new number, no new limb (`the-settle-is-one-token-twice`).

**What decided it was not the measurement the task went to take.** Task 4.3.3 asked
whether the eleven sector ETFs arrive in one `bars` frame or several. They arrive in
**several** — the vendor batches a minute into **8.8 frames at the open, 6.8 at
midday, 16.1 at the close**, with no coalescing anywhere in our code. **That sounds
like the good answer and is not one**: `LIVE-DATA.md` §7.4 bounds the intra-minute
first-to-last spread at **243 ms p50 / 511 p95** over **n = 445 minutes and all 518
symbols**, the eleven are a subset so they are bounded above by it, and against a
900 ms decay **all eleven discs are lit together for ~650 ms however many frames
carried them.** Frame count and perceptual grain come apart, and the deciding figure
had been in the record for nineteen days.

**Three decisions and their accepted costs:** the 240 ms delay before the travel is
accepted (below a reader's threshold for _lag_, above it for _separate_, with the
printed ordinal committing with the **figure** rather than the travel so nothing is
stale during the pause); **reduced motion loses the fact that the order changed**,
and that reader gets the complete order exactly and not the event; and the wave
argument's derived half is **labelled as derivation rather than measurement**.

**No fourth mark.** A mark saying _this row moved_ is information a reader can only
use by remembering where it was — and at a mover list's scale it lands
disproportionately on rows that **received nothing**, so it decorates the stalest
figures on screen. The **movement** carries both positions; the **printed ordinal**
is the persistent record.

**The rank is printed as a number, and that is the keystone.** It converts position
from something encoded only by y-coordinate into a **stated fact** that survives
`prefers-reduced-motion`, greyscale, a screenshot and a reader who looked away — and
it is what makes these lists structurally different from the universe table Task
3.6.3 froze, which prints no ordinal and where a move is therefore unrecoverable.

**Never re-order with CSS `order` or `grid-row`.** That divorces the accessibility
tree from the screen and hands a screen reader a **different ranking** — invisible
to axe, to jsdom and to a screenshot. DOM order equals visual order is a correctness
requirement here.

**`ORDER HELD`** is the hold: with a pointer over the region or focus inside it the
order **holds**, labelled in the region's `meta`, with the figures and the rank
numbers **still updating**. It is scoped to the **region** via
`:hover`/`:focus-within`, **never to the row**, because row scoping lets rows move
out from under an **approaching** pointer. It is unbounded in time and bounded by
the reader, and it settles in one 240 ms when they leave. **Narrower than _freeze
the ranking while hovered_**: nothing on screen becomes false, and the mismatch
between printed ranks and vertical order **is** the pending re-order, readable with
no motion and in greyscale.

**The hold pins ORDER only, deliberately.** A row the pin has not seen is drawn in
its **ranked position among the rows it outranks** — not swept to the bottom, which
is what `rowsInPinnedOrder` did until Task 4.5.7 and which drew a new #1 gainer at
**#5 with `1` printed beside it**. **Reversal trigger, a condition:** _the first
surface that holds an order whose membership a reader must trust across the hold._

**Two states the hold cannot enter, both documented rather than repaired.** A reader
whose pointer is already resting over the region before the first frame arrives
enters with **nothing to pin**, so no hold and no badge until their next pointer or
focus event — nothing false is shown, and the alternative was re-pinning from an
effect, which the React Compiler's `set-state-in-effect` rejects. And **`Region`'s
`focusin`/`focusout` both bubble**, so every arrow press inside a ranked region
**releases the pin and takes it again**, refreshing the pinned order to the last
frame drawn: a reader's list can re-order under an arrow press, which is the one
thing the hold exists to prevent. Produced in a browser by Task 4.6.5, measured and
**routed to the owner** at Story 4.7's Gate 2 rather than repaired, because it
changes hold behaviour Story 4.5.7 settled with measurements. The repair is one
`relatedTarget` condition in `Region`'s `blurred` handler, and what it costs is a
reader who never leaves the region never seeing a newer order.

**The rates, measured over three real sessions**, so the window can be sized rather
than guessed: **0.21–0.44 membership changes a minute** and **0.80 / 0.45 / 0.42
total order changes a minute**, n = 9,360 adjacent-rank gaps. Small — but the
consequence of landing on the wrong security is a navigation, which is the one thing
a reader cannot undo with their eyes.

**Reversal trigger, a condition:** _the first sitting in which a person reports a
ranked region as flashing or refreshing rather than as facts arriving._ **The lever
is the disc, not the motion**, because a ranked list's aliveness is its order. **The
anti-lever: never slow the motion down.**

### 5.4 The held-row pad, and the 81 px it exists to prevent

**Each list holds only rows whose direction matches it**, so a one-sided market
draws one full list and one short or empty one rather than five gains under a
heading saying `LOSERS`. **That rule earns its place twice**: it prevents every
channel being individually correct while the heading is false, and it makes the two
lists **disjoint by construction**, which removes the same-symbol-in-both-lists
state and a silent collision in the order hold's `Map`, from one decision.

**The short list is padded with held rows** — `visibility: hidden`, `aria-hidden`,
in the array the FLIP is handed. **Without that padding 5 → 2 shrinks the region by
81 px** and steps the whole lower page at 768 and 390, where the grid rows are
untied.

**The region is one height in every state, at every width**, which is the property
the figures were recorded for:

| Taken                   | 1440    | 1024    | 768     | 390     |
| ----------------------- | ------- | ------- | ------- | ------- |
| Story 4.5 (2026-10-08)  | **466** | **466** | **466** | **466** |
| Task 4.7.4 (2026-10-11) | **491** | **491** | **491** | **491** |

The 466 was measured across **seven states including the reservation, the one-sided
day and the empty one** (and twenty-two width/state combinations in total); it became
**491** when the footer reserved **three** lines rather than two for the age clause,
which wraps to a third line at 390 and to none at 768 and above. **Nine live sites
carrying the 466 were corrected at Story 4.7's close**; the figures above are both
dated records and the property is unchanged.

**The empty state's sentences are each other's negatives and are not
interchangeable.** Both lists empty — CI's permanent state — draws the heading pair,
the bound falls silent, and the footer says _"…none were heard from… **There is
nothing to rank.**"_ One list empty — a one-sided market — says **`None of the names
we measured declined.`**, **not** _heard from_, which is the live grammar's phrase
and is false about a closed market.

### 5.5 The region states its own denominator, from the one builder

**A ranked list looks equally confident whether its input was complete or not**, and
a top ten over the ~466 heard from may show ten securities that are **not** the ten
biggest movers with nothing on screen saying so. **This is `EPIC.md`'s _an aggregate
is the one kind of number that can be wrong while looking right_ in its sharpest
form**, and it is why the denominator is restated **in the region** rather than left
to breadth 200 px away: a ranking's whole honesty is its denominator and a reader
must not cross the page for it.

The sentence comes from **the same builder breadth's footer uses**, in two grammars
keyed on the basis the wire sent, held by `the-ranking-states-its-own-denominator`.
A mover with no recent price is **excluded** — decided in writing, against including
it on its last stored close with the staleness shown; silently dropping it was never
an option.

**A live copy defect of the class this epic kept paying for** was found at Story
4.5's Gate 1, before a line was written: `MarketOverview.tsx` shipped _"The largest
moves among the **securities** we track"_, and `securities we track` is the whole
universe including `SPY` and the eleven SPDRs. **`the-population-is-never-a-literal`
does not catch it** — that clause fires on a digit beside `we track`, and this
sentence has none.

A second instance, found by Task 4.4.8's producer walk: the breadth region said
_"among the 503 companies we track"_ **in the one state with no readable
denominator**, and a produced frame carrying `tracked: 400` made it say **503**
anyway. It now carries no number in that state and is guarded by an invariant.

### 5.6 The bar: adopted for sectors, refused for movers, and the recorded reason was wrong

**Sectors get the bar.** Eleven sector ETFs all carry today's percent change on the
same basis over the same interval, so **the ratio of two bars is the ratio of two
moves** — a true statement. Central zero anchor, a printed stepped ladder
(`±1 / ±2 / ±5 / ±10%`, smallest step containing all eleven), **no** frame-max
normalisation, and **no bar at 390**, where 25 px either side of zero is a tick
rather than a bar. The label column is **fixed at 144 px, never `max-content`**,
because otherwise a re-order moves all eleven bars' origins, invisibly to everything
below a browser (`Communication Services` measures 143.75 px at 13 px in the text
face).

**The ladder resets at the opening bell**, stepping outward only within a session.
A step that survived the night opens every quiet Tuesday on the previous Friday's
rotation scale — **eleven stubs against a printed ±5%** — which says _nothing is
happening_ in the room it takes to say _a lot could_. The accepted cost is one
visible step-out in the first half hour of a heavy day; what is given up is
comparability across days, and **nothing else on this screen is comparable across
days**. The consequence is a code one: the step is **state with a session lifetime**,
not a function of the frame, so it cannot be a `Math.max` over the figures.
**Reversal trigger:** _the first reader who asks whether today's bars are drawn at
the same scale as yesterday's._

**Movers do not get the bar, and Story 4.3's recorded reason for that was false.**
4.3 refused it on _"one quantity versus four"_ — but a mover row carries today's
percent change against the previous close, **the same quantity on the same basis
over the same interval**, from the same `changeFromClose`. The phrase was borrowed
from Story 4.2's proxy-strip refusal, where it is correct. **Re-argued from scratch
the bar is still refused**, on three grounds that do hold: a **selected tail has no
range** (the top five are near each other _because_ they were chosen for being
extreme, so five near-full bars are an artefact of the selection); the ladder's
**outward-only ratchet** means one halt-resume print at +18% flattens the rest of
the session, which an ETF of seventy names cannot do and a single equity does
routinely; and a **single-signed list has no centre to anchor**.

**The `.held` badge needed the canvas's standing exception.** `The ranked list.dc.html`
drew it in `#9a6400`, the canvas page's own drawing palette, in no stylesheet here —
and **none of the three ambers that do exist can replace it**: `--palette-amber`
measures **1.73:1** on the page ground and **1.92:1** at 12 px, and
`--palette-amber-deep` is not a text ink. Amended to `--ink-primary` at
`--font-weight-strong` inside a `--rule-strong` hairline: **the intent adopted, the
value refused**, which is the settled rule that standing out is a job for weight and
hierarchy, never for ink outside the contrast floor.

---

## 6. Selection — twenty-four destinations, and why the figure is never the link

**`/` holds twenty-four destinations** since 2026-10-09: the four proxy tickers and
every ranked sector and mover row, each opening its security page by pointer and by
keyboard. **Tab stops go 11 reserved → 19 filled**, identical at all five viewports
measured; **the count that does not move is 7**, the region sections, which is ADR
0039's own figure and what `expectEveryRegionIsATabStop` holds.

**A sector row opens its benchmark ETF** — the only row on the screen whose
destination is not the thing it is named after. The region's footer already says
_"Each row is the sector's benchmark ETF — capitalisation-weighted, not the average
of its members"_, so the subject is declared on screen, and scoping the target to
the `XLK` cell means **the thing pressed and the thing opened are the same four
characters.** Rejected: not a link at all, which loses the payoff in the region most
likely to produce it; and the label opening a filtered `/securities`, which
contradicts the shipped rail decision.

**The figure is never the link.** Only the **ticker token** is activatable, because
a reader dragging to select a price must not navigate. Measured: **0 offenders
across 5 widths × 3 states** (`examined = 310–407` elements, `hovered = 24`
targets) — nothing without an `<a>` ancestor carries `cursor: pointer` or an
underline, resting or hovered.

**The ring forces the design rather than following it.** `18 + 2 × (2 + 2) = 26` is
the ranked row's padding box **to the pixel**; a row-height link gives a **34 px
ring against a 27 px pitch**, crossing both neighbours and putting the row's own
hairline inside the ring. **So the 18 px line-box target is a consequence, not a
preference** — and WCAG **2.5.8 is met by the spacing exception**, which makes the
**27 px row pitch the conformance argument**: shrink the row below 23 px and every
ticker link fails, with nothing mechanical reporting it.

**The focus ring clears the price's ink by +1.20 px, identically at 1440, 1024, 768
and 390**, with the `None stored` state at +5.35 — **photographed at 8× rather than
computed**, against a published `+4.34 / +5.25` that turned out to be three
compounding errors in one instrument. **1.2 px is a pass, not a comfort**: a gap or
an inset would move `.cell` off `16 + 26 + 16` and take the whole seven-region grid
with it, so more clearance at 390 is a **grid** change rather than a padding change.

**And the one thing that came out better than feared.** With a real
`<Link to={securityPath(symbol)}>` **the destination resolves at render, from the
row's own identity**. The activation race the Story 4.3 hand-off warned about — _a
frame lands between the keydown and the handler, the wrong security opens, and every
number on screen is right throughout_ — **is not a risk to manage. It is
unrepresentable.** Measured: **25 destinations activated for real, 25/25 landing on
the path their own `href` declared**, and **0 rows in any of nine states** where
`href ≠ /securities/<drawn ticker>`.

**What holds that is `one-home-for-imperative-navigation` over every shipped source
file in three trees**, and the corpus is the clause rather than the token. **The
first version of the check — four tokens over the four directories that draw rows —
was green on the file Epic 5 writes**: a new region is a new directory by this
repository's convention, so a hard-coded directory list filters the next region out
of its own check. The repair is `shippedSourceFiles()`, the whole three trees, with
one named allowance.

**A row with nothing behind it is not a link at all**, and the repair needed **two**
sites. `sector-performance.ts` carried the sector **slug** as the reserved rows'
symbol, so `securityPath(row.symbol)` built **`/securities/technology` ×11 on every
first paint**; `movers.ts` carried `NBSP.repeat(slot + 1)`, so the held pads built
**`/securities/%C2%A0` ×10** — in **CI's permanent state**, most of a weekend, and
the first minute of every session. `visibility: hidden` plus `aria-hidden` do
**nothing whatever** to an `href`. And the second site was one file downstream:
`RankedList` was passing its quiet group `held={undefined}` as a hard-coded
constant, **throwing the producer's answer away**. Both are now absent from the
markup in every state: a pad is handed **no link at all**, so it has no stop, no
arrow reachability and is never `End`'s target **by absence** rather than by CSS.

**Four roving groups, keyed on `symbol`, never on an index.** A held index is a
second, disagreeing copy of where focus is, and it diverges exactly when the list
re-orders — which is every minute. **Arrows clamp and do not wrap**, `Home`/`End`
scope to the list, there is **no crossing** from the last gainer to the first loser
(two lists with two accessible names, not one list with a rule through it), and
`Space` is left to the browser. When a focused row's security leaves, focus moves to
the row **now at that rank**.

**Three things nobody has, and they are named rather than implied.** The arrival
announces **nothing**: `index.html` holds one static `<title>MarketPulse</title>`,
`App.tsx` uses React Router in declarative mode with no route announcer, and the
destination's `<h1>` is **`Security Explorer` on both routes**. So a listener
activating a mover gets **no load event, no title change, no focus move and no
announcement.** That became the **ninth** screen-reader entry and it is the
**inverse** of the other eight: those are unprompted updates, and this is a change
the reader explicitly asked for, which is the one case where announcing is
unambiguously right. It was **raised rather than built** — a per-route
`document.title` is ~10 lines, but it is product-wide and `/securities`' own links
have had the same hole for two epics.

---

## 7. The degraded set

### 7.1 Thirteen states × four widths × seven surfaces, and the grid is a KEPT spec

`e2e/specs/overview-degraded-grid.spec.ts` — **52 rows and 104 photographs**,
greyscale at every width, at **1440, 1024, 768, 390**. Every row is a drive through
the shipped socket path, the connect sequence, the decoder and the renderer. The
photographs are the same mechanism behind a flag:

```sh
DEGRADED_GRID_PHOTOS=1 pnpm e2e overview-degraded-grid.spec.ts
```

~1.4 minutes, 104 PNGs and four `readings-<width>.json` into a gitignored
directory.

**It is kept rather than thrown away precisely because Task 3.10.9's grid was
deleted and took a repair with it**, which Task 4.7.1 then had to re-derive two
epics later. That is the one place this epic departs from _run it, record the
findings, delete it_, and the reason is recorded.

**The story was told it would EXTEND Epic 3's grid and that premise was false.**
`.capture/proxy-states/readings.json` is **81 rows across 16 state ids**, every one
a **data or basis** state — no drop, no stale, no reconnect — and **zero specs that
visit `/` had ever degraded a feed.** ACs 1–2 were therefore **production with a
method inherited** rather than extension. A second falsification came with it: **the
shared harness could not hold a disconnection.** `e2e/support/feed.ts`'s
`routeWebSocket` callback unconditionally re-sent a `live` snapshot, so a produced
`disconnected` **self-healed ~2 s after `drop()`** — Task 3.10.9's fourth instrument
error, whose fix lived in a deleted script and **was never carried into the shared
harness**.

**What differs across the four widths — three things, and no more**, measured by
diffing every surface of every state against its 1440 row: `Sector performance` at
1024 (the ladder's tick labels), **nothing at 768**, and `Sector performance` plus
`Movers` at 390 (the dropped price column). The masthead's descriptor is the third
and is excluded from both keys. **No degraded sentence is longer at 390 than at 1440.**

### 7.2 The one furnished row, and why it cannot be produced

**Row 08 — a rollback with no `breadth` section — is furnished in the strong sense
and is labelled `rollback`.** `WireMarketOverviewInputs.breadth` is **non-optional**,
so **no shipped producer can build it**; the read side admits it because a new
bundle meeting a pinned previous image is a reachable pair. **That is the honest
label for an unproducible state**, and it is a template: the spec carries the section
to paste in when the rollback is _not_ what a row meant to model.

**Row 07 is the near miss worth copying.** A `movers` section the decoder refuses
could have been furnished by omitting it; instead the frame carries a `movers` list
that is **type-legally out of rank order** — `gainers` is a
`readonly WireOverviewFigure[]` and nothing in the type says it is ordered — so the
**shipped encoder** serialises it and `readMovers`' own `isRankedByMove` check
refuses it. **The whole path is shipped; what is furnished is only the cause**, which
in production is deploy skew or a gateway defect.

**Three more states are enumerated and not produced**, each with its reason, printed
by every run in `ENUMERATED_AND_NOT_PRODUCED`: CI's shape with the market **shut**
and no close anywhere (`market-breadth.ts`' behaviour with a `null` session is
unchecked); a region whose content **threw** (no frame can reach it — it is covered
one layer down by `Region.test.tsx`' exhaustive walk); and the masthead's other three
market-shut spellings, which are a property of when the suite ran.

**One caveat on the photographs on record:** they were taken on a branch **without**
Task 4.7.8's `composes` repair, so their chrome above 560 px is of the defect. The
**strings** are unaffected, because the masthead is excluded from both comparison
keys and the descriptor is `display: none` at 390.

### 7.3 Partition by content class, not a count — and the count form was green on the defect

**AC 2 (_no two states read identically_) is expressed as a class rather than as a
count**, and this is the section's most reusable finding. The assertion is _the
partition of rows by **drawn string** equals the partition by **declared class**_,
pairwise, so it fails **in both directions**:

```text
Error: 03-ci-shape-nothing-at-all and 09-restarted-replica-on-reconnect read
IDENTICALLY over the content surfaces at 1440 and declare no shared class —
an accidental collapse
```

```text
Error: 03-ci-shape-nothing-at-all and 09-restarted-replica-on-reconnect share
the content class one-aggregate-the-empty-join and no longer read identically
at 1440 — the documented exception has stopped holding, which is the direction
a count cannot see
```

**Both fired for real during Task 4.7.9 rather than being argued**, and the count
form `rows.length - 1` was **shown green on the same defect**, because the pair that
collapses is still a pair — it is simply a different pair.

**The rule the partition turned out to express is better than a list of
exceptions: a content class is ONE AGGREGATE.** `main` is a pure function of the
aggregate, so two rows carrying the same figures **must** read identically over the
five content surfaces however their connection, service or market session differ —
and ADR 0029's one-home rule is what keeps those three facts in the **chrome**,
where the second key can see them.

1. **`one-aggregate-the-session-basis`** — closes present with nothing observed, the
   feed stopped mid-session, the feed stopped with the market shut, and the backend
   unreachable are **byte-identical over all five content surfaces at every width**.
   _A reader of `main` cannot tell these four apart because there is nothing in
   `main` to tell apart._ They separate on the two footer cells.
2. **`one-aggregate-the-empty-join`** — **found by this grid on its first run, in
   the accidental-collapse direction.** CI's permanent store and a replica restarted
   mid-session are **one picture**: four `unknown` figures, eleven `unknown`
   sectors, `measured: 0`, two empty lists, no observation instant. The collision is
   right, and it is the sharp edge of the half Task 4.7.3 could not repair: **the
   screen has no memory, so the state a reader ARRIVES in and the state a reader is
   DROPPED into after a deploy are the same seven surfaces** — only the transition
   differs, which is exactly why a memo could not reach it.
3. **`the-session-word-has-one-home-and-it-is-the-masthead`** (chrome key) — the
   market being shut and the feed having stopped are the same seven surfaces at
   every width. `marketOpen` rides the `feed` frame and reaches no word of the
   status bar or of `main`; `MarketSessionStatus` owns it, **from the wall clock**,
   in the opposite corner of the viewport.

### 7.4 What the landing page says, and what it deliberately does not

**Ages, never a verdict.** The owner held Story 3.10's one-home rule at Story 4.7's
Gate 1: `live` / `stale` / `disconnected` have **one home and it is the status
bar**, and no threshold, no status word and no connection word was added anywhere on
the landing page. AC 4 is therefore **met by doing nothing**, held by checks that
existed before the story — `a-second-staleness-sentence`,
`one-home-for-the-strip-staleness-sentence` and `the-send-instant-is-not-a-clock`.

**What was added is an instant**: `Market breadth` and `Movers` each state **when
the window they measured over ended**, beside the denominator they already stated.

```text
Nothing newer than Sep 16 · 14:02 EDT has reached us.
```

Built once in `describeMeasuredReach` (`measured-set.ts`) and read by both regions,
and **absent rather than empty** when the aggregate holds no observation — which is
CI's permanent answer. **The instant is the observation interval's END**, a bar's
`startsAt` plus `OBSERVATION_INTERVAL_MS`, because `t` marks the **start** of the
minute a bar describes: _nothing newer than 14:01 has reached us_ is false about a
feed that has just delivered the 14:01 bar, because the 14:01–14:02 minute has
reached us whole. **That is Task 3.3.4's defect met one surface over**, where leaving
the addition out made `live` structurally unreachable during a session, and it is
held by `the-footer-age-is-the-intervals-end`.

**Why these two regions and not their siblings:** they are the two things on this
screen **most confidently wrong when stale** — a count and a ranking read as current
whatever produced them — and until Task 4.7.4 they carried **no instant in any
state**, while the screen-level `Observed through` sits roughly 2,500 px below both
at 390 behind three reserved panels.

**Feeding `observedAt` into `feedStatusFrom` was refused with a measurement:** it
returns `stale` on absence, which would make **every gated run and every
no-provider deployment read `stale` during a session**, and it would make `/`'s
connection word computed over 518 securities while `/securities/:symbol`'s is
computed over one — **a route-dependent connection word.** A per-security staleness
verdict was refused with a different measurement: the ordinary maximum gap between
one security's bars is **187 minutes**.

**Three more visible repairs from the same story.** A **mover row whose company
name has not arrived draws blank room rather than its ticker twice** — `3 NVDA NVDA`
was reachable on an ordinary cold load, because `GET /securities` takes 174–277 ms
against a frame at 124 ms, and at 390 the price column is dropped so there was
nothing between the duplicates (accessible name unchanged;
`a-mover-stands-its-ticker-in-for-its-name` holds it). **A region's head no longer
outlives its content**: a thrown `Movers` used to leave `Top 5 each way` — or
`ORDER HELD` — over a box saying the region could not be displayed. And the
masthead's `MARKET SITUATIONAL AWARENESS` renders at the **9px/9px its own rule
declares** rather than the 11px/16px it had been inheriting through a `composes:`.

**Nothing becomes non-activatable because a feed stopped**, which the degraded set
shows rather than argues: the destination is built from the row's **ticker**, which
no feed state changes, and **a tripped `ErrorBoundary` keeps the section's name, its
landmark and its own tab stop** while losing the roving stops with the content.

### 7.5 The 390 question, which was replaced rather than answered

**The question this epic inherited was _does a reader notice the status bar change
at 390_.** Measured on the deployed site, **the answer is that for the first 165
seconds there is nothing to notice**:

```text
t=0s   connected: LIVE
t=20s  LIVE   … t=160s LIVE
t=165s DISCONNECTED
```

**Exactly 165 s**, and the mechanism is the monotonic watchdog — no inbound frame of
any kind for `DISCONNECTED_AFTER_MS` — not the socket closing, which the browser
detects immediately and uses only to start reconnecting. **Two findings made the
original _below the fold_ story weaker still**: the status bar is **sticky**, so it
is on screen at 390 whatever the scroll, and when it flips it **grows**, which is a
size change that moves the page.

**What replaced it, measured over thirteen produced states:** at 390 the difference
between _the market is shut_, _the feed has stopped_ and _the backend is gone_ is
**two cells at OPPOSITE CORNERS** of the viewport — the masthead's session word (top
right, wall clock) and the status bar's connection word (bottom, sticky) — because
all three states carry one aggregate and `main` is a pure function of it.

**The size signal exists at 390 and essentially not at 1440.** The sticky bar is
**109 px** on `LIVE` + `HEALTHY`, **131** on `STALE`, **149** on `DISCONNECTED` and
**169** with the backend gone — **+40 px and +60 px of a 780 px viewport (5.1%,
7.7%)** — against **2 px** at 1440. It is a **height**, not a line count:
`innerText` is identical however a sentence wraps.

**165 s was kept and the KEEPALIVE was re-derived instead**:
`KEEPALIVE_INTERVAL_MS = DISCONNECTED_AFTER_MS / 3` = **55 s**, written as the
division so the relation cannot decay, which makes 165 s **three missed heartbeats
of our own heartbeat** — ADR 0036's rule honoured rather than a number tuned.
`DISCONNECTED_AFTER_MS` could not have moved: the same constant arms the backend's
vendor watchdog. 55 s clears Azure's 240 s ingress idle ceiling by **4.36×** against
2× before, and costs **129.8 B/min** per attached browser against 59.5.

**And the `~90 s` candidate this epic floated for four days is withdrawn, because
the figure it rested on was the defect.** The `54.0 s` longest-idle reading **was**
Alpaca's own heartbeat seen one hop away (§8.4), so after the repair the browser's
only routine inbound frame is **our keepalive**: against a 120 s keepalive, 165 s
is **1.375×** rather than 3.06×, and **90 s would fire on every healthy idle
browser.** The `≤ 5 s` deploy reading **stands** and its own premise did not — it
was taken at **08:37 ET, pre-market**, and `live` is reachable in the deploy window
**only out of hours**.

**What is owed is a person.** AC 5b — a sitting on a real phone during a real
session — is the single row Story 4.7 ships owing, and it is the item `EPIC.md` says
is owed **a person before this epic ships a screen**. Three questions nothing
mechanical can answer are in front of it: whether a reader consults **both corners**
at 390; the **2,000 ms floor**, derived from 174–277 ms against a local pair and
**never met on a real network**, so a radio that crosses it draws four sentences
saying _nothing is coming_ and then replaces them with figures; and a
**backgrounded tab**, whose word lags by a throttled timer tick and which does not
redial at all until `visibilitychange`, for which **no figure exists**.

### 7.6 Five first drafts were green on the defect they were written for

Recorded together because it is a pattern rather than one task's accident, and it is
why `CLAUDE.md`'s 2026-09-26 rule earned its place seven more times in one story: a
brace matcher walked past a **block comment**; a three-state walk missed the retry
cell; a spaced substring was **never present** because Playwright normalises across
cell boundaries with no separator; a clause tested for an identifier that sits on the
module's **import line** rather than for the addition; and a focus listener was saved
by reusing an effect gated on a prop **six of the seven regions do not pass**. Beside
them, three weaker wire-level drafts passed against the unrepaired gateway, and one
assertion was green because **both of its readings were `stale`**.

**The procedure that catches them:** write the file the next story would write, run
the check, **keep the transcript of it passing**, then fix, then confirm red, then
delete the file.

---

## 8. What the screen costs

**Read §0.2 before quoting anything here.** Every figure carries its task; the
instrument, the n and the arms are in the task file.

### 8.1 Per applied batch, in the browser

| Quantity                                        | Figure              |
| ----------------------------------------------- | ------------------- |
| main-thread work on `/`, net of a quiet control | **3.7–5.1 ms**      |
| of which the aggregate                          | **2.8–3.9 ms**      |
| `longtask` entries                              | **0 in seven arms** |
| worst rAF gap (16.7 ms quantum)                 | **17.7–17.8 ms**    |
| largest single React task / delivery task       | 2.5 ms / **4.5 ms** |
| per minute, at 6.8–16.1 batches                 | **25–82 ms**        |
| calibrator                                      | **×1.00**           |

**AC 1's own premise was wrong**, and the correction is worth knowing before
measuring: **a browser on `/` subscribes to ~25 symbols, not 518** — four proxies,
eleven sectors and ten movers — so _the whole universe arriving_ is **not a state
this route has**. The 518 is entirely server-side, which is why both sides of the
wire were measured separately.

**And the route draws nothing from the `bars` frames it buys.** An arm sending only
`bars` frames to those 25 symbols, with prices that moved every batch, left
`<main>`'s text **identical byte for byte** — every figure on this screen comes from
the aggregate, and the subscription exists so the **arrival mark** can fire. Priced
for the first time by Task 4.8.4: **0.9–1.2 ms a batch in the browser and ~3,000 B a
frame**, plus the gateway's per-client scope and encode. **That is not a defect and
must not be read as one** — the mark is a shipped design decision implementing _a
fact arriving DECAYS_. What is new is that nobody had priced it.

### 8.2 Per applied batch, on the server — and this figure has moved three times

| Taken                                      | Figure                                 |
| ------------------------------------------ | -------------------------------------- |
| the fifteen, no breadth (4.4.4, dev build) | **0.118 ms**                           |
| 518 + breadth (4.4.4, dev build)           | **3.497 ms**                           |
| the breadth count alone                    | **0.041 ms — 1.2%**                    |
| + movers (4.5.4, dev build)                | **3.866–4.002 ms**                     |
| `selectMovers` alone over 503              | 0.123–0.129 ms                         |
| **the production artefact (4.8.11)**       | **1.521 ms p50**, n = 298              |
| **with nobody attached (4.8.11)**          | **0.000 ms** — 0 joins over 500 bursts |

**Re-measure rather than subtract.** `marketDateAt`'s repair (§8.3) landed between
the 3.497 and the 1.521, so Task 4.8.3's **3.708 ms** is an upper bound on an older
tree and is not the figure to quote; **nothing has re-run the join-alone arm since
the repair**, so breadth's and movers' shares of 1.521 ms are **unmeasured**. Every
product derived from 3.72 ms — 11.2 ms a cold `/`, 7.4 ms a placeholder route,
3.72 ms a resubscribe — is **pre-repair**, and a naive rescale putting a cold `/`
near 4.6 ms is **an estimate, not a measurement.**

**The attribution is the part worth having**, and it has survived every re-take:
**3.4 of the 3.5 ms was 518 `marketDateAt` calls** at ~6.6 µs each inside
`changeFromClose`'s same-session branch. Nothing observed → 0.016 ms; observed with
no closes, so `changeFromClose` returns before its session comparison → 0.019 ms;
with closes → 3.42 ms. **Neither the counting nor the ranking is the cost**, and
movers added 0.3–0.4 ms rather than another 3.4 **because it ranks the figures the
join already produced rather than re-deriving a move.**

**The control is what makes that attributable rather than merely adjacent**: Task
4.5.4's control reproduced 4.4.4's 3.497 ms baseline **to 0.1%**. **The maxima are
unusable and were reported as unusable** — the control moved 3.74 → 25.7 ms between
runs while its median moved 0.23.

**The fan-out beside the join** is 1.59 ms at 518 subscribed and **0.67 ms per
additional client**.

### 8.3 Two computations removed, with no memo added

**`marketDateAt` read the market formatter's parts three times per answer and used
one** — **1,554 `formatToParts` calls for 518 conversions** — and now reads them
once: **3.366 → 1.288 ms p50 over 518 instants (−61.7%)**, with `marketWallClockAt`
3.365 → 2.176. **No rendered string changed.** It is in the one module both sides of
the wire share, and `market-date-reads-the-parts-once` holds it **because the
delegation that undoes it is the better-looking code.** The minute-keyed cache
(−99.9%) was **not** taken here: it puts mutable state into the one module held out
as a pure conversion seam, and it stays Epic 14's named candidate — now worth
**1.29 ms rather than 3.4**.

**And the aggregate join ran with nobody attached.** `publishObservations` evaluated
`overviewMessage()` as an **argument** to a broadcast over an empty client map, so a
deployment with no reader paid **10.3 ms of script a minute at the measured 6.8-batch
midday floor and 24.5 ms at the close's 16.1**, for a frame sent to nobody. It is now
**two early returns that say which is which** — the first about what the current
market state **applied**, the second about who is **attached**.

**The wire cannot see that defect, and the first draft of the check proved it.**
_No overview frame is sent with nobody attached_ **passed against the unguarded
gateway**, because `broadcast` iterates an empty map and sends nothing either way.
The assertion had to be that the **producer was not called** —
`market-gateway.process.test.ts`, _"does NOT build the aggregate when no browser is
attached"_, with `pnpm break the-join-runs-with-nobody-attached`. **The same trap
was met a second time** for the last-broadcast repair: three weaker drafts — _the
reloaded tab receives an overview frame_, _it carries as many figures as the first
tab's_, _it decodes and names the symbol_ — were **all green on the defect**, because
a poorer aggregate is a well-formed aggregate.

**ADR 0028's cover and the chart's rebuild were both declined with reasons.** The
chart rebuilds on a tick nothing on the chart changed — **1.3 ms at 1,950 bars and
3.6 ms at 6,630, which is 12% and 27% of the 10.9 / 13.2 ms render task containing
them** — plus **2 rebuilds a minute from the health poll with nothing sent at all**.
The memo was **declined** with a ratio-shaped reversal trigger.

### 8.4 The frame, and the bytes

| Shape                                              | Bytes         |
| -------------------------------------------------- | ------------- |
| CI's shape (four `unknown`, `measured: 0`)         | **928 B**     |
| closes held, nothing observed                      | 2,042 B       |
| all 518 observed, **session** basis                | 3,142 B       |
| all 518 observed, **observed** basis — the ceiling | **4,078 B**   |
| built in a browser with the shipped encoder        | 3,990–4,002 B |

**27.1 KiB/min at the measured midday floor of 6.8 batches a minute and 64.1 KiB/min
at the close's 16.1**, which is **6.9%** on top of a 518-subscribed client. On `/`,
where ~25 are subscribed, **the aggregate is 1.4× the `bars` frame beside it and the
larger half of what the route receives.**

**ADR 0038's verbatim 431-byte frame is a record of 2026-09-26 and must not be used
to size anything** — it was four stored proxy figures and nothing else. The arithmetic
that circulated from it (`6.9 KiB/min`, `12% on top of a 518-subscribed client`) was
wrong twice over: the 12% divided by 56.9 KiB **a minute** when that client's `bars`
frame is 58–59 KiB **a batch**, and the one-symbol comparison has no subject because
`/securities/:symbol` subscribes to all 518 too.

**CI's 928 bytes carry FOUR `unknown` proxy figures and eleven `unknown` sectors, not 518.** A CI-shaped aggregate built from the shipped types is **841 bytes** against the
928 recorded off the real gateway; **518 unknown figures alone would be roughly
21 KB.** The 518 and the 503 are the **population**, carried as `tracked`.

**And one candidate is recorded rather than taken, as a product decision rather than
an optimisation.** `changePercent` crosses the wire **unrounded** —
`1.6244720133889459` verbatim off this product's own encoder, where the screen draws
`1.62` — at **~13 bytes a figure and ~350 bytes a frame, 9% of the aggregate**. The
owner decided at Story 4.9's Gate 1 that **it stays unrounded**: `moveRankingKey` is
keyed on the **displayed** figure so a browser is fine, but an agent or a later tool
sorting on the raw value would not be, and 350 bytes buys a correctness property that
is expensive to get back.

**The `feed` frame's rate was the other byte finding, and it was ~15 MB a session a
phone never needed.** The gateway published a `feed` frame **once per item of every
inbound vendor message and again on the vendor's `ping`** — a median of **332 frames
a minute** on the deployed gateway in session (min 3, max 385), **119 bytes** each
with no `perMessageDeflate`, ≈**15.4 MB** a 6.5-hour session **per attached
browser**. A socket subscribed to `NVDA` alone received **310 frames in 75 seconds**;
**three distinct payloads in 3h48m**, 30,865 consecutive frames identical. **It
reached nobody's eye**, because `sameLiveFeedView` had always suppressed the no-op
render — the mitigation for the symptom predated any count of the cause. The send
site now compares the **published** view. **Read it as bytes and battery rather than
as a render repair**: `/`'s two renders per applied batch are unchanged, and
`the-feed-frame-is-a-heartbeat-again` is the break. **The deployed in-session
re-count is owed** — the expectation is **~1.4 frames in 75 s** against the 332, and
**nothing a developer or a gated machine can run reproduces the rate in either
direction**, because neither offline feed has the per-item loop.

### 8.5 Renders — the count, which is the arm load cannot corrupt

| Route                                             | Renders per applied batch | Per minute at 6.8–16.1 batches |
| ------------------------------------------------- | ------------------------- | ------------------------------ |
| `/`, `/securities`, `/securities/:symbol`         | **2**                     | **13.6–32.2**                  |
| `/investigations`, `/replay`, the not-found route | **1**                     | **6.8–16.1**                   |

**From 0 before Story 4.2**, counted on React's commit hook against the real
gateway. `useLiveFeed` is called in `App`, the overview field is compared in
`sameLiveFeedView` **by identity**, and the decoder builds a new object per frame —
so **the gate cannot collapse it by construction**, and no repair at
`sameLiveFeedView` is available because naming `computedAt` there **fails the build**
on a shipped invariant. **That is §28's _routine_ word rather than Epic 14's cold
load**, and the error direction is the safe one: over-eager renders, never a silent
miss.

**A sentence this epic carried at three live sites was wrong twice.** _"A security
page subscribed to one symbol went from about one whole-tree render a minute to up to
sixteen"_: `/securities/:symbol` subscribes to **all 518** (the table renders there
too, read off the `subscribe` message — 1 then **518** on both `/securities` routes,
**25** on `/`, **0** on the three placeholders), so it already received a `bars`
frame per applied batch and went **1 → 2**, one more rather than fifteen; and _one a
minute_ was the **fixture's** cadence.

**The two frames of a batch are two tasks**, so the second render is not avoided by
browser batching; whether React coalesces them turns on the inter-frame gap,
**4.4–8.4 ms on `/` and 23.7–33.1 ms on `/securities/:symbol`**.

### 8.6 The cold load — `/` against `/securities`

**40 interleaved loads, four arms, 20-row controls on both sides**, on a production
build, every observer proved by a plant on the page that produced the figure and a
calibrator beside every reading:

| Arm                           | Nodes                             | Over §28's line                      | Worst rAF gap          |
| ----------------------------- | --------------------------------- | ------------------------------------ | ---------------------- |
| `/`, 518 securities           | **447**, 29 anchors, **0 `<tr>`** | **0 of 10** (one 50.9 ms frame)      | p50 24.7 / p95 34.7 ms |
| `/`, 20-row control           | **447**                           | 0 of 10                              | —                      |
| `/securities`, 518            | **10,318**                        | **10 of 10**, frames of 62.8–77.4 ms | p50 66.7 / p95 68.5 ms |
| `/securities`, 20-row control | **765**                           | 0 of 10, 18.8 ms floor               | —                      |

**`/` is measured NOT in breach, with a control**, and **447 nodes at 518 securities
is identical to 447 at 20** — the landing page renders no element per security.
`/securities`' breach is **attributed and split**: ≈ **6 ms** for the 518-security
payload (which `/` also pays) and ≈ **48 ms** for the 518-row table's markup, at
≈ **3.9 µs a node**.

**The breach has moved CHANNEL rather than size**, which is the finding that
generalises: `PerformanceObserver({ entryTypes: ["longtask"] })` — the instrument
**three documents named as the re-measure** — now reports **nothing at all**, while
`long-animation-frame` reports 62.8–77.4 ms on 10 of 10 loads and an rAF-gap recorder
reports 50.0–68.5 ms. **A channel going quiet and a cost going away produce the same
output**, so an arm counts only when **every** channel it reports caught the plant.
`PRODUCT_SPEC.md` §28 states the method as **three channels** for this reason, and
the **unit** in the old `one task of 50–76 ms` description is corrected rather than
the number.

### 8.7 Epic 14's trigger was evaluated a FIFTH time and did not fire

**Wording untouched, and one new clause beside it.** The trigger —
_"the first time a second surface on this page renders per-row markup at universe
scale"_ — is written against `/securities` and **cannot fire on `/` at all**, because
on `/` there is no first surface at universe scale. The new clause, in
[Epic 14's own `EPIC.md`](../epic-14-performance-scale-validation/EPIC.md):

> **The first surface on `/` that renders one element per tracked security.**

**First** there and **second** here, because on `/securities` the first such surface
already **is** the breach while on `/` it would **create** one. **Priced before it
fires**: roughly **24.7 ms → 60–75 ms** of worst frame, with the clause made
**mechanical** — a browser equality check whose plant takes the page
**491 → 1,009 elements**.

**Gate 1's decision shipped at half its size.** A second clause — _the first time the
aggregate is produced at a cadence the bar feed does not set_ — is **withdrawn and
not replaced**, because it was **already true on both of its readings**: a cadence
the bar feed does not set already exists and is accepted in writing (`App`'s 30 s
health poll, accepted since Task 1.12.3), and the aggregate is already produced off
the observations path. **A condition that has never been false cannot fire.** Its
content was not discarded: it repaired Epic 14's own clause in place and the
call-site count it rested on is now held by `the-aggregate-has-three-producer-paths`.

**`PRODUCT_SPEC.md` §28 took no third exception.** What it gained is the **method**
and a corrected **unit**.

**And re-wording the original trigger was explicitly declined**, on three grounds:
it is quoted verbatim in many live places, so a rewrite changes retroactively what
Epic 14 was told it owns; a trigger naming _computation_ at universe scale would
**already have fired** on Task 4.4.4's widening, making Epic 14 retroactively due for
a 3.5 ms cost against a 50 ms line; and the two costs want different repairs —
Epic 14's candidates are DOM-size levers where `/`'s cost wants memo boundaries and a
memoised `marketDateAt`. **One condition over two levers is how a trigger stops
meaning anything.**

---

## 9. What no gated machine and no person has ever seen

**This is the most important section in this document and it must not be softened.**

**CI's store has 516 securities (518 deployed, 516 active) and ZERO bars.** So on
every gated run the overview aggregate is **928 B of `unknown`, for ever**:
`measured: 0`, `eligible: 0`, two empty lists, no `observedAt`. `pnpm store:bare`
reproduces that shape locally in seconds.

| What has never been seen                      | On any gated machine | By any person | Ledger row owing it |
| --------------------------------------------- | -------------------- | ------------- | ------------------- |
| **A proxy figure moving against a real feed** | never                | never         | Story 4.2           |
| **A sector rank moving**                      | never                | never         | Story 4.3           |
| **A breadth figure at all**                   | never                | never         | Story 4.4           |
| **A mover**                                   | never                | never         | Story 4.5           |
| **A mover clicked through**                   | never                | never         | Story 4.6           |
| **The screen at 390 on a phone, mid-session** | n/a                  | never         | Story 4.7 (AC 5b)   |
| **Any cost figure against a real feed**       | never                | never         | Story 4.8           |

**`LIVE-REHEARSAL.md` carried seven `OPEN` rows on 2026-10-12**, and it read **six**
until that day: Story **4.6** had **no row in that ledger at all**, found
independently by Tasks 4.9.2 and 4.9.4 on the same day **by going to use the list
rather than by reading it**. `the-epic-close-cannot-outrun-the-rehearsal-ledger` is
the mechanism that stops an epic closing unwatched.

**What that means per region, stated specifically:**

- **`observed` and `stored` occur on no gated machine**, and the two-tape source note
  only **mid-session** — after that night's backfill the same window names one
  source, so the photograph **expires that night**.
- **The `observed` basis cannot be checked on any machine**, because the basis is
  session-driven and exists only 09:30–16:00 ET.
- **The sector region renders no `<ol>` at all when nothing is ranked**, so every
  list-keyboard assertion in that region is **vacuous on the gate**.
- **The ten held pads are CI's permanent state**, so the padded state and the
  one-sided market are the two states no gated machine has ever drawn with figures
  beside them.
- **The epic's own exit-criterion clause — _land on `/`, reach a mover, open it, read
  a figure_ — has a last clause no gate can reach at all**: it needs bars at both
  ends. The gated journey passes on a bare store in 1.9 s with the **third** row
  activated and the ticker read **off the row the test is about to activate** (proved
  by substitution), which proves the wiring and not that a real ranked row on a real
  store opens the right page.
- **Frame COMPOSITION has never been recorded anywhere in this repository** — only
  counts. `LIVE-DATA.md` §9.5/§10.2 records 332 bars in 8.8 frames at the open, 284
  in 6.8 at midday, 450 in 16.1 at the close; **whether the eleven sector ETFs arrive
  in one frame or eleven is unknown**, and **three stories were told to size per-frame
  work against it and all three had to assume**. No fixture, address or clock can
  produce it: a replay emits one slice per minute across every symbol and
  `createFixtureStream` ticks once a minute, so both offline feeds have a grain the
  live feed does not have. **It expires with every session that passes.**
- **A replay cannot answer a question about frame grain, structurally.** Proved at
  60× and at 1×: a replay returns _one frame, 0 ms spread_ **100% of the time, at any
  speed**, and every observation in a replayed frame **shares one `startsAt`**, so a
  split minute **cannot be expressed at all**. **What a replay certifies is the wiring
  and never the loop.**

**Three epic-level claims this screen leaves standing.** The day's biggest mover **may
be a name we never heard from**, and nothing on screen or off it can say whether it
was. The ranking is over a **one-venue tape**, so _the biggest movers_ is strictly
_the biggest movers among the names one venue told us about in the last five
minutes_. And an aggregate is **checkable by nothing**: a breadth count that is
quietly wrong looks exactly like one that is right, on every screen, in every test.

**The one genuinely EXTERNAL check this epic has ever had available is the movers
list**, and that is why `THE-SITTING.md` takes it first. Breadth's integers can be
compared with nothing and a proxy's price is one number; **ten tickers and ten
percentages is a list**, and a person can check it against any public market screen
in fifteen seconds. **Expect disagreement on membership** — our population is 501
curated names and _the part of the market we heard from in the last five minutes_ on
IEX — but **a percentage that disagrees for a ticker on both lists is a real
finding.**

---

## 10. The traps

Each of these cost somebody real time, and most are invisible to everything
mechanical.

1. **A `span N` item wider than the explicit grid is not clamped — it grows implicit
   columns.** A `span 3` region in a two-track grid produced `134px 134px 676px`, a
   visibly broken page at every width under 1184 px, **with `pnpm verify` and all 54
   browser tests green.** Every breakpoint that narrows a grid **restates its areas**.
   Nothing below `pnpm e2e` can see it.

2. **`composes:` does not give the composing rule the last word.** It concatenates
   **class names**; it does not inline or cascade, so which declaration wins is decided
   by **stylesheet order**. `composes: microLabel` followed by `font-size: 9px;
line-height: 1` in the same rule **lost**, and the chrome rendered at **11px/16px**
   against a declared 9px/1 for weeks. It is **mechanical since 2026-10-11** —
   `a-compose-never-carries-an-override` resolves every `composes:` target
   transitively across `apps/frontend/src/**/*.module.css` — and **it found two more
   live instances on the day it landed**, both figures in the data face. **And a break
   whose file is a CSS module needs the dev server restarted first**, or it reports a
   guard as absent when it is there.

3. **A claim about a mechanism reads identically whether the mechanism is there or
   not.** ADR 0038 said its point-in-time-universe consequence _"is recorded in
   `docs/GAPS.md`"_; **it was not**, and it was found by somebody going to **use** it
   rather than by reading. `LIVE-REHEARSAL.md` claimed a completion marking in
   `EPIC.md` that does not exist. **When you write that something is guarded, write
   the check in the same change.**

4. **Count sockets by URL, never by event.** A browser page holds sockets that are not
   this product's — an ordinary page "opening three market-stream sockets in twelve
   seconds" was **one of ours and two of Vite's HMR**. A number with no URL beside it
   cannot tell them apart, and that cost a suppression, two documents and a task, and
   survived four days of being quoted rather than re-run.

5. **`e2e/specs/overview-degraded-grid.spec.ts` contains a literal NUL byte, so
   `grep -r` skips it silently and reports it ABSENT rather than empty.** The byte is
   at offset 18,431 of 51,609, used as a field separator in the comparison key
   (`` `${surface}\0${reading[surface]}` ``). `file` reports the spec as `data`. **This
   produced a false _this guard does not exist_ conclusion inside Task 4.9.3's own
   run** — which is the worst possible direction, because absent and empty call for
   opposite repairs. **Use `git grep`**, which reads the index and finds it.

6. **A furnished frame cannot see a server-side computation.** Four overview specs
   passed against a server with **the ranking deleted**, because each furnished the
   order it then checked. `openWithRecordedStream` is the pass-through shape.

7. **The wire cannot see a defect in the producer.** When a repair removes work whose
   only consumer was absent, the assertion has to **count the producer's
   invocations** — a broadcast to an empty map sends nothing either way.

8. **A frame-checkable claim is not a check on the cut.** Breaking the cut left
   **every** frame-checkable claim green while **271 of 503 outranked the weakest row
   drawn**. Only an independent recompute saw it.

9. **CI's store has zero bars, so a browser assertion about a number is an assertion
   about data the runner may not have.** This has cost a six-minute round trip. Ask
   before you assert; `pnpm store:bare` answers it locally in seconds.

10. **The browser suite is its own plant.** A full `pnpm e2e` begun at a load average
    of **5.31** left the machine at **31.04**, so **read the load before a run, never
    during it**, and treat every load figure in this repository taken while a suite was
    executing as a measurement of the suite. And **a reported Playwright duration is
    not the quantity the 30 s per-test ceiling governs** — it reports durations longer
    than the one it enforces, so a duration must not be turned into a percentage of
    the ceiling.

11. **`n = 6` cannot separate a flake from a regression, and `n = 3` separates
    nothing.** `security-gap-fill` was characterised at 12%, then **25.0%** (CI
    13.6–39.6%), then repaired to **5.6%** pooled over 144 executions at four workers
    (CI 2.8–10.6%, non-overlapping) and **0 / 24 at one worker**. At 5.6%,
    `P(0 failures in 6) ≈ 0.71`. **Count failures per execution, state the worker
    count, and run the branch commit that contains no code** — the control is taken
    (`dee73de`, one planning Markdown file, a byte-identical runtime tree) and its
    draw sat **inside the parent's spread**.

12. **Two figures named _coverage_ in this epic measure different things**, and for a
    while nothing said so. See §3.1: a reader taking _332 of 518 in a median minute_
    as the 1-minute denominator is 332 away from the truth.

13. **A positive membership set, never a negative filter.** The negative filter would
    have put 518 figures on the wire against four, in a 60,636-byte frame, with **no
    compile error and no failing test.**

14. **A region's reserved room and an `href` are different things.** `visibility:
hidden` plus `aria-hidden` do **nothing whatever** to an `href`, and the repair
    needed **two** sites because one file downstream was throwing the producer's answer
    away with a hard-coded `held={undefined}`.

15. **A prescribed grep misses most hand-offs.** The enumeration's record reads
    **1, 6, 3, 6, 2** and then **8** — and **six of the eight were recipients the grep
    cannot find.** The load-bearing half of the method is **walking the epic's story
    list**, not grepping the documents. **Seven consecutive stories in this epic found
    with the walk what the grep could not.**

---

## 11. What a green run does not certify, and where each argument lives

**`pnpm verify` certifies that every check passed.** Specific to this screen, it does
**not** certify:

- That any figure on it is right. Every unit suite runs against a corpus we wrote and
  every browser assertion drives a socket this repository writes the frames for.
- That the aggregate is correct. §9: it is checkable by nothing mechanical, and _a
  person looking_ is a legitimate answer as long as it is written down as one.
- That the layout is right at any viewport nobody measured. jsdom applies no
  stylesheet and computes no layout.
- That `observed`, `stored`, a rank moving, a breadth figure or a mover render at all
  — CI's store has zero bars.
- That a region **reads as designed**. Nothing at any level can see that; the 104
  photographs are behind a flag because only the strings can be asserted.
- Any contrast or colour claim. `getTokens()` throws in the test environment by
  construction, and a browser is the only level that can see contrast.

**Three invariants on this seam do less than their names suggest**, and the sentences
are not obvious from the names:

- `the-aggregate-has-three-producer-paths` counts **paths** and **cannot see** that
  the third is now conditioned on a browser being attached.
- `the-send-instant-is-not-a-clock` guards **two of the wire's three instants**, and
  `observedAt` is outside it **on purpose**.
- `the-overview-note-dates-an-observation` holds the drawn instant **in two
  conjuncts**, the second of which exists because a one-conjunct draft reported
  `52 invariants hold.` with the defect in the file.

### Where each argument lives

| Subject                                                                | Read                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The aggregate seam, the frame, the three instants, five decisions      | [ADR 0038](../../docs/adr/0038-the-overview-aggregate-one-join-one-frame.md)                                                                                                                                                                              |
| A region is a tab stop, and the guard axe can no longer give           | [ADR 0039](../../docs/adr/0039-a-region-is-a-tab-stop-unconditionally.md)                                                                                                                                                                                 |
| **What `current` means — the window, its curve and its alternatives**  | **[ADR 0040](../../docs/adr/0040-what-current-means-a-five-minute-observation-window.md)**, _what "current" means: a five-minute observation window_ (Task 4.9.10)                                                                                        |
| **The re-order treatment and `ORDER HELD`**                            | **[ADR 0041](../../docs/adr/0041-a-ranked-surface-re-orders-under-live-data.md)**, _a ranked surface re-orders under live data_ (Task 4.9.10)                                                                                                             |
| A claim about data requires data; the defer rule                       | [ADR 0029](../../docs/adr/0029-provenance-on-screen-the-partial-states-and-what-an-honest-empty-answer-certifies.md), and [`PROVENANCE.md`](../epic-02-security-universe-historical-data/story-14-provenance-partial-states-and-epic-close/PROVENANCE.md) |
| Two clocks, and what a liveness threshold must not read                | [ADR 0036](../../docs/adr/0036-two-clocks-and-what-a-liveness-threshold-must-not-read.md)                                                                                                                                                                 |
| The feed's rates, coverage, the batch cadence, the intra-minute spread | [`LIVE-DATA.md`](../epic-03-live-market-data/story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) — read §0 first                                                                                                                           |
| The universe, the `status` predicate, breadth pollution, the count     | [`UNIVERSE.md`](../epic-02-security-universe-historical-data/story-03-security-domain-model-and-tracked-universe/UNIVERSE.md) §17                                                                                                                         |
| What the product says when a feed stops, on the security page          | [Story 3.10](../epic-03-live-market-data/story-10-disconnection-staleness-and-degraded-states/STORY.md)                                                                                                                                                   |
| Whether a **person** has watched any of this                           | [`LIVE-REHEARSAL.md`](../epic-03-live-market-data/LIVE-REHEARSAL.md) — and note 5 is the rule                                                                                                                                                             |
| The evening that fills those rows                                      | [`THE-SITTING.md`](THE-SITTING.md)                                                                                                                                                                                                                        |
| What a green `pnpm verify` does **not** certify, with a re-measure     | [`docs/GAPS.md`](../../docs/GAPS.md)                                                                                                                                                                                                                      |
| The browser suite's own rules and what a green run does not certify    | [`e2e/README.md`](../../e2e/README.md)                                                                                                                                                                                                                    |
| The screen's own eight stories, criterion by criterion                 | [`EPIC.md`](EPIC.md), and each `story-0*/STORY.md`                                                                                                                                                                                                        |

### The nine stories

| #   | Story                                                                                                       | Closed                     |
| --- | ----------------------------------------------------------------------------------------------------------- | -------------------------- |
| 4.1 | [The decisions, and the overview shell](story-01-the-decisions-and-the-overview-shell/STORY.md)             | 2026-09-25                 |
| 4.2 | [The aggregate seam, and the index proxies](story-02-the-aggregate-seam-and-the-index-proxies/STORY.md)     | 2026-09-26                 |
| 4.3 | [Sector performance](story-03-sector-performance/STORY.md)                                                  | 2026-10-07                 |
| 4.4 | [Breadth, and the denominator on screen](story-04-breadth-and-the-denominator-on-screen/STORY.md)           | 2026-10-08                 |
| 4.5 | [The movers, and the first ranked surface](story-05-the-movers-and-the-first-ranked-surface/STORY.md)       | 2026-10-08                 |
| 4.6 | [Selection from the overview](story-06-selection-from-the-overview/STORY.md)                                | 2026-10-09                 |
| 4.8 | [The overview at universe scale](story-08-the-overview-at-universe-scale/STORY.md)                          | 2026-10-10                 |
| 4.7 | [The degraded set, and the 390 question](story-07-the-overviews-degraded-set-and-the-390-question/STORY.md) | 2026-10-12, **AC 5b owed** |
| 4.9 | [The rehearsal, the sweep, and the close](story-09-the-rehearsal-the-sweep-and-the-epic-close/STORY.md)     | in progress                |

**The execution order is `4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.8 → 4.7 → 4.9`.**
4.7 and 4.8 were swapped on 2026-09-27 and **deliberately not renumbered**, because a
renumber means remapping every reference in the same change. The cost landed exactly
where that trade-off predicted: the swap **missed Story 4.9's dependency line**, so
the graph said the close was unblocked with the epic's last feature story still to
ship, and it was found by reading the chain. **Nothing checks a dependency line
against the story it names.**

**What the eight stories' acceptance came to** (Task 4.9.2, over 48 criteria):
**29 met, 17 met with a stated limit, 2 superseded, 1 NOT MET** — 4.7's AC 5b, the
390 phone. **34 are re-takes from a clean clone and 15 are dated readings a later
reader cannot reproduce.** And **only three of the eight stories ever published a
per-criterion verdict of their own**, so five of those verdicts are **derived from
task records** rather than the stories' own.
