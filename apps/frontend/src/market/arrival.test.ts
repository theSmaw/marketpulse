import { describe, expect, it } from "vitest";
import type { Bar } from "@marketpulse/shared";

import { arrivalKey, observationIdentity } from "./arrival.js";

// What counts as an arrival, tested without a DOM. The rendering is
// `UniverseTable.test.tsx`'s and `SecurityIdentity.test.tsx`'s.

const bar = (over: Partial<Bar> = {}): Bar => ({
  startsAt: new Date("2026-09-16T13:30:00.000Z"),
  open: 219.4,
  high: 219.6,
  low: 219.3,
  close: 219.4,
  volume: 1_000,
  ...over,
});

describe("observationIdentity", () => {
  it("is nothing for a security with no observation", () => {
    expect(observationIdentity(undefined)).toBeUndefined();
  });

  it("is the same for the same observation", () => {
    expect(observationIdentity(bar())).toBe(observationIdentity(bar()));
  });

  // **The revision case, and Task 3.4.6 changed the identity for it.** A
  // corrected bar carries the minute it corrects, so keying on the instant
  // drew no mark at all while the figure moved — the exact inverse of what the
  // mark means. §7.8 measured 14 revisions in one session, three changing a
  // close.
  it("changes when a revision corrects the close of a minute already seen", () => {
    expect(observationIdentity(bar({ close: 219.9 }))).not.toBe(
      observationIdentity(bar()),
    );
  });

  it("changes when a revision corrects only the volume", () => {
    // A revision that adjusted only the volume still corrected the bar, and a
    // reader told *a bar arrived* has been told the truth.
    expect(observationIdentity(bar({ volume: 2_000 }))).not.toBe(
      observationIdentity(bar()),
    );
  });

  it("changes when a new minute arrives", () => {
    expect(
      observationIdentity(
        bar({ startsAt: new Date("2026-09-16T13:31:00.000Z") }),
      ),
    ).not.toBe(observationIdentity(bar()));
  });
});

describe("arrivalKey", () => {
  // **The one that stops 518 marks on first paint** — Task 3.5.4's rule at
  // 518 times the size. A snapshot is what we already held when you connected.
  it("marks nothing for an observation delivered by a snapshot", () => {
    expect(arrivalKey(bar(), true)).toBeUndefined();
  });

  it("marks an observation delivered by a bars message", () => {
    expect(arrivalKey(bar(), false)).toBe(observationIdentity(bar()));
  });

  it("marks nothing for a security with no observation", () => {
    expect(arrivalKey(undefined, false)).toBeUndefined();
  });

  // Delivery decides rather than content: an *ignore whichever observation
  // arrives first* rule would also suppress a genuine first bar for a security
  // the server had never observed, and §7.6 measured `ERIE` at 2.1% minute
  // coverage — so that case is ordinary rather than hypothetical.
  it("marks a first-ever bar for a security the snapshot did not carry", () => {
    expect(arrivalKey(bar(), false)).toBeDefined();
  });
});
