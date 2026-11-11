/**
 * **Narrowing the graph — the criterion, the narrowing and the words** (Task
 * 6.8.1 for the sector, Task 6.8.2 for the band).
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
 * full-universe layout**. So {@link narrowTopology} answers a
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
 * ## Two axes, and they are NOT the same kind of criterion
 *
 * **Sector membership is curated and static for the life of a page load.** It
 * is a column on `GET /securities`, and `?sector=energy` means the same thing
 * in ten minutes as it does now.
 *
 * **A band is a live measurement that changes up to sixteen times a minute**,
 * arrives through `TopologyRenderer.setBands` rather than through any prop
 * (`MarketTopology.tsx`'s own declined `React.memo` boundary depends on that
 * staying true), and **does not exist at all** on CI or on any store whose
 * nightly composite pass has never run. So three things follow, and all three
 * are this module's business rather than the renderer's:
 *
 *   * the band cut takes the treatment map as an **argument** — there is no
 *     band on a `TopologyNode`, and there must never be one, because the model
 *     is the curated universe and a model that carried a live reading would be
 *     a second home for `setBands`' own map;
 *   * where **nothing in the population is scored** the cut is **refused**
 *     rather than resolved to zero drawn nodes ({@link TOPOLOGY_BAND_REFUSAL})
 *     — Gate 1's own decision, and ADR 0029's rule about a fully-formed claim
 *     over an absence: *zero securities are high* is a confident statement
 *     about a market on the one state every gated machine is permanently in;
 *   * a reader's own **selection is pinned** through a band change
 *     ({@link narrowTopology}'s `pinned`), so a live batch never takes the
 *     node they are looking at away from them.
 */

import { ANOMALY_BANDS, SECTORS, SECTOR_LABELS } from "@marketpulse/shared";
import type {
  AnomalyBand,
  Sector,
  Ticker,
  TopologyGraph,
  TopologyNode,
} from "@marketpulse/shared";

import { countInWords } from "../market/index.js";
import { PATHS } from "../routes/paths.js";
import type {
  TopologyAnomalyTreatment,
  TopologyFilterCriterion,
} from "./renderer.js";

/**
 * The one query parameter this region reads for the sector, spelled once.
 *
 * `SESSIONS_PARAM`'s own precedent — the second occupant of this product's
 * query string, and the reason the name is a constant rather than a literal is
 * that it is written in a reader (`use-topology-filter.ts`), in a builder
 * ({@link topologySectorPath}) and in a browser spec, and three spellings of
 * one parameter is an address nobody can share.
 */
export const TOPOLOGY_SECTOR_PARAM = "sector";

/**
 * The band parameter, and it is **multi-valued** (Task 6.8.2).
 *
 * `?band=high,extreme` — comma-separated, because the four values are a set a
 * reader picks from rather than one of twelve mutually exclusive names, and
 * `high` **or** `extreme` is the question a reader actually has. A repeated
 * parameter (`?band=high&band=extreme`) was the alternative and is refused for
 * one reason: `topologyBandPath` has to build five destinations from whatever
 * else the address holds, and `URLSearchParams.set` on a repeated key is a
 * silent collapse of the others.
 */
export const TOPOLOGY_BAND_PARAM = "band";

/**
 * What the address says this graph is narrowed to.
 *
 * **Five fields rather than two, because the address can say something that
 * is not a sector and not a band.** `use-security-symbol.ts`' and
 * `use-time-window.ts`' rule, applied where there is no server to ask: this
 * client refuses nothing and repairs nothing — it draws the whole market and
 * **says so**, rather than snapping to a criterion nobody asked for or drawing
 * zero nodes from an unparseable address.
 */
export interface TopologyFilter {
  /** The sector drawn, or `null` for every sector. */
  readonly sector: Sector | null;

  /**
   * What the address named, when that was not a sector we track — `null`
   * otherwise. Carried rather than discarded so the region can state it: an
   * address that asks for something and gets the whole market with no
   * explanation is a page disagreeing with its own URL.
   */
  readonly unrecognised: string | null;

  /**
   * The bands drawn, **in {@link ANOMALY_BANDS}' own ascending order** and
   * deduplicated — empty for every band (Task 6.8.2).
   *
   * The canonical order rather than the address's, so `?band=extreme,high` and
   * `?band=high,extreme` are one picture **and one sentence**: the words this
   * module builds are read off this array, and two orders would be two
   * spellings of one criterion.
   */
  readonly bands: readonly AnomalyBand[];

  /**
   * What the address named in {@link TOPOLOGY_BAND_PARAM} that is not a band
   * we score. {@link unrecognised}'s own rule, and `"unscored"` is deliberately
   * one of these: it is the **absence** of a score rather than a reading of one
   * (`TopologyAnomalyTreatment`'s own docblock), so it is not a value a reader
   * can narrow to, and {@link TOPOLOGY_BAND_REFUSAL} is what this region says
   * about that state instead.
   */
  readonly unrecognisedBands: readonly string[];

  /**
   * The address's own query string, as read. {@link topologySectorPath} and
   * {@link topologyBandPath} build every one of this region's destinations
   * from it, so a parameter some other surface put there — including the other
   * one of these two — survives a press on either.
   */
  readonly search: string;
}

/** The whole market, with nothing named in the address. */
export const UNFILTERED_TOPOLOGY: TopologyFilter = {
  sector: null,
  unrecognised: null,
  bands: [],
  unrecognisedBands: [],
  search: "",
};

/**
 * Read the criterion out of a query string.
 *
 * **An unrecognised value is carried, never coerced.** `?sector=Energy` and
 * `?sector=tech` are both *not a sector we track*, and `?band=HIGH` is *not a
 * band we score* — `SECTORS`' and `ANOMALY_BANDS`' members are the spellings
 * and nothing here upper-cases, lower-cases or prefix-matches, for
 * `use-security-symbol.ts`'s stated reason: a client that silently answered a
 * question the address did not ask would be reporting on something else.
 *
 * An empty or whitespace-only value is **the address did not name one**, which
 * is `use-time-window.ts`' own rule for `?sessions=` — a parameter with
 * nothing in it is not somebody asking for something strange. The same goes
 * for an empty member of the band list, so `?band=high,` is one band.
 */
export function readTopologyFilter(search: string): TopologyFilter {
  const params = new URLSearchParams(search);
  const named = params.get(TOPOLOGY_SECTOR_PARAM)?.trim();
  const sector =
    named === undefined || named === ""
      ? undefined
      : SECTORS.find((candidate) => candidate === named);

  const spelled = (params.get(TOPOLOGY_BAND_PARAM) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");

  const bands = ANOMALY_BANDS.filter((band) => spelled.includes(band));
  const unrecognisedBands = [
    ...new Set(
      spelled.filter(
        (value) => !(ANOMALY_BANDS as readonly string[]).includes(value),
      ),
    ),
  ];

  return {
    sector: sector ?? null,
    unrecognised:
      named === undefined || named === "" || sector !== undefined
        ? null
        : named,
    bands,
    unrecognisedBands,
    search,
  };
}

/**
 * The address that draws `sector` — or every sector, for `null`.
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

  return addressOf(params);
}

/**
 * The address that **toggles** one band — or drops the cut entirely, for
 * `null` (Task 6.8.2).
 *
 * A toggle rather than a set, because the criterion is a set: the control's
 * five destinations are *every band* and *this band, in or out*, and a reader
 * who has `high` and wants `extreme` as well must be able to say so in one
 * press. {@link topologySectorPath}'s two rules hold unchanged — the whole
 * query string is carried through, and an empty criterion deletes the
 * parameter rather than writing `?band=`.
 *
 * **Written in {@link ANOMALY_BANDS}' order**, never in press order: the
 * address is a shareable statement of a criterion and two orderings of one
 * set would be two addresses for one picture.
 */
export function topologyBandPath(
  search: string,
  band: AnomalyBand | null,
): string {
  const params = new URLSearchParams(search);
  const current = readTopologyFilter(search).bands;

  const next =
    band === null
      ? []
      : ANOMALY_BANDS.filter((candidate) =>
          candidate === band
            ? !current.includes(candidate)
            : current.includes(candidate),
        );

  if (next.length === 0) params.delete(TOPOLOGY_BAND_PARAM);
  else params.set(TOPOLOGY_BAND_PARAM, next.join(","));

  return addressOf(params);
}

/**
 * The address with **every** cut dropped — the `Show all` link's destination
 * (widened at Task 6.8.2 from `topologySectorPath(search, null)`).
 *
 * One control that undoes everything, rather than one per parameter: the note
 * it sits in states one picture, and a reader who narrowed twice and pressed
 * *Show all* once would otherwise be left in a narrowed picture with the way
 * back already spent. Each control's own *All sectors* / *All bands* value is
 * still the per-axis way out.
 */
export function topologyClearPath(search: string): string {
  const params = new URLSearchParams(search);

  params.delete(TOPOLOGY_SECTOR_PARAM);
  params.delete(TOPOLOGY_BAND_PARAM);

  return addressOf(params);
}

/** `/` plus whatever is left of the query string. */
function addressOf(params: URLSearchParams): string {
  const query = params.toString();

  return query === "" ? PATHS.overview : `${PATHS.overview}?${query}`;
}

/**
 * The graph with the excluded equities removed — or the **same object**, by
 * identity, where nothing is excluded.
 *
 * The identity return is relied on rather than incidental: `topologySource`
 * memoises on identity and the renderer compares its own criterion before
 * doing any work, so *no filter* costs this surface nothing at all.
 *
 * Three things change together and that is the whole point of narrowing the
 * object rather than threading a predicate:
 *
 *   * **nodes** — every excluded equity goes; all fifteen landmarks stay (the
 *     module docblock's own reason);
 *   * **edges** — an edge survives only where both of its endpoints do, so the
 *     excluded sectors' 480 membership spokes and every correlation edge
 *     reaching out of the drawn set go with their nodes. The eleven hub edges
 *     all survive, because both of their endpoints are landmarks;
 *   * **clusters** — a cluster keeps its row and loses the members that are
 *     not drawn, which is what makes the keyboard walk agree: `ArrowDown` on a
 *     filtered-out sector ETF answers `null` because there is genuinely
 *     nothing drawn under it, rather than entering a cluster whose members
 *     draw no ink.
 */
function keepEquities(
  graph: TopologyGraph,
  keep: (node: TopologyNode) => boolean,
): TopologyGraph {
  const nodes = graph.nodes.filter(
    (node) => node.kind !== "equity" || keep(node),
  );

  if (nodes.length === graph.nodes.length) return graph;

  const drawn = new Set<Ticker>(nodes.map((node) => node.symbol));

  return {
    nodes,
    edges: graph.edges.filter(
      (edge) => drawn.has(edge.from) && drawn.has(edge.to),
    ),
    clusters: graph.clusters.map((cluster) => {
      const members = cluster.members.filter((member) => drawn.has(member));
      return members.length === cluster.members.length
        ? cluster
        : { ...cluster, members };
    }),
  };
}

/**
 * The graph narrowed to one sector's equities — or the same object, by
 * identity, for the whole market (Task 6.8.1).
 *
 * Kept as its own exported function beside {@link narrowTopology} because it
 * is the **curated** half: a pure function of the universe alone, with no
 * treatment map and no selection, which is what `graph-source.test.ts` and
 * `walk.test.ts` assert the keyboard walk against.
 */
export function narrowTopologyGraph(
  graph: TopologyGraph,
  sector: Sector | null,
): TopologyGraph {
  if (sector === null) return graph;

  return keepEquities(graph, (node) => node.cluster === sector);
}

/** How many equities a graph draws. Read, never typed — see below. */
export function topologyEquityCount(graph: TopologyGraph): number {
  return graph.nodes.filter((node) => node.kind === "equity").length;
}

/**
 * How many of a graph's equities carry a **real band** (Task 6.8.2).
 *
 * `"unscored"` is not one and neither is an absence: the renderer draws an
 * equity missing from the map as `normal`, which is a **drawing default**
 * rather than a reading (`renderer-canvas.ts`'s own `?? "normal"` carries that
 * note), and a cut that treated it as a score would claim the composite had
 * answered where it had not.
 *
 * This is the figure {@link TOPOLOGY_BAND_REFUSAL} is decided on, and it is
 * counted over the **sector-narrowed** population rather than the whole
 * universe — the sentence says *nothing **here** has been scored*, and a
 * reader looking at one sector is owed an answer about that sector.
 */
export function topologyScoredCount(
  graph: TopologyGraph,
  treatments: ReadonlyMap<Ticker, TopologyAnomalyTreatment>,
): number {
  let scored = 0;

  for (const node of graph.nodes) {
    if (node.kind !== "equity") continue;
    const treatment = treatments.get(node.symbol);
    if (treatment !== undefined && treatment !== "unscored") scored += 1;
  }

  return scored;
}

/**
 * **What a band filter says when nothing in the population has been scored**
 * — settled at Story 6.8's own Gate 1, verbatim.
 *
 * The alternative is resolving the cut to zero drawn nodes, and it is refused
 * because it would be *a fully-formed claim about zero scored securities on
 * the one state every gated machine is permanently in* — ADR 0029's false
 * impression, on CI's store (516 securities, zero bars, no composite
 * generation) and on the first ~46 s of every cold deploy.
 *
 * **It names what is missing, not a verdict.** No threshold, no connection
 * word and no status word — the same discipline `measured-set.ts`' age line
 * follows one screen over.
 */
export const TOPOLOGY_BAND_REFUSAL =
  "Nothing here has been scored yet, so the graph can't be narrowed by band.";

/**
 * **The two cuts the renderer applies, taken off what the address says**
 * (Task 6.8.2).
 *
 * The renderer has no business with `search` or with what a reader mistyped —
 * it draws a criterion. So this is the one conversion, and it carries one
 * decision: **an unrecognised value in either parameter applies NO cut at
 * all.** A partially-honoured address a reader mistyped is the silent snap
 * {@link readTopologyFilter} already refuses one level up — the whole market is
 * drawn and {@link topologyFilterWords} says which parameter was not
 * understood.
 */
export function topologyCriterion(
  filter: TopologyFilter,
): TopologyFilterCriterion {
  if (filter.unrecognised !== null || filter.unrecognisedBands.length > 0)
    return NO_CUT;

  return { sector: filter.sector, bands: filter.bands };
}

/** Stable, so a re-read of a mistyped address is the same criterion. */
const NO_CUT: TopologyFilterCriterion = { sector: null, bands: [] };

/** The graph a criterion draws, and the counts its sentence states. */
export interface TopologyNarrowing {
  /**
   * What is drawn, hit-tested and walked. The same object as the input, by
   * identity, where nothing is excluded.
   *
   * **It can hold one equity more than {@link matched} counts**, and that is
   * deliberate: see `pinned` on {@link narrowTopology}.
   */
  readonly graph: TopologyGraph;
  /** Equities in the whole universe — the sentence's denominator. */
  readonly tracked: number;
  /** Equities after the sector cut, or `null` where the address named none. */
  readonly inSector: number | null;
  /**
   * Equities matching the band cut, or `null` where none was applied — which
   * covers both *the address named no band* and {@link bandRefused}.
   */
  readonly matched: number | null;
  /** See {@link TOPOLOGY_BAND_REFUSAL}. */
  readonly bandRefused: boolean;
}

/**
 * Apply both cuts, in order: the curated one, then the measured one.
 *
 * **`treatments` is an argument rather than a field on the model**, which is
 * the module docblock's own second half — the band is `setBands`' map and
 * there is exactly one of it.
 *
 * **`pinned` is the reader's own selection, and it is never cut.** A live band
 * update must not take the node a reader is looking at away from them: the
 * same reasoning this product already applies to a revised bar under a
 * crosshair (*a reading that is stale about the minute it names is wrong in a
 * way a not-the-latest one is not*). So the selected equity stays in
 * {@link TopologyNarrowing.graph} — drawn, hit-testable, and in its cluster's
 * `members` so `walk.ts` can still step from it — while {@link
 * TopologyNarrowing.matched} counts the cut's own answer and does not include
 * it. The count is the criterion's; the picture is the criterion's plus the
 * one node the reader chose.
 *
 * **A reader changing the filter passes `pinned: null`**, because that is the
 * opposite case: the reader asked for a different picture, and a selection the
 * new criterion excludes is cleared with its own sentence
 * (`TopologySelectionSource`'s fourth value). The two cases are distinguished
 * at the one call site that can tell them apart — `setBands` against
 * `setFilter` in `renderer-canvas.ts`.
 *
 * **An unrecognised address never reaches here** — {@link topologyCriterion}
 * is where that decision lives, because it is a decision about an *address*
 * and this function takes a criterion.
 */
export function narrowTopology(
  graph: TopologyGraph,
  criterion: TopologyFilterCriterion,
  treatments: ReadonlyMap<Ticker, TopologyAnomalyTreatment>,
  pinned: Ticker | null,
): TopologyNarrowing {
  const tracked = topologyEquityCount(graph);

  const inSectorGraph = narrowTopologyGraph(graph, criterion.sector);
  const inSector =
    criterion.sector === null ? null : topologyEquityCount(inSectorGraph);

  if (criterion.bands.length === 0) {
    return {
      graph: inSectorGraph,
      tracked,
      inSector,
      matched: null,
      bandRefused: false,
    };
  }

  if (topologyScoredCount(inSectorGraph, treatments) === 0) {
    return {
      graph: inSectorGraph,
      tracked,
      inSector,
      matched: null,
      bandRefused: true,
    };
  }

  const wanted = new Set<AnomalyBand>(criterion.bands);
  const matches = (node: TopologyNode): boolean => {
    const treatment = treatments.get(node.symbol);
    return (
      treatment !== undefined &&
      treatment !== "unscored" &&
      wanted.has(treatment)
    );
  };

  let matched = 0;
  for (const node of inSectorGraph.nodes) {
    if (node.kind === "equity" && matches(node)) matched += 1;
  }

  return {
    graph: keepEquities(
      inSectorGraph,
      (node) => node.symbol === pinned || matches(node),
    ),
    tracked,
    inSector,
    matched,
    bandRefused: false,
  };
}

/**
 * The band criterion as a sentence says it — `high`, `high or extreme`,
 * `elevated, high or extreme`.
 *
 * Read off {@link ANOMALY_BANDS}' order rather than the array's, for
 * {@link TopologyFilter.bands}' own reason. `or` rather than `and`, because the
 * cut is a **union**: a security in any one of the named bands is drawn, and
 * *high and extreme* would describe a security that is both, which no security
 * can be.
 */
export function topologyBandWords(bands: readonly AnomalyBand[]): string {
  const ordered = ANOMALY_BANDS.filter((band) => bands.includes(band));

  if (ordered.length <= 1) return ordered[0] ?? "";

  return `${ordered.slice(0, -1).join(", ")} or ${String(ordered.at(-1))}`;
}

/** `none of…` at the head of a line, where a sentence wants a capital. */
const capitalised = (words: string): string =>
  `${words.slice(0, 1).toUpperCase()}${words.slice(1)}`;

/** What the landmark nodes do in every narrowed state. One home, two users. */
const LANDMARKS_REMAIN =
  " their benchmark ETFs and the broad market remain, drawn quieter.";

/**
 * **What the narrowed graph says about its own population — one builder, two
 * renderings** (Task 6.8.1, AC 1; the band's own clause Task 6.8.2).
 *
 * `measured-set.ts`' discipline, which every counted and ranked surface on
 * this screen already follows: a graph showing 21 nodes with no statement of
 * what was excluded is a confident claim over a filtered set. So the figures
 * are **read off {@link TopologyNarrowing}** and never typed —
 * `the-population-is-never-a-literal` refuses the alternative by name — and
 * the short line a reader sees is built from the same call as the listener's
 * clause.
 *
 * **Two clauses, and the grammar says which narrows what**: the sector
 * narrows the population *stated*, and the band is a cut *within it* — `69 of
 * the 501 companies we track are in Technology, and 12 of those are high or
 * extreme`. A band with no sector states the tracked population instead, so
 * neither clause is ever a figure with no denominator.
 *
 * **A zero conjunct is a word, never a bare `0`** — `measured-set.ts`'
 * {@link countInWords}, imported rather than re-spelled, for its own reason: a
 * clause reading *0 of those are high* is a figure where a word belongs.
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
 * honest facts in it are how many of the tracked companies are drawn, which
 * sector they are, and which band.
 */
export function topologyFilterWords(
  narrowing: TopologyNarrowing,
  filter: TopologyFilter,
): { readonly line: string; readonly clause: string } | null {
  const tracked = String(narrowing.tracked);

  if (filter.unrecognised !== null) {
    // **Never the slug the address named**, which is the one thing this
    // sentence deliberately omits: it would be echoing unvalidated text from
    // the address into the page, and what a reader needs is which market is
    // on screen rather than what they mistyped.
    const line = "Not a sector we track — the whole market is drawn";
    return { line, clause: ` ${line}.` };
  }

  if (filter.unrecognisedBands.length > 0) {
    // The sibling of the clause above, and it is a **second** sentence rather
    // than a widening of it: a reader who mistyped `sector` and one who
    // mistyped `band` need to know which of the two parameters this page did
    // not understand, and *not a filter we recognise* names neither.
    const line = "Not a band we score — the whole market is drawn";
    return { line, clause: ` ${line}.` };
  }

  const label = filter.sector === null ? null : SECTOR_LABELS[filter.sector];
  const words = topologyBandWords(filter.bands);

  if (label === null && words === "") return null;

  if (label !== null && narrowing.inSector === 0) {
    // Reachable on a store whose curated universe holds no equity in one
    // sector. **The criterion AND the population it was applied to**, which is
    // the no-match rule: *nothing matched* and *nothing is tracked* are two
    // different facts and a reader has to be told which. The band conjunct is
    // withheld entirely — there is no population here for it to cut.
    const line = `No ${label} company is tracked, of the ${tracked} we track`;
    return { line, clause: ` ${line}. Show all returns the whole market.` };
  }

  const inSector = String(narrowing.inSector);

  if (narrowing.bandRefused) {
    const refusal = TOPOLOGY_BAND_REFUSAL;

    if (label === null) {
      return {
        line: refusal,
        clause: ` ${refusal} The whole market is drawn.`,
      };
    }

    const drawn = `${inSector} of the ${tracked} companies we track are in ${label}`;
    return {
      line: `${drawn}. ${refusal}`,
      clause:
        ` Narrowed to ${label}: ${drawn}, and all of them are drawn.` +
        ` ${refusal}`,
    };
  }

  if (words === "") {
    // Sector alone — Task 6.8.1's own two strings, unchanged.
    return {
      line: `${inSector} of the ${tracked} companies we track — ${String(label)}`,
      clause:
        ` Narrowed to ${String(label)}: ${inSector} of the ${tracked}` +
        ` companies we track are drawn. The other sectors' equities are not;` +
        LANDMARKS_REMAIN,
    };
  }

  if (narrowing.matched === null) {
    // **Unreachable rather than asserted away**, and `?? 0` is what this
    // replaces: `no-imputed-zero-in-a-figure` refuses an absent measurement
    // defaulted to zero, because *none of the 501 are extreme* and *we did not
    // count* are two different claims and the second must never be drawn as
    // the first. Every arm that can leave `matched` null has returned above —
    // no band named, and the refusal — so this proves the type rather than
    // casting past it.
    return null;
  }

  const matched = countInWords(narrowing.matched);

  if (label === null) {
    const drawn = `${capitalised(matched)} of the ${tracked} companies we track are ${words}`;
    return {
      line: drawn,
      clause:
        ` Narrowed to ${words}: ${matched} of the ${tracked} companies we` +
        ` track are ${words}, and only those are drawn. The others are not;` +
        LANDMARKS_REMAIN,
    };
  }

  const line =
    `${inSector} of the ${tracked} companies we track are in ${label},` +
    ` and ${matched} of those are ${words}`;

  return {
    line,
    clause:
      ` Narrowed to ${label} and ${words}: ${line}, and only those are drawn.` +
      ` The other equities are not;` +
      LANDMARKS_REMAIN,
  };
}

/**
 * Whether the address names **any** criterion — the one question that can be
 * answered without a treatment map (Task 6.8.2).
 *
 * `MarketTopology.tsx`'s own reason for needing it: whether the population
 * note is on screen is React's to decide at render, and its **text** is
 * written imperatively because the band's own counts arrive through
 * `setBands` and must never become a prop that changes at feed cadence. So the
 * presence and the content are two questions, and this is the one React may
 * ask.
 */
export function topologyFilterNames(filter: TopologyFilter): boolean {
  return (
    filter.sector !== null ||
    filter.unrecognised !== null ||
    filter.bands.length > 0 ||
    filter.unrecognisedBands.length > 0
  );
}
