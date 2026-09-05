import { describe, expect, it } from "vitest";

import {
  ETF_KINDS,
  isEtf,
  isSecurity,
  SECTOR_ETFS,
  SECTOR_LABELS,
  SECTORS,
  SECURITY_FIELD_GROUP,
  SECURITY_FIELD_GROUPS,
  SECURITY_KINDS,
  SECURITY_STATUSES,
} from "./security.js";
import type { Security } from "./security.js";
import { isTicker, toTicker } from "./ticker.js";

// `security.ts` shipped no test from Task 2.2.4 until now, correctly: a
// one-member const array has nothing to assert that the type system does not
// already hold, which is the position `feed-status.ts` and `anomaly.ts` are
// still in. What is worth asserting here is everything the compiler *cannot*
// see — that two tables stay total over the taxonomy at run time, that a
// mapping is injective, and that a predicate rejects what it claims to.
const NVDA: Security = {
  symbol: toTicker("NVDA"),
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: "Semiconductors",
  status: "active",
  cik: null,
};

describe("SECURITY_KINDS", () => {
  it("distinguishes a company, a sector proxy and a market proxy", () => {
    expect(SECURITY_KINDS).toStrictEqual(["equity", "sector_etf", "index_etf"]);
  });

  // The widening's whole purpose. Epic 4's sector rows and Epic 5's
  // relative-move measure an equity *against* a sector ETF, so a vocabulary
  // that collapsed the two proxies would let a screen compare a thing to
  // itself and would leave "which ETF is the market" an unwritten rule.
  it("keeps the two ETF roles apart", () => {
    expect(ETF_KINDS).toStrictEqual(["sector_etf", "index_etf"]);
    expect(ETF_KINDS).not.toContain("equity");
    for (const kind of ETF_KINDS) {
      expect(SECURITY_KINDS).toContain(kind);
    }
  });

  it("treats both ETF roles as an ETF and an equity as not one", () => {
    expect(isEtf(NVDA)).toBe(false);
    expect(
      isEtf({ ...NVDA, kind: "sector_etf", symbol: SECTOR_ETFS.technology }),
    ).toBe(true);
    expect(isEtf({ ...NVDA, kind: "index_etf", sector: null })).toBe(true);
  });
});

describe("the sector taxonomy", () => {
  it("has eleven members", () => {
    expect(SECTORS).toHaveLength(11);
    expect(new Set(SECTORS).size).toBe(SECTORS.length);
  });

  // Acceptance criterion 3's second half. The compiler already holds it —
  // `Record<Sector, Ticker>` cannot be written with a key missing — and this
  // asserts it at run time so that loosening the type to a `Partial` or an
  // index signature later is caught rather than silently permitted.
  it("gives every sector a benchmark ETF", () => {
    expect(Object.keys(SECTOR_ETFS).sort()).toStrictEqual([...SECTORS].sort());
    for (const sector of SECTORS) {
      expect(isTicker(SECTOR_ETFS[sector])).toBe(true);
    }
  });

  // Two sectors sharing one benchmark would make Epic 5 measure both against
  // the same thing and report the difference as a finding about one of them.
  it("gives no two sectors the same benchmark", () => {
    const etfs = SECTORS.map((sector) => SECTOR_ETFS[sector]);
    expect(new Set(etfs).size).toBe(etfs.length);
  });

  it("gives every sector a display name", () => {
    expect(Object.keys(SECTOR_LABELS).sort()).toStrictEqual(
      [...SECTORS].sort(),
    );
    for (const sector of SECTORS) {
      expect(SECTOR_LABELS[sector].length).toBeGreaterThan(0);
    }
  });
});

describe("SECURITY_STATUSES", () => {
  it("names the two states this story can produce", () => {
    expect(SECURITY_STATUSES).toStrictEqual(["active", "untracked"]);
  });

  // `delisted` is a fact about the market and `untracked` is a fact about us.
  // Its absence is this repository's own rule — a member is added when the
  // thing it names can be produced — and its producer is Story 2.6, which
  // reads an asset status from Alpaca. A test asserting the absence is what
  // makes adding it a deliberate act rather than a tidy-up.
  it("does not yet claim to know whether a security is delisted", () => {
    expect(SECURITY_STATUSES).not.toContain("delisted");
  });

  // The vocabulary that replaces a soft delete must not quietly become one.
  it("is not a soft delete", () => {
    expect(SECURITY_STATUSES).not.toContain("deleted");
  });
});

describe("SECURITY_FIELD_GROUP", () => {
  // Acceptance criterion 6 says the source is recorded *per field*. The
  // compiler holds totality over `keyof Security`; this holds that the values
  // are members of the vocabulary and that the group set is the one Task 2.3.3
  // is about to name columns after.
  it("puts every field of a Security in a named group", () => {
    expect(Object.keys(SECURITY_FIELD_GROUP).sort()).toStrictEqual(
      Object.keys(NVDA).sort(),
    );
    for (const group of Object.values(SECURITY_FIELD_GROUP)) {
      expect(SECURITY_FIELD_GROUPS).toContain(group);
    }
  });

  it("separates what we retrieved from what we decided", () => {
    expect(SECURITY_FIELD_GROUP.kind).toBe("ours");
    expect(SECURITY_FIELD_GROUP.status).toBe("ours");
    expect(SECURITY_FIELD_GROUP.sector).toBe("classification");
    expect(SECURITY_FIELD_GROUP.cik).toBe("identity");
  });
});

describe("isSecurity", () => {
  it("accepts a well-formed security of each kind", () => {
    expect(isSecurity(NVDA)).toBe(true);
    expect(
      isSecurity({
        ...NVDA,
        symbol: "XLK",
        name: "Technology Select Sector SPDR Fund",
        kind: "sector_etf",
        industry: null,
      }),
    ).toBe(true);
    expect(
      isSecurity({
        ...NVDA,
        symbol: "SPY",
        name: "SPDR S&P 500 ETF Trust",
        kind: "index_etf",
        sector: null,
        industry: null,
      }),
    ).toBe(true);
  });

  // The isApiError case rather than the isHealthResponse case, decided
  // deliberately: all three of these are discriminators something switches on,
  // so an unrecognised value is one no reader can act on. A sector outside the
  // taxonomy is a security with no benchmark, which is the exact failure
  // acceptance criterion 3 exists to prevent.
  it("rejects a value outside a closed vocabulary", () => {
    expect(isSecurity({ ...NVDA, kind: "etf" })).toBe(false);
    expect(isSecurity({ ...NVDA, sector: "Technology" })).toBe(false);
    expect(isSecurity({ ...NVDA, status: "delisted" })).toBe(false);
  });

  it("rejects a symbol that is not a ticker", () => {
    expect(isSecurity({ ...NVDA, symbol: "nvda" })).toBe(false);
    expect(isSecurity({ ...NVDA, symbol: "" })).toBe(false);
  });

  // The union says an index proxy has no sector and an equity has one. A
  // predicate that accepted either violation would be admitting a value the
  // type system says cannot exist, which is worse than having no predicate.
  it("enforces the agreement between kind and sector", () => {
    expect(isSecurity({ ...NVDA, kind: "index_etf" })).toBe(false);
    expect(isSecurity({ ...NVDA, sector: null })).toBe(false);
  });

  it("rejects things that are not objects at all", () => {
    expect(isSecurity(null)).toBe(false);
    expect(isSecurity("NVDA")).toBe(false);
    expect(isSecurity(undefined)).toBe(false);
  });

  // Nullable is not optional. `exactOptionalPropertyTypes` makes those two
  // different types here, and a row that simply omits `cik` is a row whose
  // author never decided, which is precisely what Task 2.3.4 is told not to do.
  it("requires the nullable fields to be present as null", () => {
    const withoutCik: Record<string, unknown> = { ...NVDA };
    delete withoutCik.cik;
    expect(isSecurity(withoutCik)).toBe(false);
  });
});
