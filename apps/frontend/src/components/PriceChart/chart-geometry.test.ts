import {
  lastMarketSessions,
  toMarketDate,
  toTimeRange,
} from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import {
  chartDensity,
  directionOf,
  formatPrice,
  linearScale,
  positionOfInstant,
  scaleValue,
  timeAxis,
  volumeDomain,
} from "../../market/index.js";
import { changePercent, seriesPrices } from "../BarSeriesPanel/series-facts.js";
import type { ChartSubject } from "./chart-geometry.js";
import {
  chartFrame,
  priceFrame,
  timeFrame,
  volumeFrame,
} from "./chart-geometry.js";

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
      // The axis half, empty: no window has been resolved, so there is nothing to
      // place a bar or a seam against. The density survives, because it comes from
      // the region's width rather than from an answer (Task 2.13.3).
      axis: null,
      width: 0,
      density: DENSITY,
      slots: null,
      seams: [],
      ticks: [],
      // Not one uncovered span across a zero-width plot: an unmeasured element
      // knows nothing about coverage, and washing it would be a claim.
      coverage: { covered: null, uncovered: [], edges: [] },
      // The price half, empty.
      gridlines: [],
      readings: [],
      series: null,
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

// ---------------------------------------------------------------------------
// One axis for two plots, and volume's own arithmetic (Task 2.13.3).
// ---------------------------------------------------------------------------

/** The volume plot's height at 1440, from `--chart-volume-height`. */
const VOLUME_HEIGHT = 88;

/** Every stem in a volume path, as `{ x, baseline, top }`. */
function stems(path: string): readonly {
  readonly x: number;
  readonly baseline: number;
  readonly top: number;
}[] {
  return path.split(" M").map((piece, index) => {
    const body = index === 0 ? piece.slice(1) : piece;
    const [move, top] = body.split("V");
    const [x, baseline] = (move ?? "").split(" ");
    return { x: Number(x), baseline: Number(baseline), top: Number(top) };
  });
}

describe("one axis, handed to both plots", () => {
  // The shape, stated because the test cannot assert it: `timeFrame` is the only
  // function here that takes a window, and `priceFrame` and `volumeFrame` take one
  // of its results plus a height and some bars. Neither is handed a `TimeRange` or
  // a `Timeframe`, so neither *can* call `timeAxis` — which is the difference
  // between two plots that agree because they were given the same numbers and two
  // that agree because they were written the same way. What is assertable is that
  // they land on the same pixels, and that is below.

  it("puts every volume column under the price point for the same bar", () => {
    const subject = subjectOf("full");
    const time = timeFrame(PLOT.width, DENSITY, subject);
    const price = priceFrame(time, PLOT.height, subject.bars);
    const volume = volumeFrame(time, VOLUME_HEIGHT, subject.bars);

    // The `full` fixture is half an hour of minute bars on an 867 px plot, so
    // every bar has a pixel of its own and the columns are one per bar.
    expect(volume.stems).toBe(price.readings.length);

    const columns = stems(volume.columns ?? "");
    expect(columns.map((stem) => stem.x)).toEqual(
      price.readings.map((reading) => reading.x),
    );
  });

  it("ends both series at the same pixel when the answer is short", () => {
    // `CHARTING.md` §17.5 item 4, named as the item most likely to be got wrong by
    // a second plot: two plots sharing one x-domain must stop at the same pixel.
    // Here that is arithmetic rather than agreement — one `coverage`, one scale.
    const subject = subjectOf("uncovered");
    const time = timeFrame(PLOT.width, DENSITY, subject);
    const price = priceFrame(time, PLOT.height, subject.bars);
    const volume = volumeFrame(time, VOLUME_HEIGHT, subject.bars);

    const lastColumn = stems(volume.columns ?? "").at(-1);
    const lastPoint = price.readings.at(-1);

    // Within a pixel rather than identical: at 0.88 px per bar the columns are
    // snapped to pixel centres and the line is not, which is §10's third regime
    // and is stated on `silhouette`.
    expect(Math.abs((lastColumn?.x ?? 0) - (lastPoint?.x ?? 0))).toBeLessThan(
      1,
    );

    // And both stop inside the covered span rather than at the frame's edge.
    const covered = time.coverage.covered;
    expect(lastColumn?.x).toBeLessThanOrEqual(covered?.to ?? 0);
    expect(lastPoint?.x).toBeLessThanOrEqual(covered?.to ?? 0);
  });

  it("builds the x-domain from the window, so a second plot cannot rescale a short answer", () => {
    // The defect with the worst shape in the chart layer, asserted from the shared
    // frame rather than from the price plot: 780 bars on an axis of 990 slots. A
    // plot deriving its own axis from its own bars would produce 780 and look
    // complete.
    const subject = subjectOf("uncovered");
    const time = timeFrame(PLOT.width, DENSITY, subject);

    expect(time.axis?.slots).toBe(990);
    expect(subject.bars).toHaveLength(780);
  });

  it("hands the same width and density to both plots", () => {
    const subject = subjectOf("full");
    const time = timeFrame(PLOT.width, DENSITY, subject);

    // Both plots declare the same span on the same grid and spend the same
    // gutter, so the width is one number. A second plot measuring its own is the
    // one place the alignment could silently fail.
    expect(time.width).toBe(PLOT.width);
    expect(time.density).toEqual(DENSITY);
  });

  it("answers an unmeasured width with an axis carrying no window", () => {
    const time = timeFrame(0, DENSITY, subjectOf("full"));

    expect(time.axis).toBeNull();
    expect(time.slots).toBeNull();
    expect(time.width).toBe(0);
    // Still the region's density: a plot waiting for its first answer draws the
    // right number of gridlines.
    expect(time.density).toEqual(DENSITY);
    expect(volumeFrame(time, VOLUME_HEIGHT, subjectOf("full").bars)).toEqual({
      columns: null,
      columnWidth: 0,
      stems: 0,
      peak: null,
    });
  });
});

describe("the week with a holiday and a half day in it", () => {
  // Story 2.13's acceptance criterion 3, at the level that can see an axis. The
  // control proves it end to end in Task 2.13.8; what is asserted here is the
  // half of it nobody remembers — **2026-11-27 closes at 13:00 ET**, so a window
  // containing it must not draw an empty 13:00–16:00 band and call it missing
  // data.
  const walked = lastMarketSessions(5, toMarketDate("2026-11-30"));
  const first = walked[0];
  const last = walked.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("the calendar answered no sessions for the holiday week");
  }
  const requested = toTimeRange(first.open, last.close);
  const subject: ChartSubject = {
    requested,
    covered: requested,
    timeframe: "1m",
    bars: [],
  };

  it("gives the half day 210 slots and not 390", () => {
    const time = timeFrame(PLOT.width, DENSITY, subject);
    const sessions = time.axis?.sessions ?? [];

    expect(sessions.map((session) => session.date)).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-27",
      "2026-11-30",
    ]);

    const half = sessions.find((session) => session.date === "2026-11-27");
    expect(half?.slots).toBe(210);
    expect(time.axis?.slots).toBe(390 * 4 + 210);
  });

  it("draws no empty afternoon band, because the axis has no slot for one", () => {
    // The assertion that actually rules the band out: 14:00 ET on the half day is
    // a real instant inside the requested window and it has **no position** on
    // this axis — it is a boundary, like a night or a weekend. A continuous time
    // axis would have given it 180 slots of empty plot and every state test would
    // still have passed.
    const time = timeFrame(PLOT.width, DENSITY, subject);
    const axis = time.axis;
    if (axis === null) throw new Error("no axis for the holiday week");

    const afternoon = new Date("2026-11-27T19:00:00Z"); // 14:00 ET
    expect(positionOfInstant(axis, afternoon).kind).toBe("boundary");

    // And the seam after it sits where the next session starts, which is the slot
    // immediately after the half day's last minute — no gap.
    const half = axis.sessions.find((session) => session.date === "2026-11-27");
    const monday = axis.sessions.find(
      (session) => session.date === "2026-11-30",
    );
    expect(monday?.firstSlot).toBe((half?.firstSlot ?? 0) + 210);
  });

  it("labels the holiday week's sessions without inventing a date for the closure", () => {
    // Thanksgiving is not in the axis at all, so it cannot be labelled — which is
    // the session-ordinal axis being right rather than a filter being applied.
    const time = timeFrame(PLOT.width, DENSITY, subject);
    const dates = time.ticks
      .filter((tick) => tick.kind === "session")
      .map((tick) => tick.label);

    expect(dates).not.toContain("Nov 26");
    expect(dates).toContain("Nov 27");
  });
});

describe("the volume columns, at both ends of the density range", () => {
  it("leaves a one-pixel gap where a column is wide enough to have one", () => {
    // Regime one. `full` is 30 minute bars, so a 60 px plot gives 2 px a bar — the
    // threshold itself — and an 867 px plot gives 28.9.
    const subject = subjectOf("full");
    const wide = volumeFrame(
      timeFrame(PLOT.width, DENSITY, subject),
      VOLUME_HEIGHT,
      subject.bars,
    );

    expect(wide.columnWidth).toBeCloseTo(PLOT.width / 30 - 1, 5);
    expect(wide.stems).toBe(30);
  });

  it("spends the whole slot on the column once there is no room for a gap", () => {
    // Regime two, and the threshold is the device rather than a taste: below 2 px
    // there is no room for a 1 px gap *and* a 1 px column, and the column wins —
    // a column that is not drawn says nothing, where a missing gap only makes
    // neighbours touch.
    const subject = subjectOf("full");
    const narrow = volumeFrame(
      timeFrame(45, DENSITY, subject),
      VOLUME_HEIGHT,
      subject.bars,
    );

    expect(45 / 30).toBe(1.5);
    expect(narrow.columnWidth).toBe(1.5);
    expect(narrow.stems).toBe(30);
  });

  it("draws one stem per pixel rather than one per bar below a pixel a bar", () => {
    // Regime three, on the recorded body whose density this product opens at:
    // 1,950 real minute bars at 0.372 px a bar. One stem per bar would be a 158 kB
    // path attribute at 1M; this is bounded by the plot's width instead.
    const subject = subjectOf("dense");
    const volume = volumeFrame(
      timeFrame(726, DENSITY, subject),
      VOLUME_HEIGHT,
      subject.bars,
    );

    expect(subject.bars.length).toBe(1950);
    expect(volume.columnWidth).toBe(1);
    expect(volume.stems).toBeLessThanOrEqual(726);
    expect(volume.stems).toBeGreaterThan(600);
  });

  it("draws one element at every density, which is what §1's constraint is about", () => {
    // `CHARTING.md` §1 is a count: one element per bar at the cap is 9,790 plot
    // elements and main-thread tasks of 137-254 ms. So the assertion that matters
    // is not how many stems there are but that they are all in **one** path, at
    // both ends of a 78x range in bar count.
    const sparse = subjectOf("full");
    const dense = subjectOf("dense");

    const one = volumeFrame(
      timeFrame(726, DENSITY, sparse),
      VOLUME_HEIGHT,
      sparse.bars,
    );
    const many = volumeFrame(
      timeFrame(726, DENSITY, dense),
      VOLUME_HEIGHT,
      dense.bars,
    );

    // One string, whatever the bar count — the element count does not move with
    // the data, which is the whole property.
    expect(typeof one.columns).toBe("string");
    expect(typeof many.columns).toBe("string");

    // And the string is bounded by the plot rather than by the series: 1,950 bars
    // produce at most 726 stems, so the attribute cannot grow past roughly the
    // 16.8 kB §10.3 measured however wide the window gets.
    expect(many.stems).toBeLessThan(dense.bars.length / 2);
    expect((many.columns ?? "").length).toBeLessThan(16_800);
  });

  it("keeps every pixel column's height at the maximum of the bars falling in it", () => {
    // **The property the reduction rests on** (§10.2), and the reason it is a
    // property rather than a stem count: a reduction that dropped the wrong bar
    // would produce a plausible chart, not a broken one.
    //
    // Asserted as two halves that together mean "the maximum", rather than by
    // recomputing the reduction — which would be the test agreeing with the code:
    //
    //   (a) every bar's pixel column has a stem, and no bar in it is taller than
    //       that stem — SVG's y grows downwards, so taller is a smaller y; and
    //   (b) every stem's top is the top of some bar in its own column, rather
    //       than a number of its own.
    const subject = subjectOf("dense");
    const time = timeFrame(726, DENSITY, subject);
    const volume = volumeFrame(time, VOLUME_HEIGHT, subject.bars);
    const drawn = stems(volume.columns ?? "");

    // Each bar's own x comes from the price plot — the same scale, which is the
    // point — and its own top from volume's domain.
    const y = linearScale(volumeDomain(subject.bars), [VOLUME_HEIGHT, 0]);
    const tops = new Map<number, number[]>();

    for (const reading of priceFrame(time, PLOT.height, subject.bars)
      .readings) {
      // The same column rule, from the price plot's own x: the pixel it falls
      // into, and the last slot sits at the width so it belongs to the last
      // column rather than to one past it.
      const centre = Math.min(Math.floor(reading.x), Math.ceil(726) - 1) + 0.5;
      const top = Math.round(scaleValue(y, reading.bar.volume) * 10) / 10;
      tops.set(centre, [...(tops.get(centre) ?? []), top]);
    }

    const stemAt = new Map(drawn.map((stem) => [stem.x, stem.top]));
    expect(stemAt.size).toBe(drawn.length);
    expect(tops.size).toBe(drawn.length);

    for (const [centre, barTops] of tops) {
      const top = stemAt.get(centre);
      expect(top, `column ${String(centre)}`).toBeDefined();
      // (a) nothing in this column reaches above the stem
      expect(top ?? Infinity).toBeLessThanOrEqual(Math.min(...barTops));
      // (b) and the stem is one of the bars rather than an invention
      expect(barTops).toContain(top);
    }
  });

  it("grows every column from a true zero at the plot's own baseline", () => {
    const subject = subjectOf("full");
    const volume = volumeFrame(
      timeFrame(PLOT.width, DENSITY, subject),
      VOLUME_HEIGHT,
      subject.bars,
    );

    // A bar chart whose baseline is not zero misstates every ratio a reader takes
    // off it, and volume's zero is the plot's own bottom rule.
    for (const stem of stems(volume.columns ?? "")) {
      expect(stem.baseline).toBe(VOLUME_HEIGHT);
      expect(stem.top).toBeGreaterThanOrEqual(0);
      expect(stem.top).toBeLessThanOrEqual(VOLUME_HEIGHT);
    }
  });

  it("touches the ceiling with the window's peak, which is what the proportion was sized for", () => {
    const subject = subjectOf("full");
    const volume = volumeFrame(
      timeFrame(PLOT.width, DENSITY, subject),
      VOLUME_HEIGHT,
      subject.bars,
    );

    // Unpadded: §9.2 took 88 px against "a window whose peak is 3.8x its typical
    // bar draws that bar at 23 px", and that is only true if the top of the domain
    // is the peak.
    expect(Math.min(...stems(volume.columns ?? "").map((s) => s.top))).toBe(0);
    expect(volume.peak).toMatch(/^\d+(\.\d+)?[KMB]?$/);
  });

  it("draws nothing at all for an answer with no bars in it", () => {
    const view = barSeriesFixtureView("empty");
    if (view.state !== "empty")
      throw new Error("the empty fixture is not empty");

    const subject: ChartSubject = {
      requested: view.series.coverage.requested,
      covered: view.series.coverage.covered,
      timeframe: view.series.timeframe,
      bars: view.series.bars,
    };
    const volume = volumeFrame(
      timeFrame(PLOT.width, DENSITY, subject),
      VOLUME_HEIGHT,
      subject.bars,
    );

    // No columns and no peak label — a peak of nothing is not zero shares traded,
    // it is no answer. The frame around it still draws, because the window is
    // still real.
    expect(volume.columns).toBeNull();
    expect(volume.peak).toBeNull();
  });
});
