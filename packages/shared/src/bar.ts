/**
 * A price observation over an interval, and the intervals this product asks
 * for.
 *
 * This is the type every number on every chart is eventually made of, and it is
 * deliberately the smallest honest description of one. `PROVIDER.md` §9.1
 * settled the field set against the vendor's own list rather than by copying
 * it, and the rule it applied is `API_ERROR_CODES`' rule one layer up: **a
 * field exists when something reads it.** Every field here is a column in Story
 * 2.8's ~10-million-row table, a property in Story 2.9's wire contract, a value
 * Story 2.14 has to be honest about, and something Epic 13 has to reproduce
 * as-of a past instant.
 *
 * ## What is not here, and what would bring it back
 *
 * - **VWAP.** The tempting reader is Epic 5's volume work, and *"Epic 5 might
 *   want it"* is not a reader. Trigger: a named calculation in a story that
 *   exists.
 * - **Trade count.** The interesting-sounding reader is telling "no trades"
 *   apart from "no data", and it does not work — a bar exists *because* trades
 *   happened, so the count is never zero on a bar that is present, and the
 *   absent case is exactly the one it cannot speak to. That question belongs to
 *   Task 2.6.3's coverage record and Story 2.8's gap handling.
 * - **The symbol, and the timeframe.** Both are properties of the *series*, not
 *   of a bar (Task 2.6.3 builds it). A bar carrying either is ten million
 *   copies of one constant, in the table and on the wire.
 * - **Provenance.** Also the series': Task 2.6.3, and acceptance criterion 3.
 * - **A `isBar` predicate.** Task 1.7.3's rule is that a validator ships with
 *   its first reader, because one written anywhere but beside its shape drifts
 *   from it. The first thing to receive a bar it did not construct is Story
 *   2.7's mapping of a real vendor response; the first thing to receive one
 *   over the wire is Story 2.12's chart.
 */

/**
 * One price observation.
 *
 * ## `startsAt`, never `timestamp`, and the NAME is the mechanism
 *
 * Both conventions exist in the wild: a bar labelled 09:30 may cover
 * 09:30–09:31 or 09:29–09:30. A one-minute systematic error of that kind is
 * **invisible on a chart and wrong in every anomaly calculation**, so it must
 * not be a thing you discover by inspection.
 *
 * The cheap structural fix is the field name. A mapping that gets it backwards
 * then reads as an obvious contradiction in the code that writes it, rather
 * than as a perfectly plausible assignment — and confirming which end the
 * vendor marks against a real response is a stated obligation on Story 2.7
 * (`PROVIDER.md` §6.4), not an assumption made here.
 *
 * It is an **instant**, and it follows `CALENDAR.md` §5 without re-deciding
 * any of it: storage is `timestamptz`, the wire is a UTC ISO 8601 string with
 * the `Z`, `America/New_York` exists only at the moment of display, and exactly
 * one module converts — enforced since Task 2.5.2 by two `no-restricted-syntax`
 * rules. A `Date` here rather than a string is `MarketSession`'s precedent,
 * which holds its `open` and `close` the same way.
 *
 * ## The numbers are `number`, and that is a decision with product weight
 *
 * `migrations/README.md` fixed the storage half and it does not move: money is
 * `numeric(18,6)` in Postgres and never a float, because float addition is not
 * associative — `sum()` over `[1e16, 1.0, -1e16]` returns 0 or 1 depending on
 * order, measured — so a percentage change can disagree with itself between two
 * renders because a query plan changed the aggregation order.
 *
 * The consequence is that `pg` hands JavaScript a `numeric` as a **string**,
 * deliberately, and the domain type has to choose. `PROVIDER.md` §9.5 chose
 * `number`, on four arguments: a single price at scale 6 is *exact* in a double
 * to ~9×10⁹, four orders of magnitude beyond any equity price, and only
 * accumulation is lossy; nothing in V1 accumulates prices, since §11's four
 * calculations are a division, an ordering, a division of integers and a count;
 * a `string` pushes a parse into every consumer and buys nothing, because a
 * chart axis cannot draw one so the parse happens regardless; and a branded
 * number you must unwrap to add is friction without a guarantee.
 *
 * **The guard, which nothing checks and which is therefore written here as well
 * as in `PROVIDER.md`:** an aggregate over prices is computed in SQL over
 * `numeric`, never in JavaScript over this type. That is what the database is
 * for, and `numeric(18,6)` was chosen precisely so the exact computation is
 * available where it is needed. The reversal trigger is a price aggregate that
 * genuinely has to run in the browser, at which point the honest answer is a
 * `string` on the wire and a decimal library — a bigger decision than this one.
 *
 * Story 2.9's JSON therefore carries these as JSON numbers and `startsAt` as an
 * ISO 8601 string; the conversion happens **once**, in the mapper beside the
 * query, which is `toSecurity`'s precedent — one function per domain type and
 * never a generic mapper.
 */
export interface Bar {
  /**
   * The instant the interval **begins**. Inclusive; the interval is half-open,
   * matching {@link TimeRange}. A `1m` bar at 13:30:00Z covers 13:30:00 up to
   * but not including 13:31:00.
   *
   * For a `1d` bar this is the session's open instant rather than midnight —
   * the market is what the bar is about, and a session is not a calendar day.
   * Confirming what the vendor sends is Story 2.7's (`PROVIDER.md` §6.4).
   */
  readonly startsAt: Date;
  /** First trade price in the interval. */
  readonly open: number;
  /** Highest trade price in the interval. */
  readonly high: number;
  /** Lowest trade price in the interval. */
  readonly low: number;
  /** Last trade price in the interval. */
  readonly close: number;
  /**
   * Shares traded in the interval. A count rather than money, so the
   * `numeric(18,6)` rule above does not apply to it — and it is the one value
   * in this type that V1 does sum. Exact in a double to 2^53 ≈ 9×10¹⁵ against
   * daily volumes around 10⁹.
   */
  readonly volume: number;
}

/**
 * The intervals a caller may ask for. Two members, and that is the decision
 * rather than a starting point.
 *
 * Our vocabulary, not the vendor's `1Min`/`1Day`, so a typo is a compile error
 * and Task 2.6.6's fixture provider and Story 2.7's client are checked against
 * the same set — `SECURITY_KINDS`' argument.
 *
 * - **`1m`** — Story 2.8's ingestion, Epic 5's five-minute returns, Epic 13's
 *   replay.
 * - **`1d`** — a multi-month chart, which at daily resolution is ~500 rows
 *   against ~200,000, and Epic 5's 60-trading-day baseline. The second reason
 *   is the stronger one and is easy to miss: a vendor's daily bar is the
 *   official session OHLC *including auction prints*, which single-venue minute
 *   bars may simply not contain — so a daily bar derived from our minute bars
 *   would be a different and worse number rather than the same one computed
 *   twice.
 *
 * **Aggregation is not expressible, and that is the decision rather than an
 * omission.** A caller cannot ask for 5-minute bars. Epic 5 computes them from
 * stored minute bars, for two reasons: Epic 13's replay has to reconstruct them
 * as-of a past instant from what was stored anyway, so a provider-side
 * aggregate would be a second source of truth replay could not use; and
 * provider-side and our-side aggregation disagree at a session boundary, which
 * is exactly where a half day makes the disagreement largest.
 *
 * There is deliberately **no map from a timeframe to a duration**, because one
 * would have to give `1d` a number and every number would be a lie: a regular
 * session is 6.5 hours, a half day is 3.5, and a calendar day is neither.
 * `market-session.ts` answers "how long was that day", and it answers it per
 * date.
 *
 * A plain `as const` literal, not built by calling anything — `packages/shared`
 * is inlined into the frontend bundle, and Task 2.3.8 measured that a literal
 * vocabulary is tree-shaken completely while one built by calling a function is
 * retained (`SECTOR_ETFS` cost 115 bytes to a page that never reads it).
 */
export const TIMEFRAMES = ["1m", "1d"] as const;

export type Timeframe = (typeof TIMEFRAMES)[number];
