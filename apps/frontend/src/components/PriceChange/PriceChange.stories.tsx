import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import {
  PRICE_DIRECTIONS,
  PriceChange,
  type PriceDirection,
} from "./PriceChange.js";

// Three directions, three stories, and a fourth showing all of them at once.
//
// The convention this file establishes for every component in the workshop:
// one named story per discrete state, plus an `AllPermutations` story that
// renders the cartesian product in a labelled grid. The named stories are for
// working on one state; the grid is for reviewing completeness, which is not
// something anyone does by clicking down a sidebar.

// Same digit count, different glyph widths, so the grid also shows the tabular
// alignment holding across the three. Representative extremes rather than
// examples: these are the strings that break a column if the alignment is
// wrong, which a set of plausible-looking prices would not.
const CHANGE_BY_DIRECTION: Readonly<Record<PriceDirection, string>> = {
  positive: "+11.11",
  negative: "−88.88",
  unchanged: "00.00",
};

const meta = {
  title: "Market/PriceChange",
  component: PriceChange,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PriceChange>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Positive: Story = {
  args: { change: "+12.40", direction: "positive" },
};

export const Negative: Story = {
  // A U+2212 minus sign rather than a hyphen. It is the same width as the plus
  // in a tabular figure set; a hyphen is not, and a column of mixed signs
  // drifts.
  args: { change: "−34.02", direction: "negative" },
};

export const Unchanged: Story = {
  args: { change: "0.00", direction: "unchanged" },
};

// The property Task 1.4.4 measured and this component exists to hold: under
// `grayscale(1)` the green and the red differ by 1.05:1, so the colour is
// carrying nothing at all. Read this grid with the colour removed and every row
// still says which way the price went.
export const AllPermutations: Story = {
  args: { change: "+12.40", direction: "positive" },
  render: () => (
    <div className={gridStyles.grid}>
      {PRICE_DIRECTIONS.map((direction) => (
        <Fragment key={direction}>
          <span className={gridStyles.label}>{direction}</span>
          <span className={gridStyles.numeric}>
            <PriceChange
              change={CHANGE_BY_DIRECTION[direction]}
              direction={direction}
            />
          </span>
        </Fragment>
      ))}
    </div>
  ),
};
