import { describe, expect, it } from "vitest";

import {
  SECTORS,
  SECTOR_ETFS,
  TOPOLOGY_HUB,
  buildTopologyGraph,
} from "@marketpulse/shared";
import type { Sector, TopologyGraph } from "@marketpulse/shared";

import { securitiesFixtureBody } from "../fixtures/securities.js";
import {
  narrowTopologyGraph,
  readTopologyFilter,
  topologyEquityCount,
  topologyFilterWords,
  topologySectorPath,
} from "./filter.js";

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

describe("readTopologyFilter", () => {
  it("reads nothing out of an empty address", () => {
    expect(readTopologyFilter("")).toStrictEqual({
      sector: null,
      unrecognised: null,
      search: "",
    });
  });

  it("reads a slug the product tracks", () => {
    expect(readTopologyFilter("?sector=energy")).toStrictEqual({
      sector: "energy",
      unrecognised: null,
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
    expect(
      topologyFilterWords(GRAPH, GRAPH, readTopologyFilter("")),
    ).toBeNull();
  });

  it("states the drawn count, the tracked count and the sector — both read off the graphs", () => {
    const filter = readTopologyFilter(`?sector=${BIGGEST}`);
    const narrowed = narrowTopologyGraph(GRAPH, BIGGEST);
    const words = topologyFilterWords(GRAPH, narrowed, filter);

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
    const filter = readTopologyFilter("?sector=Energy");
    const words = topologyFilterWords(GRAPH, GRAPH, filter);

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

    const words = topologyFilterWords(
      GRAPH,
      narrowTopologyGraph(emptied, BIGGEST),
      readTopologyFilter(`?sector=${BIGGEST}`),
    );

    expect(words?.line).toContain(String(topologyEquityCount(GRAPH)));
    expect(words?.clause).toContain("Show all");
  });

  it("names a sector with the label SECTOR_LABELS holds, never a transform of the slug", () => {
    // `security.ts`' own note: "Health Care" and "Healthcare" are the same
    // slug and different words, and a transform picks one silently.
    const words = topologyFilterWords(
      GRAPH,
      narrowTopologyGraph(GRAPH, "health_care"),
      readTopologyFilter("?sector=health_care"),
    );

    expect(words?.line).toContain("Health Care");
  });
});
