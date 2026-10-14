import { describe, expect, it } from "vitest";

import type { WireSymbolReturn } from "@marketpulse/shared";

import { RESERVED_RETURN, fiveMinuteReturnBand } from "./five-minute-return.js";

// The band's read side. **What is asserted is the spelling and the refusals**;
// the arithmetic is the backend's and is asserted in
// `apps/backend/src/five-minute-return.test.ts`, which is the point of the
// split rather than an omission.
//
// **Not asserted here**: colour (structurally impossible — no stylesheet is
// applied in this environment) and any height (jsdom computes no layout, so
// one height in every state is the browser's and the probe's).

const MEASURED: WireSymbolReturn = {
  measured: true,
  percent: 0.4201680672268908,
  from: { at: "2026-10-14T18:01:00.000Z", price: 119, feed: "iex" },
  to: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 3,
  spanMinutes: 5,
};

const held = (figure: WireSymbolReturn, symbol = "NVDA") => ({
  symbol,
  figure,
});

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
      const band = fiveMinuteReturnBand(
        "NVDA",
        held({ measured: false, refusal }),
      );
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
      held({ measured: false, refusal: "no-earlier-endpoint" }),
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

  it("says nothing about the feed in any state", () => {
    const states: (WireSymbolReturn | undefined)[] = [
      MEASURED,
      { measured: false, refusal: "nothing-observed" },
      { measured: false, refusal: "no-earlier-endpoint" },
      { measured: false, refusal: "no-basis" },
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
