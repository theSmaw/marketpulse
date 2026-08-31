/**
 * The state of the market data feed, as far as anything reading it is
 * concerned.
 *
 * PRODUCT_SPEC.md §36 makes these product states rather than exceptions: "Live
 * feed disconnected — displaying data through 10:42:17" is data that is still
 * shown, still correct as of a stated time, and no longer live. None of these
 * three is an error, and none of them should collapse a screen.
 *
 * - `live` — updating as expected
 * - `stale` — still connected, but the last update is older than it should be
 * - `disconnected` — the feed is down; previously received data remains on
 *   screen, labelled with the time it was correct as of
 *
 * `stale` and `disconnected` are separated because the remedies differ and so
 * does what the interface can promise: a stale feed may catch up on its own,
 * a disconnected one will not until it reconnects.
 *
 * The name is domain and lives here; the presentation is `--feed-*` in
 * `apps/frontend/src/styles/market.css`.
 */
export const FEED_STATUSES = ["live", "stale", "disconnected"] as const;

/** One of {@link FEED_STATUSES}. */
export type FeedStatus = (typeof FEED_STATUSES)[number];
