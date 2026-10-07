// How this product spells a price and the direction of a move (Task 2.12.3).
//
// **This file exists because a trigger fired rather than because a tidy-up was
// due.** `UniverseTable/last-close.ts` and `BarSeriesPanel/series-facts.ts` each
// carried their own copy of these values, and the note at the bottom of
// `series-facts.ts` named the condition for extracting them: *the third consumer
// that formats a price or a percentage*. Task 2.12.3's value axis is the third —
// every gridline on the price chart is a price, formatted — and the task's own
// brief says it in one line: **do not write a second spelling of a price.**
//
// It lands in `src/market/` and not in a `shared/formatting` directory because
// that is what the note said it would, and the reason is the subject rather than
// the shape: two decimals, a real minus sign and a direction decided on the
// rounded figure are facts about *how this product renders a market*, not
// component furniture. `PRODUCT_SPEC.md` §26 puts market vocabulary in the
// market module.
//
// ## What moved, and the one thing that did not
//
// The note named six values. **Five moved.** `changePercent` stayed where it
// was, in both homes, and that is a decision rather than an oversight: the two
// are not one function. One computes a move between two *sessions'* closes
// from a `SecurityLastClose`; `series-facts.ts` computes a move across the
// *bars of one window* from a `SeriesPrices`. (**Amended 2026-09-26**: the
// first of those left `UniverseTable/last-close.ts` for
// `packages/shared/src/live-change.ts` with `changeFromClose`, when Story
// 4.2's backend join became its third consumer — Task 4.2.3. The judgement
// below is untouched: they are still two functions over two subjects, and
// they are now in two packages.) They share an arithmetic
// shape — `(a − b) / b` — and share no subject, and a single function over both
// would need a parameter type that is the union of two unrelated records. The
// duplication that was worth removing is the one where two files would have
// rendered the same number two ways; that risk is in the *formatting*, which is
// here, and not in a subtraction whose operands are already on screen.
//
// `PriceDirection` moved with them, out of `PriceChange.tsx`. That component's
// own header argues the three directions are "arithmetic on a number both sides
// already have" rather than backend vocabulary — which is an argument for the
// market module, and `directionOf` returning a type owned by a component was
// the coupling pointing the wrong way. `PriceChange` now imports it.
//
// ## Amended 2026-10-07 (Task 4.4.2): the direction left this module
//
// `PRICE_DIRECTIONS`, `PriceDirection` and `directionOf` are now
// `packages/shared/src/price-direction.ts`', and the paragraph above is left
// standing because the argument it makes is the one that **expired**. "Both
// sides already hold the number" is the condition under which two
// implementations appear, not a reason against sharing one: Story 4.4 counts
// breadth over 518 figures **server-side**, which made the bucket rule
// unreachable from the process that needs it. The third consumer is a
// different process — exactly what `changeFromClose`'s own note predicted.
//
// They are re-exported from here, so every component's import is unchanged and
// `market/index.ts` still publishes them. What stays behind is the **spelling**
// — `formatPrice` and `formatChangePercent` — because the backend has no
// surface, and `PRICE_DECIMALS`, which is a price's precision and not a
// percentage's.

import { PERCENT_DISPLAY_DECIMALS, directionOf } from "@marketpulse/shared";

// **A re-export rather than a second declaration**, which is what keeps the
// frontend's public surface identical across the move. `pnpm invariants`'
// `one-classifier-for-the-direction-of-a-move` is what holds the other half:
// a re-export is not a second classifier, and a comparison would be.
export { PRICE_DIRECTIONS, directionOf } from "@marketpulse/shared";
export type { PriceDirection } from "@marketpulse/shared";

/**
 * How many decimal places a price is shown to.
 *
 * Two, which is what US equities quote in and what every reader expects. The
 * store holds `numeric(18, 6)` and the extra four places are real — they matter
 * to a sub-dollar security and to Epic 5's arithmetic — so this is a *display*
 * decision and the value it rounds is never fed back into anything.
 */
const PRICE_DECIMALS = 2;

// **A percentage's precision is `packages/shared`'s since Task 4.3.4**, and the
// two constants are deliberately not collapsed. A price's decimals are this
// module's business; a *percentage's* are now shared with the backend, because
// the sector ranking is computed there and its no-swap rule is keyed on the
// displayed figure — the displayed order must never contradict the displayed
// figures, which needs both processes rounding in the same place.

/**
 * The minus sign, U+2212, and not a hyphen.
 *
 * A hyphen-minus is a different width from the digits around it in most faces,
 * so a column of negative figures does not align with the positive ones — which
 * undoes exactly what `tabular-nums` was bought for (Task 1.4.3 measured a
 * 14.3 px spread). The same measurement is why an axis of proportional numerals
 * jitters as the window moves, so this constant matters on a chart for the same
 * reason it mattered in a table.
 */
const MINUS = "−";

/**
 * A price, as this product shows it.
 *
 * `toFixed` rather than `Intl.NumberFormat`, and that is a deliberate
 * restriction rather than an oversight: a locale-aware format would render
 * `1,234.56` for one reader and `1.234,56` for another, and a tabular column —
 * or a value axis — depends on every figure being the same shape on every
 * machine. It is also `no-restricted-syntax`-adjacent territory:
 * `packages/shared/src/market-time.ts` is the one module in this workspace
 * allowed to construct an `Intl` formatter, because a formatter that reads the
 * environment is a value that differs between two machines rendering the same
 * data.
 *
 * There is no grouping separator for the same reason: `1234.56` and `1,234.56`
 * are different widths, and at four figures the separator buys nothing in a
 * right-aligned figure.
 */
export function formatPrice(price: number): string {
  return price.toFixed(PRICE_DECIMALS);
}

/**
 * A percentage, formatted with its sign — `+0.84%`, `−1.24%`, `0.00%`.
 *
 * The sign is one of the three channels carrying direction (the glyph and the
 * spoken word are the others), so it is part of the string rather than something
 * the colour implies. A move that rounds to zero gets **no sign at all**:
 * `+0.00%` claims a direction the rounding threw away, and `−0.00%` is worse.
 */
export function formatChangePercent(percent: number): string {
  const figure = `${Math.abs(percent).toFixed(PERCENT_DISPLAY_DECIMALS)}%`;

  // **The sign is read off the one classifier, never off the raw sign**
  // (tightened 2026-10-07 by Task 4.4.2; it was `percent > 0` here). The
  // output is unchanged for every figure a surface can reach — `directionOf`
  // already decided whether a sign is claimed at all — and the reason to spell
  // it this way is that `percent > 0` in this file *is* a second
  // classification of a move, which is the shape
  // `one-classifier-for-the-direction-of-a-move` exists to refuse. A figure
  // with no direction gets no sign, which is `+0.00%`'s rule arriving at the
  // only other input that has no direction to claim.
  const direction = directionOf(percent);
  if (direction === "positive") return `+${figure}`;
  if (direction === "negative") return `${MINUS}${figure}`;
  return figure;
}

/**
 * A signed **count**, formatted — `+132`, `−78`, `0`.
 *
 * The breadth region's headline is `advancing − declining`, which is the one
 * figure on this screen that is signed and is not a percentage. It is spelled
 * here rather than in that region for the two reasons this module exists: the
 * minus sign is {@link MINUS} and nothing outside this file may type one, and
 * the decision about whether a sign is claimed at all is `directionOf`'s —
 * `formatChangePercent` had the same pair of obligations and they are the same
 * two lines.
 *
 * **No decimals and no grouping separator.** A count is an integer, and at
 * three digits a separator buys nothing in a right-aligned figure —
 * {@link formatPrice}'s own note, for the same reason.
 *
 * A net of zero gets **no sign**, which is `+0.00%`'s rule at a second input: a
 * `+0` over a market where the advancers and the decliners are equal claims a
 * direction the subtraction did not find.
 */
export function formatSignedCount(count: number): string {
  const figure = String(Math.abs(count));
  const direction = directionOf(count);
  if (direction === "positive") return `+${figure}`;
  if (direction === "negative") return `${MINUS}${figure}`;
  return figure;
}
