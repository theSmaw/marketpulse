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
  isRetryableOutcome,
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
 * Every member of the union, exactly once, keyed by its own discriminator.
 *
 * **A `Record<BarsResult["outcome"], BarsResult>` rather than an array, and
 * that is the whole reason it exists** — it is the same idiom `health.ts`'s
 * response schema uses, where a `satisfies Record<keyof …>` turns a forgotten
 * field into `TS1360`. A ninth outcome added without an entry here is a
 * **compile error naming the missing key**, and an entry for an outcome that
 * does not exist is an excess-property error, so it is checked in both
 * directions.
 *
 * That closes the gap an exhaustive `switch` leaves on its own: a `switch`
 * proves every member is *handled* by the code under test and says nothing
 * about whether a test ever *constructs* one. Both mechanisms are wanted, and
 * an array would have given only the first.
 */
const EVERY_OUTCOME = {
  ok: { outcome: "ok", series: series() },
  timeout: { outcome: "timeout", deadlineMs: DEFAULT_BARS_DEADLINE_MS },
  aborted: { outcome: "aborted" },
  "unknown-symbol": { outcome: "unknown-symbol" },
  "range-not-available": { outcome: "range-not-available" },
  "rate-limited": { outcome: "rate-limited" },
  unauthorised: { outcome: "unauthorised" },
  "upstream-unavailable": { outcome: "upstream-unavailable" },
} as const satisfies Record<BarsResult["outcome"], BarsResult>;

/** Insertion order, which is `BarsResult`'s own declaration order. */
const EVERY_RESULT: readonly BarsResult[] = Object.values(EVERY_OUTCOME);

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

  it("carries no upstream message or body on any failure member", () => {
    // PROVIDER.md §8.6, made structural rather than conventional: there is
    // nowhere on ANY failure member to put one. Task 1.7.4 measured the cost of
    // the other arrangement — a 500 answering a request with `connection to
    // postgres at 10.0.0.4:5432 refused` — and its lesson is the half that
    // looks harmless: a message written for a developer is internal detail too.
    //
    // Asserted by enumerating the keys of every member rather than by checking
    // for a `message` field, because the failure this guards against is a
    // provider stuffing the vendor's prose into whatever field happens to exist.
    const keys = EVERY_RESULT.map((result) => Object.keys(result).sort());

    expect(keys).toStrictEqual([
      ["outcome", "series"],
      ["deadlineMs", "outcome"],
      ["outcome"],
      ["outcome"],
      ["outcome"],
      ["outcome"],
      ["outcome"],
      ["outcome"],
    ]);
  });

  it("refuses a member carrying the upstream's own words", () => {
    // The structural half of the claim above. `message`, `body` and `cause` are
    // the three fields a provider reaches for under pressure, and none of them
    // exists on any member — so this is a compile error rather than a review
    // comment. Note the trap next door that makes the runtime test above
    // insufficient on its own: Task 2.1.7 found `fast-json-stringify` strips a
    // property the schema does not declare, so a green leak test can be green
    // for the wrong reason. Here the type is what holds it shut.
    const leaky = {
      outcome: "upstream-unavailable",
      // @ts-expect-error - no member may carry the vendor's message
      message: "connection to api.vendor.example refused",
    } satisfies BarsResult;

    expect(leaky.outcome).toBe("upstream-unavailable");
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
  it("is exhaustively switchable, and every one of the eight is written down", () => {
    // The `satisfies never` below is what made Task 2.6.5 an addition rather
    // than a rewrite: adding its five members took this file red with TS2322
    // and TS1360 before a line of it was edited. It stays because a ninth
    // member has to be as loud.
    //
    // The map afterwards is the other half. A switch proves every member is
    // HANDLED; it says nothing about whether a test ever CONSTRUCTS one, so
    // EVERY_OUTCOME is checked for completeness by covering the union.
    function describeResult(result: BarsResult): string {
      switch (result.outcome) {
        case "ok":
          return `${String(result.series.bars.length)} bars`;
        case "timeout":
          return `gave up after ${String(result.deadlineMs)} ms`;
        case "aborted":
          return "the caller went away";
        case "unknown-symbol":
          return "no such security";
        case "range-not-available":
          return "the vendor will not serve that window";
        case "rate-limited":
          return "we asked too often";
        case "unauthorised":
          return "the credential is wrong";
        case "upstream-unavailable":
          return "the vendor is down";
        default: {
          const unhandled: never = result satisfies never;
          return unhandled;
        }
      }
    }

    expect(EVERY_RESULT.map(describeResult)).toStrictEqual([
      "1 bars",
      "gave up after 3000 ms",
      "the caller went away",
      "no such security",
      "the vendor will not serve that window",
      "we asked too often",
      "the credential is wrong",
      "the vendor is down",
    ]);
    expect(EVERY_RESULT).toHaveLength(8);
  });

  it("keeps the two causes apart that a caller repairs differently", () => {
    // API_ERROR_CODES' rule, applied to the pair most likely to be merged by
    // somebody tidying. `timeout` is a joint fact about the vendor AND our own
    // patience, so it admits a repair — raise the deadline — that "they are
    // down" does not, and it is the only failure member carrying a number
    // because of it.
    const timedOut: BarsResult = { outcome: "timeout", deadlineMs: 3_000 };
    const down: BarsResult = { outcome: "upstream-unavailable" };

    expect(timedOut.outcome).not.toBe(down.outcome);
    expect(isRetryableOutcome(timedOut)).toBe(isRetryableOutcome(down));
    expect("deadlineMs" in down).toBe(false);
  });

  it("lets rate-limited omit its hint rather than carrying an undefined one", () => {
    // exactOptionalPropertyTypes, which is why a provider building this has to
    // branch the way apiError() does rather than assigning a possibly-undefined
    // value. Absent means the vendor did not say; it never means "immediately".
    const withHint: BarsResult = { outcome: "rate-limited", retryAfterMs: 750 };
    const without: BarsResult = { outcome: "rate-limited" };

    // @ts-expect-error - absent, never present-and-undefined
    const wrong: BarsResult = {
      outcome: "rate-limited",
      retryAfterMs: undefined,
    };

    expect("retryAfterMs" in withHint).toBe(true);
    expect("retryAfterMs" in without).toBe(false);
    expect(wrong.outcome).toBe("rate-limited");
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

describe("isRetryableOutcome", () => {
  it("classifies every outcome, and asking again is the exception", () => {
    // PROVIDER.md §8.1's third column, asserted rather than described. This is
    // the input to constraint 1 of the retry policy — only retryable causes are
    // retried — so getting it wrong is a wrapper hammering a vendor that has
    // already refused us, or one giving up on an outage that would have cleared.
    expect(
      EVERY_RESULT.filter(isRetryableOutcome).map((r) => r.outcome),
    ).toStrictEqual(["timeout", "rate-limited", "upstream-unavailable"]);
  });

  it("never retries a settled question or a configuration fault", () => {
    // The two that cost the most if this is got wrong, named individually so a
    // future edit to the switch cannot flip them silently. A retry on
    // `unauthorised` is a loop against a wall; a retry on `unknown-symbol` asks
    // a question the vendor has already answered definitively.
    expect(isRetryableOutcome({ outcome: "unauthorised" })).toBe(false);
    expect(isRetryableOutcome({ outcome: "unknown-symbol" })).toBe(false);
    expect(isRetryableOutcome({ outcome: "range-not-available" })).toBe(false);
  });

  it("does not retry on behalf of a caller that went away", () => {
    // `aborted` is not really a member of this question: there is nobody left
    // to retry for. It is false rather than absent so the classifier stays
    // total, which is what lets a wrapper call it on any result.
    expect(isRetryableOutcome({ outcome: "aborted" })).toBe(false);
    expect(isRetryableOutcome({ outcome: "ok", series: series() })).toBe(false);
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
