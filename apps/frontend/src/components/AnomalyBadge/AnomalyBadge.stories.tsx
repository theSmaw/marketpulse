import { ANOMALY_BANDS } from "@marketpulse/shared";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import { AnomalyBadge } from "./AnomalyBadge.js";

// Four bands, four stories, and the ramp in one frame.
//
// The bands are iterated from `ANOMALY_BANDS` rather than listed here, so a
// fifth band added in Epic 5 appears in the grid without anyone remembering to
// add it. The four named stories are still written out: a story per state is
// what makes one state addressable by URL, which a loop cannot give.

const meta = {
  title: "Market/AnomalyBadge",
  component: AnomalyBadge,
  parameters: { layout: "padded" },
} satisfies Meta<typeof AnomalyBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Normal: Story = { args: { band: "normal" } };
export const Elevated: Story = { args: { band: "elevated" } };
export const Unusual: Story = { args: { band: "unusual" } };
export const Extreme: Story = { args: { band: "extreme" } };

// Worth reading in greyscale. The four amber steps separate by 1.12, 1.43 and
// 1.59 — enough to see a change, nowhere near enough to name one — which is why
// the band's name is written inside its fill and why `normal` has no fill at
// all.
export const AllPermutations: Story = {
  args: { band: "normal" },
  render: () => (
    <div className={gridStyles.grid}>
      {ANOMALY_BANDS.map((band) => (
        <Fragment key={band}>
          <span className={gridStyles.label}>{band}</span>
          <span>
            <AnomalyBadge band={band} />
          </span>
        </Fragment>
      ))}
    </div>
  ),
};
