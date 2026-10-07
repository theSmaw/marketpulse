import type { Bar } from "./bar.js";
import type { FeedStatus } from "./feed-status.js";
import { MARKET_FEEDS } from "./market-provenance.js";

import type { MarketFeed } from "./market-provenance.js";
// The ladder's rungs, so this module can refuse a value that is not one of
// them. The back edge — `sector-ranking.ts` importing `WireOverviewFigure` from
// here — is **type-only** and is erased, so there is no runtime cycle.
import { isSectorLadderStep } from "./sector-ladder.js";

import type { SectorLadderStep } from "./sector-ladder.js";
import type { Ticker } from "./ticker.js";
import {
  asInstant,
  asIs,
  toWire,
  type JsonValue,
  type WireFields,
} from "./wire-serialiser.js";

/**
 * What the backend says to a browser (Task 3.3.1).
 *
 * **Decided in Story 3.1 §11.1 and implemented here — not re-decided.** A
 * **snapshot on connect, then one message per upstream frame**. Three message
 * types, a `type` discriminant and a protocol version.
 *
 * **Amended 2026-09-26 (Task 4.2.4): there are FOUR.** `overview` carries the
 * first **derived** value this wire has ever held — an aggregate computed once
 * in the backend and sent identically to every browser — and the version was
 * deliberately **not** bumped: the deploy rolls the backend first, and a bump
 * makes a stale tab reject every frame rather than ignore one. See
 * {@link OverviewMessage} and `DecodedMessage`'s `unsupported` member.
 *
 * ## Why a snapshot at all, which is not an optimisation
 *
 * A browser connecting at 11:20 under deltas-only sees **nothing** until each
 * symbol's next bar — a median of **1 minute**, a p95 of **4**, and for `ERIE`
 * **187 minutes** (§11.2). Deltas-only is a blank screen for minutes and, for
 * the thin tail of the universe, most of a session. **The snapshot is what
 * makes the first paint honest.**
 *
 * ## Absence is expressed by OMISSION, and that is in the type
 *
 * The snapshot carries an entry for every security observed and **no entry at
 * all** for the rest — not a null, not a placeholder. Three reasons (§11.1) and
 * the third is the one that matters:
 *
 * - It is the shape the feed itself uses: a quiet minute produces **no frame**
 *   rather than a zero-volume bar (§7.2).
 * - The browser already holds the universe from `GET /securities`, so *in the
 *   universe and absent from the snapshot* is unambiguous without a second
 *   field.
 * - **It makes the empty case honest by construction.** After a restart the
 *   snapshot is `{}` — and that is the **true** answer, not a degraded one.
 *
 * Every field of {@link WireObservation} is **required**, so a security cannot
 * be present-but-empty. Omission is the only way to say *nothing observed*.
 *
 * ## No `staleSeconds` on the wire
 *
 * Every entry carries its observation's **own instant** and nothing derived. An
 * age is a **clock read wearing a different name**, and ADR 0017 forbids
 * `packages/shared` reading the wall clock. The browser has a clock; let it
 * subtract.
 *
 * ## A security gets NO status word
 *
 * §11.2 measured the gap between one security's consecutive bars at a p50 of
 * **1 minute** and a maximum of **187**. **No threshold separates a quiet
 * security from a broken one**, so there is no field here for one. `STALE`
 * beside a price is a judgement this product cannot support — a security
 * carries the age of its observation and the surface renders that.
 *
 * ## The server does not coalesce
 *
 * Measured rather than assumed: Alpaca already batches, so relaying frame for
 * frame is **at most ~16 messages a minute** (§9.5). A coalescing layer would
 * save almost nothing and would spend latency on a budget the provider has
 * already overrun — §7.4's 901 ms p95 against `PRODUCT_SPEC.md` §28's 250 ms.
 */

/**
 * The protocol version, on every message.
 *
 * A number rather than a string: the only question a reader asks is *is this
 * the one I understand*, and a semantic version invites a compatibility
 * conversation this product has not had. Bump it when a message's shape changes
 * in a way an older client cannot read.
 */
/**
 * Where a browser connects.
 *
 * **In the protocol rather than in the server** (moved here 2026-09-19 by Task
 * 3.3.4): the path is the one part of the address both halves must agree on,
 * and the frontend cannot import from `apps/backend`. Leaving it on the server
 * would have meant the browser spelling it a second time — the shape this
 * repository already refuses for the feed's words.
 *
 * The **origin** is not here and must not be: it is a build-time fact about a
 * deployment (`api-base-url.ts`), not a fact about the protocol.
 */
export const MARKET_STREAM_PATH = "/market-stream";

export const MARKET_STREAM_PROTOCOL_VERSION = 1;

/** The four message types, closed. */
export const MARKET_STREAM_MESSAGE_TYPES = [
  "snapshot",
  "bars",
  "feed",
  "overview",
] as const;

export type MarketStreamMessageType =
  (typeof MARKET_STREAM_MESSAGE_TYPES)[number];

/**
 * One security's latest observation, as it travels.
 *
 * **Every field is required**, which is what makes omission the only way to
 * express absence — see the module comment. A `Bar` is flattened rather than
 * nested because the wire is not the place to preserve an internal shape, and
 * the six fields are the ones `Bar` already has.
 */
export interface WireObservation {
  /** The interval's **start**, ISO 8601 — `t` unshifted (§7.3). */
  readonly startsAt: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

/**
 * The feed's state, as the chrome reads it.
 *
 * **Connection state and feed identity are different questions** and travel as
 * different fields — §11.2 requires *our socket is fine and the market feed
 * behind it is dead* to be sayable, and one word cannot say it.
 */
export interface WireFeedState {
  /** `live | stale | disconnected` — about the CONNECTION. */
  readonly status: FeedStatus;
  /** Which venues are in the numbers — about the DATA. `null` when none. */
  readonly feed: MarketFeed | null;
  /**
   * Whether the market is open **by the server's clock**.
   *
   * ## The reason this is on the wire, corrected 2026-09-19
   *
   * **It is NOT that the browser lacks the calendar.** A first draft of this
   * comment said so and was wrong: `packages/shared` exports
   * `marketSessionStateAt`, the frontend imports it, and
   * `use-market-clock.ts` **already calls it**. The browser keeps no second
   * copy of the exception table and never would.
   *
   * **The real reason is whose clock decides.** `marketSessionStateAt` takes an
   * instant (ADR 0017 — `packages/shared` may not read a clock), so the answer
   * is only as good as the clock supplied. A viewer whose machine is an hour
   * out would compute a different session state from the server's, and §11.2
   * **gates `stale` on this** — so a skewed browser clock would suppress or
   * invent a staleness warning about a feed the server can see perfectly well.
   *
   * **This is not the same as `staleSeconds`, which §11.1 refuses.** That is an
   * age the browser can compute from an instant we already send, and sending it
   * would be a clock read wearing a different name. This is a fact about **the
   * server's** view that the browser cannot derive, because it does not have
   * the server's clock.
   *
   * **The cost, stated:** the browser now has two answers to *is the market
   * open* — this one and `useMarketClock`'s — and they can disagree. They are
   * about different things (what the feed's gate used, versus what this viewer's
   * clock says) and **Task 3.3.4 must decide which drives the status**, rather
   * than discovering the divergence.
   */
  readonly marketOpen: boolean;
}

/**
 * **When the gateway sent this frame, by the gateway's own clock** — ISO 8601,
 * on every server message (Task 3.6.4, ADR 0033).
 *
 * ## The one field added after Story 3.3 froze the wire, and why
 *
 * `PRODUCT_SPEC.md` §28 publishes *server-received event → application state
 * under 250 ms p95*, and for four days three stories carried that sentence as
 * an acceptance criterion none of them could meet: the only instant a browser
 * received was {@link WireObservation.startsAt} — the minute the bar covers,
 * a fact about the **market** — so a browser could not time a journey whose
 * start was never stamped (`docs/GAPS.md` entry 12). This is the stamp.
 *
 * ## Four constraints, each of which is somebody's measured defect
 *
 * 1. **A new field, never a second meaning for `startsAt`.** That field is
 *    load-bearing in the identity block's qualifier, in the revision rule that
 *    stops the current market state walking backwards, and in every stored
 *    row. One name, one meaning.
 * 2. **A third clock reading, for measurement only.** The 165 s disconnection
 *    threshold is monotonic and the 60 s staleness threshold is wall clock,
 *    and `STREAM-SEAM.md` §3 records what merging them did. This reading
 *    joins neither: `pnpm invariants` asserts it never reaches
 *    `feed-liveness.ts`, `stream-connection.ts` or `live-feed.ts`.
 * 3. **Honest only as a distribution.** A server clock and a browser clock
 *    disagree, so one reading is skew as readily as latency and a negative one
 *    is skew by definition. Publish p50/p95 with n and the two ends named.
 * 4. **One per frame, not one per observation.** A frame carries up to 518
 *    securities; stamping each would be 518 copies of one instant. Measured
 *    on the wire: **36 bytes** a frame against a 58 KiB universe snapshot.
 *
 * **Stamped where the gateway SENDS**, per client, rather than where the
 * observation was made — so it is the start of the leg §28 names and not the
 * provider's, which §28 excludes.
 */
export interface SnapshotMessage {
  readonly type: "snapshot";
  readonly version: number;
  /** See the note above {@link SnapshotMessage}. */
  readonly sentAt: string;
  /** Observed securities only. An absent key means **nothing observed**. */
  readonly observations: Readonly<Record<string, WireObservation>>;
  readonly feed: WireFeedState;
}

export interface BarsMessage {
  readonly type: "bars";
  readonly version: number;
  /** See the note above {@link SnapshotMessage}. */
  readonly sentAt: string;
  /** One upstream frame's worth. Batched because the vendor batches (§7.2). */
  readonly observations: Readonly<Record<string, WireObservation>>;
}

export interface FeedMessage {
  readonly type: "feed";
  readonly version: number;
  /** See the note above {@link SnapshotMessage}. */
  readonly sentAt: string;
  readonly feed: WireFeedState;
}

/**
 * One security's place in the market overview, as it travels (Task 4.2.4).
 *
 * **A union with three members, because the backend's own join has three and
 * collapsing them on the wire would be the wire deciding a product question.**
 * `market-overview.ts` argues it at length: *we have heard nothing about SPY*
 * and *we hold no stored close for SPY* are different facts with different
 * remedies, and neither is a zero or a null price.
 *
 * ## `unknown` is a STATE, not an absence, and that is not a hole in §11.1
 *
 * This module's rule is that absence is expressed by **omission** — and it is
 * honoured here for every *field*: an unmeasurable change is omitted rather
 * than sent as `null`. `unknown` is the other thing: an entry saying *this
 * security is in the overview and we hold nothing about it*, which is the
 * state CI's store puts all 518 securities in and the true answer after a
 * restart. It is ADR 0029's three-member `StoredHistory` applied to a figure,
 * and it is also what carries the reporting **order** — a renderer cannot draw
 * four proxies in order from a map that omits the ones it knows nothing about.
 *
 * ## Each member has its own field map, and that is ADR 0031's actual demand
 *
 * `WireFields<T>` is a mapped type over `keyof T`, and `keyof` a union is the
 * **intersection** of its members' keys — so one map over the union would
 * cover `state` and `symbol` and let everything else through unexamined. The
 * encoder switches on `state` and uses the member's own map, which is
 * `encodeObservations`' reason one level in.
 */
export type WireOverviewFigure =
  WireObservedFigure | WireStoredFigure | WireUnknownFigure;

/** A security we have heard from. **The figure a person reads as *now*.** */
export interface WireObservedFigure {
  readonly state: "observed";
  readonly symbol: string;
  /**
   * The observation's own instant — the **start** of the minute it covers
   * (§7.3), ISO 8601.
   *
   * **Never `sentAt` and never `computedAt`.** It is a fact about the market;
   * those two are facts about this process. A renderer that showed a price
   * without it would be rendering Friday's close as today's, which is
   * `current-market-state.ts`'s property 2 carried across the wire.
   */
  readonly at: string;
  /** The observed close of that minute. */
  readonly price: number;
  /**
   * The move since the basis close, as a signed percentage — **omitted when
   * there is nothing to measure from**, never `null` and never `0`.
   *
   * Computed by `changeFromClose` in `packages/shared`, called by the backend
   * (Story 4.2 AC 2). The browser renders it and does not re-derive it: the
   * numerator is IEX and the denominator is the consolidated tape, and a
   * second implementation of that join is the ≈0.00% defect
   * `one-home-for-the-live-change` exists to refuse.
   */
  readonly changePercent?: number;
  /**
   * The session whose close the percentage was measured from, `YYYY-MM-DD`
   * market-local — **omitted when the basis has no session name**.
   *
   * That absence is `LiveChange.basis`'s own: the same-session case measures
   * from `previousClose`, which is a number with no date beside it, and a
   * caller renders *the previous close* rather than inventing a date.
   */
  readonly changeBasis?: string;
}

/**
 * A security we have heard nothing about, for which we hold a stored close.
 *
 * On IEX this is ordinary rather than broken (§7.6) and it is every security
 * for some minutes after a restart. **The session travels with the number**,
 * so a surface cannot show this price without the date it belongs to.
 */
export interface WireStoredFigure {
  readonly state: "stored";
  readonly symbol: string;
  /** The session the close belongs to, `YYYY-MM-DD` market-local. */
  readonly session: string;
  readonly close: number;
  /**
   * **That session's own close-to-close move**, as a signed percentage —
   * omitted when we hold no close before it (Task 4.3.4, the owner's Gate 1
   * decision).
   *
   * ## A different field from `changePercent`, on purpose
   *
   * `WireObservedFigure.changePercent` is live-against-a-close: what a market
   * screen means by *today*, and a number that moves while somebody watches
   * it. This one is **close-against-the-previous-close for a session that is
   * over** — it will never change again. They are the same units on the same
   * scale, which is what makes ranking one against the other honest, and they
   * are different claims, which is why reading them through one field name is
   * not. A renderer that reached for `changePercent` on a stored figure and
   * found one would print Friday's move as today's.
   *
   * ## Why the wire carries it at all
   *
   * The market is shut for roughly 80% of the week, and outside a session the
   * sector region is the only surface answering `EPIC.md`'s exit criterion.
   * Story 4.3's AC 1 asks for eleven sectors *ranked … from the store outside
   * one*, and with no move on this member that was unsatisfiable: a ranking
   * needs a key, and the alternative was ranking by close price, which is a
   * ranking of share prices.
   *
   * Computed by `changePercent` in `packages/shared/src/live-change.ts` —
   * the **same** function `/securities`' table has always used for this
   * figure, called once, by the backend. `one-home-for-the-live-change`'s
   * first clause is why: `previousClose` is read as a basis in exactly one
   * module.
   *
   * **Omitted rather than zero** when there is nothing behind it — a session
   * we hold one daily bar for. `0` there would claim the market did not move.
   */
  readonly sessionChangePercent?: number;
}

/** Nothing observed and nothing stored. A true answer, not a degraded one. */
export interface WireUnknownFigure {
  readonly state: "unknown";
  readonly symbol: string;
}

/**
 * **How broad the market's move is, as COUNTS** — the owner's Gate 1 decision
 * 1 for Story 4.4, and a two-member union because the question the count
 * answers changes when the bell rings.
 *
 * ## Counts, never percentages, and that is acceptance criterion 5 held by the
 * shape
 *
 * Three independently-rounded percentages do not sum to 100: at N = 466 with an
 * even split, `33.3 + 33.3 + 33.5 = 100.1`, and a reader can see that is wrong.
 * Three integers summing to {@link WireMarketBreadth} `measured` are exact at
 * every rounding because there is nothing to round. A surface may draw a
 * percentage **beside** a count; the wire carries no percentage at all, so there
 * is no second figure for one to disagree with.
 *
 * ## Why a labelled union rather than a `breadth` object with an optional
 * window
 *
 * **The market is shut for roughly 80% of the week**, so the second member is
 * the common path rather than an edge case, and the two counts answer different
 * questions: *how many of the names we have heard from in the last five minutes
 * are up* and *how many of the names we hold a close-to-close move for on the
 * last session we hold were up*. Those have different denominators and
 * different remedies, and a renderer must not draw one as the other —
 * `MarketOverviewEntry`'s three-member argument, one container out.
 *
 * ## Why the WINDOW travels on the frame
 *
 * The count is computed on the server and the sentence — *of the 503 companies
 * we track, N were heard from in the last 5 minutes* — is drawn in the browser.
 * Two spellings of `5` is one fact with two homes, and a rollback can put them
 * two values apart: a gateway from a previous image counting a different window
 * than the bundle's sentence names. `windowMinutes` is the producer's own
 * figure, so the sentence cannot be wrong about the count beside it.
 */
export type WireMarketBreadth = WireObservedBreadth | WireSessionBreadth;

/**
 * The fields both members carry: three buckets, the denominator they sum to,
 * and the size of the set that denominator is a part of.
 *
 * **`measured` is the sum, and that is a property of the producer's single
 * pass** rather than a claim this type can make — `market-breadth.ts`
 * accumulates the three and adds them, so the stated denominator and the
 * counted numerator cannot disagree. `readOverview` refuses a section
 * where they do, and refuses one whose `measured` exceeds its
 * {@link WireBreadthCounts.tracked} — the wire's two cross-field checks.
 *
 * **There is no fourth count**, and that is deliberate: *not heard from* is
 * `tracked − measured`, it is never labelled, and a figure beside `unchanged` is
 * the adjacency Story 4.4 exists to prevent — *unchanged* and *not heard from*
 * are different facts and a reader who meets them in one row of four cannot
 * tell which is which.
 */
interface WireBreadthCounts {
  /** Securities whose move is positive **at the precision the screen shows**. */
  readonly advancing: number;
  readonly declining: number;
  /**
   * Securities whose move rounds to zero at `PERCENT_DISPLAY_DECIMALS`.
   *
   * **Not *we heard nothing*.** `directionOf` is keyed on the displayed figure,
   * so a +0.004% move is counted here and its row prints `0.00%`; a security
   * nobody has heard from is in no bucket and outside `measured`.
   */
  readonly unchanged: number;
  /**
   * **N** — the number of securities the three counts are over, and the
   * denominator the surface must state.
   *
   * `0` is a true answer: *we counted and heard nothing*, which is CI's store
   * and every process for its first minutes. It is not the same as the whole
   * section being absent, which says *this gateway does not send breadth*.
   */
  readonly measured: number;
  /**
   * **The size of the set the count was taken over** — the 503 equities, and
   * the only place that figure crosses the wire (Task 4.4.5).
   *
   * ## Why it travels rather than being spelled in the browser
   *
   * `windowMinutes`' reason exactly, at the other end of the same sentence.
   * The region draws *not heard from* as `tracked − measured` below a rule, and
   * the quiet group's heading names the set — so without this field the browser
   * has to **type 503**, and one delisting makes a hard-coded figure a lie with
   * no symptom. The producer counts the set it was handed
   * (`entries.length` in `marketBreadth`), so the denominator and the
   * remainder drawn from it cannot be about a different universe from the one
   * the buckets were filled from.
   *
   * ## It is NOT a fourth count and it is never a bucket
   *
   * `tracked − measured` is *not heard from*, which is the union
   * `stored ∪ unknown`, and it is **never labelled** `unobserved` — a fourth
   * word beside three on the wire leaves nobody able to say which of the four
   * a reader is looking at. The three buckets still sum to {@link
   * WireBreadthCounts.measured} and nothing sums to this: the three partition
   * N, the remainder sits below a rule, and the two scales are deliberately
   * different (`The breadth ledger.dc.html` §03 and §10).
   *
   * **Added after `measured`, so a gateway from a previous image sends a
   * section without it.** `readBreadth` drops the whole section in that case,
   * which the region already draws — *this gateway does not send breadth* —
   * rather than defaulting to a figure this bundle would then be inventing.
   */
  readonly tracked: number;
}

/** A count over what the live feed has delivered inside a window. */
export interface WireObservedBreadth extends WireBreadthCounts {
  readonly basis: "observed";
  /**
   * How many minutes back *heard from* reaches, measured on each bar's **own
   * instant** against the aggregate's `computedAt`.
   *
   * Five, from Task 4.1.6's curve over 390 sampled minutes: a one-minute window
   * is structurally **0** (a bar arrives after the minute it describes has
   * ended), two minutes reads as a fault at 57.5% after lunch, and fifteen buys
   * 8.5 points and costs the word *live*.
   */
  readonly windowMinutes: number;
}

/** A count over the last completed session we hold closes for. */
export interface WireSessionBreadth extends WireBreadthCounts {
  readonly basis: "session";
  /**
   * The session every one of the three counts is about, `YYYY-MM-DD`
   * market-local — close-to-close, so it will never change again.
   *
   * **One session, filtering the numerator and the denominator together.** A
   * security whose latest stored close is an older session is in no bucket and
   * outside `measured`, because a count mixing two sessions' moves is a figure
   * about neither.
   */
  readonly session: string;
}

/**
 * The aggregate itself, **nested rather than spread over the envelope**.
 *
 * Two reasons, and the second is the one that bites. It gives ADR 0031's
 * field-map obligation somewhere to land — a nested object needs its own map
 * or `asIs` leaks whatever is hanging off it. And it gives the browser **one
 * reference** to hold and to gate a render on: `sameLiveFeedView` compares by
 * identity, and a fact spread over three envelope fields is three comparisons
 * somebody adds two of.
 */
export interface WireMarketOverview {
  /**
   * **When the aggregate was true**, by the server's clock — ISO 8601.
   *
   * ## A new field, never a second meaning for `sentAt`
   *
   * ADR 0033's first constraint, generalised: `sentAt` is when the gateway
   * *sent*, and they differ by the encode and the broadcast. What makes the
   * difference load-bearing rather than pedantic is the **cadence**: this
   * frame is built once per applied batch, so the figures are frozen between
   * bursts — bounded at about a minute during a session, and **unbounded when
   * the feed dies**. A surface that wants to say *these figures are as of …*
   * has to read this one; reading `sentAt` would report a dead feed's
   * afternoon-old aggregate as current.
   *
   * **It is not a clock a status is derived from.** `pnpm invariants` holds
   * both this word and `sentAt` out of `feed-liveness.ts`,
   * `stream-connection.ts` and `live-feed.ts`
   * (`the-send-instant-is-not-a-clock`).
   */
  readonly computedAt: string;

  /**
   * The distinct tapes behind the **observed** figures, in first-seen order.
   *
   * **Per frame for the tapes, per figure for the discriminant** — invariant
   * 6 displayed rather than implied, in `market-provenance.ts`'s own
   * vocabulary rather than a second spelling. The uncomfortable fact this
   * exists to state is that a change percentage here has an **IEX numerator
   * and a consolidated-SIP denominator**, and a bare `changePercent: 1.42` has
   * no way to say so.
   *
   * Empty when nothing has been observed, which is §11.1's `observations: {}`
   * — the **true** answer after a restart rather than a degraded one.
   */
  readonly feeds: readonly MarketFeed[];

  /**
   * One entry per security the overview is **about**, in the order it reports
   * them. An array rather than a map, because the order is the answer.
   *
   * **The four index proxies, and nothing else.** Eleven sector benchmarks
   * travel in {@link sectors} rather than here, and that is a decision with
   * two silent failure modes behind it: `market-proxies.ts` folds over this
   * whole array in **five** places, so sector ETFs joining it would move
   * `newest` and break `sharedBasis` and `sharedClosingSession` with ~~no
   * compile error and no test failure~~ — **amended 2026-10-07 by Task 4.4.1:
   * there is a test failure and a check failure now, and the argument above is
   * why they were written.** `overview-frame-sections.spec.ts` asserts, against
   * a frame recorded off this product's own server, that `figures` carries
   * exactly four; `each-overview-section-names-its-own-set` asserts that each
   * section's split is a **positive** membership test. The second exists
   * because the first is **blind today**: the join is handed only the fifteen,
   * so inverting the proxy filter returns a byte-identical array and the spec
   * passes 2/2. Widen the join — which Story 4.4 does — and the same inversion
   * puts **507** entries here, measured. The spec is the tripwire for the day
   * the flood is real; the check is the half that is red now — and the name
   * cannot be reused either,
   * because `readOverview` requires `figures` and a stale tab would decode the
   * frame as `unreadable`, re-rendering the application on every frame.
   */
  readonly figures: readonly WireOverviewFigure[];

  /**
   * The eleven sector benchmark ETFs, **in rank order** — a new section rather
   * than more entries in {@link figures} (Task 4.3.4).
   *
   * ## Why a section on this frame rather than a frame of its own
   *
   * `STORY.md`'s grain table, and the rule it states: *each region ships the
   * smallest thing that answers it*. Eleven figures is ~1.2 KB, ~19 KiB/min at
   * the vendor's rate, and is the only region where the naive per-figure
   * answer survives contact — breadth over 518 would be ~56 KB a frame and
   * ~875 KiB/min per browser, decoded on all five routes including `/replay`,
   * so breadth will ship **counts** and the movers will ship **the top N**.
   * One screen at one cadence carries one `computedAt`, and these figures are
   * derived from the same applied batch as the proxies by the same join.
   *
   * ## Optional on both ends, and the read side is the half that matters
   *
   * The deploy rolls the backend first, so an old bundle meeting a new gateway
   * is the ordinary case — but a **rollback pins a previous image**, so a new
   * bundle can legitimately meet an old gateway that sends no such section.
   * Absent means *this gateway does not send sectors*, which a renderer draws
   * as the region's reserved state rather than as eleven unknowns.
   *
   * **The order is the answer here too, and it is not the declared one.**
   * `rankSectorFigures` in `sector-ranking.ts` produces it, server-side, for
   * the reason Story 4.5 ranks server-side: a top-N in a browser means
   * shipping the ranking's input.
   */
  readonly sectors?: readonly WireOverviewFigure[];

  /**
   * The rung the sector bars are drawn against — `1 | 2 | 5 | 10`, the
   * **half-range** in percent.
   *
   * A scalar beside {@link sectors} rather than a field inside a wrapper
   * object, because wrapping an already-mapped union in an object adds an
   * ADR 0031 field-map obligation that a bare array does not.
   *
   * **It is state rather than a function of this frame**, which is the whole
   * of the owner's 2026-09-27 decision: it steps outward only within a session
   * and starts again at the opening bell, so two frames a minute apart can
   * carry different rungs and the later one is never smaller.
   * `sector-ladder.ts` holds the arithmetic and `sector-ladder-ratchet.ts` in
   * the backend holds the cell that remembers.
   *
   * **On the server, so every reader shares one scale.** A browser-side
   * ratchet is per-tab — two readers of the same market would see two scales —
   * and would be asked to step up to ~16 times a minute on the **subset** of
   * the eleven that happened to arrive in each frame.
   *
   * Omitted whenever {@link sectors} is, and read only beside it.
   */
  readonly sectorLadderStep?: SectorLadderStep;

  /**
   * **How broad the move is — counts over the 503 equities** (Task 4.4.4).
   *
   * ## REQUIRED on the producer and OPTIONAL here, which is the opposite of
   * {@link sectors}
   *
   * The wire is deliberately not internally uniform at this field, and the
   * reason lands on the screen rather than on the type. If breadth were
   * optional on the producer, a frame can arrive carrying figures and no
   * breadth — at which point the region's `waiting` is **false**, so the
   * 2,000 ms silence floor `useWaited` gives it never fires, and the panel
   * sits reserved and **silent for ever**. That is the defect Task 4.3.8
   * produced against `Sector performance`; required makes the state not exist
   * rather than needing a sentence nobody has written.
   *
   * **So the obligation is held one level in, by
   * `WireMarketOverviewInputs.breadth`, which is not optional**: the backend
   * cannot build a frame without a count. This property is optional because
   * the **read** side must tolerate its absence — the deploy rolls the backend
   * first, but a **rollback pins a previous image**, so a new bundle can
   * legitimately meet a gateway that never heard of breadth. Absent means
   * *this gateway does not send breadth*, which a renderer draws as the
   * region's reserved state.
   *
   * ## Absence is never expressed as zeros
   *
   * A section carrying `advancing: 0, declining: 0, unchanged: 0` is a
   * **claim** — *nothing in the market went up* — and it is `json-schema.ts`'s
   * measured trap arriving on a transport with no schema to blame: a
   * plausible, readable, wrong figure. `measured: 0` **with the basis saying
   * which question was asked** is the honest spelling of *we counted and heard
   * nothing*; the section's absence is the honest spelling of *this gateway
   * does not send breadth*. They are different states and they are spelled
   * differently.
   *
   * **A non-finite count drops the whole section**, never a field and never a
   * zero — in the serialiser, which is ADR 0031's own argument. See
   * `encodeBreadth`.
   */
  readonly breadth?: WireMarketBreadth;
}

/**
 * **The first DERIVED value this wire has ever carried** (Task 4.2.4) — every
 * other payload is a raw observation or a connection word.
 *
 * Sent on the observations path, on connect and on subscribe; **never from the
 * feed-state path and never on the keepalive**, which Task 4.1.6 measured at
 * ~332 frames a minute. `the-overview-frame-is-not-a-heartbeat` refuses it.
 */
export interface OverviewMessage {
  readonly type: "overview";
  readonly version: number;
  /** See the note above {@link SnapshotMessage}. */
  readonly sentAt: string;
  readonly overview: WireMarketOverview;
}

export type MarketStreamMessage =
  SnapshotMessage | BarsMessage | FeedMessage | OverviewMessage;

/**
 * **What a browser says to the gateway** (Task 3.5.6).
 *
 * ## A second union rather than a member of the first
 *
 * {@link MarketStreamMessage} is everything the **server** says. This is
 * everything a **browser** says, and they are deliberately different types:
 * a gateway that could receive a `snapshot`, or a browser that could decode a
 * `subscribe`, is a category error the compiler should refuse rather than a
 * case somebody has to remember not to write.
 *
 * The version field is shared, because a protocol mismatch after a deploy is
 * one fact about one wire regardless of which end noticed it.
 */
export interface SubscribeMessage {
  readonly type: "subscribe";
  readonly version: number;
  /**
   * The securities this browser wants observations for.
   *
   * **An empty list is legal and means exactly what it says** — a browser that
   * has not decided yet, or one on a screen that shows no prices. It receives
   * nothing, which is an ordinary state rather than an error: §11.1's omission
   * semantics applied to a subscription instead of to a snapshot.
   */
  readonly symbols: readonly string[];
}

/** Everything a browser can send. One member today, and a union on purpose. */
export type MarketStreamClientMessage = SubscribeMessage;

/** The client message types, closed. */
export const MARKET_STREAM_CLIENT_MESSAGE_TYPES = ["subscribe"] as const;

/**
 * **The close codes this product's own gateway sends, and the browser reads.**
 *
 * One fact with two ends, so it lives here rather than once in each — a
 * backend that picked a code and a browser that interpreted a different one
 * would be a protocol disagreement no test on either side could see.
 *
 * **This does not reopen §8.5.** That measured the *upstream* socket, where
 * five different causes all produced `1006` with an empty reason — a code
 * carrying no intent. These are ours, chosen deliberately, and a browser can
 * act on them.
 */
export const MARKET_STREAM_CLOSE = {
  /**
   * `1001 going away` — the gateway is shutting down (§12.2).
   *
   * The browser reads this as *coming straight back* and retries quickly.
   */
  goingAway: 1001,

  /**
   * `1013 try again later` — this browser was not reading (Task 3.5.7).
   *
   * **Deliberately not `goingAway`.** A slow client told *we are coming
   * straight back* returns in half a second, is still slow, and is dropped
   * again — the pair then spends the afternoon doing that. `1013` is the
   * registered code for *terminating due to a temporary condition*, which is
   * exactly what a full outbound buffer is, and the browser backs off.
   */
  slowClient: 1013,
} as const;

export function encodeMarketStreamClientMessage(
  message: MarketStreamClientMessage,
): string {
  return JSON.stringify({
    type: message.type,
    version: message.version,
    symbols: [...message.symbols],
  });
}

/**
 * Read what a browser sent.
 *
 * **A value rather than a throw**, for {@link decodeMarketStreamMessage}'s
 * reason: one malformed frame from one browser must not take a gateway serving
 * every other browser down, and §36 forbids collapsing rather than degrading.
 */
export function decodeMarketStreamClientMessage(raw: string): {
  readonly kind: "message" | "unreadable";
  readonly message?: MarketStreamClientMessage;
  readonly reason?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "unreadable", reason: "not JSON" };
  }

  if (!isRecord(parsed)) {
    return { kind: "unreadable", reason: "not an object" };
  }

  if (parsed.version !== MARKET_STREAM_PROTOCOL_VERSION) {
    return {
      kind: "unreadable",
      reason: `protocol version ${String(parsed.version)}, expected ${String(MARKET_STREAM_PROTOCOL_VERSION)}`,
    };
  }

  if (parsed.type !== "subscribe") {
    return {
      kind: "unreadable",
      reason: `unknown client message type ${JSON.stringify(parsed.type)}`,
    };
  }

  const symbols = parsed.symbols;
  if (!Array.isArray(symbols) || symbols.some((s) => typeof s !== "string")) {
    return { kind: "unreadable", reason: "malformed subscribe" };
  }

  return {
    kind: "message",
    message: {
      type: "subscribe",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      symbols: symbols as readonly string[],
    },
  };
}

// ---------------------------------------------------------------- serialising

const observationFields: WireFields<WireObservation> = {
  startsAt: asIs,
  open: asIs,
  high: asIs,
  low: asIs,
  close: asIs,
  volume: asIs,
};

/** A domain `Bar` to its wire form. The one place `startsAt` becomes a string. */
export function toWireObservation(bar: Bar): WireObservation {
  return {
    startsAt: asInstant(bar.startsAt),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

/**
 * A wire observation back to a domain `Bar` — the inverse of
 * {@link toWireObservation}, and **`undefined` when the instant cannot be
 * read**.
 *
 * ## Why it returns a value rather than throwing, and why it can return nothing
 *
 * `Date.parse` answers `NaN` for anything it cannot read, and a `Date` built
 * from `NaN` is an `Invalid Date` that **formats without complaining** — it
 * renders as the string `Invalid Date` on a price row, which is a defect that
 * reaches a screen rather than a log.
 *
 * And §10.3 is the reason there is no lenient branch: the rule the current-state
 * map exists under is that **every entry carries its own `startsAt`, and no
 * reader may render a price without reading it**. An observation whose instant
 * cannot be read cannot honour that rule, so it is **not an entry** — absence is
 * §11.1's answer and there is no second spelling of it.
 *
 * `decodeMarketStreamMessage` has already checked the prices with
 * `Number.isFinite` by the time anything calls this, which is why the instant is
 * the only thing left to fail on.
 */
export function fromWireObservation(
  observation: WireObservation,
): Bar | undefined {
  const startsAt = Date.parse(observation.startsAt);

  if (!Number.isFinite(startsAt)) return undefined;

  return {
    startsAt: new Date(startsAt),
    open: observation.open,
    high: observation.high,
    low: observation.low,
    close: observation.close,
    volume: observation.volume,
  };
}

const feedStateFields: WireFields<WireFeedState> = {
  status: asIs,
  feed: asIs,
  marketOpen: asIs,
};

const encodeObservations = (
  observations: Readonly<Record<string, WireObservation>>,
): JsonValue => {
  const wire: Record<string, JsonValue> = {};
  for (const [symbol, observation] of Object.entries(observations)) {
    wire[symbol] = toWire(observationFields, observation);
  }
  return wire;
};

const snapshotFields: WireFields<SnapshotMessage> = {
  type: asIs,
  version: asIs,
  sentAt: asIs,
  observations: encodeObservations,
  feed: (feed) => toWire(feedStateFields, feed),
};

const barsFields: WireFields<BarsMessage> = {
  type: asIs,
  version: asIs,
  sentAt: asIs,
  observations: encodeObservations,
};

const feedFields: WireFields<FeedMessage> = {
  type: asIs,
  version: asIs,
  sentAt: asIs,
  feed: (feed) => toWire(feedStateFields, feed),
};

/**
 * One map per member of {@link WireOverviewFigure}, because `keyof` a union is
 * the **intersection** of its members' keys.
 *
 * A single map over the union would type-check against `state` and `symbol`
 * alone and wave the rest of every member through — which is the leak ADR
 * 0031 describes, arriving through the type system rather than past it.
 */
const observedFigureFields: WireFields<
  Omit<WireObservedFigure, "changePercent" | "changeBasis">
> = {
  state: asIs,
  symbol: asIs,
  at: asIs,
  price: asIs,
};

const storedFigureFields: WireFields<
  Omit<WireStoredFigure, "sessionChangePercent">
> = {
  state: asIs,
  symbol: asIs,
  session: asIs,
  close: asIs,
};

const unknownFigureFields: WireFields<WireUnknownFigure> = {
  state: asIs,
  symbol: asIs,
};

/**
 * A figure to its wire object, or **`undefined` for a figure that cannot be
 * honestly encoded** — and the one place an omitted field is actually
 * omitted.
 *
 * `toWire` walks the **map's** keys, so a key in the map is a key on the wire
 * whatever it holds — which is exactly the property that makes a leak
 * impossible and is therefore also the property that makes an optional field
 * unrepresentable through it. So the two optional fields are handled by name,
 * in **two branches** rather than by assigning `undefined`:
 * `exactOptionalPropertyTypes` is on, and `undefined` is not a JSON value.
 *
 * ## The non-finite guard is HERE and not at the call site, and that is ADR 0031
 *
 * **Corrected 2026-09-26, after review, and the correction is this comment's
 * own prediction coming true one step early.** The first version said a
 * serialiser returning `undefined` was *"a refactor away"* from putting a
 * `null` on this wire — and it was not a refactor away, it was **one caller
 * away**: `JSON.stringify` writes `null` for a non-finite number, so
 * `changePercent: Infinity` reached the wire as `"changePercent":null` and
 * `price: NaN` as `"price":null`. The only thing preventing it was a
 * `Number.isFinite` check in `toWireMarketOverview`, **a different module in
 * a different package**, held there by convention.
 *
 * ADR 0031's whole argument is that a transport without a schema layer owes
 * its guarantee in the **serialiser** rather than at the call site, because
 * the call site is where the next author stands. So:
 *
 * - a non-finite **optional** number is **omitted**, which is a state the
 *   union already has words for — a true price with no measurable move;
 * - a non-finite **required** number makes the whole **figure** undefined,
 *   which is `readFigure`'s own rule at the other end of the wire: an entry
 *   that cannot carry its number is **not an entry**. A `"price":null` would
 *   be read as absent by a strict reader and as **`0`** by a lenient one, and
 *   `0` is a plausible price. This is `json-schema.ts`'s measured trap —
 *   *a `null` under `"number"` reaches the wire as `0`* — arriving on a
 *   transport that has no schema to blame.
 *
 * A change percentage is the most `Infinity`-prone number this product
 * produces: `live-change.ts` guards a zero basis twice and calls
 * `"+Infinity%"` the most alarming figure on the page.
 *
 * **The required half stays exhaustive.** `Omit` is what keeps that true: a
 * field added to {@link WireObservedFigure} lands in the omitted type and the
 * map fails to compile, naming it.
 */
const finiteOr = (value: number): number | undefined =>
  Number.isFinite(value) ? value : undefined;

const encodeFigure = (figure: WireOverviewFigure): JsonValue | undefined => {
  if (figure.state === "stored") {
    if (finiteOr(figure.close) === undefined) return undefined;

    // The completed session's move is **optional**, so it is spread in a
    // branch rather than carried by the map — `toWire` walks the map's keys and
    // a key in the map is a key on the wire whatever it holds, which is the
    // property that makes a leak impossible and an omission unrepresentable.
    // Non-finite is omitted for `changePercent`'s reason: a true close with no
    // measurable move is a state this union already has words for.
    const move =
      figure.sessionChangePercent === undefined
        ? undefined
        : finiteOr(figure.sessionChangePercent);

    return {
      ...toWire(storedFigureFields, figure),
      ...(move === undefined ? {} : { sessionChangePercent: move }),
    };
  }

  if (figure.state === "unknown") return toWire(unknownFigureFields, figure);

  if (finiteOr(figure.price) === undefined) return undefined;

  // `changeBasis` travels only with a percentage, here as well as in
  // `toWireMarketOverview`: a date describing a figure that is not there is
  // ADR 0029's false impression one field wide, and a non-finite percentage
  // has just made it not there.
  const percent =
    figure.changePercent === undefined
      ? undefined
      : finiteOr(figure.changePercent);

  return {
    ...toWire(observedFigureFields, figure),
    ...(percent === undefined ? {} : { changePercent: percent }),
    ...(percent === undefined || figure.changeBasis === undefined
      ? {}
      : { changeBasis: figure.changeBasis }),
  };
};

/**
 * An array of figures to its wire form — **extracted rather than copied**
 * (Task 4.3.4).
 *
 * The non-finite drop rule used to live inline in `overviewFields.figures`,
 * and the sectors section is the second array of the same union: copying the
 * closure would give one rule two homes, and the second is the one that gets
 * forgotten.
 *
 * **`flatMap` rather than `map`**, so a dropped figure is absent rather than a
 * `null` in the array — which is the same defect one container out.
 */
const encodeFigures = (figures: readonly WireOverviewFigure[]): JsonValue[] =>
  figures.flatMap((figure) => {
    const wire = encodeFigure(figure);
    return wire === undefined ? [] : [wire];
  });

/**
 * One map per member of {@link WireMarketBreadth}, for
 * {@link observedFigureFields}' reason at a second grain: `WireFields<T>` is a
 * mapped type over `keyof T`, and `keyof` a union is the **intersection** of
 * its members' keys — so a single map over this union would cover the three
 * counts, `measured` and `basis`, and wave `windowMinutes` and `session`
 * through **unexamined**. Those are the two discriminating fields, which makes
 * the one map over the union exactly the wrong map.
 *
 * Every field of both members is required, so there is no `Omit` here and a
 * field added to either member fails to compile naming itself.
 */
const observedBreadthFields: WireFields<WireObservedBreadth> = {
  basis: asIs,
  advancing: asIs,
  declining: asIs,
  unchanged: asIs,
  measured: asIs,
  tracked: asIs,
  windowMinutes: asIs,
};

const sessionBreadthFields: WireFields<WireSessionBreadth> = {
  basis: asIs,
  advancing: asIs,
  declining: asIs,
  unchanged: asIs,
  measured: asIs,
  tracked: asIs,
  session: asIs,
};

/**
 * The breadth section to its wire object, or **`undefined` for a count that
 * cannot be honestly encoded** — which drops the **whole section** rather than
 * a field.
 *
 * ## Why the whole section, and why `0` is the wrong answer
 *
 * `encodeFigure`'s rule says a non-finite **required** number makes the whole
 * figure undefined, because `JSON.stringify` writes `null` for a non-finite
 * number and a lenient reader turns that `null` into **`0`**. Every number here
 * is required and `0` is the most dangerous value any of them can take: `0`
 * under `advancing` is a plausible, readable, wrong figure saying *nothing in
 * the market went up*, and `0` under `measured` would divide every percentage a
 * surface derives. There is no partial breadth — two counts and a missing third
 * is not a count of anything — so the unit that is dropped is the section.
 *
 * The guard is **here** rather than at the call site for ADR 0031's reason: a
 * transport with no schema layer owes its guarantee where the encoding happens,
 * because the call site is where the next author stands. `market-breadth.ts`
 * therefore contains no `Number.isFinite`, deliberately — one rule, one home.
 */
const encodeBreadth = (breadth: WireMarketBreadth): JsonValue | undefined => {
  const counts = [
    breadth.advancing,
    breadth.declining,
    breadth.unchanged,
    breadth.measured,
    breadth.tracked,
  ];

  if (counts.some((count) => finiteOr(count) === undefined)) return undefined;

  switch (breadth.basis) {
    case "observed":
      return finiteOr(breadth.windowMinutes) === undefined
        ? undefined
        : toWire(observedBreadthFields, breadth);
    case "session":
      return toWire(sessionBreadthFields, breadth);
    default: {
      // Exhaustive: a third basis fails the build here rather than being
      // silently unserialisable, which is `encodeMarketStreamMessage`'s own
      // mechanism one container in.
      const unhandled: never = breadth satisfies never;
      return unhandled;
    }
  }
};

const overviewFields: WireFields<
  Omit<WireMarketOverview, "sectors" | "sectorLadderStep" | "breadth">
> = {
  computedAt: asIs,
  feeds: (feeds) => [...feeds],
  figures: (figures) => encodeFigures(figures),
};

/**
 * The aggregate to its wire object, with the **optional sector section spread
 * in a branch** — `encodeFigure`'s idiom one container out.
 *
 * The two optional fields cannot be keys of `overviewFields`, for the reason
 * that map's own note gives: `toWire` walks the map's keys, so a key in it is a
 * key on the wire whatever it holds. `exactOptionalPropertyTypes` is on and
 * `undefined` is not a JSON value.
 *
 * **The rung travels only with the figures it scales.** A ladder beside no
 * sectors is a scale for nothing — ADR 0029's false impression, one field wide,
 * and the same rule that keeps `changeBasis` from travelling without a
 * percentage.
 */
const encodeOverview = (overview: WireMarketOverview): JsonValue => {
  // Built outside the map and spread in a branch, like the sector section
  // below and for the same reason: `toWire` walks the **map's** keys, so a key
  // in the map is a key on the wire whatever it holds — which is the property
  // that makes a leak impossible and an omission unrepresentable through it.
  const breadth =
    overview.breadth === undefined
      ? undefined
      : encodeBreadth(overview.breadth);

  return {
    ...toWire(overviewFields, overview),
    ...(overview.sectors === undefined
      ? {}
      : { sectors: encodeFigures(overview.sectors) }),
    ...(overview.sectors === undefined ||
    overview.sectorLadderStep === undefined
      ? {}
      : { sectorLadderStep: overview.sectorLadderStep }),
    ...(breadth === undefined ? {} : { breadth }),
  };
};

const overviewMessageFields: WireFields<OverviewMessage> = {
  type: asIs,
  version: asIs,
  sentAt: asIs,
  overview: (overview) => encodeOverview(overview),
};

/**
 * A message to the string that goes on the wire.
 *
 * **The named serialiser §11.1 requires.** Never `JSON.stringify(message)` — a
 * field on the object and not on the type would reach the browser, and on a
 * socket nothing strips it.
 */
export function encodeMarketStreamMessage(
  message: MarketStreamMessage,
): string {
  switch (message.type) {
    case "snapshot":
      return JSON.stringify(toWire(snapshotFields, message));
    case "bars":
      return JSON.stringify(toWire(barsFields, message));
    case "feed":
      return JSON.stringify(toWire(feedFields, message));
    case "overview":
      return JSON.stringify(toWire(overviewMessageFields, message));
    default: {
      // Exhaustive: a fourth message type fails the build here rather than
      // being silently unserialisable, which is `createMarketDataProvider`'s
      // mechanism applied to a protocol.
      const unhandled: never = message satisfies never;
      return unhandled;
    }
  }
}

// ------------------------------------------------------------------- decoding

/**
 * What a decode produced. **A value, never a throw** — `PROVIDER.md` §8.5's
 * line, and the browser is the side that must not crash: a malformed message
 * from a server we wrote is a bug, but a browser that throws on one takes the
 * whole page down, which §36 forbids.
 */
export type DecodedMessage =
  | { readonly kind: "message"; readonly message: MarketStreamMessage }
  | { readonly kind: "unreadable"; readonly reason: string }
  /**
   * **A message type this bundle has never heard of** (Task 4.2.4) — neither a
   * message nor a defect, and the reason it is a third kind rather than a
   * reason on the second.
   *
   * ## The defect it removes, which is a stale tab's and not ours
   *
   * A deploy rolls the backend first, so for as long as somebody leaves a tab
   * open, a **previous bundle** meets a gateway sending a type it predates.
   * Under `unreadable` that tab counts every one of them in a field
   * `LiveFeedView` documents as *"Zero on every healthy deployment"* — and
   * `unreadable` is compared in `sameLiveFeedView`, so the count changing is a
   * **render of the whole application on every overview frame, indefinitely**.
   * The tab is not broken and nothing is wrong with the frame; the browser
   * simply has no use for it.
   *
   * **Bumping `MARKET_STREAM_PROTOCOL_VERSION` is the obvious-looking move and
   * is strictly worse**: the version is checked before the type, so a stale
   * tab would reject *every* frame rather than ignore one — losing its prices,
   * its feed word and its snapshot. It is deliberately unchanged.
   *
   * Counted by nobody and reported to nobody. `type` travels for a log line
   * only.
   */
  | { readonly kind: "unsupported"; readonly type: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * `Number.isFinite`, not `typeof === "number"`, for `alpaca-stream-mapping`'s
 * reason one layer over: `NaN` and `Infinity` are both `number`, both survive
 * `JSON.parse`, and both render as a blank or a broken axis rather than as an
 * error.
 */
const readObservation = (value: unknown): WireObservation | undefined => {
  if (!isRecord(value)) return undefined;
  const raw = value as Partial<Record<keyof WireObservation, unknown>>;
  if (typeof raw.startsAt !== "string") return undefined;
  if (
    !finite(raw.open) ||
    !finite(raw.high) ||
    !finite(raw.low) ||
    !finite(raw.close) ||
    !finite(raw.volume)
  ) {
    return undefined;
  }
  return {
    startsAt: raw.startsAt,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    close: raw.close,
    volume: raw.volume,
  };
};

const readObservations = (
  value: unknown,
): Readonly<Record<string, WireObservation>> | undefined => {
  if (!isRecord(value)) return undefined;
  const observations: Record<string, WireObservation> = {};
  for (const [symbol, entry] of Object.entries(value)) {
    const observation = readObservation(entry);
    // **One bad entry does not discard the message.** The vendor batches, so a
    // frame carries many securities; losing all of them because one is
    // malformed is the failure `alpaca-stream-mapping.ts` already refuses.
    if (observation !== undefined) observations[symbol] = observation;
  }
  return observations;
};

const readFeedState = (value: unknown): WireFeedState | undefined => {
  if (!isRecord(value)) return undefined;
  const raw = value as Partial<Record<keyof WireFeedState, unknown>>;
  if (typeof raw.status !== "string") return undefined;
  if (typeof raw.marketOpen !== "boolean") return undefined;
  if (raw.feed !== null && typeof raw.feed !== "string") return undefined;
  return {
    status: raw.status as FeedStatus,
    feed: raw.feed as MarketFeed | null,
    marketOpen: raw.marketOpen,
  };
};

/**
 * One figure, or `undefined` — **and a figure that fails is dropped rather
 * than defaulted**, which is `readObservation`'s rule one level out.
 *
 * `Number.isFinite`, never `typeof === "number"`: `NaN` and `Infinity` both
 * survive `JSON.parse`, and a **change percentage** is the most
 * `Infinity`-prone number this product produces — `live-change.ts` guards a
 * zero basis twice and calls `"+Infinity%"` the most alarming figure on the
 * page. A non-finite percentage is **omitted**, leaving a true price with no
 * measurable move, which is a state the union already has words for.
 */
const readFigure = (value: unknown): WireOverviewFigure | undefined => {
  if (!isRecord(value)) return undefined;
  if (typeof value.symbol !== "string") return undefined;
  const symbol = value.symbol;

  if (value.state === "unknown") return { state: "unknown", symbol };

  if (value.state === "stored") {
    if (typeof value.session !== "string") return undefined;
    if (!finite(value.close)) return undefined;
    // The completed session's move is optional and non-finite is absent — two
    // branches rather than one spread of a possibly-`undefined` value, for
    // `changePercent`'s reason below.
    const move = finite(value.sessionChangePercent)
      ? value.sessionChangePercent
      : undefined;
    return {
      state: "stored",
      symbol,
      session: value.session,
      close: value.close,
      ...(move === undefined ? {} : { sessionChangePercent: move }),
    };
  }

  if (value.state !== "observed") return undefined;
  if (typeof value.at !== "string") return undefined;
  if (!finite(value.price)) return undefined;

  // Two branches, not one spread of a possibly-`undefined` value:
  // `exactOptionalPropertyTypes` makes *absent* and *present as `undefined`*
  // different types, and only the first is what this wire means.
  const percent = finite(value.changePercent) ? value.changePercent : undefined;
  const basis =
    typeof value.changeBasis === "string" ? value.changeBasis : undefined;

  return {
    state: "observed",
    symbol,
    at: value.at,
    price: value.price,
    ...(percent === undefined ? {} : { changePercent: percent }),
    // A basis with no percentage would be a date describing a figure that is
    // not there, so it travels only with one.
    ...(percent === undefined || basis === undefined
      ? {}
      : { changeBasis: basis }),
  };
};

/**
 * Every readable figure in an array, **dropping the ones that are not**.
 *
 * One bad figure does not discard three good ones — `readObservations`' rule,
 * and the same reason: the frame is a batch. Extracted with the encoder for the
 * encoder's reason, since the sectors section is the second array of this
 * union.
 */
const readFigures = (values: readonly unknown[]): WireOverviewFigure[] => {
  const figures: WireOverviewFigure[] = [];
  for (const entry of values) {
    const figure = readFigure(entry);
    if (figure !== undefined) figures.push(figure);
  }
  return figures;
};

/**
 * The breadth section, or `undefined` — **and `undefined` is a state the region
 * already draws**, which is what makes dropping it safe.
 *
 * A frame from a **previous image** carries no `breadth` at all (a rollback
 * pins one), and an unreadable one is the same absence rather than a discarded
 * frame carrying four true prices — {@link readFigures}' rule and
 * `sectors`'.
 *
 * ## The two cross-field checks on this wire
 *
 * The three counts must sum to `measured`, and `measured` may not exceed
 * `tracked`. On the producer that is true by
 * construction — one pass, three accumulators and their sum — so a section
 * where it is false did not come from a producer this bundle understands, and
 * the figure it would draw is wrong rather than old. **Refusing it draws the
 * reserved state; accepting it draws a total a reader can see is wrong**, which
 * is acceptance criterion 5 at the browser's end of the wire.
 *
 * It is deliberately a check rather than a derivation: `measured` is not
 * recomputed here, because a surface stating a denominator it derived itself is
 * a second home for the count.
 */
const readBreadth = (value: unknown): WireMarketBreadth | undefined => {
  if (!isRecord(value)) return undefined;
  if (!finite(value.advancing)) return undefined;
  if (!finite(value.declining)) return undefined;
  if (!finite(value.unchanged)) return undefined;
  if (!finite(value.measured)) return undefined;
  // **A section with no `tracked` is a section from a previous image** — the
  // field joined this type in Task 4.4.5, after breadth had already shipped —
  // and it is refused rather than defaulted, for `windowMinutes`' reason one
  // field down: the remainder below the rule is `tracked − measured`, so a
  // bundle that invented the set size would draw a count of securities nobody
  // counted.
  if (!finite(value.tracked)) return undefined;

  const counts = {
    advancing: value.advancing,
    declining: value.declining,
    unchanged: value.unchanged,
    measured: value.measured,
    tracked: value.tracked,
  };

  if (
    counts.advancing + counts.declining + counts.unchanged !==
    counts.measured
  )
    return undefined;

  // **The second cross-field check, and it guards a figure rather than a
  // total**: *not heard from* is drawn as `tracked − measured`, and a negative
  // remainder is a count of securities that cannot exist. On the producer the
  // buckets are filled from the same array `tracked` is the length of, so
  // `measured <= tracked` holds by construction — a frame where it does not
  // did not come from a producer this bundle understands.
  if (counts.measured > counts.tracked) return undefined;

  if (value.basis === "session") {
    if (typeof value.session !== "string") return undefined;
    return { basis: "session", ...counts, session: value.session };
  }

  if (value.basis !== "observed") return undefined;
  // The window is what the sentence beside the count is written from, so a
  // count with no window is a count nobody can qualify — refused rather than
  // defaulted to a `5` this bundle would then be spelling itself.
  if (!finite(value.windowMinutes)) return undefined;

  return { basis: "observed", ...counts, windowMinutes: value.windowMinutes };
};

const readOverview = (value: unknown): WireMarketOverview | undefined => {
  if (!isRecord(value)) return undefined;
  if (typeof value.computedAt !== "string") return undefined;
  if (!Array.isArray(value.feeds)) return undefined;
  if (!Array.isArray(value.figures)) return undefined;

  // **Lenient about the vocabulary, strict about the shape.** An unrecognised
  // feed slug is invariant 6's caption problem and `bar-series-response.ts`
  // refuses one on the HTTP wire — here the only reader is a renderer that
  // looks the word up, so an unknown one is dropped rather than failing the
  // frame that carries four true prices.
  const feeds = value.feeds.filter((feed): feed is MarketFeed =>
    (MARKET_FEEDS as readonly string[]).includes(feed as string),
  );

  const figures = readFigures(value.figures);

  // **The sector section is optional on the READ side too**, and that is not
  // symmetry for its own sake: the deploy rolls the backend first, so a new
  // gateway meeting an old bundle is the ordinary case — but a **rollback pins
  // a previous image**, so a new bundle can legitimately meet a gateway that
  // sends no sectors. Absent stays absent; a present-but-unreadable section is
  // the same absence rather than a discarded frame carrying four true prices.
  const sectors = Array.isArray(value.sectors)
    ? readFigures(value.sectors)
    : undefined;

  // The rung is read **only beside the figures it scales**, which is the
  // encoder's own rule: a scale for nothing is ADR 0029's false impression one
  // field wide. An unrecognised rung is dropped rather than failing the frame —
  // `feeds`' leniency, for the same reason, since the only reader is a renderer
  // that would otherwise draw an axis nobody has reviewed.
  const step =
    sectors !== undefined && isSectorLadderStep(value.sectorLadderStep)
      ? value.sectorLadderStep
      : undefined;

  const breadth = readBreadth(value.breadth);

  return {
    computedAt: value.computedAt,
    feeds,
    figures,
    ...(sectors === undefined ? {} : { sectors }),
    ...(step === undefined ? {} : { sectorLadderStep: step }),
    ...(breadth === undefined ? {} : { breadth }),
  };
};

export function decodeMarketStreamMessage(raw: string): DecodedMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "unreadable", reason: "not JSON" };
  }

  if (!isRecord(parsed)) {
    return { kind: "unreadable", reason: "not an object" };
  }

  const version = parsed.version;
  if (version !== MARKET_STREAM_PROTOCOL_VERSION) {
    return {
      kind: "unreadable",
      reason: `protocol version ${String(version)}, expected ${String(MARKET_STREAM_PROTOCOL_VERSION)}`,
    };
  }

  // **A frame without a send instant is unreadable, whatever else it
  // carries.** The only thing that produces this protocol is our own gateway,
  // which stamps every frame; a frame with no stamp is a shape this product
  // does not send, and admitting it would make the field optional in every
  // reader — which is how a measurement-only field quietly becomes one that
  // is sometimes there. The check is the one `startsAt` gets: a string, and
  // whether it parses is the instrument's business rather than the reader's.
  //
  // Checked inside each known type rather than before the dispatch, so an
  // unknown type is still reported as an unknown type.
  const sentAt = typeof parsed.sentAt === "string" ? parsed.sentAt : undefined;
  const NO_SEND_INSTANT: DecodedMessage = {
    kind: "unreadable",
    reason: "no send instant",
  };

  switch (parsed.type) {
    case "snapshot": {
      if (sentAt === undefined) return NO_SEND_INSTANT;
      const observations = readObservations(parsed.observations);
      const feed = readFeedState(parsed.feed);
      if (observations === undefined || feed === undefined) {
        return { kind: "unreadable", reason: "malformed snapshot" };
      }
      return {
        kind: "message",
        message: {
          type: "snapshot",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt,
          observations,
          feed,
        },
      };
    }
    case "bars": {
      if (sentAt === undefined) return NO_SEND_INSTANT;
      const observations = readObservations(parsed.observations);
      if (observations === undefined) {
        return { kind: "unreadable", reason: "malformed bars" };
      }
      return {
        kind: "message",
        message: {
          type: "bars",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt,
          observations,
        },
      };
    }
    case "feed": {
      if (sentAt === undefined) return NO_SEND_INSTANT;
      const feed = readFeedState(parsed.feed);
      if (feed === undefined) {
        return { kind: "unreadable", reason: "malformed feed" };
      }
      return {
        kind: "message",
        message: {
          type: "feed",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt,
          feed,
        },
      };
    }
    case "overview": {
      if (sentAt === undefined) return NO_SEND_INSTANT;
      const overview = readOverview(parsed.overview);
      if (overview === undefined) {
        return { kind: "unreadable", reason: "malformed overview" };
      }
      return {
        kind: "message",
        message: {
          type: "overview",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt,
          overview,
        },
      };
    }
    default:
      // **Neither a message nor a defect — but only for a frame that NAMES a
      // type.** A type we do not know is a newer gateway talking to an older
      // bundle, which is an ordinary state during every deploy.
      //
      // **A frame with no type, or a type that is not a string, is us being
      // broken** (corrected 2026-09-26 after review). The first version
      // answered `unsupported` for anything that fell through, so
      // `{"version":1}` decoded as `{ kind: "unsupported", type: "" }` and
      // the browser dropped it silently — a malfunction of **our own
      // gateway** made invisible on every surface, where it had previously
      // been counted. Only a named type earns the forward-compatible
      // disposition; everything else falls through to `unreadable`, which is
      // what the count in `LiveFeedView` is for.
      if (typeof parsed.type === "string") {
        return { kind: "unsupported", type: parsed.type };
      }

      return {
        kind: "unreadable",
        reason: `unknown message type ${JSON.stringify(parsed.type)}`,
      };
  }
}

/** Convenience for a caller holding domain bars rather than wire ones. */
export function toWireObservations(
  bars: ReadonlyMap<Ticker, Bar>,
): Readonly<Record<string, WireObservation>> {
  const observations: Record<string, WireObservation> = {};
  for (const [symbol, bar] of bars) {
    observations[symbol] = toWireObservation(bar);
  }
  return observations;
}
