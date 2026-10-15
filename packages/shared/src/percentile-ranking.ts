/**
 * **The order a list of price percentiles goes in, and the only place it is
 * decided** (Task 5.4.2).
 *
 * ## A sibling of `sector-ranking.ts`, not a widening of it
 *
 * `compareByMove` ranks two **moves** — a signed percentage against a close,
 * rounded to the precision the screen draws, strongest first. This ranks two
 * **ordinals**: integers `0`–`99` saying where a magnitude sits in that
 * security's own 60-session history. Different subject, different precision
 * (an ordinal is already integral, so there is nothing to round), different
 * tie-break, and a different reason for one: ADR 0043's lesson one quantity
 * over, which is that two quantities sharing a shape are not one quantity.
 *
 * Reusing `compareByMove` would have been one line and is wrong in both
 * directions. A `WireUnusualRow` has no `changePercent`, so
 * `moveRankingKey` answers `undefined` for every row and the whole list sorts
 * as unrankable; and a ranking on the row's **move** instead would order the
 * region by the thing `Movers` already ranks, which is this region's whole
 * reason for existing stated backwards.
 *
 * ## The tie-break is DECLARED, because it cannot be inherited
 *
 * `compareByMove` answers `0` for a display-equal pair and leans on
 * `Array.prototype.sort` being stable, which makes the tie-break *the order it
 * was given* — safe there because the producer hands it `SECTORS`' declared
 * order. **There is no such order here.** This list arrives in the join's
 * order, which is the universe's, filtered by a live eligibility pass that
 * changes membership up to ~16 times a minute — so *the order it was given* is
 * not stable between two frames, and two securities on the same ordinal would
 * swap under a reader with nothing having changed. ADR 0041's own rule is that
 * a re-order owes the reader a reason.
 *
 * So ties break on **ticker ascending**, which is a total order over a set
 * whose members are unique by construction, and the whole comparator is
 * therefore a total order: the same set of rows produces the same list on every
 * frame, in every process, for ever.
 *
 * Integer ordinals over 501 securities make ties **routine rather than rare** —
 * at most 100 distinct values for 501 candidates, so by the pigeonhole
 * principle some ordinal is shared whenever more than 100 are scored.
 */

/**
 * What the order needs to know about a row: where it sits, and which security
 * it is.
 *
 * **The minimum rather than `WireUnusualRow`**, for `compareKeys`' reason one
 * module over: the comparator is a rule about two ordinals, and a function
 * taking the wire row would be a rule that cannot be stated about anything
 * else — including the backend's own pre-encode candidates and a browser spec's
 * independent recompute.
 */
export interface PercentileRanked {
  /** The integer ordinal, `0`–`99`. */
  readonly rank: number;
  /** The security, and the declared tie-break. */
  readonly symbol: string;
}

/** `a` sorts before `b` — `sector-ranking.ts`' two sign values, by name. */
const STRONGER = -1;

/** `a` sorts after `b`. */
const WEAKER = 1;

/**
 * **The one comparison of two percentiles in this repository** — most unusual
 * first, then ticker ascending.
 *
 * It returns a **sign** rather than a difference, `compareByMove`'s shape for
 * `compareByMove`'s reason: a bounded selection has to ask *which of these two
 * is more unusual* without testing a magnitude against zero, so
 * {@link selectByPercentile} can reuse this function rather than re-expressing
 * its arithmetic.
 *
 * **A non-finite or non-integer rank is refused rather than ordered.** A `NaN`
 * in a comparator has no defined result — `Array.prototype.sort` with one is
 * implementation detail for the whole array, not for one element — and this
 * function is called **in-process, before the encode**, so it is inside the gap
 * the serialiser's own guarantee cannot reach. A row with no honest ordinal is
 * never built by the producer, which is the stronger statement; this is the
 * fallback that keeps the order defined if one ever is.
 */
export function compareByPercentile(
  a: PercentileRanked,
  b: PercentileRanked,
): number {
  const ranked = Number.isInteger(a.rank);
  const other = Number.isInteger(b.rank);

  if (ranked && other && a.rank !== b.rank) {
    // **The one comparison of two ordinals in this repository**, and the
    // anchor `one-comparator-for-the-order-of-a-percentile` is keyed on: a
    // second ranking of these figures cannot be written without putting two of
    // them either side of one operator.
    //
    // **The two operands are spelled as property reads rather than bound to
    // locals, and that is the check's pattern rather than a style.** The check
    // requires each side to be a member access ending in the ordinal's name,
    // because `rank` names three unrelated orderings in this tree — a security
    // **kind**'s rank, a search **tier**'s rank and a breakpoint index — and a
    // clause over the bare word is red on all three. `right > left` with the
    // ordinals in locals is a comparison the pattern cannot see, and the first
    // draft of this function wrote exactly that; it is written in front of the
    // check on purpose, which is `five-minute-return.ts`' own note one quantity
    // over.
    return b.rank > a.rank ? WEAKER : STRONGER;
  }

  // The absent-ordinal rule, `compareKeys`' three lines: two rows with no
  // honest ordinal are not *equally ordinary*, they are equally unrankable, so
  // they fall through to the tie-break and stay deterministic anyway.
  if (!ranked && other) return WEAKER;
  if (ranked && !other) return STRONGER;

  // **The declared tie-break, and never a `0`.** Returning `0` here would
  // delegate the answer to the array's arrival order, which is the join's and
  // is not stable between frames — see this module's header.
  if (a.symbol === b.symbol) return 0;
  return a.symbol > b.symbol ? WEAKER : STRONGER;
}

/**
 * **How many rows the region carries, and it is one fact rather than two**
 * (Task 5.4.2) — `MOVERS_PER_SIDE`' argument, inherited rather than re-made:
 * the producer slices to this and the drawing reserves room to it, so the
 * bound and the height must not be two numbers.
 *
 * **Five is provisional and the measurement is Task 5.4.3's**, which is stated
 * here rather than left to be discovered. Task 5.4.1 measured this region's own
 * chrome at **159 px** against a 1440x900 box of 159, so **zero rows fitted at
 * every viewport height** before the grid was re-areaed; the re-areaed region
 * sits on a `minmax(min-content, 1fr)` row at ~491 px and the row count is a
 * probe at that height with real content in it (AC 1). The byte cost of moving
 * it is linear and measured: Task 5.4.2 took the section at five rows and at
 * ten.
 *
 * A height that grows beyond the region's box is `MARKET-OVERVIEW.md` §1.4's
 * trigger, not a producer's decision — rows 2 and 3 of the landing grid share
 * one `fr`, so a sixth row raises two other regions with it.
 */
export const UNUSUAL_ROWS = 5;

/**
 * **The most unusual `limit` rows, bounded rather than sorted** — Task 5.4.2,
 * and `selectMovers`' shape for its measured reason.
 *
 * A full sort of 501 rows is several times the work for an order nobody sees,
 * on a path that runs on every applied batch inside the socket's own callback.
 * The insertion is `O(n · limit)` with `limit` five, and it goes through
 * {@link compareByPercentile} on every comparison so there is no second
 * expression of the order to drift from the first.
 *
 * It is a **selection**, so the rows it returns are exactly rows the caller
 * handed it — never a padded list, never a placeholder. A region with fewer
 * than `limit` scored securities draws fewer rows and reserves the room, which
 * is `withHeldRows`' job and not a producer's.
 */
export function selectByPercentile<T extends PercentileRanked>(
  rows: readonly T[],
  limit: number,
): readonly T[] {
  if (limit <= 0) return [];

  const top: T[] = [];

  for (const row of rows) {
    let at = top.length;
    while (at > 0) {
      const above = top[at - 1];
      if (above === undefined) break;
      if (compareByPercentile(above, row) !== WEAKER) break;
      at -= 1;
    }

    if (at >= limit) continue;

    top.splice(at, 0, row);
    if (top.length > limit) top.pop();
  }

  return top;
}
