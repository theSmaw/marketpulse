import { MARKET_FEEDS } from "@marketpulse/shared";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import gridStyles from "../stories.module.css";
import { FeedProvenance } from "./FeedProvenance.js";

// Six renderings: three feeds, plus the three states that are about **us**
// rather than about a market venue.
//
// **Two of the six cannot be produced in a browser without changing a
// deployment**, which is the argument for the workshop rather than a
// convenience. `sip` needs an entitlement this project does not have and
// `synthetic` needs `MARKET_DATA_PROVIDER=fixture`, so `AllPermutations` is the
// only place a reviewer can see the amber next to the greys and check that the
// one state carrying invented prices is the one a glance lands on.
//
// The grid is also the argument for the component. Nothing is red and nothing
// is green; the only colour is the amber on `synthetic`, and that state is the
// one square here as well, so the colour is never the only encoding. `IEX` and
// `unknown` are the same grey told apart by the marker's shape alone — the
// distinction that survives the greyscale check this palette's red and green
// fail at 1.05:1.
//
// The workshop never makes a request, which is what makes all six reviewable
// side by side without a backend to break.

const meta = {
  title: "Status/FeedProvenance",
  component: FeedProvenance,
  parameters: { layout: "padded" },
  args: { view: { state: "configured", feed: "iex" } },
} satisfies Meta<typeof FeedProvenance>;

export default meta;

type Story = StoryObj<typeof meta>;

// The state Story 2.7 produces with one configuration value, and the reason
// §7.1 exists: one exchange, not the consolidated tape.
export const Iex: Story = {
  args: { view: { state: "configured", feed: "iex" } },
};

// Not reachable on this project's plan. It is here because the sentence has to
// be reviewable beside IEX's — the two claims are opposites and a reader must
// be able to tell which one they are being told.
export const ConsolidatedTape: Story = {
  args: { view: { state: "configured", feed: "sip" } },
};

// The one that matters most and is easiest to under-design. A fixture-backed
// deployment serves invented prices, and `PROVIDER.md` §5.4's mechanism is that
// it says so structurally rather than by somebody remembering a banner.
export const Simulated: Story = {
  args: { view: { state: "configured", feed: "synthetic" } },
};

// The default, and what a correct first run shows. `MARKET_DATA_PROVIDER`
// defaults to `none` because `fixture` serves invented prices.
export const NotConfigured: Story = {
  args: { view: { state: "not-configured" } },
};

// Not a state of the deployment — a state of this browser, before the first
// answer. Rendering nothing would collapse the region and shift the chrome when
// the answer lands.
export const Checking: Story = { args: { view: { state: "checking" } } };

// The configuration could not be read. It names no cause: the two producible
// ones are the same collapse `SecuritiesFailure` makes, and the `Backend
// service` indicator one cell to the right is what says which.
export const Unknown: Story = { args: { view: { state: "unknown" } } };

export const AllPermutations: Story = {
  render: () => (
    <div className={gridStyles.grid}>
      {/* Every feed, from the vocabulary rather than a list written here — so a
          feed added to `MARKET_FEEDS` appears in this grid without an edit, and
          `MARKET_FEED_DESCRIPTIONS`' `satisfies` guarantees it arrives with
          words. */}
      {MARKET_FEEDS.map((feed) => (
        <Fragment key={feed}>
          <span className={gridStyles.label}>configured — {feed}</span>
          <FeedProvenance view={{ state: "configured", feed }} />
        </Fragment>
      ))}

      <span className={gridStyles.label}>not configured</span>
      <FeedProvenance view={{ state: "not-configured" }} />

      <span className={gridStyles.label}>unknown</span>
      <FeedProvenance view={{ state: "unknown" }} />

      <span className={gridStyles.label}>checking</span>
      <FeedProvenance view={{ state: "checking" }} />
    </div>
  ),
};
