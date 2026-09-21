import { marketDateAt, marketSessionOn } from "@marketpulse/shared";
import type { Ticker } from "@marketpulse/shared";

import { createAlpacaStream } from "./alpaca-stream.js";
import { trackedTickers } from "./universe.js";
import type { Config, MarketDataProviderSelection } from "./config.js";
import { createFixtureStream } from "./fixture-stream.js";
import type { MarketDataStream } from "./market-data-stream.js";
import { createStoredReplaySource } from "./replay-bar-source.js";
import type { MarketBarsRepository } from "./market-bars.js";
import { createReplayStream } from "./replay-stream.js";

/**
 * The live stream the configuration selects, or `undefined` when it selects
 * none (Task 3.2.9).
 *
 * ## Why this file exists at all
 *
 * Story 3.2 built three implementations of {@link MarketDataStream} and, until
 * this task, **constructed none of them**. Every one was tested, every guard was
 * proven with a `pnpm break`, and `pnpm verify` was green throughout — because
 * *an interface with no construction site* is not a shape any test can fail on.
 * It took a grep for a call site to find.
 *
 * ## The `switch` is exhaustive against {@link MarketDataProviderSelection}
 *
 * The same mechanism `createMarketDataProvider` uses one layer over, and for the
 * same reason: **a provider id added without a stream fails the build here**,
 * naming this function, rather than shipping a configuration value an operator
 * can set and nothing can honour. That check has now fired three times in this
 * repository's life and it has been right every time.
 *
 * ## What a failure to start does, and the two answers differ ON PURPOSE
 *
 * This is the decision this file is most likely to be read for:
 *
 * - **A replay refused during a session THROWS**, and the process does not
 *   start. `ReplayDuringSessionError` is deliberate (ADR 0030 §7f): the case it
 *   catches is a developer who left `MARKET_DATA_PROVIDER=replay` in their
 *   `.env` and is about to build against a recording while believing they are
 *   on the live feed. **Failing visibly is the entire point** — a replay that
 *   quietly did not start would leave them in exactly that state.
 * - **An Alpaca socket that cannot connect or authenticate does NOT throw**, and
 *   the process starts anyway. `LIVE-DATA.md` §8.4 measured that a refused
 *   socket **stays open** and that every error is a **frame** rather than a
 *   closure, and §8.2 that `406 connection limit exceeded` is *wait and retry* —
 *   it happens on **every deploy** by design, because a rolling replacement has
 *   two processes alive and the arriving one is us. **A process that exited on a
 *   refused socket would fail to start on every deploy**, and `deploy.yml`
 *   already fails a rollout whose container restarted, so it would turn a
 *   routine overlap into a failed release.
 *
 * The asymmetry reads oddly until you say what each protects: the first protects
 * a **developer from being misled**, the second protects a **deployment from a
 * condition that is normal**. Neither is a preference.
 */

/**
 * **The tracked universe, `active` only** — 518 securities since Task 3.5.3.
 *
 * It was five hard-coded liquid names until then, chosen so a developer
 * watching `pnpm dev` saw something move; §7.6 measured IEX covering 65.1% of
 * minutes for a median symbol and **2.1% for `ERIE`**, so a thin name looks
 * broken while working perfectly. That comment also predicted this change
 * exactly: §10.2 settled that the upstream set is a **constant**, so scaling it
 * is *changing this array rather than designing a protocol*.
 *
 * **Capacity is not the risk and that was measured** — §4.3: 1,500 symbols
 * accepted in **305 ms**, 5,000 in 867 ms, because minute-bar channels are
 * exempt from the 30-symbol cap that applies to trades and quotes.
 *
 * **`status` is filtered through one definition** ({@link trackedTickers}),
 * which is also what the current market state reads. `UNIVERSE.md` §12.2: one
 * invisible predicate is a design, two is a bug waiting for whoever forgets.
 *
 * Deriving it from the universe is also what makes *a symbol outside the
 * universe cannot reach the subscribe frame* true by **construction** rather
 * than by a check — §4.4 measured that Alpaca **silently accepts** a symbol
 * that does not exist and echoes it back as held, so the vendor will never tell
 * us.
 */
export const STREAM_SYMBOLS: readonly Ticker[] = trackedTickers();

export interface MarketStreamDependencies {
  /** Needed only by the replay, and only then read. */
  readonly bars: MarketBarsRepository;
  /** Where a replay starts in the recording. */
  readonly replayFrom?: Date;
  /**
   * Wall clock, injected.
   *
   * **Added because a test caught this module reading one implicitly**, which
   * made whether it threw depend on what time the suite ran. Every other module
   * in this story already takes its clock as an argument, and this was the one
   * that did not — so a test of *the replay refuses during a session* passed
   * outside market hours and failed inside them, for reasons having nothing to
   * do with the code under test.
   */
  readonly wallNow?: () => number;
  /**
   * The timer both self-driving streams arm, injected.
   *
   * **A test seam in the same place as `replayFrom` and `wallNow`, and for the
   * same reason**: Task 3.4.3's missing assertion is *a stream left alone in a
   * process produces an observation*, and a test that had to wait a real minute
   * for the fixture — or a real second for the replay — would either be slow or
   * be a race. It is read by the `fixture` and `replay` branches and by nothing
   * in production, where the default is the platform's own.
   */
  readonly timers?: {
    readonly setTimer: (fn: () => void, ms: number) => NodeJS.Timeout;
    readonly clearTimer: (timer: NodeJS.Timeout) => void;
  };
}

export function createMarketStream(
  config: Config,
  dependencies: MarketStreamDependencies,
): MarketDataStream | undefined {
  const selection: MarketDataProviderSelection = config.marketDataProvider;

  switch (selection) {
    case "none":
      // **The default, and it serves nothing.** `PROVIDER.md` §5.3: invented
      // prices must never be reachable by forgetting to configure something,
      // and `pnpm break market-data-default-is-none` proves the default holds.
      return undefined;

    case "fixture":
      // Generated, `synthetic`, no credential and no database. `config.ts` has
      // already refused this selection unless `NON_LIVE_MARKET_DATA=permitted`
      // was granted by name.
      return createFixtureStream({
        symbols: STREAM_SYMBOLS,
        ...(dependencies.timers ?? {}),
      });

    case "replay": {
      // Real stored bars, re-stamped onto the wall clock. Refuses to start —
      // by throwing — while the market is open.
      const from =
        dependencies.replayFrom ??
        defaultReplayStart(new Date(dependencies.wallNow?.() ?? Date.now()));
      return createReplayStream({
        source: createStoredReplaySource({
          repository: dependencies.bars,
          symbols: STREAM_SYMBOLS,
          until: new Date(from.getTime() + 6.5 * 60 * 60 * 1000),
        }),
        symbols: STREAM_SYMBOLS,
        from,
        ...(dependencies.wallNow === undefined
          ? {}
          : { wallNow: dependencies.wallNow }),
        ...(dependencies.timers ?? {}),
      });
    }

    case "alpaca": {
      // **The throw is unreachable from a started process**, for
      // `createMarketDataProvider`'s reason: `config.ts` refuses at startup when
      // `MARKET_DATA_PROVIDER=alpaca` and the credential pair is not set, so
      // reaching this line means the configuration said one thing and the object
      // handed here says another — a fact about our code rather than the world,
      // which is `PROVIDER.md` §8.5's line for when a throw is correct.
      if (config.alpaca === undefined) {
        throw new Error(
          "MARKET_DATA_PROVIDER is alpaca but no Alpaca credential reached " +
            "createMarketStream. config.ts refuses that combination at startup, " +
            "so this is a caller that read the selection without the credential " +
            "beside it.",
        );
      }
      return createAlpacaStream({
        keyId: config.alpaca.keyId,
        secretKey: config.alpaca.secretKey,
        symbols: STREAM_SYMBOLS,
      });
    }

    default: {
      const unhandled: never = selection satisfies never;
      return unhandled;
    }
  }
}

/**
 * Where a replay starts when nothing says otherwise: **the most recent session
 * whose bars we are confident we hold**.
 *
 * Seven days back rather than "yesterday", because a Monday's yesterday is a
 * Sunday and a replay of a weekend is an empty one. A week is far enough back
 * that the nightly backfill has certainly run and near enough that the bars are
 * recognisable — then it walks back to a session the market actually held and
 * returns **that session's own open instant**.
 *
 * ## It returns `session.open` rather than a UTC 13:30, and that is the repair
 *
 * Task 3.4.2 added the calendar walk and Task 3.4.3 found it **still landed on
 * a Saturday**, because the walk validated one date and stamped another: it
 * asked `marketSessionOn(marketDateAt(day))` — the candidate's **market** date
 * — and then built the instant from the candidate's **UTC** calendar fields.
 * Those agree at midday and disagree before about 04:00 UTC, which is where the
 * default resolved on 2026-09-20 at 03:36 UTC: the market date read Friday
 * 2026-09-11 and the instant read **Saturday 2026-09-12T13:30Z**, a day the
 * store holds nothing for.
 *
 * **Reading a session's own `open` closes the whole class**, and a second bug
 * with it: `13:30Z` is 09:30 **EDT** only, so every replay defaulted between
 * November and March would have started an hour before the bell. The calendar
 * already knows both, and now nothing here converts anything.
 */
/** Exported for its test: the calendar walk is the part worth asserting. */
export const defaultReplayStartForTest = (now: Date): Date =>
  defaultReplayStart(now);

function defaultReplayStart(now: Date): Date {
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Ten days covers any run of holidays this calendar contains. Outside its
  // 2024-2028 range `marketSessionOn` has no answer at all, which is a loud
  // failure rather than a quiet one: a replay is a developer instrument, and
  // ADR 0030 §7f's line is that failing visibly is the entire point.
  for (let back = 0; back < 10; back += 1) {
    const day = new Date(week.getTime() - back * 24 * 60 * 60 * 1000);

    const session = marketSessionOn(marketDateAt(day));
    if (session !== undefined) return session.open;
  }

  throw new Error(
    `No trading session in the ten days before ${week.toISOString()}. ` +
      "A replay has no honest place to start, and starting somewhere anyway " +
      "is how a replay reports `live` while emitting nothing.",
  );
}
