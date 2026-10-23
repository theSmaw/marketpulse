import {
  COMPOSITE_FACTORS,
  FACTOR_WEIGHTS,
  scoreAnomaly,
  toWireAnomalyScore,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  NO_SCORE,
  SCORE_DISCLAIMER,
  SCORE_LABEL,
  SCORE_SCALE,
  anomalyScoreBand,
} from "./anomaly-score.js";

import type {
  FactorAnswer,
  WireAnomalyOutcome,
  WireMarketOverview,
  WireMeasuredReturn,
} from "@marketpulse/shared";
import type { SymbolReturnView } from "./live-feed.js";

// The composite score's words (Task 5.6.5).
//
// **Every score below is produced by the SHIPPED SCORER** rather than typed,
// which is what makes an assertion about the drawn ledger an assertion about
// the product: a hand-written `contribution: 38` beside `rank: 95` would make
// the addition close in the fixture and prove nothing about the arithmetic.

const MEASURED: WireMeasuredReturn = {
  measured: true,
  percent: 0.42,
  from: { at: "2026-10-14T18:01:00.000Z", price: 119, feed: "iex" },
  to: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 3,
  spanMinutes: 5,
  percentile: null,
};

const ranked = (rank: number): FactorAnswer => ({
  state: "ranked",
  rank,
  aboveSample: false,
  sampleCount: 4620,
});

const refused = (): FactorAnswer => ({
  state: "refused",
  refusal: "no-subject-move",
  sampleCount: 0,
  minimumSampleCount: 2500,
});

const NO_DISTRIBUTION: FactorAnswer = { state: "no-distribution" };

const scored = (
  price: FactorAnswer,
  excess: FactorAnswer,
  volume: FactorAnswer = NO_DISTRIBUTION,
): WireAnomalyOutcome =>
  toWireAnomalyScore(scoreAnomaly({ price, excess, volume }));

const held = (
  score: WireAnomalyOutcome | null,
  symbol = "NVDA",
): SymbolReturnView => ({
  symbol,
  figure: MEASURED,
  volume: null,
  score,
});

const BREADTH: WireMarketOverview = {
  computedAt: "2026-10-13T18:01:00.000Z",
  feeds: ["iex"],
  figures: [],
  sectors: [],
  breadth: {
    basis: "observed",
    windowMinutes: 5,
    advancing: 312,
    declining: 140,
    unchanged: 14,
    measured: 466,
    tracked: 501,
  },
};

describe("anomalyScoreBand", () => {
  describe("the score and its band", () => {
    it("draws the figure, the scale and the band word", () => {
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(ranked(95), ranked(66))),
        undefined,
      );

      expect(band.score).toBe("61");
      expect(band.scale).toBe(SCORE_SCALE);
      expect(band.band).toBe("elevated");
      expect(band.label).toBe(SCORE_LABEL);
    });

    it("states both the count and the maximum, because the count alone is not a fact about coverage", () => {
      // AC 3's own amendment: with the volume factor permanently unrankable,
      // `2 of 3` has three different maxima depending on WHICH two.
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(ranked(95), ranked(66))),
        undefined,
      );

      expect(band.summary).toBe("2 of 3 factors contributing · max 75");
    });

    it("never renormalises the maximum onto the scale", () => {
      // One factor, maximum 35 — and the denominator beside the figure is
      // still `/ 100`. `35 / 35` would be AC 3's renormalisation arriving in
      // the denominator, and it would invalidate all three measured band
      // floors on the day it shipped.
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(refused(), ranked(99))),
        undefined,
      );

      expect(band.score).toBe("35");
      expect(band.scale).toBe("/ 100");
      expect(band.summary).toBe("1 of 3 factors contributing · max 35");
    });
  });

  describe("the ledger", () => {
    it("holds one row per factor plus breadth, in the scorer's own order, in every presence vector", () => {
      // **Fixed arity is how a variable account reserves its room.** The
      // clause set is total over the factors, so `3 of 3` and `0 of 3` have
      // the same number of rows — which is what makes them the same height.
      const names = (outcome: WireAnomalyOutcome) =>
        anomalyScoreBand("NVDA", held(outcome), undefined).rows.map(
          (row) => row.factor,
        );

      const all = ["Price", "Relative move", "Volume", "Breadth"];

      expect(names(scored(ranked(95), ranked(66), ranked(50)))).toStrictEqual(
        all,
      );
      expect(names(scored(ranked(95), ranked(66)))).toStrictEqual(all);
      expect(names(scored(refused(), refused()))).toStrictEqual(all);
      expect(all).toHaveLength(COMPOSITE_FACTORS.length + 1);
    });

    it("publishes each factor's weight, which is AC 2's whole point", () => {
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(ranked(95), ranked(66))),
        undefined,
      );

      expect(band.rows.map((row) => row.weight)).toStrictEqual([
        String(FACTOR_WEIGHTS.price),
        String(FACTOR_WEIGHTS.excess),
        String(FACTOR_WEIGHTS.volume),
        // Breadth has no weight, and the cell is blank room rather than a
        // glyph: a `—` in a column of figures asserts a value.
        "",
      ]);
    });

    it("sums its contributions to the score above it", () => {
      // **The addition closes on screen**, read off the drawn cells rather
      // than off the wire — which is the one thing a reader can check by eye,
      // and the reason the combination rule is a weighted sum at all.
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(ranked(95), ranked(66))),
        undefined,
      );

      const drawn = band.rows
        .map((row) => row.contributed)
        .filter((cell) => cell !== undefined)
        .map(Number);

      expect(drawn).toStrictEqual([38, 23]);
      expect(drawn.reduce((a, b) => a + b, 0)).toBe(Number(band.score));
    });

    it("gives a refused factor words instead of a figure, never a dash", () => {
      // `—` is `unchanged` in `PriceChange`, so a dash where a contribution
      // goes asserts that the factor contributed zero.
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(refused(), ranked(99))),
        undefined,
      );

      const price = band.rows[0];
      expect(price?.contributed).toBeUndefined();
      expect(price?.reason).toBe("no move for this name");
      expect(band.rows.map((row) => row.contributed ?? "")).not.toContain("—");
    });

    it("tells a question that does not arise from one that was refused", () => {
      const band = anomalyScoreBand(
        "XLK",
        held(
          scored(ranked(95), {
            state: "inapplicable",
            because: "is-benchmark",
          }),
          "XLK",
        ),
        undefined,
      );

      expect(band.rows[1]?.reason).toBe("it is the benchmark");
    });

    it("says the volume factor has no history to rank against, which is every machine's state", () => {
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(ranked(95), ranked(66))),
        undefined,
      );

      expect(band.rows[2]?.reason).toBe("no history to rank it");
    });

    it("keeps every reason inside the cell's 24 characters", () => {
      // The budget is the measured one: with the reason in the contributed
      // column the cell is ~185 px at the rail's narrowest 308 px, and a
      // sentence over it wraps — which would make the ledger's height a
      // function of the viewport.
      const long = [
        scored(refused(), refused()),
        scored(
          {
            state: "refused",
            refusal: "split-discontinuity",
            sampleCount: 4620,
            minimumSampleCount: 2500,
          },
          {
            state: "refused",
            refusal: "reference-split-discontinuity",
            sampleCount: 4620,
            minimumSampleCount: 2500,
          },
        ),
        scored(
          {
            state: "refused",
            refusal: "too-few-samples",
            sampleCount: 0,
            minimumSampleCount: 2500,
          },
          {
            state: "refused",
            refusal: "mixed-basis",
            sampleCount: 0,
            minimumSampleCount: 2500,
          },
        ),
        scored(ranked(95), { state: "inapplicable", because: "no-sector" }),
      ];

      for (const outcome of long) {
        for (const row of anomalyScoreBand("NVDA", held(outcome), undefined)
          .rows) {
          expect(row.reason?.length ?? 0).toBeLessThanOrEqual(24);
        }
      }
    });
  });

  describe("no score", () => {
    it("draws words rather than a zero, because a zero is a claim about the security", () => {
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(refused(), refused())),
        undefined,
      );

      expect(band.score).toBeUndefined();
      expect(band.band).toBeUndefined();
      expect(band.absent).toBe(NO_SCORE);
      expect(band.absent).not.toMatch(/\d/u);
      expect(band.summary).toBe("0 of 3 factors contributing");
    });

    it("disclaims nothing where there is no figure", () => {
      // There is nothing to disclaim over a refusal — the room stays and the
      // ink does not, which is what keeps `0 of 3` the same height as
      // `3 of 3`.
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(refused(), refused())),
        undefined,
      );

      expect(band.disclaimer).toBeUndefined();
    });

    it("still draws the whole ledger, so the explanation is total over the factors", () => {
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(refused(), refused())),
        undefined,
      );

      expect(band.rows).toHaveLength(4);
      expect(band.rows.every((row) => row.contributed === undefined)).toBe(
        true,
      );
    });
  });

  describe("AC 11", () => {
    it("says what the figure is not, in two places and in neither the source note", () => {
      const band = anomalyScoreBand(
        "NVDA",
        held(scored(ranked(95), ranked(66))),
        undefined,
      );

      expect(band.label).toBe("How unusual · not a risk measure");
      expect(band.disclaimer).toBe(SCORE_DISCLAIMER);
      expect(band.disclaimer).toMatch(/not of risk or opportunity/u);
    });
  });

  describe("the breadth clause", () => {
    // **The clause belongs to the score's explanation**, so it is drawn beside
    // a score and not on its own: a gateway that sent no score at all gets the
    // band's reserved room and no ink, breadth included (ADR 0029's defer
    // rule), which is asserted below under *what it refuses to draw*.
    const SCORED = held(scored(ranked(95), ranked(66)));

    it("states the count against the population it was counted over", () => {
      // **`measured`, never `tracked`.** 312 is counted over the securities we
      // heard from, and stating it against the 501 we track would be a count
      // over one set wearing another's denominator.
      const band = anomalyScoreBand("NVDA", SCORED, BREADTH);

      expect(band.context).toBe(
        "Breadth: 312 of 466 advancing, heard from in the last 5 minutes.",
      );
    });

    it("reads the window off the frame rather than spelling one", () => {
      const band = anomalyScoreBand("NVDA", SCORED, {
        ...BREADTH,
        breadth: { ...BREADTH.breadth, basis: "observed", windowMinutes: 15 },
      } as WireMarketOverview);

      expect(band.context).toMatch(/the last 15 minutes/u);
    });

    it("names the session where the count is a session's", () => {
      const band = anomalyScoreBand("NVDA", SCORED, {
        ...BREADTH,
        breadth: {
          basis: "session",
          session: "2026-09-11",
          advancing: 334,
          declining: 160,
          unchanged: 7,
          measured: 501,
          tracked: 501,
        },
      });

      expect(band.context).toBe(
        "Breadth: 334 of 501 advancing, with a close on 2026-09-11.",
      );
    });

    it("says nothing was heard rather than printing a zero denominator", () => {
      const band = anomalyScoreBand("NVDA", SCORED, {
        ...BREADTH,
        breadth: {
          basis: "observed",
          windowMinutes: 5,
          advancing: 0,
          declining: 0,
          unchanged: 0,
          measured: 0,
          tracked: 501,
        },
      });

      expect(band.context).toBe(
        "Breadth: nothing heard from in the last 5 minutes.",
      );
    });

    it("draws nothing at all where no aggregate has arrived", () => {
      expect(anomalyScoreBand("NVDA", SCORED, undefined).context).toBe(
        undefined,
      );
    });
  });

  describe("what it refuses to draw", () => {
    it("draws no score for another security, which is the navigation window", () => {
      // The gateway answers the focus a browser last declared, so for one
      // subscribe round trip after moving from NVDA to AMD the last frame is
      // NVDA's. A score under the wrong name is the worst figure on this page,
      // because it is a verdict rather than a reading.
      const band = anomalyScoreBand(
        "AMD",
        held(scored(ranked(95), ranked(66))),
        BREADTH,
      );

      expect(band.score).toBeUndefined();
      expect(band.rows).toStrictEqual([]);
      expect(band.context).toBeUndefined();
    });

    it("draws the band's room and no ink where the gateway sent no score", () => {
      // ADR 0029's defer rule: we were not told there is an absence, so a
      // sentence explaining one would be a claim of its own. It is NOT the
      // same state as `scored: false`, which has one clause per factor.
      const band = anomalyScoreBand("NVDA", held(null), BREADTH);

      expect(band.score).toBeUndefined();
      expect(band.absent).toBeUndefined();
      expect(band.summary).toBeUndefined();
      expect(band.rows).toStrictEqual([]);
      expect(band.label).toBe(SCORE_LABEL);
    });

    it("draws nothing before the first frame", () => {
      const band = anomalyScoreBand("NVDA", undefined, BREADTH);

      expect(band.score).toBeUndefined();
      expect(band.rows).toStrictEqual([]);
    });
  });
});
