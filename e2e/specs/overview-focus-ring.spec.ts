import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { expectNothingFailedToRender } from "../support/app.js";

// **Every tab stop's FOCUS RING clears both sticky edges, at four widths, in
// both directions** (Task 4.6.1).

const OVERVIEW = "/";

/** One stop in the walk, with both clearances already computed. */
interface Stop {
  readonly label: string;
  readonly height: number;
  readonly exempt: string | null;
  readonly topClearance: number;
  readonly bottomClearance: number;
}

/**
 * Wait for a landing page whose regions have the content they are going to
 * have, in **either store shape**.
 *
 * The stop count on this screen is data-dependent — Task 4.6.5's subject — so a
 * walk taken mid-paint counts fewer stops than the same page a second later.
 * **CI's store is 518 securities and zero bars, CI has no provider and no
 * upstream socket**, so no overview frame ever reaches a gated browser and the
 * movers region's permanent state there is `No moves to rank yet.` A developer's
 * pair produces a frame within a second or two and the region then states the
 * population it ranked over.
 *
 * So the arrived state is waited for **first**, briefly, and the
 * never-arriving one is the fallback rather than the other half of an `.or()`:
 * an `.or()` matches the nothing-arrived sentence on the first paint of a page
 * whose frame is a second away, which is the walk being taken during the
 * arrival rather than after it.
 */
async function settled(page: Page): Promise<void> {
  const region = page.getByRole("region", { name: "Movers" });

  try {
    await expect(
      region.getByText(/Of the \d+ companies we track/).first(),
    ).toBeVisible({ timeout: 4000 });
  } catch {
    await expect(region.getByText("No moves to rank yet.")).toBeVisible();
  }
}

async function ringReach(page: Page): Promise<number> {
  const reach = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return (
      Number.parseFloat(root.getPropertyValue("--focus-width")) +
      Number.parseFloat(root.getPropertyValue("--focus-offset"))
    );
  });

  if (!Number.isFinite(reach) || reach <= 0) {
    throw new Error(
      `--focus-width + --focus-offset read as ${String(reach)}; the tolerance ` +
        "is read from the cascade and a missing token must be loud rather " +
        "than a zero that passes everything.",
    );
  }

  return reach;
}

async function readStop(page: Page, ring: number): Promise<Stop> {
  return page.evaluate((ring) => {
    const element = document.activeElement;
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");

    if (element === null || header === null || footer === null) {
      throw new Error("the chrome is not on the page");
    }

    const box = element.getBoundingClientRect();
    const label = `${element.tagName} ${
      element.getAttribute("aria-label") ??
      element.textContent.trim().slice(0, 40)
    }`;

    const insideChrome = header.contains(element) || footer.contains(element);
    const tallerThanViewport = box.height >= window.innerHeight;

    return {
      label,
      height: box.height,
      exempt: insideChrome
        ? "inside the chrome"
        : tallerThanViewport
          ? "taller than the viewport"
          : null,
      topClearance: box.top - ring - header.getBoundingClientRect().bottom,
      bottomClearance: footer.getBoundingClientRect().top - (box.bottom + ring),
    };
  }, ring);
}

async function walk(
  page: Page,
  direction: "Tab" | "Shift+Tab",
  presses: number,
  ring: number,
): Promise<Stop[]> {
  const stops: Stop[] = [];

  for (let press = 0; press < presses; press += 1) {
    await page.keyboard.press(direction);
    stops.push(await readStop(page, ring));
  }

  return stops;
}

const WIDTHS = [
  [1440, 900],
  [1024, 900],
  [768, 800],
  [390, 780],
] as const;

const PRESSES = 30;

for (const [width, height] of WIDTHS) {
  for (const direction of ["Tab", "Shift+Tab"] as const) {
    test(`no focus ring crosses a sticky edge at ${String(width)}px walking ${direction}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto(OVERVIEW);

      await settled(page);

      const reach = await ringReach(page);
      const stops = await walk(page, direction, PRESSES, reach);

      console.log(
        `\n${String(width)}px ${direction} — ring reach ${String(reach)}px`,
      );
      for (const stop of stops) {
        console.log(
          `  top ${stop.topClearance.toFixed(1)}  bottom ` +
            `${stop.bottomClearance.toFixed(1)}  h${stop.height.toFixed(0)}` +
            `${stop.exempt === null ? "" : ` [${stop.exempt}]`}  ${stop.label}`,
        );
      }

      const failures = stops
        .filter((stop) => stop.exempt === null)
        .filter((stop) => stop.topClearance < 0 || stop.bottomClearance < 0)
        .map(
          (stop) =>
            `${stop.label} — top ${stop.topClearance.toFixed(1)}, bottom ${stop.bottomClearance.toFixed(1)}`,
        );

      expect(failures, "a focus ring landed behind a sticky edge").toEqual([]);

      await expectNothingFailedToRender(page);
    });
  }
}
