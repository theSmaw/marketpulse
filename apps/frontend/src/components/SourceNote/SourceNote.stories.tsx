import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import {
  barSeriesFixtureView,
  twoFeedStitchView,
} from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import gridStyles from "../stories.module.css";
import { SourceNote } from "./SourceNote.js";

// Every shape of the source note at once — the review that cannot be done one
// story at a time, and the reason Task 2.14.2 drew a canvas before anything was
// built: five correct additions made one at a time are how a footnote pile gets
// assembled, and the only way to see that happening is to put every state side
// by side.
//
// **Two of these states cannot be produced by any running server**, which is
// the argument for the workshop rather than a convenience:
//
//  - **two feeds.** The free Alpaca plan is asymmetric — stored history is the
//    consolidated SIP tape, the live stream is IEX only — so a series naming two
//    feeds is what Epic 3's socket produces and nothing before it can. All
//    sixteen recorded bar-series bodies carry `sip`, `stitched.json` included,
//    because both of its halves came from Alpaca's historical API. The story
//    below is the recorded stitch with **one field changed**, through the real
//    transition; see `twoFeedStitchView` for why that is admissible and a
//    hand-edited fixture is not.
//  - **a feed that is not the configured one.** Same cause from the other side:
//    it needs a deployment whose provider declares a feed the stored bars do not
//    carry, and nothing constructs one yet.
//
// The third notable state is the one nobody would think to draw and is the
// commonest in the suite: **no bars, and therefore no note at all.** CI's store
// is 518 securities and zero bars, so that is what every chart in the browser
// suite renders — and `SOURCE_OF_NOTHING` hands this component a complete,
// entirely truthful provenance record describing **zero numbers**. Printing it
// under an empty frame would be four accurate words making a false impression.
// It is in the grid as a state, with its label, because a state that renders
// nothing is indistinguishable from a state nobody thought about unless the
// grid says which it is.

const CONFIGURED_SIP: MarketFeedView = { state: "configured", feed: "sip" };

const meta = {
  title: "Market/SourceNote",
  component: SourceNote,
  parameters: { layout: "padded" },
  args: { shown: barSeriesFixtureView("full"), feed: CONFIGURED_SIP },
} satisfies Meta<typeof SourceNote>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * **What the deployed site shows**, and it is one line.
 *
 * Every source names the feed the masthead is already naming, so the note says
 * nothing about it — `PROVENANCE.md` §1.3's rule doing the work it exists for:
 * *the note states what the chrome cannot, and never repeats what the chrome
 * can.* What is left is the two facts the chrome can never carry, because both
 * are properties of a request rather than of a deployment.
 */
export const OneSource: Story = {};

/**
 * The case invariant 6 exists for, drawn before anything can produce it.
 *
 * The ledger names each stretch **in contribution order, with its bar count**,
 * and that is the decision rather than the illustration (`PROVENANCE.md` §2.2).
 * A reader told *60 bars, then 90* cannot mistake the picture for a
 * single-venue chart, and a renderer that dropped a stretch would produce a
 * note whose arithmetic does not reach the bar count on the axis. The IEX
 * sentence under it is where invariant 6's fence actually stands — not on the
 * acronym, on the sentence saying a single venue is not the whole tape.
 */
export const TwoFeeds: Story = {
  args: { shown: twoFeedStitchView() },
};

/**
 * One feed, and it is not the one this deployment claims.
 *
 * The second condition that earns a feed clause, and the same defect as the
 * stitch with the stitch removed: a deployment reading one feed can still serve
 * a stored series from another, and there one page-level label is wrong about
 * **all** of this series rather than half of it. `Source`, singular, because
 * one stretch is one source and saying *sources* of it would be a small lie in
 * the one place on this screen that exists to avoid them.
 */
export const FeedIsNotTheConfiguredOne: Story = {
  args: {
    shown: barSeriesFixtureView("full"),
    feed: { state: "configured", feed: "iex" },
  },
};

/**
 * No provider configured — the default, and what a correct first run shows.
 *
 * **The note names the feed here**, which looks like an exception and is the
 * rule: suppression requires a positive match. This deployment's chrome says
 * *not configured* and claims no feed at all, while the store still serves
 * bars — so naming the feed is stating what the chrome cannot rather than
 * repeating it.
 */
export const NoProviderConfigured: Story = {
  args: { feed: { state: "not-configured" } },
};

/**
 * **Nothing at all**, and it is the state CI renders on every page.
 *
 * §0.1: a claim about data requires data. Every clause this component ships
 * describes the bars, and there are none — so each one is silent and the note
 * with them. Task 2.14.4's classification clause is the exception that proves
 * the rule is per clause: its data is the universe answer, which has resolved,
 * so on this same page it will draw alone.
 */
export const NoBars: Story = {
  args: { shown: barSeriesFixtureView("empty") },
};

/**
 * Every shape side by side, which is the review this component exists to make
 * possible — and the one that catches a footnote pile before a reader does.
 *
 * The grid's own label column is what makes the silent state legible: a cell
 * with nothing in it, beside the name of the state that produces it.
 */
export const AllPermutations: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className={gridStyles.grid}>
      {(
        [
          [
            "One source — the deployed case",
            barSeriesFixtureView("full"),
            CONFIGURED_SIP,
          ],
          ["Two feeds — Epic 3", twoFeedStitchView(), CONFIGURED_SIP],
          [
            "A feed the chrome does not claim",
            barSeriesFixtureView("full"),
            { state: "configured", feed: "iex" },
          ],
          // A fixture-backed deployment serving a real stored series, which is
          // producible — `MARKET_DATA_PROVIDER=fixture` against a store with
          // bars in it. The chrome shouts `SIMULATED` and these particular
          // numbers are the consolidated tape, so the note correcting it is
          // exactly the job §1.3 gives it.
          [
            "Chrome says simulated; these bars are not",
            barSeriesFixtureView("full"),
            { state: "configured", feed: "synthetic" },
          ],
          [
            "No provider configured",
            barSeriesFixtureView("full"),
            { state: "not-configured" },
          ],
          [
            "Split-adjusted",
            splitAdjusted(barSeriesFixtureView("full")),
            CONFIGURED_SIP,
          ],
          ["Partial answer", barSeriesFixtureView("partial"), CONFIGURED_SIP],
          [
            "No bars — renders nothing",
            barSeriesFixtureView("empty"),
            CONFIGURED_SIP,
          ],
          [
            "Refused — renders nothing",
            barSeriesFixtureView("refusedCap"),
            CONFIGURED_SIP,
          ],
          [
            "Before the first answer",
            { state: "loading" } as const,
            CONFIGURED_SIP,
          ],
        ] as const satisfies readonly (readonly [
          string,
          BarSeriesView,
          MarketFeedView,
        ])[]
      ).map(([label, shown, feed]) => (
        <Fragment key={label}>
          <p className={gridStyles.label}>{label}</p>
          {/*
           * The wrapper is not decoration. Three of these states render
           * **nothing**, and without an element per row the grid's flow puts
           * the next state's label in the specimen column — so a silent state
           * reads as a missing one and the whole grid shifts under it. Drawn
           * this way, the empty cell is visible as an empty cell, which is what
           * the grid is for.
           */}
          <div>
            <SourceNote shown={shown} feed={feed} />
          </div>
        </Fragment>
      ))}
    </div>
  ),
};

/**
 * The recorded answer with its **adjustment** changed, so the second half of
 * this vocabulary is reviewable.
 *
 * The same admissibility argument as `twoFeedStitchView` and a weaker version
 * of it: `STORED_BAR_ADJUSTMENT` is `raw` — a statement about what Story 2.8's
 * table holds — and the stitched tail is requested at the same adjustment
 * because `mergeSeriesProvenance` would otherwise refuse, so no server this
 * product runs can send a `split-adjusted` series. It is not in the fixture
 * module because it has exactly one reader: the grid, where the point is that
 * `Split-adjusted` carries **no sentence** and `Unadjusted` does. That is ADR
 * 0019 §3's rule doing work rather than being applied uniformly, and it is only
 * checkable with the two in the same picture.
 */
function splitAdjusted(view: BarSeriesView): BarSeriesView {
  if (view.state !== "loaded") throw new TypeError("expects a loaded answer");

  return {
    ...view,
    series: {
      ...view.series,
      provenance: { ...view.series.provenance, adjustment: "split-adjusted" },
    },
  };
}
