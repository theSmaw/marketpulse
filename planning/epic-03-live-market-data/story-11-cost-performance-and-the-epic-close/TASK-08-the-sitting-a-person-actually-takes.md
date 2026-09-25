# Task 3.11.8 — The sitting a person actually takes, and the ledger completed

**Status:** **Complete for its load-bearing half — 2026-09-25. A person has watched the deployed product working during a live session, and `LIVE-REHEARSAL.md` says so.** The owner watched the **2026-09-24** session on the deployed site — the securities table with live prices moving, a security page's chart extending, the status bar's feed cell, and **a reload mid-session keeping today's bars** — and nothing looked wrong. That fills the ledger's three empty rows (**3.3, 3.8, 3.9**) and corroborates the four instrumented ones. **Two things are owed and named rather than claimed**: the 390 question from a **real phone**, and the items that need a look coinciding with an **event**. The instrument for those is written and rehearsed against the shut market.
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1 — **and 3.11.4 is taken WITH this task rather than before it** (corrected 2026-09-25; see the amendment at the foot)

## Objective

Criteria 2 and 9 — **the half of this epic no instrument can take**, and the one
the exit criterion is worded around.

## What the user can see when this lands

**The product, working, watched by a human being.** Which is the only thing in
this epic that has never happened.

## The fact this task exists to change

`LIVE-REHEARSAL.md` has dated rows for **six of eleven stories** — 3.4, 3.5,
3.6, 3.8, 3.9 and 3.10 — and **not one of them was watched by a person.** Every
row was taken by a headless browser on the user's machine or by a Node client,
which each row states on its face and note 1 states in general.

**The epic's exit criterion says _watched_.** Task 3.11.1's decision 4 settles
whether that is already met; this task does whatever it decided.

> **A missing row is closed by taking the rehearsal, never by deleting the
> row** — and `pnpm invariants` asserts that every story `EPIC.md` marks
> complete has one, so this is checked rather than remembered.

## What the combined list still holds

Carried in `LIVE-REHEARSAL.md` and Task 3.4.10's addenda, pooled because **the
scarce thing is the plan's one Alpaca connection rather than anybody's
attention** (`docs/GAPS.md` entry 10):

- **`pnpm probe` at four viewports with the market open** — never taken; `probe`
  runs against a local pair and the deployed page has only been photographed at
  1440
- **the two-feed source note from a deployed store**, which **expires
  overnight**: after the nightly backfill the same window names one source
- **the extended-hours qualifier RENDERED** — the socket has seen a pre-market
  bar (`MU`, 08:01 EDT); no page look has ever coincided with one
- **a quiet minute WATCHED** — `ERIE` was heard in 19 of 411 minutes; again no
  look coincided
- **a tab surviving a deploy on `/securities/NVDA` during a session** — Story
  3.6's close repaired the blank-page defect on this story's behalf and
  **nobody has watched the repair work in the wild**
- **the 390 question**, added by Task 3.10.9: three pairs of degraded states are
  told apart by **one surface only**, usually the status bar, which at 390 is
  **below the fold**. Open the deployed site on a real phone during a session,
  kill the feed, and time how long it takes to notice

## The instrument note, which is why two of those are still owed

The 2026-09-24 watch photographed **every twenty minutes**. Both surviving items
need a look at a **chosen moment**, so the next instrument photographs on an
**event** — the first extended-hours bar for a watched symbol, the first minute
one falls silent — rather than on a timer. **That is a change to the
instrument, not to the list.**

## The constraint

One sitting, the market open, and it is shared with Task 3.11.4's performance
pass. **Take them together.** A sitting taken for one and not the other spends
the scarce thing twice.

## Work

- The sitting, with a person present, at three viewports — one of them a real
  phone
- Every row in `LIVE-REHEARSAL.md` filled, with its `What was wrong` column
  filled **honestly**
- The remaining combined-list items taken, or each recorded with why not
- The exit criterion's `watched` verdict written down as the owner's, not
  assumed
- `pnpm invariants`' ledger check run, and its verdict recorded

## Done when

1. Every story `EPIC.md` marks complete has a dated row
2. A person has watched the deployed product during a live session, and the
   ledger says so rather than implying it
3. The 390 question has an answer from a real phone

## Amended by Task 3.11.1 — 2026-09-25: decision 4 is settled, and it is NOT MET

**This task's dependency on decision 4 is resolved: the exit criterion's word
is `watched` and instrumented rows do not satisfy it.**

> _A headless browser did not notice_ is not _a person did not notice_, and
> amending the criterion's word to `observed` was explicitly rejected. So was
> half-met-with-a-named-owner, which is the shape this repository uses for the
> screen-reader pass and is right when a thing is genuinely unbookable. **This
> one is bookable**: it is one sitting, already shared with Task 3.11.4.

**So this task is load-bearing for two stories rather than one.** Story 3.4's
criterion 8 has been sitting on the same ambiguity since 2026-09-22 and is now
blocked on **this sitting** by name rather than on a judgement — which is
recorded in that story's own file.

**What that adds to the list here**: `pnpm probe` at four viewports **with the
market open**, which is Story 3.4's criterion 8 in its own words and has never
been taken.

## Amended by Task 3.11.4 — 2026-09-25: the dependency was circular, and this sitting carries five more figures

**This task declared `Depends on: 3.11.1, 3.11.4`, and 3.11.4 cannot finish
without this sitting.** Five of its nine figures need **frames** — which means
the socket, which means the market open — so the two tasks were each waiting on
the other. The dependency is corrected to **3.11.1 alone**, and the split's own
instruction is the real relationship: _take them together._

**That is a correction to the plan rather than to either task.** Nothing about
3.11.4 has to precede this; what it took on 2026-09-25 it took **because** the
market was shut, which is the opposite of a prerequisite.

### The five figures that arrive with this sitting

They are 3.11.4's to record and this sitting's to make possible:

| Figure                                          | Note                                                                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §28's p95, gateway send → table repainted       | a **distribution** with its n, never a single number; a negative p50 is **skew**, not a frame arriving before it was sent                                                         |
| the burst cost at live density                  | and the real feed never changes every row — §7.6 puts a median symbol at 65.1% of minutes                                                                                         |
| the tick at 518 rows, and at 517 instants drawn | should be **lower** than the fixture's 37–40 ms, because the memo boundary skips rows the feed did not touch; if it is not, something is re-rendering rows the feed never touched |
| the frame payload, with `sentAt`'s 36 bytes     | **there is no single number to quote today** — eleven places say `56.9 KiB` and Task 3.5.8 deliberately left them                                                                 |
| the transition's own cost                       | the one figure in this epic that has never been taken at all                                                                                                                      |

**And the fan-out**, which is Task 3.11.5's bill and can only be measured here:
38 kB/min per browser at the whole universe, and whether concurrent browsers
change it.

### The recipe, so nothing is rediscovered at the one moment it cannot be

From Task 3.6.4's record: wrap `window.WebSocket` from an `addInitScript`
**without** `routeWebSocket`, stamp `Date.now()` in the `message` listener,
subtract the frame's `sentAt`, and stamp the table's first mutation through a
`MutationObserver`. **Two pages double n at no cost in wall time.**

And from Task 3.9.9, the one that cost a task: a `long-animation-frame` entry
only exists above 50 ms, so **zero observed and the observer is broken are the
same output** — block inside a `requestAnimationFrame` with a mutation after it
and confirm the observer complains **before** believing any silence.

> **One instrument for everything**, which Task 3.11.2 showed is about fifteen
> lines of plain Playwright pointed at the deployed URL — no `e2e:deployed`, no
> config, no credential. The sitting is bounded by the market's hours, not by
> effort, so the script should exist and be tested against the shut market
> **before** the bell.

## Amended by Task 3.11.6 — 2026-09-25: one item on the list stops being open-ended and becomes a stopwatch

**_A tab surviving a deploy on `/securities/NVDA` during a session_ has a
predicted shape for the first time.** Task 3.11.6 measured what a deploy does to
the feed: the arriving replica is refused for **45.8 s and 46.5 s** on two
consecutive rollouts, so a person watching during a deploy should see, in order:

1. the chart stop extending, and the status bar reach `stale` then
   `disconnected` on its own clocks — **not immediately**, because those
   thresholds are 60 s wall and 165 s monotonic, so a 46-second outage may
   produce **no degraded word at all**
2. bars resuming about **46 seconds** after they stopped
3. **the gap filled rather than jumped** — Task 3.10.7's refill, which is the
   thing to actually watch, because a 46 s hole is 0–1 bars and therefore the
   smallest, least visible case the refill has

> **Point 1 is the finding worth taking to the sitting.** A deploy's outage is
> **shorter than either liveness threshold**, so the honest expectation is that
> nothing on screen says anything — and whether that reads as _correct
> restraint_ or as _the product not noticing_ is a judgement only a person
> watching can make. Story 3.10 decided the thresholds with measurements; this
> is the first time anybody can watch one **not** fire against a real event.

**Time it.** The one number this item owes is how long the tab was without
prices, against the 46 s the log says — a browser's experience of the same
event, from the other side of the gateway.

---

## What was done — 2026-09-25

### The criterion is met, and it was met by a person rather than by this task

**The epic's exit criterion says `watched`.** Task 3.11.1 settled that an
instrumented row does not satisfy it, which is why this task existed at all.

**The owner watched the deployed site during the 2026-09-24 session** — the
evening of the 24th in Asia/Singapore — and reported it the following morning:
the securities table with live prices moving, a security page's chart
extending, the status bar's feed cell, and a **reload mid-session keeping
today's bars**. Asked the question the ledger is built around — _did anything
look wrong, however small_ — the answer was **nothing noticed**.

**Three empty rows are now filled**: `3.3`, `3.8` and `3.9`. `pnpm invariants`'
`the-epic-close-cannot-outrun-the-rehearsal-ledger` is green with them.

> **What those rows claim and what they do not, because the distinction is this
> file's whole value.** They carry no times, no prices and no counts — the
> owner was watching rather than recording, and a row written with figures
> nobody wrote down is a row about an inference. **A person not noticing is a
> stronger claim than an instrument not noticing**, which is exactly why the
> criterion says `watched`; it is still a look rather than an audit. Note 5
> beneath the ledger states both halves.

**And it corroborates the four instrumented rows**, which is the one thing
nobody had. The table, the chart, the chrome and the reload were all seen
working by somebody who would have said so if they were not.

### 3.8's owed item was taken without anybody planning it

The ledger has said since 2026-09-24 that Story 3.8's row needs **a reload
during a session keeping today's chart** on the deployed site. **That is one of
the four things the owner did.** The store answered the reload rather than a
socket that had been running since the page opened — the first thing in this
epic a reader meets by reloading, watched working in the wild.

### The instrument, written and rehearsed BEFORE the bell

`scripts/session-sitting.mjs`. Its predecessor was deleted after its night, so
this is written rather than recovered, and it differs in the three ways the
2026-09-24 watch could not cover:

- **It photographs on an EVENT, never on a timer.** The old watch shot every
  twenty minutes; both surviving items need a look at a **chosen moment**. This
  shoots on the first extended-hours bar, the first correction, the first
  four-minute silence for a watched symbol, and any change in the feed word.
- **Three viewports, and at 390 it takes BOTH shots.** Task 3.10.9's question
  is what a reader sees **without scrolling**, and a `fullPage` screenshot
  answers the opposite question. Caught while rehearsing, not after.
- **It carries Task 3.11.4's five figures**, because they need frames: `sentAt`
  → table repainted as a **distribution with its n**, the payload in bytes, the
  burst's main-thread cost, and the fan-out per browser.

**Rehearsed against the shut market**, which was the instruction and earned its
keep three times:

| What the rehearsal found                               | Why it matters                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| The `@marketpulse/shared` import does not resolve      | The predecessor's own import shape; the package is not linked at the root     |
| Two lint rules fired on the `Intl` formatter           | The market's timezone is spelled in **one** module, and the rule enforced it  |
| The self-test's own 120 ms block was being **counted** | It would have put a figure the instrument CAUSED into §28's acceptance number |
| A `fullPage` shot at 390 answers the wrong question    | The 390 finding is about the fold                                             |

**And the photography path was fired deliberately** (`--shot-now`) rather than
left to be exercised for the first time at the one moment nobody can retry it.
Three widths, three files, and the 390 pair.

### One pre-bell observation, which narrows the 390 question rather than answering it

**At 390 × 780 on the deployed site, the status bar is on screen.** It is
sticky at the foot of the viewport and reads `MARKET FEED ● IEX ●` / the
one-venue sentence / `LIVE` / `BACKEND SERVICE ● HEALTHY`, taking about four
wrapped lines of the viewport's height.

**So _below the fold_ is not the right description of the shipped page**, and
Task 3.10.9's finding needs re-wording rather than re-deciding. The real
question is unchanged and is about **noticing**: the cell is present, small,
at the very bottom edge, and it is the **only** surface that tells three pairs
of degraded states apart. **Whether a person looking at a chart notices it
change is not answerable from a screenshot**, which is why the item is owed to
a real phone rather than to a viewport.

### What is owed, each with an owner and a condition

1. **The 390 question from a real phone.** Open the deployed site on a phone
   during a session, kill the feed, and time how long it takes to notice.
   Owner: the owner. Condition: the next session they have a phone to hand —
   it is minutes, not an evening.
2. **The event-coincident items** — the extended-hours qualifier rendered, a
   quiet minute watched, a correction seen on the surface, and the two-feed
   source note from a deployed store (which **expires at that night's
   backfill**). The instrument now shoots on exactly these. Condition: the next
   session anybody runs it.
3. **`pnpm probe` at four viewports with the market open** — Story 3.4's
   criterion 8 in its own words. Deliberately **not** reimplemented inside the
   instrument: `probe` is a documented tool with its own output shape, and
   reimplementing it is how a measurement ends up in a format nobody can
   compare to the one before it.
4. **Task 3.11.4's five figures.** They ride with the instrument and need the
   market open.

> **None of these blocks the exit criterion's `watched` half**, which is the
> thing this task existed to settle and is now settled. They are the
> combined list's remainder, and the honest place for them is Task 3.11.11's
> _what ships open_ with a condition each.

### Gates

Documents and one throwaway instrument. `pnpm links` green (433 documents,
1,570 links). `pnpm invariants` green at 27, **including the ledger check that
this task's rows were the subject of**. `eslint` clean on the new script.

## For a stakeholder — a status report, 2026-09-25

### The one thing in this phase that had never happened

Everything in this phase has been verified by machines. Every row in our
rehearsal ledger — the record of somebody watching the real product against the
real market — was filled by an automated browser, and each row says so on its
face.

**The phase's completion criterion uses the word _watched_**, and we decided
earlier this week that a machine watching does not satisfy it. Not because the
machine is unreliable, but because a machine only reports what it was told to
look for. A person notices the thing nobody thought to check.

**That happened this week.** The owner watched the deployed product during a
real trading session: the market table with live prices moving, a chart
extending minute by minute, the feed indicator, and a page reloaded mid-session
that still showed the whole day. Nothing looked wrong.

**Three empty rows in the ledger are now filled, and the four filled by machines
are corroborated** — which is the thing we did not have. The machines said it
worked; now somebody has seen it work.

### What that reload proves, which is easy to miss

Reloading a page mid-session and still seeing the whole day's chart means the
product **wrote the session down** as it happened. The prices were not held in
the browser's memory; they were saved, and read back. That is a capability we
built two weeks ago and had never watched anybody use.

### The rest, and why it is small

Three items still need a look that coincides with a **moment** — the first
price outside normal trading hours, the first minute a security goes quiet, the
two-feed label that disappears overnight. A person cannot sit and wait for
those.

So the instrument for the next session photographs **on the event** rather than
on a clock, at three screen sizes, and it was **rehearsed against a closed
market** so the first photograph it ever takes is not taken at the one moment
it cannot be retried. That rehearsal found four faults in the instrument before
the session rather than during it.

**One genuine finding came out of it early.** On a phone-width screen, the
status indicator — the only place that says whether the feed has stopped — is
visible at the bottom of the screen rather than hidden, which is better than we
had written down. Whether somebody looking at a chart actually **notices** it
change is a different question, and that one needs a real phone.

### Where the product stands

**Eight of eleven tasks in the final story**, and the hardest one — the half no
instrument can take — is done. What remains is the documents and the close.
