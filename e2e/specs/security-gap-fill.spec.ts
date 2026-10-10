import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";

// **A dropout stops costing the rest of the day** (Task 3.10.7).
//
// Story 3.10's criterion 4: *restoring the feed fills the gap rather than
// resuming beside it.* While a page's socket is down the minutes keep
// happening and the page watches none of them — `useLiveSeries` accumulates
// what **arrives** — so the series it holds has a hole that no arriving bar
// can close.
//
// ## Why this cannot exist below a browser
//
// The pieces have their own tests: `live-feed.test.ts` holds the counter,
// `use-bar-series.test.ts` holds the refill and its silence. Neither can see
// **a page** — that a socket closing and re-opening on a route reaches a hook
// a chart reads, through `App`, a prop and two memo boundaries. That is the
// defect family this suite exists for, and Task 3.10.6 shipped one of them:
// an announcement that every unit test passed and that lived for one render.
//
// ## Why every byte is served from here
//
// CI's store is 518 securities and **zero bars**. More than that: the gap is
// only observable as **a difference between two answers to one request**, and
// no real store can be made to change between two ticks of a spec. So the
// harness serves a short answer, the socket drops and returns, and the
// harness serves the fuller one — which is exactly what the deployed store
// does on its own, because since Task 3.8.3 the backend writes every live bar
// as it lands.

const RECORDED = JSON.parse(
  readFileSync(
    new URL(
      "../../apps/frontend/src/fixtures/bar-series/dense.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  series: {
    bars: { startsAt: string }[];
    provenance: { sources: { barCount: number }[] };
    coverage: { covered: { end: string } };
  };
};

/** How many minutes the dropout costs — the hole, in bars. */
const LOST = 40;

const ALL = RECORDED.series.bars.length;

const shortened = (drop: number): string => {
  // `0` is the recorded answer itself — the session as the store holds it
  // after the minutes the dropout cost have been written down.
  if (drop === 0) return JSON.stringify(RECORDED);

  const kept = RECORDED.series.bars.slice(0, ALL - drop);
  const end = RECORDED.series.bars[ALL - drop]?.startsAt;
  if (end === undefined) throw new Error("the recorded session is too short");

  return JSON.stringify({
    ...RECORDED,
    series: {
      ...RECORDED.series,
      bars: kept,
      provenance: {
        ...RECORDED.series.provenance,
        sources: RECORDED.series.provenance.sources.map((source, index, all) =>
          index === all.length - 1
            ? { ...source, barCount: source.barCount - drop }
            : source,
        ),
      },
      coverage: {
        ...RECORDED.series.coverage,
        covered: { ...RECORDED.series.coverage.covered, end },
      },
    },
  });
};

/** What the store held when the page opened, and what it holds after. */
const BEFORE = shortened(LOST);
const AFTER = shortened(0);

const held = (count: number): string => count.toLocaleString("en-US");

/**
 * The price line's own `d`, found by length rather than by role.
 *
 * **`svg path` first resolves to an icon in the chrome** — which is how the
 * first draft of this asserted that a 5-pixel activity glyph had not changed
 * shape, and waited thirty seconds for it. The longest path on the page is
 * the one joining hundreds of closes; nothing else comes close.
 */
async function priceLine(page: Page): Promise<string> {
  return page.evaluate(() =>
    [...document.querySelectorAll("path")]
      .map((path) => path.getAttribute("d") ?? "")
      .reduce((longest, d) => (d.length > longest.length ? d : longest), ""),
  );
}

/**
 * Every cover a plot can draw over its own picture, counted by identity.
 *
 * **Not by text, and that is the whole of Task 4.8.13's first repair.** ADR
 * 0028's cover is `ChartPending`, which is in full a text-less
 * `aria-hidden` div — so `getByText` is structurally incapable of seeing it,
 * and the predicate that tried matched two sentences belonging to the
 * **518-row Explorer shell** instead (`SecuritySearch`'s `Loading
 * securities. …` and `UniverseTable`'s `Loading the tracked universe…`).
 * Task 4.8.9 measured that: 13 of 13 failures, every one `Received array:
 * [2]`, never `[1]`.
 *
 * Two things are counted, because a plot has two ways of ceasing to show its
 * picture and `seen` below only catches one of them:
 *
 *   - **`ChartPending`**, by the CSS-module class it owns. `_pending_` is one
 *     class in the whole built stylesheet, and both plots render the
 *     component, so this covers the price plot and the volume plot at once.
 *     `[class*="_x_"]` is this suite's established idiom for a module class
 *     (`security-price-motion.spec.ts`, `overview-breadth-region.spec.ts`).
 *   - **`BarSeriesPanel`'s `Reading the series…`**, which is the panel being
 *     replaced wholesale rather than covered. `seen` cannot see that:
 *     `priceLine` returns the **longest path on the page**, so with the plot
 *     gone it returns a chrome icon's `d` — non-empty, and different from
 *     `before`, which breaks the loop and passes. That is a false pass the
 *     old predicate could not have caught either.
 *
 * One `evaluate` rather than two locator counts, because this is sampled 120
 * times and each round trip is paid per sample.
 *
 * **It returns names rather than a count**, and that was the second correction
 * (Task 4.8.13). A count made the repaired assertion fail with exactly the
 * string the broken one did — `Received array: [2]` — so a real cover and the
 * old wrong-subject match were indistinguishable in the output. Whatever this
 * assertion goes red on next, it says which plot and which state.
 */
async function covers(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    // The regions are plain `<section aria-labelledby>`, so their `region`
    // role is **implicit** and `[role="region"]` matches none of them — which
    // cost one arm of Task 4.8.13's measurement, reported as `over ?`.
    const named: string[] = [];
    const nameOf = (element: Element): string =>
      element.closest("section")?.querySelector("h2")?.textContent ?? "?";

    for (const element of document.querySelectorAll('[class*="_pending_"]')) {
      named.push(`ChartPending over ${nameOf(element)}`);
    }

    for (const line of document.querySelectorAll("p")) {
      if (!line.textContent.includes("Reading the series…")) continue;
      named.push(`"Reading the series…" in ${nameOf(line)}`);
    }

    return named;
  });
}

/** The spoken sentence, which is where the chart states its own count. */
async function spoken(page: Page): Promise<string> {
  return (
    await page
      .getByText(/price chart:/u)
      .first()
      .innerText()
  )
    .replace(/\s+/gu, " ")
    .trim();
}

test("a dropout leaves a hole, and the feed coming back fills it", async ({
  page,
}) => {
  const feed = await serveFeed(page, { snapshot: {}, bars: BEFORE });

  await page.goto("/securities/NVDA?sessions=5");

  // What the page opened with: the session, minus the minutes it is about to
  // miss. This is the *before*, asserted so the *after* means something.
  await expect
    .poll(() => spoken(page))
    .toContain(`a line of ${held(ALL - LOST)} closing prices`);

  // The minutes happen while this page cannot hear them. Nothing arrives:
  // that is the whole point, and it is why no amount of live bars afterwards
  // closes the hole.
  feed.drop();
  await expect(page.locator("footer")).toContainText(/disconnected/iu);

  // The store kept filling — the deployed backend writes every live bar it
  // receives, whatever this browser's socket is doing.
  feed.serveBars(AFTER);

  // And the browser dials again on its own. **Nothing here reconnects it**:
  // the retry is Task 3.5.5's, the snapshot that greets it is the gateway's,
  // and the refill is this task's. A spec that reloaded the page would assert
  // none of that.
  //
  // **It comes back reading `STALE`, not `LIVE`, and that is correct** — the
  // reconnection delivers a snapshot and no new bar, so the 60 s wall-clock
  // rule is still right that nothing has arrived. The refill keys on the
  // snapshot rather than on the word, which is why the gap fills anyway.
  await expect(page.locator("footer")).not.toContainText(/disconnected/iu, {
    timeout: 15_000,
  });

  await expect
    .poll(() => spoken(page), { timeout: 15_000 })
    .toContain(`a line of ${held(ALL)} closing prices`);

  expect(feed.feed()).toBe("iex");
  await expectNothingFailedToRender(page);
});

test("the chart is never blanked or covered while the gap is filled", async ({
  page,
}) => {
  // **The sampling budget below is the whole of this test's flakiness, and it
  // is a budget rather than a race.** Measured at **14 failures in 120
  // executions (~12%)** between 2026-09-26 and 2026-10-07, every one of them
  // the final assertion — the line never grew *within the window*, not the line
  // never grew. The loop was 60 × 250 ms = **15 s**, against a refill that has
  // to survive a socket drop, a reconnect and a served answer on a machine
  // running the whole suite in parallel.
  //
  // Raised to 30 s of sampling with the per-test timeout lifted clear of it.
  // **A healthy run costs nothing** — the loop breaks on the first changed
  // frame, which is sub-second on an idle machine — so the extra budget is
  // spent only by the runs that were failing.
  //
  // This is deliberately NOT a retry: `retries: 0` is argued in
  // `playwright.config.ts` and stands. A retry cannot tell a flake from a
  // defect; a longer window still fails if the line never grows at all, which
  // is the defect this test exists for.
  //
  // **Amended 2026-10-10 by Task 4.8.9 — the first paragraph above is no longer
  // true of this test, and the budget is not where its flakiness is.**
  // Re-characterised at n = 96 on one checkout: **1 / 24 at `--workers=1` and
  // 12 / 48 at `--workers=4`** (25%, which is the worker count the suite
  // actually runs at), and **13 of 13 failures are the PANEL assertion below,
  // 0 of 13 the final one.** So either the mode moved when the window doubled —
  // the generous reading, and the raise then did its job — or the claim above
  // was wrong when written. The rate did not fall either way.
  //
  // **What the panel assertion counted was not this chart.** ADR 0028's cover
  // is `ChartPending`, a text-less `aria-hidden` div that `getByText` cannot
  // see; `BarSeriesPanel`'s other pending state says `Reading the series…`; and
  // `Fetching` exists nowhere in the product. The two elements it did match —
  // every failure read `[2]`, never `[1]` — were `SecuritySearch`'s `Loading
  // securities. …` and `UniverseTable`'s `Loading the tracked universe…`, which
  // is the **518-row Explorer shell's own first load** racing this loop's start.
  //
  // **Repaired 2026-10-10 by Task 4.8.13**, which is the decision `docs/GAPS.md`
  // said was owed: the cover is counted by the module class it owns rather than
  // by text on a sibling, and the window is deliberately **not** widened — a
  // longer window cannot help an assertion about a different surface's first
  // paint, which is what the 2026-10-07 raise already demonstrated. See
  // `covers()` above. Re-measured after the repair at **0 failures in 48
  // executions at four workers** (95% CI 0–7.4%), against 12 / 48 (25.0%,
  // CI 13.6–39.6%) before it.
  test.setTimeout(60_000);

  // **Nobody asked for the refill**, so it must not look like a wait. ADR
  // 0028's rule that a wait over 160 ms draws a panel over the picture is
  // about a wait a reader caused; a socket that blinked 38 times in 4h 36m on
  // 2026-09-22 must not pulse a panel over the chart 38 times.
  const feed = await serveFeed(page, { snapshot: {}, bars: BEFORE });

  await page.goto("/securities/NVDA?sessions=5");
  await expect
    .poll(() => spoken(page))
    .toContain(`a line of ${held(ALL - LOST)} closing prices`);

  const before = await priceLine(page);
  expect(before).not.toBe("");

  feed.drop();
  await expect(page.locator("footer")).toContainText(/disconnected/iu);
  feed.serveBars(AFTER);

  // Watch the whole journey rather than its ends: at no point is the line
  // absent, and at no point is the pending panel over it.
  const seen: string[] = [];
  const panels: string[][] = [];
  for (let i = 0; i < 120; i += 1) {
    seen.push(await priceLine(page));
    panels.push(await covers(page));
    if (seen.at(-1) !== before) break;
    await page.waitForTimeout(250);
  }

  // Never absent, never covered, and it did grow — three assertions because
  // "it never disappeared" is also true of a chart that never changed.
  expect(seen.filter((d) => d === "")).toHaveLength(0);
  expect(
    panels.flatMap((named, sample) =>
      named.map((name) => `sample ${String(sample)}: ${name}`),
    ),
    "a cover was drawn over a plot during a refill nobody asked for",
  ).toEqual([]);
  expect(seen.at(-1)).not.toBe(before);

  await expectNothingFailedToRender(page);
});
