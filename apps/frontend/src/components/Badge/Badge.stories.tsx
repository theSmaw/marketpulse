import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import { BADGE_TONES, Badge } from "./Badge.js";

// Two tones, and the grid exists to keep them two.
//
// The failure this component is written against is a third tone arriving —
// amber for "stale", red for "failed" — which would put market meaning behind a
// generic prop and out of `market.css`'s reach. Seeing both cells side by side,
// achromatic, is the cheapest reminder of that rule there is.

const meta = {
  title: "Foundations/Badge",
  component: Badge,
  parameters: { layout: "padded" },
  args: { children: "24 securities" },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { tone: "neutral" } };

export const Selected: Story = {
  args: { tone: "selected", children: "All sectors (518)" },
};

export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.grid}>
      {BADGE_TONES.map((tone) => (
        <Fragment key={tone}>
          <span className={gridStyles.label}>{tone}</span>
          <span className={gridStyles.specimen}>
            <Badge tone={tone}>24 securities</Badge>
          </span>
        </Fragment>
      ))}
    </div>
  ),
};
