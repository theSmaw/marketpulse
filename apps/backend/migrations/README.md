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

The one exception is [§8](#8-when-a-migration-fails--what-it-leaves-behind-and-how-to-recover),
which is about the mechanism and is here anyway, because the moment you need it
you are reading a failure rather than reading source.

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
`enum` type.** The reason is specific to this repository's migration shape — the
migrator runs **one transaction for the whole run**, corrected by Task 2.2.7
from the "one per file" this said before, which makes the argument below
_stronger_ rather than weaker: a value added in `0004` and used in `0005` is
still inside the same transaction, so splitting the change across two files does
not escape it. Produced rather than read:

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

**A third name arrived with `0003`: `<group>_retrieved_at`, and it is a genuine
half-pair rather than an `observed_at` in disguise.** `securities` carries
`profile_retrieved_at` and `classification_retrieved_at` — when we asked a source
for a group of fields — which is invariant 5's _retrieval_ timestamp with **no
event timestamp beside it, because there is no event**: a security's sector is
not a fact about the market at an instant, and there is no moment at which "AAPL
is in technology" became true the way a price became true. So `securities` still
has no `observed_at`, and `market_bars` in Story 2.7 remains the first table that
exercises the pair.

It is not `recorded_at` either, and the difference is real rather than pedantic:
`recorded_at` is when we wrote the **row**, and a row can be rewritten from
metadata retrieved long before it — which is exactly what a loader re-run against
an unchanged curated file does. Both are needed; neither substitutes.

**A provenance column is `not null` with no default.** A default would be the
migration inventing a source — `default 'curated'` silently attributes a
provider's row to a file — and the point of the column is that a writer _cannot_
insert without saying where the data came from. Note the consequence: adding one
to a populated table is a migration that fails, so this shape is only available
while the table is empty, and a later table gets its provenance columns in its
own `create table`.

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

~~**Nothing checks the interface against the schema**, and that is a real gap of
this repository's third kind: a column renamed in a migration and not in the
interface typechecks, lints and builds, and fails at run time. Task 2.2.5 owns
closing it against `information_schema`.~~ **Closed by Task 2.2.5 and re-verified
at the story's close (2026-09-05).** `apps/backend/src/migrate.database.test.ts`
declares its expectation `satisfies Record<keyof SecuritiesTable, ExpectedColumn>`
and then compares that expectation against `information_schema` — so the compiler
holds interface → spec and the test holds spec → database, and a column renamed in
a migration and not in the interface is now a red `pnpm test:database`.

---

## 7. Seed data is not a migration

**A migration changes the _shape_ of the database. Reference data arrives through
a re-runnable script.** The distinction is not stylistic — it is what each
mechanism can and cannot do:

|                             | Migration                                      | Script                       |
| --------------------------- | ---------------------------------------------- | ---------------------------- |
| Runs                        | once, ever, per database                       | as often as you like         |
| Recorded                    | yes, in `kysely_migration`                     | no                           |
| Editing the file afterwards | **refused** — exit 1, both hashes printed (§9) | takes effect on the next run |
| Correcting its contents     | needs a second migration                       | edit and re-run              |

So data in a migration is data you **cannot correct** — since Task 2.2.7 the
runner refuses an edited applied file outright rather than skipping it, so you can
only write a second migration correcting the first, and the append-only history then contains
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

## 8. When a migration fails — what it leaves behind, and how to recover

Every class in this section was **produced** against PostgreSQL 18.6 on a scratch
database and reverted, rather than read from documentation (Task 2.2.6).

**The headline, and it is the same answer for every execution failure: the
database is exactly as it was.** Postgres has transactional DDL, the whole file
body runs as one `sql.raw()`, and Kysely writes the bookkeeping row in the
_same_ transaction — so there is no half-applied state and nothing to repair.
**That transaction covers the whole run rather than one file** (Task 2.2.7,
corrected by measurement), so a run of three migrations whose third fails rolls
back all three, which is stronger than what this section originally claimed. A failed migration is not recorded, so the next run
retries it.

**So the recovery for every row below is the same, and it is not "drop the
database":**

```
# fix the file, then:
pnpm migrate
```

`pnpm db down -v && pnpm db && pnpm migrate` is the bigger hammer, and it is
needed for exactly one of these — the last row, which is the only failure that
leaves a database genuinely wrong.

| What you did                                                    | What it says                                                                                  | What it left behind                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A syntax error                                                  | `syntax error at or near "tabel"`                                                             | Nothing. Not recorded                                                                          |
| Two statements, the second fails, against a table **with rows** | `column "symbol" of relation "securities" already exists`                                     | Nothing — the first statement and its `update` are rolled back too, and the rows are untouched |
| `set not null` on a column that has nulls                       | `column "sector" of relation "securities" contains null values`                               | Nothing. Not recorded                                                                          |
| A `check` a table's existing rows violate                       | `check constraint "securities_status_check" of relation "securities" is violated by some row` | Nothing. Not recorded                                                                          |
| `create index concurrently`                                     | `CREATE INDEX CONCURRENTLY cannot run inside a transaction block`                             | Nothing — **not** the `INVALID` index this leaves outside a transaction                        |
| A filename that is not `NNNN_lower_snake_case.sql`              | The provider refuses it by name                                                               | Nothing. No migration ran at all                                                               |
| No database                                                     | `connect ECONNREFUSED …`                                                                      | Nothing. No migration ran at all                                                               |
| **Editing a migration that was already applied**                | **`Already up to date` — exit 0**                                                             | **A database that no longer matches the files.** See below                                     |

All of them exit **1** except the last, which exits **0**. That is the point of
the last row.

### The two failure messages say different things, and the difference is real

- _"Migration `X` failed and was rolled back"_ — a migration executed and threw.
- _"failed before any migration was executed, so the database is exactly as it
  was"_ — Kysely never got as far as running anything: a refused filename, a
  corrupted migration list, an unreachable database. In this class `results` is
  **`undefined`**, which is why `summariseMigration` checks `error` first and on
  its own; a check written over `results` alone misses the whole class.

Both were produced. If a failure ever lands in the wrong branch, the message is
actively misleading rather than merely unhelpful — one of them claims a rollback
and the other claims nothing ran.

### The message names the migration and does **not** name the statement

Measured, because it is worth knowing before you go looking for a line number.
The whole file body is one `sql.raw()` call, so Postgres sees a single
multi-statement query and the `DatabaseError` `pg` raises carries:

| Class           | SQLSTATE | `position`                                   |
| --------------- | -------- | -------------------------------------------- |
| Syntax error    | `42601`  | `86` — a character offset into the file body |
| Null violation  | `23502`  | absent                                       |
| Check violation | `23514`  | absent                                       |
| Not in a txn    | `25001`  | absent                                       |

So **only a syntax error is locatable at all**, and none of it is printed today.
The error also carries `line`, which is a trap: it is PostgreSQL's own C source
line (`"7695"`), not a line in your migration. If a file ever grows big enough
that "syntax error at or near `x`" is ambiguous, the right change is for the
provider to hand the body along so a real line number can be computed from
`position` — not to print the offset raw.

### The one thing a rollback does not give back

**A rolled-back migration consumes identity values.** Produced: against a
`securities` holding ids 1–3, a migration inserted two rows and then failed. The
rollback left three rows with max id 3 — and the next insert got id **6**, not 4.
Sequences are non-transactional in Postgres by design.

`migrate.ts` says _"it left nothing behind and was not recorded"_, and that
sentence is **deliberately left as it is**. It is read by somebody who has just
had a migration fail and is deciding whether to go and look at the database, and
for that question it is correct: a gap in a surrogate key's sequence is not
something anyone can or should act on, ids here are explicitly not contiguous,
and lengthening the sentence would spend a reader's attention on a non-problem
at the moment they have least of it. It is recorded here instead, because the
claim is not quite true and noticing that is worth more than the wording.

### Two migrations at once are safe, and the mechanism is an advisory lock

Not hypothetical from Task 2.2.7 onward: two merges 95 s apart have already
produced two overlapping deploy runs once.

Kysely's Postgres adapter takes a **session-level advisory lock** —
`pg_advisory_lock(3853314791062309107)`, a hard-coded id, with `lock_timeout`
set to **one hour**. Produced by running two `pnpm migrate` processes half a
second apart against one database: the second appeared in `pg_stat_activity` as
`wait_event_type: Lock`, `wait_event: advisory`, waited for the first to finish,
then correctly reported `Already up to date` and exited 0. No interleaving, no
double-apply.

Three consequences worth carrying:

- **The lock is per-database.** `pg_locks.database` is the database's own OID, so
  a migration against one database does not block one against another on the same
  server. This is why the scratch-database pattern is genuinely isolated.
- **A failing first runner does not poison the second.** Produced: run 1 failed
  after six seconds; run 2 took the lock, ran the same migration itself, failed
  the same way, and also exited 1. Both report the failure — neither reports
  success.
- **The lock is session-level, so a hard crash releases it** when the connection
  drops. But a runner that _hangs_ holds it, and the second waits up to an hour
  before erroring rather than failing fast.

### Editing a migration that has been applied — caught since Task 2.2.7

**This section used to end "the only thing that catches this is a person".** It
does not any more, and the history is worth keeping because it is how the
decision was taken.

Task 2.2.5 weighed a hash table and declined it. Task 2.2.6 then produced the
consequence rather than arguing it: an index was appended to
`0002_securities.sql` _after_ it had been applied, and —

- `pnpm migrate` reported **`Already up to date — no migrations to apply.`**, exit
  **0**, and the index was absent from the database.
- `pnpm test:database` reported **23 passed**, exit **0** — because it migrates a
  database of its own **from empty** every run, so it proves _these files produce
  this schema_ and structurally cannot prove _that database matches these files_.

Two green instruments, side by side, over a database that is wrong. The recovery
was the big hammer, and it worked:

```
pnpm db down -v && pnpm db && pnpm migrate
```

**Task 2.2.7 is where that stopped being an available answer**, which is exactly
the reversal trigger 2.2.5 named: there is now a managed server with a
`CanNotDelete` lock on it, and you cannot drop it. So the hash table was built.

**How it works.** `migration_checksum` holds `(name, checksum, recorded_at)` — a
SHA-256 of the file's bytes. The row is written by the provider **inside the same
transaction as the migration**, beside Kysely's own `kysely_migration` row, so
the change, the record that it happened and the record of what it said all commit
together or none of them do. Before anything is applied, every migration the
database says it has run is hashed again and compared. A mismatch prints both
hashes and exits **1**, having applied nothing:

```
1 applied migration has been edited since it was applied.
Nothing was migrated. The database does not contain what these files now say.

  ✗ 0002_securities
      applied: 8a944594c3fdf6e5cd0b9cbb88a45a19e28c85a815a1c27df7ff7faf903b540a
      on disk: 05d9127235835eb78e78edf09a63fbfd022f434a5dc0ad5e657697eb51e961a3
```

**Three things about it that are not obvious.**

**It adopts rather than fails on a database that predates it.** Every database
migrated before Task 2.2.7 has `kysely_migration` rows and no checksum rows, so
refusing on a missing row would refuse every existing database on the first run.
Instead the current contents are recorded and the line says so — `○ 0001_baseline
— checksum adopted`. That means a file edited _before_ this existed is silently
blessed, exactly once. There is no version of this that does not have that hole;
what there is, is saying so.

**It says nothing about a migration that has not run.** A file that has never
been applied can be edited freely — that is what a pull request is for. The rule
this enforces is the narrow one: never edit a migration that has been applied.

**There is no command that repairs a divergence, and the recovery differs by
environment.** Locally, reset: `pnpm db down -v && pnpm db && pnpm migrate`. On
the deployed server there is no reset, so the answer is a **new forward
migration** carrying whatever the edit was going to say — and then either revert
the edit or leave it, since once the two disagree the file is no longer a record
of what ran. The checksum will keep refusing until they agree again, which is the
mechanism doing its job rather than being in the way.

**What it still does not catch** is a database changed by something other than a
migration — a hand-written `alter table` against the deployed server. Nothing
here hashes the schema itself, only the files that were run.

### Migrations must be additive across a deploy — expand, then contract

This is a rule about **writing** migrations that exists because of where they now
run. `deploy.yml` migrates the database **before** it rolls either half of the
code, so between those two moments the schema is ahead of every running replica —
and if the deploy then fails, it stays ahead until the next one.

That is survivable while a migration only **adds**: a new table, a new nullable
column, a new index. The old revision keeps serving because nothing it does reads
what was just added. It stops being survivable the moment a migration removes or
narrows something the deployed code still reads — a dropped column, a tightened
`not null`, a renamed table — because there is a window, and possibly a long one,
in which the running code is wrong.

**So a destructive change is two deploys, not one.**

1. **Expand.** Add the new shape. Ship code that writes both and reads the new
   one. Merge.
2. **Contract.** Once no running replica reads the old shape, a second migration
   removes it. Merge.

There is no mechanism enforcing this and there cannot be one — whether a column
is still read is a fact about code, not about the schema. It is here because this
is where somebody writing the destructive migration is looking.

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
| Applying twice changes the schema not at all                     | `pnpm test:database` — the _schema_ is compared, not just the runner's own report                               |
| Every timestamp is `timestamptz`, never a naive `timestamp`      | `pnpm test:database`, over every column outside Kysely's bookkeeping                                            |
| No `double precision` or `real` column exists                    | `pnpm test:database`                                                                                            |
| No `created_at`, `deleted_at`, `is_deleted` or `archived_at`     | `pnpm test:database`                                                                                            |
| Every table has an identity `bigint` `id`                        | `pnpm test:database`, on `is_identity` and never on `column_default`                                            |
| `schema.ts` and the real schema agree, column for column         | `pnpm test:database`, in **both** directions — and the compiler covers a third                                  |
| A closed set's union and its `check` constraint agree            | `pnpm test:database`, parsing the constraint Postgres **rewrote**                                               |
| An applied migration's file has not been edited since            | the runner's checksum pass, in **every** environment — the only one of these that holds where no test runs      |

**The three-hop arrangement behind the last two rows is worth understanding
before adding a table**, because it is what makes a hand-written type safe
without generating anything. `EXPECTED_SECURITIES` in
`apps/backend/src/migrate.database.test.ts` is declared
`satisfies Record<keyof SecuritiesTable, ExpectedColumn>`, so a column added to
the interface and not described there is a **compile** error — `TS1360`, the
same code the API's response-schema guard produces. The suite then compares that
description against `information_schema` in both directions. Interface → spec by
the compiler, spec → database by the test, therefore interface → database.

Two mechanical facts anyone extending those checks needs, both produced rather
than read. **Postgres rewrites a check constraint**: `check (kind in ('equity',
'etf'))` reads back as `CHECK ((kind = ANY (ARRAY['equity'::text,
'etf'::text])))`, so nothing can string-match what the migration says. And
**PostgreSQL 18 materialises `NOT NULL` as `pg_constraint` rows** where older
majors do not — confirmed to be the engine rather than anything here, since
Kysely's own tables have them too — so a check that counts those rows is
asserting the Postgres major version rather than the schema. Read nullability
from `information_schema.columns.is_nullable`, which is stable across majors.

### Prose

Everything in sections 1 to 7 above **except the rows Task 2.2.5 moved into the
checked list**. Of the five conventions this document originally handed forward,
four are now checked and **one is not, for a reason worth stating rather than
hiding**: "every price column is `numeric(18, 6)`" is **untested, because the
schema has no money column**. `securities` holds none, so a check would pass by
having nothing to look at — a green result that certifies nothing, and
indistinguishable from one that certifies something.

What stands in for it is a **tripwire**: the suite asserts there are **no**
`numeric` columns at all, so it fails the moment one arrives — `market_bars` in
Story 2.7 — with a message telling whoever added it to replace the tripwire with
the real check and update these two lists. A rule that cannot yet be enforced is
recorded as failing-open rather than as quietly passing.

**And the foreign-key naming rule is STILL UNTESTED after the story most likely to
have exercised it.** Task 2.2.4 recorded `<referenced_table_singularised>_id` as
untested because `securities` has no foreign key, and Story 2.3 looked like the
story that would add one. It did not, and both candidates were closed
deliberately rather than by accident: the sector-to-ETF mapping went to
`packages/shared` as a `Record` total over the taxonomy rather than becoming a
`sectors` table, and a separate `security_field_provenance` table was rejected in
favour of columns on the row. So `market_bars.security_id` in Story 2.7 inherits
it. Recorded rather than left silent, because a convention that quietly survives
the story that should have tested it is exactly this repository's third class of
gap.

The rest are **not** reachable and are prose permanently: plural table names,
snake case, the `security_id` foreign key spelling, `text` over `varchar(n)`, and
— the two that matter most — that `observed_at` means _when it happened in the
market_ and `recorded_at` means _when we wrote it_. A database can confirm both
columns are `timestamptz`; nothing can confirm a writer put the right value in the
right one. That is what review is for, and it is why this document exists.

**One convention that used to be in this list has moved into the checked one, and
it is the only migration of a rule between these two lists so far: never edit a
migration that has been applied.** Task 2.2.5 declined a stored hash, Task 2.2.6
produced the consequence — two green instruments over a database missing an index
— and Task 2.2.7 built the hash table, because the recovery those two rested on
(drop it and re-migrate) stopped existing the moment there was a deployed server
with a `CanNotDelete` lock on it. The check is in the runner rather than in the
database suite, which is why it holds in every environment including the one
where no test runs. See
[§8](#editing-a-migration-that-has-been-applied--caught-since-task-227).

**And one convention is prose that no instrument can ever hold: a destructive
migration must be split across two deploys, expand then contract.** Whether a
column is still read is a fact about code rather than about the schema, so
nothing can check it. See §8.

**A regex over the SQL text was considered and declined.** It could catch
`timestamp` and `double precision` before the file ran, which is earlier and
therefore tempting — and it cannot tell a statement from a comment or a string
literal, so it would false-positive on this very directory's header comments, and
the workaround for a false positive is to phrase the comment differently, which is
the worst possible thing to teach. The database can tell them apart. Ask it there.
