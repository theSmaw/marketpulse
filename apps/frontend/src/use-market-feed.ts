import type { MarketDataResponse, MarketFeed } from "@marketpulse/shared";
import { useEffect, useState } from "react";

import { getMarketData } from "./api-client.js";
import type { ApiResult } from "./api-client.js";

// Which market feed this deployment reads, fetched once (Task 2.6.7).
//
// The third hook, and it borrows `use-securities.ts`'s shape rather than
// `use-backend-health.ts`'s: state and effect here, rendering nowhere, and the
// client's seven outcomes collapsed onto a small named vocabulary with a reason
// per branch.
//
// ## Why this replaces a hard-coded value rather than adding a new one
//
// The chrome's `Market feed` region has rendered a hard-coded `DISCONNECTED`
// since Story 1.5, listed in `README.md` among the things a correct first run
// shows that read as faults. It was honest at the time — there was no market
// data and there still is none — but it is an **invented value in a status
// strip on a market product**, and this story is the one that knows what the
// true claim is.
//
// ## Fetched once, not polled, and it is a weaker fact than the universe
//
// `useBackendHealth` polls because a health state *changes*; that is the whole
// information the indicator carries. `useSecurities` fetches once because the
// universe changes a handful of times a year. This one changes when somebody
// **deploys**, which is strictly rarer than either — and unlike the universe it
// cannot change without the bundle changing too, because the vocabulary it
// speaks is inlined from `packages/shared`. A poll would be standing billable
// traffic against the Consumption plan's under-1,000-bytes-per-second idle
// condition, per open tab, to re-learn a fact that cannot have moved. A page
// reload is the refresh.
//
// ## Not a connection state, and never widening `FeedStatus`
//
// `FeedStatus` — `live | stale | disconnected` — is about a **live
// connection**, which is Epic 3's and does not exist. This is provenance: it is
// true whether or not anything is connected, and it is attached to the data
// rather than to a socket. Task 1.12.1 refused to widen `HealthStatus` into
// `BackendStatus` for exactly this shape and Task 1.12.4 then refused to widen
// `FeedIndicator` into a second indicator's job. Both arguments apply
// unchanged: **provenance is a third thing beside a status word, not a fourth
// member of one.**
//
// The eight-member `BarsResult` taxonomy is not a candidate either, and it is
// worth saying because both are about "the market feed". Those members —
// `rate-limited`, `upstream-unavailable`, `unauthorised` — are facts about
// **one request**, produced and consumed inside `apps/backend`. This reports a
// **standing configuration**, true before any request is made and still true
// while one fails, and the chrome makes no market-data request at all. Story
// 2.12 renders a failed fetch, beside the thing that failed to load.

/**
 * What this page currently knows about the market feed.
 *
 * **Four states as a discriminated union**, `SecuritiesView`'s precedent — and
 * for its stated reason, which is that the impossible combinations must not be
 * constructible. Three of them are facts about the deployment and one is a fact
 * about this browser, and keeping them in one union is what lets the renderer
 * render the member it is given rather than re-deriving which of three booleans
 * it is looking at.
 */
export type MarketFeedView =
  /**
   * No request has settled yet.
   *
   * `BackendIndicator`'s fourth *visual* case, arriving as a real union member
   * here rather than as a boolean beside a status. That difference is not
   * inconsistency: `BackendStatus` is a wire vocabulary with three members and
   * a fourth would have been a client-lifecycle fact leaking into it, whereas
   * this union is the client's own and has nothing to keep clean.
   */
  | { readonly state: "checking" }
  /**
   * No market-data provider is configured — the default, and the state this
   * task exists to render honestly.
   *
   * It is **not** a feed and deliberately has no entry in
   * `MARKET_FEED_DESCRIPTIONS`: it is a sentence about our own configuration
   * rather than about a market venue, and a feed table is not where a fact
   * about a deployment belongs. `MARKET_DATA_PROVIDER`'s default is `none`
   * because `fixture` serves invented prices, so this is what a correct first
   * run shows.
   */
  | { readonly state: "not-configured" }
  /** A provider is configured and this is which venues are in its numbers. */
  | { readonly state: "configured"; readonly feed: MarketFeed }
  /**
   * The configuration could not be read.
   *
   * One member for both producible causes, which is the same collapse
   * `SecuritiesFailure` makes and is narrower here because there is nothing to
   * act on differently: nothing arrived, or something arrived that was not this
   * API. **No `requestId`.** Task 1.12.2's rule is that an id may appear only
   * as a labelled reference beside a failure a user is being asked to report,
   * and this reports a *state* in a status strip — the same call
   * `BackendIndicator` makes.
   */
  | { readonly state: "unknown" };

/**
 * Collapse one of the client's seven outcomes onto the four states.
 *
 * `aborted` maps to **no state at all** — a torn-down effect is not a fact
 * about the service, so it leaves the previous state where it was. The caller
 * filters it too; this branch exists so the union stays exhaustively handled
 * and a new outcome cannot be added silently.
 */
function toMarketFeedView(
  previous: MarketFeedView,
  result: ApiResult<MarketDataResponse>,
): MarketFeedView {
  switch (result.outcome) {
    case "ok":
      // `feed === null` is exactly "no provider configured" — the contract's
      // own spelling, exact because every provider declares a feed.
      return result.data.feed === null
        ? { state: "not-configured" }
        : { state: "configured", feed: result.data.feed };

    // Everything that is not an answer is one state, including the case worth
    // knowing about: a feed slug this bundle has no words for arrives here as
    // `unreadable-body`, because the shared predicate refuses it rather than
    // letting a raw slug reach the screen.
    case "unreadable-body":
    case "api-error":
    case "http-error":
    case "timeout":
    case "unreachable":
      return { state: "unknown" };

    case "aborted":
      return previous;
  }
}

/**
 * Read the configured market feed, once, on mount.
 *
 * No `try`/`catch`, for the reason its absence is deliberate in both sibling
 * hooks: `getMarketData` never throws in any branch, so a rejection here would
 * be a bug in the client rather than a service that is down — and it is what
 * keeps a failure out of `ErrorBoundary` entirely, which is why "the chrome
 * stays usable" is structural rather than something the boundaries happen to
 * allow.
 */
export function useMarketFeed(): MarketFeedView {
  const [view, setView] = useState<MarketFeedView>({ state: "checking" });

  useEffect(() => {
    const controller = new AbortController();

    const read = async (): Promise<void> => {
      const result = await getMarketData({ signal: controller.signal });

      // The teardown case. Under `StrictMode` the development double-invoke
      // aborts the first mount's request immediately and it comes back
      // `aborted`, leaving the state alone — designed behaviour rather than
      // something to suppress.
      if (result.outcome === "aborted") return;

      setView((previous) => toMarketFeedView(previous, result));
    };

    void read();

    return () => {
      controller.abort();
    };
  }, []);

  return view;
}
