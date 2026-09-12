import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import {
  READING_ANNOUNCEMENT_DELAY_MS,
  chartDensity,
  formatBarInstant,
  formatPrice,
} from "../../market/index.js";
import { ChartReading } from "./ChartReading.js";
import type { ChartFrame, ChartSubject } from "./chart-geometry.js";
import { chartFrame } from "./chart-geometry.js";

// **The keyboard path, and the cleared state** (Task 2.12.6).
//
// This is the level the task brief assigns those two, and the split is the usual
// one for this chart: `chart-geometry.test.ts` verifies the coordinates against
// the store, `e2e/specs/security-price-chart.spec.ts` drives a real pointer, and
// this checks the model in between — which keys move a reading, what a reading
// says, and what is left when it is cleared.
//
// **The readings come from `chartFrame` against a recorded body**, not from
// hand-written points. A crosshair tuned against invented geometry is a
// crosshair verified against nothing: the ordering of the slots, the clamping at
// the ends and the pixels the disc sits at are all properties of the real
// arithmetic, and a fake would be free to be wrong about all three.

const PLOT = { width: 867, height: 280 };

function frameOf(name: "full" | "partial"): ChartFrame {
  const view = barSeriesFixtureView(name);
  if (view.state !== "loaded" && view.state !== "partial")
    throw new Error(`the ${name} fixture is not an answer with bars`);

  const subject: ChartSubject = {
    requested: view.series.coverage.requested,
    timeframe: view.series.timeframe,
    bars: view.series.bars,
  };

  return chartFrame(PLOT, chartDensity(923), subject);
}

function renderReading(name: "full" | "partial" = "full") {
  const frame = frameOf(name);
  const result = render(
    <ChartReading
      plot={PLOT}
      readings={frame.readings}
      slots={frame.slots}
      symbol="NVDA"
    />,
  );

  return { ...result, frame };
}

/** The one tab stop this chart has. */
function chart() {
  return screen.getByRole("img", { name: "NVDA price chart" });
}

/**
 * The strip under the axis, by what it is rather than by a class name.
 *
 * Found through a marker inside it and then walked up to the paragraph: the
 * figures are separate elements, so a text query lands on one of them and
 * `CLAUDE.md`'s rule is to assert the concatenation a screen reader is handed
 * rather than a fragment of it.
 */
function readout(): HTMLElement {
  const marker = screen.getByText(/Point at the chart|·/u);
  const strip = marker.closest("p");
  if (strip === null) throw new Error("the readout strip lost its paragraph");
  return strip;
}

/**
 * Let a pending announcement land.
 *
 * Inside `act`, which is not ceremony: `fireEvent` wraps its own state updates
 * and a timer firing outside one does not flush, so a region asserted straight
 * after `advanceTimersByTime` holds the sentence *before* the one under test.
 * That failure looks exactly like a pacing bug in the component.
 */
function settle(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("what a person reaches", () => {
  it("is one element, whatever the series holds", () => {
    const { frame } = renderReading();

    // The naive implementation is a focusable element per bar. This window has
    // hundreds and the default window has 1,950 — `CHARTING.md` §1's
    // element-count constraint forbids it outright, and this is the assertion
    // that would go red if somebody built it that way.
    expect(frame.readings.length).toBeGreaterThan(10);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(chart().getAttribute("tabindex")).toBe("0");
  });

  it("carries an explanation attached to something a key press can reach", () => {
    // Story 2.11's defect, written into the one place it would otherwise be
    // repeated: a description on an element nothing can focus is a sentence
    // nobody is ever read. This element is focusable, so `aria-describedby` on
    // it is reachable.
    renderReading();

    const describedBy = chart().getAttribute("aria-describedby") ?? "";
    const hint = document.getElementById(describedBy);

    expect(hint?.textContent).toMatch(/arrow keys/u);
    expect(hint?.textContent).toMatch(/Escape/u);
  });

  it("says nothing at all before anybody has pointed at it", () => {
    renderReading();

    // Silent on arrival — `FRONTEND-STATE.md` §7's fourth clause. The region is
    // present so a screen reader is watching it, and it is empty.
    expect(screen.getByRole("status").textContent).toBe("");

    // And the strip holds the invitation rather than a blank, which is the only
    // thing on this page that says the keyboard path exists.
    expect(screen.getByText(/Point at the chart/u)).toBeTruthy();
  });

  it("renders nothing at all when there is nothing to read", () => {
    // A tab stop that answers no key press wastes a press, and "point at the
    // chart to read a bar" over a chart with no bars is an instruction that does
    // not work. What those states *look* like is Task 2.12.7's.
    render(
      <ChartReading plot={PLOT} readings={[]} slots={null} symbol="NVDA" />,
    );

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("the keyboard path", () => {
  it("opens on the last bar, so focus is never a state with nothing in it", () => {
    const { frame } = renderReading();
    const last = frame.readings[frame.readings.length - 1];

    fireEvent.focus(chart());

    // The most recent price, which is the figure already on screen above the
    // plot. A person arriving by Tab sees the reading agree with the headline
    // rather than a chart that has visibly changed and said nothing.
    expect(readout().textContent).toContain(
      formatBarInstant(last?.bar.startsAt ?? new Date()),
    );
    expect(readout().textContent).toContain(formatPrice(last?.bar.close ?? 0));
  });

  it("steps one bar at a time with the arrows", () => {
    const { frame } = renderReading();
    const readings = frame.readings;

    fireEvent.focus(chart());
    fireEvent.keyDown(chart(), { key: "ArrowLeft" });

    const secondToLast = readings[readings.length - 2];
    expect(readout().textContent).toContain(
      formatBarInstant(secondToLast?.bar.startsAt ?? new Date()),
    );

    fireEvent.keyDown(chart(), { key: "ArrowRight" });
    expect(readout().textContent).toContain(
      formatBarInstant(
        readings[readings.length - 1]?.bar.startsAt ?? new Date(),
      ),
    );
  });

  it("reaches the ends with Home and End, and stops there", () => {
    const { frame } = renderReading();
    const readings = frame.readings;

    fireEvent.focus(chart());
    fireEvent.keyDown(chart(), { key: "Home" });
    expect(readout().textContent).toContain(
      formatBarInstant(readings[0]?.bar.startsAt ?? new Date()),
    );

    // Past the start is the start. A clamp rather than a wrap: a reading that
    // jumped from the first minute of the window to the last would be a
    // navigation nobody asked for.
    fireEvent.keyDown(chart(), { key: "ArrowLeft" });
    expect(readout().textContent).toContain(
      formatBarInstant(readings[0]?.bar.startsAt ?? new Date()),
    );

    fireEvent.keyDown(chart(), { key: "End" });
    expect(readout().textContent).toContain(
      formatBarInstant(
        readings[readings.length - 1]?.bar.startsAt ?? new Date(),
      ),
    );
  });

  it("clears the reading on Escape and leaves the chart focused", () => {
    renderReading();

    chart().focus();
    fireEvent.keyDown(chart(), { key: "ArrowLeft" });
    expect(screen.queryByText(/Point at the chart/u)).toBeNull();

    fireEvent.keyDown(chart(), { key: "Escape" });

    // The strip returns to the invitation — the same height, so nothing below
    // it moves — and focus stays where it was, which is only legible because
    // the focus ring is on the plot rather than on a disc that has just gone.
    expect(screen.getByText(/Point at the chart/u)).toBeTruthy();
    expect(document.activeElement).toBe(chart());
  });

  it("lets an Escape through when there is nothing to clear", () => {
    // An Escape on a chart with no reading belongs to whatever is above this —
    // a dialog, a popover — and swallowing it would make this the component
    // that broke them.
    renderReading();

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    chart().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("takes Home and End away from the page, which would otherwise scroll it", () => {
    // The one `preventDefault` that is not optional. A chart that jumped the
    // document to its top on every Home would be worse than one with no
    // keyboard path at all.
    renderReading();
    chart().focus();

    for (const key of ["Home", "End", "ArrowLeft", "ArrowRight"]) {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      chart().dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }

    // And a key it does not handle is left alone, so Tab still leaves.
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    chart().dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it("clears the reading when focus leaves", () => {
    renderReading();

    fireEvent.focus(chart());
    expect(screen.queryByText(/Point at the chart/u)).toBeNull();

    fireEvent.blur(chart());
    expect(screen.getByText(/Point at the chart/u)).toBeTruthy();
  });
});

describe("the reading itself", () => {
  it("states all four prices, which is why a line of closes was allowed", () => {
    // `CHARTING.md` §2 chose a line over candlesticks on the measurement that a
    // candle would be 0.47px wide — *on the grounds that this readout exists*.
    // A strip showing only the close would retroactively make that wrong.
    const { frame } = renderReading();
    const last = frame.readings[frame.readings.length - 1]?.bar;

    fireEvent.focus(chart());
    const text = readout().textContent;

    for (const price of [last?.open, last?.high, last?.low, last?.close]) {
      expect(text).toContain(formatPrice(price ?? 0));
    }
  });

  it("labels the bar's change, because three things on this page say up or down", () => {
    // The headline says what the **window** did, the wash says where the price
    // is against the window's open, and this says what **one bar** did. All
    // three can disagree at once and each is right while they do, so the label
    // is what tells them apart — the same thing that keeps `LAST SESSION CLOSE`
    // apart from the current value one region up.
    renderReading();
    fireEvent.focus(chart());

    expect(readout().textContent).toContain("Bar");
  });

  it("draws one crosshair and one disc, never one per bar", () => {
    const { container, frame } = renderReading();
    fireEvent.focus(chart());

    expect(frame.readings.length).toBeGreaterThan(10);
    expect(container.querySelectorAll("line")).toHaveLength(1);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });

  it("puts the disc on the bar's own drawn point", () => {
    const { container, frame } = renderReading();
    const last = frame.readings[frame.readings.length - 1];

    fireEvent.focus(chart());
    const disc = container.querySelector("circle");

    // The same pixel the path was built from — not a recomputed one. A second
    // derivation agrees with the first almost everywhere and puts the disc
    // beside the line where it does not.
    expect(Number(disc?.getAttribute("cx"))).toBe(last?.x);
    expect(Number(disc?.getAttribute("cy"))).toBe(last?.y);
  });
});

describe("what is announced", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("speaks a keyboard reading, after it settles", () => {
    renderReading();

    fireEvent.focus(chart());
    fireEvent.keyDown(chart(), { key: "Home" });

    // Not yet: the region waits, exactly as search's does, so a walk along a
    // session does not queue a sentence per bar.
    expect(screen.getByRole("status").textContent).toBe("");

    settle(READING_ANNOUNCEMENT_DELAY_MS);

    const spoken = screen.getByRole("status").textContent;
    expect(spoken.startsWith("NVDA price chart:")).toBe(true);
    expect(spoken).toContain("on the bar");
  });

  it("says nothing at all for a pointer, however far it moves", () => {
    const { container } = renderReading();

    // A live region driven per pointer-move is actively hostile, and the person
    // moving a mouse is not the person listening. The *visible* readout follows
    // — that is asserted below — and the spoken one does not.
    const reader = chart();
    vi.spyOn(reader, "getBoundingClientRect").mockReturnValue({
      width: PLOT.width,
      height: PLOT.height,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: PLOT.width,
      bottom: PLOT.height,
      toJSON: () => ({}),
    });

    for (const clientX of [10, 200, 400, 600, 860]) {
      fireEvent.pointerMove(reader, { clientX });
    }
    settle(5_000);

    expect(screen.getByRole("status").textContent).toBe("");
    // …and the crosshair did move, so this is a decision about speech rather
    // than a pointer that does nothing.
    expect(container.querySelector("circle")).not.toBeNull();
  });

  it("says a reading was cleared, because Escape is a thing the person did", () => {
    renderReading();

    fireEvent.focus(chart());
    fireEvent.keyDown(chart(), { key: "Home" });
    settle(5_000);
    fireEvent.keyDown(chart(), { key: "Escape" });
    settle(5_000);

    expect(screen.getByRole("status").textContent).toContain("reading cleared");
  });
});
