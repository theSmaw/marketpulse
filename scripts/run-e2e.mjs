// `pnpm e2e` — the browser suite (Task 1.13.2).
//
// A root script beside `ready`, `image` and `coverage`, and deliberately **not**
// a `pnpm verify` step: `verify` runs with no servers up, in CI and on a clean
// clone, and a chain that needs two ports stops being runnable from a cold
// tree. Task 1.13.4 settled where that leaves it relative to the pipeline's
// founding rule: it is a **second job** in `.github/workflows/verify.yml`, not
// a chain step and not a separate workflow, it gates a merge, and the argument
// for all three is written beside the job.
//
// It exists for the same reason `build-image.mjs` does — so that the things
// that cannot be forgotten are not remembered. It does three things and each
// one is load-bearing:
//
//   1. **Resolves the frontend's origin from the running pair's own
//      configuration** (`pair-addresses.mjs`, shared with `check-ready.mjs`)
//      and passes it to Playwright as `E2E_BASE_URL`. `playwright.config.ts`
//      has no default and throws without it, so `playwright test` run by hand
//      fails loudly rather than driving a port that was written down twice.
//   2. **Gates on `pnpm ready`, which judges both halves.** Task 1.8.4
//      measured why one URL is not enough: a busy 3000 leaves `pnpm dev`
//      running and looking entirely healthy with nothing exiting non-zero, so
//      a frontend probe passes against half a system — and the backend is the
//      half this suite exists to watch. Running the real check rather than a
//      copy of it also means the diagnosis a developer gets here is the one
//      they already know.
//   3. **Propagates the runner's exit code**, including the signal case, so a
//      red suite is red through `pnpm e2e`, through `pnpm --filter`, and
//      through anything that wraps them. This repository has verified exit-code
//      propagation at every layer it has added; this is a new one.
//   4. **Takes the heavy-job lock** (2026-09-14), so this cannot run beside
//      another suite or a `pnpm verify`. `scripts/heavy-job.mjs` carries the
//      measurement; the short version is that `retries: 0` is only defensible
//      while a red run means a defect, and under load it stops meaning one. It
//      also closes a hazard nothing else noticed: two concurrent runs both pass
//      the readiness gate and both write into the same `e2e/test-results`.
//
// It does **not** start the servers, and that is the decision rather than an
// omission — see the long note in `e2e/playwright.config.ts`. `pnpm dev` in
// another terminal is the prerequisite, and **CI does exactly that** (Task
// 1.13.4): the `e2e` job in `.github/workflows/verify.yml` builds, backgrounds
// `pnpm dev`, and then calls this script by name — so the readiness rule is
// written down once, here, rather than a second time in a workflow.
//
// Arguments are forwarded untouched, so `pnpm e2e --headed`, `pnpm e2e
// --debug`, `pnpm e2e specs/landing-route.spec.ts` and `pnpm e2e -g "chrome"`
// all work the way Playwright documents them. **Use that while iterating**: the
// whole suite is five minutes and the specs a change touches are often under
// one, and running the whole thing five times is how the change that added the
// lock below spent half its afternoon.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

import { acquireLock, loadRatio, releaseLockOnExit } from "./heavy-job.mjs";
import { resolvePairAddresses } from "./pair-addresses.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

const resolved = await resolvePairAddresses();

if (!resolved.ok) {
  console.error(resolved.message);
  process.exit(1);
}

const { backendOrigin, frontendOrigin } = resolved.addresses;

// --- Is anything else heavy running? ---

// Before the readiness gate, because a refusal here is about this machine and
// says nothing about the pair — running `pnpm ready` first would print three
// ticks and then decline, which reads as the check having failed.
//
// `--anyway` is this script's own and is **stripped** below rather than
// forwarded: Playwright's CLI rejects options it does not know, so passing it
// through would turn an override into a usage error naming a flag Playwright
// has never heard of.
if (!process.argv.includes("--anyway")) {
  const lock = acquireLock("pnpm e2e");

  if (!lock.ok) {
    console.error(lock.message);
    process.exit(1);
  }

  releaseLockOnExit();
}

// **And a warning for the load the lock cannot see**, which is most of it. The
// lock knows about jobs started from this repository; a container VM, an IDE
// indexing and somebody's video call are invisible to it and cost this suite
// exactly as much.
//
// Added the same afternoon as the lock, on the evidence of the run that was
// verifying the lock: load average **47 across 8 cores**, against a threshold
// of 0.7, with nothing holding the lock and the largest consumer a virtual
// machine. A guard that only watches its own repository would have said
// nothing at all there — and this suite is the job in this workspace most
// sensitive to load, so it is the last one that should be silent about it.
//
// A warning rather than a refusal, for `check-quiet.mjs`'s reason: refusing on
// a number that is somebody else's browser is a gate people route around.
const { ratio, cores } = await loadRatio();

if (ratio > 0.7) {
  console.warn(
    `\n⚠ Load average ${(ratio * cores).toFixed(1)} across ${String(cores)} cores before this run.\n` +
      "  Expect slow tests and timeouts that are about the machine rather than the product.\n" +
      "  Before treating a failure here as a defect, re-run that one spec alone:\n" +
      '      pnpm e2e <spec>.spec.ts -g "<test name>"\n',
  );
}

// --- Is the pair up? ---

const ready = spawnSync(
  process.execPath,
  [resolve(REPO_ROOT, "scripts/check-ready.mjs")],
  {
    cwd: REPO_ROOT,
    stdio: "inherit",
  },
);

if (ready.status !== 0) {
  console.error(
    "The browser suite needs a running pair AND a loaded database, and one of them is not\n" +
      "there — the ticked lines above say which. `pnpm dev` in another terminal starts the\n" +
      "pair; `pnpm db` starts the database, and a first run then needs `pnpm migrate` and\n" +
      "`pnpm universe`. This script starts none of them — see the note in\n" +
      "e2e/playwright.config.ts for why, and `scripts/check-ready.mjs` for why the database\n" +
      "became a failure here rather than a note (Task 2.4.5).\n",
  );
  process.exit(1);
}

// --- Run it ---

console.log(`\nDriving ${frontendOrigin}\n`);

const forwarded = process.argv
  .slice(2)
  .filter((argument) => argument !== "--anyway");

const suite = spawnSync(
  "playwright",
  ["test", "--config", "e2e/playwright.config.ts", ...forwarded],
  {
    cwd: REPO_ROOT,
    stdio: "inherit",
    // Both addresses, from the one place they are defined. The frontend's is
    // what Playwright drives; the backend's is needed by the one assertion that
    // has to be made from *outside* the browser — that the server answers a
    // disallowed origin with a 200, which is why no server-side instrument can
    // catch a wrong allowlist. `e2e/support/pair.ts` is the reading end, and it
    // throws rather than defaulting, for the reason the config has no default
    // base URL.
    env: {
      ...process.env,
      E2E_BASE_URL: frontendOrigin,
      E2E_BACKEND_ORIGIN: backendOrigin,
    },
  },
);

// A child killed by a signal has a null status and a named signal; reporting
// that as 0 is how a suite that was interrupted reads as a suite that passed.
if (suite.signal !== null) {
  console.error(`\nplaywright was killed by ${suite.signal}.`);
  process.exit(1);
}

process.exit(suite.status ?? 1);
