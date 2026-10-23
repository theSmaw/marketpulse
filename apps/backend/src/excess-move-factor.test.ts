// The scored relative-move factor (Task 5.6.2).
//
// ## What this file is the only level that can see
//
// **Every refusal here is reachable on a real deployment and most of them are
// permanent on CI.** CI's store is 516 securities and zero bars, so the factor
// refuses `too-few-samples` for every security for ever, `mixed-basis` is
// reachable every day between the overnight backfill and the next bell, and the
// two inapplicable arms are 15 of 516 at every hour. None of that is visible to
// a browser suite, and `pnpm e2e` cannot produce a figure at all.
//
// The sharpest assertion in the file is the one about `closesAsOf`: the cache is
// synchronous, never throws, and returns an **empty map** until its first
// successful load. A reader that treated an absent close as `0` would score
// against no reference and be wrong by the whole size of the market's move.

import { describe, expect, it } from "vitest";

import {
  BASELINE_MINIMUM_SAMPLE,
  excessMoveReference,
  toTicker,
  type Security,
  type WireOverviewFigure,
} from "@marketpulse/shared";

import {
  comparableExcessBaseline,
  excessMoveFactor,
} from "./excess-move-factor.js";
import type { ExcessMoveFactorInput } from "./excess-move-factor.js";
import type { StoredExcessBaseline } from "./excess-move-baseline-store.js";
import { BASELINE_FEED } from "./return-baseline-store.js";
import { SAMPLE_SPAN_MINUTES } from "./return-baseline.js";

const GRID = { spanMinutes: SAMPLE_SPAN_MINUTES, feed: BASELINE_FEED };

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

const SPY: Security = {
  ...NVDA,
  symbol: toTicker("SPY"),
  kind: "index_etf",
  sector: null,
};
const XLK: Security = { ...NVDA, symbol: toTicker("XLK"), kind: "sector_etf" };

/**
 * A baseline whose breakpoints are `0 … 10` evenly, so a magnitude of `r` sits
 * at the `10 r`th percentile and the arithmetic is checkable by eye.
 */
function baseline(sampleCount = BASELINE_MINIMUM_SAMPLE): StoredExcessBaseline {
  return {
    symbol: toTicker("NVDA"),
    observedAt: new Date("2026-09-11T20:00:00Z"),
    referenceKind: "sector_etf",
    referenceSymbol: "XLK",
    lookbackSessions: 60,
    sampleCount,
    refusal: null,
    breakpoints: Array.from({ length: 101 }, (_, rank) => rank / 10),
  };
}

/** An `observed` figure — a live minute measured against a named close. */
function observed(
  symbol: string,
  changePercent: number,
  changeBasis?: string,
): WireOverviewFigure {
  return {
    state: "observed",
    symbol,
    at: "2026-09-11T14:01:00Z",
    price: 100,
    changePercent,
    ...(changeBasis === undefined ? {} : { changeBasis }),
  };
}

/** A `stored` figure — a session's own close-to-close move. */
function stored(
  symbol: string,
  sessionChangePercent: number,
  session = "2026-09-11",
): WireOverviewFigure {
  return {
    state: "stored",
    symbol,
    session,
    close: 100,
    sessionChangePercent,
  };
}

function input(
  patch: Partial<ExcessMoveFactorInput> = {},
): ExcessMoveFactorInput {
  return {
    subject: observed("NVDA", 3, "2026-09-10"),
    reference: observed("XLK", 1, "2026-09-10"),
    referenceOf: excessMoveReference(NVDA),
    stored: baseline(),
    grid: GRID,
    ...patch,
  };
}

describe("the reference", () => {
  it("resolves an equity to its sector benchmark through the ONE shared home", () => {
    // `excessMoveReference` is read by the drawn region's `figuresOf` as well,
    // so the two processes cannot disagree about which fund a security is
    // compared against. A second answer would be a security scored against the
    // wrong fund on one surface only.
    const reference = excessMoveReference(NVDA);

    expect(reference.applies).toBe(true);
    if (!reference.applies) return;
    expect(reference.symbol).toBe("XLK");
    expect(reference.sector).toBe("technology");
  });

  it("has no symbol member AT ALL on the inapplicable arm", () => {
    const reference = excessMoveReference(SPY);
    expect(reference.applies).toBe(false);

    // @ts-expect-error — the whole mechanism: a caller cannot score a security
    // with no reference, because the member it would need does not exist on
    // that arm. A test asserting a constant would be green on every defect
    // this prevents.
    expect(reference.symbol).toBeUndefined();
  });
});

describe("the three structural answers", () => {
  it("a broad-market fund is INAPPLICABLE — not refused, and not absent", () => {
    // *The question does not arise.* No amount of waiting, backfilling or
    // repairing will give `SPY` a sector, so a sentence reading *unavailable*
    // would invite a reader to wait for ever.
    const factor = excessMoveFactor(
      input({ referenceOf: excessMoveReference(SPY), stored: undefined }),
    );

    expect(factor).toEqual({
      scored: false,
      applies: false,
      because: "no-sector",
    });
  });

  it("a sector ETF is INAPPLICABLE because it IS the benchmark", () => {
    // The excess would be exactly `0` for ever, which is a true number and a
    // meaningless one — and `0` on a magnitude percentile is *the least unusual
    // move on record*, the most confident possible wrong answer.
    const factor = excessMoveFactor(
      input({ referenceOf: excessMoveReference(XLK) }),
    );

    expect(factor).toEqual({
      scored: false,
      applies: false,
      because: "is-benchmark",
    });
  });

  it("inapplicability OUTRANKS every refusal, including a missing baseline", () => {
    // A security with no sector cannot have a too-short baseline of a
    // comparison that does not exist.
    const factor = excessMoveFactor(
      input({
        referenceOf: excessMoveReference(SPY),
        stored: undefined,
        subject: { state: "unknown", symbol: "SPY" },
        reference: undefined,
      }),
    );

    expect(factor.scored).toBe(false);
    if (factor.scored) return;
    expect(factor.applies).toBe(false);
  });
});

describe("the mixed-basis refusal, inherited rather than re-derived", () => {
  it("refuses one `observed` against one `stored`", () => {
    // The prefix in `basisOf`'s identity is what carries this, which is why the
    // identity is a string with a kind in it rather than a bare date.
    const factor = excessMoveFactor(input({ reference: stored("XLK", 1) }));

    expect(factor).toMatchObject({
      scored: false,
      applies: true,
      refusal: "mixed-basis",
    });
  });

  it("refuses two `observed` figures measured from different closes", () => {
    // **Reachable every day between the overnight backfill and the next bell.**
    const factor = excessMoveFactor(
      input({ reference: observed("XLK", 1, "2026-09-09") }),
    );

    expect(factor).toMatchObject({ refusal: "mixed-basis" });
  });

  it("refuses two `stored` figures from different sessions", () => {
    const factor = excessMoveFactor(
      input({
        subject: stored("NVDA", 3, "2026-09-11"),
        reference: stored("XLK", 1, "2026-09-10"),
      }),
    );

    expect(factor).toMatchObject({ refusal: "mixed-basis" });
  });

  it("scores two `stored` figures from the SAME session", () => {
    const factor = excessMoveFactor(
      input({
        subject: stored("NVDA", 3, "2026-09-11"),
        reference: stored("XLK", 1, "2026-09-11"),
      }),
    );

    expect(factor.scored).toBe(true);
  });

  it("scores two same-session `observed` figures, where NEITHER names a close", () => {
    // `changeBasis` is **omitted** on the same-session case, which is a real
    // value rather than a gap: the empty string stands for *the previous close,
    // unnamed*, and two figures measuring from it share a basis. An inverted
    // mapping of that compiles and is silently wrong on exactly the days the
    // store's last session meets the live session.
    const factor = excessMoveFactor(
      input({ subject: observed("NVDA", 3), reference: observed("XLK", 1) }),
    );

    expect(factor.scored).toBe(true);
  });
});

describe("an absent close is refused and NEVER read as zero", () => {
  it("refuses when the reference figure never arrived", () => {
    const factor = excessMoveFactor(input({ reference: undefined }));

    expect(factor).toMatchObject({ refusal: "no-reference-move" });
  });

  it("refuses when `closesAsOf` was empty, so the reference is `unknown`", () => {
    // **`closesAsOf` returns an EMPTY MAP until its first successful load**,
    // documented there as *"the true answer rather than a degraded one"*. A
    // security with no close in it reaches the aggregate as `state: "unknown"`,
    // `moveRankingKey` answers `undefined`, and this is what must happen next.
    //
    // The number the defect would produce is the assertion worth having: with
    // the reference read as `0`, a subject up 3% would score the **whole 3%**
    // as excess, which is the 30th percentile of this baseline — a well-formed,
    // correctly-signed, confidently wrong figure.
    const factor = excessMoveFactor(
      input({ reference: { state: "unknown", symbol: "XLK" } }),
    );

    expect(factor).toMatchObject({ refusal: "no-reference-move" });
    expect(factor.scored).toBe(false);
  });

  it("refuses when the SUBJECT has no move, before asking about the reference", () => {
    const factor = excessMoveFactor(
      input({
        subject: { state: "unknown", symbol: "NVDA" },
        reference: undefined,
      }),
    );

    expect(factor).toMatchObject({ refusal: "no-subject-move" });
  });

  it("refuses a non-finite move rather than letting a NaN reach the subtraction", () => {
    // `moveRankingKey` closes this gap in-process, before the encode — so
    // nothing here has to.
    const factor = excessMoveFactor(
      input({ reference: observed("XLK", Number.NaN, "2026-09-10") }),
    );

    expect(factor).toMatchObject({ refusal: "no-reference-move" });
  });
});

describe("comparableExcessBaseline — the bound, applied at the READ", () => {
  it("refuses an absent generation as `0 of 2,500`", () => {
    // `0 of 2,500 excess moves` is a true sentence about a cold replica and
    // about CI's permanent state, and a second refusal word for it would be a
    // second sentence saying it.
    const comparison = comparableExcessBaseline(undefined, GRID);

    expect(comparison).toEqual({
      scored: false,
      refusal: "too-few-samples",
      sampleCount: 0,
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    });
  });

  it("refuses one sample below the minimum and admits one at it", () => {
    expect(
      comparableExcessBaseline(baseline(BASELINE_MINIMUM_SAMPLE - 1), GRID)
        .scored,
    ).toBe(false);
    expect(
      comparableExcessBaseline(baseline(BASELINE_MINIMUM_SAMPLE), GRID).scored,
    ).toBe(true);
  });

  it("is the SAME constant the price factor applies, not a second one", () => {
    // The bound is a function of the printed precision — `50/√n ≤ 1` — and
    // this factor prints at the same precision as the price factor, so a second
    // derivation would be the same number with a second place to forget.
    const comparison = comparableExcessBaseline(undefined, GRID);
    expect(comparison.scored).toBe(false);
    if (comparison.scored) return;
    expect(comparison.minimumSampleCount).toBe(BASELINE_MINIMUM_SAMPLE);
  });

  it("carries a stored refusal through with its own word", () => {
    // A refused row has **no `breakpoints` member at all**, which is why this
    // is built rather than spread from the measured one.
    const refused: StoredExcessBaseline = {
      symbol: toTicker("NVDA"),
      observedAt: new Date("2026-09-11T20:00:00Z"),
      referenceKind: "sector_etf",
      referenceSymbol: "XLK",
      lookbackSessions: 60,
      sampleCount: 3_100,
      refusal: "reference-split-discontinuity",
    };

    const comparison = comparableExcessBaseline(refused, GRID);

    expect(comparison).toMatchObject({
      scored: false,
      refusal: "reference-split-discontinuity",
    });
  });

  it("has NO distribution member on the refused arm", () => {
    const comparison = comparableExcessBaseline(undefined, GRID);

    // @ts-expect-error — `BaselineComparison`'s mechanism: the narrowing is the
    // only way across, and an unused `@ts-expect-error` fails the build if the
    // member ever appears on both arms.
    expect(comparison.distribution).toBeUndefined();
  });
});

describe("the figure", () => {
  it("scores the magnitude and keeps the SIGN separately", () => {
    // `3 − 1 = +2` points; `|2|` sits at the 20th of a `0 … 10` grid.
    const factor = excessMoveFactor(input());

    expect(factor.scored).toBe(true);
    if (!factor.scored) return;

    expect(factor.excessPoints).toBeCloseTo(2, 10);
    expect(factor.percentile.rank).toBe(20);
    expect(factor.referenceSymbol).toBe("XLK");
  });

  it("scores AHEAD and BEHIND identically — AC 4, as a property", () => {
    // A score higher for falls than rises is a risk signal, which §11 forbids
    // in terms. The sign survives on `excessPoints` and the ordinal does not
    // see it.
    const ahead = excessMoveFactor(input());
    const behind = excessMoveFactor(
      input({
        subject: observed("NVDA", -1, "2026-09-10"),
        reference: observed("XLK", 1, "2026-09-10"),
      }),
    );

    expect(ahead.scored && behind.scored).toBe(true);
    if (!ahead.scored || !behind.scored) return;

    expect(ahead.excessPoints).toBeCloseTo(2, 10);
    expect(behind.excessPoints).toBeCloseTo(-2, 10);
    expect(behind.percentile.rank).toBe(ahead.percentile.rank);
  });

  it("is MONOTONIC — a larger excess never scores lower", () => {
    // Story 5.6's AC 12, which a zero-bar store can prove.
    let previous = -1;
    for (const percent of [1, 2, 3, 5, 8, 11]) {
      const factor = excessMoveFactor(
        input({ subject: observed("NVDA", percent, "2026-09-10") }),
      );
      expect(factor.scored).toBe(true);
      if (!factor.scored) continue;
      expect(factor.percentile.rank).toBeGreaterThanOrEqual(previous);
      previous = factor.percentile.rank;
    }
  });

  it("gives identical inputs a byte-identical answer", () => {
    expect(JSON.stringify(excessMoveFactor(input()))).toBe(
      JSON.stringify(excessMoveFactor(input())),
    );
  });

  it("carries the grid's stride and the tape it was read on", () => {
    const factor = excessMoveFactor(input());
    expect(factor.scored).toBe(true);
    if (!factor.scored) return;

    // Invariant 6: the screen says where a figure came from rather than
    // implying it, and both halves come from their producers.
    expect(factor.percentile.spanMinutes).toBe(SAMPLE_SPAN_MINUTES);
    expect(factor.percentile.feed).toBe(BASELINE_FEED);
  });
});

describe("what the pass did not hold, and the baseline that is not this one's", () => {
  it("refuses `no-subject-move` for a symbol the pass is not about", () => {
    // **`undefined` since Task 5.6.4**, which is a focus outside the join's
    // own `symbols`. It is optional so the subject and the reference can be
    // read side by side in **one** argument list off one `OverviewPass`, with
    // no guard between them — and the word is the shipped one for exactly this
    // fact rather than a seventh refusal for it.
    const factor = excessMoveFactor(input({ subject: undefined }));

    expect(factor).toEqual({
      scored: false,
      applies: true,
      refusal: "no-subject-move",
      sampleCount: BASELINE_MINIMUM_SAMPLE,
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    });
  });

  it("treats a generation computed against ANOTHER benchmark as absent", () => {
    // `0016` §3 puts the reference in the key so *a reader holding either can
    // say which question it answers*. This is the reader asking — and it is
    // **absence** rather than a word, because nobody can act on *we hold a
    // baseline against a different benchmark* and `0 of 2,500` already means
    // *nothing to rank against*.
    //
    // The failure it prevents is maximally quiet: `referenceSymbol` travels on
    // the row, so a drawn sentence would name the benchmark the wrong baseline
    // was computed against.
    const other = { ...baseline(4_000), referenceSymbol: "XLV" };

    const factor = excessMoveFactor(input({ stored: other }));

    expect(factor).toEqual({
      scored: false,
      applies: true,
      refusal: "too-few-samples",
      sampleCount: 0,
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    });
  });

  it("ranks against a generation whose reference IS this one's", () => {
    const factor = excessMoveFactor(input({ stored: baseline(4_000) }));

    expect(factor.scored).toBe(true);
    if (!factor.scored) return;
    expect(factor.referenceSymbol).toBe("XLK");
  });
});
