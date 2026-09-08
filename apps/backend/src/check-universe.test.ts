/**
 * Tests for the universe check (Task 2.7.8).
 *
 * Every one of these drives {@link compareUniverseToVendor} and
 * {@link summariseUniverseCheck}, which are pure and take both sides as
 * parameters — so the fast suite can hand them catalogues the real vendor does
 * not currently produce. **Two of the four findings have no instance in the
 * shipping universe**, and this is the only place they can be made to happen at
 * all; watching a check *not* fire is not evidence that it works, which is the
 * trap Task 2.5.3 recorded and Task 2.3.5 designed `validateUniverse`'s
 * signature around.
 */

import { describe, expect, it } from "vitest";

import type { AlpacaAsset } from "./alpaca-assets.js";
import {
  compareUniverseToVendor,
  summariseUniverseCheck,
} from "./check-universe.js";
import type { Security } from "@marketpulse/shared";
import { toTicker } from "@marketpulse/shared";

function security(symbol: string, exchange = "NASDAQ"): Security {
  return {
    kind: "equity",
    symbol: toTicker(symbol),
    name: `${symbol} Inc.`,
    exchange,
    sector: "technology",
    industry: "Semiconductors",
    status: "active",
    cik: null,
  };
}

function asset(
  symbol: string,
  overrides: Partial<AlpacaAsset> = {},
): AlpacaAsset {
  return {
    id: `id-${symbol}`,
    symbol,
    name: `${symbol} Inc.`,
    exchange: "NASDAQ",
    status: "active",
    tradable: true,
    ...overrides,
  };
}

describe("compareUniverseToVendor", () => {
  it("finds nothing when the file and the vendor agree", () => {
    expect(
      compareUniverseToVendor([security("NVDA")], [asset("NVDA")], []),
    ).toEqual([]);
  });

  it("reports a tracked symbol the vendor no longer lists as active", () => {
    expect(
      compareUniverseToVendor(
        [security("RTN")],
        [],
        [asset("RTN", { name: "Raytheon Company", status: "inactive" })],
      ),
    ).toEqual([
      { kind: "not-active", symbol: "RTN", vendorName: "Raytheon Company" },
    ]);
  });

  // Different from `not-active`, and reported separately because the fix is
  // different. Produced against the real vendor by `SQ` and `ANTM`, which 404.
  it("reports a tracked symbol the vendor has never heard of", () => {
    expect(compareUniverseToVendor([security("SQ")], [], [])).toEqual([
      { kind: "unknown-to-vendor", symbol: "SQ" },
    ]);
  });

  // The one finding with a real instance on the day this shipped: WMT.
  it("reports a listing venue that has moved", () => {
    expect(
      compareUniverseToVendor(
        [security("WMT", "NYSE")],
        [asset("WMT", { exchange: "NASDAQ" })],
        [],
      ),
    ).toEqual([
      { kind: "exchange-drift", symbol: "WMT", ours: "NYSE", theirs: "NASDAQ" },
    ]);
  });

  // No instance in our universe, 229 in the market. The `FB` case: the ticker
  // is active for one company and retired for another.
  it("reports a ticker that has been recycled from another company", () => {
    expect(
      compareUniverseToVendor(
        [security("FB")],
        [asset("FB", { name: "ProShares S&P 500 Dynamic Buffer ETF" })],
        [asset("FB", { name: "Meta Platforms, Inc.", status: "inactive" })],
      ),
    ).toEqual([
      {
        kind: "recycled-ticker",
        symbol: "FB",
        previousName: "Meta Platforms, Inc.",
      },
    ]);
  });

  // The distinction that keeps the recycled check from firing on every symbol:
  // a symbol may hold a retired row for *itself* — a re-listing rather than a
  // recycling — and that is not a finding.
  it("does not call a re-listing under the same name a recycled ticker", () => {
    expect(
      compareUniverseToVendor(
        [security("NVDA")],
        [asset("NVDA")],
        [asset("NVDA", { status: "inactive", id: "id-old" })],
      ),
    ).toEqual([]);
  });

  it("reports every finding rather than stopping at the first", () => {
    const findings = compareUniverseToVendor(
      [security("WMT", "NYSE"), security("SQ"), security("RTN")],
      [asset("WMT", { exchange: "NASDAQ" })],
      [asset("RTN", { status: "inactive" })],
    );

    expect(findings.map((finding) => finding.kind).sort()).toEqual([
      "exchange-drift",
      "not-active",
      "unknown-to-vendor",
    ]);
  });

  // The vendor's names are house style — 64 of 101 differ against the real
  // catalogue and none is substantive. Comparing them makes the report noise.
  it("does not compare names", () => {
    expect(
      compareUniverseToVendor(
        [security("XLK")],
        [asset("XLK", { name: "State Street Technology Select Sector ETF" })],
        [],
      ),
    ).toEqual([]);
  });
});

describe("summariseUniverseCheck", () => {
  // The decision, asserted rather than remembered: a finding is input to a
  // human editing step, not a fault, so it must not change the exit code.
  it("exits 0 whether or not it found something", () => {
    expect(summariseUniverseCheck(101, []).exitCode).toBe(0);
    expect(
      summariseUniverseCheck(101, [{ kind: "unknown-to-vendor", symbol: "SQ" }])
        .exitCode,
    ).toBe(0);
  });

  it("says plainly when there is nothing to look at", () => {
    const outcome = summariseUniverseCheck(101, []);
    expect(outcome.lines.join("\n")).toContain("Nothing to look at");
    expect(outcome.errors).toEqual([]);
  });

  it("names every symbol it found and says nothing was written", () => {
    const rendered = summariseUniverseCheck(101, [
      { kind: "not-active", symbol: "RTN", vendorName: "Raytheon Company" },
      { kind: "exchange-drift", symbol: "WMT", ours: "NYSE", theirs: "NASDAQ" },
    ]).lines.join("\n");

    expect(rendered).toContain("RTN");
    expect(rendered).toContain("WMT");
    expect(rendered).toContain("file says NYSE, vendor says NASDAQ");
    expect(rendered).toContain("Nothing was written");
  });

  // A candidate is not a verdict, and the report has to say so where it is
  // read — 8% of the vendor's `inactive` rows were still printing bars.
  it("says a no-longer-active symbol is a candidate rather than a verdict", () => {
    const rendered = summariseUniverseCheck(101, [
      { kind: "not-active", symbol: "RTN", vendorName: "Raytheon Company" },
    ]).lines.join("\n");

    expect(rendered).toContain("CANDIDATE and not a verdict");
  });
});
