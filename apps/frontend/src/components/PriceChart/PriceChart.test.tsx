import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import { PriceChart } from "./PriceChart.js";
import { VolumeChart } from "./VolumeChart.js";

/**
 * A counter around the real frame builders, for the measurement at the bottom of
 * this file.
 *
 * **Re-pointed at the pair by Task 2.13.4 rather than replaced**, which is what
 * `VOLUME-AND-WINDOW.md` §15.1 asks of it: `chartFrame` was one call and is now
 * two — `timeFrame` in the wrapper above both plots, `priceFrame` in this
 * component — and a counter left on one of them would report zero while the
 * other was rebuilt on every pointer move. `timeFrame` is the expensive half:
 * it walks the trading calendar and builds the slot scale.
 *
 * `vi.hoisted` because `vi.mock`'s factory is hoisted above every `const` in the
 * module and would otherwise close over a variable in its temporal dead zone.
 * The wrappers call straight through, so every other test in this file runs
 * against the real geometry.
 */
const frameCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("./chart-geometry.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./chart-geometry.js")>();

  return {
    ...actual,
    timeFrame: (...args: Parameters<typeof actual.timeFrame>) => {
      frameCalls.count += 1;
      return actual.timeFrame(...args);
    },
    priceFrame: (...args: Parameters<typeof actual.priceFrame>) => {
      frameCalls.count += 1;
      return actual.priceFrame(...args);
    },
    volumeFrame: (...args: Parameters<typeof actual.volumeFrame>) => {
      frameCalls.count += 1;
      return actual.volumeFrame(...args);
    },
  };
});

/**
 * The chart as the route renders it: **inside the axis both plots hang on.**
 *
 * Not a convenience. `useChartAxis` throws outside a `ChartAxis` on purpose, and
 * the reason is in `chart-axis-context.ts`: a plot that fell back to building
 * its own axis would look right at every width where the two agreed, which is
 * every width until one of them was measured a frame later than the other.
 */
function Chart({
  view,
  pending = false,
}: {
  readonly view: BarSeriesView;
  readonly pending?: boolean;
}) {
  return (
    <ChartAxis view={view}>
      <PriceChart pending={pending} symbol="NVDA" view={view} />
    </ChartAxis>
  );
}

/**
 * **Both plots, inside one axis — the pair as the route renders it** (Task
 * 2.13.5).
 *
 * A separate harness from `Chart` rather than a change to it, because most of
 * this file is about what the *price* plot draws and a second plot in those
 * counts would be noise. The one place the pair is required is the
 * zero-recomputation guard, and it is required there absolutely: a guard
 * pointed at a component that is not on screen reports zero for the same reason
 * a counter wired to nothing does.
 */
function Pair({ view }: { readonly view: BarSeriesView }) {
  return (
    <ChartAxis view={view}>
      <PriceChart symbol="NVDA" view={view} />
      <VolumeChart symbol="NVDA" view={view} />
    </ChartAxis>
  );
}

// What a component test can and cannot see of a chart (Task 2.12.4).
//
// **It cannot see the chart.** jsdom applies no stylesheet, computes no layout
// and ships no `ResizeObserver`, so left alone this component measures a plot
// box of zero and draws a frame with no marks in it. That is correct behaviour
// rather than a limitation to route around, and the first three tests assert
// it: an unmeasured chart must render, not throw.
//
// `chart-geometry.test.ts` is where the coordinates are verified against the
// stored bars, and `e2e/specs/security-price-chart.spec.ts` is where a real
// engine is asked whether the thing is on the page and inside the right region.
// What is left for this level is the **wiring** — that a measurement reaches
// the marks, that the two states with no window draw nothing at all, and that
// the directional pair Task 2.12.5 added is never taken apart into a tint with
// no geometry under it. The tests that need a box install a fake observer.
//
// **Do not assert a coordinate here.** The rects below are invented; a test
// that pinned a pixel to them would be checking its own stub.

/** Sizes every element the same, which is all the wiring needs. */
function measureEverythingAt(width: number, height: number) {
  const observers: (() => void)[] = [];

  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    width,
    height,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    toJSON: () => ({}),
  });

  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        observers.push(callback);
      }
      observe() {
        // Fires immediately, as a real one does on `observe`.
        observers.forEach((callback) => {
          callback();
        });
      }
      disconnect() {
        /* nothing to tear down */
      }
      unobserve() {
        /* nothing to tear down */
      }
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("without a measurement", () => {
  it("renders rather than throwing, which is every render in jsdom", () => {
    const { container } = render(<Chart view={barSeriesFixtureView("full")} />);

    // The frame is there — it is CSS — and it carries no marks, because a
    // zero-width scale has no pixels to put them at. `linearScale` refuses that
    // range on purpose and `chart-geometry.ts` answers before it is asked.
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("path")).toBeNull();
  });

  it("draws a frame before the first answer arrives", () => {
    // §28's 500 ms is satisfied by the frame being there, not by the response
    // being fast. The element exists in `loading`, which is the whole rule.
    const { container } = render(<Chart view={{ state: "loading" }} />);

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it.each(["refusedUnknownSymbol", "unavailable"] as const)(
    "draws nothing at all for %s, which has no window to be about",
    (fixture) => {
      const { container } = render(
        <Chart view={barSeriesFixtureView(fixture)} />,
      );

      // A frame under a refusal would be a picture of a window nobody asked
      // for. The panel beneath already says what happened in a sentence.
      expect(container.querySelector("svg")).toBeNull();
    },
  );
});

describe("with a measurement", () => {
  it("draws the series once the element has a box", () => {
    measureEverythingAt(800, 280);

    const { container } = render(<Chart view={barSeriesFixtureView("full")} />);

    const path = container.querySelector("path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("d")).toMatch(/^M/);

    // The value gutter says something, which is the half of the frame that
    // needs a domain.
    expect(container.querySelectorAll("line").length).toBeGreaterThan(0);
  });

  it("draws the reference rule and the wash together, never one alone", () => {
    // The mechanism Task 2.12.5 owes: the washes differ by 1.009:1 under
    // `grayscale(1)`, so a tint with no rule under it is a chart with no
    // direction on it — rendering perfectly, and saying nothing. The geometry
    // returns them as one value, and this is the level that checks the
    // component does not take them apart again.
    measureEverythingAt(800, 280);

    const { container } = render(<Chart view={barSeriesFixtureView("full")} />);

    // Two paths: the close line, and the area — defined once in `<defs>` and
    // closed with a `Z`. Not four, and not two copies of the point string.
    const paths = [...container.querySelectorAll("path")];
    expect(paths).toHaveLength(2);

    const area = paths.find((path) => path.getAttribute("d")?.endsWith("Z"));
    expect(area).toBeDefined();

    // Drawn twice, clipped above and below the rule — which is the split that
    // makes the tint a function of position rather than of the window. Each
    // reference carries a class, because a `<use>` of a path with no fill of
    // its own renders **black** rather than nothing.
    const uses = [...container.querySelectorAll("use")];
    expect(uses).toHaveLength(2);
    for (const use of uses) {
      expect(use.getAttribute("class")).toMatch(/\S/);
      expect(use.getAttribute("href")).toBe(`#${area?.id ?? ""}`);
      expect(use.getAttribute("clip-path")).toMatch(/^url\(#.+\)$/);
    }

    // The two clips meet at the rule and cover the plot between them, so no
    // band of the area is left uncoloured and none is coloured twice.
    const rects = [...container.querySelectorAll("clipPath rect")];
    expect(rects).toHaveLength(2);
    const [above, below] = rects.map((rect) => ({
      y: Number(rect.getAttribute("y")),
      height: Number(rect.getAttribute("height")),
    }));
    expect(above?.y).toBe(0);
    expect(below?.y).toBe(above?.height);
    expect((above?.height ?? 0) + (below?.height ?? 0)).toBe(280);
  });

  it("draws a labelled axis and no line for an answer with no bars", () => {
    measureEverythingAt(800, 280);

    const { container } = render(
      <Chart view={barSeriesFixtureView("empty")} />,
    );

    expect(container.querySelector("path")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();

    // Neither the wash nor the rule under it: a datum with nothing measured
    // against it says a window opened at a price and nothing about what it did.
    expect(container.querySelectorAll("path")).toHaveLength(0);
    expect(container.querySelectorAll("use")).toHaveLength(0);
  });
});

// **What the picture puts in the accessibility tree** (Task 2.12.8).
//
// Three properties, and the reason they are here rather than in the browser is
// that every one of them is a fact about a DOM: what is exposed, what is
// hidden, and what the description on the one focusable element resolves to. A
// browser adds nothing to any of them, and `chart-alternative.test.ts` already
// owns the words.
//
// **Asserted as the concatenation a screen reader is handed**, never as a
// single element's text — `CLAUDE.md`'s rule, and it is load-bearing here
// because the alternative and the arrow-key hint are two elements that reach a
// listener as one description.
describe("what a screen reader is handed", () => {
  /** Everything the accessibility tree keeps, in order, as one string. */
  function exposedText(container: HTMLElement): string {
    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[aria-hidden='true']").forEach((hidden) => {
      hidden.remove();
    });
    return clone.textContent.replace(/\s+/gu, " ").trim();
  }

  it("states the chart in words where the picture is", () => {
    measureEverythingAt(800, 280);

    const { container } = render(
      <Chart view={barSeriesFixtureView("uncovered")} />,
    );

    // The sentence, and it is the coverage clause that matters: a listener is
    // told how much of the frame the line occupies, which is the fact that
    // reaches a sighted reader as a change of ground and has no other channel.
    expect(exposedText(container)).toContain(
      "The line covers the first 780 of 990 trading minutes in the window",
    );
  });

  it("keeps the sampled axis and value scale out of it", () => {
    measureEverythingAt(800, 280);

    const { container } = render(
      <Chart view={barSeriesFixtureView("dense")} />,
    );

    // The scale is niced and the time labels are sampled, so neither states an
    // exact figure — read aloud they are a dozen bare numbers with no subject
    // between them, immediately before a paragraph that gives the range in
    // words. What has to be true is that hiding them loses nothing: the high
    // and the low are in the sentence above, and every exact figure is in the
    // panel below.
    const exposed = exposedText(container);
    const labels = [
      ...container.querySelectorAll("div[aria-hidden='true'] > span"),
    ]
      .map((span) => span.textContent)
      .filter((text) => text !== "");

    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) expect(exposed).not.toContain(label);

    expect(exposed).toContain("The highest price on it is 234.76");
    expect(exposed).toContain("and the lowest 215.10");
  });

  it("points the chart's one tab stop at the alternative and then at the hint", () => {
    measureEverythingAt(800, 280);

    const { container } = render(
      <Chart view={barSeriesFixtureView("dense")} />,
    );

    // Resolved through the document, which is the half that can silently be
    // wrong: an `aria-describedby` naming an id that is not here describes
    // nothing and renders identically to one that works.
    const described = screen
      .getByRole("img", { name: "NVDA price chart" })
      .getAttribute("aria-describedby");
    expect(described).not.toBeNull();

    const resolved = (described ?? "")
      .split(/\s+/u)
      .map(
        (id) =>
          container.querySelector(`#${CSS.escape(id)}`)?.textContent ?? "",
      )
      .join(" ");

    // What they have arrived at, then what the keys do with it — in that order,
    // because a listener who is told how to operate something before being told
    // what it is has to hold the instruction until the subject arrives.
    expect(resolved).toContain(
      "NVDA price chart: a line of 1,950 closing prices",
    );
    expect(resolved.indexOf("a line of 1,950")).toBeLessThan(
      resolved.indexOf("left and right arrow keys"),
    );
  });

  it("says what an empty answer is, rather than leaving a chart-shaped silence", () => {
    measureEverythingAt(800, 280);

    const { container } = render(
      <Chart view={barSeriesFixtureView("empty")} />,
    );

    // No reading layer here — there is nothing to read — so the paragraph is
    // the whole of what a listener gets from the picture, and a chart with no
    // description in this state would be indistinguishable from one that failed
    // to load.
    expect(exposedText(container)).toContain("no line is drawn");
    expect(screen.queryByRole("img")).toBeNull();
  });

  // Added 2026-09-14 (§80). The pulse is a picture and jsdom draws nothing, so
  // what this level can assert is the mechanism: that it appears only when it is
  // asked for, that it goes **over** the chart rather than instead of it, and
  // that it says nothing to a listener. Whether it reads as a wait is
  // `Market/ChartPending` in the workshop, and when it appears is
  // `use-pending-panel.test.ts`.
  it("draws the pulse over a held chart, and only when asked", () => {
    measureEverythingAt(800, 280);

    const settled = render(<Chart view={barSeriesFixtureView("full")} />);
    const marks = settled.container.querySelectorAll("path, rect").length;
    expect(marks).toBeGreaterThan(0);
    settled.unmount();

    const { container } = render(
      <Chart pending view={barSeriesFixtureView("full")} />,
    );

    // The series is still there. Replacing it was the first design and it
    // collapsed the panel — see `held-series.ts`.
    expect(container.querySelectorAll("path, rect").length).toBe(marks);

    // And the panel is over it, hidden, adding no word to what a listener gets.
    const pulse = container.querySelector(
      "[aria-hidden='true'][class*=pending]",
    );
    expect(pulse).not.toBeNull();
    expect(exposedText(container)).not.toContain("pending");
  });

  // Moved here from `BarSeriesPanel.test.tsx` on 2026-09-14, with the sentence
  // itself. It is the same words in a different place, and the place is the
  // change: a reader met a grey box first and its explanation second, in the
  // smallest type on the panel.
  it("draws the reason on the frame, and says it once", () => {
    measureEverythingAt(800, 280);

    const { container } = render(
      <Chart view={barSeriesFixtureView("empty")} />,
    );

    expect(screen.getByText(/No bars stored for this window/)).toBeTruthy();

    // It still names the window that was asked for. A sentence that dropped it
    // would be "no data" with nothing to be about.
    expect(screen.getByText(/We asked for/).textContent).toContain("EDT");

    // Nothing to press: a window holding no bars is a correct answer about the
    // request, not a failure to retry.
    expect(screen.queryByRole("button")).toBeNull();

    // **And it is not spoken twice.** The block is `aria-hidden` because the
    // text alternative already carries all of it, so what a listener gets is one
    // copy — including the schedule clause, which had no spoken home until the
    // visible one moved. `exposedText` walks the tree a reader is handed.
    const exposed = exposedText(container);
    expect(exposed).toContain("Stored history is caught up overnight");
    expect(exposed).not.toContain("We asked for");
  });
});

// **The uncovered treatment reaches the DOM** (Task 2.12.7).
//
// The split with the other two levels is the usual one and it is worth stating,
// because the obvious test to write here is the wrong one.
// `chart-geometry.test.ts` owns *where* the wash and the edge go — it is the
// only level that can, since a coordinate needs arithmetic rather than a
// layout — and `e2e/specs/security-price-chart.spec.ts` owns whether the wash
// *paints*, since no stylesheet is applied here. What is left is the wiring:
// that a coverage span becomes an element, and that the three marks derived
// from bars carry the clip.
describe("what the coverage treatment renders", () => {
  /**
   * The uncovered grounds, by position rather than by class name.
   *
   * A direct child of the SVG: the only other `<rect>`s this chart draws are
   * the two inside `<clipPath>` elements, and a CSS Module's hashed class is
   * not a thing to assert on.
   */
  function grounds(container: HTMLElement): readonly Element[] {
    return [...(container.querySelector("svg")?.children ?? [])].filter(
      (child) => child.tagName === "rect",
    );
  }

  it("puts a ground behind the span that was asked for and is not held", () => {
    measureEverythingAt(800, 280);

    const { container } = render(
      <Chart view={barSeriesFixtureView("uncovered")} />,
    );

    const [ground, ...rest] = grounds(container);
    expect(rest).toEqual([]);
    // Full height and stopping at the frame's right-hand side. The `x` is the
    // geometry's and is asserted there; what this level can see is that a span
    // became an element with the shape of a region rather than of a mark.
    expect(ground?.getAttribute("height")).toBe("280");
    expect(
      Number(ground?.getAttribute("x")) + Number(ground?.getAttribute("width")),
    ).toBe(800);
  });

  it("clips the line, the wash and the reference rule to the data", () => {
    // **The decision this task took rather than inherited.** The rule ran the
    // full plot width when it shipped; it describes the bars, so it stops where
    // they do. All three carry the same clip, which is what makes "the rule
    // says one thing and the line another" unrepresentable.
    measureEverythingAt(800, 280);

    const { container } = render(
      <Chart view={barSeriesFixtureView("uncovered")} />,
    );

    const series = container.querySelector("path[d^='M']:not([d$='Z'])");
    expect(series?.getAttribute("clip-path")).toMatch(/^url\(#.+\)$/);

    // The washes are clipped as a pair rather than individually: an element
    // takes one `clip-path` and each `<use>` already spends its own on the
    // split at the rule.
    const washes = container.querySelectorAll("use");
    expect(washes).toHaveLength(2);
    const group = washes[0]?.parentElement;
    expect(group?.tagName).toBe("g");
    expect(group?.getAttribute("clip-path")).toBe(
      series?.getAttribute("clip-path"),
    );

    // Every clipped mark shares one clip. Three references to it, and the rule
    // is the third — this is the assertion that would go red if a later tidy-up
    // let it run to the frame again.
    const clipped = container.querySelectorAll(
      `[clip-path="${series?.getAttribute("clip-path") ?? ""}"]`,
    );
    expect(clipped).toHaveLength(3);
  });

  it("washes the whole plot for an answer with nothing in it, and none of it while it waits", () => {
    // The pair that carries `empty`'s entire drawn content. `loading` and
    // `empty` are the same frame; the wash is what says one of them has been
    // answered.
    measureEverythingAt(800, 280);

    const answered = render(<Chart view={barSeriesFixtureView("empty")} />);
    const [whole, ...more] = grounds(answered.container);
    expect(more).toEqual([]);
    expect(whole?.getAttribute("x")).toBe("0");
    expect(whole?.getAttribute("width")).toBe("800");

    answered.unmount();

    const waiting = render(<Chart view={{ state: "loading" }} />);
    expect(grounds(waiting.container)).toEqual([]);
  });

  it("draws no ground and no clip for an answer that covers its window", () => {
    // A complete answer must carry none of this, and it must carry none of it
    // *by arithmetic* rather than by a branch — the covered span is the frame,
    // so there is nothing to wash and nothing to clip against.
    measureEverythingAt(800, 280);

    const { container } = render(<Chart view={barSeriesFixtureView("full")} />);

    expect(grounds(container)).toEqual([]);
    expect(container.querySelectorAll("[clip-path]")).toHaveLength(2);
  });
});

// **The repair Task 2.12.4's amendment assigned to this task, measured** — and
// the amendment's own instruction is that a repair must not be reported without
// a measurement after it.
//
// The problem it names: `chartFrame` is called in `PriceChart`'s render body
// with no memoisation, and it walks the trading calendar day by day, re-derives
// the price domain and rebuilds a 1,950-point path string. Nothing re-rendered
// this component before today, which is why 2.12.4 leaving it unmemoised was
// not a defect. **A crosshair is what would have made it one**, because a
// crosshair re-renders on every pointer move and every arrow press.
//
// Two repairs were on offer and the amendment said the second was structurally
// stronger: memoise the frame, or keep the crosshair's state out of the
// component that computes it. This is the second, and the difference is exactly
// what this test can see: a `useMemo` would make the recomputation *conditional*
// on a dependency array somebody has to keep right, and would still re-render
// this component. Here the component does not render at all.
describe("what a reading costs", () => {
  it("recomputes the frame zero times across forty arrow presses", () => {
    measureEverythingAt(800, 280);

    // **The pair, since Task 2.13.5.** The read position moved into `ChartAxis`
    // so that one reading can drive marks in two regions, and the way that goes
    // wrong is a single context: a read position on `ChartAxisValue` is handed
    // to every `useChartAxis()` caller and **both frame owners are callers**, so
    // a pointer move would rebuild a 1,950-point path string and a 726-stem
    // silhouette to move one vertical rule. The page would look perfect.
    //
    // So this renders both plots and counts all three builders. A guard pointed
    // at a component that is not on screen reports zero for the same reason a
    // counter wired to nothing does.
    const { rerender } = render(<Pair view={barSeriesFixtureView("full")} />);

    const chart = screen.getByRole("img", { name: "NVDA price chart" });
    fireEvent.focus(chart);

    // Whatever mounting and measuring cost, which is two or three: the first
    // render has no box, the observer fires, and the measured render follows.
    // The number that matters is the *difference*.
    const afterMount = frameCalls.count;
    expect(afterMount).toBeGreaterThan(0);

    for (let press = 0; press < 40; press += 1) {
      fireEvent.keyDown(chart, {
        key: press % 2 === 0 ? "ArrowLeft" : "ArrowRight",
      });
    }

    // And the reading did move, so this is a measurement of a working crosshair
    // rather than of a component that ignores the keyboard. The invitation is
    // gone from the *live* line; the hidden copy that reserves the row's height
    // is `aria-hidden`, which is exactly the claim *this is not for a reader*.
    expect(frameCalls.count - afterMount).toBe(0);
    expect(
      screen.queryByText(/Point at the chart/u, {
        ignore: "[aria-hidden='true'], [aria-hidden='true'] *",
      }),
    ).toBeNull();

    // **And the instrument is live**, which is the half of this that a zero
    // cannot demonstrate on its own: a counter wired to nothing also reports
    // zero. `CLAUDE.md`'s rule is that a break which does not go red is equally
    // evidence the break did not land, so the substitution is performed here —
    // a render this component genuinely has to answer, which recomputes.
    rerender(<Pair view={barSeriesFixtureView("partial")} />);
    expect(frameCalls.count).toBeGreaterThan(afterMount);
  });
});

// **What the drawing costs, as a shape rather than as a stopwatch** (Task
// 2.12.9).
//
// `CHARTING.md` §1 decided hand-built SVG over four libraries on one constraint
// above all: **SVG does not scale to one element per bar.** 9,750 candle groups
// measured 29,260 DOM nodes and a 296 ms main-thread task against
// `PRODUCT_SPEC.md` §28's 50 ms, and the line is one `<path>` at any point
// count. Task 2.12.9 re-took that in the real component in a real browser and
// the budget holds — with the same break performed to prove the instrument:
// drawing one `<rect>` per bar puts 9,790 elements in the plot and five tasks
// of 137–254 ms on the main thread.
//
// **This test is that finding made mechanical**, which is what `CLAUDE.md`'s gap
// list asks of an entry that can be. It asserts no milliseconds — a wall-clock
// assertion in `pnpm test` would be flaky on a busy runner and would be
// measuring the runner — and instead asserts the property the milliseconds
// follow from: **nothing in the plot scales with the bar count.**
//
// The two bodies are 65× apart in bars and the same state, so every difference
// between them is legitimate or is the defect. The seams are the one thing that
// legitimately moves, and they move with **sessions**.
describe("what the drawing costs", () => {
  function plotOf(name: "dense" | "full") {
    const { container, unmount } = render(
      <Chart view={barSeriesFixtureView(name)} />,
    );
    const svg = container.querySelector("svg");

    const counts = {
      elements: svg?.querySelectorAll("*").length ?? 0,
      lines: svg?.querySelectorAll("line").length ?? 0,
      paths: svg?.querySelectorAll("path").length ?? 0,
      rects: svg?.querySelectorAll("rect").length ?? 0,
      uses: svg?.querySelectorAll("use").length ?? 0,
      series: svg?.querySelector("path")?.getAttribute("d")?.length ?? 0,
    };

    unmount();
    return counts;
  }

  it("draws no element per bar, at sixty-five times the bars", () => {
    measureEverythingAt(800, 280);

    const few = plotOf("full"); // 30 bars, one session
    const many = plotOf("dense"); // 1,950 bars, five sessions

    // The instrument first, because a pair of equal counts proves nothing if
    // the two bodies are the same body. The path string is the one thing that
    // is *meant* to grow with the bars, and it grows by a factor of 60-odd.
    expect(many.series).toBeGreaterThan(few.series * 20);

    // Everything that is not a line is identical: the series path and the wash
    // definition, the two wash clip rects, the two `<use>` elements.
    expect(many.paths).toBe(few.paths);
    expect(many.rects).toBe(few.rects);
    expect(many.uses).toBe(few.uses);

    // And the lines differ by the session seams alone — four sessions' worth of
    // boundary against one's, at the same gridline count for the same height.
    expect(many.lines - few.lines).toBe(3);

    // The ceiling, stated so the failure names the thing rather than an
    // arithmetic difference: two dozen elements and change. A per-bar mark puts
    // this in the thousands, which is the state `CHARTING.md` §1 measured at
    // 296 ms.
    expect(many.elements).toBeLessThan(40);
  });
});
