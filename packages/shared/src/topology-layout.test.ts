import { describe, expect, it } from "vitest";

import { SECTORS } from "./security.js";
import { TOPOLOGY_HUB, buildTopologyGraph } from "./topology.js";
import {
  TOPOLOGY_NODE_FOOTPRINT,
  TOPOLOGY_RING_RADIUS,
  buildTopologyLayout,
  topologyClusterRadius,
} from "./topology-layout.js";
import { topologyFixtureUniverse } from "./topology-fixture.js";
import { toTicker } from "./ticker.js";

const graph = buildTopologyGraph(topologyFixtureUniverse());
const layout = buildTopologyLayout(graph);

const at = new Map(
  layout.placements.map((placement) => [placement.symbol, placement]),
);

const apart = (
  left: { x: number; y: number },
  right: { x: number; y: number },
) => Math.hypot(left.x - right.x, left.y - right.y);

/**
 * The bearing of a point, in radians clockwise from twelve o'clock, in
 * `[0, 2π)`. The layout's own convention, read back from the output rather
 * than from the implementation.
 */
const bearing = (point: { x: number; y: number }) =>
  (Math.atan2(point.x, -point.y) + 2 * Math.PI) % (2 * Math.PI);

/** A sector's centroid, computed from the placements of its own members. */
const centroidOf = (sector: string) => {
  const members =
    graph.clusters.find((cluster) => cluster.id === sector)?.members ?? [];
  const points = members.flatMap((symbol) => {
    const placement = at.get(symbol);
    return placement === undefined ? [] : [placement];
  });

  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };
};

describe("buildTopologyLayout", () => {
  it("places every node exactly once", () => {
    expect(layout.placements).toHaveLength(graph.nodes.length);
    expect(new Set(layout.placements.map((p) => p.symbol)).size).toBe(516);
    expect([...at.keys()].sort()).toEqual(
      graph.nodes.map((node) => node.symbol).sort(),
    );
  });

  it("places no two nodes coincident — and clears the node footprint", () => {
    // **Measured, not argued** (`CLAUDE.md`'s working loop). Over this
    // universe the closest pair is **17.83** units apart, which is the figure
    // recorded in `TOPOLOGY_CLUSTER_DENSITY`'s own note. The assertion is
    // written around the footprint rather than around 17.83, because 16 is the
    // quantity with a reason — 8 of ink plus the 4-unit annulus Story 6.3's
    // band and Story 6.4's focus ring both want — and the headroom above it is
    // what a later density change is allowed to spend.
    let closest = Infinity;
    let pair: readonly string[] = [];

    for (let i = 0; i < layout.placements.length; i += 1) {
      for (let j = i + 1; j < layout.placements.length; j += 1) {
        const left = layout.placements[i];
        const right = layout.placements[j];
        if (left === undefined || right === undefined) continue;

        const distance = apart(left, right);
        if (distance < closest) {
          closest = distance;
          pair = [left.symbol, right.symbol];
        }
      }
    }

    expect(pair).toHaveLength(2);
    expect(closest).toBeGreaterThan(0);
    expect(closest).toBeGreaterThanOrEqual(TOPOLOGY_NODE_FOOTPRINT);
    // The recorded measurement, to two decimals, so a geometry change that
    // keeps clearing 16 but halves the headroom is still visible in a diff.
    expect(closest).toBeCloseTo(17.83, 2);
  });

  it("runs the cluster centroids clockwise from twelve in SECTORS' own order", () => {
    // Acceptance criterion 3's stable-order half, and it is asserted on the
    // CENTROIDS computed from the placements rather than on anything the
    // implementation exposes — so a layout that reordered the wedges while
    // keeping the same eleven angles would fail.
    const bearings = SECTORS.map((sector) => bearing(centroidOf(sector)));

    expect(bearings).toHaveLength(11);
    for (const [index, value] of bearings.entries()) {
      if (index === 0) continue;
      expect(value).toBeGreaterThan(bearings[index - 1] ?? -1);
    }
  });

  it("keeps the eleven cluster circles disjoint, by construction", () => {
    // The property the proportional wedge allocation buys: every cluster gets
    // 2.507 · r of arc against the 2 · r it occupies, so disjointness is a
    // consequence of the allocation rather than of a collision pass. Measured
    // between the exact wedge centres, the closest pair of cluster circles
    // clears by **28.75** units; the centroid read back from the members'
    // own placements below is within a fraction of a unit of that centre, so
    // the assertion is the SIGN rather than the figure.
    let clearance = Infinity;

    for (const [i, left] of SECTORS.entries()) {
      for (const right of SECTORS.slice(i + 1)) {
        const gap =
          apart(centroidOf(left), centroidOf(right)) -
          topologyClusterRadius(
            graph.clusters.find((c) => c.id === left)?.members.length ?? 0,
          ) -
          topologyClusterRadius(
            graph.clusters.find((c) => c.id === right)?.members.length ?? 0,
          );

        clearance = Math.min(clearance, gap);
      }
    }

    expect(clearance).toBeGreaterThan(0);
  });

  it("puts the hub at the origin, clear of every cluster", () => {
    expect(at.get(TOPOLOGY_HUB)).toEqual({ symbol: TOPOLOGY_HUB, x: 0, y: 0 });

    const widest = Math.max(
      ...graph.clusters.map((cluster) =>
        topologyClusterRadius(cluster.members.length),
      ),
    );

    expect(TOPOLOGY_RING_RADIUS - widest).toBeGreaterThan(
      TOPOLOGY_NODE_FOOTPRINT,
    );
  });

  it("puts the three undecomposed proxies together, outside the ring", () => {
    const widest = Math.max(
      ...graph.clusters.map((cluster) =>
        topologyClusterRadius(cluster.members.length),
      ),
    );
    const free = ["QQQ", "DIA", "IWM"].flatMap((symbol) => {
      const placement = at.get(toTicker(symbol));
      return placement === undefined ? [] : [placement];
    });

    expect(free).toHaveLength(3);
    // One column — together, so they read as benchmarks we have not
    // decomposed rather than as three broken nodes.
    expect(new Set(free.map((placement) => placement.x)).size).toBe(1);
    for (const placement of free) {
      expect(placement.x).toBeGreaterThan(TOPOLOGY_RING_RADIUS + widest);
    }
  });

  it("reports bounds that contain every placement", () => {
    const { minX, minY, maxX, maxY } = layout.bounds;

    for (const placement of layout.placements) {
      expect(placement.x).toBeGreaterThanOrEqual(minX);
      expect(placement.x).toBeLessThanOrEqual(maxX);
      expect(placement.y).toBeGreaterThanOrEqual(minY);
      expect(placement.y).toBeLessThanOrEqual(maxY);
    }

    expect(maxX - minX).toBeGreaterThan(0);
    expect(maxY - minY).toBeGreaterThan(0);
  });

  it("holds a finite coordinate for every node", () => {
    // The failure a `NaN` produces is a renderer drawing nothing with no error
    // anywhere, which is indistinguishable from an empty graph.
    for (const placement of layout.placements) {
      expect(Number.isFinite(placement.x)).toBe(true);
      expect(Number.isFinite(placement.y)).toBe(true);
    }
  });

  it("is deterministic: the same universe twice gives an identical layout", () => {
    // **The strong, safe half of acceptance criterion 3** — deep equality
    // within one process. There is deliberately no checked-in coordinate
    // fixture: `Math.sin`, `Math.cos` and `Math.sqrt` are not required to be
    // bit-identical between Node and a browser engine, so a byte comparison
    // across engines would be asserting something the language does not
    // promise.
    const again = buildTopologyLayout(
      buildTopologyGraph(topologyFixtureUniverse()),
    );

    expect(again).toEqual(layout);
    expect(JSON.stringify(again)).toBe(JSON.stringify(layout));
  });

  it("is deterministic under a reordered input, because the graph is sorted", () => {
    // The layout is keyed on the member's position in a stable sort by symbol,
    // never on insertion order — so a query plan that changed a row order
    // would not re-draw the market.
    const shuffled = buildTopologyLayout(
      buildTopologyGraph([...topologyFixtureUniverse()].reverse()),
    );

    expect(JSON.stringify(shuffled)).toBe(JSON.stringify(layout));
  });

  it("is total on an empty graph rather than producing NaN", () => {
    const empty = buildTopologyLayout(buildTopologyGraph([]));

    expect(empty.placements).toEqual([]);
    expect(empty.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });
});
