import type {
  MarketDate,
  Ticker,
  Timeframe,
  TimeRange,
} from "@marketpulse/shared";
import {
  marketDateAt,
  marketSessionsBetween,
  TIMEFRAMES,
} from "@marketpulse/shared";

import type { BarAttempt } from "./bar-attempts.js";

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
//
// ## And the attempt log, which is the SECOND ledger — added 2026-10-12
//
// **The maximum this module reports could not be satisfied, and it was red for
// four days.** Two securities in the tracked universe — `WBD` and `PSKY` —
// stopped printing on 2026-10-05. The vendor was asked for every session
// afterwards and answered **empty** every time, which `PROVIDER.md` §8.2 makes
// a success: it writes no bars, so `backfill.ts` extends the ledger by nothing,
// on purpose. So `bar_coverage.covered` stops at the last session they traded
// and never moves again, and a reader that sees only that column reads *the
// market had nothing for this symbol* as *we are behind on this symbol* — a
// figure that grows by one every session, for ever, that no backfill can move.
//
// `bar_attempts` is the table that tells those two states apart, and this now
// joins it. It stays inside the design property above: it is **sparse** — empty
// when everything is well, a few hundred rows at worst — and it is still not
// `market_bars`.
//
// **So this module reports two figures and the gate reads the second**
// (Task 2.8.13): `stalestSessionsBehind`, which is every trailing session
// whatever the reason, and `unexplainedSessionsBehind`, which is only the ones
// with **no recorded empty answer**. The first is the true number and the only
// one that can see a partial fill, so it is still reported and the securities
// are named. The second is the one a backfill can actually move: run it, and
// every session it asks about either arrives as bars or is recorded as an empty
// answer — so a figure above zero means a session nobody asked about.
//
// **Reversal trigger, a condition**: the first time this reports a security
// behind the ceiling that **has** a bar inside the sessions it is behind on — a
// lag that is ours rather than the market's. That is the state the maximum was
// bought to catch, and the only condition under which excluding empty-answered
// series could hide something.

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
  /**
   * Which securities are at {@link stalestSessionsBehind}, up to
   * {@link MAX_NAMED_SECURITIES} of them, alphabetically.
   *
   * **Named rather than counted, because the investigation that produced this
   * module's second figure needed a second endpoint to find out which two
   * symbols the number was about** (Task 2.8.13). Empty when nothing is behind.
   */
  readonly stalestSecurities: readonly Ticker[];
  /**
   * How many securities are at {@link stalestSessionsBehind} altogether.
   *
   * Here because the list above is capped: a backfill that stopped entirely
   * puts all 518 at one figure, and a reader of ten names must be able to tell
   * a sample from the whole set.
   */
  readonly stalestSecurityCount: number;
  /**
   * **The figure the deployed gate reads.** The worst security, counting only
   * trailing sessions with **no recorded empty answer**.
   *
   * `0` means every session the store is missing was asked for and the vendor
   * had nothing to send — the market's silence rather than ours. Anything above
   * it is a session nobody asked about, which is what a backfill repairs. See
   * the module header.
   *
   * `null` when there is nothing to measure from.
   */
  readonly unexplainedSessionsBehind: number | null;
  /** Which securities are at {@link unexplainedSessionsBehind}, capped as above. */
  readonly unexplainedSecurities: readonly Ticker[];
  /** How many are at that figure altogether. */
  readonly unexplainedSecurityCount: number;
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
  /**
   * **Part of the row since Task 2.8.13, and the first thing the investigation
   * wanted.** The figures are per security, so a figure with no symbol beside
   * it sends the reader to a second endpoint to find out which security it is
   * about — which is what happened.
   */
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;
  readonly covered: TimeRange;
}

/**
 * Just enough of a `BarAttempt` to tell *we asked and got nothing* from *we
 * never asked*.
 *
 * A `Pick` of the shipped type rather than a new shape, so there is no second
 * vocabulary for an attempt and a widened `BarAttempt` cannot drift from it.
 */
export type AttemptRow = Pick<
  BarAttempt,
  "symbol" | "timeframe" | "sessionDate" | "outcome"
>;

/**
 * How many securities a figure names before it stops naming them.
 *
 * Ten, and the count beside the list is what makes the cap honest. A dead
 * backfill puts the whole universe at one figure and 518 symbols on a wire is
 * noise; the first ten name the shape, and the count says whether ten is all of
 * them. `check-deployed.mjs` prints the count when the list is a sample.
 */
export const MAX_NAMED_SECURITIES = 10;

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
  return sessionsAfter(session, through).length;
}

/**
 * The same sessions, as dates rather than as a count.
 *
 * **The counting rule has one home**, which is why {@link sessionsBetween}
 * delegates here rather than filtering its own copy: the gate needs the dates
 * — each one is either explained by a recorded empty answer or it is not — and
 * two spellings of *which sessions is this security behind on* would be two
 * answers to the figure the deployed check fails on.
 */
export function sessionsAfter(
  session: MarketDate,
  through: MarketDate,
): readonly MarketDate[] {
  if (session >= through) return [];

  return marketSessionsBetween(session, through)
    .filter((entry) => entry.date > session)
    .map((entry) => entry.date);
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
  attempts: readonly AttemptRow[],
  now: Date,
): StoreFreshness {
  const through = lastCompletedSession(now);

  // **`ok` and not every outcome, which is the whole distinction.** `ok` in
  // this log means *the vendor answered successfully and left no bars*
  // (`bar-attempts.ts`), so the session is accounted for. A `timeout` or an
  // `upstream-unavailable` means we still do not know what happened there, and
  // treating it as an explanation would let a failing backfill quieten the
  // gate it is supposed to trip.
  const explained = new Set(
    attempts
      .filter((attempt) => attempt.outcome === "ok")
      .map((attempt) => attemptKey(attempt)),
  );

  // Memoised on the covered-through date, because the whole universe shares a
  // handful of them: 518 rows against two or three distinct dates in the steady
  // state, and `marketSessionsBetween` walks a calendar per call.
  const gaps = new Map<MarketDate, readonly MarketDate[]>();
  const gapAfter = (session: MarketDate): readonly MarketDate[] => {
    if (through === null) return [];
    const held = gaps.get(session);
    if (held !== undefined) return held;
    const computed = sessionsAfter(session, through);
    gaps.set(session, computed);
    return computed;
  };

  const timeframes = TIMEFRAMES.map((timeframe): TimeframeFreshness => {
    const rows = coverage.filter((row) => row.timeframe === timeframe);

    if (rows.length === 0 || through === null) {
      return {
        timeframe,
        newestSession: null,
        sessionsBehind: null,
        stalestSessionsBehind: null,
        stalestSecurities: [],
        stalestSecurityCount: 0,
        unexplainedSessionsBehind: null,
        unexplainedSecurities: [],
        unexplainedSecurityCount: 0,
        securities: rows.length,
      };
    }

    // `covered.end` is EXCLUSIVE — every range in this system is half-open — so
    // the session it covers through is the date of the instant one millisecond
    // before it. Taking `marketDateAt(end)` directly reads a window ending at
    // 16:00 ET as covering *the next* session on the days when 16:00 ET and
    // midnight fall either side of a date boundary in UTC, which is every day.
    const measured = rows.map((row) => {
      const coveredThrough = marketDateAt(
        new Date(row.covered.end.getTime() - 1),
      );
      const gap = gapAfter(coveredThrough);

      return {
        symbol: row.symbol,
        coveredThrough,
        behind: gap.length,
        unexplained: gap.filter(
          (date) =>
            !explained.has(
              attemptKey({ symbol: row.symbol, timeframe, sessionDate: date }),
            ),
        ).length,
      };
    });

    const sessions = measured.map((entry) => entry.coveredThrough);
    const newest = sessions.reduce((a, b) => (a > b ? a : b));

    const stalest = measured.reduce(
      (worst, entry) => Math.max(worst, entry.behind),
      0,
    );
    const unexplained = measured.reduce(
      (worst, entry) => Math.max(worst, entry.unexplained),
      0,
    );

    // **Nobody is named at zero**, which is the steady state: a figure of zero
    // means no security is behind, and ten symbols beside it would read as ten
    // findings.
    const at = (
      figure: number,
      figureOf: (entry: (typeof measured)[number]) => number,
    ): readonly Ticker[] =>
      figure === 0
        ? []
        : measured
            .filter((entry) => figureOf(entry) === figure)
            .map((entry) => entry.symbol)
            .sort((left, right) => (left < right ? -1 : 1));

    const stalestAt = at(stalest, (entry) => entry.behind);
    const unexplainedAt = at(unexplained, (entry) => entry.unexplained);

    return {
      timeframe,
      newestSession: sessionOnOrBefore(newest),
      sessionsBehind: sessionsBetween(newest, through),
      stalestSessionsBehind: stalest,
      stalestSecurities: stalestAt.slice(0, MAX_NAMED_SECURITIES),
      stalestSecurityCount: stalestAt.length,
      unexplainedSessionsBehind: unexplained,
      unexplainedSecurities: unexplainedAt.slice(0, MAX_NAMED_SECURITIES),
      unexplainedSecurityCount: unexplainedAt.length,
      securities: rows.length,
    };
  });

  return { lastCompletedSession: through, timeframes };
}

/** One attempt's identity. The session is per security AND per timeframe. */
function attemptKey(entry: {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;
  readonly sessionDate: MarketDate;
}): string {
  // A separator no `Ticker`, `Timeframe` or `MarketDate` can contain — they
  // are letters, `1m`/`1d` and `YYYY-MM-DD` — so two keys cannot collide by
  // concatenation. A visible character rather than a NUL, which turns the file
  // binary to `grep` and therefore invisible to `pnpm invariants`.
  return `${entry.symbol}|${entry.timeframe}|${entry.sessionDate}`;
}
