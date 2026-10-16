import { marketDateAt } from "@marketpulse/shared";

import { windowEndBoundFor } from "./return-baseline-cache.js";

import type { MarketDate } from "@marketpulse/shared";
import type {
  SessionPercentileStore,
  StoredSessionRanking,
} from "./session-percentile-store.js";

/**
 * **The last completed session's ranking, held in memory** (Task 5.4.5,
 * [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)).
 *
 * `return-baseline-cache.ts`' shape, for `return-baseline-cache.ts`' reasons: a
 * derived aggregate that changes once a night, read by a path that must not
 * `await` — the overview join runs inside the socket's own callback, where an
 * unhandled rejection is a crashed process — loaded at startup off the hot
 * path, refreshed on a **condition** rather than a schedule, and a failed
 * refresh never empties it.
 *
 * ## It memoises on the SESSION THE ROWS ARE FOR
 *
 * Which is that module's repair inherited rather than re-derived: the key is
 * `session_return_percentile_passes.observed_at`, read off the row the store
 * returned, never the session anybody asked about. A cache keyed on the ask
 * records today's date against last Friday's figures and can then never refresh
 * again that day, which is `last-closes-cache.ts`' recorded defect and produces
 * a well-formed, correctly-dated, **wrong** sentence — here, `Market breadth`
 * and this region disagreeing about which session the screen is describing.
 *
 * ## And the 15-minute floor is the same bounded poll, for the same reason
 *
 * The condition stays true while the runner has not written tonight's session,
 * so **any** read that does not advance the held session starts the floor — not
 * only a failed one. Without it the condition fires on every ask, up to ~16
 * times a minute from the burst path. A session ranking appears **once a
 * night**, so being at most a quarter of an hour late to notice it is not a
 * fact any reader can observe.
 *
 * ## What it does NOT do: decide which basis the screen is on
 *
 * That is `eligibleMoves`' answer, which is session-driven rather than
 * data-driven (Story 4.4's Gate 1 decision 3). This cache answers *what do we
 * hold for the last completed session*, and `market-unusual.ts` decides whether
 * the screen is on the basis that reads it. So a process holding a session
 * ranking during a live session serves the **observed** basis and this map is
 * simply not read — which is what keeps the two bases one region and never
 * both at once.
 */
export interface SessionPercentileCache {
  /**
   * **The last completed session's ranking as of a session**, or `undefined`
   * where nothing is stored at or before it. Synchronous, and never throws.
   *
   * `baselineAsOf`'s shape for `baselineAsOf`'s reason: a serving path that is
   * synchronous by design must not be handed a promise, and asking is also what
   * **triggers** a refresh, so there is no second method and no second caller
   * to forget.
   *
   * `undefined` until the first successful read finds a pass row — CI's
   * permanent state (516 securities, zero bars, no nightly runner) and every
   * store's state before the first night.
   */
  readonly rankingAsOf: (
    session: MarketDate,
  ) => StoredSessionRanking | undefined;

  /** Read the store once, now. `index.ts` calls this at startup. */
  readonly load: (session: MarketDate) => Promise<void>;

  /**
   * **The session the held rows are FOR**, read off the pass row's own
   * `observed_at`. Exposed because it is the memoisation key, and a key nothing
   * can read is a key nothing can test.
   */
  readonly heldThrough: () => MarketDate | undefined;

  /** How many scored securities the held session covers. For a log line. */
  readonly size: () => number;
}

/**
 * How long a read that did not advance the held session waits before the next
 * ask may try again.
 *
 * **Deliberately its own constant rather than `BASELINE_REFRESH_FLOOR_MS`.**
 * The two are fifteen minutes for the same *argument* — a nightly thing is
 * being waited for — and they are uncoupled for the reason ADR 0043 gives about
 * two fives: this read is a few hundred small rows and that one is 417 KB of
 * breakpoints, so the day one of them needs a different floor it must be able
 * to have one without moving the other.
 */
export const SESSION_RANKING_REFRESH_FLOOR_MS = 15 * 60_000;

export interface SessionPercentileCacheOptions {
  readonly store: Pick<SessionPercentileStore, "readNewestSession">;
  /** Wall clock, epoch milliseconds. A seam so the floor is testable. */
  readonly now?: () => number;
  readonly warn?: (fields: Record<string, unknown>, message: string) => void;
}

export function createSessionPercentileCache(
  options: SessionPercentileCacheOptions,
): SessionPercentileCache {
  const { store, now = () => Date.now(), warn = () => undefined } = options;

  let held: StoredSessionRanking | undefined;
  /** The session the held rows ARE FOR, from the pass row's own instant. */
  let heldThrough: MarketDate | undefined;
  let inFlight = false;
  /** When a read last failed to **advance** the held session. */
  let quietSince: number | undefined;

  const read = async (session: MarketDate): Promise<void> => {
    inFlight = true;
    try {
      const ranking = await store.readNewestSession(windowEndBoundFor(session));

      // `marketDateAt` is the one module permitted to convert an instant to a
      // market-local date; a hand-rolled offset here would be wrong twice a
      // year.
      const nextThrough =
        ranking === undefined
          ? undefined
          : marketDateAt(ranking.pass.observedAt);

      // **Replaced only by a read that advances.** A successful read returning
      // an older session than the one we hold is a replay bound or a store that
      // lost rows, and either way the newer answer is the one to keep.
      if (
        ranking !== undefined &&
        nextThrough !== undefined &&
        (heldThrough === undefined || nextThrough > heldThrough)
      ) {
        held = ranking;
        heldThrough = nextThrough;
      }

      quietSince =
        heldThrough !== undefined && heldThrough >= session ? undefined : now();

      if (nextThrough === undefined) {
        warn(
          { session, securities: 0 },
          "no session ranking is stored at or before this session",
        );
      }
    } catch (error) {
      quietSince = now();
      throw error;
    } finally {
      inFlight = false;
    }
  };

  return {
    rankingAsOf(session) {
      if ((heldThrough === undefined || session > heldThrough) && !inFlight) {
        const since = quietSince;
        const mayRetry =
          since === undefined ||
          now() - since >= SESSION_RANKING_REFRESH_FLOOR_MS;

        if (mayRetry) {
          void read(session).catch((error: unknown) => {
            // Nothing to undo: `read` replaces what is held only after a
            // successful query.
            warn(
              { err: error, session, securities: held?.scores.length ?? 0 },
              "session ranking refresh failed, keeping the session we hold",
            );
          });
        }
      }

      return held;
    },

    async load(session) {
      await read(session);
    },

    heldThrough: () => heldThrough,
    size: () => held?.scores.length ?? 0,
  };
}
