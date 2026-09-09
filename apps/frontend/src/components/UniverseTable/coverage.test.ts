import { describe, expect, it } from "vitest";

import type { SecurityCoverage } from "@marketpulse/shared";

import {
  coverageEndDate,
  coverageStartDate,
  formatBarCount,
  formatDepth,
  summariseCoverage,
} from "./coverage.js";

// The formatters, driven with plain arguments (Task 2.8.9). No DOM, no fetch,
// and no fixture larger than the thing being asserted — which is the whole
// reason these left `UniverseTable.tsx`: what a number *reads* as is the half
// of this column most likely to be wrong.

function coverage(
  start: string,
  end = "2026-09-04T20:00:00.000Z",
  barCount = 97_530,
): SecurityCoverage {
  return { symbol: "NVDA", timeframe: "1m", start, end, barCount };
}

describe("formatDepth", () => {
  // The real store's ordinary row: 2025-09-08 to 2026-09-04, which is a few
  // days short of a calendar year because the frontier is a trading session
  // rather than an anniversary. It must still read `1y` — a `0.9y` here would
  // be arithmetically defensible and would make 515 rows look like a rounding
  // error.
  it("reads a year of history as a year", () => {
    expect(formatDepth(coverage("2025-09-08T13:30:00.000Z"))).toBe("1y");
  });

  it("keeps a decimal place where one is informative", () => {
    expect(formatDepth(coverage("2025-03-04T14:30:00.000Z"))).toBe("1.5y");
  });

  // The benign outlier, and the only kind of exception this column has: a 2026
  // spin-off that listed inside the backfill window. Task 2.8.8 measured two
  // and the local store now holds three.
  it("reads a partial history in months", () => {
    expect(formatDepth(coverage("2026-06-15T13:30:00.000Z"))).toBe("3mo");
  });

  it("reads a very short history in days", () => {
    expect(formatDepth(coverage("2026-08-24T13:30:00.000Z"))).toBe("11d");
  });

  // A window shorter than a day is a session or less, which the ledger can
  // hold after one catch-up run against a security nothing had backfilled.
  // Rounding it to `0d` would read as "we hold nothing", which is the one
  // thing this cell must never say when it does.
  it("never reads a real window as zero", () => {
    expect(
      formatDepth(
        coverage("2026-09-04T13:30:00.000Z", "2026-09-04T20:00:00.000Z"),
      ),
    ).toBe("1d");
  });
});

describe("the covered window as trading days", () => {
  it("reports the day the history starts", () => {
    expect(coverageStartDate(coverage("2025-09-08T13:30:00.000Z"))).toBe(
      "2025-09-08",
    );
  });

  it("reports the last day of a minute window", () => {
    expect(coverageEndDate(coverage("2025-09-08T13:30:00.000Z"))).toBe(
      "2026-09-04",
    );
  });

  // **The half-open end, and the case that makes subtracting a millisecond
  // deliberate rather than decorative.**
  //
  // The test above does not: 20:00Z is 16:00 in New York, so reading `end`
  // directly gives the same day and the assertion passes either way. That was
  // written first, claiming to be the check, and the deliberate break did not
  // go red — which is Task 2.5.3's rule arriving from the useful side, and the
  // reason this second case exists.
  //
  // A **daily** window is where it bites, and the shape is real rather than
  // invented: the local ledger's `1d` row ends at `2026-09-08T04:00:00Z`, which
  // is midnight in New York, so `end` itself is a day we hold nothing of. This
  // endpoint sends the minute series, but the function is general and Story
  // 2.11's per-security route is where the daily depth arrives.
  it("reports the last day covered, not the first day beyond it", () => {
    expect(
      coverageEndDate(
        coverage("2024-01-02T05:00:00.000Z", "2026-09-08T04:00:00.000Z"),
      ),
    ).toBe("2026-09-07");
  });

  // The one thing a `toISOString().slice(0, 10)` would get wrong, and the
  // reason this goes through `market-time.ts`: 00:30Z on the 5th is 20:30 in
  // New York on the 4th, so the UTC date and the trading day are different
  // days.
  it("reports the market's day rather than UTC's", () => {
    expect(coverageStartDate(coverage("2025-09-05T00:30:00.000Z"))).toBe(
      "2025-09-04",
    );
  });
});

describe("summariseCoverage", () => {
  it("counts what is held and totals the bars", () => {
    const summary = summariseCoverage(
      new Map([
        ["NVDA", coverage("2025-09-08T13:30:00.000Z")],
        ["HONA", coverage("2026-06-15T13:30:00.000Z", undefined, 19_541)],
      ]),
    );

    expect(summary).toEqual({
      securities: 2,
      bars: 117_071,
      through: "2026-09-04",
    });
  });

  // "Through when" is the frontier the store has reached, so it is the latest
  // end and not the earliest. A backfill walks backwards from the most recent
  // session, so securities differ at the start and share this date.
  it("reports the furthest day any security reaches", () => {
    const summary = summariseCoverage(
      new Map([
        [
          "STALE",
          coverage("2025-09-08T13:30:00.000Z", "2026-08-03T20:00:00.000Z"),
        ],
        ["NVDA", coverage("2025-09-08T13:30:00.000Z")],
      ]),
    );

    expect(summary.through).toBe("2026-09-04");
  });

  // A migrated database nobody has backfilled. `null` rather than a date,
  // because there is no day to name — which is what lets the summary line
  // collapse to a sentence instead of reporting three zeroes.
  it("names no day at all when nothing is held", () => {
    expect(summariseCoverage(new Map())).toEqual({
      securities: 0,
      bars: 0,
      through: null,
    });
  });
});

describe("formatBarCount", () => {
  it.each([
    [47_682_213, "47.7M"],
    [1_000_000, "1M"],
    [2_400_000_000, "2.4B"],
    [97_530, "98k"],
    [412, "412"],
  ])("reads %i as %s", (bars, expected) => {
    expect(formatBarCount(bars)).toBe(expected);
  });
});
