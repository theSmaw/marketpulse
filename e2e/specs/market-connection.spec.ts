import {
  CONNECTION_DESCRIPTIONS,
  MARKET_FEED_DESCRIPTIONS,
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type { WireFeedState, WireObservation } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page, WebSocketRoute } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// **The connection cell, in a browser** — both directions (Task 3.3.6).
//
// **Acceptance criterion 2 is the one with teeth**, and it is the second test
// here.
//
// Closing the backend turns the feed region to `disconnected` **without a
// refresh**, and leaves every other region and every number on the page
// intact. `PRODUCT_SPEC.md` §36 forbids collapsing to a global error screen and
// names this exact case; **this is the first story where it is testable**,
// because it is the first one that holds a connection that can be taken away.
//
// ## Why a browser, and why this cannot exist below one
//
// The transition is the whole assertion. A component test can render a
// disconnected view; nothing below a browser can *lose a socket* and then read
// what the rest of the page did about it — and "the rest of the page did
// nothing" is the half that matters.
//
// ## How the outage is produced, and why not by stopping the backend
//
// `routeWebSocket` closes **this page's** market socket and touches nothing
// else, which is the same choice `backend-recovery.spec.ts` made for HTTP and
// for the same reason: the pair is shared with every other spec in the run.
// It is also the sharper instrument — killing the whole backend would degrade
// two indicators at once and could not tell you which one the page was
// reacting to.
//
// ## What CI can answer, checked before this was written
//
// CI has no credential, so `MARKET_DATA_PROVIDER` is `none` and the feed cell
// reads `not configured` with **no connection word at all** — §11.3's `—`.
// After the socket dies it reads `not configured · disconnected`, because
// `STORY.md`'s open decision 3 settled that *we lost the backend* is a
// connection fact the chrome states whatever the feed identity. **Criterion 2
// is therefore observable on a runner**, which is the reason that shape was
// chosen over silence — and this spec asserts the two cells moving
// *independently*, which is what would go red if they were ever collapsed.

const EXPLORER = "/securities/NVDA";

const DISCONNECTED = CONNECTION_DESCRIPTIONS.disconnected.label;

/** The status bar's market-feed cell — `market-feed.spec.ts`'s locator. */
function feedRegion(page: Page) {
  return page
    .getByRole("contentinfo")
    .getByText("Market feed", { exact: true })
    .locator("..");
}

/**
 * Every figure the page is showing, in document order.
 *
 * Criterion 4 is *no datum changes as a result of this story*, and it is the
 * boundary Story 3.4 depends on — **a test that only checked the region would
 * pass while a price ticked**. This reads the numbers themselves rather than
 * their positions, because a shifted layout is not a changed datum and the two
 * must not be confused: the bar legitimately grows by two pixels when a second
 * sentence arrives in it.
 */
async function figuresOn(page: Page): Promise<readonly string[]> {
  return page.locator("main").evaluate((root) => {
    const out: string[] = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walk.nextNode();
    while (node !== null) {
      for (const match of (node.textContent ?? "").matchAll(
        /-?\d[\d,]*(?:\.\d+)?%?/gu,
      )) {
        out.push(match[0]);
      }
      node = walk.nextNode();
    }
    return out;
  });
}

/** Every named region, so a failure that *removed* one is visible too. */
async function regionsOn(page: Page): Promise<readonly string[]> {
  return page
    .getByRole("region")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-label") ?? "?"),
    );
}

test("the feed region degrades without a refresh, and nothing else moves", async ({
  page,
}) => {
  let socket: WebSocketRoute | undefined;

  // Installed before the page loads, because a route cannot intercept a
  // connection that has already been made. The handler passes the frames
  // straight through, so up to the moment it is closed this is the real feed.
  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    socket = ws;
    ws.connectToServer();
  });

  // **`networkidle` rather than the default, and it is a fix rather than
  // caution.** The first draft captured the figures as soon as the feed cell
  // had settled and compared them after the socket died — and passed alone
  // while failing beside another spec, because under a loaded backend a
  // late-arriving answer changed a number between the two reads. The comparison
  // is only meaningful once the page has stopped acquiring numbers.
  await page.goto(EXPLORER, { waitUntil: "networkidle" });

  const region = feedRegion(page);

  // Settled rather than mid-flight. `checking` is what every load renders until
  // the first answer, and asserting against it would be asserting about the
  // page's startup instead of about the outage.
  await expect(region.getByText("checking")).toHaveCount(0);

  // **Whatever the venue cell says, it must still say it afterwards.** Captured
  // rather than named, because it is `not configured` on CI and a real feed on
  // a configured deployment, and this spec is about neither.
  const venueBefore = await region.innerText();
  await expect(region.getByText(DISCONNECTED, { exact: true })).toHaveCount(0);

  const figuresBefore = await figuresOn(page);
  const regionsBefore = await regionsOn(page);

  expect(socket).toBeDefined();
  await socket?.close();

  // **No `waitForTimeout`, and that is load-bearing.** The transport reports a
  // closed socket in the same tick; §11.2's 165 s is for a socket that goes
  // *silent*, not one that goes away, and a spec that waited it out would be
  // asserting the wrong mechanism at 165× the cost.
  await expect(region.getByText(DISCONNECTED, { exact: true })).toBeVisible();

  // The page was never reloaded, so the numbers on it are the same numbers.
  expect(await figuresOn(page)).toEqual(figuresBefore);
  expect(await regionsOn(page)).toEqual(regionsBefore);

  // And §36's floor: no global error screen, no thrown render.
  await expectNothingFailedToRender(page);

  // **The two cells did not move together.** The venue is a fact about the
  // deployment and is true whether or not anything is connected — a cell that
  // blanked when the socket did would lose the one thing a reader needs in
  // order to judge the numbers still on the screen. This is the assertion that
  // goes red if the connection word is ever allowed to drive the venue.
  expect(await region.innerText()).toContain(venueBefore.split("\n")[0] ?? "");
});

test("losing the socket does not make the backend cell lie about itself", async ({
  page,
}) => {
  // The other half of Task 3.3.6's design finding, and the one that keeps the
  // two indicators independent.
  //
  // A lost socket now **prompts** an immediate health check — without it the
  // strip read `feed · disconnected` beside `backend · healthy` for up to
  // thirty seconds, each cell honest and the pair pointing at the wrong
  // subject. But the check reports **its own** result: here the backend is
  // genuinely up, the socket alone is gone, and the correct answer is that the
  // backend cell does not move. **One indicator may tell another when to look;
  // it may not tell it what it sees.**
  let socket: WebSocketRoute | undefined;

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    socket = ws;
    ws.connectToServer();
  });

  await page.goto(EXPLORER, { waitUntil: "networkidle" });

  const region = feedRegion(page);
  await expect(region.getByText("checking")).toHaveCount(0);

  const backend = page
    .getByRole("contentinfo")
    .getByText("Backend service", { exact: true })
    .locator("..");

  await expect(backend.getByText("healthy", { exact: true })).toBeVisible();

  await socket?.close();

  await expect(region.getByText(DISCONNECTED, { exact: true })).toBeVisible();

  // Still healthy, because it still is. The prompt fired, the check ran, and
  // the backend answered.
  await expect(backend.getByText("healthy", { exact: true })).toBeVisible();

  await expectNothingFailedToRender(page);
});

/**
 * Answer the socket entirely from the test, with one snapshot.
 *
 * **Not connected to the server**, unlike the two tests above: this is what lets
 * a runner with no provider produce states only a configured one could reach.
 * Built with the shipped encoder rather than typed as JSON, so a protocol change
 * breaks this at the compiler instead of at an assertion.
 */
async function serveSnapshot(
  page: Page,
  feed: WireFeedState,
  observations: Readonly<Record<string, WireObservation>> = {},
): Promise<void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: feed.feed }),
    }),
  );

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    ws.send(
      encodeMarketStreamMessage({
        type: "snapshot",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        observations,
        feed,
      }),
    );
  });
}

/** A bar whose own minute closed `agoMs` ago — §7.3's instant, not an arrival. */
function barFrom(agoMs: number): WireObservation {
  return {
    startsAt: new Date(Date.now() - agoMs).toISOString(),
    open: 1,
    high: 1,
    low: 1,
    close: 1,
    volume: 1,
  };
}

// **The gap these three close, found by Task 3.3.6's sweep and not by a
// failure.**
//
// CI has no credential, so `MARKET_DATA_PROVIDER` is `none` and **no browser
// test in this repository had ever seen `LIVE`** — the word this epic exists to
// put on a screen. Every assertion about it was a unit test, and the two tests
// above only reach `disconnected`, which appears precisely *because* nothing is
// configured.
//
// That is the general form of the defect this task found twice: **a spec that
// asserts an absence passes for free on a deployment that cannot produce the
// thing.** `market-feed.spec.ts` held one for four days after the words it
// forbade became real.
//
// It needs no CI change, which is why it is here rather than handed on.

test("out of hours a healthy feed says LIVE, beside a clock saying CLOSED", async ({
  page,
}) => {
  // §11.3's row that looks wrong and is correct: `IEX` / `LIVE` / `CLOSED`. Our
  // connection is healthy and the market is shut, and the two regions are about
  // different subjects. **`LIVE` means the feed is HEALTHY, not that data
  // arrived** — §7.6 measured a median symbol producing a bar in 65.1% of
  // minutes, so a definition keyed on data would report a working feed as
  // not-live for most of the day.
  await serveSnapshot(page, { status: "live", feed: "iex", marketOpen: false });

  await page.goto(EXPLORER);

  const region = feedRegion(page);

  // **Criterion 3, on the live state**: the label names a single venue AND the
  // sentence §7.1 requires is beside it. The acronym alone is the thing §7.1
  // refuses — *MarketPulse must not imply that IEX represents every US
  // exchange*, and three letters teach a non-specialist nothing. Asserting the
  // label without the sentence would be asserting the half the spec forbids.
  const { label, sentence } = MARKET_FEED_DESCRIPTIONS.iex;

  await expect(region.getByText(label, { exact: true })).toBeVisible();
  expect(sentence).toBeDefined();
  await expect(region.getByText(sentence ?? "")).toBeVisible();
  await expect(
    region.getByText(CONNECTION_DESCRIPTIONS.live.label, { exact: true }),
  ).toBeVisible();

  // **`LIVE` carries no instant.** §36's sentence qualifies a broken state and a
  // healthy feed has nothing to qualify; this goes red if a timestamp is ever
  // attached to the healthy case.
  await expect(region.getByText(/Showing data through/u)).toHaveCount(0);

  await expectNothingFailedToRender(page);
});

test("in session, a bar that has just arrived is LIVE", async ({ page }) => {
  // **The browser's first sight of Task 3.3.4's repair.** §11.2's staleness is
  // measured from the end of the interval a bar describes, not from the instant
  // that opens it — §7.3 measured a bar stamped `14:01:00Z` arriving at
  // `14:02:00.5Z`, so a rule keyed on the opening instant fired on every healthy
  // delivery and `live` was unreachable in session. Thirty seconds old here is
  // a bar mid-minute: comfortably live under the repair, and `stale` without it.
  await serveSnapshot(
    page,
    { status: "live", feed: "iex", marketOpen: true },
    { NVDA: barFrom(30_000) },
  );

  await page.goto(EXPLORER);

  const region = feedRegion(page);

  await expect(
    region.getByText(CONNECTION_DESCRIPTIONS.live.label, { exact: true }),
  ).toBeVisible();
  await expect(region.getByText(/Showing data through/u)).toHaveCount(0);

  await expectNothingFailedToRender(page);
});

test("in session, a feed that has stopped delivering is STALE, with its instant", async ({
  page,
}) => {
  // The state §11.2 exists to make sayable — *our socket is fine and the market
  // feed behind it is dead* — and **the first time any browser test has seen
  // it**. Three minutes past the bar's own minute is well past the 60 s of
  // silence the threshold specifies.
  await serveSnapshot(
    page,
    { status: "live", feed: "iex", marketOpen: true },
    { NVDA: barFrom(3 * 60_000) },
  );

  await page.goto(EXPLORER);

  const region = feedRegion(page);

  await expect(
    region.getByText(CONNECTION_DESCRIPTIONS.stale.label, { exact: true }),
  ).toBeVisible();

  // **And the instant, inside the sentence that explains why it is there** —
  // never as a bare timestamp a reader has to interpret.
  await expect(region.getByText(/Showing data through/u)).toBeVisible();

  await expectNothingFailedToRender(page);
});
