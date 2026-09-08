# Task 2.8.8 — The full backfill, run and measured

**Status:** Not started
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Task 2.8.7

## Objective

Run it. Against the deployed database, for the whole universe, both timeframes, to the depths
Task 2.8.1 settled — and take every measurement the story asks for **against the real row count
rather than a sample**, which is what criteria 1, 6 and 7 say in three different ways.

This is also the task where TimescaleDB is finally decidable, because the measurement it was
parked on now exists.

## What the user can see when this lands

**Nothing on screen, and the database holds roughly ten million rows of real market history.**

The honest way to show this task is a number and a query: the row count, the on-disk size, and a
`select` returning a real security's real closing prices for a real week. Task 2.8.9 is what
makes it a page.

## The run

Local first, then deployed, and the local one is not a rehearsal — it is the only environment
where a mistake is free. **The deployed database has a `CanNotDelete` lock and 7-day backups**,
so a corrupted backfill there is repaired by writing a forward correction rather than by
starting again.

Record, as measurements rather than estimates:

- **Runtime**, split into vendor wall time and database wall time. **Expect tens of minutes
  rather than hours**: 9.84M rows ÷ a 10,000-row page is ~985 requests, which at the measured
  ~3.23/s refill and ~1 s a page is ~20 minutes of request time. The word "hours" in this
  story's earlier drafts assumed a per-symbol loop and Task 2.8.5's batch removes it. The first is the rate limit
  and the second is the write path, and knowing which dominates decides whether the pacer or the
  batching is the thing to change.
- **Requests made**, against the token bucket's ~3.23/s refill, and **`429`s received**. Zero
  `429`s means the pacer is possibly too conservative; a steady trickle means it is calibrated.
- **Rows written per timeframe**, against the arithmetic Task 2.8.1 computed from the calendar
  rather than approximated: **97,494 minute bars per security per year** (not `390 × 252 =
98,280` — the eleven half days cost ~786 a year), so ~9.84M minute rows at 101 securities, and
  **~670 daily sessions** rather than ~2,500, because daily is capped at 2024-01-01.
- **Sessions attempted, held and failed**, from Task 2.8.7's report rather than from the
  command's own output — the report is the instrument and the command's counters are its
  narration.

## The row size, which Task 2.8.1 could only estimate

`UNIVERSE.md` §10's ~120 bytes is an **assumption** and the whole sizing model rests on it. Take
it properly:

- `pg_column_size` on a real row, and `pg_total_relation_size` on the table — **which is the
  figure that matters**, because it includes the indexes and the estimate did not.
- The **index-to-heap ratio**, stated. One btree over ten million rows is not free and the story
  says indexes are chosen rather than accumulated; this is where that choice gets a price.
- **TOAST and alignment.** `numeric(18, 6)` is variable-length and four of them sit beside two
  `timestamptz` and two `bigint`; the packed size is not the sum of the declared widths, in
  either direction.

Then re-derive the years-of-headroom table at the real number, against Story 2.1's measured
**~22.5 GiB usable** — 32 GiB less 3.74 GiB of filesystem overhead, going read-only at under
5 GiB free — and state it at the current universe size **and** at 500 and 1,500, because Task
2.8.2 may have moved it and because a re-size is a re-backfill from here on.

**Criterion 7 is "checked against the 32 GB offer with the headroom stated"**, and the honest
version of that sentence names 22.5 GiB rather than 32, because the difference is a third of the
disk.

## Query performance, for the patterns Story 2.9 actually needs

Criterion 6 says "the access patterns Story 2.9 needs" and that story names them:

- **One symbol, one timeframe, one window, ascending** — the chart. This is the unique
  constraint's own btree and should be an index scan; if it is not, the column order is wrong.
- **A named window resolved through the calendar** — "the last 5 sessions", which is the same
  query with bounds computed elsewhere.
- **The whole universe at one instant** — §11's breadth, which is Epic 5's and is the query with
  **no index behind it today**, deliberately. Measure it anyway, because the number is what
  decides whether Task 2.8.3's deferred `(observed_at)`-leading index gets built and whether it
  needs `CREATE INDEX CONCURRENTLY`. **Note the deferral is now enforced rather than intended**:
  `market-bars.database.test.ts` asserts the table has exactly two indexes and both are
  constraints, so building one here is a red test until somebody writes down which query it
  serves — which is the point, and is what turns "chosen rather than accumulated" into something
  that stays true.

`EXPLAIN (ANALYZE, BUFFERS)` on each, against the real row count, on the **deployed** instance —
because the laptop's Postgres has a different amount of memory and a B1MS banks almost no CPU
credits, so a plan that is fine locally is not evidence.

**And measure the payload, because Story 2.9 has to**: a year of minute bars is ~98,000 rows,
and that story's open decision 2 is about downsampling. The row count and the serialised size
are what that decision needs and they exist now.

## TimescaleDB, decided

Task 2.8.1 recommended not enabling it and named this task's measured plans as the trigger. Now
take it:

- If the primary chart query is an index scan in single-digit milliseconds at ten million rows,
  **the extension buys nothing that is currently needed** and the decision is to decline it with
  the reversal trigger being Epic 5's cross-sectional queries or the row count growing an order
  of magnitude.
- If it is not, say which pattern is slow and whether a plain index fixes it before reaching for
  a second data technology — §37's rule, and the plain index is the cheaper experiment.

Either way the answer goes in `BARS.md` with the numbers under it, and the reversal cost is
restated at what Task 2.8.1 actually measured — it is **worse than "a data migration rather than
a flag"**: enabling it deployed is `azure.extensions`, then `shared_preload_libraries` (which is
**not** dynamic, so a **server restart**), then `CREATE EXTENSION` — and **locally it is a
different image entirely**, because `timescaledb` is absent from `postgres:18`'s
`pg_available_extensions`. That reaches `LOCAL_DATABASE_VERSION` and `pnpm test:database`.

## Criterion 2, proved on the real store

**Re-running the backfill changes nothing — proved by row counts and checksums, not by
inspection.** Task 2.8.4 proved the property on a fixture; this proves it on ten million rows.
A `md5` over an ordered projection of the table before and after, plus the ledger's own
`updated_at` values not moving, is the shape — **`updated_at` and not `recorded_at`, corrected
2026-09-08 by Task 2.8.4**: `bar_coverage.recorded_at` is insert-only and cannot move, so
checking it would assert nothing. `updated_at` is the column that moves on a real change and
deliberately does not on a no-op, which is what makes it the one worth watching. Both tables
should be fingerprinted, for the same reason — Task 2.3.8's method, where idempotence is
asserted on the data rather than on the counters.

And criterion 3 the same way: interrupt the real run, resume it, and compare against a run that
was never interrupted.

## Work

- The full local run, measured
- The full deployed run, measured, from a laptop as the **Entra administrator** — the identity
  Task 2.8.1 settled, and a third principal beside `marketpulse-backend` and
  `marketpulse-github-deploy`, neither of which is reachable from a laptop. Check the
  `developer-laptop` firewall rule first: it has moved **five** times, and the CLI's shape is a
  trap of its own — `firewall-rule update` takes **no name argument at all**, and
  `create -n <name>` is what upserts
- Row size, table size, index ratio, headroom at three universe sizes
- `EXPLAIN (ANALYZE, BUFFERS)` for the three access patterns, deployed
- The TimescaleDB decision, with its numbers
- Idempotence and resumption proved on the real store
- `BARS.md` amended with every figure, and the sizing estimate marked as re-taken
- The `psql-storage-80pct` alert re-read, because it is what makes "nothing is deleted" safe
  rather than reckless, and this is the first time it has had anything to watch
- The deployed backend read: `/health`, `/diagnostics/database` and `/securities` all unaffected
  throughout, with `uptimeSeconds` never resetting — a ten-million-row write against the same
  database the replica queries is the largest load this system has seen

## Done when

- Criteria 1, 2, 3, 6 and 7 are each met by a measurement recorded in `BARS.md`
- The deployed store holds the full universe at both timeframes, and Task 2.8.7's report says so
- Every figure was taken rather than cited, including the ones this file predicts
- The deployed backend was unaffected, observed rather than assumed
- `pnpm verify` is exit 0; the artefact is unchanged, because this task ships no frontend source

## Notes

Two things to expect that the arithmetic does not predict.

**The first backfill will find something.** Every previous task in this story ran against
fixtures, a handful of symbols, or a scratch database; this is the first time the whole universe
meets the whole vendor. A symbol whose history starts later than the window, a session the vendor
has no data for at all, an unexpected `429` pattern under sustained load — these are the ordinary
findings of a first real run, and the task is finished when they are recorded rather than when
they do not happen.

**And the second run is the one that proves the first.** A backfill that completes is evidence
of very little; a backfill that completes, is re-run, and writes nothing is evidence of the
property this whole story is built on.

---

## Amended 2026-09-08 by Task 2.8.2 — the figures to expect are 518's, not 101's

| Reading                   | As written (101) |   Expect (518) |
| ------------------------- | ---------------: | -------------: |
| Minute rows, one year     |            9.84M |      **50.5M** |
| Pages at `limit=10000`    |             ~985 |     **~5,051** |
| Rate-limit floor          |          ~20 min |    **~26 min** |
| **Sequential wall clock** |          ~43 min | **~3.6 hours** |
| Heap at ~120 B/row        |          ~1.2 GB |    **~6.1 GB** |
| Years to read-only        |           ~19–20 |       **~3.8** |
| Daily rows                |           ~25.4k |      **~130k** |

**"Expect tens of minutes rather than hours" is now wrong unless the backfill is
concurrent** — see Task 2.8.6's amendment, which measures a page at 1,050,183 bytes and
2.52–2.65 s from a laptop and leaves the concurrency decision to this task's evidence. Record
**both** numbers: the rate-limit floor and the wall clock, because the gap between them is the
whole of the concurrency question.

**Two of this story's deferred decisions get materially sharper here and should be re-read
rather than re-confirmed out of habit:**

- **TimescaleDB** (open decision 2) was declined with _"Task 2.8.8's `EXPLAIN` against the
  real row count"_ as the trigger. That row count is now **50.5M rather than 9.84M**, so the
  trigger is five times more likely to fire than when it was written.
- **Retention** (open decision 1) is _"nothing is deleted, with disk pressure as the
  trigger"_, which was safe against ~20 years of headroom. At **~3.8 years** — and **~1.6**
  if any request is span-shaped rather than session-shaped — the `psql-storage-80pct` alert
  Story 2.1 created stops being theoretical within the life of this project.

---

## Amended 2026-09-08 by Task 2.8.6 — the concurrency question is CLOSED, and "tens of minutes" is right again

The backfill shipped and was run. Four changes, and the first retires an open question this file
was handed.

### 1. Sequential is ~72 minutes, not ~3.6 hours — so this task owes no concurrency decision

The 2026-09-08 amendment above says _"'Expect tens of minutes rather than hours' is now wrong
unless the backfill is concurrent"_ and asks this task to record **both** the rate-limit floor
and the wall clock _"because the gap between them is the whole of the concurrency question"_.

Measured on the shipped command against the live vendor:

| Reading                             | Predicted here |    Measured |
| ----------------------------------- | -------------: | ----------: |
| One session, whole universe         |          ~55 s |  **15.8 s** |
| Four sessions, whole universe       |              — |    **52 s** |
| Per session, sustained              |          ~55 s | **~17.3 s** |
| **Sequential year, 518 securities** |     **~3.6 h** | **~72 min** |

So the gap is **26 minutes against 72**, not 26 against 216, and `BARS.md` §4 has been amended
with the reading. **The original sentence is right after all: expect tens of minutes.**

The decision itself was already constrained rather than free — Task 2.8.4's ledger refuses
concurrency across sessions by name — and Task 2.8.6 took it sequentially with that argument
plus this measurement. **This task no longer owes a concurrency decision; what it owes is a
confirmation that the figure holds at full depth**, which is a different and much cheaper thing.
If a year of the whole universe comes in materially above ~72 minutes, that is a finding worth
recording rather than a decision to re-open.

### 2. The row size is measured, and it is worse than the estimate by more than a third

This task's row-size section says `UNIVERSE.md` §10's ~120 bytes is an assumption and that
`pg_total_relation_size` is the figure that matters. It has been taken locally, over **768,123
real rows**: **144 MB, or 197 bytes a row including indexes.**

Re-derived against Story 2.1's ~22.5 GiB usable, at 518 securities:

| Basis                                         | Rows / year | GiB / year | Years to read-only |
| --------------------------------------------- | ----------: | ---------: | -----------------: |
| The calendar's ceiling, 97,494 bars/security  |   **50.5M** |   **9.27** |           **~2.4** |
| The measured density, 364.3 bars/security-day |   **47.4M** |   **8.69** |           **~2.6** |

**Plan against ~2.4 years.** That is a **local** reading and this task still owes the deployed
one — a managed B1MS with different `fillfactor` behaviour under a sustained write is not a
laptop — but it is a datum rather than an assumption, and the index-to-heap split this file asks
for should be taken against it rather than against ~120.

**The retention trigger sharpens again.** The amendment above already moved it from ~19–20 years
to ~3.8; it is **~2.4**. Open decision 1's _"nothing is deleted, with disk pressure as the
trigger"_ now has a date inside this project's life, and `psql-storage-80pct` is what says so
first. This is the task that gives it something to watch.

### 3. Two of this task's "expect" figures were wrong in the same direction, so check the third

The 390-bars-a-session assumption underlying the row counts is optimistic: the measured mean is
**364.3 bars per security-session** (188,726 ÷ 518 on a full regular session), which is Task
2.8.5's liquidity finding at universe scale. A year is therefore **~47.4M minute rows rather
than 50.5M**.

That matters here for one reason beyond arithmetic: **the TimescaleDB trigger is an `EXPLAIN`
against the real row count**, and the real row count is a little lower than the figure the
amendment above sharpened the trigger with. It is still five times 9.84M, so the trigger is
unchanged in substance — but take the count rather than citing either number.

### 4. What is already done, and what the invocation actually is

The local run is **partly done**: 768,123 rows across a handful of symbols plus one full-universe
session, with idempotence, `SIGINT` and `kill -9` each produced. What remains local is **depth** —
a year at both timeframes for the whole universe — rather than shape.

The command's real invocations, so this task does not have to work them out:

```sh
pnpm backfill --sessions 251                                  # a year of minute bars, whole universe
pnpm backfill --timeframe 1d --from 2024-01-02 --to <last>    # daily, to the 2024-01-01 bound
```

Three properties to use rather than re-derive. **A re-run of a held range costs zero requests**,
so an interrupted deployed run is resumed by re-issuing the identical command. **`--sessions`
defaults to 5**, deliberately, so a bare `pnpm backfill` is not the full run. And **daily chunks
20 sessions to a request**, so a year of daily is ~13 requests rather than 251 — the whole daily
backfill is a couple of minutes and should not be budgeted as if it were the minute one.

**One thing to watch that the arithmetic does not predict**, beside the two this file already
names: a symbol blocked by `CoverageGapError` is dropped from the rest of that run and falls
permanently behind the others. At 518 securities over 251 sessions this is the first run large
enough for it to happen, and the blocked list printed at the end is where it will show.

---

## Amended 2026-09-08 by Task 2.8.7 — one ordering hazard, one run order, and a third table

The attempt log and `pnpm bars:check` shipped. Nothing about this task's shape changes; five
things about **running it** do, and the first is a hard failure rather than a note.

### 1. `0006_bar_attempts.sql` has to be applied to the deployed database BEFORE this runs

This is the one that will cost an afternoon if it is not read first. This task runs `pnpm
backfill` **from a laptop against the deployed database** (open decision 4), and the backfill now
writes and clears the attempt log — `clearAttempts` runs after **every** successful request, not
only after a failure. Against a deployed database that has not seen `0006`, the first session's
bars commit and then the run stops on `relation "bar_attempts" does not exist`.

It degrades correctly — the command catches it and reports _"Every session it did store is
stored"_ — but it stops after one session and the message names a table rather than a cause.

The migration reaches the deployed database through `deploy.yml`'s **`Run database migrations`
step, which only runs on `main`**. So the ordering is: merge, watch that step, _then_ back-fill.
Confirm it rather than assume it — `select name from kysely_migration order by name` against the
deployed server, which is the same check Task 2.2.7 used.

### 2. Run the DAILY timeframe first, and it is a two-minute decision that changes the whole run

The Work list has both timeframes and no order. Take daily first, for two reasons that both point
the same way:

- **It is ~13 requests and a couple of minutes**, because `SESSIONS_PER_REQUEST["1d"]` is 20 — so
  it costs essentially nothing against the minute run's ~72.
- **It is what makes `pnpm bars:check`'s delisting signal able to answer at all.** That signal
  reads **daily** bars, because the same `max(observed_at) group by security_id` over minute bars
  is a full parallel sequential scan — measured at **192 ms over 863k rows**, ~11 s extrapolated
  to a year of the universe, which is not a routine report's query. With no daily backfill the
  report is honest and blind: it prints `The "has it stopped printing" check is BLIND for N of
these series` and produces no findings.

So daily first means the report is a working instrument **during** the long minute run rather
than after it — which matters, because this task's own Notes predict the first full run will find
something.

### 3. Three tables to fingerprint for criterion 2, not two

The criterion-2 section says _"Both tables should be fingerprinted"_. There are three the
backfill writes now: `market_bars`, `bar_coverage` and `bar_attempts`.

The third is fingerprintable for the same reason the second is — it takes `securities`'
`is distinct from` idiom, so **a re-run that fails the same way twice leaves it byte-identical**,
and a re-run that succeeds where one failed leaves it **empty**. Both are assertable. A no-op
re-run of a held range writes nothing to any of the three, which was produced locally: the
ledger's md5 was identical before and after a second run (`171cd30e…`).

Note the log is **advisory rather than authoritative** and the report is built that way:
completeness is computed from `bar_coverage`'s range, never from this table, so a stale row
surviving a failed `clearAttempts` degrades the report's _explanation_ and not its _arithmetic_.
Worth knowing before reading a surprising row as corruption.

### 4. `pnpm bars:check`'s default window will read alarming mid-backfill, and it is correct

With no `--from`/`--to` the window is **the ledger's own union span** — earliest covered start to
latest covered end across every series — so _not fetched_ means **behind the rest of the
universe**. That is the design, and it is what surfaces a symbol the backfill gave up on.

During a partial run it means something else that looks identical: with one security deep and 517
shallow, the report says **517 series behind**, because they are. Produced locally, with exactly
that reading. Use `--symbols` or an explicit `--from`/`--to` while a run is in progress, and read
the default form once it has finished — that is when _behind_ means what the report is for.

### 5. The blocked-symbol prediction now has a durable instrument

Task 2.8.6's amendment says a symbol blocked by `CoverageGapError` _"falls permanently behind the
others"_ and that _"the blocked list printed at the end is where it will show"_. It shows in
**three** places now, and only one of them survives the terminal closing:

- the run's own blocked list, in memory;
- a **`coverage-gap` row in `bar_attempts`**, carrying the sessions the refusal named;
- and `pnpm bars:check`, which reports the symbol as behind **and** prints the recorded reason
  beside it.

So the finding this task predicts is recoverable after the fact rather than only during the run.

### 6. One figure not to budget for

`bar_attempts` is **sparse by construction** — a session that stored bars has no row, and a later
success deletes any row that was there — so it contributes nothing measurable to the storage
arithmetic and is empty when everything is well. Measure it anyway if it is cheap, but the
headroom table is `market_bars` plus its indexes, unchanged.
