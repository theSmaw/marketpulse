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
//  6. **That the volume plot is in the Volume region and stops at the same
//     pixel as the price line** (Task 2.13.4). Two plots that each built their
//     own axis would agree at every width, until one was measured a frame later
//     than the other — and nothing that computes no layout can see a pixel of
//     either. This is also the second **fill** on this axis, so the axis rule's
//     own pixel is asserted twice below.
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

function volumeRegion(page: Page) {
  return page.getByRole("region", { name: "Volume" });
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
 * The volume plot, located the same way and for the same reason.
 *
 * `svg:has(line)` here too rather than a bare `locator("svg")`: the seams and
 * the coverage edge are the only `<line>` elements this plot draws, and no icon
 * in this region has one.
 */
function volumePlot(page: Page) {
  return volumeRegion(page).locator("svg:has(line)");
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
    .getByText("Close", { exact: true })
    .or(priceRegion(page).getByText(/No bars stored for this window/))
    .first();
}

/**
 * Does this store cover the whole window it was asked for?
 *
 * Read from the chart's text alternative, which is where that fact lives since
 * 2026-09-14 — the panel's coverage sentence came off, and the alternative had
 * been stating the same thing all along, counted in the axis's own trading
 * minutes.
 */
async function isComplete(page: Page): Promise<boolean> {
  const said = (await priceRegion(page).textContent()) ?? "";
  return said.includes("the full width of the window asked for");
}

/** Did this run land on a store with bars in it? */
function hasBars(page: Page): Promise<boolean> {
  return priceRegion(page)
    .getByText("Close", { exact: true })
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
    // that has been waiting for it.
    //
    // **Amended by Task 2.13.4, which filled the Volume region.** This used to
    // assert that region held no SVG at all, and that assertion was the fence
    // rather than the rule: what it was protecting was *one drawing per region*,
    // which is now asserted as exactly one plot in each rather than as an
    // absence in one of them. The same fence was changed rather than deleted
    // when Story 2.12 took down `security-series.spec.ts`'s.
    await expect(plot(page)).toHaveCount(1);
    await expect(volumePlot(page)).toHaveCount(1);

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

  // **Completeness comes off the chart's own text alternative** since
  // 2026-09-14, when the panel's coverage sentence was removed: it is the same
  // fact from the same body, and it is the surface that still states it.
  const complete = await isComplete(page);
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

/**
 * The bar's own change, in the **live** half of the readout.
 *
 * `filter({ visible: true })` and not a bare text query, because the strip holds
 * two rows in one grid cell since Task 2.12.8: the live one and a hidden
 * reading of the last bar that reserves the row's height. Both carry the label,
 * so an unfiltered locator resolves to two nodes and fails strict mode against
 * a chart that is working.
 */
function barLabel(page: Page) {
  return priceRegion(page)
    .getByText("Bar", { exact: true })
    .filter({ visible: true });
}

/**
 * The strip, resting — which since 2026-09-14 is **blank**.
 *
 * It used to hold an invitation, and a spec could wait for that sentence. With
 * the sentence gone the resting state is asserted the only way it can be: no
 * live `Bar` label, and a hidden one still there reserving the row. The second
 * half is what stops this passing against a strip that has stopped reserving
 * anything, which is the whole property the three-viewport test below is about.
 */
function restingStrip(page: Page) {
  return priceRegion(page)
    .getByText("Bar", { exact: true })
    .filter({ visible: false });
}

/**
 * The **live** line of the price strip — the row the `BAR` label sits in.
 *
 * **This replaced a helper that resolved to the invitation or, failing that, to
 * the first `EDT` in the Price region** (Task 2.13.5). The fallback was the
 * defect: the panel's own live sentence is *NVDA: holding 390 bars, through
 * 2026-09-04 16:00:00 EDT…*, so an assertion asking for *some* clock time was
 * green against a chart nobody had pointed at. It was found by asking the two
 * strips for the **same specific minute** and failing to make that pass.
 */
function priceStrip(page: Page) {
  return barLabel(page).locator("../..");
}

test("a pointer over the plot reads the bar under it, and leaving clears it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  // Resting: the strip is blank to a reader and still holding its height open.
  await expect(restingStrip(page)).toHaveCount(1);
  await expect(barLabel(page)).toHaveCount(0);

  const box = await reader(page).boundingBox();
  if (box === null) throw new Error("the reading layer has no box");

  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);

  // A market instant, four prices and the bar's own change. The prices are
  // where three quarters of every bar in the store reaches a person:
  // `CHARTING.md` §2 chose a line of closes over candlesticks *on the grounds
  // that this readout exists*.
  //
  // **Against the row the `BAR` label sits in, since Task 2.13.5.** This asked
  // the `readout` helper for *some* clock time, and the helper falls back to
  // the first `EDT` in the Price region — which the panel's own live sentence
  // (*holding 390 bars, through 2026-09-04 16:00:00 EDT*) satisfies. It was
  // green against a chart nobody had pointed at.
  await expect(barLabel(page)).toBeVisible();
  await expect(priceStrip(page)).toContainText(/\d{2}:\d{2}\s+(EDT|EST)/);

  // One crosshair and one disc, and **counted rather than checked for
  // visibility** — this file's own recorded finding: a vertical line is zero
  // pixels wide to Playwright's bounding-box check, so `toBeVisible()` reports
  // hidden against a crosshair that is on the screen.
  expect(await reader(page).locator("line").count()).toBe(1);
  expect(await reader(page).locator("circle").count()).toBe(1);

  // Off the plot entirely, which is the state the chart spends its life in.
  await page.mouse.move(box.x + box.width / 2, box.y - 80);
  await expect(restingStrip(page)).toHaveCount(1);
  expect(await reader(page).locator("circle").count()).toBe(0);
});

// **The reserved height, at all three viewports** (Task 2.12.8 — it ran at one).
//
// The defect it prevents is the one that makes a page feel cheap: a strip that
// grows when a pointer enters the plot pushes every exact figure beneath it
// down by a line, under the hand of somebody reading them.
//
// **It ran at 1440 only, and 1440 was the one width where it could not fail.**
// Walked on 2026-09-12: the reserved height was a single token, and a reading
// wraps at widths the invitation does not — so the strip measured 20px at rest
// against 36px with a reading at a 1024 viewport, and 40 against 54 at 768 and
// at 390. The figures moved **18 to 32 pixels** at every viewport but the
// widest, with `pnpm verify` green and this spec green. The repair is a hidden
// reading in the same grid cell, so the reservation is a measurement of the
// real thing at the real width rather than a number chosen at one viewport.
for (const viewport of VIEWPORTS) {
  test(`the readout reserves its height at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto(EXPLORER);
    await expect(anAnswer(page)).toBeVisible();
    if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

    // **Waited for the resting strip before measuring anything**, and this is a
    // correction rather than caution: without it the "before" reading is
    // sometimes taken while the chart is still settling. The plot measures
    // itself with a `ResizeObserver`, so the strip arrives a frame after the
    // answer does — and a `y` captured in that gap moves for a reason that has
    // nothing to do with a reading appearing. The test failed once that way and
    // passed alone, which is the shape of a flake that would have been re-run
    // until green instead of understood.
    await expect(restingStrip(page)).toHaveCount(1);

    const prices = priceRegion(page).getByText("Open", { exact: true });

    // **Measured against the document rather than the viewport**, which is what
    // makes this assertable at the two narrow sizes at all: the chart is below
    // the fold there, so reaching it scrolls the page and a viewport-relative
    // `y` moves by the scroll rather than by the defect. Written the obvious way
    // first, it reported a 111px jump at 430 and 0 at 1440 — the wrong number at
    // both.
    const documentY = () =>
      prices.evaluate(
        (element) => element.getBoundingClientRect().top + window.scrollY,
      );

    /**
     * The same figure, once it has stopped moving on its own.
     *
     * **Not caution, and not a fixed wait.** The chart sizes itself from a
     * `ResizeObserver`, so at the two narrow viewports the plot's height and
     * everything below it settle a frame or more after the answer lands — a
     * `before` captured in that gap is compared against a page that then moved
     * for a reason that has nothing to do with a reading. Seen as an 82px jump
     * at 390 on a run that passed at 1440 and 1024, which is the shape of the
     * flake this file has already recorded twice.
     */
    const settled = async () => {
      let last = await documentY();
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await page.waitForTimeout(100);
        const next = await documentY();
        if (next === last) return next;
        last = next;
      }
      return last;
    };

    await reader(page).scrollIntoViewIfNeeded();
    const before = await settled();
    const box = await reader(page).boundingBox();
    if (box === null) throw new Error("the reading layer has no box");
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
    await expect(barLabel(page)).toBeVisible();

    // The same y, to the pixel. Not "roughly": either the row is reserved or it
    // is not.
    expect(await documentY()).toBe(before);
  });
}

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
  await expect(barLabel(page)).toBeVisible();
  expect(await reader(page).locator("circle").count()).toBe(1);

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Home");
  await expect(barLabel(page)).toBeVisible();

  // Escape clears the reading and **keeps the focus**, which is the whole reason
  // the focus ring is on the plot rather than on a disc that has just gone.
  await page.keyboard.press("Escape");
  await expect(restingStrip(page)).toHaveCount(1);
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

// ---------------------------------------------------------------------------
// The text alternative, and the one measurement that was prose until today
// (Task 2.12.8)
// ---------------------------------------------------------------------------

// **What the picture says to somebody who cannot see it, on the assembled
// page.**
//
// `chart-alternative.test.ts` owns the words and `PriceChart.test.tsx` owns the
// wiring; neither can see what this one can, which is that the description
// resolves **in a real accessibility tree** against a chart that has measured
// itself. The specific failure it catches is an `aria-describedby` naming an id
// that is not in the document: it computes correctly, renders identically, and
// describes nothing.
test("the chart's one tab stop carries a description of the picture", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  const described = await reader(page).evaluate((element) =>
    (element.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" "),
  );

  // What it is, then what the keys do with it. Both halves, and the order:
  // a listener told how to operate something before being told what it is has
  // to hold the instruction until the subject arrives.
  expect(described).toMatch(
    /^NVDA price chart: a line of [\d,]+ closing prices/,
  );
  expect(described).toContain("left and right arrow keys");

  // And the clause that only this surface can carry. How much of the frame the
  // line occupies reaches a sighted reader as a change of ground behind the
  // plot; there is no such channel in a sentence, so it is said in words —
  // either as a full window or as a count of the axis's own units.
  expect(described).toMatch(
    /runs the full width of the window asked for|covers (the first )?[\d,]+ of [\d,]+ trading minutes|not the whole window/,
  );
});

// **The plot is measured to the area there is to draw in, and not to the axis
// rule as well.**
//
// This left `CLAUDE.md`'s gap list by being made mechanical, which is the
// migration that list wants. It was prose with a re-measure that meant opening
// a page and looking at it: the plot's bottom border **is** the axis rule and a
// bounding rect includes it, so the measured height was one pixel taller than
// the drawable box. Every stroke tolerated that — a hairline a pixel low lands
// under a near-black rule and is invisible — and a **fill** does not: the
// uncovered ground painted straight over the axis, so the frame appeared to
// stop at the coverage edge, which is the exact impression the treatment exists
// to prevent.
//
// jsdom implements neither `offsetHeight` nor `clientHeight`, so the correction
// reads as zero there and every component test is identical with the repair and
// without it. A browser is the only place the border exists.
//
// **Verified by restoring the break**: deleting the `offsetHeight -
// clientHeight` subtraction in `usePlotSize` takes this red.
test("the uncovered ground stops above the axis rule", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(plot(page)).toBeVisible();
  await expect(anAnswer(page)).toBeVisible();

  // **Completeness comes off the chart's own text alternative** since
  // 2026-09-14, when the panel's coverage sentence was removed: it is the same
  // fact from the same body, and it is the surface that still states it.
  const complete = await isComplete(page);
  if (complete) test.skip(true, "this store covers the whole window");

  const gap = await plot(page).evaluate((svg) => {
    const ground = svg.querySelector(":scope > rect");
    const box = svg.parentElement;
    if (ground === null || box === null) return null;
    return (
      box.getBoundingClientRect().bottom - ground.getBoundingClientRect().bottom
    );
  });

  // Exactly the rule's own pixel: above zero, because a ground flush with the
  // plot's bottom edge has painted over the axis, and below two, because a
  // larger gap is a plot measured to something other than its content box.
  expect(gap).not.toBeNull();
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThan(2);
});

// ---------------------------------------------------------------------------
// **Volume, on the same axis** (Task 2.13.4)
// ---------------------------------------------------------------------------

for (const viewport of VIEWPORTS) {
  test(`the volume plot is inside the Volume region at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto(EXPLORER);

    await expect(volumeRegion(page)).toBeVisible();
    await expect(volumePlot(page)).toHaveCount(1);

    // Real pixels. An unmeasured chart renders a 0×0 SVG, which is visible to
    // nobody and to no other level of testing — and this plot is deliberately a
    // third of the height of the one above it, so the floor is lower.
    const box = await volumePlot(page).boundingBox();
    expect(box?.width).toBeGreaterThan(100);
    expect(box?.height).toBeGreaterThan(40);

    // **Counted rather than checked for visibility**, which is this file's own
    // recorded finding and is a real property of SVG: Playwright's visibility
    // check is a non-empty bounding box, and a vertical seam is zero pixels
    // wide. Every mark on this plot except the columns reports `hidden` against
    // a chart that is on the screen.
    expect(await volumePlot(page).locator("line").count()).toBeGreaterThan(0);

    // And **no gridlines** — every line here is a seam or a coverage edge, both
    // vertical. A horizontal rule inside this plot would be a value scale that
    // §9.4 declined: volume is read comparatively, this bar against its
    // neighbours, not off a scale.
    const horizontal = await volumePlot(page)
      .locator("line")
      .evaluateAll(
        (lines) =>
          lines.filter(
            (line) => line.getAttribute("y1") === line.getAttribute("y2"),
          ).length,
      );
    expect(horizontal).toBe(0);

    await expectNothingFailedToRender(page);
  });
}

test("the two plots hang on one axis and stop at the same pixel", async ({
  page,
}) => {
  // **The property this task is built around**, and the one nothing below a
  // browser can see: `VOLUME-AND-WINDOW.md` §13.1, and `CHARTING.md` §17.5 item
  // 4 naming it as the thing a second plot most often gets wrong.
  //
  // The failure is quiet. Two components that each called `timeAxis` on the same
  // window would produce identical numbers at every width where both had been
  // measured — and differ for one frame on every resize, and permanently if one
  // of them ever measured a different box. The repair is structural (one
  // `timeFrame` above both), and this is what checks the structure held.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(plot(page)).toBeVisible();
  await expect(volumePlot(page)).toBeVisible();
  await expect(anAnswer(page)).toBeVisible();

  const edges = (locator: ReturnType<typeof plot>) =>
    locator.locator("line").evaluateAll((lines) =>
      lines
        .filter((line) => line.getAttribute("x1") === line.getAttribute("x2"))
        .map((line) => line.getAttribute("x1"))
        .sort(),
    );

  // The frames themselves, first: two plots of different widths could not stop
  // at the same pixel whatever their arithmetic said.
  const priceBox = await plot(page).boundingBox();
  const volumeBox = await volumePlot(page).boundingBox();
  expect(volumeBox?.x).toBeCloseTo(priceBox?.x ?? -1, 1);
  expect(volumeBox?.width).toBeCloseTo(priceBox?.width ?? -1, 1);

  // Then every vertical mark on them — the session seams and the coverage edge.
  // Identical strings, not merely a similar count: these are the same values
  // from one `TimeFrame`, and anything else means two derivations.
  expect(await edges(volumePlot(page))).toEqual(await edges(plot(page)));

  // And the uncovered ground, where this store has one — which is the mark that
  // says where the data stopped, painted separately in each frame.
  // **Completeness comes off the chart's own text alternative** since
  // 2026-09-14, when the panel's coverage sentence was removed: it is the same
  // fact from the same body, and it is the surface that still states it.
  const complete = await isComplete(page);

  if (!complete) {
    const ground = (locator: ReturnType<typeof plot>) =>
      locator.locator("> rect").evaluateAll((rects) =>
        rects.map((rect) => {
          const box = rect.getBoundingClientRect();
          return [Math.round(box.x * 10), Math.round(box.width * 10)];
        }),
      );

    expect(await ground(volumePlot(page))).toEqual(await ground(plot(page)));
  }

  await expectNothingFailedToRender(page);
});

// **The axis rule's own pixel, for the second fill on this axis** (Task
// 2.13.4, and Task 2.12.7's finding).
//
// `CHARTING.md` §14.5: the plot's bottom border *is* the axis rule and
// `getBoundingClientRect()` includes it, so the measured height is one pixel
// taller than the drawable box. Every stroke tolerated that and the uncovered
// ground did not — it painted over the axis and stayed invisible for three
// tasks.
//
// The volume columns are the **second** fill this axis carries, and they grow
// from the baseline, so a one-pixel error puts every column's foot on top of the
// rule they are measured from. jsdom implements neither `offsetHeight` nor
// `clientHeight`, so the correction is zero there and no component test is
// different with the repair or without it.
//
// **Verified by restoring the break**: deleting the `offsetHeight -
// clientHeight` subtraction in `use-plot-box.ts` takes this and its price-plot
// twin red together.
test("the volume columns stop above the axis rule", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(volumePlot(page)).toBeVisible();
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  const gap = await volumePlot(page).evaluate((svg) => {
    const columns = svg.querySelector("path");
    const box = svg.parentElement;
    if (columns === null || box === null) return null;
    return (
      box.getBoundingClientRect().bottom -
      columns.getBoundingClientRect().bottom
    );
  });

  // Exactly the rule's own pixel: above zero, because columns flush with the
  // plot's bottom edge have painted over the baseline they are measured from,
  // and below two, because a larger gap is a plot measured to something other
  // than its content box — which would float every column above its own zero.
  expect(gap).not.toBeNull();
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThan(2);
});

test("the volume plot says what it is, for a reader who cannot see it", async ({
  page,
}) => {
  // The plot, its one value label and its two dates are all `aria-hidden`, for
  // the price chart's reason: they are labels *on a picture*, and read aloud in
  // document order they are an abbreviated number and two dates with no subject
  // between them. Without the sentence this asserts, the Volume region is a
  // heading with nothing in the accessibility tree under it.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(volumePlot(page)).toBeVisible();
  await expect(anAnswer(page)).toBeVisible();

  // It names its own subject — `FRONTEND-STATE.md` §7 — so it can never be
  // mistaken for the price chart's sentence, and a locator for one resolves to
  // exactly one node.
  await expect(volumeRegion(page).getByText(/NVDA volume chart/)).toHaveCount(
    1,
  );

  await expectNoAxeViolations(page, "the security route, volume drawn");
});

// **One reading, two strips** (Task 2.13.5).
//
// `VOLUME-AND-WINDOW.md` §15 decided two readouts rather than one, on the
// arrangement this product actually renders at one column: Price and Volume are
// two `Region` panels with the Abnormal-move region between them, and the price
// panel plus its eight stated facts is taller than a phone — so a single strip
// puts the answer off screen for anybody pointing at a volume bar.
//
// What no level below this can see is that it is **one** reading. jsdom
// computes no layout and has no pointer, so a component test can assert the two
// strips agree about a bar and cannot assert the two crosshairs land on the
// same pixel of a laid-out page.

/**
 * The volume plot's reading layer — the surface a pointer is over.
 *
 * By shape rather than by role, because it deliberately has none: it is not a
 * control, and the one tab stop for the pair is the price plot. It is the only
 * `aria-hidden` element in this region whose **direct** child is an SVG — the
 * plot's own box is not hidden (the canvas inside it is), and the gutter and the
 * axis hold spans.
 */
function volumeReader(page: Page) {
  return volumeRegion(page).locator("div[aria-hidden='true']:has(> svg)");
}

/**
 * The **live** line of the volume strip, told apart from its two reservations.
 *
 * `filter({ visible: true })` cannot do it here: the reservations are
 * `visibility: hidden`, which Playwright reports as hidden, but the whole strip
 * is `aria-hidden` so a text query lands on the region's heading instead. The
 * live line is the last child of the strip, which is the order the component
 * renders them in and the order a one-cell grid requires.
 */
function volumeStrip(page: Page) {
  return volumeRegion(page).locator("p[aria-hidden='true'] > span").last();
}

test("a pointer over the volume plot reads the bar under it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  // At rest: the window's peak and when it happened. The price strip beside it
  // states nothing at all at rest since 2026-09-14, so the two resting states
  // are now a fact and a blank rather than a fact and a sentence.
  await expect(volumeStrip(page)).toContainText("Peak");

  // **Scrolled to first**, which is not caution: `boundingBox()` is relative to
  // the viewport and this region is below the fold at every viewport this suite
  // runs at, so a mouse move to an un-scrolled box lands outside the window
  // entirely. The failure it produces is the quiet one — the strip keeps its
  // resting state, which states a *different* instant and a *different*
  // grouped integer, so a loosely written assertion passes against a chart
  // nobody pointed at.
  await volumeReader(page).scrollIntoViewIfNeeded();
  const box = await volumeReader(page).boundingBox();
  if (box === null) throw new Error("the volume reading layer has no box");

  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);

  // The resting state is gone, which is what says this is a reading rather than
  // the peak the strip states when nobody is pointing at it.
  await expect(volumeStrip(page)).not.toContainText("Peak");

  // A market instant and an exact, grouped integer — `VOLUME-AND-WINDOW.md`
  // §5a: abbreviate on the axis and in summaries, never in a reading. The
  // gutter above it states the same peak as `3.13M`.
  await expect(volumeStrip(page)).toContainText(/\d{2}:\d{2}\s+(EDT|EST)/);
  await expect(volumeStrip(page)).toContainText(/\d{1,3}(,\d{3})+/);

  // Counted rather than checked for visibility, which is this file's own
  // recorded finding: a vertical line is zero pixels wide to Playwright's
  // bounding-box check.
  expect(await volumeReader(page).locator("line").count()).toBe(1);
  expect(await volumeReader(page).locator("circle").count()).toBe(1);
});

test("the two crosshairs are one reading, at one pixel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  await reader(page).scrollIntoViewIfNeeded();
  const box = await reader(page).boundingBox();
  if (box === null) throw new Error("the reading layer has no box");

  // Pointed at the **price** plot, and the volume plot answers — which is the
  // whole claim. One read position in a wrapper above both regions, two
  // overlays consuming it, and neither plot knowing the other exists.
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2);
  await expect(barLabel(page)).toBeVisible();

  const priceX = await reader(page)
    .locator("line")
    .first()
    .evaluate((line) => line.getBoundingClientRect().x);
  const volumeX = await volumeReader(page)
    .locator("line")
    .first()
    .evaluate((line) => line.getBoundingClientRect().x);

  // The same pixel, not approximately: both marks are placed from one
  // `SlotScale` on one shared `TimeFrame`, so a difference here is two axes
  // rather than a rounding.
  expect(Math.abs(priceX - volumeX)).toBeLessThan(1);

  // And both strips name the same minute, which is the joint that makes two
  // answers legible as one reading.
  //
  // **Against the `BAR` row rather than the `readout` helper**, and the reason
  // is a trap worth leaving written down: that helper falls back to the first
  // `EDT` in the Price region, and the panel's own live sentence — *holding 390
  // bars, through 2026-09-04 16:00:00 EDT* — satisfies it. Every assertion that
  // only asked for *some* clock time has been passing against that sentence.
  const instant = await volumeStrip(page).textContent();
  const minute = /\d{2}:\d{2}\s+(?:EDT|EST)/u.exec(instant ?? "")?.[0];
  expect(minute).toBeDefined();
  await expect(priceStrip(page)).toContainText(minute ?? "");
});

test("the keyboard path drives both plots, and adds no second tab stop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();
  if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

  await reader(page).focus();
  await page.keyboard.press("Home");

  // The first bar of the window, reached through the price plot — and the
  // volume strip follows, with nothing having pointed at it. A second tab stop
  // would be the same reading at twice the cost, and the bar this chart is held
  // to is *one tab stop and never one per bar*.
  await expect(volumeStrip(page)).toContainText(/\d{1,3}(,\d{3})+/);
  await expect(volumeStrip(page)).not.toContainText("Peak");

  // Tab once more and focus is past the whole pair rather than landing on the
  // volume plot.
  await page.keyboard.press("Tab");
  const stillOnTheChart = await reader(page).evaluate(
    (element) => element === document.activeElement,
  );
  expect(stillOnTheChart).toBe(false);
  const insideVolume = await volumeRegion(page).evaluate((region) =>
    region.contains(document.activeElement),
  );
  expect(insideVolume).toBe(false);
});

// **The volume strip's reservation, at all three viewports** (Task 2.13.5).
//
// The price strip's equivalent is above, and this is the same defect measured
// on a strip whose two states are **both figures**. `CHARTING.md` §15.4 found
// that no single reserved height is correct at more than one width, and the
// 1440-only spec that was supposed to catch it could not: 1440 is the one width
// where neither state wraps.
for (const viewport of VIEWPORTS) {
  test(`the volume readout reserves its height at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto(EXPLORER);
    await expect(anAnswer(page)).toBeVisible();
    if (!(await hasBars(page))) test.skip(true, "this store holds no bars");

    await expect(volumeStrip(page)).toContainText("Peak");

    // The next region's heading, which is what actually moves if the strip
    // grows — measured against the document rather than the viewport, because
    // at the two narrow sizes reaching the chart scrolls the page and a
    // viewport-relative `y` moves by the scroll rather than by the defect.
    const below = page.getByRole("region", { name: "Relative performance" });
    const documentY = () =>
      below.evaluate(
        (element) => element.getBoundingClientRect().top + window.scrollY,
      );

    /** The same figure, once it has stopped moving on its own. */
    const settled = async () => {
      let last = await documentY();
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await page.waitForTimeout(100);
        const next = await documentY();
        if (next === last) return next;
        last = next;
      }
      return last;
    };

    await volumeReader(page).scrollIntoViewIfNeeded();
    const before = await settled();

    const box = await volumeReader(page).boundingBox();
    if (box === null) throw new Error("the volume reading layer has no box");
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
    await expect(volumeStrip(page)).toContainText(/\d{2}:\d{2}/);

    // The same y, to the pixel. Either the row is reserved or it is not.
    expect(await documentY()).toBe(before);
  });
}
