import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  AN_EMPTY_PLOT,
  expectNothingFailedToRender,
  readable,
} from "../support/app.js";

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
  return scope.getByText(/(^| )Open$/).or(readable(scope, AN_EMPTY_PLOT));
}

/** Did this run land on a store with bars in it? */
async function hasBars(scope: Locator): Promise<boolean> {
  return scope.getByText(/(^| )Open$/).isVisible();
}

test("a deep link renders one security's real bars, from a real request", async ({
  page,
}) => {
  await page.goto(`/securities/${SYMBOL}`);

  const region = page.getByRole("region", { name: "Price" });
  await expect(region).toBeVisible();

  // The symbol comes from the **address**, which is the property that makes a
  // link to a security shareable before search exists.
  //
  // **Asserted on the page rather than inside the region since 2026-09-14.** The
  // panel had an `h3` with the ticker in it and it came off: the identity block
  // above states the symbol at display size, and `Region` names this landmark
  // `Price`, so the copy inside was a third statement of a fact stated twice.
  // The property under test is unchanged — the address chose the security.
  await expect(
    page.getByRole("heading", { level: 2, name: SYMBOL }),
  ).toBeVisible();

  // The panel settles on an answer. Which one depends on the store behind this
  // run — see the header; both are 200s and neither is a failure.
  await expect(anAnswer(region)).toBeVisible();

  // Market time with the zone named, **wherever an instant is drawn at all**.
  //
  // A timestamp rendered in the browser's own zone is the same class of defect
  // as a window resolved from its clock, and the abbreviation is the only thing
  // that makes it visible. The runner's timezone is not New York, so where this
  // runs it is a real check rather than a coincidence.
  //
  // **It used to read `in either answer: an empty one still states the window
  // it asked for`, and that premise died on 2026-09-15 (Task 2.14.6.)** There
  // are two empty answers now. The one about the *window* still names it; the
  // one about the *store* — `No history stored for NVDA yet.` — deliberately
  // names no window at all, because the window is not the reason and printing
  // it would invite a reader to change something that cannot help.
  //
  // **Which makes this the trap recorded two files over, in the same words.**
  // `security-price-chart.spec.ts` §`priceStrip` records an assertion that was
  // *green against a chart nobody had pointed at*, because it asked for **some**
  // `EDT` in the Price region and the panel's own sentence supplied one. This
  // assertion was the same shape: on CI — 518 securities, zero bars — the only
  // instant on the page came from the vacancy's requested range, which is not
  // what the check is about. It went red the day that sentence stopped carrying
  // a range, which is the check telling the truth rather than a regression.
  //
  // So it is scoped to the answers that have an instant to get wrong, and the
  // store answer asserts the other half: that it claims no window either.
  const nothingStored = readable(region, /No history stored for \w+ yet/);

  if (await nothingStored.isVisible()) {
    await expect(region.getByText(/E[DS]T/)).toHaveCount(0);
  } else {
    await expect(region.getByText(/E[DS]T/).first()).toBeVisible();
  }

  if (await hasBars(region)) {
    // The three prices the held window is summarised by, which since
    // 2026-09-14 are the whole of what this panel states as text. `Close` left
    // that day too: the headline beside them *is* the close, at display size.
    //
    // **The window qualifies each label**, and the qualifier is the load-bearing
    // half: these are computed over the window on screen, so `OPEN` alone is
    // read as *today's* open and on a five-session window is not. This spec
    // lands on the default window, so the qualifier is `5D`. The two windows and the coverage
    // sentence came off it: the window is in the address and on the control, and
    // the coverage is drawn as the uncovered ground and spoken in the chart's
    // text alternative, counted in the axis's own trading minutes.
    for (const label of ["5D Open", "5D High", "5D Low"]) {
      await expect(region.getByText(label, { exact: true })).toBeVisible();
    }

    // **Invariant 6 on the one series this page renders**, and it is now stated
    // once rather than twice. The panel's own `Market feed` row came off on
    // 2026-09-14 for every series whose sources name one feed — the masthead
    // carries that label on every screen — and what still names it *per series*
    // is the chart's text alternative, because a picture-reader is owed the
    // provenance the label carries.
    //
    // So this matches the shipped vocabulary **inside** the alternative's
    // sentence rather than as the whole of an element's text, which is the
    // opposite of what Task 2.12.8 needed when both surfaces existed.
    await expect(region).toContainText("All US exchanges");

    // And the row itself is gone, which is the half that would otherwise come
    // back by accident: two surfaces naming one feed three centimetres apart.
    await expect(region.getByText("Market feed", { exact: true })).toHaveCount(
      0,
    );
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
  // The symbol the reader typed, named on the page. **On the identity block's
  // `h2` rather than inside the region since 2026-09-14**, the panel's own `h3`
  // having come off as a third copy — and the identity block prints the address's
  // symbol whether or not the universe resolves it, which is exactly this case.
  await expect(
    page.getByRole("heading", { level: 2, name: "ZZZZ" }),
  ).toBeVisible();
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

test("the region draws its series — the fence Story 2.12 took down", async ({
  page,
}) => {
  // **This test asserted the opposite until 2026-09-12, and it was changed
  // rather than deleted.**
  //
  // Story 2.10 built a fence here: no `<canvas>` and no `<svg>` in the Price
  // region, so that Story 2.12 would take the charting decision against a data
  // layer already known to be right rather than debug both at once. It served
  // its purpose — `CHARTING.md` §0's measurements were taken against it — and
  // Task 2.12.4 took it down in the commit that added `PriceChart`.
  //
  // Deleting it would have left the region with no instrument at all. What it
  // asserts now is the thing on the other side of the fence, and the two halves
  // are both load-bearing:
  //
  //  1. **An `<svg>` and still no `<canvas>`.** `CHARTING.md` §1 chose
  //     hand-built SVG with no charting dependency, and a canvas appearing here
  //     would mean that decision had been quietly reversed — a change nothing
  //     else in this repository would notice.
  //  2. **The frame is there whatever the answer was.** This is deliberately
  //     asserted before any branch on whether the store has bars in it: CI's
  //     store holds 518 securities and zero bars, so the answer there is
  //     `empty` — and the frame is not conditional on the data, which is
  //     `PRODUCT_SPEC.md` §28's 500 ms satisfied by the chart rather than by
  //     the response.
  await page.goto(`/securities/${SYMBOL}`);

  const region = page.getByRole("region", { name: "Price" });
  await expect(anAnswer(region)).toBeVisible();

  await expect(region.locator("canvas")).toHaveCount(0);
  // **Two SVGs since Task 2.12.6, and the second is not a second chart.** The
  // plot is one, and the reading layer that carries the crosshair is an overlay
  // in the same grid cell — a sibling rather than a branch, which is what keeps
  // a pointer move from re-rendering the component that computes the frame. The
  // overlay is present only where there are bars to read, so this asserts what
  // is true whatever the answer was, and the branch below asserts the rest.
  await expect(region.locator("svg")).toHaveCount(
    (await hasBars(region)) ? 2 : 1,
  );

  // The gridlines, which come from the box rather than from the series and are
  // therefore there whatever the answer was. A **count** rather than
  // `toBeVisible`: Playwright's visibility check is a non-empty bounding box,
  // and a horizontal gridline is zero pixels tall.
  expect(await region.locator("svg line").count()).toBeGreaterThan(0);

  if (await hasBars(region)) {
    // **Two `<path>`s and no more**, which is the constraint rather than the
    // count: the close line, and the directional area Task 2.12.5 added — the
    // latter defined once in `<defs>` and drawn twice through `<use>`, clipped
    // above and below the reference rule. Two references, one point string.
    //
    // This asserted **one** until 2026-09-12, and the number moved for a
    // documented reason rather than because a mark was added carelessly. What
    // it is actually guarding is unchanged and is still worth guarding: a
    // **third** path would mean something had started drawing per-bar marks,
    // which `CHARTING.md` §2 measured as a line drawn expensively at 0.47px per
    // bar and 29,000 DOM nodes at the cap. The area is free of that by
    // construction — it is the line's own `d` with two segments appended, so it
    // does not scale with anything the line does not.
    await expect(region.locator("svg path")).toHaveCount(2);
  }
});
