import type {
  EquitySecurity,
  IndexEtfSecurity,
  Security,
} from "@marketpulse/shared";
import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { SECURITY_MATCH_LIMIT, matchSecurities } from "./security-match.js";

// This file is the decision, not a check on one. Every rule in
// `security-match.ts`'s header is a row here, because "sensibly" is three
// mechanisms — an exact symbol, a case-fold, a prefix of a company name — and
// the only place that is settled rather than guessed is a table.
//
// The securities below are **real rows from the tracked universe**, spelled as
// `apps/backend/src/universe.ts` spells them, because the two tests that matter
// most are both about names a person did not mean and both were measured
// against the real thing (`SEARCH-AND-SELECTION.md` §0). A fixture invented to
// make a rule look right would prove nothing about either.

const equity = (
  symbol: string,
  name: string,
  over: Partial<EquitySecurity> = {},
): EquitySecurity => ({
  symbol: toTicker(symbol),
  name,
  exchange: "NASDAQ",
  kind: "equity",
  sector: "technology",
  industry: null,
  status: "active",
  cik: null,
  ...over,
});

const NVDA = equity("NVDA", "NVIDIA Corporation");
const NVR = equity("NVR", "NVR, Inc.");
const BRK_B = equity("BRK.B", "Berkshire Hathaway Inc. Class B");
const BAC = equity("BAC", "Bank of America Corporation");

// The five a naive `name.includes(query)` returns for `nv` and a person did not
// mean: Federal Realty **Inv**estment Trust, **Inv**itation Homes, **Inv**esco,
// Ken**vu**e, and **Inv**esco QQQ Trust.
const FRT = equity("FRT", "Federal Realty Investment Trust");
const INVH = equity("INVH", "Invitation Homes Inc.");
const IVZ = equity("IVZ", "Invesco Ltd.");
const KVUE = equity("KVUE", "Kenvue Inc.");
const QQQ: IndexEtfSecurity = {
  symbol: toTicker("QQQ"),
  name: "Invesco QQQ Trust",
  exchange: "NASDAQ",
  kind: "index_etf",
  sector: null,
  industry: null,
  status: "active",
  cik: null,
};

const UNIVERSE: readonly Security[] = [
  QQQ,
  NVDA,
  IVZ,
  NVR,
  KVUE,
  FRT,
  INVH,
  BRK_B,
  BAC,
];

/** The symbols a query returns, in the order it returns them. */
function symbols(universe: readonly Security[], query: string): string[] {
  return matchSecurities(universe, query).matches.map(
    (match) => match.security.symbol as string,
  );
}

describe("what matches", () => {
  // The measurement this rule exists for. The array order above is the order
  // the real universe file lists these in, so a substring implementation would
  // return all seven in roughly this order — which is what makes the assertion
  // a rule rather than a coincidence.
  it("does not return the five securities a substring match finds for nv", () => {
    expect(symbols(UNIVERSE, "nv")).toEqual(["NVDA", "NVR"]);
  });

  it("resolves nvid through the company name, which no symbol contains", () => {
    const result = matchSecurities(UNIVERSE, "nvid");

    expect(result.total).toBe(1);
    expect(result.matches[0]?.security.symbol).toBe("NVDA");
    expect(result.matches[0]?.tier).toBe("name-prefix");
  });

  it("matches an exact symbol whatever case it is typed in", () => {
    for (const query of ["NVDA", "nvda", "NvDa"]) {
      expect(matchSecurities(UNIVERSE, query).matches[0]?.tier).toBe(
        "symbol-exact",
      );
    }
  });

  it("matches a symbol prefix", () => {
    expect(symbols(UNIVERSE, "nvd")).toEqual(["NVDA"]);
  });

  // The deliberate absence. `VD` is inside `NVDA`; nobody types the middle of a
  // ticker, and a five-character alphabet makes substring matching close to
  // random.
  it("does not match a symbol substring that is not a prefix", () => {
    expect(symbols(UNIVERSE, "vd")).toEqual([]);
  });

  it("matches a name prefix", () => {
    expect(symbols(UNIVERSE, "berkshire")).toEqual(["BRK.B"]);
  });

  it("matches a later word of a name", () => {
    const result = matchSecurities(UNIVERSE, "hathaway");

    expect(result.matches[0]?.security.symbol).toBe("BRK.B");
    expect(result.matches[0]?.tier).toBe("name-word-prefix");
  });

  // The other half of the same rule: `nv` is inside Ken**vu**e and does not
  // start a word there, so it is not a match at all.
  it("does not match a name substring that does not start a word", () => {
    expect(symbols(UNIVERSE, "envue")).toEqual([]);
  });

  it("matches a multi-word query across the boundary between two words", () => {
    expect(symbols(UNIVERSE, "bank of")).toEqual(["BAC"]);
    expect(symbols(UNIVERSE, "of america")).toEqual(["BAC"]);
  });

  it("treats a run of whitespace inside a query as one space", () => {
    expect(symbols(UNIVERSE, "bank   of")).toEqual(["BAC"]);
  });

  it("ignores whitespace around a query", () => {
    expect(symbols(UNIVERSE, "  nvda  ")).toEqual(["NVDA"]);
  });

  // A word boundary is "the previous character is not a letter or a digit",
  // which is what lets `class` find the `B` share without a rule about dots.
  it("finds a word after punctuation", () => {
    expect(symbols(UNIVERSE, "class")).toEqual(["BRK.B"]);
  });

  it("matches a dot-bearing symbol exactly and by prefix", () => {
    expect(matchSecurities(UNIVERSE, "brk.b").matches[0]?.tier).toBe(
      "symbol-exact",
    );
    expect(matchSecurities(UNIVERSE, "brk").matches[0]?.tier).toBe(
      "symbol-prefix",
    );
    expect(matchSecurities(UNIVERSE, "brk.").matches[0]?.tier).toBe(
      "symbol-prefix",
    );
  });

  // Nothing, rather than everything: the whole universe is already on screen
  // underneath the result surface, and a listbox that opens with 518 rows the
  // moment a field is focused is a worse answer than a closed one.
  it("matches nothing for an empty or whitespace-only query", () => {
    for (const query of ["", " ", "\t\n"]) {
      expect(matchSecurities(UNIVERSE, query)).toEqual({
        matches: [],
        total: 0,
      });
    }
  });

  it("matches nothing for a query no security answers", () => {
    expect(matchSecurities(UNIVERSE, "zzz")).toEqual({ matches: [], total: 0 });
  });
});

describe("the order", () => {
  it("puts an exact symbol first, which is what Enter opens", () => {
    // `IVZ` is an exact symbol, so it beats the two name prefixes `inv` would
    // otherwise rank above it.
    expect(symbols(UNIVERSE, "ivz")).toEqual(["IVZ"]);

    // And `inv` shows all four tiers doing their job at once: `INVH` by symbol
    // prefix, `IVZ` and `QQQ` by name prefix, and `FRT` last through Federal
    // Realty **Inv**estment Trust — which is a *word* of that name, so unlike
    // the `nv` case it is a match a person typing `inv` might well have meant.
    expect(symbols(UNIVERSE, "inv")).toEqual(["INVH", "IVZ", "QQQ", "FRT"]);
  });

  it("ranks a symbol prefix above a name prefix", () => {
    // `NVR` matches by symbol prefix; `NVDA` by symbol prefix too — so add a
    // security that can only match by name and check it comes after both.
    const nvidiaByNameOnly = equity("XYZ", "NV Something");
    const universe = [nvidiaByNameOnly, ...UNIVERSE];

    expect(symbols(universe, "nv")).toEqual(["NVDA", "NVR", "XYZ"]);
  });

  it("ranks a name prefix above a later word of a name", () => {
    const trustFirst = equity("TRU", "Trust Holdings");
    const universe = [QQQ, trustFirst];

    expect(symbols(universe, "trust")).toEqual(["TRU", "QQQ"]);
  });

  // Without this the list reshuffles between renders for reasons nobody can
  // see. The two universes below differ only in array order.
  it("breaks a tie by symbol rather than by the universe's array order", () => {
    const a = equity("AAA", "Duplicate Name");
    const b = equity("BBB", "Duplicate Name");

    expect(symbols([a, b], "duplicate")).toEqual(["AAA", "BBB"]);
    expect(symbols([b, a], "duplicate")).toEqual(["AAA", "BBB"]);
  });
});

describe("status", () => {
  // `UNIVERSE.md` §12.2 names this screen as a reader that must not filter on
  // `status`: a search that drops an untracked security reintroduces exactly
  // the vanishing row that having no `deleted_at` exists to avoid.
  it("returns an untracked security", () => {
    const bbby = equity("BBBY", "Bed Bath & Beyond Inc.", {
      status: "untracked",
    });

    expect(symbols([bbby], "bbby")).toEqual(["BBBY"]);
    expect(symbols([bbby], "bed bath")).toEqual(["BBBY"]);
  });

  it("ranks an untracked security below a tracked one in the same tier", () => {
    const tracked = equity("ZZZB", "Zeta Holdings");
    const untracked = equity("ZZZA", "Zeta Industries", {
      status: "untracked",
    });

    // `ZZZA` sorts first alphabetically, so only the status rule can produce
    // this order.
    expect(symbols([untracked, tracked], "zzz")).toEqual(["ZZZB", "ZZZA"]);
  });
});

describe("the cap", () => {
  // `toTicker` accepts letters only, so the twenty-five are lettered rather
  // than numbered — which also makes the alphabetical tie-break legible.
  const many = "ABCDEFGHIJKLMNOPQRSTUVWXY"
    .split("")
    .map((letter) => equity(`CAP${letter}`, "Capped Holdings"));

  it("returns the true total beside the shown slice", () => {
    const result = matchSecurities(many, "cap");

    expect(result.matches).toHaveLength(SECURITY_MATCH_LIMIT);
    expect(result.total).toBe(25);
  });

  it("truncates from the top of the ranking, not from anywhere else", () => {
    expect(symbols(many, "cap")[0]).toBe("CAPA");
    expect(symbols(many, "cap").at(-1)).toBe("CAPJ");
  });

  it("returns every match when there are fewer than the cap", () => {
    const result = matchSecurities(UNIVERSE, "nv");

    expect(result.matches).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("accepts a caller-supplied limit", () => {
    const result = matchSecurities(many, "cap", 3);

    expect(result.matches).toHaveLength(3);
    expect(result.total).toBe(25);
  });
});

// The emphasis offset (Task 2.11.4).
//
// This block exists because the obvious implementation in a component —
// `name.toLowerCase().indexOf(query)` — is wrong rather than merely duplicated,
// and the two agree on most rows, which is what makes it dangerous. Every case
// below is one where they disagree, plus the boundary cases that keep the
// offset valid for slicing.
describe("where a row should draw its emphasis", () => {
  const HSY = equity("HSY", "The Hershey Company");
  const SYY = equity("SYY", "Sysco Corporation");

  it("emphasises the symbol when the query is the whole symbol", () => {
    const [match] = matchSecurities(UNIVERSE, "nvda").matches;

    expect(match?.emphasis).toEqual({ field: "symbol", offset: 0, length: 4 });
  });

  it("emphasises only the typed prefix of a symbol", () => {
    const [match] = matchSecurities(UNIVERSE, "nv").matches;

    expect(match?.security.symbol).toBe("NVDA");
    expect(match?.emphasis).toEqual({ field: "symbol", offset: 0, length: 2 });
  });

  it("emphasises in the name when the name is what matched", () => {
    const [match] = matchSecurities(UNIVERSE, "nvid").matches;

    expect(match?.tier).toBe("name-prefix");
    expect(match?.emphasis).toEqual({ field: "name", offset: 0, length: 4 });
  });

  // The measured defect, in the two forms it was measured in. `indexOf` returns
  // 1 for Hershey (the `he` of *The*) and 4 for Sysco (the `co` of Sys*co*);
  // the matcher's word boundaries are 4 and 6. If either of these ever equals
  // the `indexOf` answer, the offset has stopped coming from the matcher.
  it("emphasises Hershey rather than the 'he' of 'The'", () => {
    const [match] = matchSecurities([HSY], "he").matches;

    expect(match?.emphasis.offset).toBe(4);
    expect("The Hershey Company".toLowerCase().indexOf("he")).toBe(1);
  });

  it("emphasises Corporation rather than the 'co' of 'Sysco'", () => {
    const [match] = matchSecurities([SYY], "co").matches;

    expect(match?.emphasis.offset).toBe(6);
    expect("Sysco Corporation".toLowerCase().indexOf("co")).toBe(3);
  });

  it("slices the security's own casing at the offset it reports", () => {
    const [match] = matchSecurities([HSY], "he").matches;
    const { offset, length } = match?.emphasis ?? { offset: 0, length: 0 };

    expect(HSY.name.slice(offset, offset + length)).toBe("He");
  });

  // A multi-word query spans a space, so its length is the normalised query's
  // and not a token's. `bank of` is 7 characters and must emphasise 7.
  it("spans the whole of a multi-word query", () => {
    const [match] = matchSecurities(UNIVERSE, "bank of").matches;
    const { offset, length } = match?.emphasis ?? { offset: 0, length: 0 };

    expect(BAC.name.slice(offset, offset + length)).toBe("Bank of");
  });

  it("reports a length the caller can slice after whitespace is collapsed", () => {
    const [match] = matchSecurities(UNIVERSE, "  bank   of  ").matches;
    const { offset, length } = match?.emphasis ?? { offset: 0, length: 0 };

    expect(BAC.name.slice(offset, offset + length)).toBe("Bank of");
  });
});
