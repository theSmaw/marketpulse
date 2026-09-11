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
// are not one function. `last-close.ts` computes a move between two *sessions'*
// closes from a `SecurityLastClose`; `series-facts.ts` computes a move across
// the *bars of one window* from a `SeriesPrices`. They share an arithmetic
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

/**
 * The three directions a move can have.
 *
 * Not in `@marketpulse/shared`, unlike `AnomalyBand` and `FeedStatus`, and that
 * line is `PriceChange`'s own: a band name is a decision the backend makes and
 * reports, whereas the direction of a move is arithmetic on a number both sides
 * already hold.
 */
export const PRICE_DIRECTIONS = ["positive", "negative", "unchanged"] as const;

export type PriceDirection = (typeof PRICE_DIRECTIONS)[number];

/**
 * How many decimal places a price is shown to.
 *
 * Two, which is what US equities quote in and what every reader expects. The
 * store holds `numeric(18, 6)` and the extra four places are real — they matter
 * to a sub-dollar security and to Epic 5's arithmetic — so this is a *display*
 * decision and the value it rounds is never fed back into anything.
 */
const PRICE_DECIMALS = 2;

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
  const figure = `${Math.abs(percent).toFixed(PRICE_DECIMALS)}%`;
  if (directionOf(percent) === "unchanged") return figure;
  return `${percent > 0 ? "+" : MINUS}${figure}`;
}

/**
 * Which of the three directions a percentage is.
 *
 * **Decided on the rounded figure, not on the raw one**, and that is the whole
 * reason this is a function rather than `percent > 0`. A move of +0.001% is
 * `positive` by sign and renders as `0.00%`: an up arrow, a green tint and a
 * figure saying nothing moved, which is three channels disagreeing with each
 * other in the one component built so they cannot.
 */
export function directionOf(percent: number): PriceDirection {
  const rounded = Number(percent.toFixed(PRICE_DECIMALS));
  if (rounded > 0) return "positive";
  if (rounded < 0) return "negative";
  return "unchanged";
}
