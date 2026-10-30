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
  TopologyGraph,
  TopologyLayout,
} from "@marketpulse/shared";
import { buildTopologyGraph, buildTopologyLayout } from "@marketpulse/shared";

/** A graph and where its nodes sit. What a renderer is mounted with. */
export interface TopologySource {
  readonly graph: TopologyGraph;
  readonly layout: TopologyLayout;
}

let memo: { key: readonly Security[]; value: TopologySource } | null = null;

/**
 * The graph and the layout for one universe.
 *
 * `status === "active"` filtering happens inside `buildTopologyGraph`, which is
 * a *computing-over-the-market-we-track-now* reader — see that function's own
 * account, and its hand-off to Epic 13 about why a replayed topology must
 * refuse rather than fall back to today's roster.
 */
export function topologySource(
  securities: readonly Security[],
): TopologySource {
  if (memo !== null && memo.key === securities) return memo.value;

  const graph = buildTopologyGraph(securities);
  const value: TopologySource = { graph, layout: buildTopologyLayout(graph) };

  memo = { key: securities, value };
  return value;
}
