import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesFixtureName } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import { VolumeChart } from "./VolumeChart.js";

// What a component test can and cannot see of the volume plot (Task 2.13.4).
//
// **It cannot see the plot.** jsdom applies no stylesheet, computes no layout
// and ships no `ResizeObserver`, so left alone this component measures a box of
// zero and draws a frame with no marks in it. `chart-geometry.test.ts` verifies
// the columns' arithmetic against recorded bodies, and
// `e2e/specs/security-price-chart.spec.ts` asks a real engine whether the thing
// is on the page, inside the Volume region, and stopping at the same pixel as
// the price line.
//
// What is left for this level is the **wiring** — that a measurement reaches the
// marks, that the two states with no window draw nothing, and the one claim
// below that is a property of the rendered DOM rather than of a coordinate.
//
// **Do not assert a coordinate here.** The box is invented; a test that pinned a
// pixel to it would be checking its own stub.

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

/**
 * The plot inside the axis it hangs on — which is the only way it renders.
 *
 * `useChartAxis` throws outside a `ChartAxis` on purpose; see
 * `chart-axis-context.ts` for why a fallback would be worse than a throw.
 */
function Chart({ view }: { readonly view: BarSeriesView }) {
  return (
    <ChartAxis view={view}>
      <VolumeChart symbol="NVDA" view={view} />
    </ChartAxis>
  );
}

function renderAt(name: BarSeriesFixtureName, width = 800, height = 88) {
  measureEverythingAt(width, height);
  return render(<Chart view={barSeriesFixtureView(name)} />);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("without a measurement", () => {
  it("renders rather than throwing, which is every render in jsdom", () => {
    const { container } = render(<Chart view={barSeriesFixtureView("full")} />);

    // The frame is there — it is CSS — and it carries no marks, because a
    // zero-width scale has no pixels to put them at.
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("path")).toBeNull();
  });

  it("draws a frame before the first answer arrives", () => {
    const { container } = render(<Chart view={{ state: "loading" }} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it.each(["refusedUnknownSymbol", "unavailable"] as const)(
    "draws nothing at all for %s, which has no window to be about",
    (fixture) => {
      const { container } = render(
        <Chart view={barSeriesFixtureView(fixture)} />,
      );

      // Not an empty frame — nothing. Neither member carries a series, so
      // neither carries a window, and a baseline under either would be the zero
      // of a scale nobody asked for.
      expect(container.querySelector("svg")).toBeNull();
    },
  );
});

describe("with a measured box", () => {
  it("draws the columns as one path, with a stroke width from the geometry", () => {
    const { container } = renderAt("full");

    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(1);

    // The width is a **coordinate** and comes from the geometry as an attribute,
    // which is `VOLUME-AND-WINDOW.md` §10.6's decision and the reason there is
    // no `--chart-volume-gap` token. A path with no stroke width renders a
    // 1px hairline whatever the density, which is a plausible chart at 1,950
    // bars and a wrong one at thirty.
    const stroke = paths[0]?.getAttribute("stroke-width");
    expect(stroke).not.toBeNull();
    expect(Number(stroke)).toBeGreaterThan(0);
  });

  it("draws no gridlines and no intraday times, unlike the plot above it", () => {
    const { container } = renderAt("full");

    // Every `<line>` on this plot is a seam or a coverage edge. The price chart
    // at the same width draws four or five horizontal gridlines; a horizontal
    // line here would be a value scale volume does not have — it is read
    // comparatively, this bar against its neighbours.
    const horizontal = [...container.querySelectorAll("line")].filter(
      (line) => line.getAttribute("y1") === line.getAttribute("y2"),
    );
    expect(horizontal).toHaveLength(0);

    // `sessionLabels: "ends"` — the first and last session date and nothing
    // between. The `full` fixture is a half-hour inside one session, so that is
    // one label; what matters is that there is no clock time anywhere.
    const labels = [...container.querySelectorAll("span")].map(
      (span) => span.textContent,
    );
    expect(labels.some((label) => /\d:\d\d/u.test(label))).toBe(false);
  });

  it("writes the window's peak in the gutter, and nothing else", () => {
    const { container } = renderAt("full");

    // One label and not a scale (§9.4). Volume's zero *is* the axis rule and
    // needs no label beside it, so a second one here would be a scale nobody
    // decided to draw.
    const gutter = container.querySelectorAll("span");
    const peaks = [...gutter].filter((span) =>
      /^[\d.]+[KMB]?$/u.test(span.textContent),
    );
    expect(peaks).toHaveLength(1);
  });

  it("has no peak label where there are no bars", () => {
    const { container } = renderAt("empty");

    // A peak of nothing is not zero shares traded — it is no answer. The frame
    // and the whole-plot uncovered ground are still drawn, because that window
    // *was* asked for.
    expect(container.querySelector("path")).toBeNull();
    expect(container.querySelectorAll("rect").length).toBeGreaterThan(0);
  });

  it("clips the columns so an end column cannot paint outside the plot", () => {
    const { container } = renderAt("full");

    // `scaleSlot` puts the first bar at x = 0 and the last at x = width, so a
    // column centred on either end has half of itself outside the frame — and
    // the canvas declares `overflow: visible`, which every other mark needs. At
    // thirty bars that is up to 14px of near-grey painted into the panel's
    // padding. The clip is what makes the end columns render half-width instead,
    // which is the accepted cost; without it they render *outside*.
    const path = container.querySelector("path");
    expect(path?.parentElement?.getAttribute("clip-path")).toMatch(/^url\(#/u);
  });

  it("states the peak and when it happened, for a reader who cannot see it", () => {
    const { container } = renderAt("full");

    // The plot, the one label and the dates are all `aria-hidden`; without this
    // paragraph the Volume region is a heading with nothing under it. It names
    // its own subject — `FRONTEND-STATE.md` §7 — so it cannot be mistaken for
    // the price chart's sentence.
    const alternative = container.querySelector("p")?.textContent ?? "";
    expect(alternative).toContain("NVDA volume chart");
    expect(alternative).toContain("The tallest column is");
    expect(alternative).toContain("Market feed");
  });
});

// **What the drawing costs, as a shape rather than as a stopwatch.**
//
// `CHARTING.md` §1's constraint is an element **count**: one element per bar at
// the 9,750-bar cap is 9,790 plot elements and five main-thread tasks of
// 137–254 ms, and at the default window it is no long task at all — which is
// exactly why this asserts a shape and not a duration. A timing gate in
// `pnpm test` measures the runner.
//
// The two bodies are **65× apart in bars** and the same state, so every
// difference between them is legitimate or is the defect. The seams are the one
// thing that legitimately moves, and they move with sessions.
//
// Break-verified: drawing one `<rect>` per bar in `VolumeChart.tsx` takes the
// count assertion red at 1,951 against 1.
describe("what the drawing costs", () => {
  function plotElementsFor(name: "full" | "dense") {
    const { container, unmount } = renderAt(name, 800, 88);
    const svg = container.querySelector("svg");

    const counts = {
      paths: svg?.querySelectorAll("path").length ?? -1,
      rects: svg?.querySelectorAll("rect").length ?? -1,
      lines: svg?.querySelectorAll("line").length ?? -1,
      columns: svg?.querySelector("path")?.getAttribute("d") ?? "",
    };

    unmount();
    return counts;
  }

  it("draws no element per bar, at sixty-five times the bars", () => {
    const thirty = plotElementsFor("full");
    const dense = plotElementsFor("dense");

    // **The evidence the inputs differed**, which is the half a pair of equal
    // counts cannot supply on its own: two identical bodies would also produce
    // identical counts. The path string is the thing that is allowed to grow.
    expect(dense.columns.length).toBeGreaterThan(thirty.columns.length * 5);

    // One path at thirty bars and one at 1,950.
    expect(dense.paths).toBe(thirty.paths);
    expect(dense.paths).toBe(1);
    expect(dense.rects).toBe(thirty.rects);

    // The seams move with **sessions**: `full` is a half-hour inside one
    // session and `dense` is five of them. That is the legitimate difference,
    // and it is bounded by the window rather than by the bar count.
    expect(dense.lines).toBeGreaterThanOrEqual(thirty.lines);
    expect(dense.lines).toBeLessThan(10);
  });
});
