import type { Meta, StoryObj } from "@storybook/react-vite";

import gridStyles from "../stories.module.css";
import { Button } from "../Button/Button.js";
import { MetricStrip } from "../MetricStrip/MetricStrip.js";
import { PageHeader } from "./PageHeader.js";

// Four shapes of the same masthead, and the reason to review them together is
// the gap under the title: it is the same in all four, and it only looks the
// same when a description or a metric strip is not there to fill it.

const meta = {
  title: "Layout/PageHeader",
  component: PageHeader,
  parameters: { layout: "padded" },
  args: {
    title: "Security Explorer",
    description:
      "What is happening with this security — its price, its volume and the evidence behind both.",
  },
} satisfies Meta<typeof PageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = { args: { description: undefined } };

export const WithDescription: Story = {};

export const WithMetrics: Story = {
  args: {
    metrics: (
      <MetricStrip
        metrics={[
          { label: "Tracked", value: "518" },
          { label: "Active", value: "100%", detail: "518 of 518" },
          { label: "Sectors", value: "12" },
        ]}
      />
    ),
  },
};

export const WithActions: Story = {
  args: {
    eyebrow: "Epic 2",
    actions: (
      <Button variant="secondary" icon="refresh">
        Refresh
      </Button>
    ),
  },
};

export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.stack}>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>title only</p>
        <PageHeader title="Market Replay" />
      </div>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>title and description</p>
        <PageHeader
          title="Market Overview"
          description="What is happening right now, across everything we track."
        />
      </div>
      <div className={gridStyles.stackItem}>
        <p className={gridStyles.label}>the full masthead</p>
        <PageHeader
          eyebrow="Epic 2"
          title="Security Explorer"
          description="What is happening with this security."
          actions={
            <Button variant="secondary" icon="refresh">
              Refresh
            </Button>
          }
          metrics={
            <MetricStrip
              metrics={[
                { label: "Tracked", value: "518" },
                { label: "Active", value: "100%" },
                { label: "Sectors", value: "12" },
              ]}
            />
          }
        />
      </div>
    </div>
  ),
};
