import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import { BUTTON_SIZES, BUTTON_VARIANTS, Button } from "./Button.js";

// Six cells, and the grid is the check.
//
// A control's defects are almost entirely **comparative**: a primary and a
// secondary that are a pixel different in height, a small variant whose label
// sits low, an icon that is optically heavier than the text beside it. None of
// those is visible in the running application, where the two variants are on
// different screens — and all of them are obvious in a row.
//
// The disabled row is here for the one state the application does not currently
// produce anywhere. That is deliberate rather than speculative: `:disabled`
// styling is the state most likely to be added later by somebody who cannot see
// it, and the workshop is where it is reviewable before it has a call site.

const meta = {
  title: "Controls/Button",
  component: Button,
  parameters: { layout: "padded" },
  args: { children: "Retry", variant: "secondary", size: "medium" },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary", children: "Open investigation" },
};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Quiet: Story = { args: { variant: "quiet" } };

export const WithIcon: Story = {
  args: { variant: "secondary", icon: "refresh", children: "Try again" },
};

export const IconOnly: Story = {
  args: {
    variant: "quiet",
    icon: "refresh",
    iconOnly: true,
    children: "Reload the tracked universe",
  },
};

export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.stack}>
      {BUTTON_SIZES.map((size) => (
        <div className={gridStyles.stackItem} key={size}>
          <p className={gridStyles.label}>{size}</p>
          <div className={gridStyles.grid}>
            {BUTTON_VARIANTS.map((variant) => (
              <Fragment key={variant}>
                <span className={gridStyles.label}>{variant}</span>
                <span className={gridStyles.specimen}>
                  <Button variant={variant} size={size} icon="refresh">
                    Try again
                  </Button>
                </span>
              </Fragment>
            ))}
            <span className={gridStyles.label}>disabled</span>
            <span className={gridStyles.specimen}>
              <Button size={size} disabled>
                Try again
              </Button>
            </span>
          </div>
        </div>
      ))}
    </div>
  ),
};
