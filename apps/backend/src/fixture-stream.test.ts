import { describe, expect, it } from "vitest";

import { toTicker } from "@marketpulse/shared";

import { createFixtureStream } from "./fixture-stream.js";
import type {
  LiveObservation,
  MarketDataStream,
} from "./market-data-stream.js";
import { DISCONNECTED_AFTER_MS } from "./stream-connection.js";

const SYMBOLS = ["AAPL", "NVDA", "SPY"].map(toTicker);

const build = (overrides = {}) =>
  createFixtureStream({ symbols: SYMBOLS, now: () => 0, ...overrides });

const subscribed = () => {
  const stream = build();
  const observations: LiveObservation[] = [];
  const unsubscribe = stream.subscribe(SYMBOLS, {
    onObservations: (batch) => observations.push(...batch),
    onConnectionChange: noop,
  });
  return { stream, observations, unsubscribe };
};

/**
 * The wall clock these tests reason with.
 *
 * **Separate from the monotonic clock on purpose.** Observations carry an EPOCH
 * instant — a bar's `t` — while the liveness watchdog counts monotonic elapsed
 * time, and `FeedStatusInputs` keeps them apart because subtracting one from the
 * other is the defect Task 3.2.6 found: it made `stale` unreachable in
 * production. A minute after the newest bar, so staleness is the thing under
 * test rather than an accident of how far apart the two scales are.
 */
const FIRST_BAR = Date.parse("2026-09-16T13:30:00Z");

/** Thirty seconds after the first bar — inside §11.2's 60 s staleness window. */
const WALL_NOW = FIRST_BAR + 30_000;

describe("the second implementation of the seam", () => {
  it("satisfies MarketDataStream without any method throwing", () => {
    // Acceptance criterion 1 is fully satisfiable only now: TWO things
    // implement the interface and neither has a method that throws.
    const stream: MarketDataStream = build();

    expect(() => stream.connection()).not.toThrow();
    expect(() =>
      stream.status({ now: 0, wallNow: WALL_NOW, marketOpen: true }),
    ).not.toThrow();
    expect(stream.id).toBe("fixture");
  });

  it("reaches `subscribed` through the same handshake the real client does", () => {
    // Not cosmetic: a consumer written against one implementation has to work
    // against the other, and the interface is the only thing they share.
    const { stream } = subscribed();

    expect(stream.connection().phase).toBe("subscribed");
    expect(stream.connection().subscribedSymbols).toBe(SYMBOLS.length);
  });
});

describe("what it stamps", () => {
  it("names synthetic — not iex, and not replay", () => {
    const { stream, observations } = subscribed();
    stream.tick();

    expect(stream.feed).toBe("synthetic");
    for (const observation of observations) {
      expect(observation.source.feed).toBe("synthetic");
      expect(observation.source.provider).toBe("fixture");
    }
  });

  it("carries the provenance that makes a screenshot self-labelling", () => {
    // `PROVIDER.md` §5.4: because a fixture series carries `fixture`/`synthetic`,
    // a screenshot of a fixture-backed chart advertises itself in the chrome
    // STRUCTURALLY, without anybody remembering to add a banner.
    const { stream, observations } = subscribed();
    stream.tick();

    expect(observations[0]?.source).toMatchObject({
      provider: "fixture",
      feed: "synthetic",
    });
  });

  it("never claims to supersede, because a generated stream does not revise", () => {
    // §7.8's `u` case is a property of the VENDOR. Inventing one here would be
    // inventing a behaviour rather than a number.
    const { stream, observations } = subscribed();
    stream.tick();
    stream.tick();

    expect(observations.every((o) => !o.supersedes)).toBe(true);
  });
});

describe("determinism", () => {
  it("produces identical bars for identical seeds", () => {
    // A test asserting on a generated value must not be asserting on a coin
    // flip. A suite that depends on randomness it cannot control fails for
    // reasons nobody can reproduce.
    const first = build({ seed: 42 });
    const second = build({ seed: 42 });
    first.subscribe(SYMBOLS, noopSubscriber());
    second.subscribe(SYMBOLS, noopSubscriber());

    expect(first.tick()).toEqual(second.tick());
    expect(first.tick()).toEqual(second.tick());
  });

  it("produces different bars for different seeds", () => {
    const first = build({ seed: 1 });
    const second = build({ seed: 2 });
    first.subscribe(SYMBOLS, noopSubscriber());
    second.subscribe(SYMBOLS, noopSubscriber());

    expect(first.tick()).not.toEqual(second.tick());
  });

  it("advances one minute per tick, with startsAt marking the START", () => {
    const { stream } = subscribed();

    const first = stream.tick();
    const second = stream.tick();

    expect(first[0]?.bar.startsAt.toISOString()).toBe(
      "2026-09-16T13:30:00.000Z",
    );
    expect(second[0]?.bar.startsAt.toISOString()).toBe(
      "2026-09-16T13:31:00.000Z",
    );
  });

  it("produces bars whose high and low actually bound open and close", () => {
    // A generator that emits an impossible bar would put a defect into every
    // chart test downstream, and the chart would render it without complaint.
    const { stream } = subscribed();

    for (let i = 0; i < 50; i += 1) {
      for (const { bar } of stream.tick()) {
        expect(bar.high).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close));
        expect(bar.low).toBeLessThanOrEqual(Math.min(bar.open, bar.close));
        expect(bar.volume).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(bar.close)).toBe(true);
      }
    }
  });
});

describe("the unhappy states, reachable with no socket", () => {
  // A fixture stream that can only ever be healthy leaves half the interface
  // untested — and the half that matters, since §6.4's silent death and §8.2's
  // 406 are the states the product has to get right.
  it("can be driven to disconnected by silence", () => {
    const { stream } = subscribed();
    stream.tick();

    expect(stream.status({ now: 0, wallNow: WALL_NOW, marketOpen: true })).toBe(
      "live",
    );
    expect(
      stream.status({
        now: DISCONNECTED_AFTER_MS,
        wallNow: WALL_NOW,
        marketOpen: true,
      }),
    ).toBe("disconnected");
  });

  it("can be driven to stale — the feed behind a healthy socket stopping", () => {
    const { stream } = subscribed();
    stream.tick();
    // The socket is demonstrably alive throughout: a heartbeat keeps the
    // MONOTONIC watchdog satisfied while the WALL clock runs past the
    // observation's own instant. That combination is the whole of §11.2's
    // second sentence — *our socket is fine and the feed behind it is dead* —
    // and it is only expressible because the two clocks are separate.
    stream.inject({ kind: "heartbeat", at: 60_000 });

    expect(
      stream.status({
        now: 61_000,
        wallNow: FIRST_BAR + 60_000,
        marketOpen: true,
      }),
    ).toBe("stale");
  });

  it("can be driven through a 406 refusal", () => {
    const { stream } = subscribed();
    stream.inject({ kind: "error-frame", code: 406, at: 0 });

    expect(stream.connection().phase).toBe("refused");
    expect(stream.connection().lastErrorCode).toBe(406);
  });

  it("can be driven through a close, carrying the latency and no code", () => {
    const { stream } = subscribed();
    stream.inject({ kind: "closed", elapsedMs: 30_016, at: 0 });

    expect(stream.connection().phase).toBe("closed");
    expect(stream.connection().lastCloseElapsedMs).toBe(30_016);
    expect(stream.status({ now: 0, wallNow: WALL_NOW, marketOpen: true })).toBe(
      "disconnected",
    );
  });

  it("reports live out of hours with no observations at all", () => {
    // §6.6: out of hours a silent feed is a working feed.
    const { stream } = subscribed();

    expect(
      stream.status({ now: 0, wallNow: WALL_NOW, marketOpen: false }),
    ).toBe("live");
  });
});

describe("unsubscribing", () => {
  it("stops delivering and reports disconnected", () => {
    const { stream, observations, unsubscribe } = subscribed();
    stream.tick();
    const delivered = observations.length;
    unsubscribe();
    stream.tick();

    expect(observations).toHaveLength(delivered);
    expect(stream.status({ now: 0, wallNow: WALL_NOW, marketOpen: true })).toBe(
      "disconnected",
    );
  });

  it("is idempotent", () => {
    const { unsubscribe } = subscribed();

    expect(() => {
      unsubscribe();
      unsubscribe();
    }).not.toThrow();
  });
});

/** Ignores everything, for tests that read the stream's return value instead. */
function noop(): void {
  return undefined;
}

function noopSubscriber() {
  return { onObservations: noop, onConnectionChange: noop };
}
