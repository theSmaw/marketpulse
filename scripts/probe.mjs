// `pnpm probe` — look at a layout without running the browser suite
// (2026-09-14).
//
// ## Why this exists
//
// This repository's own record says the same thing five times. `VOLUME-AND-
// WINDOW.md` §69, §71 and §72 each open with a defect that was "found by a
// person opening the page" and was invisible to everything mechanical; the
// change that prompted this script found two more the same way — a rail with
// `flex-grow: 1` taking 423 px of an 889 px row while saying nothing at all,
// and `auto-fit` answering a shortage of width by orphaning the fourth of four
// prices.
//
// Neither was visible in the markup, in a unit test, or in any reasoning about
// the change. Both were obvious in one screenshot and one dump of computed
// boxes, which took four minutes to write from scratch — **after** two full
// browser runs had already been spent measuring a layout that was known to be
// wrong by the time they finished.
//
// So the point of this script is not that it can do something new. It is that
// looking now costs thirty seconds instead of four minutes, which is the
// difference between doing it first and doing it after a red suite.
//
// ## What it reports, and why those three things
//
// Each is a defect class this repository has already written down:
//
//  1. **Computed `flex` and resolved `grid-template-columns`.** This is the
//     half a screenshot cannot give you. A strip rendering three columns and an
//     orphan looks like a styling opinion; `grid 114 114 114` next to a
//     container that is 383 px wide is an arithmetic fact with a cause.
//  2. **Zero-size elements, flagged.** `CLAUDE.md` records twice that a browser
//     driven over CDP in a background tab reports `visibilityState: "hidden"`,
//     which pauses `requestAnimationFrame` and with it `ResizeObserver`
//     delivery — so every chart measures 0 × 0, which is "indistinguishable on
//     inspection from a real defect" and cost a session each time. Playwright's
//     page is visible and does not have this property, so a `0 × 0` from here
//     is real. Saying so on the line is cheaper than remembering it.
//  3. **Page errors.** §70's twenty-one dead stories built clean and kept
//     `pnpm verify` green, because Storybook compiles a story rather than
//     rendering one. Anything that renders a page should say when it threw.
//
// ## What it is not
//
// Not a test, not a gate, and not in `pnpm verify`. It answers *what does this
// look like right now*; an assertion about what it must look like belongs in
// `e2e/specs/`. The relationship between the two is the useful part: **take the
// number from here, then write the assertion around it.** The change that
// prompted this wrote a tolerance of 180 px from argument, and the real figure
// was 190 — one full browser run to learn a number this prints in seconds.
//
// ## The viewport list is a second copy
//
// The specs inline their own (`e2e/specs/search-keyboard.spec.ts`'s
// `[[1440, 900], [768, 800], [390, 780]]`, and three hardcoded calls in
// `security-holiday-week.spec.ts`). This list adds 1024, which `VOLUME-AND-
// WINDOW.md` §72.4 records as the width that caught what the suite's three
// could not — an over-reserved rail that wrapped at 1024 and nowhere else.
//
// Extracting a shared `VIEWPORTS` into `e2e/support/` is the obvious repair and
// is deliberately not done here: this script must run with nothing built, and
// `e2e/support/pair.ts` reads `E2E_BASE_URL` at module load and throws without
// it. The condition for doing it anyway: **a third home for the list**, or the
// first time a spec and this script disagree about a width.

import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import { chromium } from "@playwright/test";

import { resolvePairAddresses } from "./pair-addresses.mjs";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = resolve(REPO_ROOT, ".probe");

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 900 },
  { width: 768, height: 800 },
  { width: 390, height: 780 },
];

// How long to let the page settle before measuring. The charts size themselves
// from a `ResizeObserver`, so a box read too early is a box that then moves for
// a reason that has nothing to do with the layout — the flake
// `security-price-chart.spec.ts` records twice and repairs with a settle loop.
// Here it is a flat wait because there is nothing to assert against: this is a
// dump, and a dump taken a frame early is a dump that says so on its face.
const SETTLE_MS = 2_500;

const { route, within, widths, storyId, everything } = parseArguments(
  process.argv.slice(2),
);

const resolved = await resolvePairAddresses();

if (!resolved.ok) {
  console.error(resolved.message);
  process.exit(1);
}

const { frontendOrigin } = resolved.addresses;

// Storybook is not the pair and is not resolvable from it — `pnpm --filter
// @marketpulse/frontend storybook` picks its own port and this script does not
// go looking. Named as a literal, and the only one in this file.
const STORYBOOK_ORIGIN = "http://localhost:6006";

const target =
  storyId === null
    ? `${frontendOrigin}${route}`
    : `${STORYBOOK_ORIGIN}/iframe.html?id=${storyId}&viewMode=story`;

rmSync(OUTPUT_DIR, { recursive: true, force: true });
mkdirSync(OUTPUT_DIR, { recursive: true });

console.log(`\nProbing ${target}\n`);

const browser = await chromium.launch();
let sawAnError = false;

for (const viewport of VIEWPORTS.filter(
  (candidate) => widths === null || widths.includes(candidate.width),
)) {
  const page = await browser.newPage({ viewport });
  const errors = [];

  page.on("pageerror", (error) => errors.push(String(error)));

  try {
    await page.goto(target, { waitUntil: "domcontentloaded" });
  } catch (error) {
    console.error(
      `  ${String(viewport.width)}  could not load: ${String(error)}`,
    );
    sawAnError = true;
    await page.close();
    continue;
  }

  await page.waitForTimeout(SETTLE_MS);

  const measured = await page.evaluate(measureLayout, {
    regionName: within,
    everything,
  });
  const shot = resolve(OUTPUT_DIR, `${String(viewport.width)}.png`);
  await page.screenshot({ path: shot });

  console.log(`=== ${String(viewport.width)} × ${String(viewport.height)}`);

  if (measured.scope === null) {
    console.log(`  ⚠ no region named "${String(within)}" on this page\n`);
    sawAnError = true;
  } else {
    for (const element of measured.elements)
      console.log(`  ${format(element)}`);
    if (measured.elements.length === 0)
      console.log("  (nothing with a CSS-module class)");
    console.log("");
  }

  if (errors.length > 0) {
    sawAnError = true;
    console.log(`  ⚠ ${String(errors.length)} page error(s):`);
    for (const error of errors) console.log(`      ${error.split("\n")[0]}`);
    console.log("");
  }

  await page.close();
}

await browser.close();

console.log(`Screenshots in ${OUTPUT_DIR.replace(`${REPO_ROOT}/`, "")}/\n`);

// **Non-zero when the page threw or a region was missing, zero otherwise** —
// including when every box looks wrong, because this script has no opinion
// about what a correct layout is. A page error is different in kind: it is the
// page failing to be a page, which no reading of the output could be about.
process.exit(sawAnError ? 1 : 0);

/**
 * Every element carrying a CSS-module class, with the geometry that explains it.
 *
 * Runs in the page. Serialisable in, serialisable out — no closure over
 * anything in this file.
 *
 * The filter is the CSS-module hash shape (`_figures_1rpkj_315`), which is the
 * cheapest available answer to *did somebody write a rule for this element*. A
 * dump of every node is 10,331 entries on the security screen and answers
 * nothing; this is the two dozen a person is actually styling.
 *
 * The `global` comment is not a workaround. `eslint.config.mjs` gives
 * `scripts/*.mjs` Node's globals and makes `no-undef` an error there on
 * purpose — this is the one function in this directory that runs in a browser
 * instead, and declaring that on the function is how a reader knows which side
 * of the wire they are reading.
 */
/* global document, getComputedStyle */
function measureLayout({ regionName, everything }) {
  // **Both ways a landmark can be named, because this product uses the other
  // one.** `Panel` labels its `<section>` with `aria-labelledby` pointing at
  // its own heading, so a lookup that only reads `aria-label` finds nothing on
  // every region in this application. The throwaway script that prompted this
  // one had exactly that bug and silently fell back to the whole document,
  // which is the failure worth designing against: a scope that quietly widens
  // still prints plausible output.
  const named = (element) => {
    const direct = element.getAttribute("aria-label");
    if (direct !== null) return direct.trim();

    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy === null) return null;

    return (document.getElementById(labelledBy)?.textContent ?? "").trim();
  };

  const scope =
    regionName === null
      ? document.body
      : ([...document.querySelectorAll("[aria-label], [aria-labelledby]")].find(
          (element) => named(element) === regionName,
        ) ?? null);

  if (scope === null) return { scope: null, elements: [] };

  const MODULE_CLASS = /^_(?<name>[A-Za-z][A-Za-z0-9]*)_[a-z0-9]+_\d+$/;

  const elements = [...scope.querySelectorAll("*")]
    .map((element) => {
      const names = String(element.className)
        .split(/\s+/)
        .map((candidate) => MODULE_CLASS.exec(candidate)?.groups?.name)
        .filter((name) => name !== undefined);

      if (names.length === 0) return null;

      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      // The two properties that explain a row. `flex` is read off the element
      // because an item's own grow/shrink/basis is what decides how a row's
      // free space is shared — the defect that prompted this script was a
      // `flex-grow: 1` nobody had looked at. `grid-template-columns` is read
      // resolved rather than declared, so `repeat(auto-fit, …)` reports the
      // count it actually produced instead of the instruction that produced it.
      const isFlexItem =
        element.parentElement !== null &&
        getComputedStyle(element.parentElement).display.includes("flex");

      // **Which elements are worth a line**, and this filter is the difference
      // between a reading and a wall. The security screen has hundreds of
      // elements carrying a module class; what a person debugging a row needs
      // is the ones somebody wrote a *layout* rule for — a flex or grid
      // container, or an item that was given something other than the default
      // `0 1 auto`. Every element the two defects lived on passes this, and
      // the labels, glyphs and hidden spans do not. `--all` turns it off.
      const isContainer =
        style.display.includes("flex") || style.display.includes("grid");
      const wasGivenFlex = isFlexItem && style.flex !== "0 1 auto";

      if (!everything && !isContainer && !wasGivenFlex) return null;

      return {
        name: names.join("."),
        width: Math.round(box.width),
        height: Math.round(box.height),
        x: Math.round(box.x),
        y: Math.round(box.y),
        flex: isFlexItem ? style.flex : null,
        columns:
          style.display.includes("grid") && style.gridTemplateColumns !== "none"
            ? style.gridTemplateColumns
            : null,
      };
    })
    .filter((element) => element !== null);

  return { scope: regionName, elements };
}

/** One element, as a line. */
function format(element) {
  const size = `${String(element.width)}×${String(element.height)}`;
  const parts = [
    element.name.padEnd(18),
    size.padStart(9),
    `@${String(element.x)},${String(element.y)}`,
  ];

  if (element.flex !== null) parts.push(`flex ${element.flex}`);

  if (element.columns !== null) {
    const tracks = element.columns
      .split(" ")
      .map((track) => track.replace(/px$/, ""))
      .map((track) => String(Math.round(Number(track))))
      .join(" ");
    parts.push(`grid ${tracks}`);
  }

  // A real 0 × 0 here is a defect, because Playwright's page is visible — see
  // the header. The note is on the line so that nobody spends an afternoon on
  // the CDP background-tab explanation that does not apply.
  if (element.width === 0 || element.height === 0) {
    parts.push("⚠ 0-size (this page IS visible — real, not the CDP trap)");
  }

  return parts.join("  ");
}

/**
 * The arguments, which are deliberately few.
 *
 * No flag library and no aliases: four options, and a script whose usage does
 * not fit in its own error message is a script that needs `--help` written
 * twice.
 */
function parseArguments(argv) {
  let route = "/";
  let within = null;
  let widths = null;
  let storyId = null;
  let everything = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--within") {
      index += 1;
      within = argv[index] ?? null;
    } else if (argument === "--widths") {
      index += 1;
      widths = (argv[index] ?? "").split(",").map(Number).filter(Boolean);
    } else if (argument === "--story") {
      index += 1;
      storyId = argv[index] ?? null;
    } else if (argument === "--all") {
      everything = true;
    } else if (argument.startsWith("-")) {
      console.error(
        `Unknown option ${argument}.\n\n` +
          "  pnpm probe /securities/NVDA\n" +
          "  pnpm probe /securities/NVDA --within Price\n" +
          "  pnpm probe /securities --widths 1440,390\n" +
          "  pnpm probe --story market-barseriespanel--all-permutations\n" +
          "  pnpm probe /securities/NVDA --all   # every module class, not just layout\n",
      );
      process.exit(1);
    } else {
      route = argument.startsWith("/") ? argument : `/${argument}`;
    }
  }

  return { route, within, widths, storyId, everything };
}
