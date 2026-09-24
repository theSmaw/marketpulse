import { describe, expect, it } from "vitest";

import { FEED_STATUSES } from "@marketpulse/shared";

import { announcesDegradation } from "./announcement.js";

// **Only a degradation is announced** (Task 3.10.6), decided by the owner.
// Silent on mount; silent on recovery.

describe("announcesDegradation", () => {
  it("says nothing on mount, whatever is showing", () => {
    // The reason a plain `role="status"` on the cell was refused: mount is the
    // commonest transition in a footer, and a bar that speaks on every page
    // load teaches a listener to ignore it.
    for (const status of FEED_STATUSES) {
      expect(announcesDegradation(undefined, status)).toBe(false);
    }
  });

  it("speaks when the feed gets worse", () => {
    expect(announcesDegradation("live", "stale")).toBe(true);
    expect(announcesDegradation("live", "disconnected")).toBe(true);
    expect(announcesDegradation("stale", "disconnected")).toBe(true);
  });

  it("stays silent on recovery, which is the news a reader wanted", () => {
    expect(announcesDegradation("stale", "live")).toBe(false);
    expect(announcesDegradation("disconnected", "live")).toBe(false);
    // An improvement rather than an exception: the socket is back and merely
    // quiet, so the same rule keeps it silent.
    expect(announcesDegradation("disconnected", "stale")).toBe(false);
  });

  it("stays silent when nothing changed", () => {
    // A re-render is not an event. Without this the region would re-announce
    // on every keepalive that produced a new view object.
    for (const status of FEED_STATUSES) {
      expect(announcesDegradation(status, status)).toBe(false);
    }
  });

  it("decides for every pair the union can produce", () => {
    // Totality rather than a sample: a fourth `FeedStatus` added without a
    // severity here would be a compile error in `announcement.ts`, and this
    // holds the run-time half.
    for (const before of FEED_STATUSES) {
      for (const after of FEED_STATUSES) {
        expect(typeof announcesDegradation(before, after)).toBe("boolean");
      }
    }
  });
});
