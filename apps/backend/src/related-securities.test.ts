import { toTicker } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { createRelatedSecuritiesAnswerer } from "./related-securities.js";

import type {
  Sector,
  Security,
  SecurityStatus,
  Ticker,
} from "@marketpulse/shared";
import type { StoredCorrelationGeneration } from "./return-correlation-store.js";

const ASOF = new Date("2026-11-25T14:01:00.000Z");

/**
 * A small universe of the real SHAPE, built here rather than taken from
 * `packages/shared/src/topology-fixture.ts` — that module is deliberately not
 * exported from that package's `index.ts`, on the grounds that nothing outside
 * its own tests has business constructing a universe, and the real curated
 * `UNIVERSE` is 516 rows whose membership answers would make every expectation
 * here a count rather than a list of symbols.
 *
 * Two sectors, two benchmarks, one hub, one proxy with no membership at all,
 * and one untracked equity — the five cases the business-analyst's table names,
 * in nine rows.
 */
function equity(
  symbol: string,
  sector: Sector,
  status: SecurityStatus = "active",
): Security {
  return {
    symbol: toTicker(symbol),
    name: `${symbol} Inc.`,
    exchange: "NYSE",
    kind: "equity",
    sector,
    industry: null,
    status,
    cik: null,
  };
}

function sectorEtf(symbol: string, sector: Sector): Security {
  return {
    symbol: toTicker(symbol),
    name: `${symbol} Select Sector SPDR Fund`,
    exchange: "ARCA",
    kind: "sector_etf",
    sector,
    industry: null,
    status: "active",
    cik: null,
  };
}

function indexEtf(symbol: string): Security {
  return {
    symbol: toTicker(symbol),
    name: `${symbol} Trust`,
    exchange: "ARCA",
    kind: "index_etf",
    sector: null,
    industry: null,
    status: "active",
    cik: null,
  };
}

const UNIVERSE: readonly Security[] = [
  equity("AAA", "technology"),
  equity("BBB", "technology"),
  equity("CCC", "technology"),
  equity("DDD", "energy"),
  equity("ZZZ", "technology", "untracked"),
  sectorEtf("XLK", "technology"),
  sectorEtf("XLE", "energy"),
  indexEtf("SPY"),
  indexEtf("QQQ"),
];

/** No generation at or before any instant — CI's permanent state. */
const NO_GENERATION = {
  generationAsOf: () => Promise.resolve(undefined),
};

function generationWith(
  pairs: readonly { low: string; high: string; r: number }[],
): { generationAsOf: () => Promise<StoredCorrelationGeneration> } {
  const generation = {
    pass: {
      observedAt: new Date("2026-11-25T00:00:00.000Z"),
      sampledPairs: pairs.length,
      retainedPairs: pairs.length,
      refusals: {},
      parameters: { lookbackSessions: 60, spanMinutes: 5, feed: "sip" },
    },
    correlations: pairs.map(({ low, high, r }) => ({
      low: toTicker(low),
      high: toTicker(high),
      r,
      n: 4620,
    })),
  } as unknown as StoredCorrelationGeneration;

  return { generationAsOf: () => Promise.resolve(generation) };
}

const symbolsOf = (rows: readonly { symbol: Ticker }[]): string[] =>
  rows.map((row) => row.symbol);

describe("get_related_securities", () => {
  it("answers an equity with its sector benchmark and its other sector-mates", async () => {
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: NO_GENERATION,
    });

    const outcome = await answerer.answer({ symbol: toTicker("AAA") }, ASOF);

    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") return;

    // `XLK` is the benchmark; `BBB`/`CCC` are the sector-mates reached by the
    // second hop. `DDD` is in another sector, `ZZZ` is untracked and therefore
    // not a node at all, and `SPY`/`QQQ` are two hops the other way.
    expect(symbolsOf(outcome.value.related)).toEqual(["BBB", "CCC", "XLK"]);
    expect(outcome.value.related.map((row) => [...row.relations])).toEqual([
      ["sector_membership"],
      ["sector_membership"],
      ["sector_membership"],
    ]);
    expect(outcome.value.subject).toBe("AAA");
  });

  it("answers a sector ETF with its constituents and its one index parent", async () => {
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: NO_GENERATION,
    });

    const outcome = await answerer.answer({ symbol: toTicker("XLK") }, ASOF);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    expect(symbolsOf(outcome.value.related)).toEqual([
      "AAA",
      "BBB",
      "CCC",
      "SPY",
    ]);
    const relationOf = (symbol: string) =>
      outcome.value.related.find((row) => row.symbol === symbol)?.relations;
    expect(relationOf("AAA")).toEqual(["sector_membership"]);
    expect(relationOf("SPY")).toEqual(["index_membership"]);
  });

  it("answers the hub with the sector ETFs and nothing else", async () => {
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: NO_GENERATION,
    });

    const outcome = await answerer.answer({ symbol: toTicker("SPY") }, ASOF);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    expect(symbolsOf(outcome.value.related)).toEqual(["XLE", "XLK"]);
    expect(
      outcome.value.related.every((row) =>
        row.relations.includes("index_membership"),
      ),
    ).toBe(true);
  });

  it("answers a non-sector-ETF market proxy with an HONESTLY EMPTY list", async () => {
    // `QQQ`, `DIA` and `IWM` carry no membership edge of any kind, which
    // `buildTopologyGraph` refuses to invent — there is no stored constituent
    // list for the first two and `IWM` is disjoint from the S&P 500 by
    // construction. This is the correct answer, not a gap, and it is what the
    // producer turns into NO COMMAND rather than an empty highlight.
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: NO_GENERATION,
    });

    const outcome = await answerer.answer({ symbol: toTicker("QQQ") }, ASOF);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    expect(outcome.value.related).toEqual([]);
    expect(outcome.value.correlation).toBe("not-measured");
  });

  it("refuses an untracked security with `not-tracked`, not an empty answer", async () => {
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: NO_GENERATION,
    });

    const outcome = await answerer.answer({ symbol: toTicker("ZZZ") }, ASOF);

    expect(outcome).toEqual({ kind: "refused", reason: "not-tracked" });
  });

  it("reports `not-measured` where no generation has ever run — never `measured-none`", async () => {
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: NO_GENERATION,
    });

    const outcome = await answerer.answer({ symbol: toTicker("AAA") }, ASOF);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    expect(outcome.value.correlation).toBe("not-measured");
  });

  it("reports `measured-none` where a generation exists and this security has no edge in it", async () => {
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: generationWith([{ low: "BBB", high: "CCC", r: 0.7 }]),
    });

    const outcome = await answerer.answer({ symbol: toTicker("AAA") }, ASOF);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    expect(outcome.value.correlation).toBe("measured-none");
    expect(symbolsOf(outcome.value.related)).toEqual(["BBB", "CCC", "XLK"]);
  });

  it("carries BOTH relation kinds for a sector-mate that is also correlated", async () => {
    // The common case rather than an edge one: ~82–84% of drawn correlation
    // edges join two securities already in the same visible cluster, which is
    // why `relations` is plural on a row and on the command.
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: generationWith([
        { low: "AAA", high: "BBB", r: 0.61 },
        { low: "AAA", high: "DDD", r: -0.52 },
      ]),
    });

    const outcome = await answerer.answer({ symbol: toTicker("AAA") }, ASOF);
    if (outcome.kind !== "ok") throw new Error("expected ok");

    expect(outcome.value.correlation).toBe("measured");
    expect(symbolsOf(outcome.value.related)).toEqual([
      "BBB",
      "CCC",
      "DDD",
      "XLK",
    ]);
    const relationOf = (symbol: string) =>
      outcome.value.related.find((row) => row.symbol === symbol)?.relations;
    // Both kinds, in `TOPOLOGY_EDGE_KINDS`' declaration order.
    expect(relationOf("BBB")).toEqual([
      "sector_membership",
      "return_correlation",
    ]);
    // A cross-cluster correlation is information the membership edges do not
    // carry at all — the reason this half of the answer exists.
    expect(relationOf("DDD")).toEqual(["return_correlation"]);
  });

  it("takes `asOf` as an argument and reads no clock of its own", async () => {
    const seen: Date[] = [];
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: {
        generationAsOf: (atOrBefore: Date) => {
          seen.push(atOrBefore);
          return Promise.resolve(undefined);
        },
      },
    });

    await answerer.answer({ symbol: toTicker("AAA") }, ASOF);

    expect(seen).toEqual([ASOF]);
  });

  it("never names the subject among its own related securities", async () => {
    const answerer = createRelatedSecuritiesAnswerer({
      securities: UNIVERSE,
      relationships: generationWith([{ low: "AAA", high: "BBB", r: 0.61 }]),
    });

    for (const symbol of ["AAA", "XLK", "SPY"]) {
      const outcome = await answerer.answer({ symbol: toTicker(symbol) }, ASOF);
      if (outcome.kind !== "ok") throw new Error("expected ok");
      expect(symbolsOf(outcome.value.related)).not.toContain(symbol);
    }
  });
});
