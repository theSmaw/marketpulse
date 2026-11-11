import { SECTOR_LABELS } from "@marketpulse/shared";
import type {
  SecuritiesResponse,
  Security,
  Sector,
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

// **Narrowing the market topology to one sector** (Task 6.8.1).
//
// ## This spec can assert a real FIGURE, which almost nothing on `/` can
//
// `overview-market-topology.spec.ts`' own reason, inherited whole: every other
// region on this route is a function of the overview AGGREGATE and needs
// stored bars to hold a figure, and CI's store has 516 securities and **zero
// bars**. The topology is a function of the universe REQUEST alone, and a
// sector filter is a function of the `sector` column on it — so the population
// this region states while narrowed is independently recomputable here, on
// every machine, from a `GET /securities` **this spec fetches itself**.
//
// That grounding is the point rather than a flourish. `MARKET-OVERVIEW.md`
// §9's trap 8: a pass-through spec proves fidelity and never correctness, so a
// producer broken into inventing a figure is drawn exactly as faithfully as a
// correct one. The count below is compared against the backend's own answer,
// never against the page's.
//
// ## What is NOT asserted here, and where it is
//
// Which nodes draw ink is the canvas's business and a canvas mutates no DOM.
// The narrowing itself is pure and is covered at the unit level
// (`topology/filter.test.ts`), the keyboard's agreement with it in
// `topology/walk.test.ts`, and the no-re-mount claim on the producer side in
// `MarketTopology.test.tsx`. What is only reachable HERE is the round trip: a
// press moves the address, a cold address reproduces the picture, and a pan
// survives the press.

const OVERVIEW = "/";

/** `GET /securities`, fetched by this spec and not by the page. */
async function securities(page: Page): Promise<readonly Security[]> {
  const response = await page.request.get(`${backendOrigin}/securities`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as SecuritiesResponse;
  return body.securities.filter((security) => security.status === "active");
}

const region = (page: Page) =>
  page.getByRole("region", { name: "Market topology" });

const trigger = (page: Page) =>
  region(page).getByRole("button", { name: /^Sector/u });

const note = (page: Page) => region(page).locator("[data-topology-filter]");

const plate = (page: Page) => region(page).locator("[data-topology-readout]");

const readoutTicker = async (page: Page): Promise<string> =>
  (
    (await plate(page).locator('[data-readout="ticker"]').textContent()) ?? ""
  ).trim();

/** Where the address says we are, path and query together. */
const addressNow = (page: Page): string => {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
};

/** The sector with the most tracked equities — the biggest visible change. */
function biggestSector(universe: readonly Security[]): {
  readonly sector: Sector;
  readonly count: number;
} {
  const counts = new Map<Sector, number>();

  for (const security of universe) {
    if (security.kind !== "equity") continue;
    const { sector } = security;
    counts.set(sector, (counts.get(sector) ?? 0) + 1);
  }

  const ranked = [...counts].sort(([, left], [, right]) => right - left);
  const first = ranked[0];
  if (first === undefined) throw new Error("no equity has a sector");

  return { sector: first[0], count: first[1] };
}

/** How many equities the backend tracks at all — the note's denominator. */
const equityCount = (universe: readonly Security[]): number =>
  universe.filter((security) => security.kind === "equity").length;

/**
 * Where, **inside the canvas's own box**, the readout first names each ticker
 * — swept with synthetic events, exactly as
 * `overview-market-topology-hover.spec.ts` does and for its stated reason:
 * `fit.ts`' affine transform is frontend-internal, and reproducing it here
 * would be a second copy of the arithmetic.
 *
 * **Canvas-relative rather than page coordinates, and that is a repair rather
 * than a preference** — found by watching this file's pan test fail: following
 * a `<Link>` in the region's own chrome leaves the page scrolled by ~211 px
 * (the panel closes, the focused link is removed, and the browser moves on),
 * so a page coordinate taken before a filter press names a different part of
 * the graph afterwards. The canvas's box is read at the moment of every
 * pointer move instead.
 *
 * Every assertion below re-reads those coordinates with the **real** pointer,
 * so the sweep is a search and the mouse is the subject.
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

    for (let y = 2; y < box.height; y += 7) {
      for (let x = 2; x < box.width; x += 7) {
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
          found[ticker] = { x, y };
        }
      }
    }

    canvas.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    return found;
  });
}

/**
 * **Wait for the canvas before sweeping it** — found the hard way: a sweep run
 * the instant `/` settles returns `{}`, because `GET /securities` takes
 * 174–277 ms and the renderer does not exist until it lands. An empty sweep
 * then reads as *the hub is not drawn*, which is a true statement about a page
 * that has not drawn anything yet and a false one about this product.
 */
async function drawnCanvas(page: Page): Promise<void> {
  await expect(region(page).getByRole("img")).toBeVisible();
}

/**
 * Hover a point **inside the canvas's box** with the real pointer, and read
 * what the plate names. The box is read now rather than remembered — see
 * {@link discoverNodes} for the scroll that made that necessary.
 */
async function hoverAt(
  page: Page,
  at: { readonly x: number; readonly y: number },
): Promise<string> {
  const box = await page.locator("canvas").first().boundingBox();
  if (box === null) throw new Error("the canvas has no box");

  await page.mouse.move(box.x + at.x, box.y + at.y);
  return readoutTicker(page);
}

/**
 * Where one symbol is NOW, searched in a small box around a guess.
 *
 * **The pan is CLAMPED, so a drag of 120 px does not move the market by
 * 120 px** (`fit.ts`' own rule — a reader can never lose the market entirely)
 * — found by writing this test the other way first, asserting the hub would be
 * exactly where the drag put it, and watching it name nothing at all. What the
 * assertions below actually need is *did it move, and is it still there after
 * a filter press*, which is a search rather than an arithmetic prediction.
 */
async function whereIs(
  page: Page,
  symbol: string,
  near: { readonly x: number; readonly y: number },
): Promise<{ readonly x: number; readonly y: number } | null> {
  return page.evaluate(
    ({ symbol: wanted, near: around }) => {
      const canvas = document.querySelector("canvas");
      const readout = document.querySelector('[data-readout="ticker"]');
      if (canvas === null || readout === null) return null;

      for (let radius = 0; radius <= 160; radius += 4) {
        for (let dy = -radius; dy <= radius; dy += 4) {
          for (let dx = -radius; dx <= radius; dx += 4) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;

            const x = around.x + dx;
            const y = around.y + dy;
            const box = canvas.getBoundingClientRect();
            if (document.elementFromPoint(box.left + x, box.top + y) !== canvas)
              continue;

            canvas.dispatchEvent(
              new PointerEvent("pointermove", {
                clientX: box.left + x,
                clientY: box.top + y,
                bubbles: true,
              }),
            );

            if (readout.textContent === wanted) return { x, y };
          }
        }
      }

      canvas.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
      return null;
    },
    { symbol, near },
  );
}

test("a press narrows the graph, states a population GET /securities agrees with, and moves the address", async ({
  page,
}) => {
  const universe = await securities(page);
  const { sector, count } = biggestSector(universe);
  const tracked = equityCount(universe);

  await page.goto(OVERVIEW);
  await expectNothingFailedToRender(page);

  // Nothing is narrowed, so there is no note at all — an absence of a clause
  // rather than a clause about an absence.
  await expect(note(page)).toHaveCount(0);
  await expect(trigger(page)).toContainText("All sectors");

  await trigger(page).click();
  await region(page)
    .getByRole("link", { name: SECTOR_LABELS[sector], exact: true })
    .click();

  // **The address carries it**, which is AC 2 and the whole of what makes the
  // picture shareable.
  await expect.poll(() => addressNow(page)).toBe(`/?sector=${sector}`);

  // **The figures are the backend's own**, recomputed here rather than read
  // off the page and declared self-consistent.
  await expect(note(page)).toContainText(
    `${String(count)} of the ${String(tracked)} companies we track — ${SECTOR_LABELS[sector]}`,
  );

  // The control names what is on screen, and the panel is shut again.
  await expect(trigger(page)).toContainText(SECTOR_LABELS[sector]);
  await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");

  // **The accessible sentence carries the same claim**, which is AC 7: the
  // canvas has no accessible content of its own, so a narrowed graph that said
  // nothing here would be a picture of 21 nodes described as the whole market.
  await expect(
    region(page).getByRole("img", { name: /Narrowed to/u }),
  ).toHaveCount(1);
});

test("a cold address reproduces the narrowed picture, and an unrecognised one draws the whole market and says so", async ({
  page,
}) => {
  const universe = await securities(page);
  const { sector, count } = biggestSector(universe);

  await page.goto(`${OVERVIEW}?sector=${sector}`);
  await expectNothingFailedToRender(page);

  await expect(note(page)).toContainText(
    `${String(count)} of the ${String(equityCount(universe))} companies we track`,
  );
  await expect(trigger(page)).toContainText(SECTOR_LABELS[sector]);

  // **`Show all` is the way back, and it is a link resolved at render** —
  // `one-home-for-imperative-navigation` is satisfied by construction here,
  // and what this asserts is the half a reader meets: the address loses the
  // parameter rather than gaining a second one.
  await region(page).getByRole("link", { name: "Show all" }).click();
  await expect.poll(() => addressNow(page)).toBe("/");
  await expect(note(page)).toHaveCount(0);

  // **An unrecognised slug is never a silent snap and never zero nodes.** The
  // display label rather than the slug is the reachable mistake: a reader who
  // types what they see on the canvas.
  await page.goto(`${OVERVIEW}?sector=${encodeURIComponent("Energy")}`);
  await expectNothingFailedToRender(page);

  await expect(note(page)).toContainText("Not a sector we track");
  await expect(trigger(page)).toContainText("All sectors");
  // The address is left exactly as the reader wrote it — this client repairs
  // nothing — and the picture is the whole market.
  expect(addressNow(page)).toBe("/?sector=Energy");
  await expect(
    region(page).getByRole("img", { name: /^A graph of every security/u }),
  ).toHaveCount(1);
});

test("a pan applied before a filter press survives it, and the canvas is never re-mounted", async ({
  page,
}) => {
  const universe = await securities(page);
  const { sector } = biggestSector(universe);

  await page.goto(OVERVIEW);
  await expectNothingFailedToRender(page);
  await drawnCanvas(page);

  const found = await discoverNodes(page);
  const hub = found.SPY;
  expect(hub, "the sweep did not find the hub").toBeDefined();
  if (hub === undefined) return;

  // **A mark on the canvas element itself** — a re-mount destroys the element
  // and creates a new one, so an attribute written here is the one thing that
  // cannot survive one. `framesDrawn()` is the producer-side equivalent and is
  // not reachable from a browser; `MarketTopology.test.tsx` asserts it there.
  await page
    .locator("canvas")
    .first()
    .evaluate((element) => {
      element.setAttribute("data-survives", "yes");
    });

  // A real drag: a press, a move well past `TOPOLOGY_CLICK_MAX_TRAVEL_PX`, a
  // release. The start point is the hub, which is a node — a drag beginning on
  // a node still pans, because a press is classified at the release.
  //
  // **40 px and not 120, measured rather than chosen.** A 120/60 drag takes
  // the hub off the canvas entirely — `clampPan` keeps the MARKET in view, not
  // any particular node, and at the default fit the centre has that much room
  // to travel. The claim this test makes is *the pan survived*, which needs a
  // pan small enough that there is still something to find afterwards.
  const box = await page.locator("canvas").first().boundingBox();
  if (box === null) throw new Error("the canvas has no box");

  await page.mouse.move(box.x + hub.x, box.y + hub.y);
  await page.mouse.down();
  await page.mouse.move(box.x + hub.x - 40, box.y + hub.y + 20, { steps: 10 });
  await page.mouse.up();

  const panned = await whereIs(page, "SPY", hub);
  expect(panned, "the hub is nowhere near where the pan put it").not.toBeNull();
  if (panned === null) return;
  expect(
    Math.hypot(panned.x - hub.x, panned.y - hub.y),
    "the drag moved the market by less than one node",
  ).toBeGreaterThan(16);

  await trigger(page).click();
  await region(page)
    .getByRole("link", { name: SECTOR_LABELS[sector], exact: true })
    .click();
  await expect.poll(() => addressNow(page)).toBe(`/?sector=${sector}`);

  // **AC 3's rewritten claim**: neither a re-mount nor a reset view. A
  // re-mounted renderer would fit the view fresh, putting the hub back where
  // the sweep first found it; a `reset()` would do the same without the
  // element changing. Both are refused by one reading.
  await expect(page.locator("canvas").first()).toHaveAttribute(
    "data-survives",
    "yes",
  );
  // **Polled rather than read once**, and the reason is the same scroll
  // {@link discoverNodes} carries: following the link leaves the page moving,
  // so a single `boundingBox()` read taken in that instant can be a box the
  // pointer then lands outside of. The claim is the hub's position **inside
  // the canvas**, which is settled; where that box is on the page is not, for
  // a frame or two.
  await expect
    .poll(() => hoverAt(page, panned), {
      message: "the filter press reset the reader's pan",
    })
    .toBe("SPY");
});

test("a filter that excludes the selected security clears it, with its own sentence", async ({
  page,
}) => {
  const universe = await securities(page);
  const { sector } = biggestSector(universe);

  await page.goto(OVERVIEW);
  await expectNothingFailedToRender(page);
  await drawnCanvas(page);

  const found = await discoverNodes(page);

  // A security the filter below will exclude — any equity NOT in the sector
  // about to be chosen, discovered rather than named, so this does not depend
  // on which securities the running store happens to hold.
  const excluded = universe.find(
    (security) =>
      security.kind === "equity" &&
      security.sector !== sector &&
      found[security.symbol] !== undefined,
  );
  expect(
    excluded,
    "the sweep found no equity outside the chosen sector",
  ).toBeDefined();
  if (excluded === undefined) return;

  const at = found[excluded.symbol];
  if (at === undefined) return;

  // A click: a press and a release with no meaningful travel between them,
  // which is what `isTopologyClick` admits. The coordinates are the canvas's
  // own — see {@link discoverNodes}.
  const box = await page.locator("canvas").first().boundingBox();
  if (box === null) throw new Error("the canvas has no box");

  await page.mouse.move(box.x + at.x, box.y + at.y);
  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(() => readoutTicker(page)).toBe(excluded.symbol);

  await trigger(page).click();
  await region(page)
    .getByRole("link", { name: SECTOR_LABELS[sector], exact: true })
    .click();

  // **Its own sentence, naming the security** — never the generic wording a
  // plain `Escape` uses, because a reader who pressed a sector and heard
  // *Selection cleared.* has been told that something happened and not what.
  await expect(region(page).locator('[role="status"]')).toHaveText(
    `${excluded.symbol} is not in this filter, so the selection was cleared.`,
  );

  // And focus is not on the body: the reader's hands are on the control they
  // just pressed, which is where they still are.
  const focused = await page.evaluate(
    () => document.activeElement?.tagName ?? "NONE",
  );
  expect(focused).not.toBe("BODY");
});

// --- Task 6.8.2: the band, stacked, and the refusal -----------------------
//
// ## Two halves measured against two different servers, on purpose
//
// **The refusal runs against the REAL backend** and is the one arm of this
// feature a gated machine can exercise: CI's store has 516 securities, zero
// bars and no composite generation, so the route's own fallback marks every
// equity `unscored` and the scored cohort is zero, for ever. `pnpm store:bare`
// reproduces that shape locally in seconds and this arm was verified against
// it rather than only against a furnished frame — which is this task's own
// Work item, and the distinction matters because the furnished arms below
// cannot reach the refusal at all.
//
// **The drawable arms furnish `anomalyBands` through `serveFeed`**, exactly as
// `overview-market-topology-anomaly-bands.spec.ts` does and for its stated
// reason: `GET /securities` still hits the real backend, so the graph and the
// tickers are genuine; only the one section no gated run can produce is
// authored. Everything these arms assert is a figure this spec computes
// itself from the furnished section — never a figure read off the page and
// declared self-consistent (`MARKET-OVERVIEW.md` §9's trap 8).

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
  scored: 4,
  others: 0,
};

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

/** The band section this spec's figures are computed from. */
const bandsOf = (
  high: readonly string[],
  extreme: readonly string[],
  normal: readonly string[],
): WireAnomalyBands => ({
  normal: [...normal],
  elevated: [],
  high: [...high],
  extreme: [...extreme],
  cohort: COHORT,
});

const bandTrigger = (page: Page) =>
  region(page).getByRole("button", { name: /^Band/u });

/** The note's own line, which is written imperatively by two writers. */
const noteLine = (page: Page) =>
  region(page).locator("[data-topology-filter-line]");

test("a band filter against an UNSCORED store refuses with a stated reason rather than drawing an empty market", async ({
  page,
}) => {
  // **Furnished through the shipped socket, and the reason is a measurement
  // this task took rather than a convenience.** The arm was written against
  // the real backend first and went red on this developer's own store, which
  // HAS run the nightly composite pass: it drew `122 of the 501 companies we
  // track are high or extreme` — the first time a band cut has been drawn
  // anywhere, and consistent with Task 6.3.1's own measured session (21.9%
  // `high` plus 3.3% `extreme` of 485 scored ≈ 122). So *the store has no
  // scores* is a property of the STORE and cannot be asserted against
  // whichever one the runner happens to have.
  //
  // What is furnished is one thing only: an `overview` frame with **no**
  // `anomalyBands` section. Everything downstream of that is the shipped
  // product — `MarketOverview.tsx`'s own AC-4 fallback marks every equity
  // `unscored`, the scored cohort is zero, and `narrowTopology` refuses. That
  // is byte-for-byte the state CI, `pnpm store:bare` and the first ~46 s of
  // every cold deploy are in, reached by the route's own policy rather than by
  // a mock of the component.
  //
  // **Verified against a real `pnpm store:bare` run as well**, which is this
  // task's own Work item: a backend on `marketpulse_bare` (516 securities,
  // zero bars, no composite generation) serves exactly this sentence with no
  // furnishing at all. The transcript is in the task record.
  await serveFeed(page, { overview: overviewWith(undefined) });
  await page.goto(`${OVERVIEW}?band=high,extreme`);
  await expectNothingFailedToRender(page);
  await drawnCanvas(page);

  await expect(noteLine(page)).toHaveText(
    "Nothing here has been scored yet, so the graph can't be narrowed by band.",
  );

  // **The whole market is still drawn**, which is the half that makes the
  // refusal a refusal rather than a caption over an empty frame: the canvas's
  // own accessible sentence is the unnarrowed one, and the region raises no
  // refusal of its own.
  await expect(
    region(page).getByRole("img", { name: /^A graph of every security/u }),
  ).toHaveCount(1);
  await expect(
    region(page).getByRole("img", { name: /Narrowed to/u }),
  ).toHaveCount(0);

  // The control names what is in force, and the way back clears it.
  await expect(bandTrigger(page)).toContainText("high or extreme");
  await region(page).getByRole("link", { name: "Show all" }).click();
  await expect.poll(() => addressNow(page)).toBe("/");
  await expect(note(page)).toHaveCount(0);
});

test("a band press moves the address, stacks with the sector, and states both clauses", async ({
  page,
}) => {
  const universe = await securities(page);
  const { sector, count } = biggestSector(universe);
  const tracked = equityCount(universe);

  // Four securities banded, chosen out of the real sector this spec just
  // measured — so the intersection below is this spec's own arithmetic.
  const inSector: readonly string[] = universe
    .filter(
      (security) => security.kind === "equity" && security.sector === sector,
    )
    .slice(0, 3)
    .map((security) => security.symbol);
  const outside = universe.find(
    (security) => security.kind === "equity" && security.sector !== sector,
  );
  expect(
    outside,
    "the universe holds no equity outside the biggest sector",
  ).toBeDefined();
  if (outside === undefined) return;

  const high = [inSector[0] ?? "", outside.symbol].filter((s) => s !== "");
  const extreme = [inSector[1] ?? ""].filter((s) => s !== "");
  const normal = [inSector[2] ?? ""].filter((s) => s !== "");

  await serveFeed(page, {
    overview: overviewWith(bandsOf(high, extreme, normal)),
  });
  await page.goto(OVERVIEW);
  await expectNothingFailedToRender(page);
  await drawnCanvas(page);

  await expect(note(page)).toHaveCount(0);

  // --- The band alone.
  await bandTrigger(page).click();
  await region(page).getByRole("link", { name: "high", exact: true }).click();
  await expect.poll(() => addressNow(page)).toBe("/?band=high");

  await expect(noteLine(page)).toHaveText(
    `${String(high.length)} of the ${String(tracked)} companies we track are high`,
  );

  // --- A second band STACKS as a union rather than replacing the first.
  await bandTrigger(page).click();
  await region(page)
    .getByRole("link", { name: "extreme", exact: true })
    .click();
  await expect.poll(() => addressNow(page)).toBe("/?band=high%2Cextreme");

  await expect(noteLine(page)).toHaveText(
    `${String(high.length + extreme.length)} of the ${String(tracked)} companies we track are high or extreme`,
  );

  // --- And the sector INTERSECTS it: the band is a cut within the sector's
  // own population, which is the two-clause grammar this task shipped.
  await trigger(page).click();
  await region(page)
    .getByRole("link", { name: SECTOR_LABELS[sector], exact: true })
    .click();

  const bothInSector = [...high, ...extreme].filter((symbol) =>
    inSector.includes(symbol),
  ).length;

  await expect(noteLine(page)).toHaveText(
    `${String(count)} of the ${String(tracked)} companies we track are in ` +
      `${SECTOR_LABELS[sector]}, and ${String(bothInSector)} of those are ` +
      `high or extreme`,
  );

  // The accessible sentence carries the same claim — AC 7, with two criteria.
  await expect(
    region(page).getByRole("img", {
      name: new RegExp(
        `Narrowed to ${SECTOR_LABELS[sector]} and high or extreme`,
        "u",
      ),
    }),
  ).toHaveCount(1);

  // **One `Show all` clears both**, and nothing else in the address.
  await region(page).getByRole("link", { name: "Show all" }).click();
  await expect.poll(() => addressNow(page)).toBe("/");
});

test("a live band update never takes the reader's own selection away, and never re-speaks", async ({
  page,
}) => {
  // **The hardest claim in this task, and the only level it is reachable
  // at.** The criterion changes at reader cadence and the data under it at
  // feed cadence — so a security that falls out of the active band on a batch
  // stays drawn, stays selected and stays reachable, which is the same
  // reasoning this product already applies to a revised bar under a
  // crosshair. A reader who CHANGES the filter is the opposite case and is
  // covered by the sector arm above.
  const universe = await securities(page);
  const equities = universe
    .filter((security) => security.kind === "equity")
    .map((security) => security.symbol);

  const subject = equities[0] ?? "";
  const others = equities.slice(1, 4);
  expect(subject).not.toBe("");

  const feed = await serveFeed(page, {
    overview: overviewWith(bandsOf([subject, ...others], [], [])),
  });
  await page.goto(`${OVERVIEW}?band=high`);
  await expectNothingFailedToRender(page);
  await drawnCanvas(page);

  // The cut is drawable, so the subject is on the canvas and findable.
  await expect(noteLine(page)).toContainText("are high");

  const found = await discoverNodes(page);
  const at = found[subject];
  expect(
    at,
    `the sweep did not find ${subject} under a band cut`,
  ).toBeDefined();
  if (at === undefined) return;

  const box = await page.locator("canvas").first().boundingBox();
  if (box === null) throw new Error("the canvas has no box");

  await page.mouse.move(box.x + at.x, box.y + at.y);
  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(() => readoutTicker(page)).toBe(subject);

  const spokenBefore =
    (await region(page).locator('[role="status"]').textContent()) ?? "";
  expect(spokenBefore).toContain(`Selected ${subject}`);

  // **The batch that would drop it**: the subject is `normal` now, so the
  // `high` cut no longer matches it.
  const served = feed.overviews();
  feed.sendOverview(overviewWith(bandsOf(others, [], [subject])));
  await expect
    .poll(() => feed.overviews(), { timeout: 10_000 })
    .toBeGreaterThan(served);

  // The population moved — so the cut was genuinely re-applied against the
  // new map rather than left stale.
  await expect(noteLine(page)).toHaveText(
    `${String(others.length)} of the ${String(equityCount(universe))} companies we track are high`,
  );

  // **And the selection is exactly where the reader left it.** The plate still
  // names it, and the one anchor on this surface still points at it.
  expect(await readoutTicker(page)).toBe(subject);
  await expect(region(page).locator(`a[data-ticker="${subject}"]`)).toHaveCount(
    1,
  );

  // **The live region did not re-speak** — byte-identical, which is what
  // *silent* means for a `role="status"`: an identical re-write is still a
  // mutation a screen reader may announce.
  expect(
    (await region(page).locator('[role="status"]').textContent()) ?? "",
  ).toBe(spokenBefore);

  await expectNothingFailedToRender(page);
});

test("a RIGHT-click does not move the selection, and the native context menu is left alone", async ({
  page,
}) => {
  // **A shipped defect, found while shaping Story 6.8's Gate 1.**
  // `onPointerDown` filtered neither `button` nor `isPrimary`, so a
  // right-click started a potential click and the matching `pointerup` moved
  // the reader's selection — one press, two responses, with the plate's one
  // anchor silently re-pointed underneath an open menu.
  await page.goto(OVERVIEW);
  await expectNothingFailedToRender(page);
  await drawnCanvas(page);

  const found = await discoverNodes(page);
  const first = Object.entries(found)[0];
  expect(first, "the sweep found no node").toBeDefined();
  if (first === undefined) return;
  const [symbol, at] = first;

  const box = await page.locator("canvas").first().boundingBox();
  if (box === null) throw new Error("the canvas has no box");

  // Nothing selected to start with, which is what makes the negative below
  // readable: a right-click must leave it that way.
  await expect(region(page).locator("a[data-ticker]")).toHaveCount(0);

  await page.mouse.move(box.x + at.x, box.y + at.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });

  // **No selection.** The plate may still be READING this node under the
  // pointer — that is hover, which a right-click does not change either way —
  // so the claim is on the anchor, which exists only for a selection.
  await expect(region(page).locator("a[data-ticker]")).toHaveCount(0);

  // **And the primary button still works**, so this is a filter rather than a
  // dead handler — the positive control without which the assertion above is
  // equally satisfied by a canvas that selects nothing at all.
  await page.mouse.down();
  await page.mouse.up();
  await expect(region(page).locator(`a[data-ticker="${symbol}"]`)).toHaveCount(
    1,
  );

  await expectNothingFailedToRender(page);
});
