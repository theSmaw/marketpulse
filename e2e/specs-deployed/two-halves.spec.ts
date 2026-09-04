import { BACKEND_STATUSES, isHealthResponse } from "@marketpulse/shared";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  backendIndicator,
  expectBackendStatus,
  expectNothingFailedToRender,
} from "../support/app.js";
import { reportAxe } from "../support/axe.js";
import {
  deployedBackendOrigin,
  deployedFrontendOrigin,
  deployedHealthUrl,
} from "../support/deployed.js";

// **The two failures nothing else in this repository can see** (Task 1.13.5).
//
// Both are shipped-shaped, both leave every server-side instrument reporting
// success, and both are caught here — by two different assertions, which is the
// part worth getting right, because on screen they look identical.
//
// ## Failure one: a wrong `CORS_ORIGIN`
//
// The backend admits exactly one origin. If it is not the origin the page is
// served from:
//
//   - the browser reports `TypeError: Failed to fetch`, naming neither CORS nor
//     the origin;
//   - `curl` with the same `Origin` gets a **200 with a full body**, carrying
//     an `access-control-allow-origin` header naming somebody else's origin —
//     because `@fastify/cors` is configured with a string origin and asserts it
//     unconditionally, so the server never sees a check fail;
//   - the backend's own log records `statusCode: 200`.
//
// The browser is the only party that *performs* that comparison, and
// **`route.fulfill()` cannot fake it** — Task 1.13.3 measured a fulfilled
// response with no CORS headers at all being accepted by Chromium and read
// normally — so this is caught rather than produced, and it is caught by the
// `healthy` assertion below.
//
// One refinement, found by breaking the live allowlist rather than by reading:
// **the recorded claim that `curl` is *structurally* incapable of catching this
// is slightly too strong.** The status, the body and the log genuinely cannot,
// but the `access-control-allow-origin` header is a readable copy of
// `CORS_ORIGIN` and can be compared — by an instrument that has been told the
// frontend's origin, which no server-side instrument has. The third test below
// makes exactly that comparison and says what it does and does not buy.
//
// ## Failure two: a missing or wrong `VITE_API_BASE_URL`
//
// Substituted into the bundle at BUILD time. A build that forgets it does not
// warn and does not fail: it ships a valid artefact dialling
// `http://localhost:3000`, which an HTTPS document blocks as mixed content.
// `verify` stays green, the deploy succeeds, the platform reports success,
// `/health` is up and the site serves.
//
// **On screen that is indistinguishable from failure one**, and from a backend
// that is genuinely down: all three read `unreachable`. So it is caught at the
// **cause** rather than the symptom — by asserting the origin the page's own
// request actually went to. That assertion needs no response at all, which is
// what makes it robust: a blocked mixed-content request may never produce one.
//
// ## Why neither waits for a second poll
//
// Both are visible on the very first request. Waiting 30 s for a second poll
// would spend half a minute to learn nothing, on the one check in this
// repository that runs against production. `playwright.deployed.config.ts` has
// the general form of that argument.

/**
 * Every `/health` request URL the page's own JavaScript issues, in order.
 *
 * Collected from the `request` event rather than the `response` event, because
 * a request the browser refuses to make — mixed content — has a URL and never
 * has a response. The URL is the evidence.
 */
function collectHealthRequests(page: Page): readonly string[] {
  const urls: string[] = [];

  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/health") urls.push(request.url());
  });

  return urls;
}

test("the deployed page dials the backend it was built to dial", async ({
  page,
}) => {
  const healthRequests = collectHealthRequests(page);

  await page.goto("/");

  // A page that makes no health request at all is its own finding and needs
  // its own message: it means either the bundle is not the application, or
  // the browser refused the request before issuing it.
  await expect
    .poll(() => healthRequests.length, {
      message:
        "the deployed page made no /health request. Either the artefact served " +
        "is not this application, or the request was blocked before it was " +
        "issued — a bundle built without VITE_API_BASE_URL dials " +
        "http://localhost:3000, which an HTTPS document blocks as mixed content.",
    })
    .toBeGreaterThan(0);

  // **The assertion that catches a wrong or missing `VITE_API_BASE_URL`.**
  // Origins rather than whole URLs: the path is `/health` in every case and the
  // origin is the whole of what the variable decides.
  expect(
    healthRequests.map((url) => new URL(url).origin),
    "every /health request the deployed page made must go to the backend " +
      "VITE_API_BASE_URL named. A different origin here is a bundle built " +
      "against the wrong backend; localhost is a bundle built against none.",
  ).toEqual(healthRequests.map(() => new URL(deployedBackendOrigin).origin));
});

test("the two deployed halves talk across the origin boundary", async ({
  page,
}) => {
  // The same `finished()` predicate the local suite uses, and for the same
  // measured reason: `waitForResponse` can match a response whose request is
  // then aborted, and an aborted request's body can never be retrieved. There
  // is no `StrictMode` double mount in a production build, so the abort that
  // motivated it there does not happen here — the predicate is kept because the
  // race it closes is a property of Playwright rather than of the build.
  const healthResponse = page.waitForResponse(async (response) => {
    if (new URL(response.url()).pathname !== "/health") return false;
    if (response.request().method() !== "GET") return false;

    return await response
      .finished()
      .then((error) => error === null)
      .catch(() => false);
  });

  await page.goto("/");

  const response = await healthResponse;

  expect(response.status()).toBe(200);
  expect(isHealthResponse(await response.json())).toBe(true);

  // **The assertion that catches a wrong `CORS_ORIGIN`.** The response above
  // arrives with a 200 whether or not the allowlist is right — the network
  // layer Playwright reads applies no CORS rule — and it is the *page* that is
  // refused it. So the answer is read off the screen, which is the only place
  // the browser's own verdict is visible.
  await expectBackendStatus(page, "healthy");
  await expectNothingFailedToRender(page);

  // And the negative, stated so it fails if the interface ever starts leaking
  // one: the never-answered sentence is what both of this file's failures put
  // on screen, and seeing it here would mean the assertion above passed for the
  // wrong reason.
  await expect(
    backendIndicator(page).getByText("No successful check yet.", {
      exact: true,
    }),
  ).toHaveCount(0);
});

test("the deployed backend admits the origin its page is served from, and says so to anybody who asks", async () => {
  // The mechanism, from the side the browser cannot see — and **this test
  // corrects a claim this repository states in several places** (Task 1.13.5,
  // found by breaking the live `CORS_ORIGIN` rather than by reading).
  //
  // The recorded claim is that `curl` is *structurally incapable* of catching a
  // wrong allowlist. Measured against a deliberately misconfigured deployed
  // backend, the sharper truth is this:
  //
  //   - the **status** cannot catch it — 200, to any origin;
  //   - the **body** cannot catch it — the full contract, to any origin;
  //   - the **log** cannot catch it — 15 requests through the broken window,
  //     every one `statusCode: 200`;
  //   - the **header can**, because `@fastify/cors` with a string origin
  //     asserts the *configured* origin unconditionally, so
  //     `access-control-allow-origin` is a readable copy of `CORS_ORIGIN`.
  //
  // So a non-browser instrument can catch this after all — but only one that
  // has been **told the frontend's origin**, which is precisely the value no
  // server-side instrument has, and only for this exact CORS configuration. It
  // is also a *proxy* for the browser's verdict rather than the verdict: it
  // says nothing at all about the second failure this file exists for, where
  // the backend is never asked.
  //
  // Asserted here because it is cheap, because two instruments disagreeing is
  // diagnostic — both red is CORS, only the browser red is something else —
  // and because writing it down as an assertion means the day `corsOrigin`
  // becomes a function or an array, this fails and somebody has to decide what
  // the suite now means.
  const response = await fetch(deployedHealthUrl, {
    headers: { Origin: "https://marketpulse-wrong-origin.example" },
  });

  // Not refused. The server never sees a check fail, because the server is not
  // the party that checks.
  expect(response.status).toBe(200);
  expect(isHealthResponse(await response.json())).toBe(true);

  // And the header names the CONFIGURED origin rather than the one that asked,
  // which is what makes it readable as configuration — and what makes it
  // comparable, from here, against where the page is actually served from.
  expect(response.headers.get("access-control-allow-origin")).toBe(
    deployedFrontendOrigin,
  );
});

test("the deployed page's accessibility figures match the pre-merge gate's", async ({
  page,
}) => {
  await page.goto("/");

  // Waits for the first poll to SETTLE, whatever it settled on, rather than for
  // `healthy` — and that is a correction the CORS break produced rather than a
  // preference. Written as `expectBackendStatus(page, "healthy")` this test
  // went red alongside the two above, so a broken allowlist produced three red
  // tests, one of them labelled accessibility. A reader triaging that is being
  // told the deployed page has an accessibility problem, which it does not.
  //
  // A report must not fail for a reason that is not its own. So it takes a
  // reading in whichever state the page is in and NAMES that state, which also
  // makes the figure comparable against the right baseline: this repository has
  // one for the healthy landing route and one for a failure state.
  const settled = backendIndicator(page).getByText(
    new RegExp(`^(${BACKEND_STATUSES.join("|")})$`),
  );

  await expect(settled).toBeVisible();

  const state = (await settled.textContent()) ?? "unknown";

  // A REPORT and not a gate here, deliberately, and the argument is in
  // `support/axe.ts` beside the function. The short version: a red post-deploy
  // result is a rollback decision, a contrast ratio is not a rollback, and the
  // same rules already gate the same source before the merge.
  await reportAxe(page, `the deployed landing route, backend ${state}`);
});
