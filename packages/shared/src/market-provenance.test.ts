import { describe, expect, it } from "vitest";

import * as provenanceModule from "./market-provenance.js";
import {
  ADJUSTMENT_DESCRIPTIONS,
  ADJUSTMENTS,
  describeSeriesFeeds,
  describeSilence,
  distinctSeriesFeeds,
  FEED_REACH,
  MARKET_FEED_DESCRIPTIONS,
  MARKET_FEEDS,
  mergeSeriesProvenance,
  PROVIDER_IDS,
  PROVIDER_SERVES,
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
    // **Amended 2026-09-18 by Task 3.2.7, and the rule is what held rather
    // than the count.** `replay` was deliberately NOT added by Task 3.2.1,
    // which widened `MARKET_FEEDS` alone: a feed is a label vocabulary and no
    // wrong state is reachable by adding one, while `PROVIDER_IDS` is
    // **operator-settable configuration** — `MarketDataProviderSelection`
    // derives from it, so adding a member early would have made
    // `MARKET_DATA_PROVIDER=replay` a value that validates at startup and that
    // nothing could honour.
    //
    // It arrives here now beside `createReplayStream` in `replay-stream.ts`,
    // which is the same rule `alpaca` followed when it arrived beside
    // `alpaca-provider.ts` — and the same rule `SECURITY_STATUSES`' `delisted`
    // is still waiting on.
    expect(PROVIDER_IDS).toEqual(["fixture", "alpaca", "replay"]);
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

  it("answers the live-market question for every provider, and only with a member of the union", () => {
    // The `Record<ProviderId, …>` annotation already makes a missing provider a
    // compile error, which is the mechanism. What this holds is the half a type
    // cannot: that the answers are the two words `config.ts`'s refusal keys on,
    // so a typo in one of them cannot turn a non-live provider into a permitted
    // one silently. A provider marked `the-live-market` by mistake is the only
    // way a deployment could serve recorded prices without asking by name.
    for (const provider of PROVIDER_IDS) {
      expect(["the-live-market", "not-the-live-market"]).toContain(
        PROVIDER_SERVES[provider],
      );
    }

    expect(PROVIDER_SERVES.fixture).toBe("not-the-live-market");
    expect(PROVIDER_SERVES.alpaca).toBe("the-live-market");
  });

  it("gives every feed a label, and a non-empty sentence where it has one", () => {
    // The `Record<MarketFeed, …>` annotation already makes a missing member a
    // compile error; what this holds is that nobody satisfied it with an empty
    // string. `sentence` is optional as of 2026-09-07 — absent is a decision
    // (`sip`'s label stands alone), empty is a mistake.
    for (const feed of MARKET_FEEDS) {
      const description = MARKET_FEED_DESCRIPTIONS[feed];
      expect(description.label.length).toBeGreaterThan(0);
      if (description.sentence !== undefined) {
        expect(description.sentence.length).toBeGreaterThan(0);
      }
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
    // **`sip` has NO sentence, and asserting its absence is the durable half.**
    // Three strings were tried in a day and all three were wrong: the jargon
    // and the meaning inverted; then a restatement of the label with a contrast
    // bolted on to a feed this deployment never shows; then a bare fact nobody
    // reading a status strip needs. The label says the whole thing.
    //
    // So the rule is *a sentence where the label cannot stand alone* — `iex`
    // and `synthetic` need one and this does not — and the assertion is written
    // as `toBeUndefined` rather than omitted, so that re-adding padding here is
    // a red test rather than a silent regression to any of the three.
    expect(MARKET_FEED_DESCRIPTIONS.sip.label).toMatch(/all us exchanges/i);
    expect(MARKET_FEED_DESCRIPTIONS.sip.sentence).toBeUndefined();
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

describe("the adjustment vocabulary", () => {
  it("gives every adjustment a label", () => {
    // The `Record<Adjustment, …>` annotation is the real guard and it is a
    // compile-time one; what a runtime test can add is that the table has not
    // been given a member with an empty word in it, which typechecks.
    for (const adjustment of ADJUSTMENTS) {
      expect(ADJUSTMENT_DESCRIPTIONS[adjustment].label.length).toBeGreaterThan(
        0,
      );
    }
  });

  it("gives a sentence to the label that cannot stand alone, and only that one", () => {
    // ADR 0019 §3's rule, and the assertion is the rule rather than the
    // strings: *Unadjusted* reads to somebody who has not met the word as a
    // fault, which is the same misread `SIMULATED` was caught by, and
    // *Split-adjusted* states the whole thing in two words so a sentence under
    // it could only restate it. Applying the rule uniformly is what produced
    // three wrong strings for `sip` in a day.
    expect(ADJUSTMENT_DESCRIPTIONS.raw.sentence).toBe(
      "Prices as they printed. Not restated for stock splits.",
    );
    expect(ADJUSTMENT_DESCRIPTIONS["split-adjusted"].sentence).toBeUndefined();
  });
});

describe("describeSeriesFeeds", () => {
  const sip: BarSource = {
    provider: "alpaca",
    feed: "sip",
    retrievedAt: "2026-09-08T13:30:00.000Z",
    barCount: 780,
  };
  const iex: BarSource = { ...sip, feed: "iex", barCount: 30 };

  it("names every stretch in contribution order, with its count", () => {
    // The decision rather than the illustration (`PROVENANCE.md` §2.2). A
    // reader told *780 then 30* cannot mistake the picture for a single-venue
    // chart, and a renderer that dropped a stretch would produce a claim whose
    // arithmetic does not reach the bar count on the axis.
    const stitched = mergeSeriesProvenance(
      toSeriesProvenance("raw", sip),
      toSeriesProvenance("raw", iex),
    );

    expect(describeSeriesFeeds(stitched)).toEqual([
      { feed: "sip", barCount: 780, label: "All US exchanges" },
      {
        feed: "iex",
        barCount: 30,
        label: "IEX",
        sentence:
          "Trades reported by the IEX exchange only — not the full US consolidated tape.",
      },
    ]);
  });

  it("never sorts and never collapses to whichever feed is first", () => {
    // The failure mode invariant 6 forbids outright: collapsing a stitched
    // series to its first feed is what would let a chart whose last bars came
    // from a single venue be labelled as the whole consolidated tape.
    const stitched = mergeSeriesProvenance(
      toSeriesProvenance("raw", iex),
      toSeriesProvenance("raw", sip),
    );

    expect(describeSeriesFeeds(stitched).map((s) => s.feed)).toEqual([
      "iex",
      "sip",
    ]);
  });

  it("keeps two stretches that name one feed as two stretches", () => {
    // What a stitch of stored bars and a fetched tail looks like on this plan:
    // two sources, one feed. They are two stretches and the record says so —
    // whether it is worth *drawing* is `distinctSeriesFeeds`' question.
    const stitched = mergeSeriesProvenance(
      toSeriesProvenance("raw", sip),
      toSeriesProvenance("raw", { ...sip, barCount: 90 }),
    );

    expect(describeSeriesFeeds(stitched)).toHaveLength(2);
    expect(distinctSeriesFeeds(stitched)).toEqual(["sip"]);
  });

  it("reports the feeds in first-contribution order", () => {
    const stitched = mergeSeriesProvenance(
      toSeriesProvenance("raw", iex),
      toSeriesProvenance("raw", sip),
      toSeriesProvenance("raw", { ...iex, barCount: 5 }),
    );

    expect(distinctSeriesFeeds(stitched)).toEqual(["iex", "sip"]);
  });
});

describe("describeSilence — the one sentence that claims something about the market", () => {
  // **Task 3.9.8.** `No shares changed hands anywhere in the window.` shipped
  // in Story 2.13 and was correct for two epics because every bar this product
  // held was `sip`. These are the states that make it false, and the state that
  // does not.

  it("earns `anywhere` on the consolidated tape, unchanged from what shipped", () => {
    expect(describeSilence(["sip"])).toBe(
      "No shares changed hands anywhere in the window.",
    );
  });

  it("names the venue, and does not say `anywhere`, when one venue is all the window holds", () => {
    // The case this whole task exists for: IEX's silence reported as the
    // market's is the coverage claim `PRODUCT_SPEC.md` §7.1 forbids, and at
    // 65.1% median per-symbol minute coverage a silent IEX window is ordinary.
    expect(describeSilence(["iex"])).toBe(
      "No shares changed hands on IEX in the window.",
    );
    expect(describeSilence(["iex"])).not.toContain("anywhere");
  });

  it("claims neither feed's reach for the whole window when the window is stitched", () => {
    // Part of it was watched everywhere and part at one venue, so `anywhere`
    // is unearned for the window as a whole — and the ledger stays the source
    // note's, which is why no bar count appears here.
    const stitched = describeSilence(["sip", "iex"]);

    expect(stitched).toBe(
      "No shares changed hands on either feed in the window.",
    );
    expect(stitched).not.toContain("anywhere");
    expect(stitched).not.toMatch(/\d/u);
  });

  it("does not order the two feeds into a different sentence", () => {
    expect(describeSilence(["iex", "sip"])).toBe(
      describeSilence(["sip", "iex"]),
    );
  });

  it("claims no reach at all for invented numbers", () => {
    // A silence in data nobody traded is not a statement about any market, so
    // it gets no scope word rather than a hedged one.
    expect(describeSilence(["synthetic"])).toBe(
      "No shares changed hands in the window.",
    );
  });

  it("ignores a synthetic stretch rather than letting it weaken a real one", () => {
    expect(describeSilence(["sip", "synthetic"])).toBe(
      "No shares changed hands anywhere in the window.",
    );
  });

  it("treats a replay as the whole market, because its tape is the consolidated one", () => {
    expect(describeSilence(["replay"])).toBe(
      "No shares changed hands anywhere in the window.",
    );
  });

  it("says something for a series with no sources at all", () => {
    expect(describeSilence([])).toBe("No shares changed hands in the window.");
  });

  it("decides a reach for every feed, so a new one cannot arrive without one", () => {
    // `FEED_SERVES`' mechanism, one question further on. The `Record` makes it
    // a compile error; this asserts the run-time shape has not been widened.
    for (const feed of MARKET_FEEDS) {
      expect(FEED_REACH[feed]).toBeDefined();
    }
  });

  it("names the venue with the feed vocabulary's own label rather than a second one", () => {
    expect(describeSilence(["iex"])).toContain(
      MARKET_FEED_DESCRIPTIONS.iex.label,
    );
  });
});
