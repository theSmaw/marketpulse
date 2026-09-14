import type { Meta, StoryObj } from "@storybook/react-vite";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import { ChartPending } from "./ChartPending.js";
import { PriceChart } from "./PriceChart.js";
import { VolumeChart } from "./VolumeChart.js";
import styles from "./PriceChart.stories.module.css";

// **The panel a slow window change shows**, which is the one state in this
// product a reader is meant to look away from (2026-09-14).
//
// ## What a reviewer is being asked to judge
//
// **Whether it reads as a wait rather than as a chart.** It replaced a stale
// picture wearing a label — see `ChartPending.tsx` for why — and the way that
// repair fails is by looking like content. If a glance at this could be mistaken
// for something the store answered, it is wrong.
//
// **Whether the movement is texture rather than a value changing.** The breathe
// runs between full and 0.45 opacity on `--chart-uncovered`, which is 1.107:1
// against the plot ground, so the whole range happens inside a difference a
// reader perceives as surface. A pulse with real contrast in it competes with
// the numbers beside it, and this is chrome.
//
// **Whether the floor is high enough.** It is 0.45 rather than 0 on purpose: a
// block fading to nothing reads as the panel disappearing and coming back, which
// on a 220px plot is the page flickering. Judge that here, because no test can.
//
// **And with `prefers-reduced-motion: reduce` forced in devtools**, which is a
// separate review rather than the same one: `--motion-duration-pulse` goes to
// `0ms`, the animation does not run, and what is left must read as the same
// statement made without movement — not as a panel stuck mid-fade.
//
// ## Why the timing is not reviewable here
//
// Nothing in the workshop can show *when* this appears, and when is most of the
// design: 160 ms before it is drawn at all, 400 ms minimum once it is. Both live
// in `use-pending-panel.ts` with the measurements behind them, and the only way
// to see them is a throttled window change on a running page.

/**
 * The `loading` member itself, written out.
 *
 * There is no recorded fixture for it and there should not be: `loading` is the
 * one state with no body behind it, so it is the union's own value rather than a
 * state assembled from a response. `PriceChart.stories.tsx` spells it the same
 * way for the same reason.
 */
const LOADING: BarSeriesView = { state: "loading" };

const meta = {
  title: "Market/ChartPending",
  component: ChartPending,
} satisfies Meta<typeof ChartPending>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * **The case that actually happens**: a slow window change, with the previous
 * window's chart still under the panel.
 *
 * This is the review that matters. The pulse goes *over* a picture rather than
 * instead of it — the figures above stay at full ink and the plot does not move
 * — so what has to be true is that the panel reads as covering the chart rather
 * than as part of it. If the old series shows through, or if the block looks
 * like a region of the plot, it is wrong.
 */
export const OverAHeldChart: Story = {
  render: () => (
    <div className={styles.wide}>
      <ChartAxis view={barSeriesFixtureView("full")}>
        <PriceChart pending symbol="NVDA" view={barSeriesFixtureView("full")} />
        <VolumeChart
          pending
          symbol="NVDA"
          view={barSeriesFixtureView("full")}
        />
      </ChartAxis>
    </div>
  ),
};

/**
 * The cold case — a first load, with no previous answer to cover.
 *
 * The frame underneath is `loading`'s: a scale with no labels on it, which
 * before 2026-09-14 was the whole of what this state drew.
 */
export const OverNothing: Story = {
  render: () => (
    <div className={styles.wide}>
      <ChartAxis view={LOADING}>
        <PriceChart pending symbol="NVDA" view={LOADING} />
        <VolumeChart pending symbol="NVDA" view={LOADING} />
      </ChartAxis>
    </div>
  ),
};

/** The same wait at a 1024 viewport, where the compact plot heights take over. */
export const Compact: Story = {
  render: () => (
    <div className={styles.narrow}>
      <ChartAxis view={barSeriesFixtureView("full")}>
        <PriceChart pending symbol="NVDA" view={barSeriesFixtureView("full")} />
        <VolumeChart
          pending
          symbol="NVDA"
          view={barSeriesFixtureView("full")}
        />
      </ChartAxis>
    </div>
  ),
};
