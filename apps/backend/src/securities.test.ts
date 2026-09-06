// The mapping, in the **fast** suite (Task 2.4.1).
//
// `toSecurity` is a pure function over a row, so checking it needs no build, no
// socket and no database — which is exactly the line `vitest.database.config.ts`
// draws. What is next door in `securities.database.test.ts` is the claim only a
// real server can settle: that these rows are the rows Postgres actually hands
// back. This file is the claim about what happens to one once it has.
//
// The subject is one function and the cases are the ones the type system cannot
// hold: what a null `sector` means, and what happens to a row the database
// should have refused.

import { describe, expect, it } from "vitest";

import { SECTOR_ETFS, toTicker } from "@marketpulse/shared";

import {
  SecurityMappingError,
  toSecurity,
  type SecurityRow,
} from "./securities.js";

/** A well-formed equity row, as a base for the variations below. */
const NVDA: SecurityRow = {
  symbol: "NVDA",
  name: "NVIDIA Corporation",
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: "Semiconductors",
  status: "active",
  cik: null,
};

describe("mapping a row to a security", () => {
  it("carries every column across", () => {
    expect(toSecurity(NVDA)).toEqual({
      symbol: toTicker("NVDA"),
      name: "NVIDIA Corporation",
      exchange: "NASDAQ",
      kind: "equity",
      sector: "technology",
      industry: "Semiconductors",
      status: "active",
      cik: null,
    });
  });

  it("keeps the two meanings of a null sector apart", () => {
    // The whole reason this is a hand-written mapper rather than a generic one.
    // A sector proxy's sector is the sector it proxies; an index proxy's is
    // null, and the union says so — so after narrowing on `kind`, one of these
    // has a sector the compiler can read and the other structurally does not.
    const xlk = toSecurity({
      ...NVDA,
      symbol: SECTOR_ETFS.technology,
      name: "Technology Select Sector SPDR Fund",
      exchange: "ARCA",
      kind: "sector_etf",
      industry: null,
    });

    const spy = toSecurity({
      ...NVDA,
      symbol: "SPY",
      name: "SPDR S&P 500 ETF Trust",
      exchange: "ARCA",
      kind: "index_etf",
      sector: null,
      industry: null,
    });

    if (xlk.kind === "index_etf") expect.fail("XLK mapped as an index proxy");
    expect(xlk.sector).toBe("technology");

    if (spy.kind !== "index_etf") expect.fail("SPY mapped as something else");
    expect(spy.sector).toBeNull();
  });

  it("renders an untracked row rather than refusing it", () => {
    // `status` is this schema's invisible predicate and the read deliberately
    // does not filter on it (UNIVERSE.md §12.2). The mapper's half of that is
    // that an untracked row is an ordinary security carrying its status — not
    // an error, and not a row to be dropped on the way past.
    expect(toSecurity({ ...NVDA, status: "untracked" }).status).toBe(
      "untracked",
    );
  });
});

describe("a row the database should have refused", () => {
  // Each of these is backed by a `check` constraint, so none of them can reach
  // this function through the shipped path. The point is that the code has a
  // stated answer if one does: fail loudly, naming the symbol — never drop the
  // row and return a universe that is silently one security short.
  //
  // The rows are cast because they are, by construction, values the declared
  // types say cannot exist. That is what the function is being asked about.

  it("refuses an equity with no sector", () => {
    expect(() => toSecurity({ ...NVDA, sector: null })).toThrow(
      SecurityMappingError,
    );
  });

  it("refuses an index proxy that carries one", () => {
    expect(() => toSecurity({ ...NVDA, kind: "index_etf" })).toThrow(
      SecurityMappingError,
    );
  });

  it("refuses a kind, status or sector outside the vocabulary", () => {
    expect(() =>
      toSecurity({ ...NVDA, kind: "etf" } as unknown as SecurityRow),
    ).toThrow(SecurityMappingError);
    expect(() =>
      toSecurity({ ...NVDA, status: "delisted" } as unknown as SecurityRow),
    ).toThrow(SecurityMappingError);
    expect(() =>
      toSecurity({ ...NVDA, sector: "Technology" } as unknown as SecurityRow),
    ).toThrow(SecurityMappingError);
  });

  it("refuses a symbol that is not a ticker", () => {
    expect(() => toSecurity({ ...NVDA, symbol: "nvda" })).toThrow(
      SecurityMappingError,
    );
  });

  it("names the symbol, because a message that does not is a message nobody can act on", () => {
    try {
      toSecurity({ ...NVDA, sector: null });
      expect.fail("the malformed row mapped");
    } catch (error) {
      if (!(error instanceof SecurityMappingError)) {
        expect.fail("threw something other than a SecurityMappingError");
      }
      expect(error.symbol).toBe("NVDA");
      expect(error.message).toContain("NVDA");
    }
  });
});
