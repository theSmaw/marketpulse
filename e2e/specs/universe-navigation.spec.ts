import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { expectNoAxeViolations } from "../support/axe.js";

// The band rail and the collapse (Task 2.11.8) — the control that answers the
// reversal trigger Story 2.4 wrote and 518 securities fired.
//
// ## Why a browser, and not a component test
//
// The component tests beside `UniverseTable.tsx` cover what the control *is*:
// twelve links, a disclosure with `aria-expanded`, a summary line that reports
// how many rows are left. Three things they structurally cannot see, and all
// three are the reason this control exists:
//
//   - **How tall the page is.** jsdom computes no layout, so "the page got nine
//     times shorter" is not a question it can be asked. It is the entire point
//     of a collapse.
//   - **Where a jump lands.** The application's masthead is `position: sticky`
//     and 133px tall; before `jumpToBand` cleared it, a jump to Industrials put
//     the band's top at viewport y=0 — behind the chrome, with focus on an
//     element nobody could see, after an 11,933px scroll. TASK-08 warned about
//     exactly that and called it *invisible to every automated check*. This is
//     the check.
//   - **Whether the shut table still passes axe.** A `<th scope="rowgroup">`
//     whose row group has lost its data cells is a new shape for
//     `th-has-data-cells` to judge, and it is judged by a real engine or not at
//     all.
//
// ## What a green run here does not certify
//
// Not that the rail is *worth* pressing. Twelve links being reachable is not
// the same as a reader finding their way around 518 rows, and that judgement is
// made by a person looking at the page.

const EXPLORER = "/securities/NVDA";

function rail(page: import("@playwright/test").Page) {
  return page.getByRole("navigation", { name: "Jump to a sector" });
}

/**
 * The universe table's own rows — the ones under a band, not the band headings.
 *
 * Counted through the **link** every data row carries in its symbol cell, and
 * deliberately not through `getByRole("rowheader")`: a `<th scope="rowgroup">`
 * maps to `rowheader` too, so that locator would count the twelve band headings
 * as rows and report twelve where the answer is zero.
 */
function dataRows(page: import("@playwright/test").Page) {
  return page.locator("table").getByRole("link");
}

test("the rail names every band with its count", async ({ page }) => {
  await page.goto(EXPLORER);
  await expect(rail(page)).toBeVisible();

  // Eleven sectors and the market proxies. The count is asserted rather than
  // the names, because the names are `SECTOR_LABELS` and are already the
  // subject of a unit test — what a browser adds is that all twelve reached the
  // page and none of them was dropped by a layout.
  await expect(rail(page).getByRole("link")).toHaveCount(12);

  // The band that is not a sector is in the rail. A jump control that cannot
  // reach a band is close enough to a filter to matter.
  await expect(
    rail(page).getByRole("link", { name: /^Market proxies/ }),
  ).toBeVisible();
});

test("a jump lands the band below the chrome, with focus on its control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(EXPLORER);
  await expect(rail(page)).toBeVisible();

  await rail(page)
    .getByRole("link", { name: /^Industrials/ })
    .click();

  // Focus moved. A jump that only scrolls is a jump a keyboard user cannot
  // take — the page moves, their focus does not, and the next Tab returns them
  // to where they were.
  const focused = page.locator(":focus");
  await expect(focused).toHaveAccessibleName(/^Industrials/);
  await expect(focused).toHaveAttribute("aria-expanded", "true");

  // And it landed *below* the sticky chrome rather than behind it. Asserted as
  // a comparison against the header's own bottom edge, because the chrome is
  // 133px at this width and taller at the two narrow ones — a pixel count here
  // would be a second copy of a number that lives in another component's media
  // queries.
  const chrome = await page.locator("header").boundingBox();
  const band = await focused.boundingBox();
  expect(band?.y).toBeGreaterThanOrEqual(chrome?.height ?? 0);
});

test("collapsing every band turns 518 rows into a page you can see at once", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(rail(page)).toBeVisible();

  const before = await page.evaluate(() => document.body.scrollHeight);
  const rowsBefore = await dataRows(page).count();
  expect(rowsBefore).toBeGreaterThan(100);

  await page.getByRole("button", { name: "Collapse all" }).click();

  await expect(dataRows(page)).toHaveCount(0);

  const after = await page.evaluate(() => document.body.scrollHeight);
  // Measured on the production build at 1710×981: 20,402px to 2,273px. The
  // assertion is a ratio rather than either figure, because both move with the
  // viewport and with every region this page gains.
  expect(after).toBeLessThan(before / 4);

  // The same control saying which way it goes, never absent and never disabled.
  await page.getByRole("button", { name: "Expand all" }).click();
  await expect(dataRows(page)).toHaveCount(rowsBefore);
});

test("the summary line reports how many rows are on screen, and only when it is not all of them", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(rail(page)).toBeVisible();

  const summary = page.getByText("securities tracked").locator("..");

  // At rest the clause is absent. A line reading `518 of 518 rows shown` is two
  // identical figures a centimetre apart, which reads as a mistake rather than
  // as the good news it is.
  await expect(summary).not.toContainText("rows shown");

  await page.getByRole("button", { name: "Collapse all" }).click();
  await expect(summary).toContainText("0 of 518 rows shown");

  // Every other figure survives it. Collapsing hides rows; it does not untrack
  // a security, and a line that said otherwise would be reporting the screen as
  // though it were the universe.
  await expect(summary).toContainText("518 securities tracked");
});

test("an untracked security is still reachable through the rail", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(rail(page)).toBeVisible();

  // The deployed and local universes are all `active` today, so this cannot
  // assert on a marked row — what it can assert is the property that makes one
  // reachable: the rail's link counts add up to every row in the table, so
  // there is no band the control cannot get to and therefore no row it hides.
  const counts = await rail(page)
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((link) => Number(/\d+/.exec(link.textContent)?.[0])),
    );
  const reachable = counts.reduce((total, count) => total + count, 0);

  expect(reachable).toBe(await dataRows(page).count());
});

test("an active query changes the result surface and leaves the table alone", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(rail(page)).toBeVisible();

  const bandsBefore = await rail(page).getByRole("link").allTextContents();
  const rowsBefore = await dataRows(page).count();

  await page.getByRole("combobox").fill("heal");
  // The surface is genuinely open — otherwise this asserts that nothing
  // happened twice.
  await expect(page.getByRole("listbox")).toBeVisible();

  // **This is what "grouping under an active query" resolves to, produced
  // rather than described.** Search is a surface *over* the page and not a
  // filter *on* it, so the bands do not thin out and the brief's worry — eleven
  // sector bands holding one row each is worse than a flat list of eleven —
  // cannot arise, because no query ever reduces a band to one row.
  //
  // The two controls answer two different questions: search is for a person who
  // knows the symbol, the rail is for a person who does not know what to type.
  // `SecurityExplorer.test.tsx` holds the other half of this claim, that the
  // summary sentence stays byte-identical while a query is typed.
  expect(await rail(page).getByRole("link").allTextContents()).toEqual(
    bandsBefore,
  );
  expect(await dataRows(page).count()).toBe(rowsBefore);
});

// Two runs at each viewport: the table as it arrives, and the table with every
// band shut. The second is the new shape — a `<th scope="rowgroup">` whose row
// group has lost its data cells — and it is the one thing here that could have
// turned an existing `incomplete` into a violation.
//
// One test per viewport rather than one loop over three, for
// `security-explorer-shell.spec.ts`'s reason: this page carries 518 rows, a
// whole-document axe run over it takes around seven seconds, and three of them
// in one test tips past Playwright's 30-second budget. A timeout and a
// violation are not the same finding.
for (const width of [1440, 1024, 640]) {
  test(`the collapsed universe has no axe violations at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(EXPLORER);
    await expect(rail(page)).toBeVisible();

    await page.getByRole("button", { name: "Collapse all" }).click();
    await expect(dataRows(page)).toHaveCount(0);

    await expectNothingFailedToRender(page);
    await expectNoAxeViolations(
      page,
      `the tracked universe with every band shut at ${String(width)}px`,
    );
  });
}
