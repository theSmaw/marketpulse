import {
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  MarketFeed,
  SectorLadderStep,
  WireFeedState,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// **Eleven sectors on the landing page, and the assertion that guards the grid
// they sit in** (Task 4.3.5).
//
// ## The grid guard, and why it could not have been written before now
//
// Task 4.3.1 changed `.regions` from `height: 82vh` with three `fr` rows to
// `min-height: 82vh` with a resolved row 1 and `repeat(2, minmax(min-content,
// 1fr))`, and added **no check** — correctly. An assertion written then would
// have passed **identically against the reverted stylesheet**, because with
// row 2 empty both shapes resolve to the same 161 / 265 / 265. There is nothing
// to distinguish them until a region holds more than its share.
//
// So the assertion that goes red on a revert exists only once this list does,
// and it is in two halves because they fail differently:
//
//   - **The region is taller than the fixed grid would have made it.** Measured
//     with `pnpm probe /` on 2026-09-27: **461 px** at 1440 × 900, against the
//     **265** three `fr` rows gave it before. The threshold below is the old
//     figure rather than the new one — what is being asserted is *this region
//     is no longer capped at its share*, and pinning the new height would be a
//     second home for a number the row design owns.
//   - **`scrollHeight` equals `clientHeight`.** This is the real defect and it
//     is the one a height assertion alone would miss: `Region` passes
//     `scrollable` unconditionally, so a region that does not fit does not
//     overflow visibly — it becomes a **silent scroller hiding the weakest
//     sector**. A region that reads correct and is short by one row.
//
// ## The height is asserted in TWO states, and that is done-when 4
//
// Eleven figures and eleven `unknown`s draw the same box: the ladder is hidden
// rather than removed, the footer reserves two line boxes whatever sentence is
// true, and a row with no move is the same 26 px as one with a figure. **The
// second state is the one every gated machine is permanently in** — CI's store
// is 518 securities and zero bars — so the pair is also what stops this spec
// asserting something only a developer's store can produce.
//
// ## What this spec serves, and what it therefore cannot say
//
// The frames are **produced here** with the shipped encoder, so a protocol
// change breaks this at the compiler rather than at an assertion, and every
// figure on screen is one this test wrote — on CI and on a developer's machine
// alike. That is `docs/GAPS.md`'s own repair arriving at a third surface: **a
// spec that asserts a figure serves its own answer.**
//
// What it says nothing about is whether a sector figure ever arrives from
// Alpaca. The chain from a real vendor frame to these eleven rows is covered
// piecewise elsewhere and end to end by nobody.

const OVERVIEW = "/";

/** The one venue value — `overview-proxy-live-update.spec.ts`'s rule. */
const VENUE: MarketFeed = "iex";

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: VENUE,
  marketOpen: true,
};

/** 14:01 ET on a Wednesday, so no extended-hours word anywhere on the page. */
const AT = "2026-09-16T18:01:00Z";

/**
 * The eleven, **already ranked** — `rankSectorFigures` runs server-side and the
 * browser draws the order it is given, so a harness sending an unranked array
 * would be producing a frame the gateway cannot send.
 */
const RANKED: readonly (readonly [string, string, number])[] = [
  ["XLK", "Technology", 1.84],
  ["XLC", "Communication Services", 0.96],
  ["XLY", "Consumer Discretionary", 0.63],
  ["XLI", "Industrials", 0.41],
  ["XLF", "Financials", 0.31],
  ["XLV", "Health Care", 0.12],
  ["XLB", "Materials", 0],
  ["XLP", "Consumer Staples", -0.18],
  ["XLU", "Utilities", -0.44],
  ["XLRE", "Real Estate", -0.87],
  ["XLE", "Energy", -1.27],
];

/** The declared `SECTORS` order, which is what an all-`unknown` list holds. */
const DECLARED = [
  "XLK",
  "XLV",
  "XLF",
  "XLY",
  "XLC",
  "XLI",
  "XLP",
  "XLE",
  "XLU",
  "XLRE",
  "XLB",
] as const;

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

const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

const overviewOf = (
  sectors: readonly WireOverviewFigure[],
  sectorLadderStep: SectorLadderStep,
): WireMarketOverview => ({
  computedAt: AT,
  feeds: sectors.some((figure) => figure.state === "observed") ? [VENUE] : [],
  figures: [],
  sectors,
  sectorLadderStep,
});

/**
 * Serve the market stream from the test: the gateway's connect sequence — a
 * structurally empty snapshot, then the aggregate, which is **not** scoped to a
 * subscription.
 */
async function serveSectors(
  page: Page,
  sectors: readonly WireOverviewFigure[],
  step: SectorLadderStep,
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
        overview: overviewOf(sectors, step),
      }),
    );
  });
}

const sectorRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Sector performance" });

const rowsIn = (page: Page): Locator =>
  sectorRegion(page).getByRole("listitem");

/** The box, as the browser resolved it — not as anything here computed it. */
const boxOf = (region: Locator) =>
  region.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));

/**
 * What three `fr` rows against a fixed `height: 82vh` gave this region before
 * Task 4.3.1 — measured with `pnpm probe /` at 1440 × 900, not derived here.
 *
 * At this viewport the revert is worse than the figure suggests: `(82vh − 2
 * gaps) / 3` is 181 px at 900, and 265 is what the region actually measured
 * under the shipped grid at the time. Either way a list of eleven rows, a
 * printed ladder and a two-line footer does not fit in it.
 */
const FIXED_GRID_HEIGHT = 265;

// 1440 × 900, which is the viewport every figure in this task's record was
// measured at. Stated rather than inherited, because `devices["Desktop
// Chrome"]` is 1280 × 720 and a height assertion taken at one viewport and run
// at another is a number nobody can check.
test.use({ viewport: { width: 1440, height: 900 } });

test("the sector region takes the height eleven rows need, and does not scroll them", async ({
  page,
}) => {
  await serveSectors(
    page,
    RANKED.map(([symbol, , percent]) => observed(symbol, percent)),
    2,
  );
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  await expect(rowsIn(page)).toHaveCount(RANKED.length);

  const box = await boxOf(sectorRegion(page));

  // **Half one: the grid let it grow.** Under the reverted stylesheet this is
  // 265 or less, whatever is in it.
  expect(box.height).toBeGreaterThan(FIXED_GRID_HEIGHT);

  // **Half two, and it is the one that matters.** A region capped at its share
  // reads correct and is short by one row, because `Region` passes `scrollable`
  // unconditionally and the eleventh sector — the weakest one — is simply
  // below the fold of a box nobody can see the edge of.
  expect(box.scrollHeight).toBe(box.clientHeight);

  // And the last row is inside the box rather than under it, which is the same
  // claim from the other end and is the one a reader would notice: the weakest
  // sector is the row a capped region loses.
  //
  // **Not `toBeInViewport`**, which was the first draft and is a different
  // assertion: that is about the browser's viewport and the page scroll
  // position, and this region legitimately sits below the fold at 900 px.
  const lastRow = await rowsIn(page).last().boundingBox();
  const regionBox = await sectorRegion(page).boundingBox();
  expect(lastRow).not.toBeNull();
  expect(regionBox).not.toBeNull();
  expect((lastRow?.y ?? 0) + (lastRow?.height ?? 0)).toBeLessThanOrEqual(
    (regionBox?.y ?? 0) + (regionBox?.height ?? 0),
  );

  await expectNothingFailedToRender(page);
});

test("the region is the same height with eleven figures and with none", async ({
  page,
}) => {
  // **Done-when 4, and the second state is CI's own.** 518 securities and zero
  // bars means every sector figure there is `unknown` for ever and the rung is
  // ±1 — so this is the state the runner is permanently in, and the pair is
  // what proves the ladder is hidden rather than removed and the footer
  // reserves its two lines whatever sentence is true.
  await serveSectors(
    page,
    RANKED.map(([symbol, , percent]) => observed(symbol, percent)),
    2,
  );
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expect(rowsIn(page)).toHaveCount(RANKED.length);
  const withFigures = await boxOf(sectorRegion(page));

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await serveSectors(page, DECLARED.map(unknown), 1);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expect(rowsIn(page)).toHaveCount(DECLARED.length);
  const withNone = await boxOf(sectorRegion(page));

  expect(withNone.height).toBe(withFigures.height);
  expect(withNone.scrollHeight).toBe(withNone.clientHeight);
  expect(withNone.height).toBeGreaterThan(FIXED_GRID_HEIGHT);

  await expectNothingFailedToRender(page);
});

/**
 * The figure as the screen sets it, **written out here rather than imported**.
 *
 * The formatter lives in the application and this spec is the independent
 * statement of what the screen should say; importing it would assert that the
 * application agrees with itself.
 */
const shown = (percent: number): string =>
  percent === 0
    ? "0.00%"
    : `${percent > 0 ? "+" : "−"}${Math.abs(percent).toFixed(2)}%`;

test("the region holds its full height before any frame has arrived", async ({
  page,
}) => {
  /*
   * **The paint before the first frame** (Task 4.3.7). A reserved panel is
   * 103 px at 768 and 121 at 390 against 461 and 437 filled, so every load of
   * this page stepped the two regions below it and the source note a moment
   * after painting — worst on a phone, where the grid row is content-sized.
   *
   * The reservation is the real component drawn from eleven rows of held room,
   * so the height it holds cannot drift from the height it is holding for:
   * this asserts that the two are the same number rather than that either is a
   * particular one.
   */
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
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  // Nothing is readable and nothing is announced: the eleven rows are out of
  // the accessibility tree entirely.
  await expect(rowsIn(page)).toHaveCount(0);
  const reserved = await boxOf(sectorRegion(page));

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await serveSectors(
    page,
    RANKED.map(([symbol, , percent]) => observed(symbol, percent)),
    2,
  );
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expect(rowsIn(page)).toHaveCount(RANKED.length);
  const filled = await boxOf(sectorRegion(page));

  expect(reserved.height).toBe(filled.height);
  expect(reserved.height).toBeGreaterThan(FIXED_GRID_HEIGHT);

  await expectNothingFailedToRender(page);
});

test("the eleven are drawn in the order the frame sent, each with its OWN label, ticker and figure", async ({
  page,
}) => {
  /*
   * **DOM order equals visual order**, read from the accessibility tree rather
   * than from geometry — the property a CSS `order` re-order would break
   * invisibly — and **the permutation**, which is the one defect class where
   * every individual number on the screen is correct.
   *
   * The frame carries `symbol` and the row shows `Technology`, so one wrong key
   * in the ticker → sector direction puts XLV's figure on the Financials row:
   * it compiles, it lints, it satisfies every arithmetic guard, it sums
   * correctly, it appears in no state grid and it survives greyscale. The
   * owner's whole argument for printing the ticker is that the row is checkable
   * by eye against a public quote, and this is that check performed
   * mechanically. `one-pairing-of-a-sector-and-its-benchmark` forbids a second
   * pairing **table**; what it cannot see is the one table being read correctly
   * and applied to the wrong row, which is a test and not a grep.
   *
   * **Eleven distinguishable figures, asserted as such.** A shared or repeated
   * value passes against any permutation — if every row read `+1.00%`, swapping
   * two rows would change nothing observable — so distinctness is asserted
   * first, at the two decimals the screen prints.
   */
  const figures = RANKED.map(([, , percent]) => shown(percent));
  expect(new Set(figures).size).toBe(RANKED.length);

  await serveSectors(
    page,
    RANKED.map(([symbol, , percent]) => observed(symbol, percent)),
    2,
  );
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  const drawn = await rowsIn(page).allInnerTexts();
  expect(drawn).toHaveLength(RANKED.length);

  RANKED.forEach(([symbol, label, percent], index) => {
    const text = drawn[index] ?? "";
    // The whole triple on every row — the printed ordinal, the full label, the
    // ticker, and the figure that belongs to that ticker.
    expect(text).toContain(String(index + 1));
    expect(text).toContain(label);
    expect(text).toContain(symbol);
    expect(text).toContain(shown(percent));

    // And **no other row's figure**, which is what a permutation of two rows
    // leaves behind.
    for (const other of figures.filter((entry) => entry !== shown(percent))) {
      expect(text).not.toContain(other);
    }
  });

  await expectNothingFailedToRender(page);
});

test("nothing is ranked on a store with no bars, and there is no ordered list at all", async ({
  page,
}) => {
  /*
   * **CI's permanent state**, and the one this spec proves best: 518 securities
   * and zero bars means all eleven sector figures are `unknown` for ever. An
   * `<ol>` of eleven unranked rows is the false impression with a role
   * attribute on it — a listener is told *item 10 of 11* over a row the product
   * is refusing to rank — so there is no ordered list at all, the eleven rows
   * are the trailing group, and its heading says so once.
   */
  await serveSectors(page, DECLARED.map(unknown), 1);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  await expect(rowsIn(page)).toHaveCount(DECLARED.length);

  expect(await sectorRegion(page).locator("ol").count()).toBe(0);

  const quiet = sectorRegion(page).getByRole("list", { name: "Not ranked" });
  await expect(quiet).toBeVisible();
  await expect(quiet.getByRole("listitem")).toHaveCount(DECLARED.length);

  const text = (await sectorRegion(page).innerText()).toLowerCase();

  // No figure anywhere, and no scale for bars nobody drew.
  expect(text).not.toContain("%");
  expect(text).toContain("none stored");
  // The claim survives, because it is about what a row IS.
  expect(text).toContain("capitalisation-weighted");
  // And the head says nothing: `0 of 11 ranked` is the contradiction the
  // trailing group's own heading already resolves.
  expect(text).not.toContain("of 11 ranked");

  await expectNothingFailedToRender(page);
});

test("a mixed frame ranks what it can, counts it, and says what is missing per row", async ({
  page,
}) => {
  /*
   * **Three absences, three different sentences, and not one of them a rank
   * position.** `None stored` is nothing observed and nothing held;
   * `No stored close` is a price that arrived with nothing to measure it
   * against; a **session** is a close we hold with nothing before it. None of
   * them renders `0.00%`, which would report a sector as unmoved when the truth
   * is that we have not heard.
   */
  await serveSectors(
    page,
    [
      observed("XLK", 1.84),
      observed("XLI", 0.41),
      observed("XLP", -0.18),
      { state: "observed", symbol: "XLV", at: AT, price: 148.22 },
      { state: "stored", symbol: "XLU", session: "2026-09-25", close: 91.04 },
      unknown("XLY"),
      unknown("XLF"),
      unknown("XLB"),
      unknown("XLC"),
      unknown("XLE"),
      unknown("XLRE"),
    ],
    2,
  );
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  await expect(rowsIn(page)).toHaveCount(11);

  await expect(
    sectorRegion(page).locator("ol").getByRole("listitem"),
  ).toHaveCount(3);

  const quiet = sectorRegion(page).getByRole("list", { name: "Not ranked" });
  await expect(quiet.getByRole("listitem")).toHaveCount(8);

  const words = await quiet.innerText();
  expect(words).toContain("No stored close");
  expect(words).toContain("2026-09-25 close");
  expect(words).toContain("None stored");
  // Not one of the eight carries a figure.
  expect(words).not.toContain("%");

  // The count speaks only in the mixed state, and it carries its denominator.
  await expect(sectorRegion(page).getByText("3 of 11 ranked")).toBeVisible();

  await expectNothingFailedToRender(page);
});
