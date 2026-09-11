import { describe, expect, it } from "vitest";

import { chartDensity } from "./chart-density.js";

// `VISUAL-LANGUAGE.md`'s density table, checked at the widths it names and at
// the ones it does not (Task 2.12.3).
//
// The measured region widths are 1,019 px at a 1920 viewport and 342 px at 390
// (`CHARTING.md` §2), so the two ends of the real range are in here by name
// rather than as round numbers near them.

describe("chartDensity", () => {
  it.each([
    [1019, 5, "all", true, false],
    [900, 5, "all", true, false],
    [899, 4, "all", false, false],
    [600, 4, "all", false, false],
    [599, 3, "ends", false, true],
    [400, 3, "ends", false, true],
    [399, 3, "ends", false, true],
    [342, 3, "ends", false, true],
  ] as const)(
    "gives a %spx region %s gridlines",
    (width, valueTicks, sessionLabels, intraday, compact) => {
      expect(chartDensity(width)).toEqual({
        valueTicks,
        sessionLabels,
        intraday,
        compact,
      });
    },
  );

  it("never stops drawing an axis", () => {
    // A plot with no axis is a sparkline, and a sparkline is a different
    // product. There is no width at which the labels go away entirely.
    for (const width of [0, 1, 120, 320, 342, 400, 600, 900, 1019, 4000]) {
      const density = chartDensity(width);
      expect(density.valueTicks).toBeGreaterThanOrEqual(3);
      expect(["all", "ends"]).toContain(density.sessionLabels);
    }
  });

  it("answers an unmeasured element rather than throwing at it", () => {
    // `ResizeObserver` fires once before layout and reports zero. A chart that
    // threw on its own first frame would take the region's error boundary with
    // it over a number that is about to be replaced.
    expect(chartDensity(0)).toEqual(chartDensity(100));
    expect(chartDensity(-10)).toEqual(chartDensity(100));
    expect(chartDensity(Number.NaN)).toEqual(chartDensity(100));
  });
});
