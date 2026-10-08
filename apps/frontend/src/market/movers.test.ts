import { describe, expect, it } from "vitest";

import { MOVERS_PER_SIDE } from "@marketpulse/shared";
import type {
  Bar,
  WireMarketMovers,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import {
  RESERVED_MOVERS,
  marketMovers,
  moverSymbols,
  withHeldRows,
} from "./movers.js";

// The reader over the frame's movers section (Task 4.5.5). `withHeldRows` and
// the reservation are Task 4.5.3's and are covered by `Movers.test.tsx`
// through the component; what is new here is the read.

const NO_OBSERVATIONS = new Map<string, Bar>();
const NO_SNAPSHOT = new Set<string>();
const NAMES = new Map([
  ["NVDA", "NVIDIA Corporation"],
  ["MRNA", "Moderna, Inc."],
]);

const observed = (
  symbol: string,
  price: number,
  changePercent?: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-10-07T18:01:00.000Z",
  price,
  ...(changePercent === undefined ? {} : { changePercent }),
});

const stored = (
  symbol: string,
  close: number,
  sessionChangePercent?: number,
): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-10-07",
  close,
  ...(sessionChangePercent === undefined ? {} : { sessionChangePercent }),
});

const section = (
  gainers: readonly WireOverviewFigure[],
  losers: readonly WireOverviewFigure[],
): WireMarketMovers => ({
  basis: "observed",
  gainers,
  losers,
  eligible: 466,
  tracked: 503,
  windowMinutes: 5,
});

const frame = (movers: WireMarketMovers | undefined): WireMarketOverview => ({
  computedAt: "2026-10-07T18:01:00.000Z",
  feeds: [],
  figures: [],
  ...(movers === undefined ? {} : { movers }),
});

const read = (
  overview: WireMarketOverview | undefined,
  names: ReadonlyMap<string, string> = NAMES,
  observations: ReadonlyMap<string, Bar> = NO_OBSERVATIONS,
  fromSnapshot: ReadonlySet<string> = NO_SNAPSHOT,
) => marketMovers(overview, observations, fromSnapshot, names);

describe("marketMovers", () => {
  it("reads the price from the member the figure's own state names", () => {
    // **The same trap `sectorPerformance` exists to close, one field over.**
    // An observed figure's price is `price` and a stored one's is `close`;
    // they are not the same field and a renderer reaching for the wrong one
    // finds nothing. Out of hours **every** mover row is the stored member, so
    // this is the common path rather than the edge case.
    const view = read(
      frame(
        section(
          [observed("NVDA", 189.42, 3.41)],
          [stored("MRNA", 24.5, -8.37)],
        ),
      ),
    );

    expect(view?.gainers[0]?.price).toBe("189.42");
    expect(view?.losers[0]?.price).toBe("24.50");
  });

  it("gives a figure with neither a price nor a close no price at all", () => {
    // `?? 0` on a price column is a plausible figure for a security we know
    // nothing about — ADR 0029's false impression with two decimal places. An
    // `unknown` figure cannot be ranked and so cannot reach a list from our own
    // producer; what this asserts is which way the read fails if one does.
    const view = read(
      frame(section([{ state: "unknown", symbol: "NVDA" }], [])),
    );

    expect(view?.gainers[0]?.price).toBeUndefined();
  });

  it("ranks each list from 1 — the two are peers, not one list split", () => {
    const view = read(
      frame(
        section(
          [observed("NVDA", 1, 3.41), observed("AMD", 1, 2.2)],
          [stored("MRNA", 1, -8.37), stored("ALB", 1, -5.94)],
        ),
      ),
    );

    expect(view?.gainers.map((row) => row.rank)).toEqual([1, 2]);
    expect(view?.losers.map((row) => row.rank)).toEqual([1, 2]);
  });

  it("takes the order the producer sent and never re-orders it", () => {
    // `selectMovers` is the one comparator and it has already run. A sort here
    // would be a second order, and two orders that agree today are two orders
    // that disagree at a tie — which is exactly where `compareByMove`'s
    // stability lives.
    const view = read(
      frame(section([observed("A", 1, 1), observed("B", 1, 9)], [])),
    );

    expect(view?.gainers.map((row) => row.symbol)).toEqual(["A", "B"]);
  });

  it("labels a row with its company name, and with its ticker when the universe has not arrived", () => {
    const section_ = section([observed("NVDA", 1, 3.41)], []);

    expect(read(frame(section_))?.gainers[0]?.label).toBe("NVIDIA Corporation");
    expect(read(frame(section_), new Map())?.gainers[0]?.label).toBe("NVDA");
  });

  it("gives a row no rank when its figure carries no ranking key", () => {
    // A producer defect rather than a state to draw: `RankedList` drops an
    // unranked row outright when the quiet group is impossible, and the one
    // thing this must not do is hand it an ordinal.
    const view = read(frame(section([observed("NVDA", 1)], [])));

    expect(view?.gainers[0]?.rank).toBeUndefined();
    expect(view?.gainers[0]?.move).toBeUndefined();
  });

  it("marks an arrival from the observations map and not from a snapshot", () => {
    const bar: Bar = {
      startsAt: new Date("2026-10-07T18:01:00.000Z"),
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    };
    const observations = new Map([
      ["NVDA", bar],
      ["MRNA", bar],
    ]);

    const view = read(
      frame(section([observed("NVDA", 1, 3.41)], [stored("MRNA", 1, -8.37)])),
      NAMES,
      observations,
      new Set(["MRNA"]),
    );

    expect(view?.gainers[0]?.arrival).toBeDefined();
    expect(view?.losers[0]?.arrival).toBeUndefined();
  });

  it("is undefined when the frame carries no movers section, and when there is no frame", () => {
    // The two states the route tells apart by the **frame**: a rollback pinning
    // a previous image that sends no section, and the first paint.
    expect(read(frame(undefined))).toBeUndefined();
    expect(read(undefined)).toBeUndefined();
  });

  it("is two EMPTY lists when the section carries none — not the absence", () => {
    // **The difference from `sectorPerformance`, which treats an empty section
    // as the absence.** Eleven benchmarks are a roster; a movers list's
    // membership is an answer, and *nothing was rankable* is CI's permanent
    // state and most of a weekend. Collapsing it to `undefined` would make the
    // region reserve itself invisibly for ever rather than say so.
    const view = read(frame(section([], [])));

    expect(view).toEqual(RESERVED_MOVERS);
    expect(withHeldRows(view?.gainers ?? [])).toHaveLength(MOVERS_PER_SIDE);
  });
});

describe("moverSymbols", () => {
  it("names every symbol both lists carry, from the frame rather than the drawn rows", () => {
    // The page's subscription is built from this: a section that draws an
    // arrival mark owes the symbol key a line, and a key taken from the drawn
    // rows would carry the held pads' non-breaking spaces into a `subscribe`.
    const symbols = moverSymbols(
      frame(section([observed("NVDA", 1, 3)], [stored("MRNA", 1, -3)])),
    );

    expect(symbols).toEqual(["NVDA", "MRNA"]);
    expect(moverSymbols(frame(undefined))).toEqual([]);
    expect(moverSymbols(undefined)).toEqual([]);
  });
});
