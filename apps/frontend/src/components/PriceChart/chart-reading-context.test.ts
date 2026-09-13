import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { placeBars, timeAxis } from "../../market/index.js";
import type { ChartPoint } from "./chart-geometry.js";
import type { ChartRead } from "./chart-reading-context.js";
import { NO_READING, resolveRead } from "./chart-reading-context.js";
import { chartSubject } from "./chart-subject.js";

// **A reading, across a window change** (Task 2.13.7).
//
// The decision `VOLUME-AND-WINDOW.md` §27 and this task's own amendment left
// open, held at the only level that can see it: the read position is an index,
// a window change rebuilds both `readings` arrays, and the built default is a
// reading of a **different bar, silently and plausibly**. Every case below is
// over recorded bodies, and two of them are the two `1d` bodies — because the
// crossing from minute bars to daily ones is where the default is worst and
// where a hand-written pair of arrays would prove nothing.
//
// What this file cannot see: that focus stays put and that the crosshair moves
// with it. Those are `ChartReading.test.tsx`'s.

/** The bars of one recorded body, placed on their own axis. */
function readings(name: Parameters<typeof barSeriesFixtureView>[0]) {
  const view: BarSeriesView = barSeriesFixtureView(name);
  const subject = chartSubject(view);
  if (subject === null) throw new Error(`${name} has no window to place.`);

  const axis = timeAxis(subject.requested, subject.timeframe);

  return placeBars(axis, subject.bars).map((placed): ChartPoint => ({
    ...placed,
    x: 0,
    y: 0,
  }));
}

/** A reading of one bar, as the overlays write it. */
function readingOf(points: readonly ChartPoint[], index: number): ChartRead {
  const at = points[index]?.bar.startsAt.getTime();
  if (at === undefined) throw new Error(`No bar at ${String(index)}.`);

  return { index, at, source: "keyboard" };
}

describe("resolveRead", () => {
  it("costs nothing when the index still addresses its own bar", () => {
    // The path that runs on every pointer move. It is asserted as an *answer*
    // rather than as a search that was skipped, because the property that
    // matters is that the fast path and the search agree.
    const points = readings("dense");

    expect(resolveRead(points, readingOf(points, 900))).toBe(900);
  });

  it("is no reading at all when there is none", () => {
    expect(resolveRead(readings("dense"), NO_READING)).toBeNull();
  });

  it("re-anchors to the same instant when the window grows", () => {
    // The case four of the five windows are in: the two windows overlap, so the
    // bar the reader was looking at is still in the picture. Clearing here
    // would answer a question nobody asked.
    const shorter = readings("full");
    const longer = readings("dense");

    const held = readingOf(shorter, 12);
    const landed = resolveRead(longer, held);

    expect(landed).not.toBeNull();
    expect(longer[landed ?? 0]?.bar.startsAt.getTime()).toBe(held.at);
  });

  it("lands on the session containing the minute when the timeframe changes", () => {
    // **The crossing the default is worst at.** Index 900 of five sessions of
    // minute bars and index 900 of sixty-three daily bars are not adjacent
    // facts; the second does not exist. What the reader gets instead is the
    // same day, at the granularity the new window has.
    const minutes = readings("dense");
    const sessions = readings("daily");

    const held = readingOf(minutes, 900);
    const landed = resolveRead(sessions, held);

    expect(landed).not.toBeNull();

    const to = sessions[landed ?? 0]?.bar.startsAt;
    const from = minutes[900]?.bar.startsAt;
    expect(to).toBeDefined();

    // Within half a day of the minute it came from, which is what "the session
    // containing it" means when a daily bar is stamped at midnight market time.
    const hours =
      Math.abs((to?.getTime() ?? 0) - (from?.getTime() ?? 0)) / 3.6e6;
    expect(hours).toBeLessThan(24);
  });

  it("clears rather than clamping when the instant is outside the new window", () => {
    // 1Y → 1D. Clamping would answer with the earliest bar of a single session,
    // which is a reading of a bar the reader never asked about, presented as
    // the one they were looking at. There is no honest answer, so there is no
    // answer.
    const year = readings("dailyYear");
    const oneWindow = readings("full");

    expect(resolveRead(oneWindow, readingOf(year, 3))).toBeNull();
  });

  it("clears when the new window holds no bars at all", () => {
    // `empty` is a real destination — 1D is reliably one — and a reading of a
    // window with nothing in it has nothing to re-anchor to.
    const points = readings("dense");

    expect(resolveRead(readings("empty"), readingOf(points, 10))).toBeNull();
  });

  it("agrees with itself on the bar nearest an instant between two bars", () => {
    // A `1d` window's bars are a day apart, so an instant from a `1m` window
    // almost never falls on one. The tie-break has to be the same on both sides
    // of a gap or the two plots' crosshairs could land one bar apart.
    const sessions = readings("daily");
    const first = sessions[10]?.bar.startsAt.getTime() ?? 0;
    const second = sessions[11]?.bar.startsAt.getTime() ?? 0;

    const justAfter: ChartRead = {
      index: 0,
      at: first + 1000,
      source: "pointer",
    };
    const justBefore: ChartRead = {
      index: 0,
      at: second - 1000,
      source: "pointer",
    };

    expect(resolveRead(sessions, justAfter)).toBe(10);
    expect(resolveRead(sessions, justBefore)).toBe(11);
  });
});
