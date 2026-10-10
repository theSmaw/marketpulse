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
  type WireMarketOverview,
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
  /**
   * **The aggregate, built once per send** (Task 4.2.4).
   *
   * A function rather than a value, for the reason every other seam here is
   * one: the gateway decides *when* a browser is told something and must not
   * decide *what* is true. `index.ts` supplies the producer, which is the one
   * call site of `buildMarketOverview` in shipped backend code
   * (`one-producer-of-the-overview-aggregate`).
   *
   * **Required rather than optional.** An optional producer would make a
   * wiring mistake silent — a gateway that simply never sends the frame, on a
   * deployment where nothing else would say so.
   */
  readonly overview: () => WireMarketOverview;
  readonly setTimer?: (fn: () => void, ms: number) => NodeJS.Timeout;
  readonly clearTimer?: (timer: NodeJS.Timeout) => void;
  /**
   * Wall clock, epoch milliseconds — `Date.now()` in production (Task 3.6.4).
   *
   * **What it stamps and what it must not.** Every frame this gateway sends
   * carries `sentAt`, read from this clock at the moment of the send, so a
   * browser can time `PRODUCT_SPEC.md` §28's leg — the one that starts here
   * and ends in application state. It is a **third** clock reading beside the
   * two `STREAM-SEAM.md` §3 keeps apart, and it is used for **measurement
   * only**: nothing about liveness or staleness reads it, and
   * `pnpm invariants` holds that line.
   *
   * A seam rather than a reading, for the reason every other clock in this
   * story is: the process test asserts the stamp came from *this* clock, which
   * is only assertable if the test owns it.
   */
  readonly wallNow?: () => number;
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
    overview,
    setTimer = (fn, ms) => setInterval(fn, ms),
    clearTimer = (timer) => {
      clearInterval(timer);
    },
    wallNow = () => Date.now(),
  } = options;

  /**
   * The send instant, taken **at the send** rather than once per publish.
   *
   * `publishObservations` encodes one payload per client, so this is read per
   * client — the stamp is about when *this* frame left for *this* browser,
   * which is the start of the leg §28 names. One reading shared across the
   * loop would put every client after the first on a stamp that predates its
   * own send by however long the earlier encodes took.
   *
   * `pnpm break the-gateway-stamps-nothing` replaces this with a constant and
   * proves the process suite notices.
   */
  const sentAt = (): string => new Date(wallNow()).toISOString();

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
   * **Amended 2026-10-10 by Task 4.8.10: that is 56.9 KiB a MESSAGE, not a
   * minute.** 58,218 B was read off one `bars` message carrying all 518
   * observations (Task 3.5.4, refined to 57,642 B on real tickers by 3.5.6);
   * Task 4.8.2 re-read the same shape at **58,187–59,475 B per batch**. The
   * `a minute` was the then-believed one-batch-a-minute cadence — Story 4.8's
   * Gate 1 falsified it, and `LIVE-DATA.md` §9.5/§10.2's measured feed is
   * **6.8 batches a minute at midday, 8.8 at the open and 16.1 at the close**.
   * The per-minute rate a 518-subscribed browser really receives has **never
   * been measured**: the arithmetic ceiling, if every one of the 518 traded in
   * every batch, is ~386–957 KiB/min, and the real figure is well below it
   * because a minute carries 284–450 bars in total rather than 518 per batch.
   * Nothing in this comment's argument turns on which — one message of the
   * whole universe to a browser that wanted one symbol is the defect — and no
   * figure here may be used to size anything per minute.
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
      sentAt: sentAt(),
      feed: feedState(),
    });

  /**
   * The aggregate frame — **the one place it is built** (Task 4.2.4).
   *
   * `the-overview-frame-is-not-a-heartbeat` counts `type: "overview"` encode
   * sites in this file and allows at most one, which is Task 4.1.1's decision
   * 1 held mechanically: one computation for every browser. The three callers
   * below are three *sends* of one shape, not three cadences.
   *
   * **Amended 2026-10-09 by Task 4.8.3: one ENCODE site is not one
   * computation, and the three callers are three JOINS.** `overview()` is
   * `index.ts`'s `marketOverview`, which is unmemoised — so every call to this
   * function runs a full join over all 518 securities, and two of the three
   * callers are `sendSnapshot()`, which runs on connect **and** at the foot of
   * every `message` listener without comparing the subscription. Counted off
   * the wire against this gateway on a quiet feed: a cold `/` receives
   * **three** `overview` frames and therefore pays **three** joins, a cold
   * `/securities/:symbol` three, and `/investigations` — which draws no
   * figures at all — **two**. Priced on a populated mid-session store at
   * **3.72 ms** a join, that is **11.2 ms** of server script per browser
   * opening `/`, and it is the one part of this gateway's cost that **does**
   * scale with connections. The invariant is still worth having; what it
   * certifies is *one place a frame is built*, not *one computation*.
   *
   * **Amended 2026-10-10 by Task 4.8.10: the 3.72 and the 11.2 are both
   * pre-repair and neither is the figure to quote.** Task 4.8.7 made
   * `marketDateAt` 2.6× cheaper on 2026-10-09, and Task 4.8.11 **re-took**
   * the per-batch path on the artefact afterwards: **1.521 ms p50**
   * (n = 298/300, tight loop, zero clients, calibrator reference 1.217 ms).
   * The count of joins is unchanged — three per browser opening `/`, three on
   * `/securities/:symbol`, two on `/investigations` — and so is the claim that
   * this is the part that scales with connections. What is **not** carried is
   * the product: a naive rescale at 1.521/3.708 puts a cold `/` near 4.6 ms,
   * and that is an **estimate rather than a measurement**, because 1.521 ms is
   * the whole `overviewMessage()` on an all-518-observed fixture while the
   * three snapshot joins run against whatever the live map holds. Re-take it
   * rather than rescale it; the recipe is in Task 4.8.11.
   *
   * **It is not scoped to a subscription**, unlike `bars`. The overview is an
   * aggregate over securities a browser never asked for by name, so every
   * attached client gets the identical payload — which is also why
   * `publishObservations` encodes it once outside its per-client loop.
   *
   * **Amended 2026-10-10 by Task 4.7.3: the aggregate is now an ARGUMENT, and
   * two of the three paths no longer compute one.** See
   * `lastBroadcastOverview` below. The encode site is still exactly one, which
   * is what `the-overview-frame-is-not-a-heartbeat` holds; what moved is where
   * the *value* comes from.
   */
  const overviewMessage = (aggregate: WireMarketOverview): string =>
    encodeMarketStreamMessage({
      type: "overview",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      sentAt: sentAt(),
      overview: aggregate,
    });

  /**
   * **The last aggregate BROADCAST to attached browsers** — and what a
   * reconnecting or subscribing browser is served instead of a fresh join
   * (Task 4.7.3).
   *
   * ## The defect, which a reader reaches with a reload
   *
   * `sendSnapshot()` computed a new aggregate on connect and on every
   * subscribe, and the three producers behind it age at three different rates:
   * `market-breadth.ts`'s eligibility pass — which **breadth and movers are
   * both taken from** — filters on each bar's own `startsAt` inside a
   * **5-minute** window, while a proxy or a sector entry is marked `live` for
   * as long as the observation sits in the map, with **no expiry at all**. So
   * a join taken during an outage draws four live prices and eleven ranked
   * sectors at the top of `/` and `none were heard from in the last 5 minutes`
   * in the middle — **Task 3.4.9's _two true halves, one contradiction_,
   * arriving by a fifth door**, with each half correct about its own subject.
   *
   * It is reachable by a **reload**, and routine on every socket drop: the
   * 2026-09-23 watch counted a browser's socket closing **38 times in
   * 4h 36m**, and each of those reconnects paid a fresh join.
   *
   * ## The rule, which this product already holds twice
   *
   * > **An aggregate that has held figures must not fall back to its empty
   * > state because of a join the reader did not ask for.**
   *
   * `LiveFeedView.resumes`' refill rule and `use-bar-series`' never-blank rule
   * are the same sentence about a series; this is it about an aggregate. The
   * owner's Gate 1 decision picked this over three alternatives, recorded in
   * Task 4.7.3: the browser additionally refusing a poorer aggregate (a second
   * place that has to know what *poorer* means); expiring the proxy and sector
   * entries on breadth's window (throws away figures a reader was reading,
   * which Story 3.10 decided against); and photographing it as honest
   * (defensible per region, indefensible as a set).
   *
   * ## What a process with no last broadcast serves, and why that is not it
   *
   * **A freshly computed aggregate — today's behaviour, unchanged.** A process
   * that has never broadcast has no reader whose figures it could contradict,
   * and the aggregate it computes is the true answer about what it holds:
   * out of hours, and on a deployment with `MARKET_DATA_PROVIDER=none`, that
   * is the last stored closes — Story 4.2's `all-stored-one-session` and
   * `no-provider-configured` states, which are **reached on a cold load** and
   * would cease to exist if the absent memo meant an absent frame.
   *
   * **The deploy case is therefore only half repaired, and the residue is not
   * this memo's to fix**: a replica restarted mid-session has no memo *and* no
   * market state — `docs/GAPS.md` entry 8 measured its own feed refused for
   * **45.8–46.5 s** — so the first browser to reconnect to it is served a thin
   * computed aggregate however this gateway remembers. Nothing a 46-second-old
   * process can compute is better than what the reader's own tab already
   * holds. See Task 4.7.3's record for the fork and `docs/GAPS.md`.
   *
   * ## Nothing here may throw
   *
   * The write below is on the socket callback's path, where an unhandled
   * rejection is a crashed process. It is a single assignment of a value
   * `overview()` has already returned, and the read is a `??`.
   */
  let lastBroadcastOverview: WireMarketOverview | undefined;

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
            sentAt: sentAt(),
            observations,
            feed: feedState(),
          }),
        );

        // **And the aggregate, beside the snapshot and for the same reason.**
        // The overview is not scoped to a subscription, so a browser that
        // connects at 11:20 would otherwise hold no figures until the next
        // upstream batch — §11.1's own argument one level up, and the wait it
        // removes is the same wait. It rides this call rather than a call of
        // its own so that *on connect* and *on subscribe* cannot come apart.
        //
        // **The LAST BROADCAST one, not a fresh join** (Task 4.7.3) — the
        // whole argument is on `lastBroadcastOverview`. A browser that joins
        // after a broadcast is served exactly what every tab already open is
        // looking at, which is a second property worth having: two tabs of `/`
        // no longer disagree about the market by however long apart they were
        // opened. The `??` is the cold-start arm and it is the only path on
        // which these two sends pay a join at all.
        send(client, overviewMessage(lastBroadcastOverview ?? overview()));
      };

      // **The snapshot, on connect.** §11.1: a browser connecting under
      // deltas-only sees NOTHING until each symbol's next bar — a median of a
      // minute and, for `ERIE`, 187. The snapshot is what makes the first paint
      // honest, and `{}` after a restart is the TRUE answer rather than a
      // degraded one. Empty here too, until this client subscribes.
      //
      // **This call is STRUCTURALLY EMPTY, and it stays** (Task 4.2.1). The
      // line above sets an empty subscription, so `wanted.has(symbol)` is
      // false for all 518 and `observations` is `{}` whatever the market state
      // holds — there is no path that makes it otherwise, because the
      // `message` listener that would populate `wanted` is registered below
      // this call. **Measured 2026-09-26: 149 bytes**, against the 56.9 KiB a
      // subscribed mid-session snapshot carries. So a connection produces
      // **two** snapshots — this one and the one answering the first subscribe
      // — plus one per readable `subscribe` MESSAGE after that. Not one
      // per *change*: the listener below does not compare, so a browser
      // re-asserting an unchanged subscription is answered with another
      // snapshot. The reconnect path does exactly that, by design.
      //
      // **Why it is not deleted as a duplicate.** It is the only frame an
      // unsubscribed browser receives, and it carries `feed`. Every browser is
      // unsubscribed for the first moments of every connection and every
      // reconnect (`App.tsx` starts with no symbols), and the next thing such
      // a browser would hear is the 120 s keepalive — two minutes in which
      // §11.2's watchdog is already counting silence. The alternative
      // considered and rejected was sending a `feed` message here instead: it
      // saves 22 bytes and moves the browser's *this is a connection* edge
      // onto a frame that also arrives on a timer. Story 4.2's `STORY.md`
      // carries the decision.
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
      // **Return 1 of 2 — NOTHING WAS APPLIED.** The subject is this batch:
      // `current-market-state.ts` handed over what it accepted, and it
      // accepted none of it. An empty `bars` message would make a browser
      // decide what *no observations* means, and the answer is that it should
      // never have been asked. This says nothing about who is attached.
      if (observations.length === 0) return;

      // **Return 2 of 2 — NOBODY IS ATTACHED.** A different subject from the
      // line above, and the two must not be read as one test: a batch can be
      // full with no browser listening, and a browser can be listening with
      // nothing applied. The same `clients.size > 0` question the keepalive
      // asks twelve lines above, for the same reason.
      //
      // **Why it is here rather than around the broadcast** (Task 4.8.11).
      // `overviewMessage()` was evaluated as an ARGUMENT to `broadcast` — a
      // `lastBroadcastOverview = overview()` statement since Task 4.7.3, which
      // changes the shape and not the ordering — so until this line the
      // 518-join ran before the client map was read —
      // re-measured 2026-10-10 at **1.521 ms p50 a batch with zero clients**
      // (n = 298, tight, calibrator reference 1.217 ms, 2 discarded), against
      // a floor of **0.000 ms** for the early return above. Re-measured
      // rather than carried: Task 4.8.3 read 3.708 ms, and Task 4.8.7's
      // `marketDateAt` repair landed between the two. After this line the
      // same arm reads the floor and the instrument counts **0 joins**.
      //
      // At the feed's measured cadence that was **10.3 ms** of script a
      // minute at the 6.8-batch midday floor and **24.5 ms** at the close's
      // 16.1, for an aggregate **sent to nobody** — `PRODUCT_SPEC.md`
      // §9.1's idle-rate condition, on a deployment whose own socket runs
      // whether or not anybody is looking.
      //
      // The per-client loop below iterates nothing on an empty map, so this
      // return changes no browser's view of anything; it skips work whose only
      // consumer would have been the empty map.
      //
      // **Nothing here may throw**: this method is called from the socket's
      // own callback, where an unhandled rejection is a crashed process. A
      // `Map`'s `size` is a field read.
      //
      // ~~**The snapshot path is deliberately untouched.** A browser
      // connecting or subscribing still gets a freshly computed aggregate —
      // three joins per cold load of `/`, counted off the wire by Task 4.8.3 —
      // because memoising that is a different decision with more surface and
      // was not the one taken. Those joins have a reader by construction: the
      // browser that asked.~~ — **taken 2026-10-10 by Task 4.7.3, and not for
      // the cost.** The snapshot path now serves `lastBroadcastOverview`,
      // because a recomputed aggregate during an outage contradicts itself
      // region by region; two of the three joins per cold load going away is a
      // consequence rather than the reason.
      //
      // Reversal trigger, a condition: **the first consumer of the aggregate
      // that is not an attached browser socket** — a scheduled job, a
      // diagnostics route, a second gateway — at which point `clients.size`
      // stops being the right question and the producer wants a cache rather
      // than a guard.
      if (clients.size === 0) return;

      // **One compute, one broadcast** (Task 4.1.1's decision 1), and the
      // contrast with the loop below is the whole reason it is written first:
      // a `bars` payload genuinely differs per client, and this one does not.
      // Encoding it inside the loop would build the identical string once per
      // attached browser.
      //
      // **This is the observations path**, which is the only cadence the
      // aggregate may ride. The feed-state path sends ~332 frames a minute
      // (Task 4.1.6, measured on the deployed gateway) and
      // `the-overview-frame-is-not-a-heartbeat` refuses the word there.
      //
      // **And it is the one place the join runs** since Task 4.7.3 — written
      // as a statement rather than as `broadcast`'s argument because the value
      // is now kept. A browser that joins before the next batch is served
      // this, so the write is not bookkeeping: it is the thing a reconnect
      // reads. It stays **below** the guard above, which is why
      // `the-join-runs-with-nobody-attached` still goes red.
      lastBroadcastOverview = overview();
      broadcast(overviewMessage(lastBroadcastOverview));

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
            sentAt: sentAt(),
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
        sentAt: sentAt(),
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
