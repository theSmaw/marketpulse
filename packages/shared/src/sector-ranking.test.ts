import { describe, expect, it } from "vitest";

import { SECTOR_ETFS, SECTORS } from "./security.js";
import {
  SECTOR_BY_ETF,
  compareSectorFigures,
  displayedPercent,
  rankSectorFigures,
  sectorOfEtf,
  sectorRankingKey,
} from "./sector-ranking.js";

import type { WireOverviewFigure } from "./market-stream-protocol.js";

// The three states, built as the producer builds them — `exactOptionalProperty
// Types` is on, so a figure with no move is a figure with no field.

const observed = (symbol: string, percent?: number): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-09-25T17:00:00.000Z",
  price: 100,
  ...(percent === undefined ? {} : { changePercent: percent }),
});

const stored = (symbol: string, percent?: number): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-09-25",
  close: 100,
  ...(percent === undefined ? {} : { sessionChangePercent: percent }),
});

const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

const order = (figures: readonly WireOverviewFigure[]): string[] =>
  rankSectorFigures(figures).map((figure) => figure.symbol);

describe("the ticker → sector map", () => {
  it("is derived from `SECTOR_ETFS` and covers every sector exactly once", () => {
    // **The permutation this replaces is invisible.** One wrong key in a
    // hand-written inverse puts XLV's figure on the Financials row with every
    // number on the screen still right, every arithmetic guard satisfied and
    // nothing to see in greyscale.
    expect(SECTOR_BY_ETF.size).toBe(SECTORS.length);
    for (const sector of SECTORS) {
      expect(SECTOR_BY_ETF.get(SECTOR_ETFS[sector])).toBe(sector);
    }
  });

  it("is keyed by the wire's bare string and answers nothing for a non-ETF", () => {
    expect(sectorOfEtf("XLK")).toBe("technology");
    expect(sectorOfEtf("SPY")).toBeUndefined();
    expect(sectorOfEtf("NVDA")).toBeUndefined();
  });
});

describe("the ranking key", () => {
  it("reads each state's own field, and never one state's from another", () => {
    // The two moves are different bases — live-against-a-close against a
    // completed session's close-to-close — which is why they are two fields.
    expect(sectorRankingKey(observed("XLK", 1.2))).toBe(1.2);
    expect(sectorRankingKey(stored("XLV", -0.4))).toBe(-0.4);
  });

  it("is ABSENT rather than zero for every figure that carries no move", () => {
    expect(sectorRankingKey(observed("XLK"))).toBeUndefined();
    expect(sectorRankingKey(stored("XLV"))).toBeUndefined();
    expect(sectorRankingKey(unknown("XLF"))).toBeUndefined();
  });

  it("treats a non-finite move as absent, because a NaN comparator has no order", () => {
    // The serialiser drops one at the wire and `readFigure` refuses one at the
    // other end — but this function is called in-process before the encode, so
    // it is inside that gap. `Array.prototype.sort` with a comparator
    // returning `NaN` has no defined result at all.
    expect(sectorRankingKey(observed("XLK", Number.NaN))).toBeUndefined();
    expect(
      sectorRankingKey(stored("XLV", Number.POSITIVE_INFINITY)),
    ).toBeUndefined();
  });
});

describe("the comparator", () => {
  it("ranks strongest first, across both states that carry a move", () => {
    expect(
      order([observed("XLK", 0.4), stored("XLV", 1.9), observed("XLF", -0.8)]),
    ).toEqual(["XLV", "XLK", "XLF"]);
  });

  it("puts a figure with NO move after every figure that has one", () => {
    // **The absent-key rule, and the defect it refuses.** `?? 0` would place
    // XLU — which we have heard nothing about and hold no close for — between
    // the +0.01% and the −0.01% sectors: a claim that it did not move,
    // expressed as a rank position rather than as a number. ADR 0029's false
    // impression, in the one channel a renderer cannot label away.
    expect(
      order([
        observed("XLK", 0.01),
        unknown("XLU"),
        observed("XLF", -0.01),
        stored("XLV"),
      ]),
    ).toEqual(["XLK", "XLF", "XLU", "XLV"]);
  });

  it("holds keyless figures in the order they arrived", () => {
    // Two figures with no move are not equally FLAT, they are equally
    // unrankable — so the producer's order (`SECTORS`') survives.
    expect(order([unknown("XLU"), stored("XLV"), observed("XLK")])).toEqual([
      "XLU",
      "XLV",
      "XLK",
    ]);
  });

  it("does not swap two figures that read the same on screen", () => {
    // Eleven sector ETFs cluster tightly. 0.003% apart, both printing
    // `+0.41%`, would trade places on every frame — up to ~16 times a minute —
    // with nothing on the list changing. Keyed on the DISPLAYED precision
    // rather than on a threshold somebody chose, which buys the checkable
    // invariant: the displayed order never contradicts the displayed figures.
    expect(
      compareSectorFigures(observed("XLK", 0.412), observed("XLV", 0.409)),
    ).toBe(0);
    expect(order([observed("XLK", 0.409), observed("XLV", 0.412)])).toEqual([
      "XLK",
      "XLV",
    ]);
    expect(order([observed("XLV", 0.412), observed("XLK", 0.409)])).toEqual([
      "XLV",
      "XLK",
    ]);
  });

  it("does swap two figures that read differently, by one displayed step", () => {
    expect(order([observed("XLK", 0.414), observed("XLV", 0.416)])).toEqual([
      "XLV",
      "XLK",
    ]);
  });

  it("is stable enough that ranking a ranked list changes nothing", () => {
    const figures = [
      observed("XLK", 0.41),
      observed("XLV", 0.41),
      unknown("XLF"),
      stored("XLE", -1.2),
    ];
    const once = rankSectorFigures(figures);
    expect(rankSectorFigures(once)).toEqual(once);
  });

  it("returns a new array and leaves the producer's order alone", () => {
    const figures = [observed("XLK", 0.1), observed("XLV", 2)];
    const ranked = rankSectorFigures(figures);
    expect(ranked).not.toBe(figures);
    expect(figures.map((figure) => figure.symbol)).toEqual(["XLK", "XLV"]);
  });
});

describe("every mixed-state combination of eleven", () => {
  // Done-when 3. The eleven in `SECTORS`' declared order, so the tie-break and
  // the keyless tail are the declared order in every case below.
  const tickers = SECTORS.map((sector) => SECTOR_ETFS[sector] as string);

  it("all eleven observed with a move: a full ranking", () => {
    // Descending moves in declared order, so the ranking reverses it.
    const figures = tickers.map((ticker, index) =>
      observed(ticker, index * 0.5 - 2),
    );
    expect(order(figures)).toEqual([...tickers].reverse());
  });

  it("all eleven observed with NO move: the declared order, untouched", () => {
    expect(order(tickers.map((ticker) => observed(ticker)))).toEqual(tickers);
  });

  it("all eleven STORED with a move: ranked exactly as observed ones are", () => {
    const figures = tickers.map((ticker, index) => stored(ticker, index));
    expect(order(figures)).toEqual([...tickers].reverse());
  });

  it("all eleven stored with no prior close: the declared order", () => {
    expect(order(tickers.map((ticker) => stored(ticker)))).toEqual(tickers);
  });

  it("ALL ELEVEN UNKNOWN: the declared order, and not an empty list", () => {
    // **CI's own state** — 518 securities, zero bars — and the state every
    // security is in for some minutes after a restart. A ranking over eleven
    // absences is the declared order: there is nothing to rank, and saying so
    // by keeping the order is the honest answer rather than a list sorted by
    // something invented.
    expect(order(tickers.map(unknown))).toEqual(tickers);
  });

  it("observed, stored and unknown mixed: keyed first, keyless in place", () => {
    const figures = tickers.map((ticker, index) => {
      if (index % 3 === 0) return observed(ticker, 1 - index * 0.1);
      if (index % 3 === 1) return stored(ticker, index * 0.2 - 1);
      return unknown(ticker);
    });

    const ranked = rankSectorFigures(figures);
    const keyed = ranked.filter(
      (figure) => sectorRankingKey(figure) !== undefined,
    );
    const keyless = ranked.filter(
      (figure) => sectorRankingKey(figure) === undefined,
    );

    expect(ranked).toHaveLength(SECTORS.length);
    // Every keyed figure precedes every keyless one.
    expect(ranked.slice(0, keyed.length)).toEqual(keyed);
    // Descending **as displayed**, and the keyless tail is the declared order.
    // Displayed rather than raw, because that is the whole rule and this list
    // contains a pair that proves it: two of these moves are 0.3999999999999999
    // and 0.40000000000000013 — a raw descending sort swaps them, and both
    // print `+0.40%`, so the ranking must not.
    const keys = keyed.map((figure) =>
      displayedPercent(sectorRankingKey(figure) ?? 0),
    );
    expect([...keys].sort((a, b) => b - a)).toEqual(keys);
    expect(keyless.map((figure) => figure.symbol)).toEqual(
      tickers.filter((_, index) => index % 3 === 2),
    );
  });

  it("one observed among ten unknowns: the one we can say something about leads", () => {
    const figures = tickers.map((ticker, index) =>
      index === 7 ? observed(ticker, -3.4) : unknown(ticker),
    );
    expect(order(figures)[0]).toBe(tickers[7]);
  });
});
