import { MARKET_FEED_DESCRIPTIONS, MARKET_FEEDS } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// The market feed's provenance, on screen and read from the backend (Task
// 2.6.7) — invariant 6 and PRODUCT_SPEC.md §7.1.
//
// **What only this level can see** is that the region is wired to the backend
// at all. A component test proves that a given view renders given words, and
// `FeedProvenance.test.tsx` does for all six renderings including two a browser
// cannot be put into. What it cannot prove is that anything ever asked: a
// component handed a hard-coded prop renders perfectly, for ever, and from the
// outside that is indistinguishable from a working one — which is precisely the
// state this task found the chrome in, six stories deep.
//
// **What it must not assert** is *which* feed the running pair reports.
// `MARKET_DATA_PROVIDER` is a developer's own setting and its default is
// `none`, so pinning a literal makes this red on any machine running fixtures.
// `market-clock.spec.ts` made the same call about the session state for the
// same reason: assert the vocabulary, not the member.
//
// The words are **imported** from `packages/shared` rather than written out,
// which is what this suite being a workspace package is for — and here it is
// more than a convenience. `MARKET_FEED_DESCRIPTIONS` is the single definition
// of the sentence §7.1 requires; a literal in this file would be a second copy,
// and it is the copy that would keep passing after somebody weakened the words.

/** The region the strip's `Market feed` micro-label names. */
function feedRegion(page: Page) {
  return page
    .getByRole("banner")
    .getByText("Market feed", { exact: true })
    .locator("..");
}

/**
 * Every word this region can render.
 *
 * The three feed labels come from the shared record; the other three are the
 * client's own — `checking` is a fact about this browser's startup and the
 * other two are facts about our configuration, which is why none of them is a
 * vocabulary member anywhere. That is the same shape `support/app.ts` records
 * for `checking` and `market-clock.spec.ts` for `unknown`.
 */
const FEED_WORDS = [
  ...MARKET_FEEDS.map((feed) => MARKET_FEED_DESCRIPTIONS[feed].label),
  "checking",
  "not configured",
  "unknown",
];

/**
 * The words this region rendered for six stories and must never render again.
 *
 * `FeedStatus` is about a **live connection**, which is Epic 3's and does not
 * exist. This is the assertion that goes red if somebody puts an invented
 * status back into the chrome — the defect this task exists to remove, which no
 * other level can see, because a component handed the prop renders it happily.
 */
const CONNECTION_WORDS = ["disconnected", "live", "stale"];

test("the chrome reads its market feed from the backend rather than a literal", async ({
  page,
}) => {
  await page.goto("/");

  const region = feedRegion(page);

  // One of the words, without saying which — see the note above. The word is
  // matched as an element whose *whole* text is the word, because the region's
  // own text is `Market feednot configured` with no separator: a
  // `toContainText(/\bnot configured\b/)` finds no word boundary and fails,
  // which is `support/app.ts`'s trap 2 arriving on a third strip cell.
  await expect(
    region.getByText(new RegExp(`^(${FEED_WORDS.join("|")})$`)),
  ).toBeVisible();

  // It settles. `checking` is the placeholder every page load renders until the
  // request comes back, and a region *stuck* on it is what a hook that never
  // ran looks like — the same failure `market-clock.spec.ts` exists to catch on
  // the cell beside it.
  await expect(region.getByText("checking")).toHaveCount(0);

  // And the invented value is gone.
  for (const word of CONNECTION_WORDS) {
    await expect(region.getByText(word, { exact: true })).toHaveCount(0);
  }

  await expectNothingFailedToRender(page);
});

// The state Story 2.7 produces with one configuration value, and the assertion
// that this renders **data** rather than a caption: the page is given a
// `/market-data` body naming a feed the running backend is not configured with,
// and the chrome says so.
//
// Installed before `goto()` so the first request is the fulfilled one and the
// state is on screen without waiting. `route.fulfill()` bypasses the browser's
// CORS check — measured in Task 1.13.3 — which is why this is safe to do from a
// spec and why it can never be used to produce a cross-origin failure.
test("it renders the feed the backend names, with the sentence §7.1 requires", async ({
  page,
}) => {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: "iex" }),
    }),
  );

  await page.goto("/");

  const region = feedRegion(page);
  const { label, sentence } = MARKET_FEED_DESCRIPTIONS.iex;

  await expect(region.getByText(label, { exact: true })).toBeVisible();

  // **The sentence is the requirement and the label is the affordance.** §7.1
  // does not ask for an acronym; it says MarketPulse must not imply that IEX
  // represents every US exchange — and three letters tell a non-specialist
  // nothing. This is the assertion that fails if the chrome is ever reduced to
  // `Market feed: IEX`.
  await expect(region.getByText(sentence)).toBeVisible();

  await expectNothingFailedToRender(page);
});

// `PROVIDER.md` §5.4's safety mechanism, end to end. A fixture-backed
// deployment serves **invented prices**, and the whole design is that such a
// deployment advertises itself in the chrome structurally rather than by
// somebody remembering to add a `SAMPLE DATA` banner. If this goes red, a
// screenshot of generated data has stopped saying that it is generated.
test("a simulated feed says it is not a market feed", async ({ page }) => {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: "synthetic" }),
    }),
  );

  await page.goto("/");

  const region = feedRegion(page);
  const { label, sentence } = MARKET_FEED_DESCRIPTIONS.synthetic;

  await expect(region.getByText(label, { exact: true })).toBeVisible();
  await expect(region.getByText(sentence)).toBeVisible();

  await expectNothingFailedToRender(page);
});

// The default, and what a correct first run shows. `feed: null` is the
// contract's spelling of "no provider is configured" — exact, because every
// provider declares a feed — and it is deliberately not an entry in
// `MARKET_FEED_DESCRIPTIONS`, because it is a sentence about our own
// deployment rather than about a market venue.
test("no configured provider is a product state rather than a failure", async ({
  page,
}) => {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: null }),
    }),
  );

  await page.goto("/");

  const region = feedRegion(page);

  await expect(
    region.getByText("not configured", { exact: true }),
  ).toBeVisible();
  await expect(
    region.getByText(/No market-data provider is configured/),
  ).toBeVisible();

  // Not an error, and nothing collapsed. §36 makes this a product state.
  await expectNothingFailedToRender(page);
});

// The failure this region is allowed to have, and it degrades locally: the
// request does not come back, the region says it does not know, and the rest of
// the chrome — including the backend indicator that will explain why — carries
// on. §36's whole subject.
test("a market feed that cannot be read degrades locally", async ({ page }) => {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.abort("connectionrefused"),
  );

  await page.goto("/");

  const region = feedRegion(page);

  await expect(region.getByText("unknown", { exact: true })).toBeVisible();
  await expect(region.getByText(/could not be read/)).toBeVisible();

  // The clock and the navigation are untouched, which is what "locally" means.
  await expect(
    page.getByRole("banner").getByText(/^\d{2}:\d{2}:\d{2}$/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Security Explorer" }),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
});
