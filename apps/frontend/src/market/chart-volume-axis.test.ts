import type { Bar } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../fixtures/bar-series.js";
import { linearScale, scaleValue } from "./chart-scale.js";
import {
  FLAT_VOLUME_TOP,
  volumeDomain,
  volumePeak,
  volumePeakBar,
  volumePeakLabel,
} from "./chart-volume-axis.js";

/** A bar carrying a volume and nothing else worth asserting on. */
function barWith(volume: number): Bar {
  return {
    startsAt: new Date("2026-09-04T13:30:00Z"),
    open: 100,
    high: 101,
    low: 99,
    close: 100.5,
    volume,
  };
}

/** The recorded bodies, which is what the real series' volumes look like. */
function recordedBars(name: "full" | "dense"): readonly Bar[] {
  const view = barSeriesFixtureView(name);
  if (view.state !== "loaded" && view.state !== "partial") {
    throw new Error(`the ${name} fixture carries no bars`);
  }
  return view.series.bars;
}

describe("volume's value domain", () => {
  it("runs from zero to the window's peak, with no pad", () => {
    // Both ends are load-bearing. The floor is zero because a column's height is
    // only readable as a magnitude if its baseline is the origin; the top is the
    // peak because §9.2 sized the plot at 88 px against a ratio — a window whose
    // peak is 3.8x its typical bar must draw that bar at 23 px — and a padded top
    // silently changes it.
    const bars = [barWith(1_000), barWith(3_800), barWith(2_000)];
    expect(volumeDomain(bars)).toEqual([0, 3_800]);
  });

  it("draws the 3.8x reading §9.2 sized the plot for", () => {
    // The arithmetic the proportion was taken against, asserted rather than
    // trusted: with the domain topping out at the peak, an ordinary bar in a
    // window peaking at 3.8x its size lands at 23 px of 88.
    const bars = [barWith(3_800_000), barWith(1_000_000)];
    const y = linearScale(volumeDomain(bars), [88, 0]);

    expect(Math.round(88 - scaleValue(y, 1_000_000))).toBe(23);
    expect(scaleValue(y, 3_800_000)).toBe(0);
    expect(scaleValue(y, 0)).toBe(88);
  });

  it("answers the all-zero window with a ceiling of one share", () => {
    // Real for a thin security, and `linearScale` refuses a zero-height domain on
    // purpose — it divides by zero and produces NaN coordinates SVG draws as
    // nothing at all. Every column is then zero pixels tall, which is the honest
    // picture of a window in which nothing traded.
    const bars = [barWith(0), barWith(0)];
    expect(volumeDomain(bars)).toEqual([0, FLAT_VOLUME_TOP]);

    const y = linearScale(volumeDomain(bars), [88, 0]);
    expect(scaleValue(y, 0)).toBe(88);
  });

  it("answers an empty window with a usable scale rather than a throw", () => {
    // `empty` is a correct answer this chart already draws: a labelled axis with
    // nothing on it. A domain that threw here would take the region's error
    // boundary down on a 200.
    expect(volumeDomain([])).toEqual([0, FLAT_VOLUME_TOP]);
    expect(() => linearScale(volumeDomain([]), [88, 0])).not.toThrow();
  });

  it("keeps the peak and the scale's ceiling as separate facts", () => {
    // They differ on exactly one window, and that is the pair being right: the
    // scale needs a usable ceiling, the label needs the figure observed.
    expect(volumePeak([barWith(0)])).toBe(0);
    expect(volumeDomain([barWith(0)])[1]).toBe(FLAT_VOLUME_TOP);
    expect(volumePeakLabel([barWith(0)])).toBe("0");
  });
});

describe("the one label volume's gutter writes", () => {
  it("abbreviates the peak, because the exact figure is in the readout", () => {
    expect(volumePeakLabel([barWith(1_000), barWith(4_061_234)])).toBe("4.06M");
  });

  it("writes nothing where there are no bars", () => {
    // No answer rather than zero shares traded. The states with no bars already
    // say which they are, in words.
    expect(volumePeakLabel([])).toBeNull();
  });
});

describe("the bar that traded the peak", () => {
  it("is the bar itself, so a strip and a sentence cannot name two minutes", () => {
    // **One derivation, two readers** (Task 2.13.5): the volume readout's
    // resting state and `chart-alternative.ts`'s `peakClause`. Before this
    // existed the fact was a `find` in one file and would have been a second
    // `find` in another, which is how two surfaces come to state two different
    // busiest minutes with neither obviously wrong.
    const bars = recordedBars("dense");
    const busiest = volumePeakBar(bars);

    expect(busiest?.volume).toBe(volumePeak(bars));
  });

  it("takes the first of a tie, because that is the minute somebody is asking about", () => {
    const early = {
      ...barWith(900),
      startsAt: new Date("2026-09-04T13:30:00Z"),
    };
    const late = {
      ...barWith(900),
      startsAt: new Date("2026-09-04T13:31:00Z"),
    };

    expect(volumePeakBar([early, late])).toBe(early);
  });

  it("is null where there are no bars, which is not a peak of zero", () => {
    // A window with nothing in it has **no answer**, and the states that carry
    // no bars already say so in words. A peak of zero shares would be a
    // different claim, and it belongs to the window where nothing traded.
    expect(volumePeakBar([])).toBeNull();
    expect(volumePeakBar([barWith(0)])?.volume).toBe(0);
  });
});

describe("against the recorded bodies", () => {
  it("finds the real series' peak, and it is a minute-bar figure", () => {
    // The fixtures are bodies recorded off the real endpoint, so this is what
    // NVDA's minute volumes actually look like — around 10^6 intraday, which is
    // what `bar.ts` says and what the `M` suffix was chosen for.
    const bars = recordedBars("dense");
    const peak = volumePeak(bars);

    expect(peak).toBe(Math.max(...bars.map((bar) => bar.volume)));
    expect(peak).toBeGreaterThan(100_000);
    expect(volumePeakLabel(bars)).toMatch(/^\d+(\.\d+)?M$/);
  });

  it("never draws a column above the plot or below its baseline", () => {
    // The domain's whole job: every recorded volume has to land inside the box.
    const bars = recordedBars("full");
    const y = linearScale(volumeDomain(bars), [88, 0]);

    for (const bar of bars) {
      const pixel = scaleValue(y, bar.volume);
      expect(pixel).toBeGreaterThanOrEqual(0);
      expect(pixel).toBeLessThanOrEqual(88);
    }
  });
});
