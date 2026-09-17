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
 *
 * **Amended 2026-09-07 by Task 2.6.8, and every sentence above is still true
 * while its context is not.** From Story 1.5 to Story 2.6 the chrome's
 * `Market feed` region rendered one of these three words, hard-coded, and it
 * read `DISCONNECTED` — an invented status on a market product. Task 2.6.7
 * replaced it there with **provenance**: which feed this deployment is
 * configured to *read*, from `market-provenance.ts`, which is a different fact
 * and answers §7.1. So a reader arriving here today should not conclude the
 * header shows one of these words: it does not. The remaining consumers are the
 * landing route's render check and the workshop.
 *
 * **The type is not deprecated and must not be struck.** It is Epic 3's — a
 * live connection is exactly what it describes and exactly what does not exist
 * yet — and Epic 3 brings it back **beside** provenance rather than instead of
 * it, because "which venues are in these numbers" and "is the socket up" fail
 * independently. That is the same argument that made `BackendStatus` a second
 * type rather than three more members here.
 */
/**
 * **Amended 2026-09-17 by Task 3.1.8 — one sentence above is not observable,
 * and the three members are now numbers rather than words.**
 *
 * `stale` is glossed above as *"still connected, but the last update is older
 * than it should be"*. **"Still connected" is not a thing a client can see.**
 * Epic 3's spike held `readyState === OPEN` for **4 hours 21 minutes** on a
 * socket that had died — no error, no close, no reset
 * (`LIVE-DATA.md` §6.4). The only observable is **when the last inbound frame
 * arrived**, which is why the thresholds below are stated against that and
 * against nothing else.
 *
 * - `live` — the server's heartbeat is current, and in session an observation
 *   arrived within **60 s**
 * - `stale` — heartbeat current, **no observation for 60 s while the market is
 *   open**. Seven times the longest in-session silence ever measured (8.6 s,
 *   §7.9), and gated on the market clock because out of hours the same socket
 *   is legitimately silent for 76 minutes (§6.6)
 * - `disconnected` — **no inbound frame of any kind for 165 s**: three missed
 *   heartbeats, measured at 53.96–54.85 s across 82 intervals (§6.3)
 *
 * **These three describe the FEED and only the feed.** A *security* carries the
 * age of its observation and no status word at all — `LIVE-DATA.md` §11.2
 * measured the gap between one security's bars at a p50 of 1 minute and a
 * maximum of **187**, so no threshold can separate a quiet security from a
 * broken one. There is deliberately no fourth member for *never observed*: that
 * is an absence on a surface, not a state of the feed.
 */
export const FEED_STATUSES = ["live", "stale", "disconnected"] as const;

/** One of {@link FEED_STATUSES}. */
export type FeedStatus = (typeof FEED_STATUSES)[number];
