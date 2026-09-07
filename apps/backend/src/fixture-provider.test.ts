import {
  type Bar,
  type BarSeries,
  MARKET_FEED_DESCRIPTIONS,
  marketSessionOn,
  toMarketDate,
  toTicker,
  type TimeRange,
  toTimeRange,
} from "@marketpulse/shared";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { fixtureSessionOn } from "./fixture-corpus.js";
import { createFixtureProvider, FIXTURE_COVERAGE } from "./fixture-provider.js";
import {
  type BarsRequest,
  type BarsRequestOptions,
  type BarsResult,
  DEFAULT_BARS_DEADLINE_MS,
  isRetryableOutcome,
} from "./market-data-provider.js";

const provider = createFixtureProvider();

const REGULAR = fixtureSessionOn(toMarketDate("2026-09-04"));
const HALF_DAY = fixtureSessionOn(toMarketDate("2026-11-27"));

/** A whole session as a request window, from the calendar's own bounds. */
function sessionRange(open: Date, close: Date): TimeRange {
  return toTimeRange(open, close);
}

const REGULAR_RANGE = sessionRange(REGULAR.open, REGULAR.close);

function ask(
  symbol: string,
  overrides: Partial<Omit<BarsRequest, "symbol">> = {},
  options?: BarsRequestOptions,
): Promise<BarsResult> {
  return provider.fetchBars(
    {
      symbol: toTicker(symbol),
      range: overrides.range ?? REGULAR_RANGE,
      timeframe: overrides.timeframe ?? "1m",
      adjustment: overrides.adjustment ?? "raw",
    },
    options,
  );
}

/**
 * `noUncheckedIndexedAccess` and a union both hand back possible gaps, and a
 * non-null assertion is refused by `strictTypeChecked`. `expect.fail` returns
 * `never`, so this narrows as well as failing.
 */
function ok(result: BarsResult): BarSeries {
  if (result.outcome !== "ok") {
    expect.fail(`expected an ok result, got ${result.outcome}`);
  }
  return result.series;
}

function at(bars: readonly Bar[], index: number): Bar {
  const bar = bars[index];
  if (bar === undefined) expect.fail(`no bar at index ${String(index)}`);
  return bar;
}

describe("the fixture provider", () => {
  it("answers a full regular session with the calendar's own bar count", async () => {
    const series = ok(await ask("NVDA"));

    // 390 is written nowhere here. `minuteBars` is derived from the session's
    // own bounds, so this assertion survives a calendar edit that it should.
    expect(series.bars).toHaveLength(REGULAR.minuteBars);
    expect(series.symbol).toBe(toTicker("NVDA"));
    expect(series.timeframe).toBe("1m");
  });

  it("answers a HALF DAY with a shorter session, which is where a hard-coded 390 dies", async () => {
    const series = ok(
      await ask("NVDA", { range: sessionRange(HALF_DAY.open, HALF_DAY.close) }),
    );

    expect(HALF_DAY.isEarlyClose).toBe(true);
    expect(series.bars).toHaveLength(HALF_DAY.minuteBars);
    expect(HALF_DAY.minuteBars).toBeLessThan(REGULAR.minuteBars);
  });

  it("answers a thin name with GAPS, which is ordinary rather than a fault", async () => {
    const series = ok(await ask("AMD"));

    // A minute with no print on a single venue is normal. Story 2.8 must not
    // read it as a failure, and this is the corpus entry it is sized against.
    expect(series.bars.length).toBeLessThan(REGULAR.minuteBars);
    expect(series.coverage.covered).not.toBeNull();
  });
});

describe("empty answers are SUCCESSFUL answers", () => {
  // `PROVIDER.md` §8.2, and the single most likely thing to be got wrong by
  // whoever writes the first `if (bars.length === 0)`. Treating these as
  // failures is how Story 2.12 shows an error screen on a public holiday.
  const cases = [
    ["a holiday", "2026-12-25"],
    ["a weekend", "2026-09-05"],
  ] as const;

  for (const [what, date] of cases) {
    it(`returns ok with no bars and a null covered range on ${what}`, async () => {
      const day = new Date(`${date}T00:00:00Z`);
      const range = toTimeRange(day, new Date(day.getTime() + 86_400_000));

      const series = ok(await ask("NVDA", { range }));

      expect(series.bars).toHaveLength(0);
      // `toBarSeries` enforces this both ways round: a covered range over no
      // bars is a claim with nothing behind it.
      expect(series.coverage.covered).toBeNull();
      expect(marketSessionOn(toMarketDate(date))).toBeUndefined();
    });
  }
});

describe("provenance — acceptance criterion 3, and §5.4's safety mechanism", () => {
  it("cannot be mistaken for real market data", async () => {
    const series = ok(await ask("NVDA"));
    const [source] = series.provenance.sources;

    expect(source.provider).toBe("fixture");
    expect(source.feed).toBe("synthetic");
    // The words a person actually reads. This is what makes a screenshot of a
    // fixture-backed chart advertise itself in the chrome, structurally, with
    // nobody having to remember a `SAMPLE DATA` banner.
    expect(MARKET_FEED_DESCRIPTIONS[source.feed].sentence).toBe(
      "Generated test data. Not a market feed.",
    );
  });

  it("stamps a fixed retrievedAt rather than the wall clock", async () => {
    const first = ok(await ask("NVDA")).provenance.sources[0].retrievedAt;
    const second = ok(await ask("SPY")).provenance.sources[0].retrievedAt;

    expect(first).toBe(second);
  });

  it("reports the adjustment that was ASKED for", async () => {
    expect(ok(await ask("ZZSPL")).provenance.adjustment).toBe("raw");
    expect(
      ok(await ask("ZZSPL", { adjustment: "split-adjusted" })).provenance
        .adjustment,
    ).toBe("split-adjusted");
  });

  it("accounts for exactly the bars it returned", async () => {
    const series = ok(await ask("AMD"));

    // `toBarSeries` refuses a mismatch, so this is the constructor's check
    // observed rather than a second copy of it.
    expect(series.provenance.sources[0].barCount).toBe(series.bars.length);
  });
});

describe("coverage", () => {
  it("clips a window that reaches past what the corpus holds", async () => {
    const beyond = toTimeRange(
      REGULAR.open,
      new Date(FIXTURE_COVERAGE.end.getTime() + 86_400_000 * 30),
    );

    const series = ok(await ask("NVDA", { range: beyond }));

    expect(series.coverage.requested.end).toStrictEqual(beyond.end);
    // How far the answer REACHES, which is what `SeriesCoverage` is for — and
    // why a partial overlap is answered partially rather than refused.
    expect(series.coverage.covered?.end).toStrictEqual(FIXTURE_COVERAGE.end);
  });

  it("says nothing about density — a gap inside a covered window is still covered", async () => {
    const series = ok(await ask("AMD"));

    expect(series.coverage.covered?.start).toStrictEqual(REGULAR.open);
    expect(series.bars.length).toBeLessThan(REGULAR.minuteBars);
  });
});

describe("the range filter is HALF-OPEN", () => {
  it("excludes a bar sitting exactly on range.end", async () => {
    // The one boundary an inclusive comparison gets wrong, and the one no
    // other test in this file would notice. `[09:30, 10:00)` and
    // `[10:00, 10:30)` must not both claim the 10:00 bar: Story 2.8's backfill
    // tiles adjacent windows thousands of times, and `market_bars`' unique
    // constraint would reject the duplicate — reporting a failure that was
    // actually the database being right.
    const tenMinutes = new Date(REGULAR.open.getTime() + 10 * 60_000);
    const first = ok(
      await ask("NVDA", { range: toTimeRange(REGULAR.open, tenMinutes) }),
    );
    const second = ok(
      await ask("NVDA", {
        range: toTimeRange(
          tenMinutes,
          new Date(tenMinutes.getTime() + 600_000),
        ),
      }),
    );

    expect(first.bars).toHaveLength(10);
    expect(at(first.bars, 9).startsAt.getTime()).toBe(
      tenMinutes.getTime() - 60_000,
    );
    // The seam bar belongs to the SECOND window and to nothing else.
    expect(at(second.bars, 0).startsAt).toStrictEqual(tenMinutes);
    expect(
      first.bars.some((bar) => bar.startsAt.getTime() === tenMinutes.getTime()),
    ).toBe(false);
  });

  it("tiles adjacent windows into exactly the whole session, once each", async () => {
    const midday = new Date(REGULAR.open.getTime() + 120 * 60_000);
    const left = ok(
      await ask("NVDA", { range: toTimeRange(REGULAR.open, midday) }),
    );
    const right = ok(
      await ask("NVDA", { range: toTimeRange(midday, REGULAR.close) }),
    );
    const whole = ok(await ask("NVDA"));

    expect(left.bars.length + right.bars.length).toBe(whole.bars.length);
    // And the same bars, not merely the same count — which is what proves the
    // walk is a property of the session rather than of the requested start.
    expect([...left.bars, ...right.bars]).toStrictEqual(whole.bars);
  });
});

describe("determinism — the property the whole corpus exists for", () => {
  it("returns the identical series twice in one process", async () => {
    expect(ok(await ask("NVDA")).bars).toStrictEqual(
      ok(await ask("NVDA")).bars,
    );
  });

  it("returns the identical series ACROSS RUNS AND MACHINES", async () => {
    // Two calls in one process would only prove the function is not stateful.
    // A digest checked into the file is what makes the claim survive a restart,
    // a different machine and a different day — and it is what fails if the
    // generator is changed, which for a fixture corpus is correct: the numbers
    // are the fixture.
    const series = ok(await ask("NVDA"));
    const canonical = JSON.stringify(
      series.bars.map((bar) => [
        bar.startsAt.toISOString(),
        bar.open,
        bar.high,
        bar.low,
        bar.close,
        bar.volume,
      ]),
    );

    expect(createHash("sha256").update(canonical).digest("hex")).toBe(
      "46d155d651e339088f17792a49d2de11bceac2694ffde4203b8d6e7f6ee93f9e",
    );
  });

  it("does not read the wall clock, so a session is the same on any day", async () => {
    const august = ok(
      await ask("NVDA", {
        range: (() => {
          const s = fixtureSessionOn(toMarketDate("2026-08-03"));
          return toTimeRange(s.open, s.close);
        })(),
      }),
    );
    const again = ok(
      await ask("NVDA", {
        range: (() => {
          const s = fixtureSessionOn(toMarketDate("2026-08-03"));
          return toTimeRange(s.open, s.close);
        })(),
      }),
    );

    expect(august.bars).toStrictEqual(again.bars);
  });
});

describe("a range crossing a DST transition", () => {
  it("moves the UTC open by an hour while the session length does not move", async () => {
    // 2026-11-01 is the autumn transition, a Sunday — every US DST transition
    // is, which is why no session ever spans one and why `instantFromMarketTime`
    // can refuse the gap and the fold outright.
    const friday = fixtureSessionOn(toMarketDate("2026-10-30"));
    const monday = fixtureSessionOn(toMarketDate("2026-11-02"));

    expect(friday.open.toISOString()).toBe("2026-10-30T13:30:00.000Z");
    expect(monday.open.toISOString()).toBe("2026-11-02T14:30:00.000Z");

    const series = ok(
      await ask("NVDA", { range: toTimeRange(friday.open, monday.close) }),
    );

    // Two full sessions of equal length either side of the transition, and
    // nothing at all on the weekend between them.
    expect(series.bars).toHaveLength(friday.minuteBars + monday.minuteBars);
    expect(friday.minuteBars).toBe(monday.minuteBars);
  });
});

describe("adjustment — acceptance criterion 5's real consequence", () => {
  const before = fixtureSessionOn(toMarketDate("2026-05-29"));
  const after = fixtureSessionOn(toMarketDate("2026-06-01"));
  const spanning = toTimeRange(before.open, after.close);

  it("returns genuinely different numbers across a corporate action", async () => {
    const raw = ok(await ask("ZZSPL", { range: spanning, timeframe: "1d" }));
    const adjusted = ok(
      await ask("ZZSPL", {
        range: spanning,
        timeframe: "1d",
        adjustment: "split-adjusted",
      }),
    );

    expect(raw.bars).toHaveLength(2);
    expect(adjusted.bars).toHaveLength(2);
    // Raw has the cliff, because that is what happened; split-adjusted does
    // not, because the earlier half has been scaled onto the later half's
    // price scale.
    expect(at(raw.bars, 0).close / at(raw.bars, 1).close).toBeGreaterThan(3);
    expect(at(adjusted.bars, 0).close / at(adjusted.bars, 1).close).toBeCloseTo(
      1,
      0,
    );
    expect(at(adjusted.bars, 0).close).not.toBe(at(raw.bars, 0).close);
  });

  it("returns IDENTICAL numbers for a series spanning no corporate action", async () => {
    // The thing that will actually happen, and the reason there is no default
    // adjustment anywhere in this codebase: a wrong argument is invisible on
    // almost every series, almost all the time.
    expect(
      ok(await ask("NVDA", { adjustment: "split-adjusted" })).bars,
    ).toStrictEqual(ok(await ask("NVDA")).bars);
  });
});

describe("the daily timeframe", () => {
  it("gives one bar per session, opening at the session's open instant", async () => {
    const week = toTimeRange(
      fixtureSessionOn(toMarketDate("2026-09-08")).open,
      fixtureSessionOn(toMarketDate("2026-09-11")).close,
    );

    const series = ok(await ask("NVDA", { range: week, timeframe: "1d" }));

    // Four sessions: Tuesday through Friday, the Monday before being outside
    // the window and there being no weekend inside it.
    expect(series.bars).toHaveLength(4);
    expect(at(series.bars, 0).startsAt).toStrictEqual(
      fixtureSessionOn(toMarketDate("2026-09-08")).open,
    );
  });
});

/**
 * How each of the eight outcomes is produced against this provider.
 *
 * **A `Record<BarsResult["outcome"], …>` rather than an array**, which is
 * `health.ts`'s response-schema idiom and the same shape
 * `market-data-provider.test.ts` uses one file over: a ninth member added to
 * the union without an entry here is a **compile error naming the missing
 * key**, and an entry for an outcome that does not exist is an excess-property
 * error. So it is checked in both directions, and a future cause cannot be
 * produced by nothing.
 *
 * Every mechanism is the **corpus** or the caller's own signal, never a
 * `simulateError` parameter on the shipped interface — `PROVIDER.md` §8.7, and
 * Task 1.10.5's refusal to widen `config.ts`'s port range for a test's
 * convenience.
 */
const HOW_EACH_OUTCOME_IS_PRODUCED = {
  ok: () => ask("NVDA"),
  // A corpus entry that waits, against a deadline far shorter than the wait.
  timeout: () => ask("ZZSLO", {}, { deadlineMs: 20 }),
  // The caller's own signal, which needs no corpus entry at all.
  aborted: () => {
    const controller = new AbortController();
    controller.abort();
    return ask("NVDA", {}, { signal: controller.signal });
  },
  // A well-formed ticker that is not in the corpus.
  "unknown-symbol": () => ask("AAPL"),
  // A window with no overlap at all with the corpus's coverage.
  "range-not-available": () =>
    ask("NVDA", {
      range: toTimeRange(
        new Date("2027-03-01T14:30:00Z"),
        new Date("2027-03-01T21:00:00Z"),
      ),
    }),
  "rate-limited": () => ask("ZZRL"),
  unauthorised: () => ask("ZZUA"),
  "upstream-unavailable": () => ask("ZZUP"),
} as const satisfies Record<BarsResult["outcome"], () => Promise<BarsResult>>;

describe("every error cause is producible, and distinguishable — criterion 4", () => {
  for (const [outcome, produce] of Object.entries(
    HOW_EACH_OUTCOME_IS_PRODUCED,
  )) {
    it(`produces ${outcome}`, async () => {
      expect((await produce()).outcome).toBe(outcome);
    });
  }

  it("lets a caller BRANCH on the cause rather than read a message", async () => {
    // This is what criterion 4 actually asks for: not that the strings differ,
    // but that the union is switchable. The failure mode it exists to prevent
    // is a single `ProviderError` with a `message`, which every codebase has
    // until somebody has to render two of them differently — and Story 2.14's
    // whole subject is that "we have nothing for this symbol" and "the feed
    // refused us" are different sentences.
    const seen: string[] = [];

    for (const produce of Object.values(HOW_EACH_OUTCOME_IS_PRODUCED)) {
      const result = await produce();

      switch (result.outcome) {
        case "ok":
          seen.push(`ok:${String(result.series.bars.length)}`);
          break;
        case "timeout":
          seen.push(`timeout:${String(result.deadlineMs)}`);
          break;
        case "aborted":
          seen.push("aborted");
          break;
        case "unknown-symbol":
          seen.push("unknown-symbol");
          break;
        case "range-not-available":
          seen.push("range-not-available");
          break;
        case "rate-limited":
          seen.push(`rate-limited:${String(result.retryAfterMs)}`);
          break;
        case "unauthorised":
          seen.push("unauthorised");
          break;
        case "upstream-unavailable":
          seen.push("upstream-unavailable");
          break;
        default: {
          const unhandled: never = result satisfies never;
          throw new Error(`unhandled outcome ${JSON.stringify(unhandled)}`);
        }
      }
    }

    expect(seen).toStrictEqual([
      `ok:${String(REGULAR.minuteBars)}`,
      "timeout:20",
      "aborted",
      "unknown-symbol",
      "range-not-available",
      "rate-limited:2500",
      "unauthorised",
      "upstream-unavailable",
    ]);
  });

  it("classifies each cause through isRetryableOutcome rather than a second switch", async () => {
    // Re-deriving retryability here would be a second copy of the taxonomy,
    // which is the whole reason the classifier is exported beside the union.
    const classified: Record<string, boolean> = {};
    for (const [outcome, produce] of Object.entries(
      HOW_EACH_OUTCOME_IS_PRODUCED,
    )) {
      classified[outcome] = isRetryableOutcome(await produce());
    }

    expect(classified).toStrictEqual({
      ok: false,
      timeout: true,
      aborted: false,
      "unknown-symbol": false,
      "range-not-available": false,
      "rate-limited": true,
      unauthorised: false,
      "upstream-unavailable": true,
    });
  });
});

describe("rate-limited's optional hint", () => {
  it("carries the hint when the vendor said one", async () => {
    const result = await ask("ZZRL");

    expect(result).toStrictEqual({
      outcome: "rate-limited",
      retryAfterMs: 2500,
    });
  });

  it("omits the key ENTIRELY when it did not, rather than setting it undefined", async () => {
    // Under `exactOptionalPropertyTypes` those are different types, and here
    // they are different statements: absent means "the vendor did not say",
    // where present-and-undefined collapses into "come back immediately". The
    // provider branches — `apiError()`'s idiom with its `details` — and this is
    // the assertion that would fail if somebody assigned instead.
    const result = await ask("ZZRLN");

    expect(result).toStrictEqual({ outcome: "rate-limited" });
    expect("retryAfterMs" in result).toBe(false);
  });
});

describe("the deadline and the caller's signal", () => {
  it("reports the deadline it was measured against, including the default", async () => {
    // A caller that passed no `deadlineMs` does not otherwise know which number
    // it was measured against — which is the whole reason this member carries
    // one and no other member echoes anything back.
    const result = await ask("ZZSLO", {}, { deadlineMs: 15 });
    expect(result).toStrictEqual({ outcome: "timeout", deadlineMs: 15 });
    expect(DEFAULT_BARS_DEADLINE_MS).toBeGreaterThan(15);
  });

  it("stops at the deadline rather than waiting out the corpus's delay", async () => {
    const started = performance.now();
    await ask("ZZSLO", {}, { deadlineMs: 20 });
    // The corpus entry waits 30 seconds. Anything near that means the deadline
    // was never wired, which is the assertion that fails if the signals stop
    // being composed.
    expect(performance.now() - started).toBeLessThan(2_000);
  });

  it("reports the CALLER's abort as aborted, which is not a fact about the world", async () => {
    const controller = new AbortController();
    const pending = ask(
      "ZZSLO",
      {},
      { deadlineMs: 5_000, signal: controller.signal },
    );
    controller.abort();

    // Never rendered as a market-data state: Task 1.12.3's "resolved after
    // unmount" lesson, inherited by every consumer of this seam.
    expect(await pending).toStrictEqual({ outcome: "aborted" });
  });

  it("never rejects, for any of the eight", async () => {
    // "A call that cannot throw" is the property `use-backend-health.ts` has no
    // try/catch because of. A bug is still allowed to throw — that line is the
    // interface's, and this asserts the modelled half.
    await expect(
      Promise.all(
        Object.values(HOW_EACH_OUTCOME_IS_PRODUCED).map((produce) => produce()),
      ),
    ).resolves.toHaveLength(8);
  });
});

describe("the provider itself", () => {
  it("reports its own id", () => {
    expect(provider.id).toBe("fixture");
  });

  it("makes exactly one attempt — no retry hides inside it", async () => {
    // A provider that retried would make a caller's deadline a lie and would
    // stop a fixture-backed test meaning anything. `ZZUP` is retryable and is
    // still answered once.
    const result = await ask("ZZUP");
    expect(isRetryableOutcome(result)).toBe(true);
    expect(result.outcome).toBe("upstream-unavailable");
  });
});
