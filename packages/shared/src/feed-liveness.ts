import { type FeedStatus } from "./feed-status.js";

/**
 * When a live feed counts as `live`, `stale` or `disconnected` — the rule, in
 * one place, for **both** sides of the wire.
 *
 * ## Why this is in `packages/shared` rather than beside either socket
 *
 * Two sockets apply it now. The backend's client watches Alpaca
 * (`stream-connection.ts`); the browser watches the gateway
 * (`market/live-feed.ts`). They see different events and share one rule, and
 * `LIVE-DATA.md` §11.2's two numbers are exactly the kind of fact this
 * repository refuses to write twice — the feed's *words* have been held to one
 * home by `pnpm break feed-words-in-a-renderer` since Story 2.6, and its
 * *thresholds* deserve the same treatment for the same reason.
 *
 * `stream-connection.ts` predicted the move in as many words: its inputs were
 * made **arguments rather than readings** so the module "would let this move
 * into `packages/shared`, where reading the wall clock is a lint error (ADR
 * 0017), without changing a line." That is what happened.
 */

/**
 * No inbound frame of ANY kind for this long means the connection is dead.
 *
 * Three missed heartbeats, from §6.3's measured 53.96–54.85 s across 82
 * intervals. §8.8 confirms it is the **only** signal available for a half-open
 * socket, which is the fault with no event at all — §6.4 held `readyState` at
 * `OPEN` for **4 h 21 min** on a socket that had died.
 */
export const DISCONNECTED_AFTER_MS = 165_000;

/**
 * Inbound frames current, but no observation this recently, **while the market
 * is open**, means the feed behind a healthy socket has stopped.
 *
 * §7.9 measured the longest in-session silence of any inbound frame at 8.6 s;
 * 60 s is 7× that and well under the 165 s above.
 */
export const STALE_AFTER_MS = 60_000;

/**
 * How much of the market an observation's own instant **opens rather than
 * closes** — and the reason this constant exists is a defect, found 2026-09-19
 * by Task 3.3.4 and fixed here.
 *
 * ## `live` was unreachable in session, which is 3.2.6's defect in a mirror
 *
 * §11.2 keys staleness on **the observation's own timestamp**, for a measured
 * reason: §6.7 caught `dailyBars` re-sending a byte-identical aggregate every
 * minute out of hours, and a rule keyed on *arrival* would have called that
 * liveness. That part is right and is unchanged.
 *
 * **But §7.3 measured that `t` marks the START of the interval**, with a
 * control and a verbatim frame — _"a bar stamped `14:01:00Z` arrives at
 * `14:02:00.5Z`"_. So the newest observation a minute-bar feed can possibly
 * hold is **60.5 s old at the instant it arrives**, and a bare
 * `wallNow - lastObservationAt >= 60_000` is therefore true **every time a
 * healthy feed delivers**. `live` could not be reached during a session at all.
 *
 * Both halves were in this repository's own record and neither section had been
 * read against the other — §11.2 cites §7.9's **8.6 s between frames**, which
 * is a fact about *arrival*, to justify a threshold applied to an *instant*.
 *
 * **The repair keeps §11.2's sentence and fixes its arithmetic.** An
 * observation describes an interval; it is not *late* until the interval it
 * describes has closed. So the age is measured from the interval's **end**, and
 * the 60 s of silence §11.2 specifies begins there.
 *
 * It is a minute because §10.1 chose minute bars. **A second timeframe on this
 * feed is this constant's reversal trigger**, at which point the duration
 * belongs on the observation rather than in a module constant.
 */
export const OBSERVATION_INTERVAL_MS = 60_000;

/**
 * The three facts a status is derived from, and nothing else.
 *
 * Deliberately **not** either socket's own state object: the backend's carries
 * a vendor handshake phase and Alpaca error codes, and the browser's carries
 * neither. What both can answer is these three, so these three are the rule's
 * input.
 */
export interface FeedLiveness {
  /** The socket is known to be gone. Not *has never opened* — see below. */
  readonly closed: boolean;
  /**
   * When ANY inbound frame last arrived — data or control — on the **monotonic**
   * clock, or `undefined` if nothing ever has.
   *
   * **Not `readyState`** (§6.4), and not *data*, which is legitimately absent
   * for 76 minutes out of hours (§6.6) and for **187 minutes** on a thin
   * security inside a session (§11.2).
   */
  readonly lastInboundAt: number | undefined;
  /**
   * The newest observation's **own instant** as epoch milliseconds — the start
   * of the interval it describes (§7.3) — or `undefined` if none has arrived.
   */
  readonly lastObservationAt: number | undefined;
}

/**
 * What {@link feedStatusFrom} needs from the world, passed in rather than read.
 *
 * ## Two clocks, because the two thresholds measure different things
 *
 * **This was one field until 2026-09-18, and it was wrong.** Task 3.2.6's
 * fixture stream produced a bar whose `observedAt` was an epoch instant while
 * `lastInboundAt` was a monotonic reading, and one `now` was subtracted from
 * both. An epoch millisecond is about `1.76e12` and a monotonic one starts near
 * zero, so the staleness comparison was hugely negative and **could never
 * fire**: the feed would have reported `live` or `disconnected` for ever and
 * never `stale`, silently, in production.
 *
 * - **Liveness is elapsed time since a frame arrived.** It must not move when
 *   the machine is suspended or when NTP corrects the clock, or a quiet laptop
 *   manufactures a disconnection. **Monotonic.**
 * - **Staleness is how old an observation's own instant is.** An instant only
 *   has meaning against the **wall clock**.
 *
 * Both are arguments rather than readings, which is what makes 165 s testable
 * without waiting 165 real seconds — and what makes this module legal in
 * `packages/shared`, where reading either clock is a lint error (ADR 0017).
 */
export interface FeedStatusInputs {
  /** Monotonic now — `performance.now()` in production. */
  readonly now: number;
  /** Wall-clock now as epoch milliseconds — `Date.now()` in production. */
  readonly wallNow: number;
  /**
   * Whether the market is open.
   *
   * **`stale` is gated on it and the gate is not optional** (§11.2): out of
   * hours the same socket is legitimately silent for **76 minutes** on bar
   * channels (§6.6), so an ungated 60 s rule would report a healthy overnight
   * feed as stale every minute of every night.
   */
  readonly marketOpen: boolean;
}

/**
 * The three words the product says about a connection, derived rather than
 * stored.
 *
 * **Derived is the point.** §6.4 is the reason this function exists at all: a
 * socket object reported `OPEN` for 4 h 21 min while dead, so `live` can never
 * be a flag something sets on connect. It is a conclusion drawn from *when a
 * frame last arrived*, every time it is asked.
 *
 * **The two questions §11.2 requires be separately sayable** both fall out of
 * this without a fourth word:
 *
 *  - *connected but nothing has arrived for 165 s* → `disconnected`, because
 *    inbound silence is the only thing that distinguishes a dead socket.
 *  - *our socket is fine and the market feed behind it is dead* → `stale`, with
 *    frames current and no observation inside the session.
 */
export function feedStatusFrom(
  { closed, lastInboundAt, lastObservationAt }: FeedLiveness,
  { now, wallNow, marketOpen }: FeedStatusInputs,
): FeedStatus {
  // Nothing has ever arrived, or the socket is closed: there is no evidence of
  // a live connection, and absence of evidence is exactly what this word means.
  if (closed || lastInboundAt === undefined) return "disconnected";

  if (now - lastInboundAt >= DISCONNECTED_AFTER_MS) return "disconnected";

  // Out of hours a silent feed is a working feed (§6.6). No gate, no `stale`.
  if (!marketOpen) return "live";

  if (lastObservationAt === undefined) return "stale";

  // **From the interval's END, not its start** — see OBSERVATION_INTERVAL_MS.
  // Keyed on the observation's own instant and never on a frame having arrived,
  // because §6.7 measured `dailyBars` re-sending a byte-identical aggregate
  // every minute and arrival-keyed staleness would call that liveness.
  const closedAt = lastObservationAt + OBSERVATION_INTERVAL_MS;

  return wallNow - closedAt >= STALE_AFTER_MS ? "stale" : "live";
}

/**
 * How bad each word is, so two answers about two connections can be combined.
 *
 * **There are two connections between a market venue and a person reading a
 * screen**, and the browser is downstream of both: the backend's socket to
 * Alpaca, and this browser's socket to the backend. Either can fail while the
 * other is perfect, and the chrome shows **one** word.
 */
const FEED_STATUS_SEVERITY: Readonly<Record<FeedStatus, number>> = {
  live: 0,
  stale: 1,
  disconnected: 2,
};

/**
 * The worse of two connection states.
 *
 * **A chain is as live as its weakest link, and saying otherwise is the lie
 * this story exists to avoid.** A browser whose own socket is healthy has
 * learned nothing about the market if the backend's feed is dead, and the
 * backend's last word of `live` is not evidence of anything once we can no
 * longer hear it.
 */
export function worseFeedStatus(a: FeedStatus, b: FeedStatus): FeedStatus {
  return FEED_STATUS_SEVERITY[a] >= FEED_STATUS_SEVERITY[b] ? a : b;
}
