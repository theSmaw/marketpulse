# Task 3.10.9 — The whole set, produced and photographed together

**Status:** **Complete — 2026-09-24. Nine states produced, 45 photographs, and the pass found what it was built to find.** **No pair reads identically on every surface, at any width** — criterion 2 met. The defect is a **duplicate**: `BarSeriesPanel` rendered its own `Market feed · All US exchanges · IEX · <the one-venue sentence>` line whose own comment said _today it never renders … and the day the second feed arrives it renders itself_ — that day arrived, and what it drew was **the source note's ledger a hundred pixels below it, sentence for sentence**. Deleted. A second, smaller defect fell out of reading the strings: **`1 bars`**. And the instrument was wrong **four times** before it was right, each recorded.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.3, 3.10.4, 3.10.5, 3.10.6, 3.10.7, 3.10.8

## Objective

Criteria 1 and 2, and **this is the task the whole story is shaped around.**

> Every state in the set is enumerated, reachable in the suite, and photographed
> at 1440, 1024, 768 and 390 — and **two states that imply different next
> actions do not read identically.**

## What the user can see when this lands

**Whatever this task finds.** Which, on the evidence of the pass it is copied
from, will not be nothing.

## Why a pass at the end rather than eight careful tasks

Because **a state is correct on its own and wrong beside its neighbour**, and
that is not a hypothesis. Task 2.14.7 enumerated every failure and partial state
in Epic 2 and photographed them together, and found **four defects, none of
which was visible one state at a time**:

- two empty answers that read identically while implying different next actions;
- a confident sentence about data nobody had read;
- a region that says nothing when its subject is missing;
- a note inviting a reader to use a control that had just said it was
  unavailable.

**Every one of those was shipped, green, and invisible to everything
mechanical.** This task is the same instrument pointed at a bigger set.

## The set, which is a product of two lists rather than a list

Enumerate it properly: **every surface × every state**, plus the states that
only exist in transition.

| Axis       | Members                                                                       |
| ---------- | ----------------------------------------------------------------------------- |
| Connection | `live`, `stale`, `disconnected`, reconnecting, dropped-for-backpressure       |
| Session    | pre-market, open, after-hours, shut, holiday                                  |
| Data       | live and fresh, live and old (**state 4**), stored close only, nothing at all |
| Series     | complete, gap in the middle, stopped edge, never started                      |
| Deployment | no provider configured, replay, fixture                                       |

**Not every cell is reachable and that is a finding rather than a gap** — say
which are unreachable and why, the way Task 2.14.7 did.

## The two rules that catch the defects

**1. Two states that imply different next actions must not read identically.**
The Epic 2 pass found this twice. Candidates here, named so they are checked
rather than stumbled on: _disconnected_ against _market shut_; _stale_ against
_quiet security_; _gap in the middle_ against _a security that did not trade_;
_state 4_ against _state 1_.

**2. A region that says nothing when its subject is missing.** `docs/GAPS.md`
entry 13 carries this with an owner that is a **condition** — _the next story
that publishes a state grid_ — and this task publishes one. **So the owner is
you**, and the repair is checked by walking the **producers** rather than by
rendering a state, which is what `market-feed-grid.test.ts` established.

## Work

- The grid, every reachable cell produced through 3.10.2's harness
- Photographs at four viewports, together rather than one at a time
- Greyscale for every state that differs by hue
- Each unreachable cell named with why
- Every defect found either repaired here or handed on **by name**
- `docs/GAPS.md` entry 13 discharged or re-owned with a condition

## Done when

1. The set is enumerated and every reachable member photographed at four widths
2. No two states implying different next actions read identically, checked
   deliberately against the named candidates
3. Entry 13 has a verdict

---

## What was done — 2026-09-24

### The instrument, and the four times it was wrong before it was right

`scripts/state-grid.mjs` — a throwaway in the shape `ALPACA.md` §11 established:
run it, record the findings with the readings **verbatim**, delete it. It
produces nine states through the shipped socket path, photographs each at 1440,
1024, 768 and 390 plus **greyscale at 1440**, and captures the **text** of six
surfaces so _do two states read identically_ is answered by comparing strings
rather than by eye.

**It reported findings four times that were its own fault**, and they are
recorded because the next person writing one of these will make them:

| What it reported                                            | What was actually wrong                                                                                                                                                                                   |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| every state's identity block and table row read identically | `[class*="identity"]` matched the **masthead**, `dl` matched the **figures strip**, `table tbody tr:first-child` matched a **sector heading**                                                             |
| `01-live-and-fresh` read `STALE`                            | a recorded bar's instant is **weeks old**, and staleness is 60 s of wall clock — so the chrome was right; the fixture is now shifted so its last bar sits on the most recent completed minute             |
| `02-live-but-quiet` read `STALE`                            | it sent **nothing at all**, which is a quiet _feed_; a quiet _security_ needs bars for somebody else, and that distinction is what Story 3.10's scope is built on                                         |
| `disconnected` decayed into `stale` at 390 but not at 1440  | the harness answered the browser's own retry with a fresh snapshot. **A real outage does not answer the retry**, so neither does this now — and the tell was one state giving two readings from one drive |

**A fifth is a limitation rather than an error, and it bounds a conclusion
below**: `marketOpen` travels on the feed frame, and the masthead's clock reads
the **real** wall clock — so this instrument cannot produce _market shut_ in the
masthead. On a real shut market it would read `CLOSED · Closed at 16:00`, and
two of the pairs below would be told apart by two surfaces rather than one.

### The set, and which cells are unreachable

Nine states, each produced rather than simulated:

| #   | State                                           | Produced by                                   |
| --- | ----------------------------------------------- | --------------------------------------------- |
| 01  | live and fresh                                  | a bar for NVDA, stamped on the current minute |
| 02  | live, and **this security** is quiet            | bars for AAPL and none for NVDA               |
| 03  | stale                                           | a `feed` frame carrying `status: "stale"`     |
| 04  | **state 4** — the price was live and is now old | a bar, then the socket closed and kept down   |
| 05  | disconnected, never live                        | the socket closed before any bar              |
| 06  | market shut                                     | `marketOpen: false` with a healthy socket     |
| 07  | no provider configured                          | `{"feed": null}` from `GET /market-data`      |
| 08  | no bars at all                                  | an empty series — CI's store                  |
| 09  | complete window                                 | the recorded body whole                       |

**Unreachable, and why** — the finding rather than the gap:

- **dropped-for-backpressure** is a server-side close a browser cannot tell
  from any other; it arrives as `1013` and renders as `disconnected`. There is
  no separate state to photograph.
- **replay** and **fixture** deployments change the venue word and nothing else
  on this page; `Live in the chrome` §03 owns that grid and
  `market-feed-grid.test.ts` walks its producers.
- **holiday** is `market shut` with a different reason and the same rendering —
  the masthead's clock differs, and this instrument cannot produce it (above).
- **gap in the middle** is deliberately identical to _a security that did not
  trade_ (Task 3.10.5, with the measurement: there is no feed this product can
  buy on which a missing minute is unusual).

### Finding 1 — two surfaces drawing one ledger, which is the defect this pass exists for

The greyscale photograph at 1440 showed **two lines labelled `MARKET FEED`** a
hundred pixels apart. The upper one, inside the Price region:

```text
MARKET FEED  ● All US exchanges  ● IEX  Trades reported by the IEX exchange
only — not the full US consolidated tape.
```

and below it the source note:

```text
SOURCES  1,910 bars  All US exchanges
            1 bar    IEX  • arriving
                     Trades reported by the IEX exchange only — not the full
                     US consolidated tape.
```

**The same sentence, twice, on one screen.** `BarSeriesPanel`'s `Provenance`
renders whenever a series carries more than one distinct feed, and its own
comment is the whole story:

> So today it never renders and no reader loses anything, and **the day the
> second feed arrives it renders itself.** The alternative was a note in a
> document saying _put this back in Epic 3_, which is the kind of note that is
> read after the screen has shipped without it.

**That day arrived** — Story 3.8 gave the store two tapes and Task 3.10.8 gave
the live tail its own stretch — and the surface it was waiting for had been
built in the meantime. The note is the owner: `PROVENANCE.md` §1.3 assigns
_this series' feeds_ to it, and its condition is a **superset** of the panel's
(more than one feed, **or** one that is not the configured one), so nothing is
lost. `Provenance` and `FeedLabel` are deleted.

> **It is invisible in every single state**, which is the argument for this
> task's existence restated as evidence: each surface was correct, the
> duplication only exists **between** two of them, and no renderer test has a
> shape for it. Task 2.14.7 found four defects this way and this is the fifth.

### Finding 2 — `1 bars`

Read off the strings rather than seen:

```text
SOURCES  1,910 bars  All US exchanges
            1 bars   IEX  • arriving
```

**The count could not be one until Task 3.10.8** gave the live tail a stretch
of its own — and the first minute of every live session is exactly that stretch
with one bar in it. So the commonest moment of the state the ledger was built
for was the ungrammatical one, for a day. Fixed, with a test.

### Criterion 2 — no pair reads identically, at any width

```text
--- pairs that read IDENTICALLY on every surface ---
  none, at any width
```

Three pairs are told apart by **one surface only**, at all four widths, and all
three are the design working rather than failing:

| Pair                                        | Told apart by | Why that is right                                                                                                                                                      |
| ------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stale` vs `disconnected`                   | the chrome    | both hold a live price that has stopped; the difference is _why_, which is the connection, which is the chrome's by ADR 0029                                           |
| `disconnected, never live` vs `market shut` | the chrome    | neither has a live price; the chrome says whether that is a fault or the hour — and on a real shut market the masthead says so too                                     |
| `quiet security` vs `market shut`           | the **row**   | 3.10.4's dating: NVDA is _behind_ the newest observation in one and there is no newest observation in the other, so one row is dated `2026-09-11` and the other is not |

> **What the pass leaves standing rather than repairs.** The whole distinction
> between _the feed stopped_ and _the market is shut_ rests on **one cell at the
> foot of the viewport**, which at 390 sits below the fold until a reader
> scrolls. Every surface above it is deliberately quiet — 3.10.3, 3.10.5 and
> 3.10.8 each decided so, with reasons — and 3.10.6 made that cell speak on a
> degradation, which is the repair for a listener rather than for a reader.
> **Named here rather than fixed**, because changing it would reverse three
> decisions taken with measurements behind them. `docs/GAPS.md`.

### Criterion 3 — `docs/GAPS.md` entry 13's verdict

Entry 13's re-measure is: _for each published state grid, take the **producers**
rather than the renderers and confirm every row is reachable._

**This grid is discharged by construction**: every row in it was reached by
driving the shipped path — a real socket close, a real `feed` frame, a real
`{"feed": null}` — rather than by naming a combination. A row nothing can
produce could not have appeared in it, because the instrument builds rows by
producing them.

**The entry is re-owned rather than closed**, with its condition unchanged:
`CHARTING.md`'s chart states and `PROVENANCE.md`'s failure-and-partial-state
tables are still renderer-side grids, and the next story that publishes one
inherits it.

### Gates

`pnpm verify` green — **2,446 tests, 26 invariants**. The instrument is deleted;
its 45 photographs are under `.capture/` and its readings are quoted above.

## For a stakeholder — a status report, 2026-09-24

### What this was

**The last thing you do before calling a set of states finished: put them all
on one screen and look.**

We did this once before, at the end of the historical-data phase, and it found
**four defects that no single screen showed** — two "no data" messages that
looked identical while meaning different things, a confident sentence about
data nobody had checked, and a panel that went silent instead of saying why.
All four were live, all four passed every automated check.

So this task built the same instrument for a bigger set: nine states of the
live feed, each one genuinely **produced** — a real disconnection, a real quiet
market, a real dead connection — photographed at four screen sizes and in
greyscale, 45 pictures in all.

### What it found

**Two places on one screen were printing the same sentence.** Under the chart,
a line said `Market feed · All US exchanges · IEX — trades reported by the IEX
exchange only…`. A hundred pixels below it, the source note said the same
thing again with bar counts attached.

The reason is almost funny. That line was written **two years ago** with a
comment saying, in effect, _this will never appear today, but the day our data
comes from two sources it will appear by itself — which is better than leaving
a note asking someone to remember._ The author was right about the mechanism
and could not know that by the time that day came, somebody would have built a
better surface for the same fact. Last week's and yesterday's work between them
made that day arrive.

We deleted the older line. The note keeps it, and covers more cases.

**And a smaller one, which is the kind you only see by reading the words**: the
new "still arriving" row said **"1 bars"** in its first minute — and the first
minute of every live session is exactly when the count is one, so the commonest
moment of the thing we just built was the broken-looking one.

### The thing we checked deliberately and did not change

Our rule is that **two situations meaning different things must not look the
same**. They do not: no two of the nine states are indistinguishable, at any
screen size.

But three pairs are told apart by **one thing only** — usually the status bar
at the bottom of the window. That is deliberate: we decided three separate
times, each with evidence, that the chart, the price and the table should stay
quiet rather than all shout at once. Still, it means that on a phone the whole
difference between _the feed died_ and _the market is closed_ sits below the
fold until you scroll.

We have written that down rather than changed it, because changing it would
reverse three decisions that each had a measurement behind them. It is the kind
of thing worth a conversation rather than a quiet fix.

### An honest note about the tool

**Our own measuring instrument was wrong four times before it was right.** It
matched the wrong parts of the page; it used recorded prices that were weeks
old and then reported the product as broken for noticing; it modelled "this
share is quiet" as "the whole market is silent"; and it answered the browser's
reconnection attempts, so a disconnection healed itself while being
photographed.

Each was caught, and each is written down — because the instrument gets deleted
and the mistakes are the part worth keeping.

### Where the product stands

**Epic 3's final story, nine of ten tasks done.** One task remains: the
measurements, the live rehearsal and the close.
