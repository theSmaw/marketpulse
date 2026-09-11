import type { Bar } from "@marketpulse/shared";
import { toMarketDate, toTimeRange } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import type { PopulatedBarSeries } from "./bar-series-view.js";
import { barSeriesFixtureView } from "../fixtures/bar-series.js";
import {
  formatSessionDate,
  formatSessionTime,
  placeBars,
  positionOfInstant,
  seamSlots,
  timeAxis,
  timeTicks,
} from "./chart-time-axis.js";

// The axis, against the two recorded series that actually cross a market gap
// (Task 2.12.3).
//
// **The `stitched` fixture is the one that matters here**, and it was not
// recorded for this task: it spans 2026-09-04 15:00 ET to 2026-09-08 11:00 ET,
// which contains a weekend *and* Labor Day. So a weekend, a holiday the calendar
// knows about, and a seam are one fixture rather than three hand-built windows —
// which is the difference between testing the calendar and testing a copy of it.

/** A window, without going near a clock. */
function window_(start: string, end: string) {
  return toTimeRange(new Date(start), new Date(end));
}

function series(name: "full" | "partial" | "stitched"): PopulatedBarSeries {
  const view = barSeriesFixtureView(name);
  if (view.state !== "loaded" && view.state !== "partial") {
    throw new Error(`the ${name} fixture is not an answer with bars in it`);
  }
  return view.series;
}

const ALL_LABELS = { sessionLabels: "all", intraday: true } as const;

describe("timeAxis", () => {
  it("gives one session's window one slot per trading minute", () => {
    const axis = timeAxis(series("full").coverage.requested, "1m");

    expect(axis.sessions).toHaveLength(1);
    expect(axis.slots).toBe(30);
    expect(axis.sessions[0]?.date).toBe(toMarketDate("2026-09-04"));
  });

  it("skips a weekend and a holiday without leaving a gap", () => {
    // Friday 15:00–16:00 ET is 60 minutes; Tuesday 09:30–11:00 ET is 90. In
    // between are Saturday, Sunday and Labor Day, and the axis has **no slots
    // for any of them** — which is `CHARTING.md` §3's whole decision: a
    // continuous time axis over this window would be mostly empty.
    const axis = timeAxis(series("stitched").coverage.requested, "1m");

    expect(axis.sessions.map((session) => session.date)).toEqual([
      "2026-09-04",
      "2026-09-08",
    ]);
    expect(axis.sessions.map((session) => session.slots)).toEqual([60, 90]);
    expect(axis.slots).toBe(150);
  });

  it("takes Labor Day from the calendar rather than from the data", () => {
    // A window that is *only* the holiday and the weekend around it has no
    // trading minute in it at all, which is the answer the calendar gives and
    // the data could not.
    expect(() =>
      timeAxis(window_("2026-09-05T04:00:00Z", "2026-09-08T04:00:00Z"), "1m"),
    ).toThrow(RangeError);
  });

  it("clips the sessions to the window rather than the window to the sessions", () => {
    const axis = timeAxis(
      window_("2026-09-04T19:00:00Z", "2026-09-04T19:30:00Z"),
      "1m",
    );

    expect(axis.slots).toBe(30);
    expect(axis.sessions[0]?.open.toISOString()).toBe(
      "2026-09-04T19:00:00.000Z",
    );
  });

  it("snaps a window that starts mid-minute back to the minute it is inside", () => {
    // Rounding the other way would push every bar in the session one slot left,
    // which is a chart that is plausible and shifted rather than an error.
    const axis = timeAxis(
      window_("2026-09-04T19:00:30Z", "2026-09-04T19:30:00Z"),
      "1m",
    );

    expect(axis.sessions[0]?.open.toISOString()).toBe(
      "2026-09-04T19:00:00.000Z",
    );
    expect(axis.slots).toBe(30);
  });

  it("comes from the requested window and not from the bars", () => {
    // `CHARTING.md` §6.2, and the line of code Task 2.12.4 is told to get right
    // before Task 2.12.7 draws a state. The `partial` fixture holds 60 bars over
    // a window reaching into Saturday — and because Saturday has no trading
    // minutes, the axis is exactly the hour that *was* trading time.
    //
    // That is the ordinal axis being more honest than a continuous one would
    // be, not the rule being broken: a shortfall made of non-trading time is
    // not a shortfall a chart should draw space for. A shortfall containing
    // trading minutes does leave space, which the next test shows.
    const partial = series("partial");
    const axis = timeAxis(partial.coverage.requested, "1m");

    expect(axis.slots).toBe(60);
    expect(partial.bars).toHaveLength(60);
  });

  it("leaves the bars short of the axis when the shortfall is trading time", () => {
    // The same 60 recorded bars, against a window asking for the whole of
    // Friday's session. The bars now fill 60 of 390 slots, and the difference is
    // the visible space at the right-hand edge that Task 2.12.7 draws.
    const axis = timeAxis(
      window_("2026-09-04T13:30:00Z", "2026-09-04T20:00:00Z"),
      "1m",
    );

    expect(axis.slots).toBe(390);
    expect(placeBars(axis, series("partial").bars)).toHaveLength(60);
  });

  it("gives a half day the slots it actually traded", () => {
    // Black Friday 2026 closes at 13:00 ET. 210 minutes, not 390 — the calendar
    // knows and the data would only have shown it as missing bars.
    const axis = timeAxis(
      window_("2026-11-27T14:30:00Z", "2026-11-27T21:00:00Z"),
      "1m",
    );

    expect(axis.slots).toBe(210);
  });

  it("gives a daily series one slot per session", () => {
    const axis = timeAxis(
      window_("2026-09-04T13:30:00Z", "2026-09-08T20:00:00Z"),
      "1d",
    );

    expect(axis.slots).toBe(2);
    expect(axis.sessions.map((session) => session.slots)).toEqual([1, 1]);
  });
});

describe("seamSlots", () => {
  it("marks where one session becomes the next, and not the left edge", () => {
    // Every session after the first: the first session's start is the frame's
    // own left edge, and a rule drawn on it is a left spine.
    const axis = timeAxis(series("stitched").coverage.requested, "1m");
    expect(seamSlots(axis)).toEqual([60]);
  });

  it("draws none on a daily axis", () => {
    // Every slot is already a whole session there, so a rule between each pair
    // would be a rule between every bar.
    const axis = timeAxis(
      window_("2026-09-04T13:30:00Z", "2026-09-08T20:00:00Z"),
      "1d",
    );
    expect(seamSlots(axis)).toEqual([]);
  });
});

describe("positionOfInstant", () => {
  const axis = timeAxis(series("stitched").coverage.requested, "1m");

  it("positions an instant inside a session proportionally", () => {
    // §3's rule 1. The whole part is the slot; the fraction is how far through
    // its interval the instant sits.
    const position = positionOfInstant(
      axis,
      new Date("2026-09-04T19:00:30.000Z"),
    );

    expect(position).toEqual({ kind: "inside", slot: 0.5 });
  });

  it("puts an instant in the weekend on the seam", () => {
    // §3's rule 2, and the case Epic 9 inherits: 8-K filings are routinely made
    // after the close, so *most* filing markers land in a gap this axis does not
    // draw. The mark goes on the boundary — and the rule attaches a duty, which
    // is that the label must carry the instant's true timestamp, because the
    // axis is now lying about when.
    for (const instant of [
      "2026-09-04T20:30:00Z", // Friday, after the close
      "2026-09-06T12:00:00Z", // Sunday
      "2026-09-07T15:00:00Z", // Labor Day, during what would be the session
      "2026-09-08T13:00:00Z", // Tuesday, before the open
    ]) {
      expect(positionOfInstant(axis, new Date(instant))).toEqual({
        kind: "boundary",
        slot: 60,
      });
    }
  });

  it("puts an instant before the window's first session on the left edge", () => {
    const position = positionOfInstant(
      axis,
      new Date("2026-09-04T18:00:00.000Z"),
    );
    expect(position).toEqual({ kind: "boundary", slot: 0 });
  });

  it("puts an instant after the window's last session past the right edge", () => {
    const position = positionOfInstant(
      axis,
      new Date("2026-09-08T19:00:00.000Z"),
    );
    expect(position).toEqual({ kind: "boundary", slot: axis.slots });
  });
});

describe("placeBars", () => {
  it("puts every stored bar on a slot, across a weekend and a holiday", () => {
    // The strongest single assertion in this file: 150 real bars, two sessions,
    // and no slot used twice or skipped. If the calendar arithmetic were wrong
    // anywhere, this is where it would show as a gap or a collision.
    const axis = timeAxis(series("stitched").coverage.requested, "1m");
    const placed = placeBars(axis, series("stitched").bars);

    expect(placed).toHaveLength(150);
    expect(placed.map((point) => point.slot)).toEqual(
      Array.from({ length: 150 }, (_unused, index) => index),
    );
  });

  it("puts Monday's first bar immediately after Friday's last", () => {
    // There is no gap between them, which is the decision stated as a fact
    // about two adjacent slots three calendar days apart.
    const axis = timeAxis(series("stitched").coverage.requested, "1m");
    const placed = placeBars(axis, series("stitched").bars);

    expect(placed[59]?.bar.startsAt.toISOString()).toBe(
      "2026-09-04T19:59:00.000Z",
    );
    expect(placed[60]?.bar.startsAt.toISOString()).toBe(
      "2026-09-08T13:30:00.000Z",
    );
  });

  it("drops a bar the window has no slot for rather than drawing it at zero", () => {
    // Reachable: the live tail is stitched onto stored history and could reach
    // past the window's end. An instant with no position would otherwise land at
    // slot 0, putting a stray point at the left edge of a correct chart.
    const axis = timeAxis(series("full").coverage.requested, "1m");
    const stray: Bar = {
      startsAt: new Date("2026-09-08T14:00:00.000Z"),
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    };

    expect(placeBars(axis, [...series("full").bars, stray])).toHaveLength(30);
  });
});

describe("timeTicks", () => {
  it("dates the seam and times everything between it", () => {
    // `CHARTING.md` §7.1's answer 9, which is the whole of what the reader is
    // told about the night the axis did not draw.
    const axis = timeAxis(series("stitched").coverage.requested, "1m");
    const ticks = timeTicks(axis, ALL_LABELS);

    expect(ticks.filter((tick) => tick.kind === "session")).toEqual([
      { kind: "session", slot: 0, date: "2026-09-04", label: "Sep 4" },
      { kind: "session", slot: 60, date: "2026-09-08", label: "Sep 8" },
    ]);
  });

  it("labels the hours when one session is on screen", () => {
    // "Which ticks a person would have chosen": reading a single session, an
    // analyst writes down the hours.
    const axis = timeAxis(
      window_("2026-09-04T13:30:00Z", "2026-09-04T20:00:00Z"),
      "1m",
    );

    expect(
      timeTicks(axis, ALL_LABELS)
        .filter((tick) => tick.kind === "time")
        .map((tick) => tick.label),
    ).toEqual(["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]);
  });

  it("labels midday once per session when a few are on screen", () => {
    const axis = timeAxis(
      window_("2026-09-08T13:30:00Z", "2026-09-10T20:00:00Z"),
      "1m",
    );
    const times = timeTicks(axis, ALL_LABELS).filter(
      (tick) => tick.kind === "time",
    );

    expect(times.map((tick) => tick.label)).toEqual([
      "12:00",
      "12:00",
      "12:00",
    ]);
  });

  it("writes no time at all when there is no room for one", () => {
    // The density table's second breakpoint: the times go first, because a date
    // is worth more than a time — it is the thing the ordinal axis took away.
    // The same window that carries three middays above carries none here.
    const axis = timeAxis(
      window_("2026-09-08T13:30:00Z", "2026-09-10T20:00:00Z"),
      "1m",
    );
    const ticks = timeTicks(axis, { sessionLabels: "all", intraday: false });

    expect(timeTicks(axis, ALL_LABELS).length).toBeGreaterThan(ticks.length);
    expect(ticks.every((tick) => tick.kind === "session")).toBe(true);
  });

  it("reduces to the first and last date when the region is narrow", () => {
    const axis = timeAxis(
      window_("2026-09-08T13:30:00Z", "2026-09-11T20:00:00Z"),
      "1m",
    );
    const ticks = timeTicks(axis, {
      sessionLabels: "ends",
      intraday: false,
    });

    expect(ticks.map((tick) => tick.label)).toEqual(["Sep 8", "Sep 11"]);
  });

  it("thins a long run of dates rather than writing a texture", () => {
    // A month of daily bars is 21 sessions, which Story 2.13's window control is
    // what brings. Eight labels, and the last session always keeps its date.
    const axis = timeAxis(
      window_("2026-09-08T13:30:00Z", "2026-10-09T20:00:00Z"),
      "1d",
    );
    const ticks = timeTicks(axis, { sessionLabels: "all", intraday: false });

    expect(axis.slots).toBeGreaterThan(20);
    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks[ticks.length - 1]?.slot).toBe(axis.slots - 1);
  });

  it("returns its ticks in axis order", () => {
    // Dates and times are chosen separately and drawn as one row, so the order
    // is this function's promise rather than the caller's problem.
    const axis = timeAxis(
      window_("2026-09-08T13:30:00Z", "2026-09-10T20:00:00Z"),
      "1m",
    );
    const slots = timeTicks(axis, ALL_LABELS).map((tick) => tick.slot);

    expect(slots).toEqual([...slots].sort((left, right) => left - right));
  });

  it("puts no time on a session that does not contain one", () => {
    // A window clipped to the last hour of a session contains no midday, and a
    // tick pinned to an edge would be a label claiming an hour that is not on
    // screen.
    const axis = timeAxis(series("stitched").coverage.requested, "1m");
    const ticks = timeTicks(axis, ALL_LABELS);

    // Friday's hour is 15:00–16:00 ET; Tuesday's is 09:30–11:00. Neither
    // contains 12:00, and Friday's contains no whole hour after its own start.
    expect(ticks.filter((tick) => tick.kind === "time")).toEqual([]);
  });
});

describe("formatSessionDate and formatSessionTime", () => {
  it("writes a date an axis has room for", () => {
    expect(formatSessionDate(toMarketDate("2026-09-04"))).toBe("Sep 4");
    expect(formatSessionDate(toMarketDate("2026-11-27"))).toBe("Nov 27");
    expect(formatSessionDate(toMarketDate("2026-01-02"))).toBe("Jan 2");
  });

  it("writes a time in market time, not the reader's", () => {
    // 13:30Z is the 09:30 bar. A browser in Singapore and a browser in New York
    // render the same axis because neither of them has an opinion.
    expect(formatSessionTime(new Date("2026-09-04T13:30:00.000Z"))).toBe(
      "09:30",
    );
    // The same wall-clock hour six weeks later is a different UTC instant, and
    // this module knows that only because `market-time.ts` does.
    expect(formatSessionTime(new Date("2026-12-04T14:30:00.000Z"))).toBe(
      "09:30",
    );
  });
});
