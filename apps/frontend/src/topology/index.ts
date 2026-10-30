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
 * `fit.ts` is the only pixel-aware half. Interaction is pan and zoom only;
 * hover and selection are Story 6.4's.
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

export { topologyPalette } from "./palette.js";
export type { TopologyPalette } from "./palette.js";

export {
  TOPOLOGY_NODE_INK,
  TOPOLOGY_NODE_SCALE_CEILING,
  TOPOLOGY_NODE_SCALE_FLOOR,
} from "./renderer.js";
export type {
  TopologyRenderer,
  TopologyRendererFactory,
  TopologyRendererKind,
  TopologyRendererOptions,
} from "./renderer.js";

export { mountCanvasTopology } from "./renderer-canvas.js";
