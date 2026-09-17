# Story 3.9 — Storing the Live Session

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.5, 3.8
**Epic scope covered:** market-data persistence for live observations, and the reconciliation between two tapes covering one session

## Description

Everything this epic has built so far is **in memory and lost on restart**, and
every chart of today starts again from the sixteen-minute edge on a cold load.
This story writes the session down.

It is also where two tapes meet in one place for the first time. The store is
backfilled nightly by a job that fetches **complete sessions** from the
consolidated tape; this epic writes the **same session** from a single venue as
it happens. So tonight's backfill arrives with a better answer for bars we
already hold — more complete, from a broader tape, and sometimes simply
different. **What happens to the IEX bar is a product decision about what a
record is**, not a database detail.

This repository has a position on that question already: _historical market-data
persistence is a record of what was observed, not a cache._ An observation
overwritten leaves no trace that it was ever made, and Epic 13's replay is built
on the premise that what was knowable at a moment can be reconstructed.

## What the user can see when this story lands

**Today, after a refresh.** Open a security at 14:30, reload, and the chart still
reaches 14:30 — from the store, not from a socket that has been running since
the page opened. Before this story a reload dropped every viewer back to the
sixteen-minute cliff.

And the same chart **out of hours**: today's completed session, drawn in full,
before the nightly backfill has run.

What the user still cannot do: rely on it across a disconnection gap, or read an
honest account of what the feed did while they were away — Story 3.10.

## Why it sits here in the sequence

**After the column exists** (Story 3.8), because writing an IEX bar into a store
that cannot say so is the defect that story was created to prevent. **After the
current-state model** (Story 3.5), because that is what has the bars. And after
the chart's live edge (3.7), because this story changes where that edge's data
comes from, and it is worth having produced the read-time stitch once honestly
before the store starts answering the same question.

## Scope

- **The write path**: minute bars from the socket into `market_bars`, with their
  tape, and the ledger updated to match. Note the constraint that shaped
  Epic 2's read path and now has to be relaxed deliberately rather than by
  accident: **`recordSeries` refuses a series whose source disagrees with the
  ledger row it would extend.** Story 3.8 decides what replaces it; this story
  writes through it.
- **What happens tonight.** The backfill fetches the same session from the
  consolidated tape. Three shapes, none chosen, and this story must take it
  explicitly rather than discover it at the first overnight run:
  1. **The SIP bar wins and the IEX bar is replaced.** Simplest, gives the best
     history, and destroys the record of what was observable live.
  2. **Both are kept**, keyed by tape, and the read path prefers one. Truthful,
     and it is the shape invariant 4 and Epic 13's replay actually want — _what
     was knowable at 11:07_ is the IEX bar, not the SIP correction that arrived
     at 21:00. It costs a uniqueness rule and a read-path decision.
  3. **The IEX bar is never stored at all** and the live session is memory-only.
     Cheapest; makes the payoff above impossible.
- **`observed_at` versus `recorded_at`, which this story is the first real test
  of.** A row carries when it was true in the market and when we wrote it, and
  `observed_at` **never has a default** — `default now()` silently turns one into
  the other on the column replay keys on. A live bar is the first row in this
  product where the two instants differ by seconds rather than by hours, which
  is exactly the case where a mistake is invisible.
- **Idempotence.** A reconnection replays bars, a restart re-subscribes, and a
  socket occasionally repeats itself; the write must tolerate all three without
  producing a second row or a loud unique-violation on a normal Tuesday.
- **Partial minutes are not stored**, or are stored and marked — a bar for the
  minute in progress is not the same object as the 389 complete ones, and
  writing one down as final is a false record rather than an early one.
- **The read path's answer to _today_.** `/market-data/bars` currently stitches
  a live tail because the store stops at yesterday's close; once the store holds
  today, the stitch's own bound changes and the metered vendor request may no
  longer be needed for most windows. `MARKET-DATA-API.md` §5 set a condition for
  keeping the stitch — check it rather than assume it still holds.
- **The caching consequence.** `ETag`s on this path were argued on _a closed
  session's bars never change_, with a qualification already recorded: the bars
  do not change and the **response** does. A session being written to as it
  happens is a third case, and a five-minute freshness lifetime over a series
  that is growing every minute is a stale chart with a valid validator.
- **`status` is not filtered on this path.** Bars stored against a security we
  have since stopped tracking are still what happened. Story 3.5 filters and this
  does not, and the asymmetry is deliberate.

## Out of scope, and who owns it

- The gap a disconnection leaves, and backfilling it on reconnect — Story 3.10
- Replay reading these rows — Epic 13, which is the reason option 2 above is
  worth its cost
- Storage sizing beyond this epic's own session — Story 3.11 measures what a
  live session adds per day

## Open decisions — settle with the user

1. **The three shapes above**, and it is a product decision rather than a
   technical one: it decides whether this product can ever answer _what was
   knowable at 11:07_ with the data that was actually knowable at 11:07, which
   is `PRODUCT_SPEC.md` §23's question and the flagship feature's whole premise.
2. **Whether a live-written session is served to everyone or only re-read by the
   writer**, which is really a question about how much this product trusts a
   single venue's bars as history.

## Acceptance criteria

1. A minute bar arriving on the socket is stored with its tape, and the ledger
   agrees with it
2. A cold load during a session serves today's bars from the store, and the
   chart reaches the same edge it reached before the reload
3. Storing the same bar twice produces one row and no error
4. A bar for the minute in progress is not recorded as a complete minute
5. The overnight reconciliation behaves as the decision above states, proved by
   running both paths over one session rather than by reasoning about them
6. `observed_at` is supplied by the writer in every path, and nothing defaults it
7. A response for a growing session is not served stale from a validator written
   for an immutable one
8. `pnpm test:database` passes; `pnpm verify` passes
9. `pnpm bars:check` still tells the truth about what is missing and why, now
   that two writers fill the same table

## What this story hands forward

A store that holds today, and the first rows in this product whose provenance
was not decided by a constant.

---

## Handed here by Task 3.1.4 — 2026-09-17

**Two decisions taken on 2026-09-17 change what is stored**
([`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) §7.11).

**Extended-hours bars are rendered and marked**, so they are also **kept**:
pre-market and after-hours bars arrive on the same channel with nothing
distinguishing them (§7.7), and a store that filtered them by market time would
be discarding real data on a boundary the feed does not assert.

**The product subscribes `updatedBars`**, and this is the sharper one for a
store: a bar written for a `(symbol, minute)` may be **superseded about thirty
seconds later** by a corrected one (§7.8). An insert-only path produces two rows
for one minute. `market_bars` has a uniqueness decision to take that Epic 2
never needed, because a backfilled historical bar is final and a live one is not
— and `observed_at` versus `recorded_at` is the pair that already exists to
express it.
