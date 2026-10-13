# Task 5.1.5 — Point-in-Time Universe Membership

**Status:** Not started
**Story:** [5.1 The Decisions, the Adjustment, & `Relative performance` Drawn](STORY.md)
**Depends on:** 5.1.4

## Objective

**`CLAUDE.md`'s invariant 4 gained a dated qualification on 2026-10-12 that
names anomaly scores explicitly, and this task is the only thing in the
roadmap that can discharge it.**

`currentMarketState` and `trackedTickers()` filter on `status = 'active'`
against the universe **as it stands now**, and the store records **no
point-in-time membership at all**. So a replayed aggregate computes over today's
roster while claiming to describe a past session — present information reaching
a replayed past, in the one place the invariant promises it cannot.

**Task 2.3.9 is the first real instance**: `PSKY` and `WBD` were untracked on
2026-10-12, so **a replay of any session before that date computes over 516
names when 518 were tracked.** And for a _ranked list of scored securities_ the
failure is worse than an off-by-two count — it can show a security in a
position implying it was the most unusual thing in a market it was not part of.

**The cost of deferring is not effort.** `CLAUDE.md`'s own words: the data
_"does not exist and cannot be reconstructed: it can only be written from the
day somebody starts writing it, so the cost of deferring is not effort, it is
history that is never recoverable."_

## What the user can see when this lands

**Nothing.** No screen changes and no new figure. It pays off in Epic 13, and
it is scheduled here because every day it is not written is a day of history
that cannot be bought back. The universe last changed on **2026-10-12**.

## Work

- **A history table rather than two columns, and the reason is correctness
  before it is cost.** `tracked_from` / `tracked_to` hold **one** interval, and
  `untrackAbsent`'s own docblock describes a row flipping **back** to `active`
  on its original `id` — so a symbol untracked and re-added needs a second
  interval and the two-column shape would have to lose the first or grow an
  array. **An append-only history is the shape of the fact**, and what a replay
  asks — _which securities were tracked on this date_ — is a range query against
  a history rather than two columns on the current row.
- **The lock profile, which is the second reason.** `ALTER TABLE securities ADD
COLUMN` takes `ACCESS EXCLUSIVE` whatever it costs, and **every
  `insert into market_bars` takes `ACCESS SHARE` on `securities` to validate its
  foreign key** — so the live bar writer, running once a minute for 6.5 hours a
  day **inside the deploy window**, holds locks on the one table every route
  reads. Postgres queues later requests **behind** a waiting exclusive one, and
  neither `lock_timeout` nor `statement_timeout` is set anywhere in this
  repository. `CREATE TABLE` touches `securities` only to install an FK trigger,
  which does not conflict with `ACCESS SHARE`.
- **The exact-list assertions the column shape would have fired**, recorded
  because they are why the cheaper-looking option is not cheaper:
  `migrate.database.test.ts`'s _"describes every column of securities, and no
  column it does not have"_, which would demand four coordinated edits — the
  migration, `SecuritiesTable` in `schema.ts`, `EXPECTED_SECURITIES`, and the
  per-column `it.each` — plus two silent ones: `WRITTEN_COLUMNS` and the
  hand-written `is distinct from` tuple in `load-universe.ts`, whose own comment
  warns that forgetting it means _"an edit to that column stops moving
  `updated_at`."_
- **What the loader writes.** One row per transition, **inside the existing
  transaction**, from information it already selects: it reads
  `before = [{symbol, status}]` and `untrackAbsent` returns exactly the symbols
  that moved. A reactivation is `before.status === "untracked" && symbol ∈ file`.
- **`effective_from` and `recorded_at` are two columns and must not be
  conflated** — invariant 5's event timestamp against the write timestamp, which
  on a daily loader are a day apart. **A `default now()` on `effective_from` is
  the exact leak `0002`'s decision 3 and `market_bars`' convention forbid**: it
  would turn the column a replay keys on into a record of when we ran a script.
- **The loader's steady-state property must survive**: a run over an unchanged
  universe writes **nothing** and moves no `updated_at`.
- **The schema-wide conventions to satisfy**: `id bigint generated always as
identity`, `timestamptz` only, no float, no `created_at` / `deleted_at` /
  `is_deleted` / `archived_at`, counts as `bigint`, money as `numeric(18,6)`.

## Done when

1. A membership history table exists, forward-only, with `effective_from` and
   `recorded_at` as separate columns and **no default on `effective_from`**.
2. `pnpm universe` writes one row per transition inside its existing
   transaction, and **a run over an unchanged universe writes nothing** —
   asserted, not argued.
3. A reactivation — `untracked` → `active` on the original `id` — produces a
   **second interval** rather than overwriting the first, with a database test
   that performs the full cycle.
4. The migration's lock behaviour is **rehearsed against the populated store**
   with the instrument Task 3.7.6 used, and the figure recorded. The lock
   reasoning in this task is from the documented conflict matrix and is **not a
   measurement**; the rehearsal is minutes.
5. The decision between a foreign key and a bare `security_id` is **taken with
   its reason recorded** — the naming convention and three precedents say
   `references securities (id)`; the lock profile prefers none; and `0003`
   already set a no-FK precedent with its reasoning written down.
6. `pnpm test:database` green with its numbers; `pnpm verify` green; the
   migration is **metadata-only at deploy time** and says so.
7. **Epic 13's `EPIC.md` is amended** to say the data now exists from
   2026-10-13 onward and that **sessions before it cannot be answered** — in
   words that epic can act on, not a link back.

---

## What was done — 2026-10-13

<!-- written at completion -->
