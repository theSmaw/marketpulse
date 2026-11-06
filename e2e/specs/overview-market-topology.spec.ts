import {
  buildTopologyGraph,
  toTicker,
  withCorrelationEdges,
} from "@marketpulse/shared";
import type {
  RelationshipsResponse,
  SecuritiesResponse,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { backendOrigin } from "../support/pair.js";

// **`Market topology`, the first region on `/` a gated machine can verify for
// real** (Task 6.2.5, Story 6.2's acceptance criterion 9's browser-level
// half).
//
// ## Why this spec is possible at all, and nothing else on `/` has one like it
//
// Every other region on this route is a function of the overview AGGREGATE,
// which needs stored bars to hold a figure at all — CI's store has 516
// securities and **zero bars**, so `overview-breadth-region.spec.ts` and its
// siblings can assert shape and refusal but never a real number. The topology
// is a function of the universe REQUEST alone (`MarketTopology`'s own
// `useSecurities()` call — Task 6.2.4's finding), and `GET /securities`
// succeeds on every store that exists, bars or none. So this is the one
// region where a gated run can compare a real, independently recomputed
// answer against what actually drew.
//
// ## Out-of-frame grounding, not a frame-derived assertion
//
// `overview-breadth-counts.spec.ts`'s own lesson, reused rather than
// reinvented: four overview specs once passed against a server with its
// ranking deleted, each furnishing the frame it then checked. The guard
// against that shape is to fetch `GET /securities` **independently** of
// whatever the page claims, and recompute the expected answer from the SAME
// pure, shipped function (`buildTopologyGraph`) the application calls on
// its own fetch — never to read the drawn page and declare it self-consistent.

/** `GET /securities`, from the backend the running pair resolved — never the
 * page's own fetch, so this spec's expectation is independent of it. */
async function securities(page: Page): Promise<SecuritiesResponse> {
  const response = await page.request.get(`${backendOrigin}/securities`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as SecuritiesResponse;
}

test("the drawn graph: a sized canvas, no refusal, and a census independently recomputed from GET /securities", async ({
  page,
}) => {
  const body = await securities(page);
  const active = body.securities.filter(
    (security) => security.status === "active",
  );
  // The same pure function `MarketTopology.tsx` calls (`topologySource` →
  // `buildTopologyGraph`), over data this spec fetched itself — so the
  // expectation below is not "the page agrees with itself."
  const expected = buildTopologyGraph(active);

  await page.goto("/");
  await expectNothingFailedToRender(page);

  const region = page.getByRole("region", { name: "Market topology" });
  await expect(region).toBeVisible();

  // **The refusal sentence is absent.** Every other region's browser-level
  // verification is permanently blind to this negative on CI's zero-bar
  // store; this region can actually fail (a null 2d context), so asserting
  // its ABSENCE is real coverage rather than a tautology.
  await expect(
    region.getByText(/could not be drawn in this browser/u),
  ).toHaveCount(0);

  // `role="img"` is the canvas's own accessible name carrier (Task 6.2.4) —
  // the one selector that reaches it without a test id.
  const canvas = region.getByRole("img");
  await expect(canvas).toBeVisible();

  // **Non-zero, and derived from the real box × devicePixelRatio — never a
  // constant.** `measure()` sets `canvas.width/height` from
  // `container.getBoundingClientRect()` scaled by `devicePixelRatio`; a
  // hard-coded size would happen to be non-zero too, so the assertion is the
  // arithmetic relationship rather than only the sign.
  const readDims = () =>
    canvas.evaluate((element) => {
      const node = element as HTMLCanvasElement;
      // **The container's box, not the canvas's own** — `measure()` reads
      // `container.getBoundingClientRect()` (`.frame`, the canvas's parent),
      // and `.frame` carries a 1px border on every side that the canvas's
      // own rendered box sits inside of. Reading the canvas's own rect here
      // instead was off by exactly that border, in both axes.
      const container = node.parentElement;
      const box = container?.getBoundingClientRect();
      return {
        width: node.width,
        height: node.height,
        expectedWidth:
          box === undefined
            ? -1
            : Math.round(box.width * globalThis.devicePixelRatio),
        expectedHeight:
          box === undefined
            ? -1
            : Math.round(box.height * globalThis.devicePixelRatio),
      };
    });

  // **Polled rather than read once.** The `ResizeObserver` that keeps the
  // bitmap in step with the box fires a tick after the layout it is reacting
  // to, so a read taken in the same instant as a late, sub-pixel reflow (a
  // font swap, a scrollbar) can catch the two mid-chase. The relationship —
  // not a fixed number — is the claim, and it is the same relationship
  // whichever tick it settles on.
  await expect
    .poll(async () => {
      const dims = await readDims();
      return (
        dims.width === dims.expectedWidth &&
        dims.height === dims.expectedHeight &&
        dims.width > 0
      );
    })
    .toBe(true);

  // **The census, read off the one number the drawn graph's text equivalent
  // states** (`topologyDrawnSentence` deliberately omits a security count —
  // Task 6.2.4 — so the sector count is the only figure there is to check),
  // and compared against the independently recomputed graph rather than
  // trusted from the page.
  const sentence = region.locator("p", {
    hasText: /^A graph of every security we track/u,
  });
  await expect(sentence).toHaveText(
    new RegExp(
      `grouped into ${String(expected.clusters.length)} sectors `,
      "u",
    ),
  );
});

// ---------------------------------------------------------------------------
// The measured edge layer (Task 6.5.2).
//
// ## What a gated run can and cannot see here
//
// CI's store has 516 securities, **zero bars, no provider and no nightly
// correlation pass** — so `GET /market-data/relationships` answers
// `{"correlations":[]}` with no `pass` there, for ever, and the only assertion
// a gated run makes below is the one about **that** state. The ink assertion
// is conditional on the route reporting retained pairs, which happens on a
// developer's populated store and nowhere else.
//
// That is stated rather than hidden, because a conditional assertion in a
// browser spec is otherwise indistinguishable from a passing one.

/** `GET /market-data/relationships`, fetched independently of the page. */
async function relationships(page: Page): Promise<RelationshipsResponse> {
  const response = await page.request.get(
    `${backendOrigin}/market-data/relationships`,
  );
  expect(response.ok()).toBe(true);
  return (await response.json()) as RelationshipsResponse;
}

/** The canvas's own pixels, as a data URL. */
function ink(page: Page): Promise<string> {
  return page
    .getByRole("region", { name: "Market topology" })
    .getByRole("img")
    .evaluate((element) => (element as HTMLCanvasElement).toDataURL());
}

test("the measured edges: the sentence states what is drawn, recomputed independently from the route", async ({
  page,
}) => {
  const body = await relationships(page);
  const universe = await securities(page);
  const active = universe.securities.filter(
    (security) => security.status === "active",
  );

  await page.goto("/");
  await expectNothingFailedToRender(page);

  const region = page.getByRole("region", { name: "Market topology" });
  const sentence = region.locator("p", {
    hasText: /^A graph of every security we track/u,
  });

  if (body.pass === undefined) {
    // **CI's permanent state**, and the one a gated run actually drives: no
    // pass has ever run, so the region says so rather than drawing an
    // edge-less graph with nothing explaining why.
    await expect(sentence).toHaveText(/has not been measured here/u);
    expect(body.correlations).toEqual([]);
    return;
  }

  // The same pure, shipped functions the application calls on its own fetch,
  // over data this spec fetched itself — so the expectation below is not "the
  // page agrees with itself". `overview-breadth-counts.spec.ts`' own rule, and
  // the one that caught four specs furnishing the order they then checked.
  const graph = withCorrelationEdges(
    buildTopologyGraph(active),
    body.correlations.map((row) => ({
      low: toTicker(row.low),
      high: toTicker(row.high),
      r: row.r,
    })),
  );

  const measured = graph.edges.filter(
    (edge) => edge.kind === "return_correlation",
  );

  if (measured.length === 0) {
    await expect(sentence).toHaveText(/closely enough to draw/u);
    return;
  }

  const reach = new Set(measured.flatMap((edge) => [edge.from, edge.to]));
  const equities = graph.nodes.filter((node) => node.kind === "equity").length;
  // `measured.length === 1 ? "pair" : "pairs"` — `MarketTopology.tsx`'s own
  // idiom, matched here rather than hard-coded, since the real deployed
  // generation could in principle retain exactly one pair.
  const drawnNoun = measured.length === 1 ? "pair" : "pairs";

  await expect(sentence).toHaveText(
    new RegExp(
      `${measured.length.toLocaleString("en-US")} ${drawnNoun}, reaching ${reach.size.toLocaleString("en-US")} of the ${equities.toLocaleString("en-US")} equities`,
      "u",
    ),
  );
});

test("the measured edges: an edge is actually DRAWN, and losing the measurement costs no other ink", async ({
  page,
}) => {
  const body = await relationships(page);

  // **The control arm: the same page with the measurement blocked.** Two
  // drawings of one universe at one size, differing only in whether the
  // correlation request succeeded — which is the only way a canvas can be
  // asked *did this layer draw anything*, there being no DOM for a stroke.
  await page.route("**/market-data/relationships*", (route) => route.abort());
  await page.goto("/");
  await expectNothingFailedToRender(page);

  const region = page.getByRole("region", { name: "Market topology" });
  await expect(region.getByRole("img")).toBeVisible();

  // **The degraded state, asserted on the way past**: the universe loaded and
  // the measurement did not, and the graph is still drawn and still says so.
  await expect(
    region.locator("p", { hasText: /^A graph of every security we track/u }),
  ).toHaveText(/could not be read/u);
  await expect(
    region.getByText(/could not be drawn in this browser/u),
  ).toHaveCount(0);

  const withoutEdges = await ink(page);

  await page.unroute("**/market-data/relationships*");
  await page.goto("/");
  await expectNothingFailedToRender(page);
  await expect(region.getByRole("img")).toBeVisible();

  if (body.pass === undefined || body.correlations.length === 0) {
    // Nothing was retained, so the two arms are the same picture by
    // construction and there is no ink to find. This is CI, permanently.
    return;
  }

  // The drawn frame has to settle before the pixels are read: the
  // `ResizeObserver` draws once at mount and the measurement arrives on its
  // own request a moment later.
  await expect.poll(async () => (await ink(page)) !== withoutEdges).toBe(true);
});
