import { describe, expect, it } from "vitest";

import {
  BAR_SERIES_FIXTURE_NAMES,
  barSeriesFixtureView,
} from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { chartAlternative } from "./chart-alternative.js";

// **What the chart says to somebody who cannot see it** (Task 2.12.8).
//
// Every case runs against `barSeriesFixtureView`, which collapses a body
// **recorded off the real endpoint** through the **real** state transition.
// That matters more here than it looks: the likeliest defect in a text
// alternative is a sentence that is true for `loaded` and false for `partial`,
// and a hand-built `partial` whose coverage disagrees with its bars is a state
// the layer cannot reach — so a clause tuned against one would describe the
// real thing wrongly and pass.

/** The one fixture per shape, named so a failure says which shape moved. */
const SYMBOL = "NVDA";

function alternative(name: Parameters<typeof barSeriesFixtureView>[0]): string {
  const sentence = chartAlternative(barSeriesFixtureView(name), SYMBOL);
  if (sentence === null) throw new Error(`${name} has no alternative`);
  return sentence;
}

describe("chartAlternative", () => {
  it("names its subject first, in every state that has one", () => {
    // The page carries four polite regions and a listener is handed surfaces in
    // an order no component controls (`FRONTEND-STATE.md` §7). A description
    // that opened with "a line of 1,950 closing prices" would be a fact with no
    // subject.
    for (const name of BAR_SERIES_FIXTURE_NAMES) {
      const sentence = chartAlternative(barSeriesFixtureView(name), SYMBOL);
      if (sentence !== null)
        expect(sentence.startsWith(`${SYMBOL} `)).toBe(true);
    }
  });

  it("states the range, the change, the period and the feed", () => {
    // The Work section's minimum list, checked as one sentence rather than as
    // five assertions on five substrings — what a screen reader is handed is
    // the concatenation, which is `CLAUDE.md`'s rule about what a test must not
    // assert applied to a string this time rather than to a DOM.
    expect(alternative("dense")).toBe(
      "NVDA price chart: a line of 1,950 closing prices, one per minute of " +
        "trading, opening at 218.99 and ending at 230.34, up 5.19% across the " +
        "window. The highest price on it is 234.76 and the lowest 215.10. The " +
        "line runs the full width of the window asked for, " +
        "2026-08-31 09:30:00 EDT → 2026-09-04 16:00:00 EDT. " +
        "Market feed: All US exchanges.",
    );
  });

  it("says which way the window went in a word, not in a sign", () => {
    // The chart carries direction three ways — the line's position against the
    // reference rule, the two washes, and this. Only this one survives the
    // screen being off, and `formatChangePercent`'s Unicode minus does not
    // survive being read aloud.
    expect(alternative("dense")).toContain("up 5.19% across the window");
    expect(alternative("partial")).toContain("down 0.11% across the window");
    expect(alternative("flat")).toContain("unchanged across the window");

    for (const name of ["dense", "partial", "flat"] as const)
      expect(alternative(name)).not.toContain("−");
  });

  it("is built from coverage, so a short answer does not claim a whole window", () => {
    // **The likeliest miss, named in the task's own Notes**, and the fixture
    // that produces it is the one recorded for exactly this: 780 bars of a
    // 990-minute window, where the shortfall is made of trading minutes and the
    // picture has ground to paint.
    const sentence = alternative("uncovered");

    expect(sentence).toContain(
      "The line covers the first 780 of 990 trading minutes in the window and " +
        "stops at 2026-09-04 16:00:00 EDT",
    );
    expect(sentence).toContain(
      "the rest, running to 2026-09-08 13:00:00 EDT, has no stored bars and " +
        "is drawn as empty ground",
    );
    expect(sentence).not.toContain("full width of the window asked for");
  });

  it("says so when the shortfall has no width on the axis", () => {
    // `CHARTING.md` §10.1: a `partial` answer whose shortfall is a weekend
    // occupies no slots, so the picture is complete and the answer is not. A
    // sentence derived from the drawing alone would agree with the drawing and
    // be wrong — which is the text version of an x-domain taken from the bars.
    const sentence = alternative("partial");

    expect(sentence).toContain("it is not the whole window");
    expect(sentence).toContain("the bars stop at 2026-09-04 16:00:00 EDT");
    expect(sentence).toContain("outside trading hours");
  });

  it("describes an empty answer as an answer rather than as a failure", () => {
    expect(alternative("empty")).toBe(
      "NVDA price chart: no line is drawn. No bars are stored anywhere in the " +
        "window asked for, 2026-09-10 09:30:00 EDT → 2026-09-10 16:00:00 EDT, " +
        "so the whole frame is empty ground.",
    );
  });

  it("says the frame is drawn and the series is not, before the first answer", () => {
    const loading: BarSeriesView = { state: "loading" };
    expect(chartAlternative(loading, SYMBOL)).toBe(
      "NVDA price chart: the frame is drawn and the series has not arrived yet.",
    );
  });

  it("has nothing to say where no chart is drawn", () => {
    // `refused` and `failed` draw no frame at all, and the panel's own sentence
    // two lines below says what happened. A chart announcing its own absence
    // here would be two surfaces describing one event in the one place nothing
    // on screen would show it.
    for (const name of [
      "refusedCap",
      "refusedCalendar",
      "refusedUnknownSymbol",
      "unavailable",
      "incoherent",
      "unknownFeed",
    ] as const)
      expect(chartAlternative(barSeriesFixtureView(name), SYMBOL)).toBeNull();
  });

  it("names the feed in the shipped vocabulary rather than a slug", () => {
    // `MARKET_FEED_DESCRIPTIONS`' words, never this module's: a second table of
    // user-facing sentences derived from the same slugs is the copy that
    // drifts. The stitched body names one feed twice today — Epic 3's IEX
    // socket is what makes two sources mean two feeds — so the distinct set is
    // what is read.
    expect(alternative("stitched")).toContain("Market feed: All US exchanges.");
    expect(alternative("stitched")).not.toContain("sip");
  });
});
