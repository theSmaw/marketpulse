import { toTimeRange } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { chartDensity, formatPrice } from "../../market/index.js";
import type { ChartSubject } from "./chart-geometry.js";
import { chartFrame } from "./chart-geometry.js";

// **Acceptance criterion 1 is checked here and nowhere else** (Task 2.12.4).
//
// The criterion is that the rendered series is verified against the stored bars
// rather than by eye, and this is the only level that can: jsdom applies no
// stylesheet, computes no layout and has no `ResizeObserver`, so a component
// test sees a plot box of zero and not one coordinate. A browser test can see a
// path and cannot tell a correct one from a plausible one.
//
// So every assertion below runs against `barSeriesFixtureView`, which collapses
// a body **recorded off the real endpoint** through the **real** state
// transition. Nothing here is a hand-written series — a hand-built `partial`
// whose coverage disagrees with its bars is a state the layer cannot reach, and
// geometry tuned against one draws the real thing wrongly.

/** A plot box the size of the Price region at 1440×900, minus the value gutter. */
const PLOT = { width: 867, height: 280 };
const DENSITY = chartDensity(923);

/** What the chart is about, taken from a recorded answer the way the component does. */
function subjectOf(name: "full" | "partial"): ChartSubject {
  const view: BarSeriesView = barSeriesFixtureView(name);
  if (view.state !== "loaded" && view.state !== "partial")
    throw new Error(`the ${name} fixture is not an answer with bars`);

  return {
    requested: view.series.coverage.requested,
    timeframe: view.series.timeframe,
    bars: view.series.bars,
  };
}

/** Every `x y` pair in a path, in order. */
function points(path: string): readonly (readonly [number, number])[] {
  return path.split(" ").reduce<[number, number][]>((pairs, token, index) => {
    if (index % 2 === 0) pairs.push([Number(token.slice(1)), Number.NaN]);
    else {
      const last = pairs[pairs.length - 1];
      if (last !== undefined) last[1] = Number(token);
    }
    return pairs;
  }, []);
}

describe("the series against the store", () => {
  it("draws one point per recorded bar, in order", () => {
    const subject = subjectOf("full");
    const frame = chartFrame(PLOT, DENSITY, subject);

    expect(frame.series).not.toBeNull();
    expect(points(frame.series ?? "")).toHaveLength(subject.bars.length);

    // The path starts with a move and continues with lines. A path of `L`
    // commands only draws nothing at all, silently.
    expect(frame.series).toMatch(/^M/);
    expect(frame.series?.slice(1)).not.toContain("M");
  });

  it("puts each bar's close where the value scale says its close is", () => {
    const subject = subjectOf("full");
    const frame = chartFrame(PLOT, DENSITY, subject);
    const drawn = points(frame.series ?? "");

    // The check that makes this a verification rather than a count: the
    // **order of the y coordinates must be the reverse of the order of the
    // closes**, because SVG's y grows downwards. A scale built with its range
    // the right way up passes every length assertion and draws the series
    // upside down — which looks like a plausible chart of a different day.
    const closes = subject.bars.map((bar) => bar.close);
    const highest = closes.indexOf(Math.max(...closes));
    const lowest = closes.indexOf(Math.min(...closes));

    const highestPoint = drawn[highest];
    const lowestPoint = drawn[lowest];
    if (highestPoint === undefined || lowestPoint === undefined)
      throw new Error("the path is shorter than the series");

    expect(highestPoint[1]).toBeLessThan(lowestPoint[1]);

    // And both are inside the plot, because `priceDomain` pads by 10% — a
    // series touching the frame is a domain taken from the wrong numbers.
    expect(highestPoint[1]).toBeGreaterThan(0);
    expect(lowestPoint[1]).toBeLessThan(PLOT.height);
  });

  it("labels the value gutter with prices the domain actually contains", () => {
    const frame = chartFrame(PLOT, DENSITY, subjectOf("full"));

    expect(frame.gridlines.length).toBeGreaterThan(0);
    for (const gridline of frame.gridlines) {
      expect(gridline.label).not.toBeNull();
      // Through this product's one price spelling, never a second one.
      expect(gridline.label).toBe(formatPrice(Number(gridline.label)));
      expect(gridline.y).toBeGreaterThanOrEqual(0);
      expect(gridline.y).toBeLessThanOrEqual(PLOT.height);
    }
  });
});

describe("the x-domain comes from the window, not from the bars", () => {
  it("leaves the recorded partial answer's bars filling their own frame", () => {
    // `CHARTING.md` §10.1, and it is the finding that makes this fixture the
    // wrong one to build `--chart-uncovered` against: the recorded `partial`
    // holds 60 bars covering Friday 15:00–16:00 against a window requested to
    // Saturday 16:00. On a **session-ordinal** axis Saturday contributes no
    // slots, so those 60 bars correctly reach the right-hand edge. A shortfall
    // made of a weekend is not a shortfall a chart should leave a hole for.
    const subject = subjectOf("partial");
    const frame = chartFrame(PLOT, DENSITY, subject);
    const drawn = points(frame.series ?? "");
    const last = drawn[drawn.length - 1];

    expect(last?.[0]).toBe(PLOT.width);
  });

  it("stops the line short when the shortfall is made of trading minutes", () => {
    // The ordinary case, and the one Task 2.12.7 draws: the store is caught up
    // overnight and the free plan withholds the most recent ~15 minutes, so a
    // window reaching into a session in progress is covered up to a point and
    // asked for beyond it. Here that is the 30 recorded bars of 09:30–10:00 ET
    // against a window asking to 11:00 — 90 slots of trading time, 30 of them
    // held. The line must stop at the first third.
    //
    // Derive the domain from the bars instead and it rescales to fill the frame
    // and **looks complete**, with nothing red anywhere and no reader able to
    // see it. That is the whole reason this test exists.
    const held = subjectOf("full");

    const frame = chartFrame(PLOT, DENSITY, {
      ...held,
      requested: toTimeRange(
        held.requested.start,
        new Date(held.requested.end.getTime() + 60 * 60_000),
      ),
    });

    const drawn = points(frame.series ?? "");
    const last = drawn[drawn.length - 1];

    // 29 of 89 intervals along, not 89 of 89.
    expect(last?.[0]).toBeCloseTo((PLOT.width * 29) / 89, 0);
  });
});

describe("the frame is never conditional on the data", () => {
  it("draws a real scale with nothing written on it before the first answer", () => {
    const frame = chartFrame(PLOT, DENSITY, null);

    expect(frame.gridlines).toHaveLength(DENSITY.valueTicks);
    for (const gridline of frame.gridlines) {
      expect(gridline.label).toBeNull();
      expect(gridline.y).toBeGreaterThan(0);
      expect(gridline.y).toBeLessThan(PLOT.height);
    }

    expect(frame.series).toBeNull();
    expect(frame.ticks).toHaveLength(0);
  });

  it("draws a labelled axis and no line for an answer with no bars", () => {
    const view = barSeriesFixtureView("empty");
    if (view.state !== "empty")
      throw new Error("the empty fixture is not empty");

    const frame = chartFrame(PLOT, DENSITY, {
      requested: view.series.coverage.requested,
      timeframe: view.series.timeframe,
      bars: view.series.bars,
    });

    expect(frame.ticks.length).toBeGreaterThan(0);
    expect(frame.series).toBeNull();
    // The gridlines are there and unlabelled: there is no domain to nice, and
    // an axis of prices invented for an empty window would be a picture of
    // data this system does not hold.
    expect(frame.gridlines.map((line) => line.label)).not.toContain(
      expect.any(String),
    );
  });

  it("answers an unmeasured element with an empty frame rather than a throw", () => {
    // A `ResizeObserver` reports zero before layout, and `linearScale` refuses a
    // zero-width range on purpose. A chart that threw on its own first frame
    // would take the region's error boundary down over a number that is about
    // to be replaced.
    const frame = chartFrame(
      { width: 0, height: 0 },
      DENSITY,
      subjectOf("full"),
    );

    expect(frame).toEqual({
      gridlines: [],
      seams: [],
      ticks: [],
      series: null,
    });
  });
});

describe("the session seam", () => {
  it("draws one vertical rule per session boundary and none at the left edge", () => {
    const subject = subjectOf("full");
    const frame = chartFrame(PLOT, DENSITY, subject);

    // The `full` fixture is half an hour of one session, so there is no
    // boundary inside it at all. A rule at slot 0 would be a left spine, which
    // is exactly the four-sided box this language refuses.
    expect(frame.seams).toHaveLength(0);
    expect(frame.ticks.filter((tick) => tick.kind === "session")).toHaveLength(
      1,
    );
  });
});
