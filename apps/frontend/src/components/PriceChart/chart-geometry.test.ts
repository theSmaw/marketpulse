import { toTimeRange } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import {
  chartDensity,
  directionOf,
  formatPrice,
  timeAxis,
} from "../../market/index.js";
import { changePercent, seriesPrices } from "../BarSeriesPanel/series-facts.js";
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
function subjectOf(
  name: "full" | "partial" | "flat" | "dense" | "uncovered",
): ChartSubject {
  const view: BarSeriesView = barSeriesFixtureView(name);
  if (view.state !== "loaded" && view.state !== "partial")
    throw new Error(`the ${name} fixture is not an answer with bars`);

  return {
    requested: view.series.coverage.requested,
    covered: view.series.coverage.covered,
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
      covered: view.series.coverage.covered,
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
      readings: [],
      slots: null,
      seams: [],
      ticks: [],
      series: null,
      // Not one uncovered span across a zero-width plot: an unmeasured element
      // knows nothing about coverage, and washing it would be a claim.
      coverage: { covered: null, uncovered: [], edges: [] },
      direction: null,
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

describe("direction, and the geometry that carries it", () => {
  // **The load-bearing half of Task 2.12.5.** `--price-positive-wash` and
  // `--price-negative-wash` differ by 1.009:1 under `grayscale(1)`, so the tint
  // is not a channel — the side of the reference rule the line finishes on is.
  // Every assertion below is about that geometry; not one of them is about a
  // colour, which is structural here rather than a discipline (no stylesheet is
  // applied in this environment).

  it("finishes above the rule on a window that rose", () => {
    const frame = chartFrame(PLOT, DENSITY, subjectOf("full"));
    const drawn = points(frame.series ?? "");
    const last = drawn[drawn.length - 1];

    expect(frame.direction).not.toBeNull();
    // Above, in SVG, is a **smaller** y. Asserting the reverse passes on a
    // scale built upside down, which is the defect this file already has one
    // test for.
    expect(last?.[1]).toBeLessThan(frame.direction?.reference ?? 0);
  });

  it("finishes below the rule on a window that fell", () => {
    const frame = chartFrame(PLOT, DENSITY, subjectOf("partial"));
    const drawn = points(frame.series ?? "");
    const last = drawn[drawn.length - 1];

    expect(last?.[1]).toBeGreaterThan(frame.direction?.reference ?? 0);
  });

  it("finishes on the rule on a window that closed where it opened", () => {
    // The third case, and the reason a fixture had to be found for it: ten of
    // the recorded bodies are one direction or the other. HD's hour opened and
    // closed at 320.705 with a real 66-cent range in between, so this is a flat
    // *window* rather than a flat *line* — the interesting one, because the
    // line crosses the rule repeatedly and the renderer tints both sides.
    //
    // There is no "neutral" answer to assert any more and that is the point:
    // since 2026-09-12 the tint is a function of position, and a flat window is
    // green where it was up and red where it was down, finishing exactly where
    // it started.
    const frame = chartFrame(PLOT, DENSITY, subjectOf("flat"));
    const drawn = points(frame.series ?? "");
    const last = drawn[drawn.length - 1];

    expect(frame.direction?.fill).not.toBeNull();
    expect(last?.[1]).toBe(frame.direction?.reference);
  });

  it("sits the rule at the price the panel beneath calls the open", () => {
    // The decision Task 2.12.4's amendment handed this task, checked rather
    // than described. `series-facts.ts` computes the reading above the plot
    // from the **first held bar's open**, and the rule has to be that same
    // number or the picture and the figure are a bar apart — the failure is
    // invisible at 1m in almost every window and visible in exactly the one
    // where the first bar straddles the final close.
    const view = barSeriesFixtureView("partial");
    if (view.state !== "partial")
      throw new Error("the partial fixture is not partial");

    const subject = subjectOf("partial");
    const frame = chartFrame(PLOT, DENSITY, subject);
    const first = subject.bars[0];
    if (first === undefined) throw new Error("the fixture has no bars");

    // Reaching across to `BarSeriesPanel`'s own arithmetic is deliberate and is
    // the point of the test: the invariant spans both components, and a version
    // of this that re-implemented the open here would be asserting that this
    // file agrees with itself.
    const prices = seriesPrices(view.series);
    expect(prices.open).toBe(first.open);

    // The rule's y is the open through the same value scale the line uses, so
    // the way to check it without re-deriving the scale is that the *first
    // point's own close* lands a hair from it — the two are one bar apart.
    const drawn = points(frame.series ?? "");
    const firstPoint = drawn[0];

    expect(
      Math.abs((firstPoint?.[1] ?? 0) - (frame.direction?.reference ?? 0)),
    ).toBeLessThan(PLOT.height / 10);

    // And the **geometry** agrees with what the panel will print, which is the
    // whole point of taking the same number. Stated as the implication rather
    // than as a colour, because since 2026-09-12 the chart holds no direction
    // value at all — it holds a rule, and the reading is which side of it the
    // line ends on.
    const change = changePercent(prices);
    const finish = drawn[drawn.length - 1]?.[1] ?? 0;
    const reference = frame.direction?.reference ?? 0;

    if (directionOf(change ?? 0) === "negative")
      expect(finish).toBeGreaterThan(reference);
    else if (directionOf(change ?? 0) === "positive")
      expect(finish).toBeLessThan(reference);
  });

  it("closes the fill back to the rule rather than leaving it open", () => {
    // An unclosed path still *fills* in SVG — the renderer closes it for you,
    // along a straight line from the last point to the first — so the symptom
    // of getting this wrong is a triangle of tint across the plot rather than
    // an error. The `Z` and the two segments before it are what make the area
    // the region between the line and the rule.
    const frame = chartFrame(PLOT, DENSITY, subjectOf("full"));
    const fill = frame.direction?.fill ?? "";

    expect(fill.startsWith(frame.series ?? "")).toBe(true);
    expect(fill.endsWith("Z")).toBe(true);

    // Two segments appended and no more: down to the rule at the right-hand
    // edge, back along it to the left. A fill that walked the bars a second
    // time would double a 1,950-point string for no new information.
    const appended = fill.slice((frame.series ?? "").length);
    expect(appended.match(/L/g)).toHaveLength(2);
    expect(appended).toContain(String(frame.direction?.reference));
  });

  it("draws no rule and no fill where there is no line to be on one side of", () => {
    const view = barSeriesFixtureView("empty");
    if (view.state !== "empty")
      throw new Error("the empty fixture is not empty");

    const frame = chartFrame(PLOT, DENSITY, {
      requested: view.series.coverage.requested,
      covered: view.series.coverage.covered,
      timeframe: view.series.timeframe,
      bars: view.series.bars,
    });

    // A rule alone would be a datum with nothing measured against it.
    expect(frame.direction).toBeNull();
  });

  it("keeps the rule inside the frame at the default window's density", () => {
    // 1,950 bars at 0.47 px each, which is what this product opens at and is
    // the only recorded body that has it. The rule is the first bar's open and
    // the domain is taken over every bar's high and low, so it is inside the
    // plot by construction — this is the assertion that would catch a later
    // change to either.
    const subject = subjectOf("dense");
    const frame = chartFrame(PLOT, DENSITY, subject);

    expect(subject.bars).toHaveLength(1950);
    expect(frame.direction?.reference).toBeGreaterThan(0);
    expect(frame.direction?.reference).toBeLessThan(PLOT.height);
  });
});

// **The readings, which are what the crosshair reads** (Task 2.12.6).
//
// The property that matters is that they are *the same arithmetic as the marks*
// rather than a second derivation of them. A readings list that agreed with the
// bars but not with the path would put the disc beside the line it is meant to
// be on — a defect visible only in a browser, and only if somebody looked.
describe("the readings", () => {
  it("carries one reading per drawn point, at the drawn coordinates", () => {
    const subject = subjectOf("full");
    const frame = chartFrame(PLOT, DENSITY, subject);
    const drawn = points(frame.series ?? "");

    expect(frame.readings).toHaveLength(drawn.length);

    // Pair by pair. This is the assertion that would catch a second rounding
    // rule, a gutter applied twice, or a scale rebuilt with its range the other
    // way up — all of which draw a plausible chart with a crosshair that misses.
    for (const [index, reading] of frame.readings.entries()) {
      expect([reading.x, reading.y]).toEqual(drawn[index]);
    }
  });

  it("reads the close and not one of the other three prices", () => {
    // The line is made of closes, so the disc has to be too. `high` and `open`
    // are within a few hundredths of a percent of it at `1m`, which is exactly
    // why this needs asserting rather than eyeballing: the wrong one looks
    // right.
    const subject = subjectOf("full");
    const frame = chartFrame(PLOT, DENSITY, subject);

    for (const reading of frame.readings) {
      expect(subject.bars).toContain(reading.bar);
    }

    const closes = frame.readings.map((reading) => reading.bar.close);
    expect(closes).toEqual(subject.bars.map((bar) => bar.close));
  });

  it("hands back the x scale, so a pointer is inverted rather than re-derived", () => {
    // The task brief forbids re-deriving a mapping from an element's bounding
    // box, and this field is what makes that unnecessary: the crosshair inverts
    // the scale the marks were drawn with. A second spelling agrees with the
    // first everywhere except the edges, which is where a pointer spends its
    // time.
    const frame = chartFrame(PLOT, DENSITY, subjectOf("full"));

    expect(frame.slots).not.toBeNull();
    expect(frame.slots?.range).toEqual([0, PLOT.width]);
  });

  it("has no readings before there is an answer, and none where the store holds nothing", () => {
    // Both draw a real frame — the loading state is `PRODUCT_SPEC.md` §28's
    // 500 ms satisfied by the frame rather than by the response — and neither
    // has a bar in it to read. What a crosshair over one of those *looks* like
    // is Task 2.12.7's.
    expect(chartFrame(PLOT, DENSITY, null).readings).toEqual([]);

    const empty = barSeriesFixtureView("empty");
    if (empty.state !== "empty") throw new Error("the empty fixture moved");

    const frame = chartFrame(PLOT, DENSITY, {
      requested: empty.series.coverage.requested,
      covered: empty.series.coverage.covered,
      timeframe: empty.series.timeframe,
      bars: empty.series.bars,
    });

    expect(frame.readings).toEqual([]);
    // And it still has an axis, because that window was asked for.
    expect(frame.ticks.length).toBeGreaterThan(0);
  });

  it("places every bar of every recorded answer on a slot of its own — which is why the hole case is synthetic", () => {
    // **A finding rather than a check**, and it is the reason
    // `chart-time-axis.test.ts`'s `nearestPlaced` cases are written objects
    // while everything else in this file is a recorded body.
    //
    // Two obvious assertions were written here first and both went red. *The
    // last reading stops short of the frame on a `partial`* is false — this
    // recording's shortfall is overnight, which `CHARTING.md` §10.1 already
    // recorded. And *a short answer has fewer readings than the axis has slots*
    // is false too: 60 bars on 60 slots. **No recorded body in this fixture set
    // has a hole in it.**
    //
    // That is not a gap in the fixtures; it is what a liquid S&P 500 security's
    // stored minutes actually look like. So the case the crosshair would read
    // wrongly — a minute with no prints, shifting everything after it by one —
    // cannot be reached from a recording, and the level that can test it is the
    // one below. What this asserts is the premise that makes the arithmetic
    // work at all: slots ascend, so a binary search is legitimate.
    const subject = subjectOf("partial");
    const frame = chartFrame(PLOT, DENSITY, subject);
    const axis = timeAxis(subject.requested, subject.timeframe);

    expect(frame.readings.length).toBeGreaterThan(0);
    expect(frame.readings.length).toBeLessThanOrEqual(axis.slots);

    const slots = frame.readings.map((reading) => reading.slot);
    expect(slots).toEqual([...slots].sort((left, right) => left - right));
    expect(new Set(slots).size).toBe(slots.length);
  });
});

// **What the coverage treatment is derived from** (Task 2.12.7).
//
// The rule this block holds: *a mark derived from the window runs the full
// frame; a mark derived from the bars stops at the coverage edge.* Everything
// below is the second half of that as arithmetic, and none of it is visible at
// any other level — jsdom computes no layout, and a browser can see that a
// region is washed without being able to say it was washed in the right place.
describe("how much of the window is held", () => {
  it("washes nothing and draws no edge when the answer covers the window", () => {
    const frame = chartFrame(PLOT, DENSITY, subjectOf("full"));

    // `loaded` means `covered` equals `requested`, so both ends land on the
    // frame's own sides and the floor drops the zero-width difference. No
    // branch on the state produces this — the arithmetic does.
    expect(frame.coverage.uncovered).toEqual([]);
    expect(frame.coverage.edges).toEqual([]);
    expect(frame.coverage.covered).toEqual({ from: 0, to: PLOT.width });
  });

  it("stops the covered span short when the shortfall is made of trading minutes", () => {
    // The recorded body this task exists for: 780 bars against a window
    // reaching 210 trading minutes into a session the store has not taken.
    const frame = chartFrame(PLOT, DENSITY, subjectOf("uncovered"));
    const [span, ...rest] = frame.coverage.uncovered;

    expect(rest).toEqual([]);
    expect(span?.to).toBe(PLOT.width);
    // 210 of 990 slots, so a little over a fifth of the frame. Asserted as a
    // proportion rather than as a pixel: the pixel is a product of a plot width
    // this test chose, and the proportion is the fact about the answer.
    const uncoveredFraction =
      ((span?.to ?? 0) - (span?.from ?? 0)) / PLOT.width;
    expect(uncoveredFraction).toBeCloseTo(210 / 990, 2);

    // One edge, at the span's own start, and nothing at the frame's sides.
    expect(frame.coverage.edges).toEqual([span?.from]);
    expect(frame.coverage.covered).toEqual({ from: 0, to: span?.from });

    // And the line ends inside the covered span rather than at the frame. This
    // is the pair that makes the drawing honest: the axis is the window, the
    // data stops before it, and the two facts agree.
    const last = frame.readings[frame.readings.length - 1];
    expect(last?.x).toBeLessThan(span?.from ?? 0);
    expect(last?.x).toBeGreaterThan((span?.from ?? 0) - 5);
  });

  it("washes nothing when the shortfall is a weekend, because a weekend has no slots", () => {
    // `CHARTING.md` §10.1, and the reason this task needed a fourteenth
    // recorded body. The `partial` fixture holds Friday 15:00–16:00 against a
    // window requested to Saturday 16:00 — and on a session-ordinal axis
    // Saturday contributes nothing, so those 60 bars correctly fill their
    // frame.
    //
    // **This is the treatment being right rather than being skipped.** A
    // shortfall made of a weekend is not a shortfall a chart should leave a
    // hole for, and taking the edge from the bars instead of from the covered
    // range would have drawn one.
    const frame = chartFrame(PLOT, DENSITY, subjectOf("partial"));

    expect(frame.coverage.uncovered).toEqual([]);
    expect(frame.coverage.edges).toEqual([]);
  });

  it("washes the whole plot for an answer with no bars in it", () => {
    const view = barSeriesFixtureView("empty");
    if (view.state !== "empty")
      throw new Error("the empty fixture is not empty");

    const frame = chartFrame(PLOT, DENSITY, {
      requested: view.series.coverage.requested,
      covered: view.series.coverage.covered,
      timeframe: view.series.timeframe,
      bars: view.series.bars,
    });

    // Coverage zero, which is this treatment at its limit rather than a fourth
    // one — and it is the whole of what tells `empty` apart from `loading` on
    // screen. No edge: an edge at the frame's own side is a spine.
    expect(frame.coverage.covered).toBeNull();
    expect(frame.coverage.uncovered).toEqual([{ from: 0, to: PLOT.width }]);
    expect(frame.coverage.edges).toEqual([]);
  });

  it("washes nothing before there is an answer", () => {
    // The distinction the union carries and the drawing has to keep: nothing is
    // *known* to be missing before anything has been answered. A frame that
    // washed while it waited would say we had asked and been told no.
    expect(chartFrame(PLOT, DENSITY, null).coverage).toEqual({
      covered: null,
      uncovered: [],
      edges: [],
    });
  });
});
