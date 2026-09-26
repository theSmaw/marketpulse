import { describe, expect, it } from "vitest";

import type {
  Bar,
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";

import { marketProxyStrip } from "./market-proxies.js";

const frame = (figures: readonly WireOverviewFigure[]): WireMarketOverview => ({
  computedAt: "2026-09-25T18:01:00.000Z",
  feeds: [],
  figures,
});

// `exactOptionalPropertyTypes` is on, so the overrides are spelled with an
// explicit `| undefined` rather than as `Partial<…>`: "absent" and "present as
// `undefined`" are different types, and here the tests want the second — an
// omitted `changePercent` is the state the wire actually produces.
const observed = (
  symbol: string,
  overrides: {
    readonly at?: string;
    readonly price?: number;
    readonly changePercent?: number | undefined;
    readonly changeBasis?: string | undefined;
  } = {},
): WireOverviewFigure => {
  const changePercent =
    "changePercent" in overrides ? overrides.changePercent : 0.42;
  const changeBasis =
    "changeBasis" in overrides ? overrides.changeBasis : "2026-09-24";

  // Built in branches rather than with optional fields, which is what
  // `exactOptionalPropertyTypes` costs and is also what it buys: the absent
  // case here is genuinely a **missing key** on the wire, not a key holding
  // `undefined`, and the compiler holds the difference.
  return {
    state: "observed",
    symbol,
    at: overrides.at ?? "2026-09-25T18:01:00.000Z",
    price: overrides.price ?? 774.03,
    ...(changePercent === undefined ? {} : { changePercent }),
    ...(changeBasis === undefined ? {} : { changeBasis }),
  };
};

const bar = (close: number, volume = 100): Bar => ({
  startsAt: new Date("2026-09-25T18:01:00.000Z"),
  open: close,
  high: close,
  low: close,
  close,
  volume,
});

const NO_OBSERVATIONS = new Map<string, Bar>();
const NO_SNAPSHOT = new Set<string>();

describe("marketProxyStrip", () => {
  it("renders the frame's securities in the frame's own order", () => {
    const strip = marketProxyStrip(
      frame([
        observed("SPY"),
        observed("QQQ"),
        observed("DIA"),
        observed("IWM"),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    // **Never sorted.** The order is the seam's answer and the browser renders
    // what it is given — a component that sorted would be a second opinion
    // about §6.
    expect(strip.cells.map((cell) => cell.symbol)).toEqual([
      "SPY",
      "QQQ",
      "DIA",
      "IWM",
    ]);
  });

  it("formats the change the wire carried and derives no percentage of its own", () => {
    const strip = marketProxyStrip(
      frame([observed("SPY", { changePercent: -0.18 })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    const [cell] = strip.cells;
    expect(cell?.reading).toMatchObject({
      kind: "observed",
      price: "774.03",
      change: { change: "−0.18%", direction: "negative" },
    });
  });

  it("omits the change when the frame carried none", () => {
    // ADR 0029: a clause renders only when its own data is present. A price
    // with no basis is one fact missing from an entry that has the other, and
    // `0.00%` would be a claim nobody made.
    const strip = marketProxyStrip(
      frame([observed("SPY", { changePercent: undefined })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.cells[0]?.reading).toMatchObject({
      kind: "observed",
      change: undefined,
    });
  });

  it("marks a proxy behind the newest observation with its instant, and no verdict", () => {
    const strip = marketProxyStrip(
      frame([
        observed("SPY"),
        observed("DIA", { at: "2026-09-25T16:07:00.000Z" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.cells[0]?.reading).toMatchObject({ note: undefined });
    expect(strip.cells[1]?.reading).toMatchObject({ note: "from 12:07" });
  });

  it("carries a stored close's own session, which never travels without it", () => {
    const strip = marketProxyStrip(
      frame([
        {
          state: "stored",
          symbol: "SPY",
          session: "2026-09-11",
          close: 764.29,
        },
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.cells[0]?.reading).toEqual({
      kind: "stored",
      price: "764.29",
      note: "2026-09-11",
    });
  });

  it("reports nothing stored when every figure is unknown — CI's state", () => {
    const strip = marketProxyStrip(
      frame([
        { state: "unknown", symbol: "SPY" },
        { state: "unknown", symbol: "QQQ" },
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.nothingStored).toBe(true);
    expect(strip.qualifier).toBeUndefined();
    expect(strip.cells[0]?.reading).toEqual({ kind: "unknown" });
  });

  it("makes no shared claim while nothing has been observed", () => {
    // The absolute staleness rule is Task 4.2.6's. Until it exists, a strip
    // with no observation states no instant — every cell carries its own
    // session instead.
    const strip = marketProxyStrip(
      frame([
        {
          state: "stored",
          symbol: "SPY",
          session: "2026-09-11",
          close: 764.29,
        },
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBeUndefined();
    expect(strip.nothingStored).toBe(false);
  });

  it("builds the shared line from the newest observation, with its basis", () => {
    const strip = marketProxyStrip(
      frame([
        observed("DIA", { at: "2026-09-25T16:07:00.000Z" }),
        observed("SPY", { changeBasis: "2026-09-24" }),
      ]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 14:01 EDT · change from 2026-09-24's close",
    );
  });

  it("says 'the previous close' when the basis has no session name", () => {
    // `LiveChange.basis`'s own absence: the same-session case measures from
    // `previousClose`, a number with no date beside it.
    const strip = marketProxyStrip(
      frame([observed("SPY", { changeBasis: undefined })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 14:01 EDT · change from the previous close",
    );
  });

  it("marks a price from outside the regular session with the shipped word", () => {
    const strip = marketProxyStrip(
      frame([observed("SPY", { at: "2026-09-25T11:42:00.000Z" })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBe(
      "Sep 25 · 07:42 EDT · pre-market · change from 2026-09-24's close",
    );
  });

  it("skips an instant it cannot read rather than printing Invalid Date", () => {
    // `Date.parse` returns NaN, `new Date(NaN)` formats without complaining,
    // and those two words reach a qualifier. `live-feed.ts` owns the same rule
    // one layer up.
    const strip = marketProxyStrip(
      frame([observed("SPY", { at: "not an instant" })]),
      NO_OBSERVATIONS,
      NO_SNAPSHOT,
    );

    expect(strip.qualifier).toBeUndefined();
    expect(strip.cells[0]?.reading).toMatchObject({ note: undefined });
  });

  it("keys the mark on the socket's observation, and not on the aggregate", () => {
    const strip = marketProxyStrip(
      frame([observed("SPY"), observed("QQQ")]),
      new Map([
        ["SPY", bar(774.03)],
        ["QQQ", bar(601.88)],
      ]),
      new Set(["QQQ"]),
    );

    // A snapshot is not an arrival — which is what stops four marks firing on
    // first paint, announcing as news the thing the reader has just asked to
    // see.
    expect(strip.cells[0]?.arrival).toBeDefined();
    expect(strip.cells[1]?.arrival).toBeUndefined();
  });

  it("gives a corrected bar a different key, so the decay restarts", () => {
    const before = marketProxyStrip(
      frame([observed("SPY")]),
      new Map([["SPY", bar(774.03)]]),
      NO_SNAPSHOT,
    );
    const after = marketProxyStrip(
      frame([observed("SPY")]),
      new Map([["SPY", bar(774.09)]]),
      NO_SNAPSHOT,
    );

    expect(after.cells[0]?.arrival).not.toBe(before.cells[0]?.arrival);
  });
});
