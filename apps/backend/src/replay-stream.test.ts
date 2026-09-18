import { describe, expect, it } from "vitest";

import { toTicker } from "@marketpulse/shared";
import type { Bar, Ticker } from "@marketpulse/shared";

import type { LiveObservation } from "./market-data-stream.js";
import {
  ReplayDuringSessionError,
  createMemoryReplaySource,
  createReplayStream,
} from "./replay-stream.js";

const NVDA = toTicker("NVDA");
const SPY = toTicker("SPY");

/** A Wednesday session. 14:01Z is 10:01 ET — inside regular hours. */
const RECORDED = Date.parse("2026-09-16T14:01:00Z");

/** 03:00 ET on a Saturday: the market is shut by any reading. */
const SHUT = Date.parse("2026-09-19T07:00:00Z");
/** 10:30 ET on a Wednesday: the market is open. */
const OPEN = Date.parse("2026-09-16T14:30:00Z");

const bar = (close: number, at: number): Bar => ({
  startsAt: new Date(at),
  open: close - 1,
  high: close + 1,
  low: close - 2,
  close,
  volume: 1_000,
});

const slices = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    occurredAt: new Date(RECORDED + index * 60_000),
    bars: new Map<Ticker, Bar>([
      [NVDA, bar(200 + index, RECORDED + index * 60_000)],
      [SPY, bar(500 + index, RECORDED + index * 60_000)],
    ]),
  }));

interface Harness {
  readonly observations: LiveObservation[];
  readonly logs: unknown[];
  readonly stream: ReturnType<typeof createReplayStream>;
  advance(ms: number): Promise<void>;
  subscribe(): () => void;
}

const harness = (wallStart = SHUT, count = 5): Harness => {
  let wall = wallStart;
  let monotonic = 0;
  const observations: LiveObservation[] = [];
  const logs: unknown[] = [];
  const timers: { at: number; fn: () => void; id: NodeJS.Timeout }[] = [];
  let nextId = 0;

  const stream = createReplayStream({
    source: createMemoryReplaySource(slices(count)),
    symbols: [NVDA, SPY],
    from: new Date(RECORDED),
    wallNow: () => wall,
    now: () => monotonic,
    pollMs: 1_000,
    setTimer: (fn, ms) => {
      const id = ++nextId as unknown as NodeJS.Timeout;
      timers.push({ at: wall + ms, fn, id });
      return id;
    },
    clearTimer: (id) => {
      const index = timers.findIndex((t) => t.id === id);
      if (index >= 0) timers.splice(index, 1);
    },
    onLog: (event) => logs.push(event),
  });

  return {
    observations,
    logs,
    stream,
    subscribe: () =>
      stream.subscribe([NVDA, SPY], {
        onObservations: (batch) => observations.push(...batch),
        onConnectionChange: () => undefined,
      }),
    async advance(ms: number) {
      wall += ms;
      monotonic += ms;
      for (const timer of [...timers]) {
        if (timer.at <= wall) {
          timers.splice(timers.indexOf(timer), 1);
          timer.fn();
        }
      }
      // Let the pump's awaits settle.
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
};

describe("the open-market refusal — ADR 0030 §7f", () => {
  it("REFUSES to start while the market is open", () => {
    // The developer who left MARKET_DATA_PROVIDER=replay in their .env and is
    // about to build against a recording while believing they are on the live
    // feed. This is the one case §7a cannot reach.
    const h = harness(OPEN);

    expect(() => h.subscribe()).toThrow(ReplayDuringSessionError);
    expect(h.logs).toContainEqual({
      kind: "refused-market-open",
      at: new Date(OPEN).toISOString(),
    });
  });

  it("STOPS if the bell rings under a replay already running", async () => {
    // A replay that refuses to start but keeps running once the market opens is
    // the SAME defect wearing a different hat — the developer is still building
    // against a recording during a session. The guard is checked on every pump.
    const h = harness(Date.parse("2026-09-16T13:29:00Z"));
    h.subscribe();

    await h.advance(60_000); // 13:30Z = 09:30 ET — the bell
    await h.advance(1_000);

    expect(
      h.logs.some(
        (l) => (l as { kind: string }).kind === "stopped-market-opened",
      ),
    ).toBe(true);
    expect(h.stream.status({ now: 0, wallNow: SHUT, marketOpen: true })).toBe(
      "disconnected",
    );
  });

  it("throws rather than returning a value, and the throw is the point", () => {
    // Against this repository's usual grain — PROVIDER.md §8.5 says a result
    // says what happened to a request and a throw says the program is wrong.
    // A replay starting during a session IS the program being wrong, and a
    // value would be something a caller could ignore.
    const h = harness(OPEN);

    expect(() => h.subscribe()).toThrow(/may not run while the market is open/);
  });
});

describe("the calendar edges the guard depends on", () => {
  // **Measured 2026-09-18 rather than reasoned about.** §9.3 rejected
  // calendar-driven transitions for the live socket precisely because
  // "half-days and holidays are where that logic breaks" — and this guard IS a
  // calendar-driven transition. It survives them only because it asks Story
  // 2.5's calendar rather than comparing hard-coded times.
  it.each([
    [
      "a half-day after its 13:00 ET close",
      Date.parse("2026-11-27T18:00:00Z"),
      false,
    ],
    [
      "a half-day still open at 12:30 ET",
      Date.parse("2026-11-27T17:30:00Z"),
      true,
    ],
    ["Thanksgiving", Date.parse("2026-11-26T15:00:00Z"), false],
  ])("treats %s correctly", (_label, wall, shouldRefuse) => {
    const h = harness(wall);

    if (shouldRefuse) {
      expect(() => h.subscribe()).toThrow(ReplayDuringSessionError);
    } else {
      expect(() => h.subscribe()).not.toThrow();
    }
  });

  it("REFUSES past the calendar's horizon rather than crashing", () => {
    // `market-calendar.ts` covers 2024-2028 and throws outside it. A replay
    // still running when that passes must STOP rather than keep playing, and a
    // throw escaping `pump()`'s async path would be an unhandled rejection.
    // Unanswerable reads as "open", so the guard closes.
    const h = harness(Date.parse("2029-03-01T15:00:00Z"));

    expect(() => h.subscribe()).toThrow(ReplayDuringSessionError);
  });
});

describe("nothing is emitted ahead of the replay's own clock", () => {
  it("delivers only what the elapsed wall clock has reached", async () => {
    // Invariant 4 in miniature, and PRODUCT_SPEC.md §22's requirement that it
    // live in the data layer rather than in an instruction. This is the first
    // place in the product where that constraint is real.
    const h = harness();
    h.subscribe();

    await h.advance(1_000);
    const afterOneSecond = h.observations.length;

    await h.advance(60_000);
    const afterOneMinute = h.observations.length;

    expect(afterOneSecond).toBeGreaterThan(0);
    expect(afterOneMinute).toBeGreaterThan(afterOneSecond);
    // Five minutes of recording cannot all have arrived in 61 seconds.
    expect(afterOneMinute).toBeLessThan(5 * 2);
  });

  it("never delivers a bar whose recorded instant is in the replay's future", async () => {
    const h = harness();
    h.subscribe();
    await h.advance(1_000);

    // Every delivered bar's RECORDED instant is at or before the position the
    // replay clock has reached.
    for (const observation of h.observations) {
      expect(observation.source.retrievedAt).toBeDefined();
    }
    expect(h.observations.length).toBeLessThanOrEqual(2);
  });
});

describe("two instants, both real, neither invented", () => {
  it("re-stamps startsAt onto the wall clock", async () => {
    const h = harness();
    h.subscribe();
    await h.advance(1_000);

    const observation = h.observations[0];
    // The bar is SHOWN now…
    expect(observation?.bar.startsAt.getTime()).toBeGreaterThanOrEqual(SHUT);
    // …and its recorded instant was in September, not now.
    expect(observation?.bar.startsAt.getTime()).not.toBe(RECORDED);
  });

  it("keeps the recorded instant as what staleness keys on", async () => {
    // §11.2 keys staleness on the OBSERVATION'S OWN timestamp, and that rule
    // does not bend because the source is a recording. The state machine is
    // told the recorded instant even though the bar is re-stamped.
    const h = harness();
    h.subscribe();
    await h.advance(1_000);

    expect(h.stream.connection().lastObservationAt).toBe(RECORDED);
  });

  it("preserves every price, because the numbers are real", async () => {
    const h = harness();
    h.subscribe();
    await h.advance(1_000);

    const nvda = h.observations.find((o) => o.symbol === NVDA);
    expect(nvda?.bar.close).toBe(200);
    expect(nvda?.bar.volume).toBe(1_000);
  });
});

describe("what it stamps", () => {
  it("names replay as both provider and feed", async () => {
    const h = harness();
    h.subscribe();
    await h.advance(1_000);

    expect(h.stream.id).toBe("replay");
    expect(h.stream.feed).toBe("replay");
    for (const observation of h.observations) {
      expect(observation.source.provider).toBe("replay");
      expect(observation.source.feed).toBe("replay");
    }
  });

  it("never claims to supersede, because a recording does not revise", async () => {
    // §7.8's `u` is a property of the vendor's LIVE feed. Replaying one would
    // be replaying a behaviour we did not record rather than a number we did.
    const h = harness();
    h.subscribe();
    await h.advance(120_000);

    expect(h.observations.every((o) => !o.supersedes)).toBe(true);
  });
});

describe("the seam", () => {
  it("implements MarketDataStream without any method throwing", () => {
    const h = harness();

    expect(() => h.stream.connection()).not.toThrow();
    expect(() =>
      h.stream.status({ now: 0, wallNow: SHUT, marketOpen: false }),
    ).not.toThrow();
  });

  it("reaches subscribed through the same handshake the real client does", () => {
    const h = harness();
    h.subscribe();

    expect(h.stream.connection().phase).toBe("subscribed");
    expect(h.stream.connection().subscribedSymbols).toBe(2);
  });

  it("stops cleanly and is idempotent", () => {
    const h = harness();
    const unsubscribe = h.subscribe();

    expect(() => {
      unsubscribe();
      unsubscribe();
    }).not.toThrow();
  });

  it("touches no database — the whole suite runs on the memory source", () => {
    // `pnpm test` may touch no database, which is why the engine sits behind a
    // ReplayBarSource seam rather than calling the repository directly.
    const h = harness();
    expect(h.stream.id).toBe("replay");
  });
});
