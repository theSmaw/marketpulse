import { describe, expect, it } from "vitest";

import { chromeAlreadyNames } from "./feed-claim.js";

// `PROVENANCE.md` §1.3's suppression rule, in one place and with the direction
// asserted rather than described: **suppression requires a positive match.**

describe("chromeAlreadyNames", () => {
  it("is a match when the chrome names this one feed", () => {
    expect(
      chromeAlreadyNames(["iex"], { state: "configured", feed: "iex" }),
    ).toBe(true);
  });

  it("is not a match when the chrome names a different feed", () => {
    expect(
      chromeAlreadyNames(["iex"], { state: "configured", feed: "sip" }),
    ).toBe(false);
  });

  it("is not a match when the chrome claims no feed at all", () => {
    // The default deployment: `MARKET_DATA_PROVIDER` defaults to `none`, the
    // chrome reads `NOT CONFIGURED`, and the store serves numbers regardless.
    // Suppressing here would leave a screen of prices with no statement
    // anywhere of which venues are in them.
    expect(chromeAlreadyNames(["iex"], { state: "not-configured" })).toBe(
      false,
    );
    expect(chromeAlreadyNames(["iex"], { state: "unknown" })).toBe(false);
  });

  it("is never a match for more than one feed", () => {
    // The case invariant 6 exists for. One page-level label is wrong about
    // part of the picture, whatever the chrome is configured with.
    expect(
      chromeAlreadyNames(["sip", "iex"], { state: "configured", feed: "iex" }),
    ).toBe(false);
  });

  it("suppresses while the answer is in flight, which is the one exception", () => {
    expect(chromeAlreadyNames(["iex"], { state: "checking" })).toBe(true);
  });

  it("answers true for no feeds, because there is nothing to name", () => {
    expect(chromeAlreadyNames([], { state: "not-configured" })).toBe(true);
  });
});
