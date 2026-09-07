/**
 * A run of bars for one symbol, at one timeframe, that **cannot exist without
 * saying where it came from**.
 *
 * That sentence is Story 2.6's acceptance criterion 3, and this module is where
 * it stops being a convention. The mechanism is a constructor rather than a
 * habit: {@link BarSeries} is branded, {@link toBarSeries} is the only way to
 * obtain one, and it requires provenance and then checks that the record and
 * the bars actually agree. It is the arrangement `toTimeRange` shipped one task
 * earlier, and `securities.ts`'s unexported query handle before that, applied
 * to data rather than to a connection.
 *
 * A required field alone would already make a series without provenance
 * uncompilable. The brand buys the half a required field cannot: **a hand-
 * written object literal skips every coherence check below**, and the checks
 * are where the interesting failures live — a stitcher that concatenated two
 * arrays and kept one source record, bars that arrived out of order, a covered
 * range that claims less than the bars it contains.
 *
 * The cost, stated rather than discovered: a series parsed out of JSON is not a
 * `BarSeries` and has to be re-validated. That is correct behaviour — a series
 * that arrived from outside this process has been checked by nothing — and it
 * is the same cost `TimeRange` already carries.
 *
 * ## Coverage, and the question it does not answer
 *
 * {@link SeriesCoverage} says **how far the answer reaches, not whether it is
 * dense.** A thinly traded name with no print in a given minute produces a
 * covered range with holes in it, and telling that apart from a failed fetch is
 * Story 2.8's gap handling, which is where that acceptance criterion already
 * lives. There is deliberately no derived `complete` flag, for the reason
 * `securities-response.ts` refused a `count`: a second copy of a fact whose
 * only interesting behaviour is to disagree with the first.
 *
 * It lives on the **series** rather than on a response envelope, on the
 * argument that made provenance not a caption: an envelope is a fact about one
 * HTTP exchange and a series outlives it, so the moment anything passes a
 * `BarSeries` alone into a chart, a store or an anomaly calculation, an
 * envelope-level coverage field is gone and the partiality is silent. Story
 * 2.14's *"we have data through 15:42"* is `coverage.covered.end`, computed by
 * whoever is making the claim.
 */

import type { Bar, Timeframe } from "./bar.js";
import type { SeriesProvenance } from "./market-provenance.js";
import type { Ticker } from "./ticker.js";
import type { TimeRange } from "./time-range.js";

/**
 * What was asked for, and how much of it this answer reaches.
 */
export interface SeriesCoverage {
  /** Exactly the window that was requested. */
  readonly requested: TimeRange;

  /**
   * The window this answer actually reaches, or `null` when the series is
   * empty.
   *
   * `null` rather than a zero-width range because ranges are half-open and
   * `[t, t)` is refused at construction — and because "we can make no claim"
   * and "we cover an instant" are different statements. The consequence worth
   * knowing: an empty answer says nothing here about *why* it is empty, and a
   * consumer that needs to tell "nothing traded" from "we never asked" reads
   * {@link requested} beside it.
   */
  readonly covered: TimeRange | null;
}

declare const brand: unique symbol;

/**
 * Bars for one symbol at one timeframe, with the record of where they came
 * from.
 *
 * Obtain one from {@link toBarSeries}. There is deliberately no other way.
 */
export interface BarSeries {
  /**
   * The security. On the series and not on a bar: a bar carrying it is ten
   * million copies of one constant, in the table and on the wire.
   */
  readonly symbol: Ticker;

  /** The interval each bar covers. On the series for `symbol`'s reason. */
  readonly timeframe: Timeframe;

  /** Ascending by `startsAt`, strictly. May be empty. */
  readonly bars: readonly Bar[];

  /** Where they came from, and what has been done to the numbers. */
  readonly provenance: SeriesProvenance;

  /** How far this answer reaches, against what was asked for. */
  readonly coverage: SeriesCoverage;

  /** Type-system only; erased at runtime. */
  readonly [brand]: "BarSeries";
}

/** Everything {@link toBarSeries} needs, which is everything a series has. */
export interface BarSeriesInput {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;
  readonly bars: readonly Bar[];
  readonly provenance: SeriesProvenance;
  readonly coverage: SeriesCoverage;
}

/**
 * Builds a {@link BarSeries}, refusing one whose parts do not agree.
 *
 * Every refusal is a programming error rather than a market condition, so this
 * throws — the line `toTicker` and `toTimeRange` already draw, and the reason a
 * market condition (no data, rate limited, upstream down) is a *result* and
 * belongs to the provider interface instead.
 *
 * What it checks, and why each one is worth a check rather than a comment:
 *
 * - **The bars are strictly ascending.** Everything downstream — a chart axis,
 *   a return, a percentile window, a replay cursor — assumes it, and an
 *   out-of-order pair is the shape a naive concatenation produces.
 * - **The source bar counts sum to the number of bars.** This is the one that
 *   catches the stitch the whole record exists for: two arrays joined and one
 *   provenance record kept is a series claiming all its bars came from
 *   whichever half wrote the record last.
 * - **`covered` is null exactly when the series is empty.** A covered range
 *   over no bars is a claim with nothing behind it; an empty range over bars is
 *   an answer that hides itself.
 * - **Every bar starts inside `covered`.** A bar outside the window the answer
 *   claims to reach means one of the two is wrong, and Story 2.14 renders the
 *   window rather than the bars.
 * - **`covered` lies inside `requested`.** You cannot cover more than you asked
 *   for, and a stretch beyond it means somebody passed the provider's window
 *   rather than the caller's.
 */
export function toBarSeries(input: BarSeriesInput): BarSeries {
  const { bars, provenance, coverage } = input;

  for (let i = 1; i < bars.length; i += 1) {
    const previous = bars[i - 1];
    const current = bars[i];
    if (
      previous === undefined ||
      current === undefined ||
      current.startsAt.getTime() <= previous.startsAt.getTime()
    ) {
      throw new RangeError(
        `Bars must be strictly ascending by startsAt, but bar ${String(i)} ` +
          `starts at ${describe(current?.startsAt)} and the one before it ` +
          `starts at ${describe(previous?.startsAt)}. Everything downstream ` +
          `assumes the order, and a repeated or reversed pair is what a naive ` +
          `concatenation produces.`,
      );
    }
  }

  const claimed = provenance.sources.reduce(
    (total, source) => total + source.barCount,
    0,
  );
  if (claimed !== bars.length) {
    throw new RangeError(
      `Provenance accounts for ${String(claimed)} bars but the series holds ` +
        `${String(bars.length)}. A series whose sources do not add up is one ` +
        `claiming its bars came from somewhere they did not.`,
    );
  }

  if (bars.length === 0) {
    if (coverage.covered !== null) {
      throw new RangeError(
        `An empty series must have a null covered range: there are no bars to ` +
          `support the claim that anything was covered.`,
      );
    }
    return input as BarSeries;
  }

  const covered = coverage.covered;
  if (covered === null) {
    throw new RangeError(
      `A series holding ${String(bars.length)} bars must say what range it ` +
        `covers; a null covered range means "we can make no claim", which is ` +
        `not true of an answer that has bars in it.`,
    );
  }

  for (const bar of bars) {
    const at = bar.startsAt.getTime();
    if (at < covered.start.getTime() || at >= covered.end.getTime()) {
      throw new RangeError(
        `Bar at ${bar.startsAt.toISOString()} starts outside the covered ` +
          `range [${covered.start.toISOString()}, ${covered.end.toISOString()}). ` +
          `Ranges are half-open, so a bar exactly at the end is outside it.`,
      );
    }
  }

  const requested = coverage.requested;
  if (
    covered.start.getTime() < requested.start.getTime() ||
    covered.end.getTime() > requested.end.getTime()
  ) {
    throw new RangeError(
      `Covered range [${covered.start.toISOString()}, ` +
        `${covered.end.toISOString()}) reaches outside the requested range ` +
        `[${requested.start.toISOString()}, ${requested.end.toISOString()}). ` +
        `An answer cannot cover more than was asked for.`,
    );
  }

  // The one cast in this module, and it is what a brand costs: the value is
  // correct by construction at exactly this point and nowhere else, which is
  // the property the brand carries to every call site downstream.
  return input as BarSeries;
}

/** `noUncheckedIndexedAccess` makes the loop above hand us possible gaps. */
function describe(value: Date | undefined): string {
  return value === undefined ? "nothing" : value.toISOString();
}
