import { SECTOR_LABELS } from "@marketpulse/shared";
import type { SecuritiesResponse, Security, Sector } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
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
