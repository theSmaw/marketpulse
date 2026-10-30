import { describe, expect, it } from "vitest";

import {
  buildTopologyGraph,
  buildTopologyLayout,
  TOPOLOGY_NODE_FOOTPRINT,
} from "@marketpulse/shared";
import type { TopologyLayout } from "@marketpulse/shared";

import { securitiesFixtureBody } from "../fixtures/securities.js";
import {
  TOPOLOGY_FIT_MARGIN,
  TOPOLOGY_MAX_ZOOM,
  TOPOLOGY_MIN_ZOOM,
  clampNodeScale,
  clampZoom,
  fitView,
  panBy,
  reviewport,
  screenToWorld,
  worldToScreen,
  zoomAbout,
} from "./fit.js";
import {
  TOPOLOGY_NODE_SCALE_CEILING,
  TOPOLOGY_NODE_SCALE_FLOOR,
} from "./renderer.js";

// What a unit test can and cannot reach in this module (Task 6.1.2).
//
// **It reaches all of `fit.ts` and none of either renderer.** jsdom applies no
// stylesheet, computes no layout and has no WebGL or 2d context, so `getTokens`
// throws there by design and nothing below `pnpm e2e`/`pnpm probe` can verify a
// colour, a shape, a frame or a draw call. That is structural rather than a
// shortfall, and it is the reason the affine transform lives in a module of its
// own: it is the one part of the renderer that *is* checkable here, and getting
// it wrong is a mirrored or quarter-turned market that looks entirely
// plausible.
//
// The layout below is the real one over the recorded universe — 518 securities,
// recorded 2026-09-11, before the 2026-10-12 curation untracked two symbols. A
// hand-built two-node layout would exercise the arithmetic and not the extent,
// and the extent is where a sign error shows up.

const LAYOUT: TopologyLayout = buildTopologyLayout(
  buildTopologyGraph(securitiesFixtureBody("full").securities),
);

const VIEWPORT = { width: 1392, height: 520 };

describe("fitView", () => {
  it("fits the whole extent, with the fit margin on both axes", () => {
    const view = fitView(LAYOUT, VIEWPORT);

    const corners = [
      worldToScreen(view, LAYOUT.bounds.minX, LAYOUT.bounds.minY),
      worldToScreen(view, LAYOUT.bounds.maxX, LAYOUT.bounds.maxY),
    ] as const;

    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(0);
      expect(corner.x).toBeLessThanOrEqual(VIEWPORT.width);
      expect(corner.y).toBeGreaterThanOrEqual(0);
      expect(corner.y).toBeLessThanOrEqual(VIEWPORT.height);
    }
  });

  it("leaves at least the node footprint of clear ground at the tightest edge", () => {
    // The margin exists so the outermost node is not clipped in half: `bounds`
    // is node CENTRES. The assertion is the consequence rather than the
    // constant, so changing TOPOLOGY_FIT_MARGIN is a decision about what a
    // reader sees rather than a number this test re-states.
    const view = fitView(LAYOUT, VIEWPORT);
    const edge = worldToScreen(view, LAYOUT.bounds.minX, LAYOUT.bounds.minY);
    const tightest = Math.min(edge.x, edge.y);

    expect(tightest).toBeGreaterThanOrEqual(
      (TOPOLOGY_NODE_FOOTPRINT / 2) * view.scale,
    );
    expect(TOPOLOGY_FIT_MARGIN).toBeGreaterThanOrEqual(TOPOLOGY_NODE_FOOTPRINT);
  });

  it("returns a scale of 1 rather than Infinity for a zero-sized box", () => {
    // A React component's first frame and a `display: none` story both arrive
    // here. A `NaN` or `Infinity` transform draws nothing and reports nothing.
    for (const viewport of [
      { width: 0, height: 0 },
      { width: 1392, height: 0 },
      { width: 0, height: 520 },
    ]) {
      expect(fitView(LAYOUT, viewport).scale).toBe(1);
    }
  });

  it("is centred on the extent's own centre, not on the origin", () => {
    const view = fitView(LAYOUT, VIEWPORT);
    const centre = worldToScreen(view, view.centreX, view.centreY);

    expect(centre.x).toBeCloseTo(VIEWPORT.width / 2, 6);
    expect(centre.y).toBeCloseTo(VIEWPORT.height / 2, 6);
  });
});

describe("the transform", () => {
  it("round-trips every placement through screen space and back", () => {
    const view = zoomAbout(fitView(LAYOUT, VIEWPORT), 2.5, 400, 180);

    for (const placement of LAYOUT.placements) {
      const screen = worldToScreen(view, placement.x, placement.y);
      const back = screenToWorld(view, screen.x, screen.y);

      expect(back.x).toBeCloseTo(placement.x, 6);
      expect(back.y).toBeCloseTo(placement.y, 6);
    }
  });

  it("keeps y growing downward, so twelve o'clock is above the hub", () => {
    // The layout's own convention, and the one thing a mirrored renderer gets
    // wrong while looking entirely plausible.
    const view = fitView(LAYOUT, VIEWPORT);

    expect(worldToScreen(view, 0, -100).y).toBeLessThan(
      worldToScreen(view, 0, 0).y,
    );
  });

  it("pans by exactly the screen delta it is given", () => {
    const view = fitView(LAYOUT, VIEWPORT);
    const before = worldToScreen(view, 0, 0);
    const after = worldToScreen(panBy(view, 37, -11), 0, 0);

    expect(after.x - before.x).toBeCloseTo(37, 6);
    expect(after.y - before.y).toBeCloseTo(-11, 6);
  });
});

describe("zoomAbout", () => {
  it("holds the world point under the pointer fixed", () => {
    // The property a reader notices only when it is missing: a wheel over NVDA
    // has to leave NVDA under the pointer.
    const view = fitView(LAYOUT, VIEWPORT);

    for (const factor of [1.2, 0.8, 4, 0.25]) {
      const zoomed = zoomAbout(view, factor, 912, 140);
      const before = screenToWorld(view, 912, 140);
      const after = screenToWorld(zoomed, 912, 140);

      expect(after.x).toBeCloseTo(before.x, 6);
      expect(after.y).toBeCloseTo(before.y, 6);
    }
  });

  it("clamps rather than running away, in both directions", () => {
    const view = fitView(LAYOUT, VIEWPORT);

    expect(zoomAbout(view, 1_000, 0, 0).zoom).toBe(TOPOLOGY_MAX_ZOOM);
    expect(zoomAbout(view, 0.000_1, 0, 0).zoom).toBe(TOPOLOGY_MIN_ZOOM);
  });
});

describe("the zoom rule", () => {
  it("clamps the node scale to the ladder's band while the position does not", () => {
    // The design canvas's rule, as two separate functions: position scales
    // without limit and node size does not, so the 8 : 10 : 12 ladder holds at
    // every zoom (absolute 4–12 / 5–15 / 6–18 px).
    expect(clampNodeScale(TOPOLOGY_MAX_ZOOM)).toBe(TOPOLOGY_NODE_SCALE_CEILING);
    expect(clampNodeScale(TOPOLOGY_MIN_ZOOM)).toBe(TOPOLOGY_NODE_SCALE_FLOOR);
    expect(clampNodeScale(1)).toBe(1);

    expect(clampZoom(TOPOLOGY_MAX_ZOOM)).toBe(TOPOLOGY_MAX_ZOOM);
    expect(clampZoom(TOPOLOGY_MAX_ZOOM * 2)).toBe(TOPOLOGY_MAX_ZOOM);
  });
});

describe("reviewport", () => {
  it("re-fits the scale to a new box and keeps the reader's zoom and pan", () => {
    const view = panBy(
      zoomAbout(fitView(LAYOUT, VIEWPORT), 3, 100, 100),
      20,
      5,
    );
    const next = reviewport(view, LAYOUT, { width: 696, height: 1_040 });

    expect(next.zoom).toBe(view.zoom);
    expect(next.panX).toBe(view.panX);
    expect(next.panY).toBe(view.panY);
    expect(next.scale).not.toBe(view.scale);
    expect(next.viewport).toEqual({ width: 696, height: 1_040 });
  });
});
