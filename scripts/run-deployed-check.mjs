// `pnpm e2e:deployed` — the post-deploy browser check (Task 1.13.5).
//
// The check Task 1.11.7 declined, built now that its trigger has fired. That
// decline was correct when it was taken and one half of it still stands:
//
//   - **What changed.** 1.11.7 named the gap precisely — only a real browser
//     catches a wrong `CORS_ORIGIN` or a missing `VITE_API_BASE_URL`, `curl` is
//     structurally incapable of it — and declined to build the check because
//     nothing could yet produce the failure. Story 1.12 shipped a client that
//     polls the backend on every page load. The failure exists now.
//   - **What still stands.** There is no preview environment and deliberately
//     never will be one on this plan, so this runs AFTER a merge against the
//     live environment. It cannot prevent anything. Its output is a rollback
//     decision, and the two rollbacks are asymmetric — see `Where a red result
//     goes` in `e2e/README.md`.
//
// It is a root script beside `ready`, `image`, `coverage` and `e2e`, and it is
// **not** a `pnpm verify` step for a reason stronger than `e2e`'s: `verify`
// runs with no servers up and no credentials, on a clean clone and on every
// pull request, and this drives production.
//
// Three things, mirroring `run-e2e.mjs` deliberately so the two read alike:
//
//   1. **Requires both deployed addresses explicitly and defaults neither.**
//      They are three independent values in three places — see
//      `e2e/support/deployed.ts` — and the whole point of the check is that
//      they can disagree. A default naming production is a check that quietly
//      stops checking what it was pointed at.
//   2. **Gates on `scripts/check-deployed.mjs`**, which polls until the
//      deployed artefact is coherent rather than checking once, because the
//      frontend's upload is not atomic and its ~2-second window opens at the
//      exact second the deploy step reports success. That script also carries
//      the two-host control that separates a broken environment from a broken
//      link.
//   3. **Propagates the exit code**, signal case included.
//
// Arguments are forwarded, so `pnpm e2e:deployed --headed` and
// `pnpm e2e:deployed -g "routing"` work as Playwright documents them.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

import { checkDeployed, reportDeployed } from "./check-deployed.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");

const frontendOrigin = process.env.E2E_DEPLOYED_BASE_URL;
const backendOrigin = process.env.E2E_DEPLOYED_BACKEND_ORIGIN;

if (!frontendOrigin || !backendOrigin) {
  console.error(
    "This check needs both deployed addresses and defaults neither:\n\n" +
      "  E2E_DEPLOYED_BASE_URL            where the deployed page is served from\n" +
      "  E2E_DEPLOYED_BACKEND_ORIGIN      the backend the bundle was BUILT to dial\n" +
      "                                   (VITE_API_BASE_URL, from deploy.yml)\n\n" +
      "They are two inputs rather than one and a derivation, because deployed they\n" +
      "are independent values that can disagree — which is the failure this check\n" +
      "exists to catch. See e2e/support/deployed.ts.\n\n" +
      ".github/workflows/deploy.yml passes both. To run it by hand, export them.\n",
  );
  process.exit(1);
}

const addresses = { backendOrigin, frontendOrigin };

console.log(`\nChecking ${frontendOrigin}\n`);

const readiness = await checkDeployed(addresses);
reportDeployed(readiness, addresses);

if (!readiness.ok) process.exit(1);

const suite = spawnSync(
  "playwright",
  [
    "test",
    "--config",
    "e2e/playwright.deployed.config.ts",
    ...process.argv.slice(2),
  ],
  {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      E2E_DEPLOYED_BASE_URL: frontendOrigin,
      E2E_DEPLOYED_BACKEND_ORIGIN: backendOrigin,
    },
  },
);

if (suite.signal !== null) {
  console.error(`\nplaywright was killed by ${suite.signal}.`);
  process.exit(1);
}

process.exit(suite.status ?? 1);
