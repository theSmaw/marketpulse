import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import {
  chartDensity,
  formatBarInstant,
  formatVolumeExact,
  volumePeak,
} from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import { ChartReading } from "./ChartReading.js";
import type { ChartSubject } from "./chart-geometry.js";
import { priceFrame, timeFrame, volumeFrame } from "./chart-geometry.js";
import { VolumeReading } from "./VolumeReading.js";

// **The second half of one reading** (Task 2.13.5).
//
// The split is this chart's usual one: `chart-geometry.test.ts` verifies the
// coordinates against recorded bodies, `e2e/specs/security-price-chart.spec.ts`
// drives a real pointer at three viewports, and this checks the model in
// between — what the strip says in each of its two states, and the property
// that makes two strips one reading.
//
// The readings come from the real geometry against a recorded body. A crosshair
// verified against invented points is verified against nothing.

const PRICE = { width: 867, height: 280 };
const VOLUME = { width: 867, height: 88 };

function framesOf(name: "full" | "dense") {
  const view = barSeriesFixtureView(name);
  if (view.state !== "loaded" && view.state !== "partial")
    throw new Error(`the ${name} fixture is not an answer with bars`);

  const subject: ChartSubject = {
    requested: view.series.coverage.requested,
    covered: view.series.coverage.covered,
    timeframe: view.series.timeframe,
    bars: view.series.bars,
  };

  const time = timeFrame(PRICE.width, chartDensity(923), subject);

  return {
    view,
    bars: subject.bars,
    time,
    price: priceFrame(time, PRICE.height, subject.bars),
    volume: volumeFrame(time, VOLUME.height, subject.bars),
  };
}

/**
 * **Both overlays, inside one axis** — which is the arrangement under test as
 * much as it is a harness. The price layer is what a key press reaches; the
 * volume layer answers a pointer; there is one read position and it is one
 * level above both of them.
 */
function renderPair(name: "full" | "dense" = "full") {
  const frames = framesOf(name);

  const result = render(
    <ChartAxis view={frames.view}>
      <ChartReading
        plot={PRICE}
        readings={frames.price.readings}
        slots={frames.time.slots}
        symbol="NVDA"
        timeframe={frames.time.axis?.timeframe ?? null}
      />
      <VolumeReading
        peakBar={frames.volume.peakBar}
        plot={VOLUME}
        readings={frames.volume.readings}
        slots={frames.time.slots}
        timeframe={frames.time.axis?.timeframe ?? null}
      />
    </ChartAxis>,
  );

  return { ...result, ...frames };
}

/** The one tab stop the pair has. */
function chart() {
  return screen.getByRole("img", { name: "NVDA price chart" });
}

/**
 * The volume strip's live line.
 *
 * The whole strip is `aria-hidden` — see `VolumeReading.tsx` for why — so it is
 * found by class rather than by role, and the two hidden reservations are told
 * apart from the live line by `visibility`, which jsdom does not compute. They
 * are told apart here by position instead: the live line is the **last** child
 * of the strip, which is the order the component renders them in and the order
 * a one-cell grid requires.
 */
function volumeStrip(container: HTMLElement): HTMLElement {
  const strips = container.querySelectorAll("p");
  const strip = strips[strips.length - 1];
  const live = strip?.lastElementChild;
  if (!(live instanceof HTMLElement))
    throw new Error("the volume strip lost its live line");
  return live;
}

describe("what the strip says", () => {
  it("states the window's peak, exactly, when nobody is pointing at it", () => {
    const { container, bars } = renderPair();

    const peak = volumePeak(bars);
    expect(peak).toBeGreaterThan(0);

    // **The exact integer and not the gutter's abbreviation** (§5a). The answer
    // to "where does the exact figure still exist" is this strip, and never
    // "in the API".
    expect(volumeStrip(container).textContent).toContain(
      formatVolumeExact(peak),
    );

    // And when it happened, which is the half of the resting state that makes
    // it a fact about a window rather than a number in a corner.
    const busiest = bars.find((bar) => bar.volume === peak);
    expect(volumeStrip(container).textContent).toContain(
      formatBarInstant(busiest?.startsAt ?? new Date(), "1m"),
    );
  });

  it("does not repeat the price strip's invitation", () => {
    const { container } = renderPair();

    // A second copy of a sentence about a keyboard path belonging to the plot
    // above is noise, and it would be two surfaces saying one thing — the
    // defect two strips exist to avoid rather than to commit.
    expect(volumeStrip(container).textContent).not.toContain("Point at the");
  });

  it("states the bar's own volume when the pair is read by keyboard", () => {
    const { container, bars, volume } = renderPair();

    fireEvent.focus(chart());
    fireEvent.keyDown(chart(), { key: "Home" });

    // **The first bar, reached through the price plot's keyboard path** — which
    // is the property that makes this one reading rather than two: nothing was
    // pointed at this plot at all.
    const first = volume.readings[0]?.bar;
    expect(first).toBe(bars[0]);
    expect(volumeStrip(container).textContent).toContain(
      formatVolumeExact(first?.volume ?? 0),
    );
    expect(volumeStrip(container).textContent).toContain(
      formatBarInstant(first?.startsAt ?? new Date(), "1m"),
    );
  });

  it("goes back to the peak when the reading is cleared", () => {
    const { container, bars } = renderPair();

    fireEvent.focus(chart());
    fireEvent.keyDown(chart(), { key: "Home" });
    fireEvent.keyDown(chart(), { key: "Escape" });

    expect(volumeStrip(container).textContent).toContain(
      formatVolumeExact(volumePeak(bars)),
    );
  });
});

describe("what it is not", () => {
  it("adds no tab stop, so the pair is still one", () => {
    const { container } = renderPair();

    // `CHARTING.md`'s bar, and the one this chart is held to at every density:
    // one tab stop and never one per bar. Everything the volume plot can state
    // is reachable from the stop above it.
    expect(container.querySelectorAll("[tabindex]")).toHaveLength(1);
  });

  it("adds no live region, so a key press still announces one sentence", () => {
    renderPair();

    // The page carries four polite regions and a reading is announced by
    // exactly one of them. Volume reaches a listener as a clause in that
    // sentence — `chart-reading.ts` — rather than as a fifth region queued
    // against the other four in an order no component controls.
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("renders nothing at all when there is nothing to read", () => {
    const { container } = render(
      <ChartAxis view={barSeriesFixtureView("full")}>
        <VolumeReading
          peakBar={null}
          plot={VOLUME}
          readings={[]}
          slots={null}
          timeframe={null}
        />
      </ChartAxis>,
    );

    // A peak of a window with no bars is not zero shares — it is no answer, and
    // the states that have no bars already say so in words.
    expect(container.querySelector("p")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("the reservation", () => {
  it("lays out both of its states, so neither can push the other down", () => {
    const { container } = renderPair();

    const strips = container.querySelectorAll("p");
    const strip = strips[strips.length - 1];

    // Three lines in one grid cell: a hidden reading, a hidden peak, and
    // whichever is live. **Both** states are content here, unlike the price
    // strip whose other state is a sentence — so both are reserved, and the row
    // is the taller of them at whatever width the page is.
    //
    // jsdom computes no layout, so this asserts the *shape* the reservation is
    // made of. Whether the height actually holds is
    // `e2e/specs/security-price-chart.spec.ts`'s, at three viewports, because
    // the middle one is the instrument.
    expect(strip?.children).toHaveLength(3);
    expect(strip?.getAttribute("aria-hidden")).toBe("true");
  });
});
