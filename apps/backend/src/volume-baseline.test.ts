// The volume baseline's arithmetic (Task 5.5.3).
//
// **What this level can and cannot see.** Everything here is pure — the
// sessions and the minute volumes are arguments — so this file can prove the
// grid, the pooling, the counted `n`, the derived floor and four of the six
// refusal words. What it structurally cannot see is **two tapes**, because a
// map of minute volumes has no tape in it at all: that is
// `volume-baselines.database.test.ts`' job and it is the one level at which two
// rows for one minute exist.

import { describe, expect, it } from "vitest";

import {
  marketSessionOn,
  toMarketDate,
  type MarketSession,
} from "@marketpulse/shared";

import { SAMPLE_SPAN_MINUTES } from "./return-baseline.js";
import {
  TARGET_RELATIVE_STANDARD_ERROR,
  VOLUME_BASELINE_FEED,
  VOLUME_BASELINE_REFUSALS,
  comparableVolumeBaseline,
  medianRelativeStandardError,
  samplesForRelativeStandardError,
  volumeBaselineOf,
  volumeBucketCount,
  volumeBucketOf,
} from "./volume-baseline.js";

const MS_PER_MINUTE = 60_000;

function session(date: string): MarketSession {
  const found = marketSessionOn(toMarketDate(date));
  if (found === undefined) {
    throw new Error(`${date} is not a trading session; the fixture is wrong.`);
  }
  return found;
}

/** A minute of a session, by its offset from the open. Negative is pre-market. */
function minute(one: MarketSession, offset: number): number {
  return one.open.getTime() + offset * MS_PER_MINUTE;
}

/** 2026-11-27 is the day after Thanksgiving — a 13:00 early close. */
const EARLY = session("2026-11-27");
const REGULAR = session("2026-09-23");
const NEXT = session("2026-09-24");

/**
 * `n` minute volumes in bucket `bucket` of `one`, spread over `sessions` days
 * so the pooling is what produces the count.
 */
function filled(
  days: readonly MarketSession[],
  bucket: number,
  volumes: readonly number[],
): ReadonlyMap<number, number> {
  const map = new Map<number, number>();
  for (const day of days) {
    for (let index = 0; index < SAMPLE_SPAN_MINUTES; index += 1) {
      const offset = bucket * SAMPLE_SPAN_MINUTES + index;
      const volume = volumes[(offset + days.indexOf(day) * 7) % volumes.length];
      if (volume !== undefined) map.set(minute(day, offset), volume);
    }
  }
  return map;
}

describe("the bucketing division — one home for *which time of day is this*", () => {
  it("divides the minute of session by the grid's stride", () => {
    // The clause a re-implementer cannot avoid writing, and it matches no
    // existing `one-home-for-the-observation-window` conjunct: the three
    // minute-scaled ones key on a subtraction from `getTime()` and this is a
    // division.
    expect(volumeBucketOf(new Date(minute(REGULAR, 0)), REGULAR)).toBe(0);
    expect(volumeBucketOf(new Date(minute(REGULAR, 4)), REGULAR)).toBe(0);
    expect(volumeBucketOf(new Date(minute(REGULAR, 5)), REGULAR)).toBe(1);
    expect(volumeBucketOf(new Date(minute(REGULAR, 389)), REGULAR)).toBe(77);
  });

  it("places a minute outside the session nowhere, rather than in bucket 0", () => {
    // The pre-market minutes the live writer keeps and the backfill never asks
    // for. Placing one would put the thinnest minutes of the day into the
    // bucket that holds the opening auction.
    expect(
      volumeBucketOf(new Date(minute(REGULAR, -1)), REGULAR),
    ).toBeUndefined();
    expect(
      volumeBucketOf(new Date(minute(REGULAR, -30)), REGULAR),
    ).toBeUndefined();
    expect(
      volumeBucketOf(new Date(minute(REGULAR, 390)), REGULAR),
    ).toBeUndefined();
  });

  it("reads an early close off the session's own `minuteBars`", () => {
    // 13:00 is 210 minute bars, so the last bucket is 41 and 15:55 does not
    // exist. A hard-coded 390/78 pair would place it in bucket 77 of a session
    // that closed two and a half hours earlier.
    expect(EARLY.minuteBars).toBe(210);
    expect(volumeBucketOf(new Date(minute(EARLY, 209)), EARLY)).toBe(41);
    expect(volumeBucketOf(new Date(minute(EARLY, 210)), EARLY)).toBeUndefined();
  });

  it("sizes the grid by the LONGEST session of the window, not the first", () => {
    expect(volumeBucketCount([REGULAR])).toBe(78);
    expect(volumeBucketCount([EARLY])).toBe(42);
    // A window beginning on a half day must not discard every afternoon after
    // it.
    expect(volumeBucketCount([EARLY, REGULAR])).toBe(78);
  });
});

describe("the baseline itself", () => {
  it("pools one bucket ACROSS sessions, which is what *this time of day* means", () => {
    const volumes = new Map<number, number>([
      [minute(REGULAR, 0), 100],
      [minute(REGULAR, 1), 200],
      [minute(NEXT, 0), 300],
      [minute(NEXT, 1), 400],
    ]);

    const outcome = volumeBaselineOf({
      sessions: [REGULAR, NEXT],
      volumes,
      priceRefusal: null,
    });

    expect(outcome.kind).toBe("measured");
    if (outcome.kind !== "measured") return;

    // Four samples in ONE bucket, not two buckets of two. A per-session bucket
    // would put `n` at the ~18 session sums Gate 1 decision 4 rejected.
    expect(outcome.buckets[0]?.samples).toBe(4);
    expect(outcome.buckets[0]?.median).toBe(250);
    expect(outcome.sampleCount).toBe(4);
  });

  it("counts `n` per bucket rather than computing it from a constant", () => {
    // `60 × 5` is wrong three ways over, and the bucket holding three of five
    // minutes is the ordinary case on a tape whose median per-symbol minute
    // presence is 65.1%.
    const volumes = new Map<number, number>([
      [minute(REGULAR, 0), 10],
      [minute(REGULAR, 2), 20],
      [minute(REGULAR, 4), 30],
      [minute(REGULAR, 5), 40],
    ]);

    const outcome = volumeBaselineOf({
      sessions: [REGULAR],
      volumes,
      priceRefusal: null,
    });
    if (outcome.kind !== "measured") throw new Error("expected a measurement");

    expect(outcome.buckets[0]?.samples).toBe(3);
    expect(outcome.buckets[1]?.samples).toBe(1);
    expect(outcome.buckets[2]?.samples).toBe(0);
    expect(outcome.buckets[2]?.median).toBeNull();
    expect(outcome.sampleCount).toBe(4);
  });

  it("keeps a volume of 0 as a SAMPLE and an absent minute as none", () => {
    // AC 4, at the one place nothing downstream could detect it. A bar with no
    // shares in it is a thing the vendor sends and is a measurement; a minute
    // with no bar is IEX having printed nothing, and `Number(null)` is `0`.
    const outcome = volumeBaselineOf({
      sessions: [REGULAR],
      volumes: new Map([
        [minute(REGULAR, 0), 0],
        [minute(REGULAR, 1), 0],
        [minute(REGULAR, 2), 90],
      ]),
      priceRefusal: null,
    });
    if (outcome.kind !== "measured") throw new Error("expected a measurement");

    // Three samples and not five: the two absent minutes are not zeroes.
    expect(outcome.buckets[0]?.samples).toBe(3);
    expect(outcome.buckets[0]?.median).toBe(0);
  });

  it("answers `none` and writes NO ROW when the tape holds nothing", () => {
    // Every laptop's and every CI run's permanent state, because
    // `live-bar-writer.ts` only runs where a provider is configured.
    const outcome = volumeBaselineOf({
      sessions: [REGULAR],
      volumes: new Map(),
      priceRefusal: null,
    });

    expect(outcome.kind).toBe("none");
  });

  it("ignores a bar belonging to no session in the window", () => {
    // The extended-hours minutes the live writer keeps. They are not samples
    // here at all; `volume-share.ts` is what counts them.
    const outcome = volumeBaselineOf({
      sessions: [REGULAR],
      volumes: new Map([
        [minute(REGULAR, -30), 7_000],
        [minute(REGULAR, 0), 11],
      ]),
      priceRefusal: null,
    });
    if (outcome.kind !== "measured") throw new Error("expected a measurement");

    expect(outcome.sampleCount).toBe(1);
  });
});

describe("the split verdict, READ from the price pass", () => {
  it("refuses the whole security and keeps the count it reached", () => {
    // Gate 1's false premise 9: there is no analogous overnight ratio for
    // volume to threshold, so the verdict is inherited. A split breaks volume
    // HARDER than price — an unadjusted 10:1 split is a +900% figure.
    const outcome = volumeBaselineOf({
      sessions: [REGULAR],
      volumes: new Map([
        [minute(REGULAR, 0), 10],
        [minute(REGULAR, 1), 20],
      ]),
      priceRefusal: "split-discontinuity",
    });

    expect(outcome.kind).toBe("refused");
    if (outcome.kind !== "refused") return;
    expect(outcome.refusal).toBe("split-discontinuity");
    // *How much we had* is the first question asked of a refusal.
    expect(outcome.sampleCount).toBe(2);
  });

  it("answers `none` rather than a refusal when the tape holds nothing", () => {
    // **The opposite precedence from `returnBaselineOf`**, deliberately. The
    // verdict arrives from the consolidated tape's closes while the samples are
    // IEX's, so a refusal row here would claim we hold a volume baseline
    // position for a security we have never heard IEX for.
    const outcome = volumeBaselineOf({
      sessions: [REGULAR],
      volumes: new Map(),
      priceRefusal: "split-discontinuity",
    });

    expect(outcome.kind).toBe("none");
  });
});

describe("the floor, derived rather than chosen", () => {
  it("reproduces Task 5.5.2's measured figures rather than discovering new ones", () => {
    // `NVDA`, the only security whose median bucket meets 5% on the better
    // tape: CV 0.657 over a full 60 sessions of a 5-minute bucket, which is
    // 300 minute samples.
    expect(
      medianRelativeStandardError(0.657, 60 * SAMPLE_SPAN_MINUTES),
    ).toBeCloseTo(0.0475, 4);

    // `ERIE`, the sparsest: CV 1.284 at the ~98 samples its 2.1% minute
    // coverage leaves, which is the 16.22% the amendment records. Three
    // decimals rather than four, because the amendment records the **error**
    // and not the `n`, and the `n` that reproduces 16.22% exactly is 98.4 —
    // back-solving an integer out of a rounded figure is where a test starts
    // asserting its own arithmetic instead of the measurement.
    expect(medianRelativeStandardError(1.284, 98)).toBeCloseTo(0.1622, 3);

    // And the floor is the same arithmetic rearranged: the p90 CV that puts
    // `NVDA` at 98 sessions is 0.883.
    const needed = samplesForRelativeStandardError(
      0.883,
      TARGET_RELATIVE_STANDARD_ERROR,
    );
    expect(needed).toBe(490);
    expect(Math.ceil((needed ?? 0) / SAMPLE_SPAN_MINUTES)).toBe(98);
  });

  it("computes `√(π/2)` rather than carrying 1.253", () => {
    // A literal is a second, lower-precision home for a constant of
    // mathematics. At CV 1 and n 1 the error IS the factor.
    expect(medianRelativeStandardError(1, 1)).toBeCloseTo(
      Math.sqrt(Math.PI / 2),
      12,
    );
    expect(medianRelativeStandardError(1, 1)).not.toBe(1.253);
  });

  it("answers `undefined` for a bucket with no spread, never 0", () => {
    // A CV of zero is a licence to print any figure from any sample, and the
    // bound derived from one comes back as 1 sample.
    expect(medianRelativeStandardError(undefined, 300)).toBeUndefined();
    expect(medianRelativeStandardError(0.5, 0)).toBeUndefined();
    expect(samplesForRelativeStandardError(undefined, 0.05)).toBeUndefined();
  });

  it("is NOT `BASELINE_MINIMUM_SAMPLE`'s 2,500 or its shape", () => {
    // That constant is `50/√n ≤ 1` solved for `n` — the precision of an
    // integer percentile ordinal. A bucket median's `n` is a different
    // quantity, and the floor here is a FUNCTION of a measured CV.
    expect(
      samplesForRelativeStandardError(0.657, TARGET_RELATIVE_STANDARD_ERROR),
    ).not.toBe(2500);
    // Two different measured CVs give two different floors, which a constant
    // cannot do.
    expect(
      samplesForRelativeStandardError(0.657, TARGET_RELATIVE_STANDARD_ERROR),
    ).not.toBe(
      samplesForRelativeStandardError(1.308, TARGET_RELATIVE_STANDARD_ERROR),
    );
  });
});

describe("the four refusal words this task produces", () => {
  it("declares all SIX, so the drawing story cannot collapse two of them", () => {
    expect([...VOLUME_BASELINE_REFUSALS]).toEqual([
      "split-discontinuity",
      "too-few-sessions",
      "no-same-tape-baseline",
      "zero-volume-baseline",
      "no-bar-in-bucket",
      "bucket-partially-observed",
    ]);
    // The two this task declares and does not produce are the numerator's, and
    // `volume-baseline.ts` records which pairs would read alike if collapsed.
    expect(VOLUME_BASELINE_REFUSALS).toContain("no-bar-in-bucket");
    expect(VOLUME_BASELINE_REFUSALS).toContain("bucket-partially-observed");
  });

  it("says `no-same-tape-baseline` for an absent row — NOT `too-few-sessions`", () => {
    // The most expensive collapse of the four pairs: *we have 18 sessions and
    // need 98* is a wait, and *we have never heard IEX for this security* is a
    // gap in our listening. One resolves itself on a date; the other needs
    // somebody to look at the writer.
    expect(comparableVolumeBaseline(undefined, 0)).toEqual({
      comparable: false,
      refusal: "no-same-tape-baseline",
      sampleCount: 0,
    });
    expect(comparableVolumeBaseline({ kind: "none" }, 0).comparable).toBe(
      false,
    );
  });

  it("carries the split refusal through to the reader", () => {
    const refused = comparableVolumeBaseline(
      {
        kind: "refused",
        bucketCount: 78,
        sampleCount: 1_200,
        refusal: "split-discontinuity",
      },
      3,
    );

    expect(refused).toEqual({
      comparable: false,
      refusal: "split-discontinuity",
      sampleCount: 1_200,
    });
  });

  it("refuses a bucket the measured dispersion cannot support, and draws one it can", () => {
    const outcome = volumeBaselineOf({
      sessions: [REGULAR],
      // One session: five samples in bucket 0, with real spread.
      volumes: filled([REGULAR], 0, [100, 300, 120, 90, 400]),
      priceRefusal: null,
    });
    if (outcome.kind !== "measured") throw new Error("expected a measurement");

    const thin = comparableVolumeBaseline(outcome, 0);
    expect(thin.comparable).toBe(false);
    if (thin.comparable) return;
    expect(thin.refusal).toBe("too-few-sessions");
    // The refusal states how much we had, which is the depth sentence's figure.
    expect(thin.sampleCount).toBe(5);

    // The same bucket is drawable once the dispersion and the depth agree —
    // asserted against the bound rather than against a chosen `n`, so this
    // test moves with the target instead of pinning it.
    const samples = outcome.buckets[0]?.samples ?? 0;
    const error = outcome.buckets[0]?.relativeStandardError ?? 0;
    expect(error).toBeGreaterThan(TARGET_RELATIVE_STANDARD_ERROR);
    const needed = samplesForRelativeStandardError(
      (error * Math.sqrt(samples)) / Math.sqrt(Math.PI / 2),
      TARGET_RELATIVE_STANDARD_ERROR,
    );
    expect(needed).toBeGreaterThan(samples);
  });

  it("refuses a bucket with no measurable spread rather than calling it precise", () => {
    // A flat bucket's CV is `undefined`, and a `0` there would pass the floor
    // trivially at any depth.
    const outcome = volumeBaselineOf({
      sessions: [REGULAR, NEXT],
      volumes: new Map([
        [minute(REGULAR, 0), 500],
        [minute(REGULAR, 1), 500],
        [minute(NEXT, 0), 500],
        [minute(NEXT, 1), 500],
      ]),
      priceRefusal: null,
    });
    if (outcome.kind !== "measured") throw new Error("expected a measurement");

    expect(outcome.buckets[0]?.relativeStandardError).toBeNull();
    const held = comparableVolumeBaseline(outcome, 0);
    expect(held.comparable).toBe(false);
    if (held.comparable) return;
    expect(held.refusal).toBe("too-few-sessions");
  });

  it("refuses a zero-volume baseline rather than producing an `Infinity`", () => {
    // AC 5, `directionOf`'s precedent. The target is relaxed so the precision
    // question passes and the zero is the only thing left to refuse — which is
    // also what proves the ORDER below.
    const outcome = volumeBaselineOf({
      sessions: [REGULAR],
      volumes: new Map([
        [minute(REGULAR, 0), 0],
        [minute(REGULAR, 1), 0],
        [minute(REGULAR, 2), 0],
        [minute(REGULAR, 3), 900],
      ]),
      priceRefusal: null,
    });
    if (outcome.kind !== "measured") throw new Error("expected a measurement");

    expect(outcome.buckets[0]?.median).toBe(0);

    const held = comparableVolumeBaseline(outcome, 0, 10);
    expect(held.comparable).toBe(false);
    if (held.comparable) return;
    expect(held.refusal).toBe("zero-volume-baseline");
    expect(held.sampleCount).toBe(4);
  });

  it("asks the precision question FIRST, because a thin bucket's median is routinely 0", () => {
    // The order is load-bearing: both refusals hold at once on a thin window,
    // and *we need more history* is the informative one. *This time of day
    // never trades* would send a reader looking for an illiquid security that
    // is not there.
    const outcome = volumeBaselineOf({
      sessions: [REGULAR],
      volumes: new Map([
        [minute(REGULAR, 0), 0],
        [minute(REGULAR, 1), 0],
        [minute(REGULAR, 2), 0],
        [minute(REGULAR, 3), 900],
      ]),
      priceRefusal: null,
    });

    const held = comparableVolumeBaseline(outcome, 0);
    expect(held.comparable).toBe(false);
    if (held.comparable) return;
    expect(held.refusal).toBe("too-few-sessions");
  });

  it("treats a bucket past the grid as a bucket with no samples", () => {
    // An afternoon slot on a window of half days. It is the same answer rather
    // than a fifth word, because there is nothing different a reader could do.
    const outcome = volumeBaselineOf({
      sessions: [EARLY],
      volumes: new Map([[minute(EARLY, 0), 50]]),
      priceRefusal: null,
    });
    if (outcome.kind !== "measured") throw new Error("expected a measurement");
    expect(outcome.bucketCount).toBe(42);

    const held = comparableVolumeBaseline(outcome, 70);
    expect(held.comparable).toBe(false);
    if (held.comparable) return;
    expect(held.refusal).toBe("too-few-sessions");
    expect(held.sampleCount).toBe(0);
  });
});

describe("the tape", () => {
  it("is `iex`, by name — Gate 1 decision 1", () => {
    // Same-tape or refusal: the numerator is the live IEX socket's own volume,
    // and an IEX numerator over a consolidated-tape baseline is systematically
    // far below 1 regardless of how unusual the volume is.
    expect(VOLUME_BASELINE_FEED).toBe("iex");
  });
});
