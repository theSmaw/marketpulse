import { readFileSync } from "node:fs";

import {
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type { WireFeedState, WireObservation } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page, WebSocketRoute } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import {
  BARS_ROUTE_PATTERN,
  MARKET_DATA_ROUTE_PATTERN,
} from "../support/pair.js";

// **The chart extends while you watch it** (Task 3.9.2).
//
// ## Why this cannot exist below a browser
//
// The component tests prove the *merge* — `live-series.test.ts` holds the rule
// that a correction replaces rather than appends, and `use-live-series.test.ts`
// holds the memory that makes three frames into three bars. Neither can see
// **a page**: that the socket a route opened reaches the hook a chart reads,
// through `App`, a prop, a hook and a memo boundary. Three defects of that
// exact family have shipped with `pnpm verify` green — something that exists in
// one layer and cannot be reached from the next.
//
// ## Why every byte here is stubbed
//
// CI's store has 518 securities and **zero bars**, and CI has no vendor
// credential, so a runner cannot otherwise reach a state where a chart has a
// line on it at all, let alone one that grows. The answer is a **recorded**
// body — `partial.json`, 60 bars ending at 19:59 with the window reaching the
// next session's close, so there is room in it for a minute to arrive — and the
// socket is served from the test with the shipped encoder, so a protocol change
// breaks this at the compiler rather than at an assertion.
//
// ## What it deliberately does not assert
//
// **Anything about how the new bar looks.** Task 3.9.2 draws it exactly like
// the 60 behind it; the treatment is Task 3.9.3's and gets its own assertions
// when there is something to assert. This spec is about the count.

const EXPLORER = "/securities/NVDA?sessions=1";

/** The recorded answer this page is given: 60 bars, and room for more. */
const PARTIAL = readFileSync(
  new URL(
    "../../apps/frontend/src/fixtures/bar-series/partial.json",
    import.meta.url,
  ),
  "utf8",
);

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: "iex",
  marketOpen: true,
};

const SENT_AT = "2026-09-04T20:00:00.512Z";

/** The minute after the recorded answer's last bar, inside its window. */
const NEXT_MINUTE = "2026-09-04T20:00:00.000Z";

const bar = (startsAt: string, close: number): WireObservation => ({
  startsAt,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

/** How many closing prices the chart says it is drawing. */
function drawnCount(page: Page) {
  return page.getByText(/price chart: a line of/u).first();
}

/** Serve the answer and the socket, and hand back a way to push a minute. */
async function serve(
  page: Page,
): Promise<(next: Readonly<Record<string, WireObservation>>) => void> {
  await page.route(BARS_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: PARTIAL,
    }),
  );

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
    // An empty snapshot: nothing has arrived yet, which is the state a page
    // opens in and the one this spec measures from.
    ws.send(
      encodeMarketStreamMessage({
        type: "snapshot",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: SENT_AT,
        observations: {},
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

test("the line is longer a minute later, with no reload", async ({ page }) => {
  const push = await serve(page);

  await page.goto(EXPLORER);
  await expect(drawnCount(page)).toContainText("a line of 60 closing prices");

  push({ NVDA: bar(NEXT_MINUTE, 219.5) });

  // The whole story in one assertion: nothing was fetched, nothing was
  // reloaded, and the chart is drawing one more bar than it was.
  await expect(drawnCount(page)).toContainText("a line of 61 closing prices");

  await expectNothingFailedToRender(page);
});

test("a correction replaces the minute it corrects rather than adding one", async ({
  page,
}) => {
  const push = await serve(page);

  await page.goto(EXPLORER);
  push({ NVDA: bar(NEXT_MINUTE, 219.5) });
  await expect(drawnCount(page)).toContainText("a line of 61 closing prices");

  // **The shape that used to be a 500.** A revision arrives ~30 s after its
  // bar and carries the minute it corrects; appending it would give the series
  // two bars for one instant, which `toBarSeries` refuses by throwing — and a
  // throw inside a React render takes the page down, because nothing above
  // `App` catches one.
  push({ NVDA: bar(NEXT_MINUTE, 221.75) });

  await expect(drawnCount(page)).toContainText("ending at 221.75");
  await expect(drawnCount(page)).toContainText("a line of 61 closing prices");

  await expectNothingFailedToRender(page);
});
