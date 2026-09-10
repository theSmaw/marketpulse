import type { Meta, StoryObj } from "@storybook/react-vite";

import gridStyles from "../stories.module.css";
import { Panel } from "./Panel.js";

// The five shapes a panel takes, and the grid is where the header rule is
// actually reviewable: it is one pixel of near-black, it is the most
// distinctive thing in this design language, and it is invisible in a
// screenshot of a single panel — because there is nothing beside it to be a
// pixel darker than.
//
// The headerless story is not filler. A plain surface with no title is a real
// case (the strip above a table), and it is the one where somebody later adds a
// header rule "for consistency" and quietly turns a spacer into a readout.

const meta = {
  title: "Surfaces/Panel",
  component: Panel,
  parameters: { layout: "padded" },
  args: {
    title: "Tracked universe",
    children: "The securities MarketPulse follows.",
  },
} satisfies Meta<typeof Panel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithTitle: Story = {};

export const WithEyebrowAndMeta: Story = {
  args: {
    eyebrow: "Region",
    title: "Market data",
    meta: "518 securities",
  },
};

export const Headerless: Story = {
  args: {
    title: undefined,
    children: "A plain surface, with nothing to call it.",
  },
};

export const Nested: Story = {
  args: {
    title: "Sector concentration",
    headingLevel: 3,
    children: "An h3, for a panel inside a section that already owns an h2.",
  },
};

export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.stack}>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>title only</p>
        <Panel title="Tracked universe">518 securities, 15 proxies.</Panel>
      </div>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>eyebrow, title and meta</p>
        <Panel eyebrow="Region" title="Market data" meta="1m bars · 5 sessions">
          One security&rsquo;s minute bars.
        </Panel>
      </div>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>no header</p>
        <Panel>A plain surface, with nothing to call it.</Panel>
      </div>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>flush body</p>
        <Panel title="Flush" flush>
          <p className={gridStyles.specimen}>
            Content reaches the panel&rsquo;s own edges — a table, a chart, or a
            skeleton standing in for either.
          </p>
        </Panel>
      </div>
    </div>
  ),
};
