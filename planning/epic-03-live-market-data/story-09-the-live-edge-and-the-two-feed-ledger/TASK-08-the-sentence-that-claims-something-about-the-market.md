# Task 3.9.8 — The sentence that claims something about the market

**Status:** **Complete — 2026-09-24.** Both sentences repaired through one mechanism, and the second was repaired by **deletion**. `No shares changed hands anywhere in the window.` now has **one home** — `describeSilence` in `market-provenance.ts` — and its scope is read off the series' own tapes: `anywhere` only where the consolidated tape is what we read, the venue **named** where it is not. The cadence clause is gone rather than reworded, because the same paragraph already stated the true density twice. **26 invariants**, one break behind the new one, and the audit found **one** other market-claiming sentence — which turned out to be about the store after all.
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.7

## Objective

Criterion 5, and it is one sentence:

> `No shares changed hands anywhere in the window.`

**It is the only shipped sentence making a claim about the market rather than
about our store.** It is true while every bar is the consolidated tape; the
first time a single venue's bars are what the window holds, it reports **one
exchange's silence as the whole market's** — which is precisely what
`PRODUCT_SPEC.md` §7.1 forbids, in the one place a reader would never look for
it.

## What the user can see when this lands

**A sentence that is true**, in the case where the old one was a lie. On IEX
this is ordinary rather than theoretical: median per-symbol minute coverage is
**65.1%** and the worst case is **2.1%** (`ERIE`), so a thin name over a short
window can legitimately produce a live stretch with no volume in it at all.

## Why it is a whole task

**Because the repair has a structural half.** The sentence has **two homes
today — drawn and spoken** — and _one fact has one home_ is this repository's
rule (ADR 0029): a drawn sentence and its spoken twin are one string with two
renderings, and a second copy must fail the build. So this is a string, a check
and a break, not a wording change.

And the wording itself is a real decision rather than a formality. The honest
sentence depends on what the window holds, which is now one of three things —
all consolidated, all one venue, or both — and ADR 0029's rule is that **each
clause renders only when its own data is present**. A single reworded sentence
that is vague enough to be true in all three cases is the failure mode to avoid;
so is a third sentence nobody can find.

## Work

- The wording, per tape state, with the rejected alternatives
- One string, two renderings, and a check that a second copy fails — `pnpm
invariants` plus a `pnpm break`
- A unit assertion per tape state, including the case this task exists for: a
  window whose bars are all `iex` and whose volume is zero
- Grep for every other sentence on this screen that claims something about the
  market rather than about the store, and record the count — this one was found
  by somebody reading, not by a check

## Done when

1. The sentence is true in all three tape states, asserted per state
2. It has one home, and a second copy fails the build — check and break
3. The count of other market-claiming sentences is recorded, even if it is zero

---

## Handed here by Task 3.9.1 — 2026-09-24: a SECOND sentence, of the same family, already shipping

**`a line of 131 closing prices, one per trading minute`** — from the price
chart's spoken alternative, `chart-alternative.ts`'s `describeSeries`, read off
the deployed site on 2026-09-23 over a 390-minute session.

**The clause is a claim about cadence and it is false by a factor of three.** It
is not a live-feed problem: `ERIE` traded in 131 of that session's minutes on
the **consolidated** tape, and the sentence has said _one per trading minute_
since Story 2.12. On IEX it gets worse rather than different — 65.1% median
coverage, 2.1% at the worst.

**Why it lands here rather than in a task of its own.** It is the same shape as
this task's own subject — a drawn-and-spoken claim that outruns its data — and
the repair is the same mechanism: the honest wording, one home, and a check that
a second copy fails the build. Two sentences through one mechanism is one task;
two tasks would be the mechanism twice.

**What is NOT handed here** is the picture. The axis closes gaps up by design
and `CHARTING.md` §3's reversal trigger was evaluated by Task 3.9.1 and has
**not** fired. This is about what the sentence says, not about what the line
draws.

**One thing to check while wording it**: the neighbouring _runs the full width
of the window asked for_ clause is **correct** and must not be swept up. It
compares the **requested** window with the ledger's **covered** range, both of
which are the whole session — the coverage rule doing its job. Only the density
clause has nothing behind it.

---

## What was done — 2026-09-24

### The mechanism, which is one function and is not in a component

`describeSilence(feeds)` in `packages/shared/src/market-provenance.ts` — the
module that already owns what this product claims about a feed. Both surfaces
import it; neither spells the sentence.

| The window holds        | The sentence                                            |
| ----------------------- | ------------------------------------------------------- |
| only whole-market tapes | `No shares changed hands anywhere in the window.`       |
| only one venue          | `No shares changed hands on IEX in the window.`         |
| both                    | `No shares changed hands on either feed in the window.` |
| neither (`synthetic`)   | `No shares changed hands in the window.`                |

**The consolidated case is byte-identical to what shipped**, and that is the
check on the design rather than a coincidence: the sentence that had been there
since Story 2.13 _is_ the `sip` case, and what was missing was every other one.

The scope comes from **`FEED_REACH`**, a total `Record<MarketFeed, …>` in
`FEED_SERVES`' idiom, so a feed added without deciding its reach is a compile
error. `replay` is `the-whole-market` deliberately — ADR 0030 §3: a replay is a
real recorded session whose underlying tape is the consolidated one, so a
silence in it genuinely was a silence everywhere, at that past moment.

**The venue is named and not explained.** The source note one region below
already carries `MARKET_FEED_DESCRIPTIONS`' own sentence for `iex`; ADR 0029's
fourth rule is that the surface owning the data owns the account of it and
everything else points once and stops.

### Criterion 2 — one home, and a check with a break behind it

`pnpm invariants` gains **`the-market-claiming-sentence-has-one-home`** (26
now), walking the **producers** for `the-consolidated-word-has-one-producer`'s
reason: rendering a state proves that _one_ state does not say it.

```text
pnpm break the-market-claiming-sentence-gets-a-second-home
  ✓ broken → red → restored byte-identical.
    matched: is produced in 2 place(s)
```

**What the two copies had in them is worth recording**, because it is the shape
of a rule broken carefully rather than carelessly: each carried a comment saying
it was deliberately _"said in the words `chart-alternative.ts` says it in,
because it is the same fact"_. ADR 0029 broken **with a note explaining the
break** — and the cost is specific rather than tidy, because the fact these
strings carry is _how wide a claim the feeds entitle us to_, so a correction
applied to one copy leaves the other reporting one exchange's silence as the
whole market's.

### The second sentence, handed here by Task 3.9.1 — repaired by DELETION

`one per minute of trading` is gone, and `intervalWord` with it.

**Rewording it was rejected.** The honest version is _one for each minute in
which it traded_, and the same paragraph already states the true density
**twice** — `frameClause`'s _drawn across 5 trading sessions_ and
`coverageClause`'s _covers the first 780 of 990 trading minutes_. A third
telling of one fact is the copy that drifts. **The listener gains a shorter
sentence and loses no fact.**

> **Corrected 2026-09-24, in this task's own record.** An earlier draft of this
> paragraph said the shortened sentence _"is the one with the standing pacing
> entry against it: 25 words against a 1,500 ms floor"_. **It is not.** That
> figure is `readingAnnouncement`'s — the reading strip's **live region**,
> paced by `READING_ANNOUNCEMENT_MIN_GAP_MS`, which Task 2.13.5 took to 25
> words by adding the volume clause. What this task shortened is
> `chart-alternative.ts`' whole-chart description, rendered as a **static
> `visuallyHidden` paragraph** with no live region on it — read when a listener
> navigates to it, never announced against a floor. So the gain is a shorter
> paragraph to read rather than one that fits a pacing budget, and
> `docs/GAPS.md`'s pacing entry is **untouched by this task**: its word count
> and its owner are unchanged.

Three assertions encoded the false clause and changed. That is the repair
landing, not a cost.

> **Task 3.9.1's guard held**: the neighbouring _runs the full width of the
> window asked for_ clause is untouched. It compares the **requested** window
> with the ledger's **covered** range and is correct.

### Criterion 3 — the audit, and the count is ONE

Every user-facing sentence on this screen, read for whether its subject is the
market or our store:

| Sentence                                          | Subject   | Verdict                            |
| ------------------------------------------------- | --------- | ---------------------------------- |
| `No shares changed hands anywhere in the window.` | market    | **the defect** — repaired here     |
| `one per minute of trading`                       | market    | **the defect** — deleted here      |
| `No bars are stored anywhere in the window…`      | **store** | correct — `anywhere` is the window |
| `We hold no bars for this security…`              | store     | correct                            |
| `No history stored for NVDA yet.`                 | store     | correct                            |
| `Market feed: All US exchanges.`                  | feed      | correct — and single-produced      |

**The one that looks like a third and is not** is `No bars are stored anywhere
in the window asked for` — `anywhere` there quantifies over the **time range**,
not over venues, and the verb is _stored_. It is a claim about our store and it
is true. Recorded because it is the sentence a later reader will grep for and
mistake.

It does appear **twice**, in the price and volume branches. Left alone
deliberately: two branches of one function producing parallel sentences about
two subjects is not the duplication ADR 0029 forbids, and collapsing them would
cost more legibility than it buys.

### The workshop, where the three states can be looked at

`VolumeReading.stories.tsx` gains **`SilentEverywhere`**, **`SilentAtOneVenue`**
and **`SilentAcrossTwoFeeds`**, side by side. The bar is built rather than
recorded and the story says why: **no fixture holds a silent minute**, because
every recorded body this product has is a liquid name over a window it traded
in. The state is real all the same — on IEX, at 65.1% median per-symbol minute
coverage and 2.1% at the worst, a thin name over a short window produces it
ordinarily.

### The canvas

`Volume reading.dc.html` gains **§07 — The window in which nothing traded, and
whose silence it is**: the three states drawn at the strip's own idiom, the
three rejected alternatives, the cadence deletion, and one consequence that is
a real finding rather than a note —

> **§04's reservation changes.** That section's mechanism is that the row
> reserves **the taller of its states**, because both are content. The stitched
> sentence is now the longest string the strip can hold, so **it becomes the
> sizer**, and §15.4's finding applies unchanged: no single reserved height is
> correct at more than one width. **Re-measure at 342 px**, which is Task
> 3.9.9's probe rather than this task's.

§07 also closes §06's open Epic 3 card — _a reading over a series that is still
moving_ — answered by Task 3.9.6.

**Amended rather than added to**, ADR 0026's chain the right way round for the
third story running.

### What this task did NOT do

**It did not thread provenance into the price strip.** `ChartSubject` gained
`feeds` and one reader consumes it. The price strip makes no claim whose scope
depends on a feed — a closing price is a closing price on either tape — so
giving it the field would be scaffolding ahead of the iteration that needs it.

### Gates

`pnpm verify` green — **2,082 tests**, 26 invariants. `pnpm e2e` green — **149
passed, 15 skipped, 2.9 min**. Two breaks re-run after the refactor and both
still go red. `pnpm test:database` not run: nothing in this change touches the
backend, a query or a migration.

## For a stakeholder — a status report, 2026-09-24

### What this was

**We found a sentence in our product that was telling people something untrue
about the stock market, and it had been true when we wrote it.**

Under the volume chart there is a line of text for the case where nothing
traded during the period you are looking at. It read:

> No shares changed hands **anywhere** in the window.

That was a fair thing to say for the first two years of this product, because
every price we held came from the **consolidated tape** — the combined record
of every US exchange. If that sees nothing, nothing happened.

### Why it stopped being true three weeks ago

Our live feed is **not** the consolidated tape. It is a single exchange, IEX,
because that is what the free data plan gives us. And a single exchange sees a
lot less: on a typical stock it carries about **65%** of the minutes in a
session, and on the quietest names in our universe as little as **2%**.

So the first time you looked at a chart built from live data for a quiet stock,
the product would have told you _nothing traded anywhere in the market_ when
what actually happened was _nothing traded at one exchange_. **Those are very
different statements**, and the second one being dressed as the first is exactly
the thing our own product rules single out as forbidden: never imply we can see
more of the market than we can.

The uncomfortable part is **where** it was hiding. We have a whole surface
dedicated to saying where our numbers come from, and it was correct. This was an
ordinary sentence under a chart that nobody thought of as a claim about data
coverage — which is why it was found by a person reading rather than by any
check.

### What it says now

The sentence now reads the chart's own record of where its data came from, and
says only as much as that entitles it to:

- **Consolidated tape** → _"No shares changed hands **anywhere** in the
  window."_ — unchanged, because here it is earned.
- **One exchange** → _"No shares changed hands **on IEX** in the window."_
- **A chart stitched from both** → _"No shares changed hands **on either
  feed** in the window."_

We deliberately did **not** rewrite it into one vague sentence that would be
true in every case. That would have been easier, and it would have taken the
strongest honest thing we can say away from the common case in order to spare
the rare one. Being precise where we can be is the entire point of the feature.

We also did not have it re-explain what IEX is. The note directly beneath the
chart already does that, and two surfaces explaining the same thing is how they
end up explaining it differently.

### The structural half, which matters more than the wording

**That sentence existed in two places in our code** — once for the version you
read on screen, and once for the version a screen reader speaks. Both copies
carried a comment from a previous author saying, in effect, _"yes, this is a
duplicate, and that is on purpose, because it is the same fact."_

It is now **one** sentence, written in one place, with an automated check that
**fails the build** if a second copy ever reappears — plus a test that puts the
second copy back on purpose, to prove the check actually fires.

That is not tidiness. The fact this sentence carries is _how much of the market
we can see_, so a version of this product where someone fixes one copy and not
the other is a version that quietly lies on one of its two surfaces. We have
made that impossible rather than discouraged.

### A second false sentence, fixed by deleting it

The spoken description of the price chart opened with _"a line of 131 closing
prices, **one per trading minute**"_. That is a claim about how often we have
data, and it was **wrong by a factor of three** — that stock traded in 131 of
the session's 390 minutes. It was not a live-feed problem; it had been wrong
since the chart was built.

**We deleted the phrase rather than rewriting it**, because the same paragraph
already tells you the truth twice: how many trading sessions the chart covers,
and how many of the window's minutes have data. A third version of one fact is
simply a third thing that can go stale. A screen-reader user gets a shorter
description and loses nothing.

_(An earlier version of this report said that description was one we had
flagged as too long for comfortable listening. That flag is against a
**different** sentence — the one spoken when you move the crosshair. This one
is read only when a listener navigates to it, so the win here is brevity
rather than a timing problem solved.)_

### We also checked whether there were more

There were not. We read every sentence on that screen and sorted them by what
they are _about_: the market, or our own database. **Two claimed things about
the market and both are fixed.** Everything else says _stored_, _we hold_,
_asked for_ — claims about our records, which are the only claims we are always
in a position to make.

One sentence looks like a third and is not: _"No bars are stored anywhere in the
window asked for."_ The word _anywhere_ there is about the stretch of time, not
about exchanges. We have written that down, because it is the one a future
reader will find and mistake for the bug we just fixed.

### Where the product stands

**Seven of nine tasks done.** What you can see on a security page during trading
hours: two charts that extend minute by minute without a refresh, readable by
mouse or keyboard at any point including the newest, telling you truthfully
which part of the data came from which source — and now, when there is nothing
to show, saying so in words that do not overstate what we looked at.

**What is left:** the performance measurements this story owes with the feed
actually running, and then the sweep and close. The only thing still owed from
outside a keyboard is a photograph of a two-source chart taken from the live
site while the market is open — and that one **expires overnight**, because our
nightly job backfills the consolidated tape and the split disappears.
