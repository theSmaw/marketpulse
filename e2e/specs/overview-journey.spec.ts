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
import { FURNISHED_BREADTH } from "../support/feed.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// **The epic's exit criterion in a single interaction** (Task 4.6.7), and the
// two halves of it that a gated machine can and cannot see.
//
// ## AC 5 cannot pass on CI at either end, and that is the whole shape of this
//
// Story 4.6's AC 5 as first written is _land on `/`, reach a mover, open it,
// and read a figure on the security page_. **CI's store is 518 securities and
// zero bars**, so the overview frame a gated runner's own gateway builds
// carries `eligible: 0` and two empty mover lists for ever — there is no
// mover to reach — and `/securities/<anything>` there holds no figure to read.
// Both ends are absent, and this is the exact six-minute round trip
// `CLAUDE.md` records at `#314`.
//
// So the criterion is split across two tests in this file and a third in
// `specs-deployed/`:
//
// | Test                    | Origin             | Destination asserts | On CI                     |
// | ----------------------- | ------------------ | ------------------- | ------------------------- |
// | the journey, both hands | furnished frame    | **identity**        | runs, and is non-vacuous |
// | the figure half         | furnished frame    | a **figure**        | **skips, with its reason** |
// | `specs-deployed/`       | the real page      | **identity**        | not run here at all       |
//
// The first is the one that gates a merge, so it must assert something a
// zero-bar runner really has: the destination's **identity block**, whose
// subject is the `GET /securities` answer — 518 rows on every store this suite
// can meet — and never a price, a change or a bar.
//
// ## The anti-fixture rule, which is what makes test 1 worth more than its
// fixture
//
// A furnished spec can assert its own constants back to itself and look
// green. Two rules keep this one honest, and the second is a real defect
// arriving by the front door:
//
//  1. **The ticker is read out of the row the test is about to activate** —
//     from the DOM, never from the literal the frame was built with — and the
//     address is asserted to contain *that* string. A row that draws one
//     ticker and points at another then fails, which is the permutation defect
//     one axis over from `overview-nothing-to-open.spec.ts`' one query.
//  2. **The THIRD row is activated, and the first row's symbol is asserted
//     absent from the address.** A handler that always opens row 0 passes a
//     first-row test with every number on screen correct throughout — which is
//     the position-resolved activation Story 4.3's hand-off warned about. The
//     shipped implementation cannot express it (the destination is resolved at
//     render by `securityPath()` from the row's own identity), and that is
//     precisely why the assertion is cheap and worth having: it is what goes
//     red the day somebody puts a handler back.
//
// ## What this file does NOT assert
//
// Any figure, in test 1 — see above. The treatment, the ring geometry and any
// contrast ratio (`overview-focus-ring.spec.ts`' and `pnpm probe`'s). The
// tab-stop spine and the keyboard model inside a list
// (`overview-ranked-keyboard.spec.ts`'). And nothing here says a mover would
// ever have **arrived**: the frame came out of this file, which is the price of
// the pattern that `e2e/README.md` records under *not that a feed a spec
// furnishes would ever have arrived*.

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
 * **Real curated tickers, every one of them**, so the destination is a page
 * the product actually has.
 *
 * This is the difference between a journey and an assertion about a 404: the
 * identity block has two renderings, and a symbol the universe does not know
 * draws the *unresolved* one. Asserting a heading against an invented ticker
 * would therefore pass while proving the opposite of the thing under test.
 * Every symbol below is in `apps/backend/src/universe.ts` — the equities by
 * name, the sector ETFs through `SECTOR_ETFS`.
 */
const PROXIES: Ranked = [
  ["SPY", 0.42],
  ["QQQ", 0.71],
  ["DIA", 0.18],
  ["IWM", -0.33],
];

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

/** Five gainers, so the third row exists and is not the last one either. */
const GAINERS: Ranked = [
  ["SMCI", 9.14],
  ["FSLR", 6.72],
  ["NVDA", 3.41],
  ["AMD", 2.18],
  ["TSLA", 1.05],
];

/**
 * **Five losers, and the third one is a SINGLE-LETTER ticker on purpose.**
 *
 * `T` is in the curated universe, and it is third by magnitude so the keyboard
 * leg's destination assertion is the one that has to survive it. Measured on
 * `/securities/T`: `getByRole("heading", { level: 2, name: "T" })` resolves to
 * **seven** headings, because Playwright's `name` is a case-insensitive
 * **substring** match by default and the page's other eight `<h2>`s include
 * `Abnormal-move indicators`, `Relative performance` and `Tracked universe`.
 * Strict mode then refuses and the spec is red against a page that is working.
 * **So `exact: true` is load-bearing here rather than tidy**, and a fixture of
 * four-letter tickers would have hidden that from this file and from the
 * deployed spec, where the ticker is whatever the deployment offers and `T`,
 * `F`, `C`, `V` and `A` are all real ones.
 *
 * The pointer leg takes the third *gainer* and the keyboard leg the third
 * *loser*, so the two legs are two lists rather than one list twice — and a
 * padded losers list would put the keyboard leg's third row on a **held pad**,
 * which carries no link at all since Task 4.6.4 and is therefore not a
 * destination to walk to.
 */
const LOSERS: Ranked = [
  ["MRNA", -8.37],
  ["PFE", -3.12],
  ["T", -2.44],
  ["KO", -1.91],
  ["CVS", -0.77],
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

const FURNISHED: WireMarketOverview = {
  computedAt: AT,
  feeds: [VENUE],
  figures: PROXIES.map(([symbol, percent]) => observed(symbol, percent)),
  sectors: [
    ...SECTORS.map(([symbol, percent]) => observed(symbol, percent)),
    ...QUIET_SECTORS.map((symbol): WireOverviewFigure => ({
      state: "unknown",
      symbol,
    })),
  ],
  sectorLadderStep: 2,
  breadth: FURNISHED_BREADTH,
  movers: moversOf(GAINERS, LOSERS),
};

/**
 * Serve the market stream from the test, furnished, and keep the socket.
 *
 * `overview-nothing-to-open.spec.ts`' helper, narrowed to one frame because
 * nothing here sends a second one. **Awaited before the navigation** for its
 * reason: an unawaited `routeWebSocket` may not be installed when the page
 * dials, and the page then talks to the real gateway — which on a developer's
 * machine renders a plausible list of the local store's own figures and leaves
 * the test asserting against data the runner may not have.
 */
async function serveFurnishedOverview(page: Page): Promise<void> {
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
        overview: FURNISHED,
      }),
    );
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
}

const moversRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Movers" });

const moverList = (page: Page, name: "Gainers" | "Losers"): Locator =>
  moversRegion(page).getByRole("list", { name });

/** The tickers of a list's links, **in drawn order, read off the page**. */
const tickersIn = async (list: Locator): Promise<readonly string[]> =>
  list
    .locator("a[data-ticker]")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-ticker") ?? "?"),
    );

/** The ticker the page's focus is on, or what it is on instead. */
const focusedTicker = async (page: Page): Promise<string> =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (active === null) return "nothing";
    return active.getAttribute("data-ticker") ?? `<${active.localName}>`;
  });

/**
 * **The third row of a list, and the first, read from the DOM.**
 *
 * The anti-fixture rule in one place: both values come off the rendered page
 * and neither is a constant this file sent. The return is the pair, because
 * every assertion below needs both — the one to reach and the one that must
 * **not** be where the address goes.
 */
async function thirdAndFirst(
  list: Locator,
): Promise<{ readonly third: string; readonly first: string }> {
  const drawn = await tickersIn(list);

  // Not an assertion about the fixture — an assertion that the row this test
  // is about exists at all, so a short list fails here rather than three
  // assertions later as a confusing absence.
  expect(
    drawn.length,
    `the list drew ${String(drawn.length)} rows; the third-row rule needs at least three`,
  ).toBeGreaterThanOrEqual(3);

  const [first, , third] = drawn;
  if (first === undefined || third === undefined) {
    throw new Error("the list's rows have no tickers on them");
  }

  // The two must differ, or the clause *the address is not the first row's
  // symbol* is vacuous.
  expect(third).not.toBe(first);

  return { third, first };
}

/** The destination page names this symbol — **identity, never a figure**. */
async function expectTheSecurityPageNames(
  page: Page,
  symbol: string,
  other: string,
): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`/securities/${symbol}$`, "u"));

  // **And not the first row's.** `toHaveURL` above already pins the whole
  // path, so this is belt rather than braces — and it is the clause that names
  // the defect in its failure message, which is what a reader of a red run
  // gets.
  expect(
    page.url(),
    "the address went to the first row rather than the third",
  ).not.toContain(`/securities/${other}`);

  // The identity block's own `<h2>`, which is the *resolved* rendering: the
  // universe answer knows this symbol. `SecurityIdentity` draws an
  // `unresolved` `<h2>` carrying the same text for a symbol it does not know,
  // so the real content of this assertion is the URL above plus the page
  // having rendered its subject at all — which is why the figure assertions
  // live in their own test rather than being softened into this one.
  await expect(
    page.getByRole("heading", { level: 2, name: symbol, exact: true }),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
}

// 1440 × 900, the viewport every figure in this story's record was measured at.
test.use({ viewport: { width: 1440, height: 900 } });

test("the journey: land on `/`, open the THIRD mover row by pointer and another by keyboard, and the security page names it", async ({
  page,
}) => {
  await serveFurnishedOverview(page);

  // ---------------------------------------------------------------------
  // By pointer — the third GAINER
  // ---------------------------------------------------------------------
  const gainers = moverList(page, "Gainers");
  await expect(gainers.locator("a[data-ticker]")).toHaveCount(5);

  const up = await thirdAndFirst(gainers);

  await gainers.locator("a[data-ticker]").nth(2).click();
  await expectTheSecurityPageNames(page, up.third, up.first);

  // ---------------------------------------------------------------------
  // Back to the overview — client-side, which is the journey a reader takes
  // ---------------------------------------------------------------------
  //
  // The socket is `App`'s and survives a route change, so the page is still
  // furnished; nothing is re-sent and nothing needs to be.
  await page.goBack();
  await expect(moversRegion(page)).toBeVisible();

  // ---------------------------------------------------------------------
  // By keyboard — the third LOSER, so the two legs are two lists
  // ---------------------------------------------------------------------
  const losers = moverList(page, "Losers");
  await expect(losers.locator("a[data-ticker]")).toHaveCount(5);

  const down = await thirdAndFirst(losers);

  // The region is **one** tab stop and each list inside it carries **one**
  // roving stop (ADR 0039 and Story 4.5's hand-off), so the walk from the
  // section is: section → the gainers' stop → the losers' stop. Asserted at
  // each step rather than counted, because a silent off-by-one here would
  // make the arrow presses below act on the wrong list.
  await moversRegion(page).focus();
  await page.keyboard.press("Tab");
  expect(await focusedTicker(page)).toBe(up.first);
  await page.keyboard.press("Tab");
  expect(await focusedTicker(page)).toBe(down.first);

  // Two presses down the losers list, which clamps rather than wraps and never
  // crosses into the gainers.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  expect(await focusedTicker(page)).toBe(down.third);

  // `Enter` is the anchor's own default and nothing was added to it.
  await page.keyboard.press("Enter");
  await expectTheSecurityPageNames(page, down.third, down.first);
});

test("the figure half of AC 5, which no gated machine can run", async ({
  page,
}) => {
  // **AC 5's last clause — *read a figure on the security page* — and the
  // reason it is its own test rather than four more lines in the one above.**
  //
  // The origin is furnishable and the destination is not. A figure on
  // `/securities/:symbol` comes from `GET /market-data/bars` against the real
  // store, and **CI's store is 518 securities and zero bars**, so there is
  // nothing to read there and never will be. Asserting it in test 1 would
  // make the gated journey red on a healthy runner; omitting it would leave
  // the criterion's last clause asserted nowhere at all.
  await serveFurnishedOverview(page);

  const gainers = moverList(page, "Gainers");
  const { third, first } = await thirdAndFirst(gainers);

  await gainers.locator("a[data-ticker]").nth(2).click();
  await expectTheSecurityPageNames(page, third, first);

  const price = page.getByRole("region", { name: "Price" });

  // **The panel has settled on an answer first.** Reading the store's verdict
  // before the request has returned would skip on a store that has bars, which
  // is the one direction that makes a skip dishonest.
  await expect(
    price
      .getByText(/(^| )Open$/u)
      .or(price.getByText(/No (?:bars|volume) stored|No history stored/u))
      .first(),
  ).toBeVisible();

  const hasBars = await price
    .getByText(/(^| )Open$/u)
    .first()
    .isVisible();

  // **The reason, with the security named in it** —
  // `overview-movers-ranking.spec.ts`' shipped idiom. A skip says *this
  // instrument could not judge*; a green would let the suite claim it read a
  // figure it never saw.
  test.skip(
    !hasBars,
    `this store holds no bars for ${third}, so the security page has no figure to read — ` +
      `AC 5's last clause is unreachable on any gate, and on CI (518 securities, zero bars) it is unreachable for ever`,
  );

  // The window's own figures block: four labels and four numbers, which is a
  // figure a reader reads rather than a sentence about one.
  await expect(price.getByText(/(^| )Open$/u).first()).toBeVisible();
  await expect(price.getByText(/\d+\.\d{2}/u).first()).toBeVisible();

  await expectNothingFailedToRender(page);
});
