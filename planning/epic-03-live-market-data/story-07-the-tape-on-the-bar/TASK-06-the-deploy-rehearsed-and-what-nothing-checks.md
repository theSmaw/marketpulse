# Task 3.7.6 — The deploy rehearsed against a populated store, and what nothing checks

**Status:** **Complete — 2026-09-23.** The deployed migrate step's own figure is **1.251 s** against `timeout 120` (~96× margin), read from the runner's log rather than extrapolated. The old writer was built at `b9772d1` in a worktree and stored 9,750 bars into the migrated table, every row answering `sip` on the default. The lock was rehearsed on the populated store: the migration waited **18.16 s** behind a write transaction and an ordinary read waited **16.16 s** behind _it_, against a 0.09 s baseline — recorded, with the `lock_timeout` repair measured and deliberately not shipped. `deploy.yml`'s exit-124 message was repaired: it named the wrong `pg_stat_activity` row. Three `docs/GAPS.md` entries; the invariant widened to the ledger's seam with a fourth break; `check-deployed.mjs` decided against, in writing.
**Story:** [3.7 The Tape on the Bar](STORY.md)
**Depends on:** 3.7.5

## Objective

Criteria 4 and 5, taken as a rehearsal rather than a reading: **the migration
applied to a store with rows in it, timed, under the deploy's own ceiling and
with the deploy's own ordering** — schema first, then the code — and the
window between them shown survivable. Then the residue: what `pnpm verify`
cannot see about this story, written into `docs/GAPS.md`.

## What the user can see when this lands

**Nothing.** Confidence that the next merge does not stall on a 45-million-row
scan.

## Why a rehearsal and not the figure from 3.7.2

3.7.2 timed the migration alone. **The deploy runs it inside `timeout 120`,
under Kysely's single transaction and a session-level advisory lock with a
one-hour timeout, on a Burstable B1ms instance rather than a laptop**, and then
rolls the backend while the previous revision is still writing. Three things
can go wrong there that a local timing cannot show: the scan exceeding the
budget, the lock held by a stalled earlier run, and the old writer meeting the
new column.

## Work

- **Rehearse the ordering locally**: apply the migration to the populated
  store, then run the _previous_ build's backfill path against it (the
  writer that does not know the column) for one symbol, and confirm the
  insert succeeds on the default — the additive rule, demonstrated rather
  than asserted

  > **AMENDED 2026-09-22 by Task 3.7.3 — "the previous build" now has a
  > commit, and the insert half is already a test.** The last writer that
  > does not know the column is `main` at `b9772d1` (PR 415 merged, before
  > PR 416); build that and run its `pnpm backfill` for one symbol against
  > the migrated store. At unit level the same fact is already
  > `market-bars.database.test.ts`'s _answers `sip` for a writer that does not
  > know the column exists_, so what the rehearsal adds is the **process**
  > half — the old build's real statement, chunked at 8,191 rows of eight
  > columns against a nine-column table — and, per 3.7.1's amendment below,
  > the lock.

- **Take the B1ms figure honestly.** If the deferred validation from 3.7.1 is
  the only scan and it runs out of band, document the command, who runs it,
  and what happens if nobody does (a `NOT VALID` check still enforces every
  new row — say so). If a scan is inside the migration, extrapolate the
  laptop figure to the tier and state the assumption; if it does not fit in
  120 s with margin, the migration is wrong and goes back to 3.7.1

  > **AMENDED 2026-09-22 by Task 3.7.1 — there is no scan and no deferred
  > validation; the risk that remains is the LOCK.** The migration is two
  > catalogue writes (39 ms and 3 ms on 48.8 million rows) and the check is
  > `NOT VALID` for good (ADR 0034), so the bullet above collapses to _confirm
  > the deploy's migrate step reports milliseconds_. What 3.7.1 could not
  > measure and this rehearsal must: `ALTER TABLE market_bars` takes an
  > **`ACCESS EXCLUSIVE` lock**, which waits behind any transaction touching
  > the table — the nightly backfill's batch inserts, or a long read — and
  > then blocks every reader and writer until it commits. `deploy.yml` runs
  > at merge time, whatever the backfill is doing. Rehearse the migration
  > **against a store with a backfill batch in flight** and read how long the
  > lock waits, whether Kysely's transaction sets a `lock_timeout`, and what
  > the 120 s ceiling does if it waits that long. A lock wait that looks like
  > a slow migration is the failure shape this tier makes likely.

- **`check-deployed.mjs`** — decide whether the post-merge check should read
  the column's presence (it reads freshness already), and add it or record
  why not
- **`docs/GAPS.md`**: the claims this story leaves standing that nothing
  mechanical guards — at least: that `market_bars_feed_check` **stays `NOT
VALID` on purpose** and nobody validates it in a deploy (3.7.1's amendment
  above replaced _that the deferred validation was ever run_); that the
  ledger's withdrawn columns are not read by anything (a grep re-measure, or
  an invariant if it can be one); and that a bar's tape and its ledger row
  agree, which only a database test can see and only when somebody runs it
- **`pnpm invariants`** for anything above that is a single grep, with its
  `pnpm break` entry

  > **AMENDED 2026-09-22 by Task 3.7.3 — two of the residue's entries change
  > shape, and one is new.** _That a bar's tape and its ledger row agree_
  > dissolves under Task 3.7.4's meaning for the ledger — its `feed` is
  > withdrawn from every read — into _that `bar_coverage.feed` is read by
  > nothing_, which is a grep and belongs in `pnpm invariants`; the
  > `provider` column stays read (3.7.4's amendment) and so is not in the
  > residue at all.
  >
  > **AMENDED 2026-09-22 by Task 3.7.4 — the shape of that invariant, now
  > that the readers are known.** After 3.7.4 the ledger's `feed` is read by
  > exactly two things: `toStoredSeries` (the series-level feed, until 3.7.5
  > derives sources from the rows) and `readCoverageRow` (into
  > `BarCoverage.source.feed`, which 3.7.5 is asked to drop). It is still
  > **written** by `extendCoverage`, on purpose — required on insert so the
  > database default stays unreachable — and described by `schema.ts` and
  > `market-bars.database.test.ts`. So the invariant is: **no selection of
  > `bar_coverage.feed` and no `.source.feed` anywhere in
  > `apps/backend/src` outside `schema.ts`, the tests and the one insert in
  > `extendCoverage`**; if 3.7.5 leaves either reader standing, the
  > invariant cannot be written and this task records why. Its break removes
  > the guard. Nothing else 3.7.4 added needs a deploy-time thought: the
  > overlap refusal is one indexed `select distinct feed` per write, paid
  > only when windows intersect, which the nightly walk's edge-extension
  > never does. New: **a browser spec whose assumption is about the
  > store's freshness rather than the page** — `security-window-change.spec.ts`'s
  > _pressing a window does not move the chart_ is red by 90 px on a
  > developer store more than five sessions stale (the default window is
  > `empty`, `1 month` is not), green on CI's bare store and on the deployed
  > one, and says so in its own comment since 3.7.3. Nothing mechanical
  > tells a developer their store is the reason; the re-measure is
  > `GET /diagnostics/freshness` before believing the spec.
  >
  > **AMENDED 2026-09-23 by Task 3.7.5 — the invariant exists, and the
  > residue is smaller and different.** `pnpm invariants` carries
  > `stored-sources-only-through-the-merge` since 3.7.5: no `sources:`
  > literal in `market-bars.ts`, `mergeSeriesProvenance(` still called, no
  > select of `bar_coverage.feed`; breaks `the-sources-are-written-by-hand`
  > and `the-ledgers-tape-is-read-again`. Both readers this amendment named
  > are gone (`BarCoverage.source` is `BarCoverage.provider`). So the entry
  > _the ledger's `feed` is read by nothing_ does **not** go in
  > `docs/GAPS.md` — it is mechanical. What goes there instead, each with a
  > re-measure: **(a)** the invariant reads one file, so a reader of
  > `bar_coverage.feed` in another module would pass it — widen the grep to
  > `apps/backend/src` if it stays a single file, or record why not; **(b)**
  > the column is still **written** on every first insert and described by
  > `schema.ts`, and dropping it is an expand-then-contract deploy nobody has
  > decided to run — record the trigger (the first migration on
  > `bar_coverage` for any other reason) rather than a story; **(c)** an
  > empty answer now names `SOURCE_OF_NOTHING` (`alpaca`/`sip`) whatever the
  > ledger's provider, so on a `none` deployment whose store holds only
  > fixture bars a quiet window's source note could print _All US exchanges_
  > for zero bars **if** the note renders a feed clause for an empty series —
  > read `source-note.ts` against ADR 0029's rule and either confirm it does
  > not or record the case.

  > **AMENDED 2026-09-22 by Task 3.7.2 — the first of those is now a test,
  > and the entry changes shape.** `market-bars.database.test.ts` asserts
  > `pg_constraint.convalidated = false` for `market_bars_feed_check`, with
  > the reason, and `pnpm break the-tape-check-gets-validated` proves it goes
  > red. What `docs/GAPS.md` should carry is therefore not _that it stays NOT
  > VALID_ but the residue: **`pnpm test:database` is not in `pnpm verify`**,
  > so the assertion holds only on the `database` CI job and when somebody
  > runs it — and a `VALIDATE` slipped into a **later** migration would pass
  > every unit-level check and reach the deploy's 120 s ceiling before
  > anything red. The re-measure is the test's name and the break's.

## Done when

1. The deploy's ordering is rehearsed against rows, and the old writer's insert
   on the new column is shown to succeed
2. The deploy-time cost is stated for the B1ms tier with its assumption, and
   fits the ceiling with margin
3. `docs/GAPS.md` carries this story's residue, each with a re-measure
4. `pnpm verify` passes; `pnpm test:database` passes

---

## What was done — 2026-09-23

### 1. Criterion 4, from the deploy's own log rather than an extrapolation

`0010` had already rolled to the B1ms instance — on 2026-09-22, in the deploy
for `b9772d1` — so the tier's figure did not need estimating. The migrate
step's process started at `10:01:53.090Z` and printed its last line at
`10:01:54.341Z`: **1.251 s** end to end, including Node's boot, a TLS
connection from a GitHub runner to Azure, Kysely's advisory lock, the
bookkeeping read, both catalogue writes and the commit. Against `timeout 120`
that is **~96×** of margin.

**One trap in reading that log, written down because it nearly produced a
wrong figure**: `Pending:`, `✓` and `Applied 1 migration.` are 96 µs apart,
which is not a round trip to Azure. `runMigrations()` returns its lines and the
runner prints them after the work — so the measurement is the **step**, and the
gaps between those three lines are console writes.

The assumption the figure rests on is 3.7.2's and is stated rather than
implied: a constant default is a catalogue write, O(1) in the table's size,
proved by 0.478 s on 48.8 million rows against 0.456 s on none.

### 2. Criterion 1, with the old build actually built

The last writer that does not know the column is `main` at `b9772d1`. It was
checked out into a git worktree outside the repository, installed, built, and
run against `marketpulse_bare` **after** `0010` had been applied to it:

```text
  25 fetches, 25 sessions fetched, 0 already held
  9750 bars stored, 0 corrected, 0 unchanged
```

Read back: `9750` rows, **one** distinct tape, `sip` — from the database
default, because that writer's insert names eight columns against a
nine-column table. The ledger beside them reads `alpaca`/`sip`. That is the
deploy window demonstrated: between the migrate step and the code roll the
previous revision keeps writing, and the default is true of every bar it can
produce.

**Two precisions the rehearsal added, neither of which the task file
predicted.** The shipped backfill calls `recordSeries` once **per session**, so
the largest statement it ever issues is 390 rows — the 8,191-row chunk the old
build computed is unreachable from that command, and only a caller handing the
writer a multi-session series would cross it. And `pnpm backfill` resolves its
provider from `createAlpacaProvider` directly rather than from
`MARKET_DATA_PROVIDER`: the run was started with `MARKET_DATA_PROVIDER=fixture`
and went to the real vendor anyway, spending **25 metered requests** and
storing real SIP bars. It made the rehearsal more faithful than planned, and
the observation is recorded rather than repaired — a backfill's job is real
history, and `backfill.database.test.ts` reaches the seam by passing a provider
as a dependency — but the variable is silently ignored rather than refused.
`marketpulse_bare` was dropped and rebuilt afterwards; `build-bare-store.mjs`
refused to rebuild over the contaminated copy and printed the exact command to
drop it, which is that guard doing its job.

### 3. The lock, which is what this table's deploy actually risks

`ALTER TABLE` takes an `ACCESS EXCLUSIVE` lock and Postgres queues later
requests **behind** a waiting exclusive one. Rehearsed on the populated store
(48,797,343 rows) with three sessions — A holding a transaction that had
inserted, B running the migration's statement shape, C an ordinary chart read
arriving two seconds later:

| Session                        | Lock wanted           | Granted | Elapsed     |
| ------------------------------ | --------------------- | ------- | ----------- |
| A — a backfill batch in flight | `RowExclusiveLock`    | yes     | held 20 s   |
| B — the migration              | `AccessExclusiveLock` | **no**  | **18.16 s** |
| C — an ordinary chart read     | `AccessShareLock`     | **no**  | **16.16 s** |

C's lock conflicts with nothing that was granted. It waited only because B was
ahead of it, and the same read is **0.09 s** unobstructed — so a migration that
waits stalls every `GET /market-data/bars` on the site for the same length.
Both showed `wait_event_type: Lock`, `wait_event: relation`.

**`lock_timeout` and `statement_timeout` are both `0` and `migrate.ts` sets
neither.** With `lock_timeout = '3s'` the same rehearsal failed in **3.13 s**
with `canceling statement due to lock timeout` and exit 1, releasing C at once.

**The bound was measured and deliberately not shipped**, which is a decision
and is recorded as one: the realistic wait here is a single `recordSeries`
transaction — 390 rows, **81–137 ms** measured on the populated store — so the
exposure is small; `createDatabasePool` is shared with the **serving** pool, so
bounding only the migration means a new parameter on a shared factory rather
than a line; a `SET` on a pooled connection is not reliably the connection the
DDL runs on, because `POOL_MAX` is 10; and the deploy already fails safely when
it waits too long. `docs/GAPS.md` carries it with a condition for buying the
bound.

### 4. What was repaired: the deploy's own error message named the wrong lock

`deploy.yml`'s exit-124 branch told the reader the likeliest cause was another
migration holding Kysely's advisory lock, and to check `pg_stat_activity` for
`wait_event: advisory`. Since `0010` that is the wrong row — a migration queued
on `market_bars` reads `wait_event: relation`, and so does every reader behind
it. The message now names both, in the order a reader should check them, and
says that the readers are queued too. A diagnostic that points at the wrong row
is worse than none, because it is followed.

### 5. `check-deployed.mjs` — decided against, in writing

It should **not** probe the column's presence, and the reason is ordering
rather than cost: the deploy migrates before either half of the code rolls and
exits non-zero on a migration that did not apply, so a deployment with live
code and a missing column is not reachable through the pipeline. The check runs
after the merge and gates nothing. The decision, the cheaper end-to-end witness
if one is ever wanted (`provenance.sources` is derived from the column since
3.7.5, so any 200 from the bars route proves it), and the condition that would
trigger adding one are a comment in `check-deployed.mjs` beside the probe it
would have joined.

### 6. Criterion 3 — the residue, and two items that closed instead

Three entries in `docs/GAPS.md`, each with a re-measure and an owner that is a
condition:

- **the lock wait**, with the table above and the un-bought bound;
- **`bar_coverage.feed` is written, described and read by nothing**, and the
  contract deploy that would drop it has no trigger — owner: the first
  migration that touches that table for any other reason;
- **everything this story asserts about the schema lives in
  `pnpm test:database`**, a required CI job that is not part of `pnpm verify`,
  so a later `validate constraint` passes every unit-level check and reaches
  the deploy's 120 s ceiling before anything goes red.

**Two of the residue items 3.7.5 predicted closed rather than landing in the
list.** _(a)_ The invariant reads one file, which is sound only while that file
is the ledger's only querier — so the invariant now **asserts that too**:
eleven files mention `bar_coverage` and none but `market-bars.ts` builds a
query against it. `pnpm break a-second-module-queries-the-ledger` proves it.
_(c)_ The empty answer's `SOURCE_OF_NOTHING` cannot reach a reader:
`source-note.ts` applies ADR 0029 **per clause**, and the feed, adjustment and
retrieval clauses are properties of the bars, so a series with no bars renders
none of them. Confirmed by reading the module rather than assumed.

### 7. Gates

`pnpm verify` green; `pnpm test:database` green; `pnpm invariants` **21 hold**
with the widened check; `pnpm break a-second-module-queries-the-ledger` red and
restored; `pnpm links` 0 broken; `pnpm e2e` against the rebuilt
`marketpulse_bare`. No shipped source file changed — the repairs are a workflow
message, a script comment, an invariant and the documents.

## For a stakeholder — a status report, 2026-09-23

**Where the product is.** The database can now record which exchange feed every
stored price came from, hold two feeds for one security, and tell a chart
exactly which stretch came from which. This task did no new building. It
**rehearsed the risky part of shipping it** and wrote down what our automated
checks cannot see.

**What was rehearsed, and what it found.**

- **The upgrade itself is fast on the real server, and we have the receipt.**
  The change had already gone out to production the previous day, so instead
  of estimating we read the deployment log: **1.25 seconds**, against a
  two-minute budget. Ninety-six times the headroom.
- **The old software keeps working during the changeover.** For a few seconds
  during any deployment the database has the new column and the running code
  does not know about it. We built the previous version of the software,
  pointed it at an upgraded database and let it load 9,750 prices. Every one
  landed correctly and was labelled with the right feed automatically.
- **The real hazard is waiting, not working.** Adding a column needs exclusive
  use of the price table for a moment. If anything else is mid-write, the
  upgrade waits — and, we measured, **so does every chart on the site**, in a
  queue behind it. In a controlled test the upgrade waited 18 seconds and an
  ordinary chart read that would normally take a tenth of a second waited 16.

**Why we did not "fix" that last one.** There is a one-setting cure: tell the
upgrade to give up after a few seconds rather than wait. We measured that it
works exactly as expected. We did not ship it, for three reasons we wrote
down: the real wait on our system is a fraction of a second, because the only
thing that writes prices does so in small batches; the setting lives in a piece
of code shared with the live website, so changing it safely is a real change
rather than a line; and if the upgrade ever does wait too long today, the
deployment stops by itself, changes nothing and rolls no new code. We recorded
the measurement, the cure and the exact condition under which it becomes worth
buying.

**One thing we did fix.** When a deployment gives up waiting, it prints advice
about where to look. That advice was written before this feature and pointed at
the wrong place — it would have sent whoever was on call chasing the wrong
thing. It now names the right one first.

**What we wrote down rather than solved.** Three honest gaps, each with the
command that re-takes the measurement: the waiting problem above; a leftover
column that is still filled in but no longer read by anything, which should be
removed the next time that table is touched for another reason; and the fact
that our schema tests run as their own job rather than as part of the standard
build, so a future change of a certain shape would only be caught at
deployment time.

**What a user can see today: nothing.** This task moved no pixel. What it buys
is confidence that the next two stories — storing the live trading session,
then telling a reader on screen which exchange each part of their chart came
from — can ship without a deployment stalling the site.
