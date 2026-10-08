# Story 4.5 — The Movers, & the First Surface That Ranks by a Live Value

**Status:** **Complete — 2026-10-08**, pending the owner's acceptance at Gate 2. Eight tasks, eight PRs (#519–#526 and the close). `/` draws **two ranked lists over the 503 equities** — `GAINERS` and `LOSERS`, five rows each — from the **same single eligibility pass** `Market breadth` counts, with the region stating its own denominator. **466 px in every state at every width.** The ranking is server-side; the frame ships **1,243 bytes** rather than a 60,636-byte input. **Open**: nobody has seen the region on a live feed, because the observed basis exists only 09:30–16:00 ET and no gated machine runs then with data.
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.4
**Epic scope covered:** top gainers / losers

## Description

**This is the surface the universe table's rule was written against.**

Task 3.6.3 decided that the 518-row table **never re-orders under live data**,
and said why in one sentence: _a row that moves while it is being read is a row
that cannot be read._ Its reversal trigger is **the first sort control whose key
is a live value** — and this story is not that trigger. It is a **different
surface with a different promise**, handed here by Story 3.6's close in as many
words: _"Anything ranked by a live value is yours."_

**So the decision this story owns is what happens to the ranking while
somebody is reading it**, and every option is a real product:

| Option                              | Reads as         | Risk                                                        |
| ----------------------------------- | ---------------- | ----------------------------------------------------------- |
| **Re-rank on every frame**          | genuinely live   | a row moves out from under the pointer once a minute        |
| **Re-rank on a cadence**            | settled          | a figure and its position can disagree                      |
| **Freeze while hovered or focused** | considerate      | two readers see different orders                            |
| **Re-rank, and MARK what moved**    | live and legible | the motion vocabulary has to say what a re-order looks like |

> **The motion vocabulary already has the rule this needs**: work in progress
> LOOPS, a state PERSISTS, **a fact arriving DECAYS**. A re-order is a fact
> arriving about a row — which suggests an answer, and this story has to test
> it against real movement rather than reason its way to it.

## What the user can see when this story lands

**Who is actually moving.** Two short ranked lists — the biggest gainers and
the biggest losers among the names we track — each row carrying its symbol, its
price and its change, updating as the session runs.

**This is the first thing on the landing page that answers _where should I
look_**, which is the whole reason §9 puts it beside the topology, and it is
the screen's most obviously alive region.

**What they still cannot do:** click a mover through to its security page
(4.6 — deliberately the next story, because a list of names nobody can open is
a list that invites the wrong repair).

## Why it sits here in the sequence

**After breadth, because a mover list that disagrees with the breadth count is
worse than either alone**, and both have to come out of one computation.

**Before selection**, because the ranking rule has to be settled before
anything becomes clickable: a target that moves between the decision to click
and the click is a defect the web has known about for thirty years, and this
screen manufactures one every minute by design.

## Acceptance criteria

1. Gainers and losers render, ranked, from the same computation as breadth and
   sectors, at four widths
2. The re-ranking decision is **taken against real moving numbers** — the
   replay or a live session, never a fixture — and recorded with its
   alternatives and a reversal trigger
3. **A row does not move out from under a pointer or a focus ring** without the
   reader being able to tell that it did
4. `prefers-reduced-motion` gets a version of the answer that is still legible,
   asserted in a browser
5. A name with no current observation **cannot appear** in either list, and the
   lists say what they are computed over
6. The per-tick cost of both lists is measured against §28's 50 ms **routine**
   line, on a production build, with every row changing

## Design work

**One ranked-list component, two uses** — this and Story 4.3's sectors. The
canvas gets the component and its states: a full list, a short one, a list
whose rows are re-ordering, and the reduced-motion version.

**The re-order treatment is a genuine addition to the motion vocabulary** and
belongs beside the others in `The motion vocabulary.dc.html` rather than in a
new file, because the vocabulary's value is that it is one page.

## Out of scope

Anomaly-ranked lists (Epic 5 — _unusual_ is not _largest_), sparklines per row
(Epic 6/8), and any sort control on the universe table.

## Amended by Task 4.1.1 — 2026-09-25: the ranking rule is decided, the treatment is not

**The owner chose re-rank, and mark what moved** — from four options including
freezing under the pointer and ranking on a slower cadence.

**So the rule is settled and this story's work is the treatment.** The motion
vocabulary already supplies the grammar — **work in progress LOOPS, a state
PERSISTS, a fact arriving DECAYS** — and a re-order is a fact arriving about a
row, which points at a decaying mark rather than a sustained one.

**What the decision does not settle, and this story must**: what the mark is,
how long it lasts, what happens when several rows move at once, what a reader
with `prefers-reduced-motion` gets, and **what protects a row that is under a
pointer or a focus ring at the moment it moves**. The rule permits re-ordering;
it does not permit a target moving out from under a click.

> **Take it against real movement.** Story 3.4 settled the first motion
> decision in front of four treatments running on the real component at 1×
> against replayed bars, and that is the bar this decision inherits.

## Handed to this story by Task 4.1.8 — 2026-09-25: two decisions this story is missing, and the first one can make a ranking wrong

**The hand-off enumeration found both, and this story's file carried neither.**

### 1. The denominator, and why a RANKING is the worst place to ignore it

**Measured on the deployed gateway across a whole session on 2026-09-25**: of
518 tracked securities, the number heard from inside the last **5 minutes** has
a median of **466** and a worst hour of **446**. At two minutes it is **325**,
and at 13:00 it is **298**.

**So on any given tick this screen has no recent price for roughly 50 of the 518.** For breadth that understates a count. **For a ranking it can be flatly
wrong**: the day's biggest mover may be one of the securities not heard from,
and a top-ten computed over the ~466 that were heard from will show ten names
that are **not** the ten biggest movers, with nothing on screen saying so.

**This is `EPIC.md`'s _an aggregate is the one kind of number that can be wrong
while looking right_ in its sharpest form** — a ranked list looks equally
confident whether its input was complete or not.

**What this story owes, therefore:**

- **State the denominator beside the ranking**, in the words Story 4.4 settles
  — _N of 518 in the last 5 minutes_ — and not in the connection's vocabulary.
  A sentence reaching for `live`, `stale` or `disconnected` would trip
  `one-home-for-the-feed-words`, and **would deserve to**.
- **Decide, in writing, what a mover with no recent price is.** Excluded and
  counted, or included on its last stored close with the staleness shown. Both
  are defensible; silently dropping it is not.
- **M is 5 minutes and is not this story's to re-choose.** The curve, the
  by-hour shape and the argument are in Story 4.4's file.

### 2. Where an aggregate is computed

**Story 4.2 builds the seam and this story uses it.** The decision taken in
Task 4.1.1 is **a new frame on the existing socket** — not a second fetch, not a
poll, and not a computation in the browser over 518 rows. When this story needs
the movers, it reads them off that frame.

> **The reason it is a decision rather than an implementation detail**: a
> browser that ranks 518 securities on every tick is a main-thread task on the
> page `PRODUCT_SPEC.md` §28 is least able to afford one, and this product has
> already paid for that lesson once on the securities table.

## Handed here by Story 4.2's close — 2026-09-26: the fourth design test is live here, and a measurement is owed first

**1. The fourth design test — _does it feel alive_ — is unanswered for a small
set, and a measurement decides it before any judgement can.** `The mark
multiplied by five hundred.dc.html` defends 518 simultaneous arrival marks on
**rate** (332 bars inside a 243 ms burst, so the page is still for 59.7 seconds)
and files the perceptual question under **"THE RISK THAT IS ACCEPTED RATHER THAN
DISPROVED"** — its one perceptual reading is that discs at full density read as
texture, which **needs density that a handful of cells on one line does not
have**.

**Before the rehearsal, read from the gateway whether a small set's bars arrive
in ONE `bars` frame or spread across several of the ~16 a minute.** Four in one
frame is a synchronised wave; four across several is a stagger the data
genuinely has, arriving free. **A sitting that cannot say which the watcher saw
cannot answer anything.** The inherited trigger's second clause is the live one:
_the first surface where the burst stops being once a minute_.

**2. A ranked list over 518 candidates once a minute is a ROUTINE per-tick
cost**, in `PRODUCT_SPEC.md` §28's own word — the same category as the 40 ms
every 30 s that Task 3.6.5 found and repaired with two memo boundaries, not the
once-per-visit cold load Epic 14 owns. Size it against 518 from the first line.

**3. A shared claim inverts on a small set.** On the proxy strip, when one of
four ticks, **three of four cells carry an exception line** — the
shared-claim-with-exceptions idiom makes the exception the majority. It
misstates nothing, but a ranked surface that adopts the idiom should know it
degrades as the set shrinks.

## Reassessed 2026-09-27 — scope reduced: the ranked list and the motion are 4.3's

**You no longer own the ranked-list component or the re-order treatment.** Story
4.3's AC 5 deferred the rule to you, two stories ahead of itself, which left 4.3
with no honest option. The decision moved to 4.3, where it is taken on **eleven
rows** rather than on a top-N over 518, and **you apply it and test it at a mover
list's density** — which is the harder half and the one your own inherited note
is about: _a shared claim inverts on a small set_, with the sign flipped.

**What stays is substantial and is yours alone.** The **denominator in a ranking
is the sharpest form of the honesty problem in this epic** — a top ten computed
over the ~466 names heard from may show ten securities that are **not** the ten
biggest movers, with nothing on screen saying so. Plus the _what is a mover with
no recent price_ decision, the **top-N-computed-server-side** payload (ADR
0038's grain rule — _each region ships the smallest thing that answers it, never
the input its answer was computed from_ — which **this story's Task 4.5.4 put
into ADR 0038 as a dated amendment**: until 2026-10-08 this citation pointed at
that ADR's list of **rejected** alternatives, where _one frame type per region_
sits beside the sentence handing the decision to Story 4.3 to re-take), and Epic
14's trigger firing on your per-row markup.

## Handed here by Story 4.3 — 2026-09-27: the component you reuse exists, your region's height is already paid for, and two decisions were taken on your behalf

**Story 4.3 built `RankedList` for two uses, and you are the second.** This section
is what you can act on without reading Story 4.3's task files.

### 1. `RankedList` exists, with a slot shaped for you

`apps/frontend/src/components/RankedList/` — `<ol>`/`<li>`, DOM order equal to
visual order, rows keyed by `symbol`, rank printed as a tabular `2ch` ordinal, and
three memo boundaries of which `memo(Row)` on **primitive** props is the one that
holds per tick. It composes `PriceChange` for direction and **spells neither the
sign nor the glyph**; a second speller is a second thing to keep in step with the
palette.

**The bar prop is a union, and `"none"` is yours:**

```ts
export type RankedListBar =
  | { readonly kind: "signed"; readonly scale: SectorLadderStep }
  | { readonly kind: "none"; readonly scale?: never };
```

**The bar is refused for movers, and the reason is not "eleven versus ten".** It is
**one quantity versus four**: eleven sector ETFs all carry today's percent change
on the same basis over the same interval, so the ratio of two bars **is** the ratio
of two moves. Movers is not that — it is a top-N over a mixed set, where a bar
invites a comparison the data does not support. **Take that decision on its own
terms if you want to revisit it; do not inherit either answer without re-arguing.**

**`name` is a required prop** because you have **two lists on one screen** and each
`<ol>` needs its own accessible name.

### 2. Your region's height is already paid for — you move nothing

`Movers` rose from **265 px to 461 px** on 2026-09-27 without anybody buying it.
Task 4.3.1 made rows 2 and 3 **share one `fr` ratio**, so filling `Sector
performance` raised `Movers` to the same height. **Measured at all four widths,
before and after.** So filling this region **moves nothing at all at 1440 and
1024**.

**At 768 and 390 the grid is `grid-template-rows: none`** and this region is
**103 px and 121 px**, so filling it there **will** grow the page — yours to measure
and report under the rule that replaced Task 4.1.4's: _a reserved region's floor is
set by the change that DRAWS its content, and that change measures and reports the
movement before it merges._ And if your content needs more than 461, **you take
`Sector performance` and `Market breadth` with you**, because the rows are tied.

#### Amended by Task 4.3.7 — 2026-09-27: the number is **486**, not 461

**The figure above is a historical record and the live constraint is 25 px
bigger.** Task 4.3.7 added the trailing quiet group — rows with no rankable
figure, in their own list with their own heading — and **reserved that heading's
room in every state**, because without the reserve the region's height depends on
whether the feed has spoken: at 1440 and 1024 that moves nothing, but at 390 the
grid row is content-sized and the whole lower page steps the first time a sector
goes quiet.

**Measured with `pnpm probe /` on 2026-09-27, before and after, at all four
widths:**

| Width | `Sector performance` | this region                  |
| ----- | -------------------- | ---------------------------- |
| 1440  | 461 → **486**        | 461 → **486**                |
| 1024  | 461 → **486**        | 461 → **486**                |
| 768   | 461 → **486**        | 103 (unchanged, rows untied) |
| 390   | 437 → **462**        | 121 (unchanged, rows untied) |

Everything that moved was another reserved panel or the source note; the proxy
strip is unchanged in position and content. **The number to beat is 486.**

### 3. Ranking is server-side, and the comparator is already written

**`packages/shared/src/sector-ranking.ts` holds the one comparator.** It was put in
`packages/shared` rather than in the frontend **precisely because of you**: a top-N
over 518 in a browser means shipping the 518-figure input, so you rank server-side,
and a browser-only comparator would have set the wrong precedent at eleven.

**Its absent-key rule is the part to reuse rather than re-derive:**

> A figure with no move has **no ranking key**. Every keyless figure sorts after
> every keyed one, and keyless figures hold the order they arrived in. **There is no
> default and no `?? 0` anywhere.**

`?? 0` would place a security we have not heard from **among the genuinely flat
ones** — ADR 0029's false impression expressed as a **rank position**. A non-finite
value counts as absent too, because a comparator returning `NaN` leaves
`Array.prototype.sort` with no defined order at all.

**And two figures equal at DISPLAYED precision do not swap** — which is why
`PERCENT_DISPLAY_DECIMALS` lives in `packages/shared` and `formatChangePercent`
reads it. **If you round anywhere else, the drawn order can contradict the drawn
figures.**

### 4. The re-order treatment moved to Story 4.3 and was decided there

It used to be yours. It was moved so it could be decided on **eleven rows rather
than a top-N over 518**, and it is now drawn (`The order that changes.dc.html`) and
implemented. **Inherit it rather than re-deciding it**: a FLIP, transform only,
offsets a multiple of the row pitch, one settle for the whole list, **no stagger**,
and the two events separated in **time** — `--motion-duration-settle` of stillness
then `--motion-duration-settle` of travel, the same token twice.

**The measurement behind it, so you do not re-take it**: the intra-minute spread
between the first and last bar of a minute is **243 ms p50 / 511 p95** over
**n=445** minutes and all 518 symbols, so against a **900 ms** decay all the discs
in a burst are lit together for ~650 ms **however many frames carried them**. Frame
count and perceptual grain come apart. **At your scale that is worse rather than
better**, and the treatment is the one place to check it still holds.

**The hold** — `ORDER HELD`, scoped to the **region** via `:hover`/`:focus-within`,
never to the row, because row scoping lets rows move out from under an
**approaching** pointer.

### 5. What CI cannot show you, which is more than you would think

**CI's store is 518 securities and zero bars.** Every overview figure is `unknown`
there **for ever**, so a browser assertion about a position or a figure is an
assertion about data the runner does not have. `pnpm store:bare` reproduces it
locally in seconds. Assert **structure** and the all-`unknown` state on CI; prove
the keyed states through the shipped socket path, the way
`overview-proxy-live-update.spec.ts` and `overview-sector-region.spec.ts` do.

## Reassessed 2026-10-07 after Story 4.3 shipped — THREE of your acceptance criteria are already met, and your description contradicts your own hand-off

**Read this before the description at the top of this file, which is now the
oldest thing in it.** Story 4.3 built the ranked surface first and took the
decision this story's description presents as open.

### Your description's four-option table is decided, and 4.3 is where

The table — _re-rank on every frame_ / _on a cadence_ / _freeze while hovered_ /
_re-rank and MARK what moved_ — was answered on 2026-09-27 against **eleven rows
and a measurement**, not by reasoning:

- **Freezing while hovered or focused is what shipped** (`ORDER HELD`, scoped to
  the region via `:hover`/`:focus-within`, **never to the row** — row scoping lets
  rows move out from under an **approaching** pointer).
- **The fourth option — marking what moved — was explicitly REFUSED**, for a
  reason that applies to your lists with more force than to sectors: a _moved_
  mark lands disproportionately on rows that **received nothing**, so it decorates
  the stalest figures on screen.
- **The movement itself** is a FLIP, transform only, one settle for the whole
  list, **no stagger**, with the two events separated in **time**:
  `--motion-duration-settle` of stillness then the same token again of travel.

### So three acceptance criteria are already satisfied — by another story

| AC                                                                                                           | Status                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2.** _the re-ranking decision taken against real moving numbers, with alternatives and a reversal trigger_ | **MET by Task 4.3.3.** Taken on `LIVE-DATA.md` §7.4's **243 ms p50 intra-minute spread, n=445 minutes**, with the alternatives recorded and a condition-shaped reversal trigger: _the first sitting in which a person reports the region as flashing or refreshing rather than as facts arriving._ |
| **3.** _a row does not move out from under a pointer or a focus ring_                                        | **MET by Task 4.3.6** — the hold, unbounded in time and bounded by the reader.                                                                                                                                                                                                                     |
| **4.** _`prefers-reduced-motion` gets a legible version, asserted in a browser_                              | **MET by Task 4.3.6**, and asserted **paired** — one test with the preference and one without, because an absence assertion alone passes against a treatment that never ran.                                                                                                                       |

**Do not re-take them. Re-CHECK them at your scale**, which is the part that is
genuinely yours and is stated below.

### What is still yours, and it is sharper than it was

1. **The top-N computation over 518**, agreeing with breadth by construction.
2. **Whether the treatment survives 518.** 4.3's measurement is the eleven's, and
   the synchrony risk is **worse at your scale, not better** — more rows arriving
   in the same ~243 ms burst. The trigger above is the thing to watch, and **the
   lever is the disc, not the motion**: a ranked list's aliveness is its order.
3. **The bar, re-argued on its own terms.** It is adopted for sectors and
   **refused for movers**, and the reason is _one quantity versus four_ rather than
   _eleven versus ten_: eleven sector ETFs carry today's percent change on the same
   basis over the same interval, so the ratio of two bars **is** the ratio of two
   moves. A top-N over a mixed set is not that. **Re-argue it; do not inherit
   either answer.**
4. **Two lists on one screen**, which is why `RankedList`'s `name` prop is
   required — each `<ol>` needs its own accessible name.

### Two instructions in your Design work that are now false

- _"One ranked-list component, two uses … **the canvas gets the component and its
  states**"_ — **done**. `The ranked list.dc.html` exists with the row anatomy, the
  four widths and the states; `The order that changes.dc.html` has the treatment.
  You **consume** these.
- _"The re-order treatment … belongs beside the others in
  `The motion vocabulary.dc.html` **rather than in a new file**, because the
  vocabulary's value is that it is one page."_ — **This instruction was not
  followed, and the disagreement is unresolved rather than settled.** Task 4.3.3
  drew `The order that changes.dc.html` as its own page. The argument for one page
  still stands and **nothing on the motion vocabulary page references the
  re-order**, so the vocabulary is currently four limbs on one page and a fifth
  somewhere else. **Owner: whoever next touches either page** — either
  cross-reference it or move it, but the present state is the one both arguments
  were against.

### And a testing lesson that would otherwise cost you a story

**Four overview specs passed against a server with the ranking deleted.** Each one
**furnished** the order it then checked, so it was asserting its own fixture. Your
lists are ranked server-side for the same reason sectors are — a top-N in a browser
means shipping the 518-figure input — so **a spec that supplies your `movers` array
cannot see your comparator at all.** `overview-sector-ranking.spec.ts` is the
pass-through shape that can; copy it rather than the furnished harness.

## Handed here by Story 4.4 — 2026-10-07: the join already sees 518, and the cost is measured and attributed

**Four things exist now that did not when Story 4.3 wrote to this file**, and two
of them remove work from your estimate.

**1. The join already sees all 518.** Story 4.4 widened the one call site to
`trackedTickers()`, so your top-N has the whole universe available **without
another widening and without a second call site**. `one-producer-of-the-overview-aggregate`
is unchanged at one, and **do not widen its bound** — its break is the weak 1→2
signal and would pass silently under a wider one.

**2. The split is positive membership on every section, and there is a check.**
`isProxySymbol`, `isSectorSymbol` and `isEquitySymbol` are named sets declared
beside the symbol list. **Add yours the same way** — `each-overview-section-names-its-own-set`
asserts it, and the e2e tripwire `overview-frame-sections.spec.ts` asserts `figures`
has exactly four. Both exist because the negative filter 4.4.1 replaced would have
put **518 figures** on the wire against four, in a 60,636-byte frame, with no
compile error.

**3. `directionOf` is in `packages/shared`** since Task 4.4.2, keyed on the
**displayed** figure, returning `undefined` for a non-finite move. **Use it.** A
second classifier is refused by `one-classifier-for-the-direction-of-a-move`, and
that check exists because its own first draft was green on the defect: it matched
`changePercent` and missed the bare `percent` an author is likeliest to type.

**4. The per-batch cost is measured, and the attribution is what you need.**

|                                 | median       |
| ------------------------------- | ------------ |
| before, the fifteen             | **0.118 ms** |
| after, 518 + breadth            | **3.497 ms** |
| the breadth count alone         | **0.041 ms** |
| join over 518, nothing observed | 0.016 ms     |

**The 3.4 ms is 518 `marketDateAt` calls** at ~6.6 µs each, inside
`changeFromClose`'s same-session branch — **not the counting, which is 1.2%.** So
**a top-N over the same entries is nearly free**: the expensive part is already
paid, once, by the join you are reading. **Do not re-derive a move** — rank on the
figure that arrived.

### And the spec shape, which Story 4.3 told you about and 4.4 paid for twice

**A furnished frame cannot see a server-side computation.** 4.3 found four overview
specs passing against a server with the ranking deleted; 4.4 then found its own
first-draft checks green on their own defects **twice more** — the breadth-set check
and the region-order check. `overview-sector-ranking.spec.ts`'s
`openWithRecordedStream` is the pass-through shape, and `overview-breadth-region.spec.ts`
is a second example of it.

**Your lists are ranked server-side**, so a spec that supplies your `movers` array
is asserting its own fixture.

## Gate 1 — 2026-10-08: decomposed into eight tasks, and shaping found two live defects and one false citation

**Seven roles shaped this.** What they returned changed the plan in four places,
and three of their findings were defects in shipped code or in a governing
document rather than opinions about this story.

### What shaping found before a line was written

**1. A live copy defect, of the class this epic keeps paying for.**
`MarketOverview.tsx:462` ships _"The largest moves among the **securities** we
track, up and down, ranked while the session runs."_ — and `securities we track`
is **518**, including `SPY` and the eleven SPDRs. The set this region can be
computed over without contradicting breadth is **503 companies**. Yesterday's
`the-population-is-never-a-literal` does **not** catch it: that clause fires on a
digit beside `we track`, and this sentence has none. Task 4.5.6.

**2. The common case overflows the label track.** Measured over 507 universe
rows: `p50 21, p75 26, p90 32, max 50` characters, and **41.4% exceed 22** — the
length of `Communication Services`, which measures **143.75 px against the 144 px
track `.label` declares**. `.label` is `white-space: nowrap` with no `overflow`
and no `text-overflow`, and a grid item does not clip, so **the name paints over
the ticker column on roughly two rows in five.** The canvas deferred this
measurement to this story by name. Task 4.5.1.

**3. A citation that points at a rejected alternative.** This file cited _"ADR
0038's grain rule: ship the smallest thing that answers the region"_ — and
`"smallest thing"` appears **nowhere in `docs/adr/`**. The rule lives in Story
4.3's `STORY.md`, and **ADR 0038 line 228 hands that same decision to Story 4.3
to re-take**: _"One frame type per region. … Story 4.3 re-takes this."_ 4.3
answered by shipping a nested optional section and never amended the ADR. A
reader who checks the citation finds the rejected alternative. Task 4.5.4.

> **Closed 2026-10-08 by Task 4.5.4**, in the one change that also repointed the
> citation: ADR 0038 carries a dated amendment under that very bullet, closing
> its own named re-take with the one-frame verdict, stating the grain rule in
> words, and giving the measured payload as its evidence — **3,256 B for a whole
> frame carrying three regions, of which the movers are 1,243 B at 124.3 B a
> row**, off this product's own gateway. Reversal trigger, as a condition: _the
> first overview region whose cadence must differ from the applied-batch
> cadence._

**4. The bar's recorded reason is false.** Story 4.3 refused the bar for movers
on _"one quantity versus four"_ — but a mover row carries today's percent change
against the previous close, **the same quantity on the same basis over the same
interval** as the eleven sector ETFs, from the same `changeFromClose`. The phrase
was borrowed from Story 4.2's proxy-strip refusal, where it is correct. Re-argued
from scratch, **the bar is still refused**, on three grounds that do hold: a
**selected tail has no range** (the top five are near each other _because_ they
were chosen for being extreme, so five near-full bars are an artefact of the
selection); the ladder's **outward-only ratchet** means one halt-resume print at
+18% flattens the rest of the session, which an ETF of seventy names cannot do
and a single equity does routinely; and a **single-signed list has no centre to
anchor**. The canvas heading is corrected in Task 4.5.1.

### Two acceptance criteria cannot be checked as written

- **AC 5 is false out of hours.** _"A name with no current observation cannot
  appear"_ — with the market shut **nothing** has a current observation, so taken
  literally it forbids drawing the region for ~80% of the week, contradicting the
  `session` basis breadth and sectors both already serve. It is basis-relative.
- **AC 2's _"the replay or a live session, never a fixture"_ is now a live
  session only.** `replay-bar-source.ts` emits one slice per minute across every
  symbol, so a replay returns **one frame, 0 ms spread, 100% of the time at any
  speed**, and every observation shares one `startsAt` — **the split minute the
  treatment is designed against is absent from the data structure.** AC 2's
  re-check is a `LIVE-REHEARSAL.md` row and nothing else. Task 4.5.7.

### What the verification story actually is, because the brief had it wrong

This story's risk was framed as _the same shape as breadth's irreducibility, only
sharper_. **That is wrong, and the correction is worth more than the question
was.** Breadth is a **reduction** — five integers reach the browser and nothing
can recompute one. A top-N is a **selection**, and its rows carry their own keys:

| Sub-claim                            | Recoverable               |
| ------------------------------------ | ------------------------- |
| the rows are in descending key order | from the frame            |
| N distinct symbols, N rows           | from the frame            |
| every row is in the population       | `GET /securities`         |
| **the cut**                          | **both bases, see below** |

**In the `session` basis `GET /securities` settles the cut completely** — it
carries `close` and `previousClose` for all 503, so the whole ranking is
independently reconstructible. **In the `observed` basis the snapshot-beside-
aggregate pairing settles it**: `sendSnapshot()` sends the snapshot and
`overviewMessage()` back to back with **zero `await`s between them** (verified),
and `currentMarketState` is written only from the socket callback, which cannot
interleave inside a synchronous tick — so **the snapshot is provably the input
the aggregate beside it was computed from**, guaranteed by the event loop rather
than by a tolerance. Nobody has used it. Task 4.5.8.

What stays irreducible is the ~50 names never heard from, and our one-venue tape.
That is what the denominator sentence exists to confess.

### Measured at Gate 1, so no task re-derives them

|                                                          |                                                             |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| the region, 1440 / 1024 / 768 / 390                      | **486 / 486 / 103 / 121** px                                |
| content ceiling after 97 px of chrome                    | **389** px                                                  |
| two headed lists at five rows each                       | **466** against 486 — 20 px slack                           |
| at six rows each                                         | **520** — over by 34, and it drags two neighbouring regions |
| the universe, by kind                                    | **503 equity, 4 index_etf, 11 sector_etf**                  |
| the frame today / with 2×10 reusing `WireOverviewFigure` | **2,481 → ~5,420** bytes                                    |
| against the negative-filter flood                        | **4.8%** of 60,636 bytes                                    |
| bounded two-ended selection / full sort over 503         | **0.10 ms / 0.60 ms**                                       |

### The owner's five decisions

| Decision                                   | Taken                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The two lists**                          | **`GAINERS` and `LOSERS`.** Against `Largest advances` / `Largest declines`, which would avoid a third drawn word pair — but `Advancing`/`Declining` are breadth's row labels over a **different set** (~466 measured, not a top 5), so reusing them 200 px away would be two surfaces naming two different things with one word |
| **The price column**                       | **Yes, dropping at 390.** The change is the ranking key and the price is context; at 308 px of row the five tracks do not fit with a readable name, and ellipsising the name to ~11 characters loses the field the region exists to carry out                                                                                    |
| **The denominator**                        | **Restated here**, from the same frame fields breadth reads, with a check asserting one producer. A ranking's whole honesty is its denominator and a reader must not cross the page for it                                                                                                                                       |
| **ADR 0038**                               | **Amended here**, closing its own named re-take, rather than a new ADR 0039 — which would be a second home for 0038's Decision 1 and would make the misattribution permanent by giving it somewhere plausible to point                                                                                                           |
| **Population, exclusion, sign, rows, bar** | the **503 equities**; a mover with no recent price is **excluded**; each list holds **only rows whose direction matches it**; **five rows each way**; **no bar**                                                                                                                                                                 |

**The direction-matching rule earns its place twice.** It prevents a one-sided
market drawing five gains under `LOSERS` — every channel individually correct and
the heading false — and it makes the two lists **disjoint by construction**,
which removes the same-symbol-in-both-lists state and a silent collision in the
order hold's `Map`, from one decision.

### The eight tasks

| #     | Title                                                       | Visible                                 |
| ----- | ----------------------------------------------------------- | --------------------------------------- |
| 4.5.1 | The canvas, the row, and the reserve that cannot exist      | nothing                                 |
| 4.5.2 | A comparator with a second consumer                         | nothing                                 |
| 4.5.3 | Movers drawn                                                | nothing on `/`                          |
| 4.5.4 | The producer ranks, and movers ride the frame               | nothing                                 |
| 4.5.5 | Movers on the landing page                                  | **two ranked lists, moving**            |
| 4.5.6 | The denominator, the two grammars, and the one-sided market | the honest states                       |
| 4.5.7 | The hold and the motion at two lists                        | a re-order that reads as facts arriving |
| 4.5.8 | The spec, the grid, the cost, the sweeps and the close      | nothing                                 |

**Not doing**: re-taking the re-ranking rule, the FLIP, the no-stagger rule or
the reduced-motion answer — all Story 4.3's, with measurements. Not widening
`one-producer-of-the-overview-aggregate`'s bound; its break is the weak 1→2
signal. Not bumping `MARKET_STREAM_PROTOCOL_VERSION`. **Not re-wording Epic 14's
trigger**: it does not fire — twenty rows is not universe scale and it is a
different page — and re-wording it from _markup_ to _computation_ would make it
fire retroactively on Task 4.4.4's **3.5 ms** against a 50 ms line. A verdict is
recorded; the wording is Story 4.8's fork.
