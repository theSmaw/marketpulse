import { SECTOR_ETFS, SECTORS, toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { STREAM_SYMBOLS } from "./market-stream.js";
import {
  UNIVERSE,
  indexProxyTickers,
  sectorEtfTickers,
  trackedSecurities,
  trackedSymbols,
  trackedTickers,
} from "./universe.js";

import type { Security } from "@marketpulse/shared";

// **The upstream subscription, at the size the product is actually for**
// (Task 3.5.3). §10.2 settles that this set is a CONSTANT — the server
// remembers nothing across a reconnect (§8.7), so the reconnect path re-sends
// the same thing and there is no subscription state to restore. What is worth
// testing is therefore not a protocol but the three ways a vendor can mislead
// us, all measured in `LIVE-DATA.md` §4.

describe("the symbols this backend subscribes to", () => {
  it("is the tracked universe rather than a literal", () => {
    // It was five hard-coded names until 2026-09-21. The point of this
    // assertion is not the number — `UNIVERSE.md` §8 is explicit that nothing
    // should assert a count, because a hard-coded one becomes a contract — it
    // is that the two agree BY CONSTRUCTION.
    expect(STREAM_SYMBOLS).toEqual(trackedTickers());
    expect(STREAM_SYMBOLS.length).toBe(trackedSecurities().length);

    // And it is materially more than the five it replaced, which is the thing
    // that would silently regress if somebody reintroduced a literal.
    expect(STREAM_SYMBOLS.length).toBeGreaterThan(100);
  });

  it("subscribes to no security we have stopped tracking", () => {
    // `UNIVERSE.md` §12.2's clearest case: *paying a rate-limited feed for a
    // symbol nobody tracks*. `status` is an invisible predicate, so nothing
    // but a test says this holds.
    const subscribed = new Set<string>(STREAM_SYMBOLS);

    for (const security of UNIVERSE) {
      if (security.status !== "active") {
        expect(subscribed.has(security.symbol)).toBe(false);
      }
    }
  });

  it("cannot carry a WELL-FORMED symbol that is in nobody's universe", () => {
    // **§4.4, and the reason this test uses `ZZQQT` rather than
    // `ZZQQTESTX`.** Alpaca SILENTLY ACCEPTED `bars:["ZZQQTESTX"]` and echoed
    // it back as held, so the acknowledgement is not evidence a symbol exists
    // and a security that never produces a bar is indistinguishable from a
    // typo.
    //
    // Task 3.2.4's format check in the mapper rejects `ZZQQTESTX` because nine
    // characters fails the ticker pattern — so testing with THAT symbol would
    // pass for the wrong reason, proving the format check rather than this one.
    // `ZZQQT` is five characters and well-formed: only membership of our own
    // universe can reject it.
    const invention = toTicker("ZZQQT");

    expect(trackedSymbols().has(invention)).toBe(false);
    expect(STREAM_SYMBOLS).not.toContain(invention);
  });

  it("filters `status` through ONE definition, shared with the current state", () => {
    // The predicate moved here from `current-market-state.ts` in Task 3.5.3
    // rather than being copied. §12.2: one invisible predicate is a design and
    // two is a bug waiting for whoever forgets.
    const template = UNIVERSE[0];
    if (template === undefined) throw new Error("the universe is empty");

    const universe: readonly Security[] = [
      { ...template, symbol: toTicker("AAA"), status: "active" },
      { ...template, symbol: toTicker("BBB"), status: "untracked" },
    ];

    expect(trackedTickers(universe)).toEqual([toTicker("AAA")]);
    expect([...trackedSymbols(universe)]).toEqual(["AAA"]);
    expect(trackedSecurities(universe)).toHaveLength(1);
  });
});

describe("the index proxies the overview is about (Task 4.2.4)", () => {
  it("is §6's four names, in §6's order", () => {
    // **The one place this contract is stated**, and the only supplier of the
    // landing page's proxy list. `UNIVERSE.md` §8's rule against asserting a
    // count does not reach here: this is not *how many securities do we
    // track*, it is `PRODUCT_SPEC.md` §6 naming four by hand — a closed set
    // with a published order, which the strip renders left to right.
    //
    // A fifth `index_etf` added to `universe.ts`, or one of these four
    // marked `untracked`, changes the top of the landing page and breaks
    // this. That is the intent: the proxy set is a universe change and not a
    // layout choice, and this is where it announces itself.
    expect(indexProxyTickers()).toEqual(["SPY", "QQQ", "DIA", "IWM"]);
  });

  it("filters on `status`, which is the invisible predicate", () => {
    // `UNIVERSE.md` §12.2: filter when computing over the market we track
    // NOW, and never when showing something we stored. An overview of what
    // is happening right now is squarely the first — the same side
    // `current-market-state.ts` is on.
    const retired: readonly Security[] = UNIVERSE.map((security) =>
      security.symbol === "DIA"
        ? { ...security, status: "untracked" as const }
        : security,
    );

    expect(indexProxyTickers(retired)).toEqual(["SPY", "QQQ", "IWM"]);
  });
});

describe("the sector benchmarks the overview is about (Task 4.3.4)", () => {
  it("is the eleven, in `SECTORS`' declared order, derived from `SECTOR_ETFS`", () => {
    // The order matters beyond tidiness: it is the sector region's tie-break
    // when two figures read the same on screen, so it must be the product's
    // declared order rather than whatever order `universe.ts` lists the funds
    // in. Written here through the mapping rather than as eleven literals —
    // a second literal pairing is the permutation
    // `one-pairing-of-a-sector-and-its-benchmark` refuses.
    expect(sectorEtfTickers()).toEqual(SECTORS.map((s) => SECTOR_ETFS[s]));
  });

  it("holds no symbol the index proxies hold — the split is by membership", () => {
    // The producer calls the join ONCE with both lists and splits the answer
    // by membership. Overlapping sets would put a figure in two sections.
    const proxies = new Set<string>(indexProxyTickers());
    for (const symbol of sectorEtfTickers()) {
      expect(proxies.has(symbol)).toBe(false);
    }
  });

  it("filters on `status`, like every other computation over the market NOW", () => {
    const retired: readonly Security[] = UNIVERSE.map((security) =>
      security.symbol === "XLV"
        ? { ...security, status: "untracked" as const }
        : security,
    );

    expect(sectorEtfTickers(retired)).not.toContain("XLV");
    expect(sectorEtfTickers(retired)).toHaveLength(SECTORS.length - 1);
  });
});
