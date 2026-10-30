import { describe, expect, it } from "vitest";

import { SECTOR_ETFS, SECTORS } from "./security.js";
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

describe("a sector label against a NEIGHBOURING cluster's circle", () => {
  // **Task 6.1.3 — and this test's own FIRST DRAFT is the defect it now
  // guards against, which is worth leaving in the record rather than quietly
  // replacing.**
  //
  // The first draft compared a label's width — measured in CSS PIXELS, from a
  // real `ctx.measureText` — directly against `benchmark.x`/`y` and
  // `topologyClusterRadius(...)`, which are in this module's own LAYOUT UNITS.
  // Those are not the same unit, and the renderer does not hold them at a
  // fixed ratio: `renderer-canvas.ts` draws label text at a CONSTANT CSS pixel
  // size regardless of the fit scale (the design work's own rule — type does
  // not scale), while every circle's radius and position shrink with it. A
  // test that skips the conversion is comparing quantities that happen to
  // agree only when the fit scale is exactly 1, which no real rendering of
  // this layout ever is. `packages/shared/src/topology-layout.ts`'s own
  // `TOPOLOGY_RING_RADIUS` change from 335 to 400 was verified against that
  // flawed test and reported success; re-measured through the real fit scale
  // (below), the collision it was meant to fix is **smaller but not gone**.
  //
  // **So this is a regression FLOOR for a known, open defect, not a proof of
  // correctness.** `docs/GAPS.md` carries the full account and the owner.
  // Raising `TOPOLOGY_RING_RADIUS` further buys very little at this box (the
  // swept figures are in that entry) and costs ink density across the whole
  // graph, so the real fix is either a renderer-side label treatment that
  // knows the fit scale, or a different placement rule — a design question for
  // whichever story next owns fitting this layout into a real box. This test
  // exists so that whichever one lands does not make the measured gap WORSE
  // without somebody noticing.
  //
  // The reference box is `{ width: 1392, height: 520 }` — Story 6.2's own
  // target box (`Market overview.dc.html` §02), already used as `fit.test.ts`'s
  // reference viewport in `apps/frontend`, reused here rather than inventing a
  // second number: it is close to this component's actual default Storybook
  // box and it is a figure this repository already treats as load-bearing.
  const REFERENCE_VIEWPORT = { width: 1392, height: 520 };

  // The affine fit `apps/frontend/src/topology/fit.ts`'s `fitView` computes —
  // reproduced rather than imported, because this package cannot depend on
  // the frontend. `TOPOLOGY_FIT_MARGIN` there is 40; it is not exported from
  // this package (a pixel margin is a fact about a viewport), so it is a
  // named local constant here, tied to that module by this comment rather
  // than by a shared import.
  const FIT_MARGIN = 40;

  function fitScale(viewport: { width: number; height: number }): number {
    const spanX = layout.bounds.maxX - layout.bounds.minX + FIT_MARGIN * 2;
    const spanY = layout.bounds.maxY - layout.bounds.minY + FIT_MARGIN * 2;

    return Math.min(viewport.width / spanX, viewport.height / spanY);
  }

  // **Measured, not estimated**: `pnpm --filter @marketpulse/frontend
  // storybook:build`, then a headless page reading the real `--font-sans` /
  // `--font-size-micro` / `--letter-spacing-micro` tokens (Hanken Grotesk, not
  // the design canvas's placeholder Inter) and calling `ctx.measureText` for
  // each of `SECTOR_LABELS`' eleven values, 2026-10-30. Using each sector's
  // own real width rather than a worst-case assumption for every one is the
  // right level of conservatism here, and not a shortcut: `SECTOR_LABELS` is
  // fixed, known content, not user data. In CSS pixels — see the module note
  // above for why this must be converted before comparing against a layout
  // unit, never compared directly.
  const MEASURED_LABEL_WIDTH_PX: Record<string, number> = {
    technology: 79.84,
    health_care: 79.08,
    financials: 68.71,
    consumer_discretionary: 163.0,
    communication_services: 161.52,
    industrials: 75.01,
    consumer_staples: 118.63,
    energy: 46.16,
    utilities: 54.14,
    real_estate: 74.67,
    materials: 63.88,
  };

  // Half the 24-unit label box the design work reserves (`--space-8` gap +
  // 16-unit line box), in CSS pixels — the renderer draws this constant too.
  const LABEL_HALF_HEIGHT_PX = 12;

  it("does not let the worst label/circle clearance regress past what shipped", () => {
    const missing = SECTORS.filter(
      (sector) => !(sector in MEASURED_LABEL_WIDTH_PX),
    );
    expect(missing).toEqual([]);

    const scale = fitScale(REFERENCE_VIEWPORT);
    let worstPx = Infinity;
    let worstPair = "";

    for (const labelled of SECTORS) {
      const benchmark = at.get(SECTOR_ETFS[labelled]);
      expect(benchmark).toBeDefined();
      if (benchmark === undefined) continue;

      const radius = topologyClusterRadius(
        graph.clusters.find((cluster) => cluster.id === labelled)?.members
          .length ?? 0,
      );
      // CSS pixels divided by the fit scale is the layout-unit equivalent AT
      // THIS BOX — the conversion the first draft skipped.
      const halfWidth = (MEASURED_LABEL_WIDTH_PX[labelled] ?? 0) / 2 / scale;
      const halfHeight = LABEL_HALF_HEIGHT_PX / scale;
      const labelCentreY = benchmark.y - radius - halfHeight;

      for (const other of SECTORS) {
        if (other === labelled) continue;

        const circle = at.get(SECTOR_ETFS[other]);
        expect(circle).toBeDefined();
        if (circle === undefined) continue;

        const otherRadius = topologyClusterRadius(
          graph.clusters.find((cluster) => cluster.id === other)?.members
            .length ?? 0,
        );

        // Closest point on the label's AABB (in layout units, at this box's
        // own scale) to the other cluster's centre, against that cluster's
        // own radius — a distance shorter than the radius is the label
        // sitting inside the circle. Converted back to CSS pixels, because a
        // pixel is the unit a reviewer actually looks at.
        const clampedX = Math.max(
          benchmark.x - halfWidth,
          Math.min(circle.x, benchmark.x + halfWidth),
        );
        const clampedY = Math.max(
          labelCentreY - halfHeight,
          Math.min(circle.y, labelCentreY + halfHeight),
        );
        const clearancePx =
          (apart(circle, { x: clampedX, y: clampedY }) - otherRadius) * scale;

        if (clearancePx < worstPx) {
          worstPx = clearancePx;
          worstPair = `${labelled} label -> ${other} circle`;
        }
      }
    }

    // **−28.04 px, measured 2026-10-30 at the reference box above** —
    // `communication_services`'s label against `consumer_discretionary`'s
    // circle, the same pair the un-converted first draft reported as clear.
    // The floor is 2 px looser than the measurement so an unrelated change
    // that nudges a radius by a fraction does not fail this test for a reason
    // nobody intended; a WORSENING regression is what this guards.
    expect(worstPx).toBeGreaterThanOrEqual(-30);
    // The current worst pair, named, so a future re-measure that moves it
    // updates this note rather than leaving it to drift.
    expect(worstPair).toBe(
      "communication_services label -> consumer_discretionary circle",
    );
  });
});
