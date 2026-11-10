import type { WireObservation } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";

// **The graph-level live-update mark, drawn and decaying** (Task 6.7.2, Open
// Decision 1) — the browser-level half, which neither a unit test (jsdom has
// no 2d context) nor the real backend (CI's store has zero bars, so no real
// `bars` frame ever arrives there) can exercise.
//
// `overview-market-topology-anomaly-bands.spec.ts`'s own idiom is reused
// whole: `serveFeed`, a whole-canvas `toDataURL()` comparison rather than a
// reproduced affine transform, and a positive control before anything else is
// trusted to prove an absence. The one addition this file needs is a REAL
// `bars` frame — `feed.send(...)` — rather than an `overview` frame, because
// the mark is fired by `observations` advancing (Task 6.7.1's own
// `sameLiveFeedView` reasoning: an `overview` frame arrives up to sixteen
// times a minute whether or not a price moved; `observations` changes
// reference only when a bar genuinely arrived).

const OVERVIEW = "/";
const FIRST_MINUTE = "2026-09-16T18:01:00Z";
const NEXT_MINUTE = "2026-09-16T18:02:00Z";

const observation = (startsAt: string, close: number): WireObservation => ({
  startsAt,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

const topologyCanvas = (page: Page) =>
  page
    .getByRole("region", { name: "Market topology" })
    .getByRole("img", { name: /A graph of every security we track/u });

/** The canvas's own rendered bytes, as a data URL — compared whole. */
const canvasImage = (page: Page): Promise<string> =>
  topologyCanvas(page).evaluate((element) =>
    (element as HTMLCanvasElement).toDataURL(),
  );

/**
 * The canvas's bytes, once they have stopped changing on their own — see
 * `overview-market-topology-anomaly-bands.spec.ts`'s identical helper for why
 * two consecutive identical reads are what "settled" means here (mount is at
 * least two draws, not one).
 */
async function settledCanvasImage(page: Page): Promise<string> {
  let previous = await canvasImage(page);

  await expect
    .poll(async () => {
      const current = await canvasImage(page);
      const same = current === previous;
      previous = current;
      return same;
    })
    .toBe(true);

  return previous;
}

test.use({ viewport: { width: 1440, height: 900 } });

test("a live burst produces one decaying graph-level mark, and the loop is proved running rather than assumed", async ({
  page,
}) => {
  const feed = await serveFeed(page, {
    snapshot: { SPY: observation(FIRST_MINUTE, 100) },
  });
  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();

  const atRest = await settledCanvasImage(page);

  // **A real bar, not a snapshot** — `withDelivery`'s own distinction, which
  // is the one `MarketOverview.tsx`'s new effect reads to tell *a live batch
  // arrived* from *the join merely ran again*.
  feed.send({ SPY: observation(NEXT_MINUTE, 101) });

  // **Sampled repeatedly through the decay window, not once** — Done-when 3's
  // own instruction. A single before/after pair cannot tell a loop that ran
  // several distinct frames from one that jumped straight from "mark" to "no
  // mark" in a single step; several DISTINCT consecutive reads is what a
  // continuously fading wash actually produces and a static two-state swap
  // does not.
  const samples: string[] = [];
  for (let sample = 0; sample < 6; sample += 1) {
    samples.push(await canvasImage(page));
    await page.waitForTimeout(150);
  }

  const distinct = new Set(samples).size;
  expect(distinct).toBeGreaterThan(2);
  // And at least one of those reads was genuinely different from the
  // at-rest baseline — the mark painted something, rather than the six
  // samples all missing it.
  expect(samples.some((sample) => sample !== atRest)).toBe(true);

  // **And the loop stops on its own.** `--motion-duration-decay` is 900 ms;
  // well past that, the canvas has to be back to EXACTLY the pre-burst
  // picture — the topology draws nothing from a bar's price, only from the
  // universe, the bands and the live-mark wash, so nothing else could have
  // moved.
  await page.waitForTimeout(600);
  expect(await settledCanvasImage(page)).toBe(atRest);

  await expectNothingFailedToRender(page);
});

test("under prefers-reduced-motion the mark does not paint at all, against a control that shows it does", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const feed = await serveFeed(page, {
    snapshot: { SPY: observation(FIRST_MINUTE, 100) },
  });
  await page.goto(OVERVIEW);
  await expect(topologyCanvas(page)).toBeVisible();

  const atRest = await settledCanvasImage(page);

  feed.send({ SPY: observation(NEXT_MINUTE, 101) });

  // **A window generous enough to have caught the control's own mark**
  // (900 ms at full strength) finding nothing — `--motion-duration-decay`
  // resolves to `0ms` under this preference, so `liveMarkShape` reaches `0`
  // on the very first frame and no visible paint happens at all.
  for (let sample = 0; sample < 6; sample += 1) {
    expect(await canvasImage(page)).toBe(atRest);
    await page.waitForTimeout(150);
  }

  await expectNothingFailedToRender(page);
});
