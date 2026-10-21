import { describe, expect, it } from "vitest";

import {
  BASELINE_MINIMUM_SAMPLE,
  PERCENTILE_REFUSALS,
} from "@marketpulse/shared";

import {
  OPENING_BIAS_MINUTES,
  percentileOrdinal,
  percentileReading,
  percentileRefusal,
  percentileSample,
} from "./return-percentile.js";

import type {
  WireRefusedPercentile,
  WireReturnPercentile,
} from "@marketpulse/shared";

// **The percentile's words** (Task 5.3.3). Nothing here computes a rank; what
// is asserted is the spelling, the ceiling and the one condition this module
// evaluates — the bias clause, off the figure's own instants.

const PERCENTILE: WireReturnPercentile = {
  ranked: true,
  rank: 99,
  aboveSample: false,
  sampleCount: 4620,
  spanMinutes: 5,
  feed: "sip",
};

/** An instant, from a market-local time on 2026-10-14 — a Wednesday session. */
const at = (utc: string): Date => new Date(`2026-10-14T${utc}:00.000Z`);

/** 13:30Z is 09:30 EDT, the bell. */
const OPEN = "13:30";

describe("percentileReading", () => {
  it("spells an integer ordinal and the word, with no `%` anywhere", () => {
    // AC 7, made visible rather than only true: a percentile and a change
    // formatted by the same decimals are the same kind of glyph, and the
    // ordinal suffix, the missing `%` and the word are the three non-colour
    // channels that tell them apart.
    expect(percentileReading(PERCENTILE)).toBe("99th percentile");
    expect(percentileReading(PERCENTILE)).not.toContain("%");
  });

  it.each([
    [0, "0th percentile"],
    [1, "1st percentile"],
    [2, "2nd percentile"],
    [3, "3rd percentile"],
    [4, "4th percentile"],
    // **The teens are the whole reason the suffix is a function**: a `% 10`
    // alone produces `11st`, `12nd` and `13rd`, and is right in the nineties,
    // which is where this figure spends most of its time.
    [11, "11th percentile"],
    [12, "12th percentile"],
    [13, "13th percentile"],
    [21, "21st percentile"],
    [42, "42nd percentile"],
    [63, "63rd percentile"],
    [90, "90th percentile"],
    [99, "99th percentile"],
  ])("spells rank %i as `%s`", (rank, expected) => {
    expect(percentileReading({ ...PERCENTILE, rank })).toBe(expected);
  });

  it("draws `>99th` above the sample, and never `100th`", () => {
    // **Gate 1 decision 2.** Above the highest order statistic there is no
    // sample, so a `100th` would assert a strict maximum over a distribution
    // that deliberately excludes the window being scored. `>99th` is the
    // stronger statement rather than a clamp hiding one: the baseline holds
    // nothing as large as this move.
    expect(percentileReading({ ...PERCENTILE, aboveSample: true })).toBe(
      ">99th percentile",
    );

    for (let rank = 0; rank <= 99; rank += 1) {
      for (const aboveSample of [true, false]) {
        expect(
          percentileReading({ ...PERCENTILE, rank, aboveSample }),
        ).not.toContain("100");
      }
    }
  });
});

describe("percentileSample", () => {
  it("states the counted `n` with separators, the span and the pooling", () => {
    // The count is **read** off the frame, never a constant: the measured
    // range over this universe is 737 to 4,620, so a sentence quoting AC 3's
    // nominal 4,680 would be wrong for almost every security. The `5` is read
    // too — the product spells it three times already, each with its own home.
    expect(percentileSample(PERCENTILE, at("18:01"), at("18:06"))).toBe(
      "of 4,620 5-minute returns · all times of day pooled",
    );
  });

  it("reads the span off the frame rather than spelling a five", () => {
    expect(
      percentileSample(
        { ...PERCENTILE, spanMinutes: 15, sampleCount: 737 },
        at("18:01"),
        at("18:16"),
      ),
    ).toBe("of 737 15-minute returns · all times of day pooled");
  });

  it("states the opening bias when the FIGURE'S window reaches the open", () => {
    // AC 8. The open is structurally the fattest-tailed bucket of the day and
    // the baseline pools every bucket, so a percentile taken there reads an
    // ordinary open as more unusual than it is.
    expect(percentileSample(PERCENTILE, at("13:38"), at("13:43"))).toBe(
      "of 4,620 5-minute returns · opening 30 minutes — " +
        "the fattest-tailed bucket, pooled",
    );
  });

  it("is conditional on the INSTANTS and not on a clock", () => {
    // **The state the clause exists for**, and the one a wall clock gets
    // wrong: a window that ENDED at 09:43 and is read at 11:00 still carries
    // the bias, because the bias is a property of when the figure was measured
    // rather than of when the page was opened. Nothing in this module reads a
    // clock, so this test needs no fake timers to prove it — the same call
    // answers the same way for ever, and under Epic 13's replay too.
    const inTheOpen = percentileSample(PERCENTILE, at("13:38"), at("13:43"));
    const midday = percentileSample(PERCENTILE, at("16:00"), at("16:05"));

    expect(inTheOpen).toContain("fattest-tailed");
    expect(midday).not.toContain("fattest-tailed");
    expect(midday).toContain("all times of day pooled");
  });

  it("takes the clause on an overlap and drops it just after the bucket", () => {
    const openMs = at(OPEN).getTime();
    const minute = 60_000;
    const edge = new Date(openMs + OPENING_BIAS_MINUTES * minute);

    // 09:28 → 09:33 is mostly the auction and takes the clause; a window that
    // STARTS at 10:00 exactly does not, because nothing of it is in the
    // bucket.
    expect(
      percentileSample(
        PERCENTILE,
        new Date(openMs - 2 * minute),
        new Date(openMs + 3 * minute),
      ),
    ).toContain("fattest-tailed");
    expect(
      percentileSample(PERCENTILE, edge, new Date(edge.getTime() + 5 * minute)),
    ).not.toContain("fattest-tailed");
  });

  it("says nothing about the open for a window outside a session", () => {
    // Pre-market and after-hours are a **different and larger** bias — the
    // baseline's grid is regular-session only — and one clause cannot carry
    // two facts. The honest answer here is the pooling and nothing more.
    expect(percentileSample(PERCENTILE, at("11:42"), at("11:47"))).toBe(
      "of 4,620 5-minute returns · all times of day pooled",
    );
    expect(percentileSample(PERCENTILE, at("21:00"), at("21:05"))).toContain(
      "all times of day pooled",
    );
  });

  it("says nothing about the open on a day with no session at all", () => {
    // 2026-10-17 is a Saturday. A process quiet since Friday holds a perfectly
    // valid pair whose instants are days old, and a replay can carry any
    // instant at all.
    const saturday = new Date("2026-10-17T13:38:00.000Z");

    expect(
      percentileSample(
        PERCENTILE,
        saturday,
        new Date(saturday.getTime() + 300_000),
      ),
    ).toContain("all times of day pooled");
  });

  it("never spells a percent sign, in either grammar", () => {
    for (const [from, to] of [
      ["13:38", "13:43"],
      ["18:01", "18:06"],
    ] as const) {
      expect(percentileSample(PERCENTILE, at(from), at(to))).not.toContain("%");
    }
  });
});

describe("percentileRefusal — the two sentences, which must not read alike", () => {
  const refused = (
    overrides: Partial<WireRefusedPercentile> = {},
  ): WireRefusedPercentile => ({
    ranked: false,
    refusal: "too-few-samples",
    sampleCount: 1240,
    minimumSampleCount: BASELINE_MINIMUM_SAMPLE,
    ...overrides,
  });

  it("states what we have and what it takes, with both numbers read", () => {
    // Neither figure is spelled here: the count is the pass's and the bound is
    // **the one the producer applied**. A thousands separator because the
    // figures are four digits and this is a sentence rather than a column.
    expect(percentileRefusal(refused())).toBe(
      "Baseline too short to rank — 1,240 of 2,500 returns",
    );
  });

  it("covers a store with no baseline at all, in the same string", () => {
    // `0 of 2,500 returns` is **true** about a cold replica, about a security
    // with no stored `sip` history and about every gated run — so there is no
    // sixth sentence for it. The two facts differ in a number the sentence
    // already prints.
    expect(percentileRefusal(refused({ sampleCount: 0 }))).toBe(
      "Baseline too short to rank — 0 of 2,500 returns",
    );
  });

  it("reads the bound off the frame rather than this bundle's constant", () => {
    // A rollback can put a gateway and a bundle two values apart, and the
    // sentence has to say the bound that was actually applied — otherwise it
    // explains a refusal with a number nothing refused on.
    expect(percentileRefusal(refused({ minimumSampleCount: 1000 }))).toContain(
      "of 1,000 returns",
    );
  });

  it("says something else entirely for a price break", () => {
    // *We have too little history* and *the history we have contains a price
    // break we cannot adjust* are different facts with different repairs, and
    // a reader who cannot tell them apart will go looking for more history
    // that would not help.
    const split = percentileRefusal(
      refused({ refusal: "split-discontinuity" }),
    );

    expect(split).toBe(
      "Baseline crosses an unadjusted price break — not comparable",
    );
    // **No count**, because the count is not the problem: the security may
    // hold all 4,620 samples and every one of them is measured across a price
    // we cannot adjust.
    expect(split).not.toMatch(/\d/u);
  });

  it("does not read like the sample refusal, in words rather than in bytes", () => {
    const sample = percentileRefusal(refused());
    const split = percentileRefusal(
      refused({ refusal: "split-discontinuity" }),
    );

    // The pair that must not collapse — Story 5.1 shipped two states sharing
    // one string for a day one region down. What they share is the subject.
    expect(sample).not.toBe(split);
    const sharedWords = sample
      .split(" ")
      .filter((word) => split.split(" ").includes(word));
    expect(sharedWords).toStrictEqual(["Baseline", "—"]);
  });

  it("never claims a SPLIT, because the detector cannot know", () => {
    // `SPLIT_DISCONTINUITY_RATIO` catches a session-boundary jump beyond a
    // ratio. Task 5.3.2 measured five securities over it, of which **four**
    // sit on exact split factors and one — `MRNA` — is a reverse split *or a
    // genuine event*. A sentence saying *split* would be a claim about a
    // corporate action nothing here has read a calendar for, which is
    // invariant 5's confidence level smuggled into prose.
    expect(
      percentileRefusal(refused({ refusal: "split-discontinuity" })),
    ).not.toMatch(/split/iu);
  });

  it.each(PERCENTILE_REFUSALS)(
    "has a sentence for `%s` in the region's register",
    (refusal) => {
      // **Every member, by iterating the vocabulary rather than listing it
      // here** — a third refusal word with no sentence is a compile error at
      // the record, and this is the run-time half: no terminal stop, no
      // connection word, no status word, and never a `%`.
      const sentence = percentileRefusal(refused({ refusal }));

      expect(sentence.endsWith(".")).toBe(false);
      expect(sentence).not.toContain("%");
      expect(sentence).not.toMatch(
        /\b(?:live|stale|disconnected|offline|error|failed|connect)\b/iu,
      );
      expect(sentence.length).toBeLessThan(60);
    },
  );
});

describe("percentileOrdinal — the short form, for a 308 px row", () => {
  it("is the reading with the word taken off", () => {
    // **One fact, two renderings** (ADR 0029), and the derivation runs
    // short-from-long so the two cannot drift: `percentileReading` is the
    // sentence the security page has shipped since Story 5.3, and this is
    // what `Unusual activity` draws in a 64 px cell on a 308 px row, where
    // the whole phrase is sixteen glyphs and 143.6 px in the cold-load face.
    expect(percentileReading(PERCENTILE)).toBe(
      `${percentileOrdinal(PERCENTILE)} percentile`,
    );
  });

  it.each([
    [0, "0th"],
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [62, "62nd"],
    [99, "99th"],
  ])("spells %i as `%s`, teens included", (rank, expected) => {
    // The teens are the whole reason this is a function: `11st`, `12nd` and
    // `13rd` are what a `% 10` alone produces, and the rank this draws most
    // often is in the nineties where a `% 10` is right.
    // `one-home-for-the-ordinal-suffix` is what keeps a second surface from
    // writing its own copy of this.
    expect(percentileOrdinal({ ...PERCENTILE, rank })).toBe(expected);
  });

  it("draws the ceiling as the stronger statement rather than as a clamp", () => {
    // `>99th` says the baseline holds nothing as large as this move. `100th`
    // is never printed: above the highest order statistic there is no sample.
    expect(percentileOrdinal({ ...PERCENTILE, aboveSample: true })).toBe(
      ">99th",
    );
  });

  it("is never wider than five glyphs, which is what the 64 px track is sized to", () => {
    // A track with **no reversal trigger**: `>99th` is the widest string this
    // cell will ever hold, for ever, because the ceiling cannot move.
    for (let rank = 0; rank <= 99; rank += 1) {
      for (const aboveSample of [false, true]) {
        expect(
          percentileOrdinal({ ...PERCENTILE, rank, aboveSample }).length,
        ).toBeLessThanOrEqual(5);
      }
    }
  });

  it("carries no `%`, which is one of the channels the moved word did not take with it", () => {
    expect(percentileOrdinal(PERCENTILE)).not.toContain("%");
  });
});
