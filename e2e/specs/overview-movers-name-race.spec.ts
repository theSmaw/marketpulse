import type {
  MarketFeed,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { FURNISHED_BREADTH, serveFeed } from "../support/feed.js";
import { SECURITIES_ROUTE_PATTERN } from "../support/pair.js";

// **A mover row while `GET /securities` is still outstanding** (Task 4.7.5).
//
// ## The state is a RACE, and that is why it is produced rather than argued
//
// The landing page gets its figures off the socket and its **company names**
// off `GET /securities`, a separate request made for the Security Explorer.
// The aggregate arrives inside the gateway's own upgrade handler; the universe
// measured **124 ms** on the dev pair (Task 4.5.5) against first-frame times
// of **174–277 ms** (`use-waited.ts`). Which of the two wins is a property of
// the network, so **every cold load may paint movers with an empty name map**,
// and an unreachable universe holds that state for ever.
//
// Until 2026-10-11 the name track stood the **ticker** in, so the row read
// `3 NVDA NVDA 189.42 +3.41%` — and at 390 `.movers`' track list is
// `15 64 137 68`, the price column dropped, so the two copies sat side by side
// with nothing between them and a listener heard the identifier twice.
//
// ## Why this is a browser and not the unit test beside it
//
// `movers.test.ts` asserts the producer's answer: `label` is `U+00A0`. It
// cannot assert the two things that made this a defect — that the duplicate
// was **adjacent in the DOM**, and that the **link's** accessible name is
// untouched by the repair. Both are facts about the row as it is assembled by
// `RankedList`, two files away from the one that was changed, and Story 4.6's
// rule that the accessible name is the ticker lives there.
//
// And the race itself is only reachable here. Nothing below `pnpm e2e` makes
// two requests.
//
// ## What it serves, and therefore cannot say
//
// The aggregate is **this spec's own**, through the shipped encoder and the
// gateway's own connect sequence, for `overview-sector-region.spec.ts`' reason:
// CI's store is 518 securities and **zero bars**, so the real gateway there
// sends `eligible: 0` and two empty lists for ever and there is no row to read
// a name track off. Nothing here asserts an order, a cut or a denominator —
// those are `overview-movers-ranking.spec.ts`' and they are pass-through.
//
// ## The plant, per channel
//
// Task 4.8.10's rule: a produced state whose producer went quiet looks
// identical to a state drawn correctly. A page with no names because the
// request was held and a page with no names because the rows never arrived are
// the same empty column. So each arm asserts its own subject:
//
//   - the **aggregate**, by `overviews()` and by a figure on the screen;
//   - the **hold**, by a count of requests this spec actually intercepted, so
//     *the universe was held* is told apart from *the page never asked*;
//   - the **release**, by the names appearing — which is the control that
//     makes the blank column a state rather than a region that cannot draw a
//     name at all.

const OVERVIEW = "/";

/** The one venue value — `overview-proxy-live-update.spec.ts`'s rule. */
const VENUE: MarketFeed = "iex";

/** 14:01 ET on a Wednesday, so no extended-hours word anywhere on the page. */
const AT = "2026-09-16T18:01:00Z";

/**
 * A ticker this universe really carries, so the **release** arm has a name to
 * find. `NVDA` is `securities-route.spec.ts`' own choice for the same reason.
 */
const NAMED = "NVDA";

const observed = (
  symbol: string,
  price: number,
  changePercent: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: AT,
  price,
  changePercent,
  changeBasis: "2026-09-15",
});

/**
 * One gainer and one loser, which is all a name track needs.
 *
 * A short list rather than five each way: the lists pad themselves to five
 * with **held** rows, and a held row's name track is already blank by
 * `withHeldRows`' own decision — so reading an unpadded row is what tells the
 * repair apart from the padding that was always there.
 */
const WITH_MOVERS: WireMarketOverview = {
  computedAt: AT,
  observedAt: AT,
  feeds: [VENUE],
  figures: [observed("SPY", 774.03, 0.42)],
  breadth: FURNISHED_BREADTH,
  movers: {
    basis: "observed",
    windowMinutes: 5,
    gainers: [observed(NAMED, 189.42, 3.41)],
    losers: [observed("INTC", 21.08, -2.17)],
    eligible: 451,
    tracked: 503,
  },
};

const movers = (page: Page): Locator =>
  page.getByRole("region", { name: "Movers" });

/** Every drawn row of either list — the held pads are `aria-hidden`. */
const rows = (page: Page): Locator =>
  movers(page).locator("li:not([aria-hidden='true'])");

test.use({ viewport: { width: 390, height: 780 } });

test("a mover row whose name has not arrived draws blank room, not a second ticker", async ({
  page,
}) => {
  const feed = await serveFeed(page, { feed: VENUE, overview: WITH_MOVERS });

  /*
   * **The universe, held open rather than refused.** A 500 or an `abort` is
   * the failure case and it reaches the same state; what it is not is the one
   * that happens on an ordinary load, and the whole point of this task is that
   * the two are the same screen. The route is installed and awaited before
   * `goto` — a request already in flight cannot be intercepted.
   */
  let held = 0;
  let release: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    held += 1;
    await released;
    await route.continue();
  });

  await page.goto(OVERVIEW);

  // **Channel 1 — the aggregate.** One frame sent, and a row drawn from it.
  await expect(rows(page)).toHaveCount(2);
  expect(feed.overviews()).toBeGreaterThan(0);

  // **Channel 2 — the hold.** Without this the blank column is equally
  // evidence that the page never asked for a universe at all.
  await expect.poll(() => held).toBeGreaterThan(0);

  /*
   * **The row, read whole.** Not a query for the name cell: the defect was
   * that two ADJACENT cells held one string, so what has to be asserted is
   * the row's own running text — which is also what a listener is handed.
   *
   * `innerText` rather than `textContent`, because the blank the repair draws
   * is a `U+00A0` and `innerText` collapses it the way the screen does.
   */
  const gainer = rows(page).first();
  const text = (await gainer.innerText()).replace(/\s+/gu, " ").trim();

  /*
   * **Measured, not argued** (`pnpm e2e`, 2026-10-11). Two things in it are
   * the viewport's rather than this repair's and are left in deliberately, so
   * that a change to either is a change to this line: the **price is absent**,
   * because at 390 `.movers` is four tracks and the price cell is the one
   * dropped — which is exactly why the duplicate had nothing between it here —
   * and `up` is `PriceChange`'s spoken direction, which `innerText` reads
   * because it is clipped rather than hidden.
   *
   * What the repair owns is the gap between `NVDA` and `▲`: it held a second
   * `NVDA` until 2026-10-11 and now holds a `U+00A0`.
   */
  expect(text).toBe(`1 ${NAMED} ▲ up +3.41%`);

  // And the same claim counted, because the line above would also pass if the
  // row had been rewritten to drop the ticker and keep the name.
  expect(text.split(NAMED)).toHaveLength(2);

  /*
   * **Story 4.6's rule is untouched, and that is the care this repair needed.**
   * The name track and the link are different cells; blanking the first must
   * not reach the second, which is the one accessible name this product
   * navigates by.
   */
  await expect(
    movers(page).getByRole("link", { name: NAMED, exact: true }),
  ).toHaveCount(1);

  // **Channel 3 — the release.** The blank column is a state of this load and
  // not a region that cannot draw a name: let the universe through and the
  // name appears in the same row, with the ticker still beside it once.
  release?.();

  await expect(gainer).toContainText("NVIDIA", { timeout: 15_000 });
  expect((await gainer.innerText()).split(NAMED)).toHaveLength(2);

  await expectNothingFailedToRender(page);
});
