import { PROVIDER_IDS } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  type Config,
  loadConfig,
  MARKET_DATA_PROVIDER_SELECTIONS,
} from "./config.js";
import { createMarketDataProvider, resolveMarketData } from "./market-data.js";

describe("the provider selection vocabulary", () => {
  it("is `none` plus every ProviderId, derived rather than restated", () => {
    // Derived, so Story 2.7 adding its own member to `PROVIDER_IDS` makes it
    // selectable without an edit to config.ts — and makes
    // `createMarketDataProvider`'s exhaustive switch fail the build until
    // somebody wires it up, rather than shipping a configuration value the
    // operator can set and nothing can honour.
    expect([...MARKET_DATA_PROVIDER_SELECTIONS]).toStrictEqual([
      "none",
      ...PROVIDER_IDS,
    ]);
  });

  it("defaults to the LOUD one", () => {
    // The safety decision in this story. A backend serving fixture bars is
    // serving invented prices — §35's "manufacture missing observations" — so a
    // default that quietly works is one that quietly ships fabricated data.
    // Task 1.8.3's CORS_ORIGIN note: a default that is convenient in
    // development is a decision about production.
    expect(loadConfig({}).marketDataProvider).toBe("none");
  });

  it("refuses a value that is not one of them, naming the set", () => {
    expect(() => loadConfig({ MARKET_DATA_PROVIDER: "alpaka" })).toThrow(
      /MARKET_DATA_PROVIDER must be one of none, fixture/,
    );
  });
});

describe("createMarketDataProvider", () => {
  it("returns ABSENCE for `none` rather than a null object", () => {
    // The decision, and the argument is in market-data.ts: there is no
    // `BarsResult` member meaning "no provider is configured", because that is
    // a fact about our deployment rather than about the world. Answering
    // `upstream-unavailable` would be a configuration fault wearing a transient
    // fault's costume, which a retry wrapper would then retry forever; a null
    // object that throws is "a method left throwing".
    expect(createMarketDataProvider("none")).toBeUndefined();
  });

  it("returns a provider that reports its own id for `fixture`", () => {
    expect(createMarketDataProvider("fixture")?.id).toBe("fixture");
  });

  it("builds a fresh provider each time rather than sharing one", () => {
    expect(createMarketDataProvider("fixture")).not.toBe(
      createMarketDataProvider("fixture"),
    );
  });
});

describe("resolveMarketData", () => {
  it("keeps the SELECTION alongside the provider, because only one survives `none`", () => {
    // Task 2.6.7 renders "which provider is configured", and under `none` there
    // is no provider object to ask — so the configuration value is the source
    // of that answer and not `MarketDataProvider.id`.
    const none = resolveMarketData(config("none"));
    expect(none.selection).toBe("none");
    expect(none.provider).toBeUndefined();

    const fixture = resolveMarketData(config("fixture"));
    expect(fixture.selection).toBe("fixture");
    expect(fixture.provider?.id).toBe("fixture");
  });
});

function config(marketDataProvider: "none" | "fixture"): Config {
  return loadConfig({ MARKET_DATA_PROVIDER: marketDataProvider });
}
