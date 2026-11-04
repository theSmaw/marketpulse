/**
 * **What a reader is pointing at, in the units a reader can see** (Task
 * 6.4.1).
 *
 * This module exists because the hit-test that shipped with Story 6.1 compared
 * in the **wrong units**, and the defect was invisible for as long as the only
 * thing that depended on the answer was the cursor icon.
 *
 * ## The defect, in one line of arithmetic
 *
 * `nodeAt()` converted the pointer to layout units and accepted any node within
 * **8 layout units** of it. A node's drawn ink, though, is
 * `TOPOLOGY_NODE_INK[kind] * clampNodeScale(view.zoom)` **CSS pixels** — a
 * constant 8 px across for an equity at zoom 1, *independent of the container's
 * own fit scale*, because `clampNodeScale` answers the explicit user zoom and
 * never the fit (`renderer-canvas.ts`'s own note on the absent `elevated`
 * threshold). So the two quantities are in different spaces and the conversion
 * factor between them is the fit scale, which this screen resolves at four
 * different values.
 *
 * **Measured 2026-11-04 with `pnpm probe / --within "Market topology"`**, which
 * reports `.content` — the box `.frame` takes `inset: 0` against — at
 * **998×413, 570×413, 686×413 and 308×413** at 1440/1024/768/390. Through
 * `fitView` over the recorded 518-security universe (`spanX 1879.72`,
 * `spanY 922.58`) those are fit scales **0.4477, 0.3032, 0.3649, 0.1639**, so
 * the shipped 8-world-unit threshold was a hit radius of:
 *
 * | width | fit scale | old hit radius | drawn ink radius |
 * | ----: | --------: | -------------: | ---------------: |
 * |  1440 |    0.4477 |       3.581 px |             4 px |
 * |  1024 |    0.3032 |       2.426 px |             4 px |
 * |   768 |    0.3649 |       2.920 px |             4 px |
 * |   390 |    0.1639 |       1.311 px |             4 px |
 *
 * At 390 the target was **three times narrower than the mark a reader can
 * see**, and under a pointer that is nominally over the ink the answer was
 * `null`. Today that mis-sets a cursor; the moment a readout plate is driven
 * from it, a narrow-screen reader is shown facts about a node they are not
 * pointing at — or none at all.
 *
 * ## What replaces it
 *
 * {@link topologyTargetRadius} — **CSS pixels, derived from the node's own
 * drawn ink plus the annulus Story 6.3 reserves around it**, so the target is
 * at least as generous as the visible mark at every fit scale and every zoom,
 * and the fit scale drops out of the comparison entirely because both sides are
 * now screen-space.
 *
 * It is a module of its own, pure, for `fit.ts`'s own stated reason: it is the
 * one part of this behaviour a unit test can reach. jsdom has no 2d context, so
 * `renderer-canvas.ts` is unreachable below `pnpm e2e` — and a hit radius is
 * exactly the sort of arithmetic that is wrong by a factor nobody notices.
 */

import { TOPOLOGY_NODE_FOOTPRINT } from "@marketpulse/shared";
import type { SecurityKind, TopologyNode } from "@marketpulse/shared";

import { clampNodeScale, worldToScreen } from "./fit.js";
import type { TopologyView } from "./fit.js";
import { TOPOLOGY_NODE_INK } from "./renderer.js";

/**
 * How far past its own ink a node is targetable, in **CSS pixels at zoom 1**.
 *
 * `(TOPOLOGY_NODE_FOOTPRINT − TOPOLOGY_NODE_INK.equity) / 2` = **4** — the
 * whole annulus `The graph at rest.dc.html` §03 reserves between an equity's
 * 8 px ink and its 16 px footprint, which is the room Story 6.3's anomaly ring
 * is painted in and Story 6.4's focus ring will be. A reader pointing at a
 * ringed node is pointing at the ring, so the ring has to be inside the target
 * — and the footprint is the largest claim the design makes about where one
 * node ends and the next begins.
 *
 * Derived from the two shared constants rather than spelled as `4`, so an
 * **ink** change moves the target with the drawing instead of leaving this
 * number behind.
 *
 * **One honest caveat, found on review rather than before it shipped**:
 * `TOPOLOGY_NODE_FOOTPRINT` is a LAYOUT-unit constant — the model's own
 * minimum centre-to-centre separation (`topology-layout.ts`'s own docblock)
 * — and `TOPOLOGY_NODE_INK.equity` is a CSS-PIXEL constant at zoom 1. This
 * subtraction mixes the two spaces and is only numerically coherent because
 * both happen to share one unit at zoom 1 by this renderer's own convention
 * — the same coincidence `renderer-canvas.ts`'s `ANOMALY_RING_OFFSET`
 * (Task 6.3.2) already rests on. It means a future change to
 * `TOPOLOGY_NODE_FOOTPRINT` **for the layout's own reason** (re-spacing the
 * graph) would silently move this screen-space target too, which is not
 * the footprint's job. Flagged rather than restructured, consistent with
 * the existing precedent; a re-derivation that drops the layout-unit
 * constant entirely is owed if `ANOMALY_RING_OFFSET` is ever revisited.
 */
export const TOPOLOGY_NODE_TARGET_ANNULUS =
  (TOPOLOGY_NODE_FOOTPRINT - TOPOLOGY_NODE_INK.equity) / 2;

/**
 * The radius, in **CSS pixels**, within which a node is the thing a reader is
 * pointing at.
 *
 * `(ink / 2 + annulus) · clampNodeScale(zoom)` — the drawn ink's own radius,
 * plus {@link TOPOLOGY_NODE_TARGET_ANNULUS}, scaled by the **same** multiplier
 * the renderer scales the mark itself by. So the target tracks the mark through
 * the whole zoom range rather than being a constant that is generous at one end
 * of it and mean at the other, and at zoom 1 an equity's target is 8 px — half
 * the footprint, which is what the shipped docblock claimed and the shipped
 * arithmetic did not deliver.
 *
 * **It is never smaller than the ink plus its 1 px halo**, at any zoom, which
 * is `hit-test.test.ts`'s own property rather than a comment: the smallest case
 * is an equity at `clampNodeScale`'s floor of 0.5, where the target is 4 px
 * around a 2 px ink radius with 1 px of halo outside it.
 */
export function topologyTargetRadius(kind: SecurityKind, zoom: number): number {
  return (
    (TOPOLOGY_NODE_INK[kind] / 2 + TOPOLOGY_NODE_TARGET_ANNULUS) *
    clampNodeScale(zoom)
  );
}

/** One node and where it sits, in **layout** units. What the renderer holds. */
export interface TopologyHitCandidate {
  readonly node: TopologyNode;
  /** Layout units, from `TopologyPlacement`. */
  readonly x: number;
  /** See {@link x}. */
  readonly y: number;
}

/**
 * The node under a screen point, or `null`.
 *
 * A linear scan — 516 placements is ~5 µs, and a quadtree here would be
 * infrastructure built before the iteration that needs it (the shipped
 * `nodeAt`'s own note, which was right about this half).
 *
 * **Each candidate is compared against its OWN kind's radius**, because the
 * three kinds are drawn at three sizes: a 12 px diamond and an 8 px disc
 * cannot share one threshold without the threshold being wrong for one of
 * them. Among the candidates a point is inside, the **nearest centre** wins —
 * so a reader pointing into the overlap of two crowded discs gets the one they
 * are closer to, which is the only answer that is stable as the pointer moves.
 *
 * **It hands back the CANDIDATE, not the node** — generic in the candidate
 * type, so the renderer's own `DrawableNode` (which carries the placement and
 * the ink beside the node) comes back whole and nothing has to look a
 * placement back up by symbol to draw the hover ground under it.
 */
export function topologyNodeAt<Candidate extends TopologyHitCandidate>(
  view: TopologyView,
  candidates: readonly Candidate[],
  screenX: number,
  screenY: number,
): Candidate | null {
  let best: Candidate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const at = worldToScreen(view, candidate.x, candidate.y);
    const distance = Math.hypot(at.x - screenX, at.y - screenY);

    if (
      distance < bestDistance &&
      distance <= topologyTargetRadius(candidate.node.kind, view.zoom)
    ) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best;
}
