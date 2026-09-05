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
  rather than a skipped file). **It is this repository's first non-additive migration, and
  that has to be argued rather than waved through**: Task 2.2.7 chose a step in
  `deploy.yml` before the container rolls, and that shape is survivable only because a
  migration leaves the database _ahead_ of the code — which is true of an added column and
  is **not** true of the `kind` widening below, which drops `'etf'` from the check
  constraint and so leaves the database able to store strictly less than before. It is
  safe here for two reasons that must both be stated in the file and will not both hold
  next time: `securities` holds **zero rows**, so there is nothing the tightened check can
  reject, and **nothing writes to the table at all** until Task 2.3.5's loader, which ships
  after this migration. Everything else in `0003` is additive. That convention is enforced
  by nothing, so the exception is worth a comment where the next author will read it
- **Add the `check` on `status`**, whose absence Task 2.2.4 recorded as deliberate and
  temporary: `status`'s vocabulary was Story 2.3's and did not exist, so a check would
  have been a vocabulary this story had to migrate rather than choose. It exists now.
  Note the two mechanical findings this constraint has to be written and checked against,
  both already produced: Postgres **rewrites** `check (x in (…))` into
  `CHECK ((x = ANY (ARRAY[…])))`, so a check on the constraint cannot be a string match on
  the migration's own text; and inside one transaction — which is what a migration is here
  — a Postgres `enum` cannot be extended and used, which is why this is `text` + `check`
- **Widen `kind` to `equity | sector_etf | index_etf`**, which is the shape Task 2.3.1
  chose. This is the migration Task 2.2.4's refusal of a Postgres `enum` was specifically
  protecting — inside one transaction an enum value cannot be added _and used_ — so say so
  in the file, because that decision was taken on an argument and this is the first time it
  pays. **There is no backfill**, and the absence is worth writing down rather than leaving
  a reader to look for the `update` this kind of migration usually carries: the table is
  empty, so it is drop-check, add-check, and nothing else. The dropped member is what makes
  it non-additive — see the bullet above
- **Add the two provenance pairs Task 2.3.1 chose** — `profile_source` /
  `profile_retrieved_at` and `classification_source` / `classification_retrieved_at`. Note
  what is deliberately absent and why, so it does not read as an omission: `cik`'s pair
  waits for Epic 9, which is what populates `cik`, because a column null in every row in
  every environment cannot be checked against anything; and `kind` and `status` get no pair
  at all, because "we decided this" is not a retrieval. Their nullability is its own small
  decision — `not null` is available only because the table is empty, and a default would
  be this migration inventing a source. Two things to hold
  while writing it. It is **metadata about a row's fields rather than a fact about the
  market**, so `migrations/README.md` §2's `observed_at` is still not the answer here and a
  defaulted one would still be the leak that convention forbids — but a _retrieval_
  timestamp per source plausibly is exactly what invariant 5 wants, and this is the first
  table with any claim on that pair. Decide it explicitly rather than by omission, the way
  Task 2.2.4 did. And it must be renderable by Story 2.13 without that story having to
  reverse-engineer it, so write down what it will read
- **Expect to create no foreign key, and say so rather than leaving it unmentioned.** Task
  2.3.1 closed both candidates: the sector-to-ETF mapping goes in `packages/shared` as a
  `Record` total over the taxonomy, and the separate `security_field_provenance` table was
  rejected in favour of columns. So the **foreign-key naming rule
  (`<table_singularised>_id`) that Task 2.2.4 recorded as untested stays untested**, and
  Story 2.7 inherits it. Record that explicitly — a convention that is silently still
  untested after the story that looked most likely to exercise it is exactly the kind of
  thing this repository's third class of gap is made of
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
