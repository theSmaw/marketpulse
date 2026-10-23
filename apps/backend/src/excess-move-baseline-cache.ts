import {
  marketDateAt,
  type MarketDate,
  type Ticker,
} from "@marketpulse/shared";

import { windowEndBoundFor } from "./return-baseline-cache.js";

import type {
  ExcessBaselineStore,
  StoredExcessBaseline,
} from "./excess-move-baseline-store.js";

/**
 * **The excess-move baseline, held in memory — the FOURTH of these, and not a
 * straight copy** (Task 5.6.4, ADR 0044).
 *
 * `return-baseline-cache.ts`' shape, for its reasons: a derived aggregate that
 * changes once a night, read by a serving path that **must not `await`**
 * (`symbolReturn` runs inside the socket's own callback, where an unhandled
 * rejection is a crashed process), loaded at startup off the hot path,
 * refreshed on a **condition** rather than a schedule, and a failed refresh
 * never empties it.
 *
 * Three properties are inherited rather than re-decided, and each is that
 * module's own argument:
 *
 * - **It memoises on `observed_at` — the window end the stored rows carry** —
 *   never on the session anybody asked about, which is `last-closes-cache.ts`'
 *   recorded defect (a refresh after midnight ET records today's date against
 *   yesterday's data and can then never fire again that day). The repair
 *   applies here identically and for the identical reason: the row **is** the
 *   session it is for, so there is no second fact to keep in step.
 * - **A fifteen-minute floor**, because the repaired condition stays true while
 *   the runner has not written tonight's generation — so *any* read that does
 *   not advance the held generation starts the floor, not only a failed one.
 * - **No `status` filter**, because this is a read of something we **stored**
 *   (`UNIVERSE.md` §12.2's two sides); the store's own interface says so.
 *
 * ## What is NOT inherited: the reference is in the key
 *
 * `0016`'s key is `(security_id, observed_at, reference_kind,
 * reference_symbol)`. The held map is keyed on the **ticker** like its three
 * siblings, which is correct only because the store's read is pinned to one
 * {@link EXCESS_REFERENCE_KIND} — so one generation holds at most one row per
 * security per reference form. The other half of that protection is the
 * **reader's**: `excessMoveFactor` treats a row computed against a different
 * benchmark as **absent**, because a reader cannot act on *we hold a baseline
 * against a different benchmark* and `too-few-samples` at `sampleCount: 0`
 * already means exactly *nothing to rank against*.
 */
export interface ExcessBaselineCache {
  /**
   * The baselines to measure against, **as of a session**. Synchronous, and
   * never throws.
   *
   * `baselineAsOf`'s shape one table over, for its reason — a serving path that
   * is synchronous by design must not be handed a promise. Empty until the
   * first successful load, which is the true answer rather than a degraded one.
   *
   * Asking is also what **triggers** a refresh, so there is no second method
   * and no second caller to forget.
   */
  readonly baselineAsOf: (
    session: MarketDate,
  ) => ReadonlyMap<Ticker, StoredExcessBaseline>;

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
 * **The same fifteen minutes as the return baseline's, and the same constant's
 * argument rather than a second number**: a generation appears once a night,
 * so being at most a quarter of an hour late to notice it is not a fact any
 * reader can observe, and it bounds the whole weekend at four small reads an
 * hour. It is spelled here rather than imported because the two caches'
 * **floors** are independent policies over independent tables; if a third
 * reason to change one of them appears, they move apart.
 */
export const EXCESS_BASELINE_REFRESH_FLOOR_MS = 15 * 60_000;

export interface ExcessBaselineCacheOptions {
  readonly store: Pick<ExcessBaselineStore, "readNewestGeneration">;
  /** Wall clock, epoch milliseconds. A seam so the floor is testable. */
  readonly now?: () => number;
  readonly warn?: (fields: Record<string, unknown>, message: string) => void;
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
  rows: readonly StoredExcessBaseline[],
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

export function createExcessBaselineCache(
  options: ExcessBaselineCacheOptions,
): ExcessBaselineCache {
  const { store, now = () => Date.now(), warn = () => undefined } = options;

  let held: ReadonlyMap<Ticker, StoredExcessBaseline> = new Map();
  /**
   * **The session the held rows ARE FOR**, from their own `observed_at` — never
   * the session anybody asked about. This single line is the repair
   * `last-closes-cache.ts` records and did not take; see the header.
   */
  let heldThrough: MarketDate | undefined;
  let inFlight = false;
  /**
   * When a read last **failed to advance** the held generation — including a
   * read that succeeded and found nothing newer. See
   * {@link EXCESS_BASELINE_REFRESH_FLOOR_MS}.
   */
  let quietSince: number | undefined;

  const read = async (session: MarketDate): Promise<void> => {
    inFlight = true;
    try {
      // **`windowEndBoundFor` is imported rather than re-derived** (Task
      // 5.4.5's reason, third instance): `excess_move_baselines.observed_at` is
      // a session close exactly as `return_baselines.observed_at` is, and two
      // copies of that derivation would be two answers about a holiday, in two
      // caches whose figures are added together in one score.
      const rows = await store.readNewestGeneration(windowEndBoundFor(session));

      const next = new Map<Ticker, StoredExcessBaseline>();
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
      // that was asked about.
      quietSince =
        heldThrough !== undefined && heldThrough >= session ? undefined : now();

      if (nextThrough === undefined) {
        warn(
          { session, securities: 0 },
          "no excess-move baseline generation is stored at or before this session",
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
          since === undefined ||
          now() - since >= EXCESS_BASELINE_REFRESH_FLOOR_MS;

        if (mayRetry) {
          void read(session).catch((error: unknown) => {
            // Nothing to undo: `read` replaces the held map only after a
            // successful query.
            warn(
              { err: error, session, securities: held.size },
              "excess-move baseline refresh failed, keeping the generation we hold",
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
