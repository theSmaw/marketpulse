# Task 2.3.3 — The schema the vocabulary needs: the first migration written by a reader of the conventions

**Status:** Not started
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Tasks 2.3.1 (the decisions) and 2.3.2 (the types the constraints back)

## Objective

Bring `securities` up to the vocabulary Task 2.3.2 fixed — the `status` check, whatever
the proxy distinction needs, and the provenance columns acceptance criterion 6 asks for —
and extend `pnpm test:database` so the new agreements are checked rather than stated.

This is also the first migration in this repository written by somebody **following**
`apps/backend/migrations/README.md` rather than writing it, which makes it the first
honest test of whether that document is usable. Record anything it failed to answer.

## Work

- **Write `0003_*.sql`** — one migration, following the naming rule (`NNNN_lower_snake_case
.sql`, a four-digit sequence and not a timestamp; a name that does not match is an error
  rather than a skipped file). Everything it does is **additive**, which matters beyond
  tidiness: Task 2.2.7 made "the schema may be left ahead of the code" survivable only
  while migrations are additive, and that is a written convention enforced by nothing
- **Add the `check` on `status`**, whose absence Task 2.2.4 recorded as deliberate and
  temporary: `status`'s vocabulary was Story 2.3's and did not exist, so a check would
  have been a vocabulary this story had to migrate rather than choose. It exists now.
  Note the two mechanical findings this constraint has to be written and checked against,
  both already produced: Postgres **rewrites** `check (x in (…))` into
  `CHECK ((x = ANY (ARRAY[…])))`, so a check on the constraint cannot be a string match on
  the migration's own text; and inside one transaction — which is what a migration is here
  — a Postgres `enum` cannot be extended and used, which is why this is `text` + `check`
- **Make the proxy distinction real in the schema**, in whichever shape Task 2.3.1 chose.
  If it widened `SECURITY_KINDS`, this is the "add a member and backfill" migration that
  Task 2.2.4's refusal of `enum` was specifically protecting — say so, because that
  decision was taken on an argument and this is the first time it pays. If it added a
  column, give it the same source-of-truth treatment: the union in `packages/shared`, the
  `check` as the database's backstop
- **Add whatever per-field provenance needs**, per Task 2.3.1's shape. Two things to hold
  while writing it. It is **metadata about a row's fields rather than a fact about the
  market**, so `migrations/README.md` §2's `observed_at` is still not the answer here and a
  defaulted one would still be the leak that convention forbids — but a _retrieval_
  timestamp per source plausibly is exactly what invariant 5 wants, and this is the first
  table with any claim on that pair. Decide it explicitly rather than by omission, the way
  Task 2.2.4 did. And it must be renderable by Story 2.13 without that story having to
  reverse-engineer it, so write down what it will read
- **Add the first foreign key in this schema if the sector-to-ETF relationship is one.**
  This is a genuine decision rather than an obvious yes: the mapping might be a self
  reference from an equity to its sector ETF's row, a `sectors` table, or not in the
  database at all because Task 2.3.2 put it in `packages/shared`. Whichever it is, the
  **foreign-key naming rule (`<table_singularised>_id`) is the convention Task 2.2.4
  recorded as untested**, and if this task creates one, it is the first thing to exercise
  it — and if it does not, say so, because that convention is then still untested and
  Story 2.7 inherits it
- **Do not add an index for a query that does not exist.** Story 2.8 writes the first read.
  The exception worth arguing rather than assuming: the loader itself is about to look rows
  up by `symbol` on every run, and `symbol` already has a unique constraint with a btree
  behind it — which Task 2.2.4 verified is a `UNIQUE CONSTRAINT` and not a bare index, a
  distinction that matters to anything reading `pg_constraint`. So the loader probably
  needs nothing new; check rather than add
- **Update `apps/backend/src/schema.ts` in the same change**, because the compiler holds
  interface → spec (`TS1360` on a column added to the interface and not described in the
  test's expectation) and `pnpm test:database` holds spec → database, and the two together
  are the only thing standing between a renamed column and a run-time failure
- **Extend `pnpm test:database`**, which is where the checked-versus-prose line for this
  schema now lives. At minimum: the new columns' types, nullability and defaults read back
  from `information_schema`; the new `check` constraints parsed out of `pg_constraint` and
  compared against their `packages/shared` source of truth, the way `SECURITY_KINDS` already
  is. Note the two traps that suite already carries: **do not count `pg_constraint` rows**,
  because PostgreSQL 18 materialises `NOT NULL` as rows there and older majors do not, so
  the count is a statement about the engine rather than the schema; and read nullability
  from `information_schema`, which is stable across majors
- **Watch for a vacuous check.** Task 2.2.5 found that three of its conventions would have
  passed by having nothing to look at, and left a **tripwire** asserting zero `numeric`
  columns so the money rule fails open the moment `market_bars` arrives. Anything added
  here that is checked against an empty table is in the same position — say so, and prefer
  a check that fails loudly to one that certifies nothing
- **Apply it to an empty database and read the result back off the database**, not off the
  file, and apply it twice. Then confirm the checksum path is still clean, because this is
  the first migration added since Task 2.2.7 built it: `migration_checksum` should gain
  one row and the two existing ones should be untouched

## Done when

- `0003_*.sql` applies to a database holding `0001` and `0002`, and applying it again is a
  no-op — both observed
- Every closed vocabulary in `packages/shared` that the database also constrains is
  compared against the constraint's rewritten text by `pnpm test:database`
- `schema.ts` and the migration agree, held by the compiler in one direction and the
  database suite in the other
- The `observed_at` question is answered explicitly for the provenance columns, either way
- Any convention this table still cannot exercise is named as untested
- `pnpm verify` passes with no database running

## Notes

The failure this task is most likely to produce is a migration that is correct and a
`schema.ts` that is not, because the two are edited in one change and only one of them is
read by `tsc`. That is the whole reason Task 2.2.5's suite exists; run it before believing
the migration.
