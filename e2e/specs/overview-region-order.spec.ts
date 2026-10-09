import { expect, test } from "@playwright/test";

import {
  expectEveryRegionIsATabStop,
  expectNothingFailedToRender,
} from "../support/app.js";

// **The landing route's six regions are in source order, and at ≤860 that is
// also the order the screen draws them** (Task 4.4.7).
//
// ## What this spec is for
//
// `MarketOverview.module.css` names every region's grid area, which is what
// lets the wide layout be column-major and the narrow one a single reading
// column. The price is that **source order and visual order are two
// independent facts** — the stylesheet can be re-laid without touching the
// route, and the route can be re-ordered without touching the stylesheet, and
// neither change is visible to anything below a real browser. jsdom computes no
// layout, so a DOM order that disagrees with the drawn order renders
// identically in every unit and component test in this repository.
//
// What is shipped is Task 4.4.7's decision: the DOM is in the **≤860 order**,
// because at ≤860 the stylesheet's own comment is that *order is the only
// hierarchy left* and at 1440 the grid is two-dimensional, so there is no
// single visual sequence for the DOM to agree with. There are **six tab
// stops** inside the grid — `Region` passes `scrollable` unconditionally and
// `Panel` renders `tabIndex={scrollable ? 0 : undefined}` — so the order is a
// keyboard reader's route through the screen, not a detail of the markup.
//
// ## Why 768 and not 1440
//
// 768 is the width where the claim is true and checkable. At 1440 and 1024 the
// grid is `topology unusual / sectors breadth / movers investigations` and the
// DOM order is deliberately **not** the geometric one — asserting agreement
// there would assert the opposite of the decision. Task 4.4.7 recorded that
// cost, its argument and its reversal trigger in `MarketOverview.tsx`.
//
// ## What it must not assert
//
// Not a pixel, not a height, not a figure. The assertion is **ordinal**: the
// six sections' top edges, read in DOM order, strictly increase. That is what
// makes it survive CI's store — 518 securities and zero bars, so every region
// here is either reserved or empty — and it is why the spec drives no frame.
// A region's *height* depends on what is in it; the order it is drawn in does
// not.
//
// What it also cannot say is whether the resulting sequence is *meaningful* to
// a listener. That is a screen-reader pass and it is `docs/GAPS.md`'s.
//
// ## And since Task 4.6.6 it holds the stops themselves, not only their order
//
// A sequence is only a keyboard reader's route through the screen while the six
// stops exist, and **axe stopped being able to say so** when Story 4.6 made the
// rows inside three of these regions into links: `scrollable-region-focusable`
// does not fire while the scrolling box contains something focusable. So the
// order assertion below is joined by `expectEveryRegionIsATabStop`, which is
// this spec's half of the mechanism ADR 0039 decided. The sibling half is on
// `/securities`, in `securities-route.spec.ts` — the route with the long table
// and the original defect's shape.

// The six regions inside the grid, in the order Task 4.4.7 put them in — the
// one-column order the ≤860 `grid-template-areas` block draws.
//
// `Market proxies` is absent on purpose: it is a `Region` too, but it sits in
// `.summary` **outside** the grid, so it is neither ordered by the areas block
// nor part of this claim.
const ORDER = [
  "Market breadth",
  "Sector performance",
  "Movers",
  "Market topology",
  "Unusual activity",
  "Current investigations",
] as const;

/*
 * **Both widths the `@media (width <= 860px)` block governs, not just one.**
 *
 * 768 covers the **rule** — one media query, one areas list, so a defect in the
 * rule shows there. 390 covers the **width**, and this product has already paid
 * for the difference: Task 4.3.5's subgrid defect was visible at 390 and at no
 * other width, with `pnpm verify` green and the page correct at the three wider
 * sizes, because **no assertion at 1440 visits that width**.
 *
 * One `for` rather than one test, because the two are the same claim about two
 * viewports and a failure must name which.
 */
for (const width of [768, 390] as const) {
  test(`the landing route's regions are drawn in DOM order at ${String(width)}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("region", { name: ORDER[0] })).toBeVisible();

    /*
     * Read the grid's section children in **DOM order**, each one's accessible
     * name taken from the heading its `aria-labelledby` points at — the one place
     * that name exists, because `Panel` labels itself with a `useId` and there is
     * nothing else to match on but the relationship.
     *
     * `document.querySelectorAll` returns document order, which is the half of
     * this assertion that no layout can supply; `getBoundingClientRect` is the
     * half that nothing below a browser can.
     *
     * **The population is the grid rather than a list of names**, and that is the
     * part that has to be got right. Filtering all the page's sections against
     * `ORDER` would make the corpus a hard-coded list — so the seventh region,
     * which Epic 5 or Story 4.5 may well add, would be *filtered out* and this
     * spec would stay green while being drawn in the wrong place. Scoping to the
     * container instead means a new region is in the population by construction
     * and this spec goes red until somebody says where in the sequence it
     * belongs, which is the decision Task 4.4.7 took and the one worth guarding.
     *
     * The container is found by its `display: grid` rather than by a class,
     * because the class is a CSS-module hash. `.summary`'s lone region is
     * excluded by the same means — its parent is not a grid.
     */
    const regions = await page.evaluate(() => {
      const sections = [
        ...document.querySelectorAll("section[aria-labelledby]"),
      ];
      const grids = new Set(
        sections
          .map((section) => section.parentElement)
          .filter(
            (parent) =>
              parent !== null && getComputedStyle(parent).display === "grid",
          ),
      );
      return sections
        .filter((section) => grids.has(section.parentElement))
        .map((section) => {
          const heading = document.getElementById(
            section.getAttribute("aria-labelledby") ?? "",
          );
          return {
            name: (heading?.textContent ?? "").trim(),
            top: Math.round(
              section.getBoundingClientRect().top + window.scrollY,
            ),
          };
        });
    });

    // Every region in the grid, in the source order Task 4.4.7 chose — and a
    // region added to the grid and not to this list is the tripwire above.
    expect(regions.map(({ name }) => name)).toEqual([...ORDER]);

    /*
     * And the screen draws them in that order: each top edge is **strictly**
     * below the last.
     *
     * Strictly, and not a sorted comparison. `Array.prototype.sort` is stable,
     * so sorting by position and comparing names passes wrongly whenever two
     * regions share a top edge — which is every two-column width, and is exactly
     * the state this assertion exists to distinguish 768 from. The sequence is
     * reported rather than the pairs, so a failure names what it found.
     */
    const descents = regions
      .slice(1)
      .map((region, index) => ({
        region,
        previous: regions[index],
      }))
      .filter(({ region, previous }) => region.top <= (previous?.top ?? -1))
      .map(
        ({ region, previous }) =>
          `${region.name} is not below ${previous?.name ?? "?"}`,
      );

    // `sequence` is on both sides so that a failure prints the order and the
    // edges it found rather than only the count of violations.
    const sequence = regions.map(({ name, top }) => `${name} @ ${String(top)}`);
    expect({ sequence, descents }).toEqual({ sequence, descents: [] });

    /*
     * **Seven rather than six**: the floor is every named region the route
     * draws, and `Market proxies` sits in `.summary` outside the grid. It is
     * excluded from `ORDER` because the areas block does not order it, and
     * included here because it is a region and the claim is about all of them.
     *
     * Three of the seven are `reserved` on every store, so this width also
     * covers the condition a later author is most likely to reach for — a stop
     * only where there is content — which the eight-region `/securities` check
     * cannot see at all.
     */
    await expectEveryRegionIsATabStop(page, { atLeast: 7 });

    await expectNothingFailedToRender(page);
  });
}
