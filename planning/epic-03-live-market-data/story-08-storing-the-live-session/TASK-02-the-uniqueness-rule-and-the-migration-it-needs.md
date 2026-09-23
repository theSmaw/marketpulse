# Task 3.8.2 — The uniqueness rule, and the migration it needs

**Status:** **Complete — 2026-09-23.** `market_bars_unique_bar` is `(security_id, timeframe, observed_at, feed)` since `0011`. The index **cannot** be built inside a migration — 37.3 s on a laptop, ~508 s a heap pass on the tier — so it is built **concurrently in its own deploy step** (`pnpm index:prepare`, 42.9 s) and the migration **adopts** it in **0.6 s**, a 200× margin inside `timeout 120`. The fresh path is **0.47 s**. The old writer's `ON CONFLICT` provably does not survive the window, and why that is narrow is measured. One defect found by a test: the writer's presence check was not scoped to the tape, which would have made the ledger under-report silently.
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.1

## Objective

Make the store able to hold what Task 3.8.1 decided, and **prove the deploy
survives it** before a single live bar is written.

`market_bars` has carried `unique (security_id, timeframe, observed_at)` since
`0004_market_bars.sql` — a constraint that migration argued for deliberately,
because a backfilled historical bar is final. A live bar is not final, and if
3.8.1 chose to keep both tapes then that constraint is the thing standing in the
way.

## What the user can see when this lands

**Nothing.** A store that can hold two rows for one minute, or the same store
with its rule restated, depending on 3.8.1.

## The rules, before the file

Story 3.7 wrote these down the hard way and they apply unchanged:

- **`0011_*`**, four digits, forward-only, no `down`, immutable once applied.
- **Metadata-only at deploy time.** `deploy.yml` runs `timeout 120 pnpm
migrate` on a Burstable B1ms with 10 MiB/s of I/O, where a full scan of this
  table is **~508 s** (ADR 0034). **Dropping and recreating a unique index is
  not metadata-only** — it is an index build over 48.8 million rows, and it must
  be measured against 10 MiB/s before it is written. `create index
concurrently` cannot run inside Kysely's single transaction, which is the
  trap this task has to solve rather than discover.
- **And metadata-only is not the same as free.** `CLAUDE.md`'s _Data layer_
  trap, added by Task 3.7.6: an `ALTER TABLE` takes an `ACCESS EXCLUSIVE` lock
  whatever it costs, and every reader of the table queues behind it — 18.16 s
  and 16.16 s measured, against a 0.09 s baseline.
- **The deploy window.** The migration runs before either half of the code
  rolls, so for a few seconds the old writer meets the new rule. Task 3.7.6
  rehearsed that for a column; rehearse it for a constraint, which is the
  harder case: a **narrowed** rule can refuse a write the old code makes.

## Work

- The migration 3.8.1's shape calls for, with its comment block carrying the
  argument — including, if it drops or replaces `market_bars_unique_bar`, what
  that costs on the tier and how the index is built without holding the
  transaction
- `schema.ts` brought into agreement, with the comment saying what the key means
  now and why
- `market-bars.database.test.ts`: the constraint read back from the catalogue
  and compared against what the code believes, the way `market_bars_feed_check`
  already is
- **Time it against the populated local store and against `marketpulse_bare`**,
  and state the B1ms assumption the way 3.7.2 did
- A `pnpm break` entry for whichever clause carries the decision
- `LIVE-SESSION.md` §on the key: what a row is unique by, and what that lets the
  store hold that it could not before

## Done when

1. The migration applies to a store with rows in it, timed, inside the deploy's
   ceiling with the margin stated — or, if it cannot be, the shape goes back to
   3.8.1 rather than the ceiling being argued with
2. `schema.ts` and the migration agree, proved by `pnpm test:database`
3. The old writer's insert is shown to survive the deploy window
4. `pnpm verify` passes; `pnpm test:database` passes

---

## What was done — 2026-09-23

### 1. The measurement that decided the shape, taken before anything was written

On the populated local store (48,797,343 rows; the **deployed** table is
**49,796,479**, read from `GET /securities`' coverage):

| Step                                      |         Cost | Lock while it runs                       |
| ----------------------------------------- | -----------: | ---------------------------------------- |
| Build the index **non**-concurrently      |   **37.3 s** | `SHARE` — reads continue, writes blocked |
| Build it **concurrently**                 |   **42.3 s** | `SHARE UPDATE EXCLUSIVE` — both continue |
| **Adopt** a built index as the constraint |   **0.11 s** | catalogue only                           |
| The index itself                          | **2,311 MB** | —                                        |

**`deploy.yml` gives `pnpm migrate` 120 seconds**, and on the B1ms tier one
pass over this table's 5 GB heap is ~508 s at 10 MiB/s (ADR 0034). So an index
built inside the migration does not fit — not marginally, by roughly an order
of magnitude. **The task file said that if it does not fit the shape goes back
to 3.8.1 rather than the ceiling being argued with**, and it did not come to
that, because there is a shape that fits.

### 2. The shape: build concurrently in a deploy step, adopt in the migration

`0011_market_bars_unique_bar_by_tape.sql` is three statements — a
`create unique index if not exists`, a `drop constraint` and an
`add constraint … using index` — and the first is a catalogue check on any
store where the new step has already run.

Measured end to end, both paths, on the populated store:

| Path                                                      |               Cost |
| --------------------------------------------------------- | -----------------: |
| `pnpm index:prepare` then `pnpm migrate` (**the deploy**) | 42.9 s + **0.6 s** |
| `pnpm migrate` alone, the step skipped                    |         **30.7 s** |
| `pnpm migrate` on `marketpulse_bare` (0 rows)             |         **0.47 s** |
| `pnpm index:prepare` with nothing to do                   |          **0.4 s** |

**Against `timeout 120` the migration has a ~200× margin**, which is the
property every migration on this table must have (`CLAUDE.md`, _Data layer_).
The steady state of the new step is a catalogue query.

**Three properties make it safe, and each is a failure it prevents.**
`if not exists` keeps CI, `marketpulse_bare` and a fresh clone working — the
table is empty there and the index builds inline in milliseconds.
`using index` **renames the index to the constraint's name**, so
`market_bars_unique_bar` means the same thing before and after and only its
columns moved. And a skipped step fails in the safe direction: the migration
builds inline, blows the ceiling, and the deploy stops with nothing applied and
no code rolled.

`prepare-indexes.ts` carries the one failure mode a concurrent build has: an
interrupted build leaves an **invalid** index that `if not exists` would skip
forever, so it is dropped and rebuilt rather than reported.

**It became a convention rather than a one-off.** `migrations/README.md` §9 is
new, because the next index on a large table meets the same two constraints.

### 3. The index got smaller, which pays part of ADR 0035's bill

| Reading                  | Before   | After        |
| ------------------------ | -------- | ------------ |
| `market_bars_unique_bar` | 2,969 MB | **2,311 MB** |
| `market_bars` total      | 9,097 MB | **8,439 MB** |

**A migration that added a column to a key reclaimed 658 MB**, because the old
three-column index carried years of backfill-upsert bloat and the new one is a
fresh build. Against ADR 0035's +6.1 GiB a year it is not a solution, but it is
a tenth of the first year's cost arriving for free and it should be read beside
the bill rather than separately.

### 4. Criterion 3, demonstrated rather than asserted — and the answer is _no_

`ON CONFLICT (security_id, timeframe, observed_at)` requires a unique index on
exactly those columns. After `0011` there is none. The old writer's statement,
run verbatim against a migrated store:

```text
ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**So the old writer does not survive the window**, and the task asked for it to
be shown rather than reasoned about. What makes that acceptable is a second
measurement: **the only caller of `recordSeries` in the tree is `backfill.ts`**,
which runs from a GitHub runner with its own checkout and build — the deployed
backend never writes bars. So the exposure is a backfill run **already in
flight** when the deploy lands: a ten-minute job twice a day, which fails
loudly, writes nothing, and is correct on its next run. The migration's comment
block carries this so the next reader of that file does not have to find it
again.

### 5. What the new key exposed, found by a test rather than by review

`writeBatch` pre-reads which minutes are already present, to decide `inserted`
against `corrected`. That query was **not scoped to the tape**. Once a minute
can hold one row per tape, a genuine insert on a second tape matches the first
tape's row, is counted as a correction — and `corrected` is not what
`extendCoverage` adds to the ledger's `bar_count`. **The ledger would have
under-reported, permanently, with nothing on any screen to see it**: one of the
two silent failures `market-bars.ts`'s own header exists to prevent.

It surfaced as `expected { inserted: 0, corrected: 1 } to match { inserted: 1,
corrected: 0 }` in the test written for the new behaviour, which is the only
reason it was found at all. `pnpm break the-presence-check-forgets-the-tape`
holds it now, and `migrations/README.md` §9 carries the general form: **when a
key gains a column, grep for every query that assumed the old one.**

### 6. The tests, including three that asserted the opposite on purpose

Three assertions in `market-bars.database.test.ts` went red, and all three were
**written to**: two of them are Task 3.7.3's, named _today's rule, Story 3.8's
to change_, and this is Story 3.8 changing it.

- _has an index leading with security_id_ — now asserts the four-column
  definition **and** that `security_id` still precedes `feed`, which is what
  keeps the foreign key's parent cheap.
- _keeps both, with their own numbers, rather than correcting one into the
  other_ — replaces _with the same numbers, leaves the row untouched_ and
  _with different numbers, moves the numbers_: an IEX row and a SIP series for
  one minute are now two rows, each with its own close.
- _still corrects a re-store on the SAME tape_ — the idempotent re-run and the
  correction, which every backfill depends on and which the key still catches.
- _refuses a second row for one minute on ONE tape_ — and accepts the same
  minute on another, which is the whole point of `0011`.

`pnpm test:database` **189/189**.

### 7. Gates

`tsc -b` clean; `pnpm test:database` **189/189**; `pnpm verify` green (one
run failed first on `prettier --check` for a file written and not formatted —
fixed); `pnpm invariants` 21 hold; `pnpm links` 0 broken; both new breaks red
and restored; `deploy.yml`'s new step re-parsed with `bash -n` and its
credential block matched to the migrate step's verbatim rather than invented.

## For a stakeholder — a status report, 2026-09-23

**Where the product is.** Yesterday we decided that when the live feed and the
overnight feed both have a price for the same minute, we keep **both** — because
a stored price is a record of something we observed, and the flagship feature
asks what was knowable at a given moment. This task made the database actually
able to do that, and the interesting part was **how to ship it without taking
the site down**.

**The problem.** The price table has fifty million rows. Telling a database
"prices are now unique per minute **per feed**" means rebuilding a large index,
and our deployment gives database changes **two minutes** before it gives up —
deliberately, so a stuck change cannot hang a release. We measured the rebuild:
**37 seconds on a developer laptop**, and on the production server, which has
much slower storage, it would be **several minutes**. It does not fit, and we
knew that before writing the change rather than discovering it during a
release.

**The solution, in plain terms.** We split the job in two. A new deployment
step builds the index **in the background** while the database keeps serving
reads _and_ writes — nothing is locked, nothing waits. The actual database
change then just **adopts** the finished index, which takes **0.6 seconds**. On
every future deployment that step finds the work already done and costs less
than half a second.

**Why we did it this way rather than the obvious ways.** Raising the two-minute
limit would have removed a safety net that exists for a good reason. Doing the
rebuild in the foreground would have blocked all price writes for minutes.
Building it in the background and adopting it costs one extra deployment step
and no downtime at all. We also made sure that if anyone ever skips that step,
the release **stops safely** — nothing changed, nothing deployed — rather than
half-finishing.

**Two things worth reporting that we did not go looking for.**

- **The change made the database smaller.** The old index had accumulated years
  of bloat; the fresh one is **658 MB smaller**, and the whole price table
  dropped from 9.1 GB to 8.4 GB. That is about a tenth of the first year's cost
  of yesterday's decision, arriving for free.
- **A test caught a bug that no review would have.** Counting a new price as a
  _correction_ rather than an _insertion_ would have quietly stopped it being
  added to our running total of what we hold. The database would have
  under-reported its own contents, permanently, with nothing visible anywhere.
  It was caught the first time the new behaviour was tested, it is fixed, and we
  added a deliberate break so the test can never silently stop guarding it.

**One honest limitation, measured and bounded.** For a few seconds during the
release, the old code and the new database briefly coexist, and the old code's
way of saving prices no longer works. We proved that rather than assuming it,
and then measured why it barely matters: the only thing that saves prices is a
scheduled job that rebuilds itself from the latest code, runs twice a day for
ten minutes, and fails loudly and harmlessly if it collides. Its next run is
correct.

**What a user can see today: nothing.** The store can now hold what the next
task will write into it. Two tasks from now is the one worth waiting for:
reload a page during the trading day and the chart still reaches the moment you
were looking at.
