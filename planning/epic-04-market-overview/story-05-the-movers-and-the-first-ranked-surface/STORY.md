# Story 4.5 — The Movers, & the First Surface That Ranks by a Live Value

**Status:** Not started
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
no recent price_ decision, the **top-N-computed-server-side** payload (ADR 0038's
grain rule: ship the smallest thing that answers the region, not the ranking's
input), and Epic 14's trigger firing on your per-row markup.

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
