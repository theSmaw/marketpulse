# ADR 0020 — The bar store, the backfill, and what a completed backfill certifies

**Status:** Accepted
**Date:** 2026-09-09
**Delivered by:** Epic 2, Story 2.8 (Tasks 2.8.1–2.8.10)

## Context

ADR 0019 shipped a client that fetches real bars and prints them into a terminal. This
story stores them. `market_bars` holds **48.03 million rows** of real US equity history —
47,682,213 minute bars across a year and 345,559 daily bars across two and a half —
locally and on the managed server in North Central US, and the two are identical to the
digit.

**This ADR is unlike the nineteen before it in one respect that governs how it should be
read, and the difference is not the one ADR 0019 named.** ADR 0019's figures were a third
party's behaviour on one day. These are a **property of a populated database**. A clean
clone has no bars, so half of this story's acceptance criteria cannot be re-taken from
one: re-running the backfill to prove them would take hours and spend a metered budget for
a result Task 2.8.8 already recorded. So the closing method split, and every measurement
below is labelled: **re-taken from a clean clone**, or **re-read from the deployed store**.

The working record is [`BARS.md`](../../planning/epic-02-security-universe-historical-data/story-08-historical-bar-ingestion-and-storage/BARS.md),
which carries the arithmetic, the query plans and the run logs. This document carries the
decisions.

## Decisions

### 1. The store is a RECORD of what was observed, and not a cache

Open decision 1, and it was settled by the user's own question — _"why do we have a
database if we are pulling all our information from another remote source?"_ It is the
right question, and the reframing that answered it belongs here verbatim rather than the
four arguments that followed it:

**`PRODUCT_SPEC.md` §30 lists ten tables and only `market_bars` comes from Alpaca.** One
more (`filings`) comes from the SEC. The other eight — `anomalies`, `relationships`,
`investigations`, `investigation_steps`, `findings`, `evidence`, `workspace_events`,
`securities` — have no external source at all. **So the database exists regardless**, and
the question was never "should there be one"; it was only ever whether that one table
joins it.

Four things then decide that it should, and none of them is that a database is normal:

- **§36 requires it in so many words.** Its own worked failure state is _"Live feed
  disconnected — displaying data through 10:42:17."_ That sentence is only writable if the
  data through 10:42:17 was stored. A pass-through's answer to a vendor outage is an error
  screen, which is exactly the collapse §36 forbids. **Degrading incrementally requires
  something local to degrade to.**
- **Replay is not "show me old prices".** §24 wants append-only events including
  `AnomalyDetected` and `WorkspaceCommandApplied` — replay reconstructs what the system
  **knew and did**, and half of that has no vendor to re-fetch it from.
- **§11's detection needs a rolling distribution per security** — ~60 days of 5-minute
  returns, and volume against the median for that time of day. Held in memory that is a
  cold re-fetch on every deploy at `minReplicas: 1`; held properly it is a database written
  worse.
- **Invariant 5 needs the raw data to still exist.** Evidence carries a raw-data reference,
  and a reference into a discarded HTTP response points at nothing.

Underneath all four: Postgres reads are free and unlimited, Alpaca's are **200/min**
(measured five times across five bursts), and pass-through puts vendor latency inside §28's
<500 ms interaction budget for every one of §17's eighteen agent tools.

**Where pass-through is right, and we already do it:** §7.2 asks V1 to detect that a filing
occurred and let the user inspect it, so filing metadata is stored and the document is
fetched on demand. Nobody is mirroring EDGAR. The line is whether the product must be able
to answer without the vendor.

### 2. Bars are stored UNADJUSTED, and the "adjusted on read" half was not achievable

The storage half is confirmed with a stronger argument than it had: a stored _adjusted_
series is retroactively wrong after a split unless something re-fetches it, which is a
cache's answer, and a cache is what this store is not.

**The other half of that decision was written as "adjustment is applied on read" and it
cannot be done as written.** Adjusting on read needs corporate-action data that nothing in
the plan acquires — not the bars endpoint, not the universe loader, not Story 2.7's scope.
What replaces it is cheaper and honest: **the vendor performs the adjustment**, so an
adjusted series is _requested from a provider_ rather than computed here, and V1's read
path serves raw and **says so** in the series' provenance record.

`PROVIDER.md` §3.6 names the gap that leaves, and it is a real one: **a split inside the
stored window charts with a real step in it, beside a label reading `raw`.** Two repairs
are recorded and neither is built.

### 3. Nothing is deleted, and the trigger is disk pressure rather than age

Decision 1 applied. What makes it safe rather than reckless is arithmetic rather than
optimism: **196 bytes a row including indexes**, measured repeatedly across a run growing
from 8M to 47M rows and reproduced on the managed server, against Story 2.1's **~22.5 GiB
usable** (32 GiB less 3.74 GiB of filesystem overhead, read-only under 5 GiB free).

At the 518-security universe that is **8.66 GiB a year** of minute bars and **~2.4 years to
read-only** against the calendar's ceiling. Daily bars are noise at every universe size,
which is what makes storing them rather than deriving them free.

The `psql-storage-80pct` metric alert (severity 2, enabled, re-read 2026-09-09) is what
turns "nothing is deleted" from a policy into one with an instrument behind it, and this
story is the first time it has had anything to watch.

### 4. "We do not have that" is an ANSWER rather than a bug — and it took three mechanisms

This is what criterion 4 is really asserting, and the conclusion is one line while the
mechanism under it is three separate decisions.

- **The attempt log records SUCCESSFUL EMPTY ANSWERS as well as failures.** A session the
  vendor answers successfully with no bars writes no bars **and** extends no ledger — an
  empty `BarSeries` has no `covered` window — so without a third table it is recorded in
  **neither**. Mid-walk that is absorbed, because the ledger's range is a union; at the
  **frontier** it reads as _never asked_ about a day we asked about. So `bar_attempts` holds
  every attempt that left no bars, and `ok` is a member of its vocabulary meaning **answered
  and empty**.
- **Completeness and density are two columns with two names**, and this is the decision most
  likely to be undone by somebody tidying. Only **8 of 28** large constituents traded in all
  390 minutes of an ordinary session, at a universe-wide mean of **364.3**. A report that
  treats _calendar minus arrived_ as a gap announces that the store is permanently ~7%
  broken every day forever — which is the half-day failure arriving on the other 240 days of
  the year — and the reliable outcome is that people stop reading the report. `pnpm
bars:check` therefore prints **94.7% density** under a paragraph saying density is a
  liquidity measure, and prints completeness separately as a set difference.
- **The delisting signal is REPORTED and never WRITTEN.** `UNIVERSE.md` §15.3 _produced_ the
  overwrite that decides this: a `status` written by anything other than the loader is
  silently reverted by the next deploy's `pnpm universe`, reported as an ordinary
  `1 updated`. So adopting a `delisted` member is two decisions rather than one. This is
  Task 2.1.7's shape — the instrument says _whether_ and a person decides _what to do_ — and
  it discharges the ownership Story 2.7 handed here.

### 5. The backfill asks per SESSION, which is a 2.35x storage decision dressed as a request detail

A window spanning a night collects extended-hours bars at **~2.35x** — 22,952 bars for 25
sessions against 9,750 regular-hours ones, so **57.5% of a month's bars are extended
hours** — and this is true with explicit instants, not only with bare dates. Requesting per
session measures at exactly 1.00x.

That is the difference between **~6.1 GiB a year and ~14.2 GiB**, and therefore between
**~2.4 years of headroom and ~1.6**. The sizing number and the request shape are one
decision, and the request shape is the half that looks like an implementation detail.

### 6. The walk is backwards from the present, and monotonicity is enforced by the ledger

Not a convention the command honours: `bar_coverage` **refuses** a write that would leave a
trading session inside its covered range unfetched. So the direction is a decision and
honouring it is not optional.

What that buys the rest of the system is the reason to record it: **every session inside the
ledger's covered range was attempted**, which is what makes `pnpm bars:check`'s completeness
computation a set difference against one interval rather than a per-session join over 48
million rows.

### 7. The backfill is SEQUENTIAL, and pacing lives in it while retry lives in a wrapper

Two arguments for sequential, and the second only existed once it had been measured: the
ledger structurally refuses concurrency across sessions (eight in flight is eight sessions
completing out of order), and a sequential year measures **~72 minutes from a runner**
against a ~26-minute rate-limit floor. The gap that made concurrency look worth building is
46 minutes, not the ~3.6 hours every prediction in this story carried.

**Pacing is the backfill's and retry is `withRetry`'s**, and ADR 0019 §6 already has the
numbers: 320 concurrent calls gave 91 answers bare, 206 through the wrapper at a 3 s
deadline (606 HTTP requests) and 263 at 20 s (1,473). **Retry helps one caller and does not
help a crowd** — 2.5 requests per extra answer, then 15, sustaining 73 req/s against a
3.23/s refill. That is evidence rather than an argument, and it is why the backfill paces
instead of retrying harder.

`BACKFILL_PACE_MS` is **350 ms against a measured ~310 ms token**, so the sustained rate
sits _just under_ the refill by construction and a burst can never accumulate. Across 247
sessions and ~5,200 requests the log holds **zero `429`s, zero retries, zero timeouts**.
Read that as the pacer being conservative by design rather than as headroom discovered.

### 8. The resume point is `covered.end` — a vendor entitlement made structural

Holding `start` back and walking `end` towards now, SIP answers `200` at 15 minutes ago and
**`403` at 14**, with `{"message": "subscription does not permit querying recent SIP data"}`.
Three properties each change a design: it keys on **`end` alone**; it **refuses the whole
request** rather than answering partially, so "Friday's open to now" returns _nothing_; and
it applies to daily too.

So _"from the last bar I stored, to now"_ stores **nothing on every run**.
`alpacaServableEnd` clamps `end` to `now − 16 min` before the request and reports the clamp
as `coverage.covered` — which is what `SeriesCoverage` exists for, and what makes the
resume point the ledger's statement rather than the newest bar.

**Amended 2026-09-10 (Story 2.9's close).** Every enumeration of the ledger in this
document — decision 4's, decision 8's, and _What the coverage column certifies_ — was
written before `bar_coverage` had provenance on it. `0007_bar_coverage_provenance.sql`
(Task 2.9.4) added `provider` and `feed`, ~1,036 rows rather than forty-eight million,
because a served series cannot exist without provenance and `market_bars` deliberately
holds none per bar. Nothing above is reversed: the resume point is still `covered.end`,
the ledger is still a statement rather than a count of rows, and it still certifies
nothing about density or freshness. What is new is that the ledger is now also **the
answer to "which tape is this"**, and that `market-bars.ts` **refuses** a write whose
source disagrees with the row it would extend — which is decision 1's correction gap
gaining a mechanism on one axis. See ADR 0021 and `MARKET-DATA-API.md` §10.

### 9. The backfill runs from a RUNNER, and the catch-up is SCHEDULED

Open decision 4, corrected by measurement rather than abandoned. ~250 ms per round trip from
a laptop turns 97 minutes into **33 hours**; the same code inside Azure is **~35x faster**.

**The general form is the transferable part, and this repository had recorded the same fact
twice as a curiosity before it ever decided anything** — the deployed browser check being
faster on a runner than on the laptop, and `pnpm universe` at 0.428 s against ~3 s. Geography
is a design input for anything that makes many small round trips.

Task 2.8.7 decided that neither the backfill nor the catch-up would run automatically, and
**Task 2.8.8 reversed half of it**: `.github/workflows/backfill.yml` runs `--sessions 10` at
08:00 UTC. The initial backfill stays a deliberate act (`workflow_dispatch` only). A small
`--sessions N` looks like a tuning detail and is the difference between **4 requests and
193**.

### 10. TimescaleDB is DECLINED, and it was decided against a measurement rather than in advance

Task 2.8.1 refused to take this on a laptop and the refusal was right for a reason slightly
different from the one it gave: it expected CPU credits to be the constraint.

`EXPLAIN (ANALYZE, BUFFERS)` against 47.7M rows on the deployed B1MS: **the plans are
identical to local in every case**, and warm performance is **4.2–28.3 ms** across all four
of Story 2.9's access patterns. The alarming cold figures — 3,213 ms and 5,373 ms — are
**entirely a 256 MB `shared_buffers` against an 8.95 GB table on a 120-IOPS P4 disk**, which
is 2.9%. **A hypertable would not touch that.**

It is also four changes rather than one: two server parameters, a restart, and a **different
local image** — which turns `LOCAL_DATABASE_VERSION` from a pin on a Postgres major into a
pin on a vendor's distribution of one, reaching `pnpm test:database`, which creates and drops
its own database every run.

The cheaper experiment `PRODUCT_SPEC.md` §37 implies — a narrower `(observed_at, …)` index —
_would_ touch the cold path, and is not needed yet. **The trigger is a query Story 2.9 needs
that this schema cannot serve**, measured on the deployed instance rather than a laptop.

### 11. The index nobody reads is KEPT, and the price is recorded

A decision no previous task could have taken, because it needs a populated store. Re-read
from the deployed server on 2026-09-09:

| Index                                                              |         Size |      Scans |
| ------------------------------------------------------------------ | -----------: | ---------: |
| `market_bars_unique_bar` — `(security_id, timeframe, observed_at)` |     2,920 MB | 56,031,818 |
| `market_bars_pkey` — the surrogate `id`                            | **1,029 MB** |      **2** |

Indexes are **79.0% of the heap**, and **1,029 MB of that serves nothing at all** — 26% of
the index bytes, 11.5% of the whole table, plus write amplification on every one of ~48M
inserts. The two scans are almost certainly this task's own `pg_stat` queries.

**This is a convention with a price rather than a defect.** `migrations/README.md` §3
requires an identity primary key on every table and `market-bars.database.test.ts` asserts
it, because Task 2.2.5 deliberately made it a checked convention; `0004`'s own comment gives
the argument, that a three-column natural primary key would propagate three columns into
every future foreign key referencing a bar. That argument was made against no measurement and
now there is one. **The decision is to keep it and record the price**, on the standing rule
that an index question is settled against a reader rather than in advance.

**The reversal trigger is the first thing that references a bar by `id`**, or disk pressure
arriving before it does. Whoever takes it should know it is a migration on a populated table
plus an edit to a checked convention.

### 12. `observed_at` is the market instant, and production data proves it

`0004_market_bars.sql` calls a `default now()` on `observed_at` "the single most damaging line
in this story", because it would quietly turn _when it happened_ into _when we wrote it_ on the
one column Epic 13's replay keys on.

**It is proved absent by the data rather than by reading the migration**: bars written this
morning carry timestamps six months old whose UTC offset **changes mid-series** across the
2026-03-08 DST transition — 14:30Z open before it, 13:30Z after, 390 bars both sides, and no
session on the transition day itself. That is the strongest available evidence that invariant
4's foundation is sound.

## What a completed backfill certifies, and what it does not

### What it certifies

Re-read from the deployed store on **2026-09-09**, and reproducing Task 2.8.8's readings
exactly:

- **`market_bars` holds 47,682,213 minute bars and 345,559 daily bars**, across 518
  securities in both timeframes, `1m` spanning 2025-09-08 13:30Z to 2026-09-04 19:59Z.
- **The ledger and the bars agree exactly.** `bar_coverage` holds 518 series per timeframe
  and its `sum(bar_count)` is **47,682,213** and **345,559** — the same numbers, from a table
  that never scans the bars.
- **Re-running changes nothing**, proved by fingerprints over every column including
  `recorded_at`: eleven re-fetched sessions re-offered 2,012,055 bars for `0 bars stored, 0
corrected, 2,012,055 unchanged`, and all three tables' fingerprints were identical either
  side.
- **An interrupted run resumes**, proved by a real unplanned interruption rather than a
  manufactured one, because each session is its own transaction.
- **Storage is 46.30% of the disk** — `storage_used` 14.45 GiB, `backup_storage_used` 0.82 GiB
  against 32 GB included.
- **`bar_attempts` holds 2,953 rows and every one is `ok`.** No `coverage-gap`, no failure of
  any kind, on either store.

### What it does NOT certify — and this list is the longer one deliberately

- **Nothing about a CORRECTION.** V1 stores one row per bar; a correction overwrites it and
  `recorded_at` moves. So **Epic 13 replays a bar as currently known rather than as known at
  the time.** That is a real gap in the replay guarantee, taken deliberately — a second row
  per bar means a version predicate on every read, which is a _second_ invisible predicate on
  top of `securities.status`. **The reversal trigger is the first observed correction**, and
  nobody has seen one.
- **Nothing about EXTENDED-HOURS completeness**, because the window is deliberately the
  regular session (decision 5). A pre-market gap is not a gap.
- **Nothing about a security's history BEFORE ITS LISTING.** Three of the 518 start later than
  the rest — `Q` (2025-11-03), `FDXF` (2026-06-01), `HONA` (2026-06-15) — and `pnpm bars:check`
  reports them under a heading that says a short series "means something is wrong with us".
  **It cannot tell a listing date from a blocked symbol**, and it deliberately does not join
  `bar_attempts` to try.
- **Nothing about the FEED across the table's two halves.** Everything stored is SIP; Epic 3's
  live bars are IEX. `market_bars` will hold two tapes and the row does not say which.
- **Nothing about COLD query performance.** Every plan measured warm is single- or
  low-double-digit milliseconds and the same plans cold are two orders of magnitude worse, on
  the same instance, minutes apart. Story 2.9's response-time work will meet this and must not
  read decision 10's warm column as a promise.
- **Nothing about a run that was INTERRUPTED mid-session-across-the-universe.** A session is
  not atomic across 518 securities, so a cancelled run left it written for 468 and not 50 —
  and the next run was then correctly refused for exactly those 50 by the ledger's contiguity
  check. Everything behaved; the point is that _"the backfill completed"_ and _"the store is
  coherent"_ are different claims and only the ledger can make the second.
- **Nothing about a job longer than an hour.** `azure/login`'s OIDC assertion is valid five
  minutes and the CLI token about an hour, so a later step in a 103-minute job failed on
  `AADSTS700024` **after** the backfill had stored all 859,476 rows and exited 0. An
  operator-run backfill likewise outlives its own credential — a full-year run is ~90 minutes
  against a ~69-minute token — and what makes that survivable is decision 8 being _used_
  rather than described: the run is re-issued with a fresh token and resumes from the ledger
  at zero vendor cost.
- **Nothing about the PAGES inside a walk.** `BACKFILL_PACE_MS` paces _provider calls_, and
  `fetchManyBars` pages internally with no pacing between pages — measured at ~1.3 pages a
  second against a 3.23/s refill, so it does not breach the limiter today and **nothing checks
  that it stays true**. The trigger is a `rate-limited` outcome on a run this pacer was meant
  to keep under the limit, at which point the pace belongs _inside_ the provider and
  `PROVIDER.md` §8.8 has to be revisited rather than worked around.
- **Nothing about the limiter under load, because the backfill never approaches it** (decision
  7). Zero `429`s is the pacer's design showing, not the limiter's ceiling being found.
- **And a green database suite certifies nothing about the WINDOW SHAPE.**
  `backfill.database.test.ts`'s assertion that no stored bar falls outside the sessions walked
  **cannot fail**, because `fixture-corpus.ts` is synthetic and has no extended-hours prints to
  leak — widening the window to three sessions leaves it green, measured. It ships with a
  non-vacuity guard and a comment saying so. That is Task 1.13.6's blind-renderer problem in a
  new place, and it belongs in one paragraph with the other two: **a check that cannot see
  something must say so.** The third is `pnpm bars:check`'s delisting signal, which reads daily
  bars and prints `BLIND for N of these series` when there are none, because on its first live
  run it reported AMD and MSFT as delisted while they held 3,900 and 3,120 minute bars.

### What the coverage column on `/securities` certifies

Task 2.8.9 put the store on screen and the deployed page was read in a browser on 2026-09-09,
after the merge that closes this story:

> **518** securities tracked · **11** sectors · **15** ETFs · all with history · **47.7M**
> minute bars · through **2026-09-04**

with `AAPL` reading `1y from 2025-09-08` and the three later listings reading `10mo`, `3mo`
and `3mo`. The API's `sum(barCount)` is **47,682,213**, reconciling with the deployed
`bar_coverage` exactly.

**It reports the ledger's statement**, so it certifies that we asked for a window and were
answered — and **nothing about density**, because a bar count below `minuteBars` inside that
window is liquidity rather than ingestion; **nothing about why** a history is short; and
**nothing about freshness**, because `updatedAt` is deliberately not on the wire. A reader who
takes `1y from 2025-09-08` to mean "complete" is reading more than the column says.

**There is deliberately no coverage bar**, and that was settled by a measurement rather than a
preference: **515 of 518 securities start on the same day**, so a bar chart draws 515 identical
full bars to communicate three exceptions and reads as a progress indicator for something not
in progress. The design target is the exception, and what makes it legible is **alignment** —
right-aligned fixed-width dates — rather than ink, a chip or a second vocabulary. That is Task
1.4.3's `tabular-nums` measurement finally spent on the thing it was bought for.

## The honest gap this story creates, and it is the largest one open

**The temporal seam is now load-bearing on data.** ADR 0015's gap 4 has been carried for three
stories against progressively less: first against a module nobody had written, then against
`securities.ts`, whose table has **no `observed_at` at all** — so the plugin would have had
nothing to filter and honouring the seam cost nothing.

Story 2.8 ends that. `market-bars.ts` reads `observed_at` on every query against **48.03
million timestamped rows**, and it is the module Epic 13's replay clock exists to constrain.
Five modules now build their own `Kysely` handle and none of them exports it, so the
convention is held in five places **by discipline and in zero by a compiler**. The plugin
`DATA-LAYER.md` describes is still **unwritten**, and until it is, invariant 4 is intentional
rather than structural on the one table where the distinction can cost something.

That is a gap against ten million rows becoming a gap against forty-eight million, and it is
restated at that weight in ADR 0015 rather than left where it was.

## Consequences

- **Story 2.9** serves this data. Its response-time work meets decision 10's cold/warm split,
  and it inherits the read-path half of `UNIVERSE.md` §12.2's invisible predicate: the backfill
  filters on `status = 'active'` and **the read path and Epic 13's replay must not**, because
  bars stored for a security we have since stopped tracking are still what happened.
- **Epic 3** writes into this table with live bars, and inherits two things: the write path,
  and the fact that its bars are **IEX where these are SIP**.
- **Epic 5** computes baselines from these rows and inherits decision 4's density finding —
  364.3 bars a security-session against a nominal 390 — so a volume baseline that treats a thin
  minute as an outage is wrong about most securities on most days.
- **Epic 13** inherits the seam gap above, and the correction gap in decision 1's honest limit.

## Related

- **ADR 0019** — the vendor this store is filled from, and the measured limits the backfill paces against
- **ADR 0018** — the provider seam, `BarSeries`, and why provenance travels with a series
- **ADR 0015** — the migration mechanism, the schema conventions `market_bars` is the first real test of, and gap 4
- **ADR 0016** — the tracked universe these bars are filed against, re-curated to 518 at Task 2.8.2
- **ADR 0017** — the trading calendar that decides which sessions should exist
- **[`BARS.md`](../../planning/epic-02-security-universe-historical-data/story-08-historical-bar-ingestion-and-storage/BARS.md)** — the arithmetic, the query plans, the run logs and every figure this document quotes
