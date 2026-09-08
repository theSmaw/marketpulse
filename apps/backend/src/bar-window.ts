/**
 * The window to ask a market-data provider over, given the sessions it should
 * cover (Task 2.8.6).
 *
 * **Extracted from `fetch-bars.ts` rather than copied out of it**, and the
 * extraction is the decision. Task 2.7.3 wrote this for `pnpm bars` and Story
 * 2.8's backfill needs the identical arithmetic across ~5,000 requests; a
 * second copy would be the trap `alpaca-mapping.ts` already names for the
 * inclusive-`end` conversion, arriving one level up. A window shape that
 * disagrees between the command a person checks by eye and the command that
 * fills the database is the worst possible place for it to disagree, because
 * only one of the two is ever looked at.
 *
 * So: one function, two callers, named for what it produces rather than for
 * either command.
 */

import {
  instantFromMarketTime,
  nextMarketSession,
  toMarketTimeOfDay,
  toTimeRange,
  type MarketSession,
  type TimeRange,
  type Timeframe,
} from "@marketpulse/shared";

/** Midnight ET, which is where this vendor stamps a daily bar. */
const MIDNIGHT = toMarketTimeOfDay("00:00");

/**
 * The window to ask over, and **the two timeframes need different shapes**.
 *
 * This is the trap `alpaca-mapping.ts` warns about, met in the one place it can
 * actually bite: a minute bar is stamped inside the session, and a **daily bar
 * is stamped at midnight ET** — `04:00:00Z` under EDT, hours *before* the
 * session opens. So a daily request framed on `[open, close)` contains no daily
 * bar at all and returns a perfectly well-formed **empty** answer.
 *
 * That is the shape of failure this whole story is written against, and it was
 * produced here rather than reasoned about: `pnpm bars NVDA 1d` printed *"no
 * bars"* against a session window before this function existed.
 *
 * So a daily window runs from midnight ET on the first date to midnight ET on
 * the day *after* the last — half-open, so the final day's bar is included and
 * the next one is not. `nextMarketSession` supplies that upper bound from the
 * calendar rather than by adding 24 hours, which would be an hour wrong across
 * a DST transition.
 *
 * ## What a MINUTE window must be, and it is the most expensive thing in Story
 * 2.8 to get wrong
 *
 * `[first.open, last.close)`. When `first` and `last` are the same session that
 * is exactly one session, and Task 2.7.5 measured that shape at **1.00×** the
 * regular-hours bar count. Span more than one session and the window covers the
 * nights in between, which SIP fills with pre- and post-market prints:
 * **2.35× at 25 sessions, 57.5% of it extended hours** the trading calendar
 * says should not be there.
 *
 * That is correct behaviour for `pnpm bars --from X --to Y`, where a person
 * asked for a span. It is wrong for the backfill, which stores what it is
 * given — so the backfill passes **one session** here per minute-bar request,
 * and that is a property of the caller rather than of this function. See
 * `backfill.ts`'s `SESSIONS_PER_REQUEST`.
 *
 * Note the trap one level up: sending explicit **instants** rather than bare
 * dates does not fix the inflation. It is a different trap (bare dates leak
 * extended hours too — 217 bars on a 210-minute half day), and fixing either
 * does nothing for the other.
 */
export function windowFor(
  timeframe: Timeframe,
  first: MarketSession,
  last: MarketSession,
): TimeRange {
  if (timeframe === "1m") {
    // Half-open, `[open, close)`. The mapping converts that to this vendor's
    // inclusive `end` by subtracting exactly one millisecond; nothing here
    // needs to know that, which is the point — and a second copy of that
    // subtraction anywhere is a duplicated bar at every seam, tiled across a
    // whole backfill.
    //
    // **`last.close` and not `first.close` since Task 2.7.5**, which is what
    // makes a `--from`/`--to` range mean the range rather than its first day.
    return toTimeRange(first.open, last.close);
  }

  return toTimeRange(
    instantFromMarketTime(first.date, MIDNIGHT),
    instantFromMarketTime(nextMarketSession(last.date).date, MIDNIGHT),
  );
}
