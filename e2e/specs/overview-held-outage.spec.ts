import type {
  MarketFeed,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { FURNISHED_BREADTH, serveFeed } from "../support/feed.js";

// **An outage on the landing page, HELD rather than raced** (Task 4.7.1).
//
// ## Why this spec exists, and what it is the first of
//
// **No spec that visits `/` had ever degraded a feed.** Story 4.7's shaping
// measured that: `.capture/proxy-states/readings.json` is 81 rows across 16
// state ids and every one of them is a **data or basis** state — no drop, no
// stale, no reconnect. Every degraded state this epic has photographed on this
// screen is a state of the *aggregate*, never of the *connection*.
//
// And it could not have been otherwise, because `support/feed.ts`'s
// `routeWebSocket` callback answered the browser's own retry with a fresh
// `live` snapshot — so a produced `disconnected` healed itself about two
// seconds after `drop()`. That is **Task 3.10.9's fourth instrument error**:
// *"the harness answered the browser's own retry with a fresh snapshot. A real
// outage does not answer the retry"*. Its repair lived in
// `scripts/state-grid.mjs`, which was deleted, and was never carried into the
// shared harness.
//
// ## Why these three tests are one file and not three
//
// They are a **paired** set in `security-price-motion.spec.ts`' sense, and the
// pairing is what makes each one mean something:
//
//   - the first holds an outage and would go red against the old harness;
//   - the second asserts the old behaviour **still works by default**, because
//     two shipped specs are about the retry *being* answered and a harness
//     that refused by default would have broken them silently;
//   - the third drives the verb no spec could express before — a **poorer
//     aggregate on the reconnect** — which is the capability Task 4.7.3 is
//     built on.
//
// Alone, the first would pass just as well against a harness that had stopped
// serving the socket at all, which is this suite's own recorded hazard.
//
// ## What it serves, and therefore cannot say
//
// Every byte is served from here with the shipped encoder, through the
// gateway's own connect sequence — `overview-sector-region.spec.ts`' rule, that
// **a spec that asserts a figure serves its own answer**, because CI's store is
// 518 securities and **zero bars** and the real gateway there sends 518
// `unknown` figures for ever. What this says nothing about is whether a real
// socket ever dies in the way this one is made to.
//
// ## The plant, per channel
//
// Task 4.8.10's rule: **a produced state whose producer went quiet looks
// identical to a state drawn correctly.** A page that reads `DISCONNECTED`
// because the retry was refused and a page that reads it because the harness
// never answered the socket at all are the same screen. So each arm asserts
// its own subject arrived, on its own channel:
//
//   - the **socket**, by `connections()` — counted by **URL**, which is
//     `market-stream-socket-count.spec.ts`' lesson after a number with no URL
//     beside it cost a suppression, two documents and a task;
//   - the **refusal**, by `refusals()`, so *the retry was refused* is told
//     apart from *the page never retried*;
//   - the **aggregate**, by `overviews()` and by a figure on the screen, so a
//     frame that was built and never sent is told apart from one the page drew.

const OVERVIEW = "/";

/** The one venue value — `overview-proxy-live-update.spec.ts`'s rule. */
const VENUE: MarketFeed = "iex";

/** 14:01 ET on a Wednesday, so no extended-hours word anywhere on the page. */
const AT = "2026-09-16T18:01:00Z";

const observed = (
  symbol: string,
  price: number,
  changePercent: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: AT,
  price,
  changePercent,
  changeBasis: "2026-09-15",
});

const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

/**
 * The aggregate, in the shape the gateway builds it.
 *
 * `breadth` is {@link FURNISHED_BREADTH} rather than omitted: an aggregate
 * with no breadth section is the **rollback** shape — `WireMarketOverviewInputs
 * .breadth` is non-optional, so no shipped producer can build one — and this
 * spec is about a connection rather than about a pinned image. Omitting it
 * would draw `Market breadth` reserved in three tests that say nothing about
 * it, which is the defect `FURNISHED_BREADTH`'s own docblock was written for.
 */
const overviewOf = (
  figures: readonly WireOverviewFigure[],
): WireMarketOverview => {
  const heard = figures.some((figure) => figure.state === "observed");

  // **`exactOptionalPropertyTypes` is on**, so *absent* and *present as
  // `undefined`* are different types and `observedAt` is **absent** when the
  // aggregate holds no observation — which is Task 4.8.12's own rule and CI's
  // permanent state. Branching is the setting behaving correctly.
  return heard
    ? {
        computedAt: AT,
        observedAt: AT,
        feeds: [VENUE],
        figures,
        breadth: FURNISHED_BREADTH,
      }
    : { computedAt: AT, feeds: [], figures, breadth: FURNISHED_BREADTH };
};

/** A session's worth of figures — what a healthy gateway sends. */
const HEARD_FROM = overviewOf([
  observed("SPY", 774.03, 0.42),
  observed("QQQ", 601.88, 0.61),
  observed("DIA", 525.79, -0.18),
  observed("IWM", 288.89, 0.07),
]);

/**
 * **What a restarted replica really serves**, and the reason the third test
 * exists.
 *
 * `sendSnapshot()` recomputes the join on every connect, and a replica serves
 * browsers for **45.8–46.5 s** before its own feed authenticates (Task 3.11.6)
 * — so a reconnecting tab is answered with an aggregate built over an empty
 * live map. Four `unknown` figures is that aggregate.
 */
const HEARD_NOTHING = overviewOf([
  unknown("SPY"),
  unknown("QQQ"),
  unknown("DIA"),
  unknown("IWM"),
]);

/**
 * The status bar, which is the one home for a connection word.
 *
 * `security-feed-degraded.spec.ts`' idiom — the whole footer, matched
 * case-insensitively — rather than `market-reconnect.spec.ts`' scoping to the
 * cell by its own label. The scoped version resolves the cell on this route and
 * then finds no exact `live` inside it, because the word is drawn in a nested
 * span the parent lookup does not reach; the footer is the claim anyway, since
 * this screen must not grow a second connection word (`pnpm invariants` refuses
 * one by name).
 */
const chrome = (page: Page): Locator => page.locator("footer").first();

const proxies = (page: Page): Locator =>
  page.getByRole("region", { name: "Market proxies" });

test.use({ viewport: { width: 1440, height: 900 } });

test("a produced disconnection is held, and the refused retry is counted", async ({
  page,
}) => {
  // **The test that would have gone red against the old harness**, and the
  // whole of this task's capability. Against `reconnect: "served"` — which was
  // the only behaviour until 2026-10-10 — the page is back on `LIVE` about two
  // seconds after the drop, so `refusals()` stays at 0 for ever and the final
  // assertion reads the healed state.
  const feed = await serveFeed(page, {
    feed: VENUE,
    overview: HEARD_FROM,
    reconnect: "refused",
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  // **Channel 1 — the socket.** Counted by URL, so nothing else on the page
  // can be mistaken for it.
  expect(feed.connections()).toBeGreaterThan(0);

  // **Channel 2 — the aggregate.** One frame sent, one figure on the screen:
  // a produced state whose producer went quiet looks identical to one drawn
  // correctly, and this is the difference.
  expect(feed.overviews()).toBeGreaterThan(0);
  await expect(proxies(page)).toContainText("774.03");

  await expect(chrome(page)).toContainText(/live/iu);

  const before = feed.connections();
  feed.drop();

  await expect(chrome(page)).toContainText(/disconnected/iu);
  const degraded = await chrome(page).innerText();

  // **Channel 3 — the refusal.** The page dialled again of its own accord and
  // this harness closed it, which is what *the retry was refused* means.
  // Without this the test cannot tell a held outage from a page that simply
  // stopped retrying, and the two leave an identical screen.
  //
  // **No duration is asserted.** The backoff is `reconnect-policy.ts`'s and
  // the only claim here is that a retry happened and was refused.
  await expect
    .poll(() => feed.refusals(), { timeout: 15_000 })
    .toBeGreaterThan(0);
  expect(feed.connections()).toBeGreaterThan(before);

  // **And the chrome is BYTE-IDENTICAL to what it was before the retry**,
  // which is the thing that was unassertable: the degraded state survived the
  // page's own attempt to leave it, rather than being read inside the two
  // seconds before the old harness healed it.
  //
  // **Not `not.toContainText(/\blive\b/)`**, which the first draft wrote and
  // which cannot hold here: the shipped sentence *is* `The live feed is not
  // connected.`, so the word `live` is present in exactly the state the
  // assertion was meant to forbid. Comparing the whole cell either side of the
  // retry says what was meant and cannot be satisfied by a word.
  expect(await chrome(page).innerText()).toBe(degraded);
  expect(degraded).toMatch(/disconnected/iu);

  // **Story 3.10's posture, on this screen for the first time**: the figures
  // that were true stay on screen and no region becomes an error message.
  // Story 4.7's own criterion 3 is the full version of this; what is asserted
  // here is that the held state is the state the rest of the story photographs.
  await expect(proxies(page)).toContainText("774.03");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expectNothingFailedToRender(page);
});

test("the default still answers the retry, which is what two shipped specs are about", async ({
  page,
}) => {
  // **`reconnect` defaults to today's behaviour, asserted rather than
  // assumed.** `market-reconnect.spec.ts` exists to watch a tab survive a
  // deploy, and `security-gap-fill.spec.ts` asserts a quiet refill driven by
  // `serveFeed`'s connect sequence through `LiveFeedView.resumes` — a counter
  // of **returns**, so a harness that refused by default would have taken the
  // refill's trigger away and left that spec asserting an absence for free.
  //
  // Those two specs run on their own paths (one has its own droppable
  // harness, the other calls `serveFeed`), so this is the assertion that the
  // **option's default** is unchanged rather than that those files pass.
  const feed = await serveFeed(page, { feed: VENUE, overview: HEARD_FROM });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expect(chrome(page)).toContainText(/live/iu);

  const before = feed.connections();
  feed.drop();

  await expect(chrome(page)).toContainText(/disconnected/iu);

  // **Nothing reloads the page.** The only thing that can open the second
  // socket is the retry, and the only thing that can make the word `LIVE`
  // again is this harness answering it.
  await expect(chrome(page)).not.toContainText(/disconnected/iu, {
    timeout: 15_000,
  });
  await expect(chrome(page)).toContainText(/live/iu);
  expect(feed.connections()).toBeGreaterThan(before);
  expect(feed.refusals()).toBe(0);

  await expectNothingFailedToRender(page);
});

test("the reconnect can be answered with a poorer aggregate", async ({
  page,
}) => {
  // **The verb no spec could express before this task**, and Task 4.7.3's
  // subject produced rather than argued: the figures do not survive a fresh
  // join. The gateway recomputes the aggregate on every connect, so a tab that
  // reconnects to a replica whose own feed has not authenticated is answered
  // with an aggregate over an empty live map — four `unknown` figures where
  // four prices were.
  //
  // **This spec does not judge that state**, which is 4.7.3's to decide. It
  // asserts the harness can produce it, which is the whole of this task.
  const feed = await serveFeed(page, {
    feed: VENUE,
    overview: HEARD_FROM,
    overviewOnReconnect: HEARD_NOTHING,
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expect(proxies(page)).toContainText("774.03");

  // **Counted rather than pinned to one.** A cold page under `StrictMode`
  // opens the socket more than once before anything is dropped — see `dropped`
  // in `support/feed.ts` — so the claim is that frames were sent and that MORE
  // were sent after the drop, never that there was exactly one.
  const before = feed.overviews();
  expect(before).toBeGreaterThan(0);

  feed.drop();
  await expect(chrome(page)).toContainText(/disconnected/iu);

  // Back on the retry, with the poorer frame beside its snapshot.
  await expect(chrome(page)).not.toContainText(/disconnected/iu, {
    timeout: 15_000,
  });

  // **The transition, which is the assertion.** A figure that was a price is
  // now absent — and `not.toContainText` alone would pass against a region
  // that had vanished, so the count of frames sent is read beside it.
  await expect(proxies(page)).not.toContainText("774.03");
  await expect
    .poll(() => feed.overviews(), { timeout: 15_000 })
    .toBeGreaterThan(before);
  await expect(proxies(page)).toBeVisible();

  await expectNothingFailedToRender(page);
});
