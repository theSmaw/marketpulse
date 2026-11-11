/**
 * **The topology module's API** — `PRODUCT_SPEC.md` §26's second feature module
 * (Task 6.1.2).
 *
 * `market/`'s precedent exactly: this barrel is the module's API, everything
 * else under the directory is its business, and `eslint.config.mjs`'s
 * `no-restricted-imports` refuses a deep import into it. The entry sits in the
 * **same** `patterns` array as `market/`'s rather than in a block of its own —
 * flat config resolves a rule to the last configuration that matched, so a
 * second block would silently *replace* that array and take the browser
 * boundary out with it.
 *
 * §26 puts `topology/` in three parts — `renderer`, `layout`, `interaction` —
 * and what is here is **two** of them. The layout is not in this module at all:
 * it is `packages/shared`'s, because Epic 7 reads positions server-side, and
 * `fit.ts` is the only pixel-aware half. ~~Interaction is pan and zoom only;
 * hover and selection are Story 6.4's.~~ **Half false since 2026-11-04 (Task
 * 6.4.1): interaction is pan, zoom and HOVER** — `hit-test.ts` is what a
 * reader is pointing at, in screen pixels. ~~Selection is still Task 6.4.2's.~~
 * **False since 2026-11-04 (Task 6.4.2): interaction is pan, zoom, hover and
 * SELECTION**, and **since 2026-11-05 (Task 6.4.3) the KEYBOARD besides** —
 * `walk.ts` is what an arrow key does in a graph, a pure function over the
 * graph and its layout, and it reaches the **same** selection setter a click
 * does rather than a second one. `click-gesture.ts` is what tells a click
 * from a pan; the selected node is the renderer's own state
 * (`renderer-canvas.ts`), reported out through
 * `TopologyRendererOptions.onSelect` so that React can render the **one**
 * anchor this surface has.
 */

export {
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
export type { TopologyView, TopologyViewport } from "./fit.js";

export { topologySource } from "./graph-source.js";
export type { TopologySource } from "./graph-source.js";

export {
  TOPOLOGY_BAND_PARAM,
  TOPOLOGY_BAND_REFUSAL,
  TOPOLOGY_SECTOR_PARAM,
  UNFILTERED_TOPOLOGY,
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
export type { TopologyFilter, TopologyNarrowing } from "./filter.js";
export { useTopologyFilter } from "./use-topology-filter.js";

export {
  anomalyTreatmentsFromWire,
  unscoredAnomalyTreatments,
} from "./anomaly-treatments.js";

export {
  TOPOLOGY_CLICK_MAX_DURATION_MS,
  TOPOLOGY_CLICK_MAX_TRAVEL_PX,
  isTopologyClick,
} from "./click-gesture.js";
export type { TopologyPressGesture } from "./click-gesture.js";

export { topologyPalette } from "./palette.js";
export type { TopologyPalette } from "./palette.js";

export {
  TOPOLOGY_NODE_INK,
  TOPOLOGY_NODE_SCALE_CEILING,
  TOPOLOGY_NODE_SCALE_FLOOR,
} from "./renderer.js";
export {
  TOPOLOGY_NODE_TARGET_ANNULUS,
  topologyNodeAt,
  topologyTargetRadius,
} from "./hit-test.js";
export type { TopologyHitCandidate } from "./hit-test.js";

export { TOPOLOGY_WALK_KEYS, isTopologyWalkKey, topologyWalk } from "./walk.js";
export type { TopologyWalkKey } from "./walk.js";

export type {
  TopologyAnomalyTreatment,
  TopologyFilterCriterion,
  TopologyHoverTarget,
  TopologyRenderer,
  TopologyRendererFactory,
  TopologyRendererKind,
  TopologyRendererOptions,
  TopologySelectionSource,
} from "./renderer.js";

export { mountCanvasTopology } from "./renderer-canvas.js";
