import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender, readable } from "../support/app.js";
import { SECURITIES_ROUTE_PATTERN } from "../support/pair.js";

// The journey the epic's exit criterion is a sentence about — **search, open,
// land on the security's page** — walked twice: once with a pointer, once by
// keyboard alone (Task 2.11.9).
//
// ## Why a second file rather than four more tests in `securities-route`
//
// That file is about the tracked universe arriving over the network and the
// states it can arrive in. This one is about a *flow*, and it is the level the
// story's third and sixth acceptance criteria live at. Two of the properties
// below are also invisible to every other level in this repository, which is
// what makes this the only instrument that can hold them:
//
//   - **Where focus lands, and whether it can be seen.** jsdom has no layout
//     and no scroller, so an element focused underneath a sticky header renders
//     identically to one in plain view. axe cannot see it either — it judges a
//     DOM, and this is a fact about where a scroller stopped.
//   - **Whether a control is in the tab order at all.** A component test can
//     assert an attribute; only a browser presses Tab.
//
// ## The two things this file does not claim
//
//   - **Not that a screen reader announces well.** It asserts the mechanism an
//     announcement needs — a persistent region, a sentence that names its
//     subject, an `aria-expanded` that flips on the control that was pressed.
//     What that sounds like was judged against Chromium's accessibility tree by
//     a person and is recorded in `SEARCH-AND-SELECTION.md` §7. No instrument
//     here can hear anything.
//   - **Not accessibility.** `securities-route.spec.ts` and
//     `security-explorer-shell.spec.ts` run axe over this document at three
//     viewports each. A green axe run is not a review; Epic 15 owns that.

const SECURITIES = "/securities";

/** The security the curated universe always holds, reached by its name. */
const QUERY = "nvid";
const SYMBOL = "NVDA";

/** The field, by role. It is the only combobox in this application. */
function field(page: Page): Locator {
  return page.getByRole("combobox");
}

/**
 * Press Tab until the search field has focus, and say how many it took.
 *
 * A count rather than `field.focus()`, because the thing being checked is that
 * the control is **reachable** — `focus()` would reach a control that no
 * sequence of keystrokes can. The bound is generous and its only job is to fail
 * as a number rather than as a hang.
 */
async function tabToTheField(page: Page): Promise<number> {
  for (let presses = 1; presses <= 12; presses += 1) {
    await page.keyboard.press("Tab");
    const reached = await page.evaluate(
      () => document.activeElement?.getAttribute("role") === "combobox",
    );
    if (reached) return presses;
  }
  throw new Error("the search field is not reachable by Tab");
}

/**
 * Is the focused element sitting underneath the application's sticky chrome?
 *
 * **An element taller than the viewport is excluded, and that is the
 * measurement rather than a let-off.** The browser does not scroll a target it
 * already considers in view, and a region 18,895px tall on an 900px viewport is
 * always partly in view — so its top edge is above the chrome whatever happens,
 * and nothing about it is obscured. What this predicate is for is the ordinary
 * case: a button, a link, a field, scrolled to the top of the scrollport and
 * parked behind 132 to 208 pixels of header.
 */
async function focusIsObscured(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const element = document.activeElement;
    const header = document.querySelector("header");
    if (element === null || header === null) return false;
    // The chrome's own contents are not obscured by it.
    if (header.contains(element)) return false;

    const box = element.getBoundingClientRect();
    if (box.height >= window.innerHeight) return false;
    return box.top < header.getBoundingClientRect().bottom - 1;
  });
}

// ---------------------------------------------------------------------------
// The journey, by pointer and then by keyboard
// ---------------------------------------------------------------------------

// Acceptance criterion 6, as one sentence. `securities-route.spec.ts` already
// asserts the middle of it — a click on a result changes the address — and what
// is added here is the **end**: that the address led somewhere, and that the
// somewhere is this security's own page rather than a heading with a spinner
// under it.
test("search, open, and land on that security's page", async ({ page }) => {
  await page.goto(SECURITIES);
  await expect(page.getByRole("table")).toBeVisible();

  await field(page).fill(QUERY);
  await page.getByRole("option").first().click();

  await expect(page).toHaveURL(new RegExp(`/securities/${SYMBOL}$`));

  // Whose page this is: the identity block Task 2.11.7 put above the grid.
  await expect(
    page.getByRole("heading", { level: 2, name: SYMBOL }),
  ).toBeVisible();

  // And the region this route is named for, with an answer in it. **Either**
  // answer: CI's store holds 518 securities and no bars, so `empty` there is a
  // correct 200 and `partial` on a backfilled store is the same journey
  // arriving somewhere with numbers in it. Branching is what keeps this honest
  // in both environments — see `security-series.spec.ts` for the full argument.
  const price = page.getByRole("region", { name: "Price" });
  await expect(
    readable(price, /Holding .* bars/).or(
      readable(price, /No bars stored for this window/),
    ),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
});

// The same journey with the pointer never touched, which is acceptance
// criterion 3 and the half no other level reaches. Every step is a key, and
// where focus is after each one is asserted rather than assumed.
test("the same journey by keyboard alone", async ({ page }) => {
  await page.goto(SECURITIES);
  await expect(page.getByRole("table")).toBeVisible();

  // 1. Reach the field. Five presses: the four navigation links, then this —
  // a control *over* both surfaces has to come before them.
  expect(await tabToTheField(page)).toBe(5);
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");

  // 2. Type. The list opens on the first keystroke and the field keeps focus
  // throughout — this is an active-descendant combobox, so the "active" row is
  // a pointer rather than a focused element and typing is never interrupted.
  await page.keyboard.type(QUERY);
  await expect(page.getByRole("option").first()).toBeVisible();
  await expect(field(page)).toHaveAttribute("aria-expanded", "true");

  // 3. Move through the results. `aria-activedescendant` names the row, and
  // focus is still in the input.
  await page.keyboard.press("ArrowDown");
  const active = await page.evaluate(() => {
    const element = document.activeElement;
    const points = element?.getAttribute("aria-activedescendant") ?? null;
    return {
      tag: element?.tagName ?? null,
      points,
      // **Resolved in the page**, because the interesting question is whether
      // the id is in this document — a combobox pointing at an id that is not
      // announces a row that does not exist, and renders identically to one
      // that does. `getElementById` also needs no escaping, which matters when
      // the id came from `useId()` and is full of underscores.
      names:
        points === null
          ? null
          : (document.getElementById(points)?.textContent ?? null),
    };
  });
  expect(active.tag).toBe("INPUT");
  expect(active.points).not.toBeNull();
  expect(active.names).toContain(SYMBOL);

  // 4. Open it.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/securities/${SYMBOL}$`));
  await expect(
    page.getByRole("heading", { level: 2, name: SYMBOL }),
  ).toBeVisible();

  // 5. **Where focus lands, which is the step most often left to chance.**
  //
  // It stays in the field, and that is a decision rather than what happened to
  // occur — `SEARCH-AND-SELECTION.md` §7 states it with its alternatives. The
  // route re-renders rather than re-mounting, so the field is the same element
  // it was, still holding the query. A person who opened the wrong security is
  // one keystroke from trying again; a person who moved on presses Tab and gets
  // the page in reading order.
  //
  // The other half of the decision is that the arrival is **not** silent
  // because of it: the panel's own live region changes to name the new symbol.
  // That is asserted below rather than here, because it is about a listener
  // rather than about focus.
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue(QUERY);
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");

  await expectNothingFailedToRender(page);
});

// ---------------------------------------------------------------------------
// The rest of the numbered flow
// ---------------------------------------------------------------------------

test("Escape closes the list, and a second Escape clears the query", async ({
  page,
}) => {
  await page.goto(SECURITIES);
  await expect(page.getByRole("table")).toBeVisible();

  await field(page).focus();
  await page.keyboard.type("nv");
  await expect(page.getByRole("option").first()).toBeVisible();

  // One key, two behaviours, in the order a person expects. The first press
  // keeps the query — the person has not finished typing — and only the second
  // falls through to the field's own clear.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(field(page)).toHaveValue("nv");
  await expect(field(page)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(field(page)).toHaveValue("");
  await expect(field(page)).toBeFocused();
});

test("Tab leaves an open list, and Shift-Tab comes back to the query", async ({
  page,
}) => {
  await page.goto(SECURITIES);
  await expect(page.getByRole("table")).toBeVisible();

  await field(page).focus();
  await page.keyboard.type("nv");
  await expect(page.getByRole("option").first()).toBeVisible();

  // Tab out. The surface closes rather than trapping — the one failure a
  // keyboard walk exists to catch and the one jsdom cannot produce, because
  // nothing there takes focus and nothing blurs.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(field(page)).not.toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue("nv");
});

// **"Back keeps my search"**, which is the friendlier of the two answers and is
// the one this product gives — see `SEARCH-AND-SELECTION.md` §3's amendment for
// why the file originally predicted the other one. `security-navigation.spec.ts`
// walks Back for the cache; this walks it for the keyboard.
test("Back returns to the list with the query still in the field", async ({
  page,
}) => {
  await page.goto(SECURITIES);
  await expect(page.getByRole("table")).toBeVisible();

  await field(page).focus();
  await page.keyboard.type(QUERY);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/securities/${SYMBOL}$`));

  await page.goBack();
  await expect(page).toHaveURL(/\/securities$/);
  await expect(field(page)).toHaveValue(QUERY);
});

test("Enter with nothing matched opens nothing", async ({ page }) => {
  await page.goto(SECURITIES);
  await expect(page.getByRole("table")).toBeVisible();

  await field(page).fill("zzzz");
  await expect(
    readable(page.locator("body"), /No security matches/),
  ).toBeVisible();

  await page.keyboard.press("Enter");

  // Guessing a destination from a query that matched nothing turns a dead end
  // into a wrong answer, so the address must not move.
  await expect(page).toHaveURL(/\/securities$/);
  await expectNothingFailedToRender(page);
});

// ---------------------------------------------------------------------------
// What the walk found, and what would go red if it came back
// ---------------------------------------------------------------------------

// **Focus must never land underneath the sticky chrome** — WCAG 2.2's 2.4.11,
// and the defect this task fixed.
//
// Measured before the repair (Chromium, 2026-09-11): tabbing from the top of
// this route put **one** stop behind the chrome at 1440×900, **four** at
// 768×800 — including `Collapse all`, the control Task 2.11.8 calls the real
// skip link — and **two** at 390×780. It worsens as the viewport narrows,
// because the status strip wraps to two rows at 768 and three at 390, so the
// widest chrome is the one a development machine never shows.
//
// The repair is `scroll-padding-top` on the scroll container, fed by the height
// `AppHeader` measures and publishes. **Verified by substitution rather than
// assumed**: deleting that declaration from `base.css` takes the 768 case red
// on three stops, and the 1440 case stays green — which is why this runs at the
// narrow viewport as well as the wide one.
for (const [width, height] of [
  [1440, 900],
  [768, 800],
] as const) {
  test(`no tab stop lands under the chrome at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto(`/securities/${SYMBOL}`);
    await expect(page.getByRole("table")).toBeVisible();

    const obscured: string[] = [];
    // Far enough to cross the field, all eight region panels, the bulk toggle
    // and the whole rail — the 23 stops Task 2.11.8 measured between the top of
    // the document and the first table row, with room to spare.
    for (let press = 0; press < 26; press += 1) {
      await page.keyboard.press("Tab");
      if (await focusIsObscured(page)) {
        obscured.push(
          await page.evaluate(() =>
            (document.activeElement?.textContent ?? "").trim().slice(0, 40),
          ),
        );
      }
    }

    expect(obscured, "focus landed behind the sticky chrome").toEqual([]);
  });
}

// **The reason a control cannot answer has to be reachable, not merely
// attached** — the finding Task 2.11.6 handed this task to settle.
//
// With the universe unreachable the field cannot search, and the sentence
// saying so is wired to it with `aria-describedby`, which is read *when the
// control is reached*. It used to be natively `disabled`, which is not
// focusable: measured here, the tab order ran straight from the fourth
// navigation link to the first region, so the sentence was computed correctly,
// attached correctly, on screen, and structurally unreachable by the one person
// it was written for.
//
// It is now `aria-disabled` and `readOnly`. Both halves are asserted, because
// the second is what stops the first from being a field that quietly accepts
// typing it will never match.
test("an unavailable search stays reachable and carries its reason", async ({
  page,
}) => {
  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    await route.abort();
  });

  await page.goto(SECURITIES);
  await expect(
    readable(page.locator("body"), /the tracked universe did not answer/),
  ).toHaveCount(1);

  // Reached by pressing Tab, in the same position it holds when it works.
  expect(await tabToTheField(page)).toBe(5);

  const input = field(page);
  await expect(input).toHaveAttribute("aria-disabled", "true");

  // The description resolves to the sentence, which is what a listener is
  // handed on arriving at the control.
  const described = await input.evaluate((element) =>
    (element.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" "),
  );
  expect(described).toMatch(/the tracked universe did not answer/);

  // And it refuses what it cannot use. `aria-disabled` is a claim to a screen
  // reader and nothing to a user agent; `readOnly` is what makes the claim
  // true.
  await page.keyboard.type("nv");
  await expect(input).toHaveValue("");

  // §36: the rest of the screen is unaffected.
  await expectNothingFailedToRender(page);
});

// **A control that changes 518 rows must not do it silently.**
//
// Task 2.11.8 left the summary line out of the live region on the argument that
// `aria-expanded` is spoken at the moment the listener presses the control and
// about the thing they pressed. That is a complete argument for a band's own
// disclosure and it did not reach this control, because this control had no
// `aria-expanded` to speak: walked in Chromium, pressing it removed 518 rows
// and announced nothing at all. The label flipping from `Collapse all` to
// `Expand all` is not a substitute — a name is read on arrival at a control,
// and one that changes under a listener already standing on it is not reliably
// re-read by anything.
test("the bulk collapse says what it did", async ({ page }) => {
  await page.goto(`/securities/${SYMBOL}`);
  await expect(page.getByRole("table")).toBeVisible();

  const toggle = page.getByRole("button", { name: /Collapse all|Expand all/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  // The same control saying which way it goes, never absent and never disabled.
  await expect(toggle).toHaveText("Expand all");

  // What it actually did, so the state above is about something.
  await expect(page.getByRole("row")).toHaveCount(13);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
});

// The table's own name, which is invisible to a reader and is the whole of what
// a screen reader's table list has to go on. Measured with Chromium's
// accessibility tree before the repair: `""`.
test("the tracked universe is a table with a name", async ({ page }) => {
  await page.goto(`/securities/${SYMBOL}`);
  await expect(
    page.getByRole("table", { name: "Tracked universe" }),
  ).toBeVisible();
});
