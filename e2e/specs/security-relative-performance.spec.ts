import {
  MARKET_STREAM_PROTOCOL_VERSION,
  SECTOR_ETFS,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  MarketFeed,
  WireFeedState,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import {
  expectEveryRegionIsATabStop,
  expectNothingFailedToRender,
} from "../support/app.js";
import {
  MARKET_DATA_ROUTE_PATTERN,
  SECURITIES_ROUTE_PATTERN,
} from "../support/pair.js";
import { FURNISHED_BREADTH } from "../support/feed.js";

// **`Relative performance` — the first region Epic 5 fills, and the one
// assertion about it that only a browser can make** (Task 5.1.3).
//
// ## It asserts no figure, and that is a requirement rather than a shortcut
//
// CI's store is 516 securities and **zero bars**, so `GET /securities` carries
// no `lastClose` there and the subject half of this comparison has nothing to
// measure from, for ever. A spec asserting `behind by 2.20 pts` would therefore
// be asserting the frames it wrote itself against a page whose third figure is
// permanently absent — `docs/GAPS.md`'s own finding, and Task 4.3.8's: four
// overview specs passed against a server with the ranking deleted, each
// asserting its own fixture.
//
// So what is asserted here is **structure, text and geometry**: the region is
// named, it is a tab stop, it draws its three labelled rows and its two
// separately-labelled derived lines, it states what its references are — and
// **it is the same height whether anything has been observed or not**, which is
// the claim the whole band-by-band reservation exists to keep and the one thing
// no unit, component or integration test in this repository can see.
//
// ## The frames are produced here
//
// With the shipped encoder, so a protocol change breaks this at the compiler
// rather than at an assertion, and the two states are reachable identically on
// CI and on a developer's store. What it says nothing about is whether a sector
// benchmark's move ever arrives from Alpaca.

const EXPLORER = "/securities/NVDA";

/** The one venue value — `overview-proxy-live-update.spec.ts`'s rule. */
const VENUE: MarketFeed = "iex";

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: VENUE,
  marketOpen: true,
};

/** 14:01 ET on a Wednesday, so no extended-hours word anywhere on the page. */
const AT = "2026-09-16T18:01:00Z";

/** The broad-market proxy this region compares against. */
const MARKET = "SPY";

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

const overviewOf = (
  figures: readonly WireOverviewFigure[],
  sectors: readonly WireOverviewFigure[],
): WireMarketOverview => ({
  computedAt: AT,
  feeds: figures.length + sectors.length > 0 ? [VENUE] : [],
  figures,
  sectors,
  // See `FURNISHED_BREADTH`: required on the producer, so omitting it would
  // draw a neighbouring surface as reserved in a spec about this one.
  breadth: FURNISHED_BREADTH,
});

/**
 * Serve the market stream from the test: the gateway's connect sequence — a
 * structurally empty snapshot, then the aggregate, which is **not** scoped to a
 * subscription.
 */
async function serveOverview(
  page: Page,
  overview: WireMarketOverview,
): Promise<void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: VENUE }),
    }),
  );

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
    ws.send(
      encodeMarketStreamMessage({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: new Date().toISOString(),
        overview,
      }),
    );
  });
}

/**
 * Serve the connect sequence **without an aggregate** — the snapshot only.
 *
 * Which is the one state in which this region has nothing of anybody's to
 * draw, and is therefore the only one that says `No comparison yet.`
 */
async function serveNoOverview(page: Page): Promise<void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: VENUE }),
    }),
  );

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
  });
}

/** Both references heard from, which is the state a developer's store draws. */
const HEARD = overviewOf(
  [observed(MARKET, -0.6)],
  [observed(SECTOR_ETFS.technology, -2)],
);

/**
 * **An aggregate that ARRIVED carrying nothing** — which is every gated run's
 * permanent state, and is not the same fact as no aggregate at all.
 */
const SILENT = overviewOf([], []);

/**
 * Serve the tracked universe with **no stored closes**, which is the one way
 * the nothing-state is reachable on a store that holds bars.
 *
 * The real backend answers and one field of its body is emptied, rather than a
 * body being written here — `serveTrimmedUniverse`'s shape, and the reason is
 * the same: the rows, the sectors and the kinds are then this product's own
 * data and a wire change breaks this the way it breaks the page. It is not
 * `serveTrimmedUniverse` itself because that samples the universe down and
 * this spec is about one named security.
 *
 * **On CI this changes nothing** — the store has zero bars, so `lastCloses` is
 * already empty — which is the point: it makes both machines produce the same
 * two states.
 */
async function withoutCloses(page: Page): Promise<void> {
  await page.route(SECURITIES_ROUTE_PATTERN, async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as Record<string, unknown>;
    await route.fulfill({ response, json: { ...body, lastCloses: [] } });
  });
}

const region = (page: Page): Locator =>
  page.getByRole("region", { name: "Relative performance" });

const heightOf = (locator: Locator) =>
  locator.evaluate((element) => element.getBoundingClientRect().height);

test.use({ viewport: { width: 1440, height: 900 } });

test("the region names its three subjects and its two comparisons", async ({
  page,
}) => {
  await serveOverview(page, HEARD);
  await page.goto(EXPLORER, { waitUntil: "networkidle" });

  const panel = region(page);
  await expect(panel).toBeVisible();

  // The three rows, in the fixed order subject → sector → market. **Nothing
  // here is ranked**: three figures read against each other is not a ranking,
  // and ranking them would answer a question nobody asked.
  await expect(panel).toContainText("This security");
  await expect(panel).toContainText("NVDA");
  await expect(panel).toContainText("Broad market");
  await expect(panel).toContainText(MARKET);
  await expect(panel).toContainText(SECTOR_ETFS.technology);

  // **Two separately labelled lines, never one prose sentence**, because the
  // sector half and the market half fail independently and prose cannot be
  // half-refused without becoming ungrammatical.
  await expect(panel).toContainText("Against Technology");
  await expect(panel).toContainText("Against the broad market");

  // What the references are. The one caveat a reader needs in order to know
  // that a mega-cap is largely being compared with itself.
  await expect(panel).toContainText(
    "capitalisation-weighted, not the average of its members",
  );

  // The region it replaced said this, and a placeholder that survives the thing
  // it was waiting for is a screen holding a plan while holding the plan's
  // output.
  // **Re-pointed 2026-10-29 by Task 5.7.4, because this assertion had become
  // VACUOUS and nothing would have said so.** It tested that the region draws
  // its content rather than still showing a placeholder — true and useful while
  // `Filled by Epic 5 — Anomaly Detection` was a string this product emitted.
  // Task 5.7.4 changed that placeholder to name a **condition** instead, so the
  // literal above can no longer appear anywhere on any page and a `not`
  // assertion against it could never fail again. It is now keyed on the
  // **shape** every placeholder shares, which is the clause a re-implementer
  // cannot avoid: `RegionPlaceholder` supplies the words `Filled by` itself so
  // that five call sites cannot drift into five phrasings.
  //
  // The general form, and it is the half of a string change nobody looks for: a
  // NEGATIVE assertion about a literal is silently disarmed the day that
  // literal stops existing, and every suite stays green.
  await expect(panel).not.toContainText(/^Filled by /);

  await expectNothingFailedToRender(page);
});

test("a region with no frame at all says so, and is exactly as tall", async ({
  page,
}) => {
  await serveOverview(page, HEARD);
  await page.goto(EXPLORER, { waitUntil: "networkidle" });
  await expect(region(page)).toBeVisible();
  const drawn = await heightOf(region(page));

  await withoutCloses(page);
  await serveNoOverview(page);
  await page.goto(EXPLORER, { waitUntil: "networkidle" });
  await expect(region(page)).toBeVisible();

  // The fifth honest-nothing noun in this product, beside `no history stored`,
  // `no bars stored for this window`, `unknown` and breadth's `heard from`. It
  // is a sibling inside the region's own held room rather than an override on
  // it, because `visibility` is inherited and un-hiding the box would un-hide
  // every reserved row in it — a live defect for ten days one region over.
  await expect(region(page).getByText("No comparison yet.")).toBeVisible();

  // **And the room it holds is held from the accessibility tree too.** The
  // whole geometry is one `aria-hidden` element with the sentence as a sibling
  // — never an override on the same element, because `visibility` is inherited
  // and un-hiding the box un-hides every reserved row in it, which leaked
  // eleven internal sector slugs one region over for ten days. So a reader
  // using a screen reader is told the one true thing and is not read a ladder,
  // three tickers and a scale for figures that do not exist.
  const spoken = await region(page).ariaSnapshot();
  expect(spoken).toContain("No comparison yet.");
  expect(spoken).not.toContain("SPY");
  expect(spoken).not.toContain("%");

  const held = await heightOf(region(page));

  // **The assertion this spec exists for.** Seven states, one height: the
  // region sits in a column of three, so a region that grows when a benchmark
  // arrives moves `Anomaly history` under the reader. `Movers` paid exactly
  // this at 81 px, and every band here reserves its own room so that it cannot
  // happen again — a claim nothing below a browser can check, because jsdom
  // applies no stylesheet and computes no layout.
  expect(held).toBe(drawn);

  await expectNothingFailedToRender(page);
});

test("an aggregate that arrived carrying nothing does NOT read as no aggregate", async ({
  page,
}) => {
  // **The state every gated run is permanently in** (Task 5.1.4). CI's store
  // is 516 securities and zero bars, so the aggregate arrives and carries
  // `unknown` for all of them. *Nothing has reached us yet* and *everything
  // reached us and none of it had a move* are different facts, and `/` paid
  // for collapsing them once already (Task 4.3.8): held behind one sentence,
  // three rows of honest absence are thrown away and the reader is told the
  // socket is quiet when it is not.
  await withoutCloses(page);
  await serveOverview(page, SILENT);
  await page.goto(EXPLORER, { waitUntil: "networkidle" });

  const panel = region(page);
  await expect(panel).toBeVisible();

  // Each reference says its own absence, on its own row, rather than one
  // sentence standing for all three.
  await expect(panel.getByText("Not heard from")).toHaveCount(3);
  await expect(panel.getByText("No comparison yet.")).toHaveCount(0);

  await expectNothingFailedToRender(page);
});

test("the region is a tab stop like every other", async ({ page }) => {
  await serveOverview(page, HEARD);
  await page.goto(EXPLORER, { waitUntil: "networkidle" });
  await expect(region(page)).toBeVisible();

  // ADR 0039: a tab stop must not appear and disappear under a reader, so
  // `Region` is one unconditionally — which this region inherits rather than
  // decides. Asserted over every region on the route, because the defect this
  // replaces is a stop that exists in one state and not another.
  await expectEveryRegionIsATabStop(page, { atLeast: 8 });
});
