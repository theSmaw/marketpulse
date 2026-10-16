import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";
import {
  overviewWithUnusual,
  unusualRow,
  unusualSection,
} from "../support/unusual.js";

// **Reaching an `Unusual activity` row, by keyboard and by pointer** (Task
// 5.4.3, done-when 2) — and the three claims about a ranked row that only a
// browser can make.
//
// ## What this file asserts, and why each one needs Chromium
//
//   - **The figure is not a link.** A reader dragging to select a percentile
//     must not navigate, and the ordinal cell is 64 px of a 308 px row sitting
//     inside a `<li>` whose ticker **is** a link. Nothing below `pnpm e2e`
//     knows which elements are activatable, because jsdom neither lays out nor
//     hit-tests.
//   - **The arrows clamp rather than wrap.** A ranking is not a ring:
//     `ArrowUp` on rank 1 stays on rank 1. Only a real focus model can say so.
//   - **A held pad is not a destination.** `visibility: hidden` plus
//     `aria-hidden` do nothing whatever to an `href`, and `RankedList` shipped
//     that defect once — eleven invisible `/securities/<slug>` anchors — so
//     this counts the anchors rather than trusting the attribute.
//
// ## The rows are FURNISHED, and that is stated rather than hidden
//
// CI's store is 516 securities, zero bars and no baseline generation, and a
// developer runs `MARKET_DATA_PROVIDER=none` — so the real producer answers
// `rows: []` for ever on every gated run and there is no row to reach. The
// frame goes down the shipped socket path and through the shipped decoder
// (`support/unusual.ts` carries the argument), so what is furnished is the
// **data** and not the behaviour.
//
// **This file therefore says nothing about whether the producer is honest.**
// That is `overview-unusual-ranking.spec.ts`', which furnishes nothing.

const OVERVIEW = "/";

/** The symbols, in the one order `compareByPercentile` admits for these ranks. */
const RANKED = ["CTSH", "NVDA", "AVGO", "CRM", "MNST"] as const;

const SECTION = unusualSection([
  unusualRow("CTSH", 99, -4.12, { aboveSample: true }),
  unusualRow("NVDA", 99, 3.88),
  unusualRow("AVGO", 98, -2.4),
  unusualRow("CRM", 97, 2.02),
  unusualRow("MNST", 96, -1.77),
]);

const region = (page: Page): Locator =>
  page.getByRole("region", { name: "Unusual activity" });

/** The drawn rows' tickers, in document order, excluding the held pads. */
const drawnSymbols = (page: Page): Promise<string[]> =>
  region(page).evaluate((root) => {
    const out: string[] = [];
    for (const row of root.querySelectorAll("ol > li")) {
      if (row.getAttribute("aria-hidden") === "true") continue;
      const symbol = row.querySelector('[class*="_symbol_"]');
      out.push(symbol?.textContent.trim() ?? "?");
    }
    return out;
  });

/** Open `/` with the furnished section already on the connect frame. */
async function open(page: Page): Promise<void> {
  await serveFeed(page, { overview: overviewWithUnusual(SECTION) });
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  // **The positive state, waited for before anything is captured** — every
  // characterised flake in this suite is a text assertion over a page that is
  // still settling, and five drawn rows is this region's *the browser has
  // drawn its answer rather than its reservation*.
  await expect.poll(() => drawnSymbols(page)).toEqual([...RANKED]);
}

test.use({ viewport: { width: 1440, height: 900 } });

test("the ticker is the only activatable thing on a row, and a held pad is not one at all", async ({
  page,
}) => {
  await open(page);

  // **One anchor per drawn row and not one more**, which since the row count
  // went to ten on 2026-10-16 is a stronger assertion than it was: five rows
  // are furnished and **five pads are drawn beside them**, so a pad that kept
  // an `href` would make this ten. `visibility: hidden` plus `aria-hidden` do
  // nothing whatever to an anchor, and `RankedList` shipped eleven invisible
  // `/securities/<slug>` anchors for ten days when one call site threw the
  // producer's `held` away.
  const links = region(page).locator("a");
  await expect(links).toHaveCount(RANKED.length);

  // **The accessible name is the bare ticker.** The mark slot is `aria-hidden`
  // and empty, so a listener gets `NVDA, link` rather than a name that changes
  // sixteen times a minute.
  for (const symbol of RANKED) {
    await expect(
      region(page).getByRole("link", { name: symbol, exact: true }),
    ).toHaveCount(1);
  }

  // **The figure is NOT a link**, which is the claim this test exists for: a
  // reader dragging to select a percentile must not navigate. Asserted by
  // asking the DOM whether the ordinal cell has an anchor **ancestor**, which
  // is the only shape that could make it activatable.
  const ordinalsInsideALink = await region(page).evaluate(
    (root) =>
      [...root.querySelectorAll('[class*="_ordinal_"]')].filter(
        (cell) => cell.closest("a") !== null,
      ).length,
  );
  expect(ordinalsInsideALink).toBe(0);

  // And nor is the company name, for the same reason stated the other way:
  // only the identifier is the way in.
  const namesInsideALink = await region(page).evaluate(
    (root) =>
      [...root.querySelectorAll('[class*="_label_"]')].filter(
        (cell) => cell.closest("a") !== null,
      ).length,
  );
  expect(namesInsideALink).toBe(0);

  await expectNothingFailedToRender(page);
});

test("a pointer opens the security page from the ticker, and the destination is the row's own identity", async ({
  page,
}) => {
  await open(page);

  await region(page).getByRole("link", { name: "AVGO", exact: true }).click();

  await expect(page).toHaveURL(/\/securities\/AVGO$/u);
  await expectNothingFailedToRender(page);
});

test("the arrows move one stop and CLAMP rather than wrapping, and Enter opens the row that has focus", async ({
  page,
}) => {
  await open(page);

  const focused = (): Promise<string | null> =>
    page.evaluate(
      () => document.activeElement?.getAttribute("data-ticker") ?? null,
    );

  // Into the list at its first row, which is where the roving stop starts —
  // `overview-ranked-keyboard.spec.ts`' idiom, and it is deliberate rather
  // than convenient: the region's own `<section>` is the tab stop (ADR 0039)
  // and the arrows are the list's, so a test that arrowed from the section
  // would be asserting the region's behaviour rather than the list's.
  await region(page)
    .getByRole("link", { name: RANKED[0], exact: true })
    .focus();
  expect(await focused()).toBe(RANKED[0]);

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  expect(await focused()).toBe(RANKED[2]);

  // **`End` and `Home` reach the ends**, which is what makes the clamp below
  // a statement about the boundary rather than about how many presses the
  // test happened to make.
  await page.keyboard.press("End");
  expect(await focused()).toBe(RANKED[RANKED.length - 1]);

  // **A ranking is not a ring.** `ArrowDown` on the last row stays there — a
  // wrap would take a reader from the most ordinary row back to the most
  // unusual one with nothing on screen saying the list restarted.
  await page.keyboard.press("ArrowDown");
  expect(await focused()).toBe(RANKED[RANKED.length - 1]);

  await page.keyboard.press("Home");
  expect(await focused()).toBe(RANKED[0]);
  await page.keyboard.press("ArrowUp");
  expect(await focused()).toBe(RANKED[0]);

  // **Activation resolves against identity, never position**, so the page
  // that opens is the row that had focus.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/securities/${RANKED[0]}$`, "u"));

  await expectNothingFailedToRender(page);
});

test("the ordinal is drawn short and spoken whole, and the region's name is not repeated in it", async ({
  page,
}) => {
  await open(page);

  // **What is on the screen**: the ordinal alone, with the ceiling's `>` on
  // the row the producer marked `aboveSample`. `100th` is never printed —
  // above the highest order statistic there is no sample — so `>99th` is the
  // widest string this cell can hold.
  const drawn = await region(page).evaluate((root) =>
    [...root.querySelectorAll('[class*="_value_"]')]
      .map((cell) => cell.textContent.trim())
      .filter((text) => text !== ""),
  );
  expect(drawn).toEqual([">99th", "99th", "98th", "97th", "96th"]);

  // **No `%` anywhere in the region's figures**, which is one of the four
  // channels that tell a percentile from a price change and the one a reader
  // meets first.
  expect(drawn.join(" ")).not.toContain("%");

  // **What a listener is handed**: the whole phrase, from the visually-hidden
  // sibling. The word moved to the list heading to buy the company name
  // 125 px, and the spoken string did not change — one fact, two renderings.
  await expect(region(page)).toContainText("99th percentile");

  // **And the heading names the comparison**, which is what makes a full list
  // of ordinary ordinals readable as *nothing is unusual right now* rather
  // than as a region that broke.
  await expect(region(page).getByRole("heading", { level: 3 })).toHaveText(
    /percentile of its own 60-session history/iu,
  );

  await expectNothingFailedToRender(page);
});
