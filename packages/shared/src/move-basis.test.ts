import { describe, expect, it } from "vitest";

import { basisOf, sharedBasis } from "./move-basis.js";
import type { WireOverviewFigure } from "./market-stream-protocol.js";

// These two functions shipped in `apps/frontend/src/market/` and moved here in
// Task 5.6.2 — ADR 0038 decision 2's *one implementation, two processes*. The
// browser's own tests still cover the drawn region; what is here is the pair's
// own behaviour, at the level both processes read it from.

const observed = (changeBasis?: string): WireOverviewFigure => ({
  state: "observed",
  symbol: "NVDA",
  at: "2026-09-11T14:01:00Z",
  price: 100,
  changePercent: 1,
  ...(changeBasis === undefined ? {} : { changeBasis }),
});

const stored = (session: string): WireOverviewFigure => ({
  state: "stored",
  symbol: "NVDA",
  session,
  close: 100,
  sessionChangePercent: 1,
});

describe("basisOf", () => {
  it("puts the KIND in the identity, so one of each can never agree", () => {
    // The prefix is the whole mechanism: a live-against-a-close move and a
    // close-to-close move of a finished session are different claims in the
    // same units, and subtracting one from the other produces a number that
    // looks exactly like the answer.
    expect(basisOf(observed("2026-09-10"))).toBe("observed:2026-09-10");
    expect(basisOf(stored("2026-09-10"))).toBe("stored:2026-09-10");
  });

  it("reads an OMITTED `changeBasis` as a real basis, not a gap", () => {
    // `LiveChange.basis` is `null` on the same-session case — *the previous
    // close, unnamed* — which is a value rather than an absence, and two
    // figures measuring from it share a basis. An inverted mapping compiles and
    // is silently wrong on exactly the days the store's last session meets the
    // live session: every evening in development, every morning after a deploy.
    expect(basisOf(observed())).toBe("observed:");
    expect(sharedBasis(basisOf(observed()), basisOf(observed()))).toBe(true);
  });

  it("answers `undefined` for a figure in neither state", () => {
    expect(basisOf({ state: "unknown", symbol: "NVDA" })).toBeUndefined();
  });
});

describe("sharedBasis — the four outcomes, three of them refusals", () => {
  it("agrees for two figures of one kind measured from one close", () => {
    expect(sharedBasis("observed:2026-09-10", "observed:2026-09-10")).toBe(
      true,
    );
    expect(sharedBasis("stored:2026-09-11", "stored:2026-09-11")).toBe(true);
  });

  it("refuses two figures of one kind measured from different closes", () => {
    expect(sharedBasis("observed:2026-09-10", "observed:2026-09-09")).toBe(
      false,
    );
    expect(sharedBasis("stored:2026-09-11", "stored:2026-09-10")).toBe(false);
  });

  it("refuses one of each, even on the same date", () => {
    expect(sharedBasis("observed:2026-09-10", "stored:2026-09-10")).toBe(false);
  });

  it("refuses an absent identity rather than reading two as a pair", () => {
    // The explicit guard rather than `a === b`, which would read two keyless
    // figures as comparable — a different refusal for a different reason, and
    // not a basis disagreement at all.
    expect(sharedBasis(undefined, undefined)).toBe(false);
    expect(sharedBasis("observed:", undefined)).toBe(false);
    expect(sharedBasis(undefined, "observed:")).toBe(false);
  });
});
