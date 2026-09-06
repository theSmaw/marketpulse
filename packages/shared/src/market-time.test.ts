import { describe, expect, it } from "vitest";

import {
  instantFromMarketTime,
  isMarketDate,
  marketDateAt,
  marketOffsetAt,
  MarketTimeError,
  marketWallClockAt,
  toMarketDate,
  toMarketTimeOfDay,
} from "./market-time.js";

// Every date below comes from CALENDAR.md §7.1's named list, which was computed
// rather than recalled. The two DST transitions are 2026-03-08 and 2026-11-01.

describe("isMarketDate / toMarketDate", () => {
  it("accepts a real YYYY-MM-DD date", () => {
    expect(isMarketDate("2026-09-04")).toBe(true);
    expect(isMarketDate("2028-02-29")).toBe(true); // a real leap day
  });

  it("refuses the wrong shape", () => {
    for (const bad of ["2026-9-4", "04/09/2026", "2026-09-04T00:00:00Z", ""]) {
      expect(isMarketDate(bad)).toBe(false);
    }
  });

  // The half a pattern alone cannot do. The calendar table is hand-maintained,
  // so a typo producing an impossible date must fail where it is written rather
  // than resolve silently to 2 March.
  it("refuses a date that matches the pattern and does not exist", () => {
    expect(isMarketDate("2026-02-30")).toBe(false);
    expect(isMarketDate("2026-13-01")).toBe(false);
    expect(isMarketDate("2026-02-29")).toBe(false); // 2026 is not a leap year
  });

  it("throws rather than returning a sentinel", () => {
    expect(() => toMarketDate("2026-02-30")).toThrow(TypeError);
  });
});

describe("toMarketTimeOfDay", () => {
  it("parses the calendar table's HH:MM form", () => {
    expect(toMarketTimeOfDay("13:00")).toStrictEqual({
      hour: 13,
      minute: 0,
      second: 0,
    });
  });

  it("parses HH:MM:SS", () => {
    expect(toMarketTimeOfDay("09:30:15")).toStrictEqual({
      hour: 9,
      minute: 30,
      second: 15,
    });
  });

  // 24:00 is a real ISO 8601 spelling of midnight and is the one value that
  // could name one instant two ways, which is exactly what this module exists
  // to prevent. It is also what `hourCycle: "h24"` would have produced.
  it("refuses hour 24", () => {
    expect(() => toMarketTimeOfDay("24:00")).toThrow(RangeError);
  });

  it("refuses nonsense", () => {
    for (const bad of ["9:30", "0930", "13:60", ""]) {
      expect(() => toMarketTimeOfDay(bad)).toThrow();
    }
  });
});

describe("marketWallClockAt", () => {
  // The control: a summer regular-session open. 13:30Z is 09:30 ET at -04:00.
  it("reads an ordinary summer instant as market wall time", () => {
    const clock = marketWallClockAt(new Date("2026-09-04T13:30:00Z"));

    expect(clock.date).toBe("2026-09-04");
    expect(clock.hour).toBe(9);
    expect(clock.minute).toBe(30);
    expect(clock.second).toBe(0);
    expect(clock.offset.minutes).toBe(-240);
    expect(clock.offset.abbreviation).toBe("EDT");
    expect(clock.offset.iso).toBe("-04:00");
  });

  // The same session open in winter is a different UTC instant, which is the
  // whole reason a chart axis cannot be drawn from UTC alone.
  it("reads an ordinary winter instant as market wall time", () => {
    const clock = marketWallClockAt(new Date("2026-12-04T14:30:00Z"));

    expect(clock.hour).toBe(9);
    expect(clock.minute).toBe(30);
    expect(clock.offset.minutes).toBe(-300);
    expect(clock.offset.abbreviation).toBe("EST");
    expect(clock.offset.iso).toBe("-05:00");
  });

  // The `hourCycle: "h24"` trap, asserted rather than commented: under "h24"
  // this reads 24, an hour outside 0-23 that every Number() accepts.
  it("reports ET midnight as hour 0 and never as hour 24", () => {
    const clock = marketWallClockAt(new Date("2026-09-04T04:00:00Z"));

    expect(clock.hour).toBe(0);
    expect(clock.date).toBe("2026-09-04");
  });

  it("does not lose sub-minute precision or let milliseconds skew the offset", () => {
    const clock = marketWallClockAt(new Date("2026-09-04T13:30:45.678Z"));

    expect(clock.second).toBe(45);
    expect(clock.offset.minutes).toBe(-240);
  });
});

describe("marketDateAt", () => {
  // The assertion this module exists for. Both instants below are the same UTC
  // date and different market dates, and `toISOString().slice(0, 10)` — the
  // obvious wrong implementation — gets the second one wrong by a whole day.
  it("is the market's date, not the UTC date", () => {
    expect(marketDateAt(new Date("2026-09-04T13:30:00Z"))).toBe("2026-09-04");
    expect(marketDateAt(new Date("2026-09-04T03:59:59Z"))).toBe("2026-09-03");
  });

  it("rolls over at market midnight rather than at UTC midnight", () => {
    // 04:00Z is exactly ET midnight in summer.
    expect(marketDateAt(new Date("2026-09-04T03:59:59Z"))).toBe("2026-09-03");
    expect(marketDateAt(new Date("2026-09-04T04:00:00Z"))).toBe("2026-09-04");
  });
});

describe("instantFromMarketTime", () => {
  it("round-trips an ordinary summer session open", () => {
    const instant = instantFromMarketTime(
      toMarketDate("2026-09-04"),
      toMarketTimeOfDay("09:30"),
    );

    expect(instant.toISOString()).toBe("2026-09-04T13:30:00.000Z");
  });

  it("round-trips an ordinary winter session open at the other offset", () => {
    const instant = instantFromMarketTime(
      toMarketDate("2026-12-04"),
      toMarketTimeOfDay("09:30"),
    );

    expect(instant.toISOString()).toBe("2026-12-04T14:30:00.000Z");
  });

  // CALENDAR.md §7.1 cases 9 and 10, in the direction this task owns. The
  // sessions themselves are Task 2.5.4's; what is asserted here is that the
  // same wall-clock time maps to UTC instants an hour apart either side of a
  // transition, which is what fails if anything did arithmetic on an instant.
  it("maps the same wall time to different instants either side of the spring transition", () => {
    const friday = instantFromMarketTime(
      toMarketDate("2026-03-06"),
      toMarketTimeOfDay("09:30"),
    );
    const monday = instantFromMarketTime(
      toMarketDate("2026-03-09"),
      toMarketTimeOfDay("09:30"),
    );

    expect(friday.toISOString()).toBe("2026-03-06T14:30:00.000Z");
    expect(monday.toISOString()).toBe("2026-03-09T13:30:00.000Z");
  });

  it("maps the same wall time to different instants either side of the autumn transition", () => {
    const friday = instantFromMarketTime(
      toMarketDate("2026-10-30"),
      toMarketTimeOfDay("09:30"),
    );
    const monday = instantFromMarketTime(
      toMarketDate("2026-11-02"),
      toMarketTimeOfDay("09:30"),
    );

    expect(friday.toISOString()).toBe("2026-10-30T13:30:00.000Z");
    expect(monday.toISOString()).toBe("2026-11-02T14:30:00.000Z");
  });

  // CALENDAR.md §7.1 case 11, and the one most likely to be left out: the day
  // *after* a transition is where an implementation that special-cased the
  // transition weekend and got the new offset wrong finally shows up.
  it("is correct on the day after each transition, at the new offset", () => {
    expect(
      instantFromMarketTime(
        toMarketDate("2026-03-10"),
        toMarketTimeOfDay("09:30"),
      ).toISOString(),
    ).toBe("2026-03-10T13:30:00.000Z");

    expect(
      instantFromMarketTime(
        toMarketDate("2026-11-03"),
        toMarketTimeOfDay("09:30"),
      ).toISOString(),
    ).toBe("2026-11-03T14:30:00.000Z");
  });

  // CALENDAR.md §7.1 case 12. Without the refusal this returns
  // 2026-03-08T06:30:00Z, which reads back as 01:30 — a different time from the
  // one asked for, with no error.
  describe("the spring-forward gap", () => {
    it("refuses a wall-clock time that does not exist", () => {
      expect(() =>
        instantFromMarketTime(
          toMarketDate("2026-03-08"),
          toMarketTimeOfDay("02:30"),
        ),
      ).toThrow(MarketTimeError);
    });

    // The reason rather than the message, so the contract is the discriminator
    // and not the prose.
    it("says which case it was", () => {
      try {
        instantFromMarketTime(
          toMarketDate("2026-03-08"),
          toMarketTimeOfDay("02:30"),
        );
        expect.fail("expected a refusal");
      } catch (error) {
        if (!(error instanceof MarketTimeError)) throw error;
        expect(error.reason).toBe("nonexistent");
      }
    });

    it("still resolves the times either side of the gap on the same day", () => {
      expect(
        instantFromMarketTime(
          toMarketDate("2026-03-08"),
          toMarketTimeOfDay("01:30"),
        ).toISOString(),
      ).toBe("2026-03-08T06:30:00.000Z");

      expect(
        instantFromMarketTime(
          toMarketDate("2026-03-08"),
          toMarketTimeOfDay("03:30"),
        ).toISOString(),
      ).toBe("2026-03-08T07:30:00.000Z");
    });
  });

  // CALENDAR.md §7.1 case 13. Without the refusal this silently returns the
  // first of the two, an hour before the one the caller may have meant.
  describe("the autumn fold", () => {
    it("refuses a wall-clock time that happens twice", () => {
      expect(() =>
        instantFromMarketTime(
          toMarketDate("2026-11-01"),
          toMarketTimeOfDay("01:30"),
        ),
      ).toThrow(MarketTimeError);
    });

    it("says which case it was", () => {
      try {
        instantFromMarketTime(
          toMarketDate("2026-11-01"),
          toMarketTimeOfDay("01:30"),
        );
        expect.fail("expected a refusal");
      } catch (error) {
        if (!(error instanceof MarketTimeError)) throw error;
        expect(error.reason).toBe("ambiguous");
      }
    });

    // Proof the ambiguity is real rather than an implementation quirk: two
    // distinct instants an hour apart read back as the identical wall clock.
    it("is refused because both instants genuinely read back the same", () => {
      const earlier = marketWallClockAt(new Date("2026-11-01T05:30:00Z"));
      const later = marketWallClockAt(new Date("2026-11-01T06:30:00Z"));

      expect(earlier.hour).toBe(1);
      expect(earlier.minute).toBe(30);
      expect(later.hour).toBe(1);
      expect(later.minute).toBe(30);
      expect(earlier.offset.iso).toBe("-04:00");
      expect(later.offset.iso).toBe("-05:00");
    });

    it("still resolves the unambiguous times either side of the fold", () => {
      expect(
        instantFromMarketTime(
          toMarketDate("2026-11-01"),
          toMarketTimeOfDay("00:30"),
        ).toISOString(),
      ).toBe("2026-11-01T04:30:00.000Z");

      expect(
        instantFromMarketTime(
          toMarketDate("2026-11-01"),
          toMarketTimeOfDay("02:30"),
        ).toISOString(),
      ).toBe("2026-11-01T07:30:00.000Z");
    });
  });

  // The property that makes the pair trustworthy across every ordinary day,
  // rather than only on the days somebody thought to name.
  it("round-trips through marketWallClockAt on every session open in the covered range", () => {
    for (let year = 2024; year <= 2028; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        for (const day of [1, 15, 28]) {
          const date = toMarketDate(
            `${String(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          );
          const instant = instantFromMarketTime(date, {
            hour: 9,
            minute: 30,
            second: 0,
          });
          const readBack = marketWallClockAt(instant);

          expect(readBack.date).toBe(date);
          expect(readBack.hour).toBe(9);
          expect(readBack.minute).toBe(30);
        }
      }
    }
  });
});

describe("marketOffsetAt", () => {
  // The transition instants themselves, to the minute. 07:00Z on 2026-03-08 is
  // when 02:00 EST would have been; 06:00Z on 2026-11-01 is when 02:00 EDT was.
  it("changes at the exact transition instant in spring", () => {
    expect(marketOffsetAt(new Date("2026-03-08T06:59:59Z")).minutes).toBe(-300);
    expect(marketOffsetAt(new Date("2026-03-08T07:00:00Z")).minutes).toBe(-240);
  });

  it("changes at the exact transition instant in autumn", () => {
    expect(marketOffsetAt(new Date("2026-11-01T05:59:59Z")).minutes).toBe(-240);
    expect(marketOffsetAt(new Date("2026-11-01T06:00:00Z")).minutes).toBe(-300);
  });

  it("formats the offset in one shape rather than passing Intl's through", () => {
    // Intl's own answers here are `GMT-04:00` (longOffset), `GMT-4`
    // (shortOffset) and `EDT` (short). None of them is `-04:00`, so the module
    // normalises to its own representation.
    expect(marketOffsetAt(new Date("2026-09-04T13:30:00Z")).iso).toBe("-04:00");
    expect(marketOffsetAt(new Date("2026-12-04T14:30:00Z")).iso).toBe("-05:00");
  });
});

// Acceptance criterion 2 — "nothing outside this module converts between UTC
// and market time" — is NOT asserted here, and where it *is* asserted is worth
// writing down rather than leaving somebody to search for.
//
// It is held by two `no-restricted-syntax` rules in `eslint.config.mjs`, with
// `market-time.ts` as the single exception: one forbids constructing an
// `Intl.DateTimeFormat` anywhere else, and one forbids spelling the market's
// timezone identifier anywhere else. Both were made to fail — in
// `apps/frontend` and in `packages/shared` — before being believed.
//
// It is a lint rule rather than a test in this file because the check has to
// see the whole workspace, and greping the tree needs `@types/node`, which
// `packages/shared` deliberately does not have: this package is inlined into
// the frontend bundle, and giving it Node types to hold a lint-shaped rule
// would breach one boundary to enforce another. `eslint.config.mjs` carries the
// full argument, including what the rule cannot see — a conversion written with
// a hard-coded `-5` and no timezone name at all.
