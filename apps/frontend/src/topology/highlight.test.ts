import { describe, expect, it } from "vitest";

import {
  SECTOR_ETFS,
  TOPOLOGY_EDGE_KINDS,
  buildTopologyGraph,
  toTicker,
} from "@marketpulse/shared";
import type { Sector, TopologyNode } from "@marketpulse/shared";

import { securitiesFixtureBody } from "../fixtures/securities.js";
import { narrowTopologyGraph } from "./filter.js";
import {
  TOPOLOGY_RELATION_WORDS,
  topologyHighlightCut,
  topologyHighlightDrawsAnything,
  topologyHighlightSet,
  topologyHighlightTreatment,
  topologyHighlightWords,
  topologyRelationWords,
} from "./highlight.js";
import type { TopologyHighlight } from "./highlight.js";

const HIGHLIGHT: TopologyHighlight = {
  subject: "NVDA",
  symbols: ["AAPL", "MSFT", SECTOR_ETFS.technology],
  relations: ["sector_membership", "return_correlation"],
};

function equity(symbol: string): TopologyNode {
  return {
    symbol: toTicker(symbol),
    label: `${symbol} Inc.`,
    kind: "equity",
    cluster: "technology",
  };
}

function sectorEtf(symbol: string): TopologyNode {
  return {
    symbol: toTicker(symbol),
    label: `${symbol} fund`,
    kind: "sector_etf",
    cluster: "technology",
  };
}

function proxy(symbol: string): TopologyNode {
  return {
    symbol: toTicker(symbol),
    label: `${symbol} fund`,
    kind: "index_etf",
    cluster: null,
  };
}

describe("topologyHighlightSet — Task 7.4.2", () => {
  it("is `{subject} ∪ symbols`, because the wire deliberately excludes the subject from its own symbols", () => {
    const set = topologyHighlightSet(HIGHLIGHT);

    expect([...set].toSorted()).toStrictEqual(
      ["AAPL", "MSFT", "NVDA", SECTOR_ETFS.technology].toSorted(),
    );
    expect(set.has("NVDA")).toBe(true);
  });

  it("holds the subject exactly once even if a malformed frame repeated it", () => {
    // `readWorkspaceCommandOutcome` cannot refuse this — it validates that
    // `symbols` is a non-empty array of non-empty strings, and the backend's
    // own structural exclusion is what keeps the subject out. A `Set` makes
    // the duplicate unrepresentable here rather than a double count.
    const set = topologyHighlightSet({ ...HIGHLIGHT, symbols: ["NVDA"] });

    expect([...set]).toStrictEqual(["NVDA"]);
  });
});

describe("topologyHighlightTreatment — the four rules, Task 7.4.2", () => {
  const highlighted = topologyHighlightSet(HIGHLIGHT);

  it("quietens nothing at all while no highlight is in force", () => {
    for (const node of [
      equity("XOM"),
      sectorEtf(SECTOR_ETFS.energy),
      proxy("SPY"),
    ]) {
      expect(topologyHighlightTreatment(node, "normal", null)).toBe("full");
      expect(topologyHighlightTreatment(node, "unscored", null)).toBe("full");
    }
  });

  it("draws every member of the set at full strength, the subject included", () => {
    expect(
      topologyHighlightTreatment(equity("NVDA"), "normal", highlighted),
    ).toBe("full");
    expect(
      topologyHighlightTreatment(equity("AAPL"), "high", highlighted),
    ).toBe("full");
  });

  it("quietens an equity outside the set", () => {
    expect(
      topologyHighlightTreatment(equity("XOM"), "normal", highlighted),
    ).toBe("quiet");
    expect(
      topologyHighlightTreatment(equity("XOM"), "unscored", highlighted),
    ).toBe("quiet");
    expect(
      topologyHighlightTreatment(equity("XOM"), "elevated", highlighted),
    ).toBe("quiet");
    expect(topologyHighlightTreatment(equity("XOM"), "high", highlighted)).toBe(
      "quiet",
    );
  });

  it("never quietens one of the fifteen landmarks, in or out of the set — Story 6.3's own exclusion", () => {
    // The hub, a named sector ETF that IS in the set, and ten that are not.
    expect(topologyHighlightTreatment(proxy("SPY"), null, highlighted)).toBe(
      "full",
    );
    expect(topologyHighlightTreatment(proxy("IWM"), null, highlighted)).toBe(
      "full",
    );
    expect(
      topologyHighlightTreatment(
        sectorEtf(SECTOR_ETFS.technology),
        null,
        highlighted,
      ),
    ).toBe("full");

    for (const sector of Object.values(SECTOR_ETFS)) {
      expect(
        topologyHighlightTreatment(sectorEtf(sector), null, highlighted),
      ).toBe("full");
    }
  });

  it("never dims a measured `extreme`, in the set or out of it", () => {
    expect(
      topologyHighlightTreatment(equity("XOM"), "extreme", highlighted),
    ).toBe("full");
    expect(
      topologyHighlightTreatment(equity("NVDA"), "extreme", highlighted),
    ).toBe("full");
  });
});

describe("topologyRelationWords — Task 7.4.2", () => {
  it("names one kind", () => {
    expect(topologyRelationWords(["sector_membership"])).toBe("sector peers");
  });

  it("names two, which is the COMMON case rather than an edge one", () => {
    expect(
      topologyRelationWords(["return_correlation", "sector_membership"]),
    ).toBe("sector peers and correlated securities");
  });

  it("reads TOPOLOGY_EDGE_KINDS' declaration order, never the command's array order", () => {
    const forwards = topologyRelationWords([...TOPOLOGY_EDGE_KINDS]);
    const backwards = topologyRelationWords([...TOPOLOGY_EDGE_KINDS].reverse());

    expect(forwards).toBe(backwards);
    expect(forwards).toBe(
      "sector peers, index members and correlated securities",
    );
  });

  it("says nothing at all about a kind this bundle does not recognise", () => {
    expect(topologyRelationWords(["common_industry"])).toBe("");
    expect(topologyRelationWords([])).toBe("");
    expect(
      topologyRelationWords(["common_industry", "sector_membership"]),
    ).toBe("sector peers");
  });

  it("has a word for every kind the shared vocabulary holds", () => {
    for (const kind of TOPOLOGY_EDGE_KINDS) {
      expect(TOPOLOGY_RELATION_WORDS[kind]).not.toBe("");
    }
  });
});

describe("topologyHighlightWords — one builder, two renderings, Task 7.4.2", () => {
  it("names the subject and counts the RELATED securities, never the drawn set", () => {
    const { line, clause } = topologyHighlightWords(HIGHLIGHT, "set-back");

    // Three symbols, four drawn nodes. The figure is the three.
    expect(line).toBe(
      "Highlighting NVDA and 3 related securities — sector peers and correlated securities",
    );
    expect(clause).toContain("3 related securities");
    expect(clause).not.toContain("4 ");
  });

  it("agrees its noun with its count", () => {
    const { line } = topologyHighlightWords(
      {
        ...HIGHLIGHT,
        symbols: ["AAPL"],
        relations: ["sector_membership"],
      },
      "set-back",
    );

    expect(line).toBe(
      "Highlighting NVDA and 1 related security — sector peers",
    );
  });

  it("draws no dash and no empty tail where no kind is recognised", () => {
    const { line, clause } = topologyHighlightWords(
      {
        ...HIGHLIGHT,
        relations: ["common_industry"],
      },
      "set-back",
    );

    expect(line).toBe("Highlighting NVDA and 3 related securities");
    expect(line).not.toContain("—");
    expect(clause).toContain("Every other equity is set back.");
  });

  it("states the figure identically in both renderings — the thing that could drift", () => {
    const { line, clause } = topologyHighlightWords(HIGHLIGHT, "set-back");
    const figures = line.match(/\d[\d,]*/gu) ?? [];

    expect(figures).toHaveLength(1);
    for (const figure of figures) expect(clause).toContain(figure);
    expect(clause).toContain("NVDA");
  });

  // **Task 7.4.4.** The tail is a claim about ink, and it stops being true the
  // moment the reader's own cut hides everything the command named — there is
  // no de-emphasis drawn there at all, so a sentence saying there is would be
  // describing something that is not on screen.
  it("withholds the de-emphasis claim where the reader's own cut hides the set", () => {
    const { line, clause } = topologyHighlightWords(
      HIGHLIGHT,
      "hidden-by-filter",
    );

    expect(clause).not.toContain("set back");
    expect(clause).toContain("Highlighting NVDA and the 3 related securities");
    // **Nothing is appended at all**, because `topologyFilterWords`' own
    // clause is the single author of that explanation and carries the figures.
    expect(clause.trimEnd()).toMatch(
      /related securities it is joined to[^.]*\.$/u,
    );
    // The drawn line never carried the claim, so it is byte-identical.
    expect(line).toBe(topologyHighlightWords(HIGHLIGHT, "set-back").line);
  });

  /*
   * **Story 7.4's Phase 3, fix 3 — the state that had no sentence anywhere.**
   *
   * Investigating `SPY` highlights the eleven sector ETFs, every one a
   * landmark and excluded from this encoding by Story 6.3's own exclusion set,
   * so `drawsAnything` is `false` and the canvas is byte-identical to the
   * unhighlighted picture — with **no filter to blame**, which is what made
   * this different from the arm above. The reader was told something was
   * highlighted, saw nothing change, and was told nothing about why.
   */
  it("says why the picture did not change where nothing is to blame but the set", () => {
    const { line, clause } = topologyHighlightWords(
      {
        subject: "SPY",
        symbols: ["XLK", "XLE"],
        relations: ["index_membership"],
      },
      "nothing-to-set-back",
    );

    expect(clause).toContain(
      "Nothing is set back; none of these is an equity this graph draws.",
    );
    // It is an ABSENCE stated, never the claim about ink the drawn arm makes.
    expect(clause).not.toContain("Every other equity");
    // And the drawn line is untouched — it never claimed the de-emphasis.
    expect(line).toBe(
      "Highlighting SPY and 2 related securities — index members",
    );
  });

  /*
   * **The three ink outcomes are three DIFFERENT tails** (Phase 3, fixes 1 and
   * 3) — the grammar rather than the strings, which is this surface's own
   * recurring lesson: a table of expected sentences stays green when two of
   * them silently become one.
   */
  it("says something different in each of the three ink states, and the same claim never twice", () => {
    const tails = (
      ["set-back", "hidden-by-filter", "nothing-to-set-back"] as const
    ).map((ink) => topologyHighlightWords(HIGHLIGHT, ink).clause);

    expect(new Set(tails).size).toBe(3);
  });
});

// **What the reader's own cut is doing to a command — Task 7.4.4.**
//
// Over the real recorded universe, for `filter.test.ts`' own stated reason: a
// toy graph cannot tell *the landmarks survived* from *everything survived*,
// and the whole substance of `drawsAnything` is that a landmark must not be
// what licenses a dimmed market.
describe("topologyHighlightCut — Task 7.4.4", () => {
  const GRAPH = buildTopologyGraph(securitiesFixtureBody("full").securities);

  /** What a sector cut draws, in the shape `MarketTopology.tsx` holds it. */
  const drawnFor = (sector: Sector): ReadonlySet<string> =>
    new Set<string>(
      narrowTopologyGraph(GRAPH, sector).nodes.map((node) => node.symbol),
    );

  const technologyEquities = GRAPH.nodes
    .filter((node) => node.kind === "equity" && node.cluster === "technology")
    .map((node) => String(node.symbol))
    .filter((symbol) => symbol !== "NVDA");

  /** The real Technology-equity command this story's own probe is taken on. */
  const TECHNOLOGY: TopologyHighlight = {
    subject: "NVDA",
    symbols: [SECTOR_ETFS.technology, ...technologyEquities],
    relations: ["sector_membership"],
  };

  it("hides nothing and draws everything where no cut applies", () => {
    const cut = topologyHighlightCut(TECHNOLOGY, GRAPH, null);

    expect(cut.peers).toBe(TECHNOLOGY.symbols.length);
    expect(cut.hidden).toBe(0);
    expect(cut.drawsAnything).toBe(true);
  });

  it("counts the peers a cut hides, and never the landmarks it keeps", () => {
    // `?band=…`-shaped: one sector drawn, so every Technology peer survives
    // and nothing is hidden — the direction that proves the count is a count
    // of the DRAWN set rather than of the criterion.
    const cut = topologyHighlightCut(TECHNOLOGY, GRAPH, drawnFor("technology"));

    expect(cut.hidden).toBe(0);
    expect(cut.drawsAnything).toBe(true);
  });

  it("hides every peer, and nothing relevant is drawn, for a cut to another sector", () => {
    const cut = topologyHighlightCut(TECHNOLOGY, GRAPH, drawnFor("energy"));

    // The eleven benchmark ETFs and the four proxies are drawn in every
    // narrowed state, so `XLK` is NOT in the hidden count — the equities are.
    expect(cut.hidden).toBe(technologyEquities.length);
    expect(cut.peers).toBe(technologyEquities.length + 1);
    // And the thing the de-emphasis is conditional on: `XLK` being on screen
    // must not license dimming 21 Energy equities for a reader looking at
    // nothing this command named.
    expect(cut.drawsAnything).toBe(false);
  });

  it("draws something where the SUBJECT alone survives the cut", () => {
    // `NVDA` is an ordinary member of the highlighted set, so a reader looking
    // at it is looking at the thing the set is related to — the de-emphasis
    // around it is a true claim.
    const drawn = new Set<string>(["NVDA", ...drawnFor("energy")]);
    const cut = topologyHighlightCut(TECHNOLOGY, GRAPH, drawn);

    expect(cut.drawsAnything).toBe(true);
    expect(cut.hidden).toBe(technologyEquities.length);
  });

  it("blames no filter for a symbol this universe does not track at all", () => {
    // A newer backend's command reaching an older bundle. The symbol is not
    // hidden by anybody's cut — it is a version skew — and counting it would
    // put a figure beside `Show all` that pressing `Show all` cannot change.
    const cut = topologyHighlightCut(
      { subject: "NVDA", symbols: ["ZZZZ"], relations: ["sector_membership"] },
      GRAPH,
      drawnFor("energy"),
    );

    expect(cut.peers).toBe(1);
    expect(cut.hidden).toBe(0);
  });
});

describe("topologyHighlightDrawsAnything — Task 7.4.4", () => {
  const GRAPH = buildTopologyGraph(securitiesFixtureBody("full").securities);

  it("is false for no command, because nothing named is drawn", () => {
    expect(topologyHighlightDrawsAnything(null, GRAPH, null)).toBe(false);
  });

  it("is false where the set holds only landmarks, filter or no filter", () => {
    // Reachable without any filter at all: `SPY`'s own related set is the
    // eleven sector ETFs, every one of them a landmark. Dimming all 501
    // equities there would be the same false claim with a different cause.
    const landmarks = new Set<string>([
      "SPY",
      ...Object.values(SECTOR_ETFS).map(String),
    ]);

    expect(topologyHighlightDrawsAnything(landmarks, GRAPH, null)).toBe(false);
  });
});
