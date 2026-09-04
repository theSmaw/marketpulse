import type { AxeResults } from "axe-core";
import axe from "axe-core";
import { expect, test } from "@playwright/test";

// THROWAWAY PROBE — Task 1.13.4. Delete before the task closes.
//
// The axe gate asserts zero violations and half of what it is for is contrast,
// which needs the real cascade computed rather than only a DOM. CI runs
// `--only-shell`, and a shell build that skipped style computation would turn
// the gate green by making it BLIND — the one failure mode a green run cannot
// distinguish from success. This is the positive control.
test("PROBE: the browser computes real styles", async ({ page }) => {
  await page.goto("/");
  await page.addScriptTag({ content: axe.source });

  const ground = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );

  const contrast = await page.evaluate(async () => {
    const runner = (
      window as unknown as {
        readonly axe: { readonly run: (c: Document) => Promise<AxeResults> };
      }
    ).axe;
    const results = await runner.run(document);
    const pass = results.passes.find((entry) => entry.id === "color-contrast");

    return {
      passes: results.passes.length,
      violations: results.violations.length,
      incomplete: results.incomplete.length,
      contrastNodes: pass === undefined ? 0 : pass.nodes.length,
    };
  });

  console.log(
    `PROBE body background: ${ground}\n` +
      `PROBE axe: ${String(contrast.violations)} violations, ${String(contrast.passes)} passes, ` +
      `${String(contrast.incomplete)} inconclusive; color-contrast passed on ` +
      `${String(contrast.contrastNodes)} nodes`,
  );

  // A blind engine cannot produce either of these.
  expect(ground).toBe("rgb(244, 243, 238)");
  expect(contrast.contrastNodes).toBeGreaterThan(0);
});
