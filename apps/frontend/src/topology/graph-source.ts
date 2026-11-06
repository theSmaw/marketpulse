/**
 * **The universe this screen draws, as a graph and a layout** (Task 6.1.2).
 *
 * One function, and it exists so that both renderer candidates and every story
 * read the graph through the **same** two shared builders rather than three
 * call sites that could drift. It is the frontend's whole relationship with
 * `packages/shared`'s topology model: the model and the geometry are domain
 * data, and the renderer is a reader.
 *
 * ## It memoises, and the reason is a measurement rather than a habit
 *
 * `buildTopologyGraph` plus `buildTopologyLayout` over the real universe is a
 * sort, eleven filters, 516 `Math.sqrt`/`sin`/`cos` triples and a bounds pass.
 * Both are pure, so the same securities array twice is the same answer twice —
 * and a React component that rebuilt on every render would re-lay-out the
 * market on a container resize. Keyed on the array **identity**, which is what
 * `use-securities.ts` holds stable between renders, and bounded at one entry
 * because this screen draws one universe.
 */

import type {
  Security,
  TopologyCorrelation,
  TopologyGraph,
  TopologyLayout,
} from "@marketpulse/shared";
import {
  buildTopologyGraph,
  buildTopologyLayout,
  withCorrelationEdges,
} from "@marketpulse/shared";

/** A graph and where its nodes sit. What a renderer is mounted with. */
export interface TopologySource {
  readonly graph: TopologyGraph;
  readonly layout: TopologyLayout;
}

/**
 * The one cache entry, keyed on **both** inputs by identity (Task 6.5.2).
 *
 * **It was keyed on `securities` alone until 2026-11-06, and that was a latent
 * defect rather than a simplification.** The correlation set arrives on a
 * second, independent request, so the reachable ordinary sequence is *the
 * universe settles, the graph is built and memoised, the measurement settles a
 * few hundred milliseconds later* — and under the old key that second settle
 * returned the **stale, edge-less** graph, for ever, because `securities` had
 * not changed. Invisible to any test where both inputs change together, which
 * is every test written from a fixture.
 */
let memo: {
  key: readonly Security[];
  correlations: readonly TopologyCorrelation[] | null;
  value: TopologySource;
} | null = null;

/**
 * The graph and the layout for one universe, with the measured edges merged in.
 *
 * `status === "active"` filtering happens inside `buildTopologyGraph`, which is
 * a *computing-over-the-market-we-track-now* reader — see that function's own
 * account, and its hand-off to Epic 13 about why a replayed topology must
 * refuse rather than fall back to today's roster.
 *
 * ## The layout is built from the MERGED graph, and that costs nothing
 *
 * `buildTopologyLayout` reads nodes and clusters and **no edge**, so adding
 * 1,860 of them moves no coordinate — checked rather than assumed, and it is
 * what makes a correlation set arriving late a redraw rather than a market
 * that moves under the reader. It is passed the merged graph anyway, so there
 * is one graph on screen rather than a layout built from one and edges drawn
 * from another.
 *
 * @param correlations the measured pairs, or `null` where there is nothing to
 *   merge — which is a request still in flight, a store that has never run the
 *   pass, and a request that failed, all three. The graph is identical in all
 *   three cases: `withCorrelationEdges(graph, [])` is `graph`, which is what
 *   makes *the measurement failed* cost the picture nothing. The **sentence**
 *   beside it is where those three differ, and `MarketTopology` owns that.
 */
export function topologySource(
  securities: readonly Security[],
  correlations: readonly TopologyCorrelation[] | null = null,
): TopologySource {
  // **Both references, and the cache still holds exactly one entry** — this
  // screen draws one universe, which is this module's own stated bound.
  if (
    memo !== null &&
    memo.key === securities &&
    memo.correlations === correlations
  ) {
    return memo.value;
  }

  const universe = buildTopologyGraph(securities);
  const graph =
    correlations === null
      ? universe
      : withCorrelationEdges(universe, correlations);

  const value: TopologySource = { graph, layout: buildTopologyLayout(graph) };

  memo = { key: securities, correlations, value };
  return value;
}
