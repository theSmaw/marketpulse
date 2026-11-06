/**
 * **Candidate B — a hand-rolled Canvas2D renderer, zero dependencies** (Task
 * 6.1.2).
 *
 * One `<canvas>`, DPR-scaled, pan and zoom as a single affine transform from
 * {@link ./fit.js}, nodes as `arc()` / `rect()` / a diamond path per kind,
 * edges as **one batched path per edge kind**, hit-testing against the layout's
 * own coordinates. It is the ADR-0027 no-library spirit applied to a second
 * renderer: that decision's constraint was a *count* rather than a taste, and
 * the count here is 516 nodes and 512 edges.
 *
 * ## Eight draw calls a frame, whatever the universe does
 *
 * The whole frame is:
 *
 *   1. one `stroke()` for the 501 membership edges,
 *   2. one `stroke()` for the eleven hub edges,
 *   3–8. one `stroke()` (the halo) and one `fill()` (the ink) for each of the
 *        three node kinds,
 *   then fifteen `fillText()` calls for the eleven sector labels, the three
 *   free proxies' tickers and the hub's.
 *
 * A path accumulates 501 subpaths and is stroked once, which is why the figure
 * does not scale with the node count the way a per-node `fill()` would. **The
 * halo is the same path stroked at `lineWidth: 2` before the fill**, so a 1 px
 * ring of `--surface-raised` sits outside each mark for free rather than as a
 * second pass over 516 shapes.
 *
 * ## The probe is called once per drawn frame, from inside the draw
 *
 * See {@link ./renderer.js}' docblock. A canvas mutates no DOM, so this is the
 * only place a plant can prove the loop ran.
 */

import {
  SECTOR_ETFS,
  TOPOLOGY_HUB,
  TOPOLOGY_NODE_FOOTPRINT,
  topologyClusterRadius,
} from "@marketpulse/shared";
import type {
  Ticker,
  TopologyNode,
  TopologyPlacement,
} from "@marketpulse/shared";

import { isTopologyClick } from "./click-gesture.js";
import {
  clampNodeScale,
  fitView,
  panBy,
  reviewport,
  worldToScreen,
  zoomAbout,
} from "./fit.js";
import type { TopologyView } from "./fit.js";
import { topologyNodeAt } from "./hit-test.js";
import { TOPOLOGY_NODE_INK } from "./renderer.js";
import type {
  TopologyAnomalyTreatment,
  TopologyHoverTarget,
  TopologyRenderer,
  TopologyRendererFactory,
  TopologyRendererOptions,
  TopologySelectionSource,
} from "./renderer.js";
import { isTopologyWalkKey, topologyWalk } from "./walk.js";

/**
 * How far a wheel notch moves the zoom.
 *
 * `1.0015` per unit of `deltaY` — a trackpad notch on this platform is
 * single-digit `deltaY` and a mouse notch is 100, so a multiplier keyed on the
 * delta rather than on its sign is the only thing that behaves on both. The
 * figure is `pnpm probe`-checkable rather than argued: it puts a 100-unit mouse
 * notch at **1.16×**, which is a sixth of a doubling.
 */
const ZOOM_PER_DELTA = 1.0015;

/**
 * How much clear ground an edge leaves at each end, in CSS pixels, **beyond
 * the node's own ink radius**.
 *
 * 1.5 rather than 0: the halo is 1 px outside the ink, so a gap of exactly the
 * radius ends the line *on* the halo and leaves a visible notch in it. The
 * reason there is a gap at all is the design work's: 83 membership edges
 * converging on one square sum into a grey disc, and the disc reads as a
 * cluster treatment this product deliberately does not have.
 */
const EDGE_END_CLEARANCE = 1.5;

/**
 * **Unchanged for the anomaly ring, checked rather than assumed (Task
 * 6.3.2).** The Work item this ring was built against asked whether a ring
 * needs the same end-clearance treatment edges get, since a ring sitting
 * flush against the halo has the same notching problem from the inside.
 * `1.5` leaves an edge's computed endpoint — `ink/2 + 1.5`, 5.5 px for an
 * equity — geometrically shy of the halo but reaching INTO where a `high`
 * or `extreme` ring (centred at `ink/2 + 2`, up to 1.5 px either side of
 * that) is painted. **It does not notch**, checked with `pnpm probe` at 20×
 * crops of real ringed nodes with an incoming membership edge: the DRAW
 * ORDER is what prevents it, not the numeric clearance — edges are stroked
 * first, then node bodies, then this ring, each pass painting fully over
 * whatever the one before left in its own area. The same mechanism already
 * covers the halo covering an edge's end; this ring inherits it for free,
 * which is why no new ring-specific clearance was added.
 */

/** Where a sector label sits above its cluster's bounding circle, in CSS pixels. */
const LABEL_GAP = 8;

/**
 * The radius of the ground disc drawn under the hovered node, in **CSS pixels
 * at zoom 1** — 12, from `Hover, select, and the way out.dc.html` (Task
 * 6.4.1).
 *
 * 12 rather than the footprint's own 8: the disc has to read as ground
 * **under** a node that already fills a 16 px footprint, including a 3 px
 * `extreme` ring in the reserved annulus, so a disc the size of the footprint
 * would be hidden by the thing it is meant to sit behind. It scales with
 * `nodeScale` for the same reason the ring does — it is part of the mark, and a
 * constant-radius disc at zoom 8 is a dot under a 12 px ink.
 *
 * It is drawn **first in the frame**, before the edges, so every later pass
 * paints over it: a disc drawn last would cover the node it is announcing.
 */
const HOVER_GROUND_RADIUS = 12;

/**
 * The radius of the ground disc drawn under the **selected** node, in CSS
 * pixels at zoom 1 — {@link HOVER_GROUND_RADIUS}'s own figure, because the
 * design canvas draws selection as the hover disc's dark twin rather than as a
 * second size (Task 6.4.2).
 *
 * **Stated as its own constant rather than reusing the hover one by name**, so
 * that the day the canvas gives selection a different geometry there is a
 * figure to change rather than a shared constant to fork under a reader who
 * thinks they are editing hover. The equality is the claim, and it is written
 * here where both are visible.
 */
const SELECTION_GROUND_RADIUS = HOVER_GROUND_RADIUS;

/**
 * The focus ring's own stroke width, in CSS pixels — `--focus-width`'s figure,
 * **constant under zoom** like every other stroke this renderer draws (the
 * edge/halo/label rule, extended once already by Story 6.3's anomaly ring).
 *
 * **Spelled here rather than read from the token** (Task 6.4.3), which is a
 * decision rather than an oversight: `palette.ts` reads colours and type
 * values, and every geometric figure in this module — `HOVER_GROUND_RADIUS`,
 * `ANOMALY_RING_OFFSET`, `EDGE_END_CLEARANCE`, `LABEL_GAP` — is a constant
 * here with its origin named in a docblock. A single token read for a length
 * would be the only one of its kind and would put half this module's geometry
 * in one file and half in another. The condition for moving all of it:
 * **the first geometric figure here that a stylesheet and a frame must agree
 * about at runtime** — these two do not, because nothing in CSS draws
 * anywhere near this node.
 */
const FOCUS_RING_WIDTH = 2;

/** `--focus-offset`'s figure, in CSS pixels. See {@link FOCUS_RING_WIDTH}. */
const FOCUS_RING_OFFSET = 2;

/**
 * Where the focus ring's own centre line sits, in CSS pixels at zoom 1 —
 * **outside the 16-unit footprint**, which is the constraint Story 6.3's close
 * handed this story by name.
 *
 * `FOOTPRINT/2 + --focus-offset + --focus-width/2` = **11**, the design
 * canvas's own formula, which is `:focus-visible`'s `outline-offset` geometry
 * read against a circle rather than a border box: the footprint's edge is the
 * element's edge, the offset is clear ground, and a stroke straddles its path
 * so half the width is the rest. So the stroke spans **10 → 12** px of radius.
 *
 * ## Three clearances, and all three are arithmetic over shipped constants
 *
 * * **Story 6.3's `extreme` ring** — the widest band, centred at
 *   `ink/2 + ANOMALY_RING_OFFSET` = 6 with a 3 px stroke, so its outer edge is
 *   **7.5**. The gap to this ring's inner edge is **2.5 px at zoom 1**, and
 *   both scale with `nodeScale`, so the worst case is the zoom floor (0.5) at
 *   **1.25 px**. Checked on screen rather than left as arithmetic — Task
 *   6.4.3's own probe, which photographs a focused node at 8×.
 * * **The node's own halo**, 1 px outside the ink: nowhere near.
 * * **The selection ground disc**, radius {@link SELECTION_GROUND_RADIUS} = 12
 *   with a 1 px halo stroke straddling it (11.5 → 12.5). This ring's outer
 *   edge is **12**, so the outermost half-pixel of it lands on that stroke.
 *   It is accepted rather than repaired, and the reason is the draw order:
 *   this ring is the **last** thing in the frame, so it paints over the disc's
 *   own edge rather than being hidden by it, and what a reader sees is a light
 *   ring with ~1.5 px of dark ground outside it. Measured at 8× before this
 *   figure was trusted; the alternative — shrinking to 10 — buys 1.5 px of
 *   clearance from the disc and spends 1 px of it on the `extreme` ring,
 *   which is the tighter of the two.
 */
const FOCUS_RING_RADIUS =
  TOPOLOGY_NODE_FOOTPRINT / 2 + FOCUS_RING_OFFSET + FOCUS_RING_WIDTH / 2;

/**
 * The dark companion stroke's own width, in CSS pixels — **1, the same
 * hairline every node's halo is** (2026-11-06).
 *
 * `palette.focusRingEdge`'s docblock carries the measurement and the reason
 * the ring needs two tones at all. This is the geometric half of that
 * decision, and it has three parts:
 *
 * * **1 px rather than 2.** The light ring is the mark and this is its edge,
 *   which is the halo's own relationship to a node body — so it takes the
 *   halo's weight. It is also what keeps the total addition to 1 px.
 * * **Constant under zoom**, like every other stroke this renderer draws.
 * * **OUTSIDE the light ring rather than inside, and that is the load-bearing
 *   half.** Inside would have spent the clearance Story 6.3's `extreme` ring
 *   handed this story by name: {@link FOCUS_RING_RADIUS}'s own note measures
 *   that gap at 2.5 px at zoom 1 against an `extreme` ring's outer edge of
 *   7.5, and a 1 px stroke moved inside would take 1.5 px of it. Outside, the
 *   light ring's inner edge does not move at all, so **the clearance figure
 *   `scripts/topology-interaction-probe.mjs` reports is unchanged by this
 *   change by construction** rather than by hoping — which is the whole reason
 *   the tone was added outward.
 */
const FOCUS_RING_EDGE_WIDTH = 1;

/**
 * Where the dark companion stroke's centre line sits, in CSS pixels at zoom 1
 * — `FOCUS_RING_RADIUS + FOCUS_RING_WIDTH/2 + FOCUS_RING_EDGE_WIDTH/2` =
 * **12.5**, so it spans **12 → 13** and butts against the light ring's own
 * outer edge with no gap and no overlap.
 *
 * The one thing it lands on is the selection disc's own 1 px halo stroke,
 * which straddles radius 12 (11.5 → 12.5) — see
 * {@link SELECTION_GROUND_RADIUS}. That is accepted for the reason the light
 * ring's own overlap with it was: this pass is drawn after the disc, so it
 * paints over that half-pixel rather than being hidden by it, and the halo's
 * job (separating a dark disc from a dark landmark body) is an interior one
 * this does not touch. What a reader sees at the disc's edge is the dark
 * stroke, which is the same value the disc is.
 */
const FOCUS_RING_EDGE_RADIUS =
  FOCUS_RING_RADIUS + FOCUS_RING_WIDTH / 2 + FOCUS_RING_EDGE_WIDTH / 2;

/**
 * Where the anomaly ring sits, beyond the equity ink's own radius — the
 * MIDDLE of the 4 px annulus `The graph at rest.dc.html` §03 reserves,
 * clear of the halo just inside it and the footprint edge Story 6.4's focus
 * ring will own outside it (Task 6.3.2).
 *
 * `(TOPOLOGY_NODE_FOOTPRINT − TOPOLOGY_NODE_INK.equity) / 2` is the whole
 * annulus (4); this is half of that, so the ring's own stroke — up to
 * {@link ANOMALY_RING_WIDTH}'s widest, 3 px — has room on both sides without
 * reaching either edge. **Provisional pending `pnpm probe`**, same discipline
 * `TOPOLOGY_SECTOR_LABEL_MIN_SCALE` was derived with, not argued from here.
 */
const ANOMALY_RING_OFFSET =
  (TOPOLOGY_NODE_FOOTPRINT - TOPOLOGY_NODE_INK.equity) / 2 / 2;

/**
 * The ring's own stroke width, in CSS pixels, **constant under zoom** — the
 * edge/halo/label rule (`renderer.ts` §09's table) extended to the fourth
 * treatment. Growing rather than a fixed weight: Decision 1's own wording is
 * "growing in weight for `elevated`/`high`", so the order survives in
 * greyscale on weight alone, with `extreme` the widest and the only one that
 * also changes the node's own fill.
 */
const ANOMALY_RING_WIDTH = {
  elevated: 1,
  high: 2,
  extreme: 3,
} as const;

/**
 * The `unscored` node's own outline width, in CSS pixels — thinner than
 * every ring, because this is the node's whole body rather than a band
 * layered on top of one, and the design work's claim is an absence rather
 * than a measurement: nothing to grow.
 */
const ANOMALY_UNSCORED_STROKE_WIDTH = 1;

/**
 * **No fit-scale suppression for `elevated`, measured rather than assumed
 * (Task 6.3.2).** The Work item this ring was built against anticipated a
 * "4 px node" state at low fit scale, parallel to
 * {@link TOPOLOGY_SECTOR_LABEL_MIN_SCALE}'s own — and that state is not
 * reachable. Node ink is `TOPOLOGY_NODE_INK[kind] * nodeScale`, where
 * `nodeScale` answers the explicit USER zoom (`clampNodeScale(view.zoom)`,
 * clamped to [0.5, 1.5]) and never the container's own fit scale — so an
 * equity is 8 px (4–12 px across the zoom range) at every content box this
 * layout is fitted into, identically at 1440 and at 390. Checked with
 * `pnpm probe` against the real content box at 390×780 (fit scale 0.1639,
 * the narrowest this screen reaches) and against the single most crowded
 * real cluster, `TECHNOLOGY` at 768×800: both show heavy node OVERLAP, but
 * it is **pre-existing node-density crowding**, present identically in
 * Story 6.2's own shipped treatment with no ring at all — a control probed
 * the same crop with no `bands` passed, and the overlap pattern is
 * byte-for-byte the same clusters. A ring sitting on an already-crowded
 * node is no more illegible than the node was before it had one. So this
 * task adds no threshold: the condition the Work item was written to guard
 * against does not occur under the shipped renderer's own zoom model.
 */

/**
 * **Decision 8 (Task 6.2.2): below this effective scale, no sector label
 * draws at all.** `packages/shared/src/topology-layout.test.ts`'s own
 * label-clearance proof shows the worst label/circle clearance is a pure
 * function of the fit scale alone (the geometry is fixed; only the
 * CSS-pixel-to-layout-unit conversion moves), and there is **no ring shape**
 * that clears `consumer_discretionary`'s 163 px label at every box this
 * layout might be fitted into — the required layout-unit room grows without
 * bound as the box narrows.
 *
 * **Re-derived against the real resolved boxes, not cited from the design
 * canvas's `~0.365`.** A binary search over the same formula
 * `topology-layout.test.ts` proves found the clearance crosses zero at
 * `scale ≈ 0.3727` (measured 2026-11-01, this story's fixture universe,
 * `communication_services` against `consumer_discretionary`'s circle). Of the
 * four real content boxes Task 6.2.1 measured on `/` (998×425, 570×425,
 * 686×425, 308×425 at 1440/1024/768/390), their fit scales are
 * **0.4604, 0.3033, 0.3650, 0.1639** — so only **1440** clears this
 * threshold; the other three never draw a sector label at all, regardless of
 * the geometric collision computed for them.
 *
 * `0.38` rather than the bare crossover: a small margin against font-metric
 * variance across engines, chosen so it still excludes 768's 0.3650 (which
 * sits 0.0077 below the bare crossover and would otherwise be a coin flip).
 */
const TOPOLOGY_SECTOR_LABEL_MIN_SCALE = 0.38;

/** One node, with its placement resolved. Built once at mount. */
interface DrawableNode {
  readonly node: TopologyNode;
  readonly x: number;
  readonly y: number;
  readonly ink: number;
}

/** One edge, as two points and the clearance each end wants. */
interface DrawableEdge {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly fromInk: number;
  readonly toInk: number;
}

/** A label drawn at a world point. */
interface DrawableLabel {
  readonly text: string;
  /**
   * Whether this is one of the eleven sector names — the only labels
   * {@link TOPOLOGY_SECTOR_LABEL_MIN_SCALE} gates. A ticker and the
   * `MARKET PROXIES` heading draw at every scale: they sit in the column,
   * clear of every cluster circle by construction, so they have no collision
   * to gate against.
   */
  readonly sector: boolean;
  readonly x: number;
  readonly y: number;
  readonly mono: boolean;
}

/**
 * Mount Candidate B.
 *
 * Everything that does not change between frames — placements resolved against
 * nodes, edges resolved against placements, the fifteen labels and their world
 * points — is computed **once, here**. A frame then walks three flat arrays and
 * issues eight draw calls. That split is the whole of why the per-frame figure
 * is what it is, and it is worth stating because the obvious implementation
 * (resolve a `Map` lookup per edge per frame) costs 1,024 lookups a frame for
 * no visible difference.
 */
export const mountCanvasTopology: TopologyRendererFactory = (
  container: HTMLElement,
  options: TopologyRendererOptions,
): TopologyRenderer => {
  const {
    graph,
    layout,
    palette,
    probe,
    labelledBy,
    describedBy,
    onHover,
    onSelect,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  // **A text equivalent, not a second string** (Task 6.2.4). `role="img"`
  // plus `aria-labelledby` points a screen reader at the sentence
  // `MarketTopology.tsx` already renders as a visually-hidden sibling, rather
  // than duplicating it here as `aria-label` — one fact, one home, same rule
  // `Movers`' slot and the proxy column's heading already follow.
  if (labelledBy !== undefined) {
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-labelledby", labelledBy);
  }
  // **One additional tab stop, and the arrow keys are what it is for** (Task
  // 6.4.3). ADR 0039 makes the region a tab stop unconditionally; this is the
  // stop *inside* it, and `ChartReading.tsx`'s shape exactly — `role="img"`
  // (already above), `tabIndex`, and a description a key press can reach.
  //
  // **516 stops is the alternative this refuses**, which is the chart's own
  // arithmetic one surface over: one stop and arrow keys that drive it, rather
  // than one stop per mark.
  canvas.tabIndex = 0;
  if (describedBy !== undefined) {
    canvas.setAttribute("aria-describedby", describedBy);
  }
  // **The global `:focus-visible` outline is removed here because it is
  // invisible, not because it is unwanted.** `MarketTopology.module.css`'s
  // `.frame` is `inset: 0` with `overflow: hidden` and this canvas fills its
  // padding box, so a 2 px outline drawn at `--focus-offset`'s own 2 px
  // *outside* that box is clipped on all four edges — the browser draws it and
  // the frame hides it, which is a focus indicator that is a claim rather than
  // a mechanism. What replaces it is the ring this renderer draws around the
  // focused node, which is where a reader is actually looking: the canvas is
  // 998 px wide and the thing with focus inside it is 8 px across.
  canvas.style.outline = "none";
  // **`pan-y`, not `none`** (Task 6.2.3). This renderer was built for an
  // isolated Storybook iframe with nothing to scroll past, where `none` cost
  // nothing; moved onto `/` unmodified it would make the page's primary
  // content area a scroll trap — a reader whose pointer lands on the graph
  // while scrolling the page stops being able to. `pan-y` lets the browser's
  // own vertical-scroll gesture through; a deliberate drag still works, via
  // this renderer's own `pointerdown`/`pointermove` handling below, because
  // `touch-action` only constrains the browser's NATIVE gesture recognition
  // and has no opinion on synthetic pointer events a script already captures.
  canvas.style.touchAction = "pan-y";
  // **`prepend`, not `append`, and it is the TAB ORDER rather than the
  // painting** (Task 6.4.3). The readout plate is `position: absolute`, so it
  // paints over this canvas whichever side of it sits in the DOM — but the
  // plate holds the one anchor a reader activates, and appended last the canvas
  // came *after* that anchor in sequential focus order. A reader walking the
  // graph and then pressing Tab landed back on the canvas they had just left.
  // The graph before its own readout is the order the region reads in.
  container.prepend(canvas);

  const context = canvas.getContext("2d");

  if (context === null) {
    // **Throw rather than draw nothing.** A null 2d context is a browser that
    // cannot do this at all, and a renderer that silently mounts an empty
    // canvas is the invisible failure every note in this module is about.
    throw new Error(
      "Canvas2D is unavailable in this document, so the topology cannot be drawn.",
    );
  }

  const placements = new Map<Ticker, TopologyPlacement>(
    layout.placements.map((placement) => [placement.symbol, placement]),
  );

  const nodesByKind = new Map<keyof typeof TOPOLOGY_NODE_INK, DrawableNode[]>([
    ["equity", []],
    ["sector_etf", []],
    ["index_etf", []],
  ]);

  for (const node of graph.nodes) {
    const placement = placements.get(node.symbol);
    if (placement === undefined) continue;

    nodesByKind.get(node.kind)?.push({
      node,
      x: placement.x,
      y: placement.y,
      ink: TOPOLOGY_NODE_INK[node.kind],
    });
  }

  /**
   * Every node, in one flat array, for the hit test (Task 6.4.1).
   *
   * Built **once at mount** beside the three draw groups rather than flattened
   * per pointer move: a pointer move is the one event on this canvas that can
   * arrive at frame cadence, and three `Map` reads plus an allocation per move
   * is work this closure can simply not do. `DrawableNode` already is a
   * `TopologyHitCandidate` structurally — node, x, y in layout units — so this
   * is a second view of the same objects and not a second copy of them.
   */
  const hitCandidates: DrawableNode[] = [...nodesByKind.values()].flat();

  /**
   * The same nodes, by symbol — what the keyboard walk's **answer** is
   * resolved through (Task 6.4.3).
   *
   * `walk.ts` is pure and returns a `Ticker`, because a symbol is the only
   * identity a walk can be keyed on that survives a fresh universe. The
   * drawable it names is this lookup, built once beside the hit array for its
   * reason: an arrow key is not a cadence, but a `Map` built here costs
   * nothing and a scan per keystroke would be the second place this closure
   * walks 516 nodes to answer a question it already has an index for.
   */
  const drawableBySymbol = new Map<Ticker, DrawableNode>(
    hitCandidates.map((drawable) => [drawable.node.symbol, drawable]),
  );

  // --- Anomaly treatments, regrouped on every `setBands` call ------------
  //
  // **Scoped to equities, by construction** (Gate 1 Decision 3): this reads
  // only `nodesByKind.get("equity")`, so a sector SPDR, a market proxy or
  // the hub keyed in `bands` is silently ignored rather than drawn hollow or
  // ringed — the fifteen landmarks are outside the encoding entirely, not a
  // fifth case inside it.
  //
  // **Regrouped on `setBands`, not every frame.** A pan or a zoom redraws
  // through `invalidate()` without a new band map arriving, and re-walking
  // 501 equities on every one of those would be work this closure can avoid
  // simply by doing it once per actual change instead.
  //
  // `bodyDefault` carries `normal` **and** `elevated` **and** `high`: all
  // three share the exact same body (halo + `--chart-volume` fill) because
  // only `extreme` touches the node's own fill (Decision 1) — so this is one
  // path and one fill call for three of the five states, not three.
  let bands: ReadonlyMap<Ticker, TopologyAnomalyTreatment> = new Map();
  let bodyDefault: DrawableNode[] = [];
  let bodyExtreme: DrawableNode[] = [];
  let bodyUnscored: DrawableNode[] = [];
  let ringElevated: DrawableNode[] = [];
  let ringHigh: DrawableNode[] = [];
  let ringExtreme: DrawableNode[] = [];

  const regroupAnomalyTreatments = (): void => {
    bodyDefault = [];
    bodyExtreme = [];
    bodyUnscored = [];
    ringElevated = [];
    ringHigh = [];
    ringExtreme = [];

    for (const drawable of nodesByKind.get("equity") ?? []) {
      const treatment: TopologyAnomalyTreatment =
        bands.get(drawable.node.symbol) ?? "normal";

      if (treatment === "unscored") {
        bodyUnscored.push(drawable);
        continue;
      }

      if (treatment === "extreme") {
        bodyExtreme.push(drawable);
        ringExtreme.push(drawable);
        continue;
      }

      bodyDefault.push(drawable);
      if (treatment === "elevated") ringElevated.push(drawable);
      else if (treatment === "high") ringHigh.push(drawable);
      // "normal" draws in bodyDefault alone — no ring.
    }
  };

  regroupAnomalyTreatments();

  const inkOf = new Map<Ticker, number>(
    graph.nodes.map((node) => [node.symbol, TOPOLOGY_NODE_INK[node.kind]]),
  );

  const membership: DrawableEdge[] = [];
  const hub: DrawableEdge[] = [];

  for (const edge of graph.edges) {
    const from = placements.get(edge.from);
    const to = placements.get(edge.to);
    if (from === undefined || to === undefined) continue;

    const drawable: DrawableEdge = {
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      fromInk: inkOf.get(edge.from) ?? TOPOLOGY_NODE_INK.equity,
      toInk: inkOf.get(edge.to) ?? TOPOLOGY_NODE_INK.equity,
    };

    if (edge.kind === "sector_membership") membership.push(drawable);
    else hub.push(drawable);
  }

  // The fifteen labels, and the one group heading. Sector names sit above each
  // cluster's own bounding circle — whose radius is DERIVED from the member
  // count, so a curation change moves the label with the cluster rather than
  // leaving it where a checked-in table put it.
  const labels: DrawableLabel[] = [];

  for (const cluster of graph.clusters) {
    const benchmark = SECTOR_ETFS[cluster.id];
    const centre = placements.get(benchmark);
    if (centre === undefined) continue;

    labels.push({
      text: cluster.label.toUpperCase(),
      sector: true,
      x: centre.x,
      y: centre.y - topologyClusterRadius(cluster.members.length),
      mono: false,
    });
  }

  // **The four market proxies carry a ticker, and the eleven sector SPDRs do
  // NOT** — which is the design work's count read literally: *eleven sector
  // names, four proxy tickers, and 501 deliberate silences.* A sector's
  // benchmark sits on its cluster's centroid, and the cluster is already
  // labelled above it; drawing `XLE` on top of 21 discs that have just been
  // labelled `ENERGY` is a second word for one thing, inside the mark.
  //
  // Found by LOOKING at the first build rather than by any check: the first
  // draft labelled every non-equity node and printed eleven tickers into the
  // middle of eleven clusters.
  //
  // `--font-data` and mixed case: a ticker is already upper case, and the micro
  // label's 0.08em tracking is wrong on a monospaced face. **No equity is
  // labelled at rest** — 501 tickers at ~26 px each do not fit without a 5x
  // frame or a non-deterministic collision pass, which acceptance criterion 3
  // refuses.
  const proxies: TopologyPlacement[] = [];

  for (const node of graph.nodes) {
    if (node.kind !== "index_etf") continue;

    const placement = placements.get(node.symbol);
    if (placement === undefined) continue;

    proxies.push(placement);
    labels.push({
      text: node.symbol,
      sector: false,
      x: placement.x + TOPOLOGY_NODE_INK[node.kind],
      y: placement.y,
      mono: true,
    });
  }

  // **One `MARKET PROXIES` heading over the column**, so the three undecomposed
  // benchmarks read as *benchmarks we have not decomposed* rather than as three
  // broken nodes. `SPY` is excluded **by symbol rather than by an `x` threshold
  // against the ring** (Task 6.2.2, when the ring stopped being a single
  // radius) — it is at the origin with eleven edges on it, not in the column —
  // and the heading is placed over the column's own topmost member rather than
  // at a fixed point, so it follows them if the layout re-sites the column.
  const column = proxies.filter((proxy) => proxy.symbol !== TOPOLOGY_HUB);

  // **Destructured rather than `column[0]?.x ?? 0`**, which
  // `no-imputed-zero-in-a-figure` caught on the first run of `pnpm invariants`
  // over this file — correctly. A column that is empty is not a column at the
  // origin, and the heading for one would have been drawn in the middle of the
  // market with nothing anywhere saying why.
  const [head] = column;

  if (head !== undefined) {
    labels.push({
      text: "MARKET PROXIES",
      sector: false,
      x: head.x,
      y: Math.min(...column.map((proxy) => proxy.y)) - TOPOLOGY_NODE_FOOTPRINT,
      mono: false,
    });
  }

  let view: TopologyView = fitView(layout, { width: 0, height: 0 });
  let frames = 0;
  let pending: number | null = null;
  let dragging: number | null = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let cursor = "";

  /**
   * **Where the pointer last was, in client coordinates — kept independent
   * of `dragging`** (Task 6.4.1). `lastPointerX`/`lastPointerY` above are a
   * drag's own delta tracking and are not updated by an ordinary hover move;
   * this pair is, and `NaN` means "not currently over the canvas" (set by
   * {@link onPointerLeave}). It exists so a view that changes **without** a
   * pointer event of its own — a `ctrl`/`⌘`-wheel zoom, or a resize — can
   * still ask what is now under a pointer that has not itself moved.
   */
  let lastHoverClientX = Number.NaN;
  let lastHoverClientY = Number.NaN;

  /**
   * **The node under the pointer, held HERE and nowhere else** (Task 6.4.1,
   * this task's own constraint).
   *
   * A `let` in the mount closure, beside `bands` and `dragging`, for the
   * reason those two are here: hover changes at pointer-move cadence, and
   * `MarketTopology`'s declined `React.memo` boundary is closed by
   * construction only while nothing in this region re-renders at that cadence.
   * A `useState` here would re-render the landing page's primary content area
   * on every pixel of pointer travel, which is the one shape that region's own
   * reversal trigger was written to catch — and it would be a second home for
   * a fact the renderer has to know anyway, because it draws the ground disc.
   */
  let hovered: DrawableNode | null = null;

  /**
   * **The node a reader has committed to** (Task 6.4.2) — a third state,
   * distinct from {@link hovered} in every way that matters.
   *
   * It **persists**: the pointer leaving the node does not clear it, a pan does
   * not clear it, and `reset()` does not clear it. It is cleared by a click on
   * empty canvas (and, from Task 6.4.3, by `Escape`). It is what the dark
   * ground disc draws under and what the readout plate's **one anchor**
   * resolves its `href` from.
   *
   * A `let` here beside `hovered` rather than only in React, even though the
   * selected symbol genuinely does reach React state: the renderer has to know
   * it anyway, because it draws the ground. React holds the **symbol**, for the
   * one thing only React can do — render an `<a>` — and this holds the drawable
   * node, which is what a draw call needs. That is one fact in the renderer and
   * a projection of it in React, not two homes for one fact: the projection is
   * written only by {@link setSelectedNode} and is never read back here.
   */
  let selected: DrawableNode | null = null;

  /**
   * The press in progress, for {@link onPointerUp} to decide whether it was a
   * click or a pan (Task 6.4.2).
   *
   * `downPointer` is kept **separately from `dragging`** rather than folded
   * into it, because the two answer different questions and are cleared at
   * different times: `dragging` is *this pointer is panning the view*, and this
   * is *this pointer's press has not yet been classified*. `pointercancel`
   * clears this one without classifying anything, which is this task's own
   * requirement — a cancelled press selects nothing.
   */
  let downPointer: number | null = null;
  let downX = 0;
  let downY = 0;
  let downAt = 0;

  /**
   * What a node currently IS, as the caller is told it — the node together
   * with what it is **drawn** as.
   *
   * **Read by both `onHover` and `onSelect`** (Task 6.4.2), which is why it is
   * named for neither.
   *
   * The treatment is read from `bands` rather than handed back by the caller,
   * which is what keeps the readout and the picture one fact: a caller holding
   * its own copy of the band map could render `elevated` beside a node drawn
   * `high` for as long as it takes one live batch to reach one and not the
   * other. `?? "normal"` is the renderer's own drawing default (`setBands`'s
   * contract — a symbol absent from the map draws `normal`), so this reports
   * the drawn state and never a nullish third thing.
   *
   * **`null` for the fifteen landmarks, by the same construction that excludes
   * them from the encoding**: `bands` is only ever consulted for an equity, so
   * a sector SPDR or a market proxy keyed in it cannot leak a band here any
   * more than it can leak one into the drawing.
   */
  const targetOf = (drawable: DrawableNode): TopologyHoverTarget => ({
    node: drawable.node,
    treatment:
      drawable.node.kind === "equity"
        ? (bands.get(drawable.node.symbol) ?? "normal")
        : null,
  });

  /**
   * Set `hovered`, and tell the caller — **only when it actually changed**.
   *
   * Compared by the `DrawableNode`'s own identity, which is stable for the
   * renderer's whole lifetime (built once at mount), so this is an identity
   * test rather than a symbol comparison that would need a null branch.
   */
  const setHovered = (next: DrawableNode | null): void => {
    if (next === hovered) return;

    hovered = next;

    const wanted = next === null ? "grab" : "pointer";
    if (wanted !== cursor) {
      cursor = wanted;
      canvas.style.cursor = wanted;
    }

    onHover?.(next === null ? null : targetOf(next));
    invalidate();
  };

  /**
   * Set {@link selected}, and tell the caller — **only when it actually
   * changed** (Task 6.4.2), compared by the `DrawableNode`'s own identity for
   * {@link setHovered}'s reason.
   *
   * Clicking a different node **moves** the selection rather than adding to it:
   * there is one `selected` and this assigns it, so the additive case is
   * unrepresentable rather than guarded against. `null` — a click that
   * hit-tested to nothing — clears it.
   */
  const setSelectedNode = (
    next: DrawableNode | null,
    source: TopologySelectionSource,
  ): void => {
    if (next === selected) return;

    selected = next;

    onSelect?.(next === null ? null : targetOf(next), source);
    invalidate();
  };

  /**
   * **What a keyboard press does, and it is the ONE selection mechanism**
   * (Task 6.4.3) — the next node from `walk.ts`, handed to
   * {@link setSelectedNode}, which is the same function a click calls.
   *
   * There is no keyboard selection state anywhere: `selected` above is the
   * only home, so a reader who clicks a node and then presses `ArrowRight`
   * moves from the node they clicked, with nothing to reconcile.
   *
   * **The listener is on the CONTAINER rather than on the canvas**, which is
   * what lets one `switch` serve both focusable things in this region. Once
   * something is selected, DOM focus is on the readout plate's anchor (so that
   * `Enter` is the browser's own native activation of a real `<a href>` and
   * this product's `one-home-for-imperative-navigation` invariant is satisfied
   * by construction rather than by a rule) — and the plate is a child of the
   * same container, so an arrow key pressed there bubbles to exactly one
   * handler.
   *
   * **`Enter` is deliberately absent from the switch.** It is not ours: it
   * belongs to whatever has focus, which after any keyboard walk is the
   * anchor. Swallowing it to re-implement activation is the imperative
   * navigation this whole shape exists to avoid.
   *
   * **`preventDefault()` only on a key actually handled**, which is
   * `ChartReading.tsx`'s `default: return` arm and the reason it is written
   * that way: `Tab`, `Home`/`End` with nothing selected, the browser's own
   * find-in-page, and every printable character must reach the page untouched.
   * `ArrowDown` on this canvas would otherwise scroll the landing page while a
   * reader walked the graph.
   */
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Escape") {
      // **Nothing to clear is not ours to swallow.** An `Escape` over a graph
      // with no selection belongs to whatever is above this region, and
      // `ChartReading.tsx` records the same guard for the same reason.
      if (selected === null) return;

      event.preventDefault();
      // **Focus first, then clear.** Clearing unmounts the anchor React
      // rendered for the selection, and an element removed while it holds
      // focus drops focus to the body. Moving focus back to the canvas keeps
      // `Escape` inside the region, which is Task 6.4.3's own Done-when 1.
      //
      // ~~which is the state `Region`'s own backstop catches by focusing its
      // `<section>`, one level further out than a reader asked to go~~ —
      // **FALSE, measured 2026-11-06 by Task 6.4.4 and corrected here.**
      // `Region`'s backstop is a layout effect on `Region`, and the anchor's
      // removal happens in a commit driven by `MarketTopology`'s own state,
      // which re-renders that subtree alone — so the effect never runs again
      // and focus stays on `<body>`. The sentence was a claim about a
      // mechanism, true-looking either way, and it was load-bearing: it is
      // why nothing covered the OTHER gesture that removes this anchor (the
      // pointer crossing a different node). `MarketTopology`'s `[openable]`
      // effect now carries the recovery for both; this call is still the
      // right one to make here, because focusing before clearing means the
      // recovery has nothing to do.
      canvas.focus();
      setSelectedNode(null, "keyboard");
      return;
    }

    if (!isTopologyWalkKey(event.key)) return;

    const next = topologyWalk(
      graph,
      layout,
      selected?.node.symbol ?? null,
      event.key,
    );

    // Handled either way: a clamped end answers `null` and the page must not
    // scroll because the reader reached one.
    event.preventDefault();

    if (next === null) return;

    const drawable = drawableBySymbol.get(next);
    if (drawable !== undefined) setSelectedNode(drawable, "keyboard");
  };

  /**
   * Whether DOM focus is anywhere inside this region — **what the focus ring
   * is drawn on** (Task 6.4.3).
   *
   * `focusin`/`focusout` on the container rather than on the canvas, because
   * focus legitimately sits on either the canvas or the plate's anchor while a
   * reader is walking the graph, and a ring that vanished the moment the
   * selection moved focus to the anchor would be a ring nobody ever sees.
   * `focusout`'s `relatedTarget` is where focus went: inside this container
   * is still ours.
   */
  let focusWithin = false;

  const onFocusIn = (): void => {
    if (focusWithin) return;
    focusWithin = true;
    invalidate();
  };

  const onFocusOut = (event: FocusEvent): void => {
    const to = event.relatedTarget;
    if (to instanceof Node && container.contains(to)) return;

    focusWithin = false;
    invalidate();
  };

  const draw = (): void => {
    pending = null;
    frames += 1;
    probe?.();

    const ratio = globalThis.devicePixelRatio;
    const { width, height } = view.viewport;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    if (width <= 0 || height <= 0) return;

    const nodeScale = clampNodeScale(view.zoom);

    // --- The hovered node's ground disc, under everything ------------------
    //
    // One `fill()` for one node — there is never more than one hovered node,
    // so this is not a batched group and does not want to be. Drawn FIRST so
    // the edges, the body, the halo and the anomaly ring all paint over it;
    // see {@link HOVER_GROUND_RADIUS} for why it is wider than the footprint.
    if (hovered !== null) {
      const at = worldToScreen(view, hovered.x, hovered.y);
      context.fillStyle = palette.hoverGround;
      context.beginPath();
      context.moveTo(at.x + HOVER_GROUND_RADIUS * nodeScale, at.y);
      context.arc(at.x, at.y, HOVER_GROUND_RADIUS * nodeScale, 0, Math.PI * 2);
      context.fill();
    }

    // --- The selected node's ground disc, over hover and under all else ----
    //
    // **After the hover disc and before everything else** (Task 6.4.2), which
    // is one decision rather than two:
    //
    //   * *after hover* because when the selected node IS the hovered one the
    //     two discs are the same circle, and the light hover wash painted on
    //     top of the dark selection ground would read as the selection having
    //     been lost by pointing at it. Selection is the stronger, persisting
    //     state, so it wins the overlap. The consequence is deliberate and
    //     worth stating: hovering the node you have already selected changes
    //     no disc — what answers the pointer there is the cursor and the
    //     readout's own words;
    //   * *before everything else* because the edges, the body, the halo and
    //     the anomaly ring all paint over it. Selection adds a ground; it
    //     re-encodes nothing Story 6.3 draws, which is what keeps the band
    //     readable on a selected node (measured: contrast only improves).
    //
    // **It carries the SAME 1 px `halo` stroke every node's own body does,
    // found on review rather than before this task shipped.**
    // `palette.selectionGround` (`--surface-inverse`) is byte-identical to
    // `palette.sectorEtf`/`palette.marketProxy` (both `--ink-primary`) —
    // both `#181c23` — so selecting one of the fifteen landmark nodes (the
    // eleven sector SPDRs, the four proxies, the hub) painted a dark disc
    // under a dark body and the node vanished into its own ground,
    // photographed and confirmed before this line existed. An equity's own
    // paler fill never collided, which is why the first pass missed it
    // entirely. The halo is this renderer's existing answer to exactly this
    // shape of problem — "separate a filled mark from a touching one" — and
    // a disc stroked in it stays legible against any node's fill, landmark
    // included, without a second token.
    if (selected !== null) {
      const at = worldToScreen(view, selected.x, selected.y);
      context.beginPath();
      context.moveTo(at.x + SELECTION_GROUND_RADIUS * nodeScale, at.y);
      context.arc(
        at.x,
        at.y,
        SELECTION_GROUND_RADIUS * nodeScale,
        0,
        Math.PI * 2,
      );
      context.fillStyle = palette.selectionGround;
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = palette.halo;
      context.stroke();
    }

    // --- The two edge kinds, one batched path each -------------------------
    //
    // Width, like the halo and the label, is CONSTANT at every zoom — the
    // design work's rule, and the reason is the picture rather than the cost: a
    // scaling edge at zoom 3 is a 3 px rope and 501 of them are a web.
    context.lineWidth = 1;

    for (const [edges, colour] of [
      [membership, palette.membershipEdge],
      [hub, palette.hubEdge],
    ] as const) {
      context.beginPath();
      context.strokeStyle = colour;

      for (const edge of edges) {
        const from = worldToScreen(view, edge.fromX, edge.fromY);
        const to = worldToScreen(view, edge.toX, edge.toY);

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);

        const head = (edge.fromInk * nodeScale) / 2 + EDGE_END_CLEARANCE;
        const tail = (edge.toInk * nodeScale) / 2 + EDGE_END_CLEARANCE;

        // A segment shorter than the two clearances is **not drawn at all**
        // rather than drawn backwards, which is what a naive shortening does
        // when two nodes are nearly coincident — and at low zoom every cluster
        // is nearly coincident.
        if (length <= head + tail) continue;

        const ux = dx / length;
        const uy = dy / length;

        context.moveTo(from.x + ux * head, from.y + uy * head);
        context.lineTo(to.x - ux * tail, to.y - uy * tail);
      }

      context.stroke();
    }

    // --- The four body groups, one halo stroke and one fill each ----------
    //
    // Equity splits into two by anomaly treatment (Task 6.3.2): `bodyDefault`
    // is `normal` **and** `elevated` **and** `high` — today's exact look,
    // pixel-identical to Story 6.2's shipped node, which is Decision 1's own
    // claim that only `extreme` touches the body. `bodyExtreme` is that one
    // band, drawn in its own colour. Both are circles; sector SPDRs and
    // market proxies are unchanged from Story 6.2.
    context.lineWidth = 2;
    context.strokeStyle = palette.halo;

    for (const [shape, drawables, colour] of [
      ["circle", bodyDefault, palette.equity],
      ["circle", bodyExtreme, palette.anomalyExtreme],
      ["rect", nodesByKind.get("sector_etf") ?? [], palette.sectorEtf],
      ["diamond", nodesByKind.get("index_etf") ?? [], palette.marketProxy],
    ] as const) {
      if (drawables.length === 0) continue;

      context.beginPath();

      for (const drawable of drawables) {
        const at = worldToScreen(view, drawable.x, drawable.y);
        const half = (drawable.ink * nodeScale) / 2;

        if (shape === "circle") {
          context.moveTo(at.x + half, at.y);
          context.arc(at.x, at.y, half, 0, Math.PI * 2);
        } else if (shape === "rect") {
          context.rect(at.x - half, at.y - half, half * 2, half * 2);
        } else {
          context.moveTo(at.x, at.y - half);
          context.lineTo(at.x + half, at.y);
          context.lineTo(at.x, at.y + half);
          context.lineTo(at.x - half, at.y);
          context.closePath();
        }
      }

      // Halo first, ink second: the stroke straddles the path, so a 2 px stroke
      // under an opaque fill leaves exactly 1 px of `--surface-raised` outside
      // the mark. One pass, not two.
      context.stroke();
      context.fillStyle = colour;
      context.fill();
    }

    // --- The `unscored` equity — hollow, an outline rather than a fill ----
    //
    // No halo: a halo exists to separate a filled mark from a touching
    // neighbour, and this mark has no fill to separate. One thin achromatic
    // stroke is the whole treatment — "we don't know", never "calm" (AC 4).
    if (bodyUnscored.length > 0) {
      context.lineWidth = ANOMALY_UNSCORED_STROKE_WIDTH;
      context.strokeStyle = palette.anomalyUnscored;
      context.beginPath();

      for (const drawable of bodyUnscored) {
        const at = worldToScreen(view, drawable.x, drawable.y);
        const half = (drawable.ink * nodeScale) / 2;
        context.moveTo(at.x + half, at.y);
        context.arc(at.x, at.y, half, 0, Math.PI * 2);
      }

      context.stroke();
    }

    // --- The anomaly ring, in the reserved annulus -------------------------
    //
    // Drawn OUTSIDE the body and its halo, never replacing either —
    // `elevated`/`high`/`extreme` equities keep their ordinary body (or, for
    // `extreme`, the recoloured one above) and gain this ring besides.
    // Stroke width is the order's only channel once hue is gone in greyscale
    // (Decision 2); the radius scales with the node's own `nodeScale` so the
    // ring tracks the footprint at every zoom, same as the ink it surrounds.
    for (const [drawables, colour, width] of [
      [ringElevated, palette.anomalyElevated, ANOMALY_RING_WIDTH.elevated],
      [ringHigh, palette.anomalyHigh, ANOMALY_RING_WIDTH.high],
      [ringExtreme, palette.anomalyExtreme, ANOMALY_RING_WIDTH.extreme],
    ] as const) {
      if (drawables.length === 0) continue;

      context.lineWidth = width;
      context.strokeStyle = colour;
      context.beginPath();

      for (const drawable of drawables) {
        const at = worldToScreen(view, drawable.x, drawable.y);
        const radius =
          (drawable.ink * nodeScale) / 2 + ANOMALY_RING_OFFSET * nodeScale;
        context.moveTo(at.x + radius, at.y);
        context.arc(at.x, at.y, radius, 0, Math.PI * 2);
      }

      context.stroke();
    }

    // --- The labels, at a constant size -----------------------------------
    //
    // **Decision 8 (Task 6.2.2): below `TOPOLOGY_SECTOR_LABEL_MIN_SCALE`, a
    // sector name does not draw at all**, because no ring shape clears the
    // longest one (`CONSUMER DISCRETIONARY`, 163 px) at every box this layout
    // is fitted into. `view.scale * view.zoom` rather than `view.scale`
    // alone, so a reader who zooms in on a cramped box earns the label back
    // rather than it staying suppressed at the fit this component started at.
    context.fillStyle = palette.label;
    const effectiveScale = view.scale * view.zoom;

    for (const label of labels) {
      if (label.sector && effectiveScale < TOPOLOGY_SECTOR_LABEL_MIN_SCALE)
        continue;

      const at = worldToScreen(view, label.x, label.y);

      if (at.x < -200 || at.x > width + 200 || at.y < -40 || at.y > height + 40)
        continue;

      context.font = `${String(palette.labelSizePx)}px ${label.mono ? palette.dataFamily : palette.labelFamily}`;
      context.letterSpacing = label.mono
        ? "0em"
        : `${String(palette.labelTrackingEm)}em`;

      // A ticker sits BESIDE its node and a sector name sits ABOVE its cluster.
      // The first is a three-node column `--space-32` apart in layout units, so
      // a label below a node lands on the next one — which the first build drew
      // and `pnpm probe` would have caught at any width.
      if (label.mono) {
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillText(label.text, at.x + LABEL_GAP / 2, at.y);
      } else {
        context.textAlign = "center";
        context.textBaseline = "alphabetic";
        context.fillText(label.text, at.x, at.y - LABEL_GAP);
      }
    }

    // --- The focus ring, over everything -----------------------------------
    //
    // **Last in the frame, which is the opposite of the two ground discs and
    // for the same reason** (Task 6.4.3): a disc is announcing the node, so
    // every later pass has to paint over it; this is announcing **where the
    // keyboard is**, and a reader who cannot find it has no other way of
    // knowing. Drawn last it cannot be overpainted by a neighbour's body, by a
    // membership edge crossing the node, or by the selection disc's own halo
    // stroke — in a cluster at low fit scale all three are possible, and
    // Story 6.4.2's measurement of the ground disc being *largely overpainted
    // by its own neighbours* is the evidence that it would happen.
    //
    // **One ring position, because the focused node IS the selected node** —
    // and **two tones at that position**, which is the defect this story's own
    // closing review re-confirmed at 1.01:1: drawn last protects this ring
    // from being overpainted, and protects it from nothing at all about what
    // is painted UNDER it, which in a dense cluster is a neighbour's
    // near-white halo rather than the dark disc the light ink was measured
    // against. `palette.focusRingEdge` carries the table;
    // {@link FOCUS_RING_EDGE_RADIUS} carries the geometry and why the dark
    // tone goes outward rather than inward.
    //
    // **The dark stroke first and the light one second**, so where they meet
    // the light ink — the mark itself — owns the shared half-pixel of
    // antialiasing rather than being eaten by its own edge.
    //
    // `focusWithin` rather than a `:focus-visible` read: focus genuinely sits
    // on either the canvas or the plate's anchor while a reader walks, and a
    // heuristic that got that wrong would fail by drawing nothing, which is
    // the one direction nobody can see.
    if (focusWithin && selected !== null) {
      const at = worldToScreen(view, selected.x, selected.y);
      const radius = FOCUS_RING_RADIUS * nodeScale;
      const edgeRadius = FOCUS_RING_EDGE_RADIUS * nodeScale;

      context.lineWidth = FOCUS_RING_EDGE_WIDTH;
      context.strokeStyle = palette.focusRingEdge;
      context.beginPath();
      context.moveTo(at.x + edgeRadius, at.y);
      context.arc(at.x, at.y, edgeRadius, 0, Math.PI * 2);
      context.stroke();

      context.lineWidth = FOCUS_RING_WIDTH;
      context.strokeStyle = palette.focusRing;
      context.beginPath();
      context.moveTo(at.x + radius, at.y);
      context.arc(at.x, at.y, radius, 0, Math.PI * 2);
      context.stroke();
    }
  };

  const invalidate = (): void => {
    pending ??= requestAnimationFrame(draw);
  };

  /**
   * The `DrawableNode` under a screen point, or `null`.
   *
   * **The geometry is `hit-test.ts`'s and the units are CSS pixels** (Task
   * 6.4.1). This function used to do the comparison itself, in **layout
   * units**, against a threshold of `8` — which is half the footprint in the
   * layout's own space and therefore a hit radius that shrank with the
   * container's fit scale while the drawn mark did not. At 390 that was
   * **1.311 px of target under an 8 px-wide mark**, measured; `hit-test.ts`'s
   * own docblock carries the table and the four probed fit scales.
   *
   * It returns the `DrawableNode` rather than the `TopologyNode` so `hovered`
   * can hold one identity: the hover state, the ground disc's own coordinates
   * and the reported target are then all the same object, and nothing has to
   * look a placement back up by symbol.
   */
  const nodeAt = (screenX: number, screenY: number): DrawableNode | null =>
    topologyNodeAt(view, hitCandidates, screenX, screenY);

  /**
   * Re-test `lastHoverClientX`/`Y` against the CURRENT view, for a view
   * change that has no pointer event of its own to carry fresh coordinates
   * — a resize (`measure`) or a `ctrl`/`⌘`-wheel zoom (`onWheel`).
   *
   * A no-op while the pointer is not known to be over the canvas at all
   * (`NaN`, set by {@link onPointerLeave}) — there is nothing to re-test.
   */
  const rehover = (): void => {
    if (Number.isNaN(lastHoverClientX)) return;

    const box = canvas.getBoundingClientRect();
    setHovered(nodeAt(lastHoverClientX - box.left, lastHoverClientY - box.top));
  };

  const measure = (): void => {
    const box = container.getBoundingClientRect();
    const ratio = globalThis.devicePixelRatio;

    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));

    view =
      view.viewport.width === 0
        ? fitView(layout, { width: box.width, height: box.height })
        : reviewport(view, layout, { width: box.width, height: box.height });

    invalidate();
    // **A resize moves the market under a stationary pointer too** (Task
    // 6.4.1) — the same reasoning `onPointerMove`'s drag branch already
    // acts on, arriving by a route with no pointer event to re-hit-test from.
    rehover();
  };

  /**
   * A press starts a **potential** pan and a **potential** click (Task 6.4.2).
   *
   * Which it turns out to have been is decided at `pointerup`, by
   * `isTopologyClick` over how far the pointer travelled and how long it was
   * down — never here, because a press carries no information about either yet.
   * The pan itself is unchanged and still begins on the first move: a press
   * that never moves pans by zero.
   */
  const onPointerDown = (event: PointerEvent): void => {
    dragging = event.pointerId;
    downPointer = event.pointerId;
    downX = event.clientX;
    downY = event.clientY;
    downAt = performance.now();
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    const box = canvas.getBoundingClientRect();
    // Tracked unconditionally, not only while dragging — see
    // `lastHoverClientX`'s own docblock.
    lastHoverClientX = event.clientX;
    lastHoverClientY = event.clientY;

    if (dragging === event.pointerId) {
      view = panBy(
        view,
        event.clientX - lastPointerX,
        event.clientY - lastPointerY,
      );
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      invalidate();
      // **The hit test runs during a drag too, against the NEW view.** A pan
      // moves the market under a stationary pointer, so the node under it
      // genuinely changes — leaving `hovered` where it was would leave the
      // readout naming a security that is no longer there, and clearing it
      // would blank the plate for the length of every drag.
      setHovered(nodeAt(event.clientX - box.left, event.clientY - box.top));
      return;
    }

    // Hit-testing runs on every move, as Sigma's picking buffer does, so the
    // two candidates are measured doing the same work. The cursor write and
    // the hover report are both guarded inside `setHovered`: an unconditional
    // style assignment is a layout invalidation per move, and an
    // unconditional `onHover` is a DOM write per move.
    setHovered(nodeAt(event.clientX - box.left, event.clientY - box.top));
  };

  /**
   * The pointer left the canvas — nothing is hovered (Task 6.4.1).
   *
   * Without this the plate keeps naming whatever the pointer passed over on
   * its way out, which reads as a selection this story does not have yet
   * (that is Task 6.4.2) rather than as a reading of where the pointer is.
   */
  const onPointerLeave = (): void => {
    lastHoverClientX = Number.NaN;
    lastHoverClientY = Number.NaN;
    setHovered(null);
  };

  /**
   * The press ends — and **this is where a click is told from a pan** (Task
   * 6.4.2).
   *
   * The hit test runs at the **up** position rather than at the down one. Over
   * a click they are within `TOPOLOGY_CLICK_MAX_TRAVEL_PX` of each other by
   * construction, and the up position is where the reader's hand finished, so
   * it is the honest one of the two.
   */
  const onPointerUp = (event: PointerEvent): void => {
    if (dragging !== event.pointerId) return;
    dragging = null;

    const wasClick =
      downPointer === event.pointerId &&
      isTopologyClick({
        travelPx: Math.hypot(event.clientX - downX, event.clientY - downY),
        elapsedMs: performance.now() - downAt,
      });

    downPointer = null;

    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);

    if (!wasClick) return;

    // **A click that hit-tests to nothing CLEARS the selection**, rather than
    // being ignored — clicking empty canvas is a mouse-only reader's way back,
    // and `Escape` (Task 6.4.3) is the keyboard's. `nodeAt` answering `null`
    // is that gesture, so no separate branch is needed for it.
    const box = canvas.getBoundingClientRect();
    setSelectedNode(
      nodeAt(event.clientX - box.left, event.clientY - box.top),
      "pointer",
    );
  };

  /**
   * The press was taken away from us — **classify nothing** (Task 6.4.2).
   *
   * `pointercancel` is the browser deciding the gesture belongs to it (a
   * native scroll claiming the touch, the window losing focus mid-press), and
   * a press that was cancelled is not a reader's click however short it was.
   * Clearing `downPointer` is what makes {@link onPointerUp}'s own first
   * conjunct refuse it, and this handler is split out from that one precisely
   * so the two cannot be confused: `pointercancel` was wired to `onPointerUp`
   * until this task, when ending a drag was all there was to do.
   */
  const onPointerCancel = (event: PointerEvent): void => {
    downPointer = null;
    if (dragging !== event.pointerId) return;
    dragging = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  };

  /**
   * **Zoom only on `ctrl`/`⌘` + wheel** (Task 6.2.3). An unmodified wheel
   * event is not `preventDefault()`ed at all, so the page scrolls through it
   * exactly as it would over any other content — this listener has nothing
   * to undo. `event.ctrlKey` rather than only `event.metaKey`, because
   * Chromium's trackpad pinch-to-zoom gesture arrives as a synthetic wheel
   * event with `ctrlKey: true` set, whatever the actual keyboard state is —
   * one check covers the deliberate keyboard-modifier case and the trackpad
   * gesture a reader never meant as a keypress.
   */
  const onWheel = (event: WheelEvent): void => {
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();
    const box = canvas.getBoundingClientRect();

    view = zoomAbout(
      view,
      ZOOM_PER_DELTA ** -event.deltaY,
      event.clientX - box.left,
      event.clientY - box.top,
    );
    invalidate();
    // **A zoom moves the market under a stationary pointer too** (Task
    // 6.4.1) — see `rehover`'s own docblock.
    rehover();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  // **On the container, not on the canvas** — see `onKeyDown`'s own docblock:
  // one handler serves both focusable things in this region, because the
  // plate's anchor is a child of the same element.
  container.addEventListener("keydown", onKeyDown);
  container.addEventListener("focusin", onFocusIn);
  container.addEventListener("focusout", onFocusOut);

  const observer = new ResizeObserver(measure);
  observer.observe(container);
  measure();

  return {
    kind: "canvas",
    resize: measure,
    reset: () => {
      view = fitView(layout, view.viewport);
      invalidate();
    },
    setBands: (treatments) => {
      bands = treatments;
      regroupAnomalyTreatments();
      // **The readout is told again, for the SAME node** (Task 6.4.1). A
      // reader holding the pointer still through a live batch is looking at a
      // band that has just been redrawn; a plate that kept the old word would
      // be a figure disagreeing with the picture two centimetres away. This is
      // the one call of `onHover` that is not a change of node.
      if (hovered !== null) onHover?.(targetOf(hovered));
      // **And the SELECTED node is told again too** (Task 6.4.2), for exactly
      // the same reason one line up. The plate shows the selection whenever
      // nothing is hovered — which is most of the time, since a selection
      // outlives the pointer — so a band that changed under a selected node
      // with the pointer elsewhere would leave the plate's word disagreeing
      // with the ring on screen, and nothing would ever correct it.
      if (selected !== null) onSelect?.(targetOf(selected), "band");
      invalidate();
    },
    // **The same call `Escape` makes, exposed** (Task 6.4.4) — see
    // `TopologyRenderer.focus`. Not a second mechanism: the keydown handler
    // above focuses this same element, in this same closure.
    focus: () => {
      canvas.focus();
    },
    framesDrawn: () => frames,
    destroy: () => {
      observer.disconnect();
      if (pending !== null) cancelAnimationFrame(pending);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("focusin", onFocusIn);
      container.removeEventListener("focusout", onFocusOut);
      canvas.remove();
    },
  };
};
