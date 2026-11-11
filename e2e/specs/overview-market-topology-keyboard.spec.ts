import { SECTORS, SECTOR_ETFS, TOPOLOGY_HUB } from "@marketpulse/shared";
import type {
  SecuritiesResponse,
  Security,
  WireMarketBreadth,
  WireMarketMovers,
  WireMarketOverview,
} from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";
import { backendOrigin } from "../support/pair.js";

// **Keyboard input on the market topology** (Task 6.4.3) — the tree walk, the
// focus ring, and `Enter` as the browser's own activation.
//
// Its own file rather than a third half of `overview-market-topology-hover.
// spec.ts`, which is 905 lines of pointer behaviour: the subject here is a
// different input device, it needs none of that file's expensive coordinate
// discovery (a walk is driven by symbol, not by pixels), and the one thing it
// does share — reading the plate — is four lines.
//
// ## What is grounded OUTSIDE the page
//
// `MARKET-OVERVIEW.md` §9's trap 8, and the lesson Task 5.2.4 added at full
// strength: a pass-through spec proves **fidelity, never correctness**, so a
// page agreeing with itself is no evidence at all. Every symbol this spec
// expects is computed from **`GET /securities`, fetched by this spec**, plus
// `@marketpulse/shared`'s own domain vocabulary — `SECTORS` for the ring's
// drawn order and `SECTOR_ETFS` for each sector's benchmark. None of it comes
// from the frontend: `topology/walk.ts` is the thing under test and a spec
// that imported it would be asserting that a function agrees with itself.
//
// ## Where focus landed is the one thing only this level can see
//
// Done-when 5. jsdom has no 2d context, so the renderer is unreachable below
// here; and `document.activeElement` after a key press is a fact no unit test
// of a pure walk can produce. Both are asserted on every key below — the
// SELECTION through the plate's own `data-readout` lines, and FOCUS through
// the active element's `data-ticker`.

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

/**
 * A real overview frame with **no** `anomalyBands` section — CI's permanent
 * state, and the one this spec wants for a second reason: the frame is sent
 * once on connect and never again, so the canvas this spec takes digests of is
 * not being redrawn by a band update underneath it.
 */
const OVERVIEW_FRAME: WireMarketOverview = {
  computedAt: AT,
  observedAt: AT,
  feeds: ["iex"],
  figures: [],
  breadth: BREADTH,
  movers: MOVERS,
};

/** `GET /securities`, fetched by this spec and not by the page. */
async function securities(page: Page): Promise<readonly Security[]> {
  const response = await page.request.get(`${backendOrigin}/securities`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as SecuritiesResponse;
  return body.securities.filter((security) => security.status === "active");
}

const topologyRegion = (page: Page) =>
  page.getByRole("region", { name: "Market topology" });

const topologyCanvas = (page: Page) =>
  topologyRegion(page).getByRole("img", {
    name: /A graph of every security we track/u,
  });

const plate = (page: Page) =>
  topologyRegion(page).locator("[data-topology-readout]");

/** The plate's ticker line — which node the renderer says is selected. */
const plateTicker = async (page: Page): Promise<string> =>
  (
    (await plate(page).locator('[data-readout="ticker"]').textContent()) ?? ""
  ).trim();

/** Which state the plate is in — `idle` or `reading`. */
const plateState = (page: Page): Promise<string | null> =>
  plate(page).getAttribute("data-topology-readout");

/**
 * The active element, as `tagName` and the ticker it carries if it is the one
 * anchor.
 *
 * **Read in one `evaluate` rather than through two locators**, because the
 * claim is about one instant: *this element, and it is the anchor for this
 * symbol*. Two round trips can straddle a focus move.
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
 * A digest of every pixel this renderer has painted — the one
 * machine-checkable proof that the focus ring was **drawn** (Done-when 3).
 *
 * A canvas mutates no DOM, so every other assertion in this file would be
 * byte-identical with the ring never painted. Story 6.3's own before/after
 * pattern, with a whole-canvas hash rather than a counted patch: this task's
 * subject is *the drawing changed when focus moved and changed back when it
 * left*, which is a claim about the frame rather than about a magnitude, and a
 * hash needs no calibration to argue about.
 *
 * FNV-1a over the backing store, in the page, so the payload is a number
 * rather than a megabyte of data URL.
 */
async function canvasDigest(page: Page): Promise<string> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const context = canvas?.getContext("2d") ?? null;
    if (canvas === null || context === null) return "no canvas";

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let hash = 0x81_1c_9d_c5;

    for (const byte of data) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01_00_01_93);
    }

    // **The box travels with the hash**, because the one thing that can make
    // two digests differ without anybody pressing a key is the canvas being
    // re-fitted into a box that changed size — a chrome row growing, a
    // scrollbar arriving. Comparing two hashes taken at two different box
    // sizes is comparing two different pictures, and the failure reads as
    // *the drawing changed* when it was the frame.
    return `${String(hash >>> 0)} @ ${String(canvas.width)}×${String(canvas.height)}`;
  });
}

/**
 * The digest once it has stopped moving — **two equal reads in a row**.
 *
 * Task 6.4.2's own hard-won lesson, generalised: `invalidate()` schedules its
 * redraw on the next animation frame, so a canvas read taken immediately after
 * anything is a read that may precede its own paint. A bare read at rest is
 * worse than that one, because the baseline is what every later comparison is
 * against.
 */
async function settledDigest(page: Page): Promise<string> {
  let previous = await canvasDigest(page);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(100);
    const next = await canvasDigest(page);
    if (next === previous && next !== "no canvas") return next;
    previous = next;
  }

  throw new Error("the topology canvas never settled to a stable digest");
}

/**
 * Walk Tab from the region's own `<section>` until the canvas has focus, and
 * answer how many stops it took.
 *
 * **`Tab` rather than `canvas.focus()`**, which is Done-when 1's own first
 * clause: a tab stop a reader cannot reach by tabbing is not a tab stop. The
 * stops before it are the region itself (ADR 0039 — `Panel`'s `scrollable`
 * makes the `<section>` focusable unconditionally) and the controls in its
 * head, so the expected count is small and is **asserted** rather than used,
 * because a surprising number means a stop appeared that nobody designed.
 *
 * **It was 2 until 2026-11-11, then 3, and is now 4** — and the assertion did
 * exactly what this docblock says it is for, twice in two tasks: Task 6.8.1
 * added the `Sector` filter to this region's head and Task 6.8.2 added `Band`
 * beside it, and the count moved loudly both times, in the one place that was
 * watching. The four are the section, the sector filter, the band filter and
 * `Reset view`; neither filter's own destinations are stops, because both
 * panels are shut until they are pressed.
 */
async function tabToCanvas(page: Page): Promise<number> {
  await topologyRegion(page).focus();

  for (let stops = 1; stops <= 5; stops += 1) {
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
  // **Polled, never read once.** The plate is written synchronously from the
  // renderer's callback, but the React commit that replaces the ticker element
  // with an anchor is not, and Task 6.4.2's review found exactly this race on
  // the canvas side of the same change.
  await expect.poll(() => plateTicker(page)).toBe(expected);
}

/** The eleven benchmarks in the ring's own drawn order. */
const RING = SECTORS.map((sector) => SECTOR_ETFS[sector]);

/**
 * One wedge's benchmark, by position, or a throw.
 *
 * `noUncheckedIndexedAccess` is on, and the alternative spelling (`?? ""`)
 * would turn a ring that lost a member into an assertion against the empty
 * string — green on an expectation nobody wrote. A throw names the index.
 */
function wedge(index: number): string {
  const symbol = RING.at(index);
  if (symbol === undefined)
    throw new Error(`the ring has no wedge at ${String(index)}`);
  return symbol;
}

/** One cluster member, by position, or a throw. See {@link wedge}. */
function member(members: readonly string[], index: number): string {
  const symbol = members.at(index);
  if (symbol === undefined)
    throw new Error(`the cluster has no member at ${String(index)}`);
  return symbol;
}

/** The technology cluster's members, from the backend's own universe. */
function technologyMembers(universe: readonly Security[]): readonly string[] {
  return universe
    .filter(
      (security) =>
        security.kind === "equity" && security.sector === SECTORS[0],
    )
    .map((security) => security.symbol)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

/** Open `/`, with a quiet feed, and bring the region into view. */
async function openOverview(page: Page): Promise<void> {
  await serveFeed(page, { overview: OVERVIEW_FRAME });
  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();
  // Before any key: `page.keyboard` acts on whatever has focus, and at 390
  // this region is ~2,100 px down the page.
  await topologyCanvas(page).scrollIntoViewIfNeeded();

  // **Wait for the anomaly bands to have been APPLIED**, which is the one
  // thing on this canvas that redraws it without anybody pressing anything —
  // and the defect that found this clause is worth recording. The furnished
  // frame carries no `anomalyBands` section, so the route answers it by
  // drawing every equity `unscored` (hollow, an outline rather than a fill):
  // a redraw of 501 nodes, arriving whenever the socket connects. A canvas
  // digest taken before it is a **baseline of a different picture**, and the
  // last assertion of the bytes test — *back to the baseline when the ring
  // and the selection are both gone* — then fails on a difference that has
  // nothing to do with either. It passed four times at one worker and failed
  // at four, which is the shape of a race rather than of a defect.
  //
  // The sentence is the observable: `applyAnomalyBands` rewrites the drawn
  // graph's text equivalent in the same call that redraws the canvas.
  await expect(
    topologyRegion(page).getByText(/every one is unscored/u),
  ).toHaveCount(1);

  // **And wait for the self-hosted faces, which is the SECOND thing that
  // redraws this canvas without anybody pressing a key.**
  //
  // The renderer draws fifteen labels with `context.font` set from
  // `--font-sans` and `--font-data`. A canvas does not re-paint when a webfont
  // arrives — it paints with whatever was loaded at the time — so a baseline
  // taken before `Inter`/the data face resolve is a picture in the fallback
  // glyphs, and the *next* redraw (the first key press) silently switches
  // every label to the real ones. The difference then survives to the end of
  // the test and the final *back to the baseline* assertion fails on a
  // sector label rather than on a focus ring.
  //
  // Found by hunting: 2 failures in 96 executions at four workers, with the
  // canvas box **identical** in both readings (`998×413`), which is what
  // ruled out a re-fit and left the drawing itself.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 780 },
] as const) {
  const at = `${String(viewport.width)}×${String(viewport.height)}`;

  test(`the arrow keys walk the tree, clamped in a cluster and wrapped around the ring — ${at}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const universe = await securities(page);
    const members = technologyMembers(universe);
    expect(members.length).toBeGreaterThan(2);

    await openOverview(page);

    // **1. Tab lands on the canvas**, and the count is asserted so a stop
    // appearing in this region is a failure rather than a silent extra press.
    expect(await tabToCanvas(page)).toBe(4);
    expect(await plateState(page)).toBe("idle");

    // **2. The first key seeds the centre**, whichever key it is — *focus is
    // never a state with nothing in it*. `SPY` comes from `@marketpulse/
    // shared`'s `TOPOLOGY_HUB`, not from the page.
    await pressFor(page, "ArrowDown", TOPOLOGY_HUB);
    // **And focus followed it onto the one anchor**, which is what makes
    // `Enter` below the browser's own activation of an `<a href>`.
    expect(await focused(page)).toStrictEqual({
      tag: "A",
      ticker: TOPOLOGY_HUB,
    });

    // **3. Down ENTERS the ring at the first drawn wedge** — `SECTORS`'
    // declared order, which is the order the layout allocates wedges in, and
    // NOT `graph.clusters`' sorted-by-id order.
    await pressFor(page, "ArrowDown", wedge(0));

    // **4. Right and Left move around the ring.**
    await pressFor(page, "ArrowRight", wedge(1));
    await pressFor(page, "ArrowLeft", wedge(0));

    // **5. The ring WRAPS, because it is drawn as a closed ellipse.** Left
    // from the first wedge is the last one, not a dead key.
    await pressFor(page, "ArrowLeft", wedge(-1));
    await pressFor(page, "ArrowRight", wedge(0));

    // **6. Down enters the cluster at its first member, in ticker order.**
    await pressFor(page, "ArrowDown", member(members, 0));
    expect(await focused(page)).toStrictEqual({
      tag: "A",
      ticker: member(members, 0),
    });

    // **7. End and Home jump to the ends of the CURRENT group**, which is now
    // the cluster rather than the ring.
    await pressFor(page, "End", member(members, -1));

    // **8. And the cluster CLAMPS: a ranking is not a ring.** Pressing Right
    // at the last member leaves the reader exactly where they were — asserted
    // by pressing it and then proving the selection is unchanged with a
    // SECOND, different key, so this is not a wait that passed because
    // nothing had happened yet.
    await page.keyboard.press("ArrowRight");
    await pressFor(page, "Home", member(members, 0));
    await page.keyboard.press("ArrowLeft");
    await pressFor(page, "End", member(members, -1));

    // **9. Up LEAVES, the exact reverse of down at each level.**
    await pressFor(page, "ArrowUp", wedge(0));
    await pressFor(page, "ArrowUp", TOPOLOGY_HUB);
    // Nothing above the centre of the market: `Up` here is a no-op rather
    // than a wrap to somewhere else.
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => plateTicker(page)).toBe(TOPOLOGY_HUB);

    await expectNothingFailedToRender(page);
  });

  test(`Enter opens the selected security and Escape clears it without leaving the region — ${at}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openOverview(page);
    await tabToCanvas(page);

    // **Escape first, while nothing is selected: not ours to swallow.** The
    // page is unmoved and the plate is still idle.
    await page.keyboard.press("Escape");
    expect(await plateState(page)).toBe("idle");

    await pressFor(page, "ArrowDown", TOPOLOGY_HUB);
    await pressFor(page, "ArrowDown", wedge(0));

    // **Escape clears the selection and keeps focus in the region** —
    // Done-when 1. Focus goes back to the canvas rather than to the body,
    // which is what stops `Region`'s own dropped-focus backstop taking the
    // reader a level further out than they asked.
    await page.keyboard.press("Escape");
    await expect.poll(() => plateState(page)).toBe("idle");
    expect(await plateTicker(page)).toBe("");
    expect(await focused(page)).toStrictEqual({ tag: "CANVAS", ticker: null });
    await expect(plate(page).getByRole("link")).toHaveCount(0);

    // And the reader can carry straight on: the next key seeds the centre
    // again.
    await pressFor(page, "ArrowRight", TOPOLOGY_HUB);
    await pressFor(page, "ArrowDown", wedge(0));

    // **`Enter` is the ANCHOR's own native activation.** Nothing in any
    // topology source file calls `navigate()` or touches `location` — the
    // selection moved focus onto an `<a href>` resolved at render from the
    // node's own identity, and this is the browser following it.
    await page.keyboard.press("Enter");

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/securities/${wedge(0)}`);
    await expect(
      page.getByRole("heading", { level: 1, name: /Security Explorer/u }),
    ).toBeVisible();

    await expectNothingFailedToRender(page);
  });

  test(`the canvas's drawn bytes change when focus arrives and when it leaves — ${at}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openOverview(page);

    // The baseline, settled: nothing selected, nothing focused.
    const atRest = await settledDigest(page);
    expect(atRest).not.toBe("no canvas");

    await tabToCanvas(page);
    await pressFor(page, "ArrowDown", TOPOLOGY_HUB);

    // **Something is drawn** — the ground disc and the ring together.
    const focusedSelected = await settledDigest(page);
    expect(focusedSelected).not.toBe(atRest);

    // **Focus leaves, the selection STAYS**, so the only thing that can have
    // changed between these two readings is the ring. This is the one
    // assertion in this repository that the focus ring is **drawn** — a
    // canvas mutates no DOM, so every word on the plate would be
    // byte-identical with it never painted — and it was proved by a plant
    // rather than trusted: with the draw disabled it fails **here**, at both
    // widths, with the rest of the file still collecting.
    for (let press = 0; press < 3; press += 1) {
      await page.keyboard.press("Shift+Tab");
    }

    const unfocusedSelected = await settledDigest(page);
    expect(unfocusedSelected).not.toBe(focusedSelected);
    // And the ground disc is still there, which is what makes the line above
    // a claim about the ring rather than about the selection having been lost.
    expect(unfocusedSelected).not.toBe(atRest);
    expect(await plateTicker(page)).toBe(TOPOLOGY_HUB);

    // **With nothing selected, focus draws nothing** — the ring goes with the
    // selection, which is *changes back when it leaves* stated as a pair of
    // readings taken seconds apart rather than as a comparison with a
    // baseline from the top of the test.
    //
    // **The baseline comparison was the first spelling and it was WRONG**:
    // `expect(final).toBe(atRest)` failed about 1 run in 25 at four workers,
    // bit-exactly (`431109558` against `2994644590`, same `308×413` box), and
    // the cause is not the ring at all — anything that re-mounts the renderer
    // mid-test (a retried `GET /securities` landing a fresh universe array,
    // which a restarting dev backend produces) draws every equity `normal`
    // instead of `unscored`, because the band map reaches a renderer through
    // `setBands` and a fresh one has not had the call yet. A whole-canvas
    // digest compared across a whole test is a claim about every pixel on the
    // screen, and only two of them are this task's.
    await tabToCanvas(page);
    await page.keyboard.press("Escape");
    await expect.poll(() => plateState(page)).toBe("idle");

    const focusedEmpty = await settledDigest(page);

    for (let press = 0; press < 2; press += 1) {
      await page.keyboard.press("Shift+Tab");
    }

    const unfocusedEmpty = await settledDigest(page);

    expect(focusedEmpty).toBe(unfocusedEmpty);
    // And the ground disc went with the selection.
    expect(unfocusedEmpty).not.toBe(unfocusedSelected);

    await expectNothingFailedToRender(page);
  });
}

test("an unhandled key reaches the page untouched", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openOverview(page);
  await tabToCanvas(page);

  // **The `default: return` arm, from the one side that can see it.**
  // `preventDefault()` is called only on a key this region answers, which is
  // what keeps `Tab`, the browser's own shortcuts and every printable
  // character working over a 998 px canvas. `PageDown` is the one of those
  // with an observable this spec can read: the page scrolls.
  const before = await page.evaluate(() => globalThis.scrollY);
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => page.evaluate(() => globalThis.scrollY))
    .not.toBe(before);
  // And it selected nothing on its way past.
  expect(await plateState(page)).toBe("idle");

  await expectNothingFailedToRender(page);
});
