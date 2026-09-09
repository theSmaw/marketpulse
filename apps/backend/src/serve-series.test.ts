// The stitch, driven against a stub provider and no network (Task 2.9.5).
//
// **What most of this suite asserts is a NEGATIVE**, and that is the point.
// Every scenario below returns bars that look right; the interesting question
// is what was asked of the vendor to get them, because a stitch that fetched
// the whole window, or two sessions instead of one, returns the same bars in
// the same order and costs a metered request on every page load. So the
// provider records its calls and the tests read the recording.
//
// No socket, no database, no credential: `pnpm verify` runs with none of those
// and this file runs inside it. The stub declares `iex` where the store holds
// `sip`, which is how the two-feed mechanism is exercised **today** — Epic 3
// supplies the real second feed, and until then faking one is the only way to
// see the seam the payload exists to carry.

import { describe, expect, it, vi } from "vitest";

import {
  toBarSeries,
  toSeriesProvenance,
  toTicker,
  toTimeRange,
  type Bar,
  type MarketFeed,
  type Ticker,
  type TimeRange,
} from "@marketpulse/shared";

import {
  toStoredSeries,
  type BarCoverage,
  type DatedBarRow,
  type MarketBarsRepository,
} from "./market-bars.js";
import type {
  BarsRequest,
  BarsResult,
  MarketDataProvider,
} from "./market-data-provider.js";
import {
  serveSeries,
  tailWindow,
  type SeriesLogger,
  type TailDeclineReason,
} from "./serve-series.js";

const NVDA = toTicker("NVDA");

/** 2026-09-08 and 2026-09-09 are ordinary sessions; 2026-09-07 is Labor Day. */
const TUESDAY_OPEN = new Date("2026-09-08T13:30:00.000Z");
const TUESDAY_CLOSE = new Date("2026-09-08T20:00:00.000Z");
const WEDNESDAY_OPEN = new Date("2026-09-09T13:30:00.000Z");
const FRIDAY_CLOSE = new Date("2026-09-04T20:00:00.000Z");

/** Mid-session on the Wednesday, which is what a chart ending "now" looks like. */
const NOW = new Date("2026-09-09T18:00:00.000Z");

/** What this plan will actually serve at {@link NOW}: `now − 16 min`. */
const SERVABLE_END = new Date("2026-09-09T17:44:00.000Z");

const RETRIEVED_AT = "2026-09-08T20:05:00.000Z";

function row(at: string, close: number): DatedBarRow {
  return {
    observed_at: new Date(at),
    open: close.toFixed(6),
    high: close.toFixed(6),
    low: close.toFixed(6),
    close: close.toFixed(6),
    volume: "1000",
    recorded_at: new Date(RETRIEVED_AT),
  };
}

function bar(at: string, close: number): Bar {
  return {
    startsAt: new Date(at),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1000,
  };
}

/** The ledger's statement, with the source `0007_bar_coverage_provenance.sql` stores. */
function ledger(covered: TimeRange, barCount: number): BarCoverage {
  return {
    symbol: NVDA,
    timeframe: "1m",
    covered,
    source: { provider: "alpaca", feed: "sip" },
    barCount,
    updatedAt: new Date(RETRIEVED_AT),
  };
}

/**
 * A repository that answers one question, built through the real
 * {@link toStoredSeries} rather than by hand.
 *
 * Every other method throws: a test that reached one would be testing something
 * this module does not do, and silently returning an empty answer is how that
 * goes unnoticed.
 */
function stubRepository(
  rows: readonly DatedBarRow[],
  held: BarCoverage | undefined,
): MarketBarsRepository {
  const unused = (name: string) => (): never => {
    throw new Error(`serveSeries must not call ${name}.`);
  };

  return {
    readSeries: (symbol, timeframe, requested, now) =>
      Promise.resolve({
        series: toStoredSeries({
          symbol,
          timeframe,
          requested,
          rows,
          held,
          now,
        }),
        held,
      }),
    recordSeries: unused("recordSeries"),
    readBars: unused("readBars"),
    readCoverage: unused("readCoverage"),
    listCoverage: unused("listCoverage"),
    readLastBarDates: unused("readLastBarDates"),
  };
}

interface Stub {
  readonly provider: MarketDataProvider;
  /** Every request this provider was asked for, in order. */
  readonly requests: BarsRequest[];
}

/**
 * A provider that answers whatever the test says, and records what it was
 * asked.
 *
 * `feed` defaults to `iex` so the merged record carries two feeds — which is
 * the mechanism Story 2.14 renders and the reason `sources` is a list. The
 * store's own half is `sip`.
 */
function stubProvider(
  answer: (request: BarsRequest) => BarsResult,
  feed: MarketFeed = "iex",
): Stub {
  const requests: BarsRequest[] = [];
  return {
    requests,
    provider: {
      id: "alpaca",
      feed,
      fetchBars: (request) => {
        requests.push(request);
        return Promise.resolve(answer(request));
      },
      fetchManyBars: () => {
        throw new Error("serveSeries must not batch.");
      },
    },
  };
}

/** A well-formed answer over `covered`, from the stub's own declared feed. */
function answerWith(
  bars: readonly Bar[],
  covered: TimeRange | null,
  feed: MarketFeed = "iex",
  adjustment: "raw" | "split-adjusted" = "raw",
): (request: BarsRequest) => BarsResult {
  return (request) => ({
    outcome: "ok",
    series: toBarSeries({
      symbol: request.symbol,
      timeframe: request.timeframe,
      bars,
      provenance: toSeriesProvenance(adjustment, {
        provider: "alpaca",
        feed,
        retrievedAt: NOW.toISOString(),
        barCount: bars.length,
      }),
      coverage: { requested: request.range, covered },
    }),
  });
}

function recordingLogger(): SeriesLogger & {
  readonly warnings: object[];
  readonly debugs: object[];
} {
  const warnings: object[] = [];
  const debugs: object[] = [];
  return {
    warnings,
    debugs,
    warn: (object) => warnings.push(object),
    debug: (object) => debugs.push(object),
  };
}

/** The stored half everything below starts from: Tuesday's session, complete. */
const TUESDAY_ROWS = [
  row("2026-09-08T13:30:00.000Z", 100),
  row("2026-09-08T19:59:00.000Z", 101),
];
const TUESDAY_LEDGER = ledger(toTimeRange(TUESDAY_OPEN, TUESDAY_CLOSE), 2);

/** A window running from Tuesday's open to `now`, which is what a chart asks. */
const WINDOW = toTimeRange(TUESDAY_OPEN, NOW);

async function serve(
  stub: Stub | undefined,
  rows: readonly DatedBarRow[] = TUESDAY_ROWS,
  held: BarCoverage | undefined = TUESDAY_LEDGER,
  window: TimeRange = WINDOW,
  log: SeriesLogger = recordingLogger(),
) {
  return serveSeries(
    {
      bars: stubRepository(rows, held),
      provider: stub?.provider,
      log,
    },
    NVDA,
    "1m",
    window,
    NOW,
  );
}

describe("the tail that is fetched", () => {
  it("asks only for the uncovered part of the window, never the whole of it", async () => {
    const stub = stubProvider(answerWith([], null));

    await serve(stub);

    // The single rule that separates the chosen option from "ask the provider
    // for the whole window on demand", and it is invisible in an assertion
    // about the bars: the request starts at the current session's open, not at
    // the caller's `2026-09-08T13:30Z`.
    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0]?.range.start).toEqual(WEDNESDAY_OPEN);
    expect(stub.requests[0]?.range.end).toEqual(NOW);
  });

  it("asks for the tail at the adjustment the store holds", async () => {
    const stub = stubProvider(answerWith([], null));

    await serve(stub);

    // Passed explicitly, from the store's own constant. A raw/split-adjusted
    // join is refused outright, so a tail fetched at the wrong scale is not a
    // cosmetic mismatch — it is a series that cannot exist.
    expect(stub.requests[0]?.adjustment).toBe("raw");
  });

  it("makes no request at all when the store already reaches the end", async () => {
    const stub = stubProvider(answerWith([], null));

    const served = await serve(
      stub,
      TUESDAY_ROWS,
      TUESDAY_LEDGER,
      toTimeRange(TUESDAY_OPEN, TUESDAY_CLOSE),
    );

    expect(stub.requests).toHaveLength(0);
    expect(served.tail).toEqual({ attempted: false, reason: "covered" });
  });

  it("makes no request when no provider is configured", async () => {
    const served = await serve(undefined);

    expect(served.tail).toEqual({ attempted: false, reason: "no-provider" });
    // Absence is not a failure: the stored part is still served.
    expect(served.series.bars).toHaveLength(2);
  });
});

describe("the session bound", () => {
  it("issues NO provider call when the gap is two sessions wide", async () => {
    const stub = stubProvider(answerWith([], null));

    const served = await serve(
      stub,
      [row("2026-09-04T13:30:00.000Z", 99)],
      ledger(
        toTimeRange(new Date("2026-09-04T13:30:00.000Z"), FRIDAY_CLOSE),
        1,
      ),
      toTimeRange(new Date("2026-09-04T13:30:00.000Z"), NOW),
    );

    // The assertion this task exists to make. Without the bound, one page load
    // asking for "the last 5 sessions" against a store two sessions behind is a
    // multi-day metered vendor fetch — a cost that grows with staleness rather
    // than with what the user asked for.
    expect(stub.requests).toHaveLength(0);
    expect(served.tail).toEqual({ attempted: false, reason: "stale-store" });

    // And the answer says so honestly rather than pretending: coverage ends
    // where the store ends.
    expect(served.series.coverage.covered?.end).toEqual(FRIDAY_CLOSE);
  });

  it("DOES fetch across the overnight, which is the steady state", async () => {
    // The substitution that makes the assertion above meaningful. Same code
    // path, same bound, one session less staleness — and the call is made. A
    // negative assertion that would hold however the bound were written is not
    // evidence the bound works.
    const stub = stubProvider(answerWith([], null));

    await serve(stub);

    expect(stub.requests).toHaveLength(1);
  });

  it("treats a weekend and a holiday as no gap at all", () => {
    // Friday's close to Tuesday's open spans a weekend and Labor Day, and
    // contains no session — so a store caught up to Friday stitches onto
    // Tuesday. The calendar decides this, so there is no threshold here to be
    // wrong across a half day.
    const window = tailWindow(
      ledger(
        toTimeRange(new Date("2026-09-04T13:30:00.000Z"), FRIDAY_CLOSE),
        1,
      ),
      "1m",
      toTimeRange(new Date("2026-09-04T13:30:00.000Z"), TUESDAY_CLOSE),
      new Date("2026-09-08T16:00:00.000Z"),
    );

    expect(window).not.toBe<TailDeclineReason>("stale-store");
    expect(typeof window).not.toBe("string");
  });
});

describe("the symbol the store holds nothing for", () => {
  it("fetches the current session's tail and nothing earlier", async () => {
    const stub = stubProvider(answerWith([], null));

    // No ledger row at all — a security added before its first backfill. There
    // is no `covered_end` to start from, and "fetch from undefined" is the
    // shape that becomes "fetch the whole window".
    await serve(stub, [], undefined);

    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0]?.range.start).toEqual(WEDNESDAY_OPEN);
  });

  it("names the tail as the only source in the resulting record", async () => {
    const bars = [bar("2026-09-09T13:30:00.000Z", 102)];
    const stub = stubProvider(
      answerWith(bars, toTimeRange(WEDNESDAY_OPEN, SERVABLE_END)),
    );

    const served = await serve(stub, [], undefined);

    // The empty stored half still carries ONE source — a non-empty tuple
    // requires it — whose `barCount` is 0 and whose provider/feed come from a
    // module constant rather than from a ledger row, because with no row there
    // is nothing that knows. Merging it would put a source describing nothing
    // on the wire beside the source that does.
    expect(served.series.provenance.sources).toHaveLength(1);
    expect(served.series.provenance.sources[0].feed).toBe("iex");
    expect(served.series.provenance.sources[0].barCount).toBe(1);
    expect(served.series.bars).toHaveLength(1);
  });
});

describe("the join", () => {
  it("returns one series spanning both halves, with both feeds and summing counts", async () => {
    const tailBars = [
      bar("2026-09-09T13:30:00.000Z", 102),
      bar("2026-09-09T17:43:00.000Z", 103),
    ];
    const stub = stubProvider(
      answerWith(tailBars, toTimeRange(WEDNESDAY_OPEN, SERVABLE_END)),
    );

    const served = await serve(stub);

    expect(served.series.bars).toHaveLength(4);
    expect(served.series.provenance.sources.map((s) => s.feed)).toEqual([
      "sip",
      "iex",
    ]);
    expect(served.series.provenance.sources.map((s) => s.barCount)).toEqual([
      2, 2,
    ]);
    // `toBarSeries` has already asserted these sum to the bars; the assertion
    // here is that the two halves are reported SEPARATELY, which is what makes
    // "part IEX, part consolidated tape" renderable.
    expect(served.series.coverage.covered).toEqual(
      toTimeRange(TUESDAY_OPEN, SERVABLE_END),
    );
    expect(served.series.coverage.requested).toEqual(WINDOW);
  });

  it("keeps the ledger's own statement unwidened by the tail", async () => {
    const stub = stubProvider(
      answerWith(
        [bar("2026-09-09T13:30:00.000Z", 102)],
        toTimeRange(WEDNESDAY_OPEN, SERVABLE_END),
      ),
    );

    const served = await serve(stub);

    // The tail is SERVED and not STORED. `held` is a fact about the store, and
    // a fetch that was deliberately not written has not changed it.
    expect(served.held?.covered.end).toEqual(TUESDAY_CLOSE);
  });

  it("does not add a second source for a tail that came back empty", async () => {
    // A tail lying entirely inside the withheld recent window comes back `ok`
    // with no bars. Putting it on the wire as a second feed would be a source
    // describing nothing, which is the same fiction the empty stored half is
    // dropped for.
    const stub = stubProvider(answerWith([], null));

    const served = await serve(stub);

    expect(stub.requests).toHaveLength(1);
    expect(served.series.provenance.sources).toHaveLength(1);
    expect(served.series.provenance.sources[0].feed).toBe("sip");
    expect(served.series.coverage.covered?.end).toEqual(TUESDAY_CLOSE);
  });

  it("refuses an adjustment disagreement as a programming error", async () => {
    const stub = stubProvider(
      answerWith(
        [bar("2026-09-09T13:30:00.000Z", 102)],
        toTimeRange(WEDNESDAY_OPEN, SERVABLE_END),
        "iex",
        "split-adjusted",
      ),
    );

    // A throw and not a client-visible failure: raw and split-adjusted prices
    // are two scales, so every percentage change across the seam would be
    // wrong. There is no truthful record for that series, so there is no
    // series — and a provider answering at an adjustment it was not asked for
    // is our bug rather than a market condition.
    await expect(serve(stub)).rejects.toThrow(RangeError);
  });
});

describe("the clamp, either side of now − 16 min", () => {
  it("reports the clamped end when the window reaches into the withheld minutes", async () => {
    const stub = stubProvider(
      answerWith(
        [bar("2026-09-09T17:43:00.000Z", 103)],
        // What the vendor's own client reports: the window it could serve,
        // which is `now − 16 min` rather than the `now` we asked for.
        toTimeRange(WEDNESDAY_OPEN, SERVABLE_END),
      ),
    );

    const served = await serve(stub);

    expect(served.series.coverage.covered?.end).toEqual(SERVABLE_END);
    expect(served.series.coverage.requested.end).toEqual(NOW);
  });

  it("reports the requested end when the window stops short of them", async () => {
    const historicalEnd = new Date("2026-09-09T16:00:00.000Z");
    const window = toTimeRange(TUESDAY_OPEN, historicalEnd);
    const stub = stubProvider(
      answerWith(
        [bar("2026-09-09T15:59:00.000Z", 103)],
        toTimeRange(WEDNESDAY_OPEN, historicalEnd),
      ),
    );

    const served = await serve(stub, TUESDAY_ROWS, TUESDAY_LEDGER, window);

    // Nothing is clipped, because nothing was withheld. The clamp is the
    // provider's and it is identical to the requested end on any window that
    // does not reach into the last ~16 minutes.
    expect(served.series.coverage.covered?.end).toEqual(historicalEnd);
  });
});

describe("a failing tail", () => {
  const failures = [
    "timeout",
    "rate-limited",
    "unauthorised",
    "upstream-unavailable",
  ] as const;

  it.each(failures)(
    "serves the stored part when the tail is %s",
    async (outcome) => {
      const log = recordingLogger();
      const stub = stubProvider(
        () =>
          ({
            outcome,
            ...(outcome === "timeout" ? { deadlineMs: 3000 } : {}),
          }) as BarsResult,
      );

      const served = await serve(
        stub,
        TUESDAY_ROWS,
        TUESDAY_LEDGER,
        WINDOW,
        log,
      );

      // §36's rule, and this is its first real instance in the epic. Not a 5xx,
      // and the eight-member taxonomy does not reach the client — it reaches the
      // log.
      expect(served.series.bars).toHaveLength(2);
      expect(served.series.provenance.sources).toHaveLength(1);
      expect(served.series.coverage.covered?.end).toEqual(TUESDAY_CLOSE);
      expect(log.warnings).toHaveLength(1);
      expect(log.warnings[0]).toMatchObject({ outcome, symbol: "NVDA" });
    },
  );

  it("reports an unknown symbol at debug rather than warn", async () => {
    const log = recordingLogger();
    const stub = stubProvider(() => ({ outcome: "unknown-symbol" }));

    const served = await serve(stub, TUESDAY_ROWS, TUESDAY_LEDGER, WINDOW, log);

    // A fact about the world this deployment cannot act on. Warning about it
    // once per page load would train a reader that the level means nothing.
    expect(log.warnings).toHaveLength(0);
    expect(log.debugs).toHaveLength(1);
    expect(served.series.bars).toHaveLength(2);
  });

  it("hands the outcome back so the route can say how far the answer reaches", async () => {
    const stub = stubProvider(() => ({ outcome: "upstream-unavailable" }));

    const served = await serve(stub);

    expect(served.tail).toMatchObject({
      attempted: true,
      result: { outcome: "upstream-unavailable" },
    });
  });
});

describe("what the tail is never asked", () => {
  it("does not reach behind the caller's own window start", () => {
    // A request whose window begins after `covered_end` must not be widened
    // backwards into data the caller did not ask for.
    const window = tailWindow(
      ledger(toTimeRange(TUESDAY_OPEN, TUESDAY_CLOSE), 2),
      "1m",
      toTimeRange(new Date("2026-09-09T15:00:00.000Z"), NOW),
      NOW,
    );

    expect(typeof window).not.toBe("string");
    expect((window as TimeRange).start).toEqual(
      new Date("2026-09-09T15:00:00.000Z"),
    );
  });

  it("frames a daily tail on midnight ET rather than on the session open", () => {
    // The trap `bar-window.ts` exists for, met on the read side: a daily bar is
    // stamped at midnight ET, so a daily tail framed on 09:30 contains no daily
    // bar at all and returns a perfectly well-formed empty answer.
    const window = tailWindow(
      undefined,
      "1d",
      toTimeRange(TUESDAY_OPEN, NOW),
      NOW,
    );

    expect(typeof window).not.toBe("string");
    expect((window as TimeRange).start).toEqual(
      new Date("2026-09-09T04:00:00.000Z"),
    );
  });
});

describe("the repository call", () => {
  it("passes the caller's own window and clock through unchanged", async () => {
    const readSeries = vi.fn(
      (
        symbol: Ticker,
        timeframe: "1m" | "1d",
        requested: TimeRange,
        now: Date,
      ) =>
        Promise.resolve({
          series: toStoredSeries({
            symbol,
            timeframe,
            requested,
            rows: [],
            held: undefined,
            now,
          }),
          held: undefined,
        }),
    );

    await serveSeries(
      {
        bars: { ...stubRepository([], undefined), readSeries },
        provider: undefined,
        log: recordingLogger(),
      },
      NVDA,
      "1m",
      WINDOW,
      NOW,
    );

    // The stored read is the caller's question verbatim: the tail's bound is a
    // decision about what to FETCH and never a narrowing of what to READ.
    expect(readSeries).toHaveBeenCalledWith(NVDA, "1m", WINDOW, NOW);
  });
});
