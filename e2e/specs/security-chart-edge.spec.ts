import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";

// **What the chart says when its data stops, and what it deliberately does
// not say** (Task 3.10.5).
//
// Story 3.9's close handed this task the premise that *the plot ends at the
// last bar that arrived and looks exactly like a chart of a window that ended
// there*. **It does not**, and these assertions are what stops that premise
// coming back: the coverage treatment has drawn the boundary since Story 2.12
// and nothing framed it as *a stopped edge against a finished window*.
//
// The second half is the decision. A dead feed adds **nothing** to the plot,
// because `CHARTING.md`'s rule is that a mark is derived from the window or
// from the bars — and a mark derived from the **connection** is neither.

// **Every byte of the answer is served from here, and the first version of
// this file was not** (corrected 2026-09-24 by Task 3.10.7).
//
// These three tests read the deployment's own store, which on a developer's
// machine holds a backfilled NVDA and **on CI holds zero bars**. So the wash
// they assert on is present locally and the chart on the runner is a correct
// `empty` — *"No history is stored for NVDA at this timeframe"* — and the
// spec went green here and **red on CI**, which is the exact trap
// `CLAUDE.md`'s working loop names: *before asserting on a NUMBER in a browser
// spec, ask whether CI has the data.*
//
// `uncovered.json` is the recorded answer this wants: 780 bars ending
// 2026-09-04 inside a window that runs to 2026-09-08, which **is** a window
// reaching past its bars — the shape a session leaves when a feed stops.
const UNCOVERED = readFileSync(
  new URL(
    "../../apps/frontend/src/fixtures/bar-series/uncovered.json",
    import.meta.url,
  ),
  "utf8",
);

/** The chart's own SVG, which is the largest on the page. */
function plot(page: Page) {
  return page
    .locator("svg")
    .filter({ has: page.locator("path") })
    .first();
}

/** How much of the frame is washed as ground we hold nothing for. */
async function uncoveredWidth(page: Page): Promise<number> {
  return page.evaluate(() => {
    const rects = [...document.querySelectorAll("rect")].filter((rect) =>
      (rect.getAttribute("class") ?? "").includes("uncovered"),
    );
    return rects.reduce(
      (total, rect) => total + Number(rect.getAttribute("width") ?? 0),
      0,
    );
  });
}

test("an edge that stopped does not read as a window that ended", async ({
  page,
}) => {
  const feed = await serveFeed(page, { snapshot: {}, bars: UNCOVERED });

  // 25 sessions against a store that ends earlier: the window runs past the
  // bars, which is exactly the shape a session leaves when the feed stops.
  await page.goto("/securities/NVDA?sessions=25");
  await expect(page.getByText(/price chart:/u).first()).toBeVisible();

  // **Poll rather than read once.** The spoken sentence lands with the state;
  // the plot's geometry needs a measured box, which arrives a frame later from
  // the `ResizeObserver`. Reading both in the same tick is a race the first
  // draft of this lost.
  await expect.poll(() => uncoveredWidth(page)).toBeGreaterThan(0);
  await expect(plot(page)).toBeVisible();

  // And the chart SAYS it, for a reader who cannot see the wash — the count is
  // the honest channel for how far the data reaches.
  await expect(page.getByText(/price chart:/u).first()).toContainText(
    /covers the first [\d,]+ of [\d,]+ trading minutes|runs the full width/u,
  );

  expect(feed.feed()).toBe("iex");
  await expectNothingFailedToRender(page);
});

test("killing the feed changes nothing on the plot, which is the decision", async ({
  page,
}) => {
  // **A mark derived from the connection would be a third kind**, and the
  // chrome already owns that fact with its own sentence and instant. Two
  // surfaces saying one thing is the defect this repository has produced three
  // times on one screen.
  const feed = await serveFeed(page, { snapshot: {}, bars: UNCOVERED });

  await page.goto("/securities/NVDA?sessions=25");
  await expect(page.getByText(/price chart:/u).first()).toBeVisible();

  await expect.poll(() => uncoveredWidth(page)).toBeGreaterThan(0);
  const before = await plot(page).innerHTML();
  const washedBefore = await uncoveredWidth(page);

  feed.drop();
  await expect(page.locator("footer")).toContainText(/disconnected/iu);

  expect(await plot(page).innerHTML()).toBe(before);
  expect(await uncoveredWidth(page)).toBe(washedBefore);

  await expectNothingFailedToRender(page);
});

test("the line stays continuous across the minutes a thin name did not trade", async ({
  page,
}) => {
  // **The trigger Task 3.5.5 recorded has fired and the answer is no.** Its
  // premise is that a missing minute is exceptional; §7.6 measured IEX at
  // 65.1% of minutes for a median symbol, and `ERIE` at 131 of 390 on the
  // CONSOLIDATED tape. Washing every missing minute would mark a third of an
  // ordinary chart as a fault.
  //
  // One path, one `M`. This asserts the decision rather than an implementation
  // detail: a broken-up line is what the rejected alternative looks like.
  const feed = await serveFeed(page, { snapshot: {}, bars: UNCOVERED });

  await page.goto("/securities/NVDA?sessions=25");
  await expect(page.getByText(/price chart:/u).first()).toBeVisible();

  await expect.poll(() => uncoveredWidth(page)).toBeGreaterThan(0);

  const moves = await page.evaluate(() => {
    const paths = [...document.querySelectorAll("path")]
      .map((path) => path.getAttribute("d") ?? "")
      .filter((d) => d.startsWith("M"));
    const line = paths.find((d) => !d.includes("Z")) ?? paths[0] ?? "";
    return (line.match(/M/gu) ?? []).length;
  });

  expect(moves).toBe(1);

  expect(feed.feed()).toBe("iex");
  await expectNothingFailedToRender(page);
});
