import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { expectNoAxeViolations } from "../support/axe.js";
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
//  4. **That both directional washes are painted, and differ** (Task 2.12.5).
//     No stylesheet is applied below this level, so nothing else in this
//     repository can tell a tinted area from an untinted one — or tell two inks
//     from one ink used twice, which is the shape of the thing this chart got
//     wrong first.
//  5. **That the span which was asked for and is not held has a ground behind
//     it** (Task 2.12.7). Same reason as 4 and a worse failure: a line that
//     stops early over nothing reads as data that went flat, and `partial` is
//     the state this screen is in most of the time.
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

  // **Polled rather than read once**, and that is a repair to a flake rather
  // than defensive padding. The chart sizes itself from a `ResizeObserver`, so
  // a viewport change reaches the plot's height one frame *after* the resize
  // returns — and `toBeVisible()` is satisfied immediately, because the element
  // was already visible at the old size. Read once, this test asserts the wide
  // height against itself and fails at 281 against 281, intermittently and
  // only under load. Found on 2026-09-12 running this file beside another;
  // `the readout reserves its height` had the same cause and the same shape.
  await expect
    .poll(async () => (await plot(page).boundingBox())?.height ?? 0)
    .toBeLessThan(wide?.height ?? 0);
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

test("the directional wash is painted, on both sides of the rule", async ({
  page,
}) => {
  // **The one thing about Task 2.12.5 that only a browser can see.** No
  // stylesheet is applied below this level, so a component test can assert the
  // class is present and can never assert that the class paints anything.
  //
  // Since 2026-09-12 there are two of them: the area is one path drawn twice,
  // clipped above and below the reference rule, so the tint is a function of
  // position rather than of the window. Both have to be painted **and they have
  // to differ** — one wash for both sides is the revision undone.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(plot(page)).toBeVisible();

  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  // Two `<use>`, one `<path>` for them to reference, and one for the line.
  // Counted rather than checked for visibility, for this file's own recorded
  // reason — and the path count is the constraint `CHARTING.md` §1 cares about:
  // a second copy of a 1,950-point string would be two closed paths here.
  const washes = plot(page).locator("use");
  expect(await washes.count()).toBe(2);
  expect(await plot(page).locator("path").count()).toBe(2);

  const fills = await washes.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).fill),
  );

  // **Read as three channels rather than compared to a string**, and the reason
  // is a finding rather than a preference: this spec was first written to assert
  // the fill was *some* colour, and it stayed green with the ink class deleted.
  // SVG's initial `fill` is **black**, not `none` — so this chart's version of
  // the `--marker-color` trap fails loudly (a plot flooded with near-black)
  // rather than invisibly, and a test that only asks "is it painted" asks
  // nothing. The verified break is the class removed; this is what catches it.
  for (const fill of fills) {
    const [red, green, blue] = (fill.match(/\d+/g) ?? []).map(Number);
    expect(red).toBeGreaterThan(WASH_FLOOR);
    expect(green).toBeGreaterThan(WASH_FLOOR);
    expect(blue).toBeGreaterThan(WASH_FLOOR);
    // Not the panel's own ground, which is the other end of the same range and
    // is what an area that has stopped saying anything looks like.
    expect(fill).not.toBe("rgb(255, 255, 255)");
  }

  // And the two are not the same colour. Both classes resolving to one ink is
  // exactly the pre-revision behaviour — a single tint over both sides of the
  // rule — and every assertion above passes against it.
  expect(fills[0]).not.toBe(fills[1]);
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

test("the span that was asked for and is not held has a ground behind it", async ({
  page,
}) => {
  // **Task 2.12.7's one browser-only claim.** No stylesheet is applied below
  // this level, so nothing else in this repository can tell a washed region
  // from an unwashed one — and the failure mode is the quiet kind: a chart
  // whose line stops early with nothing behind the gap reads as data that went
  // flat, which is the defect the treatment exists to prevent.
  //
  // Branched rather than skipped on an empty store, and that is the useful half
  // here: `empty` is this same treatment at coverage zero, so CI — which holds
  // 518 securities and no bars — exercises the whole-plot case while a
  // developer's store exercises the ordinary short one. A **complete** answer
  // is the one state with nothing to assert, and it is the one that skips.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(plot(page)).toBeVisible();
  await expect(anAnswer(page)).toBeVisible();

  const complete = await priceRegion(page)
    .getByText(/Holding all /)
    .isVisible();
  if (complete) test.skip(true, "this store covers the whole window");

  // A direct child of the plot's SVG: the only other rects this chart draws are
  // inside `<clipPath>` elements, which paint nothing and are not children of
  // the SVG root.
  const grounds = plot(page).locator("> rect");
  expect(await grounds.count()).toBeGreaterThan(0);

  const painted = await grounds.evaluateAll((elements) =>
    elements.map((element) => ({
      fill: getComputedStyle(element).fill,
      width: element.getBoundingClientRect().width,
    })),
  );

  for (const ground of painted) {
    // Painted, and **not** the panel's own ground — which is what an uncovered
    // region with its class deleted would look like, and is invisible to a test
    // that only asks whether a rect is there. This is the same shape as the
    // wash's own recorded finding one test above, taken deliberately rather
    // than by analogy: SVG's initial fill is black, so "is it painted" passes
    // against a plot flooded with near-black.
    expect(ground.fill).not.toBe("rgb(255, 255, 255)");
    const [red, green, blue] = (ground.fill.match(/\d+/g) ?? []).map(Number);
    expect(red).toBeGreaterThan(WASH_FLOOR);
    expect(green).toBeGreaterThan(WASH_FLOOR);
    expect(blue).toBeGreaterThan(WASH_FLOOR);
    // A region rather than a mark. A sub-pixel sliver is the state the
    // geometry's floor exists to drop.
    expect(ground.width).toBeGreaterThan(1);
  }

  // And where there are bars there is an edge between the two grounds, because
  // the two pale fills either side of it differ by 1.038:1 and 1.051:1 — which
  // is to say by nothing. Counted rather than checked for visibility: a
  // vertical line is zero pixels wide to Playwright's bounding-box check, which
  // is this file's own recorded finding.
  if (await hasBars(page)) {
    const seams = await plot(page).locator("line").count();
    // Gridlines, seams, the reference rule and the edge. The number is not the
    // assertion — that there is more than a frame's worth is.
    expect(seams).toBeGreaterThan(1);
  }

  await expectNothingFailedToRender(page);
});

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

// **Reading a point** (Task 2.12.6) — the pointer path, which jsdom cannot see.
//
// `ChartReading.test.tsx` drives the keyboard and the announcement, because
// those are a model rather than a layout. What is genuinely only visible here is
// a **pointer over a plot that has a size**: jsdom has no layout, so the
// arithmetic from a client X to a bar has nothing to be relative to and a
// component test that faked one would be testing its own stub.
//
// Task 2.12.8 walks the keyboard path end to end with a screen reader. These are
// the three properties that would ship broken without a browser.

/** The one tab stop the chart has. */
function reader(page: Page) {
  return priceRegion(page).getByRole("img", { name: /price chart$/ });
}

/** The strip under the axis, in whichever of its two states it is in. */
function readout(page: Page) {
  return priceRegion(page)
    .getByText(/Point at the chart/)
    .or(
      priceRegion(page)
        .getByText(/EDT|EST/)
        .first(),
    );
}

test("a pointer over the plot reads the bar under it, and leaving clears it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  // Resting: the invitation, which is the only thing on this page that says the
  // chart answers questions at all — and the only thing anywhere that says the
  // keyboard path exists.
  await expect(priceRegion(page).getByText(/Point at the chart/)).toBeVisible();

  const box = await reader(page).boundingBox();
  if (box === null) throw new Error("the reading layer has no box");

  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);

  // A market instant, four prices and the bar's own change. The prices are
  // where three quarters of every bar in the store reaches a person:
  // `CHARTING.md` §2 chose a line of closes over candlesticks *on the grounds
  // that this readout exists*.
  await expect(readout(page)).toContainText(/\d{2}:\d{2}\s+(EDT|EST)/);
  await expect(
    priceRegion(page).getByText("Bar", { exact: true }),
  ).toBeVisible();

  // One crosshair and one disc, and **counted rather than checked for
  // visibility** — this file's own recorded finding: a vertical line is zero
  // pixels wide to Playwright's bounding-box check, so `toBeVisible()` reports
  // hidden against a crosshair that is on the screen.
  expect(await reader(page).locator("line").count()).toBe(1);
  expect(await reader(page).locator("circle").count()).toBe(1);

  // Off the plot entirely, which is the state the chart spends its life in.
  await page.mouse.move(box.x + box.width / 2, box.y - 80);
  await expect(priceRegion(page).getByText(/Point at the chart/)).toBeVisible();
  expect(await reader(page).locator("circle").count()).toBe(0);
});

test("the readout reserves its height, so nothing below it moves", async ({
  page,
}) => {
  // **The claim only a browser can check**, and the defect it prevents is the
  // one that makes a page feel cheap: a strip that appears when a pointer
  // enters the plot pushes every exact figure beneath it down by a line, under
  // the hand of somebody reading them.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  // **Waited for the resting strip before measuring anything**, and this is a
  // correction rather than caution: without it the "before" reading is
  // sometimes taken while the chart is still settling. The plot measures itself
  // with a `ResizeObserver`, so the strip arrives a frame after the answer
  // does — and a `y` captured in that gap moves for a reason that has nothing
  // to do with a reading appearing. The test failed once that way and passed
  // alone, which is the shape of a flake that would have been re-run until
  // green instead of understood.
  await expect(priceRegion(page).getByText(/Point at the chart/)).toBeVisible();

  const prices = priceRegion(page).getByText("Open", { exact: true });
  const before = await prices.boundingBox();

  const box = await reader(page).boundingBox();
  if (box === null) throw new Error("the reading layer has no box");
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
  await expect(
    priceRegion(page).getByText("Bar", { exact: true }),
  ).toBeVisible();

  const after = await prices.boundingBox();

  // The same y, to the pixel. Not "roughly": the reserved height is a token and
  // either it is reserved or it is not.
  expect(after?.y).toBe(before?.y);
});

test("the chart is one tab stop, and it is reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  // Focused directly rather than tabbed to: **the count of stops before it is
  // Task 2.12.8's**, which walks the whole page at three viewports. What this
  // asserts is the property that would make that walk impossible — that the
  // chart is one stop rather than one per bar, and that arriving on it produces
  // a reading rather than a focused rectangle that says nothing.
  await reader(page).focus();
  await expect(
    priceRegion(page).getByText("Bar", { exact: true }),
  ).toBeVisible();
  expect(await reader(page).locator("circle").count()).toBe(1);

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Home");
  await expect(
    priceRegion(page).getByText("Bar", { exact: true }),
  ).toBeVisible();

  // Escape clears the reading and **keeps the focus**, which is the whole reason
  // the focus ring is on the plot rather than on a disc that has just gone.
  await page.keyboard.press("Escape");
  await expect(priceRegion(page).getByText(/Point at the chart/)).toBeVisible();
  expect(
    await reader(page).evaluate(
      (element) => element === document.activeElement,
    ),
  ).toBe(true);

  // And the whole assembled page, with a reading on screen. axe is a gate here
  // rather than a report, and a focusable element that gained a name, a
  // description and a role today is exactly the shape of thing it catches.
  await page.keyboard.press("End");
  await expectNoAxeViolations(page, "the price chart with a reading on it");
});
