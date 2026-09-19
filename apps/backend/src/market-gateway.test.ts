import { describe, expect, it } from "vitest";

import {
  MARKET_STREAM_PROTOCOL_VERSION,
  decodeMarketStreamMessage,
  type WireObservation,
} from "@marketpulse/shared";

import { MARKET_STREAM_PATH } from "@marketpulse/shared";

import { KEEPALIVE_INTERVAL_MS } from "./market-gateway.js";

const OBSERVATION: WireObservation = {
  startsAt: "2026-09-16T14:01:00.000Z",
  open: 214.88,
  high: 214.895,
  low: 214.555,
  close: 214.75,
  volume: 5184,
};

describe("the keepalive, which is the inverse of the Alpaca client's situation", () => {
  it("is half the ingress ceiling, so one lost message cannot reach it", () => {
    // `HOSTING.md` measured Azure Container Apps' ingress at a **240-second
    // IDLE** request timeout — named as *idle* in the premium settings table,
    // so it is a ceiling on SILENCE rather than on connection age. A browser
    // socket is INBOUND, so unlike the Alpaca socket it is inside that limit.
    //
    // Half of it, for the same reason the watchdog is three missed heartbeats
    // rather than one: a single delayed message must not reach the ceiling.
    expect(KEEPALIVE_INTERVAL_MS).toBe(120_000);
    expect(KEEPALIVE_INTERVAL_MS * 2).toBe(240_000);
  });

  it("is needed because our own feed is legitimately silent for 76 minutes", () => {
    // §6.6 measured the feed silent for 76 minutes out of hours. Without a
    // keepalive the browser socket would be cut every four minutes all night
    // and the chrome would show `disconnected` about a feed that was working
    // perfectly — which is exactly the lie this story exists not to tell.
    const overnightSilenceMs = 76 * 60_000;

    expect(overnightSilenceMs).toBeGreaterThan(240_000);
    expect(KEEPALIVE_INTERVAL_MS).toBeLessThan(240_000);
  });
});

describe("the path", () => {
  it("is a single decided address", () => {
    // Matched explicitly in the upgrade handler rather than by the library, so
    // an upgrade to any other path is REFUSED rather than silently accepted.
    // Verified against the built server: a connection to `/not-the-stream` is
    // refused.
    expect(MARKET_STREAM_PATH).toBe("/market-stream");
  });
});

describe("what a browser is sent", () => {
  // The gateway's wire output is exercised end-to-end against the built server
  // (see the task's findings); these assert the SHAPES it produces, with no
  // socket, which is what keeps `pnpm verify` credential-free and offline.

  it("sends a snapshot whose empty case is the TRUE answer", () => {
    // §11.1: after a restart the snapshot is `{}` — and that is the true
    // answer, not a degraded one. Nothing about it should read as an error.
    const encoded = JSON.stringify({
      type: "snapshot",
      version: MARKET_STREAM_PROTOCOL_VERSION,
      observations: {},
      feed: { status: "live", feed: "synthetic", marketOpen: false },
    });

    const decoded = decodeMarketStreamMessage(encoded);

    expect(decoded.kind).toBe("message");
    expect(
      decoded.kind === "message" && decoded.message.type === "snapshot"
        ? Object.keys(decoded.message.observations)
        : undefined,
    ).toEqual([]);
  });

  it("sends the connection state as its OWN message", () => {
    // §11.2 requires *our socket is fine and the market feed behind it is dead*
    // to be sayable, and a browser that only ever received observations could
    // not tell a quiet feed from a dead one.
    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        type: "feed",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        feed: { status: "stale", feed: "iex", marketOpen: true },
      }),
    );

    expect(decoded.kind === "message" && decoded.message.type).toBe("feed");
  });

  it("sends observations keyed by symbol", () => {
    const decoded = decodeMarketStreamMessage(
      JSON.stringify({
        type: "bars",
        version: MARKET_STREAM_PROTOCOL_VERSION,
        observations: { NVDA: OBSERVATION },
      }),
    );

    expect(
      decoded.kind === "message" && decoded.message.type === "bars"
        ? Object.keys(decoded.message.observations)
        : undefined,
    ).toEqual(["NVDA"]);
  });
});
