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

// **The pipeline's own six steps, in the order `index.ts`' `investigationTools`
// runs them** — the snapshot plus `EPIC.md`'s five named steps. Each sentence
// is the owning tool's own `description`; the one home for every one of them is
// that tool, and this list is a browser spec's copy of what it expects to read
// on screen. The ORDER is asserted as well as the membership, because a
// re-ordered pipeline is a different investigation and nothing else in this
// suite would notice (Task 7.2.7).
const STEPS = [
  "Measure move",
  "Measure price anomaly",
  "Measure volume anomaly",
  // **Gate 1's own sentence for this step, not `EPIC.md`'s "compare peers"** —
  // the shipped arithmetic is a comparison against the capitalisation-weighted
  // sector SPDR, and *peers* promises an unweighted peer median this product
  // does not compute.
  "Compare against sector benchmark",
  // **The one step whose subject is the whole market rather than this
  // security** (Task 7.2.5) — and the one step a gated machine can see reach
  // its `ok` arm, because breadth over a store with zero bars is an honest
  // count of zero over a stated denominator rather than a refusal.
  "Calculate market breadth",
  // **The compare-market step** (Task 7.2.6), and the one step in the pipeline
  // that reads a database. On this runner it completes by refusing — CI's store
  // has zero bars, so no tape has reached a frontier and the overlap is zero —
  // which is a completed row with a duration, exactly as the volume step's
  // permanent refusal is.
  "Compare against the broad market",
] as const;

test("pressing Investigate paints every row immediately, then reaches complete with a real duration", async ({
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

  // **Every row, in the same frame as the press** — Task 7.2.7's own
  // Done-when 1, and the one assertion in this spec that is about the FIRST
  // paint rather than the finished run. `data-step` is the row's own published
  // status (`InvestigationChecklist.tsx`): a row carries no role and no
  // accessible name, so this is what a browser has to count. No timeout is
  // given deliberately — these rows are client-seeded, so they do not wait on
  // a response, and Playwright's own default is the only slack here.
  await expect(region.locator("[data-step]")).toHaveCount(STEPS.length);

  // Reaches a real, measured duration — the one thing only this backend
  // can produce. `ms` is this component's own reserved-column format
  // (`InvestigationChecklist.module.css`'s `.duration`), and its arrival
  // is what proves a row RAN: the step's own description text is identical
  // before and after, so the duration is the one signal that distinguishes
  // "still queued" from "complete".
  //
  // **Scoped per step rather than counted over the region** (Task 7.2.7).
  // The count alone was true of six rows in any order, with any six
  // sentences — and with six real steps it cannot say WHICH step failed to
  // finish. Each assertion below is a duration inside the row that carries
  // that step's own sentence, so a step left queued names itself.
  for (const [index, description] of STEPS.entries()) {
    const row = region.locator("[data-step]", {
      has: page.getByText(description, { exact: true }),
    });
    await expect(row).toHaveCount(1, { timeout: 10_000 });
    await expect(row.getByText(/^\d+ ms$/)).toHaveCount(1, {
      timeout: 10_000,
    });
    // The order the pipeline ran them in, read off the page.
    await expect(region.locator("[data-step]").nth(index)).toContainText(
      description,
    );
  }

  // And nothing beyond the six — a seventh row would mean the client seeded
  // fewer than the pipeline runs and the reducer appended the remainder
  // mid-run, which is exactly the growth this task removed.
  await expect(region.locator("[data-step]")).toHaveCount(STEPS.length);
  await expect(region.locator('[data-step="completed"]')).toHaveCount(
    STEPS.length,
  );

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

  // Exactly one checklist, however many times the control was pressed while
  // it was still showing — the client-side mirror of the backend's own
  // idempotent `POST`. **Both halves since Task 7.2.7**: one row per step
  // (not two), and `STEPS.length` rows in total rather than a second
  // seeded set of six appended beneath the first, which is the shape a
  // re-press that slipped past the guard would now take.
  await expect(region.getByText("Measure move", { exact: true })).toHaveCount(
    1,
  );
  await expect(region.locator("[data-step]")).toHaveCount(STEPS.length);
});

test("a second press after completion keeps the prior claims on screen rather than blanking them (Task 7.3.3, AC 11)", async ({
  page,
}) => {
  await page.goto(EXPLORER);

  const region = page.getByRole("region", { name: "Abnormal-move indicators" });
  const button = region.getByRole("button", { name: "Investigate" });

  await button.click();
  await expect(region.locator('[data-step="completed"]')).toHaveCount(
    STEPS.length,
    { timeout: 10_000 },
  );

  // **Row 1's own claim, read before the second press** — CI's zero-bar
  // store refuses `get_security_snapshot`, and a refusal still mints a
  // finding (`UNKNOWN` confidence, never `inapplicable`), so there is a
  // real sentence here to lose. The claim is this row's third `<p>`
  // (glyph has none; description, duration, then the claim —
  // `InvestigationChecklist.tsx`'s own order).
  const firstRow = region.locator("[data-step]").first();
  const claimBeforeSecondPress = await firstRow
    .locator("p")
    .nth(2)
    .textContent();
  expect(claimBeforeSecondPress?.trim()).not.toBe("");

  await button.click();

  // **Not blanked, in the SAME frame as the press** — `optimisticChecklist`
  // alone would have reset this row's claim to nothing, which is exactly
  // the case ADR 0028 forbids by name the moment a row carries a real
  // finding rather than a never-yet-answered placeholder. No `waitFor`
  // here deliberately: `resetForNewRun`'s paint is client-optimistic, in
  // the same commit as the click, same as the six rows' own first paint
  // already is.
  await expect(firstRow.locator("p").nth(2)).toHaveText(
    claimBeforeSecondPress ?? "",
  );

  // And the run still finishes normally — the second press is a real
  // investigation, not a frozen echo of the first.
  await expect(region.locator('[data-step="completed"]')).toHaveCount(
    STEPS.length,
    { timeout: 10_000 },
  );
  await expectNothingFailedToRender(page);
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
