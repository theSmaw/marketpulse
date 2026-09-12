import type { MarketDate, Timeframe, TimeRange } from "@marketpulse/shared";
import {
  marketDateAt,
  marketSessionsBetween,
  TIMEFRAMES,
} from "@marketpulse/shared";

// **How far behind the store is, per timeframe, in trading sessions.**
//
// ## The failure this exists to make loud
//
// On 2026-09-12 the scheduled catch-up had been filling minute bars only for
// eight days. Every nightly run was **green**, because it did exactly what it
// was asked; it was asked for the wrong thing. The defect surfaced when a
// person noticed that an identity block reading a `1d` close and a chart
// reading `1m` bars disagreed by 4.6% on one screen.
//
// `scripts/check-backfill-coverage.mjs` now refuses that *contract* statically,
// in `pnpm verify`. **This module answers the question the static check cannot:
// is the store actually current?** A cron that is disabled, failing, throttled
// or quietly removed passes every static check there is — and `backfill.yml`
// records a real path to exactly that, since GitHub disables a `schedule:` on a
// repository with no pushes for 60 days.
//
// ## Why it is computed on request rather than on a schedule
//
// The instrument that failed here was `pnpm bars:check`, and its deeper problem
// was not that it was pointed at the wrong timeframe — it was that **it ran
// inside the job it was reporting on**. A report that lives inside the thing it
// reports on cannot report that thing not running. Silence read as health.
//
// So this is derived from the store whenever somebody asks. It has no schedule
// to miss, nothing to disable, and no state of its own to go stale. That is the
// whole design: the deployed check asserts it after every merge, and it is
// available to anything else that wants to say so on a screen.
//
// ## Why the ledger and not the bars
//
// `bar_coverage` is a few hundred rows regardless of how many bars exist, which
// is the property it was built for. The obvious alternative,
// `max(observed_at) group by security_id` over `market_bars`, is ~345k rows at
// `1d` and **fifty million** at `1m` — `readLastBarDates`' own interface
// documentation says so and reads at the daily timeframe for that reason.
//
// `BARS.md` §8.18 reached the same conclusion from the other side while
// diagnosing the bug: *"`bar_coverage.updated_at` — when what we hold last
// changed — is doing its job perfectly here. It is simply that nobody read it."*
// This is the reader.

/** What one timeframe's store looks like against the calendar. */
export interface TimeframeFreshness {
  readonly timeframe: Timeframe;
  /**
   * The newest session any security is covered through, as a market date.
   *
   * `null` when the store holds nothing at this timeframe at all — which is a
   * real state, not an error: CI's store holds 518 securities and zero bars.
   */
  readonly newestSession: MarketDate | null;
  /**
   * Completed trading sessions between {@link newestSession} and the last
   * session to have closed. `0` means current.
   *
   * `null` when there is nothing to measure from.
   */
  readonly sessionsBehind: number | null;
  /**
   * The **worst** security, by the same measure.
   *
   * Reported separately because the two answer different questions and only one
   * of them catches a partial fill. `newestSession` says *has anything been
   * refreshed* — it catches a dead cron. `stalestSessionsBehind` says *is
   * everything current* — it catches a run that covered some symbols and
   * stopped, which a maximum hides completely.
   */
  readonly stalestSessionsBehind: number | null;
  /** How many securities the ledger holds a row for at this timeframe. */
  readonly securities: number;
}

/** The whole answer. */
export interface StoreFreshness {
  /** The session the market has most recently completed, as of `now`. */
  readonly lastCompletedSession: MarketDate | null;
  readonly timeframes: readonly TimeframeFreshness[];
}

/** Just enough of a `BarCoverage` row to measure, so tests need no repository. */
export interface CoverageRow {
  readonly timeframe: Timeframe;
  readonly covered: TimeRange;
}

/**
 * How far back to look for the last completed session.
 *
 * Thirty calendar days comfortably spans the longest run of closed days the US
 * market has — a holiday against a weekend is four — with room for a calendar
 * this repository has not seen. It is a bound on a loop rather than a tolerance:
 * exceeding it means the calendar has no session in a month, which is a broken
 * calendar rather than a stale store.
 */
const LOOKBACK_DAYS = 30;

/**
 * The most recent session whose close is in the past.
 *
 * **Whose close, not whose date.** At 11:00 ET on a Wednesday the market is open
 * and Wednesday's session has not completed, so the answer is Tuesday — and a
 * store holding through Tuesday is current rather than a day behind. Measuring
 * against the date would make every weekday morning report the whole universe
 * as stale, which is the shape of alert nobody keeps.
 */
export function lastCompletedSession(now: Date): MarketDate | null {
  const from = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const completed = marketSessionsBetween(
    marketDateAt(from),
    marketDateAt(now),
  ).filter((session) => session.close.getTime() <= now.getTime());

  return completed[completed.length - 1]?.date ?? null;
}

/**
 * The last trading session on or before a calendar date.
 *
 * **A covered range does not have to end on a session.** Found by running this
 * against the real ledger: the daily store reported
 * `newestSession: "2026-09-07"`, which is **Labor Day** — a day the market was
 * closed and therefore a session no store can hold. The range ended at
 * 2026-09-08T04:00Z, one millisecond before which is the 7th in market time.
 *
 * `sessionsBehind` was unaffected and is unaffected in general, which is worth
 * stating so this is not mistaken for a bug fix in the arithmetic: there are by
 * definition no sessions between a closed day and the session before it, so
 * counting forward from either gives the same answer. What was wrong was the
 * **reported date** — a diagnostic naming a day the market did not trade
 * invites exactly the "is this thing working?" doubt it exists to remove.
 */
function sessionOnOrBefore(date: MarketDate): MarketDate | null {
  const from = new Date(
    new Date(`${date}T12:00:00.000Z`).getTime() -
      LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );

  const sessions = marketSessionsBetween(marketDateAt(from), date);
  return sessions[sessions.length - 1]?.date ?? null;
}

/**
 * Completed sessions strictly after `session` and up to `through`, inclusive.
 *
 * Zero when they are the same date, which is what "current" is. Weekends and
 * holidays contribute nothing, which is the whole reason this is counted
 * against the calendar rather than in days — the bug that prompted this module
 * was four sessions behind over eight calendar days, and reporting "8" would
 * have been wrong in a way that invites a tolerance nobody can justify.
 */
export function sessionsBetween(
  session: MarketDate,
  through: MarketDate,
): number {
  if (session >= through) return 0;

  return marketSessionsBetween(session, through).filter(
    (entry) => entry.date > session,
  ).length;
}

/**
 * The store's freshness, from the ledger and the calendar.
 *
 * **Every timeframe the system can store appears in the result, including ones
 * the ledger holds no row for.** A timeframe that is simply absent would be
 * reported by omission, and an omission is what nobody notices — it is the
 * precise shape of the original defect, where `1d` was not wrong, it was
 * unmentioned.
 */
export function storeFreshness(
  coverage: readonly CoverageRow[],
  now: Date,
): StoreFreshness {
  const through = lastCompletedSession(now);

  const timeframes = TIMEFRAMES.map((timeframe): TimeframeFreshness => {
    const rows = coverage.filter((row) => row.timeframe === timeframe);

    if (rows.length === 0 || through === null) {
      return {
        timeframe,
        newestSession: null,
        sessionsBehind: null,
        stalestSessionsBehind: null,
        securities: rows.length,
      };
    }

    // `covered.end` is EXCLUSIVE — every range in this system is half-open — so
    // the session it covers through is the date of the instant one millisecond
    // before it. Taking `marketDateAt(end)` directly reads a window ending at
    // 16:00 ET as covering *the next* session on the days when 16:00 ET and
    // midnight fall either side of a date boundary in UTC, which is every day.
    const sessions = rows.map((row) =>
      marketDateAt(new Date(row.covered.end.getTime() - 1)),
    );

    const newest = sessions.reduce((a, b) => (a > b ? a : b));
    const oldest = sessions.reduce((a, b) => (a < b ? a : b));

    return {
      timeframe,
      newestSession: sessionOnOrBefore(newest),
      sessionsBehind: sessionsBetween(newest, through),
      stalestSessionsBehind: sessionsBetween(oldest, through),
      securities: rows.length,
    };
  });

  return { lastCompletedSession: through, timeframes };
}
