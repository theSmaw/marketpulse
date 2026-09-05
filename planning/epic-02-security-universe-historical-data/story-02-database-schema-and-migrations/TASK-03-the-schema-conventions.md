# Task 2.2.3 — Write the conventions down, before there is a table to argue about

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Task 2.2.2 (migrations have a home, so the conventions have somewhere to sit)

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
  writing a migration, and the same rule applies to duplication — point at it from
  `CLAUDE.md` and `README.md` rather than copying it, because copying a paragraph for
  legibility is how Epic 1 ended with twelve near-identical blocks and a task spent
  reconciling them
- **Say which of these a tool enforces and which are prose**, in the two-list shape Task
  1.13.6 used. The line is not effort — it is whether the thing being checked is reachable
  from an assembled instance. A `numeric` column type is readable from a live database and
  therefore checkable; a naming convention across tables that do not exist yet is not

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
