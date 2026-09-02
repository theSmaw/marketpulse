// A feed state is a marker *shape* plus a word, and the word is what a test can
// see. PRODUCT_SPEC.md §36 makes stale and disconnected product states rather
// than failures, which is why nothing here asserts an `alert` role — a
// component that grew one would be making a working feed look broken.

import { render, screen } from "@testing-library/react";
import { FEED_STATUSES } from "@marketpulse/shared";
import { describe, expect, it } from "vitest";

import { FeedIndicator } from "./FeedIndicator.js";

describe("FeedIndicator", () => {
  it.each(FEED_STATUSES)("names the %s state in text", (status) => {
    render(<FeedIndicator status={status} />);

    expect(screen.getByText(status)).toBeDefined();
  });

  it("is never announced as an error, in any state", () => {
    for (const status of FEED_STATUSES) {
      const { unmount } = render(<FeedIndicator status={status} />);
      expect(screen.queryByRole("alert")).toBeNull();
      unmount();
    }
  });

  // `exactOptionalPropertyTypes` makes "absent" and "present as undefined"
  // different types, so the two calls below are genuinely two shapes rather
  // than one with a default — the same distinction `apiError()` encodes on the
  // backend.
  it("shows a detail when given one and nothing when not", () => {
    const { unmount } = render(
      <FeedIndicator status="disconnected" detail="Data through 10:42:17" />,
    );
    expect(screen.getByText("Data through 10:42:17")).toBeDefined();
    unmount();

    render(<FeedIndicator status="disconnected" />);
    expect(screen.queryByText("Data through 10:42:17")).toBeNull();
  });
});
