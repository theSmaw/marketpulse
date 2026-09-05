// `pnpm universe` (Task 2.3.5) — load the tracked universe into the configured
// database.
//
// **This file is a wrapper and not the loader**, which is the shape
// `scripts/run-migrations.mjs` already has and for its reasons. The mechanism is
// `apps/backend/src/load-universe.ts`, compiled by `tsc -b` like everything else
// in that package, so it is inside `pnpm verify`'s net — typechecked, linted
// under the full type-aware pass, formatted, and able to have tests. What is
// here is the three things a wrapper is for: a name, a message naming
// `pnpm build` when the tree is not built, and the exit code.
//
// **`universe` was checked against `pnpm help -a` before it was claimed**, the
// way `stories`, `env:check`, `ready`, `db`, `image`, `e2e` and `migrate` were:
// a root script shadows a built-in repository-wide, which was right for `clean`
// — whose built-in deletes `node_modules` — and would be wrong for anything
// useful. The detection was validated in the same run against six names known
// to be built-ins (`clean`, `test`, `start`, `config`, `env`, `deploy`), which
// is the only reason the claim is worth anything. `universe`, `seed` and `load`
// are all free; `universe` is the name because there is exactly one of them and
// naming the noun is what `pnpm db` already does.
//
// **It is a separate command rather than a phase of `pnpm migrate`.** The
// universe is a seed script and not a migration (Task 2.3.1,
// `apps/backend/migrations/README.md` §7), because the two mean different things
// by *idempotent*: a migration does nothing the second time, and this has to
// converge on the file. The cost of the separation is that a deploy has **two**
// things to remember rather than one, and that is Task 2.3.7's problem — stated
// here so that task meets it as a fact rather than a surprise.
//
// **It is not a `pnpm verify` step**, for the reason `ready` and `migrate` are
// not: `verify` runs with nothing listening and no database, which is Story
// 2.3's acceptance criterion 7 and has been measured at every clean-clone run
// since Story 2.1.
//
// Dependency-free itself, like the seven checks beside it.

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const LOADER = resolve(REPO_ROOT, "apps/backend/dist/load-universe.js");

// Arguments are refused rather than forwarded, following `pnpm migrate` rather
// than `pnpm db`. There is one operation and no options: the universe is
// whatever `apps/backend/src/universe.ts` says, and a `--only` or a `--dry-run`
// would be a second way to reach a database that the tests, the deploy and this
// file would then all have to agree about.
if (process.argv.length > 2) {
  console.error(
    "\n`pnpm universe` takes no arguments. It loads every security in\n" +
      "apps/backend/src/universe.ts, which is the one description of the universe, and\n" +
      "re-running it converges on that file rather than duplicating anything.\n",
  );
  process.exit(1);
}

// Presence, not freshness — Task 1.10.5's rule, arrived at by building a
// staleness check and removing it. `tsc -b` decides what to re-emit from the
// content hashes in `.tsbuildinfo`, so an mtime comparison fails a correct tree
// after a `git checkout` rewrites every source file's timestamp.
if (!existsSync(LOADER)) {
  console.error(
    `\nCannot read ${relative(REPO_ROOT, LOADER)} — run \`pnpm build\` first.\n`,
  );
  process.exit(1);
}

/** @type {{ loadUniverse: () => Promise<{ exitCode: 0 | 1, lines: readonly string[], errors: readonly string[] }> }} */
const { loadUniverse } = await import(LOADER);

const outcome = await loadUniverse();

for (const line of outcome.lines) {
  console.log(line);
}

for (const line of outcome.errors) {
  console.error(line);
}

// **The whole point of this file**, and the same point `run-migrations.mjs`
// makes: a program that reports a failure and exits 0 is worse than one that
// crashes. `loadUniverse` returns an exit code rather than calling
// `process.exit` itself so that it can be tested; this line is where that
// becomes a process result.
process.exit(outcome.exitCode);
