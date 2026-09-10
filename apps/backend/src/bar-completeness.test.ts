// The four causes, told apart (Task 2.8.7).
//
// **Every one of these cases is handed in as a parameter**, which is the whole
// reason `compareStoreToCalendar` takes both sides. Three of the four causes
// have no instance in a healthy store — a failed fetch, an over-full series and
// a security that has stopped printing — so the only way to watch the check fire
// is to build a store that has them. Watching a check *not* fire is not evidence
// that it works, which is the lesson Task 2.5.3 recorded and Task 2.6.5 met
// again from the other side.
//
// The sessions are real ones out of the shipped calendar rather than invented,
// and the half day is the real one: **2026-11-27, the day after Thanksgiving,
// which closes at 13:00 ET and holds 210 minute bars.** Nothing here writes 390
// or 210 down.

import { describe, expect, it } from "vitest";

import {
  marketSessionOn,
  marketSessionsBetween,
  toMarketDate,
  toTicker,
  toTimeRange,
  type MarketSession,
  type Ticker,
  type Timeframe,
} from "@marketpulse/shared";

import type { BarAttempt } from "./bar-attempts.js";
import {
  compareStoreToCalendar,
  expectedBars,
  needsAttention,
  STALE_SESSION_THRESHOLD,
  type SeriesStore,
} from "./bar-completeness.js";
import type { BarCoverage } from "./market-bars.js";

const NVDA: Ticker = toTicker("NVDA");
const AMD: Ticker = toTicker("AMD");

/** An ordinary five-session week with no closure and no early close in it. */
const WEEK = marketSessionsBetween(
  toMarketDate("2026-03-02"),
  toMarketDate("2026-03-06"),
);

/** The week Thanksgiving 2026 falls in: four sessions, one of them a half day. */
const THANKSGIVING_WEEK = marketSessionsBetween(
  toMarketDate("2026-11-23"),
  toMarketDate("2026-11-27"),
);

function session(date: string): MarketSession {
  const found = marketSessionOn(toMarketDate(date));
  if (found === undefined) throw new Error(`${date} is not a trading session.`);
  return found;
}

/**
 * The open of one session, refusing rather than handing back `undefined`.
 *
 * `WEEK[4]?.open` is `Date | undefined`, which `exactOptionalPropertyTypes`
 * refuses against an optional `lastBarAt` — and `pnpm test` alone would not have
 * said so, because the runner transpiles and strips types. `pnpm verify` builds
 * before it tests, which is how this was caught.
 */
function openOf(sessions: readonly MarketSession[], index: number): Date {
  const found = sessions.at(index);
  if (found === undefined)
    throw new Error(`No session at index ${String(index)}.`);
  return found.open;
}

function coverageOver(
  symbol: Ticker,
  sessions: readonly MarketSession[],
  barCount: number,
  timeframe: Timeframe = "1m",
): BarCoverage {
  const first = sessions[0];
  const last = sessions.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("A coverage window needs at least one session.");
  }
  return {
    symbol,
    timeframe,
    covered: toTimeRange(first.open, last.close),
    source: { provider: "alpaca", feed: "sip" },
    barCount,
    updatedAt: new Date("2026-03-07T00:00:00.000Z"),
  };
}

/**
 * Bars a complete store would hold across these sessions.
 *
 * **Read off the sessions rather than through `expectedBars`, deliberately.**
 * Routing the fixture through the function under test makes the fixture and the
 * code move together, so a hard-coded 390 substituted into `expectedBars` leaves
 * every assertion here green — the suite would be asserting that the code agrees
 * with itself. `minuteBars` is `market-session.ts`'s own derived number and is
 * tested there.
 */
function completeBars(
  sessions: readonly MarketSession[],
  timeframe: Timeframe = "1m",
): number {
  return sessions.reduce(
    (total, one) => total + (timeframe === "1m" ? one.minuteBars : 1),
    0,
  );
}

function attempt(overrides: Partial<BarAttempt> = {}): BarAttempt {
  return {
    symbol: NVDA,
    timeframe: "1m",
    sessionDate: toMarketDate("2026-03-04"),
    outcome: "ok",
    recordedAt: new Date("2026-03-05T00:00:00.000Z"),
    updatedAt: new Date("2026-03-05T00:00:00.000Z"),
    ...overrides,
  };
}

function compare(series: readonly SeriesStore[], sessions = WEEK) {
  const first = sessions[0];
  const last = sessions.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("A comparison needs at least one session.");
  }
  return compareStoreToCalendar({
    sessions,
    window: { from: first.date, to: last.date },
    series,
  });
}

describe("expectedBars", () => {
  it("asks the session rather than assuming 390", () => {
    // The half day, which is the case most likely to be missed: a check that
    // expects 390 reports 180 phantom gaps on each of eleven days a year, and
    // Epic 5's volume baseline then treats a normal early close as an outage.
    const halfDay = session("2026-11-27");
    const regular = session("2026-11-24");

    expect(halfDay.isEarlyClose).toBe(true);
    expect(expectedBars("1m", halfDay)).toBe(halfDay.minuteBars);
    expect(expectedBars("1m", halfDay)).toBeLessThan(
      expectedBars("1m", regular),
    );
  });

  it("is one bar a session at the daily timeframe, whatever the hours", () => {
    expect(expectedBars("1d", session("2026-11-27"))).toBe(1);
    expect(expectedBars("1d", session("2026-11-24"))).toBe(1);
  });
});

describe("compareStoreToCalendar — cause 1, the market was closed", () => {
  it("counts sessions and never calendar days, so a weekend is not a gap", () => {
    // 2026-03-02 to 2026-03-06 is seven calendar days and five sessions.
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, completeBars(WEEK)),
        attempts: [],
        lastBarAt: openOf(WEEK, 4),
      },
    ]);

    expect(report.series[0]?.sessionsInWindow).toBe(5);
    expect(report.series[0]?.notFetched).toEqual([]);
    expect(report.findings).toEqual([]);
  });

  it("expects a half day's own bar count, so a complete one is not thin", () => {
    // The break this task's own brief asks for: a 390-bar expectation applied
    // to a half day must report 180 phantom gaps and therefore go red. It
    // cannot, because nothing here writes 390 down.
    const complete = completeBars(THANKSGIVING_WEEK);
    const report = compare(
      [
        {
          symbol: NVDA,
          timeframe: "1m",
          coverage: coverageOver(NVDA, THANKSGIVING_WEEK, complete),
          attempts: [],
          lastBarAt: openOf(THANKSGIVING_WEEK, -1),
        },
      ],
      THANKSGIVING_WEEK,
    );

    // Four sessions in that week, one of them a half day, and Thanksgiving
    // itself contributes nothing because there is no session at all.
    expect(THANKSGIVING_WEEK).toHaveLength(4);
    expect(report.series[0]?.barsExpected).toBe(complete);
    expect(report.series[0]?.barsHeld).toBe(complete);
    expect(report.findings).toEqual([]);
  });
});

describe("compareStoreToCalendar — cause 2, the security did not trade", () => {
  it("is a density number and never a finding", () => {
    // `AME` on 2026-09-03: 344 bars across a full 390-minute session, measured
    // against the live API, with the span covering the whole session — so the
    // minutes are genuinely absent rather than cut off. Reporting that as 46
    // gaps would make the universe permanently ~7% incomplete and the report
    // red forever.
    const held = completeBars(WEEK) - 46;
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, held),
        attempts: [],
        lastBarAt: openOf(WEEK, 4),
      },
    ]);

    expect(report.series[0]?.barsHeld).toBeLessThan(
      report.series[0]?.barsExpected ?? 0,
    );
    expect(report.series[0]?.notFetched).toEqual([]);
    expect(report.findings).toEqual([]);
  });

  it("reports MORE bars than minutes as an invariant violation", () => {
    // The other side of 100, and it is not a large percentage: it means the
    // timestamp mapping or the window shape is wrong. A span-shaped minute
    // request collects extended-hours prints at a measured 2.35x, which is
    // exactly this.
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(
          NVDA,
          WEEK,
          Math.round(completeBars(WEEK) * 2.35),
        ),
        attempts: [],
        lastBarAt: openOf(WEEK, 4),
      },
    ]);

    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.kind).toBe("over-full");
    expect(report.findings.every(needsAttention)).toBe(true);
  });
});

describe("compareStoreToCalendar — cause 3, the fetch failed", () => {
  it("tells a failed session from an untraded one by the recorded outcome", () => {
    // The whole of criterion 4. Both of these sessions are inside the ledger's
    // range and both hold no bars; in `market_bars` and in `bar_coverage` they
    // are the same thing. Only the log tells them apart.
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, completeBars(WEEK)),
        attempts: [
          attempt({ sessionDate: toMarketDate("2026-03-03"), outcome: "ok" }),
          attempt({
            sessionDate: toMarketDate("2026-03-04"),
            outcome: "upstream-unavailable",
          }),
        ],
        lastBarAt: openOf(WEEK, 4),
      },
    ]);

    const empties = report.findings.filter(
      (finding) => finding.kind === "attempted-and-empty",
    );
    expect(empties).toHaveLength(2);
    // Neither is a gap in the ledger — the sessions were fetched.
    expect(report.series[0]?.notFetched).toEqual([]);
  });

  it("separates come back from stop, which is the report's one job here", () => {
    // A report that treats them alike sends somebody looking at a network when
    // the key is wrong, which is the most expensive wrong turn this can cause.
    const comeBack = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, completeBars(WEEK)),
        attempts: [attempt({ outcome: "rate-limited" })],
        lastBarAt: openOf(WEEK, 4),
      },
    ]);
    const stop = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, completeBars(WEEK)),
        attempts: [attempt({ outcome: "unauthorised" })],
        lastBarAt: openOf(WEEK, 4),
      },
    ]);

    expect(comeBack.findings.filter(needsAttention)).toEqual([]);
    expect(stop.findings.filter(needsAttention)).toHaveLength(1);
  });

  it("treats a coverage gap as needing a person, not another run", () => {
    // Task 2.8.6's blocked set: the symbol stopped extending, every later run
    // hits the same gap at the same place, and re-running fixes nothing.
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, completeBars(WEEK)),
        attempts: [
          attempt({ outcome: "coverage-gap", detail: "missing 2026-02-27" }),
        ],
        lastBarAt: openOf(WEEK, 4),
      },
    ]);

    expect(report.findings.filter(needsAttention)).toHaveLength(1);
  });
});

describe("compareStoreToCalendar — cause 4, the fetch never happened", () => {
  it("is a session outside the ledger's covered range, and nothing else", () => {
    // The lookup shape Task 2.8.4 corrected: the ledger is one contiguous range
    // per series rather than a row per session, so `not fetched` is a set
    // difference against one interval.
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(
          NVDA,
          WEEK.slice(0, 3),
          completeBars(WEEK.slice(0, 3)),
        ),
        attempts: [],
        lastBarAt: openOf(WEEK, 2),
      },
    ]);

    expect(report.series[0]?.notFetched).toEqual([
      WEEK[3]?.date,
      WEEK[4]?.date,
    ]);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.kind).toBe("not-fetched");
    // And it is emphatically NOT something a person has to act on: running
    // `pnpm backfill` again is the whole of the response.
    expect(report.findings.filter(needsAttention)).toEqual([]);
  });

  it("names a series with no ledger row at all as its own finding", () => {
    const report = compare([{ symbol: AMD, timeframe: "1m", attempts: [] }]);

    expect(report.findings[0]).toEqual({
      kind: "never-fetched",
      symbol: AMD,
      timeframe: "1m",
      sessions: WEEK.length,
    });
    expect(report.series[0]?.barsExpected).toBe(0);
  });

  it("finds a symbol behind the rest of the universe", () => {
    // The default window is the ledger's own span, so `not fetched` means
    // *behind the rest* — the state Task 2.8.6 left with no instrument at all,
    // because the backfill's blocked set lives in memory and dies with the
    // process.
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, completeBars(WEEK)),
        attempts: [],
        lastBarAt: openOf(WEEK, 4),
      },
      {
        symbol: AMD,
        timeframe: "1m",
        coverage: coverageOver(
          AMD,
          WEEK.slice(0, 2),
          completeBars(WEEK.slice(0, 2)),
        ),
        attempts: [],
        lastBarAt: openOf(WEEK, 1),
      },
    ]);

    const behind = report.findings.filter(
      (finding) => finding.kind === "not-fetched",
    );
    expect(behind).toHaveLength(1);
    expect(behind[0]?.symbol).toBe(AMD);
  });
});

describe("compareStoreToCalendar — the delisting signal", () => {
  it("reports a security whose bars stopped, and writes nothing", () => {
    // Task 2.7.8 moved this here on a measurement: bars stopping correlates
    // with reality at 100% against the vendor's own `inactive` flag at 92%.
    const fortnight = marketSessionsBetween(
      toMarketDate("2026-03-02"),
      toMarketDate("2026-03-13"),
    );
    const lastBar = fortnight[1];
    if (lastBar === undefined) throw new Error("fixture");

    const report = compare(
      [
        {
          symbol: NVDA,
          timeframe: "1m",
          coverage: coverageOver(NVDA, fortnight, 700),
          attempts: [],
          lastBarAt: lastBar.open,
        },
      ],
      fortnight,
    );

    const stale = report.findings.filter(
      (finding) => finding.kind === "no-recent-bars",
    );
    expect(stale).toHaveLength(1);
    expect(stale[0]).toMatchObject({
      symbol: NVDA,
      lastBarDate: lastBar.date,
      sessionsSince: fortnight.length - 2,
    });
  });

  it("does not fire on a security that traded in the last session", () => {
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, completeBars(WEEK)),
        attempts: [],
        lastBarAt: openOf(WEEK, 4),
      },
    ]);

    expect(
      report.findings.filter((finding) => finding.kind === "no-recent-bars"),
    ).toEqual([]);
  });

  it("does not fire below the threshold, because thin is not dead", () => {
    // The threshold is chosen against the measurement rather than picked: the
    // thinnest security measured on an ordinary session still returned 344 of
    // 390 minutes, so a few quiet sessions is not a delisting.
    const quiet = WEEK.slice(0, STALE_SESSION_THRESHOLD - 1);
    const report = compare(
      [
        {
          symbol: NVDA,
          timeframe: "1m",
          coverage: coverageOver(NVDA, quiet, 10),
          attempts: [],
          lastBarAt: openOf(quiet, 0),
        },
      ],
      quiet,
    );

    expect(
      report.findings.filter((finding) => finding.kind === "no-recent-bars"),
    ).toEqual([]);
  });
});

describe("compareStoreToCalendar — the delisting signal's blind spot", () => {
  it("produces no finding when the daily ledger cannot answer", () => {
    // The false positive this reported on the day it was written: a store with
    // minute bars and no daily backfill has no daily row for anything, so "no
    // daily bar" means *we never asked* rather than *it has stopped printing*.
    // Absent is modelled rather than collapsed into `null`.
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, completeBars(WEEK)),
        attempts: [],
      },
    ]);

    expect(
      report.findings.filter((finding) => finding.kind === "no-recent-bars"),
    ).toEqual([]);
  });

  it("DOES produce one when the daily ledger answers `no bars at all`", () => {
    const report = compare([
      {
        symbol: NVDA,
        timeframe: "1m",
        coverage: coverageOver(NVDA, WEEK, completeBars(WEEK)),
        attempts: [],
        lastBarAt: null,
      },
    ]);

    expect(report.findings).toEqual([
      {
        kind: "no-recent-bars",
        symbol: NVDA,
        timeframe: "1m",
        sessionsSince: WEEK.length,
      },
    ]);
  });
});
