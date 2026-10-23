import { describe, expect, it } from "vitest";

import { VOLUME_REFUSALS } from "@marketpulse/shared";

import {
  RESERVED_VOLUME,
  VOLUME_LABEL,
  formatMultiple,
  volumeRatioIndicator,
  volumeSample,
} from "./volume-ratio.js";

import type { WireSymbolReturn, WireVolumeRate } from "@marketpulse/shared";
import type { SymbolReturnView } from "./live-feed.js";

// The volume multiple's **words** (Task 5.5.4). Nothing here computes a ratio;
// what is asserted is the spelling, the five channels that tell a multiple from
// a percentage, and that no two of the six refusals are one sentence.

const MEASURED: WireSymbolReturn = {
  measured: true,
  percent: 0.42,
  from: { at: "2026-10-20T18:01:00.000Z", price: 119, feed: "iex" },
  to: { at: "2026-10-20T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 5,
  spanMinutes: 5,
  percentile: null,
};

const RATE: WireVolumeRate = {
  measured: true,
  ratio: 4.1,
  sampleCount: 2500,
  lookbackSessions: 60,
  bucketMinutes: 5,
  spanMinutes: 5,
  feed: "iex",
};

const held = (
  volume: SymbolReturnView["volume"],
  symbol = "NVDA",
): SymbolReturnView => ({ symbol, figure: MEASURED, volume, score: null });

describe("drawing a multiple", () => {
  it("glues U+00D7 to the digits, with one decimal and no sign", () => {
    // The first four of the five channels, in one assertion each. `×` is
    // U+00D7 and never the letter `x`; the absence of a `+` is what most
    // separates this figure from every other number on the screen.
    expect(formatMultiple(4.1)).toBe("4.1×");
    expect(formatMultiple(4)).toBe("4.0×");
    expect(formatMultiple(10)).toBe("10.0×");
    expect(formatMultiple(4.1)).not.toContain("+");
    expect(formatMultiple(4.1)).not.toContain("x");
  });

  it("draws below 1 identically — no reciprocal and no word", () => {
    // `3.3× quieter` invents a second scale running the other way, and
    // `quiet`/`heavy` collide with Story 5.6's band vocabulary.
    expect(formatMultiple(0.3)).toBe("0.3×");
    expect(formatMultiple(0.34)).not.toMatch(/quiet|light|low|heavy/iu);
  });

  it("draws exactly 1 as `1.0×`, never a dash", () => {
    // `—` is `unchanged` in `PriceChange`, so a dash here asserts ZERO volume
    // rather than *exactly typical* — AC 4's lesson in the glyph.
    expect(formatMultiple(1)).toBe("1.0×");
    expect(formatMultiple(1)).not.toContain("—");
  });

  it("caps above three digits, re-using the percentile's `>`", () => {
    expect(formatMultiple(1482.3)).toBe(">999×");
    // Decided on the figure that would be DRAWN: `999.96` renders `1000.0` at
    // one decimal, which is four digits inside a cap that reads three.
    expect(formatMultiple(999.96)).toBe(">999×");
    expect(formatMultiple(999.4)).toBe("999.4×");
  });

  it("floors rather than drawing `0.0×`, which would assert zero volume", () => {
    // The producer guarantees a ratio strictly above zero and the decoder
    // refuses one that is not — so a `0.0×` could only ever be the FORMATTER
    // inventing it.
    expect(formatMultiple(0.02)).toBe("<0.1×");
    expect(formatMultiple(0.0001)).not.toBe("0.0×");
    expect(formatMultiple(0.1)).toBe("0.1×");
  });
});

describe("the indicator", () => {
  it("draws the figure, the comparand, the baseline's facts and both tapes", () => {
    const indicator = volumeRatioIndicator("NVDA", held(RATE));

    expect(indicator).toStrictEqual({
      label: VOLUME_LABEL,
      multiple: "4.1×",
      comparand: "typical",
      absent: undefined,
      sample:
        "last 5 minutes · median minute of 60 sessions · " +
        "same 5-minute bucket · today excluded",
      // **The same tape on both sides**, which is Gate 1 decision 1 on screen
      // and is what makes this line different from the indicator above's.
      tape: "Measured on IEX · baseline on IEX",
    });
  });

  it("reads every number off the frame rather than spelling one", () => {
    const indicator = volumeRatioIndicator(
      "NVDA",
      held({
        ...RATE,
        spanMinutes: 7,
        lookbackSessions: 40,
        bucketMinutes: 15,
      }),
    );

    expect(indicator.sample).toBe(
      "last 7 minutes · median minute of 40 sessions · " +
        "same 15-minute bucket · today excluded",
    );
  });

  it("states the median and the exclusion, which AC 6 asks for by name", () => {
    // A mean of a heavy-tailed minute distribution is dragged by the open and
    // by every block trade in the window, so *which* average it is matters —
    // and `today excluded` is why the figure is never ranked against itself.
    expect(volumeSample(RATE)).toContain("median minute");
    expect(volumeSample(RATE)).toContain("today excluded");
  });

  it("holds the room for a figure about ANOTHER security", () => {
    // The gateway answers the focus a browser last declared, so a reader
    // moving from NVDA to AMD has one subscribe round trip in which the last
    // answer is about NVDA.
    expect(volumeRatioIndicator("AMD", held(RATE))).toStrictEqual(
      RESERVED_VOLUME,
    );
  });

  it("draws the label and nothing else where the gateway sent no comparison", () => {
    // ADR 0029's defer rule: we were not told there is an absence, so a
    // sentence explaining one would be a claim of its own. It is NOT the same
    // state as a refusal.
    expect(volumeRatioIndicator("NVDA", held(null))).toStrictEqual(
      RESERVED_VOLUME,
    );
  });
});

describe("the six refusals", () => {
  const refused = (
    refusal: (typeof VOLUME_REFUSALS)[number],
    over: { sampleCount?: number; observed?: number } = {},
  ) =>
    volumeRatioIndicator(
      "NVDA",
      held({
        measured: false,
        refusal,
        sampleCount: over.sampleCount ?? 0,
        observed: over.observed ?? 5,
        spanMinutes: 5,
      }),
    );

  it("says a different sentence for every one of the six", () => {
    // **The assertion, not the eye** — and the set is a `Set`, so two words
    // mapping to one string is a failure rather than something to notice.
    const spoken = VOLUME_REFUSALS.map((word) => refused(word).absent);

    expect(new Set(spoken).size).toBe(VOLUME_REFUSALS.length);
    expect(spoken.every((sentence) => sentence !== undefined)).toBe(true);
  });

  it("tells *we have never heard IEX* from *we have too little*", () => {
    // The most expensive collapse: one is a gap in our listening that needs
    // somebody to look at the live writer, and the other resolves itself on a
    // date nobody controls.
    expect(refused("no-same-tape-baseline").absent).toBe(
      "No IEX volume history for this security",
    );
    expect(refused("too-few-sessions", { sampleCount: 80 }).absent).toBe(
      "Too little history — 80 IEX minutes at this time of day",
    );
  });

  it("tells *IEX printed nothing* from *IEX printed in two of five*", () => {
    // A venue fact and a reach fact. Only the second tempts a re-implementer
    // into multiplying by `5/2`, and the count is the number a reader can
    // watch change.
    expect(refused("no-bar-in-bucket", { observed: 0 }).absent).toBe(
      "No IEX bars in the last 5 minutes",
    );
    expect(refused("bucket-partially-observed", { observed: 2 }).absent).toBe(
      "IEX printed in only 2 of 5 minutes",
    );
  });

  it("names a price break rather than a split, and says what it costs HERE", () => {
    // The detector reads a session-boundary ratio and has no corporate-action
    // calendar; what it costs the volume is that the share count moves by
    // exactly the factor the price does.
    expect(refused("split-discontinuity").absent).toBe(
      "Unadjusted price break — shares not comparable",
    );
  });

  it("refuses a zero denominator in words, never as an Infinity", () => {
    expect(refused("zero-volume-baseline").absent).toBe(
      "No IEX shares in a typical minute at this time of day",
    );
  });

  it("draws no digits, no dash, no sample row and no tape on any refusal", () => {
    // ADR 0029: there is no figure, so there is nothing whose baseline or
    // provenance could be claimed — a fully-formed source line about no figure
    // is the false impression that rule exists for. And **no digits at all**
    // except the counts the sentences state, because a refusal that draws a
    // number is a figure.
    for (const word of VOLUME_REFUSALS) {
      const indicator = refused(word);

      expect(indicator.multiple).toBeUndefined();
      expect(indicator.comparand).toBeUndefined();
      expect(indicator.sample).toBeUndefined();
      expect(indicator.tape).toBeUndefined();
      expect(indicator.absent).not.toContain("×");
      // **Not *no dash anywhere*** — the percentile's own refusals use one as
      // punctuation and so does this set. What is forbidden is a dash
      // STANDING where a figure would be, which is the `unchanged` glyph
      // asserting a zero; so what is asserted is that the slot holds a
      // sentence rather than a glyph.
      expect(indicator.absent).not.toBe("—");
      expect(indicator.absent).toMatch(/[a-z]/u);
    }
  });

  it("fits one line at 308 px — the budget, as a character count", () => {
    // **A proxy for a measurement rather than the measurement**, and it is
    // here because the measurement cannot be taken in jsdom: the sentence is
    // drawn in a single reserved metric line box, so one that wraps steps the
    // region by 26 px at the narrow width nobody develops at. Probed in
    // Chromium at 11px in the rail's 308 px box on 2026-10-20: 58 characters
    // fit and 62 do not. The largest `n` a count can print is the whole
    // window's, so it is asserted at 4,620 rather than at 80.
    const longest = Math.max(
      ...VOLUME_REFUSALS.map(
        (word) =>
          (refused(word, { sampleCount: 4620, observed: 2 }).absent ?? "")
            .length,
      ),
    );

    expect(longest).toBeLessThanOrEqual(58);
  });
});
