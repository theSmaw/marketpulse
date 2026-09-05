# Migrations, and the conventions every table inherits

This directory is the description of MarketPulse's database: one `.sql` file per
change, applied in order by `pnpm migrate`. **Read this before writing one.** Ten
tables arrive through here across thirteen more epics (`PRODUCT_SPEC.md` §30),
and a convention decided after the third table is a convention with two
exceptions in it — so these were fixed while there was still nothing to migrate
away from (Task 2.2.3).

```
pnpm db                # the local database — Docker, PostgreSQL 18
pnpm build             # the runner is TypeScript; a migration needs a built tree
pnpm migrate           # apply everything this database has not seen
```

Everything about the **mechanism** — where migrations live and why, the
four-digit sequence rule, forward-only, why the file body runs through
`sql.raw()` inside one transaction, and why the exit code is a tested property
rather than a remembered one — is written beside the code that enforces it, in
[`../src/migrate.ts`](../src/migrate.ts). It is not repeated here. What is here
is the **vocabulary**: the decisions a migration author makes about a table, none
of which the runner has an opinion about.

Every figure below was measured against PostgreSQL 18.6 through `pg` 8.23.0 on
2026-09-05, not recalled. Where a claim was produced rather than read, it says
so.

---

## 1. Tables are plural, everything is `lower_snake_case`

Tables plural (`securities`, `market_bars`), columns singular snake case, no
prefixes, no `tbl_`. **The decision was already taken and re-taking it would be
worse than inheriting it**: §30 names all ten tables and names them plurally, so
the choice is between matching the authoritative product definition and renaming
ten tables that do not exist yet to win an argument about grammar. The value of
this convention is entirely in its consistency.

A foreign key column is `<referenced_table_singularised>_id` — `security_id`
referencing `securities.id` — so the column name says where to look without a
lookup. A join table is named for both sides and holds both.

**String columns are `text`, never `varchar(n)`.** In Postgres they are the same
storage with the same performance; a length limit is a constraint, and a
constraint invented from a guess ("a ticker is at most five characters" — until
`BRK.B` and a class-C listing) costs a migration to relax. Where a real domain
limit exists, express it as a `check` beside the column, which is what a
constraint is for and what can be relaxed in one transaction.

**A closed set of values is `text` with a `check` constraint, never a Postgres
`enum` type.** The reason is specific to this repository's migration shape — one
transaction per file — and it was produced rather than read:

| Change, inside one transaction              | Postgres `enum`                              | `text` + `check` |
| ------------------------------------------- | -------------------------------------------- | ---------------- |
| add a value                                 | OK                                           | OK               |
| add a value **and use it** (backfill a row) | `unsafe use of new value "etf" of enum type` | OK               |
| remove a value                              | no such operation exists — recreate the type | OK               |

So a migration that adds `etf` to a `kind` enum and backfills rows to it in the
same file **cannot be written at all**, and the failure arrives as a refusal
mid-migration rather than at review. The source of truth for the vocabulary is
the TypeScript union in `packages/shared` — the shape `HEALTH_STATUSES` and
`API_ERROR_CODES` already have — and the `check` constraint is the database's
backstop against a writer that bypassed it.

---

## 2. Timestamps — the one with a wrong answer

**`timestamptz`, always. Never `timestamp`.** This is not tidiness. This
product's whole domain is US market hours: Epic 4 renders a market clock, Epic 5
compares a move against a session, Epic 13 replays against a clock, and invariant
4 makes "no component may read data timestamped after the replay clock" a
structural property of the data layer rather than an instruction.

A naive `timestamp` stores digits and no instant. The same eight bytes, read
under three session timezones:

| Session `TimeZone` | `timestamp`           | `timestamptz`            |
| ------------------ | --------------------- | ------------------------ |
| `America/New_York` | `2026-03-08 01:30:00` | `2026-03-08 01:30:00-05` |
| `UTC`              | `2026-03-08 01:30:00` | `2026-03-08 06:30:00+00` |
| `Asia/Tokyo`       | `2026-03-08 01:30:00` | `2026-03-08 15:30:00+09` |

The `timestamptz` names one instant three ways. The naive column returns the same
digits to everybody and means nothing without knowing who wrote it and what their
session timezone was at the time — which nothing records. **Both are
`pg_column_size` 8**, so the correct type is also free; `timestamp` buys
literally nothing.

The failure appears twice a year and is not hypothetical. On 2026-11-01 in New
York, 01:30 happens **twice**:

```
'2026-11-01 01:30:00-04'::timestamptz  →  2026-11-01 01:30:00-04   (before the fall-back)
'2026-11-01 01:30:00-05'::timestamptz  →  2026-11-01 01:30:00-05   (after it)
'2026-11-01 01:30:00'::timestamp       →  2026-11-01 01:30:00      (cannot say which)
```

Two different instants an hour apart, indistinguishable in a naive column. An
anomaly detector comparing a bar against "the same time yesterday" gets the wrong
bar, once a year, silently.

**A trading _day_ is a `date`**, not a `timestamptz` — a session is a calendar
day in `America/New_York`, and that timezone is named explicitly wherever a date
and an instant are converted. It is never inferred from the server's or the
process's timezone, both of which are accidents. Story 2.4 owns the calendar.

### The two timestamps a row has, and why one name cannot do both jobs

Invariant 5 makes evidence carry **an event timestamp and a retrieval
timestamp**, so a schema with one `created_at` doing both cannot express the
domain. Two reserved names, on every table that holds a fact about the world:

- **`observed_at`** — when the thing was true **in the market**. This is the
  column Epic 13's temporal plugin filters on (`where "observed_at" <= $2`, the
  predicate produced in [`DATA-LAYER.md`](../../../planning/epic-02-security-universe-historical-data/story-02-database-schema-and-migrations/DATA-LAYER.md)),
  so it is a reserved name rather than a suggestion: a table that calls it
  something else is a table the seam cannot cover.
- **`recorded_at`** — when **we** wrote the row. Invariant 5's retrieval
  timestamp, and the only honest answer to "when did we learn this".

**`observed_at` never has a default, and that rule is load-bearing.** A
`default now()` would quietly turn "when we wrote it" into "when it happened",
which is precisely the leak invariant 4 exists to prevent, on the column the
whole replay mechanism keys on — and it would be invisible, because every row
would look plausible. It is `not null` and it is supplied by the writer.

`recorded_at` is `not null default now()`, and `now()` is the right function: it
is **transaction start time**, so every row written by one migration or one
ingest batch carries the same value. Measured inside one transaction 50 ms apart
— `now()` returned the identical value twice, `clock_timestamp()` did not. Use
`clock_timestamp()` only where a per-statement wall clock is the point.

A mutable row may also carry **`updated_at`**. **`created_at` is not a name used
in this schema**, deliberately: it is the name people reach for, and it is
ambiguous between the two timestamps above, which is how a schema ends up unable
to answer either question.

---

## 3. Identifiers: a surrogate `bigint` key, with the natural key beside it

```sql
id bigint generated always as identity primary key
```

plus a `unique` constraint on the natural key where there is one.

**`securities` is what decides this**, and it decides it against the natural key:
a symbol looks like a perfect primary key and **is not stable** — `FB` became
`META`, `TWTR` stopped existing. With `symbol` as the primary key a ticker change
rewrites the key and every foreign key referencing it, in every table, forever;
with a surrogate it is a one-row update and history stays attached to the
security it belongs to. The symbol is still `unique` and still the thing a human
and every provider uses, so nothing is lost — it becomes a lookup key rather than
an identity.

`generated always as identity` and not `serial`: identity is the standard
spelling, and it refuses an explicit value (`cannot insert a non-DEFAULT value
into column "id"`, produced), which stops an import quietly seeding a sequence
into a state where the next insert collides. `serial` is a sequence with
ownership rules people are surprised by.

`bigint` and not `int`, everywhere, as one rule rather than a per-table
judgement: `market_bars` will exhaust a 32-bit key at a scale this product is
sized for, and four bytes on `securities` is not a saving worth a second rule
that somebody applies to the wrong table.

**Not UUID by default.** Random UUIDs are 16 bytes, arrive in random order and
fragment a B-tree on insert, and buy the ability to generate an id outside the
database — which nothing here needs, because there is one database and one
writer. The reversal trigger is a table whose rows are created somewhere other
than this database and later merged, at which point that table gets a UUID and
this section gets an exception with a reason.

---

## 4. Money and prices are `numeric(18, 6)`. Counts are `bigint`. Neither is ever a float

**Never `double precision`, never `real`, for anything a user sees as a number.**
Invariant 1 says every number a user sees comes from deterministic code, and
binary floating point is not deterministic in the way that sentence needs:

```
0.1::float8   + 0.2::float8   = 0.3::float8   →  false   (0.30000000000000004)
0.1::numeric  + 0.2::numeric  = 0.3::numeric  →  true
```

Worse, and this is the one that produces a defect nobody can reproduce: float
addition is **not associative**, so the same three numbers summed in two orders
give two answers. Measured — `sum()` over `[1e16, 1.0, -1e16]` returns **0** and
over `[1e16, -1e16, 1.0]` returns **1**; `numeric` returns `1.0` for both. A
percentage change that disagrees with itself between two renders because a query
plan changed the aggregation order is an Epic 5 bug report with no cause in it.

**The rule is `numeric(18, 6)` for a price or a per-share money value.** Six
decimal places clears the $0.0001 sub-penny quoting increment by two orders of
magnitude and leaves a VWAP or a mean unrounded; twelve integer digits is
$999,999,999,999.999999, against BRK.A at roughly $700,000. Both edges were
produced: excess scale **rounds** (`1.23456789` → `1.234568`, silently), excess
precision is **refused** (`numeric field overflow`). Rounding silently is the one
to know about, and it is the right behaviour for a price — it is the wrong
behaviour for a large aggregate, which is why the rule is scoped to a per-share
value: a market capitalisation is thirteen integer digits and would overflow. The
first table that needs one decides its own precision, in `numeric`, and records
why here.

**A volume is a count, not a price**, so it is `bigint` and the numeric rule does
not apply to it: it is exact by being an integer, and a daily consolidated volume
exceeds 32 bits. A ratio derived from counts — a volume ratio, a percentage — is
`numeric` again the moment it is stored, for the reason above.

### The consequence in TypeScript, which is not optional

`pg` hands JavaScript these types, measured:

| Postgres           | JavaScript   | Value                                |
| ------------------ | ------------ | ------------------------------------ |
| `bigint`           | **`string`** | `"1234567890123"`                    |
| `numeric(18,6)`    | **`string`** | `"123.456789"`                       |
| `integer`          | `number`     | `42`                                 |
| `double precision` | `number`     | `1.5`                                |
| `timestamptz`      | `Date`       | the correct instant                  |
| `timestamp`        | `Date`       | **wrong by the reader's UTC offset** |
| `date`             | `Date`       | midnight in the reader's zone        |
| `boolean`          | `boolean`    | `true`                               |

The first two are **deliberate on `pg`'s part and must not be "fixed" with a type
parser**: a JavaScript `number` is a double, so parsing a `numeric` into one
throws away exactly the property the column type was chosen for, and a `bigint`
above 2^53 stops round-tripping. So the row type says `string`, and arithmetic
that has to be exact happens **in SQL** or in a decimal library — never by
`Number(row.close)`.

Read row six of that table from the other direction: a naive `timestamp` also
arrives as a `Date`, and it is silently reinterpreted in the **reading process's**
timezone — on the machine this was measured on (UTC+8) an eight-hour error, with
nothing failing. That is §2's argument arriving in TypeScript.

---

## 5. Nothing is soft-deleted. There is no `deleted_at`

Decided, not omitted, because Story 2.3 asks directly what happens to data
already stored for a removed symbol, and answering that in a hurry is how a
status column and a soft-delete column end up meaning overlapping things.

**Rows recording a fact about the world are not deleted, because the fact did not
stop being true.** A delisted security's bars are still what happened; Epic 13
replays a date on which that security was in the universe, and a database that
deleted its rows replays a market that did not exist. Invariant 5 makes
provenance first-class, and a deleted row has none.

What changes is the security's **status**, which is domain vocabulary Story 2.3
owns (`active`, `delisted`, …), is displayed rather than filtered away silently
per invariant 6, and is a fact about the world rather than about our bookkeeping.
A `deleted_at` would be a second, invisible predicate meaning something different
— and the failure mode of an invisible predicate is a forgotten `where deleted_at
is null`, which is exactly the class Epic 13's temporal plugin exists to make
structural for time. **One invisible predicate to enforce is a design; two is a
bug waiting for whichever one somebody forgets.**

So: no `deleted_at`, no `is_deleted`, no `archived_at`. A genuine mistake — rows
written that should never have existed — is corrected by a deliberate statement
run by a person, and is rare enough not to be worth a column on every table.

---

## 6. The schema is the source of truth, and there are two hand-written types

Task 2.2.1 settled the generation direction: **nothing is generated**, no build
step is added, and the TypeScript follows the schema by hand — `kysely-codegen`,
`drizzle-kit pull` and `prisma migrate dev` all introspect a **live** database,
which loses acceptance criterion 7 (`pnpm verify` passes with no database
running). What was left open is where the hand-written types live, and there are
**two of them, which are not the same type**:

| Type                                      | Lives in              | Describes                                                                                         |
| ----------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| Kysely's `Database` interface             | **`apps/backend`**    | rows as Postgres holds them — `string` for `numeric` and `bigint`, `Date`, `null`, `Generated<…>` |
| `Security`, and the domain types after it | **`packages/shared`** | vocabulary both apps speak                                                                        |

**The `Database` interface stays in `apps/backend`**, and Task 2.2.4 creates it in
the change that creates the table it describes. Three reasons, in order of weight.
It is a description of one process's transport rather than a shared fact: only
`apps/backend` connects to a database at all, and `packages/shared` means both
sides depend on the same thing rather than "shared is where types go" — the
argument Story 1.6 already used to keep the configuration type out of it. It
carries Kysely's own `Generated` and `ColumnType` helpers, so putting it there
makes the query builder a dependency of the frontend's type graph. And
`packages/shared` is consumed as **built output**, so a column rename would mean
rebuilding it before either app typechecks, for a type the frontend must never
import.

**A row is not a domain object, and what maps between them lives beside the
query, in `apps/backend`.** A row has a `sector_id` where a domain object has a
sector, and `sector text null` where `Security.sector` is a decision — so the
mapping is exactly the place a nullable column becomes an explicit domain answer
(a fallback, or a refusal to load the row at all, which is what Story 2.3's
acceptance criterion 3 requires). One function per domain type, in the module that
owns the query — never a generic row-to-object mapper, because a generic mapper is
where that decision gets skipped, and never in `packages/shared`, which would put
a row shape back on the frontend's side of the boundary. Story 2.8 writes the
first read and owns where the isolated query handle lives.

**Nothing checks the interface against the schema**, and that is a real gap of
this repository's third kind: a column renamed in a migration and not in the
interface typechecks, lints and builds, and fails at run time. Task 2.2.5 owns
closing it against `information_schema`.

---

## 7. Seed data is not a migration

**A migration changes the _shape_ of the database. Reference data arrives through
a re-runnable script.** The distinction is not stylistic — it is what each
mechanism can and cannot do:

|                             | Migration                                   | Script                       |
| --------------------------- | ------------------------------------------- | ---------------------------- |
| Runs                        | once, ever, per database                    | as often as you like         |
| Recorded                    | yes, in `kysely_migration`                  | no                           |
| Editing the file afterwards | **silently skipped** — there is no checksum | takes effect on the next run |
| Correcting its contents     | needs a second migration                    | edit and re-run              |

So data in a migration is data you **cannot correct** — you can only write a
second migration correcting the first, and the append-only history then contains
both. That is right for shape, where the history of how the schema got here is
the point, and wrong for content, where only the current answer matters.

**Story 2.3 chooses for the ~100-security universe**, and this section exists so
the choice is made against a stated rule rather than re-litigated. The criterion
it should be judged on is its own acceptance criterion 2: the universe loads in
one documented command and **re-running it is idempotent** — where "idempotent"
has to mean "picks up an edited list", which a migration structurally cannot do,
rather than "does nothing the second time", which a migration does trivially and
uselessly.

The honest exception, so it is not discovered later as a contradiction: a **lookup
table whose rows the schema depends on** — one a foreign key or a check references
— is arguably shape rather than content and belongs in the migration that creates
it. The deciding question is whether a row's absence would leave the schema
invalid rather than merely empty.

---

## What is checked, and what is prose

The line between these two lists is not effort. It is whether the thing being
checked is **reachable from an assembled instance** — this repository's own rule,
the one `apps/backend/src/server.test.ts` was written on.

There is a hard floor under it here: **a `.sql` file is read by nothing in this
repository.** Prettier reports `"inferredParser": null`, ESLint reports `File
ignored because no matching configuration was supplied`, and `tsc` has no view of
it — the same signature `apps/backend/scripts/dev.sh` and the `Dockerfile` carry.
So no convention expressed only in SQL text can be linted, and there are exactly
two places one can be checked: **the provider**, before a file runs, and **a
database-backed test**, after it has.

### Checked

| Convention                                                       | By what                                                                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Filename is `NNNN_lower_snake_case.sql`                          | `MIGRATION_NAME` in `SqlFileMigrationProvider` — refuses the file rather than skipping it, and was made to fail |
| A migration is never reordered, and an applied one never deleted | `allowUnorderedMigrations: false` — `corrupted migrations: …`, by name, at the database                         |
| Forward-only                                                     | structural — there is no `down` and no `migrateDown` call anywhere                                              |
| A failing migration exits non-zero                               | `summariseMigration`'s tests, three of which were seen to fail                                                  |
| An empty migration directory is an error                         | the provider, rather than a silent "nothing to do"                                                              |

### Prose

Everything in sections 1 to 7 above. Of those, five are **reachable** from a
migrated database, and they are handed to Task 2.2.5 with the reading that would
check them rather than left as an aspiration:

| Convention                                    | Where it is readable                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| No `timestamp without time zone`, anywhere    | `information_schema.columns.data_type` — the correct type reads `timestamp with time zone`                                           |
| Every price column is `numeric` at (18, 6)    | `data_type`, `numeric_precision`, `numeric_scale`                                                                                    |
| No `double precision` or `real` column exists | `data_type`                                                                                                                          |
| No `deleted_at` / `is_deleted` / `created_at` | `column_name`                                                                                                                        |
| Every table has an identity `id`              | `is_identity = 'YES'` — note `column_default` is `null` for an identity column, so a check written against the default finds nothing |

The rest are **not** reachable and are prose permanently: plural table names,
snake case, the `security_id` foreign key spelling, `text` over `varchar(n)`, and
— the two that matter most — that `observed_at` means _when it happened in the
market_ and `recorded_at` means _when we wrote it_. A database can confirm both
columns are `timestamptz`; nothing can confirm a writer put the right value in the
right one. That is what review is for, and it is why this document exists.

**A regex over the SQL text was considered and declined.** It could catch
`timestamp` and `double precision` before the file ran, which is earlier and
therefore tempting — and it cannot tell a statement from a comment or a string
literal, so it would false-positive on this very directory's header comments, and
the workaround for a false positive is to phrase the comment differently, which is
the worst possible thing to teach. The database can tell them apart. Ask it there.
