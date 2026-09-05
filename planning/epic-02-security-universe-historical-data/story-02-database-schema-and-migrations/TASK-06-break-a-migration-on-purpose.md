# Task 2.2.6 — Break a migration on purpose, locally, and record what it leaves behind

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Tasks 2.2.4 (a real migration) and 2.2.5 (a database-backed suite to run afterwards)

**What Task 2.2.1 already answered, so this task does not re-derive it.** Against spike
migrations it produced the partial-migration case on three tools and found that **it
separates none of them**: all roll the whole file back with an empty bookkeeping table,
because Postgres has transactional DDL and all three put the bookkeeping row inside the same
transaction. So "is DDL transactional here" is settled. **What is not settled is whether the
mechanism Task 2.2.2 shipped behaves the same way**, because the provider and the runner are
code this repository wrote, and 2.2.1's own hand-rolled runner is the thing that proved how
easily that goes wrong. Re-produce rather than cite; the point of the re-take is the new code.

## Objective

Produce every way a migration can fail, against a database it is safe to ruin, and write
down what each one leaves behind — because Task 2.2.7 has to choose where migrations run
on deploy, and that choice is entirely determined by the answers here.

## Work

- **Break it four ways at least, each on a fresh empty database, each reverted.** A
  migration with a **syntax error**, which fails before touching anything. One whose
  **second statement** fails after its first succeeded — no longer to find out whether DDL is
  transactional, which Task 2.2.1 settled, but to confirm the shipped provider and runner
  inherit it. One that fails against a **non-empty** table — a `NOT NULL` added to a column
  with nulls in it — because that is the shape every migration after Story 2.3 will have, and
  it is the one class 2.2.1 could not produce at all, since it had no table with rows in it.
  And one that **succeeds and is then edited**, where **the answer is already known and is
  the bad one**: Kysely does not checksum, so unless Task 2.2.2 or 2.2.5 closed that gap the
  edited file is silently skipped. Produce the divergence anyway and write down what it looks
  like from the outside, because "the schema and the file disagree and nothing said so" is
  the failure a reader needs to recognise rather than one they can be warned about
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
  owes one check against that; this task owes it on every class above, and through
  `pnpm migrate` as well as through the runner directly, because a package script wrapping a
  runner is a place exit codes go missing

## Done when

- At least four failure classes were produced against a real database and reverted
- What the tracking table holds after each is recorded
- Concurrency behaviour is established rather than assumed
- Recovery for each class is written down where it will be read
- The failure exits non-zero with a message naming the migration, seen

## Notes

This is deliberately local and deliberately before the deployed run. Producing a broken
migration for the first time against the managed database would be the exact inversion of
Task 1.11.2's rule, and unlike a failed container the mess it leaves is in a stateful thing
that Task 2.1.5 put a `CanNotDelete` lock on.
