# Task 3.7.6 — The deploy rehearsed against a populated store, and what nothing checks

**Status:** Not started
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
  > store's freshness rather than the page** — `security-window-change.spec.ts`'s
  > _pressing a window does not move the chart_ is red by 90 px on a
  > developer store more than five sessions stale (the default window is
  > `empty`, `1 month` is not), green on CI's bare store and on the deployed
  > one, and says so in its own comment since 3.7.3. Nothing mechanical
  > tells a developer their store is the reason; the re-measure is
  > `GET /diagnostics/freshness` before believing the spec.

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
