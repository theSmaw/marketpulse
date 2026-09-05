# Task 2.2.5 — The sixth level of test, and what it costs `pnpm test`

**Status:** Complete — 2026-09-05
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Tasks 2.2.3 (complete) and 2.2.4 (complete) — there is a schema to assert
against, `apps/backend/src/schema.ts` describes it, and **both of those tasks handed this one
work by name rather than by implication**. 2.2.3 named five conventions as reachable from a
migrated database and gave each the `information_schema` reading that would check it; 2.2.4
created a new unchecked invariant deliberately and in the open, and produced two traps that
change how these checks have to be written. Read
[`apps/backend/migrations/README.md`](../../../../apps/backend/migrations/README.md)'s closing
two lists before starting: this task is what moves entries from the second list to the first

## Objective

Give this repository a level of test that talks to a real database, under its own command,
without letting it near the one developers run all day.

## Work

- **Give it the `test:process` treatment, because it is the same problem.** Epic 1's five
  levels rest on a stated rule: `pnpm test` is fast, needs no build and needs no socket. A
  database-backed test breaks all three. Task 1.10.5 solved exactly this shape with a
  second Vitest config and a second command in the same package, and the argument was that
  the fast suite must not become conditional on a build or able to bind a port. Reuse the
  arrangement rather than re-deriving it, and reuse its trap too: **the two configs'
  globs are one decision** — the unit config excludes what the second config includes —
  and nothing enforces the naming, so a database test named the wrong way runs in the fast
  suite and a correctly named one in another package runs nowhere at all. Write the reason
  in both files, which is the only mitigation there has ever been for that class.
  **Task 2.2.2 gave that trap a concrete neighbour**: `apps/backend/src/migrate.test.ts` is
  ten fast tests about the migration mechanism that deliberately open no socket — the
  provider reads files from a temporary directory and the summariser is pure — so the
  package now holds migration tests on **both** sides of the partition, and a file named a
  hair differently lands in the wrong one. Do not duplicate those ten; what this suite adds
  is what they structurally cannot reach
- **`skipIf` is not available and the reason is recorded twice.** A skipped test reports
  green, which this repository has already called the worst failure mode available. Task
  2.1.4's answer is the model: the one test that cared whether a database existed **asked
  the question itself** — the same eight-byte SSLRequest `check-ready.mjs` sends — and
  asserted the matching answer, so it is a real assertion in both environments and
  `pnpm test:process` is the same count either way. This suite cannot do that, because it
  genuinely needs a database, so it fails loudly with a message naming `pnpm db` instead
- **Assert something only a database can answer.** The obvious and correct subject is the
  mechanism itself: migrate an empty database, read the resulting schema, migrate again and
  assert nothing changed. That makes acceptance criterion 2 a **test** rather than a
  measurement taken once, and it is the shape this repository already prefers — Task 1.9.3
  closed a gap no `verify` step could by walking the route table from an assembled
  instance, and the rule it wrote is that a test beats another `verify` step whenever the
  thing being checked is reachable from a running instance
- **Assert the second thing too, because Task 2.2.1 handed it over by name: the hand-written
  `Database` interface against `information_schema`.** Kysely generates nothing, so that
  interface is written by hand and **nothing checks it against the schema** — a column
  renamed in a migration and not in the interface typechecks, lints and builds, and fails at
  run time. That is a new gap of this repository's third kind and this suite is the only
  place it is reachable: migrate, read `information_schema.columns`, and assert the two
  agree on names, types and nullability. **The interface now exists, at
  `apps/backend/src/schema.ts`, and Task 2.2.4 already made the comparison once by hand** —
  every column matched on name, type, nullability and default, and the row was then checked
  field-by-field against what `pg` actually returns (`id` a **string**, both timestamps
  `Date`, a null `industry`). So this is a measurement being turned into a check rather than
  a question being opened, and the check should be **made to fail** by renaming a column in
  the interface, which is the failure it exists for. Two mechanical facts from that
  reading, both of which will otherwise cost a session. **Postgres rewrites a check
  constraint**: `check (kind in ('equity', 'etf'))` reads back as
  `CHECK ((kind = ANY (ARRAY['equity'::text, 'etf'::text])))`, so nothing can string-match
  the migration's own text. And **PostgreSQL 18 materialises `NOT NULL` as `pg_constraint`
  rows** (`contype = 'n'`, e.g. `securities_symbol_not_null`) where older majors do not —
  confirmed to be the engine rather than anything this repository wrote, because Kysely's own
  `kysely_migration` table has them too — so **a check that counts or enumerates
  `pg_constraint` rows is asserting the Postgres major version**, not the schema, and would
  go red against a correct database on a different one. Read nullability from
  `information_schema.columns.is_nullable`, which is stable across majors.
- **Close the invariant Task 2.2.4 created deliberately, because it is the one this suite is
  most obviously the home for.** `SECURITY_KINDS` in `packages/shared` and
  `securities_kind_check` in the database are two spellings of one vocabulary and **nothing
  compares them**: add a member to the union without the matching migration and the compiler
  permits a value the database refuses, at run time, in whatever writes it. Both halves are
  readable from here — the union is an ordinary import, and the constraint's own text is in
  `information_schema.check_constraints` — so by this repository's rule that a test beats
  another `verify` step whenever the thing is reachable from an assembled instance, this
  should be a check rather than a third paragraph of prose. Write it against the **rewritten**
  form above, and make it fail first
- **Watch for a check that passes by having nothing to check, which is the failure mode this
  particular list is most exposed to.** Of the five conventions Task 2.2.3 handed over, the
  schema as it stands exercises **two**: `securities` has `timestamptz` columns and an
  identity `id`, and it has **no price column, no `double precision`, and no naive
  `timestamp`** — so "every price column is `numeric(18, 6)`" and "no `double precision`
  exists" would both pass against a schema containing no numbers at all. That is Task
  1.13.6's blind-renderer problem in a new place: a green result that certifies nothing,
  indistinguishable from a green result that certifies something. Either assert the sweep saw
  a non-zero number of columns, or say in writing which of the five are vacuous today and
  which table first makes them real — `market_bars` (Story 2.8) for the money rule, and Story
  2.3 or 2.8 for the foreign-key naming rule, which is prose permanently in any case
- **The checksum gap lands here too, and this is no longer conditional — Task 2.2.2 deferred
  it to this task by name.** Kysely's `kysely_migration` is
  `(name, timestamp)` with no hash, read out of `information_schema` twice now, so an applied
  migration whose file was edited is skipped silently and the database diverges from the file
  that claims to describe it. A test that re-reads the files and compares them to what the
  schema actually looks like is the cheapest thing standing between that and a divergence
  nobody notices. **What 2.2.2 rejected, so it is not re-taken from scratch:** a second table
  the provider writes beside Kysely's is genuinely feasible — the provider's `up(db)` runs
  inside the migration's own transaction, so a hash row would be atomic with the change — and
  it was declined because it is a second bookkeeping mechanism with a bootstrap ordering
  problem, guarding a failure whose only realistic cause is a developer editing an applied
  file, against which this repository's stated rule already prefers a test. **The half that
  argues the other way and should be weighed here rather than ignored: a table is checked in
  every environment including the deployed one, where no test runs.** If that decides it, the
  answer is a table and a note in `DATA-LAYER.md` saying why the recommendation was reversed
- **Decide what a test does to the database it ran against**, which is the decision that
  makes this suite either trustworthy or a source of Monday-morning confusion: a
  transaction rolled back per test, a schema per run, a separate database entirely, or
  truncation between tests. Whatever is chosen, the property to protect is that running the
  suite does not destroy the rows a developer was mid-way through debugging — which is the
  same argument Task 2.1.2 used to keep the database out of `pnpm dev`. **That property is
  concrete rather than hypothetical from this task onward**: `securities` exists, Task 2.2.4
  deliberately left it **empty**, and Story 2.3 is about to fill it with a ~100-row universe
  that takes a documented command to rebuild. A suite that truncates it is a suite that costs
  a developer that command every time they run it, and one that leaves rows behind is a suite
  whose own next run starts from a state it did not choose. Note also that **this suite needs
  its own `Kysely` handle or its own `pg` client**: `migrate.ts` deliberately does not export
  the one it builds, which is Task 2.2.1's query-layer seam and must not be relaxed for a
  test's convenience — the same shape Task 1.13.3 refused when it declined to move two
  constants into `packages/shared`
- **Decide whether CI runs it, and take the consequences out loud.** A second job in
  `verify.yml` with a Postgres service is the obvious shape, and it has three costs that
  are each a decision: it is a **third required check** on `main` if it gates a merge —
  keyed on a job name, which renaming un-requires silently, and which no file in this tree
  records; the service's Postgres version is a **second place the engine version is
  pinned**, against a local pin nothing already compares to the deployed one; and Story
  1.10's founding rule means the job invokes `pnpm migrate` and this command **by name** and
  defines no database step of its own
- **Re-take Task 2.1.2's stated trigger rather than assuming it fired.** That trigger is a
  condition and not a task number: _the first check in `pnpm verify` or `pnpm e2e` that
  fails without a database_. If this suite is its own command and CI job, the trigger has
  **not** fired, `pnpm ready`'s third check stays a reporting `○`, and saying so is the
  answer. Measure it — `pnpm verify` with no database, and the browser suite with one
  stopped — rather than reading the code, which is how 2.1.4 answered the same question
- **`pnpm test` still needs no database, no build and no socket**, measured on a machine
  with the database stopped, and its count is unchanged by everything above

## Done when

- A database-backed suite exists under its own command, with its own config, and its
  reason written beside both
- It exits non-zero when it fails, seen rather than assumed
- It is not in `pnpm test`, and `pnpm test` runs green with no database
- The `Database` interface is asserted against `information_schema`, and the check was made
  to fail before it was believed
- `SECURITY_KINDS` and `securities_kind_check` are asserted to agree, made to fail first —
  or the reason that check was not built is written down
- Which of Task 2.2.3's five reachable conventions are **vacuous** against the current
  schema is stated, and no check is left able to pass by having nothing to look at
- What it does to the database it ran against is decided and stated
- Whether CI runs it is decided, with the required-check and version-pin consequences named
- Task 2.1.2's trigger is re-taken by measurement and its answer recorded either way
- `pnpm verify` is exit 0 with no database running

## Notes

The invariant with no enforcement is worth naming here because this task creates a second
instance of it: Task 1.13.2 recorded that **the only thing keeping the browser suite out of
`pnpm test` is that `e2e/package.json` has no `test` script**, and nothing checks that it
stays absent. This suite adds a second such absence, in a package that _does_ have a `test`
script, so the mitigation is the glob comment rather than a missing file — which is weaker,
and should be said so rather than glossed.

## Outcome — 2026-09-05

`pnpm test:database` is **23 tests in ~0.5 s** against a real PostgreSQL server, under
`apps/backend/vitest.database.config.ts` and `apps/backend/src/migrate.database.test.ts`.
Seven of `migrations/README.md`'s conventions moved from its prose list into its checked
one; one deliberately did not.

### The arrangement

A **third** config in `apps/backend`, the `test:process` treatment reused rather than
re-derived. **The three globs are one decision**, and the unit config's `exclude` now has
two entries with the reason written in all three files — nothing enforces the naming, and a
database test named `foo.test.ts` lands in the fast suite while a `foo.database.test.ts` in
a package with no such config runs **nowhere at all**.

**What it does to the database you are working in: nothing.** It creates
`marketpulse_vitest`, migrates it, reads it and drops it — at the end of a run **and again
at the start of the next**, so a crashed run is self-healing. The three alternatives each
fail a property this repository already holds: a transaction per test cannot work when a
migration opens its own and that is the thing under test; truncation destroys the universe
Story 2.3 loads, costing a developer a command on every run; a schema-per-run needs
`search_path` games the unqualified migration SQL would silently follow. Confirmed after a
run: `\l` shows only `marketpulse`, and its `securities` is still empty with both
migrations recorded.

**No `skipIf`.** With the database stopped it fails in `beforeAll` at **exit 1**, naming
`pnpm db`. It points the runner at its own database through `DATABASE_NAME`, which is the
supported operator interface — measured first, because the whole arrangement rests on a real
environment variable beating a `.env` entry, and it does. `migrate.ts` is untouched and
still exports no `Kysely` instance, so the suite opens its own `pg` client.

### The three-hop arrangement, which is the strongest thing here

A TypeScript interface is erased, so it cannot be read at run time. `EXPECTED_SECURITIES` is
declared `satisfies Record<keyof SecuritiesTable, ExpectedColumn>` — the idiom the API's
response schemas already use — so a column added to the interface and not described there is
**`TS1360`**, and the suite then compares that description against `information_schema` **in
both directions**. Interface → spec by the compiler, spec → database by the test, therefore
interface → database. That is what makes a hand-written type safe without generating
anything.

### What is checked now, and the one thing that is not

Moved: idempotence asserted on the **schema** rather than on the runner's own report; no
naive `timestamp`; no `double precision` or `real`; no `created_at`/`deleted_at`/
`is_deleted`/`archived_at`; an identity `bigint` `id` on every table; `schema.ts` against the
real schema; and **`SECURITY_KINDS` against `securities_kind_check`**, which closes the
invariant Task 2.2.4 created deliberately.

**Not moved: "every price column is `numeric(18, 6)`", because `securities` holds no money.**
A check would pass by having nothing to look at — a green result that certifies nothing,
indistinguishable from one that certifies something. What ships instead is a **tripwire**
asserting there are **zero** `numeric` columns, which fails the moment `market_bars` arrives
in Story 2.8 with a message telling whoever added it to replace it and update the two lists.
A rule that cannot yet be enforced is recorded as failing-open rather than as quietly
passing, and the sweep carries its own non-vacuity guard.

### Made to fail, six ways, each reverted

A column renamed in the **migration** only (2 failed, one of them naming
`securities.industry`); a member added to **`SECURITY_KINDS`** only; a column added to the
**interface** only, which is a **compile error** rather than a test failure and is the other
direction of the same check; a naive `timestamp` column; a `numeric` column tripping the
tripwire with its instruction message; and the database stopped.

### Two mechanical facts anyone extending these checks needs

**Postgres rewrites a check constraint** — `check (kind in ('equity', 'etf'))` reads back as
`CHECK ((kind = ANY (ARRAY['equity'::text, 'etf'::text])))` — so the vocabulary check parses
the rewritten form rather than string-matching the migration. And **PostgreSQL 18
materialises `NOT NULL` as `pg_constraint` rows**, so counting those rows asserts the engine
major rather than the schema; nullability comes from `information_schema`, which is stable
across majors.

### CI, and the third pin turned into a check

A third job, **`database`**, in `verify.yml`, with a Postgres service — and it **gates a
merge**, making it the third required check on `main`. Three costs stated: the gate keys on
the **job name**, so renaming un-requires it silently (Task 1.10.2's failure mode, now
tripled); the job invokes `pnpm test:database` **by name** and defines no database step of
its own; and the service image is a second place the engine version is pinned.

**That pin is compared rather than merely noted**, which is the one thing this task added
that was not asked for: a step reads `LOCAL_DATABASE_VERSION` out of
`scripts/local-database.mjs` and compares it against what the server reports, so a bump on
one side and not the other is a red job naming both numbers. Its body was run locally
before being pushed, which caught two real bugs — `node -p` cannot take a dynamic import
that way, and **`require('pg')` does not resolve from the repository root**, because pnpm
links a workspace dependency only into the package that declares it, so the step runs from
`apps/backend`. The deployed version stays uncompared, because comparing it needs Azure
credentials `pnpm verify` deliberately does not have.

**Confirmed on the runner rather than assumed.** The `database` job is green in **49 s**,
against `verify`'s 79 s and `e2e`'s 94 s, on a run where all three passed; its version step
printed `service reports: 18` against the pin, and the suite itself took **644 ms** there.
The ruleset was then updated and **re-read from the API**: ruleset `main` (id 22160620),
`enforcement: active`, required checks `['verify', 'e2e', 'database']`. That is platform
state no file in this tree can hold, so this paragraph and `CLAUDE.md` are its only durable
copy — and a future reader finding fewer than three should read it as a gate having been
removed rather than never set.

### The checksum gap: deliberately not closed, with the reasoning recorded

This suite migrates from **empty** every run, so it proves _these files produce this schema_
and structurally cannot prove _that database matches these files_ — only a stored hash could,
which Task 2.2.2 declined as a second bookkeeping mechanism with a bootstrap ordering
problem. What bounds the damage is that the divergence is confined to one developer's
laptop: CI and every deploy migrate from the same files into an empty database, so a
mismatch never reaches a shared environment, and the local recovery is
`pnpm db down -v && pnpm db && pnpm migrate`. **The reversal trigger is an environment where
dropping and re-migrating is not an option**, which is production from Task 2.2.7 onward.

### Task 2.1.2's trigger, re-taken by measurement

**It has still not fired.** `pnpm test` is **239** and exit 0 with the database **stopped**;
`pnpm verify` is exit 0 with it stopped. So `pnpm ready`'s third check stays a reporting
`○`, and the `e2e` job still needs no Postgres service. Measured rather than read, which is
how Task 2.1.4 answered the same question.

### Figures

`pnpm test:database` **23 tests, 431–579 ms**. `pnpm test` **239**, unchanged and needing no
database, no build and no socket. `pnpm verify` **exit 0** with and without a database.
Four lint errors were caught by `pnpm verify` on the first run and every one was this task's
own — including the `disableTypeChecked` entry the new config's own header had predicted it
would need.
