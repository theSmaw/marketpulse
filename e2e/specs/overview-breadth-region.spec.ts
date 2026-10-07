import {
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  MarketFeed,
  WireFeedState,
  WireMarketBreadth,
  WireMarketOverview,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// **The breadth region on the landing page** (Task 4.4.5,
// `The breadth ledger.dc.html`).
//
// ## What this spec serves, and what it therefore cannot say
//
// The frames are **produced here** with the shipped encoder, so a protocol
// change breaks this at the compiler rather than at an assertion, and every
// figure on screen is one this test wrote — on CI and on a developer's machine
// alike. `overview-sector-region.spec.ts`' rule, one region across: **a spec
// that asserts a figure serves its own answer**, because CI's store is 518
// securities and **zero bars**, so a figure assertion against the real gateway
// there would be an assertion about data the runner does not have.
//
// What it says nothing about is whether a count ever arrives from Alpaca. That
// chain is covered piecewise elsewhere and end to end by nobody.
//
// ## The three things only a browser can see here
//
// **The height is one box in every state**, which is the page-level constraint
// rather than a regional one: `Market breadth`, `Sector performance` and
// `Movers` share one `fr` ratio, so a state a pixel taller moves two other
// regions. Nothing below `pnpm e2e` computes a layout, so this is unassertable
// anywhere else.
//
// **The region does not scroll its own content.** `Region` passes `scrollable`
// unconditionally, so a region that does not fit does not overflow visibly — it
// becomes a silent scroller hiding the footer clause, which reads correct and is
// short by the one sentence that says what *heard from* means.
//
// **The N = 0 state draws no counts**, which is CI's own state end to end and
// is the one this product's discipline is most at risk from: three rows reading
// `0 0 0` is a fully-formed claim that the market did not move.

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
 * A live count, mid-session.
 *
 * **Every figure is an inference and the re-measure over the 503 is still
 * owed** — Task 4.1.6's band of 446–498 was taken over 518 and nobody may cite
 * it as a figure over 503; it needs a session, and Task 4.4.6 met a shut
 * market. Nothing here depends on the figures being realistic; what they have
 * to be is internally consistent, because `readOverview` refuses a section
 * whose counts do not sum to its denominator.
 */
const OBSERVED: WireMarketBreadth = {
  basis: "observed",
  advancing: 284,
  declining: 152,
  unchanged: 15,
  measured: 451,
  tracked: 503,
  windowMinutes: 5,
};

/**
 * **CI's own state, and the market's for roughly 80% of the week.**
 *
 * `measured: 0` with the basis saying which question was asked is the honest
 * spelling of *we counted and heard nothing*; it is not the same as the section
 * being absent, which says *this gateway does not send breadth*.
 */
const NOTHING_COUNTED: WireMarketBreadth = {
  basis: "session",
  advancing: 0,
  declining: 0,
  unchanged: 0,
  measured: 0,
  tracked: 503,
  session: "2026-09-16",
};

const overviewOf = (breadth: WireMarketBreadth): WireMarketOverview => ({
  computedAt: AT,
  feeds: [VENUE],
  figures: [],
  breadth,
});

/**
 * Serve the market stream from the test: the gateway's connect sequence — a
 * structurally empty snapshot, then the aggregate, which is **not** scoped to a
 * subscription.
 */
async function serveBreadth(
  page: Page,
  breadth: WireMarketBreadth | undefined,
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
        overview:
          breadth === undefined
            ? { computedAt: AT, feeds: [VENUE], figures: [] }
            : overviewOf(breadth),
      }),
    );
  });
}

const breadthRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Market breadth" });

/** The box, as the browser resolved it — not as anything here computed it. */
const boxOf = (region: Locator) =>
  region.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));

// 1440 × 900, which is the viewport every figure in this task's record was
// measured at. Stated rather than inherited, because `devices["Desktop
// Chrome"]` is 1280 × 720 and a height assertion taken at one viewport and run
// at another is a number nobody can check.
test.use({ viewport: { width: 1440, height: 900 } });

test("the ledger draws three counts, the remainder and the net", async ({
  page,
}) => {
  await serveBreadth(page, OBSERVED);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  const region = breadthRegion(page);

  // **The three counts, each beside the word that is its direction.** The
  // region spells no glyph in the ledger: the label carries the direction and
  // the band carries the magnitude, which is what survives `grayscale(1)`.
  for (const [label, count] of [
    ["Advancing", "284"],
    ["Declining", "152"],
    ["Unchanged", "15"],
  ]) {
    await expect(
      region.locator("dt", { hasText: new RegExp(`^${String(label)}$`, "u") }),
    ).toHaveCount(1);
    await expect(
      region
        .locator("dd")
        .filter({ hasText: new RegExp(`^${String(count)}$`, "u") }),
    ).toHaveCount(1);
  }

  // **`advancing + declining + unchanged` visibly equals N**, which is
  // done-when 2 and is why the shape prints counts rather than percentages:
  // 284 + 152 + 15 = 451, and the sum is the ladder's right endpoint.
  await expect(region.getByText("451", { exact: true })).toBeVisible();

  // And `451 + 52 = 503`: the set in the group's heading, the remainder in the
  // aligned count column below the rule.
  await expect(region.getByRole("heading", { level: 3 })).toHaveText(
    "Of the 503 we track",
  );
  await expect(
    region.locator("dt", { hasText: /^Not heard from$/u }),
  ).toBeVisible();
  await expect(region.getByText("52", { exact: true })).toBeVisible();

  // **The headline, through `PriceChange`** — the only glyph in the region, and
  // the only figure in it with a direction of its own.
  //
  // Asserted as the **concatenation a screen reader is handed** rather than as
  // one element's text, because the component splits the figure across three:
  // the `aria-hidden` glyph, the visually-hidden word, and the digits. A spec
  // that asked for `+132` alone would be asking for a node that does not exist.
  await expect(region).toContainText("Net advancing");
  await expect(region.locator('[class*="_headlineFigure_"]')).toHaveText(
    "▲up +132",
  );

  // **The footer defines `heard from` and names no count.** The window travels
  // on the frame, so this sentence cannot be wrong about the count above it.
  await expect(
    region.getByText(
      "Heard from means at least one observation in the last 5 minutes.",
    ),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
});

test("the region says no instant and no connection word", async ({ page }) => {
  // `live` / `stale` / `disconnected` have one home and it is the status bar,
  // and `computedAt` is already drawn by the screen's one source note under
  // `Computed`. This region carries the window and nothing else about method.
  await serveBreadth(page, OBSERVED);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  const text = (await breadthRegion(page).innerText()).toLowerCase();

  expect(text).not.toContain("live");
  expect(text).not.toContain("stale");
  expect(text).not.toContain("disconnected");
  expect(text).not.toContain("iex");
  expect(text).not.toContain("exchange");
  expect(text).not.toContain("14:01");
  // The fourth word for the remainder, which the story forbids on screen.
  expect(text).not.toContain("unobserved");

  await expectNothingFailedToRender(page);
});

test("the region is one box with counts and with none", async ({ page }) => {
  // **Done-when 4, and the second state is CI's own.** 518 securities and zero
  // bars means `measured` is `0` there for ever — so the pair is what proves
  // the ledger is suppressed rather than removed and the footer reserves its
  // two lines whatever sentence is true.
  //
  // **The third state — the paint before any frame — is not here**, and that is
  // a gap rather than an omission: producing it needs a socket that opens and
  // never sends an overview, which this harness does not model. The sibling
  // spec covers the same geometry for `Sector performance`, and the sentence
  // that belongs in that state is Task 4.4.6's.
  await serveBreadth(page, OBSERVED);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expect(
    breadthRegion(page).getByText("451", { exact: true }),
  ).toBeVisible();
  const counted = await boxOf(breadthRegion(page));

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await serveBreadth(page, NOTHING_COUNTED);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expect(
    breadthRegion(page).getByRole("heading", { level: 3 }),
  ).toHaveText("Of the 503 we track");
  const none = await boxOf(breadthRegion(page));

  expect(none.height).toBe(counted.height);

  // **A region capped at its share reads correct and is short by a sentence**,
  // because `Region` passes `scrollable` unconditionally — so it does not
  // overflow visibly, it becomes a silent scroller.
  expect(counted.scrollHeight).toBe(counted.clientHeight);
  expect(none.scrollHeight).toBe(none.clientHeight);

  await expectNothingFailedToRender(page);
});

test("nothing counted draws no counts, which is a different state from no section", async ({
  page,
}) => {
  // ADR 0029: a fully-formed partition over zero observations is a false
  // impression rather than a courtesy. The ledger, the ladder and the headline
  // are suppressed and their room is kept; the quiet group is the only thing
  // with content, and it carries the whole truth.
  await serveBreadth(page, NOTHING_COUNTED);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  const region = breadthRegion(page);

  await expect(region.getByRole("heading", { level: 3 })).toHaveText(
    "Of the 503 we track",
  );
  await expect(region.getByText("503", { exact: true })).toBeVisible();
  // **No net over nothing, and no three zeros claiming the market did not
  // move.** The ledger keeps its room and gives up its content, so the
  // assertion is that it is hidden rather than that it is gone — `display:
  // none` here would be the region changing height when the market opens.
  await expect(region.locator("dl").first()).toBeHidden();
  await expect(region.locator('[class*="_headlineFigure_"]')).toBeHidden();
  await expect(region.locator("dl").nth(1)).toBeVisible();

  await expectNothingFailedToRender(page);
});

test("a frame with no breadth section draws the region's own sentence", async ({
  page,
}) => {
  // The read side keeps the section optional because a **rollback pins a
  // previous image**, so a new bundle can legitimately meet a gateway that
  // never heard of breadth. That gateway will never send one, so the honest
  // answer is the region saying what it would hold — and not three zeros.
  await serveBreadth(page, undefined);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  const region = breadthRegion(page);

  await expect(
    region.getByText(/Advancing, declining and unchanged/u),
  ).toBeVisible();
  await expect(region.getByRole("heading", { level: 3 })).toHaveCount(0);

  await expectNothingFailedToRender(page);
});
