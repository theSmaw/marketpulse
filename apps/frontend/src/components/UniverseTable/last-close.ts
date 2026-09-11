import type { MarketDate, SecurityLastClose } from "@marketpulse/shared";

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
// colour is the redundant channel — this module produces the figure, and the
// direction and the glyph's input come from `market/price-format.ts`.
//
// **No spelling of a price or a percentage, since 2026-09-11.** `formatPrice`,
// `formatChangePercent`, `directionOf` and the two constants behind them moved
// to `market/price-format.ts` when Task 2.12.3's value axis became the third
// consumer — which is the condition `series-facts.ts` wrote down for the move.
// What is left here is the arithmetic that is about *this* subject: the change
// between two sessions' closes, and the session a column of them shares.

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
