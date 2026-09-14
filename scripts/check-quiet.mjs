// `pnpm verify`'s first step: is anything else heavy already running here?
// (2026-09-14)
//
// One step, and it is the smallest thing that could be added to `verify` —
// which matters, because `CLAUDE.md`'s founding rule for the pipeline is that
// CI runs `pnpm verify` **by name** and defines no step of its own. Anything
// added to that chain runs on the runner too.
//
// Hence the first line of the body: on CI this exits 0 before doing anything.
// A runner is a dedicated machine, the guard has nothing to catch there, and a
// stale lock file that somehow reached a checkout would be a broken gate rather
// than a slow one. The bypass is the half a green local run does not exercise,
// so it is verified by running `CI=1 pnpm verify` rather than reasoned about.
//
// It refuses on the lock and only warns on load, and the asymmetry is the
// point. The lock is a fact about this repository — something here took it, and
// this script knows what and when. The load average is a fact about the
// machine, and most of what is on it is not ours: refusing on somebody's video
// call would be a gate that gets worked around within a day, and a guard people
// route around is worse than none.

import process from "node:process";

import { loadRatio, lockHolder } from "./heavy-job.mjs";

// A dedicated runner. Nothing to guard, and a stale lock here would be a gate
// that fails for a reason no reader could act on.
if (process.env.CI !== undefined) {
  process.exit(0);
}

const held = lockHolder();

if (held !== null) {
  console.error(
    `\`pnpm verify\` will not start: \`${held.job}\` has been running here since ` +
      `${new Date(held.startedAt).toLocaleTimeString()} (pid ${String(held.pid)}).\n\n` +
      "This is not about being polite to the other job — it is about believing its result.\n" +
      "A browser suite sharing a machine with a build fails a different random set of tests\n" +
      "each time, and every one of those failures looks like a product defect. Measured on\n" +
      "2026-09-14: 6, 16, 10 and 1 failures across four runs of unchanged code.\n\n" +
      "Wait for it to finish, or stop it.\n",
  );
  process.exit(1);
}

// **A warning and never a refusal** — see the header. The threshold is 0.7 of
// the core count: high enough that an editor, a language server and a dev
// server do not trip it, low enough to fire before a suite starts losing tests
// to 30-second timeouts. The session that prompted this ran at a ratio of 3.
const { ratio, cores } = await loadRatio();

if (ratio > 0.7) {
  console.warn(
    `⚠ This machine's one-minute load average is ${(ratio * cores).toFixed(1)} across ` +
      `${String(cores)} cores.\n` +
      "  Nothing in this repository is holding the lock, so whatever it is belongs to the\n" +
      "  rest of the machine. Results will be slow and, if this is a browser run, unreliable.\n",
  );
}
