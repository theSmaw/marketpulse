import type { AxeResults } from "axe-core";
import axe from "axe-core";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// The axe decision, taken here rather than deferred (Task 1.13.3).
//
// **It goes in, and it is a gate rather than a diagnostic.** A run that finds a
// violation fails; `incomplete` results are attached to the test as an
// annotation and can never fail anything.
//
// ## Why a gate, when Story 1.9 rejected an axe pass as coverage
//
// That rejection stands and this is not a reversal of it: Story 1.9 declined
// `@storybook/addon-vitest` because it would have turned the *workshop's*
// visual-review compromises into test fixtures, and "renders without throwing"
// is the weakest assertion available on components that have written tests.
// Nothing about that argument reaches the assembled application.
//
// What decided this is that a browser is the **first and only** level in this
// repository that can see two things, and one of them has already produced a
// real defect here:
//
//   - **Contrast.** No global stylesheet is applied in the component tests —
//     `getTokens()` throws there — so `getComputedStyle` returns nothing and a
//     contrast rule is structurally unrunnable. A browser has the real cascade.
//     Task 1.12.4 found a genuine violation this way: the `checking`
//     placeholder's `--ink-disabled` label measured **2.09:1** against the page
//     ground where 4.5 is the threshold. That is not a hypothetical class of
//     defect, it is one that has happened, once, and it was caught by a tool
//     rather than by a reading.
//   - **Whole-document rules.** `landmark-unique`, `landmark-one-main`,
//     `page-has-heading-one` and `region` are properties of an assembled page.
//     The Storybook addon scopes itself to `#storybook-root`, so it
//     structurally cannot judge them — Task 1.7.6 measured a story fragment
//     reporting **3 violations** unscoped and **0** scoped, all three of them
//     page-level rules a fragment cannot satisfy. Those three are not findings
//     in the workshop and they would be findings here.
//
// This repository's own rule settles the rest: when the thing being checked is
// reachable from an assembled instance, a test beats another `verify` step —
// which is the argument `apps/backend/src/server.test.ts` was written on.
//
// ## What it costs, measured rather than estimated
//
// **Nothing in the store.** `axe-core@4.13.0` was already there, reached
// through `@storybook/addon-a11y`, so declaring it in this package is
// **+0 store entries, +3 lockfile lines**, `pnpm-workspace.yaml` md5-unchanged,
// and the install-script sweep still returns `esbuild@0.28.2` and nothing else.
//
// It is `axe-core` directly rather than `@axe-core/playwright`, and the pin is
// the same **4.13.0** the workshop's addon resolves. That matters more than the
// package count: two axe versions in one repository would mean the workshop and
// this suite reporting different numbers for the same page, which is the worst
// possible outcome for an accessibility signal because it makes both
// untrustworthy. **The two pins are a stated invariant and nothing checks
// them** — `apps/frontend`'s comes in transitively through the addon, so there
// is no manifest for the two to be compared in.
//
// ## What it must not become
//
// **Epic 15 still owns the accessibility review**, and a green axe run is not
// one. Two limits belong beside the assertion rather than in a task write-up.
// axe returns `color-contrast` **inconclusive** on exactly the non-text
// elements this product encodes with — "Element content contains only non-text
// characters", over the two `aria-hidden` direction arrows — so the one thing
// automation declines to judge is the thing Task 1.4.4 had to measure by hand.
// And a rule that is not run is not a rule that passed: this suite runs axe on
// two pages, not on every state of every route.
//
// ## The baseline, re-taken against the running pair
//
// Against the dev server — the first time this measurement has been taken
// anywhere but a built artefact on a static host — the landing route is
// **0 violations / 37 passes / 1 inconclusive** and the four other routes are
// **0 / 25 / 0** each, reproducing Tasks 1.5.4, 1.7.6 and 1.12.5 exactly. So
// the gate is set at a value that four hand measurements and two hosts agree
// on.

interface AxeGlobal {
  readonly run: (context: Document) => Promise<AxeResults>;
}

/**
 * Run axe over the whole document and fail on any violation.
 *
 * The source is injected as a script tag rather than driven through a wrapper
 * package — which is all `@axe-core/playwright` does — so the version this runs
 * is the one `axe.source` came from and there is no second thing to keep pinned.
 *
 * `document` and not a scoped element, deliberately: the whole point of running
 * here rather than in the workshop is the rules a fragment cannot satisfy.
 */
export async function expectNoAxeViolations(
  page: Page,
  label: string,
): Promise<void> {
  await page.addScriptTag({ content: axe.source });

  const results = await page.evaluate(async () => {
    const runner = (window as unknown as { readonly axe: AxeGlobal }).axe;

    return await runner.run(document);
  });

  // Inconclusive results are recorded and never fail. They are axe declining to
  // judge, which is information about axe rather than about the page.
  test.info().annotations.push({
    type: "axe",
    description:
      `${label}: ${String(results.violations.length)} violations, ` +
      `${String(results.passes.length)} passes, ` +
      `${String(results.incomplete.length)} inconclusive` +
      (results.incomplete.length === 0
        ? ""
        : ` (${results.incomplete.map((entry) => entry.id).join(", ")})`),
  });

  expect(
    results.violations.map((violation) => violation.id),
    `axe violations on ${label}`,
  ).toEqual([]);
}

/**
 * Run axe and **report** rather than assert (Task 1.13.5).
 *
 * The deployed check uses this where the local suite uses the gate above, and
 * the asymmetry is the decision rather than an inconsistency.
 *
 * ## Why it is a report there and a gate here
 *
 * The question is not whether the deployed page deserves an accessibility
 * check — it is what a **red** post-deploy result means. This check runs after
 * a merge against the live environment, so its red channel is a rollback
 * decision. A page that cannot reach its backend is a rollback. A contrast
 * ratio is not, and mixing the two makes the one signal that can see failures
 * nothing else can indistinguishable from the one signal nobody would act on
 * immediately — which is exactly how a check gets ignored.
 *
 * What makes that affordable rather than a hole is that the same rules already
 * gate the same source **before** the merge, in a real browser, on a real
 * renderer: Task 1.13.4 confirmed the runner's `--only-shell` build computes
 * real styles and passes `color-contrast` on the same **65 nodes** macOS does,
 * and that gate found a genuine WCAG 2.1.1 defect on its first run. The
 * deployed artefact differs from the one that gate judged by exactly one string
 * literal — `VITE_API_BASE_URL`, substituted at build time — which cannot reach
 * accessibility.
 *
 * So this is not a second opinion that is being thrown away. It is the
 * comparison: the numbers are printed beside the pre-merge baseline, and a
 * divergence between the two is the thing worth seeing, because it would mean
 * the deployed artefact is not the artefact that was judged.
 *
 * **The reversal trigger is a divergence.** If these figures ever differ from
 * the pre-merge gate's on the same commit, the artefacts differ in a way this
 * repository does not currently believe is possible, and this becomes a gate.
 *
 * One limit belongs beside it rather than in a write-up: **every axe figure
 * this repository has recorded was taken at one viewport**, and Task 1.13.4
 * proved that is not the same as a page having no violations — the defect it
 * found was invisible on the development machine and reproduced at a viewport
 * 160 px shorter. A single-viewport reading is a narrow claim wherever it is
 * taken.
 */
export async function reportAxe(page: Page, label: string): Promise<void> {
  await page.addScriptTag({ content: axe.source });

  const results = await page.evaluate(async () => {
    const runner = (window as unknown as { readonly axe: AxeGlobal }).axe;

    return await runner.run(document);
  });

  const summary =
    `${label}: ${String(results.violations.length)} violations, ` +
    `${String(results.passes.length)} passes, ` +
    `${String(results.incomplete.length)} inconclusive` +
    (results.incomplete.length === 0
      ? ""
      : ` (${results.incomplete.map((entry) => entry.id).join(", ")})`) +
    (results.violations.length === 0
      ? ""
      : ` — VIOLATIONS: ${results.violations
          .map(
            (violation) => `${violation.id} x${String(violation.nodes.length)}`,
          )
          .join(", ")}`);

  test.info().annotations.push({
    type: "axe (report, not a gate)",
    description: summary,
  });

  // Printed as well as annotated. An annotation on a passing test is not read;
  // a line in the job log is, and this is the number somebody compares against
  // the pre-merge gate's when they want to know whether the two artefacts
  // agree.
  console.log(`axe — ${summary}`);
}
