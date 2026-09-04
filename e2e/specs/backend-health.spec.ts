import { REQUEST_ID_HEADER, isHealthResponse } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";

import {
  expectBackendStatus,
  expectNothingFailedToRender,
} from "../support/app.js";
import { expectNoAxeViolations } from "../support/axe.js";
import { backendHealthUrl, frontendOrigin } from "../support/pair.js";

// **The journey this story exists for: the two halves talking** (Task 1.13.3).
//
// A real browser loads the real page from the real frontend host, the real
// bundle makes a real cross-origin request to the real backend, the browser
// applies its own CORS check to the answer, and what is on screen is what the
// backend actually said. Every level below this one stops short of at least one
// of those, and the one that matters is the last: **the browser is the only
// party that compares an origin against an allowlist.**
//
// ## What this spec is for, which is not the same as what it asserts
//
// It asserts the healthy path. Its *purpose* is to be the thing that goes red
// when `CORS_ORIGIN` does not name the origin this page is served from — which
// is the failure Story 1.13 was written around, and the one every server-side
// instrument reports as a success:
//
//   - the browser reports `TypeError: Failed to fetch`, naming neither CORS nor
//     the origin;
//   - `curl` with the same `Origin` gets a **200 with a full body**;
//   - the backend's own log records `statusCode: 200`.
//
// So there is deliberately **no committed spec that breaks the allowlist**. It
// cannot be broken from inside the browser — `route.fulfill()` bypasses the
// CORS check entirely, measured in `backend-failure-states.spec.ts` where the
// finding is written down — and breaking it for real means restarting a backend
// the whole suite shares, under a `node --watch` loop Story 1.8 measured as not
// recoverable by freeing a port. Producing that failure is therefore done
// deliberately and by hand, against a pair started with the wrong value;
// **catching it is this spec's job**, and it was seen to do exactly that before
// the task closed.
//
// The third test below is the other half of the same fact, taken from the side
// the browser cannot see. It is not a curiosity — it is the mechanism, and it
// is why nothing but a browser can catch this.

test("the page reaches the backend across the origin boundary and shows what it said", async ({
  page,
}) => {
  // Watched from the browser rather than assumed, so the assertion is about a
  // request this application made and not one the spec made on its behalf.
  //
  // **The `finished()` clause is not defensive padding — without it this test
  // is a race, and the CI gate caught it going the wrong way** (found on the
  // runner, reproduced here, Task 1.13.5). Every page load makes **two**
  // `/health` requests and **one of them is aborted**: `StrictMode` mounts the
  // hook twice in development, and the first mount's cleanup aborts its own
  // in-flight request through the `AbortController` `api-client.ts` composes
  // into every call. Measured 5/5 on this machine —
  // `["request GET", "request GET", "FAILED net::ERR_ABORTED", "finished"]`.
  //
  // Locally the abort lands *before* the response headers do, so the aborted
  // request produces no `response` event at all and the predicate below has
  // only one candidate. On a loaded runner it can land *after* them, which
  // produces a `response` event carrying a 200 whose body can never be
  // retrieved — `Protocol error (Network.getResponseBody): No data found for
  // resource with given identifier`, red on a healthy pair. So the predicate
  // requires the response to have actually **finished**, and the `.catch()` is
  // there because a predicate that throws fails the wait rather than skipping
  // the candidate, which would reintroduce the flake in a new spelling.
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

  // The body is checked with the shared predicate rather than by picking fields
  // out of it — the same definition `apps/backend` compiles against and
  // `apps/frontend` validates with, which is the whole reason `packages/shared`
  // holds it. `isHealthResponse` deliberately tolerates an unrecognised
  // `status` and unknown extra fields, so this passes against a newer server
  // and fails against one that stopped answering in the contract's shape.
  expect(isHealthResponse(await response.json())).toBe(true);

  // And this is what the user is left looking at. `healthy` rather than "one of
  // the words": `pnpm e2e` gated on the pair being up before Playwright
  // started, so anything else here is a real failure of the two halves to talk.
  await expectBackendStatus(page, "healthy");
  await expectNothingFailedToRender(page);
});

test("the correlation id crosses the origin boundary, which only a browser can tell you", async ({
  page,
}) => {
  await page.goto("/");

  // `exposedHeaders` is the one line of CORS configuration whose absence is
  // invisible to every other instrument in this repository. A same-origin
  // response exposes every header and `curl` reads every header; a
  // cross-origin response exposes only the CORS-safelisted six plus whatever
  // `Access-Control-Expose-Headers` names — and `x-request-id` is not on the
  // safelist. Task 1.8.3 found this by building the Vite proxy it then
  // rejected: through a proxy the header reads back with no configuration at
  // all, which hides the fact that a real deployment needs the server to expose
  // it.
  //
  // **The request has to be made by the page's own JavaScript.** Playwright's
  // own `response.headerValue()` reads the network layer, which sees every
  // header the server sent and applies no exposure rule at all — so asserting
  // through it would pass with `exposedHeaders` deleted. This is the one place
  // in the suite where a fabricated request is the only honest instrument.
  const requestId = await page.evaluate(
    async ([url, header]) => {
      const response = await fetch(url, { method: "GET" });

      return response.headers.get(header);
    },
    [backendHealthUrl, REQUEST_ID_HEADER] as const,
  );

  // The whole id, never a prefix — the rule `api-client.ts` states beside the
  // type that carries one. A UUID v4 has no internal structure, so a truncated
  // form is not a shorter version of it but a different thing that matches
  // nothing in a log.
  expect(requestId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("the backend answers a disallowed origin 200, so no server-side instrument can catch this", async () => {
  // `@fastify/cors` is configured with a **string** origin, so it asserts
  // `access-control-allow-origin` **unconditionally**: an unlisted origin gets
  // a 200 with a full body and a header naming somebody else's origin, and the
  // server never sees a check fail — because the server is not the party that
  // checks. This request is made from Node, so nothing compares anything and
  // the response arrives intact.
  //
  // Asserting it here rather than recording it in prose makes the mechanism a
  // checked fact: the day `corsOrigin` becomes a function or an array, this
  // test changes and somebody has to decide what the suite now means.
  const response = await fetch(backendHealthUrl, {
    headers: { Origin: "https://marketpulse-wrong-origin.example" },
  });

  expect(response.status).toBe(200);
  expect(isHealthResponse(await response.json())).toBe(true);
  expect(response.headers.get("access-control-allow-origin")).toBe(
    frontendOrigin,
  );
});

test("the assembled application has no accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expectBackendStatus(page, "healthy");

  await expectNoAxeViolations(page, "the landing route, healthy");
});
