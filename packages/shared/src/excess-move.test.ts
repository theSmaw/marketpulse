import { describe, expect, it } from "vitest";

import {
  EXCESS_BASELINE_REFUSALS,
  EXCESS_FACTOR_REFUSALS,
  EXCESS_MOVE_INAPPLICABILITIES,
  excessMoveReference,
} from "./excess-move.js";
import { SECTORS, SECTOR_ETFS } from "./security.js";
import { toTicker } from "./ticker.js";
import type { Security } from "./security.js";

const EQUITY: Security = {
  symbol: toTicker("NVDA"),
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: "Semiconductors",
  status: "active",
  cik: null,
};

describe("the vocabularies", () => {
  it("has a factor list that is a SUPERSET of the stored one", () => {
    // The type-level half — `ExcessFactorRefusalIsASuperset` — fails `tsc -b`
    // and is the thing that cannot be forgotten. This is the value-level
    // corroboration: a member in the stored list and not the read one would be
    // a refusal the reader can never be told.
    for (const refusal of EXCESS_BASELINE_REFUSALS) {
      expect(EXCESS_FACTOR_REFUSALS).toContain(refusal);
    }
  });

  it("keeps the two legs' price breaks as TWO words", () => {
    // `0016` §5, and Story 5.5's hand-off item 3: *our history has a break* and
    // *the benchmark's does* are different sentences, repaired in different
    // places, and collapsing a pair like that throws away the only information
    // a reader could act on.
    expect(EXCESS_BASELINE_REFUSALS).toEqual([
      "split-discontinuity",
      "reference-split-discontinuity",
    ]);
  });

  it("has no member that reads as an ABSENCE rather than a refusal", () => {
    // `inapplicable` is a separate kind with a separate type, not a seventh
    // refusal word — a surface must not be able to print *unavailable* for a
    // question that does not arise.
    for (const inapplicability of EXCESS_MOVE_INAPPLICABILITIES) {
      expect(EXCESS_FACTOR_REFUSALS).not.toContain(inapplicability);
    }
  });
});

describe("excessMoveReference", () => {
  it("maps every equity sector to its benchmark through `SECTOR_ETFS`", () => {
    for (const sector of SECTORS) {
      const reference = excessMoveReference({ ...EQUITY, sector });

      expect(reference.applies).toBe(true);
      if (!reference.applies) continue;
      expect(reference.symbol).toBe(SECTOR_ETFS[sector]);
      expect(reference.sector).toBe(sector);
    }
  });

  it("answers `no-sector` for an index ETF and `is-benchmark` for a sector one", () => {
    expect(
      excessMoveReference({
        ...EQUITY,
        symbol: toTicker("SPY"),
        kind: "index_etf",
        sector: null,
      }),
    ).toEqual({ applies: false, because: "no-sector" });

    expect(
      excessMoveReference({
        ...EQUITY,
        symbol: toTicker("XLK"),
        kind: "sector_etf",
      }),
    ).toEqual({ applies: false, because: "is-benchmark" });
  });

  it("gives the eleven benchmarks themselves no reference at all", () => {
    // Eleven of 516, and the reason is not coverage: a sector ETF differenced
    // against itself is exactly `0` for ever, which on a magnitude percentile
    // is *the least unusual move on record* — the most confident possible wrong
    // answer, and the one a refusal cannot be mistaken for.
    for (const sector of SECTORS) {
      const fund = excessMoveReference({
        ...EQUITY,
        symbol: SECTOR_ETFS[sector],
        kind: "sector_etf",
        sector,
      });

      expect(fund.applies).toBe(false);
    }
  });
});
