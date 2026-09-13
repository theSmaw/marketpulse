import type { Meta, StoryObj } from "@storybook/react-vite";

import { cx } from "../../cx.js";
import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { Simulation } from "../../story-simulation.js";
import { ColourVisionFilters, SIMULATIONS } from "../../story-simulation.js";
import type { BarSeriesView } from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import { PriceChart } from "./PriceChart.js";
import { VolumeChart } from "./VolumeChart.js";
import styles from "./ChartAxis.stories.module.css";

// **The pair, reviewed as a pair** (Task 2.13.4).
//
// `ChartAxis` draws nothing. What it owns is the one `TimeFrame` both plots hang
// on, and the only way to review that is to look at two plots hanging on it —
// which is what these stories are for and why a component with no marks of its
// own has a workshop entry.
//
// ## The one thing to check, and how to check it
//
// **Do the session seams line up across the panel boundary?** They are the
// shared axis made visible, and lining the two plots up by them is how a reader
// relates a spike in volume to a move in price. Cover the heading between the
// two plots with a finger and follow a dashed vertical down: it must not step.
//
// The same is true of the coverage edge in `Uncovered`, and that one is harder
// and more important. The price line, the two washes, the reference rule and the
// volume columns must all stop at the same x, with the same ground behind them
// on the other side — in two separate frames, painted separately, from one
// `coverage` value.
//
// ## Why this is not a screenshot of the real page
//
// It is the real arrangement minus one thing: on the Security Explorer the
// **Abnormal-move** region sits between these two in the DOM, and at one column
// a reader walks through it and through the price panel's eight stated facts to
// get from one plot to the other. That separation is why each plot carries its
// own readout strip (Task 2.13.5) and why volume keeps its own two dates. What
// this page reviews is the alignment; `e2e/specs/security-price-chart.spec.ts`
// is where the real arrangement is checked, because nothing below a browser
// computes a layout.

const meta = {
  title: "Market/ChartAxis",
  component: ChartAxis,
} satisfies Meta<typeof ChartAxis>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The two regions as the grid stacks them: same width, same gutter, a heading
 * between.
 *
 * The headings are plain text rather than real `Region` panels on purpose — a
 * `Region` brings its own padding, border and `overflow: auto`, and what is
 * being reviewed here is two plots' x, not a panel.
 */
function Pair({
  view,
  width,
  simulation,
}: {
  readonly view: BarSeriesView;
  readonly width: "wide" | "narrow";
  readonly simulation?: Simulation | undefined;
}) {
  return (
    <div
      className={cx(
        styles[width],
        simulation === undefined ? undefined : SIMULATIONS[simulation],
      )}
    >
      <ChartAxis view={view}>
        <section className={styles.region}>
          <h3 className={styles.heading}>Price</h3>
          <PriceChart symbol="NVDA" view={view} />
        </section>
        <section className={styles.region}>
          <h3 className={styles.heading}>Volume</h3>
          <VolumeChart symbol="NVDA" view={view} />
        </section>
      </ChartAxis>
    </div>
  );
}

/**
 * Thirty bars at the wide region's measured width — the density at which every
 * mark on both plots is individually visible.
 *
 * **88px of volume under 280px of price**, which is 3.18:1 and is a number with
 * a reason: with the domain running zero to the window's peak, a window whose
 * peak is 3.8× its typical bar — `PRODUCT_SPEC.md` §38's demo line — draws that
 * typical bar at 23px here. At a quarter of the price plot it is 18px and the
 * step from typical to slightly elevated stops being legible.
 */
export const Wide: Story = {
  args: { view: barSeriesFixtureView("full"), children: null },
  render: (args) => <Pair view={args.view} width="wide" />,
};

/**
 * The same pair at a 1024 viewport. **The compact pair keeps the ratio rather
 * than the height** — 68 : 220 is 3.24:1 — which is the only shape in which the
 * arithmetic above survives a narrow region.
 */
export const Narrow: Story = {
  args: { view: barSeriesFixtureView("full"), children: null },
  render: (args) => <Pair view={args.view} width="narrow" />,
};

/**
 * **The default window at its real density**: 1,950 minute bars as a line above
 * and a silhouette below.
 *
 * This is the picture the screen actually shows today, and the moment worth
 * showing somebody — a month of trading intensity resolved to the plot's own
 * pixels, under a line of the same bars' closes, with the session boundaries
 * crossing both.
 */
export const Dense: Story = {
  args: { view: barSeriesFixtureView("dense"), children: null },
  render: (args) => <Pair view={args.view} width="wide" />,
};

/**
 * **The coverage edge, in two frames.** The one story that can fail in a way
 * nothing else here can: two plots that stopped at different pixels would be two
 * charts of two windows, stacked and labelled as one.
 */
export const Uncovered: Story = {
  args: { view: barSeriesFixtureView("uncovered"), children: null },
  render: (args) => <Pair view={args.view} width="wide" />,
};

/**
 * Before the first answer. Two frames, two baselines, no wash on either —
 * nothing is known to be missing before anything has been answered.
 */
export const Waiting: Story = {
  args: { view: { state: "loading" }, children: null },
  render: (args) => <Pair view={args.view} width="wide" />,
};

/**
 * **The pair with the hue taken out** — Task 2.13.4's amendment, paid.
 *
 * `PriceChart.stories.tsx` has carried `Greyscale` and `Deuteranopia` over four
 * windows since Task 2.12.5 and the volume plot had **neither**, which left a
 * claim standing on a token table rather than on a rendering:
 * `--chart-volume` is `#848995`, which `grayscale(1)` takes to `#898989`, so
 * nothing on the plot is distinguished by hue and nothing can be lost. That is
 * true and it is the same kind of statement that passed four times against a
 * chart a person could see was wrong (`CHARTING.md` §12.6). **So look at it.**
 *
 * Three claims to confirm rather than to discover, because
 * `VOLUME-AND-WINDOW.md` §12 and §8.2 decided all three before anything was
 * drawn:
 *
 *  - **The volume columns carry no direction at all.** A column has no geometry
 *    left to spend — it starts at zero and its height is its whole meaning — so
 *    an up-day column and a down-day column are the same ink, in colour and out
 *    of it. If a row below shows two column inks, something started spending
 *    hue after the decision said it would not.
 *  - **The price chart's direction still reads**, from the geometry: the line
 *    finishes above or below the dashed reference rule, and the two washes
 *    differ by 1.009:1 under this filter. Say which way each row went.
 *  - **The coverage edge and the uncovered ground never had a hue**, in either
 *    frame, and the two frames must still stop at the same x.
 *
 * **And move the pointer across a plot while you are here**, which is the mark
 * Task 2.13.5's amendment added: the crosshair's hollow disc is the one mark on
 * the volume plot whose *position* carries a fact the drawing rounds away, and
 * on `Dense` it sits inside a column taller than itself. It is
 * `--surface-raised` filled and `--chart-point` ringed, so it spends no hue
 * either — but it is a small ring on a grey silhouette, and whether it is
 * *findable* under a filter is a question only a pair of eyes answers.
 */
export const Greyscale: Story = {
  args: { view: barSeriesFixtureView("dense"), children: null },
  render: () => (
    <div className={styles.stack}>
      <Pair
        view={barSeriesFixtureView("dense")}
        width="wide"
        simulation="greyscale"
      />
      <Pair
        view={barSeriesFixtureView("full")}
        width="wide"
        simulation="greyscale"
      />
      <Pair
        view={barSeriesFixtureView("uncovered")}
        width="wide"
        simulation="greyscale"
      />
      <Pair
        view={barSeriesFixtureView("daily")}
        width="wide"
        simulation="greyscale"
      />
    </div>
  ),
};

/**
 * **The same four under a deuteranopia simulation**, which is what roughly one
 * man in twelve sees.
 *
 * Greyscale is the harsher test and this is the more honest one: a red-green
 * difference does not vanish for a deuteranope so much as collapse toward a
 * single yellowish axis. The volume plot has nothing to collapse — it is one
 * near-grey ink at every window — so what this row is really reviewing is the
 * **pair**: the price chart's washes going flat above a volume plot that never
 * changed, with the seams still crossing both.
 *
 * The fourth row is a `1d` window, which neither simulation had ever been run
 * over: until Task 2.13.6 no window the application could ask for resolved to
 * daily bars, so every simulation in this repository before this one was of a
 * minute chart.
 */
export const Deuteranopia: Story = {
  args: { view: barSeriesFixtureView("dense"), children: null },
  render: () => (
    <div className={styles.stack}>
      <ColourVisionFilters />
      <Pair
        view={barSeriesFixtureView("dense")}
        width="wide"
        simulation="deuteranopia"
      />
      <Pair
        view={barSeriesFixtureView("full")}
        width="wide"
        simulation="deuteranopia"
      />
      <Pair
        view={barSeriesFixtureView("uncovered")}
        width="wide"
        simulation="deuteranopia"
      />
      <Pair
        view={barSeriesFixtureView("daily")}
        width="wide"
        simulation="deuteranopia"
      />
    </div>
  ),
};

/**
 * **The holiday week, complete** — five sessions across Thanksgiving 2026, the
 * half day included (Task 2.13.8).
 *
 * The one window in this workshop whose sessions are **not all the same width**.
 * Follow the dashed seams across both plots: the fourth band is a little over
 * half the width of the others, because `2026-11-27` closed at 13:00 and
 * contributes 210 slots rather than 390 — and there is no band at all for
 * Thanksgiving, which is what a session-ordinal axis does with a day nothing
 * traded on.
 *
 * It is the only body here the store could not answer, because the week has not
 * happened: `fixtures/bar-series.ts` argues why a body generated by this
 * product's own server against the checked-in calendar is admissible and a
 * hand-written one is not. The prices are a seeded walk and nothing here is
 * about them; what is real is where the bars fall.
 */
export const HolidayWeek: Story = {
  args: { view: barSeriesFixtureView("holidayWeek"), children: null },
  render: (args) => <Pair view={args.view} width="wide" />,
};
