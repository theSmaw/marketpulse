import { expect, test } from "@playwright/test";

import {
  expectEveryRegionIsATabStop,
  expectNothingFailedToRender,
} from "../support/app.js";

// `Investigate`, over the REAL route Task 7.1.3 built — Task 7.1.4's own
// Done-when 10. Unlike `security-abnormal-move.spec.ts` next door, this is
// not a pass-through: there is no furnished frame to agree with, because
// `POST /investigations` and its SSE stream are this product's own real
// backend, exercised exactly as a browser exercises them in production.
//
// ## Why this spec is insensitive to the tool's own outcome
//
// `get_security_snapshot` answers `ok` or `refused` depending on whether
// this environment has a live feed — CI's `provider=none` makes `refused`
// the permanent case here, same as every other story in this epic's own
// find. The checklist never renders the tool's VALUE, only the step's
// status and duration (`InvestigationChecklist.tsx`'s own contract), so
// this spec needs no ok/refused branching at all: the glyph sequence and
// the duration are identical whichever the real backend answers.
//
// **The same is true of `calculate_return_percentile`** (Task 7.2.2), which
// on CI refuses `nothing-observed` for ever — the trailing window is process
// memory fed by a live socket and there is no provider. What this spec can
// still assert is that the step RAN and completed with a real duration,
// which is a fact about the pipeline rather than about the store.

const EXPLORER = "/securities/NVDA";

test("pressing Investigate paints a row immediately, then reaches complete with a real duration", async ({
  page,
}) => {
  await page.goto(EXPLORER);

  const region = page.getByRole("region", { name: "Abnormal-move indicators" });
  await expect(region).toBeVisible();

  const button = region.getByRole("button", { name: "Investigate" });
  await expect(button).toBeVisible();

  // Nothing before the press — Done-when 2.
  await expect(region.getByText("Measure move", { exact: true })).toHaveCount(
    0,
  );

  await button.click();

  // Reaches a real, measured duration — the one thing only this backend
  // can produce. `ms` is this component's own reserved-column format
  // (`InvestigationChecklist.module.css`'s `.duration`), and its arrival
  // is what proves the checklist painted a row at all: the step's own
  // description text is identical before and after, so the duration is
  // the one signal that distinguishes "still running" from "complete".
  //
  // **Two rows since Task 7.2.2**, which added `calculate_return_percentile`
  // to the pipeline — so the count is the assertion rather than a
  // `.first()`: a dropped step would otherwise pass unseen.
  await expect(region.getByText(/^\d+ ms$/)).toHaveCount(2, {
    timeout: 10_000,
  });
  await expect(region.getByText("Measure move", { exact: true })).toBeVisible();
  await expect(
    region.getByText("Measure price anomaly", { exact: true }),
  ).toBeVisible();

  await expectNothingFailedToRender(page);
});

test("a second press while one is already showing does nothing — no second row", async ({
  page,
}) => {
  await page.goto(EXPLORER);

  const region = page.getByRole("region", { name: "Abnormal-move indicators" });
  const button = region.getByRole("button", { name: "Investigate" });

  await button.click();
  await button.click();
  await button.click();

  await expect(region.getByText(/^\d+ ms$/).first()).toBeVisible({
    timeout: 10_000,
  });

  // Exactly one row, however many times the control was pressed while it
  // was still showing — the client-side mirror of the backend's own
  // idempotent `POST`.
  await expect(region.getByText("Measure move", { exact: true })).toHaveCount(
    1,
  );
});

test("the region stays a tab stop with the checklist showing", async ({
  page,
}) => {
  await page.goto(EXPLORER);

  const region = page.getByRole("region", { name: "Abnormal-move indicators" });
  await region.getByRole("button", { name: "Investigate" }).click();
  await expect(region.getByText(/^\d+ ms$/).first()).toBeVisible({
    timeout: 10_000,
  });

  await expectEveryRegionIsATabStop(page, { atLeast: 8 });
});
