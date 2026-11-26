// `get_related_securities` — which other securities this one is related to,
// and the first consumer of Epic 6's graph model that is not a browser (Task
// 7.4.1).
//
// ## It is deliberately NOT an `AnalyticalTool<Input, Output>`
//
// Every other tool in this epic is one, and that is the whole registry:
// `the-analytical-tool-registry-is-one-class` asserts that every
// `): AnalyticalTool<` factory under `apps/backend/src` is wired into
// `investigationTools` through `toRunnableTool(`, so *an `AnalyticalTool` IS a
// pipeline step*, full stop. This answers a question for the ORCHESTRATOR
// rather than for a checklist row, and three things follow structurally from
// not being one:
//
//   1. **It produces no `Finding`.** `FINDING_TYPE_FOR_TOOL` in
//      `packages/shared/src/finding.ts` is `satisfies Record<ToolName,
//      FindingType>` — a TOTAL map, checked in both directions by
//      `finding.test.ts`. Adding this to `TOOL_NAMES` would force a
//      `FindingType` for a tool that makes no claim about the market at all
//      (it drives a `WorkspaceCommand`), and there is no honest answer: a
//      `FindingType` with no real producer breaks that test's reverse
//      direction, which exists precisely to stop a claim kind nothing mints.
//   2. **It paints no checklist row.** `the-checklist-seeds-one-row-per-tool`
//      counts `toRunnableTool(` calls, and a seventh row nothing fills is the
//      defect that check was written for.
//   3. **It cannot be reached from a step.** `a-tool-takes-no-channel-to-
//      another-step` keeps a tool's `run` signature free of any channel to
//      another step's outcome; this is called by the orchestrator, from the
//      investigation's own subject and `asOf`, and by nothing else.
//
// What it DOES share with every tool is the rule that matters most:
// **`asOf` is an explicit argument and this module reads no clock.** Invariant
// 4's hook is the reason the correlation read takes a bound rather than
// `Date.now()`.
//
// ## The boundary with `/market-data/relationships`, named rather than implied
//
// This module answers the **curated and stored** sense of *related*:
//
//   - **Membership** — from `buildTopologyGraph(UNIVERSE)` alone, a pure
//     function of the curated universe. Always answerable, on every machine,
//     including CI's zero-bar store.
//   - **Correlation** — from the **stored nightly generation** only
//     (`return_correlations`, ADR 0049), read through a `RelationshipsCache`
//     with an explicit `atOrBefore` bound.
//
// It does **not** read, and must not grow a reader for, the live on-demand
// measured-relation path: `relationships-cache.ts` serving
// `/market-data/relationships` through `routes/market-data.ts`, and
// `return-correlation-selection.ts`'s own top-N selection for the drawn graph.
// Those answer *what should this canvas draw right now*, with a selection and
// a ranking applied; this answers *what is this security related to*, with
// neither. Two clearly-named facts beat one ambiguous name — which is Story
// 7.4's Gate 1 decision to keep this tool's name while writing the boundary
// down here.
//
// It takes its own `RelationshipsCache` instance rather than sharing the
// route's, which is `index.ts`'s established convention for ADR 0044's cache
// family: one instance per consumer, each over the same pool, none exporting a
// handle.
//
// ## What every machine sees, and what none does
//
// On **CI** and every fresh store the nightly pass has never run, so
// `generationAsOf` answers `undefined` and the correlation half is
// `not-measured` — a stated absence, never *measured as none*. The membership
// half is fully answerable there, which is what makes this feature reachable
// on CI at all, rather than permanently unreachable the way most of Epic 5 is.
// What no gated machine will ever see is a `return_correlation` row here, for
// the same reason it has never drawn one.

import { buildTopologyGraph, withCorrelationEdges } from "@marketpulse/shared";

import { untrackedRefusal } from "./tool-universe.js";

import type {
  Security,
  Ticker,
  TopologyEdgeKind,
  TopologyGraph,
  ToolOutcome,
} from "@marketpulse/shared";
import type { RelationshipsCache } from "./relationships-cache.js";

/**
 * Whether the correlation half of the answer rests on a measurement at all.
 *
 * **Three states, not two, and the first two are the pair that must never
 * merge** — `relationships-response.ts`' own distinction, arriving on a tool:
 *
 * - `not-measured` — no nightly generation exists at or before `asOf`. CI's
 *   and every fresh store's permanent state. Nothing is known.
 * - `measured-none` — a generation exists and this security has no retained
 *   edge in it. A real, negative measurement.
 * - `measured` — a generation exists and this security has at least one.
 *
 * Collapsing the first two would say *this security moves with nothing* about a
 * store that has never asked the question, which is a claim about data made
 * without data.
 */
export const CORRELATION_COVERAGES = [
  "not-measured",
  "measured-none",
  "measured",
] as const;

export type CorrelationCoverage = (typeof CORRELATION_COVERAGES)[number];

/**
 * One related security, with **its own** relation kinds.
 *
 * Plural, and non-empty by type, because one security can be related twice
 * over: ~82–84% of drawn correlation edges join two securities already in the
 * same visible cluster, so *a sector-mate that is also correlated* is the
 * common case. A single kind per row would have to pick one and throw the
 * other away silently.
 */
export interface RelatedSecurity {
  readonly symbol: Ticker;
  readonly relations: readonly [TopologyEdgeKind, ...TopologyEdgeKind[]];
}

/** What `get_related_securities` answers. */
export interface RelatedSecuritiesReading {
  readonly subject: Ticker;
  /** Sorted by symbol. **Empty is a legitimate, correct answer** — `QQQ`,
   * `DIA` and `IWM` carry no membership edge of any kind, which
   * `buildTopologyGraph` refuses to invent (there is no stored constituent
   * list for the first two and `IWM` is disjoint from the S&P 500 by
   * construction). The caller turns an empty list into **no command**, never
   * into an empty highlight. */
  readonly related: readonly RelatedSecurity[];
  readonly correlation: CorrelationCoverage;
}

export interface RelatedSecuritiesInput {
  readonly symbol: Ticker;
}

/**
 * The orchestrator-called answerer. Its own small interface rather than
 * `AnalyticalTool` — see the header for the three things that follow from
 * that.
 */
export interface RelatedSecuritiesAnswerer {
  /** Not a `ToolName`, and deliberately not in that closed vocabulary. */
  readonly name: "get_related_securities";
  readonly answer: (
    input: RelatedSecuritiesInput,
    asOf: Date,
  ) => Promise<ToolOutcome<RelatedSecuritiesReading>>;
}

export interface RelatedSecuritiesOptions {
  /** The curated universe, whole. Handed `buildTopologyGraph` unfiltered —
   * that function owns the `status === "active"` predicate, and a second
   * filter here would be a second home for `UNIVERSE.md` §12.2's rule. */
  readonly securities: readonly Security[];
  readonly relationships: Pick<RelationshipsCache, "generationAsOf">;
}

/** `TOPOLOGY_EDGE_KINDS`' own declaration order, as a sort key. */
const KIND_ORDER: readonly TopologyEdgeKind[] = [
  "sector_membership",
  "index_membership",
  "return_correlation",
];

function byKind(left: TopologyEdgeKind, right: TopologyEdgeKind): number {
  return KIND_ORDER.indexOf(left) - KIND_ORDER.indexOf(right);
}

/**
 * Every security joined to `subject` by an edge of `graph`, with the kinds that
 * join them.
 *
 * **Two hops, and only for one kind.** A direct neighbour covers three of the
 * four cases the business-analyst's table names — an equity's sector ETF, a
 * sector ETF's constituents plus its one `index_membership` parent, and `SPY`'s
 * eleven sector ETFs. The fourth, *an equity's other sector-mates*, is not a
 * neighbour at all: two equities in one sector share a benchmark rather than an
 * edge. So a `sector_membership` edge `subject → B` additionally yields every
 * other `from` whose `sector_membership` edge also ends at `B`.
 *
 * It is written as a graph walk rather than as a read of `graph.clusters`
 * because the walk is what keeps this honest about the kind: a cluster read
 * would answer *members of this sector*, which is true of a security whose
 * benchmark is absent from the graph and therefore has no membership edge at
 * all — a highlight with no line under it.
 */
function neighboursOf(
  graph: TopologyGraph,
  subject: Ticker,
): Map<Ticker, Set<TopologyEdgeKind>> {
  const found = new Map<Ticker, Set<TopologyEdgeKind>>();

  const add = (symbol: Ticker, kind: TopologyEdgeKind): void => {
    if (symbol === subject) return;
    const kinds = found.get(symbol);
    if (kinds === undefined) found.set(symbol, new Set([kind]));
    else kinds.add(kind);
  };

  /** The benchmarks `subject` is a member of, for the second hop. */
  const benchmarks = new Set<Ticker>();

  for (const edge of graph.edges) {
    if (edge.from === subject) {
      add(edge.to, edge.kind);
      if (edge.kind === "sector_membership") benchmarks.add(edge.to);
    } else if (edge.to === subject) {
      add(edge.from, edge.kind);
    }
  }

  if (benchmarks.size > 0) {
    for (const edge of graph.edges) {
      if (edge.kind !== "sector_membership") continue;
      if (!benchmarks.has(edge.to)) continue;
      add(edge.from, "sector_membership");
    }
  }

  return found;
}

export function createRelatedSecuritiesAnswerer(
  options: RelatedSecuritiesOptions,
): RelatedSecuritiesAnswerer {
  const { securities, relationships } = options;

  // **Built once.** `buildTopologyGraph` is pure and total over a universe
  // that is typechecked data compiled into this process, so the membership
  // graph cannot change while it runs — and the 516-node build is not work to
  // repeat per investigation. The measured edges are merged per call, because
  // those DO change (once a night) and are bounded by an `asOf`.
  const membership = buildTopologyGraph(securities);
  const present = new Set<string>(membership.nodes.map((node) => node.symbol));

  return {
    name: "get_related_securities",

    async answer(input, asOf) {
      const untracked = untrackedRefusal(input.symbol, present);
      if (untracked !== undefined) return untracked;

      const generation = await relationships.generationAsOf(asOf);

      const graph =
        generation === undefined
          ? membership
          : withCorrelationEdges(
              membership,
              // `{low, high, r}` — `StoredCorrelation`'s `n` is the sample
              // size behind the coefficient and the merge has no use for it;
              // `TopologyCorrelation` declares the three fields it reads, so
              // handing the row through whole would not compile.
              generation.correlations.map(({ low, high, r }) => ({
                low,
                high,
                r,
              })),
            );

      const found = neighboursOf(graph, input.symbol);

      const related: RelatedSecurity[] = [...found.entries()]
        .map(([symbol, kinds]) => {
          const [first, ...rest] = [...kinds].sort(byKind);
          // Unreachable: `add` never creates an empty set. Narrowed rather
          // than asserted, because the non-empty tuple is the guarantee this
          // type exists to make and a cast here would be the one route round
          // it.
          return first === undefined
            ? undefined
            : { symbol, relations: [first, ...rest] as const };
        })
        .filter((row): row is RelatedSecurity => row !== undefined)
        .sort((left, right) =>
          left.symbol < right.symbol ? -1 : left.symbol > right.symbol ? 1 : 0,
        );

      const correlated = related.some((row) =>
        row.relations.includes("return_correlation"),
      );

      return {
        kind: "ok",
        value: {
          subject: input.symbol,
          related,
          correlation:
            generation === undefined
              ? "not-measured"
              : correlated
                ? "measured"
                : "measured-none",
        },
      };
    },
  };
}
