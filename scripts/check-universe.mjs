// `pnpm universe:check` (Task 2.7.8) — compare the curated universe against
// what Alpaca currently lists, and change nothing.
//
// **A wrapper and not the check**, the shape `scripts/load-universe.mjs` and
// `scripts/run-migrations.mjs` already have: the mechanism is
// `apps/backend/src/check-universe.ts`, compiled by `tsc -b` so it is inside
// `pnpm verify`'s net — typechecked, linted under the full type-aware pass,
// formatted, and able to have tests. What is here is a name, a message naming
// `pnpm build`, and the exit code.
//
// **`universe:check` was checked against `pnpm help -a` before it was claimed**,
// and the detection was validated in the same run against six names known to be
// built-ins (`clean`, `test`, `start`, `config`, `env`, `deploy`) — which is the
// only reason the claim is worth anything. A first attempt using `pnpm help
// <name>`'s output reported `clean` free and the shipping `universe` script
// taken, so it was thrown away: an unvalidated detector is worse than none.
//
// **It is NOT a `pnpm verify` step and it never can be.** `verify` runs with no
// network and no credential — Story 2.7's acceptance criterion 7 — and this
// needs both. The `:check` suffix it shares with `env:check` and `format:check`
// names the kind of thing it is, not where it runs.
//
// **It is separate from `pnpm universe` rather than a flag on it.** That command
// refuses arguments deliberately, and more importantly it *writes rows*: a
// read-only command that reads a vendor must not be one typo away from the one
// that changes the database.
//
// Dependency-free itself, like the eight checks beside it.

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const CHECK = resolve(REPO_ROOT, "apps/backend/dist/check-universe.js");

if (process.argv.length > 2) {
  console.error(
    "\n`pnpm universe:check` takes no arguments. It compares every security in\n" +
      "apps/backend/src/universe.ts against Alpaca's asset catalogue and writes nothing.\n",
  );
  process.exit(1);
}

// Presence, not freshness — Task 1.10.5's rule.
if (!existsSync(CHECK)) {
  console.error(
    `\nCannot read ${relative(REPO_ROOT, CHECK)} — run \`pnpm build\` first.\n`,
  );
  process.exit(1);
}

/** @type {{ checkUniverse: () => Promise<{ exitCode: 0 | 1, lines: readonly string[], errors: readonly string[] }> }} */
const { checkUniverse } = await import(CHECK);

const outcome = await checkUniverse();

for (const line of outcome.lines) console.log(line);
for (const line of outcome.errors) console.error(line);

// The exit code answers "did the check run", never "did it find something" —
// see `summariseUniverseCheck`.
process.exit(outcome.exitCode);
