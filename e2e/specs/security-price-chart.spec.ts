import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// **The chart, in the region that named it** (Task 2.12.4) — and the three
// facts about it that no other level in this repository can see.
//
// ## Why every assertion here needs a browser
//
// `CLAUDE.md`'s rule, stated once more because this file is its fourth
// instance: jsdom applies no stylesheet, computes no layout and ships no
// `ResizeObserver`. So a chart that measures its container renders **zero
// marks** in every unit and component test — which is correct there and means
// this spec is the only instrument that can tell a chart from an empty frame.
//
// Four specific things, each of which would ship green without this file:
//
//  1. **That the drawing is inside the Price region**, rather than in a fresh
//     panel beside the one that has been waiting for it since 2026-09-11.
//     Story 2.12's own amendment names this as the concrete defect to avoid.
//  2. **That the chart's breakpoints are the region's rather than the
//     viewport's.** `CHARTING.md` §2 measured the Price region at 1,019px on a
//     1920 viewport and 342px at 390 — a chart keyed on the window would be at
//     its widest treatment inside a region that had already collapsed to a
//     column. `chart-density.ts` takes a region width for that reason and
//     nothing below here can check that it is given one.
//  3. **That the line does not run under its own value labels.** The gutter is
//     an input to the horizontal range rather than padding applied afterwards,
//     and the failure is a chart that looks right at one width and wrong at
//     another.
//  4. **That the directional wash is painted at all** (Task 2.12.5). A fill
//     whose ink is a consumer's responsibility renders invisibly when the
//     consumer forgets — `CLAUDE.md` records it as the `--marker-color` trap —
//     and no stylesheet is applied below this level, so nothing else in this
//     repository can tell a tinted area from an untinted one.
//
// ## What a green run here does not certify
//
//   - **Not that the prices are right.** `chart-geometry.test.ts` verifies the
//     marks against the recorded response body; nothing in a browser can tell a
//     correct series from a plausible one.
//   - **Not that there are any bars at all.** CI's store holds 518 securities
//     and zero bars, because `verify.yml` never runs a backfill — it is metered
//     and `verify` has no credentials on purpose. So every assertion below is
//     either data-independent or branched, exactly as `security-series.spec.ts`
//     is, and the frame being data-independent is what makes that possible.

const EXPLORER = "/securities/NVDA";

/** The three viewports this product is built and reviewed at. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "phone", width: 390, height: 780 },
] as const;

function priceRegion(page: Page) {
  return page.getByRole("region", { name: "Price" });
}

/**
 * The plot itself — the element the value gutter sits beside.
 *
 * By what it contains rather than by a class name: a CSS Module hash changes
 * whenever the file does, and the chart's SVG is the only one in this region
 * with `<line>` elements in it. `Icon` also renders an SVG and appears here in
 * the retryable-failure state, which is how a bare `locator("svg")` would come
 * to count two.
 */
function plot(page: Page) {
  return priceRegion(page).locator("svg:has(line)");
}

/**
 * The panel has settled on an answer — **either** answer.
 *
 * `security-series.spec.ts`'s helper and its reason: a populated window says how
 * much it holds and an empty one says there is nothing stored for it, both are
 * 200s, and which one a run lands in is a property of the environment rather
 * than of the code.
 */
function anAnswer(page: Page) {
  return priceRegion(page)
    .getByText(/Holding .* bars/)
    .or(priceRegion(page).getByText(/No bars stored for this window/))
    .first();
}

/** Did this run land on a store with bars in it? */
function hasBars(page: Page): Promise<boolean> {
  return priceRegion(page)
    .getByText(/Holding .* bars/)
    .first()
    .isVisible();
}

for (const viewport of VIEWPORTS) {
  test(`the chart is inside the Price region at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto(EXPLORER);

    const region = priceRegion(page);
    await expect(region).toBeVisible();
    await expect(plot(page)).toBeVisible();

    // Inside, and **only** inside it. The concrete defect Story 2.12's own
    // amendment names is a chart dropped into a fresh panel beside the region
    // that has been waiting for it — which would leave the Volume region's
    // placeholder holding a drawing it does not own. Story 2.13 fills that one,
    // and until it does the region says so in a sentence and draws nothing.
    await expect(
      page.getByRole("region", { name: "Volume" }).locator("svg"),
    ).toHaveCount(0);

    // The plot has real pixels in it. An unmeasured chart renders a 0×0 SVG,
    // which is visible to nobody and to no other level of testing.
    const box = await plot(page).boundingBox();
    expect(box?.width).toBeGreaterThan(100);
    expect(box?.height).toBeGreaterThan(100);

    await expectNothingFailedToRender(page);
  });
}

test("the plot stops where the value gutter starts", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(plot(page)).toBeVisible();

  // Waited for rather than probed: `isVisible()` answers immediately, so asking
  // before the fetch has landed reports "no bars" on a store that has them and
  // skips the test that was the point of the run.
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  const region = await priceRegion(page).boundingBox();
  const box = await plot(page).boundingBox();

  // The gutter is 56px at this width. Asserted as *a gap of roughly the right
  // size* rather than as the number, because the token is the source of truth
  // and a spec that spelled 56 would be a second copy of it — but a plot drawn
  // to the region's full width is the defect, and that is a difference of zero.
  const gutter = (region?.width ?? 0) - (box?.width ?? 0);
  expect(gutter).toBeGreaterThan(20);
  expect(gutter).toBeLessThan(120);
});

test("the plot is shorter on a narrow region than on a wide one", async ({
  page,
}) => {
  // The density table keys on the **region's** width, and the only way to see
  // that it does is to change the viewport and watch the plot's height move
  // across the 600px-of-region boundary. `--chart-height` is 280 and
  // `--chart-height-compact` is 220; this asserts the relationship rather than
  // either number, because the values are tokens and this spec does not own
  // them.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(plot(page)).toBeVisible();
  const wide = await plot(page).boundingBox();

  await page.setViewportSize({ width: 390, height: 780 });
  await expect(plot(page)).toBeVisible();
  const narrow = await plot(page).boundingBox();

  expect(narrow?.height).toBeLessThan(wide?.height ?? 0);
  // And it is still a chart: the axis never disappears, which is the rule the
  // density table exists to hold. A plot with no axis is a sparkline, and a
  // sparkline is a different product.
  //
  // A **count** and not `toBeVisible`, which is a real property of SVG rather
  // than a workaround: Playwright's visibility check is a non-empty bounding
  // box, and a horizontal gridline is zero pixels tall. Every mark on this
  // chart except the series is therefore "hidden" to that check, and a spec
  // written the obvious way goes red against a chart that is on the screen.
  expect(await plot(page).locator("line").count()).toBeGreaterThan(0);
});

test("the directional wash is actually painted", async ({ page }) => {
  // **The one thing about Task 2.12.5 that only a browser can see**, and it is
  // the `--marker-color` trap in its natural habitat: a fill whose ink comes
  // from somewhere else renders *invisibly* when the somewhere else is missing.
  // No error, correct DOM, green `pnpm verify` — jsdom applies no stylesheet, so
  // a component test can assert the class is present and can never assert that
  // the class paints anything.
  //
  // `PriceChart.tsx` answers that structurally with a total map over the three
  // directions, which is why this spec asks the cheap question rather than a
  // per-direction one: is the area filled with a colour at all.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(plot(page)).toBeVisible();

  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  // The area is the closed path; the series is the open one. Counted rather
  // than checked for visibility, for this file's own recorded reason.
  const paths = plot(page).locator("path");
  expect(await paths.count()).toBe(2);

  const fills = await paths.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).fill),
  );

  // One filled and one not: the wash is an area and the close line is a stroke
  // that must never be filled, which would flood the plot with near-black.
  expect(fills.filter((fill) => fill === "none")).toHaveLength(1);
  const wash = fills.find((fill) => fill !== "none") ?? "";

  // **Read as three channels rather than compared to a string**, and the reason
  // is a finding rather than a preference: this spec was first written to assert
  // the fill was *some* colour, and it stayed green with the ink class deleted.
  // SVG's initial `fill` is **black**, not `none` — so this chart's version of
  // the `--marker-color` trap fails loudly (a plot flooded with near-black)
  // rather than invisibly, and a test that only asks "is it painted" asks
  // nothing. The verified break is the class removed; this is what catches it.
  const [red, green, blue] = (wash.match(/\d+/g) ?? []).map(Number);
  expect(red).toBeGreaterThan(WASH_FLOOR);
  expect(green).toBeGreaterThan(WASH_FLOOR);
  expect(blue).toBeGreaterThan(WASH_FLOOR);

  // And it is not the panel's own ground, which is the other end of the same
  // range and is what an area that has stopped saying anything looks like.
  expect(wash).not.toBe("rgb(255, 255, 255)");
});

/**
 * The lightest any wash channel is not.
 *
 * The three inks are `#e6f2ec`, `#fbeae9` and `#eef0f6` — every channel above
 * 0xe6 — and the point of the number is that it is far above black rather than
 * near the tokens. A spec that spelled the hexes would be a second copy of
 * `market.css`; this asserts the *class* of colour a wash is.
 */
const WASH_FLOOR = 0xd0;

test("nothing the chart draws makes the page scroll sideways", async ({
  page,
}) => {
  // The specific failure: the leftmost time label is centred on pixel zero and
  // hangs half its width off the left edge, into a `Region` that declares
  // `overflow: auto`. The symptom is a horizontal scrollbar under a chart at
  // every width, which no unit test can see and which is easy to reintroduce by
  // deleting one class.
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto(EXPLORER);
  await expect(plot(page)).toBeVisible();

  const overflowing = await priceRegion(page).evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  expect(overflowing).toBe(false);
});
