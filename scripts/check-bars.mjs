// `pnpm bars:check` (Task 2.8.7) — what the store holds, what it does not, and why.
//
// **A wrapper and not the check**, which is the shape `run-migrations.mjs`,
// `load-universe.mjs`, `check-universe.mjs`, `fetch-bars.mjs` and
// `run-backfill.mjs` already have and for their reasons. The mechanism is
// `apps/backend/src/check-bars.ts` over `apps/backend/src/bar-completeness.ts`,
// compiled by `tsc -b` like everything else in that package, so it is inside
// `pnpm verify`'s net — typechecked, linted under the full type-aware pass,
// formatted, and able to have tests. What is here is a name, a message naming
// `pnpm build` when the tree is not built, and **the exit code**.
//
// **`bars:check` was checked against `pnpm help -a` before it was claimed**, and
// the detection was validated in the same run against six names known to be
// built-ins (`clean`, `test`, `start`, `config`, `env`, `run`) — which is the
// only reason the claim is worth anything, after a detector at Task 2.7.8
// failed its own control and had to be thrown away. `bars:check`, `coverage:check`
// and `store:check` are all free.
//
// The `:check` suffix names the KIND of thing this is — compare two descriptions
// and report the drift — rather than where it runs, exactly as `env:check`,
// `format:check` and `universe:check` do.
//
// **It is not a `pnpm verify` step and it never can be.** `verify` runs with no
// database, which is measured at every clean-clone run since Story 2.1 and is
// acceptance criterion 9. It is not a step in `deploy.yml` either: a report
// whose output is a person's decision has nothing to gate.
//
// **A finding does not change the exit code**, which is `check-universe.mjs`'s
// rule and `/diagnostics/database`'s before it: the exit code answers *did the
// check run*. That is also what stops somebody wiring this into CI, where it
// would go red on a thin security having a quiet Tuesday.
//
// Dependency-free itself, like the eight checks beside it.

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const CHECK = resolve(REPO_ROOT, "apps/backend/dist/check-bars.js");

// Presence, not freshness — Task 1.10.5's rule, arrived at by building a
// staleness check and removing it.
if (!existsSync(CHECK)) {
  console.error(
    `\nCannot read ${relative(REPO_ROOT, CHECK)} — run \`pnpm build\` first.\n`,
  );
  process.exit(1);
}

/** @type {{ checkBarsCommand: (argv: readonly string[]) => Promise<{ exitCode: 0 | 1, lines: readonly string[], errors: readonly string[] }> }} */
const { checkBarsCommand } = await import(CHECK);

const outcome = await checkBarsCommand(process.argv.slice(2));

for (const line of outcome.lines) {
  console.log(line);
}

for (const line of outcome.errors) {
  console.error(line);
}

process.exit(outcome.exitCode);
