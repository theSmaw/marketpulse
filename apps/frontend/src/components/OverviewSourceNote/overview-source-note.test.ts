import { MARKET_FEED_DESCRIPTIONS } from "@marketpulse/shared";
import type {
  WireMarketOverview,
  WireOverviewFigure,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import type { MarketFeedView } from "../../use-market-feed.js";
import {
  hasOverviewClauses,
  toOverviewSourceNote,
} from "./overview-source-note.js";

// What the landing screen's note says, in every state the frame can be in.
//
// **The assertions are against the shared vocabulary rather than against
// literals**, deliberately: a test spelling `All US exchanges` would be a
// second producer of the most coverage-claiming string in the product, which is
// exactly what `the-consolidated-word-has-one-producer` refuses — and a test is
// where that rule is easiest to break by accident, because the invariant reads
// `.test.ts` out of its corpus.

const SIP = MARKET_FEED_DESCRIPTIONS.sip;
const IEX = MARKET_FEED_DESCRIPTIONS.iex;

const observed = (
  symbol: string,
  changePercent?: number,
): WireOverviewFigure => ({
  state: "observed",
  symbol,
  at: "2026-09-25T18:01:00.000Z",
  price: 774.03,
  ...(changePercent === undefined
    ? {}
    : { changePercent, changeBasis: "2026-09-24" }),
});

const stored = (symbol: string): WireOverviewFigure => ({
  state: "stored",
  symbol,
  session: "2026-09-11",
  close: 764.29,
});

const unknown = (symbol: string): WireOverviewFigure => ({
  state: "unknown",
  symbol,
});

const frame = (
  figures: readonly WireOverviewFigure[],
  feeds: WireMarketOverview["feeds"] = [],
): WireMarketOverview => ({
  computedAt: "2026-09-25T18:01:32.000Z",
  feeds,
  figures,
});

const NOT_CONFIGURED: MarketFeedView = { state: "not-configured" };
const CHECKING: MarketFeedView = { state: "checking" };

describe("toOverviewSourceNote", () => {
  it("says nothing at all before a frame has arrived", () => {
    const note = toOverviewSourceNote(undefined, NOT_CONFIGURED);

    expect(note).toEqual({ observed: null, closes: null, computed: null });
    expect(hasOverviewClauses(note)).toBe(false);
  });

  it("names no feed when nothing has been observed", () => {
    // Every deployment with no provider is permanently in this state, and so
    // is CI's runner. A claim about data requires data: there is no live
    // figure, so there is no feed to name.
    const note = toOverviewSourceNote(
      frame([stored("SPY"), stored("QQQ")]),
      NOT_CONFIGURED,
    );

    expect(note.observed).toBeNull();
    expect(note.closes).toEqual({ label: SIP.label });
  });

  it("names the observed feed when the chrome claims none", () => {
    // Suppression requires a positive match: the chrome says *not configured*
    // and claims no feed at all, so the note states what it cannot.
    const note = toOverviewSourceNote(
      frame([observed("SPY", 0.42)], ["iex"]),
      NOT_CONFIGURED,
    );

    expect(note.observed).toEqual([
      { label: IEX.label, sentence: IEX.sentence },
    ]);
  });

  it("goes quiet only when the chrome names this exact feed", () => {
    const note = toOverviewSourceNote(frame([observed("SPY", 0.42)], ["iex"]), {
      state: "configured",
      feed: "iex",
    });

    expect(note.observed).toBeNull();
    // And the closes clause stays, because the chrome can never state it.
    expect(note.closes?.label).toBe(SIP.label);
  });

  it("speaks when the chrome names a different feed", () => {
    const note = toOverviewSourceNote(frame([observed("SPY", 0.42)], ["iex"]), {
      state: "configured",
      feed: "sip",
    });

    expect(note.observed).toEqual([
      { label: IEX.label, sentence: IEX.sentence },
    ]);
  });

  it("suppresses while the chrome's answer is still in flight", () => {
    // The one exception to the positive-match rule, and it lasts one settle: a
    // row that appears on the first frame and is taken away a few hundred
    // milliseconds later is a worse reading than a fact arriving with
    // everything else.
    expect(
      toOverviewSourceNote(frame([observed("SPY", 0.42)], ["iex"]), CHECKING)
        .observed,
    ).toBeNull();
  });

  it("names every observed tape, in the frame's order", () => {
    const note = toOverviewSourceNote(
      frame([observed("SPY", 0.42)], ["sip", "iex"]),
      { state: "configured", feed: "iex" },
    );

    expect(note.observed?.map((clause) => clause.label)).toEqual([
      SIP.label,
      IEX.label,
    ]);
  });

  it("states the consolidated tape when a live figure was measured from one", () => {
    // The uncomfortable fact this note exists for: an IEX numerator and a
    // consolidated-SIP denominator, on a screen whose chrome says `IEX`.
    const note = toOverviewSourceNote(frame([observed("SPY", 0.42)], ["iex"]), {
      state: "configured",
      feed: "iex",
    });

    expect(note.closes?.sentence).toBeDefined();
  });

  it("says nothing about closes when no figure rests on one", () => {
    const note = toOverviewSourceNote(
      frame([observed("SPY"), unknown("QQQ")], ["iex"]),
      NOT_CONFIGURED,
    );

    expect(note.closes).toBeNull();
  });

  it("drops the sentence when no change is on screen", () => {
    // Per-clause, inside a clause: the label stands alone rather than carrying
    // a sentence about percentages nobody can see.
    const note = toOverviewSourceNote(frame([stored("SPY")]), NOT_CONFIGURED);

    expect(note.closes).toEqual({ label: SIP.label });
  });

  it("renders the aggregate's own instant, whole and in market time", () => {
    expect(
      toOverviewSourceNote(frame([stored("SPY")]), NOT_CONFIGURED).computed,
    ).toBe("2026-09-25 14:01:32 EDT");
  });

  it("skips an instant it cannot read rather than printing Invalid Date", () => {
    const note = toOverviewSourceNote(
      { computedAt: "not an instant", feeds: [], figures: [stored("SPY")] },
      NOT_CONFIGURED,
    );

    expect(note.computed).toBeNull();
    expect(hasOverviewClauses(note)).toBe(true);
  });
});
