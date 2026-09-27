import { describe, expect, it } from "vitest";

import type {
  Bar,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import {
  SECTOR_CLAIM,
  rowsInPinnedOrder,
  sectorPerformance,
} from "./sector-performance.js";
import type { SectorRow } from "./sector-performance.js";

const NO_OBSERVATIONS = new Map<string, Bar>();
const NO_SNAPSHOT = new Set<string>();

const frame = (
  sectors: readonly WireOverviewFigure[] | undefined,
  step?: 1 | 2 | 5 | 10,
): WireMarketOverview => ({
  computedAt: "2026-09-25T18:01:00.000Z",
  feeds: [],
  figures: [],
  ...(sectors === undefined ? {} : { sectors }),
  ...(step === undefined ? {} : { sectorLadderStep: step }),
});

const observed = (
  symbol: string,
  changePercent?: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-09-25T18:01:00.000Z",
  price: 100,
  ...(changePercent === undefined ? {} : { changePercent }),
});

const stored = (
  symbol: string,
  sessionChangePercent?: number,
): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-09-25",
  close: 100,
  ...(sessionChangePercent === undefined ? {} : { sessionChangePercent }),
});

const read = (overview: WireMarketOverview | undefined) =>
  sectorPerformance(overview, NO_OBSERVATIONS, NO_SNAPSHOT);

describe("sectorPerformance", () => {
  it("reads a stored figure's move from sessionChangePercent, not changePercent", () => {
    // **The trap this whole module exists to close.** A `stored` figure carries
    // its move under a different field name from an `observed` one, on purpose,
    // because they are different bases — and a renderer reaching for
    // `changePercent` here finds nothing and draws a sector with no figure on
    // the one day of the week the store is the only source there is.
    const view = read(frame([stored("XLK", 1.32)], 2));

    expect(view?.rows[0]?.move).toEqual({
      change: "+1.32%",
      direction: "positive",
      percent: 1.32,
    });
    expect(view?.rows[0]?.absent).toBeUndefined();
  });

  it("numbers only the figures that have a move, and in the order it was given", () => {
    // The producer ranks; this counts. A keyless figure sorts after every keyed
    // one at the producer, so a running count cannot hand a number to one.
    const view = read(
      frame(
        [
          observed("XLK", 1.8),
          stored("XLI", 0.4),
          stored("XLB"),
          observed("XLV"),
        ],
        2,
      ),
    );

    expect(view?.rows.map((row) => [row.symbol, row.rank])).toEqual([
      ["XLK", 1],
      ["XLI", 2],
      ["XLB", undefined],
      ["XLV", undefined],
    ]);
  });

  it("gives a figure with no move words rather than a zero", () => {
    // ADR 0029's false impression, in a figure column. `0.00%` here would claim
    // the market did not move, which is the one thing we do not know.
    const view = read(
      frame(
        [stored("XLB"), observed("XLV"), { state: "unknown", symbol: "XLE" }],
        1,
      ),
    );

    expect(view?.rows.map((row) => row.absent)).toEqual([
      "2026-09-25 close",
      "No stored close",
      "None stored",
    ]);
    expect(view?.rows.every((row) => row.move === undefined)).toBe(true);
  });

  it("labels each row from SECTOR_LABELS and never by transform", () => {
    const view = read(frame([observed("XLV", 0.1), observed("XLRE", -0.1)], 1));

    // `Health Care` and `Healthcare` are the same slug and different words.
    expect(view?.rows.map((row) => row.label)).toEqual([
      "Health Care",
      "Real Estate",
    ]);
  });

  it("labels a symbol it does not recognise with itself rather than a guess", () => {
    const view = read(frame([observed("ZZZZ", 0.1)], 1));

    expect(view?.rows[0]?.label).toBe("ZZZZ");
  });

  it("carries the rung the frame sent and never one of its own", () => {
    // A `Math.max` over the figures would be the frame-max normalisation the
    // drawing rejected. These figures do not fit ±1 and the rung stays ±1,
    // because the rung is session state the server holds.
    expect(read(frame([observed("XLK", 4.4)], 1))?.step).toBe(1);
    expect(read(frame([observed("XLK", 0.01)], 10))?.step).toBe(10);
  });

  it("is absent when the frame has no sectors, an empty section, or no rung", () => {
    // Three ways to reach one state on screen. The second is the defect
    // `MarketProxyStrip` shipped — *a frame arrived and is about nothing* fell
    // through to the ordinary path — and the third is a rollback pinning a
    // previous image, where a new bundle meets a gateway that sends neither.
    expect(read(undefined)).toBeUndefined();
    expect(read(frame(undefined))).toBeUndefined();
    expect(read(frame([], 2))).toBeUndefined();
    expect(read(frame([observed("XLK", 1)]))).toBeUndefined();
  });

  it("marks an arrival from the shared rule, and never from a snapshot", () => {
    const bar: Bar = {
      startsAt: new Date("2026-09-25T18:01:00.000Z"),
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 10,
    };
    const overview = frame([observed("XLK", 1), observed("XLI", 1)], 2);

    const marked = sectorPerformance(
      overview,
      new Map([
        ["XLK", bar],
        ["XLI", bar],
      ]),
      new Set(["XLI"]),
    );

    expect(marked?.rows[0]?.arrival).toBeDefined();
    expect(marked?.rows[1]?.arrival).toBeUndefined();
  });
});

describe("a row's basis", () => {
  it("pairs the member the move came from with the session it measured from", () => {
    // **The whole point is that it CHANGES at the bell**, which is the one
    // moment the list legitimately re-arranges wholesale: every figure stops
    // being *that session's close-to-close move* and starts being *today
    // against yesterday's close*. A row whose basis changed had no previous
    // rank under this one, so it is a new list rather than eleven simultaneous
    // re-orders.
    const shut = read(frame([stored("XLK", 1.32)], 2));
    const open = read(frame([observed("XLK", 1.32)], 2));

    expect(shut?.rows[0]?.basis).toBeDefined();
    expect(open?.rows[0]?.basis).toBeDefined();
    expect(shut?.rows[0]?.basis).not.toBe(open?.rows[0]?.basis);
  });

  it("is the same for two rows measuring from the same session, and absent with no move", () => {
    // Two `observed` figures on one frame share a basis, so a swap between them
    // travels. A row with no move has no rank to have had, so it has no basis
    // either — and `undefined === undefined` is deliberately NOT a licence to
    // move, because a row with no rank is never in the ordered set at all.
    const view = read(
      frame([observed("XLK", 1.32), observed("XLE", 0.4), stored("XLU")], 2),
    );

    expect(view?.rows[0]?.basis).toBe(view?.rows[1]?.basis);
    expect(view?.rows[2]?.basis).toBeUndefined();
  });
});

describe("rowsInPinnedOrder", () => {
  const row = (symbol: string, rank: number): SectorRow => ({
    symbol,
    label: symbol,
    rank,
    move: undefined,
    absent: "None stored",
    arrival: undefined,
    basis: "observed:2026-09-25",
  });

  const LIVE = [row("XLE", 1), row("XLK", 2), row("XLC", 3)];

  it("draws the pinned order and keeps every row's own rank", () => {
    // **The hold gates the movement, not the ranking.** The ordinals go on
    // updating while the list stands still, and the disagreement between them
    // and the order of the rows IS the pending re-order.
    const held = rowsInPinnedOrder(LIVE, ["XLK", "XLC", "XLE"]);

    expect(held.map((entry) => entry.symbol)).toEqual(["XLK", "XLC", "XLE"]);
    expect(held.map((entry) => entry.rank)).toEqual([2, 3, 1]);
  });

  it("returns the live order itself when nothing is held", () => {
    expect(rowsInPinnedOrder(LIVE, undefined)).toBe(LIVE);
  });

  it("drops no row the pin has never seen", () => {
    // It cannot happen from our own gateway, which sends the same eleven every
    // frame. What it must not do is lose one: a sector that vanished from a
    // held list would be a missing row nobody could explain.
    const held = rowsInPinnedOrder(LIVE, ["XLC"]);

    expect(held.map((entry) => entry.symbol)).toEqual(["XLC", "XLE", "XLK"]);
  });

  it("never reads a figure, so it cannot reorder two rows the comparator tied", () => {
    // The file's only `sort`, and it sorts by a position a reader pinned. Two
    // figures that read the same on screen never swap — that is a property of
    // `rankSectorFigures` in `packages/shared`, and this keeps it one.
    const tied = [row("XLK", 1), row("XLE", 1), row("XLC", 1)];

    expect(
      rowsInPinnedOrder(tied, ["XLK", "XLE", "XLC"]).map(
        (entry) => entry.symbol,
      ),
    ).toEqual(["XLK", "XLE", "XLC"]);
  });
});

describe("SECTOR_CLAIM", () => {
  it("states the weighting and makes no membership claim", () => {
    // **The falsification this string exists because of.** The copy originally
    // specified for this region was `… — S&P 500 constituents only`, which
    // stopped being true on 2026-09-08 when the universe was defined **as** the
    // index: the equity that clause warns about does not exist. A corrected
    // membership claim is refused too — it would be true and it would be noise.
    expect(SECTOR_CLAIM).toContain("capitalisation-weighted");
    expect(SECTOR_CLAIM).toContain("not the average of its members");
    expect(SECTOR_CLAIM).not.toMatch(/constituent|S&P|member of|holds/iu);
  });

  it("says nothing about the market, the basis, the instant or the feed", () => {
    // It must not imply the eleven sum to *the market* — they partition the
    // S&P 500 exactly, which is narrower — and the basis, the instant, the feed
    // and the adjustment are the screen's one source note's or the chrome's.
    expect(SECTOR_CLAIM).not.toMatch(
      /\bthe market\b|change from|EDT|EST|feed|IEX|exchanges|adjust/iu,
    );
  });
});
