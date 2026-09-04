// Where the development pair actually is — one definition, two readers.
//
// This was inside `check-ready.mjs` until Task 1.13.2, and it moved for a
// reason rather than for tidiness: the browser suite needs the same two
// addresses, and a harness that writes `http://localhost:5173` down a second
// time has forked the pair's definition on the day it was created. The two
// readers are `scripts/check-ready.mjs` and `scripts/run-e2e.mjs`.
//
// Neither address is a literal here, and the reasoning for both is Task
// 1.8.4's:
//
//   - **The backend's** comes from its own configuration module, read out of
//     the **built** `dist/config.js` exactly as `check-env-example.mjs` does,
//     because `PORT` and `HOST` are real variables and anything that ignores
//     them is dialling the wrong socket. That is also why a clean tree gets
//     "run `pnpm build` first" rather than a resolver stack.
//   - **The frontend's** is `CORS_ORIGIN` and not a second copy of `5173`.
//     The port lives in `vite.config.ts` as a literal with no environment
//     override, which Task 1.8.4 confirmed rather than reversed, so a copy
//     here would be a second place for it to be written down and the drift
//     between them would be silent in the direction that matters.
//
// That second one is load-bearing for the browser suite in a way it was not
// for the readiness check, and it is the argument that decided what the suite
// runs against. **The backend's allowlist holds exactly one origin.** Serving
// the built artefact from `vite preview` on 4173, or from a dumb static host
// on 8000, is an origin `CORS_ORIGIN` does not name — so every backend call
// from that page is refused by the browser while the server logs a 200, which
// is precisely the failure Story 1.13 exists to catch, arriving as a property
// of the harness rather than of the application. Reading the origin here means
// the suite always drives the frontend the running backend is actually paired
// with, whatever that turns out to be.
//
// Dependency-free, like the three checks beside it.

import { relative, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const BACKEND_CONFIG = resolve(REPO_ROOT, "apps/backend/dist/config.js");

// The module whose 200 means the frontend's graph resolves. It is the first
// module Vite reaches with a *value* import of `@marketpulse/shared`; see the
// header of `check-ready.mjs` for why naming it is the point rather than an
// implementation detail.
export const FRONTEND_PROBE = "/src/routes/MarketOverview.tsx";

/**
 * The address to dial for a bound host. `0.0.0.0` and `::` are wildcards a
 * server binds and a client cannot connect to; Fastify's own startup line
 * already rewrites the first of them, and this does the same rewrite for the
 * same reason.
 *
 * @param {string} host
 * @returns {string}
 */
export function dialHost(host) {
  if (host === "0.0.0.0") {
    return "127.0.0.1";
  }

  const resolved = host === "::" ? "::1" : host;

  return resolved.includes(":") ? `[${resolved}]` : resolved;
}

/**
 * @typedef {object} PairAddresses
 * @property {number} port
 * @property {string} host
 * @property {string} backendOrigin
 * @property {string} backendHealthUrl
 * @property {string} frontendOrigin
 * @property {string} frontendProbeUrl
 */

/**
 * Resolve both halves' addresses from the backend's built configuration.
 *
 * Returns a discriminated result rather than throwing, and carries the message
 * with it, so that both readers report the same two failures in the same
 * words. Neither of them is an exception worth a stack: an unbuilt tree and an
 * invalid `PORT` are both ordinary states with a one-line answer.
 *
 * @returns {Promise<{ ok: true, addresses: PairAddresses } | { ok: false, message: string }>}
 */
export async function resolvePairAddresses() {
  /** @type {{ loadConfig: () => { port: number, host: string, corsOrigin: string }, loadEnvFile: () => string | undefined }} */
  let configModule;

  try {
    configModule = await import(BACKEND_CONFIG);
  } catch {
    return {
      ok: false,
      message: `Cannot read ${relative(REPO_ROOT, BACKEND_CONFIG)} — run \`pnpm build\` first.`,
    };
  }

  configModule.loadEnvFile();

  /** @type {{ port: number, host: string, corsOrigin: string }} */
  let config;

  try {
    config = configModule.loadConfig();
  } catch (error) {
    // The same failure the server itself would hit, reported the same way it
    // reports it — a plain line rather than a stack, because the message
    // already names the key and the value it was given. It is also the honest
    // answer to both readers' question: a server that cannot read its
    // configuration is not going to be listening.
    //
    // Indented per line rather than once: `config.ts` reports *every* bad key,
    // so this message is multi-line whenever two are wrong, and a single
    // leading indent would align the first line and leave the rest hard
    // against the margin. Found in Task 1.8.6, fixed in Task 1.8.7.
    const detail = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      message: `The backend's configuration is invalid, so it cannot be running:\n\n${detail
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")}\n`,
    };
  }

  const backendOrigin = `http://${dialHost(config.host)}:${String(config.port)}`;

  return {
    ok: true,
    addresses: {
      port: config.port,
      host: config.host,
      backendOrigin,
      backendHealthUrl: `${backendOrigin}/health`,
      frontendOrigin: config.corsOrigin,
      frontendProbeUrl: `${config.corsOrigin}${FRONTEND_PROBE}`,
    },
  };
}
