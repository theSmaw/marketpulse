# The data layer — MarketPulse

**Tasks:** 2.2.1 — Choose the migration tool and the query layer, installing nothing
permanent; **2.2.2** — Install the mechanism and make an empty migration real
**Date:** 2026-09-05
**Status:** decided (2.2.1, nothing installed, tree byte-identical); **installed and proved
end to end against the local database (2.2.2)** — see the last section, which is where the
figures that were predictions in 2.2.1 are re-taken against the shipping tree

This is Story 2.2's one document about how this repository describes a database and how a
change to that description reaches a running one. It is to Story 2.2 what `HOSTING.md` is to
Story 1.11 and `BROWSER-TESTING.md` is to Story 1.13. One document per subject; a second one
about the same subject is a copy waiting to disagree.

Every figure below was **produced on this machine and re-read**, not cited. Where a
documentation page and a measurement disagreed, the measurement is what is recorded and the
disagreement is called out.

---

## The decisions, in one paragraph

**The migrator is Kysely's `Migrator`, driving plain SQL files through a ~15-line provider we
own.** **The query layer is Kysely too**, and it is a _seam declared here_ rather than code
written here — Story 2.2 ships no route and no read, so the first `selectFrom` is Story
2.8's. **`pg` and `apps/backend/src/database.ts` survive unchanged**: Kysely's
`PostgresDialect` takes our existing `pg.Pool`, and Task 2.1.4's per-connection credential
measurement reproduces exactly through it. **Migrations are forward-only.** Nothing is
generated, so `pnpm verify` still runs with no database and no new build step.

Kysely is the one candidate that had to win **two** comparisons, and it won them for
different reasons. It won the migrator comparison on cost and on failure modes it detects by
name. It won the query-layer comparison on one thing only, and it is architectural rather
than ergonomic: **it is the only candidate that made Epic 13's temporal isolation structural
rather than a convention**, and invariant 4 says future-information leakage must be
_structurally_ impossible.

---

## The baseline, and the rule about baselines

Task 1.13.1 established the hard way that **a virtual-store count is only comparable across a
fresh install**, because pnpm never prunes the virtual store. Every figure here is therefore
taken after `rm -rf node_modules apps/*/node_modules packages/*/node_modules e2e/node_modules`
followed by `pnpm install --frozen-lockfile`, and each candidate was reverted the same way
before the next one was measured.

| Baseline (fresh install, 2026-09-05) |                                        |
| ------------------------------------ | -------------------------------------- |
| store entries                        | **418**                                |
| `node_modules`                       | **291,912 KB**                         |
| `pnpm-lock.yaml`                     | **4,757 lines**                        |
| `pnpm-workspace.yaml` md5            | **`760fcd3cdac9aa970f4470c95f965621`** |
| install-script sweep                 | **`esbuild@0.28.2` and nothing else**  |

Note the store count is **418**, not the 404 Task 1.13.6 recorded: Story 2.1 added `pg` and
`@types/pg`. Re-read it rather than citing this line.

`pg@8.23.0` is already a dependency of `apps/backend`, so **every query-layer candidate's cost
is measured on top of a driver this repository already has**, and "keep `pg`, write SQL by
hand" costs nothing at all.

---

## The measurements, side by side

| Candidate                                    | Store entries | `node_modules`  | Lockfile | Workspace md5 | `allowBuilds`                     | Install    |
| -------------------------------------------- | ------------- | --------------- | -------- | ------------- | --------------------------------- | ---------- |
| plain SQL + a runner we own                  | **+0**        | **+0 KB**       | **+0**   | unchanged     | —                                 | —          |
| **`kysely@0.29.5`**                          | **+1**        | **+3,444 KB**   | **+9**   | unchanged     | did not fire                      | exit 0     |
| `node-pg-migrate@9.0.0`                      | +28           | +22,576 KB      | +124     | unchanged     | did not fire                      | exit 0     |
| `drizzle-orm@0.45.2` + `drizzle-kit@0.31.10` | +18           | +52,500 KB      | +670     | unchanged     | **did not fire, and should have** | exit 0     |
| `prisma@7.10.0` + `@prisma/client@7.10.0`    | **+129**      | **+308,588 KB** | **+992** | **CHANGED**   | **fired**                         | **exit 1** |

Three of those rows carry a finding the number alone does not.

### `kysely` has no dependencies at all

`+1` store entry is not a rounding of a small graph — it _is_ the graph. Kysely declares no
runtime dependencies, ships no install script, and needs no build step. It is the cheapest
thing this repository has considered adding since Story 1.6 rejected two schema libraries,
and it is the only candidate here that is cheaper than the problem it solves.

One structural detail worth carrying to Task 2.2.2, because it is not what the documentation
examples show: **in Kysely 0.29 the migrator is a separate subpath export.** `import { Migrator }
from "kysely"` is a hard `SyntaxError: The requested module 'kysely' does not provide an
export named 'Migrator'`; it is `kysely/migration`. So adopting the query builder does not drag
the migrator in, and vice versa.

### `node-pg-migrate` costs 28 entries and 13 of them are second copies of this workspace's own toolchain

This is **Task 1.13.1's Cypress finding reproduced exactly, by a different package**. Of the
28 new store entries, **13 have `jiti@2.7.0` in their key** — `eslint`, `typescript-eslint` and
its four sibling packages, `@eslint/js`, `@eslint-community/eslint-utils`,
`eslint-plugin-react-hooks`, `eslint-plugin-storybook`, `vite`, `vitest`,
`@vitejs/plugin-react`, `@vitest/mocker`. Read back out of the store:

```
eslint@10.9.1_jiti@2.7.0_supports-color@7.2.0
eslint@10.9.1_supports-color@7.2.0
```

Two copies of ESLint, for a migration runner. `jiti` is `node-pg-migrate`'s TypeScript loader
and is a hard `dependency` rather than optional, so it arrives even if every migration in the
tree is a `.sql` file. Task 1.13.1 measured the same mechanism through Cypress's
`supports-color` and wrote down that **a package count hides it**; a third of this candidate's
cost is duplication a naive reading attributes to the tool.

### Drizzle Kit brings two more esbuild majors, and `allowBuilds` did not fire — which is the finding

`drizzle-kit` pulls `tsx`, which pulls **`esbuild@0.18.20` and `esbuild@0.25.12`**, and both
of their `postinstall` scripts **ran**:

```
esbuild@0.18.20 postinstall$ node install.js
esbuild@0.25.12 postinstall$ node install.js
esbuild@0.28.2  postinstall$ node install.js
```

The policy did not fire and nothing warned, because **`allowBuilds` names a package, not a
version**. This repository has recorded since Task 1.4.5 that `esbuild` is its single
allowlist entry and that the sweep returns one line; the sweep returns **three** lines here,
all of them allowed, all of them downloading a platform binary. That is not a Drizzle defect
and it is not an argument against Drizzle on its own — it is a **property of the allowlist
that nobody had measured**, and it is worth carrying independently of this decision: _the
install-script sweep counts lines, and a name-keyed allowlist means one entry can admit any
number of them._

Drizzle also re-keys peers through `tsx` the way `node-pg-migrate` does through `jiti`, giving
second copies of `vite`, `vitest`, `@vitejs/plugin-react` and `@vitest/mocker`.

### Prisma cannot be installed here at all

The install **exits 1** with `[ERR_PNPM_IGNORED_BUILDS]: @prisma/engines@7.10.0,
prisma@7.10.0`, and pnpm rewrote the tracked `pnpm-workspace.yaml` with its invalid stub:

```yaml
"@prisma/engines": set this to true or false
prisma: set this to true or false
```

That is **Cypress's documented failure mode reproduced a second time**, in a second story,
against a second package — including the part where a tracked file changes under you and the
stub is itself invalid until edited.

What it drags in is worth listing, because "+129 packages" understates it. `mysql2` (a MySQL
driver, in a PostgreSQL project). `@electric-sql/pglite` — a **WASM build of Postgres**, 23.7 MB.
`@prisma/studio-core` at **43.2 MB**, which brings `@radix-ui/*` React components, `@visx/*`,
eleven `d3-*` packages and their `@types`, `elkjs` and `classnames` — a **React GUI, into the
backend's dependency graph**. Plus `effect`, `fast-check`, `lodash`, `dotenv`,
`postgres@3.4.7` (a _second_ Postgres driver beside `pg`) and `valibot@1.4.2` — the library
Story 1.6 measured and threw away.

And the measured size is an **under**-estimate: `@prisma/engines` reads 112 KB on disk _because
its postinstall never ran_, and downloading the engine binaries is what that script does.

Prisma is rejected before any of its behavioural questions were asked. Its query engine, its
migration semantics and its type generation may all be excellent; a dependency that fails the
install, rewrites a tracked file, more than doubles `node_modules` and puts a React GUI and a
MySQL driver behind `apps/backend` does not reach them.

---

## The question that separates the migrators — produced, not read

Every candidate was given the same broken migration: create a table, create a second table,
then violate a unique constraint, then create a third table.

```sql
create table X_first  (id integer primary key);
create table X_second (id integer primary key);
insert into X_second (id) values (1), (1);   -- 23505
create table X_third  (id integer primary key);
```

| Tool                               | Process exit      | Tables left behind | Bookkeeping row                 |
| ---------------------------------- | ----------------- | ------------------ | ------------------------------- |
| `node-pg-migrate`                  | **1**             | none               | `pgmigrations` — 0 rows         |
| Kysely `Migrator`                  | **0** — see below | none               | `kysely_migration` — 0 rows     |
| Drizzle Kit `migrate`              | **1**             | none               | `__drizzle_migrations` — 0 rows |
| a correct hand-rolled runner       | **1**             | none               | `schema_migrations` — 0 rows    |
| a **plausible** hand-rolled runner | **0**             | none               | **recorded as applied**         |

### The headline is that this question does not separate the three libraries, and that is the finding

All three roll the entire file back and none of them records the migration. The reason is not
that one of them is careful: **Postgres has transactional DDL**, and all three wrap the file
_and its bookkeeping row_ in one transaction. So "what happens on a partially applied
migration" — the question the brief called the disqualifier — disqualifies none of them, and
the decision has to rest on the failure modes it _does_ separate. It was still worth
producing, because the alternative was believing it about the fourth candidate.

### Kysely returns its failure instead of throwing it, and the process exits 0

`migrateToLatest()` resolves to `{ error, results }`. The migration failed, the transaction
rolled back, `results` reads
`[{"migrationName":"0001_partial","direction":"Up","status":"Error"}]` — and **the node
process exited 0**. A wrapper that does not read `error` and call `process.exit(1)` itself is
a green migration step that applied nothing.

That is a live hazard rather than a theoretical one and it is handed to Task 2.2.2 as a
**stated obligation with a test**: the runner must be made to fail once, on purpose, and seen
to exit non-zero. It is the same shape as `run-e2e.mjs` propagating a child's exit code and
handling the signal case, and the same shape as `pnpm test -- -t "name"` exiting 0 while
filtering nothing.

### The sharper version of the question is the statement that cannot run in a transaction

`CREATE INDEX CONCURRENTLY` is the one this project will actually meet, on Story 2.7's
`market_bars`. Under Kysely's Migrator it fails outright:

```
CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

The two tools differ on the escape hatch, and this is **the one comparison node-pg-migrate
wins**:

- **`node-pg-migrate`: `pgm.noTransaction()`, per migration.** Read out of the shipped bundle
  rather than the README, which does not mention it. Its own comment names the consequence:
  _"you can have some migrations applied and some not applied, if there is some error during
  migrating"_. Available in JS/TS migrations only — it is a method on the builder, not
  something a `.sql` file can say.
- **Kysely: `disableTransactions`, per `Migrator`.** All or nothing. Turning it on for one
  concurrent index turns it off for every migration in the tree.

**Accepted, with the trigger written down.** There is no concurrent index today and there is
no table to build one on; the first one arrives in Story 2.7 against measured ingestion. When
it does, the answer is a **second `Migrator` instance** with `disableTransactions: true` over
a separate directory — not flipping the flag on the one every ordinary migration goes through.
The reversal trigger for the whole tool choice is that arrangement turning out to be worse
than `pgm.noTransaction()`, and the cost of reversing is 28 store entries and a rewrite of
migration files that are SQL either way.

### What Kysely's Migrator catches that a hand-rolled runner would have to be told to

Each of these was produced, and each message below is quoted from the run:

- **A migration inserted out of order** — a merged branch adding `0002` after `0001` and
  `0003` are applied: _"corrupted migrations: expected previously executed migration 0003 to
  be at index 1 but 0002 was found in its place. New migrations must always have a name that
  comes alphabetically after the last executed migration."_
- **A previously applied migration deleted from the tree**: _"corrupted migrations: previously
  executed migration 0003 is missing"_
- **Re-running unchanged**: `results` is `[]`. Acceptance criterion 2's "applying it twice is
  a no-op", already true before Task 2.2.2 writes a line.
- **Two migrators at once**: a `kysely_migration_lock` table, which matters the day
  `deploy.yml` can produce two rollouts.

### The one thing it does **not** do, stated rather than discovered later

`kysely_migration` is `(name character varying, timestamp character varying)` — read out of
`information_schema`. **There is no checksum**, so a migration file _edited after it was
applied_ is undetected: the name still matches, so it is skipped, and the database silently
diverges from the file that claims to describe it.

Our own hand-rolled runner had this in five lines, so it is not hard — it is just not
somewhere Kysely's table can hold it. Two options for Task 2.2.2, and **neither is decided
here**: a second table our provider writes beside Kysely's, or a check in Task 2.2.5's
database-backed test. The second is this repository's own stated rule — _when the thing being
checked is reachable from an assembled instance, a test beats another `verify` step_ — and
2.2.5 exists anyway. Handed to 2.2.5 with the mechanism named.

---

## What a hand-rolled runner actually costs, produced both ways

The brief asks which of three precedents a migration runner is like. The honest answer needed
the failure mode produced rather than named, so both versions were written.

**The correct one is about 30 lines of code.** It needs, and every item is here because
leaving it out fails silently: an advisory lock; a tracking table; deterministic ordering
(`readdirSync` order is the filesystem's and is not it); a checksum; the change and its
bookkeeping row in **one** transaction; and a non-zero exit. It works — `0001` applied and
recorded, `0002` rolled back whole, exit 1.

**The plausible one differs by moving the bookkeeping row outside the transaction**, which is
the single most natural way to write it wrong. It prints:

```
applied 0001_first.sql
applied 0002_partial.sql
EXIT: 0
```

`schema_migrations` holds both rows. `hand_second` and `hand_third` do not exist. **The
database is now permanently divergent from every other copy of it, a later run is a no-op,
and nothing anywhere reported a problem.**

So a migration runner is the **`@fastify/cors` case and not the `react-error-boundary` case**.
Task 1.8.3 kept a library because a hand-rolled version _fails in a way that looks like
success_; that is exactly what the transcript above is. Task 1.7.6 threw
`react-error-boundary` away because it wrapped a `key`-based remount you still have to write —
the opposite condition, where getting it wrong is visible immediately. And Story 1.6 threw
away two schema libraries because a schema over `process.env` is a schema over strings —
which does not transfer at all, because a migration runner's job is transactions, ordering and
locking rather than parsing.

The precedent cuts _for_ a library here, and at **+1 store entry and zero dependencies** the
comparison is not close.

---

## The query layer — the temporal seam, written for two candidates

The invariant is architectural rather than ergonomic. Epic 13 enforces temporal isolation **in
the data layer**, and invariant 4 says future-information leakage must be _structurally_
impossible rather than instructed. The test is whether _"no query may read data timestamped
after the replay clock"_ can be expressed in **one place**.

Both seams were written against a real table with a row on each side of the clock.

### Candidate A — `pg` with hand-written SQL: a convention

The seam is a module that owns the pool, never exports it, and takes the clock as a required
argument on every read. It works, and going around it is one line:

```
through the seam: 100
around the seam: 100,200  <-- LEAKED
```

Nothing structural prevents the second query. Hiding the pool raises the cost of a leak; it
does not make one impossible, because the seam's own module can always add a function and
because the SQL is a string nothing inspects. **This is a convention enforced by code review**,
across thirteen more epics and every table in §30.

### Candidate B — Kysely: a plugin that rewrites the query itself

Kysely exposes the query AST to a `KyselyPlugin` before it is compiled. A ~20-line plugin
matches selects over a registry of temporal tables and appends the predicate. Given a call
site that asks for **no time filter at all**:

```js
db.selectFrom("market_bars").select("close").where("symbol", "=", "NVDA");
```

what is actually sent is:

```sql
select "close" from "market_bars" where "symbol" = $1 and "observed_at" <= $2
-- params: ["NVDA", "2026-03-01T00:00:00.000Z"]
```

and the row after the clock is gone. A query naming no temporal table is untouched:
`select "tablename" from "pg_tables"`.

Because the plugin is attached with `db.withPlugin(...)`, the isolated handle and the raw one
are **different objects** — so the module that constructs Kysely can export only the plugged
one, leaving no unplugged handle to import.

> **Read this paragraph and the next as a spike finding rather than as a property of the
> shipping tree (noted at Story 2.2's close, 2026-09-05).** The plugin was written, run
> against a real table with a row on each side of the clock, and reverted; the tree is
> byte-identical. What ships is one `Kysely<unknown>` inside `migrate.ts`, which is not
> exported and carries no plugin because it runs no query. **Story 2.8 writes the first
> `selectFrom` and owns the module this describes**, so "exports only the plugged one" is
> the instruction that story inherits, not a statement about a module that exists.

**The hole, and the thing that closes it.** A raw `` sql`...` `` query reaches the plugin as a
`RawNode` — an opaque string it cannot rewrite. It _does_ reach the plugin, though, which is
the difference between a hole and a hole you can see: the plugin can refuse it. Produced:

```
refused: raw SQL is not permitted under temporal isolation
```

So the seam is: **rewrite what it can, refuse what it cannot.** That is structural in the
sense invariant 4 asks for — a call site cannot silently read past the clock, and the only way
to try is a construct the seam rejects at run time. **In the shipping tree that is a
demonstrated capability of the chosen library rather than a property of any code here**, and
it stays one until Story 2.8's first read.

### Candidate C — Drizzle: no equivalent hook

Drizzle has no query-AST transform stage; the nearest equivalents are a convention (always
call a helper) or PostgreSQL **row-level security**, which is genuinely structural and is
database-side rather than library-side. RLS is recorded here as the fallback that works under
_any_ client — including `psql` and anything Epic 3 or a future service adds — at the cost of
a per-connection `set local` and a policy per table. **It is not chosen and not built**; it is
written down because it is the only mechanism that would survive the query layer being
replaced, and Epic 13 should read this paragraph before assuming the plugin is the only option.

### So the query layer is Kysely, and what that does and does not mean

It means the _seam_ exists from the first query rather than being retrofitted, at **zero
marginal cost** because the migrator already brought the package.

It does **not** mean this story writes queries. Story 2.2 ships no route and no read, so the
first `selectFrom` is Story 2.8's and the temporal plugin is Epic 13's. What Task 2.2.2 owes is
that the Kysely instance is constructed **over the existing `pg.Pool`** and that the unplugged
handle is not exported from the module that owns it — the second half being the whole
mechanism, and worth a comment beside the export rather than a line in a document.

**The cost is stated rather than discovered.** Kysely's `Database` interface is **hand-written**
and nothing checks it against the schema — a column renamed in a migration and not in the
interface typechecks, lints and builds, and fails at run time. That is a new gap of this
repository's third kind, and it has an owner: **Task 2.2.5's database-backed test can assert
the interface against `information_schema`**, which is the same rule
`apps/backend/src/server.test.ts` was written on. Handed forward rather than left implicit.

---

## Nothing is generated, and criterion 7 is why that was checked first

Acceptance criterion 7 says `pnpm verify` passes with no database running. Story 2.1 made that
a criterion twice and measured it twice. So the generation direction was checked **before** any
candidate was liked, because several generate types by introspecting a **live** database.

| Candidate                             | What is generated                                          | Does it dial Postgres?                                       |
| ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| **Kysely (chosen)**                   | **nothing**                                                | **no**                                                       |
| `kysely-codegen` (a separate package) | the `Database` interface                                   | **yes — introspects a live database. Rejected.**             |
| Drizzle                               | nothing at build time; types are inferred from a TS schema | `generate` no; **`pull`/`push` yes**                         |
| Prisma                                | `prisma generate` — a build step emitting a client         | `generate` no; **`migrate dev` yes, plus a shadow database** |
| `node-pg-migrate`                     | nothing                                                    | no                                                           |

**So: nothing is generated, no build step is added, and `pnpm verify` is untouched.** The
schema is the source of truth and the TypeScript interface follows it by hand, which is the
gap named in the previous section.

Two things Drizzle generates that are worth recording even though it was not chosen, because
they were surprising: `drizzle-kit generate` writes a committed `meta/_journal.json` plus a
snapshot JSON per migration that must not drift from the SQL, and **it names migration files
randomly** — the one produced here was `0000_smiling_mister_sinister.sql`. A repository whose
conventions are "one place, named for what it is" would be arguing with that from the first
migration.

---

## Forward-only, decided rather than inherited

**Migrations are forward-only. There is no `down`.**

The argument for `down` is that it exists. The arguments against are that a `down` which has
never been executed is a claim rather than a mechanism, and that the one that matters —
reversing a migration that dropped a column with data in it — **cannot be written at all**. A
directory of untested `down` functions is worse than none, because it reads as a rollback
capability the system does not have.

What makes this cheap to decide _now_ is that there is no data: the reversal for a mistake in
this story is a `DROP`. That stops being true in Story 2.3, which is precisely why it is
decided here.

It is expressible without fighting the tool, which was checked rather than assumed: Kysely's
migration type makes `down` optional, and every migration in these spikes declared only `up`.

**The reversal trigger is not "a migration we regret"** — the answer to that is a new forward
migration, always. It is a **deployment** that has to roll schema and code back together, which
is Task 2.2.7's subject and is a property of the rollout rather than of the migration; Task
1.11.7 already measured that this project's two halves roll back asymmetrically and that the
backend's fast path is silently undone by the next merge.

---

## `pg` survives, and `database.ts` is untouched

The disqualifying question for anything that replaces the pool is Task 2.1.4's: the deployed
credential is a `() => Promise<string>` that mints a Microsoft Entra access token, and `pg`
calls it **once per connection**. A layer that mints it once at construction is a layer whose
deployed connections stop working when the token expires.

Kysely's `PostgresDialect` takes `{ pool }` — our pool, with its credential function, its
`pool.on("error")` handler, its `connectionTimeoutMillis`, its `application_name` and its
`max`. Task 2.1.4's measurement was **re-taken through Kysely** rather than assumed to
transfer:

```
before any query,                    totalCount: 0  credential calls: 0
3 concurrent on a COLD pool of 3 ->  totalCount: 3  credential calls: 3
3 more on the WARM pool          ->                 new credential calls: 0
```

Three connections, three tokens, and none on the warm pool. Identical to 2.1.4's figures.
Drizzle behaves the same way (`drizzle(pool)` → 3 calls). Prisma manages its own connections
through its engine, though `@prisma/adapter-pg@7.10.0` exists and would take a pool — so the
credential question is answerable there too, and Prisma is disqualified some distance before
reaching it.

**So `apps/backend/src/database.ts` keeps everything Story 2.1 measured into it.** Kysely is a
wrapper _over_ the pool, not a replacement _for_ it, and the file's own header — "it is not a
query layer, a repository, an ORM or a typed access seam" — is answered by adding a handle
beside the pool rather than by rewriting the file. **What Story 2.2 actually shipped is
narrower than that sentence predicts**: `migrate.ts` constructs the handle it needs over this
pool and `database.ts` gained nothing at all, because the story ships no read. The handle
"beside the pool" is Story 2.8's.

---

## Migrations are SQL files, and the reason is what gets reviewed

This follows from the tool choice rather than being independent of it, so it is recorded here
and the naming, ordering and directory are Task 2.2.2's.

**SQL, not TypeScript.** A `.sql` file is reviewable in a pull request as _the thing that will
run_. A TypeScript migration compiles into `dist/`, so the artefact reviewed and the artefact
executed are two files — which is a shape this repository has already refused twice, in
declining a workflow that builds the site on the deploy side and in insisting the deployed
bundle be fingerprinted rather than assumed. The builder DSLs that argue the other way
(`pgm.createTable(...)`) belong to `node-pg-migrate`, which is not the tool.

The one assumption that design rests on was **verified rather than believed**, because if it
were false Task 2.2.2 would discover it: a multi-statement SQL body executes through Kysely's
migrator via `sql.raw(body)`, inside the transaction, and both tables appeared.

---

## What Task 2.2.2 inherits

- `kysely@0.29.5`, a **root-or-backend devDependency question that is 2.2.2's** — note the
  migrator is imported from `kysely/migration` and the query builder from `kysely`, and the
  runtime query builder is imported by shipped code, so the six-verb rule and the
  "does the package's source `import` it?" test point at `apps/backend`.
- A runner invoked **by name** from a root script — acceptance criterion 1, and Story 1.10's
  rule that the pipeline must not define its own database steps.
- **The runner must read `{ error }` and exit non-zero itself**, and must be made to fail once
  and seen to do it. This is the sharpest thing in this document.
- A SQL-file `MigrationProvider`, ~15 lines, using `sql.raw()`.
- The checksum gap, with Task 2.2.5 named as its owner and `information_schema` named as its
  mechanism.
- The `CREATE INDEX CONCURRENTLY` limitation, with a second `Migrator` named as the answer and
  Story 2.7 named as the trigger.
- The instruction that the unplugged Kysely handle must not be exported.

## What this task deliberately did not decide

Where migrations live and how they are named (2.2.2). The schema conventions — naming,
timestamps, identifiers, `numeric` for money (2.2.3). The `securities` table (2.2.4). The
sixth level of test and its command (2.2.5). How a migration reaches the deployed database and
what a failed one does to a rollout (2.2.7). TimescaleDB, which Story 2.7 owns against a row
count.

---

## The tree is byte-identical, proven rather than assumed

Every candidate was installed and reverted. After the last revert:

|                          |                                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| store entries            | **418** — baseline                                                                                                                                                                                                                          |
| `node_modules`           | **291,912 KB** — baseline. It reads 291,940 KB after `pnpm verify` runs, and the 28 KB is `apps/frontend/node_modules/.cache` and `.vite` — build caches rather than dependencies, confirmed by the store-entry list being `diff`-identical |
| `pnpm-lock.yaml`         | **4,757 lines**, `diff` against the pre-task copy is empty                                                                                                                                                                                  |
| `pnpm-workspace.yaml`    | md5 **`760fcd3c…`**, `diff` empty                                                                                                                                                                                                           |
| install-script sweep     | **`esbuild@0.28.2` and nothing else**                                                                                                                                                                                                       |
| `git status --porcelain` | only `notes.txt`, modified before this task began                                                                                                                                                                                           |
| `pnpm verify`            | **exit 0**                                                                                                                                                                                                                                  |

The local database was reset to an empty `public` schema, and the spike directory was deleted.

## The mechanism, as built — Task 2.2.2 (2026-09-05)

Task 2.2.1 decided and installed nothing. This section records what 2.2.2 then shipped, and
it is here rather than in a second document for the reason the header gives: one document per
subject.

### The install reproduced the spike exactly, and the sweep was counted rather than read

Re-taken from a **fresh install** — `rm -rf node_modules apps/*/node_modules e2e/node_modules`
then `pnpm install --frozen-lockfile` — because pnpm never prunes the virtual store and a
count is only comparable that way.

|                       | Baseline    | After `kysely@0.29.5` | Spike predicted |
| --------------------- | ----------- | --------------------- | --------------- |
| store entries         | 418         | **419**               | +1              |
| `node_modules`        | 291,912 KB  | **295,356 KB**        | +3,444 KB       |
| `pnpm-lock.yaml`      | 4,757 lines | **4,766 lines**       | +9              |
| `pnpm-workspace.yaml` | `760fcd3c…` | **unchanged**         | unchanged       |

All three to the byte and to the line. The install-script sweep returns **one line**,
`esbuild@0.28.2` — counted rather than read as a binary, because 2.2.1 found that
`allowBuilds` is keyed on a package **name** and one entry can admit any number of scripts.

`kysely` is a **`dependency` of `apps/backend`**, not a root devDependency and not a
devDependency: the runner is TypeScript that `tsc -b` compiles, the query builder will be
imported by shipped code in Story 2.8, and pnpm links a workspace dependency only into the
package that declares it.

### Where migrations live: `apps/backend/migrations/`

Three homes were available and the question that decides between them is which package the
runner is a dependency of. A **bare top-level directory** fails the way Task 1.13.1 measured
— `TS1295`, because the nearest `package.json` is the root's, which deliberately has no
`"type": "module"`, and `MODULE_NOT_FOUND` on anything pnpm links per package. A **fifth
workspace package** would be a package whose only consumer is `apps/backend`, and would join
every `pnpm -r` fan-out on the day it was created. `apps/backend` is the only thing in this
repository that connects to a database at all, so the description of that database lives
beside it.

**One consequence, stated now rather than discovered in Task 2.2.7:**
`apps/backend/package.json`'s `files` is `["dist", "!dist/**/*.test.*"]`, so `pnpm deploy` and
therefore the container image do **not** carry `migrations/`. That is the fact which decides
between "a step in `deploy.yml` before the container rolls" and "a job the container runs at
boot" — the second needs `migrations` added to `files` in the same change.

### Naming and ordering: a four-digit sequence number, because its failure is loud

`NNNN_lower_snake_case.sql`, checked by the provider rather than assumed. Timestamps are the
more common convention **precisely because of the property being rejected here**: two
developers on two branches each adding a migration.

- A **sequence number collides** — a merge conflict on a filename, resolved by a human in the
  pull request where both changes are visible, before it reaches any database.
- A **timestamp interleaves** — both branches merge cleanly and the migrations then apply in
  an order neither author tested, on every database, silently.

The case that breaks a sequence number is a branch renamed to a free number after the fact
rather than conflicting, and it has a backstop at the database: with
`allowUnorderedMigrations` left at its default of `false`, Kysely refuses a migration inserted
before an applied one by name — _"corrupted migrations: expected previously executed migration
0003 to be at index 1 but 0002 was found in its place"_.

A filename that does not match is an **error rather than a skipped file**, and so is an empty
directory. A silently skipped migration is the failure the whole mechanism exists to prevent,
and "no migrations found" and "everything already applied" otherwise print the same nothing.

### The exit code, made to fail three ways before it was called working

This was 2.2.1's sharpest handover and it is a property of our code rather than of the
library. `summariseMigration()` is therefore a **pure function with its own tests** rather
than a `console.log` inline, and `scripts/run-migrations.mjs` turns its `exitCode` into a
process result. Each of the four paths below was produced against the running local database:

| What                                      | Output                                                              | Exit  |
| ----------------------------------------- | ------------------------------------------------------------------- | ----- |
| empty database                            | `✓ 0001_baseline` / `Applied 1 migration.`                          | **0** |
| the same again, twice                     | `Already up to date — no migrations to apply.`                      | **0** |
| a migration violating a unique constraint | `✗ 0002_…` / `duplicate key value violates unique constraint`       | **1** |
| a filename the provider refuses           | `failed before any migration was executed` / names the file         | **1** |
| the database stopped                      | `failed before any migration was executed` / `connect ECONNREFUSED` | **1** |
| `pnpm migrate down`                       | refuses arguments, naming forward-only                              | **1** |

After the failing migration: **two tables in `public`** — Kysely's own two — and
`kysely_migration` holding `0001_baseline` alone. Postgres's transactional DDL plus the
bookkeeping row being inside the same transaction, confirmed on the shipping mechanism rather
than on a spike.

**Three deliberate breaks in `summariseMigration`, each seen to fail and reverted**, and the
second is the one that teaches something:

1. Never reading `error` at all — the exact 2.2.1 bug: **3 failed**.
2. Reading `results` for a `status: "Error"` **instead of** reading `error` — **2 failed**.
   It catches the ordinary case and misses the whole class where Kysely fails before working
   out what to run, when `results` is `undefined` and there is no `Error` anywhere to find.
3. Dropping the filename check — **1 failed**.

`pnpm migrate` refuses arguments rather than forwarding them, which is the opposite of
`pnpm db`'s decision and is deliberate: `pnpm db` wraps a tool with a large useful command
surface, and this wraps one operation. Silently running `migrateToLatest` for
`pnpm migrate down` and reporting success is the worst of the three options.

### The tracking table, read by hand

```
kysely_migration       name       character varying  NOT NULL
kysely_migration       timestamp  character varying  NOT NULL
kysely_migration_lock  id         character varying  NOT NULL
kysely_migration_lock  is_locked  integer            NOT NULL

 name          | timestamp
---------------+--------------------------
 0001_baseline | 2026-09-05T03:11:48.190Z
```

Both default names, kept: a rename buys nothing and gives every reader of this database two
names to reconcile. Note `timestamp` is a **`character varying` holding an ISO 8601 string**,
not a `timestamptz` — a fact worth knowing before anything tries to sort or filter on it.

**And there is no checksum column, which is the gap 2.2.1 named. It is deferred to Task
2.2.5**, which has been told so definitely rather than conditionally. The alternative was
weighed rather than waved away: a second table the provider writes is feasible, because the
provider's `up(db)` runs inside the migration's own transaction, so a hash row would be atomic
with the change. It was declined because it is a second bookkeeping mechanism with a bootstrap
ordering problem, guarding a failure whose only realistic cause is a developer editing an
applied file — against which this repository's own rule prefers a test. The half that argues
the other way is recorded in 2.2.5's task file: **a table is checked in every environment
including the deployed one, where no test runs.** What ships in the meantime is a warning
inside `0001_baseline.sql` itself saying not to edit it.

### The `Kysely` instance is built inside the runner and is not exported

`apps/backend/src/database.ts` gained **nothing at all** — no import, no handle, no export —
which is the check rather than an omission. Epic 13's temporal plugin is attached with
`withPlugin`, which returns a _different object_, so the seam holds only if there is no
unplugged handle to import; there is not one. `migrate.ts` constructs one, migrates with it
and destroys it. Story 2.8 writes the first `selectFrom` and owns where the _isolated_ handle
lives.

Note `db.destroy()` ends the underlying pool, so `closeDatabasePool()` must not also be
called — `pg` rejects a second `end()`.

### One thing 2.2.1 recorded that is sharper than recorded

The migrator being a separate subpath export is worse at **compile** time than at run time.
`import { Migrator } from "kysely"` is a hard `SyntaxError` when the module loads, as 2.2.1
found — but the root package still exports the _names_ as
`KyselyTypeError<"import from 'kysely/migration' instead">` stubs, so the mistake first
arrives as a confusing type rather than a missing one. Types come from `kysely/migration` too.

### A sixth kind of `pnpm verify` gap, measured rather than assumed

`.sql` files are read by nothing here, and the one-liner that has caught this list drifting
every time it has been re-run says so:

```
prettier --file-info apps/backend/migrations/0001_baseline.sql
  { "ignored": false, "inferredParser": null }
eslint apps/backend/migrations/0001_baseline.sql
  0:0  warning  File ignored because no matching configuration was supplied
```

The same signature `scripts/dev.sh`, the `Dockerfile` and the root `.dockerignore` carry. So a
migration's SQL is unformatted, unlinted and untypechecked, and the only things standing over
it are code review and the fact that a broken one fails loudly the first time it is run. It is
in `CLAUDE.md`'s gap list. `apps/backend/src/migrate.ts` and `scripts/run-migrations.mjs` are
**inside** the net — `"typescript"` and `"babel"` respectively — which is the whole reason the
runner is TypeScript in `src/` with a thin `.mjs` wrapper rather than a script.

### One thing this task changed that it did not set out to, and one it could not explain

`pnpm verify` went red twice during this task, both times inside
`apps/backend/src/index.process.test.ts`, on a tree whose own tests were green when run on
their own. They are recorded separately because only one of them was diagnosed.

**Fixed.** `reports the database's reachability at startup, either way` used
`await delay(200)` and then asserted the record was present. The comment beside it justified
the _ordering_ — the entrypoint awaits the probe immediately after `listen()` — and said
nothing about the _duration_, which is the half that matters: with no database the probe
fails in about 3 ms and 200 ms is enormous, and with one it has to open a real connection.
Under the load of a full chain it lost that race once. It **polls** now, with a 10-second
deadline, which is what `check-ready.mjs` and `waitForReady` in the same file already do; the
assertion is unchanged and was made to fail before it was believed, by asserting a record that
never appears.

**Not explained, and recorded rather than hidden.** `closes the pool after the drain and
before the exit` failed once with `expected 4 to be greater than 7` — the index of
`http drained` below the index of `signal received, shutting down`, which is an ordering the
process cannot produce. It did **not** reproduce in five subsequent runs of the suite, nor in
two runs under eight CPU-saturating background processes. The suspicion worth carrying is the
harness rather than the application: `launch()` appends **both** `stdout` and `stderr` into one
string, so a chunk boundary between the two streams can corrupt the buffer — though that does
not obviously explain a reordering of records that all go to `stdout`. It is a flake in a
Story 2.1 test rather than in anything this task built, and it is left open with the numbers
written down, because inventing a fix for a mechanism nobody has reproduced is worse than
naming it.

### Criterion 7, measured on the task that could have broken it

`pnpm verify` is **exit 0 in 26.16 s with the database stopped**, and `pnpm test` is **239**
(37 + **99** + 103) needing no database, no build and no socket. Task 2.1.2's stated trigger
for `pnpm ready`'s third check becoming a gate — _the first check in `pnpm verify` or
`pnpm e2e` that fails without a database_ — has **not** fired here, because `pnpm migrate` is
neither.

---

## Sources

Everything above is a measurement taken on 2026-09-05 on macOS 14.7.6 / arm64, Node
v24.20.0, pnpm 11.24.0, Docker 29.2.1, against PostgreSQL 18.6 in the container
`compose.yaml` defines. Versions measured: `kysely@0.29.5`, `node-pg-migrate@9.0.0`,
`drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `prisma@7.10.0`, `@prisma/client@7.10.0`,
against `pg@8.23.0` already in the tree.
