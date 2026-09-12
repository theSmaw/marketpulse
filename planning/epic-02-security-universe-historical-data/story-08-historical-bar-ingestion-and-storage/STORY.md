# Story 2.8 — Historical Bar Ingestion, Storage & Backfill

**Status:** Complete (2026-09-09)
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Stories 2.2, 2.3, 2.5, 2.7
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

## What the user can see when this story lands

**Nothing on screen, and this is the largest story in the epic — which makes saying so
important.** It builds `market_bars`, the backfill, and the record of what was observed.

What it unblocks is the entire second half of the epic. **The payoff is visible in Story
2.12**, and it is worth being concrete about the size of it: after this story the database
holds roughly ten million rows of real market history, and every chart, anomaly score,
sector comparison and replay in the product reads them.

**A demonstrable milestone that is not a UI change**, and worth showing anyway: after the
backfill, `/securities` — which Story 2.4 put on screen — can honestly say how much history
each security has. Whether that lands here or in Story 2.14 is a scoping call, but it is the
cheapest way to make this story's work visible to somebody who is not reading a database.

## Why it sits here in the sequence

It needs the schema mechanism (2.2), the symbol list (2.3), session boundaries to know
which bars should exist (2.5), and the provider's measured limits (2.7). It must precede
the read API, because what the API can serve is a property of what is stored.

## What Story 2.5 hands this story (added 2026-09-06 by Task 2.5.6)

Story 2.5 is complete, so "session boundaries to know which bars should exist" is a function
call now rather than a thing to work out. Four things bind this story and the fourth is the
one most likely to be rediscovered the hard way.

- **`marketSessionOn(date)` from `@marketpulse/shared` returns the session's bounds and its
  `minuteBars`, and the count is DERIVED from the bounds** — **390** for a regular session,
  **210** for a half day. Do not re-derive it, and do not store it beside the bounds: the
  whole reason it is derived is that two copies can disagree.
- **The `~252 sessions` in the sizing bullet below is an approximation and is fine as one, but
  it is not a constant.** The real per-year figures are **2024: 252, 2025: 250, 2026: 251,
  2027: 251, 2028: 251** — the count follows how many weekdays a year contains and how many
  closures land on one. 2025 is 250 because of an **unscheduled** full closure
  (`2025-01-09`, the National Day of Mourning). If any assertion in this story pins a session
  count, pin the per-year table, not 252.
- **A half day has 210 bars and this is the gap-handling case most likely to be missed.**
  Eleven days across the covered range close at 13:00 ET. An ingestion check that expects 390
  bars a session reports 180 phantom gaps on each of them, and Epic 5's volume baseline then
  treats a normal early close as a data outage. `marketSessionOn` already knows; ask it.
- **Walking off the calendar's 2024–2028 range REFUSES rather than truncating.** A backfill
  that walks sessions backwards from today will hit the lower bound the moment it asks for
  more history than the table covers, and it will get a `MarketCalendarRangeError` naming the
  range and the file — not a short list. That is deliberate (ADR 0017, decision 9): a short
  list of sessions is a wrong answer shaped like a right one. **Decide what the backfill's
  earliest date is before you write the walk**, and note the calendar's range is a real
  constraint on how far back this story can ingest.

One thing this story owns that Story 2.5 deliberately did not:
`CREATE INDEX CONCURRENTLY` under the migration runner, which `DATA-LAYER.md` names as
needing a second `Migrator` over a separate directory. That is unrelated to the calendar and
is listed here only so it is not forgotten alongside it.

## Scope

- The `market_bars` table: its key, its indexes, and its unique constraint. The key
  decision is what makes a bar the same bar — symbol, timeframe and timestamp — because
  that is what makes re-running a backfill idempotent instead of duplicating a year
- **The sizing arithmetic, done before the table is created.** Roughly (at the ~100 securities this was written against; it is 518 since Task 2.8.2, so multiply by ~5 and see `BARS.md` §4): ~100 securities ×
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
  tape), or the fetch failed. Story 2.5's calendar distinguishes the first; the other two
  need to be distinguishable too, or Epic 5's volume baseline silently treats an outage as
  zero volume
- Recording what has been ingested, per symbol and timeframe, so the system can answer
  "what do I have" without scanning the bar table
- **Corporate actions, and this is where "record not cache" stops being philosophy.** A
  stored _adjusted_ series is retroactively wrong after a split unless something re-fetches
  it — which is a cache's answer, and a cache is what this store is not. **So bars are
  stored as observed and UNADJUSTED**, against Story 2.6's adjustment decision — ~~and
  adjustment is applied on read~~. **Amended 2026-09-07 by Task 2.6.1: the storage half is
  confirmed with a stronger argument than it had, and the "applied on read" half is not
  achievable as written.** Adjusting on read needs corporate-action data that nothing in the
  plan acquires — not the bars endpoint, not the universe loader, not Story 2.7's scope. What
  replaces it is cheaper: **the vendor performs the adjustment**, so an adjusted series is
  _requested from a provider_ rather than computed here, and V1's read path serves raw and
  **says so** in the series' provenance record. `PROVIDER.md` §3 carries the argument and §3.6
  names the one gap this leaves — a split inside the stored window charts with a real step in
  it, beside a label reading `raw` — with its trigger and two repairs, neither built now. That is the one concrete thing decision 1 buys, it is the thing most
  likely to be decided by accident in whichever task writes the first `insert`, and it is
  cheap now and a full re-backfill later
- **Retention: nothing is deleted, and the trigger is disk pressure rather than age.** A
  record may not be evicted, which is decision 1 applied; what makes that safe rather than
  reckless is the arithmetic above plus Story 2.1's measured **~22.5 GiB usable** and
  `psql-storage-80pct` alert. State the headroom in years at the chosen timeframe and
  universe size, and note that `UNIVERSE.md` §10 parks a universe re-sizing whose deadline
  is **this story** — because re-sizing is one file edit until bars exist and a re-backfill
  afterwards
- **Which symbols get backfilled: `status = 'active'`, and that is a decision rather than an
  obvious default** (added 2026-09-06). Task 2.3.6 made `status` this schema's one invisible
  predicate and `UNIVERSE.md` §12.2 names its seven readers; this is one of the four that
  **filter**, on the same argument as Story 2.7's — a metered API is not spent on a security
  nobody tracks. The half to get right is the other side of the same table: **Story 2.9's
  read path and Epic 13's replay must NOT filter**, because bars stored for a security we
  have since stopped tracking are still what happened, and a replay that filtered on today's
  `status` would silently rewrite history. That asymmetry — write path filters, read path
  does not — is the whole of the cost of not having a `deleted_at` column
- **The universe re-curation, which is two edits to one file and should be one pass**
  (added 2026-09-06). The parked sizing above is one of them. The other is the **industry
  taxonomy**, which Story 2.3 closed with flagged as _not_ parked and actionable now with no
  new data: 45 industries across 86 equities, **51% of them singletons**, which makes
  "industry" a field that groups almost nothing. It needed no owner while nothing read it
  and it needs one now, because re-curating after a backfill costs a re-backfill where
  re-curating before it costs a file edit. It is a product judgement about the list rather
  than an engineering task, so it is stated here and settled with the user — see open
  decision 5

## Out of scope, and who owns it

- Serving the data — Story 2.9
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

2. ~~**TimescaleDB.**~~ **SETTLED 2026-09-08 by Task 2.8.1 — declined now, with a measured
   trigger.** The Azure-specific question was answered first and against the servers rather
   than the documentation: the extension **is** available deployed (2.24.0, not installed,
   `azure.extensions` empty) and is **absent entirely from the local `postgres:18` image**, so
   adopting it changes the local image, a server parameter, and a server restart. The trigger
   is Task 2.8.8's `EXPLAIN` against the real row count. See [`BARS.md`](BARS.md) §1
3. ~~**Which timeframes are stored**~~ **SETTLED — both `1Min` and `1Day`, stored and never
   derived** (Story 2.7 upstream; `PROVIDER.md` §9.4 forbids deriving one from the other
   because replay must reconstruct from what was stored). **The depth half was NOT settled
   upstream and is now**: minute for 1 year, and **daily capped at 2024-01-01** rather than the
   ~2016 the amendment below assumes — because the calendar covers 2024–2028 and **refuses**
   outside it, measured, with no request made. Nothing in V1's scope reads 2016. See
   [`BARS.md`](BARS.md) §2
4. ~~**Where the backfill runs.**~~ **SETTLED 2026-09-08 — a local command against the deployed
   database for the initial backfill; the incremental catch-up's home is decided separately
   when it exists**, because a one-off of hours and a repeated job of minutes are different
   shapes and deciding them together is how the one-off ends up in the pipeline. The cost is
   accepted explicitly: the deployed store's provenance is a laptop, and a **third principal**
   — the Entra administrator — writes the rows. See [`BARS.md`](BARS.md) §3
5. **The universe, re-curated once before the first backfill** (added 2026-09-06, from
   Story 2.3's close). Two questions, and they are one editing session on
   `apps/backend/src/universe.ts`:

   > **SETTLED 2026-09-08 by Task 2.8.2: the universe is the S&P 500 plus the fifteen
   > proxies — 518 securities — and `industry` is the GICS industry group (25 labels).
   > `UNIVERSE.md` §16 is the record. The two questions below turned out to be ONE: defining
   > the universe as the index dissolves §5's objection to deriving classification from it,
   > because coverage becomes 100% by construction. Everything after this point in the story
   > that quotes 101, 86 equities, 45 industries, ~1,004 requests or ~1.2 GB is 101's figure;
   > the amendments in Tasks 2.8.3 and 2.8.5–2.8.9 carry the re-taken ones.**
   - **The size.** `UNIVERSE.md` §10 parks 101 as provisional on Story 2.7's measurement of
     Alpaca's channel cap, with **this story** as the deadline. Both branches are written
     out there.
   - **The industry taxonomy**, which is _not_ parked and needs no new data: 45 industries
     across 86 equities with **51% singletons**, so the field groups almost nothing today.
     The options are to coarsen it to a taxonomy where a group has members, to keep it as a
     descriptive label and accept that nothing groups by it, or to drop it. Note which
     epics would be affected: Epics 4, 5 and 6 group by **sector**, which is sound at 11
     members and 6–12 per group, so this is about a second axis rather than about anything
     currently load-bearing.

   Doing both in one pass is the point: after this story there are bars behind
   `security_id`, and a change to the list costs a re-backfill rather than a file edit.

## Acceptance criteria

1. A full backfill of the tracked universe completes, and its runtime, row count and
   on-disk size are recorded as measurements
2. Re-running it changes nothing — proved by row counts and checksums, not by inspection
3. An interrupted backfill resumes without duplicating or skipping
4. A market holiday, a half day and a genuinely untraded minute are each distinguishable
   from a failed fetch
5. The system can state what it holds per symbol and timeframe, and that statement is
   correct after a partial failure
6. Query performance for the access patterns Story 2.9 needs is measured against the real
   row count, not a sample
7. Storage consumption is checked against the 32 GB offer, with the headroom stated
8. The universe re-curation of open decision 5 has been settled and applied **before** the
   full backfill runs, or explicitly declined with the reason recorded in `UNIVERSE.md`
9. `pnpm verify` passes; database-backed tests run under their own command

## Tasks

Tackled in order. The story is complete when all ten are done.

**2.8.1 decides and ships nothing**, which is the shape Tasks 2.1.1, 2.2.1, 2.3.1, 2.5.1, 2.6.1
and 2.7.1 set — and it carries more weight here than in any of them, because two of its
decisions cannot be repaired from outside later: a storage engine and a request's window shape
are both baked into ten million stored rows.

**2.8.2 re-curates the universe, and it is deliberately second rather than fifth.** Open decision
5 has to be settled before anything is filed against `security_id`, because after that a change
to the list costs a re-backfill rather than a file edit. It is also **the only visible change in
the story before 2.8.9**, since `/securities` renders the curated file — which is worth having
early in a nine-task story that is otherwise invisible.

**2.8.3 and 2.8.4 build the store, split because they fail differently.** A wrong key on
`market_bars` is a migration and a re-backfill; a ledger that disagrees with the bars is a system
that silently re-fetches history it holds, or silently skips history it does not. The second is
the one nothing downstream can detect, which is why the ledger is a task rather than a table.

**2.8.5 was inserted on 2026-09-08, after Task 2.8.1, and it is the clearest case in this story
for splitting by failure mode.** The batch fetch was a bullet inside the backfill until a probe
measured that Alpaca's `limit` is a **total row budget across all symbols**: symbols are filled
alphabetically, one straddles page boundaries, and **a symbol can be absent from a page entirely
while having a full session of data**. So a batch that concludes from page 1 reports a symbol as
having _successfully_ no bars — which `PROVIDER.md` §8.2 makes a legitimate answer — and every
instrument in this story then agrees the data is correctly absent. It is the one failure here
that survives every check, and it is invisible in aggregate where the backfill's is not.

**2.8.6, 2.8.7 and 2.8.8 are the backfill, split three ways for the same reason Story 2.7's
client was split four.** 2.8.6's failure is silent — a walk that skips a window produces a
well-formed, ascending, correctly provenanced store that is missing data, and neither the ledger
nor a chart nor an anomaly calculation can tell. 2.8.7 is the instrument that catches it, and it
is separate because "what is missing" needs a definition before "fetch what is missing" can be
written. 2.8.8 is the run, and it is a task rather than a step because five of this story's nine
criteria are measurements against the real row count.

**2.8.9 is the payoff, and taking it here rather than in Story 2.14 is a delivery decision.**
Ten tasks of ingestion with one visible change is a run of work nobody outside the code can see;
one column and one sentence on a page that already exists is the cheapest honest demonstration of
ten million rows available.

**2.8.10 closes it, and its method differs from every previous close**: half of this story's
criteria are properties of a populated database and cannot be re-taken from a clean clone. The
code half is re-taken; the data half is re-read from the deployed store, and each criterion says
which.

| Task                                                                | What it does                                           | Visible?                        |
| ------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| [2.8.1](TASK-01-the-storage-decisions-and-the-sizing-arithmetic.md) | Timescale, timeframes, where the backfill runs, sizing | No                              |
| [2.8.2](TASK-02-the-universe-recurated.md)                          | The size, the taxonomy, the rename map                 | **Yes — `/securities`**         |
| [2.8.3](TASK-03-the-market-bars-table.md)                           | `market_bars`: the key, the columns, the indexes       | No                              |
| [2.8.4](TASK-04-the-write-path-and-the-ingestion-ledger.md)         | The write path, and "what do I have"                   | No                              |
| [2.8.5](TASK-05-the-multi-symbol-fetch.md)                          | One request, many symbols — and the page that lies     | No                              |
| [2.8.6](TASK-06-the-backfill-command.md)                            | `pnpm backfill` — windows, pacing, resuming            | No                              |
| [2.8.7](TASK-07-gaps-completeness-and-catch-up.md)                  | Four reasons a bar is missing; catch-up                | No                              |
| [2.8.8](TASK-08-the-full-backfill-measured.md)                      | Run it; measure everything                             | No                              |
| [2.8.9](TASK-09-what-we-hold-on-screen.md)                          | Coverage on `/securities`                              | **Yes — the payoff**            |
| [2.8.10](TASK-10-verify-document-and-adr.md)                        | Verify, document, ADR 0020                             | No                              |
| [2.8.11](TASK-11-the-nightly-catch-up-fills-both-timeframes.md)     | The catch-up fills both timeframes — added after close | No — a number stops being wrong |
| [2.8.12](TASK-12-freshness-safeguards.md)                           | A static contract, and a runtime freshness answer      | No — unless something is stale  |

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

---

## Amended 2026-09-07 — what Task 2.7.1 measured, and the four things it changes here

Story 2.7's open decisions 1 and 2 are settled, and three of Alpaca's real limits are now
numbers rather than assumptions. The record is
[`ALPACA.md`](../story-07-alpaca-historical-data-integration/ALPACA.md).

### Open decision 3 is now answered upstream: **store both `1Min` and `1Day`**

Daily is **0.26% of minute** — 3.1 MB/yr against 1.19 GB/yr for the whole universe — so the
"derive daily from minute on read" half of that decision is settled by cost being absent.
`PROVIDER.md` §9.4 independently forbids deriving one from the other anyway, because replay
must reconstruct from what was stored.

**Depths, and they differ deliberately:** daily to the earliest available (**~2016**), minute
for **1 year**.

> **AMENDED 2026-09-08 by Task 2.8.1: the daily depth is capped at 2024-01-01, not ~2016.** The
> trading calendar covers 2024–2028 and **refuses** outside it rather than truncating, so
> `pnpm bars NVDA 1d --from 2016-01-04` fails at window construction with **no request made** —
> measured, with the in-range control returning 9 bars for 9 trading days. Settled with the user
> as option A of three: nothing in V1's scope reads 2016 (Epic 5's baseline is 60 trading days),
> and the alternative that keeps the depth without the calendar would make `1Day` the one
> timeframe where "is a bar missing?" has no answer. [`BARS.md`](BARS.md) §2. The reasoning is in Story 2.7's file, and the part that matters here is that
> **1 year of minute bars survives a re-size to 1,500 securities and 2 years does not** — so the
> depth was chosen by the sizing option it must not foreclose, and open decision 5's re-curation
> is not quietly pre-empted.

### The backfill is bounded by pagination, NOT by the rate limit

**The 200/min limit is per REQUEST, not per symbol** — measured, 203 requests of 50 symbols
each in one window against the same ceiling as 201 single-symbol requests, i.e. ~10,150
symbol-fetches per minute.

**So the whole universe is ONE request per bar-window** — measured at 518 symbols in a 3,209-character query string, HTTP 200 (Task 2.8.5's amendment). Batch aggressively. The
real bounds are the **10,000-row `limit` ceiling** and pagination, and the 429 carries **no
`Retry-After`**, so pacing uses our own schedule.

### Two request-construction traps that would corrupt the stored data

Both would produce plausible-looking rows, which is what makes them worth stating here rather
than leaving to be discovered:

1. **Alpaca's `end` is INCLUSIVE; `TimeRange` is half-open.** Passing `TimeRange.end` straight
   through fetches **one extra bar**, stamped at the close instant — and since `t` marks the
   **start** of its interval, that bar covers 16:00–16:01 ET and is outside the regular
   session. Tiled across a backfill this **duplicates a bar at every seam**, which is exactly
   what `PROVIDER.md` §9.3 made the type half-open to prevent.
2. **A date-only range includes extended-hours bars.** Measured on a half day: `start=…&end=…`
   as bare dates returned **217 bars against the session's 210**, the extras running from an
   hour before the open to eight minutes after the early close. `CALENDAR.md` §2 scopes V1 to
   the regular session, so **request explicit session bounds and never a bare date** — a
   date-only backfill silently stores pre- and post-market bars and every §11 calculation then
   runs over a denominator the calendar says is 390.

### Acceptance criterion 4's gap threshold depends on a feed question that is still open

**The completeness picture is much better than expected, and for a reason nobody had spotted:
the free plan serves SIP for historical bars, not IEX** (`ALPACA.md` §2). Over the same thin
equities and sessions, mean coverage is **82.8% on IEX against 99.7% on the default feed**, and
the longest single gap falls from **15 minutes to 2**.

A liquid name yields **exactly 390** bars for a regular session and a half day **exactly 210**,
both matching the shipped calendar — so `minuteBars` **is** a usable completeness target, which
is the opposite of what `PROVIDER.md` §6.4 expected.

~~**But do not encode a threshold until Task 2.7.4 settles the feed question**~~ — **that
instruction is SPENT: Task 2.7.4 settled it and deployed it on 2026-09-07.** The client sends
`feed=sip` explicitly, `MarketDataProvider.feed` declares `sip`, and the deployed chrome reads
`ALL US EXCHANGES`. So an absent bar in anything this story stores is **notable** rather than
ordinary, and the threshold can be encoded against `minuteBars`. (Leaving the instruction
standing would have been the `CALENDAR.md` §2.4 shape — an instruction whose condition has
already occurred.)

### And open decision 5's first half is unblocked

`UNIVERSE.md` §10's cap trigger fired in the **bars-are-exempt** direction: minute-bar
subscriptions accepted **5,000 symbols** on the free plan. **518 is nowhere near a cap and
neither is 1,500**, so the size question is now a curation question rather than a feed one —
which is what §10 always said the harder limit was. The taxonomy half was never blocked.

---

## Amended 2026-09-08 — what Task 2.7.9 hands over at Story 2.7's close

The four sections above were written from Task 2.7.1's first day of measurement. Five more
tasks measured things that land inside this story, and three of them change a design here.
The full record is [`ALPACA.md`](../story-07-alpaca-historical-data-integration/ALPACA.md);
`docs/adr/0019-*` is the decision record and carries a _What Story 2.8 inherits_ section.

### The two request traps above are THREE, and there is a fourth about window SHAPE

**A third trap, produced rather than reasoned about** (Task 2.7.3): **a daily bar is stamped
at midnight ET**, hours before the session opens. So a `1Day` request framed on
`[open, close)` — the obviously correct window for minute bars — contains **no daily bar at
all** and returns a perfectly well-formed empty answer. `pnpm bars NVDA 1d` printed _"no
bars"_ until `fetch-bars.ts` gave the two timeframes different windows. **This story builds
windows for both timeframes and will meet it.**

**And the fourth is not covered by trap 2, which is the part most likely to be missed.** Trap
2 is about _bare-date_ ranges; Task 2.7.5 measured that a multi-day span leaks extended-hours
bars **with explicit instants too**, at **~2.35×**:

| Range       | Sessions | Pages |   Bars | Regular-hours |     Ratio |
| ----------- | -------: | ----: | -----: | ------------: | --------: |
| one session |        1 |     1 |    390 |           390 | **1.00×** |
| 25 sessions |       25 |     3 | 22,952 |         9,750 | **2.35×** |
| 47 sessions |       47 |     5 | 43,515 |        18,330 | **2.37×** |

`[first.open, last.close)` spans the nights between, and SIP serves pre- and post-market
prints across them — **57.5% of a month's bars are extended hours.** The regular-hours column
is `minuteBars` summed over the sessions and the walk matched it **exactly**, so the calendar
is right and the window shape is what differs.

**A reader who fixes trap 2 by sending instants has not fixed this. The answer is to request
per SESSION**, `[open, close)` per day, measured at exactly 1.00×.

**Consequence for storage sizing**: `UNIVERSE.md`'s **~1.18 GB/year** assumes 390 bars a
session and is therefore **conditional on per-session requests**. A span-shaped backfill
stores **~2.8 GB/year**. The recorded figure is right for the design this story should adopt
and wrong for the one it might drift into.

### The naïve backfill is the REFUSED shape

_"From the last bar I stored, to now"_ is a flat **`403`** carrying
`{"message": "subscription does not permit querying recent SIP data"}`, and this story's file
did not know that. Three properties, each measured (`ALPACA.md` §7b):

1. **The refusal keys on `end` ALONE** — a `start` 60 minutes ago with an `end` 30 minutes ago
   is `200`.
2. **It refuses the WHOLE request rather than answering partially.** Friday's open to now —
   6½ hours of available data plus ~15 minutes that is not — returns **nothing**.
3. **It applies to daily too**, and **not** to `feed=iex`, so it is a SIP entitlement
   restriction rather than a general recency rule. Epic 3's live stream is unaffected.

`alpacaServableEnd` clamps `end` to `now − 16 min` and reports the clamp as
`coverage.covered`, which is what `SeriesCoverage` exists for. **So the resume point is a
design constraint rather than a courtesy: a backfill that bookmarks `requested.end` rather
than `covered.end` either re-fetches or leaves a permanent 16-minute hole.**

### Pacing is this story's, and there is now a measurement rather than an assertion

`PROVIDER.md` §8.8 says pacing is Story 2.8's. Task 2.7.7 measured why, and it is the
strongest evidence in this repository for that line.

**The limiter is a token bucket refilling at ~3.23/s, not a punished sixty-second window** —
so one `429` costs one request rather than a minute, and a backoff has to outlast a token
(~310 ms). **The budget is per API rather than per key or per path**: a second `data` endpoint
competes for the same tokens, while the **trading** API sits on its own budget (which is why
`pnpm universe:check`'s asset lookups cost this story's bar fetching nothing).

And 320 concurrent calls through the shipped retry wrapper:

| Burst of 320                |    `ok` | HTTP requests |
| --------------------------- | ------: | ------------: |
| bare provider (the control) |      91 |       **320** |
| through the wrapper, 3 s    | **206** |       **606** |
| through the wrapper, 20 s   | **263** |     **1,473** |

**Retry helps one caller and does not help a crowd.** The return diminishes while the cost
does not — 2.5 extra requests per extra answer, then 15 — and at the 20-second deadline the
wrapper sustained **73 req/s against a 3.23/s refill** and still left 57 calls refused. A
hundred concurrent retriers do not recover from a rate limit; they compete for the same
refill. **What fixes it is asking less often**, which this story gets cheaply because the
limit is per **request** rather than per symbol.

**And what a retry re-spends: a retried symbol costs its page count again.** The wrapper
composes around the interface, so a retry re-runs the walk from page 1 — accepted
deliberately, because a resumed walk needs a resume point Task 2.7.5 refused to expose. A
hundred symbols retried once is a hundred times the page count, not a hundred requests.

**A paginated caller must pass its own `deadlineMs`.** A 5-page walk is **72% of
`DEFAULT_BARS_DEADLINE_MS` (3,000 ms)**, and that default was derived for a _single_ request
against the browser's 5-second budget. One that does not gets a `timeout`, which is at least
loud.

### Two members of `BarsResult` are not producible, and this story may be able to produce one

`unknown-symbol` and `range-not-available` are both **unproducible from the bars endpoint**
and are named as such rather than left looking implemented — an unknown symbol answers `200`
with an empty `bars` object, byte-identical to a real symbol with no prints in range. This
story is the first thing that could tell them apart, because it knows which symbols are in
the universe.

### This story is the named owner of a future `delisted`, on a new argument

Task 2.7.8 declined the member and **moved the ownership here rather than deferring it**.
`status` gained **no** second writer, deliberately. What this story inherits is the signal:
**bars stopping is better correlated with reality than the vendor's flag** — 100% against 92%
on a 50/50 sample — costs no request, and arrives as a consequence of ingestion this story is
doing anyway. If it adopts the member, `UNIVERSE.md` §15.3's **produced** overwrite is the
thing it has to solve first: a `status` written by anything else is silently reverted by the
next deploy's `pnpm universe`, reported as an ordinary `1 updated`.

### The recycled-ticker hazard is this story's, because it files bars against `security_id`

Tickers are reused: **229** in the current catalogue carry both an active and an inactive row,
and `FB` today is an active ProShares ETF rather than Meta. The loader keys on `symbol`, so a
recycled ticker added to `universe.ts` would flip a **different** company's row back to
`active` on its old id and land two companies' bars on one row. **Zero of the 518 are affected
today** and `pnpm universe:check` reports it — but the report is only run by a person, so a
backfill assuming `security_id` means one company forever is assuming something nothing
enforces.

Related and settled: **a ticker rename orphans the old bars**, and that ships as a written
decision rather than a mechanism, because the premise it rested on was falsified — Alpaca's
asset id does **not** survive a rename, six for six. The recommendation if the trigger fires
is a **rename map in the curated file**, and **the deadline is this story**, because after it
backfills a rename costs a re-backfill.

### And the universe sizing is unblocked rather than parked

`UNIVERSE.md` §10's trigger fired in the bars-are-exempt direction. The sizing was
deliberately **not** re-taken in Story 2.7, because §5's metadata source has to be settled
first — that is this story's re-curation. **Re-sizing after this story backfills costs a
re-backfill rather than a file edit**, which §10 names as the real deadline on the decision.

---

## Amended 2026-09-08 — the remaining tasks reviewed against Task 2.8.4

**Nothing added, deleted or re-ordered.** Five task files amended, three of them substantively,
because 2.8.4 shipped one thing its brief did not specify: the one-range ledger's stated cost —
_the walk must be monotonic_ — is **enforced** rather than written down. `market-bars.ts` refuses
a write whose gap from the stored range contains a trading session, read off the shipped
calendar, and throws naming the missing dates.

That is a behavioural change downstream tasks were written against, and it lands three ways:

- **2.8.6's open concurrency question is now constrained rather than free.** Eight sessions in
  flight complete out of order, and an out-of-order session write for one symbol is exactly what
  the check refuses. The recommendation was already sequential; its argument is now structural.
- **A failed or dropped session blocks the walk for that symbol, loudly**, instead of leaving a
  silent hole. That gives **2.8.5's** _"one failure that survives every check"_ a second,
  independent net — one session late, named as a gap rather than as a dropped symbol, and blind
  to a drop on a run's last session — so it is a backstop rather than a reason to relax there.
- **2.8.7's "no ledger entry for `(security, timeframe, session)`" describes a table that does
  not exist.** The ledger is one row per `(security, timeframe)` with one range, so _not fetched_
  is _outside the covered range_. The three-way computation survives; only the lookup changes.

And one hole found in **2.8.7's** own recommendation: _log failures only, because successes are
recorded by the bars_ misses the **empty success**, which writes no bars and extends no range and
is therefore recorded in neither table. Usually absorbed by the next session on the far side of
it; not absorbed at the frontier, where it reads as _never asked_ about a day we asked about. The
attempt log records empty successes too.

Smaller corrections: **2.8.9**'s repository read already exists as `listCoverage()`, and there is
no _last attempt_ field to keep off the page because 2.8.4 refused one; **2.8.8**'s idempotence
check should watch the ledger's `updated_at` rather than its `recorded_at`, which is insert-only
and cannot move.

---

## Amended 2026-09-08 — the remaining tasks reviewed against Task 2.8.7

**Nothing added, deleted or re-ordered.** Three task files amended, and two of this story's own
sections above are now discharged rather than open.

2.8.7 shipped the shape its brief and three amendments predicted — an attempt log, a pure
comparison, and `pnpm bars:check` on `pnpm universe:check`'s four properties — and took the two
decisions that were handed to it. The changes downstream are about **running** the remaining work
rather than about its shape.

### The two open questions this story was carrying are answered

- **`delisted`** — the section _"This story is the named owner of a future `delisted`"_ above is
  answered: **reported and never written.** The member does not ship. `UNIVERSE.md` §15.3's
  produced overwrite is why — a `status` written by anything other than the loader is silently
  reverted by the next deploy's `pnpm universe` — so adopting it is two decisions rather than
  one, and this is Task 2.1.7's shape where the instrument says _whether_ and a person decides
  _what to do_. The signal itself is real and cheap: bars stopping, at 100% correlation against
  the vendor's flag at 92%.
- **Open decision 4's second half** — _"the incremental catch-up's home is decided separately when
  it exists"_ — is decided. It exists (Task 2.8.6's forward walk), and ~~**neither it nor the
  backfill runs automatically in V1**~~ **— reversed by Task 2.8.8, see the amendment at the
  foot of this file and `BARS.md` §8.12: the catch-up IS scheduled and only the initial
  backfill stayed a deliberate act. What follows is the argument as it stood** — a person runs `pnpm backfill` before a demonstration and
  `pnpm bars:check` is how they find out whether they needed to. The cost is stated rather than
  implied — an unscheduled catch-up is what makes the store quietly stale, and
  `bar_coverage.updated_at` is the only field that can report it honestly. `BARS.md` §7.6.

### The three amendments

- **2.8.8** gains an **ordering hazard that is a hard failure**: the backfill now writes and
  clears the attempt log on every request, so `0006_bar_attempts.sql` has to reach the deployed
  database — through `deploy.yml`'s migration step, which only runs on `main` — **before** a
  laptop backfill runs against it. It also gains a run order: **daily first**, because it is ~13
  requests and a couple of minutes and it is what makes the report's delisting signal able to
  answer at all during the ~72-minute minute run. Plus a third table to fingerprint for criterion
  2, and a warning that the report's default window reads as _N series behind_ mid-backfill,
  correctly.
- **2.8.9** gains a correction to a **reason** rather than to an instruction. Task 2.8.6's
  amendment said a blocked security and a genuinely-short-history security _"render identically
  from the ledger alone"_; they no longer do, because a blocked one leaves a `coverage-gap` row.
  The instruction — do not distinguish them on the page — stands, and its argument changes from
  _you cannot_ to **you could and should not**, which is the shape that otherwise gets overturned
  by the next reader.
- **2.8.10** gains three ADR decisions (why empty successes are logged, why completeness and
  density are two names, why the delisting signal is reported and not written), two second-list
  entries (the signal is blind without a daily backfill **and says so**; the log is advisory
  rather than authoritative), and four sweep candidates whose conditions have **already fired** —
  `delisted` ownership described in the future tense, "two tables" claims that are now three, the
  catch-up's home described as open, and the test counts, which moved twice inside this story.

### One finding worth carrying out of the story

The delisting signal **produced a false positive on the day it was written** — two healthy
securities reported as delisted, because it reads daily bars and the store held only minute ones,
so _no daily bar_ meant _we never asked_. The fix is a **third value** rather than a better
threshold, and the more transferable half is that the report now **prints its own blind spot**.
That is Task 1.13.6's blind-renderer problem in a third place, after the axe gate and
`backfill.database.test.ts`'s window assertion: **a check that cannot see something must say so**,
because a reader who sees no findings will otherwise conclude there is nothing to find.

---

## Amended 2026-09-09 by Task 2.8.8 — the catch-up DOES run automatically

This story records that **neither the backfill nor the catch-up runs
automatically in V1**. That is reversed, and the reversal is argued in
[`BARS.md`](BARS.md) §8.12 rather than asserted here.

**The initial backfill is still a deliberate act** — `workflow_dispatch` only.
What changed is the **nightly catch-up**: `.github/workflows/backfill.yml` runs
`--sessions 10` at 08:00 UTC.

Two things made the original decision worth re-taking:

- **Part of its argument was that the backfill had nowhere good to run.** Task
  2.8.8 measured a laptop as the wrong machine by a factor of ~35 — ~250 ms per
  round trip to North Central US turns 97 minutes of work into 33 hours — and
  gave it a home inside Azure. That premise is gone.
- **Cost was never the objection and is now measured**: four vendor requests a
  night, and **zero** on a night with nothing new, because the planner plans
  none.

**What the original decision was right about survives**: an unscheduled
catch-up is what makes the store quietly stale, and `bar_coverage.updated_at` —
_when what we hold last changed_ rather than _when the backfill last ran_ — is
the only field that can report it honestly. It is now the **check on** the
schedule rather than the substitute for one, which matters because GitHub
disables a `schedule:` on a repository with no pushes for 60 days, silently.

---

## Amended 2026-09-10 — the nightly catch-up fills one timeframe of two

**A finding logged against this story after it closed, found from the other end:
a reader looking at the shipped `/securities` page on 2026-09-10 asked why the
Last close column said `2026-09-04`.** It does because **the nightly catch-up has
never fetched a daily bar** — `--sessions 10` carries no `--timeframe` and
`backfill.ts` defaults to `1m`. The daily table still ends at the `--to` of the
one-off run this story recorded in [`BARS.md`](BARS.md) §8.8.

The measurement, the cause, how far behind it is (two sessions — `2026-09-07` is
Labor Day), and the condition for fixing it are in [`BARS.md`](BARS.md) §8.18.
§8.12's own "the store is kept current" now carries a dated note saying which
store it meant.

**Not repaired here, and the reason is ownership rather than difficulty.** It is
one line in `backfill.yml`, but it changes a **scheduled** job that spends vendor
quota, and Story 2.9 — which found it — reaching across to edit this story's cron
is how a story stops having an owner.

**The part worth carrying forward is about the instruments, not the gap.** The
workflow's own post-run report is `pnpm bars:check --timeframe 1m`, hard-coded —
so the one instrument that reports staleness honestly was pointed at the only
timeframe that is never stale. §8.12 already names the silent-schedule hazard;
this is that hazard one level down, with the instrument configured past it.
