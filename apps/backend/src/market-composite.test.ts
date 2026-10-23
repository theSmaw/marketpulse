// The composite's producer — the translation in front of the scorer (Task
// 5.6.4).
//
// ## What this file is the only level that can see
//
// `composite-score.test.ts` asserts the **arithmetic** over factor answers;
// nothing there knows where an answer comes from. This file asserts the
// **mapping**: that a refused 5-minute return becomes an absent price clause
// rather than a rank of zero, that the excess factor's three arms arrive as
// three different arms, and that the volume factor's answer does not depend on
// the volume. Those are the three places a `?? 0` or a collapsed arm would hide,
// and no browser suite can reach any of them — CI's store is 516 securities
// with zero bars, so every answer there is an absence.

import { describe, expect, it } from "vitest";

import { FACTOR_WEIGHTS, scoreAnomaly } from "@marketpulse/shared";

import {
  compositeAnomaly,
  excessFactorAnswer,
  priceFactorAnswer,
  volumeFactorAnswer,
} from "./market-composite.js";
import type { ExcessMoveFactor } from "./excess-move-factor.js";
import type { FiveMinuteReturn } from "./five-minute-return.js";
import type { BaselineComparison } from "./return-percentile.js";
import { BASELINE_FEED } from "./return-baseline-store.js";

const SOURCE = {
  provider: "alpaca",
  feed: BASELINE_FEED,
  retrievedAt: "2026-09-11T14:06:00.500Z",
  barCount: 1,
} as const;

const MEASURED: FiveMinuteReturn = {
  measured: true,
  percent: 1.25,
  from: {
    startsAt: new Date("2026-09-11T14:01:00Z"),
    close: 100,
    source: SOURCE,
  },
  to: {
    startsAt: new Date("2026-09-11T14:06:00Z"),
    close: 101.25,
    source: SOURCE,
  },
  observed: 5,
  spanMinutes: 5,
  volume: 50_000,
};

const NOTHING_OBSERVED: FiveMinuteReturn = {
  measured: false,
  refusal: "nothing-observed",
  seen: undefined,
};

const RANKABLE: BaselineComparison = {
  ranked: true,
  distribution: {
    breakpoints: Array.from({ length: 101 }, (_, rank) => rank / 10),
    sampleCount: 4_620,
    spanMinutes: 5,
    feed: BASELINE_FEED,
  },
};

const TOO_FEW: BaselineComparison = {
  ranked: false,
  refusal: "too-few-samples",
  sampleCount: 737,
  minimumSampleCount: 2_500,
};

const PERCENTILE = {
  rank: 99,
  aboveSample: false,
  sampleCount: 4_620,
  spanMinutes: 5,
  feed: BASELINE_FEED,
};

describe("the price factor's answer", () => {
  it("is ranked at the ordinal the percentile reported, and `n` is the sample's", () => {
    expect(
      priceFactorAnswer({
        figure: MEASURED,
        comparison: RANKABLE,
        percentile: PERCENTILE,
      }),
    ).toEqual({
      state: "ranked",
      rank: 99,
      aboveSample: false,
      sampleCount: 4_620,
    });
  });

  it("refuses `no-subject-move` when the return itself could not be measured", () => {
    // **The coarsening, declared.** The return's own three words —
    // `nothing-observed`, `no-earlier-endpoint`, `no-basis` — are not members
    // of `FactorRefusal`, and `no-subject-move` is the shipped word for this
    // exact fact. Nothing is lost that a reader can see: the fine word travels
    // on the same frame, on the `return` half.
    expect(
      priceFactorAnswer({
        figure: NOTHING_OBSERVED,
        comparison: TOO_FEW,
        percentile: undefined,
      }),
    ).toEqual({
      state: "refused",
      refusal: "no-subject-move",
      sampleCount: 737,
      minimumSampleCount: 2_500,
    });
  });

  it("states how much history it holds even where the FIGURE is what is missing", () => {
    // *How much did you have* is the first question asked of a refusal, and
    // the two facts are independent: we may hold 4,620 samples and no move.
    const answer = priceFactorAnswer({
      figure: NOTHING_OBSERVED,
      comparison: RANKABLE,
      percentile: undefined,
    });

    expect(answer.state === "refused" && answer.sampleCount).toBe(4_620);
  });

  it("carries the baseline's own refusal when the figure is fine", () => {
    expect(
      priceFactorAnswer({
        figure: MEASURED,
        comparison: {
          ranked: false,
          refusal: "split-discontinuity",
          sampleCount: 4_620,
          minimumSampleCount: 2_500,
        },
        percentile: undefined,
      }),
    ).toEqual({
      state: "refused",
      refusal: "split-discontinuity",
      sampleCount: 4_620,
      minimumSampleCount: 2_500,
    });
  });

  it("refuses rather than ranking a malformed distribution at zero", () => {
    // The database forbids a distribution that is not 101 points, so this arm
    // is a row written by something that is not this product's pass. **A rank
    // of `0` here would make it the least unusual security in the universe** —
    // Story 5.5's own defect class, and the reason there is no `?? 0`.
    const answer = priceFactorAnswer({
      figure: MEASURED,
      comparison: RANKABLE,
      percentile: undefined,
    });

    expect(answer.state).toBe("refused");
    expect(answer.state === "refused" && answer.refusal).toBe(
      "too-few-samples",
    );
  });
});

describe("the excess factor's answer", () => {
  it("carries the inapplicable arm across as its own arm", () => {
    const factor: ExcessMoveFactor = {
      scored: false,
      applies: false,
      because: "no-sector",
    };

    expect(excessFactorAnswer(factor)).toEqual({
      state: "inapplicable",
      because: "no-sector",
    });
  });

  it("carries a refusal with both of its numbers", () => {
    expect(
      excessFactorAnswer({
        scored: false,
        applies: true,
        refusal: "mixed-basis",
        sampleCount: 3_100,
        minimumSampleCount: 2_500,
      }),
    ).toEqual({
      state: "refused",
      refusal: "mixed-basis",
      sampleCount: 3_100,
      minimumSampleCount: 2_500,
    });
  });

  it("ranks on the percentile's ordinal and never on the signed excess", () => {
    // AC 4: the ordinal ranks the **magnitude**, so the sign is not
    // recoverable from it and the unit value cannot be a direction.
    const answer = excessFactorAnswer({
      scored: true,
      applies: true,
      excessPoints: -4.2,
      percentile: { ...PERCENTILE, rank: 93 },
      referenceSymbol: "XLK",
    });

    expect(answer).toEqual({
      state: "ranked",
      rank: 93,
      aboveSample: false,
      sampleCount: 4_620,
    });
  });
});

describe("the volume factor's answer", () => {
  it("is the payload-free arm, and it takes no argument at all", () => {
    // **The argument stated as a type.** `0015` stores a median and a
    // dispersion rather than a distribution, so no security has a rankable
    // volume figure and none will until a new nightly pass exists — the
    // absence is a fact about this product's stored aggregates rather than
    // about any security's coverage, so there is nothing to branch on.
    expect(volumeFactorAnswer()).toEqual({ state: "no-distribution" });
    expect(volumeFactorAnswer.length).toBe(0);
  });
});

describe("the composite", () => {
  it("is the scorer's answer over the three mapped answers, and nothing else", () => {
    // **The producer decides nothing.** Asserted against `scoreAnomaly` called
    // directly on the same three answers, so a shortcut, a clamp or a
    // re-rounding in this module would show as a difference.
    const price = {
      figure: MEASURED,
      comparison: RANKABLE,
      percentile: PERCENTILE,
    };
    const excess: ExcessMoveFactor = {
      scored: true,
      applies: true,
      excessPoints: 2.2,
      percentile: { ...PERCENTILE, rank: 93 },
      referenceSymbol: "XLK",
    };

    expect(compositeAnomaly({ price, excess })).toStrictEqual(
      scoreAnomaly({
        price: priceFactorAnswer(price),
        excess: excessFactorAnswer(excess),
        volume: volumeFactorAnswer(),
      }),
    );
  });

  it("scores two of three with the maximum that pair implies — AC 3", () => {
    const outcome = compositeAnomaly({
      price: { figure: MEASURED, comparison: RANKABLE, percentile: PERCENTILE },
      excess: {
        scored: true,
        applies: true,
        excessPoints: 2.2,
        percentile: { ...PERCENTILE, rank: 93 },
        referenceSymbol: "XLK",
      },
    });

    if (!outcome.scored) throw new Error("expected a scored outcome");
    expect(outcome.max).toBe(FACTOR_WEIGHTS.price + FACTOR_WEIGHTS.excess);
    expect(outcome.absent.map((clause) => clause.factor)).toStrictEqual([
      "volume",
    ]);
  });

  it("has NO score at all where every factor is absent, which is every gated run", () => {
    // CI's permanent state: 516 securities, zero bars, no generation. There is
    // no `score` member to read — `BaselineComparison`'s mechanism — so a
    // surface cannot draw a zero.
    const outcome = compositeAnomaly({
      price: {
        figure: NOTHING_OBSERVED,
        comparison: TOO_FEW,
        percentile: undefined,
      },
      excess: { scored: false, applies: false, because: "no-sector" },
    });

    expect(outcome.scored).toBe(false);
    // @ts-expect-error — the whole mechanism: an unscored outcome has no
    // `score` member, so a renderer cannot reach for one.
    expect(outcome.score).toBeUndefined();
  });
});
