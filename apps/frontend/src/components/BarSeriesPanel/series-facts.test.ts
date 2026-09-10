import type { Bar } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { PopulatedBarSeries } from "../../market/index.js";
import {
  barSpan,
  changePercent,
  directionOf,
  formatChangePercent,
  formatCount,
  formatMarketInstant,
  formatMarketRange,
  formatPrice,
  seriesPrices,
} from "./series-facts.js";

// The panel's arithmetic and formatting, tested where it can be tested with
// exact numbers rather than through a rendered component (Task 2.10.7).
//
// The series come from the recorded fixtures, so the reductions below are
// checked against real NVDA bars — which is the difference between "the
// function returns *a* number" and "the function returns the number the store
// holds".

/** The `loaded` fixture's series: 30 real minute bars from 2026-09-04. */
function full(): PopulatedBarSeries {
  const view = barSeriesFixtureView("full");
  if (view.state !== "loaded")
    throw new Error("the full fixture is not loaded");
  return view.series;
}

/** A series with the bars replaced, for the reductions that want exact inputs. */
function withBars(bars: readonly Bar[]): PopulatedBarSeries {
  return { ...full(), bars } as PopulatedBarSeries;
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

describe("seriesPrices", () => {
  it("takes the open from the first bar and the close from the last", () => {
    const prices = seriesPrices(
      withBars([
        bar({ open: 10, close: 11 }),
        bar({ open: 11, close: 12 }),
        bar({ open: 12, close: 13 }),
      ]),
    );

    expect(prices.open).toBe(10);
    expect(prices.close).toBe(13);
  });

  it("takes the high and the low from across every bar, not from the ends", () => {
    // The reduction that a `bars[0]` or a `bars.at(-1)` would get wrong while
    // still returning a plausible price — the extreme is deliberately in the
    // middle, where neither end would find it.
    const prices = seriesPrices(
      withBars([
        bar({ high: 101, low: 99 }),
        bar({ high: 150, low: 40 }),
        bar({ high: 102, low: 98 }),
      ]),
    );

    expect(prices.high).toBe(150);
    expect(prices.low).toBe(40);
  });

  it("reads a real recorded session", () => {
    const prices = seriesPrices(full());

    // Real NVDA bars. The relationships are what is asserted rather than the
    // figures, because a re-recording moves the figures and none of these:
    // the high is the highest thing that happened and the low the lowest.
    expect(prices.high).toBeGreaterThanOrEqual(prices.open);
    expect(prices.high).toBeGreaterThanOrEqual(prices.close);
    expect(prices.low).toBeLessThanOrEqual(prices.open);
    expect(prices.low).toBeLessThanOrEqual(prices.close);
  });

  it("survives a series at the endpoint's cap without exhausting the stack", () => {
    // The reason this is a loop rather than `Math.max(...bars.map(…))`: the
    // spread form applies the array as *arguments*, and 10,000 of them throws
    // `RangeError: Maximum call stack size exceeded` on some engines. That is a
    // crash whose frequency depends on the window the user chose.
    const many = Array.from({ length: 10_000 }, (_, i) =>
      bar({ high: 100 + i, low: 100 - i }),
    );

    const prices = seriesPrices(withBars(many));
    expect(prices.high).toBe(10_099);
    expect(prices.low).toBe(-9_899);
  });
});

describe("changePercent", () => {
  it("measures the move from the first open to the last close", () => {
    const percent = changePercent({
      open: 100,
      high: 120,
      low: 90,
      close: 110,
    });
    expect(percent).toBe(10);
  });

  it("answers null rather than Infinity for a zero open", () => {
    // Not a price any equity has, so this is a corrupt bar rather than a
    // division to attempt. The panel renders nothing rather than `Infinity%`.
    expect(changePercent({ open: 0, high: 1, low: 0, close: 1 })).toBeNull();
  });
});

describe("formatChangePercent and directionOf", () => {
  it("signs a move and names its direction", () => {
    expect(formatChangePercent(1.914)).toBe("+1.91%");
    expect(directionOf(1.914)).toBe("positive");
    // U+2212 MINUS SIGN, not a hyphen: a hyphen is narrower than a digit in a
    // tabular font and breaks the column `tabular-nums` exists to hold.
    expect(formatChangePercent(-1.914)).toBe("−1.91%");
    expect(directionOf(-1.914)).toBe("negative");
  });

  it("agrees with itself about a move that rounds to nothing", () => {
    // +0.001% renders as `0.00%`, and calling that "up" would put an upward
    // arrow beside a figure saying nothing moved — the panel contradicting
    // itself in two channels at once.
    expect(formatChangePercent(0.001)).toBe("0.00%");
    expect(directionOf(0.001)).toBe("unchanged");
  });
});

describe("formatMarketInstant", () => {
  it("renders a UTC instant in market time, with the zone named", () => {
    // 13:30Z is the 09:30 bar. The zone abbreviation is what makes that
    // checkable by a reader in another country.
    expect(formatMarketInstant(new Date("2026-09-04T13:30:00.000Z"))).toBe(
      "2026-09-04 09:30:00 EDT",
    );
  });

  it("follows the market's own clock across the standard-time boundary", () => {
    // The same wall-clock hour, six weeks apart, is a different UTC instant —
    // and this module knows that only because `market-time.ts` does.
    expect(formatMarketInstant(new Date("2026-12-04T14:30:00.000Z"))).toBe(
      "2026-12-04 09:30:00 EST",
    );
  });
});

describe("formatMarketRange", () => {
  it("renders the end exclusive, as it is stored", () => {
    const view = barSeriesFixtureView("full");
    if (view.state !== "loaded") throw new Error("not loaded");

    // A session's window is `[09:30, 16:00)` and its end is 16:00. Showing
    // 15:59:59 to avoid explaining a half-open interval would invent a second
    // vocabulary and make two adjacent windows look like they overlap.
    expect(formatMarketRange(view.series.coverage.requested)).toBe(
      "2026-09-04 09:30:00 EDT → 2026-09-04 10:00:00 EDT",
    );
  });
});

describe("barSpan", () => {
  it("reads the first and last bars rather than the covered range", () => {
    // The two are different questions: `covered` is the window the store
    // claims, and the bars are where the data actually begins inside it. A
    // panel reading the claim would report a bar that is not there.
    const span = barSpan(full());

    expect(span.first.startsAt.toISOString()).toBe("2026-09-04T13:30:00.000Z");
    expect(span.last.startsAt.toISOString()).toBe("2026-09-04T13:59:00.000Z");
  });
});

describe("formatPrice and formatCount", () => {
  it("sets a price to two decimals and a count with separators", () => {
    expect(formatPrice(230.3)).toBe("230.30");
    expect(formatCount(10_000)).toBe("10,000");
  });
});
