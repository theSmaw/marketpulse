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

/**
 * A **recorded** session, split the way production splits one.
 *
 * `dense.json` is five complete sessions of minute bars. The page is served
 * every bar but the last three; the last three arrive over the socket. That is
 * exactly the shape a mid-session page is in — the store holds a prefix and the
 * feed delivers the rest — and every byte of it is recorded rather than
 * invented.
 *
 * **Holding bars back rather than inventing a next minute is the whole point,
 * and Task 3.9.3 paid for learning it.** The first version of this spec pushed
 * a bar one minute after the fixture's last, which landed on a **session
 * close** — an instant `timeAxis` gives no slot, so the chart's sentence
 * counted it and the chart's line could not draw it. The product was right and
 * the spec was wrong, and neither the spec nor twenty minutes of a browser
 * could tell which.
 */
const RECORDED = JSON.parse(
  readFileSync(
    new URL(
      "../../apps/frontend/src/fixtures/bar-series/dense.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  series: {
    bars: {
      startsAt: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[];
    provenance: { sources: { barCount: number }[] };
    coverage: { covered: { end: string } };
  };
};

/** How many of the recorded bars arrive over the socket rather than in the answer. */
const HELD_BACK = 3;

const HELD = RECORDED.series.bars.slice(-HELD_BACK);

/** Where the served half stops — the first held-back bar's own instant. */
const HELD_FROM = HELD[0]?.startsAt;
if (HELD_FROM === undefined) {
  throw new Error(
    "the recorded session has fewer bars than this spec holds back",
  );
}

/** The answer the store would give a page opened three minutes before the end. */
const SERVED = JSON.stringify({
  ...RECORDED,
  series: {
    ...RECORDED.series,
    bars: RECORDED.series.bars.slice(0, -HELD_BACK),
    provenance: {
      ...RECORDED.series.provenance,
      sources: RECORDED.series.provenance.sources.map((source, index, all) =>
        index === all.length - 1
          ? { ...source, barCount: source.barCount - HELD_BACK }
          : source,
      ),
    },
    coverage: {
      ...RECORDED.series.coverage,
      covered: { ...RECORDED.series.coverage.covered, end: HELD_FROM },
    },
  },
});

const SERVED_COUNT = RECORDED.series.bars.length - HELD_BACK;

/** The counts as the sentence spells them — thousands separated. */
const served = SERVED_COUNT.toLocaleString("en-US");
const grown = (SERVED_COUNT + 1).toLocaleString("en-US");

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: "iex",
  marketOpen: true,
};

const SENT_AT = "2026-09-04T20:00:00.512Z";

/** One of the held-back bars, as the wire carries it. */
const held = (index: number, close?: number): WireObservation => {
  const bar = HELD[index];
  if (bar === undefined) throw new Error(`no held bar ${String(index)}`);
  return close === undefined
    ? bar
    : { ...bar, close, high: Math.max(bar.high, close) };
};

/** How many closing prices the chart SAYS it is drawing. */
function drawnCount(page: Page) {
  return page.getByText(/price chart: a line of/u).first();
}

/**
 * How many points the chart actually DRAWS.
 *
 * **Added by Task 3.9.3, because asserting the sentence is not asserting the
 * picture.** That task set out to design a treatment for the arriving bar and
 * spent its first twenty minutes unable to tell whether the line had gained a
 * point at all — the spoken alternative said 61 and the path said 60, and the
 * difference turned out to be an invented instant landing on a session close,
 * where `timeAxis` has no slot. The product was right and the instrument was
 * wrong, and nothing in this spec could have told them apart.
 *
 * The series line is the path whose class names it: the area fill is a `<path>`
 * in `<defs>` drawn through `<use>`, so picking the longest `d` finds that one.
 */
async function drawnPoints(page: Page): Promise<number> {
  return await page.evaluate(() => {
    for (const svg of document.querySelectorAll("svg")) {
      const line = [...svg.querySelectorAll("path[d]")].find((el) =>
        (el.getAttribute("class") ?? "").includes("series"),
      );
      const d = line?.getAttribute("d");
      if (d !== undefined && d !== null) return d.split("L").length;
    }
    return 0;
  });
}

/** Serve the answer and the socket, and hand back a way to push a minute. */
async function serve(
  page: Page,
): Promise<(next: Readonly<Record<string, WireObservation>>) => void> {
  await page.route(BARS_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: SERVED,
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
  await expect(drawnCount(page)).toContainText(`a line of ${served} closing`);
  const before = await drawnPoints(page);

  push({ NVDA: held(0) });

  // The whole story in two assertions: nothing was fetched, nothing was
  // reloaded, and the chart both SAYS and DRAWS one more bar than it did.
  await expect(drawnCount(page)).toContainText(`a line of ${grown} closing`);
  await expect.poll(() => drawnPoints(page)).toBe(before + 1);

  await expectNothingFailedToRender(page);
});

test("a correction replaces the minute it corrects rather than adding one", async ({
  page,
}) => {
  const push = await serve(page);

  await page.goto(EXPLORER);

  // **Wait for the answer before pushing**, which the first draft did not and
  // CI caught: `push` sends through a socket the route handler has not been
  // asked for yet, so a frame sent in the same tick as the navigation reaches
  // nobody. It passed locally every time and failed on a loaded runner — the
  // same shape as the flake Task 3.8.9 repaired, and the same repair.
  await expect(drawnCount(page)).toContainText(`a line of ${served} closing`);

  const before = await drawnPoints(page);

  push({ NVDA: held(0) });
  await expect(drawnCount(page)).toContainText(`a line of ${grown} closing`);

  // **The shape that used to be a 500.** A revision arrives ~30 s after its
  // bar and carries the minute it corrects; appending it would give the series
  // two bars for one instant, which `toBarSeries` refuses by throwing — and a
  // throw inside a React render takes the page down, because nothing above
  // `App` catches one.
  push({ NVDA: held(0, 221.75) });

  await expect(drawnCount(page)).toContainText("ending at 221.75");
  await expect(drawnCount(page)).toContainText(`a line of ${grown} closing`);
  await expect.poll(() => drawnPoints(page)).toBe(before + 1);

  await expectNothingFailedToRender(page);
});
