import { describe, expect, it } from "vitest";

import {
  barSeriesFixtureView,
  twoFeedStitchView,
} from "../../fixtures/bar-series.js";
import type { BarSeriesView } from "../../market/index.js";
import { hasClauses, toSourceNote } from "./source-note.js";

// The note's assembly, with no DOM — the arithmetic and the wording decisions
// separated from the markup, which is `series-facts.ts`' rule and its reason: a
// component that decides is a component whose decisions can only be tested by
// rendering it.
//
// The interesting half of this file is the retrieval date. Everything else here
// is a branch; that one is a **claim about how old these numbers are**, made
// out of one to several instants the server stamped, and it is the one thing in
// the note a reader could be misled by without noticing.

const SIP = { state: "configured", feed: "sip" } as const;

/** The recorded answer with its sources' retrieval instants replaced. */
function retrievedAt(
  view: BarSeriesView,
  ...instants: readonly string[]
): BarSeriesView {
  if (view.state !== "loaded") throw new TypeError("expects a loaded answer");

  return {
    ...view,
    series: {
      ...view.series,
      provenance: {
        ...view.series.provenance,
        // The tuple-ness is asserted rather than checked, and this is the one
        // place in this file where that is honest: `map` preserves length, and
        // the compiler cannot see that through it. The record still came from a
        // recorded body through the real transition.
        sources: view.series.provenance.sources.map((source, index) => ({
          ...source,
          retrievedAt: instants[index] ?? source.retrievedAt,
        })) as unknown as (typeof view.series.provenance)["sources"],
      },
    },
  };
}

describe("toSourceNote", () => {
  it("takes the adjustment's words from the shared vocabulary", () => {
    const note = toSourceNote(barSeriesFixtureView("full"), SIP);

    expect(note.prices?.label).toBe("Unadjusted");
    expect(note.prices?.sentence).toBe(
      "Prices as they printed. Not restated for stock splits.",
    );
  });

  it("writes the retrieval date in full, in market time", () => {
    // Not `2026-09-08`, which is a machine's spelling of a date in body text,
    // and not `6 days ago`, which would be computed against the browser's clock
    // — the thing this product fences off from market instants everywhere else.
    const note = toSourceNote(
      retrievedAt(barSeriesFixtureView("full"), "2026-09-08T18:12:00.000Z"),
      SIP,
    );

    expect(note.prices?.retrieved).toBe("8 September 2026");
  });

  it("reads a retrieval instant in market time rather than UTC", () => {
    // 00:40 UTC is 20:40 the previous evening in New York. Every other date on
    // this screen is a market date, and a note that said "9 September" for bars
    // fetched on the 8th would be off by one for a reader comparing it against
    // the session labels three centimetres above.
    const note = toSourceNote(
      retrievedAt(barSeriesFixtureView("full"), "2026-09-09T00:40:00.000Z"),
      SIP,
    );

    expect(note.prices?.retrieved).toBe("8 September 2026");
  });

  it("names a range when the stretches were fetched on different days", () => {
    // **The claim that would otherwise be false.** A stitched series is stored
    // bars plus a tail fetched later; naming only the newer date claims the
    // whole picture is that fresh, and naming only the older one claims it is
    // that stale. Both ends of the range are true of some of the bars.
    const note = toSourceNote(
      retrievedAt(
        twoFeedStitchView(),
        "2026-09-04T18:00:00.000Z",
        "2026-09-08T18:00:00.000Z",
      ),
      SIP,
    );

    expect(note.prices?.retrieved).toBe("4–8 September 2026");
  });

  it("spells both months when a range crosses one", () => {
    const note = toSourceNote(
      retrievedAt(
        twoFeedStitchView(),
        "2026-08-31T18:00:00.000Z",
        "2026-09-02T18:00:00.000Z",
      ),
      SIP,
    );

    expect(note.prices?.retrieved).toBe("31 August 2026–2 September 2026");
  });

  it("names no feed when every source is the configured one", () => {
    for (const name of ["full", "stitched"] as const) {
      expect(toSourceNote(barSeriesFixtureView(name), SIP).feeds).toBeNull();
    }
  });

  it("names every stretch, in order, when a series carries two feeds", () => {
    const note = toSourceNote(twoFeedStitchView(), SIP);

    expect(note.feeds?.map((stretch) => stretch.feed)).toEqual(["sip", "iex"]);
    expect(note.feeds?.map((stretch) => stretch.barCount)).toEqual([60, 90]);
  });

  it("names the feed where the chrome claims a different one or none", () => {
    for (const feed of [
      { state: "configured", feed: "iex" },
      { state: "not-configured" },
      { state: "unknown" },
    ] as const) {
      const note = toSourceNote(barSeriesFixtureView("full"), feed);
      expect(note.feeds).toHaveLength(1);
    }
  });

  it("says nothing about the feed while the first answer is pending", () => {
    const note = toSourceNote(barSeriesFixtureView("full"), {
      state: "checking",
    });

    expect(note.feeds).toBeNull();
  });

  it("has nothing to say about an answer holding no bars", () => {
    // The rule that caught itself: `SOURCE_OF_NOTHING` is a complete, truthful
    // provenance record describing zero bars, so every clause here is a claim
    // about data with no data behind it.
    const note = toSourceNote(barSeriesFixtureView("empty"), SIP);

    expect(note).toEqual({ feeds: null, prices: null });
    expect(hasClauses(note)).toBe(false);
  });

  it("has nothing to say about the states that carry no series", () => {
    for (const shown of [
      { state: "loading" },
      barSeriesFixtureView("refusedCap"),
      barSeriesFixtureView("unavailable"),
    ] as const) {
      expect(hasClauses(toSourceNote(shown, SIP))).toBe(false);
    }
  });
});
