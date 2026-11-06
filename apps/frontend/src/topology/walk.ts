/**
 * **What an arrow key does in a graph** (Task 6.4.3) — the tree walk, as a
 * pure function over the graph and its layout.
 *
 * ## Why this is a module of its own, and pure
 *
 * `hit-test.ts`'s own reason, which has held twice now: jsdom has no 2d
 * context, so `renderer-canvas.ts` is unreachable below `pnpm e2e` — and *which
 * node is next* is exactly the sort of arithmetic that is wrong in a way
 * nobody notices, because every individual answer looks plausible. Nothing
 * here touches a DOM, a canvas, a clock or a view: graph and layout in, the
 * current symbol and a key in, the next symbol out.
 *
 * ## The model: a tree, settled at this story's Gate 1
 *
 * The graph already has the shape — 501 equities each with a membership edge
 * to their sector ETF, eleven sector ETFs each with a hub edge to the broad
 * market at the centre. So:
 *
 *   * `ArrowDown` **enters**: the hub → the first sector ETF in the ring's own
 *     drawn order; a sector ETF → the first member of its cluster.
 *   * `ArrowUp` **exits**, the exact reverse at each level: an equity → its own
 *     sector ETF; a sector ETF → the hub.
 *   * `ArrowLeft`/`ArrowRight` move among **siblings**, and the two groups
 *     differ in one respect that is the picture rather than a preference (see
 *     {@link TopologyWalkGroup.wraps}).
 *   * `Home`/`End` jump to the ends of whichever group `ArrowLeft`/`ArrowRight`
 *     is moving within.
 *
 * **A no-op is `null` and is a real answer**, not a failure: there is nothing
 * below an equity and nothing above the hub, and a walk that silently wrapped
 * to somewhere else rather than stopping would move a reader's position for a
 * key they pressed expecting it not to.
 *
 * ## Two orders, and they are NOT the same order
 *
 * The eleven sector ETFs are walked in **`SECTORS`' own declared order**,
 * because that is the order `topology-layout.ts` allocates the wedges in
 * ("eleven sector wedges run from twelve o'clock clockwise in `SECTORS`' own
 * declaration order") — so `ArrowRight` moves clockwise around the drawn ring.
 * It is deliberately **not** `graph.clusters`' order, which is sorted by `id`
 * (`topology.ts`'s own docblock says plainly those are two different
 * questions: one is a lookup, the other is a picture). Walking the sorted order
 * would step a reader from `COMMUNICATION SERVICES` to `CONSUMER
 * DISCRETIONARY` across the diameter of the market.
 *
 * Within a cluster the order is `TopologyCluster.members`, **already sorted by
 * ticker** — and ticker order rather than band order is a correctness
 * requirement rather than a style one: the band map updates at feed cadence
 * (`setBands`), so a group ordered by band would re-order under a reader's
 * stationary hands and the next `ArrowRight` would land somewhere they did not
 * choose.
 *
 * ## Keyed on the symbol, never on an index
 *
 * This function takes and returns a `Ticker`. The ordinal it steps through is
 * derived from the symbol on every call and is never held anywhere — which is
 * the landing page's own four-roving-group lesson (`a held index is a second,
 * disagreeing copy of where focus is`) arriving on a surface whose membership
 * can change under a retry that lands a fresh universe.
 */

import { SECTORS, SECTOR_ETFS, TOPOLOGY_HUB } from "@marketpulse/shared";
import type {
  Ticker,
  TopologyGraph,
  TopologyLayout,
  TopologyNode,
} from "@marketpulse/shared";

/** The keys {@link topologyWalk} answers. Everything else reaches the page. */
export const TOPOLOGY_WALK_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
] as const;

/** One of {@link TOPOLOGY_WALK_KEYS}. */
export type TopologyWalkKey = (typeof TOPOLOGY_WALK_KEYS)[number];

/**
 * Whether a `keydown`'s own `key` is one this walk answers.
 *
 * A type guard rather than a `switch` in the renderer, so the one place that
 * decides *is this ours* is the module that knows what it can answer —
 * `ChartReading.tsx`'s `default: return` arm with the question moved to where
 * the answer lives.
 */
export function isTopologyWalkKey(key: string): key is TopologyWalkKey {
  return (TOPOLOGY_WALK_KEYS as readonly string[]).includes(key);
}

/**
 * A set of siblings, in the order they are walked, and whether the ends join.
 *
 * **Wrapping is read off the picture, which is the whole of why the two groups
 * differ.** The sector ETFs are drawn as a closed ellipse, so `ArrowRight`
 * past `MATERIALS` arriving back at `TECHNOLOGY` is the ring continuing —
 * refusing it would be a reader stopped at a boundary the drawing does not
 * have. A cluster's members are a spiral with a first and a last, and the
 * landing page's own rule (`a ranking is not a ring` — four roving groups that
 * clamp) covers every group this product draws as a line.
 */
interface TopologyWalkGroup {
  readonly members: readonly Ticker[];
  readonly wraps: boolean;
}

/** Everything the walk needs, resolved from the graph once per call. */
interface WalkIndex {
  readonly nodes: ReadonlyMap<Ticker, TopologyNode>;
  readonly ring: readonly Ticker[];
  readonly proxies: readonly Ticker[];
}

/**
 * The eleven sector ETFs in drawn order, the market proxies in theirs, and
 * every node by symbol.
 *
 * **Rebuilt per call rather than memoised**, because a key press is not a
 * cadence: this is 516 map inserts on a keystroke, against a pointer move's
 * own hit test which does the same amount of work per *frame* and was
 * deliberately left as a linear scan for the same reason.
 */
function indexGraph(graph: TopologyGraph, layout: TopologyLayout): WalkIndex {
  const nodes = new Map<Ticker, TopologyNode>(
    graph.nodes.map((node) => [node.symbol, node]),
  );

  // **`SECTORS`' order, filtered by presence** — see the module docblock. A
  // sector whose benchmark is not in this graph is skipped rather than left as
  // a gap a reader can land on, which keeps `ArrowRight` moving to something
  // that is actually on screen.
  const ring = SECTORS.map((sector) => SECTOR_ETFS[sector]).filter((symbol) =>
    nodes.has(symbol),
  );

  // **The hub first, then the column in its own drawn top-to-bottom order.**
  //
  // This is the one place the walk reads the LAYOUT rather than the graph, and
  // it is the only group with no order in the model to read: `QQQ`, `DIA` and
  // `IWM` carry no edges at all (`buildTopologyGraph` refuses to draw a
  // relationship this product stores no constituent list for), so there is no
  // tree to take an order from. `buildTopologyLayout` places them in a column
  // by walking `graph.nodes`, which is symbol-sorted — but reading the drawn
  // `y` is what makes this *the order on screen* rather than a coincidence of
  // two sorts agreeing today.
  //
  // The hub is not in the column at all (it is at the origin, eleven edges on
  // it), so it is placed first by name rather than by geometry: there is no
  // one-dimensional order across a centre node and a side column, and the hub
  // is the group's own root.
  const at = new Map<Ticker, { x: number; y: number }>(
    layout.placements.map((placement) => [
      placement.symbol,
      { x: placement.x, y: placement.y },
    ]),
  );

  const column = graph.nodes
    .filter((node) => node.kind === "index_etf" && node.symbol !== TOPOLOGY_HUB)
    .map((node) => node.symbol)
    .sort((left, right) => {
      const leftAt = at.get(left);
      const rightAt = at.get(right);
      if (leftAt === undefined || rightAt === undefined) return 0;
      return leftAt.y - rightAt.y || leftAt.x - rightAt.x;
    });

  return {
    nodes,
    ring,
    proxies: nodes.has(TOPOLOGY_HUB) ? [TOPOLOGY_HUB, ...column] : column,
  };
}

/**
 * Where the walk starts when nothing is selected — **the centre**, which is
 * Gate 1's own clause *focus is never a state with nothing in it*.
 *
 * The hub, or the first sector ETF on the ring where a universe has no `SPY`
 * in it. The fallback is two lines rather than a refusal because the
 * alternative is a dead keyboard on a store nobody would notice was odd: the
 * tree is rooted at the hub, and a graph without one still has a ring to walk.
 */
function seed(index: WalkIndex): Ticker | null {
  if (index.nodes.has(TOPOLOGY_HUB)) return TOPOLOGY_HUB;
  return index.ring[0] ?? null;
}

/** The siblings of `node`, in walked order. See {@link TopologyWalkGroup}. */
function groupOf(
  graph: TopologyGraph,
  index: WalkIndex,
  node: TopologyNode,
): TopologyWalkGroup {
  if (node.kind === "index_etf") {
    return { members: index.proxies, wraps: false };
  }

  if (node.kind === "sector_etf") {
    return { members: index.ring, wraps: true };
  }

  const cluster = graph.clusters.find(
    (candidate) => candidate.id === node.cluster,
  );
  return { members: cluster?.members ?? [], wraps: false };
}

/** One step along a group, clamped or wrapped per {@link TopologyWalkGroup}. */
function step(
  group: TopologyWalkGroup,
  from: Ticker,
  by: 1 | -1,
): Ticker | null {
  const at = group.members.indexOf(from);
  if (at < 0) return null;

  const count = group.members.length;
  const to = group.wraps ? (at + by + count) % count : at + by;

  // **Clamped means the current symbol, not the end of the group** — a key
  // press at the end answers `null`, so the caller does not report a selection
  // change for a reader who did not move. `setSelectedNode`'s own
  // did-it-change guard would absorb it either way; this is the honest answer
  // one level up.
  return group.members[to] ?? null;
}

/**
 * The symbol an arrow key moves the selection to, or `null` for *stay where
 * you are*.
 *
 * `from` is `null` on the reader's first key in the region, and on a symbol
 * this graph does not hold — a retry that lands a fresh universe can leave the
 * selection naming a security the new picture does not draw, and seeding from
 * the centre is the only answer that is about what is on screen.
 */
export function topologyWalk(
  graph: TopologyGraph,
  layout: TopologyLayout,
  from: Ticker | null,
  key: TopologyWalkKey,
): Ticker | null {
  const index = indexGraph(graph, layout);
  const node = from === null ? undefined : index.nodes.get(from);

  if (node === undefined) return seed(index);

  switch (key) {
    case "ArrowDown": {
      // **Down ENTERS, and only a node with something under it answers.** An
      // equity is a leaf; so are `QQQ`, `DIA` and `IWM`, which have no edges
      // at all — a `Down` that invented a child for one of those would draw a
      // relationship this product deliberately refuses to claim.
      if (node.symbol === TOPOLOGY_HUB) return index.ring[0] ?? null;
      if (node.kind === "sector_etf") {
        const cluster = graph.clusters.find(
          (candidate) => candidate.id === node.cluster,
        );
        return cluster?.members[0] ?? null;
      }
      return null;
    }

    case "ArrowUp": {
      // The exact reverse of `Down` at each level, which is what makes the two
      // keys a way in and a way back rather than two independent behaviours.
      if (node.kind === "equity") {
        if (node.cluster === null) return null;
        const benchmark = SECTOR_ETFS[node.cluster];
        return index.nodes.has(benchmark) ? benchmark : null;
      }
      if (node.kind === "sector_etf") {
        return index.nodes.has(TOPOLOGY_HUB) ? TOPOLOGY_HUB : null;
      }
      return null;
    }

    case "ArrowLeft":
      return step(groupOf(graph, index, node), node.symbol, -1);

    case "ArrowRight":
      return step(groupOf(graph, index, node), node.symbol, 1);

    case "Home": {
      const { members } = groupOf(graph, index, node);
      return members[0] ?? null;
    }

    case "End": {
      const { members } = groupOf(graph, index, node);
      return members.at(-1) ?? null;
    }
  }
}
