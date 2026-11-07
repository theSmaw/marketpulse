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
//  6. **Whether a drawn correlation edge points at the node it NAMES** (Task
//     6.5.3) — the same difference method with one retained pair removed from
//     the served body, so the pixels that moved *are* that edge. Everything
//     above asks whether a reader can reach a node; this asks whether the ink
//     making a claim about two securities is attached to those two. It runs at
//     the NARROWEST active width, where the crowding is worst, and reports
//     both the fitted scale and the zoom ceiling because the two answers
//     differ.
//
// The pointer/wheel path is `scripts/topology-instrument.mjs`'s `drivePath`,
// adapted to `/`'s own resizable box rather than Storybook's fixed one: the
// same three-notch zoom, the same 24-point drag polyline, the same reverse.

import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { chromium } from "@playwright/test";

// **The built shared package by path, which is `capture-u-frame.mjs`' own
// idiom** — the root is not a workspace package, so `@marketpulse/shared` does
// not resolve from `scripts/`. The graph and the layout are read here rather
// than re-derived: Task 6.5.3's arm needs to know WHICH node an edge names
// before it can ask whether the drawn ink points at it, and
// `buildTopologyLayout` is the one answer to that question this product has.
import {
  buildTopologyGraph,
  buildTopologyLayout,
  withCorrelationEdges,
} from "../packages/shared/dist/index.js";

import { resolvePairAddresses } from "./pair-addresses.mjs";

// **Declared once for the whole file rather than per function**, unlike
// `probe.mjs`' single browser-side helper: three things here run in the page
// (two readers and one `activeElement` read), and `no-undef` is an error in
// `scripts/*.mjs` on purpose — this comment is how a reader knows which side
// of the wire a line is on.
/* global Image, document, PointerEvent */

const REPO_ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = resolve(REPO_ROOT, ".probe-interaction");

/**
 * How many `ctrl` + wheel notches the attribution arm takes (Task 6.5.3).
 *
 * **24, and the run prints what it REACHED rather than trusting this.** The
 * renderer's ceiling is `TOPOLOGY_MAX_ZOOM = 8`, which is a multiple of a
 * width-dependent fit scale, so "the zoom ceiling" is not a number this file
 * can state — only one it can measure, as `zoomed scale / fitted scale`.
 */
const ZOOM_NOTCHES = 24;

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

const { backendOrigin, frontendOrigin } = resolved.addresses;

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

// --- 6. Edge-endpoint ATTRIBUTION, by the same difference method ---------
//
// **Task 6.5.3's own arm, and the one measurement in this file that is about
// a CLAIM rather than about a target.** Everything above asks *can a reader
// reach this node*; this asks *does the ink that says two securities move
// together actually point at those two securities*. Story 6.4's hand-off says
// why the stakes differ: a hit test that hands back the wrong neighbour is a
// missed click, and an edge drawn to the wrong neighbour is a silent, wrong
// claim about correlation.
//
// It runs at the NARROWEST active width, which is where the crowding this
// arm is about is worst — `--widths 1440` moves it, deliberately, so the two
// readings can be taken separately and compared.
const attributionWidth = Math.min(
  ...(widthsArgument ?? VIEWPORTS.map((candidate) => candidate.width)),
);

if (await measureEdgeAttribution(browser, attributionWidth)) sawAnError = true;

await browser.close();

console.log(`Crops in ${OUTPUT_DIR.replace(`${REPO_ROOT}/`, "")}/\n`);
process.exit(sawAnError ? 1 : 0);

// --- the edge-attribution arm (Task 6.5.3) --------------------------------

/**
 * **Does a drawn correlation edge point at the node it names?**
 *
 * The method is this file's own and nothing new: snapshot the canvas, change
 * **one** thing, read the pixels that moved. The one thing changed here is a
 * single retained pair, removed from the body `GET /market-data/relationships`
 * answers with — so the pixels that moved **are** that edge, by construction,
 * with no colour match anywhere and no assumption about which ink is whose.
 *
 * ## Why one pair is removed at the ROUTE rather than through the renderer
 *
 * The alternative was a renderer method that hides one edge, and it was
 * rejected: a probe-only branch inside the draw loop is a second code path
 * measuring itself. The route is the real seam — `useRelationships()` fetches
 * it, `withCorrelationEdges` merges what arrives — so a body with one pair
 * missing produces exactly the drawing the product would produce if the pass
 * had not retained that pair. **Both arms are served the PINNED body**,
 * including the full one, so neither arm can differ by a nightly pass landing
 * mid-run.
 *
 * ## The two node centres are MEASURED, not computed
 *
 * `fit.ts` is frontend-only and unreachable from a `.mjs` script, so the
 * layout-unit → CSS-pixel transform is not recomputed here; it is **solved
 * from two measured ring centres** (`cleanRing`, the instrument the rest of
 * this file already trusts) and then **checked against a third measured
 * node**. A residual is printed beside every reading: an affine fitted to two
 * points and validated on a third is a measurement, and one fitted to two
 * points and trusted is arithmetic.
 *
 * @param {import("@playwright/test").Browser} browser
 * @param {number} width
 * @returns {Promise<boolean>} whether anything misattributed
 */
async function measureEdgeAttribution(browser, width) {
  console.log(
    `=== edge attribution at ${String(width)} (Task 6.5.3)\n` +
      "  one retained pair removed from the served body; the pixels that " +
      "moved ARE that edge",
  );

  const [universe, relationships] = await Promise.all([
    readJson(`${backendOrigin}/securities`),
    readJson(`${backendOrigin}/market-data/relationships`),
  ]);

  if (universe === null || relationships === null) {
    console.log("  — the backend did not answer; nothing to attribute\n");
    return false;
  }

  // **The permanent state of CI and of every store before `pnpm baselines`**,
  // said rather than failed: there is no retained pair to remove, so there is
  // no ink whose attribution could be measured.
  if (
    relationships.pass === undefined ||
    relationships.correlations.length === 0
  ) {
    console.log(
      "  — no nightly correlation pass on this store (" +
        `${String(relationships.correlations.length)} retained pairs), so no ` +
        "edge exists to attribute\n",
    );
    return false;
  }

  const active = universe.securities.filter(
    (security) => security.status === "active",
  );
  const graph = withCorrelationEdges(
    buildTopologyGraph(active),
    relationships.correlations.map((row) => ({
      low: row.low,
      high: row.high,
      r: row.r,
    })),
  );
  const layout = buildTopologyLayout(graph);
  const placed = new Map(
    layout.placements.map((placement) => [placement.symbol, placement]),
  );
  const nodeOf = new Map(graph.nodes.map((node) => [node.symbol, node]));

  const correlationEdges = graph.edges
    .filter((edge) => edge.kind === "return_correlation")
    .map((edge) => {
      const from = placed.get(edge.from);
      const to = placed.get(edge.to);
      return {
        from: edge.from,
        to: edge.to,
        r: edge.weight,
        units:
          from === undefined || to === undefined
            ? Number.POSITIVE_INFINITY
            : Math.hypot(from.x - to.x, from.y - to.y),
        cluster:
          nodeOf.get(edge.from)?.cluster === nodeOf.get(edge.to)?.cluster
            ? (nodeOf.get(edge.from)?.cluster ?? null)
            : null,
      };
    })
    .sort((one, two) => one.units - two.units);

  // **The most contested edge is the SHORTEST one**, which is a statement
  // about this layout rather than a guess: a cluster's members sit on a
  // golden-angle spiral at a near-constant spacing, so the shortest retained
  // edge is the one whose two ends are hardest to tell apart — and the second
  // target is the shortest inside the cluster with the most members, which is
  // the cluster Story 6.4's hand-off named.
  const biggestCluster = [...graph.clusters]
    .map((cluster) => ({ sector: cluster.id, members: cluster.members.length }))
    .sort((one, two) => two.members - one.members)[0];

  const targets = [correlationEdges[0]];
  const inBiggest = correlationEdges.find(
    (edge) => edge.cluster === biggestCluster?.sector,
  );
  if (inBiggest !== undefined && inBiggest !== correlationEdges[0]) {
    targets.push(inBiggest);
  }

  console.log(
    `  ${String(correlationEdges.length)} correlation edges drawn; ` +
      `shortest ${correlationEdges[0]?.units.toFixed(2) ?? "—"} layout units, ` +
      `largest cluster ${String(biggestCluster?.sector)} ` +
      `(${String(biggestCluster?.members)} members)`,
  );

  let misattributed = false;

  for (const target of targets) {
    if (target === undefined) continue;
    misattributed =
      (await attributeOneEdge(browser, width, {
        target,
        relationships,
        graph,
        placed,
        nodeOf,
      })) || misattributed;
  }

  console.log("");
  return misattributed;
}

/**
 * One target edge, at the fitted scale and again at the zoom ceiling.
 *
 * **Both views are reported and neither is the answer on its own.** The fitted
 * scale is what a reader meets; the zoom ceiling is where the ink exists at
 * all in a crowded cluster, and it is the state a reader reaches by doing the
 * one thing this region offers for crowding (Story 6.2's `ctrl` + wheel).
 *
 * @returns {Promise<boolean>} whether this edge misattributed anywhere
 */
async function attributeOneEdge(
  browser,
  width,
  { target, relationships, graph, placed, nodeOf },
) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 780 : 900 },
    // **2 rather than 3**, because every reading here crosses the wire as a
    // PNG once per arm and the geometry is divided back to CSS pixels either
    // way. The crops this file takes for LOOKING are the reason the rest of
    // it runs at 3.
    deviceScaleFactor: 2,
  });

  const sector = nodeOf.get(target.from)?.cluster ?? null;
  const benchmark =
    graph.nodes.find(
      (node) => node.kind === "sector_etf" && node.cluster === sector,
    )?.symbol ?? null;

  console.log(
    `  ${target.from}–${target.to}  |r| ${Math.abs(target.r).toFixed(3)}  ` +
      `${target.units.toFixed(2)} layout units  ` +
      `${target.cluster === null ? "CROSS-SECTOR" : String(target.cluster)}`,
  );

  const outcome = { misattributed: false };

  try {
    const full = await openWithBody(context, relationships, null);
    const atFit = await full.ink();

    // **Both views are measured, and the fitted one twice over.** The two ends'
    // centres at the fitted scale give the fitted transform (so a fitted-scale
    // diff can be attributed where there is any ink to attribute) and the
    // anchor the zoom is taken about — the frame's own centre would carry the
    // target off the canvas at these fit scales.
    const fitCentres = await measureCentres(
      full.page,
      [target.from, target.to, ...(benchmark === null ? [] : [benchmark])],
      { benchmark, label: "at the fitted scale" },
    );
    const anchor = fitCentres[target.from] ?? null;

    if (anchor === null) {
      console.log("      — the keyboard walk never reached it; arm abandoned");
      return false;
    }

    await clearAndBlur(full.page);
    await zoomAbout(full.page, anchor, ZOOM_NOTCHES);
    await full.page.mouse.move(4, 4);

    const zoomCentres = await measureCentres(
      full.page,
      [target.from, target.to, ...(benchmark === null ? [] : [benchmark])],
      { benchmark, label: "at the zoom ceiling" },
    );

    await clearAndBlur(full.page);
    await full.page.mouse.move(4, 4);
    const atZoom = await full.ink();

    const minus = await openWithBody(context, relationships, target);
    const diffAtFit = await diffAgainst(minus.page, atFit);
    await zoomAbout(minus.page, anchor, ZOOM_NOTCHES);
    await minus.page.mouse.move(4, 4);
    await settle(minus.page);
    const diffAtZoom = await diffAgainst(minus.page, atZoom);

    // Each transform solved from that view's own two measured ring centres and
    // **checked against a third measured node** — the residual is printed, and
    // a reading whose residual is larger than the distances it is comparing is
    // a reading nobody should quote.
    const fitTransform = solveTransform(placed, fitCentres, target, benchmark);
    const zoomTransform = solveTransform(
      placed,
      zoomCentres,
      target,
      benchmark,
    );

    say("fitted scale", fitTransform, benchmark);
    report("fitted scale", diffAtFit, target, placed, fitTransform, outcome);
    say("zoom ceiling", zoomTransform, benchmark);
    report("zoom ceiling", diffAtZoom, target, placed, zoomTransform, outcome);

    if (fitTransform !== null && zoomTransform !== null) {
      console.log(
        `      zoom reached ${(zoomTransform.scale / fitTransform.scale).toFixed(2)}x ` +
          `the fitted scale, against this renderer's own ceiling of 8`,
      );
    }
  } finally {
    await context.close();
  }

  return outcome.misattributed;
}

/**
 * One page, serving a PINNED relationships body with `omit` removed.
 *
 * `omit === null` serves the whole body, which is what makes the two arms
 * differ by exactly one pair and by nothing else — including by a nightly
 * pass landing between them.
 */
async function openWithBody(context, relationships, omit) {
  const page = await context.newPage();
  const body = {
    ...relationships,
    correlations: relationships.correlations.filter(
      (row) =>
        omit === null ||
        !(
          (row.low === omit.from && row.high === omit.to) ||
          (row.low === omit.to && row.high === omit.from)
        ),
    ),
  };

  await page.route("**/market-data/relationships*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // The browser compares this, not the server — `CLAUDE.md`'s own CORS
      // note, one line of which is the whole reason a fulfilled cross-origin
      // body is otherwise invisible.
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(body),
    });
  });

  await page.goto(`${frontendOrigin}/`, { waitUntil: "domcontentloaded" });

  const region = page.getByRole("region", { name: "Market topology" });
  const canvas = region.getByRole("img", {
    name: /A graph of every security we track/u,
  });
  await canvas.waitFor({ state: "visible", timeout: 15_000 });
  await canvas.scrollIntoViewIfNeeded();
  await settle(page);

  return { page, ink: () => readInk(page) };
}

/** The canvas's own pixels, as a PNG data URL. */
async function readInk(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    return canvas === null ? null : canvas.toDataURL();
  });
}

/**
 * Wait until the canvas draws the same pixels twice.
 *
 * **Needed rather than tidy**: `/` applies anomaly bands imperatively as
 * overview frames arrive (6.8–16.1 a minute), so two arms photographed without
 * this differ by whichever band update each one caught — and that difference
 * lands in the diff looking exactly like an edge.
 */
async function settle(page) {
  let previous = await readInk(page);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.waitForTimeout(400);
    const again = await readInk(page);
    if (again !== null && again === previous) return true;
    previous = again;
  }

  return false;
}

/**
 * `ctrl` + wheel, about one point of the CANVAS, `notches` times.
 *
 * **The point is canvas-local and the box is re-read here**, which is this
 * file's own recorded defect arriving a second time one function over: every
 * focus move in this script scrolls the page, so a page coordinate taken
 * before one is stale by the time the wheel is dispatched — and a wheel that
 * lands somewhere else zooms about a different world point, which produces two
 * arms whose whole picture differs and a diff of 182,203 pixels that reads
 * exactly like an enormous edge. Measured, on the first run of this arm.
 */
async function zoomAbout(page, local, notches) {
  const canvas = page
    .getByRole("region", { name: "Market topology" })
    .getByRole("img", { name: /A graph of every security we track/u });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (box === null) return;

  await page.mouse.move(box.x + local.x, box.y + local.y);

  // **Paced, and the pointer re-aimed every notch.** An unpaced burst reached
  // a DIFFERENT zoom on each of two arms of the first run — 3.2x the fitted
  // scale on one and 5.9x on the other, from the same 20 notches — which is
  // two pictures rather than two readings.
  for (let index = 0; index < notches; index += 1) {
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -120);
    await page.keyboard.up("Control");
    await page.mouse.move(box.x + local.x, box.y + local.y);
    await page.waitForTimeout(40);
  }

  await page.waitForTimeout(400);
}

/** Drop the selection and take focus out of the canvas, so no ring is drawn. */
async function clearAndBlur(page) {
  await page.keyboard.press("Escape");
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press("Shift+Tab");
  }
  await page.waitForTimeout(250);
}

/**
 * Each named node's own screen centre, measured by the difference method.
 *
 * The walk is the shipped keyboard model (Task 6.4.2): `ArrowDown` seeds the
 * hub, again enters the ring, `ArrowRight` moves along it to the cluster's
 * benchmark, `ArrowDown` enters the cluster, `ArrowRight` walks its members —
 * clamped, never wrapped, which is why both directions are tried.
 *
 * **Returned in CANVAS-LOCAL CSS pixels, never page ones.** Two readings taken
 * either side of a focus move are at two scroll offsets, so a page coordinate
 * is not comparable with another page coordinate here; the canvas's own box is
 * the only frame of reference that holds still.
 */
async function measureCentres(page, symbols, { benchmark, label }) {
  const region = page.getByRole("region", { name: "Market topology" });
  const centres = {};

  for (const symbol of symbols) {
    const reached = await walkTo(page, region, symbol, benchmark);

    if (!reached) continue;

    const ring = await cleanRing(page, region);
    if (ring === null) continue;

    centres[symbol] = ring.local;
    console.log(
      `      ${symbol.padEnd(6)} centre ${centres[symbol].x.toFixed(1)}, ` +
        `${centres[symbol].y.toFixed(1)} px in the canvas ${label} ` +
        `(ring ${String(ring.pixels)} px)`,
    );
  }

  return centres;
}

/** Walk the tree to one ticker. See {@link measureCentres}. */
async function walkTo(page, region, symbol, benchmark) {
  const named = async () =>
    (
      (await page.locator('[data-readout="ticker"]').textContent()) ?? ""
    ).trim();

  await region.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(120);

  if (benchmark !== null) {
    for (let press = 0; press < 12; press += 1) {
      if ((await named()) === benchmark) break;
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(30);
    }

    if ((await named()) === symbol) return true;
    if ((await named()) !== benchmark) return false;

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(120);
  }

  for (const key of ["ArrowRight", "ArrowLeft"]) {
    for (let press = 0; press < 220; press += 1) {
      if ((await named()) === symbol) return true;
      await page.keyboard.press(key);
      await page.waitForTimeout(18);
    }
  }

  return (await named()) === symbol;
}

/**
 * The pixels that differ between this page's canvas and a PNG taken from
 * another one.
 *
 * **Compared inside the page rather than in Node**, because a page cannot read
 * another page's globals and a 2.4 MB `ImageData` across the wire twice a
 * reading is the one thing that would stop this being a probe. A PNG is
 * lossless, so decoding it back into a canvas and comparing is exact.
 *
 * The two **ends** are found by the two-pass farthest-point walk rather than by
 * every pair: the farthest changed pixel from the centroid, then the farthest
 * from that — `O(n)`, and on a segment it is the segment's own ends.
 */
async function diffAgainst(page, dataUrl) {
  if (dataUrl === null) return null;

  return page.evaluate(async (url) => {
    const canvas = document.querySelector("canvas");
    const context = canvas?.getContext("2d") ?? null;
    if (canvas === null || context === null) return null;

    const image = new Image();
    await new Promise((done, fail) => {
      image.onload = () => done(undefined);
      image.onerror = () => fail(new Error("the snapshot would not decode"));
      image.src = url;
    });

    if (image.width !== canvas.width || image.height !== canvas.height) {
      return { pixels: -1, mismatch: true };
    }

    const shadow = document.createElement("canvas");
    shadow.width = canvas.width;
    shadow.height = canvas.height;
    const shadowContext = shadow.getContext("2d");
    if (shadowContext === null) return null;
    shadowContext.drawImage(image, 0, 0);

    const before = shadowContext.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const after = context.getImageData(0, 0, canvas.width, canvas.height);
    const box = canvas.getBoundingClientRect();
    const ratio = canvas.width / box.width;
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

    if (changed.length === 0) return { pixels: 0 };

    let sumX = 0;
    let sumY = 0;
    for (const [x, y] of changed) {
      sumX += x;
      sumY += y;
    }
    const centreX = sumX / changed.length;
    const centreY = sumY / changed.length;

    const farthestFrom = (fromX, fromY) => {
      let best = null;
      let bestDistance = -1;
      for (const [x, y] of changed) {
        const distance = Math.hypot(x - fromX, y - fromY);
        if (distance > bestDistance) {
          bestDistance = distance;
          best = [x, y];
        }
      }
      return best ?? [fromX, fromY];
    };

    const [oneX, oneY] = farthestFrom(centreX, centreY);
    const [twoX, twoY] = farthestFrom(oneX, oneY);
    // **Canvas-local**, for {@link measureCentres}' own reason: the only frame
    // of reference in this arm that two readings can share.
    const toLocal = (x, y) => ({ x: x / ratio, y: y / ratio });

    return {
      pixels: changed.length,
      centroid: toLocal(centreX, centreY),
      ends: [toLocal(oneX, oneY), toLocal(twoX, twoY)],
      lengthPx: Math.hypot(oneX - twoX, oneY - twoY) / ratio,
    };
  }, dataUrl);
}

/**
 * The layout-unit → CSS-pixel transform, SOLVED from two measured centres.
 *
 * `fit.ts` spells it as `screen = (world − centre) · scale · zoom +
 * viewportCentre + pan` — one uniform scale, no rotation — so two measured
 * points over-determine it by one degree of freedom, and the spare degree is
 * spent on the **check**: whichever `y` sign gives the smaller residual on a
 * third measured node is the one reported, with the residual printed. A
 * residual of a few tenths of a pixel is the transform; a residual of twenty
 * is a measurement nobody should read.
 */
function solveTransform(placed, centres, target, benchmark) {
  const worldOne = placed.get(target.from);
  const worldTwo = placed.get(target.to);
  const screenOne = centres[target.from];
  const screenTwo = centres[target.to];
  const control = benchmark === null ? null : (centres[benchmark] ?? null);
  if (worldOne === undefined || worldTwo === undefined) return null;
  if (screenOne === undefined || screenTwo === undefined) return null;

  const worldSpan = Math.hypot(
    worldOne.x - worldTwo.x,
    worldOne.y - worldTwo.y,
  );
  const screenSpan = Math.hypot(
    screenOne.x - screenTwo.x,
    screenOne.y - screenTwo.y,
  );
  if (worldSpan === 0) return null;

  const scale = screenSpan / worldSpan;

  const candidates = [false, true].map((flipY) => {
    const project = (world) => ({
      x: screenOne.x + (world.x - worldOne.x) * scale,
      y: screenOne.y + (world.y - worldOne.y) * scale * (flipY ? -1 : 1),
    });

    const onSecond = project(worldTwo);
    const selfResidual = Math.hypot(
      onSecond.x - screenTwo.x,
      onSecond.y - screenTwo.y,
    );

    const worldControl = benchmark === null ? undefined : placed.get(benchmark);
    const residual =
      control === null || worldControl === undefined
        ? null
        : (() => {
            const projected = project(worldControl);
            return Math.hypot(projected.x - control.x, projected.y - control.y);
          })();

    return { flipY, scale, project, residual, selfResidual };
  });

  return (
    candidates.sort(
      (one, two) =>
        (one.residual ?? one.selfResidual) - (two.residual ?? two.selfResidual),
    )[0] ?? null
  );
}

/** A transform's own figures, printed before the reading it licenses. */
function say(label, transform, benchmark) {
  if (transform === null) {
    console.log(
      `      ${label.padEnd(13)} no transform — fewer than two centres were measured`,
    );
    return;
  }

  console.log(
    `      ${label.padEnd(13)} transform ${transform.scale.toFixed(4)} px/unit, ` +
      `y ${transform.flipY ? "flipped" : "as-is"}, residual on ` +
      `${String(benchmark)} ` +
      `${transform.residual === null ? "— (no third node)" : `${transform.residual.toFixed(2)} px`}`,
  );
}

/** One reading, printed — and the verdict, which is the point of the arm. */
function report(label, diff, target, placed, transform, outcome) {
  if (diff === null) {
    console.log(`      ${label.padEnd(13)} — nothing to compare`);
    return;
  }

  if (diff.mismatch === true) {
    console.log(
      `      ${label.padEnd(13)} — the two arms' canvases differ in SIZE; no reading`,
    );
    return;
  }

  if (diff.pixels === 0) {
    console.log(
      `      ${label.padEnd(13)} 0 px moved — this edge draws NO ink here ` +
        "(its own endpoints' bodies cover it)",
    );
    return;
  }

  if (transform === null) {
    console.log(
      `      ${label.padEnd(13)} ${String(diff.pixels)} px moved, ` +
        "no transform — cannot attribute",
    );
    return;
  }

  const screenOf = (symbol) => {
    const world = placed.get(symbol);
    return world === undefined ? null : transform.project(world);
  };

  const nearest = (point) =>
    [...placed.keys()]
      .map((symbol) => {
        const screen = screenOf(symbol);
        return {
          symbol,
          distance:
            screen === null
              ? Number.POSITIVE_INFINITY
              : Math.hypot(screen.x - point.x, screen.y - point.y),
        };
      })
      .sort((one, two) => one.distance - two.distance);

  console.log(
    `      ${label.padEnd(13)} ${String(diff.pixels)} px moved, ` +
      `drawn length ${diff.lengthPx.toFixed(2)} px`,
  );

  // **A transform that fails its own check licenses nothing**, and this is the
  // whole reason the residual is measured on a third node rather than assumed.
  // The margins this arm compares are of the order of half a node separation —
  // 12 px at the zoom ceiling — so a projection carrying 3 px of error cannot
  // tell two neighbours apart, and a verdict read off one would be a guess
  // wearing a number. Produced: the `energy` cluster sits 12 px from the left
  // edge at 390, so the pan clamp bites at the zoom ceiling and that arm's
  // residual came back at 10.62 px.
  if (transform.residual !== null && transform.residual > 3) {
    console.log(
      `        ⚠ the transform's residual (${transform.residual.toFixed(2)} px) is ` +
        "too large to attribute an endpoint with; no verdict from this view",
    );
    return;
  }

  for (const [index, end] of diff.ends.entries()) {
    const ranked = nearest(end);
    const [closest] = ranked;
    const named = ranked.find(
      (row) => row.symbol === target.from || row.symbol === target.to,
    );
    // **The real contest is the nearest node that is NOT either end.** The
    // runner-up is usually the edge's own other endpoint, which is not a
    // competing claim at all — an edge is allowed to be nearer one of its own
    // ends than the other.
    const intruder = ranked.find(
      (row) => row.symbol !== target.from && row.symbol !== target.to,
    );
    const correct =
      closest?.symbol === target.from || closest?.symbol === target.to;

    if (!correct) outcome.misattributed = true;

    console.log(
      `        end ${String(index + 1)}  nearest ${String(closest?.symbol).padEnd(6)} ` +
        `${(closest?.distance ?? 0).toFixed(2)} px   ` +
        `nearest NAMED end ${String(named?.symbol).padEnd(6)} ` +
        `${(named?.distance ?? 0).toFixed(2)} px   ` +
        `nearest OTHER node ${String(intruder?.symbol).padEnd(6)} ` +
        `${(intruder?.distance ?? 0).toFixed(2)} px   ` +
        `${correct ? "attributes to a named endpoint" : "⚠ MISATTRIBUTED"}`,
    );
  }
}

/** One GET, parsed, or `null` — a probe reports an absence rather than throwing. */
async function readJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

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
      // **The same centroid in CANVAS-LOCAL CSS pixels, read off the box this
      // evaluate already holds** (Task 6.5.3). Added rather than substituted
      // because every caller above wants a page coordinate to point a mouse or
      // a screenshot clip at — and because subtracting a box read in a LATER
      // round trip is wrong: `cleanRing` moves focus, focus scrolls the page,
      // and the measured residual of that mistake was **9.21 px** on a
      // transform whose honest residual is 0.66.
      local: { x: centreX / ratio, y: centreY / ratio },
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
