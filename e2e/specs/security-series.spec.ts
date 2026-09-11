import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender, readable } from "../support/app.js";

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
//   - **Not that there are any bars at all, and this is the constraint that
//     shapes the whole file.** `verify.yml` runs `pnpm migrate` and
//     `pnpm universe` and deliberately never `pnpm backfill`, because a backfill
//     is metered and `verify` has no credentials on purpose. So **CI's store
//     holds 518 securities and zero bars**, and `sessions=5` there is a correct
//     `empty`. A developer's store and the deployed one hold bars and answer
//     `partial`.
//
//     Both are right, and which one a run lands in is a property of the
//     environment rather than of the code — so every assertion below is either
//     **data-independent** or **branched on which answer arrived**. The first
//     draft of this file asserted `Holding N bars` unconditionally, passed
//     locally, and failed three of four tests on CI. That is the defect this
//     note exists to prevent a second time.
//
//     The consequence worth stating: the richest assertions here — the prices,
//     the two windows, the market-time zone — run on a developer's machine and
//     in `pnpm e2e:deployed`, and **not** in the CI gate. The gate checks the
//     wiring; the data is checked where there is data.
//   - **Not accessibility.** `securities-route.spec.ts` runs axe over this whole
//     document at three viewports, and this panel is on it — which is a wider
//     claim than this repository made before and is still not a review.

/** A security the curated universe always holds, and the spec's own default. */
const SYMBOL = "NVDA";

/**
 * The panel has settled on an answer — **either** answer.
 *
 * A populated window says how much it holds; an empty one says there is nothing
 * stored for it. Both are 200s, both are answers rather than failures, and which
 * one appears depends on whether the store behind this run has been backfilled.
 * Waiting for the union is what makes this file honest in both environments.
 */
function anAnswer(scope: Locator): Locator {
  // `readable` rather than `getByText` since Task 2.10.8: this panel now has a
  // live region whose sentence repeats what is on screen, so a bare text match
  // resolves to two elements. Every assertion in this file is about what a
  // reader sees; the announcement has its own spec.
  return readable(scope, /Holding .* bars/).or(
    readable(scope, /No bars stored for this window/),
  );
}

/** Did this run land on a store with bars in it? */
async function hasBars(scope: Locator): Promise<boolean> {
  return scope.getByText(/Holding .* bars/).isVisible();
}

test("a deep link renders one security's real bars, from a real request", async ({
  page,
}) => {
  await page.goto(`/securities/${SYMBOL}`);

  const region = page.getByRole("region", { name: "Price" });
  await expect(region).toBeVisible();

  // The symbol comes from the **address**, which is the property that makes a
  // link to a security shareable before search exists.
  await expect(region.getByRole("heading", { name: SYMBOL })).toBeVisible();

  // The panel settles on an answer. Which one depends on the store behind this
  // run — see the header; both are 200s and neither is a failure.
  await expect(anAnswer(region)).toBeVisible();

  // Market time with the zone named, in **either** answer: an empty one still
  // states the window it asked for. A timestamp rendered in the browser's own
  // zone is the same class of defect as a window resolved from its clock, and
  // the abbreviation is the only thing that makes it visible at all. The
  // runner's timezone is not New York, so this is a real check rather than a
  // coincidence.
  await expect(region.getByText(/E[DS]T/).first()).toBeVisible();

  if (await hasBars(region)) {
    // Both windows, which is the pair this whole story exists to keep honest.
    // `exact` because the coverage sentence also contains the words "asked for"
    // — a substring match resolves to two elements and fails in strict mode,
    // which is Playwright telling the truth rather than being awkward.
    await expect(region.getByText("Asked for", { exact: true })).toBeVisible();
    await expect(region.getByText("Held", { exact: true })).toBeVisible();

    // The four prices a session is summarised by.
    for (const label of ["Open", "High", "Low", "Close"]) {
      await expect(region.getByText(label, { exact: true })).toBeVisible();
    }

    // The feed, in the shipped vocabulary rather than a slug — invariant 6 on
    // the one series this page renders. It comes off the series' provenance, so
    // there is nothing to label when there are no bars.
    await expect(region.getByText("Market feed")).toBeVisible();
    await expect(region.getByText("All US exchanges")).toBeVisible();
  }

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
  await expect(
    anAnswer(page.getByRole("region", { name: "Price" })),
  ).toBeVisible();

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

  const region = page.getByRole("region", { name: "Price" });
  await expect(region.getByRole("heading", { name: "ZZZZ" })).toBeVisible();
  await expect(
    readable(region, /ZZZZ is not a security this system tracks/),
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

  const region = page.getByRole("region", { name: "Price" });
  await expect(anAnswer(region)).toBeVisible();

  await expect(region.locator("canvas")).toHaveCount(0);
  await expect(region.locator("svg")).toHaveCount(0);
});
