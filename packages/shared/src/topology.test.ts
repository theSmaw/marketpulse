import { describe, expect, it } from "vitest";

import { SECTOR_ETFS, SECTOR_LABELS, SECTORS } from "./security.js";
import {
  TOPOLOGY_HUB,
  buildTopologyGraph,
  type TopologyEdge,
} from "./topology.js";
import {
  TOPOLOGY_FIXTURE_PROXIES,
  TOPOLOGY_FIXTURE_SECTOR_COUNTS,
  topologyFixtureEquity,
  topologyFixtureUniverse,
} from "./topology-fixture.js";

const graph = buildTopologyGraph(topologyFixtureUniverse());

const kindsOf = (edges: readonly TopologyEdge[]) =>
  edges.reduce<Record<string, number>>((counts, edge) => {
    counts[edge.kind] = (counts[edge.kind] ?? 0) + 1;
    return counts;
  }, {});

describe("buildTopologyGraph over a universe of the real shape", () => {
  it("draws one node per tracked security, of three kinds", () => {
    const equities = graph.nodes.filter((node) => node.kind === "equity");
    const sectorEtfs = graph.nodes.filter((node) => node.kind === "sector_etf");
    const proxies = graph.nodes.filter((node) => node.kind === "index_etf");

    expect(equities).toHaveLength(501);
    expect(sectorEtfs).toHaveLength(SECTORS.length);
    expect(sectorEtfs).toHaveLength(11);
    expect(proxies).toHaveLength(TOPOLOGY_FIXTURE_PROXIES.length);
    expect(proxies).toHaveLength(4);
    expect(graph.nodes).toHaveLength(516);
  });

  it("gives every market proxy a `null` cluster, and every other node a sector", () => {
    // **`null` is the complete answer, not a missing one**, and there is
    // deliberately no twelfth pseudo-sector: a `"market"` entry smuggled in
    // here would reach `SECTOR_LABELS`, the eleven ranked rows on `/`, and
    // every reader that iterates the union.
    for (const node of graph.nodes) {
      if (node.kind === "index_etf") {
        expect(node.cluster).toBeNull();
      } else {
        expect(SECTORS).toContain(node.cluster);
      }
    }
  });

  it("draws 501 membership edges and 11 hub edges — 512", () => {
    expect(kindsOf(graph.edges)).toEqual({
      sector_membership: 501,
      index_membership: 11,
    });
    expect(graph.edges).toHaveLength(512);
  });

  it("points every membership edge at its own sector's benchmark", () => {
    // The defect this catches is a PERMUTATION, which is why the assertion
    // walks the edge back to the node's own cluster rather than counting.
    const nodeOf = new Map(graph.nodes.map((node) => [node.symbol, node]));

    for (const edge of graph.edges) {
      if (edge.kind !== "sector_membership") continue;

      const from = nodeOf.get(edge.from);
      expect(from?.kind).toBe("equity");
      expect(edge.to).toBe(SECTOR_ETFS[from?.cluster ?? "technology"]);
    }
  });

  it("attaches all eleven sector ETFs to the hub, and nothing else", () => {
    const hub = graph.edges.filter((edge) => edge.kind === "index_membership");

    expect(hub.map((edge) => edge.to)).toEqual(Array(11).fill(TOPOLOGY_HUB));
    expect([...hub].map((edge) => edge.from).sort()).toEqual(
      SECTORS.map((sector) => SECTOR_ETFS[sector]).sort(),
    );
  });

  it("gives QQQ, DIA and IWM a node and NO edge at all", () => {
    // Three refusals rather than three omissions, and each for its own reason:
    // `QQQ` and `DIA` are overlapping subsets this product stores no
    // constituent list for, and `IWM` is disjoint from the S&P 500 by
    // construction — so for that one there is no relationship to draw rather
    // than an unrecorded one.
    const undecomposed = TOPOLOGY_FIXTURE_PROXIES.filter(
      (symbol) => symbol !== TOPOLOGY_HUB,
    );

    expect(undecomposed).toHaveLength(3);

    for (const symbol of undecomposed) {
      expect(graph.nodes.map((node) => node.symbol)).toContain(symbol);
      expect(
        graph.edges.filter(
          (edge) => edge.from === symbol || edge.to === symbol,
        ),
      ).toEqual([]);
    }
  });

  it("holds no edge whose endpoints are not both nodes", () => {
    // ADR 0029 applied to a line: a claim about data requires data, and a
    // dangling edge is one every renderer then has to decide what to do about.
    const present = new Set(graph.nodes.map((node) => node.symbol));

    for (const edge of graph.edges) {
      expect(present.has(edge.from)).toBe(true);
      expect(present.has(edge.to)).toBe(true);
    }
  });

  it("lists eleven clusters whose members sum to the equities", () => {
    expect(graph.clusters).toHaveLength(11);

    for (const cluster of graph.clusters) {
      expect(cluster.members).toHaveLength(
        TOPOLOGY_FIXTURE_SECTOR_COUNTS[cluster.id],
      );
      // Never the benchmark ETF: it is the thing they are members OF, and
      // including it would make `members.length` disagree with that sector's
      // edge count by one.
      expect(cluster.members).not.toContain(SECTOR_ETFS[cluster.id]);
    }

    expect(graph.clusters.reduce((sum, c) => sum + c.members.length, 0)).toBe(
      501,
    );
  });

  it("filters on `status === 'active'`", () => {
    // A *computing-over-the-market-we-track-now* reader, which `UNIVERSE.md`
    // §12.2 permits. The curated file holds no untracked row today, so the
    // fixture supplies one — without it this filter is written and unproven.
    const withUntracked = buildTopologyGraph(
      topologyFixtureUniverse([
        topologyFixtureEquity("ZZUNT", "energy", "untracked"),
        topologyFixtureEquity("ZZACT", "energy", "active"),
      ]),
    );
    const symbols = withUntracked.nodes.map((node) => node.symbol);

    expect(symbols).toContain("ZZACT");
    expect(symbols).not.toContain("ZZUNT");
    expect(withUntracked.nodes).toHaveLength(517);
    expect(withUntracked.edges).toHaveLength(513);
    expect(
      withUntracked.clusters.find((c) => c.id === "energy")?.members,
    ).not.toContain("ZZUNT");
  });

  it("sorts every array, so two runs over one input are byte-comparable", () => {
    const sorted = <T>(values: readonly T[], key: (value: T) => string) =>
      [...values]
        .map(key)
        .every((value, index, all) =>
          index === 0 ? true : (all[index - 1] ?? "") <= value,
        );

    expect(sorted(graph.nodes, (node) => node.symbol)).toBe(true);
    expect(sorted(graph.clusters, (cluster) => cluster.id)).toBe(true);
    expect(
      sorted(graph.edges, (edge) => `${edge.from}|${edge.to}|${edge.kind}`),
    ).toBe(true);

    for (const cluster of graph.clusters) {
      expect(sorted(cluster.members, (member) => member)).toBe(true);
    }

    // The claim the sort exists for, stated as the thing a reader can check.
    // The input is reversed, so this fails on any array whose order is the
    // arrival order rather than the sort.
    const reversed = buildTopologyGraph(
      [...topologyFixtureUniverse()].reverse(),
    );

    expect(JSON.stringify(reversed)).toBe(JSON.stringify(graph));
  });

  it("is total on an empty universe rather than throwing", () => {
    // CI's store after a migration but before `pnpm universe`, which
    // `CLAUDE.md` records as having no other symptom.
    expect(buildTopologyGraph([])).toEqual({
      nodes: [],
      edges: [],
      clusters: [...SECTORS]
        .sort((left, right) => (left < right ? -1 : 1))
        .map((sector) => ({
          id: sector,
          label: SECTOR_LABELS[sector],
          members: [],
        })),
    });
  });
});
