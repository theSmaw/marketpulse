# Story 2.7 — Historical Bar Ingestion, Storage & Backfill

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Stories 2.2, 2.3, 2.4, 2.6
**Epic scope covered:** Historical market-data persistence — **a record of what was observed, not a cache** (settled 2026-09-05, see open decision 1)

## Description

Store the bars. ~~Decide what the store is for — a cache in front of Alpaca, or the
system's record of what was observed~~ — **settled with the user on 2026-09-05: this is the
system's RECORD OF WHAT WAS OBSERVED, and not a cache.** §24 already leaned on it: raw
observations should be append-only timestamped events, and that is what makes replay,
reproducibility and auditability tractable in Epic 13. The full argument and everything it
decides downstream is in open decision 1 below, which is now an answer rather than a
question.

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
- **Corporate actions, and this is where "record not cache" stops being philosophy.** A
  stored _adjusted_ series is retroactively wrong after a split unless something re-fetches
  it — which is a cache's answer, and a cache is what this store is not. **So bars are
  stored as observed and UNADJUSTED, and adjustment is applied on read** against Story 2.5's
  adjustment decision. That is the one concrete thing decision 1 buys, it is the thing most
  likely to be decided by accident in whichever task writes the first `insert`, and it is
  cheap now and a full re-backfill later
- **Retention: nothing is deleted, and the trigger is disk pressure rather than age.** A
  record may not be evicted, which is decision 1 applied; what makes that safe rather than
  reckless is the arithmetic above plus Story 2.1's measured **~22.5 GiB usable** and
  `psql-storage-80pct` alert. State the headroom in years at the chosen timeframe and
  universe size, and note that `UNIVERSE.md` §10 parks a universe re-sizing whose deadline
  is **this story** — because re-sizing is one file edit until bars exist and a re-backfill
  afterwards

## Out of scope, and who owns it

- Serving the data — Story 2.8
- Live bars arriving continuously — Epic 3, which writes into this table
- Anomaly baselines computed from this data — Epic 5
- Filings, anomalies, investigations — later epics

## Open decisions — settle with the user

1. ~~**Cache or record.**~~ **SETTLED 2026-09-05 — a RECORD of what was observed.** Raised
   by the user as "why do we have a database if we are pulling all our information from
   another remote source?", which is the right question and was live until now. Four things
   decide it, and none of them is that a database is normal:

   - **§36 requires it, in so many words.** Its own worked failure state is _"Live feed
     disconnected — displaying data through 10:42:17."_ That sentence is only writable if
     the data through 10:42:17 was stored. A pass-through's answer to a vendor outage is an
     error screen, which is exactly the "collapsing into one global error screen" §36
     forbids. **Degrading incrementally requires something local to degrade to.**
   - **Replay is not "show me old prices".** §24 wants append-only events including
     `AnomalyDetected`, `InvestigationCreated`, `AgentToolCalled` and
     `WorkspaceCommandApplied` — replay reconstructs what the system **knew and did**, and
     half of that has no vendor to re-fetch it from. §22 then requires temporal isolation be
     enforced at the data layer so leakage is structurally impossible, which is a
     query-layer guarantee (`DATA-LAYER.md`'s Kysely plugin); an HTTP request has no AST to
     rewrite.
   - **§11's detection needs a rolling distribution per security** — ~60 days of 5-minute
     returns, and volume against the median _for that time of day_. Held in memory that is
     a cold re-fetch on every deploy, at `minReplicas: 1`, on every merge; held properly it
     is a database by another name, written worse.
   - **Invariant 5 needs the raw data to still exist.** Evidence carries a "raw-data
     reference", and a reference into a discarded HTTP response points at nothing.

   Underneath all four: Postgres reads are free and unlimited, Alpaca's are **200/min**, and
   pass-through puts vendor latency inside §28's <500 ms interaction budget for every one of
   §17's eighteen agent tools.

   **What the decision actually changes, which is the reason to take it here rather than let
   it be inferred:** bars are stored **unadjusted** and adjusted on read (see scope);
   nothing is evicted; **"we do not have that" is an ANSWER rather than a bug**, which is
   what criterion 4 is really asserting; and the write path never `UPDATE`s a bar in the
   ordinary case.

   **The honest limit, stated rather than discovered.** A pure record would keep every
   version of a corrected bar, which is what `observed_at` / `recorded_at` were built for —
   `migrations/README.md` §4 defines the pair and Task 2.2.4 names **this table** as the
   first to exercise it. V1 deliberately does **not** do that: a second row per bar means a
   version predicate on every read, and that is a **second invisible predicate** on top of
   `securities.status`, which `migrations/README.md` §5 warns is "a bug waiting for whoever
   forgets". So V1 stores one row per bar, a correction overwrites it, `recorded_at` moves,
   and **Epic 13 replays a bar as currently known rather than as known at the time** — a
   real gap in the replay guarantee, recorded here rather than papered over. **The reversal
   trigger is the first observed correction**, not a story number; nobody has seen one yet,
   and building for it now is a mechanism against no instance.

   **Where pass-through IS right, and we already do it:** §7.2 asks V1 to detect that a
   filing occurred and let the user inspect it, so filing **metadata** is stored and the
   **document** is fetched on demand. Nobody is mirroring EDGAR. The line is whether the
   product must be able to answer without the vendor.

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

---

## Amended 2026-09-05 — open decision 1 settled

**"Why do we have a database if we are pulling all our information from another remote
source?"** — asked by the user, answered as **a record of what was observed, not a cache**,
with the argument in open decision 1.

The reframing that did most of the work is worth keeping: **§30 lists ten tables and only
`market_bars` comes from Alpaca.** One more (`filings`) comes from the SEC; the other eight
have no external source at all, because an Investigation, its steps, its findings, its
evidence and the workspace commands that produced them are things this system does rather
than things it fetches. **The database exists regardless of how bars are handled**, so the
question was never "database or no database" — it was whether that one table joins it.

Three downstream items moved from open to decided as a consequence: bars are stored
**unadjusted**, retention is **nothing is deleted** with disk pressure as the trigger, and
"we do not have that" is an **answer**. One new gap is recorded with a trigger rather than
built: V1 overwrites a corrected bar, so replay reproduces a bar as currently known rather
than as known at the time.
