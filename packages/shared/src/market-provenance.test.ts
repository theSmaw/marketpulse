import { describe, expect, it } from "vitest";

import * as provenanceModule from "./market-provenance.js";
import {
  ADJUSTMENTS,
  MARKET_FEED_DESCRIPTIONS,
  MARKET_FEEDS,
  mergeSeriesProvenance,
  PROVIDER_IDS,
  toSeriesProvenance,
} from "./market-provenance.js";
import type { BarSource } from "./market-provenance.js";

const FIXTURE_SOURCE: BarSource = {
  provider: "fixture",
  feed: "synthetic",
  retrievedAt: "2026-09-07T13:30:00.000Z",
  barCount: 3,
};

describe("the provenance vocabulary", () => {
  // **Amended 2026-09-07 by Task 2.7.3, which is the commit this test was
  // written to wait for.** It read `toEqual(["fixture"])` — *"ships exactly one
  // provider, and it is not the vendor"* — and the second half of that title is
  // what it was actually for. `alpaca` arrives here beside the client that
  // produces it, so the assertion becomes the durable claim rather than the
  // temporary one: **a provider id is a member only when something can produce
  // it**, which is the rule (`SECURITY_STATUSES`' — `delisted` still waits for
  // the code that can set it) rather than the count.
  //
  // The vendor's name appearing here is the one place it is the *subject*
  // rather than an implementation detail, because a provenance record has to
  // name who sold us the data for §7.1's display to be possible at all. That is
  // the opposite of a leak, and Task 2.6.8's recorded code-only grep figure is
  // amended from zero to one where it stands.
  it("ships a member only for a provider something can produce", () => {
    expect(PROVIDER_IDS).toEqual(["fixture", "alpaca"]);
  });

  it("ships exactly two adjustment modes", () => {
    expect(ADJUSTMENTS).toEqual(["raw", "split-adjusted"]);
  });

  it("exports no default for anything", () => {
    // Acceptance criterion 5 forbids a default adjustment, and the reason it is
    // worth an assertion rather than a comment is that the wrong value is
    // almost always invisible: a series spanning no corporate action returns
    // identical numbers in both modes, so a default is wrong exactly once, on
    // the one name and the one week somebody is looking at. There is no safe
    // value here, only a value whose wrongness is deferred.
    const defaults = Object.keys(provenanceModule).filter((name) =>
      /default/i.test(name),
    );

    expect(defaults).toEqual([]);
  });

  it("gives every feed a label and a sentence", () => {
    // The `satisfies` already makes a missing member a compile error; what this
    // holds is that nobody satisfied it with an empty string.
    for (const feed of MARKET_FEEDS) {
      const description = MARKET_FEED_DESCRIPTIONS[feed];
      expect(description.label.length).toBeGreaterThan(0);
      expect(description.sentence.length).toBeGreaterThan(0);
    }
  });

  it("says what a single-venue feed does not cover, rather than only naming it", () => {
    // §7.1's requirement is not that we print an acronym: it is that we must not
    // imply IEX represents every US exchange. A reader who does not know what
    // IEX is learns nothing from three letters, so the sentence is the
    // requirement and the label is the affordance.
    expect(MARKET_FEED_DESCRIPTIONS.iex.sentence).toMatch(/not the full US/i);

    // **Amended 2026-09-07 (Task 2.7.4), and this assertion went red for the
    // right reason.** It read `sip.sentence` for `/all us exchanges/i` — which
    // locked the label and the sentence the wrong way round, because that
    // phrase was the SENTENCE and the label was the jargon `Consolidated tape`.
    // That inverts the rule this very test's comment states.
    //
    // So both halves are asserted now, and the inversion cannot come back
    // silently: the **label** is the plain meaning a non-specialist reads at a
    // glance, and the **sentence** carries the industry term plus the contrast
    // with the other kind of feed — the shape `iex`'s sentence already had.
    expect(MARKET_FEED_DESCRIPTIONS.sip.label).toMatch(/all us exchanges/i);
    expect(MARKET_FEED_DESCRIPTIONS.sip.sentence).toMatch(/consolidated tape/i);
    expect(MARKET_FEED_DESCRIPTIONS.sip.sentence).toMatch(
      /not a single venue/i,
    );
  });

  it("makes generated data announce itself", () => {
    // PROVIDER.md §5.4: this is what stops a fixture-backed screenshot being
    // mistaken for a product, without anybody remembering a SAMPLE DATA banner.
    expect(MARKET_FEED_DESCRIPTIONS.synthetic.sentence).toMatch(
      /not a market feed/i,
    );
  });
});

describe("toSeriesProvenance", () => {
  it("keeps the adjustment and the source it was given", () => {
    const provenance = toSeriesProvenance("raw", FIXTURE_SOURCE);

    expect(provenance.adjustment).toBe("raw");
    expect(provenance.sources).toEqual([FIXTURE_SOURCE]);
  });

  it("refuses a retrieval time that is not a UTC instant", () => {
    // The one field here whose wrongness is silent and reaches a user: an
    // offset spelling is how a local-time stamp gets into a provenance record
    // and makes a stale series look current.
    expect(() =>
      toSeriesProvenance("raw", {
        ...FIXTURE_SOURCE,
        retrievedAt: "2026-09-07T13:30:00+01:00",
      }),
    ).toThrow(/ending in Z/);
  });

  it("refuses a retrieval time that is not an instant at all", () => {
    expect(() =>
      toSeriesProvenance("raw", { ...FIXTURE_SOURCE, retrievedAt: "todayZ" }),
    ).toThrow(/parseable instant/);
  });

  it("refuses a bar count that cannot be counted against the bars", () => {
    expect(() =>
      toSeriesProvenance("raw", { ...FIXTURE_SOURCE, barCount: -1 }),
    ).toThrow(/non-negative integer/);
    expect(() =>
      toSeriesProvenance("raw", { ...FIXTURE_SOURCE, barCount: 1.5 }),
    ).toThrow(/non-negative integer/);
  });
});

describe("mergeSeriesProvenance — the stitch", () => {
  it("is truthful when the sources disagree about the feed", () => {
    // Two sources, two feeds, both survive. This is the whole reason `sources`
    // is a list rather than one record: Story 2.8's read path stitches stored
    // bars onto fresh ones, and a single record renders whichever half wrote it
    // last as a statement about all of it.
    const stored = toSeriesProvenance("raw", {
      ...FIXTURE_SOURCE,
      feed: "iex",
      retrievedAt: "2026-08-01T13:30:00.000Z",
      barCount: 390,
    });
    const fresh = toSeriesProvenance("raw", {
      ...FIXTURE_SOURCE,
      feed: "sip",
      retrievedAt: "2026-09-07T13:30:00.000Z",
      barCount: 12,
    });

    const joined = mergeSeriesProvenance(stored, fresh);

    expect(joined.sources.map((s) => s.feed)).toEqual(["iex", "sip"]);
    expect(joined.sources.map((s) => s.retrievedAt)).toEqual([
      "2026-08-01T13:30:00.000Z",
      "2026-09-07T13:30:00.000Z",
    ]);
    expect(joined.adjustment).toBe("raw");
  });

  it("refuses sources that disagree about the adjustment", () => {
    // Not reported, refused — because the result is not a series. Raw and
    // split-adjusted prices for one symbol are on two different scales, so the
    // joined array has a step in it that is an artefact of our own stitching
    // and every percentage change across the seam is wrong.
    const raw = toSeriesProvenance("raw", FIXTURE_SOURCE);
    const adjusted = toSeriesProvenance("split-adjusted", FIXTURE_SOURCE);

    expect(() => mergeSeriesProvenance(raw, adjusted)).toThrow(RangeError);
    expect(() => mergeSeriesProvenance(raw, adjusted)).toThrow(
      /different price scales/,
    );
  });

  it("refuses a disagreement anywhere in the list, not just against the first", () => {
    const raw = toSeriesProvenance("raw", FIXTURE_SOURCE);
    const adjusted = toSeriesProvenance("split-adjusted", FIXTURE_SOURCE);

    expect(() => mergeSeriesProvenance(raw, raw, adjusted)).toThrow(
      /different price scales/,
    );
  });

  it("is the only way to obtain a multi-source record", () => {
    // The type is branded, so this is really a compile-time claim; what the
    // runtime can add is that merging preserves every source rather than
    // collapsing them.
    const one = toSeriesProvenance("raw", FIXTURE_SOURCE);
    expect(mergeSeriesProvenance(one, one, one).sources).toHaveLength(3);
  });
});
