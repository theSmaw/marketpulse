import { FEED_STATUSES, type FeedStatus } from "@marketpulse/shared";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import { FeedIndicator } from "./FeedIndicator.js";

// Three statuses and one optional prop, so the permutation set is six and the
// grid renders all six rather than three.
//
// `detail` is the prop most likely to be forgotten, and the grid is where that
// shows: a `disconnected` row with no timestamp is the state PRODUCT_SPEC.md
// §36 specifically asks to be avoided, and seeing it beside the version that
// carries one is the argument.

// §36's own example wording. The `live` case has nothing to add, which is the
// honest answer rather than a filler string.
const DETAIL: Readonly<Record<FeedStatus, string>> = {
  live: "Updating",
  stale: "Last update 10:41:58 — slower than expected",
  disconnected: "Displaying data through 10:42:17",
};

const meta = {
  title: "Market/FeedIndicator",
  component: FeedIndicator,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FeedIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Live: Story = { args: { status: "live" } };
export const Stale: Story = { args: { status: "stale" } };
export const Disconnected: Story = { args: { status: "disconnected" } };

export const DisconnectedWithDetail: Story = {
  args: {
    status: "disconnected",
    detail: "Displaying data through 10:42:17",
  },
};

// None of these six is an error, and the grid is here partly to make that
// obvious: nothing in it is red, and the only colour is the amber on `stale`.
// Live and disconnected are the same grey and differ by the shape of the
// marker alone.
export const AllPermutations: Story = {
  args: { status: "live" },
  render: () => (
    <div className={gridStyles.grid}>
      {FEED_STATUSES.map((status) => (
        <Fragment key={status}>
          <span className={gridStyles.label}>{status}</span>
          <FeedIndicator status={status} />
          <span className={gridStyles.label}>{status} + detail</span>
          <FeedIndicator status={status} detail={DETAIL[status]} />
        </Fragment>
      ))}
    </div>
  ),
};
