// Compute and store the 60-session distribution of 5-minute returns, per
// security. See `apps/backend/src/compute-baselines.ts` for where this runs and
// why it is not a timer in the backend process, and
// `docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md`
// for the decision.
//
// **The table this writes is DERIVED and recomputable**, which is what makes
// this command safe to re-run: a generation that already exists is updated
// rather than appended, so the pass converges on the store the way
// `pnpm universe` converges on the file.
//
// A thin wrapper over the mechanism, exactly as `prepare-indexes.mjs` is over
// `prepare-indexes.ts`: the repository's rule is that a root script is a
// wrapper or a mechanism, never half of each.
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const RUNNER = resolve(REPO_ROOT, "apps/backend/dist/compute-baselines.js");

if (process.argv.length > 2) {
  console.error(
    "\n`pnpm baselines` takes no arguments. The window it computes over is read from\n" +
      "`bar_coverage` — the last session the backfill has COMPLETED — rather than from\n" +
      "a flag, because those two disagree between the bell and the nightly run and the\n" +
      "disagreement is invisible in the stored row.\n",
  );
  process.exit(1);
}

if (!existsSync(RUNNER)) {
  console.error(
    `\nCannot read ${relative(REPO_ROOT, RUNNER)} — run \`pnpm build\` first.\n`,
  );
  process.exit(1);
}

/** @type {{ computeBaselines: () => Promise<{ exitCode: 0 | 1, lines: readonly string[], errors: readonly string[] }> }} */
const { computeBaselines } = await import(RUNNER);

const outcome = await computeBaselines();

for (const line of outcome.lines) console.log(line);
for (const line of outcome.errors) console.error(line);

process.exit(outcome.exitCode);
