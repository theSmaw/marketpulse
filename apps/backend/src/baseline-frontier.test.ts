import { describe, expect, it } from "vitest";

import {
  BASELINE_LOOKBACK_SESSIONS,
  lastMarketSessions,
  toMarketDate,
  toTicker,
  type MarketSession,
  type TimeRange,
} from "@marketpulse/shared";

import { baselineTapeFrontier } from "./baseline-frontier.js";
import type { TapeFrontierPort } from "./baseline-frontier.js";
import type { BaselineSubject } from "./return-baseline-store.js";

// The walk's arithmetic, with no database (Task 5.5.1).
//
// `return-baselines.database.test.ts` owns the half that needs a server — a
// real `iex`-only session past a real ledger row, which is the only level the
// shipped defect is visible at. What is here is the part a fixture can say
// better: how far it retreats, how many questions it asks, and what it answers
// when the tape is absent everywhere.

const LAST = toMarketDate("2026-11-30");
const SESSIONS = lastMarketSessions(BASELINE_LOOKBACK_SESSIONS, LAST);

/** The instant the ledger would hand it — one millisecond past a close. */
function ledgerEndAt(session: MarketSession): Date {
  return new Date(session.close.getTime() + 1);
}

function sessionFromEnd(offset: number): MarketSession {
  const found = SESSIONS[SESSIONS.length - 1 - offset];
  if (found === undefined) throw new Error(`no session ${String(offset)} back`);
  return found;
}

const subjects: readonly BaselineSubject[] = [
  { id: "1", symbol: toTicker("AAAA") },
  { id: "2", symbol: toTicker("BBBB") },
];

interface Asked {
  readonly id: string;
  readonly range: TimeRange;
}

/**
 * A port that holds the tape for named session dates, for named securities.
 *
 * It records every question, because the cost claim in the module's header —
 * *one `tapeCounts` call in the ordinary case* — is a claim about the number of
 * round trips and is otherwise unverifiable.
 */
function port(holders: Readonly<Record<string, readonly string[]>>): {
  readonly port: TapeFrontierPort;
  readonly asked: readonly Asked[];
} {
  const asked: Asked[] = [];

  return {
    asked,
    port: {
      activeSubjects: () => Promise.resolve(subjects),
      tapeCounts: (subject, range) => {
        asked.push({ id: subject.id, range });

        const date = SESSIONS.find(
          (session) => session.open.getTime() === range.start.getTime(),
        )?.date;
        const held = date === undefined ? [] : (holders[date] ?? []);

        return Promise.resolve({
          sip: held.includes(subject.id) ? 42 : 0,
          // Non-zero everywhere, deliberately: the IEX tape is what the ledger
          // was answering with, and a walk that read the wrong field would be
          // green on a fixture where both counts moved together.
          iex: 7,
        });
      },
    },
  };
}

describe("baselineTapeFrontier", () => {
  it("answers the ledger's own session when that session holds the tape", async () => {
    const newest = sessionFromEnd(0);
    const { port: subject, asked } = port({ [newest.date]: ["1"] });

    expect(await baselineTapeFrontier(subject, ledgerEndAt(newest))).toEqual(
      newest.close,
    );

    // **One question.** The newest candidate first, the first security first,
    // and it stops there — which is the ordinary case on a store the fill is
    // current on, and is the cost claim in the module's header.
    expect(asked).toHaveLength(1);
    expect(asked[0]?.range.start).toEqual(newest.open);
  });

  it("retreats past a session that holds only the OTHER tape", async () => {
    // The shipped defect, in one assertion: the ledger's frontier names a
    // session whose `sip` count is zero while its `iex` count is seven, and
    // the window must end one session earlier.
    const newest = sessionFromEnd(0);
    const previous = sessionFromEnd(1);
    const { port: subject, asked } = port({ [previous.date]: ["1"] });

    expect(await baselineTapeFrontier(subject, ledgerEndAt(newest))).toEqual(
      previous.close,
    );

    // Both securities asked about the newest session before the retreat: the
    // frontier is the MAXIMUM over tracked securities, so a session is only
    // absent once nobody holds it.
    expect(asked.map((entry) => entry.id)).toEqual(["1", "2", "1"]);
  });

  it("takes the maximum over securities, not the first security's own answer", async () => {
    // `AAAA` is behind and `BBBB` is current. The old `readCoveredEnd` took a
    // maximum deliberately — a minimum is `commonCoverage`'s intersection and
    // would hold the whole universe a year behind a late-listing constituent —
    // and this keeps it.
    const newest = sessionFromEnd(0);
    const older = sessionFromEnd(3);
    const { port: subject } = port({
      [newest.date]: ["2"],
      [older.date]: ["1", "2"],
    });

    expect(await baselineTapeFrontier(subject, ledgerEndAt(newest))).toEqual(
      newest.close,
    );
  });

  it("answers nothing when no session in the lookback holds the tape", async () => {
    // CI's store reached by a second route: 516 securities, zero bars, and a
    // ledger row that exists because something else wrote it. The pass prints
    // its own `run pnpm backfill first` line rather than computing a window
    // over a tape it has none of.
    const newest = sessionFromEnd(0);
    const { port: subject, asked } = port({});

    expect(
      await baselineTapeFrontier(subject, ledgerEndAt(newest)),
    ).toBeUndefined();

    // The bound, counted: `BASELINE_LOOKBACK_SESSIONS` candidates × both
    // securities, and not one question more. A walk off the end of the
    // calendar would throw `MarketCalendarRangeError` instead.
    expect(asked).toHaveLength(BASELINE_LOOKBACK_SESSIONS * subjects.length);
  });

  it("reads the instant BEFORE the ledger's end, because `covered_end` is exclusive", async () => {
    // A ledger row ending exactly at a session's close describes that session,
    // not the next one — the same off-by-one `baselineWindowEndingAt` takes a
    // millisecond off for, and getting it wrong here would skip a session the
    // store holds in full.
    const newest = sessionFromEnd(0);
    const { port: subject, asked } = port({ [newest.date]: ["1"] });

    expect(await baselineTapeFrontier(subject, newest.close)).toEqual(
      newest.close,
    );
    expect(asked).toHaveLength(1);
  });
});
