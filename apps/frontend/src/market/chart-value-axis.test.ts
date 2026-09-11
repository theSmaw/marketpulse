import type { Bar } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../fixtures/bar-series.js";
import {
  FLAT_DOMAIN_FRACTION,
  PRICE_DOMAIN_PAD,
  priceDomain,
  valueTicks,
} from "./chart-value-axis.js";

// The vertical extent and the gridlines, against real stored bars and against
// the two shapes that divide by zero (Task 2.12.3).
//
// The `full` fixture is 30 recorded NVDA minute bars, so the domain below is
// checked against the store rather than against numbers somebody typed — which
// is the difference the task brief draws when it asks for ticks verified
// against a stored fixture series rather than by eye.

/** The 30 recorded minute bars of 2026-09-04, 09:30 to 10:00. */
function fixtureBars(): readonly [Bar, ...Bar[]] {
  const view = barSeriesFixtureView("full");
  if (view.state !== "loaded")
    throw new Error("the full fixture is not loaded");
  return view.series.bars;
}

function bar(overrides: Partial<Bar>): Bar {
  return {
    startsAt: new Date("2026-09-04T13:30:00.000Z"),
    open: 100,
    high: 101,
    low: 99,
    close: 100.5,
    volume: 1,
    ...overrides,
  };
}

describe("priceDomain", () => {
  it("spans the stored series' low to its high, padded", () => {
    // Taken off the recorded bars rather than asserted as constants, so this
    // stays true of the fixture rather than of a copy of it.
    const bars = fixtureBars();
    const low = Math.min(...bars.map((held) => held.low));
    const high = Math.max(...bars.map((held) => held.high));

    const [bottom, top] = priceDomain(bars);
    const pad = (high - low) * PRICE_DOMAIN_PAD;

    expect(bottom).toBeCloseTo(low - pad, 10);
    expect(top).toBeCloseTo(high + pad, 10);
  });

  it("measures the bars' extremes rather than their closes", () => {
    // The line is a line of closes, but a close always sits inside its own
    // bar's high–low — so a domain from the closes would clip a spike the panel
    // beside the chart prints as **High**.
    const [bottom, top] = priceDomain([
      bar({ high: 120, low: 90, close: 100 }),
      bar({ high: 101, low: 99, close: 100 }),
    ]);

    expect(top).toBeGreaterThan(120);
    expect(bottom).toBeLessThan(90);
  });

  it("leaves a tenth of the extent at each end", () => {
    // Not free to tighten: the top half of the upper pad is Epic 5's
    // anomaly-marker lane, reserved in `VISUAL-LANGUAGE.md` before the markers
    // exist so they arrive as a placement rather than a retrofit.
    const [bottom, top] = priceDomain([bar({ high: 110, low: 100 })]);

    expect(bottom).toBeCloseTo(99, 10);
    expect(top).toBeCloseTo(111, 10);
  });

  it("keeps the reserved marker lane above 16px at both plot heights", () => {
    // The arithmetic, not a second constant: the padded domain is 1.2x the
    // data's extent, so the top pad is plotHeight / 12. 23.3px at 280 and
    // 18.3px at 220 — both clear the 16px lane, and the condition that would
    // break it is a plot shorter than 192px.
    const topPadShare = PRICE_DOMAIN_PAD / (1 + 2 * PRICE_DOMAIN_PAD);

    expect(280 * topPadShare).toBeGreaterThan(16);
    expect(220 * topPadShare).toBeGreaterThan(16);
    expect(192 * topPadShare).toBeCloseTo(16, 10);
  });

  it("gives a flat series a real domain rather than a zero-height one", () => {
    // A flat series is a real case — an illiquid security, or one minute
    // repeated — and its extent is zero. A zero-height domain divides by zero
    // and paints NaN into every coordinate, which SVG draws as *nothing*: a
    // correct, empty frame rather than an error anybody sees.
    const flat = [
      bar({ high: 200, low: 200, open: 200, close: 200 }),
      bar({ high: 200, low: 200, open: 200, close: 200 }),
      bar({ high: 200, low: 200, open: 200, close: 200 }),
    ] as const;

    const [bottom, top] = priceDomain(flat);

    expect(top).toBeGreaterThan(bottom);
    // Half a per cent either side, so the line lands across the middle.
    expect(bottom).toBeCloseTo(200 * (1 - FLAT_DOMAIN_FRACTION), 10);
    expect(top).toBeCloseTo(200 * (1 + FLAT_DOMAIN_FRACTION), 10);
    expect((bottom + top) / 2).toBeCloseTo(200, 10);
  });

  it("gives a single bar a domain, flat or not", () => {
    const moved = priceDomain([bar({ high: 110, low: 100 })]);
    expect(moved[1]).toBeGreaterThan(moved[0]);

    const still = priceDomain([bar({ high: 100, low: 100 })]);
    expect(still[1]).toBeGreaterThan(still[0]);
  });

  it("still has height when a high and a low are equal at zero", () => {
    // Not a price any equity has, so a corrupt bar rather than a cheap one —
    // but the arithmetic must not be the thing that discovers it. A
    // proportional pad of zero is zero.
    const [bottom, top] = priceDomain([bar({ high: 0, low: 0 })]);

    expect(top).toBeGreaterThan(bottom);
    expect(top - bottom).toBeCloseTo(0.02, 10);
  });
});

describe("valueTicks", () => {
  it("lands on numbers a person would have chosen", () => {
    expect(valueTicks([100, 200], 5).map((tick) => tick.value)).toEqual([
      100, 120, 140, 160, 180, 200,
    ]);
    expect(valueTicks([0, 1], 5).map((tick) => tick.value)).toEqual([
      0, 0.2, 0.4, 0.6, 0.8, 1,
    ]);
  });

  it("labels the stored series' domain the way an analyst would write it", () => {
    // The fixture's bars run 229.82 to 234.60, so the padded domain is
    // 229.342 to 235.078 and a five-tick target picks a step of 1.
    const ticks = valueTicks(priceDomain(fixtureBars()), 5);

    expect(ticks.map((tick) => tick.label)).toEqual([
      "230.00",
      "231.00",
      "232.00",
      "233.00",
      "234.00",
      "235.00",
    ]);
  });

  it("never puts a label outside the frame", () => {
    // The second failure the task brief names by hand: an axis whose last label
    // is past the last bar. `count` is therefore a target rather than a promise.
    for (const domain of [
      [229.342, 235.078],
      [3.01, 3.07],
      [0.4, 0.44],
      [98.7, 701.2],
    ] as const) {
      for (const tick of valueTicks(domain, 5)) {
        expect(tick.value).toBeGreaterThanOrEqual(domain[0]);
        expect(tick.value).toBeLessThanOrEqual(domain[1]);
      }
    }
  });

  it("never writes the same label twice", () => {
    // Two gridlines carrying one number is a chart that appears to have drawn
    // the same price at two heights. The step is floored at a cent because the
    // label is rendered to two decimals, so choosing the step and rounding the
    // label have to agree.
    const ticks = valueTicks([230.001, 230.006], 5);
    const labels = ticks.map((tick) => tick.label);

    expect(new Set(labels).size).toBe(labels.length);
  });

  it("counts in whole multiples rather than accumulating a step", () => {
    // Repeated addition of 0.1 reaches 0.30000000000000004 in four steps, and a
    // gridline at that price is one whose label and whose height disagree about
    // which number it is.
    expect(valueTicks([0, 0.5], 5).map((tick) => tick.value)).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5,
    ]);
  });

  it("gives a flat series' domain gridlines too", () => {
    const ticks = valueTicks(
      priceDomain([bar({ high: 200, low: 200, close: 200, open: 200 })]),
      5,
    );

    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.map((tick) => tick.label)).toContain("200.00");
  });

  it("refuses a domain or a count it cannot divide", () => {
    expect(() => valueTicks([200, 200], 5)).toThrow(RangeError);
    expect(() => valueTicks([200, 100], 5)).toThrow(RangeError);
    expect(() => valueTicks([100, 200], 0)).toThrow(RangeError);
  });
});
