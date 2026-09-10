import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// One security's bar series on screen, deep-linked, against the **real pair**
// (Task 2.10.7).
//
// This is the payoff of Story 2.10 made durable: everything from the state
// union to the cancellation rules exists to put real bars in front of a person,
// and until this file there was no instrument that could tell whether it did.
//
// ## Why it installs no route interception
//
// The healthy path drives the real backend over the real store, which is Story
// 1.13's split and is not a style: `route.fulfill()` bypasses the browser's CORS
// check entirely, so a journey built on interception cannot see the one failure
// the deployed check exists for. It also cannot see the thing this file is
// actually about — that the window we send is resolved by the *server* and the
// bars come back from a real query.
//
// **Task 2.10.8 owns the failure states**, produced from named causes, and the
// fixture backend it will use is `apps/frontend/src/fixtures/`. Nothing here
// pre-empts that: this asserts the healthy path and the fence.
//
// ## What a green run here does not certify
//
//   - **Not that the prices are right.** Every assertion is about the page
//     rendering what the API returned. Nothing in a browser can tell a correct
//     series from a plausible one; that is the backend's database suite and the
//     bar store's own checks.
//   - **Not that the panel is complete.** The store is caught up nightly, so a
//     named window is normally `partial` — the assertions below are written to
//     pass in either state, because which one a run lands in is a property of
//     when the backfill last ran rather than of the code.
//   - **Not accessibility.** `securities-route.spec.ts` runs axe over this whole
//     document at three viewports, and this panel is on it — which is a wider
//     claim than this repository made before and is still not a review.

/** A security the curated universe always holds, and the spec's own default. */
const SYMBOL = "NVDA";

test("a deep link renders one security's real bars, from a real request", async ({
  page,
}) => {
  await page.goto(`/securities/${SYMBOL}`);

  const region = page.getByRole("region", { name: "Market data" });
  await expect(region).toBeVisible();

  // The symbol comes from the **address**, which is the property that makes a
  // link to a security shareable before search exists.
  await expect(region.getByRole("heading", { name: SYMBOL })).toBeVisible();

  // The panel's real answer: how much of the window we hold. It says so in
  // every populated state — a complete answer says it holds all of it rather
  // than saying nothing, because silence would make "we hold all of it" and
  // "nobody checked" look identical.
  await expect(region.getByText(/Holding .* bars/)).toBeVisible();

  // Both windows, which is the pair this whole story exists to keep honest.
  // `exact` because the coverage sentence above also contains the words "asked
  // for" — a substring match resolves to two elements and fails in strict mode,
  // which is Playwright telling the truth rather than being awkward.
  await expect(region.getByText("Asked for", { exact: true })).toBeVisible();
  await expect(region.getByText("Held", { exact: true })).toBeVisible();

  // Market time, with the zone named. A timestamp rendered in the browser's own
  // zone is the same class of defect as a window resolved from its clock, and
  // the abbreviation is the only thing that makes it visible at all. The
  // runner's timezone is not New York, so this is a real check rather than a
  // coincidence.
  await expect(region.getByText(/E[DS]T/).first()).toBeVisible();

  // The feed, in the shipped vocabulary rather than a slug — invariant 6 on the
  // one series this page renders.
  await expect(region.getByText("Market feed")).toBeVisible();
  await expect(region.getByText("All US exchanges")).toBeVisible();

  await expectNothingFailedToRender(page);
});

test("the window is resolved by the server, never by the browser's clock", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/market-data/bars"))
      requests.push(request.url());
  });

  await page.goto(`/securities/${SYMBOL}`);
  await expect(page.getByText(/Holding .* bars/)).toBeVisible();

  // A browser in Singapore at 09:00 local is on the previous *market* date in
  // New York, so a client that computes "the last five sessions" itself is off
  // by one for roughly half the world for several hours of every day — and it
  // produces a chart that is plausible and shifted rather than an error anybody
  // sees. Asserted as an **absence**, because that is what the property is.
  expect(requests.length).toBeGreaterThan(0);
  for (const url of requests) {
    expect(url).toContain(`symbol=${SYMBOL}`);
    expect(url).toContain("sessions=");
    expect(url).not.toMatch(/start=|end=/);
  }
});

test("a symbol the universe does not hold is a sentence, not a crash", async ({
  page,
}) => {
  // A **refusal** rather than a failure — the endpoint answers 404 and the
  // panel renders the server's own sentence. It offers no retry, because
  // waiting cannot make an untracked security tracked.
  await page.goto("/securities/ZZZZ");

  const region = page.getByRole("region", { name: "Market data" });
  await expect(region.getByRole("heading", { name: "ZZZZ" })).toBeVisible();
  await expect(
    region.getByText(/ZZZZ is not a security this system tracks/),
  ).toBeVisible();
  await expect(region.getByRole("button")).toHaveCount(0);

  // The page survives it. §36's rule: degrade locally, never to a global error
  // screen — the universe table below is untouched.
  await expect(
    page.getByRole("region", { name: "Tracked universe" }),
  ).toBeVisible();
  await expectNothingFailedToRender(page);
});

test("the panel draws nothing — the fence Story 2.12 inherits", async ({
  page,
}) => {
  // Story 2.12 owns the charting decision, and a sparkline added here would be
  // that decision taken by accident on the smallest possible evidence. The
  // component's header states the fence; this is the instrument for it, and it
  // is in the browser rather than in jsdom because a canvas that renders only
  // in a real engine would pass a jsdom check.
  await page.goto(`/securities/${SYMBOL}`);
  await expect(page.getByText(/Holding .* bars/)).toBeVisible();

  const region = page.getByRole("region", { name: "Market data" });
  await expect(region.locator("canvas")).toHaveCount(0);
  await expect(region.locator("svg")).toHaveCount(0);
});
