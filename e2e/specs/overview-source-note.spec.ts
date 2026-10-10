import {
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  MarketFeed,
  WireFeedState,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// **The landing screen's one source note, in every state it has** (Task
// 4.8.12).
//
// ## Why this spec exists at all, which is one sentence of invariant 6
//
// The note's last clause drew `computedAt` — *when the join ran* — under a
// term saying it described the figures above it. The gateway reaches the
// producer on every connect and every subscribe, so on a feed that had
// stopped the clause advanced with no market data behind it and a reader of a
// stopped page was told the figures were from the minute they opened the tab.
// It now draws `observedAt`, the newest observation the aggregate contains,
// and **nothing at all** when the aggregate contains none.
//
// ## This file IS the state grid, and that is deliberate
//
// `docs/GAPS.md` entry 13 — *that a row of a published state grid is a row the
// product can actually reach* — owns itself to **the next story that publishes
// a state grid**. The rows below are not a table in a document that somebody
// then tries to reproduce: each row is **produced** through the shipped socket
// path (the shipped encoder, the gateway's own connect sequence, the shipped
// decoder, the shipped renderer) and the grid is the test's own output, read
// as a **string** rather than judged by eye. A row nothing can produce cannot
// appear in it.
//
// The rows are enumerated from the **producers** — what a deployment can be
// in — which is this entry's re-measure in its second direction: a session
// running, the same screen some hours later, a store with bars and no
// provider, CI's store with zero bars, and a rollback that pins a gateway
// which sends no observation instant at all.
//
// ## What it serves, and therefore cannot say
//
// The frames are produced here with the shipped encoder — `overview-sector-
// region.spec.ts`' rule: **a spec that asserts a figure serves its own
// answer**, because CI's store is 518 securities and **zero bars**, so every
// figure assertion against the real gateway there would be an assertion about
// data the runner does not have. What this says nothing about is whether an
// observation instant ever arrives from Alpaca.

const OVERVIEW = "/";

/** The one venue value — `overview-proxy-live-update.spec.ts`'s rule. */
const VENUE: MarketFeed = "iex";

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: VENUE,
  marketOpen: true,
};

/** 18:01Z is 14:01 in New York, inside a regular session. */
const OBSERVED_AT = "2026-09-25T18:01:00.000Z";

/** The drawn spelling of {@link OBSERVED_AT} — `formatBarInstant`'s. */
const OBSERVED_DRAWN = "Sep 25 · 14:01 EDT";

const observed = (symbol: string, price: number): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: OBSERVED_AT,
  price,
  changePercent: 0.42,
  changeBasis: "2026-09-24",
});

const stored = (symbol: string, close: number): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-09-11",
  close,
});

const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

const LIVE_FIGURES = [
  observed("SPY", 774.03),
  observed("QQQ", 601.88),
  observed("DIA", 452.17),
  observed("IWM", 243.6),
];

/**
 * Serve the gateway's connect sequence: a structurally empty snapshot, then
 * the aggregate, which is **not** scoped to a subscription.
 *
 * `feed` is the chrome's own answer — `null` is a deployment with no provider
 * configured, which is what CI and a developer's machine both run.
 */
async function serve(
  page: Page,
  overview: WireMarketOverview,
  feed: MarketFeed | null,
): Promise<void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed }),
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
    ws.send(
      encodeMarketStreamMessage({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: new Date().toISOString(),
        overview,
      }),
    );
  });
}

/**
 * The note's three possible terms, which are the only `dt` texts it has.
 *
 * `one-provenance-note-on-the-landing-route` asserts each is written in
 * exactly one shipped file, so matching the note by its terms cannot
 * accidentally match somebody else's definition list.
 */
const TERMS = ["Observed prices", "Closing prices", "Observed through"];

/**
 * The same terms **as a reader sees them**.
 *
 * The micro-label layer sets `text-transform: uppercase`, so `textContent` —
 * which the locator above matches on — and `innerText` — which the grid below
 * records — disagree about the case. The grid keeps the rendered spelling,
 * because the whole point of comparing by string is to compare the thing on
 * the screen.
 */
const DRAWN_TERMS = TERMS.map((term) => term.toUpperCase());

const [, CLOSES_TERM = "", THROUGH_TERM = ""] = DRAWN_TERMS;

/**
 * **The note as a reader meets it, as one string** — or `null` where it draws
 * nothing at all, which is a state rather than a failure.
 *
 * Found by its terms rather than by position or by a hashed class name: this
 * page holds three other definition lists (the proxy strip, the breadth
 * ledger) and `.last()` would quietly follow the DOM order Task 4.4.7 chose.
 * More than one match is thrown rather than resolved, because *two source
 * notes on one screen* is the defect `PROVENANCE.md` §1.3 exists to prevent
 * and it must not read as a passing locator.
 */
async function noteOf(page: Page): Promise<string | null> {
  return page.evaluate((terms: readonly string[]) => {
    const notes = [...document.querySelectorAll("dl")].filter((list) => {
      const written = [...list.querySelectorAll("dt")].map(
        // `textContent` on an element is `string` in this DOM lib, not
        // `string | null` — a `?? ""` here is a lint error rather than a
        // defensive habit.
        (term) => term.textContent.trim(),
      );
      return (
        written.length > 0 && written.every((term) => terms.includes(term))
      );
    });

    if (notes.length > 1) {
      throw new Error(`${String(notes.length)} source notes on one screen`);
    }

    const note = notes[0];
    if (note === undefined) return null;

    return (note as HTMLElement).innerText.replace(/\s+/gu, " ").trim();
  }, TERMS);
}

/** Load `/` against one served state and read the note off it. */
async function noteFor(
  page: Page,
  overview: WireMarketOverview,
  feed: MarketFeed | null,
): Promise<string | null> {
  await serve(page, overview, feed);
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });
  await expectNothingFailedToRender(page);
  return noteOf(page);
}

test.use({ viewport: { width: 1440, height: 900 } });

test("the drawn instant is the data's, and it does not advance with a tab", async ({
  page,
}) => {
  // **Two tabs, one market.** The second frame differs from the first only in
  // `computedAt` — which is what a second cold load of `/` genuinely produces,
  // because the gateway runs the join on every connect. The sentence a reader
  // reads must be the same sentence.
  const first = await noteFor(
    page,
    {
      computedAt: "2026-09-25T18:02:03.000Z",
      observedAt: OBSERVED_AT,
      feeds: [VENUE],
      figures: LIVE_FIGURES,
    },
    VENUE,
  );

  expect(first).not.toBeNull();
  expect(first).toContain(`${THROUGH_TERM} ${OBSERVED_DRAWN}`);

  const second = await noteFor(
    page,
    {
      // Three hours later, nothing heard from in between.
      computedAt: "2026-09-25T21:44:11.000Z",
      observedAt: OBSERVED_AT,
      feeds: [VENUE],
      figures: LIVE_FIGURES,
    },
    VENUE,
  );

  expect(second).toBe(first);
});

test("the states, produced and compared as strings", async ({ page }) => {
  // **The grid.** One row per producer state, each one loaded through the
  // shipped socket path and read back as the string a reader is given.
  const rows: [string, string | null][] = [];

  const row = async (
    label: string,
    overview: WireMarketOverview,
    feed: MarketFeed | null,
  ): Promise<void> => {
    rows.push([label, await noteFor(page, overview, feed)]);
  };

  await row(
    "a session running, the chrome naming IEX",
    {
      computedAt: "2026-09-25T18:02:03.000Z",
      observedAt: OBSERVED_AT,
      feeds: [VENUE],
      figures: LIVE_FIGURES,
    },
    VENUE,
  );

  await row(
    "the same screen hours later, nothing heard from since",
    {
      computedAt: "2026-09-25T21:44:11.000Z",
      observedAt: OBSERVED_AT,
      feeds: [VENUE],
      figures: LIVE_FIGURES,
    },
    VENUE,
  );

  await row(
    "a store with bars, no provider configured",
    {
      computedAt: "2026-09-25T18:02:03.000Z",
      feeds: [],
      figures: [
        stored("SPY", 764.29),
        stored("QQQ", 714.88),
        stored("DIA", 525.79),
        stored("IWM", 288.89),
      ],
    },
    null,
  );

  await row(
    "CI's store: 518 securities and zero bars",
    {
      computedAt: "2026-09-25T18:02:03.000Z",
      feeds: [],
      figures: [unknown("SPY"), unknown("QQQ"), unknown("DIA"), unknown("IWM")],
    },
    null,
  );

  await row(
    "a rollback: a gateway that sends no observation instant",
    {
      computedAt: "2026-09-25T18:02:03.000Z",
      feeds: [VENUE],
      figures: LIVE_FIGURES,
    },
    VENUE,
  );

  // **The grid, printed, so the record is the run's own output.**
  console.log(
    rows
      .map(([label, drawn]) => `${label}\n    ${drawn ?? "(nothing drawn)"}`)
      .join("\n"),
  );

  const drawn = new Map(rows);

  // The two session rows are the same string: see the test above.
  expect(
    drawn.get("the same screen hours later, nothing heard from since"),
  ).toBe(drawn.get("a session running, the chrome naming IEX"));

  // **The three states with no observation instant draw no instant**, which is
  // ADR 0029's defer rule: say nothing rather than say now.
  for (const label of [
    "a store with bars, no provider configured",
    "a rollback: a gateway that sends no observation instant",
  ]) {
    expect(drawn.get(label)).not.toContain(THROUGH_TERM);
    expect(drawn.get(label)).toContain(CLOSES_TERM);
  }

  // **CI's state draws no note at all** — every figure is `unknown`, so there
  // is nothing on the screen for a footnote to qualify.
  expect(drawn.get("CI's store: 518 securities and zero bars")).toBeNull();

  // **No two rows read identically** except the pair that must — the check
  // Story 3.10's nine-state pass made its own: a grid whose rows collapse is
  // a grid that has stopped distinguishing anything.
  const distinct = new Set(rows.map(([, value]) => value ?? "(nothing)"));
  expect(distinct.size).toBe(rows.length - 1);

  // **No connection word in any state.** `LIVE` / `STALE` / `DISCONNECTED` /
  // `REPLAYING` have one home and it is the status bar (Story 3.10). An age is
  // not a verdict.
  for (const [, value] of rows) {
    for (const word of ["LIVE", "STALE", "DISCONNECTED", "REPLAYING"]) {
      expect((value ?? "").toUpperCase()).not.toContain(word);
    }
  }
});
