# Task 3.11.8 — The sitting a person actually takes, and the ledger completed

**Status:** Not started
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
