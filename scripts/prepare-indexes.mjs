// Build the indexes a migration cannot build inside its own transaction, and
// the reason is a measurement rather than a preference: `deploy.yml` gives
// `pnpm migrate` 120 s, and a unique index over `market_bars` is minutes on
// the deployed tier. See `apps/backend/src/prepare-indexes.ts`.
//
// A thin wrapper over the mechanism, exactly as `run-migrations.mjs` is over
// `migrate.ts`: the repository's rule is that a root script is a wrapper or a
// mechanism, never half of each.
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const RUNNER = resolve(REPO_ROOT, "apps/backend/dist/prepare-indexes.js");

if (process.argv.length > 2) {
  console.error(
    "\n`pnpm index:prepare` takes no arguments. It builds whichever prepared index is\n" +
      "missing and does nothing when they are all present.\n",
  );
  process.exit(1);
}

if (!existsSync(RUNNER)) {
  console.error(
    `\nCannot read ${relative(REPO_ROOT, RUNNER)} — run \`pnpm build\` first.\n`,
  );
  process.exit(1);
}

/** @type {{ prepareIndexes: () => Promise<{ exitCode: 0 | 1, lines: readonly string[], errors: readonly string[] }> }} */
const { prepareIndexes } = await import(RUNNER);

const outcome = await prepareIndexes();

for (const line of outcome.lines) console.log(line);
for (const line of outcome.errors) console.error(line);

process.exit(outcome.exitCode);
