import { CONFIDENCE_LEVELS } from "@marketpulse/shared";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import { ConfidenceMark } from "./ConfidenceMark.js";

// Four levels, and this is the one place all four are visible at once — which
// matters more here than for most components, because the whole encoding is a
// COMPARISON between four strokes. Three of the four are reachable in the
// product today; `CONFIRMED` has no producer until Epic 9's filings, so this
// grid is the only surface that will draw it for several epics.
//
// `AnomalyBadge` is deliberately absent from every story below. Showing them
// side by side here would be a second home for the comparison AC 5b owns —
// that photograph is taken on the screen that really draws both, which is
// Epic 8's, with `docs/GAPS.md` carrying the condition.

const meta = {
  title: "Investigations/ConfidenceMark",
  component: ConfidenceMark,
  parameters: { layout: "padded" },
  args: { confidence: "SUPPORTED" },
} satisfies Meta<typeof ConfidenceMark>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Confirmed: Story = { args: { confidence: "CONFIRMED" } };
export const Supported: Story = { args: { confidence: "SUPPORTED" } };
export const Possible: Story = { args: { confidence: "POSSIBLE" } };
export const Unknown: Story = { args: { confidence: "UNKNOWN" } };

export const AllPermutations: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className={gridStyles.grid}>
      {CONFIDENCE_LEVELS.map((confidence) => (
        <Fragment key={confidence}>
          <span className={gridStyles.label}>{confidence}</span>
          <ConfidenceMark confidence={confidence} />
        </Fragment>
      ))}
    </div>
  ),
};

/**
 * **`grayscale(1)`, and it is a formality rather than a check.** This component
 * spends no colour at all — the ink is `--ink-secondary` on all four levels and
 * the rule draws in `currentColor` — so the greyscale grid is byte-identical in
 * appearance to the one above it. It is here so that the next author to reach
 * for a hue has to delete a story that says in as many words why there is none.
 */
export const InGreyscale: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ filter: "grayscale(1)" }} className={gridStyles.grid}>
      {CONFIDENCE_LEVELS.map((confidence) => (
        <Fragment key={confidence}>
          <span className={gridStyles.label}>{confidence}</span>
          <ConfidenceMark confidence={confidence} />
        </Fragment>
      ))}
    </div>
  ),
};
