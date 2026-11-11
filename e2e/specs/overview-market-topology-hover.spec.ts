import { SECTOR_LABELS, TOPOLOGY_HUB } from "@marketpulse/shared";
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
import { expectNoAxeViolations } from "../support/axe.js";
import { serveFeed } from "../support/feed.js";
import { backendOrigin } from "../support/pair.js";

// **Pointer input on the market topology** — hover (Task 6.4.1) and, from the
// second half of this file, **selection** (Task 6.4.2).
//
// The file is named for hover because that is what it was written for; it is
// kept rather than split because the subject is one — what a pointer on this
// canvas does — and because the two halves share every helper below, including
// the coordinate discovery that is the expensive part of each. The selection
// half has its own header where it begins.
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

/**
 * A point on the canvas that is over **no** node (Task 6.4.2) — what a click
 * that clears the selection needs.
 *
 * Found the same way the nodes are and with the same guard: a synthetic sweep,
 * `elementFromPoint` to keep it somewhere a real pointer can reach, and the
 * readout as the oracle. It searches from the **top** of the canvas, which
 * keeps it clear of the readout plate's own corner — the plate is
 * `pointer-events: none` today, but the ticker anchor this task adds is not,
 * so a cleared-selection click must not land on the very anchor whose absence
 * it is about to assert.
 */
async function discoverEmptyPoint(
  page: Page,
): Promise<{ readonly x: number; readonly y: number }> {
  const found = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const readout = document.querySelector('[data-readout="ticker"]');
    if (canvas === null || readout === null) return null;

    const box = canvas.getBoundingClientRect();

    for (let y = 4; y < box.height / 2; y += 6) {
      for (let x = 4; x < box.width; x += 6) {
        if (document.elementFromPoint(box.left + x, box.top + y) !== canvas)
          continue;

        canvas.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: box.left + x,
            clientY: box.top + y,
            bubbles: true,
          }),
        );

        if (readout.textContent === "") {
          canvas.dispatchEvent(
            new PointerEvent("pointerleave", { bubbles: true }),
          );
          return { x: box.left + x, y: box.top + y };
        }
      }
    }

    canvas.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    return null;
  });

  if (found === null) {
    throw new Error("the sweep found no point on the canvas clear of a node");
  }

  return found;
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
    "Point at a security, or press Tab and the arrow keys.",
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

// ---------------------------------------------------------------------------
// **Select, and the one way out** (Task 6.4.2) — the browser-level half of
// Done-when 1, 2, 4 and 5, and AC 6's third bounded claim.
//
// Added to this file rather than to one of its own because the subject is the
// same: pointer input on the topology, against coordinates this file already
// knows how to discover. Everything above about grounding applies unchanged —
// the symbol and the destination are checked against `GET /securities` fetched
// by this spec, never against a frame it furnished.
//
// ## The drawn ground disc is checked by READING PIXELS, which nothing else can
//
// A canvas mutates no DOM, so the selection ground disc is invisible to every
// assertion in this repository — the plate's words would be identical with the
// disc never drawn. {@link darkSamplesAround} reads the canvas's own backing
// store at sixteen points on a ring between the node's ink and the disc's
// edge, and counts how many are dark. It is the only check at any level that
// the ground disc exists, and it is what makes *survives a pan* a claim rather than
// a hope.

/** The region, for counting its whole control set rather than the plate's. */
const topologyRegion = (page: Page) =>
  page.getByRole("region", { name: "Market topology" });

/** The plate's ticker, as an anchor — present only when something is openable. */
const tickerAnchor = (page: Page) => plate(page).getByRole("link");

/**
 * **The sector filter, as this region's control enumeration sees it** (added
 * 2026-11-11 by Task 6.8.1).
 *
 * The four `toStrictEqual` sets below are deliberately exhaustive — *a surface
 * whose every affordance has been counted* — and they went red the moment this
 * region grew a second control, which is the whole reason they are written
 * that way. It is one entry rather than twelve: the filter's own destinations
 * are inside a panel that is shut until it is pressed, so a reader who has not
 * pressed it has exactly one more thing here than they had before.
 */
const SECTOR_FILTER_CONTROL = "button · Sector All sectors";

/** Every activatable thing in the region, as `role · name`, sorted. */
async function regionControls(page: Page): Promise<readonly string[]> {
  const region = topologyRegion(page);
  const found: string[] = [];

  for (const role of ["link", "button"] as const) {
    for (const control of await region.getByRole(role).all()) {
      const label =
        (await control.getAttribute("aria-label")) ??
        (await control.textContent()) ??
        "";
      found.push(`${role} · ${label.trim()}`);
    }
  }

  return found.sort();
}

/** The path the address bar is showing. */
const pathNow = (page: Page): string => new URL(page.url()).pathname;

/**
 * A click: a press and a release with no meaningful travel between them, which
 * is what `isTopologyClick` admits. Playwright's own press/release pair is
 * well inside both the 4 px and the 400 ms bounds.
 */
async function clickAt(
  page: Page,
  at: { readonly x: number; readonly y: number },
): Promise<void> {
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.up();
}

/**
 * How many pixels this renderer has **painted dark** in a 41×41 patch centred
 * on a point — which is the selection ground disc (`--surface-inverse`) and,
 * if one is nearby, a landmark node (`--ink-primary`, the same value).
 *
 * ## Four things here were found by LOOKING, and three of them cost an argued
 * ## number
 *
 * **The alpha test is the one that matters.** The first version tested
 * `red + green + blue < 180` alone, and this canvas is `clearRect`'d — so
 * every **transparent** pixel reads `0,0,0` and counted as dark. The patch is
 * mostly transparent (the panel ground shows through by CSS, not by paint), so
 * a disc of hundreds of pixels was measured as a difference of **ten**,
 * against a threshold of eight that had been reasoned to rather than taken.
 * `alpha > 200` makes the reading *what this renderer painted* rather than
 * *what the page looks like*.
 *
 * **A patch rather than sixteen points on a ring at radius 9.** That assumed
 * the discovered coordinate was the node's CENTRE. `discoverNodes` sweeps on a
 * 7 px grid against an 8 px target radius, so it is not: measured on `TYL` at
 * 1440, one scanline through `at` crossed only 6 px of a 24 px disc. 20 px of
 * half-width covers the disc at any offset the sweep can produce.
 *
 * **And the whole canvas is no better, which is the one that surprised.** A
 * canvas-wide count has a baseline that does not depend on which node the
 * sweep found — but measured, selecting moved it only **1,119 → 1,159**, and
 * the same reading drifted to 1,098 after a pan and 1,137 after clearing. The
 * disc is largely **overpainted by its own neighbours**: in a dense cluster
 * the 501 membership edges and dozens of 8 px equity bodies are drawn over it,
 * so what survives is a fraction of the 452 px the geometry describes, and it
 * varies by cluster. Measured on two real nodes: 163 dark pixels in one
 * patch, ~40 in another.
 *
 * **So the assertion is calibrated rather than thresholded.**
 * {@link pickCleanEquity} chooses a node whose patch reads **exactly zero**
 * dark pixels at rest, and the claim becomes *zero before, more than zero
 * after* — unambiguous, with no magnitude to argue about, and red the moment
 * the disc stops being drawn. The magnitudes above are recorded because they
 * are a real fact about this picture, not because anything gates on them.
 */
async function darkPixelsAround(
  page: Page,
  at: { readonly x: number; readonly y: number },
): Promise<number> {
  return page.evaluate(
    ({ x, y }) => {
      const canvas = document.querySelector("canvas");
      const context = canvas?.getContext("2d") ?? null;
      if (canvas === null || context === null) return -1;

      const box = canvas.getBoundingClientRect();
      const ratio = globalThis.devicePixelRatio;
      const half = 20;
      const side = Math.round((half * 2 + 1) * ratio);
      const { data } = context.getImageData(
        Math.round((x - box.left - half) * ratio),
        Math.round((y - box.top - half) * ratio),
        side,
        side,
      );

      let dark = 0;

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index] ?? 255;
        const green = data[index + 1] ?? 255;
        const blue = data[index + 2] ?? 255;
        const alpha = data[index + 3] ?? 0;
        if (alpha > 200 && red + green + blue < 180) dark += 1;
      }

      return dark;
    },
    { x: at.x, y: at.y },
  );
}

/**
 * A discovered **equity** whose patch holds no dark pixel at rest — the
 * calibration {@link darkPixelsAround}'s own docblock argues for.
 *
 * It walks the universe in order and reads each candidate's patch, which is
 * one `evaluate` apiece and a handful of them in practice. The security it
 * returns is the backend's own row, so every word the plate draws about it is
 * still grounded outside the page.
 */
async function pickCleanEquity(
  page: Page,
  found: Record<string, { readonly x: number; readonly y: number }>,
  universe: readonly Security[],
  clearOf?: { readonly x: number; readonly y: number },
): Promise<{
  readonly security: Security;
  readonly at: { readonly x: number; readonly y: number };
}> {
  for (const security of universe) {
    const at = found[security.symbol];
    if (security.kind !== "equity" || at === undefined) continue;
    // **`clearOf` is a SECOND calibration and it was found by measuring too.**
    // Two nodes in one cluster can sit a few pixels apart, and a 41 px patch
    // then contains the other one's disc: the first version of the
    // selection-moved assertion read **161** dark pixels at a node that had
    // just been DEselected, because its neighbour had just been selected.
    // 60 px is comfortably past the patch's own 20 px half-width plus the
    // disc's 12 px radius.
    if (
      clearOf !== undefined &&
      Math.hypot(at.x - clearOf.x, at.y - clearOf.y) < 60
    )
      continue;
    if ((await darkPixelsAround(page, at)) === 0) return { security, at };
  }

  throw new Error(
    "the sweep found no equity whose patch is clear of a landmark node, so " +
      "the ground-disc assertion has no calibrated subject",
  );
}

test("clicking a node selects it — a drawn ground, one anchor, and the address unmoved", async ({
  page,
}) => {
  const universe = await securities(page);
  await serveFeed(page, { overview: overviewWith(undefined) });

  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();
  await topologyCanvas(page).scrollIntoViewIfNeeded();

  const found = await discoverNodes(page);
  // **Calibrated rather than thresholded** — see {@link darkPixelsAround}. A
  // node whose patch is clear of a landmark at rest is what makes *zero
  // before, more than zero after* a claim with nothing argued in it.
  const { security, at } = await pickCleanEquity(page, found, universe);

  // **Before: no anchor anywhere, and the region's whole control set is one
  // button.** `Reset view` lives in `Region`'s `meta` slot, outside
  // `MarketTopology`'s own tree, so this is the only level the full set can be
  // counted at — the component test counts the component's.
  await expect(tickerAnchor(page)).toHaveCount(0);
  expect(await regionControls(page)).toStrictEqual([
    "button · Reset view — the market topology",
    SECTOR_FILTER_CONTROL,
  ]);

  const before = await darkPixelsAround(page, at);

  await clickAt(page, at);

  // **One anchor, at the path built from the security the BACKEND served.**
  await expect(tickerAnchor(page)).toHaveCount(1);
  await expect(tickerAnchor(page)).toHaveAttribute(
    "href",
    `/securities/${security.symbol}`,
  );
  // The destination and the drawn ticker are one string, which is the whole
  // point of resolving the `href` from the selection's own identity.
  expect(await plateLine(page, "ticker")).toBe(security.symbol);
  expect(await tickerAnchor(page).getAttribute("data-ticker")).toBe(
    security.symbol,
  );

  // **The ground disc is actually drawn** — the one claim no DOM on this
  // surface can carry, because a canvas mutates none of it: the plate's words
  // would be byte-identical with the disc never painted.
  //
  // **Polled, not read once** — found on review. The renderer's own
  // `invalidate()` schedules the redraw on the NEXT animation frame; nothing
  // about a click, or about the DOM assertions just above settling, waits
  // for that frame to have actually painted. A bare `expect(after)` read the
  // canvas before its own paint in roughly a third of runs at one worker,
  // which is `settledCanvasImage`'s own reason for existing one file over —
  // this is that same wait, shaped for a number rather than a whole image.
  expect(before).toBe(0);
  await expect.poll(() => darkPixelsAround(page, at)).toBeGreaterThan(0);

  // **Selecting is not navigating** (Gate 1's two-step decision). The address
  // has not moved, and no second control appeared with the selection.
  expect(pathNow(page)).toBe("/");
  expect(await regionControls(page)).toStrictEqual([
    "button · Reset view — the market topology",
    SECTOR_FILTER_CONTROL,
    `link · ${security.symbol}`,
  ]);

  await expectNothingFailedToRender(page);
});

test("the selection survives the pointer leaving the node, and a pan, and Reset view", async ({
  page,
}) => {
  const universe = await securities(page);
  await serveFeed(page, { overview: overviewWith(undefined) });

  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();
  await topologyCanvas(page).scrollIntoViewIfNeeded();

  const found = await discoverNodes(page);
  const { security, at } = await pickCleanEquity(page, found, universe);
  // A second node, far enough away that its patch and the subject's cannot
  // overlap — it is the witness the pan's own delta is read off below.
  const witness = await pickCleanEquity(
    page,
    found,
    universe.filter((other) => other.symbol !== security.symbol),
    at,
  );
  const empty = await discoverEmptyPoint(page);

  await clickAt(page, at);
  await expect(tickerAnchor(page)).toHaveCount(1);

  // **Hover away: the plate keeps naming the selection rather than going
  // idle**, which is what keeps the anchor's destination on screen. Over empty
  // canvas, so nothing else is being read.
  await page.mouse.move(empty.x, empty.y);
  await expect.poll(() => plateLine(page, "ticker")).toBe(security.symbol);
  expect(await plateState(page)).toBe("reading");
  await expect(tickerAnchor(page)).toHaveCount(1);
  await expect.poll(() => darkPixelsAround(page, at)).toBeGreaterThan(0);

  // **And back onto it**: the anchor is unchanged, not re-created at a
  // different destination.
  await page.mouse.move(at.x, at.y);
  await expect.poll(() => plateLine(page, "ticker")).toBe(security.symbol);
  await expect(tickerAnchor(page)).toHaveAttribute(
    "href",
    `/securities/${security.symbol}`,
  );

  // **A pan does not clear it** — hover would have been cleared sixteen times
  // over by this drag; the selection is a different state.
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x - 60, at.y + 24, { steps: 12 });
  await page.mouse.up();

  await expect(tickerAnchor(page)).toHaveCount(1);
  await expect(tickerAnchor(page)).toHaveAttribute(
    "href",
    `/securities/${security.symbol}`,
  );
  // **The disc moved WITH the node, and where to is MEASURED rather than
  // computed** — `clampPan` may have shortened the drag, and reproducing its
  // bound here would be the second copy of the frontend's arithmetic this
  // file's own header refuses to make.
  //
  // **It is measured off a DIFFERENT node, and that is this task's own
  // finding.** The obvious move — re-run `discoverNodes` and look the selected
  // symbol up — is wrong once something is selected: the plate falls back to
  // the selection at every point over nothing, so the sweep records the
  // selected symbol at the first empty coordinate it scans. It read `0` dark
  // pixels at a coordinate in clear space and looked exactly like a disc that
  // had stopped being drawn. A pan translates every node by the same delta, so
  // a witness node's own before/after is the delta, exactly.
  const panned = await discoverNodes(page);
  const witnessTo = panned[witness.security.symbol];
  if (witnessTo === undefined)
    throw new Error(`${witness.security.symbol} left the canvas in the pan`);

  const movedTo = {
    x: at.x + (witnessTo.x - witness.at.x),
    y: at.y + (witnessTo.y - witness.at.y),
  };

  expect(movedTo).not.toStrictEqual(at);
  await expect.poll(() => darkPixelsAround(page, movedTo)).toBeGreaterThan(0);

  // **`Reset view` leaves the selection alone** (Done-when 4) — it is named
  // for the view, and clearing is a click on empty canvas's job (and
  // `Escape`'s, from Task 6.4.3).
  await topologyRegion(page)
    .getByRole("button", { name: /Reset view/u })
    .click();

  await expect(tickerAnchor(page)).toHaveCount(1);
  await expect(tickerAnchor(page)).toHaveAttribute(
    "href",
    `/securities/${security.symbol}`,
  );
  expect(await plateLine(page, "ticker")).toBe(security.symbol);

  await expectNothingFailedToRender(page);
});

test("clicking a different node moves the selection, and clicking empty canvas clears it", async ({
  page,
}) => {
  const universe = await securities(page);
  await serveFeed(page, { overview: overviewWith(undefined) });

  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();
  await topologyCanvas(page).scrollIntoViewIfNeeded();

  const found = await discoverNodes(page);
  const first = await pickCleanEquity(page, found, universe);
  const second = await pickCleanEquity(
    page,
    found,
    universe.filter((security) => security.symbol !== first.security.symbol),
    first.at,
  );
  const empty = await discoverEmptyPoint(page);

  await clickAt(page, first.at);
  await expect(tickerAnchor(page)).toHaveAttribute(
    "href",
    `/securities/${first.security.symbol}`,
  );

  // **Not additive** — one selection, moved.
  await clickAt(page, second.at);
  await expect(tickerAnchor(page)).toHaveCount(1);
  await expect(tickerAnchor(page)).toHaveAttribute(
    "href",
    `/securities/${second.security.symbol}`,
  );
  // The disc moved with the selection: gone from the first node, present on
  // the second. `pickCleanEquity` measured both patches clear at rest, so
  // `0` and `> 0` is the whole assertion.
  await expect.poll(() => darkPixelsAround(page, first.at)).toBe(0);
  await expect.poll(() => darkPixelsAround(page, second.at)).toBeGreaterThan(0);

  // **Empty canvas is the mouse-only reader's way back** (Done-when 1).
  await clickAt(page, empty);

  await expect(tickerAnchor(page)).toHaveCount(0);
  await expect.poll(() => plateState(page)).toBe("idle");
  expect(await plateLine(page, "ticker")).toBe("");
  await expect(plate(page)).toContainText(
    "Point at a security, or press Tab and the arrow keys.",
  );
  await expect.poll(() => darkPixelsAround(page, second.at)).toBe(0);
  expect(pathNow(page)).toBe("/");

  await expectNothingFailedToRender(page);
});

test("a drag that ends over a different node selects neither end", async ({
  page,
}) => {
  const universe = await securities(page);
  await serveFeed(page, { overview: overviewWith(undefined) });

  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();
  await topologyCanvas(page).scrollIntoViewIfNeeded();

  const found = await discoverNodes(page);
  const from = pick(found, universe, "equity");
  const to = pick(
    found,
    universe.filter((security) => security.symbol !== from.security.symbol),
    "equity",
  );

  // Done-when 2, and the reason `isTopologyClick` exists: without a threshold
  // a pan that happens to finish over a node would navigate a reader somewhere
  // they were not asking to go — the same hazard this screen's own "the figure
  // is never the link" rule is written against, arriving on a canvas.
  await page.mouse.move(from.at.x, from.at.y);
  await page.mouse.down();
  await page.mouse.move(to.at.x, to.at.y, { steps: 14 });
  await page.mouse.up();

  await expect(tickerAnchor(page)).toHaveCount(0);
  expect(await regionControls(page)).toStrictEqual([
    "button · Reset view — the market topology",
    SECTOR_FILTER_CONTROL,
  ]);
  expect(pathNow(page)).toBe("/");

  await expectNothingFailedToRender(page);
});

test("activating the one anchor produces exactly one outcome — AC 6's determinism claim", async ({
  page,
}) => {
  const universe = await securities(page);
  await serveFeed(page, { overview: overviewWith(undefined) });

  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();
  await topologyCanvas(page).scrollIntoViewIfNeeded();

  const found = await discoverNodes(page);
  const { security, at } = pick(found, universe, "equity");

  await clickAt(page, at);

  // **The complete control set, enumerated rather than sampled**, immediately
  // before the activation — so *exactly one outcome* is a claim about a
  // surface whose every affordance has been counted, not about the one this
  // spec happened to click.
  expect(await regionControls(page)).toStrictEqual([
    "button · Reset view — the market topology",
    SECTOR_FILTER_CONTROL,
    `link · ${security.symbol}`,
  ]);

  await tickerAnchor(page).click();

  // One outcome: the address is that security's page, and it is the security
  // the BACKEND named rather than one this spec furnished.
  await expect.poll(() => pathNow(page)).toBe(`/securities/${security.symbol}`);
  await expect(
    page.getByRole("heading", { level: 1, name: /Security Explorer/u }),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
});

// ---------------------------------------------------------------------------
// **The accessible path** (Task 6.4.4) — what this region ANNOUNCES, where
// focus goes when the one anchor is taken away, and the one case nothing below
// a browser can see: pointer and keyboard interleaved.
//
// ## Why here rather than in the keyboard spec
//
// Two of the three subjects below need **real coordinates** — a pointer has to
// hover a specific node and then the keyboard has to walk to a different one —
// and {@link discoverNodes} is the expensive apparatus that produces them. The
// keyboard driving it needs in return is `tabToCanvas` and `focused`, which are
// thirty lines; `discoverNodes` is sixty and is this file's own docblocked
// account of why the sweep is synthetic and every assertion is not. Moving the
// cheap half beats copying the expensive one.
//
// ## What `axe` is and is not, recorded explicitly because the task asks
//
// `expectNoAxeViolations` is a **gate and a floor, never coverage** —
// `e2e/support/axe.ts`' own docblock argues this at length and Story 1.9's
// rejection of an axe pass as accessibility coverage stands unchanged. What it
// can see here is contrast against the real cascade and the whole-document
// rules a Storybook fragment structurally cannot satisfy. What it cannot see is
// every claim this task is actually about: whether a `role="status"` region
// empty on mount and later filled is **spoken at all**, whether an unprompted
// polite update queues behind a sentence in progress or replaces it, and
// whether six facts arriving as one sentence are pleasant to listen to. Those
// are a person with a real screen reader's, and `docs/GAPS.md` carries them.

/** The region's one announcement region — Task 6.4.4's own element. */
const announcement = (page: Page) =>
  topologyRegion(page).locator('p[role="status"]');

/**
 * The active element, as `tagName` and the ticker it carries if it is the one
 * anchor — `overview-market-topology-keyboard.spec.ts`' own helper, because
 * *where focus landed* is the one thing only this level can see.
 *
 * Read in one `evaluate` rather than through two locators, because the claim is
 * about one instant and two round trips can straddle a focus move.
 */
async function focused(
  page: Page,
): Promise<{ readonly tag: string; readonly ticker: string | null }> {
  return page.evaluate(() => {
    const element = document.activeElement;
    return {
      tag: element === null ? "none" : element.tagName,
      ticker:
        element instanceof HTMLElement
          ? (element.dataset.ticker ?? null)
          : null,
    };
  });
}

/**
 * Walk `Tab` from the region's own `<section>` until the canvas has focus.
 *
 * `Tab` rather than `canvas.focus()`: a tab stop a reader cannot reach by
 * tabbing is not a tab stop.
 */
async function tabToCanvas(page: Page): Promise<number> {
  await topologyRegion(page).focus();

  for (let stops = 1; stops <= 4; stops += 1) {
    await page.keyboard.press("Tab");
    if ((await focused(page)).tag === "CANVAS") return stops;
  }

  throw new Error("Tab never reached the topology canvas from its own region");
}

/** Press a key and wait for the plate to name `expected`. */
async function pressFor(
  page: Page,
  key: string,
  expected: string,
): Promise<void> {
  await page.keyboard.press(key);
  // **Polled, never read once** — Task 6.4.2's own lesson: the plate is
  // written synchronously from the renderer's callback but the React commit
  // that replaces the ticker element with an anchor is not.
  await expect.poll(() => plateLine(page, "ticker")).toBe(expected);
}

/** Open `/` with a quiet feed and bring the region into view. */
async function openForAccess(page: Page): Promise<void> {
  await serveFeed(page, { overview: overviewWith(undefined) });
  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();
  await topologyCanvas(page).scrollIntoViewIfNeeded();
}

test("the announcement region is one hidden live region, silent until a selection changes", async ({
  page,
}) => {
  const universe = await securities(page);
  await openForAccess(page);

  // **Exactly one, and it is a `status`.** Two live regions in one place is
  // `FRONTEND-STATE.md` §7's hazard — two regions updated in the same moment,
  // queued in an order no component controls.
  await expect(announcement(page)).toHaveCount(1);
  await expect(announcement(page)).toHaveAttribute("role", "status");

  // **Silent on arrival**, which is what stops a page the reader has only just
  // opened announcing something.
  await expect(announcement(page)).toHaveText("");

  // **And it takes no room, which is the one thing only a browser can see.**
  // `composes: visuallyHidden` is a class-name concatenation resolved by
  // stylesheet order (CLAUDE.md's own named trap), and a CSS-module typo is
  // completely silent below here — it typechecks, lints, builds and renders
  // the sentence in the middle of the graph.
  const box = await announcement(page).boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width).toBeLessThanOrEqual(2);
  expect(box?.height).toBeLessThanOrEqual(2);

  const found = await discoverNodes(page);
  const { security, at } = pick(found, universe, "equity");

  // **Hover says nothing**, at pointer-move cadence and at rest.
  await page.mouse.move(at.x, at.y);
  await expect.poll(() => plateLine(page, "ticker")).toBe(security.symbol);
  await expect(announcement(page)).toHaveText("");

  // **Selecting speaks**, and the sentence is grounded against
  // `GET /securities` fetched by this spec rather than against the page.
  await clickAt(page, at);
  // **A throw rather than a `?? "technology"` fallback.** An equity with no
  // sector is not a state this universe has, and the alternative spelling
  // would turn one into an assertion against somebody else's sector label —
  // green on an expectation nobody wrote, which is this suite's own named
  // trap one file over.
  const sector = security.sector;
  if (sector === null)
    throw new Error(`${security.symbol} is an equity with no sector`);

  await expect
    .poll(() => announcement(page).textContent())
    .toBe(
      `Selected ${security.symbol}, ${security.name}, ` +
        `${SECTOR_LABELS[sector]}, Not scored yet.`,
    );

  // **The structural sentence is untouched** — two imperative writers, two
  // nodes, and this is the only level both are visible in one DOM.
  await expect(
    topologyRegion(page).getByText(/^A graph of every security we track/u),
  ).toHaveCount(1);

  await expectNothingFailedToRender(page);
});

test("pointer and keyboard interleaved — the keyboard's node is the one that opens, AC 7", async ({
  page,
}) => {
  const universe = await securities(page);
  await openForAccess(page);

  const found = await discoverNodes(page);
  const { security: hoveredOnly, at } = pick(found, universe, "equity");

  // **1. A real pointer hovers node X.** Nothing is selected yet, so there is
  // nothing to open and nothing to announce.
  await page.mouse.move(at.x, at.y);
  await expect.poll(() => plateLine(page, "ticker")).toBe(hoveredOnly.symbol);
  await expect(announcement(page)).toHaveText("");
  await expect(tickerAnchor(page)).toHaveCount(0);

  // **2. The keyboard takes over and walks to a DIFFERENT node.** The first
  // key seeds the centre of the market, whichever key it is — `TOPOLOGY_HUB`
  // comes from `@marketpulse/shared`, not from the page.
  await tabToCanvas(page);
  await page.keyboard.press("ArrowDown");
  // **Polled on the ANNOUNCEMENT rather than on the plate, and that is the
  // state this test exists for.** The plate shows `hovered ?? chosen`, so
  // while the pointer is still physically over X the ticker line reads X —
  // not the node the key just selected. The announcement is the selection's
  // own observable, which is what makes it readable here at all.
  await expect
    .poll(() => announcement(page).textContent())
    .toContain(`Selected ${TOPOLOGY_HUB},`);
  expect(TOPOLOGY_HUB).not.toBe(hoveredOnly.symbol);

  // **The two states coexist and the plate shows the one it is supposed to.**
  // The pointer is still physically over X; the selection is the hub. The
  // plate shows the HOVERED node — so the ticker on screen is X — and there is
  // therefore NO anchor, because an anchor here would be a destination the
  // reader cannot see (`topologyOpenableSymbol`'s third case).
  //
  // This is the state-collision case nothing below a browser can produce: it
  // needs a real pointer position and a real key press to exist at once.
  await expect(tickerAnchor(page)).toHaveCount(0);
  expect(await plateLine(page, "ticker")).toBe(hoveredOnly.symbol);

  // **3. Move the pointer off the graph**, which is what a reader who has
  // switched to the keyboard does without thinking about it. The plate
  // returns to the SELECTION rather than to the idle instruction, and the
  // anchor comes back.
  await page.mouse.move(at.x, at.y - 400);
  await expect.poll(() => plateLine(page, "ticker")).toBe(TOPOLOGY_HUB);
  await expect(tickerAnchor(page)).toHaveCount(1);
  await expect(tickerAnchor(page)).toHaveAttribute(
    "href",
    `/securities/${TOPOLOGY_HUB}`,
  );

  // **4. `Enter` opens the KEYBOARD's node.** Focus is back on the anchor, so
  // this is the browser's own activation of an `<a href>`.
  await expect
    .poll(() => focused(page))
    .toStrictEqual({
      tag: "A",
      ticker: TOPOLOGY_HUB,
    });
  await page.keyboard.press("Enter");

  await expect.poll(() => pathNow(page)).toBe(`/securities/${TOPOLOGY_HUB}`);
  // **Not the node the pointer was over**, which is the whole assertion.
  expect(pathNow(page)).not.toBe(`/securities/${hoveredOnly.symbol}`);
  await expect(
    page.getByRole("heading", { level: 1, name: /Security Explorer/u }),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
});

test("a pointer crossing a different node does not drop a keyboard reader to the body", async ({
  page,
}) => {
  // **The defect Task 6.4.4 found, from the one level it is reachable at.**
  // `renderer-canvas.ts`' `Escape` handler claimed `Region`'s dropped-focus
  // backstop catches an anchor removed under a focused reader; it does not —
  // the removal is driven by `MarketTopology`'s own state, so `Region` never
  // re-renders and its layout effect never runs again. The reachable gesture
  // is not `Escape` (already covered) but a plain mouse movement over a
  // different node while a keyboard reader holds the anchor.
  const universe = await securities(page);
  await openForAccess(page);

  const found = await discoverNodes(page);
  const { security: other, at } = pick(found, universe, "equity");

  await tabToCanvas(page);
  await pressFor(page, "ArrowDown", TOPOLOGY_HUB);
  await expect
    .poll(() => focused(page))
    .toStrictEqual({ tag: "A", ticker: TOPOLOGY_HUB });
  expect(other.symbol).not.toBe(TOPOLOGY_HUB);

  // The anchor goes, because the plate is now naming a node that is not the
  // selection.
  await page.mouse.move(at.x, at.y);
  await expect(tickerAnchor(page)).toHaveCount(0);

  // **Back on the canvas**, which is where `Escape` already puts a reader —
  // inside the region rather than on the body, and able to carry straight on.
  await expect
    .poll(() => focused(page))
    .toStrictEqual({
      tag: "CANVAS",
      ticker: null,
    });

  // And carrying on works: the next arrow key moves from where they were.
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => plateLine(page, "ticker")).not.toBe(other.symbol);

  await expectNothingFailedToRender(page);
});

test("axe is clean in every state this story adds — a floor, never coverage", async ({
  page,
}) => {
  const universe = await securities(page);
  await openForAccess(page);

  // **1. Idle** — the plate's instruction, the hidden sentence, the hidden
  // key hints and an empty live region.
  await expectNoAxeViolations(page, "the market topology, nothing selected");

  const found = await discoverNodes(page);
  const { at } = pick(found, universe, "equity");

  // **2. Hovering, by a real pointer.** The plate holds four facts and the
  // ticker is plain text rather than a link.
  await page.mouse.move(at.x, at.y);
  await expect(plate(page)).toHaveAttribute("data-topology-readout", "reading");
  await expectNoAxeViolations(page, "the market topology, a node hovered");

  // **3. Selected by a POINTER** — the one anchor exists, unfocused. Its
  // accessible name is the bare ticker, which is the case `link-name` and
  // `color-contrast` both have an opinion about.
  await clickAt(page, at);
  await expect(tickerAnchor(page)).toHaveCount(1);
  await expectNoAxeViolations(
    page,
    "the market topology, a node selected by pointer",
  );

  // **4. Selected by a KEYBOARD** — the same anchor with DOM focus on it, and
  // the live region holding a sentence rather than empty, which is a different
  // accessibility tree from state 3 rather than the same one.
  await page.keyboard.press("Escape");
  // **The pointer comes off the graph first**, or the plate goes on reading
  // the hovered node and `pressFor`'s observable is the wrong one — the
  // interleaved test above is where that distinction is the subject.
  await page.mouse.move(at.x, at.y - 400);
  await expect(plate(page)).toHaveAttribute("data-topology-readout", "idle");
  await tabToCanvas(page);
  await pressFor(page, "ArrowDown", TOPOLOGY_HUB);
  await expect
    .poll(() => focused(page))
    .toStrictEqual({ tag: "A", ticker: TOPOLOGY_HUB });
  await expect(announcement(page)).not.toHaveText("");
  await expectNoAxeViolations(
    page,
    "the market topology, a node selected by keyboard, focus on the anchor",
  );

  await expectNothingFailedToRender(page);
});
