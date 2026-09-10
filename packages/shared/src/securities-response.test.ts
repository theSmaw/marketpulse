import { describe, expect, it } from "vitest";

import { isSecuritiesResponse } from "./securities-response.js";
import type { SecuritiesResponse } from "./securities-response.js";
import { toMarketDate } from "./market-time.js";
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

// `toMarketDate` rather than a bare string literal, because {@link MarketDate}
// is branded: a cast here would assert a check that never happened, and the
// predicate under test is the thing that check exists for.
const LAST_CLOSE = {
  symbol: "NVDA",
  session: toMarketDate("2026-09-04"),
  close: 230.36,
  previousClose: 228.45,
} as const;

const FULL: SecuritiesResponse = {
  securities: [NVDA],
  provenance: PROVENANCE,
  coverage: [COVERAGE],
  lastCloses: [LAST_CLOSE],
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
    expect(
      isSecuritiesResponse({ securities: [], coverage: [], lastCloses: [] }),
    ).toBe(true);
  });

  // The other producer of an absent `provenance`, and it arrives in Story 2.7:
  // once Alpaca fills the profile fields on some rows and not others, the
  // server stops making a claim about the whole list. A client that refused
  // that body would go dark on the day the data got better.
  it("accepts a populated list with no provenance", () => {
    expect(
      isSecuritiesResponse({
        securities: [NVDA],
        coverage: [COVERAGE],
        lastCloses: [LAST_CLOSE],
      }),
    ).toBe(true);
  });

  it("accepts unknown extra keys, because a newer server is a version skew", () => {
    expect(isSecuritiesResponse({ ...FULL, generatedAt: "soon" })).toBe(true);
  });

  it.each([
    ["a non-object", "securities"],
    ["null", null],
    [
      "a missing list",
      { provenance: PROVENANCE, coverage: [], lastCloses: [] },
    ],
    [
      "a list that is not an array",
      { securities: NVDA, coverage: [], lastCloses: [] },
    ],
    [
      "an element that is not a security",
      { securities: [NVDA, { a: 1 }], coverage: [], lastCloses: [] },
    ],
    // Required rather than optional, unlike `provenance`, and this is the
    // assertion that says so: the ledger either has rows or it does not, and an
    // absent field would give "we hold nothing" a second spelling.
    ["a missing coverage array", { securities: [NVDA], lastCloses: [] }],
    [
      "a coverage that is not an array",
      { securities: [NVDA], coverage: {}, lastCloses: [] },
    ],
    [
      "a coverage record missing its window",
      {
        securities: [NVDA],
        coverage: [{ ...COVERAGE, end: undefined }],
        lastCloses: [],
      },
    ],
    [
      "a coverage record whose bar count is a string",
      {
        securities: [NVDA],
        coverage: [{ ...COVERAGE, barCount: "97530" }],
        lastCloses: [],
      },
    ],
    // The one field checked against its vocabulary rather than its type, for
    // `isApiError`'s reason: a discriminator a caller switches on is not the
    // same kind of thing as a value it renders.
    [
      "a coverage record at a timeframe this bundle has no word for",
      {
        securities: [NVDA],
        coverage: [{ ...COVERAGE, timeframe: "5m" }],
        lastCloses: [],
      },
    ],
    // Required for `coverage`'s reason: the store either holds daily bars or it
    // does not, and an absent field would give "we hold none yet" a second
    // spelling.
    ["a missing lastCloses array", { securities: [NVDA], coverage: [] }],
    [
      "a lastCloses that is not an array",
      { securities: [NVDA], coverage: [], lastCloses: {} },
    ],
    // The branded field, and the reason this predicate does not simply check
    // for a string: `MarketDate` asserts that a check happened, so a body whose
    // session is an instant — the shape `coverage` uses one field along — must
    // be refused here rather than carried into `marketDateAt`'s callers.
    [
      "a close whose session is an instant rather than a market date",
      {
        securities: [NVDA],
        coverage: [],
        lastCloses: [{ ...LAST_CLOSE, session: "2026-09-04T20:00:00.000Z" }],
      },
    ],
    [
      "a close whose session is not a date at all",
      {
        securities: [NVDA],
        coverage: [],
        lastCloses: [{ ...LAST_CLOSE, session: "yesterday" }],
      },
    ],
    // A price that arrived as the string `pg` hands back for a `numeric`. It
    // renders, it sorts wrongly, and no arithmetic on it throws — which is
    // exactly why the predicate checks the type rather than the truthiness.
    [
      "a close whose price is a string",
      {
        securities: [NVDA],
        coverage: [],
        lastCloses: [{ ...LAST_CLOSE, close: "230.36" }],
      },
    ],
    // `null` is the honest single-session answer; `undefined` is a server that
    // has never heard of the field.
    [
      "a close whose previous is absent rather than null",
      {
        securities: [NVDA],
        coverage: [],
        lastCloses: [{ ...LAST_CLOSE, previousClose: undefined }],
      },
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
      isSecuritiesResponse({
        securities: [NVDA],
        coverage: [],
        lastCloses: [],
        provenance,
      }),
    ).toBe(false);
  });

  // The single-session case, which is §36's "partial answer" one field wide.
  // A security we hold one daily bar for has a close and no comparison, and
  // that is a correct body rather than a malformed one — the null must not be
  // spelled as a zero, which would render as an infinite move.
  it("accepts a close with no previous session", () => {
    expect(
      isSecuritiesResponse({
        ...FULL,
        lastCloses: [{ ...LAST_CLOSE, previousClose: null }],
      }),
    ).toBe(true);
  });

  // The whole point of the array check, and the case a `length > 0` shortcut
  // would miss: one bad row in a hundred good ones is still a body this client
  // cannot trust.
  it("rejects a single bad row among good ones", () => {
    const securities = [NVDA, { ...NVDA, kind: "commodity" }, NVDA];
    expect(
      isSecuritiesResponse({ securities, coverage: [], lastCloses: [] }),
    ).toBe(false);
  });
});
