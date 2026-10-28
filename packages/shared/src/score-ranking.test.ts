import { describe, expect, it } from "vitest";

import {
  compareByScore,
  isRankedByScore,
  selectByScore,
} from "./score-ranking.js";
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

describe("selectByScore", () => {
  // **A selection rather than a sort** (Task 5.6.7), and every comparison goes
  // through `compareByScore` — so the assertions below are about the bound and
  // the fidelity of the order, never about a second expression of it.

  it("returns the strongest `limit` rows, strongest first", () => {
    const rows = [
      row("CCC", 40),
      row("AAA", 75),
      row("EEE", 3),
      row("BBB", 61),
      row("DDD", 32),
    ];

    expect(selectByScore(rows, 3).map((taken) => taken.symbol)).toEqual([
      "AAA",
      "BBB",
      "CCC",
    ]);
  });

  it("applies the declared tie-break rather than the arrival order", () => {
    // The arrival order is the join's, filtered by a live eligibility pass that
    // changes membership up to ~16 times a minute — so two securities on the
    // same score would swap under a reader with nothing having changed, which
    // ADR 0041 forbids in terms.
    const forward = [row("ZZZ", 50), row("AAA", 50), row("MMM", 50)];
    const backward = [...forward].reverse();

    expect(selectByScore(forward, 2).map((taken) => taken.symbol)).toEqual([
      "AAA",
      "MMM",
    ]);
    expect(selectByScore(backward, 2).map((taken) => taken.symbol)).toEqual([
      "AAA",
      "MMM",
    ]);
  });

  it("is a SELECTION: it returns the caller's own rows and never pads", () => {
    // A region with fewer than `limit` scored securities draws fewer rows and
    // reserves the room, which is `withHeldUnusualRows`' job and not a
    // producer's.
    const rows = [row("AAA", 61), row("BBB", 40)];

    expect(selectByScore(rows, 10)).toHaveLength(2);
    expect(selectByScore(rows, 10)[0]).toBe(rows[0]);
  });

  it("returns nothing at a non-positive limit", () => {
    expect(selectByScore([row("AAA", 61)], 0)).toEqual([]);
    expect(selectByScore([row("AAA", 61)], -1)).toEqual([]);
  });

  it("agrees with a full sort through the same comparator", () => {
    // The strongest statement available about a bounded insertion: it is the
    // prefix of the total order, for every prefix length.
    const rows = Array.from({ length: 40 }, (_, at) =>
      row(`S${String(at).padStart(2, "0")}`, (at * 7) % 76),
    );
    const sorted = [...rows].sort(compareByScore);

    for (const limit of [1, 5, 10, 39, 40, 41]) {
      expect(selectByScore(rows, limit)).toEqual(sorted.slice(0, limit));
    }
  });

  it("puts the taken rows in the comparator's own order", () => {
    expect(
      isRankedByScore(
        selectByScore([row("CCC", 1), row("AAA", 75), row("BBB", 40)], 3),
      ),
    ).toBe(true);
  });
});
