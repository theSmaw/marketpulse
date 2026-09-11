import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { expectNoAxeViolations } from "../support/axe.js";

// The Security Explorer's grid, at the three viewports this product is built
// and reviewed at (Task 2.11.7).
//
// ## Why this is a browser spec and could not be anything else
//
// **Nothing below `pnpm e2e` can see a column.** jsdom applies no stylesheet,
// computes no layout and returns `""` for every `getComputedStyle` a CSS
// Module contributed — so a grid that renders three starved tracks instead of
// two, or one whose spans invert, passes every unit, component and integration
// test in this repository. That is not hypothetical: the first draft of this
// shell declared its spans once and changed only `grid-template-columns` per
// viewport, on the belief that a `span 3` item in a two-track grid resolves to
// two tracks. **It grows an implicit third one**, the computed tracks came back
// `134px 134px 676px`, and the page was visibly broken at every width under
// 1184px with `pnpm verify` and all 54 browser tests green. It was caught by
// looking at the page.
//
// So this file asserts the computed tracks rather than a screenshot: a
// screenshot comparison would go red on every unrelated copy change, and the
// property actually being defended is "how many columns, and who spans them".
//
// ## What a green run here does not certify
//
//   - **Not that the layout is good.** Three numbers being right is not the
//     same as a page being worth looking at, and the four tests of the bar are
//     applied to a screenshot by a person. This is the floor.
//   - **Not that the regions have anything in them.** Five of the seven are
//     placeholders by design, and this file asserts that they say so rather
//     than that they are empty — an empty region and a region whose label was
//     dropped look identical to a layout assertion.

const EXPLORER = "/securities/NVDA";

/** The grid itself: the one element on this page whose tracks are the subject. */
function grid(page: import("@playwright/test").Page) {
  // By its contents rather than by a generated class name. A CSS Module hash
  // changes whenever the file does, and a spec keyed on one is a spec that goes
  // red for a comment.
  return page
    .locator("div")
    .filter({ has: page.getByRole("region", { name: "Price" }) })
    .filter({ has: page.getByRole("region", { name: "Tracked universe" }) })
    .last();
}

async function trackCount(
  page: import("@playwright/test").Page,
): Promise<number> {
  const tracks = await grid(page).evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns,
  );
  return tracks.split(" ").filter((track) => track !== "").length;
}

test("the grid is three columns on a desktop, and the wide pair is wide", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(EXPLORER);
  await expect(page.getByRole("region", { name: "Price" })).toBeVisible();

  expect(await trackCount(page)).toBe(3);

  // Price and volume share an x-axis, so they share a width — the one adjacency
  // in PRODUCT_SPEC.md §8.3 that is not a preference. Asserted as a comparison
  // rather than as a pixel count, because the measure is `--content-max`'s and
  // this spec has no business knowing it.
  const price = await page.getByRole("region", { name: "Price" }).boundingBox();
  const volume = await page
    .getByRole("region", { name: "Volume" })
    .boundingBox();
  const rail = await page
    .getByRole("region", { name: "Abnormal-move indicators" })
    .boundingBox();

  expect(price?.width).toBe(volume?.width);
  expect(price?.width).toBeGreaterThan(rail?.width ?? 0);

  // And the universe is wider than either: it is the full measure.
  const universe = await page
    .getByRole("region", { name: "Tracked universe" })
    .boundingBox();
  expect(universe?.width).toBeGreaterThan(price?.width ?? 0);
});

test("the grid is two columns on a tablet and one on a phone", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(page.getByRole("region", { name: "Price" })).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 900 });
  expect(await trackCount(page)).toBe(2);

  await page.setViewportSize({ width: 640, height: 900 });
  expect(await trackCount(page)).toBe(1);

  // The reading order never changes — only the number of columns does. A
  // keyboard user and a screen reader meet the same sequence a pointer does,
  // which is only true while the DOM order is the visual order.
  const names = await page
    .getByRole("region")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.querySelector("h2")?.textContent ?? ""),
    );
  expect(names).toEqual([
    "Price",
    "Abnormal-move indicators",
    "Volume",
    "Relative performance",
    "Connected securities",
    "Relevant filings",
    "Anomaly history",
    "Tracked universe",
  ]);
});

test("every empty region names the epic that fills it", async ({ page }) => {
  await page.goto(EXPLORER);
  await expect(page.getByRole("region", { name: "Price" })).toBeVisible();

  // Six: the five later epics own, plus Story 2.13's volume. A placeholder
  // whose label is dropped renders a dashed box with nothing in it — which
  // reads as broken and goes red nowhere else.
  await expect(page.getByText(/^Filled by /)).toHaveCount(6);
  await expect(
    page.getByText("Filled by Epic 5 — Anomaly Detection"),
  ).toHaveCount(3);
  await expect(
    page.getByText("Filled by Epic 6 — Market Topology"),
  ).toHaveCount(1);
  await expect(
    page.getByText("Filled by Epic 9 — Corporate Filing Evidence"),
  ).toHaveCount(1);
});

test("the identity block names the security, and qualifies its close", async ({
  page,
}) => {
  await page.goto(EXPLORER);

  const symbol = page.getByRole("heading", { level: 2, name: "NVDA" });
  await expect(symbol).toBeVisible();

  // The grain, stated. This figure is a stored **daily** bar and the panel
  // below renders the last **minute** bar of its window; on 2026-09-04 they are
  // 230.36 and 230.34. Two inches apart with one word on both, they read as one
  // number that cannot make its mind up.
  //
  // Branched rather than asserted outright: CI's store holds 518 securities and
  // zero bars, so the close is absent there and present on a developer's
  // machine and on the deployed pair. Both are correct.
  const qualifier = page.getByText(/from a stored daily bar|no daily bar held/);
  await expect(qualifier).toHaveCount(1);
});

// One test per viewport rather than one loop over three, and that is a deadline
// rather than a style: this page carries 518 table rows, a whole-document axe
// run over it takes around seven seconds, and three of them in one test tipped
// past Playwright's 30-second budget the first time the suite ran end to end.
// A timeout and a violation are not the same finding, and a test that can
// produce either is a test whose red tells you nothing.
for (const width of [1440, 1024, 640]) {
  test(`the shell has no axe violations at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(EXPLORER);
    await expect(page.getByRole("region", { name: "Price" })).toBeVisible();
    await expectNothingFailedToRender(page);
    // A whole-document run, which is a **different measurement** from the
    // Storybook addon's `#storybook-root` scope and is not comparable with it:
    // this one adds the page-level rules a story fragment structurally cannot
    // satisfy.
    await expectNoAxeViolations(
      page,
      `the Security Explorer shell at ${String(width)}px`,
    );
  });
}
