import { describe, expect, it } from "vitest";

import { FEED_STATUSES } from "./feed-status.js";
import {
  CONNECTION_DESCRIPTIONS,
  NOT_CONFIGURED_DESCRIPTION,
  REPLAYING_DESCRIPTION,
  connectionWordFor,
} from "./feed-words.js";
import { MARKET_FEEDS } from "./market-provenance.js";

/** Every row of §11.3's grid is about a browser that can hear the server. */
const REACHABLE = { backendReachable: true } as const;

describe("the connection words", () => {
  it("covers every FeedStatus, so a fourth without words is a compile error", () => {
    // The `Record<FeedStatus, …>` annotation is the guard; this holds the half
    // a type cannot — that the record and the union have not drifted apart.
    expect(Object.keys(CONNECTION_DESCRIPTIONS).sort()).toEqual(
      [...FEED_STATUSES].sort(),
    );
  });

  it("gives every state a label, and a sentence only where one is needed", () => {
    // `MarketFeedDescription.sentence`'s rule, not a new one: a sentence
    // appears when the label cannot stand alone. `LIVE` beside a named venue
    // and a market clock is not ambiguous; `STALE` invites *the price is wrong*
    // and needs correcting.
    for (const status of FEED_STATUSES) {
      expect(CONNECTION_DESCRIPTIONS[status].label).toBeTruthy();
    }

    expect(CONNECTION_DESCRIPTIONS.live.sentence).toBeUndefined();
    expect(CONNECTION_DESCRIPTIONS.stale.sentence).toBeTruthy();
    expect(CONNECTION_DESCRIPTIONS.disconnected.sentence).toBeTruthy();
  });

  it("never claims the market is shut, which is the clock's job", () => {
    // §11.3's grid keeps three regions saying three facts. A connection word
    // that mentioned the market would collapse two of them — and the row that
    // proves it matters is `IEX` / `LIVE` / `CLOSED` at 03:00.
    for (const status of FEED_STATUSES) {
      const words = `${CONNECTION_DESCRIPTIONS[status].label} ${
        CONNECTION_DESCRIPTIONS[status].sentence ?? ""
      }`.toLowerCase();

      expect(words).not.toContain("market is");
      expect(words).not.toContain("closed");
      expect(words).not.toContain("open");
    }
  });
});

describe("REPLAYING, the one string that crosses both vocabularies", () => {
  it("replaces LIVE when the feed is a replay", () => {
    // ADR 0030 decision 4: `LIVE` must never render while the feed is `replay`.
    // `FeedStatus.live` is a claim about a CONNECTION; `LIVE` in the chrome
    // reads as a claim about the MARKET, and on a Saturday afternoon those
    // diverge completely.
    expect(connectionWordFor("live", "replay", REACHABLE)).toBe(
      REPLAYING_DESCRIPTION,
    );
    expect(connectionWordFor("live", "replay", REACHABLE)?.label).toBe(
      "replaying",
    );
    expect(connectionWordFor("live", "iex", REACHABLE)?.label).toBe("live");
  });

  it("does NOT replace the degraded words, which are about the connection", () => {
    // A replay whose own connection is stale or disconnected is stale or
    // disconnected — the substitution is only for `live`, because only `LIVE`
    // is the word that would be read as a claim about the market.
    expect(connectionWordFor("stale", "replay", REACHABLE)?.label).toBe(
      "stale",
    );
    expect(connectionWordFor("disconnected", "replay", REACHABLE)?.label).toBe(
      "disconnected",
    );
  });

  it("is not a fourth FeedStatus", () => {
    // §11.2 keeps that union at three deliberately. `REPLAYING` is a RENDERING
    // of `live`, not a state a connection can be in.
    expect(FEED_STATUSES).not.toContain("replaying");
    expect(Object.keys(CONNECTION_DESCRIPTIONS)).toHaveLength(3);
  });

  it("puts the crossing in ONE place", () => {
    // A component writing `status === "live" && feed === "replay"` for itself
    // is a second place the rule can be got wrong, which is exactly what
    // `pnpm break feed-words-in-a-renderer` exists to catch for the feed's own
    // words. Every feed goes through the same function.
    for (const feed of MARKET_FEEDS) {
      const word = connectionWordFor("live", feed, REACHABLE);
      expect(word?.label).toBe(feed === "replay" ? "replaying" : "live");
    }
  });
});

describe("the unconfigured deployment", () => {
  it("has NO connection word, per §11.3's grid", () => {
    // The grid's row for `none` is `NOT CONFIGURED` in the feed cell and `—` in
    // the connection cell. The gateway sends `disconnected` with `feed: null`
    // because `FeedStatus` has three members and *not configured* is not one —
    // so this is where the wire's shape becomes the grid's.
    for (const status of FEED_STATUSES) {
      expect(connectionWordFor(status, null, REACHABLE)).toBeNull();
    }
  });

  it("says not configured in the feed cell, with its sentence", () => {
    expect(NOT_CONFIGURED_DESCRIPTION.label).toBe("not configured");
    expect(NOT_CONFIGURED_DESCRIPTION.sentence).toBeTruthy();
  });

  it("does not describe itself as an error or a failure", () => {
    // `PROVIDER.md` §5.3 makes `none` the DEFAULT, so that invented prices are
    // never reachable by forgetting to configure something. A default is not a
    // fault, and the words must not read as one.
    const words =
      `${NOT_CONFIGURED_DESCRIPTION.label} ${NOT_CONFIGURED_DESCRIPTION.sentence ?? ""}`.toLowerCase();

    for (const alarming of ["error", "fail", "unavailable", "broken", "lost"]) {
      expect(words).not.toContain(alarming);
    }
  });

  it("is NOT a member of MARKET_FEEDS", () => {
    // Widening that union would invent a feed to describe the absence of one,
    // and every consumer would then handle a member that can never be stamped
    // on a bar.
    expect(MARKET_FEEDS).not.toContain("none");
    expect(MARKET_FEEDS).not.toContain("not-configured");
  });
});

describe("the casing", () => {
  it("leaves the capitals to the stylesheet", () => {
    // §11.3's grid writes every cell in capitals; `.microLabel` carries
    // `text-transform: uppercase` and every cell of the status strip composes
    // it. So a label spelled `LIVE` here asks for them twice, and what a
    // screen reader is handed is the DOM text rather than the transform.
    //
    // `BackendIndicator`'s `STATUS_WORD` — the other cell of this same strip —
    // already ships `healthy` / `degraded` / `unreachable` on the same rule.
    for (const { label } of [
      ...Object.values(CONNECTION_DESCRIPTIONS),
      REPLAYING_DESCRIPTION,
      NOT_CONFIGURED_DESCRIPTION,
    ]) {
      expect(label).toBe(label.toLowerCase());
    }
  });

  it("keeps the connection words identical to the union's own members", () => {
    // Which is what makes Task 3.3.5 a substitution: `FeedIndicator` renders
    // the raw `FeedStatus` today, so pointing it here changes no pixel.
    for (const status of FEED_STATUSES) {
      expect(CONNECTION_DESCRIPTIONS[status].label).toBe(status);
    }
  });
});

describe("losing the backend, which §11.3's grid has no row for", () => {
  const UNREACHABLE = { backendReachable: false } as const;

  it("says disconnected even where the grid draws a dash", () => {
    // `STORY.md` open decision 3, answered by the owner 2026-09-19. A
    // deployment with no provider and a browser that has lost the backend both
    // arrive as `disconnected` with `feed: null`, and they are different facts.
    // The `—` belongs to *the server has no provider*; it does not belong to
    // *we cannot reach the server*, which §36 requires be labelled rather than
    // inferred from an absence.
    expect(connectionWordFor("disconnected", null, REACHABLE)).toBeNull();
    expect(connectionWordFor("disconnected", null, UNREACHABLE)?.label).toBe(
      "disconnected",
    );
  });

  it("outranks the replay rendering, because a replay we cannot hear is not running", () => {
    expect(connectionWordFor("live", "replay", REACHABLE)?.label).toBe(
      "replaying",
    );
    expect(connectionWordFor("live", "replay", UNREACHABLE)?.label).toBe(
      "disconnected",
    );
  });

  it("never renders a healthy word about a server we cannot hear", () => {
    for (const status of FEED_STATUSES) {
      for (const feed of [...MARKET_FEEDS, null]) {
        expect(connectionWordFor(status, feed, UNREACHABLE)?.label).toBe(
          "disconnected",
        );
      }
    }
  });
});
