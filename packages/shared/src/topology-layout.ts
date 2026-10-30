/**
 * **Where each node sits** — a closed-form radial layout over
 * {@link ./topology.js}'s graph, with no simulation and no random seed (Task
 * 6.1.1).
 *
 * ## Why closed form rather than force-directed
 *
 * Story 6.1's acceptance criterion 3 wants the layout deterministic and
 * reproducible, and a force-directed simulation satisfies that only by freezing
 * a seed and an iteration count — at which point *deterministic* means *we
 * stopped writing to the same place*, not *the geometry is a function of the
 * graph*. Three things fall out of the closed form that the simulation cannot
 * give at any seed:
 *
 *   1. **No two clusters can collide**, because the angular span each sector
 *      gets is allocated from its own radius rather than negotiated.
 *      {@link TOPOLOGY_RING_RADIUS}'s note has the arithmetic.
 *   2. **The renderer comparison measures drawing.** Both of Story 6.1's
 *      candidates read this one layout, so a frame-rate difference is the
 *      renderer and not two different pictures — the confound the story's own
 *      shaping found in a force-directed layout, and the reason this task runs
 *      before the renderer one.
 *   3. **Adding a security moves one cluster**, not every node. A simulation
 *      re-converges globally, so a curation change on one name re-draws the
 *      whole market.
 *
 * ## The unit is abstract, and it is NOT a pixel
 *
 * Every coordinate here is in units of which the node **footprint is 16** —
 * `--space-16`, the design canvas's own figure, 8 px of ink inside a 16 px box
 * with a 4 px annulus reserved for Story 6.3's anomaly band and Story 6.4's
 * focus ring. A pixel is a fact about a viewport, and nothing in this module
 * knows a viewport exists: there is no `ResizeObserver`, no device ratio, no
 * zoom. {@link TopologyLayout.bounds} travels with the placements so fitting
 * one to a box is a pure scale and a translate, which is Task 6.1.3's and
 * Story 6.2's job.
 *
 * **The unit is extent-relative rather than rescaled into `[-1, 1]`, and that
 * was a choice.** A unit-square rescale is the obvious reading of *normalised*
 * and it makes the one figure a later story cannot change cheaply —
 * {@link TOPOLOGY_NODE_FOOTPRINT}, the minimum centre-to-centre separation —
 * **inexpressible**, because the divisor would be data-dependent: adding one
 * security would change what every coordinate means. Here the footprint stays
 * 16 in the layout's own units whatever the universe does, so
 * `minimumSeparation ≥ footprint` is a property this module can assert about
 * itself.
 *
 * ## Determinism, and what it does and does not promise
 *
 * `Math.sin`, `Math.cos` and `Math.sqrt` are **not** required to be
 * bit-identical between Node and a browser engine, so there is no checked-in
 * coordinate fixture anywhere and there must not be one: the mechanical claims
 * are structural — every node placed exactly once, no two coincident, cluster
 * centroids in `SECTORS`' own declared order — and those hold under any
 * conforming implementation. `Math.random()` is the one thing that would break
 * determinism outright, and `pnpm invariants`' `no-random-in-the-shared-model`
 * refuses it across this whole package.
 *
 * `STORY.md`'s design work is the argument for the geometry below — ring
 * radius, derived cluster radius, the golden angle, the three free proxies —
 * and `The graph at rest.dc.html` is the authority over both.
 */

import { SECTORS } from "./security.js";
import type { Sector } from "./security.js";
import { TOPOLOGY_HUB } from "./topology.js";
import type { TopologyGraph } from "./topology.js";
import type { Ticker } from "./ticker.js";

/**
 * **16 — the node footprint, and 4 of it is reserved rather than spare.**
 *
 * 8 units of ink inside a 16-unit box leaves a 4-unit annulus, which is exactly
 * `(16 − 8) / 2` rather than a fourth decision. `PRODUCT_SPEC.md` §10 calls
 * Story 6.3's anomaly encoding *Border — anomaly strength*, and a border needs
 * an annulus; `--focus-width` 2 plus `--focus-offset` 2 is **the same 4**, so
 * Story 6.4's focus ring wants the same room.
 *
 * **So the layout's minimum centre-to-centre separation is 16, not 8** — this
 * is the one figure here a later story cannot change cheaply. Growing the node
 * to fit a ring would move all 516 positions, every cluster radius and every
 * label.
 */
export const TOPOLOGY_NODE_FOOTPRINT = 16;

/**
 * **0.6 — how densely a cluster packs its members**, as a footprint-area
 * fraction.
 *
 * It is the denominator of the derived cluster radius: a sector holding `n`
 * equities gets `r = √(n · footprint² / density / π)`, which keeps node density
 * **constant** across sectors running 83 members down to 21 — a 4.0× spread
 * that a fixed radius would draw as one crowded disc and one nearly empty one.
 *
 * Measured against the real universe rather than argued: at 0.6 the closest
 * pair of placements in the whole 516-node graph is **17.83** units apart, with
 * {@link TOPOLOGY_NODE_FOOTPRINT} at 16 — 11% of headroom, and the closest pair
 * is a benchmark ETF against the innermost equity of the smallest sector rather
 * than two equities. Raising the density tightens that; it is the number to
 * re-derive if Story 6.6 varies the equity radius.
 */
export const TOPOLOGY_CLUSTER_DENSITY = 0.6;

/**
 * **400 — the radius the eleven cluster centres sit on**, from the design
 * canvas, raised from **335 by Task 6.1.3** for a second reason beyond the one
 * it was set for — and the raise **measurably helps without fully solving it**,
 * which is the part of this note worth reading before trusting the number.
 *
 * ## Why no two clusters can collide, as arithmetic rather than as a hope
 *
 * Each sector's angular span is allocated **proportionally to its own cluster
 * radius**, so sector `s` receives `2π · r_s / Σr` and the arc length available
 * to it at this radius is `2π · R · r_s / Σr`. Over the real universe
 * `Σr = 839.8`, so that arc is `2π · 400 / 839.8 ≈ 2.993 · r_s` — against the
 * `2 · r_s` the cluster needs. Every cluster therefore gets **~50% more arc
 * than it occupies**, at every member count, which is why disjointness is a
 * property of the allocation rather than something a collision pass has to
 * clean up. This part of the arithmetic does not depend on `R` at all — it is
 * a ratio of allocated-to-occupied arc, and raising `R` scales both the same
 * way — so it held at 335 and holds here unchanged; the test beside this
 * module measures the resulting figure rather than quoting either one.
 * **This property is genuinely, unconditionally true** — unlike the label
 * discussion below, it does not depend on what box the layout is fitted into.
 *
 * ## Why 400 rather than 335 — a second collision the first draft didn't check,
 * ## and a first REPAIR draft that didn't check its own units
 *
 * **Found by Task 6.1.2, looking at the built page rather than by any check**:
 * `The graph at rest.dc.html` §06 places every sector's label **directly above
 * its own cluster — same x, smaller y** — and at a bearing near three or nine
 * o'clock that "above" direction is nearly *tangential* to the ring rather than
 * radial, so a label's lateral extent competes for the same clearance the
 * circle-to-circle allocation above protects, and the 25% margin at `R = 335`
 * was not enough: `CONSUMER DISCRETIONARY` (163 px, the longest of the eleven)
 * crossed into `Financials`' circle, and `COMMUNICATION SERVICES` (161.5 px)
 * crossed into `Consumer Discretionary`'s.
 *
 * **Task 6.1.3's first repair compared the label's width in CSS PIXELS
 * directly against this module's LAYOUT UNITS, reported the collision cleared,
 * and was wrong** — `renderer-canvas.ts` draws label text at a **constant
 * CSS-pixel size regardless of the fit scale** (the design work's own rule:
 * type does not scale), while every circle shrinks with it, so the two
 * quantities are only commensurate when a renderer happens to fit this layout
 * at exactly 1 layout unit per pixel, which no real rendering of it is. Found
 * by Task 6.1.3's own second pass, looking at the built page again rather than
 * trusting the first test that said it was fixed.
 *
 * **Re-measured through the real fit scale, raising `R` helps but does not
 * clear it.** At the reference box `apps/frontend/src/topology/fit.ts`'s own
 * tests already use (`1392 × 520`, Story 6.2's target), the fit scale is
 * **≈0.515**, and the worst label/circle clearance — the same
 * `communication_services` → `consumer_discretionary` pair — moved from
 * **−37.3 px at `R = 335` to −28.0 px at `R = 400`**: a real, measured
 * improvement, and a real, remaining collision. A swept check (Task 6.1.3's
 * own record has the table) shows why this is not a dial to keep turning:
 * clearing the reference box outright needs `R ≈ 700`, and a materially
 * narrower box needs far more than that — because the required layout-unit
 * clearance is the pixel label width *divided by* the fit scale, which grows
 * without bound as the box narrows, while `R` is a single constant this
 * module commits to independent of any box. **No value of `R` makes this
 * collision-free at every box this layout might be fitted into**; `R = 400`
 * is a genuine improvement kept for the circle-disjointness property above
 * (unconditionally stronger: 28.75 → 57.69 units of clearance, useful
 * headroom for Story 6.3's band and Story 6.4's ring) while the residual
 * label collision is `docs/GAPS.md`'s, with a regression-floor test beside
 * this module rather than a correctness one.
 *
 * **What this does NOT do**: grow a node, move a member within its cluster, or
 * change which universe a replay can draw — `topologyClusterRadius` and the
 * golden-angle spiral are both independent of `R`. Only the ring itself, and
 * the extent that follows from it, changed.
 *
 * **Handed to Story 6.2, re-measured rather than carried forward:** the extent
 * at `R = 400` does not fit `Market overview.dc.html` §02's real box either,
 * and the canvas's recommendation is unchanged in kind — an **elliptical**
 * ring, node size fixed, ring deformed — with its own figures to re-derive
 * against the new extent, and with the label-clearance problem above to solve
 * for real rather than to re-inherit: a renderer that knows its own fit scale
 * is the only thing in this picture that can.
 */
export const TOPOLOGY_RING_RADIUS = 400;

/**
 * **The golden angle, `π(3 − √5) ≈ 2.39996` radians** — how members are
 * distributed inside a wedge.
 *
 * A Vogel spiral: the `k`-th member of a cluster sits at angle `k · φ` and at a
 * radius chosen so equal areas hold equal counts. It is here rather than a grid
 * or concentric rings because it is **closed form, index-keyed and
 * near-hexagonal** — so it fills a disc at uniform density with no relaxation
 * pass, which is the property that lets this layout satisfy acceptance
 * criterion 3 without a seed.
 *
 * The index it is keyed on is the member's position in a **stable sort by
 * symbol**, never insertion order and never an arrival index. That matters more
 * than it looks: the graph's `members` array is sorted, so the same universe
 * gives the same spiral however the securities reached the builder — and a
 * layout keyed on insertion order would re-draw the market when a query plan
 * changed a row order.
 */
export const TOPOLOGY_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * **48 and 32 — where the three undecomposed market proxies sit**, and the
 * clearance that keeps them out of the ring.
 *
 * `QQQ`, `DIA` and `IWM` carry no edges at all (see
 * `buildTopologyGraph`'s own account of why each), so there is nothing to place
 * them *relative to*. They go in a fixed vertical column `CLEARANCE` beyond the
 * widest point of the ring, together, so they read as **benchmarks we have not
 * decomposed** rather than as broken nodes — which is what the design work's
 * single `MARKET PROXIES` label is for.
 *
 * Their position is outside every cluster circle **by construction**: the
 * column's own `x` alone exceeds `ringRadius + maxClusterRadius`. That is the
 * property to preserve; the compass direction is arbitrary and is Story 6.2's
 * to re-site when the ring deforms into an ellipse.
 */
const PROXY_CLEARANCE = 48;

/** The gap between the three proxies in their column. See {@link PROXY_CLEARANCE}. */
const PROXY_SPACING = 32;

/** Where one node sits. Abstract units — see the module docblock. */
export interface TopologyPlacement {
  /** The node's identity, matching `TopologyNode.symbol`. */
  readonly symbol: Ticker;
  /** Rightward. */
  readonly x: number;
  /** **Downward**, screen convention — twelve o'clock is negative `y`. */
  readonly y: number;
}

/**
 * Every node's position, plus the box they occupy.
 *
 * **A sorted array rather than a `Map`**, and that is not a style preference: a
 * layout crosses a wire in Epic 7, where the server answers *where is this
 * node* for an agent tool, and `JSON.stringify(new Map())` is `{}` — a `Map`
 * does not serialise, and the failure is silent and total.
 *
 * {@link bounds} travels because it is what makes fitting a pure scale: a
 * reader with a viewport has everything it needs without walking 516
 * placements, and it is derived from the placements rather than from the
 * geometry so it is still right when a sector is empty.
 */
export interface TopologyLayout {
  /** Every node, placed exactly once, sorted by symbol. */
  readonly placements: readonly TopologyPlacement[];
  /** The box the placements occupy. Node **centres**, not footprints. */
  readonly bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}

/** A sector's derived cluster radius. See {@link TOPOLOGY_CLUSTER_DENSITY}. */
export function topologyClusterRadius(memberCount: number): number {
  return Math.sqrt(
    (memberCount * TOPOLOGY_NODE_FOOTPRINT * TOPOLOGY_NODE_FOOTPRINT) /
      TOPOLOGY_CLUSTER_DENSITY /
      Math.PI,
  );
}

/**
 * A point at `distance` from `(0, 0)` on a bearing `turn` radians **clockwise
 * from twelve o'clock**.
 *
 * The one place the convention is spelled, and it is spelled once because
 * getting it wrong is a mirrored or quarter-turned market that looks entirely
 * plausible. `y` grows downward (screen convention), so twelve o'clock is
 * `(0, −d)` and a quarter turn clockwise is `(d, 0)`.
 */
function fromTwelve(turn: number, distance: number): { x: number; y: number } {
  return { x: distance * Math.sin(turn), y: -distance * Math.cos(turn) };
}

/**
 * Lay the graph out. **Pure** — the same graph twice gives the same layout, and
 * nothing here reads a clock, a viewport or a random source.
 *
 * Eleven sector wedges run from twelve o'clock clockwise in `SECTORS`' own
 * declaration order, each spanning in proportion to its own cluster radius;
 * the benchmark ETF sits at its cluster's centroid and the sector's equities on
 * a golden-angle spiral around it, from a hole of
 * {@link TOPOLOGY_NODE_FOOTPRINT} so the innermost member clears the ETF. The
 * hub sits at the origin — 229 units clear of the nearest cluster edge — and
 * the three undecomposed proxies in a column outside the ring.
 *
 * **A node the graph holds and this function cannot place does not exist**: a
 * node whose `cluster` is a sector gets a wedge, a node whose cluster is `null`
 * is the hub or a proxy, and anything else would silently drop out of a
 * picture claiming to draw the whole market. Rather than drop it, an
 * unclustered node that is neither the hub nor one of the free proxies is
 * placed in the column with them — `placements.length === nodes.length` is the
 * assertion a reader can make, and it is unconditional.
 */
export function buildTopologyLayout(graph: TopologyGraph): TopologyLayout {
  // Member counts come from the CLUSTERS rather than from a second pass over
  // the nodes, so the wedge a sector gets and the spiral its members sit on are
  // derived from one list. Two passes would be two answers the day a cluster's
  // membership and a node's own `cluster` field disagree.
  const bySector = new Map<Sector, readonly Ticker[]>(
    graph.clusters.map((cluster) => [cluster.id, cluster.members]),
  );

  // A FUNCTION rather than a `Map`, so there is no absent-key arm to default.
  // `?? 0` on a radius would be `no-imputed-zero-in-a-figure`'s own defect
  // dressed as geometry: a sector silently given a zero radius takes a zero
  // wedge, and its members pile onto one point with nothing anywhere saying so.
  // Every sector in `SECTORS` has a member list here, empty or not, which is
  // what makes the lookup total.
  const memberCount = (sector: Sector): number =>
    (bySector.get(sector) ?? []).length;
  const radiusOf = (sector: Sector): number =>
    topologyClusterRadius(memberCount(sector));

  const totalRadius = SECTORS.reduce(
    (sum, sector) => sum + radiusOf(sector),
    0,
  );

  // **The wedge allocation, computed ONCE.** Both loops below need a sector's
  // centroid — the members' spiral is centred on it and the benchmark ETF sits
  // exactly on it — and recomputing the cumulative angle in the second loop
  // would be two spellings of one geometry, which is the shape that drifts.
  //
  // `totalRadius <= 0` is a universe with no equities at all: CI's store after
  // a migration but before `pnpm universe`, which `CLAUDE.md` records as having
  // no other symptom. The ring is skipped entirely rather than dividing by
  // nothing — an honest empty picture, not a `NaN` one.
  const centroids = new Map<Sector, { x: number; y: number }>();

  if (totalRadius > 0) {
    let turn = 0;

    for (const sector of SECTORS) {
      const span = (2 * Math.PI * radiusOf(sector)) / totalRadius;
      centroids.set(sector, fromTwelve(turn + span / 2, TOPOLOGY_RING_RADIUS));
      turn += span;
    }
  }

  const placements: TopologyPlacement[] = [];
  // Everything the ring could not place, in one column outside it: the three
  // undecomposed proxies, and anything else unclustered that is not the hub.
  const column: Ticker[] = [];

  for (const node of graph.nodes) {
    // The hub at the origin. The ring's inner edge is `ringRadius` minus the
    // widest cluster radius away, which over the real universe is 229 units of
    // clear ground, so nothing has to be moved to make room for it.
    if (node.symbol === TOPOLOGY_HUB) {
      placements.push({ symbol: node.symbol, x: 0, y: 0 });
      continue;
    }

    const sector = node.cluster;
    const centre = sector === null ? undefined : centroids.get(sector);

    if (sector === null || centre === undefined) {
      // No cluster, or a cluster with no ring — `QQQ`, `DIA` and `IWM`, which
      // carry no edges at all (see `buildTopologyGraph` for why each). **A node
      // the graph holds and this function cannot place must not vanish**, so it
      // joins the column rather than being skipped: `placements.length ===
      // nodes.length` is then an assertion a reader can make unconditionally,
      // and a picture claiming to draw the whole market draws it.
      column.push(node.symbol);
      continue;
    }

    const members = bySector.get(sector) ?? [];
    const ordinal = members.indexOf(node.symbol);

    if (ordinal < 0) {
      // Not a member of its own cluster: the benchmark ETF, which is the thing
      // the members belong TO. It sits exactly on the centroid, and the sector
      // reads as a group because _n_ faint spokes converge on it — the cluster
      // has no treatment of its own at all.
      placements.push({ symbol: node.symbol, x: centre.x, y: centre.y });
      continue;
    }

    // Equal-area radii over a disc with a footprint-sized hole in the middle,
    // so the innermost member clears the benchmark at the centroid. Without the
    // hole, the first member of an 83-strong sector lands 11.6 units out and
    // the two marks overlap; with it, the closest pair in the whole 516-node
    // graph is 17.83 apart.
    const radius = radiusOf(sector);
    const hole = TOPOLOGY_NODE_FOOTPRINT * TOPOLOGY_NODE_FOOTPRINT;
    const distance = Math.sqrt(
      hole + (radius * radius - hole) * ((ordinal + 0.5) / members.length),
    );
    const offset = fromTwelve(ordinal * TOPOLOGY_GOLDEN_ANGLE, distance);

    placements.push({
      symbol: node.symbol,
      x: centre.x + offset.x,
      y: centre.y + offset.y,
    });
  }

  const columnX =
    TOPOLOGY_RING_RADIUS +
    Math.max(...SECTORS.map(radiusOf), 0) +
    PROXY_CLEARANCE;

  for (const [ordinal, symbol] of column.entries()) {
    placements.push({
      symbol,
      x: columnX,
      // Centred on the ring's own centre line, so the column reads as a group
      // beside the market rather than as a tail hanging off it.
      y: (ordinal - (column.length - 1) / 2) * PROXY_SPACING,
    });
  }

  placements.sort((left, right) =>
    left.symbol < right.symbol ? -1 : left.symbol > right.symbol ? 1 : 0,
  );

  const xs = placements.map((placement) => placement.x);
  const ys = placements.map((placement) => placement.y);

  return {
    placements,
    bounds: {
      minX: Math.min(...xs, 0),
      minY: Math.min(...ys, 0),
      maxX: Math.max(...xs, 0),
      maxY: Math.max(...ys, 0),
    },
  };
}
