// `pnpm break <name>` — perform a documented break, prove it goes red, put the
// tree back (2026-09-14).
//
// ## Why this exists
//
// `CLAUDE.md`'s first corollary under *Measure rather than cite*:
//
// > **A break that does not go red is not evidence the check works** — it is
// > equally evidence the break did not land. Verify the substitution.
//
// That rule is honoured by hand: edit the file, run the scoped command, read
// the red, **revert**. `docs/GAPS.md` documents 56 such breaks. The fourth step
// is the dangerous one — a forgotten revert ships a deliberate break, and the
// tree it ships from looks exactly like a tree somebody was mid-edit in.
//
// So the revert stops being a step somebody remembers. It is wired to `exit`
// and to every signal that can reach a script from a terminal, the file is
// checksummed on the way in and on the way out, and the script refuses to start
// at all if the target has uncommitted changes — which is what makes "restore"
// a safe word rather than a gamble with work in progress.
//
// ## What a green run proves
//
// That the named substitution landed, that the command failed **with the named
// test among its failures**, and that the file came back byte-identical.
//
// ## What it does NOT prove
//
//   1. **That the check is checking the right thing.** A break going red says
//      the instrument is live, not that it is pointed at the property that
//      matters. That is a judgement, and it stays in the prose beside each
//      entry.
//   2. **That any OTHER break would go red.** One entry, one proof.
//   3. **That `SIGKILL` leaves the tree clean.** It cannot be handled, by
//      anyone. Measured on 2026-09-14 rather than assumed: `SIGINT` mid-run
//      restores the file cleanly, and `kill -9` mid-run leaves it broken.
//
//      What makes that survivable is that the damage is **loud rather than
//      silent** — the same run showed `git status` reporting the file modified
//      and `pnpm invariants` going red at `1 of 7 invariants failed`. Recovery
//      is one line, and for a break carrying `build` it is two:
//
//          git checkout -- <the file the entry names>
//          pnpm run build
//
//      This is the argument for the dirty-target refusal at the top of the run,
//      not an excuse for it: a `SIGKILL`ed break is exactly the state in which
//      somebody re-runs the command, and the refusal is what stops the second
//      run writing a broken file's text back as though it were the original.
//
// ## Why a registry rather than flags
//
// A break is a *claim about a specific edit*, and a claim belongs in the
// repository next to the thing it is about — not retyped at a prompt, where a
// typo produces a substitution that does not match, a command that passes, and
// a conclusion that the check is broken. The registry entries are reviewed like
// any other code.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";
import process from "node:process";

import { BREAKS } from "./breaks.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

/** The file this run has broken, so the exit handlers can put it back. */
let inFlight = null;

/**
 * Put the file back, however this process ends.
 *
 * The same shape as `heavy-job.mjs`'s `releaseLockOnExit()`, and for the same
 * reason: `exit` covers the ordinary path and every `process.exit()` below, the
 * three signals are the ones that actually reach a script from a terminal, and
 * each re-raises after cleaning up so the code a shell sees is still the
 * signal's.
 */
function restoreOnExit() {
  process.on("exit", restore);

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      restore();
      process.kill(process.pid, signal);
    });
  }
}

/** Write the original text back. Safe to call when nothing is broken. */
function restore() {
  if (inFlight === null) return;

  writeFileSync(inFlight.path, inFlight.original);
  inFlight = null;
}

const sha = (text) => createHash("sha256").update(text).digest("hex");

const name = process.argv[2];

if (name === undefined || name === "--help") {
  console.error(
    "pnpm break <name>\n\nBreaks this repository knows how to prove:\n",
  );

  for (const entry of BREAKS) {
    console.error(`  ${entry.name}`);
    console.error(`    ${entry.proves}\n`);
  }

  process.exit(name === undefined ? 1 : 0);
}

const entry = BREAKS.find((candidate) => candidate.name === name);

if (entry === undefined) {
  console.error(
    `No break called \`${name}\`. Run \`pnpm break\` with no arguments for the list.`,
  );
  process.exit(1);
}

const path = resolve(REPO_ROOT, entry.file);
const shown = relative(REPO_ROOT, path);

// Refuse on a dirty target. A restore writes the ORIGINAL text back, so a file
// with uncommitted changes would have them overwritten — by a script whose
// whole promise is that it is safe to run.
const status = spawnSync("git", ["status", "--porcelain", "--", path], {
  cwd: REPO_ROOT,
  encoding: "utf8",
});

if (status.status !== 0) {
  console.error(`Could not read git status for ${shown}.`);
  process.exit(1);
}

if (status.stdout.trim() !== "") {
  console.error(
    `${shown} has uncommitted changes.\n\n` +
      "This script restores the file by writing its original text back, which " +
      "would\ndiscard them. Commit or stash first.\n",
  );
  process.exit(1);
}

const original = readFileSync(path, "utf8");
const before = sha(original);

const occurrences = original.split(entry.find).length - 1;

if (occurrences !== 1) {
  console.error(
    `The substitution for \`${name}\` matches ${String(occurrences)} times in ` +
      `${shown}, not once.\n\n` +
      "A break has to land exactly where the entry says it does, or a green " +
      "run proves\nnothing. Update the entry in scripts/breaks.mjs.\n",
  );
  process.exit(1);
}

console.log(`Breaking ${shown}`);
console.log(`  ${entry.proves}\n`);

restoreOnExit();
inFlight = { path, original };
writeFileSync(path, original.replace(entry.find, entry.replace));

/**
 * Build the frontend, for the one break whose subject is `dist/`.
 *
 * Run twice for such a break — once to make the leak real, once after the
 * restore, so the next command does not read a polluted bundle and go red for a
 * reason that no longer exists.
 */
function rebuild(why) {
  console.log(`  $ pnpm run build   (${why})`);

  const built = spawnSync("pnpm", ["run", "build"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: process.env,
  });

  if (built.status !== 0) {
    console.error(`\nThe build failed while ${why}.\n`);
    console.error(`${built.stdout ?? ""}${built.stderr ?? ""}`.trimEnd());
    process.exit(1);
  }
}

if (entry.build === true) rebuild("making the break reach the bundle");

const [command, ...args] = entry.command;

console.log(`  $ ${entry.command.join(" ")}\n`);

const run = spawnSync(command, args, {
  cwd: REPO_ROOT,
  encoding: "utf8",
  env: process.env,
});

const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;

restore();

if (entry.build === true) rebuild("clearing the break out of the bundle");

const restored = sha(readFileSync(path, "utf8"));

// Report the restore FIRST and separately from the verdict. If the tree is
// wrong, that is the only thing that matters and it must not be buried under a
// test result.
if (restored !== before) {
  console.error(
    `\n${shown} did not come back byte-identical.\n\n` +
      `  before  ${before}\n  after   ${restored}\n\n` +
      `Recover with: git checkout -- ${shown}\n`,
  );
  process.exit(1);
}

if (run.status === 0) {
  console.error(
    `\n✗ The break did NOT go red.\n\n` +
      `\`${entry.command.join(" ")}\` passed with ${shown} broken, which means ` +
      "the check is\nnot watching what the entry claims it watches — or the " +
      "substitution no longer\nlands where it used to. Either way the guard is " +
      "not there.\n",
  );
  console.error(output.trimEnd());
  process.exit(1);
}

if (!output.includes(entry.expect)) {
  console.error(
    `\n✗ The break went red for the wrong reason.\n\n` +
      `Expected the output to mention:\n  ${entry.expect}\n\n` +
      "A command that fails for an unrelated reason is not evidence either.\n",
  );
  console.error(output.trimEnd());
  process.exit(1);
}

console.log(`✓ ${shown} broken → red → restored byte-identical.`);
console.log(`  matched: ${entry.expect}`);
