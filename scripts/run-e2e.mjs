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
// all work the way Playwright documents them.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

import { resolvePairAddresses } from "./pair-addresses.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

const resolved = await resolvePairAddresses();

if (!resolved.ok) {
  console.error(resolved.message);
  process.exit(1);
}

const { backendOrigin, frontendOrigin } = resolved.addresses;

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
    "The browser suite drives a running pair and there is not one. Start it with `pnpm dev`\n" +
      "in another terminal, then run this again. This script does not start the servers —\n" +
      "see the note in e2e/playwright.config.ts for why.\n",
  );
  process.exit(1);
}

// --- Run it ---

console.log(`\nDriving ${frontendOrigin}\n`);

const suite = spawnSync(
  "playwright",
  ["test", "--config", "e2e/playwright.config.ts", ...process.argv.slice(2)],
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
