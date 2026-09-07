import { describe, expect, expectTypeOf, it } from "vitest";

import type { Bar, Timeframe } from "./bar.js";
import { TIMEFRAMES } from "./bar.js";

describe("TIMEFRAMES", () => {
  it("is exactly the two intervals a caller may ask for", () => {
    // Two members is the decision rather than a starting point (PROVIDER.md
    // §9.4). A third arriving without a named reader should fail here and be
    // argued for, not merely typecheck.
    expect(TIMEFRAMES).toStrictEqual(["1m", "1d"]);
  });

  it("does not express aggregation", () => {
    // A caller cannot ask for 5-minute bars: Epic 5 computes those from stored
    // minute bars, because Epic 13's replay has to reconstruct them from what
    // was stored anyway, and because provider-side and our-side aggregation
    // disagree at a session boundary.
    expect(TIMEFRAMES).not.toContain("5m");
  });

  it("uses our vocabulary rather than a vendor's", () => {
    // A closed union of our own names is what makes a typo a compile error and
    // what lets the fixture provider and Story 2.7's client be checked against
    // one set. Vendor spellings must not leak in as members.
    for (const timeframe of TIMEFRAMES) {
      expect(timeframe).toMatch(/^[0-9]+[md]$/);
    }
  });
});

describe("Bar", () => {
  it("has six fields and no more", () => {
    // Every field here is a column in Story 2.8's ~10-million-row table and a
    // property in Story 2.9's contract, so the count is asserted rather than
    // left to review. VWAP and trade count were declined with named triggers.
    const bar: Bar = {
      startsAt: new Date("2026-09-04T13:30:00Z"),
      open: 123.45,
      high: 124.0,
      low: 123.1,
      close: 123.9,
      volume: 41_200,
    };

    expect(Object.keys(bar).sort()).toStrictEqual([
      "close",
      "high",
      "low",
      "open",
      "startsAt",
      "volume",
    ]);
  });

  it("names the timestamp for the end of the interval it marks", () => {
    // The field NAME is the mechanism (PROVIDER.md §9.2): a one-minute
    // systematic error is invisible on a chart and wrong in every anomaly
    // calculation, so `timestamp` — which says nothing — must not creep back.
    expectTypeOf<Bar>().toHaveProperty("startsAt");
    expectTypeOf<Bar>().not.toHaveProperty("timestamp");
  });

  it("carries neither the symbol nor the timeframe", () => {
    // Both are properties of the SERIES (Task 2.6.3). A bar carrying either is
    // ten million copies of one constant, in the table and on the wire.
    expectTypeOf<Bar>().not.toHaveProperty("symbol");
    expectTypeOf<Bar>().not.toHaveProperty("timeframe");
  });

  it("carries prices as numbers rather than strings", () => {
    // PROVIDER.md §9.5. `pg` hands a `numeric` to JavaScript as a string, so
    // this is a real choice and the mapper is where the conversion happens —
    // once, beside the query. The guard that comes with it is prose and nothing
    // checks it: an aggregate over prices is computed in SQL over `numeric`,
    // never in JavaScript over this type.
    expectTypeOf<Bar["close"]>().toEqualTypeOf<number>();
    expectTypeOf<Bar["volume"]>().toEqualTypeOf<number>();
  });
});

describe("Timeframe", () => {
  it("is the union of TIMEFRAMES' members", () => {
    expectTypeOf<Timeframe>().toEqualTypeOf<"1m" | "1d">();
  });
});
