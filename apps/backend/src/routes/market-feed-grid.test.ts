import { MARKET_FEED_DESCRIPTIONS } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { buildServer } from "../server.js";
import type { Config, MarketDataProviderSelection } from "../config.js";
import { createMarketStream } from "../market-stream.js";
import { resolveMarketData } from "../market-data.js";
import { createMarketDataRoutes } from "./market-data.js";
import type { MarketBarsRepository } from "../market-bars.js";

// **§11.3's grid, as a check rather than as a table** (Task 3.4.9).
//
// The grid has had this row since 2026-09-17:
//
//   | replay | live | shut | `REPLAY` + its sentence | **`REPLAYING`** | `CLOSED` |
//
// and **nothing could produce it**. `GET /market-data` derived its feed from
// the historical provider, and ADR 0030 §3 makes a replay produce none on
// purpose — so the wire said `null`, the chrome said *no market-data provider
// is configured*, and three words later it said `REPLAYING`.
//
// ## Why no existing test could see it
//
// Every test, component and browser assertion renders a combination somebody
// **named**. A row the grid contains and the code cannot reach is not a shape
// any of them has, which is the same defect as Story 3.2's *three
// implementations with no construction site* and Task 3.4.3's *constructed but
// not self-driving*, one surface further out.
//
// So this walks the **selections** rather than the renderings, and asserts the
// rule the grid embodies: **a deployment whose chrome can say a connection word
// must also be able to say a feed word.** Not configured beside a live
// connection is the contradiction, and it is unrepresentable if this holds.

/** 03:00 ET on a Saturday — a replay may only run while the market is shut. */
const SHUT = Date.parse("2026-09-19T07:00:00Z");

const bars = {
  readBars: () => Promise.resolve([]),
} as unknown as MarketBarsRepository;

const configFor = (selection: MarketDataProviderSelection): Config =>
  ({
    marketDataProvider: selection,
    ...(selection === "alpaca"
      ? { alpaca: { keyId: "k", secretKey: "s" } }
      : {}),
  }) as Config;

/** Every selection a deployment can be configured with. Add one, decide it. */
const SELECTIONS: readonly MarketDataProviderSelection[] = [
  "none",
  "fixture",
  "replay",
  "alpaca",
];

/** Registered exactly as `index.ts` does it, so this drives what ships. */
async function feedOn(selection: MarketDataProviderSelection) {
  const app = buildServer({
    logLevel: "silent",
    logFormat: "json",
    corsOrigin: "http://localhost:5173",
  });

  app.register(
    createMarketDataRoutes({
      marketData: resolveMarketData(configFor(selection)),
      bars,
      securities: {
        findSecurity: () => Promise.resolve(undefined),
      },
    }),
  );

  try {
    const response = await app.inject({ method: "GET", url: "/market-data" });
    return (JSON.parse(response.body) as { feed: string | null }).feed;
  } finally {
    await app.close();
  }
}

describe("§11.3's grid is reachable, not just written down", () => {
  it.each(SELECTIONS)(
    "a %s deployment that constructs a stream also reports a feed",
    async (selection) => {
      const stream = createMarketStream(configFor(selection), {
        bars,
        replayFrom: new Date("2026-09-11T13:30:00Z"),
        wallNow: () => SHUT,
      });

      const feed = await feedOn(selection);

      // **The rule, and the only thing this file exists for.** A chrome that
      // can say `LIVE`, `STALE`, `REPLAYING` — anything about a connection —
      // must not be saying *nothing is configured* beside it.
      if (stream !== undefined) expect(feed).not.toBeNull();

      // And a feed on the wire must be one the chrome has words for, or the
      // renderer is handed a slug it cannot name.
      if (feed !== null) {
        expect(Object.keys(MARKET_FEED_DESCRIPTIONS)).toContain(feed);
      }
    },
  );

  it("a replay reports `replay`, which is §11.3's own row", async () => {
    expect(await feedOn("replay")).toBe("replay");
  });

  it("nothing about a configured deployment's chrome changed", async () => {
    // The promise Task 3.4.9 made: `alpaca` still reports the HISTORICAL feed,
    // because its provider declares one and the fallback never evaluates.
    // `PRODUCT_SPEC.md` §7.1's asymmetry — stored bars are the consolidated
    // tape, the live stream is IEX — is not this task's to re-take.
    expect(await feedOn("alpaca")).toBe("sip");
    expect(await feedOn("fixture")).toBe("synthetic");
    expect(await feedOn("none")).toBeNull();
  });
});
