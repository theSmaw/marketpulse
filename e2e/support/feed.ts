import {
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  MarketFeed,
  WireFeedState,
  WireMarketBreadth,
  WireMarketOverview,
  WireObservation,
} from "@marketpulse/shared";
import type { Page, WebSocketRoute } from "@playwright/test";

import { BARS_ROUTE_PATTERN, MARKET_DATA_ROUTE_PATTERN } from "./pair.js";

// **A degraded feed a spec can PRODUCE rather than simulate** (Task 3.10.2).
//
// Story 3.10's criterion 7 asks that the `LIVE` claim be false *"asserted
// against a produced disconnection rather than a simulated one"*, and a browser
// suite cannot disconnect a vendor. What it can do is be the gateway.
//
// ## Why this is not a status somebody sets
//
// The browser takes the **worse** of its own reading and the server's
// (`worseFeedStatus` in `live-feed.ts`), and derives its own from
// `lastInboundAt` / `lastObservationAt` against two thresholds. So a helper
// that reached into a component and set `status: "disconnected"` would assert
// nothing about the path a real outage travels. These three do travel it:
//
// | State          | Produced by                                                |
// | -------------- | ---------------------------------------------------------- |
// | `disconnected` | **closing the socket** — `feedStatusFrom` reads `closed`    |
// | `stale`        | a `feed` frame carrying `status: "stale"`, which the gateway really sends |
// | reconnected    | closing, then serving the retry the browser dials on its own |
//
// **Waiting out the thresholds is the other way** — 165 s monotonic for
// `disconnected`, 60 s wall clock for `stale` — and it is four minutes a spec.
// Those two numbers have unit tests that own them; this owns the journey.
//
// ## The constraint that makes a green run mean something
//
// **A stub that can send any frame can manufacture states the server cannot,
// and those look exactly like findings.** Task 3.10.1's throwaway did it twice:
// it modelled a quiet **security** as a silent **connection**, and it produced
// a `LIVE` connection word inside a deployment with **no provider configured**
// — a pair `createMarketStream` forbids, because a `none` selection constructs
// no stream at all. The second was written up as a defect and withdrawn.
//
// So this harness is **narrower than the wire format**: the venue and the
// connection are served from **one value**, so the pair is coherent by
// construction and the forbidden row — a connection word beside *nothing is
// configured* — is unrepresentable here rather than merely avoided.
//
// **The first draft got that rule wrong in an instructive way.** It read the
// venue from the deployment's own `GET /market-data` and echoed it, reasoning
// that anything else would be inventing one. But `MARKET_DATA_PROVIDER`
// defaults to `none` on a developer's machine **and on CI**, so the answer is
// `{"feed":null}`, the chrome correctly renders **no connection word at all**
// (§11.3's `—`), and every assertion here became unrunnable on the one runner
// this exists for. The rule that survives is **coherence**, not provenance:
// a configured deployment is a reachable state, and serving both halves of one
// is modelling it rather than lying about it.
//
// ## An outage that does not heal, and the aggregate (Task 4.7.1)
//
// Two capabilities were added on 2026-10-10, and both exist because **no spec
// that visits `/` had ever degraded a feed**.
//
// **1. `reconnect: "refused"`.** The `routeWebSocket` callback below used to
// re-send a `live` snapshot **unconditionally**, so the browser's own retry was
// answered and a produced `disconnected` healed itself about two seconds after
// `drop()` — `ABNORMAL_FIRST_MS` in `reconnect-policy.ts`. That is **Task
// 3.10.9's fourth instrument error**, whose repair lived in the deleted
// `scripts/state-grid.mjs` and was never carried here; its own write-up says
// *the tell was one state giving two readings from one drive*. A real outage
// does not answer the retry, so `reconnect: "refused"` closes every connection
// that arrives **after `drop()`** and the `disconnected` state is **held** for
// as long as a spec needs it. (After the drop, not after the first — see
// `dropped` in the body, which is where the first draft was wrong.)
//
// It is **opt-in, defaulting to today's behaviour**, because two shipped specs
// are about the retry *being* answered: `market-reconnect.spec.ts` watches a
// tab survive a deploy, and `security-gap-fill.spec.ts` asserts a quiet refill
// that is driven by the connect sequence through `LiveFeedView.resumes`.
//
// **2. `overview`, `sendOverview` and `overviewOnReconnect`.** The gateway's
// connect sequence is a snapshot **and the aggregate**, beside it, on connect
// and on every subscribe (`market-gateway.ts`'s `sendSnapshot`). Ten specs
// under `e2e/specs/` build that second frame inline; this is its one home.
// `overviewOnReconnect` is the shape none of them can express — **a different,
// poorer aggregate served to the reconnecting browser** — which is what a
// restarted replica really does for the 45.8–46.5 s before its own feed
// authenticates, and is Task 4.7.3's subject.
//
// ## The plant, per channel (Task 4.8.10's rule, transferred)
//
// **A produced state whose producer went quiet looks identical to a state
// drawn correctly.** So the three counters below are not decoration: a spec
// that drops the feed and asserts a word has proved nothing unless it can also
// say that *this harness* answered the socket and *this harness* refused the
// retry. `connections()` counts by **URL** — the route pattern is the match —
// which is `market-stream-socket-count.spec.ts`' lesson after a measurement
// counted Vite's HMR socket as this product's for four days.
//
// ## One ordering trap, which has cost two tasks
//
// **Register this before `page.addInitScript`.** Playwright's own `WebSocket`
// mock is installed by `routeWebSocket` and replaces the page's constructor, so
// an init script that wraps `WebSocket` to count frames is overwritten if it
// runs first. Tasks 4.5.8 and 4.8.5 both hit it.

/** What the gateway says about itself, in the shape the wire carries. */
interface FeedFrame extends WireFeedState {
  readonly status: "live" | "stale" | "disconnected";
}

export interface ProducedFeed {
  /** Deliver observations, as a `bars` frame — the shape a burst really has. */
  readonly send: (
    observations: Readonly<Record<string, WireObservation>>,
  ) => void;
  /**
   * Broadcast a new aggregate, as the gateway does once per applied batch
   * (Task 4.7.1).
   *
   * **Not scoped to a subscription**, which is the one thing about this frame
   * that differs from `bars`: the overview is an aggregate over securities a
   * browser never asked for by name, so `market-gateway.ts` encodes it once
   * outside its per-client loop. A spec that wants two different aggregates
   * calls this twice.
   *
   * **A `WireMarketOverview` with no `breadth` or no `movers` is the ROLLBACK
   * shape and must be labelled furnished at the call site.**
   * `WireMarketOverviewInputs.breadth` and `.movers` are non-optional, so no
   * shipped producer can build one — it models a pinned previous image, and it
   * is the one state this harness can reach that a healthy deployment cannot.
   * {@link FURNISHED_BREADTH} is the opposite courtesy: the section to paste
   * in when the rollback is **not** what a spec meant to model.
   */
  readonly sendOverview: (overview: WireMarketOverview) => void;
  /** Say the connection has gone quiet, which the gateway does say. */
  readonly goStale: () => void;
  /** Kill it. The browser concludes `disconnected` from the close itself. */
  readonly drop: (code?: number) => void;
  /** The venue this deployment is modelling, for an assertion to read. */
  readonly feed: () => MarketFeed | null;
  /**
   * Change what the bar-series endpoint answers from **now on** (Task
   * 3.10.7).
   *
   * Only meaningful when `bars` was passed to {@link serveFeed}, which is
   * what installs the route. It exists because the gap this story fills is
   * only observable as a **difference between two answers to one request**:
   * the store keeps filling while a browser's socket is down, so the repair
   * is that the page asks again and gets more than it had.
   *
   * **Not a way to change the past.** A spec that serves a longer answer
   * without the page re-asking asserts nothing — the route is only consulted
   * when the application decides to fetch, which is the behaviour under test.
   */
  readonly serveBars: (body: string) => void;

  /**
   * **How many market-stream sockets this harness has answered**, matched by
   * **URL** rather than by counting events (Task 4.7.1).
   *
   * The plant proof, and `market-stream-socket-count.spec.ts`' lesson: a
   * browser page holds sockets that are not this product's — Vite's HMR
   * connection among them — and a number with no URL beside it cannot tell
   * them apart, which cost a suppression, two documents and a task. The match
   * here is the route pattern, so this counter cannot see anything else.
   *
   * **It counts connections, not messages.** A cold dev page is `1` on the
   * deployed bundle and `2` under `StrictMode`'s open/close pair; what a spec
   * asserts is that it **grew** after a drop nobody asked the page to recover
   * from — `market-reconnect.spec.ts`'s own rule.
   */
  readonly connections: () => number;

  /**
   * How many of those were **refused** — zero unless `reconnect: "refused"`.
   *
   * A second channel for the same reason the first exists: *the retry was
   * refused* and *the page never retried* leave an identical screen, and a
   * spec that cannot tell them apart is asserting a word rather than a state.
   */
  readonly refusals: () => number;

  /**
   * How many `overview` frames this harness has sent, across every connection.
   *
   * **Nothing rather than zero when it cannot report** is the rule
   * (Task 4.8.10); here there is no such case — the counter is incremented at
   * the one send site — so it is a count and says so. What it is *for* is the
   * arm that serves a poorer aggregate on the reconnect: without it, a frame
   * that was built and never sent and a frame the page ignored read the same.
   */
  readonly overviews: () => number;
}

export interface ServeFeedOptions {
  /**
   * The observations the page opens with — a snapshot, which is what the
   * gateway sends first. **Omit it for the no-data case**, which is a cold
   * load before any bar has landed and is the state Task 3.10.2 decided.
   */
  readonly snapshot?: Readonly<Record<string, WireObservation>>;
  readonly marketOpen?: boolean;

  /**
   * The deployment being modelled, served to **both** halves of the cell.
   *
   * `iex` by default, which is what this product's own plan gives it. Pass
   * `null` to model a deployment with no provider — and expect **no
   * connection word**, because that is what such a deployment renders.
   */
  readonly feed?: MarketFeed | null;

  /**
   * The bar-series answer to serve, as a JSON body.
   *
   * **Pass one whenever a spec asserts anything about a line, a count or a
   * washed edge.** CI's store is 518 securities and **zero bars**, so a chart
   * there is a correct `empty` and every figure on the page is absent —
   * which is a green local run and a red CI one, as this suite has now
   * produced twice. Omit it for the chrome-only specs, which assert nothing
   * the store answers.
   */
  readonly bars?: string;

  /**
   * **The aggregate, sent beside the snapshot on connect** — the gateway's own
   * connect sequence (Task 4.7.1).
   *
   * `market-gateway.ts`'s `sendSnapshot` sends the snapshot and then
   * `overviewMessage()`, *"beside the snapshot and for the same reason"*, on
   * connect and again on every readable `subscribe`. Omit it to model a
   * gateway that sends no aggregate at all, which is a **rollback** — and read
   * {@link ProducedFeed.sendOverview} before building one by hand.
   *
   * **A spec that asserts a figure serves its own answer.** CI's store is 518
   * securities and **zero bars**, so the real gateway there sends 518
   * `unknown` figures, `measured: 0` and two empty mover lists for ever.
   */
  readonly overview?: WireMarketOverview;

  /**
   * **A different, poorer aggregate for every connection after `drop()`**
   * (Task 4.7.1, for Task 4.7.3).
   *
   * The state no spec could express before this existed, and it is not
   * hypothetical: `sendSnapshot()` recomputes the join on every connect, and a
   * restarted replica serves browsers for **45.8–46.5 s** before its own feed
   * authenticates — so a reconnecting tab is answered with an aggregate built
   * over an empty live map. Serve the richer one as {@link overview} and the
   * poorer one here, and the drop-and-return is the whole production.
   *
   * Ignored when `reconnect` is `"refused"`, because then there is no second
   * connection to answer. Falls back to {@link overview} when absent, which
   * is today's behaviour.
   */
  readonly overviewOnReconnect?: WireMarketOverview;

  /**
   * **What the browser's own retry is answered with.** Defaults to `"served"`,
   * which is this harness's behaviour since Task 3.10.2.
   *
   * - `"served"` — every connection gets the connect sequence, so a produced
   *   `disconnected` heals itself about two seconds after `drop()`. Correct
   *   for a **deploy**, and what `market-reconnect.spec.ts` and
   *   `security-gap-fill.spec.ts` are about.
   * - `"refused"` — every connection after `drop()` is closed immediately, so
   *   the page keeps dialling (2 s, doubling to a 30 s ceiling — the backoff
   *   never resets, because it resets on a **message** and a refused socket
   *   carries none) and the chrome **holds** `DISCONNECTED`. That is a phone in
   *   a tunnel, and it is the only way an assertion about a stopped feed is
   *   about the feed rather than about a race with the retry.
   *
   * The refusal is a close rather than a silence **on purpose**: a socket this
   * harness accepted and never spoke on is `open` to the browser, so the
   * chrome would read `LIVE` until the 165 s watchdog elapsed — a harness
   * modelling the one state it was asked to make impossible.
   */
  readonly reconnect?: "served" | "refused";
}

/**
 * Serve the market stream from the test, and hand back the verbs.
 *
 * Call **before** `page.goto`, and before any `page.addInitScript` that wraps
 * `WebSocket` — see the ordering trap at the top of this file. Both halves of
 * the feed cell are served from one `feed` value, so this cannot put a
 * connection word beside a venue word the same deployment would not have
 * produced.
 */
export async function serveFeed(
  page: Page,
  options: ServeFeedOptions = {},
): Promise<ProducedFeed> {
  const marketOpen = options.marketOpen ?? true;
  const venue = options.feed === undefined ? "iex" : options.feed;

  // **One value, both halves.** The venue the chrome reads over HTTP and the
  // venue the socket reports are the same one, so this cannot produce the pair
  // `Live in the chrome` §11 marks *no, and it must stay no*.
  await page.route(MARKET_DATA_ROUTE_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ feed: venue }),
    }),
  );

  // **Held in a closure rather than captured per route call**, so
  // `serveBars` changes the next answer rather than the installed handler.
  let barsBody = options.bars;
  if (barsBody !== undefined) {
    await page.route(BARS_ROUTE_PATTERN, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: barsBody ?? "",
      }),
    );
  }

  let socket: WebSocketRoute | undefined;
  let connections = 0;
  let refusals = 0;
  let overviews = 0;

  /**
   * **Whether `drop()` has been called — and NOT a connection count** (Task
   * 4.7.1).
   *
   * The first draft keyed both new behaviours on `connections > 1`, and it was
   * wrong in a way worth keeping written down: **a cold page opens more than
   * one socket before anybody drops anything.** React's `StrictMode` double-
   * invokes the effect in development, so a dev page opens one socket plus an
   * open/close pair about 25 ms apart (`CLAUDE.md`, after Task 3.11.2
   * re-measured it with the URLs printed) — and `use-live-feed.ts` documents
   * the same double-invoke as how Task 3.3.6 found a teardown writing into the
   * next mount's state.
   *
   * So on a developer's machine the **surviving** socket was connection 2 and
   * was handed the reconnect behaviour: `reconnect: "refused"` refused the
   * only socket the page kept, and `overviewOnReconnect` served the poorer
   * aggregate on the **first** paint. Both produced a perfectly plausible
   * screen — `No prices yet.` and four `None stored` cells — which is this
   * harness's own standing hazard: **a state manufactured by the instrument
   * reads exactly like a finding.**
   *
   * `dropped` is also the honest model rather than merely the working one. A
   * real outage is *the far end is gone from now on*, not *the second dial
   * fails*, and that is what this says.
   */
  let dropped = false;

  const frame = (status: FeedFrame["status"]): FeedFrame => ({
    status,
    feed: venue,
    marketOpen,
  });

  /** The aggregate frame, from the shipped encoder, counted at its one site. */
  const sendOverview = (overview: WireMarketOverview): void => {
    overviews += 1;
    socket?.send(
      encodeMarketStreamMessage({
        type: "overview",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: new Date().toISOString(),
        overview,
      }),
    );
  };

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
    connections += 1;

    // **The retry, refused.** Closed rather than left silent — see
    // `ServeFeedOptions.reconnect`. `socket` is deliberately NOT repointed at
    // it: a verb writing into a socket this harness has just killed would be
    // the harness lying about which connection a frame arrived on.
    if (dropped && options.reconnect === "refused") {
      refusals += 1;
      socket = undefined;
      void ws.close({ code: 1006 });
      return;
    }

    socket = ws;
    ws.send(
      encodeMarketStreamMessage({
        type: "snapshot",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        sentAt: new Date().toISOString(),
        observations: options.snapshot ?? {},
        feed: frame("live"),
      }),
    );

    // **Beside the snapshot, which is `sendSnapshot`'s own shape** — so *on
    // connect* and *on reconnect* cannot come apart here either.
    const aggregate = dropped
      ? (options.overviewOnReconnect ?? options.overview)
      : options.overview;
    if (aggregate !== undefined) sendOverview(aggregate);
  });

  return {
    sendOverview,
    connections: () => connections,
    refusals: () => refusals,
    overviews: () => overviews,
    send: (observations) => {
      socket?.send(
        encodeMarketStreamMessage({
          type: "bars",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt: new Date().toISOString(),
          observations,
        }),
      );
    },
    goStale: () => {
      socket?.send(
        encodeMarketStreamMessage({
          type: "feed",
          version: MARKET_STREAM_PROTOCOL_VERSION,
          sentAt: new Date().toISOString(),
          feed: frame("stale"),
        }),
      );
    },
    // **Not `1001`.** `goingAway` tells the browser *they are redeploying,
    // come straight back* and it dials in 500 ms — which is right for a deploy
    // and wrong for an outage a spec wants to observe. Task 3.5.7 hit the same
    // edge from the other side and used `1013` for a dropped slow client.
    drop: (code = 1006) => {
      // **Set before the close, and it is what `reconnect` and
      // `overviewOnReconnect` key on** — see `dropped` above for why a
      // connection count was the wrong thing to key on.
      dropped = true;
      // `close` returns a promise and the callers are synchronous by design —
      // a spec says "drop it" and then waits on the chrome, which is the
      // observable this file exists to expose.
      void socket?.close({ code });
    },
    feed: () => venue,
    serveBars: (body) => {
      barsBody = body;
    },
  };
}

/**
 * **A breadth section, so a furnished frame does not draw a region as
 * reserved** (Task 4.4.5).
 *
 * `WireMarketOverviewInputs.breadth` is **required** on the producer — every
 * frame the gateway can build carries a count — so a spec that builds an
 * overview by hand and omits it is modelling the one state the server cannot
 * send: a pinned rollback. `Market breadth` then draws its reserved panel in
 * four specs that are about something else entirely, and the next reader reads
 * it as a defect.
 *
 * **One home rather than four copies**, which is the point of it being here:
 * the day the section gains a field, four specs stop compiling at one line.
 *
 * The figures are the drawing's placeholders and **nothing asserts them** —
 * `overview-breadth-region.spec.ts` is where breadth is the subject. They are
 * internally consistent because `readOverview` refuses a section whose counts
 * do not sum to its denominator or whose denominator exceeds its set.
 */
export const FURNISHED_BREADTH: WireMarketBreadth = {
  basis: "observed",
  advancing: 284,
  declining: 152,
  unchanged: 15,
  measured: 451,
  tracked: 503,
  windowMinutes: 5,
};
