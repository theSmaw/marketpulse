# Task 3.10.1 — What the tree already does in every degraded state, and the four decisions this story cannot start without

**Status:** **Complete — 2026-09-24, and it removed a task's worth of work.** The audit was taken by **producing** each state through the shipped socket path rather than by reading code, and the headline finding is that **§36's sentence already ships** — _"The live feed is not connected. Prices shown are the last known. Showing data through Sep 24 · 05:05 EDT."_ — which is most of Task 3.10.2. **Criteria 3 and 5 are already met** and are struck. What is NOT built is everything below the chrome: **four of six surfaces say exactly the same thing in all five states**. All four decisions are answered by the owner and written down with their rejected alternatives.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** nothing

## Objective

**Build nothing.** Two outputs: an audit of what each surface _already_ does in
each degraded state, and **four decisions put in front of the owner** with the
measurements that bear on them.

This story's file carries **eleven** hand-off sections from seven sibling
stories. Some of what it asks for is already built, some was fixed on its behalf
before it started, and at least one figure in its own scope is **known stale and
corrected in a sibling's file**. Reading first is this epic's most reliably
profitable half-hour: Story 3.9 did it four times and it removed work every
time — a third of one story already built, one task deleted outright, one
feature already shipped, one criterion already met.

## What the user can see when this lands

**Nothing.** The output is a table, four questions and their answers.

## The audit — every surface × every state, filled in from the tree

Produce the grid. The columns are the states; the rows are the surfaces that
`PRODUCT_SPEC.md` §36 and this story's scope name:

| Surface                       | `live` | `stale` | `disconnected` | market shut | security quiet |
| ----------------------------- | ------ | ------- | -------------- | ----------- | -------------- |
| The chrome's market-feed cell |        |         |                |             |                |
| The identity block's price    |        |         |                |             |                |
| The universe table's 518 rows |        |         |                |             |                |
| The chart's edge              |        |         |                |             |                |
| The source note               |        |         |                |             |                |
| The volume strip              |        |         |                |             |                |

**Fill it by rendering, not by reading.** A cell that says _"probably defers"_
is the thing this task exists to replace.

**Three cells are already known and should be confirmed rather than
discovered**, because three siblings wrote them into this file:

- **Nothing clears the prices on a degraded feed** — Story 3.4 keeps the
  numbers through `disconnected` deliberately; blanking them would remove true
  information because a socket died.
- **The arrival mark simply stops.** There is no _stopped_ state in the motion
  vocabulary and there should not be one.
- **The chart's stopped edge is a straight line that says nothing** — Story
  3.9's close, and the three noes behind it.

## The four decisions, each with the measurement that constrains it

**Ask the owner. Do not choose any of these on the way past.**

### 1. The staleness threshold, in seconds, and whether it varies by security

This is **the hardest decision in the epic** and two tasks have already refused
it with a measurement. `LIVE-DATA.md` §11.2 declined to give a security a status
word; Task 3.6.2 declined to repair the table's state 4 because _"the repair is
a threshold"_ and taking it inside a design pass about a disc would be taking
this decision as a side effect.

What bears on it:

| Figure                                                                    | Source              |
| ------------------------------------------------------------------------- | ------------------- |
| IEX per-symbol minute coverage: **65.1% median, 2.1% worst (`ERIE`)**     | `LIVE-DATA.md` §7.6 |
| Gap between one security's consecutive bars: **p50 one minute, max 187**  | §11.2               |
| The shipped `stale` threshold for the **connection**: **60 s** wall clock | Task 3.2.6          |
| The shipped `disconnected` threshold: **165 s** monotonic                 | Task 3.2.6          |

**The trap to state when asking:** a maximum ordinary gap of **187 minutes**
means no single number separates a quiet security from a broken feed. So the
honest options are probably _(a)_ no per-security staleness at all, keeping the
distinction at the connection where it already lives, _(b)_ a number that will
be wrong for thin names and saying so, or _(c)_ something derived per security
from its own observed cadence — which is a model, and models are Epic 5's.

### 2. How far back a reconnection fills, and what it does when the gap is too large

Constraints, all measured:

- **What is missed while away is GONE** (Task 3.1.9): a deliberate 3-minute
  disconnection produced **fifteen bars over HTTP and zero on the socket**,
  then or later. So filling is an **HTTP backfill** and cannot be a socket
  feature.
- The free plan embargoes the most recent **~15 minutes** of historical bars.
  **So the most recent part of any gap cannot be filled at the moment it is
  noticed**, which makes _when_ to fill a decision as well as _how far_.
- The rate limiter is a refilling bucket at ~3.3/s with **no `Retry-After` on a
  `429`**.
- **A revision is not a gap** and a bar is not final for **29.1–30.1 s**.

### 3. Whether a stale price keeps its last change figure or drops it

Both defensible, and they make different promises. The change figure is
_"change from the previous close"_ — arithmetic over two numbers, one of which
is now old. Keeping it is a true statement about a stale price; dropping it
refuses to compute over data we have stopped trusting.

### 4. The venue word beside the connection word — and this one has been seen wrong on the deployed site

The 2026-09-22 rehearsal read `MARKET FEED ● ALL US EXCHANGES ● LIVE` while
every live number on the page was **IEX**. That is `CLAUDE.md` invariant 6's own
sentence breached on every route. The cell has two subjects and this story owns
what it says in **every connection state**.

The options that file already names: the cell names the **live** tape, or
**both**, or **defers to the source note** (`PROVENANCE.md` §1.3 — the chrome
says what it can and the source note says what the chrome cannot). Story 3.9's
two-feed sentence is the other half and is now shipped, which narrows it.

> **When answered, write the rule into `market-feed-grid.test.ts`**, which today
> asserts that a connection word has _a_ feed word beside it and not that it is
> the right one. That is why nothing went red for four days.

## One correction to make in this file before anything else

**This story's own scope and criterion 6 reason from the wrong figures.** They
cite median coverage **82.8%**, worst case **43.1%** — which are `ALPACA.md`
§5.2's and came from **stored history**. The live stream is worse: **65.1%
median, 2.1% worst**. The correction has been sitting in a sibling's file since
2026-09-17 and this file records it further down without amending the scope
above it. **Fix the live claims; leave the historical records standing.**

## Work

- The grid, every cell filled by rendering the state
- The four decisions put to the owner, each with its figures and its trap
- The stale coverage figures corrected in this story's scope and criterion 6
- Anything the audit finds already built, struck from the criteria with the
  test or component that meets it named

## Done when

1. The grid has no empty cells and no cell reading _probably_
2. The four decisions are answered by the owner and written down with their
   rejected alternatives
3. Any criterion already met is struck, with its evidence named

---

## What was done — 2026-09-24

### How the states were produced, because "rendered rather than read" needed a mechanism

`scripts/degraded-audit.mjs`, a throwaway, run and deleted. It drives the real
application at 1440×900 with the socket served from the test using the
**shipped encoder**, and produces each state through the path production uses:

| State          | Produced by                                                               |
| -------------- | ------------------------------------------------------------------------- |
| `live`         | a snapshot plus a fresh observation                                       |
| `stale`        | a `feed` frame carrying `status: "stale"`                                 |
| `disconnected` | **closing the socket** — `feedStatusFrom` reads `closed` directly         |
| market shut    | a `feed` frame with `marketOpen: false`                                   |
| security quiet | a **three-hour-old** observation for NVDA **while another symbol trades** |

**The browser takes the worse of its own reading and the server's**
(`worseFeedStatus`), and the gateway really does send a status, so this is the
shipped path rather than a component's props being poked. Waiting out the real
thresholds — 165 s monotonic, 60 s wall clock — reaches two of these and costs
four minutes a surface; those thresholds have unit tests that own them.

> **The instrument was wrong once, in a way worth keeping.** Its first version
> modelled _security quiet_ as a single three-hour-old observation and nothing
> else — which is a silent **connection**, and correctly read `stale`. A quiet
> **security** is a busy feed in which one symbol is silent. Conflating the two
> is precisely the distinction this story's scope insists must not collapse,
> and the instrument collapsed it on the first try.

### The grid, every cell filled by rendering

| Surface                        | `live`              | `stale`                      | `disconnected`                      | market shut   | security quiet                 |
| ------------------------------ | ------------------- | ---------------------------- | ----------------------------------- | ------------- | ------------------------------ |
| **The chrome's feed cell**     | `LIVE`              | `STALE` + sentence + instant | `DISCONNECTED` + sentence + instant | `LIVE`        | `LIVE` ✅                      |
| **The identity block's price** | figure + instant    | **identical**                | **identical**                       | **identical** | **identical, instant 3 h old** |
| **The universe table's rows**  | figure              | **identical**                | **identical**                       | **identical** | **identical**                  |
| **The chart's edge**           | sentence + count    | **identical**                | **identical**                       | **identical** | **identical**                  |
| **The source note**            | `All US exchanges…` | **identical**                | **identical**                       | **identical** | **identical**                  |
| **The volume strip**           | peak + instant      | **identical**                | **identical**                       | **identical** | **identical**                  |

**One surface of six changes. The other five are unaware a feed exists.**

### Finding 1 — §36's sentence already ships, which is most of Task 3.10.2

Verbatim, from the capture:

```text
DISCONNECTED  The live feed is not connected. Prices shown are the last known.
              Showing data through Sep 24 · 05:05 EDT.

STALE         Connected, but no new data has arrived.
              Showing data through Sep 24 · 05:04 EDT.
```

`PRODUCT_SPEC.md` §36 names _"Live feed disconnected — displaying data through
10:42:17"_. **That is the same sentence with better words**: ours says which
data and why, and carries the instant in the product's own bar-instant format.

**Task 3.10.2's headline deliverable is therefore already built.** What it owes
instead is the **harness** — this instrument, made permanent and asserted
against, which criterion 7 demands as _"a produced disconnection rather than a
simulated one"_.

### Finding 2 — criteria 3 and 5 are already met, and are struck

**Criterion 3** — _killing the feed mid-session leaves every number on screen,
labelled with the instant it was correct as of, and collapses nothing_.
Measured: across all five states the identity price, the chart's sentence, the
source note and the volume strip are **byte-identical**, the page is never
blank, and **no page error was raised in any state**. The label is the chrome's
`Showing data through …`.

**Criterion 5** — _a quiet socket outside market hours reads as correct rather
than as broken_. Measured: `marketOpen: false` with a healthy socket reads
`LIVE`. `FeedStatus` is about the connection and `MarketSessionStatus` about
the session, and the two are correctly separate.

**Criterion 6 is met at the connection and not at the security.** A quiet
security on a busy feed keeps the chrome at `LIVE` — correct, and the thing the
story most feared. What it does **not** do is anything about that security's own
three-hour-old figure, which is decision 1's subject.

### Finding 3 — the contradiction pair is still reachable, in a new spelling

The dev deployment reads:

```text
MARKET FEED   NOT CONFIGURED   No market-data provider is configured.   LIVE
```

**Two true halves and one contradiction**, which is Task 3.4.9's defect
exactly — it repaired the `REPLAYING` spelling and `market-feed-grid.test.ts`
walks the **selections**, so a socket reporting `LIVE` into a deployment with no
provider configured is a combination the grid does not contain. It is
unreachable in production (a configured deployment has a venue word) and
reachable here. **Recorded for Task 3.10.6**, which owns the cell.

### The three cells that were to be confirmed rather than discovered

All three confirmed:

- **Nothing clears the prices on a degraded feed** — verified across five
  states, byte-identical.
- **The arrival mark simply stops** — no _stopped_ rendering appeared anywhere.
- **The chart's stopped edge is a straight line that says nothing** — the
  chart's sentence and count are identical in every state.

### The four decisions, answered by the owner on 2026-09-24

#### 1. Per-security staleness → **date it, the way a stored close is dated**

A three-hour-old live price gets the **instant treatment state 2 already has**.

> **Why this and not a threshold.** The table is _already_ more careful about a
> day-old number than a three-hour-old one: state 2 carries a session date and
> state 4 carries nothing. **The asymmetry is the defect**, and correcting it
> needs no number at all — which is what lets this story avoid the decision
> `LIVE-DATA.md` §11.2 and Task 3.6.2 both refused with a measurement.
>
> **Rejected — a fixed threshold**: §11.2's ordinary maximum gap is **187
> minutes**, so any single number cries wolf on thin names. **Rejected — no
> per-security staleness**: leaves state 4 reading as state 1, the known defect.
> **Rejected — derive it per security**: correct, and it is a model, and models
> are Epic 5's.
>
> **Reversal trigger, as a condition:** the first surface that must distinguish
> _stale_ from _old_ rather than merely show how old — an alert, or a score
> that must refuse to compute. Dating a figure says how old it is; it does not
> say whether that is wrong.

#### 2. Gap fill → **the current session only, once, on reconnect**

> **Rejected — fill everything missed**: a two-hour dropout across 518 symbols
> is a different request profile from a two-minute one, against a ~3.3/s bucket
> with **no `Retry-After` on a `429`**. **Rejected — fill nothing**: what ships
> today, and it fails criterion 4 as written. **Rejected — only the security
> being looked at**: cheapest, and leaves 517 holed until the nightly backfill.
>
> **The embargo is not a problem this has to solve**: the most recent ~15
> minutes cannot be fetched, and they are exactly the minutes the **live feed**
> will deliver anyway. So the fill covers the gap _up to_ the embargo and the
> socket covers the rest.

#### 3. A stale price's change figure → **keep it**

> It is arithmetic over two real numbers and stays true of the price shown.
> **Rejected — drop it while degraded**: removes true information because a
> socket died, which is the argument Story 3.4 already used for not blanking
> the prices, and makes reconnection a flicker.

#### 4. The venue word → **name the live tape while connected**

While `LIVE`, `STALE` or `DISCONNECTED` the newest numbers on screen are the
**socket's**, so the cell says `IEX`. The charts beneath are the historical tape
and the source note says so in full.

> **Rejected — defer entirely to the source note**: safest against invariant 6
> and loses the at-a-glance venue from the chrome, which is what the cell is
> for. **Rejected — name both tapes**: duplicates the source note's ledger in a
> status strip, which is the two-surfaces defect this repository has produced
> three times on one screen.
>
> **The check must change with it.** `market-feed-grid.test.ts` asserts that a
> connection word has _a_ feed word beside it, not that it is the right one —
> which is why nothing went red for four days. Task 3.10.6 writes in the rule
> that **a live connection word is never beside a feed word the live tape is
> not**.

### The correction this task was told to make was already made

The stale coverage figures — 82.8% / 43.1%, which are `ALPACA.md` §5.2's for
**stored** history against the live stream's **65.1% / 2.1%** — were corrected
in the story's scope and criterion 6 by the split itself, on the same day.
Confirmed rather than repeated.

### What this hands to the tasks after it

- **3.10.2** is amended in its own file: the sentence ships, so that task is the
  **harness and the assertions**, not the wording.
- **3.10.3 and 3.10.4** have their decision: **date the old figure**, no
  threshold.
- **3.10.6** has its rule to write into `market-feed-grid.test.ts`, and a second
  contradiction spelling to cover.
- **3.10.7** has its policy: the current session, once, on reconnect, up to the
  embargo.

### Gates

`pnpm verify` green (26 invariants), `pnpm links` green. No product code
changed. The instrument is deleted.

## For a stakeholder — a status report, 2026-09-24

### What this was

**Before building anything for "what the app does when the data stops", we went
and looked at what it already does.** Not by reading the code — by breaking the
connection for real, five different ways, and writing down what every part of
the screen said each time.

That distinction matters. The code can be read as _probably fine_; a screen
either says something useful or it doesn't.

### The good news, which is most of a task's work

**The message we have been building towards for this entire phase of work is
already on screen.** Kill the feed and the status strip says:

> **DISCONNECTED** — The live feed is not connected. Prices shown are the last
> known. Showing data through Sep 24 · 05:05 EDT.

Our product specification asks for _"Live feed disconnected — displaying data
through 10:42:17"_. What we already ship is that, with better wording: it says
_which_ data, _why_, and _as of when_.

**Two of this story's eight acceptance criteria were already met**, and we have
struck them with the evidence rather than re-doing the work:

- **Nothing breaks when the feed dies.** Every price, every chart and every
  caption stayed exactly as it was across all five states, with no blank page
  and no error. That is the single most important promise in this area — a
  product that collapses into an error screen because a connection dropped is
  the thing our own rules forbid most explicitly.
- **A quiet market is not reported as a fault.** Outside trading hours the
  connection correctly reads healthy rather than broken.

We also confirmed the subtlest one: **a share that simply isn't trading does not
make the feed look broken.** Those are genuinely different situations and the
product already tells them apart.

### The bad news, stated as plainly

**Only one part of the screen out of six knows the feed exists.**

The status strip changes. The big price, the 518-row table, the chart, the data
source note and the volume readout say **precisely the same thing** whether the
feed is healthy, stalled, or dead for three hours. They are not wrong — they are
simply unaware.

The sharpest example: **a price that arrived three hours ago looks identical to
one that arrived five seconds ago.** Meanwhile a price from _yesterday_ is
correctly labelled with its date. We are more careful about the day-old number
than the three-hour-old one, which is exactly backwards.

### The four decisions you made, and why they matter

**1. An old live price gets dated, like an old stored one.** We deliberately did
**not** pick a "this is now stale" time limit. We measured that a share can
normally go **187 minutes** between trades, so any limit we picked would falsely
accuse quiet shares all day long. Simply showing _when_ the price is from needs
no limit at all — and it fixes the backwards asymmetry directly. Two previous
pieces of work refused this decision because it looked like it needed a number;
it turned out not to.

**2. After a dropout we refill the current trading day, once.** Not everything
ever missed — a two-hour outage across 518 shares is a very different request
than a two-minute one, and our data plan has a hard rate limit with no guidance
on when to retry.

**3. A stale price keeps its "up 5.48%" figure.** It is still a true statement
about the number shown. Removing true information because a connection died is
the same mistake as blanking the prices.

**4. The status strip will name the feed the live prices actually come from.**
Today it says "All US exchanges" next to numbers that come from one exchange —
which we consider a serious honesty problem and is precisely what our rules
about never overstating our data coverage exist to prevent.

### Why we did it this way

**Because looking first has now removed work five times in a row on this
project.** In the previous story it found a third of the work already built,
deleted a planned task outright, discovered a feature had already shipped, and
met a criterion nobody had checked. This time it found the headline message
already on screen and two criteria already satisfied.

**And one small thing worth telling you because it is the reason to trust the
rest.** Our measuring tool was wrong on its first run: it modelled "a quiet
share" as "nothing arrived at all", which is a _broken feed_, not a quiet share
— and it duly reported a problem that wasn't there. We caught it, fixed it, and
wrote down the mistake, because confusing those two things is precisely the
error this whole story exists to prevent the product from making.

### Where the product stands

**Epic 3 is on its final story, one of ten tasks done.** The live market data
works: prices move, charts extend, the data's origins are stated honestly, and
the chrome already tells you when the feed has stopped.

**What is next:** making the rest of the screen as honest as the status strip
already is — starting with the price that is three hours old and does not say so.
