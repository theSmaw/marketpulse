import { describe, expect, it } from "vitest";

import { toMarketDate } from "./market-time.js";
import {
  SECTOR_LADDER_STEPS,
  fitSectorLadder,
  isSectorLadderStep,
  ratchetSectorLadder,
} from "./sector-ladder.js";

import type { SectorLadder } from "./sector-ladder.js";
import type { WireOverviewFigure } from "./market-stream-protocol.js";

const moved = (percent: number): WireOverviewFigure => ({
  state: "observed",
  symbol: "XLK",
  at: "2026-09-25T17:00:00.000Z",
  price: 100,
  changePercent: percent,
});

const storedMove = (percent: number): WireOverviewFigure => ({
  state: "stored",
  symbol: "XLV",
  session: "2026-09-25",
  close: 100,
  sessionChangePercent: percent,
});

const heardNothing: WireOverviewFigure = { state: "unknown", symbol: "XLF" };

const MONDAY = toMarketDate("2026-09-21");
const TUESDAY = toMarketDate("2026-09-22");

describe("the rungs", () => {
  it("are the four the owner named, smallest first", () => {
    expect(SECTOR_LADDER_STEPS).toEqual([1, 2, 5, 10]);
  });

  it("recognise a rung and refuse anything else — the wire reader's question", () => {
    expect(isSectorLadderStep(2)).toBe(true);
    expect(isSectorLadderStep(3)).toBe(false);
    expect(isSectorLadderStep("2")).toBe(false);
    expect(isSectorLadderStep(undefined)).toBe(false);
  });
});

describe("the rung a list fits into", () => {
  it("is the smallest one containing every figure", () => {
    expect(fitSectorLadder([moved(0.4), moved(-0.9)])).toBe(1);
    expect(fitSectorLadder([moved(0.4), moved(-1.4)])).toBe(2);
    expect(fitSectorLadder([moved(3.1), moved(-1.4)])).toBe(5);
    expect(fitSectorLadder([moved(0.1), storedMove(-7.2)])).toBe(10);
  });

  it("includes a figure sitting exactly on a rung", () => {
    // `<=`, so a 1.00% move is drawn at ±1 rather than stepping out for a
    // figure the rung's own label names.
    expect(fitSectorLadder([moved(1)])).toBe(1);
    expect(fitSectorLadder([moved(-2)])).toBe(2);
  });

  it("measures the DISPLAYED figure, so the ladder cannot contradict the rows", () => {
    // A raw +1.004% prints `+1.00%`. Stepping out to ±2 for a bar that reads
    // exactly the rung below it is the printed ladder disagreeing with the
    // printed number beside it.
    expect(fitSectorLadder([moved(1.004)])).toBe(1);
    expect(fitSectorLadder([moved(1.006)])).toBe(2);
  });

  it("counts a figure with NO move as nothing, rather than as flat", () => {
    // The absent-key rule again: a sector we have heard nothing about has not
    // moved 0%, so it neither holds the ladder down nor widens it.
    expect(fitSectorLadder([heardNothing, moved(3.4)])).toBe(5);
    expect(fitSectorLadder([heardNothing, heardNothing])).toBe(1);
    expect(fitSectorLadder([])).toBe(1);
  });

  it("saturates at the top rung rather than inventing a fifth", () => {
    expect(fitSectorLadder([moved(43)])).toBe(10);
  });
});

describe("the ratchet", () => {
  it("starts at the smallest rung that fits when there is no previous one", () => {
    expect(ratchetSectorLadder(undefined, MONDAY, [moved(0.3)])).toEqual({
      session: MONDAY,
      step: 1,
    });
  });

  it("steps OUTWARD within a session", () => {
    const first = ratchetSectorLadder(undefined, MONDAY, [moved(0.3)]);
    const second = ratchetSectorLadder(first, MONDAY, [moved(3.9)]);
    expect(second).toEqual({ session: MONDAY, step: 5 });
  });

  it("never steps back in, however quiet the frame becomes", () => {
    // The whole point: eleven bars must not rescale on a tick, and a minute
    // where the mover happens not to be in the batch is exactly that tick.
    const held: SectorLadder = { session: MONDAY, step: 5 };
    expect(ratchetSectorLadder(held, MONDAY, [moved(0.01)])).toEqual(held);
    expect(ratchetSectorLadder(held, MONDAY, [heardNothing])).toEqual(held);
    expect(ratchetSectorLadder(held, MONDAY, [])).toEqual(held);
  });

  it("RESETS at the bell — a new session starts again at the smallest fit", () => {
    // The owner's 2026-09-27 decision. A rung that survived the night would
    // open every quiet Tuesday on the previous Friday's rotation scale:
    // eleven stubs against a printed ±5%.
    const friday: SectorLadder = { session: MONDAY, step: 5 };
    expect(ratchetSectorLadder(friday, TUESDAY, [moved(0.2)])).toEqual({
      session: TUESDAY,
      step: 1,
    });
  });

  it("is not a `Math.max` over the frame, and these two cases prove it", () => {
    // The two halves of the rejection, side by side. A frame-max would give
    // the same rung for both of these; the ratchet gives 5 for the first
    // (because the session already stepped) and 1 for the second.
    const stepped: SectorLadder = { session: MONDAY, step: 5 };
    expect(ratchetSectorLadder(stepped, MONDAY, [moved(0.05)]).step).toBe(5);
    expect(ratchetSectorLadder(undefined, MONDAY, [moved(0.05)]).step).toBe(1);
  });

  it("holds no state of its own — the same arguments give the same answer", () => {
    const held: SectorLadder = { session: MONDAY, step: 2 };
    const once = ratchetSectorLadder(held, MONDAY, [moved(4)]);
    const twice = ratchetSectorLadder(held, MONDAY, [moved(4)]);
    expect(once).toEqual(twice);
    expect(held.step).toBe(2);
  });
});
