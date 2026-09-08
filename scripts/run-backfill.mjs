// `pnpm backfill` (Task 2.8.6) — fetch historical bars and store them.
//
// **A wrapper and not the backfill**, which is the shape
// `scripts/run-migrations.mjs`, `scripts/load-universe.mjs` and
// `scripts/fetch-bars.mjs` already have and for their reasons. The mechanism is
// `apps/backend/src/backfill.ts`, compiled by `tsc -b` like everything else in
// that package, so it is inside `pnpm verify`'s net — typechecked, linted under
// the full type-aware pass, formatted, and able to have tests. What is here is
// the four things a wrapper is for: a name, a message naming `pnpm build` when
// the tree is not built, **the exit code**, and the signal handling.
//
// **`backfill` was checked against `pnpm help -a` before it was claimed**, the
// way `stories`, `env:check`, `ready`, `db`, `image`, `e2e`, `migrate`,
// `universe` and `bars` were: a root script shadows a built-in
// repository-wide, which was right for `clean` — whose built-in deletes
// `node_modules` — and would be wrong for anything useful. The detection was
// validated in the same run against five names known to be built-ins (`clean`,
// `test`, `start`, `config`, `env`, `deploy`), which is the only reason the
// claim is worth anything. `backfill`, `ingest` and `fill` are all free.
//
// **It is not a `pnpm verify` step, and more firmly than `migrate` is not.**
// `verify` runs with no network, no credential and no database; this makes
// **metered** requests against a real Alpaca key. It is also not a step in
// `deploy.yml`, unlike `pnpm migrate` and `pnpm universe`: Story 2.8's open
// decision 4 settled the initial backfill as a local command against the
// deployed database, because a one-off of hours and a repeated job of minutes
// are different shapes and deciding them together is how the one-off ends up in
// the pipeline.
//
// Dependency-free itself, like the eight checks beside it.

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const BACKFILL = resolve(REPO_ROOT, "apps/backend/dist/backfill.js");

// Presence, not freshness — Task 1.10.5's rule, arrived at by building a
// staleness check and removing it.
if (!existsSync(BACKFILL)) {
  console.error(
    `\nCannot read ${relative(REPO_ROOT, BACKFILL)} — run \`pnpm build\` first.\n`,
  );
  process.exit(1);
}

/** @type {{ backfillCommand: (argv: readonly string[], options?: object) => Promise<{ exitCode: 0 | 1, lines: readonly string[], errors: readonly string[] }> }} */
const { backfillCommand } = await import(BACKFILL);

// **Ctrl-C finishes the request in flight rather than abandoning it**, which is
// `index.ts`'s drain shape applied to a command. A request already sent has
// already been paid for against a metered budget, and abandoning it wastes it
// *and* leaves the ledger one session further behind than it needs to be. A
// second Ctrl-C exits immediately, because somebody pressing it twice means it.
let stopping = false;
process.on("SIGINT", () => {
  if (stopping) {
    console.error("\nStopping now.");
    process.exit(130);
  }
  stopping = true;
  console.error(
    "\nFinishing the request in flight, then stopping. Ctrl-C again to stop now.",
  );
});

const outcome = await backfillCommand(process.argv.slice(2), {
  shouldStop: () => stopping,
});

for (const line of outcome.lines) {
  console.log(line);
}

for (const line of outcome.errors) {
  console.error(line);
}

// The whole point of this file, and the same point `run-migrations.mjs` makes:
// a program that reports a failure and exits 0 is worse than one that crashes.
process.exit(outcome.exitCode);
