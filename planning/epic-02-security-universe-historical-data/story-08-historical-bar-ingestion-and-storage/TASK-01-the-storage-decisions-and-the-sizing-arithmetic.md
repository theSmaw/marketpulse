# Task 2.8.1 — The storage decisions, the sizing arithmetic, and where the backfill runs

**Status:** Complete (2026-09-08)
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** Story 2.7 (complete)

## Objective

Settle every open decision this story can settle before a table exists, and **ship nothing**.
Three of the five are still open — TimescaleDB, the timeframes and their depths, and where the
backfill actually runs — and two of them are irreversible in practice once ten million rows
have been written against them.

The record is `BARS.md`, created by this task, which is to Story 2.8 what `ALPACA.md` is to
2.7, `PROVIDER.md` to 2.6, `CALENDAR.md` to 2.5 and `UNIVERSE.md` to 2.3. **One document per
subject; a second one is a copy waiting to disagree.**

## What the user can see when this lands

**Nothing, and this is the largest story in the epic, which makes saying so early important.**
The deployed chrome still reads `MARKET FEED / ALL US EXCHANGES`. There is no chart, no price
and no table of market data.

The first visible change in this story is **Task 2.8.2**, which re-curates the universe and
therefore changes what `/securities` renders. The payoff is Story 2.12.

## This is the shape Tasks 2.1.1, 2.2.1, 2.3.1, 2.5.1, 2.6.1 and 2.7.1 set

Six stories have now opened with a task that decides and ships nothing, and the reason is the
same every time: the decisions below are cheap today and cost a re-backfill later. Two of them
are worse than that — a storage engine and a row's key are not repairable from outside once
data exists.

## Open decision 2 — TimescaleDB

`PRODUCT_SPEC.md` §30 offers it optionally and §37 says do not add a second data technology
without a measurement. **This is the story with the measurement in it, and the measurement is
not available yet** — the row count that would justify it does not exist until Task 2.8.7.

So this task does the half that must happen first, and it is a **platform** question rather
than a performance one:

- **Is `timescaledb` available on this server at all?** Read it off the deployed instance
  rather than off a documentation page — `SELECT * FROM pg_available_extensions WHERE name =
'timescaledb'` and `SHOW azure.extensions` — because Azure Database for PostgreSQL flexible
  server maintains an allow-list per tier and an extension not on it cannot be enabled by any
  amount of `CREATE EXTENSION`. Story 2.2.1 measured that `timescaledb` is 2.24.0 on 15, 16,
  17 and 18 alike, which says the extension supports our version and says nothing about
  whether this subscription may install it.
- **What enabling it would cost the tooling.** A hypertable is created by a function call
  rather than by `CREATE TABLE`, which is a statement in a migration file; chunk management is
  a background worker on a **Burstable B1MS that Story 2.1 measured banks almost no CPU
  credits**; and `pnpm test:database` creates and drops a database per run, so the extension
  has to be installable in that database too or the sixth level of test stops describing
  production.
- **What it would buy, stated as a hypothesis to be tested at 2.8.7 rather than assumed.**
  Chunk exclusion on a time-ordered table, compression, and continuous aggregates. The first
  is what a plain btree index on `(security_id, timeframe, observed_at)` also gives at this
  row count; the third is Epic 5's problem and Epic 5 does not exist.

**The recommendation this task should carry unless the platform check says otherwise: do not
enable it now, and name Task 2.8.7's measured query plans against the real row count as the
trigger.** ~10M rows in one table is not a large table for Postgres 18, and the cost of
finding out is one `EXPLAIN ANALYZE` against real data rather than a decision made in advance.
Record the reversal cost honestly: converting a populated table to a hypertable is a data
migration, not a flag.

## Open decision 3 — the timeframes, and their depths

**Answered upstream and this task confirms rather than re-decides** (Story 2.7's amendment of
2026-09-07): store **both `1Min` and `1Day`**, minute to **1 year**, daily to the earliest
available (**~2016**).

Three things to write down rather than leave implied:

- **Daily is 0.26% of minute** — 3.1 MB/yr against 1.19 GB/yr for the whole universe — so the
  "derive daily from minute on read" half of the decision was settled by the cost being
  absent, not by a preference.
- **`PROVIDER.md` §9.4 forbids deriving one from the other anyway**, because replay must
  reconstruct from what was stored. That is the stronger argument and it should be the one
  quoted.
- **The minute depth was chosen by the sizing option it must not foreclose**: 1 year of minute
  bars survives a re-size to 1,500 securities and 2 years does not. So Task 2.8.2's re-curation
  is not quietly pre-empted by this number, and if 2.8.2 lands on a much smaller universe the
  depth may be revisited **before** the backfill and not after.
- **The calendar's range is a hard floor on daily depth.** `market-calendar.ts` covers
  2024–2028 and **refuses** outside it rather than truncating (ADR 0017, decision 9). A daily
  backfill walking to ~2016 through `lastMarketSessions` will throw. Decide here whether daily
  history before 2024 is walked by session at all or requested as a plain date range that the
  vendor resolves — the second is the only one that works today, and it means **daily bars
  before 2024 arrive without a calendar to check them against**, which is a real and stated
  limit on criterion 4 for that timeframe.

## Open decision 4 — where the backfill runs

Three candidates, and the deciding argument is provenance rather than convenience:

- **A local command against the deployed database.** Simplest. Story 2.1's `developer-laptop`
  firewall rule already exists and has moved four times, which is the recorded hazard. The cost
  is that the deployed system's data has a provenance of _somebody's laptop_ — and this story's
  own founding decision is that the store is **a record of what was observed**, which makes the
  question of who observed it and from where a first-class one rather than a shrug.
- **A one-off container job**, running the same image the backend ships. Correct provenance,
  and it costs a new Azure resource and a second place the credential lives.
- **A step in the pipeline**, beside `pnpm migrate` and `pnpm universe`. Rejected on sight and
  worth writing down: a full backfill is hours of metered vendor traffic, and a step in
  `deploy.yml` runs on **every merge**.

**A fourth shape exists and is the one to consider properly: the initial backfill and the
incremental catch-up are different programs with different homes.** The first is a one-off of
hours; the second is minutes and wants to run repeatedly. Deciding them together is how the
one-off ends up in the pipeline.

Whatever is chosen, record the **credential path** it implies. `marketpulse-github-deploy` owns
the tables and holds `CREATE`; `marketpulse-backend` holds the four DML verbs. A backfill is
DML, so it can run as the runtime identity — but only from something that **has** that identity,
which a laptop does not, so a laptop connects as the Entra administrator and that is a third
principal writing rows. Say which one writes the bars.

## The sizing arithmetic, done twice

Do it now as an **estimate** and name Task 2.8.7 as the task that re-takes it against measured
row sizes. Both halves matter: an estimate that is never re-taken is a guess with a table in it.

The inputs are all measured already and should be cited rather than re-derived:

| Input             | Value                                                                   | Source                                                   |
| ----------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| Regular session   | **390** minute bars                                                     | `market-session.ts`                                      |
| Half day          | **210**                                                                 | eleven days in range                                     |
| Sessions per year | 2024: 252, 2025: 250, 2026: 251, 2027: 251, 2028: 251                   | `market-calendar.ts`                                     |
| Assumed row size  | ~120 B                                                                  | `UNIVERSE.md` §10 — **an assumption, not a measurement** |
| Usable storage    | **~22.5 GiB** (32 GiB less 3.74 GiB overhead, read-only at <5 GiB free) | Task 2.1.5                                               |
| Storage price     | $0.115/GB/month, backup $0.095                                          | Retail Prices API                                        |

**The condition that makes ~1.18 GB/year true, and it is easy to lose:** it assumes **390 bars
a session**, which is only what a request returns if the request is **session-shaped**. Task
2.7.5 measured a multi-day span returning **2.35×** that, because SIP serves pre- and
post-market prints across the nights the span covers — 57.5% of a month's bars. A span-shaped
backfill stores **~2.8 GB/year**. So the sizing number and the request shape are one decision,
and `BARS.md` should say so in the same paragraph rather than in two.

State the headroom in **years at the chosen universe size**, and state it again at 500 and
1,500, because Task 2.8.2 may move that number.

## Work

- `BARS.md`, created, carrying every decision below with its rejected alternative
- The TimescaleDB platform check, run against the **deployed** server and against a local
  container, with the output recorded rather than summarised
- The timeframe and depth confirmation, including the pre-2024 daily question
- The backfill's home, and the identity that writes the rows
- The sizing table above, with the request-shape condition attached to the number
- The two things this task explicitly hands forward: the row-size measurement (2.8.7) and the
  Timescale trigger (2.8.7)

## Done when

- `BARS.md` exists and every open decision in `STORY.md` except 5 is either settled in it or
  named as owned by a later task with the reason
- Open decision 5 is untouched here — it is Task 2.8.2's, because it is a product judgement
  about a list rather than an engineering decision about a store
- No file outside `planning/` has changed; `pnpm verify` is exit 0 because nothing moved

## Notes

The temptation is to skip this and start with the migration, because the table looks like the
obvious first thing. The table is downstream of three of these decisions: TimescaleDB changes
how it is created, the timeframes change what its key contains, and the request shape changes
how much of it there will be. Getting the order wrong here is the one mistake in this story
that costs a re-backfill rather than an edit.

---

## What was done, and what it measured (2026-09-08)

`BARS.md` exists and every open decision this task owned is settled in it. **No file outside
`planning/` changed**, which is criterion 3 of this task's own Done-when list and is the property
that makes a decide-and-ship-nothing task honest.

### The TimescaleDB question was a PLATFORM question and the answer is an asymmetry

Read off both servers rather than off a documentation page. **Deployed**: `timescaledb` **2.24.0
is available and not installed**, `azure.extensions` is **empty**, and `shared_preload_libraries`
is `pg_cron,pg_stat_statements` with `timescaledb` in its allowed values and
**`isDynamicConfig: false`, so changing it requires a server restart**. **Local**: the extension
is **absent from `pg_available_extensions` entirely** in `postgres:18`.

**So enabling it is not one decision, it is four**: a server parameter, a second server parameter
with a restart, `CREATE EXTENSION`, and **a different local image** — which turns
`LOCAL_DATABASE_VERSION` from a pin on a Postgres major into a pin on a vendor's distribution of
one, and reaches `pnpm test:database`, which creates and drops its own database every run.
Declined, with Task 2.8.7's `EXPLAIN` against the real row count as the trigger.

### The daily depth was NOT settled upstream, and the measurement is the whole finding

Story 2.7's amendment says daily to **~2016**. It is unreachable through any code path this
repository has, produced rather than reasoned about:

```
$ pnpm bars NVDA 1d --from 2016-01-04 --to 2016-01-15
2016-01-04 is outside the trading calendar, which covers 2024-01-01 to 2028-12-31. …
```

**No request was made** — the refusal fires at window construction, which is ADR 0017 decision 9
working as designed. The control is the same command inside the range: `--from 2024-01-02 --to
2024-01-12` returns **9 bars for 9 trading days** with `2024-01-01` correctly absent, and it shows
the **midnight-ET stamp in production data** (`2024-01-02T05:00:00.000Z`), which is Story 2.7's
third request trap visible rather than cited.

**Settled with the user as option A: daily is capped at 2024-01-01.** Both timeframes are now
bounded by the same calendar, so every bar this story stores has a session to be checked against
and Task 2.8.6's completeness computation has no special case.

### The sizing was computed from the calendar rather than approximated, and 252 is wrong

| Year | Sessions | Early closes | Minute bars per security |
| ---: | -------: | -----------: | -----------------------: |
| 2024 |      252 |            3 |               **97,740** |
| 2025 |      250 |            3 |               **96,960** |
| 2026 |      251 |            2 |               **97,530** |
| 2027 |      251 |            1 |               **97,710** |
| 2028 |      251 |            2 |               **97,530** |

**Mean 97,494 rather than the naive `390 × 252 = 98,280`** — the eleven half days cost ~786 bars a
year, so the approximation overstates by ~0.8%. Small, and it is the denominator every other
figure divides by. The calendar itself is **61 rows: 50 full closures and 11 early closes**,
counted from the shipped table.

At 101 securities that is **9.8M minute rows a year** and ~25.4k daily; at 500, 48.7M; at 1,500,
146.2M. **Daily is noise at every size**, which is what makes storing it rather than deriving it
free.

### Two things measured in passing

**The `developer-laptop` firewall rule had moved again** — the **fifth** sighting — and the CLI's
own shape is worth carrying: `firewall-rule update` takes **no name argument at all**, and
`--rule-name` is rejected on `create`. The working form is `create ... -n <name>`, which upserts.

**`MarketCalendarRangeError` renders `[object Object]`** when handed a session object rather than a
date string, reached by passing `marketSessionsBetween`'s return value into `marketSessionOn`. The
refusal is correct and its message is not. Recorded rather than fixed, because Story 2.5 owns that
module and this task changes no source.

### What is still open

**Open decision 5 — the universe's size and taxonomy — is untouched here**, deliberately, and it
is Task 2.8.2's. **The incremental catch-up's home** is deferred with the backfill's own decision,
because a one-off of hours and a repeated job of minutes are different shapes.
