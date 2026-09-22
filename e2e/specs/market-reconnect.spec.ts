import {
  CONNECTION_DESCRIPTIONS,
  MARKET_STREAM_PROTOCOL_VERSION,
  decodeMarketStreamClientMessage,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type { WireFeedState, WireObservation } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

/** When the gateway sent the frame (Task 3.6.4). Any instant; only its presence is load-bearing here. */
const SENT_AT = "2026-09-16T14:02:00.512Z";

// **A tab survives a deploy** (Task 3.5.5).
//
// Story 3.3 shipped the browser's socket with **no retry**, so every backend
// deploy left every open tab reading `DISCONNECTED` until somebody reloaded —
// and deploys happen on every merge to `main`.
//
// ## Why this cannot exist below a browser
//
// The component tests hold the retry's arithmetic and its timers, and they are
// the right level for both. What they cannot do is **lose a socket and then
// get another one**: `routeWebSocket` re-enters its handler on each new
// connection, which is the whole mechanism under test, and there is no cheaper
// level at which *a second socket was opened by the page itself* is a question.
//
// ## What it must NOT assert
//
// A timing. The backoff is seams in the hook and a measured figure nowhere —
// asserting *it came back within N ms* here would be asserting Playwright's
// scheduler. What is asserted is that it came back **at all, without a reload**.

/**
 * **`marketOpen: false`, and that is the honest fixture rather than a dodge.**
 *
 * §11.2 runs staleness only while the market is open, so a recorded bar from
 * 14:01 on 2026-09-16 read at any later wall-clock instant is `stale` with the
 * gate on — correctly. Out of hours it is `live`, which is the canvas's own
 * row: at 03:00 the strip reads `IEX · LIVE` beside a masthead saying `CLOSED`,
 * because the word is a claim about the **connection** rather than the market.
 *
 * This spec is about a socket dying and coming back. Pinning the gate off keeps
 * the assertion on that rather than on how old a fixture happens to be.
 */
const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: "iex",
  marketOpen: false,
};

const LIVE = CONNECTION_DESCRIPTIONS.live.label;
const DISCONNECTED = CONNECTION_DESCRIPTIONS.disconnected.label;

/** The identity block's figure and its qualifier, by the label above them. */
function identityBlock(page: Page) {
  return page.getByText("Latest price", { exact: true }).locator("..");
}

const bar = (close: number): WireObservation => ({
  startsAt: "2026-09-16T14:01:00Z",
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

/** The feed cell in the status bar, which is where the connection word lives. */
const feedCell = (page: Page) =>
  page
    .getByRole("contentinfo")
    .getByText("Market feed", { exact: true })
    .locator("..");

const markOf = (page: Page) => page.locator("[data-arrival]");

/**
 * Serve the socket from the test, and hand back a way to drop it.
 *
 * **The handler runs again on every connection**, so a dropped socket that the
 * page replaces of its own accord gets a fresh snapshot — which is exactly what
 * a redeployed gateway does.
 */
async function serveDroppableFeed(
  page: Page,
  observations: Readonly<Record<string, WireObservation>>,
) {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: LIVE_FEED.feed }),
    }),
  );

  let connections = 0;
  let drop: (() => void) | undefined;
  /** Every subscription the page sent, in order, across every connection. */
  const subscriptions: string[][] = [];

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    connections += 1;

    ws.onMessage((raw) => {
      const decoded = decodeMarketStreamClientMessage(String(raw));
      if (decoded.kind === "message" && decoded.message !== undefined) {
        subscriptions.push([...decoded.message.symbols]);
      }
    });
    drop = () => {
      // `1001 going away` — what the gateway sends on shutdown (§12.2), and
      // the signal that separates *we are redeploying* from *your network
      // died*.
      // `void` because the close is fire-and-forget from the test's side: the
      // assertion that follows waits on what the PAGE does about it, which is
      // the only thing under test.
      void ws.close({ code: 1001, reason: "going away" });
    };
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

  return {
    connections: () => connections,
    subscriptions: () => subscriptions,
    drop: () => {
      drop?.();
    },
  };
}

test("a dropped socket comes back by itself, with no reload", async ({
  page,
}) => {
  // **Criterion 1, and the defect this task exists to remove.**
  const feed = await serveDroppableFeed(page, { NVDA: bar(219.5) });

  await page.goto("/securities/NVDA");
  await expect(feedCell(page).getByText(LIVE, { exact: true })).toBeVisible();

  // **A count before, not an absolute one.** React's `StrictMode` double-
  // invokes the effect in development, so a loaded page has already opened two
  // sockets and closed one — which `use-live-feed.ts` documents, because that
  // same double-invoke is how Task 3.3.6 found a teardown writing into the
  // next mount's state. What this test is about is that the count **grows**
  // after a drop nobody asked the page to recover from.
  const before = feed.connections();

  feed.drop();
  await expect(
    feedCell(page).getByText(DISCONNECTED, { exact: true }),
  ).toBeVisible();

  // **Nothing reloads the page here.** The only thing that can open the second
  // socket is the retry.
  await expect(feedCell(page).getByText(LIVE, { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  expect(feed.connections()).toBeGreaterThan(before);

  await expectNothingFailedToRender(page);
});

test("the price stays on screen for the whole outage", async ({ page }) => {
  // **§36's own rule** — *displaying data through 10:42:17*. Blanking the
  // numbers because a socket died would be the product removing true
  // information, and the existing Story 3.3 assertion says the same thing
  // about the venue.
  const feed = await serveDroppableFeed(page, { NVDA: bar(219.5) });

  await page.goto("/securities/NVDA");
  // **Scoped to the identity block since Task 3.6.1, and the reason is that
  // the figure is now correctly on the page TWICE**: this security's own
  // block, and its row in the tracked-universe table below, which went live in
  // the same task. An unscoped `getByText` was right when one surface showed a
  // live price and is a strict-mode violation now — the spec asserting the
  // product got better.
  const price = identityBlock(page).getByText("219.50", { exact: true });
  await expect(price).toBeVisible();

  feed.drop();
  await expect(
    feedCell(page).getByText(DISCONNECTED, { exact: true }),
  ).toBeVisible();

  // Still there, mid-outage, unchanged.
  await expect(price).toBeVisible();
});

test("the reconnect's snapshot fires no arrival mark", async ({ page }) => {
  // **Task 3.5.4's rule, on the path only this task can reach.** A snapshot is
  // *what we already held when you connected*, and a reconnect sends one — so
  // a page that marked here would announce as news a gap the reader has just
  // watched happen.
  const feed = await serveDroppableFeed(page, { NVDA: bar(219.5) });

  await page.goto("/securities/NVDA");
  await expect(feedCell(page).getByText(LIVE, { exact: true })).toBeVisible();

  feed.drop();
  await expect(feedCell(page).getByText(LIVE, { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  // The mark decays over 900 ms, so this is read after the reconnect has
  // settled rather than racing it.
  await expect(markOf(page)).toHaveCount(0);
});

test("the page re-sends its subscription on every reconnect", async ({
  page,
}) => {
  // **The trap Task 3.5.5 wrote down and Task 3.5.6 could finally fall into.**
  // A reconnect is a NEW socket the gateway knows nothing about. A browser
  // that sent its symbols once would come back connected, say `LIVE`, and
  // receive **nothing** — which looks healthy and is worse than the
  // `DISCONNECTED` it replaced.
  //
  // This is the only level that can check it: the subscription has to survive
  // a socket the page replaced of its own accord.
  const feed = await serveDroppableFeed(page, { NVDA: bar(219.5) });

  await page.goto("/securities/NVDA");
  await expect(feedCell(page).getByText(LIVE, { exact: true })).toBeVisible();

  await expect
    .poll(() => feed.subscriptions().length, { timeout: 10_000 })
    .toBeGreaterThan(0);
  // **`toContain` rather than `toEqual` since Task 3.6.1.** This screen renders
  // the tracked universe below the panel on both of its routes, so it asks for
  // every row it draws as well as the security on show — against CI's store
  // that is 518 symbols. What this test is about is that the subscription
  // survives a socket the page replaced, and the security on show is the part
  // of it worth naming.
  expect(feed.subscriptions().at(-1)).toContain("NVDA");

  const before = feed.subscriptions().length;
  feed.drop();

  await expect(feedCell(page).getByText(LIVE, { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  // **Sent again, on the new socket, without anybody asking.**
  await expect
    .poll(() => feed.subscriptions().length, { timeout: 10_000 })
    .toBeGreaterThan(before);
  // The same subscription, on the new socket. **The security on show leads it**
  // — the screen asks for its own symbol and then for every row of the
  // universe table below, which against CI's store is 518 in all.
  const resent = feed.subscriptions().at(-1) ?? [];
  expect(resent[0]).toBe("NVDA");
  expect(resent).toHaveLength(518);
});
