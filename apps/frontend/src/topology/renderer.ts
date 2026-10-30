/**
 * **What a topology renderer is** — the seam Story 6.1's two candidates were
 * measured either side of (Task 6.1.2).
 *
 * Both candidates read the *same* {@link TopologyGraph} and the *same*
 * {@link TopologyLayout} from `packages/shared`, mount into the *same*
 * container from the *same* React component, and are driven by the *same*
 * scripted pan/zoom path. So what the frame-rate figures measure is **drawing**
 * rather than two different pictures or two different mount paths — which is
 * the confound Task 6.1.1 was sequenced before this one to remove.
 *
 * ## The probe is the measurement seam, and it is here on purpose
 *
 * Story 6.1's acceptance criterion 5: *the plant for this story's frame-rate
 * claim must live **inside the render loop**, never on the DOM.* The repaint
 * arm of `scripts/overview-instrument.mjs` watches `<main>` for mutations, and
 * **a canvas mutates no DOM at all** — so that channel reads silent for a
 * working graph exactly as it would for one that painted a single frame and
 * died. {@link TopologyRendererOptions.probe} is called once per **drawn
 * frame**, by both candidates, from inside their own draw, which is the only
 * place a plant can prove the loop ran and the only place a known per-frame
 * cost can be injected.
 *
 * It is a renderer concern rather than an instrument concern because only the
 * renderer knows when it drew. Nothing in the application passes one.
 */

import type { TopologyGraph, TopologyLayout } from "@marketpulse/shared";

import type { TopologyPalette } from "./palette.js";

/** Which implementation drew. Carried on the renderer so a figure can name it. */
export type TopologyRendererKind = "canvas" | "sigma";

/**
 * The ink diameter of each node kind, in **CSS pixels at zoom 1**.
 *
 * From the design canvas (`The graph at rest.dc.html`): circle 8 for the 501
 * equities, square 10 for the eleven sector SPDRs, diamond 12 for the four
 * market proxies. **Shape carries kind; size is nominal** — Story 6.6 inherits
 * the bound that a quantitative encoding varies the equity circle only, so the
 * class read survives where a large equity reaches an ETF's footprint.
 *
 * These are *ink*, not footprint. The footprint is
 * `TOPOLOGY_NODE_FOOTPRINT` = 16 in the layout's own units, and the 4 units
 * between 8 and 16 are reserved rather than spare — Story 6.3's anomaly band
 * and Story 6.4's focus ring both want that annulus.
 */
export const TOPOLOGY_NODE_INK = {
  equity: 8,
  sector_etf: 10,
  index_etf: 12,
} as const;

/**
 * How far the drawn node size may depart from {@link TOPOLOGY_NODE_INK}.
 *
 * The canvas's zoom rule: position scales, node size scales **too but clamped
 * to [0.5, 1.5]**, so the 8 : 10 : 12 ladder holds at every zoom (absolute
 * 4–12 / 5–15 / 6–18 px). Edge width, halo and label type stay **constant** —
 * a scaling edge at zoom 3 is a 3 px rope and 501 of them are a web.
 */
export const TOPOLOGY_NODE_SCALE_FLOOR = 0.5;

/** See {@link TOPOLOGY_NODE_SCALE_FLOOR}. */
export const TOPOLOGY_NODE_SCALE_CEILING = 1.5;

/** What a renderer is handed at mount. */
export interface TopologyRendererOptions {
  /** The graph, from `buildTopologyGraph`. */
  readonly graph: TopologyGraph;
  /** Where every node sits, from `buildTopologyLayout`. */
  readonly layout: TopologyLayout;
  /** Every colour and type value, read from tokens. See {@link TopologyPalette}. */
  readonly palette: TopologyPalette;
  /**
   * Called once per **drawn frame**, from inside the draw.
   *
   * See the module docblock: this is the only channel that can tell a working
   * graph from one that painted once and stopped, because a canvas mutates no
   * DOM. Nothing in the application passes one.
   */
  readonly probe?: (() => void) | undefined;
}

/** A mounted renderer. */
export interface TopologyRenderer {
  /** Which implementation this is. */
  readonly kind: TopologyRendererKind;
  /** Re-read the container's box and redraw. */
  resize(): void;
  /** How many frames this renderer has drawn since mount. */
  framesDrawn(): number;
  /** Release the context, the listeners and the observers. */
  destroy(): void;
}

/** How a candidate is mounted. Both candidates export one of these. */
export type TopologyRendererFactory = (
  container: HTMLElement,
  options: TopologyRendererOptions,
) => TopologyRenderer;
