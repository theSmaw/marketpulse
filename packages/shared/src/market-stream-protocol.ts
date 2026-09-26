import type { Bar } from "./bar.js";
import type { FeedStatus } from "./feed-status.js";
import { MARKET_FEEDS } from "./market-provenance.js";

import type { MarketFeed } from "./market-provenance.js";
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
}

/** Nothing observed and nothing stored. A true answer, not a degraded one. */
export interface WireUnknownFigure {
  readonly state: "unknown";
  readonly symbol: string;
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
   */
  readonly figures: readonly WireOverviewFigure[];
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

const storedFigureFields: WireFields<WireStoredFigure> = {
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
 * A figure to its wire object — **and the one place an omitted field is
 * actually omitted.**
 *
 * `toWire` walks the **map's** keys, so a key in the map is a key on the wire
 * whatever it holds — which is exactly the property that makes a leak
 * impossible and is therefore also the property that makes an optional field
 * unrepresentable through it. So the two optional fields are handled by name,
 * in **two branches** rather than by assigning `undefined`:
 * `exactOptionalPropertyTypes` is on, and `undefined` is not a JSON value —
 * `JSON.stringify` drops it from an object and writes `null` for it inside an
 * array, so a serialiser that returns one is a refactor away from putting a
 * `null` on a wire whose stated rule is that absence is omission.
 *
 * **The required half stays exhaustive.** `Omit` is what keeps that true: a
 * field added to {@link WireObservedFigure} lands in the omitted type and the
 * map fails to compile, naming it.
 */
const encodeFigure = (figure: WireOverviewFigure): JsonValue => {
  if (figure.state === "stored") return toWire(storedFigureFields, figure);
  if (figure.state === "unknown") return toWire(unknownFigureFields, figure);

  return {
    ...toWire(observedFigureFields, figure),
    ...(figure.changePercent === undefined
      ? {}
      : { changePercent: figure.changePercent }),
    ...(figure.changeBasis === undefined
      ? {}
      : { changeBasis: figure.changeBasis }),
  };
};

const overviewFields: WireFields<WireMarketOverview> = {
  computedAt: asIs,
  feeds: (feeds) => [...feeds],
  figures: (figures) => figures.map(encodeFigure),
};

const overviewMessageFields: WireFields<OverviewMessage> = {
  type: asIs,
  version: asIs,
  sentAt: asIs,
  overview: (overview) => toWire(overviewFields, overview),
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
    return {
      state: "stored",
      symbol,
      session: value.session,
      close: value.close,
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

  const figures: WireOverviewFigure[] = [];
  for (const entry of value.figures) {
    const figure = readFigure(entry);
    // One bad figure does not discard three good ones — `readObservations`'
    // rule, and the same reason: the frame is a batch.
    if (figure !== undefined) figures.push(figure);
  }

  return { computedAt: value.computedAt, feeds, figures };
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
      // **Neither a message nor a defect.** A type we do not know is a newer
      // gateway talking to an older bundle, which is an ordinary state during
      // every deploy — see {@link DecodedMessage}'s `unsupported` member for
      // what counting it as a defect costs.
      return {
        kind: "unsupported",
        type: typeof parsed.type === "string" ? parsed.type : "",
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
