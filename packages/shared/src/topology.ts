/**
 * **The market topology as domain data** — nodes, edges and clusters, with no
 * renderer anywhere in it (Task 6.1.1).
 *
 * Story 6.1's acceptance criterion 2: *the graph model lives in
 * `packages/shared` and holds no renderer type.* It is here rather than in
 * `apps/frontend/src/topology/` for the reason `market-time.ts` is here —
 * **two processes read it**. Epic 7's `get_related_securities` and
 * `highlight_graph_nodes` are server-side tools answering questions about this
 * graph, and `packages/shared` is consumed by a Fastify server, so a model
 * carrying a `Graph` from graphology or an `HTMLElement` would drag a
 * browser-oriented mutable structure into a process that has no DOM.
 *
 * It is also what makes Story 6.1's renderer comparison honest: both
 * candidates read **this** graph and **this** layout, so what the frame rate
 * measures is drawing rather than two different layouts. That is the confound
 * the story's own shaping found in a force-directed layout, and the whole
 * reason this task exists before the renderer one.
 *
 * ## What is deliberately absent
 *
 * No colour, no pixel, no node radius, no anomaly band, no price. The test is
 * `security.ts`' own: is the field a fact about the market's structure, or a
 * fact about how one surface draws it? Shape, size and hue are the renderer's,
 * decided on the design canvas (`The graph at rest.dc.html`) and spent through
 * tokens; coordinates are {@link ./topology-layout.js}'s, in abstract units.
 *
 * **And no `weight` on an edge.** A membership has no strength: `AAPL` is in
 * the technology sector, and a field whose only possible value is `1` has no
 * producer and invites a renderer to encode it. **Reversal trigger, a
 * condition:** *the first edge kind whose strength is a measurement rather
 * than a membership* — which is a correlation, where the coefficient **is** the
 * edge. At that point `TopologyEdge` gains a weight that is required on that
 * kind and structurally absent on these two, the way
 * {@link IndexEtfSecurity.sector} is absent rather than null, rather than an
 * optional number every reader has to branch on.
 *
 * **That trigger FIRED on 2026-11-06 (Task 6.5.2) and was honoured to the
 * letter rather than reinterpreted.** `TOPOLOGY_EDGE_KINDS` has a third
 * member, `TopologyEdge` is a union of {@link TopologyMembershipEdge} and
 * {@link TopologyCorrelationEdge}, and the weight is **required on the new
 * kind and structurally absent on the two old ones** — not optional anywhere.
 * What the trigger's own wording did not say, and what this file settles
 * instead, is **where the correlation comes from**: {@link buildTopologyGraph}
 * is unchanged, down to its signature, and the merge is
 * {@link withCorrelationEdges} — a second pure function taking the measured
 * set as an **argument**. So the builder stays a function of the curated
 * universe alone (which is what Epic 7's server-side readers and Epic 13's
 * replay refusal are both written against), and the one thing in this model
 * that is not derivable from a `Security[]` is the one thing a caller has to
 * hand it.
 *
 * `STORY.md`'s design work is the argument for what is drawn; this file is the
 * vocabulary. Where they disagree, the one with the rejected alternatives in it
 * is the one that was thought about.
 */

import { SECTOR_ETFS, SECTOR_LABELS, SECTORS } from "./security.js";
import type { Sector, Security, SecurityKind } from "./security.js";
import { toTicker } from "./ticker.js";
import type { Ticker } from "./ticker.js";

/**
 * The broad-market hub — the one node every sector ETF is attached to.
 *
 * It is named here, in the model, rather than taken as a parameter, because
 * which fund partitions into the eleven sector SPDRs is a **fact about those
 * funds** and not a choice this graph makes: `SECTOR_ETFS` is a total map over
 * `SECTORS`, and the eleven Select Sector SPDRs are by construction a partition
 * of the S&P 500, which is what `SPY` tracks. `QQQ`, `DIA` and `IWM` carry no
 * such relationship — see {@link buildTopologyGraph}.
 *
 * `apps/frontend/src/market/relative-performance.ts` spells the same ticker as
 * `BROAD_MARKET`, and the two are **not** a duplicated fact: that one is *the
 * reference a security's move is compared against*, a measurement choice; this
 * one is *the fund whose constituents the eleven sector ETFs partition*, a
 * structural one. They agree today and would not necessarily agree if either
 * question were re-answered — a total-market fund would be a better comparison
 * reference and a worse hub.
 */
export const TOPOLOGY_HUB: Ticker = toTicker("SPY");

/**
 * Why two nodes are joined.
 *
 * ~~Two members, and both are **curated facts rather than measurements**~~ —
 * **three since 2026-11-06 (Task 6.5.2), and the third is the measurement the
 * other two reserved a channel for.** The struck sentence is kept because it
 * is the premise the module docblock's own reversal trigger was written
 * against, and that trigger has now fired exactly as worded.
 *
 * - `sector_membership` — an equity to its sector's benchmark ETF, 501 of them.
 * - `index_membership` — a sector ETF to {@link TOPOLOGY_HUB}, eleven of them.
 * - `return_correlation` — two equities whose 60-session grids of 5-minute
 *   returns move together, **as a nightly pass measured them** (ADR 0049).
 *   The only kind carrying a weight, and the only kind that is not derivable
 *   from the curated universe: it arrives as a second, explicit input through
 *   {@link withCorrelationEdges} rather than as something
 *   {@link buildTopologyGraph} reads.
 *
 * `PRODUCT_SPEC.md` §10 names one further relationship and it is still not
 * here: *common industry* is curated and free but would add an edge set an
 * order of magnitude denser with no benchmark node to converge on. It is a
 * later story's and arrives as a new member of this list.
 */
export const TOPOLOGY_EDGE_KINDS = [
  "sector_membership",
  "index_membership",
  "return_correlation",
] as const;

/** One of {@link TOPOLOGY_EDGE_KINDS}. */
export type TopologyEdgeKind = (typeof TOPOLOGY_EDGE_KINDS)[number];

/**
 * One security, as the graph sees it.
 *
 * Identity is {@link symbol} — the **wire and domain field**, which is Story
 * 6.1's acceptance criterion 4 and the rule Story 4.6 settled for a surface
 * whose members move. Not *ticker*, which is the display word a reader meets at
 * `/securities/:symbol`: a second field name for one fact is exactly what
 * `search-and-the-universe-share-no-words` exists to prevent.
 */
export interface TopologyNode {
  /** The security's own identity. Every edge and placement keys on this. */
  readonly symbol: Ticker;

  /**
   * What a reader sees beside the node — the company or fund name.
   *
   * At rest the renderer draws **none** of these: 501 tickers at ~26 px each do
   * not fit without a 5× frame or a non-deterministic collision pass. The
   * field is here because hover, selection and the text alternative all need a
   * word, and resolving one from a second lookup at draw time is a second home
   * for a fact the node already carries.
   */
  readonly label: string;

  /** Which of the three marks the renderer draws. Shape carries kind. */
  readonly kind: SecurityKind;

  /**
   * Which cluster this node sits in, or `null` for a market proxy.
   *
   * **`null` is the complete answer and not a missing one**, which is
   * `IndexEtfSecurity.sector`'s own distinction: an index proxy does not belong
   * to a sector. There is deliberately **no twelfth pseudo-sector** for the
   * four of them — `SECTORS` owns that vocabulary, eleven members, and a
   * `"market"` entry smuggled in here would reach `SECTOR_LABELS`, the eleven
   * ranked rows on `/`, and every reader that iterates the union.
   *
   * The serialiser trap travels with this field and is the reason it is a union
   * rather than an optional: a `null` under a response schema's declared
   * `"string"` reaches the wire as `""`, and under a `"number"` as a plausible
   * `0`. Whatever carries this across a wire in Epic 7 declares it nullable
   * explicitly.
   */
  readonly cluster: Sector | null;
}

/**
 * One **membership** relationship, as a pair of symbols.
 *
 * **`from` is the member and `to` is the thing it belongs to**, for both kinds
 * — equity → its sector's ETF, sector ETF → the hub. The adjacency is
 * undirected as drawn (the design work describes the hub edges the other way
 * round, as `SPY` → each sector ETF, and means the same eleven lines); the
 * ordering here is a convention so that *membership* reads the same direction
 * in both kinds and a reader walking `from` is always walking **up** the
 * containment chain.
 *
 * **No `weight`, and it is structurally absent rather than optional** — the
 * shape the module docblock pre-committed to, which is
 * {@link IndexEtfSecurity.sector}'s own distinction and not a style: under
 * `exactOptionalPropertyTypes` a `weight?: number` would make every reader
 * branch on an absence that cannot occur, and would let a renderer encode a
 * membership's strength, of which there is none.
 */
export interface TopologyMembershipEdge {
  /** The member. */
  readonly from: Ticker;
  /** What it belongs to. */
  readonly to: Ticker;
  /** The two curated kinds. See {@link TOPOLOGY_EDGE_KINDS}. */
  readonly kind: "sector_membership" | "index_membership";
}

/**
 * One **measured** relationship between two equities (Task 6.5.2, ADR 0049).
 *
 * ## `from` is the lexicographically LOWER ticker, always
 *
 * Which is a convention this kind introduces rather than one it inherits:
 * {@link TopologyMembershipEdge}'s `from` is *the member*, and a correlation
 * has no member and no containment — it is symmetric, and a pair stored once
 * needs an order to be stored *in*. The order is the **ticker** order, which
 * is `0018` §3's own canonicalisation and ADR 0049's, chosen there because
 * `securities.id` is assigned in row-insertion order and CI's store and the
 * deployed store disagree about that order. So the stored row and the drawn
 * edge agree about which end is which **by sharing one rule**, rather than by
 * two layers happening to sort the same way — and {@link TopologyGraph}'s
 * byte-comparable sort therefore survives a store whose ids run backwards.
 *
 * ## The weight is REQUIRED, signed, and not re-judged here
 *
 * The coefficient *is* the edge: a correlation with no number is not a weaker
 * claim, it is no claim. **Signed** rather than a magnitude, because −0.9 and
 * +0.9 are opposite facts about the market and a renderer that wants the
 * magnitude can take one; a model that threw the sign away could not give it
 * back. Nothing here applies a floor — STORY.md's resolved Open Decision 3 is
 * *no edge below a derived floor*, enforced by the pass through a Fisher-z
 * interval at that pair's own counted overlap, which is a statistical
 * judgement over a sample this model never sees.
 */
export interface TopologyCorrelationEdge {
  /** The pair's lower ticker. See this type's own note. */
  readonly from: Ticker;
  /** The pair's higher ticker. */
  readonly to: Ticker;
  readonly kind: "return_correlation";
  /** Pearson's `r` over the two return grids, signed, in `[-1, 1]`. */
  readonly weight: number;
}

/**
 * One relationship — a membership or a measurement.
 *
 * **A discriminated union on `kind` rather than one interface with an optional
 * weight**, which is the module docblock's own pre-committed shape: a reader
 * that has narrowed to `return_correlation` has a `number`, and a reader
 * holding a membership edge cannot ask for one at all.
 */
export type TopologyEdge = TopologyMembershipEdge | TopologyCorrelationEdge;

/**
 * One sector, with its members.
 *
 * **The cluster is drawn by its edges and has no treatment of its own** — no
 * hull, no wash, no eleven-colour palette (rejected on the canvas for three
 * independent reasons, any one fatal). A sector reads as a group because _n_
 * faint spokes converge on one near-black square. So this type carries no
 * geometry and no appearance: what it is **for** is the layout's wedge
 * allocation, Epic 7's *which securities are related to this one*, and Story
 * 6.8's filter.
 *
 * {@link members} holds the equities only, not the benchmark ETF — the ETF is
 * the thing they are members **of**, and including it would make
 * `members.length` disagree with the edge count for that sector by one.
 */
export interface TopologyCluster {
  /** The sector itself. See {@link SECTORS}. */
  readonly id: Sector;
  /** How the sector is written when a human reads it, from `SECTOR_LABELS`. */
  readonly label: string;
  /** The equities in it, sorted by symbol. Never the benchmark ETF. */
  readonly members: readonly Ticker[];
}

/**
 * The whole graph.
 *
 * **Every array is sorted and every array is `readonly`**, which is what makes
 * two runs over one input byte-comparable — acceptance criterion 3's cheap
 * half, and the premise the layout's determinism rests on. Nodes by `symbol`,
 * clusters by `id`, edges by `from` then `to` then `kind`; members within a
 * cluster by symbol.
 *
 * **Clusters are sorted by `id` and that is NOT their drawn order.** The wedge
 * order is `SECTORS`' own declaration order — see
 * {@link ./topology-layout.js} — and the two are deliberately different
 * questions: this array is a lookup, that sequence is a picture.
 */
export interface TopologyGraph {
  readonly nodes: readonly TopologyNode[];
  readonly edges: readonly TopologyEdge[];
  readonly clusters: readonly TopologyCluster[];
}

/** `Array.prototype.sort` comparator over two tickers, ascending. */
function bySymbol(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * {@link TopologyGraph.edges}' own order — `from`, then `to`, then `kind` —
 * **in one place**, because two producers write that array now (Task 6.5.2).
 *
 * It is the whole of what makes two runs over one input byte-comparable, which
 * `topology-layout.ts` and Story 6.1's renderer comparison both rest on, and a
 * second copy of it in {@link withCorrelationEdges} is how the two would come
 * to disagree about an edge whose `from` and `to` match a membership edge's.
 */
function byEdge(left: TopologyEdge, right: TopologyEdge): number {
  return (
    bySymbol(left.from, right.from) ||
    bySymbol(left.to, right.to) ||
    bySymbol(left.kind, right.kind)
  );
}

/**
 * One measured pair, as {@link withCorrelationEdges} takes it.
 *
 * **The wire's own field names and no renderer vocabulary** — `low`/`high` are
 * `0018`'s columns and `CorrelationPayload`'s fields, so the route's body is
 * this type's shape with nothing in between to map wrongly; `r` is the
 * coefficient, spelled as `return-correlation.ts` spells it. Orientation is
 * *not* trusted: see that function's own account.
 */
export interface TopologyCorrelation {
  readonly low: Ticker;
  readonly high: Ticker;
  /** Pearson's `r`, signed. */
  readonly r: number;
}

/**
 * Build the graph from the tracked universe. **Pure and total** — no clock, no
 * handle, no socket, and the same input twice gives the same bytes.
 *
 * ## It filters on `status === "active"`, and that is a decision
 *
 * This is a *computing-over-the-market-we-track-**now*** reader, which
 * `UNIVERSE.md` §12.2 permits: a topology is a claim about how the market is
 * arranged today, so an untracked security is not a node. The two symbols
 * untracked on 2026-10-12 keep their rows and their stored bars and are absent
 * from this graph, which is the correct behaviour for a picture of the present.
 *
 * ## Epic 13 — a replayed topology must REFUSE, not fall back
 *
 * **This is a hand-off written in words rather than as a link, because a
 * pointer is what a reader follows when they already know to look.**
 *
 * The filter above is exactly the shape invariant 4's dated qualification
 * names: a computation over the universe as it stands **now**, presented as a
 * description of a session. Replay a past session through this function as it
 * is written and you get **today's roster** of securities, clustered by
 * **today's** curated sectors, drawn under a replay clock claiming to show an
 * earlier day — present information reaching a replayed past, in the one place
 * the invariant promises that is structurally impossible.
 *
 * `security_memberships` is the table that answers it, and the constraints are
 * arithmetic rather than preference:
 *
 *   1. **The history begins on 2026-10-12.** It says nothing whatever about any
 *      session before that date, and the data to answer *which securities were
 *      tracked then* does not exist and cannot be reconstructed. So a replayed
 *      topology of an earlier session must **refuse** — a first-class outcome,
 *      invariant 5 — and must not fall back to this function's roster. A
 *      refusal is visible; a graph of today's universe labelled with last
 *      year's date is not.
 *   2. **The read takes the replay clock EXPLICITLY.** That table's own column
 *      is `effective_from`, carrying the curated file's date, deliberately not
 *      `observed_at` — so a generic temporal plugin keyed on `observed_at` does
 *      not cover it, and a replay-aware `buildTopologyGraph` is one that is
 *      **handed** a membership set as of an instant rather than one that reads
 *      a clock. Nothing in this module reads a clock today, which is why the
 *      change is a parameter and not a rewrite.
 *   3. **The sector is as curated then, not as curated now.** Membership
 *      answers *was this security tracked*; it does not answer *which sector it
 *      was in*, and the technology / communication services / consumer
 *      discretionary boundary is the arguable one this product's own universe
 *      file flags. A replayed clustering that is right about the roster and
 *      wrong about eleven wedges is the same class of defect one layer in.
 *
 * The shape of the repair has somewhere to land: this function's only inputs
 * are the securities handed to it, so the fix is a caller change plus a
 * refusal, not a redesign.
 */
export function buildTopologyGraph(
  securities: readonly Security[],
): TopologyGraph {
  const tracked = securities.filter((security) => security.status === "active");

  const nodes: TopologyNode[] = tracked
    .map((security) => ({
      symbol: security.symbol,
      label: security.name,
      kind: security.kind,
      // `sector` is `Sector` on both an equity and a sector proxy and `null` on
      // an index proxy, so the union already carries the answer and there is
      // nothing to decide here. A `??` or an `if` would be inventing one.
      cluster: security.sector,
    }))
    .sort((left, right) => bySymbol(left.symbol, right.symbol));

  // Which symbols are actually nodes. Every edge below is required to have
  // BOTH endpoints in here — ADR 0029 applied to a line: a claim about data
  // requires data, and an edge to a node nothing drew is a dangling reference
  // every renderer then has to decide what to do about.
  const present = new Set<string>(nodes.map((node) => node.symbol));

  const clusters: TopologyCluster[] = SECTORS.map((sector) => ({
    id: sector,
    label: SECTOR_LABELS[sector],
    members: tracked
      .filter(
        (security) => security.kind === "equity" && security.sector === sector,
      )
      .map((security) => security.symbol)
      .sort(bySymbol),
  })).sort((left, right) => bySymbol(left.id, right.id));

  // `TopologyMembershipEdge[]` rather than `TopologyEdge[]`: this function
  // produces no measurement, and the narrower type is what makes that a
  // compile error rather than a comment.
  const edges: TopologyMembershipEdge[] = [];

  // One membership edge per tracked equity, to its own sector's benchmark.
  // `SECTOR_ETFS` is the one home for that pairing and is read rather than
  // inverted — `one-pairing-of-a-sector-and-its-benchmark` holds it there, and
  // the defect it exists for is a permutation in which every number on screen
  // stays right.
  for (const security of tracked) {
    if (security.kind !== "equity") continue;

    const benchmark = SECTOR_ETFS[security.sector];
    if (!present.has(benchmark)) continue;

    edges.push({
      from: security.symbol,
      to: benchmark,
      kind: "sector_membership",
    });
  }

  // Eleven hub edges, and the three refusals beside them are the point.
  //
  // `SPY`'s partition by the eleven sector SPDRs is a recorded, derivable fact
  // — `SECTOR_ETFS` is total over `SECTORS`. `QQQ` and `DIA` are overlapping
  // subsets this product stores **no constituent list for**, and `IWM` is
  // disjoint from the S&P 500 **by construction**, so for that one there is no
  // relationship to draw rather than merely an unrecorded one. Three nodes with
  // no edges is ADR 0029 applied to a line; three nodes joined on a guess would
  // be a drawn claim this product cannot back.
  if (present.has(TOPOLOGY_HUB)) {
    for (const sector of SECTORS) {
      const benchmark = SECTOR_ETFS[sector];
      if (!present.has(benchmark)) continue;

      edges.push({
        from: benchmark,
        to: TOPOLOGY_HUB,
        kind: "index_membership",
      });
    }
  }

  edges.sort(byEdge);

  return { nodes, edges, clusters };
}

/**
 * Add the measured edges to a graph. **Pure and total** — the same two inputs
 * twice give the same bytes, and the graph handed in is not touched (Task
 * 6.5.2).
 *
 * ## Why this is not a second argument to {@link buildTopologyGraph}
 *
 * That function is *the market's arrangement as the curated universe records
 * it*, and three readers depend on it being exactly that: Epic 7 answers
 * structural questions about the graph server-side, Epic 13 has to **refuse** a
 * replayed topology rather than fall back to today's roster, and Story 6.1's
 * renderer comparison rests on one graph from one input. A correlation is none
 * of those things — it is a nightly measurement that exists on one store and
 * not another — so it arrives as a separate step, and a caller with no
 * measurement simply does not take it.
 *
 * ## Three refusals, each one ADR 0029 applied to a line
 *
 * 1. **An endpoint that is not a node is dropped**, which is
 *    {@link buildTopologyGraph}'s own `present.has()` discipline: a retained
 *    pair naming a security untracked since the pass ran is a real, reachable
 *    state, and an edge to a node nothing drew is a dangling reference every
 *    renderer then has to decide what to do about.
 * 2. **A self-pair is dropped.** `0018`'s `return_correlations_no_self_pair`
 *    makes it unstorable, so this guards a caller rather than a row — and the
 *    thing it prevents is a zero-length segment, which is the one input the
 *    renderer's own end-clearance arithmetic cannot shorten.
 * 3. **A repeated pair is dropped, first occurrence kept**, in either
 *    orientation. Two rows for one pair are two strokes on one line — double
 *    ink a reader reads as a stronger relationship, and a reach count that
 *    over-reports. The store's own unique index refuses it; a second home for
 *    the measured set (a cache, a merge of two generations) would not.
 *
 * **It does NOT filter on node kind**, and that is deliberate: *no landmark
 * node ever forms a correlation pair* is the pass's rule (STORY.md's resolved
 * Open Decision 4, asserted on the producer), and a second copy of it here
 * would be a second home for one judgement — which is also the one that would
 * go stale first, because this function cannot see why a pair was eligible.
 * The condition for moving it here: **a second producer of correlation input
 * that is not `return_correlations`.**
 *
 * @param correlations the retained pairs, in any order and any orientation
 */
export function withCorrelationEdges(
  graph: TopologyGraph,
  correlations: readonly TopologyCorrelation[],
): TopologyGraph {
  const present = new Set<string>(graph.nodes.map((node) => node.symbol));
  const seen = new Set<string>();

  const measured: TopologyCorrelationEdge[] = [];

  for (const pair of correlations) {
    if (pair.low === pair.high) continue;
    if (!present.has(pair.low) || !present.has(pair.high)) continue;

    // The canonical order is the TICKER order, resolved here rather than
    // trusted from the caller — see {@link TopologyCorrelationEdge}. A row
    // that arrives the other way round is the same edge, and sorting it here
    // is what makes `seen` able to recognise it as one.
    const [from, to] =
      bySymbol(pair.low, pair.high) <= 0
        ? [pair.low, pair.high]
        : [pair.high, pair.low];

    const key = `${from} ${to}`;
    if (seen.has(key)) continue;
    seen.add(key);

    measured.push({ from, to, kind: "return_correlation", weight: pair.r });
  }

  // **One comparator, the builder's own**, so the three kinds interleave by
  // one rule rather than correlation edges landing in a block of their own —
  // which is what keeps `TopologyGraph`'s stated byte-comparable-sort
  // guarantee a property of the whole array rather than of two halves of it.
  const edges = [...graph.edges, ...measured].sort(byEdge);

  return { nodes: graph.nodes, edges, clusters: graph.clusters };
}
