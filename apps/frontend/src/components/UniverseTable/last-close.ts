import type { MarketDate, SecurityLastClose } from "@marketpulse/shared";

import type { PriceDirection } from "../PriceChange/PriceChange.js";

// Turning two stored prices into the figures a row shows (Task 2.9.7).
//
// Pure functions over the wire records, beside the table that renders them, for
// `coverage.ts`'s reason: what a number *reads* as is the half of this most
// likely to be wrong, and it is testable without a DOM.
//
// ## Why the arithmetic is here and not on the wire
//
// `SecurityLastClose` carries two prices and a session date; the change and the
// percentage are computed here. That is `PriceChange`'s own line — **a band
// name is a decision the backend reports, the direction of a move is arithmetic
// on a number both sides already have** — and it is not a licence to invent
// figures. Invariant 1 is about where a number *comes from*: both inputs are
// read from stored bars, and a subtraction whose operands are on screen is not
// a number this product had to look up.
//
// The alternative was a `changePercent` field on the wire, and it is worse in
// the ordinary way a derived field is: a third representation of two numbers,
// with nothing holding it to them, and the client still has to format it.
//
// ## What is deliberately not here
//
// **No currency symbol.** Every security in this universe is US-listed and
// prices in dollars, so a `$` on 518 rows is 518 copies of one constant — the
// same furniture argument that took the sector out of the table and put the
// timeframe in a heading. The day this universe holds a security priced in
// something else, the symbol is the smallest part of what has to change.
//
// **No absolute change.** The percentage is the comparable figure across a
// column of securities trading between $3 and $700; the absolute move is only
// interesting once you are looking at one security, which is Story 2.11's page.
//
// **No colour decision.** `PriceChange` owns that, and it owns the rule that
// colour is the redundant channel — this module produces the sign, the
// direction and the glyph's input, and every one of those survives greyscale.

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
 * so a column of negative figures does not align with the positive ones —
 * which undoes exactly what `tabular-nums` was bought for (Task 1.4.3 measured
 * a 14.3 px spread). `PriceChange`'s own prop documentation already writes its
 * examples this way.
 */
const MINUS = "−";

/**
 * A price, as the column shows it.
 *
 * `toFixed` rather than `Intl.NumberFormat`, and that is a deliberate
 * restriction rather than an oversight: a locale-aware format would render
 * `1,234.56` for one reader and `1.234,56` for another, and this column's whole
 * mechanism is that 518 fixed-width figures line up under each other. It is
 * also `no-restricted-syntax`-adjacent territory — `market-time.ts` is the one
 * module in this workspace allowed to construct an `Intl` formatter, and that
 * rule exists because a formatter that reads the environment is a value that
 * differs between two machines rendering the same data.
 *
 * There is no grouping separator for the same reason: `1234.56` and `1,234.56`
 * are different widths, and at four figures the separator buys nothing in a
 * right-aligned tabular column.
 */
export function formatPrice(price: number): string {
  return price.toFixed(PRICE_DECIMALS);
}

/**
 * The move since the session before, as a signed percentage.
 *
 * `null` when there is nothing to compare against — a security we hold one
 * daily bar for — which is §36's partial answer rather than a failure, and is
 * what the caller renders as an absence instead of a zero.
 *
 * **A zero previous close returns `null` too**, and that is not defensive
 * padding: the division is `Infinity`, which formats as `"+Infinity%"` and
 * renders. `market_bars.close` is `not null` and a real equity does not close
 * at zero, so this is the branch that keeps an impossible row from producing
 * the most alarming figure on the page rather than a blank one.
 */
export function changePercent(close: SecurityLastClose): number | null {
  const previous = close.previousClose;
  if (previous === null || previous === 0) return null;
  return ((close.close - previous) / previous) * 100;
}

/**
 * The percentage, formatted with its sign — `+0.84%`, `−1.24%`, `0.00%`.
 *
 * The sign is one of the three channels carrying direction (the glyph and the
 * spoken word are the others), so it is part of the string rather than
 * something the colour implies. A move that rounds to zero gets **no sign at
 * all**: `+0.00%` claims a direction the rounding threw away, and `−0.00%` is
 * worse.
 */
export function formatChangePercent(percent: number): string {
  const figure = `${Math.abs(percent).toFixed(PRICE_DECIMALS)}%`;
  if (directionOf(percent) === "unchanged") return figure;
  return `${percent > 0 ? "+" : MINUS}${figure}`;
}

/**
 * Which of `PriceChange`'s three directions a percentage is.
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

/**
 * The session every close in this response belongs to, or `null` when they
 * disagree.
 *
 * **This is what lets the date be stated once instead of 518 times.** The store
 * is filled by a backfill that walks every security over the same sessions, so
 * in practice every row shares one date — measured on the local store at full
 * depth, all **518 of 518** securities last closed on the same session. A date
 * repeated down every row under a heading that could carry it is furniture,
 * which is the argument that took the sector column out of this table.
 *
 * It returns `null` rather than a majority, and the caller then puts each row's
 * own date in its cell. That asymmetry is deliberate and it is `coverage.ts`'s:
 * the shared claim is made only when it is true of everything, and the moment
 * it is not, the page stops making it rather than making it approximately.
 *
 * An empty map is `null` too — there is no session to name — which the caller
 * renders as a heading with no date under it, because there are no prices under
 * it either.
 */
export function commonSession(
  closes: ReadonlyMap<string, SecurityLastClose>,
): MarketDate | null {
  let session: MarketDate | null = null;

  for (const close of closes.values()) {
    if (session === null) session = close.session;
    else if (session !== close.session) return null;
  }

  return session;
}
