import type { FastifyInstance } from "fastify";
import { WebSocketServer, type WebSocket } from "ws";

import {
  MARKET_STREAM_CLOSE,
  MARKET_STREAM_PATH,
  decodeMarketStreamClientMessage,
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
  toWireObservation,
  type WireFeedState,
  type WireObservation,
} from "@marketpulse/shared";

import type { LiveObservation } from "./market-data-stream.js";

/**
 * The browser's end of the market feed (Task 3.3.2).
 *
 * One WebSocket endpoint. A browser connects, receives a **snapshot**, then one
 * message per upstream frame — §11.1's shape exactly, and it is implemented
 * here rather than re-decided.
 *
 * ## Why `ws` directly rather than `@fastify/websocket`
 *
 * **`ws@8` is already a dependency** — Task 3.2.5 added it for the Alpaca
 * client, on a measurement rather than a preference (§4.6, §8.6), and this
 * repository has its behaviour written down in detail. `@fastify/websocket` is
 * a wrapper over the same library whose own behaviour nobody here has measured,
 * and `CLAUDE.md`'s standing rule is to resist adding libraries before
 * complexity demonstrates the need.
 *
 * The cost is ~15 lines of upgrade handling and the fact that this endpoint
 * does **not** appear in Fastify's route table — so `server.test.ts`'s walk
 * does not see it, exactly as `/diagnostics/*` is not seen for its own reason.
 * Stated rather than hidden, because a reader looking for every route will not
 * find this one there.
 *
 * ## The keepalive, which is the inverse of the Alpaca client's situation
 *
 * **The Alpaca client needs no keepalive of its own** — §6.3 measured Alpaca
 * heartbeating every 54 s, and `LIVE-DATA.md` says in as many words that adding
 * ours would be a second timer measuring the same thing.
 *
 * **Here we are the server, so the obligation inverts.** `HOSTING.md` already
 * measured the constraint and it is not a guess: Azure Container Apps' ingress
 * has a **240-second IDLE request timeout** — named as *idle* in the premium
 * settings table, so it is a ceiling on **silence** rather than on connection
 * age. A browser socket is **inbound**, so unlike the Alpaca socket it is
 * squarely inside that limit.
 *
 * **Without a keepalive this story's `LIVE` would be a lie overnight.** §6.6
 * measured the feed legitimately silent for **76 minutes** out of hours, so a
 * gateway that only forwarded observations would be cut every four minutes all
 * night and the browser would show `disconnected` about a feed that was
 * working perfectly.
 *
 * So the gateway emits a `feed` message at least every
 * {@link KEEPALIVE_INTERVAL_MS}. **An application message rather than a
 * WebSocket ping frame**, deliberately: whether the ingress counts a control
 * frame as activity is not documented and cannot be measured from here, while a
 * data frame unambiguously is traffic. The cost is ~30 messages an hour.
 */

/**
 * At most this long between messages to a browser.
 *
 * **Half the 240 s ceiling**, so a single lost or delayed message cannot reach
 * it — the same reasoning as the 165 s watchdog's *three missed heartbeats*,
 * which is why neither number is the raw limit.
 */
export const KEEPALIVE_INTERVAL_MS = 120_000;

/**
 * **How much unsent data a browser may owe before it is dropped** (Task 3.5.7).
 *
 * `PRODUCT_SPEC.md` §36 wants incremental degradation, not a process that grows
 * without bound because somebody's train went into a tunnel with a tab open.
 * The failure this prevents is the hardest kind to find later: a memory leak
 * that only appears on a slow connection during a busy session.
 *
 * ## Measured on 2026-09-21, against a client that stops reading
 *
 * A paused client, subscribed to the whole universe, published to repeatedly:
 *
 * | Batches published | Peak `bufferedAmount` |
 * | ----------------- | --------------------- |
 * | 100               | 5.1 MB                |
 * | 600               | **33.6 MB**           |
 *
 * **Linear and unbounded** — one payload per batch once the kernel stops
 * absorbing, with the universe payload measured at **57,024 bytes**.
 *
 * **The number that decides this constant is the other one in that run: the
 * kernel absorbed ~557 KiB before `bufferedAmount` moved at all.** A threshold
 * below that would never fire on loopback, which is exactly the shape of a
 * check that silently does nothing — and this repository has shipped one of
 * those before.
 *
 * So: **1 MiB**, about eighteen universe payloads, comfortably clear of the
 * kernel's own absorption so a momentarily slow reader is not punished for it.
 * Reached after ~28 batches, which in production is ~28 minutes of a stalled
 * tab, because bars arrive once a minute.
 */
export const MAX_BUFFERED_BYTES = 1_048_576;

/**
 * The close code a dropped browser is sent — **`1013 try again later`**, and
 * it lives in `MARKET_STREAM_CLOSE` because it is one fact with two ends.
 *
 * **Not `goingAway`**, and that is a policy decision rather than a detail.
 * `reconnect-policy.ts` reads the code: `1001` means *we are redeploying* and
 * retries in **500 ms**, so dropping a slow client with it produces a tight
 * loop — back in half a second, still slow, dropped again.
 *
 * **And the browser is deliberately NOT told to stop.** A client dropped for
 * being slow comes back as slow as it was, so backoff bounds the rate without
 * changing the outcome — but §36 wants a reader whose connection improves to
 * recover **without a reload**, and a browser that gave up could not. Cycling
 * at the 30 s ceiling is the degraded state, and it is chosen rather than
 * inherited from whichever code was convenient.
 */
export const SLOW_CLIENT_CLOSE_CODE = MARKET_STREAM_CLOSE.slowClient;

/** What the gateway needs. Functions rather than objects, for the usual reason. */
export interface MarketGatewayOptions {
  /** The current state, as the snapshot. Story 3.5 owns where this lives. */
  readonly snapshot: () => ReadonlyMap<string, WireObservation>;
  /** The feed's state, for the snapshot and for every `feed` message. */
  readonly feedState: () => WireFeedState;
  readonly setTimer?: (fn: () => void, ms: number) => NodeJS.Timeout;
  readonly clearTimer?: (timer: NodeJS.Timeout) => void;
}

export interface MarketGateway {
  /** Attach to a running Fastify instance's HTTP server. */
  readonly close: () => Promise<void>;
  /** How many browsers are attached. For the diagnostics route and tests. */
  readonly clientCount: () => number;
  /**
   * Forward observations to every attached browser (Task 3.5.2).
   *
   * **This gateway used to subscribe to the stream itself**, which made two
   * subscribers over one socket with two different policies — it broadcast the
   * raw batch while `currentMarketState` dropped a revision for a minute
   * already passed. The caller now owns the single subscription and hands over
   * **what the current market state applied**, so a browser cannot be sent
   * something this process rejected.
   */
  readonly publishObservations: (
    observations: readonly LiveObservation[],
  ) => void;
  /**
   * Tell every attached browser the feed's state changed.
   *
   * §11.2 requires *our socket is fine and the market feed behind it is dead*
   * to be sayable, and a browser that only ever received observations could
   * not tell a quiet feed from a dead one — which is the whole distinction the
   * thresholds exist to draw.
   */
  readonly publishFeedState: () => void;
}

export function registerMarketGateway(
  app: FastifyInstance,
  options: MarketGatewayOptions,
): MarketGateway {
  const {
    snapshot,
    feedState,
    setTimer = (fn, ms) => setInterval(fn, ms),
    clearTimer = (timer) => {
      clearInterval(timer);
    },
  } = options;

  // `noServer: true` and an explicit `upgrade` handler, so this owns the path
  // check rather than letting the library claim every upgrade on the server.
  const wss = new WebSocketServer({ noServer: true });

  /**
   * **Every attached browser, and what it asked for** (Task 3.5.6).
   *
   * A `Set<WebSocket>` until then, with one `broadcast()` sending the identical
   * payload to all of them — correct for five symbols and one page, and wrong
   * at 518: a security page showing one symbol received the whole universe
   * every minute and discarded 517 of them, **56.9 KiB a minute** measured on
   * the wire.
   *
   * **A browser that has asked for nothing receives nothing**, which is an
   * ordinary state rather than an error — §11.1's omission semantics applied
   * to a subscription. It is also the state every browser is in for the first
   * moments of every connection, including each reconnect.
   */
  const clients = new Map<WebSocket, Set<string>>();

  /**
   * Stop serving a browser that is not reading (Task 3.5.7).
   *
   * **Removed from `clients` FIRST**, so nothing in the rest of this tick
   * writes to it again — deleting during the iteration in
   * `publishObservations` is safe, and skipping the entry is the intent.
   */
  const drop = (socket: WebSocket, bufferedBytes: number): void => {
    clients.delete(socket);

    // **The count travels with it**, so an operator reads a pattern rather
    // than an incident: one slow browser on a train is noise, and five at once
    // is the deployment.
    app.log.warn(
      { bufferedBytes, clients: clients.size },
      "dropped a browser that stopped reading",
    );

    try {
      socket.close(SLOW_CLIENT_CLOSE_CODE);
    } catch {
      // Already gone. Nothing to do, and nothing that justifies a throw.
    }
  };

  const send = (socket: WebSocket, payload: string): void => {
    // `readyState === OPEN` is checked because a socket can close between the
    // broadcast starting and this line — and §6.4's lesson applies in reverse
    // here: `OPEN` is not proof of liveness, but NOT-open IS proof there is no
    // point writing.
    if (socket.readyState !== socket.OPEN) return;

    // **Backpressure, checked before the write rather than after** (Task
    // 3.5.7). `bufferedAmount` is the only honest signal a gateway has: a
    // socket that is slow and one that is dead look identical at the API until
    // the buffer says otherwise, which is §6.4's lesson arriving downstream.
    //
    // Measured against a client that stops reading, this grows by **one
    // payload per batch, without bound** — 33.6 MB in 600 batches.
    if (socket.bufferedAmount > MAX_BUFFERED_BYTES) {
      drop(socket, socket.bufferedAmount);
      return;
    }

    try {
      socket.send(payload);
    } catch {
      // A socket that throws on send is gone. Nothing to do and nothing that
      // justifies taking the process down: `PROVIDER.md` §8.5 — a throw would
      // say OUR program is wrong, and a browser closing mid-write is not that.
    }
  };

  /** Every attached browser. Used for what every browser is owed — the feed. */
  const broadcast = (payload: string): void => {
    for (const socket of clients.keys()) send(socket, payload);
  };

  /**
   * The observations one client asked for, or `undefined` if none of them.
   *
   * **Returning `undefined` rather than an empty object is the decision.** An
   * empty `bars` message would make a browser decide what *no observations*
   * means, and the answer is that it should never have been asked — the same
   * call `publishObservations` already makes about an empty batch.
   */
  const scopedTo = (
    wanted: ReadonlySet<string>,
    observations: readonly LiveObservation[],
  ): Record<string, WireObservation> | undefined => {
    let wire: Record<string, WireObservation> | undefined;

    for (const observation of observations) {
      if (!wanted.has(observation.symbol)) continue;
      wire ??= {};
      // **Keyed by symbol, which is where *latest wins* comes from** (§11.1).
      // Two observations for one symbol in one batch collapse to the later one
      // before the message is built — a property of the wire shape rather than
      // a rule anybody enforces, and one a change to a list would silently
      // remove.
      wire[observation.symbol] = toWireObservation(observation.bar);
    }

    return wire;
  };

  const feedMessage = (): string =>
    encodeMarketStreamMessage({
      type: "feed",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      feed: feedState(),
    });

  app.server.on("upgrade", (request, socket, head) => {
    // Path-matched here rather than by the library, so an upgrade to any other
    // path is refused rather than silently accepted. `request.url` includes a
    // query string; only the path decides.
    const path = (request.url ?? "").split("?")[0];
    if (path !== MARKET_STREAM_PATH) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      // **Attached with an empty subscription**, which is every browser for the
      // first moments of every connection including each reconnect. It receives
      // the feed's state and no observations until it says what it wants.
      clients.set(client, new Set());

      /**
       * What we already hold, for whatever this client has asked for.
       *
       * **Always a `snapshot`, never `bars`** — the type is about what the
       * message MEANS, *here is what we already hold*, and Task 3.5.4 made that
       * load-bearing: a snapshot sets the arrival mark's baseline while `bars`
       * fires it. Answering a subscribe with `bars` would mark every newly
       * subscribed security, on every subscribe and every reconnect.
       */
      const sendSnapshot = (): void => {
        const wanted = clients.get(client) ?? new Set<string>();
        const observations: Record<string, WireObservation> = {};

        for (const [symbol, observation] of snapshot()) {
          // **§11.1's omission semantics survive the scoping.** An entry for
          // every security this client asked for AND we have observed, and no
          // entry at all for the rest — *present but empty* stays unspellable.
          if (wanted.has(symbol)) observations[symbol] = observation;
        }

        send(
          client,
          encodeMarketStreamMessage({
            type: "snapshot",
            version: MARKET_STREAM_PROTOCOL_VERSION,
            observations,
            feed: feedState(),
          }),
        );
      };

      // **The snapshot, on connect.** §11.1: a browser connecting under
      // deltas-only sees NOTHING until each symbol's next bar — a median of a
      // minute and, for `ERIE`, 187. The snapshot is what makes the first paint
      // honest, and `{}` after a restart is the TRUE answer rather than a
      // degraded one. Empty here too, until this client subscribes.
      sendSnapshot();

      client.on("message", (raw: unknown) => {
        const decoded = decodeMarketStreamClientMessage(String(raw));

        if (decoded.kind !== "message" || decoded.message === undefined) {
          // **Counted by nobody and fatal to nobody.** One malformed frame from
          // one browser must not take down a gateway serving every other
          // browser (§36), and there is no honest reply to a message we could
          // not read.
          app.log.debug(
            { reason: decoded.reason },
            "unreadable client message",
          );
          return;
        }

        clients.set(client, new Set(decoded.message.symbols));

        // **A late subscribe is answered with what we already hold.** Without
        // this, a browser that subscribes after connecting waits for each
        // security's next bar — a median of a minute and up to 187 for a thin
        // one — which is exactly the wait the snapshot exists to remove.
        sendSnapshot();
      });

      client.on("close", () => clients.delete(client));
      client.on("error", () => clients.delete(client));

      app.log.debug({ clients: clients.size }, "browser attached to the feed");
    });
  });

  const keepalive = setTimer(() => {
    // Only when somebody is listening. An idle deployment with no browser
    // attached has no socket to keep alive, and a timer that broadcasts to
    // nobody is a wake-up the Consumption plan bills for — §9.1's idle-rate
    // condition is a rate, and this is exactly the kind of thing that erodes it.
    if (clients.size > 0) broadcast(feedMessage());
  }, KEEPALIVE_INTERVAL_MS);

  return {
    clientCount: () => clients.size,

    publishObservations(observations) {
      if (observations.length === 0) return;

      // **One message per client rather than one for everybody** (Task 3.5.6).
      // The encode happens per client because the payloads genuinely differ;
      // a shared encode would be a cache keyed on the subscription, which is a
      // mechanism with no measured problem behind it.
      for (const [socket, wanted] of clients) {
        const scoped = scopedTo(wanted, observations);
        if (scoped === undefined) continue;

        send(
          socket,
          encodeMarketStreamMessage({
            type: "bars",
            version: MARKET_STREAM_PROTOCOL_VERSION,
            observations: scoped,
          }),
        );
      }
    },

    publishFeedState() {
      broadcast(feedMessage());
    },

    async close() {
      clearTimer(keepalive);

      // **Goodbye before the close** (§12.2). Dropping the socket silently
      // leaves the browser inferring a state from an absence, which is exactly
      // the ambiguity §11.2's thresholds exist to remove — and a browser that
      // has to guess will guess `disconnected` for a deploy that took five
      // seconds.
      const farewell = encodeMarketStreamMessage({
        type: "feed",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        feed: { ...feedState(), status: "disconnected" },
      });

      for (const socket of clients.keys()) {
        send(socket, farewell);
        socket.close(1001); // 1001 "going away" — the honest code for a shutdown.
      }
      clients.clear();

      await new Promise<void>((resolve) => {
        wss.close(() => {
          resolve();
        });
      });
    },
  };
}
