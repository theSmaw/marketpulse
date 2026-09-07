import { describe, expect, it } from "vitest";

import { MARKET_FEEDS } from "./market-provenance.js";
import { isMarketDataResponse } from "./market-data-response.js";
import type { MarketDataResponse } from "./market-data-response.js";

describe("isMarketDataResponse", () => {
  it("accepts every feed the vocabulary admits", () => {
    for (const feed of MARKET_FEEDS) {
      expect(isMarketDataResponse({ feed })).toBe(true);
    }
  });

  it("accepts a null feed, which is how no provider configured is spelled", () => {
    expect(isMarketDataResponse({ feed: null })).toBe(true);
  });

  it("accepts unknown extra fields, because a newer server may grow a key", () => {
    expect(isMarketDataResponse({ feed: "iex", provider: "alpaca" })).toBe(
      true,
    );
  });

  // The half that is deliberately stricter than `isHealthResponse` — see the
  // module comment. A feed this client has no words for cannot be rendered
  // honestly, and both halves ship from one commit, so it is not the version
  // skew that predicate exists to tolerate.
  it("refuses a feed it has no words for", () => {
    expect(isMarketDataResponse({ feed: "otc" })).toBe(false);
  });

  it("refuses a missing feed", () => {
    expect(isMarketDataResponse({})).toBe(false);
  });

  // `routes/securities.ts` measured a nullable field declared plainly "string"
  // reaching the wire as the EMPTY STRING rather than as null. That is the
  // shape a serialiser bug produces here, so it is refused by name.
  it("refuses the empty string, which is what a mis-declared schema produces", () => {
    expect(isMarketDataResponse({ feed: "" })).toBe(false);
  });

  it("refuses a non-object, which is the string body a static host returns", () => {
    expect(isMarketDataResponse("<!doctype html>")).toBe(false);
    expect(isMarketDataResponse(null)).toBe(false);
    expect(isMarketDataResponse(undefined)).toBe(false);
  });

  it("narrows to the contract", () => {
    const value: unknown = { feed: "iex" };

    if (!isMarketDataResponse(value)) {
      expect.fail("a well-formed body should have been accepted");
    }

    const response: MarketDataResponse = value;
    expect(response.feed).toBe("iex");
  });
});
