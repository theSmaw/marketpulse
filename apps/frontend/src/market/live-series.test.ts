import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../fixtures/bar-series.js";
import type { PopulatedBarSeries } from "./bar-series-view.js";
import { withLiveBars } from "./live-series.js";

import type { Bar } from "@marketpulse/shared";

// **The rule that keeps a growing chart from throwing** (Task 3.9.2).
//
// Over a **recorded** body collapsed through the real transition, because the
// thing under test is what happens when a socket's bar meets a server's answer
// and a hand-built series could hold a shape no answer produces.
//
// What this file cannot see, and two other levels do: that the line is actually
// longer in a browser (`e2e/specs/security-live-edge.spec.ts`) and that the
// page hands the hook the right observation (`use-bar-series.test.ts`).

/**
 * The `partial` fixture — an answer with room left in its window.
 *
 * **Not `full`**, and the first draft of this file learned why: `full` covers
 * *exactly* the window that was asked for, so its last bar sits at
 * `requested.end − 1 interval` and there is nowhere for a live bar to go. That
 * is the window rule working and it gets a test of its own below rather than a
 * helper that quietly routes around it.
 */
function served(): PopulatedBarSeries {
  const view = barSeriesFixtureView("partial");
  if (view.state !== "partial") throw new Error(`fixture is ${view.state}`);
  return view.series;
}

/** A bar one interval after the series' last, inside the requested window. */
function nextMinute(series: PopulatedBarSeries, close = 101): Bar {
  const last = series.bars[series.bars.length - 1];
  if (last === undefined) throw new Error("fixture has no bars");
  return {
    startsAt: new Date(last.startsAt.getTime() + 60_000),
    open: close,
    high: close,
    low: close,
    close,
    volume: 1_000,
  };
}

/** The same minute as the series' last bar, with different numbers. */
function correctionOfLast(series: PopulatedBarSeries, close = 99): Bar {
  const last = series.bars[series.bars.length - 1];
  if (last === undefined) throw new Error("fixture has no bars");
  return { ...last, close, volume: last.volume + 500 };
}

describe("folding the live edge into a served series", () => {
  it("returns the same object when there is nothing to add", () => {
    const series = served();
    expect(withLiveBars(series, [])).toBe(series);
  });

  it("appends a new minute and counts it against the stretch it came from", () => {
    const series = served();
    const grown = withLiveBars(series, [nextMinute(series)]);

    expect(grown.bars.length).toBe(series.bars.length + 1);
    // The counts are what make getting this wrong loud: `toBarSeries` asserts
    // they sum to the bars, so a bar added without a source throws.
    const counted = grown.provenance.sources.reduce(
      (total, source) => total + source.barCount,
      0,
    );
    expect(counted).toBe(grown.bars.length);
    expect(grown.provenance.sources.length).toBe(
      series.provenance.sources.length,
    );
  });

  it("REPLACES a corrected minute rather than appending it — the 500 this rule exists to prevent", () => {
    const series = served();
    const correction = correctionOfLast(series);

    // The shape that throws if this ever becomes an append: `toBarSeries`
    // refuses bars that are not strictly ascending, so two entries for one
    // instant is a `RangeError` on the next render rather than a bad chart.
    const grown = withLiveBars(series, [correction]);

    expect(grown.bars.length).toBe(series.bars.length);
    expect(grown.bars[grown.bars.length - 1]?.close).toBe(correction.close);
    expect(grown.provenance.sources.reduce((t, s) => t + s.barCount, 0)).toBe(
      grown.bars.length,
    );
  });

  it("takes the last word when a minute arrives twice in one batch", () => {
    const series = served();
    const first = nextMinute(series, 101);
    const second = { ...first, close: 103 };

    const grown = withLiveBars(series, [first, second]);

    expect(grown.bars.length).toBe(series.bars.length + 1);
    expect(grown.bars[grown.bars.length - 1]?.close).toBe(103);
  });

  it("returns the same object for a bar it already holds unchanged", () => {
    const series = served();
    const last = series.bars[series.bars.length - 1];
    if (last === undefined) throw new Error("fixture has no bars");
    expect(withLiveBars(series, [last])).toBe(series);
  });

  it("drops a bar outside the window the reader asked for", () => {
    const series = served();
    const requested = series.coverage.requested;
    const past: Bar = {
      ...nextMinute(series),
      startsAt: new Date(requested.start.getTime() - 60_000),
    };
    const future: Bar = {
      ...nextMinute(series),
      startsAt: new Date(requested.end.getTime() + 60_000),
    };

    // The window is what the reader asked for. A series that quietly grew past
    // it would make `?sessions=5` mean something that changes while you look.
    expect(withLiveBars(series, [past])).toBe(series);
    expect(withLiveBars(series, [future])).toBe(series);
  });

  it("cannot grow a window that is already covered end to end", () => {
    // The `full` fixture covers exactly what was asked for, so its last bar is
    // the last minute of the window and the next one is outside it. A reader
    // looking at a finished session sees a finished chart, which is correct:
    // the next minute belongs to a window they did not ask for.
    const view = barSeriesFixtureView("full");
    if (view.state !== "loaded") throw new Error(`fixture is ${view.state}`);
    const complete = view.series;

    expect(withLiveBars(complete, [nextMinute(complete)])).toBe(complete);
  });

  it("extends the covered window to hold the new bar, and no further", () => {
    const series = served();
    // `PopulatedBarSeries` narrows `covered` to non-null, which is the type
    // carrying `toBarSeries`'s own rule: a covered range over no bars is a
    // claim with nothing behind it.
    const covered = series.coverage.covered;
    const grown = withLiveBars(series, [nextMinute(series)]);
    const grownCovered = grown.coverage.covered;

    expect(grownCovered.end.getTime()).toBeGreaterThan(covered.end.getTime());
    // `toBarSeries` refuses a covered range outside the requested one, so this
    // is belt and braces — but the arithmetic that clamps it is this module's.
    expect(grownCovered.end.getTime()).toBeLessThanOrEqual(
      series.coverage.requested.end.getTime(),
    );
  });
});

// **The live tail must not inherit the stored tape's word** (Task 3.10.8).
//
// This is `CLAUDE.md`'s invariant 6 in the ledger rather than in the chrome —
// the same defect Task 3.10.6 repaired in the status bar, one surface along.
// The canvas has drawn the answer since Task 2.14.4 (`Provenance and the
// empty answers` §10, *Shape B — stored SIP bars with a live IEX tail*:
// `780 bars / All US exchanges` over `30 bars / IEX`), and until this task the
// code could not produce it from a live edge: the tail silently extended the
// last stretch and was counted under **its** feed.
describe("withLiveBars, and the tape the tail actually came from", () => {
  /** The served fixture, relabelled so its one stretch names a given tape. */
  function servedFrom(feed: "sip" | "iex"): PopulatedBarSeries {
    const series = served();
    const [first, ...rest] = series.provenance.sources;
    return {
      ...series,
      provenance: {
        ...series.provenance,
        sources: [{ ...first, feed }, ...rest],
      },
    };
  }

  it("gives the live tail its own stretch when its tape differs", () => {
    const series = servedFrom("sip");
    const before = series.bars.length;
    const grown = withLiveBars(series, [nextMinute(series)], "iex");

    expect(grown.provenance.sources).toHaveLength(2);
    expect(grown.provenance.sources[0]).toMatchObject({
      feed: "sip",
      barCount: before,
    });
    expect(grown.provenance.sources[1]).toMatchObject({
      feed: "iex",
      barCount: 1,
    });

    // The counts still sum, which is what `toBarSeries` throws over.
    expect(grown.provenance.sources.reduce((t, s) => t + s.barCount, 0)).toBe(
      grown.bars.length,
    );
  });

  // **And it must not invent a seam where there is no market event.** A
  // deployment whose stored bars are already the live tape — which is what a
  // mid-session window looks like since Story 3.8 — has one stretch, and a
  // second would be a boundary a reader could not act on.
  it("extends the last stretch when the tape is the same", () => {
    const series = servedFrom("iex");
    const before = series.bars.length;
    const grown = withLiveBars(series, [nextMinute(series)], "iex");

    expect(grown.provenance.sources).toHaveLength(1);
    expect(grown.provenance.sources[0]).toMatchObject({
      feed: "iex",
      barCount: before + 1,
    });
  });

  // **A correction is not a new bar**, so it changes no count and opens no
  // stretch — it replaces the minute it corrects, which is this module's
  // founding rule.
  it("opens no stretch for a correction", () => {
    const series = servedFrom("sip");
    const grown = withLiveBars(series, [correctionOfLast(series)], "iex");

    expect(grown.provenance.sources).toHaveLength(1);
    expect(grown.provenance.sources[0]).toMatchObject({ feed: "sip" });
  });

  // **Not knowing the tape is a real state**: a deployment with no provider
  // configured reports `feed: null`. With a live bar somehow in hand, the
  // honest move is the old behaviour — extend, rather than open a stretch
  // this page cannot name.
  it("extends when the live tape is not known", () => {
    const series = servedFrom("sip");
    const before = series.bars.length;
    const grown = withLiveBars(series, [nextMinute(series)], null);

    expect(grown.provenance.sources).toHaveLength(1);
    expect(grown.provenance.sources[0]).toMatchObject({
      feed: "sip",
      barCount: before + 1,
    });
  });
});
