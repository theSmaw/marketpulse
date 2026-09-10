import { describe, expect, it } from "vitest";

import {
  BAR_SERIES_FIXTURE_NAMES,
  barSeriesFixtureView,
  staleBarSeriesFixtureView,
} from "../../fixtures/bar-series.js";
import { announceSeries } from "./series-announcement.js";

// The copy matrix, as assertions (Task 2.10.8).
//
// This is the only level that can hold this panel's announcements to anything.
// A component test can prove a region exists and is the same node; a browser
// test can prove a real transition changes it. **Neither reads the sentences**,
// and the sentences are where every decision in `series-announcement.ts` lives
// — whether a subject is named, whether a correlation id is spoken, whether a
// re-entered state is audible.
//
// Every view below comes from a recorded body through the real transition, so
// nothing here asserts copy about a state the layer cannot produce.

describe("announceSeries", () => {
  it("names its subject in every sentence, on a page with two live regions", () => {
    // `/securities` has two polite regions and a screen reader queues them in
    // an order neither component controls. A sentence that names its own
    // subject is complete in either order; one that does not is a fact with no
    // subject sitting beside a sentence about 518 securities.
    for (const name of BAR_SERIES_FIXTURE_NAMES) {
      const spoken = announceSeries(barSeriesFixtureView(name), "NVDA");
      expect(spoken.startsWith("NVDA:"), `${name}: ${spoken}`).toBe(true);
    }
  });

  it("says nothing at all before the first answer", () => {
    // Arriving at a page is not a change, so a loading sentence would never be
    // heard as an announcement — it would only be a second copy of the visible
    // line for anybody browsing the page.
    expect(announceSeries({ state: "loading" }, "NVDA")).toBe("");
  });

  it("gives a listener the figure, and the direction as a word", () => {
    const spoken = announceSeries(barSeriesFixtureView("full"), "NVDA");

    expect(spoken).toContain("holding all 30 bars");
    expect(spoken).toMatch(/Last close \d+\.\d\d, (up|down|unchanged)/);

    // The direction is a **word** here and a glyph on screen. Neither the sign
    // nor the arrow survives being read aloud, and colour is forbidden from
    // carrying it alone, so the announcement needs its own channel for it.
    expect(spoken).not.toContain("−");
  });

  it("says how much of the window a short answer covers, and through when", () => {
    const spoken = announceSeries(barSeriesFixtureView("partial"), "NVDA");

    expect(spoken).toContain("holding 60 bars");
    expect(spoken).toContain("of a window running to");
    // Market time with the zone named, for the same reason the screen carries
    // it: a bare timestamp is one a listener will assume is theirs.
    expect(spoken).toMatch(/E[DS]T/);
  });

  it("reads an empty answer as an answer about a window", () => {
    const spoken = announceSeries(barSeriesFixtureView("empty"), "NVDA");

    expect(spoken).toContain("no bars are stored for the window asked for");
    expect(spoken).toMatch(/E[DS]T/);
  });

  it("passes a refusal's own sentence through, verbatim", () => {
    // The numbers in it are the server's arithmetic. A client re-wording it
    // would be inventing a sentence about a calculation it did not do — which
    // is as true when the sentence is heard as when it is read.
    const spoken = announceSeries(barSeriesFixtureView("refusedCap"), "NVDA");

    expect(spoken).toContain("that request could not be answered");
    expect(spoken).toContain("10,000");
  });

  it("says whether waiting helps, and never reads a correlation id aloud", () => {
    const retryable = announceSeries(
      barSeriesFixtureView("unavailable"),
      "NVDA",
    );
    const permanent = announceSeries(
      barSeriesFixtureView("incoherent"),
      "NVDA",
    );

    expect(retryable).toContain("This is usually temporary");
    expect(permanent).toContain("Asking again will not change this answer");

    // A 36-character UUID spoken is thirty seconds of hex a listener cannot
    // hold or transcribe. What they can act on is that a reference exists; the
    // id itself is on screen and selectable, which is where it is useful.
    for (const spoken of [retryable, permanent]) {
      expect(spoken).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/u);
    }

    // The clause appears only where there is an id to point at. `unavailable`
    // is an `api-error` and carries one; `incoherent` is a 200 the fixture
    // module deliberately gives no id, so a listener is not sent looking for a
    // reference that is not on screen.
    expect(retryable).toContain(
      "A reference for this failure is shown beside it.",
    );
    expect(permanent).not.toContain("A reference");
  });

  it("announces a retry in flight, which is what makes the control audible", () => {
    // Pressing it changes nothing else a listener can hear: the headline, the
    // prospect and the reference are all still true.
    const failure = barSeriesFixtureView("unavailable");
    expect(failure.state).toBe("failed");
    if (failure.state !== "failed") return;

    const spoken = announceSeries({ ...failure, retrying: true }, "NVDA");
    expect(spoken).toBe("NVDA: trying NVDA again.");
  });

  it("makes a refetch that lands where it started audible, through the stale clause", () => {
    // **The mechanism, not a matter of taste.** A live region whose text does
    // not change announces nothing, and a refetch landing on an identical
    // answer is the common case for a closed session's bars. The stale clause
    // is the text the region passes through and back out of.
    const settled = announceSeries(barSeriesFixtureView("partial"), "NVDA");
    const held = announceSeries(staleBarSeriesFixtureView("partial"), "NVDA");

    expect(held).not.toBe(settled);
    expect(held).toContain(settled.replace(/^NVDA: /u, ""));
    expect(held).toContain("Showing a held answer while a newer one is read.");
  });

  it("does not imply held figures are wrong", () => {
    // They are correct and they are one request old. The words that would say
    // otherwise are the ones a reader would act on — and this panel's whole
    // argument is that a correct answer must never be dressed as a fault.
    const held = announceSeries(staleBarSeriesFixtureView("partial"), "NVDA");

    for (const word of ["out of date", "stale", "error", "failed", "wrong"]) {
      expect(held.toLowerCase()).not.toContain(word);
    }
  });

  it("says a security is no longer tracked, on any answer that carries it", () => {
    // It changes what the numbers mean — a record rather than something being
    // kept up to date — so it is spoken rather than left to a badge a listener
    // never reaches.
    const spoken = announceSeries(barSeriesFixtureView("untracked"), "AMD");

    expect(spoken).toContain("MarketPulse no longer tracks this security");
    expect(spoken).toContain("holding all 30 bars");
  });
});
