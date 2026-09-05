# Task 2.2.4 — The first schema: `securities` and nothing more

**Status:** Complete — 2026-09-05
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Tasks 2.2.2 (the mechanism) and 2.2.3 (complete) — the conventions it has
to follow are settled and measured, in
[`apps/backend/migrations/README.md`](../../../../apps/backend/migrations/README.md). Read it
first: four of the bullets below are now answers it produced rather than questions still
open, and one of them changes this table's shape rather than its style

## Objective

Put one real table through the mechanism — enough for Story 2.3 and deliberately not one
column more — and prove the conventions survive contact with something that exists.

## Work

- **Write the migration for `securities`, sized by Story 2.3's stated vocabulary and no
  further**: symbol, name, exchange, kind (equity or ETF — §6 and Epic 4 treat them
  differently, so this is a real column and not a flag), sector, industry, status, and the
  identifier fields that let Epic 9 map a security to a CIK. **Story 2.3 owns what is in
  the rows and this task owns the shape of the table**, and the boundary is worth holding:
  the sector taxonomy, the index-proxy-versus-sector-proxy distinction and the selection
  rule are all 2.3's, and a column invented here to anticipate one of them is a column 2.3
  has to migrate. **Task 2.2.3 settled the types, and one of its decisions changes this
  table's shape rather than its style: `kind` and `status` are `text` with a `check`
  constraint and NOT a Postgres `enum`.** That is the reach a schema author's hand goes to
  first here, and the reason it is refused was produced rather than argued — inside one
  transaction, which is exactly what a migration is in this repository, adding an enum value
  and _using_ it in the same file is refused with `unsafe use of new value "etf" of enum
type`, and removing a value has no operation at all. So `create type security_kind as enum
(…)` would make Story 2.3's first "add a kind and backfill the rows" migration
  unwriteable. The vocabulary's source of truth is the TypeScript union in
  `packages/shared`, the way `HEALTH_STATUSES` already is; the `check` is the database's
  backstop. The rest follow the same document: `id bigint generated always as identity
primary key` with `symbol` `unique` beside it, `text` rather than `varchar(n)`, and no
  `deleted_at` — a removed symbol is a `status`, which is Story 2.3's vocabulary
- **`market_bars` is not in this task and not in this story.** Story 2.8 owns it, because
  its shape is driven by measured ingestion rather than by a guess — the partitioning
  question, the primary key, and whether TimescaleDB is warranted are all decisions with a
  row count behind them, and §37 says do not add a second data technology without a
  measurement. A `market_bars` table created here would be created against no measurement
  at all
- **Apply it to an empty database and check the schema that came out**, by reading the
  database rather than by re-reading the file: column types, nullability, defaults,
  constraints and indexes. That is acceptance criterion 2's first half, and reading it back
  is what catches the difference between what the migration says and what Postgres did with
  it — a `numeric` without precision, a `timestamptz` default evaluated at migration time
  rather than at insert, a unique constraint that quietly became an index. **Two of those
  three now have a measured answer, so read them rather than re-deriving them.** A
  `default now()` stores the _expression_ and `information_schema.columns.column_default`
  reads back the string `now()`, so it is evaluated per insert — and `now()` is
  **transaction start time**, measured identical twice across a 50 ms sleep where
  `clock_timestamp()` was not, which is the property that makes one ingest batch share one
  `recorded_at`. And the trap that would otherwise cost a session: **an identity column
  reports `column_default: null` and `is_identity: 'YES'`**, so a readback written against
  the default concludes there is no identity and finds nothing wrong
- **Apply it twice.** Criterion 2's second half, now with something to be non-idempotent
  about
- **Ship no seed data**, per Task 2.2.3's decision, and confirm the table is empty
  afterwards. Story 2.3 fills it
- **Exercise the conventions on the one table that can**: at least one `timestamptz`, the
  identifier decision applied to a table with a genuine natural key, and the naming rule
  in a foreign key if there is one to have — and if there is not, say so, because that is a
  convention this story cannot test and Story 2.3 or 2.8 will be the first to.
  **One candidate for that list is already visible and it is the most consequential
  convention 2.2.3 wrote, so decide it here rather than letting the story close without
  noticing.** The `observed_at` / `recorded_at` pair exists because invariant 5 needs an
  event timestamp and a retrieval timestamp, and `observed_at` is the reserved name Epic
  13's temporal plugin filters on — but `securities` is **reference data rather than a fact
  about the market**, so it plausibly has a `recorded_at` and an `updated_at` and no
  `observed_at` at all. If that is the answer, say so explicitly and name `market_bars`
  (Story 2.8) as the first table that exercises the pair, because "the only table in the
  schema has one timestamp" is exactly how a two-timestamp convention quietly becomes a
  one-timestamp habit. Do **not** add an `observed_at` to `securities` to make the
  convention look tested — a defaulted or invented one is the leak the convention forbids
- **Write the `Database` interface, because nothing has yet and this is the task that gives
  it something to describe.** Task 2.2.1 decided nothing is generated and **Task 2.2.3
  decided where it lives: the `Database` interface stays in `apps/backend`** — a row is not
  a domain object, it describes one process's transport rather than a fact both sides depend
  on, it would drag Kysely's `Generated` and `ColumnType` into whatever imports it, and
  `packages/shared` is consumed as built output. `Security` goes in `packages/shared` and
  **what maps between them lives beside the query, one function per domain type and never a
  generic mapper**, which is Story 2.9's to write and this task's to not pre-empt. Task
  2.2.5 asserts the interface against `information_schema`. In
  between, **no task owned actually writing it**, and Task 2.2.2 left the migrator on
  `Kysely<unknown>` because there was no table and therefore nothing true to say. That gap
  closes here: add the interface with a `securities` entry, and decide in the same change
  whether `migrate.ts`'s instance becomes `Kysely<Database>` or stays `Kysely<unknown>` —
  a migrator that names the schema it is about to change is arguably wrong, since the
  interface describes the schema **after** the migration and not before it, so this is a
  real decision rather than a tidy-up. Say which and why beside the line
- **Say what a second copy of this database now needs to become correct**, which is one
  command and is the whole point of the mechanism existing — and note that the command
  changes nothing structurally here, since `pnpm migrate` already exists and applies
  everything pending; what this task adds is the first thing worth applying

## Done when

- `securities` exists in the local database through the mechanism, with nothing beyond
  Story 2.3's needs
- The schema was verified by reading the database, and the reading is recorded
- Applying the migration twice is a no-op, observed
- The table is empty and seeding is somebody else's task
- The `Database` interface exists in `apps/backend`, describes `securities`, and the
  migrator's own generic parameter is decided rather than left at `Kysely<unknown>` by
  default
- Any convention this table could not exercise is named as untested, with the
  `observed_at` / `recorded_at` pair answered explicitly either way
- No Postgres `enum` type was created

## Notes

The temptation this task exists to resist is `market_bars`. It is the table the epic is
about, its shape looks obvious, and adding it here would cost Story 2.8 the one thing it
has that this story does not: a measurement.

## Outcome — 2026-09-05

`apps/backend/migrations/0002_securities.sql` creates one table with eleven columns and
nothing else. `apps/backend/src/schema.ts` is the `Database` interface. `SECURITY_KINDS`
is two strings in `packages/shared`. No seed data, no `market_bars`, no index beyond the
primary key and `symbol`'s unique constraint, and **no Postgres `enum` type**.

### The shape, and the four decisions inside it

`id bigint generated always as identity primary key`, `symbol text not null unique`,
`name`, `exchange`, `kind` (checked), `sector` and `industry` (nullable), `status`
(unchecked), `cik` (nullable, **not** unique), `recorded_at` and `updated_at`.

- **`kind` carries a `check` and `status` does not**, and the asymmetry is the point.
  `kind`'s vocabulary is fixed by §6 and now lives in `SECURITY_KINDS`, so the constraint
  has a source of truth — which is what `migrations/README.md` requires of a closed set.
  `status`'s vocabulary is Story 2.3's and does not exist yet, so a check here would be a
  vocabulary that story has to _migrate_ rather than _choose_.
- **`cik` is deliberately not unique.** Share classes of one company share a CIK — GOOG
  and GOOGL, BRK.A and BRK.B — so the reflexive `unique` would refuse a universe Story 2.3
  is likely to want.
- **Story 2.3's acceptance criterion 3 is deliberately not encoded.** "Every equity has a
  sector, and every sector present has a corresponding sector ETF" has a second half that
  is a statement about the whole table rather than about a row, so a row-level check could
  express only the first half and would read as though it enforced the rule.
- **`symbol` has no format check**, though `isTicker` exists in `packages/shared` with the
  pattern. A copy in SQL is a pattern nothing compares against the original — this
  repository's third kind of gap, created on purpose — and validating _contents_ belongs to
  the loader that owns contents, which can call the existing predicate.

### `observed_at` — the convention this table cannot exercise, answered explicitly

**`securities` has `recorded_at` and `updated_at` and no `observed_at`.** It is reference
data rather than a fact about the market: there is no instant at which a security "was
true" that differs from when we recorded it. Adding a defaulted one to make the convention
look tested would be exactly the leak `migrations/README.md` §2 forbids. **`market_bars`
(Story 2.8) is the first table that exercises the pair**, and it is named here so that "the
only table in the schema has one timestamp" does not quietly become the habit.

Two other conventions are untested for the same reason and are named rather than assumed:
the **foreign-key naming rule** (`<table_singularised>_id`), because this table references
nothing — Story 2.3 or 2.8 will be the first — and the **`numeric(18, 6)` money rule**,
because `securities` holds no money. `updated_at` has **no trigger**: it is correct at
insert through its default and maintained by the writer thereafter, on the argument that a
trigger is a second place row behaviour lives that no tool here reads, against exactly one
writer today. The reversal trigger is a second writer.

### The `Database` interface, and the migrator's generic

It lives in `apps/backend/src/schema.ts`, per Task 2.2.3. **`migrate.ts` stays
`Kysely<unknown>`, decided rather than defaulted**, on three arguments written beside the
line: the interface describes the schema _after_ every migration, so a migrator typed with
it asserts a shape that is false for the whole duration of what it is doing; it would buy
nothing, since bodies go through `sql.raw()` and no `selectFrom` exists there; and it would
make the runner depend at compile time on the description of its own output, so a future
migration that dropped a table would break the compilation of the runner that has to apply
it.

`id` is typed **`GeneratedAlways<string>`** rather than `Generated<string>`, and the two
halves agree by construction: `GeneratedAlways` is `ColumnType<S, never, never>`, so an
insert supplying an `id` is a compile error, which is exactly what the column does at run
time. `recorded_at` is written long-hand as `ColumnType<Date, Date | undefined, never>` —
**update is `never`**, which is the type system expressing the one thing about that column
SQL cannot: "when we wrote it" is not a fact that changes. `updated_at` is `Generated<Date>`
and updatable, which is the whole distinction between the two columns rendered in types.

### What was read back off the database

Applied to a **genuinely empty** database (`pnpm db down -v`, `pnpm db`, `pnpm migrate`):
`✓ 0001_baseline`, `✓ 0002_securities`, `Applied 2 migrations.`, exit 0. Applied again
twice: `Already up to date — no migrations to apply.`, exit 0 both times. `securities` holds
**0 rows**.

Every column matched the interface on names, types, nullability and defaults — verified
against `information_schema.columns` and then against what `pg` actually hands JavaScript,
field by field (`id` a **string**, both timestamps `Date`, `industry` `null`). `cik`
round-tripped `0001045810` with its leading zeros, which is why it is `text`.

Both refusals were produced on the real table rather than inferred: an explicit `id` is
`cannot insert a non-DEFAULT value into column "id"`, and `kind = 'mutual_fund'` is
`violates check constraint "securities_kind_check"`.

**Three things the readback found that reading the file would not have.**

1. **The unique constraint did not "quietly become an index".** `\d` reports
   `securities_symbol_key` as a `UNIQUE CONSTRAINT` with a btree behind it — a constraint
   backed by an index, which is not the same thing as a bare index, and the distinction
   matters to anything reading `pg_constraint`.
2. **PostgreSQL 18 materialises `NOT NULL` as `pg_constraint` rows** (`contype = 'n'`,
   `securities_symbol_not_null`), which older majors do not. Confirmed to be the engine
   rather than this migration, because Kysely's own `kysely_migration` table has them too.
   **Task 2.2.5 must not count `pg_constraint` rows**, because that count differs between
   Postgres majors while the schema does not.
3. **Postgres rewrites `check (kind in (…))` into `CHECK ((kind = ANY (ARRAY['equity'
::text, 'etf'::text])))`.** So the check that `SECURITY_KINDS` and the constraint agree —
   handed to Task 2.2.5 below — cannot be a string match on what the migration says; it has
   to read the rewritten form.

### What a second copy of this database needs

`pnpm migrate`, and structurally nothing changed: the command already existed and already
applied everything pending. What this task added is the first thing worth applying. From
nothing, the sequence is `pnpm install` → `pnpm build` → `pnpm db` → `pnpm migrate`, and
it was run end to end that way twice.

### Handed to Task 2.2.5

A **new unchecked invariant of this repository's third kind**, created deliberately and in
the open: `SECURITY_KINDS` in `packages/shared` and `securities_kind_check` in the database
must agree, and nothing compares them. Adding a member to the union without the migration
gives a value the compiler permits and the database refuses, at run time, in whatever writes
it. It is reachable from a migrated database — the constraint's own text is in
`information_schema` — so by this repository's rule it should become a check rather than
prose, and finding 3 above is the shape that check has to take.

### Figures

`pnpm verify` exit 0 **with** a database and exit 0 in **27.89 s with none** — criterion 7
re-taken on a task that could have broken it. `pnpm test` is **239** (37 + 99 + 103),
unchanged: `security.ts` ships no test, which is consistent with `feed-status.ts` and
`anomaly.ts` — the one thing worth asserting about it needs a database, and that is 2.2.5's.
The migrations survived a `pnpm db down` / `pnpm db` cycle.
