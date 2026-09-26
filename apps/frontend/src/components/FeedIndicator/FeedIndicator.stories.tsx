import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import type { LiveFeedView } from "../../market/index.js";
import gridStyles from "../stories.module.css";
import { FeedIndicator } from "./FeedIndicator.js";

/** Nothing observed. §11.1: absence is the answer, and `{}` is the true one. */
const NO_OBSERVATIONS = new Map();
/** Nothing was delivered by a snapshot — Task 3.5.4's baseline/arrival split. */
const NO_SNAPSHOT = new Set<string>();

// The six renderings this cell can reach, and they are **views rather than
// prop combinations** (Task 3.3.5).
//
// The set used to be a permutation of a status and an invented `detail`
// string, which produced a `stale` row saying *Last update 10:41:58 — slower
// than expected* — a sentence this product does not own and would never send.
// The vocabulary is now in `packages/shared/src/feed-words.ts`, so a story that
// types one is reviewing something the application cannot produce.
//
// Two of the six render **nothing at all**, which is the point of having them
// in the grid: §11.3 gives an unconfigured deployment a `—` in this cell, and a
// browser that has not heard back yet has the same claim to silence. Seeing
// them beside the four that speak is the only way to check that the strip does
// not collapse.

// §7.3's measured frame — a bar stamped `14:01:00Z`. Fixed rather than `now`,
// because a visual diff of the workshop is not a clock.
const OBSERVED_AT = Date.parse("2026-09-16T14:01:00Z");

const base = {
  feed: "iex",
  backendReachable: true,
  observedAt: OBSERVED_AT,
  unreadable: 0,
  observations: NO_OBSERVATIONS,
  fromSnapshot: NO_SNAPSHOT,
  resumes: 0,
  overview: undefined,
} satisfies Omit<LiveFeedView, "status">;

const VIEWS = {
  // Healthy, and carrying no instant — §36's sentence qualifies a broken state
  // and a healthy feed has nothing to qualify.
  live: { ...base, status: "live" },
  // The one a glance should land on, and the only colour in the set.
  stale: { ...base, status: "stale" },
  // Grey, like `live`, and told apart from it by silhouette alone.
  disconnected: { ...base, status: "disconnected" },
  // ADR 0030 decision 4: never `LIVE` while a replay is running.
  replaying: { ...base, status: "live", feed: "replay" },
  // Our own socket is gone. `STORY.md` open decision 3 — this says so rather
  // than staying silent, because §36 requires a dropped connection to be
  // labelled rather than inferred from an absence.
  "backend lost": { ...base, status: "disconnected", backendReachable: false },
  // No provider configured: the grid's `—`. Renders nothing.
  "not configured": {
    ...base,
    status: "disconnected",
    feed: null,
    observedAt: undefined,
  },
  // The first paint, before the snapshot lands. Also nothing, and it needs no
  // placeholder — the provenance cell beside it is saying `checking`.
  connecting: {
    ...base,
    status: "disconnected",
    feed: null,
    observedAt: undefined,
  },
} satisfies Record<string, LiveFeedView>;

const meta = {
  title: "Market/FeedIndicator",
  component: FeedIndicator,
  parameters: { layout: "padded" },
  args: { view: VIEWS.live },
} satisfies Meta<typeof FeedIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Live: Story = { args: { view: VIEWS.live } };
export const Stale: Story = { args: { view: VIEWS.stale } };
export const Disconnected: Story = {
  args: { view: VIEWS.disconnected },
};
export const Replaying: Story = {
  args: { view: VIEWS.replaying },
};

// None of these is an error, and the grid exists partly to make that obvious:
// nothing in it is red, and the only colour is the amber on `stale`. Live and
// disconnected are the same grey and differ by the shape of the marker alone,
// which is what survives greyscale.
export const EveryRendering: Story = {
  args: { view: VIEWS.live },
  render: () => (
    <div className={gridStyles.grid}>
      {Object.entries(VIEWS).map(([name, view]: [string, LiveFeedView]) => (
        <Fragment key={name}>
          <span className={gridStyles.label}>{name}</span>
          <FeedIndicator view={view} />
        </Fragment>
      ))}
    </div>
  ),
};
