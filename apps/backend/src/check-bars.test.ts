// `pnpm bars:check`'s rendering and its refusals (Task 2.8.7).
//
// The command itself needs a database and is exercised in
// `bar-attempts.database.test.ts`. What is here is everything a person actually
// reads, plus the two properties that would be easiest to lose in a later edit:
// **a finding never changes the exit code**, and **completeness and density are
// two numbers with two names**.

import { describe, expect, it } from "vitest";

import { toMarketDate, toTicker, type Ticker } from "@marketpulse/shared";

import type { BarAttempt } from "./bar-attempts.js";
import type { CompletenessReport } from "./bar-completeness.js";
import { checkBarsCommand, summariseBarsCheck } from "./check-bars.js";

const NVDA: Ticker = toTicker("NVDA");
const WINDOW = {
  from: toMarketDate("2026-03-02"),
  to: toMarketDate("2026-03-06"),
};

function healthy(): CompletenessReport {
  return {
    series: [
      {
        symbol: NVDA,
        timeframe: "1m",
        sessionsInWindow: 5,
        sessionsFetched: 5,
        notFetched: [],
        barsHeld: 1_821,
        barsExpected: 1_950,
        attempts: [],
      },
    ],
    findings: [],
  };
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

const NO_CAVEATS = { seriesWithoutDailyLedger: 0 };

function rendered(report: CompletenessReport): string {
  return summariseBarsCheck("1m", WINDOW, NO_CAVEATS, report).lines.join("\n");
}

describe("summariseBarsCheck", () => {
  it("exits 0 with nothing to look at when the store is whole", () => {
    const outcome = summariseBarsCheck("1m", WINDOW, NO_CAVEATS, healthy());

    expect(outcome.exitCode).toBe(0);
    expect(outcome.errors).toEqual([]);
    expect(outcome.lines.join("\n")).toContain("Nothing to look at");
  });

  it("exits 0 WITH findings, which is the decision rather than an oversight", () => {
    // The exit code answers *did the check run*, never *did it find something*
    // — `/diagnostics/database`'s rule. A non-zero code here invites somebody to
    // wire this into CI, where it goes red on a thin security having a quiet
    // Tuesday.
    const report = healthy();
    const outcome = summariseBarsCheck("1m", WINDOW, NO_CAVEATS, {
      ...report,
      findings: [
        {
          kind: "over-full",
          symbol: NVDA,
          timeframe: "1m",
          held: 4_582,
          expected: 1_950,
        },
        {
          kind: "attempted-and-empty",
          symbol: NVDA,
          timeframe: "1m",
          attempt: attempt({ outcome: "unauthorised" }),
        },
      ],
    });

    expect(outcome.exitCode).toBe(0);
    expect(outcome.errors).toEqual([]);
  });

  it("prints completeness and density as two numbers with two names", () => {
    // Merging them is how a permanently ~93%-thin universe comes to be reported
    // as permanently incomplete, and how somebody later re-fetches 240 sessions
    // that were already complete.
    const text = rendered(healthy());

    expect(text).toContain("sessions   1/1 series hold every session");
    expect(text).toContain("density    1821 bars held of 1950");
    expect(text).toContain("LIQUIDITY measure and not a completeness one");
  });

  it("says which attempt outcomes mean come back and which mean stop", () => {
    const text = rendered({
      ...healthy(),
      findings: [
        {
          kind: "attempted-and-empty",
          symbol: NVDA,
          timeframe: "1m",
          attempt: attempt({ outcome: "unauthorised" }),
        },
      ],
    });

    expect(text).toContain("unauthorised");
    expect(text).toContain("means stop and fix the credential");
    expect(text).toContain("1 of these need a person");
  });

  it("says a not-fetched finding needs a backfill rather than a person", () => {
    const text = rendered({
      ...healthy(),
      findings: [
        {
          kind: "not-fetched",
          symbol: NVDA,
          timeframe: "1m",
          sessions: [toMarketDate("2026-03-05"), toMarketDate("2026-03-06")],
        },
      ],
    });

    expect(text).toContain("2026-03-05 … 2026-03-06");
    expect(text).toContain("Nothing here needs a person");
  });

  it("calls an over-full series an invariant violation rather than a big number", () => {
    const text = rendered({
      ...healthy(),
      findings: [
        {
          kind: "over-full",
          symbol: NVDA,
          timeframe: "1m",
          held: 4_582,
          expected: 1_950,
        },
      ],
    });

    expect(text).toContain("invariant violation rather than a large number");
    expect(text).toContain("2.35x");
  });

  it("reports a stopped security and says outright that nothing is written", () => {
    // Task 2.7.8's `delisted` question, answered as Task 2.1.7's shape: the
    // instrument says *whether* and a person decides *what to do*. A `status`
    // written here is reverted by the next deploy's `pnpm universe`.
    const text = rendered({
      ...healthy(),
      findings: [
        {
          kind: "no-recent-bars",
          symbol: NVDA,
          timeframe: "1m",
          lastBarDate: toMarketDate("2026-02-02"),
          sessionsSince: 21,
        },
      ],
    });

    expect(text).toContain("stopped printing");
    expect(text).toContain("NOTHING IS WRITTEN FOR THIS");
    expect(text).toContain("universe.ts");
  });

  it("says nothing was written even when it found something", () => {
    expect(
      rendered({
        ...healthy(),
        findings: [
          { kind: "never-fetched", symbol: NVDA, timeframe: "1m", sessions: 5 },
        ],
      }),
    ).toContain("Nothing was written.");
  });
});

describe("checkBarsCommand — the refusals, which need no database", () => {
  it("prints usage for --help at exit 0", async () => {
    const outcome = await checkBarsCommand(["--help"]);

    expect(outcome.exitCode).toBe(0);
    expect(outcome.lines.join("\n")).toContain("pnpm bars:check");
  });

  it("refuses an unknown option rather than ignoring it", async () => {
    const outcome = await checkBarsCommand(["--symbol", "NVDA"]);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("\n")).toContain('"--symbol" is not an option');
  });

  it("refuses one end of a range, because guessing the other invents a window", async () => {
    const outcome = await checkBarsCommand(["--from", "2026-03-02"]);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("\n")).toContain("give both or neither");
  });

  it("refuses a timeframe outside the vocabulary", async () => {
    const outcome = await checkBarsCommand(["--timeframe", "5m"]);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("\n")).toContain("is not a timeframe");
  });

  it("refuses a malformed ticker", async () => {
    const outcome = await checkBarsCommand(["--symbols", "not a ticker"]);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.errors.join("\n")).toContain("well-formed ticker");
  });
});

describe("summariseBarsCheck — the blind spot it declares", () => {
  it("says outright when it cannot answer the stopped-printing question", () => {
    // A check that cannot see something must say so. A reader who sees no
    // "stopped printing" findings would otherwise conclude that nothing has
    // stopped printing — which is Task 1.13.6's blind-renderer problem in a new
    // place, and it produced two false positives here before the third value
    // existed.
    const text = summariseBarsCheck(
      "1m",
      WINDOW,
      { seriesWithoutDailyLedger: 517 },
      healthy(),
    ).lines.join("\n");

    expect(text).toContain("BLIND for 517 of these series");
    expect(text).toContain("pnpm backfill --timeframe 1d");
  });

  it("says nothing about it when the daily ledger can answer for everything", () => {
    expect(rendered(healthy())).not.toContain("BLIND");
  });
});
