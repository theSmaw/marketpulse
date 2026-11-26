import { describe, expect, it } from "vitest";

import {
  SECTOR_ETFS,
  TOPOLOGY_EDGE_KINDS,
  toTicker,
} from "@marketpulse/shared";
import type { TopologyNode } from "@marketpulse/shared";

import {
  TOPOLOGY_RELATION_WORDS,
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
    const { line, clause } = topologyHighlightWords(HIGHLIGHT);

    // Three symbols, four drawn nodes. The figure is the three.
    expect(line).toBe(
      "Highlighting NVDA and 3 related securities — sector peers and correlated securities",
    );
    expect(clause).toContain("3 related securities");
    expect(clause).not.toContain("4 ");
  });

  it("agrees its noun with its count", () => {
    const { line } = topologyHighlightWords({
      ...HIGHLIGHT,
      symbols: ["AAPL"],
      relations: ["sector_membership"],
    });

    expect(line).toBe(
      "Highlighting NVDA and 1 related security — sector peers",
    );
  });

  it("draws no dash and no empty tail where no kind is recognised", () => {
    const { line, clause } = topologyHighlightWords({
      ...HIGHLIGHT,
      relations: ["common_industry"],
    });

    expect(line).toBe("Highlighting NVDA and 3 related securities");
    expect(line).not.toContain("—");
    expect(clause).toContain("Every other equity is drawn quieter.");
  });

  it("states the figure identically in both renderings — the thing that could drift", () => {
    const { line, clause } = topologyHighlightWords(HIGHLIGHT);
    const figures = line.match(/\d[\d,]*/gu) ?? [];

    expect(figures).toHaveLength(1);
    for (const figure of figures) expect(clause).toContain(figure);
    expect(clause).toContain("NVDA");
  });
});
