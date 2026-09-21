import { toTicker } from "@marketpulse/shared";
import type { Bar, Ticker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import type { Config } from "./config.js";
import type { MarketBarsRepository } from "./market-bars.js";
import { STREAM_SYMBOLS, createMarketStream } from "./market-stream.js";
import type { LiveObservation } from "./market-data-stream.js";

/**
 * **The assertion that was missing** (Task 3.4.3).
 *
 * Story 3.2 shipped three implementations of `MarketDataStream` and Task 3.2.9
 * found that **nothing constructed any of them**. This file closes the same gap
 * one level further out: they were constructed, and **none of them drove
 * itself**. Every other test in this repository advances a stream by hand — it
 * calls `tick()`, or injects a `StreamEvent` — so a stream left alone in a
 * running process could produce nothing for ever with `pnpm verify` green, and
 * for two stories one did.
 *
 * > The repair is not finished when a number moves. It is finished when
 * > something would go red if it stopped.
 *
 * ## The rule these tests hold
 *
 * **A stream that a running process constructs must deliver an observation
 * with nothing but time passing.** Nothing here calls `tick()`, and that
 * absence is the whole test — a version that called it would pass against the
 * exact defect this file exists to catch.
 *
 * ## Which implementations are in, and why `alpaca` is not
 *
 * `fixture` and `replay` are **self-driving by construction**: they own a timer
 * and decide for themselves when a minute has passed. `alpaca` is not, and that
 * is correct rather than an omission — it is driven by **frames arriving on a
 * socket**, so the equivalent claim about it is *a frame produces an
 * observation*, which `alpaca-stream.test.ts` already asserts by feeding it
 * frames. Asserting a timer there would be asserting a mechanism it must not
 * have: a client that invented minutes the vendor had not sent would be
 * manufacturing prices.
 */

/** Both timers are injected, so a minute passes in a microtask. */
const manualTimers = () => {
  let next = 1;
  const fns = new Map<number, () => void>();

  return {
    // The interval is ignored: `fire()` decides when a minute passes.
    setTimer: (fn: () => void) => {
      const id = next++;
      fns.set(id, fn);
      return id as unknown as NodeJS.Timeout;
    },
    clearTimer: (timer: NodeJS.Timeout) => {
      fns.delete(timer as unknown as number);
    },
    /** Fire every armed timer once, the way a real interval would. */
    fire: () => {
      for (const fn of [...fns.values()]) fn();
    },
    armed: () => fns.size,
  };
};

const bar = (startsAt: Date, close: number): Bar => ({
  startsAt,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
});

/**
 * A repository holding one session of bars for every symbol, in memory.
 *
 * `pnpm test` may touch no database, and the replay's real source reads through
 * `readBars` — so a fake of that one method exercises the whole path the
 * process uses, `createStoredReplaySource` included.
 */
const barsFor = (from: Date, minutes: number): MarketBarsRepository =>
  ({
    readBars: (
      _symbol: Ticker,
      _timeframe: string,
      range: { start: Date; end: Date },
    ) =>
      Promise.resolve(
        Array.from({ length: minutes }, (_unused, index) =>
          bar(new Date(from.getTime() + index * 60_000), 100 + index),
        ).filter(
          (candidate) =>
            candidate.startsAt >= range.start && candidate.startsAt < range.end,
        ),
      ),
  }) as unknown as MarketBarsRepository;

/**
 * Let every pending microtask settle: the replay's pump reads through `await`.
 *
 * **Ten turns until Task 3.5.3, and that stopped being enough at 518.**
 * `replay-bar-source.ts` reads the store **one symbol at a time** —
 * `for (const symbol of symbols) { await repository.readBars(...) }` — so the
 * number of microtask turns a fill needs is proportional to the size of the
 * subscription. Scaling the upstream set from five symbols to the tracked
 * universe turned this helper into a silent `expect(0).toBeGreaterThan(0)`.
 *
 * The turn count is therefore derived from the subscription rather than
 * guessed, with headroom, so it cannot rot the same way again.
 */
const flush = async (): Promise<void> => {
  const turns = STREAM_SYMBOLS.length * 8 + 200;
  for (let turn = 0; turn < turns; turn += 1) await Promise.resolve();
};

const configWith = (overrides: Partial<Config>): Config =>
  ({ marketDataProvider: "none", ...overrides }) as Config;

/** 03:00 ET on a Saturday — the replay may only run while the market is shut. */
const SHUT = Date.parse("2026-09-19T07:00:00Z");

describe("a stream a running process constructs drives ITSELF", () => {
  it("the fixture produces a minute with nothing but time passing", () => {
    // **Nothing in this test calls `tick()`.** Until Task 3.4.3 the fixture had
    // no clock at all: `pnpm dev` with `MARKET_DATA_PROVIDER=fixture` reported a
    // healthy connection and emitted nothing, for ever.
    const timers = manualTimers();
    const received: LiveObservation[] = [];

    const stream = createMarketStream(
      configWith({ marketDataProvider: "fixture" }),
      { bars: barsFor(new Date("2026-09-11T13:30:00Z"), 5), timers },
    );

    stream?.subscribe(STREAM_SYMBOLS, {
      onObservations: (batch) => received.push(...batch),
      onConnectionChange: () => undefined,
    });

    expect(received).toHaveLength(0);
    timers.fire();

    expect(received.map((observation) => observation.symbol)).toEqual([
      ...STREAM_SYMBOLS,
    ]);
  });

  it("the fixture stops when it is unsubscribed, rather than running for ever", () => {
    const timers = manualTimers();
    const received: LiveObservation[] = [];

    const stream = createMarketStream(
      configWith({ marketDataProvider: "fixture" }),
      { bars: barsFor(new Date("2026-09-11T13:30:00Z"), 5), timers },
    );

    const unsubscribe = stream?.subscribe(STREAM_SYMBOLS, {
      onObservations: (batch) => received.push(...batch),
      onConnectionChange: () => undefined,
    });

    unsubscribe?.();
    expect(timers.armed()).toBe(0);

    timers.fire();
    expect(received).toHaveLength(0);
  });

  it("the replay produces a recorded minute with nothing but time passing", async () => {
    // The same claim for the implementation Task 3.4.4's design decision needs,
    // and it runs through `createMarketStream` and `createStoredReplaySource`
    // rather than around them — because **the defect that cost this story a
    // task was in the wiring**, not in any one file: the source was innocent
    // and the start instant was a Saturday.
    const from = new Date("2026-09-11T13:30:00Z");
    const timers = manualTimers();
    const received: LiveObservation[] = [];

    const stream = createMarketStream(
      configWith({ marketDataProvider: "replay" }),
      {
        bars: barsFor(from, 5),
        replayFrom: from,
        // Frozen a millisecond past the first recorded minute, so exactly one
        // slice is due: the engine's ceiling is `from + elapsed x speed`, and
        // nothing may be emitted ahead of the replay's own clock.
        wallNow: () => SHUT,
        timers,
      },
    );

    stream?.subscribe(STREAM_SYMBOLS, {
      onObservations: (batch) => received.push(...batch),
      onConnectionChange: () => undefined,
    });

    expect(received).toHaveLength(0);
    timers.fire();
    // `pump()` reads the source through an `await`, so the observation lands a
    // microtask later rather than inside `fire()`.
    await flush();

    expect(received.length).toBeGreaterThan(0);

    // **`received[0]` was asserted to be `AAPL` until Task 3.5.3**, which was
    // true only because the upstream set was five hard-coded names with
    // `AAPL` first. The set is now the tracked universe in `UNIVERSE`'s own
    // order — sector proxies, then index proxies, then equities — so the first
    // observation in a slice is `XLK`, and the assertion was testing the
    // ordering of a literal rather than anything about the replay.
    //
    // What it MEANS to assert is that the slice carries real subscribed
    // symbols, which survives any future reordering of the universe.
    const symbols = new Set(received.map((observation) => observation.symbol));
    expect(symbols.has(toTicker("AAPL"))).toBe(true);
    expect(symbols.size).toBe(STREAM_SYMBOLS.length);

    // Re-stamped onto the instant it is being SHOWN at, never the recorded one.
    expect(received[0]?.bar.startsAt.getTime()).toBeGreaterThan(from.getTime());
  });
});
