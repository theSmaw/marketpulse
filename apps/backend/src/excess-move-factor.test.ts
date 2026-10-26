// The scored relative-move factor (Task 5.6.2).
//
// ## What this file is the only level that can see
//
// **Every refusal here is reachable on a real deployment and most of them are
// permanent on CI.** CI's store is 516 securities and zero bars, so the factor
// refuses `too-few-samples` for every security for ever, `mixed-basis` is
// reachable whenever one leg prints a minute the other does not — IEX minute
// presence is 81.6% and `ERIE`'s is 2.1% — and the two inapplicable arms are
// 15 of 516 at every hour. None of that is visible to a browser suite, and
// `pnpm e2e` cannot produce a figure at all.
//
// ## THE SPAN AGREEMENT IS THE SHARPEST ASSERTION IN THE FILE (2026-10-26)
//
// This factor shipped ranking a **session-to-date** excess — two
// `WireOverviewFigure`s differenced through `moveRankingKey` — against
// `0016`'s distribution of **five-minute** excesses. Measured on the local
// store: p50 breakpoint 0.0856 points, mean 99th 0.6893. A session-to-date
// excess clears the 99th routinely, so the factor paid its full 35 of 100 for
// most of the universe and the inflation grew through the session.
//
// Half the repair is a type — the inputs are `FiveMinuteReturn`s, so a wire
// figure is a compile error. The other half **cannot be a type**, because
// `RETURN_SPAN_MINUTES` and `SAMPLE_SPAN_MINUTES` are two independent numbers
// in two modules: the numerator's span is compared with the distribution's
// own stride, and `the-excess-numerator-spans-its-baseline` below is the one
// level that can see it. `pnpm break an-unspanned-excess-numerator` performs
// the deletion the next author would.

import { describe, expect, it } from "vitest";

import {
  BASELINE_MINIMUM_SAMPLE,
  excessMoveReference,
  toTicker,
  type BarSource,
  type Security,
} from "@marketpulse/shared";

import {
  comparableExcessBaseline,
  excessMoveFactor,
} from "./excess-move-factor.js";
import type { ExcessMoveFactorInput } from "./excess-move-factor.js";
import type { StoredExcessBaseline } from "./excess-move-baseline-store.js";
import { BASELINE_FEED } from "./return-baseline-store.js";
import { SAMPLE_SPAN_MINUTES } from "./return-baseline.js";
import { RETURN_SPAN_MINUTES } from "./five-minute-return.js";
import type {
  MeasuredReturn,
  RefusedReturn,
  ReturnRefusal,
} from "./five-minute-return.js";

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

/** The one tape a trailing-window bar can carry — `iex`, by construction. */
const SOURCE: BarSource = {
  provider: "alpaca",
  feed: "iex",
  retrievedAt: "2026-09-11T14:01:30.000Z",
  barCount: 1,
};

/** The interval both legs are measured over unless a test moves one. */
const FROM = new Date("2026-09-11T13:56:00.000Z");
const TO = new Date("2026-09-11T14:01:00.000Z");

/**
 * **A MEASURED five-minute return** — `fiveMinuteReturn`'s own answer shape,
 * over {@link FROM} to {@link TO} unless the interval is moved.
 *
 * It is forged rather than produced because the factor reads exactly four of
 * its fields — `percent`, `spanMinutes` and the two endpoints' `startsAt` —
 * and `five-minute-return.test.ts` owns the question of whether the producer
 * fills them correctly. What this file owns is what the factor does with them.
 */
function measured(
  percent: number,
  interval: { readonly from?: Date; readonly to?: Date } = {},
): MeasuredReturn {
  const from = interval.from ?? FROM;
  const to = interval.to ?? TO;
  return {
    measured: true,
    percent,
    from: { startsAt: from, close: 100, source: SOURCE },
    to: { startsAt: to, close: 100 * (1 + percent / 100), source: SOURCE },
    observed: RETURN_SPAN_MINUTES,
    spanMinutes: (to.getTime() - from.getTime()) / 60_000,
    volume: 1_000,
  };
}

/** A refused leg — the window held no pair, or no bar at all. */
function refusedReturn(refusal: ReturnRefusal): RefusedReturn {
  return { measured: false, refusal, seen: undefined };
}

function input(
  patch: Partial<ExcessMoveFactorInput> = {},
): ExcessMoveFactorInput {
  return {
    subject: measured(3),
    reference: measured(1),
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
        subject: refusedReturn("nothing-observed"),
        reference: undefined,
      }),
    );

    expect(factor.scored).toBe(false);
    if (factor.scored) return;
    expect(factor.applies).toBe(false);
  });
});

describe("mixed-basis — the two legs must be over the SAME five minutes", () => {
  // **The word is kept and its fact is narrower** (2026-10-26). It used to mean
  // *the two wire figures were measured from different closes*; two five-minute
  // returns over the same endpoints share a basis by construction, which is the
  // point of the repair. What remains reachable is the one way two legs can
  // still disagree: they can be over different five minutes. *Basis* is the
  // older endpoint — `five-minute-return.ts`' own use of the word, where
  // `no-basis` is a zero close on exactly that bar.

  it("refuses two legs whose intervals do not line up", () => {
    // **Reachable on any ordinary minute.** IEX minute presence is 81.6% and
    // `ERIE`'s is 2.1%, so a benchmark whose newest bar is ten minutes old
    // against a subject's fresh one is the common case rather than the edge:
    // two true figures about two different intervals, differenced.
    const factor = excessMoveFactor(
      input({
        reference: measured(1, {
          from: new Date("2026-09-11T13:46:00.000Z"),
          to: new Date("2026-09-11T13:51:00.000Z"),
        }),
      }),
    );

    expect(factor).toMatchObject({
      scored: false,
      applies: true,
      refusal: "mixed-basis",
    });
  });

  it("refuses legs that share the NEWER endpoint and not the older one", () => {
    // Both ends are compared rather than one. This is redundant while every
    // leg comes from the one shared span and is the clause that survives a
    // second span arriving — a 5-minute return beside a 15-minute one, ending
    // on the same minute.
    const factor = excessMoveFactor(
      input({
        reference: measured(1, {
          from: new Date("2026-09-11T13:46:00.000Z"),
          to: TO,
        }),
      }),
    );

    expect(factor).toMatchObject({ refusal: "mixed-basis" });
  });

  it("scores two legs over the same interval", () => {
    const factor = excessMoveFactor(input());

    expect(factor.scored).toBe(true);
  });

  it("refuses on the instants rather than on a tolerance", () => {
    // `fiveMinuteReturn` picks an endpoint on an EXACT instant match — *"a
    // 47-minute pair is not a near miss to be tolerated"* — so a predicate
    // over the pair must not be looser than the pair's own selection. One
    // minute out is out.
    const factor = excessMoveFactor(
      input({
        reference: measured(1, {
          from: new Date("2026-09-11T13:55:00.000Z"),
          to: new Date("2026-09-11T14:00:00.000Z"),
        }),
      }),
    );

    expect(factor).toMatchObject({ refusal: "mixed-basis" });
  });
});

describe("a refused leg is refused and NEVER read as zero", () => {
  it("refuses when there is no benchmark figure at all", () => {
    const factor = excessMoveFactor(input({ reference: undefined }));

    expect(factor).toMatchObject({ refusal: "no-reference-move" });
  });

  it("refuses when the benchmark's window held no bar five minutes back", () => {
    // **The state the whole repair rests on.** A benchmark that printed
    // nothing in these five minutes has **not** been flat, and reading its
    // return as `0` would score the subject's whole move as excess — the
    // defect `excess-move-baseline.ts` names at its own sampler: *"never a
    // stretch to the nearest bar and never a reference return of `0`."*
    //
    // The number the defect would produce is the assertion worth having: with
    // the reference read as `0`, a subject up 3% scores the whole 3% as
    // excess, which is the 30th percentile of this baseline — a well-formed,
    // correctly-signed, confidently wrong figure.
    const factor = excessMoveFactor(
      input({ reference: refusedReturn("no-earlier-endpoint") }),
    );

    expect(factor).toMatchObject({ refusal: "no-reference-move" });
    expect(factor.scored).toBe(false);
  });

  it("refuses the SUBJECT's absence first, before asking about the benchmark", () => {
    const factor = excessMoveFactor(
      input({
        subject: refusedReturn("nothing-observed"),
        reference: undefined,
      }),
    );

    expect(factor).toMatchObject({ refusal: "no-subject-move" });
  });

  it("gives all THREE of the return's refusals one word, and only one", () => {
    // `nothing-observed`, `no-earlier-endpoint` and `no-basis` are three
    // different sentences about the window — and each one travels to the
    // surface on the **return** half of the same frame, where it is drawn in
    // full. Re-spelling them here would be a second sentence saying what the
    // row above already says, so this factor says the one thing it owns: *the
    // difference is withheld.*
    for (const refusal of [
      "nothing-observed",
      "no-earlier-endpoint",
      "no-basis",
    ] as const) {
      expect(
        excessMoveFactor(input({ subject: refusedReturn(refusal) })),
      ).toMatchObject({ refusal: "no-subject-move" });
      expect(
        excessMoveFactor(input({ reference: refusedReturn(refusal) })),
      ).toMatchObject({ refusal: "no-reference-move" });
    }
  });

  it("needs no non-finite guard of its own, because `no-basis` is one", () => {
    // The wire figures needed `moveRankingKey` to keep a `NaN` out of the
    // subtraction. A measured return cannot carry one: a zero or non-finite
    // older close is `no-basis`, refused by the producer before the division
    // — so the guard is one module upstream rather than absent.
    const factor = excessMoveFactor(
      input({ reference: refusedReturn("no-basis") }),
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
      input({ subject: measured(-1), reference: measured(1) }),
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
      const factor = excessMoveFactor(input({ subject: measured(percent) }));
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

    // **And this is the ONLY span on the scored arm.** The check in
    // `the-excess-numerator-spans-its-baseline` below proves the figure's own
    // span equals it, so a second member would be a second home for one
    // number.
    // @ts-expect-error — an unused `@ts-expect-error` fails the build if a
    // second span member ever appears on this arm.
    expect(factor.spanMinutes).toBeUndefined();
  });
});

describe("the-excess-numerator-spans-its-baseline (2026-10-26)", () => {
  // **The guard the defect owed.** The factor shipped ranking a session-to-date
  // excess against a distribution of five-minute excesses, and the reason
  // nothing caught it is that nothing compared the numerator's span to the
  // baseline's: `comparableExcessBaseline` checks the baseline's and nothing
  // checked the figure's.
  //
  // ## Why a test and not a `pnpm invariants` clause
  //
  // Because it must read a VALUE. `RETURN_SPAN_MINUTES` is
  // `TRAILING_WINDOW_SPAN_MS / MS_PER_MINUTE` — a derived number, not a
  // literal — so a grep would have to re-implement that arithmetic, which is a
  // second home for the one subtraction `five-minute-return.ts` spells on
  // purpose. And the claim is about a comparison in the shipped branch, which
  // only running it can see.

  it("the two independent spans agree TODAY, and the factor is drawable only while they do", () => {
    // **A tripwire rather than a coupling, and the distinction is argued.**
    // `return-baseline.ts` states in terms that `SAMPLE_SPAN_MINUTES` is
    // *deliberately NOT* `RETURN_SPAN_MINUTES` — one is a live ring buffer's
    // depth, chosen against 283–284 B a bar, the other a stored grid's stride
    // — and ADR 0043 is the decision that keeps this product's fives apart.
    // So this does **not** assert that they must always be equal.
    //
    // What it asserts is what their divergence COSTS, because the runtime
    // comparison below turns a divergence into a **total refusal**: the day
    // somebody re-sizes the trailing window, this factor refuses for every
    // security in the universe, for ever, with nothing on screen wrong — a
    // shipped region quietly drawing an honest-looking absence is the one
    // failure mode nobody goes looking for. This test is the notice. Changing
    // either constant should fail here, be read, and be answered — by
    // recomputing the baselines on the new stride, or by accepting the
    // refusal with a date on it.
    expect(RETURN_SPAN_MINUTES).toBe(SAMPLE_SPAN_MINUTES);
  });

  it("refuses a numerator measured over a DIFFERENT span", () => {
    // The defect's own shape, with the type satisfied: a well-formed measured
    // return of the right kind, over fifteen minutes instead of five. There is
    // nothing to rank it against, so it takes the answer a malformed
    // distribution takes — *nothing we can rank against* — with the
    // distribution's own counted `n` beside it.
    const fifteen = {
      from: new Date("2026-09-11T13:46:00.000Z"),
      to: new Date("2026-09-11T14:01:00.000Z"),
    };

    const factor = excessMoveFactor(
      input({
        subject: measured(3, fifteen),
        reference: measured(1, fifteen),
      }),
    );

    expect(factor).toEqual({
      scored: false,
      applies: true,
      refusal: "too-few-samples",
      sampleCount: BASELINE_MINIMUM_SAMPLE,
      minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    });
  });

  it("refuses it rather than scoring it, which is the whole defect", () => {
    // The number the shipped defect produced is the assertion worth keeping.
    // A 15-minute move of 3% against a benchmark's 1% is a 2-point excess —
    // the 20th percentile of this `0 … 10` grid — and the factor would have
    // reported it as confidently as a correct one. What matters is that it
    // does not report it at all.
    const fifteen = {
      from: new Date("2026-09-11T13:46:00.000Z"),
      to: new Date("2026-09-11T14:01:00.000Z"),
    };

    const factor = excessMoveFactor(
      input({
        subject: measured(3, fifteen),
        reference: measured(1, fifteen),
      }),
    );

    expect(factor.scored).toBe(false);
  });

  it("refuses a span SHORTER than the baseline's too, not only a longer one", () => {
    // The comparison is an equality rather than a ceiling. A one-minute
    // excess understates against a five-minute distribution exactly as a
    // session-to-date one overstated, and both are the same mistake.
    const oneMinute = {
      from: new Date("2026-09-11T14:00:00.000Z"),
      to: new Date("2026-09-11T14:01:00.000Z"),
    };

    const factor = excessMoveFactor(
      input({
        subject: measured(3, oneMinute),
        reference: measured(1, oneMinute),
      }),
    );

    expect(factor).toMatchObject({ scored: false, refusal: "too-few-samples" });
  });

  it("a WIRE FIGURE is a compile error, which is the other half", () => {
    const factor = excessMoveFactor(
      input({
        // @ts-expect-error — the repair's structural half: the numerator is a
        // five-minute return, so `pass.figureOf(symbol)` — whose move is the
        // move since the basis close — cannot be handed to this function at
        // all. An unused `@ts-expect-error` fails the build if the door
        // reopens.
        subject: { state: "observed", symbol: "NVDA", price: 100 },
      }),
    );

    expect(factor.scored).toBe(false);
  });
});

describe("what the pass did not hold, and the baseline that is not this one's", () => {
  it("refuses `no-subject-move` for a symbol with no window at all", () => {
    // **The subject is REQUIRED since 2026-10-26**, and that removes a state
    // rather than a convenience: `fiveMinuteReturn` always answers, and a
    // symbol this process does not track reads an empty window and refuses
    // `nothing-observed`. There is no `undefined` subject for a caller to
    // invent, and the word is the shipped one for exactly this fact.
    const factor = excessMoveFactor(
      input({ subject: refusedReturn("nothing-observed") }),
    );

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
