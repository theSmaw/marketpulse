import { describe, expect, it } from "vitest";

import {
  BAR_SERIES_FIXTURE_NAMES,
  BAR_SERIES_FIXTURES,
  barSeriesFixtureView,
} from "./bar-series.js";

// What each recorded body actually collapses to — the assertion the fixture set
// exists to make, and the one Stories 2.11 to 2.13 get to rely on rather than
// re-derive (Task 2.10.6).
//
// The module itself already holds every fixture to its declared **outcome** as
// it loads, through the real predicates. What is here is the level above that:
// which of the six `BarSeriesView` members each one becomes, through the real
// `toBarSeriesView`. Two of them are worth the file on their own — `incoherent`
// and `unknownFeed` reach `failed` by two different routes that a reader would
// otherwise have to trace by hand — and the rest are what stops a story
// labelling `partial.json` as the complete answer.
//
// It deliberately asserts **states and relationships, never prices**. A bar's
// close is a fact about NVDA on 2026-09-04 and re-recording moves it; the
// property this file is about is that a recorded body still means what the set
// says it means.

describe("the recorded bar-series fixtures", () => {
  it("covers every state this layer can be in", () => {
    const states = new Set(
      BAR_SERIES_FIXTURE_NAMES.map((name) => barSeriesFixtureView(name).state),
    );

    // Five of the six. `loading` is the state nothing answers with — it is
    // where a request starts — so a recorded body cannot produce one and a
    // fixture claiming to would be describing the transport rather than an
    // answer.
    expect([...states].sort()).toEqual([
      "empty",
      "failed",
      "loaded",
      "partial",
      "refused",
    ]);
  });

  it("reads a complete series as loaded, covering exactly what was asked for", () => {
    const view = barSeriesFixtureView("full");

    expect(view.state).toBe("loaded");
    if (view.state !== "loaded") return;

    const { requested, covered } = view.series.coverage;
    expect(covered.start.getTime()).toBe(requested.start.getTime());
    expect(covered.end.getTime()).toBe(requested.end.getTime());
    expect(view.series.bars).toHaveLength(30);
    expect(view.securityStatus).toBe("active");
  });

  it("reads a short answer as partial rather than as a failure", () => {
    const view = barSeriesFixtureView("partial");

    expect(view.state).toBe("partial");
    if (view.state !== "partial") return;

    // The property that makes it partial, asserted as the relationship rather
    // than as two instants: the answer stops before the window did.
    const { requested, covered } = view.series.coverage;
    expect(covered.end.getTime()).toBeLessThan(requested.end.getTime());
    expect(view.series.bars.length).toBeGreaterThan(0);
  });

  it("reads an empty answer as empty, keeping the window that was asked for", () => {
    const view = barSeriesFixtureView("empty");

    expect(view.state).toBe("empty");
    if (view.state !== "empty") return;

    expect(view.series.bars).toHaveLength(0);
    expect(view.series.coverage.covered).toBeNull();
    // Still an answer: it says what was asked for and what it came from.
    expect(view.series.coverage.requested.end.getTime()).toBeGreaterThan(
      view.series.coverage.requested.start.getTime(),
    );
    expect(view.series.provenance.sources).toHaveLength(1);
  });

  it("reads a stitched answer as loaded and keeps both of its sources", () => {
    const view = barSeriesFixtureView("stitched");

    expect(view.state).toBe("loaded");
    if (view.state !== "loaded") return;

    const { sources } = view.series.provenance;
    expect(sources).toHaveLength(2);
    // The bars are accounted for by the sources between them — the coherence
    // check `toBarSeries` makes, restated here because this is the one fixture
    // where it is a stitch rather than a single read.
    expect(sources.reduce((total, source) => total + source.barCount, 0)).toBe(
      view.series.bars.length,
    );
  });

  it.each([
    ["refusedCap", "10,000"],
    ["refusedCalendar", "2028-12-31"],
    ["refusedUnknownSymbol", "ZZZZ"],
  ] as const)(
    "reads %s as a refusal carrying the server's own sentence",
    (name, fragment) => {
      const view = barSeriesFixtureView(name);

      expect(view.state).toBe("refused");
      if (view.state !== "refused") return;

      // The message is shown as it arrived, so what is asserted is that the
      // detail a reader acts on survived — the number, the calendar's bound,
      // the symbol they typed — not the whole wording, which is the server's.
      expect(view.message).toContain(fragment);
    },
  );

  it("reads the store being unreachable as a failure that says waiting will help", () => {
    const view = barSeriesFixtureView("unavailable");

    expect(view).toMatchObject({
      state: "failed",
      failure: "answered-badly",
      retryable: true,
      retrying: false,
    });
  });

  it("reads a body whose numbers disagree as answered-badly, not as a refusal", () => {
    // The one 200 a correct server never sends. `isBarSeriesResponse` accepts
    // it — every closed vocabulary in it is valid — and `toBarSeries` refuses
    // it, which is the split Task 2.10.4 relocated into the parse.
    const view = barSeriesFixtureView("incoherent");

    expect(view).toMatchObject({
      state: "failed",
      failure: "answered-badly",
      // Not retryable: our own server will produce the same body again.
      retryable: false,
    });
  });

  it("reads a body naming an unknown feed as answered-badly by the other route", () => {
    // Refused one layer earlier, by the predicate rather than by the parse, so
    // it arrives as `unreadable-body`. The same state on screen and a different
    // diagnosis: a stranger at the address rather than our own server's bug.
    expect(BAR_SERIES_FIXTURES.unknownFeed.outcome).toBe("unreadable-body");

    expect(barSeriesFixtureView("unknownFeed")).toMatchObject({
      state: "failed",
      failure: "answered-badly",
      retryable: false,
    });
  });

  it("derives its two hand-made bodies from the recorded one, a field apart", () => {
    // The property that keeps the derivation honest, and the reason the
    // original is kept beside them: each differs from `full.json` in exactly
    // one place. A hand-made fixture that has quietly drifted further is a
    // fixture nobody can read as "the recorded one, except for this".
    const full = BAR_SERIES_FIXTURES.full.body;

    expect(differingPaths(full, BAR_SERIES_FIXTURES.incoherent.body)).toEqual([
      "series.provenance.sources.0.barCount",
    ]);
    expect(differingPaths(full, BAR_SERIES_FIXTURES.unknownFeed.body)).toEqual([
      "series.provenance.sources.0.feed",
    ]);
  });
});

/**
 * Every path at which two recorded bodies disagree.
 *
 * A path diff rather than a text one, because a text diff answers the wrong
 * question: `"sip"` → `"darkpool"` changes the length of the document and every
 * character after it shifts, which reads as a rewrite. What the test above is
 * about is *how many fields were touched*, and that is a question about the
 * structure. Measured before it was replaced: the text form reported **11**
 * differing runs for a one-field edit.
 *
 * A path present on one side and absent on the other counts, so a field added or
 * removed by hand is caught rather than skipped.
 */
function differingPaths(a: unknown, b: unknown, at = ""): string[] {
  if (Object.is(a, b)) return [];

  if (!isRecord(a) || !isRecord(b)) return [at];

  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  return [...keys].flatMap((key) =>
    differingPaths(a[key], b[key], at === "" ? key : `${at}.${key}`),
  );
}

/** Is this an object or an array — something with paths inside it? */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
