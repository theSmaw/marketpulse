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

  it("draws the reference rule and the wash together, never one alone", () => {
    // The mechanism Task 2.12.5 owes: the washes differ by 1.009:1 under
    // `grayscale(1)`, so a tint with no rule under it is a chart with no
    // direction on it — rendering perfectly, and saying nothing. The geometry
    // returns them as one value, and this is the level that checks the
    // component does not take them apart again.
    measureEverythingAt(800, 280);

    const { container } = render(
      <PriceChart view={barSeriesFixtureView("full")} />,
    );

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
      <PriceChart view={barSeriesFixtureView("empty")} />,
    );

    expect(container.querySelector("path")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();

    // Neither the wash nor the rule under it: a datum with nothing measured
    // against it says a window opened at a price and nothing about what it did.
    expect(container.querySelectorAll("path")).toHaveLength(0);
    expect(container.querySelectorAll("use")).toHaveLength(0);
  });
});
