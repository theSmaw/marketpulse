import type { Meta, StoryObj } from "@storybook/react-vite";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import { ChartVacancy } from "./ChartVacancy.js";
import { PriceChart } from "./PriceChart.js";
import { VolumeChart } from "./VolumeChart.js";
import styles from "./PriceChart.stories.module.css";

// **The sentence a plot draws when it holds nothing**, reviewed in the two
// places it appears and at both densities (2026-09-14).
//
// ## What a reviewer is being asked to judge
//
// **Whether this reads as an honest answer or as a broken product**, which is
// `VOLUME-AND-WINDOW.md` §1.3's reversal trigger and the only question here that
// nothing mechanical can answer. §39 looked at the previous rendering and said it
// did not fire; §78 looked again before the opening bell and said it did — not
// because the words were wrong but because they were in the smallest type on the
// panel, below a grey box that reached the eye first.
//
// Three things carry it, and none of them is the absence of a line: the frame is
// real, drawn from the window that was asked for and carrying the session's own
// date; the whole plot is the same uncovered ground a partial answer uses for its
// short tail, so a reader who has seen one has already learned this; and the
// sentence names the window, the fact and the schedule.
//
// **Whether the ink clears the floor over the wash and not over the panel.**
// `--chart-uncovered` is 1.107:1 against the plot ground, so a sentence measured
// against the panel's background has not been measured against this one. A
// browser is the only level that can see it — `getTokens()` throws in the test
// environment, by design.
//
// **Whether the compact plot is better without the detail line than with it.**
// The volume plot is 68px tall compact and the price plot 220px. `Compact` below
// is the case, and the full sentence is still spoken either way.
//
// ## Why there is no bare story
//
// The obvious third story is the component on its own, for the type and the
// spacing. It cannot exist: the block is `position: absolute; inset: 0`, so
// outside a plot it has no box, and three of them in a row stack on top of one
// another. That is the component being what it is rather than a gap — and every
// story here draws it the way the product does, through the real state, so what
// is on screen is a state the application can reach rather than one somebody
// typed.

const meta = {
  title: "Market/ChartVacancy",
  component: ChartVacancy,
} satisfies Meta<typeof ChartVacancy>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The pair, on one axis, at a region width — which is how the product draws it. */
function Pair({
  view,
  width,
}: {
  readonly view: BarSeriesView;
  readonly width: "wide" | "narrow";
}) {
  return (
    <div className={styles[width]}>
      <ChartAxis view={view}>
        <PriceChart symbol="NVDA" view={view} />
        <VolumeChart symbol="NVDA" view={view} />
      </ChartAxis>
    </div>
  );
}

/**
 * **The state the product is in from the opening bell until that night's
 * backfill**, at a 1920 viewport.
 *
 * Both plots, because both draw it and they have to read as one answer rather
 * than as two failures: the price plot names bars and the volume plot names
 * volume, and only the price plot carries the schedule.
 */
export const Empty: Story = {
  args: { compact: false, requested: emptyWindow(), subject: "bars" },
  render: () => <Pair view={barSeriesFixtureView("empty")} width="wide" />,
};

/**
 * The same answer at a 1024 viewport, where the compact height takes over and
 * the detail line goes.
 *
 * The judgement to make here is whether the headline alone is enough. It is the
 * one place the two densities say different things, and the argument for it is
 * that a two-line note centred in a 68px plot is a wall of text over a frame the
 * reader can already see is empty.
 */
export const Compact: Story = {
  args: { compact: true, requested: emptyWindow(), subject: "bars" },
  render: () => <Pair view={barSeriesFixtureView("empty")} width="narrow" />,
};

/**
 * The window the fixture was recorded against, read back off the fixture itself.
 *
 * A literal typed here would be a second opinion about what the recorded body
 * says, and the two would drift the first time the fixture is re-recorded.
 */
function emptyWindow() {
  const view = barSeriesFixtureView("empty");
  if (view.state !== "empty") {
    throw new Error(`The empty fixture is a ${view.state}.`);
  }
  return view.series.coverage.requested;
}
