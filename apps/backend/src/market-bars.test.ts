// The parse, driven without a socket (Task 2.8.4).
//
// `toBar` is a pure function over a row, so it belongs in the **fast** suite —
// `toSecurity`'s precedent, and the reason both are exported. What it checks is
// the one thing `migrations/README.md` §4 calls "not optional": `pg` hands a
// `numeric` and a `bigint` to JavaScript as strings, and the gap between a row
// and a `Bar` is therefore a parse rather than a copy.
//
// Everything that needs a real server — idempotence, the ledger, the
// transaction, the chunk boundary — is in `market-bars.database.test.ts`, which
// keeps this suite buildless and offline.
//
// **Task 2.9.4 added a second pure function to this file, and it is the more
// interesting one.** `toStoredSeries` decides what a served series *claims*:
// where it says it came from, when it says it was fetched, and how far it says
// it reaches. Every one of those is a decision rather than a copy, and a
// decision only exercisable through a database is a decision nobody exercises.

import { describe, expect, it } from "vitest";

import {
  toTicker,
  toTimeRange,
  type Ticker,
  type TimeRange,
} from "@marketpulse/shared";

import {
  BarMappingError,
  MissingCoverageError,
  toBar,
  toStoredSeries,
  type BarCoverage,
  type BarRow,
  type DatedBarRow,
  type SeriesSource,
} from "./market-bars.js";

const ROW: BarRow = {
  observed_at: new Date("2026-09-03T13:30:00.000Z"),
  open: "189.234500",
  high: "190.000000",
  low: "188.750000",
  close: "189.900000",
  volume: "1234567",
};

describe("toBar", () => {
  it("parses every numeric column into a number", () => {
    const bar = toBar(ROW);

    // The assertion that matters is the *type*, not the value: a mapper that
    // copied the column across would produce a `Bar` whose `close` renders on a
    // chart axis, sorts as a string and fails no test that did not think to
    // check this.
    for (const value of [bar.open, bar.high, bar.low, bar.close, bar.volume]) {
      expect(typeof value).toBe("number");
    }

    expect(bar.open).toBe(189.2345);
    expect(bar.close).toBe(189.9);
    expect(bar.volume).toBe(1234567);
  });

  it("maps observed_at to startsAt, and carries no other timestamp", () => {
    // `observed_at` and `recorded_at` are the same Postgres type and mean
    // opposite things (`migrations/README.md` §2). A `Bar` has one instant and
    // it is the market's, so `recorded_at` is not in {@link BarRow} at all —
    // which is the structural half of a rule the document says only review can
    // check.
    const bar = toBar(ROW);

    expect(bar.startsAt).toBe(ROW.observed_at);
    expect(Object.keys(bar).sort()).toEqual(
      ["close", "high", "low", "open", "startsAt", "volume"].sort(),
    );
  });

  it("refuses a row whose price is not a number, naming the column", () => {
    // It cannot happen — every column is `not null` and typed — and that is not
    // a reason to leave it undefined. The two answers available were "a
    // `NaN` that propagates into an anomaly score" and this.
    expect(() => toBar({ ...ROW, close: "not a number" })).toThrow(
      BarMappingError,
    );
    expect(() => toBar({ ...ROW, close: "not a number" })).toThrow(/close/);
  });

  it("refuses a NaN and a blank, because a blank parses to zero", () => {
    // The blank is the one worth a test of its own: `Number("")` is **0**, so a
    // parse written on `isFinite` alone turns an empty column into a zero
    // price — the one wrong answer here that renders, sorts and charts exactly
    // like a real one.
    expect(() => toBar({ ...ROW, volume: "NaN" })).toThrow(BarMappingError);
    expect(() => toBar({ ...ROW, open: "" })).toThrow(BarMappingError);
    expect(() => toBar({ ...ROW, open: "   " })).toThrow(BarMappingError);
  });
});

// --- Task 2.9.4 -------------------------------------------------------------

const SYMBOL: Ticker = toTicker("NVDA");

/** One regular session, in UTC, which is what the store holds. */
const SESSION: TimeRange = toTimeRange(
  new Date("2026-09-04T13:30:00.000Z"),
  new Date("2026-09-04T20:00:00.000Z"),
);

/** A row at a minute of that session, written at `recordedAt`. */
function rowAt(minute: number, recordedAt: string): DatedBarRow {
  return {
    observed_at: new Date(SESSION.start.getTime() + minute * 60_000),
    open: "100.000000",
    high: "101.000000",
    low: "99.000000",
    close: "100.500000",
    volume: "1000",
    recorded_at: new Date(recordedAt),
  };
}

const STORED_SOURCE: SeriesSource = { provider: "alpaca", feed: "sip" };

function coverage(
  covered: TimeRange,
  barCount: number,
  source: SeriesSource = STORED_SOURCE,
): BarCoverage {
  return {
    symbol: SYMBOL,
    timeframe: "1m",
    covered,
    source,
    barCount,
    updatedAt: new Date("2026-09-08T10:00:00.000Z"),
  };
}

const NOW = new Date("2026-09-09T12:00:00.000Z");

describe("toStoredSeries", () => {
  it("takes provider and feed from the ledger, not from a constant", () => {
    // `0004_market_bars.sql` holds no `provider` and no `feed`, and a series
    // cannot exist without them. This is the whole of Task 2.9.4's central
    // problem in one assertion — and the answer is a stored fact rather than an
    // assertion at this boundary, because a store holding fixture bars is
    // something this repository creates on purpose.
    const series = toStoredSeries({
      symbol: SYMBOL,
      timeframe: "1m",
      requested: SESSION,
      rows: [rowAt(0, "2026-09-08T07:28:40.000Z")],
      held: coverage(SESSION, 1),
      now: NOW,
    });

    const [source, ...rest] = series.provenance.sources;
    expect(rest).toEqual([]);
    expect(source.provider).toBe(STORED_SOURCE.provider);
    expect(source.feed).toBe(STORED_SOURCE.feed);
    expect(source.barCount).toBe(1);
    // The store holds what happened and never rewrites a bar for a corporate
    // action; `market-provenance.ts` names it as `raw`'s reader in terms.
    expect(series.provenance.adjustment).toBe("raw");
  });

  it("takes retrievedAt from the OLDEST batch in the window, not from now", () => {
    // The trap this is here to catch: a read path that stamps `retrievedAt`
    // when it serves stored bars turns "fetched three weeks ago" into "current"
    // — permanently silent about the one thing the field exists to report. Task
    // 2.3.5 already found this once with a `now()` default.
    //
    // `min` and not `max` because a window can span several batches (six, over
    // 13 seconds, for five sessions of NVDA on the local store) and a
    // single-source record has one timestamp for all of them. `max` understates
    // the staleness of everything but the newest batch.
    const series = toStoredSeries({
      symbol: SYMBOL,
      timeframe: "1m",
      requested: SESSION,
      rows: [
        rowAt(0, "2026-09-08T07:28:53.000Z"),
        rowAt(1, "2026-09-08T07:28:40.000Z"),
        rowAt(2, "2026-09-08T07:28:47.000Z"),
      ],
      held: coverage(SESSION, 3),
      now: NOW,
    });

    const [source] = series.provenance.sources;
    expect(source.retrievedAt).toBe("2026-09-08T07:28:40.000Z");
    expect(source.retrievedAt).not.toBe(NOW.toISOString());
  });

  it("covers the intersection of the request with the ledger, not the bars", () => {
    // The distinction is `BarCoverage.covered`'s own: how far the answer
    // reaches, not whether it is dense. Task 2.8.5 measured that only 8 of 28
    // S&P 500 constituents print a full 390 minutes, so a covered range derived
    // from the bars would report a thin name's quiet hour as a partial answer.
    const held = toTimeRange(
      SESSION.start,
      new Date("2026-09-04T18:00:00.000Z"),
    );

    const series = toStoredSeries({
      symbol: SYMBOL,
      timeframe: "1m",
      requested: SESSION,
      // One bar, early in the session. The answer still covers to 18:00.
      rows: [rowAt(0, "2026-09-08T07:28:40.000Z")],
      held: coverage(held, 1),
      now: NOW,
    });

    expect(series.coverage.covered?.start).toEqual(SESSION.start);
    expect(series.coverage.covered?.end).toEqual(held.end);
    expect(series.coverage.requested).toEqual(SESSION);
  });

  it("never claims more than was asked for", () => {
    // The ledger routinely covers far more than one request. `toBarSeries`
    // refuses a covered range reaching outside the requested one, so getting
    // this wrong is loud rather than subtle — which is the point of building
    // through the constructor rather than writing the object.
    const wide = toTimeRange(
      new Date("2025-09-08T13:30:00.000Z"),
      new Date("2026-09-04T20:00:00.000Z"),
    );
    const narrow = toTimeRange(
      SESSION.start,
      new Date("2026-09-04T14:00:00.000Z"),
    );

    const series = toStoredSeries({
      symbol: SYMBOL,
      timeframe: "1m",
      requested: narrow,
      rows: [rowAt(0, "2026-09-08T07:28:40.000Z")],
      held: coverage(wide, 97_530),
      now: NOW,
    });

    expect(series.coverage.covered).toEqual(narrow);
  });

  it("answers an empty window with a null covered range and a zero-bar source", () => {
    // `covered: null` and never a zero-width range — `toTimeRange` refuses one
    // anyway, and Task 2.9.3 measured that the serialiser renders a carelessly
    // declared nullable as an empty value that reads as a covered window.
    const series = toStoredSeries({
      symbol: SYMBOL,
      timeframe: "1m",
      requested: SESSION,
      rows: [],
      held: coverage(SESSION, 0),
      now: NOW,
    });

    expect(series.bars).toEqual([]);
    expect(series.coverage.covered).toBeNull();
    expect(series.coverage.requested).toEqual(SESSION);

    // The one branch that uses `now`, and it is not the trap above: a retrieval
    // timestamp attached to zero bars can misdate nothing, and what it states
    // — as of this instant we looked and held nothing — is true. The rejected
    // alternative was the ledger's `updatedAt`, which would attribute a real
    // past retrieval to an answer containing none of it.
    const [source] = series.provenance.sources;
    expect(source.barCount).toBe(0);
    expect(source.retrievedAt).toBe(NOW.toISOString());
    expect(source.retrievedAt).not.toBe(
      coverage(SESSION, 0).updatedAt.toISOString(),
    );
  });

  it("answers a symbol we hold nothing for with an empty series, not a throw", () => {
    // No ledger row and no bars. It is a 200 with an empty series, and telling
    // it from "nothing traded in this window" is what the ledger row beside the
    // series is for. A 404 here would be about the data rather than the
    // security, which `MARKET-DATA-API.md` §6 refuses in terms.
    const series = toStoredSeries({
      symbol: SYMBOL,
      timeframe: "1m",
      requested: SESSION,
      rows: [],
      held: undefined,
      now: NOW,
    });

    expect(series.bars).toEqual([]);
    expect(series.coverage.covered).toBeNull();
  });

  it("reports a fixture-backed store as fixture, which is why this is stored", () => {
    // The measurement that decided it: `backfill.database.test.ts` drives the
    // shipped backfill with the fixture provider into a real database, so a
    // store holding invented prices is a thing this repository creates on
    // purpose. A constant asserting `alpaca`/`sip` at this boundary would label
    // those prices as the full US consolidated tape on a chart —
    // `MARKET_FEED_DESCRIPTIONS.synthetic` exists so a fixture-backed screen
    // says "Generated test data. Not a market feed." instead.
    const series = toStoredSeries({
      symbol: SYMBOL,
      timeframe: "1m",
      requested: SESSION,
      rows: [rowAt(0, "2026-09-08T07:28:40.000Z")],
      held: coverage(SESSION, 1, { provider: "fixture", feed: "synthetic" }),
      now: NOW,
    });

    const [source] = series.provenance.sources;
    expect(source.provider).toBe("fixture");
    expect(source.feed).toBe("synthetic");
  });

  it("refuses to invent a covered range for bars the ledger does not claim", () => {
    // Unreachable through `recordSeries`, which writes both in one transaction.
    // Reachable by deleting from `bar_coverage` alone — one of the two silent
    // failures this module exists to prevent — and the alternatives are both
    // false claims: derive the range from the bars, or claim the whole request.
    expect(() =>
      toStoredSeries({
        symbol: SYMBOL,
        timeframe: "1m",
        requested: SESSION,
        rows: [rowAt(0, "2026-09-08T07:28:40.000Z")],
        held: undefined,
        now: NOW,
      }),
    ).toThrow(MissingCoverageError);
  });
});
