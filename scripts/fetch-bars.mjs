// `pnpm bars` (Task 2.7.3) — fetch one symbol's bars from Alpaca and print them.
//
// **A wrapper and not the client**, which is `scripts/run-migrations.mjs` and
// `scripts/load-universe.mjs`'s shape and for their reasons. The mechanism is
// `apps/backend/src/fetch-bars.ts`, compiled by `tsc -b` like everything else in
// that package, so it is inside `pnpm verify`'s net — typechecked, linted under
// the full type-aware pass, formatted, and able to have tests. What is here is
// the three things a wrapper is for: a name, a message naming `pnpm build` when
// the tree is not built, and the exit code.
//
// **`bars` was checked against `pnpm help -a` before it was claimed**, the way
// `stories`, `env:check`, `ready`, `db`, `image`, `e2e`, `migrate` and
// `universe` were: a root script shadows a built-in repository-wide, which was
// right for `clean` — whose built-in deletes `node_modules` — and would be wrong
// for anything useful. The detection was validated in the same run against five
// names known to be built-ins (`clean`, `test`, `start`, `config`, `env`), which
// it correctly identified, and that is the only reason the claim is worth
// anything. `bars` is free.
//
// **Arguments ARE forwarded here, unlike `pnpm migrate` and `pnpm universe`.**
// Those two have exactly one operation over one description of the world, so an
// option would be a second way to reach a database that the tests, the deploy
// and the wrapper would all then have to agree about. This one asks a question,
// and a question with no subject is not a question — so the symbol, the
// timeframe and the adjustment are arguments and the parsing is in the module,
// where it is typechecked and testable.
//
// **It is not a `pnpm verify` step**, for the reason `ready`, `migrate` and
// `universe` are not — and more strongly than any of them, because this one
// makes a metered request to a third party against a real credential. `verify`
// runs with no network, which is Story 2.7's acceptance criterion 7.

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const COMMAND = resolve(REPO_ROOT, "apps/backend/dist/fetch-bars.js");

// Presence, not freshness — Task 1.10.5's rule, arrived at by building a
// staleness check and removing it. `tsc -b` decides what to re-emit from the
// content hashes in `.tsbuildinfo`, so an mtime comparison fails a correct tree
// after a `git checkout` rewrites every source file's timestamp.
if (!existsSync(COMMAND)) {
  console.error(
    `\nCannot read ${relative(REPO_ROOT, COMMAND)} — run \`pnpm build\` first.\n`,
  );
  process.exit(1);
}

/** @type {{ fetchBarsCommand: (argv: readonly string[]) => Promise<{ exitCode: 0 | 1, lines: readonly string[], errors: readonly string[] }> }} */
const { fetchBarsCommand } = await import(COMMAND);

const outcome = await fetchBarsCommand(process.argv.slice(2));

for (const line of outcome.lines) {
  console.log(line);
}

for (const line of outcome.errors) {
  console.error(line);
}

// **The whole point of this file**, and the same point `run-migrations.mjs`
// makes: a program that reports a failure and exits 0 is worse than one that
// crashes. `fetchBarsCommand` returns an exit code rather than calling
// `process.exit` itself so that it can be tested; this line is where that
// becomes a process result.
process.exit(outcome.exitCode);
