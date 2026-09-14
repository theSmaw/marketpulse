// One lock, so that two heavy jobs cannot run at once (2026-09-14).
//
// ## What this is for, which is not tidiness
//
// `e2e/playwright.config.ts` sets `retries: 0` and argues it: *a retry is how a
// suite stops being able to tell a flake from a defect, and this repository has
// never once responded to a failure by re-running it.* That argument only holds
// while a red run means a defect — and under load it does not.
//
// Measured on 2026-09-14, four runs of **unchanged code**: 6 failures, then 16,
// then 10, then 1. Two of those runs had `pnpm verify` and `pnpm format` going
// beside them. Every failure carried a real assertion message and a screenshot,
// and the one that survived to the quiet run was a spec that times out at 30 s
// under load and passes in **7.6 s** alone.
//
// That is the worst shape a failure can have: it is not flaky-looking, it names
// a different set of tests each time, and triaging it costs more than the run
// did. The session that found this spent **13.8 minutes** on two runs that
// measured nothing but the machine.
//
// So the lock is not about throughput. It is what keeps "red means broken"
// true, which is the thing `retries: 0` is defending.
//
// ## What it can and cannot see
//
// It sees a second heavy job **started from this repository**, because that is
// the one this repository can do something about. It cannot see the rest of the
// machine — a build in another checkout, somebody's browser, a video call — and
// nothing here pretends otherwise. `check-quiet.mjs` reports the load average
// beside it for exactly that reason, as a warning rather than a refusal.
//
// ## Why a pid file rather than a directory or an OS lock
//
// A lock has to survive the thing that takes it being killed, and the only
// robust signal for *is the holder still alive* that needs no cooperation from
// the holder is its pid. `process.kill(pid, 0)` throws `ESRCH` for a pid that
// is gone, which is the whole staleness check — and it matters, because a suite
// interrupted with Ctrl-C is a routine event here and a lock that outlived it
// would be worse than no lock at all.
//
// The pid can in principle be reused by an unrelated process, which would make
// a stale lock look live. The cost of that is one confusing refusal that
// `--anyway` clears, against the cost of a stale lock blocking every run until
// somebody finds the file. Taken deliberately.

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const REPO_ROOT = resolve(import.meta.dirname, "..");

/**
 * The lock's home.
 *
 * At the repository root rather than in a temporary directory, because a lock
 * in `/tmp` is shared between checkouts and this one is deliberately not: two
 * worktrees of this repository are two pairs on two ports, and there is nothing
 * wrong with running a suite in each. `.claude/worktrees/` makes that a real
 * arrangement here rather than a hypothetical one.
 */
export const LOCK_PATH = resolve(REPO_ROOT, ".heavy-job.lock");

/**
 * Who holds the lock, or `null` if nobody does.
 *
 * A lock whose holder is gone is reported as `null` and deleted, so a killed
 * run does not block the next one. A lock file that cannot be parsed is treated
 * the same way: it is a file this repository wrote, so anything unreadable in
 * it is damage rather than a holder.
 */
export function lockHolder() {
  let raw;

  try {
    raw = readFileSync(LOCK_PATH, "utf8");
  } catch {
    return null;
  }

  let held;

  try {
    held = JSON.parse(raw);
  } catch {
    releaseLock();
    return null;
  }

  if (!isAlive(held.pid)) {
    releaseLock();
    return null;
  }

  return held;
}

/**
 * Take the lock, or describe who has it.
 *
 * Returns `{ ok: true }` or `{ ok: false, message }` rather than throwing or
 * exiting, which is `resolvePairAddresses()`'s shape and is the one the callers
 * here already know: a script decides what a refusal reads like, and a module
 * that exits takes that decision away from it.
 */
export function acquireLock(job) {
  const held = lockHolder();

  if (held !== null) {
    return {
      ok: false,
      message:
        `\`${job}\` will not start: \`${held.job}\` has been running here since ` +
        `${new Date(held.startedAt).toLocaleTimeString()} (pid ${String(held.pid)}).\n\n` +
        "Two heavy jobs at once is how a browser run fails a different random set of tests\n" +
        "each time, with every failure looking like a product defect — see the note in\n" +
        "scripts/heavy-job.mjs for the measurement. Wait for it, or pass --anyway if you\n" +
        "know the other job is idle.\n",
    };
  }

  writeFileSync(
    LOCK_PATH,
    `${JSON.stringify({ job, pid: process.pid, startedAt: new Date().toISOString() }, null, 2)}\n`,
  );

  return { ok: true };
}

/**
 * Is that process still there?
 *
 * Signal `0` runs every permission check the kernel would run for a real
 * signal and then delivers nothing, so it is the cheapest available answer to
 * *does this pid exist*. `ESRCH` is the holder being gone — the case this is
 * for. `EPERM` means it exists and belongs to somebody else, which is alive as
 * far as this is concerned, so only `ESRCH` is treated as dead.
 */
function isAlive(pid) {
  if (typeof pid !== "number") return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

/** Give it back. Safe to call when it was never taken. */
export function releaseLock() {
  rmSync(LOCK_PATH, { force: true });
}

/**
 * Release the lock however this process ends.
 *
 * `exit` covers the ordinary path and every `process.exit()` in the caller.
 * The three signals are the ones that actually reach a script run from a
 * terminal, and each re-raises after cleaning up so the exit code a shell sees
 * is still the signal's — a handler that swallows `SIGINT` turns Ctrl-C into a
 * process that looks like it succeeded.
 *
 * `SIGKILL` cannot be handled at all, which is exactly why `lockHolder()` does
 * not trust the file's existence and asks the operating system instead.
 */
export function releaseLockOnExit() {
  process.on("exit", releaseLock);

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      releaseLock();
      process.kill(process.pid, signal);
    });
  }
}

/**
 * The one-minute load average against this machine's core count.
 *
 * A ratio rather than a raw figure, because the raw figure means nothing
 * without the core count beside it: 8 is idle on a 16-core machine and deeply
 * contended on a 4-core one.
 *
 * `os.loadavg()` returns `[0, 0, 0]` on Windows. That reads as a quiet machine,
 * which is the right way for this to fail: it is a warning, and a warning that
 * is wrong in the loud direction is one people learn to ignore.
 */
export async function loadRatio() {
  const os = await import("node:os");
  const cores = os.cpus().length || 1;

  return { ratio: os.loadavg()[0] / cores, cores };
}
