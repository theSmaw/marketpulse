import { marketSessionStateAt } from "@marketpulse/shared";

import type { Config } from "./config.js";
import type { FeedDiagnostic } from "./routes/diagnostics.js";
import type { MarketDataStream } from "./market-data-stream.js";

/**
 * What `GET /diagnostics/feed` answers, assembled from the configuration and —
 * when one exists — the running stream.
 *
 * ## Why it is a function over `Config` rather than a method on a stream
 *
 * **Because the most important thing it reports is true when there is no
 * stream.** ADR 0030 §7c fails a deployed check *at any hour if the deployed
 * feed is `replay`* — and that is answerable from the **configured** provider
 * alone, before a socket is opened and whether or not one ever is. A reading
 * that required a live stream would go silent in exactly the state it exists to
 * catch: a process configured for a replay that has not started one yet.
 *
 * The stream is therefore optional, and its absence is reported as `null`
 * rather than as a healthy-looking default.
 */
export function readFeedDiagnostic(
  config: Pick<Config, "marketDataProvider">,
  at: Date,
  stream?: MarketDataStream,
): FeedDiagnostic {
  const marketOpen = isMarketOpen(at);
  const connection = stream?.connection();

  return {
    provider: config.marketDataProvider,
    feed: stream?.feed ?? null,
    status:
      stream === undefined
        ? null
        : stream.status({
            // Two clocks, because the two thresholds measure different things —
            // see `FeedStatusInputs`. Passing one for both is the defect Task
            // 3.2.6 found, and it made `stale` unreachable.
            now: performance.now(),
            wallNow: at.getTime(),
            marketOpen,
          }),
    observedAt:
      connection?.lastObservationAt === undefined
        ? null
        : new Date(connection.lastObservationAt).toISOString(),
    marketOpen,
    checkedAt: at.toISOString(),
  };
}

/**
 * The market clock, from Story 2.5's calendar.
 *
 * **Unanswerable reads as shut here, which is the opposite of the replay
 * guard's direction and is right for the same reason.** `market-calendar.ts`
 * covers 2024–2028 and throws outside it. The replay guard fails *closed* —
 * unanswerable means *open*, so the replay stops. This is a **report**, and a
 * report that turned a calendar gap into *the market is open* would make
 * `check-deployed.mjs` demand a connected feed on a date nobody can say is a
 * trading day. Reporting `false` is the claim we can defend: *we cannot say this
 * is a session*.
 */
function isMarketOpen(at: Date): boolean {
  try {
    return marketSessionStateAt(at).status === "open";
  } catch {
    return false;
  }
}
