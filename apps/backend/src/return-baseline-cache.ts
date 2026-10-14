import {
  marketDateAt,
  marketSessionOn,
  previousMarketSession,
  type MarketDate,
  type Ticker,
} from "@marketpulse/shared";

import type {
  ReturnBaselineStore,
  StoredReturnBaseline,
} from "./return-baseline-store.js";

/**
 * **The baseline, held in memory — and the one place `last-closes-cache.ts`'
 * recorded defect is repaired rather than copied** (Task 5.3.2, ADR 0044).
 *
 * The shape is that module's, for its reasons: a derived aggregate that changes
 * once a night, read by a serving path that must not `await`, loaded at startup
 * off the hot path, refreshed on a **condition** rather than a schedule, and a
 * failed refresh never empties it.
 *
 * ## The defect, and the one line that repairs it
 *
 * `last-closes-cache.ts` memoises on **`loadedFor` — the session it was ASKED
 * ABOUT**, not the session the data it got back belongs to. Its own docblock
 * records the consequence: a refresh that runs after midnight ET and before the
 * nightly fill reads yesterday's closes, **records today's date against them,
 * and can never fire again that day**, because `session !== loadedFor` is false
 * for the rest of it. The symptom is a well-formed, correctly-coloured, wrong
 * number.
 *
 * **This cache memoises on `observed_at` — the window end the stored row itself
 * carries.** The repair is free, and it is the persisted table that makes it
 * free: the row **is** the session it is for, so there is no second fact to keep
 * in step. Asked about a session the newest stored generation does not reach,
 * the condition goes on being true and the cache goes on trying, which is the
 * opposite behaviour from the precedent and is the whole point.
 *
 * That module had a reason for not repairing it in place, and the reason is
 * worth keeping because it says why this one could: *the only correct condition
 * is `the newest close we hold is older than the newest close that should
 * exist`, and the right-hand side is a calendar question this module would have
 * to answer.* Here the left-hand side is stored and the right-hand side is the
 * argument — a `MarketDate` the caller already holds — so the comparison is two
 * values the cache was handed.
 *
 * ## Which makes the condition a BOUNDED poll, deliberately, and the floor is
 * ## fifteen minutes rather than one
 *
 * The cost of the repair is the shape of its failure: when the runner has not
 * written tonight's generation, `session > heldThrough` stays true, so without a
 * floor the condition fires on every ask — up to ~16 times a minute from the
 * burst path — for a few-hundred-row read carrying 417 KB of breakpoints.
 *
 * So **any** read that does not advance the held generation starts the floor,
 * not only a failed one. That is the second difference from the precedent,
 * whose floor is a backoff on failure alone — correct there, because a
 * successful read always moved `loadedFor`. Fifteen minutes is chosen against
 * the thing being waited for: a baseline appears **once a night**, so being at
 * most a quarter of an hour late to notice it is not a fact any reader can
 * observe, and it bounds the whole weekend at four small reads an hour.
 *
 * ## It is a read of something we STORED, so it does not filter on `status`
 *
 * `UNIVERSE.md` §12.2's two sides: `activeSubjects` filters, because computing
 * a baseline over the market we track **now** should not spend a 538-block read
 * on an untracked symbol. This read does not, because a security untracked last
 * week still has a baseline that was true when it was computed.
 */
export interface ReturnBaselineCache {
  /**
   * The baselines to measure against, **as of a session**. Synchronous, and
   * never throws.
   *
   * `closesAsOf`'s shape, for `closesAsOf`'s reason — a serving path that is
   * synchronous by design must not be handed a promise — and with the one
   * behavioural difference this module exists for: the argument is **honoured**
   * rather than recorded. Under a replay, Epic 13's plugin additionally narrows
   * `observed_at` inside the store's own query, so the production expression
   * and the replayed one are one code path.
   *
   * Empty until the first successful load, which is the true answer rather than
   * a degraded one: a security with no baseline has no percentile, and *not
   * enough evidence* is a first-class outcome.
   *
   * Asking is also what **triggers** a refresh, so there is no second method
   * and no second caller to forget.
   */
  readonly baselineAsOf: (
    session: MarketDate,
  ) => ReadonlyMap<Ticker, StoredReturnBaseline>;

  /** Read the store once, now. `index.ts` calls this at startup. */
  readonly load: (session: MarketDate) => Promise<void>;

  /** How many securities the held generation covers. For a log line and tests. */
  readonly size: () => number;

  /**
   * **The session the held rows are FOR**, read off their own `observed_at`.
   *
   * Exposed because it is the memoisation key, and a key nothing can read is a
   * key nothing can test. `undefined` before the first successful load, and
   * `undefined` after a successful load that found no generation at all —
   * which is CI's permanent state.
   */
  readonly heldThrough: () => MarketDate | undefined;
}

/**
 * How long a read that did not advance the held generation waits before the
 * next ask may try again.
 *
 * See the header: a **floor** rather than a poll interval, and fifteen minutes
 * rather than the precedent's one, because the condition this cache uses stays
 * true while it waits.
 */
export const BASELINE_REFRESH_FLOOR_MS = 15 * 60_000;

export interface ReturnBaselineCacheOptions {
  readonly store: Pick<ReturnBaselineStore, "readNewestGeneration">;
  /** Wall clock, epoch milliseconds. A seam so the floor is testable. */
  readonly now?: () => number;
  readonly warn?: (fields: Record<string, unknown>, message: string) => void;
}

/**
 * The instant a generation for this session would be stamped with — the
 * session's close.
 *
 * **Through the calendar rather than by arithmetic on the date string.** A
 * `MarketDate` that is a weekend or a holiday has no session of its own, and
 * the honest bound for it is the previous session's close: the newest
 * generation whose window had already ended by then. `previousMarketSession`
 * answers that, and both halves refuse outside the checked-in calendar range
 * rather than guessing.
 */
function windowEndBoundFor(session: MarketDate): Date {
  return (marketSessionOn(session) ?? previousMarketSession(session)).close;
}

/**
 * The session the newest row in a generation is for, or `undefined` for none.
 *
 * Every row of one generation shares an `observed_at` by construction — that is
 * what `readNewestGeneration` selects on — but the maximum is taken rather than
 * the first row's, so a future read that widened would not silently key on
 * whichever row arrived first.
 */
function heldSessionIn(
  rows: readonly StoredReturnBaseline[],
): MarketDate | undefined {
  let newest: Date | undefined;
  for (const row of rows) {
    if (newest === undefined || row.observedAt > newest)
      newest = row.observedAt;
  }
  // `marketDateAt` is the only module permitted to convert an instant to a
  // market-local date; a hand-rolled offset here would be wrong twice a year.
  return newest === undefined ? undefined : marketDateAt(newest);
}

export function createReturnBaselineCache(
  options: ReturnBaselineCacheOptions,
): ReturnBaselineCache {
  const { store, now = () => Date.now(), warn = () => undefined } = options;

  let held: ReadonlyMap<Ticker, StoredReturnBaseline> = new Map();
  /**
   * **The session the held rows ARE FOR**, from their own `observed_at` — never
   * the session anybody asked about. This single line is the repair; see the
   * header.
   */
  let heldThrough: MarketDate | undefined;
  let inFlight = false;
  /**
   * When a read last **failed to advance** the held generation — including a
   * read that succeeded and found nothing newer. See
   * {@link BASELINE_REFRESH_FLOOR_MS}.
   */
  let quietSince: number | undefined;

  const read = async (session: MarketDate): Promise<void> => {
    inFlight = true;
    try {
      const rows = await store.readNewestGeneration(windowEndBoundFor(session));

      const next = new Map<Ticker, StoredReturnBaseline>();
      for (const row of rows) next.set(row.symbol, row);

      const nextThrough = heldSessionIn(rows);

      // **The held map is replaced only by a successful read**, and a
      // successful read that found an older generation than the one we hold is
      // not an advance — it is a replay bound, or a store that lost rows, and
      // either way the newer answer is the one to keep.
      if (
        nextThrough !== undefined &&
        (heldThrough === undefined || nextThrough > heldThrough)
      ) {
        held = next;
        heldThrough = nextThrough;
      }

      // **The condition stays true while the runner has not written tonight's
      // generation, so a success that did not satisfy the ask starts the floor
      // too.** Cleared only when the held generation now reaches the session
      // that was asked about, which is the only state in which the condition is
      // false and the floor is therefore unnecessary.
      quietSince =
        heldThrough !== undefined && heldThrough >= session ? undefined : now();

      if (nextThrough === undefined) {
        warn(
          { session, securities: 0 },
          "no return baseline generation is stored at or before this session",
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
    baselineAsOf(session) {
      // **The condition, in one expression, and it reads the session the ROWS
      // carry.** Nothing here awaits; the only way to reach the store is the
      // `void` below, so a failure is a logged warning and a map that keeps
      // saying what it last knew.
      if ((heldThrough === undefined || session > heldThrough) && !inFlight) {
        const since = quietSince;
        const mayRetry =
          since === undefined || now() - since >= BASELINE_REFRESH_FLOOR_MS;

        if (mayRetry) {
          void read(session).catch((error: unknown) => {
            // Nothing to undo: `read` replaces the held map only after a
            // successful query.
            warn(
              { err: error, session, securities: held.size },
              "return baseline refresh failed, keeping the generation we hold",
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
    heldThrough: () => heldThrough,
  };
}
