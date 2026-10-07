import {
  MARKET_STREAM_PROTOCOL_VERSION,
  SECTORS,
  SECTOR_ETFS,
  decodeMarketStreamClientMessage,
  decodeMarketStreamMessage,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  MarketFeed,
  SectorLadderStep,
  WireFeedState,
  WireMarketOverview,
  WireObservation,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page, WebSocketRoute } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// **The two things about this frame that no other spec can see** (Task 4.4.1).
//
// Both are defects found by shaping Story 4.4 rather than by any check, and
// both were invisible at every level this repository runs — including to the
// four existing overview specs, for one reason each.
//
// ## 1. The landing page asked for the four proxies and drew eleven sectors
//
// `MarketOverview.tsx` built its subscription from `overview.figures` alone;
// the eleven sector benchmarks ride in `overview.sectors`; and the gateway
// scopes **both** `bars` and `snapshot` to what a client asked for
// (`if (!wanted.has(…)) continue`, `market-gateway.ts`). So
// `observations.get("XLK")` was permanently `undefined` and the arrival mark
// Story 4.3 designed, drew, tested and shipped **could never fire on the
// deployed page**.
//
// Nothing below a browser could see it: `sector-performance.test.ts` hands
// `sectorPerformance` an observations map directly, and
// `overview-sector-region.spec.ts` furnishes its own frames — a harness that
// serves a sector observation nobody asked for is serving a frame the gateway
// cannot emit, and the browser then draws a mark that production never gets.
// That is the furnished-fixture hazard one layer below where Task 4.3.8 caught
// it.
//
// So the second test below **honours the subscription**, as the gateway does:
// `push` refuses to send an observation for a symbol the page has not asked
// for, which is `overview-proxy-live-update.spec.ts`' narrowness rule enforced
// rather than remembered. Against the shipped defect this test does not fail an
// assertion — it fails on the harness refusing to manufacture an impossible
// frame, which is the stronger statement.
//
// ## 2. `figures` was the complement of the sector set, not the proxy set
//
// `index.ts` split the join's answer with
// `entries.filter((entry) => !isSectorSymbol.has(entry.symbol))`. True of
// exactly the four index proxies while the join is handed fifteen symbols, and
// true of **every non-sector security** the moment Story 4.4's breadth count
// widens it to 503 equities: hundreds of cells in a strip built for four, a
// ~56 KB frame, and `market-proxies.ts`' five folds over 507 entries. No
// compile error, no failing test, every individual number on screen correct.
//
// A furnished frame **cannot** see that, because a spec that writes its own
// `figures` array writes the very thing under test. So the first test is a
// **pass-through** — `overview-sector-ranking.spec.ts`' shape — and what it
// asserts is what **this product's own server** put on the wire.
//
// ## What a green run here does not certify
//
// The first test says nothing about where the numbers came from: on CI all
// fifteen figures are `unknown` for ever (518 securities, zero bars) and the
// assertion is about the **sections**, which is a claim the all-`unknown` state
// answers in full. The second test says everything about what the browser does
// with a sector arrival and nothing about whether one arrives.

const OVERVIEW = "/";

/**
 * **The four, written out rather than imported.**
 *
 * `indexProxyTickers()` lives in `apps/backend/src/universe.ts`, which this
 * package cannot reach — but even if it could, importing it would make this
 * spec agree with the producer by construction. The same rule
 * `overview-sector-ranking.spec.ts` applies to the formatter and the ranking
 * key: this is the independent statement of what the strip is for, so **if a
 * fifth index proxy is ever tracked, this number is supposed to need
 * changing** — and whoever changes it has to look at `market-proxies.ts`' five
 * folds while they are here.
 *
 * `PRODUCT_SPEC.md` §6 is the authority; the order is not asserted anywhere
 * below, only the membership.
 */
const PROXIES = ["SPY", "QQQ", "DIA", "IWM"] as const;

/** The eleven benchmarks, derived — `one-pairing-of-a-sector-and-its-benchmark`. */
const SECTOR_BENCHMARKS: readonly string[] = SECTORS.map(
  (sector) => SECTOR_ETFS[sector] as string,
);

/** The one venue value — `overview-proxy-live-update.spec.ts`' rule. */
const VENUE: MarketFeed = "iex";

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: VENUE,
  marketOpen: true,
};

/** 14:01 and 14:02 ET on a Wednesday, so no extended-hours word anywhere. */
const FIRST_MINUTE = "2026-09-16T18:01:00Z";
const NEXT_MINUTE = "2026-09-16T18:02:00Z";

// ------------------------------------------------------ the pass-through half

/**
 * Open the landing page through a **pass-through** market-stream route, and
 * return both halves of the conversation the real gateway had.
 *
 * Nothing is manufactured. `ws.connectToServer()` dials the real gateway;
 * `server.onMessage` and `ws.onMessage` turn off Playwright's automatic
 * forwarding in each direction, so both forwards are explicit and verbatim and
 * this route's only effect is that somebody wrote the frames down.
 *
 * **Both directions are recorded, which is what `overview-sector-ranking.spec.ts`
 * does not need and this does**: the subscription the page sends is the one
 * fact that says whether the sector benchmarks reach the gateway at all, and it
 * is a claim about the *client* that only the real server's frame can set up.
 *
 * **Installed before `goto` and awaited** — this suite's standing rule for both
 * kinds of route. A connection already made cannot be intercepted, and an
 * unawaited `routeWebSocket` leaves the page talking to the gateway directly,
 * which looks identical on screen and leaves both lists empty.
 */
async function openWithRecordedStream(page: Page): Promise<{
  readonly overviews: readonly WireMarketOverview[];
  readonly subscriptions: readonly (readonly string[])[];
}> {
  const overviews: WireMarketOverview[] = [];
  const subscriptions: (readonly string[])[] = [];

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    const server = ws.connectToServer();

    server.onMessage((raw) => {
      const frame = String(raw);

      // Read with the **shipped decoder**, so a protocol change breaks this at
      // the compiler rather than at an assertion.
      const decoded = decodeMarketStreamMessage(frame);
      if (decoded.kind === "message" && decoded.message.type === "overview") {
        overviews.push(decoded.message.overview);
      }

      ws.send(raw);
    });

    ws.onMessage((raw) => {
      const decoded = decodeMarketStreamClientMessage(String(raw));
      if (decoded.kind === "message" && decoded.message !== undefined) {
        subscriptions.push(decoded.message.symbols);
      }

      server.send(raw);
    });
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  return { overviews, subscriptions };
}

/** The last overview frame that carried a figures section, or `undefined`. */
const latest = (
  overviews: readonly WireMarketOverview[],
): WireMarketOverview | undefined =>
  overviews.reduce<WireMarketOverview | undefined>(
    (carried, overview) =>
      overview.sectors === undefined ? carried : overview,
    undefined,
  );

// ---------------------------------------------------------- the driven half

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

/** The eleven, already ranked — `rankSectorFigures` runs server-side. */
const RANKED_SECTORS: readonly (readonly [string, number])[] = [
  ["XLK", 1.84],
  ["XLC", 0.96],
  ["XLY", 0.63],
  ["XLI", 0.41],
  ["XLF", 0.31],
  ["XLV", 0.12],
  ["XLB", 0.05],
  ["XLP", -0.18],
  ["XLU", -0.44],
  ["XLRE", -0.87],
  ["XLE", -1.27],
];

const SECTOR_STEP: SectorLadderStep = 2;

interface ServedOverview {
  /**
   * A burst, in the gateway's own order: the aggregate, then the scoped
   * observations.
   *
   * **It refuses a symbol the page has not subscribed to**, which is the whole
   * point of this spec. `scopedTo` cannot emit one, so a mark produced from one
   * would be a finding about nothing — and against the defect this task
   * repaired, that refusal is what fails.
   */
  readonly push: (
    observations: Readonly<Record<string, WireObservation>>,
  ) => void;
}

/**
 * Serve the market stream from the test, answering `subscribe` as the gateway
 * does — the two-snapshot sequence, and `bars` scoped to the subscription.
 *
 * A local harness rather than an extension of `support/feed.ts`, for
 * `overview-proxy-live-update.spec.ts`' reason: this needs the gateway's real
 * connect sequence, and it is the first spec that needs **both sections** on
 * the aggregate.
 */
async function serveBothSections(page: Page): Promise<ServedOverview> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: VENUE }),
    }),
  );

  const figures = PROXIES.map((symbol, index) =>
    observed(symbol, FIRST_MINUTE, 100 + index, 0.5 + index / 100),
  );
  const sectors = RANKED_SECTORS.map(([symbol, percent]) =>
    observed(symbol, FIRST_MINUTE, 100, percent),
  );

  const overview: WireMarketOverview = {
    computedAt: FIRST_MINUTE,
    feeds: [VENUE],
    figures,
    sectors,
    sectorLadderStep: SECTOR_STEP,
  };

  const overviewFrame = (): string =>
    encodeMarketStreamMessage({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: new Date().toISOString(),
      overview,
    });

  const snapshotFrame = (): string =>
    encodeMarketStreamMessage({
      type: "snapshot",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: new Date().toISOString(),
      // **Structurally empty, in both snapshots.** A snapshot sets the arrival
      // mark's baseline rather than firing it (`arrivalKey`), so anything in
      // here would suppress the very mark under test — and an empty one is the
      // honest answer for a store with no bars, which is CI's.
      observations: {},
      feed: LIVE_FEED,
    });

  let socket: WebSocketRoute | undefined;
  let subscribed = new Set<string>();

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    socket = ws;
    subscribed = new Set();

    ws.send(snapshotFrame());
    ws.send(overviewFrame());

    ws.onMessage((raw) => {
      const decoded = decodeMarketStreamClientMessage(String(raw));
      if (decoded.kind !== "message" || decoded.message === undefined) return;

      subscribed = new Set(decoded.message.symbols);
      ws.send(snapshotFrame());
      ws.send(overviewFrame());
    });
  });

  return {
    push: (observations) => {
      for (const symbol of Object.keys(observations)) {
        if (!subscribed.has(symbol)) {
          throw new Error(
            `the page has not subscribed to ${symbol} — it asked for ` +
              `${[...subscribed].sort().join(", ") || "nothing"}. The ` +
              "gateway scopes `bars` to the subscription, so this frame is " +
              "one the server could not have sent and the mark it would " +
              "produce is a finding about nothing.",
          );
        }
      }

      socket?.send(overviewFrame());
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

const sectorRegion = (page: Page): Locator =>
  page.getByRole("region", { name: "Sector performance" });

/**
 * One sector's row, reached through the ticker it prints.
 *
 * A plain substring rather than a word-boundary pattern, and that was
 * **measured**: a row's `innerText` runs its parts together as
 * `1TechnologyXLK+1.84%`, so `\bXLK\b` matches nothing — produced on the first
 * run of this spec, 0 elements against 11 rows on screen. The eleven tickers
 * are not substrings of one another, so a substring is unambiguous here.
 */
const sectorRow = (page: Page, symbol: string): Locator =>
  sectorRegion(page).getByRole("listitem").filter({ hasText: symbol });

/**
 * The arrival mark inside a row, if one is rendered.
 *
 * `[data-arrival]` rather than a class: `RankedList` renders the element only
 * when `arrival` is defined and keys it on the observation's identity, so the
 * attribute's **presence** is the fact and its **value** is which observation
 * fired it. The element is `aria-hidden`, so it is unreachable by role and
 * invisible to axe — this is the one place a CSS attribute selector is the
 * honest locator.
 */
const markIn = (row: Locator): Locator => row.locator("[data-arrival]");

// 1440 × 900, the viewport this story's figures were measured at. Nothing here
// asserts a box; it is stated so a failure's screenshot is comparable.
test.use({ viewport: { width: 1440, height: 900 } });

test("the frame this product's own server sends carries exactly the four index proxies in `figures`, and the sectors in their own section", async ({
  page,
}) => {
  /*
   * **The guard for the thing that has no symptom yet.** Today the join is
   * handed fifteen symbols and a complement of the sector set is observationally
   * identical to the proxy set — so this assertion is green under both the
   * defect and the repair, and it is written **now** because Task 4.4.4 widens
   * the join to 503 equities and the complement then puts all of them here.
   *
   * `each-overview-section-names-its-own-set` is the half that is red today;
   * this is the half that is red the day the flood is real, and it needs the
   * real server because a furnished `figures` array is the thing under test.
   */
  const { overviews, subscriptions } = await openWithRecordedStream(page);

  // **The positive state, waited for before anything is read**: a recorded
  // frame carrying both sections, which is what says the server has answered
  // rather than that this list is empty. Reading early is the shape both of
  // this suite's characterised flakes have.
  await expect
    .poll(() => latest(overviews)?.sectors?.length ?? 0)
    .toBe(SECTOR_BENCHMARKS.length);

  const frame = latest(overviews);
  const figures = (frame?.figures ?? []).map((figure) => figure.symbol);
  const sectors = (frame?.sectors ?? []).map((figure) => figure.symbol);

  // **Exactly four, and exactly those four.** Three separate failures that
  // fail differently: the strip flooded with the rest of the universe, a
  // benchmark leaking across the split, and a proxy lost.
  expect(figures).toHaveLength(PROXIES.length);
  expect([...figures].sort()).toEqual([...PROXIES].sort());

  // And the two sections are disjoint, which is the other direction of the
  // same claim — a section defined positively cannot contain the other's
  // members, and a section defined as a complement contains everything.
  expect(
    sectors.filter((symbol) => (PROXIES as readonly string[]).includes(symbol)),
  ).toEqual([]);
  expect(
    figures.filter((symbol) => SECTOR_BENCHMARKS.includes(symbol)),
  ).toEqual([]);

  // **And the page asked the real gateway for all fifteen.** This is defect 1
  // stated against the server rather than against a stub: the subscription is
  // built from the frame above, and a route that drew eleven sector rows while
  // asking for four symbols is exactly what shipped.
  await expect
    .poll(() => [...new Set(subscriptions.flat())].sort().join(","))
    .toBe([...PROXIES, ...SECTOR_BENCHMARKS].sort().join(","));

  await expectNothingFailedToRender(page);
});

test("a sector's arrival mark fires when a bar arrives for it — which it could not, while the page subscribed to the proxies alone", async ({
  page,
}) => {
  const served = await serveBothSections(page);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  await expect(sectorRegion(page).getByRole("listitem")).toHaveCount(
    RANKED_SECTORS.length,
  );

  const row = sectorRow(page, "XLK");
  await expect(row).toHaveCount(1);

  // **Nothing is marked from a snapshot.** `arrivalKey` returns `undefined` for
  // an observation delivered as *what we already hold*, so the baseline is a
  // row with no mark — and asserting it first is what stops a mark that was
  // always there from reading as one that fired.
  await expect(markIn(row)).toHaveCount(0);

  // **The burst.** `push` throws if the page has not subscribed to XLK, which
  // is what this test is really about: against the shipped defect the
  // subscription is `DIA, IWM, QQQ, SPY` and the harness refuses to send a
  // frame the gateway could not have sent.
  served.push({ XLK: observation(NEXT_MINUTE, 101) });

  // The mark, which exists only while it is decaying — asserted on presence
  // rather than on any duration, which is this suite's rule.
  await expect(markIn(row)).toHaveCount(1);

  // And it is **this** observation's mark, not a leftover: the attribute's
  // value is the observation's own identity, so a bar for a different minute or
  // a revision of this one changes it. The instant is parsed here rather than
  // the whole identity written out — the identity's format is
  // `observationIdentity`'s and spelling it would make this spec agree with the
  // application by construction.
  await expect(markIn(row)).toHaveAttribute(
    "data-arrival",
    new RegExp(`^${String(Date.parse(NEXT_MINUTE))}:`, "u"),
  );

  // **And no other sector is marked**, which is the scoping working in the
  // direction nobody checks: a subscription widened to fifteen must not make
  // one bar mark eleven rows.
  await expect(sectorRegion(page).locator("[data-arrival]")).toHaveCount(1);

  await expectNothingFailedToRender(page);
});
