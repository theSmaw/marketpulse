import {
  MARKET_STREAM_PATH,
  MARKET_STREAM_PROTOCOL_VERSION,
  decodeMarketStreamMessage,
  encodeMarketStreamClientMessage,
} from "@marketpulse/shared";

import { apiBaseUrl } from "../api-base-url.js";
import type { LiveFeedEvent } from "./live-feed.js";

// The browser's side of the market socket — **the only file in this
// application that opens one** (Task 3.3.4).
//
// `api-client.ts` is the only file that calls `fetch`, and that is a stated
// property of this repository rather than a habit. A socket is a second network
// boundary and gets the same treatment: one module, one place that knows the
// address, and everything above it holding domain state. `live-feed.ts` decides
// what the messages MEAN and has never heard of a URL.
//
// ## What this file does not do
//
// **It does not reconnect, and that is a defect with a date on it rather than a
// permanent arrangement.** A transport is exactly where somebody adds a loop
// without noticing it is a policy — so there is none here.
//
// **The owner changed on 2026-09-19 and the reason is worth keeping.** This
// comment used to defer to Story 3.10 citing §8.2's `406 connection limit
// exceeded` and §8.7's measurement that an immediate reconnect carries no
// penalty. **Both of those are facts about the ALPACA socket**, which is
// outbound, vendor-limited and rate-limited. This socket is none of those
// things: it is inbound to our own gateway, and the gap a reconnection leaves
// is filled by a snapshot rather than by a historical fetch against a
// fifteen-minute embargo.
//
// Citing the wrong socket's constraints scheduled a cheap fix with an expensive
// one, and the cost is live: **every backend deploy leaves every open tab
// reading `DISCONNECTED` until somebody reloads.** The gateway even sends
// `1001 going away` (§12.2) — a browser can tell a deploy from a broken network
// before choosing how eagerly to retry, and nothing reads that yet.
//
// **Story 3.5 owns it**, because it owns the snapshot a reconnecting browser
// needs. Story 3.10 keeps the upstream half, where those measurements apply.
//
// **It does not interpret.** Every message becomes a `LiveFeedEvent` and goes
// up. The one judgement made here is `unreadable`, and it is not a judgement
// about the message so much as a refusal to throw on one.

/**
 * Where the socket lives, derived from the one build-time origin.
 *
 * **The address is a build-time literal**, which is the existing consequence of
 * every frontend value rather than a new one: a deployed bundle cannot be
 * pointed at a different backend without a rebuild (`api-base-url.ts`, ADR
 * 0006 §6). The **path** comes from `packages/shared` so that the two halves
 * cannot drift; only the scheme swap happens here.
 *
 * `https` → `wss` and `http` → `ws`, by prefix rather than by replacement,
 * because a bare `.replace("http", "ws")` also rewrites a host containing the
 * letters — and a deployment whose hostname happens to contain `http` is the
 * kind of thing nobody finds until it is live.
 */
export function marketStreamUrl(origin: string): string {
  const socketOrigin = origin.startsWith("https:")
    ? `wss:${origin.slice("https:".length)}`
    : origin.startsWith("http:")
      ? `ws:${origin.slice("http:".length)}`
      : origin;

  return `${socketOrigin}${MARKET_STREAM_PATH}`;
}

/**
 * How a socket is actually made — **the one construction site in the
 * application**, and `pnpm invariants` holds it to that.
 *
 * It lives here rather than in the hook because the hook is not a network
 * boundary: it holds state about a connection somebody else opens. The first
 * draft put the default there and the new `one-home-for-the-socket` check went
 * red on its first run, which is the whole reason the check exists.
 */
const OPEN_SOCKET = (url: string): WebSocket => new WebSocket(url);

/**
 * `WebSocket.OPEN`, spelled as the number the platform defines it as rather
 * than read from the global.
 *
 * The test environment assigns a stub to `globalThis.WebSocket` that carries
 * no constants (`test-setup.ts`), and a `readyState` compared against
 * `undefined` would be a guard that never opens — silently, with every test
 * green, which is the shape this repository refuses.
 */
const OPEN = 1;

/** What the transport hands up. One callback, because there is one consumer. */
export type LiveFeedListener = (event: LiveFeedEvent) => void;

/** Everything the transport needs that is not a global. */
export interface MarketStreamOptions {
  /**
   * Monotonic now — `performance.now()` in production.
   *
   * An argument rather than a reading, for the reason the shared rule's inputs
   * are: it is what makes 165 s testable without waiting 165 real seconds.
   */
  readonly now: () => number;
  /**
   * How to open a socket. `WebSocket` in production.
   *
   * **A seam rather than a global**, for `api-client.ts`'s reason: the one
   * network primitive a module reaches for is the one thing a test has to be
   * able to replace, and a module-level `new WebSocket(...)` is a module a test
   * can only exercise by installing a global.
   */
  readonly open?: (url: string) => WebSocket;
}

/** A live socket, from the caller's side. */
export interface MarketStreamConnection {
  /** Close it. **Sends no close code**: §8.5, and the gateway knows anyway. */
  readonly close: () => void;
  /**
   * Tell the gateway which securities this browser wants (Task 3.5.6).
   *
   * **Safe to call before the socket opens** — it is buffered and sent on
   * `open` — because a caller should not have to know the socket's state to
   * express what it wants.
   */
  readonly subscribe: (symbols: readonly string[]) => void;
}

/**
 * Connect, and hand every message up as an event.
 *
 * Returns the connection. **It sends no close code**: §8.5 measured that a
 * close code carries no information a receiver can act on, and the one this end
 * would send says nothing the gateway does not already know.
 */
export function connectMarketStream(
  listen: LiveFeedListener,
  { now, open = OPEN_SOCKET }: MarketStreamOptions,
): MarketStreamConnection {
  const socket = open(marketStreamUrl(apiBaseUrl));

  // **The subscription is re-asserted on every socket, not once per page.**
  // A reconnect is a NEW socket the gateway knows nothing about (Task 3.5.5),
  // so a browser that sent its symbols once would come back connected, say
  // `LIVE`, and receive nothing — which looks healthy and is worse than the
  // `DISCONNECTED` it replaced. It is the same shape §8.7 forced on the
  // upstream client, which re-asserts its constant across every reconnect.
  let wanted: readonly string[] | undefined;

  /**
   * Send the subscription **only while the socket can take it**, and read that
   * from the socket rather than from a flag (Task 3.6.5).
   *
   * ## The defect this replaces blanked the whole application
   *
   * The first shape was an `opened` boolean set on `open` and never cleared.
   * After the gateway closed the socket — a deploy's `1001`, in a browser
   * spec — the flag still read `true`, and a subscription change arriving in
   * the 500 ms before the retry dialled called `send` on a socket in the
   * `CLOSING` state. `WebSocket.send` **throws** for that, the call came from
   * a React effect, an effect's throw is a render error, and the root has no
   * boundary above `App`: **the page went blank** until a reload. Found by
   * `market-reconnect.spec.ts` on 2026-09-22, three tests at once.
   *
   * `readyState` is the socket's own answer and it is right at every moment
   * the flag was wrong. A subscription that arrives while the socket is not
   * open is kept in `wanted`, and the next socket re-asserts it on `open` —
   * which is what `use-live-feed.ts` already relies on for every reconnect.
   */
  const sendSubscription = (): void => {
    if (wanted === undefined || socket.readyState !== OPEN) return;
    socket.send(
      encodeMarketStreamClientMessage({
        type: "subscribe",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        symbols: wanted,
      }),
    );
  };

  socket.addEventListener("open", () => {
    sendSubscription();
    listen({ kind: "opened", at: now() });
  });

  socket.addEventListener("message", (event: MessageEvent<unknown>) => {
    const at = now();

    // A browser can be handed a `Blob` or an `ArrayBuffer` as readily as a
    // string, and neither is a protocol error on our side — the gateway sends
    // text. Anything else is `unreadable` rather than a crash, which is the
    // same call `decodeMarketStreamMessage` makes about its own input.
    if (typeof event.data !== "string") {
      listen({ kind: "unreadable", reason: "not text", at });
      return;
    }

    const decoded = decodeMarketStreamMessage(event.data);

    // **A frame this bundle has no type for is DROPPED, not counted** (Task
    // 4.2.4). It is neither a message nor a defect: the deploy rolls the
    // backend first, so a tab left open on the previous bundle meets a
    // gateway sending a type it predates, and that tab is working perfectly.
    //
    // Counting it as `unreadable` would tick a field `LiveFeedView`
    // documents as *"Zero on every healthy deployment"*, and that field is in
    // `sameLiveFeedView` — so the count changing would re-render the whole
    // application on **every** such frame, indefinitely. Nothing is lost by
    // dropping it: a message this bundle cannot name is a message it has no
    // reader for.
    if (decoded.kind === "unsupported") return;

    listen(
      decoded.kind === "message"
        ? { kind: "message", message: decoded.message, at }
        : { kind: "unreadable", reason: decoded.reason, at },
    );
  });

  // **Both, and they are not the same event.** `error` fires without a close on
  // some failures and `close` fires without an error on others; collapsing them
  // here means the state above cannot be wrong about which happened, because it
  // is only ever told the one thing it can act on — the socket is gone.
  socket.addEventListener("error", () => {
    listen({ kind: "closed", at: now() });
  });

  // **The code travels since Task 3.5.5**, and only from `close`. §12.2 has the
  // gateway send `1001 going away` on shutdown, which is the difference between
  // *we are redeploying* and *your network died* — and the retry above reads it
  // to decide how eagerly to come back.
  socket.addEventListener("close", (event: CloseEvent) => {
    listen({ kind: "closed", at: now(), code: event.code });
  });

  return {
    close: () => {
      socket.close();
    },
    subscribe: (symbols) => {
      wanted = symbols;
      sendSubscription();
    },
  };
}
