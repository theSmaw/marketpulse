import { describe, expect, it } from "vitest";

import {
  MARKET_STREAM_PROTOCOL_VERSION,
  decodeMarketStreamMessage,
  type WireObservation,
} from "@marketpulse/shared";

import { MARKET_STREAM_PATH } from "@marketpulse/shared";

import { DISCONNECTED_AFTER_MS } from "@marketpulse/shared";

import { KEEPALIVE_INTERVAL_MS } from "./market-gateway.js";

/** When the gateway sent the frame (Task 3.6.4). Any instant; only its presence is load-bearing here. */
const SENT_AT = "2026-09-16T14:02:00.512Z";

const OBSERVATION: WireObservation = {
  startsAt: "2026-09-16T14:01:00.000Z",
  open: 214.88,
  high: 214.895,
  low: 214.555,
  close: 214.75,
  volume: 5184,
};

describe("the keepalive, which is the inverse of the Alpaca client's situation", () => {
  it("is three missed heartbeats of OUR OWN heartbeat (Task 4.7.7)", () => {
    // **Re-derived 2026-10-11, and the repair in the gateway is why.** Until
    // Task 4.7.7 the browser's inbound stream also carried Alpaca's measured
    // 54 s heartbeat, because every advance of the vendor connection was
    // broadcast as a `feed` frame — ~332 a minute (Task 4.1.6). Gating that on
    // a change to the PUBLISHED view removes the vendor's heartbeat from the
    // browser's stream, so the browser's idle floor becomes this timer.
    //
    // At the old 120 s, 165 s is **1.375** keepalives: one delayed message
    // puts a healthy browser on `DISCONNECTED`. ADR 0036's rule is three
    // missed heartbeats, so the keepalive is derived from the threshold that
    // reads it rather than from the ingress ceiling.
    expect(KEEPALIVE_INTERVAL_MS).toBe(55_000);
    expect(KEEPALIVE_INTERVAL_MS * 3).toBe(DISCONNECTED_AFTER_MS);
  });

  it("is still well inside the 240 s ingress ceiling, restated not assumed", () => {
    // `HOSTING.md` measured Azure Container Apps' ingress at a **240-second
    // IDLE** request timeout — named as *idle* in the premium settings table,
    // so it is a ceiling on SILENCE rather than on connection age. A browser
    // socket is INBOUND, so unlike the Alpaca socket it is inside that limit.
    //
    // The ceiling was the old derivation (half of it, 2×); it is now a
    // CONSTRAINT the new derivation has to clear rather than the source of the
    // number — and it clears it by 4.36×, so four consecutive lost keepalives
    // would be needed to reach it.
    const INGRESS_IDLE_CEILING_MS = 240_000;

    expect(KEEPALIVE_INTERVAL_MS * 4).toBeLessThan(INGRESS_IDLE_CEILING_MS);
  });

  it("is needed because our own feed is legitimately silent for 76 minutes", () => {
    // §6.6 measured the feed silent for 76 minutes out of hours. Without a
    // keepalive the browser socket would be cut every four minutes all night
    // and the chrome would show `disconnected` about a feed that was working
    // perfectly — which is exactly the lie this story exists not to tell.
    const overnightSilenceMs = 76 * 60_000;

    expect(overnightSilenceMs).toBeGreaterThan(240_000);
    expect(KEEPALIVE_INTERVAL_MS).toBeLessThan(240_000);
    // And the gate added by Task 4.7.7 does not touch it: an overnight feed
    // publishes no change at all, which is exactly the state this timer is for.
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
      sentAt: SENT_AT,
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
        sentAt: SENT_AT,
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
        sentAt: SENT_AT,
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
