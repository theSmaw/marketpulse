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
  const panels: number[] = [];
  for (let i = 0; i < 60; i += 1) {
    seen.push(await priceLine(page));
    panels.push(await page.getByText(/Fetching|Loading/u).count());
    if (seen.at(-1) !== before) break;
    await page.waitForTimeout(250);
  }

  // Never absent, never covered, and it did grow — three assertions because
  // "it never disappeared" is also true of a chart that never changed.
  expect(seen.filter((d) => d === "")).toHaveLength(0);
  expect(panels.filter((count) => count > 0)).toHaveLength(0);
  expect(seen.at(-1)).not.toBe(before);

  await expectNothingFailedToRender(page);
});
