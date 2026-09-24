import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";

// **What the chrome says when the feed stops, asserted against a produced
// outage** (Task 3.10.2).
//
// ## Why this is a browser spec and cannot be anything smaller
//
// `FeedIndicator.test.tsx` renders a view object and asserts the words. It
// cannot see that **the socket a route opened reaches the cell a reader looks
// at, through `App`, a hook, a threshold and two clocks** — and Story 3.10's
// criterion 7 asks for exactly that: the `LIVE` claim false *against a produced
// disconnection rather than a simulated one*.
//
// Three defects of that family have shipped in this epic with `pnpm verify`
// green, the worst of them blanking the page on every deploy for five days.
//
// ## What CI can answer
//
// CI's store is **518 securities and zero bars** and CI has no vendor
// credential, so nothing here asserts a figure. What it asserts is the chrome's
// words, the survival of whatever the page had, and that nothing collapsed —
// all of which are true of an empty store.

const EXPLORER = "/securities/NVDA";

/** One observation, so the page has a live price to keep through an outage. */
const LIVE_PRICE = {
  NVDA: {
    startsAt: new Date(Date.now() - 5_000).toISOString(),
    open: 230.1,
    high: 230.4,
    low: 230.0,
    close: 230.25,
    volume: 145_000,
  },
};

/**
 * The feed cell, scoped to the footer.
 *
 * **Not `getByText(/market feed/)`**, which the first draft used and which is
 * ambiguous on this page: the source note under the charts says *"Sector and
 * industry are curated, not from the market feed."* — a different surface,
 * four inches away, matching the same words. `e2e/README.md` already carries
 * the general rule from a strict-mode flake of the same shape.
 */
function feedCell(page: Page) {
  return page.locator("footer").first();
}

/** Everything the footer says, whitespace collapsed. */
async function chrome(page: Page): Promise<string> {
  const footer = page.locator("footer").first();
  return ((await footer.innerText()) || "").replace(/\s+/gu, " ").trim();
}

test("the LIVE claim goes false when the socket really dies", async ({
  page,
}) => {
  const feed = await serveFeed(page, { snapshot: LIVE_PRICE });

  await page.goto(EXPLORER);
  await expect(feedCell(page)).toContainText(/live/iu);

  feed.drop();

  // The browser concludes this from the close itself rather than from anything
  // the test asserted — `feedStatusFrom` reads `closed` directly, so no
  // threshold has to elapse.
  await expect(feedCell(page)).toContainText(/disconnected/iu);
  await expect(feedCell(page)).not.toContainText(/\blive\b/iu);

  await expectNothingFailedToRender(page);
});

test("a dead feed says what it is still showing, and as of when", async ({
  page,
}) => {
  const feed = await serveFeed(page, { snapshot: LIVE_PRICE });

  await page.goto(EXPLORER);
  await expect(feedCell(page)).toContainText(/live/iu);

  feed.drop();

  // §36's own sentence, with the instant it names. **The instant is the
  // newest observation's own**, not the moment the socket died — those differ
  // by however long the feed was silent before anybody noticed.
  await expect(feedCell(page)).toContainText(
    "The live feed is not connected. Prices shown are the last known.",
  );
  await expect(feedCell(page)).toContainText(/Showing data through .+\./u);

  await expectNothingFailedToRender(page);
});

test("a page that never received a price does not claim to be showing one", async ({
  page,
}) => {
  // **The case Task 3.10.2 decided** — a cold load before any bar has landed,
  // which is ordinary rather than exotic. No snapshot observations at all.
  const feed = await serveFeed(page, { marketOpen: false });

  await page.goto(EXPLORER);
  feed.drop();

  await expect(feedCell(page)).toContainText(
    "The live feed is not connected. No live prices have arrived yet.",
  );

  // The two claims that would be false here, named so the assertion says what
  // it is for rather than only that a string matched.
  await expect(feedCell(page)).not.toContainText(
    "Prices shown are the last known",
  );
  await expect(feedCell(page)).not.toContainText("Showing data through");

  await expectNothingFailedToRender(page);
});

test("a quiet socket says so without claiming data it never had", async ({
  page,
}) => {
  const feed = await serveFeed(page, { marketOpen: false });

  await page.goto(EXPLORER);
  feed.goStale();

  await expect(feedCell(page)).toContainText(
    "Connected, and no live prices have arrived yet.",
  );
  await expect(feedCell(page)).not.toContainText("no new data has arrived");

  await expectNothingFailedToRender(page);
});

test("killing the feed leaves the page exactly as it was", async ({ page }) => {
  // **Criterion 3**, which Task 3.10.1 measured and nothing held. §36's hardest
  // promise: degrade locally, never collapse. The comparison is the whole
  // page's text either side of the outage, minus the chrome that is supposed
  // to change.
  const feed = await serveFeed(page, { snapshot: LIVE_PRICE });

  await page.goto(EXPLORER);
  await expect(feedCell(page)).toContainText(/live/iu);

  const main = page.locator("main").first();

  // **Wait for the snapshot's price to be ON the page before snapshotting it.**
  // The chrome says `live` as soon as the socket greets the browser, which is
  // before the identity block has rendered the observation that greeting
  // carried — so a `before` taken on the chrome's word alone can miss a figure
  // the `after` has, and the comparison fails on the page having *finished
  // loading* rather than on the outage changing anything. Found on a full-suite
  // run under load; the assertion was right and the fixture was racing it.
  await expect(main).toContainText("230.25");

  const before = ((await main.innerText()) || "").replace(/\s+/gu, " ").trim();
  expect(before.length).toBeGreaterThan(40);

  feed.drop();
  await expect(feedCell(page)).toContainText(/disconnected/iu);

  const after = ((await main.innerText()) || "").replace(/\s+/gu, " ").trim();
  expect(after).toBe(before);

  // And no global error screen, which is the one thing §36 forbids outright.
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expectNothingFailedToRender(page);
});

test("the venue survives the connection dying", async ({ page }) => {
  // The cell has two subjects and they fail independently — Task 1.12.4's
  // argument, refused for the seventh time. Whatever venue word the deployment
  // has, it is still true when the socket dies: provenance is a fact about the
  // deployment, not about a connection.
  const feed = await serveFeed(page, { snapshot: LIVE_PRICE });

  await page.goto(EXPLORER);
  const before = await chrome(page);

  feed.drop();
  await expect(feedCell(page)).toContainText(/disconnected/iu);

  // The venue word itself, before and after — `iex`'s label is `IEX`, and the
  // harness serves that same value to both halves of the cell.
  expect(feed.feed()).toBe("iex");
  expect(before).toMatch(/IEX/u);
  await expect(feedCell(page)).toContainText(/IEX/u);

  // And its sentence, which invariant 6 makes UNCONDITIONAL: a claim about
  // which venues are in a number must not become contingent on whether a
  // socket is healthy — that is exactly when a reader is likeliest to misread
  // the numbers still on the screen (`Live in the chrome` §04).
  await expect(feedCell(page)).toContainText(
    "Trades reported by the IEX exchange only",
  );

  await expectNothingFailedToRender(page);
});

test("the venue names the live tape, not the one the charts came from", async ({
  page,
}) => {
  // **Task 3.10.6.** On the deployed site during a session this cell read
  // `ALL US EXCHANGES · LIVE` beside numbers that were entirely IEX — two true
  // halves from two sources, and invariant 6 breached on every route.
  const feed = await serveFeed(page, { snapshot: LIVE_PRICE });

  await page.goto(EXPLORER);
  await expect(feedCell(page)).toContainText(/live/iu);

  // The harness serves one coherent deployment whose live tape is `iex`.
  await expect(feedCell(page)).toContainText("IEX");
  await expect(feedCell(page)).not.toContainText("All US exchanges");

  // And the disclaimer arrives with the venue, which is §7.1's actual
  // requirement — three letters teach a non-specialist nothing.
  await expect(feedCell(page)).toContainText(
    "Trades reported by the IEX exchange only",
  );

  expect(feed.feed()).toBe("iex");
  await expectNothingFailedToRender(page);
});

test("a quiet socket outside market hours is not a feed failure", async ({
  page,
}) => {
  // **Criterion 5.** `FeedStatus` is about the connection and
  // `MarketSessionStatus` about the session, and they are deliberately
  // separate: the market being shut is not a feed failure, and the 165 s
  // threshold does not know what time it is.
  const feed = await serveFeed(page, { marketOpen: false, snapshot: {} });

  await page.goto(EXPLORER);

  await expect(feedCell(page)).toContainText(/live/iu);
  await expect(feedCell(page)).not.toContainText(/disconnected/iu);
  await expect(feedCell(page)).not.toContainText(/stale/iu);

  expect(feed.feed()).toBe("iex");
  await expectNothingFailedToRender(page);
});

test("a degradation is announced, and a page load is not", async ({ page }) => {
  // **Task 3.10.6's other half.** Since Task 3.10.5 this cell is the ONLY
  // surface on a security page that says the feed stopped, and it was
  // announced to nobody. It speaks now — but only when something got worse.
  const feed = await serveFeed(page, { snapshot: LIVE_PRICE });

  const spoken = () =>
    page.locator("footer [role='status']").first().textContent();

  await page.goto(EXPLORER);
  await expect(feedCell(page)).toContainText(/live/iu);

  // Mount says nothing, which is the whole reason a plain `role="status"` on
  // the cell was refused: it would speak on every page load and navigation.
  expect((await spoken())?.trim()).toBe("");

  feed.drop();
  await expect(feedCell(page)).toContainText(/disconnected/iu);

  await expect
    .poll(async () => (await spoken())?.trim())
    .toContain("Market feed disconnected");

  await expectNothingFailedToRender(page);
});
