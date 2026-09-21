// A feed state is a marker *shape* plus a word, and the word is what a test can
// see. PRODUCT_SPEC.md §36 makes stale and disconnected product states rather
// than failures, which is why nothing here asserts an `alert` role — a
// component that grew one would be making a working feed look broken.
//
// **The words are not spelled here** (Task 3.3.5). They come from
// `CONNECTION_DESCRIPTIONS`, and a test that typed them would be a second home
// for a string `pnpm break connection-words-in-a-renderer` exists to keep to
// one.

import { CONNECTION_DESCRIPTIONS, FEED_STATUSES } from "@marketpulse/shared";
import type { FeedStatus } from "@marketpulse/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LiveFeedView } from "../../market/index.js";
import { FeedIndicator } from "./FeedIndicator.js";

/** Nothing observed. §11.1: absence is the answer, and `{}` is the true one. */
const NO_OBSERVATIONS = new Map();
/** Nothing was delivered by a snapshot — Task 3.5.4's baseline/arrival split. */
const NO_SNAPSHOT = new Set<string>();

// §7.3's measured frame: a bar stamped `14:01:00Z`, which is 10:01 in New York.
const OBSERVED_AT = Date.parse("2026-09-16T14:01:00Z");

/**
 * The shipped sentence for a state that has one.
 *
 * `ProvenanceDescription.sentence` is optional because `live` and `sip` do not
 * have one — *a sentence appears when the label cannot stand alone* — so a test
 * about a state that does needs the narrowing rather than a `?? ""` that would
 * pass silently if the sentence ever went missing.
 */
function sentenceFor(status: FeedStatus): string {
  const { sentence } = CONNECTION_DESCRIPTIONS[status];
  if (sentence === undefined) throw new Error(`${status} has no sentence`);
  return sentence;
}

const view = (over: Partial<LiveFeedView> = {}): LiveFeedView => ({
  status: "live",
  feed: "iex",
  backendReachable: true,
  observedAt: OBSERVED_AT,
  unreadable: 0,
  observations: NO_OBSERVATIONS,
  fromSnapshot: NO_SNAPSHOT,
  ...over,
});

describe("FeedIndicator", () => {
  it.each(FEED_STATUSES)("names the %s state in the shipped word", (status) => {
    render(<FeedIndicator view={view({ status })} />);

    expect(
      screen.getByText(CONNECTION_DESCRIPTIONS[status].label),
    ).toBeDefined();
  });

  it("is never announced as an error, in any state", () => {
    for (const status of FEED_STATUSES) {
      const { unmount } = render(<FeedIndicator view={view({ status })} />);
      expect(screen.queryByRole("alert")).toBeNull();
      unmount();
    }
  });

  it("says REPLAYING rather than LIVE while a replay runs", () => {
    // ADR 0030 decision 4. `live` is a claim about a connection; `LIVE` in the
    // chrome reads as a claim about the market, and on a Saturday afternoon
    // those diverge completely.
    render(<FeedIndicator view={view({ feed: "replay" })} />);

    expect(screen.queryByText(CONNECTION_DESCRIPTIONS.live.label)).toBeNull();
    expect(screen.getByText("replaying")).toBeDefined();
  });
});

describe("the two states that render nothing", () => {
  it("says nothing at all when no provider is configured", () => {
    // §11.3's grid gives that row a `—` rather than a word. `DISCONNECTED`
    // there would claim a feed broke when none was ever asked for.
    const { container } = render(
      <FeedIndicator
        view={view({
          status: "disconnected",
          feed: null,
          observedAt: undefined,
        })}
      />,
    );

    expect(container.textContent).toBe("");
  });

  it("says nothing before the first message arrives", () => {
    // The browser is connecting, not disconnected. Reporting a client's own
    // ignorance as a fact about the server is the opposite of §36.
    const { container } = render(
      <FeedIndicator view={view({ feed: null, observedAt: undefined })} />,
    );

    expect(container.textContent).toBe("");
  });

  it("DOES say so once our own socket is gone, whatever the feed identity", () => {
    // `STORY.md` open decision 3, and the pair above is what it is told apart
    // from: the `—` belongs to *the server has no provider* and not to *we
    // cannot reach the server*.
    render(
      <FeedIndicator
        view={view({
          status: "disconnected",
          feed: null,
          backendReachable: false,
        })}
      />,
    );

    expect(
      screen.getByText(CONNECTION_DESCRIPTIONS.disconnected.label),
    ).toBeDefined();
  });
});

describe("the instant, which appears only where it qualifies something", () => {
  it("is absent beside LIVE", () => {
    render(<FeedIndicator view={view()} />);

    expect(screen.queryByText(/Showing data through/u)).toBeNull();
  });

  it.each(["stale", "disconnected"] as const)(
    "is present beside %s, inside the sentence that explains it",
    (status) => {
      render(<FeedIndicator view={view({ status })} />);

      // One text node, not two: the sentence and the instant are one
      // statement, and a listener handed them separately would hear a pause
      // between a claim and the thing that qualifies it.
      const said = screen.getByText(/Showing data through/u).textContent;

      expect(said.startsWith(sentenceFor(status))).toBe(true);
      expect(said).toContain("10:01");
    },
  );

  it("is absent when there is no observation to name", () => {
    // A surface that owns nothing defers, and a clause renders only when its
    // own data is present. An instant is not invented for a feed that has
    // never delivered one.
    render(
      <FeedIndicator view={view({ status: "stale", observedAt: undefined })} />,
    );

    expect(screen.queryByText(/Showing data through/u)).toBeNull();
    expect(screen.getByText(sentenceFor("stale"))).toBeDefined();
  });
});
