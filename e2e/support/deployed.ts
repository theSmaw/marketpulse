import process from "node:process";

// The deployed environment's two addresses, and why they are two INPUTS rather
// than one input and a derivation (Task 1.13.5).
//
// `pair.ts` is the local equivalent and it does not transfer. That module reads
// addresses that `scripts/pair-addresses.mjs` resolved from the running pair's
// own configuration — the backend's from its built `dist/config.js`, the
// frontend's **from `CORS_ORIGIN`** — which is exactly right locally and is the
// reason a wrong allowlist cannot be reached through `pnpm e2e` at all: the two
// values cannot disagree, because one is computed from the other, and
// `pnpm ready` reports `ENOTFOUND` and exits 1 before a browser starts.
//
// **Deployed, they are three independent values held in three different places
// by three different mechanisms, and nothing anywhere compares them.**
//
//   1. `VITE_API_BASE_URL` — a literal in `.github/workflows/deploy.yml`,
//      substituted into the bundle at BUILD time. What the page dials.
//   2. The Static Web App's hostname — a fact about a resource in Azure. Where
//      the page is served from.
//   3. `CORS_ORIGIN` — an environment variable on the Container App, set with
//      `az` and existing ONLY in the platform, because `deploy.yml` uses
//      `update` and never `create`. Which origin the backend admits.
//
// (2) and (3) have to name the same origin and no file in this repository can
// hold both. (1) has to name the backend and a build that forgets it does not
// fail — it ships a page dialling `http://localhost:3000`. So the whole point
// of this check is that these values can drift apart, which means this module
// must take them as separate inputs and **must never derive one from another**.
// Deriving would reproduce the local harness's happy accident in the one place
// where the accident is the bug.
//
// Both throw rather than defaulting, for the reason `playwright.config.ts` has
// no default `baseURL`: a literal fallback is silently wrong rather than loud,
// and a literal fallback naming production is a check that quietly stops
// checking what it was pointed at.

function required(name: string): string {
  const value = process.env[name];

  if (value === undefined || value === "") {
    throw new Error(
      `${name} is not set. Run the deployed check with \`pnpm e2e:deployed\`, ` +
        `which requires both addresses explicitly rather than defaulting to ` +
        `production — see e2e/support/deployed.ts for why they are two inputs.`,
    );
  }

  return value.replace(/\/+$/, "");
}

/** Where the deployed page is served from. Playwright's `baseURL`. */
export const deployedFrontendOrigin = required("E2E_DEPLOYED_BASE_URL");

/**
 * The backend origin the deployed bundle was built to dial.
 *
 * This is `VITE_API_BASE_URL` — the value the deploy substituted — and it is
 * here so a spec can assert that the page's own request went **to this origin**.
 * That assertion is what catches a missing or wrong `VITE_API_BASE_URL`
 * directly, at the cause, rather than through the symptom: a page dialling
 * `http://localhost:3000` from an HTTPS document is blocked as mixed content
 * and reads on screen as `unreachable`, which is indistinguishable from a
 * backend that is genuinely down or from a wrong allowlist.
 */
export const deployedBackendOrigin = required("E2E_DEPLOYED_BACKEND_ORIGIN");

/** The deployed health endpoint, dialled from Node. */
export const deployedHealthUrl = `${deployedBackendOrigin}/health`;
