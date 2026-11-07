import { describe, expect, it } from "vitest";

import { toTicker } from "@marketpulse/shared";
import type { Ticker } from "@marketpulse/shared";

import {
  accumulateCorrelationInput,
  describeDrawableBuckets,
  noCorrelationTally,
  noVolumeTally,
  tallyVolumeBuckets,
} from "./compute-baselines.js";
import type {
  CorrelationTally,
  MeasuredVolumeOutcome,
} from "./compute-baselines.js";
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

/**
 * **The correlation pass's own input gate** (Task 6.5.4).
 *
 * Story 6.5's resolved Open Decision 4 — *no landmark node ever forms a
 * correlation pair* — is asserted on the **producer**, which `0018` §6 records
 * the reason for, and until this task the only thing asserting it was a
 * property of the population the gate is built from: a database test showing
 * no sector ETF or proxy is in `equityTickers()`. That claim stays true with
 * the gate deleted. This exercises the gate itself, over real landmark tickers
 * among otherwise equity-shaped input, and it is reached directly for
 * `tallyVolumeBuckets`' own reason: `runPass` needs a pool, six stores and a
 * window, and none of the seven decides which securities are admitted.
 */
describe("accumulateCorrelationInput", () => {
  /** A grid with one sample in it — enough to be a series. */
  const series = (): ReadonlyMap<number, number> => new Map([[0, 0.01]]);

  const admit = (
    symbol: string,
    outcomeKind: "measured" | "refused" | "none",
    seriesOf: Map<Ticker, ReadonlyMap<number, number>>,
    tally: CorrelationTally,
    onSeries: () => void = () => undefined,
  ): void => {
    accumulateCorrelationInput(
      {
        symbol: toTicker(symbol),
        outcomeKind,
        series: () => {
          onSeries();
          return series();
        },
      },
      seriesOf,
      tally,
    );
  };

  it("admits an equity's series and counts it tracked and eligible", () => {
    const seriesOf = new Map<Ticker, ReadonlyMap<number, number>>();
    const tally = noCorrelationTally();

    admit("AAPL", "measured", seriesOf, tally);

    expect([...seriesOf.keys()]).toEqual([toTicker("AAPL")]);
    expect(tally.trackedEquities).toBe(1);
    expect(tally.eligibleEquities).toBe(1);
  });

  // **The gate, over the real fifteen rather than a stand-in.** `SPY`
  // correlates with nearly every equity in the universe, so one admitted
  // landmark is ~500 edges converging on one node — the starburst §10 exists
  // to prevent, and a picture no check but this one would have refused.
  it("admits no landmark, whatever its own outcome says", () => {
    const seriesOf = new Map<Ticker, ReadonlyMap<number, number>>();
    const tally = noCorrelationTally();

    for (const landmark of ["SPY", "QQQ", "DIA", "IWM", "XLK", "XLF"]) {
      admit(landmark, "measured", seriesOf, tally);
    }

    expect([...seriesOf.keys()]).toEqual([]);
    // Not merely absent from the series map: absent from every population the
    // pass row states, so `trackedEquities` cannot silently count a security
    // that formed no pair.
    expect(tally.trackedEquities).toBe(0);
    expect(tally.eligibleEquities).toBe(0);
    expect(tally.splitDiscontinuity).toBe(0);
    expect(tally.absent).toBe(0);
  });

  it("does not even build a landmark's series", () => {
    // The thunk is the extraction's own evidence that the gate runs FIRST: a
    // refused subject costs the walk over its closes nothing.
    const seriesOf = new Map<Ticker, ReadonlyMap<number, number>>();
    const tally = noCorrelationTally();
    let built = 0;

    admit("SPY", "measured", seriesOf, tally, () => {
      built += 1;
    });
    expect(built).toBe(0);

    admit("AAPL", "measured", seriesOf, tally, () => {
      built += 1;
    });
    expect(built).toBe(1);
  });

  it("partitions the equities it admits by the price pass's own verdict", () => {
    const seriesOf = new Map<Ticker, ReadonlyMap<number, number>>();
    const tally = noCorrelationTally();

    admit("AAPL", "measured", seriesOf, tally);
    admit("CRWD", "refused", seriesOf, tally);
    admit("MSFT", "none", seriesOf, tally);
    // And one landmark in the same run, so the partition is proved to sum over
    // the admitted population rather than over the input.
    admit("SPY", "measured", seriesOf, tally);

    expect(tally.trackedEquities).toBe(3);
    expect(
      tally.eligibleEquities + tally.splitDiscontinuity + tally.absent,
    ).toBe(tally.trackedEquities);
    expect([...seriesOf.keys()]).toEqual([toTicker("AAPL")]);
  });
});
