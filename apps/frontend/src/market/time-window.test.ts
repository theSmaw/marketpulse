import { marketSessionsBetween, toMarketDate } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { barSeriesQuery } from "../bar-series-query.js";
import {
  DEFAULT_WINDOW_SESSIONS,
  MAX_MINUTE_SESSIONS,
  SESSIONS_PARAM,
  TIME_WINDOWS,
  describeSessionCount,
  seriesWindowFor,
  timeframeForSessions,
  windowForSessions,
  windowLabelFor,
  windowPhrase,
} from "./time-window.js";

/**
 * The server's published cap, from `MARKET-DATA-API.md` — **restated here as a
 * test figure and deliberately not as a constant in the module**.
 *
 * `MAX_SERIES_BARS` lives in `apps/backend/src/series-request.ts` and that is its
 * one home. A copy in shipped frontend code would be a second place for the
 * number to be wrong; a copy in a test is a check that the mapping still clears
 * whatever the server publishes. Re-measure by reading it there.
 */
const SERVER_CAP_BARS = 10_000;

describe("the five windows", () => {
  it("offers 1D, 5D, 1M, 3M, 1Y and no max", () => {
    expect(TIME_WINDOWS.map((window) => window.label)).toEqual([
      "1D",
      "5D",
      "1M",
      "3M",
      "1Y",
    ]);
    expect(TIME_WINDOWS.map((window) => window.sessions)).toEqual([
      1, 5, 21, 63, 252,
    ]);
  });

  it("spells every accessible name out, because a screen reader must not say one dee", () => {
    // §4d: the visible label abbreviates and the accessible name does not. A name
    // that merely repeated the label would pass a test asserting one exists.
    for (const window of TIME_WINDOWS) {
      expect(window.name).not.toBe(window.label);
      expect(window.name).toMatch(/^\d+ (day|days|month|months|year|years)$/);
    }
  });

  it("defaults to five sessions, which is a window the control offers", () => {
    expect(DEFAULT_WINDOW_SESSIONS).toBe(5);
    expect(windowForSessions(DEFAULT_WINDOW_SESSIONS)?.label).toBe("5D");
  });

  it("does not default to 1D, which is reliably empty until Epic 3", () => {
    // §1.3 decided 1D is offered and is never the default: the store is
    // backfilled nightly and there is no live tail, so today's session holds
    // nothing between the bell and that night's backfill.
    expect(DEFAULT_WINDOW_SESSIONS).not.toBe(1);
  });

  it("finds no window for a count the control does not offer, rather than the nearest", () => {
    // §4b: the address admits any count the server accepts, and the control shows
    // NO selection rather than snapping — snapping would answer a different
    // question from the one the address asked.
    expect(windowForSessions(7)).toBeUndefined();
    expect(windowForSessions(30)).toBeUndefined();
    expect(windowForSessions(22)).toBeUndefined();
  });
});

describe("the timeframe mapping", () => {
  it("draws every window it can from minute bars, and the rest from daily ones", () => {
    expect(TIME_WINDOWS.map((w) => timeframeForSessions(w.sessions))).toEqual([
      "1m",
      "1m",
      "1m",
      "1d",
      "1d",
    ]);
  });

  it("is exhaustive over a session count, not a lookup keyed on the five", () => {
    // An address may carry any count, and Epic 11's `setTimeWindow` will. A
    // mapping that only knew the five would have nothing to answer with here.
    expect(timeframeForSessions(7)).toBe("1m");
    expect(timeframeForSessions(30)).toBe("1d");
    expect(timeframeForSessions(1_000)).toBe("1d");
  });

  it("turns over to daily bars exactly at the stated boundary", () => {
    expect(timeframeForSessions(MAX_MINUTE_SESSIONS)).toBe("1m");
    expect(timeframeForSessions(MAX_MINUTE_SESSIONS + 1)).toBe("1d");
  });

  it("keeps every session count inside the calendar under the server's cap", () => {
    // **The property §2.1 is actually about**, asserted rather than restated: the
    // derivation is what makes the cap structurally unreachable through the named
    // window form, for any count from any source.
    //
    // Taken over the calendar's own sessions rather than over 390 × n, because
    // 390 is the figure the claim is built on and asserting it against itself
    // would prove nothing. A half day is 210 bars, so a window containing one is
    // smaller — the maximum below is therefore a real maximum over every window
    // of that width the calendar contains.
    const sessions = marketSessionsBetween(
      toMarketDate("2024-01-01"),
      toMarketDate("2028-12-31"),
    );

    let worstMinuteWindow = 0;
    for (let count = 1; count <= MAX_MINUTE_SESSIONS; count += 1) {
      for (let start = 0; start + count <= sessions.length; start += 1) {
        const bars = sessions
          .slice(start, start + count)
          .reduce((total, session) => total + session.minuteBars, 0);
        if (bars > worstMinuteWindow) worstMinuteWindow = bars;
      }
    }

    expect(timeframeForSessions(MAX_MINUTE_SESSIONS)).toBe("1m");
    expect(worstMinuteWindow).toBe(8_190);
    expect(worstMinuteWindow).toBeLessThanOrEqual(SERVER_CAP_BARS);

    // Above the boundary every window is one bar per session, and the whole
    // covered calendar is fewer sessions than the cap is bars — so no count
    // reachable inside the calendar can be refused for size.
    expect(sessions.length).toBeLessThanOrEqual(SERVER_CAP_BARS);
  });
});

describe("the window on the wire", () => {
  it("sends a count and no instants, so the browser's clock never resolves it", () => {
    expect(seriesWindowFor(21)).toEqual({ form: "named", sessions: 21 });
  });

  it("spells the parameter the way the request already does", () => {
    // One spelling of `sessions`, checked against the module that builds the
    // query rather than against a literal written twice.
    const query = barSeriesQuery({
      symbol: "NVDA",
      timeframe: timeframeForSessions(21),
      window: seriesWindowFor(21),
    });

    expect(new URLSearchParams(query).get(SESSIONS_PARAM)).toBe("21");
    expect(new URLSearchParams(query).get("timeframe")).toBe("1m");
  });
});

// --- Task 2.13.7: one spelling of a window, for three surfaces ---

describe("describeSessionCount", () => {
  it("spells a count the way the control's readout does", () => {
    expect(describeSessionCount(1)).toBe("1 session");
    expect(describeSessionCount(5)).toBe("5 sessions");
    expect(describeSessionCount(252)).toBe("252 sessions");
  });

  it("groups a count a reader would otherwise have to count digits in", () => {
    // Reachable from the address — `?sessions=1000` is the calendar refusal —
    // and the readout beside five empty cells is the only thing on screen
    // saying what was asked for.
    expect(describeSessionCount(1000)).toBe("1,000 sessions");
  });

  it("answers null for every number that is not a count of sessions", () => {
    // Each of these is a real value the address admits, and none of them is a
    // count. `null` rather than a sentence, so each surface says its own thing
    // about it — a shared fallback would be two surfaces sharing a sentence.
    for (const notACount of [0, -5, 3.5, Number.NaN, Infinity]) {
      expect(describeSessionCount(notACount), String(notACount)).toBeNull();
    }
  });
});

describe("windowPhrase", () => {
  it("names a window by its count, never by its label", () => {
    // `the 21-session window` and not `1M`: the count is the fact and the label
    // is the approximation, and the rail sits beside a readout already saying
    // the count.
    expect(windowPhrase(seriesWindowFor(21))).toBe("the 21-session window");
    expect(windowPhrase(seriesWindowFor(1))).toBe("the 1-session window");
  });

  it("keeps the noun singular in the compound, at every count", () => {
    // `the 252-session window`, not `the 252-sessions window`. The phrase is
    // built from the number rather than from `describeSessionCount`'s sentence
    // for exactly this reason: editing that string reads correctly at one and
    // wrongly everywhere else.
    expect(windowPhrase(seriesWindowFor(252))).toBe("the 252-session window");
    expect(windowPhrase(seriesWindowFor(1000))).toBe(
      "the 1,000-session window",
    );
  });

  it("invents no number for a window that cannot be named as a count", () => {
    expect(windowPhrase(seriesWindowFor(Number.NaN))).toBe(
      "the window asked for",
    );
    expect(
      windowPhrase({
        form: "absolute",
        start: "2026-09-03T13:30:00.000Z",
        end: "2026-09-08T17:00:00.000Z",
      }),
    ).toBe("the window asked for");
  });
});

// --- 2026-09-14: the window as a qualifier on a figure ---

describe("windowLabelFor", () => {
  it("gives an offered window the label the control shows", () => {
    // The same two characters the pressed cell is showing a few centimetres
    // away, which is the argument for using the label here rather than the
    // count: a strip reading `5D OPEN` beside a control reading `5D` is one
    // vocabulary, and `5-SESSION OPEN` beside it would be two.
    expect(windowLabelFor(seriesWindowFor(5))).toBe("5D");
    expect(windowLabelFor(seriesWindowFor(21))).toBe("1M");
    expect(windowLabelFor(seriesWindowFor(252))).toBe("1Y");
  });

  it("falls back to the count for a window the control does not offer", () => {
    // `?sessions=7` is a window the address admits and the control renders as no
    // selection. It is the case where the bare word would be *least* guessable,
    // so it is the last case that may lose its qualifier.
    expect(windowLabelFor(seriesWindowFor(7))).toBe("7-session");
    expect(windowLabelFor(seriesWindowFor(1000))).toBe("1,000-session");
  });

  it("keeps the noun singular in the compound", () => {
    // `7-session`, never `7-sessions` — `windowPhrase`'s rule, one function away
    // and for the same reason.
    expect(windowLabelFor(seriesWindowFor(2))).toBe("2-session");
  });

  it("is null where there is nothing to qualify a figure with", () => {
    // The caller states the bare word, which is the honest answer when the
    // window has no name. Neither of these is reachable from this application's
    // own controls; both are reachable from an address and from a command.
    expect(windowLabelFor(seriesWindowFor(Number.NaN))).toBeNull();
    expect(windowLabelFor(seriesWindowFor(0))).toBeNull();
    expect(
      windowLabelFor({
        form: "absolute",
        start: "2026-09-03T13:30:00.000Z",
        end: "2026-09-08T17:00:00.000Z",
      }),
    ).toBeNull();
  });
});
