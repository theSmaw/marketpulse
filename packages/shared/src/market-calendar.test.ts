import { describe, expect, it } from "vitest";

import {
  assertWithinMarketCalendar,
  MARKET_CALENDAR,
  MARKET_CALENDAR_PROVENANCE,
  MARKET_CALENDAR_RANGE,
  MarketCalendarRangeError,
  marketCalendarExceptionOn,
  marketEarlyCloseOn,
} from "./market-calendar.js";
import { toMarketDate } from "./market-time.js";

// Every date asserted here was read off NYSE's published holiday and hours
// calendar (2026-2028 live, 2024-2025 from archived editions of the same page)
// and then cross-checked against CALENDAR.md §7.5 and §7.6's independently
// derived tables. Where a test looks like it is asserting arithmetic, it is
// asserting the published record; the arithmetic is the cross-check.
//
// This file deliberately asserts nothing about sessions, bounds or "the last N
// days" — those are Task 2.5.4's and they fail differently.

const on = (date: string) => marketCalendarExceptionOn(toMarketDate(date));

describe("the table's own shape", () => {
  // Every check inside the lazy index fires here or nowhere, because this is the
  // first thing that reads the table. Its failure message names the offending
  // row rather than the assertion, which is the point of validating there.
  it("is well formed: real weekday dates, in order, no duplicates, in range", () => {
    expect(() => on("2026-09-04")).not.toThrow();
  });

  it("covers 2024 to 2028 and says so where somebody editing will look", () => {
    expect(MARKET_CALENDAR_RANGE).toStrictEqual({
      firstDate: "2024-01-01",
      lastDate: "2028-12-31",
    });
    // The obligation, a full covered year before the range runs out.
    expect(MARKET_CALENDAR_PROVENANCE.nextEditDue).toBe("2028-01-01");
    expect(MARKET_CALENDAR_PROVENANCE.source).toMatch(/NYSE/);
    // Not "now", and nothing can check that it is honest — only that it is a
    // date somebody wrote rather than a value a mechanism produced.
    expect(MARKET_CALENDAR_PROVENANCE.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("records both kinds and only those two", () => {
    const kinds = new Set(MARKET_CALENDAR.map((row) => row.kind));
    expect([...kinds].sort()).toStrictEqual(["closed", "early_close"]);
  });
});

describe("full closures", () => {
  it("closes on Christmas Day", () => {
    expect(on("2026-12-25")).toStrictEqual({
      date: "2026-12-25",
      kind: "closed",
      name: "Christmas Day",
    });
  });

  // The one a computed rule set misses, and the whole argument for a table:
  // it is Easter-derived, it is in no federal holiday list, and it moves by up
  // to three weeks a year.
  it("closes on Good Friday, in every covered year", () => {
    for (const date of [
      "2024-03-29",
      "2025-04-18",
      "2026-04-03",
      "2027-03-26",
      "2028-04-14",
    ]) {
      expect(on(date)).toMatchObject({ kind: "closed", name: "Good Friday" });
    }
  });

  // The row no rule set can produce at all. Announced eleven days beforehand;
  // CALENDAR.md §7.6's derived list does not contain it, and the published
  // record does. This is the assertion that fails if somebody ever "tidies" the
  // table by regenerating it.
  it("closes for the 2025 National Day of Mourning, which no rule produces", () => {
    expect(on("2025-01-09")).toMatchObject({ kind: "closed" });
  });

  it("has no opinion about an ordinary session", () => {
    expect(on("2026-09-04")).toBeUndefined();
  });

  // A weekend is not an exception — it is the rule — so the table is silent
  // about it. Turning that silence into "no session" is Task 2.5.4's.
  it("is silent about a weekend rather than listing it", () => {
    expect(on("2026-09-05")).toBeUndefined();
    expect(on("2026-09-06")).toBeUndefined();
  });
});

describe("the observance rule", () => {
  // Saturday -> the Friday before.
  it("observes a Saturday holiday on the preceding Friday", () => {
    // Independence Day 2026 is a Saturday.
    expect(on("2026-07-03")).toMatchObject({
      kind: "closed",
      name: "Independence Day (observed)",
    });
    expect(on("2026-07-04")).toBeUndefined(); // a Saturday: not a row
    // Juneteenth 2027 is a Saturday.
    expect(on("2027-06-18")).toMatchObject({ kind: "closed" });
  });

  // Sunday -> the Monday after.
  it("observes a Sunday holiday on the following Monday", () => {
    // Independence Day 2027 is a Sunday.
    expect(on("2027-07-05")).toMatchObject({
      kind: "closed",
      name: "Independence Day (observed)",
    });
    // The Friday before is an ordinary full session, which is the half of this
    // that a mechanical "shift to the nearest weekday" gets wrong.
    expect(on("2027-07-02")).toBeUndefined();
  });

  // The documented exception, and it is inside the covered range. NYSE states it
  // as a footnote: "Because the holiday falls on Saturday, January 1, 2028, no
  // New Year's Day holiday is observed."
  it("does NOT observe New Year's Day falling on a Saturday", () => {
    expect(on("2028-01-01")).toBeUndefined(); // the Saturday itself
    expect(on("2027-12-31")).toBeUndefined(); // an ordinary full session
    expect(on("2028-01-03")).toBeUndefined(); // and not the Monday either
    // Which is why 2028 has nine closures rather than ten.
    const closures2028 = MARKET_CALENDAR.filter(
      (row) => row.date.startsWith("2028-") && row.kind === "closed",
    );
    expect(closures2028).toHaveLength(9);
  });
});

describe("early closes", () => {
  it("closes at 13:00 the day after Thanksgiving", () => {
    expect(on("2026-11-27")).toStrictEqual({
      date: "2026-11-27",
      kind: "early_close",
      closesAt: "13:00",
      name: "Day after Thanksgiving",
    });
  });

  // A second producer, on a different rule. Both matter: a table that has one
  // and not the other loses three hours of bars a year to something that reads
  // as a data-quality failure.
  it("closes at 13:00 on Christmas Eve when it is an ordinary weekday", () => {
    expect(on("2026-12-24")).toMatchObject({
      kind: "early_close",
      closesAt: "13:00",
    });
  });

  it("closes at 13:00 the day before a weekday Independence Day", () => {
    expect(on("2028-07-03")).toMatchObject({
      kind: "early_close",
      closesAt: "13:00",
    });
    expect(on("2028-07-04")).toMatchObject({ kind: "closed" });
  });

  // The interaction no task file stated and the one that produces a phantom
  // half session: the half-day rule yields to the observance rule.
  it("yields to the observance rule rather than inventing a half session", () => {
    // 2026: Independence Day is a Saturday, so 3 July is the observed FULL
    // closure and not a half day.
    expect(on("2026-07-03")).toMatchObject({ kind: "closed" });
    // 2027: Christmas Day is a Saturday, so 24 December is the observed full
    // closure — no Christmas Eve half day that year...
    expect(on("2027-12-24")).toMatchObject({ kind: "closed" });
    // ...and the early close does not shift to the 23rd.
    expect(on("2027-12-23")).toBeUndefined();
  });

  it("parses the close time through market-time.ts rather than a second parser", () => {
    expect(marketEarlyCloseOn(toMarketDate("2026-11-27"))).toStrictEqual({
      hour: 13,
      minute: 0,
      second: 0,
    });
  });

  // A full closure is not an early close: "closes early at" has no answer on a
  // day the market never opened.
  it("reports no early close on a full closure or an ordinary session", () => {
    expect(marketEarlyCloseOn(toMarketDate("2026-12-25"))).toBeUndefined();
    expect(marketEarlyCloseOn(toMarketDate("2026-09-04"))).toBeUndefined();
  });

  // CALENDAR.md §7.5's derived counts, confirmed against the published record.
  // 2027 having exactly one is the year the observance interaction shows up as
  // an absence, which no individual named date makes obvious.
  it("has the published number of early closes in each covered year", () => {
    const perYear = new Map([
      ["2024", 3],
      ["2025", 3],
      ["2026", 2],
      ["2027", 1],
      ["2028", 2],
    ]);
    for (const [year, expected] of perYear) {
      const rows = MARKET_CALENDAR.filter(
        (row) => row.date.startsWith(`${year}-`) && row.kind === "early_close",
      );
      expect(rows, `early closes in ${year}`).toHaveLength(expected);
    }
  });
});

describe("outside the covered range", () => {
  // Acceptance criterion 4. The failure this refuses is silent and arrives a
  // year later as a chart with a bar on Christmas Day.
  it("refuses a date past the last covered year", () => {
    expect(() => on("2029-01-02")).toThrow(MarketCalendarRangeError);
  });

  it("refuses a date before the first covered year", () => {
    expect(() => on("2023-12-29")).toThrow(MarketCalendarRangeError);
  });

  it("names the range and the file to edit, not just the problem", () => {
    let thrown: unknown;
    try {
      assertWithinMarketCalendar(toMarketDate("2029-01-02"));
    } catch (error) {
      thrown = error;
    }

    if (!(thrown instanceof MarketCalendarRangeError)) {
      expect.fail("expected a MarketCalendarRangeError");
    }

    // The date is on the error rather than only in the prose, so a caller can
    // act without matching on a message.
    expect(thrown.date).toBe("2029-01-02");
    expect(thrown.message).toContain("2024-01-01");
    expect(thrown.message).toContain("2028-12-31");
    expect(thrown.message).toContain("packages/shared/src/market-calendar.ts");
  });

  it("admits both edges of the range itself", () => {
    expect(() => on(MARKET_CALENDAR_RANGE.firstDate)).not.toThrow();
    expect(() => on(MARKET_CALENDAR_RANGE.lastDate)).not.toThrow();
  });

  // There is deliberately no way to ask for the silent answer. If this ever
  // stops being true, somebody added the flag that gets set during an incident.
  it("offers no lenient mode", () => {
    expect(marketCalendarExceptionOn).toHaveLength(1);
    expect(assertWithinMarketCalendar).toHaveLength(1);
  });
});

describe("the arithmetic cross-check", () => {
  // The check that catches a missing or invented holiday that every individual
  // named date above passes. It is a PER-YEAR table and not the folklore 252:
  // the count is a function of how many weekdays the year contains (260-262) and
  // how many closures land on one, so four of these five years are not 252.
  //
  // 2025 is 250 rather than CALENDAR.md §7.2's derived 251, because of the
  // National Day of Mourning. A test asserting 251 would have been red.
  it("produces the published number of sessions in each covered year", () => {
    const expected = new Map([
      ["2024", 252],
      ["2025", 250],
      ["2026", 251],
      ["2027", 251],
      ["2028", 251],
    ]);

    for (const [year, sessions] of expected) {
      let weekdays = 0;
      const cursor = new Date(`${year}-01-01T00:00:00Z`);
      while (cursor.getUTCFullYear() === Number(year)) {
        const day = cursor.getUTCDay();
        if (day !== 0 && day !== 6) weekdays += 1;
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      const closures = MARKET_CALENDAR.filter(
        (row) => row.date.startsWith(`${year}-`) && row.kind === "closed",
      ).length;

      expect(weekdays - closures, `sessions in ${year}`).toBe(sessions);
    }
  });
});
