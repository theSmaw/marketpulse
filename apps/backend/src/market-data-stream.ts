import type {
  Bar,
  BarSource,
  FeedStatus,
  MarketFeed,
  ProviderId,
  Ticker,
} from "@marketpulse/shared";

import type {
  FeedStatusInputs,
  StreamConnection,
} from "./stream-connection.js";

/**
 * The seam every **live** market-data source is read through (Task 3.2.2).
 *
 * ## Why this is a sibling of `MarketDataProvider` rather than a method on it
 *
 * `PROVIDER.md` §12 settles it with three arguments and they are not restated
 * here — read them there. The one-line version, because a reader arriving at
 * this file deserves to know what they are looking at: **a fetch is a request
 * with a deadline and a result; a subscription is long-lived, with connection
 * state and reconnection.** What the two share is the data and its provenance,
 * not their shape.
 *
 * It lives in `apps/backend/src` beside `market-data-provider.ts` and
 * **deliberately not in `packages/shared`**, for that file's own reason: the
 * frontend may know the *name* of a provider, because it renders it, and may
 * not know the *shape* of one. This describes a thing that holds a credential
 * and opens an authenticated vendor socket, and putting that in the browser's
 * type graph is how somebody eventually implements one there.
 *
 * ## Written before anything implements it, and that is checkable
 *
 * `MarketDataProvider`'s own comment states the test and it transfers whole:
 * **an interface extracted from a working client is a description of that
 * client; an interface written first is a constraint on it.** The test of
 * whether this file succeeded is not whether Task 3.2.5 *can* implement it —
 * anything can be implemented — it is whether 3.2.5 finds itself wanting to
 * change it. **Any such pressure belongs in 3.2.5's record rather than in a
 * quiet widening here.**
 *
 * ## What this interface is shaped by, and every line of it was measured
 *
 * Story 3.1 spent nine tasks reading this socket, and four of its findings are
 * the reason this file does not look like a `WebSocket` wrapper:
 *
 * 1. **A connection can die with no event at all** (`LIVE-DATA.md` §6.4) — a
 *    capture held `readyState === OPEN` for **4 h 21 min** on a dead socket. So
 *    {@link MarketDataStream.status} is **derived from when a frame last
 *    arrived**, never stored on connect, and `live` is not a thing an
 *    implementation may set.
 * 2. **The close code carries no intent** (§4.2, §8.5) — five causes, all
 *    `1006`, empty reason. Nothing in this interface exposes one.
 * 3. **A refused socket stays open** (§8.4) and **every error is a frame**
 *    (§4.2), so there is no `onError` that implies a disconnection.
 * 4. **`406 connection limit exceeded` is wait-and-retry, never fatal** (§8.2).
 *    A rolling deploy has two processes alive by design and the arriving one is
 *    ours, so an interface that made *the server refused me* terminal would
 *    guarantee no feed after every deploy.
 *
 * ## There is deliberately no retry, no reconnection policy and no store
 *
 * - **Retry** is `PROVIDER.md` §8.8's answer, unchanged: a **wrapper
 *   implementing this same interface**. A retry buried in a transport makes a
 *   caller's deadline a lie.
 * - **Reconnection policy and the gap a reconnection leaves** are Story 3.10's.
 *   This seam reports `disconnected` honestly and stops. §14.2 measured that
 *   what is missed while away is **gone** — 15 bars existed over HTTP and zero
 *   were delivered — so the repair is an HTTP backfill and cannot be a feature
 *   of this interface at all.
 * - **Holding current state for 518 securities** is Story 3.5's. This delivers
 *   observations; it does not remember them.
 */

/**
 * One thing the feed said about one security.
 *
 * ## Why a bar rather than a trade or a price
 *
 * `LIVE-DATA.md` §10.1 — decision 1, and it was forced by a measured cap rather
 * than chosen for elegance. `ALPACA.md` §1 measured the free plan's trade and
 * quote channels at **30 symbols**; minute bars are exempt and 1,500 were
 * accepted in 305 ms. **There is no version of trades that reaches 518.**
 *
 * **The product consequence, which Stories 3.4 and 3.10 are expected to quote:**
 * a live price is at most about a minute old for a liquid security, **may
 * legitimately be hours old for a thin one**, and both are the feed working
 * correctly. IEX covers 65.1% of minutes for a median symbol and **2.1% for
 * `ERIE`** (§7.6), and a quiet minute produces no frame at all rather than a
 * zero-volume bar (§7.2). A design assuming continuous movement will look
 * correct in a mock and dead in production.
 */
export interface LiveObservation {
  readonly symbol: Ticker;

  /**
   * The bar itself — **the same {@link Bar} a fetched bar maps to**, six fields
   * and `startsAt` marking the interval's **start**.
   *
   * `t` marks the start on the stream too, confirmed against an HTTP control in
   * §7.3 rather than assumed from `ALPACA.md` §5.3. A stream that disagreed
   * would put every live bar a minute out, silently, on every surface at once.
   */
  readonly bar: Bar;

  /**
   * Where this number came from, per-observation rather than per-stream.
   *
   * Invariant 6 is displayed and never implied, and provenance is **per series
   * rather than once for the product** (`PRODUCT_SPEC.md` §7.1) — a chart
   * stitched from stored bars and a live tail carries two. An implementation
   * declares {@link MarketDataStream.feed} standing; this is what actually
   * travels with the number.
   */
  readonly source: BarSource;

  /**
   * **Whether this replaces an earlier bar for the same `(symbol, minute)`.**
   *
   * The `updatedBars` case, and it is on the interface rather than left to a
   * mapper's convention because getting it wrong is silent in both directions:
   * a client that appends produces **two bars for one minute**, and one that
   * ignores revisions is **quietly wrong for ever**. Neither is what the owner
   * decided on 2026-09-17 (§7.11).
   *
   * Measured at universe scale in §14.1: **0.064%** of bars, arriving
   * **29.1–30.1 s** after the bar they correct, **35.3%** of them changing the
   * close, and **not one** changing nothing. So it is rare, bounded in time,
   * and always material — which is exactly the shape that gets skipped because
   * it almost never happens.
   *
   * **Where the superseding is applied is Story 3.5's**, not this seam's. This
   * field's only job is that the information survives the boundary.
   */
  readonly supersedes: boolean;
}

/** Cancels a subscription. Idempotent: calling it twice is not an error. */
export type Unsubscribe = () => void;

/**
 * What a subscriber is told. **Both are values, never throws** —
 * `PROVIDER.md` §8.5's line transfers: a result says what happened to a
 * request, a throw says the program is wrong.
 */
export interface StreamSubscriber {
  /** A batch of observations. Batched because the vendor batches (§7.2). */
  onObservations(observations: readonly LiveObservation[]): void;

  /**
   * The connection state changed.
   *
   * Carries the whole {@link StreamConnection} rather than only a
   * {@link FeedStatus} because §11.2 requires *our socket is fine and the feed
   * behind it is dead* to be sayable, and `status` alone cannot say **why**.
   * `GET /diagnostics/feed` (Task 3.2.8) is the reader this exists for.
   */
  onConnectionChange(connection: StreamConnection): void;
}

/**
 * A live market-data source.
 *
 * **No method throws "not implemented"** — acceptance criterion 1, and Task
 * 2.6.6 forbids it in as many words. An implementation that cannot do one of
 * these is the wrong shape rather than a partial one.
 */
export interface MarketDataStream {
  /**
   * Which implementation this is. A property rather than a method, matching
   * {@link MarketDataProvider.id}'s reasoning: it is a constant fact, and a
   * wrapper must report the id of the thing it *wraps*.
   */
  readonly id: ProviderId;

  /**
   * Which venues are in these numbers, declared **standing**.
   *
   * On the Alpaca stream this is `iex` and **nothing may make it `sip`** — the
   * free plan refuses a SIP socket with `409` at authentication (§4.5), so a
   * code path that could claim one is a code path that lies. On a replay it is
   * `replay`, whose words Task 3.2.1 shipped.
   */
  readonly feed: MarketFeed;

  /**
   * Begin delivering observations, and report connection state while doing so.
   *
   * Returns an {@link Unsubscribe} rather than exposing a `close()`, because a
   * caller's business is its own subscription and **the socket's lifecycle is
   * the process's** (§12.2) — opened at boot, never scheduled, closed
   * deliberately on `SIGTERM` so the every-deploy outage is bounded by the
   * existing shutdown ceiling rather than by §6.4's 4 h 21 min.
   *
   * **`symbols` is a fixed set for the life of the subscription.** §10.2
   * measured the upstream subscription as a **constant** — always the same 518 —
   * because §8.7 found the server remembers nothing across a reconnect, so
   * there is no resubscription protocol and no `addSymbol`. Story 3.5 owns
   * subscription management if that ever changes.
   */
  subscribe(
    symbols: readonly Ticker[],
    subscriber: StreamSubscriber,
  ): Unsubscribe;

  /**
   * The connection as last observed. **Derived on every call, never stored.**
   *
   * Takes {@link FeedStatusInputs} — `now` and whether the market is open —
   * rather than reading either, which is what keeps the thresholds testable
   * without waiting 165 real seconds and keeps the market-open gate Story 2.5's
   * rather than a second opinion.
   */
  status(inputs: FeedStatusInputs): FeedStatus;

  /** The full connection, for `GET /diagnostics/feed` and for an operator. */
  connection(): StreamConnection;
}
