import { useCallback, useEffect, useRef, useState } from "react";

import { getBarSeries } from "../api-client.js";
import type { BarSeriesRequest } from "../bar-series-query.js";
import { barSeriesQuery } from "../bar-series-query.js";
import type { BarSeriesView } from "./bar-series-view.js";
import { toBarSeriesView, toRetryingBarSeriesView } from "./bar-series-view.js";
import { barSeriesCache, isCacheableBarSeriesView } from "./series-cache.js";

// One request for one series, cancelled correctly, superseded correctly, and
// remembered across an unmount (Task 2.10.5).
//
// **This file adds an effect and nothing else.** The union is
// `bar-series-view.ts`, both transitions are pure functions there, the parse
// and its coherence checks are `bar-series-payload.ts`, the request's spelling
// is `bar-series-query.ts` and the transport is `api-client.ts`. What is here
// is the loop: when to ask, when to stop caring about an answer, and what to
// paint while the next one is in flight. `useSecurities` is the working example
// of the same shape and the comments below say where this one differs.
//
// ## Two supersession causes, not one
//
// `useSecurities` has one — a user pressing retry twice. This hook has three
// events that end a request's claim on the state: the inputs changing (a
// different symbol, a different window), the effect tearing down (navigation,
// unmount), and a retry. All three go through one mechanism, described where it
// is implemented below, because three mechanisms would be three places for the
// same off-by-one.
//
// ## The refetch policy, stated rather than defaulted
//
// **A request goes out on mount, on a change of symbol or window, and when a
// user presses retry. There is no poll and no refetch on focus.**
//
// The two hooks that exist are the two poles and this is deliberately a third
// thing. `useBackendHealth` polls every 30 seconds because *a health state
// changing is the whole information the indicator carries*. `useSecurities`
// asks once because the universe changes a handful of times a year. A bar
// series is neither: **a closed session's bars never change** — which is why
// the server can hand an absolute window inside closed sessions a five-minute
// lifetime at all (`MARKET-DATA-API.md` §11) — and a window reaching towards
// now is moving while you look at it.
//
// **What this hook does with an open session's tail is: nothing, and it says
// so.** A window reaching into the current session comes back `partial`,
// carrying `covered.end` — *"we have data through 15:42"* — and it stays that
// way until something asks again. That is honest rather than lazy: the free
// plan withholds the most recent ~15 minutes and the store is backfilled
// nightly, so a poll would re-ask every 30 seconds for a tail that moves once a
// night. **And a poll here would be the wrong mechanism arriving early.** Epic 3
// owns the live feed, and the seam it attaches to is exactly `covered.end` on
// this state: a socket resumes from the last bar we hold rather than a timer
// re-downloading a window to find out that four of its bars are new.
//
// ## Re-asking with the absolute window once we know one — explicitly declined
//
// The server resolves `sessions=5` and reports back what it meant in
// `coverage.requested`. So this hook *could*, once an answer has landed, re-ask
// for the same bars as an absolute range — and `MARKET-DATA-API.md` §11 gives
// an absolute window inside closed sessions `private, max-age=300` while a
// named one gets no lifetime at all, so the second request would be reusable
// for five minutes with no network. That is the only honest route to §11's
// five-minute reuse, and this hook declines it.
//
// Three reasons, in order of weight. **It is a second request for bars we are
// already holding** — a guaranteed extra round trip on every first view of a
// named window, to buy a cheaper *third* one that may never happen. **It is a
// different cache key holding the same series**, so a user on the default
// window would occupy two entries per security and the bar budget in
// `series-cache.ts` would bound half as much history as it appears to. And the
// thing it is optimising is already small: the repeat request a named window
// makes is revalidated into a `304` with an **empty body** (measured at
// 1,060,490 B → 0), so what five minutes of `max-age` actually saves over that
// is one round trip, not a megabyte.
//
// Note what this is *not* a decision about. `FRONTEND-STATE.md` §3 forbids
// rewriting the window form in the **address bar** — a link a user shares means
// what they picked — and says nothing about what is asked for behind it. This
// is the request, and it is declined on its own arithmetic.
//
// Reversal trigger — conditions, not a story number:
//
// - **A measured round trip on this endpoint that is slow enough for a user to
//   see on a repeat view**, against a `304` that is already cheap. That turns
//   the five-minute reuse from a saved round trip into a felt one.
// - **The first window whose tail moves faster than a user will re-ask for it,
//   with no live stream to carry it.** If Epic 3 slips past the first screen
//   that shows an open session, this policy leaves that screen stale and a
//   refetch on window focus is the cheap answer, not a poll.
// - **The first consumer that needs two components to share one in-flight
//   request.** This hook deduplicates nothing across components — two panels on
//   one series make two requests, which the browser's cache answers cheaply and
//   which a store or a query library answers properly. That is also
//   `FRONTEND-STATE.md` §2's own second trigger.

/** The state that every request starts from, and the one nothing caches. */
const LOADING: BarSeriesView = { state: "loading" };

/**
 * The request whose answer is currently being rendered, and its key.
 *
 * Held as state rather than read from the argument on every render because the
 * argument is a fresh object literal at nearly every call site — a route
 * building `{ symbol, timeframe, window }` inline hands this hook a different
 * object identity each render while describing the identical request. An effect
 * keyed on that object would re-fetch on every render forever.
 *
 * The key is what settles it, and it is not invented here: `barSeriesQuery` is
 * a total, order-stable spelling of a request, fixed in that order **so that it
 * can be this key** — the same string the URL carries, the same string every
 * HTTP cache between here and the server keys on, and the same string
 * `series-cache.ts` keys on. Two spellings of one request would be two misses
 * and two round trips, and nothing on screen would look wrong while it
 * happened.
 */
interface PinnedRequest {
  readonly request: BarSeriesRequest;
  readonly key: string;
}

/**
 * What a consumer of this hook gets: the state, and the one action there is.
 *
 * Two values rather than a callback hung off the state, which is
 * `SecuritiesSource`'s precedent and Task 2.10.4's instruction. A function on
 * the `failed` member would make the union un-comparable, un-serialisable and
 * awkward to construct in a story or a test — and every one of those is a
 * property this repository uses: Task 2.10.8's stories construct these states
 * as data, and Epic 11 wants application state a `WorkspaceCommand` can act on.
 */
export interface BarSeriesSource {
  readonly view: BarSeriesView;

  /**
   * Ask again.
   *
   * Safe to call at any time, including twice in a row while a request is in
   * flight: the second call supersedes the first and the superseded answer is
   * discarded rather than rendered.
   */
  readonly retry: () => void;
}

/**
 * Read one bar series, and keep reading the right one.
 *
 * No `try`/`catch` anywhere below, for the reason it is absent from
 * `useSecurities`: `getBarSeries` never throws in any branch, so a rejection
 * here would be a bug in the client rather than a service that is down — and
 * swallowing it is how that bug would stay invisible. The one coherence `try`
 * this layer has lives in `toBarSeriesView`, which is the single place a body
 * that does not add up becomes a state; a second catch here would be a second
 * answer to the same question.
 *
 * ## How a superseded answer is kept off the screen
 *
 * One ref holds the controller for the request whose answer this hook will
 * accept. Starting a request aborts the previous one and takes ownership of
 * that ref; an answer arriving from a request that no longer owns it is
 * dropped.
 *
 * **Aborting alone is not sufficient and the gap is not a race you can close by
 * aborting sooner.** A request that had already resolved when the abort landed
 * cannot be un-resolved, and `apiRequest` reports `aborted` only when the fetch
 * itself rejects — so the loser's `ok` result reaches this callback normally
 * and would overwrite the winner's. Identity is what closes it. The teardown
 * clears the ref as well as aborting, which is the same guard doing the same
 * job for an unmount.
 */
export function useBarSeries(request: BarSeriesRequest): BarSeriesSource {
  const key = barSeriesQuery(request);

  const [pinned, setPinned] = useState<PinnedRequest>(() => ({ request, key }));
  const [view, setView] = useState<BarSeriesView>(
    // A held series paints in the **first** commit rather than one after it.
    // Reading the cache in an effect instead would render `loading` and replace
    // it a frame later, which is a flash of nothing on the way to something we
    // already had.
    () => barSeriesCache.read(key) ?? LOADING,
  );

  // The inputs changed. React's own "adjusting state when a prop changes"
  // pattern: set state during render, and React re-renders this component
  // immediately, before committing anything or touching the DOM.
  //
  // The view is **reset**, not kept. A held series for the *new* key is the
  // right thing to paint; the *old* key's series under a new symbol is a chart
  // of NVDA labelled AMD, which is the failure this whole layer is careful
  // about — plausible and wrong, rather than visibly broken.
  if (pinned.key !== key) {
    setPinned({ request, key });
    setView(barSeriesCache.read(key) ?? LOADING);
  }

  // `null` between requests, and otherwise the controller of the one request
  // whose answer this hook is waiting for.
  const current = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    // Supersession first: whatever was in flight is no longer the answer this
    // hook is waiting for. This is the same line for all three causes — a key
    // change re-creates this callback and re-runs the effect, a retry calls it
    // directly, and a teardown does the same two things in the cleanup below.
    current.current?.abort();

    const controller = new AbortController();
    current.current = controller;

    const read = async (): Promise<void> => {
      const result = await getBarSeries(pinned.request, {
        signal: controller.signal,
      });

      // The teardown and window-change cases, when the fetch rejected in time.
      // Under `StrictMode` the development double-invoke aborts the first
      // mount's request immediately and it comes back here — designed
      // behaviour rather than something to suppress, and acceptance criterion
      // 3's rule that a cancelled result is never rendered as a failure.
      if (result.outcome === "aborted") return;

      // The same two cases when it did not: a response that had already
      // resolved before it was superseded, which no amount of aborting
      // prevents. Identity rather than a boolean, because the question is *is
      // this still the request we are waiting for* and nothing else answers it.
      if (current.current !== controller) return;

      setView((previous) => toBarSeriesView(previous, result));
    };

    void read();
  }, [pinned]);

  useEffect(() => {
    load();

    return () => {
      current.current?.abort();
      // Cleared as well as aborted, so an answer that had already resolved
      // cannot reach the state of a component that has gone.
      current.current = null;
    };
  }, [load]);

  // The cache write, deliberately here rather than inside the `setView` above.
  //
  // A state updater must be pure — React calls it twice under `StrictMode` and
  // may call it again on a re-render it discards — so a `Map` mutation inside
  // one is a side effect in the one place React promises not to have any. An
  // effect is where a side effect goes, and the rule this expresses is exactly
  // `FRONTEND-STATE.md` §2's: *whatever answer is on screen for this key is
  // what we hold for it.*
  //
  // It also completes the LRU. `read` deliberately does not promote an entry,
  // because the hook reads it while rendering; this effect runs on the commit
  // that painted it and writes it back, which promotes it. So recency-on-write
  // is recency-on-read, without a mutation during a render.
  useEffect(() => {
    if (isCacheableBarSeriesView(view)) barSeriesCache.write(pinned.key, view);
  }, [view, pinned.key]);

  const retry = useCallback(() => {
    setView(toRetryingBarSeriesView);
    load();
  }, [load]);

  return { view, retry };
}
