import { MARKET_FEED_DESCRIPTIONS, MARKET_FEEDS } from "@marketpulse/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeedProvenance } from "./FeedProvenance.js";
import type { MarketFeedView } from "../../use-market-feed.js";

// What is asserted here is that the **words on screen come from
// `MARKET_FEED_DESCRIPTIONS`**, not that they read a particular way. That is
// the whole product requirement of this component: §7.1's sentence is the
// requirement and the label is the affordance, and a literal written here would
// be the second copy that drifts. So every expectation below reads the shared
// record rather than restating it — which is also why re-wording that record
// leaves this file green, correctly, and re-wording the component makes it red.
//
// Colour is asserted nowhere, and cannot be: no global stylesheet is applied in
// the test environment, so `getComputedStyle` returns nothing. The workshop is
// where the amber is checked, and the marker's shape is what carries the state
// in greyscale anyway.

/**
 * Every rendering, built from the vocabulary rather than listed — so a feed
 * added to `MARKET_FEEDS` is covered by the two sweeps below without an edit,
 * and `MARKET_FEED_DESCRIPTIONS`' own `satisfies` guarantees it arrives with
 * words to render.
 */
const EVERY_VIEW: readonly MarketFeedView[] = [
  { state: "checking" },
  { state: "not-configured" },
  { state: "unknown" },
  ...MARKET_FEEDS.map((feed) => ({ state: "configured", feed }) as const),
];

describe("FeedProvenance", () => {
  it("renders each feed's own label and sentence, from the shared record", () => {
    for (const feed of MARKET_FEEDS) {
      const { unmount } = render(
        <FeedProvenance view={{ state: "configured", feed }} />,
      );

      const { label, sentence } = MARKET_FEED_DESCRIPTIONS[feed];
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByText(sentence)).toBeTruthy();

      unmount();
    }
  });

  // The requirement §7.1 actually states, asserted as a property rather than as
  // a string: a reader must not come away believing this is full US coverage.
  // IEX's sentence has to say so in words, because three letters do not.
  it("says IEX is not the full US tape, in a sentence rather than an acronym", () => {
    render(<FeedProvenance view={{ state: "configured", feed: "iex" }} />);

    expect(screen.getByText(/not the full US consolidated tape/i)).toBeTruthy();
  });

  // `PROVIDER.md` §5.4's safety mechanism, on screen. A fixture-backed
  // deployment serves invented prices and must say so without anybody
  // remembering a banner.
  it("says a synthetic feed is not a market feed", () => {
    render(
      <FeedProvenance view={{ state: "configured", feed: "synthetic" }} />,
    );

    expect(screen.getByText(/not a market feed/i)).toBeTruthy();
  });

  it("says so when no provider is configured, which is the default", () => {
    render(<FeedProvenance view={{ state: "not-configured" }} />);

    expect(screen.getByText("not configured")).toBeTruthy();
    expect(
      screen.getByText(/No market-data provider is configured/),
    ).toBeTruthy();
  });

  it("renders a neutral placeholder with no sentence before the first answer", () => {
    const { container } = render(
      <FeedProvenance view={{ state: "checking" }} />,
    );

    expect(screen.getByText("checking")).toBeTruthy();
    // The placeholder is the one rendering with nothing under the word: there
    // is no honest sentence to write about a request that has not settled, and
    // an invented one would be the thing this component exists to remove.
    expect(container.textContent).toBe("checking");
  });

  it("reports a configuration it could not read without naming a cause", () => {
    render(<FeedProvenance view={{ state: "unknown" }} />);

    expect(screen.getByText("unknown")).toBeTruthy();
    expect(screen.getByText(/could not be read/)).toBeTruthy();
  });

  // Task 1.12.2's rule, asserted rather than trusted: a correlation id may
  // appear only as a labelled reference beside a failure a user is being asked
  // to report, and this reports a state. The hook does not even hand one over —
  // this is the check that keeps it that way if somebody adds one.
  it("renders no identifier in any state", () => {
    for (const view of EVERY_VIEW) {
      const { container, unmount } = render(<FeedProvenance view={view} />);

      expect(container.textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);

      unmount();
    }
  });

  // The marker is a silhouette and reading one aloud says nothing, so every
  // state's meaning has to be carried by text. `Marker` is `aria-hidden`
  // unconditionally, which is what this asserts from the outside.
  it("carries a word for every state, so the marker never has to be read", () => {
    for (const view of EVERY_VIEW) {
      const { container, unmount } = render(<FeedProvenance view={view} />);

      expect(container.textContent.trim().length).toBeGreaterThan(0);

      unmount();
    }
  });
});
