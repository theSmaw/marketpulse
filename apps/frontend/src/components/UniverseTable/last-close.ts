import { marketDateAt } from "@marketpulse/shared";
import type { Bar, MarketDate, SecurityLastClose } from "@marketpulse/shared";

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
 * What a live price has moved, and **the session it was measured from**
 * (Task 3.4.2; made session-aware by Task 3.6.1).
 *
 * **A different basis from {@link changePercent}, and that is the whole
 * reason it is a second function rather than a parameter.** That one is
 * close-against-previous-close — a completed session's move, which never
 * changes once the session has closed. This is live-against-a-close, which is
 * what every market screen means by *today* and which moves while somebody
 * watches it.
 *
 * **Keeping one function with a flag would have been the defect**: a version
 * that showed a live price beside a percentage still measured between two old
 * closes would show a figure that never moved beside a number that did, and
 * nothing about it would look wrong.
 *
 * ## Which close, and the wrong answer that looks completely right
 *
 * **Not always `close.close`.** `SecurityLastClose` is *the last session we
 * hold a daily bar for*, and during a live session that is normally the
 * previous one — but the nightly backfill writes today, so the store's last
 * session and the live bar's session **meet**, every evening in development and
 * on a cold load the morning after a deploy.
 *
 * When they meet, measuring against `close.close` compares a price with a close
 * **from its own session**, and the whole table reports **≈0.00%**. That is the
 * failure worth naming: it is not a crash, a blank or a wrong-looking figure.
 * It is 518 well-formed, correctly-formatted, correctly-coloured numbers saying
 * the market did not move. So the basis is chosen by comparing sessions, and
 * `previousClose` — already on the wire, already read from the store rather
 * than computed off a calendar — is what the same-session case uses.
 *
 * ## Why it returns the session as well as the figure
 *
 * Because a caller renders *“change from 2026-09-19's close”*, and a caller
 * that re-derives which close was used is a second copy of this decision that
 * nothing holds to the first. One fact, one home: the function that picks the
 * basis is the function that says which it picked.
 *
 * `percent` is `null` when there is nothing to measure from — no stored daily
 * bar, or the same-session case with only one stored session behind it. §36's
 * partial answer, rendered as an **absence rather than a zero**: `0.00%` there
 * would claim the price has not moved, which is not what *we cannot say*
 * means. A zero basis is `null` too, for {@link changePercent}'s reason — the
 * division is `Infinity` and formats as `"+Infinity%"`.
 */
export interface LiveChange {
  /** The signed percentage, or `null` when there is nothing to measure from. */
  readonly percent: number | null;

  /**
   * The session whose close the percentage was measured from, or `null` when
   * there is no figure. **The caller names this rather than the row's own
   * `session`** — they differ in exactly the case this function exists for.
   */
  readonly basis: MarketDate | null;
}

const NO_LIVE_CHANGE: LiveChange = { percent: null, basis: null };

export function changeFromClose(
  live: Bar,
  close: SecurityLastClose | undefined,
): LiveChange {
  if (close === undefined) return NO_LIVE_CHANGE;

  // **The live bar's own session, from the one module allowed to ask.**
  // `marketDateAt` is `packages/shared/src/market-time.ts`'s, and a lint rule
  // forbids spelling the market's timezone anywhere else — so this comparison
  // cannot quietly become an offset somebody hard-coded.
  const liveSession = marketDateAt(live.startsAt);

  const sameSession = liveSession === close.session;
  const basisPrice = sameSession ? close.previousClose : close.close;
  const basisSession = sameSession ? null : close.session;

  if (basisPrice === null || basisPrice === 0) return NO_LIVE_CHANGE;

  return {
    percent: ((live.close - basisPrice) / basisPrice) * 100,
    // The same-session case has a price to measure from and **no session name
    // on the wire for it**: `previousClose` is a number without a date beside
    // it. Saying `null` is the honest answer, and a caller renders the clause
    // as *the previous close* rather than inventing a date by arithmetic.
    basis: basisSession,
  };
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
