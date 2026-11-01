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

import {
  clampNodeScale,
  fitView,
  panBy,
  reviewport,
  screenToWorld,
  worldToScreen,
  zoomAbout,
} from "./fit.js";
import type { TopologyView } from "./fit.js";
import { TOPOLOGY_NODE_INK } from "./renderer.js";
import type {
  TopologyRenderer,
  TopologyRendererFactory,
  TopologyRendererOptions,
} from "./renderer.js";

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

/** Where a sector label sits above its cluster's bounding circle, in CSS pixels. */
const LABEL_GAP = 8;

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
  const { graph, layout, palette, probe, labelledBy } = options;

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
  container.append(canvas);

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

    // --- The three node kinds, one halo stroke and one fill each -----------
    context.lineWidth = 2;
    context.strokeStyle = palette.halo;

    for (const [kind, colour] of [
      ["equity", palette.equity],
      ["sector_etf", palette.sectorEtf],
      ["index_etf", palette.marketProxy],
    ] as const) {
      const drawables = nodesByKind.get(kind) ?? [];
      if (drawables.length === 0) continue;

      context.beginPath();

      for (const drawable of drawables) {
        const at = worldToScreen(view, drawable.x, drawable.y);
        const half = (drawable.ink * nodeScale) / 2;

        if (kind === "equity") {
          context.moveTo(at.x + half, at.y);
          context.arc(at.x, at.y, half, 0, Math.PI * 2);
        } else if (kind === "sector_etf") {
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
  };

  const invalidate = (): void => {
    pending ??= requestAnimationFrame(draw);
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
  };

  /**
   * The node under a screen point, or `null`.
   *
   * A linear scan over the layout's own coordinates — no quadtree, no spatial
   * index. 516 placements is ~5 µs, and a structure here would be
   * infrastructure built before the iteration that needs it. The threshold is
   * the **footprint** (16 layout units, half of it either side) rather than the
   * ink, so the 4 units Story 6.3's band and Story 6.4's ring have reserved are
   * already targetable.
   */
  const nodeAt = (screenX: number, screenY: number): TopologyNode | null => {
    const at = screenToWorld(view, screenX, screenY);
    let best: TopologyNode | null = null;
    let bestDistance = 8;

    for (const drawables of nodesByKind.values()) {
      for (const drawable of drawables) {
        const distance = Math.hypot(drawable.x - at.x, drawable.y - at.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = drawable.node;
        }
      }
    }

    return best;
  };

  const onPointerDown = (event: PointerEvent): void => {
    dragging = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (dragging === event.pointerId) {
      view = panBy(
        view,
        event.clientX - lastPointerX,
        event.clientY - lastPointerY,
      );
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      invalidate();
      return;
    }

    // Hit-testing runs on every move, as Sigma's picking buffer does, so the
    // two candidates are measured doing the same work. The style write is
    // guarded: an unconditional assignment is a layout invalidation per move.
    const box = canvas.getBoundingClientRect();
    const wanted =
      nodeAt(event.clientX - box.left, event.clientY - box.top) === null
        ? "grab"
        : "pointer";

    if (wanted !== cursor) {
      cursor = wanted;
      canvas.style.cursor = wanted;
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
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
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

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
    framesDrawn: () => frames,
    destroy: () => {
      observer.disconnect();
      if (pending !== null) cancelAnimationFrame(pending);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.remove();
    },
  };
};
