import { describe, expect, it } from "vitest";

import { barFraction, ladderClause, ladderTicks } from "./ranked-bar.js";

describe("barFraction", () => {
  it("is the move over the rung, sign dropped", () => {
    expect(barFraction(1, 2)).toBe(0.5);
    expect(barFraction(-1, 2)).toBe(0.5);
    expect(barFraction(2, 2)).toBe(1);
  });

  it("saturates above the rung rather than overflowing the track", () => {
    // The owner's decision: a sector past the rung draws a bar clipped at it
    // while the row's own figure stays exact. Without the clamp the band is
    // `width: 120%` inside an absolutely-positioned half-track, which paints
    // over the figure column — a broken page rather than a saturated bar.
    expect(barFraction(14.62, 10)).toBe(1);
    expect(barFraction(-40, 1)).toBe(1);
  });

  it("is zero for a reading of exactly zero", () => {
    expect(barFraction(0, 2)).toBe(0);
  });
});

describe("ladderTicks", () => {
  it("labels the midpoints only where half the rung is a whole number", () => {
    // A printed `2.5` reads as precision the picture does not have. The
    // gridlines are drawn at ±50% on every rung either way — they are the
    // reading, and the labels were the annotation.
    expect(ladderTicks(2).map((tick) => tick.label)).toEqual([
      "−2%",
      "−1",
      "0",
      "+1",
      "+2%",
    ]);
    expect(ladderTicks(10).map((tick) => tick.label)).toEqual([
      "−10%",
      "−5",
      "0",
      "+5",
      "+10%",
    ]);
    expect(ladderTicks(1).map((tick) => tick.label)).toEqual([
      "−1%",
      undefined,
      "0",
      undefined,
      "+1%",
    ]);
    expect(ladderTicks(5).map((tick) => tick.label)).toEqual([
      "−5%",
      undefined,
      "0",
      undefined,
      "+5%",
    ]);
  });

  it("puts the marks at the quarters, with zero in the middle", () => {
    expect(ladderTicks(2).map((tick) => tick.at)).toEqual([0, 25, 50, 75, 100]);
  });

  it("uses the typographic minus every figure in this product uses", () => {
    // A hyphen-minus beside `PriceChange`'s `−0.44%` is two characters doing one
    // job at two widths, one column apart.
    expect(ladderTicks(2)[0]?.label).toBe("−2%");
    expect(ladderTicks(2)[0]?.label).not.toContain("-");
  });
});

describe("ladderClause", () => {
  it("states the rung the bars are drawn against", () => {
    expect(ladderClause(2)).toBe("bars to ±2%");
    expect(ladderClause(10)).toBe("bars to ±10%");
  });
});
