import type { Meta, StoryObj } from "@storybook/react-vite";

import gridStyles from "../stories.module.css";
import { AppHeader } from "./AppHeader.js";
import type { MarketFeedView } from "../../use-market-feed.js";
import { PATHS } from "../../routes/paths.js";

// The first component in this workshop that does not render on its own: it
// contains `NavLink`, which throws outside a router. `.storybook/preview.tsx`
// wraps every story in a `MemoryRouter` and reads the entry from the `route`
// parameter below — a memory router rather than a browser one because the
// workshop has no address bar and must not be given the browser's history.
//
// That parameter is also why the current-route states are *stories* rather than
// rows in the permutation grid: the active link comes from routing context, not
// from a prop, and two `MemoryRouter`s cannot be nested.
//
// **The grid below stopped being a cartesian product in Task 1.12.5, and that
// is the convention rather than a shortcut.** Three feed statuses times detail
// present or absent was already six full-width headers on one page; four
// backend props take the product past twenty, which is not a grid anybody
// reviews. Story 1.4's own rule is the way out and it is already written down —
// *where the product is unbounded, the story fixes representative extremes
// rather than plausible examples* — so this is a chosen set of rows, each with
// the reason it earns its place beside it. Task 2.6.7 swapped the feed axis for
// a wider one — six market-feed renderings rather than three statuses — and the
// chosen-rows convention is what absorbs it without the page growing.

// The four market-feed renderings this file uses. `FeedProvenance`'s own
// stories review all six side by side; these are the ones whose interaction
// with the *other* indicator is worth seeing in an assembled header.
const FEED = {
  iex: { state: "configured", feed: "iex" },
  synthetic: { state: "configured", feed: "synthetic" },
  notConfigured: { state: "not-configured" },
  checking: { state: "checking" },
  unknown: { state: "unknown" },
} as const satisfies Record<string, MarketFeedView>;

// A fixed time rather than `new Date()`, so a reload renders the same thing and
// a visual diff of the workshop is not a clock. Same figure as
// `BackendIndicator`'s own stories, deliberately.
const LAST_SUCCESS = new Date(2026, 8, 4, 10, 42, 17);

const meta = {
  title: "Chrome/AppHeader",
  component: AppHeader,
  parameters: { layout: "padded", route: PATHS.overview },
  args: {
    marketFeed: FEED.iex,
    // The healthy backend is the default so that the feed stories below are
    // about the feed. The states of the second indicator are reviewed in its
    // own stories and in the chosen rows at the bottom of this file.
    backendStatus: "healthy",
    backendDegradedCause: null,
    backendLastSuccessAt: LAST_SUCCESS,
    backendHasChecked: true,
  },
} satisfies Meta<typeof AppHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

// --- The market-feed renderings. None of them is an error. ---

// What Story 2.7 produces with one configuration value: a real feed, and the
// sentence §7.1 requires beside it.
export const FeedIex: Story = { args: { marketFeed: FEED.iex } };

// The default, and what a correct first run shows.
export const FeedNotConfigured: Story = {
  args: { marketFeed: FEED.notConfigured },
};

// A developer running fixtures. The one amber in this region, and the reason it
// is worth a story in the assembled header rather than only in the component's
// own: this is what a screenshot of an invented-price deployment looks like.
export const FeedSimulated: Story = { args: { marketFeed: FEED.synthetic } };

// --- The current-route states, one per route plus the unmatched case. ---

export const OnInvestigations: Story = {
  parameters: { route: PATHS.investigations },
};

export const OnSecurities: Story = {
  parameters: { route: PATHS.securities },
};

export const OnReplay: Story = {
  parameters: { route: PATHS.replay },
};

// No link is current here, which is the state a mistyped URL produces. Worth a
// story because "nothing is underlined" is easy to mistake for a broken active
// state when it is the correct rendering.
export const OnUnknownRoute: Story = {
  parameters: { route: "/not-a-route" },
};

// --- The two indicators together. ---

// The state every page load renders for one round trip, and the reason the
// placeholder exists at all: `checking` beside a feed that already knows what
// it is. Worth a story of its own because it is the most-seen rendering of this
// header and the only one nobody would think to look at.
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
// - a **real feed beside a healthy backend**: what Story 2.7 turns this into,
//   and the widest the strip gets, because IEX's sentence is the longest thing
//   this region renders.
// - an **unreachable backend with an unknown feed**: the honest pairing, since
//   the backend is what answers both questions. Two sentences under one word on
//   the right and one on the left, which is what a misconfigured
//   `VITE_API_BASE_URL` looks like from here.
// - the **not-yet-checked placeholder on both**, which is what every page load
//   renders for one round trip.
// - a **simulated feed beside a degraded backend**, which is the amber-on-amber
//   case: both indicators can take the one colour in this language at once, and
//   the check is that the shapes still tell them apart — a square on the right
//   against a square on the left, told apart by their words.
export const AllPermutations: Story = {
  parameters: {
    // The first genuine *landmark* finding this workshop produced, and it is
    // the grid's rather than the component's. `AppHeader` renders a `<header>`
    // and a `<nav>` — a banner landmark and a navigation landmark — and several
    // copies on one page are `landmark-no-duplicate-banner` and
    // `landmark-unique`, both moderate. The application renders exactly one,
    // and every single-state story above reports zero violations.
    //
    // Cutting the product down to a chosen set of rows is also what keeps this
    // disable proportionate: it silences two rules over five headers rather
    // than over twenty.
    //
    // So these two rules are switched off **here and nowhere else**. A
    // permanent `2` on this story's a11y tab would train the next author to
    // ignore the badge, which is worse than the finding. The general point is
    // worth knowing before the next landmark component: the permutation-grid
    // convention and landmark uniqueness are in direct conflict, and the grid
    // is the one that has to give.
    a11y: {
      config: {
        rules: [
          { id: "landmark-no-duplicate-banner", enabled: false },
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
        <AppHeader
          marketFeed={FEED.notConfigured}
          backendStatus="healthy"
          backendDegradedCause={null}
          backendLastSuccessAt={LAST_SUCCESS}
          backendHasChecked
        />
      </div>

      <div className={gridStyles.stackItem}>
        <span className={gridStyles.label}>
          a real feed, healthy backend — what Story 2.7 turns this into
        </span>
        <AppHeader
          marketFeed={FEED.iex}
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
        <AppHeader
          marketFeed={FEED.unknown}
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
        <AppHeader
          marketFeed={FEED.checking}
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
        <AppHeader
          marketFeed={FEED.synthetic}
          backendStatus="degraded"
          backendDegradedCause="unreadable-body"
          backendLastSuccessAt={LAST_SUCCESS}
          backendHasChecked
        />
      </div>
    </div>
  ),
};
