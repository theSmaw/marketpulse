# Story 4.4 — Breadth, & the Denominator on Screen

**Status:** **Complete — accepted by the owner at Gate 2 on 2026-10-08**, with one change taken there: the headline's caption **loses its direction at a net of zero**. Eight tasks, eight PRs (#509–#517). `/` draws three counts, a remainder and a net headline over **503 equities**, with the population stated in words. The join now sees all 518 through a **positive** membership set; the window is **5 minutes, measured**; the widening cost **0.118 → 3.497 ms** a batch of which the count is **0.041 ms (1.2%)**. **One open figure**: Task 4.1.6's coverage band was measured over 518 and is unusable as a figure over 503 — the re-measure is owed. **One sitting owed**: no person, and no gated machine, has ever seen a breadth figure.
**Epic:** [Epic 4 — Market Overview](../EPIC.md)
**Depends on:** 4.3
**Epic scope covered:** advancers / decliners; market breadth

## Description

**The number this epic's `EPIC.md` was mostly written about.**

> _"'How many securities are negative right now' has a denominator question in
> it: a name with no recent IEX bar is not a name that did not move."_

`PRODUCT_SPEC.md` §9 draws breadth as three percentages — advancing, declining,
unchanged — and §11 uses breadth again as an anomaly factor. **Both are counts
over a universe the live feed only partially observes**: about 332 of 518 names
in a median minute, 65.1% median per-symbol coverage, 2.1% worst case, and an
ordinary gap of 187 minutes.

**Story 4.1 chose the denominator. This story puts it on screen**, and the
choice of how to draw it is the real work: a percentage with a footnote is a
percentage nobody reads the footnote of, and this product's standing rule is
that **a claim about data requires data** (ADR 0029) — each clause renders only
when its own data is present.

> **`unchanged` is a third state and it is not noise.** On a feed where a
> third of names are silent in any minute, _unchanged_ and _unobserved_ are
> different facts with the same appearance, and collapsing them is the exact
> failure this story exists to avoid.

## What the user can see when this story lands

**How broad today's move is**, at a glance: how many of the market's names are
up, how many down, and — stated rather than buried — **how many the figure
could see at all**.

A reader who wants to know whether a 2% index move is _everything_ or _five
names_ can answer it from this region, which is `PRODUCT_SPEC.md` §4's first job
in one line of screen.

**What they still cannot do:** see which names (4.5), or click through (4.6).

## Why it sits here in the sequence

**After sectors, because sectors proved the denominator at a scale a person can
check**, and before the movers, because a mover list is breadth's detail view
and should not disagree with it.

## Acceptance criteria

1. Advancing, declining and unchanged render with their **denominator visible**
   and the words for it agreed in Story 4.1 — one home, one wording
2. **`unchanged` and `unobserved` are distinguishable on screen**, and a
   reader can tell which they are looking at
3. The figure agrees with the sector rows and the movers by construction — one
   computation, not three — with a test that fails if a second one appears
4. With the market shut the region is **honest rather than empty**: it reports
   the last session's close-to-close breadth, or says it is reporting nothing,
   and does not present a stale intraday count as current
5. The three figures never sum to something a reader can see is wrong at any
   rounding
6. A browser spec asserts the structure and **no figure**, per ADR 0029's rule
   for a deployed assertion against a store CI may not have

## Design work

**A breadth meter is the one region on this screen with a shape rather than
rows.** §9 draws it as three labelled percentages; the canvas has no equivalent,
and the nearest relatives are the volume chart's proportional bars
(`Volume and window.dc.html`).

Two things to settle on the canvas rather than in CSS: **whether the three
states are one bar or three figures**, and **how the denominator is drawn** —
it is a fact about the measurement rather than about the market, which in this
product's language means it belongs with the provenance treatment
(`Provenance and the empty answers.dc.html`) rather than with the figures.

## Out of scope

Breadth per sector (a candidate, and it is Epic 5's input rather than this
screen's), and breadth as an anomaly factor (§11, Epic 5).

## Amended by Task 4.1.1 — 2026-09-25: the denominator is a freshness window, and the words are this story's

**The owner chose a stated freshness window** over the three-way count, over
_whatever is in the map_, and over last session's close-to-close:

> **Of the 518 we track, N were heard from in the last M minutes.**

**M is not chosen here.** Task 4.1.6 measures how many of 518 have an
observation inside 1, 2, 5, 15 and 60 minutes across a session, and **M comes
off that curve** — the point of measuring it is that a window picked without
one is a number picked because it sounded round.

**What this story owns is the sentence**, and it is load-bearing rather than a
footnote: a breadth figure whose denominator is invisible is the exact shape
Epic 4's `EPIC.md` was written to prevent. The rejected option is worth keeping
in view — the three-way count needed `unchanged` and `unobserved` told apart on
screen, and §9 already sketches breadth as three percentages including
`unchanged`, so the window keeps the spec's shape and puts the honesty in a
sentence.

## Amended by Task 4.1.5 — 2026-09-25: this screen carries TWO kinds of "how current is this", and the denominator is the second

**The chrome already makes a statement about currency, and this story makes a
different one.** They answer different questions, they can legitimately
disagree, and a reader must not read one as the other.

| Says                                                           | About                                                                   | Home                             |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| `LIVE` / `STALE` / `DISCONNECTED`                              | **the connection** — is data arriving at all                            | the status bar, and nowhere else |
| _Of the 518 we track, N were heard from in the last M minutes_ | **the coverage of one figure** — how much of the market this number saw | beside the figure it qualifies   |

**A healthy `LIVE` feed with 341 of 518 names heard from in the last five
minutes is the ordinary state of IEX** — 65.1% median per-symbol coverage,
`LIVE-DATA.md` §7.6 — so the denominator is not a fault report and must not be
written as one.

### What that means for the sentence this story writes

- **It must not reach for `live`, `stale` or `disconnected`** to describe
  coverage. Those are a shipped three-member vocabulary with one home, and a
  sentence borrowing them would trip `one-home-for-the-feed-words` — which
  exists for a different reason and **would deserve to fire**.
- **It qualifies a figure rather than the screen.** It sits beside the breadth
  count it describes, not in a corner as a page-level status.
- **It is not a warning.** The coverage of the IEX feed is a property of the
  plan this product is on, stated once and calmly, in the way the source note
  states an adjustment.

> **Task 4.1.5 checked the other half and it holds**: nothing the landing route
> can reach renders a clock, a session word or a connection word. The route's
> transitive import closure is **fifteen files**, and `FeedIndicator`,
> `MarketClock`, `BackendIndicator`, `AppHeader` and `AppFooter` are in none of
> them. The connection keeps its one home while this story adds a second kind
> of statement beside it.

## M is measured — 2026-09-25, and the answer is FIVE minutes

**The denominator sentence needs a window, and Task 4.1.6 built an instrument
to choose one rather than argue it.** A Node client on the deployed gateway,
subscribed to all 518, sampling every 60 s from 07:13 ET through the bell.
**390 of the session's 390 minutes were sampled and there are no gaps inside
the session.**

### The curve, regular session only (09:30–16:00 ET, n = 390)

| Window | min | p10 | **median** | p90 | max | median as % of 518 |
| ------ | --- | --- | ---------- | --- | --- | ------------------ |
| 1 min  | 0   | 0   | **0**      | 0   | 0   | **0.0%**           |
| 2 min  | 1   | 292 | **325**    | 385 | 513 | **62.7%**          |
| 5 min  | 5   | 444 | **466**    | 491 | 518 | **90.0%**          |
| 15 min | 10  | 505 | **510**    | 515 | 518 | **98.5%**          |
| 60 min | 23  | 516 | **518**    | 518 | 518 | **100.0%**         |

### The by-hour shape, which is what the choice is made from

| Hour ET | 1m  | 2m      | 5m      | 15m | 60m |
| ------- | --- | ------- | ------- | --- | --- |
| 09      | 0   | 322     | 447     | 504 | 509 |
| 10      | 0   | 336     | 464     | 509 | 516 |
| 11      | 0   | 327     | 469     | 512 | 518 |
| 12      | 0   | 325     | 462     | 511 | 517 |
| **13**  | 0   | **298** | **446** | 508 | 517 |
| 14      | 0   | 316     | 465     | 509 | 518 |
| 15      | 0   | 391     | 498     | 515 | 518 |

**The worst hour is what decides it**, because a median that reads well at
11:00 and badly at 13:00 is a sentence that will embarrass this screen after
lunch:

| Window | worst hour | worst-hour median | %         |
| ------ | ---------- | ----------------- | --------- |
| 2 min  | 13:00      | 298/518           | **57.5%** |
| 5 min  | 13:00      | 446/518           | **86.1%** |
| 15 min | 09:00      | 504/518           | 97.3%     |

### So: M = 5 minutes

- **1 minute is structurally impossible**, not merely thin. A bar's `startsAt`
  is the start of the minute it describes and it arrives ~0.5 s after that
  minute **ends**, so the newest observation is always 60–120 s old. Measured
  as **0 in every one of 390 samples**. A sentence offering a 1-minute window
  would always read _0 of 518_.
- **2 minutes reads as a fault.** _325 of 518_ is 63%, and at 13:00 it is
  **298 — under 60%**. A reader meeting that beside a breadth figure concludes
  the feed is broken, which is precisely the confusion Task 4.1.5 wrote the
  one-home rule to prevent. The chrome would say `LIVE` while the figure said
  57%.
- **5 minutes holds 90% at the median and never drops below 86% in any hour.**
  Its whole-day band is **446–498**, ten points wide. The sentence reads the
  same after lunch as it does at the open, which is the property being bought.
- **15 minutes buys 8.5 points and costs the word _live_.** A figure qualified
  by a fifteen-minute window is not describing a live market, and this screen's
  whole claim is that it is current.

~~**So the sentence's shape is _N of 518 in the last 5 minutes_, with N typically
around 466 and legitimately as low as ~446 after lunch.**~~ Do not round N, do not
hide it when it dips, and do not colour it — it is a property of the IEX plan
(`PRODUCT_SPEC.md` §7.1), stated calmly, not a warning.

> **AMENDED 2026-10-07 at Gate 1 — every figure in this section was measured over
> the WRONG SET, and the set is now 503.** The owner chose to count **the 503
> equities** rather than all 518: a count that includes `SPY` and the eleven
> sector SPDRs alongside their own constituents makes this region and
> `Market proxies` non-independent, and in a one-sided market all fifteen fall the
> same way.
>
> **The curve, the by-hour table and the worst-hour argument above are unchanged
> as a RECORD of what was measured**, and the choice of **M = 5** does not move —
> it was decided on the _shape_ of the curve (1 minute structurally impossible, 2
> minutes reading as a fault at 57.5%, 5 minutes never below 86% in any hour), and
> removing fifteen of the most liquid names in the market changes no part of that
> argument.
>
> **What does move is every absolute figure, and it owes a RE-MEASURE rather than
> a subtraction.** The fifteen funds are the most liquid names tracked and are
> effectively always observed, so the honest first estimate is `N − 15` — about
> **451 median and ~431 at the worst hour, against 503** — but that is an
> inference about which the instrument said nothing. **Nobody may cite ~466 or
> 446–498 as a figure over 503.**
>
> **The re-measure is cheap and is owed before the sentence ships**, because the
> sentence states N and a reader will compare it to the band this file publishes.
> Task 4.1.6's instrument is the one to re-run — a Node client on the deployed
> gateway, subscribed to the 503, sampling every 60 s through a session — and it
> belongs to **Task 4.4.6**, which already owes a measurement of the
> heard-from-but-unmeasurable set from the same sitting.
>
> **And the sentence's noun changes with the set**: _of the 503 companies we
> track_, not _of the 518 we track_. `518` must not be spelled as a literal in any
> rendered string — the set is read, and one delisting makes a hard-coded figure a
> lie with no symptom.

> **And the floor is a floor.** Every figure here is a **lower bound**: a
> revision for a superseded minute never reaches a browser and is invisible to
> the instrument too, and a security that has not traded in the process's
> lifetime is absent rather than stale. The true coverage is at least this.
>
> **Corroboration from an independent angle**: `LIVE-DATA.md` §7.6 measured
> **65.1% median per-symbol minute coverage** a fortnight ago by a different
> method, and the 2-minute figure here is 62.7%. Two measurements, two methods,
> two weeks apart, agreeing.

## Handed to this story by Task 4.1.8 — 2026-09-25: where an aggregate is computed

**The hand-off enumeration found this story's file did not carry it.** The
decision was taken in Task 4.1.1 and this story is one of the four that acts on
it.

**An aggregate is computed on the BACKEND and arrives as a new frame on the
existing market-stream socket.** Not a second fetch, not a poll, and not a
computation in the browser over 518 securities.

**Three things follow, and they are what this story has to build against:**

- **There is no request to make.** The socket the chrome already holds is the
  transport; this story's surface subscribes and renders what arrives. A
  `useEffect` that fetches is the wrong shape and will look right in every test
  below `pnpm e2e`.
- **The frame is Story 4.2's to define and document**, including whether it
  owes an ADR of its own. This story reads it.
- **A browser that recomputes an aggregate over 518 rows on every tick is a
  main-thread task** on the page `PRODUCT_SPEC.md` §28 is least able to afford
  one. That is the measured reason the decision went the way it did, not a
  preference.

## Handed here by Story 4.2's close — 2026-09-26: three constraints on the denominator sentence

**1. It must not reach for `live`, `stale` or `disconnected`.** Those words have
one home — the status bar — and `one-home-for-the-feed-words` would trip on a
second speller **and would deserve to**. The denominator qualifies **the
coverage of one figure**; the connection is a different fact, and a healthy
`LIVE` feed with 341 of 518 heard from in five minutes is the ordinary state of
IEX rather than a fault.

**2. The count is FROZEN between bursts, and that is unbounded when the feed
dies.** The aggregate is computed once per applied batch, so a coverage figure
is as of `computedAt` — **bounded at about a minute during a session and
unbounded when nothing is arriving**. The frame carries `computedAt` for exactly
this reader; a surface that renders a decayed count as current is asserting
something it cannot establish. Read it.

**3. The screen already has a source note and it is at the foot of the region
group.** `OverviewSourceNote` states the feed behind the live figures, the tape
behind the stored closes and when the aggregate was computed, and **each clause
renders only when its own data is present** (ADR 0029), so it **grows** as your
region lands rather than being rewritten. Do not add a second note; add your
clause to that one.

## And one more, from Story 4.2's integrated review — the ≤860 px reorder becomes real HERE

**At `width <= 860px` the overview grid reorders VISUALLY** through
`grid-template-areas` while DOM order is unchanged. So the eye meets
`Market breadth` **second** and the keyboard and a screen reader meet it
**sixth**.

**Today that mismatch is unperceivable and this story is what makes it real.**
Every one of the six reordered regions is a `reserved` placeholder with no
figure and no focusable content — there is not one tab stop inside `.regions` at
any width — so a keyboard user cannot land on the disagreement and a listener
gets seven coherent region names either way.

> **FALSE, and corrected below — see _And this story's own premise was false_
> (2026-09-27).** There are **six** tab stops inside `.regions` at every width,
> and breadth was the **fifth** rather than the sixth. The paragraph above is
> left standing as the record of Story 4.2's review; the mismatch was shipped
> and live from Task 4.1.3, and **Task 4.4.7 resolved it on 2026-10-07** by
> moving the DOM into the ≤860 order.

`Market proxies` sits outside `.regions` and is first in both orders, so Story
4.2 did not change it.

**`Market breadth` is the region the reorder promotes to second visually and
demotes to sixth in the DOM, and it is this story.** `Sector performance` is
third in both and will not fire it. So the trigger is: **the first of the six
reordered regions to gain a figure or a focusable control — which is this one,
by name.** At that moment the eye's second region and the keyboard's sixth are
the same panel, and it becomes a WCAG 1.3.2 / 2.4.3 question rather than a
latent one. Decide it here rather than inheriting it.

## Reassessed 2026-09-27 — one vocabulary defect, one tension, and the scope of the reorder task

**1. `unobserved` is a fourth word with no home, and it is not a synonym for
`unknown`.** This file uses it twice as a screen-level distinction. The shipped
wire vocabulary is **`observed` / `stored` / `unknown`**, where `unknown` means
_nothing observed **and** nothing stored_ — so a security with a stored close and
no observation is **`stored`**, which is unobserved but not unknown.

So `unobserved` genuinely names something the three members do not: the union
`stored ∪ unknown`. **Express it as that union rather than introducing a fourth
word.** This file is right that _unchanged_ and _not heard from_ must be
distinguishable on screen — but a fourth word beside three already on the wire
leaves nobody able to say which of the four a reader is looking at. If a single
word for the union turns out to be necessary, it needs **one home and a sweep**,
which is a task rather than a phrase.

**2. AC 4 reads against the denominator decision, and a reader will not see
why.** AC 4 says that with the market shut the region reports _the last session's
close-to-close breadth_ — and Task 4.1.1's amendment records _last session's
close-to-close_ as a **rejected** option for the denominator. They are different
questions (the denominator during a session versus the market-shut state) and the
distinction needs one sentence here, or it reads as a contradiction.

**3. The ≤860 px reorder repair is a change to 4.1's GRID, not to your region.**
The trigger is written above and fires on your region by name. But if the answer
is _reorder the DOM rather than `grid-template-areas`_, it moves **all seven
regions at three breakpoints** and wants `pnpm probe` at four widths. Scope it as
a grid-level task, so it is not attempted as a breadth-panel fix.

## Handed here by Story 4.3 — 2026-09-27: your region's height is already paid for, and you move nothing

**`Market breadth` rose from 265 px to 461 px on 2026-09-27 without anybody
intending it, and the consequence is yours to keep rather than rediscover.**

Task 4.3.1 replaced `.regions`' fixed `height: 82vh` with `min-height: 82vh` and
`grid-template-rows: <resolved row 1>, repeat(2, minmax(min-content, 1fr))`. Rows 2
and 3 therefore **share one `fr` ratio**, and the second column's areas sit on the
same rows as the first — so when Task 4.3.5 filled `Sector performance` with eleven
rows, **`Market breadth` and `Movers` grew to exactly the same 461 px**. Measured,
before and after, at all four widths.

**What that buys you: filling this region moves nothing at all at 1440 and 1024.**
The hatched panel you replace is already the height your content will take, so the
page does not re-compose when you land. That is Task 4.1.4's
_nothing-moves-when-it-fills_ rule satisfied **for free** — the rule itself was
**retired** by the owner on 2026-09-27, so you do not inherit the obligation, but
you do inherit the outcome.

**Two things that are not free:**

1. **At 768 and 390 the grid is `grid-template-rows: none`**, so neighbours are
   auto-sized and this region is **103 px and 121 px**. Filling it there **will**
   grow the page. That is expected and fine — but it is yours to measure and report,
   under the rule that replaced 4.1.4's: _a reserved region's floor is set by the
   change that DRAWS its content, and that change measures and reports the movement
   before it merges._ `pnpm probe /` at all four widths, before and after.
2. **If your content needs more than 461 px, you take the whole grid with you.**
   Rows 2 and 3 are tied, so a taller `Market breadth` raises `Sector performance`
   and `Movers` too. That is the ratio working as designed, not a fault — but it
   means your height is a **page-level** decision rather than a regional one, and
   the number to beat is 461.

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

**And the one thing that must not move**: at every width, everything that moved
when 4.3.5 landed was **another reserved panel or the source note** — the proxy
strip, its four cells and its qualifier were **byte-identical in position and
size**. That is the claim the retirement rests on. **If filling this region moves a
figure or a sentence a reader is reading, stop and raise it with the owner** rather
than recording it.

## Reassessed 2026-10-07 after Story 4.3 shipped — two of your criteria have mechanisms already, and one defect class is waiting for you

**You are the next story that adds a region, and Story 4.3 found what that costs.**

### A region can stay silent for ever, and yours will unless you stop it

Task 4.3.8's state grid **produced** a case nobody had drawn: a socket answered with
the gateway's connect snapshot and **no overview frame ever** — an unreachable
aggregate, a half-rolled deploy, a proxy holding the socket open. `Sector
performance` rendered a titled, **empty ~440 px box indefinitely**, byte-identical
at 600 ms and at 12 s, while `Market proxies` 200 px above it said `No prices yet.`
**Two regions, one screen, one state: one explained itself and one did not.**

**The repair is already built and you reuse it rather than inventing a second
floor**: `useWaited(waiting)` from `MarketProxyStrip/use-waited.js`, at
`SAY_NOTHING_ARRIVED_AFTER_MS` (2,000 ms, against a first frame measured at
174–277 ms, so the ordinary load never reaches it). The sentence sits in room the
reservation **already holds** — `position: absolute` over the hatched rows — so
**nothing moves when it appears**.

**And the words are yours to choose rather than copy.** Sectors says `No sector
moves yet.` and not the strip's `No prices yet.`, deliberately: a price is a price,
and a sector's figure is a **move**. Breadth is a **count**, which is a third thing
again — say what breadth has none of, not what the strip has none of.

This is `docs/GAPS.md`'s standing entry — _nothing checks that a named region says
something when its subject is missing_ — whose owner is **the next story that adds a
region**. That is you.

### Two criteria have mechanisms that already exist

**AC 3** — _one computation, not three, with a test that fails if a second one
appears_. **The test exists**: `one-producer-of-the-overview-aggregate` permits
**exactly one** call site of `buildMarketOverview` and is break-verified. Story 4.3
added eleven sectors through that **same** call, splitting the returned entries **by
membership rather than by a slice** — a slice would silently shift when a fifth
index proxy appeared. **Do the same**, and do not widen the invariant's bound: its
break is the weak 1→2 signal and would pass silently under a wider one.

**AC 4** — _with the market shut the region is honest rather than empty_. Story 4.3
met the same criterion with a **new wire field** rather than a frontend fallback:
`WireStoredFigure.sessionChangePercent`, the last completed session's close-to-close
move, **omitted rather than zero** when there is no prior close. If breadth needs
the equivalent, it is a wire change and belongs in the join — **and note there is no
previous-session DATE on `SecurityLastClose`**, only a number, which is why the
field name had to carry the meaning.

### The geometry you inherit, corrected

Your region's reserved height is **486 px**, not the 461 an earlier amendment in
this file says — Task 4.3.7's quiet-group heading added 25 px, and `Market breadth`
rose with it because rows 2 and 3 share one `fr` ratio. **So filling this region
still moves nothing at 1440 and 1024.** At 768 and 390 the grid is
`grid-template-rows: none` and this region is 103 px and 121 px, so filling it there
**will** grow the page — yours to measure and report.

## Decomposed 2026-10-07 — eight tasks, five owner decisions, and two defects found before a line was written

**Phase 1 engaged six roles and two of them independently found the same shipped
defect**, which is why the first task repairs rather than builds.

### The five decisions the owner took at Gate 1

**1. Counts, not percentages** — `Advancing 284`, with a percentage permitted
beside a count but never replacing one. **This makes AC 5 true by construction**:
three integers summing to N exactly, at every rounding, with nothing to round.
Three independently-rounded percentages sum to 99 or 101 — at N = 466 with an even
split, `33.3 + 33.3 + 33.5 = 100.1`. Rejected: percentages only (needs
largest-remainder apportionment and an exhaustive test over ~23M triples), and
both always (costs horizontal room in a region that is 103 px at 768).
**`PRODUCT_SPEC.md` §9 draws percentages and owes a dated amendment.**

**2. The count is over the 503 equities, not all 518.** A count that includes SPY
and the eleven sector SPDRs alongside their own constituents answers no question a
reader has, and makes this region and `Market proxies` **non-independent** — in a
one-sided market all fifteen fall the same way, shifting the figure by up to ~2.9
points toward the majority. **The cost is that the decided sentence's noun
changes** — _of the 503 companies we track_ — and **Task 4.1.6's measured band
(446–498, worst hour 446) was taken over 518**, so it is restated at roughly
`N − 15` and **owes a re-measure rather than a subtraction**.

**3. Session-driven, with the wire saying which count it sent.** A two-member
union on the frame: `observed` with its five-minute coverage, or `session` with the
session date. **The market is shut ~80% of the week, so this is the common path
rather than an edge case.** Rejected: data-driven (the measured five-minute minimum
is **5 of 518**, so thin extended hours would produce a breadth figure over five
names, which a reader will believe), and saying nothing outside a session (blank
whenever the market is, which is what this epic's exit criterion worries about).

**4. The ≤860 px reorder is repaired by reordering the DOM**, so the one-column
order is the declared order and `grid-template-areas` places the wide layouts — as
it already does by name. **Scoped as a grid-level task on Story 4.1's grid**: all
seven regions, three breakpoints, `pnpm probe` at four widths.

**5. The shape is the breadth ledger** — three rows of `label · count · bar` on
`RankedList`'s geometry, **`Not heard from` in a trailing group below a rule** in
the idiom Task 4.3.7 shipped for `Not ranked`, plus one headline figure. **It
survives greyscale twice over** (a word per row, and the row's own label on its own
bar) and reuses shipped geometry rather than inventing. Rejected: a four-segment
partition bar — the better **picture** and the worse **product**, because
advancing and declining differ by **1.04:1** with a _moving_ boundary, so even
fixed order does not recover direction, and `unchanged` at 15 of 466 is a **10 px
sliver** that vanishes at zero, leaving a two-segment bar that reads as complete.
And four figures in a row, which gives up proportion entirely — the region's stated
job is _how broad, at a glance_.

### Two defects found during shaping, before any code was written

**1. The sector arrival mark cannot fire on the deployed page — a defect in Story
4.3's shipped code.** The landing route subscribes to `overview.figures` only
(`MarketOverview.tsx`: `symbolKey` is the four proxies), the gateway scopes both
`bars` and `snapshot` to what a client asked for (`if (!wanted.has(…)) continue`),
and the eleven sector ETFs ride in `overview.sectors` — **which never reaches the
subscription**. So `observations.get("XLK")` is permanently `undefined` and
`SectorRow.arrival` can never fire. **Invisible to every test**, because the unit
tests hand `sectorPerformance` an observations map directly and the browser specs
furnish their own frames. Found independently by the technical analyst and the
tester. **Task 4.4.1.**

**2. The proxy filter is a NEGATIVE membership test, and this story springs it.**
`index.ts` splits the join's answer with `entries.filter(e => !isSectorSymbol.has(e.symbol))`.
Breadth needs the join to see all 518 — and against a negative filter **every
non-sector security lands in `overview.figures`**: hundreds of cells in the strip,
a ~56 KB frame, `newest` and `sharedBasis` folding over 507 figures. **No compile
error, no failing test.** Story 4.3's comment there warns against a _slice_ and
does not cover this, because the sector predicate is positive and the proxy one is
not. **Task 4.4.1 closes it before Task 4.4.4 widens the join.**

### And this story's own premise was false

The ≤860 amendment says _"there is not one tab stop inside `.regions` at any
width."_ **There are six.** `Region` passes `scrollable` unconditionally and
`Panel` renders `tabIndex={scrollable ? 0 : undefined}`. Verified in the tree, and
three other documents already say so — Story 4.6's `STORY.md`, `Panel.tsx`'s
docblock and `RankedList.tsx`. **So the visual/DOM mismatch is shipped and live
rather than latent, and the trigger fired at Task 4.1.3 rather than here.** What
breadth changes is that the stop the eye meets second and the keyboard meets fifth
becomes the first one with a figure under it.

**Corrected:** the trigger is a present-tense defect, not a prediction.

### Four more corrections owed, recorded here so a task does not re-derive them

- **AC 3 is not falsifiable as written.** It asserts breadth agrees with the sector
  rows about a denominator, and `EPIC.md`'s 2026-09-27 reassessment removed the
  denominator from 4.3 (_"a sector row is the sector ETF's own move … 4.3 has no
  denominator at all"_). **Restated** as: one call to the join and one direction
  function, so a sector row's drawn direction and the bucket it is counted in
  cannot disagree.
- **`unobserved` stays out of the tree and off the screen.** It is the union
  `stored ∪ unknown`, it is `503 − N`, and **it is never labelled** — the sentence
  is written in the positive and the three counts are taken over N. A fourth figure
  beside `Unchanged` is the adjacency this story exists to prevent.
- **Two coverage figures in this file measure different things and it does not say
  so.** The description's _"about 332 of 518 in a median minute, 65.1% per-symbol"_
  and Task 4.1.6's _"1-minute window is 0 in every one of 390 samples"_ are both
  true — bars attributable to a minute, versus observations newer than 60 s at a
  sampling instant. A reader taking the first as the 1-minute denominator is 332
  away from the truth.
- **`directionOf` and `PRICE_DIRECTIONS` must move to `packages/shared`**, because
  breadth is counted on the backend and the frontend module is unreachable from
  there. This is the `changeFromClose` precedent firing exactly as recorded, and
  `price-format.ts`'s own note that direction is _"arithmetic on a number both
  sides already hold"_ is the sentence that expires here. **Task 4.4.2.**

## Decided at Gate 2 — 2026-10-08: the headline's caption loses its direction at zero

**The owner accepted Story 4.4 with one change**, and it is the only thing in
this story decided after the tasks closed.

### What was wrong

At `advancing === declining` the headline read **`NET ADVANCING`** over
**`— unchanged 0`** — a caption naming a direction the figure beneath it
denies. **Two of the eighteen produced states reach it** (`09` at N = 2, `12`
at 220/220/11) and **neither had ever been drawn** before Task 4.4.8's producer
walk. Every channel was individually correct — the glyph, the word and the sign
all agreed with each other and with `a − d = 0` — which is precisely why
nothing mechanical found it and no existing story showed it.

### The three options, and why the middle one

| Option                                        | Argument for                                                                                                                                                                                            | Argument against                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Leave it**                                  | `Net advancing` is the measure's **name**, and a name that holds at every value is the ordinary way to label one — a thermometer stays labelled _temperature_ at zero. Costs nothing and adds no state. | A stranger reads a caption as a claim, not as a column header, and this one is denied three glyphs to its right.                                |
| **Neutral caption at zero** — **CHOSEN**      | One word changes, in one state, and only the word that was wrong. The figure, the glyph and the spoken word are untouched because they already said `unchanged`.                                        | **The caption now changes under the reader as well as the figure** — see the cost below.                                                        |
| **Say the balance in words** (`evenly split`) | Most legible to a stranger.                                                                                                                                                                             | The most invention: a sentence this product does not have, and the headline's **shape** would differ between states rather than one word of it. |

### The accepted cost, stated because it is real

**On a live feed the label itself flickers.** `advancing − declining` can cross
zero during a session, and at the crossing a reader watching the region sees
the caption move between `NET` and `NET ADVANCING`. That was the argument for
_leave it_ and it was heard. It is bounded by how rarely an exact tie occurs
across 503 names and by the two captions sharing their first word and their
position.

**Reversal trigger**: the first sighting of the caption changing **more than
once in a sitting**. That is a thing only the live rehearsal can report, and it
is written into this story's `LIVE-REHEARSAL.md` row rather than left here.

### The one implementation note worth carrying

**The pivot is `direction`, never the digits.** `net.direction` is
`directionOf(net) ?? "unchanged"` — the one shared comparator Task 4.4.2 put in
`packages/shared` — and it is **the same value `PriceChange` renders the word
from**. So the caption and the word beneath it cannot disagree: there is no
second test of _is this zero_ to drift out of step with the first. Reading the
digits instead (`change === "0"`) would be that second test, and it is exactly
what `one-direction-one-home` exists to forbid.

Covered by `BreadthLedger.test.tsx`, **in both directions in one test** —
because a test of the zero case alone stays green if the caption loses its
direction everywhere, which is the other way to get this wrong. Proved red both
ways before the close. The state is a story: `APerfectlySplitMarket`, to be
reviewed beside `ObservedMidSession`.
