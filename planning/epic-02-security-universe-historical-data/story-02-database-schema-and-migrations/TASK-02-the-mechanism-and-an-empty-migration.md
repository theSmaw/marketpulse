# Task 2.2.2 — Install the mechanism and make an empty migration real

**Status:** Complete — 2026-09-05
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Task 2.2.1 (complete) — the tool is **Kysely's `Migrator`** driving plain
SQL files through a provider we own, migrations are **forward-only**, nothing is generated,
and **`pg` and `database.ts` survive unchanged**. The measurements and the arguments are in
[`DATA-LAYER.md`](DATA-LAYER.md); read it before starting, because three of the bullets below
are answers it produced rather than questions still open

## Objective

Get the chosen mechanism into the tree and prove it works end to end against the local
database — with a migration that creates **nothing**. The first real table is Task 2.2.4's;
this task is about the machinery, and separating the two means a failure has one cause.

## Work

- **Install exactly what Task 2.2.1 chose**, and re-take the figures against the shipping
  tree rather than citing the spike's — Story 1.13 did this twice and both times the
  install reproduced to the byte, which is what makes the re-take a check rather than a
  formality — the spike's figures to reproduce are **+1 store entry, +3,444 KB and +9
  lockfile lines**, against a baseline of 418 / 291,912 KB / 4,757. Re-run the install-script
  sweep against the installed store, and **count its lines rather than reading it as a
  binary**: Task 2.2.1 found that `allowBuilds` is keyed on a package **name** rather than a
  version, so a candidate dragging in a second `esbuild` major runs a second install script
  with nothing firing and nothing warning
- **Decide where migrations live and make the answer structural.** The plausible homes are
  `apps/backend/migrations/`, a top-level `migrations/`, or a fifth workspace package. The
  question that decides it is which tool needs to _read_ them and which package's
  dependency the runner is: a directory outside every workspace package is the shape
  `e2e/` was refused as, and Task 1.13.1 found out expensively that a bare root-level
  directory fails twice — `TS1295`, because the nearest `package.json` is the root's, and
  `MODULE_NOT_FOUND` on `@marketpulse/shared`, because pnpm links a workspace package only
  into packages that declare it
- **Fix the naming and ordering rule, and pick the one whose failure is loud.** A
  timestamp prefix and a sequence number differ in exactly one way that matters: two
  developers on two branches. A sequence number **collides**, which is a merge conflict —
  loud, and resolved before it reaches a database. A timestamp **interleaves**, which
  applies in an order neither author tested and nothing complains. Say which is chosen and
  what happens on the case that breaks it
- **The runner must read `{ error }` and exit non-zero itself, and it must be made to fail
  once before anything here is called working.** This is the sharpest thing Task 2.2.1 handed
  over and it is a property of the code this task writes rather than of the library.
  `migrateToLatest()` **resolves** to `{ error, results }` rather than throwing: measured, a
  migration that failed and rolled back left `results` reading `status: "Error"` and **the
  node process exited 0**. A wrapper that does not check `error` is a green migration step
  that applied nothing — and Task 2.2.1 produced exactly that bug in a hand-rolled runner,
  which printed `applied 0002_partial.sql` at exit 0 over a database whose tables did not
  exist. Task 2.2.6 sweeps every failure class; this task owes the one check that stops the
  mechanism being born broken
- **The root script is `pnpm migrate` and the pipeline never defines its own steps.** Check
  the name against `pnpm help -a` before claiming it — `clean`, `env`, `config`, `start`
  and `test` are all built-ins, and a root script shadows a built-in repository-wide, which
  was right for `clean` and would be wrong here. Validate the detection in the same run
  against a name you know is a built-in, which is the check Tasks 1.9.5, 1.11.2 and 2.1.2
  each did and which is the only reason the claim is worth anything
- **Whatever the script needs to know about the database, it reads from one place.** The
  address, the credentials and the database name come from `apps/backend`'s built
  `dist/config.js`, exactly as `scripts/local-database.mjs` and `scripts/pair-addresses.mjs`
  do. A migration runner with its own copy of the connection settings has forked the
  definition of where the database is on day one — and it has to work under **both**
  `DATABASE_AUTH` modes, because deployed there is no password to put in a URL. Task 2.2.7
  is where that bites; getting the shape right here is what makes it a non-event
- **The `Migrator` needs a `Kysely` instance, so this task creates the first one — decide
  where it lives and do not export it.** Task 2.2.1 chose Kysely as the query layer as well
  as the migrator, and the whole of that decision's value rests on one mechanism: the
  temporal-isolation plugin is attached with `withPlugin`, so the isolated handle and the raw
  one are **different objects**, and Epic 13's seam holds only if there is no unplugged handle
  to import. The cheap and probably right answer is that the instance lives **inside the
  migration runner and nowhere else** and `database.ts` gains nothing at all — Story 2.2
  ships no route and no read, so the first `selectFrom` is Story 2.9's. Say which; and if a
  handle does reach `database.ts`, the comment beside it is the mechanism rather than a line
  in a document
- **Run an empty migration against the local database and then run it again.** Applying it
  twice is a no-op is acceptance criterion 2 and it is cheap to assert now, on a mechanism
  with nothing in it. Read the tracking table by hand afterwards and record what it holds.
  **The checksum half of that is already answered, and it is a decision rather than an
  observation now**: `kysely_migration` is `(name, timestamp)` and nothing more — read out of
  `information_schema` by Task 2.2.1 — so **there is no checksum**, and a migration file
  edited after it was applied is skipped silently while the database diverges from the file
  that claims to describe it. Two answers are available and this task picks one: a second
  table the provider writes beside Kysely's, or leave the gap and let Task 2.2.5 close it
  from `information_schema`. The second is this repository's own stated rule — a test beats
  another `verify` step when the thing being checked is reachable from an assembled instance
  — and it is the recommendation, but it is only honest if 2.2.5 is actually told
- **State which of the new files `pnpm verify` reads and which it does not.** Task 2.2.1
  settled that migrations are **SQL files rather than TypeScript**, because a `.sql` file is
  reviewable as the thing that will run where a TypeScript migration compiles into `dist/`
  and the artefact reviewed is not the artefact executed. So this is certain rather than
  conditional now: a `.sql` file is read by nothing here — not Prettier, not ESLint, not
  `tsc` — and the mechanism adds a **sixth** kind to `CLAUDE.md`'s gap list, with the entry
  belonging in this task rather than being discovered in Story 2.8. Take the reading with `prettier --file-info` and
  `eslint` on a real file rather than assuming it, which is the one-liner that has caught
  this list drifting every time it has been re-run
- **`pnpm verify` still passes with no database running**, which is criterion 7, and it is
  measured here as well as at the close because this is the task that could break it

## Done when

- The mechanism is installed with its cost re-measured against the shipping tree
- Migrations have a home, a naming rule and an ordering rule, each with its reason
- `pnpm migrate` exists, is checked against `pnpm help -a`, and defines the database's
  address nowhere of its own
- The runner propagates a failure that arrives as a **return value rather than a throw**,
  seen to exit non-zero rather than assumed to
- An empty migration applies, and applying it twice is a no-op — both observed
- The tracking table's contents are recorded, and the checksum gap is either closed here or
  explicitly handed to Task 2.2.5
- Where the `Kysely` instance lives is decided, and no unplugged handle is exported
- Any new file outside `pnpm verify`'s net is in the gap list with its reason
- `pnpm verify` is exit 0 with no database running

## Notes

This task deliberately ships no table. Task 1.11.2's lesson is the one it is built on: the
artefact was run outside the workspace before any platform saw it, because "a platform
failing on an artefact that was never correct is the most expensive failure to read". A
migration mechanism whose first migration is also its first schema is exactly that
artefact.

## What was done

The record with the figures is [`DATA-LAYER.md`](DATA-LAYER.md) under _The mechanism, as
built_, because Story 2.2 has one document about this subject and a second one is a copy
waiting to disagree. What follows is what changed and the decisions behind it.

**Four new files and one new root script.** `apps/backend/src/migrate.ts` is the mechanism —
the provider, the summariser and `runMigrations()`; `apps/backend/src/migrate.test.ts` is ten
fast tests; `apps/backend/migrations/0001_baseline.sql` is a migration that creates nothing;
`scripts/run-migrations.mjs` is the wrapper `pnpm migrate` names. `apps/backend/src/database.ts`
gained **nothing at all**, which is the check rather than an omission.

**The install reproduced the spike to the byte** — 418 → **419** store entries, 291,912 →
**295,356 KB**, 4,757 → **4,766** lockfile lines, `pnpm-workspace.yaml` md5 unchanged — taken
from a fresh install, because a virtual-store count is only comparable that way. The
install-script sweep returns **one line**, counted rather than read as a binary, since 2.2.1
found `allowBuilds` is keyed on a package name.

**Migrations live in `apps/backend/migrations/`, named `NNNN_lower_snake_case.sql`.** The home
is forced rather than preferred: a bare top-level directory fails the two ways Task 1.13.1
measured, a fifth workspace package would have one consumer, and `apps/backend` is the only
thing here that connects to a database. The naming rule is a **sequence number and not a
timestamp**, chosen on which failure is loud — a sequence collides into a merge conflict a
human resolves in the pull request, a timestamp interleaves silently into an order neither
author tested — with Kysely's default `allowUnorderedMigrations: false` as the backstop at
the database. A filename that does not match is an **error rather than a skipped file**, and
so is an empty directory.

**The exit code was made to fail before the mechanism was called working**, which was 2.2.1's
sharpest handover. `migrateToLatest()` resolves rather than throwing, so `summariseMigration()`
is a pure function with its own tests and `run-migrations.mjs` turns its `exitCode` into a
process result. Four failing paths were produced against the local database — a unique-constraint
violation, a refused filename, a stopped database and `pnpm migrate down` — all exit **1**;
and three deliberate breaks were each seen to fail and reverted. The second break is the one
worth remembering: reading `results` for a `status: "Error"` **instead of** reading `error`
catches the ordinary case and misses the whole class where Kysely fails before working out
what to run.

**The empty migration applied, and applying it twice is a no-op** — both observed, exit 0 both
times, with the tracking table read by hand afterwards: `kysely_migration` is
`(name, timestamp)` where `timestamp` is a **`character varying` holding an ISO 8601 string**,
plus `kysely_migration_lock`. **There is no checksum, and it is deferred to Task 2.2.5**, whose
task file now says so definitely rather than conditionally, with the rejected alternative — a
second table the provider writes inside the migration's own transaction — recorded there
alongside the one argument that would reverse it.

**The `Kysely` instance is built inside the runner and is not exported**, which is the whole of
2.2.1's query-layer decision: Epic 13's plugin is attached with `withPlugin` and returns a
different object, so the seam holds only if no unplugged handle can be imported.

**A sixth kind of `pnpm verify` gap**, measured with the one-liner rather than assumed: a
`.sql` file reports `"inferredParser": null` to Prettier and `File ignored because no matching
configuration was supplied` to ESLint — the signature `scripts/dev.sh`, the `Dockerfile` and
the root `.dockerignore` carry. It is in `CLAUDE.md`'s gap list. The runner and its wrapper are
**inside** the net, which is why the mechanism is TypeScript in `src/` behind a thin wrapper
rather than a script.

**`pnpm verify` is exit 0 in 26.16 s with the database stopped**, and `pnpm test` is **239**
(37 + **99** + 103), still needing no database, no build and no socket. Task 2.1.2's stated
trigger for `pnpm ready`'s third check becoming a gate has **not** fired.

**One thing handed to Task 2.2.7 rather than left to be discovered:**
`apps/backend/package.json`'s `files` field means the container image does not carry
`apps/backend/migrations/`, which is the fact that decides between a step in `deploy.yml` and a
job the container runs at boot.

**And one correction to 2.2.1's record:** the migrator's separate subpath export is worse at
compile time than at run time. `import { Migrator } from "kysely"` is the `SyntaxError` 2.2.1
recorded, but the root package still exports the _names_ as
`KyselyTypeError<"import from 'kysely/migration' instead">` stubs, so the mistake first
arrives as a confusing type rather than a missing one.

**Two things went red that this task did not set out to touch, both in
`apps/backend/src/index.process.test.ts`, and only one of them was diagnosed.** The
reachability test used a fixed `await delay(200)` before asserting a record that requires a
real connection when a database is up; it lost that race once under full-chain load and
**polls now**, made to fail first. The drain-ordering test failed once with
`expected 4 to be greater than 7` — an ordering the process cannot produce — and did **not**
reproduce in five further runs or under eight CPU-saturating background processes. It is left
open with the numbers written down and the suspicion named (the harness concatenates `stdout`
and `stderr` into one buffer), because inventing a fix for a mechanism nobody has reproduced
is worse than recording it.
