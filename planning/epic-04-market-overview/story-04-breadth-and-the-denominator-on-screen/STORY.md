# Story 4.4 — Breadth, & the Denominator on Screen

**Status:** Not started
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

**So the sentence's shape is _N of 518 in the last 5 minutes_, with N typically
around 466 and legitimately as low as ~446 after lunch.** Do not round N, do not
hide it when it dips, and do not colour it — it is a property of the IEX plan
(`PRODUCT_SPEC.md` §7.1), stated calmly, not a warning.

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
gets seven coherent region names either way. `Market proxies` sits outside
`.regions` and is first in both orders, so Story 4.2 did not change it.

**`Market breadth` is the region the reorder promotes to second visually and
demotes to sixth in the DOM, and it is this story.** `Sector performance` is
third in both and will not fire it. So the trigger is: **the first of the six
reordered regions to gain a figure or a focusable control — which is this one,
by name.** At that moment the eye's second region and the keyboard's sixth are
the same panel, and it becomes a WCAG 1.3.2 / 2.4.3 question rather than a
latent one. Decide it here rather than inheriting it.
