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

import type {
  AnomalyBand,
  Ticker,
  TopologyGraph,
  TopologyLayout,
  TopologyNode,
} from "@marketpulse/shared";

import type { TopologyPalette } from "./palette.js";

/**
 * What one equity's node treatment is, beyond today's shipped look (Task
 * 6.3.2).
 *
 * `AnomalyBand`'s own four values cover `normal`/`elevated`/`high`/`extreme`
 * — every one of those is a security the composite scored. `"unscored"` is
 * the fifth state the wire does not carry as a band at all: an equity whose
 * explanation could not be re-added, or one that exists in a universe with
 * no composite generation at all (CI's permanent state). It is named here
 * rather than folded into `AnomalyBand` because it is not a reading of the
 * score — it is the absence of one, STORY.md AC 4's own distinction.
 */
export type TopologyAnomalyTreatment = AnomalyBand | "unscored";

/**
 * What a reader is pointing at — **or has selected** — as the renderer reports
 * it (Task 6.4.1; the second half added at Task 6.4.2).
 *
 * **One type for both channels, deliberately.** `onHover` and `onSelect` report
 * the same thing about a node (which node, and what it is drawn as) and the
 * readout plate draws whichever of the two is currently relevant — so a second
 * near-identical interface would be two names for one fact, and the `?? `
 * fallback that picks between them would not typecheck without a converter
 * nobody needs. The name is left as `TopologyHoverTarget` rather than widened
 * to `TopologyTarget`: it is referenced by `onHover`'s own contract, by
 * `MarketTopology.tsx` and by two test files, and a rename across them is churn
 * that buys a word.
 *
 * **The treatment travels WITH the node**, which is this task's own
 * constraint: the renderer already holds the band map (`setBands`), so a
 * caller that re-derived the band from a second copy of it would be two homes
 * for one fact — and the two could disagree for exactly as long as it takes a
 * live batch to reach one and not the other.
 *
 * `treatment` is `null` for the fifteen landmark nodes — the eleven sector
 * SPDRs and the four market proxies — because Gate 1's Decision 3 excludes
 * them from the anomaly encoding **entirely** rather than drawing them
 * unscored. `null` here is therefore *nobody tried to score this*, which is a
 * different sentence from `"unscored"`'s *we tried and have no answer*, and
 * the readout spells them differently.
 */
export interface TopologyHoverTarget {
  /** The node itself — `symbol`, `label`, `kind` and `cluster` are all on it. */
  readonly node: TopologyNode;
  /** What this node is currently DRAWN as, or `null`. See the docblock. */
  readonly treatment: TopologyAnomalyTreatment | null;
}

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
  /**
   * The id of a sibling element holding this graph's text equivalent (Task
   * 6.2.4). A canvas has no accessible content of its own, so the mounted
   * `<canvas>` takes `role="img"` and `aria-labelledby` pointing here —
   * never `aria-label`, which would be a second copy of the string the
   * one-fact-one-home rule forbids. Undefined mounts a canvas with neither
   * attribute, which is correct for a Storybook permutation that has no
   * sentence beside it to point to.
   */
  readonly labelledBy?: string | undefined;
  /**
   * Called when the node under the pointer **changes** — never on every
   * pointer move (Task 6.4.1).
   *
   * `null` means the pointer is over no node, or has left the canvas
   * altogether. It is also called again, with the same node, when a live
   * `setBands` changes what that node is drawn as while a reader is still
   * pointing at it — a readout that went stale under a static pointer would be
   * a figure that is wrong about the picture beside it.
   *
   * **A push rather than a getter, and it must not reach React state.** Hover
   * changes at pointer-move cadence, and `MarketTopology`'s declined
   * `React.memo` boundary (that component's own module docblock) is closed by
   * construction only while nothing in this region re-renders at that
   * cadence. So the application's implementation of this writes the readout
   * plate's text content directly, the same way `applyAnomalyBands` already
   * writes the accessible sentence.
   */
  readonly onHover?:
    ((hovered: TopologyHoverTarget | null) => void) | undefined;
  /**
   * Called when the **selected** node changes — a click on a node selects it, a
   * click on empty canvas clears it, a click on a different node moves it
   * (Task 6.4.2).
   *
   * **Selection is a third state and it is not hover.** It persists: it
   * survives the pointer leaving the node, it survives a pan, and it survives
   * `Reset view` (which is named for the view). `null` means nothing is
   * selected.
   *
   * **A click rather than a press**, told apart from a pan by
   * `isTopologyClick` — a drag that happens to end over a node must not select
   * it, which is Gate 1's two-step decision ("the figure is never the link"
   * arriving at a canvas) and the reason there is a threshold here at all.
   *
   * **This one DOES reach React state, and it is the only thing on this
   * surface that may.** A Canvas2D node has no DOM element of its own, so it
   * cannot hold a `<Link>`; the resolution is **one** anchor — the readout
   * plate's ticker — whose `href` is resolved at render from the selected
   * symbol's own identity, and only React can render that. Hover stays
   * renderer-internal (see {@link onHover}) because it changes at pointer-move
   * cadence; a selection changes on a click, which is not a cadence.
   *
   * It is also called again with the **same** node when a live `setBands`
   * changes what that node is drawn as, for `onHover`'s own reason: the plate
   * may be showing the selection, and a word that went stale under it would
   * disagree with the picture beside it.
   */
  readonly onSelect?:
    ((selected: TopologyHoverTarget | null) => void) | undefined;
}

/** A mounted renderer. */
export interface TopologyRenderer {
  /** Which implementation this is. */
  readonly kind: TopologyRendererKind;
  /** Re-read the container's box and redraw. */
  resize(): void;
  /**
   * Fit the view fresh at the current box — zoom back to 1, pan back to 0.
   * The `Reset view` control's whole mechanism (Task 6.2.3): a clamped pan
   * means a reader can never lose the market entirely, but it is still a
   * market that has been dragged and zoomed, and this is the way back with
   * no reload.
   *
   * **It does not clear the selection** (Task 6.4.2). The control is named for
   * the **view**, and Gate 1's decision keeps clearing a selection to `Escape`
   * (Task 6.4.3) and to clicking empty canvas. A reader who has committed to a
   * security and then lost the market is asking for the market back, not for
   * their security to be forgotten.
   */
  reset(): void;
  /**
   * Redraw with each equity's anomaly treatment, **without re-mounting**
   * (Task 6.3.2) — the update channel the mount effect's own docblock
   * predicted this story would need, so a reader's pan and zoom survive a
   * band changing under them.
   *
   * A symbol absent from `treatments` draws `normal` — today's shipped node,
   * unchanged. Scoped to the 501 equities: a sector SPDR, a market proxy or
   * the hub keyed in this map is ignored, because Gate 1's Decision 3
   * excludes the fifteen landmarks from the encoding entirely rather than
   * drawing them unscored.
   */
  setBands(treatments: ReadonlyMap<Ticker, TopologyAnomalyTreatment>): void;
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
