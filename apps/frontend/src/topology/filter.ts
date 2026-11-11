/**
 * **Narrowing the graph to one sector — the criterion, the narrowing and the
 * words** (Task 6.8.1).
 *
 * ## Pure, and in three parts that are one subject
 *
 * `walk.ts`'s and `hit-test.ts`'s own reason, which has now held three times:
 * jsdom has no 2d context, so `renderer-canvas.ts` is unreachable below
 * `pnpm e2e` — and *which securities are drawn* is exactly the sort of
 * arithmetic that is wrong in a way nobody notices, because every individual
 * answer looks plausible. Nothing here touches a DOM, a canvas, a clock or a
 * view: an address in, a criterion out; a graph in, a narrower graph out.
 *
 * ## The filter narrows the GRAPH, and that is Gate 1's decision rather than
 * ## an implementation choice
 *
 * `STORY.md`'s settled Open Decision 2: **hide the excluded equities, hold the
 * full-universe layout**. So {@link narrowTopologyGraph} answers a
 * `TopologyGraph` rather than a predicate, and the renderer, the pointer
 * hit-test and the keyboard walk all read that one narrower object — which is
 * what makes the three agree **by construction** rather than by three filters
 * written to the same rule. A `visible(symbol)` predicate threaded through
 * `walk.ts`, `hit-test.ts` and the draw loop is the alternative, and it is
 * three places for one fact.
 *
 * **`buildTopologyLayout` is NOT re-run.** Placements are looked up by symbol
 * from the unfiltered layout, so a filtered sector draws small inside the full
 * frame and no node moves — the server/browser coordinate agreement Epic 7's
 * tools need, and the reader's own pan and zoom, both survive a press.
 * `pnpm invariants`' `the-topology-layout-is-built-from-the-whole-universe`
 * refuses the obvious alternative (filter the securities array, then build),
 * which would re-lay-out the market on every press.
 *
 * ## The fifteen landmarks are never excluded
 *
 * The eleven sector ETFs, the four market proxies and the hub stay in the
 * graph whatever is filtered — they are the keyboard walk's own tree (a reader
 * who filtered to `ENERGY` can still walk out of it) and the band encoding's
 * own exclusion set. What changes for a landmark whose sector is filtered OUT
 * is how it is **drawn**, which is the renderer's business and not this
 * module's.
 */

import { SECTORS, SECTOR_LABELS } from "@marketpulse/shared";
import type {
  Sector,
  Ticker,
  TopologyEdge,
  TopologyGraph,
} from "@marketpulse/shared";

import { PATHS } from "../routes/paths.js";

/**
 * The one query parameter this region reads, spelled once.
 *
 * `SESSIONS_PARAM`'s own precedent — the second occupant of this product's
 * query string, and the reason the name is a constant rather than a literal is
 * that it is written in a reader (`use-topology-filter.ts`), in a builder
 * ({@link topologySectorPath}) and in a browser spec, and three spellings of
 * one parameter is an address nobody can share.
 */
export const TOPOLOGY_SECTOR_PARAM = "sector";

/**
 * What the address says this graph is narrowed to.
 *
 * **Three fields rather than one, because the address can say something that
 * is not a sector.** `use-security-symbol.ts`' and `use-time-window.ts`' rule,
 * applied where there is no server to ask: this client refuses nothing and
 * repairs nothing — it draws the whole market and **says so**, rather than
 * snapping to a sector nobody asked for or drawing zero nodes from an
 * unparseable address.
 */
export interface TopologyFilter {
  /** The sector drawn, or `null` for the whole market. */
  readonly sector: Sector | null;

  /**
   * What the address named, when that was not a sector we track — `null`
   * otherwise. Carried rather than discarded so the region can state it: an
   * address that asks for something and gets the whole market with no
   * explanation is a page disagreeing with its own URL.
   */
  readonly unrecognised: string | null;

  /**
   * The address's own query string, as read. {@link topologySectorPath} builds
   * every one of this control's twelve destinations from it, so a parameter
   * some other surface put there survives a press on this one.
   */
  readonly search: string;
}

/** The whole market, with nothing named in the address. */
export const UNFILTERED_TOPOLOGY: TopologyFilter = {
  sector: null,
  unrecognised: null,
  search: "",
};

/**
 * Read the criterion out of a query string.
 *
 * **An unrecognised value is carried, never coerced.** `?sector=Energy` and
 * `?sector=tech` are both *not a sector we track* — `SECTORS`' members are the
 * slugs and nothing here upper-cases, lower-cases or prefix-matches, for
 * `use-security-symbol.ts`' stated reason: a client that silently answered a
 * question the address did not ask would be reporting on something else.
 *
 * An empty or whitespace-only value is **the address did not name one**, which
 * is `use-time-window.ts`' own rule for `?sessions=` — a parameter with
 * nothing in it is not somebody asking for something strange.
 */
export function readTopologyFilter(search: string): TopologyFilter {
  const named = new URLSearchParams(search).get(TOPOLOGY_SECTOR_PARAM)?.trim();

  if (named === undefined || named === "") {
    return { sector: null, unrecognised: null, search };
  }

  const sector = SECTORS.find((candidate) => candidate === named);

  return sector === undefined
    ? { sector: null, unrecognised: named, search }
    : { sector, unrecognised: null, search };
}

/**
 * The address that draws `sector` — or the whole market, for `null`.
 *
 * **Every control on this surface is a `<Link>` whose `href` this builds at
 * render**, never an imperative `setSearchParams` in a handler, which is what
 * keeps `one-home-for-imperative-navigation` satisfied by construction rather
 * than by a gap in what it greps for. The invariant's corpus is every shipped
 * source file in three trees and its clause is *the call that moves the
 * address* — so a region that resolves its destinations at render has nothing
 * for it to find.
 *
 * **`null` DELETES the parameter rather than writing a default**, which is
 * `securityPath`'s own rule and its consequence accepted here too: an address
 * that accretes every default is a session dump rather than a shareable link.
 */
export function topologySectorPath(
  search: string,
  sector: Sector | null,
): string {
  const params = new URLSearchParams(search);

  if (sector === null) params.delete(TOPOLOGY_SECTOR_PARAM);
  else params.set(TOPOLOGY_SECTOR_PARAM, sector);

  const query = params.toString();

  return query === "" ? PATHS.overview : `${PATHS.overview}?${query}`;
}

/**
 * The graph with one sector's equities drawn and the rest removed — or the
 * **same object**, by identity, for the whole market.
 *
 * The identity return is relied on rather than incidental: `topologySource`
 * memoises on identity and the renderer compares its own criterion before
 * doing any work, so *no filter* costs this surface nothing at all.
 *
 * Three things change together and that is the whole point of narrowing the
 * object rather than threading a predicate:
 *
 *   * **nodes** — every equity outside the sector goes; all fifteen landmarks
 *     stay (the module docblock's own reason);
 *   * **edges** — an edge survives only where both of its endpoints do, so the
 *     excluded sectors' 480 membership spokes and every correlation edge
 *     reaching out of the sector go with their nodes. The eleven hub edges all
 *     survive, because both of their endpoints are landmarks;
 *   * **clusters** — an excluded sector keeps its row and loses its
 *     `members`, which is what makes the keyboard walk agree: `ArrowDown` on a
 *     filtered-out sector ETF answers `null` because there is genuinely
 *     nothing drawn under it, rather than entering a cluster whose members
 *     draw no ink.
 */
export function narrowTopologyGraph(
  graph: TopologyGraph,
  sector: Sector | null,
): TopologyGraph {
  if (sector === null) return graph;

  const nodes = graph.nodes.filter(
    (node) => node.kind !== "equity" || node.cluster === sector,
  );

  const drawn = new Set<Ticker>(nodes.map((node) => node.symbol));

  return {
    nodes,
    edges: graph.edges.filter(
      (edge: TopologyEdge) => drawn.has(edge.from) && drawn.has(edge.to),
    ),
    clusters: graph.clusters.map((cluster) =>
      cluster.id === sector ? cluster : { ...cluster, members: [] },
    ),
  };
}

/** How many equities a graph draws. Read, never typed — see below. */
export function topologyEquityCount(graph: TopologyGraph): number {
  return graph.nodes.filter((node) => node.kind === "equity").length;
}

/**
 * **What the narrowed graph says about its own population — one builder, two
 * renderings** (Task 6.8.1, AC 1).
 *
 * `measured-set.ts`' discipline, which every counted and ranked surface on
 * this screen already follows: a graph showing 21 nodes with no statement of
 * what was excluded is a confident claim over a filtered set. So the figures
 * are **read off the two graphs** and never typed — `the-population-is-never-
 * a-literal` refuses the alternative by name — and the short line a reader
 * sees is the same string the listener's clause is composed from.
 *
 * **`null` when nothing is narrowed, which is an ABSENCE rather than a clause
 * about one.** `Movers`' age line and `topologyCorrelationClause`'s `loading`
 * arm both answer this way for the same reason: a sentence saying *the whole
 * market is drawn* on the state this screen is in 100% of the time until
 * somebody presses something is a sentence nobody needs.
 *
 * **It is a criterion rather than a measurement, so it does not borrow
 * `measured-set.ts`' grammar.** That module's sentences date an observation
 * window and name a tape, because what they qualify is a figure somebody
 * computed; this qualifies a **picture a reader asked for**, and the only
 * honest facts in it are how many of the tracked companies are drawn and which
 * sector they are.
 */
export function topologyFilterWords(
  graph: TopologyGraph,
  narrowed: TopologyGraph,
  filter: TopologyFilter,
): { readonly line: string; readonly clause: string } | null {
  const tracked = topologyEquityCount(graph);

  if (filter.unrecognised !== null) {
    // **Never the slug the address named**, which is the one thing this
    // sentence deliberately omits: it would be echoing unvalidated text from
    // the address into the page, and what a reader needs is which market is
    // on screen rather than what they mistyped.
    const line = "Not a sector we track — the whole market is drawn";
    return { line, clause: ` ${line}.` };
  }

  if (filter.sector === null) return null;

  const label = SECTOR_LABELS[filter.sector];
  const drawn = topologyEquityCount(narrowed);

  if (drawn === 0) {
    // Reachable on a store whose curated universe holds no equity in one
    // sector. **The criterion AND the population it was applied to**, which is
    // the no-match rule: *nothing matched* and *nothing is tracked* are two
    // different facts and a reader has to be told which.
    const line = `No ${label} company is tracked, of the ${String(tracked)} we track`;
    return { line, clause: ` ${line}. Show all returns the whole market.` };
  }

  const line = `${String(drawn)} of the ${String(tracked)} companies we track — ${label}`;

  return {
    line,
    clause:
      ` Narrowed to ${label}: ${String(drawn)} of the ${String(tracked)}` +
      ` companies we track are drawn. The other sectors' equities are not;` +
      ` their benchmark ETFs and the broad market remain, drawn quieter.`,
  };
}
