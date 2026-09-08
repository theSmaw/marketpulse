import {
  toMarketDate,
  toTicker,
  type TimeRange,
  toTimeRange,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { fixtureSessionOn } from "./fixture-corpus.js";
import { createFixtureProvider } from "./fixture-provider.js";
import {
  type BarsRequest,
  type BarsRequestOptions,
  type BarsResult,
  isRetryableOutcome,
  type MarketDataProvider,
} from "./market-data-provider.js";
import {
  MIN_ATTEMPT_BUDGET_MS,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  withRetry,
} from "./retry-provider.js";

const REGULAR = fixtureSessionOn(toMarketDate("2026-09-04"));
const RANGE: TimeRange = toTimeRange(REGULAR.open, REGULAR.close);

function requestFor(symbol: string): BarsRequest {
  return {
    symbol: toTicker(symbol),
    range: RANGE,
    timeframe: "1m",
    adjustment: "raw",
  };
}

/**
 * The delays the shipped policy would use are ~250 ms and up, and a suite that
 * waits them out is a suite nobody runs. Every test that exercises the schedule
 * therefore passes a short base and a fixed jitter source, so the delay is both
 * fast and deterministic — the numbers under test are the *rules*, and the
 * shipped constants are asserted separately against their own derivations.
 */
const FAST = { baseDelayMs: 4, maxDelayMs: 16, random: () => 1 } as const;

/**
 * A provider that counts, so "was it retried" is a fact rather than an
 * inference from elapsed time.
 *
 * The fixture provider is what everything else here composes around, but it
 * cannot change its mind: a corpus fault is permanent, so the
 * *recovers-on-a-later-attempt* case needs something that answers differently
 * the second time. This is that and nothing more — no `simulateError` reaches
 * the shipped interface, which is the rule Task 2.6.6 held.
 */
function countingProvider(results: readonly BarsResult[]): {
  readonly provider: MarketDataProvider;
  readonly calls: () => number;
  readonly deadlines: () => readonly (number | undefined)[];
} {
  let calls = 0;
  const deadlines: (number | undefined)[] = [];

  const provider: MarketDataProvider = {
    id: "fixture",
    feed: "synthetic",
    fetchBars: (_request: BarsRequest, options?: BarsRequestOptions) => {
      deadlines.push(options?.deadlineMs);
      const result = results[Math.min(calls, results.length - 1)];
      calls += 1;
      if (result === undefined) expect.fail("countingProvider needs a result");
      return Promise.resolve(result);
    },
  };

  return { provider, calls: () => calls, deadlines: () => deadlines };
}

const OK_RESULT: BarsResult = {
  outcome: "ok",
  series: {} as never,
};

describe("the retry wrapper's identity", () => {
  it("reports the id and feed of the provider it wraps rather than inventing its own", () => {
    // The property that lets Story 2.8 compose freely: provenance on a retried
    // series is identical to provenance on a first-attempt one, because this
    // wrapper never touches either field.
    const inner = createFixtureProvider();
    const wrapped = withRetry(inner);

    expect(wrapped.id).toBe(inner.id);
    expect(wrapped.feed).toBe(inner.feed);
  });

  it("passes an ok answer through untouched", async () => {
    const wrapped = withRetry(createFixtureProvider(), FAST);
    const result = await wrapped.fetchBars(requestFor("NVDA"));

    expect(result.outcome).toBe("ok");
  });
});

describe("what is retried, and what is not", () => {
  it("returns a non-retryable cause on the FIRST attempt, untouched", async () => {
    // `unauthorised` is a loop against a wall and `unknown-symbol` asks a
    // settled question again. Both come from the corpus rather than from a
    // flag.
    for (const symbol of ["ZZUA", "NOPE"]) {
      const { provider, calls } = countingProvider([
        await createFixtureProvider().fetchBars(requestFor(symbol)),
      ]);
      const result = await withRetry(provider, FAST).fetchBars(
        requestFor(symbol),
      );

      expect(isRetryableOutcome(result)).toBe(false);
      expect(calls()).toBe(1);
    }
  });

  it("retries a retryable cause and returns the answer that eventually arrives", async () => {
    const { provider, calls } = countingProvider([
      { outcome: "upstream-unavailable" },
      { outcome: "rate-limited" },
      OK_RESULT,
    ]);

    const result = await withRetry(provider, FAST).fetchBars(
      requestFor("NVDA"),
      { deadlineMs: 5_000 },
    );

    expect(result.outcome).toBe("ok");
    expect(calls()).toBe(3);
  });

  it("classifies through isRetryableOutcome rather than a second copy of the table", async () => {
    // Asserted as a property rather than by grepping: every member the
    // taxonomy calls non-retryable is returned on one attempt, and the two the
    // taxonomy calls retryable and that this wrapper can reach are retried.
    // A ninth member added without a decision therefore shows up here.
    const members: readonly BarsResult[] = [
      { outcome: "unknown-symbol" },
      { outcome: "range-not-available" },
      { outcome: "unauthorised" },
      { outcome: "aborted" },
      { outcome: "rate-limited" },
      { outcome: "upstream-unavailable" },
    ];

    for (const member of members) {
      const { provider, calls } = countingProvider([member, OK_RESULT]);
      await withRetry(provider, FAST).fetchBars(requestFor("NVDA"), {
        deadlineMs: 5_000,
      });

      expect(calls()).toBe(isRetryableOutcome(member) ? 2 : 1);
    }
  });
});

describe("the caller's deadline bounds the whole call, not each attempt", () => {
  it("hands each attempt the REMAINING budget rather than the caller's figure", async () => {
    // The first deliberate break this task was asked to make: passing the
    // caller's original `deadlineMs` to every attempt multiplies the caller's
    // deadline by the attempt count, silently.
    const { provider, deadlines } = countingProvider([
      { outcome: "upstream-unavailable" },
      { outcome: "upstream-unavailable" },
      OK_RESULT,
    ]);

    await withRetry(provider, FAST).fetchBars(requestFor("NVDA"), {
      deadlineMs: 1_000,
    });

    const seen = deadlines();
    expect(seen[0]).toBe(1_000);
    expect(seen[1]).toBeLessThan(1_000);
    expect(seen[2]).toBeLessThan(seen[1] ?? 0);
  });

  it("bounds total elapsed time by the caller's deadline across every attempt", async () => {
    // The sharp version of the same break: a provider that spends part of the
    // budget and then HANGS for whatever deadline it is handed. Correct, the
    // whole call fits inside the caller's 700 ms; handing each attempt the
    // original figure overruns it, while every individual attempt still looks
    // perfectly well behaved from inside.
    let calls = 0;
    const provider: MarketDataProvider = {
      id: "fixture",
      feed: "synthetic",
      fetchBars: async (_request, options) => {
        calls += 1;
        if (calls === 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          return { outcome: "upstream-unavailable" };
        }
        const budget = options?.deadlineMs ?? 0;
        await new Promise((resolve) => setTimeout(resolve, budget));
        return { outcome: "timeout", deadlineMs: budget };
      },
    };

    const startedAt = Date.now();
    const result = await withRetry(provider, {
      baseDelayMs: 40,
      maxDelayMs: 40,
      random: () => 1,
    }).fetchBars(requestFor("NVDA"), { deadlineMs: 700 });
    const elapsed = Date.now() - startedAt;

    expect(result.outcome).toBe("timeout");
    // Correct, this lands at ~700 ms. Handing attempt 2 the caller's original
    // figure lands it at ~950 — inside no individual attempt's deadline and
    // outside the caller's.
    expect(elapsed).toBeLessThan(850);
  });

  it("gives up with the REAL cause rather than a timeout it manufactured itself", async () => {
    // A deadline with no room for a delay plus one plausible attempt. The
    // answer must be the thing the caller can act on.
    const { provider, calls } = countingProvider([{ outcome: "rate-limited" }]);

    const result = await withRetry(provider, FAST).fetchBars(
      requestFor("NVDA"),
      { deadlineMs: MIN_ATTEMPT_BUDGET_MS },
    );

    expect(result.outcome).toBe("rate-limited");
    expect(calls()).toBe(1);
  });

  it("treats a rate-limit hint as a FLOOR inside the bound, never an extension of it", async () => {
    // ZZRL asks for 2,500 ms. Inside a 400 ms deadline that means giving up,
    // not waiting 2,500 ms — §8.6's decision, produced.
    const wrapped = withRetry(createFixtureProvider(), FAST);

    const startedAt = Date.now();
    const result = await wrapped.fetchBars(requestFor("ZZRL"), {
      deadlineMs: 400,
    });
    const elapsed = Date.now() - startedAt;

    expect(result).toStrictEqual({
      outcome: "rate-limited",
      retryAfterMs: 2_500,
    });
    expect(elapsed).toBeLessThan(400);
  });

  it("waits at least the hint when the budget has room for it", async () => {
    const { provider, calls } = countingProvider([
      { outcome: "rate-limited", retryAfterMs: 60 },
      OK_RESULT,
    ]);

    const startedAt = Date.now();
    await withRetry(provider, FAST).fetchBars(requestFor("NVDA"), {
      deadlineMs: 5_000,
    });
    const elapsed = Date.now() - startedAt;

    // FAST's own first delay is 4 ms, so anything at or above the hint is the
    // floor having been applied rather than the schedule having been slow.
    expect(calls()).toBe(2);
    expect(elapsed).toBeGreaterThanOrEqual(55);
  });

  it("cannot retry a timeout, because a hung attempt consumed the whole budget", async () => {
    // Stated in the module comment rather than left to be discovered:
    // `timeout` is retryable in the taxonomy and unreachable here. ZZSLO
    // delays 30 s, so the deadline is always what stops it.
    const wrapped = withRetry(createFixtureProvider(), FAST);

    const startedAt = Date.now();
    const result = await wrapped.fetchBars(requestFor("ZZSLO"), {
      deadlineMs: 60,
    });
    const elapsed = Date.now() - startedAt;

    expect(result.outcome).toBe("timeout");
    expect(elapsed).toBeLessThan(400);
  });
});

describe("the caller's signal", () => {
  it("cancels a PENDING backoff immediately rather than after it elapses", async () => {
    // Deliberately a REAL delay and no fake clock: the thing under test is
    // that a pending wait is cancelled, and a fake clock can make that pass
    // while the shipped code waits the delay out.
    const controller = new AbortController();
    const { provider, calls } = countingProvider([
      { outcome: "upstream-unavailable" },
      OK_RESULT,
    ]);

    const wrapped = withRetry(provider, {
      baseDelayMs: 2_000,
      maxDelayMs: 2_000,
      random: () => 1,
    });

    const startedAt = Date.now();
    const pending = wrapped.fetchBars(requestFor("NVDA"), {
      deadlineMs: 10_000,
      signal: controller.signal,
    });

    setTimeout(() => {
      controller.abort();
    }, 20);

    const result = await pending;
    const elapsed = Date.now() - startedAt;

    expect(result).toStrictEqual({ outcome: "aborted" });
    expect(calls()).toBe(1);
    // The shipped wait would have been ~2,000 ms.
    expect(elapsed).toBeLessThan(500);
  });

  it("reports the caller's teardown as `aborted` rather than as the backend's last word", async () => {
    // Task 1.12.2's rule: an abort is a fact about the caller, so reporting
    // `upstream-unavailable` would render a backend state for our own teardown.
    const controller = new AbortController();
    controller.abort();

    const { provider } = countingProvider([
      { outcome: "upstream-unavailable" },
    ]);
    const result = await withRetry(provider, FAST).fetchBars(
      requestFor("NVDA"),
      { deadlineMs: 5_000, signal: controller.signal },
    );

    expect(result).toStrictEqual({ outcome: "aborted" });
  });
});

describe("the policy's numbers carry their derivations", () => {
  it("starts at about one measured round trip, which is also one refill token", () => {
    // Two independent measurements agree: ALPACA.md §6's ~280 ms round trip,
    // and the ~310 ms a token takes to refill in the 3.23/s bucket Task 2.7.7
    // measured. A delay shorter than either is pressure without a pause.
    expect(RETRY_BASE_DELAY_MS).toBe(300);
  });

  it("caps below the default deadline, because a longer delay could never be slept", () => {
    // Derived from DEFAULT_BARS_DEADLINE_MS rather than chosen. This is the
    // fourth coupled pair in the repository that nothing but a test can see.
    expect(RETRY_MAX_DELAY_MS).toBeLessThan(3_000);
    expect(RETRY_MAX_DELAY_MS + MIN_ATTEMPT_BUDGET_MS).toBeLessThan(3_000);
  });

  it("bounds a dead host to one request per cap, whatever the deadline", async () => {
    // The figure Story 2.8 needs: 0.5 requests a second per caller against a
    // measured ~200/min, so one retrying caller cannot trip the limit — and a
    // hundred of them produce 50/s, which is why pacing is that story's.
    const { provider, calls } = countingProvider([
      { outcome: "upstream-unavailable" },
    ]);

    await withRetry(provider, {
      baseDelayMs: 20,
      maxDelayMs: 20,
      random: () => 1,
    }).fetchBars(requestFor("NVDA"), { deadlineMs: 200 });

    // 200 ms of budget, a 20 ms cap and a 300 ms minimum attempt budget: the
    // give-up rule is what stops it, not a count.
    expect(calls()).toBe(1);
  });
});
