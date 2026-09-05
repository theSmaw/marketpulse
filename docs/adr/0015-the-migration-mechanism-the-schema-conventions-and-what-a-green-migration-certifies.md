# ADR 0015 — The migration mechanism, the schema conventions, and what a green migration certifies

**Status:** Accepted
**Date:** 2026-09-05
**Delivered by:** Epic 2, Story 2.2 (Tasks 2.2.1–2.2.8)

## Context

> **On the numbering.** ADR 0014 is Story 2.1's and is reserved for Task 2.1.8, which
> has not run yet — Story 2.2 was delivered first. ADRs are numbered in the order they
> are written and never renumbered, so the gap is temporary and deliberate rather than a
> missing file. References to "Story 2.1" below are to the work, not to that document.

**Story 2.1** provisioned a managed PostgreSQL server, connected the deployed backend
to it as its own managed identity, and stopped there deliberately: it shipped a
pool, one `SELECT 1`, and a close. `apps/backend/src/database.ts` says so in its
own header — "it is not a query layer, a repository, an ORM or a typed access
seam" — and names this story as the owner of all of it.

Epic 1 had recorded the gap more bluntly: **schema migrations have no owner
anywhere in the roadmap.** Epic 12 carries investigation persistence, but a
mechanism for describing a database and getting that description into a running
one is needed the moment this epic writes its first row, which is two stories
away.

This is one of the two or three most consequential decisions in the epic, because
every table in `PRODUCT_SPEC.md` §30 — `securities`, `market_bars`, `anomalies`,
`relationships`, `filings`, `investigations`, `investigation_steps`, `findings`,
`evidence`, `workspace_events` — arrives through whatever is chosen here, across
thirteen more epics. It is also the cheapest moment it will ever be taken: there
is no data, so a mistake in the first migration costs a `DROP` rather than a
backfill, and there is one deployed database rather than several.

Four properties of the tree shaped almost every decision below.

**`pnpm verify` runs with nothing listening.** Ten clean-clone runs have measured
it and Story 1.10 built the pipeline on it. That is why `pnpm ready` is not a
`verify` step, and it is what disqualifies every candidate whose type generation
introspects a live database.

**`packages/shared` is consumed as built output**, so anything put there is a
compile-time dependency of both halves and arrives in the frontend's type graph.

**A `.sql` file is read by nothing in this repository.** Re-measured at this
story's close rather than cited: `prettier --file-info` reports
`{"inferredParser": null}` and `eslint` reports `File ignored because no matching
configuration was supplied` — the same signature `apps/backend/scripts/dev.sh`,
the `Dockerfile` and `.dockerignore` carry. That puts a hard floor under how much
of a convention can ever be enforced by the chain.

**The deployed server has a `CanNotDelete` lock and no admin password.** Story 2.1
chose Microsoft Entra authentication with password auth disabled and no admin
user, and locked the resource — not for the data, which is all re-derivable from
Alpaca, but for the backups and the `pgaadauth_create_principal` bootstrap that
exists in no file here. So "drop it and re-migrate" is an answer that works on a
laptop and does not work in production, and that asymmetry decides more below
than anything about SQL.

## Decisions

### 1. The migrator is Kysely's `Migrator`, driving plain SQL files through a provider we own

Five candidates were installed from a fresh install, measured, and reverted
(Task 2.2.1; the full record is
[`DATA-LAYER.md`](../../planning/epic-02-security-universe-historical-data/story-02-database-schema-and-migrations/DATA-LAYER.md)).
Against a re-taken baseline of 418 store entries / 291,912 KB / 4,757 lockfile
lines:

| Candidate                     | Store entries | `node_modules` | Lockfile lines | Install |
| ----------------------------- | ------------- | -------------- | -------------- | ------- |
| **`kysely`**                  | **+1**        | **+3,444 KB**  | **+9**         | exit 0  |
| `node-pg-migrate`             | +28           | +22,576 KB     | +124           | exit 0  |
| `drizzle-orm` + `drizzle-kit` | +18           | +52,500 KB     | +670           | exit 0  |
| `prisma` + `@prisma/client`   | +129          | +308,588 KB    | +992           | exit 1  |

`kysely` declares **no dependencies at all**. Three findings the numbers alone do
not carry, each of which mattered more than the size:

**`node-pg-migrate` reproduces Story 1.13's Cypress shape through a different
package.** Thirteen of its 28 entries are second copies of this workspace's own
toolchain — two ESLints, two Vites, two Vitests — re-keyed by `jiti`, which is a
hard dependency and arrives even if every migration is a `.sql` file.

**Drizzle Kit brings two more esbuild majors whose postinstalls RAN and
`allowBuilds` did not fire**, because the allowlist names a **package** and not a
version. That corrected a claim this repository had carried since Story 1.4: the
install-script sweep returning one line is a property of what is installed, not a
property of the policy. The sweep is re-run rather than assumed at every close
since, and returned exactly `esbuild@0.28.2` again here, on the clone's own store.

**Prisma reproduced Cypress's documented failure mode exactly** —
`[ERR_PNPM_IGNORED_BUILDS]` at exit 1, with pnpm rewriting the tracked
`pnpm-workspace.yaml` with its invalid stub — while dragging in `mysql2`, a WASM
Postgres, a second Postgres driver, and `@prisma/studio-core` at 43.2 MB with
`@radix-ui/*`, `@visx/*` and eleven `d3-*` packages: a React GUI behind
`apps/backend`. Its measured size is an **under**-estimate, because the
postinstall that downloads its engines never ran.

**The partial-migration question separated none of them**, which is worth
recording because it is the question everyone asks first. Postgres has
transactional DDL and all three real candidates put the bookkeeping row inside the
same transaction, so a failed multi-statement migration rolls back whole in all
three. The decision therefore rested on cost, on the failure modes Kysely detects
**by name**, and on the query layer.

### 2. A hand-rolled runner is the `@fastify/cors` case, not the `react-error-boundary` case

This repository throws libraries away — two schema libraries in Story 1.6,
`react-error-boundary` in Task 1.7.6 — and keeps them when a hand-rolled version
fails in a way that looks like success, which is why `@fastify/cors` is here.

Both runners were written. The **correct** one is about thirty lines and needs an
advisory lock, a tracking table, deterministic ordering, a checksum, the change
and its bookkeeping row in one transaction, and a non-zero exit. The **plausible**
one differs from it by exactly one thing: it records the bookkeeping row outside
the transaction. It printed

```
applied 0002_partial.sql
```

at **exit 0** over a database whose tables did not exist — a permanent divergence,
a later run that is a no-op, and nothing anywhere reporting a problem. At +1 store
entry and zero dependencies, this is not close.

What Kysely detects by name, each produced: a migration **inserted out of order**
and a previously applied migration **deleted from the tree** both fail as
`corrupted migrations: …`; a re-run is `[]`; and a `kysely_migration_lock` table
plus an advisory lock handles two migrators at once (§9).

### 3. The query layer is Kysely too, on the architectural test rather than the ergonomic one

Invariant 4 says temporal isolation is enforced in the data layer, so that
"no query may read past the replay clock" is expressible in **one** place rather
than remembered at every call site. That is Epic 13's, and it is the only
requirement here that a query layer can be wrong about in a way nothing recovers
from.

The seam was written for two candidates against a real table with a row on each
side of the clock. **`pg` with hand-written SQL** gives a module that owns the pool
and never exports it — and the leak is one `pool.query` away, produced:
`around the seam: 100,200 <-- LEAKED`. **Kysely** exposes the query AST to a
plugin, so a call site asking for **no time filter at all** compiles to
`select "close" from "market_bars" where "symbol" = $1 and "observed_at" <= $2`
while a non-temporal query is untouched. The hole is raw `` sql`…` ``, which
reaches the plugin as an opaque `RawNode` it cannot rewrite — but it **does** reach
it, so it can be refused, produced:
`refused: raw SQL is not permitted under temporal isolation`. Rewrite what it can,
refuse what it cannot.

**Drizzle has no equivalent hook.** PostgreSQL row-level security is recorded as
the fallback nobody chose: genuinely structural, database-side, and the only
mechanism that would survive the query layer being replaced. Epic 13 should read
that paragraph in `DATA-LAYER.md` before assuming the plugin is the only option.

**The seam is declared here and not built**, and saying so plainly is the point.
This story ships no route and no read, so the plugin was written in a spike and
reverted; the tree is byte-identical. **Story 2.8 writes the first `selectFrom` and
owns the module.** The instruction it inherits is the mechanism: the plugin is
attached with `withPlugin`, which returns a **different object**, so the seam holds
only while the module that constructs Kysely exports the plugged handle and no
other. Nothing enforces that — see §16.

The cost of Kysely as the query layer is that its `Database` interface is
hand-written. That is §7 and §8.

### 4. Migrations are `.sql` files, and the reason is what gets reviewed

A `.sql` file is reviewable as **the thing that will run**. A TypeScript migration
compiles into `dist/`, so the artefact reviewed is not the artefact executed —
which is the shape this repository already refused when it declined the platform's
generated deploy workflow for building the site on the deploy side.

The assumption that design rests on was verified rather than assumed: a
multi-statement body executes through `sql.raw()` inside the migrator's
transaction.

The price is §"Context"'s hard floor — nothing lints, formats or typechecks the
SQL — and it is paid knowingly. **A SQL formatter or linter is declined**, on the
one-file argument that declined `shellcheck`, `actionlint` and `hadolint`; the
reversal trigger is a migration whose failure was not loud. What is deliberately
inside the net is the mechanism around it: `apps/backend/src/migrate.ts` is
TypeScript in `src/` — so it is typechecked, linted and unit-tested — behind a
thin `scripts/run-migrations.mjs` wrapper that owns only the name and the exit
code.

### 5. Four-digit sequence, not a timestamp — chosen on which failure is loud

`NNNN_lower_snake_case.sql`. Two branches each adding `0002_*` is a **merge
conflict** a human resolves in the pull request where both changes are visible.
Two timestamps **merge cleanly** and then apply in an order neither author tested,
on every database, silently.

Timestamps are the more common convention _precisely because_ they never conflict,
and that is the property being rejected. `allowUnorderedMigrations` stays at its
default `false` as the backstop at the database; a filename that does not match is
an **error** rather than a skipped file, and so is an empty directory, because a
silently skipped migration is the failure the whole mechanism exists to prevent.

### 6. The home is `apps/backend/migrations/`, and it is forced rather than preferred

A bare top-level directory fails the two ways Task 1.13.1 measured: `TS1295`,
because the nearest `package.json` is the root's, which deliberately has no
`"type": "module"`; and `MODULE_NOT_FOUND` on the workspace package, because pnpm
links a workspace dependency only into the package that declares it. A fifth
workspace package would have exactly one consumer and would join every `pnpm -r`
fan-out. `apps/backend` is the only thing here that connects to a database at all.

One consequence decided §10: `apps/backend/package.json`'s `files` field is
`["dist", "!dist/**/*.test.*"]`, so `pnpm deploy` and therefore the container image
carry `dist/migrate.js` and **not** `apps/backend/migrations/`. **The image ships a
description of the schema and nothing that can create it.**

### 7. Forward-only. There is no `down`, and `pnpm migrate` refuses arguments

A `down` that has never been executed is a claim rather than a mechanism, and the
one that matters — reversing a migration that dropped a column with data in it —
cannot be written at all. Kysely makes `down` optional, checked rather than
assumed.

`scripts/run-migrations.mjs` therefore **refuses** arguments rather than forwarding
them, which is the opposite of `pnpm db`'s decision and for a stated reason:
silently running `migrateToLatest` for `pnpm migrate down` and reporting success is
the worst of the three options available.

**The reversal trigger is not "a migration we regret"** — that is always a new
forward migration. It is a **deployment** that must roll schema and code back
together, which §10 answers with a convention rather than a mechanism.

### 8. Nothing is generated, the schema is the source of truth, and the two hand-written types live in different places

`kysely-codegen`, `drizzle-kit pull/push` and `prisma migrate dev` all introspect a
**live** database, which loses acceptance criterion 7 outright. Checked before any
candidate was liked, rather than discovered afterwards.

There are two hand-written types and they are **not the same type**.
`apps/backend/src/schema.ts` holds Kysely's `Database` interface, which describes
**rows**; `packages/shared/src/security.ts` will hold Story 2.3's `Security`, which
is domain vocabulary. A row has a `sector_id` where a domain object has a sector.
The row type stays in `apps/backend` for three reasons: only the backend touches a
database, it would put Kysely's `Generated`/`ColumnType` helpers into the frontend's
type graph, and `packages/shared` is consumed as built output.

**What maps between them lives beside the query, one function per domain type, and
never a generic mapper** — because the mapping is exactly where a nullable column
becomes an explicit domain answer, and a generic mapper is where that decision gets
skipped. Story 2.8 owns it.

Two places where the types and the SQL agree by construction: `id` is
`GeneratedAlways<string>`, so an insert supplying one is a **compile** error as well
as the runtime `cannot insert a non-DEFAULT value into column "id"`; and
`recorded_at` is written long-hand as `ColumnType<Date, Date | undefined, never>`,
whose update `never` is the type system saying the one thing about that column SQL
cannot.

**`migrate.ts` stays on `Kysely<unknown>`**, decided rather than defaulted. The
interface describes the schema **after** every migration, so a migrator typed with
it asserts a shape that is false for the entire duration of what it is doing; it
would buy nothing, since bodies go through `sql.raw()`; and it would make the runner
depend at compile time on the description of its own output, so a migration that
dropped a table would break the compilation of the runner that applies it.

### 9. The conventions live in `apps/backend/migrations/README.md`, and they were measured rather than recalled

Their home is `e2e/README.md`'s argument applied a second time: a task file is not
where the next person writing a migration looks, and that directory is where they
already are. `README.md` and `CLAUDE.md` **point** at it rather than copying it —
the treatment that exists because Epic 1 ended with twelve near-identical blocks and
a task spent reconciling them.

Every rule in it was produced against PostgreSQL 18.6 through `pg` 8.23.0. The ones
that would otherwise be re-litigated:

**A closed set is `text` + `check`, never a Postgres `enum`** — produced rather than
read. Inside one transaction, which is exactly what a migration is here, adding an
enum value is fine and adding one **and using it** is refused with
`unsafe use of new value "etf" of enum type`. So a migration that adds a member and
backfills rows to it in the same file **cannot be written at all**, and removing an
enum value has no operation at all.

**`timestamptz` always, and the correct type is free** — both are `pg_column_size` 8. The same eight bytes read under three timezones give one instant three ways for
`timestamptz` and the **same digits three times** for a naive column, which
therefore means nothing without knowing who wrote it. On 2026-11-01 New York holds
01:30 twice.

**A row has two timestamps and `created_at` is a banned name.** Invariant 5 makes
evidence carry an event timestamp and a retrieval timestamp, and one column cannot
do both jobs. `observed_at` is when it was true in the market and is the reserved
name Epic 13's plugin filters on; `recorded_at` is when we wrote the row.
**`observed_at` never has a default**, because `default now()` would quietly turn
"when we wrote it" into "when it happened" on the column the whole replay mechanism
keys on — the exact leak invariant 4 exists to prevent.

**`id bigint generated always as identity primary key`, with the natural key as a
`unique` constraint beside it.** Decided by `securities` against the natural key: a
symbol is not stable (`FB` → `META`), and a natural primary key propagates a ticker
change into every foreign key forever.

**Money is `numeric(18, 6)` and never a float, and the argument is invariant 1
rather than tidiness.** `0.1::float8 + 0.2::float8 = 0.3` is **false**, and worse,
float addition is **not associative**: `sum()` over `[1e16, 1.0, -1e16]` returns
**0** and over `[1e16, -1e16, 1.0]` returns **1**, where `numeric` returns `1.0` for
both. A percentage change can therefore disagree with itself between two renders
because a query plan changed the aggregation order. The rule is scoped to a
**per-share** value; a market capitalisation would overflow it. A volume is a count
and is `bigint`.

**`pg` hands JavaScript a `bigint` and a `numeric` as `string`** — deliberate, and
not to be "fixed" with a type parser, since a JS `number` is a double — and it hands
back a naive `timestamp` as a `Date` **silently reinterpreted in the reading
process's timezone**, an eight-hour error with nothing failing.

**Nothing is soft-deleted and there is no `deleted_at`.** A delisted security's bars
are still what happened, and Epic 13 replays a date on which it was in the universe,
so what changes is a **status** that is displayed rather than filtered away. The
deciding argument is that a soft-delete column is a second **invisible predicate**,
and one invisible predicate to enforce is a design where two is a bug waiting for
whichever one somebody forgets.

**Seed data is not a migration**, and the distinction is mechanical: a migration runs
once, is recorded, and — since §11 — an edited applied file is refused outright. So
data in one cannot be corrected without a second migration. Story 2.3 still chooses
for the universe, against its own criterion that "idempotent" has to mean "picks up
an edited list".

### 10. Migrations run as a step in `deploy.yml`, before either half of the code rolls

Three shapes were weighed and two rejected with their costs stated.

**A boot-time job** costs two things that compound. The image does not carry
`migrations/` (§6), so it needs `files` changed in the same commit. And it puts DDL
on a liveness-probed platform: the startup probe is 2 s period / 3 s timeout / 30
failures, so it kills a replica waiting on Kysely's advisory lock at roughly **90
seconds**, long before the lock's own **hour** — on an app whose `Single` revision
mode at `minReplicas: 1` makes an unready replica **no** service. A rolling revision
that briefly runs two replicas is exactly what produces the wait.

**A manual command** is a step somebody forgets.

The step invokes `pnpm migrate` **by name**, per acceptance criterion 1 and Story
1.10's rule that the pipeline must not define its own steps, and it has **its own
`timeout 120`** with a message naming the advisory lock and `pg_stat_activity`'s
`wait_event: advisory`. That is two orders of magnitude above the thing it times —
`pnpm migrate` measured at **1.181 s** on the runner — and thirty times inside the
thing it protects against. Task 1.11.7's lesson applied rather than repeated.

**The sentence that IS the decision** is what "the migration succeeded and the deploy
then failed" means: the database is left **ahead of the code**. That is survivable
**only while migrations are additive**, so a destructive change is **two deploys,
expand then contract** — now a written convention in `migrations/README.md` §8 and
**enforceable by nothing**, because whether a column is still read is a fact about
code rather than about a schema.

**A second decision fell out of it, and it was forced rather than chosen.** Story 2.1
measured that a service principal cannot mint a Postgres token for another
principal's role, so CI **could not** connect as `marketpulse-backend` even if that
were wanted. A second role, `marketpulse-github-deploy`, was created with
`pgaadauth_create_principal_with_oid` and granted `connect`, `usage, create on schema
public`, plus default privileges handing the runtime role the four DML verbs on
tables it creates. **Least privilege came free**, and it was read back: all four
tables owned by the migration role, `marketpulse-backend` holding
`SELECT`/`INSERT`/`UPDATE`/`DELETE` on `securities`, and
`has_schema_privilege(…, 'public', 'CREATE')` **false**.

**Whether a CI runner can reach the server is a measurement and the answer is yes.**
Runner egress was `172.174.110.129`, an Azure address that
`AllowAllAzureServicesAndResources` admits, so nothing writes a firewall rule from
CI. Connect in **142 ms** including TLS `verify-full` and the token — against the
deployed replica's ~1,023 ms first connection, the difference being the 866 ms
sidecar mint the runner does not pay.

### 11. The checksum is built, and it lives in the runner rather than in the database suite

Task 2.2.5 declined a stored hash and recorded why. Task 2.2.6 produced the
consequence: an index appended to an **applied** `0002_securities.sql` — the
realistic edit, since nothing in the database suite asserts on indexes — took
`pnpm migrate` to `Already up to date` at **exit 0** with `pg_indexes` holding zero
rows for it, and `pnpm test:database` to **exit 0** as well, because that suite
migrates a database of its own **from empty** every run. **Two green instruments over
a wrong database, side by side.** The only thing that caught it was a person.

Task 2.2.7 built it, because the recovery those two rested on — drop it and
re-migrate — stopped existing the moment there was a deployed server with a
`CanNotDelete` lock on it.

`migration_checksum (name, checksum, recorded_at)` holds a SHA-256 of each applied
file's bytes, written by the provider **inside the migrator's transaction** beside
Kysely's own row, and verified before every run. Three properties stated rather than
hidden:

- It **adopts** rather than fails on a database that predates it. Every existing
  database has `kysely_migration` rows and no checksum rows, so refusing would refuse
  them all. It prints `○ … checksum adopted` and **silently blesses one pre-existing
  edit per database, exactly once** — a bootstrap hole no version of this can avoid.
- It says **nothing** about a migration that has not run, deliberately: a file that
  has never been applied can be edited freely.
- **There is no command that repairs a divergence.** Locally, reset. Deployed, write
  a new forward migration — that server cannot be reset.

**It is in the runner and not in the database suite**, and that is the whole reason
it is worth having: the runner runs in **every** environment, including the deployed
one, where no test runs.

### 12. The sixth level of test: `pnpm test:database`, its own config, its own command

ADR 0009 built four levels and ADR 0013 added a fifth. A database-backed test breaks
all three of `pnpm test`'s stated properties at once — fast, no build, no socket — so
it gets the `test:process` treatment: `apps/backend/vitest.database.config.ts`, a
**third** config in that package, and a root `pnpm test:database`.

**What it does to the database you are working in is nothing.** It creates
`marketpulse_vitest`, migrates it, reads it and drops it — at the end of a run and
again at the start of the next, so a crashed run is self-healing. The three
alternatives each fail a property this repository already holds: a transaction per
test cannot work when the migrator opens one around the whole run, truncation would
destroy the universe Story 2.3 loads, and a schema-per-run needs `search_path` games
the unqualified migration SQL would silently follow.

**There is no `skipIf` and never will be.** With no database it fails in `beforeAll`
at exit 1 naming `pnpm db`. A skipped test reports green, which this repository has
recorded twice as the worst failure available.

**The strongest thing in it is a three-hop arrangement that makes a hand-written type
safe without generating anything.** `EXPECTED_SECURITIES` is declared
`satisfies Record<keyof SecuritiesTable, ExpectedColumn>`, so a column added to the
interface and not described there is **`TS1360`** — the same code the API's
response-schema guard produces — and the suite then compares that description against
`information_schema` **in both directions**. Interface → spec by the compiler, spec →
database by the test, therefore interface → database.

**Seven conventions moved out of prose into checks**, and a sixth deliberately did
not. `numeric(18, 6)` is **untested because the schema has no money column**: a check
would pass by having nothing to look at, which is Task 1.13.6's blind-renderer problem
in a new place. What stands in for it is a **tripwire** asserting there are **zero**
`numeric` columns, which fails the moment `market_bars` arrives with a message telling
whoever added it to replace it. A rule that cannot yet be enforced is recorded as
failing-open rather than as quietly passing.

**CI runs it as a third job and it gates a merge**, which makes it the **third
required check** on `main` (§17). The job invokes `pnpm test:database` by name and
defines no database step of its own, since the suite creates its own database.

### 13. Two mechanical facts anyone extending these checks needs

**Postgres rewrites a check constraint.** `check (kind in ('equity','etf'))` reads
back as `CHECK ((kind = ANY (ARRAY['equity'::text, 'etf'::text])))`, so the agreement
check between `SECURITY_KINDS` and `securities_kind_check` cannot be a string match on
what the migration says. It parses what Postgres stored.

**PostgreSQL 18 materialises `NOT NULL` as `pg_constraint` rows** (`contype = 'n'`),
which older majors do not — confirmed to be the engine rather than the migration,
because Kysely's own tables have them too. So counting those rows asserts the engine
major rather than the schema. Read nullability from `information_schema`, which is
stable across majors.

### 14. Two concurrent migrations cannot interleave, and the mechanism is an advisory lock

Established rather than assumed. Two `pnpm migrate` processes half a second apart
against one database put the second in `pg_stat_activity` as
`wait_event_type: Lock`, `wait_event: advisory`, waiting for the first and then
correctly reporting `Already up to date` at exit 0 — no interleaving, no double-apply.

Read out of Kysely 0.29.5's own `postgres-adapter.js`, it is
`pg_advisory_lock(3853314791062309107)`: a hard-coded id, **session-level**, with
`lock_timeout` at **one hour**. Three consequences:

- **It is per-database** (`pg_locks.database` is the database's own OID), which is what
  makes the scratch-database pattern genuinely isolated.
- **A failing first runner does not poison the second** — produced: run 1 failed after
  six seconds, run 2 took the lock, ran the same migration itself and also exited 1. Both
  report the failure and neither reports success.
- **Session-level means a hard crash releases it while a runner that _hangs_ holds it**,
  with the second waiting an hour before erroring rather than failing fast. That is why
  §10's step has a deadline of its own.

### 15. One correction worth carrying: the transaction is the RUN's, not one per migration

Read out of Kysely 0.29.5's own `migrator.js` and confirmed by two migrations recording
an identical `recorded_at` when `now()` is transaction start time. **A run of three
whose third fails rolls back all three** — stronger than the per-migration claim this
repository made in three places before Task 2.2.7 corrected it, and the reason a
transaction-per-test suite is structurally impossible (§12).

A related exception, confirmed on a migration rather than a bare insert: **a rolled-back
migration consumes identity values.** Against a `securities` holding ids 1–3, a migration
inserted two rows and failed; the rollback left 3 rows at max id 3, and the next insert
got id **6**. `migrate.ts`'s message still says "it left nothing behind", deliberately —
that line is read by somebody deciding whether to go and look at the database, and for
that question it is correct, since a gap in a surrogate key is not something anyone can
act on and ids here are explicitly not contiguous.

## Rejected, with reasons and reversal triggers

| Rejected                                                    | Why                                                                                                                                                              | Reversal trigger                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A hand-rolled migration runner                              | The plausible version reports success over a database it did not change. +1 entry with zero dependencies is not a price worth arguing                            | none foreseen                                                                                   |
| `node-pg-migrate`, Drizzle, Prisma                          | §1. Cost, a second toolchain, and no query-layer answer for invariant 4                                                                                          | Kysely's migrator losing a failure mode it detects by name                                      |
| Generated types (`kysely-codegen`, `drizzle-kit`, `prisma`) | Every one introspects a **live** database, losing acceptance criterion 7                                                                                         | a generator that reads the SQL files rather than a server                                       |
| A Postgres `enum` for a closed set                          | A migration cannot add a value and use it in one transaction; removing one has no operation at all                                                               | none — this is a property of the engine                                                         |
| Timestamp-prefixed migration filenames                      | They never conflict, which is the property being rejected — they interleave silently instead                                                                     | more than one person merging migrations per day, at which point the conflict is a cost          |
| `down` migrations                                           | A `down` never executed is a claim; the one that matters cannot be written                                                                                       | a deploy that must roll schema and code back **together**                                       |
| A boot-time migration job                                   | The image carries no `migrations/`, and the startup probe kills a replica at ~90 s against a one-hour lock                                                       | a platform with a pre-start hook and no liveness coupling                                       |
| A manual migration command                                  | A step somebody forgets                                                                                                                                          | none                                                                                            |
| A second bookkeeping mechanism (2.2.5)                      | Declined once as a bootstrap-ordering problem guarding a developer-only failure — then **built** in 2.2.7 when the deployed server made the recovery unavailable | n/a, superseded                                                                                 |
| A regex over the SQL text                                   | It cannot tell a statement from a comment, so it false-positives on this directory's own headers — and the workaround is to reword the comment                   | none                                                                                            |
| `hadolint`-style SQL linting or formatting                  | One file class, against a new root dependency and an eighth `verify` step                                                                                        | a migration whose failure was **not** loud                                                      |
| Naming the migration error's failing **statement**          | Only a syntax error carries a `position`; every execution error carries none. The version worth having needs the provider to pass the body along                 | a migration long enough for `at or near "x"` to be ambiguous                                    |
| A `CREATE INDEX CONCURRENTLY` escape hatch                  | It fails under a transaction and Kysely's `disableTransactions` is per-**`Migrator`**, not per-migration                                                         | **Story 2.7's `market_bars` indexes** — answer is a second `Migrator` over a separate directory |
| A post-deploy browser assertion for the schema              | A schema is not a user-visible surface, no route reads it, and a post-deploy check's output is a rollback decision                                               | **Story 2.8's first route that serves data**                                                    |
| A deployed-engine-version check in `pnpm verify`            | It needs Azure credentials `verify` deliberately does not have, so building one forks the definition of "verified"                                               | a second environment, or the version being found changed with nobody able to say why            |

## Consequences worth stating separately

### What a green `pnpm migrate` certifies

- Every migration file **named on disk** is recorded as applied in `kysely_migration`,
  in filename order, with no gaps and none reordered or deleted.
- **Every applied migration's file is byte-identical to what ran** — since Task 2.2.7,
  in every environment including the deployed one, because the check is in the runner
  and not in a test.
- Whatever the run applied, it applied **whole**: one transaction around the entire run,
  so a run of three whose third fails leaves the database exactly as it was and
  `kysely_migration` holding only what preceded it.
- It exited non-zero if anything failed. `migrateToLatest()` **resolves** rather than
  throwing, so this is a property of `summariseMigration` and `run-migrations.mjs` rather
  than of the library — three of that function's tests were seen to fail, including the
  one for the class where Kysely fails before working out what to run and `results` is
  `undefined`.
- **No second runner interleaved with it** (§14).
- It printed what it was about to apply. `Pending: …` costs nothing, because
  `getMigrations()` had to be called for the checksum pass anyway, and a deploy step that
  cannot say what it is about to apply is a step nobody can review afterwards.

### What a green `pnpm migrate` does **not** certify

- **That the database matches the migration files.** This is the sharpest sentence in
  the story and the checksum narrowed it rather than closing it. Three gaps survive:
  - A schema changed by something **other than a migration** — a hand-written
    `alter table` against the deployed server — is hashed by nothing and recorded nowhere.
  - A file edited **before** `migration_checksum` existed is **adopted** on the first run
    rather than refused, blessing exactly one pre-existing divergence per database.
  - A migration that has **not** run is deliberately unhashed.
- **That the code deployed beside it reads that schema.** §10's ordering means a deploy
  that fails afterwards leaves the schema ahead of the code. Expand-then-contract is a
  convention, not a mechanism.
- **That the schema is right.** A migration that creates the wrong column is a green
  migration.
- **Anything about data.** `securities` holds zero rows locally and deployed. Seeding is
  Story 2.3's.
- **That a hung runner will fail fast.** The advisory lock's timeout is an hour; only
  §10's own `timeout 120` bounds it, and only in CI.

### What a green `pnpm test:database` certifies

- **These files produce this schema**, from empty, every run — column names, types,
  nullability and defaults through `information_schema`.
- `schema.ts` and the real schema agree column for column, in both directions (§12).
- `SECURITY_KINDS` and `securities_kind_check` agree, parsed from what Postgres rewrote.
- Applying twice changes the **schema** not at all — asserted on the schema rather than on
  the runner's own report.
- No naive `timestamp`, no `double precision`, no banned column name, and an identity
  `bigint` `id` on every table.
- The renderer of last resort: **zero `numeric` columns**, a tripwire that fails when the
  first money column arrives.

### What a green `pnpm test:database` does **not** certify

- **That any particular database matches these files.** It migrates one of its own from
  empty, which is a different claim, and the gap between them is exactly what Task 2.2.6
  produced.
- That a writer put the right value in `observed_at` rather than `recorded_at`. A database
  can confirm both are `timestamptz`; nothing can confirm the semantics.
- Anything about the deployed server, which it never connects to.
- Anything about `migration_checksum`, which the runner creates rather than a migration —
  so it is the one table here that no migration describes, and the conventions checks
  deliberately exclude it along with Kysely's own two.

### Invariants nothing checks

Five, with their durable copy named. The line between these and the checked list is the
one ADR 0013 drew and `migrations/README.md` repeats: **whether the thing being checked is
reachable from an assembled instance.** A repository ruleset, a role's grants, a glob
comment and a third copy of a version number are not.

1. **The deployed engine version is compared against nothing.** There are **three** pins —
   `LOCAL_DATABASE_VERSION` in `scripts/local-database.mjs`, the `postgres:18` service
   image in `verify.yml`, and the managed server's `--version` — and **exactly one pair is
   checked**: Task 2.2.5 made the `database` job read `LOCAL_DATABASE_VERSION` and compare
   it against what the service reports, so a bump on one side is a red job naming both
   numbers. The deployed pin stays uncompared, for the reason in the rejection table. Taken
   by hand at both ends on 2026-09-05: local **PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)**,
   managed **PostgreSQL 18.6 on x86_64-pc-linux-gnu**. Record the number, not the fact that
   it matched.
2. **The migration identity's grants live only in the platform.** Five connection values in
   `deploy.yml` have to agree with a role and a set of grants created by hand-run SQL that
   exists in `HOSTING.md` and nowhere else, and nothing compares them. This is the
   `VITE_API_BASE_URL` / `CORS_ORIGIN` shape arriving a third time — and it is worse in one
   respect, because a role is not a setting that can be re-read and diffed: it is a one-off
   statement that must be re-run by hand if the server is ever re-created.
3. **The three Vitest globs partitioning fast tests from process tests from database tests
   are a naming convention with nothing behind it.** A database test named `foo.test.ts`
   lands in the suite developers run all day; a `foo.database.test.ts` in another package
   runs **nowhere at all**. This is the second instance of the class Task 1.13.2 named, and
   it is **weaker** than that one: there the mitigation is a missing `test` script, and here
   it is only a comment, in a package that has one.
4. **The temporal seam holds only while no unplugged handle is exported.** The plugin is
   attached with `withPlugin`, which returns a different object, so the guarantee is a
   property of what a module chooses to export. Nothing enforces it. Story 2.8 inherits it,
   and it is the same class as `e2e/package.json`'s missing `test` script.
5. **Expand-then-contract.** Whether a column is still read is a fact about code rather
   than about a schema, so no instrument here can hold it. `migrations/README.md` §8.

### A rollback of code past a migration has no schema counterpart

This follows from forward-only and is worth its own line, because it is the cost of §7 and
the thing somebody will discover during an incident. Reverting the code is a revert commit;
there is nothing to revert the schema with. What makes it survivable is the additive rule
and nothing else.

### Two things a clean clone still cannot reach

Recorded because the close measured them rather than assuming them.

**A database that already has migrations in it** is what every environment after this story
is permanently in, and a clone reaches it only because `compose.yaml` declares
`name: marketpulse` — a **fixed** Compose project name, so a second checkout attaches to the
same container and volume rather than starting its own. That is the right default (one
Postgres per machine, not one per checkout) and it means **a fresh clone does not get a
fresh database**: `pnpm migrate` in a brand-new clone reported `Already up to date`,
correctly. `pnpm db down -v` is what actually empties it, and the story's close did exactly
that to take the from-nothing measurement below.

**A database migrated before the checksum existed** is the only place `○ … checksum adopted`
appears, and a clone reaches it by migrating, dropping `migration_checksum`, and migrating
again. Both were reached that way.

## Measured

### Acceptance criteria, re-run at close (2026-09-05)

| #   | Criterion                                                            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Mechanism exists, documented, invoked **by name** from a root script | `pnpm migrate` → `scripts/run-migrations.mjs` → `apps/backend/src/migrate.ts`. `deploy.yml`'s step runs `pnpm migrate` and defines nothing of its own. `migrations/README.md` is the document                                                                                                                                                                                                                                                                                                                                                                              |
| 2   | Empty database → expected schema; twice is a no-op                   | From a clean clone with a genuinely empty volume: `Pending: 0001_baseline, 0002_securities` → both applied, **exit 0 in 0.64 s**; the next two runs `Already up to date` at exit 0. The schema itself is asserted by `pnpm test:database`, which re-migrates from empty every run                                                                                                                                                                                                                                                                                          |
| 3   | **The deployed database is migrated, observed rather than assumed**  | Connected to `psql-marketpulse-dev` in **1,160 ms** as the Entra administrator over TLS `verify-full`. `public` holds `kysely_migration`, `kysely_migration_lock`, `migration_checksum`, `securities`; both migrations recorded; `securities` matches local column for column with `id` `bigint`/`is_identity: YES`/`ALWAYS`/`column_default: null`, the rewritten `CHECK ((kind = ANY (ARRAY['equity'::text, 'etf'::text])))`, and PostgreSQL 18's eight `NOT NULL` rows; **0 rows**. The two recorded checksums are byte-identical to `shasum -a 256` of the local files |
| 4   | A broken migration fails loudly; what it leaves behind is recorded   | Eight failure classes produced against a scratch database (Task 2.2.6), all exit 1, `kysely_migration` untouched after every one; the table, both message branches, four SQLSTATE values and the identity-sequence exception are in `migrations/README.md` §8. Re-produced at close: an index appended to an applied file exits **1** naming the file and printing both hashes, and the index is absent afterwards                                                                                                                                                         |
| 5   | Database tests: own command, non-zero on failure, not in `pnpm test` | `pnpm test:database` = **25 tests in 435 ms**; with no database it is **exit 1** (`beforeAll` naming `pnpm db`), 25 skipped, `Test Files 1 failed`; `pnpm test` is **"Scope: 4 of 5 workspace projects"** and **246 tests** with the database stopped                                                                                                                                                                                                                                                                                                                      |
| 6   | Conventions written where the next person will look                  | `apps/backend/migrations/README.md`, nine sections plus a checked-versus-prose split. Both lists re-read against what 2.2.5 and 2.2.7 actually built; three rows in §6 and §7 were **stale and were corrected** — see below                                                                                                                                                                                                                                                                                                                                                |
| 7   | `pnpm verify` passes with no database                                | **exit 0 in 26.03 s** with the container stopped, and **exit 0 in 31.10 s** cold from a clean clone that had never had one                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### The clean clone — the eleventh such run, and the first with a database in the story

Cloned at `3ceaf25`, fresh pnpm store, fresh Corepack home.

| Measurement           | Value                                                                                                                                               |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cold install          | **`Packages: +417`**, `reused 0, downloaded 417`, exit 0 in **2.91 s** (274 MB store)                                                               |
| Store entries         | **419** — the same as the working tree, which is the check                                                                                          |
| `node_modules`        | **285,008 KB** in the clone against 295,348 KB in the working tree                                                                                  |
| `pnpm-lock.yaml`      | **4,766 lines**                                                                                                                                     |
| `pnpm-workspace.yaml` | unchanged; `git status --porcelain` empty after install                                                                                             |
| Install-script sweep  | **one line** — `esbuild@0.28.2 postinstall$ node install.js`                                                                                        |
| `pnpm verify`         | **exit 0 in 31.10 s** cold, **25.75 s** warm                                                                                                        |
| Frontend artefact     | 348,135 B `b98aeaa5…`, 12,128 B `134d5dd8…`, `index.html` 1,101 B `07983678…`, 300 B — **361,664 B over four files**, byte-identical to Task 1.13.4 |
| Storybook             | 63 files, 9.3 MB                                                                                                                                    |

**`Packages: +417` supersedes Task 1.13.6's 402-on-macOS**: Story 2.1 added `pg` and
`@types/pg` (+14) and Story 2.2 added `kysely` (+1). The **10.3 MB `node_modules`
difference at an identical entry count** is pnpm never pruning its virtual store — Task
1.13.1's finding, visible again.

### Timings

`pnpm verify` warm on the working tree, **25.80 s with a database and 26.03 s without** —
the difference is inside run-to-run variance, which is the point: nothing in the chain
touches one. Per step, warm: build **2.45 s**, lint **4.95 s**, `format:check` **5.48 s**,
`stories` **0.27 s**, `env:check` **0.27 s**, `test` **3.60 s**, `test:process` **8.56 s**.

| Command                                  | Count                    | Duration                            |
| ---------------------------------------- | ------------------------ | ----------------------------------- |
| `pnpm test`                              | **246** (37 + 106 + 103) | 3.60 s                              |
| `pnpm test:process`                      | **14**                   | 7.9–8.6 s                           |
| `pnpm test:database`                     | **25**                   | 435 ms                              |
| `pnpm migrate` (two files, from nothing) | 2 applied                | 0.64 s local, 1.181 s on the runner |

### The flake carried forward from Task 2.2.2 did not recur

`index.process.test.ts`'s drain-ordering test failed once with
`expected 4 to be greater than 7` — an ordering the process cannot produce — and did not
reproduce in five further runs or under eight CPU-saturating background processes. It was
left open with the numbers written down and the suspicion named (`launch()` concatenating
`stdout` and `stderr` into one buffer). **This story's close ran `pnpm test:process`
fourteen more times** — eight directly and six inside `pnpm verify`, across two machines'
worth of tree states including a cold clean clone — and it was **14 passed** every time.
Carried forward with a count rather than closed or dropped: 1 failure in ~40 executions
across three tasks, still undiagnosed.

### Claims this story falsified, found by sweep and read individually

Seven live claims had stopped being true, and the distinction that a naive grep destroys
was applied to every one: a **live** claim is amended, a **historical record** of what a
task measured at the time is correct in its own context and stays.

- **`README.md`'s script table said `pnpm test` is 239**, contradicted ninety lines later
  by its own correct 246. Amended.
- **The ruleset is stated as two checks in eight places.** `README.md` (three),
  `e2e/README.md`, ADR 0010 §17, ADR 0013 (one live, one close-time record left standing),
  `CLAUDE.md` (two). ADR 0010 §17 gained a third amendment and now says the failure mode is
  **tripled**: three checks keyed on three job names is three ways to un-require a gate by
  renaming a job.
- **ADR 0009 §10 still said five levels and explicitly denied a sixth.** Amended, with the
  section heading corrected too.
- **`migrations/README.md` §7's own table still said an edited applied file is "silently
  skipped — there is no checksum"**, contradicting §9 and the checked list in the same
  document. This is the one that would have cost the most, because §7 is what Story 2.3
  reads to decide whether the universe is a migration.
- **Three "nothing checks this" claims were closed by Task 2.2.5 and still read as open** —
  in `schema.ts`'s header, `migrations/README.md` §6 and `packages/shared/src/security.ts`.
  All three amended to say what checks them and in which direction.
- **"A migration opens its own transaction" survived in two more places** after Task 2.2.7
  corrected the two it knew about — `README.md`'s `test:database` section and
  `migrate.database.test.ts`'s own header, both of which use it as the _argument_ for the
  scratch-database pattern. The argument is unaffected and stronger; the wording was wrong.
- **`database.ts`'s "the only place this application knows there is a database driver"** is
  now false as written: `migrate.ts` constructs a `PostgresDialect` over the same pool and
  `migrate.database.test.ts` opens a `pg` client of its own. Narrowed to shipped serving
  code, with both exceptions named, rather than deleted.

`DATA-LAYER.md`'s temporal-seam paragraphs had **hardened from a spike finding into a
description of shipped code** in three places — the class this repository's closing sweeps
exist to catch, and the second time a document has been found doing it. Marked as a spike
record with the instruction Story 2.8 inherits stated separately.

## Related

- **Story 2.1** (ADR 0014, reserved for Task 2.1.8) — the managed server, the Entra
  credential path, and the pool this migrator borrows.
- **ADR 0013** — the checked-versus-prose line, and the "what a green X certifies" shape
  both lists above use.
- **ADR 0010** — why the pipeline invokes root scripts by name and defines nothing of its
  own, which is why the migration is a `pnpm migrate` step rather than a `psql` invocation.
- **ADR 0009** — the levels of test this story added a sixth to.
- **`apps/backend/migrations/README.md`** — the conventions themselves, and §8's failure
  table. Pointed at rather than copied, deliberately.
- **`DATA-LAYER.md`** — the five-candidate measurement, both temporal seams, and the two
  hand-rolled runners.
