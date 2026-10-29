import { describe, expect, it } from "vitest";

import {
  describeDrawableBuckets,
  noVolumeTally,
  tallyVolumeBuckets,
} from "./compute-baselines.js";
import type { MeasuredVolumeOutcome } from "./compute-baselines.js";
import type { BaselineSubject } from "./return-baseline-store.js";
import type { VolumeBucketBaseline } from "./volume-baseline.js";
import { TARGET_RELATIVE_STANDARD_ERROR } from "./volume-baseline.js";
import { SAMPLE_SPAN_MINUTES } from "./return-baseline.js";

/**
 * **The drawable `(symbol, bucket)` pairs the nightly pass names** (Task
 * 5.7.1).
 *
 * The properties under test are the loop's and the renderer's, which is why
 * both are reached directly rather than through `computeBaselines()` — that
 * needs a pool, a store and a window, and none of the three decides whether a
 * sample is bounded.
 *
 * Every verdict comes from `comparableVolumeBaseline`; nothing here re-states
 * what drawable means, and a test that did would be the second answer that
 * function exists to prevent.
 */

const subjectOf = (symbol: string): BaselineSubject => ({
  id: "1",
  symbol: symbol as BaselineSubject["symbol"],
});

/** A bucket this product is willing to divide by. */
const drawable: VolumeBucketBaseline = {
  median: 1_200,
  samples: 3_000,
  relativeStandardError: TARGET_RELATIVE_STANDARD_ERROR / 2,
};

/** Samples, but nowhere near the precision target — `too-few-sessions`. */
const thin: VolumeBucketBaseline = {
  median: 900,
  samples: 80,
  relativeStandardError: 0.1065,
};

/** A time of day that never trades — `zero-volume-baseline`. */
const zero: VolumeBucketBaseline = {
  median: 0,
  samples: 3_000,
  relativeStandardError: TARGET_RELATIVE_STANDARD_ERROR / 2,
};

/** No sample at all — a fact about the grid, counted outside the partition. */
const empty: VolumeBucketBaseline = {
  median: null,
  samples: 0,
  relativeStandardError: null,
};

const outcomeOf = (
  buckets: readonly VolumeBucketBaseline[],
): MeasuredVolumeOutcome => ({
  kind: "measured",
  bucketCount: buckets.length,
  buckets,
  sampleCount: buckets.reduce((total, bucket) => total + bucket.samples, 0),
});

describe("tallyVolumeBuckets", () => {
  it("names the drawable pairs and nothing else", () => {
    const tally = noVolumeTally();

    tallyVolumeBuckets(
      subjectOf("NVDA"),
      outcomeOf([empty, thin, drawable, zero, drawable]),
      tally,
    );

    expect(tally.drawable).toEqual([
      { symbol: "NVDA", bucket: 2 },
      { symbol: "NVDA", bucket: 4 },
    ]);
    expect(tally.buckets).toEqual({
      total: 4,
      measured: 2,
      tooFewSessions: 1,
      zeroVolume: 1,
      empty: 1,
    });
  });

  it("accumulates across securities, in the order the pass ran them", () => {
    const tally = noVolumeTally();

    tallyVolumeBuckets(subjectOf("AAPL"), outcomeOf([drawable]), tally);
    tallyVolumeBuckets(subjectOf("MSFT"), outcomeOf([thin, drawable]), tally);

    expect(tally.drawable).toEqual([
      { symbol: "AAPL", bucket: 0 },
      { symbol: "MSFT", bucket: 1 },
    ]);
  });

  it("caps the list without touching the count", () => {
    const tally = noVolumeTally();
    const buckets = Array.from({ length: 57 }, () => drawable);

    tallyVolumeBuckets(subjectOf("NVDA"), outcomeOf(buckets), tally);

    // The cap is the module's own, deliberately not re-spelled here: what this
    // asserts is the relationship, which is the property the pass relies on —
    // the list is bounded and strictly shorter than the exact count, and the
    // count is every drawable bucket there was.
    expect(tally.buckets.measured).toBe(57);
    expect(tally.buckets.total).toBe(57);
    expect(tally.drawable.length).toBeLessThan(57);
    expect(tally.drawable).toHaveLength(
      describeDrawableBuckets(tally).split(", … and ")[0]?.split(", ").length ??
        0,
    );
  });
});

describe("describeDrawableBuckets", () => {
  it("renders each pair as an index and an offset from the open", () => {
    const tally = noVolumeTally();

    tallyVolumeBuckets(
      subjectOf("NVDA"),
      outcomeOf([...Array.from({ length: 31 }, () => thin), drawable]),
      tally,
    );

    expect(describeDrawableBuckets(tally)).toBe(
      `NVDA bucket 31 (open+${String(31 * SAMPLE_SPAN_MINUTES)}m)`,
    );
    // The offset is the one the module's docblock quotes, so a changed stride
    // fails here rather than quietly re-timing the sitting's instruction.
    expect(describeDrawableBuckets(tally)).toContain("(open+155m)");
  });

  it("reports what the cap elided, off the exact count", () => {
    const tally = noVolumeTally();

    tallyVolumeBuckets(
      subjectOf("NVDA"),
      outcomeOf(Array.from({ length: 57 }, () => drawable)),
      tally,
    );

    const line = describeDrawableBuckets(tally);
    const elided = 57 - tally.drawable.length;

    expect(line.endsWith(`, … and ${String(elided)} more`)).toBe(true);
    expect(elided).toBeGreaterThan(0);
  });

  it("says `none` where the pass drew nothing — CI's permanent state", () => {
    const tally = noVolumeTally();

    tallyVolumeBuckets(subjectOf("NVDA"), outcomeOf([thin, empty]), tally);

    expect(tally.drawable).toEqual([]);
    expect(describeDrawableBuckets(tally)).toBe("none");
  });
});
