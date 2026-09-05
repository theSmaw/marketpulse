// `pnpm migrate` (Task 2.2.2) — bring the configured database up to the latest
// migration.
//
// **This file is a wrapper and not the runner.** The mechanism is
// `apps/backend/src/migrate.ts`, compiled by `tsc -b` like everything else in
// that package, so it is inside `pnpm verify`'s net — typechecked, linted under
// the full type-aware pass, formatted, and able to have tests. What is here is
// the three things a wrapper is for: a name (`pnpm migrate`, acceptance
// criterion 1, and Story 1.10's rule that the pipeline must not define its own
// database steps), a message naming `pnpm build` when the tree is not built,
// and the exit code.
//
// **`migrate` was checked against `pnpm help -a` before it was claimed**, the
// way `stories`, `env:check`, `ready`, `db`, `image` and `e2e` were: a root
// script shadows a built-in repository-wide, which was right for `clean` — whose
// built-in deletes `node_modules` — and would be wrong for anything useful. The
// detection was validated in the same run against six names known to be
// built-ins (`clean`, `test`, `start`, `config`, `env`, `deploy`), which is the
// only reason the claim is worth anything. `migrate` and `migrations` are both
// free.
//
// **It is not a `pnpm verify` step**, for the reason `ready` is not: `verify`
// runs with nothing listening and no database, which is acceptance criterion 7
// and has been measured at every clean-clone run since Story 2.1. A migration
// needs a database by definition.
//
// Dependency-free itself, like the six checks beside it.

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const RUNNER = resolve(REPO_ROOT, "apps/backend/dist/migrate.js");

// Arguments are refused rather than forwarded, which is the opposite of
// `pnpm db`'s decision and is deliberate. `pnpm db` wraps `docker compose`,
// which has a large useful command surface; this wraps one operation, because
// migrations are **forward-only** — there is no `down`, no `migrate to 0003`
// and no `redo`. Silently ignoring `pnpm migrate down` would be the worst of
// the three options available: it would run `migrateToLatest` and report
// success.
if (process.argv.length > 2) {
  console.error(
    "\n`pnpm migrate` takes no arguments. Migrations are forward-only: it applies every\n" +
      "migration the database has not seen, in order, and there is deliberately no `down`.\n" +
      "The answer to a migration you regret is a new forward migration.\n",
  );
  process.exit(1);
}

// Presence, not freshness — Task 1.10.5's rule, arrived at by building a
// staleness check and removing it. `tsc -b` decides what to re-emit from the
// content hashes in `.tsbuildinfo`, so an mtime comparison fails a correct tree
// after a `git checkout` rewrites every source file's timestamp. `pnpm verify`
// orders the build; this only has to say something better than a resolver
// stack. Note the trap `scripts/run-deployed-check.mjs` records beside its own
// version of this guard: deleting `dist/` by hand and leaving
// `tsconfig.tsbuildinfo` makes `tsc -b` emit nothing at all, so the suggested
// fix silently does nothing there and `pnpm clean` is what is needed.
if (!existsSync(RUNNER)) {
  console.error(
    `\nCannot read ${relative(REPO_ROOT, RUNNER)} — run \`pnpm build\` first.\n`,
  );
  process.exit(1);
}

/** @type {{ runMigrations: () => Promise<{ exitCode: 0 | 1, lines: readonly string[], errors: readonly string[] }> }} */
const { runMigrations } = await import(RUNNER);

const outcome = await runMigrations();

for (const line of outcome.lines) {
  console.log(line);
}

for (const line of outcome.errors) {
  console.error(line);
}

// **The whole point of this file.** Kysely's `migrateToLatest()` does not throw
// — it resolves to `{ error, results }` — so a node process that ran a failed
// migration exits 0 unless something reads that and says otherwise. Task 2.2.1
// produced the same failure from the other side, in a hand-rolled runner that
// printed `applied 0002_partial.sql` at exit 0 over a database whose tables did
// not exist. `summariseMigration` is where the reading happens and is unit
// tested; this line is where it becomes a process result.
process.exit(outcome.exitCode);
