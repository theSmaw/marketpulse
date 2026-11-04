import { describe, expect, it } from "vitest";

import {
  SECURITY_KINDS,
  buildTopologyGraph,
  buildTopologyLayout,
  TOPOLOGY_NODE_FOOTPRINT,
} from "@marketpulse/shared";
import type { SecurityKind, TopologyLayout } from "@marketpulse/shared";

import { securitiesFixtureBody } from "../fixtures/securities.js";
import {
  TOPOLOGY_MAX_ZOOM,
  TOPOLOGY_MIN_ZOOM,
  clampNodeScale,
  fitView,
  worldToScreen,
  zoomAbout,
} from "./fit.js";
import type { TopologyView } from "./fit.js";
import {
  TOPOLOGY_NODE_TARGET_ANNULUS,
  topologyNodeAt,
  topologyTargetRadius,
} from "./hit-test.js";
import type { TopologyHitCandidate } from "./hit-test.js";
import {
  TOPOLOGY_NODE_INK,
  TOPOLOGY_NODE_SCALE_CEILING,
  TOPOLOGY_NODE_SCALE_FLOOR,
} from "./renderer.js";

// **The repaired hit test, at the four fit scales this screen actually
// resolves and across the whole zoom range** (Task 6.4.1).
//
// This file exists because the defect it guards against was a **unit
// mismatch**, and a unit mismatch is the one kind of arithmetic error that
// looks completely correct in the source: `distance < 8` is a perfectly
// plausible line, and the only thing wrong with it was which space `8` was
// measured in. Nothing below `pnpm e2e` can see the drawing, so the geometry
// is checked here and the words a hover produces are checked in
// `MarketTopology.test.tsx`.
//
// ## The four boxes are measured, not chosen
//
// `pnpm probe / --within "Market topology"` on 2026-11-04 reports `.content`
// — the box `.frame` takes `inset: 0` against — at **998×413, 570×413,
// 686×413 and 308×413** at 1440/1024/768/390. The fit scales below are what
// `fitView` resolves for them over the recorded 518-security universe, and
// they are asserted rather than only used, so this file records the
// measurement instead of quoting it.

const LAYOUT: TopologyLayout = buildTopologyLayout(
  buildTopologyGraph(securitiesFixtureBody("full").securities),
);

/** The probed `.content` boxes, widest first. See the note above. */
const PROBED_BOXES = [
  { width: 998, height: 413, at: 1440, scale: 0.4477 },
  { width: 686, height: 413, at: 768, scale: 0.3649 },
  { width: 570, height: 413, at: 1024, scale: 0.3032 },
  { width: 308, height: 413, at: 390, scale: 0.1639 },
] as const;

/** Every node in the real graph, as the renderer holds them for the hit test. */
const CANDIDATES: readonly TopologyHitCandidate[] = (() => {
  const graph = buildTopologyGraph(securitiesFixtureBody("full").securities);
  const placements = new Map(
    LAYOUT.placements.map((placement) => [placement.symbol, placement]),
  );

  return graph.nodes.flatMap((node) => {
    const placement = placements.get(node.symbol);
    return placement === undefined
      ? []
      : [{ node, x: placement.x, y: placement.y }];
  });
})();

/** One candidate of each kind, so every kind's own radius is exercised. */
function candidateOfKind(kind: SecurityKind): TopologyHitCandidate {
  const found = CANDIDATES.find((candidate) => candidate.node.kind === kind);
  if (found === undefined) throw new Error(`no ${kind} in the fixture graph`);
  return found;
}

/** Where a candidate is drawn, in CSS pixels, under one view. */
function screenOf(
  view: TopologyView,
  candidate: TopologyHitCandidate,
): { readonly x: number; readonly y: number } {
  return worldToScreen(view, candidate.x, candidate.y);
}

/**
 * The candidate with the most clear ground around it, under one view —
 * **derived rather than named**, because which node is isolated is a fact
 * about the fit scale and not about the universe.
 *
 * It is what the assertions below about *just outside the target* and *empty
 * space* need: at 390 the fit scale is 0.1639 and whole clusters are nearly
 * coincident, so a point 4 px off one node's centre is genuinely inside
 * another's target — which is real crowding rather than a defect in the hit
 * test, and an assertion about *this* node and not its neighbour has to pick a
 * node that has no neighbour.
 */
function mostIsolated(view: TopologyView): TopologyHitCandidate {
  const points = CANDIDATES.map((candidate) => ({
    candidate,
    at: screenOf(view, candidate),
  }));

  let best = points[0];
  let bestGap = -1;

  for (const point of points) {
    let gap = Number.POSITIVE_INFINITY;

    for (const other of points) {
      if (other.candidate === point.candidate) continue;
      gap = Math.min(
        gap,
        Math.hypot(other.at.x - point.at.x, other.at.y - point.at.y),
      );
    }

    if (gap > bestGap) {
      bestGap = gap;
      best = point;
    }
  }

  if (best === undefined) throw new Error("the fixture graph has no nodes");
  return best.candidate;
}

describe("topologyTargetRadius", () => {
  it("is the drawn ink's own radius plus the reserved annulus, in CSS pixels", () => {
    // The constant the renderer draws with, read back the other way round —
    // so a change to `TOPOLOGY_NODE_INK` or `TOPOLOGY_NODE_FOOTPRINT` moves
    // the target with the drawing rather than leaving this figure behind.
    expect(TOPOLOGY_NODE_TARGET_ANNULUS).toBe(4);

    for (const kind of SECURITY_KINDS) {
      expect(topologyTargetRadius(kind, 1)).toBe(
        TOPOLOGY_NODE_INK[kind] / 2 + 4,
      );
    }

    // An equity's target at zoom 1 is half its footprint, which is what the
    // shipped docblock claimed and the shipped arithmetic did not deliver.
    expect(topologyTargetRadius("equity", 1)).toBe(TOPOLOGY_NODE_FOOTPRINT / 2);
  });

  it("never falls below the drawn ink plus its 1 px halo, at any zoom", () => {
    // The property, rather than the formula: whatever the zoom, a reader
    // pointing at the visible mark is pointing at the node. The halo is 1 px
    // outside the ink (`renderer-canvas.ts`: a 2 px stroke straddling the
    // path under an opaque fill), so that is the real edge of the drawing.
    for (const kind of SECURITY_KINDS) {
      for (
        let zoom = TOPOLOGY_MIN_ZOOM;
        zoom <= TOPOLOGY_MAX_ZOOM;
        zoom += 0.05
      ) {
        const inkRadius = (TOPOLOGY_NODE_INK[kind] * clampNodeScale(zoom)) / 2;

        expect(topologyTargetRadius(kind, zoom)).toBeGreaterThanOrEqual(
          inkRadius + 1,
        );
      }
    }
  });

  it("tracks the mark through the clamp, and stops where the mark stops", () => {
    // `clampNodeScale` is [0.5, 1.5] — position scales without limit and node
    // size does not, which is the canvas's own zoom rule. The target has to
    // inherit the clamp, or it is generous at one end of the range and mean at
    // the other.
    expect(topologyTargetRadius("equity", TOPOLOGY_MIN_ZOOM)).toBe(
      8 * TOPOLOGY_NODE_SCALE_FLOOR,
    );
    expect(topologyTargetRadius("equity", TOPOLOGY_MAX_ZOOM)).toBe(
      8 * TOPOLOGY_NODE_SCALE_CEILING,
    );
    // Past the ceiling the mark no longer grows, so neither does the target.
    expect(topologyTargetRadius("equity", 4)).toBe(
      topologyTargetRadius("equity", TOPOLOGY_MAX_ZOOM),
    );
  });

  it("does not depend on the fit scale at all, which is the whole repair", () => {
    // The defect in one assertion. The old threshold was 8 LAYOUT units, so
    // its CSS-pixel value was `8 · scale` and moved by 2.7× across the four
    // real boxes; the repaired radius is identical at every one of them.
    const radii = PROBED_BOXES.map((box) =>
      topologyTargetRadius("equity", fitView(LAYOUT, box).zoom),
    );

    expect(new Set(radii).size).toBe(1);
  });
});

describe("the four probed boxes", () => {
  it("resolve the fit scales this repair was measured against", () => {
    for (const box of PROBED_BOXES) {
      expect(fitView(LAYOUT, box).scale).toBeCloseTo(box.scale, 4);
    }
  });

  it("would have left the old 8-world-unit threshold inside the drawn ink", () => {
    // The defect, recorded as arithmetic rather than as prose: at every one of
    // the four real boxes the old hit radius was SMALLER than the 4 px ink
    // radius a reader can see, and at 390 it was under a third of it.
    for (const box of PROBED_BOXES) {
      const oldRadiusPx = 8 * fitView(LAYOUT, box).scale;

      expect(oldRadiusPx).toBeLessThan(TOPOLOGY_NODE_INK.equity / 2);
    }

    expect(8 * fitView(LAYOUT, PROBED_BOXES[3]).scale).toBeCloseTo(1.311, 3);
  });
});

describe("topologyNodeAt", () => {
  it("finds a node pointed at dead centre, at every probed box", () => {
    for (const box of PROBED_BOXES) {
      const view = fitView(LAYOUT, box);
      const candidate = candidateOfKind("equity");
      const at = screenOf(view, candidate);

      expect(topologyNodeAt(view, CANDIDATES, at.x, at.y)?.node.symbol).toBe(
        candidate.node.symbol,
      );
    }
  });

  it("finds a node pointed at the EDGE of its drawn ink, at every probed box", () => {
    // **The reader-facing claim.** 4 px from the centre of an equity is the
    // edge of the visible disc at zoom 1 — unambiguously on the mark. The old
    // rule answered `null` there at all four widths (see the box test above),
    // and at 390 it answered `null` well inside the mark.
    //
    // **The assertion is `not null` rather than this exact symbol**, and
    // deliberately: at 390's fit scale of 0.1639 a point 4 px from one node's
    // centre is really inside a neighbour's target, which is pre-existing
    // node-density crowding (`renderer-canvas.ts`'s own measured note) and not
    // something a hit test can resolve. What a reader is owed is that pointing
    // at a mark hits SOMETHING; which of two coincident discs it hits is
    // Story 6.6's sizing problem.
    for (const box of PROBED_BOXES) {
      const view = fitView(LAYOUT, box);
      const at = screenOf(view, candidateOfKind("equity"));

      expect(
        topologyNodeAt(
          view,
          CANDIDATES,
          at.x + TOPOLOGY_NODE_INK.equity / 2,
          at.y,
        ),
      ).not.toBeNull();
    }
  });

  it("answers the node itself at the edge of its ink where it has clear ground", () => {
    // The same claim with the crowding removed — on the most isolated node at
    // this fit, the answer is that node and not a neighbour.
    const view = fitView(LAYOUT, PROBED_BOXES[0]);
    const candidate = mostIsolated(view);
    const at = screenOf(view, candidate);
    const edge = TOPOLOGY_NODE_INK[candidate.node.kind] / 2;

    expect(topologyNodeAt(view, CANDIDATES, at.x + edge, at.y)?.node).toBe(
      candidate.node,
    );
  });

  it("answers nothing just outside the target, rather than reaching for a neighbour", () => {
    // The other half of a hit test: a generous target must still have an edge.
    // A hair past the radius on the clearest node there is is `null` — which
    // is what returns the plate to its idle instruction and the cursor to
    // `grab`.
    const view = fitView(LAYOUT, PROBED_BOXES[0]);
    const candidate = mostIsolated(view);
    const at = screenOf(view, candidate);
    const radius = topologyTargetRadius(candidate.node.kind, view.zoom);

    expect(
      topologyNodeAt(view, CANDIDATES, at.x + radius + 0.5, at.y),
    ).toBeNull();
  });

  it("answers nothing at all in genuinely empty space", () => {
    const view = fitView(LAYOUT, PROBED_BOXES[0]);

    // Well outside the fitted content on both axes — a corner of the frame
    // the market does not reach.
    expect(topologyNodeAt(view, CANDIDATES, -500, -500)).toBeNull();
  });

  it("compares each kind against its OWN radius", () => {
    // A 12 px diamond and an 8 px disc cannot share one threshold: a point
    // 6 px from a proxy's centre is inside its ink and outside an equity's
    // whole target, so a single-radius implementation is wrong about one of
    // them whichever radius it picks.
    const view = fitView(LAYOUT, PROBED_BOXES[0]);

    for (const kind of SECURITY_KINDS) {
      const candidate = candidateOfKind(kind);
      const at = screenOf(view, candidate);
      const edge = TOPOLOGY_NODE_INK[kind] / 2;

      expect(
        topologyNodeAt(view, CANDIDATES, at.x + edge, at.y),
      ).not.toBeNull();
    }

    expect(topologyTargetRadius("index_etf", 1)).toBeGreaterThan(
      topologyTargetRadius("equity", 1),
    );
    expect(topologyTargetRadius("index_etf", 1)).toBeGreaterThan(
      TOPOLOGY_NODE_INK.index_etf / 2,
    );
  });

  it("picks the nearer of two overlapping candidates", () => {
    // Two nodes 6 px apart on screen with 8 px targets each: a point 1 px from
    // the first is inside both, and the answer has to be the one the reader is
    // closer to — the only answer that is stable as the pointer moves.
    const view = fitView(LAYOUT, PROBED_BOXES[0]);
    const unit = view.scale * view.zoom;
    const template = candidateOfKind("equity");

    const pair: readonly TopologyHitCandidate[] = [
      { ...template, x: view.centreX, y: view.centreY },
      { ...template, x: view.centreX + 6 / unit, y: view.centreY },
    ];

    const centre = worldToScreen(view, view.centreX, view.centreY);

    expect(topologyNodeAt(view, pair, centre.x + 1, centre.y)).toBe(pair[0]);
    expect(topologyNodeAt(view, pair, centre.x + 5, centre.y)).toBe(pair[1]);
  });

  it("still works after a zoom about a point, because both sides are screen-space", () => {
    // The transform is `fit.ts`'s and is tested there; what this asserts is
    // that the hit test reads the SAME view the drawing does, so a reader who
    // zooms in on a cluster is still pointing at what they can see.
    const view = zoomAbout(fitView(LAYOUT, PROBED_BOXES[0]), 3, 400, 180);
    const candidate = candidateOfKind("equity");
    const at = screenOf(view, candidate);

    expect(
      topologyNodeAt(
        view,
        CANDIDATES,
        at.x + (TOPOLOGY_NODE_INK.equity * clampNodeScale(view.zoom)) / 2,
        at.y,
      )?.node.symbol,
    ).toBe(candidate.node.symbol);
  });
});
