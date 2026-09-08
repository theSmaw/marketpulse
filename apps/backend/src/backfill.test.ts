// The backfill's walk, its pacer and its refusals (Task 2.8.6).
//
// **Fast: no build, no socket, no database and no network.** Every test here
// drives `runBackfill` against a fake provider and a fake repository, which is
// what the dependency object exists for — and the clock and the sleep are
// injected for the one thing that could not otherwise be tested cheaply. A
// pacer tested by waiting is a suite that takes as long as the thing it tests.
//
// What is deliberately NOT asserted here, for Task 2.7.5's recorded reason: a
// session's bar count being exactly `minuteBars`. Only 8 of 28 S&P 500
// constituents returned a full 390 on an ordinary session, so an assertion on
// 390 fails on a correct day for a real reason. What IS asserted is the
// **window**, which is the thing this command controls.

import { describe, expect, it } from "vitest";

import {
  marketSessionOn,
  toBarSeries,
  toMarketDate,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
  type Bar,
  type BarSeries,
  type MarketSession,
  type Ticker,
  type TimeRange,
} from "@marketpulse/shared";

import {
  activeSymbols,
  backfillCommand,
  commonCoverage,
  planRequests,
  runBackfill,
  SESSIONS_PER_REQUEST,
  type BackfillDependencies,
} from "./backfill.js";
import {
  CoverageGapError,
  type BarCoverage,
  type BarWriteResult,
  type MarketBarsRepository,
} from "./market-bars.js";
import type {
  BarsResult,
  ManyBarsRequest,
  MarketDataProvider,
} from "./market-data-provider.js";

/**
 * Sessions by date, as a tuple, so a fixture indexed out of range is a compile
 * error rather than an `undefined` every assertion then has to guard.
 */
function sessionsFrom<const T extends readonly string[]>(
  dates: T,
): { [K in keyof T]: MarketSession } {
  return dates.map((date) => {
    const session = marketSessionOn(toMarketDate(date));
    if (session === undefined) {
      throw new Error(
        `${date} is not a trading session; pick another fixture.`,
      );
    }
    return session;
  }) as { [K in keyof T]: MarketSession };
}

const WEEK = sessionsFrom([
  "2026-03-02",
  "2026-03-03",
  "2026-03-04",
  "2026-03-05",
  "2026-03-06",
]);

const NVDA = toTicker("NVDA");
const AMD = toTicker("AMD");

function bar(startsAt: Date): Bar {
  return {
    startsAt,
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 100,
  };
}

/** A one-bar series covering exactly the window it was asked for. */
function seriesFor(
  symbol: Ticker,
  range: TimeRange,
  bars: readonly Bar[] = [bar(range.start)],
): BarSeries {
  return toBarSeries({
    symbol,
    timeframe: "1m",
    bars,
    provenance: toSeriesProvenance("raw", {
      provider: "alpaca",
      feed: "sip",
      retrievedAt: "2026-03-07T00:00:00.000Z",
      barCount: bars.length,
    }),
    coverage: { requested: range, covered: bars.length === 0 ? null : range },
  });
}

interface Recorded {
  readonly requests: ManyBarsRequest[];
  readonly written: BarSeries[];
}

/**
 * A provider and a repository that record what they were asked, plus whatever
 * the test wants them to answer.
 */
function harness(
  options: {
    readonly answer?: (symbol: Ticker, request: ManyBarsRequest) => BarsResult;
    readonly onWrite?: (series: BarSeries) => void;
  } = {},
): {
  readonly recorded: Recorded;
  readonly provider: MarketDataProvider;
  readonly bars: MarketBarsRepository;
} {
  const recorded: Recorded = { requests: [], written: [] };

  const provider: MarketDataProvider = {
    id: "alpaca",
    feed: "sip",
    fetchBars: () => {
      throw new Error("The backfill must use fetchManyBars.");
    },
    fetchManyBars: (request) => {
      recorded.requests.push(request);
      const results = new Map<Ticker, BarsResult>();
      for (const symbol of request.symbols) {
        results.set(
          symbol,
          options.answer?.(symbol, request) ?? {
            outcome: "ok",
            series: seriesFor(symbol, request.range),
          },
        );
      }
      return Promise.resolve(results);
    },
  };

  const bars: MarketBarsRepository = {
    recordSeries: (series) => {
      options.onWrite?.(series);
      recorded.written.push(series);
      const result: BarWriteResult = {
        inserted: series.bars.length,
        corrected: 0,
        unchanged: 0,
        coverage: undefined,
      };
      return Promise.resolve(result);
    },
    readBars: () => Promise.resolve([]),
    readCoverage: () => Promise.resolve(undefined),
    listCoverage: () => Promise.resolve([]),
  };

  return { recorded, provider, bars };
}

function coverageOf(symbol: Ticker, covered: TimeRange): BarCoverage {
  return {
    symbol,
    timeframe: "1m",
    covered,
    barCount: 1,
    updatedAt: new Date("2026-03-07T00:00:00.000Z"),
  };
}

function dependencies(
  overrides: Partial<BackfillDependencies> & {
    provider: MarketDataProvider;
    bars: MarketBarsRepository;
  },
): BackfillDependencies {
  return {
    symbols: [NVDA],
    timeframe: "1m",
    sessions: WEEK,
    coverage: new Map(),
    report: () => undefined,
    now: () => 0,
    sleep: () => Promise.resolve(),
    ...overrides,
  };
}

describe("SESSIONS_PER_REQUEST", () => {
  it("is exactly one session for minute bars", () => {
    // The whole of property 1. Task 2.7.5 measured a 25-session minute window
    // at 2.35x the regular-hours bar count, 57.5% of it extended hours.
    expect(SESSIONS_PER_REQUEST["1m"]).toBe(1);
  });

  it("is more than one for daily bars, which cannot inflate", () => {
    expect(SESSIONS_PER_REQUEST["1d"]).toBeGreaterThan(1);
  });
});

describe("commonCoverage", () => {
  it("is the intersection, so a symbol behind the rest drags the window back", () => {
    const wide = toTimeRange(WEEK[0].open, WEEK[4].close);
    const narrow = toTimeRange(WEEK[1].open, WEEK[3].close);

    const common = commonCoverage(
      [NVDA, AMD],
      new Map([
        [NVDA, coverageOf(NVDA, wide)],
        [AMD, coverageOf(AMD, narrow)],
      ]),
    );

    expect(common).toEqual({ start: WEEK[1].open, end: WEEK[3].close });
  });

  it("is nothing at all when one symbol holds nothing", () => {
    const common = commonCoverage(
      [NVDA, AMD],
      new Map([
        [NVDA, coverageOf(NVDA, toTimeRange(WEEK[0].open, WEEK[4].close))],
      ]),
    );

    expect(common).toBeUndefined();
  });

  it("is nothing when the held windows do not overlap", () => {
    const common = commonCoverage(
      [NVDA, AMD],
      new Map([
        [NVDA, coverageOf(NVDA, toTimeRange(WEEK[0].open, WEEK[0].close))],
        [AMD, coverageOf(AMD, toTimeRange(WEEK[4].open, WEEK[4].close))],
      ]),
    );

    expect(common).toBeUndefined();
  });
});

describe("planRequests", () => {
  it("walks backwards from the newest session when nothing is held", () => {
    const runs = planRequests(WEEK, undefined, 1);

    expect(runs.map((run) => run[0]?.date)).toEqual([
      "2026-03-06",
      "2026-03-05",
      "2026-03-04",
      "2026-03-03",
      "2026-03-02",
    ]);
  });

  it("fills the newer end first, then deepens backwards", () => {
    // Held: the middle three. Newer: Friday. Older: Monday.
    const common = { start: WEEK[1].open, end: WEEK[3].close };

    const runs = planRequests(WEEK, common, 1);

    expect(runs.map((run) => run[0]?.date)).toEqual([
      "2026-03-06",
      "2026-03-02",
    ]);
  });

  it("plans nothing at all when everything asked for is held", () => {
    const common = { start: WEEK[0].open, end: WEEK[4].close };
    expect(planRequests(WEEK, common, 1)).toEqual([]);
  });

  it("chunks a backward walk from the newest end, so a short chunk is oldest", () => {
    const runs = planRequests(WEEK, undefined, 2);

    expect(runs.map((run) => run.map((session) => session.date))).toEqual([
      ["2026-03-05", "2026-03-06"],
      ["2026-03-03", "2026-03-04"],
      ["2026-03-02"],
    ]);
  });

  it("keeps each request's sessions ascending, which is what windowFor takes", () => {
    for (const run of planRequests(WEEK, undefined, 2)) {
      let previous = 0;
      for (const session of run) {
        expect(session.open.getTime()).toBeGreaterThan(previous);
        previous = session.open.getTime();
      }
    }
  });
});

describe("runBackfill", () => {
  it("asks for exactly one session per minute-bar request", async () => {
    const { recorded, provider, bars } = harness();

    await runBackfill(dependencies({ provider, bars }));

    expect(recorded.requests).toHaveLength(WEEK.length);
    for (const request of recorded.requests) {
      const session = WEEK.find(
        (candidate) =>
          candidate.open.getTime() === request.range.start.getTime(),
      );
      expect(session).toBeDefined();
      // The break this guards: a span-shaped window. It would show up here as
      // an end that is some other session's close, and as a bar count that is
      // not the calendar's.
      expect(request.range.end.getTime()).toBe(session?.close.getTime());
    }
  });

  it("frames a daily request on midnight ET rather than on the session", async () => {
    const { recorded, provider, bars } = harness();

    await runBackfill(
      dependencies({ provider, bars, timeframe: "1d", sessions: WEEK }),
    );

    const [request] = recorded.requests;
    // A daily bar is stamped at midnight ET, hours BEFORE the session opens,
    // so a window framed on `[open, close)` contains no daily bar at all and
    // returns a perfectly well-formed empty answer.
    expect(request?.range.start.getTime()).toBeLessThan(WEEK[0].open.getTime());
  });

  it("stores raw and never asks for an adjustment", async () => {
    const { recorded, provider, bars } = harness();

    await runBackfill(dependencies({ provider, bars }));

    for (const request of recorded.requests) {
      expect(request.adjustment).toBe("raw");
    }
  });

  it("fetches nothing when the ledger already holds every session asked for", async () => {
    const { recorded, provider, bars } = harness();

    const report = await runBackfill(
      dependencies({
        provider,
        bars,
        coverage: new Map([
          [NVDA, coverageOf(NVDA, toTimeRange(WEEK[0].open, WEEK[4].close))],
        ]),
      }),
    );

    expect(recorded.requests).toEqual([]);
    expect(report.sessionsFetched).toBe(0);
    expect(report.sessionsAlreadyHeld).toBe(WEEK.length);
    expect(report.stoppedBy).toBe("completed");
  });

  it("stops the whole run on a batch failure and names it", async () => {
    const { recorded, provider, bars } = harness({
      answer: () => ({ outcome: "rate-limited" }),
    });

    const report = await runBackfill(dependencies({ provider, bars }));

    // Success is per symbol; failure is per batch. The pages that never
    // arrived held symbols we cannot name, so there is nothing to continue to.
    expect(recorded.requests).toHaveLength(1);
    expect(report.stoppedBy).toBe("failed");
    expect(report.failedWith).toBe("rate-limited");
    expect(report.inserted).toBe(0);
  });

  it("blocks one symbol on a coverage gap and carries on with the rest", async () => {
    const { recorded, provider, bars } = harness({
      onWrite: (series) => {
        if (series.symbol === AMD) {
          throw new CoverageGapError(
            AMD,
            "1m",
            toTimeRange(WEEK[3].open, WEEK[4].close),
            toTimeRange(WEEK[0].open, WEEK[0].close),
            ["2026-03-03"],
          );
        }
      },
    });

    const report = await runBackfill(
      dependencies({ provider, bars, symbols: [NVDA, AMD] }),
    );

    expect(report.stoppedBy).toBe("completed");
    expect(report.blocked).toEqual([
      { symbol: AMD, reason: "coverage gap: 2026-03-03" },
    ]);
    // Dropped from the REQUEST and not merely from the write: fetching bars we
    // would then refuse to store spends a metered budget on nothing.
    expect(recorded.requests[0]?.symbols).toEqual([NVDA, AMD]);
    expect(recorded.requests[1]?.symbols).toEqual([NVDA]);
    // The unblocked symbol was written for every session.
    expect(
      recorded.written.filter((series) => series.symbol === NVDA),
    ).toHaveLength(WEEK.length);
  });

  it("stops when every symbol has been blocked", async () => {
    const { provider, bars } = harness({
      onWrite: (series) => {
        throw new CoverageGapError(
          series.symbol,
          "1m",
          toTimeRange(WEEK[3].open, WEEK[4].close),
          toTimeRange(WEEK[0].open, WEEK[0].close),
          ["2026-03-03"],
        );
      },
    });

    const report = await runBackfill(dependencies({ provider, bars }));

    expect(report.stoppedBy).toBe("failed");
    expect(report.failedWith).toBe("every symbol is blocked");
  });

  it("counts an empty answer without moving the ledger", async () => {
    const { recorded, provider, bars } = harness({
      answer: (symbol, request) => ({
        outcome: "ok",
        series: seriesFor(symbol, request.range, []),
      }),
    });

    const report = await runBackfill(dependencies({ provider, bars }));

    expect(report.emptyAnswers).toBe(WEEK.length);
    expect(recorded.written).toEqual([]);
    expect(report.inserted).toBe(0);
  });

  it("re-throws an error that is not a coverage gap", async () => {
    const { provider, bars } = harness({
      onWrite: () => {
        throw new Error("the database is on fire");
      },
    });

    await expect(runBackfill(dependencies({ provider, bars }))).rejects.toThrow(
      "the database is on fire",
    );
  });

  it("finishes the request in flight when asked to stop, and no more", async () => {
    const { recorded, provider, bars } = harness();
    let stop = false;

    const report = await runBackfill(
      dependencies({
        provider,
        bars,
        report: () => {
          stop = true;
        },
        shouldStop: () => stop,
      }),
    );

    // The flag is set by the first request's own progress line, so exactly one
    // request was made and its bars were written.
    expect(recorded.requests).toHaveLength(1);
    expect(recorded.written).toHaveLength(1);
    expect(report.stoppedBy).toBe("interrupted");
  });
});

describe("the pacer", () => {
  it("waits out the remainder of a token when a request was quicker", async () => {
    const { provider, bars } = harness();
    const slept: number[] = [];
    let clock = 0;

    await runBackfill(
      dependencies({
        provider,
        bars,
        // Each request takes 100 ms of a 350 ms floor.
        now: () => {
          clock += 100;
          return clock;
        },
        sleep: (ms) => {
          slept.push(ms);
          clock += ms;
          return Promise.resolve();
        },
        paceMs: 350,
      }),
    );

    // Four gaps between five requests, each one short by the same amount. The
    // number is a rate ceiling rather than a delay: it is measured from the
    // previous request's START, so a request longer than the floor costs
    // nothing.
    expect(slept).toHaveLength(WEEK.length - 1);
    for (const waited of slept) expect(waited).toBeGreaterThan(0);
  });

  it("costs nothing when a request already took longer than the floor", async () => {
    const { provider, bars } = harness();
    const slept: number[] = [];
    let clock = 0;

    await runBackfill(
      dependencies({
        provider,
        bars,
        now: () => {
          clock += 60_000;
          return clock;
        },
        sleep: (ms) => {
          slept.push(ms);
          return Promise.resolve();
        },
        paceMs: 350,
      }),
    );

    expect(slept).toEqual([]);
  });
});

describe("activeSymbols", () => {
  it("spends a metered budget only on securities we still track", () => {
    expect(
      activeSymbols([
        { symbol: NVDA, status: "active" },
        { symbol: AMD, status: "untracked" },
      ]),
    ).toEqual([NVDA]);
  });
});

describe("backfillCommand arguments", () => {
  const KEYED = {
    ALPACA_API_KEY_ID: "key",
    ALPACA_API_SECRET_KEY: "secret",
  } satisfies NodeJS.ProcessEnv;

  it("refuses a positional argument, because every option here is named", async () => {
    const outcome = await backfillCommand(["NVDA"], { env: KEYED });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("not an option");
  });

  it("refuses an unknown option", async () => {
    const outcome = await backfillCommand(["--everything", "yes"], {
      env: KEYED,
    });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("not an option");
  });

  it("refuses a malformed ticker", async () => {
    const outcome = await backfillCommand(["--symbols", "nvda!"], {
      env: KEYED,
    });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("well-formed ticker");
  });

  it("refuses one end of a range", async () => {
    const outcome = await backfillCommand(["--from", "2026-03-02"], {
      env: KEYED,
    });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("go together");
  });

  it("refuses --sessions beside --from/--to, which say the same thing", async () => {
    const outcome = await backfillCommand(
      ["--sessions", "5", "--from", "2026-03-02", "--to", "2026-03-06"],
      { env: KEYED },
    );

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("two ways to say the same thing");
  });

  it("refuses a range before the trading calendar rather than clamping to it", async () => {
    const outcome = await backfillCommand(
      ["--from", "2020-01-02", "--to", "2026-03-06"],
      { env: KEYED },
    );

    expect(outcome.exitCode).toBe(1);
    // A short answer shaped like a right one is what ADR 0017 decision 9
    // rejected, and this is the one call site with a metered API behind it.
    expect(outcome.errors[0]).toContain("2024-01-01");
    expect(outcome.errors[0]).toContain("refuses rather than");
  });

  it("refuses a reversed range", async () => {
    const outcome = await backfillCommand(
      ["--from", "2026-03-06", "--to", "2026-03-02"],
      { env: KEYED },
    );

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("is after");
  });

  it("refuses a range containing no trading session", async () => {
    const outcome = await backfillCommand(
      ["--from", "2026-03-07", "--to", "2026-03-08"],
      { env: KEYED },
    );

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("not open on any day");
  });

  it("refuses to run at all with no credential, before opening a connection", async () => {
    const outcome = await backfillCommand(["--sessions", "1"], { env: {} });

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors[0]).toContain("No Alpaca credential");
  });
});
