# Task 2.2.6 — Break a migration on purpose, locally, and record what it leaves behind

**Status:** Complete — 2026-09-05
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Tasks 2.2.4 (complete — there is a real migration and a real table) and
2.2.5 (complete — there is a database-backed suite, `pnpm test:database`, and it is a
**required check on `main`**, so a break left in the tree fails the pull request rather than
only the laptop)

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
  already known, it is the bad one, and Task 2.2.5 did NOT change it** — so the instruction
  this bullet used to carry, to run it both ways round with 2.2.5's check in place and
  disabled, **cannot be followed and should not be attempted: there is no such check.** 2.2.5
  weighed the checksum table and declined it, and recorded why rather than deferring again:
  its suite migrates from **empty** every run, so it proves _these files produce this schema_
  and structurally cannot prove _that database matches these files_; only a stored hash
  could. What bounds the damage is that the divergence is confined to one developer's
  laptop, because CI and every deploy migrate from the same files into an empty database.
  **So what this task owes is the other half of that argument, produced rather than
  reasoned about**: edit an applied migration, run `pnpm migrate`, and record that it reports
  success and changes nothing; then run `pnpm test:database` and record that **it passes
  too**, because it never looks at the database you broke. Those two green results side by
  side are the finding — the divergence is real, both instruments say fine, and the only
  thing that catches it is a person. Confirm the recovery is
  `pnpm db down -v && pnpm db && pnpm migrate` and that it is genuinely sufficient, and note
  that **the reversal trigger for building the hash table is Task 2.2.7**, where dropping and
  re-migrating stops being an option
- **Read the tracking table after each**, and record whether the failed migration is marked
  applied, absent, or marked in some third state. The answer to the second case is the one
  that matters most: if the bookkeeping row commits in a different transaction from the
  change, a half-applied migration is recorded as done and the next run skips it, and the
  database is permanently wrong in a way no re-run repairs
- **Establish whether an advisory lock is taken**, and what a second `pnpm migrate` running
  concurrently does. This is not hypothetical the moment migrations run on deploy: two
  merges 95 s apart already produced two overlapping deploy runs once, and Task 1.11.6
  handled that with a concurrency group rather than by luck
- **Use a scratch database rather than the development one, because Task 2.2.5 established
  the pattern and it is cheap to reuse.** That suite creates `marketpulse_vitest`, migrates
  it, reads it and drops it — at the end of a run and again at the start of the next, so a
  crashed run is self-healing — precisely so that running it never destroys the rows somebody
  was mid-way through debugging. The same argument applies with more force here, because this
  task's whole purpose is to leave a database broken: do it somewhere that is meant to be
  ruined. If a break _is_ taken against the development database, `pnpm db down -v` is the
  reset, and it costs whatever Story 2.3 has loaded by then
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
  triggered by Story 2.8's `market_bars` indexes. This task's job is to make the refusal
  happen on the shipped mechanism, so Story 2.8 meets a documented failure rather than a
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
- The edited-applied-migration case is produced, and **both** `pnpm migrate` and
  `pnpm test:database` are recorded reporting success against a database that is wrong
- Concurrency behaviour is established rather than assumed
- Recovery for each class is written down where it will be read
- The failure exits non-zero with a message naming the migration, seen

## Notes

This is deliberately local and deliberately before the deployed run. Producing a broken
migration for the first time against the managed database would be the exact inversion of
Task 1.11.2's rule, and unlike a failed container the mess it leaves is in a stateful thing
that Task 2.1.5 put a `CanNotDelete` lock on.

## Outcome — 2026-09-05

**Eight failure classes were produced against a real PostgreSQL 18.6, each on a fresh
scratch database, each reverted — and the headline is that seven of them leave the database
byte-for-byte as it was, while the eighth leaves it wrong and reports success.**

Everything below was produced through `pnpm migrate` rather than reasoned about, against a
`marketpulse_scratch` database created, ruined and dropped — the pattern Task 2.2.5
established, applied with more force here because this task's whole purpose was to leave a
database broken. **The development database was never pointed at**, confirmed afterwards:
`marketpulse` still holds `0001_baseline`, `0002_securities` and 0 rows.

### The four classes 2.2.2 could not reach, plus four more

| Class                                            | Message                                                                                       | Exit  | Left behind                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| **A** syntax error                               | `syntax error at or near "tabel"`                                                             | **1** | Nothing, not recorded                                                               |
| **B** second statement fails, **table has rows** | `column "symbol" of relation "securities" already exists`                                     | **1** | Nothing — the successful `add column` _and_ its `update` rolled back, 3 rows intact |
| **C** `set not null` against existing nulls      | `column "sector" of relation "securities" contains null values`                               | **1** | Nothing, `sector` still nullable                                                    |
| **D** `check` violated by existing rows          | `check constraint "securities_status_check" of relation "securities" is violated by some row` | **1** | Nothing, constraint absent                                                          |
| **E** `create index concurrently`                | `CREATE INDEX CONCURRENTLY cannot run inside a transaction block`                             | **1** | Nothing — **not** the `INVALID` index this leaves outside a transaction             |
| **F** refused filename                           | the provider's own message                                                                    | **1** | Nothing ran at all                                                                  |
| **G** unreachable database                       | `connect ECONNREFUSED 127.0.0.1:5499`                                                         | **1** | Nothing ran at all                                                                  |
| **H** **editing an applied migration**           | **`Already up to date`**                                                                      | **0** | **A database that no longer matches the files**                                     |

`kysely_migration` held exactly `0001_baseline` and `0002_securities` after every one of A–G,
and `public` held exactly `kysely_migration`, `kysely_migration_lock` and `securities`. Exit
1 was confirmed through `pnpm migrate` **and** through `runMigrations()` directly.

**Class C was worth watching for the reason 2.2.4 named and the answer is reassuring**:
PostgreSQL 18 materialises `NOT NULL` as `pg_constraint` rows, but the failure message is
still the classic `contains null values` and does **not** name a constraint — so the engine
change does not reach the diagnostic.

**Class E reproduces Task 2.2.1's refusal verbatim on the shipped mechanism**, and adds one
thing the spike could not: it leaves **no `INVALID` index**, because the transaction that
refused it is the same transaction that would have held the half-built one. The
second-`Migrator`-over-a-separate-directory answer still looks right now the runner exists,
and it is still Story 2.8's to build — there is no table to index.

### Both message branches are correct, and the second one is the one a naive check misses

_"failed and was rolled back"_ covers A–E; _"failed before any migration was executed, so the
database is exactly as it was"_ covers F and G, where `results` is `undefined`. Both were
produced and both say the true thing about what was left behind. A class landing in the wrong
branch would be actively misleading rather than merely unhelpful, since one claims a rollback
and the other claims nothing ran.

### The message names the migration and does not name the statement, and that is only fixable for one class

Measured off the raw `DatabaseError` rather than assumed. The whole body is one `sql.raw()`
call, so Postgres sees a single multi-statement query: a **syntax error carries
`position: "86"`**, a character offset into the file body, and **every execution error
carries no `position` at all** — only SQLSTATE (`42601` / `23502` / `23514` / `25001`) and
PostgreSQL's internal `routine`. The error also carries `line: "7695"`, which is a trap: it
is PostgreSQL's own C source line, not a line in the migration.

**Nothing was changed**, and the reasoning is recorded rather than the change deferred: a
bare character offset is weak, and the version worth having — a real line number — needs the
provider to hand the body along so `position` can be resolved against it. That is a change
worth making the first time a migration is long enough for `at or near "x"` to be ambiguous,
and `0002_securities.sql` at 107 lines is not yet that file.

### A rolled-back migration consumes identity values, confirmed on a migration

2.2.4 observed this on a bare insert; it reproduces on the real mechanism and is sharper.
Against a `securities` holding ids 1–3, a migration inserted **two** rows and then failed.
After the rollback: 3 rows, max id 3 — and the next insert got id **6**, not 4. Sequences are
non-transactional in Postgres by design and a rollback does not give the numbers back.

**`migrate.ts`'s "it left nothing behind" is deliberately left as it is, and the decision is
recorded beside the string.** That line is read by somebody who has just had a migration fail
and is deciding whether to go and look at the database, and for _that_ question it is
correct: a gap in a surrogate key's sequence is not something anyone can or should act on,
ids here are explicitly not contiguous, and lengthening the sentence spends a reader's
attention on a non-problem at the moment they have least of it. The precise version is in
`migrations/README.md` §8.

### Concurrency is safe, and the mechanism is an advisory lock rather than the lock table

Established rather than assumed, by running two `pnpm migrate` processes half a second apart
against one database with a `pg_sleep(6)` migration between them. The second appeared in
`pg_stat_activity` as **`wait_event_type: Lock`, `wait_event: advisory`**, waited for the
first, then reported `Already up to date` and exited 0. No interleaving, no double-apply.

Read out of Kysely 0.29.5's own `postgres-adapter.js` rather than inferred: it is
`pg_advisory_lock(3853314791062309107)` — a hard-coded id — **session-level**, with
`lock_timeout` set to **one hour**. Three consequences for Task 2.2.7:

- **The lock is per-database.** `pg_locks.database` is the database's own OID, one row
  granted and one waiting. Two migrations against two databases on one server do not block
  each other, which is what makes the scratch-database pattern genuinely isolated.
- **A failing first runner does not poison the second.** Produced: run 1 failed after six
  seconds, run 2 took the lock, ran the same migration itself, failed the same way and also
  exited 1. Both report the failure; neither reports success. That is the answer a
  concurrent-deploy story needs.
- **Session-level means a hard crash releases it**, but a runner that _hangs_ holds it and
  the second waits up to an hour before erroring rather than failing fast.

### Class H is the finding, and it is two green instruments over a wrong database

The instruction this task originally carried — run it "both ways round, with 2.2.5's check in
place and disabled" — was unrunnable, because 2.2.5 weighed the checksum table and declined
it. What was produced instead is the other half of that argument. An index was appended to
`0002_securities.sql` **after** it had been applied — the realistic edit, since nothing in
the database suite asserts on indexes. Then:

- `pnpm migrate` reported **`Already up to date — no migrations to apply.`** at **exit 0**,
  and `pg_indexes` held **0** rows for it.
- `pnpm test:database` reported **23 passed** at **exit 0**, because it migrates a database of
  its own **from empty** every run — so it proves _these files produce this schema_ and
  structurally cannot prove _that database matches these files_.

Two green results side by side, over a database that is wrong. **The only thing that catches
it is a person.** Recovery was confirmed sufficient rather than assumed: dropping and
re-migrating produced the index. `pnpm db down -v && pnpm db && pnpm migrate` is the
development-database form.

### Where the recovery is written down

`apps/backend/migrations/README.md` gained **§8**, in the imperative and in the directory
somebody is already in when they need it — the same argument that put the conventions there
rather than in a task file. It carries the class table, both message branches, the SQLSTATE
and `position` reading, the identity-sequence exception, the advisory-lock behaviour, and the
one recovery that is not "fix the file and run it again". The README's own framing paragraph
was amended, because it previously said mechanism is documented in `migrate.ts` and not here;
§8 is the stated exception, on the grounds that when you need it you are reading a failure
rather than reading source. The prose list gained "never edit a migration that has been
applied" as a convention no instrument can ever hold.

### Figures

`pnpm verify` **exit 0 in 28.76 s**, `pnpm test` **239**, `pnpm test:process` **14**,
`pnpm test:database` **23**. No dependency, no lockfile change, no new script and no new
`verify` step; the two files that changed are `migrations/README.md` and a comment in
`migrate.ts`. `apps/backend/migrations/` is byte-identical to where 2.2.4 left it.
