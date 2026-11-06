import type { Ticker } from "@marketpulse/shared";

/**
 * **The strongest N per node, as a SELECTION over candidates somebody else
 * computed** (Task 6.5.1, Story 6.5's resolved Open Decision 1).
 *
 * `PRODUCT_SPEC.md` §10: *to avoid an unreadable graph, the system should
 * retain only the strongest N relationships per node.* This module is that
 * sentence, and nothing else — no I/O, no clock, no handle, no coefficient
 * arithmetic. `pearsonCorrelation` produces the figures in `packages/shared`,
 * `correlationIsSignificant` decides which of them this product is willing to
 * draw at all, and this decides which of **those** a graph can carry.
 *
 * ## It is in `apps/backend` rather than in `packages/shared`, deliberately
 *
 * `selectMovers`' own division, one story family over: the **order** of two
 * figures is a property of the quantity and belongs beside it, while the
 * **cut** is a property of a drawn surface. The cut here is `N`, which Story
 * 6.5's Open Decision 1 explicitly defers to Task 6.5.3's own measurement of
 * readability and frame rate against the real elliptical ring — so the figure
 * is a property of a canvas and the function that applies it belongs with the
 * pass that writes rows, not in the vocabulary both halves of the product
 * share.
 *
 * ## A top-N is a SELECTION, not a reduction — Story 4.5's rule, at a new grain
 *
 * Every retained entry is **the same object** the caller handed in. Nothing
 * here constructs a row, rounds a coefficient, re-derives an overlap or
 * renames a field, which is what makes the stored set checkable **from the
 * candidates**: a test can assert object identity, and `docs/GAPS.md`'s own
 * lesson — *the wire cannot see a defect in the producer* — means that is the
 * only level at which the claim can be made. A producer that rebuilt each row
 * would be indistinguishable on the wire from one that selected it, and
 * equally indistinguishable from one that silently changed a figure on the way
 * through.
 *
 * ## The UNION, and why not the intersection
 *
 * A node's top-N is **not symmetric**: `A`'s strongest five may not include
 * `B` even where `B`'s strongest five include `A`. So *retain the strongest N
 * per node* under-specifies the drawn set by roughly a factor of two, and the
 * three readings are:
 *
 * - **Union, stored once** — a pair is retained if it is in **either**
 *   endpoint's own top-N. This one. Each node's exact top-N is fully
 *   recoverable from the union with no redundant row and no nullable rank
 *   column — filter the retained rows touching that node, sort by `|r|`
 *   descending, take `N` — and that is correct **by construction**, because
 *   every member of a node's own top-N is in the union by the definition of a
 *   union.
 * - **Intersection** (mutual top-N only) — rejected: it can leave a node with
 *   **zero** drawn edges despite real, strong correlations, which reads on
 *   screen as *this security relates to nothing* and is a false claim rather
 *   than a sparse one.
 * - **Directed, stored twice** — rejected on cost: roughly double the rows for
 *   a per-node rank ordinal nothing today asks for. **Reversal trigger, a
 *   condition:** *the first surface that must state a node's own rank among
 *   its neighbours* (*"your 2nd-strongest partner"*).
 *
 * ## The tiebreak is DECLARED, because a sorted ranking with no tiebreak is
 * ## not a ranking
 *
 * `one-comparator-for-the-order-of-a-move`'s recorded lesson, one quantity
 * over: a comparator that answers `0` for a tie delegates the answer to the
 * array's arrival order. Here the arrival order is the **pair enumeration
 * order** of a nightly pass, which is stable within one store and is not a
 * fact about the market — and ADR 0041 forbids a ranked surface re-ordering
 * with nothing having changed. So two candidates of equal `|r|` are ordered by
 * **the ticker of the other endpoint, ascending**, which is total (a node has
 * at most one candidate per partner) and store-independent.
 *
 * **Exact ties are not a curiosity here.** A coefficient is stored at six
 * decimal places and two pairs sharing one to full double precision is
 * vanishingly rare — but the pass also runs over a **bare store**, where every
 * equity is absent and there is nothing to tie, and over fixtures, where
 * engineered ties are ordinary. The declared order is what makes the function's
 * output a function of its input set rather than of its input sequence, which
 * the test asserts directly by shuffling.
 */

/**
 * One computed, significant pair, as the pass hands it in.
 *
 * `low` and `high` are the **canonical** order — `low` sorts lexicographically
 * before `high` — which is the writer's own canonicalisation and is why this
 * function never has to decide an orientation.
 */
export interface CorrelationCandidate {
  readonly low: Ticker;
  readonly high: Ticker;
  /** Pearson's `r`, signed. The ranking uses `Math.abs` of it. */
  readonly r: number;
  /** The counted overlap the coefficient was taken over. */
  readonly n: number;
}

/**
 * **The union of every node's own strongest `n` candidates**, deduplicated,
 * each entry the **same object** the caller handed in, in canonical order.
 *
 * @param candidates every computed, significant pair. Not mutated, and not
 *   assumed to be in any particular order.
 * @param n how many a single node keeps. The pass's working default is
 *   `RETAINED_N` in `compute-baselines.ts`, pending Task 6.5.3's measurement.
 */
export function selectStrongestCorrelations(
  candidates: readonly CorrelationCandidate[],
  n: number,
): readonly CorrelationCandidate[] {
  // **A node's candidates, by node.** Every candidate is filed under BOTH its
  // endpoints, which is what makes the answer a union: the same object is
  // considered twice, once from each end, and kept if either end wants it.
  const byNode = new Map<Ticker, CorrelationCandidate[]>();

  const fileUnder = (node: Ticker, candidate: CorrelationCandidate): void => {
    const held = byNode.get(node);
    // A branch rather than `?? []`, which this epic's own
    // `no-imputed-zero-in-a-figure` rule has the sibling argument for: the
    // empty array here is a true fact about a node nothing has filed yet, and
    // the one place a default would read as correct is the one place a grep
    // for it stops being usable.
    if (held === undefined) byNode.set(node, [candidate]);
    else held.push(candidate);
  };

  for (const candidate of candidates) {
    fileUnder(candidate.low, candidate);
    fileUnder(candidate.high, candidate);
  }

  // **Identity, not equality.** A `Set` of object references is what makes the
  // dedup exact: two candidates for the same pair would be two entries, and
  // the one candidate reached from both its endpoints is one.
  const kept = new Set<CorrelationCandidate>();

  for (const [node, held] of byNode) {
    // **Copied before sorting**, because the array under a key is this
    // function's own and the input it was built from is the caller's. The copy
    // is cheap — a node holds at most `eligible − 1` candidates — and the
    // alternative is a mutation that reaches back into nothing today and into
    // the caller's array the first time this is refactored.
    const ordered = [...held].sort((left, right) =>
      compareForNode(node, left, right),
    );

    for (const candidate of ordered.slice(0, n)) kept.add(candidate);
  }

  // **`filter` then `sort` on the filtered array**, so the caller's array is
  // never touched: `filter` returns a new array holding the caller's own
  // objects, and the sort reorders that new array. The order is the migration's
  // own key order — `(low, high)` — so the rows a pass writes and the key they
  // are written under agree, and two passes over one store produce one
  // sequence.
  return candidates
    .filter((candidate) => kept.has(candidate))
    .sort(byCanonicalOrder);
}

/**
 * **Which of two candidates one node keeps first: `|r|` descending, then the
 * OTHER endpoint's ticker ascending.**
 *
 * The `node` argument is what makes the second clause well-defined — the
 * tiebreak is on the partner, so it has to know which end it is looking from.
 * A tiebreak on `low` alone would answer `0` for two candidates sharing a
 * `low`, which is exactly the case a node's own ranking is full of.
 */
function compareForNode(
  node: Ticker,
  left: CorrelationCandidate,
  right: CorrelationCandidate,
): number {
  const byStrength = Math.abs(right.r) - Math.abs(left.r);
  if (byStrength !== 0) return byStrength;

  return partnerOf(node, left).localeCompare(partnerOf(node, right));
}

/** The end of this candidate that is not `node`. */
function partnerOf(node: Ticker, candidate: CorrelationCandidate): Ticker {
  return candidate.low === node ? candidate.high : candidate.low;
}

/** `(low, high)` ascending — the migration's own key order. */
function byCanonicalOrder(
  left: CorrelationCandidate,
  right: CorrelationCandidate,
): number {
  const byLow = left.low.localeCompare(right.low);
  return byLow === 0 ? left.high.localeCompare(right.high) : byLow;
}
