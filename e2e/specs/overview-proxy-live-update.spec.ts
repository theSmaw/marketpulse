import {
  CONNECTION_DESCRIPTIONS,
  FEED_STATUSES,
  MARKET_FEED_DESCRIPTIONS,
  MARKET_STREAM_PROTOCOL_VERSION,
  REPLAYING_DESCRIPTION,
  decodeMarketStreamClientMessage,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  MarketFeed,
  WireFeedState,
  WireMarketOverview,
  WireObservation,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page, WebSocketRoute } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// **A live update landing in an index proxy, in a real browser** (Task 4.2.8 —
// Story 4.2's criterion 6).
//
// ## What this can and cannot say
//
// **It covers the browser half of the chain and nothing upstream of the
// socket** — the same half, in the same words, as
// `universe-live-update.spec.ts`. CI's store is 518 securities and zero bars,
// CI has no credential and no upstream socket, so the stream under test is one
// this spec **produces**: `serveProxies` answers `/market-stream` from the test
// and the frames are built with the **shipped encoder**, so a protocol change
// breaks this at the compiler rather than at an assertion.
//
// What it therefore says is everything about what the browser does with an
// arrival in this strip, and nothing about whether one arrives. The chain from
// a real Alpaca frame to these four cells is covered piecewise elsewhere and
// end to end by nobody.
//
// ## Why a FIGURE is asserted here, where the table spec asserts only a delta
//
// `universe-live-update.spec.ts` captures an untouched row's text and asserts
// it **unchanged**, because that row's content is the **store's** — an em dash
// on CI, a dated close on a developer's machine. This strip's figures are not
// the store's at all: they are the **overview frame's**, and this spec serves
// the overview frame. So every figure on screen here is one this test wrote,
// on CI and on a developer's machine alike.
//
// That is `docs/GAPS.md`'s own repair for the `security-chart-edge.spec.ts`
// incident, arriving at a second surface: **a spec that asserts a figure serves
// its own answer.** The untouched-sibling capture is kept anyway — not for
// store independence, which it no longer buys, but because *the cell that did
// not arrive is exactly what it was* is the assertion Task 4.2.5's reservation
// work exists for, and comparing a captured string is how a change in it fails
// loudly rather than being absorbed into a figure somebody typed.
//
// ## The harness is narrower than the wire, on purpose
//
// `e2e/support/feed.ts` serves the venue and the connection from **one** value
// so that an incoherent pair is unrepresentable, because *a stub that can send
// any frame can manufacture states the server cannot, and those look exactly
// like findings* — Task 3.10.1 wrote up two such findings and withdrew one.
// Two applications of that rule here, and both are enforced rather than
// observed:
//
//   - **One venue value, three places.** `GET /market-data`, the `feed` frame's
//     venue and the overview's `feeds` come from a single `VENUE`, so the
//     chrome cannot name one tape while the aggregate names another.
//   - **An observation is not sendable for a symbol the browser did not
//     subscribe to.** `send` throws on one. The gateway scopes `bars` to each
//     client's own subscription (`scopedTo`), so a frame this harness could not
//     have received is a state the server cannot produce.
//
// It is a **local** harness rather than an extension of `support/feed.ts` for
// one reason: this is the first spec that needs the gateway's real
// **two-snapshot** sequence — a structurally empty snapshot on connect, then a
// scoped one answering each `subscribe` — and putting that into the shared
// harness would change the frame sequence under ten existing specs to buy
// nothing for any of them. `universe-live-update.spec.ts` is the precedent for
// a spec owning its own socket.

const OVERVIEW = "/";

/** The one venue value. See the header. */
const VENUE: MarketFeed = "iex";

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: VENUE,
  marketOpen: true,
};

/** 14:01 and 14:02 ET on a Wednesday — inside the session, so no extended-hours word. */
const FIRST_MINUTE = "2026-09-16T18:01:00Z";
const NEXT_MINUTE = "2026-09-16T18:02:00Z";

/** The four the backend derives from `kind: "index_etf"`, in its own order. */
const PROXIES = ["SPY", "QQQ", "DIA", "IWM"] as const;

/**
 * The connection words, **taken from the module that owns them** rather than
 * written out — a word this spec spelled itself would be a second home for the
 * fact whose one home is what the third test is about.
 */
const CONNECTION_WORDS = [
  ...FEED_STATUSES.map((status) => CONNECTION_DESCRIPTIONS[status].label),
  REPLAYING_DESCRIPTION.label,
];

/**
 * What the strip may not contain in any state (Story 4.2's criterion 5): every
 * connection word, in both the source's case and the case CSS renders them in,
 * plus every venue word and the cell's own label.
 */
const FORBIDDEN_IN_THE_STRIP = [
  ...CONNECTION_WORDS,
  ...CONNECTION_WORDS.map((word) => word.toUpperCase()),
  MARKET_FEED_DESCRIPTIONS.iex.label,
  MARKET_FEED_DESCRIPTIONS.sip.label,
  "Market feed",
];

const observation = (startsAt: string, close: number): WireObservation => ({
  startsAt,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

const observed = (
  symbol: string,
  at: string,
  price: number,
  changePercent: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at,
  price,
  changePercent,
  changeBasis: "2026-09-15",
});

/**
 * The aggregate, in the shape the gateway builds it.
 *
 * `feeds` is derived from the observed figures rather than passed in — the
 * venue rule above, applied to the one field on this frame that names a tape.
 */
const overviewOf = (
  figures: readonly WireOverviewFigure[],
  computedAt: string,
): WireMarketOverview => ({
  computedAt,
  feeds: figures.some((figure) => figure.state === "observed") ? [VENUE] : [],
  figures,
});

interface ServedProxies {
  /**
   * A burst, in the gateway's own order: the aggregate, then the observations.
   *
   * `publishObservations` broadcasts the overview and **then** sends each
   * client its scoped `bars` — and the order is not cosmetic here, because the
   * figure comes from the first frame and the mark from the second.
   */
  readonly push: (
    figures: readonly WireOverviewFigure[],
    observations: Readonly<Record<string, WireObservation>>,
  ) => void;
}

/**
 * Serve the market stream from the test, answering `subscribe` as the gateway
 * does.
 *
 * **Two snapshots per connection, which is the real sequence** (Task 4.2.1's
 * measurement, 149 bytes then 56.9 KiB): a browser is attached with an empty
 * subscription and answered with a structurally empty snapshot plus the
 * aggregate, and every readable `subscribe` message after that is answered with
 * a snapshot scoped to what it asked for, plus the aggregate again. This strip
 * needs it — its symbols come from the **first overview frame**, so the page
 * cannot have subscribed before that frame arrives, and nothing lands in a cell
 * until the subscribe is answered.
 *
 * The client message is read with the **shipped decoder**, so a subscribe whose
 * shape changes fails to decode here exactly as it would at the gateway.
 */
async function serveProxies(
  page: Page,
  figures: readonly WireOverviewFigure[],
  snapshot: Readonly<Record<string, WireObservation>>,
): Promise<ServedProxies> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: VENUE }),
    }),
  );

  let socket: WebSocketRoute | undefined;
  let subscribed = new Set<string>();

  const overviewFrame = (of: readonly WireOverviewFigure[]): string =>
    encodeMarketStreamMessage({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: new Date().toISOString(),
      overview: overviewOf(of, new Date().toISOString()),
    });

  const snapshotFrame = (
    observations: Readonly<Record<string, WireObservation>>,
  ): string =>
    encodeMarketStreamMessage({
      type: "snapshot",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: new Date().toISOString(),
      observations,
      feed: LIVE_FEED,
    });

  /** §11.1's omission semantics, as `sendSnapshot` applies them. */
  const scoped = (
    observations: Readonly<Record<string, WireObservation>>,
  ): Record<string, WireObservation> =>
    Object.fromEntries(
      Object.entries(observations).filter(([symbol]) => subscribed.has(symbol)),
    );

  let served = figures;

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    socket = ws;
    subscribed = new Set();

    // On connect: the structurally empty snapshot, then the aggregate. The
    // aggregate is **not** scoped to a subscription, which is what gives this
    // page its four symbols before it has asked for anything.
    ws.send(snapshotFrame({}));
    ws.send(overviewFrame(served));

    ws.onMessage((raw) => {
      const decoded = decodeMarketStreamClientMessage(String(raw));
      if (decoded.kind !== "message" || decoded.message === undefined) return;

      subscribed = new Set(decoded.message.symbols);
      ws.send(snapshotFrame(scoped(snapshot)));
      ws.send(overviewFrame(served));
    });
  });

  return {
    push: (next, observations) => {
      for (const symbol of Object.keys(observations)) {
        if (!subscribed.has(symbol)) {
          // The narrowness rule, enforced rather than remembered. A `bars`
          // frame for an unsubscribed symbol is a frame the gateway's
          // `scopedTo` cannot emit, so a state produced with one would be a
          // finding about nothing.
          throw new Error(
            `the page has not subscribed to ${symbol}; the gateway would not send it`,
          );
        }
      }

      served = next;
      socket?.send(overviewFrame(next));
      socket?.send(
        encodeMarketStreamMessage({
          type: "bars",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt: new Date().toISOString(),
          observations,
        }),
      );
    },
  };
}

const proxies = (page: Page) =>
  page.getByRole("region", { name: "Market proxies" });

/**
 * One proxy's cell, reached through the row that holds its symbol.
 *
 * Located structurally rather than by the cell's own text, because the figure
 * and the change **are** what is under test. The strip is three `<p>` rows in a
 * grid with no role of its own — `MarketProxyStrip` argues at length why it is
 * not a `<dl>` — so the symbol row's parent is what stands in for a cell
 * selector. That is a real coupling to the strip's shape and it is the cheapest
 * honest option, the same one `landing-route.spec.ts` takes for the chrome's
 * status cells.
 */
const cellOf = (page: Page, symbol: string): Locator =>
  proxies(page)
    .locator("p", { hasText: new RegExp(`^${symbol}$`, "u") })
    .locator("..");

/**
 * A cell's **figure row** — the second of its three `<p>`s, located by position
 * for the reason the table spec locates `Last` by column index: its text is
 * what is under test.
 *
 * Row 1 is the symbol and the mark's slot, row 2 the figure and the change, row
 * 3 the per-proxy exception. The rows are fixed and reserved in every state, so
 * an index is stable here in a way it would not be in a component that hides
 * one.
 */
const figureRowOf = (cell: Locator): Locator => cell.locator("p").nth(1);

const marksIn = (scope: Locator) => scope.locator("[data-arrival]");

/**
 * The strip's symbols **in the order they are drawn**, read from the DOM rather
 * than from {@link PROXIES}.
 *
 * The first draft of this read each cell through {@link cellOf} and compared the
 * result against the list it had just looked them up by, which cannot fail. The
 * symbol rows are matched as a set and `allInnerTexts` returns them in document
 * order, so a re-rank under live data is what this can see.
 */
const symbolOrder = (page: Page): Promise<string[]> =>
  proxies(page)
    .locator("p")
    .filter({ hasText: /^[A-Z]{2,5}$/u })
    .allInnerTexts();

test("a bar arriving changes a proxy's figure with no reload, and moves nothing else", async ({
  page,
}) => {
  const feed = await serveProxies(
    page,
    [
      observed("SPY", FIRST_MINUTE, 774.03, 0.42),
      observed("QQQ", FIRST_MINUTE, 601.88, 0.61),
      observed("DIA", FIRST_MINUTE, 525.79, -0.18),
      observed("IWM", FIRST_MINUTE, 288.89, 0.07),
    ],
    {
      SPY: observation(FIRST_MINUTE, 774.03),
      QQQ: observation(FIRST_MINUTE, 601.88),
      DIA: observation(FIRST_MINUTE, 525.79),
      IWM: observation(FIRST_MINUTE, 288.89),
    },
  );

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  const spy = cellOf(page, "SPY");
  const dia = cellOf(page, "DIA");

  // **The aggregate put a figure in every cell.** The change travels with it
  // and the strip does not re-derive it — `changeFromClose` has one home in the
  // backend — so what is asserted is the frame's own percentage, formatted.
  await expect(spy).toContainText("774.03");
  await expect(spy).toContainText("+0.42%");

  // The cell the next frame does not carry — its **figure row**, captured
  // rather than assumed and asserted unchanged below. See the assertion for why
  // it is the row and not the cell.
  const diaFigureBefore = await figureRowOf(dia).innerText();
  await expect(dia).not.toContainText("from ");

  // Four cells, in the order the frame reported them — the strip draws what it
  // is given and names no security itself.
  const orderBefore = await symbolOrder(page);
  expect(orderBefore).toEqual([...PROXIES]);

  feed.push(
    [
      observed("SPY", NEXT_MINUTE, 775.1, 0.56),
      observed("QQQ", FIRST_MINUTE, 601.88, 0.61),
      observed("DIA", FIRST_MINUTE, 525.79, -0.18),
      observed("IWM", FIRST_MINUTE, 288.89, 0.07),
    ],
    { SPY: observation(NEXT_MINUTE, 775.1) },
  );

  // **The transition, which is the whole criterion.** The number that was one
  // thing is now another, in the cell, with no navigation and no reload.
  await expect(spy).toContainText("775.10");
  await expect(spy).not.toContainText("774.03");
  await expect(spy).toContainText("+0.56%");

  // **And no other FIGURE moved**, which is a weaker claim than the universe
  // table's and the difference is the finding rather than a compromise.
  //
  // `universe-live-update.spec.ts` asserts an untouched row's whole cell is
  // byte-identical afterwards, and that assertion does **not** transfer: this
  // strip's third row is a *relative* exception, so the moment `SPY` moves to
  // 14:02 the three cells still at 14:01 are *behind the newest observation* and
  // each correctly grows `from 14:01`. Written as a whole-cell comparison this
  // test failed on the product working as designed.
  //
  // So what is asserted is the pair the reservations exist for: the figure row
  // is exactly what it was, and the exception it gained is the one the shared
  // claim above no longer covers it with. `useInnerText`, for
  // `universe-live-update`'s reason — the reserved rows hold a non-breaking
  // space on a line of their own and the two readers disagree about it.
  await expect(figureRowOf(dia)).toHaveText(diaFigureBefore, {
    useInnerText: true,
  });
  await expect(dia).toContainText("from 14:01");

  // And the four are still in the frame's order rather than re-ranked by the
  // move — the table's decision, at four cells.
  expect(await symbolOrder(page)).toEqual(orderBefore);

  await expectNothingFailedToRender(page);
});

test("the arrival marks the proxy that arrived, and only that one", async ({
  page,
}) => {
  const feed = await serveProxies(
    page,
    [
      observed("SPY", FIRST_MINUTE, 774.03, 0.42),
      observed("QQQ", FIRST_MINUTE, 601.88, 0.61),
      observed("DIA", FIRST_MINUTE, 525.79, -0.18),
      observed("IWM", FIRST_MINUTE, 288.89, 0.07),
    ],
    {
      SPY: observation(FIRST_MINUTE, 774.03),
      QQQ: observation(FIRST_MINUTE, 601.88),
    },
  );

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expect(cellOf(page, "SPY")).toContainText("774.03");

  // **A snapshot is not an arrival** (Task 3.5.4), and here that is what stops
  // four discs firing on first paint on the product's landing page: two live
  // observations delivered, zero marks.
  await expect(marksIn(proxies(page))).toHaveCount(0);

  feed.push(
    [
      observed("SPY", NEXT_MINUTE, 775.1, 0.56),
      observed("QQQ", FIRST_MINUTE, 601.88, 0.61),
      observed("DIA", FIRST_MINUTE, 525.79, -0.18),
      observed("IWM", FIRST_MINUTE, 288.89, 0.07),
    ],
    { SPY: observation(NEXT_MINUTE, 775.1) },
  );

  await expect(cellOf(page, "SPY")).toContainText("775.10");

  // One bar arrived, one cell is marked — the one it arrived for — and the
  // other live cell, which the frame did not carry, is not.
  await expect(marksIn(cellOf(page, "SPY"))).toHaveCount(1);
  await expect(marksIn(cellOf(page, "QQQ"))).toHaveCount(0);
  await expect(marksIn(proxies(page))).toHaveCount(1);

  // The same vocabulary as the identity block's and the table's marks, by
  // construction: one rule, `composes:`d by all three. Asserted on the
  // animation rather than on a sampled opacity, for `security-price-motion`'s
  // reason.
  await expect(marksIn(cellOf(page, "SPY"))).toHaveCSS(
    "animation-name",
    /arrival-decays/u,
  );

  await expectNothingFailedToRender(page);
});

test("the strip says no connection word while the chrome is saying one", async ({
  page,
}) => {
  // **Story 3.10's one-home rule, asserted on an ASSEMBLED page**, which is the
  // one thing the component test next to `MarketProxyStrip` cannot do: it
  // renders the strip alone, so *the strip names no connection word* is true
  // there whether or not the product has a second speaker. Here the status bar
  // is genuinely saying one at the same moment.
  //
  // **Which word it says is deliberately not pinned, and that is a trap this
  // suite has already paid for once.** Staleness is 60 s of **wall clock**
  // against the newest observation's own instant, so a bar stamped on a fixed
  // minute always reads `stale` — Task 3.10.9's instrument reported exactly
  // that as a defect before working out that the chrome was right and the
  // fixture was weeks old. Producing `live` needs an instant on the current
  // minute, which couples every reading in the spec to the wall clock and puts
  // a 60 s threshold under it. The claim being asserted is *one home*, and one
  // home is satisfied by whichever of the three words the cell is showing.
  const feed = await serveProxies(
    page,
    [observed("SPY", FIRST_MINUTE, 774.03, 0.42)],
    { SPY: observation(FIRST_MINUTE, 774.03) },
  );

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expect(cellOf(page, "SPY")).toContainText("774.03");

  const feedCell = page
    .getByRole("contentinfo")
    .getByText("Market feed", { exact: true })
    .locator("..");
  await expect(
    feedCell.getByText(new RegExp(`^(${CONNECTION_WORDS.join("|")})$`, "u")),
  ).toBeVisible();

  const strip = await proxies(page).innerText();
  for (const word of FORBIDDEN_IN_THE_STRIP) {
    expect(strip).not.toContain(word);
  }

  // One arrival later it still does not — the state in which a surface is most
  // tempted to say something about the connection.
  feed.push([observed("SPY", NEXT_MINUTE, 775.1, 0.56)], {
    SPY: observation(NEXT_MINUTE, 775.1),
  });
  await expect(cellOf(page, "SPY")).toContainText("775.10");
  const afterArrival = await proxies(page).innerText();
  for (const word of FORBIDDEN_IN_THE_STRIP) {
    expect(afterArrival).not.toContain(word);
  }

  await expectNothingFailedToRender(page);
});

test("the region says something when its subject never arrives", async ({
  page,
}) => {
  // **`EPIC.md`'s owner-by-condition, discharged for this route rather than
  // inherited.** *Nothing checks that a named region says something when its
  // subject is missing*, owned by **the next story that adds a region** — and
  // Task 4.2.5 met it in substance: `overview` is only ever written by an
  // overview frame, so a browser that never receives one had a heading, a
  // 1392×183 panel and **nothing in it**, permanently, while the six regions
  // below each explained what they were waiting for. The repair shipped; this
  // is the assertion it did not come with.
  //
  // Produced rather than simulated: the socket is answered with the snapshot
  // the gateway sends on connect and **no overview frame ever**, which is what
  // an unreachable aggregate, a proxy holding the socket open or a half-rolled
  // deploy looks like from here.
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: VENUE }),
    }),
  );

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
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  // The floor is `SAY_NOTHING_ARRIVED_AFTER_MS`, and it is deliberately an
  // order of magnitude above the slowest navigation Task 4.2.5 measured
  // (277 ms), so nobody meets this in ordinary use. The assertion waits it out
  // rather than reading the constant: what is owed is *a region that says
  // something*, not a particular timing.
  await expect(proxies(page)).toContainText("No prices yet.", {
    timeout: 8_000,
  });

  // **And the generalisation, on the route that now has one region with a
  // subject.** Every named region says something, in the state where the one
  // that could go silent has.
  const regions = page.getByRole("region");
  const count = await regions.count();
  expect(count).toBe(7);
  for (let index = 0; index < count; index += 1) {
    await expect(regions.nth(index)).not.toBeEmpty();
  }

  await expectNothingFailedToRender(page);
});
