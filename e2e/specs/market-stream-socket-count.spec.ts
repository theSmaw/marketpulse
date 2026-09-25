import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// **One socket, held** (Task 3.11.2).
//
// ## Why this exists, and it is not the reason it was commissioned
//
// Task 3.10.7 wrote a throwaway counter and reported that an ordinary security
// page opened **three market-stream sockets in twelve seconds**. It became a
// `docs/GAPS.md` entry, a floor on the gap refill, a paragraph in `CLAUDE.md`
// and a task of its own.
//
// **It was the instrument.** The counter took `page.on("websocket")` and
// counted every socket on the page — and on a dev server **two of the three
// are Vite's own HMR connection**. The third was ours, and it opened once.
//
// Measured 2026-09-25 with the URLs printed rather than the count:
//
// ```text
// dev          +96ms   OPEN   ws://localhost:5173/?token=…     <- Vite
//              +153ms  OPEN   ws://localhost:5173/?token=…     <- Vite
//              +308ms  closed ws://localhost:3000/market-stream  (+333ms)
//              +337ms  OPEN   ws://localhost:3000/market-stream
//
// deployed     +1212ms OPEN   wss://…/market-stream            <- one, held
// ```
//
// The open/close pair at +308ms is **`StrictMode`'s double-invoke**, which is
// development-only and is the effect's teardown being *proved* rather than a
// fault. With `StrictMode` removed the dev page opens **one**.
//
// ## So what this asserts is the product's actual claim
//
// **A page opens one market-stream socket and keeps it.** That is the thing
// nobody was checking, and a throwaway counter reporting otherwise cost a
// suppression, two documents and a task before it was read properly.
//
// ## The rule it encodes, which is the transferable part
//
// **Count by URL, never by event.** A browser page has sockets that are not
// this product's, and a number without a URL beside it cannot tell them apart.

/** Long enough for a retry to have happened — Task 3.5.5 backs off at 2 s. */
const WATCH_MS = 6_000;

test("a page opens one market-stream socket and keeps it", async ({ page }) => {
  const ours: { url: string; closedAt: number | null }[] = [];

  page.on("websocket", (ws) => {
    // **The filter is the assertion.** Without it this counts Vite's HMR.
    if (!ws.url().includes("/market-stream")) return;
    const entry = { url: ws.url(), closedAt: null as number | null };
    ours.push(entry);
    ws.on("close", () => {
      entry.closedAt = Date.now();
    });
  });

  await page.goto("/securities/NVDA");
  await expect(page.getByRole("region", { name: "Price" })).toBeVisible();
  await page.waitForTimeout(WATCH_MS);

  // **At most two, and the second only under `StrictMode`.** The development
  // double-invoke opens, tears down and re-opens within ~30 ms, which is the
  // cleanup working; a production build opens one. Asserting `=== 1` here
  // would be a test that fails on every developer's machine and passes in CI,
  // which is the worst of both.
  expect(ours.length).toBeLessThanOrEqual(2);

  // **The one that matters: the last one is still open.** A page that
  // reconnects for ever looks identical to a page that never disconnected —
  // `docs/GAPS.md`'s own note against this class — so what is asserted is that
  // the socket in hand at the end was never closed.
  expect(ours.at(-1)?.closedAt).toBeNull();

  await expectNothingFailedToRender(page);
});
