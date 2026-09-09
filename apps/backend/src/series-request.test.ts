// What a caller may ask for, at the level it is decided (Task 2.9.2).
//
// Every test here runs with no server, no database, no network and no frozen
// clock, because the subject is a pure function of a query and an instant. That
// is the whole reason it is a module rather than a block inside a route handler:
// the boundary where a request is refused is the one worth exercising
// exhaustively, and doing it through `app.inject()` would mean a fixture server
// per refusal.
//
// The instants below are real market instants and are written out rather than
// computed, so a test that goes red names a date somebody can look up. September
// 2026 is EDT (UTC-4), so a regular session runs 13:30Z to 20:00Z.

import { describe, expect, it } from "vitest";

import {
  MAX_SERIES_BARS,
  parseSeriesRequest,
  type SeriesRefusal,
  type SeriesRequest,
} from "./series-request.js";

/** A Friday, 14:00 ET, mid-session. */
const DURING_A_SESSION = new Date("2026-09-04T18:00:00Z");

function accepted(
  result: ReturnType<typeof parseSeriesRequest>,
): SeriesRequest {
  if ("refusal" in result) {
    throw new Error(`Expected acceptance, got: ${result.refusal.message}`);
  }
  return result.request;
}

function refused(result: ReturnType<typeof parseSeriesRequest>): SeriesRefusal {
  if ("request" in result) {
    throw new Error(
      `Expected refusal, got ${result.request.symbol} ` +
        `${result.request.range.start.toISOString()} → ${result.request.range.end.toISOString()}`,
    );
  }
  return result.refusal;
}

describe("parseSeriesRequest", () => {
  describe("the symbol", () => {
    it("accepts a well-formed ticker, share class and all", () => {
      const request = accepted(
        parseSeriesRequest(
          { symbol: "BRK.B", timeframe: "1d", sessions: "5" },
          DURING_A_SESSION,
        ),
      );
      expect(request.symbol).toBe("BRK.B");
    });

    it("refuses a missing symbol", () => {
      expect(
        refused(
          parseSeriesRequest(
            { timeframe: "1m", sessions: "1" },
            DURING_A_SESSION,
          ),
        ).reason,
      ).toBe("symbol");
    });

    it("refuses a malformed symbol", () => {
      const refusal = refused(
        parseSeriesRequest(
          { symbol: "nvda!", timeframe: "1m", sessions: "1" },
          DURING_A_SESSION,
        ),
      );
      expect(refusal.reason).toBe("symbol");
      expect(refusal.message).toContain("nvda!");
    });

    // `?symbol=NVDA&symbol=AMD` reaches a handler as an array, which is the
    // reason every field of the query type is `unknown` rather than a string.
    it("refuses a symbol given twice", () => {
      expect(
        refused(
          parseSeriesRequest(
            { symbol: ["NVDA", "AMD"], timeframe: "1m", sessions: "1" },
            DURING_A_SESSION,
          ),
        ).reason,
      ).toBe("symbol");
    });

    // The line `ticker.ts` draws and this module does not move: well-formed is
    // not the same as listed, and "we do not track that" is a 404 with a
    // database behind it (Task 2.9.6).
    it("does not decide whether a well-formed symbol is one we track", () => {
      const request = accepted(
        parseSeriesRequest(
          { symbol: "ZZZZZ", timeframe: "1m", sessions: "1" },
          DURING_A_SESSION,
        ),
      );
      expect(request.symbol).toBe("ZZZZZ");
    });
  });

  describe("the timeframe", () => {
    it("refuses a missing timeframe rather than defaulting to one", () => {
      expect(
        refused(
          parseSeriesRequest(
            { symbol: "NVDA", sessions: "1" },
            DURING_A_SESSION,
          ),
        ).reason,
      ).toBe("timeframe");
    });

    // Aggregation is not expressible: `5m` is a timeframe a caller would
    // plausibly try and the server never reduces a series (MARKET-DATA-API.md
    // §3), so it is refused rather than approximated.
    it("refuses a timeframe outside TIMEFRAMES", () => {
      const refusal = refused(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "5m", sessions: "1" },
          DURING_A_SESSION,
        ),
      );
      expect(refusal.reason).toBe("timeframe");
      expect(refusal.message).toContain("1m");
      expect(refusal.message).toContain("1d");
    });
  });

  describe("the window", () => {
    it("refuses a request naming both forms rather than preferring one", () => {
      const refusal = refused(
        parseSeriesRequest(
          {
            symbol: "NVDA",
            timeframe: "1m",
            sessions: "5",
            start: "2026-09-04T13:30:00Z",
            end: "2026-09-04T20:00:00Z",
          },
          DURING_A_SESSION,
        ),
      );
      expect(refusal.reason).toBe("window");
      expect(refusal.message).toContain("never both");
    });

    it("refuses a request with no window at all", () => {
      expect(
        refused(
          parseSeriesRequest(
            { symbol: "NVDA", timeframe: "1m" },
            DURING_A_SESSION,
          ),
        ).reason,
      ).toBe("window");
    });

    it("refuses one end of an absolute range without the other", () => {
      const refusal = refused(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", start: "2026-09-04T13:30:00Z" },
          DURING_A_SESSION,
        ),
      );
      expect(refusal.reason).toBe("window");
      expect(refusal.message).toContain("end is missing");
    });

    // Three malformed windows, three different sentences — the whole failure
    // mode is not knowing which of the two ends is wrong.
    it("tells a malformed instant, a reversed pair and a zero-width one apart", () => {
      const malformed = refused(
        parseSeriesRequest(
          {
            symbol: "NVDA",
            timeframe: "1m",
            start: "yesterday",
            end: "2026-09-04T20:00:00Z",
          },
          DURING_A_SESSION,
        ),
      );
      const reversed = refused(
        parseSeriesRequest(
          {
            symbol: "NVDA",
            timeframe: "1m",
            start: "2026-09-04T20:00:00Z",
            end: "2026-09-04T13:30:00Z",
          },
          DURING_A_SESSION,
        ),
      );
      const zeroWidth = refused(
        parseSeriesRequest(
          {
            symbol: "NVDA",
            timeframe: "1m",
            start: "2026-09-04T13:30:00Z",
            end: "2026-09-04T13:30:00Z",
          },
          DURING_A_SESSION,
        ),
      );

      expect([malformed.reason, reversed.reason, zeroWidth.reason]).toEqual([
        "window",
        "window",
        "window",
      ]);
      expect(malformed.message).toContain("UTC ISO 8601");
      expect(reversed.message).toContain("reversed");
      expect(zeroWidth.message).toContain("zero-width");
      expect(
        new Set([malformed.message, reversed.message, zeroWidth.message]).size,
      ).toBe(3);
    });

    // The failure this refusal exists for is invisible on a UTC server and
    // wrong by hours on a laptop: `new Date("2026-09-04T13:30:00")` is parsed
    // as local time.
    it("refuses an instant without the Z", () => {
      expect(
        refused(
          parseSeriesRequest(
            {
              symbol: "NVDA",
              timeframe: "1m",
              start: "2026-09-04T13:30:00",
              end: "2026-09-04T20:00:00Z",
            },
            DURING_A_SESSION,
          ),
        ).reason,
      ).toBe("window");
    });

    it("refuses a well-shaped instant that names no real moment", () => {
      const refusal = refused(
        parseSeriesRequest(
          {
            symbol: "NVDA",
            timeframe: "1m",
            // Not caught by the shape: `new Date` reads this as 2026-03-02.
            start: "2026-02-30T13:30:00Z",
            end: "2026-09-04T20:00:00Z",
          },
          DURING_A_SESSION,
        ),
      );
      expect(refusal.reason).toBe("window");
      expect(refusal.message).toContain("no moment");
    });

    it("refuses a session count that is not a whole number of sessions", () => {
      for (const sessions of ["2.5", "-1", "many", "0"]) {
        expect(
          refused(
            parseSeriesRequest(
              { symbol: "NVDA", timeframe: "1m", sessions },
              DURING_A_SESSION,
            ),
          ).reason,
        ).toBe("window");
      }
    });
  });

  describe("resolving a named window through the calendar", () => {
    it("resolves the last session to that session's own bounds", () => {
      const request = accepted(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", sessions: "1" },
          DURING_A_SESSION,
        ),
      );
      expect(request.range.start.toISOString()).toBe(
        "2026-09-04T13:30:00.000Z",
      );
      expect(request.range.end.toISOString()).toBe("2026-09-04T20:00:00.000Z");
    });

    // `lastMarketSessions` is oldest-first and nothing reverses it. A window
    // built from a reversed list would start at the newest session's open,
    // which `toTimeRange` would then refuse — so the assertion is that the
    // window opens on the OLDEST of the five.
    it("builds the window from the oldest session forward", () => {
      const request = accepted(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", sessions: "5" },
          DURING_A_SESSION,
        ),
      );
      // 2026-08-31 through 2026-09-04, a full week with no holiday in it.
      expect(request.range.start.toISOString()).toBe(
        "2026-08-31T13:30:00.000Z",
      );
      expect(request.range.end.toISOString()).toBe("2026-09-04T20:00:00.000Z");
    });

    // MARKET-DATA-API.md §2: the named form is sugar over the absolute one, and
    // the response reports the resolved absolute range so the two are the same
    // answer rather than two answers.
    it("resolves a named window to the identical range as the absolute one", () => {
      const named = accepted(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", sessions: "5" },
          DURING_A_SESSION,
        ),
      );
      const absolute = accepted(
        parseSeriesRequest(
          {
            symbol: "NVDA",
            timeframe: "1m",
            start: "2026-08-31T13:30:00Z",
            end: "2026-09-04T20:00:00Z",
          },
          DURING_A_SESSION,
        ),
      );
      expect(named.range).toEqual(absolute.range);
    });

    // Acceptance criterion 3's week, and the reason `lastMarketSessions` exists
    // at all: five *calendar* days back from Monday 2026-11-30 lands on the
    // wrong window entirely. Thanksgiving (11-26) is closed and 11-27 is a
    // 13:00 ET half day — EST by then, so 18:00Z rather than 21:00Z.
    it("counts sessions and not days across Thanksgiving week", () => {
      const request = accepted(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", sessions: "5" },
          new Date("2026-11-30T18:00:00Z"),
        ),
      );
      expect(request.range.start.toISOString()).toBe(
        "2026-11-23T14:30:00.000Z",
      );
      expect(request.range.end.toISOString()).toBe("2026-11-30T21:00:00.000Z");
    });

    // A daily bar is stamped at midnight ET, hours before the session opens, so
    // a daily window framed on the session bounds contains no daily bar at all
    // and returns a well-formed empty answer. `windowFor` is what knows that,
    // and this is the assertion that the named form goes through it.
    it("frames a daily window on midnight ET rather than on the session", () => {
      const request = accepted(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1d", sessions: "5" },
          DURING_A_SESSION,
        ),
      );
      expect(request.range.start.toISOString()).toBe(
        "2026-08-31T04:00:00.000Z",
      );
      // Midnight ET on the session after 2026-09-04 — the Monday, because
      // 2026-09-07 is Labor Day.
      expect(request.range.end.toISOString()).toBe("2026-09-08T04:00:00.000Z");
    });
  });

  describe("the calendar's range, which is a client error and not an internal one", () => {
    // The control: the same request one session inside the calendar and one
    // session outside it. 2024-01-02 is the first session of the covered range;
    // walking back a third from 2024-01-03 leaves it.
    const JUST_INSIDE = new Date("2024-01-03T15:00:00Z");

    it("resolves a named window that stays inside the covered range", () => {
      const request = accepted(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", sessions: "2" },
          JUST_INSIDE,
        ),
      );
      expect(request.range.start.toISOString()).toBe(
        "2024-01-02T14:30:00.000Z",
      );
    });

    it("refuses the same window one session further back, as a client error", () => {
      const refusal = refused(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", sessions: "3" },
          JUST_INSIDE,
        ),
      );
      expect(refusal.reason).toBe("calendar-range");
      expect(refusal.message).toContain("2024-01-01");
      expect(refusal.message).toContain("2028-12-31");
    });

    it("refuses an absolute window that reaches outside the covered range", () => {
      expect(
        refused(
          parseSeriesRequest(
            {
              symbol: "NVDA",
              timeframe: "1m",
              start: "2023-12-29T14:30:00Z",
              end: "2024-01-03T21:00:00Z",
            },
            DURING_A_SESSION,
          ),
        ).reason,
      ).toBe("calendar-range");
    });

    // The refusal is rewritten rather than passed through: the thrown message
    // names the source file to edit and the constant to extend, which is right
    // for a developer reading a stack and is internal detail on a wire.
    it("does not put the calendar's own instruction on the wire", () => {
      const refusal = refused(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", sessions: "3" },
          JUST_INSIDE,
        ),
      );
      expect(refusal.message).not.toContain("packages/shared");
      expect(refusal.message).not.toContain("MARKET_CALENDAR");
    });
  });

  describe("the cap", () => {
    // 27 sessions back from 2026-11-30 is 26 regular sessions and the 11-27
    // half day: 26 × 390 + 210 = 10,350. Twenty-six sessions is 9,960 and fits.
    // Verified against the calendar rather than assumed.
    // The half day is what the boundary turns on — 27 *regular* sessions would
    // be 10,530 and 26 would be 10,140, so both would be refused.
    const THANKSGIVING_MONDAY = new Date("2026-11-30T18:00:00Z");

    it("admits a window at the cap and refuses the next session", () => {
      expect(
        accepted(
          parseSeriesRequest(
            { symbol: "NVDA", timeframe: "1m", sessions: "26" },
            THANKSGIVING_MONDAY,
          ),
        ).range.start.toISOString(),
      ).toBe("2026-10-23T13:30:00.000Z");

      const refusal = refused(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", sessions: "27" },
          THANKSGIVING_MONDAY,
        ),
      );
      expect(refusal.reason).toBe("too-large");
      // 10,350 rather than 10,530: the half day is counted as 210 minutes.
      expect(refusal.message).toContain("10,350");
      expect(refusal.message).toContain("10,000");
    });

    it("tells the caller both ways to fit", () => {
      const refusal = refused(
        parseSeriesRequest(
          { symbol: "NVDA", timeframe: "1m", sessions: "260" },
          THANKSGIVING_MONDAY,
        ),
      );
      expect(refusal.message).toContain("narrower window");
      expect(refusal.message).toContain("1d");
    });

    // The same year that is refused at 1m is 251 bars at 1d — 0.26% of the
    // minute payload, and the honest answer to a long window.
    it("admits at 1d the window it refuses at 1m", () => {
      const year = {
        symbol: "NVDA",
        start: "2025-09-08T13:30:00Z",
        end: "2026-09-05T00:00:00Z",
      } as const;
      expect(
        refused(
          parseSeriesRequest({ ...year, timeframe: "1m" }, DURING_A_SESSION),
        ).reason,
      ).toBe("too-large");
      expect(
        accepted(
          parseSeriesRequest({ ...year, timeframe: "1d" }, DURING_A_SESSION),
        ).timeframe,
      ).toBe("1d");
    });

    // Counted in bar starts inside a half-open window, not by dividing a
    // duration: a window ending at 13:40Z admits the bar at 13:39 and not the
    // one at 13:40.
    it("counts only the session minutes the window actually contains", () => {
      const request = accepted(
        parseSeriesRequest(
          {
            symbol: "NVDA",
            timeframe: "1m",
            // Opens before the session and closes after it, so only the
            // session's own 390 minutes count — a whole calendar day would be
            // 1,440 and a week of them would exceed the cap.
            start: "2026-08-24T00:00:00Z",
            end: "2026-09-05T00:00:00Z",
          },
          DURING_A_SESSION,
        ),
      );
      expect(request.range.start.toISOString()).toBe(
        "2026-08-24T00:00:00.000Z",
      );
    });

    it("states the cap in bars", () => {
      expect(MAX_SERIES_BARS).toBe(10_000);
    });
  });
});
