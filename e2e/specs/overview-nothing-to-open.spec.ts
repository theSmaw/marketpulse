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

// **The states where there is nothing to open** (Task 4.6.5).
//
// ## The one query this file exists to run
//
// > Every `<a>` on `/` whose `href` matches `/securities/` has, as its
// > accessible name, exactly a ticker that
// > `movers ∪ figures ∪ sectors` — the sections of the frame the page was
// > sent — contains.
//
// That one clause refuses the two shipped non-symbols **by construction**:
// `RESERVED_SECTORS`' eleven sector **slugs** (`/securities/technology` × 11,
// on every first paint) and `withHeldRows`' **non-breaking-space pads**
// (`/securities/%C2%A0` × 10, in CI's permanent state, most of a weekend and
// the first minute of every session). It also refuses a label link, a figure
// link, and anything a later story hangs on this screen with a key that is not
// a ticker — and it does that **without a corpus**, which is the whole reason
// it is a browser query and not a grep. Task 4.6.4's first invariant was green
// on the exact defect it forbids because its corpus was four directories and
// *a new region is a new directory by this repository's own convention*; a
// query over the rendered page cannot have that failure mode, because the next
// author's region is on the page.
//
// ## Why every assertion here needs a browser
//
// `SectorPerformance.test.tsx` and `RankedList.test.tsx` carry the markup half
// at the component level, and they are the right level for it. What is only
// reachable here is (a) the whole page at once, which is what makes the query
// corpus-free, and (b) the **composition** of the region's order hold with the
// roving stop — a frame arriving while a reader's focus is inside a list and
// taking their row out of the answer. That is a socket, a decoder, a reducer
// and a React commit, and no `rerender` is the same event.
//
// ## The frames are produced here, with the shipped encoder
//
// `overview-ranked-keyboard.spec.ts`' rule for its reason: **CI's store is 518
// securities and zero bars**, so every sector figure there is `unknown` for
// ever and both mover lists are empty for ever. A spec that waited for a row
// to arrive would wait for ever; serving its own answer is what lets this
// assert over furnished states on a runner with no data at all — and a
// protocol change breaks it at the compiler rather than at an assertion.
//
// ## What this file does NOT assert
//
// The treatment, the geometry and any contrast ratio — `pnpm probe`'s and
// `overview-focus-ring.spec.ts`'. The tab-stop spine and the journey are Task
// 4.6.7's. And nothing here asserts a **figure**: every number on the page in
// these tests came out of this file.

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

const PROXIES: Ranked = [
  ["SPY", 0.42],
  ["QQQ", 0.71],
  ["DIA", 0.18],
  ["IWM", -0.33],
];

const SECTORS: Ranked = [
  ["XLK", 1.84],
  ["XLC", 0.96],
  ["XLY", 0.63],
  ["XLI", 0.41],
  ["XLF", 0.31],
  ["XLV", 0.12],
  ["XLB", 0],
  ["XLP", -0.18],
  ["XLE", -1.27],
];

/** The same nine after a minute in which energy ran — every row changes place. */
const SECTORS_RERANKED: Ranked = [
  ["XLE", 2.4],
  ["XLK", 1.85],
  ["XLC", 0.97],
  ["XLY", 0.64],
  ["XLI", 0.42],
  ["XLF", 0.32],
  ["XLV", 0.13],
  ["XLB", 0.01],
  ["XLP", -0.17],
];

/** Two sectors with nothing to rank, so the region's second list has members. */
const QUIET_SECTORS = ["XLU", "XLRE"];

const GAINERS: Ranked = [
  ["SMCI", 9.14],
  ["FSLR", 6.72],
  ["NVDA", 3.41],
  ["AMD", 2.18],
  ["TSLA", 1.05],
];

/**
 * **The same list a minute later with `NVDA` no longer in it** — which is the
 * composition defect's own state, at the measured rate: Story 4.5.7 recorded
 * **0.21–0.44 membership changes a minute** over three sessions, against an
 * order that the hold pins and a membership it deliberately does not.
 *
 * `META` is the newcomer and it outranks `AMD`, so `rowsInPinnedOrder` draws it
 * **above every row it beats** rather than at the bottom of the pinned block —
 * which puts it exactly where `NVDA` was, at rank 3.
 */
const GAINERS_WITHOUT_NVDA: Ranked = [
  ["SMCI", 9.14],
  ["FSLR", 6.72],
  ["META", 4.06],
  ["AMD", 2.18],
  ["TSLA", 1.05],
];

const LOSERS: Ranked = [
  ["MRNA", -8.37],
  ["PFE", -3.12],
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
  eligible: up.length + down.length === 0 ? 0 : 451,
  tracked: 503,
  windowMinutes: 5,
});

/** What a frame may carry, so each state below is one object literal. */
interface Furnishing {
  readonly sectors?: Ranked;
  readonly quiet?: readonly string[];
  readonly movers?: readonly [Ranked, Ranked];
}

const overviewOf = ({
  sectors,
  quiet = [],
  movers,
}: Furnishing): WireMarketOverview => ({
  computedAt: AT,
  feeds: [VENUE],
  figures: PROXIES.map(([symbol, percent]) => observed(symbol, percent)),
  ...(sectors === undefined
    ? {}
    : {
        sectors: [
          ...sectors.map(([symbol, percent]) => observed(symbol, percent)),
          ...quiet.map((symbol): WireOverviewFigure => ({
            state: "unknown",
            symbol,
          })),
        ],
        sectorLadderStep: 2 as const,
      }),
  breadth: FURNISHED_BREADTH,
  ...(movers === undefined ? {} : { movers: moversOf(movers[0], movers[1]) }),
});

/**
 * **Every ticker the frame named**, which is the right-hand side of the one
 * query — built from the same literals the frame was built from, so a link
 * naming something the page invented has nowhere to hide.
 */
const namedBy = ({ sectors, quiet = [], movers }: Furnishing): Set<string> =>
  new Set([
    ...PROXIES.map(([symbol]) => symbol),
    ...(sectors ?? []).map(([symbol]) => symbol),
    ...quiet,
    ...(movers?.[0] ?? []).map(([symbol]) => symbol),
    ...(movers?.[1] ?? []).map(([symbol]) => symbol),
  ]);

/** The furnished page: four proxies, nine ranked sectors, two quiet, two lists. */
const FURNISHED: Furnishing = {
  sectors: SECTORS,
  quiet: QUIET_SECTORS,
  movers: [GAINERS, LOSERS],
};

/**
 * Serve the market stream and **keep the socket**, so a test can send a frame
 * whenever it likes — and send **no overview frame at all** until it asks for
 * one, which is the first-paint state and the only way to reach it.
 */
async function serveOverview(
  page: Page,
  first?: Furnishing,
): Promise<(furnishing: Furnishing) => void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: VENUE }),
    }),
  );

  const frame = (furnishing: Furnishing): string =>
    encodeMarketStreamMessage({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: new Date().toISOString(),
      overview: overviewOf(furnishing),
    });

  let send: ((furnishing: Furnishing) => void) | null = null;
  let announce: (() => void) | null = null;
  const connected = new Promise<void>((resolve) => {
    announce = resolve;
  });

  // **Awaited before the navigation**, which is `overview-ranked-keyboard`'s
  // own note: an unawaited `routeWebSocket` may not be installed when the page
  // dials, and the page then talks to the real gateway — which on a
  // developer's machine renders a perfectly plausible list of the local
  // store's figures and leaves the test waiting for a socket it never
  // intercepted.
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
    if (first !== undefined) ws.send(frame(first));
    send = (furnishing) => {
      ws.send(frame(furnishing));
    };
    announce?.();
  });

  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await connected;

  return (furnishing) => {
    if (send === null) throw new Error("the market stream never connected");
    send(furnishing);
  };
}

const region = (page: Page, name: string): Locator =>
  page.getByRole("region", { name });

const listIn = (page: Page, region_: string, list: string): Locator =>
  region(page, region_).getByRole("list", { name: list });

/**
 * **Every security destination on the page, with the name a reader is given.**
 *
 * `textContent` rather than a computed accessible name, and that is sound here
 * for a reason this product already relies on: the ticker link's one piece of
 * text is the symbol span, and its only sibling is the arrival mark's slot,
 * which is `aria-hidden` and **empty**. The proxy strip's link is the same
 * shape. So a link whose text is not a bare ticker is exactly a link whose
 * accessible name is not one, and the failure message carries the href.
 */
const destinations = async (
  page: Page,
): Promise<readonly { readonly href: string; readonly name: string }[]> =>
  page.locator('a[href*="/securities/"]').evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href") ?? "",
      name: link.textContent.trim(),
    })),
  );

/** The ticker the page's focus is on, or what it is on instead. */
const focusedTicker = async (page: Page): Promise<string> =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (active === null) return "nothing";
    return active.getAttribute("data-ticker") ?? `<${active.localName}>`;
  });

/** The tickers of a list's links, in drawn order. */
const tickersIn = async (list: Locator): Promise<readonly string[]> =>
  list
    .locator("a[data-ticker]")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-ticker") ?? "?"),
    );

/** Which ticker in a list holds the stop — `tabindex="0"`, exactly one. */
const stopIn = async (list: Locator): Promise<readonly string[]> =>
  list
    .locator('a[tabindex="0"]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-ticker") ?? "?"),
    );

// 1440 × 900, the viewport every figure in this story's record was measured at.
test.use({ viewport: { width: 1440, height: 900 } });

test("the FIRST PAINT has nothing to open, and the eleven sector slugs are not among its links", async ({
  page,
}) => {
  // No `overview` frame has arrived: both ranked regions draw their
  // reservations, which are the **real components** holding the real geometry
  // invisibly. `visibility: hidden` and `aria-hidden` keep eleven reserved
  // sector rows off the screen and out of the accessibility tree and do
  // **nothing at all** to an `href` — which is why this state carried eleven
  // live links to addresses that are not securities for a fortnight, and why
  // no assertion anywhere in this repository saw them.
  await serveOverview(page);

  await expect(region(page, "Sector performance")).toBeVisible();
  expect(await destinations(page)).toEqual([]);

  // **By name**, because a count of zero does not say which eleven it is
  // counting, and the slug is what `securityPath(row.symbol)` builds from a
  // row whose symbol is a sector.
  const markup = await page.content();
  for (const slug of ["technology", "health_care", "financials"]) {
    expect(markup).not.toContain(`/securities/${slug}`);
  }

  await expectNothingFailedToRender(page);
});

test("a REFUSED section has nothing to open", async ({ page }) => {
  // A frame arrived carrying no sector section and no movers section — a
  // rollback pinning a previous image, which is the state both regions tell
  // apart from the first paint by the **frame** rather than by the section.
  // Each then says what it is waiting for, in words, and offers nothing.
  await serveOverview(page, {});

  await expect(
    region(page, "Sector performance").getByText(/Eleven sector benchmark/u),
  ).toBeVisible();
  await expect(
    region(page, "Movers").getByText(/The largest moves among the companies/u),
  ).toBeVisible();

  // The proxy strip has its four, from the same frame — so this asserts that a
  // refused section offers nothing rather than that the page is empty.
  expect((await destinations(page)).map(({ name }) => name).sort()).toEqual([
    "DIA",
    "IWM",
    "QQQ",
    "SPY",
  ]);

  await expectNothingFailedToRender(page);
});

test("both mover lists EMPTY is CI's permanent state: ten pads, nothing to open, and no %C2%A0", async ({
  page,
}) => {
  // 518 securities and zero bars means `eligible: 0` and two empty lists for
  // ever on every gated machine. The region draws it rather than reserving
  // itself invisibly: ten held rows of geometry and two headings, each `<ol>`
  // reporting **0 items** rather than 5, because the padding is room and must
  // not become a claim about how many names were ranked.
  await serveOverview(page, { sectors: SECTORS, movers: [[], []] });

  const gainers = listIn(page, "Movers", "Gainers");
  await expect(gainers.locator("li")).toHaveCount(5);
  await expect(gainers.getByRole("listitem")).toHaveCount(0);
  await expect(region(page, "Movers").getByRole("link")).toHaveCount(0);

  // A pad's symbol is a **run** of non-breaking spaces, one per slot, so it is
  // unique as a React key and invisible on screen. A naive
  // `securityPath(row.symbol)` turns each into `/securities/%C2%A0`.
  const markup = await page.content();
  expect(markup).not.toContain("/securities/%C2%A0");
  expect(markup).not.toContain("/securities/ ");

  await expectNothingFailedToRender(page);
});

test("EVERY security link on the page names a ticker the frame carried", async ({
  page,
}) => {
  // **The one query, over the state that has the most links in it**: four
  // proxies, nine ranked sectors, two quiet sectors and seven mover rows,
  // with three pads among them. Nothing about it is scoped to a region, a
  // component or a directory, which is the property that makes it hold for a
  // region a later story adds.
  await serveOverview(page, FURNISHED);

  const gainers = listIn(page, "Movers", "Gainers");
  await expect(gainers.getByRole("link")).toHaveCount(5);

  const allowed = namedBy(FURNISHED);
  const found = await destinations(page);

  /*
   * **The clause first and the count second, which is the order the defect
   * reads in.** With the count leading, a stranger's bad link fails as
   * `Expected length: 22, Received length: 23` — true, and it says nothing
   * about which link or why. Produced: a `<Link to={securityPath("advancing")}>`
   * written into `BreadthLedger.tsx`, a fifth surface in neither ranked
   * directory, as the file the next region's author writes.
   */
  for (const { href, name } of found) {
    // The name is exactly a ticker the frame named — which refuses a slug, a
    // pad, a label link and a figure link in one clause.
    expect(
      allowed.has(name),
      `${href} is named ${JSON.stringify(name)}, which the frame never sent`,
    ).toBe(true);
    // And the address is built from that same name, so a row cannot draw one
    // ticker and point at another — the permutation defect, one axis over.
    expect(href).toBe(`/securities/${name}`);
  }

  // And the count, which is the clause's mirror: the one above refuses a link
  // the frame never licensed, and this refuses a licensed row that quietly
  // stopped being a destination. 4 proxies + 9 ranked sectors + 2 quiet
  // sectors + 5 gainers + 2 losers.
  expect(found).toHaveLength(22);

  await expectNothingFailedToRender(page);
});

test("a focused row whose security LEAVES the list does not drop focus to the body", async ({
  page,
}) => {
  // **The composition defect, and it is two correct decisions meeting.** The
  // region's hold pins the **order**; Story 4.5.7 deliberately left the
  // **membership** moving under it, because a pinned membership lets the
  // region keep naming a security the producer has stopped selecting while
  // every figure on the row updates — ADR 0029's licence, expired. So the
  // `<li>` under a reader's hands unmounts, and what shipping nothing does is
  // drop focus to `<body>`: the document's tab order restarts at the top and
  // the reader's next press is six regions from where they were reading.
  const send = await serveOverview(page, FURNISHED);

  const gainers = listIn(page, "Movers", "Gainers");
  expect(await tickersIn(gainers)).toEqual([
    "SMCI",
    "FSLR",
    "NVDA",
    "AMD",
    "TSLA",
  ]);

  // Rank 3 of five, and focus **stays inside the list** — which is the whole
  // difference from `overview-ranked-keyboard`'s re-order case, where focus
  // has to leave because the hold pins the order while it is there. The hold
  // does not pin membership, so this state is reachable with the reader's
  // hands still on the row.
  await gainers.getByRole("link", { name: "NVDA" }).focus();
  expect(await focusedTicker(page)).toBe("NVDA");

  send({ sectors: SECTORS, movers: [GAINERS_WITHOUT_NVDA, LOSERS] });
  await expect(gainers.getByRole("link", { name: "NVDA" })).toHaveCount(0);

  // **The row now at that rank**, in the order the hold draws: `META` is a
  // newcomer that outranks `AMD`, so it lands where `NVDA` was rather than at
  // the bottom of the pinned block. Focus is never lost, no claim is made that
  // the reader's security is still a mover, and nothing was activated.
  expect(await tickersIn(gainers)).toEqual([
    "SMCI",
    "FSLR",
    "META",
    "AMD",
    "TSLA",
  ]);
  expect(await focusedTicker(page)).toBe("META");

  // And the stop agrees with where focus actually went — one `tabindex="0"`,
  // on the row the reader is standing on — so tabbing out and back returns
  // here rather than to the top of the list.
  expect(await stopIn(gainers)).toEqual(["META"]);

  // The arrows work from where focus was put, in the order on screen.
  await page.keyboard.press("ArrowUp");
  expect(await focusedTicker(page)).toBe("FSLR");

  await expectNothingFailedToRender(page);
});

test("when a list runs out of real rows, focus lands on the REGION rather than the body", async ({
  page,
}) => {
  // The second of the three states the one mechanism discharges, and it is the
  // one CI is permanently in: a list with nothing left to stand on. The region
  // a reader chose is still the right place for them to be — `Region` makes
  // the section focusable because it scrolls, so there is already a stop
  // there.
  const send = await serveOverview(page, FURNISHED);

  const gainers = listIn(page, "Movers", "Gainers");
  await gainers.getByRole("link", { name: "AMD" }).focus();

  send({ sectors: SECTORS, movers: [[], LOSERS] });
  await expect(gainers.getByRole("link")).toHaveCount(0);

  expect(
    await region(page, "Movers").evaluate(
      (section) => section === document.activeElement,
    ),
  ).toBe(true);

  await expectNothingFailedToRender(page);
});

test("the UN-PINNABLE hold state is reached by keyboard, and the stop agrees with where focus went", async ({
  page,
}) => {
  // `use-order-hold.ts` documents this state as *a reader whose pointer is
  // already resting over the region before the first frame arrives*: there is
  // nothing drawn to pin, so `pinned` stays absent and there is no hold.
  // **Tabbing in during the same window has the identical outcome and nothing
  // said so** — the region is a reserved panel, its section is the stop, and
  // `latest.current` is empty.
  const send = await serveOverview(page);

  const sectors = region(page, "Sector performance");

  // **By keyboard**, which is the point of the state: Tab until the region's
  // own section is where focus is. Bounded, so a tab order that stops
  // reaching it fails rather than hangs.
  let reached = false;
  for (let press = 0; press < 40 && !reached; press += 1) {
    await page.keyboard.press("Tab");
    reached = await sectors.evaluate(
      (section) => section === document.activeElement,
    );
  }
  expect(reached, "Tab never reached the Sector performance section").toBe(
    true,
  );

  // The badge and the hold are **one value** (`pinned !== undefined`), so a
  // region that says nothing is a region that is holding nothing. There is no
  // state in which the head claims an order it is not keeping.
  send({ sectors: SECTORS, quiet: QUIET_SECTORS });
  const ranked = listIn(
    page,
    "Sector performance",
    "Sectors ranked by today’s move",
  );
  expect(await tickersIn(ranked)).toEqual([
    "XLK",
    "XLC",
    "XLY",
    "XLI",
    "XLF",
    "XLV",
    "XLB",
    "XLP",
    "XLE",
  ]);
  await expect(sectors.getByText(/Order held/iu)).toHaveCount(0);

  // **The list then DOES re-order under a keyboard reader**, because nothing
  // was pinned. That is the honest outcome rather than a defect: the region
  // makes no claim it is not keeping.
  send({ sectors: SECTORS_RERANKED, quiet: QUIET_SECTORS });
  await expect(ranked.locator("a[data-ticker]").first()).toHaveAttribute(
    "data-ticker",
    "XLE",
  );
  await expect(sectors.getByText(/Order held/iu)).toHaveCount(0);

  // And the symbol-keyed stop **agrees with where focus actually goes**. The
  // reader has never been in the list, so there is no remembered symbol and
  // the stop falls to the first real row — which is the row the next press of
  // Tab lands on, in the order now on screen. The two cannot disagree,
  // because one is derived and the other is where the browser put the caret.
  expect(await stopIn(ranked)).toEqual(["XLE"]);
  await page.keyboard.press("Tab");
  expect(await focusedTicker(page)).toBe("XLE");

  await expectNothingFailedToRender(page);
});

test("Enter on a region's section does NOTHING", async ({ page }) => {
  // No *activate the first row* shortcut. A container that navigates on
  // `Enter` is an undiscoverable navigation from an element whose only job is
  // to be a scrollport's keyboard stop — nothing announces it, nothing draws
  // it, and a reader who finds it once cannot tell which row they will get.
  await serveOverview(page, FURNISHED);

  const movers = region(page, "Movers");
  await movers.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/$/u);
  expect(
    await movers.evaluate((section) => section === document.activeElement),
  ).toBe(true);

  await expectNothingFailedToRender(page);
});
