import { useCallback, useEffect, useRef, useState } from "react";

import { getBarSeries } from "../api-client.js";
import type { BarSeriesRequest } from "../bar-series-query.js";
import { barSeriesQuery } from "../bar-series-query.js";
import type { BarSeriesView } from "./bar-series-view.js";
import { toStaleBarSeriesView } from "./bar-series-view.js";
import type { BarSeriesScreen, BarSeriesState } from "./held-series.js";
import { usePendingPanel } from "./use-pending-panel.js";
import type { Bar, MarketFeed } from "@marketpulse/shared";

import { useLiveSeries } from "./use-live-series.js";
import {
  barSeriesScreen,
  withLiveEdge,
  toBarSeriesState,
  toRequestedBarSeriesState,
  toRetryingBarSeriesState,
} from "./held-series.js";
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
// **A request goes out on mount, on a change of symbol or window, when a user
// presses retry, and — since Task 3.10.7 — when the live feed comes BACK.
// There is still no poll and no refetch on focus.**
//
// The fourth cause is the only one no reader asked for, and it is the reason
// `refill` exists beside `retry`: see its own comment for why it is quiet and
// why its failures are discarded.
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
// - ~~**The first window whose tail moves faster than a user will re-ask for
//   it, with no live stream to carry it.**~~ — **FIRED, and answered on
//   2026-09-24 by Task 3.10.7.** The condition arrived in the form nobody
//   wrote it for: not Epic 3 slipping, but Epic 3 shipping and then the
//   stream *stopping*. A page whose socket has dropped mid-session is exactly
//   a window whose tail is moving with no live stream to carry it, and the
//   repair this line predicted — *a refetch, not a poll* — is what landed.
//   The trigger it names is **the resume** rather than window focus, because
//   focus is a guess about when the reader cares and a reconnection is a fact
//   about when there is something new to get.
// - **The first consumer that needs two components to share one in-flight
//   request.** This hook deduplicates nothing across components — two panels on
//   one series make two requests, which the browser's cache answers cheaply and
//   which a store or a query library answers properly. That is also
//   `FRONTEND-STATE.md` §2's own second trigger.

/** The state that every request starts from, and the one nothing caches. */
const LOADING: BarSeriesView = { state: "loading" };

/**
 * One minute — the interval a bar covers, and the floor between two refills.
 *
 * Spelled here rather than imported because it is being used as *the shortest
 * time in which two different minutes can be lost*, which is a fact about the
 * feed rather than about a bar's geometry.
 */
const BAR_INTERVAL_MS = 60_000;

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
   * Everything one screen is showing, as one value (Task 2.13.7).
   *
   * `view` above is the answer to the request being made *now*; three of its
   * six members carry no picture, and on a window change what is **drawn** is
   * then the previous window's answer. `held-series.ts` carries the rule and
   * the argument for why it is not a seventh union member.
   *
   * `screen.view` is `view`, by construction and not by coincidence — one
   * function builds this and there is no other way to obtain one, so the two
   * cannot drift. `view` stays on this interface because it is what a consumer
   * that only reports on the request wants, and because every call site that
   * predates Task 2.13.7 means exactly that.
   */
  readonly screen: BarSeriesScreen;

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
/**
 * What to paint for a key before anything has been asked for it.
 *
 * A held answer **marked stale**, or `loading` if we hold nothing. The mark and
 * the read are one expression on purpose: `FRONTEND-STATE.md` §2's rule is that
 * every read of this cache is accompanied by a request, so an entry can only
 * ever be on screen with a request already in flight behind it — which is
 * precisely what the mark claims. Setting the flag anywhere else would be a
 * second place that has to remember the rule.
 *
 * Both call sites below go through here, and they are the only two reads of
 * the cache in the application: the first commit of a mount, and the commit
 * after the request changes.
 */
function held(key: string): BarSeriesView {
  const entry = barSeriesCache.read(key);
  return entry === undefined ? LOADING : toStaleBarSeriesView(entry);
}

export function useBarSeries(
  request: BarSeriesRequest,
  /**
   * The security's latest live observation, when this page has one.
   *
   * **A second parameter rather than a field on the request** (Task 3.9.2).
   * `BarSeriesRequest` is what `barSeriesQuery` turns into a URL and what the
   * cache is keyed on — a live bar is neither, and putting it there would make
   * every arriving minute look like a different request to the layer whose one
   * job is to notice when the request changes.
   */
  live?: Bar,
  /**
   * How many times the live feed has come **back** on this page (Task
   * 3.10.7) — `LiveFeedView.resumes`.
   *
   * A third parameter rather than a field on the request, for the same reason
   * `live` is one: it is not part of the request's spelling, and putting it in
   * `BarSeriesRequest` would make a reconnection look to the key comparison
   * like a reader asking for a different window.
   *
   * Optional, and `0` when omitted — a surface with no feed has nothing to
   * refill from.
   */
  resumes = 0,
  /**
   * The tape the socket's bars came from — `LiveFeedView.feed` (Task 3.10.8).
   *
   * It reaches `withLiveBars`, which decides whether the live tail extends
   * the stored stretch or opens one of its own. On this product's plan it
   * opens one: stored bars are consolidated SIP and the live stream is IEX.
   */
  liveFeed: MarketFeed | null = null,
): BarSeriesSource {
  const key = barSeriesQuery(request);

  const [pinned, setPinned] = useState<PinnedRequest>(() => ({ request, key }));
  // **One state object rather than two** since Task 2.13.7, and that is a shape
  // rather than a tidy-up: the view and the answer still on screen under it
  // move together on every transition, and two `useState`s updated in the same
  // callback are two places for the same off-by-one. It is also what keeps the
  // transitions pure — `held-series.ts` owns all three, none of them reads a
  // cache or a clock, and this file still adds an effect and nothing else.
  const [state, setState] = useState<BarSeriesState>(() => {
    // A held series paints in the **first** commit rather than one after it.
    // Reading the cache in an effect instead would render `loading` and replace
    // it a frame later, which is a flash of nothing on the way to something we
    // already had.
    const view = held(key);
    return toRequestedBarSeriesState({ view, held: null }, request, view);
  });

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
    // **The view is reset and the last answer is not**, which is the whole of
    // Task 2.13.7 at this line. A held answer for the *new* key is the right
    // thing to paint and becomes the held one; with nothing held for it, the
    // previous window's answer stays on screen under a rail that names it —
    // unless the **security** moved, in which case it is dropped, because the
    // old symbol's series under a new heading is the failure this whole layer
    // is careful about.
    setState((previous) =>
      toRequestedBarSeriesState(previous, request, held(key)),
    );
  }

  // `null` between requests, and otherwise the controller of the one request
  // whose answer this hook is waiting for.
  const current = useRef<AbortController | null>(null);

  /**
   * Whether a request is outstanding **right now** (Task 3.10.7).
   *
   * `current` cannot answer this: it holds the last controller for ever after,
   * so *is one in flight* and *was one ever started* are the same question to
   * it. The refill needs them apart — see {@link refill}.
   */
  const inFlight = useRef(false);

  const ask = useCallback(
    /**
     * @param quiet Whether a non-`ok` answer is **discarded** rather than
     *   rendered — see {@link refill}. `false` for every request a reader
     *   caused.
     */
    (quiet: boolean) => {
      // Supersession first: whatever was in flight is no longer the answer this
      // hook is waiting for. This is the same line for all four causes — a key
      // change re-creates this callback and re-runs the effect, a retry calls it
      // directly, a resume refill calls it directly, and a teardown does the
      // same two things in the cleanup below.
      current.current?.abort();

      const controller = new AbortController();
      current.current = controller;
      inFlight.current = true;

      const read = async (): Promise<void> => {
        const result = await getBarSeries(pinned.request, {
          signal: controller.signal,
        });

        // The teardown and window-change cases, when the fetch rejected in
        // time. Under `StrictMode` the development double-invoke aborts the
        // first mount's request immediately and it comes back here — designed
        // behaviour rather than something to suppress, and acceptance
        // criterion 3's rule that a cancelled result is never rendered as a
        // failure.
        if (result.outcome === "aborted") return;

        // The same two cases when it did not: a response that had already
        // resolved before it was superseded, which no amount of aborting
        // prevents. Identity rather than a boolean, because the question is
        // *is this still the request we are waiting for* and nothing else
        // answers it.
        if (current.current !== controller) return;

        // Only the owner reaches here, so this is *the* request finishing.
        inFlight.current = false;

        setState((previous) => {
          // **A refill that fails changes nothing** (Task 3.10.7). Nobody
          // asked for this request: it went out because a socket came back,
          // and the chart on screen is a correct answer to the reader's own
          // question. Turning it into `failed` would mean a page that was
          // working became an error message because the network blinked
          // twice — the global error screen `PRODUCT_SPEC.md` §36 forbids,
          // arriving locally. The hole simply stays until the next resume or
          // the next window change.
          //
          // **Unless there is nothing on screen to protect, which is the
          // correction.** Starting a request supersedes the one in flight, so
          // a resume landing before the FIRST answer does aborts it — and a
          // version of this that discarded its own failure unconditionally
          // left the page on `loading` with no answer coming and no way to
          // ask for one. Found by the browser suite at high load, where it
          // looked exactly like machine contention: the two specs that failed
          // are the two whose first answer is a failure, and the window this
          // needs is the one a loaded machine widens.
          //
          // So the rule is **keep what is on screen**, and `loading` is not
          // something on screen.
          if (
            quiet &&
            result.outcome !== "ok" &&
            previous.view.state !== "loading"
          )
            return previous;

          return toBarSeriesState(previous, pinned.request, result);
        });
      };

      void read();
    },
    [pinned],
  );

  const load = useCallback(() => {
    ask(false);
  }, [ask]);

  useEffect(() => {
    load();

    return () => {
      current.current?.abort();
      // Cleared as well as aborted, so an answer that had already resolved
      // cannot reach the state of a component that has gone.
      current.current = null;
    };
  }, [load]);

  /**
   * **Ask again because the feed came back, not because a reader did** (Task
   * 3.10.7).
   *
   * While the socket was down the minutes kept happening, and this page
   * watched none of them — so the series it holds has a hole in the middle
   * that no amount of live bars afterwards will close, because
   * `useLiveSeries` accumulates what **arrives** and nothing arrived.
   *
   * ## Why a refetch of our own store rather than a backfill
   *
   * The minutes are **not** missing from the store. Since Task 3.8.3 the
   * deployed backend writes every live bar as it lands, so the hole is a fact
   * about this browser's socket rather than about the data — which is why a
   * reader who *reloads* mid-session already gets the whole session back. The
   * fifteen-minute embargo, the ~3.3/s bucket and the `429` with no
   * `Retry-After` are all constraints on asking **Alpaca**, and this asks our
   * own server. The gap's extent is not computed either: the window is the
   * window, and the answer to it is whole.
   *
   * ## Why it does not go through `retry`
   *
   * `retry` marks the view `loading` on the way, which is right for a reader
   * who pressed something and wrong here: nobody asked, and ADR 0028's rule
   * that a wait over 160 ms covers the picture is about a wait a reader
   * caused. A socket that blinks every few minutes — 38 times in 4h 36m on
   * 2026-09-22 — must not pulse a panel over the chart each time. So the view
   * is left **exactly** as it is and replaced only when a better answer
   * lands.
   */
  /**
   * When the last refill went out, on the wall clock.
   *
   * **A floor, not a timer** (Task 3.10.7): nothing fires on this, it only
   * ever suppresses. See {@link refill} for why it is here and why the
   * interval is the bar interval rather than a number somebody liked.
   */
  const lastRefillAt = useRef(0);

  const refill = useCallback(() => {
    // **A refill never supersedes a request that is already running**, and
    // this line is the whole of a defect that took four bisecting runs to
    // attribute.
    //
    // Starting a request aborts the one in flight — which is right for a
    // reader who changed the window, and **wrong for a resume**: the request
    // already running is about to deliver the same fresh answer this one
    // wants. Worse, a socket that flaps produces a resume per reconnection,
    // and each refill aborted the one before it, so **nothing ever landed**:
    // the page sat on `loading` with no answer coming and no control to ask
    // for one.
    //
    // It reproduced only with two specs running together, which is why it
    // read as machine contention — the same diagnosis `docs/GAPS.md` records
    // being wrong three times in one session. What settled it was disabling
    // this one call and watching the flake stop.
    if (inFlight.current) return;

    // **And never more than once a minute, which is a floor rather than a
    // poll.** Nothing fires on this clock read; it only ever suppresses.
    //
    // The interval is `BAR_INTERVAL_MS` because that is what makes it not
    // arbitrary: **two reconnections inside one minute cannot have lost two
    // different minutes' bars**, so the second refill would ask for an answer
    // the first already has.
    //
    // It is here because an instrument written for this task found the
    // browser opening **three market-stream sockets in twelve seconds** on an
    // ordinary security page — on `main` as well, so it predates this work
    // (`docs/GAPS.md`). Without the floor, a socket that churns every four
    // seconds makes this a refetch every four seconds, which is the poll the
    // refetch policy above says this hook does not do.
    const now = Date.now();
    if (now - lastRefillAt.current < BAR_INTERVAL_MS) return;
    lastRefillAt.current = now;

    ask(true);
  }, [ask]);

  // **The edge, handled once.** `resumes` only ever increases, so remembering
  // the last one handled is what keeps a refill from firing again when the
  // callback identity changes for an unrelated reason — a window change, for
  // instance, which has already fetched the whole window itself.
  //
  // The ref is written from the effect rather than during render, which is the
  // React Compiler's `refs` rule and the reason this is not a `useMemo`.
  const filled = useRef(0);
  useEffect(() => {
    if (resumes === filled.current) return;
    filled.current = resumes;
    // `0` is *this page has never lost the feed*, which is the state nearly
    // every page is in for its whole life.
    if (resumes === 0) return;
    refill();
  }, [resumes, refill]);

  // The cache write, deliberately here rather than inside the `setState` above.
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
    if (isCacheableBarSeriesView(state.view))
      barSeriesCache.write(pinned.key, state.view);
  }, [state.view, pinned.key]);

  const retry = useCallback(() => {
    setState(toRetryingBarSeriesState);
    load();
  }, [load]);

  // **How long the current wait has lasted, which nothing else here knows**
  // (2026-09-14). The hook owns the timers; this owns the question it answers.
  // `loading` and nothing else: a refusal and a failure are answers a reader
  // sits in rather than waits through, and a pulse over either would claim
  // something is still coming.
  const pending = usePendingPanel(state.view.state === "loading");

  // **The live edge** (Task 3.9.2). `screen` is what is drawn, so this is where
  // the socket's bars join the fetched ones — one join, four readers, and the
  // rule that governs it is `live-series.ts`'s: replace in place by instant,
  // never append, because `toBarSeries` throws on two bars for one minute and a
  // correction arrives ~30 s after every bar it corrects.
  const screen = barSeriesScreen(state, pinned.request, pending);
  const shown = useLiveSeries(screen.shown, live, liveFeed);

  return {
    view: state.view,
    screen: withLiveEdge(screen, shown),
    retry,
  };
}
