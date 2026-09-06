import { describe, expect, it } from "vitest";

import { MarketCalendarRangeError } from "./market-calendar.js";
import { instantFromMarketTime, toMarketDate } from "./market-time.js";
import {
  lastMarketSessions,
  marketSessionOn,
  marketSessionsBetween,
  marketSessionStateAt,
  MARKET_SESSION_STATUSES,
  nextMarketSession,
  previousMarketSession,
} from "./market-session.js";

// Every date here comes from CALENDAR.md §7.1's named-date list, which is
// acceptance criterion 1: these are asserted rather than reasoned about, and
// each case is its own named test so a failure says which one broke.
//
// The UTC instants below are written as literals on purpose. Deriving them
// would mean re-running the conversion under test, which is how a timezone
// suite comes to assert that the code agrees with itself.

const on = (date: string) => marketSessionOn(toMarketDate(date));

/** The session on a date the calendar must have one for. */
const sessionOn = (date: string) => {
  const session = on(date);
  if (session === undefined) {
    expect.fail(`expected ${date} to be a trading session`);
  }
  return session;
};

const at = (date: string, time: string) => {
  const [hour, minute] = time.split(":");
  return instantFromMarketTime(toMarketDate(date), {
    hour: Number(hour),
    minute: Number(minute),
    second: 0,
  });
};

describe("case 1 — an ordinary session", () => {
  // The control. Everything else is measured against this shape.
  it("runs 09:30 to 16:00 ET and has 390 minute bars", () => {
    const session = sessionOn("2026-09-04");

    expect(session.date).toBe("2026-09-04");
    expect(session.open.toISOString()).toBe("2026-09-04T13:30:00.000Z");
    expect(session.close.toISOString()).toBe("2026-09-04T20:00:00.000Z");
    expect(session.isEarlyClose).toBe(false);
    expect(session.minuteBars).toBe(390);
  });

  it("is open during the session and shut on either side of it", () => {
    expect(marketSessionStateAt(at("2026-09-04", "09:29")).status).toBe(
      "before_open",
    );
    expect(marketSessionStateAt(at("2026-09-04", "09:30")).status).toBe("open");
    expect(marketSessionStateAt(at("2026-09-04", "15:59")).status).toBe("open");
    // The close is exclusive: the last minute bar of a session is 15:59, so at
    // exactly 16:00:00 the market is already shut.
    expect(marketSessionStateAt(at("2026-09-04", "16:00")).status).toBe(
      "after_close",
    );
  });
});

describe("case 2 — a weekend", () => {
  it("has no session on either day", () => {
    expect(on("2026-09-05")).toBeUndefined();
    expect(on("2026-09-06")).toBeUndefined();
  });

  it("reports `weekend` rather than `holiday`, because it is the rule not an exception", () => {
    expect(marketSessionStateAt(at("2026-09-05", "12:00")).status).toBe(
      "weekend",
    );
    expect(marketSessionStateAt(at("2026-09-06", "12:00")).status).toBe(
      "weekend",
    );
  });

  it("skips it: next session from Friday is Monday, previous from Monday is Friday", () => {
    // A clean weekend rather than 09-04's, because the Monday after that one is
    // Labor Day and this test is about the weekend rather than about a holiday.
    expect(nextMarketSession(toMarketDate("2026-09-11")).date).toBe(
      "2026-09-14",
    );
    expect(previousMarketSession(toMarketDate("2026-09-14")).date).toBe(
      "2026-09-11",
    );
  });
});

describe("case 3 — a full holiday", () => {
  it("has no session on Christmas Day", () => {
    expect(on("2026-12-25")).toBeUndefined();
  });

  it("names the holiday, so the header can say more than CLOSED", () => {
    const state = marketSessionStateAt(at("2026-12-25", "12:00"));
    expect(state.status).toBe("holiday");
    expect(state).toMatchObject({ name: "Christmas Day" });
  });

  it("has the two exception kinds adjacent: a half day, then a closure, then an ordinary Monday", () => {
    expect(sessionOn("2026-12-24").isEarlyClose).toBe(true);
    expect(on("2026-12-25")).toBeUndefined();
    expect(sessionOn("2026-12-28").minuteBars).toBe(390);
  });
});

describe("case 4 — Good Friday", () => {
  // The one a computed rule set misses: it is Easter-derived, moves on a
  // lunar-solar cycle, and appears in no federal holiday list.
  it("has no session, in every covered year", () => {
    for (const date of [
      "2024-03-29",
      "2025-04-18",
      "2026-04-03",
      "2027-03-26",
      "2028-04-14",
    ]) {
      expect(on(date), date).toBeUndefined();
    }
  });

  it("is skipped by the session walk rather than merely absent", () => {
    expect(nextMarketSession(toMarketDate("2026-04-02")).date).toBe(
      "2026-04-06",
    );
  });
});

describe("case 5 — the half day after Thanksgiving", () => {
  it("closes at 13:00 ET and has 210 minute bars, not 390", () => {
    const session = sessionOn("2026-11-27");

    expect(session.open.toISOString()).toBe("2026-11-27T14:30:00.000Z");
    expect(session.close.toISOString()).toBe("2026-11-27T18:00:00.000Z");
    expect(session.isEarlyClose).toBe(true);
    expect(session.minuteBars).toBe(210);
  });

  it("is shut at 14:00, which a regular-session assumption would call open", () => {
    expect(marketSessionStateAt(at("2026-11-27", "12:59")).status).toBe("open");
    expect(marketSessionStateAt(at("2026-11-27", "14:00")).status).toBe(
      "after_close",
    );
  });
});

describe("case 6 — the Christmas Eve half day", () => {
  // The second half-day producer, arriving from a different rule. Asserted
  // separately so a fix to one cannot silently be a fix to neither.
  it("closes at 13:00 ET with 210 bars", () => {
    const session = sessionOn("2026-12-24");
    expect(session.close.toISOString()).toBe("2026-12-24T18:00:00.000Z");
    expect(session.minuteBars).toBe(210);
  });
});

describe("case 7 — a holiday observed on the Friday before", () => {
  it("is closed on 2026-07-03, because Independence Day is a Saturday", () => {
    expect(on("2026-07-03")).toBeUndefined();
  });

  it("is a full closure and NOT the half day the usual 3 July rule would invent", () => {
    // A list applying "3 July is a half day" mechanically produces a phantom
    // half session here. The observance rule wins.
    const state = marketSessionStateAt(at("2026-07-03", "12:00"));
    expect(state.status).toBe("holiday");
    expect(state).toMatchObject({ name: "Independence Day (observed)" });
  });
});

describe("case 8 — a holiday observed on the Monday after", () => {
  it("is closed on 2027-07-05, because Independence Day is a Sunday", () => {
    expect(on("2027-07-05")).toBeUndefined();
  });

  it("leaves the Friday before as an ordinary full session", () => {
    expect(sessionOn("2027-07-02").minuteBars).toBe(390);
    expect(sessionOn("2027-07-02").isEarlyClose).toBe(false);
  });
});

describe("cases 9, 10 and 11 — the DST transitions", () => {
  // CALENDAR.md §7.3 corrected this task's own brief: there is no session on a
  // transition day at all, because every US DST transition is a Sunday. The
  // assertion that catches the bug is on the sessions EITHER SIDE, whose UTC
  // bounds move by an hour while their ET bounds do not.
  //
  // This is the group that fails if anything anywhere did arithmetic on an
  // instant instead of a calendar operation on a market date.

  it("has no session on either transition day, because both are Sundays", () => {
    expect(on("2026-03-08")).toBeUndefined();
    expect(on("2026-11-01")).toBeUndefined();
  });

  it("case 9 — spring forward: the UTC open moves 14:30Z to 13:30Z across the weekend", () => {
    const friday = sessionOn("2026-03-06");
    const monday = sessionOn("2026-03-09");

    expect(friday.open.toISOString()).toBe("2026-03-06T14:30:00.000Z");
    expect(monday.open.toISOString()).toBe("2026-03-09T13:30:00.000Z");
    // Both are still 6.5 hours in market terms. That is the whole point: the
    // session did not get shorter, the offset moved.
    expect(friday.minuteBars).toBe(390);
    expect(monday.minuteBars).toBe(390);
  });

  it("case 10 — autumn back: the UTC open moves 13:30Z to 14:30Z across the weekend", () => {
    const friday = sessionOn("2026-10-30");
    const monday = sessionOn("2026-11-02");

    expect(friday.open.toISOString()).toBe("2026-10-30T13:30:00.000Z");
    expect(monday.open.toISOString()).toBe("2026-11-02T14:30:00.000Z");
    expect(friday.minuteBars).toBe(390);
    expect(monday.minuteBars).toBe(390);
  });

  it("case 11 — the Tuesday after each transition is an ordinary session at the NEW offset", () => {
    // The case most likely to be left out, and the one that catches an
    // implementation that special-cased the transition weekend and then got the
    // new offset wrong from the next day onwards.
    expect(sessionOn("2026-03-10").open.toISOString()).toBe(
      "2026-03-10T13:30:00.000Z",
    );
    expect(sessionOn("2026-11-03").open.toISOString()).toBe(
      "2026-11-03T14:30:00.000Z",
    );
  });

  it("steps across a transition weekend without losing or inventing a session", () => {
    expect(nextMarketSession(toMarketDate("2026-03-06")).date).toBe(
      "2026-03-09",
    );
    expect(previousMarketSession(toMarketDate("2026-11-02")).date).toBe(
      "2026-10-30",
    );
  });
});

describe("case 14 — outside the covered range", () => {
  // The functions here PROPAGATE the calendar's refusal rather than truncating.
  // A short list of sessions is a wrong answer wearing the shape of a right one.

  it("refuses a session lookup past the last covered year", () => {
    expect(() => on("2029-01-02")).toThrow(MarketCalendarRangeError);
  });

  it("refuses a walk off the upper end rather than stopping at it", () => {
    // 2028-12-29 is the last session of the covered range.
    expect(() => nextMarketSession(toMarketDate("2028-12-29"))).toThrow(
      MarketCalendarRangeError,
    );
  });

  it("refuses a walk off the lower end rather than stopping at it", () => {
    // 2024-01-02 is the first session; 2024-01-01 is a closure and 2023 is gone.
    expect(() => previousMarketSession(toMarketDate("2024-01-02"))).toThrow(
      MarketCalendarRangeError,
    );
  });

  it("refuses `lastMarketSessions` rather than returning fewer than asked for", () => {
    // The realistic version of this: Epic 5's baseline is 60 trading days, and
    // asking for it from early January crosses the lower bound routinely.
    expect(() => lastMarketSessions(60, toMarketDate("2024-02-01"))).toThrow(
      MarketCalendarRangeError,
    );
    // The same window one month later fits, so the refusal is about the range
    // rather than about the request being unreasonable.
    expect(lastMarketSessions(60, toMarketDate("2024-04-01"))).toHaveLength(60);
  });
});

describe("case 15 — the per-year session count, reached through the session functions", () => {
  // market-calendar.test.ts already asserts these five figures against the
  // table. This asserts the same numbers reached through marketSessionsBetween,
  // which is a different claim: it catches a session walk that skips or repeats
  // a day even when every individual named date above passes.
  //
  // 252 is NOT a constant (CALENDAR.md §7.2) — the count is a function of how
  // many weekdays a year contains and how many closures land on one. 2025 is 250
  // because of the National Day of Mourning, which no rule set produces.
  it("produces 252 / 250 / 251 / 251 / 251 sessions across 2024 to 2028", () => {
    const expected = new Map([
      ["2024", 252],
      ["2025", 250],
      ["2026", 251],
      ["2027", 251],
      ["2028", 251],
    ]);

    for (const [year, count] of expected) {
      const sessions = marketSessionsBetween(
        toMarketDate(`${year}-01-01`),
        toMarketDate(`${year}-12-31`),
      );
      expect(sessions.length, `sessions in ${year}`).toBe(count);
    }
  });

  it("counts every early close as a session, not as a closure", () => {
    const sessions = marketSessionsBetween(
      toMarketDate("2026-01-01"),
      toMarketDate("2026-12-31"),
    );
    expect(sessions.filter((session) => session.isEarlyClose)).toHaveLength(2);
  });
});

describe("case 16 — the last N sessions across a holiday week", () => {
  // ACCEPTANCE CRITERION 3, and the week is chosen because a naive
  // implementation is wrong three different ways in one assertion: it contains a
  // full closure (Thanksgiving), a half day (the Friday after) and a weekend.
  it("returns five SESSIONS, not five calendar days", () => {
    const sessions = lastMarketSessions(5, toMarketDate("2026-11-30"));

    // Oldest first — see the module comment. CALENDAR.md §7.1 lists the same
    // five newest-first, which is how a person reads "the last five"; a time
    // series is iterated chronologically, so this returns them that way and says
    // so rather than leaving every consumer to reverse it.
    expect(sessions.map((session) => session.date)).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-27",
      "2026-11-30",
    ]);
  });

  it("skipped Thanksgiving and the weekend, which five calendar days would have included", () => {
    const dates = lastMarketSessions(5, toMarketDate("2026-11-30")).map(
      (session) => session.date,
    );

    expect(dates).not.toContain("2026-11-26"); // Thanksgiving
    expect(dates).not.toContain("2026-11-28"); // Saturday
    expect(dates).not.toContain("2026-11-29"); // Sunday
  });

  it("carries the half day's shortened bar count with it", () => {
    const sessions = lastMarketSessions(5, toMarketDate("2026-11-30"));
    expect(sessions.map((session) => session.minuteBars)).toEqual([
      390, 390, 390, 210, 390,
    ]);
  });

  it("includes the end date when it is itself a session, and skips back when it is not", () => {
    // Sunday 2026-11-29: "the last session" is the Friday half day.
    const fromSunday = lastMarketSessions(1, toMarketDate("2026-11-29"));
    expect(fromSunday[0]?.date).toBe("2026-11-27");
  });
});

describe("the shape of the answers", () => {
  it("names every session status, so a renderer can be exhaustive", () => {
    expect([...MARKET_SESSION_STATUSES]).toEqual([
      "open",
      "before_open",
      "after_close",
      "holiday",
      "weekend",
    ]);
  });

  it("returns sessions between two dates inclusive at both ends, oldest first", () => {
    const sessions = marketSessionsBetween(
      toMarketDate("2026-11-23"),
      toMarketDate("2026-11-30"),
    );
    expect(sessions.map((session) => session.date)).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-27",
      "2026-11-30",
    ]);
  });

  it("refuses a reversed range rather than returning an empty array that hides the swap", () => {
    expect(() =>
      marketSessionsBetween(
        toMarketDate("2026-11-30"),
        toMarketDate("2026-11-23"),
      ),
    ).toThrow(RangeError);
  });

  it("refuses a session count that is not a positive integer", () => {
    expect(() => lastMarketSessions(0, toMarketDate("2026-11-30"))).toThrow(
      RangeError,
    );
    expect(() => lastMarketSessions(2.5, toMarketDate("2026-11-30"))).toThrow(
      RangeError,
    );
  });

  it("reads the clock nowhere: the same arguments give the same answer", () => {
    // The seam Epic 13 slots into is an ABSENCE (CALENDAR.md §3): every function
    // here is a pure function of its arguments, so replay substitutes a date
    // rather than injecting a clock. This asserts the property that makes that
    // true, which a grep for `Date.now` cannot.
    const first = sessionOn("2026-09-04");
    const second = sessionOn("2026-09-04");
    expect(first.open.getTime()).toBe(second.open.getTime());
    expect(first.close.getTime()).toBe(second.close.getTime());
  });
});
