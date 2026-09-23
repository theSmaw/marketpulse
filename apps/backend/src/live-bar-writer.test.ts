// The live writer's decisions, without a database (Task 3.8.3).
//
// What is asserted here is the shape of what it hands `recordSeries` — the
// covered window, the provenance, the grouping and the refusal isolation —
// because each of those is a decision rather than plumbing, and each is
// invisible in a database test that only reads the rows back.
import { describe, expect, it, vi } from "vitest";

import {
  toTicker,
  type Bar,
  type BarSeries,
  type Ticker,
} from "@marketpulse/shared";

import { createLiveBarWriter } from "./live-bar-writer.js";
import type { MarketBarsRepository } from "./market-bars.js";
import type { LiveObservation } from "./market-data-stream.js";

const NVDA = toTicker("NVDA");
const AAPL = toTicker("AAPL");

/** 2026-09-23 13:31:00Z — a regular-session minute. */
const MINUTE = Date.parse("2026-09-23T13:31:00.000Z");
const AFTER = MINUTE + 60_000;

function bar(startsAt: number, close = 100.5): Bar {
  return {
    startsAt: new Date(startsAt),
    open: 100,
    high: 101,
    low: 99,
    close,
    volume: 1_000,
  };
}

function observed(
  symbol: Ticker,
  startsAt: number,
  overrides: Partial<LiveObservation> = {},
): LiveObservation {
  return {
    symbol,
    bar: bar(startsAt),
    source: {
      provider: "alpaca",
      feed: "iex",
      retrievedAt: "2026-09-23T13:32:00.000Z",
      barCount: 1,
    },
    supersedes: false,
    ...overrides,
  };
}

/** A repository that records what it was asked to write and answers happily. */
function recorder(fail?: (series: BarSeries) => Error | undefined) {
  const written: BarSeries[] = [];
  const bars = {
    recordSeries: vi.fn((series: BarSeries) => {
      written.push(series);
      const failure = fail?.(series);
      if (failure !== undefined) return Promise.reject(failure);
      return Promise.resolve({
        inserted: series.bars.length,
        corrected: 0,
        unchanged: 0,
        coverage: undefined,
      });
    }),
  } as unknown as MarketBarsRepository;

  return { bars, written };
}

describe("the live bar writer", () => {
  it("stores the bar's own instant and its own provenance, never the stream's", async () => {
    const { bars, written } = recorder();
    const writer = createLiveBarWriter({
      bars,
      warn: () => undefined,
      now: () => AFTER,
    });

    await writer.store([observed(NVDA, MINUTE)]);

    const [series] = written;
    expect(series?.bars[0]?.startsAt.getTime()).toBe(MINUTE);

    // `TAPE.md` §6: the tape comes from the observation, never from a
    // constant and never from the stream's standing feed.
    const [source] = series?.provenance.sources ?? [];
    expect(source?.provider).toBe("alpaca");
    expect(source?.feed).toBe("iex");
    expect(source?.retrievedAt).toBe("2026-09-23T13:32:00.000Z");
    expect(series?.provenance.adjustment).toBe("raw");
  });

  it("claims only the minutes it holds, so tonight's backfill still asks", async () => {
    // **The decision Task 3.8.1 found and handed here.** `planRequests` skips
    // a session WHOLLY INSIDE the ledger's covered window, so a writer that
    // claimed `[session open, session close)` would stop the consolidated
    // version ever being fetched — a permanently thin session with no
    // collision and no error. The covered end is the last bar plus one minute
    // and nothing more.
    const { bars, written } = recorder();
    const writer = createLiveBarWriter({
      bars,
      warn: () => undefined,
      now: () => MINUTE + 5 * 60_000,
    });

    await writer.store([
      observed(NVDA, MINUTE),
      observed(NVDA, MINUTE + 60_000),
    ]);

    const covered = written[0]?.coverage.covered;
    expect(covered?.start.getTime()).toBe(MINUTE);
    expect(covered?.end.getTime()).toBe(MINUTE + 2 * 60_000);
  });

  it("holds back a bar whose minute has not ended, and counts it", async () => {
    // Not a completeness test on the feed — the vendor sends a minute's bar at
    // the end of that minute — but a guard against the one shape no correction
    // can fix: a bar stamped in the future.
    const { bars, written } = recorder();
    const writer = createLiveBarWriter({
      bars,
      warn: () => undefined,
      now: () => MINUTE + 30_000,
    });

    const report = await writer.store([observed(NVDA, MINUTE)]);

    expect(report.pending).toBe(1);
    expect(report.securities).toBe(0);
    expect(written).toEqual([]);
  });

  it("writes one series per security, so one transaction holds one security's minute", async () => {
    const { bars, written } = recorder();
    const writer = createLiveBarWriter({
      bars,
      warn: () => undefined,
      now: () => AFTER,
    });

    await writer.store([observed(NVDA, MINUTE), observed(AAPL, MINUTE)]);

    expect(written).toHaveLength(2);
    expect(written.map((series) => series.symbol).sort()).toEqual([
      "AAPL",
      "NVDA",
    ]);
  });

  it("one security's refusal does not cost the batch", async () => {
    const { bars, written } = recorder((series) =>
      series.symbol === NVDA ? new Error("refused for a reason") : undefined,
    );
    const warn = vi.fn();
    const writer = createLiveBarWriter({ bars, warn, now: () => AFTER });

    const report = await writer.store([
      observed(NVDA, MINUTE),
      observed(AAPL, MINUTE),
    ]);

    expect(written).toHaveLength(2);
    expect(report.refused.get(NVDA)).toContain("refused for a reason");
    expect(report.inserted).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("never rejects, whatever the store does", async () => {
    // The callback this runs in belongs to the socket. A rejection escaping it
    // is a crashed process on a liveness-probed platform.
    const { bars } = recorder(() => new Error("the pool is gone"));
    const writer = createLiveBarWriter({
      bars,
      warn: () => undefined,
      now: () => AFTER,
    });

    await expect(writer.store([observed(NVDA, MINUTE)])).resolves.toMatchObject(
      { inserted: 0 },
    );
  });

  it("sorts a batch that arrives out of order, because a series must ascend", async () => {
    const { bars, written } = recorder();
    const writer = createLiveBarWriter({
      bars,
      warn: () => undefined,
      now: () => MINUTE + 5 * 60_000,
    });

    await writer.store([
      observed(NVDA, MINUTE + 60_000),
      observed(NVDA, MINUTE),
    ]);

    expect(written[0]?.bars.map((one) => one.startsAt.getTime())).toEqual([
      MINUTE,
      MINUTE + 60_000,
    ]);
  });

  // **The defect this found rather than the one it was sent for** (Task
  // 3.8.7). One batch is one socket message, and `observationsIn` flat-maps
  // every observation frame in it into a single call — so a bar and its
  // revision for the same minute can arrive together. Before this task that
  // pair reached `toBarSeries` as two bars stamped alike, which throws, and
  // the per-security catch turned it into a refusal: the security lost **the
  // bar as well as the revision**, silently, to a `warn` line. Reproduced
  // against the shipped writer before it was repaired.
  it("collapses a bar and its revision in one batch, keeping the revision", async () => {
    const { bars, written } = recorder();
    const warnings: string[] = [];
    const writer = createLiveBarWriter({
      bars,
      warn: (_fields, message) => warnings.push(message),
      now: () => MINUTE + 5 * 60_000,
    });

    const report = await writer.store([
      observed(NVDA, MINUTE, { bar: bar(MINUTE, 100.5) }),
      observed(NVDA, MINUTE, { bar: bar(MINUTE, 101.25) }),
    ]);

    // One bar, not two — and not a refusal, which is what it used to be.
    expect(report.refused.size).toBe(0);
    expect(warnings).toEqual([]);
    expect(written[0]?.bars).toHaveLength(1);

    // **Last wins, because within one batch that is what a revision is.** The
    // frames arrive in the order the vendor sent them, so a later frame for a
    // minute already in the batch is the correction to it.
    expect(written[0]?.bars[0]?.close).toBe(101.25);
  });

  it("still writes both when the two minutes differ", async () => {
    // The guard above must not collapse an ordinary pair of bars.
    const { bars, written } = recorder();
    const writer = createLiveBarWriter({
      bars,
      warn: () => undefined,
      now: () => MINUTE + 5 * 60_000,
    });

    await writer.store([
      observed(NVDA, MINUTE),
      observed(NVDA, MINUTE + 60_000),
    ]);

    expect(written[0]?.bars).toHaveLength(2);
  });
});
