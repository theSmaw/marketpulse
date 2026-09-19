import type { Meta, StoryObj } from "@storybook/react-vite";

import gridStyles from "../stories.module.css";
import { AppFooter } from "./AppFooter.js";
import type { LiveFeedView } from "../../market/index.js";
import type { MarketFeedView } from "../../use-market-feed.js";

/** Nothing observed. §11.1: absence is the answer, and `{}` is the true one. */
const NO_OBSERVATIONS = new Map();

// The status bar, and **this file is `AppHeader`'s status-strip half, moved**
// (2026-09-16). Every story below was one of its stories; what changed is the
// component they are rendered against and, in one case worth looking at twice,
// what the arrangement does to a long sentence.
//
// **The grid at the bottom is a chosen set of rows, not a cartesian product**,
// and that is the convention rather than a shortcut. Six market-feed renderings
// times four backend props is past twenty rows, which is not a grid anybody
// reviews. Story 1.4's rule is the way out and is already written down — *where
// the product is unbounded, the story fixes representative extremes rather than
// plausible examples* — so each row below carries the reason it earns its place.
//
// One thing this component has that the strip did not: it is `position: sticky`
// in the application and is not here, because the workshop mounts it in a story
// with no scroll container. `useStickyFooterHeight` checks `position` rather
// than assuming it for exactly this reason, so these stories publish `0px` and
// reserve nothing — which is the truth in a workshop.

// The market-feed renderings this file uses. `FeedProvenance`'s own stories
// review all six side by side; these are the ones whose interaction with the
// *other* indicator is worth seeing in an assembled bar.
//
// **`sip` was added by Task 2.7.4, which made it the deployed value**, and the
// two real feeds are kept for opposite reasons: `sip` has the longest **label**
// this chrome can render (17 uppercase letter-spaced characters against
// `SIMULATED`'s nine) and `iex` the longest **sentence** (77 characters). In
// the strip that sentence wrapped inside a `34ch` measure; in a one-line bar it
// is the row's own width that absorbs it, and whether it still does at 768 is
// what `FeedIex` is for.
const FEED = {
  iex: { state: "configured", feed: "iex" },
  sip: { state: "configured", feed: "sip" },
  synthetic: { state: "configured", feed: "synthetic" },
  notConfigured: { state: "not-configured" },
  checking: { state: "checking" },
  unknown: { state: "unknown" },
} as const satisfies Record<string, MarketFeedView>;

// A fixed time rather than `new Date()`, so a reload renders the same thing and
// a visual diff of the workshop is not a clock. Same figure as
// `BackendIndicator`'s own stories, deliberately.
const LAST_SUCCESS = new Date(2026, 8, 4, 10, 42, 17);

// The observation instant the degraded connection states qualify themselves
// with. Fixed for the same reason as the figure above, and taken from §7.3's
// measured frame — `14:01:00Z` is the bar; the screen shows the market's wall
// clock for it.
const OBSERVED_AT = Date.parse("2026-09-16T14:01:00Z");

/**
 * The connection states, as views the application can actually reach.
 *
 * Hand-built rather than driven through `advanceLiveFeed`, unlike the bar
 * fixtures: these are five fields with no transition worth preserving, and a
 * socket in a story is the one thing the workshop cannot have.
 */
const LIVE = {
  live: {
    status: "live",
    feed: "iex",
    backendReachable: true,
    observedAt: OBSERVED_AT,
    unreadable: 0,
    observations: NO_OBSERVATIONS,
  },
  stale: {
    status: "stale",
    feed: "iex",
    backendReachable: true,
    observedAt: OBSERVED_AT,
    unreadable: 0,
    observations: NO_OBSERVATIONS,
  },
  disconnected: {
    status: "disconnected",
    feed: "iex",
    backendReachable: true,
    observedAt: OBSERVED_AT,
    unreadable: 0,
    observations: NO_OBSERVATIONS,
  },
  replaying: {
    status: "live",
    feed: "replay",
    backendReachable: true,
    observedAt: OBSERVED_AT,
    unreadable: 0,
    observations: NO_OBSERVATIONS,
  },
  /** Our own socket is gone. `STORY.md` open decision 3: this says so. */
  lost: {
    status: "disconnected",
    feed: "iex",
    backendReachable: false,
    observedAt: OBSERVED_AT,
    unreadable: 0,
    observations: NO_OBSERVATIONS,
  },
  /** The first paint. No word, and nothing collapses — see the cell beside it. */
  connecting: {
    status: "disconnected",
    feed: null,
    backendReachable: true,
    observedAt: undefined,
    unreadable: 0,
    observations: NO_OBSERVATIONS,
  },
  /** No provider: the grid's `—`, and the indicator renders nothing at all. */
  none: {
    status: "disconnected",
    feed: null,
    backendReachable: true,
    observedAt: undefined,
    unreadable: 0,
    observations: NO_OBSERVATIONS,
  },
} satisfies Record<string, LiveFeedView>;

const meta = {
  title: "Chrome/AppFooter",
  component: AppFooter,
  parameters: { layout: "padded" },
  args: {
    marketFeed: FEED.iex,
    // A live connection is the default so the feed stories below are about the
    // feed. The connection's own six renderings are reviewed in
    // `FeedIndicator`'s stories, and the two that change this bar's HEIGHT —
    // the ones carrying a second sentence — are at the bottom of this file.
    liveFeed: LIVE.live,
    // The healthy backend is the default so that the feed stories below are
    // about the feed. The states of the second indicator are reviewed in its
    // own stories and in the chosen rows at the bottom of this file.
    backendStatus: "healthy",
    backendDegradedCause: null,
    backendLastSuccessAt: LAST_SUCCESS,
    backendHasChecked: true,
  },
} satisfies Meta<typeof AppFooter>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- The market-feed renderings. None of them is an error. ---

// A real feed, and the sentence §7.1 requires beside it. This is the row that
// tests the bar's width: IEX's sentence is the longest in
// `MARKET_FEED_DESCRIPTIONS`. Nothing produces it yet — Epic 3's live stream is
// the sibling provider entitled to it.
export const FeedIex: Story = { args: { marketFeed: FEED.iex } };

// What the deployed site reads, and the longest *label* this bar renders.
export const FeedConsolidatedTape: Story = {
  args: { marketFeed: FEED.sip },
};

// The default deployment: `MARKET_DATA_PROVIDER` defaults to `none`, so this is
// what a correct first run looks like. Not a failure and not drawn as one.
export const FeedNotConfigured: Story = {
  args: { marketFeed: FEED.notConfigured },
};

// Invented prices, said in the one place a reader is entitled to assume nothing
// is invented. Worth a story of its own: this is what a screenshot of an
// invented-price deployment looks like.
export const FeedSimulated: Story = { args: { marketFeed: FEED.synthetic } };

// --- The two indicators together. ---

// The state every page load renders for one round trip, and the reason the
// placeholder exists at all: `checking` beside a feed that does not know what
// it is either. Worth a story of its own because it is the most-seen rendering
// of this bar and the only one nobody would think to look at.
export const BackendNotYetChecked: Story = {
  args: {
    marketFeed: FEED.checking,
    backendHasChecked: false,
    backendLastSuccessAt: null,
  },
};

// Both indicators failing at once, which is the honest rendering when the
// backend is the thing that answers both questions: the feed is `unknown`
// because the request that would have told us did not come back.
export const BackendUnreachable: Story = {
  args: {
    marketFeed: FEED.unknown,
    // Our socket is gone too, and the connection cell says so rather than
    // staying silent — `STORY.md` open decision 3.
    liveFeed: LIVE.lost,
    backendStatus: "unreachable",
  },
};

// A **chosen set of rows**, not a cartesian product — see the note at the top
// of this file. Each row is here for a stated reason and none of them is a
// plausible-looking filler:
//
// - **no provider configured beside a healthy backend**: the default
//   deployment, and the two indicators disagreeing — which is the whole
//   argument for there being two of them rather than one. If this row ever
//   reads as contradictory, the wrong decision was taken in Task 1.12.4.
// - a **real feed beside a healthy backend**: what Story 2.7 turned this into,
//   and since Task 2.7.4 it renders the value the deployed site actually
//   serves. It is `sip` rather than `iex` because that is the deployed feed and
//   because its label is the longest word this bar renders; `iex`'s longer
//   *sentence* is reviewed in `FeedIex` above.
// - an **unreachable backend with an unknown feed**: the honest pairing, since
//   the backend is what answers both questions. This is also the row that most
//   tests the one-line arrangement — two sentences and two states on one row —
//   and it is what a misconfigured `VITE_API_BASE_URL` looks like from here.
// - the **not-yet-checked placeholder on both**, which is what every page load
//   renders for one round trip.
// - a **simulated feed beside a degraded backend**, which is the amber-on-amber
//   case: both indicators can take the one colour in this language at once, and
//   the check is that the shapes still tell them apart — a square on the right
//   against a square on the left, told apart by their words.
export const AllPermutations: Story = {
  parameters: {
    // The landmark conflict `AppHeader`'s grid met first, arriving here for the
    // same reason and with the same answer. This component renders a `<footer>`
    // — a `contentinfo` landmark — and five copies on one page are
    // `landmark-no-duplicate-contentinfo` and `landmark-unique`, both moderate.
    // The application renders exactly one, and every single-state story above
    // reports zero violations.
    //
    // Switched off **here and nowhere else**: a permanent `2` on this story's
    // a11y tab would train the next author to ignore the badge, which is worse
    // than the finding.
    a11y: {
      config: {
        rules: [
          { id: "landmark-no-duplicate-contentinfo", enabled: false },
          { id: "landmark-unique", enabled: false },
        ],
      },
    },
  },
  render: () => (
    <div className={gridStyles.stack}>
      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>
          no provider configured — the default deployment
        </span>
        <AppFooter
          marketFeed={FEED.notConfigured}
          liveFeed={LIVE.none}
          backendStatus="healthy"
          backendDegradedCause={null}
          backendLastSuccessAt={LAST_SUCCESS}
          backendHasChecked
        />
      </div>

      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>
          a real feed, healthy backend — what the deployed site reads
        </span>
        <AppFooter
          marketFeed={FEED.sip}
          liveFeed={LIVE.live}
          backendStatus="healthy"
          backendDegradedCause={null}
          backendLastSuccessAt={LAST_SUCCESS}
          backendHasChecked
        />
      </div>

      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>
          unreachable backend, unknown feed — both answered by one request
        </span>
        <AppFooter
          marketFeed={FEED.unknown}
          liveFeed={LIVE.lost}
          backendStatus="unreachable"
          backendDegradedCause={null}
          backendLastSuccessAt={null}
          backendHasChecked
        />
      </div>

      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>
          not yet checked — every page load, for one round trip
        </span>
        <AppFooter
          marketFeed={FEED.checking}
          liveFeed={LIVE.connecting}
          backendStatus="unreachable"
          backendDegradedCause={null}
          backendLastSuccessAt={null}
          backendHasChecked={false}
        />
      </div>

      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>
          degraded backend, simulated feed — both markers amber at once
        </span>
        <AppFooter
          marketFeed={FEED.synthetic}
          liveFeed={LIVE.stale}
          backendStatus="degraded"
          backendDegradedCause="unreadable-body"
          backendLastSuccessAt={LAST_SUCCESS}
          backendHasChecked
        />
      </div>
    </div>
  ),
};
