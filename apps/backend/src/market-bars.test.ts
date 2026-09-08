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

import { describe, expect, it } from "vitest";

import { BarMappingError, toBar, type BarRow } from "./market-bars.js";

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
