import type {
  Bar,
  BarSource,
  FeedStatusInputs,
  MarketFeed,
  Ticker,
} from "@marketpulse/shared";

import type {
  LiveObservation,
  MarketDataStream,
  StreamSubscriber,
  Unsubscribe,
} from "./market-data-stream.js";
import {
  advanceStreamConnection,
  feedStatusOf,
  initialStreamConnection,
  type StreamConnection,
  type StreamEvent,
} from "./stream-connection.js";

/**
 * A {@link MarketDataStream} that invents its numbers.
 *
 * **The second implementation of the seam, and that is its real job.** Task
 * 3.2.2 wrote `MarketDataStream` before anything implemented it, on
 * `PROVIDER.md`'s rule that *an interface extracted from a working client is a
 * description of that client; an interface written first is a constraint on
 * it.* A first implementation cannot test that claim — anything can be
 * implemented once. **A second one can**, because a seam that was secretly a
 * description of `ws` has to contort here.
 *
 * It exists so `pnpm test` and `pnpm dev` have a feed with **no credential, no
 * network and no database** — the last of those being why it is separate from
 * Task 3.2.7's replay, since the suite may touch no database.
 *
 * ## `synthetic`, and the label does real work
 *
 * Every bar carries `feed: "synthetic"`, whose words are already shipped:
 * *"Simulated — Generated test data. Not a market feed."* `PROVIDER.md` §5.4
 * makes the point that matters: because a fixture series carries that
 * provenance, **a screenshot of a fixture-backed chart advertises itself in the
 * chrome structurally**, without anybody remembering to add a banner.
 *
 * ## What stops these prices reaching a person
 *
 * Not this file. Two mechanisms that already exist, neither of them here:
 * `PROVIDER_SERVES` marks `fixture` as `not-the-live-market`, so `config.ts`
 * refuses to start a deployment selecting it without `NON_LIVE_MARKET_DATA=permitted`
 * granted **by name**; and the default selection is **`none`**, so forgetting to
 * configure anything yields no feed rather than an invented one
 * (`PROVIDER.md` §5.3). Both are break-verified.
 */

/** A generated bar's provenance. Not `iex`, not `replay` — it is what it is. */
const SYNTHETIC_FEED = "synthetic" as const satisfies MarketFeed;

/** Narrowed for the reason `StreamBarSource` is: a wide field is where a lie fits. */
export type FixtureBarSource = BarSource & {
  readonly feed: typeof SYNTHETIC_FEED;
};

export interface FixtureStreamOptions {
  readonly symbols: readonly Ticker[];
  /**
   * The seed. **Deterministic by default and that is a requirement rather than
   * a nicety**: a test asserting on a generated value must not be asserting on
   * a coin flip, and a suite that depends on randomness it cannot control fails
   * for reasons nobody can reproduce.
   */
  readonly seed?: number;
  /** Where the generated walk starts. */
  readonly startingPrice?: number;
  /** The first bar's interval start, so `startsAt` is decided rather than read. */
  readonly startingMinute?: Date;
  /** Injected, for the same reason the real client injects it. */
  readonly now?: () => number;
}

/**
 * A tiny deterministic generator — mulberry32.
 *
 * Chosen for being **five lines and seedable**, not for statistical quality:
 * nothing here needs good randomness, it needs *reproducible* randomness, and a
 * dependency would be a dependency for five lines.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Two decimal places, the grain a US equity price actually has. */
const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface FixtureStream extends MarketDataStream {
  /**
   * Deliver one generated bar per symbol for the next minute.
   *
   * **Driven rather than timed.** A generator on a real interval would make
   * every test a race and `pnpm dev`'s behaviour depend on wall-clock timing;
   * the caller decides when a minute passes, which is the same decision the
   * real client's injected clock makes for the same reason.
   */
  tick(): readonly LiveObservation[];
  /**
   * Play an arbitrary {@link StreamEvent} through the **same** state machine
   * the real client drives.
   *
   * This is what makes the unhappy states reachable with no socket. A fixture
   * stream that could only ever be healthy would leave half of
   * `MarketDataStream` untested — and the half that matters, since §6.4's
   * silent death and §8.2's `406` are the states the product has to get right.
   */
  inject(event: StreamEvent): void;
}

export function createFixtureStream(
  options: FixtureStreamOptions,
): FixtureStream {
  const {
    symbols,
    seed = 1,
    startingPrice = 100,
    startingMinute = new Date("2026-09-16T13:30:00.000Z"),
    now = () => performance.now(),
  } = options;

  const random = seeded(seed);
  const prices = new Map<Ticker, number>(
    symbols.map((symbol) => [symbol, startingPrice]),
  );
  let minute = startingMinute;
  let connection: StreamConnection = initialStreamConnection;
  let subscriber: StreamSubscriber | undefined;

  const apply = (event: StreamEvent): void => {
    connection = advanceStreamConnection(connection, event);
    subscriber?.onConnectionChange(connection);
  };

  const source = (): FixtureBarSource => ({
    provider: "fixture",
    feed: SYNTHETIC_FEED,
    retrievedAt: new Date(minute.getTime() + 60_000).toISOString(),
    barCount: 1,
  });

  const nextBar = (symbol: Ticker): Bar => {
    const open = prices.get(symbol) ?? startingPrice;
    // A ±1% walk. The shape is deliberately unremarkable: this stream exists to
    // exercise the seam, and Story 3.4's motion vocabulary is designed against
    // Task 3.2.7's REAL replayed bars precisely because invented numbers do not
    // move the way real ones do.
    const close = round2(open * (1 + (random() - 0.5) * 0.02));
    const high = round2(Math.max(open, close) * (1 + random() * 0.002));
    const low = round2(Math.min(open, close) * (1 - random() * 0.002));
    prices.set(symbol, close);

    return {
      startsAt: minute,
      open: round2(open),
      high,
      low,
      close,
      volume: Math.floor(random() * 100_000),
    };
  };

  return {
    id: "fixture",
    feed: SYNTHETIC_FEED,

    subscribe(
      _symbols: readonly Ticker[],
      target: StreamSubscriber,
    ): Unsubscribe {
      subscriber = target;
      // The same handshake the real client reports, so a consumer written
      // against one works against the other. Task 3.2.2's interface is the only
      // thing either of them shares, which is the point.
      const at = now();
      apply({ kind: "socket-opened", at });
      apply({ kind: "greeted", at });
      apply({ kind: "authenticated", at });
      apply({
        kind: "subscription-acknowledged",
        symbolCount: symbols.length,
        at,
      });

      return () => {
        apply({ kind: "closed", elapsedMs: 0, at: now() });
        subscriber = undefined;
      };
    },

    status(inputs: FeedStatusInputs) {
      return feedStatusOf(connection, inputs);
    },

    connection() {
      return connection;
    },

    tick() {
      const observedAt = minute.getTime();
      const observations = symbols.map((symbol) => ({
        symbol,
        bar: nextBar(symbol),
        source: source(),
        // A generated stream never revises. §7.8's `u` case is a property of
        // the vendor, and inventing one here would be inventing a behaviour
        // rather than a number.
        supersedes: false,
      }));

      apply({ kind: "observations", observedAt, at: now() });
      minute = new Date(minute.getTime() + 60_000);
      if (observations.length > 0) subscriber?.onObservations(observations);
      return observations;
    },

    inject(event: StreamEvent) {
      apply(event);
    },
  };
}
