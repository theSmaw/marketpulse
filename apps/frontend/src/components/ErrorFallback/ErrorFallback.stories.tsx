import type { Meta, StoryObj } from "@storybook/react-vite";

import gridStyles from "../stories.module.css";
import { ErrorFallback } from "./ErrorFallback.js";

// Four permutations — `compact` times `detail` present or absent — plus the
// extreme that actually breaks things.
//
// This is one of the few components where the permutation rule does real work
// rather than bookkeeping, because the states are what the argument is about.
// Two things are meant to be obvious from the grid and are hard to see in
// isolation. There is **no colour telling you this is an error** beyond the one
// red rule down the edge: the words do it, which is the requirement rather than
// the aspiration — cover the rule and every cell still reads as a failure.
// And the `detail`-less cells are visibly worse: a box that says something
// broke and not what still works leaves a user with no way to tell one broken
// region from a broken screen.
//
// `onRetry` is a no-op here. What it *does* is `ErrorBoundary`'s story; what it
// looks like is this one's.
const noop = () => {
  // Nothing to reset in the workshop — the boundary owns the behaviour.
};

const meta = {
  title: "Feedback/ErrorFallback",
  component: ErrorFallback,
  parameters: { layout: "padded" },
  args: { onRetry: noop },
} satisfies Meta<typeof ErrorFallback>;

export default meta;

type Story = StoryObj<typeof meta>;

// How it appears in a region: the title names the region in §8.1's vocabulary,
// and the detail is the sentence that makes containment visible.
export const InRegion: Story = {
  args: {
    title: "Market topology could not be displayed",
    detail: "The rest of this screen is unaffected.",
  },
};

// The state to avoid shipping, here so it can be compared against the one
// above rather than described.
export const WithoutDetail: Story = {
  args: { title: "Market topology could not be displayed" },
};

// The chrome's density: one row, same words, same button.
export const Compact: Story = {
  args: {
    title: "The header could not be displayed",
    detail: "Navigation is unavailable; the page below is unaffected.",
    compact: true,
  },
};

// The extreme rather than a plausible example, which is the convention: a
// region is a narrow column at the 1:1 end of §9's grid, so the title that
// matters is the one that wraps. A fallback that only looks right on a short
// string is a fallback nobody has seen in the box it lives in.
export const LongTitle: Story = {
  args: {
    title:
      "Current investigations could not be displayed because the investigation list failed to render",
    detail:
      "The rest of this screen is unaffected. Market topology, unusual activity and market breadth are still updating.",
  },
};

export const AllPermutations: Story = {
  args: { title: "Market topology could not be displayed" },
  render: () => (
    <div className={gridStyles.stack}>
      {[false, true].map((compact) => (
        <div className={gridStyles.stackItem} key={String(compact)}>
          <span className={gridStyles.label}>
            {compact ? "compact" : "default"} + detail
          </span>
          <ErrorFallback
            title="Market topology could not be displayed"
            detail="The rest of this screen is unaffected."
            compact={compact}
            onRetry={noop}
          />
          <span className={gridStyles.label}>
            {compact ? "compact" : "default"}, no detail
          </span>
          {/*
           * Written out rather than spread from a table of optional values.
           * `exactOptionalPropertyTypes` makes "prop absent" and "prop present
           * as undefined" different types, so a permutation grid that maps over
           * `{ detail?: string }` does not compile — the compiler drawing the
           * same distinction the component's API draws.
           */}
          <ErrorFallback
            title="Market topology could not be displayed"
            compact={compact}
            onRetry={noop}
          />
        </div>
      ))}
    </div>
  ),
};
