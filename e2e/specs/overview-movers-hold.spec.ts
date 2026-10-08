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

// **The hold and the motion at TWO lists** (Task 4.5.7) —
// `overview-sector-order.spec.ts`' subject at this region's shape.
//
// ## What is new here, and why none of it is reachable below a browser
//
// Story 4.3's treatment was decided, drawn and asserted against **one** list of
// eleven. Four of this file's claims exist only at two:
//
//   - **One hold across both lists.** The signal is the REGION's
//     (`Region.onReaderWithin` — non-bubbling `pointerenter`/`pointerleave` on
//     the region box plus bubbling `focusin`/`focusout`), so there are four
//     pointer/focus combinations rather than two, and the fourth — **focus in
//     one list while the pointer is in the other** — is the one that proves the
//     two sources are one state rather than two holds.
//   - **One badge, in the region head.** A badge per list is two speakers who
//     can disagree. And it must appear in room that already exists: four pixels
//     of head height moved all eleven rows in the sector region, found in a
//     browser and by nothing else.
//   - **A member replaced under a hold.** Eleven sectors are a fixed roster, so
//     a held sector list could only permute. A held movers list can have a
//     member **substituted** — 0.22–0.45 a minute, measured off three real
//     sessions — and the decision is that a row the pin has never seen is drawn
//     in its ranked position among the rows it outranks, not swept to the
//     bottom under its own printed `1`.
//   - **The reduced-motion pair, over two lists.** Both halves run the same
//     sampler over a re-order in **both** lists at once, and the `prefers-
//     reduced-motion` half is worthless without the half that proves the
//     treatment ran at all.
//
// ## The frames are produced here, with the shipped encoder
//
// `overview-sector-order.spec.ts`' rule, for its reason: **CI's store is 518
// securities and zero bars**, so a real gateway there sends a movers section
// with two EMPTY lists, for ever — and a spec that waited for a real re-order
// would wait for ever. Serving its own answer is what lets this assert a
// movement on a runner with no data at all, and a protocol change breaks it at
// the compiler rather than at an assertion.
//
// Every section served here satisfies `readMovers`' six cross-field checks, so
// a frame this file sends is a frame the shipped reader accepts — including
// check 3, **no symbol in both lists**, which is the hold's own precondition.

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

/** Five risers and five fallers, each end already in the comparator's order. */
const UP: Ranked = [
  ["SMCI", 9.14],
  ["FSLR", 6.72],
  ["NVDA", 3.41],
  ["AMD", 2.18],
  ["TSLA", 1.05],
];

const DOWN: Ranked = [
  ["MRNA", -8.37],
  ["ALB", -5.94],
  ["PFE", -3.12],
  ["INTC", -2.4],
  ["MU", -1.11],
];

/**
 * The same ten after a minute in which **the leaders changed in BOTH lists at
 * once** — which is the gesture Story 4.3 could not produce and the reason this
 * file exists.
 *
 * It is deliberately not a wholesale re-arrangement: the measured adjacent-rank
 * gap at this scale has a median of 0.31–0.92 percentage points (Task 4.5.7,
 * n=9,360 over three sessions), so a frame that re-ordered every row would be
 * asserting a state the feed does not produce.
 */
const UP_RERANKED: Ranked = [
  ["NVDA", 9.8],
  ["SMCI", 9.15],
  ["FSLR", 6.73],
  ["AMD", 2.19],
  ["TSLA", 1.06],
];

const DOWN_RERANKED: Ranked = [
  ["ALB", -9.2],
  ["MRNA", -8.38],
  ["PFE", -3.13],
  ["INTC", -2.41],
  ["MU", -1.12],
];

/**
 * The gainers with a **new member** at the top and the old rank 5 gone — the
 * membership change a held list reaches 0.22–0.45 times a minute.
 *
 * Under the rule Task 4.5.7 replaced, `BA` would be drawn **fifth**, with `1`
 * printed beside it.
 */
const UP_WITH_NEWCOMER: Ranked = [
  ["BA", 12.4],
  ["SMCI", 9.15],
  ["FSLR", 6.73],
  ["NVDA", 3.42],
  ["AMD", 2.19],
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

const overviewOf = (up: Ranked, down: Ranked): WireMarketOverview => ({
  computedAt: AT,
  feeds: [VENUE],
  figures: [],
  // Required on the producer, so a frame without it models a state the server
  // cannot send — and `Market breadth` would draw reserved inside a spec about
  // the movers' order. See `FURNISHED_BREADTH`.
  breadth: FURNISHED_BREADTH,
  movers: moversOf(up, down),
});

/**
 * Serve the market stream **and keep the socket**, so the test can send a
 * second aggregate whenever it likes.
 *
 * The returned function is the whole point: a re-order is two frames, and the
 * interval between them is the test's to choose.
 */
async function serveMovers(
  page: Page,
): Promise<(up: Ranked, down: Ranked) => void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: VENUE }),
    }),
  );

  const overview = (up: Ranked, down: Ranked): string =>
    encodeMarketStreamMessage({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: new Date().toISOString(),
      overview: overviewOf(up, down),
    });

  let send: ((up: Ranked, down: Ranked) => void) | null = null;
  let announce: (() => void) | null = null;
  const connected = new Promise<void>((resolve) => {
    announce = resolve;
  });

  // **Awaited before the navigation**: an unawaited `routeWebSocket` is a route
  // that may not be installed when the page dials, and the page then talks to
  // the real gateway — which on a developer's machine renders a perfectly
  // plausible list of the local store's own movers and leaves the test waiting
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
    ws.send(overview(UP, DOWN));
    send = (up, down) => {
      ws.send(overview(up, down));
    };
    announce?.();
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await connected;

  return (up, down) => {
    if (send === null) throw new Error("the market stream never connected");
    send(up, down);
  };
}

const moversRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Movers" });

const listIn = (page: Page, name: "Gainers" | "Losers"): Locator =>
  moversRegion(page).getByRole("list", { name });

const rowsIn = (page: Page, name: "Gainers" | "Losers"): Locator =>
  listIn(page, name).getByRole("listitem");

/**
 * The tickers of one list, **in DOM order** — which is the order a screen
 * reader is given and the order the FLIP indexes into.
 *
 * **The second child rather than a regular expression over the row's text**,
 * and the regex was tried first and is wrong: a row reads
 * `1SMCI Super Micro Computer, Inc.100.00▲up+9.14%`, so the ticker is preceded
 * by its own printed ordinal with no word boundary between them — `\b[A-Z]+\b`
 * matches **nothing at all** in that string, which is a silent empty array
 * rather than a loud failure. The ordinal is `firstElementChild`, as
 * `ordinalsIn` below already reads it, and the ticker is the one after it.
 *
 * The held pads `withHeldRows` adds carry a run of non-breaking spaces where a
 * ticker goes, so a list drawn short reads as a blank here rather than
 * silently shortening the array.
 */
const tickersIn = async (
  page: Page,
  name: "Gainers" | "Losers",
): Promise<readonly string[]> =>
  rowsIn(page, name).evaluateAll((items) =>
    items.map((item) => item.children[1]?.textContent.trim() ?? "?"),
  );

/** Each row's printed ordinal, in DOM order. */
const ordinalsIn = async (
  page: Page,
  name: "Gainers" | "Losers",
): Promise<readonly string[]> =>
  rowsIn(page, name).evaluateAll((items) =>
    items.map((item) => item.firstElementChild?.textContent ?? "?"),
  );

const badge = (page: Page): Locator =>
  moversRegion(page).getByText("Order held");

/**
 * Start a sampler that records **the most rows seen transformed at once across
 * BOTH lists**, every animation frame, for a second.
 *
 * `overview-sector-order.spec.ts`' sampler with one word changed — it already
 * queried `main ol li`, which is every row on the page, and at two lists that
 * is the correct scope rather than an accident: the claim is *the treatment
 * ran* and *the treatment never ran*, and neither is per list.
 *
 * The counter is a **number written in place**, not a buffer swapped out from
 * under the page: the overnight rehearsal that reported a silent socket on a
 * healthy connection did the latter, and one drain and all drains look
 * identical.
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

/** Every row's current transform in one list, now. */
const transformsNow = async (
  page: Page,
  name: "Gainers" | "Losers",
): Promise<readonly string[]> =>
  rowsIn(page, name).evaluateAll((items) =>
    items.map((item) => getComputedStyle(item).transform),
  );

// 1440 × 900, the viewport every figure in this story's record was measured at.
test.use({ viewport: { width: 1440, height: 900 } });

test("a pointer in EITHER list holds BOTH, and one badge in the head says so", async ({
  page,
}) => {
  const send = await serveMovers(page);
  await expect(rowsIn(page, "Gainers")).toHaveCount(UP.length);
  await expect(rowsIn(page, "Losers")).toHaveCount(DOWN.length);

  // **The head and the first row of each list, before the badge exists.** The
  // badge shares one reserved slot with `Top 5 each way` and the slot holds the
  // wider of the two, so a badge appearing must move neither the region's name
  // beside it nor the ten rows under it.
  const title = () =>
    moversRegion(page).getByRole("heading", { name: "Movers" }).boundingBox();
  const firstGainer = () => rowsIn(page, "Gainers").first().boundingBox();
  const firstLoser = () => rowsIn(page, "Losers").first().boundingBox();

  // **Scrolled into view before the baseline is taken.** `hover()` scrolls the
  // target into view, so a baseline read with the region below the fold is
  // compared against a box that moved 725 px because the page scrolled — which
  // is what this measurement looked like the first time it was taken, and it
  // reads exactly like a head that grew.
  await moversRegion(page).scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);

  const quiet = {
    title: await title(),
    gainer: await firstGainer(),
    loser: await firstLoser(),
  };

  /*
   * **The slot's own box, measured with the OTHER string in it.** This is the
   * assertion the task's brief turned out to need: the head slot reserves the
   * wider of its two strings, and the way that fails is the slot **growing**
   * when the badge replaces the bound — which the title's box does not
   * necessarily show, because at 1440 the header has slack and the title is
   * `flex: 0 1 auto`.
   *
   * Measured 2026-10-08 at 1440 by a throwaway `console.log` in this test,
   * since removed: `Top 5 each way` is **98.05 × 16** and the `Order held`
   * badge is **100.33 × 22**. So the badge is the wider string by 2.28 px and
   * `min-width: 100px` — 4.5.3's figure, carried over from the sector slot —
   * was **0.33 px short of it**, and the slot grew by exactly that. Both
   * regions' reserves were raised to the measured `101px`.
   */
  const slotBox = () =>
    moversRegion(page).getByText("Top 5 each way").locator("..").boundingBox();
  const reserved = await slotBox();

  // **State 2 of 4: the pointer is in the GAINERS list.** One badge, in the
  // region head — not one per list.
  await rowsIn(page, "Gainers").nth(2).hover();
  await expect(badge(page)).toBeVisible();
  await expect(badge(page)).toHaveCount(1);

  // **The slot did not grow**, which is what makes "the badge fits room that
  // already exists" a measurement rather than a hope.
  expect(await badge(page).locator("..").boundingBox()).toEqual(reserved);

  // Nothing in the head or either list has moved a pixel.
  expect(await title()).toEqual(quiet.title);
  expect(await firstGainer()).toEqual(quiet.gainer);
  expect(await firstLoser()).toEqual(quiet.loser);

  // **BOTH lists are held, which is the whole decision.** A list-scoped hold
  // would let the losers list re-order out from under a pointer that is
  // approaching it diagonally across the region.
  send(UP_RERANKED, DOWN_RERANKED);

  // The figures and the printed ranks keep updating; the order does not. The
  // disagreement between the ordinals and the vertical order IS the pending
  // re-order — readable with no motion, in greyscale, in a screenshot.
  await expect(rowsIn(page, "Gainers").nth(2)).toContainText("+9.80%");
  expect(await tickersIn(page, "Gainers")).toEqual(UP.map(([s]) => s));
  expect(await ordinalsIn(page, "Gainers")).toEqual(["2", "3", "1", "4", "5"]);

  // **A U+2212 MINUS SIGN, not a hyphen**, which is `PriceChange`'s own
  // formatting and was found by this assertion failing against
  // `1ALBAlbemarle Corporation100.00▼down −9.20%`. Written as the glyph
  // rather than as an escape so the next reader sees what is on screen.
  await expect(rowsIn(page, "Losers").nth(1)).toContainText("−9.20%");
  expect(await tickersIn(page, "Losers")).toEqual(DOWN.map(([s]) => s));
  expect(await ordinalsIn(page, "Losers")).toEqual(["2", "1", "3", "4", "5"]);

  // **State 3 of 4: the pointer moves to the LOSERS list.** Still one hold —
  // the first source to fire owns the pin, so crossing between the two lists
  // does not re-pin an order that has since moved.
  await rowsIn(page, "Losers").nth(1).hover();
  await expect(badge(page)).toBeVisible();
  expect(await tickersIn(page, "Gainers")).toEqual(UP.map(([s]) => s));
  expect(await tickersIn(page, "Losers")).toEqual(DOWN.map(([s]) => s));

  // **State 1 of 4: the pointer is in neither.** Every pending move in both
  // lists arrives in one settle — the largest movement this region can make and
  // the safest, because the reader caused it.
  await page.mouse.move(10, 10);
  await expect(badge(page)).toBeHidden();

  await expect
    .poll(async () => (await tickersIn(page, "Gainers"))[0])
    .toBe(UP_RERANKED[0]?.[0] ?? "");
  await page.waitForTimeout(600);

  expect(await tickersIn(page, "Gainers")).toEqual(UP_RERANKED.map(([s]) => s));
  expect(await tickersIn(page, "Losers")).toEqual(
    DOWN_RERANKED.map(([s]) => s),
  );
  expect(await ordinalsIn(page, "Gainers")).toEqual(["1", "2", "3", "4", "5"]);
  expect(await ordinalsIn(page, "Losers")).toEqual(["1", "2", "3", "4", "5"]);

  // Nothing is left transformed in either list. The worst outcome of this whole
  // treatment is a row sitting on its neighbour's line with every ordinal right.
  expect(await transformsNow(page, "Gainers")).toEqual(UP.map(() => "none"));
  expect(await transformsNow(page, "Losers")).toEqual(DOWN.map(() => "none"));

  await expectNothingFailedToRender(page);
});

test("state 4 of 4: focus in the region holds it while the pointer is elsewhere, and either source alone is enough", async ({
  page,
}) => {
  const send = await serveMovers(page);
  await expect(rowsIn(page, "Gainers")).toHaveCount(UP.length);

  // **`focusin`/`focusout` bubble and `pointerenter`/`pointerleave` do not**,
  // which is the pair of semantics `:focus-within` and `:hover` have — so the
  // region answers the question with no filtering, and the two sources are one
  // state with two ways in.
  //
  // `Region` passes `scrollable`, which makes the section the region's one tab
  // stop and the only element at which a keyboard reader can be said to be
  // *here*.
  await moversRegion(page).focus();
  await expect(badge(page)).toBeVisible();

  // The pointer is somewhere else entirely — the top-left corner of the page —
  // and the hold stands on focus alone.
  await page.mouse.move(5, 5);
  await expect(badge(page)).toBeVisible();

  send(UP_RERANKED, DOWN_RERANKED);
  await expect(rowsIn(page, "Gainers").nth(2)).toContainText("+9.80%");
  expect(await tickersIn(page, "Gainers")).toEqual(UP.map(([s]) => s));
  expect(await tickersIn(page, "Losers")).toEqual(DOWN.map(([s]) => s));

  // **And now BOTH sources at once, in different lists**: the pointer enters
  // the losers list while focus is still on the region. One hold, one badge,
  // and the pin is still the order the reader arrived to rather than a re-pin.
  await rowsIn(page, "Losers").nth(3).hover();
  await expect(badge(page)).toHaveCount(1);
  expect(await tickersIn(page, "Gainers")).toEqual(UP.map(([s]) => s));
  expect(await tickersIn(page, "Losers")).toEqual(DOWN.map(([s]) => s));

  // Releasing the pointer alone does not release the hold, because focus is
  // still in the region — the half of the four-state grid that a single
  // boolean per source would get wrong.
  await page.mouse.move(5, 5);
  await expect(badge(page)).toBeVisible();
  expect(await tickersIn(page, "Gainers")).toEqual(UP.map(([s]) => s));

  // Both gone, and everything settles.
  await page.locator("body").evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await expect(badge(page)).toBeHidden();

  await expect
    .poll(async () => (await tickersIn(page, "Gainers"))[0])
    .toBe(UP_RERANKED[0]?.[0] ?? "");

  await expectNothingFailedToRender(page);
});

test("a member replaced under a hold is drawn in its ranked position, not swept to the bottom", async ({
  page,
}) => {
  // The state 4.3 could not reach: eleven sectors are a fixed roster. Measured
  // at 0.22–0.45 membership changes a minute over three real sessions, so it is
  // a rare state rather than an impossible one — and a reader holding the order
  // to read it is exactly who meets it.
  const send = await serveMovers(page);
  await expect(rowsIn(page, "Gainers")).toHaveCount(UP.length);

  await rowsIn(page, "Gainers").nth(1).hover();
  await expect(badge(page)).toBeVisible();

  send(UP_WITH_NEWCOMER, DOWN);

  // `BA` is a name the pin has never seen, ranked 1. It is drawn **first** —
  // above every row it outranks — and the four rows the pin placed keep their
  // order relative to each other, with `TSLA` gone because the producer stopped
  // selecting it.
  await expect(rowsIn(page, "Gainers").first()).toContainText("+12.40%");
  expect(await tickersIn(page, "Gainers")).toEqual(
    UP_WITH_NEWCOMER.map(([s]) => s),
  );

  // The badge is still on and still says the same thing, because what it claims
  // is that the **order** is held and never that the membership is.
  await expect(badge(page)).toBeVisible();

  // The other list had no newcomer and has not moved.
  expect(await tickersIn(page, "Losers")).toEqual(DOWN.map(([s]) => s));

  await expectNothingFailedToRender(page);
});

test("the rows in BOTH lists travel: more than one is transformed while the region settles", async ({
  page,
}) => {
  // **Half one of the reduced-motion pair, at two lists.** Without this, the
  // half below passes against a treatment that never ran — the same shape as
  // confirming a check passes wrongly before fixing it.
  const send = await serveMovers(page);
  await expect(rowsIn(page, "Gainers")).toHaveCount(UP.length);
  await expect(rowsIn(page, "Losers")).toHaveCount(DOWN.length);

  await sampleTransforms(page, 1000);
  send(UP_RERANKED, DOWN_RERANKED);

  await expect
    .poll(async () => (await tickersIn(page, "Gainers"))[0])
    .toBe(UP_RERANKED[0]?.[0] ?? "");
  await page.waitForTimeout(1000);

  // Three rows move in the gainers list and two in the losers, so the
  // treatment under test inverts rows in **both**. The assertion is *more than
  // one row travelled* rather than a count: it is a claim about the treatment
  // running, and pinning the number would pin an arithmetic the data owns.
  expect(await transformsSeen(page)).toBeGreaterThan(1);

  // And both lists end at rest, in the right order.
  expect(await tickersIn(page, "Gainers")).toEqual(UP_RERANKED.map(([s]) => s));
  expect(await tickersIn(page, "Losers")).toEqual(
    DOWN_RERANKED.map(([s]) => s),
  );
  expect(await transformsNow(page, "Gainers")).toEqual(UP.map(() => "none"));
  expect(await transformsNow(page, "Losers")).toEqual(DOWN.map(() => "none"));

  await expectNothingFailedToRender(page);
});

test("under prefers-reduced-motion neither list's treatment runs, both orders are correct, and no row is left transformed", async ({
  page,
}) => {
  // **Half two, and it runs against TWO lists** — done-when 6. Both of this
  // repository's own reduced-motion defects are in scope: an animation of zero
  // duration applies no keyframes at all, and a transition of zero duration
  // may not fire `transitionend`, so a treatment that cleared its inverse on
  // that event leaves the row where it used to be, for ever, with every printed
  // ordinal correct.
  //
  // `emulateMedia` rather than `test.use({ reducedMotion })`, which stopped
  // being a top-level test option: in Playwright 1.62 it lives under
  // `contextOptions`, and a per-test emulation is the narrower change anyway.
  await page.emulateMedia({ reducedMotion: "reduce" });

  const send = await serveMovers(page);
  await expect(rowsIn(page, "Gainers")).toHaveCount(UP.length);
  await expect(rowsIn(page, "Losers")).toHaveCount(DOWN.length);

  await sampleTransforms(page, 1000);
  send(UP_RERANKED, DOWN_RERANKED);

  await expect
    .poll(async () => (await tickersIn(page, "Gainers"))[0])
    .toBe(UP_RERANKED[0]?.[0] ?? "");
  await page.waitForTimeout(1000);

  // **Never transformed, at any frame, in either list.** The token resolves to
  // `0ms` in both the delay and the duration together, so a row simply is in
  // its new place — and a hard-coded delay would show up here as a row held
  // under an inverse transform for 240 ms with nothing happening.
  expect(await transformsSeen(page)).toBe(0);

  expect(await tickersIn(page, "Gainers")).toEqual(UP_RERANKED.map(([s]) => s));
  expect(await tickersIn(page, "Losers")).toEqual(
    DOWN_RERANKED.map(([s]) => s),
  );
  expect(await ordinalsIn(page, "Gainers")).toEqual(["1", "2", "3", "4", "5"]);
  expect(await ordinalsIn(page, "Losers")).toEqual(["1", "2", "3", "4", "5"]);
  expect(await transformsNow(page, "Gainers")).toEqual(UP.map(() => "none"));
  expect(await transformsNow(page, "Losers")).toEqual(DOWN.map(() => "none"));

  await expectNothingFailedToRender(page);
});
