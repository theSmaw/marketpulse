import { describe, expect, it } from "vitest";

import {
  OPENING_BIAS_MINUTES,
  percentileReading,
  percentileSample,
} from "./return-percentile.js";

import type { WireReturnPercentile } from "@marketpulse/shared";

// **The percentile's words** (Task 5.3.3). Nothing here computes a rank; what
// is asserted is the spelling, the ceiling and the one condition this module
// evaluates — the bias clause, off the figure's own instants.

const PERCENTILE: WireReturnPercentile = {
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
      "of 4,620 5-minute returns · opening 30 minutes, " +
        "the fattest-tailed bucket — pooled, this reads high",
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
