# Story 2.2 — Database Schema & Migration Mechanism

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.1
**Epic scope covered:** Database schema and migration mechanism

## Description

Decide how this repository describes a database and how a change to that description
reaches a running one — then apply it to the smallest schema that is worth having.

Epic 1 recorded that **schema migrations have no owner anywhere in the roadmap**: Epic 12
carries investigation persistence, but a migration mechanism is needed the moment this
epic writes its first row. This is that owner.

The choice made here is one of the two or three most consequential in the epic, because
every table in §30 — `securities`, `market_bars`, `anomalies`, `relationships`,
`filings`, `investigations`, `investigation_steps`, `findings`, `evidence`,
`workspace_events` — arrives through it, across thirteen more epics.

## Why it sits here in the sequence

It has to precede the first table and it cannot precede the database. Doing it before
there is data also means the first migration is reversible in practice as well as in
theory: a mistake costs a `DROP`, not a backfill.

## Scope

- The migration tool decision, and the query/access-layer decision, which are related but
  not the same decision
- Where migrations live, how they are named and ordered, and whether they are SQL or code
- **How a migration reaches the deployed database** — this is the half that gets skipped
  and then hurts. Candidates: a step in `deploy.yml` before the container rolls, a job the
  container runs at boot, or a manual command. Each has a different answer to "what
  happens when the migration succeeds and the deploy then fails"
- Forward-only versus up/down, decided rather than defaulted
- Conventions the rest of the roadmap inherits: table and column naming, timestamps and
  their timezone handling, identifier types, soft deletes or their absence, and how a
  monetary or price value is stored (**`numeric`, not floating point** — the arithmetic in
  Epic 5 is user-visible)
- The **first schema**: enough for Story 2.3's `securities` table and nothing more.
  `market_bars` belongs to Story 2.7, where its shape is driven by measured ingestion
- A **sixth level of test** — one that talks to a real database — and its cost. Epic 1
  has five levels and a stated rule that `pnpm test` must stay fast, need no build and
  need no socket. A database-backed test breaks all three of those, so it needs the
  `test:process` treatment: its own command, its own config, and a stated reason

## Out of scope, and who owns it

- Any table beyond `securities` — Stories 2.3 and 2.7
- Seed data — Story 2.3, which owns what the seed _contains_; this story owns whether
  seeding is a migration, a script, or neither
- TimescaleDB — deliberately deferred to Story 2.7, where there is a row count to justify
  it against. §30 says "optionally", and §37 says do not add a second data technology
  without a measurement

## Open decisions — settle with the user

**Decisions 1 and 2 are settled, and the generation half of decision 4 with them** — Task
2.2.1 measured five candidates from a fresh install and recorded the arguments in
[`DATA-LAYER.md`](DATA-LAYER.md). The migrator is **Kysely's `Migrator`** driving plain SQL
files through a provider we own; the query layer is **Kysely** too, declared as a seam rather
than written, since this story ships no read; **nothing is generated**; migrations are
**forward-only**; and **`pg` and `database.ts` survive unchanged**. Decision 3 is still open
and belongs to Task 2.2.7. The original wording is kept below rather than deleted, because it
records what was being weighed at the time.

1. ~~**Migration tool.**~~ **Settled — Kysely's `Migrator`, +1 store entry and no
   dependencies.** The precedent question resolved to the `@fastify/cors` case, and it was
   produced rather than argued: a plausible hand-rolled runner, differing from a correct one
   only by recording its bookkeeping row outside the transaction, printed
   `applied 0002_partial.sql` at **exit 0** over a database whose tables did not exist. The
   partial-migration question separated **none** of the three real candidates, because
   Postgres has transactional DDL and all three put the bookkeeping row inside the same
   transaction — so the decision rested on cost, on the failure modes Kysely detects by name,
   and on the query layer. The original text:
   **Migration tool.** Candidates worth measuring rather than arguing about: plain SQL
   files with a tiny runner, `node-pg-migrate`, Kysely's migrator, Drizzle, Prisma. The
   repository's own precedent is instructive — Story 1.6 spiked two schema libraries and
   threw both away, Task 1.7.6 threw away `react-error-boundary`, and Task 1.8.3 kept
   `@fastify/cors` because a hand-rolled version fails in a way that looks like success.
   Weigh: what it adds to the install, whether it needs a build step, whether it owns the
   types as well as the schema, and what it does on a partially applied migration
2. ~~**Query layer.**~~ **Settled — Kysely, and on the architectural test rather than the
   ergonomic one.** The temporal seam was written for two candidates: `pg` with hand-written
   SQL leaks one `pool.query` away, produced; Kysely's AST plugin injected the predicate into
   a call site that asked for no filter, left non-temporal queries untouched, and **refused**
   the raw-SQL bypass it could not rewrite. The cost is stated rather than discovered — the
   `Database` interface is hand-written and nothing checks it against the schema, which Task
   2.2.5 now owns against `information_schema`. The original text:
   **Query layer.** A query builder with generated types, an ORM, or `pg` with hand-written
   SQL and hand-written row types. The invariant to protect is architectural rather than
   ergonomic: **Epic 13 enforces temporal isolation in the data layer**, so whatever is
   chosen must make "no query may read past the replay clock" expressible in one place
   rather than remembered at every call site
3. **Where migrations run on deploy**, and what a failed migration does to the rollout —
   still open and Task 2.2.7's, and Task 2.2.2 handed it the fact that decides it:
   `apps/backend/package.json`'s `files` field means the container image does **not** carry
   `apps/backend/migrations/`, so "a job the container runs at boot" needs that field
   changed in the same commit and "a step in `deploy.yml`" does not
4. **Whether the schema or the TypeScript types are the source of truth** — **the generation
   half is answered: nothing is generated**, the schema is the source of truth and the
   TypeScript follows it by hand (`kysely-codegen`, `drizzle-kit pull` and `prisma migrate
dev` all introspect a **live** database and lose acceptance criterion 7). What remains for
   Task 2.2.3 is where the hand-written types live, and there are now two of them: Kysely's
   `Database` interface, which describes rows, and Story 2.3's `Security`, which is domain
   vocabulary bound for `packages/shared`. **Settled by Task 2.2.3 — the `Database`
   interface stays in `apps/backend` and the mapping between the two lives beside the
   query, one function per domain type and never a generic mapper.** A row is not a domain
   object (a row has a `sector_id` where a domain object has a sector), the row type
   describes one process's transport rather than a fact both sides depend on, it carries
   Kysely's `Generated` and `ColumnType` helpers into whatever imports it, and
   `packages/shared` is consumed as built output. The mapping is where a nullable column
   becomes an explicit domain answer, which is exactly the decision a generic mapper skips.
   Task 2.2.4 writes the interface, Task 2.2.5 asserts it against `information_schema`

## Acceptance criteria

1. A migration mechanism exists, is documented, and is invoked **by name** from a root
   script — the pipeline must not define its own database steps, for the reason Story 1.10
   gives about forking the definition of "verified"
2. A migration applied to an empty database produces the expected schema, and applying it
   twice is a no-op
3. The deployed database is migrated by the chosen mechanism, observed rather than assumed
4. A deliberately broken migration fails loudly, and what it leaves behind is recorded
5. Database-backed tests run under their own command, exit non-zero when they fail, and
   are **not** in `pnpm test`; `pnpm test` still needs no database, no build and no socket
6. The conventions are written where the next person writing a migration will look
7. `pnpm verify` passes with no database running

## Tasks

Tackled in order. The story is complete when all eight are done.

2.2.1 decides and ships nothing, deliberately — the same shape as Tasks 1.10.1, 1.11.1 and
2.1.1, because this decision is spent across thirteen more epics and the first migration in
this repository's history should have one possible cause when it goes wrong. 2.2.2 to 2.2.6
are entirely local and come **before** the deployed database is touched, for Task 1.11.2's
reason — a platform failing on something that was never correct is the most expensive
failure to read, and that goes double for a stateful thing with a `CanNotDelete` lock on
it. Inside that run the order is machinery (2.2.2), then the vocabulary every later table
inherits (2.2.3), then one real table (2.2.4), then the test level that makes idempotence a
check rather than a measurement taken once (2.2.5), then every way it can fail (2.2.6) —
which is what determines 2.2.7's shape rather than the other way round. 2.2.7 is the half
the story says gets skipped and then hurts, and it is where the Entra-only credential path
stops being the backend's problem alone. 2.2.8 closes the story and records ADR 0015.

| #     | Task                                                                                                                                    | Status       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2.2.1 | [Choose the migration tool and the query layer, installing nothing permanent](TASK-01-choose-the-migration-tool-and-the-query-layer.md) | **Complete** |
| 2.2.2 | [Install the mechanism and make an empty migration real](TASK-02-the-mechanism-and-an-empty-migration.md)                               | **Complete** |
| 2.2.3 | [Write the conventions down, before there is a table to argue about](TASK-03-the-schema-conventions.md)                                 | **Complete** |
| 2.2.4 | [The first schema: `securities` and nothing more](TASK-04-the-first-schema.md)                                                          | Not started  |
| 2.2.5 | [The sixth level of test, and what it costs `pnpm test`](TASK-05-the-sixth-level-of-test.md)                                            | Not started  |
| 2.2.6 | [Break a migration on purpose, locally, and record what it leaves behind](TASK-06-break-a-migration-on-purpose.md)                      | Not started  |
| 2.2.7 | [Migrate the deployed database, and decide what a failed migration does to a rollout](TASK-07-migrate-the-deployed-database.md)         | Not started  |
| 2.2.8 | [Verify from a clean clone, document, and record ADR 0015](TASK-08-verify-document-and-adr.md)                                          | Not started  |

**Two things about this split worth stating, because both are decisions rather than
consequences.** The **conventions come before the first table** (2.2.3 before 2.2.4): the
alternative is to write `securities` and extract the conventions from it, which produces
conventions describing one table rather than ten — and the two that would suffer most, the
event-versus-retrieval timestamp pair and the identifier rule, are the two `securities`
alone does not exercise. And **breaking a migration comes before deploying one** (2.2.6
before 2.2.7), because "what happens when the migration succeeds and the deploy then fails"
is not answerable until what a half-applied migration leaves behind has been produced
rather than read.

**Amended after Task 2.2.2 (2026-09-05), with no task added, deleted or re-ordered.** Five
task files were amended because 2.2.2 turned questions into facts they were still written
around. The one that is a genuine gap rather than a refinement: **nobody owned writing the
`Database` interface.** 2.2.3 decides where the hand-written type lives, 2.2.5 asserts it
against `information_schema`, and 2.2.2 left the migrator on `Kysely<unknown>` because there
was no table to describe — so **2.2.4 now owns creating it**, in the change that creates the
table it describes. The other four are inheritances: 2.2.3 learns that a `.sql` file is read
by no tool at all, which puts a hard floor under its "checked versus prose" lists, and that
the filename rule is already an enforced convention it can copy; 2.2.6 learns that four
failure classes have already been produced on the shipped runner, so its list is now the ones
2.2.2 could not reach — including every one that needs a table **with rows in it**; 2.2.7
learns that `files` keeps `migrations/` out of the container image, which is the fact that
prices "a job the container runs at boot" against "a step in `deploy.yml`", and that the
migration pool reports `application_name` as `marketpulse-backend`, which is misleading the
moment a separate migration identity is chosen; and 2.2.8 gains the first-run **sequence** as
a thing to re-take separately from the command table, plus an open flake to close or carry
forward rather than drop.

**`market_bars` is in none of these tasks and that is deliberate**, per this story's own
out-of-scope note: its shape is driven by measured ingestion, and creating it here would be
creating it against no measurement at all.

## What this story hands forward

The mechanism every table in §30 arrives through, and the one place Epic 13's temporal
constraint can later be made structural rather than remembered.

## Conventions

The Story 1.1 conventions bind this story unchanged — `pnpm verify` is the acceptance
command, six verbs per package, root-only shared tooling, ESM with `.js` import extensions,
and `packages/shared` consumed as built output. They are recorded once in `docs/adr/0001-*`
and `CLAUDE.md` rather than duplicated here, deliberately: Epic 1 finished with twelve
near-identical copies of that block and a task spent reconciling them.
