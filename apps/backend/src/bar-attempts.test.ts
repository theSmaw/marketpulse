// The attempt log's vocabulary, and the two locks that hold it in place
// (Task 2.8.7).
//
// The repository needs a database and is exercised in
// `bar-attempts.database.test.ts`. What is here is the vocabulary — which is the
// half that can go silently wrong, because a ninth `BarsResult` member added
// without a spelling here is a member the log cannot record.

import { describe, expect, it } from "vitest";

import {
  attemptNeedsAttention,
  attemptOutcomeFor,
  BAR_ATTEMPT_OUTCOMES,
  type BarAttemptOutcome,
} from "./bar-attempts.js";
import { isRetryableOutcome, type BarsResult } from "./market-data-provider.js";
import {
  toBarSeries,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
} from "@marketpulse/shared";

/**
 * Every `BarsResult` member, constructed.
 *
 * A `Record` keyed by the discriminator rather than an array, which is Task
 * 2.6.5's correction to itself: an exhaustive `switch` proves every member is
 * *handled* and says nothing about whether a test ever *constructs* one. This
 * shape means a ninth member fails to compile here as a missing key.
 */
const EVERY_RESULT: Record<BarsResult["outcome"], BarsResult> = {
  ok: {
    outcome: "ok",
    series: toBarSeries({
      symbol: toTicker("NVDA"),
      timeframe: "1m",
      bars: [],
      provenance: toSeriesProvenance("raw", {
        provider: "alpaca",
        feed: "sip",
        retrievedAt: "2026-03-07T00:00:00.000Z",
        barCount: 0,
      }),
      coverage: {
        requested: toTimeRange(
          new Date("2026-03-02T14:30:00.000Z"),
          new Date("2026-03-02T21:00:00.000Z"),
        ),
        // An empty answer carries no window, which is the whole reason it is
        // recorded in neither `market_bars` nor `bar_coverage`.
        covered: null,
      },
    }),
  },
  timeout: { outcome: "timeout", deadlineMs: 3_000 },
  aborted: { outcome: "aborted" },
  "unknown-symbol": { outcome: "unknown-symbol" },
  "range-not-available": { outcome: "range-not-available" },
  "rate-limited": { outcome: "rate-limited" },
  unauthorised: { outcome: "unauthorised" },
  "upstream-unavailable": { outcome: "upstream-unavailable" },
};

describe("BAR_ATTEMPT_OUTCOMES", () => {
  it("carries every provider outcome plus our own refusal", () => {
    for (const result of Object.values(EVERY_RESULT)) {
      expect(BAR_ATTEMPT_OUTCOMES).toContain(attemptOutcomeFor(result));
    }
    // `coverage-gap` is not a vendor outcome. It is `market-bars.ts` refusing a
    // write that would make the ledger claim a window it does not hold, which
    // Task 2.8.6 measured as the one state that persists in the data — a
    // permanently shorter covered range — and is explained nowhere else.
    expect(BAR_ATTEMPT_OUTCOMES).toContain("coverage-gap");
    expect(BAR_ATTEMPT_OUTCOMES).toHaveLength(
      Object.keys(EVERY_RESULT).length + 1,
    );
  });

  it("has no member it cannot classify", () => {
    for (const outcome of BAR_ATTEMPT_OUTCOMES) {
      expect(typeof attemptNeedsAttention(outcome)).toBe("boolean");
    }
  });
});

describe("attemptOutcomeFor", () => {
  it("spells a provider outcome verbatim, so no second vocabulary exists", () => {
    for (const [outcome, result] of Object.entries(EVERY_RESULT)) {
      expect(attemptOutcomeFor(result)).toBe(outcome);
    }
  });

  it("records a successful EMPTY answer as `ok`, which is the whole point", () => {
    // A success that left bars has no row at all, so there is no ambiguity to
    // resolve — and this is the one success the log has to record, because it
    // writes no bars and extends no ledger and is therefore in neither table.
    expect(attemptOutcomeFor(EVERY_RESULT.ok)).toBe("ok");
  });
});

describe("attemptNeedsAttention", () => {
  it("separates come back from stop", () => {
    // The task file's own words: a report that treats them alike sends somebody
    // looking at a network when the key is wrong.
    expect(attemptNeedsAttention("rate-limited")).toBe(false);
    expect(attemptNeedsAttention("upstream-unavailable")).toBe(false);
    expect(attemptNeedsAttention("unauthorised")).toBe(true);
  });

  it("is NOT the negation of isRetryableOutcome, and two members prove it", () => {
    // The two classify different things and are deliberately not each other's
    // inverse: that one classifies a *cause* for a retry wrapper inside one
    // request, this classifies a *stored record* for a person deciding whether
    // to run the command again. They part company on two members.
    //
    // `aborted` is not retryable — the caller tore the request down — and is
    // also nothing a person acts on, because it is a fact about our own
    // lifecycle rather than about the backend or the vendor. Task 1.12.2 drew
    // that line and this is the same one.
    expect(isRetryableOutcome(EVERY_RESULT.aborted)).toBe(false);
    expect(attemptNeedsAttention("aborted")).toBe(false);

    // `coverage-gap` is not a `BarsResult` member at all, so the retry wrapper
    // has no opinion about it — and it is the most actionable thing this log
    // can hold, because re-running produces the same refusal at the same place
    // forever until a person back-fills the missing sessions.
    expect(attemptNeedsAttention("coverage-gap")).toBe(true);

    // Everything else does line up, which is what makes the two exceptions
    // worth naming rather than a general disclaimer.
    for (const result of Object.values(EVERY_RESULT)) {
      const outcome = attemptOutcomeFor(result);
      if (outcome === "ok" || outcome === "aborted") continue;
      expect(attemptNeedsAttention(outcome)).toBe(!isRetryableOutcome(result));
    }
  });

  it("does not treat an untraded session as something to act on", () => {
    const untraded: BarAttemptOutcome = "ok";
    expect(attemptNeedsAttention(untraded)).toBe(false);
  });
});
