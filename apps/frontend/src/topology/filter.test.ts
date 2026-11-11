import { describe, expect, it } from "vitest";

import {
  SECTORS,
  SECTOR_ETFS,
  TOPOLOGY_HUB,
  buildTopologyGraph,
} from "@marketpulse/shared";
import type {
  AnomalyBand,
  Sector,
  Ticker,
  TopologyGraph,
} from "@marketpulse/shared";

import { securitiesFixtureBody } from "../fixtures/securities.js";
import {
  TOPOLOGY_BAND_REFUSAL,
  narrowTopology,
  narrowTopologyGraph,
  readTopologyFilter,
  topologyBandPath,
  topologyBandWords,
  topologyClearPath,
  topologyCriterion,
  topologyEquityCount,
  topologyFilterNames,
  topologyFilterWords,
  topologyScoredCount,
  topologySectorPath,
} from "./filter.js";
import type { TopologyAnomalyTreatment } from "./renderer.js";

// **The sector filter's three pure halves, over the REAL recorded universe**
// (Task 6.8.1).
//
// `walk.test.ts`' own reason for the fixture choice, and it binds harder here:
// a hand-made graph with three equities in two sectors cannot tell *the
// landmarks survived* from *everything survived*, because the fifteen
// landmarks are exactly what a toy graph leaves out. The recorded body has 518
// securities, eleven sectors, eleven benchmark ETFs, four proxies and the hub,
// so every assertion below is against the counts this product actually draws.

const GRAPH: TopologyGraph = buildTopologyGraph(
  securitiesFixtureBody("full").securities,
);

/**
 * The sector with the most members, so a narrowing is not a near-empty one.
 *
 * Read off the real graph rather than named: a curation change that moved
 * `TECHNOLOGY` out of first place would otherwise leave this file asserting
 * about a sector it no longer means.
 */
const BIGGEST: Sector = biggestSector();

function biggestSector(): Sector {
  const sorted = [...SECTORS].sort(
    (left, right) => membersOf(right).length - membersOf(left).length,
  );
  const first = sorted[0];
  if (first === undefined) throw new Error("SECTORS is empty");
  return first;
}

function membersOf(sector: Sector): readonly string[] {
  return GRAPH.clusters.find((cluster) => cluster.id === sector)?.members ?? [];
}

/** No band has ever been measured — CI's permanent state, and every mount's. */
const NO_BANDS: ReadonlyMap<Ticker, TopologyAnomalyTreatment> = new Map();

/**
 * Every equity drawn `unscored` — which is **not** the same map as
 * {@link NO_BANDS} and is the one distinction the refusal turns on: this is
 * the route having been told, by a real frame, that nothing was scored.
 */
const ALL_UNSCORED: ReadonlyMap<Ticker, TopologyAnomalyTreatment> = new Map(
  GRAPH.nodes
    .filter((node) => node.kind === "equity")
    .map((node) => [node.symbol, "unscored"]),
);

/**
 * A furnished band for every equity, dealt round {@link ANOMALY_BANDS} in
 * ticker order — so the counts below are arithmetic over the real universe
 * rather than three hand-made securities.
 */
function dealtBands(
  graph: TopologyGraph = GRAPH,
): ReadonlyMap<Ticker, TopologyAnomalyTreatment> {
  const bands: readonly AnomalyBand[] = [
    "normal",
    "elevated",
    "high",
    "extreme",
  ];

  return new Map(
    graph.nodes
      .filter((node) => node.kind === "equity")
      .map((node, at) => [
        node.symbol,
        bands[at % bands.length] as TopologyAnomalyTreatment,
      ]),
  );
}

/** How many equities a dealt map puts in one of `wanted`, within `graph`. */
function dealtCount(
  graph: TopologyGraph,
  treatments: ReadonlyMap<Ticker, TopologyAnomalyTreatment>,
  wanted: readonly string[],
): number {
  return graph.nodes.filter(
    (node) =>
      node.kind === "equity" &&
      wanted.includes(treatments.get(node.symbol) ?? ""),
  ).length;
}

/** The words, through the one path the component and the renderer both take. */
function wordsFor(
  filter: ReturnType<typeof readTopologyFilter>,
  treatments: ReadonlyMap<Ticker, TopologyAnomalyTreatment> = NO_BANDS,
  graph: TopologyGraph = GRAPH,
): { readonly line: string; readonly clause: string } | null {
  return topologyFilterWords(
    narrowTopology(graph, topologyCriterion(filter), treatments, null),
    filter,
  );
}

describe("readTopologyFilter", () => {
  it("reads nothing out of an empty address", () => {
    expect(readTopologyFilter("")).toStrictEqual({
      sector: null,
      unrecognised: null,
      bands: [],
      unrecognisedBands: [],
      search: "",
    });
  });

  it("reads a slug the product tracks", () => {
    expect(readTopologyFilter("?sector=energy")).toStrictEqual({
      sector: "energy",
      unrecognised: null,
      bands: [],
      unrecognisedBands: [],
      search: "?sector=energy",
    });
  });

  it("treats a parameter with nothing in it as an address that named none", () => {
    // `use-time-window.ts`' own rule for `?sessions=`: a parameter with
    // nothing in it is not somebody asking for something strange.
    expect(readTopologyFilter("?sector=").sector).toBeNull();
    expect(readTopologyFilter("?sector=").unrecognised).toBeNull();
    expect(readTopologyFilter("?sector=%20%20").unrecognised).toBeNull();
  });

  it("trims, which is not a repair — whitespace is not part of what an address named", () => {
    // The one normalisation this reader performs, and it is `use-time-
    // window.ts`' own: `?sector=energy%20` is the same request as
    // `?sector=energy`, where `?sector=Energy` is a different one.
    expect(readTopologyFilter("?sector=%20energy%20").sector).toBe("energy");
  });

  it("carries an unrecognised value rather than repairing it — including a spelling that differs only in case", () => {
    // **The one assertion in this file that is a decision rather than
    // arithmetic.** `Energy` is the display label and `energy` is the slug,
    // and a reader who shares the wrong one gets the whole market and a
    // sentence saying so — never a silent coercion to the sector it nearly
    // named, which is `use-security-symbol.ts`' own rule about answering a
    // question nobody asked.
    for (const named of ["Energy", "tech", "ENERGY", "ener"]) {
      const filter = readTopologyFilter(`?sector=${encodeURIComponent(named)}`);
      expect(filter.sector, named).toBeNull();
      expect(filter.unrecognised, named).toBe(named);
    }
  });

  it("ignores every other parameter in the address", () => {
    expect(readTopologyFilter("?sessions=21&sector=energy").sector).toBe(
      "energy",
    );
  });
});

describe("topologySectorPath", () => {
  it("writes the slug and never the label", () => {
    expect(topologySectorPath("", "health_care")).toBe("/?sector=health_care");
  });

  it("DELETES the parameter for the whole market rather than writing a default", () => {
    // `securityPath`'s own rule: an address that accretes every default is a
    // session dump rather than a shareable link.
    expect(topologySectorPath("?sector=energy", null)).toBe("/");
  });

  it("preserves a parameter some other surface put there", () => {
    const path = topologySectorPath("?sessions=21&sector=energy", "materials");
    expect(path).toContain("sessions=21");
    expect(path).toContain("sector=materials");
    expect(path.startsWith("/?")).toBe(true);
  });

  it("clears the filter without taking the rest of the address with it", () => {
    expect(topologySectorPath("?sessions=21&sector=energy", null)).toBe(
      "/?sessions=21",
    );
  });
});

describe("narrowTopologyGraph", () => {
  it("answers the SAME object for the whole market", () => {
    // Relied on rather than incidental: `topologySource` memoises on identity
    // and the renderer compares its criterion before doing any work, so the
    // unfiltered picture costs this surface nothing at all.
    expect(narrowTopologyGraph(GRAPH, null)).toBe(GRAPH);
  });

  it("keeps every landmark and only the chosen sector's equities", () => {
    const narrowed = narrowTopologyGraph(GRAPH, BIGGEST);
    const kinds = narrowed.nodes.map((node) => node.kind);

    // The fifteen landmarks: eleven benchmark ETFs, four proxies (the hub is
    // one of them). Never excluded — they are the keyboard walk's own tree.
    expect(kinds.filter((kind) => kind === "sector_etf")).toHaveLength(
      SECTORS.length,
    );
    expect(narrowed.nodes.map((node) => node.symbol)).toContain(TOPOLOGY_HUB);
    for (const sector of SECTORS) {
      expect(narrowed.nodes.map((node) => node.symbol)).toContain(
        SECTOR_ETFS[sector],
      );
    }

    expect(topologyEquityCount(narrowed)).toBe(membersOf(BIGGEST).length);
    expect(
      narrowed.nodes
        .filter((node) => node.kind === "equity")
        .every((node) => node.cluster === BIGGEST),
    ).toBe(true);
  });

  it("drops an edge the moment either endpoint goes, and keeps all eleven hub edges", () => {
    const narrowed = narrowTopologyGraph(GRAPH, BIGGEST);
    const drawn = new Set(narrowed.nodes.map((node) => node.symbol));

    expect(
      narrowed.edges.every(
        (edge) => drawn.has(edge.from) && drawn.has(edge.to),
      ),
    ).toBe(true);

    // Both endpoints of a hub edge are landmarks, so none of them can go.
    expect(
      narrowed.edges.filter((edge) => edge.kind === "index_membership"),
    ).toHaveLength(
      GRAPH.edges.filter((edge) => edge.kind === "index_membership").length,
    );

    // The sector's own spokes survive whole, and nobody else's do.
    expect(
      narrowed.edges.filter((edge) => edge.kind === "sector_membership"),
    ).toHaveLength(membersOf(BIGGEST).length);
  });

  it("empties every other cluster's members rather than removing the cluster", () => {
    // **What makes the keyboard walk agree by construction**: `ArrowDown` on a
    // filtered-out sector ETF answers `null` because there is genuinely
    // nothing drawn under it — and the ETF keeps its place on the ring, so a
    // reader can still walk round it and out.
    const narrowed = narrowTopologyGraph(GRAPH, BIGGEST);

    expect(narrowed.clusters).toHaveLength(GRAPH.clusters.length);
    for (const cluster of narrowed.clusters) {
      expect(cluster.members.length === 0, cluster.id).toBe(
        cluster.id !== BIGGEST,
      );
    }
  });

  it("leaves the graph it was given untouched", () => {
    const equitiesBefore = topologyEquityCount(GRAPH);
    narrowTopologyGraph(GRAPH, BIGGEST);
    expect(topologyEquityCount(GRAPH)).toBe(equitiesBefore);
  });
});

describe("topologyFilterWords", () => {
  it("says NOTHING about the whole market", () => {
    // An absence of a clause rather than a clause about an absence — the
    // state this screen is in until somebody presses something.
    expect(wordsFor(readTopologyFilter(""))).toBeNull();
  });

  it("states the drawn count, the tracked count and the sector — both read off the graphs", () => {
    const words = wordsFor(readTopologyFilter(`?sector=${BIGGEST}`));

    expect(words).not.toBeNull();
    expect(words?.line).toContain(String(membersOf(BIGGEST).length));
    expect(words?.line).toContain(String(topologyEquityCount(GRAPH)));
    expect(words?.line).toContain("we track");
    // The clause the accessible sentence carries is composed from the line's
    // own figures, and it leads with a space because it is appended to a
    // sentence rather than being one.
    expect(words?.clause.startsWith(" ")).toBe(true);
    expect(words?.clause).toContain(String(membersOf(BIGGEST).length));
  });

  it("says the whole market is drawn when the address named something that is not a sector — and never echoes what it named", () => {
    const words = wordsFor(readTopologyFilter("?sector=Energy"));

    expect(words?.line).toBe(
      "Not a sector we track — the whole market is drawn",
    );
    // Unvalidated text out of the address never reaches the page.
    expect(words?.clause).not.toContain("Energy");
  });

  it("states the criterion AND the population it was applied to when nothing matched", () => {
    // Reachable on a store whose curated universe holds no equity in one
    // sector: *nothing matched* and *nothing is tracked* are two facts, and
    // the sentence has to say which.
    const emptied: TopologyGraph = {
      nodes: GRAPH.nodes.filter(
        (node) => node.kind !== "equity" || node.cluster !== BIGGEST,
      ),
      edges: [],
      clusters: GRAPH.clusters.map((cluster) =>
        cluster.id === BIGGEST ? { ...cluster, members: [] } : cluster,
      ),
    };

    const words = wordsFor(
      readTopologyFilter(`?sector=${BIGGEST}`),
      NO_BANDS,
      emptied,
    );

    // **The denominator is the EMPTIED universe's own**, which is a repair
    // this task made rather than a loosening: Task 6.8.1's version handed
    // `topologyFilterWords` the full graph and the emptied narrowing, which no
    // caller can now do — a store with no Industrials tracks 420 equities, and
    // 503 was a figure from a universe this arm does not describe.
    expect(words?.line).toContain(String(topologyEquityCount(emptied)));
    expect(words?.clause).toContain("Show all");
  });

  it("names a sector with the label SECTOR_LABELS holds, never a transform of the slug", () => {
    // `security.ts`' own note: "Health Care" and "Healthcare" are the same
    // slug and different words, and a transform picks one silently.
    const words = wordsFor(readTopologyFilter("?sector=health_care"));

    expect(words?.line).toContain("Health Care");
  });
});

// --- Task 6.8.2: the band, the stacking, and the refusal ------------------
//
// **The population a band cut states is arithmetic over a LIVE map**, which is
// why these are unit tests over the real recorded universe rather than a
// browser assertion: CI's store has 516 securities, zero bars and no composite
// generation, so no gated machine will ever draw one of these counts. The
// refusal is the only arm a gated run reaches, and
// `overview-market-topology-filter.spec.ts` asserts that one against a real
// `pnpm store:bare`.

describe("readTopologyFilter — the band half", () => {
  it("reads one band, and a comma-separated set", () => {
    expect(readTopologyFilter("?band=high").bands).toStrictEqual(["high"]);
    expect(readTopologyFilter("?band=high,extreme").bands).toStrictEqual([
      "high",
      "extreme",
    ]);
  });

  it("answers ANOMALY_BANDS' own order, never the address's, and deduplicates", () => {
    // Two orderings of one set are two addresses for one picture — and the
    // words this module builds are read off this array, so a reversed address
    // would otherwise produce a second spelling of one criterion.
    expect(readTopologyFilter("?band=extreme,high").bands).toStrictEqual([
      "high",
      "extreme",
    ]);
    expect(readTopologyFilter("?band=high,high").bands).toStrictEqual(["high"]);
  });

  it("carries an unrecognised band rather than coercing it — case included", () => {
    for (const named of ["HIGH", "High", "severe", "unscored"]) {
      const filter = readTopologyFilter(`?band=${encodeURIComponent(named)}`);
      expect(filter.bands, named).toStrictEqual([]);
      expect(filter.unrecognisedBands, named).toStrictEqual([named]);
    }
  });

  it("treats an empty member as an address that named one fewer", () => {
    expect(readTopologyFilter("?band=high,").bands).toStrictEqual(["high"]);
    expect(readTopologyFilter("?band=").bands).toStrictEqual([]);
    expect(readTopologyFilter("?band=").unrecognisedBands).toStrictEqual([]);
  });

  it("reads both parameters out of one address", () => {
    const filter = readTopologyFilter("?sector=energy&band=extreme");
    expect(filter.sector).toBe("energy");
    expect(filter.bands).toStrictEqual(["extreme"]);
  });
});

describe("topologyBandPath", () => {
  it("adds a band a reader has not chosen, and removes one they have", () => {
    expect(topologyBandPath("", "high")).toBe("/?band=high");
    expect(topologyBandPath("?band=high", "high")).toBe("/");
  });

  it("stacks, in ANOMALY_BANDS' order whatever order the presses came in", () => {
    expect(topologyBandPath("?band=extreme", "high")).toBe(
      "/?band=high%2Cextreme",
    );
  });

  it("DELETES the parameter for every band rather than writing a default", () => {
    expect(topologyBandPath("?band=high,extreme", null)).toBe("/");
  });

  it("carries the sector parameter through a band press, and the reverse", () => {
    expect(topologyBandPath("?sector=energy", "high")).toContain(
      "sector=energy",
    );
    expect(topologySectorPath("?band=high", "energy")).toContain("band=high");
  });
});

describe("topologyClearPath", () => {
  it("drops BOTH cuts, and nothing else", () => {
    expect(topologyClearPath("?sessions=21&sector=energy&band=high")).toBe(
      "/?sessions=21",
    );
    expect(topologyClearPath("?sector=energy&band=high")).toBe("/");
  });
});

describe("topologyBandWords", () => {
  it("joins with OR, because the cut is a union", () => {
    // *high and extreme* would describe a security that is both, which no
    // security can be.
    expect(topologyBandWords(["high"])).toBe("high");
    expect(topologyBandWords(["high", "extreme"])).toBe("high or extreme");
    expect(topologyBandWords(["elevated", "high", "extreme"])).toBe(
      "elevated, high or extreme",
    );
  });

  it("reads ANOMALY_BANDS' order out of whatever order it is handed", () => {
    expect(topologyBandWords(["extreme", "elevated"])).toBe(
      "elevated or extreme",
    );
  });

  it("says nothing at all for no band", () => {
    expect(topologyBandWords([])).toBe("");
  });
});

describe("topologyScoredCount", () => {
  it("counts a real band and never an absence or an `unscored`", () => {
    // The renderer draws an equity missing from the map as `normal`, which is
    // a DRAWING default rather than a reading — a cut that treated it as a
    // score would claim the composite had answered where it had not.
    expect(topologyScoredCount(GRAPH, NO_BANDS)).toBe(0);
    expect(topologyScoredCount(GRAPH, ALL_UNSCORED)).toBe(0);
    expect(topologyScoredCount(GRAPH, dealtBands())).toBe(
      topologyEquityCount(GRAPH),
    );
  });

  it("counts over the graph it is handed, so a sector cut narrows the population", () => {
    const inSector = narrowTopologyGraph(GRAPH, BIGGEST);
    expect(topologyScoredCount(inSector, dealtBands())).toBe(
      membersOf(BIGGEST).length,
    );
  });
});

describe("narrowTopology — the band cut", () => {
  it("REFUSES rather than drawing an empty market where nothing is scored", () => {
    for (const treatments of [NO_BANDS, ALL_UNSCORED]) {
      const narrowing = narrowTopology(
        GRAPH,
        topologyCriterion(readTopologyFilter("?band=high,extreme")),
        treatments,
        null,
      );

      expect(narrowing.bandRefused).toBe(true);
      expect(narrowing.matched).toBeNull();
      // The whole market, not zero nodes — ADR 0029's false impression.
      expect(narrowing.graph).toBe(GRAPH);
    }
  });

  it("draws the union of the named bands, and nothing else", () => {
    const treatments = dealtBands();
    const narrowing = narrowTopology(
      GRAPH,
      topologyCriterion(readTopologyFilter("?band=high,extreme")),
      treatments,
      null,
    );

    expect(narrowing.bandRefused).toBe(false);
    expect(narrowing.matched).toBe(
      dealtCount(GRAPH, treatments, ["high", "extreme"]),
    );
    expect(topologyEquityCount(narrowing.graph)).toBe(narrowing.matched);
    expect(
      narrowing.graph.nodes
        .filter((node) => node.kind === "equity")
        .every((node) =>
          ["high", "extreme"].includes(treatments.get(node.symbol) ?? ""),
        ),
    ).toBe(true);
  });

  it("keeps every landmark, whatever the band cut", () => {
    const narrowing = narrowTopology(
      GRAPH,
      topologyCriterion(readTopologyFilter("?band=extreme")),
      dealtBands(),
      null,
    );
    const drawn = narrowing.graph.nodes.map((node) => node.symbol);

    expect(drawn).toContain(TOPOLOGY_HUB);
    for (const sector of SECTORS) expect(drawn).toContain(SECTOR_ETFS[sector]);
  });

  it("shrinks each cluster's MEMBERS to what is drawn, so the keyboard walk cannot land on invisible ink", () => {
    const treatments = dealtBands();
    const narrowing = narrowTopology(
      GRAPH,
      topologyCriterion(readTopologyFilter("?band=extreme")),
      treatments,
      null,
    );
    const drawn = new Set(narrowing.graph.nodes.map((node) => node.symbol));

    expect(narrowing.graph.clusters).toHaveLength(GRAPH.clusters.length);
    for (const cluster of narrowing.graph.clusters) {
      for (const member of cluster.members) {
        expect(drawn.has(member), `${cluster.id}/${member}`).toBe(true);
      }
    }
  });

  it("drops an edge the moment either endpoint goes", () => {
    const narrowing = narrowTopology(
      GRAPH,
      topologyCriterion(readTopologyFilter("?band=extreme")),
      dealtBands(),
      null,
    );
    const drawn = new Set(narrowing.graph.nodes.map((node) => node.symbol));

    expect(
      narrowing.graph.edges.every(
        (edge) => drawn.has(edge.from) && drawn.has(edge.to),
      ),
    ).toBe(true);
  });

  it("STACKS with the sector as an intersection, and states both populations", () => {
    const treatments = dealtBands();
    const filter = readTopologyFilter(`?sector=${BIGGEST}&band=high,extreme`);
    const narrowing = narrowTopology(
      GRAPH,
      topologyCriterion(filter),
      treatments,
      null,
    );
    const inSector = narrowTopologyGraph(GRAPH, BIGGEST);

    expect(narrowing.tracked).toBe(topologyEquityCount(GRAPH));
    expect(narrowing.inSector).toBe(membersOf(BIGGEST).length);
    expect(narrowing.matched).toBe(
      dealtCount(inSector, treatments, ["high", "extreme"]),
    );
    expect(
      narrowing.graph.nodes
        .filter((node) => node.kind === "equity")
        .every((node) => node.cluster === BIGGEST),
    ).toBe(true);
  });

  it("PINS the reader's own selection, drawn but never counted", () => {
    // The selection survives a live band update that moves it out of the
    // active band — *a reading that is stale about the minute it names is
    // wrong in a way a not-the-latest one is not*, one surface over — and the
    // stated count is still the criterion's own answer.
    const treatments = dealtBands();
    const normalOne = GRAPH.nodes.find(
      (node) =>
        node.kind === "equity" && treatments.get(node.symbol) === "normal",
    );
    expect(normalOne).toBeDefined();
    if (normalOne === undefined) return;

    const criterion = topologyCriterion(readTopologyFilter("?band=extreme"));
    const loose = narrowTopology(GRAPH, criterion, treatments, null);
    const pinned = narrowTopology(
      GRAPH,
      criterion,
      treatments,
      normalOne.symbol,
    );

    expect(loose.graph.nodes.map((node) => node.symbol)).not.toContain(
      normalOne.symbol,
    );
    expect(pinned.graph.nodes.map((node) => node.symbol)).toContain(
      normalOne.symbol,
    );
    // The count is the criterion's, never the criterion plus the pin.
    expect(pinned.matched).toBe(loose.matched);
    expect(topologyEquityCount(pinned.graph)).toBe((loose.matched ?? 0) + 1);
    // And the pinned node is in its cluster's members, so an arrow key can
    // still step away from it — `walk.ts`' `step` answers `null` for a symbol
    // its group does not hold.
    expect(
      pinned.graph.clusters.find((cluster) => cluster.id === normalOne.cluster)
        ?.members,
    ).toContain(normalOne.symbol);
  });

  it("applies NO cut at all where the address named something unrecognised", () => {
    for (const search of ["?sector=Energy&band=high", "?band=HIGH"]) {
      const criterion = topologyCriterion(readTopologyFilter(search));
      expect(criterion, search).toStrictEqual({ sector: null, bands: [] });
      expect(
        narrowTopology(GRAPH, criterion, dealtBands(), null).graph,
        search,
      ).toBe(GRAPH);
    }
  });
});

describe("topologyFilterWords — the two-clause grammar", () => {
  it("refuses with the stated reason, naming what is missing rather than a verdict", () => {
    const words = wordsFor(readTopologyFilter("?band=high,extreme"));

    expect(words?.line).toBe(TOPOLOGY_BAND_REFUSAL);
    expect(words?.clause).toContain(TOPOLOGY_BAND_REFUSAL);
    // No threshold, no status word, no connection word.
    expect(words?.line).not.toContain("0");
  });

  it("states the sector's own population AND refuses the band, where both were asked for", () => {
    const words = wordsFor(
      readTopologyFilter(`?sector=${BIGGEST}&band=extreme`),
      ALL_UNSCORED,
    );

    expect(words?.line).toContain(String(membersOf(BIGGEST).length));
    expect(words?.line).toContain(TOPOLOGY_BAND_REFUSAL);
  });

  it("states the tracked population for a band with no sector", () => {
    const treatments = dealtBands();
    const words = wordsFor(
      readTopologyFilter("?band=high,extreme"),
      treatments,
    );
    const matched = dealtCount(GRAPH, treatments, ["high", "extreme"]);

    expect(words?.line).toBe(
      `${String(matched)} of the ${String(topologyEquityCount(GRAPH))} companies we track are high or extreme`,
    );
  });

  it("puts the band clause INSIDE the sector's population — `and N of those`", () => {
    const treatments = dealtBands();
    const words = wordsFor(
      readTopologyFilter(`?sector=${BIGGEST}&band=high,extreme`),
      treatments,
    );
    const matched = dealtCount(
      narrowTopologyGraph(GRAPH, BIGGEST),
      treatments,
      ["high", "extreme"],
    );

    expect(words?.line).toContain(
      `${String(membersOf(BIGGEST).length)} of the ${String(topologyEquityCount(GRAPH))} companies we track are in`,
    );
    expect(words?.line).toContain(
      `and ${String(matched)} of those are high or extreme`,
    );
  });

  it("spells a zero count `none`, never a bare 0 — at both grammars", () => {
    // `measured-set.ts`' own `countInWords`: a clause reading *0 of those are
    // high* is a figure where a word belongs. The cohort is non-zero here, so
    // this is Task 6.8.1's no-match state rather than the refusal.
    const onlyNormal: ReadonlyMap<Ticker, TopologyAnomalyTreatment> = new Map(
      GRAPH.nodes
        .filter((node) => node.kind === "equity")
        .map((node) => [node.symbol, "normal"]),
    );

    const bandOnly = wordsFor(readTopologyFilter("?band=extreme"), onlyNormal);
    expect(bandOnly?.line).toBe(
      `None of the ${String(topologyEquityCount(GRAPH))} companies we track are extreme`,
    );

    const stacked = wordsFor(
      readTopologyFilter(`?sector=${BIGGEST}&band=extreme`),
      onlyNormal,
    );
    expect(stacked?.line).toContain("and none of those are extreme");
    expect(stacked?.line).not.toContain(" 0 ");
  });

  it("spells a matched count of exactly 1 with `is`, never `are` — both grammars (Task 6.8.4, docs/GAPS.md)", () => {
    // The sibling of `MarketTopology.tsx`'s own `isAre` repair (Task 6.8.3),
    // routed here because no store this epic has measured against holds
    // exactly one `extreme` equity — reachable only by constructing the
    // treatment map directly, as this test does.
    const equities = GRAPH.nodes.filter((node) => node.kind === "equity");
    const exactlyOneExtreme: ReadonlyMap<Ticker, TopologyAnomalyTreatment> =
      new Map(
        equities.map((node, at) => [
          node.symbol,
          at === 0 ? "extreme" : "normal",
        ]),
      );

    const bandOnly = wordsFor(
      readTopologyFilter("?band=extreme"),
      exactlyOneExtreme,
    );
    expect(bandOnly?.line).toBe(
      `1 of the ${String(topologyEquityCount(GRAPH))} companies we track is extreme`,
    );
    expect(bandOnly?.line).not.toContain("1 are");

    const biggestEquities = GRAPH.nodes.filter(
      (node) => node.kind === "equity" && node.cluster === BIGGEST,
    );
    const oneExtremeInBiggest: ReadonlyMap<Ticker, TopologyAnomalyTreatment> =
      new Map(
        biggestEquities.map((node, at) => [
          node.symbol,
          at === 0 ? "extreme" : "normal",
        ]),
      );

    const stacked = wordsFor(
      readTopologyFilter(`?sector=${BIGGEST}&band=extreme`),
      oneExtremeInBiggest,
    );
    expect(stacked?.line).toContain("and 1 of those is extreme");
    expect(stacked?.line).not.toContain("of those are extreme");
  });

  it("says which PARAMETER was not understood, rather than `not a filter we recognise`", () => {
    expect(wordsFor(readTopologyFilter("?band=HIGH"))?.line).toBe(
      "Not a band we score — the whole market is drawn",
    );
    expect(wordsFor(readTopologyFilter("?sector=Energy"))?.line).toBe(
      "Not a sector we track — the whole market is drawn",
    );
  });

  it("withholds the band conjunct entirely where the sector itself holds nothing", () => {
    // `measured-set.ts`' discipline: a conjunct over a population that does
    // not exist is a denominator about nothing.
    const emptied: TopologyGraph = {
      nodes: GRAPH.nodes.filter(
        (node) => node.kind !== "equity" || node.cluster !== BIGGEST,
      ),
      edges: [],
      clusters: GRAPH.clusters.map((cluster) =>
        cluster.id === BIGGEST ? { ...cluster, members: [] } : cluster,
      ),
    };

    const words = wordsFor(
      readTopologyFilter(`?sector=${BIGGEST}&band=extreme`),
      dealtBands(),
      emptied,
    );

    expect(words?.line).toContain("is tracked");
    expect(words?.line).not.toContain("extreme");
  });
});

describe("topologyFilterNames", () => {
  it("is true of every address that names anything, and false of the whole market", () => {
    // The one question about the criterion a RENDER may ask: whether the note
    // is on screen at all. Its text is a cut over live data and is written
    // imperatively.
    expect(topologyFilterNames(readTopologyFilter(""))).toBe(false);
    expect(topologyFilterNames(readTopologyFilter("?sessions=21"))).toBe(false);
    for (const search of [
      "?sector=energy",
      "?band=high",
      "?sector=Energy",
      "?band=HIGH",
    ]) {
      expect(topologyFilterNames(readTopologyFilter(search)), search).toBe(
        true,
      );
    }
  });
});
