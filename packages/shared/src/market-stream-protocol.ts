import type { Bar } from "./bar.js";
import type { FeedStatus } from "./feed-status.js";
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
export const MARKET_STREAM_PROTOCOL_VERSION = 1;

/** The three message types, closed. */
export const MARKET_STREAM_MESSAGE_TYPES = [
  "snapshot",
  "bars",
  "feed",
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
   * Whether the market is open by the server's own calendar.
   *
   * On the wire so the browser does not keep a second copy of the trading
   * calendar's exception table. One fact, one home — and `stale` is gated on it
   * (§11.2), because out of hours the same socket is legitimately silent for
   * **76 minutes**.
   */
  readonly marketOpen: boolean;
}

export interface SnapshotMessage {
  readonly type: "snapshot";
  readonly version: number;
  /** Observed securities only. An absent key means **nothing observed**. */
  readonly observations: Readonly<Record<string, WireObservation>>;
  readonly feed: WireFeedState;
}

export interface BarsMessage {
  readonly type: "bars";
  readonly version: number;
  /** One upstream frame's worth. Batched because the vendor batches (§7.2). */
  readonly observations: Readonly<Record<string, WireObservation>>;
}

export interface FeedMessage {
  readonly type: "feed";
  readonly version: number;
  readonly feed: WireFeedState;
}

export type MarketStreamMessage = SnapshotMessage | BarsMessage | FeedMessage;

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
  observations: encodeObservations,
  feed: (feed) => toWire(feedStateFields, feed),
};

const barsFields: WireFields<BarsMessage> = {
  type: asIs,
  version: asIs,
  observations: encodeObservations,
};

const feedFields: WireFields<FeedMessage> = {
  type: asIs,
  version: asIs,
  feed: (feed) => toWire(feedStateFields, feed),
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
  | { readonly kind: "unreadable"; readonly reason: string };

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

  switch (parsed.type) {
    case "snapshot": {
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
          observations,
          feed,
        },
      };
    }
    case "bars": {
      const observations = readObservations(parsed.observations);
      if (observations === undefined) {
        return { kind: "unreadable", reason: "malformed bars" };
      }
      return {
        kind: "message",
        message: {
          type: "bars",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          observations,
        },
      };
    }
    case "feed": {
      const feed = readFeedState(parsed.feed);
      if (feed === undefined) {
        return { kind: "unreadable", reason: "malformed feed" };
      }
      return {
        kind: "message",
        message: {
          type: "feed",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          feed,
        },
      };
    }
    default:
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
