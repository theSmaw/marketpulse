import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// **The control that changes what the data says** (Task 2.13.6), in the only
// instrument that can see most of what it is.
//
// Five things here are unreachable below a real browser, and each one is the
// reason a test in this file exists rather than in `TimeWindowControl.test.tsx`:
//
//  1. **That a window change stays client-side.** jsdom has no history and no
//     bundle to reload, so a component test cannot tell a client-side navigation
//     from a document one at all — the same blind spot
//     `security-navigation.spec.ts` was written for, now reachable a second way.
//     A `<Link>` where a callback should be, or a `window.location` assignment,
//     leaves every unit test green and makes the product reload itself on every
//     window press.
//  2. **That the control adds exactly one tab stop, and that it is not behind
//     the sticky chrome.** The measured occlusion is **worse as the viewport
//     narrows** — one stop at 1440, four at 768 — so the desktop case is the one
//     that stays green while a narrow one fails.
//  3. **That the readout is never dropped and the cells never truncate.** The
//     control shares a panel heading row with the region's name, and at 390 px
//     that row has to wrap. Nothing that computes no layout can see it.
//  4. **That both plots move together.** One request, two regions, one axis.
//  5. **That a reload and a cold deep link land on the window that was picked.**
//     The address is the whole mechanism and a browser is what has one.
//
// ## What a green run here does not certify
//
//   - **Not that there are any bars.** CI's store holds 518 securities and zero
//     bars, so every window is a correct `empty` there and a `partial` locally.
//     Every assertion below is therefore about the **control, the address and
//     the request** rather than about a line — the three things that are the
//     same in both.
//   - **Not the 1d rendering.** What a daily window draws depends on a store
//     with daily bars in it, which CI has not got. `PriceChart.stories.tsx`'s
//     `Daily` and the recorded body behind it are where that is reviewed.

const EXPLORER = "/securities/NVDA";

/** The three viewports this product is built and reviewed at. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "phone", width: 390, height: 780 },
] as const;

function control(page: Page) {
  return page.getByRole("radiogroup", { name: "Time window" });
}

/**
 * The control **and its readout**.
 *
 * The readout sits outside the bordered box — a correction the canvas records,
 * because inside it read as a sixth button — so it is a sibling of the
 * radiogroup rather than inside it. Anything asserting the session count has to
 * say so, which is what this helper is for.
 */
function controlAndReadout(page: Page) {
  return control(page).locator("..");
}

function cell(page: Page, name: string) {
  return control(page).getByRole("radio", { name });
}

/** The panel has settled on an answer — **either** answer. */
function anAnswer(page: Page) {
  const region = page.getByRole("region", { name: "Price" });
  return region
    .getByText("Close", { exact: true })
    .or(region.getByText(/No bars stored for this window/))
    .first();
}

test("the five windows are named for the ear, and the one on screen is checked", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  // **By accessible name**, which is the assertion rather than a convenient
  // locator: the cell shows `5D` and must be announced as "5 days". A screen
  // reader saying "five dee" is the defect this spelling exists to prevent, and
  // it is invisible to anybody reading the screen.
  for (const name of ["1 day", "5 days", "1 month", "3 months", "1 year"]) {
    await expect(cell(page, name)).toBeVisible();
  }

  await expect(cell(page, "5 days")).toHaveAttribute("aria-checked", "true");

  // **And no readout beside a selected window** (2026-09-14). The count is said
  // where the control cannot say it — see the no-selection test below — and the
  // chart's spoken description and the coverage sentence beneath the plot carry
  // the resolved count for a window that *is* selected.
  await expect(controlAndReadout(page)).not.toContainText("sessions");
  await expectNothingFailedToRender(page);
});

test("choosing a window writes the address, re-asks, and never reloads the application", async ({
  page,
}) => {
  const asked: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/market-data/bars")) asked.push(url);
  });

  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  // A marker in the page's own JavaScript context. A document navigation takes
  // it with the bundle; a client-side one cannot touch it.
  await page.evaluate(() => {
    (window as unknown as { __alive?: boolean }).__alive = true;
  });

  await cell(page, "1 month").click();

  // The address carries the **count** and not a window name — `?sessions=21` is
  // the request spelled in the address, which is why there is no translation
  // table at the URL layer.
  await expect(page).toHaveURL(/\?sessions=21$/);
  await expect(cell(page, "1 month")).toHaveAttribute("aria-checked", "true");
  await expect(controlAndReadout(page)).not.toContainText("sessions");

  expect(
    await page.evaluate(
      () => (window as unknown as { __alive?: boolean }).__alive,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    ),
  ).toBe(1);

  // One further request, for the new window, and the previous one is not
  // re-asked. The hook supersedes by request identity; nothing here is new
  // cancellation code.
  await expect(anAnswer(page)).toBeVisible();
  expect(asked.filter((url) => url.includes("sessions=21"))).toHaveLength(1);
});

test("the default window writes no parameter, and choosing it back removes one", async ({
  page,
}) => {
  // `/securities/NVDA` **is** the five-session view. A URL that accretes every
  // default is a session dump rather than a shareable link
  // (`FRONTEND-STATE.md` §3).
  await page.goto(`${EXPLORER}?sessions=63`);
  await expect(anAnswer(page)).toBeVisible();

  await cell(page, "5 days").click();

  await expect(page).toHaveURL(new RegExp(`${EXPLORER}$`));
  await expect(cell(page, "5 days")).toHaveAttribute("aria-checked", "true");
});

test("a reload and a cold deep link both land on the window that was chosen", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();
  await cell(page, "3 months").click();
  await expect(page).toHaveURL(/\?sessions=63$/);

  // A reload, which is a **document** navigation: the address is the only thing
  // that survives it, which is the whole point of the window living there.
  await page.reload();
  await expect(anAnswer(page)).toBeVisible();
  await expect(cell(page, "3 months")).toHaveAttribute("aria-checked", "true");

  // And cold, the way a link somebody was sent arrives.
  await page.goto(`${EXPLORER}?sessions=252`);
  await expect(anAnswer(page)).toBeVisible();
  await expect(cell(page, "1 year")).toHaveAttribute("aria-checked", "true");
  await expect(controlAndReadout(page)).not.toContainText("sessions");
});

test("an address naming a count outside the five shows no selection and is not rewritten", async ({
  page,
}) => {
  // §4(b). `?sessions=7` is a well-formed request and the product answers it;
  // the control shows **no selection and does not snap to the nearest**, because
  // snapping would rewrite somebody's address into a different window and
  // silently answer a different question.
  await page.goto(`${EXPLORER}?sessions=7`);
  await expect(anAnswer(page)).toBeVisible();

  for (const name of ["1 day", "5 days", "1 month", "3 months", "1 year"]) {
    await expect(cell(page, name)).toHaveAttribute("aria-checked", "false");
  }

  // The address is untouched — the assertion that makes "does not snap" a fact
  // about the URL rather than about the marks.
  await expect(page).toHaveURL(/\?sessions=7$/);
  await expect(controlAndReadout(page)).toContainText("7 sessions");
  await expectNothingFailedToRender(page);
});

test("both plots move together, from one request", async ({ page }) => {
  const asked: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/market-data/bars")) asked.push(request.url());
  });

  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  await cell(page, "1 month").click();
  await expect(cell(page, "1 month")).toHaveAttribute("aria-checked", "true");
  await expect(anAnswer(page)).toBeVisible();

  // **One** request for two regions, counted by the window rather than by the
  // total. Two would mean the plots had acquired separate fetches, which is the
  // arrangement `ChartAxis` exists to prevent — and two answers for one window is
  // how two charts come to disagree.
  //
  // The *total* is deliberately not asserted: `main.tsx` renders under
  // `StrictMode`, so a development build mounts twice and asks twice on the
  // first load. That is a property of the harness this suite runs against rather
  // than of the page, and a count that includes it would be a number nobody
  // could read.
  expect(asked.filter((url) => url.includes("sessions=21"))).toHaveLength(1);

  // The volume region re-renders against the same answer. Its own coverage
  // sentence is the price panel's; what is asserted here is that the region is
  // still drawing something after the window changed rather than having been
  // left behind with the previous window's frame.
  const volume = page.getByRole("region", { name: "Volume" });
  await expect(volume.locator("svg").first()).toBeVisible();
});

for (const viewport of VIEWPORTS) {
  test(`the control keeps its readout and its labels at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto(EXPLORER);
    await expect(anAnswer(page)).toBeVisible();

    // **It never truncates a label and never drops the readout**, which is the
    // half that explains the other five (§8.6). At 390 px the control wraps to
    // its own row; what must not happen is a cell clipped to `1…` or a readout
    // pushed out of the panel.
    for (const label of ["1D", "5D", "1M", "3M", "1Y"]) {
      const box = await control(page)
        .getByText(label, { exact: true })
        .boundingBox();
      expect(box?.width ?? 0).toBeGreaterThan(10);
    }

    // The readout half, at the address that has one (2026-09-14): it is rendered
    // where **no** cell is selected, which is the state it exists for, so that is
    // the state this width has to hold it in.
    await page.goto(`${EXPLORER}?sessions=7`);
    await expect(anAnswer(page)).toBeVisible();
    await expect(controlAndReadout(page)).toContainText("7 sessions");

    // And the page does not scroll sideways because of it. A control that
    // overflows its panel is the one way this can be wrong and still look fine
    // on a desktop.
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

// **All three viewports since Task 2.13.8.** It ran at 1440 and 1024 only,
// and 390 is the width `CLAUDE.md` measured the *worst* occlusion at — the
// status strip wraps to three rows there, so the chrome is 208px against 132.
for (const viewport of VIEWPORTS) {
  test(`the control is one tab stop and reachable without landing behind the chrome at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto(EXPLORER);
    await expect(anAnswer(page)).toBeVisible();

    // Tab until focus is inside the control, counting the stops it takes. The
    // walk is bounded so that a control that is *not* reachable fails here
    // rather than hanging.
    let stops = 0;
    let inside = false;
    while (stops < 30 && !inside) {
      await page.keyboard.press("Tab");
      stops += 1;
      inside = await page.evaluate(() => {
        const active = document.activeElement;
        return (
          active?.getAttribute("role") === "radio" &&
          active.closest("[role='radiogroup']") !== null
        );
      });
    }
    expect(inside).toBe(true);

    // **Not behind the sticky chrome.** The repair is `scroll-padding-top` in
    // `base.css` and it is already there; what is not automatic is checking that
    // a new stop is covered by it. Measured occlusion is worse as the viewport
    // narrows, which is why this runs at two widths rather than at 1440 alone.
    const clear = await page.evaluate(() => {
      const active = document.activeElement;
      if (active === null) return false;
      const box = active.getBoundingClientRect();
      const chrome = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--sticky-chrome-height",
        ) || "0",
      );
      return box.top >= chrome;
    });
    expect(clear).toBe(true);

    // **One stop for five cells.** The arrows move focus inside the control; a
    // sixth press of Tab leaves it rather than reaching a second cell.
    await page.keyboard.press("Tab");
    const stillInside = await page.evaluate(
      () =>
        document.activeElement?.closest("[role='radiogroup']") !== null &&
        document.activeElement?.getAttribute("role") === "radio",
    );
    expect(stillInside).toBe(false);
  });
}

// **The readout has to be reachable, not merely attached** (Task 2.13.8) — the
// exact combination `TextField` got wrong for two tasks, found here on the walk
// rather than by a test.
//
// The readout is the only thing on screen that says `1M` means twenty-one
// trading sessions, and the only thing that explains an address naming a count
// the control does not offer. It was wired with `aria-describedby` on the
// **`div[role="radiogroup"]`** — which has no `tabindex`, because this is a
// roving-tabindex group whose stop is the checked *cell*. A description is read
// when a control is reached, and a description on a container is not part of a
// child's, so it was computed correctly, attached correctly, on screen and
// unreachable by any key press.
//
// Nothing in `pnpm verify` compares an `aria-describedby` against whether the
// described element can be focused, and nothing in jsdom knows what `Tab` does.
// So this walks to the stop and reads the description **off the element focus
// actually lands on**.
//
// Re-measure: move `aria-describedby` from the cell back to the group in
// `TimeWindowControl.tsx` and confirm this goes red.
test("the window on screen is described at the stop focus lands on", async ({
  page,
}) => {
  // A count the control does not offer, because that is the state the readout
  // exists for: five cells with no bar under any of them, and a sentence
  // saying why.
  await page.goto(`${EXPLORER}?sessions=7`);
  await expect(anAnswer(page).or(page.getByText(/could not be/))).toBeVisible();

  let inside = false;
  for (let press = 0; press < 30 && !inside; press += 1) {
    await page.keyboard.press("Tab");
    inside = await page.evaluate(
      () => document.activeElement?.getAttribute("role") === "radio",
    );
  }
  expect(inside).toBe(true);

  const description = await page.evaluate(() => {
    const active = document.activeElement;
    const ids = (active?.getAttribute("aria-describedby") ?? "")
      .split(/\s+/u)
      .filter(Boolean);
    return ids
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
  });

  expect(description).toBe("7 sessions");

  // And it stays reachable while a listener arrows across the control under
  // manual activation — the window on screen has not changed, so neither has
  // what they are told about it.
  await page.keyboard.press("ArrowRight");
  const afterArrow = await page.evaluate(() => {
    const active = document.activeElement;
    const id = active?.getAttribute("aria-describedby") ?? "";
    return document.getElementById(id)?.textContent ?? "";
  });
  expect(afterArrow).toBe("7 sessions");

  await expectNothingFailedToRender(page);
});

test("the arrows move focus and a key press is what changes the window", async ({
  page,
}) => {
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  await cell(page, "5 days").focus();
  await page.keyboard.press("ArrowRight");

  // **Manual activation.** Selection following focus would make arrowing from
  // `1D` to `1Y` four window changes — four requests and four addresses pushed
  // into the browser's history — which is the expensive-commit case the APG's
  // guidance on automatic selection names.
  await expect(cell(page, "1 month")).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`${EXPLORER}$`));
  await expect(cell(page, "5 days")).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("Space");

  await expect(page).toHaveURL(/\?sessions=21$/);
  await expect(cell(page, "1 month")).toHaveAttribute("aria-checked", "true");
  // Focus stays where the press landed, which is what makes a second arrow press
  // continue from there rather than from the start of the row.
  await expect(cell(page, "1 month")).toBeFocused();
});

test("Back undoes a window change", async ({ page }) => {
  // A **push** and not a replace: pressing a window is a deliberate act, and the
  // address it writes is one a person can send. Back undoing it is the property
  // that makes that safe to try.
  await page.goto(EXPLORER);
  await expect(anAnswer(page)).toBeVisible();

  await cell(page, "1 year").click();
  await expect(page).toHaveURL(/\?sessions=252$/);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${EXPLORER}$`));
  await expect(cell(page, "5 days")).toHaveAttribute("aria-checked", "true");
});
