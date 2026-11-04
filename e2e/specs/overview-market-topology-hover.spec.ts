import { SECTOR_LABELS } from "@marketpulse/shared";
import type {
  SecuritiesResponse,
  Security,
  WireAnomalyBands,
  WireMarketBreadth,
  WireMarketMovers,
  WireMarketOverview,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";
import { backendOrigin } from "../support/pair.js";

// **Hover reads the node** (Task 6.4.1) — the browser-level half of
// Done-when 2, 3, 4 and 6.
//
// ## What is grounded OUTSIDE the page, and what is authored
//
// `overview-breadth-counts.spec.ts`' lesson, and the trap
// `MARKET-OVERVIEW.md` §9 states at full strength: a pass-through spec proves
// **fidelity, never correctness**, so a producer broken into inventing a
// figure is drawn exactly as faithfully as a correct one and every *the page
// agrees with the frame* assertion stays green. So:
//
// - **the ticker, the name and the sector** are checked against
//   `GET /securities`, fetched by this spec itself from the backend the
//   running pair resolved — never against the page's own fetch, and never
//   against a frame this spec furnished;
// - **the band** is authored, through `serveFeed`/`sendOverview`, because it
//   is a function of the overview aggregate and CI's store has zero bars and
//   no composite generation. It can never produce a present `anomalyBands`
//   section at all — Story 6.3's own spec says the same thing and this reuses
//   its mechanism rather than inventing a second one.
//
// ## Coordinates are DISCOVERED, never computed
//
// `fit.ts`'s affine transform is frontend-internal and this package imports
// only `@marketpulse/shared`, so reproducing it here would be a second copy of
// the arithmetic Task 6.4.1 exists to repair. Instead {@link discoverNodes}
// sweeps the canvas with **synthetic** `pointermove` events — cheap, in one
// `evaluate`, no round trip per point — and records where the readout first
// named each ticker. Every ASSERTION below then re-hovers those coordinates
// with the **real** pointer (`page.mouse.move`), so nothing is claimed from a
// synthetic event: the sweep is a search and the mouse is the subject. It also
// means the plate's `pointer-events: none` is exercised rather than asserted,
// because several nodes sit under it.

const OVERVIEW = "/";
const AT = "2026-09-16T18:01:00Z";

const BREADTH: WireMarketBreadth = {
  basis: "observed",
  advancing: 10,
  declining: 5,
  unchanged: 1,
  measured: 16,
  tracked: 501,
  windowMinutes: 5,
};

const MOVERS: WireMarketMovers = {
  basis: "observed",
  gainers: [],
  losers: [],
  eligible: 0,
  tracked: 501,
  windowMinutes: 5,
};

/** A real overview frame, carrying the given anomaly-band section (or none). */
function overviewWith(
  anomalyBands: WireAnomalyBands | undefined,
): WireMarketOverview {
  return {
    computedAt: AT,
    observedAt: AT,
    feeds: ["iex"],
    figures: [],
    breadth: BREADTH,
    movers: MOVERS,
    ...(anomalyBands === undefined ? {} : { anomalyBands }),
  };
}

/** One equity drawn `extreme`, everything else `normal`. */
function extremeBands(symbol: string): WireAnomalyBands {
  return {
    normal: [],
    elevated: [],
    high: [],
    extreme: [symbol],
    cohort: { factors: ["price", "excess"], max: 75, scored: 1, others: 0 },
  };
}

/** `GET /securities`, fetched by this spec and not by the page. */
async function securities(page: Page): Promise<readonly Security[]> {
  const response = await page.request.get(`${backendOrigin}/securities`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as SecuritiesResponse;
  return body.securities.filter((security) => security.status === "active");
}

const topologyCanvas = (page: Page) =>
  page
    .getByRole("region", { name: "Market topology" })
    .getByRole("img", { name: /A graph of every security we track/u });

const plate = (page: Page) =>
  page
    .getByRole("region", { name: "Market topology" })
    .locator("[data-topology-readout]");

/** One of the plate's four fact lines, by its own `data-readout`. */
const plateLine = async (page: Page, field: string): Promise<string> =>
  (
    (await plate(page).locator(`[data-readout="${field}"]`).textContent()) ?? ""
  ).trim();

/** Which state the plate is in — `idle` or `reading`. */
const plateState = (page: Page): Promise<string | null> =>
  plate(page).getAttribute("data-topology-readout");

/**
 * Where, in page coordinates, the readout first named each ticker — swept with
 * synthetic events. See the note at the top of this file for why the sweep is
 * synthetic and every assertion is not.
 */
async function discoverNodes(
  page: Page,
): Promise<Record<string, { readonly x: number; readonly y: number }>> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const readout = document.querySelector('[data-readout="ticker"]');
    if (canvas === null || readout === null) return {};

    const box = canvas.getBoundingClientRect();
    const found: Record<string, { x: number; y: number }> = {};
    // 7 px, a little under the 8 px target radius of the smallest mark, so a
    // node cannot sit entirely between two sample points on either axis.
    const step = 7;

    for (let y = 2; y < box.height; y += step) {
      for (let x = 2; x < box.width; x += step) {
        // **Only points a real pointer could reach.** `elementFromPoint` is
        // what the sticky masthead and status bar are kept out of the search
        // by: a coordinate they cover is one `page.mouse.move` would deliver
        // to them and not to the canvas, and a discovered node there would be
        // a test that cannot be driven. It is also a free check that the
        // readout plate does not occlude the graph it sits over — several
        // nodes are under it, and they survive this filter because the plate
        // is `pointer-events: none`.
        if (document.elementFromPoint(box.left + x, box.top + y) !== canvas)
          continue;

        canvas.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: box.left + x,
            clientY: box.top + y,
            bubbles: true,
          }),
        );

        const ticker = readout.textContent;
        if (ticker !== "" && !(ticker in found)) {
          found[ticker] = { x: box.left + x, y: box.top + y };
        }
      }
    }

    // Leave the renderer where a real pointer would find it: over nothing.
    canvas.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    return found;
  });
}

/** The first discovered node of a kind, with the security the backend has. */
function pick(
  found: Record<string, { readonly x: number; readonly y: number }>,
  universe: readonly Security[],
  kind: Security["kind"],
): {
  readonly security: Security;
  readonly at: { readonly x: number; readonly y: number };
} {
  for (const security of universe) {
    const at = found[security.symbol];
    if (security.kind === kind && at !== undefined) return { security, at };
  }

  throw new Error(
    `the sweep found no ${kind} among ${String(Object.keys(found).length)} nodes`,
  );
}

test("the plate reads a hovered equity's four facts, against GET /securities and an authored band", async ({
  page,
}) => {
  const universe = await securities(page);
  // **No `anomalyBands` section at all** — CI's permanent state, and the route
  // answers it by drawing every equity `unscored`. So the first band this spec
  // asserts is the one a gated run can actually reach.
  const feed = await serveFeed(page, { overview: overviewWith(undefined) });

  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();
  // **Scrolled into view BEFORE anything is discovered**, and never after: at
  // 390 this region sits ~2,100 px down the page, and `page.mouse.move` takes
  // viewport coordinates. Discovering first and scrolling after would move
  // every coordinate out from under the pointer.
  await topologyCanvas(page).scrollIntoViewIfNeeded();

  // Nothing hovered: the idle instruction, and no fact lines.
  await expect(plate(page)).toBeVisible();
  expect(await plateState(page)).toBe("idle");
  await expect(plate(page)).toContainText(
    "Point at a security to see what it is.",
  );
  expect(await plateLine(page, "ticker")).toBe("");

  const found = await discoverNodes(page);
  const { security, at } = pick(found, universe, "equity");

  await page.mouse.move(at.x, at.y);

  await expect.poll(() => plateLine(page, "ticker")).toBe(security.symbol);
  expect(await plateState(page)).toBe("reading");

  // **The three facts that are not ours to author.** `name` and `sector` come
  // off the security the BACKEND served, read independently of the page.
  expect(await plateLine(page, "name")).toBe(security.name);
  expect(await plateLine(page, "sector")).toBe(
    security.sector === null ? "" : SECTOR_LABELS[security.sector],
  );

  // **The stated absence, not a blank and not `normal`** — the band with no
  // composite generation behind it.
  expect(await plateLine(page, "band")).toBe("Not scored yet");

  // **The same node, re-read on a live batch without the pointer moving** —
  // the renderer reports hover again from `setBands`, because a plate that
  // kept the old word would disagree with the ring beside it.
  feed.sendOverview(overviewWith(extremeBands(security.symbol)));

  await expect.poll(() => plateLine(page, "band")).toBe("extreme");
  expect(await plateLine(page, "ticker")).toBe(security.symbol);

  await expectNothingFailedToRender(page);
});

test("a sector ETF and a market proxy draw no band word at all — they are not scored, rather than unscored", async ({
  page,
}) => {
  const universe = await securities(page);
  await serveFeed(page, { overview: overviewWith(undefined) });

  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();
  await topologyCanvas(page).scrollIntoViewIfNeeded();

  const found = await discoverNodes(page);
  const etf = pick(found, universe, "sector_etf");
  const proxy = pick(found, universe, "index_etf");

  // **A sector ETF: a sector line, and no band word.** Gate 1's Decision 3
  // excludes the fifteen landmarks from the encoding entirely, so `unscored`
  // here would claim a failed attempt to score something nobody tried to
  // score.
  await page.mouse.move(etf.at.x, etf.at.y);
  await expect.poll(() => plateLine(page, "ticker")).toBe(etf.security.symbol);
  expect(await plateLine(page, "band")).toBe("Benchmarks are not scored");
  expect(await plateLine(page, "sector")).toBe(
    etf.security.sector === null ? "" : SECTOR_LABELS[etf.security.sector],
  );

  // **A market proxy: no sector line either**, because `cluster === null` is a
  // complete answer — an index proxy does not belong to a sector — and the
  // slot is empty rather than carrying a placeholder.
  await page.mouse.move(proxy.at.x, proxy.at.y);
  await expect
    .poll(() => plateLine(page, "ticker"))
    .toBe(proxy.security.symbol);
  expect(await plateLine(page, "band")).toBe("Benchmarks are not scored");
  expect(await plateLine(page, "sector")).toBe("");

  // No band word from the four-word vocabulary appears on the plate for
  // either, which is the claim stated the other way round.
  for (const word of ["normal", "elevated", "high", "extreme"]) {
    await expect(plate(page)).not.toContainText(word, { useInnerText: false });
  }

  await expectNothingFailedToRender(page);
});

test("the plate's height is identical in every state, at 1440 and at 390", async ({
  page,
}) => {
  const universe = await securities(page);
  const feed = await serveFeed(page, { overview: overviewWith(undefined) });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 780 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(OVERVIEW);
    await expect(topologyCanvas(page)).toBeVisible();
    await topologyCanvas(page).scrollIntoViewIfNeeded();

    const heights: number[] = [];
    const record = async (): Promise<void> => {
      const box = await plate(page).boundingBox();
      if (box === null) throw new Error("the readout plate has no box");
      heights.push(box.height);
    };

    // 1. idle
    await record();

    const found = await discoverNodes(page);
    const equity = pick(found, universe, "equity");
    const proxy = pick(found, universe, "index_etf");

    // 2. an unscored equity — four lines, one of them a stated absence
    await page.mouse.move(equity.at.x, equity.at.y);
    await expect
      .poll(() => plateLine(page, "ticker"))
      .toBe(equity.security.symbol);
    await record();

    // 3. the same equity, scored — a one-word band where a sentence was
    feed.sendOverview(overviewWith(extremeBands(equity.security.symbol)));
    await expect.poll(() => plateLine(page, "band")).toBe("extreme");
    await record();

    // 4. a market proxy — no sector line, and the longest band sentence
    await page.mouse.move(proxy.at.x, proxy.at.y);
    await expect
      .poll(() => plateLine(page, "ticker"))
      .toBe(proxy.security.symbol);
    await record();

    // 5. the longest name in the tracked universe, which wraps to the second
    //    of the two slots reserved for it — the one state that would push the
    //    sector and the band out of a plate whose room was not reserved.
    const longest = [...universe].sort(
      (left, right) => right.name.length - left.name.length,
    )[0];
    const longestAt = longest === undefined ? undefined : found[longest.symbol];
    if (longest !== undefined && longestAt !== undefined) {
      await page.mouse.move(longestAt.x, longestAt.y);
      await expect.poll(() => plateLine(page, "ticker")).toBe(longest.symbol);
      await record();
    }

    // 6. back to idle
    await page.mouse.move(0, 0);
    await expect.poll(() => plateState(page)).toBe("idle");
    await record();

    // **Measured, not assumed** (Done-when 4). `pnpm probe` reports 288×98 at
    // all four widths with nothing hovered; what no probe can reach is the
    // hovered states, which is why this is here and not only there.
    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toBeGreaterThan(0);
  }

  await expectNothingFailedToRender(page);
});
