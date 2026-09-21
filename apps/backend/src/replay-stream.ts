import { marketSessionStateAt } from "@marketpulse/shared";
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
  createReplayEngine,
  restamp,
  type ReplayBarSource,
  type ReplayEngine,
} from "./replay-engine.js";
import {
  advanceStreamConnection,
  feedStatusOf,
  initialStreamConnection,
  type StreamConnection,
  type StreamEvent,
} from "./stream-connection.js";

/**
 * A {@link MarketDataStream} over our **own stored bars**, re-stamped onto the
 * wall clock.
 *
 * ## Why this exists, and why it is dangerous enough to need four mechanisms
 *
 * The US market is open six and a half hours a day and this team's working day
 * mostly is not. **Story 3.4 has to settle a motion vocabulary against real
 * moving numbers**, and invented prices cannot settle it: the shape of real
 * intraday movement is the thing being designed against.
 *
 * The risk it creates is the one [ADR 0030] exists to answer — *the application
 * gets built against the replay and the real socket quietly stops working* —
 * and the answers are mechanical rather than intentions:
 *
 * | | Mechanism | Kind |
 * | --- | --- | --- |
 * | §7a-bis | `config.ts` refuses to start a `not-the-live-market` provider without `NON_LIVE_MARKET_DATA=permitted`, granted by name | **Prevents** |
 * | §7b | The deploy **reads** the configured provider and refuses to roll on anything but `alpaca` — it reads, never sets | **Prevents** |
 * | §7c, §7d | `check-deployed.mjs` after a merge, and a scheduled probe between merges | **Detect and bound** |
 * | §7e | A second opt-in key production has never had | **Raises one mistake to two** |
 * | §7f | **This file**: refuses to run while the market is open | **Developer-side** |
 *
 * **None of these is a compiler, and the word "guaranteed" does not appear in
 * this story's record.** §7a-bis is the strongest and it is still configuration
 * — what changed is that a single wrong value, or any omission, now stops the
 * process.
 *
 * ## The consequence that is the opposite of what a reader expects
 *
 * ADR 0030 §7f states it and it is worth repeating here: because the deployed
 * site connects to the real IEX socket during **every** session and nothing else
 * ever serves there, **the live feed is exercised _more_ under this ADR than it
 * would be without it, not less.**
 */

/**
 * Its own words, shipped by Task 3.2.1 from ADR 0030 §3. Do not re-decide them.
 *
 * **Exported since Task 3.4.9**, so `GET /market-data` names the same feed this
 * stream stamps rather than a second literal. It reads it because a replay
 * produces **no historical provider** — ADR 0030 §3, deliberately — and the
 * route's `feed` used to come only from one, which is how the chrome ended up
 * saying *no market-data provider is configured* beside its own `REPLAYING`.
 */
export const REPLAY_FEED = "replay" as const satisfies MarketFeed;

/** Narrowed for the reason `StreamBarSource` is: a wide field is where a lie fits. */
export type ReplayBarSourceStamp = BarSource & {
  readonly feed: typeof REPLAY_FEED;
};

export interface ReplayStreamOptions {
  readonly source: ReplayBarSource;
  readonly symbols: readonly Ticker[];
  /** Where in the recording to start. */
  readonly from: Date;
  /** Wall clock, injected. The module never reads one. */
  readonly wallNow?: () => number;
  /** Monotonic clock, injected — see `FeedStatusInputs`' two-clocks note. */
  readonly now?: () => number;
  readonly speed?: number;
  /** How often to ask the engine what is due. */
  readonly pollMs?: number;
  readonly setTimer?: (fn: () => void, ms: number) => NodeJS.Timeout;
  readonly clearTimer?: (timer: NodeJS.Timeout) => void;
  readonly onLog?: (event: ReplayLogEvent) => void;
}

export type ReplayLogEvent =
  | { readonly kind: "refused-market-open"; readonly at: string }
  | { readonly kind: "stopped-market-opened"; readonly at: string }
  | { readonly kind: "started"; readonly from: string };

/**
 * Thrown when a replay is asked to start during a session.
 *
 * **A throw rather than a value, deliberately, and against this repository's
 * usual grain.** `PROVIDER.md` §8.5's line is that a result says what happened
 * to a request and a throw says the program is wrong — and a replay starting
 * during a session **is** the program being wrong: it is the developer who left
 * `MARKET_DATA_PROVIDER=replay` in their `.env` and is about to build against a
 * recording while believing they are on the live feed. A value here would be
 * something a caller could ignore, and the whole purpose is that it cannot be.
 */
export class ReplayDuringSessionError extends Error {
  constructor(at: Date) {
    super(
      `A replay may not run while the market is open (${at.toISOString()}). ` +
        "ADR 0030 §7f: this guard exists so a developer cannot build against a " +
        "recording while believing they are on the live feed.",
    );
    this.name = "ReplayDuringSessionError";
  }
}

/**
 * Is the market open by our own calendar? Story 2.5's, already shipped.
 *
 * **Returns `true` if the calendar cannot answer, and that direction is the
 * decision.** `market-calendar.ts` holds a checked-in exception table covering
 * 2024–2028 and **throws outside it** — measured 2026-09-18: a probe at
 * 2029-03-01 threw _"outside the trading calendar"_. A replay still running when
 * that horizon passes must **stop** rather than keep playing, so an
 * unanswerable calendar reads as *the market is open* and the guard closes.
 *
 * The alternative is worse in both directions: letting the throw escape makes
 * an unhandled rejection in `pump()`'s async path, and defaulting to *shut*
 * would leave a replay running for ever past the last date anybody checked.
 */
const marketIsOpen = (at: Date): boolean => {
  try {
    return marketSessionStateAt(at).status === "open";
  } catch {
    return true;
  }
};

export function createReplayStream(
  options: ReplayStreamOptions,
): MarketDataStream {
  const {
    source,
    symbols,
    from,
    wallNow = () => Date.now(),
    now = () => performance.now(),
    speed = 1,
    pollMs = 1_000,
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (timer) => {
      clearTimeout(timer);
    },
    onLog = () => undefined,
  } = options;

  let connection: StreamConnection = initialStreamConnection;
  let subscriber: StreamSubscriber | undefined;
  let engine: ReplayEngine | undefined;
  let timer: NodeJS.Timeout | undefined;
  let running = false;
  /**
   * Read through a call rather than directly, because the re-check after an
   * `await` is real and narrowing hides it.
   *
   * `pump()` returns early unless `running`, which narrows it to `true` for the
   * rest of the body — so the linter calls the later check redundant. It is
   * not: `unsubscribe()` can land **during** `await engine.due()`, and a
   * `setTimer` scheduled after that would keep a stopped replay pumping for
   * ever. The indirection is what keeps the guard rather than a lint escape.
   */
  const isRunning = (): boolean => running;

  const apply = (event: StreamEvent): void => {
    connection = advanceStreamConnection(connection, event);
    subscriber?.onConnectionChange(connection);
  };

  const stamp = (presentedAt: Date): ReplayBarSourceStamp => ({
    provider: "replay",
    feed: REPLAY_FEED,
    retrievedAt: presentedAt.toISOString(),
    barCount: 1,
  });

  const stop = (): void => {
    running = false;
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
    apply({ kind: "closed", elapsedMs: 0, at: now() });
  };

  const pump = async (): Promise<void> => {
    if (!running || engine === undefined) return;

    // **Checked on EVERY pump, not only at start.** A replay that refuses to
    // start but keeps running once the bell rings is the same defect wearing a
    // different hat — the developer is still building against a recording
    // during a session, which is the one case §7f exists for.
    const at = new Date(wallNow());
    if (marketIsOpen(at)) {
      onLog({ kind: "stopped-market-opened", at: at.toISOString() });
      stop();
      return;
    }

    const due = await engine.due();
    for (const slice of due) {
      const observations: LiveObservation[] = [];
      for (const [symbol, bar] of slice.bars) {
        if (!symbols.includes(symbol)) continue;
        observations.push({
          symbol,
          // Re-stamped onto the instant it is being SHOWN at…
          bar: restamp(bar, slice.presentedAt),
          source: stamp(slice.presentedAt),
          // A recording never revises: `u` is a property of the vendor's live
          // feed (§7.8), and replaying one would be replaying a behaviour we
          // did not record rather than a number we did.
          supersedes: false,
        });
      }

      // …while the state machine is told the RECORDED instant, so staleness
      // keys on when the observation was true rather than on when we chose to
      // show it. §11.2 is explicit that it keys on the observation's own
      // timestamp, and that rule does not bend because the source is a
      // recording.
      apply({
        kind: "observations",
        observedAt: slice.occurredAt.getTime(),
        at: now(),
      });

      if (observations.length > 0) subscriber?.onObservations(observations);
    }

    // Nothing due is the normal case rather than an end: the replay clock has
    // simply not reached the next recorded minute. There is deliberately no
    // "exhausted" signal — a source with nothing left and a source whose next
    // minute has not come round are indistinguishable from here, and inventing
    // a distinction the seam cannot support is how a caller learns to trust one
    // that is not there.
    if (isRunning()) timer = setTimer(() => void pump(), pollMs);
  };

  return {
    id: "replay",
    feed: REPLAY_FEED,

    subscribe(
      _symbols: readonly Ticker[],
      target: StreamSubscriber,
    ): Unsubscribe {
      const at = new Date(wallNow());
      if (marketIsOpen(at)) {
        onLog({ kind: "refused-market-open", at: at.toISOString() });
        throw new ReplayDuringSessionError(at);
      }

      subscriber = target;
      engine = createReplayEngine({ source, from, wallNow, speed });
      running = true;
      onLog({ kind: "started", from: from.toISOString() });

      // The same handshake shape the real client reports, so a consumer written
      // against one works against the other.
      const monotonic = now();
      apply({ kind: "socket-opened", at: monotonic });
      apply({ kind: "greeted", at: monotonic });
      apply({ kind: "authenticated", at: monotonic });
      apply({
        kind: "subscription-acknowledged",
        symbolCount: symbols.length,
        at: monotonic,
      });

      timer = setTimer(() => void pump(), pollMs);

      return () => {
        stop();
        subscriber = undefined;
      };
    },

    status(inputs: FeedStatusInputs) {
      return feedStatusOf(connection, inputs);
    },

    connection() {
      return connection;
    },
  };
}

/**
 * A {@link ReplayBarSource} over an in-memory list of slices.
 *
 * **The generated case the story asks the engine to serve**, and what makes
 * every test in this file run with **no database** — which `pnpm test`
 * requires. The stored-bar source lives in `replay-bar-source.ts` and is the
 * same seam with `MarketBarsRepository.readBars` behind it.
 */
export function createMemoryReplaySource(
  slices: readonly { occurredAt: Date; bars: ReadonlyMap<Ticker, Bar> }[],
): ReplayBarSource {
  const ordered = [...slices].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );

  return {
    next(fromInstant: Date) {
      return Promise.resolve(
        ordered.find(
          (slice) => slice.occurredAt.getTime() >= fromInstant.getTime(),
        ),
      );
    },
  };
}
