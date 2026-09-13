import type { Meta, StoryObj } from "@storybook/react-vite";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import { chartDensity } from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import type { ChartSubject } from "./chart-geometry.js";
import { timeFrame, volumeFrame } from "./chart-geometry.js";
import { VolumeReading } from "./VolumeReading.js";
import styles from "./VolumeReading.stories.module.css";

// The volume plot's half of one reading (Task 2.13.5) — the same crosshair at
// the same pixel, and a strip that answers a different question.
//
// ## What a reviewer is being asked to judge
//
// Four things, and the second is the one this file exists for.
//
//  - **The strip does not change size between its two states.** Point at the
//    plot and the peak is replaced by a reading of exactly the same height.
//    Unlike the price strip, *both* of this one's states are content — a figure
//    and a figure — so both are laid out hidden in the same cell and the row is
//    the taller of them at whatever width the page is.
//  - **The resting state is a fact, not an invitation.** A second copy of
//    "point at the chart" would be noise: that sentence is on the page already
//    and it is about a keyboard path belonging to the plot above. This states
//    the window's peak and when it happened — the figure `PRODUCT_SPEC.md`
//    §11's anomaly and §38's demo line later qualify as a multiple.
//  - **The figure is exact.** `3,131,031` here against `3.13M` in the gutter:
//    abbreviate on the axis and in summaries, never in a reading.
//  - **The disc is at the bar's own volume**, which below a pixel per bar is
//    *not* the top of the ink under it. `Dense` is where to look — the
//    silhouette carries each pixel column's tallest bar and the disc carries
//    the one the crosshair snapped to, and the strip's instant is what makes
//    the difference honest rather than a mark that missed.
//
// ## Why the plot behind it is a rectangle
//
// `ChartReading.stories.tsx`'s reason: this component is the reading layer and
// nothing else. Rendering the real columns here would be reviewing
// `VolumeChart`'s stories a second time. The grid is the one
// `VolumeChart.module.css` declares, which is what these two elements are
// placed on in the product.
//
// The readings are real — a recorded body, through the real state transition,
// through the real geometry.

const PLOT = { width: 726, height: 88 };

function frameOf(name: "full" | "dense") {
  const view = barSeriesFixtureView(name);
  if (view.state !== "loaded" && view.state !== "partial")
    throw new Error(`the ${name} fixture is not an answer with bars`);

  const subject: ChartSubject = {
    requested: view.series.coverage.requested,
    covered: view.series.coverage.covered,
    timeframe: view.series.timeframe,
    bars: view.series.bars,
  };

  const time = timeFrame(PLOT.width, chartDensity(923), subject);
  return { time, volume: volumeFrame(time, PLOT.height, subject.bars) };
}

/** The volume chart's own grid, with a stand-in where the plot would be. */
function Harness({ name }: { readonly name: "full" | "dense" }) {
  const { time, volume } = frameOf(name);

  return (
    <ChartAxis view={barSeriesFixtureView(name)}>
      <div className={styles.chart}>
        <div className={styles.plot} />
        <VolumeReading
          peakBar={volume.peakBar}
          plot={PLOT}
          readings={volume.readings}
          slots={time.slots}
        />
      </div>
    </ChartAxis>
  );
}

const meta = {
  title: "Market/VolumeReading",
  component: VolumeReading,
} satisfies Meta<typeof VolumeReading>;

export default meta;

type Story = StoryObj<typeof meta>;

const ARGS = { peakBar: null, plot: PLOT, readings: [], slots: null };

/**
 * **Nobody is pointing at it** — the window's peak, exact, and the minute it
 * happened in.
 *
 * This is the state the plot is in almost all of the time, and it is the one
 * decision in this component that is not inherited from the price strip. Read
 * it against the gutter label on `Market/VolumeChart`: the same number, rounded
 * there and whole here.
 */
export const Resting: Story = {
  args: ARGS,
  render: () => <Harness name="full" />,
};

/**
 * **The same component with a pointer in it** — move across the grey plot and
 * the crosshair follows, snapping to the nearest bar that exists.
 *
 * Two things to check by moving the pointer rather than by reading this. The
 * strip's height does not change as the reading replaces the peak; and the
 * figures do not jitter as it changes, because every one of them is in the data
 * face and therefore tabular.
 */
export const Reading: Story = {
  args: ARGS,
  render: () => <Harness name="full" />,
};

/**
 * **The density the product actually opens at** — 1,950 bars at 0.37px each,
 * which is the silhouette regime.
 *
 * The case this component's one open question was decided on. Each drawn pixel
 * column carries its **tallest** bar; the disc carries the bar the crosshair
 * snapped to, which is usually a fraction of it. Point near a spike and watch
 * the disc sit well below the ink above it — that is the picture admitting what
 * it rounded, and the strip's instant is the thing that makes it readable
 * rather than wrong.
 */
export const Dense: Story = {
  args: ARGS,
  render: () => <Harness name="dense" />,
};
