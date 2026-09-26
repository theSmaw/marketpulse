import { toMarketDate, toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  buildMarketOverview,
  toWireMarketOverview,
} from "./market-overview.js";

import type {
  Bar,
  BarSource,
  MarketDate,
  SecurityLastClose,
  Ticker,
  WireMarketOverview,
} from "@marketpulse/shared";
import type { CurrentObservation } from "./current-market-state.js";
import type { MarketOverviewEntry } from "./market-overview.js";

// **No Fastify instance, no database, no clock, and that is the assertion
// rather than the setup** (Done-when 2). Every input this module reads is an
// argument, which is what makes invariant 4 a property of its shape: a
// function that reads nothing cannot read something timestamped after a
// replay clock.

const SPY = toTicker("SPY");
const QQQ = toTicker("QQQ");
const DIA = toTicker("DIA");

/**
 * **17:00Z is 13:00 in New York on both sides of the DST boundary**, so a
 * date written here is the market session it reads as.
 */
const duringSession = (date: string): Date => new Date(`${date}T17:00:00.000Z`);

const source: BarSource = {
  provider: "alpaca",
  feed: "iex",
  retrievedAt: "2026-09-14T17:00:00.000Z",
  barCount: 1,
};

function bar(close: number, startsAt: Date): Bar {
  return { startsAt, open: close, high: close, low: close, close, volume: 100 };
}

function observation(symbol: Ticker, held: Bar): CurrentObservation {
  return { symbol, bar: held, source, ageMs: 1_000 };
}

function storedClose(
  symbol: Ticker,
  over: {
    readonly close: number;
    readonly session: string;
    readonly previousClose?: number | null;
  },
): SecurityLastClose {
  return {
    symbol,
    session: toMarketDate(over.session),
    close: over.close,
    previousClose: over.previousClose ?? null,
  };
}

const ASOF = new Date("2026-09-14T17:00:00.000Z");

const closesOf = (
  ...records: readonly SecurityLastClose[]
): ReadonlyMap<Ticker, SecurityLastClose> =>
  new Map(records.map((record) => [toTicker(record.symbol), record]));

describe("buildMarketOverview", () => {
  it("joins a live observation to the previous session's stored close", () => {
    const [entry] = buildMarketOverview({
      symbols: [SPY],
      observations: new Map([
        [SPY, observation(SPY, bar(605.5, duringSession("2026-09-14")))],
      ]),
      closesAsOf: () =>
        closesOf(storedClose(SPY, { close: 600, session: "2026-09-11" })),
      asOf: duringSession("2026-09-14"),
    });

    expect(entry?.state).toBe("live");
    if (entry?.state !== "live") throw new Error("expected a live entry");

    expect(entry.bar.close).toBe(605.5);
    expect(entry.change.percent).toBeCloseTo(0.9167, 4);
    expect(entry.change.basis).toBe("2026-09-11");
  });

  // **The branch the arithmetic exists for, reaching this process for the
  // first time.** The nightly backfill writes today, so after it the store's
  // last session and the live bar's session meet; measuring against
  // `close.close` would report ≈0.00% for every security. `changeFromClose`
  // falls back to `previousClose`, and this test is what proves the backend
  // calls it rather than subtracting for itself.
  it("measures from the session before when the stored close is today's", () => {
    const [entry] = buildMarketOverview({
      symbols: [SPY],
      observations: new Map([
        [SPY, observation(SPY, bar(606, duringSession("2026-09-14")))],
      ]),
      closesAsOf: () =>
        closesOf(
          storedClose(SPY, {
            close: 604,
            session: "2026-09-14",
            previousClose: 600,
          }),
        ),
      asOf: duringSession("2026-09-14"),
    });

    if (entry?.state !== "live") throw new Error("expected a live entry");

    expect(entry.change.percent).toBeCloseTo(1, 10);
    // No session name on the wire for a `previousClose`, so the honest answer
    // is `null` and the caller renders *the previous close*.
    expect(entry.change.basis).toBeNull();
  });

  // Done-when 4, first half. A live price with nothing to measure it against
  // is still a live price; what is absent is the figure, spelled as an
  // absence rather than as a zero.
  it("reports a live price with no figure when no close is stored", () => {
    const [entry] = buildMarketOverview({
      symbols: [SPY],
      observations: new Map([
        [SPY, observation(SPY, bar(605.5, duringSession("2026-09-14")))],
      ]),
      closesAsOf: () => new Map(),
      asOf: duringSession("2026-09-14"),
    });

    if (entry?.state !== "live") throw new Error("expected a live entry");

    expect(entry.bar.close).toBe(605.5);
    expect(entry.change).toEqual({ percent: null, basis: null });
  });

  // Done-when 4, second half — and the two absences are told apart by the
  // DISCRIMINANT rather than by a null price, which is the point.
  it("distinguishes nothing-observed from nothing-known-at-all", () => {
    const entries = buildMarketOverview({
      symbols: [QQQ, DIA],
      observations: new Map(),
      closesAsOf: () =>
        closesOf(storedClose(QQQ, { close: 540, session: "2026-09-11" })),
      asOf: duringSession("2026-09-14"),
    });

    expect(entries.map((entry) => entry.state)).toEqual(["stored", "unknown"]);

    const [heard] = entries;
    if (heard?.state !== "stored") throw new Error("expected a stored entry");

    // The close arrives with its own session, so no renderer can show the
    // number without the date it belongs to.
    expect(heard.close.session).toBe("2026-09-11");
  });

  // CI's store: 518 securities and zero bars, with nothing observed either.
  it("answers `unknown` for every symbol when it knows nothing", () => {
    const entries = buildMarketOverview({
      symbols: [SPY, QQQ, DIA],
      observations: new Map(),
      closesAsOf: () => new Map(),
      asOf: duringSession("2026-09-14"),
    });

    expect(entries).toEqual([
      { state: "unknown", symbol: SPY },
      { state: "unknown", symbol: QQQ },
      { state: "unknown", symbol: DIA },
    ]);
  });

  it("reports the symbols it was given, in the order it was given them", () => {
    const entries = buildMarketOverview({
      symbols: [DIA, SPY, QQQ],
      observations: new Map(),
      closesAsOf: () => new Map(),
      asOf: duringSession("2026-09-14"),
    });

    expect(entries.map((entry) => entry.symbol)).toEqual([DIA, SPY, QQQ]);
  });

  // **The `asOf` seam, asserted rather than described.** The lookup is asked
  // for a session, and the session is the market date of `asOf` — never the
  // machine's today. Epic 13 changes what the lookup does with the argument;
  // this test is what proves the argument reaches it.
  it("asks the closes lookup for the market session `asOf` falls in", () => {
    const asked: MarketDate[] = [];

    buildMarketOverview({
      symbols: [SPY],
      observations: new Map(),
      closesAsOf: (session) => {
        asked.push(session);
        return new Map();
      },
      // 00:30Z on the 15th is 20:30 on the 14th in New York, so a
      // UTC-flavoured implementation would ask for the wrong session here.
      asOf: new Date("2026-09-15T00:30:00.000Z"),
    });

    expect(asked).toEqual(["2026-09-14"]);
  });

  it("holds no state between calls", () => {
    const inputs = {
      symbols: [SPY],
      observations: new Map([
        [SPY, observation(SPY, bar(605.5, duringSession("2026-09-14")))],
      ]),
      closesAsOf: () =>
        closesOf(storedClose(SPY, { close: 600, session: "2026-09-11" })),
      asOf: duringSession("2026-09-14"),
    };

    expect(buildMarketOverview(inputs)).toEqual(buildMarketOverview(inputs));
  });

  // Provenance travels per observation, because invariant 6 is displayed and
  // never implied — a live bar is IEX and a stored close is the consolidated
  // tape, and the aggregate must not flatten the difference.
  it("carries each observation's own provenance", () => {
    const [entry] = buildMarketOverview({
      symbols: [SPY],
      observations: new Map([
        [SPY, observation(SPY, bar(605.5, duringSession("2026-09-14")))],
      ]),
      closesAsOf: () => new Map(),
      asOf: duringSession("2026-09-14"),
    });

    if (entry?.state !== "live") throw new Error("expected a live entry");
    expect(entry.source).toEqual(source);
  });
});

// ------------------------------------------- the wire conversion (Task 4.2.4)

describe("toWireMarketOverview", () => {
  const overview = (
    entries: readonly MarketOverviewEntry[],
  ): WireMarketOverview => toWireMarketOverview(entries, ASOF);

  it("carries NEITHER of the things the figures were derived from", () => {
    // **ADR 0031's obligation, asserted where it is at risk.** The backend
    // holds a `LiveObservation` with a provider, a retrieval instant and an
    // age computed on read, and a `SecurityLastClose` whose `previousClose`
    // is *the answer to measure from what* rather than a price anybody should
    // render. On a socket nothing strips an undeclared field.
    const wire = overview(
      buildMarketOverview({
        symbols: [SPY, QQQ],
        observations: new Map([
          [SPY, observation(SPY, bar(605.5, duringSession("2026-09-14")))],
        ]),
        closesAsOf: () =>
          closesOf(
            storedClose(SPY, {
              close: 600,
              session: "2026-09-11",
              previousClose: 598,
            }),
            storedClose(QQQ, {
              close: 589.4,
              session: "2026-09-11",
              previousClose: 585,
            }),
          ),
        asOf: duringSession("2026-09-14"),
      }),
    );

    const json = JSON.stringify(wire);
    expect(json).not.toContain("previousClose");
    expect(json).not.toContain("retrievedAt");
    expect(json).not.toContain("ageMs");
    expect(json).not.toContain("provider");
    expect(json).not.toContain("barCount");
    // The bar's other five fields are not a price anybody asked for either.
    expect(json).not.toContain("volume");
    expect(json).not.toContain('"high"');
  });

  it("reports the three states in the order it was asked about them", () => {
    const wire = overview(
      buildMarketOverview({
        symbols: [SPY, QQQ, DIA],
        observations: new Map([
          [SPY, observation(SPY, bar(605.5, duringSession("2026-09-14")))],
        ]),
        closesAsOf: () =>
          closesOf(
            storedClose(SPY, { close: 600, session: "2026-09-11" }),
            storedClose(QQQ, { close: 589.4, session: "2026-09-11" }),
          ),
        asOf: duringSession("2026-09-14"),
      }),
    );

    expect(wire.figures).toEqual([
      {
        state: "observed",
        symbol: "SPY",
        at: duringSession("2026-09-14").toISOString(),
        price: 605.5,
        // The figure itself is `changeFromClose`'s and is asserted where
        // that function is; here the question is the shape and the order.
        changePercent: 0.9166666666666666,
        changeBasis: "2026-09-11",
      },
      { state: "stored", symbol: "QQQ", session: "2026-09-11", close: 589.4 },
      { state: "unknown", symbol: "DIA" },
    ]);
  });

  it("omits the change when there is no basis, rather than sending a zero", () => {
    const wire = overview(
      buildMarketOverview({
        symbols: [SPY],
        observations: new Map([
          [SPY, observation(SPY, bar(605.5, duringSession("2026-09-14")))],
        ]),
        closesAsOf: () => closesOf(),
        asOf: duringSession("2026-09-14"),
      }),
    );

    expect(wire.figures).toEqual([
      {
        state: "observed",
        symbol: "SPY",
        at: duringSession("2026-09-14").toISOString(),
        price: 605.5,
      },
    ]);
  });

  it("omits the basis when the same-session branch has no session to name", () => {
    // `changeFromClose` measures from `previousClose` and reports `basis:
    // null`, because `previousClose` is a number with no date beside it. A
    // date describing a figure measured from something else would be worse
    // than no date.
    const wire = overview(
      buildMarketOverview({
        symbols: [SPY],
        observations: new Map([
          [SPY, observation(SPY, bar(606, duringSession("2026-09-14")))],
        ]),
        closesAsOf: () =>
          closesOf(
            storedClose(SPY, {
              close: 604,
              session: "2026-09-14",
              previousClose: 600,
            }),
          ),
        asOf: duringSession("2026-09-14"),
      }),
    );

    const [figure] = wire.figures;
    expect(figure).toHaveProperty("changePercent");
    expect(figure).not.toHaveProperty("changeBasis");
  });

  it("names the tapes once per frame, for the OBSERVED figures only", () => {
    // Invariant 6 displayed rather than implied — and a stored close's tape
    // is not this frame's provenance, so it does not appear.
    const wire = overview(
      buildMarketOverview({
        symbols: [SPY, QQQ, DIA],
        observations: new Map([
          [SPY, observation(SPY, bar(605.5, duringSession("2026-09-14")))],
          [QQQ, observation(QQQ, bar(589.9, duringSession("2026-09-14")))],
        ]),
        closesAsOf: () =>
          closesOf(storedClose(DIA, { close: 445, session: "2026-09-11" })),
        asOf: duringSession("2026-09-14"),
      }),
    );

    expect(wire.feeds).toEqual(["iex"]);
  });

  it("is empty-but-true when nothing has been observed and nothing stored", () => {
    const wire = overview(
      buildMarketOverview({
        symbols: [SPY],
        observations: new Map(),
        closesAsOf: () => closesOf(),
        asOf: duringSession("2026-09-14"),
      }),
    );

    expect(wire.feeds).toEqual([]);
    expect(wire.figures).toEqual([{ state: "unknown", symbol: "SPY" }]);
  });

  it("dates the aggregate from `asOf` and not from a clock of its own", () => {
    // `computedAt` is when the aggregate was TRUE. It is the caller's instant
    // — the replay clock under a replay — because this module reads none.
    const wire = overview([]);
    expect(wire.computedAt).toBe(duringSession("2026-09-14").toISOString());
  });
});
