import type { BarSeriesView } from "./bar-series-view.js";

// The parsed series this application keeps in memory across a component
// unmount — the one half of caching the browser's own HTTP cache cannot do for
// us (Task 2.10.5).
//
// ## What this is not for, because it is the thing everyone assumes
//
// **It does not save a megabyte, and it does not save a request.** Every one of
// these responses is already stored by the browser, revalidated with
// `If-None-Match` and turned into a `304` with an empty body — measured at
// 1,060,490 B → 0 for a month of minute bars (`MARKET-DATA-API.md` §11,
// 2026-09-10). That saving happened in a layer no JavaScript here can see,
// before this file existed. Anyone re-arguing this cache in bytes on the wire
// is arguing about bytes Task 2.9.8 already saved.
//
// What is genuinely left is that the browser caches **bodies** and this
// application needs a **parsed, typed series** — and parsing one is not free:
// measured below, a cap-sized series costs 4.6–8.7 ms of main thread to parse
// and construct, and a user returning to a security they were just looking at
// would otherwise watch a loading state for the length of a round trip plus
// that.
//
// ## The rule that makes it structurally unable to serve a stale body for long
//
// `FRONTEND-STATE.md` §2, and it is stronger than "pick a short TTL":
//
// - **Every read is accompanied by a request.** The entry paints sooner while
//   the fresh answer is in flight; it is never consulted to decide that no
//   request is needed. So freshness stays entirely with the browser and the
//   server's five-minute ceiling, and a stale entry can be on screen only for
//   the duration of one in-flight request.
// - **Eviction is by count, never by clock.** A cache with no lifetime cannot
//   have a lifetime that disagrees with the server's. There is no `Date` in
//   this file and there must not be one.
// - **The key is the request as sent** — `barSeriesQuery(request)`, whose
//   parameter order is fixed for exactly this reason. A named window and an
//   absolute window are different keys because they are different requests,
//   which is the same key every HTTP cache between here and the server is
//   already using.
//
// ## Hand-rolled rather than a library, on the failure mode
//
// `FRONTEND-STATE.md` §2 decided this on ADR 0008 §2's rule rather than on
// size: a hand-rolled cache that **misses** when it should hit produces an
// extra request the server answers with a `304` — visible in the network panel,
// correct on screen, loud. The one way a client cache fails invisibly is
// serving an invalidated body, and the read-always-with-a-request rule above
// removes that structurally rather than promising to avoid it. The bundle
// figures (+0.13 kB against `@tanstack/react-query`'s +9.54 kB gzipped) were
// the tiebreaker, not the argument.

/**
 * The states worth keeping — the three that are **answers**.
 *
 * `loading`, `refused` and `failed` are all excluded, and each for its own
 * reason rather than by one sweeping rule. `loading` is not an answer at all.
 * A `refused` is an answer about the *request* and re-asking the same request
 * gets the same refusal, so an entry would save nothing and would put a
 * server's sentence in a store that outlives the screen it was written for. A
 * `failed` is the state this cache most obviously must not hold: painting a
 * remembered failure before the new request has had a chance to succeed would
 * report a fault that may have been fixed.
 *
 * And an **incoherent** answer caches nothing without needing a rule of its
 * own: `toBarSeriesView` turns one into `failed`, so it is excluded by the
 * same line. Only a series that parsed, cohered and reached a state is ever
 * held here.
 */
export type CacheableBarSeriesView = Extract<
  BarSeriesView,
  { readonly state: "loaded" | "partial" | "empty" }
>;

/**
 * Is this state one of the three answers?
 *
 * Written as a `switch` over the whole union rather than a two-comparison
 * boolean, so that a seventh member added to `BarSeriesView` is a compile error
 * here — *is the new state worth keeping?* is a question whose default answer
 * must not be "silently no".
 */
export function isCacheableBarSeriesView(
  view: BarSeriesView,
): view is CacheableBarSeriesView {
  switch (view.state) {
    case "loaded":
    case "partial":
    case "empty":
      return true;
    case "loading":
    case "refused":
    case "failed":
      return false;
  }
}

/**
 * How many bars this cache will hold in total, across every entry.
 *
 * **A bar budget rather than only an entry count, and that is this task's one
 * departure from `FRONTEND-STATE.md` §2's working number of 24.** The
 * measurement is what forced it, and 24 was written before anybody had one:
 *
 * | Series                          | Wire (identity) | Parsed heap | Parse + construct |
 * | ------------------------------- | --------------- | ----------- | ----------------- |
 * | 1 session of minute bars (390)  | 44,561 B        | **97.8 kB** | 0.22–0.26 ms      |
 * | 5 sessions of minute bars (1,950) | 221,238 B     | **475 kB**  | 0.93–1.88 ms      |
 * | The 10,000-bar cap              | 1,132,936 B     | **2.43 MB** | 4.6–8.7 ms        |
 *
 * Measured 2026-09-10 in this repository, on the real `toDomainSeries` over a
 * payload built from 390 **real** recorded Alpaca minute bars
 * (`nvda-1min-regular-session.json`) tiled to length: 20 parsed copies held
 * live, `--expose-gc` before and after, `process.memoryUsage().heapUsed`
 * divided by 20. Three runs agreed to 0.6 kB. It is V8 under Vitest rather than
 * a browser tab, which is the same engine and not the same allocator — take it
 * as the right order of magnitude rather than to the kilobyte.
 *
 * The reading that matters: **a series varies 25× in size**, so a bound of *24
 * entries* bounds entries and not memory — it is 2.3 MB of held series in the
 * common case and **58 MB** in the case a window control can produce, which is
 * exactly the shape of thing that looks fine in testing and exhausts a tab in
 * use. A bar budget is still a count, still has no clock, and bounds the thing
 * actually being protected.
 *
 * 50,000 bars is ~12 MB of parsed series at the ~250 bytes per bar the table
 * implies: 5 cap-sized series, or 25 default five-session ones, or 128 single
 * sessions. Comfortably more history than the A → B → A navigation this cache
 * exists for, and a hard ceiling a window control cannot walk through.
 */
export const BAR_SERIES_CACHE_BARS = 50_000;

/**
 * How many entries it will hold, whatever they weigh.
 *
 * The budget above is the memory bound; this is the guard for the degenerate
 * case it cannot see. **An empty series holds zero bars** — a real and correct
 * answer, `bars: []` over a window the store has nothing for — so a budget
 * counted in bars alone would let empty entries accumulate without limit. Two
 * numbers rather than a per-entry overhead charged in imaginary bars, because
 * two stated bounds with a reason each read better than one clever one.
 */
export const BAR_SERIES_CACHE_ENTRIES = 32;

/** A parsed series cache. See {@link createSeriesCache}. */
export interface SeriesCache {
  /**
   * What we hold for this request, if anything.
   *
   * **Deliberately does not promote the entry**, which would make it a mutation
   * performed during a render — the hook reads this while rendering, so that it
   * can paint a held series in the same commit rather than one paint later. It
   * costs nothing: a read is always followed by a request, and that request's
   * answer is written back, so recency-on-write *is* recency-on-read here.
   */
  read(key: string): CacheableBarSeriesView | undefined;

  /** Keep this answer for this request, evicting the oldest to stay in bounds. */
  write(key: string, view: CacheableBarSeriesView): void;

  /** How many entries are held. For tests and for the bound's own test. */
  readonly size: number;

  /** How many bars are held across every entry. For tests. */
  readonly bars: number;

  /**
   * Forget everything.
   *
   * **For tests, and it is not a convenience.** The instance below is
   * module-level and therefore process-wide, so a test inheriting another
   * test's entries is a test that passes for a reason it does not state. There
   * is no product call site and there should not be one: a user asking for
   * fresh data is asking the *server*, and this cache never answers without
   * asking it.
   */
  clear(): void;
}

/**
 * A bounded, clock-free LRU over parsed series.
 *
 * `Map` iterates in insertion order, which is the whole mechanism: `write`
 * deletes the key before setting it so a re-written entry moves to the end, and
 * eviction takes from the front until both bounds hold.
 *
 * A factory rather than a class for testability rather than taste — the bounds
 * are arguments, so the eviction test can use a cache of three entries instead
 * of constructing 33 real series to watch one fall off the end.
 */
export function createSeriesCache(
  maxEntries: number = BAR_SERIES_CACHE_ENTRIES,
  maxBars: number = BAR_SERIES_CACHE_BARS,
): SeriesCache {
  const entries = new Map<string, CacheableBarSeriesView>();
  let bars = 0;

  const weigh = (view: CacheableBarSeriesView): number =>
    view.series.bars.length;

  const forget = (key: string): void => {
    const held = entries.get(key);
    if (held === undefined) return;
    bars -= weigh(held);
    entries.delete(key);
  };

  return {
    read(key) {
      return entries.get(key);
    },

    write(key, view) {
      // Deleted first even when it is not present, because that is what moves
      // an existing entry to the end of the iteration order — a `set` on a key
      // a `Map` already holds updates the value and leaves the position alone,
      // which would make this cache FIFO wearing an LRU's name.
      forget(key);
      // **Stored fresh, always**, whatever the caller was holding. `stale` is a
      // fact about *the screen* — this answer is one request old — and not
      // about the answer, and a cache that remembered it would hand the next
      // reader a mark it had not earned. It is set at the read instead
      // (`toStaleBarSeriesView`), where the accompanying request is what makes
      // it true. Normalising here rather than trusting the call site is the
      // cheap half: the hook writes back whatever painted, including an entry
      // it had itself just marked.
      entries.set(key, { ...view, stale: false });
      bars += weigh(view);

      // A single series can exceed the whole bar budget on its own — a
      // cap-sized 10,000-bar series against a budget of, say, 3 in a test — so
      // this stops when one entry is left rather than when the bounds hold,
      // and the entry just written is the last one it would reach. Evicting
      // the answer we are about to paint would make the cache empty exactly
      // when it is being used.
      while (
        entries.size > 1 &&
        (entries.size > maxEntries || bars > maxBars)
      ) {
        const oldest = entries.keys().next();
        if (oldest.done === true) return;
        forget(oldest.value);
      }
    },

    get size() {
      return entries.size;
    },

    get bars() {
      return bars;
    },

    clear() {
      entries.clear();
      bars = 0;
    },
  };
}

/**
 * The one cache this application has.
 *
 * **Module-level, and that is the entire point of the file**: a cache owned by
 * a component would be thrown away by the unmount it exists to survive. It is
 * per document rather than per tab or per user — a reload starts empty, which
 * is correct, because a reload is what a person does when they want to be sure.
 */
export const barSeriesCache = createSeriesCache();

/**
 * Forget every held series. **Test scaffolding, and there is no product call
 * site.**
 *
 * Exported from this module's `index.ts` when {@link barSeriesCache} itself
 * deliberately is not, and the asymmetry is the point rather than a compromise.
 * The invariant the header states is that *nothing outside this module can read
 * a series without asking for one*; a function that can only **forget** cannot
 * breach it. What it buys is the one thing the cache being module-level costs:
 * `src/test-setup.ts` is where `afterEach(cleanup)` lives, it is outside
 * `src/market/`, and the lint rule holding PRODUCT_SPEC §26's boundary means it
 * can reach this module only through its API.
 *
 * The alternative — an exemption in `eslint.config.mjs` for one file — was
 * rejected on the trap that config already documents: `no-restricted-imports`
 * resolves to the last configuration that matched, so a second block for
 * `test-setup.ts` would silently *replace* the `node:*` group and take the
 * browser boundary out with it.
 *
 * A user asking for fresh data is asking the **server**, and this cache never
 * answers without asking it — so if this ever acquires a product caller,
 * something upstream has gone wrong rather than this having become useful.
 */
export function clearBarSeriesCache(): void {
  barSeriesCache.clear();
}
