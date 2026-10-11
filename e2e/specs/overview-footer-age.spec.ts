import { decodeMarketStreamMessage } from "@marketpulse/shared";
import type {
  MarketFeed,
  WireMarketMovers,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { FURNISHED_BREADTH, serveFeed } from "../support/feed.js";

// **An age beside the denominator, in the two states it has** (Task 4.7.4).
//
// `Market breadth` and `Movers` are the two regions on this screen most
// confidently wrong when stale — a count and a ranking read as current whatever
// produced them — and until this change they carried **no instant in any
// state**. Each now states, beside the denominator it already states, how far
// the observations behind it reach.
//
// ## Why a browser, and why these three tests
//
// Three of the four claims are unreachable below this level, and the fourth is
// the one a unit test would get wrong.
//
// **The clause must be ABSENT rather than empty.** `observedAt` is omitted from
// the frame exactly when the aggregate holds no observation (ADR 0029's defer
// rule, decided at the producer), which is CI's permanent state — 518
// securities and **zero bars** — so the gated machine's own answer is the state
// worth asserting. A trailing `undefined`, an empty sentence or a stray space
// are all `toContain`-invisible and all visible on a screen, so the drawn
// paragraph is read **whole and compared exactly**.
//
// **The instant must be the interval's END.** `observedAt` is a bar's own
// `startsAt`, the **start** of the minute it describes, so a surface that draws
// it raw under-states the reach by a minute — Task 3.3.4's defect, which made
// `live` structurally unreachable during a session, one surface over. The served
// frame's own instant is `14:01` and the only correct reading is `14:02`, so
// this file asserts the one and **refuses the other by name**. Nothing in the
// two regions carries an instant of its own, which is what makes that negative
// safe.
//
// **No verdict reaches either region.** `live`, `stale` and `disconnected` have
// one home and it is the status bar (Story 3.10), and the owner has held that
// rule for `/`: ages here, never a connection word.
//
// ## What a green run here does not certify
//
// The established sentence, and it is sharper than usual: this says everything
// about what the browser does with an aggregate and nothing about whether the
// instant on one is true. The clause is as old as the last applied batch, and
// since Task 4.7.3 a joining browser is served the **last broadcast**
// aggregate — so on a dead feed the instant is arbitrarily old and identical on
// two tabs opened an hour apart. Both are correct, and no browser can tell a
// correct instant from a plausible one.

const OVERVIEW = "/";

/** The one venue value — `overview-proxy-live-update.spec.ts`'s rule. */
const VENUE: MarketFeed = "iex";

/** 14:01 ET on a Wednesday, so no extended-hours word anywhere on the page. */
const AT = "2026-09-16T18:01:00Z";

/**
 * **What the clause must say about {@link AT}, and the thing it must not.**
 *
 * `14:02` is `14:01` plus `OBSERVATION_INTERVAL_MS` — the end of the minute the
 * bar describes. Written out rather than derived, which is Task 4.3.7's rule
 * for every string in this suite: `describeMeasuredReach` is the module under
 * test, so importing it or re-doing its arithmetic here would make this spec
 * agree with it by construction.
 */
const REACH = "Nothing newer than Sep 16 · 14:02 EDT has reached us.";
const THE_INTERVALS_START = "14:01";

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

/**
 * A movers section with rows, so the ranked region is drawn rather than
 * reserved.
 *
 * `eligible` and `tracked` agree with {@link FURNISHED_BREADTH}'s `measured`
 * and `tracked` because one eligibility pass produces both on the real
 * producer; nothing here asserts them — `overview-movers-denominator.spec.ts`
 * is where the denominator is the subject.
 */
const MOVERS: WireMarketMovers = {
  basis: "observed",
  windowMinutes: 5,
  eligible: FURNISHED_BREADTH.measured,
  tracked: FURNISHED_BREADTH.tracked,
  gainers: [observed("NVDA", 184.12, 4.21)],
  losers: [observed("MRNA", 24.87, -3.68)],
};

/** The aggregate, with or without an observation instant. */
const overviewOf = (reach: "observed" | "nothing"): WireMarketOverview => {
  const figures = [
    observed("SPY", 774.03, 0.42),
    observed("QQQ", 601.88, 0.61),
    observed("DIA", 525.79, -0.18),
    observed("IWM", 288.89, 0.07),
  ];

  // **`exactOptionalPropertyTypes` is on**, so *absent* and *present as
  // `undefined`* are different types and the branch is the setting behaving
  // correctly. The `nothing` arm keeps every figure: a frame whose four proxies
  // are observed while `observedAt` is absent is not a state the producer can
  // build, and that is the point — it isolates the one field this spec is
  // about, so a failure cannot be explained by the region having gone quiet for
  // some other reason.
  return reach === "observed"
    ? {
        computedAt: AT,
        observedAt: AT,
        feeds: [VENUE],
        figures,
        breadth: FURNISHED_BREADTH,
        movers: MOVERS,
      }
    : {
        computedAt: AT,
        feeds: [VENUE],
        figures,
        breadth: FURNISHED_BREADTH,
        movers: MOVERS,
      };
};

const region = (page: Page, name: string): Locator =>
  page.getByRole("region", { name });

/**
 * The region's footer paragraph — **the last `<p>` in it**, which is where both
 * components put the clause.
 *
 * Read with `innerText` rather than `textContent`, because breadth draws two
 * renderings of one string when they differ — an `aria-hidden` drawn half and a
 * visually-hidden spoken one — and `textContent` would run them together. What
 * a reader meets is the drawn half, and that is this spec's subject.
 */
const footer = (page: Page, name: string): Locator =>
  region(page, name).locator("p").last();

const REGIONS = ["Market breadth", "Movers"] as const;

test.describe("the aggregate holds an observation", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("both footers state how far the observations reach, at the minute's END", async ({
    page,
  }) => {
    const feed = await serveFeed(page, {
      feed: VENUE,
      overview: overviewOf("observed"),
    });

    await page.goto(OVERVIEW, { waitUntil: "networkidle" });

    // **The plant, per channel** — Task 4.8.10's rule. A frame that was built
    // and never sent and one the page ignored leave the same screen.
    expect(feed.connections()).toBeGreaterThan(0);
    expect(feed.overviews()).toBeGreaterThan(0);

    for (const name of REGIONS) {
      await expect(footer(page, name)).toContainText(REACH);

      // **The interval's start appears nowhere in either region**, which is
      // the structural half of the claim: with the served instant at `14:01`,
      // a clause drawn from it raw would read `14:02`'s sentence with
      // `14:01`'s figure and `toContainText(REACH)` alone would have caught
      // it — but so would an off-by-any-amount, and this says which direction
      // is wrong.
      await expect(region(page, name)).not.toContainText(THE_INTERVALS_START);

      // **No verdict, in either region.** One home for a connection word, and
      // it is the status bar.
      const text = (
        (await region(page, name).textContent()) ?? ""
      ).toLowerCase();
      for (const word of ["live", "stale", "disconnected"])
        expect(text).not.toContain(word);
    }

    await expectNothingFailedToRender(page);
  });
});

test.describe("the aggregate holds no observation — CI's own state", () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test("the clause is ABSENT rather than empty, in a served frame", async ({
    page,
  }) => {
    const feed = await serveFeed(page, {
      feed: VENUE,
      overview: overviewOf("nothing"),
    });

    await page.goto(OVERVIEW, { waitUntil: "networkidle" });

    expect(feed.overviews()).toBeGreaterThan(0);

    // **Compared exactly rather than searched**, because the failure this
    // guards is a *remnant*: a trailing space, an empty sentence, a literal
    // `undefined`. Every one of those passes a `not.toContain("has reached
    // us")` and every one is on the screen.
    //
    // `useInnerText` for breadth's reason — it draws its two renderings as two
    // elements whenever they differ, and `textContent` runs them together with
    // no separator at all. Playwright normalises whitespace either way, so the
    // expectation is the drawn half, a space, and the spoken one.
    const measured = `Of the ${String(MOVERS.tracked)} companies we track, ${String(MOVERS.eligible)} were heard from in the last 5 minutes.`;

    await expect(footer(page, "Market breadth")).toHaveText(
      `Heard from means at least one observation in the last 5 minutes. ${measured}`,
      { useInnerText: true },
    );
    await expect(footer(page, "Movers")).toHaveText(
      `${measured} Both lists are ranked over those.`,
      { useInnerText: true },
    );

    await expectNothingFailedToRender(page);
  });
});

test.describe("the real gateway, whatever this machine's store holds", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the two footers agree with the frame about whether there is an instant at all", async ({
    page,
  }) => {
    // **Keyed on what the frame actually said, so neither machine skips** —
    // `overview-movers-denominator.spec.ts`' rule. CI's store is 518
    // securities and zero bars, so every gated run takes the absent arm and
    // this is the assertion the task owes; a developer's store with a live
    // feed takes the other one.
    const frames: WireMarketOverview[] = [];

    await page.routeWebSocket(/\/market-stream$/u, (ws) => {
      const server = ws.connectToServer();

      server.onMessage((raw) => {
        const decoded = decodeMarketStreamMessage(String(raw));
        if (decoded.kind === "message" && decoded.message.type === "overview")
          frames.push(decoded.message.overview);

        ws.send(raw);
      });
    });

    await page.goto(OVERVIEW, { waitUntil: "networkidle" });

    await expect.poll(() => frames.length).toBeGreaterThan(0);

    const latest = frames.at(-1);
    const stated = latest?.observedAt !== undefined;

    for (const name of REGIONS) {
      // **The phrase appears exactly when the frame stated an instant**, in
      // both directions. The reserved panel is not a third case here: the real
      // gateway's producer requires a breadth section and builds a movers one
      // from the same pass, so a frame with neither is a pinned rollback and
      // not a state this machine can be in.
      const text = (await region(page, name).textContent()) ?? "";
      expect(text.includes("has reached us")).toBe(stated);
    }

    await expectNothingFailedToRender(page);
  });
});
