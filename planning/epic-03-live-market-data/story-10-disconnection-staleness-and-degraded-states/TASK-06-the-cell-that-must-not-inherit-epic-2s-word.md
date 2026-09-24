# Task 3.10.6 — The cell that must not inherit Epic 2's word, in every connection state

**Status:** **Complete — 2026-09-24.** The venue now names **the tape the newest numbers came from**, which is the live one whenever the socket has reported it — so `ALL US EXCHANGES` can no longer stand beside arriving IEX prices. One home (`venueFor`), an **exhaustive** pairing check that walks the producers, and `pnpm break the-chrome-inherits-epic-2s-word-again` proving it goes red. The cell also **speaks now**, and only on a degradation: silent on mount, silent on recovery. Criterion 5 asserted. **Two defects found in the writing**, and the second only a browser could see.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1, 3.10.2

## Objective

The market-feed cell answers **two** questions — _which venues are in these
numbers_ and _is data arriving_ — and on the deployed site it has been getting
the first one wrong on every route.

> `MARKET FEED ● ALL US EXCHANGES ● LIVE`

read beside numbers that were **entirely IEX**, seen on 2026-09-22.

## What the user can see when this lands

**The chrome stops claiming the whole market while showing one exchange**, in
every connection state — and a quiet socket at 02:00 reads as correct rather
than as broken.

## Why the two halves are one task

Because **the venue word has to be decided _with_ the connection word**, and
this story owns what the cell says in every connection state:

- while `LIVE`, the numbers arriving are the **socket's** tape;
- while `DISCONNECTED` or `STALE`, the newest numbers on screen are **still the
  socket's**;
- the charts beneath are the **historical** tape throughout.

So a cell that names a venue correctly for `LIVE` and keeps naming it through
`DISCONNECTED` may be right or wrong depending on which subject the word has.
Deciding one without the other is how it went wrong the first time.

## Where the words come from, and why nothing went red

The venue comes from `GET /market-data` (`{"feed":"sip"}` — the **historical**
provider's tape) and the connection word from the socket's `feed` frames
(`{"status":"live","feed":"iex"}`). Two sources, one cell.

**`market-feed-grid.test.ts` asserts that a connection word has _a_ feed word
beside it, not that it is the right one.** That is exactly why this shipped for
four days: Task 3.4.9 built a check that walks the **selections** and it is
correct about what it checks.

**When 3.10.1's decision 4 is answered, write it into that file as the rule that
a live connection word is never beside a feed word the live tape is not.** A
check whose failure mode is _it was never about that_ is the one that lets this
recur.

## What has narrowed since the decision was framed

Story 3.9 shipped the source note's two-feed sentence from a **recorded** body,
and `All US exchanges` now has **exactly one producer**, guarded by
`the-consolidated-word-has-one-producer` with a break behind it. So _defer to
the source note_ is a live option rather than a wish: `PROVENANCE.md` §1.3 —
the chrome says what it can and the source note says what the chrome cannot.

## Criterion 5, which lands here because it is the same cell

**A quiet socket outside market hours reads as correct rather than as broken.**
`FeedStatus` is about the **connection** and `MarketSessionStatus` is about the
**session**, and they are deliberately separate — _the market being open does
not mean data is flowing, and the market being shut is not a feed failure_.

A quiet socket at 02:00 is **correct**, and the 165 s threshold does not know
that. Assert it.

## Work

- The venue word, per 3.10.1's decision, in every connection state
- The rule written into `market-feed-grid.test.ts`, with a `pnpm break` entry
- A quiet socket outside market hours asserted as correct
- The cell looked at, at four viewports, in every state it can hold
- `pnpm invariants` extended if the decision creates a second producer risk

## Done when

1. No connection state puts a live word beside a tape the live feed is not
2. The check walks the **producers** rather than one rendering, break-verified
3. A shut market is not a feed failure, asserted

---

## Handed here by Task 3.10.2 — 2026-09-24: the cell changes silently, and nothing has ever argued that it should

**You own what this cell says in every connection state. Whether it SAYS it to
a listener is the same decision and has never been taken.**

The strip is a plain `<footer>`. `AppFooter`, `FeedIndicator` and
`FeedProvenance` carry **no `aria-live` and no `role`** between them, so the
word changing from `live` to `disconnected`, and the sentence that appears
beside it, are announced to **nobody**.

**The existing argument does not cover it.** `FeedProvenance`'s _Not a live
region_ comment is correct and is about the **venue**, whose value _"cannot
change at all without a deploy and a reload"_. The **connection** half changes
while a page is open — the opposite case, and the one this cell exists for.

**And Task 3.10.2 closed the escape route.** Criterion 3 is now held by an
assertion that `main`'s entire text is **byte-identical** either side of an
outage. That is right, and it means a listener who is not in the footer has
**nothing at all** to notice: the numbers they are reading silently become
stale.

`Live in the chrome.dc.html`'s _what this did not decide_ said the listening
list should be _"one entry longer"_ on **2026-09-19**. It reached
`docs/GAPS.md` on 2026-09-24, five days and four tasks later.

**What to decide, with the constraints that already bind it:**

- The page carries **four** polite regions already, and the rule that arrived
  with the second is that **a region belongs to a subject and its sentences
  name it** (`FRONTEND-STATE.md` §7). A fifth needs that argument made, not
  assumed.
- **`role="status"` would announce on mount**, which is the commonest
  transition in a footer and the reason the venue half refused one.
- The honest middle is probably that **only the degraded transitions** speak —
  a region that is silent on mount and on a return to `live`, and says
  something when the feed stops. That is a shape this product has not built
  before, so it is a decision rather than a default.
- Whatever is chosen, **what a real screen reader does with it is the standing
  unanswerable**, and the list it joins is at five entries with an owner who is
  a person rather than a task.

---

## What was done — 2026-09-24

### The venue names the tape the newest numbers came from

One rule, in one home (`AppFooter/venue.ts`):

| What the page holds           | Venue             |
| ----------------------------- | ----------------- |
| nothing live has ever arrived | the stored tape   |
| live prices are arriving      | **the live tape** |
| the feed has stopped          | **the live tape** |
| no provider configured        | no venue word     |

**The third row is the one worth pausing on.** After a disconnection the newest
figures on screen are **still the socket's** — which is exactly what the
chrome's own _showing data through …_ means — so a venue that reverted to the
stored tape there would relabel numbers that had not changed.

**The first row is not a fallback.** Before anything live arrives the newest
numbers on screen are the charts', and they _are_ the historical tape. Same
rule, not an exception to it.

> **Rejected — defer entirely to the source note.** Safest against invariant 6,
> and it loses the at-a-glance venue from the chrome, which is the one thing
> this cell is for; the note is a security page's and the chrome is on all five
> routes. **Rejected — name both tapes**: duplicates the note's ledger in a
> status strip, which is the two-surfaces defect this repository has produced
> three times on one screen, and makes a one-row bar permanently two.
>
> **Reversal trigger, as a condition:** the first deployment whose stored and
> live tapes are the **same**. The rule still holds, it just stops being
> visible — and a reader could not tell that from the chrome having given up.

**And the disclaimer arrives with it.** `MARKET_FEED_DESCRIPTIONS` has carried
IEX's sentence since Story 2.6 — _trades reported by the IEX exchange only_ —
and the cell simply had no occasion to show it. §7.1's actual requirement is
the sentence rather than the acronym, and it is now on screen during a session.

### The check walks the producers, and the break proves it

The task's own warning was that `market-feed-grid.test.ts` asserts a connection
word has **a** feed word beside it and not that it is the right one — _a check
whose failure mode is "it was never about that"_.

The new one is structural and exhaustive: for **every** live tape × **every**
configured answer, the venue shown _is_ the live tape.

```text
pnpm break the-chrome-inherits-epic-2s-word-again
  ✓ broken → red → restored byte-identical.
    matched: never puts a venue beside a live tape that is not it
```

The break reverts `venueFor` to preferring the configured view — which is what
shipped from 2026-09-21 and was seen on the deployed site.

### Criterion 5 — a quiet socket outside market hours

Asserted in a browser: `marketOpen: false` with a healthy socket reads `LIVE`
and neither `STALE` nor `DISCONNECTED`. `FeedStatus` is about the connection
and `MarketSessionStatus` about the session, and the 165 s threshold does not
know what time it is.

### The cell speaks now, and only when something got worse

**Decided by the owner**, given that Task 3.10.5 made this the only surface on
a security page that says the feed stopped:

| Transition               | Announced |
| ------------------------ | --------- |
| mount, any state         | **no**    |
| `live` → `stale`         | yes       |
| `live` → `disconnected`  | yes       |
| `stale` → `disconnected` | yes       |
| `disconnected` → `stale` | **no**    |
| anything → `live`        | **no**    |

**Not a plain `role="status"` on the cell**, which announces on **mount** — the
commonest transition in a footer and the exact reason the venue half refused a
live region. A bar that speaks on every page load teaches a listener to ignore
it, which is worse than silence.

**Recovery is silent** because it is the state a reader wanted, and the word
stays on screen to be read at any time. `disconnected → stale` is an
improvement, so the same rule keeps it quiet rather than an exception doing it.

### Two defects found in the writing, and the second is the interesting one

**1. The test fixture was the incoherent pair.** `AppFooter.test.tsx` paired
`marketFeed: not-configured` with a live feed reporting `iex` — the combination
`market-feed-grid.test.ts` marks unreachable and Task 3.10.1's audit
manufactured and withdrew. It passed until the venue started following the live
tape, at which point it asserted against **a deployment that cannot exist**.
Both fixtures are now coherent.

**2. The announcement worked for exactly one render, and only a browser could
see it.** The first version _derived_ the announcement —
`announcesDegradation(previous, current)` computed fresh, with the previous
status in a ref written from an effect. The sentence appeared in the region and
**the next render wiped it**, because by then the ref had caught up.

> **A polite region emptied a frame later may never be read aloud at all**, and
> the DOM is correct at one instant either way — so every unit test of the
> decision function passes and the page is broken. What caught it was the
> browser assertion polling the region _after_ the transition had settled.
>
> The repair is that what is held is **the sentence**, not the decision, and it
> is adjusted **during render** rather than in an effect — React's own shape for
> _state derived from a prop that has changed_, and the call
> `use-live-series.ts` already made for the same compiler rule.

### Gates

`pnpm verify` green — **2,423 tests** (eleven new), 26 invariants. `pnpm e2e`
green. `pnpm break the-chrome-inherits-epic-2s-word-again` red on demand.

## For a stakeholder — a status report, 2026-09-24

### What this was

**The status bar was telling people we had data from the whole US market when
every live price on the screen came from a single exchange.**

Seen on the live site during trading on 22 September:

> MARKET FEED · **ALL US EXCHANGES** · LIVE

Both halves were individually true. The "all US exchanges" came from our
_historical_ data supplier; the "live" came from the _live_ connection. Nobody
had noticed they were describing two different things in one sentence.

**This is the single most serious honesty problem we have found in this phase
of work.** Our own product rules forbid implying we can see more of the market
than we can, and that line did exactly that, on every page, for three days.

### What it says now

> MARKET FEED · **IEX** · Trades reported by the IEX exchange only — not the
> full US consolidated tape. · LIVE

The rule underneath it is one sentence: **the venue names the tape the newest
numbers on the page came from.**

- Before any live price arrives, the newest numbers are the charts' — so it
  names the historical source, which is correct.
- Once live prices arrive, it names the live exchange.
- **After the feed dies, it keeps naming the live exchange** — because the
  newest numbers on screen are still the ones that came from it. Switching back
  would be relabelling numbers that had not changed.

The explanatory sentence was already written and had simply never had occasion
to appear. Three letters teach a non-specialist nothing; that was the point of
writing it two years ago.

### How we stop it coming back

The old check confirmed the two halves were _present_, not that they _agreed_ —
which is precisely why the problem survived three days with everything green.

The new one is exhaustive: for **every** combination of live feed and stored
feed, the venue shown must be the live one. And we deliberately broke it to
confirm the alarm sounds — restoring the old behaviour turns the check red.

### The status bar also speaks now, and only when something is wrong

Recent work made this cell the **only** thing on a security page that says the
feed stopped — the chart, the headline price, the table and the readout all
deliberately stay quiet, each for a good reason. But the cell was not announced
to screen readers at all, so a blind user was told **nothing**.

It now announces — but **only a degradation**. Silent on page load, silent when
the feed recovers. A status bar that speaks every time you open a page teaches
you to ignore it, which is worse than silence; and recovery is good news that
does not need to interrupt anyone. The word stays on screen to be read whenever
you want it.

### Two things we got wrong first

**Our own test fixture described an impossible deployment.** It paired "no data
provider configured" with "the live feed says IEX" — a combination the product
cannot produce. It passed for months and only failed once the venue started
following the live feed, at which point it was asserting about a system that
cannot exist.

**And the announcement worked for a single instant.** Our first version put the
sentence into the page and the very next screen update wiped it. Every
individual test passed, because at the moment each one looked, the page was
correct. **A message that vanishes a fraction of a second later may never be
read aloud at all** — and only a test driving a real browser, checking _after_
things had settled, could see it. The fix holds the sentence until something
changes it.

That is the fifth time in this story that our own tooling, rather than the
product, was the thing at fault. Each was found by running something rather
than reading it.

### Where the product stands

**Epic 3's final story, six of ten tasks done.** Every surface we have examined
now tells the truth when the data stops — and the status bar has stopped
overstating where our numbers come from.

**What is next:** filling the gap a dropout leaves, so a brief outage stops
costing the rest of the trading day.
