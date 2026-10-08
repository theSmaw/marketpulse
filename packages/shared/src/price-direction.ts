/**
 * **Which of three buckets a move falls into, and the rounding that decides it**
 * (Task 4.4.2).
 *
 * ## Why it is here, and the sentence that expired
 *
 * `PRICE_DIRECTIONS`, `PriceDirection` and `directionOf` lived in
 * `apps/frontend/src/market/price-format.ts` from Task 2.12.3 until
 * 2026-10-07, under a note that said in as many words that they were
 * deliberately **not** in `@marketpulse/shared`: *"a band name is a decision
 * the backend makes and reports, whereas the direction of a move is arithmetic
 * on a number both sides already hold."*
 *
 * **That sentence is retired rather than worked around.** Both sides holding
 * the number is exactly the condition under which two implementations appear,
 * and Story 4.4 is the third consumer being a different **process**: breadth
 * is counted server-side — 518 figures a frame, which is the whole reason it
 * is not counted in a browser — and the rule for which bucket a figure falls
 * into was unreachable from there. The next author would have written
 * `percent > 0 ? "advancing" : …`, and that second rule is the one that
 * drifts.
 *
 * This is ADR 0038 decision 2's precedent firing for the second time, and
 * `changeFromClose`'s own note predicted the shape: *the third consumer is a
 * different process.*
 *
 * ## The decision this module carries, which is not obvious from the code
 *
 * **The classification is keyed on the DISPLAYED figure, not on the raw
 * sign**, and that is the whole reason {@link directionOf} is a function
 * rather than `percent > 0`. A move of +0.004% is positive by sign and renders
 * as `0.00%`: an up arrow, a green tint and a figure saying nothing moved are
 * *three channels disagreeing with each other*, in the one component built so
 * they cannot (`PriceChange`). A count has the same obligation one level up —
 * a breadth figure saying *312 advancing* beside 312 rows reading `0.00%` is
 * the same contradiction expressed as a total.
 *
 * ## What is deliberately NOT here
 *
 * **No spelling.** `formatPrice` and `formatChangePercent` stay in the
 * frontend's `market/price-format.ts`: a spelling is a property of a surface
 * and the backend has no surface. **No colour, no glyph and no spoken word** —
 * those are `PriceChange`'s, which is why that component keeps its own
 * `up` / `down` / `unchanged` vocabulary rather than reading one from here.
 * This module decides a bucket.
 */

import { PERCENT_DISPLAY_DECIMALS } from "./live-change.js";

/**
 * The three directions a move can have.
 *
 * Exhaustive over what {@link directionOf} can *name* — a non-finite figure is
 * not a member, because it is not a direction. See that function.
 */
export const PRICE_DIRECTIONS = ["positive", "negative", "unchanged"] as const;

export type PriceDirection = (typeof PRICE_DIRECTIONS)[number];

/**
 * A percentage as the screen will show it — **the one rounding, called by
 * everything that compares two moves**.
 *
 * It had two homes until 2026-10-07: `Number(percent.toFixed(
 * PERCENT_DISPLAY_DECIMALS))` was written out in both `directionOf` and here,
 * and breadth would have been the third. Both now call this.
 *
 * The rounding is what buys `STORY.md`'s checkable invariant — **the displayed
 * order never contradicts the displayed figures**. Eleven sector ETFs cluster
 * tightly, so two sectors 0.003% apart would trade places on every frame, up
 * to ~16 times a minute, both reading `+0.41%` throughout: a list visibly
 * re-ordering with nothing on it changing.
 *
 * Keyed on the **displayed** precision rather than on a chosen epsilon, which
 * is the difference between a rule a reader can verify by looking and a
 * threshold somebody picked. `PERCENT_DISPLAY_DECIMALS` is shared with
 * `formatChangePercent`, so the two cannot drift apart.
 *
 * **It does not guard a non-finite input**, and that is `directionOf`'s job
 * rather than this one's: `Number(NaN.toFixed(2))` is `NaN` and
 * `Number(Infinity.toFixed(2))` is `Infinity`, so rounding is honest about an
 * unroundable number. Every caller either classifies through `directionOf` or
 * has already refused one (`moveRankingKey`).
 */
export function displayedPercent(percent: number): number {
  return Number(percent.toFixed(PERCENT_DISPLAY_DECIMALS));
}

/**
 * Which of the three directions a percentage is, **or `undefined` for a figure
 * that has no direction at all**.
 *
 * ## Decided on the rounded figure
 *
 * See the module header: a +0.001% move is `positive` by sign and renders as
 * `0.00%`, and an arrow beside that figure is three channels disagreeing. A
 * breadth count on the raw sign would call that security an advancer while its
 * own row prints `0.00%`.
 *
 * ## `undefined` for a non-finite figure, and why it is not `"unchanged"`
 *
 * This returned `"unchanged"` for `NaN` until 2026-10-07, by accident rather
 * than by decision: `NaN > 0` and `NaN < 0` are both false, so the final
 * `return` caught it. On a single figure that is nearly invisible — the row
 * reads `NaN%` with an em dash beside it and the em dash is the least wrong
 * thing on the line. **In a count it is a sentence**: a naive breadth over 518
 * figures none of which was finite would report *"518 unchanged, 0 advancing,
 * 0 declining"* — a confident, well-formed claim that the market did not move,
 * which is ADR 0029's false impression expressed as a total.
 *
 * So the answer is **not one of the three**, and `undefined` is the only such
 * answer that does not need a fourth member nothing can render. A count then
 * leaves the figure out of every bucket, which is what *we cannot say* means,
 * and `PRICE_DIRECTIONS` stays exhaustive over what can be drawn.
 *
 * **Closed here rather than in each caller**, for `moveRankingKey`'s
 * recorded reason: the serialiser drops a non-finite number at the wire (ADR
 * 0031) and `readFigure` refuses one at the other end, but this function runs
 * **in-process, before the encode**, so it is inside that gap and has to close
 * it itself.
 *
 * **A renderer that must have a direction may fall back to `"unchanged"`** —
 * six call sites do, which is byte-for-byte what they drew before this
 * function could say `undefined`, and a figure reading `NaN%` is not made
 * worse by an em dash. **A count must never.** That is the distinction the
 * whole paragraph above is about, and it is the one thing to carry away from
 * this docblock.
 */
export function directionOf(percent: number): PriceDirection | undefined {
  // First, and before the rounding: `displayedPercent` would hand back `NaN`
  // or `Infinity` unchanged, and both compare false against zero.
  if (!Number.isFinite(percent)) return undefined;

  const shownPercent = displayedPercent(percent);
  if (shownPercent > 0) return "positive";
  if (shownPercent < 0) return "negative";
  return "unchanged";
}
