import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import { barSeriesFixtureView } from "../../fixtures/bar-series.js";
import {
  LOADING_UNIVERSE,
  securitiesFixtureView,
} from "../../fixtures/securities.js";
import type { BarSeriesView } from "../../market/index.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import type { SecuritiesView } from "../../use-securities.js";
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
//    below was the recorded stitch with **one field changed**, through the real
//    transition.
//
//    **CLOSED 2026-09-24 by Task 3.9.7.** There is a seventeenth body now and
//    it holds two TAPES — `two-feed.json`, 60 `sip` minutes then 30 `iex`,
//    recorded from this product's own server reading its own store. The story
//    below uses it, and the function that changed one field is deleted with a
//    `pnpm invariants` check behind its absence.
//  - **a feed that is not the configured one.** Same cause from the other side:
//    it needs a deployment whose provider declares a feed the stored bars do not
//    carry, and nothing constructs one yet.
//
// The third notable state is the one nobody would think to draw and is the
// commonest in the suite: **no bars.** CI's store is 518 securities and zero
// bars, so that is what every chart in the browser suite renders — and
// `SOURCE_OF_NOTHING` hands this component a complete, entirely truthful
// provenance record describing **zero numbers**. Printing it under an empty
// frame would be four accurate words making a false impression.
//
// **That state stopped being "no note at all" on 2026-09-14** (Task 2.14.4).
// §0.1 is a per-clause rule, and the classification clause is about the
// universe answer rather than the bars — so on a zero-bar page it draws alone,
// and this is now the shape of the commonest page in the suite rather than an
// empty cell. The genuinely silent states are still in the grid, with their
// labels, because a state that renders nothing is indistinguishable from a
// state nobody thought about unless the grid says which it is.

const CONFIGURED_SIP: MarketFeedView = { state: "configured", feed: "sip" };

/** A security the recorded universe holds. */
const SUBJECT = "NVDA";

/** The recorded universe, through the real transition. */
const UNIVERSE = securitiesFixtureView("full");

/**
 * The same universe with the server's one claim withdrawn.
 *
 * **Derived rather than recorded, and the derivation is the contract.**
 * `provenance` is absent from the envelope the moment two rows stop sharing one
 * pair — the day Alpaca fills the profile fields on a different date than the
 * curated file filled the classification ones — and no server this product runs
 * can produce that today, because there is one curated file. It is one field
 * removed from a body that went through `toSecuritiesView`, which is
 * the admissibility argument Task 3.9.7 retired for the bar series, applied to
 * the other request — and the other request has no recorded body that carries
 * it, so this one stands.
 */
function withoutProvenance(view: SecuritiesView): SecuritiesView {
  if (view.state !== "loaded") throw new TypeError("expects a universe");
  return { ...view, provenance: null };
}

const meta = {
  title: "Market/SourceNote",
  component: SourceNote,
  parameters: { layout: "padded" },
  args: {
    shown: barSeriesFixtureView("full"),
    feed: CONFIGURED_SIP,
    securities: UNIVERSE,
    symbol: SUBJECT,
  },
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
  args: { shown: barSeriesFixtureView("twoFeed") },
};

/**
 * The same two stretches, arriving rather than stored (Task 3.10.8).
 *
 * **These two stories are the reason the marker exists.** The ledger above and
 * the one below hold identical rows — `All US exchanges` then `IEX`, with the
 * same counts — and they are different claims: that one is a window the server
 * answered with two tapes, which Story 3.8 made ordinary; this one is a stored
 * window a page has been **extending over a socket** while somebody watches.
 *
 * Nothing else on the screen tells them apart, and the chrome cannot: it knows
 * whether data is arriving, not which stretch of this picture it is arriving
 * into. Put the two side by side in the workshop — that is the acceptance test
 * for this marker.
 *
 * **It is a state, so it persists**: no animation. The decaying version of this
 * disc exists and belongs to the figure it marks, and a fourth motion
 * behaviour would cost the vocabulary the legibility that is its whole value.
 * The **word** carries it — `arriving` survives greyscale, a low-vision reader
 * and a listener, and the disc is `aria-hidden`.
 */
export const TwoFeedsArriving: Story = {
  args: { shown: barSeriesFixtureView("twoFeed"), watchingLive: true },
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
 * **One clause, and it is the state CI renders on every page.**
 *
 * §0.1 — a claim about data requires data — applied **per clause**. Every
 * clause about the bars is silent, because `SOURCE_OF_NOTHING` is a complete
 * and truthful provenance record describing zero numbers and four accurate
 * words under an empty frame are read as a claim about the picture. The
 * classification clause is not about the bars: its data is the universe answer,
 * which has resolved on this same page.
 *
 * **This story's text used to say the note renders nothing here**, and Task
 * 2.14.4 is what changed it. CI's store is 518 securities and zero bars, so
 * this is the commonest page in the browser suite — and until this clause
 * shipped it was the only kind of page with no note on it at all.
 */
export const NoBars: Story = {
  args: { shown: barSeriesFixtureView("empty") },
};

/**
 * The curated file's date, absent — and the claim standing without it.
 *
 * `provenance` goes absent when the server declines to make **one** claim about
 * the whole list, which is what the envelope has predicted since Story 2.9 and
 * what happens the day the profile fields are filled on a different date than
 * the classification ones. None of that is the rows ceasing to be ours: the
 * sentence is still true and the date is the only thing we cannot say.
 *
 * **No marker, deliberately** (`PROVENANCE.md` §5.3 and Task 2.14.2's open
 * tension, resolved here). What is missing is one date inside a claim that is
 * still being made, and a marker would rank a missing date above a stated one.
 */
export const NoCuratedDate: Story = {
  args: { securities: withoutProvenance(UNIVERSE) },
};

/**
 * A symbol the universe does not hold — and the note is silent.
 *
 * There is no sector on this page to disclose the origin of, so the sentence
 * would have no subject. `SecurityIdentity` has already said what is wrong with
 * the address, in its own words and with its own marker; a second surface
 * saying it differently is the footnote pile arriving as sympathy.
 */
export const SecurityNotTracked: Story = {
  args: { shown: barSeriesFixtureView("empty"), symbol: "NOTATICKER" },
};

/**
 * The universe still in flight — the clause waits rather than guessing.
 *
 * The same answer for a universe that could not be read and for one that is
 * migrated and never loaded. All three are *we have no security here yet*,
 * which is not a claim about a curated file.
 */
export const UniversePending: Story = {
  args: { securities: LOADING_UNIVERSE },
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
            UNIVERSE,
            SUBJECT,
          ],
          [
            "Two feeds — Epic 3",
            barSeriesFixtureView("twoFeed"),
            CONFIGURED_SIP,
            UNIVERSE,
            SUBJECT,
          ],
          [
            "A feed the chrome does not claim",
            barSeriesFixtureView("full"),
            { state: "configured", feed: "iex" },
            UNIVERSE,
            SUBJECT,
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
            UNIVERSE,
            SUBJECT,
          ],
          [
            "No provider configured",
            barSeriesFixtureView("full"),
            { state: "not-configured" },
            UNIVERSE,
            SUBJECT,
          ],
          [
            "Split-adjusted",
            splitAdjusted(barSeriesFixtureView("full")),
            CONFIGURED_SIP,
            UNIVERSE,
            SUBJECT,
          ],
          [
            "Partial answer",
            barSeriesFixtureView("partial"),
            CONFIGURED_SIP,
            UNIVERSE,
            SUBJECT,
          ],
          // **No longer "renders nothing", and that is this row's whole
          // point.** Every clause about the bars is silent and the
          // classification clause is not, because its data is the universe
          // answer. It is the commonest page in the browser suite.
          [
            "No bars — the classification clause alone",
            barSeriesFixtureView("empty"),
            CONFIGURED_SIP,
            UNIVERSE,
            SUBJECT,
          ],
          [
            "No bars, no curated date",
            barSeriesFixtureView("empty"),
            CONFIGURED_SIP,
            withoutProvenance(UNIVERSE),
            SUBJECT,
          ],
          [
            "A symbol the universe does not hold — renders nothing",
            barSeriesFixtureView("empty"),
            CONFIGURED_SIP,
            UNIVERSE,
            "NOTATICKER",
          ],
          [
            "Refused, universe pending — renders nothing",
            barSeriesFixtureView("refusedCap"),
            CONFIGURED_SIP,
            LOADING_UNIVERSE,
            SUBJECT,
          ],
          [
            "Before the first answer",
            { state: "loading" } as const,
            CONFIGURED_SIP,
            LOADING_UNIVERSE,
            SUBJECT,
          ],
        ] as const satisfies readonly (readonly [
          string,
          BarSeriesView,
          MarketFeedView,
          SecuritiesView,
          string,
        ])[]
      ).map(([label, shown, feed, securities, symbol]) => (
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
            <SourceNote
              shown={shown}
              feed={feed}
              securities={securities}
              symbol={symbol}
            />
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
 * The same admissibility argument Task 3.9.7 retired for the FEED, and a
 * weaker version of it — weaker because this one cannot be recorded at all: `STORED_BAR_ADJUSTMENT` is `raw` — a statement about what Story 2.8's
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
