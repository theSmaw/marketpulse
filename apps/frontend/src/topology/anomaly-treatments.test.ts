import { describe, expect, it } from "vitest";

import { toTicker } from "@marketpulse/shared";
import type { WireAnomalyBands } from "@marketpulse/shared";

import {
  anomalyTreatmentsFromWire,
  unscoredAnomalyTreatments,
} from "./anomaly-treatments.js";

const COHORT: WireAnomalyBands["cohort"] = {
  factors: ["price", "excess"],
  max: 75,
  scored: 3,
  others: 0,
};

describe("anomalyTreatmentsFromWire — Task 6.3.3", () => {
  it("reads elevated/high/extreme into the map, by band", () => {
    const bands: WireAnomalyBands = {
      normal: ["AAPL"],
      elevated: ["MSFT"],
      high: ["NVDA"],
      extreme: ["TSLA"],
      cohort: { ...COHORT, scored: 4 },
    };

    const treatments = anomalyTreatmentsFromWire(bands);

    expect(treatments.get(toTicker("MSFT"))).toBe("elevated");
    expect(treatments.get(toTicker("NVDA"))).toBe("high");
    expect(treatments.get(toTicker("TSLA"))).toBe("extreme");
  });

  it("never writes an entry for a normal symbol — absence IS normal, by setBands' own contract", () => {
    const bands: WireAnomalyBands = {
      normal: ["AAPL", "AMD"],
      elevated: [],
      high: [],
      extreme: [],
      cohort: { ...COHORT, scored: 2 },
    };

    const treatments = anomalyTreatmentsFromWire(bands);

    expect(treatments.size).toBe(0);
    expect(treatments.has(toTicker("AAPL"))).toBe(false);
  });

  it("drops a malformed symbol rather than throwing — a throw inside the caller's effect would blank the page", () => {
    const bands: WireAnomalyBands = {
      normal: [],
      elevated: ["not a ticker", "MSFT"],
      high: [],
      extreme: [],
      cohort: { ...COHORT, scored: 2 },
    };

    expect(() => anomalyTreatmentsFromWire(bands)).not.toThrow();
    const treatments = anomalyTreatmentsFromWire(bands);

    expect(treatments.size).toBe(1);
    expect(treatments.get(toTicker("MSFT"))).toBe("elevated");
  });

  it("returns an empty map for an all-empty section", () => {
    const bands: WireAnomalyBands = {
      normal: [],
      elevated: [],
      high: [],
      extreme: [],
      cohort: { ...COHORT, scored: 0 },
    };

    expect(anomalyTreatmentsFromWire(bands).size).toBe(0);
  });
});

describe("unscoredAnomalyTreatments — Task 6.3.3, AC 4's fallback", () => {
  it("maps every given symbol to unscored", () => {
    const equities = [toTicker("AAPL"), toTicker("MSFT"), toTicker("NVDA")];

    const treatments = unscoredAnomalyTreatments(equities);

    expect(treatments.size).toBe(3);
    for (const symbol of equities) {
      expect(treatments.get(symbol)).toBe("unscored");
    }
  });

  it("returns an empty map for an empty population", () => {
    expect(unscoredAnomalyTreatments([]).size).toBe(0);
  });
});
