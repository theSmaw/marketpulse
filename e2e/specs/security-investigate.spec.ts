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
//
// **And `calculate_volume_ratio`** (Task 7.2.3) is the one step whose
// answer is the same here as everywhere: it refuses `no-distribution` on CI,
// on a laptop and on the deployment alike, because no store this product has
// holds a distribution of that quantity to rank against. So its row is not
// an environment-dependent assertion at all — which makes it the only tool
// in this pipeline whose interesting case a gated machine actually reaches.

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
  // **Six rows since Task 7.2.6**, which added `calculate_rolling_correlation`
  // beside `get_market_breadth`, `compare_securities`,
  // `calculate_volume_ratio` and `calculate_return_percentile` — the snapshot
  // plus all five of `EPIC.md`'s named steps. The count is the assertion
  // rather than a `.first()`: a dropped step would otherwise pass unseen.
  await expect(region.getByText(/^\d+ ms$/)).toHaveCount(6, {
    timeout: 10_000,
  });
  await expect(region.getByText("Measure move", { exact: true })).toBeVisible();
  await expect(
    region.getByText("Measure price anomaly", { exact: true }),
  ).toBeVisible();
  await expect(
    region.getByText("Measure volume anomaly", { exact: true }),
  ).toBeVisible();
  // **Gate 1's own sentence for this step, not `EPIC.md`'s "compare
  // peers"** — the shipped arithmetic is a comparison against the
  // capitalisation-weighted sector SPDR, and *peers* promises an unweighted
  // peer median this product does not compute.
  await expect(
    region.getByText("Compare against sector benchmark", { exact: true }),
  ).toBeVisible();
  // **The one step whose subject is the whole market rather than this
  // security** (Task 7.2.5) — and the one step a gated machine can see reach
  // its `ok` arm, because breadth over a store with zero bars is an honest
  // count of zero over a stated denominator rather than a refusal. The row's
  // own duration is what this spec asserts; nothing on the checklist renders
  // a tool's payload yet (Story 7.3's scope).
  await expect(
    region.getByText("Calculate market breadth", { exact: true }),
  ).toBeVisible();
  // **The compare-market step** (Task 7.2.6), and the one step in the
  // pipeline that reads a database. On this runner it completes by refusing
  // — CI's store has zero bars, so no tape has reached a frontier and the
  // overlap is zero — which is a completed row with a duration, exactly as
  // the volume step's permanent refusal is.
  await expect(
    region.getByText("Compare against the broad market", { exact: true }),
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
