# Task 2.2.6 — Break a migration on purpose, locally, and record what it leaves behind

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Tasks 2.2.4 (complete — there is a real migration and a real table) and
2.2.5 (a database-backed suite to run afterwards)

**What Task 2.2.1 already answered, so this task does not re-derive it.** Against spike
migrations it produced the partial-migration case on three tools and found that **it
separates none of them**: all roll the whole file back with an empty bookkeeping table,
because Postgres has transactional DDL and all three put the bookkeeping row inside the same
transaction. So "is DDL transactional here" is settled. **What is not settled is whether the
mechanism Task 2.2.2 shipped behaves the same way**, because the provider and the runner are
code this repository wrote, and 2.2.1's own hand-rolled runner is the thing that proved how
easily that goes wrong. Re-produce rather than cite; the point of the re-take is the new code.

**And Task 2.2.2 has now produced four of them on that new code, so this task starts from a
narrower list rather than a blank page.** Against the shipped runner it produced: a
unique-constraint violation inside a migration (`✗ 0002_…`, exit **1**, two tables in
`public` afterwards and `kysely_migration` holding `0001_baseline` alone); a filename the
provider refuses; an unreachable database; and `pnpm migrate down`, which is refused rather
than forwarded. It also found that the runner has **two distinct failure messages** —
"failed and was rolled back" when a migration executed, "failed before any migration was
executed, so the database is exactly as it was" when Kysely never got that far — and that
the second class is the one a check written over `results` alone misses entirely. So the
transactional-rollback property is confirmed on the shipped code **against an empty
database**; what is not confirmed is any of it **against a table with rows in it**, which is
the shape every migration after Story 2.3 has.

**And Task 2.2.4 changed what "with rows in it" costs, in both directions.** There is now a
real table — `securities`, eleven columns with a `check` constraint and a unique constraint —
so the classes below are reachable at last. But it is **deliberately empty**, and Story 2.3,
which fills it, comes _after_ this story. So this task supplies its own throwaway rows as a
fixture and removes them, rather than waiting for a universe or seeding one here. That is a
sentence rather than a decision, and it is written down so nobody reads the empty table as a
blocker and re-orders the story around it.

**One thing 2.2.4 observed in passing that this task should confirm and then decide about,
because it bears on a live claim in shipped code.** After a failed insert, the successful ones
took `id` 2 and 3: the rolled-back statement had **consumed identity value 1**. Sequences are
non-transactional in Postgres by design, and a rollback does not give the number back. That
matters here because `migrate.ts` prints, verbatim, _"It ran inside a transaction, so it left
nothing behind and was not recorded."_ — which is true of tables, of rows and of the
bookkeeping row, and **not quite true of a sequence**. Confirm it on a migration rather than
on a bare insert, then take the decision either way: it is defensible to leave the message
alone, because a gap in an identity sequence is not something anybody can act on and
lengthening that sentence costs more than it buys, and it is equally defensible to make "left
nothing behind" one degree more precise. What is not defensible is neither noticing nor
deciding.

## Objective

Produce every way a migration can fail, against a database it is safe to ruin, and write
down what each one leaves behind — because Task 2.2.7 has to choose where migrations run
on deploy, and that choice is entirely determined by the answers here.

## Work

- **Break it four ways at least, each on a fresh database, each reverted — and the four
  below are the ones Task 2.2.2 could not reach, not a re-run of the ones it did.** A
  migration with a **syntax error**, which fails before touching anything, and which is
  worth taking because it is the only class that fails in the _parser_ rather than in
  execution. One whose **second statement** fails after its first succeeded, against the
  shipped provider's single `sql.raw(body)` call — 2.2.2 produced a two-statement failure on
  an empty database, so what is left here is the same shape **against `securities` with rows
  in it**. One that fails against a **non-empty** table — a `NOT NULL` added to a column
  with nulls in it — which neither 2.2.1 nor 2.2.2 could produce at all, since neither had a
  table with rows; Task 2.2.4's `securities` gives that class a second and sharper member for
  free, **adding a `check` constraint to a table whose existing rows violate it**, which is a
  different failure from a `NOT NULL` and is the shape Story 2.3's `status` vocabulary will
  actually produce the first time it is narrowed. Watch what a failed `NOT NULL` addition
  _says_ on PostgreSQL 18 specifically, because that major materialises `NOT NULL` as a named
  `pg_constraint` row where older ones did not, so the message may not be the one an older
  Postgres gave. And one that **succeeds and is then edited**, where **the answer is
  already known and is the bad one**: Kysely does not checksum, Task 2.2.2 deferred that gap
  rather than closing it, and Task 2.2.5 is the task that either closed it or did not — so
  run this one **both** ways round, with 2.2.5's check in place and with it disabled, because
  "the schema and the file disagree and nothing said so" and "the schema and the file
  disagree and something said so" are two different things a reader needs to recognise
- **Read the tracking table after each**, and record whether the failed migration is marked
  applied, absent, or marked in some third state. The answer to the second case is the one
  that matters most: if the bookkeeping row commits in a different transaction from the
  change, a half-applied migration is recorded as done and the next run skips it, and the
  database is permanently wrong in a way no re-run repairs
- **Establish whether an advisory lock is taken**, and what a second `pnpm migrate` running
  concurrently does. This is not hypothetical the moment migrations run on deploy: two
  merges 95 s apart already produced two overlapping deploy runs once, and Task 1.11.6
  handled that with a concurrency group rather than by luck
- **Say what recovery looks like for each failure**, in the imperative, where somebody
  reading it at the time will find it. This story is the cheapest moment in the project's
  life to answer that — there is no data, so the answer for most of them is "drop and
  re-migrate", and writing that down now is what stops the same question being answered
  under pressure in Epic 12
- **The case with no clean answer now has a named answer, so confirm it rather than discover
  it.** `CREATE INDEX CONCURRENTLY` cannot run inside a transaction, and Task 2.2.1 produced
  the refusal verbatim: `CREATE INDEX CONCURRENTLY cannot run inside a transaction block`. It
  also found the shape of the fix and its cost — Kysely's opt-out is `disableTransactions`
  **per `Migrator`**, all or nothing, against `node-pg-migrate`'s `pgm.noTransaction()` per
  migration — and named the answer as a **second `Migrator` over a separate directory**,
  triggered by Story 2.7's `market_bars` indexes. This task's job is to make the refusal
  happen on the shipped mechanism, so Story 2.7 meets a documented failure rather than a
  surprise, and to say whether the second-`Migrator` shape still looks right once the runner
  exists. **Do not build it here** — there is no table to index
- **Make the failure loud**, which is acceptance criterion 4: a non-zero exit, a message
  naming the migration and the statement, and nothing that reads like success. **This is the
  single most likely thing in the story to be wrong, and the reason is specific rather than
  general**: `migrateToLatest()` resolves to `{ error, results }` rather than throwing, and
  Task 2.2.1 measured a failed migration leaving the node process at **exit 0**. Task 2.2.2
  paid that debt for four classes and made it a unit-tested property of `summariseMigration`
  rather than a remembered one — including a deliberate break showing that reading `results`
  **instead of** `error` catches the ordinary case and misses the whole class where Kysely
  fails before it works out what to run. What is left here is the classes above, through
  `pnpm migrate` as well as through `runMigrations()` directly, because a package script
  wrapping a runner is a place exit codes go missing — and **check both message branches say
  the right thing about what was left behind**, since one of them claims a rollback and the
  other claims the database is untouched, and a class landing in the wrong branch is a
  diagnostic that actively misleads

## Done when

- At least four failure classes **beyond Task 2.2.2's four** were produced against a real
  database and reverted, at least one of them against a table with rows in it — supplied as
  a throwaway fixture, since Story 2.3 has not seeded anything yet and `securities` ships
  empty
- Whether a rolled-back migration consumes an identity value is confirmed, and
  `migrate.ts`'s "it left nothing behind" message is either amended or deliberately left
- What the tracking table holds after each is recorded
- Concurrency behaviour is established rather than assumed
- Recovery for each class is written down where it will be read
- The failure exits non-zero with a message naming the migration, seen

## Notes

This is deliberately local and deliberately before the deployed run. Producing a broken
migration for the first time against the managed database would be the exact inversion of
Task 1.11.2's rule, and unlike a failed container the mess it leaves is in a stateful thing
that Task 2.1.5 put a `CanNotDelete` lock on.
