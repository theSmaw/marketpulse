import { WebSocket } from "ws";

import { DISCONNECTED_AFTER_MS } from "@marketpulse/shared";
import type { FeedStatus, FeedStatusInputs, Ticker } from "@marketpulse/shared";

import {
  ALPACA_STREAM_FEED,
  ALPACA_STREAM_PROVIDER_ID,
  observationsIn,
  toMappedFrames,
} from "./alpaca-stream-mapping.js";
import type {
  MarketDataStream,
  StreamSubscriber,
  Unsubscribe,
} from "./market-data-stream.js";
import {
  advanceStreamConnection,
  feedStatusOf,
  initialStreamConnection,
  type StreamConnection,
  type StreamEvent,
} from "./stream-connection.js";

/**
 * The Alpaca IEX socket. **Transport only** — every decision this file makes
 * about *meaning* was made in `stream-connection.ts` (the state machine) or
 * `alpaca-stream-mapping.ts` (the frames), and this module's job is to turn
 * socket events into {@link StreamEvent}s and hand payloads to the mapper.
 *
 * ## Why `ws@8` and not Node's built-in `WebSocket`
 *
 * **A measurement, not a preference.** `LIVE-DATA.md` §4.6: the built-in client
 * can neither observe a server ping nor send a pong. §8.6 measured what this
 * server does about that — **it closes a client 5,999 ms after the first
 * unanswered ping.** Since §6.3 measured the server pinging every ~54 s, a
 * client on the global would be disconnected roughly **every 61 seconds, for
 * ever**, and would look like an unstable network rather than a wrong library.
 *
 * `ws` answers pings automatically, which is what we want here — the
 * rude-client probe that measured §8.6 had to pass `autoPong: false` to
 * *stop* it.
 *
 * ## What this file deliberately does not do
 *
 * - **No reconnection policy beyond `406`.** Story 3.10 owns backoff and the
 *   gap a reconnection leaves; §14.2 measured that what is missed while away is
 *   **gone**, so the repair is an HTTP backfill and cannot live here.
 * - **No resubscription protocol.** §8.7: the server remembers nothing across a
 *   reconnect and §10.2 makes the upstream set a **constant**, so reconnection
 *   re-sends a constant. A protocol here would be designing for a problem this
 *   epic does not have.
 * - **No current-state store.** Story 3.5's.
 * - **No universe-scale subscription.** A fixed handful; Story 3.5 scales it.
 */

/** The IEX stream. `sip` is refused by the plan (§4.5) and is not reachable. */
export const ALPACA_STREAM_URL = "wss://stream.data.alpaca.markets/v2/iex";

/**
 * How long to wait before retrying after `406 connection limit exceeded`.
 *
 * **This number is politeness, NOT penalty avoidance, and saying so is the
 * point.** §8.7 measured five back-to-back reconnections at
 * 717/709/709/722/694 ms, **every one authenticating** — the server does not
 * punish immediate retry. So there is no penalty to pay off, and a backoff
 * justified by one that does not exist is a number nobody can ever revisit.
 *
 * What it *is* for: not hammering a server while the incumbent finishes
 * leaving. §12.2 bounds that wait at the outgoing replica's
 * `SHUTDOWN_TIMEOUT_MS`, so a few seconds is the right order of magnitude and
 * anything longer just extends the new replica's own outage.
 */
export const REFUSED_RETRY_MS = 3_000;

/**
 * `WebSocket.OPEN`, spelled here rather than imported.
 *
 * The seam this client writes through is `WebSocketLike` — a test furnishes a
 * plain object, so reaching for the `ws` class's static would couple the guard
 * to the very dependency the seam exists to avoid. The value is fixed by the
 * WHATWG standard and is the same in `ws` and in a browser.
 */
const SOCKET_OPEN = 1;

/**
 * Three missed heartbeats. §6.3 measured 53.96–54.85 s across 82 intervals, and
 * §8.8 confirms inbound silence is the **only** signal for a half-open socket.
 * Re-exported so a caller configuring this client reads one number, not two.
 */
export { DISCONNECTED_AFTER_MS };

/** What the client needs from the world, passed in rather than reached for. */
export interface AlpacaStreamOptions {
  readonly keyId: string;
  readonly secretKey: string;
  /** A fixed handful. Universe scale is Story 3.5's. */
  readonly symbols: readonly Ticker[];
  readonly url?: string;
  /**
   * The clock, injected. **Monotonic in production** — see
   * {@link createAlpacaStream}'s note on why that is not a detail.
   */
  readonly now?: () => number;
  /**
   * Wall-clock now, epoch milliseconds. **Separate from {@link now} because the
   * two thresholds measure different things** — see `FeedStatusInputs`. This one
   * is only ever compared against an observation's own instant.
   */
  readonly wallNow?: () => number;
  /** Injected so a test can drive the watchdog without waiting 165 s. */
  readonly setTimer?: (fn: () => void, ms: number) => NodeJS.Timeout;
  readonly clearTimer?: (timer: NodeJS.Timeout) => void;
  /** Injected so the whole client is testable with no network. */
  readonly connect?: (url: string) => WebSocketLike;
  readonly onLog?: (event: StreamLogEvent) => void;
}

/** The slice of `ws` this client uses. A seam so a test needs no server. */
export interface WebSocketLike {
  send(data: string): void;
  close(code?: number): void;
  terminate?(): void;
  on(event: string, listener: (...args: readonly never[]) => void): unknown;
  readonly readyState: number;
}

/**
 * What an operator is told. **A class of failure, never a claim the wire cannot
 * support** — §8.3 measured `402` as byte-identical for a wrong key, a wrong
 * secret and no credential at all, so a log that claimed to distinguish them
 * would be inventing the distinction.
 */
export type StreamLogEvent =
  | { readonly kind: "authenticated"; readonly symbols: number }
  | { readonly kind: "subscribed"; readonly acknowledged: number }
  /** `402`. The honest sentence names the class and stops. */
  | { readonly kind: "credentials-refused" }
  /** `400`. Genuinely distinct, and the one an operator can act on. */
  | { readonly kind: "frame-rejected"; readonly code: number }
  /** `406`. Not fatal. Happens on every deploy by design. */
  | { readonly kind: "connection-limit"; readonly retryInMs: number }
  | { readonly kind: "unexpected-error-frame"; readonly code: number }
  /** No inbound frame for 165 s. The socket may still report OPEN (§6.4). */
  | { readonly kind: "liveness-watchdog-fired"; readonly silentForMs: number }
  | { readonly kind: "closed"; readonly elapsedMs: number }
  | { readonly kind: "closing-deliberately" };

/**
 * A live Alpaca IEX stream.
 *
 * **The clock is a parameter and the default is `performance.now()`, which is
 * monotonic — and that is load-bearing rather than tidy.** The watchdog decides
 * whether a connection is dead from elapsed time, so on a wall clock a laptop
 * that sleeps, or a host whose time is corrected by NTP, would **manufacture a
 * disconnection** out of an interval during which nothing was wrong. A
 * monotonic clock does not move when the machine is suspended, which is exactly
 * the behaviour wanted: the watchdog should measure *our* silence, not the
 * world's.
 */
const noop = (): void => undefined;

export function createAlpacaStream(
  options: AlpacaStreamOptions,
): MarketDataStream {
  const {
    keyId,
    secretKey,
    symbols,
    url = ALPACA_STREAM_URL,
    now = () => performance.now(),
    wallNow = () => Date.now(),
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (timer) => {
      clearTimeout(timer);
    },
    connect = (target) => new WebSocket(target),
    onLog = noop,
  } = options;

  let connection: StreamConnection = initialStreamConnection;
  let socket: WebSocketLike | undefined;
  let subscriber: StreamSubscriber | undefined;
  let watchdog: NodeJS.Timeout | undefined;
  let retry: NodeJS.Timeout | undefined;
  let closedDeliberately = false;
  let closeRequestedAt: number | undefined;

  const apply = (event: StreamEvent): void => {
    connection = advanceStreamConnection(connection, event);
    subscriber?.onConnectionChange(connection);
  };

  /**
   * Restart the liveness watchdog. Called on **every inbound frame**, which is
   * the whole of §6.4's lesson: not on `readyState`, which reported `OPEN` for
   * 4 h 21 min on a dead socket, and not on data, which is legitimately absent
   * for 76 minutes out of hours (§6.6) and 187 minutes for a thin security
   * inside a session (§11.2).
   */
  const armWatchdog = (): void => {
    if (watchdog !== undefined) clearTimer(watchdog);
    watchdog = setTimer(() => {
      const silentForMs = now() - (connection.lastInboundAt ?? now());
      onLog({ kind: "liveness-watchdog-fired", silentForMs });
      // The socket may well still claim to be OPEN. Ask it to close so the
      // close latency is measured (§8.5: ~30 s means it was already dead), and
      // report `disconnected` regardless of what it says.
      requestClose();
    }, DISCONNECTED_AFTER_MS);
  };

  const requestClose = (): void => {
    closeRequestedAt = now();
    try {
      socket?.close(1000);
    } catch {
      // A socket that throws on close is already gone. Nothing to do, and
      // nothing that justifies taking the process down: `PROVIDER.md` §8.5 —
      // a throw would say OUR program is wrong, and this is the vendor's.
    }
  };

  const handleMessage = (raw: string, from: WebSocketLike): void => {
    const at = now();
    const parsed: unknown = safeParse(raw);
    const frames = toMappedFrames(parsed, new Date(wallNow()).toISOString());

    // Drive the state machine from what the frames MEAN, not from the socket.
    for (const item of Array.isArray(parsed) ? parsed : []) {
      apply(toStreamEvent(item, at, from));
      routeErrorFrame(item);
    }

    armWatchdog();

    const observations = observationsIn(frames);
    if (observations.length > 0) subscriber?.onObservations(observations);
  };

  const routeErrorFrame = (frame: unknown): void => {
    const record = asFrame(frame);
    if (record.T !== "error" || typeof record.code !== "number") return;

    switch (record.code) {
      case 402:
        // §8.3: byte-identical across three causes. The honest sentence names
        // the class — *the feed would not accept our credentials* — and an
        // operator log that claimed more would be inventing it.
        onLog({ kind: "credentials-refused" });
        return;
      case 400:
        onLog({ kind: "frame-rejected", code: 400 });
        return;
      case 406:
        // **Not fatal, and this is the branch a deploy depends on.** §8.2: the
        // incumbent wins, a rolling replacement has two processes alive by
        // design, and the arriving one is us. A client that stopped here would
        // have no feed after every deploy until somebody restarted it by hand.
        onLog({ kind: "connection-limit", retryInMs: REFUSED_RETRY_MS });
        scheduleRetry();
        return;
      default:
        onLog({ kind: "unexpected-error-frame", code: record.code });
    }
  };

  const scheduleRetry = (): void => {
    if (retry !== undefined) clearTimer(retry);

    // **Close the incumbent before asking for its replacement.** §8.2's limit
    // is ONE connection, so a retry that leaves the refused socket open is
    // itself a cause of the `406` it is retrying — we would be the second
    // connection competing with our own first.
    requestClose();

    retry = setTimer(() => {
      if (!closedDeliberately) open();
    }, REFUSED_RETRY_MS);
  };

  const open = (): void => {
    const opened = connect(url);
    socket = opened;

    opened.on("open", () => {
      // Deliberately NOT a connected state (§4.5): `/v2/sip` opens and is
      // greeted identically before refusing at authentication.
      apply({ kind: "socket-opened", at: now() });
      armWatchdog();
    });

    opened.on("message", (data: unknown) => {
      handleMessage(String(data), opened);
    });

    // `ws` answers the server's ping automatically; this listener exists so the
    // heartbeat reaches the state machine as evidence of life.
    opened.on("ping", () => {
      apply({ kind: "heartbeat", at: now() });
      armWatchdog();
    });

    opened.on("close", () => {
      const elapsedMs = now() - (closeRequestedAt ?? now());
      onLog({ kind: "closed", elapsedMs });
      apply({ kind: "closed", elapsedMs, at: now() });
      if (watchdog !== undefined) clearTimer(watchdog);
    });

    opened.on("error", () => {
      // §4.2: an error EVENT from `ws` is a transport failure, distinct from an
      // error FRAME, which is a message about a request on a socket that stays
      // open. Neither is fatal here; the close handler reports the outcome.
    });
  };

  /**
   * Write to a socket only while it is `OPEN`.
   *
   * **The guard is the belt, and the argument is the braces.** A `send()` on a
   * `CONNECTING` socket throws SYNCHRONOUSLY in `ws`, and both of this
   * client's writes happen inside a `message` listener — so the throw escapes
   * the listener, reaches the process crash handler and takes the process
   * down. That is not a hypothesis: it ran six times in production between
   * 02:00Z and 06:00Z on 2026-09-19 and put the container into
   * `CrashLoopBackOff`, which then refused every rollout.
   *
   * Nothing a vendor's socket does justifies ending our process — the same
   * reasoning `requestClose` already carries (`PROVIDER.md` §8.5).
   */
  const sendTo = (target: WebSocketLike, payload: object): void => {
    if (target.readyState !== SOCKET_OPEN) return;
    try {
      target.send(JSON.stringify(payload));
    } catch {
      // A socket that throws on send is gone; the close handler reports it.
    }
  };

  const authenticate = (target: WebSocketLike): void => {
    sendTo(target, { action: "auth", key: keyId, secret: secretKey });
  };

  const subscribe = (target: WebSocketLike): void => {
    // `bars` AND `updatedBars` — the product subscribes revisions (§7.11), and
    // §14.1's trigger was evaluated and not fired.
    sendTo(target, {
      action: "subscribe",
      bars: symbols,
      updatedBars: symbols,
    });
  };

  /** The greeting and the acknowledgements drive the handshake forward. */
  const toStreamEvent = (
    frame: unknown,
    at: number,
    from: WebSocketLike,
  ): StreamEvent => {
    const record = asFrame(frame);

    if (record.T === "success" && record.msg === "connected") {
      // The server greets first (§4.1) — authenticating before it does is
      // writing into a socket that has not spoken.
      authenticate(from);
      return { kind: "greeted", at };
    }
    if (record.T === "success" && record.msg === "authenticated") {
      onLog({ kind: "authenticated", symbols: symbols.length });
      subscribe(from);
      return { kind: "authenticated", at };
    }
    if (record.T === "subscription") {
      const bars = record.bars;
      // §4.2: an empty subscription omits the key ENTIRELY rather than sending
      // `[]`, so this must not read `bars` unconditionally.
      const symbolCount = Array.isArray(bars) ? bars.length : 0;
      onLog({ kind: "subscribed", acknowledged: symbolCount });
      return { kind: "subscription-acknowledged", symbolCount, at };
    }
    if (record.T === "error" && typeof record.code === "number") {
      return { kind: "error-frame", code: record.code, at };
    }
    if (record.T === "b" || record.T === "u") {
      const observedAt = Date.parse(String(record.t));
      return {
        kind: "observations",
        observedAt: Number.isNaN(observedAt) ? at : observedAt,
        at,
      };
    }
    return { kind: "heartbeat", at };
  };

  return {
    id: ALPACA_STREAM_PROVIDER_ID,
    feed: ALPACA_STREAM_FEED,

    subscribe(
      _symbols: readonly Ticker[],
      target: StreamSubscriber,
    ): Unsubscribe {
      subscriber = target;
      closedDeliberately = false;
      open();

      return () => {
        closedDeliberately = true;
        onLog({ kind: "closing-deliberately" });
        if (watchdog !== undefined) clearTimer(watchdog);
        if (retry !== undefined) clearTimer(retry);
        requestClose();
        subscriber = undefined;
      };
    },

    status(inputs: FeedStatusInputs): FeedStatus {
      return feedStatusOf(connection, inputs);
    },

    connection(): StreamConnection {
      return connection;
    },
  };
}

/** A frame's fields as `unknown`, so reading one is explicit about its type. */
interface RawFrame {
  readonly T?: unknown;
  readonly msg?: unknown;
  readonly code?: unknown;
  readonly bars?: unknown;
  readonly t?: unknown;
}

const asFrame = (frame: unknown): RawFrame =>
  typeof frame === "object" && frame !== null ? frame : {};

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}
