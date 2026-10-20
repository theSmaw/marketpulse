import { describe, expect, it } from "vitest";

import type {
  WireMeasuredReturn,
  WireObservedSpan,
  WireReturnPercentile,
  WireReturnRefusal,
  WireSymbolReturn,
} from "@marketpulse/shared";

import { RESERVED_RETURN, fiveMinuteReturnBand } from "./five-minute-return.js";

// The band's read side. **What is asserted is the spelling and the refusals**;
// the arithmetic is the backend's and is asserted in
// `apps/backend/src/five-minute-return.test.ts`, which is the point of the
// split rather than an omission.
//
// **Not asserted here**: colour (structurally impossible — no stylesheet is
// applied in this environment) and any height (jsdom computes no layout, so
// one height in every state is the browser's and the probe's).

// **`WireMeasuredReturn` rather than the union**, so the endpoints are
// reachable without narrowing at every use — the union's `keyof` is the
// intersection of its members'.
const MEASURED: WireMeasuredReturn = {
  measured: true,
  percent: 0.4201680672268908,
  from: { at: "2026-10-14T18:01:00.000Z", price: 119, feed: "iex" },
  to: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 3,
  spanMinutes: 5,
  // **No baseline**, which is the ordinary state, most securities' state and
  // every gated run's permanent one.
  percentile: null,
};

/**
 * A comparison, as the gateway sends one (Task 5.3.3) — `n` is the measured
 * maximum over this universe and the tape is the baseline's, which is never
 * the numerator's.
 */
const PERCENTILE: WireReturnPercentile = {
  ranked: true,
  rank: 99,
  aboveSample: false,
  sampleCount: 4620,
  spanMinutes: 5,
  feed: "sip",
};

const held = (figure: WireSymbolReturn, symbol = "NVDA") => ({
  symbol,
  figure,
  // **The volume half, which this module does not read at all** (Task 5.5.4).
  // It is on the view because the frame carries both figures; `volumeRatioBand`
  // is the one that spells it, in `volume-ratio.test.ts`.
  volume: null,
});

/**
 * A refusal, with what the window held beside it — `null` where it held
 * nothing at all, which is the shape `nothing-observed` is the only producer
 * of (Task 5.2.4).
 */
const refused = (
  refusal: WireReturnRefusal,
  seen: WireObservedSpan | null = null,
): WireSymbolReturn => ({ measured: false, refusal, seen });

/** The one instant a refusal that found a newer endpoint carries. */
const SEEN_ONE: WireObservedSpan = {
  newest: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 1,
  spanMinutes: 5,
};

describe("fiveMinuteReturnBand", () => {
  it("spells the figure, both instants oldest first, and the observed count", () => {
    const band = fiveMinuteReturnBand("NVDA", held(MEASURED));

    expect(band.move).toEqual({ change: "+0.42%", direction: "positive" });
    // 18:01Z is 14:01 EDT and 18:06Z is 14:06 EDT. **Oldest first**, which is
    // AC 4's instant and the only thing distinguishing a 5-minute return from
    // a 47-minute one.
    expect(band.qualifier).toBe(
      "Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT · observed 3 of 5 minutes",
    );
  });

  it("adds NOTHING to either instant", () => {
    // `describeMeasuredReach` adds `OBSERVATION_INTERVAL_MS` because it claims
    // *reach*; these two are the ends of a **span**, so a minute added to each
    // would print a five-minute return as **six** minutes apart and contradict
    // the definition the figure was measured under.
    const band = fiveMinuteReturnBand("NVDA", held(MEASURED));

    expect(band.qualifier).toContain("14:01");
    expect(band.qualifier).toContain("14:06");
    expect(band.qualifier).not.toContain("14:02");
    expect(band.qualifier).not.toContain("14:07");
  });

  it("states the span the frame sent rather than a 5 of its own", () => {
    const band = fiveMinuteReturnBand(
      "NVDA",
      held({ ...MEASURED, observed: 2, spanMinutes: 9 }),
    );

    expect(band.qualifier).toContain("observed 2 of 9 minutes");
  });

  it("uses one grammar for k, with no special case at the complete end", () => {
    const complete = fiveMinuteReturnBand(
      "NVDA",
      held({ ...MEASURED, observed: 5 }),
    );

    // `observed 5 of 5 minutes`, never *all five* — a second grammar at the
    // complete end is two sentences for one fact and destroys the scan between
    // two securities.
    expect(complete.qualifier).toContain("observed 5 of 5 minutes");
  });

  it("names the tape, and names it from the feed vocabulary", () => {
    expect(fiveMinuteReturnBand("NVDA", held(MEASURED)).tape).toBe(
      "Measured on IEX",
    );
  });

  it("names both tapes across a stitch, in endpoint order", () => {
    const band = fiveMinuteReturnBand(
      "NVDA",
      held({
        ...MEASURED,
        from: { ...MEASURED.from, feed: "sip" },
      }),
    );

    expect(band.tape).toBe("Measured on All US exchanges and IEX");
  });

  it("states a word for each refusal and NEVER a dash", () => {
    const words = (
      ["nothing-observed", "no-earlier-endpoint", "no-basis"] as const
    ).map((refusal) => {
      const band = fiveMinuteReturnBand("NVDA", held(refused(refusal)));
      return band.absent;
    });

    expect(words).toEqual([
      "No bars observed yet",
      "No bar five minutes back",
      "No basis for a percentage",
    ]);
    // Three refusals, three sentences, no digits and no `—`: an em dash in the
    // figure slot is `unchanged` in `PriceChange` and would assert a zero
    // return.
    for (const word of words) expect(word).not.toMatch(/[—\d]/u);
  });

  it("draws no figure and no tape on a refusal, and is not the nothing state", () => {
    const band = fiveMinuteReturnBand(
      "NVDA",
      held(refused("no-earlier-endpoint")),
    );

    expect(band.move).toBeUndefined();
    expect(band.qualifier).toBeUndefined();
    // ADR 0029: there is no number, so there is nothing whose provenance could
    // be claimed.
    expect(band.tape).toBeUndefined();
    // **And it is not `nothing`.** *No frame has arrived* and *the frame
    // arrived and said there is no pair* are different facts, which is Task
    // 5.1.4's lesson one region down.
    expect(band.nothing).toBe(false);
  });

  it("holds the room before any frame has arrived", () => {
    expect(fiveMinuteReturnBand("NVDA", undefined)).toEqual(RESERVED_RETURN);
    expect(RESERVED_RETURN.nothing).toBe(true);
  });

  it("refuses a figure about ANOTHER security", () => {
    // The navigation window, one subscribe round trip wide: the gateway answers
    // the focus it was last told, so a surface reading the figure alone would
    // draw NVDA's return under AMD's name.
    expect(fiveMinuteReturnBand("AMD", held(MEASURED, "NVDA"))).toEqual(
      RESERVED_RETURN,
    );
  });

  it("keeps the figure and drops the clause when an instant cannot be read", () => {
    const band = fiveMinuteReturnBand(
      "NVDA",
      held({ ...MEASURED, to: { ...MEASURED.to, at: "not an instant" } }),
    );

    // `new Date(NaN)` formats without complaining and reaches a screen as the
    // words `Invalid Date`. The percentage is true whatever the string carrying
    // its instant did.
    expect(band.move?.change).toBe("+0.42%");
    expect(band.qualifier).toBeUndefined();
  });

  it("reads the direction off the one classifier, on the DISPLAYED figure", () => {
    // +0.004% prints `0.00%`, so it is `unchanged` — a comparison on the raw
    // sign would draw an up arrow beside a figure saying nothing moved.
    const band = fiveMinuteReturnBand(
      "NVDA",
      held({ ...MEASURED, percent: 0.004 }),
    );

    expect(band.move).toEqual({ change: "0.00%", direction: "unchanged" });
  });

  it("carries the ONE instant it has beside a refusal, and the count", () => {
    // **The two facts that must not look identical** (Task 5.2.4). Without
    // this clause, *we hold one bar and there is no pair* and *we have heard
    // nothing at all* differ by four words in one sentence with identical
    // blank room beneath — and the second is the state every gated run is
    // permanently in.
    const band = fiveMinuteReturnBand(
      "NVDA",
      held(refused("no-earlier-endpoint", SEEN_ONE)),
    );

    expect(band.absent).toBe("No bar five minutes back");
    expect(band.qualifier).toBe("Oct 14 · 14:06 EDT · observed 1 of 5 minutes");
    // **No arrow**, because an arrow with one end is a span whose other end
    // the reader has to guess — and the arrow is what a measured figure's
    // clause means.
    expect(band.qualifier).not.toContain("→");
  });

  it("draws NOTHING beside *nothing observed*, which is the structural half", () => {
    const nothing = fiveMinuteReturnBand(
      "NVDA",
      held(refused("nothing-observed")),
    );
    const oneBar = fiveMinuteReturnBand(
      "NVDA",
      held(refused("no-earlier-endpoint", SEEN_ONE)),
    );

    // The frame's own shape decides: a window that observed nothing carries no
    // span, so there is nothing to draw rather than a renderer choosing to
    // draw less of it.
    expect(nothing.qualifier).toBeUndefined();
    expect(oneBar.qualifier).toBeDefined();
    expect(nothing.absent).not.toBe(oneBar.absent);
  });

  it("keeps the refusal and drops the clause when the one instant cannot be read", () => {
    const band = fiveMinuteReturnBand(
      "NVDA",
      held(
        refused("no-earlier-endpoint", {
          ...SEEN_ONE,
          newest: { ...SEEN_ONE.newest, at: "not an instant" },
        }),
      ),
    );

    // `new Date(NaN)` formats without complaining and reaches a screen as the
    // words `Invalid Date`. The refusal is the fact and survives.
    expect(band.absent).toBe("No bar five minutes back");
    expect(band.qualifier).toBeUndefined();
  });

  it("claims no tape beside the one instant either", () => {
    // ADR 0029, and the distinction is the rule's own: `Measured on IEX` is a
    // claim about a **measurement**, and no measurement happened. The instant
    // is a fact about a bar we hold, which is a different claim with its own
    // words.
    const band = fiveMinuteReturnBand(
      "NVDA",
      held(refused("no-earlier-endpoint", SEEN_ONE)),
    );

    expect(band.tape).toBeUndefined();
  });

  it("gives a return of exactly zero the figure a zero is, never a refusal's words", () => {
    // **The state the whole no-dash rule is written against** (Task 5.2.4): a
    // five-minute span in which the price did not move is a **measured**
    // figure, and `—` in the figure slot is `PriceChange`'s `unchanged` — so
    // the dash a refusal must never draw is exactly the glyph this state owes.
    const band = fiveMinuteReturnBand(
      "NVDA",
      held({ ...MEASURED, percent: 0 }),
    );

    expect(band.move).toEqual({ change: "0.00%", direction: "unchanged" });
    expect(band.absent).toBeUndefined();
    // And it keeps everything a measured figure has, which is what tells a
    // reader it is a reading rather than a refusal.
    expect(band.qualifier).toContain("observed 3 of 5 minutes");
    expect(band.tape).toBe("Measured on IEX");
  });

  it("says the same thing about a window that ended forty minutes ago", () => {
    // **Nothing changes, and that is AC 6 rather than an omission.** The
    // instant IS the age: no threshold, no verdict, no connection word. The
    // 187-minute ordinary maximum gap between one security's bars is what any
    // threshold here would have had to spare.
    const old = fiveMinuteReturnBand(
      "NVDA",
      held({
        ...MEASURED,
        from: { ...MEASURED.from, at: "2026-10-14T17:21:00.000Z" },
        to: { ...MEASURED.to, at: "2026-10-14T17:26:00.000Z" },
      }),
    );
    const fresh = fiveMinuteReturnBand("NVDA", held(MEASURED));

    expect(old.qualifier).toBe(
      "Oct 14 · 13:21 EDT → Oct 14 · 13:26 EDT · observed 3 of 5 minutes",
    );
    // The same shape, the same words, the same clause count — only the two
    // instants differ, which is the reader's own subtraction to do.
    expect(old.move).toEqual(fresh.move);
    expect(old.tape).toBe(fresh.tape);
    expect(old.absent).toBeUndefined();
  });

  // --- The percentile, which is the first comparison in this product ---
  describe("the percentile and what it was taken against", () => {
    const ranked = (over: Partial<WireReturnPercentile> = {}) =>
      fiveMinuteReturnBand(
        "NVDA",
        held({ ...MEASURED, percentile: { ...PERCENTILE, ...over } }),
      );

    it("spells the rank beside the figure and the sample under it", () => {
      const band = ranked();

      expect(band.percentile).toBe("99th percentile");
      expect(band.sample).toBe(
        "of 4,620 5-minute returns · all times of day pooled",
      );
      // The figure is untouched: two cells on one row, one of which is a
      // comparison.
      expect(band.move).toEqual({ change: "+0.42%", direction: "positive" });
    });

    it("names BOTH tapes, because one tape per comparison is not achievable", () => {
      // Story 5.3's Gate 1, false premise 5: the numerator is `iex`-over-`iex`
      // by construction and the baseline window is `sip` only, so every
      // comparison this story ships crosses the two. Invariant 6 — provenance
      // displayed, never implied — is why the screen says so in one clause
      // rather than letting `Measured on IEX` cover both numbers.
      expect(ranked().tape).toBe(
        "Measured on IEX · baseline on All US exchanges",
      );
    });

    it("says nothing at all where the gateway said nothing", () => {
      // ADR 0029's defer rule at its sharpest: a clause naming the tape of a
      // comparison that did not happen is the fully-formed provenance record
      // about nothing.
      //
      // **`percentile: null` is now only one state** (Task 5.3.4): a frame
      // from a gateway that predates the comparison, or one whose shape this
      // bundle could not read. The absences that used to arrive here — no
      // generation, no row, too short, refused — each say which, below.
      const band = fiveMinuteReturnBand("NVDA", held(MEASURED));

      expect(band.percentile).toBeUndefined();
      expect(band.sample).toBeUndefined();
      expect(band.tape).toBe("Measured on IEX");
    });

    it("draws the refusal in the sample row, and no percentile cell", () => {
      // **Replacing a clause rather than adding a row** (Task 5.3.4), which is
      // what keeps the region one height: the footer row is reserved for the
      // bias clause at every width and the refusal sentence is shorter.
      const band = fiveMinuteReturnBand(
        "NVDA",
        held({
          ...MEASURED,
          percentile: {
            ranked: false,
            refusal: "too-few-samples",
            sampleCount: 737,
            minimumSampleCount: 2500,
          },
        }),
      );

      // The figure is untouched — the return is true whatever the comparison
      // beside it was.
      expect(band.move?.change).toBe("+0.42%");
      expect(band.percentile).toBeUndefined();
      expect(band.sample).toBe(
        "Baseline too short to rank — 737 of 2,500 returns",
      );
      // **And no baseline tape clause**, because no baseline was used: ADR
      // 0029 again, and the clause draws only where a comparison did.
      expect(band.tape).toBe("Measured on IEX");
    });

    it("draws the price-break refusal, which is a different sentence", () => {
      const band = fiveMinuteReturnBand(
        "NVDA",
        held({
          ...MEASURED,
          percentile: {
            ranked: false,
            refusal: "split-discontinuity",
            sampleCount: 4620,
            minimumSampleCount: 2500,
          },
        }),
      );

      expect(band.sample).toBe(
        "Baseline crosses an unadjusted price break — not comparable",
      );
      expect(band.percentile).toBeUndefined();
    });

    it("keeps the refusal when an instant cannot be read", () => {
      // The asymmetry is the point and it is not a convenience. The sample
      // clause's bias arm is derived from the two instants, so a **ranked**
      // comparison drops when either is unreadable; *we hold 737 returns* has
      // no such condition and is true whatever the strings did. Without this
      // the state would be a figure with blank room under it — which says *we
      // did not think to compare this* rather than *we will not*.
      const band = fiveMinuteReturnBand(
        "NVDA",
        held({
          ...MEASURED,
          to: { ...MEASURED.to, at: "not an instant" },
          percentile: {
            ranked: false,
            refusal: "too-few-samples",
            sampleCount: 0,
            minimumSampleCount: 2500,
          },
        }),
      );

      expect(band.qualifier).toBeUndefined();
      expect(band.sample).toBe(
        "Baseline too short to rank — 0 of 2,500 returns",
      );
    });

    it("never draws a dash where the percentile cell would be", () => {
      // `—` is `unchanged` in `PriceChange`, so a dash in that cell asserts a
      // zero return about a number that is not a return at all. Every
      // comparison state is checked, including the two refusals and the
      // nothing-said one.
      const comparisons = [
        null,
        PERCENTILE,
        {
          ranked: false,
          refusal: "too-few-samples",
          sampleCount: 0,
          minimumSampleCount: 2500,
        },
        {
          ranked: false,
          refusal: "split-discontinuity",
          sampleCount: 4620,
          minimumSampleCount: 2500,
        },
      ] as const;

      for (const percentile of comparisons) {
        const band = fiveMinuteReturnBand(
          "NVDA",
          held({ ...MEASURED, percentile }),
        );

        expect(band.percentile ?? "").not.toContain("—");
        expect(band.percentile ?? "").not.toContain("-");
      }
    });

    it("draws a low ordinal beside a zero return rather than a refusal", () => {
      // **The pair most easily misread.** `0.00%` with `—` as its glyph is a
      // *reading*: the price did not move in those five minutes, and against a
      // baseline of magnitudes that is an ordinary low rank rather than an
      // absence. What tells it from a refusal is everything a refusal does not
      // have — a signed figure, both instants, the observed count, the tape,
      // and a rank.
      const band = fiveMinuteReturnBand(
        "NVDA",
        held({
          ...MEASURED,
          percent: 0,
          percentile: { ...PERCENTILE, rank: 3, sampleCount: 4620 },
        }),
      );

      expect(band.move?.change).toBe("0.00%");
      expect(band.move?.direction).toBe("unchanged");
      expect(band.percentile).toBe("3rd percentile");
      expect(band.absent).toBeUndefined();
    });

    it("drops the comparison, and keeps the figure, when an instant cannot be read", () => {
      // The rank is true whatever the strings carrying the endpoints did — but
      // the **sample clause** is conditional on those instants, and a sentence
      // that cannot evaluate its own condition would have to guess which of
      // its two grammars to draw. So the pair travels together (ADR 0029), and
      // the percentage survives without either.
      const band = fiveMinuteReturnBand(
        "NVDA",
        held({
          ...MEASURED,
          to: { ...MEASURED.to, at: "not an instant" },
          percentile: PERCENTILE,
        }),
      );

      expect(band.move?.change).toBe("+0.42%");
      expect(band.percentile).toBeUndefined();
      expect(band.sample).toBeUndefined();
      expect(band.tape).toBe("Measured on IEX");
    });

    it("draws `>99th` at the ceiling and never a `100th`", () => {
      expect(ranked({ aboveSample: true }).percentile).toBe(">99th percentile");
    });

    it("states the opening bias from the figure's own instants", () => {
      // AC 8, and the condition is the figure's rather than a clock's: 13:38Z
      // is 09:38 EDT, eight minutes after the bell.
      const band = fiveMinuteReturnBand(
        "NVDA",
        held({
          ...MEASURED,
          from: { ...MEASURED.from, at: "2026-10-14T13:38:00.000Z" },
          to: { ...MEASURED.to, at: "2026-10-14T13:43:00.000Z" },
          percentile: PERCENTILE,
        }),
      );

      expect(band.sample).toContain("fattest-tailed");
      // The qualifier is unchanged — the bias is a fact about the **sample**,
      // not about this observation.
      expect(band.qualifier).toContain("observed 3 of 5 minutes");
    });

    it("spells no `%` in either new line", () => {
      // AC 7. A percentile and a change formatted by the same decimals are
      // visually the same kind of number and are not.
      for (const over of [{}, { aboveSample: true }, { rank: 2 }]) {
        const band = ranked(over);

        expect(band.percentile).not.toContain("%");
        expect(band.sample).not.toContain("%");
      }
    });
  });

  it("says nothing about the feed in any state", () => {
    const states: (WireSymbolReturn | undefined)[] = [
      MEASURED,
      refused("nothing-observed"),
      refused("no-earlier-endpoint", SEEN_ONE),
      refused("no-basis", SEEN_ONE),
      undefined,
    ];

    for (const figure of states) {
      const band = fiveMinuteReturnBand(
        "NVDA",
        figure === undefined ? undefined : held(figure),
      );
      const text = [band.absent, band.qualifier, band.tape, band.label]
        .filter((part) => part !== undefined)
        .join(" ");

      // AC 6: no threshold, no status word, no connection word. `Measured on
      // IEX` names a **tape**, which is invariant 6's field, and is matched
      // out before the connection words are looked for.
      expect(text).not.toMatch(/\b(?:live|stale|disconnect\w*|ago|old)\b/iu);
    }
  });
});
