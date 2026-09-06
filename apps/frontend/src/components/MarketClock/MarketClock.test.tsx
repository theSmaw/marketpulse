import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { readMarketClock } from "../../use-market-clock.js";
import { MarketClock } from "./MarketClock.js";

// The six renderings, driven by six instants (Task 2.5.5).
//
// It renders `readMarketClock(instant)` rather than a hand-built reading, so
// these are tests of what the header actually shows rather than of a fixture
// somebody wrote to match the component. That is affordable because the whole
// chain below is pure — which is the seam's second dividend, after the
// out-of-range case being reachable without waiting until 2029.
//
// **The must-not-assert list applies unchanged.** Not colour, and not for a
// style reason: no stylesheet is applied in this environment, so
// `getComputedStyle` returns nothing. What carries the state is the marker's
// *shape* and the word, and the word is what is asserted.

function renderAt(iso: string) {
  return render(<MarketClock reading={readMarketClock(new Date(iso))} />);
}

describe("MarketClock", () => {
  it("shows the market's wall clock, not the viewer's", () => {
    // 14:00Z is 10:00 in New York. The assertion that fails if this ever
    // reaches for `Date#getHours()`.
    renderAt("2026-09-08T14:00:00Z");

    expect(screen.getByText("10:00:00")).toBeDefined();
  });

  it("labels the zone `ET` rather than `EDT` or `EST`", () => {
    // The decision, asserted so it cannot drift: `ET` is what §9's sketch
    // promised, it is fixed width, and it is true on both sides of a DST
    // transition. The same component in November must read the same word.
    renderAt("2026-09-08T14:00:00Z");
    expect(screen.getByText("ET")).toBeDefined();

    renderAt("2026-11-24T15:00:00Z");
    expect(screen.getAllByText("ET")).toHaveLength(2);
  });

  it("names the zone for a screen reader, because `ET` read aloud is two letters", () => {
    renderAt("2026-09-08T14:00:00Z");

    // The visually-hidden prefix. `getByText` finds it because the clip-rect
    // idiom keeps the element in the accessibility tree, which is the whole
    // reason it is not `display: none`.
    expect(screen.getByText(/Market time, US Eastern/)).toBeDefined();
  });

  it("says the market is open during the session", () => {
    renderAt("2026-09-08T14:00:00Z");

    expect(screen.getByText("open")).toBeDefined();
    expect(screen.getByText("Closes at 16:00")).toBeDefined();
  });

  it("says when it opens before the bell, and when it closed after it", () => {
    // Two states, one word, two sentences — which is the whole reason
    // `MarketSessionState` is a union. Collapsing these would be the boolean
    // rebuilt.
    renderAt("2026-09-08T12:00:00Z");
    expect(screen.getByText("closed")).toBeDefined();
    expect(screen.getByText("Opens at 09:30")).toBeDefined();

    renderAt("2026-09-08T21:30:00Z");
    expect(screen.getByText("Closed at 16:00")).toBeDefined();
  });

  it("says a half day closes early, in the future tense and then the past", () => {
    // The fact a boolean throws away. Both bounds come off the session rather
    // than from a constant, so the sentence cannot disagree with the schedule.
    renderAt("2026-11-27T17:00:00Z"); // 12:00 ET, closes 13:00
    expect(screen.getByText("open")).toBeDefined();
    expect(screen.getByText("Closes early at 13:00")).toBeDefined();

    renderAt("2026-11-27T19:00:00Z"); // 14:00 ET
    expect(screen.getByText("Closed early at 13:00")).toBeDefined();
  });

  it("names a closure", () => {
    renderAt("2026-11-26T15:00:00Z");

    expect(screen.getByText("closed")).toBeDefined();
    expect(screen.getByText("Thanksgiving Day")).toBeDefined();
  });

  it("names a closure that is not a holiday", () => {
    // The row that decides the copy. A template of the shape "Closed for the
    // holiday: X" is wrong for this one, and it is real and in range — which is
    // why the word above and the name below are two elements rather than one
    // sentence.
    renderAt("2025-01-09T15:00:00Z");

    expect(
      screen.getByText("National Day of Mourning (President Carter)"),
    ).toBeDefined();
  });

  it("says a weekend is a weekend", () => {
    renderAt("2026-09-05T16:00:00Z");

    expect(screen.getByText("closed")).toBeDefined();
    expect(screen.getByText("Weekend")).toBeDefined();
  });

  it("shows the time and declines the session state past the calendar's range", () => {
    // Asserted by moving the instant rather than by waiting for 2029. The two
    // halves are the point: the time survives, because it is a timezone
    // conversion with no range, and the state does not, because the calendar
    // has one.
    renderAt("2029-01-02T15:00:00Z");

    expect(screen.getByText("10:00:00")).toBeDefined();
    expect(screen.getByText("unknown")).toBeDefined();
    expect(screen.getByText("Trading calendar ends 2028-12-31")).toBeDefined();
  });

  it("never says the market is closed when it only means it does not know", () => {
    // The distinction the whole degradation rests on. `null` is "declines to
    // claim", and rendering it as `closed` would be a confident guess about a
    // market nobody here has any information about.
    renderAt("2029-01-02T15:00:00Z");

    expect(screen.queryByText("closed")).toBeNull();
    expect(screen.queryByText("open")).toBeNull();
  });
});
