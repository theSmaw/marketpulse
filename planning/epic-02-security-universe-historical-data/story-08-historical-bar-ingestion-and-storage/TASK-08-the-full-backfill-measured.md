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
`recorded_at` values not moving, is the shape — Task 2.3.8's method, where idempotence is
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
