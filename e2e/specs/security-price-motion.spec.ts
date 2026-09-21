import {
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type { WireFeedState, WireObservation } from "@marketpulse/shared";
import { expect, test } from "@playwright/test";
import type { Page, WebSocketRoute } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { MARKET_DATA_ROUTE_PATTERN } from "../support/pair.js";

// **What a reader who asked for less motion gets** (Task 3.4.7).
//
// Story 3.4's arrival mark is the product's first motion that carries
// information rather than decorating a wait, and `prefers-reduced-motion`
// removes it. That makes one question load-bearing: **is a change still
// perceivable when the mark does not run?**
//
// ## Why this cannot exist below a browser, twice over
//
// No stylesheet is applied in the component tests — `getTokens()` throws there
// by design — so **a computed opacity is not a question that level can ask**.
// And `prefers-reduced-motion` is a media query, which only a real engine
// evaluates. Every assertion here is about a computed style under an emulated
// preference, and there is no cheaper level that could hold any of them.
//
// ## The defect this exists to stop coming back
//
// Task 3.4.5 shipped the mark with **no base `opacity`**. Reduced motion
// resolves the duration to `0ms`, an animation of zero duration applies **no
// keyframe styles at all**, and the element therefore rendered at the CSS
// initial value of `1` — a **permanent dot** beside the price, which is the
// opposite of the vocabulary that task shipped, because a mark that persists
// reads as a *state*. `docs/GAPS.md` entry 11 named this task as its owner.
//
// ## How the feed is produced
//
// Answered entirely from the test, `market-connection.spec.ts`'s
// `serveSnapshot` pattern: CI has no credential, so a runner cannot otherwise
// reach a state where a price exists at all. Built with the shipped encoder, so
// a protocol change breaks this at the compiler rather than at an assertion.

const EXPLORER = "/securities/NVDA";

const LIVE_FEED: WireFeedState = {
  status: "live",
  feed: "iex",
  marketOpen: true,
};

/** 14:01 ET on a Wednesday — inside the session, so no extended-hours word. */
const FIRST_MINUTE = "2026-09-16T18:01:00Z";
const NEXT_MINUTE = "2026-09-16T18:02:00Z";

const bar = (startsAt: string, close: number): WireObservation => ({
  startsAt,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

/**
 * Serve the socket from the test and hand back a way to push more frames.
 *
 * The snapshot is what makes a price exist on the first paint; the returned
 * `push` is what makes one **arrive**, which is the event this whole spec is
 * about and the only thing that draws a mark.
 */
async function serveFeed(
  page: Page,
  observations: Readonly<Record<string, WireObservation>>,
): Promise<(next: Readonly<Record<string, WireObservation>>) => void> {
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: LIVE_FEED.feed }),
    }),
  );

  let socket: WebSocketRoute | undefined;

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    socket = ws;
    ws.send(
      encodeMarketStreamMessage({
        type: "snapshot",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        observations,
        feed: LIVE_FEED,
      }),
    );
  });

  return (next) => {
    socket?.send(
      encodeMarketStreamMessage({
        type: "bars",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        observations: next,
      }),
    );
  };
}

/** The identity block's figure and its qualifier, by the label above them. */
function latestPrice(page: Page) {
  return page.getByText("Latest price", { exact: true }).locator("..");
}

const markOf = (page: Page) => page.locator("[data-arrival]");

test("the mark is INVISIBLE under reduced motion, not permanent", async ({
  page,
}) => {
  // **`docs/GAPS.md` entry 11.** The failure this replaces was not a missing
  // animation — it was a dot that arrived and never left, which reads as a
  // state rather than as a fact that arrived.
  await page.emulateMedia({ reducedMotion: "reduce" });

  const push = await serveFeed(page, { NVDA: bar(FIRST_MINUTE, 219.5) });
  await page.goto(EXPLORER, { waitUntil: "networkidle" });
  await expect(latestPrice(page)).toBeVisible();

  push({ NVDA: bar(NEXT_MINUTE, 219.62) });

  // The element is in the tree — the arrival happened — and it paints nothing.
  await expect(markOf(page)).toHaveCount(1);
  await expect(markOf(page)).toHaveCSS("opacity", "0");
  await expect(markOf(page)).toHaveCSS("animation-duration", "0s");

  await expectNothingFailedToRender(page);
});

test("and it DOES run when nobody asked for less motion", async ({ page }) => {
  // The control, and it is what makes the test above an assertion about the
  // preference rather than about a mark that never worked. Asserted on the
  // animation rather than on a sampled opacity, because a 900 ms decay read at
  // an arbitrary moment is a race and this is not.
  await page.emulateMedia({ reducedMotion: "no-preference" });

  const push = await serveFeed(page, { NVDA: bar(FIRST_MINUTE, 219.5) });
  await page.goto(EXPLORER, { waitUntil: "networkidle" });
  await expect(latestPrice(page)).toBeVisible();

  push({ NVDA: bar(NEXT_MINUTE, 219.62) });

  await expect(markOf(page)).toHaveCount(1);
  await expect(markOf(page)).toHaveCSS("animation-duration", "0.9s");
  // **A regex, because a `@keyframes` name inside a CSS Module is scoped and
  // hashed** — the computed value is `_arrival-decays_14tpr_1` and the suffix
  // is a build artefact. Asserting the literal would be asserting the bundler.
  await expect(markOf(page)).toHaveCSS("animation-name", /arrival-decays/u);

  await expectNothingFailedToRender(page);
});

test("a price that MOVED is still perceivable with the motion removed", async ({
  page,
}) => {
  // Criterion 3, the easy half: the digits, the percentage and the arrow are
  // all different and all present without the animation. The mark only ever
  // said *look*.
  await page.emulateMedia({ reducedMotion: "reduce" });

  const push = await serveFeed(page, { NVDA: bar(FIRST_MINUTE, 219.5) });
  await page.goto(EXPLORER, { waitUntil: "networkidle" });
  await expect(latestPrice(page)).toContainText("219.50");

  push({ NVDA: bar(NEXT_MINUTE, 219.62) });

  await expect(latestPrice(page)).toContainText("219.62");

  await expectNothingFailedToRender(page);
});

test("an UNCHANGED tick is still perceivable with the motion removed", async ({
  page,
}) => {
  // **The criterion that bites, and the reason this task exists.**
  //
  // The owner chose to fire the mark on every bar arrival, including one that
  // changes nothing — and on that minute the mark is the ONLY thing that moves,
  // because by definition no digit did. Reduced motion removes exactly that.
  //
  // What survives is the qualifier's own instant, which advances on a real
  // arrival whether or not the price did. That is a fact already on the screen
  // rather than a fallback invented for this case, and asserting it is what
  // makes criterion 3 true rather than argued.
  await page.emulateMedia({ reducedMotion: "reduce" });

  const push = await serveFeed(page, { NVDA: bar(FIRST_MINUTE, 219.5) });
  await page.goto(EXPLORER, { waitUntil: "networkidle" });

  const block = latestPrice(page);
  await expect(block).toContainText("14:01");

  // The SAME close, one minute later. A price comparison sees nothing at all.
  push({ NVDA: bar(NEXT_MINUTE, 219.5) });

  await expect(block).toContainText("14:02");
  await expect(block).toContainText("219.50");

  await expectNothingFailedToRender(page);
});

test("nothing on this block carries direction by hue alone", async ({
  page,
}) => {
  // **Criterion 4, as a check rather than as a screenshot.**
  //
  // The task asked for five states in one greyscale frame. Enumerating what
  // the block actually paints turns out to answer it more completely and
  // keeps answering it: the price palette differs by **1.04:1 in greyscale**,
  // so what matters is not how a frame looks but whether any element is
  // carrying meaning in hue **alone**.
  //
  // Three of the five states were looked at on the running page by Task 3.4.6.
  // The other two add no hue-bearing element — a correction renders exactly
  // what a tick renders, and the extended-hours mark is a word — so a fourth
  // and fifth frame would be the same pixels. This assertion covers all five
  // and every state added after them.
  const push = await serveFeed(page, { NVDA: bar(FIRST_MINUTE, 219.5) });
  await page.goto(EXPLORER, { waitUntil: "networkidle" });
  await expect(latestPrice(page)).toBeVisible();

  push({ NVDA: bar(NEXT_MINUTE, 219.62) });
  await expect(latestPrice(page)).toContainText("219.62");

  const offenders = await page.evaluate(() => {
    const root = document.querySelector('[class*="_close_"]');
    if (root === null) return ["the identity block's figure was not found"];

    const resolved = (name: string): string => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };

    const palette = new Set([
      resolved("--price-positive"),
      resolved("--price-negative"),
    ]);

    return (
      [...root.querySelectorAll("*")]
        .filter((element) => palette.has(getComputedStyle(element).color))
        // **A glyph OR a direction word.** The first draft looked for a glyph
        // only and reported `PriceChange`'s visually-hidden *up* as an
        // offender — which carries direction more strongly than the glyph does,
        // because it is what a listener is handed. A check that fails on the
        // best encoding in the component is a check written from the rule's
        // letter rather than its point.
        .filter(
          (element) => !/[▲▼]|\b(?:up|down)\b/iu.test(element.textContent),
        )
        .map((element) => element.textContent.trim())
    );
  });

  // Every element wearing a price colour also wears a glyph. `PriceChange`
  // carries a third encoding on top — a visually-hidden *up* / *down* — which
  // is what a listener is handed, and which no greyscale frame can show.
  expect(offenders).toEqual([]);

  await expectNothingFailedToRender(page);
});
