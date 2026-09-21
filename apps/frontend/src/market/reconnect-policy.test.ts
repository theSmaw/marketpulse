import { describe, expect, it } from "vitest";

import { MARKET_STREAM_CLOSE } from "@marketpulse/shared";

import {
  ABNORMAL_FIRST_MS,
  GOING_AWAY,
  GOING_AWAY_FIRST_MS,
  RECONNECT_CEILING_MS,
  reconnectDelayMs,
} from "./reconnect-policy.js";

describe("when to dial again", () => {
  it("comes back FASTER after a deploy than after a dead socket", () => {
    // **The whole reason the close code is read.** §12.2 has the gateway send
    // `1001 going away` on shutdown; §8.5 measured that an abnormal close
    // carries no intent at all. One schedule would be pessimistic enough to
    // make every deploy feel like an outage, or optimistic enough to hammer a
    // server that is genuinely gone.
    expect(reconnectDelayMs(1, GOING_AWAY)).toBe(GOING_AWAY_FIRST_MS);
    expect(reconnectDelayMs(1)).toBe(ABNORMAL_FIRST_MS);
    expect(reconnectDelayMs(1, GOING_AWAY)).toBeLessThan(reconnectDelayMs(1));
  });

  it("treats any code that is not 1001 as carrying no intent", () => {
    // 1006 is what §8.5 measured across five different causes — it is the
    // absence of information rather than a kind of failure.
    expect(reconnectDelayMs(1, 1006)).toBe(ABNORMAL_FIRST_MS);
    expect(reconnectDelayMs(1, 1000)).toBe(ABNORMAL_FIRST_MS);
  });

  it("backs off by doubling", () => {
    expect(reconnectDelayMs(1, GOING_AWAY)).toBe(500);
    expect(reconnectDelayMs(2, GOING_AWAY)).toBe(1_000);
    expect(reconnectDelayMs(3, GOING_AWAY)).toBe(2_000);
    expect(reconnectDelayMs(4, GOING_AWAY)).toBe(4_000);
  });

  it("is bounded, and never gives up", () => {
    // **A ceiling rather than a give-up.** A browser that stopped retrying
    // would leave exactly the DISCONNECTED-until-reload state this task exists
    // to remove — a tab left open overnight should be working in the morning.
    expect(reconnectDelayMs(50, GOING_AWAY)).toBe(RECONNECT_CEILING_MS);
    expect(reconnectDelayMs(500)).toBe(RECONNECT_CEILING_MS);
    expect(Number.isFinite(reconnectDelayMs(1_000))).toBe(true);
  });

  it("never returns a negative or zero delay, whatever it is handed", () => {
    // An attempt count of 0 or below is not reachable from the hook, and a
    // delay of 0 would be a busy loop against a server that is down.
    expect(reconnectDelayMs(0, GOING_AWAY)).toBe(GOING_AWAY_FIRST_MS);
    expect(reconnectDelayMs(-5)).toBe(ABNORMAL_FIRST_MS);
  });
});

describe("the code a dropped-for-being-slow browser is sent (Task 3.5.7)", () => {
  it("backs off rather than returning straight away", () => {
    // **The other end of the gateway's decision.** A slow client told *we are
    // coming straight back* would return in 500 ms, still be slow, and be
    // dropped again — the pair then spends the afternoon doing that.
    expect(reconnectDelayMs(1, MARKET_STREAM_CLOSE.slowClient)).toBeGreaterThan(
      reconnectDelayMs(1, MARKET_STREAM_CLOSE.goingAway),
    );
  });

  it("still comes back, because a connection that improves should recover", () => {
    // §36 wants a reader whose connection improves to recover **without a
    // reload**. Cycling at the ceiling is the degraded state; giving up is not
    // a state this product has.
    expect(reconnectDelayMs(50, MARKET_STREAM_CLOSE.slowClient)).toBe(
      RECONNECT_CEILING_MS,
    );
  });
});
