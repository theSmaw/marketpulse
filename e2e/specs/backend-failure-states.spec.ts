import { apiError } from "@marketpulse/shared";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  backendIndicator,
  expectBackendStatus,
  expectNothingFailedToRender,
} from "../support/app.js";
import { expectNoAxeViolations } from "../support/axe.js";
import { HEALTH_ROUTE_PATTERN } from "../support/pair.js";

// Story 1.12's three states, each produced from a named cause, and the
// interface going on working through the worst of them (Task 1.13.3).
//
// ## How the states are produced, and the finding that decided it
//
// Every failure here is produced by **intercepting the health request in the
// browser**, before the page loads. Nothing in this file stops, restarts,
// reconfigures or otherwise touches the pair, and that is the answer to the
// question of how mutating specs are kept from running underneath specs that do
// not: **there are none.** See `README.md` in this package for the full
// decision and its reversal trigger.
//
// The alternative was a spec that kills the backend, and it was rejected on
// Story 1.8's measurement rather than on taste: freeing a port does not recover
// a `node --watch` loop, which waits for a *file* change and not for the port —
// measured at six seconds free and still dead — so a spec that stops the
// backend locally has no reliable way to put it back, and every later spec in
// the run inherits the wreckage.
//
// **What interception cannot do is the finding worth carrying.** The obvious
// use for it is reproducing the cross-origin refusal by stripping
// `access-control-allow-origin` from a real response. It does not work:
// measured against this pair, a `route.fulfill()` response with **no CORS
// headers at all** is accepted by Chromium and read normally by the page. So a
// fulfilled response is not subject to the browser's CORS check, and route
// interception can produce every state in this file and **not** the one the
// story exists for. That one is caught by `backend-health.spec.ts` rather than
// produced here.
//
// `route.abort()` is different and is genuine: it produces the same
// `TypeError: Failed to fetch` a refused connection does, which is what
// `unreachable` is defined as.
//
// ## Why these are fast and the recovery journey is not
//
// The route is installed **before** `page.goto()`, so the very first poll
// fails and the state is on screen in a couple of hundred milliseconds rather
// than after a poll interval. Every test here runs inside Playwright's default
// 30 s per-test timeout, and none of them needs `poll-timings.ts`. The one
// journey that has to wait for a *transition* is `backend-recovery.spec.ts`,
// and it says so.
//
// ## One cause is deliberately not produced here
//
// A **hung** socket — one that accepts and never answers — is `unreachable`
// too, and by a different route: the client's 5 s deadline expires, nothing
// arrives, and because the next poll is scheduled on *settle* the cycle
// stretches to the 36.00 s Task 1.12.6 measured. Producing it costs a spec 36
// seconds to assert a distinction the user cannot see, against a deadline Task
// 1.12.6 already proved wired in a browser. Declined, and recorded rather than
// forgotten: the reversal trigger is a change to `API_TIMEOUT_MS`, which is the
// number that assertion would actually be about.

/** A refused connection, which is what `unreachable` is defined as. */
async function refuseHealth(page: Page): Promise<void> {
  await page.route(HEALTH_ROUTE_PATTERN, async (route) => {
    await route.abort("connectionrefused");
  });
}

test("a refused connection reads as unreachable, and says it has never been answered", async ({
  page,
}) => {
  await refuseHealth(page);
  await page.goto("/");

  await expectBackendStatus(page, "unreachable");

  const indicator = backendIndicator(page);

  await expect(
    indicator.getByText("No response from the service.", { exact: true }),
  ).toBeVisible();

  // The never-succeeded sentence, which is materially different from a missing
  // timestamp: it is what a wrong `VITE_API_BASE_URL` looks like from here, and
  // `backend-recovery.spec.ts` asserts the other branch of the same line.
  await expect(
    indicator.getByText("No successful check yet.", { exact: true }),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
});

test("a 5xx carrying the error contract reads as degraded, and says the service answered badly", async ({
  page,
}) => {
  // The body is built with the shared constructor rather than written out, so
  // this is the wire shape the backend actually produces — including the
  // `exactOptionalPropertyTypes` branch that makes an absent `details` absent
  // rather than explicitly undefined.
  await page.route(HEALTH_ROUTE_PATTERN, async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(
        apiError(
          "INTERNAL_ERROR",
          "Something went wrong.",
          "3f1c9b02-9d4e-4a51-8f0b-2c7a1e5d6b83",
        ),
      ),
    });
  });

  await page.goto("/");

  await expectBackendStatus(page, "degraded");
  await expect(
    backendIndicator(page).getByText("The service answered with an error.", {
      exact: true,
    }),
  ).toBeVisible();

  // **No request id anywhere on screen**, even though the body carried a
  // well-formed one. That is Task 1.12.2's rule holding structurally rather
  // than by discipline: an id is a labelled reference beside a failure a user
  // is being asked to report, and this reports a *state*. The hook does not
  // even hand one to the indicator.
  await expect(page.getByText("3f1c9b02", { exact: false })).toHaveCount(0);

  await expectNothingFailedToRender(page);
});

test("a 200 that is not this service reads as degraded, with a different sentence", async ({
  page,
}) => {
  // The realistic producer of this state is a host answering the API's address
  // with its own SPA fallback — which is exactly what the deployed frontend's
  // `navigationFallback` does, measured in Task 1.12.7: `/health` there answers
  // 200 `index.html` at both `Accept` values. So this is a misconfigured
  // `VITE_API_BASE_URL` pointed at the frontend's own origin, produced without
  // a second host.
  await page.route(HEALTH_ROUTE_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body>a static host</body></html>",
    });
  });

  await page.goto("/");

  await expectBackendStatus(page, "degraded");

  // The two causes share a word and differ only in this sentence, so a check
  // asserting on the word alone cannot tell them apart. This is the wiring
  // check Task 1.12.4 set when it made the cause select a sentence rather than
  // render a slug.
  await expect(
    backendIndicator(page).getByText(
      "Something answered at the service's address, and it was not this service.",
      { exact: true },
    ),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
});

test("every route stays usable with the backend unreachable", async ({
  page,
}) => {
  // PRODUCT_SPEC.md §36's core principle, and the criterion most likely to stop
  // being true without anything failing. It holds structurally rather than by
  // accident: `getHealth()` never throws in any branch, so an unreachable
  // backend is a *value* the hook stores rather than an exception unwinding
  // through `ErrorBoundary`.
  await refuseHealth(page);
  await page.goto("/");
  await expectBackendStatus(page, "unreachable");

  const nav = page.getByRole("navigation", { name: "Primary" });

  for (const { link, heading } of [
    { link: "Investigation Workspace", heading: "Investigation Workspace" },
    { link: "Security Explorer", heading: "Security Explorer" },
    { link: "Market Replay", heading: "Market Replay" },
    { link: "Market Overview", heading: "Market Overview" },
  ]) {
    // Clicked rather than navigated to, so these are client-side transitions
    // through the router the chrome renders — the same thing a user does, and
    // the case where a poll and a route change could interfere.
    await nav.getByRole("link", { name: link }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    await expectNothingFailedToRender(page);
  }

  // The not-found route is a real route rather than a fallback, so it only
  // renders if the host served `index.html` for an address that matched
  // nothing. On this target that is the dev server's own generosity rather than
  // a configured fallback — the deployed host's `navigationFallback` is Task
  // 1.13.5's to assert.
  await page.goto("/no-such-page");
  await expect(
    page.getByRole("heading", { level: 1, name: "No such page" }),
  ).toBeVisible();
  await expectNothingFailedToRender(page);

  // The indicator is still the indicator after all of that: a route change does
  // not restart the poll, because the hook is called from `App` outside
  // `<Routes>` with a constant dependency array. A fresh document load does,
  // which is why this reads `unreachable` rather than asserting no request
  // happened.
  await expectBackendStatus(page, "unreachable");

  // The one accessibility measurement no other level in this repository can
  // take: the failure state's own text, against the real cascade. Task 1.12.4's
  // only real violation was a contrast failure on this exact component in this
  // exact family of states.
  await expectNoAxeViolations(page, "the not-found route, backend unreachable");
});
