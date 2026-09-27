import { describe, expect, it } from "vitest";

import { createSectorLadderRatchet } from "./sector-ladder-ratchet.js";

import type { WireOverviewFigure } from "@marketpulse/shared";

const moved = (percent: number): WireOverviewFigure => ({
  state: "observed",
  symbol: "XLK",
  at: "2026-09-25T17:00:00.000Z",
  price: 100,
  changePercent: percent,
});

// 17:00Z is 13:00 in New York on both sides of the DST boundary, so these are
// mid-session instants on the dates they read as.
const midSession = (date: string): Date => new Date(`${date}T17:00:00.000Z`);
/** 08:00 in New York — a trading day whose bell has not rung. */
const beforeTheBell = (date: string): Date => new Date(`${date}T12:00:00.000Z`);

describe("the cell that remembers the rung", () => {
  it("steps outward within a session and never back in", () => {
    const ratchet = createSectorLadderRatchet();

    expect(ratchet.stepFor([moved(0.4)], midSession("2026-09-21"))).toBe(1);
    expect(ratchet.stepFor([moved(4.1)], midSession("2026-09-21"))).toBe(5);
    // The quiet frame a minute later must not rescale eleven bars.
    expect(ratchet.stepFor([moved(0.1)], midSession("2026-09-21"))).toBe(5);
  });

  it("resets at the bell rather than at midnight", () => {
    const ratchet = createSectorLadderRatchet();
    expect(ratchet.stepFor([moved(4.1)], midSession("2026-09-21"))).toBe(5);

    // **08:00 the next morning still carries the previous session's rung**,
    // and that is the intended reading of *reset at the bell*: a pre-market
    // frame stepping the ladder on thin extended-hours prices would hand the
    // regular session a scale bought with a few hundred shares.
    expect(ratchet.stepFor([moved(0.2)], beforeTheBell("2026-09-22"))).toBe(5);

    // The regular session's first frame is the one that starts again.
    expect(ratchet.stepFor([moved(0.2)], midSession("2026-09-22"))).toBe(1);
  });

  it("carries nothing across a weekend", () => {
    const ratchet = createSectorLadderRatchet();
    expect(ratchet.stepFor([moved(6)], midSession("2026-09-25"))).toBe(10);
    expect(ratchet.stepFor([moved(0.3)], midSession("2026-09-28"))).toBe(1);
  });

  it("holds the session beside the rung, so one cannot reset without the other", () => {
    const ratchet = createSectorLadderRatchet();
    expect(ratchet.held()).toBeUndefined();

    ratchet.stepFor([moved(1.5)], midSession("2026-09-21"));
    expect(ratchet.held()).toEqual({ session: "2026-09-21", step: 2 });
  });

  it("reads no clock of its own — the instant is the producer's", () => {
    // Two ratchets given the same instants agree, which is what makes the
    // aggregate reproducible under a replay: the producer's `asOf` is the
    // replay clock's reading there.
    const a = createSectorLadderRatchet();
    const b = createSectorLadderRatchet();
    const at = midSession("2026-09-21");
    expect(a.stepFor([moved(3)], at)).toBe(b.stepFor([moved(3)], at));
  });

  it("does not throw when the instant is off the end of the calendar", () => {
    // It is called from the producer the socket's own callback reaches, where
    // an unhandled throw is a crashed process. `lastOpenedMarketSession`
    // propagates a `MarketCalendarRangeError` by design — the calendar covers
    // 2024–2028 — so the fallback is `marketDateAt`, which is a worse key and
    // not a wrong one: nothing survives the night either way.
    const ratchet = createSectorLadderRatchet();
    expect(ratchet.stepFor([moved(0.4)], midSession("2031-03-04"))).toBe(1);
    expect(ratchet.held()?.session).toBe("2031-03-04");
  });
});
