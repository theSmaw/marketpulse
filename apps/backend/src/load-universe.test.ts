// The loader's validation, in the **fast** suite (Task 2.3.5).
//
// No database, no build and no socket, which is what keeps `pnpm test`'s three
// stated properties. Anything that needs a real server is
// `load-universe.database.test.ts`, and the naming is what puts a file on one
// side of that partition or the other — see `vitest.database.config.ts`, where
// the three globs are one decision that nothing enforces.
//
// **Every fixture here is hand-built rather than derived from `UNIVERSE`**, and
// that is the whole reason `validateUniverse` takes the list as a parameter. Two
// of the checks it runs are **vacuous against the shipped file** — Task 2.3.4
// generates the eleven sector proxies from `SECTOR_ETFS`, so "every sector has
// its ETF" and "the proxies agree with the mapping" cannot fail against the real
// universe however wrongly they are written. A test that could only ever be
// handed the real list could only ever watch them pass, which is Task 2.2.5's
// blind-check problem: a green result that certifies nothing is
// indistinguishable from one that certifies something.
//
// **The one thing that cannot be tested from a list at all** is a malformed
// ticker. `universe.ts` wraps every symbol through `toTicker` in its
// constructors, so a bad symbol is a `TypeError` at **module load**, before any
// validator receives anything — see the test at the bottom, which produces it
// through the constructor rather than pretending a list could carry one.

import { describe, expect, it } from "vitest";

import {
  SECTOR_ETFS,
  SECTORS,
  toTicker,
  type EquitySecurity,
  type IndexEtfSecurity,
  type Sector,
  type SectorEtfSecurity,
  type Security,
} from "@marketpulse/shared";

import {
  summariseLoad,
  summariseValidationFailure,
  validateUniverse,
  type UniverseProvenance,
} from "./load-universe.js";

const PROVENANCE: UniverseProvenance = {
  profile: { source: "curated", checkedOn: "2026-09-05" },
  classification: { source: "curated", checkedOn: "2026-09-05" },
};

function equity(symbol: string, sector: Sector): EquitySecurity {
  return {
    kind: "equity",
    symbol: toTicker(symbol),
    name: `${symbol} Inc.`,
    exchange: "NASDAQ",
    sector,
    industry: null,
    status: "active",
    cik: null,
  };
}

function sectorProxy(sector: Sector, symbol?: string): SectorEtfSecurity {
  return {
    kind: "sector_etf",
    symbol: toTicker(symbol ?? SECTOR_ETFS[sector]),
    name: `${sector} proxy`,
    exchange: "ARCA",
    sector,
    industry: null,
    status: "active",
    cik: null,
  };
}

function indexProxy(symbol: string): IndexEtfSecurity {
  return {
    kind: "index_etf",
    symbol: toTicker(symbol),
    name: `${symbol} Trust`,
    exchange: "ARCA",
    sector: null,
    industry: null,
    status: "active",
    cik: null,
  };
}

/**
 * A small universe that satisfies every rule, so a test states only its break.
 *
 * **All eleven proxies and only two equities**, which is not a token gesture:
 * `UNIVERSE.md` §7's first rule is that every one of the eleven sectors is
 * present and has its ETF, so a universe missing one is not a valid one to
 * mutate from. The equities are two because the equity count per sector is a
 * product judgement §7 makes about the real list and not a rule this program
 * enforces — which is itself worth knowing: nothing here checks the floor of 6
 * or the ceiling of 12, deliberately, because those are read by a person when
 * the list changes rather than held by a runner.
 */
function valid(): Security[] {
  return [
    ...SECTORS.map((sector) => sectorProxy(sector)),
    indexProxy("SPY"),
    equity("NVDA", "technology"),
    equity("XOM", "energy"),
  ];
}

describe("validateUniverse", () => {
  it("accepts a well-formed universe", () => {
    expect(validateUniverse(valid(), PROVENANCE)).toEqual([]);
  });

  it("accepts the real universe", () => {
    // Not the interesting test — everything above holds it — but it is the one
    // that fails if the shipped file ever stops satisfying its own rules, which
    // is what Task 2.3.6's first edit could do.
    //
    // Imported lazily so this file's other tests do not depend on ~900 lines of
    // data, and so a malformed ticker in that file fails as an import error
    // naming the value rather than as a mysterious failure of the whole suite.
    return import("./universe.js").then(({ UNIVERSE, UNIVERSE_PROVENANCE }) => {
      expect(validateUniverse(UNIVERSE, UNIVERSE_PROVENANCE)).toEqual([]);
    });
  });

  it("refuses an empty universe", () => {
    expect(validateUniverse([], PROVENANCE)).toEqual([
      expect.stringContaining("empty"),
    ]);
  });

  describe("acceptance criterion 3", () => {
    it("refuses an equity with no sector, naming it", () => {
      // The cast is what the compiler makes necessary and is the point: this
      // state cannot be written in `universe.ts` at all, because `Security` is a
      // discriminated union. What it stands in for is a row reaching the loader
      // from somewhere the compiler did not check — Story 2.4's API, or a future
      // generator.
      const universe = [
        ...valid(),
        { ...equity("AMD", "technology"), sector: null } as unknown as Security,
      ];

      expect(validateUniverse(universe, PROVENANCE)).toEqual([
        expect.stringContaining("AMD has no sector"),
      ]);
    });

    it("refuses a sector whose ETF is missing, naming the sector and the count", () => {
      const universe = valid().filter(
        (security) => security.symbol !== SECTOR_ETFS.energy,
      );

      const violations = validateUniverse(universe, PROVENANCE);

      expect(violations).toHaveLength(2);
      expect(violations[0]).toContain("`energy` is on 1 security");
      expect(violations[1]).toContain("SECTOR_ETFS maps it to XLE");
    });

    it("refuses a sector proxy that disagrees with SECTOR_ETFS", () => {
      // The seam the generated block does not cover: somebody replacing it with
      // typed rows, or typing a proxy's symbol into an equity block.
      const universe = valid().map((security) =>
        security.symbol === SECTOR_ETFS.technology
          ? sectorProxy("technology", "XLKK")
          : security,
      );

      expect(validateUniverse(universe, PROVENANCE)).toEqual([
        expect.stringContaining("XLKK is the sector_etf for `technology`"),
      ]);
    });

    it("refuses two proxies for one sector", () => {
      const universe = [...valid(), sectorProxy("technology")];

      const violations = validateUniverse(universe, PROVENANCE);

      expect(violations).toEqual([
        // The duplicate symbol is caught too, and by a different rule. Both
        // lines are right and each names a different thing that is wrong.
        expect.stringContaining("XLK appears more than once"),
        expect.stringContaining("`technology` has 2 sector_etf rows"),
      ]);
    });
  });

  describe("the duplicate symbol, which nothing else would catch", () => {
    it("refuses a symbol that appears twice", () => {
      const universe = [...valid(), equity("NVDA", "technology")];

      expect(validateUniverse(universe, PROVENANCE)).toEqual([
        expect.stringContaining("NVDA appears more than once"),
      ]);
    });

    it("reports a symbol appearing three times once, not twice", () => {
      const universe = [
        ...valid(),
        equity("NVDA", "technology"),
        equity("NVDA", "technology"),
      ];

      expect(validateUniverse(universe, PROVENANCE)).toHaveLength(1);
    });

    it("does not confuse two different symbols in the same sector", () => {
      expect(
        validateUniverse(
          [...valid(), equity("INTC", "technology")],
          PROVENANCE,
        ),
      ).toEqual([]);
    });
  });

  describe("the row shape, for anything that bypassed the compiler", () => {
    it("refuses a kind outside the vocabulary", () => {
      const universe = [
        ...valid(),
        { ...equity("AMD", "technology"), kind: "etf" } as unknown as Security,
      ];

      expect(validateUniverse(universe, PROVENANCE)).toEqual([
        expect.stringContaining("AMD is not a well-formed security"),
      ]);
    });

    it("refuses an index proxy carrying a sector", () => {
      const universe = [
        ...valid(),
        { ...indexProxy("QQQ"), sector: "technology" } as unknown as Security,
      ];

      expect(validateUniverse(universe, PROVENANCE)).toEqual([
        expect.stringContaining("QQQ is not a well-formed security"),
      ]);
    });

    it("names a row that has no symbol at all rather than printing an object", () => {
      const universe = [{ nonsense: true } as unknown as Security];

      expect(validateUniverse(universe, PROVENANCE)[0]).toContain(
        "A row is not a well-formed security",
      );
    });
  });

  describe("the accumulator", () => {
    it("reports every violation rather than the first", () => {
      const universe = [
        ...valid().filter((security) => security.symbol !== SECTOR_ETFS.energy),
        equity("NVDA", "technology"),
        { ...equity("AMD", "technology"), sector: null } as unknown as Security,
      ];

      // A curated file with three faults should take one run to fix, not three.
      expect(
        validateUniverse(universe, PROVENANCE).length,
      ).toBeGreaterThanOrEqual(4);
    });
  });

  describe("provenance", () => {
    it("refuses a checkedOn that is not a date", () => {
      const violations = validateUniverse(valid(), {
        ...PROVENANCE,
        classification: { source: "curated", checkedOn: "last Tuesday" },
      });

      expect(violations).toEqual([
        expect.stringContaining("classification.checkedOn is `last Tuesday`"),
      ]);
    });

    it("refuses a date that is shaped like one and is not", () => {
      const violations = validateUniverse(valid(), {
        ...PROVENANCE,
        profile: { source: "curated", checkedOn: "2026-13-45" },
      });

      expect(violations).toEqual([
        expect.stringContaining("shaped like a date and is not one"),
      ]);
    });

    it("refuses an empty source", () => {
      const violations = validateUniverse(valid(), {
        ...PROVENANCE,
        profile: { source: "  ", checkedOn: "2026-09-05" },
      });

      expect(violations).toEqual([
        expect.stringContaining("profile.source is empty"),
      ]);
    });
  });
});

describe("summariseValidationFailure", () => {
  it("exits 1 and writes nothing to stdout", () => {
    // The property this whole arrangement exists for: a program that reports a
    // failure and exits 0 is worse than one that crashes. `run-migrations.mjs`
    // had the same test for the same reason.
    const outcome = summariseValidationFailure(["one thing", "another"]);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.lines).toEqual([]);
    expect(outcome.errors.join("")).toContain("2 problems");
    expect(outcome.errors.join("")).toContain("one thing");
    expect(outcome.errors.join("")).toContain("another");
  });

  it("says the table is unchanged, because it is", () => {
    expect(summariseValidationFailure(["x"]).errors.join("")).toContain(
      "exactly\nas it was",
    );
  });
});

describe("summariseLoad", () => {
  it("exits 0 and reports the three counts", () => {
    const outcome = summariseLoad({
      inserted: 3,
      updated: 1,
      unchanged: 97,
      absentFromFile: [],
    });

    expect(outcome.exitCode).toBe(0);
    expect(outcome.errors).toEqual([]);
    expect(outcome.lines.join("\n")).toContain(
      "101 securities in the universe",
    );
    expect(outcome.lines.join("\n")).toContain("3 inserted");
    expect(outcome.lines.join("\n")).toContain("1 updated");
    expect(outcome.lines.join("\n")).toContain("97 unchanged");
  });

  it("reports a symbol in the database and not in the file, and still exits 0", () => {
    // The seam. This loader does not delete, does not change `status` and does
    // not refuse — Task 2.3.6 chooses, and one of the three answers destroys
    // data Story 2.8 will have stored against the row.
    const outcome = summariseLoad({
      inserted: 0,
      updated: 0,
      unchanged: 100,
      absentFromFile: ["FB"],
    });

    expect(outcome.exitCode).toBe(0);
    expect(outcome.lines.join("\n")).toContain("1 in the database and not in");
    expect(outcome.lines.join("\n")).toContain("FB");
    expect(outcome.lines.join("\n")).toContain("Task 2.3.6");
  });
});

describe("a malformed ticker", () => {
  it("throws at construction rather than reaching the validator", () => {
    // The stated exception to "every violation". `universe.ts` wraps every
    // symbol through `toTicker`, so a bad one is a `TypeError` at module load —
    // before `validateUniverse` is called with anything at all — and it
    // therefore arrives on its own, naming one value, and never beside the
    // other violations. Produced here rather than described, because the
    // exception is only worth stating if it is real.
    expect(() => toTicker("NVDA CORP")).toThrow(
      /Not a valid US equity ticker: "NVDA CORP"/,
    );
  });
});
