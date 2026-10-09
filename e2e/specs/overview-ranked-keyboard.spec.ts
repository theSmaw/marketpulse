import {
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  MarketFeed,
  WireFeedState,
  WireMarketMovers,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";
import { FURNISHED_BREADTH } from "../support/feed.js";

// **The keyboard model over a list that moves** (Task 4.6.4).
//
// ## Why every assertion here is a browser assertion
//
// `RankedList.test.tsx` can see the markup and `document.activeElement`, and it
// asserts the same model against a `rerender`. What it cannot reach is the
// thing the model exists for: **a re-order driven by a frame, arriving while a
// reader's focus is inside the list**. That is a socket, a decoder, a reducer
// and a React commit, and the clause under test — *the stop is keyed on the
// symbol and never on the index* — has **no symptom at all** until one lands.
// An index-keyed implementation passes every unit test in this repository.
//
// The second thing out of reach below here is the **pad**. A held row is
// `visibility: hidden`, which is a stylesheet, and jsdom applies none: there,
// a pad that wrongly carried a link would be focusable and the assertion would
// be about markup rather than about reach. Here it is about reach.
//
// ## The frames are produced here, with the shipped encoder
//
// `overview-sector-order.spec.ts`' rule, for its reason: **CI's store is 518
// securities and zero bars**, so every sector figure there is `unknown` for
// ever and both mover lists are empty for ever. A spec that waited for a row
// to arrive would wait for ever. Serving its own answer is what lets this
// assert a keyboard walk over ranked rows on a runner with no data at all —
// and a protocol change breaks it at the compiler rather than at an assertion.
//
// ## What this file does NOT assert
//
// The treatment — the hover ground, the underline and the focus ring. Those
// are `pnpm probe`'s and `overview-focus-ring.spec.ts`', and a contrast ratio
// is not a thing a spec may assert at all. And **not** what happens to focus
// when the row holding it leaves the list: that is Task 4.6.5's, by name.

const OVERVIEW = "/";

/** The one venue value — `overview-proxy-live-update.spec.ts`' rule. */
const VENUE: MarketFeed = "iex";

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: VENUE,
  marketOpen: true,
};

/** 14:01 ET on a Wednesday, so no extended-hours word anywhere on the page. */
const AT = "2026-09-16T18:01:00Z";

type Ranked = readonly (readonly [string, number])[];

/**
 * Nine sectors with a move and **two without**, which is what gives the sector
 * region its second roving group: a row with no rankable figure is drawn under
 * `Not ranked`, in its own `<ul>`, and it is still a security with stored bars
 * and therefore still a destination.
 */
const SECTORS: Ranked = [
  ["XLK", 1.84],
  ["XLC", 0.96],
  ["XLY", 0.63],
  ["XLI", 0.41],
  ["XLF", 0.31],
  ["XLV", 0.12],
  ["XLB", 0],
  ["XLP", -0.18],
  ["XLE", -1.27],
];

const QUIET_SECTORS = ["XLU", "XLRE"];

/**
 * The same nine after a minute in which **energy ran** — the row that was last
 * is now first and every other row moves one. The largest movement a single
 * frame can honestly produce (`The order that changes.dc.html` §04), and the
 * one that leaves no row where the reader left it.
 */
const SECTORS_RERANKED: Ranked = [
  ["XLE", 2.4],
  ["XLK", 1.85],
  ["XLC", 0.97],
  ["XLY", 0.64],
  ["XLI", 0.42],
  ["XLF", 0.32],
  ["XLV", 0.13],
  ["XLB", 0.01],
  ["XLP", -0.17],
];

const GAINERS: Ranked = [
  ["SMCI", 9.14],
  ["FSLR", 6.72],
  ["NVDA", 3.41],
  ["AMD", 2.18],
  ["TSLA", 1.05],
];

/**
 * **Two losers, so the losers list is padded to five.** A one-sided market is
 * an ordinary state — it is CI's permanent one at both ends — and the three
 * pads `withHeldRows` adds are the subject of the pad assertions below. Their
 * symbols are runs of non-breaking spaces, so a naive link builds
 * `/securities/%C2%A0`.
 */
const LOSERS: Ranked = [
  ["MRNA", -8.37],
  ["PFE", -3.12],
];

const observed = (
  symbol: string,
  changePercent: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: AT,
  price: 100,
  changePercent,
  changeBasis: "2026-09-15",
});

const moversOf = (up: Ranked, down: Ranked): WireMarketMovers => ({
  basis: "observed",
  gainers: up.map(([symbol, percent]) => observed(symbol, percent)),
  losers: down.map(([symbol, percent]) => observed(symbol, percent)),
  // Large enough that the selection cannot exceed it (`readMovers` check 1)
  // and no larger than `tracked` (check 2).
  eligible: 451,
  tracked: 503,
  windowMinutes: 5,
});

const overviewOf = (sectors: Ranked): WireMarketOverview => ({
  computedAt: AT,
  feeds: [VENUE],
  figures: [],
  sectors: [
    ...sectors.map(([symbol, percent]) => observed(symbol, percent)),
    // The two with nothing to rank, which `sectorPerformance` puts in the
    // trailing group. A true answer rather than a degraded one.
    ...QUIET_SECTORS.map((symbol): WireOverviewFigure => ({
      state: "unknown",
      symbol,
    })),
  ],
  sectorLadderStep: 2,
  // Required on the producer, so a frame without it models a state the server
  // cannot send. See `FURNISHED_BREADTH`.
  breadth: FURNISHED_BREADTH,
  movers: moversOf(GAINERS, LOSERS),
});

/**
 * Serve the market stream **and keep the socket**, so the test can send a
 * second aggregate whenever it likes. `overview-movers-hold.spec.ts`' helper,
 * carrying both regions' sections in one frame because both are this file's
 * subject and the page builds them from one value.
 */
async function serveOverview(page: Page): Promise<(sectors: Ranked) => void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: VENUE }),
    }),
  );

  const overview = (sectors: Ranked): string =>
    encodeMarketStreamMessage({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: new Date().toISOString(),
      overview: overviewOf(sectors),
    });

  let send: ((sectors: Ranked) => void) | null = null;
  let announce: (() => void) | null = null;
  const connected = new Promise<void>((resolve) => {
    announce = resolve;
  });

  // **Awaited before the navigation**: an unawaited `routeWebSocket` is a route
  // that may not be installed when the page dials, and the page then talks to
  // the real gateway — which on a developer's machine renders a perfectly
  // plausible list of the local store's own figures and leaves the test waiting
  // for a socket it never intercepted.
  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    ws.send(
      encodeMarketStreamMessage({
        type: "snapshot",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: new Date().toISOString(),
        observations: {},
        feed: LIVE_FEED,
      }),
    );
    ws.send(overview(SECTORS));
    send = (sectors) => {
      ws.send(overview(sectors));
    };
    announce?.();
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await connected;

  return (sectors) => {
    if (send === null) throw new Error("the market stream never connected");
    send(sectors);
  };
}

const region = (page: Page, name: string): Locator =>
  page.getByRole("region", { name });

const listIn = (page: Page, region_: string, list: string): Locator =>
  region(page, region_).getByRole("list", { name: list });

/** The ticker the page's focus is on, or what it is on instead. */
const focusedTicker = async (page: Page): Promise<string> =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (active === null) return "nothing";
    return active.getAttribute("data-ticker") ?? `<${active.localName}>`;
  });

/** Which ticker in a list holds the stop — `tabindex="0"`, exactly one. */
const stopIn = async (list: Locator): Promise<readonly string[]> =>
  list
    .locator('a[tabindex="0"]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-ticker") ?? "?"),
    );

// 1440 × 900, the viewport every figure in this story's record was measured at.
test.use({ viewport: { width: 1440, height: 900 } });

test("every ranked row is a destination, and so is a sector nobody could rank", async ({
  page,
}) => {
  await serveOverview(page);

  const ranked = listIn(page, "Sector performance", "Not ranked");
  await expect(ranked).toBeVisible();

  // The trailing group is a second list in the region with its own name, and
  // its rows are links like any other: `UNIVERSE.md` §12.2's rule arriving at
  // navigation — a row we are refusing to **rank** is still a security, and
  // its page is the right place to find out why there is nothing to rank.
  for (const symbol of QUIET_SECTORS) {
    await expect(ranked.getByRole("link", { name: symbol })).toHaveAttribute(
      "href",
      `/securities/${symbol}`,
    );
  }

  for (const symbol of ["XLK", "XLE"]) {
    await expect(
      region(page, "Sector performance").getByRole("link", { name: symbol }),
    ).toHaveAttribute("href", `/securities/${symbol}`);
  }

  for (const symbol of ["SMCI", "MRNA"]) {
    await expect(
      region(page, "Movers").getByRole("link", { name: symbol }),
    ).toHaveAttribute("href", `/securities/${symbol}`);
  }

  await expectNothingFailedToRender(page);
});

test("the arrows move one row and CLAMP at both ends, and each list has exactly one stop", async ({
  page,
}) => {
  await serveOverview(page);

  const sectors = listIn(
    page,
    "Sector performance",
    "Sectors ranked by today’s move",
  );
  expect(await stopIn(sectors)).toEqual(["XLK"]);

  await sectors.getByRole("link", { name: "XLK" }).focus();
  await page.keyboard.press("ArrowUp");
  // **It does not wrap**, which is the departure from `TimeWindowControl`:
  // that control wraps because the set is a ring, and a ranking is not one.
  expect(await focusedTicker(page)).toBe("XLK");

  await page.keyboard.press("ArrowDown");
  expect(await focusedTicker(page)).toBe("XLC");
  await page.keyboard.press("End");
  expect(await focusedTicker(page)).toBe("XLE");
  await page.keyboard.press("ArrowDown");
  expect(await focusedTicker(page)).toBe("XLE");
  await page.keyboard.press("Home");
  expect(await focusedTicker(page)).toBe("XLK");

  await expectNothingFailedToRender(page);
});

test("the arrows do not cross between two lists in one region, and Home and End scope to the one focus is in", async ({
  page,
}) => {
  await serveOverview(page);

  const gainers = listIn(page, "Movers", "Gainers");
  const losers = listIn(page, "Movers", "Losers");

  // Crossing takes a listener from *item 5 of 5* to *item 1 of 5* under one
  // key with no spoken boundary. They are two lists with two accessible names,
  // not one list with a rule through it.
  await gainers.getByRole("link", { name: "TSLA" }).focus();
  await page.keyboard.press("ArrowDown");
  expect(await focusedTicker(page)).toBe("TSLA");
  await page.keyboard.press("End");
  expect(await focusedTicker(page)).toBe("TSLA");

  await losers.getByRole("link", { name: "PFE" }).focus();
  await page.keyboard.press("ArrowUp");
  expect(await focusedTicker(page)).toBe("MRNA");
  await page.keyboard.press("Home");
  expect(await focusedTicker(page)).toBe("MRNA");

  // Two groups, two stops, **each where its own reader left it** — and the
  // sector region has two of its own, so the page carries four. The gainers'
  // stop is on `TSLA` rather than on `SMCI` because that is the row focus
  // reached above: a roving stop is the last row focused, not the first row
  // drawn, which is what makes tabbing out of a list and back return to where
  // the reader was.
  expect(await stopIn(gainers)).toEqual(["TSLA"]);
  expect(await stopIn(losers)).toEqual(["MRNA"]);

  await expectNothingFailedToRender(page);
});

test("a pad holds no stop, is not a link, and is not where End lands", async ({
  page,
}) => {
  await serveOverview(page);

  const losers = listIn(page, "Movers", "Losers");

  // Five rows of geometry, two of them real. The pads keep the region 466 px
  // in every state; what they must not be is reachable.
  await expect(losers.locator("li")).toHaveCount(5);
  await expect(losers.getByRole("link")).toHaveCount(2);
  expect(await stopIn(losers)).toEqual(["MRNA"]);

  await losers.getByRole("link", { name: "MRNA" }).focus();
  await page.keyboard.press("End");
  expect(await focusedTicker(page)).toBe("PFE");
  await page.keyboard.press("ArrowDown");
  expect(await focusedTicker(page)).toBe("PFE");

  await expectNothingFailedToRender(page);
});

test("a driven re-order moves the rows and leaves the stop on the SAME SECURITY", async ({
  page,
}) => {
  const send = await serveOverview(page);

  const sectors = listIn(
    page,
    "Sector performance",
    "Sectors ranked by today’s move",
  );

  // Rank 1 of nine. After the frame below it is rank 2, and rank 1 is the row
  // that was last.
  await sectors.getByRole("link", { name: "XLK" }).focus();
  expect(await stopIn(sectors)).toEqual(["XLK"]);

  // **Focus has to LEAVE the region for the list to move at all**, and that is
  // the shipped hold rather than a quirk of this test: `ORDER HELD` is scoped
  // to the region through `:focus-within`, so a reader whose hands are in the
  // list already has a still list (Story 4.3's own treatment). The window the
  // symbol keying is for is therefore precisely this one — **focus leaves, the
  // order changes, the stop survives the gap** — which is what the story's
  // hand-off said in as many words and what a test driving a re-order under a
  // focused row cannot produce.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });

  send(SECTORS_RERANKED);
  await expect(sectors.locator("li").first().getByRole("link")).toHaveAttribute(
    "data-ticker",
    "XLE",
  );

  // **The clause with no symptom until the list moves.** An index-keyed stop
  // is now on `XLE` — the row that was first is a different security — and the
  // reader's next `Tab` would land them on a sector they never chose. Keyed on
  // the symbol, the stop is still the one they left.
  expect(await stopIn(sectors)).toEqual(["XLK"]);

  // And coming back is coherent in the NEW order: the stop is where `Tab`
  // lands, and one press down from `XLK` at rank 2 is `XLC` at rank 3.
  await sectors.locator('a[tabindex="0"]').focus();
  expect(await focusedTicker(page)).toBe("XLK");
  await page.keyboard.press("ArrowDown");
  expect(await focusedTicker(page)).toBe("XLC");

  await expectNothingFailedToRender(page);
});

test("Space is the browser's and Enter opens the security", async ({
  page,
}) => {
  await serveOverview(page);

  const sectors = listIn(
    page,
    "Sector performance",
    "Sectors ranked by today’s move",
  );
  await sectors.getByRole("link", { name: "XLC" }).focus();

  // An `<a href>` does not activate on `Space`, and a reader inside a `Panel`
  // that declares `overflow: auto` is relying on it to scroll. A handler that
  // took it would navigate on a key press nobody expects to navigate.
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/\/$/u);
  expect(await focusedTicker(page)).toBe("XLC");

  // `Enter` is the anchor's own default and this component adds nothing to it:
  // the destination was resolved at render from the row's own identity, so no
  // frame can land between the key press and the address.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/securities\/XLC$/u);

  await expectNothingFailedToRender(page);
});
