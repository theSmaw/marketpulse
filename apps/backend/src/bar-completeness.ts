// Four reasons a bar is missing, and telling them apart (Task 2.8.7).
//
// **This is acceptance criterion 4, and it is a correctness requirement wearing
// a reporting requirement's clothes.** Epic 5's volume anomaly divides by the
// median volume for a time of day. A session stored as zero bars because a fetch
// failed is not a gap in a chart — it is a zero in a denominator, and it makes
// an ordinary day look like the most unusual one in the sample. That is a false
// anomaly with a plausible explanation attached, which is the worst output this
// product can produce, and it originates here rather than in Epic 5.
//
// ## The computation, and why it is a set difference rather than a join
//
// A missing bar has four causes and the database shows the same thing for three
// of them: no row. Distinguishing them is not a column on `market_bars`, because
// the row does not exist. It is a comparison of three descriptions:
//
//   what the CALENDAR says should exist   `market-session.ts`, free, exact
//   what the LEDGER says was attempted    `bar_coverage`, one row per series
//   what the BARS say arrived             `bar_coverage.bar_count`, one number
//
// The expensive-sounding version of this — a per-session join against fifty
// million rows — is **not needed**, and the reason is a property the backfill
// guarantees rather than one this module hopes for:
//
// > **Every session inside the ledger's covered range was attempted.**
//
// Not "probably". The walk extends the range one contiguous step at a time from
// one of its two ends, and `market-bars.ts` refuses by name any write that would
// leave a trading session in the gap. So a range with an unfetched session
// inside it cannot be constructed by `pnpm backfill` at all, and this never has
// to distinguish *inside the range and never asked* from *inside the range and
// asked*. There is no such state.
//
// ## Completeness and thinness are two questions, and conflating them is the
// mistake this module is shaped to prevent
//
// Measured 2026-09-08 against the live API on an ordinary full regular session:
// only **8 of 28** S&P 500 constituents returned a full 390 bars, at a
// universe-wide mean of **364.3 bars per security-session**. `AME` returned 344
// across the whole session — the minutes are genuinely absent rather than cut
// off.
//
// So *calendar minus arrived* is *not* a gap. On that definition the universe is
// permanently ~7% incomplete on every session and the report is red forever,
// which is the same failure as expecting 390 bars on a half day, arriving on the
// other 240 days of the year.
//
//   **Not fetched** — the session lies outside the ledger's covered range. The
//   only state a catch-up should act on, and the only one that means something
//   is wrong with **us**.
//
//   **Fetched and thin** — the session is inside the range and the bar count is
//   below `minuteBars`, because the security did not trade in every minute. The
//   normal state of roughly 93% of the universe, and a fact about **liquidity**.
//
// **A percentage against `minuteBars` is therefore a liquidity measure and not a
// completeness measure.** They are separate columns in the report and thinness is
// deliberately never a finding, because labelling it "completeness" is how
// somebody later re-fetches 240 sessions that were already complete.
//
// ## The one direction that IS an invariant violation
//
// More bars than the session has minutes. That means the timestamp mapping or
// the window shape is wrong — it is exactly what a span-shaped request produces,
// collecting pre- and post-market prints at a measured 2.35x — so it is a
// finding of its own rather than a number over 100 in a percentage column.

import {
  marketDateAt,
  type MarketDate,
  type MarketSession,
  type Ticker,
  type Timeframe,
} from "@marketpulse/shared";

import { attemptNeedsAttention, type BarAttempt } from "./bar-attempts.js";
import type { BarCoverage } from "./market-bars.js";

/**
 * How many bars a complete session holds, at a timeframe.
 *
 * **Asked of the session rather than assumed**, which is the half day: eleven
 * days across the covered range close at 13:00 ET and hold 210 bars, so a check
 * expecting 390 reports 180 phantom gaps on each of them and Epic 5's baseline
 * then treats a normal early close as a data outage. `minuteBars` is derived
 * from the session's own bounds rather than stored beside them, so there is no
 * second copy of 390 anywhere and none of 210.
 */
export function expectedBars(
  timeframe: Timeframe,
  session: MarketSession,
): number {
  return timeframe === "1m" ? session.minuteBars : 1;
}

/**
 * A run of sessions with no bar at all is a security that has stopped trading
 * rather than one having a quiet week.
 *
 * Five, and the number is chosen against the measurement rather than picked: a
 * *thin* security misses minutes, and the thinnest thing measured on an ordinary
 * session still returned 344 of 390. A security with **zero** bars across five
 * consecutive sessions the backfill asked for is not thin — it has no prints at
 * all, which is what a delisting looks like from here.
 */
export const STALE_SESSION_THRESHOLD = 5;

/** What one series' store looks like, taken as a parameter. */
export interface SeriesStore {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;
  /** The ledger's statement, or absent when nothing has ever been fetched. */
  readonly coverage?: BarCoverage;
  /** Recorded attempts for this series. Sparse; usually empty. */
  readonly attempts: readonly BarAttempt[];
  /**
   * The newest **daily** bar we hold — and it is deliberately three-valued.
   *
   *   `Date`      the daily ledger covers this series and this is its last bar
   *   `null`      the daily ledger covers it and it holds no bar at all
   *   *absent*    the daily ledger says nothing about it, so we cannot tell
   *
   * **The third value exists because the first version of this had two and
   * produced a false positive on the day it was written.** The daily timeframe
   * is the cheap proxy — `max(observed_at) group by security_id` over daily bars
   * is ~130,000 rows for a year of the universe against fifty million over
   * minute bars, measured here at **192 ms as a full parallel sequential scan
   * over just 863k minute rows**, which is ~11 s extrapolated to a full year and
   * is not a routine report's query. But a store that has back-filled minute
   * bars and **not** daily bars has no daily rows for any of them, and "no daily
   * bar" then means *we never asked* rather than *it has stopped printing* —
   * which reported two perfectly healthy securities as delisted.
   *
   * So the absence of an answer is modelled rather than collapsed into a `null`,
   * and {@link compareStoreToCalendar} produces no finding for it.
   */
  readonly lastBarAt?: Date | null;
}

/**
 * Everything {@link compareStoreToCalendar} needs, **both sides as parameters**.
 *
 * That signature is the whole reason this function is separable, and it is
 * `validateUniverse`'s and `compareUniverseToVendor`'s shape for their reason:
 * three of the four causes this report distinguishes have no instance in a
 * healthy store, so a test can only make them happen by handing in a store that
 * has them. Watching a check not fire is not evidence that it works.
 */
export interface CompletenessInput {
  /**
   * Every session in scope, oldest first — a **superset** of the window, wide
   * enough to cover every ledger range as well.
   *
   * Two windows are being asked about at once and they are not the same: *not
   * fetched* is a question about {@link window}, and *thin* is a question about
   * whatever the ledger happens to cover, which may be much wider.
   */
  readonly sessions: readonly MarketSession[];
  /** The window being reported on, inclusive at both ends. */
  readonly window: { readonly from: MarketDate; readonly to: MarketDate };
  readonly series: readonly SeriesStore[];
}

/**
 * One thing worth a person's attention.
 *
 * A discriminated union rather than a list of strings, for the reason
 * `UniverseFinding` is one: the report renders each kind differently and a test
 * asserts on the kind rather than on prose, so rewording a sentence does not
 * move a check.
 *
 * **Thinness is deliberately not a member.** See the module header.
 */
export type CompletenessFinding =
  /** Nothing has ever been fetched for this series. */
  | {
      readonly kind: "never-fetched";
      readonly symbol: Ticker;
      readonly timeframe: Timeframe;
      readonly sessions: number;
    }
  /**
   * Sessions in the window that lie outside the ledger's covered range.
   *
   * The only finding a catch-up run should act on.
   */
  | {
      readonly kind: "not-fetched";
      readonly symbol: Ticker;
      readonly timeframe: Timeframe;
      readonly sessions: readonly MarketDate[];
    }
  /**
   * A session was attempted and left no bars, and the log says why.
   *
   * This is the finding the whole attempt log exists to make possible: without
   * it this session is indistinguishable from one nobody asked about.
   */
  | {
      readonly kind: "attempted-and-empty";
      readonly symbol: Ticker;
      readonly timeframe: Timeframe;
      readonly attempt: BarAttempt;
    }
  /**
   * More bars than the sessions have minutes. **An invariant violation** rather
   * than a number over 100 — see the module header.
   */
  | {
      readonly kind: "over-full";
      readonly symbol: Ticker;
      readonly timeframe: Timeframe;
      readonly held: number;
      readonly expected: number;
    }
  /**
   * No bar at all across the most recent covered sessions.
   *
   * Task 2.7.8 moved the `delisted` question here on a measurement: bars
   * stopping correlates with reality at 100% against the vendor's own `inactive`
   * flag at 92%, it costs no request, and it arrives as a consequence of
   * ingestion this story is doing anyway.
   *
   * **Reported and never written**, and that is the decision rather than the
   * cheaper half of one. `UNIVERSE.md` §15.3 produced the reason: a `status`
   * written by anything other than the loader is silently reverted by the next
   * deploy's `pnpm universe`, reported as an ordinary `1 updated`. So adopting
   * `delisted` is two decisions and not one, and this is Task 2.1.7's shape —
   * the instrument says *whether* and a person decides *what to do*.
   */
  | {
      readonly kind: "no-recent-bars";
      readonly symbol: Ticker;
      readonly timeframe: Timeframe;
      readonly lastBarDate?: MarketDate;
      readonly sessionsSince: number;
    };

/** The per-series numbers a report prints as a table. */
export interface SeriesCompleteness {
  readonly symbol: Ticker;
  readonly timeframe: Timeframe;
  /** Sessions the calendar puts inside the reported window. */
  readonly sessionsInWindow: number;
  /** Of those, how many lie inside the ledger's covered range. */
  readonly sessionsFetched: number;
  /** Of those, the ones that do not. Never a liquidity measure. */
  readonly notFetched: readonly MarketDate[];
  /** Bars held across the ledger's whole covered range. */
  readonly barsHeld: number;
  /**
   * Bars a complete store would hold across that same range — the sum of
   * {@link expectedBars} over the sessions inside it, so a half day contributes
   * 210 and a holiday contributes nothing.
   */
  readonly barsExpected: number;
  /** Recorded attempts, sparse and usually empty. */
  readonly attempts: readonly BarAttempt[];
}

/** What one comparison produced. */
export interface CompletenessReport {
  readonly series: readonly SeriesCompleteness[];
  readonly findings: readonly CompletenessFinding[];
}

/**
 * Compare what the calendar says should exist against what the store holds.
 *
 * **Pure, and it reads no clock, no database and no network.** Every number it
 * produces comes from its arguments.
 */
export function compareStoreToCalendar(
  input: CompletenessInput,
): CompletenessReport {
  const inWindow = input.sessions.filter(
    (session) =>
      session.date >= input.window.from && session.date <= input.window.to,
  );

  const series: SeriesCompleteness[] = [];
  const findings: CompletenessFinding[] = [];

  for (const store of input.series) {
    const { symbol, timeframe, coverage } = store;
    const attempts = [...store.attempts].sort((left, right) =>
      left.sessionDate < right.sessionDate ? -1 : 1,
    );

    if (coverage === undefined) {
      series.push({
        symbol,
        timeframe,
        sessionsInWindow: inWindow.length,
        sessionsFetched: 0,
        notFetched: inWindow.map((session) => session.date),
        barsHeld: 0,
        barsExpected: 0,
        attempts,
      });
      findings.push({
        kind: "never-fetched",
        symbol,
        timeframe,
        sessions: inWindow.length,
      });
      continue;
    }

    // A session is fetched when it lies **wholly** inside the covered range.
    // The comparison is against the session's own bounds rather than its date,
    // because the ledger stores instants and a market date is not one — the
    // same test `planRequests` makes, deliberately, so the report and the
    // backfill cannot disagree about which sessions are held.
    const isHeld = (session: MarketSession): boolean =>
      session.open >= coverage.covered.start &&
      session.close <= coverage.covered.end;

    const notFetched = inWindow
      .filter((session) => !isHeld(session))
      .map((session) => session.date);

    // Thinness is measured over the ledger's whole range rather than over the
    // window, because that is the range `bar_count` counts. Mixing the two
    // produces a density figure whose numerator and denominator describe
    // different spans, which is a number that looks like an answer.
    const covered = input.sessions.filter(isHeld);
    const barsExpected = covered.reduce(
      (total, session) => total + expectedBars(timeframe, session),
      0,
    );

    series.push({
      symbol,
      timeframe,
      sessionsInWindow: inWindow.length,
      sessionsFetched: inWindow.length - notFetched.length,
      notFetched,
      barsHeld: coverage.barCount,
      barsExpected,
      attempts,
    });

    if (notFetched.length > 0) {
      findings.push({
        kind: "not-fetched",
        symbol,
        timeframe,
        sessions: notFetched,
      });
    }

    if (coverage.barCount > barsExpected) {
      findings.push({
        kind: "over-full",
        symbol,
        timeframe,
        held: coverage.barCount,
        expected: barsExpected,
      });
    }

    for (const attempt of attempts) {
      findings.push({
        kind: "attempted-and-empty",
        symbol,
        timeframe,
        attempt,
      });
    }

    // `undefined` means the daily ledger cannot answer for this series, which is
    // not the same as answering "nothing". See {@link SeriesStore.lastBarAt}.
    if (store.lastBarAt !== undefined) {
      const stale = trailingSessionsWithoutBars(covered, store.lastBarAt);
      if (stale >= STALE_SESSION_THRESHOLD) {
        findings.push({
          kind: "no-recent-bars",
          symbol,
          timeframe,
          ...(store.lastBarAt === null
            ? {}
            : { lastBarDate: marketDateAt(store.lastBarAt) }),
          sessionsSince: stale,
        });
      }
    }
  }

  return { series, findings };
}

/**
 * How many covered sessions sit after the newest bar we hold.
 *
 * Zero when the newest bar is in the last covered session, which is the ordinary
 * case. `covered` is oldest first.
 */
function trailingSessionsWithoutBars(
  covered: readonly MarketSession[],
  lastBarAt: Date | null,
): number {
  if (covered.length === 0) return 0;
  // Covered sessions and no bar anywhere in them: every one of them is after
  // the newest bar, because there is no newest bar.
  if (lastBarAt === null) return covered.length;

  const lastBarDate = marketDateAt(lastBarAt);
  return covered.filter((session) => session.date > lastBarDate).length;
}

/**
 * The findings a person has to act on, as against the ones a re-run fixes.
 *
 * `not-fetched` and `never-fetched` are a catch-up's job and are deliberately
 * not here: running `pnpm backfill` again is the whole of the response. What is
 * here is an attempt whose outcome means *stop* rather than *come back*, plus
 * the two structural findings — a store holding more bars than minutes, and a
 * security that has stopped printing.
 */
export function needsAttention(finding: CompletenessFinding): boolean {
  switch (finding.kind) {
    case "attempted-and-empty":
      return attemptNeedsAttention(finding.attempt.outcome);
    case "over-full":
    case "no-recent-bars":
      return true;
    case "not-fetched":
    case "never-fetched":
      return false;
    default: {
      const unhandled: never = finding;
      return unhandled;
    }
  }
}
