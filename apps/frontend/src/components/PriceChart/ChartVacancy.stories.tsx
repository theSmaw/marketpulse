import type { Meta, StoryObj } from "@storybook/react-vite";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { ChartAxis } from "./ChartAxis.js";
import { ChartVacancy } from "./ChartVacancy.js";
import type { ChartVacancyProps } from "./ChartVacancy.js";
import type { StoredHistory } from "./chart-vacancy.js";
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
// **And since Task 2.14.6: whether the two empty answers read as two answers
// rather than as two severities.** `TheTwoAnswers` puts them side by side, which
// is the only arrangement that can be judged — each on its own looks correct,
// and what a reviewer has to check is that neither ranks above the other. They
// are deliberately identical in marker, type, ink, position and ground; the
// entire difference is the **subject of the headline**, because the difference
// between them is a fact about our store and not about severity. Both are
// correct 200s.
//
// `UniverseUnavailable` is the third state and the rule rather than a state
// somebody forgot: when `GET /securities` has failed or has not landed, the
// vacancy says the **window** sentence. It never infers *we hold nothing* from
// an absence it could not read, and it must be reviewed precisely because it
// looks identical to `Empty` — a reviewer's job here is to confirm there is no
// third treatment to find.
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

/**
 * The args every story shares, so a story says only what it is *about*.
 *
 * `ChartVacancy` takes no children and has no bare story — see the header — so
 * these drive the Storybook controls rather than the render, and a story that
 * differs from `Empty` by one field spells only that field.
 */
const EMPTY_ARGS = {
  compact: false,
  requested: emptyWindow(),
  stored: "some",
  subject: "bars",
  symbol: "NVDA",
} satisfies ChartVacancyProps;

/** The pair, on one axis, at a region width — which is how the product draws it. */
function Pair({
  view,
  width,
  stored = "unknown",
}: {
  readonly view: BarSeriesView;
  readonly width: "wide" | "narrow";
  readonly stored?: StoredHistory;
}) {
  return (
    <div className={styles[width]}>
      <ChartAxis view={view}>
        <PriceChart stored={stored} symbol="NVDA" view={view} />
        <VolumeChart stored={stored} symbol="NVDA" view={view} />
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
  args: EMPTY_ARGS,
  render: () => (
    <Pair stored="some" view={barSeriesFixtureView("empty")} width="wide" />
  ),
};

/**
 * **The other empty answer: we hold nothing for this security at all.**
 *
 * The state `pnpm store:bare` and CI are in for every security, and the state a
 * newly added security is in until the next backfill. It is derived from the
 * universe response rather than from the series — a symbol absent from
 * `coverage` holds no bars — so nothing about the body drawn here differs from
 * `Empty` above. Only the sentence does.
 *
 * The judgement: does *changing the window will not help* read as help rather
 * than as an apology? It is the only sentence in the product that tells a reader
 * a visible control is the wrong move, and it says so because the control is
 * right there and unpressed.
 */
export const NothingStored: Story = {
  args: { ...EMPTY_ARGS, stored: "none" },
  render: () => (
    <Pair stored="none" view={barSeriesFixtureView("empty")} width="wide" />
  ),
};

/**
 * **The two answers side by side**, which is the only way the weight question
 * can be reviewed.
 *
 * Separately, each is plainly correct. Together, the thing to check is that
 * neither looks worse than the other — no second marker, no amber, no heavier
 * ink, no extra line of chrome. The difference is what the headline is *about*.
 */
export const TheTwoAnswers: Story = {
  args: EMPTY_ARGS,
  render: () => (
    <div className={styles.stack}>
      <Pair stored="none" view={barSeriesFixtureView("empty")} width="narrow" />
      <Pair stored="some" view={barSeriesFixtureView("empty")} width="narrow" />
    </div>
  ),
};

/**
 * **The universe answer is not available**, so the vacancy says the window
 * sentence.
 *
 * Identical to `Empty` on purpose. The rule is that a failed or in-flight
 * `GET /securities` must never produce a confident sentence about the store —
 * that is the same defect this task exists to remove, arriving from the other
 * side — and the way a rule like that is reviewed is by confirming that the
 * screen it produces is one the product already has.
 */
export const UniverseUnavailable: Story = {
  args: { ...EMPTY_ARGS, stored: "unknown" },
  render: () => (
    <Pair stored="unknown" view={barSeriesFixtureView("empty")} width="wide" />
  ),
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
  args: { ...EMPTY_ARGS, compact: true },
  render: () => (
    <Pair stored="some" view={barSeriesFixtureView("empty")} width="narrow" />
  ),
};

/**
 * The same compact height, holding case one.
 *
 * The one place the four literals are visibly four: the price plot loses its
 * detail line here and the volume plot never had one, so both densities rest
 * entirely on a headline that has to name its own subject. A volume plot saying
 * *none for this window* under a price plot saying *no history for NVDA yet*
 * would tell a reader two stories about one screen, which is the reason case
 * one has a volume literal at all.
 */
export const CompactNothingStored: Story = {
  args: { ...EMPTY_ARGS, compact: true, stored: "none" },
  render: () => (
    <Pair stored="none" view={barSeriesFixtureView("empty")} width="narrow" />
  ),
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
