# The bar store — decisions, arithmetic, and what was measured

**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Opened:** Task 2.8.1, 2026-09-08

This is to Story 2.8 what [`ALPACA.md`](../story-07-alpaca-historical-data-integration/ALPACA.md)
is to 2.7, [`PROVIDER.md`](../story-06-market-data-provider-abstraction/PROVIDER.md) to 2.6,
[`CALENDAR.md`](../story-05-trading-calendar-and-market-time/CALENDAR.md) to 2.5 and
[`UNIVERSE.md`](../story-03-security-domain-model-and-tracked-universe/UNIVERSE.md) to 2.3. One
document per subject; a second one is a copy waiting to disagree.

**Two of its figure sets age differently and the distinction matters.** The calendar arithmetic
below is reproducible from a clean clone forever, because it is computed from a checked-in table.
The platform readings — what extensions a managed server offers, what a server parameter holds —
are observations of an Azure resource on one day, and Microsoft may change them without telling
us. Re-read those rather than citing them.

---

## 1. Open decision 2 — TimescaleDB: **declined now, with a measured trigger**

`PRODUCT_SPEC.md` §30 offers it optionally and §37 says do not add a second data technology
without a measurement. Task 2.8.1 cannot take the performance measurement — the row count that
would justify it does not exist until Task 2.8.8 — so what it took instead is the **platform**
half, which has to be true before the performance question is worth asking.

### What is available, read off both servers rather than off a documentation page

| Reading                                    | Deployed (`psql-marketpulse-dev`)                    | Local (`postgres:18` container)                   |
| ------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------- |
| `select version()`                         | PostgreSQL 18.6 on x86_64-pc-linux-gnu               | PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2), aarch64 |
| `timescaledb` in `pg_available_extensions` | **yes — 2.24.0, not installed**                      | **absent entirely**                               |
| `azure.extensions`                         | **empty** (`timescaledb` is in `allowedValues`)      | n/a                                               |
| `shared_preload_libraries`                 | `pg_cron,pg_stat_statements` (`timescaledb` allowed) | n/a                                               |
| `isDynamicConfig` on that parameter        | **`false` — a change requires a server restart**     | n/a                                               |

**The asymmetry is the finding.** Enabling it deployed is three steps — add to `azure.extensions`,
add to `shared_preload_libraries` (**restart**), then `CREATE EXTENSION` — and every one of them is
a platform action that exists in no file in this repository, which puts it straight into the sixth
gap category this project already carries. Enabling it **locally is not a setting at all**: the
extension is not in the image, so it means a different image, which means
`scripts/local-database.mjs`'s `LOCAL_DATABASE_VERSION` stops pinning a Postgres major and starts
pinning a vendor's distribution of one — and the local-versus-deployed version comparison, which
is already an unchecked invariant of the third kind, changes shape.

**And it would reach `pnpm test:database`**, which creates and drops `marketpulse_vitest` on every
run. An extension the sixth level of test cannot create is a sixth level of test that no longer
describes production.

### The decision

**Do not enable it.** ~10M rows in one table is not a large table for Postgres 18, and the primary
access pattern Story 2.9 needs — one symbol, one timeframe, one window, ascending — is served by
the unique constraint's own btree, which chunk exclusion would be competing with rather than
adding to.

**The trigger is Task 2.8.8's `EXPLAIN (ANALYZE, BUFFERS)` against the real row count**, on the
deployed instance rather than on a laptop, because a B1MS banks almost no CPU credits and a plan
that is fine locally is not evidence. Two named candidates for what could fire it: the
cross-sectional query (`every security at this instant`, which is §11's breadth and has no index
behind it today, deliberately), and the row count growing an order of magnitude if Task 2.8.2
re-sizes the universe upward.

**The reversal cost, stated rather than discovered:** converting a populated table to a hypertable
is a data migration and not a flag, and it is preceded by a server restart. Deciding this before
the backfill is therefore cheaper than deciding it after in exactly one respect — the restart is
free against an empty table — and that is not a strong enough reason to adopt a second data
technology against a measurement that does not exist.

---

## 2. Open decision 3 — the timeframes, and the depth question that was NOT answered upstream

**Store both `1Min` and `1Day`** — settled by Story 2.7's amendment and confirmed rather than
re-decided here. Daily is **0.26% of minute**, so the "derive daily from minute on read" half was
settled by the cost being absent, and `PROVIDER.md` §9.4 independently forbids deriving one from
the other because replay must reconstruct from what was stored. That is the stronger argument and
it is the one to quote.

### The minute depth is 1 year, and the number was chosen by what it must not foreclose

**1 year of minute bars survives a re-size to 1,500 securities and 2 years does not.** So the depth
is a function of Task 2.8.2's sizing rather than of a preference, and if 2.8.2 lands on a much
smaller universe the depth may be revisited **before** the backfill.

### The daily depth is NOT ~2016, because the calendar refuses — measured 2026-09-08

Story 2.7's amendment says daily to the earliest available, ~2016. **That is not reachable through
any code path this repository has**, and it was produced rather than reasoned about:

```
$ pnpm bars NVDA 1d --from 2016-01-04 --to 2016-01-15
2016-01-04 is outside the trading calendar, which covers 2024-01-01 to 2028-12-31.
Extend MARKET_CALENDAR in packages/shared/src/market-calendar.ts …
[ELIFECYCLE] Command failed with exit code 1.
```

**No request was made.** The refusal fires at window construction, which is ADR 0017 decision 9
working exactly as designed — a short list of sessions is a wrong answer shaped like a right one —
and it means "daily to ~2016" is a decision with a cost rather than a default. The control is the
same command inside the range, which works: `--from 2024-01-02 --to 2024-01-12` returns **9 bars**
for 9 trading days, with `2024-01-01` correctly absent.

That control also shows the **midnight-ET stamp** in production data — `2024-01-02T05:00:00.000Z`
is 00:00 EST — which is the third of Story 2.7's four request traps, visible rather than cited.

**Three options, and this is the one thing in Task 2.8.1 that needs a person:**

| Option                                        | Cost                                                                                                                  | What it buys                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **A — cap daily at 2024-01-01**               | ~8 years of history not stored                                                                                        | One definition of a session, everywhere, checked. No new work.    |
| **B — extend `MARKET_CALENDAR` back to 2016** | ~8 years of exception rows read off NYSE's published record by hand, and `MARKET_CALENDAR_PROVENANCE` moved with them | Full depth, still checkable against a calendar                    |
| **C — bypass the calendar for daily only**    | Daily bars before 2024 arrive with **no calendar to check them against**                                              | Full depth, cheaply — and a stated hole in criterion 4 for `1Day` |

**SETTLED 2026-09-08 with the user: option A — daily is capped at 2024-01-01.**

The argument is what V1 actually reads: Epic 5's baseline is **60 trading days**, §11's percentile
is 60 trading days of 5-minute returns, and Stories 2.12 and 2.13 chart a window a user picks.
**Nothing in V1's scope reads 2016.** B is the correct answer to a question nobody is asking yet;
C is the one to avoid, because it makes `1Day` the timeframe where "is a bar missing?" has no
answer, which is the exact distinction acceptance criterion 4 exists to make.

**So both timeframes are bounded by the same calendar, and that is worth stating as a property
rather than as a coincidence**: every bar this story stores falls inside 2024-01-01 to 2028-12-31,
every one of them has a session to be checked against, and Task 2.8.7's completeness computation
has no special case. The depth is therefore **~2 years and 8 months of daily** at the time of
writing rather than a fixed number of years, and it **grows on its own** as the calendar's own
range is walked forward.

**The reversal trigger is a feature that needs multi-year daily history**, and the repair is
option B — extending the calendar — rather than option C, because by then `1Day` would have a
checked history that C would make unequal to itself. `MARKET_CALENDAR_PROVENANCE.nextEditDue` is
**2028-01-01**, so the calendar is already an editing obligation on a clock; extending it
backwards is the same kind of work.

**One consequence for Task 2.8.6 to inherit rather than discover:** the daily walk's lower bound
is now a constant with a reason, and a backfill asked for more history than the calendar covers
must **refuse in the same shape the calendar does** rather than silently starting at 2024-01-01 —
a short answer shaped like a right one is precisely what ADR 0017 decision 9 rejected.

---

## 3. Open decision 4 — where the backfill runs

**Settled with the user; the candidates and what each costs are kept because the catch-up's home is still open.**

- **A local command against the deployed database.** Simplest, and it works today — Task 2.8.1
  connected to the managed server this way. The cost is provenance: this story's founding decision
  is that the store is **a record of what was observed**, which makes _who observed it and from
  where_ a first-class question rather than a shrug.
- **A one-off container job** running the backend's own image. Correct provenance, and it costs a
  new Azure resource and a second place the Alpaca credential lives.
- **A step in `deploy.yml`.** Rejected on sight: a full backfill is tens of minutes of metered
  vendor traffic (§4b) and a deploy step runs on **every merge**.

**SETTLED 2026-09-08 with the user: the initial backfill runs as a local command against the
deployed database, and the incremental catch-up's home is decided separately when it exists.**

The two are different programs with different shapes — the first is a one-off long enough to
want watching, the second is minutes and wants to run repeatedly — and
deciding them together is how the one-off ends up in the pipeline. **They are still one walk with
different starting points** (Task 2.8.7), so what is being deferred is the _home_, not the code —
and **Task 2.8.7 is its named owner**, rather than the question floating.

**What the local choice costs, stated rather than left implicit.** The deployed store's provenance
is a laptop, and this story's founding decision makes that a first-class fact rather than a shrug.
Three specific consequences:

- **The laptop's network is inside the failure surface.** Task 1.11.7 already produced a 65-second
  "outage" that was the laptop rather than the environment, proved by a three-host control. A
  backfill of tens of minutes will meet that, and Task 2.8.6's resumability is what makes it
  survivable.
- **The `developer-laptop` firewall rule must be current**, and it has moved five times. It is the
  first thing to check when the command cannot connect and the deployed backend can.
- **A third principal writes the rows.** Neither `marketpulse-backend` nor
  `marketpulse-github-deploy` is available from a laptop, so the connection is as the **Entra
  administrator** — a superuser-adjacent principal writing ten million rows through a path no
  deployed code uses. That is a stated decision here rather than a consequence discovered in a
  `pg_stat_activity` snapshot, and it is one more argument for the catch-up eventually living
  somewhere with an identity of its own.

**The credential path, whichever is chosen.** `marketpulse-github-deploy` owns the tables and holds
`CREATE`; `marketpulse-backend` holds the four DML verbs. A backfill is DML, so it can run as the
runtime identity — but only from something that **has** that identity, which a laptop does not. A
laptop connects as the Entra administrator, which is a **third** principal writing rows into
`market_bars`, and that should be a stated decision rather than a consequence.

---

## 4. The sizing arithmetic — an estimate, to be re-taken at Task 2.8.8

### Sessions and bars, computed from the shipped calendar rather than approximated

| Year | Sessions | Early closes | Minute bars per security |
| ---: | -------: | -----------: | -----------------------: |
| 2024 |      252 |            3 |               **97,740** |
| 2025 |      250 |            3 |               **96,960** |
| 2026 |      251 |            2 |               **97,530** |
| 2027 |      251 |            1 |               **97,710** |
| 2028 |      251 |            2 |               **97,530** |

**Mean: 97,494 minute bars per security per year.** Note this is **not** `390 × 252 = 98,280` —
the eleven half days across the range cost ~786 bars a year, so a naive figure overstates by
~0.8%. Small, and worth having right, because it is the denominator every other number here
divides by. Daily is **one bar per session**, so ~251 rows per security per year.

The calendar itself is **61 rows: 50 full closures and 11 early closes** — counted from the
shipped table rather than derived, which is how Task 2.5.6 caught the count being wrong when it
was written.

### Rows, at three universe sizes

| Securities | Minute rows / yr | Daily rows / yr |
| ---------: | ---------------: | --------------: |
|    **101** |         **9.8M** |          ~25.4k |
|        500 |            48.7M |           ~126k |
|      1,500 |           146.2M |           ~377k |

**Daily is noise at every size**, which is what makes storing it rather than deriving it free.

### Storage, and the condition attached to it

`UNIVERSE.md` §10's **~120 bytes a row** is an **assumption**, and the declared column widths are
consistent with it for the **heap**: a 23-byte tuple header, two `bigint` keys, a short `text`
timeframe, two `timestamptz`, four `numeric(18, 6)` at ~12–14 bytes each at realistic equity
prices, and a `bigint` volume. **What it does not include is the index**, and this table has one
btree over every row by construction. So the estimate is a floor and
`pg_total_relation_size` is the figure that matters — **Task 2.8.8 owns taking it.**

Against Story 2.1's measured **~22.5 GiB usable** (32 GiB provisioned, less 3.74 GiB of filesystem
overhead on an empty server, going read-only at under 5 GiB free), at ~120 B/row heap:

| Securities | Minute GB / yr | Years to read-only |
| ---------: | -------------: | -----------------: |
|        101 |       **~1.2** |             ~19–20 |
|        500 |           ~5.8 |               ~3.9 |
|      1,500 |          ~17.5 |               ~1.3 |

**And the condition that makes those numbers true, which is easy to lose because it looks like a
request detail: they assume 390 bars a session, which is only what comes back if the request is
SESSION-SHAPED.** Task 2.7.5 measured a multi-day span returning **2.35×** that, because SIP
serves pre- and post-market prints across the nights the span covers — 57.5% of a month's bars.
A span-shaped backfill at 101 securities stores **~2.8 GB/year**, not 1.2. The sizing number and
the request shape are one decision and they belong in one paragraph.

**Retention is nothing-is-deleted with disk pressure as the trigger** (open decision 1), and what
makes that safe rather than reckless is the table above plus the `psql-storage-80pct` alert Story
2.1 created — which has had nothing to watch until now.

---

## 4b. The multi-symbol fetch — measured 2026-09-08, and it added a task

`ALPACA.md` §6 records that the rate limit is **per request, not per symbol**, and concludes that
Story 2.8 should batch aggressively — the whole universe in one request per bar-window. What it
did not record is **what a multi-symbol response looks like when it paginates**, and that turned
out to be the difference between a bullet in the backfill and a task of its own.

Three symbols, one regular session, `limit=500`, walked to exhaustion:

| Page | Contents                                                 | Token      |
| ---- | -------------------------------------------------------- | ---------- |
| 1    | `AAPL:390` (13:30–19:59) &nbsp; `MSFT:110` (13:30–15:19) | present    |
| 2    | `MSFT:280` (15:20–19:59) &nbsp; `NVDA:220` (13:30–17:09) | present    |
| 3    | `NVDA:170` (17:10–19:59)                                 | **`null`** |
|      | **Totals: AAPL 390, MSFT 390, NVDA 390**                 |            |

Four properties, three of them traps:

1. **`limit` is a total row budget across ALL symbols**, not per symbol.
2. **Symbols are filled in alphabetical order**, one at a time.
3. **A symbol straddles a page boundary** — MSFT arrives as 110 then 280.
4. **A symbol can be absent from a page entirely while having a full session of data** — NVDA is
   not in page 1 at all.

**The rule that follows: nothing may be concluded about any symbol until the walk is exhausted.**
A batch that maps page 1's `bars` object into results reports `NVDA: ok, 0 bars`, and
`PROVIDER.md` §8.2 makes an empty answer a **successful** one meaning "no prints in this window".
So the store would record a security as genuinely not having traded, `toBarSeries` would accept
it as coherent, and the completeness report would see a session attempted and correctly empty.
**Every instrument in this story would agree the data is correctly absent.** That is the fourth
well-formed lie this story's shape has produced and the only one that survives every check.

**Task 2.8.5 was inserted for it** (2026-09-08), between the write path and the backfill command.

**And it resizes the backfill's runtime.** 101 securities × 390 bars is **39,390 rows a session**
against the shipped 10,000-row `limit`, so one session for the whole universe is **4 pages**; a
year is ~251 × 4 ≈ **1,004 requests**, reconciling with 9.84M rows ÷ 10,000 ≈ **985 pages**. At
the measured ~3.23/s refill and ~1 s a page that is roughly **twenty minutes of request time**,
against **~25,350 requests and over two hours** for the per-symbol loop. So the word _hours_ in
this document and in the task files describes the design the batch replaces; expect **tens of
minutes**.

---

## 5. What this task deliberately did not decide

Open decision 5 — the universe's size and its industry taxonomy — is **Task 2.8.2's**, because it
is a product judgement about a list rather than an engineering decision about a store, and
`UNIVERSE.md` §10's own instruction is that §5's metadata source is settled before a number is
picked.

The table's key, columns and indexes are Task 2.8.3's. The ledger is 2.8.4's. The row-size
measurement and the TimescaleDB trigger are both 2.8.8's.

---

## 6. Two things measured in passing, recorded so they are not rediscovered

**The `developer-laptop` firewall rule had moved again** — `58.182.90.91` against a current
`122.11.246.144`. That is the **fifth** sighting of a hazard `HOSTING.md` already records by
naming the hazard rather than an address, and it is the first thing to check when a laptop times
out against a server the deployed backend reaches perfectly. Note the CLI's own shape here:
`az postgres flexible-server firewall-rule update` takes **no name argument at all** and
`--rule-name` is rejected on `create`; the working form is `create ... -n <name>`, which upserts.

**`MarketCalendarRangeError` renders `[object Object]` when handed a session rather than a date
string.** Reached by passing `marketSessionsBetween`'s return value — which is session objects,
not dates — into `marketSessionOn`. The refusal is correct and its message is not, and it is a
one-line fix in a file this story does not otherwise touch. Recorded rather than fixed here,
because Story 2.5 owns that module and the error is loud enough to diagnose either way.
