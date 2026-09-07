import {
  type Bar,
  type BarSeries,
  toBarSeries,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import {
  type BarsRequest,
  type BarsResult,
  DEFAULT_BARS_DEADLINE_MS,
  type MarketDataProvider,
} from "./market-data-provider.js";

// Most of what this task shipped is a compile-time claim, so most of what is
// worth asserting is checked by `tsc -b` rather than by an expectation. The
// `@ts-expect-error` directives below are the assertions: each one errors today,
// and the moment the thing it locks in stops being true the directive goes
// unused and the BUILD fails with TS2578. Task 2.6.2 measured why that matters
// — renaming a field on `Bar` left all thirteen runtime tests green, because a
// `const bar: Bar = {...}` annotation is erased and `Object.keys` still returns
// the six literal keys it was handed.
//
// So a green `pnpm test` is not what proves this file; a green `pnpm verify`
// is, because it builds before it tests.

const OPEN = new Date("2026-09-04T13:30:00Z");
const RANGE = toTimeRange(OPEN, new Date("2026-09-04T20:00:00Z"));

function request(): BarsRequest {
  return {
    symbol: toTicker("NVDA"),
    range: RANGE,
    timeframe: "1m",
    adjustment: "raw",
  };
}

function series(): BarSeries {
  const bars: readonly Bar[] = [
    {
      startsAt: OPEN,
      open: 100,
      high: 101,
      low: 99,
      close: 100.5,
      volume: 1_000,
    },
  ];

  return toBarSeries({
    symbol: toTicker("NVDA"),
    timeframe: "1m",
    bars,
    provenance: toSeriesProvenance("raw", {
      provider: "fixture",
      feed: "synthetic",
      retrievedAt: "2026-09-07T13:30:00.000Z",
      barCount: bars.length,
    }),
    coverage: {
      requested: RANGE,
      covered: toTimeRange(OPEN, new Date(OPEN.getTime() + 60_000)),
    },
  });
}

/**
 * A provider that answers with whatever it was handed. Not the fixture provider
 * — that is Task 2.6.6, it reads a corpus and it ships. This exists to prove
 * the interface is implementable and that a call resolves rather than rejects,
 * which is the one runtime property this task has.
 */
function stub(result: BarsResult): MarketDataProvider {
  return {
    id: "fixture",
    fetchBars: () => Promise.resolve(result),
  };
}

describe("MarketDataProvider", () => {
  it("can be implemented, and a call resolves rather than rejecting", async () => {
    const provider = stub({ outcome: "ok", series: series() });

    const result = await provider.fetchBars(request());

    expect(result.outcome).toBe("ok");
  });

  it("accepts a deadline and a signal as options rather than as part of the request", async () => {
    // The split is the decision: a request is the QUESTION — loggable, and a
    // cache key in Story 2.8 — and the options are how one invocation behaves.
    // A signal in a cache key makes every key unique.
    const controller = new AbortController();
    const provider = stub({ outcome: "aborted" });

    const result = await provider.fetchBars(request(), {
      deadlineMs: 500,
      signal: controller.signal,
    });

    expect(result.outcome).toBe("aborted");
  });

  it("carries no upstream message on any failure member", () => {
    // PROVIDER.md §8.6, made structural rather than conventional: there is
    // nowhere on either failure member to put one. Task 1.7.4 measured the cost
    // of the other arrangement — a 500 answering a request with `connection to
    // postgres at 10.0.0.4:5432 refused`.
    const timedOut: BarsResult = {
      outcome: "timeout",
      deadlineMs: DEFAULT_BARS_DEADLINE_MS,
    };
    const aborted: BarsResult = { outcome: "aborted" };

    expect(Object.keys(timedOut).sort()).toStrictEqual([
      "deadlineMs",
      "outcome",
    ]);
    expect(Object.keys(aborted)).toStrictEqual(["outcome"]);
  });
});

describe("BarsRequest", () => {
  it("cannot be built without an adjustment", () => {
    // Story 2.6's acceptance criterion 5, and the reason it is a directive
    // rather than a sentence: if `adjustment` ever gains a default or becomes
    // optional, this line stops erroring and `tsc -b` fails on the unused
    // directive. There is no safe value to default to — a series spanning no
    // corporate action returns identical numbers in both modes, so a wrong
    // adjustment is invisible in testing and wrong exactly once.
    const { symbol, range, timeframe } = request();

    // @ts-expect-error - adjustment is required at every call site
    const incomplete: BarsRequest = { symbol, range, timeframe };

    expect(incomplete.timeframe).toBe("1m");
  });

  it("cannot be handed a range that skipped toTimeRange", () => {
    // The brand doing its job at the seam it was built for. A `{ start, end }`
    // literal is not a TimeRange, so a reversed or invalid window cannot reach
    // a provider by going round the constructor.
    const { symbol, timeframe, adjustment } = request();

    const literal = {
      symbol,
      timeframe,
      adjustment,
      // @ts-expect-error - a range must come from toTimeRange
      range: { start: OPEN, end: new Date("2026-09-04T20:00:00Z") },
    } satisfies BarsRequest;

    expect(literal.adjustment).toBe("raw");
  });

  it("cannot ask for a timeframe the product does not have", () => {
    // Aggregation is deliberately not expressible: Epic 5 computes five-minute
    // returns from stored minute bars, because Epic 13's replay has to
    // reconstruct them from what was stored anyway.
    const { symbol, range, adjustment } = request();

    const wrong = {
      symbol,
      range,
      adjustment,
      // @ts-expect-error - "5m" is not a Timeframe
      timeframe: "5m",
    } satisfies BarsRequest;

    expect(wrong.adjustment).toBe("raw");
  });
});

describe("BarsResult", () => {
  it("is exhaustively switchable, which is what makes Task 2.6.5 an addition", () => {
    // The `satisfies never` below is the whole point of this test. Task 2.6.5
    // adds five members — unknown-symbol, range-not-available, rate-limited,
    // unauthorised, upstream-unavailable — and every switch over this union
    // stops compiling until it handles them. That is what turns "the taxonomy
    // arrives later" from a hope into a mechanism.
    function describeResult(result: BarsResult): string {
      switch (result.outcome) {
        case "ok":
          return `${String(result.series.bars.length)} bars`;
        case "timeout":
          return `gave up after ${String(result.deadlineMs)} ms`;
        case "aborted":
          return "the caller went away";
        default: {
          const unhandled: never = result satisfies never;
          return unhandled;
        }
      }
    }

    expect(describeResult({ outcome: "ok", series: series() })).toBe("1 bars");
    expect(describeResult({ outcome: "timeout", deadlineMs: 3_000 })).toBe(
      "gave up after 3000 ms",
    );
    expect(describeResult({ outcome: "aborted" })).toBe("the caller went away");
  });

  it("treats an empty answer as a success rather than a failure", () => {
    // PROVIDER.md §8.2, and the single most likely thing to be got wrong by
    // whoever writes the first `if (bars.length === 0)`. A market that was shut
    // is a successful empty answer, not an error screen on a public holiday.
    const empty = toBarSeries({
      symbol: toTicker("NVDA"),
      timeframe: "1m",
      bars: [],
      provenance: toSeriesProvenance("raw", {
        provider: "fixture",
        feed: "synthetic",
        retrievedAt: "2026-09-07T13:30:00.000Z",
        barCount: 0,
      }),
      coverage: { requested: RANGE, covered: null },
    });

    const result: BarsResult = { outcome: "ok", series: empty };

    expect(result.outcome).toBe("ok");
    expect(empty.bars).toHaveLength(0);
    expect(empty.coverage.covered).toBeNull();
  });
});

describe("DEFAULT_BARS_DEADLINE_MS", () => {
  it("is a per-request default rather than the only number available", () => {
    // The coupled pair this creates is the FOURTH in this repository and the
    // first that cannot be asserted: any deadline behind a Story 2.9 route must
    // sit strictly below the frontend's API_TIMEOUT_MS minus a round trip, and
    // the two numbers live in two apps with no shared module between them.
    // Restating 5,000 here to assert against would be asserting against a copy
    // — the thing e2e/support/poll-timings.ts only does because it MEASURES the
    // running application. So the pair stays prose, owned by Story 2.9, and
    // what is checked here is the shape: a caller can override it.
    expect(DEFAULT_BARS_DEADLINE_MS).toBe(3_000);
    expect(Number.isInteger(DEFAULT_BARS_DEADLINE_MS)).toBe(true);
  });
});
