import {
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type { WireFeedState, WireObservation } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page, WebSocketRoute } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// **A live update landing in the universe table, in a real browser** (Task
// 3.6.6 — Story 3.6's criterion 6).
//
// ## What this can and cannot say, and why it is shaped the way it is
//
// **CI's store is 518 securities and zero bars, and CI has no credential and
// no upstream socket.** So the stream under test is one this spec PRODUCES —
// `security-price-motion.spec.ts`'s `serveFeed` pattern, answering the market
// socket from the test — and every assertion is about a **transition**: a
// number that was one thing and is now another. Nothing here asserts a figure
// that depends on bars existing, which is the trap `docs/GAPS.md`'s
// `e2e/specs/` entry and PR #314 already paid for once each.
//
// It therefore says everything about what the browser does with an arrival on
// this table and nothing about whether one arrives — the same price the
// motion spec pays and `e2e/README.md` records. The chain from a real frame to
// this table is covered piecewise elsewhere and end to end by nobody.
//
// ## Two stores, one spec
//
// On CI and against `marketpulse_bare` every row starts as an em dash with
// `No close yet` spoken; against a developer's store the same rows start as a
// stored close with its session date. The spec is written so that both are
// right: the cell the frame does NOT touch is asserted to be **unchanged**
// rather than to be any particular thing.

const SECURITIES = "/securities";

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: "iex",
  marketOpen: true,
};

/** When the gateway sent the frame (Task 3.6.4). Any instant; only its presence is load-bearing here. */
const SENT_AT = "2026-09-16T14:02:00.512Z";

/** 14:01 ET on a Wednesday — inside the session, so no extended-hours word. */
const FIRST_MINUTE = "2026-09-16T18:01:00Z";
const NEXT_MINUTE = "2026-09-16T18:02:00Z";

const bar = (startsAt: string, close: number): WireObservation => ({
  startsAt,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

/**
 * Serve the socket from the test and hand back a way to push more frames.
 *
 * The snapshot is what makes a price exist on the first paint; the returned
 * `push` is what makes one **arrive** — the event this spec is about.
 * Built with the shipped encoder, so a protocol change breaks this at the
 * compiler rather than at an assertion.
 */
async function serveFeed(
  page: Page,
  observations: Readonly<Record<string, WireObservation>>,
): Promise<(next: Readonly<Record<string, WireObservation>>) => void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: LIVE_FEED.feed }),
    }),
  );

  let socket: WebSocketRoute | undefined;

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    socket = ws;
    ws.send(
      encodeMarketStreamMessage({
        type: "snapshot",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        observations,
        feed: LIVE_FEED,
      }),
    );
  });

  return (next) => {
    socket?.send(
      encodeMarketStreamMessage({
        type: "bars",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        observations: next,
      }),
    );
  };
}

const universe = (page: Page) =>
  page.getByRole("region", { name: "Tracked universe" });

/** A row by its symbol — the `<th scope="row">` leads the accessible name. */
const rowOf = (page: Page, symbol: string) =>
  universe(page).getByRole("row", { name: new RegExp(`^${symbol} `, "u") });

/**
 * The `Last` cell of a row — the fifth column, located structurally rather
 * than by its text, because its text is exactly what is under test.
 */
const lastCellOf = (row: Locator) => row.getByRole("cell").nth(3);

const marksIn = (scope: Locator) => scope.locator("[data-arrival]");

test("a bar arriving changes a row's price with no reload, and moves nothing else", async ({
  page,
}) => {
  const push = await serveFeed(page, { NVDA: bar(FIRST_MINUTE, 219.5) });

  await page.goto(SECURITIES, { waitUntil: "networkidle" });

  const nvda = rowOf(page, "NVDA");
  const aapl = rowOf(page, "AAPL");
  await expect(nvda).toBeVisible();
  await expect(aapl).toBeVisible();

  // **The snapshot put a live price in the row.** Spoken as `Live price`, so a
  // listener can tell it from a stored close — the two look identical.
  await expect(lastCellOf(nvda)).toContainText("219.50");
  await expect(lastCellOf(nvda)).toContainText("Live price");

  // What the untouched row shows depends on the store — an em dash on CI and
  // against `marketpulse_bare`, a dated close on a developer's — so it is
  // captured rather than assumed, and asserted unchanged below.
  const appleBefore = await lastCellOf(aapl).innerText();
  const rowsBefore = await universe(page).getByRole("row").allInnerTexts();
  const orderBefore = rowsBefore.map((text) => text.split(/\s/u)[0]);

  push({ NVDA: bar(NEXT_MINUTE, 220.25) });

  // **The transition, which is the whole criterion.** The number that was one
  // thing is now another — in the row, without a navigation or a reload.
  await expect(lastCellOf(nvda)).toContainText("220.25");
  await expect(lastCellOf(nvda)).not.toContainText("219.50");
  await expect(lastCellOf(nvda)).toContainText("Live price");

  // **And nothing else moved.** Task 3.6.3's decision — the table does not
  // re-order under live data — asserted where a person would notice it, and
  // the row the frame did not carry is exactly what it was.
  // `useInnerText`, because `appleBefore` was read with `innerText()` and the
  // cell's visually-hidden sentence sits on its own line there; the default
  // reader collapses it to a space and the two never agree.
  await expect(lastCellOf(aapl)).toHaveText(appleBefore, {
    useInnerText: true,
  });
  const rowsAfter = await universe(page).getByRole("row").allInnerTexts();
  expect(rowsAfter.map((text) => text.split(/\s/u)[0])).toEqual(orderBefore);

  await expectNothingFailedToRender(page);
});

test("the arrival marks the row that arrived, and only that row", async ({
  page,
}) => {
  const push = await serveFeed(page, {
    NVDA: bar(FIRST_MINUTE, 219.5),
    AAPL: bar(FIRST_MINUTE, 231.4),
  });

  await page.goto(SECURITIES, { waitUntil: "networkidle" });
  await expect(lastCellOf(rowOf(page, "NVDA"))).toContainText("219.50");
  await expect(lastCellOf(rowOf(page, "AAPL"))).toContainText("231.40");

  // **A snapshot is not an arrival** (Task 3.5.4), and at universe scale that
  // is the difference between a table that populates and one that flashes
  // (Task 3.6.2): two live prices on screen, zero marks.
  await expect(marksIn(universe(page))).toHaveCount(0);

  push({ NVDA: bar(NEXT_MINUTE, 220.25) });
  await expect(lastCellOf(rowOf(page, "NVDA"))).toContainText("220.25");

  // One bar arrived, one row is marked — the row it arrived for — and the
  // other live row, which the frame did not carry, is not.
  await expect(marksIn(rowOf(page, "NVDA"))).toHaveCount(1);
  await expect(marksIn(rowOf(page, "AAPL"))).toHaveCount(0);
  await expect(marksIn(universe(page))).toHaveCount(1);

  // The same vocabulary as the identity block's mark, by construction: one
  // rule, `composes:`d by both. Asserted on the animation rather than a
  // sampled opacity, for `security-price-motion.spec.ts`'s reason.
  await expect(marksIn(rowOf(page, "NVDA"))).toHaveCSS(
    "animation-name",
    /arrival-decays/u,
  );

  await expectNothingFailedToRender(page);
});
