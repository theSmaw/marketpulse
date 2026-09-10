// What "a closed session never changes" means as a mechanism, and the cache in
// front of `serveSeries` that spends it (Task 2.9.8).
//
// Two things live here and they are two halves of one decision:
//
//   - **The predicate.** {@link isClosedWindow} answers *is every session this
//     window touches already over?* — through Story 2.5's calendar, never
//     through a clock comparison. It is what decides both the HTTP freshness
//     lifetime and how long an answer may be reused inside this process.
//   - **The cache.** {@link createSeriesCache} keys a served answer on the
//     **resolved** window and hands it back to a second asker.
//
// ## The rule is written in sessions, for Epic 13 rather than for today
//
// "Not today" and "already closed" agree on almost every input and are not the
// same rule. Epic 13's replay reads history as-of a past instant, where *every*
// window is closed — so a rule phrased against the wall clock would be a rule
// replay has to special-case, and a rule phrased against the calendar is one it
// gets for free. {@link closedThrough} takes the instant as an argument for
// exactly that reason: a replay clock substitutes for a wall clock and nothing
// here changes.
//
// ## What the cache is for, and it is TWO things
//
// The one the objective names: switching back to a window already looked at
// should not re-read 8,000 rows. Stories 2.12 and 2.13 feel faster because of
// it.
//
// The one `MARKET-DATA-API.md` §5 hands this task, which is load-bearing rather
// than an optimisation: since Task 2.9.5 the read path **stitches**, so a window
// ending *now* is a metered vendor request on a cache miss — once per page
// load, per symbol, for as many people as are looking. §5 says in terms that if
// this task cannot bound that, the stitch decision goes back to the user rather
// than being quietly narrowed. What bounds it is {@link LIVE_ANSWER_TTL_MS}: a
// live window is answered from the store and the vendor at most once a minute
// per window, whatever the traffic. The bound is therefore a function of time
// and of how many distinct windows the UI offers, and **not** of how many people
// are looking — which is the dimension §5 was worried about.
//
// **This cache is in-process, so that bound is per REPLICA.** The deployed
// backend is a Container App with `minReplicas: 1` and a maximum that exists
// only on the platform, in no file in this repository — so the real multiplier
// is a number nothing here can read, and Task 2.9.9 owns taking it
// (`MARKET-DATA-API.md` §11). A shared cache is not the fix: that is a second
// database bought to save a request the free plan does not charge for. The shape
// of the result is unchanged — bounded by replicas and time rather than by
// traffic.
//
// ## Why the cache is in FRONT of `serveSeries` and not in front of the response
//
// The handler is three steps in one order: parse, `findSecurity`, `serveSeries`.
// A cache in front of the whole response would skip the middle one, and three
// things would go with it:
//
//   - **The 404 stops being about the security.** `MARKET-DATA-API.md` §6's
//     sentence is that a 404 is about the *security*, never about the *data*; a
//     symbol removed from the universe would go on being served from cache, and
//     the 404 would become a statement about what was recently asked for.
//   - **`securityStatus` goes stale.** It is one command away from changing —
//     see `http-cache.ts` — and it is read from a different table than the bars.
//   - **The 503 stops happening.** A database that is down would be invisible
//     behind a cached body, which is the opposite of what that status is for.
//
// The price is one point read of `securities` per request, which is the cheapest
// query this application makes. Deliberate, and the cheaper option is not the
// right one.
//
// ## The store is not the cache, and cannot be
//
// The instinct at the end of a metered fetch is to keep the bars. `recordSeries`
// refuses a two-source series by design — `0007_bar_coverage_provenance.sql`
// holds one source per `(security, timeframe)` window — so the tail is **served
// and not stored**, and this cache is where its cost is bounded instead.

import {
  marketDateAt,
  marketSessionStateAt,
  previousMarketSession,
  type Ticker,
  type Timeframe,
  type TimeRange,
} from "@marketpulse/shared";

import { reusableFor, REVALIDATE } from "./http-cache.js";
import type { SeriesWindowForm } from "./series-request.js";
import type { ServedSeries } from "./serve-series.js";

/**
 * How long anything in this system may serve a body that a correction or a
 * status flip has invalidated.
 *
 * **One number, used twice**, and that is the whole argument for it: it is the
 * browser's `max-age` on a closed window and it is this cache's lifetime for
 * the same answer. Two numbers here would be two answers to *how stale may a
 * closed session's answer be*, and the two would diverge the first time either
 * was tuned.
 *
 * Five minutes, because the thing being bounded is not the bars. A closed
 * session's bars do not change; what changes is a **vendor correction** landing
 * against one (`bar.ts`, Story 2.8's open decision 1) and a **`securityStatus`**
 * that `pnpm universe` can flip at any moment (Task 2.9.6). Both are rare and
 * neither is urgent, and five minutes is short enough that a reader who
 * notices something wrong and reloads is served the correction — which is the
 * property a long `max-age` destroys, because there is no way to reach a body a
 * client was told to keep for a year.
 */
export const CLOSED_ANSWER_SECONDS = 300;

/** {@link CLOSED_ANSWER_SECONDS} as this cache measures time. */
export const CLOSED_ANSWER_TTL_MS = CLOSED_ANSWER_SECONDS * 1_000;

/**
 * How long a window reaching into the live session may be reused.
 *
 * **Sixty seconds, because that is how long it takes for new information to
 * exist.** The finest timeframe this API serves is `1m`, so a second request
 * inside the same minute cannot be answered with a bar the first one could not
 * have had. The staleness this admits is bounded by one bar, against a free
 * plan that already withholds the most recent ~16 minutes (`ALPACA.md` §10) —
 * so it is a rounding error on a number the product already reports honestly
 * through `coverage.covered`.
 *
 * It is deliberately **not** carried into the response as a `max-age`. A live
 * window's HTTP answer is `no-cache`: the client revalidates every time and
 * pays a round-trip rather than showing a minute-old chart it has no way to
 * know is minute-old. This TTL is a bound on what *we* ask the vendor, which is
 * a different question with a different party paying for it.
 */
export const LIVE_ANSWER_TTL_MS = 60_000;

/**
 * The instant every session on or before it has finished.
 *
 * The calendar answers this and a clock cannot: 16:00 is not the close on a
 * half day, a Saturday's answer is Friday's close, and a holiday's is the
 * session before it. `marketSessionStateAt` distinguishes all five states and
 * this maps them onto one question — *what is the most recent thing that is
 * definitely over?*
 *
 *  - **`after_close`** — today's session, which has just ended.
 *  - **`open`** — the previous one. Today's is still accumulating.
 *  - **`before_open`** — the previous one, for the same reason: today's has not
 *    started, so it is not over either.
 *  - **`weekend` / `holiday`** — the session before this date, which is what
 *    `previousMarketSession` returns from a non-trading date.
 *
 * Throws `MarketCalendarRangeError` when the walk leaves the calendar's
 * 2024–2028 range, which is the same refusal every other reader of it gets and
 * is not caught here: an instant outside the covered range is a fault, and a
 * cache that guessed would be guessing about immutability.
 */
export function closedThrough(now: Date): Date {
  const state = marketSessionStateAt(now);

  if (state.status === "after_close") return state.session.close;

  return previousMarketSession(marketDateAt(now)).close;
}

/**
 * Is every session this window touches already over?
 *
 * The window is half-open, `[start, end)`, so a window ending exactly at a
 * close touches nothing after it and is closed. That is the same boundary
 * `marketSessionStateAt` draws — at exactly 16:00:00 the market is shut,
 * because the last minute bar of a session is 15:59 — and drawing it anywhere
 * else here would make the two disagree about the one instant it matters at.
 *
 * Note what this is a property **of**: the resolved, absolute range. It is
 * never a property of the request, because `?sessions=5` is a stable URL naming
 * a moving target — see {@link seriesCacheControl}.
 */
export function isClosedWindow(range: TimeRange, now: Date): boolean {
  return range.end.getTime() <= closedThrough(now).getTime();
}

/**
 * The `Cache-Control` a series response carries.
 *
 * **A named window is a stable URL naming a moving target, and every HTTP cache
 * keys on the URL.** That is the trap this function exists to close, and it is
 * the one this task was most likely to ship silently. `?sessions=5` resolves
 * through the calendar against *today's* market date, so the same URL means a
 * different window tomorrow and means a different window again at every session
 * close — and the response looks entirely well-formed either way, because
 * `coverage.requested` reports the resolved range honestly. It is simply the
 * wrong range.
 *
 * So immutability cannot be applied to the URL a client sent. It is a property
 * of the **resolved** range, while a cache key is the URL — and the only form
 * whose URL and meaning are the same thing is the absolute one. Hence:
 *
 *  - **Absolute, and entirely inside closed sessions** → reusable for
 *    {@link CLOSED_ANSWER_SECONDS}. This is the one case that avoids a
 *    round-trip.
 *  - **Everything else** → revalidate. A named window that resolved entirely
 *    inside closed sessions — which `?sessions=1` does every evening — is
 *    included, deliberately: what it resolved to today says nothing about what
 *    it will resolve to tomorrow morning under the same address.
 *
 * Both carry an `ETag`, so the named form still costs a round-trip and not a
 * payload.
 */
export function seriesCacheControl(
  form: SeriesWindowForm,
  range: TimeRange,
  now: Date,
): string {
  return form === "absolute" && isClosedWindow(range, now)
    ? reusableFor(CLOSED_ANSWER_SECONDS)
    : REVALIDATE;
}

/**
 * What identifies an answer.
 *
 * The **resolved** range and not the request, which is what lets `?sessions=1`
 * after the close and the equivalent `start`/`end` pair share one entry — they
 * are the same question, and the stable-URL trap above is a property of the
 * client's cache rather than of ours. `securityStatus` is deliberately absent:
 * it is not part of what is cached, because it is re-read on every request.
 */
export interface SeriesCacheKey {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;
  readonly range: TimeRange;
}

/** The answer cache, as the route sees it. */
export interface SeriesCache {
  /** A live entry for this key, or `undefined`. */
  read(key: SeriesCacheKey, now: Date): ServedSeries | undefined;
  /** Keep this answer, evicting older ones if it does not fit. */
  write(key: SeriesCacheKey, served: ServedSeries, now: Date): void;
  /** How many answers are held. For tests and for a future diagnostic. */
  readonly size: number;
}

/**
 * How many bars this cache may hold across every entry.
 *
 * `MAX_SERIES_BARS` is 10,000, so this is six full-sized answers — and a
 * ceiling stated in **bars rather than entries** because that is what the
 * memory is: a cache bounded at 256 entries is bounded at 2.56 million bars,
 * which is a container limit rather than a cache.
 *
 * The number is small on purpose. This is a read-through cache in a process
 * with a replica floor of one, not a store; what it exists to stop is the same
 * window being computed twice a second, and the working set of a chart is a
 * handful of windows.
 */
export const MAX_CACHED_BARS = 60_000;

/**
 * How many answers this cache may hold, whatever they weigh.
 *
 * The bar budget alone cannot bound an **empty** series, which weighs nothing
 * and is a perfectly ordinary answer — a symbol we hold nothing for returns
 * one, and a client walking the universe would mint 518 of them for free. Two
 * ceilings, because there are two ways to grow.
 */
export const MAX_CACHED_ANSWERS = 256;

/** One held answer, and what decides whether it is still good. */
interface Entry {
  readonly served: ServedSeries;
  /** When the answer was computed. */
  readonly storedAt: Date;
  /** {@link CLOSED_ANSWER_TTL_MS} or {@link LIVE_ANSWER_TTL_MS}. */
  readonly ttlMs: number;
  /** `series.bars.length`, held so eviction does not walk the array. */
  readonly bars: number;
}

/**
 * A least-recently-used cache of served answers.
 *
 * **A `Map` and its insertion order, rather than a dependency.** The whole
 * mechanism is: reading an entry re-inserts it, which moves it to the end; a
 * write evicts from the front until the new entry fits. `CLAUDE.md`'s rule
 * about not introducing a library before complexity demonstrates the need
 * applies to a fifty-line LRU as much as to a state manager.
 *
 * **Every entry expires, including an immutable one**, and that is the answer
 * to *what happens when the store is backfilled underneath a cached answer*.
 * The nightly catch-up fills gaps in sessions that are already closed, so a
 * closed window's answer can go from honest-and-partial to stale without
 * anything in the window changing — the calendar cannot see that, because it is
 * a fact about our store rather than about the market. A lifetime bounds it to
 * {@link CLOSED_ANSWER_SECONDS} without needing to. There is deliberately no
 * invalidation hook for the backfill to call: a cache a writer has to remember
 * to clear is a cache that is wrong on the day somebody forgets.
 */
export function createSeriesCache(): SeriesCache {
  const entries = new Map<string, Entry>();
  let bars = 0;

  function evict(key: string): void {
    const entry = entries.get(key);
    if (entry === undefined) return;
    entries.delete(key);
    bars -= entry.bars;
  }

  function evictOldest(): void {
    // `Map` iteration is insertion order, and a read re-inserts, so the first
    // key is the least recently used. `next()` rather than `[...entries.keys()][0]`,
    // which would copy every key to read one.
    const oldest = entries.keys().next();
    if (oldest.done === true) return;
    evict(oldest.value);
  }

  return {
    get size() {
      return entries.size;
    },

    read(key, now) {
      const id = identify(key);
      const entry = entries.get(id);
      if (entry === undefined) return undefined;

      if (now.getTime() - entry.storedAt.getTime() >= entry.ttlMs) {
        // Expired entries are dropped on the read rather than swept, so this
        // cache has no timer and nothing to shut down — which is what keeps it
        // out of `index.ts`'s shutdown ceremony entirely.
        evict(id);
        return undefined;
      }

      // Re-inserted, which is the LRU. Delete first: `Map.set` on an existing
      // key updates the value in place and does **not** move it.
      entries.delete(id);
      entries.set(id, entry);
      return entry.served;
    },

    write(key, served, now) {
      const id = identify(key);
      evict(id);

      const entry: Entry = {
        served,
        storedAt: now,
        ttlMs: isClosedWindow(key.range, now)
          ? CLOSED_ANSWER_TTL_MS
          : LIVE_ANSWER_TTL_MS,
        bars: served.series.bars.length,
      };

      // An answer larger than the whole budget is not cached rather than
      // emptying the cache to fail to hold it. It cannot happen today —
      // `MAX_SERIES_BARS` is a sixth of the budget — and stating it is what
      // stops the loop below from being unbounded if either number moves.
      if (entry.bars > MAX_CACHED_BARS) return;

      while (
        entries.size > 0 &&
        (bars + entry.bars > MAX_CACHED_BARS ||
          entries.size >= MAX_CACHED_ANSWERS)
      ) {
        evictOldest();
      }

      entries.set(id, entry);
      bars += entry.bars;
    },
  };
}

/**
 * A key as one string.
 *
 * The instants are epoch milliseconds rather than ISO strings — shorter, and
 * unambiguous in a way a formatted date is not. The separator is a character no
 * ticker, timeframe or number contains, so two different keys cannot spell the
 * same string.
 */
function identify(key: SeriesCacheKey): string {
  return [
    key.symbol,
    key.timeframe,
    key.range.start.getTime(),
    key.range.end.getTime(),
  ].join("|");
}
