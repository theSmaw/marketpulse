import type { Meta, StoryObj } from "@storybook/react-vite";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import { chartDensity } from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import { ChartReading } from "./ChartReading.js";
import type { ChartSubject } from "./chart-geometry.js";
import { priceFrame, timeFrame } from "./chart-geometry.js";
import styles from "./ChartReading.stories.module.css";

// The crosshair and the readout, reviewable without a chart under them (Task
// 2.12.6).
//
// ## What a reviewer is being asked to judge
//
// Four things, and the first two are the ones a chart normally gets wrong.
//
//  - **The strip does not change size between its two states.** Point at the
//    chart and the invitation is replaced by a reading of exactly the same
//    height. A readout that grows when a pointer enters it moves every exact
//    figure stated beneath it, and nothing in this product may move while a
//    number is being read. `Resting` and `Reading` below are the comparison.
//  - **The resting state is the invitation, and it names both inputs.** Until
//    this component the chart was `aria-hidden` and carried no interaction at
//    all, so nothing on the page said the picture answers questions — and
//    nothing whatsoever said the keyboard path exists. A hint that appears only
//    on focus is a hint nobody reads.
//  - **The bar's change is labelled.** Three things on the Security Explorer
//    say up or down about three different subjects — the window, the price at a
//    point against the window's open, and this one bar — and all three can
//    disagree at once while every one of them is right.
//  - **One tab stop.** Press Tab in the story below and the whole plot takes the
//    global focus ring, opening on the last bar. Press it again and you are
//    past the chart. There is no per-bar stop and there never will be: the
//    default window is 1,950 bars.
//
// ## Why the plot behind it is a rectangle
//
// This component is the reading layer and nothing else — it draws a crosshair
// over whatever it is given and a strip underneath. Rendering a real chart here
// would be reviewing `PriceChart`'s stories a second time, and the thing worth
// looking at is the mark and the strip. The grid below is the one
// `PriceChart.module.css` declares, which is what these two elements are placed
// on in the product.
//
// The readings are real: a body recorded off the endpoint, through the real
// state transition, through the real geometry. A crosshair tuned against
// invented points is a crosshair verified against nothing.

const PLOT = { width: 726, height: 280 };

function frameOf(name: FixtureName) {
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

/**
 * The chart's own grid, with a stand-in where the plot would be.
 *
 * **Inside a `ChartAxis` since Task 2.13.5**: that component owns the one read
 * position both plots answer, and `useChartReading` throws without it rather
 * than falling back to private state. The frame it builds is not the one drawn
 * below — the readings here come from the real geometry at a fixed box, because
 * what is being reviewed is the mark and the strip rather than the layout.
 */
function Harness({ name }: { readonly name: FixtureName }) {
  const frame = frameOf(name);

  return (
    <ChartAxis view={barSeriesFixtureView(name)}>
      <div className={styles.chart}>
        <div className={styles.plot} />
        <ChartReading
          plot={PLOT}
          readings={frame.readings}
          slots={frame.slots}
          symbol="NVDA"
          timeframe={frame.axis?.timeframe ?? null}
        />
      </div>
    </ChartAxis>
  );
}

/** The recorded bodies these stories are read against. */
type FixtureName = "full" | "dense" | "daily";

const meta = {
  title: "Market/ChartReading",
  component: ChartReading,
} satisfies Meta<typeof ChartReading>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The args every story declares and every story's `render` ignores — the
 * component is driven by `Harness`, which builds its props from a real frame
 * over a recorded body. Declared because `satisfies Meta` requires them.
 */
const ARGS = {
  plot: PLOT,
  readings: [],
  slots: null,
  symbol: "NVDA",
  timeframe: null,
};

/**
 * **Nobody is pointing at it.** The strip holds the invitation, at the height a
 * reading will occupy.
 *
 * This is the state the chart is in almost all of the time, and it is the one
 * doing the work that used to be done by nothing: the previous chart gave a
 * reader no reason to believe the picture would answer a question.
 */
export const Resting: Story = {
  args: ARGS,
  render: () => <Harness name="full" />,
};

/**
 * **The same component with a pointer in it** — hover anywhere across the grey
 * plot and the crosshair follows, snapping to the nearest bar that exists.
 *
 * Two things to check by moving the pointer rather than by reading this. The
 * disc lands **on** the bar's own drawn point, never beside it; and the strip's
 * figures do not jitter as the reading changes, because every one of them is in
 * the data face and therefore tabular.
 */
export const Reading: Story = {
  args: ARGS,
  render: () => <Harness name="full" />,
};

/**
 * **The density the product actually opens at** — 1,950 bars, 0.47px each.
 *
 * The case that decides whether the snap is honest. Move one pixel and the
 * reading jumps two bars; the strip's timestamp is what makes that legible
 * rather than arbitrary, and it is the reason the instant leads the row instead
 * of trailing it.
 */
export const Dense: Story = {
  args: ARGS,
  render: () => <Harness name="dense" />,
};

/**
 * **A daily window** — the `3M` body, and the first `1d` series this strip has
 * ever been reviewed against.
 *
 * What to read is the leading **instant**: `Jun 12`, with no time and no zone,
 * because at `1d` a bar *is* a session. Every surface in this product that
 * prints a bar's instant printed one unconditionally until Task 2.13.6, and the
 * vendor stamps a daily bar at midnight market time — so this strip said
 * `Jun 12 · 00:00 EDT` about a session's whole trading. The repair is one
 * argument on `formatBarInstant`, which is the one function all five surfaces
 * already called.
 *
 * The four prices are the session's open, high, low and close, and the `BAR`
 * change is the session's own — which is a more interesting figure at `1d` than
 * at `1m`, where a minute's open and close are usually the same to three
 * decimals.
 */
export const Daily: Story = {
  args: ARGS,
  render: () => <Harness name="daily" />,
};
