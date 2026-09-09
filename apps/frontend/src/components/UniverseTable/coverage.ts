import { marketDateAt } from "@marketpulse/shared";
import type { MarketDate, SecurityCoverage } from "@marketpulse/shared";

// Turning the bar ledger's statement into words (Task 2.8.9).
//
// Pure functions over the wire records, in their own module beside the table
// that renders them, for the reason `groupUniverse` and `summarise` are
// exported from `UniverseTable.tsx`: what a number *reads* as is the half of
// this task most likely to be wrong, and it is testable without a DOM.
//
// ## What is deliberately not here
//
// **No percentage of anything.** Task 2.8.5 measured a mean of 364.3 bars per
// security-session against a nominal 390, so `barCount / (sessions × 390)`
// reads ~93% for a completely healthy store. That figure is *liquidity* — a
// thinly traded name has minutes with no print — and `bar-completeness.ts`
// calls it **density** and never *completeness*, in a separate column from the
// session count. Rendering it beside a security would be a wrong number wearing
// the shape of a right one, and it is the single most likely thing for somebody
// to add here.
//
// **No reason for a short history.** Task 2.8.7 shipped an attempt log that can
// separate a security blocked mid-backfill from one that listed inside the
// window, and this page must not join it: the reader of `/securities` is
// choosing something to look at, and *why* the depth is shallow is an
// operator's question with an operator's command (`pnpm bars:check`). The
// engineering word for it is `coverage-gap`, and there is no honest short
// sentence for that on a page a first-time viewer meets.

/**
 * Days per year and per month, as the ladder below rounds them.
 *
 * `365.25` rather than `365` so that a leap year does not round a year of
 * history to `1.1y`; `30.44` is a mean month for the same reason. Neither is a
 * calendar calculation and neither pretends to be — this is a **duration read
 * aloud**, and the whole point of the ladder is that it is coarse.
 */
const DAYS_PER_YEAR = 365.25;
const DAYS_PER_MONTH = 30.44;

/** Below this many days a duration reads in days rather than months. */
const MONTHS_FROM_DAYS = 45;

/**
 * Above this many days it reads in years — a little under one, so that a year
 * of history that lost a session to a holiday still reads `1y`.
 */
const YEARS_FROM_DAYS = 350;

/**
 * How deep the history goes, as a duration.
 *
 * **A duration and not a bar count**, which is the decision this whole column
 * rests on: `1y` reads, `97,530 bars` does not, and the second invites
 * arithmetic nobody wants to do in their head to answer the question they
 * actually have — *is there enough of this to look at?*
 *
 * Deliberately coarse and deliberately unpadded. `1y`, `3mo`, `18d` — one
 * significant decision each. The alternative is `11mo 27d`, which is a more
 * precise answer to a question nobody asked and which changes width every day.
 */
export function formatDepth(coverage: SecurityCoverage): string {
  const days =
    (new Date(coverage.end).getTime() - new Date(coverage.start).getTime()) /
    86_400_000;

  if (days >= YEARS_FROM_DAYS) {
    // One decimal place, and no trailing `.0`: JavaScript prints `1` for `1.0`,
    // so `1y` and `1.5y` both fall out of the same expression with no string
    // surgery to get wrong.
    return `${String(Math.round((days / DAYS_PER_YEAR) * 10) / 10)}y`;
  }

  if (days >= MONTHS_FROM_DAYS) {
    return `${String(Math.round(days / DAYS_PER_MONTH))}mo`;
  }

  return `${String(Math.max(1, Math.round(days)))}d`;
}

/**
 * The trading day a covered window begins on.
 *
 * `marketDateAt` and not a hand-rolled conversion: `market-time.ts` is the one
 * module in this workspace permitted to convert an instant to market time, and
 * a lint rule enforces it (ADR 0017). The reason it matters here rather than
 * being ceremony is that a minute window opens at 09:30 ET, which is 13:30Z in
 * summer and 14:30Z in winter — the *same* calendar day either way, so a
 * `toISOString().slice(0, 10)` would be right all year and wrong for reasons
 * nobody could reconstruct the day the window shape changed.
 */
export function coverageStartDate(coverage: SecurityCoverage): MarketDate {
  return marketDateAt(new Date(coverage.start));
}

/**
 * The last trading day a covered window includes.
 *
 * **`end − 1ms`, because the range is half-open.** `end` is the first instant
 * we are *not* answered for; a session closing at 16:00 ET has an `end` of
 * exactly that, and reporting its market date directly is right by accident
 * today and wrong the moment a window ends at midnight. One millisecond is the
 * smallest thing that makes it right on purpose.
 */
export function coverageEndDate(coverage: SecurityCoverage): MarketDate {
  return marketDateAt(new Date(new Date(coverage.end).getTime() - 1));
}

/** What the summary line says about the store as a whole. */
export interface CoverageSummary {
  /** How many securities we hold any history for. */
  readonly securities: number;

  /** How many bars, in total, across all of them. */
  readonly bars: number;

  /**
   * The last trading day any of it reaches, or `null` when we hold nothing.
   *
   * The **maximum** rather than the minimum, and both are defensible: this is
   * "through when", which is a claim about the frontier the store has reached.
   * A backfill walks backwards from the most recent session (Task 2.8.6), so
   * every security shares this date and the securities that differ differ at
   * the *start*. If that ever stops being true, this figure becomes the
   * optimistic one and the honest thing to do is say so rather than switch it
   * silently.
   */
  readonly through: MarketDate | null;
}

/**
 * The store, in three numbers.
 *
 * The one place a bar count is used, and it is used as a **scale claim** — "we
 * hold 47.7M of these" — rather than as a per-row fact. That distinction is the
 * whole reason `SecurityCoverage.barCount` is on the wire at all.
 */
export function summariseCoverage(
  coverage: ReadonlyMap<string, SecurityCoverage>,
): CoverageSummary {
  let bars = 0;
  let through: MarketDate | null = null;

  for (const record of coverage.values()) {
    bars += record.barCount;
    const end = coverageEndDate(record);
    // A lexical comparison, which is exactly right for `YYYY-MM-DD` and is the
    // reason that format was chosen over anything friendlier: fixed-width,
    // zero-padded, most-significant-first, so string order *is* chronological
    // order. No parsing and nothing to get wrong.
    if (through === null || end > through) through = end;
  }

  return { securities: coverage.size, bars, through };
}

/**
 * A large count, at the scale a person reads.
 *
 * `47.7M` rather than `47,682,213`. The exact figure is diagnostic — it moves
 * every night the catch-up runs — and putting nine digits in a summary line
 * invites somebody to compare two of them by eye. One decimal place is enough
 * to tell 47M from 4.7M, which is the only comparison this number is for.
 */
export function formatBarCount(bars: number): string {
  if (bars >= 1_000_000_000) {
    return `${String(Math.round(bars / 100_000_000) / 10)}B`;
  }
  if (bars >= 1_000_000) {
    return `${String(Math.round(bars / 100_000) / 10)}M`;
  }
  if (bars >= 10_000) {
    return `${String(Math.round(bars / 1000))}k`;
  }
  return String(bars);
}
