import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import { PriceChart } from "./PriceChart.js";

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
// the marks, and that the two states with no window draw nothing at all — and
// the last two tests install a fake observer to check it.
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
    const { container } = render(
      <PriceChart view={barSeriesFixtureView("full")} />,
    );

    // The frame is there — it is CSS — and it carries no marks, because a
    // zero-width scale has no pixels to put them at. `linearScale` refuses that
    // range on purpose and `chart-geometry.ts` answers before it is asked.
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("path")).toBeNull();
  });

  it("draws a frame before the first answer arrives", () => {
    // §28's 500 ms is satisfied by the frame being there, not by the response
    // being fast. The element exists in `loading`, which is the whole rule.
    const { container } = render(<PriceChart view={{ state: "loading" }} />);

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it.each(["refusedUnknownSymbol", "unavailable"] as const)(
    "draws nothing at all for %s, which has no window to be about",
    (fixture) => {
      const { container } = render(
        <PriceChart view={barSeriesFixtureView(fixture)} />,
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

    const { container } = render(
      <PriceChart view={barSeriesFixtureView("full")} />,
    );

    const path = container.querySelector("path");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("d")).toMatch(/^M/);

    // The value gutter says something, which is the half of the frame that
    // needs a domain.
    expect(container.querySelectorAll("line").length).toBeGreaterThan(0);
  });

  it("draws a labelled axis and no line for an answer with no bars", () => {
    measureEverythingAt(800, 280);

    const { container } = render(
      <PriceChart view={barSeriesFixtureView("empty")} />,
    );

    expect(container.querySelector("path")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
