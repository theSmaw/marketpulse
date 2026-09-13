import type { Meta, StoryObj } from "@storybook/react-vite";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
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
}: {
  readonly view: BarSeriesView;
  readonly width: "wide" | "narrow";
}) {
  return (
    <div className={styles[width]}>
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
