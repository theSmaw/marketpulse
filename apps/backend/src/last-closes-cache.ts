import { marketDateAt } from "@marketpulse/shared";

import type {
  MarketDate,
  SecurityLastClose,
  Ticker,
  Timeframe,
} from "@marketpulse/shared";
import type { LastClose, MarketBarsRepository } from "./market-bars.js";

/**
 * **The denominator, held in memory** (Task 4.2.4).
 *
 * `buildMarketOverview` takes its closes as a **synchronous** lookup, and that
 * is load-bearing rather than stylistic: the overview is built inside the
 * socket's own `onObservations` callback, where an `await` holds up every
 * browser's price for the length of a 518-row database read and an unhandled
 * rejection kills the process on a liveness-probed platform. So the read
 * happens somewhere else and this object is what the callback asks.
 *
 * ## Three rules, and all three are about the process rather than the query
 *
 * 1. **Loaded at startup**, by `index.ts`, off the hot path entirely.
 * 2. **Refreshed on a condition, never on a schedule.** The condition is the
 *    first burst whose **market date** differs from the one the held map was
 *    loaded for — which is the only thing that can make these closes wrong,
 *    because the nightly backfill writes a new session and nothing else moves
 *    them. A timer would be a poll with a number nobody measured.
 * 3. **A failed refresh never empties it.** A stale-but-true denominator beats
 *    no figure: the alternative is four proxies that had a change percentage a
 *    moment ago and now do not, because a database hiccuped. The held map is
 *    replaced only by a successful read.
 *
 * ## What it deliberately does not do
 *
 * **It does not honour its `session` argument**, and that is recorded rather
 * than hidden — `docs/GAPS.md` carries it. The argument exists because Epic
 * 13's replay needs the question asked in the right shape at the right site
 * (ADR 0015's gap 4); the production answer is *the latest closes we hold*,
 * which is correct during a live session and is **future information** under a
 * replay of a past one. The day a replay drives this seam, this is the one
 * implementation that changes.
 */
export interface LastClosesCache {
  /**
   * The closes to measure against. **Synchronous, and never throws.**
   *
   * Empty until the first successful load, which is the true answer rather
   * than a degraded one: a proxy with no close renders its live price with no
   * measurable move, and one with neither renders `unknown`.
   *
   * Asking is also what **triggers** a refresh, so there is no second method
   * and no second caller to forget: see rule 2 above.
   */
  readonly closesAsOf: (
    session: MarketDate,
  ) => ReadonlyMap<Ticker, SecurityLastClose>;

  /** Read the store once, now. `index.ts` calls this at startup. */
  readonly load: (session: MarketDate) => Promise<void>;

  /** How many securities the held map covers. For a log line and for tests. */
  readonly size: () => number;
}

/**
 * `1d`, the same timeframe `GET /securities` reads its closes at.
 *
 * Spelled here rather than imported from `routes/securities.ts` because that
 * module's constant is private to a route; what matters is that both are the
 * daily bar, and a minute bar's "close" is a minute rather than a session.
 */
const CLOSE_TIMEFRAME: Timeframe = "1d";

/**
 * How long a failed refresh waits before the next burst may try again.
 *
 * **A floor rather than a poll.** Without it a store that is refusing reads
 * would be asked on every burst — up to ~16 times a minute (§9.5) — for a
 * 518-row query, which is a database under load being asked harder. A minute
 * is chosen against the thing being waited for: a new session's closes appear
 * once a night, so being a minute late to notice them is not a fact anybody
 * can observe.
 */
export const CLOSES_RETRY_INTERVAL_MS = 60_000;

export interface LastClosesCacheOptions {
  readonly bars: Pick<MarketBarsRepository, "readLastCloses">;
  /** Wall clock, epoch milliseconds. A seam so the retry floor is testable. */
  readonly now?: () => number;
  readonly warn?: (fields: Record<string, unknown>, message: string) => void;
}

/**
 * `LastClose` → `SecurityLastClose`, which is **the `observedAt` → session
 * conversion**.
 *
 * `toWireLastClose` in `routes/securities.ts` is the existing precedent and
 * this follows it rather than inventing a second one: `marketDateAt` is the
 * only module permitted to convert an instant to a market-local date, and a
 * hand-rolled offset here would be wrong twice a year for everything.
 *
 * **Two conversions of one shape is one too many, and the trigger for merging
 * them is a third.** They are not merged today because that one is a private
 * helper inside a route module and moving it is a change to a shipped HTTP
 * path this task does not otherwise touch.
 */
const toSecurityLastClose = (close: LastClose): SecurityLastClose => ({
  symbol: close.symbol,
  session: marketDateAt(close.observedAt),
  close: close.close,
  previousClose: close.previousClose,
});

export function createLastClosesCache(
  options: LastClosesCacheOptions,
): LastClosesCache {
  const { bars, now = () => Date.now(), warn = () => undefined } = options;

  let held: ReadonlyMap<Ticker, SecurityLastClose> = new Map();
  /** The session the held map was loaded **for**, not the session it holds. */
  let loadedFor: MarketDate | undefined;
  let inFlight = false;
  /**
   * When a read last **failed**, and deliberately not when one last ran.
   *
   * The floor is a backoff, not a poll interval: a successful read moves
   * `loadedFor`, which is the thing that stops the condition firing, so
   * throttling successes would only delay a genuine session change for no
   * reason. **Written that way after a test caught the other version**, in
   * which a second session arriving within a minute of startup was ignored.
   */
  let lastFailureAt: number | undefined;

  const read = async (session: MarketDate): Promise<void> => {
    inFlight = true;
    try {
      const rows = await bars.readLastCloses(CLOSE_TIMEFRAME);
      const next = new Map<Ticker, SecurityLastClose>();
      for (const [symbol, close] of rows) {
        next.set(symbol, toSecurityLastClose(close));
      }
      held = next;
      loadedFor = session;
      lastFailureAt = undefined;
    } catch (error) {
      lastFailureAt = now();
      throw error;
    } finally {
      inFlight = false;
    }
  };

  return {
    closesAsOf(session) {
      // **The condition, in one expression.** Nothing here awaits, and the
      // only way to reach the store is the `void` below — so a failure is a
      // logged warning and a map that keeps saying what it last knew.
      if (session !== loadedFor && !inFlight) {
        const since = lastFailureAt;
        const mayRetry =
          since === undefined || now() - since >= CLOSES_RETRY_INTERVAL_MS;

        if (mayRetry) {
          void read(session).catch((error: unknown) => {
            // **The held map is untouched.** `read` replaces it only after a
            // successful query, so this branch has nothing to undo.
            warn(
              { err: error, session, securities: held.size },
              "last closes refresh failed, keeping the closes we hold",
            );
          });
        }
      }

      return held;
    },

    async load(session) {
      await read(session);
    },

    size: () => held.size,
  };
}
