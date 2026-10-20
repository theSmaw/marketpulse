// The volume factor's numerator contract and its six refusals (Task 5.5.4).
//
// **What this level can and cannot see.** Everything here is pure — the figure
// and the stored row are arguments — so this file can prove the division, the
// ordering of the refusals and every one of the six words. What it structurally
// cannot see is a stored row with an `iex` bar behind it, because no machine
// outside Azure holds one: `volume-baselines.database.test.ts` is the level
// that builds two tapes, and **no gated machine has ever drawn this figure.**

import { describe, expect, it } from "vitest";

import { toTicker } from "@marketpulse/shared";

import { RETURN_SPAN_MINUTES } from "./five-minute-return.js";
import { volumeRateOf } from "./volume-ratio.js";

import type { FiveMinuteReturn } from "./five-minute-return.js";
import type { StoredVolumeBaseline } from "./volume-baseline-store.js";

const NVDA = toTicker("NVDA");

const instant = (minute: string): Date =>
  new Date(`2026-09-16T${minute}:00.000Z`);

const SOURCE = {
  provider: "alpaca",
  feed: "iex",
  retrievedAt: "2026-09-16T14:06:00.000Z",
  // One bar, because a `ReturnEndpoint`'s source describes the bar it came
  // with — this module reads only the feed off it.
  barCount: 1,
} as const;

/**
 * A measured return over the five minutes ending at `to`, carrying a volume.
 *
 * Built by hand rather than through `fiveMinuteReturn` on purpose: this module
 * is the consumer of that one's output, and the pair `(observed, volume)` is
 * exactly what has to be varied to reach the refusals.
 */
const measured = (
  observed: number,
  volume: number,
  to = "14:05",
): FiveMinuteReturn => ({
  measured: true,
  percent: 0.42,
  from: { startsAt: instant("14:00"), close: 100, source: SOURCE },
  to: { startsAt: instant(to), close: 100.42, source: SOURCE },
  observed,
  spanMinutes: RETURN_SPAN_MINUTES,
  volume,
});

/** The window held nothing at all — a cold process's first five minutes. */
const NOTHING: FiveMinuteReturn = {
  measured: false,
  refusal: "nothing-observed",
  seen: undefined,
};

/**
 * A stored generation whose every bucket holds the same median, `n` and error.
 *
 * 78 buckets, which is a regular session's grid. 14:05Z is 10:05 ET, minute 35
 * of the session, so the bucket under test is **7** — and the test that proves
 * which bucket is read varies one entry rather than the whole array.
 */
const generation = (
  median: number | null,
  samples = 2000,
  relativeStandardError: number | null = 0.03,
): StoredVolumeBaseline => ({
  symbol: NVDA,
  observedAt: instant("20:00"),
  lookbackSessions: 60,
  bucketMinutes: 5,
  bucketCount: 78,
  sampleCount: samples * 78,
  refusal: null,
  buckets: Array.from({ length: 78 }, () => ({
    median,
    samples,
    relativeStandardError,
  })),
});

describe("the numerator contract — a RATE, never five times the median", () => {
  it("divides the span's shares per minute by the typical MINUTE", () => {
    // 50,000 shares over five minutes is 10,000 a minute, against a typical
    // minute of 2,500: `4.0× typical`.
    const answer = volumeRateOf(measured(5, 50_000), generation(2_500));

    expect(answer).toMatchObject({ measured: true, ratio: 4 });
  });

  it("is NOT the sum against five times the median, which would be 0.8", () => {
    // The defect this contract exists to forbid, stated as a number rather
    // than as a sentence: `5 × median` is *the typical five-minute volume*,
    // which is not a quantity this product holds — the median of a sum is not
    // the sum of medians. Both expressions are one keystroke apart and only
    // one of them is a figure about a minute.
    const answer = volumeRateOf(measured(5, 50_000), generation(2_500));

    expect(answer).toMatchObject({ measured: true });
    expect(answer.measured && answer.ratio).not.toBeCloseTo(0.8);
  });

  it("reads the lookback and the grid stride off the ROW, never a constant", () => {
    const answer = volumeRateOf(measured(5, 50_000), {
      ...generation(2_500),
      lookbackSessions: 40,
      bucketMinutes: 15,
    });

    expect(answer).toMatchObject({
      measured: true,
      lookbackSessions: 40,
      bucketMinutes: 15,
      sampleCount: 2000,
      spanMinutes: 5,
      // Invariant 6, and Gate 1 decision 1: ONE tape, because the numerator is
      // the live IEX socket's and the baseline's query names `iex`.
      feed: "iex",
    });
  });

  it("reads the bucket the NEWEST observed minute sits in", () => {
    // 14:05Z is minute 35 of the session, so bucket 7. The baseline below is
    // flat except at 7, and the ratio names which entry was read.
    const row = generation(1);
    // **Narrowed rather than spread**, because `buckets` is a member of the
    // measured arm alone — which is the shape `comparableVolumeBaseline`
    // relies on and this file should not route around.
    if (row.refusal !== null) throw new Error("the fixture is a refusal");
    const buckets = [...row.buckets];
    buckets[7] = { median: 1_000, samples: 2_000, relativeStandardError: 0.03 };

    const answer = volumeRateOf(measured(5, 50_000), { ...row, buckets });

    expect(answer).toMatchObject({ measured: true, ratio: 10 });
  });
});

describe("the six refusals, and no two of them are one fact", () => {
  it("`no-same-tape-baseline` for a security with no row at all", () => {
    // **Every laptop and every gated run, permanently** — the pass writes no
    // row for a security with no `iex` bar in the window.
    expect(volumeRateOf(measured(5, 50_000), undefined)).toStrictEqual({
      measured: false,
      refusal: "no-same-tape-baseline",
      sampleCount: 0,
      observed: 5,
      spanMinutes: 5,
    });
  });

  it("`split-discontinuity`, READ from the price pass's verdict", () => {
    const answer = volumeRateOf(measured(5, 50_000), {
      symbol: NVDA,
      observedAt: instant("20:00"),
      lookbackSessions: 60,
      bucketMinutes: 5,
      bucketCount: 78,
      sampleCount: 1_234,
      refusal: "split-discontinuity",
    });

    expect(answer).toMatchObject({
      measured: false,
      refusal: "split-discontinuity",
      sampleCount: 1_234,
    });
  });

  it("`no-bar-in-bucket` where the window held nothing — never a 0× figure", () => {
    expect(volumeRateOf(NOTHING, generation(2_500))).toStrictEqual({
      measured: false,
      refusal: "no-bar-in-bucket",
      sampleCount: 0,
      observed: 0,
      spanMinutes: 5,
    });
  });

  it("`bucket-partially-observed` at two of five, with the count on the frame", () => {
    // The refusal with three wrong answers and no right one: `× 5/2` imputes,
    // `/ 2` is the same imputation rearranged, and `/ 5` reads the three
    // minutes IEX did not print as zero shares.
    const answer = volumeRateOf(measured(2, 20_000), generation(2_500));

    expect(answer).toStrictEqual({
      measured: false,
      refusal: "bucket-partially-observed",
      sampleCount: 2_000,
      observed: 2,
      spanMinutes: 5,
    });
  });

  it("`too-few-sessions` where the bucket cannot support one decimal", () => {
    // The bound is applied when the row is READ, so a generation computed
    // before the target existed is refused without being recomputed. 10.65%
    // is the deployment's own measured `iex` figure for NVDA — the best case
    // in the universe — and it does not clear 5%.
    const answer = volumeRateOf(
      measured(5, 50_000),
      generation(2_500, 80, 0.1065),
    );

    expect(answer).toMatchObject({
      measured: false,
      refusal: "too-few-sessions",
      sampleCount: 80,
    });
  });

  it("`zero-volume-baseline` rather than an Infinity (AC 5)", () => {
    const answer = volumeRateOf(measured(5, 50_000), generation(0));

    expect(answer).toMatchObject({
      measured: false,
      refusal: "zero-volume-baseline",
    });
  });
});

describe("the order the questions are asked in", () => {
  it("reports the DURABLE refusal over the passing one", () => {
    // *We have never heard IEX for this security* does not change this
    // session; *we heard two of these five minutes* changes in a minute. The
    // transient sentence would hide the one that explains why the figure will
    // not appear at all.
    expect(volumeRateOf(measured(2, 20_000), undefined)).toMatchObject({
      refusal: "no-same-tape-baseline",
      observed: 2,
    });
  });

  it("asks the numerator before the bucket's precision", () => {
    // A window that heard nothing cannot have a time of day, so *we have too
    // little history at this time of day* would be a sentence about a bucket
    // nobody looked up.
    expect(volumeRateOf(NOTHING, generation(2_500, 80, 0.2))).toMatchObject({
      refusal: "no-bar-in-bucket",
    });
  });

  it("answers a minute outside the session as history we do not hold", () => {
    // 22:30Z is 18:30 ET — the live writer keeps extended hours and the
    // baseline's grid is regular-session only, so we hold no minutes of that
    // time of day at all. Deliberately not a seventh word.
    const answer = volumeRateOf(
      measured(5, 50_000, "22:30"),
      generation(2_500),
    );

    expect(answer).toMatchObject({
      measured: false,
      refusal: "too-few-sessions",
      sampleCount: 0,
    });
  });
});
