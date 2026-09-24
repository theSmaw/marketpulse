import {
  MARKET_STREAM_PROTOCOL_VERSION,
  encodeMarketStreamMessage,
} from "@marketpulse/shared";
import type {
  MarketFeed,
  WireFeedState,
  WireObservation,
} from "@marketpulse/shared";
import type { Page, WebSocketRoute } from "@playwright/test";

import { MARKET_DATA_ROUTE_PATTERN } from "./pair.js";

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

/** What the gateway says about itself, in the shape the wire carries. */
interface FeedFrame extends WireFeedState {
  readonly status: "live" | "stale" | "disconnected";
}

export interface ProducedFeed {
  /** Deliver observations, as a `bars` frame — the shape a burst really has. */
  readonly send: (
    observations: Readonly<Record<string, WireObservation>>,
  ) => void;
  /** Say the connection has gone quiet, which the gateway does say. */
  readonly goStale: () => void;
  /** Kill it. The browser concludes `disconnected` from the close itself. */
  readonly drop: (code?: number) => void;
  /** The venue this deployment is modelling, for an assertion to read. */
  readonly feed: () => MarketFeed | null;
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
}

/**
 * Serve the market stream from the test, and hand back the three verbs.
 *
 * Call **before** `page.goto`. Both halves of the feed cell are served from
 * one `feed` value, so this cannot put a connection word beside a venue word
 * the same deployment would not have produced.
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

  let socket: WebSocketRoute | undefined;

  const frame = (status: FeedFrame["status"]): FeedFrame => ({
    status,
    feed: venue,
    marketOpen,
  });

  await page.routeWebSocket(/\/market-stream$/u, (ws) => {
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
  });

  return {
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
      // `close` returns a promise and the callers are synchronous by design —
      // a spec says "drop it" and then waits on the chrome, which is the
      // observable this file exists to expose.
      void socket?.close({ code });
    },
    feed: () => venue,
  };
}
