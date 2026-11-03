import type {
  WireAnomalyBands,
  WireMarketBreadth,
  WireMarketMovers,
  WireMarketOverview,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";

// **The anomaly band reaches the graph, live, without losing a reader's pan**
// (Task 6.3.3) — the browser-level half of Done-when 2 and 3, which neither a
// unit test (jsdom has no 2d context) nor the real backend (CI's store has
// zero bars and no composite generation, so it can never produce a PRESENT
// section to transition away from) can exercise.
//
// ## Why `serveFeed`, not the real backend, for these two claims specifically
//
// `overview-market-topology.spec.ts` already proves the structural half
// (census, sizing, no refusal) against the real backend, because the topology
// is a function of the universe REQUEST alone. The anomaly band is different:
// it is a function of the OVERVIEW aggregate, which needs stored composite
// scores CI never has. So these two specs mock the socket — `GET /securities`
// still hits the real backend (`serveFeed` never routes it), so the graph
// itself and the real tracked universe's own tickers are genuine; only the
// `anomalyBands` section is authored, which is the one piece of data no
// gated run can otherwise produce.
//
// ## Full-canvas pixel comparison, not per-node coordinates
//
// `fit.ts`'s affine transform (the fit scale, the pan, the zoom) is
// frontend-internal and this package only imports `@marketpulse/shared` — so
// rather than reproduce that math to find one node's exact screen position,
// these specs read the canvas's own rendered bytes (`toDataURL()`) and
// compare them whole. "Unchanged" is exactly byte-identical; "changed" is
// not, and a positive control proves the comparison can see a real change
// before it is trusted to prove an absence of one.

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

const COHORT: WireAnomalyBands["cohort"] = {
  factors: ["price", "excess"],
  max: 75,
  scored: 2,
  others: 0,
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

/** `NVDA` elevated, everything else (including `AAPL`) drawn `normal`. */
const BANDS_A: WireAnomalyBands = {
  normal: ["AAPL"],
  elevated: ["NVDA"],
  high: [],
  extreme: [],
  cohort: COHORT,
};

/** The same two symbols, swapped — a genuinely different picture from A. */
const BANDS_B: WireAnomalyBands = {
  normal: ["NVDA"],
  elevated: [],
  high: ["AAPL"],
  extreme: [],
  cohort: COHORT,
};

const topologyCanvas = (page: Page) =>
  page
    .getByRole("region", { name: "Market topology" })
    .getByRole("img", { name: /A graph of every security we track/u });

/** The canvas's own rendered bytes, as a data URL — compared whole. */
const canvasImage = (page: Page): Promise<string> =>
  topologyCanvas(page).evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );

/**
 * The canvas's bytes, once they have stopped changing on their own.
 *
 * **Mount is not one draw, it is at least two.** `measure()` runs once
 * synchronously at mount (against whatever box exists in that instant) and
 * again from the `ResizeObserver`'s own first callback a tick later, once
 * the real box is known — both calls `invalidate()`, so a snapshot taken
 * between them is real but about to be superseded by nothing this test
 * caused. Polling two consecutive, identical reads is what tells "settled"
 * from "about to change anyway" without hard-coding how many renders that
 * takes.
 */
async function settledCanvasImage(page: Page): Promise<string> {
  let previous = await canvasImage(page);

  await expect
    .poll(async () => {
      const current = await canvasImage(page);
      const same = current === previous;
      previous = current;
      return same;
    })
    .toBe(true);

  return previous;
}

test("a band update redraws the canvas — the positive control for every comparison below", async ({
  page,
}) => {
  const feed = await serveFeed(page, { overview: overviewWith(BANDS_A) });
  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();

  const before = await settledCanvasImage(page);

  feed.sendOverview(overviewWith(BANDS_B));
  // `invalidate()` schedules a redraw on the next animation frame; polling
  // is what makes this robust against exactly which tick it lands on.
  await expect.poll(() => canvasImage(page)).not.toBe(before);

  await expectNothingFailedToRender(page);
});

test("a frame whose band section is missing leaves the picture exactly as it was — AC 5", async ({
  page,
}) => {
  const feed = await serveFeed(page, { overview: overviewWith(BANDS_A) });
  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();

  const served = feed.overviews();
  const withBands = await settledCanvasImage(page);

  // **The section is absent, everything else still furnished** — a rollback,
  // a previous image, or two nightly tables a session apart (STORY.md AC 5),
  // never a frame this gateway's own producer could not build.
  feed.sendOverview(overviewWith(undefined));
  await expect
    .poll(() => feed.overviews(), { timeout: 10_000 })
    .toBeGreaterThan(served);

  // A moment for a wrongly-triggered redraw to have happened, if one would —
  // and then confirmed settled rather than caught mid-animation-frame.
  await page.waitForTimeout(250);
  expect(await settledCanvasImage(page)).toBe(withBands);

  await expectNothingFailedToRender(page);
});

test("pan survives a live band update without re-mounting the renderer", async ({
  page,
}) => {
  const feed = await serveFeed(page, { overview: overviewWith(BANDS_A) });
  await page.goto(OVERVIEW);

  const canvas = topologyCanvas(page);
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (box === null) throw new Error("the topology canvas has no box");

  const centreX = box.x + box.width / 2;
  const centreY = box.y + box.height / 2;

  // **The centre of a fresh fit is `SPY`'s own diamond** — the layout's
  // origin, which `fitView` centres in the box at zoom 1, pan 0. This is a
  // property of the layout's own construction (`buildTopologyLayout`), not
  // of this spec's math, so no affine transform needs reproducing here.
  const atRest = await settledCanvasImage(page);

  // A deliberate, generous drag — well past any plausible node radius, so a
  // failure to clear it is not a near-miss.
  await page.mouse.move(centreX, centreY);
  await page.mouse.down();
  await page.mouse.move(centreX + 180, centreY + 140, { steps: 8 });
  await page.mouse.up();

  const panned = await settledCanvasImage(page);
  expect(panned).not.toBe(atRest);

  const served = feed.overviews();
  feed.sendOverview(overviewWith(BANDS_B));
  await expect
    .poll(() => feed.overviews(), { timeout: 10_000 })
    .toBeGreaterThan(served);

  // **The claim**: the picture changed again (the new bands drew), but it
  // did not change BACK to the at-rest fit — which is what a re-mount would
  // do, because mounting always starts from `fitView(layout, viewport)`.
  await expect.poll(() => canvasImage(page)).not.toBe(panned);
  expect(await canvasImage(page)).not.toBe(atRest);

  await expectNothingFailedToRender(page);
});
