import { describe, expect, it } from "vitest";

import type { TopologyEdge } from "@marketpulse/shared";
import { toTicker } from "@marketpulse/shared";

import {
  CORRELATION_EDGE_WIDTH,
  CORRELATION_STRENGTH_FLOORS,
  correlationStrength,
  edgeStrength,
} from "./edge-strength.js";

const correlationEdge = (weight: number): TopologyEdge => ({
  from: toTicker("AAA"),
  to: toTicker("BBB"),
  kind: "return_correlation",
  weight,
});

describe("the measured floors", () => {
  /**
   * **Story 6.6's acceptance criterion 4 asks for a test that the number is
   * right**, the `ANOMALY_BAND_FLOORS` / `BASELINE_MINIMUM_SAMPLE = 2500`
   * shape. "Right" here means *the tertiles of the one real generation*, and
   * the figures are the verbatim output of the query recorded in Task 6.6.1 —
   * so a later edit that nudges a floor to a rounder number fails here rather
   * than passing silently, which is the whole difference between a derived
   * constant and a chosen one.
   */
  it("are the measured tertiles of the real retained set, to four places", () => {
    const measuredLowerTertile = 0.41393433333333335;
    const measuredUpperTertile = 0.5495806666666667;

    expect(CORRELATION_STRENGTH_FLOORS.moderate).toBe(
      Math.round(measuredLowerTertile * 1e4) / 1e4,
    );
    expect(CORRELATION_STRENGTH_FLOORS.strong).toBe(
      Math.round(measuredUpperTertile * 1e4) / 1e4,
    );
  });

  it("sit inside the measured span of |r|, both ends", () => {
    const measuredMinimum = 0.089867;
    const measuredMaximum = 0.99024;

    for (const floor of Object.values(CORRELATION_STRENGTH_FLOORS)) {
      expect(floor).toBeGreaterThan(measuredMinimum);
      expect(floor).toBeLessThan(measuredMaximum);
    }
  });

  it("are ordered, so the three classes are reachable in one pass", () => {
    expect(CORRELATION_STRENGTH_FLOORS.moderate).toBeLessThan(
      CORRELATION_STRENGTH_FLOORS.strong,
    );
  });
});

describe("the three widths", () => {
  /**
   * **AC 5's floor, as a number.** 1 is `context.lineWidth = 1`, the stroke
   * every retained edge has drawn at since Task 6.5.2 — so this assertion
   * fails the moment somebody fades the weakest class, which is the one
   * change this encoding is forbidden to make.
   */
  it("put the weakest class at exactly today's shipped 1 px stroke", () => {
    expect(CORRELATION_EDGE_WIDTH.weak).toBe(1);
  });

  it("increase strictly with strength, so weight reads as weight", () => {
    expect(CORRELATION_EDGE_WIDTH.weak).toBeLessThan(
      CORRELATION_EDGE_WIDTH.moderate,
    );
    expect(CORRELATION_EDGE_WIDTH.moderate).toBeLessThan(
      CORRELATION_EDGE_WIDTH.strong,
    );
  });

  /**
   * The ceiling's own bound, from the dash rhythm rather than from taste: a
   * `[3, 2]` dash at a width above its own 3 px `on` length is a run of
   * squares or a bead rather than a dash, and the mark would stop being the
   * one `CORRELATION_EDGE_DASH` derived.
   */
  it("keep every width below the dash's own 3 px on-length", () => {
    for (const width of Object.values(CORRELATION_EDGE_WIDTH)) {
      expect(width).toBeLessThan(3);
    }
  });
});

describe("classifying a stored coefficient", () => {
  it("files each tertile band in its own class", () => {
    expect(correlationStrength(0.089867)).toBe("weak");
    expect(correlationStrength(0.3)).toBe("weak");
    expect(correlationStrength(0.45)).toBe("moderate");
    expect(correlationStrength(0.5)).toBe("moderate");
    expect(correlationStrength(0.7)).toBe("strong");
    expect(correlationStrength(0.99024)).toBe("strong");
  });

  it("includes each floor in the class above it", () => {
    expect(correlationStrength(CORRELATION_STRENGTH_FLOORS.moderate)).toBe(
      "moderate",
    );
    expect(correlationStrength(CORRELATION_STRENGTH_FLOORS.strong)).toBe(
      "strong",
    );
  });

  it("excludes the value just below each floor", () => {
    expect(
      correlationStrength(CORRELATION_STRENGTH_FLOORS.moderate - 1e-9),
    ).toBe("weak");
    expect(correlationStrength(CORRELATION_STRENGTH_FLOORS.strong - 1e-9)).toBe(
      "moderate",
    );
  });

  /**
   * **Sign is refused as a channel and this is the assertion that holds it.**
   * The real retained set carries exactly one negative pair — `AES`/`ERIE` at
   * `r = −0.105952`, 1 of 1,860 — and it draws at the width its magnitude
   * earns, which is `weak`. The symmetric pair below is the general claim: an
   * encoding that started reading the sign fails here.
   */
  it("classifies on the magnitude, so a negative pair draws by strength", () => {
    expect(correlationStrength(-0.105952)).toBe("weak");

    for (const magnitude of [0.1, 0.45, 0.9]) {
      expect(correlationStrength(-magnitude)).toBe(
        correlationStrength(magnitude),
      );
    }
  });
});

describe("classifying an edge", () => {
  it("answers a class for a measured edge", () => {
    expect(edgeStrength(correlationEdge(0.9))).toBe("strong");
    expect(edgeStrength(correlationEdge(0.1))).toBe("weak");
  });

  it("answers null for both curated kinds, which carry no weight", () => {
    const membership: TopologyEdge = {
      from: toTicker("XLK"),
      to: toTicker("AAPL"),
      kind: "sector_membership",
    };
    const hub: TopologyEdge = {
      from: toTicker("SPY"),
      to: toTicker("XLK"),
      kind: "index_membership",
    };

    expect(edgeStrength(membership)).toBeNull();
    expect(edgeStrength(hub)).toBeNull();
  });
});
