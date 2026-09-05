# Task 2.2.6 — Break a migration on purpose, locally, and record what it leaves behind

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Tasks 2.2.4 (a real migration) and 2.2.5 (a database-backed suite to run afterwards)

## Objective

Produce every way a migration can fail, against a database it is safe to ruin, and write
down what each one leaves behind — because Task 2.2.7 has to choose where migrations run
on deploy, and that choice is entirely determined by the answers here.

## Work

- **Break it four ways at least, each on a fresh empty database, each reverted.** A
  migration with a **syntax error**, which fails before touching anything. One whose
  **second statement** fails after its first succeeded, which is the case that decides
  whether DDL is transactional here. One that fails against a **non-empty** table — a `NOT
NULL` added to a column with nulls in it — because that is the shape every migration
  after Story 2.3 will have. And one that **succeeds and is then edited**, which is where
  a checksum either fires or does not
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
- **Name the case with no clean answer.** A migration that is transactional per file and a
  migration that cannot be — `CREATE INDEX CONCURRENTLY` is the one every project meets,
  and it will arrive in Story 2.7 against `market_bars` — behave differently and the
  difference should be recorded before it is met rather than after
- **Make the failure loud**, which is acceptance criterion 4: a non-zero exit, a message
  naming the migration and the statement, and nothing that reads like success. Check the
  exit code propagates through `pnpm migrate` the way this repository has checked it every
  other time, because a package script wrapping a runner is a place exit codes go missing

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
