import { REQUEST_ID_HEADER, apiError } from "@marketpulse/shared";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender, readable } from "../support/app.js";
import { BARS_ROUTE_PATTERN } from "../support/pair.js";

// Moving between two securities **without reloading the application**
// (Task 2.11.5).
//
// This file exists because of something that was true of this product from its
// first commit until Task 2.11.4: every route to a second symbol was a document
// navigation. That reloads the bundle and takes the module-level parsed-series
// cache with it, which is why `FRONTEND-STATE.md` could describe a cache nobody
// had ever been able to watch work, and why *"the panel never shows one
// symbol's bars under another's name"* was asserted in jsdom by request
// identity rather than here.
//
// **The condition now exists**, so these are the assertions that could not
// previously be written. Two of them are about the page's *lifetime* rather
// than about any one screen, and neither is reachable at any cheaper level:
// jsdom has no history and no bundle to reload, so a component test cannot tell
// a client-side navigation from a document one at all.
//
// ## How the interesting states are produced
//
// By **holding the bar-series response open**, not by mocking a cache. A held
// answer painting "in the first commit" is only observable while the request
// behind it has not come back — otherwise a cache hit and a fast round trip
// look identical. So `delayBars()` below fulfils the *real* response after a
// delay, and every assertion made during that window is an assertion about what
// the page does with no answer from the network.
//
// That is also why nothing here asserts a duration. The delays are how a state
// is *produced*; the assertions are about what is on screen, never about how
// long anything took. `e2e/README.md`'s "not latency" rule is intact.
//
// ## What a green run here does not certify
//
//   - **Not the data.** Every assertion is data-independent or branched, for
//     the reason `security-series.spec.ts` records at length: CI's store holds
//     518 securities and **zero bars**, so every answer there is a correct
//     `empty` and the same window locally is `partial`. A held `empty` is still
//     a held answer, which is what makes the cache assertions run in both.
//   - **Not that a document navigation would be wrong elsewhere.** A cold deep
//     link to `/securities/:symbol` is still a document load and must stay one;
//     `security-series.spec.ts` and `specs-deployed/host-routing.spec.ts` are
//     what keep that true.

// Every test below holds responses open, and a held response that outlives the
// test it belongs to fails that test from the route callback — `route.fetch:
// Test ended.` — after every assertion in it has already passed. Which is a
// confusing way to be told that the *harness* has an outstanding promise, so it
// is dealt with once here rather than at the end of four tests.
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

/** Securities the curated universe always holds. */
const FIRST = "NVDA";
const SECOND = "AMD";
const THIRD = "MSFT";

/** The panel, by the region that holds it. */
function panel(page: Page) {
  return page.getByRole("region", { name: "Market data" });
}

/**
 * The panel has settled on an answer — **either** answer.
 *
 * The shape both series specs arrived at: which of the two appears is a
 * property of the store behind the run rather than of the code.
 */
function anAnswer(page: Page) {
  return readable(panel(page), /Holding .* bars/).or(
    readable(panel(page), /No bars stored for this window/),
  );
}

/** The mark a held answer carries while a newer one is in flight. */
function refreshing(page: Page) {
  return readable(panel(page), /Refreshing/);
}

/**
 * How many times this page has been *loaded*, as the browser counts it.
 *
 * One entry means one document. It is the whole difference this task is about,
 * and it is the assertion a marker on `window` cannot make on its own — a
 * marker proves the JavaScript context survived, and this proves the browser
 * never started a second navigation to prove it with.
 */
async function documentLoads(page: Page): Promise<number> {
  return page.evaluate(() => performance.getEntriesByType("navigation").length);
}

/**
 * Hold every bar-series response open for `ms`, and record which symbols were
 * asked for.
 *
 * `route.fetch()` then `route.fulfill()` — the **real** response, late. A
 * hand-written body would get the closed vocabulary wrong and the symptom
 * would be an unrelated state, which is the rule `security-series-states.spec.ts`
 * already follows.
 */
async function delayBars(
  page: Page,
  delayFor: (symbol: string) => number,
): Promise<string[]> {
  const asked: string[] = [];

  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    const symbol = new URL(route.request().url()).searchParams.get("symbol");
    asked.push(symbol ?? "");
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, delayFor(symbol ?? "")));
    await route.fulfill({ response });
  });

  return asked;
}

test("a row in the tracked universe opens that security, and the application is not reloaded", async ({
  page,
}) => {
  await page.goto("/securities");

  // A marker in the page's own JavaScript context. A document navigation takes
  // it with the bundle; a client-side one cannot touch it.
  await page.evaluate(() => {
    (window as unknown as { __alive?: boolean }).__alive = true;
  });

  // **By role**, which is the assertion and not the locator being convenient: a
  // `<tr onClick>` renders the same text, and `getByRole("link")` is exactly the
  // question "is this a link to a screen reader?".
  await page.getByRole("link", { name: SECOND }).click();

  await expect(page).toHaveURL(new RegExp(`/securities/${SECOND}$`));
  await expect(
    panel(page).getByRole("heading", { name: SECOND }),
  ).toBeVisible();

  expect(
    await page.evaluate(
      () => (window as unknown as { __alive?: boolean }).__alive,
    ),
  ).toBe(true);
  expect(await documentLoads(page)).toBe(1);

  await expectNothingFailedToRender(page);
});

test("a row's symbol is reachable by keyboard and opens on Enter", async ({
  page,
}) => {
  await page.goto("/securities");

  // `press` focuses the element first, so this is the keyboard path end to end
  // and not a click wearing a keyboard's name. It passes because the target is
  // a real `<a href>`: an element made "clickable" with a handler takes no
  // focus and Enter reaches nothing.
  const link = page.getByRole("link", { name: FIRST });
  await link.press("Enter");

  await expect(page).toHaveURL(new RegExp(`/securities/${FIRST}$`));
  await expect(panel(page).getByRole("heading", { name: FIRST })).toBeVisible();
  expect(await documentLoads(page)).toBe(1);
});

test("returning to a security paints the held answer before the network answers, and asks again anyway", async ({
  page,
}) => {
  await page.goto(`/securities/${FIRST}`);
  await expect(anAnswer(page)).toBeVisible();

  await page.getByRole("link", { name: SECOND }).click();
  // **The heading first, then the answer**, and that order is the fix for a
  // real race this file found rather than a formality. A click is not a
  // commit: for a few milliseconds after the address changes, the panel is
  // still the one React last rendered — the previous security's heading above
  // the previous security's figures, which is consistent and is not the defect
  // the next test is about. Waiting only for "an answer" resolves against that
  // frame, and the rest of this test then measures a navigation that had not
  // happened yet. Ask for the new subject before asking what is under it.
  await expect(
    panel(page).getByRole("heading", { name: SECOND }),
  ).toBeVisible();
  await expect(anAnswer(page)).toBeVisible();

  // From here the network is held open, so anything that appears came from the
  // cache and nothing else.
  const asked = await delayBars(page, () => 4_000);

  await page.goBack();

  await expect(panel(page).getByRole("heading", { name: FIRST })).toBeVisible();
  // The held answer, and the mark that says a newer one is being read. Both
  // while the request behind them has not returned — which is the whole claim.
  await expect(anAnswer(page)).toBeVisible({ timeout: 2_000 });
  await expect(refreshing(page)).toBeVisible({ timeout: 2_000 });

  // **It still asks.** `FRONTEND-STATE.md` §2 is explicit that the cache is
  // read "only to paint sooner and never to skip a request" — the browser's own
  // HTTP cache revalidates with `If-None-Match`, and what a client cache buys
  // is the paint rather than the byte. An assertion that the return issued *no*
  // request would be asserting the opposite of the design.
  expect(asked).toContain(FIRST);

  await expectNothingFailedToRender(page);
});

test("the panel never shows one symbol's bars under another's name", async ({
  page,
}) => {
  await page.goto(`/securities/${FIRST}`);
  await expect(anAnswer(page)).toBeVisible();

  // The next security's answer is held open, so the window in which the page
  // could show the wrong thing is four seconds wide rather than a frame wide.
  // Without a browser this is the assertion Story 2.10 had to make in jsdom
  // through request identity, because a page reload made it unreachable.
  await delayBars(page, () => 4_000);

  await page.getByRole("link", { name: SECOND }).click();

  await expect(
    panel(page).getByRole("heading", { name: SECOND }),
  ).toBeVisible();
  // The previous security's figures are **gone**, not relabelled. `loading` is
  // the correct thing to be looking at here: a held answer for a *different*
  // key is not an answer about this security.
  await expect(anAnswer(page)).toBeHidden();
  await expect(refreshing(page)).toBeHidden();

  // And the real answer lands when the network does.
  await expect(anAnswer(page)).toBeVisible({ timeout: 10_000 });
  await expectNothingFailedToRender(page);
});

test("a fast sequence of navigations lands on the last one", async ({
  page,
}) => {
  await page.goto("/securities");

  // **The superseded answers are made distinguishable, and that is the whole
  // design of this test.** A first draft delayed the three answers so they
  // arrived out of order and then asserted the last symbol's heading with an
  // answer under it — and it passed with every line of cancellation deleted
  // from `useBarSeries`, because a *wrong* series renders as an answer too.
  // Three removals, three green runs: the check was blind, which is exactly
  // what `CLAUDE.md` means by a break that does not go red being no evidence.
  //
  // So the two securities navigated *away* from answer with a 503 instead, and
  // late. A superseded answer reaching the screen is then unmissable — the
  // failure state carries a sentence and a retry control that no answer has —
  // and it is unmissable on **CI's empty store** as much as on a backfilled
  // one, which a price or a bar count would not be.
  const requestId = "0d6f6a26-6a5d-4c0b-9f3c-6c2b8f4a1d90";
  const superseded = new Set([FIRST, SECOND]);

  await page.route(BARS_ROUTE_PATTERN, async (route) => {
    const symbol = new URL(route.request().url()).searchParams.get("symbol");

    if (symbol === null || !superseded.has(symbol)) {
      await route.continue();
      return;
    }

    // Late enough to arrive well after the third navigation has settled.
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      headers: {
        [REQUEST_ID_HEADER]: requestId,
        "access-control-expose-headers": REQUEST_ID_HEADER,
      },
      body: JSON.stringify(
        apiError(
          "SERVICE_UNAVAILABLE",
          "Market data is temporarily unavailable. Try again shortly.",
          requestId,
        ),
      ),
    });
  });

  await page.getByRole("link", { name: FIRST }).click();
  await page.getByRole("link", { name: SECOND }).click();
  await page.getByRole("link", { name: THIRD }).click();

  await expect(page).toHaveURL(new RegExp(`/securities/${THIRD}$`));
  await expect(panel(page).getByRole("heading", { name: THIRD })).toBeVisible();
  await expect(anAnswer(page)).toBeVisible();

  // Past the two superseded answers, which have now both come back. The
  // assertion is that nothing changed, which is the only shape this property
  // has — and the retry control is the sharpest half of it, because the panel
  // offers one in exactly one state and it is not this one.
  await page.waitForTimeout(4_000);
  await expect(panel(page).getByRole("heading", { name: THIRD })).toBeVisible();
  await expect(anAnswer(page)).toBeVisible();
  await expect(panel(page).getByRole("button")).toHaveCount(0);
  expect(await documentLoads(page)).toBe(1);

  await expectNothingFailedToRender(page);
});

// **What the substitution above did and did not prove**, recorded because the
// answer is narrower than the test's name suggests.
//
// Red with every line of cancellation removed from `useBarSeries` — the abort
// when a request starts, the abort in the effect's teardown, and the identity
// guard on the answer. Still **green** with only the identity guard removed,
// and still green with the guard and the starting abort both removed, because
// the teardown's abort alone supersedes a request this fast.
//
// That is a property of the browser rather than a gap in the hook: the guard
// exists for an answer that had already *resolved* when the abort landed, which
// no amount of aborting prevents and which cannot be timed deterministically
// from out here. `use-bar-series.test.ts`'s "cannot render a superseded answer
// that arrives after the newer one" is where that one is checked, in jsdom,
// where the resolution order is the test's to choose.
