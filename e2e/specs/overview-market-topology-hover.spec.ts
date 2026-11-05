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
    "Point at a security to see what it is.",
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
