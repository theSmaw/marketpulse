import { describe, expect, it } from "vitest";

import { compareByScore, isRankedByScore } from "./score-ranking.js";
import type { ScoreRanked } from "./score-ranking.js";

const row = (symbol: string, score: number): ScoreRanked => ({ symbol, score });

describe("compareByScore", () => {
  it("puts the higher score first", () => {
    expect(compareByScore(row("AAA", 73), row("BBB", 40))).toBeLessThan(0);
    expect(compareByScore(row("AAA", 40), row("BBB", 73))).toBeGreaterThan(0);
  });

  it("breaks a tie on ticker ascending, and NEVER returns 0 for two securities", () => {
    // **The declared tie-break, and the reason it is declared.** An integer
    // score over 501 securities makes ties routine — the shipped two-factor
    // scale holds 76 values — and a `0` here delegates the answer to the
    // array's arrival order, which is the join's and re-orders up to ~16 times
    // a minute. ADR 0041 forbids a ranked surface re-ordering under a reader
    // with nothing having changed.
    expect(compareByScore(row("AAA", 50), row("BBB", 50))).toBeLessThan(0);
    expect(compareByScore(row("BBB", 50), row("AAA", 50))).toBeGreaterThan(0);
    expect(compareByScore(row("AAA", 50), row("AAA", 50))).toBe(0);
  });

  it("is a TOTAL order: the same set sorts to one list, from any input order", () => {
    const rows = [
      row("NVDA", 73),
      row("AAPL", 73),
      row("MSFT", 40),
      row("ZZZZ", 73),
      row("AMD", 12),
    ];

    const forward = [...rows].sort(compareByScore).map((entry) => entry.symbol);
    const reversed = [...rows]
      .reverse()
      .sort(compareByScore)
      .map((entry) => entry.symbol);

    expect(forward).toStrictEqual(["AAPL", "NVDA", "ZZZZ", "MSFT", "AMD"]);
    expect(reversed).toStrictEqual(forward);
  });

  it("ranks a reduced-factor score on its RAW value, never on `score ÷ max`", () => {
    // AC 3 at the comparator: a 2-of-3 score of 73 sorts above a 1-of-3 score
    // of 40, even though the second is 100% of its own maximum and the first is
    // 97%. Ranking on the ratio is renormalisation arriving one layer further
    // out than the band layer AC 3 was written against, and it would lift the
    // worst-covered securities into the top ten.
    expect(compareByScore(row("FULL", 73), row("THIN", 40))).toBeLessThan(0);
    // There is no `max` on `ScoreRanked` at all, which is the structural half:
    // a comparator that wanted the ratio has nothing to divide by.
    expect("max" in row("FULL", 73)).toBe(false);
  });

  it("refuses a non-integer or non-finite score rather than ordering it", () => {
    for (const bad of [Number.NaN, 50.5, Number.POSITIVE_INFINITY]) {
      // The unrankable one sorts last whichever side it is given on, and the
      // result is still deterministic.
      expect(compareByScore(row("AAA", 50), row("BBB", bad))).toBeLessThan(0);
      expect(compareByScore(row("BBB", bad), row("AAA", 50))).toBeGreaterThan(
        0,
      );
    }

    // Two unrankable rows are not *equally ordinary*, they are equally
    // unrankable, and fall through to the tie-break.
    expect(
      compareByScore(row("AAA", Number.NaN), row("BBB", Number.NaN)),
    ).toBeLessThan(0);
  });
});

describe("isRankedByScore", () => {
  it("accepts the comparator's own unique order and refuses a swapped pair", () => {
    expect(
      isRankedByScore([row("AAPL", 73), row("NVDA", 73), row("MSFT", 40)]),
    ).toBe(true);
    // A swapped tie is refused rather than tolerated, which is what the
    // declared tie-break buys: a correct frame admits exactly one order.
    expect(
      isRankedByScore([row("NVDA", 73), row("AAPL", 73), row("MSFT", 40)]),
    ).toBe(false);
    expect(isRankedByScore([row("MSFT", 40), row("NVDA", 73)])).toBe(false);
  });

  it("accepts an empty list and a single row", () => {
    expect(isRankedByScore([])).toBe(true);
    expect(isRankedByScore([row("NVDA", 73)])).toBe(true);
  });

  it("refuses a hole in the array", () => {
    const holed = [
      row("AAPL", 73),
      undefined,
      row("MSFT", 40),
    ] as unknown as readonly ScoreRanked[];
    expect(isRankedByScore(holed)).toBe(false);
  });
});
