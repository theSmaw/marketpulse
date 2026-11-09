/**
 * **How strongly two securities moved together, as a stroke width** (Task
 * 6.6.1) — the first reader of `TopologyCorrelationEdge.weight`, which has
 * been on the model, required and signed, and reaching this renderer unused
 * since 2026-11-06.
 *
 * ## It classifies. It does not compute.
 *
 * Everything here is a comparison of a stored coefficient against two stored
 * floors. No correlation is calculated, no sample is read, no `r` is
 * re-derived from anything: the weight arrives on the wire from the nightly
 * pass (ADR 0049) and this module's whole job is to decide which of three
 * stroke widths draws it. Story 6.6's acceptance criterion 5 is that claim,
 * and `pnpm invariants`' `nothing-under-the-topology-recomputes-a-correlation`
 * holds it over this whole tree rather than over this file.
 *
 * ## Why three classes and not a ramp
 *
 * Canvas2D's `lineWidth` is a property of the **context**, not of a subpath,
 * so a continuous weight→width map means one `beginPath()`/`stroke()` pair
 * per edge — 1,860 stroke calls a frame against today's one, an unmeasured
 * per-frame cost on the one surface in this product whose cost is already a
 * measured ADR figure (ADR 0048, rAF-gap p50 16.7 ms at 2,372 edges with a
 * single stroke call). A quantised scale costs **k** calls whatever the edge
 * count does, which is the same shape `ANOMALY_RING_WIDTH`'s own three
 * passes already use one block further down the same frame.
 *
 * Three rather than two or five, and that is a legibility judgement rather
 * than a measurement: this is the **fourth** encoding on this canvas (cluster,
 * shape, anomaly band, now edge weight) and Story 6.6's own description says
 * five shipped together makes none of them readable. Two classes read as a
 * boolean — *related* against *strongly related* — which is less than the data
 * supports; five 0.25 px steps are not separable at a 1 px floor, since the
 * step would be below the device pixel on a 1× display.
 */

import type { TopologyEdge } from "@marketpulse/shared";

/**
 * The three widths a correlation edge is drawn at, in CSS pixels, **constant
 * under zoom** — the edge/halo/label rule (`renderer.ts` §09's table), the
 * same rule `ANOMALY_RING_WIDTH` and `CORRELATION_EDGE_DASH` already
 * follow. A weight encoding that grew with zoom would make a reader who
 * zoomed in think the relationship had strengthened.
 *
 * ## The floor is 1, and it is fixed rather than derived
 *
 * `weak: 1` is **today's shipped stroke exactly** — `context.lineWidth = 1`,
 * which is what every one of the 1,860 retained edges has drawn at since Task
 * 6.5.2. That is Story 6.6's acceptance criterion 5 in a number: *no retained
 * edge draws fainter than this story's own measured floor*, so nothing this
 * task ships makes any edge less visible than it already was, and the product
 * never implies an absent edge was measured and found weak. The retained set
 * is a **per-node rank** cut (the union of each node's own strongest five,
 * plus a per-pair Fisher-z floor) and not a global weight threshold, so a kept
 * edge at `|r| = 0.090` is not the weakest of anything global — it is one
 * security's own strongest neighbour. Fading it toward nothing would have
 * drawn a boundary the data does not contain.
 *
 * ## The ceiling is 2, and the two things it had to clear
 *
 * `strong: 2` is the widest step, and both constraints on it were checked with
 * an 8× `pnpm probe` crop at 1440 rather than argued from these numbers (Task
 * 6.6.1's record carries the crops):
 *
 * 1. **The dash rhythm still reads as dashed.** `CORRELATION_EDGE_DASH` is
 *    `[3, 2]`, derived at a 1 px stroke *so it reads as dashed rather than
 *    dotted*. At 2 px a 3 px dash is a 3 × 2 rectangle — still visibly longer
 *    than it is thick, with a 2 px gap between marks, so the rhythm survives.
 *    The dash is deliberately **not** scaled with the width: a period that
 *    grew with weight would change the mark's identity rather than its weight,
 *    and the two channels would be one.
 * 2. **It stays distinguishable from the anomaly ring.**
 *    `ANOMALY_RING_WIDTH` is `1/2/3`, so `strong` collides numerically with
 *    `high`'s 2 — and does not collide visually, because a ring is a closed
 *    circle in the node's own reserved annulus and this is a dashed straight
 *    line between two nodes. The shapes are different marks, not two weights
 *    of one, which is why the numeric overlap is accepted rather than routed
 *    around by narrowing to 1.75: a 0.25 px difference from `moderate` would
 *    have bought nothing legible and cost the clean half-pixel ladder.
 *
 * `moderate: 1.5` sits halfway, which a 2× DPR display renders as a whole
 * device pixel. On a 1× display it is a half pixel and antialiases to a
 * lighter 2 px — which is the **correct** direction: lighter than `strong`,
 * heavier than `weak`, in exactly the order the data is in.
 */
export const CORRELATION_EDGE_WIDTH = {
  weak: 1,
  moderate: 1.5,
  strong: 2,
} as const;

/**
 * The two `|r|` boundaries between the three widths — **the measured tertiles
 * of the real retained set**, to four decimal places.
 *
 * ## The derivation, and the selecting rule
 *
 * Queried against the one real generation `pnpm baselines` has produced
 * (`return_correlations`, `observed_at = 2026-09-11T20:00:00Z`, 1,860 rows,
 * `feed = 'sip'`, 60 sessions, `retainedN = 5`) on 2026-11-09:
 *
 * ```
 *  min_abs  |        p33_3        |    p50    |       p66_7        |  max_abs
 * 0.089867  | 0.41393433333333335 | 0.4767785 | 0.5495806666666667 | 0.990240
 * ```
 *
 * **The selecting rule is `equal thirds of the measured distribution`**, and
 * it was selected over the two alternatives on the same grounds Story 5.6's
 * `ANOMALY_BAND_FLOORS` selected its own: a round number (`|r| ≥ 0.8`, say)
 * fails Story 6.6's acceptance criterion 4 outright, and a *statistically
 * meaningful* cut — the `|r|` at which a pair's Fisher-z interval clears some
 * level — is **already spent**: the pass applies exactly that test per pair
 * and a pair that fails it is not in this set at all. Every row here has
 * already cleared significance, so significance cannot order them.
 *
 * What equal thirds buys is the one thing a weight encoding on a ranked-cut
 * set can honestly offer: **each class is populated at every real instant**.
 * Against the measured 1,860 the split is exactly `620 / 620 / 620`
 * (33.33% each), so no class is a rarity a reader never meets and none is the
 * default that swallows the set. A fixed `|r|` boundary could not promise
 * that — the retained distribution moves with the market, and 60 sessions of a
 * quiet regime would put every edge in one class.
 *
 * **Four decimal places, rounded to nearest, rather than the full float**,
 * because the fifth digit of a tertile over 1,860 samples is noise: one sample
 * either side of the cut moves `p33.3` by more than `1e-5`. `0.41393433… →
 * 0.4139` and `0.54958067… → 0.5496`, and both floors sit well inside the
 * measured span (`0.089867 … 0.990240`) by construction. Re-checked against
 * the real rows at these exact figures: the split is `620 / 620 / 620`.
 *
 * ## The comparison is on the MAGNITUDE
 *
 * `Math.abs`, because `−0.9` and `+0.9` are equally strong relationships
 * drawn at the same weight — sign is deliberately **not** encoded here (see
 * {@link correlationStrength}).
 */
export const CORRELATION_STRENGTH_FLOORS = {
  /** The lower tertile of measured `|r|`: at or above this, `moderate`. */
  moderate: 0.4139,
  /** The upper tertile of measured `|r|`: at or above this, `strong`. */
  strong: 0.5496,
} as const;

/** Which of the three widths an edge draws at. */
export type TopologyCorrelationStrength = keyof typeof CORRELATION_EDGE_WIDTH;

/**
 * The strength class of one stored coefficient.
 *
 * ## Sign is refused as a channel, and the count is why
 *
 * Classified on `Math.abs(weight)`, so the one negatively-correlated pair in
 * the real retained set draws exactly as any other pair of its magnitude
 * would. **Counted rather than assumed** (Task 6.6.1): the real generation
 * holds **1 negative pair of 1,860 — 0.0538% — `AES`/`ERIE` at
 * `r = −0.105952`, `n = 733`**, which is the only one there has ever been on
 * any store this product runs.
 *
 * Three channels could carry sign and all three are spent or wrong. Dash is
 * **already** the difference between a measurement and a curated membership
 * (`CORRELATION_EDGE_DASH`), and a second rhythm would make two kinds of
 * dashed line a reader has to compare to tell apart. Colour cannot carry it
 * alone — this repository's standing rule that colour is never the sole
 * encoding of anything — and the only other value step available on this
 * canvas is already the difference between the two curated kinds. And width,
 * the channel this task is spending, is taken by magnitude. So a fourth mark
 * would have to be invented for one edge in two thousand, on the fourth
 * encoding of a canvas whose own story says five makes none of them readable.
 *
 * **Reversal trigger, a condition rather than a story number:** *negative
 * weights exceed 1% of the retained set on a real generation* — deliberately a
 * **share** and not a first occurrence, because one negative pair already
 * exists today, so *the first negative pair* is a trigger that fired before it
 * was written and could never fire again. 1% of a 1,860-edge set is ~19 pairs,
 * roughly nineteen times today's count: enough that a reader would meet one
 * rather than never, which is the condition under which an uncoded sign starts
 * costing something. The accessible sentence is already sign-neutral for the
 * same reason, so nothing on this surface claims a direction for any edge.
 */
export function correlationStrength(
  weight: number,
): TopologyCorrelationStrength {
  const magnitude = Math.abs(weight);

  if (magnitude >= CORRELATION_STRENGTH_FLOORS.strong) return "strong";
  if (magnitude >= CORRELATION_STRENGTH_FLOORS.moderate) return "moderate";
  return "weak";
}

/**
 * The strength class of an edge, or `null` for the two curated kinds.
 *
 * **A narrowing rather than a lookup**, so a membership edge cannot be asked
 * for a weight it structurally does not carry: `TopologyEdge` is a
 * discriminated union and only `return_correlation` has the field. A fourth
 * edge kind added to the model arrives here as `null` and draws in whichever
 * batch the renderer files it under, which is the right default — a new kind
 * with no measured strength must not borrow one.
 */
export function edgeStrength(
  edge: TopologyEdge,
): TopologyCorrelationStrength | null {
  return edge.kind === "return_correlation"
    ? correlationStrength(edge.weight)
    : null;
}
