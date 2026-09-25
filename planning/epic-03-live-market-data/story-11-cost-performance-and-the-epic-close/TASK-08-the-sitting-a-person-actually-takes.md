# Task 3.11.8 — The sitting a person actually takes, and the ledger completed

**Status:** Not started
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1, 3.11.4

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
