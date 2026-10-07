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
import { FURNISHED_BREADTH } from "../support/feed.js";

// **The order that changes: the movement, the hold, and reduced motion**
// (Task 4.3.6).
//
// ## Why every assertion here is a browser assertion
//
// Four of the five things this task decided exist at no lower level. jsdom
// applies no stylesheet, computes no layout and runs no animation, so a FLIP
// there measures eleven boxes all at `offsetTop: 0` and inverts nothing; there
// is no pointer; and `prefers-reduced-motion` is a media query, which is to say
// a fact about a browser. A component test can say the rows are in the right
// order — it cannot say whether one of them is sitting 81 px down on its
// neighbour's line under a transform nobody cleared.
//
// ## The frames are produced here, with the shipped encoder
//
// `overview-sector-region.spec.ts`'s rule, for its reason: CI's store is 518
// securities and **zero bars**, so every sector figure there is `unknown` for
// ever and a spec that waited for a real re-order would wait for ever. Serving
// its own answer is what lets this assert a **movement** on a runner that has
// no data at all — and a protocol change breaks it at the compiler rather than
// at an assertion.
//
// ## The reduced-motion pair, and why an absence assertion alone is worthless
//
// Done-when 4 requires the assertion **paired**, and the two halves run the
// same sampler over the same re-order:
//
//   - **without the preference**, at least one row must be seen transformed —
//     which is the half that fails if the treatment never ran at all, and it is
//     the half that makes the other one mean anything;
//   - **with the preference**, no row may ever be seen transformed, and the
//     order and the ordinals must still be correct — which is the half that
//     fails on the two traps `The order that changes.dc.html` §06 draws, both of
//     them this repository's own shipped defects.
//
// Both halves end by asserting that **no row is left transformed**, because the
// worst outcome of the whole task is the one that survives a review: every
// printed ordinal correct, and rank 3 drawn on rank 6's line.

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

/** The eleven, already ranked — `rankSectorFigures` runs server-side. */
const FIRST: readonly (readonly [string, number])[] = [
  ["XLK", 1.84],
  ["XLC", 0.96],
  ["XLY", 0.63],
  ["XLI", 0.41],
  ["XLF", 0.31],
  ["XLV", 0.12],
  ["XLB", 0],
  ["XLP", -0.18],
  ["XLU", -0.44],
  ["XLRE", -0.87],
  ["XLE", -1.27],
];

/**
 * The same eleven after a minute in which **energy ran** — one row travelling
 * ten places and every other row moving one, which is the largest movement a
 * single frame can honestly produce and the one that leaves no row still.
 *
 * It is deliberately not the whole list re-arranging: `The order that
 * changes.dc.html` §04 spends its length arguing the feed cannot produce that,
 * and a spec that asserted one would be asserting a state the product never
 * reaches.
 */
const SECOND: readonly (readonly [string, number])[] = [
  ["XLE", 2.4],
  ["XLK", 1.85],
  ["XLC", 0.97],
  ["XLY", 0.64],
  ["XLI", 0.42],
  ["XLF", 0.32],
  ["XLV", 0.13],
  ["XLB", 0.01],
  ["XLP", -0.17],
  ["XLU", -0.43],
  ["XLRE", -0.86],
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

const overviewOf = (
  ranked: readonly (readonly [string, number])[],
  sectorLadderStep: SectorLadderStep,
): WireMarketOverview => ({
  computedAt: AT,
  feeds: [VENUE],
  figures: [],
  sectors: ranked.map(([symbol, percent]) => observed(symbol, percent)),
  sectorLadderStep,
  // Required on the producer, so a frame without it models a state the server
  // cannot send — and `Market breadth` would draw reserved inside a spec about
  // the sector order. See `FURNISHED_BREADTH`.
  breadth: FURNISHED_BREADTH,
});

/**
 * Serve the market stream **and keep the socket**, so the test can send a
 * second aggregate whenever it likes.
 *
 * The returned function is the whole point: a re-order is two frames, and the
 * interval between them is the test's to choose.
 */
async function serveSectors(
  page: Page,
): Promise<(ranked: readonly (readonly [string, number])[]) => void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: VENUE }),
    }),
  );

  const overview = (ranked: readonly (readonly [string, number])[]): string =>
    encodeMarketStreamMessage({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: new Date().toISOString(),
      overview: overviewOf(ranked, 2),
    });

  let send: ((ranked: readonly (readonly [string, number])[]) => void) | null =
    null;
  let announce: (() => void) | null = null;
  const connected = new Promise<void>((resolve) => {
    announce = resolve;
  });

  // **Awaited before the navigation**, which is not a formality: an unawaited
  // `routeWebSocket` is a route that may not be installed when the page dials,
  // and the page then talks to the real gateway — which on a developer's machine
  // renders a perfectly plausible list of the local store's own figures and
  // leaves the test waiting for a socket it never intercepted.
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
    ws.send(overview(FIRST));
    send = (ranked) => {
      ws.send(overview(ranked));
    };
    announce?.();
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await connected;

  return (ranked) => {
    if (send === null) throw new Error("the market stream never connected");
    send(ranked);
  };
}

const sectorRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Sector performance" });

const rowsIn = (page: Page): Locator =>
  sectorRegion(page).getByRole("listitem");

/** The tickers, **in DOM order** — which is the order a screen reader is given. */
const tickersIn = async (page: Page): Promise<readonly string[]> =>
  rowsIn(page).evaluateAll((items) =>
    items.map((item) => /XL[A-Z]*/u.exec(item.textContent)?.[0] ?? "?"),
  );

/** Each row's printed ordinal, in DOM order. */
const ordinalsIn = async (page: Page): Promise<readonly string[]> =>
  rowsIn(page).evaluateAll((items) =>
    items.map((item) => item.firstElementChild?.textContent ?? "?"),
  );

/**
 * Start a sampler that records **the most rows seen transformed at once**,
 * every animation frame, for a second.
 *
 * A sampler rather than a single read, because a 480 ms gesture observed once
 * is a coin toss — and because the reduced-motion half has to assert that the
 * transform was never applied, which no single read can say. rAF is the right
 * clock for it: it is the clock the transform is painted on.
 *
 * The counter is a **number written in place**, not a buffer swapped out from
 * under the page. The overnight rehearsal that reported a silent socket on a
 * healthy connection did the latter, and the failure was invisible because one
 * drain and all drains look identical.
 */
async function sampleTransforms(page: Page, forMs: number): Promise<void> {
  await page.evaluate((duration) => {
    const scope = globalThis as unknown as { __transformed?: number };
    scope.__transformed = 0;
    const until = Date.now() + duration;

    const tick = () => {
      const rows = document.querySelectorAll("main ol li");
      let moving = 0;
      for (const row of rows) {
        if (getComputedStyle(row).transform !== "none") moving += 1;
      }
      scope.__transformed = Math.max(scope.__transformed ?? 0, moving);
      if (Date.now() < until) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, forMs);
}

const transformsSeen = async (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      (globalThis as unknown as { __transformed?: number }).__transformed ?? -1,
  );

/** Every row's current transform, now. */
const transformsNow = async (page: Page): Promise<readonly string[]> =>
  rowsIn(page).evaluateAll((items) =>
    items.map((item) => getComputedStyle(item).transform),
  );

// 1440 × 900, the viewport every figure in this story's record was measured at.
test.use({ viewport: { width: 1440, height: 900 } });

test("a frame that changes the ranking moves the rows, and DOM order stays visual order", async ({
  page,
}) => {
  const send = await serveSectors(page);
  await expect(rowsIn(page)).toHaveCount(FIRST.length);
  expect(await tickersIn(page)).toEqual(FIRST.map(([symbol]) => symbol));

  // **Scrolled first, so the scroll assertion is about something.** The region
  // itself never scrolls — `overview-sector-region.spec.ts` asserts
  // `scrollHeight === clientHeight` — so its own `scrollTop` is structurally 0
  // and proves nothing on its own; what a re-order could plausibly move is the
  // **page**, by growing the document under a transformed row.
  await page.evaluate(() => {
    window.scrollBy(0, 200);
  });
  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    height: document.body.scrollHeight,
  }));
  const box = await sectorRegion(page).evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    scrollTop: element.scrollTop,
  }));

  send(SECOND);

  await expect
    .poll(async () => (await tickersIn(page))[0])
    .toBe(SECOND[0]?.[0] ?? "");

  // The ordinals are the list's own, printed, and they are what survives
  // greyscale, a screenshot and a reader who looked away.
  expect(await ordinalsIn(page)).toEqual(
    SECOND.map((_, index) => String(index + 1)),
  );
  expect(await tickersIn(page)).toEqual(SECOND.map(([symbol]) => symbol));

  // **DOM order equals visual order**, which is the correctness requirement a
  // CSS `order` re-order would break invisibly to axe, to jsdom and to a
  // screenshot. Read after the gesture, so it is the resting geometry.
  await page.waitForTimeout(600);
  const tops = await rowsIn(page).evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().top),
  );
  expect(tops).toEqual([...tops].sort((left, right) => left - right));

  // **Nothing is left transformed**, at rest. The worst outcome of this whole
  // task is a row sitting on its neighbour's line with every ordinal correct.
  expect(await transformsNow(page)).toEqual(tops.map(() => "none"));

  // **The region is the same box and the reader is at the same scroll
  // position.** A re-order that moved either would be a re-order a reader
  // cannot read through.
  expect(
    await sectorRegion(page).evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      scrollTop: element.scrollTop,
    })),
  ).toEqual(box);
  expect(
    await page.evaluate(() => ({
      scrollY: window.scrollY,
      height: document.body.scrollHeight,
    })),
  ).toEqual(before);

  await expectNothingFailedToRender(page);
});

test("the rows travel: at least one is transformed while the list settles", async ({
  page,
}) => {
  // **Half one of the pair.** Without this, the half below passes against a
  // treatment that never ran — which is the same shape as confirming a check
  // passes wrongly before fixing it.
  const send = await serveSectors(page);
  await expect(rowsIn(page)).toHaveCount(FIRST.length);

  await sampleTransforms(page, 1000);
  send(SECOND);

  await expect
    .poll(async () => (await tickersIn(page))[0])
    .toBe(SECOND[0]?.[0] ?? "");
  await page.waitForTimeout(1000);

  // Every one of the eleven changed place in `SECOND`, so the treatment under
  // test inverts all eleven. The assertion is *more than one row travelled*
  // rather than *eleven did*: it is a claim about the treatment running, and
  // pinning the count would pin an arithmetic the data owns.
  expect(await transformsSeen(page)).toBeGreaterThan(1);

  // And it ends at rest, in the right order.
  expect(await tickersIn(page)).toEqual(SECOND.map(([symbol]) => symbol));
  expect(await transformsNow(page)).toEqual(SECOND.map(() => "none"));

  await expectNothingFailedToRender(page);
});

test("under prefers-reduced-motion the treatment does not run, the new order is correct, and no row is left transformed", async ({
  page,
}) => {
  // **Half two.** Both of this repository's own reduced-motion defects are
  // here: an animation of zero duration applies no keyframes at all, and a
  // transition of zero duration may not fire `transitionend` — so a treatment
  // that cleared its inverse on that event leaves the row where it used to be,
  // for ever, with every printed ordinal correct.
  //
  // `emulateMedia` rather than `test.use({ reducedMotion })`, which stopped
  // being a top-level test option: in Playwright 1.62 it lives under
  // `contextOptions`, and a per-test emulation is the narrower change anyway —
  // it is set on this page, before the page is opened, and reaches nothing
  // else.
  await page.emulateMedia({ reducedMotion: "reduce" });

  const send = await serveSectors(page);
  await expect(rowsIn(page)).toHaveCount(FIRST.length);

  await sampleTransforms(page, 1000);
  send(SECOND);

  await expect
    .poll(async () => (await tickersIn(page))[0])
    .toBe(SECOND[0]?.[0] ?? "");
  await page.waitForTimeout(1000);

  // **Never transformed, at any frame.** The token resolves to `0ms` in both
  // the delay and the duration, together, so the row simply is in its new
  // place — and a hard-coded delay would show up here as a row held under an
  // inverse transform for 240 ms with nothing happening.
  expect(await transformsSeen(page)).toBe(0);

  expect(await tickersIn(page)).toEqual(SECOND.map(([symbol]) => symbol));
  expect(await ordinalsIn(page)).toEqual(
    SECOND.map((_, index) => String(index + 1)),
  );
  expect(await transformsNow(page)).toEqual(SECOND.map(() => "none"));

  await expectNothingFailedToRender(page);
});

test("a pointer over the region holds the order, the figures keep updating, and it settles when the pointer leaves", async ({
  page,
}) => {
  const send = await serveSectors(page);
  await expect(rowsIn(page)).toHaveCount(FIRST.length);

  // **The head and the first row, before the badge exists.** The badge shares
  // one reserved slot with the ranked count, and the slot holds the wider of
  // the two — so a badge appearing must move neither the region's name beside
  // it nor the eleven rows under it, on pointer enter, which is the one thing
  // this treatment must not do.
  //
  // **Measured against the region's NAME rather than against the count**
  // (amended by Task 4.3.7): the count now speaks only in the mixed state, and
  // this fixture ranks all eleven, so the slot is deliberately empty here. The
  // name is the thing on the other end of the head's flex row and is what a
  // slot growing would push, so it is the better subject in any case.
  const title = () =>
    sectorRegion(page)
      .getByRole("heading", { name: "Sector performance" })
      .boundingBox();
  const firstRow = () => rowsIn(page).first().boundingBox();

  // Nothing is claimed about the count with every row ranked — `11 of 11` is a
  // fact nobody needs, permanently.
  await expect(
    sectorRegion(page).getByText("of 11 ranked", { exact: false }),
  ).toHaveCount(0);

  const quiet = { title: await title(), row: await firstRow() };

  // The reader arrives. The region says so, in the slot the count would be in.
  await rowsIn(page).nth(4).hover();
  const badge = sectorRegion(page).getByText("Order held");
  await expect(badge).toBeVisible();

  // Neither the name nor the row beneath has moved a pixel.
  expect(await title()).toEqual(quiet.title);
  expect(await firstRow()).toEqual(quiet.row);

  send(SECOND);

  // **The figures and the printed ranks keep updating; the order does not.**
  // The disagreement between the ordinals and the order of the rows IS the
  // pending re-order — readable with no motion, in greyscale, in a screenshot.
  await expect(rowsIn(page).first()).toContainText("+1.85%");
  expect(await tickersIn(page)).toEqual(FIRST.map(([symbol]) => symbol));
  expect(await ordinalsIn(page)).toEqual([
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "1",
  ]);

  // The reader leaves, and every pending move arrives in one settle — the
  // largest movement this component can make and the safest, because the
  // reader caused it.
  await page.mouse.move(10, 10);
  await expect(sectorRegion(page).getByText("Order held")).toBeHidden();

  await expect
    .poll(async () => (await tickersIn(page))[0])
    .toBe(SECOND[0]?.[0] ?? "");
  await page.waitForTimeout(600);

  expect(await tickersIn(page)).toEqual(SECOND.map(([symbol]) => symbol));
  expect(await ordinalsIn(page)).toEqual(
    SECOND.map((_, index) => String(index + 1)),
  );
  expect(await transformsNow(page)).toEqual(SECOND.map(() => "none"));

  await expectNothingFailedToRender(page);
});
