import { marketDateAt } from "@marketpulse/shared";

import { windowEndBoundFor } from "./return-baseline-cache.js";

import type { MarketDate } from "@marketpulse/shared";
import type {
  SessionCompositeStore,
  StoredCompositeRanking,
} from "./session-composite-store.js";

/**
 * **The last completed session's composite ranking, held in memory** (Task
 * 5.6.6, [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)).
 *
 * `session-percentile-cache.ts`' shape, for `return-baseline-cache.ts`'
 * reasons: a derived aggregate that changes once a night, read by a path that
 * must not `await` — the overview join runs inside the socket's own callback,
 * where an unhandled rejection is a crashed process — loaded at startup off the
 * hot path, refreshed on a **condition** rather than a schedule, and a failed
 * refresh never empties it.
 *
 * ## It memoises on the SESSION THE ROWS ARE FOR
 *
 * That module's repair inherited rather than re-derived: the key is
 * `session_composite_score_passes.observed_at`, read off the row the store
 * returned, **never the session anybody asked about**. A cache keyed on the ask
 * records today's date against last Friday's figures and can then never refresh
 * again that day, which is `last-closes-cache.ts`' recorded defect.
 *
 * ## And the 15-minute floor is the same bounded poll, for the same reason
 *
 * The condition stays true while the runner has not written tonight's session,
 * so **any** read that does not advance the held session starts the floor — not
 * only a failed one. Without it the condition fires on every ask, up to ~16
 * times a minute from the burst path.
 *
 * ## What is NOT inherited: `reference_kind`'s pinning lesson, answered by the
 * ## key rather than by a `where`
 *
 * `excess-move-baseline-cache.ts` is the newest of these and carries the one
 * real trap: *a frontier or generation read that does not pin every key column
 * returns rows from a vocabulary it did not ask for, with no defined tie-break*.
 * Its table's key is `(security_id, observed_at, reference_kind,
 * reference_symbol)`, so a `max(observed_at)` taken across reference forms
 * could hand a `Map<Ticker, …>` two rows for one ticker.
 *
 * **This table's key is `(security_id, observed_at)` and has no such column**,
 * so the frontier is unambiguous — and that is a fact to be **checked rather
 * than assumed**, because the shape of the trap is *a column in the key that
 * the read does not mention*. The reads are
 * `session-composite-store.ts`' and they select on `observed_at` alone, which
 * is the whole of the key besides the security. The day this table gains a
 * policy column to the key — the obvious candidate is a **weight-set
 * identifier**, if `FACTOR_WEIGHTS`' reversal trigger ever fires and two sets
 * must coexist — that cache's pin arrives here with it, and `0017` §5 is why
 * such a column would be in the key rather than beside it.
 *
 * ## It holds the ranking, not a map
 *
 * `session-percentile-cache.ts`' shape rather than the three baseline caches':
 * the ranked surface needs **the pass's figures and every scored security at
 * once** — the footer's populations and the ten rows are one answer — and a
 * `Map<Ticker, …>` would make the pass row a second lookup that could be
 * absent while the map was full. That is the state a crashed pass leaves, and
 * the store already makes it invisible.
 *
 * ## What it does NOT do: decide which basis the screen is on
 *
 * `session-percentile-cache.ts`' own last section, unchanged. That is
 * `eligibleMoves`' answer, which is session-driven rather than data-driven
 * (Story 4.4's Gate 1 decision 3). This cache answers *what composite do we
 * hold for the last completed session*.
 *
 * ## **Nothing reads it yet, and that is honest rather than an oversight**
 *
 * Task 5.6.6 stores the composite and stops there. `index.ts` does not
 * construct this cache, `market-unusual.ts` does not read it, and no frame
 * carries it: the wire row's new shape and the session arm's ranking are Task
 * 5.6.7's, which is a browser-visible change and was deliberately not folded
 * into a migration task. The module exists now because the pass that writes the
 * rows and the reader that mints from them are one decision — *the score is
 * minted, never read* — and splitting them across two tasks is how a store
 * grows a second arithmetic.
 */
export interface SessionCompositeCache {
  /**
   * **The last completed session's composite ranking as of a session**, or
   * `undefined` where nothing is stored at or before it. Synchronous, and never
   * throws.
   *
   * `rankingAsOf`'s shape one table over, for its reason: a serving path that
   * is synchronous by design must not be handed a promise, and asking is also
   * what **triggers** a refresh, so there is no second method and no second
   * caller to forget.
   *
   * `undefined` until the first successful read finds a pass row — CI's
   * permanent state (516 securities, zero bars, no nightly runner) and every
   * store's state before the first night.
   */
  readonly rankingAsOf: (
    session: MarketDate,
  ) => StoredCompositeRanking | undefined;

  /** Read the store once, now. A startup caller calls this off the hot path. */
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
 * **Deliberately its own constant rather than `SESSION_RANKING_REFRESH_FLOOR_MS`
 * or `BASELINE_REFRESH_FLOOR_MS`.** All three are fifteen minutes for the same
 * *argument* — a nightly thing is being waited for — and they are uncoupled for
 * the reason ADR 0043 gives about two fives: these are independent policies over
 * independent tables, and this one's read is the only one whose cost is a mint
 * per row rather than a parse, so the day one of them needs a different floor it
 * must be able to have one without moving the others.
 */
export const COMPOSITE_RANKING_REFRESH_FLOOR_MS = 15 * 60_000;

export interface SessionCompositeCacheOptions {
  readonly store: Pick<SessionCompositeStore, "readNewestSession">;
  /** Wall clock, epoch milliseconds. A seam so the floor is testable. */
  readonly now?: () => number;
  readonly warn?: (fields: Record<string, unknown>, message: string) => void;
}

export function createSessionCompositeCache(
  options: SessionCompositeCacheOptions,
): SessionCompositeCache {
  const { store, now = () => Date.now(), warn = () => undefined } = options;

  let held: StoredCompositeRanking | undefined;
  /** The session the held rows ARE FOR, from the pass row's own instant. */
  let heldThrough: MarketDate | undefined;
  let inFlight = false;
  /** When a read last failed to **advance** the held session. */
  let quietSince: number | undefined;

  const read = async (session: MarketDate): Promise<void> => {
    inFlight = true;
    try {
      // **`windowEndBoundFor` is imported rather than re-derived** (Task
      // 5.4.5's reason, fourth instance): `session_composite_score_passes
      // .observed_at` is a session close exactly as `return_baselines`' is, and
      // two copies of that derivation would be two answers about a holiday.
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
          "no composite ranking is stored at or before this session",
        );
      } else if (ranking !== undefined && ranking.disagreed > 0) {
        // **A producer/reader split, logged rather than swallowed.** The store
        // drops a row whose stored score does not reproduce from its stored
        // answers; `0017` §5 is why storing both makes that detectable at all,
        // and a dropped row with no line anywhere would be a ranked list that
        // is quietly short of a security it should hold.
        warn(
          {
            session: nextThrough,
            disagreed: ranking.disagreed,
            scores: ranking.scores.length,
          },
          "stored composite scores do not reproduce from their own factor " +
            "answers — the pass that wrote them applied different weights or " +
            "different band floors from this bundle's, and those rows are " +
            "dropped rather than drawn",
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
          now() - since >= COMPOSITE_RANKING_REFRESH_FLOOR_MS;

        if (mayRetry) {
          void read(session).catch((error: unknown) => {
            // Nothing to undo: `read` replaces what is held only after a
            // successful query.
            warn(
              { err: error, session, securities: held?.scores.length ?? 0 },
              "composite ranking refresh failed, keeping the session we hold",
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
