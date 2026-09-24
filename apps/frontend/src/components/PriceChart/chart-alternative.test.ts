import { describe, expect, it } from "vitest";

import {
  BAR_SERIES_FIXTURE_NAMES,
  barSeriesFixtureView,
} from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { chartAlternative, volumeAlternative } from "./chart-alternative.js";

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
      "NVDA price chart: a line of 1,950 closing prices, opening at 218.99 " +
        "and ending at 230.34, up 5.19% across the " +
        "window. The frame is drawn across 5 trading sessions. The highest " +
        "price on it is 234.76 and the lowest 215.10. The " +
        "line runs the full width of the window asked for, " +
        "2026-08-31 09:30:00 EDT → 2026-09-04 16:00:00 EDT. " +
        "Market feed: All US exchanges.",
    );
  });

  // **The window the reader chose** (Task 2.13.8). Until Task 2.13.6 there was
  // one window and nobody had picked it; the four assertions here are the four
  // cases where the count is not what a listener could have worked out from the
  // rest of the sentence.
  it("names the window as the count the reader chose, resolved", () => {
    // `1m` windows, where the frame's width is otherwise stated in minutes and
    // the division is the listener's to do.
    expect(alternative("dense")).toContain(
      "The frame is drawn across 5 trading sessions.",
    );
    // Three, and the third is the 210 trading minutes of a session in
    // progress — the frame counts the window that was **asked for** and not the
    // sessions the bars reached.
    expect(alternative("uncovered")).toContain(
      "The frame is drawn across 3 trading sessions.",
    );

    // `1d` windows, where a **complete** answer's coverage clause names no
    // count at all — so without this clause the widest window this product
    // offers described itself with no number in it.
    expect(alternative("daily")).toContain(
      "The frame is drawn across 63 trading sessions.",
    );
    expect(alternative("dailyYear")).toContain(
      "The frame is drawn across 252 trading sessions.",
    );

    // Singular, at the one window that has one session in it.
    expect(alternative("empty")).toContain(
      "The frame is drawn across 1 trading session.",
    );
  });

  // **Acceptance criterion 3, in the sentence a listener gets** (Task 2.13.8).
  //
  // The count is `axis.sessions.length` and not a division of elapsed time,
  // which is the whole reason this assertion is worth its lines: Thanksgiving
  // week is **five sessions over seven calendar days**, and a clause counting
  // days would say eight — one for the holiday and two for the weekend, none of
  // which this axis gives any width to.
  it("counts five sessions across a week with a holiday in it", () => {
    const sentence = alternative("holidayWeek");

    expect(sentence).toContain("The frame is drawn across 5 trading sessions.");
    expect(sentence).toContain("a line of 1,770 closing prices");
    expect(sentence).toContain(
      "The line runs the full width of the window asked for, " +
        "2026-11-23 09:30:00 EST → 2026-11-30 16:00:00 EST.",
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
    expect(sentence).toContain(
      "what is stored reaches only to 2026-09-04 16:00:00 EDT",
    );
    expect(sentence).toContain("outside trading hours");
  });

  it("describes an empty answer as an answer rather than as a failure", () => {
    expect(alternative("empty")).toBe(
      "NVDA price chart: no line is drawn. The frame is drawn across 1 " +
        "trading session. No bars are stored anywhere in the " +
        "window asked for, 2026-09-10 09:30:00 EDT → 2026-09-10 16:00:00 EDT, " +
        "so the whole frame is empty ground. Stored history is caught up " +
        "overnight.",
    );
  });

  // **The two empty answers, spoken apart** (Task 2.14.6). Until this fork the
  // sentence above was case two's explanation asserted for both — and the half
  // that was wrong is the half a listener would act on: *stored history is
  // caught up overnight* says waiting helps, on a security where nothing does.
  it("tells the two empty answers apart, in the picture's own sentence", () => {
    const empty = barSeriesFixtureView("empty");

    expect(chartAlternative(empty, SYMBOL, false, "none")).toBe(
      "NVDA price chart: no line is drawn. The frame is drawn across 1 " +
        "trading session. No history is stored for NVDA at this timeframe, " +
        "so the whole frame is empty ground. A different window will not " +
        "change that; the store is filled overnight.",
    );

    expect(volumeAlternative(empty, SYMBOL, false, "none")).toBe(
      "NVDA volume chart: no columns are drawn. The frame is drawn across 1 " +
        "trading session. No volume history is stored for NVDA at this " +
        "timeframe, so the whole frame is empty ground.",
    );
  });

  // The degradation rule reaches the spoken channel too, and the default is
  // what carries it: a caller with no universe answer says the window sentence.
  it("says the window sentence when the store's answer is unknown", () => {
    const empty = barSeriesFixtureView("empty");

    expect(chartAlternative(empty, SYMBOL, false, "unknown")).toBe(
      alternative("empty"),
    );
    expect(chartAlternative(empty, SYMBOL, false, "some")).toBe(
      alternative("empty"),
    );
  });

  // The schedule clause arrived on 2026-09-14 and is asserted apart from the
  // sentence above, because the reason it is here is not the wording.
  //
  // It was the second half of `BarSeriesPanel`'s `EmptyState`, which moved into
  // the plot as `ChartVacancy` — and `ChartVacancy` is `aria-hidden`, since
  // everything it says is already said here. Moving a visible sentence out of
  // the accessibility tree without checking what it carried is how a fact
  // disappears for one audience and nobody notices, so the one clause with no
  // spoken home got one.
  // Added 2026-09-14 (§80). The pending panel is a wordless `aria-hidden` block,
  // so without this clause a sighted reader is told a newer answer is coming and
  // a listener is told nothing — a fact with one audience, which is the shape of
  // defect this whole module exists to prevent.
  it("says a newer answer is coming while the pending panel is up", () => {
    const held = barSeriesFixtureView("full");

    expect(chartAlternative(held, SYMBOL, true)).toContain(
      "A newer answer is on its way.",
    );
    expect(volumeAlternative(held, SYMBOL, true)).toContain(
      "A newer answer is on its way.",
    );

    // Appended rather than replacing: the picture under the panel is still a
    // true picture of its own window, and that is the fact a listener is most
    // likely to have been reading when the panel appeared.
    expect(chartAlternative(held, SYMBOL, true)).toContain("a line of");

    // And absent by default, so the common case adds no characters at all.
    expect(chartAlternative(held, SYMBOL)).not.toContain("on its way");
  });

  it("keeps the schedule on the price chart and off the volume chart", () => {
    expect(alternative("empty")).toContain(
      "Stored history is caught up overnight",
    );

    // Not on the volume plot. Two regions under one axis repeating one fact is
    // the sentence read twice, and the visible detail line is on the price plot
    // alone for the same reason.
    const empty = barSeriesFixtureView("empty");
    expect(volumeAlternative(empty, SYMBOL)).not.toContain(
      "caught up overnight",
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

// **The volume plot's own sentence** (Task 2.13.4, tested here by Task 2.13.8).
//
// It had **no unit test at all** until this walk, and that is how a real defect
// reached the shipped product: `Mark` parameterised the plural subject and left
// the verb three clauses later singular, so a listener on the ordinary partial
// answer heard *"The columns cover the first 780 of 990 trading minutes in the
// window and **stops** at 16:00"*. Nothing could see it — `chartAlternative`'s
// suite reads the same clause through `LINE`, where every verb is singular and
// the sentence is correct, and the browser suite asserts that the volume
// sentence **exists** rather than what it says.
//
// So these are the same shapes `chartAlternative` is read at, through the other
// mark. The point is not coverage arithmetic: it is that a vocabulary with two
// members has to be read in both.
describe("volumeAlternative", () => {
  function volume(name: Parameters<typeof barSeriesFixtureView>[0]): string {
    const sentence = volumeAlternative(barSeriesFixtureView(name), SYMBOL);
    if (sentence === null) throw new Error(`${name} has no alternative`);
    return sentence;
  }

  it("agrees with its own subject, in every clause that has a verb", () => {
    // The defect, named. A plural subject and a singular verb is a sentence
    // that reads as broken English to the one person who only ever gets this
    // channel.
    expect(volume("uncovered")).toContain(
      "The columns cover the first 780 of 990 trading minutes in the window " +
        "and stop at 2026-09-04 16:00:00 EDT",
    );
    expect(volume("uncovered")).not.toContain("and stops at");

    expect(volume("dense")).toContain(
      "The columns run the full width of the window asked for",
    );
    expect(volume("daily")).toContain(
      "The columns run the full width of the frame and there is no empty " +
        "ground behind them",
    );

    // And never the other mark's words, which is the two-surfaces rule applied
    // to one shared clause: the Volume region's paragraph must not describe the
    // picture above it.
    for (const name of BAR_SERIES_FIXTURE_NAMES) {
      const sentence = volumeAlternative(barSeriesFixtureView(name), SYMBOL);
      if (sentence !== null) expect(sentence).not.toContain("The line");
    }
  });

  it("states the peak, when it happened, and the window it is the peak of", () => {
    // The figure this plot exists to make checkable, and the one Epic 5 later
    // qualifies as a multiple. Spoken as a magnitude rather than as the strip's
    // exact integer — `volume-format.ts` decides both in one module, so the two
    // channels quote one figure to one precision.
    expect(volume("dense")).toBe(
      "NVDA volume chart: 1,950 columns of traded volume, measured from a " +
        "baseline of zero to the window's busiest " +
        "trading minute. The frame is drawn across 5 trading sessions. The " +
        "tallest column is 3.13 million, at Sep 3 · 13:45 EDT. The columns run " +
        "the full width of the window asked for, 2026-08-31 09:30:00 EDT → " +
        "2026-09-04 16:00:00 EDT. Market feed: All US exchanges.",
    );
  });

  it("speaks a daily window in sessions and without a time of day", () => {
    // `1d`'s two branches, which nothing executed before Task 2.13.6 recorded a
    // daily body: a column is a **session** rather than a minute, and its
    // instant has no clock on it — the vendor stamps a daily bar at midnight,
    // and `Aug 27 · 00:00 EDT` is an hour nothing traded in.
    const sentence = volume("daily");

    // **The cadence clause is deleted rather than reworded** (Task 3.9.8).
    // `one per trading session` was a claim this product could not support —
    // a bar exists for an interval the security TRADED in, and `ERIE` traded
    // in 131 minutes of a 390-minute session on the consolidated tape. What
    // survives is the granularity, stated truly twice in the same paragraph.
    expect(sentence).not.toContain("one per");
    expect(sentence).toContain("trading session");
    expect(sentence).toContain("the window's busiest session");
    expect(sentence).toContain("The tallest column is 300 million, at Aug 27.");

    // **The one place `00:00` survives at `1d`, and it is correct** (§30.2): a
    // daily *window* genuinely runs midnight to midnight, and the split this
    // product keeps is bar against window rather than precise against rounded.
    // Which is also why the clause beside it no longer says *the bars* stop
    // there — the ledger's covered edge is `Sep 13 00:04:11` and the last bar
    // is two sessions earlier.
    expect(sentence).toContain("the window asked for runs to 2026-09-14 00:00");
    expect(sentence).toContain(
      "what is stored reaches only to 2026-09-13 00:04:11 EDT",
    );
  });

  it("names its subject first and never the price chart's", () => {
    for (const name of BAR_SERIES_FIXTURE_NAMES) {
      const sentence = volumeAlternative(barSeriesFixtureView(name), SYMBOL);
      if (sentence !== null)
        expect(sentence.startsWith(`${SYMBOL} volume chart`)).toBe(true);
    }
  });

  it("has nothing to say where no chart is drawn", () => {
    for (const name of [
      "refusedCap",
      "refusedCalendar",
      "refusedUnknownSymbol",
      "unavailable",
      "incoherent",
      "unknownFeed",
    ] as const)
      expect(volumeAlternative(barSeriesFixtureView(name), SYMBOL)).toBeNull();
  });

  it("counts the same five sessions the price chart does, holiday and all", () => {
    // One `coverageClause` and one `frameClause` serve both sentences, which is
    // what stops the two pictures on one axis describing two different windows.
    expect(volume("holidayWeek")).toContain(
      "The frame is drawn across 5 trading sessions.",
    );
    expect(volume("holidayWeek")).toContain(
      "The columns run the full width of the window asked for, " +
        "2026-11-23 09:30:00 EST → 2026-11-30 16:00:00 EST.",
    );
  });
});
