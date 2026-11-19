import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { fiveMinuteReturn } from "./five-minute-return.js";
import { readPriceAnomaly } from "./price-anomaly.js";
import { breakpointsOf } from "./return-baseline.js";
import { comparableBaseline, returnPercentileOf } from "./return-percentile.js";

import type { LiveObservation } from "./market-data-stream.js";
import type { PriceAnomalySources } from "./price-anomaly.js";
import type { StoredReturnBaseline } from "./return-baseline-store.js";
import type { BarSource } from "@marketpulse/shared";

// **The one shared producer** (Task 7.2.2) — the assembly `symbolReturn` and
// `calculate_return_percentile` both read, so a figure has one home and two
// readers. What this suite holds is the two things only this module can get
// wrong: that the triple is exactly what the four owning functions answer
// when called by hand, and that the baseline is addressed at the `asOf` it
// was given rather than at some other instant.

const NVDA = toTicker("NVDA");

const SOURCE: BarSource = {
  provider: "fixture",
  feed: "iex",
  retrievedAt: "2026-11-19T14:06:00.000Z",
  barCount: 1,
};

const barAt = (minute: string, close: number): LiveObservation => ({
  symbol: NVDA,
  bar: {
    startsAt: new Date(`2026-11-19T${minute}:00.000Z`),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1_000,
  },
  source: SOURCE,
  supersedes: false,
});

const WINDOW = [barAt("14:00", 100), barAt("14:05", 101)];
const SAMPLES = Array.from({ length: 2_500 }, (_u, index) => index / 2_499);

const STORED: StoredReturnBaseline = {
  symbol: NVDA,
  observedAt: new Date("2026-11-18T21:00:00.000Z"),
  lookbackSessions: 60,
  sampleCount: SAMPLES.length,
  refusal: null,
  breakpoints: breakpointsOf(SAMPLES),
};

const GRID = { spanMinutes: 5, feed: "sip" } as const;

const SOURCES: PriceAnomalySources = {
  windowOf: () => WINDOW,
  baselineOf: () => STORED,
  grid: GRID,
};

const ASOF = new Date("2026-11-19T14:06:00.000Z");

describe("readPriceAnomaly", () => {
  it("answers exactly what the four owning functions answer, called by hand", () => {
    const reading = readPriceAnomaly(SOURCES, NVDA, ASOF);

    const figure = fiveMinuteReturn(WINDOW, { asOf: ASOF });
    const comparison = comparableBaseline(STORED, GRID);
    if (!figure.measured || !comparison.ranked) {
      throw new Error("test setup: expected a measurable, rankable pair");
    }

    expect(reading.figure).toStrictEqual(figure);
    expect(reading.comparison).toStrictEqual(comparison);
    expect(reading.percentile).toStrictEqual(
      returnPercentileOf(figure.percent, comparison.distribution),
    );
  });

  it("asks the baseline for the instant it was given, and nothing else", () => {
    const asked: Date[] = [];
    const reading = readPriceAnomaly(
      {
        ...SOURCES,
        baselineOf: (_symbol, asOf) => {
          asked.push(asOf);
          return STORED;
        },
      },
      NVDA,
      ASOF,
    );

    // One read, at the caller's own instant — the UTC→session-date
    // conversion is the caller's (`marketDateAt`), and a replay hands a past
    // instant to this same call.
    expect(asked).toStrictEqual([ASOF]);
    expect(reading.percentile).not.toBeUndefined();
  });

  it("asks whether there is a baseline even where there is no move", () => {
    // *We have no move* and *we have no history* are two facts a reader is
    // owed both of — the narrowing is asked unconditionally (Task 5.6.4), so
    // a refused figure still carries how much history we hold.
    const reading = readPriceAnomaly(
      { ...SOURCES, windowOf: () => [] },
      NVDA,
      ASOF,
    );

    expect(reading.figure.measured).toBe(false);
    expect(reading.comparison.ranked).toBe(true);
    // Nothing to rank, so no ordinal — never a rank of `0`.
    expect(reading.percentile).toBeUndefined();
  });
});
