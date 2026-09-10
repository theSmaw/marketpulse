import type { BarSeriesPayload } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { toDomainSeries } from "./bar-series-payload.js";

// What these tests are about is **coherence**, which is the whole reason this
// module exists: `isBarSeriesResponse` has already checked the shape by the
// time anything here runs, so every case below is a body that would satisfy the
// predicate and still be wrong. Each of them is a fault in a server we wrote,
// and each of them would otherwise reach a chart looking plausible.

const REQUESTED = {
  start: "2026-09-08T13:30:00.000Z",
  end: "2026-09-08T20:00:00.000Z",
};

function payload(overrides: Partial<BarSeriesPayload> = {}): BarSeriesPayload {
  return {
    symbol: "NVDA",
    timeframe: "1m",
    bars: [
      {
        startsAt: "2026-09-08T13:30:00.000Z",
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 100,
      },
      {
        startsAt: "2026-09-08T13:31:00.000Z",
        open: 1.5,
        high: 2.5,
        low: 1,
        close: 2,
        volume: 200,
      },
    ],
    provenance: {
      adjustment: "raw",
      sources: [
        {
          provider: "alpaca",
          feed: "sip",
          retrievedAt: "2026-09-09T02:00:00.000Z",
          barCount: 2,
        },
      ],
    },
    coverage: { requested: REQUESTED, covered: REQUESTED },
    ...overrides,
  };
}

describe("toDomainSeries", () => {
  it("turns wire instants into Dates and leaves the numbers alone", () => {
    const series = toDomainSeries(payload());

    expect(series.symbol).toBe("NVDA");
    expect(series.bars).toHaveLength(2);
    expect(series.bars[0]?.startsAt.toISOString()).toBe(
      "2026-09-08T13:30:00.000Z",
    );
    expect(series.bars[0]?.close).toBe(1.5);
    expect(series.coverage.requested.start.toISOString()).toBe(REQUESTED.start);
    expect(series.coverage.covered?.end.toISOString()).toBe(REQUESTED.end);
  });

  it("keeps an empty series empty, with no covered range", () => {
    // The 200 that looks like a failure and is not (MARKET-DATA-API.md §6).
    const series = toDomainSeries(
      payload({
        bars: [],
        provenance: {
          adjustment: "raw",
          sources: [
            {
              provider: "alpaca",
              feed: "sip",
              retrievedAt: "2026-09-09T02:00:00.000Z",
              barCount: 0,
            },
          ],
        },
        coverage: { requested: REQUESTED, covered: null },
      }),
    );

    expect(series.bars).toHaveLength(0);
    expect(series.coverage.covered).toBeNull();
  });

  it("refuses a bar whose instant is not parseable", () => {
    // **The check whose absence is invisible**, and the one this task found
    // missing. An invalid Date compares as neither before nor after anything,
    // so before the guard was added to `toBarSeries` this payload passed the
    // ascending check *and* both range checks, and arrived at a chart as a
    // point with no position. The guard lives in the constructor rather than in
    // the mapper because `alpaca-mapping.ts` builds bars from a vendor string
    // too, and those are stored.
    expect(() =>
      toDomainSeries(
        payload({
          bars: [
            {
              startsAt: "the ninth of September",
              open: 1,
              high: 2,
              low: 0.5,
              close: 1.5,
              volume: 100,
            },
          ],
          provenance: {
            adjustment: "raw",
            sources: [
              {
                provider: "alpaca",
                feed: "sip",
                retrievedAt: "2026-09-09T02:00:00.000Z",
                barCount: 1,
              },
            ],
          },
        }),
      ),
    ).toThrow(/invalid startsAt/);
  });

  it("refuses bars that do not ascend", () => {
    expect(() =>
      toDomainSeries(
        payload({
          bars: [
            {
              startsAt: "2026-09-08T13:31:00.000Z",
              open: 1,
              high: 2,
              low: 0.5,
              close: 1.5,
              volume: 100,
            },
            {
              startsAt: "2026-09-08T13:30:00.000Z",
              open: 1,
              high: 2,
              low: 0.5,
              close: 1.5,
              volume: 100,
            },
          ],
        }),
      ),
    ).toThrow(/strictly ascending/);
  });

  it("refuses provenance that does not account for every bar", () => {
    // The stitch check: two arrays joined and one provenance record kept is a
    // series claiming all its bars came from whichever half wrote the record.
    expect(() =>
      toDomainSeries(
        payload({
          provenance: {
            adjustment: "raw",
            sources: [
              {
                provider: "alpaca",
                feed: "sip",
                retrievedAt: "2026-09-09T02:00:00.000Z",
                barCount: 1,
              },
            ],
          },
        }),
      ),
    ).toThrow(/Provenance accounts for 1 bars but the series holds 2/);
  });

  it("refuses a series that names no source at all", () => {
    // The wire types `sources` as a plain array because a tuple has no JSON
    // Schema equivalent, so the domain type's non-emptiness has to be
    // re-established here rather than assumed.
    expect(() =>
      toDomainSeries(
        payload({ provenance: { adjustment: "raw", sources: [] } }),
      ),
    ).toThrow(/at least one source/);
  });

  it("refuses a covered range that reaches outside what was asked for", () => {
    expect(() =>
      toDomainSeries(
        payload({
          coverage: {
            requested: REQUESTED,
            covered: {
              start: REQUESTED.start,
              end: "2026-09-08T21:00:00.000Z",
            },
          },
        }),
      ),
    ).toThrow();
  });
});
