import { describe, expect, it } from "vitest";

import {
  UNUSUAL_ROWS,
  compareByPercentile,
  isRankedByPercentile,
  selectByPercentile,
} from "./percentile-ranking.js";

import type { PercentileRanked } from "./percentile-ranking.js";

// **The order a list of price percentiles goes in** (Task 5.4.2) — a sibling of
// `sector-ranking.ts`' comparator rather than a widening of it, and the only
// place two ordinals are compared.

const row = (symbol: string, rank: number): PercentileRanked => ({
  symbol,
  rank,
});

describe("compareByPercentile — most unusual first", () => {
  it("puts the higher ordinal first whichever order it is asked in", () => {
    expect(compareByPercentile(row("AAA", 99), row("BBB", 42))).toBeLessThan(0);
    expect(compareByPercentile(row("BBB", 42), row("AAA", 99))).toBeGreaterThan(
      0,
    );
  });

  it("breaks a tie on the ticker ascending, and never answers 0", () => {
    // **The declared tie-break**, and the reason it cannot be inherited:
    // `compareByMove` answers `0` for a display-equal pair and leans on a
    // stable sort over *the order it was given*, which is safe over `SECTORS`'
    // declared order and is not safe here — this list arrives in the join's
    // order, filtered by a live pass that changes membership up to ~16 times a
    // minute, so two securities on one ordinal would swap under a reader with
    // nothing having changed.
    expect(compareByPercentile(row("AAA", 50), row("BBB", 50))).toBeLessThan(0);
    expect(compareByPercentile(row("BBB", 50), row("AAA", 50))).toBeGreaterThan(
      0,
    );
  });

  it("is a total order over a set of unique symbols", () => {
    const rows = [
      row("MSFT", 50),
      row("AAPL", 50),
      row("NVDA", 99),
      row("AMD", 3),
    ];

    // Sorted from two different arrival orders, the answer is the same list —
    // which is the property the tie-break exists for and the one a `0` would
    // destroy.
    const forwards = [...rows].sort(compareByPercentile).map((r) => r.symbol);
    const backwards = [...rows]
      .reverse()
      .sort(compareByPercentile)
      .map((r) => r.symbol);

    expect(forwards).toEqual(["NVDA", "AAPL", "MSFT", "AMD"]);
    expect(backwards).toEqual(forwards);
  });

  it("answers 0 only for one row against itself", () => {
    expect(compareByPercentile(row("AAA", 7), row("AAA", 7))).toBe(0);
  });

  it("orders a row with no honest ordinal last rather than placing it", () => {
    // A `NaN` in a comparator has no defined result for the **whole** array,
    // not for one element — and this function runs in-process, before the
    // encode, so it is inside the gap the serialiser's guarantee cannot reach.
    // The producer never builds such a row; this keeps the order defined if
    // one ever is.
    for (const broken of [Number.NaN, Number.POSITIVE_INFINITY, 3.5]) {
      expect(
        compareByPercentile(row("AAA", broken), row("BBB", 0)),
      ).toBeGreaterThan(0);
      expect(
        compareByPercentile(row("BBB", 0), row("AAA", broken)),
      ).toBeLessThan(0);
    }
  });
});

describe("selectByPercentile — bounded rather than sorted", () => {
  const population = [
    row("DDD", 12),
    row("AAA", 99),
    row("FFF", 0),
    row("CCC", 42),
    row("BBB", 99),
    row("EEE", 7),
  ];

  it("takes the strongest, not the first seen", () => {
    expect(selectByPercentile(population, 3).map((r) => r.symbol)).toEqual([
      "AAA",
      "BBB",
      "CCC",
    ]);
  });

  it("agrees with a full sort at every bound", () => {
    const sorted = [...population].sort(compareByPercentile);

    for (let limit = 0; limit <= population.length + 2; limit += 1) {
      expect(selectByPercentile(population, limit)).toEqual(
        sorted.slice(0, limit),
      );
    }
  });

  it("returns fewer rows rather than padding, and never a placeholder", () => {
    // A region with fewer than the bound draws fewer rows and reserves the
    // room; a held row on the wire is a row every reader of the frame would
    // have to know to ignore.
    expect(selectByPercentile([row("AAA", 50)], UNUSUAL_ROWS)).toEqual([
      row("AAA", 50),
    ]);
    expect(selectByPercentile([], UNUSUAL_ROWS)).toEqual([]);
    expect(selectByPercentile(population, 0)).toEqual([]);
  });

  it("does not mutate or re-order the array it was handed", () => {
    const given = [...population];
    selectByPercentile(given, 3);
    expect(given).toEqual(population);
  });

  it("hands back the caller's own rows, not copies", () => {
    const [top] = selectByPercentile(population, 1);
    expect(top).toBe(population[1]);
  });
});

const population = [
  row("DDD", 12),
  row("AAA", 99),
  row("FFF", 0),
  row("CCC", 42),
  row("BBB", 99),
  row("EEE", 7),
];

describe("isRankedByPercentile — the reader's half of the order", () => {
  it("accepts the one order a set of rows admits", () => {
    // **The one, not an acceptable one.** `compareByPercentile` is a TOTAL
    // order — ties break on the ticker — so unlike the movers' equivalent
    // this is an equality rather than a monotonicity test, and a swapped tie
    // is a defect rather than a tolerance.
    expect(
      isRankedByPercentile([row("AAA", 99), row("BBB", 99), row("CCC", 97)]),
    ).toBe(true);
  });

  it("refuses a pair out of ordinal order", () => {
    expect(isRankedByPercentile([row("AAA", 97), row("BBB", 99)])).toBe(false);
  });

  it("refuses a TIE broken the wrong way round", () => {
    // The case the movers' comparator cannot have an opinion about, and the
    // whole reason the tie-break was declared: this list arrives in the
    // join's order, which re-orders under a live feed up to sixteen times a
    // minute, so *the order it was given* is not stable between two frames
    // and two securities on one ordinal would swap under a reader with
    // nothing having changed.
    expect(isRankedByPercentile([row("BBB", 99), row("AAA", 99)])).toBe(false);
  });

  it("is vacuously true of nothing and of one row", () => {
    // CI's permanent state is the first of these, and it must not be read as
    // a failure: 516 securities, zero bars and no baseline generation rank
    // nothing, for ever.
    expect(isRankedByPercentile([])).toBe(true);
    expect(isRankedByPercentile([row("AAA", 42)])).toBe(true);
  });

  it("agrees with what `selectByPercentile` produces, over an unordered set", () => {
    // The two halves of the claim meeting: the producer's selection is in the
    // order the reader demands, by construction rather than by agreement.
    expect(isRankedByPercentile(selectByPercentile(population, 4))).toBe(true);
  });

  it("refuses a hole rather than vouching for an order it cannot read", () => {
    const holed = [row("AAA", 99), undefined, row("CCC", 97)];
    expect(isRankedByPercentile(holed as unknown as PercentileRanked[])).toBe(
      false,
    );
  });
});
