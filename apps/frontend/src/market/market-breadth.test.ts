import { describe, expect, it } from "vitest";

import type {
  WireMarketBreadth,
  WireMarketOverview,
} from "@marketpulse/shared";

import { RESERVED_BREADTH, marketBreadth } from "./market-breadth.js";

const frame = (breadth?: WireMarketBreadth): WireMarketOverview => ({
  computedAt: "2026-10-07T18:01:00.000Z",
  feeds: [],
  figures: [],
  ...(breadth === undefined ? {} : { breadth }),
});

const OBSERVED: WireMarketBreadth = {
  basis: "observed",
  advancing: 284,
  declining: 152,
  unchanged: 15,
  measured: 451,
  tracked: 503,
  windowMinutes: 5,
};

const SESSION: WireMarketBreadth = {
  basis: "session",
  advancing: 206,
  declining: 284,
  unchanged: 11,
  measured: 501,
  tracked: 503,
  session: "2026-10-06",
};

describe("the three rows", () => {
  it("are three, always, in the vocabulary order", () => {
    const view = marketBreadth(frame(OBSERVED));

    expect(view?.rows.map((row) => row.bucket)).toEqual([
      "advancing",
      "declining",
      "unchanged",
    ]);
    expect(view?.rows.map((row) => row.label)).toEqual([
      "Advancing",
      "Declining",
      "Unchanged",
    ]);
  });

  it("carry the counts the wire sent, never a count of its own", () => {
    expect(
      marketBreadth(frame(OBSERVED))?.rows.map((row) => row.count),
    ).toEqual([284, 152, 15]);
  });

  it("are three in every state, including the zeros", () => {
    // **A row is never dropped**, which is what makes `Unchanged 0` a reading
    // of exactly zero rather than a row we have heard nothing about. The
    // component draws no band for it and the origin rule runs through its empty
    // band cell; the row itself is present, labelled and counted.
    const view = marketBreadth(
      frame({ ...OBSERVED, advancing: 299, unchanged: 0, measured: 451 }),
    );

    expect(view?.rows).toHaveLength(3);
    expect(view?.rows[2]).toMatchObject({ bucket: "unchanged", count: 0 });
  });
});

describe("the two scales, which are deliberately different", () => {
  it("measures a band against N and never against the set", () => {
    // Three bands against 503 while the rows count 451 are three bands that are
    // all 10% short, with a strip of nothing at the right end that looks like a
    // fourth state. The fractions sum to 1 exactly, because the counts sum to
    // `measured` — which the wire's own cross-field check guarantees.
    const view = marketBreadth(frame(OBSERVED));
    const fractions = view?.rows.map((row) => row.fraction) ?? [];

    expect(fractions[0]).toBeCloseTo(284 / 451, 10);
    expect(fractions.reduce((sum, part) => sum + part, 0)).toBeCloseTo(1, 10);
  });

  it("prints N as the scale and the set as the group heading", () => {
    const view = marketBreadth(frame(OBSERVED));

    expect(view?.measured).toBe(451);
    expect(view?.tracked).toBe(503);
    expect(view?.setHeading).toBe("Of the 503 we track");
  });

  it("draws the remainder as a subtraction of two printed figures", () => {
    expect(marketBreadth(frame(OBSERVED))?.unheard).toBe(52);
  });

  it("never names the remainder with a fourth word", () => {
    // `unobserved` is the union `stored ∪ unknown`, and a fourth word beside
    // three already on the wire leaves nobody able to say which of the four a
    // reader is looking at. It stays out of the tree entirely.
    const views = [OBSERVED, SESSION].map((breadth) =>
      marketBreadth(frame(breadth)),
    );

    for (const view of views) {
      expect(JSON.stringify(view)).not.toContain("unobserved");
    }
  });
});

describe("the headline", () => {
  it("is advancing minus declining, formatted with its sign", () => {
    expect(marketBreadth(frame(OBSERVED))?.net).toEqual({
      change: "+132",
      direction: "positive",
    });
  });

  it("spells a negative net with U+2212 rather than a hyphen", () => {
    // A hyphen-minus is a different advance width from the digits around it,
    // which undoes exactly what `tabular-nums` was bought for.
    const net = marketBreadth(frame(SESSION))?.net;

    expect(net).toEqual({ change: "−78", direction: "negative" });
    expect(net?.change).not.toContain("-");
  });

  it("claims no direction when the two sides are equal", () => {
    const view = marketBreadth(
      frame({ ...OBSERVED, advancing: 220, declining: 220, measured: 451 }),
    );

    expect(view?.net).toEqual({ change: "0", direction: "unchanged" });
  });

  it("is absent at N = 0, because a net over nothing is a figure about nothing", () => {
    // ADR 0029, and it is the state every gated run meets: CI's store holds 518
    // securities and zero bars.
    const view = marketBreadth(
      frame({
        ...SESSION,
        advancing: 0,
        declining: 0,
        unchanged: 0,
        measured: 0,
      }),
    );

    expect(view?.net).toBeUndefined();
    expect(view?.rows.map((row) => row.fraction)).toEqual([0, 0, 0]);
    expect(view?.unheard).toBe(503);
  });
});

describe("the two grammars, keyed on the basis the wire sent", () => {
  it("reads the window off the frame and never spells a five", () => {
    expect(marketBreadth(frame(OBSERVED))?.claim).toBe(
      "Heard from means at least one observation in the last 5 minutes.",
    );
    expect(
      marketBreadth(frame({ ...OBSERVED, windowMinutes: 15 }))?.claim,
    ).toContain("15 minutes");
  });

  it("agrees with itself about a one-minute window", () => {
    expect(
      marketBreadth(frame({ ...OBSERVED, windowMinutes: 1 }))?.claim,
    ).toContain("1 minute.");
  });

  it("names the session rather than a window with the market shut", () => {
    const view = marketBreadth(frame(SESSION));

    expect(view?.claim).toBe("Close to close on 2026-10-06.");
    expect(view?.claim).not.toContain("minute");
  });

  it("does not call the remainder `Not heard from` about a closed market", () => {
    // Nothing is heard from out of hours, so the live label would be false
    // there. Both strings are placement at a realistic length and Task 4.4.6
    // words them; what is fixed is that neither basis can render the other's.
    expect(marketBreadth(frame(OBSERVED))?.unheardLabel).toBe("Not heard from");
    expect(marketBreadth(frame(SESSION))?.unheardLabel).toBe("No prior close");
  });
});

describe("the region says nothing it cannot establish", () => {
  it("is absent when no frame has arrived", () => {
    expect(marketBreadth(undefined)).toBeUndefined();
  });

  it("is absent when the frame carries no breadth, which is a pinned rollback", () => {
    expect(marketBreadth(frame())).toBeUndefined();
  });

  it("tells `measured: 0` apart from the section being absent", () => {
    // Two different states, spelled differently. *We counted and heard nothing*
    // is a count; *this gateway does not send breadth* is the absence of one.
    const counted = marketBreadth(
      frame({
        ...SESSION,
        advancing: 0,
        declining: 0,
        unchanged: 0,
        measured: 0,
      }),
    );

    expect(counted).not.toBeUndefined();
    expect(counted?.claim).toBe("Close to close on 2026-10-06.");
  });

  it("names no feed, no venue, no instant and no connection word", () => {
    // `one-home-for-the-feed-words` covers this route, and `computedAt` is
    // already drawn by `OverviewSourceNote` under `Computed`. The frame carries
    // both; this module reads neither.
    const drawn = JSON.stringify([
      marketBreadth(frame(OBSERVED)),
      marketBreadth(frame(SESSION)),
    ]);

    for (const word of [
      "live",
      "stale",
      "disconnected",
      "iex",
      "exchange",
      "2026-10-07T18:01",
    ]) {
      expect(drawn.toLowerCase()).not.toContain(word);
    }
  });
});

describe("the reservation", () => {
  it("holds three rows and writes no word a reader could assert", () => {
    // A hidden string is still in `textContent`, which is one `expect` away
    // from being asserted — `RankedList`'s own lesson about its reserved
    // heading. `Of the 0 we track` is false; a non-breaking space is not.
    expect(RESERVED_BREADTH.rows).toHaveLength(3);
    expect(RESERVED_BREADTH.net).toBeUndefined();
    expect(RESERVED_BREADTH.setHeading).toBe(" ");
    expect(RESERVED_BREADTH.unheardLabel).toBe(" ");
    expect(RESERVED_BREADTH.claim).toBe(" ");
  });

  it("is the same shape as a counted view, so the room it holds is the real one", () => {
    expect(Object.keys(RESERVED_BREADTH).sort()).toEqual(
      Object.keys(marketBreadth(frame(OBSERVED)) ?? {}).sort(),
    );
  });
});
