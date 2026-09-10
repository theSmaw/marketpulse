import { describe, expect, it } from "vitest";

import { toBarSeries } from "./bar-series.js";
import type { BarSeriesInput } from "./bar-series.js";
import type { Bar } from "./bar.js";
import {
  mergeSeriesProvenance,
  toSeriesProvenance,
} from "./market-provenance.js";
import { toTicker } from "./ticker.js";
import { toTimeRange } from "./time-range.js";

const OPEN = new Date("2026-09-04T13:30:00Z");

function barAt(minute: number, close = 100): Bar {
  return {
    startsAt: new Date(OPEN.getTime() + minute * 60_000),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1_000,
  };
}

const REQUESTED = toTimeRange(OPEN, new Date("2026-09-04T20:00:00Z"));

function input(overrides: Partial<BarSeriesInput> = {}): BarSeriesInput {
  const bars = overrides.bars ?? [barAt(0), barAt(1), barAt(2)];
  return {
    symbol: toTicker("NVDA"),
    timeframe: "1m",
    bars,
    provenance: toSeriesProvenance("raw", {
      provider: "fixture",
      feed: "synthetic",
      retrievedAt: "2026-09-07T13:30:00.000Z",
      barCount: bars.length,
    }),
    coverage: {
      requested: REQUESTED,
      covered:
        bars.length === 0
          ? null
          : toTimeRange(OPEN, new Date(OPEN.getTime() + bars.length * 60_000)),
    },
    ...overrides,
  };
}

describe("toBarSeries", () => {
  it("keeps what it was given", () => {
    const series = toBarSeries(input());

    expect(series.symbol).toBe("NVDA");
    expect(series.timeframe).toBe("1m");
    expect(series.bars).toHaveLength(3);
    expect(series.provenance.sources[0].feed).toBe("synthetic");
  });

  it("cannot be handed bars with no provenance", () => {
    // Acceptance criterion 3, and it is a COMPILE-time claim rather than a
    // runtime one — which is the strongest form available, and the reason the
    // assertion is a `@ts-expect-error` rather than an `expect`. If provenance
    // ever stops being required, this line stops erroring and `tsc -b` fails
    // the build on the unused directive. Task 2.6.2 measured the trap this
    // avoids: a runtime test of a shape is blind to a field being made
    // optional, because the object it builds still has one.
    const { symbol, timeframe, bars, coverage } = input();

    // @ts-expect-error - a series cannot be constructed without provenance
    expect(() => toBarSeries({ symbol, timeframe, bars, coverage })).toThrow();
  });

  it("accepts an empty series with no covered range", () => {
    // A provider that reached the venue and found nothing. `covered` is null
    // rather than zero-width because ranges are half-open and [t, t) is refused
    // — and because "we can make no claim" and "we cover an instant" are
    // different statements.
    const series = toBarSeries(
      input({
        bars: [],
        provenance: toSeriesProvenance("raw", {
          provider: "fixture",
          feed: "synthetic",
          retrievedAt: "2026-09-07T13:30:00.000Z",
          barCount: 0,
        }),
        coverage: { requested: REQUESTED, covered: null },
      }),
    );

    expect(series.bars).toEqual([]);
    expect(series.coverage.covered).toBeNull();
    // The requested range survives, which is how a consumer tells "nothing
    // traded" from "we never asked".
    expect(series.coverage.requested.end.toISOString()).toBe(
      "2026-09-04T20:00:00.000Z",
    );
  });

  it("refuses a bar whose instant is not a valid Date", () => {
    // Added 2026-09-10 by Task 2.10.4, which found the hole while writing the
    // frontend's mapper. The check below it cannot catch this: an invalid Date
    // compares as neither before nor after anything, so a single bar built from
    // `new Date("nonsense")` ascends fine, sits inside every covered range, and
    // reaches a chart as a point with no position. Both call sites — the
    // frontend parsing a response, and `alpaca-mapping.ts` on a vendor's `t` —
    // build one from a string they did not write.
    const invalid: Bar = { ...barAt(0), startsAt: new Date("nonsense") };

    expect(() =>
      toBarSeries(
        input({
          bars: [invalid],
          provenance: toSeriesProvenance("raw", {
            provider: "fixture",
            feed: "synthetic",
            retrievedAt: "2026-09-07T13:30:00.000Z",
            barCount: 1,
          }),
        }),
      ),
    ).toThrow(/invalid startsAt/);
  });

  it("refuses bars that are not strictly ascending", () => {
    expect(() => toBarSeries(input({ bars: [barAt(2), barAt(1)] }))).toThrow(
      /strictly ascending/,
    );
  });

  it("refuses a repeated bar", () => {
    // The shape a naive concatenation of two overlapping fetches produces.
    expect(() => toBarSeries(input({ bars: [barAt(0), barAt(0)] }))).toThrow(
      /strictly ascending/,
    );
  });

  it("refuses provenance whose bar counts do not add up", () => {
    // This is the check the whole record exists for: two arrays joined and one
    // source record kept is a series claiming all its bars came from wherever
    // the surviving record says.
    expect(() =>
      toBarSeries(
        input({
          provenance: toSeriesProvenance("raw", {
            provider: "fixture",
            feed: "synthetic",
            retrievedAt: "2026-09-07T13:30:00.000Z",
            barCount: 2,
          }),
        }),
      ),
    ).toThrow(/accounts for 2 bars but the series holds 3/);
  });

  it("counts a stitched series across all of its sources", () => {
    // The truthful stitch, end to end: two sources, two feeds, and the counts
    // sum to the bars. This is what Story 2.8's read path produces.
    const stored = toSeriesProvenance("raw", {
      provider: "fixture",
      feed: "iex",
      retrievedAt: "2026-08-01T13:30:00.000Z",
      barCount: 2,
    });
    const fresh = toSeriesProvenance("raw", {
      provider: "fixture",
      feed: "synthetic",
      retrievedAt: "2026-09-07T13:30:00.000Z",
      barCount: 1,
    });

    const series = toBarSeries(
      input({ provenance: mergeSeriesProvenance(stored, fresh) }),
    );

    expect(series.provenance.sources.map((s) => s.feed)).toEqual([
      "iex",
      "synthetic",
    ]);
    expect(series.provenance.sources.reduce((n, s) => n + s.barCount, 0)).toBe(
      series.bars.length,
    );
  });

  it("refuses an empty series that claims to cover something", () => {
    expect(() =>
      toBarSeries(
        input({
          bars: [],
          provenance: toSeriesProvenance("raw", {
            provider: "fixture",
            feed: "synthetic",
            retrievedAt: "2026-09-07T13:30:00.000Z",
            barCount: 0,
          }),
          coverage: {
            requested: REQUESTED,
            covered: toTimeRange(OPEN, new Date(OPEN.getTime() + 60_000)),
          },
        }),
      ),
    ).toThrow(/empty series must have a null covered range/);
  });

  it("refuses a non-empty series that claims to cover nothing", () => {
    expect(() =>
      toBarSeries(input({ coverage: { requested: REQUESTED, covered: null } })),
    ).toThrow(/must say what range it covers/);
  });

  it("refuses a bar outside the covered range", () => {
    // Story 2.14 renders the window rather than the bars, so a bar outside it
    // means one of the two is wrong and the rendered claim is the wrong one.
    expect(() =>
      toBarSeries(
        input({
          coverage: {
            requested: REQUESTED,
            covered: toTimeRange(OPEN, new Date(OPEN.getTime() + 2 * 60_000)),
          },
        }),
      ),
    ).toThrow(/starts outside the covered range/);
  });

  it("treats the covered range as half-open at the top", () => {
    // A bar exactly at `end` is outside, which is what makes adjacent series
    // tile without both claiming the seam bar.
    expect(() =>
      toBarSeries(
        input({
          bars: [barAt(0)],
          provenance: toSeriesProvenance("raw", {
            provider: "fixture",
            feed: "synthetic",
            retrievedAt: "2026-09-07T13:30:00.000Z",
            barCount: 1,
          }),
          coverage: {
            requested: REQUESTED,
            covered: toTimeRange(
              new Date(OPEN.getTime() - 60_000),
              new Date(OPEN.getTime()),
            ),
          },
        }),
      ),
    ).toThrow(/half-open, so a bar exactly at the end is outside it/);
  });

  it("refuses a covered range reaching outside what was asked for", () => {
    expect(() =>
      toBarSeries(
        input({
          coverage: {
            requested: toTimeRange(OPEN, new Date(OPEN.getTime() + 2 * 60_000)),
            covered: toTimeRange(OPEN, new Date(OPEN.getTime() + 3 * 60_000)),
          },
        }),
      ),
    ).toThrow(/cannot cover more than was asked for/);
  });
});
