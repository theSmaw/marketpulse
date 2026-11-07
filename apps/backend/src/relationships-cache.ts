import { marketDateAt } from "@marketpulse/shared";
import type { MarketDate } from "@marketpulse/shared";

import type {
  ReturnCorrelationStore,
  StoredCorrelationGeneration,
} from "./return-correlation-store.js";

/**
 * **The newest correlation generation, held in memory** (Task 6.5.2, ADR
 * 0044).
 *
 * `return-baseline-cache.ts`' shape, fifth instance of the family, for its
 * reasons: a derived aggregate that changes **once a night**, read by a path
 * that would otherwise re-read 1,860 joined rows per page load, memoised on
 * **the session the stored rows are FOR** rather than on the session anybody
 * asked about, and refreshed on a **condition** rather than a schedule.
 *
 * ## It memoises on `observed_at`, which is `last-closes-cache.ts`' repaired
 * ## defect and the one line that matters
 *
 * That module keys on `loadedFor` — *the session it was asked about* — so a
 * refresh that runs after midnight ET and before the nightly pass records
 * **today's** date against **yesterday's** data and can never fire again that
 * day. `return-baseline-cache.ts` repaired it by keying on the window end the
 * stored row itself carries, and this does the same: the pass row **is** the
 * session it is for, so there is no second fact to keep in step. Asked about a
 * session the newest stored generation does not reach, the condition goes on
 * being true and the cache goes on trying.
 *
 * ## Two things it does differently from its four siblings, both because it
 * ## serves a ROUTE rather than a socket callback
 *
 * **1. It is awaited.** `baselineAsOf` is synchronous and fire-and-forget
 * because it is called from inside the market socket's own callback, which must
 * not `await` — so its first caller is answered with an empty map and the real
 * answer arrives a frame later. A route has no such constraint and the
 * opposite obligation: a browser asking for the market's relationships must be
 * answered with them, not with an empty body it has no way to re-ask for.
 * So the first read is awaited, and concurrent callers share one in-flight
 * promise rather than issuing one query each.
 *
 * **1b. Which is why the refresh floor is NOT armed by a failure that has
 * nothing held behind it** (Task 6.5.4, found by this story's own Gate 2).
 * The floor is `return-baseline-cache.ts`' mechanism and it was copied with
 * the same two lines; the two shapes do not compose, because that cache
 * **swallows** a failure and this one **throws** one. Armed on the first read
 * of a fresh or restarted replica whose database is unreachable, the floor
 * made the next fifteen minutes of asks skip the store entirely and resolve —
 * with `undefined`, because nothing is held — which the route turns into a
 * **200 carrying no `pass`** and the frontend draws as *which securities move
 * together has not been measured here*. That is a claim about data made
 * without data, which is the one thing ADR 0029's first rule forbids, and it
 * is the opposite of the sentence the whole of point 2 below exists to
 * produce. So the floor is armed on a failure only once a generation has been
 * held: there is then something true and stale to serve from behind it, and
 * the rate limit costs a reader nothing. Before that, every ask re-reads and
 * every ask fails — the honest price of having nothing to say, and bounded by
 * the database being down anyway.
 *
 * **2. A failed read THROWS rather than being swallowed.** The sibling caches
 * log a warning and keep what they hold, because the alternative on a socket
 * path is an unhandled rejection and a crashed process. Here the caller is
 * `routes/market-data.ts`, which wraps it in `throughDatabase` and answers
 * **503** — a failure a reader can see and this product's own degrade-locally
 * rule applied honestly, rather than a well-formed body claiming there are no
 * relationships when the truth is that we could not read them. The frontend's
 * own account of that state is the one sentence this story adds to the drawn
 * graph's text equivalent.
 *
 * ## It holds ONE generation, which is a bound rather than an omission
 *
 * Every reader of this table today asks for *the newest pass at or before
 * now*, and there is exactly one of those. A request carrying an explicit
 * **historical** `asOf` — which nothing sends yet, and which exists so Epic
 * 13's replay has somewhere to land — therefore **bypasses the cache
 * entirely**: the generation we hold is too new to answer it, and holding a
 * second entry keyed on an arbitrary instant would be a cache whose size is a
 * function of how many distinct instants somebody asks about.
 */
export interface RelationshipsCache {
  /**
   * The newest generation at or before an instant, or `undefined` where no
   * pass has run at or before it — CI's permanent state.
   *
   * The bound is an **argument rather than a clock**, which is
   * `baselineAsOf`'s shape and the discipline `buildTopologyGraph`'s own Epic
   * 13 hand-off asks for: under a replay the plugin additionally narrows
   * `observed_at` inside the store's query, so the production expression and
   * the replayed one are one code path.
   */
  readonly generationAsOf: (
    atOrBefore: Date,
  ) => Promise<StoredCorrelationGeneration | undefined>;

  /**
   * **The session the held generation is FOR**, read off its own pass row.
   *
   * Exposed because it is the memoisation key, and a key nothing can read is a
   * key nothing can test. `undefined` before the first successful read, and
   * `undefined` after a successful read that found no generation at all.
   */
  readonly heldThrough: () => MarketDate | undefined;

  /** How many pairs the held generation carries. For a log line and tests. */
  readonly size: () => number;
}

/**
 * How long a read that did not advance the held generation waits before the
 * next ask may try again.
 *
 * `BASELINE_REFRESH_FLOOR_MS`' figure and its argument: a **floor** rather
 * than a poll interval, because the condition this cache uses stays true while
 * it waits — a store with no generation for tonight would otherwise be
 * re-queried on every page load for the whole of a weekend. Fifteen minutes is
 * chosen against the thing being waited for: a generation appears once a
 * night, so being at most a quarter of an hour late to notice it is not a fact
 * any reader can observe.
 */
export const RELATIONSHIPS_REFRESH_FLOOR_MS = 15 * 60_000;

export interface RelationshipsCacheOptions {
  readonly store: Pick<ReturnCorrelationStore, "readNewestGeneration">;
  /** Wall clock, epoch milliseconds. A seam so the floor is testable. */
  readonly now?: () => number;
}

export function createRelationshipsCache(
  options: RelationshipsCacheOptions,
): RelationshipsCache {
  const { store, now = () => Date.now() } = options;

  let held: StoredCorrelationGeneration | undefined;
  /**
   * **The session the held generation IS FOR**, from its own pass row — never
   * the session anybody asked about. See the header.
   */
  let heldThrough: MarketDate | undefined;
  let inFlight: Promise<void> | null = null;
  /**
   * When a read last **failed to advance** the held generation, including a
   * read that succeeded and found nothing newer — and, where it threw,
   * **only once a generation has been held**. See
   * {@link RELATIONSHIPS_REFRESH_FLOOR_MS} and the header's point 1b.
   */
  let quietSince: number | undefined;

  /** What we hold, if it is old enough to answer this bound. */
  const servable = (
    atOrBefore: Date,
  ): StoredCorrelationGeneration | undefined =>
    held !== undefined && held.pass.observedAt <= atOrBefore ? held : undefined;

  const read = async (session: MarketDate, atOrBefore: Date): Promise<void> => {
    try {
      const generation = await store.readNewestGeneration(atOrBefore);

      const nextThrough =
        generation === undefined
          ? undefined
          : // `marketDateAt` is the only module permitted to convert an
            // instant to a market-local date; a hand-rolled offset here would
            // be wrong twice a year.
            marketDateAt(generation.pass.observedAt);

      // **The held generation is replaced only by a successful read that
      // ADVANCES it.** A read that found an older generation than the one we
      // hold is a replay bound or a store that lost rows, and either way the
      // newer answer is the one to keep.
      if (
        generation !== undefined &&
        nextThrough !== undefined &&
        (heldThrough === undefined || nextThrough > heldThrough)
      ) {
        held = generation;
        heldThrough = nextThrough;
      }

      // **The condition stays true while the nightly runner has not written
      // tonight's generation, so a success that did not satisfy the ask starts
      // the floor too** — `return-baseline-cache.ts`' own second difference
      // from its own precedent, kept here for the same reason.
      quietSince =
        heldThrough !== undefined && heldThrough >= session ? undefined : now();
    } catch (error) {
      // **The floor is armed only where there is something to serve from
      // behind it** — see the header's point 1b. `held !== undefined` rather
      // than *a read has succeeded*: what the floor costs is not the query, it
      // is the answer the next ask gets while the floor is closed, and that
      // answer is honest exactly when there is a generation to serve. A store
      // that has never run the pass is in this branch too (its successful
      // reads find nothing, so nothing is held) and it is the case that
      // matters: on CI, and on a laptop before the first `pnpm baselines`,
      // *never measured* and *could not be read* are told apart by whether
      // this read threw, and a floor that converted the second into the first
      // would delete the distinction for a quarter of an hour at a time.
      if (held !== undefined) quietSince = now();
      throw error;
    }
  };

  return {
    async generationAsOf(atOrBefore) {
      const session = marketDateAt(atOrBefore);

      // **A bound the held generation is too NEW for bypasses the cache** —
      // see the header's own note. Nothing sends one today; the branch exists
      // so that the day something does, it is answered correctly rather than
      // with a generation from after the instant it asked about, which is
      // exactly the shape invariant 4 exists to make impossible.
      if (held !== undefined && held.pass.observedAt > atOrBefore) {
        return store.readNewestGeneration(atOrBefore);
      }

      const satisfied = heldThrough !== undefined && heldThrough >= session;

      if (!satisfied) {
        if (inFlight !== null) {
          // One query for however many callers arrive while it is open. A
          // rejection reaches every one of them, which is correct: they all
          // asked the same question and it all failed for the same reason.
          await inFlight;
          return servable(atOrBefore);
        }

        const since = quietSince;
        const mayRetry =
          since === undefined ||
          now() - since >= RELATIONSHIPS_REFRESH_FLOOR_MS;

        if (mayRetry) {
          inFlight = read(session, atOrBefore).finally(() => {
            inFlight = null;
          });

          await inFlight;
        }
      }

      return servable(atOrBefore);
    },

    heldThrough: () => heldThrough,
    // A ternary rather than `held?.correlations.length ?? 0`: that shape is
    // one of `no-imputed-zero-in-a-figure`'s three exempt cardinalities and
    // would pass, but a reader of this line should not have to know which
    // exemption it is standing on. No generation held is genuinely zero pairs.
    size: () => (held === undefined ? 0 : held.correlations.length),
  };
}
