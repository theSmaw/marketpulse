import { describe, expect, it } from "vitest";

import { MARKET_FEEDS } from "@marketpulse/shared";

import type { LiveFeedView } from "../../market/index.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import { venueFor } from "./venue.js";

// **The venue names the tape the newest numbers came from** (Task 3.10.6).
//
// The defect: on the deployed site during a session the cell read
// `ALL US EXCHANGES · LIVE` beside numbers that were entirely IEX. Two true
// halves from two sources, and invariant 6 breached on every route.

const live = (feed: LiveFeedView["feed"]): LiveFeedView =>
  ({
    status: "live",
    feed,
    backendReachable: true,
    observedAt: undefined,
    unreadable: 0,
    observations: new Map(),
    fromSnapshot: new Set(),
  }) as unknown as LiveFeedView;

const STORED: MarketFeedView = { state: "configured", feed: "sip" };

describe("venueFor", () => {
  it("names the LIVE tape once the socket has reported one", () => {
    // The defect, closed: a `sip` historical provider and an `iex` socket no
    // longer produce `All US exchanges` beside arriving IEX prices.
    expect(venueFor(live("iex"), STORED)).toEqual({
      state: "configured",
      feed: "iex",
    });
  });

  it("names the STORED tape before anything live has arrived", () => {
    // Not a fallback for its own sake: the newest numbers on screen are the
    // charts' and they are the historical tape, so this is the same rule
    // rather than an exception to it.
    expect(venueFor(live(null), STORED)).toEqual(STORED);
  });

  it("keeps naming the live tape after the feed has stopped", () => {
    // The row worth pausing on. After a disconnection the newest figures on
    // screen are STILL the socket's — which is exactly what the chrome's own
    // `showing data through …` means — so a venue that reverted here would
    // relabel numbers that had not changed.
    const dead = { ...live("iex"), status: "disconnected" } as LiveFeedView;

    expect(venueFor(dead, STORED)).toEqual({
      state: "configured",
      feed: "iex",
    });
  });

  it("says nothing when there is no provider at all", () => {
    // §11.3's dash. `createMarketStream` answers `undefined` for a `none`
    // selection, so no stream means no live tape, and the configured view is
    // the one that knows.
    expect(venueFor(live(null), { state: "not-configured" })).toEqual({
      state: "not-configured",
    });
  });

  it("does not resurrect a venue the configured view could not read", () => {
    expect(venueFor(live(null), { state: "unknown" })).toEqual({
      state: "unknown",
    });
  });

  it("never puts a venue beside a live tape that is not it — every pair", () => {
    // **The rule Task 3.10.6 owed, walked at the producers rather than at one
    // rendering.** `market-feed-grid.test.ts` asserts that a connection word
    // has *a* feed word beside it and not that it is the right one — which is
    // exactly why the defect shipped for four days. This is the half that
    // makes the pairing structural: for every live tape and every configured
    // answer, the venue shown IS the live tape.
    const configured: readonly MarketFeedView[] = [
      { state: "configured", feed: "sip" },
      { state: "configured", feed: "iex" },
      { state: "configured", feed: "synthetic" },
      { state: "configured", feed: "replay" },
      { state: "not-configured" },
      { state: "checking" },
      { state: "unknown" },
    ];

    for (const feed of MARKET_FEEDS) {
      for (const view of configured) {
        expect(venueFor(live(feed), view)).toEqual({
          state: "configured",
          feed,
        });
      }
    }
  });
});
