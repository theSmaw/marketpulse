import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import gridStyles from "../stories.module.css";
import { ChartAxis } from "./ChartAxis.js";
import { VolumeChart } from "./VolumeChart.js";
import styles from "./PriceChart.stories.module.css";

// The volume plot at the widths it renders at, and at both ends of a 130×
// density range (Task 2.13.4).
//
// ## What a reviewer is being asked to judge
//
// **The three regimes, which are one rule** — *does a bar have a pixel of its
// own?* Above 2px a column keeps a 1px gap, between 1 and 2px it loses the gap
// because there is no room for a gap and a column both, and below 1px the plot
// draws one stem per **pixel** carrying that pixel's tallest bar. The third is
// the one worth arguing about and the one worth looking at: `Dense` is 1,950
// real minute bars on a 726px plot, and what it should read as is the window's
// trading intensity rather than a smear or a picket fence.
//
// **Every default declined.** No gridlines, no second intraday time axis, no
// box, no colour on a column, and a value scale of exactly one label. Volume is
// a supporting series and it says so at 3.50:1 against the price line's
// 17.08:1 — which is what "supporting" means here, said as a number rather than
// as an adjective.
//
// **And the end columns.** `scaleSlot` puts the first bar at x = 0 and the last
// at x = width, so the first and last columns are half outside the plot and are
// clipped to half width. `Wide` is where to look — thirty bars, which is the
// density §10.3 says it is visible at. It was looked at here and accepted; the
// argument is in `VolumeChart.tsx`.
//
// ## Why a `ChartAxis` wraps every story
//
// Because that is how the product renders it, and the wrapper is not decoration:
// it owns the one axis both plots hang on. A volume plot that built its own
// would be the exact defect `CHARTING.md` §17.5 item 4 names, and
// `useChartAxis` throws outside a provider so that shape cannot be reached by
// accident — in the workshop either.
//
// The price chart is deliberately **not** in these stories. `ChartAxis.stories`
// is where the pair is reviewed as a pair; this is where the plot is reviewed as
// a plot.

const meta = {
  title: "Market/VolumeChart",
  component: VolumeChart,
} satisfies Meta<typeof VolumeChart>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One plot at a region width, inside the axis it hangs on. */
function Plot({
  view,
  width,
}: {
  readonly view: BarSeriesView;
  readonly width: "wide" | "narrow";
}) {
  return (
    <div className={styles[width]}>
      <ChartAxis view={view}>
        <VolumeChart symbol="NVDA" view={view} />
      </ChartAxis>
    </div>
  );
}

/**
 * The region at a 1920 viewport, thirty bars — **the gapped regime**, and the
 * one width where a column's own edges are visible.
 *
 * Two things to check here and nowhere else: that the columns read as columns
 * rather than as a filled area, which is the entire job of the 1px gap; and the
 * half-width column at each end.
 */
export const Wide: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("full") },
  render: (args) => <Plot view={args.view} width="wide" />,
};

/** The same window at a 1024 viewport, where the compact height takes over. */
export const Narrow: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("full") },
  render: (args) => <Plot view={args.view} width="narrow" />,
};

/**
 * **1,950 real minute bars — the default window's actual density, and the
 * silhouette regime.**
 *
 * 0.37px per bar, so the stems overlap completely and only the tallest in each
 * pixel column could ever be seen. The plot draws one stem per pixel carrying
 * that column's maximum, which paints the *identical* picture and bounds the
 * cost by the plot's width rather than by the bar count: 726 stems and a 10.6 kB
 * path attribute, where one stem per bar at a month's window would be 8,190 and
 * 158 kB.
 *
 * This is the story that proves the rendering decision rather than the one that
 * only looks good, and it is what a reader of this screen actually sees today.
 */
export const Dense: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("dense") },
  render: (args) => <Plot view={args.view} width="wide" />,
};

/**
 * Before the first answer — the frame and its baseline, and nothing on it.
 *
 * **No wash**, deliberately: nothing is known to be missing before anything has
 * been answered, which is what tells this apart from `NoBars` below.
 */
export const Waiting: Story = {
  args: { symbol: "NVDA", view: { state: "loading" } },
  render: (args) => <Plot view={args.view} width="wide" />,
};

/**
 * A 200 with nothing in it — the uncovered treatment at coverage zero, which is
 * what CI's store returns for every window.
 *
 * The axis is real and its two dates are labelled, because that window *was*
 * asked for. There is no peak label, because a peak of nothing is not zero
 * shares traded — it is no answer, and the sentence beside the plot says so.
 */
export const NoBars: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("empty") },
  render: (args) => <Plot view={args.view} width="wide" />,
};

/**
 * **The ordinary state of this screen**: a window asked for, covered up to some
 * point and no further.
 *
 * The columns stop at the coverage edge; the baseline, the seams and both dates
 * run the full frame, because the reader asked for that window. Put it beside
 * the price chart's `Uncovered` story — the two stop at the same pixel, and
 * that is arithmetic rather than luck: both are handed one `coverage` by the
 * axis above them.
 */
export const Uncovered: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("uncovered") },
  render: (args) => <Plot view={args.view} width="wide" />,
};

/**
 * A refusal, which draws **nothing at all** — no frame, no baseline.
 *
 * A story rather than an omission, for the price chart's reason: *"nobody
 * revisited it"* and *"it was decided"* render identically. Neither refused nor
 * failed carries a series, so neither carries a window, and a baseline under
 * either would be the zero of a scale nobody asked for.
 */
export const Refused: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("refusedUnknownSymbol") },
  render: (args) => <Plot view={args.view} width="wide" />,
};

/**
 * **The same two states, beside the sentence they now carry** (Task 2.14.7) —
 * and the reason this story exists is that `Refused` above was reviewed once a
 * story and was correct, while the *page* it produced was not.
 *
 * Drawing no picture is right: neither state carries a window. Drawing nothing
 * **at all** left the Volume region a named landmark with a visible heading and
 * an empty box under it, next to a Price region that had just given three lines
 * and a `Try again`. The half that says nothing reads as the half that broke.
 *
 * What is drawn instead is a **deferral**, not a second explanation. The Price
 * region owns this failure — the server's own words, the retryable judgement
 * and the screen's one retry for it — so this points and stops. The shape is
 * `SecuritySearch`'s, which has deferred to the tracked universe since Story
 * 2.11 for the same reason.
 *
 * Both causes are here rather than one, because the sentence is deliberately
 * the same for a refusal and a failure: what differs between them is the
 * explanation, and the explanation is not this region's to give.
 */
export const DeferredToThePriceRegion: Story = {
  args: { symbol: "NVDA", view: barSeriesFixtureView("refusedUnknownSymbol") },
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className={gridStyles.grid}>
      {(
        [
          ["Refused — a fact about the request", "refusedUnknownSymbol"],
          ["Failed — nothing arrived", "unavailable"],
        ] as const
      ).map(([label, fixture]) => (
        <Fragment key={fixture}>
          <p className={gridStyles.label}>{label}</p>
          <Plot view={barSeriesFixtureView(fixture)} width="wide" />
        </Fragment>
      ))}
    </div>
  ),
};

/**
 * **The three causes of a volume plot with no columns, side by side** (Task
 * 2.13.7) — the picture a reader is most likely to misread, and a window change
 * can move between all three of them.
 *
 * Every one of them is a plot with nothing drawn in it, and what separates them
 * is the **ground** and the **gutter** rather than the columns:
 *
 *  - **Nothing asked for yet** — `loading`. No wash, no label: nothing is known
 *    to be missing, only unanswered.
 *  - **Nothing held** — `empty`. The whole frame is uncovered ground, and the
 *    gutter is blank rather than `0`, because a peak of nothing is not zero
 *    shares traded.
 *  - **Nothing traded** — a genuine `loaded` in which every bar's volume is
 *    zero. No wash, a baseline with no columns on it, and a real `0` in the
 *    gutter. `volumeDomain` answers an all-zero window with a ceiling of one
 *    share, so the columns are zero pixels tall rather than undefined.
 *
 * The third has no recorded body and cannot have one: no hour in the store has
 * 390 consecutive prints of zero volume, which is a fact about the market
 * rather than about this directory. It is therefore built by zeroing the
 * volumes of a **recorded** series — one field, the same single documented step
 * `incoherent.json` and `unknown-feed.json` are derived from — so the window,
 * the coverage and the instants are all still the server's.
 *
 * The three are adjacent here because that is the only place anybody can
 * compare them; they are never adjacent in the product.
 */
export const ColumnlessCauses: Story = {
  args: { symbol: "NVDA", view: { state: "loading" } },
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className={gridStyles.grid}>
      {(
        [
          ["Nothing asked for yet — loading", { state: "loading" } as const],
          ["Nothing held — empty", barSeriesFixtureView("empty")],
          ["Nothing traded — loaded, and a 0", untraded()],
        ] as const
      ).map(([label, view]) => (
        <Fragment key={label}>
          <p className={gridStyles.label}>{label}</p>
          <Plot view={view} width="wide" />
        </Fragment>
      ))}
    </div>
  ),
};

/**
 * A recorded series with every bar's volume set to zero.
 *
 * The one derivation in this file, and it is the same shape the fixture module
 * sanctions: a recorded body with **one field changed**, so that everything
 * else about it — the window, the coverage, the instants, the provenance — is
 * still what the server sent. A hand-written series would be free to be wrong
 * about all four.
 */
function untraded(): BarSeriesView {
  const view = barSeriesFixtureView("full");
  if (view.state !== "loaded") throw new Error("full is not a loaded series");

  return {
    ...view,
    series: {
      ...view.series,
      bars: view.series.bars.map((bar) => ({ ...bar, volume: 0 })) as [
        (typeof view.series.bars)[number],
        ...(typeof view.series.bars)[number][],
      ],
    },
  };
}
