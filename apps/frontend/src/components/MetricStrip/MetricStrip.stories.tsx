import type { Meta, StoryObj } from "@storybook/react-vite";

import gridStyles from "../stories.module.css";
import { MetricStrip } from "./MetricStrip.js";

// Both sizes, and a one-metric strip.
//
// The grid is `auto-fit`, so the number of columns is a function of the width
// and of how many metrics there are — which means the layout defect this
// component can have is a strip of one stretching its label across the full
// measure. That story is here for exactly that, and it is the case the
// application does not currently produce.
//
// The other thing worth reviewing here rather than in place: the figure sits
// *above* its label while the markup has them the other way round. A grid of
// specimens is where a `column-reverse` that has been "tidied" into a plain
// column is obvious.

const OHLC = [
  { label: "Open", value: "226.02" },
  { label: "High", value: "234.76" },
  { label: "Low", value: "224.75" },
  { label: "Close", value: "230.34", detail: "2026-09-04" },
];

const meta = {
  title: "Foundations/MetricStrip",
  component: MetricStrip,
  parameters: { layout: "padded" },
  args: { metrics: OHLC, size: "large" },
} satisfies Meta<typeof MetricStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Large: Story = { args: { size: "large" } };

export const Compact: Story = { args: { size: "compact" } };

export const SingleMetric: Story = {
  args: { metrics: [{ label: "Tracked", value: "518" }] },
};

export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.stack}>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>large</p>
        <MetricStrip metrics={OHLC} size="large" />
      </div>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>compact</p>
        <MetricStrip metrics={OHLC} size="compact" />
      </div>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>one metric — the full measure</p>
        <MetricStrip metrics={[{ label: "Tracked", value: "518" }]} />
      </div>
    </div>
  ),
};
