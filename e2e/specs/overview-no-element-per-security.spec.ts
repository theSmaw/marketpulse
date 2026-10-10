import { expect, test, type Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { expectTrimmed, serveTrimmedUniverse } from "../support/universe.js";

// **The landing route's document does not grow with the tracked universe**
// (Task 4.8.10, making Epic 14's second condition mechanical).
//
// ## The claim, and why it is worth a browser
//
// `PRODUCT_SPEC.md` §28 publishes _no routine main-thread task over 50 ms_,
// and this product ships a measured exception to it: every cold load of
// `/securities` is over the line, and the lever is **DOM size** rather than
// script. Task 4.8.6 measured both routes on one afternoon against the same
// 518-security response: `/securities` draws **10,318 nodes** and is in breach
// on 10 of 10 loads; `/` draws **447 nodes and zero `<tr>`**, is not in breach,
// and — this is the part that matters here — **draws the same 447 at twenty
// securities as at 518**. ≈ 6 ms of the difference is the payload both routes
// pay for; ≈ 48 ms is the 518-row markup only one of them draws.
//
// Epic 14's trigger gained a **second condition** on 2026-10-09 for exactly
// this: _the first surface on `/` that renders one element per tracked
// security_. That condition is a sentence in a planning file, and a condition
// keyed on a property of the DOM reads identically whether anything holds it or
// not. **This spec holds it.**
//
// ## Why a browser, and why nothing cheaper
//
// jsdom applies no stylesheet and computes no layout, but that is not the
// obstacle here — the obstacle is that the claim is about **the whole document
// the route produces**, which only a real page has. `pnpm invariants` is a grep
// over checked-in text and cannot count elements; a component test renders one
// region against a fixture somebody wrote, which is the opposite of the
// population this is about.
//
// ## Why a CONTROL arm rather than a number
//
// A node ceiling would be a figure, and a figure is a tolerance somebody has to
// re-measure: three of this screen's seven regions are still `reserved` and
// Epics 5 and 6 fill two of them, so any count written here would fire on a
// region that is behaving perfectly. **The assertion is an equality between two
// arms instead** — the full universe against a 27-row sample, same page, same
// aggregate, same build — so what it forbids is precisely *the document scaling
// with the universe* and nothing else. A region added tomorrow changes both
// arms by the same amount and this stays green; a region that draws a row per
// security changes one arm and it goes red.
//
// ## What it must NOT assert, and why this survives CI
//
// Not a duration, not a node count, not a figure on screen. CI's store is 518
// securities and **zero bars**, so every region here renders its honest-nothing
// state and `/`'s aggregate is 928 bytes of `unknown` for ever — which is fine,
// because neither arm reads a figure. The one thing both arms do need is the
// **same** aggregate, and they get it: the overview frame is computed on the
// backend over the whole universe and is untouched by the interception, which
// only trims `GET /securities`.
//
// ## And the `<tr>` half is not redundant
//
// The equality above would also be satisfied by a page that drew 518 rows in
// **both** arms, which is not a state this route can reach — but `<tr>` is the
// element the measured breach is made of on the other route, and asserting its
// absence by name is what makes a failure say *something put a table on the
// landing page* rather than *two counts differ*.
const LANDING = "/";

/** Every element in the document, which is the quantity DOM size means. */
const elementCount = (page: Page): Promise<number> =>
  page.evaluate(() => document.querySelectorAll("*").length);

/** Table rows, by name, because they are what the measured breach is made of. */
const rowCount = (page: Page): Promise<number> =>
  page.evaluate(() => document.querySelectorAll("tr").length);

/**
 * Wait until the universe has ARRIVED and the document has stopped changing.
 *
 * **Both halves are somebody's measured defect, and the first one is this
 * spec's own.** The first draft settled on three regions being visible, which
 * they are long before `GET /securities` has been answered — so the untrimmed
 * arm read **491** elements with the planted per-security list drawing
 * **nothing yet**, while the trimmed arm read 518 with 27 rows in it. On the
 * shipped tree that spec was **green**, and green for the wrong reason: both
 * arms had measured a page that had not yet been handed a universe, which is
 * exactly the state in which this claim is unfalsifiable.
 *
 * So the fence is two things. `arrived` is proved by the **caller** — a
 * `page.route` that records what it served, in both arms — and the count is
 * then read only once it has stopped moving, because the consequence of the
 * payload is a React commit rather than a response.
 *
 * **Stability is a settle, not a tolerance.** Two identical consecutive reads
 * is a statement about the document rather than a figure somebody has to
 * re-measure, which is what keeps this out of `CLAUDE.md`'s _a tolerance is
 * measured, never argued_.
 */
async function settledElementCount(page: Page): Promise<number> {
  let previous = -1;

  await expect
    .poll(
      async () => {
        const now = await elementCount(page);
        const stable = now === previous;
        previous = now;
        return stable;
      },
      {
        message: "the landing document never stopped changing size",
        intervals: [250, 250, 250, 250, 500, 500, 1000],
      },
    )
    .toBe(true);

  return previous;
}

/**
 * Serve the page the universe this store holds, and record what was served.
 *
 * An **identity** interception rather than no interception: the untrimmed arm
 * needs the same proof of arrival the trimmed one gets from `expectTrimmed`,
 * and the only honest way to have it is to watch the body go past. It changes
 * nothing about the response.
 */
async function serveWholeUniverse(page: Page): Promise<() => number> {
  let served = 0;

  await page.route("**/securities", async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      readonly securities: readonly unknown[];
    };
    served = body.securities.length;
    await route.fulfill({ response, json: body });
  });

  return () => served;
}

/**
 * One settle point for the route itself, before the universe is waited for.
 *
 * These three regions are drawn in every state, including the honest-nothing
 * one CI produces — so their visibility is *the route has rendered* without
 * being *the route has data*.
 */
async function landingRendered(page: Page): Promise<void> {
  await expect(
    page.getByRole("region", { name: "Market breadth" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Movers" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Market proxies" }),
  ).toBeVisible();
}

test("the landing route's document does not grow with the tracked universe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  // **Arm 1: the real universe**, whatever this store holds — 518 on CI and
  // 518 locally, and the assertion below does not care which.
  const whole = await serveWholeUniverse(page);
  await page.goto(LANDING);
  await landingRendered(page);
  await expect
    .poll(whole, {
      message:
        "the untrimmed arm was never served a universe — a landing page " +
        "with no securities cannot falsify a claim about one element per " +
        "security",
    })
    .toBeGreaterThan(100);

  const full = await settledElementCount(page);
  const fullRows = await rowCount(page);

  // **Arm 2: the same page, a 27-row sample.** `serveTrimmedUniverse` cuts the
  // *real* backend's body rather than writing one, keeping every element kind
  // the page can draw — both ETF kinds, eleven sector bands, the proxies — and
  // dropping ~491 repetitions of one row shape. Playwright runs the **last**
  // handler registered first, so this one wins over the identity route above.
  const trimmed = await serveTrimmedUniverse(page);
  await page.goto(LANDING);
  await landingRendered(page);
  await expectTrimmed(trimmed);

  const sampled = await settledElementCount(page);
  const sampledRows = await rowCount(page);

  /*
   * Both halves in one assertion, with the numbers on both sides, so a failure
   * prints what it found rather than only that something differed. Task
   * 4.8.13's own lesson: a repaired assertion that fails with a bare count is
   * indistinguishable in the output from the broken one it replaced.
   */
  expect({
    securitiesServedUntrimmed: whole(),
    securitiesServedTrimmed: trimmed.served().length,
    elementsAtFullUniverse: full,
    elementsAtSampledUniverse: sampled,
    rowsAtFullUniverse: fullRows,
    rowsAtSampledUniverse: sampledRows,
  }).toEqual({
    securitiesServedUntrimmed: whole(),
    securitiesServedTrimmed: trimmed.served().length,
    elementsAtFullUniverse: sampled,
    elementsAtSampledUniverse: sampled,
    rowsAtFullUniverse: 0,
    rowsAtSampledUniverse: 0,
  });

  await expectNothingFailedToRender(page);
});
