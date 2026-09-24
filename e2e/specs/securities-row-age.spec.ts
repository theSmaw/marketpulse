import { expect, test } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";
import { serveFeed } from "../support/feed.js";

// **A row the feed has moved past, produced through a real socket**
// (Task 3.10.4).
//
// ## Why this is a browser spec
//
// `UniverseTable.test.tsx` renders the component with an `observations` Map
// somebody typed. It cannot see that a **frame on the wire** becomes a row
// that says when — through `App`, the live-feed state, a memo boundary and
// 518 rows. That journey is where this epic's defects have actually lived.
//
// ## What CI can answer
//
// CI's store is **518 securities and zero bars**, so every row starts with an
// em dash and `No close yet`. That is enough: what is asserted here is what
// the SOCKET puts in the rows, and the socket is the test's.

const EXPLORER = "/securities";

/** A bar at a chosen minute, so two rows can differ only in their instant. */
const at = (close: number, iso: string) => ({
  startsAt: iso,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1_000,
});

test("a row behind the newest minute says when, and one level with it does not", async ({
  page,
}) => {
  const feed = await serveFeed(page, {
    snapshot: {
      // The newest minute on the page.
      AAPL: at(341.55, "2026-09-07T17:00:00.000Z"),
      // Three hours behind it, which §11.2 measured as inside the ordinary
      // range — the maximum gap between one security's bars is 187 minutes.
      NVDA: at(241.5, "2026-09-07T14:00:00.000Z"),
    },
  });

  await page.goto(EXPLORER);

  const behind = page.getByRole("row").filter({ hasText: "241.50" });
  const level = page.getByRole("row").filter({ hasText: "341.55" });

  await expect(behind).toContainText("10:00");
  await expect(behind).toContainText("Live price from 10:00");

  // The shared claim covers this one, so it has nothing of its own to add.
  await expect(level).toContainText("Live price");
  await expect(level).not.toContainText(/\d{2}:\d{2}/u);

  expect(feed.feed()).toBe("iex");
  await expectNothingFailedToRender(page);
});

test("the rows stay the same height, so nothing reflows under a reader", async ({
  page,
}) => {
  // The line carrying the instant is the one this column already reserved for
  // a stored row's session date. If it were a new element the table would
  // shrink and grow as the feed moved past one name and caught another.
  const feed = await serveFeed(page, {
    snapshot: {
      AAPL: at(341.55, "2026-09-07T17:00:00.000Z"),
      NVDA: at(241.5, "2026-09-07T14:00:00.000Z"),
    },
  });

  await page.goto(EXPLORER);

  const behind = page.getByRole("row").filter({ hasText: "241.50" });
  await expect(behind).toContainText("10:00");

  const heights = await page
    .getByRole("row")
    .filter({ hasText: /241\.50|341\.55/u })
    .evaluateAll((rows) =>
      rows.map((row) => row.getBoundingClientRect().height),
    );

  expect(heights).toHaveLength(2);
  expect(heights[0]).toBe(heights[1]);

  expect(feed.feed()).toBe("iex");
  await expectNothingFailedToRender(page);
});
