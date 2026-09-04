import process from "node:process";

import { defineConfig, devices } from "@playwright/test";

// The browser suite's configuration (Task 1.13.2).
//
// Everything expensive about a browser suite is decided by its first test and
// inherited silently by every one after it, so the decisions are here with
// their arguments rather than in a task write-up nobody opens.
//
// ---------------------------------------------------------------------------
// What it runs against, and why the base URL is not in this file
// ---------------------------------------------------------------------------
//
// There were three candidates and this is a real decision rather than a
// default:
//
//   1. **The dev server** — fast, but it does not typecheck (a type error is
//      applied as an ordinary hot update with no overlay) and it never 404s,
//      so deep-linking and the missing-asset case are unassertable there.
//   2. **`vite preview`** — serves the built artefact, and its SPA fallback
//      also answers unmatched paths with `index.html` and a 200, so it is not
//      a static host either. Task 1.12.6 found its fallback keys on the
//      `Accept` header, which the deployed host's does not.
//   3. **The built artefact on a dumb static host** — the only one that 404s
//      both, and the only one that behaves like a host with no fallback
//      configured. Which is *also* not production, because production
//      configures `navigationFallback`.
//
// **The choice is forced by the backend, not by the frontend.** `CORS_ORIGIN`
// holds exactly one origin. `vite preview` is 4173 and a dumb static host is
// somewhere else again, so a suite pointed at either drives a page every one of
// whose backend calls the browser refuses while the server logs a 200 — which
// is the exact failure this story exists to catch, arriving as a property of
// the harness. So the suite drives **the origin `CORS_ORIGIN` names**, which
// today is the dev server and tomorrow is whatever the running pair is paired
// with. `scripts/pair-addresses.mjs` is where that is resolved, and
// `scripts/run-e2e.mjs` passes it in as `E2E_BASE_URL`.
//
// There is deliberately **no default here**. A literal `http://localhost:5173`
// as a fallback is the second copy of the port that the whole arrangement
// exists to prevent, and it would be silently wrong rather than loud. Running
// `playwright test` directly, without `pnpm e2e`, therefore fails immediately
// and says what to run.
//
// The cost of the choice is stated rather than discovered later: **Story 1.5's
// two host-level criteria — a deep link and `/assets/nope.js` — cannot be
// asserted against this target**, because the dev server answers both with a
// 200. They are properties of a host, they were closed by hand against the
// deployed site in Task 1.11.4, and the thing that can hold them permanently is
// Task 1.13.5's post-deploy check rather than this one.
//
// ---------------------------------------------------------------------------
// How the servers start, and why this file does not start them
// ---------------------------------------------------------------------------
//
// Playwright's own `webServer` is the obvious answer and is not used, for two
// measured reasons rather than a preference.
//
//   - **`webServer` judges readiness by one URL.** Task 1.8.4 measured that a
//     busy 3000 leaves `pnpm dev` running and looking entirely healthy with
//     nothing exiting non-zero: the frontend serves, `node --watch` swallows
//     the backend's exit, and a probe of the frontend's URL passes against half
//     a system. A harness that treats that as ready runs a whole suite against
//     a page with no backend — and the backend is the half this suite exists to
//     watch.
//   - **`pnpm dev` is three watchers that never exit**, and handing their
//     lifetime to a test runner makes the runner a second supervisor of a
//     process group Ctrl-C already owns.
//
// So `pnpm e2e` requires a running pair and gates on `pnpm ready`, which judges
// **both** halves and diagnoses which one is wrong. That is a real cost — the
// suite cannot be run from a cold tree by one command — and it is Task 1.13.4's
// to answer for CI, where nothing is running and something has to start it.
//
// ---------------------------------------------------------------------------
// Timeouts, and why the healthy figure is the wrong one to pick from
// ---------------------------------------------------------------------------
//
// Story 1.12 measured the numbers this suite has to live with: the request
// deadline is 5 s, the poll interval 30 s, a hung cycle 36 s, and the
// `checking` placeholder clears in **50.7 ms** locally against a **5 s** hold
// when the backend is dead. Playwright's default `expect` timeout is 5 s, which
// lands exactly on that boundary — a timeout picked from the healthy figure is
// red on the failing path, and the failing path is what this suite is for. So
// the assertion timeout is raised clear of it and the per-test timeout is left
// at its default, which is ample for a page load and deliberately **not**
// ample for anything asserting a poll cycle. A journey that waits out a 30 s
// interval sets its own timeout and says so.

const baseURL = process.env.E2E_BASE_URL;

if (baseURL === undefined || baseURL === "") {
  throw new Error(
    "E2E_BASE_URL is not set. Run the suite with `pnpm e2e`, which resolves the " +
      "frontend's origin from the running pair's own configuration rather than " +
      "from a literal in this file.",
  );
}

export default defineConfig({
  testDir: "./specs",

  // Everything this repository writes about failures applies here: a check
  // that has never failed has never been tested, and a retry is how a suite
  // stops being able to tell a flake from a defect. Zero retries locally, and
  // whether CI gets any is Task 1.13.4's decision to take out loud.
  retries: 0,

  // Raised clear of the 5 s request deadline — see above.
  expect: { timeout: 10_000 },

  // One line per test, no HTML report and so no `playwright-report/` unless
  // somebody asks for one. The failure artefacts below are the diagnostic;
  // what CI keeps and for how long is Task 1.13.4's.
  reporter: "list",

  // Failure artefacts, and nothing on success. A trace is the answer to what
  // Cypress does better out of the box — its runner keeps a DOM snapshot per
  // command — and it costs nothing on a green run. Read one with
  // `pnpm exec playwright show-trace <path>`.
  outputDir: "./test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  // **Chromium only, and WebKit is excluded rather than omitted.** Task 1.13.1
  // measured it: Playwright's WebKit build is frozen on macOS 14/arm64 — it
  // says so during install — and `newPage()` **never returns**, while
  // `launch()` and `newContext()` both succeed. So an unsupported browser
  // presents as a hanging test rather than as an error. Firefox works here and
  // is left out for a different reason: this suite exists to catch failures in
  // how the two halves talk, which is not an engine difference, and a second
  // engine doubles the run for a class of finding nothing here has produced.
  // Whether either is real on `ubuntu-latest` is Task 1.13.4's to find out.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
