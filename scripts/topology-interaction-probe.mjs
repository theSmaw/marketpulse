// **`node scripts/topology-interaction-probe.mjs`** — look at the topology
// under INTERACTION, against the pair you started (Task 6.4.3).
//
//   pnpm dev                                        # in another shell
//   node scripts/topology-interaction-probe.mjs
//   node scripts/topology-interaction-probe.mjs --widths 1440,390
//
// `pnpm probe`'s own spirit and its own promise: **thirty seconds, not a
// gate, not a `pnpm verify` step.** It answers *what does this look like
// right now* for the one class of question `pnpm probe` cannot reach — a
// drawing that only exists while something is hovered, selected or focused,
// on a canvas that mutates no DOM.
//
// ## Why this is not in `overview-instrument.mjs`
//
// That file is Story 4.8's production-build performance instrument: a load
// ceiling it refuses to run under, `assertProductionBuild()`, calibrators in
// their own loops, three channels each proved by a plant. Every one of those
// is there because a *timing* figure is wrong in the comfortable direction
// without it. **Nothing here is a timing figure.** What this takes is
// geometry — where ink landed, in CSS pixels — which a dev server draws
// identically to a production build because it is the same renderer reading
// the same tokens. Borrowing that file's apparatus would buy a refusal to run
// and nothing else.
//
// **And it deliberately does not re-take Story 6.2's frame-rate figures**
// (ADR 0048). That measurement needs the built Storybook, a proved plant
// inside the render loop and a settled machine; it is
// `scripts/topology-instrument.mjs`'s, and re-taking it on a dev server over
// this scripted path would produce a number that looks like ADR 0048's and is
// not comparable with it. Epic 14 owns the re-take.
//
// ## What it reports, and why each
//
//  1. **The focus ring's real geometry** — its inner and outer radius in CSS
//     pixels, measured by the DIFFERENCE method (`cleanRing`: focus out,
//     focus in, read what moved) rather than by restating the constant that
//     drew it or by matching the ring's own ink colour, which a selected-and-
//     focused node would make indistinguishable from the ground beneath it.
//     Task 6.4.3's brief says plainly that the clearance between this ring
//     and Story 6.3's `extreme` ring was flagged by arithmetic during shaping
//     and *needs a real measurement before being trusted*.
//  2. **The selection ground disc's own outer edge**, from the same read, so
//     the gap between the two is a measured difference and not two constants
//     subtracted.
//  3. **The hit target's real screen-pixel radius**, by sweeping outward from
//     a node's measured centre until the readout stops naming it — which
//     re-confirms Task 6.4.1's table from the other end (that one computed the
//     radius; this one finds the edge).
//  4. **A crop around the focused node**, at `deviceScaleFactor: 3`, because
//     the one thing no number answers is whether a light ring inside a dark
//     disc reads as a focus ring or as the disc's own border.
//  5. **Page errors**, after a scripted pan/zoom path and a scripted key
//     path. A canvas that throws on the fortieth pointer event looks exactly
//     like one that does not.
//
// The pointer/wheel path is `scripts/topology-instrument.mjs`'s `drivePath`,
// adapted to `/`'s own resizable box rather than Storybook's fixed one: the
// same three-notch zoom, the same 24-point drag polyline, the same reverse.

import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { chromium } from "@playwright/test";

import { resolvePairAddresses } from "./pair-addresses.mjs";

// **Declared once for the whole file rather than per function**, unlike
// `probe.mjs`' single browser-side helper: three things here run in the page
// (two readers and one `activeElement` read), and `no-undef` is an error in
// `scripts/*.mjs` on purpose — this comment is how a reader knows which side
// of the wire a line is on.
/* global document, PointerEvent */

const REPO_ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = resolve(REPO_ROOT, ".probe-interaction");

// `pnpm probe`'s own four, and the second copy of that list this repository
// now holds. Its own note says the condition for extracting a shared one is
// **a third home for the list**; this is it, and the extraction is left to the
// next task that needs the list rather than taken inside a measurement.
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 900 },
  { width: 768, height: 800 },
  { width: 390, height: 780 },
];

// **Every geometry below is measured by DIFFERENCE, not by colour**, and the
// first draft of this script did it the other way — matching
// `--ink-inverse`'s own `#eef0f5` in the backing store. That read **4,062
// pixels of "ring"** against a ring whose whole stroke is ~1,240 device pixels
// at this scale factor, because `--chart-grid` (`#e2e4ed`) antialiased against
// each node's white halo produces intermediates all over a canvas carrying 501
// edges — so the centroid was pulled into the middle of the market and the
// radii came out as `18.19 → 41.83` and then `Infinity`. The reading looked
// like a measurement and was a histogram of the whole picture.
//
// What replaces it needs no colour at all: snapshot the canvas, change ONE
// thing, and read the pixels that changed. Focus arriving is the ring; a
// selection arriving is the ground disc. It is also the honest definition of
// each — *what this state draws that the one before it did not*.

const widthsArgument = readWidths(process.argv.slice(2));

const resolved = await resolvePairAddresses();

if (!resolved.ok) {
  console.error(resolved.message);
  process.exit(1);
}

const { frontendOrigin } = resolved.addresses;

rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(OUTPUT_DIR, { recursive: true });

console.log(`\nProbing ${frontendOrigin}/ under interaction\n`);

const browser = await chromium.launch();
let sawAnError = false;

for (const viewport of VIEWPORTS.filter(
  (candidate) =>
    widthsArgument === null || widthsArgument.includes(candidate.width),
)) {
  // `deviceScaleFactor: 3` for the crop's sake. Every figure below is divided
  // back out to CSS pixels, so the ratio changes the picture's resolution and
  // not one number.
  const context = await browser.newContext({ viewport, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const errors = [];

  page.on("pageerror", (error) => errors.push(String(error)));

  await page.goto(`${frontendOrigin}/`, { waitUntil: "domcontentloaded" });

  const region = page.getByRole("region", { name: "Market topology" });
  const canvas = region.getByRole("img", {
    name: /A graph of every security we track/u,
  });

  await canvas.waitFor({ state: "visible", timeout: 15_000 });
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_500);

  const box = await canvas.boundingBox();

  console.log(
    `=== ${String(viewport.width)} × ${String(viewport.height)}   ` +
      `canvas ${box === null ? "no box" : `${String(Math.round(box.width))}×${String(Math.round(box.height))}`}`,
  );

  // --- 1. The scripted pointer/wheel path, before anything is measured ----
  //
  // `topology-instrument.mjs`'s `drivePath`, over this box's own centre. It is
  // driven FIRST so that everything below is measured on a canvas that has
  // already taken 50-odd pointer events and six wheel notches, and then reset
  // — which is the state a reader is in when they reach for the keyboard,
  // rather than a freshly mounted one.
  if (box !== null) await drivePath(page, box);
  await region.getByRole("button", { name: /Reset view/u }).click();
  await page.waitForTimeout(400);

  // --- 2. The scripted key path, one level of the tree at a time ----------
  //
  // Region, Tab to the canvas, then `ArrowDown` as many times as the level is
  // deep — the first press seeds the selection at the hub, the second enters
  // the ring, the third enters a cluster. So the ring is measured on an
  // EQUITY (8 px of ink, the crowded case) as well as on the two landmarks.
  await region.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const landedOn = await page.evaluate(() => document.activeElement?.tagName);
  console.log(`  tab × 2 from the region lands on  ${String(landedOn)}`);

  for (const [label, depth] of [
    ["hub", 1],
    ["sector ETF", 2],
    ["equity", 3],
  ]) {
    for (let press = 0; press < depth; press += 1) {
      await page.keyboard.press("ArrowDown");
    }
    await page.waitForTimeout(250);

    const selected = String(
      await page.locator('[data-readout="ticker"]').textContent(),
    );

    // **Focus out, selection kept** — the baseline the ring is the difference
    // from. Three `Shift+Tab` walk back out past `Reset view` and the region
    // itself; the selection survives all of it, which is Task 6.4.2's own
    // decision.
    for (let press = 0; press < 3; press += 1) {
      await page.keyboard.press("Shift+Tab");
    }
    await page.waitForTimeout(250);
    await snapshotCanvas(page, "selectedUnfocused");

    // Focus back in. Nothing else changed, so every pixel that moved is ring.
    await region.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(250);
    const ring = await diffCanvas(page, "selectedUnfocused");

    // **Escape clears the selection**, and the difference from the same
    // baseline is then the ground disc alone — both states have no ring.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    const ground = await diffCanvas(page, "selectedUnfocused");

    if (ring === null) {
      console.log(
        `  ${label.padEnd(11)} ${selected}  — NO RING: focus arriving drew nothing`,
      );
      sawAnError = true;
      continue;
    }

    // **The ground disc is only readable where the node is not crowded**, and
    // that is a fact about the picture rather than a fault in the instrument:
    // Task 6.4.2 measured the disc as *largely overpainted by its own
    // neighbours* (163 px of it surviving at one node, ~40 at another), and
    // inside a cluster at these fit scales there is often nothing of it left
    // to find. So the disc clause prints when it is there and says why when it
    // is not, rather than failing the run.
    const discClause =
      ground === null
        ? "ground disc → fully overpainted by its neighbours"
        : `ground disc → ${ground.outer.toFixed(2)} px  ` +
          `ring clears the disc edge by ${(ground.outer - ring.outer).toFixed(2)} px`;

    console.log(
      `  ${label.padEnd(11)} ${selected.padEnd(6)} ` +
        `focus ring ${ring.inner.toFixed(2)} → ${ring.outer.toFixed(2)} px ` +
        `(stroke ${(ring.outer - ring.inner).toFixed(2)}, ${String(ring.pixels)} px)  ` +
        discClause,
    );

    // 3. The hit target's own edge, from the ring's measured centre, **with
    //    nothing selected** — which is why `Escape` is pressed above before
    //    this runs. With a selection live the plate falls back to naming it at
    //    every point over nothing, so a sweep then reads the selection at
    //    every offset and reports a target 40 px wide (measured: it did).
    const reach = await measureHitReach(page, ring.centre);
    console.log(
      `  ${" ".repeat(11)} ${selected.padEnd(6)} ` +
        `hit target reaches ${reach.lastInside.toFixed(1)} px ` +
        `(first miss at ${reach.firstOutside.toFixed(1)} px)`,
    );

    // 4. The crop, for looking — re-selected, focused, so the picture is the
    //    state a reader is actually in.
    await region.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    for (let press = 0; press < depth; press += 1) {
      await page.keyboard.press("ArrowDown");
    }
    await page.waitForTimeout(250);

    await page.screenshot({
      path: resolve(
        OUTPUT_DIR,
        `${String(viewport.width)}-${label.replace(/\s+/gu, "-")}.png`,
      ),
      clip: {
        x: Math.max(0, ring.centre.pageX - 24),
        y: Math.max(0, ring.centre.pageY - 24),
        width: 48,
        height: 48,
      },
    });

    // Back to nothing selected, so the next level starts from the seed.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }

  // --- 4b. The ring against Story 6.3's own, on a node that HAS one -------
  //
  // The brief's open question, and the only way to answer it is to stand on
  // an `extreme` equity: *does the focus ring touch the anomaly ring?* The
  // arithmetic over the shipped constants says the gap is 2.5 px at zoom 1
  // (`FOCUS_RING_RADIUS − FOCUS_RING_WIDTH/2` = 10, against an `extreme`
  // ring's outer edge at `ink/2 + ANOMALY_RING_OFFSET + 3/2` = 7.5) and both
  // scale with `nodeScale`, so the floor of the zoom range is the tight case.
  // This walks the current cluster looking for a node the plate calls
  // `extreme` and measures the real one.
  //
  // **It is a fact about THIS store.** CI has zero bars and no composite
  // generation, so every equity there is `unscored` for ever and this block
  // finds nothing — which it says rather than failing.
  await region.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press("ArrowDown");
  }

  let banded = null;

  for (let press = 0; press < 80; press += 1) {
    const band = (
      (await page.locator('[data-readout="band"]').textContent()) ?? ""
    ).trim();

    if (band === "extreme" || band === "high") {
      banded = {
        band,
        symbol: String(
          await page.locator('[data-readout="ticker"]').textContent(),
        ),
      };
      break;
    }

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(40);
  }

  if (banded === null) {
    console.log(
      "  banded      — no high or extreme equity in this cluster on this store",
    );
  } else {
    // **Zoomed in on the node first, which helps but does not by itself
    // solve the neighbour problem — `measureBandRing`'s own docblock has
    // the rest.** The first version measured at the fitted scale and
    // reported an `anomaly ring → 33.24 px` against a ring whose own outer
    // edge is 7.5: inside a cluster at fit scale 0.45 the NEIGHBOURS' amber
    // rings are a few pixels away, and a colour match over a box cannot
    // tell one node's ring from the one next to it. Zooming in widens that
    // gap, because this renderer scales POSITION by the full zoom and the
    // MARK by `clampNodeScale`'s [0.5, 1.5] — but the renderer's own fit
    // SCALE is width-dependent, so the same relative zoom ceiling leaves
    // less absolute separation on a narrower viewport, and zoom alone was
    // found NOT to clear it at 1024 or 768. What actually makes the reading
    // robust at every width is the ray/first-gap method `measureBandRing`
    // now uses, which does not depend on neighbours being far enough away.
    const before = await cleanCentre(page, region);

    if (before !== null) {
      await page.mouse.move(before.pageX, before.pageY);
      for (let index = 0; index < 16; index += 1) {
        await page.keyboard.down("Control");
        await page.mouse.wheel(0, -120);
        await page.keyboard.up("Control");
      }
      await page.waitForTimeout(400);
    }

    const ring = await cleanRing(page, region);
    const band =
      ring === null ? null : await measureBandRing(page, ring.centre);

    console.log(
      ring === null || band === null || band.bandOuter === 0
        ? `  banded      ${banded.symbol} (${banded.band}) — no amber found beside the ring`
        : `  banded      ${banded.symbol.padEnd(6)} (${banded.band}) at the zoom ceiling: ` +
            `anomaly ring → ${band.bandOuter.toFixed(2)} px, ` +
            `focus ring ${ring.inner.toFixed(2)} → ${ring.outer.toFixed(2)} px, ` +
            `clearance ${(ring.inner - band.bandOuter).toFixed(2)} px`,
    );

    if (ring !== null) {
      await page.screenshot({
        path: resolve(OUTPUT_DIR, `${String(viewport.width)}-banded.png`),
        clip: {
          x: Math.max(0, ring.centre.pageX - 30),
          y: Math.max(0, ring.centre.pageY - 30),
          width: 60,
          height: 60,
        },
      });
    }
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // --- 5. The zoom extremes, where the ring is smallest and largest --------
  //
  // `clampNodeScale` bounds the drawn mark at [0.5, 1.5], so these two
  // readings are the whole range the ring can be drawn at — and the smaller
  // one is where the clearance this task's brief asks about is tightest.
  for (const [label, deltaY, notches] of [
    ["zoomed out", 120, 14],
    ["zoomed in", -120, 20],
  ]) {
    await region.getByRole("button", { name: /Reset view/u }).click();
    await page.waitForTimeout(250);

    // **The box is re-read here rather than reused, and that was a real
    // defect in this script.** Everything above moves focus around, and
    // focusing an element scrolls the page — so the box taken at the top is
    // stale by this point, the wheel lands on whatever is now at those
    // coordinates, and `zoomAbout` is never called at all. It reported the
    // zoom-1 geometry under a heading saying `zoomed out`, which is the
    // comfortable direction: a figure that looks taken.
    const zoomBox = await canvas.boundingBox();

    if (zoomBox !== null) {
      await page.mouse.move(
        zoomBox.x + zoomBox.width / 2,
        zoomBox.y + zoomBox.height / 2,
      );
      for (let index = 0; index < notches; index += 1) {
        await page.keyboard.down("Control");
        await page.mouse.wheel(0, deltaY);
        await page.keyboard.up("Control");
      }
    }

    await page.waitForTimeout(400);

    // Select the hub, then take the same focus-out/focus-in difference.
    await region.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(250);
    for (let press = 0; press < 3; press += 1) {
      await page.keyboard.press("Shift+Tab");
    }
    await page.waitForTimeout(250);
    await snapshotCanvas(page, "zoomed");
    await region.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(250);
    const ring = await diffCanvas(page, "zoomed");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);

    console.log(
      ring === null
        ? `  ${label.padEnd(11)} — nothing changed when focus arrived`
        : `  ${label.padEnd(11)} focus ring ${ring.inner.toFixed(2)} → ` +
            `${ring.outer.toFixed(2)} px (stroke ${(ring.outer - ring.inner).toFixed(2)})`,
    );
  }

  if (errors.length > 0) {
    sawAnError = true;
    console.log(`  ⚠ ${String(errors.length)} page error(s):`);
    for (const error of errors) console.log(`      ${error.split("\n")[0]}`);
  }

  console.log("");
  await context.close();
}

await browser.close();

console.log(`Crops in ${OUTPUT_DIR.replace(`${REPO_ROOT}/`, "")}/\n`);
process.exit(sawAnError ? 1 : 0);

// --- the scripted pointer path -------------------------------------------

/**
 * `scripts/topology-instrument.mjs`'s own path, over a real box.
 *
 * Fixed deltas and a fixed polyline for that file's reason — an improvised
 * path is two different drives — and `ctrl` held, because this renderer zooms
 * only on `ctrl`/`⌘` + wheel and a plain wheel is the page's scroll.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ x: number, y: number, width: number, height: number }} box
 */
async function drivePath(page, box) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);

  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -120);
    await page.keyboard.up("Control");
    await page.waitForTimeout(60);
  }

  const radiusX = Math.min(180, box.width / 4);
  const radiusY = Math.min(120, box.height / 4);
  const polyline = [];

  for (let index = 0; index < 24; index += 1) {
    const turn = (index / 24) * Math.PI * 2;
    polyline.push([
      cx + Math.cos(turn) * radiusX,
      cy + Math.sin(turn) * radiusY,
    ]);
  }

  await page.mouse.down();
  for (const [x, y] of polyline) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(12);
  }
  await page.mouse.up();

  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, 120);
    await page.keyboard.up("Control");
    await page.waitForTimeout(60);
  }

  await page.mouse.down();
  for (const [x, y] of [...polyline].reverse()) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(12);
  }
  await page.mouse.up();
}

// --- the measurements, which run in the page ------------------------------

/**
 * Keep the canvas's current pixels in the page, under `slot`.
 *
 * Held in the page rather than returned: a 996×411 canvas at
 * `deviceScaleFactor: 3` is 14.7 million bytes, and serialising that across
 * the CDP boundary twice per reading is the one thing in this script that
 * would stop it being thirty seconds.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} slot
 */
async function snapshotCanvas(page, slot) {
  await page.evaluate((key) => {
    const canvas = document.querySelector("canvas");
    const context = canvas?.getContext("2d") ?? null;
    if (canvas === null || context === null) return;

    globalThis.__probeSnapshots ??= {};
    globalThis.__probeSnapshots[key] = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }, slot);
}

/**
 * The geometry of every pixel that has changed since `slot` was taken, in
 * **CSS pixels** — a centroid, and the range of distances from it.
 *
 * So *the focus ring* is defined as what focus arriving drew, and *the ground
 * disc* as what the selection drew. See the note at the top of this file for
 * the colour-matching version this replaced and the 4,062-pixel reading that
 * killed it.
 *
 * The threshold is **any channel differing by more than 8**, which excludes
 * nothing this task cares about (a 2 px stroke of `#eef0f5` over `#181c23` is
 * a difference of 214) and excludes a redrawn frame's own antialiasing noise.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} slot
 */
async function diffCanvas(page, slot) {
  return page.evaluate((key) => {
    const canvas = document.querySelector("canvas");
    const context = canvas?.getContext("2d") ?? null;
    const before = globalThis.__probeSnapshots?.[key];
    if (canvas === null || context === null || before === undefined)
      return null;

    const box = canvas.getBoundingClientRect();
    const ratio = canvas.width / box.width;
    const after = context.getImageData(0, 0, canvas.width, canvas.height);
    if (after.data.length !== before.data.length) return null;

    const changed = [];

    for (let index = 0; index < after.data.length; index += 4) {
      const moved =
        Math.abs((after.data[index] ?? 0) - (before.data[index] ?? 0)) > 8 ||
        Math.abs((after.data[index + 1] ?? 0) - (before.data[index + 1] ?? 0)) >
          8 ||
        Math.abs((after.data[index + 2] ?? 0) - (before.data[index + 2] ?? 0)) >
          8 ||
        Math.abs((after.data[index + 3] ?? 0) - (before.data[index + 3] ?? 0)) >
          8;

      if (!moved) continue;

      const pixel = index / 4;
      changed.push([pixel % after.width, Math.floor(pixel / after.width)]);
    }

    if (changed.length === 0) return null;

    let sumX = 0;
    let sumY = 0;

    for (const [x, y] of changed) {
      sumX += x;
      sumY += y;
    }

    const centreX = sumX / changed.length;
    const centreY = sumY / changed.length;
    let inner = Number.POSITIVE_INFINITY;
    let outer = 0;

    for (const [x, y] of changed) {
      const distance = Math.hypot(x - centreX, y - centreY) / ratio;
      inner = Math.min(inner, distance);
      outer = Math.max(outer, distance);
    }

    return {
      pixels: changed.length,
      inner,
      outer,
      centre: {
        pageX: box.left + centreX / ratio,
        pageY: box.top + centreY / ratio,
      },
    };
  }, slot);
}

/**
 * The focus ring's own geometry, by the difference method — focus out, focus
 * in, read what moved. The selection is untouched throughout.
 *
 * @param {import("@playwright/test").Page} page
 * @param {import("@playwright/test").Locator} region
 */
async function cleanRing(page, region) {
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press("Shift+Tab");
  }
  await page.waitForTimeout(250);
  await snapshotCanvas(page, "ring");

  await region.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);

  return diffCanvas(page, "ring");
}

/** {@link cleanRing}'s centre alone. */
async function cleanCentre(page, region) {
  const ring = await cleanRing(page, region);
  return ring === null ? null : ring.centre;
}

/**
 * How far the amber of Story 6.3's anomaly ring reaches from a given centre,
 * in CSS pixels.
 *
 * **Found on review to be wrong, and rewritten rather than caveated.** The
 * first version took a colour match's MAX over a 24 px box around the
 * centre — legitimate in principle (the anomaly ring does not change when
 * anything is pressed, so there is no before-state to diff it against), and
 * it was argued that zooming in first (the caller's own 16 ctrl-wheel steps)
 * would put every neighbour's ring outside that box. It does not: the
 * renderer's fit SCALE is itself width-dependent (0.4477 at 1440 down to
 * 0.1639 at 390, `fit.ts`'s own figures), so the SAME relative zoom ceiling
 * leaves neighbouring nodes markedly closer together in screen pixels on a
 * narrower viewport — measured at 1024 and 768, where the max-over-box read
 * **33–34 px** against a ring whose own stroke tops out at a 3 px annulus
 * around radius 6, which is a neighbour's ring in the box, not this node's.
 *
 * **The fix walks OUTWARD from the centre along sixteen rays and stops each
 * ray at its first gap after amber begins.** This node's own ring is the
 * first contiguous amber a ray crosses measuring outward; a neighbour's ring,
 * being a spatially separate circle, is reachable only after a gap of
 * non-amber pixels — stopping there excludes it by construction, independent
 * of zoom, independent of distance, with no assumption that neighbours have
 * been pushed outside any particular window.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ pageX: number, pageY: number }} centre
 */
async function measureBandRing(page, centre) {
  return page.evaluate(
    ({ pageX, pageY }) => {
      const canvas = document.querySelector("canvas");
      const context = canvas?.getContext("2d") ?? null;
      if (canvas === null || context === null) return null;

      const box = canvas.getBoundingClientRect();
      const ratio = canvas.width / box.width;
      const { data, width, height } = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const centreX = (pageX - box.left) * ratio;
      const centreY = (pageY - box.top) * ratio;

      const near = (index, colour) =>
        (data[index + 3] ?? 0) > 200 &&
        Math.abs((data[index] ?? 0) - colour[0]) <= 12 &&
        Math.abs((data[index + 1] ?? 0) - colour[1]) <= 12 &&
        Math.abs((data[index + 2] ?? 0) - colour[2]) <= 12;

      const isBand = (x, y) => {
        const px = Math.round(x);
        const py = Math.round(y);
        if (px < 0 || py < 0 || px >= width || py >= height) return false;
        const index = (py * width + px) * 4;
        // `--anomaly-extreme` #c08a12 and `--anomaly-high` #e2b544.
        return near(index, [192, 138, 18]) || near(index, [226, 181, 68]);
      };

      // 40 CSS px is generous: the anomaly ring's own outer edge is a small
      // single-digit figure at every recorded `nodeScale`, and this only
      // needs to outrun THIS node's own ring before the first gap — not
      // reach a neighbour, which a gap stops the ray before it can.
      const maxRadius = Math.round(40 * ratio);
      const rayCount = 16;
      let bandOuter = 0;

      for (let rayIndex = 0; rayIndex < rayCount; rayIndex += 1) {
        const angle = (rayIndex / rayCount) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        let sawBand = false;
        let lastBandRadius = 0;

        for (let r = 1; r <= maxRadius; r += 1) {
          if (isBand(centreX + dx * r, centreY + dy * r)) {
            sawBand = true;
            lastBandRadius = r;
          } else if (sawBand) {
            // The first gap after amber ends THIS node's own ring along this
            // ray — a neighbour's separate ring, reachable only past a gap,
            // is never counted.
            break;
          }
        }

        if (sawBand) {
          bandOuter = Math.max(bandOuter, lastBandRadius / ratio);
        }
      }

      return { bandOuter };
    },
    { pageX: centre.pageX, pageY: centre.pageY },
  );
}

/**
 * How far from a node's centre the hit test still names it, in CSS pixels.
 *
 * Swept with **synthetic** `pointermove` events, the way
 * `overview-market-topology-hover.spec.ts` discovers coordinates and for the
 * same reason: it is a search, in one `evaluate`, with no round trip per point.
 * What it finds is the target's own edge — which is the reverse of Task
 * 6.4.1's table, where the radius was computed and the edge inferred.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{ pageX: number, pageY: number }} centre
 */
async function measureHitReach(page, centre) {
  return page.evaluate(
    ({ pageX, pageY }) => {
      const canvas = document.querySelector("canvas");
      const readout = document.querySelector('[data-readout="ticker"]');
      if (canvas === null || readout === null)
        return { lastInside: -1, firstOutside: -1 };

      const at = (x, y) => {
        canvas.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: x,
            clientY: y,
            bubbles: true,
          }),
        );
        return readout.textContent ?? "";
      };

      const named = at(pageX, pageY);
      let lastInside = 0;
      let firstOutside = -1;

      for (let offset = 0.5; offset <= 40; offset += 0.5) {
        if (at(pageX + offset, pageY) === named && named !== "") {
          lastInside = offset;
        } else {
          firstOutside = offset;
          break;
        }
      }

      canvas.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
      return { lastInside, firstOutside };
    },
    { pageX: centre.pageX, pageY: centre.pageY },
  );
}

/** `--widths 1440,390`, or `null` for the whole table. */
function readWidths(argv) {
  const index = argv.indexOf("--widths");
  if (index < 0) return null;

  const list = (argv[index + 1] ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));

  if (list.length === 0) {
    console.error(
      "--widths needs a comma-separated list, e.g. --widths 1440,390",
    );
    process.exit(1);
  }

  return list;
}
