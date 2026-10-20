import { marketDateAt } from "@marketpulse/shared";

// **The floor and the window bound are READ from the return baseline's cache
// rather than spelled again.** The two caches poll for the same thing —
// tonight's nightly pass, which writes both tables in one run — so two floors
// a deploy apart would be two answers to *how late may we be to notice a
// generation*, and two window bounds would be two answers about a holiday.
import {
  BASELINE_REFRESH_FLOOR_MS,
  windowEndBoundFor,
} from "./return-baseline-cache.js";

import type { MarketDate, Ticker } from "@marketpulse/shared";
import type {
  StoredVolumeBaseline,
  VolumeBaselineStore,
} from "./volume-baseline-store.js";

/**
 * **The volume baseline, held in memory** (Task 5.5.4,
 * [ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)).
 *
 * `return-baseline-cache.ts`' shape, for `return-baseline-cache.ts`' reasons: a
 * derived aggregate that changes once a night, read by a path that must not
 * `await` — `symbolReturn` runs inside the socket's own callback, where an
 * unhandled rejection is a crashed process — loaded at startup off the hot
 * path, refreshed on a **condition** rather than a schedule, and a failed
 * refresh never empties it.
 *
 * It memoises on the session the **rows** are for, read off their own
 * `observed_at`, which is that module's repair inherited rather than
 * re-derived: a cache keyed on the session anybody **asked** about records
 * today's date against last night's figures and can then never refresh again
 * that day, which is `last-closes-cache.ts`' recorded defect. And the
 * fifteen-minute floor is the same bounded poll, because the condition stays
 * true while the runner has not written tonight's generation — without it the
 * ask fires up to ~16 times a minute from the burst path.
 *
 * ## The third instance, and what would make it the last
 *
 * This is the **third** module with this shape (`return-baseline-cache.ts`,
 * `session-percentile-cache.ts`, this). It is copied rather than extracted
 * because the three differ in their row type and in nothing else, and a
 * generic `createGenerationCache<T>` would be a refactor of two shipped,
 * working caches to save a third copy of forty lines of logic — which is a
 * change to a hot path bought with no measured problem.
 *
 * **Reversal trigger, a condition:** the **fourth** generation cache, or the
 * first defect found in one of these three that has to be repaired in all of
 * them. Either makes the copy the expensive option, and until then the
 * duplication is three files that can be read on their own.
 *
 * ## What is empty here is not degraded
 *
 * A security with no `iex` bar in the window gets **no row** (`0015` §5), so
 * on every laptop and every CI run this map is empty for ever and every reader
 * is told `no-same-tape-baseline`. That is Gate 1 decision 1's accepted
 * outcome rather than a fault, and it is why the warning below says *stored*
 * rather than *failed*.
 */
export interface VolumeBaselineCache {
  /**
   * The baselines to divide by, **as of a session**. Synchronous, and never
   * throws.
   *
   * Asking is also what **triggers** a refresh, so there is no second method
   * and no second caller to forget. Empty until the first successful load,
   * which is the true answer rather than a degraded one.
   */
  readonly baselineAsOf: (
    session: MarketDate,
  ) => ReadonlyMap<Ticker, StoredVolumeBaseline>;

  /** Read the store once, now. `index.ts` calls this at startup. */
  readonly load: (session: MarketDate) => Promise<void>;

  /** How many securities the held generation covers. For a log line and tests. */
  readonly size: () => number;

  /**
   * **The session the held rows are FOR**, read off their own `observed_at`.
   *
   * `undefined` before the first successful load, and `undefined` after a
   * successful load that found no generation at all — which is every machine
   * without a provider, permanently.
   */
  readonly heldThrough: () => MarketDate | undefined;
}

export interface VolumeBaselineCacheOptions {
  readonly store: Pick<VolumeBaselineStore, "readNewestGeneration">;
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
  rows: readonly StoredVolumeBaseline[],
): MarketDate | undefined {
  let newest: Date | undefined;
  for (const row of rows) {
    if (newest === undefined || row.observedAt > newest) {
      newest = row.observedAt;
    }
  }
  // `marketDateAt` is the only module permitted to convert an instant to a
  // market-local date; a hand-rolled offset here would be wrong twice a year.
  return newest === undefined ? undefined : marketDateAt(newest);
}

export function createVolumeBaselineCache(
  options: VolumeBaselineCacheOptions,
): VolumeBaselineCache {
  const { store, now = () => Date.now(), warn = () => undefined } = options;

  let held: ReadonlyMap<Ticker, StoredVolumeBaseline> = new Map();
  /** The session the held rows ARE FOR — never the session anybody asked about. */
  let heldThrough: MarketDate | undefined;
  let inFlight = false;
  /** When a read last failed to **advance** the held generation. */
  let quietSince: number | undefined;

  const read = async (session: MarketDate): Promise<void> => {
    inFlight = true;
    try {
      const rows = await store.readNewestGeneration(windowEndBoundFor(session));

      const next = new Map<Ticker, StoredVolumeBaseline>();
      for (const row of rows) next.set(row.symbol, row);

      const nextThrough = heldSessionIn(rows);

      // **The held map is replaced only by a successful read**, and a read
      // that found an older generation than the one we hold is not an advance.
      if (
        nextThrough !== undefined &&
        (heldThrough === undefined || nextThrough > heldThrough)
      ) {
        held = next;
        heldThrough = nextThrough;
      }

      quietSince =
        heldThrough !== undefined && heldThrough >= session ? undefined : now();

      if (nextThrough === undefined) {
        warn(
          { session, securities: 0 },
          "no volume baseline generation is stored at or before this session",
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
              "volume baseline refresh failed, keeping the generation we hold",
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
