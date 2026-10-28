import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";
import {
  overviewWithUnusual,
  unusualRow,
  unusualSection,
} from "../support/unusual.js";

// **What `Unusual activity` says it ranked over, and how much of it got past
// the line** (Task 5.4.4).
//
// This region has **three** populations where `Market breadth` and `Movers`
// have two: the 501 equities, how many were heard from inside the freshness
// cutoff, and how many of those had a baseline long enough to rank. The third
// is **the cut** — without it a reader cannot tell a top ten selected from 455
// securities from one selected from 3, and `MARKET-OVERVIEW.md` §5.5 is a
// document about exactly that: *a ranked list looks equally confident whether
// its input was complete or not.*
//
// ## The frame is FURNISHED, and that is stated rather than hidden
//
// CI's store is 516 securities, zero bars and no baseline generation, and a
// developer runs `MARKET_DATA_PROVIDER=none` — so the real producer answers
// `eligible: 0` for ever on every gated run and the sentence under test
// would never carry a cut at all. The frame goes down the shipped socket,
// through the shipped encoder and the shipped decoder (`support/unusual.ts`
// carries the argument), so what is furnished is the **data** and not the
// behaviour.
//
// **So this file says nothing about whether the producer's counts are
// honest.** A pass-through forwards a producer's bytes faithfully, and Task
// 5.2.4 proved a broken producer is drawn exactly as faithfully as a correct
// one. What holds the counts is `readUnusual`'s cross-field chain
// (`rows ≤ scored ≤ eligible ≤ tracked`, refused rather than defaulted) and
// `overview-unusual-ranking.spec.ts`, which furnishes nothing and grounds
// itself out of frame.
//
// ## What needs a browser, and could not be asserted below one
//
//   - **The clause must reach a LISTENER.** Story 4.4 found breadth's
//     denominator reaching none — its only printed home was an `aria-hidden`
//     ladder, correctly hidden — and the DOM was right in both versions.
//     This region draws **no ladder and prints no denominator anywhere
//     else**: the head slot states the bound and today's band
//     (`Top 10 · led by extreme`) and no count. So the
//     footer is the entire delivery of the figure to either audience, and
//     three of its siblings in the same region legitimately carry
//     `aria-hidden` (`RankedList`'s `.rules` and `.ladder`), which is what
//     makes a sweep the plausible edit. `toContainText` passes over an
//     `aria-hidden` subtree; `Accessibility.getFullAXTree` does not.
//   - **The third source class is on a different surface.** The baseline's
//     tape is named by the screen's source note at the foot of the page, not
//     by the region — the region owns the ranking and the note owns
//     provenance — and only a rendered page can say the two surfaces agree.

const OVERVIEW = "/";

/** The symbols, in the one order `compareByPercentile` admits for these ranks. */
const RANKED = ["CTSH", "NVDA", "AVGO"] as const;

/**
 * **The counts, chosen so no two of the three are equal** — `tracked` 501,
 * `eligible` 466, `scored` 455 — because a sentence that read the wrong field
 * would still look right if two of them matched.
 */
const SECTION = unusualSection(
  [
    unusualRow("CTSH", 75, "extreme", -4.12),
    unusualRow("NVDA", 75, "extreme", 3.88),
    unusualRow("AVGO", 68, "high", -2.4),
  ],
  { scored: 455, eligible: 466, tracked: 501 },
);

/**
 * The sentence's parts, **written out rather than imported**.
 *
 * Task 4.3.7's rule, unchanged: `measured-set.ts` is the module under test, so
 * importing `describeMeasuredSet` would make this spec agree with it by
 * construction. If the product's words change, these strings are supposed to
 * need changing.
 */
const POPULATIONS =
  "Of the 501 companies we track, 466 were heard from in the last 5 " +
  "minutes and 455 have a score on 2 of 3 factors, to a maximum of 75.";

/** The two comparison refusals, counted — `unusualSection`'s own tallies. */
const REFUSED = "11 have too short a baseline.";

const region = (page: Page) =>
  page.getByRole("region", { name: "Unusual activity" });

/** The drawn rows' tickers, in document order, excluding the held pads. */
const drawnSymbols = (page: Page): Promise<string[]> =>
  region(page).evaluate((root) => {
    const out: string[] = [];
    for (const row of root.querySelectorAll("ol > li")) {
      if (row.getAttribute("aria-hidden") === "true") continue;
      const symbol = row.querySelector('[class*="_symbol_"]');
      out.push(symbol?.textContent.trim() ?? "?");
    }
    return out;
  });

/** Open `/` with the furnished section already on the connect frame. */
async function open(page: Page): Promise<void> {
  await serveFeed(page, { overview: overviewWithUnusual(SECTION) });
  await page.goto(OVERVIEW, { waitUntil: "networkidle" });

  // The positive state, waited for before anything is read — every
  // characterised flake in this suite is a text assertion over a page that is
  // still settling.
  await expect.poll(() => drawnSymbols(page)).toEqual([...RANKED]);
}

/**
 * Every **unignored** accessibility-tree node's text, from the real tree.
 *
 * `Accessibility.getFullAXTree` over a CDP session rather than Playwright's
 * own `accessibility.snapshot`, because the latter prunes to what it
 * considers interesting and this question is about a `StaticText` node inside
 * a `<p>`. Chromium-only, which is the suite's one project.
 */
async function spokenText(page: Page): Promise<readonly string[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Accessibility.enable");
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");

  return nodes
    .filter((node) => !node.ignored)
    .map((node): unknown => node.name?.value)
    .filter((value): value is string => typeof value === "string");
}

test.use({ viewport: { width: 1440, height: 900 } });

test("the region states its three populations, its cut and its age", async ({
  page,
}) => {
  await open(page);

  const text = (await region(page).textContent()) ?? "";

  expect(text).toContain(POPULATIONS);
  expect(text).toContain(REFUSED);

  // **The age is an instant, not a verdict**, and it is the observation
  // interval's END — a bar's `startsAt` plus the interval, because `t` marks
  // the start of the minute a bar describes and omitting it makes a healthy
  // feed look behind. The furnished frame observes through 18:00Z.
  expect(text).toContain(
    "Nothing newer than Oct 15 · 14:01 EDT has reached us.",
  );

  // **No feed word anywhere in the region.** `live`, `stale` and
  // `disconnected` have one home and it is the status bar; a sentence here
  // reaching for one would trip `one-home-for-the-feed-words` and would
  // deserve to.
  const lowered = text.toLowerCase();
  for (const word of ["live", "stale", "disconnected"]) {
    expect(lowered).not.toContain(word);
  }

  await expectNothingFailedToRender(page);
});

test("the cut reaches a listener, read from the accessibility tree", async ({
  page,
}) => {
  await open(page);

  // **The DOM is correct whether this passes or fails**, which is the whole
  // reason the assertion is made here: the clause can be swept into an
  // `aria-hidden` subtree beside two siblings that legitimately carry one,
  // and nothing below a real browser's accessibility tree can tell.
  const spoken = await spokenText(page);

  expect(spoken.some((said) => said.includes(POPULATIONS))).toBe(true);

  await expectNothingFailedToRender(page);
});

test("the screen's note names the baseline's tape, and the region does not", async ({
  page,
}) => {
  await open(page);

  // **The third source class** (invariant 6): the ordinal's numerator is an
  // `iex` five-minute move and its denominator is a `sip` 60-session
  // distribution, so one row rests on two tapes and the screen has to say so.
  const note = page.getByRole("definition").and(page.locator("dd"));

  await expect
    .poll(async () => (await note.allTextContents()).join(" | "))
    .toContain("Ranked against 60 sessions of stored bars, generated for");

  // **And the region says none of it.** Provenance has one home on this
  // screen and it is the note at the foot of the region group — a feed line
  // inside a region is the `BarSeriesPanel` duplicate this product deleted.
  const inRegion = (await region(page).textContent()) ?? "";
  expect(inRegion).not.toContain("sessions of stored bars");
  expect(inRegion).not.toContain("All US exchanges");

  await expectNothingFailedToRender(page);
});

/**
 * **The region is ONE HEIGHT, and its rows are the pitch the grid is sized
 * off** (Task 5.6.7).
 *
 * ## It exists because the probe caught a defect nothing else could
 *
 * The band chip arrived with `--space-4` of vertical padding, which is 24 px
 * of chip in a row whose line box is 18 — so **every row came out 33 px
 * instead of 26 and the list 329 instead of 269**, the region 60 px taller,
 * stepping the whole lower page at the two widths where the grid rows are
 * untied. `pnpm probe / --within "Unusual activity"` printed it in one line;
 * the 41 `RankedList` tests, this region's own tests and every unit test in
 * the repository were **green on it**, because jsdom applies no stylesheet and
 * computes no layout.
 *
 * **That chip has since been removed** — the top ten share one band, so it
 * repeated one word ten times for 25% of the row — and the row is four cells
 * again. The check outlives it: it is about the row's **pitch**, which is what
 * the grid is sized off, not about any particular cell.
 *
 * `.bar` and `.price` each paid for that lesson once at 390 and each left a
 * comment rather than a check. This is the check: the next cell added to this
 * row goes red here rather than on somebody's screen.
 *
 * ## The figures are MEASURED, and they are the row pitch rather than the box
 *
 * `pnpm probe`, 2026-10-28, all four widths: the list is **269 px** and the
 * rows resolve `27 × 9 + 26` — nine pitches and a last row with no separator.
 * The region's own box is 491/491/458/458 and is **not** asserted here: it is
 * a grid resolution that three sibling regions participate in, so a change
 * anywhere in that column would fail this spec about the wrong thing.
 *
 * The tolerance is **the row pitch**, which is what `MARKET-OVERVIEW.md` §1.4
 * cares about: an implicit second row of the `<li>` is `+7 px` a row and 70 px
 * of region, far outside it, while a sub-pixel font-metric difference is not.
 */
test("the list is ten rows at the pitch the grid is sized off, with no implicit second row", async ({
  page,
}) => {
  await open(page);

  // **The ELEMENTS, not the accessible rows** — corrected 2026-10-28, and the
  // distinction is the whole check. The held pads that fill a short list are
  // `aria-hidden`, so `getByRole("listitem")` sees only the rows that carry a
  // security: three, against a furnished section of three. This assertion is
  // about GEOMETRY — the pitch the grid row is sized off — and the pads occupy
  // that geometry whether or not a listener is told about them.
  const rows = region(page).locator("li");
  await expect(rows).toHaveCount(10);

  const boxes = await rows.evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().height)),
  );

  // Every row the same height, and that height the shipped 26 px row plus its
  // own separator — never 33, which is what a cell taller than the line box
  // produces.
  expect(new Set(boxes.slice(0, 9)).size).toBe(1);
  expect(boxes[0]).toBeLessThanOrEqual(27);
  expect(boxes[0]).toBeGreaterThanOrEqual(26);

  const list = await region(page).locator("ol").first().boundingBox();
  expect(Math.round(list?.height ?? 0)).toBeLessThanOrEqual(270);
  expect(Math.round(list?.height ?? 0)).toBeGreaterThanOrEqual(268);

  await expectNothingFailedToRender(page);
});

/**
 * **The head is ONE LINE, and the slot's string is what could take it off
 * one.**
 *
 * The slot carries the band since the chip came off the row — `Top 10 · led
 * by extreme` for this section's three furnished rows — and `Panel.headings`
 * carries `min-width: 0`, so the failure mode is not a clipped badge: an
 * oversized slot **wraps `Unusual activity` onto a second line** and takes the
 * region's height with it. At 768 and 390 the grid row is content-sized, so
 * the whole lower page steps.
 *
 * Measured with `pnpm probe`, 2026-10-28, at all four widths: the header is
 * **47 px**, the title's box **114 × 22**, and the slot **132** against the
 * **171.7** it has at 308 px of head. The widest string this region can build
 * is `Top 10 · led by elevated` at **166.5** in the cold-load face, so the
 * budget is spent to 97% and the margin is 5 px — which is exactly why this is
 * a check rather than a comment.
 *
 * The tolerance is **one line against two**: a wrapped title is +22 px, far
 * outside it, while a sub-pixel font-metric difference is not.
 */
test("the region's head stays one line under the band clause", async ({
  page,
}) => {
  await open(page);

  await expect(region(page).getByText("Top 10 · led by extreme")).toBeVisible();

  const head = await region(page).evaluate((root) => {
    const headings = root.querySelector('[class*="_headings_"]');
    const slot = root.querySelector('[class*="_slot_"]');
    return {
      title: Math.round(headings?.getBoundingClientRect().height ?? 0),
      slot: Math.round(slot?.getBoundingClientRect().width ?? 0),
    };
  });

  // One line of `--line-height-subheading`, never two.
  expect(head.title).toBeLessThanOrEqual(24);

  // And the string inside the budget the title and the gap leave it.
  expect(head.slot).toBeLessThanOrEqual(171);

  await expectNothingFailedToRender(page);
});
