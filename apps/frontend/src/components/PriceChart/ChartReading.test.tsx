import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import {
  READING_ANNOUNCEMENT_DELAY_MS,
  chartDensity,
  formatBarInstant,
  formatPrice,
} from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import { ChartReading } from "./ChartReading.js";
import type { ChartSubject } from "./chart-geometry.js";
import { priceFrame, timeFrame } from "./chart-geometry.js";

// **The keyboard path, and the cleared state** (Task 2.12.6).
//
// This is the level the task brief assigns those two, and the split is the usual
// one for this chart: `chart-geometry.test.ts` verifies the coordinates against
// the store, `e2e/specs/security-price-chart.spec.ts` drives a real pointer, and
// this checks the model in between — which keys move a reading, what a reading
// says, and what is left when it is cleared.
//
// **The readings come from the real geometry against a recorded body**, not from
// hand-written points. A crosshair tuned against invented geometry is a
// crosshair verified against nothing: the ordering of the slots, the clamping at
// the ends and the pixels the disc sits at are all properties of the real
// arithmetic, and a fake would be free to be wrong about all three.

const PLOT = { width: 867, height: 280 };

type Recorded = "full" | "partial" | "dense" | "daily";

function frameOf(name: Recorded) {
  const view = barSeriesFixtureView(name);
  if (view.state !== "loaded" && view.state !== "partial")
    throw new Error(`the ${name} fixture is not an answer with bars`);

  const subject: ChartSubject = {
    requested: view.series.coverage.requested,
    covered: view.series.coverage.covered,
    timeframe: view.series.timeframe,
    bars: view.series.bars,
  };

  // **Composed here rather than by the geometry**, since Task 2.13.4: one
  // `timeFrame` serves both plots and there is no longer a function that takes a
  // whole plot box, because a function that did could build an axis for one plot
  // out of the other's height.
  const time = timeFrame(PLOT.width, chartDensity(923), subject);
  return { ...time, ...priceFrame(time, PLOT.height, subject.bars) };
}

function renderReading(name: Recorded = "full") {
  const frame = frameOf(name);

  // **Inside a `ChartAxis`, since Task 2.13.5**, and not as ceremony: that
  // component owns the one read position both plots answer, and
  // `useChartReading` throws without it for `useChartAxis`'s reason — a reading
  // layer that fell back to private state is two plots pointing at two bars.
  // The frame this wrapper builds is not the one used below; the readings are
  // still the real geometry above, because what is under test here is the
  // model rather than the layout.
  const result = render(
    <ChartAxis view={barSeriesFixtureView(name)}>
      <ChartReading
        plot={PLOT}
        readings={frame.readings}
        slots={frame.slots}
        symbol="NVDA"
        timeframe={frame.axis?.timeframe ?? null}
      />
    </ChartAxis>,
  );

  return { ...result, frame };
}

/** The one tab stop this chart has. */
function chart() {
  return screen.getByRole("img", { name: "NVDA price chart" });
}

/**
 * The live half of the strip under the axis, by what it is rather than by a
 * class name.
 *
 * Found through a marker inside it and then walked up one level: the figures
 * are separate elements, so a text query lands on one of them and `CLAUDE.md`'s
 * rule is to assert the concatenation a screen reader is handed rather than a
 * fragment of it.
 *
 * **One level and not up to the paragraph, since Task 2.12.8.** The paragraph
 * now holds two lines in one grid cell — the live one and the hidden reading
 * that reserves its height — so its `textContent` is every figure twice. The
 * marker query ignores the hidden one for the same reason: it is
 * `aria-hidden`, which is exactly the claim *this is not for a reader*.
 */
function readout(): HTMLElement {
  const marker = screen.getByText(/·/u, { ignore: HIDDEN });
  const line = marker.parentElement;
  if (line === null) throw new Error("the readout strip lost its row");
  return line;
}

/**
 * What the strip is showing a **reader**, which at rest is nothing at all.
 *
 * Since 2026-09-14 the resting state carries no invitation, so "at rest" cannot
 * be asserted by finding a sentence — it is asserted by the live row being
 * empty while the hidden reading that reserves its height is not. That pair is
 * the whole mechanism, and a test that only looked at the first half would pass
 * against a strip that had stopped reserving anything.
 */
function resting(container: HTMLElement): boolean {
  const line = container.querySelector("p");
  const rows = [...(line?.children ?? [])];

  return (
    strip(container) === "" &&
    rows.some(
      (row) =>
        row.getAttribute("aria-hidden") === "true" && row.textContent !== "",
    )
  );
}

/** Everything the accessibility tree drops, as a selector. */
const HIDDEN = "[aria-hidden='true'], [aria-hidden='true'] *";

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
    const { container } = renderReading();

    // Silent on arrival — `FRONTEND-STATE.md` §7's fourth clause. The region is
    // present so a screen reader is watching it, and it is empty.
    expect(screen.getByRole("status").textContent).toBe("");

    // And the strip is blank to a reader while still holding its height open —
    // the invitation it used to carry went on 2026-09-14, and the hidden reading
    // beside it is now the only thing reserving the row.
    expect(resting(container)).toBe(true);
  });

  it("renders nothing at all when there is nothing to read", () => {
    // A tab stop that answers no key press wastes a press, and "point at the
    // chart to read a bar" over a chart with no bars is an instruction that does
    // not work. What those states *look* like is Task 2.12.7's.
    render(
      <ChartAxis view={barSeriesFixtureView("full")}>
        <ChartReading
          plot={PLOT}
          readings={[]}
          slots={null}
          symbol="NVDA"
          timeframe={null}
        />
      </ChartAxis>,
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
      formatBarInstant(last?.bar.startsAt ?? new Date(), "1m"),
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
      formatBarInstant(secondToLast?.bar.startsAt ?? new Date(), "1m"),
    );

    fireEvent.keyDown(chart(), { key: "ArrowRight" });
    expect(readout().textContent).toContain(
      formatBarInstant(
        readings[readings.length - 1]?.bar.startsAt ?? new Date(),
        "1m",
      ),
    );
  });

  it("reaches the ends with Home and End, and stops there", () => {
    const { frame } = renderReading();
    const readings = frame.readings;

    fireEvent.focus(chart());
    fireEvent.keyDown(chart(), { key: "Home" });
    expect(readout().textContent).toContain(
      formatBarInstant(readings[0]?.bar.startsAt ?? new Date(), "1m"),
    );

    // Past the start is the start. A clamp rather than a wrap: a reading that
    // jumped from the first minute of the window to the last would be a
    // navigation nobody asked for.
    fireEvent.keyDown(chart(), { key: "ArrowLeft" });
    expect(readout().textContent).toContain(
      formatBarInstant(readings[0]?.bar.startsAt ?? new Date(), "1m"),
    );

    fireEvent.keyDown(chart(), { key: "End" });
    expect(readout().textContent).toContain(
      formatBarInstant(
        readings[readings.length - 1]?.bar.startsAt ?? new Date(),
        "1m",
      ),
    );
  });

  it("clears the reading on Escape and leaves the chart focused", () => {
    const { container } = renderReading();

    chart().focus();
    fireEvent.keyDown(chart(), { key: "ArrowLeft" });
    expect(resting(container)).toBe(false);

    fireEvent.keyDown(chart(), { key: "Escape" });

    // The strip returns to its resting blank — the same height, so nothing below
    // it moves — and focus stays where it was, which is only legible because
    // the focus ring is on the plot rather than on a disc that has just gone.
    expect(resting(container)).toBe(true);
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
    const { container } = renderReading();

    fireEvent.focus(chart());
    expect(resting(container)).toBe(false);

    fireEvent.blur(chart());
    expect(resting(container)).toBe(true);
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

    // **`chart reading` and not `price chart`, since Task 2.13.5.** The
    // sentence now carries a fact from each plot, and the words it used to open
    // with are the price chart's text alternative's — two surfaces opening with
    // one phrase is the defect `CLAUDE.md` records happening three times in one
    // afternoon on the search screen.
    expect(spoken.startsWith("NVDA chart reading:")).toBe(true);
    expect(spoken).toContain("on the bar");

    // **And volume is a clause in it rather than a second announcement.** A
    // sighted reader meets the volume strip in the same instant; a listener
    // meets one region, so the one sentence carries what the two strips carry
    // between them.
    expect(spoken).toMatch(/Volume [\d.]+ (thousand|million|billion)\.$/u);
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

// --- Task 2.13.7: the reading across a window change ---

/**
 * The whole reading layer for one recorded window, as a component.
 *
 * A component rather than a call, because **the read position lives in
 * `ChartAxis`** and what is under test is what survives a re-render of the
 * series underneath it. Rendering the same element type at the root keeps that
 * state, which is exactly what a window change does to the real route: the
 * address changes, `useBarSeries` answers with different bars, and nothing
 * unmounts.
 */
function ReadingFor({ name }: { readonly name: Recorded }) {
  const frame = frameOf(name);

  return (
    <ChartAxis view={barSeriesFixtureView(name)}>
      <ChartReading
        plot={PLOT}
        readings={frame.readings}
        slots={frame.slots}
        symbol="NVDA"
        timeframe={frame.axis?.timeframe ?? null}
      />
    </ChartAxis>
  );
}

/**
 * The visible half of the readout strip, at **either** timeframe.
 *
 * `readout()` above anchors on the `1m` stamp's middle dot, which a `1d` stamp
 * does not have — a daily bar is a session, so it prints `Sep 4` and no time of
 * day. This one takes the paragraph and drops its `aria-hidden` children, which
 * is the hidden sizer that reserves the strip's height.
 */
function strip(container: HTMLElement): string {
  const line = container.querySelector("p");

  return [...(line?.children ?? [])]
    .filter((element) => element.getAttribute("aria-hidden") !== "true")
    .map((element) => element.textContent)
    .join("");
}

describe("a window change, with a reading still live", () => {
  // **The case that is hard to reach, and the reason it has to be tested here.**
  // Both input paths clear the reading on the way to the control — a pointer
  // travelling upward fires `onPointerLeave`, a keyboard user tabbing to it
  // blurs the plot — so a person cannot normally hold a reading across a
  // change. Epic 11's `setTimeWindow` has no pointer to leave, and a rapid
  // sequence of presses lands a second change while the first is in flight.
  // Nothing below touches a pointer.

  it("keeps the reading on the bar it was on when the new window still holds it", () => {
    const { container, rerender } = render(<ReadingFor name="dense" />);

    chart().focus();
    fireEvent.keyDown(chart(), { key: "End" });
    const before = strip(container);
    expect(before).toContain("Bar");

    // Five sessions of minute bars become sixty-three daily ones. The built
    // default here is a reading of **index 1,949 of sixty-three bars**, which
    // does not exist — so the crosshair would simply vanish, and on a longer
    // window it would land on a different year instead.
    rerender(<ReadingFor name="daily" />);

    const after = strip(container);
    expect(after).toContain("Bar");

    // A different sentence, because it is the same day at a different
    // granularity: `Sep 4 · 15:59 EDT` becomes `Sep 4`.
    expect(after).not.toBe(before);
    expect(after).toContain("Sep 4");
  });

  it("clears the reading when the new window does not reach the instant", () => {
    const { container, rerender } = render(<ReadingFor name="daily" />);

    chart().focus();
    fireEvent.keyDown(chart(), { key: "Home" });
    expect(strip(container)).toContain("Bar");

    // The oldest session of a three-month window, against a window that is one
    // half-hour. Clamping would answer with that half-hour's first minute,
    // presented as the bar the reader was looking at.
    rerender(<ReadingFor name="full" />);

    expect(resting(container)).toBe(true);
  });

  it("leaves focus exactly where Escape leaves it", () => {
    // `Escape`'s contract is that it clears the reading and **keeps** focus, and
    // a reading cleared by a window change has to behave identically — otherwise
    // an agent changing the window would silently take focus off the chart a
    // person was reading.
    const { rerender } = render(<ReadingFor name="daily" />);

    chart().focus();
    fireEvent.keyDown(chart(), { key: "Home" });
    rerender(<ReadingFor name="full" />);

    expect(document.activeElement).toBe(chart());
  });

  it("steps from where the reading actually is, not from where it was held", () => {
    // The half of the decision a bounds check alone would miss. After
    // re-anchoring, the index in the context still names the old position; a
    // key press that stepped from it would move the crosshair somewhere
    // unrelated to what the reader can see.
    const { container, rerender } = render(<ReadingFor name="dense" />);

    chart().focus();
    fireEvent.keyDown(chart(), { key: "End" });
    rerender(<ReadingFor name="daily" />);

    const landed = strip(container);
    fireEvent.keyDown(chart(), { key: "ArrowLeft" });
    const stepped = strip(container);

    expect(stepped).not.toBe(landed);

    // One bar back and no further: pressing right returns to exactly the bar
    // the re-anchor found.
    fireEvent.keyDown(chart(), { key: "ArrowRight" });
    expect(strip(container)).toBe(landed);
  });
});
