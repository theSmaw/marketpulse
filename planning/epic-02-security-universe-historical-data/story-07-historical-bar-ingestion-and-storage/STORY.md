# Story 2.7 — Historical Bar Ingestion, Storage & Backfill

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Stories 2.2, 2.3, 2.4, 2.6
**Epic scope covered:** Historical market-data persistence/cache

## Description

Store the bars. Decide what the store is for — a cache in front of Alpaca, or the system's
record of what was observed — because §24 already leans on the second: raw observations
should be append-only timestamped events, and that is what makes replay, reproducibility
and auditability tractable in Epic 13.

This is the largest engineering story in the epic and the one with the most arithmetic in
it.

## Why it sits here in the sequence

It needs the schema mechanism (2.2), the symbol list (2.3), session boundaries to know
which bars should exist (2.4), and the provider's measured limits (2.6). It must precede
the read API, because what the API can serve is a property of what is stored.

## Scope

- The `market_bars` table: its key, its indexes, and its unique constraint. The key
  decision is what makes a bar the same bar — symbol, timeframe and timestamp — because
  that is what makes re-running a backfill idempotent instead of duplicating a year
- **The sizing arithmetic, done before the table is created.** Roughly: ~100 securities ×
  390 minute-bars per session × ~252 sessions is ~10M rows per year of minute data, against
  the free offer's 32 GB of storage — comfortable, but only if the row is narrow and the
  indexes are chosen rather than accumulated. Daily bars are ~25k rows a year and are
  effectively free. Do this arithmetic with real row sizes measured after loading a sample,
  not estimated
- The backfill: a command, its progress reporting, its resumability, and its behaviour when
  interrupted halfway. It will run for a while, and a backfill that cannot be resumed is a
  backfill that gets run from scratch repeatedly
- Incremental catch-up: fetching only what is missing, which requires knowing what is
  missing — see gap handling below
- **Gap handling, which is where correctness lives.** A missing bar has at least three
  causes that look identical in the database: the market was closed, the security did not
  trade in that minute (common on IEX, which is one venue rather than the consolidated
  tape), or the fetch failed. Story 2.4's calendar distinguishes the first; the other two
  need to be distinguishable too, or Epic 5's volume baseline silently treats an outage as
  zero volume
- Recording what has been ingested, per symbol and timeframe, so the system can answer
  "what do I have" without scanning the bar table
- Corporate actions: what happens to stored history when a split occurs, given Story 2.5's
  adjustment decision. A stored adjusted series is retroactively wrong after a split unless
  something re-fetches it
- Retention: whether anything is ever deleted, and against what trigger

## Out of scope, and who owns it

- Serving the data — Story 2.8
- Live bars arriving continuously — Epic 3, which writes into this table
- Anomaly baselines computed from this data — Epic 5
- Filings, anomalies, investigations — later epics

## Open decisions — settle with the user

1. **Cache or record.** A cache may be evicted and refetched; a record may not. §24 argues
   for a record for observed market data. The decision changes retention, gap semantics and
   whether "we do not have that" is a bug or an answer
2. **TimescaleDB.** §30 offers it optionally and §37 says do not add a second data
   technology without a measurement. This is the story with the measurement in it. Note the
   Azure-specific question that must be answered first: whether the extension is available
   and enabled on the chosen tier — verify against the server rather than the documentation
3. **Which timeframes are stored**, following Story 2.6's decision, and whether daily bars
   are stored or derived from minute bars on read. Deriving is one source of truth and more
   work per read; storing both is faster and can disagree with itself
4. **Where the backfill runs.** A local command against the deployed database, a one-off
   container job, or a step somewhere in the pipeline. Running it locally is simplest and
   means the deployed system's data has a provenance of "somebody's laptop"

## Acceptance criteria

1. A full backfill of the tracked universe completes, and its runtime, row count and
   on-disk size are recorded as measurements
2. Re-running it changes nothing — proved by row counts and checksums, not by inspection
3. An interrupted backfill resumes without duplicating or skipping
4. A market holiday, a half day and a genuinely untraded minute are each distinguishable
   from a failed fetch
5. The system can state what it holds per symbol and timeframe, and that statement is
   correct after a partial failure
6. Query performance for the access patterns Story 2.8 needs is measured against the real
   row count, not a sample
7. Storage consumption is checked against the 32 GB offer, with the headroom stated
8. `pnpm verify` passes; database-backed tests run under their own command

## What this story hands forward

The data the rest of the epic renders, and the write path Epic 3 extends with live bars.
