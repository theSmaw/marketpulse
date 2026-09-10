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

> **Both halves moved afterwards and this paragraph is kept as the record rather than
> rewritten.** §8.8 corrected the first — the backfill runs from a **runner** rather than a
> laptop, because ~250 ms per round trip turns 97 minutes into 33 hours. §8.12 decided the
> second — the catch-up is **scheduled**, `.github/workflows/backfill.yml` at 08:00 UTC.
> Read those two sections before quoting this one. (Noted 2026-09-09, Task 2.8.10.)

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

> **Re-taken 2026-09-08 by Task 2.8.2, because the universe grew from 101 to 518.** The
> tables below are unchanged and still correct per security; what changed is which row of
> them is the live case. **The `500` row is now the real one.** The figures at 518, computed
> the same way:
>
> | Reading                               |         101 |     **518** |
> | ------------------------------------- | ----------: | ----------: |
> | Minute rows / year                    |        9.8M |   **50.5M** |
> | Daily rows / year                     |      ~25.4k |    **130k** |
> | Minute GB / year at ~120 B/row (heap) |        ~1.2 |    **~6.1** |
> | Years to read-only on ~22.5 GiB       |      ~19–20 |    **~3.8** |
> | Pages / year at `limit=10000`         |      ~1,004 |  **~5,051** |
> | Rate-limit FLOOR at 3.23/s            |     ~20 min | **~26 min** |
> | **Sequential wall clock @2.6 s/page** | **~43 min** |  **~3.6 h** |
> | Rows per session, whole universe      |      39,390 | **202,020** |
> | Pages per session                     |           4 |      **21** |
>
> Two things that change in kind rather than in degree. **The pages-per-year figure is now
> ~5,051**, because Task 2.8.5's multi-symbol fetch makes the cost a function of _rows_ rather
> than of securities. **But ~26 minutes is the rate-limit FLOOR rather than the wall clock, and
> the first version of this amendment said otherwise — corrected the same day.** `5,051 ÷
3.23/s` needs ~8 requests in flight; measured sequentially a page is **1,050,183 bytes and
> 2.52–2.65 s** from a laptop (n=3), which is the machine open decision 4 puts the backfill on,
> so a sequential year is **~3.6 hours**. At 101 that gap was 5 min against 43 and needed no
> decision; at 518 it is 26 min against 3.6 hours, and Task 2.8.6 now owes one. And
> **the session-shaped-request condition below stops being an optimisation and becomes
> load-bearing**: a span-shaped backfill stores ~2.35× the rows, which is **~14.2 GB/year**
> and **~1.6 years** to read-only rather than ~3.8. At 101 that was a number; at 518 it is
> the difference between a store that lasts and one that fills.

> **Re-taken again 2026-09-08 by Task 2.8.6, and three of the figures above are now
> MEASUREMENTS rather than estimates.** The backfill shipped and was run against the live
> vendor and a real database, so the two numbers this section had to guess at have been
> taken. The estimates are left standing above rather than rewritten, because the gap between
> a prediction and a reading is the record.
>
> | Reading                       |       Predicted |                Measured |
> | ----------------------------- | --------------: | ----------------------: |
> | Wall clock, one session @518  |           ~55 s |              **15.8 s** |
> | Sequential wall clock, 1 year |      **~3.6 h** |             **~72 min** |
> | Bytes a row                   | ~120 B **heap** | **197 B incl. indexes** |
> | Bars per security-session     |             390 |               **364.3** |
>
> **The wall clock is the one that changes a decision, and it changes it in the direction
> that removes one.** A sequential year is **~72 minutes** rather than ~3.6 hours — 251
> sessions at a measured 17.3 s each — against a ~26-minute rate-limit floor. So the gap the
> amendment above called _"the whole of the concurrency question"_ is 26 min against 72 min
> rather than 26 min against 3.6 hours, and Task 2.8.6 closed that question sequentially with
> the argument now much easier than it was. **`BARS.md` should no longer be read as saying a
> full backfill is an overnight job.**
>
> **The row size goes the other way and is the number to carry forward.** ~120 B was a
> **heap** estimate that this section already flagged as excluding the index;
> `pg_total_relation_size` over 768,123 real rows reads **197 B a row**. Re-derived against
> Story 2.1's ~22.5 GiB usable, at 518 securities:
>
> | Basis                                         | Rows / year | GiB / year | Years to read-only |
> | --------------------------------------------- | ----------: | ---------: | -----------------: |
> | The calendar's ceiling, 97,494 bars/security  |   **50.5M** |   **9.27** |           **~2.4** |
> | The measured density, 364.3 bars/security-day |   **47.4M** |   **8.69** |           **~2.6** |
>
> **Plan against ~2.4 years** — the ceiling, because a thin name trading more actively moves
> the density towards it rather than away. Either way the `~3.8 years` above is optimistic by
> about a third, and **retention stops being theoretical inside this project's life**: open
> decision 1's _"nothing is deleted, with disk pressure as the trigger"_ now has a date
> attached to it, and `psql-storage-80pct` is the thing that will say so first.
>
> **The 364.3 figure is a liquidity fact and not an ingestion one.** 188,726 bars for 518
> securities over one full regular session — Task 2.8.5 measured only 8 of 28 sampled S&P 500
> constituents returning a full 390, and this is that at universe scale. It is why Task 2.8.7
> must keep _fetched-and-thin_ in a different column from _not fetched_, and why nothing
> asserts a bar count against `minuteBars`.
>
> **The session-shaped condition below was honoured and is now load-bearing in production.**
> Every minute request the backfill makes is one session, `[open, close)`, and a year of NVDA
> came back at exactly **390 a session with the two half days at exactly 210** — the
> calendar's own arithmetic arriving from the vendor. The ~2.35× span-shaped alternative
> would put the headroom at **~1 year**, not ~1.6, at the measured row size.

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
this document and in the task files describes the design the batch replaces; ~~expect **tens of
minutes**~~.

**Scoped 2026-09-08 by Task 2.8.2: every figure in that paragraph is 101's, and the last clause
is wrong at 518.** The re-taken numbers are **202,020 rows a session, 21 pages, ~5,051 requests**
— and twenty minutes was only ever the **rate-limit floor**, which is the wall clock only if
enough requests are in flight to saturate the bucket. A page is 1,050,183 B and 2.52–2.65 s from
a laptop, so a **sequential** run of the shipped universe is **~3.6 hours** against a ~26 minute
floor. Task 2.8.6 carries the sequential-versus-concurrent decision and its recommendation.

### 4c. What shipped, 2026-09-08

The three-symbol walk above was **re-recorded through the shipped client and reproduced to the
bar**, and the fixtures are `fixtures/alpaca/multi-1min-walk-page-{1,2,3}.json`. Four things a
later reader needs that the measurement above does not carry:

- **`fetchManyBars` is a required member of `MarketDataProvider`**, so a provider cannot ship
  half the interface — adding it took three test stubs red with `TS2741`.
- **`ManyBarsResult` is `ReadonlyMap<Ticker, BarsResult>`, with no new union member.** Every
  requested symbol appears; a missing key is a bug.
- **`isWholeBatchFailure` is the asymmetry as code** — success per symbol, failure per batch —
  which takes a ninth `BarsResult` member's obligations from three to four. Only `ok`,
  `unknown-symbol` and `range-not-available` stay with one symbol.
- **No chunking exists and none should be built.** 518 symbols in one request is measured, and
  `toAlpacaManyQuery` says so beside the code, because a guard there would be a limit we invented
  in front of one the vendor does not have.

Live, against a real key: three symbols over one regular session returned **390 bars each** —
the calendar's own `minuteBars` — in **1,124 ms and one request**, because at `limit=10000` a
session of that size fits in one page.

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

---

## 7. Completeness, thinness, and the four causes — Task 2.8.7

Acceptance criterion 4 says a market holiday, a half day and a genuinely untraded minute must
each be distinguishable from a **failed fetch**. This section records what shipped and, more
usefully, the three things that turned out not to be true.

### 7.1 The four causes, and which instrument answers each

| Cause                      | Answered by                     | Cost                                   |
| -------------------------- | ------------------------------- | -------------------------------------- |
| The market was closed      | `market-session.ts`             | Free, exact, both timeframes           |
| The security did not trade | `bar_coverage.bar_count`        | One number already stored              |
| The fetch never happened   | `bar_coverage.covered` (0005)   | A set difference against one interval  |
| **The fetch failed**       | **`bar_attempts` (0006)** — new | A sparse table, empty when all is well |

The fourth had no answer before this task, and its absence is what made the criterion a
correctness requirement rather than a reporting one: a session stored as zero bars because a
fetch failed is not a gap in a chart, it is a **zero in a denominator** for Epic 5's volume
baseline, and it makes an ordinary day look like the most unusual one in the sample.

### 7.2 The computation is a set difference, and that is a property rather than an optimisation

`compareStoreToCalendar` is pure, takes both sides as parameters, and never joins per session
against `market_bars`. It can be that cheap because the backfill guarantees something stronger
than "probably":

> **Every session inside the ledger's covered range was attempted.**

The walk extends the range one contiguous step at a time from one of its two ends, and
`market-bars.ts` refuses by name any write that would leave a trading session in the gap. So a
range with an unfetched session inside it **cannot be constructed by `pnpm backfill` at all**,
and the report never has to distinguish _inside the range and never asked_ from _inside the range
and asked_. There is no such state.

### 7.3 Completeness and thinness are two columns, and merging them is the trap

Measured live on 2026-09-08 against the shipping store: **`AME` returned 304 bars for a
390-minute regular session**, spanning the whole session — the minutes are genuinely absent
rather than cut off, and the density reads 91.0%. Across the 28 constituents served on one page,
only 8 returned a full 390, at a universe-wide mean of 364.3.

So _calendar minus arrived_ is **not** a gap. On that definition the universe is permanently ~7%
incomplete on every session and the report is red forever, which is the same failure as expecting
390 bars on a half day arriving on the other 240 days of the year. The report prints two figures
with two names:

```text
  sessions   1/1 series hold every session in the window
  density    1419 bars held of 1560 the sessions could hold  (91.0%)
```

**Completeness is a question about the ledger's range; thinness is a question about the bars.**
The one direction that _is_ an invariant violation is more bars than minutes, which means the
timestamp mapping or the window shape is wrong — a span-shaped request collects extended-hours
prints at a measured 2.35× — so it is a finding of its own rather than a number over 100.

### 7.4 Three things that were not true

**"Failures only" is not enough, and Task 2.8.4 was right.** A session the vendor answers
successfully with **no bars** writes no bars and does not extend the ledger, because `BarSeries`
gives an empty series no `covered` window. It is recorded in **neither** table. In the middle of
a walk it is absorbed, because the range is a union; at the **frontier** it reads as _never
asked_. So the row set is _every attempt that left no bars_, and `ok` is a member of the
vocabulary meaning **answered and empty**.

**The ledger is not per session, so "no ledger entry for `(security, timeframe, session)`" was
the wrong lookup.** It is one contiguous range per series, and the correct reading is a set
difference against one interval — which is also what makes the comparison cheap.

**The `delisted` proxy produced a FALSE POSITIVE on the day it was written, and the fix is a
third value rather than a better threshold.** Task 2.7.8 moved that question here on a
measurement: bars stopping correlates with reality at 100% against the vendor's `inactive` flag
at 92%. The signal reads **daily** bars, because the same `max(observed_at) group by security_id`
over minute bars is a full parallel sequential scan — measured at **192 ms over 863k rows**, so
~11 s extrapolated to a year of the universe, which is not a routine report's query. But a store
with minute bars and no daily backfill has no daily row for anything, and "no daily bar" then
means _we never asked_ rather than _it has stopped printing_ — which reported **AMD and MSFT as
delisted** while they held 3,900 and 3,120 minute bars.

`SeriesStore.lastBarAt` is therefore three-valued: a `Date`, `null` for _the daily ledger covers
this and it holds nothing_, and **absent** for _the daily ledger cannot answer_. The report
prints its own blind spot rather than staying silent, because a reader who sees no findings would
otherwise conclude that nothing has stopped printing:

```text
  ! The "has it stopped printing" check is BLIND for 517 of these series,
    because the daily ledger holds nothing for them.
```

That is Task 1.13.6's blind-renderer lesson in a new place: **a check that cannot see something
must say so.**

### 7.5 The delisting decision: report and never write

`delisted` still does not ship as a `SECURITY_STATUSES` member, and the reason has not changed —
`UNIVERSE.md` §15.3 **produced** the overwrite: a `status` written by anything other than the
loader is silently reverted by the next deploy's `pnpm universe`, reported as an ordinary
`1 updated`. So adopting it is two decisions and not one. The report says _whether_ and a person
edits `universe.ts`, which is Task 2.1.7's shape.

### 7.6 Incremental catch-up: it already existed, and the open half was its HOME

Task 2.8.6 shipped it without naming it. `planRequests` emits two monotonic walks and the
**forward** one _is_ the catch-up: run a week after the last run, `pnpm backfill --sessions N`
fills the newer gap before it deepens anything. Verified again here — a second run against a
store that already held the window reported `0 fetches, 4 already held`, and the ledger's md5 was
**byte-identical before and after** (`171cd30e…`), which is the shape "catch-up run twice fetches
nothing the second time" should be asserted on, because `bar_coverage.updated_at` moves only when
the statement actually changed.

**So what this task inherited from Task 2.8.1 was the home, and the answer is: NEITHER RUNS
AUTOMATICALLY IN V1.** A person runs `pnpm backfill` before a demonstration, and `pnpm bars:check`
is how they find out whether they needed to. Stated in those words rather than left implicit,
because the honest cost of that answer is that **an unscheduled catch-up is what makes the store
quietly stale** — and the mitigation is that `bar_coverage.updated_at` is _"when what we hold last
changed"_ rather than _"when the backfill last ran"_, so staleness is reportable rather than
invisible. Task 2.8.9 has the same field.

The pipeline is refused for the reason 2.8.1 refused it for the full backfill and one more: it is
metered traffic on every merge, and it would put a vendor's availability inside a deploy. A
`schedule:` is refused for Task 1.13.5's reason — that is monitoring, which nothing in the roadmap
owns.

### 7.7 What `pnpm bars:check` is, in four properties

It follows `pnpm universe:check` exactly: **it reads and changes nothing**; **a finding does not
change the exit code** (the exit code answers _did the check run_); **it is not and never can be a
`pnpm verify` step**, because `verify` runs with no database; and **its comparison is pure and
takes both sides as parameters**, which is what lets the fast suite make findings happen that a
healthy store has no instance of.

The name was checked against `pnpm help -a` **with its control** — six known built-ins detected,
`bars:check` free — which is the validation that exists because a detector at Task 2.7.8 failed
its own control.

**The default window is the ledger's own span**, earliest covered start to latest covered end, so
_not fetched_ means **behind the rest of the universe**. That is the state Task 2.8.6 left with no
instrument at all: the backfill catches `CoverageGapError` per symbol, drops it from the rest of
the run and prints it, and that set lives in memory — so on exit the symbol is permanently behind
with a shorter covered range and nothing anywhere saying why.

### 7.8 Demonstrated live, one cause at a time

Against the local store and the real vendor on 2026-09-08:

| Cause            | Produced by                                     | What the store showed                                              |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Market closed    | 2025-11-27, Thanksgiving                        | No session in the calendar, no bars, and **not** a gap or thinness |
| Half day         | 2025-11-28, closes 13:00 ET                     | **210 bars**, density 100.0% — not 180 phantom gaps                |
| Untraded minutes | `AME` on a real regular session                 | **304 of 390**, density 91.0%, **no finding**                      |
| Failed fetch     | `ALPACA_API_SECRET_KEY=deliberatelywrongsecret` | `unauthorised` recorded against 2026-08-31, named in the report    |
| Recovery         | Re-run with the real key                        | `304 bars, 304 new`, and the log back to **0 rows**                |

---

## 8. The full backfill, run and measured — Task 2.8.8

Everything in this section is a reading rather than a projection. Where a
prediction existed it is left standing beside the measurement, because the gap
between the two is the record.

### 8.1 What the local store holds

| Timeframe |           Rows | Securities | Sessions | Range                   |
| --------- | -------------: | ---------: | -------: | ----------------------- |
| `1m`      | **47,682,213** |        518 |  **251** | 2025-09-08 → 2026-09-04 |
| `1d`      |    **345,559** |        518 |  **672** | 2024-01-02 → 2026-09-04 |

**48,027,772 rows**, and 515 securities hold the full minute year. The three
that do not are `Q` (Qnity Electronics), `FDXF` (FedEx Freight) and `HONA`
(Honeywell Aerospace) — 2025 and 2026 spin-offs that did not exist for the whole
window. See §8.7, because they turn out to matter far more than three rows
should.

**The row-count prediction is confirmed to within 0.6%.** Task 2.8.6 projected
**~47.4M** from a measured 364.3 bars per security-session against the
calendar's ceiling of 50.5M; the reading is **47.68M**. So the liquidity
discount is real, stable at universe scale, and the right basis for sizing.

### 8.2 Runtime, and which half dominates

| Run                   |  Wall clock | Sessions | Rows      |
| --------------------- | ----------: | -------: | --------- |
| Daily, full depth     | **135.6 s** |      672 | 345,519   |
| Minute, first pass    | **81m 36s** |  203/247 | ~39.6M    |
| Minute, gap fill      | **15m 45s** |       43 | 7,902,369 |
| Minute, final session |       ~20 s |        1 | 184,562   |

**The vendor dominates, and it is not constant.** The first 39% of the minute
walk averaged **20.0 s a session** (measured directly: 5 sessions in 100 s), and
the last quarter averaged **60–90 s**. Diagnosed rather than guessed: Postgres
reported the in-flight insert in `wait_event: ClientRead` — the server idle,
waiting for the client — and the Node process sat at **10.5% CPU** over 73
minutes. Neither the write path nor the process was the constraint, so the time
was network wait on the vendor.

**Zero `429`s, zero retries, zero timeouts across ~5,200 requests.** This task
was asked to read that as "the pacer is possibly too conservative", and the
honest answer is that it is conservative **by construction**:
`BACKFILL_PACE_MS` is 350 ms against a measured ~310 ms token, so the sustained
rate sits just under the refill and a burst can never accumulate. The wall clock
is therefore set by the vendor and the write path, never by the limiter, and the
~26-minute rate-limit floor is a number this design guarantees will not be
approached.

**One correction to a recorded figure.** Task 2.8.7's amendment says daily is
"~13 requests and a couple of minutes". That is 251 sessions; the daily bound is
2024-01-01, which is **672 sessions and 34 requests**. The conclusion — run daily
first, it is cheap — is unaffected.

### 8.3 The row size, taken properly

| Reading                |           Value |
| ---------------------- | --------------: |
| Rows                   |      48,027,772 |
| Heap                   |    **5,001 MB** |
| Indexes                |    **3,944 MB** |
| **Total**              |    **8,947 MB** |
| **Bytes a row, total** |         **195** |
| Bytes a row, heap only |         **109** |
| Index as % of heap     |       **78.9%** |
| TOAST                  | **8,192 bytes** |

`pg_column_size` on a real row is **104 bytes** (mean 103.93, min 96, max 104),
split `security_id` 8, `timeframe` 3, `observed_at` 8, four prices at 7 each,
`volume` 8, `recorded_at` 8.

**`numeric(18, 6)` does not TOAST at equity prices** — the whole TOAST relation
is one empty page — so §4's worry that "the packed size is not the sum of the
declared widths, in either direction" resolves in the harmless direction: prices
are 7 bytes inline, not 12–14.

**197 B/row reproduced at sixty times the sample.** Task 2.8.6 measured 197 over
768,123 rows; this is **195** over 48M. The ~120 B heap assumption `UNIVERSE.md`
§10 carried was a **heap** figure and is close to the 109 measured here — what
it omitted, and what doubles the answer, is the index.

### 8.4 Headroom, against 22.5 GiB usable

At the measured 195 B/row, and Story 2.1's **~22.5 GiB usable** (32 GiB less
3.74 GiB of filesystem overhead, read-only under 5 GiB free):

| Universe | Minute rows / yr |  GiB / yr | Years to read-only |
| -------: | ---------------: | --------: | -----------------: |
|      101 |            9.30M |  **1.69** |          **~13.3** |
|  **518** |       **47.68M** |  **8.66** |           **~2.6** |
|    1,500 |           138.1M | **25.10** |           **~0.9** |

Against the calendar's ceiling of 50.5M rather than the measured density it is
**~2.4 years**. **Plan against ~2.4**, which is what Task 2.8.6 said and what
this confirms.

**Criterion 7's honest sentence names 22.5 GiB rather than 32**, because the
difference is a third of the disk. The `psql-storage-80pct` alert (severity 2,
enabled, re-read) is what makes "nothing is deleted" safe rather than reckless,
and this is the first time it has had anything to watch.

### 8.5 The index nobody reads

| Index                                                              |         Size |          Scans | Tuples read |
| ------------------------------------------------------------------ | -----------: | -------------: | ----------: |
| `market_bars_unique_bar` — `(security_id, timeframe, observed_at)` |     2,915 MB | **15,327,127** |      76,422 |
| `market_bars_pkey` — the surrogate `id`                            | **1,029 MB** |          **0** |       **0** |

**A gigabyte of index with zero scans**, across the backfill, the daily run and
every query since the table was created — ~11% of a year's storage on a disk
with ~22.5 GiB usable, plus write amplification on all 48M inserts.

**It is a convention with a price rather than a defect.**
`migrations/README.md` §3 requires an identity `id` primary key with the natural
key as a `unique` constraint beside it, and `market-bars.database.test.ts`
**asserts** it — Task 2.2.5 made it a checked convention deliberately.
`0004_market_bars.sql` gives the argument: a three-column natural primary key
propagates three columns into every future foreign key referencing a bar.

That argument was made against no measurement and now there is one. **The
decision is to keep it and record the price**, on this repository's own rule that
an index question is settled against a reader rather than in advance — the same
rule `0004` applies to the indexes it declines to build. **The reversal trigger
is the first thing that references a bar by `id`**, or disk pressure arriving
before it does. Whoever takes it should know it is a migration on a populated
table plus an edit to a checked convention.

### 8.6 Query performance at 48M rows

`EXPLAIN (ANALYZE, BUFFERS)`, local, against the full store:

| Pattern                                   | Plan                               |   Rows |        Time |
| ----------------------------------------- | ---------------------------------- | -----: | ----------: |
| A. One symbol, one month, ascending       | Bitmap Index Scan + Sort           |  8,190 | **11.8 ms** |
| B. A calendar-resolved window, 5 sessions | Bitmap Index Scan + Sort           |  2,340 |  **2.1 ms** |
| C. The whole universe at one instant      | **Index Scan, 588 index searches** |    493 | **28.2 ms** |
| D. A year for one symbol                  | Index Scan, already ordered        | 97,530 | **61.6 ms** |

Two things here were not predicted.

**The cross-sectional query uses the existing index, via a PostgreSQL 18 skip
scan.** `0004_market_bars.sql` says that query "cannot use the constraint above,
because `observed_at` is its trailing column", and names a deferred
`(observed_at)`-leading index with Epic 5 as the trigger. Postgres 18 performs
**588 index searches** — one per distinct leading value — and answers in
**28.2 ms**. So the deferred index is still not needed, and the reason has
changed from _we will build it when Epic 5 asks_ to _the engine already solved
it_. The deferral is enforced by `market-bars.database.test.ts` asserting the
table has exactly two indexes, and it should stay enforced.

> **Re-taken 2026-09-10 by Task 2.9.9, which its brief named as the control to
> re-take rather than cite. The plan reproduces exactly and the timing does
> not.** Same store, same statement: `Index Scan`, **588 index searches**, **493
> rows** — identical — but **408.7 ms cold** (`hit=1,746 read=1,125`) and
> **1.93 ms warm** (`hit=2,862 read=0`). The 28.2 ms above sits between the two,
> which is what a part-warm buffer cache looks like; this paragraph does not
> record whether it was taken warm, so that is offered as the likelier reading
> rather than as a fact — only rebuilding the old state could tell a moved figure
> from a mis-recorded one. **The deferral is re-argued and stands**, and on the
> warm figure the argument is stronger than it was. The cold figure restates
> §8.15's deployed finding at local scale: this query is a disk problem, not an
> index problem, which is also why a hypertable would not fix it. Trigger
> unchanged — Epic 5 issuing it in anger. See `MARKET-DATA-API.md` §12.11.

**The chart query is a bitmap scan plus a sort, not the "one index range scan
already sorted" the migration claims.** The planner prefers building a bitmap
over a contiguous range and quicksorting 8,190 rows in 704 kB. The index is the
right index and the column order is right — query D, over the full range, _is_ a
plain ordered Index Scan with no Sort node — but the recorded sentence is
optimistic for bounded windows.

**The payload Story 2.9 has to serve**: a year of minute bars for one symbol is
**97,530 rows ≈ 8.4 MB of JSON**. That is the number Story 2.9's open decision 2
on downsampling needs, and it says the answer cannot be "send them all".

> **Amended 2026-09-09 by Task 2.9.1, which re-took it: the row count is exact and
> the payload figure is 24% low.** Same store, same symbol, same window, serialised
> in the exact wire shape — `startsAt` through `Date.prototype.toISOString()`, five
> values through `Number`, `JSON.stringify`, `Buffer.byteLength` — gives **97,530
> bars and 11,081,764 bytes**, 113.6 B/bar against the 86.1 B/bar this sentence
> implies. This paragraph's method was not recorded, so the two cannot be
> reconciled by inspection; the method for the new figure is in
> [`MARKET-DATA-API.md`](../story-09-market-data-api/MARKET-DATA-API.md) §8, and
> the instruction there is to re-take rather than cite either. The sentence stands
> as written because it is a record of what was measured on 2026-09-08; **quote
> 11.08 MB.** The correction strengthens the conclusion rather than changing it.

Note NVDA holds **97,530** bars for the year — exactly the calendar's figure for
251 sessions with two early closes. The most liquid names run at **100%
density** while the universe mean is 364.3/390; the discount is a property of
thin names rather than of the feed.

### 8.7 Two design findings the arithmetic did not predict

**A late-listing constituent breaks the resume, permanently.** `commonCoverage`
is the **intersection** of every symbol's covered range, and `Q`, `FDXF` and
`HONA` will never hold history older than their listing dates — so the skip
window can never move back past them. Measured: a resume issued as
`--sessions 251` planned **193 sessions to fetch 43 sessions of new data**, and
the first re-fetched session wrote **`0 new`**. It costs vendor budget and wall
clock, never correctness, and `--from`/`--to` is the working escape hatch.

**The fix, for whoever takes it: a per-symbol skip window rather than one
intersection.** The ledger already holds per-symbol ranges; `planRequests` takes
one common window because that was the cheap thing to write when every symbol
had the same depth. It is not this task's to change, and the trigger is a
universe re-curation, which guarantees new late-listing constituents.

**`bar_attempts` is not sparse.** Task 2.8.7 predicted it would be "empty when
everything is well". A security that listed inside the window answers
successfully-with-no-bars for every earlier session, and each writes an `ok` row
that is never cleared — **2,953 rows on a completely healthy store**. The
behaviour is right and the prediction about the table's size was wrong.

### 8.8 Where the backfill runs — open decision 4, corrected by measurement

§3 settled the initial backfill as "a local command against the deployed
database". Measured from the development laptop (Singapore) to the database
(North Central US):

| Reading                                      |                       Measured |
| -------------------------------------------- | -----------------------------: |
| `begin; select 1; commit;` as one round trip |                 **246–268 ms** |
| One `begin; insert; commit;`                 |                     **831 ms** |
| 20 inserts in **one** transaction            |                       7,319 ms |
| Ten minutes of deployed daily backfill       | 4,120 rows, 206 of 518 symbols |
| Projected deployed year                      |                  **~33 hours** |

The write path issues several statements per security per session, so the cost
is round trips multiplied by geography. **The database is not slow and the code
is not slow** — a warm statement is ~250 ms because Chicago is ~250 ms away.

**From a GitHub runner, which is inside Azure, the same work runs at 152 rows/s
against ~7 rows/s from the laptop — roughly 20×.**

This repository had already recorded the same fact twice without it costing
anything: the deployed browser check runs **faster** on a runner than on the
laptop (6.5 s against 9.7–10.5 s, Task 1.13.5), and `pnpm universe` takes
**0.428 s** on the runner against ~3 s from a laptop (Task 2.3.8). This is the
first time it decides where work has to happen.

**So the backfill's execution home is `.github/workflows/backfill.yml` —
`workflow_dispatch` only, never `push`, never `schedule:`.** Open decision 4's
substance is unchanged: it is still an operator's command run before a
demonstration rather than part of a deploy, and Task 2.8.7's decision that
nothing runs automatically in V1 stands. Only the machine moved.

**It holds no credential.** The runner authenticates with the same federated
identity `deploy.yml` uses and reads the Alpaca key **off the Container App** —
the key id a plain environment value, the secret a platform secret — so Task
2.7.2's "the credential lives in exactly one place" is unspent, and there is
still no repository secret.

**Two operational facts worth carrying**, both of which cost this task time:

- **A run outlives its own database credential.** An Entra access token is valid
  ~69 minutes; a full-year walk is longer. Each pass mints a fresh one, and the
  ledger makes resuming free.
- **The `developer-laptop` firewall rule moved twice in one morning** —
  `122.11.246.144` → `.18` → `.132`, the **seventh** sighting and the first
  _mid-task_. The symptom is `Connection terminated due to connection timeout`
  after the pool's 5 s deadline. A runner is immune, because
  `AllowAllAzureServicesAndResources` already admits it.

### 8.9 Two failures, both of which taught more than a clean run would have

**The minute walk failed at session 203 with `The operation was aborted due to
timeout`** — `BACKFILL_REQUEST_DEADLINE_MS`, 180 s. That constant was derived
from a measured ~55 s walk; the vendor's degradation over 81 minutes pushed a
single walk past it. **It is deliberately not raised**: failing loudly at three
minutes and resuming at zero vendor cost is the resumability this story is built
on, and a longer deadline buys a slower failure. What it does mean is that the
constant was derived from a sample that does not describe a long run, and
`BARS.md` should not be read as promising that a year completes in one
invocation.

**The failure message names the wrong subsystem.** It printed _"If the database
is not running, `pnpm db` starts it"_ for a **vendor** timeout. Recorded rather
than fixed, because the honest fix is to branch on the error and this task ships
measurements.

**And the failure proved acceptance criterion 3 better than a manufactured
interruption could.** Task 2.8.6 produced `SIGINT` and `kill -9` deliberately;
this was a real one, mid-walk, unplanned — and the store was left cleanly
bounded with every stored session stored, because each session is its own
transaction.

### 8.10 Criterion 2, proved on 48 million rows

Fingerprints over **every column including `recorded_at`**, so a silent rewrite
moves them even when the row count does not:

| Table          | Before                                     | After         |
| -------------- | ------------------------------------------ | ------------- |
| `market_bars`  | 48,027,772 / `-11361615698356078390196`    | **identical** |
| `bar_coverage` | 1,036 / `ac909cd4c5eff7ef16a73b659719a532` | **identical** |
| `bar_attempts` | 2,953 / `d546fed50139cc5f9f128d7e822d1fb8` | **identical** |

Between the two readings, `pnpm backfill --from 2025-10-01 --to 2025-10-15`
re-fetched eleven sessions from the vendor and re-offered **2,012,055 bars** to
the database: `0 bars stored, 0 corrected, 2,012,055 unchanged`. Nothing moved —
not a bar, not a ledger row, not an attempt row.

`bar_coverage` is **1,036 rows for 518 securities**, which is Task 2.8.6's
prediction of one row per `(security, timeframe)` once both timeframes are
filled.

### 8.11 The calendar, tested against 48 million real bars

Every one of these was a claim asserted against hand-written literals in Story
2.5 and is now a reading from stored production data.

| Case                    | Session    | Stored                                    |
| ----------------------- | ---------- | ----------------------------------------- |
| Regular session         | 2025-11-26 | 188,840 bars, `14:30`–`20:59` UTC         |
| **Full closure**        | 2025-11-27 | **absent entirely** — no session, no rows |
| **Half day**            | 2025-11-28 | **102,098 bars**, last bar `17:59` UTC    |
| **Half day**            | 2025-12-24 | **99,172 bars**, max **210** per security |
| **DST, Friday before**  | 2026-03-06 | 390 bars, open **`14:30Z`**               |
| **DST, transition day** | 2026-03-08 | **no session at all**                     |
| **DST, Monday after**   | 2026-03-09 | 390 bars, open **`13:30Z`**               |

**No security exceeded 210 bars on either half day**, and the universe mean was
192.2 — so density scales with session length rather than being an artefact of
it, which is why `bar-completeness.ts` keeps _density_ in a different column from
_completeness_. A report treating 192 against 210 as a gap would call a healthy
Christmas Eve eighteen minutes broken for each of 516 securities.

**And the DST pair is the strongest available evidence that `observed_at` is the
market instant rather than the write instant.** Bars written on 2026-09-08 carry
timestamps six months old whose UTC offset _changes mid-series_, with 390 bars
either side of the transition and none on the transition day. That is
`0004_market_bars.sql`'s "single most damaging line in this story" — a
`default now()` on `observed_at` — proved absent by the data rather than by
reading the migration.

### 8.12 Keeping it current — Task 2.8.7's "nothing runs automatically" is reversed

**The catch-up mechanism already existed and is correct.** `planRequests` splits
the sessions asked for into those NEWER than the ledger's frontier and those
older, and walks the newer ones **forward and contiguously** from `covered.end`.
Nothing had to be built; Task 2.8.6 found it and Task 2.8.7 left its home open.

**But the size of `N` matters far more than it looks**, and this is the trap to
carry. Measured through the real planner, with the frontier a week behind:

| Command          | Requests planned | Genuinely new |  Wasted |
| ---------------- | ---------------: | ------------: | ------: |
| `--sessions 5`   |            **4** |         **4** |   **0** |
| `--sessions 10`  |            **4** |         **4** |   **0** |
| `--sessions 251` |          **193** |             4 | **189** |

A catch-up asks only for recent sessions, which are all `newer`, so §8.7's
intersection problem never arises. A large `N` drags the request set past the
common window's start and re-fetches nearly a year at `0 new`. **Raising the
number does not make a catch-up safer; it makes it expensive.**

**So the store is kept current by a nightly `schedule:` on
`.github/workflows/backfill.yml` running `--sessions 10` at 08:00 UTC.** That
reverses Task 2.8.7's decision that neither the backfill nor the catch-up runs
automatically in V1, and the reversal is recorded rather than quiet:

- **Part of that decision's argument was that the backfill had nowhere good to
  run.** §8.8 measured a laptop as the wrong machine by a factor of thirty-five,
  and gave it a home. That premise is gone.
- **The cost was never the objection and is now measured**: four vendor requests
  and about three minutes a night, and **zero requests** on a night with nothing
  new, because the planner plans none.
- **What Task 2.8.7 was right about survives**: an unscheduled catch-up is what
  makes the store quietly stale, and `bar_coverage.updated_at` — _when what we
  hold last changed_, not _when the backfill last ran_ — is the only field that
  can report it honestly. That field is now the check on the schedule rather than
  the substitute for one.

**The failure mode of a schedule, stated.** GitHub disables a `schedule:` on a
repository with no pushes for 60 days, which is a real hazard for a project
worked on in bursts — and it fails **silently**, which is the shape this
repository keeps finding. The instrument that catches it is `pnpm bars:check`,
whose default window is the ledger's own span, and not this workflow.

> **Amended 2026-09-10: "the store" in the paragraph above means the MINUTE
> store, and the sentence does not say so.** `--sessions 10` carries no
> `--timeframe`, and `backfill.ts`'s default is `1m` — so **the nightly job has
> never fetched a daily bar.** §8.18 is the finding, its measurement and the
> consequence. Nothing here is wrong about the schedule; what is wrong is the
> unqualified word "store", in a document whose own tables (§8.1, §8.16) list
> two timeframes.

### 8.13 Today's session, which the store deliberately does not hold

**The walk takes COMPLETE sessions only** — `resolveSessions` asks for `N + 1`
and drops the newest — and §8.12's catch-up runs at 08:00 UTC, before the open.
So while a session is happening, it is not in the store, and that is a decision
rather than an omission.

**The mechanism to store a partial session exists and behaves correctly**,
measured at a simulated 12:00 ET on a real session:

| Reading          | Value                         |
| ---------------- | ----------------------------- |
| Session          | `13:30Z` → `20:00Z`, 390 bars |
| Requested        | `13:30Z` → `20:00Z`           |
| **Servable end** | **`15:44Z`** — now − 16 min   |
| Would store      | **134 of 390 minutes**        |

`alpacaServableEnd` is what makes that a partial answer rather than a **403**:
`ALPACA.md` §10's recency cliff keys on `end` alone and refuses the whole
request, so an unclamped mid-session request returns nothing at all. The ledger
then records `covered` as the window actually answered for.

**And it self-heals, which was checked with its control.** A later run asking
for the same session plans **1 request**, because the session's close is beyond
the recorded `covered.end`; the control — the same session recorded complete —
plans **0**. So a mid-day fetch cannot leave a permanently half-stored session.

**None of which makes it the right answer to "what is happening now", and three
things say so:**

- **It is always sixteen minutes stale**, which is the wrong instrument for a
  live question.
- **It would put a second feed in this table.** Epic 3's stream is **IEX** and
  everything stored is **SIP**. `0004_market_bars.sql` names _a second feed
  writing into this table_ as the trigger for a per-bar `feed` column, and the
  ledger's one-feed-per-series statement stops being honest that day.
- **Partial sessions change what "we hold this session" means** for every
  reader — Task 2.8.9's coverage column and `bar-completeness.ts` both.

**So today's session is Epic 3's, and the split is by how the data ARRIVES
rather than by how old it is.**

**~~What is genuinely open, and has no owner written down: the read-side
join.~~ SETTLED 2026-09-09 and BUILT — it has an owner, and it is Task 2.9.5.**
The choice was the second of the three below — **stitch the store to a live tail
and label the seam** — with four rules that bound the metered request, recorded
in `MARKET-DATA-API.md` §5. The paragraph is left standing because it is what
handed the decision on. What follows it is the state of the question on
2026-09-08.
When Story 2.9 serves a chart window ending _now_, the window spans a stored
part and a live part from two different tapes. Three shapes, none chosen:
serve only what is stored and let the chart end sixteen minutes ago; stitch the
store to a live tail and label the seam; or have the provider serve the whole
window on demand and store nothing. `PROVIDER.md` §2.4 already refuses to let a
`SeriesProvenance` hide a disagreement, so whichever is chosen has to say which
feed each part came from. **Story 2.9 should take this explicitly rather than
discovering it.**

### 8.14 The deployed run, and a workflow claim that was false

The deployed store was filled from the runner in three dispatches. Both
timeframes reached the depths §2 settled.

| Dispatch                               | Wall clock | Result                                   |
| -------------------------------------- | ---------: | ---------------------------------------- |
| `1d --from 2026-06-01 --to 2026-09-04` | **4m 27s** | 35,214 rows — the rate measurement       |
| `1d --from 2024-01-02 --to 2026-09-04` | **5m 44s** | **345,559 rows**, 672 sessions, complete |
| `--sessions 251`                       | **5h 30m** | 39,174,100 rows, 208 of 251 sessions     |
| `--from 2025-09-08 --to 2025-11-10`    |          — | the remaining 46 sessions                |

**The deployed daily count matches the local one exactly at 345,559**, which is
a stronger check than comparing ranges: the same 34 requests against the same
vendor produced the same rows on two different machines into two different
databases.

**The runner is ~35× the laptop and the arithmetic that matters is transactions
rather than rows.** 4 chunks × 518 securities is ~2,072 transactions in ~150 s —
**13.8/s, ~72 ms each** — against ~0.4/s from Singapore. The daily backfill that
projected to **~4.5 hours** from a laptop took **5m 44s** from the runner.

**And a claim this workflow made about itself was false, found by hitting it.**
`backfill.yml` said its `timeout-minutes` guard "stops first, so a run that runs
out of time ends with a readable ledger state … rather than a red X and
nothing". It does not. **`timeout-minutes` expiry CANCELS the job**, and a
cancelled job does not let `if: always()` steps finish: both summary steps
started at `17:05:32Z` and were dead by `17:05:33Z`. The run did five and a half
hours of correct work and reported none of it.

The fix is a **signal** rather than a job cancellation, which is the shape
`deploy.yml`'s `timeout 120 pnpm migrate` already had:
`timeout --signal=INT --kill-after=300 17400 pnpm backfill …`.
`run-backfill.mjs` handles `SIGINT` as a graceful stop — it finishes the request
in flight, writes its ledger row, prints the summary and exits **0**, because
`summarise` treats `interrupted` as a run that did exactly what it was asked and
simply did less of it. So the deadline now ends in a green job with a report and
a resume point, and `timeout-minutes` is a backstop rather than the mechanism.

**The general form, which is this repository's own rule arriving somewhere
new:** a guard whose failure branch has never been executed is a guess. Task
1.11.7 found `deploy.yml`'s revision-wait deadline wrong the same way — right
pattern, wrong number, discovered only by running the failure branch.

**One operational note.** The `developer-laptop` firewall rule moved for the
**eighth** time overnight (`122.11.246.132` → `58.182.90.91`), and the symptom
from `psql` is `Connection refused` rather than the timeout the pool reports.
The runner is immune, which is one more argument for where the backfill lives.

### 8.16 The deployed store, and open decision 2 finally decided

**The deployed store is complete and matches the local one to the digit.**

| Timeframe |       Deployed |          Local | Sessions | Securities |
| --------- | -------------: | -------------: | -------: | ---------: |
| `1m`      | **47,682,213** | **47,682,213** |      251 |        518 |
| `1d`      |    **345,559** |    **345,559** |      672 |        518 |

Two backfills, two machines, two databases, one vendor — **identical counts**.
That is a stronger statement than any range comparison: it says the walk is
deterministic given the same window, and that neither run silently dropped or
duplicated anything. `bar_attempts` holds **2,953 `ok` rows and zero
`coverage-gap`** on both, so §8.15's fifty are fully recovered.

Coverage: **515 securities at the full year**, plus `Q`, `FDXF` and `HONA` at
their listing dates.

**And the size figures reproduce almost exactly**, which is worth saying because
the two servers are different hardware, different architectures and different
Postgres builds:

| Reading         |     Deployed |        Local |
| --------------- | -----------: | -----------: |
| Heap            | **5,001 MB** | **5,001 MB** |
| Indexes         |     3,948 MB |     3,944 MB |
| Total           |     8,951 MB |     8,947 MB |
| Bytes a row     |      **195** |      **195** |
| Index % of heap |    **79.0%** |    **78.9%** |

`market_bars_pkey` reads **2 scans against `market_bars_unique_bar`'s
56,031,818** — so §8.5's finding holds deployed, and the two scans are almost
certainly this task's own `pg_stat` queries.

#### Query performance, and the reason the deployed reading was demanded

`EXPLAIN (ANALYZE, BUFFERS)`, against 47.7M rows on the B1MS:

| Pattern                          |   Local | Deployed COLD | Deployed WARM |
| -------------------------------- | ------: | ------------: | ------------: |
| A. one symbol, one month         | 11.8 ms |       49.4 ms |   **26.7 ms** |
| B. a calendar window, 5 sessions |  2.1 ms |       16.8 ms |    **7.6 ms** |
| C. the universe at one instant   | 28.2 ms |  **3,213 ms** |    **4.2 ms** |
| D. a year, one symbol            | 61.6 ms |  **5,373 ms** |   **28.3 ms** |

**The plans are identical to local in every case.** The two-orders-of-magnitude
cold figures are **entirely disk**: C reads 1,380 blocks and D reads 2,018 from a
P4 at 120 IOPS, and `shared_buffers` is **256 MB against an 8.95 GB table** —
2.9%. Warm, every buffer is a hit (`hit=2903, read=0`) and the breadth query is
**faster deployed than locally**.

**This is exactly why §1 refused to take this measurement on a laptop**, and the
refusal was right for a reason slightly different from the one it gave: it
expected CPU credits to be the constraint, and the constraint is the buffer
cache.

#### Open decision 2 — TimescaleDB: **DECLINED, now on a measurement**

§1 declined it provisionally and named this reading as the trigger. Taken:

- **The primary access pattern is served by the existing index at 7.6–26.7 ms
  warm**, on a plan identical to the local one. Chunk exclusion would be
  competing with a btree that already answers, not adding to it.
- **The one genuinely slow cold query is C**, the cross-sectional breadth
  scan — and `PRODUCT_SPEC.md` §37's rule applies exactly: _say whether a plain
  index fixes it before reaching for a second data technology._ It would, and
  dramatically. C currently reaches 493 rows through **587 index searches over
  2,903 buffers** using Postgres 18's skip scan; an `(observed_at,
security_id)`-leading index makes it one tight range scan over a handful of
  pages. That is the cheaper experiment and it is not even needed yet, because
  warm it is **4.2 ms**.
- **A hypertable would not fix the cold case anyway.** The cost is reading 2,903
  pages off a slow disk into a 256 MB cache; partitioning changes _which_ pages,
  and the skip scan is already highly selective. What fixes it is a narrower
  index or more memory, both of which are cheaper than a second data technology.

**So: do not enable it.** The reversal triggers are re-stated at their new
weight — **Epic 5 issuing the cross-sectional query in anger** (at which point
build the plain index first and measure again), or the row count growing an
order of magnitude, which at this universe size means a multi-year store rather
than a one-year one.

The reversal cost is unchanged and worth restating: `azure.extensions`, then
`shared_preload_libraries` (**a server restart**), then `CREATE EXTENSION` — and
**locally a different image entirely**, which reaches `LOCAL_DATABASE_VERSION`
and `pnpm test:database`.

#### The platform meters, re-read

| Metric                  |      Reading | Alert threshold |
| ----------------------- | -----------: | --------------: |
| `storage_percent`       |   **42.89%** |             80% |
| `storage_used`          | **14.37 GB** |               — |
| `backup_storage_used`   |   **874 MB** |  32 GB included |
| `cpu_credits_remaining` |      **286** |               5 |
| `cpu_percent`           |        21.5% |               — |

**A full year of both timeframes for 518 securities uses under half the disk**,
so `psql-storage-80pct` has real headroom rather than nominal, and §8.4's
~2.4-year horizon is confirmed from the other direction.

**Backup storage is 874 MB against 32 GB included**, which closes a question
this task raised and could not answer earlier: the backfill's marginal cost is
**£0**, and backup overage — the one meter that could plausibly have moved — is
nowhere near.

**And one recorded figure is corrected.** Task 2.1.5 recorded that _"an idle
Burstable server banks almost nothing — `cpu_credits_remaining` sits at the 30
cap"_. It reads **286** after hours of sustained write. Whether the cap was
misread then or the accrual model differs from what was assumed, **30 is not the
ceiling** and a design that budgeted against it was budgeting against the wrong
number. Re-read rather than cited.

### 8.17 Three credential lifetimes in one job, and only one of them mattered

The recovery run stored all 859,476 missing bars and exited **0** — and the job
still went **red**, on the reporting step, one second after the backfill
finished:

```
AADSTS700024: Client assertion is not within its valid time range.
Current time: 02:19:52, assertion valid from 00:36:29, expiry 00:41:29
```

**`azure/login` does not survive a long job.** GitHub's OIDC client assertion is
valid for **five minutes**; the Azure CLI exchanges it for an access token good
for about an hour, and when that expires it attempts a refresh using the
long-dead assertion. At 103 minutes in, the first `az` call in a later step
failed.

**The write path was unaffected, and the mechanism is worth knowing.** The
database token was minted once at the start and is valid ~69 minutes; the run
lasted 103. It survived because under continuous writing the pool's connection
is **never idle for `POOL_IDLE_TIMEOUT_MS`**, so it is never re-established, and
Postgres does not re-check credentials on a live connection.

So a long backfill has **three** credential lifetimes in it — an OIDC assertion
at 5 minutes, a CLI token at ~1 hour, a database token at ~69 minutes — and the
only thing that kept the important one alive was connection reuse rather than
any design for it. **Task 2.1.6's "whether an open connection outlives its own
token was NOT verified, because the case is structurally unreachable" is no
longer unreachable**: a backfill reaches it on every run over an hour, and the
answer is that it does outlive it.

The fix is to re-authenticate before any step that runs after the backfill,
which is one `azure/login` with `if: always()`.

---

## 9. The store on screen — Task 2.8.9

The one section of this document that is about a **page**, and it is here rather
than only in the task file because the store becoming readable from a public URL
is a property of the store's observability rather than of the frontend.

### 9.1 What the page reads, and what it must never read

`/securities` carries a `coverage` record per security: the covered window as
two ISO instants, the timeframe, and the bar count. It comes from
**`listCoverage()` against `bar_coverage`** — a few hundred rows however many
bars exist — and **never from `market_bars`**. That is the property §8.6's query
work depends on staying true: a page load that scanned 48 million rows would
arrive in Story 2.9's response-time measurements as a mystery with no obvious
author.

**Minute bars only.** The ledger holds 1,036 rows for 518 securities and the
page sends the `1m` half, stated in the contract rather than implied. The daily
depth is a different and deeper window (2024-01-01) and belongs beside the chart
that reads it, which is Story 2.11's per-security route.

**Amended 2026-09-09 by Task 2.9.4 — the ledger now holds two more columns, and
the page does not read them.** `0007_bar_coverage_provenance.sql` adds `provider`
and `feed`, because a `BarSeries` cannot exist without provenance and
`0004_market_bars.sql` deliberately stores none per bar. It is on the **ledger**
rather than on the bars for the reason the page depends on: ~1,036 rows is two
constants stored a thousand times, where per-bar would be forty-eight million
copies. The `/securities` payload is unchanged — what it sends is still the
window, the timeframe and the count — and the decision, its three rejected
alternatives and its reversal trigger are in
[`MARKET-DATA-API.md`](../story-09-market-data-api/MARKET-DATA-API.md) §10.

### 9.2 The endpoint reconciles against the ledger exactly

Read from the local store on 2026-09-09, against `psql` on the same database:

| Reading              |        Endpoint |         `bar_coverage` |
| -------------------- | --------------: | ---------------------: |
| Coverage records     |         **518** |                **518** |
| Bars                 |  **47,682,213** |         **47,682,213** |
| Distinct start dates | 515 / 1 / 1 / 1 |        515 / 1 / 1 / 1 |
| Timeframes sent      |       `1m` only | `1m` and `1d` in table |

Three securities short of the full year, which is §8.1's `Q`, `FDXF` and `HONA`
arriving on a screen. **The wire is 150,660 B and 12,831 B gzipped** at 518
securities with coverage — the compression ratio _improves_ with the coverage
array, 6.7:1 to 11.7:1, because 515 records carry the same two instants.

### 9.3 Two facts per row, and the three the ledger holds that stay off it

Rendered: a **duration** and a **start date** — `1y from 2025-09-08`. Withheld:
the **bar count**, which is a scale claim and appears once in the summary line;
`updated_at`, which is not on the wire at all; and **any density figure**, for
§7.3's reason — 364.3 bars per security-session against a nominal 390 makes a
percentage read ~93% for a completely healthy store, and that number is
liquidity rather than completeness in the one place a reader would take it for
the latter.

**And no join to `bar_attempts`.** §7 can separate a blocked symbol from a
spin-off and the page deliberately does not: the engineering word for one of
them is `coverage-gap`, `pnpm bars:check` is where an operator's question
belongs, and to a user the true statement in both cases is the same one.

### 9.4 The measured argument against a coverage bar

**515 of 518 securities start on the same day.** The entire information content
of the column is the three that do not, so a bar chart draws 515 identical full
bars and reads as a progress indicator for something that is not in progress.
What makes the exception legible instead is **alignment** — right-aligned
fixed-width `YYYY-MM-DD` in a column of `tabular-nums` — which costs no ink, no
chip and no second vocabulary, and which is what Task 1.4.3's 14.3px measurement
was bought for.

The deployed store matches the local one to the digit (§8.16), so the deployed
page is predicted to read the same summary line character for character. **Task
2.8.10 owns confirming that**; it has not been read.

---

## 8.18 The nightly catch-up fills one timeframe of two — found 2026-09-10

**Logged against this story rather than fixed in it. Nothing here is a code
defect; the deployed page is faithfully reporting what the store holds.**

Found from the other end, by a reader looking at the shipped `/securities` page
on 2026-09-10 and asking why the **Last close** column said **`2026-09-04`**.

### What was measured

Against the deployed backend, not inferred:

| Reading                                                      | Answer                                   |
| ------------------------------------------------------------ | ---------------------------------------- |
| `/securities` — the session on every one of 518 `lastCloses` | **`2026-09-04`**, all 518, no exceptions |
| `/securities` — the `1m` coverage `end` on every row         | **`2026-09-08T20:00:00.000Z`**           |
| `GET /market-data/bars?symbol=NVDA&timeframe=1d&sessions=10` | **7 bars, newest `2026-09-04`**          |

So the page shows a **daily** figure from the 4th beside a **minute** coverage
figure from the 8th, and both are true. `routes/securities.ts` reads the close at
`CLOSE_TIMEFRAME = "1d"` — deliberately, because it is 345k daily rows against
47.7M minute ones — and reports coverage at `REPORTED_TIMEFRAME = "1m"`. **Two
timeframes, one row, and nothing on the screen says so.**

### The cause, and it is one line

`.github/workflows/backfill.yml` runs the catch-up as:

```
BACKFILL_ARGS: ${{ inputs.args || '--sessions 10' }}
```

with no `--timeframe`, and `backfill.ts` declares `let timeframe: Timeframe =
"1m"`. **The scheduled job has therefore only ever filled minute bars.** The
daily table was filled once, by hand, and this document already records the run
that did it — §8.8's table, `1d --from 2024-01-02 --to 2026-09-04`, 345,559 rows,
672 sessions. **`2026-09-04` on the page is that `--to`, and nothing has moved it
since.** It is also, not coincidentally, the worked example in `backfill.ts`'s
own usage text and in the workflow's `args` input hint — so the frozen date is
visible in three places in this repository and reads as documentation in all
three.

### How far behind it actually is: two sessions, not six days

`2026-09-07` is **Labor Day**, and it is in the checked-in calendar
(`market-calendar.ts`) as `closed`. So the daily table is missing **2026-09-08
and 2026-09-09** — two sessions. The minute table is one session behind for an
unremarkable reason: the only scheduled run at the time of writing was
`2026-09-09T12:43Z`, before the 9th had closed.

### Why this is a finding rather than a repair

**The fix is one line — a second `--timeframe 1d --sessions 10` pass in the same
job — and it was deliberately not taken by the task that found it**, for two
reasons that are both about ownership rather than difficulty. It changes a
**scheduled** workflow that spends Alpaca quota, which is a decision rather than
an implementation detail; and the backfill, its ledger and its schedule are this
story's subject, not Story 2.9's. A task reaching across stories to change a cron
is how a story stops having an owner.

### What this says about the instruments, which is the part worth keeping

**`pnpm bars:check` would have caught this and was never pointed at it.** The
workflow's own post-run report is `pnpm bars:check --timeframe 1m`, hard-coded —
so the one instrument that reports staleness honestly is asked about the one
timeframe that is never stale. §8.12 already names the silent-schedule hazard and
names `bars:check` as the instrument that catches it; **this is the same hazard
one level down, and the instrument was configured past it.**

And `bar_coverage.updated_at` — _when what we hold last changed_ — is doing its
job perfectly here. It is simply that nobody read it for `1d`.

### The condition for fixing it, as a condition

**The first screen whose correctness depends on a daily close being current.**
Story 2.9's `/securities` column is not quite that: a close labelled with its own
session date is honest, if stale. Story 2.12's price chart and Epic 5's anomaly
detection both are — a percentile computed against a daily series that silently
ends two sessions ago is a wrong number that looks right, which is the outcome
`PRODUCT_SPEC.md` §35 rules out. **Either of those firing makes this a task
rather than a note.**

**A second, cheaper condition that should fire first:** the next change to
`backfill.yml` for any reason at all. The fix is one line in a file that would
already be open.
