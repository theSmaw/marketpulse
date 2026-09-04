import process from "node:process";

import { defineConfig, devices } from "@playwright/test";

// The post-deploy check's configuration (Task 1.13.5).
//
// A SECOND config beside `playwright.config.ts` rather than a second project
// inside it, and that is a decision. A project shares `use.baseURL` and the
// whole `testDir` sweep with its siblings, and these two suites drive
// different targets resolved from different sources — one from a running
// pair's own configuration, one from three independent inputs that are
// supposed to agree and might not. They also have to be runnable
// independently: `pnpm e2e` must never reach production, and
// `pnpm e2e:deployed` must never need a local pair. Two files is what makes
// both of those structural rather than remembered.
//
// Everything else in this file is deliberately the same shape as the local
// config's, so a reader who has read one has read most of this one.
//
// ---------------------------------------------------------------------------
// What this exists for, restated because it is not obvious from the specs
// ---------------------------------------------------------------------------
//
// Task 1.11.7 declined a browser-driven post-deploy check, on grounds that were
// correct then: nothing could yet produce the failure it would catch. Story
// 1.12 shipped a client that polls the backend, so the failure now exists.
// **The part of that argument which still stands is the harder half** — this
// runs AFTER a merge, against the live environment, so a red result is not a
// gate, it is a rollback decision. See `Where a red result goes` in
// `e2e/README.md`.
//
// ---------------------------------------------------------------------------
// Timeouts, and why the first poll is the one that matters
// ---------------------------------------------------------------------------
//
// Deployed figures, measured in Task 1.12.7 and re-taken here: the round trip
// is 250-770 ms against 7-25 ms locally, the `checking` placeholder lasts
// **283 ms** against 50.7 ms, and the poll cycle is 30 s. So the placeholder is
// a real interval a check must wait past rather than a flicker, and the
// assertion timeout is raised above the local suite's 10 s to absorb an
// internet round trip on a loaded runner.
//
// **Nothing here waits for a second poll**, and that is a decision rather than
// an omission. Both failures this check exists for are visible on the very
// first request — a wrong `CORS_ORIGIN` is refused by the browser immediately,
// and a wrong `VITE_API_BASE_URL` is visible in the request's own URL before
// any response arrives — so a check that waits 30 s for a second poll spends
// half a minute to learn nothing, on the one check in this repository that runs
// against production. A sequence is only worth waiting for where the assertion
// genuinely needs one; recovery needs one, and recovery is asserted before a
// merge rather than after it.

const baseURL = process.env.E2E_DEPLOYED_BASE_URL;

if (baseURL === undefined || baseURL === "") {
  throw new Error(
    "E2E_DEPLOYED_BASE_URL is not set. Run the deployed check with " +
      "`pnpm e2e:deployed`, which requires both deployed addresses explicitly. " +
      "There is deliberately no default: a config that names production by " +
      "default is a check that quietly stops checking what it was pointed at.",
  );
}

export default defineConfig({
  testDir: "./specs-deployed",

  // Zero, for the local suite's reason and one more that is specific to this
  // one. A gate that retries cannot tell a flake from a defect — and here the
  // "flake" a retry would paper over is precisely the thing that has to be
  // distinguished by hand: Task 1.11.7 produced a 65-second "outage" that
  // turned out to be the laptop's own network. A retry would have hidden it and
  // taught everyone that a red here means nothing. What separates a broken
  // environment from a broken link is the two-host control in
  // `scripts/check-deployed.mjs`, not a second attempt.
  retries: 0,

  // ONE worker, deliberately, and it is the only place these two configs
  // disagree on a runtime setting. This suite drives PRODUCTION, and the
  // Consumption plan's idle billing rate is conditional on the replica
  // receiving less than 1,000 bytes per second. Serialising makes this check's
  // whole cost one countable sequence that can be read off the backend's own
  // log rather than an interleaved burst nothing can attribute. Nothing here
  // needs parallelism: it is four short journeys against a live URL.
  workers: 1,

  // Above the local suite's 10 s — an internet round trip and a loaded runner,
  // not a slower application.
  expect: { timeout: 15_000 },

  reporter: "list",

  // NESTED inside the local suite's output directory rather than beside it, so
  // the one `test-results/` entry that `.gitignore`, `.prettierignore` and
  // `eslint.config.mjs` already carry covers both. A sibling
  // `test-results-deployed/` would match none of those three globs and would
  // arrive as untracked files nobody expected. The consequence, stated because
  // it looks like a bug: a local `pnpm e2e` clears `test-results/` on start and
  // takes these with it. Both are throwaway diagnostics from the run that
  // produced them, and the two suites never run together.
  outputDir: "./test-results/deployed",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",

    // Stated rather than left at the default, because this is the only suite
    // in the repository that drives HTTPS. A certificate that has expired or
    // stopped chaining is a real production failure and a rollback-shaped one;
    // it must be red here rather than waved through, and `true` is the setting
    // somebody reaches for the first time a browser complains.
    ignoreHTTPSErrors: false,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
