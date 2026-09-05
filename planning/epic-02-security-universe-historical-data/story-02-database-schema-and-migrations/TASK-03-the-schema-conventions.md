# Task 2.2.3 — Write the conventions down, before there is a table to argue about

**Status:** Complete — 2026-09-05
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Task 2.2.2 (complete) — migrations have a home, `apps/backend/migrations/`,
so the conventions have somewhere to sit, and one of them is already decided and enforced:
the **filename** rule, `NNNN_lower_snake_case.sql`, checked by `SqlFileMigrationProvider`
rather than written down and hoped for. That is the model for this task's two lists rather
than a detail — see the last bullet

## Objective

Fix the vocabulary every table in §30 inherits — across ten tables and thirteen more epics
— while there is still nothing to migrate away from. A convention decided after the third
table is a convention with two exceptions in it.

## Work

- **Table and column naming**, chosen and stated: singular or plural table names, snake
  case, and what a foreign key column is called. The value of this one is entirely in its
  consistency, so the argument for whichever is chosen matters less than the fact that it
  is written where the next author reads it
- **Timestamps and their timezone handling, which is the one with a wrong answer.**
  `timestamptz` and never `timestamp`, and the reason is not tidiness: this product's whole
  domain is US market hours, Epic 4 renders a market clock, Epic 13 replays against a
  clock, and invariant 4 makes "no component may read data timestamped after the replay
  clock" structural. A naive `timestamp` column silently stores whatever the session's
  timezone made of the value, and the failure appears twice a year at a DST boundary. State
  the rule, and state the second half of it: what the **event** timestamp is called and
  what the **row-written** timestamp is called, because invariant 5 makes evidence carry
  both an event timestamp and a retrieval timestamp, and a schema with one `created_at`
  doing both jobs cannot express it
- **Identifier types.** Serial, `bigint`, UUID, or a natural key — and the answer may
  differ per table, in which case say what decides it. `securities` has a genuine natural
  key in the symbol and Story 2.3 will want to know whether that is the primary key or a
  unique constraint beside a surrogate; a symbol is not stable across a ticker change,
  which is the fact that decides it
- **Monetary and price values are `numeric` and never floating point**, which the story
  states as a requirement rather than an option. Write down _why_ where somebody tempted by
  `double precision` will read it: Epic 5's anomaly arithmetic is user-visible, invariant 1
  says every number a user sees comes from deterministic code, and a percentage change that
  disagrees with itself between two renders is a defect nobody can reproduce. Fix the
  precision and scale, and say what a **volume** is stored as, since it is a count rather
  than a price and the same rule does not apply to it
- **Soft deletes, or their absence, decided.** The absence is the likelier right answer and
  it needs the argument stated anyway, because Story 2.3 asks directly what happens to data
  already stored for a removed symbol, and answering that with a `deleted_at` invented in
  a hurry is how a status column and a soft-delete column end up meaning overlapping things
- **Whether the schema or the TypeScript types are the source of truth — half answered, and
  the half that remains got sharper.** Task 2.2.1 settled the generation direction:
  **nothing is generated**, no build step is added, and the schema is the source of truth
  with the TypeScript following it by hand (`kysely-codegen` introspects a **live** database
  and was rejected against acceptance criterion 7). What is left is where that hand-written
  type lives, and it is a real question because there are now **two** of them: Kysely's
  `Database` interface, which describes the tables as Postgres holds them, and Story 2.3's
  `Security`, which is domain vocabulary and goes in `packages/shared`. They are not the
  same type — a row has a `sector_id` where a domain object has a sector — and deciding they
  are is how a nullable column ends up in a frontend type. Say whether the `Database`
  interface stays in `apps/backend`, and say what maps between the two and where that lives.
  `packages/shared` is consumed as **built output**, which is the constraint on any answer
  that puts either one there
- **Whether seed data is a migration, a script, or neither** — the story's own out-of-scope
  note gives this story the mechanism and Story 2.3 the contents. The distinction worth
  writing down is that a migration is **applied once and recorded**, so data in a migration
  is data you cannot re-run, while a script is re-runnable and unrecorded. Which of those
  a ~100-row universe wants is Story 2.3's problem and this is the sentence that stops it
  being re-litigated
- **Name the place these live and make it the place somebody looks**, which is acceptance
  criterion 6. `e2e/README.md` is the precedent and its reason is stated: a task file is
  not where the next person writing a spec looks. The same applies to the next person
  writing a migration, and **Task 2.2.2 made the obvious candidate exist** —
  `apps/backend/migrations/README.md` sits in the directory somebody is already in when
  they need it, which is exactly the `e2e/README.md` argument. Weigh it against a
  `docs/` document; what decides it is where a person is looking, not which directory is
  tidier. The same rule applies to duplication — point at it from `CLAUDE.md` and
  `README.md` rather than copying it, because copying a paragraph for legibility is how
  Epic 1 ended with twelve near-identical blocks and a task spent reconciling them. **Note
  that document is itself outside `pnpm verify`'s net if it is Markdown and inside it only
  as formatting**, which is the same standing gap this repository already records for
  prose figures
- **Say which of these a tool enforces and which are prose**, in the two-list shape Task
  1.13.6 used. The line is not effort — it is whether the thing being checked is reachable
  from an assembled instance. A `numeric` column type is readable from a live database and
  therefore checkable; a naming convention across tables that do not exist yet is not.
  **Two facts from Task 2.2.2 bound this list and neither should be re-derived.** The
  enforceable end has a working precedent: the migration **filename** convention is a
  regex in `SqlFileMigrationProvider` that refuses a non-matching file rather than skipping
  it, and it has a test that was made to fail — so "a convention nothing checks" is a
  choice here rather than a limitation. And the unenforceable end has a hard floor: a
  `.sql` file is read by **nothing** in this repository — `"inferredParser": null` to
  Prettier, `File ignored` to ESLint, invisible to `tsc` — so no convention expressed only
  in SQL text can be linted at all, and the only two places one can be checked are the
  provider (before the file runs) and Task 2.2.5's database-backed suite (after it has)

## Done when

- Every convention above is decided, with its reason, in one document
- The document is linked from `CLAUDE.md` and `README.md` rather than duplicated into them
- Which conventions are checked and which are prose is stated as two lists
- Nothing in this task invents a table

## Notes

This sits before the first schema on purpose. The alternative — write `securities` and
extract the conventions from it — produces conventions that describe one table rather than
ten, and the two that would suffer most are the timestamp pair and the identifier rule,
neither of which `securities` alone exercises.

## Outcome — 2026-09-05

Every convention is in **[`apps/backend/migrations/README.md`](../../../../apps/backend/migrations/README.md)**,
pointed at from `CLAUDE.md` and `README.md` rather than copied into either. Its home is
`e2e/README.md`'s argument applied a second time — a task file is not where the next
person writing a migration looks, and that directory is where they already are. No table
was invented, and every figure in it was measured against PostgreSQL 18.6 through `pg`
8.23.0 rather than recalled.

The decisions, one line each:

- **Plural tables, `lower_snake_case`, `<table_singularised>_id` foreign keys** — the
  plural half was taken away rather than taken, since §30 already names all ten tables
- **`text` over `varchar(n)`**, and **`text` + `check` over a Postgres `enum`** — produced:
  inside one transaction, which is what a migration is here, adding an enum value and
  **using** it is refused (`unsafe use of new value "etf" of enum type`), so an
  add-a-value-and-backfill migration cannot be written at all
- **`timestamptz` always**, both types `pg_column_size` 8 so the right one is free; the
  same bytes read under three session timezones give one instant three ways versus the
  same digits three times, and New York's 01:30 on 2026-11-01 exists **twice**
- **`observed_at` (event) and `recorded_at` (row written); `created_at` is banned** —
  invariant 5 needs both, one name cannot do both jobs, and **`observed_at` never has a
  default**, because `default now()` is invariant 4's leak on the column Epic 13 keys on
- **`id bigint generated always as identity primary key`, natural key `unique` beside it**
  — decided by `securities`, because a symbol is not stable across a ticker change
- **`numeric(18, 6)` for a per-share price, `bigint` for a count, never a float** — float
  addition is not associative, measured: `sum()` over the same three numbers returns 0 or
  1 depending on order, where `numeric` returns 1.0 for both. `pg` hands `numeric` and
  `bigint` to JavaScript as **strings**, which must not be "fixed"
- **No soft deletes and no `deleted_at`** — a delisted security's rows are still what
  happened, status is domain vocabulary Story 2.3 owns, and a second invisible predicate
  is a bug waiting for whichever one somebody forgets
- **The `Database` interface stays in `apps/backend`; `Security` goes in
  `packages/shared`; the mapping lives beside the query**, one function per domain type
  and never a generic mapper
- **Seed data is not a migration** — a migration runs once, is recorded, and is silently
  skipped if edited afterwards; Story 2.3 still chooses for the universe, against its own
  idempotence criterion
- **Two lists**: five conventions are checked today, five more are reachable from a
  migrated database and are handed to Task 2.2.5 with the `information_schema` reading
  that would check them, and the rest are prose permanently. A regex over SQL text was
  considered and declined — it cannot tell a statement from a comment
