import { marketDateAt } from "./market-time.js";

import type { Bar } from "./bar.js";
import type { MarketDate } from "./market-time.js";
import type { SecurityLastClose } from "./securities-response.js";

// Turning a stored close and a live price into the figure a surface shows
// (Task 2.9.7, made session-aware by Task 3.6.1, **moved here from
// `apps/frontend/src/components/UniverseTable/last-close.ts` on 2026-09-26 by
// Task 4.2.3**).
//
// ## Why it is here rather than beside the table that first rendered it
//
// `last-close.ts` wrote down its own condition for the move, and this is it
// being met: `price-format.ts` left that file the day a third consumer
// arrived, and Story 4.2's backend join is the third consumer of *this*
// arithmetic. It was already reaching across a component boundary —
// `SecurityIdentity` imported it from `UniverseTable/` — which is the smaller
// half of the same smell.
//
// **The larger half is that the third consumer is a different process.**
// Story 4.2's acceptance criterion 2 requires the change to be computed by
// `changeFromClose`, and criterion 4 requires the computation to be
// backend-side; a frontend module cannot satisfy both. One implementation
// called by two processes is a *stronger* reading of criterion 2 than the one
// it replaces, not a weaker one.
//
// ## The invariant-1 argument, amended 2026-09-26
//
// The original note argued this arithmetic was not a violation of *the LLM
// never calculates* / *numbers come from deterministic code*, because both
// operands are read from stored bars and are already on screen — a subtraction
// whose operands are visible is not a number this product had to look up. That
// still holds, and it now holds **across a process boundary**: the same
// deterministic function produces the figure whether the caller is a browser
// rendering a row or the backend building an aggregate. What the move removes
// is the possibility of the two disagreeing, which is what invariant 1 is
// actually protecting.
//
// The alternative — a `changePercent` field on the `/securities` wire — is
// unchanged and still worse: a third representation of two numbers with
// nothing holding it to them, and the client still has to format it.
//
// ## What is deliberately not here
//
// **No formatting, no colour and no direction.** `formatPrice`,
// `formatChangePercent` and `directionOf` are the frontend's
// `market/price-format.ts` and stay there: a spelling is a property of a
// surface, and the backend has no surface. This module produces figures.
//
// **No absolute change.** The percentage is the comparable figure across a
// column of securities trading between $3 and $700.
//
// **Not `commonSession`.** That one is about a *response* — whether 518 rows
// share one date so a table can state it in a heading once — which is a fact
// about one frontend view rather than about the arithmetic. It stayed in
// `last-close.ts`.

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
 * **That branch is why this function exists, and it is the reason the move to
 * this package was a move rather than a re-implementation.** A backend author
 * writing the join from scratch reads `close.close`, gets a correct-looking
 * number for most of the day, and ships the ≈0.00% failure above to whatever
 * surface renders it.
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
  // `marketDateAt` is `market-time.ts`'s — next door now rather than across
  // the package boundary — and a lint rule forbids spelling the market's
  // timezone anywhere else, so this comparison cannot quietly become an
  // offset somebody hard-coded. It is a pure function of an instant and reads
  // no clock, which is what lets this module stay callable from a replay.
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
