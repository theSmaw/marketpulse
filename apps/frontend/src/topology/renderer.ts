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
  Sector,
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

/**
 * **What a reader has narrowed the picture to** (Task 6.8.1 for the sector,
 * widened Task 6.8.2 for the band).
 *
 * One object rather than two parameters, and it is the shape
 * `topology/filter.ts` already reads off the address — so the mount option,
 * {@link TopologyRenderer.setFilter} and `readTopologyFilter`'s own answer are
 * three views of one criterion rather than three argument lists to keep in
 * step. Widening it is how a third axis would arrive, and the renderer's own
 * no-op guard compares the two fields rather than the object's identity,
 * because the component re-reads the address on every render.
 *
 * **`bands` is a UNION and `sector` is an INTERSECTION with it.** `high` and
 * `extreme` together draw either; a sector and a band together draw the
 * securities in that sector that are also in one of those bands. Empty
 * `bands` is *every band*, which is not the same claim as *every band listed*
 * — see `TOPOLOGY_BAND_REFUSAL` for what happens when none of them has been
 * measured.
 */
export interface TopologyFilterCriterion {
  /** The sector drawn, or `null` for every sector. */
  readonly sector: Sector | null;
  /** The bands drawn, in canonical order, or empty for every band. */
  readonly bands: readonly AnomalyBand[];
}

/** Which implementation drew. Carried on the renderer so a figure can name it. */
export type TopologyRendererKind = "canvas" | "sigma";

/**
 * **What moved the selection** (Task 6.4.3) — reported beside it, because the
 * caller's answer differs.
 *
 * A keyboard walk must leave DOM focus on the one thing a reader can activate,
 * so `MarketTopology` moves focus to the readout plate's anchor when — and
 * only when — a key produced the selection. A pointer click must not: the
 * reader's hand is already where they want it, and stealing focus into the
 * plate would move the page's own focus ring for a gesture that never asked
 * for it.
 *
 * `"band"` is neither: it is the renderer re-reporting the SAME node because a
 * live `setBands` changed what it is drawn as, which is a redraw of a word
 * rather than a move. It is named rather than folded into `"pointer"` so that
 * nothing downstream has to read *a pointer did this* about a batch arriving
 * on a socket. `ChartReading.tsx`'s own `source: "pointer" | "keyboard"` on
 * its reading is the precedent for carrying this at all.
 *
 * **`"filter"` is a fourth, added at Task 6.8.1, and it is the only one that
 * is always a CLEARING.** A sector **or band** filter the READER changed that
 * excludes the selected node clears it — never a live `setBands` that moves
 * the selected security out of the active band, which reports `"band"` and
 * keeps the node drawn (Task 6.8.2). The two things a caller does differently
 * for `"filter"` are both
 * reasons it cannot be folded into `"keyboard"`: the announcement names the
 * security that went (*"NVDA is not in this filter, so the selection was
 * cleared"*, never the generic `Escape` wording), and focus is left exactly
 * where the reader's hands are, which is on the filter control in the
 * region's own chrome.
 */
export type TopologySelectionSource =
  "pointer" | "keyboard" | "band" | "filter";

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
  /**
   * The criterion this picture is narrowed to at MOUNT, or absent for the
   * whole market (Task 6.8.1; widened to carry the band at Task 6.8.2).
   *
   * **A mount option as well as {@link TopologyRenderer.setFilter}, and the
   * reason is the first frame.** A cold load of `/?sector=energy` is an
   * ordinary shared link, and the component's own filter effect runs after
   * paint — so without this the reader would see all 516 nodes and then watch
   * 480 of them go. The two are not two homes for one fact: this is the
   * criterion a renderer is *born* with and that method is how it is *told* of
   * a change, the same division `bands`/`setBands` already has.
   *
   * **A band named here narrows nothing at mount, and that is correct rather
   * than a gap**: a renderer is born with no treatment map at all, so its
   * scored cohort is zero and the band cut is refused
   * (`TOPOLOGY_BAND_REFUSAL`) until the first `setBands` call arrives. A cold
   * `/?band=high` therefore draws the whole market and says why, then narrows
   * when the first live batch lands — never an empty market in between.
   */
  readonly filter?: TopologyFilterCriterion | undefined;
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
   * The id of a sibling element holding the key hints — *arrow keys walk the
   * graph, Enter opens the selected security* (Task 6.4.3).
   *
   * **A second id rather than a widening of {@link labelledBy}**, because the
   * two are different attributes answering different questions: the label is
   * *what this picture is* and is read when the canvas is reached, and the
   * description is *what you can do to it*. `ChartReading.tsx` is the
   * precedent and it is exact — `role="img"` plus `tabIndex={0}` plus an
   * `aria-describedby` pointing at a visually-hidden hint — and it exists
   * there for the reason this repository has written down twice: a
   * description attached to something a key press cannot reach is a sentence
   * nobody is ever read.
   *
   * Undefined mounts the canvas with no `aria-describedby`, which is correct
   * for a Storybook permutation with no hint beside it. The keyboard still
   * works there; what is absent is the sentence saying so.
   */
  readonly describedBy?: string | undefined;
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
   *
   * **The keyboard reaches this same channel and there is no second one**
   * (Task 6.4.3). An arrow key computes the next node through
   * `topology/walk.ts` and calls the renderer's own internal setter — the one
   * a click already calls — so a caller cannot tell a keyboard selection from
   * a pointer one except by the {@link TopologySelectionSource} it is handed
   * beside it, and the `openable`/`<Link>` plumbing needed no change at all
   * when the keyboard landed.
   */
  readonly onSelect?:
    | ((
        selected: TopologyHoverTarget | null,
        source: TopologySelectionSource,
      ) => void)
    | undefined;
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
  /**
   * Narrow the drawn graph to one sector and/or a set of bands, or widen it
   * back to the whole market — **without re-mounting and without
   * re-laying-out** (Task 6.8.1; the band at Task 6.8.2).
   *
   * `setBands`' own contract one subject over, and the same three
   * guarantees: a reader's pan, zoom and (where it survives the criterion)
   * selection are untouched, the viewport never re-fits to the narrowed
   * subset, and `buildTopologyLayout` is not called again — placements are
   * the unfiltered layout's, looked up by symbol, which is what keeps the
   * server/browser coordinate agreement Epic 7's tools need.
   *
   * **What it changes, in one pass rather than per frame**: the equities
   * outside the sector draw no ink, are not hit-testable and are not
   * reachable by the keyboard walk; the edges that reached them go with
   * them; the excluded sectors' names are not drawn; and their eleven
   * benchmark ETFs are drawn quieter rather than hidden
   * (`STORY.md`'s settled Open Decision 2 — the fifteen landmarks are never
   * excluded, because they are the walk's own tree).
   *
   * **It can clear the selection, and says so through
   * {@link TopologySelectionSource}'s own fourth value.** A selected node
   * the new criterion excludes is reported as `onSelect(null, "filter")`,
   * which is the one selection change no input device made.
   *
   * **The band half is applied against the LIVE treatment map `setBands`
   * holds, and that is the whole reason this method and that one share one
   * re-partition** (Task 6.8.2). The criterion changes at **reader** cadence
   * and the data it is applied against changes at **feed** cadence, so a band
   * filter is re-resolved by whichever of the two arrived last — and
   * `MarketTopology` still takes no prop that moves on a batch, which is the
   * declined `React.memo` boundary three earlier stories rely on by name.
   *
   * **This call clears an excluded selection; a `setBands` call never does.**
   * A reader who presses a band asked for a different picture, so a selection
   * the new criterion excludes goes, announced by name. A live batch that
   * moves a selected security out of the active band is not a reader's act at
   * all, so the node stays drawn, stays selected and stays reachable.
   *
   * **A no-op after `destroy()` and a no-op for the criterion already in
   * force**, same contract as every other method here — compared field by
   * field, because the component re-reads the address on every render.
   */
  setFilter(criterion: TopologyFilterCriterion): void;
  /**
   * Play the graph-level live-update mark, decaying (Task 6.7.2, Open
   * Decision 1) — a brief, whole-surface highlight saying *a live batch just
   * arrived*, without re-mounting and without touching `setBands`'s own
   * band map.
   *
   * **A verb, not a value** — like `reset()`, this is a command aimed at a
   * resource the renderer already owns, called once per burst rather than
   * reflecting a prop. Calling it again while a mark is already decaying
   * **restarts** it from full strength rather than compounding two marks:
   * there is one clock (`burstStartedAt`), and a second call simply moves it.
   *
   * **A no-op after `destroy()`**, same contract as every other method here.
   */
  markBurst(): void;
  /**
   * **Put DOM focus on the canvas** (Task 6.4.4) — the one home for *where a
   * keyboard reader of this region belongs*.
   *
   * The renderer owns the focusable element (it is the thing that sets
   * `tabIndex` on it and the thing `Escape` already focuses), so a caller that
   * needs focus back inside the graph asks for it rather than reaching for a
   * `<canvas>` it did not create. `MarketTopology`'s focus recovery is the one
   * caller: the plate's single anchor can be removed by a gesture that moves
   * focus nowhere, and this is where the reader is put back.
   *
   * **A no-op risk this does NOT take**: it does not clear, draw or scroll
   * anything. Focusing the canvas is all of it.
   */
  focus(): void;
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
