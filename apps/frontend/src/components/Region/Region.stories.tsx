import type { Meta, StoryObj } from "@storybook/react-vite";
import { Component } from "react";

import gridStyles from "../stories.module.css";
import { Region } from "./Region.js";

// `Region` moved here from `src/routes/` in Task 1.7.6, and this file is the
// obligation that came with the move. The directory rule is "does it have
// states worth reviewing side by side?" — a label and a slot did not, a label
// and a slot that can hold a fallback where its contents should be does.
//
// The three states are: named and empty, which is three of the four regions on
// the landing screen today; named and filled; and named and failed. The one
// worth looking at is the third, and specifically what survives it — the
// heading, the sentence, the box and the `region` landmark are all still there,
// because the boundary is inside the `<section>` rather than around it. A
// failed region is a labelled box with a problem in it and not a hole in §9's
// grid.

class Throws extends Component {
  constructor(props: Record<string, never>) {
    super(props);
    throw new Error("Story: the region's contents failed to render");
  }

  override render() {
    return null;
  }
}

const meta = {
  title: "Layout/Region",
  component: Region,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Region>;

export default meta;

type Story = StoryObj<typeof meta>;

// What three of the four landing-route regions look like today. A region
// labelled and empty is honest; a region labelled and empty with no explanation
// looks broken, which is what `filledBy` is for.
export const Empty: Story = {
  args: {
    name: "Market breadth",
    filledBy:
      "Epic 4 fills this with advancing, declining and unchanged counts once there is live market data behind them.",
  },
};

export const Filled: Story = {
  args: {
    name: "Unusual activity",
    filledBy:
      "Epic 5 scores every tracked security and ranks the unusual ones here, each score carrying its explanation.",
    children: <p>Whatever the epic that owns this region renders.</p>,
  },
};

// The state this component moved directories for.
export const Failed: Story = {
  args: {
    name: "Market topology",
    filledBy:
      "Epic 6 draws the securities graph here, in WebGL. Until then this is Story 1.4’s render check.",
    children: <Throws />,
  },
};

export const AllPermutations: Story = {
  args: { name: "Market topology", filledBy: "" },
  // **No a11y rule is disabled here, and that is the surprise.** Story 1.5 and
  // this task's own brief both expected the landmark conflict `AppHeader` hit
  // in Task 1.5.3 — six banners in one grid were `landmark-unique` and
  // `landmark-no-duplicate-banner`, and the fix was disabling both on that one
  // story. Three `region` landmarks in this grid report **0 violations**, and
  // `landmark-unique` is in the *passes* list on all three nodes. Measured with
  // axe 4.13.0 against the built workshop, after the disable had already been
  // written and before it was removed.
  //
  // The reason is worth carrying to the next landmark component, because it
  // says when the conflict is real and when it is not: `landmark-unique` keys
  // on role **and accessible name together**, so it fires on landmarks that are
  // indistinguishable, not on landmarks that repeat. `AppHeader`'s six banners
  // were six copies of one thing with no name at all. A region's name is its
  // heading, and a grid that reviews regions gives each cell a different one —
  // because that is what a region *is*. The permutation-grid convention and
  // landmark uniqueness are only in conflict for a component whose landmark is
  // anonymous.
  render: () => (
    <div className={gridStyles.stack}>
      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>empty</span>
        <Region
          name="Market breadth"
          filledBy="Epic 4 fills this once there is live market data behind it."
        />
      </div>

      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>filled</span>
        <Region
          name="Unusual activity"
          filledBy="Epic 5 ranks the unusual securities here."
        >
          <p>Whatever the epic that owns this region renders.</p>
        </Region>
      </div>

      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>contents failed</span>
        <Region
          name="Market topology"
          filledBy="Epic 6 draws the securities graph here, in WebGL."
        >
          <Throws />
        </Region>
      </div>
    </div>
  ),
};
