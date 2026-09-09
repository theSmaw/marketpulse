import { describe, expect, it } from "vitest";

import { isSecuritiesResponse } from "./securities-response.js";
import type { SecuritiesResponse } from "./securities-response.js";
import { toTicker } from "./ticker.js";
import type { Security } from "./security.js";

// What is worth asserting here is the envelope and only the envelope.
// `isSecurity` is total over a row and has its own tests next door, so
// re-checking a sector or a ticker here would be a second copy of that
// judgement — the exact thing this predicate was put beside the shape to avoid.
//
// The one test that would be easy not to write is the empty-list one, and it is
// the test this predicate exists for: an optional field treated as required
// turns a healthy backend over an unseeded database into `unreadable-body`,
// which the page renders as "something answered here and it was not this
// service".

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

const PROVENANCE = {
  profile: { source: "curated", retrievedAt: "2026-09-05T00:00:00.000Z" },
  classification: {
    source: "curated",
    retrievedAt: "2026-09-05T00:00:00.000Z",
  },
} as const;

const COVERAGE = {
  symbol: "NVDA",
  timeframe: "1m",
  start: "2025-09-08T13:30:00.000Z",
  end: "2026-09-04T20:00:00.000Z",
  barCount: 97530,
} as const;

const FULL: SecuritiesResponse = {
  securities: [NVDA],
  provenance: PROVENANCE,
  coverage: [COVERAGE],
};

describe("isSecuritiesResponse", () => {
  it("accepts the ordinary response", () => {
    expect(isSecuritiesResponse(FULL)).toBe(true);
  });

  // The reason this predicate is not a one-liner. An empty universe carries no
  // provenance because there is nothing to attribute, and requiring the field
  // would make a migrated-but-unseeded database indistinguishable from a host
  // that is not this API.
  it("accepts an empty list with no provenance", () => {
    expect(isSecuritiesResponse({ securities: [], coverage: [] })).toBe(true);
  });

  // The other producer of an absent `provenance`, and it arrives in Story 2.7:
  // once Alpaca fills the profile fields on some rows and not others, the
  // server stops making a claim about the whole list. A client that refused
  // that body would go dark on the day the data got better.
  it("accepts a populated list with no provenance", () => {
    expect(
      isSecuritiesResponse({ securities: [NVDA], coverage: [COVERAGE] }),
    ).toBe(true);
  });

  it("accepts unknown extra keys, because a newer server is a version skew", () => {
    expect(isSecuritiesResponse({ ...FULL, generatedAt: "soon" })).toBe(true);
  });

  it.each([
    ["a non-object", "securities"],
    ["null", null],
    ["a missing list", { provenance: PROVENANCE, coverage: [] }],
    ["a list that is not an array", { securities: NVDA, coverage: [] }],
    [
      "an element that is not a security",
      { securities: [NVDA, { a: 1 }], coverage: [] },
    ],
    // Required rather than optional, unlike `provenance`, and this is the
    // assertion that says so: the ledger either has rows or it does not, and an
    // absent field would give "we hold nothing" a second spelling.
    ["a missing coverage array", { securities: [NVDA] }],
    ["a coverage that is not an array", { securities: [NVDA], coverage: {} }],
    [
      "a coverage record missing its window",
      { securities: [NVDA], coverage: [{ ...COVERAGE, end: undefined }] },
    ],
    [
      "a coverage record whose bar count is a string",
      { securities: [NVDA], coverage: [{ ...COVERAGE, barCount: "97530" }] },
    ],
    // The one field checked against its vocabulary rather than its type, for
    // `isApiError`'s reason: a discriminator a caller switches on is not the
    // same kind of thing as a value it renders.
    [
      "a coverage record at a timeframe this bundle has no word for",
      { securities: [NVDA], coverage: [{ ...COVERAGE, timeframe: "5m" }] },
    ],
  ])("rejects %s", (_label, value) => {
    expect(isSecuritiesResponse(value)).toBe(false);
  });

  // Present-and-wrong is the case absence must not be confused with: a body
  // that tried to say where the rows came from and failed is malformed, where
  // one that said nothing is complete.
  it.each([
    ["a provenance that is not an object", "curated"],
    ["a provenance missing a group", { profile: PROVENANCE.profile }],
    [
      "a group missing its retrieval time",
      { ...PROVENANCE, classification: { source: "curated" } },
    ],
  ])("rejects %s", (_label, provenance) => {
    expect(
      isSecuritiesResponse({ securities: [NVDA], coverage: [], provenance }),
    ).toBe(false);
  });

  // The whole point of the array check, and the case a `length > 0` shortcut
  // would miss: one bad row in a hundred good ones is still a body this client
  // cannot trust.
  it("rejects a single bad row among good ones", () => {
    const securities = [NVDA, { ...NVDA, kind: "commodity" }, NVDA];
    expect(isSecuritiesResponse({ securities, coverage: [] })).toBe(false);
  });
});
