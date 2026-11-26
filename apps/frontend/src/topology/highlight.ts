/**
 * **What a highlight is, which nodes it quietens, and the words beside it**
 * (Task 7.4.2).
 *
 * ## Pure, for `filter.ts`'s own reason, which has now held four times
 *
 * jsdom has no 2d context, so `renderer-canvas.ts` is unreachable below
 * `pnpm e2e` — and *which securities recede* is exactly the sort of arithmetic
 * that is wrong in a way nobody notices, because every individual answer looks
 * plausible. Nothing here touches a DOM, a canvas, a clock or a view: a command
 * in, a set out; a command in, two strings out.
 *
 * ## The set is `{subject} ∪ symbols`, assembled HERE and nowhere else
 *
 * `HighlightNodesCommand` excludes the subject from its own `symbols` —
 * structurally, validated at the decode boundary, because a note that cannot
 * name what the set is related *to* can only say *these are related*, which is
 * not a sentence. So the drawn set is one union, and it is computed in one
 * place: the subject is drawn as an ordinary member of the highlight (Gate 1 —
 * giving it the selection disc or a sixth mark would both lie about what the
 * reader did, since they selected nothing and a deterministic step chose this).
 *
 * ## Complement de-emphasis, and the four rules are one function
 *
 * Gate 1 settled the treatment as **dim the non-peers, add zero new ink to the
 * peers**: both of this canvas's budgets are measurably exhausted (the 0–13 CSS
 * px radius budget is fully allocated across five existing node treatments, and
 * the whole palette is spent on chrome, price and the anomaly ramp). The four
 * rules that travel with it — landmarks excluded entirely, a measured band
 * never dimmed, nothing at all quietened while no highlight is in force, and
 * the complement only — all live in {@link topologyHighlightTreatment}, so a
 * renderer picks an array rather than re-deriving a policy, and a test can
 * prove each rule without a canvas.
 *
 * ## The strings are a reading of the COMMAND, never of what is drawn
 *
 * The note names the subject, counts the related securities and names the kinds
 * of relationship present. It deliberately states nothing about how many of
 * them a reader's own filter is currently hiding — that count is Task 7.4.4's,
 * and a figure with two authors is the collision this region has already paid
 * for twice.
 */

import { TOPOLOGY_EDGE_KINDS } from "@marketpulse/shared";
import type { TopologyEdgeKind, TopologyNode } from "@marketpulse/shared";

import type { TopologyAnomalyTreatment } from "./renderer.js";

/**
 * One permitted `highlightNodes` command, in the vocabulary a browser holds it
 * in.
 *
 * **Plain `string`s rather than `Ticker`/`TopologyEdgeKind`**, which is
 * `investigation-event.ts`'s own rule for a fact that arrived over a wire: the
 * backend's command carries branded tickers and a closed union, the wire
 * carries JSON, and the browser re-narrows each where it uses it — a symbol
 * against the graph it has already drawn (an unknown one matches no node and
 * therefore quietens nothing), a relation against
 * {@link TOPOLOGY_EDGE_KINDS} here.
 *
 * It carries **no investigation id and no step id**, which is a boundary rather
 * than an omission: this module and this region draw a highlight, and what
 * produced it is the route's business. (It is also what keeps
 * `no-second-affordance-on-a-topology-node` green over this directory — that
 * check reads every non-comment line here for the name of the thing that
 * produced this command, and finds none.)
 */
export interface TopologyHighlight {
  /** What the set is related to. Drawn as an ordinary member of it. */
  readonly subject: string;
  /** The related securities. Never carries {@link subject}. */
  readonly symbols: readonly string[];
  /** Which kinds of relationship the set was gathered by. */
  readonly relations: readonly string[];
}

/**
 * The symbols drawn at full strength — `{subject} ∪ symbols`.
 *
 * A `Set<string>` rather than `Set<Ticker>`: `Ticker` is `string & brand`, so
 * every node's own symbol is testable against this without a cast, and a
 * symbol the wire carried that this universe does not track simply matches
 * nothing.
 */
export function topologyHighlightSet(
  highlight: TopologyHighlight,
): ReadonlySet<string> {
  return new Set<string>([highlight.subject, ...highlight.symbols]);
}

/** How loudly one node draws while a highlight is in force. */
export type TopologyHighlightTreatment = "full" | "quiet";

/**
 * **Whether this node recedes** — the whole of Gate 1's complement
 * de-emphasis, as one decision in one place.
 *
 * Four rules, and each of them is a conjunct below:
 *
 *   1. **No highlight, nothing quiet.** `null` is the state every page is in
 *      until a command arrives, and it must be byte-identical to the picture
 *      this region drew before this task existed.
 *   2. **The fifteen landmarks never participate** — Story 6.3's own exclusion
 *      set, reused rather than re-derived: the eleven sector SPDRs, the four
 *      proxies and the hub are outside every per-node encoding this canvas
 *      draws, and a highlight is the fourth to respect that. (A command
 *      legitimately *names* a landmark — an equity's `sector_membership` reaches
 *      its own benchmark ETF — so the exclusion is about what is drawn
 *      differently, not about what the set contains.)
 *   3. **A measured `extreme` is never dimmed.** That band is the only one
 *      whose reading reaches the node's own fill (Story 6.3's Decision 1), and
 *      quietening it would overwrite a measurement with a relevance judgement.
 *      The `elevated`/`high` rings need no conjunct here: they are drawn in
 *      their own pass, at full strength, from arrays this partition does not
 *      touch.
 *   4. **The complement, never the set.** A highlighted node draws exactly what
 *      it drew before — zero new ink.
 */
export function topologyHighlightTreatment(
  node: TopologyNode,
  treatment: TopologyAnomalyTreatment | null,
  highlighted: ReadonlySet<string> | null,
): TopologyHighlightTreatment {
  if (highlighted === null) return "full";
  if (node.kind !== "equity") return "full";
  if (treatment === "extreme") return "full";

  return highlighted.has(node.symbol) ? "full" : "quiet";
}

/**
 * What each kind of relationship is called in a sentence.
 *
 * **A total record over the shared vocabulary**, so a fourth edge kind is a
 * compile error here naming this file rather than a kind silently dropped from
 * the note — `related-securities.ts`' own review finding, one surface over: a
 * local array of the three words sorted a fourth kind to the front with no
 * compile error and no failing test.
 */
export const TOPOLOGY_RELATION_WORDS: Readonly<
  Record<TopologyEdgeKind, string>
> = {
  sector_membership: "sector peers",
  index_membership: "index members",
  return_correlation: "correlated securities",
};

/**
 * The kinds present, as a phrase — read off {@link TOPOLOGY_EDGE_KINDS}' own
 * declaration order rather than the command's array order, for
 * `topologyBandWords`' reason: two orderings of one set would be two spellings
 * of one fact.
 *
 * `and` rather than `or`, because the set genuinely spans them: ~82–84% of
 * drawn correlation edges join two securities already in the same visible
 * cluster, so a highlight that mixes `sector_membership` and
 * `return_correlation` is the common case and *sector peers or correlated
 * securities* would be hedging about which one this is.
 *
 * The empty string where the command named nothing this bundle recognises —
 * an **absence of a clause** rather than a clause about an absence.
 */
export function topologyRelationWords(relations: readonly string[]): string {
  const known = TOPOLOGY_EDGE_KINDS.filter((kind) => relations.includes(kind));
  const words = known.map((kind) => TOPOLOGY_RELATION_WORDS[kind]);

  if (words.length <= 1) return words[0] ?? "";

  return `${words.slice(0, -1).join(", ")} and ${String(words.at(-1))}`;
}

/**
 * **What the highlight says — one builder, two renderings** (Task 7.4.2), which
 * is `topologyFilterWords`' own shape and its own reason.
 *
 * The region has two readers of one fact: a short line drawn over the canvas,
 * and a clause on the graph's text equivalent, which is what a screen reader is
 * handed through the canvas's `aria-labelledby`. `measured-set.ts` settled that
 * a drawn sentence and its spoken twin are **one string built once with two
 * renderings**, and a second, independently-written sentence is what this
 * repository's one-fact-one-home rule refuses.
 *
 * The count is the **related** securities, never the drawn set's own size: the
 * subject is not related to itself, and *74* over a command whose `symbols`
 * holds 73 would be a figure a reader could not reconcile with anything.
 */
export function topologyHighlightWords(highlight: TopologyHighlight): {
  readonly line: string;
  readonly clause: string;
} {
  const count = highlight.symbols.length;
  const noun = count === 1 ? "related security" : "related securities";
  const words = topologyRelationWords(highlight.relations);
  // **An unrecognised vocabulary draws no dash and no empty tail.** A newer
  // backend's fourth edge kind reaches an older bundle as a word it cannot
  // spell, and the honest answer is the count and the subject with no claim
  // about the kind — never ` — `.
  const kinds = words === "" ? "" : ` — ${words}`;

  return {
    line: `Highlighting ${highlight.subject} and ${String(count)} ${noun}${kinds}`,
    clause:
      ` Highlighting ${highlight.subject} and the ${String(count)} ${noun}` +
      ` it is joined to${kinds}. Every other equity is drawn quieter.`,
  };
}
