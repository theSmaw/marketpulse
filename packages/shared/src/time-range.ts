/**
 * The window a market-data request is made over.
 *
 * ## One type rather than two parameters, and the brand is what makes that true
 *
 * A start and an end passed as two arguments can be swapped at a call site and
 * nothing notices — which is `marketSessionsBetween`'s argument, and it refuses
 * a reversed range rather than answering with an empty array that hides the
 * swap. A bare `{ start, end }` interface fixes only half of that: it stops the
 * *positional* mistake and does nothing about the *invalid* one, because a
 * caller writes the object literal directly and the constructor is never
 * reached.
 *
 * So {@link TimeRange} is **branded**, exactly as `Ticker` is and for the same
 * reason: it is structurally an object with two dates, it is not assignable
 * *from* one, and {@link toTimeRange} is the only way to obtain one. The brand
 * exists only in the type system and is erased at runtime, so it costs nothing
 * on the wire and nothing in the bundle.
 *
 * The cost, stated: a range parsed out of JSON is not a `TimeRange` and has to
 * be re-validated. That is the correct behaviour rather than friction — a range
 * that arrived from outside this process has not been checked by anything.
 *
 * ## Half-open, `[start, end)`, and it is not a stylistic choice
 *
 * `start` is included and `end` is not. That is what makes adjacent windows tile
 * without a duplicated bar at the seam, which Story 2.8's backfill does
 * thousands of times: `[09:30, 10:00)` followed by `[10:00, 10:30)` covers every
 * minute exactly once, where two inclusive ranges both claim the 10:00 bar. A
 * duplicated bar at a seam is a real corruption rather than a cosmetic one —
 * `market_bars`' unique constraint would reject the second write, and the
 * backfill would report a failure that was actually the database being right.
 *
 * Story 2.7's client owes the reconciliation this implies: the vendor's `end`
 * is not half-open, so the mapping is off by one interval at the top and that
 * belongs in the client rather than here (`PROVIDER.md` §9.3).
 *
 * ## Instants, and a market-date question is asked somewhere else
 *
 * Both ends are UTC instants. "The last five trading days" is a *market date*
 * question and is not expressible here: it goes through
 * `market-session.ts`'s `lastMarketSessions`, which already knows about
 * weekends, holidays and half days, and already refuses to walk off the end of
 * the calendar rather than truncating. The sessions it returns carry the
 * instants a range is then built from.
 */

declare const brand: unique symbol;

/**
 * A validated half-open window between two instants, `[start, end)`.
 *
 * Obtain one from {@link toTimeRange}. There is deliberately no other way.
 */
export interface TimeRange {
  /** The first instant in the window. Included. */
  readonly start: Date;
  /** The instant the window stops at. **Excluded** — see the module comment. */
  readonly end: Date;
  /** Type-system only; erased at runtime. */
  readonly [brand]: "TimeRange";
}

/**
 * Builds a {@link TimeRange}, refusing anything that is not one.
 *
 * Three refusals, each of which is a programming error rather than a market
 * condition — so this throws, as `toTicker` does, rather than returning a
 * result a caller might forget to check:
 *
 * - an **invalid** `Date` at either end, which otherwise propagates silently:
 *   `new Date("nonsense")` compares as neither less than nor greater than
 *   anything, so an invalid range is not caught by the ordering check below and
 *   goes on to produce an empty answer nobody can explain
 * - a **reversed** range
 * - a **zero-width** range, which under half-open semantics contains nothing at
 *   all. It is refused with the reversed case rather than allowed, because the
 *   only ways to arrive at one are a swapped pair that happened to be equal or
 *   an off-by-one, and an empty series is a plausible-looking answer to both
 *
 * The message names **both** ends, because the whole failure mode is not
 * knowing which of the two is wrong.
 */
export function toTimeRange(start: Date, end: Date): TimeRange {
  for (const [name, value] of [
    ["start", start],
    ["end", end],
  ] as const) {
    if (Number.isNaN(value.getTime())) {
      throw new RangeError(
        `Time range ${name} is an invalid Date. An invalid instant compares ` +
          `as neither before nor after anything, so it would produce an empty ` +
          `result rather than an error at the point of use.`,
      );
    }
  }

  if (start.getTime() >= end.getTime()) {
    throw new RangeError(
      `Time range is ${start.getTime() === end.getTime() ? "zero-width" : "reversed"}: ` +
        `start ${start.toISOString()} is not before end ${end.toISOString()}. ` +
        `Ranges are half-open, [start, end), so an empty result here would ` +
        `hide a swapped or off-by-one pair.`,
    );
  }

  // The one cast in this module, and it is what a brand costs: the object is
  // correct by construction at exactly this point and nowhere else, which is
  // the property the brand exists to carry to every call site downstream.
  return { start, end } as TimeRange;
}
