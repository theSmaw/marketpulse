import { MOVERS_PER_SIDE, toMarketDate, toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  BREADTH_WINDOW_MINUTES,
  eligibleMoves,
  marketBreadth,
} from "./market-breadth.js";
import { topMovers } from "./market-movers.js";

import type { Bar, BarSource, WireOverviewFigure } from "@marketpulse/shared";
import type { MarketOverviewEntry } from "./market-overview.js";

// **No clock, no socket, no database.** `market-breadth.ts`' note applies
// unchanged: every input is an argument, including the instant and the
// mapping, so this module cannot read anything timestamped after a replay
// clock because it reads nothing at all.

const source: BarSource = {
  provider: "alpaca",
  feed: "iex",
  retrievedAt: "2026-09-16T18:03:00.000Z",
  barCount: 1,
};

/** 14:03 ET on a Wednesday — inside the regular session. */
const ASOF = new Date("2026-09-16T18:03:30.000Z");

const bar = (close: number, minutesAgo: number): Bar => ({
  startsAt: new Date(ASOF.getTime() - minutesAgo * 60_000),
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
});

const live = (
  symbol: string,
  over: { readonly percent: number | null; readonly minutesAgo?: number },
): MarketOverviewEntry => ({
  state: "live",
  symbol: toTicker(symbol),
  bar: bar(100, over.minutesAgo ?? 1),
  source,
  change: {
    percent: over.percent,
    basis: over.percent === null ? null : toMarketDate("2026-09-15"),
  },
});

const stored = (
  symbol: string,
  over: { readonly close: number; readonly previousClose: number | null },
): MarketOverviewEntry => ({
  state: "stored",
  symbol: toTicker(symbol),
  close: {
    symbol: toTicker(symbol),
    session: toMarketDate("2026-09-16"),
    close: over.close,
    previousClose: over.previousClose,
  },
});

const OPEN = { asOf: ASOF, marketOpen: true } as const;
const SHUT = { asOf: ASOF, marketOpen: false } as const;

/**
 * The caller's mapping, stated here rather than imported.
 *
 * `toWireMarketOverview` passes its own `figureOf` in — the one place entitled
 * to say what a browser may see, and the one place that records a figure's
 * tape on the frame. These tests are about the **selection**, so they hand in
 * the smallest honest mapping and count the calls.
 */
const figures: WireOverviewFigure[] = [];

const figureOf = (entry: MarketOverviewEntry): WireOverviewFigure => {
  const figure: WireOverviewFigure =
    entry.state === "live"
      ? {
          state: "observed",
          symbol: entry.symbol,
          at: entry.bar.startsAt.toISOString(),
          price: entry.bar.close,
          ...(entry.change.percent === null
            ? {}
            : { changePercent: entry.change.percent }),
        }
      : entry.state === "stored"
        ? {
            state: "stored",
            symbol: entry.symbol,
            session: entry.close.session,
            close: entry.close.close,
            ...(entry.close.previousClose === null
              ? {}
              : {
                  sessionChangePercent:
                    ((entry.close.close - entry.close.previousClose) /
                      entry.close.previousClose) *
                    100,
                }),
          }
        : { state: "unknown", symbol: entry.symbol };

  figures.push(figure);
  return figure;
};

const moversOf = (
  entries: readonly MarketOverviewEntry[],
  options: typeof OPEN | typeof SHUT = OPEN,
) => topMovers(eligibleMoves(entries, options), figureOf);

const symbolsOf = (list: readonly WireOverviewFigure[]): string[] =>
  list.map((figure) => figure.symbol);

describe("the two ends of the eligible set", () => {
  it("ranks each end strongest first, through the one comparator", () => {
    const movers = moversOf([
      live("AAPL", { percent: 1.2 }),
      live("NVDA", { percent: 4.4 }),
      live("KO", { percent: -0.9 }),
      live("PG", { percent: -3.1 }),
      live("MSFT", { percent: 0 }),
    ]);

    expect(symbolsOf(movers.gainers)).toEqual(["NVDA", "AAPL"]);
    // Weakest first: the biggest fall leads its own list.
    expect(symbolsOf(movers.losers)).toEqual(["PG", "KO"]);
  });

  it("puts a figure that rounds to flat in NEITHER list", () => {
    // `selectMovers`' classifier, through `directionOf` on the displayed
    // figure. A +0.004% move prints `0.00%`, and a row printing `0.00%` at the
    // top of *Gainers* is the three-channels-disagreeing defect as a list.
    const movers = moversOf([
      live("A", { percent: 0.004 }),
      live("B", { percent: -0.004 }),
    ]);

    expect(movers.gainers).toEqual([]);
    expect(movers.losers).toEqual([]);
    // And it is still eligible: it had a measurable move, which is what the
    // denominator counts.
    expect(movers.eligible).toBe(2);
  });

  it("bounds each end at MOVERS_PER_SIDE and does not pad the short one", () => {
    // Five is a HEIGHT (Task 4.5.3) and the producer slices to it while the
    // drawing pads to it. A held row on the wire is a row every reader of the
    // frame would have to know to ignore.
    const movers = moversOf([
      ...Array.from({ length: 9 }, (_unused, at) =>
        live(`UP${String.fromCharCode(65 + at)}`, { percent: at + 1 }),
      ),
      live("DOWN", { percent: -2 }),
    ]);

    expect(movers.gainers).toHaveLength(MOVERS_PER_SIDE);
    expect(movers.losers).toHaveLength(1);
    expect(symbolsOf(movers.gainers)).toEqual([
      "UPI",
      "UPH",
      "UPG",
      "UPF",
      "UPE",
    ]);
  });

  it("never carries the same symbol in both lists", () => {
    // Disjoint by construction, through the one classifier — the property
    // `readMovers` checks at the other end of the wire because a frame where
    // it fails did not come from this function.
    const movers = moversOf([
      live("A", { percent: 2 }),
      live("B", { percent: -2 }),
      live("C", { percent: 1 }),
    ]);

    const both = symbolsOf(movers.gainers).filter((symbol) =>
      symbolsOf(movers.losers).includes(symbol),
    );
    expect(both).toEqual([]);
  });
});

describe("the denominator, and the agreement with breadth", () => {
  it("counts `eligible` as the length of the pass it was handed", () => {
    const movers = moversOf([
      live("A", { percent: 2 }),
      live("B", { percent: -2 }),
      // Heard from, no close: a true price with no basis, so no measurable
      // move and outside the eligible set.
      live("C", { percent: null }),
      // Heard from outside the window.
      live("D", { percent: 3, minutesAgo: BREADTH_WINDOW_MINUTES + 1 }),
    ]);

    expect(movers.eligible).toBe(2);
    expect(movers.tracked).toBe(4);
    // And the one outside the window cannot appear, which is the whole reason
    // the pass is shared rather than re-written here.
    expect(symbolsOf(movers.gainers)).toEqual(["A"]);
  });

  it("agrees with the breadth count BY CONSTRUCTION, on both bases", () => {
    // **Task 4.5.4's acceptance criterion 1, as an assertion.** One pass, two
    // consumers: `eligible` is its length and `measured` is its tally, so a
    // ranked list and the count beside it cannot be about two populations.
    const entries = [
      live("A", { percent: 2 }),
      live("B", { percent: -2 }),
      live("C", { percent: 0 }),
      live("D", { percent: null }),
      live("E", { percent: 9, minutesAgo: BREADTH_WINDOW_MINUTES + 2 }),
      stored("F", { close: 110, previousClose: 100 }),
    ];

    for (const options of [OPEN, SHUT] as const) {
      const pass = eligibleMoves(entries, options);
      const movers = topMovers(pass, figureOf);
      const breadth = marketBreadth(pass);

      expect(movers.eligible).toBe(breadth.measured);
      expect(movers.tracked).toBe(breadth.tracked);
      expect(movers.basis).toBe(breadth.basis);
    }
  });

  it("carries the window on the observed basis and the session on the other", () => {
    // The qualifier is the pass's, so there is no second spelling of the five
    // minutes and no second answer to *which session*. A rollback can put a
    // gateway and a bundle two values apart; it cannot put two sections of one
    // frame two values apart.
    const entries = [stored("F", { close: 110, previousClose: 100 })];

    expect(moversOf(entries, OPEN)).toMatchObject({
      basis: "observed",
      windowMinutes: BREADTH_WINDOW_MINUTES,
    });

    expect(moversOf(entries, SHUT)).toMatchObject({
      basis: "session",
      session: "2026-09-16",
    });
  });

  it("ranks a STORED figure outside a session, which is 80% of the week", () => {
    const movers = moversOf(
      [
        stored("UP", { close: 110, previousClose: 100 }),
        stored("DOWN", { close: 90, previousClose: 100 }),
        // No prior close: no measurable move, so no key and no row.
        stored("QUIET", { close: 50, previousClose: null }),
      ],
      SHUT,
    );

    expect(symbolsOf(movers.gainers)).toEqual(["UP"]);
    expect(symbolsOf(movers.losers)).toEqual(["DOWN"]);
    expect(movers.eligible).toBe(2);
    expect(movers.tracked).toBe(3);
  });

  it("answers two empty lists over an empty set, which is CI's store", () => {
    // 518 securities and zero bars. `eligible: 0` is *we looked and nothing
    // was measurable* — a true answer, and a different state from the section
    // being absent.
    expect(moversOf([], SHUT)).toEqual({
      basis: "session",
      gainers: [],
      losers: [],
      eligible: 0,
      tracked: 0,
      session: "2026-09-16",
    });
  });
});

describe("the rank key is the pass's, never the figure's", () => {
  it("ranks on the move the pass measured even when the figure says otherwise", () => {
    // **Task 4.5.8, written as the defect somebody else will write.** The
    // encoder below is the one a careless caller supplies: it builds a figure
    // whose own move is the **negation** of the one the pass measured, which
    // is the shape of the shipped defect rather than a caricature of it — on
    // the `session` basis `eligibleMoves` measured a close-to-close move and
    // `figureOf` built an `observed` figure carrying the live price against
    // that close, and the two disagree in sign the moment a security has
    // given back its session's gain.
    //
    // `topMovers` must order these by the **pass's** number, because the
    // pass is what breadth bucketed by and what the region's footer names.
    // Ranking by the figure's is the defect, and before this task it was what
    // this function did.
    const inverting = (entry: MarketOverviewEntry): WireOverviewFigure => ({
      state: "observed",
      symbol: entry.symbol,
      at: ASOF.toISOString(),
      price: 100,
      changePercent:
        entry.state === "live" && entry.change.percent !== null
          ? -entry.change.percent
          : 0,
    });

    const movers = topMovers(
      eligibleMoves(
        [
          live("UP", { percent: 3 }),
          live("MID", { percent: 1 }),
          live("DOWN", { percent: -4 }),
        ],
        OPEN,
      ),
      inverting,
    );

    expect(symbolsOf(movers.gainers)).toEqual(["UP", "MID"]);
    expect(symbolsOf(movers.losers)).toEqual(["DOWN"]);
  });

  it("does not rank a member whose measured move has no direction", () => {
    // The filter moved with the key: a non-finite percentage is **eligible**
    // — it had a measurable move, which is what the denominator counts — and
    // it is in no bucket and in neither list. `?? 0` would place it between
    // +0.01% and −0.01%, which is ADR 0029's false impression expressed as a
    // rank position.
    const movers = topMovers(
      {
        qualifier: { basis: "observed", windowMinutes: BREADTH_WINDOW_MINUTES },
        moves: [
          { entry: live("A", { percent: 2 }), percent: 2 },
          { entry: live("B", { percent: 1 }), percent: Number.NaN },
        ],
        tracked: 503,
      },
      figureOf,
    );

    expect(symbolsOf(movers.gainers)).toEqual(["A"]);
    expect(movers.eligible).toBe(2);
  });
});

describe("the rows are the caller's figures", () => {
  it("encodes only the rows it selected, never the whole pass", () => {
    // **The encoder runs after the cut** (Task 4.5.8). `figureOf` appends
    // each observed figure's tape to the frame's own `feeds` list, so
    // encoding all 503 put tapes on the frame for figures it does not carry —
    // invariant 6 implied rather than displayed. Eleven eligible entries, six
    // selected (five gainers and one loser), six encodes.
    figures.length = 0;

    const movers = moversOf([
      ...Array.from({ length: 10 }, (_unused, at) =>
        live(`UP${String.fromCharCode(65 + at)}`, { percent: at + 1 }),
      ),
      live("DOWN", { percent: -2 }),
    ]);

    expect(movers.eligible).toBe(11);
    expect(figures).toHaveLength(MOVERS_PER_SIDE + 1);
    expect(symbolsOf(figures).sort()).toEqual([
      "DOWN",
      "UPF",
      "UPG",
      "UPH",
      "UPI",
      "UPJ",
    ]);
  });

  it("maps each eligible entry exactly once, and nothing else", () => {
    // **Why the encoder is a parameter**: `figureOf` is `market-overview.ts`',
    // it decides what a browser may see, and it appends each observed
    // figure's tape to the frame's own `feeds` list. A second mapping here
    // would be a second answer to both questions — and a figure built for a
    // row nobody selected would put a tape on the frame for an entry the
    // frame does not carry.
    figures.length = 0;

    const movers = moversOf([
      live("A", { percent: 2 }),
      live("B", { percent: -2 }),
      live("C", { percent: null }),
    ]);

    expect(figures).toHaveLength(2);
    expect(symbolsOf(figures).sort()).toEqual(["A", "B"]);
    expect(movers.gainers[0]).toBe(figures.find((f) => f.symbol === "A"));
  });
});
