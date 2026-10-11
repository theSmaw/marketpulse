import type {
  WireMarketBreadth,
  WireMarketMovers,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";

// **The twenty ranked ticker stops, when the aggregate under them goes away**
// (Task 4.7.6).
//
// ## The decision this extends, in ADR 0039's own words
//
// > It was never *does this region scroll*. It is **can a tab stop appear and
// > disappear under a reader**, and the answer must be no.
//
// That ADR's own **rejected** alternative — making a region's stop conditional
// on its content being focusable — was rejected because a stop that comes and
// goes drops a focused reader to `<body>` *on a timer nobody controls*. The
// seven region stops satisfy the rule. **The twenty ranked ticker stops are
// exactly the shape it rejected**, and nobody considered it there: a row's
// anchor exists because an aggregate selected that security, and every
// degradation this story produces unselects all of them at once.
//
// ## What is driven, and why it is a reconnect rather than a second frame
//
// `serveFeed`'s `overviewOnReconnect` (Task 4.7.1) answers the page's **own**
// retry with a deliberately poorer aggregate, which is the transition a
// restarted replica performs on every deploy mid-session — Task 4.7.3 traced
// it with `docs/GAPS.md` entry 8's figures and could not repair it with a memo,
// because a 46-second-old process has neither a last broadcast nor a market
// state. So this is the **deploy** state rather than the outage state, and
// since Task 4.7.3 a plain reconnect no longer empties anything.
//
// It keys on `drop()` rather than on a connection count, which is Task 4.7.1's
// own finding: a cold page opens more than one socket before anything is
// dropped (`StrictMode`'s open/close pair), so a count serves the poorer
// aggregate on the **first paint** and draws a plausible wrong screen.
//
// ## Where focus went, not what the DOM contains
//
// Every assertion here reads `document.activeElement`. A page whose rows have
// unmounted and whose focus is on `<body>` and a page whose rows have unmounted
// and whose focus was caught are the **same DOM**; the difference is a fact
// about where a browser's focus went, which nothing below `pnpm e2e` can see —
// jsdom has no layout, no scrollport and no focus ring, and `RankedList`'s own
// component tests reach only the hook that owns one of the two mechanisms here.
//
// ## The plant, per channel
//
// Task 4.8.10's rule: **a produced state whose producer went quiet looks
// identical to a state drawn correctly.** A reconnect that was never answered
// with an aggregate leaves the rows exactly where they were — so every arm
// reads `overviews()` either side and asserts it **grew**, never an absolute,
// because of the `StrictMode` pair above.

const OVERVIEW = "/";

const AT = "2026-09-16T18:01:00Z";

/** `[symbol, percent]`, which is every figure these frames carry. */
type Ranked = readonly (readonly [string, number])[];

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

const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

const PROXIES: Ranked = [
  ["SPY", 0.42],
  ["QQQ", 0.61],
  ["DIA", 0.18],
  ["IWM", -0.07],
];

const SECTORS: Ranked = [
  ["XLK", 1.85],
  ["XLC", 0.97],
  ["XLY", 0.64],
  ["XLI", 0.42],
  ["XLF", 0.32],
  ["XLV", 0.13],
  ["XLB", 0.01],
  ["XLP", -0.17],
  ["XLE", -0.94],
];

/** The two that have nothing to rank in the rich frame. */
const QUIET_SECTORS = ["XLU", "XLRE"];

const ALL_SECTORS = [...SECTORS.map(([symbol]) => symbol), ...QUIET_SECTORS];

const GAINERS: Ranked = [
  ["SMCI", 9.14],
  ["FSLR", 6.72],
  ["NVDA", 3.41],
  ["AMD", 2.18],
  ["TSLA", 1.05],
];

const LOSERS: Ranked = [
  ["MRNA", -8.37],
  ["PFE", -3.12],
];

/**
 * **The same five gainers in a different order and with the same
 * membership** — so the only thing that can move the list is the hold, never a
 * row arriving or leaving.
 *
 * That separation is what makes the arrow-press measurement mean anything:
 * `rowsInPinnedOrder` places an unpinned newcomer by its live rank, so a frame
 * that changed the membership too would re-order for a reason that is not the
 * pin.
 */
const GAINERS_RESHUFFLED: Ranked = [
  ["TSLA", 11.05],
  ["AMD", 8.18],
  ["NVDA", 3.41],
  ["FSLR", 2.72],
  ["SMCI", 1.14],
];

/** One gainer left — a degraded frame a reader can still stand in. */
const ONE_GAINER: Ranked = [["SMCI", 9.14]];

const moversOf = (up: Ranked, down: Ranked): WireMarketMovers => ({
  basis: "observed",
  gainers: up.map(([symbol, percent]) => observed(symbol, percent)),
  losers: down.map(([symbol, percent]) => observed(symbol, percent)),
  // Large enough that the selection cannot exceed it (`readMovers` check 1)
  // and no larger than `tracked` (check 2) — and **zero** when nothing was
  // rankable, which is the whole subject here and is CI's permanent state.
  eligible: up.length + down.length === 0 ? 0 : 451,
  tracked: 503,
  windowMinutes: 5,
});

const BREADTH: WireMarketBreadth = {
  basis: "observed",
  advancing: 284,
  declining: 152,
  unchanged: 15,
  measured: 451,
  tracked: 503,
  windowMinutes: 5,
};

/** Breadth over an empty eligibility window: `measured: 0`, and it sums. */
const BREADTH_OF_NOTHING: WireMarketBreadth = {
  basis: "observed",
  advancing: 0,
  declining: 0,
  unchanged: 0,
  measured: 0,
  tracked: 503,
  windowMinutes: 5,
};

/** What a healthy gateway mid-session sends: every region furnished. */
const RICH: WireMarketOverview = {
  computedAt: AT,
  observedAt: AT,
  feeds: ["iex"],
  figures: PROXIES.map(([symbol, percent]) => observed(symbol, percent)),
  sectors: [
    ...SECTORS.map(([symbol, percent]) => observed(symbol, percent)),
    ...QUIET_SECTORS.map(unknown),
  ],
  sectorLadderStep: 2,
  breadth: BREADTH,
  movers: moversOf(GAINERS, LOSERS),
};

/**
 * **What a 46-second-old replica builds**: every section present, every section
 * empty.
 *
 * `observedAt` is **absent** rather than `undefined` — `exactOptionalProperty
 * Types` is on and an aggregate holding no observation has no instant, which is
 * Task 4.8.12's rule and CI's permanent state.
 */
const HEARD_NOTHING: WireMarketOverview = {
  computedAt: AT,
  feeds: [],
  figures: PROXIES.map(([symbol]) => unknown(symbol)),
  sectors: ALL_SECTORS.map(unknown),
  sectorLadderStep: 2,
  breadth: BREADTH_OF_NOTHING,
  movers: moversOf([], []),
};

/**
 * **The rollback shape: a frame with no movers section at all.**
 *
 * Labelled furnished-in-reverse at the call site, per `ProducedFeed
 * .sendOverview`'s rule — `WireMarketOverviewInputs.movers` is non-optional, so
 * no *producer* can build this. **The read side can**, which is why it is not
 * only a rollback: `market-stream-protocol.ts`' `readOverview` says in as many
 * words that *"an unreadable one is the same absence rather than a discarded
 * frame carrying four true prices"*, so any movers section that fails
 * `readMovers`' internal-consistency checks reaches `MarketOverview` as this
 * exact state, from a gateway that is perfectly healthy.
 */
const ROLLBACK: WireMarketOverview = {
  computedAt: AT,
  feeds: [],
  figures: PROXIES.map(([symbol]) => unknown(symbol)),
  breadth: BREADTH_OF_NOTHING,
};

const region = (page: Page, name: string): Locator =>
  page.getByRole("region", { name });

const listIn = (page: Page, region_: string, list: string): Locator =>
  region(page, region_).getByRole("list", { name: list });

/**
 * **Where the page's focus actually is**, in one string, so a failure says it.
 *
 * `row:NVDA` for a ticker stop, `section:Movers` for a region's own stop and
 * `<body>` for the state every assertion here exists to refuse — which is the
 * spelling `overview-nothing-to-open.spec.ts`' own transcript used when it
 * produced this defect one row at a time.
 */
const focusedWhere = async (page: Page): Promise<string> =>
  page.evaluate(() => {
    const active = document.activeElement;
    if (active === null) return "nothing";
    const ticker = active.getAttribute("data-ticker");
    if (ticker !== null) return `row:${ticker}`;
    if (active === document.body) return "<body>";
    if (active.localName === "section") {
      const id = active.getAttribute("aria-labelledby") ?? "";
      const label = document.getElementById(id)?.textContent.trim() ?? "?";
      return `section:${label}`;
    }
    return `<${active.localName}>`;
  });

/** The tickers of a list's links, in drawn order. */
const tickersIn = async (list: Locator): Promise<readonly string[]> =>
  list
    .locator("a[data-ticker]")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("data-ticker") ?? "?"),
    );

const heldBadges = (page: Page, name: string): Locator =>
  region(page, name).getByText(/Order held/iu);

// 1440 × 900, the viewport this story's figures are taken at.
test.use({ viewport: { width: 1440, height: 900 } });

test("a reader on a MOVER row when the aggregate empties keeps a focus position that is not the body", async ({
  page,
}) => {
  const feed = await serveFeed(page, {
    overview: RICH,
    overviewOnReconnect: HEARD_NOTHING,
  });
  await page.goto(OVERVIEW);

  const gainers = listIn(page, "Movers", "Gainers");
  await expect(gainers.getByRole("link", { name: "NVDA" })).toBeVisible();
  await gainers.getByRole("link", { name: "NVDA" }).focus();
  expect(await focusedWhere(page)).toBe("row:NVDA");

  // The page's own retry is answered with the poorer aggregate — nothing here
  // reloads and nothing reaches into a component.
  const served = feed.overviews();
  feed.drop();
  await expect
    .poll(() => feed.overviews(), { timeout: 20_000 })
    .toBeGreaterThan(served);
  await expect(gainers.getByRole("link")).toHaveCount(0);

  // **Task 4.6.5's recovery covers the whole-list empty**, and this is the
  // answer to that question produced rather than reasoned: the third of its
  // three states — *the list ran out of real rows* — fires, and focus is on
  // the region's own `<section>`, which ADR 0039 keeps a stop in every state.
  expect(await focusedWhere(page)).toBe("section:Movers");

  // And the row pitch is still held, which is why the `<ol>` is still there to
  // have been asked: five `<li>` and no link, `withHeldRows`' pads.
  await expect(gainers.locator("li")).toHaveCount(5);

  await expectNothingFailedToRender(page);
});

test("a reader on a ranked SECTOR row keeps one too, even though the whole ordered list detaches", async ({
  page,
}) => {
  // The harder half of the same question, and the reason `useRovingStop`
  // captures the `<section>` at **focus** time rather than finding it at
  // recovery time: `RankedList` draws **no `<ol>` at all** when nothing is
  // ranked, so by the time the last ranked sector leaves, the list element is
  // already detached and `closest()` on a detached node reaches nothing.
  const feed = await serveFeed(page, {
    overview: RICH,
    overviewOnReconnect: HEARD_NOTHING,
  });
  await page.goto(OVERVIEW);

  const ranked = listIn(
    page,
    "Sector performance",
    "Sectors ranked by today’s move",
  );
  await expect(ranked.getByRole("link", { name: "XLY" })).toBeVisible();
  await ranked.getByRole("link", { name: "XLY" }).focus();
  expect(await focusedWhere(page)).toBe("row:XLY");

  const served = feed.overviews();
  feed.drop();
  await expect
    .poll(() => feed.overviews(), { timeout: 20_000 })
    .toBeGreaterThan(served);
  // The ordered list itself is gone, not merely empty.
  await expect(ranked).toHaveCount(0);

  expect(await focusedWhere(page)).toBe("section:Sector performance");

  // **And the reader's own security is still a destination 100 px below**, in
  // the trailing quiet group, because a sector with nothing to rank is still a
  // security with stored bars (`UNIVERSE.md` §12.2). Focus lands on the
  // section rather than on it, and that is a property of the mechanism rather
  // than a choice: a roving group is a **list**, so the ranked group cannot
  // reach into the quiet one. Recorded here because the DOM is the only place
  // it is visible — Task 4.7.6.
  const quiet = listIn(page, "Sector performance", "Not ranked");
  expect(await tickersIn(quiet)).toHaveLength(ALL_SECTORS.length);

  await expectNothingFailedToRender(page);
});

test("a reader on a mover row when the movers SECTION goes away keeps a focus position too", async ({
  page,
}) => {
  // **The state no recovery inside the region's content can reach**, and it is
  // not hypothetical: `readOverview` turns an **unreadable** movers section
  // into an absent one on purpose, so a healthy gateway can produce it. The
  // route then draws no `Movers` at all — `movers === undefined` with
  // `overview` present is its *rollback pinning a previous image* branch — so
  // the component holding Task 4.6.5's recovery **unmounts with the rows**,
  // and the layout effect that would have caught the focus never runs again.
  //
  // So the catch has to be in the element that is a stop in every state, which
  // is the one ADR 0039 is about: `Region`'s own `<section>`.
  const feed = await serveFeed(page, {
    overview: RICH,
    overviewOnReconnect: ROLLBACK,
  });
  await page.goto(OVERVIEW);

  const gainers = listIn(page, "Movers", "Gainers");
  await expect(gainers.getByRole("link", { name: "NVDA" })).toBeVisible();
  await gainers.getByRole("link", { name: "NVDA" }).focus();
  expect(await focusedWhere(page)).toBe("row:NVDA");

  const served = feed.overviews();
  feed.drop();
  await expect
    .poll(() => feed.overviews(), { timeout: 20_000 })
    .toBeGreaterThan(served);
  // Not an empty list — no list, and no `Movers` component either.
  await expect(gainers).toHaveCount(0);

  expect(await focusedWhere(page)).toBe("section:Movers");

  await expectNothingFailedToRender(page);
});

test("ONE arrow press re-orders every row under the reader, while the head still says ORDER HELD", async ({
  page,
}) => {
  // **The consequence Story 4.6 handed over, measured** (Task 4.6.5's own
  // closing note): `Region` combines non-bubbling `pointerenter`/`pointerleave`
  // with **bubbling** `focusin`/`focusout`, so moving focus from one row to the
  // next fires `focusout` — `setPinned(undefined)` — and then `focusin`, which
  // re-pins against `latest.current`, *the last frame drawn*.
  //
  // It is invisible while the two orders agree. This is the state where they do
  // not, with the membership held still so the pin is the only thing that can
  // move a row.
  const feed = await serveFeed(page, { overview: RICH });
  await page.goto(OVERVIEW);

  const gainers = listIn(page, "Movers", "Gainers");
  await expect(gainers.getByRole("link", { name: "NVDA" })).toBeVisible();
  await gainers.getByRole("link", { name: "NVDA" }).focus();

  const pinned = ["SMCI", "FSLR", "NVDA", "AMD", "TSLA"];
  expect(await tickersIn(gainers)).toEqual(pinned);
  await expect(heldBadges(page, "Movers")).toHaveCount(1);

  // A frame that re-ranks all five. The hold does its job: nothing moves.
  feed.sendOverview({ ...RICH, movers: moversOf(GAINERS_RESHUFFLED, LOSERS) });
  await expect(gainers.getByRole("link", { name: "TSLA" })).toBeVisible();
  expect(await tickersIn(gainers)).toEqual(pinned);

  // **And one press of ArrowDown moves all five.** The reader is at rank 3 and
  // asked for rank 4.
  await page.keyboard.press("ArrowDown");
  expect(await tickersIn(gainers)).toEqual([
    "TSLA",
    "AMD",
    "NVDA",
    "FSLR",
    "SMCI",
  ]);

  // The key handler read the order that was on screen when the key went down,
  // so focus is on the row that **was** below `NVDA` — and that row is now
  // **above** it. A press of ArrowDown took the reader up the screen.
  expect(await focusedWhere(page)).toBe("row:AMD");

  // **And the head says `ORDER HELD` throughout**, which falsifies
  // `use-order-hold.ts`' own claim that *"there is no state in which the badge
  // is on and the order is moving"*: the badge is `pinned !== undefined`, and
  // a **re-taken** pin is a different order with the same truth value.
  await expect(heldBadges(page, "Movers")).toHaveCount(1);

  await expectNothingFailedToRender(page);
});

test("and the FOCUS RECOVERY is itself such a move, so a degradation re-pins with no key pressed", async ({
  page,
}) => {
  // The same defect with no reader input at all, which is the half the 2026-10-09
  // hand-off could not have known: Task 4.6.5's recovery **moves focus inside
  // the region**, so it fires the very `focusout`/`focusin` pair above — and
  // the frame it re-pins against is the degraded one.
  const feed = await serveFeed(page, { overview: RICH });
  await page.goto(OVERVIEW);

  const gainers = listIn(page, "Movers", "Gainers");
  await expect(gainers.getByRole("link", { name: "NVDA" })).toBeVisible();
  await gainers.getByRole("link", { name: "NVDA" }).focus();
  expect(await tickersIn(gainers)).toEqual([
    "SMCI",
    "FSLR",
    "NVDA",
    "AMD",
    "TSLA",
  ]);

  // Four of the five stop being eligible. The recovery catches the focus — at
  // the clamped rank, because one row is all there is.
  feed.sendOverview({ ...RICH, movers: moversOf(ONE_GAINER, LOSERS) });
  await expect(gainers.getByRole("link")).toHaveCount(1);
  expect(await focusedWhere(page)).toBe("row:SMCI");

  // The feed comes back, with the same five names in a different order. A
  // reader who never pressed anything and never left the region watches all
  // five rows take new positions.
  feed.sendOverview({ ...RICH, movers: moversOf(GAINERS_RESHUFFLED, LOSERS) });
  await expect(gainers.getByRole("link")).toHaveCount(5);
  expect(await tickersIn(gainers)).toEqual([
    "TSLA",
    "AMD",
    "NVDA",
    "FSLR",
    "SMCI",
  ]);
  await expect(heldBadges(page, "Movers")).toHaveCount(1);

  await expectNothingFailedToRender(page);
});
