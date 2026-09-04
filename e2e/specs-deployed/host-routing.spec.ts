import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// **Story 1.5's two host-level criteria, and this is the only place in the
// repository that can hold them** (Task 1.13.5).
//
// They were closed by hand in a browser in Task 1.11.4 and have been checked by
// a person or not at all ever since. Task 1.13.2 found they cannot live in the
// local suite: that suite drives the origin `CORS_ORIGIN` names, which is the
// dev server, and the dev server answers a deep link **and** a missing asset
// with a 200. So does `vite preview`. Neither is a host with
// `navigationFallback` configured, and the criteria are properties of a host.
//
// ## The two traps that make the obvious assertions wrong
//
// **The not-found case must be asserted on what RENDERED, not on a status
// code.** `NotFound` is a real route rather than a fallback, so it only appears
// if the host served `index.html` for an address that matched nothing. On a
// host with no fallback the user gets the host's own 404 page and React never
// boots — which is a 404 status and a broken product. Asserting the status
// would pass on the broken case and fail on the correct one, since the correct
// one is a **200**.
//
// **`/assets/nope.js` is the path that tests the rule and a made-up root path
// is not.** `staticwebapp.config.json`'s `exclude` array is exactly
// `["/assets/*"]`, which is exact only because Vite puts every hashed asset
// there. A file added to `apps/frontend/public/` lands at the artefact's ROOT,
// outside the exclusion, where a miss is answered with `index.html` at 200 —
// measured in Task 1.11.4 on `/favicon.svg`. So the missing-asset criterion is
// about `/assets/`, and anything else would assert the opposite of the rule.
//
// ## Why every route is loaded COLD
//
// `page.goto()` on each, never a click. A client-side navigation between routes
// proves the router works and says nothing at all about the host; the whole
// criterion is that a user pasting a deep link into an address bar gets the
// application rather than a 404. Each of these is a fresh document request that
// the host has to answer.

const DEEP_LINKS = [
  { path: "/", heading: "Market Overview" },
  { path: "/investigations", heading: "Investigation Workspace" },
  { path: "/securities", heading: "Security Explorer" },
  { path: "/replay", heading: "Market Replay" },
] as const;

for (const { path, heading } of DEEP_LINKS) {
  test(`${path} deep-loads cold as a 200 that is not a redirect`, async ({
    page,
  }) => {
    const response = await page.goto(path);

    expect(response, `no response for ${path}`).not.toBeNull();

    // **200 and not a redirect**, which is the criterion's exact wording and
    // is two claims. A host could satisfy "the user ends up at the
    // application" with a 302 to `/`, and that would lose the address the user
    // pasted — the route would resolve to the landing page rather than to the
    // one they asked for. `redirectedFrom()` is null only when this response is
    // the answer to the request that was made.
    expect(response?.status(), `${path} status`).toBe(200);
    expect(
      response?.request().redirectedFrom(),
      `${path} was reached through a redirect, so the address the user asked ` +
        `for is not the address that answered`,
    ).toBeNull();

    // And the fallback served the application rather than something that
    // merely returned 200: the route the address names is the one that
    // rendered.
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    await expectNothingFailedToRender(page);
  });
}

test("an address that matches nothing renders the not-found ROUTE", async ({
  page,
}) => {
  // Deliberately a path this application will never own, and deliberately not
  // under `/assets/`.
  const response = await page.goto("/no-such-page-1-13-5");

  // A 200 is the CORRECT answer here and a 404 is the failure — see the trap
  // above. The status is asserted anyway rather than only the render, because
  // the two together say which mechanism produced the page: a 200 carrying the
  // application is the fallback working.
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { level: 1, name: "No such page" }),
  ).toBeVisible();
  await expectNothingFailedToRender(page);

  // The chrome is still there, which is what makes this a route rather than an
  // error page. A user who lands here can navigate out of it.
  await expect(
    page.getByRole("navigation", { name: "Primary" }).getByRole("link"),
  ).toHaveCount(4);
});

test("a missing file under /assets/ is a 404 rather than the fallback", async ({
  page,
}) => {
  // Through the browser's own request context rather than `page.goto`, because
  // what is being asserted is the host's answer to an asset request and
  // navigating to a `.js` URL is a different kind of request with a different
  // handling.
  const response = await page.request.get("/assets/nope.js");

  expect(response.status()).toBe(404);

  // The half that makes the 404 worth having, and the reason a blanket
  // catch-all is the wrong configuration: without the exclusion this comes back
  // as `index.html` with a 200, and the browser reports it as a MIME-type error
  // naming neither the file nor the cause. Asserting the body is not the
  // application is what distinguishes a real 404 from a 404-shaped page.
  const body = await response.text();

  expect(body).not.toContain("<!doctype html>");
});
