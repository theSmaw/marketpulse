import { describe, expect, it } from "vitest";

import { SECTOR_ETFS, SECTORS } from "./security.js";
import type { Sector } from "./security.js";
import { TOPOLOGY_HUB, buildTopologyGraph } from "./topology.js";
import {
  TOPOLOGY_NODE_FOOTPRINT,
  TOPOLOGY_RING_RADIUS_X,
  TOPOLOGY_RING_RADIUS_Y,
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
    // more arc than it occupies, so disjointness is a consequence of the
    // allocation rather than of a collision pass — true independent of the
    // ring's shape since Task 6.2.2's arc-length allocation (see
    // `TOPOLOGY_RING_RADIUS_X`'s own note for the arithmetic). Measured
    // between the exact wedge centres at the elliptical ring, the closest
    // pair of cluster circles clears by **131.40** units (`energy`/
    // `utilities`), up from 28.75 at the circular ring Task 6.1.1 shipped;
    // the centroid read back from the members' own placements below is
    // within a fraction of a unit of that centre, so the assertion is the
    // SIGN rather than the figure.
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

  it("is the arc-length allocation that fixes disjointness, not the stretch alone — proved wrong-then-right at the canvas's own 540×185", () => {
    // **Task 6.2.2's own discipline: write the defect, confirm it fails
    // wrongly, then prove the fix.** `800×340` (the shipped default) happens
    // to stay disjoint under EITHER allocation rule — 42.94 units of
    // clearance under the old angle-proportional one, measured 2026-11-01 —
    // so a break on the shipped radii alone would prove nothing. The
    // canvas's own first elliptical recommendation, `540×185`, is the
    // stress case that actually separates the two: squashed this far,
    // angle-proportional allocation starves the three-and-nine-o'clock
    // sectors of arc (arc speed there is `R_y`, not `R_x`), and the real
    // defect appears.
    //
    // The angle-proportional math is re-derived HERE rather than imported,
    // because Task 6.2.2 deleted the production code path that used to
    // compute it — there is nothing left in `topology-layout.ts` to ask for
    // the old behaviour. This is the same formula `buildTopologyLayout`
    // used before this task: `turn = (previous spans) + span / 2`, `span =
    // 2π · r_s / Σr`.
    const bySector = new Map(
      graph.clusters.map((cluster) => [cluster.id, cluster.members]),
    );
    const radiusOf = (sector: Sector): number =>
      topologyClusterRadius((bySector.get(sector) ?? []).length);
    const totalRadius = SECTORS.reduce(
      (sum, sector) => sum + radiusOf(sector),
      0,
    );

    function angleProportionalClearance(
      ringRadiusX: number,
      ringRadiusY: number,
    ): { readonly clearance: number; readonly pair: string } {
      let turn = 0;
      const centroids = new Map<Sector, { x: number; y: number }>();

      for (const sector of SECTORS) {
        const span = (2 * Math.PI * radiusOf(sector)) / totalRadius;
        const mid = turn + span / 2;

        centroids.set(sector, {
          x: ringRadiusX * Math.sin(mid),
          y: -ringRadiusY * Math.cos(mid),
        });
        turn += span;
      }

      let clearance = Infinity;
      let pair = "";

      for (const [i, left] of SECTORS.entries()) {
        for (const right of SECTORS.slice(i + 1)) {
          const centreLeft = centroids.get(left);
          const centreRight = centroids.get(right);
          if (centreLeft === undefined || centreRight === undefined) continue;

          const gap =
            apart(centreLeft, centreRight) - radiusOf(left) - radiusOf(right);

          if (gap < clearance) {
            clearance = gap;
            pair = `${left}/${right}`;
          }
        }
      }

      return { clearance, pair };
    }

    // **Proved wrong first**: angle-proportional allocation at 540×185
    // reproduces the design work's own `−53.2-unit` overlap figure.
    const wrong = angleProportionalClearance(540, 185);

    expect(wrong.clearance).toBeCloseTo(-53.3, 0);
    expect(wrong.pair).toBe("health_care/financials");

    // **Proved right second**: the SHIPPED `buildTopologyLayout` — real
    // production code, not a re-derivation — at the identical stress radii.
    const right = buildTopologyLayout(graph, {
      ringRadiusX: 540,
      ringRadiusY: 185,
    });
    const rightAt = new Map(
      right.placements.map((placement) => [placement.symbol, placement]),
    );

    let rightClearance = Infinity;

    for (const [i, left] of SECTORS.entries()) {
      for (const otherSector of SECTORS.slice(i + 1)) {
        const centreLeft = rightAt.get(SECTOR_ETFS[left]);
        const centreRight = rightAt.get(SECTOR_ETFS[otherSector]);
        if (centreLeft === undefined || centreRight === undefined) continue;

        const gap =
          apart(centreLeft, centreRight) -
          radiusOf(left) -
          radiusOf(otherSector);

        rightClearance = Math.min(rightClearance, gap);
      }
    }

    expect(rightClearance).toBeGreaterThan(0);
  });

  it("puts the hub at the origin, clear of every cluster", () => {
    expect(at.get(TOPOLOGY_HUB)).toEqual({ symbol: TOPOLOGY_HUB, x: 0, y: 0 });

    const widest = Math.max(
      ...graph.clusters.map((cluster) =>
        topologyClusterRadius(cluster.members.length),
      ),
    );

    // The tightest the ring ever approaches the origin is its SHORTER
    // semi-axis — `ringRadiusY` at an elliptical ring — so the hub's
    // clearance is checked against that, not against `ringRadiusX`.
    expect(
      Math.min(TOPOLOGY_RING_RADIUS_X, TOPOLOGY_RING_RADIUS_Y) - widest,
    ).toBeGreaterThan(TOPOLOGY_NODE_FOOTPRINT);
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
      expect(placement.x).toBeGreaterThan(TOPOLOGY_RING_RADIUS_X + widest);
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
  // this layout ever is.
  //
  // **Task 6.1.3's `TOPOLOGY_RING_RADIUS` change from 335 to 400** was
  // verified against that flawed test and reported success; re-measured
  // through the real fit scale, the collision it was meant to fix was
  // smaller but not gone — `−28.04 px` at the box Story 6.1 had, the same
  // `communication_services` → `consumer_discretionary` pair this test still
  // names below. That figure is reproduced exactly by this module's own
  // circular-ring code path (`buildTopologyLayout(graph, { ringRadiusX: 400,
  // ringRadiusY: 400 })`), which is how Task 6.2.2 proved the new elliptical
  // code wrong-then-right: run first against a circular ring, confirmed the
  // same `−28.04 px` figure landed, then against the real elliptical default.
  //
  // **Task 6.2.2 closes what Task 6.1.3 could only floor.** The fix is not a
  // bigger ring — it is an elliptical one (`TOPOLOGY_RING_RADIUS_X` /
  // `_Y` below), built from the discovery that a naive squash
  // (`R_x≈540, R_y≈185`, the canvas's own first recommendation) is wrong in
  // KIND: it starves the three-and-nine-o'clock sectors of arc under the old
  // ANGLE-proportional allocation and produces a **−53.2-unit** cluster
  // overlap, not just a label collision. The real fix pairs the stretch with
  // **arc-length**-proportional allocation (`buildTopologyLayout`'s own
  // docblock has the construction), which keeps the circle-disjointness
  // proof above true by the same ratio argument independent of the ring's
  // shape.
  //
  // **And the real boxes this layout is fitted into are narrower than the
  // `1392×520` this test used to assume.** That figure was Story 6.1's own
  // guess at the eventual route box; Task 6.2.1 measured the real one —
  // `Region.content`'s resolved size on `/` at the four widths `pnpm probe`
  // uses — and it is markedly narrower at three of the four. The boxes below
  // are those real, measured figures rather than a guess.
  const REAL_CONTENT_BOXES = {
    1440: { width: 998, height: 425 },
    1024: { width: 570, height: 425 },
    768: { width: 686, height: 425 },
    390: { width: 308, height: 425 },
  } as const;

  /**
   * **Decision 8's own threshold, `renderer-canvas.ts`'s
   * `TOPOLOGY_SECTOR_LABEL_MIN_SCALE` — duplicated as a number rather than
   * imported**, for the reason `FIT_MARGIN` below already is: this package
   * cannot depend on `apps/frontend`, and a fit-scale threshold is a fact
   * about a renderer rather than about the layout. Tied to that module by
   * this comment. Below it, the renderer draws no sector label at all, which
   * is what makes the three narrower boxes below safe despite their own
   * geometry being negative — there is no label on screen there to collide.
   */
  const SECTOR_LABEL_MIN_SCALE = 0.38;

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

  /**
   * The worst label/circle clearance over all 110 ordered sector pairs, at
   * one box — factored out of the single inline test Task 6.1.3 shipped, so
   * Task 6.2.2 can ask the same question of four real boxes rather than one
   * guessed one.
   */
  function worstClearance(viewport: { width: number; height: number }): {
    readonly px: number;
    readonly pair: string;
  } {
    const scale = fitScale(viewport);
    let worstPx = Infinity;
    let worstPair = "";

    for (const labelled of SECTORS) {
      const benchmark = at.get(SECTOR_ETFS[labelled]);
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

    return { px: worstPx, pair: worstPair };
  }

  it("has every sector's label width measured", () => {
    const missing = SECTORS.filter(
      (sector) => !(sector in MEASURED_LABEL_WIDTH_PX),
    );
    expect(missing).toEqual([]);
  });

  it("clears every label/circle collision at the one real box that draws a label — 1440", () => {
    // **A correctness claim, not a regression floor** — the first this
    // geometry has earned. `fitScale` here is 0.4604, above
    // `SECTOR_LABEL_MIN_SCALE`, so the renderer draws all eleven sector
    // labels at this box, and every one of them must actually clear.
    const box = REAL_CONTENT_BOXES[1440];
    expect(fitScale(box)).toBeGreaterThanOrEqual(SECTOR_LABEL_MIN_SCALE);

    const { px, pair } = worstClearance(box);

    // **+14.99 px, measured 2026-11-01** — `consumer_staples` label against
    // `energy`'s circle, which is a different pair from the one that used to
    // fail: the elliptical ring's longer `x` axis gives the technology/health
    // care/financials cluster of labels (near twelve o'clock, where `R_y`
    // governs) less room than before, while the old worst pair
    // (`communication_services`/`consumer_discretionary`, near three o'clock,
    // where `R_x` now governs) is comfortably clear.
    expect(px).toBeGreaterThan(0);
    expect(pair).toBe("consumer_staples label -> energy circle");
  });

  it("proves the fix wrong-then-right: the OLD circular ring still fails this box", () => {
    // **The discipline Task 6.1.3 established, run again for the new
    // geometry, at the same REAL box the test above just cleared.**
    // `buildTopologyLayout`'s own options let this test ask the identical
    // question of the superseded circular ring without a second code path:
    // `{ ringRadiusX: 400, ringRadiusY: 400 }` is a circle of Task 6.1.3's own
    // radius, by construction.
    //
    // **Not the same figure as Task 6.1.3's own `−28.04 px`** — that was
    // measured at `1392×520`, Story 6.1's assumed box; this is the real
    // `998×425` Task 6.2.1 measured on `/`, which is narrower, so the
    // circular ring fails it by MORE. The point this test exists to make is
    // unaffected either way: the old geometry is negative here, the new one
    // is not.
    const circular = buildTopologyLayout(graph, {
      ringRadiusX: 400,
      ringRadiusY: 400,
    });
    const circularAt = new Map(
      circular.placements.map((placement) => [placement.symbol, placement]),
    );
    const scale = (() => {
      const spanX =
        circular.bounds.maxX - circular.bounds.minX + FIT_MARGIN * 2;
      const spanY =
        circular.bounds.maxY - circular.bounds.minY + FIT_MARGIN * 2;

      return Math.min(998 / spanX, 425 / spanY);
    })();

    let worstPx = Infinity;
    let worstPair = "";

    for (const labelled of SECTORS) {
      const benchmark = circularAt.get(SECTOR_ETFS[labelled]);
      if (benchmark === undefined) continue;

      const radius = topologyClusterRadius(
        graph.clusters.find((cluster) => cluster.id === labelled)?.members
          .length ?? 0,
      );
      const halfWidth = (MEASURED_LABEL_WIDTH_PX[labelled] ?? 0) / 2 / scale;
      const halfHeight = LABEL_HALF_HEIGHT_PX / scale;
      const labelCentreY = benchmark.y - radius - halfHeight;

      for (const other of SECTORS) {
        if (other === labelled) continue;

        const circle = circularAt.get(SECTOR_ETFS[other]);
        if (circle === undefined) continue;

        const otherRadius = topologyClusterRadius(
          graph.clusters.find((cluster) => cluster.id === other)?.members
            .length ?? 0,
        );
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

    // **−33.63 px, measured 2026-11-01** — the same
    // `communication_services`/`consumer_discretionary` pair Task 6.1.3's
    // circular ring always failed on, now measured at the real 1440 box.
    // This is the proof the new test above is not passing by accident: the
    // OLD geometry still fails it, here, today.
    expect(worstPx).toBeCloseTo(-33.63, 1);
    expect(worstPair).toBe(
      "communication_services label -> consumer_discretionary circle",
    );
  });

  it("draws no sector label at all below SECTOR_LABEL_MIN_SCALE, at the three narrower real boxes", () => {
    // **The geometry is negative at all three of these — and it does not
    // matter**, because Decision 8's renderer threshold means none of them
    // ever draws a sector label to begin with. This test proves the
    // PRECONDITION the renderer's own threshold relies on: each of these
    // three real boxes' fit scale sits below `SECTOR_LABEL_MIN_SCALE`, so the
    // label that would collide is never drawn. If a future change to the
    // grid, the universe or the ellipse ever pushed one of these ABOVE the
    // threshold, this is the test that would need a correctness claim added
    // beside it rather than silently drawing a colliding label.
    for (const width of [1024, 768, 390] as const) {
      const box = REAL_CONTENT_BOXES[width];
      const scale = fitScale(box);

      expect(scale).toBeLessThan(SECTOR_LABEL_MIN_SCALE);

      // Recorded rather than asserted as a floor: the geometry itself is
      // worse than what shipped at 1440 and that is expected, not guarded —
      // nothing renders it. Kept here so the figure is visible rather than
      // silently true.
      const { px } = worstClearance(box);
      expect(Number.isFinite(px)).toBe(true);
    }
  });
});
