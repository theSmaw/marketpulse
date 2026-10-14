import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  WireMeasuredReturn,
  WireObservedSpan,
  WireReturnPercentile,
  WireReturnRefusal,
  WireSymbolReturn,
} from "@marketpulse/shared";

import { SAY_NOTHING_ARRIVED_AFTER_MS } from "../MarketProxyStrip/use-waited.js";

import { AbnormalMove, type AbnormalMoveProps } from "./AbnormalMove.js";

// What the region DRAWS. The spelling and the refusals are asserted directly in
// `five-minute-return.test.ts`; what is here is the markup a reader meets, and
// the two things jsdom genuinely can see — **the text** and **the
// accessibility tree**.
//
// **Deliberately not asserted**: colour (no stylesheet is applied here, so it
// is structurally impossible) and any height — jsdom computes no layout, so
// *one height in every state* is the browser's and the probe's, and this task's
// record carries the probed figure per width.

// **`WireMeasuredReturn` rather than the union**, so the endpoints are
// reachable without narrowing at every use.
const MEASURED: WireMeasuredReturn = {
  measured: true,
  percent: 0.4201680672268908,
  from: { at: "2026-10-14T18:01:00.000Z", price: 119, feed: "iex" },
  to: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 3,
  spanMinutes: 5,
  // **No baseline to compare it with** — the ordinary state, and CI's
  // permanent one. The comparison's own states are below.
  percentile: null,
};

/** A comparison, as the gateway sends one (Task 5.3.3). */
const PERCENTILE: WireReturnPercentile = {
  rank: 99,
  aboveSample: false,
  sampleCount: 4620,
  spanMinutes: 5,
  feed: "sip",
};

/**
 * **A spread rather than destructured defaults**, which is
 * `RelativePerformance.test.tsx`'s recorded defect avoided: in JavaScript an
 * explicitly passed `undefined` *triggers* a parameter default, so
 * `draw({ symbolReturn: undefined })` would have drawn the complete state and
 * every honest-nothing assertion would have passed against it.
 */
const DEFAULTS: AbnormalMoveProps = {
  symbol: "NVDA",
  symbolReturn: { symbol: "NVDA", figure: MEASURED },
};

const draw = (over: Partial<AbnormalMoveProps> = {}) =>
  render(<AbnormalMove {...DEFAULTS} {...over} />);

/** A refusal, with what the window held beside it — `null` where nothing was. */
const refused = (
  refusal: WireReturnRefusal,
  seen: WireObservedSpan | null = null,
): WireSymbolReturn => ({ measured: false, refusal, seen });

/** The one instant a window holding a single bar has. */
const SEEN_ONE: WireObservedSpan = {
  newest: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 1,
  spanMinutes: 5,
};
/** The character a reserved row holds, where a line would be. */
const NBSP = "\u00a0";

/**
 * **What a listener is handed, line by line.**
 *
 * `textContent` runs the band's four blocks together with no separator, and a
 * screen reader pauses between blocks — which is `CLAUDE.md`'s own rule for
 * what to assert on a component that splits its text: assert the
 * concatenation, with the block boundaries visible. So this walks the drawn
 * `<p>` elements in document order, **drops every `aria-hidden` subtree** (the
 * direction glyph, and the whole reserved box in the held states) and joins
 * what is left with ` / `.
 *
 * The room-holding no-break space goes too: a reserved row holds room and says
 * nothing, and a line containing one would read as a line that spoke.
 */
const readable = (element: HTMLElement): string => {
  const copy = element.cloneNode(true) as HTMLElement;
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) {
    hidden.remove();
  }

  return [...copy.querySelectorAll("p")]
    .map((line) =>
      line.textContent.replaceAll(NBSP, "").replace(/\s+/gu, " ").trim(),
    )
    .filter((line) => line !== "")
    .join(" / ");
};

describe("AbnormalMove", () => {
  it("draws the figure, the label, both instants and the observed count", () => {
    draw();

    expect(screen.getByText("5-minute return")).toBeTruthy();
    expect(screen.getByText("+0.42%")).toBeTruthy();
    expect(
      screen.getByText(
        "Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT · observed 3 of 5 minutes",
      ),
    ).toBeTruthy();
  });

  it("names the tape, which the chart beside it cannot do for this figure", () => {
    // Invariant 6. Every bar in the backend's trailing window is IEX, while the
    // chart's stored bars are the consolidated tape — so a region that said
    // nothing would inherit `All US exchanges` for a figure measured on one
    // venue.
    draw();

    expect(screen.getByText("Measured on IEX")).toBeTruthy();
  });

  it("gives a listener the direction as a word, with the glyph hidden", () => {
    const { container } = draw();

    // `▲ +0.42%` read aloud is a black up-pointing triangle followed by a
    // number, so the glyph is `aria-hidden` and `PriceChange` puts the word in
    // front of the figure. Colour is never the sole encoding: the price palette
    // differs by 1.04:1 in greyscale.
    expect(screen.getByText("up", { exact: false })).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  // --- The eight states, each asserted by its own string (Task 5.2.4) ---
  //
  // **The four absences first, because they are the ones that collapse.** Two
  // of them collapse on purpose and two must not, and the only way to tell the
  // difference from the outside is to read all four side by side — which is
  // what this block is. Every expectation below is a **string**, never an eye:
  // `/` paid for *held behind one sentence* once already (Task 4.3.8) and
  // `Relative performance` paid for *two facts, one sentence* the day before
  // this task (Task 5.1.4).
  describe("the eight states", () => {
    describe("1 and 2 — the security unresolved, and no payload yet", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("hold the band's room and say ONE thing, after the floor", () => {
        // **They are one input and therefore one drawing.** The route maps
        // *the universe answer has not resolved this security* and *no
        // `return` frame has arrived* to the same `undefined` — the collapse
        // is declared in the data rather than as two branches here, so the two
        // are byte-identical by construction (`SecurityExplorer.tsx`, and
        // `SecurityExplorer.test.tsx` asserts the mapping).
        const { container } = draw({ symbolReturn: undefined });

        // Before the floor: room, and **nothing said at all** — the whole
        // band, its label included, is inside the `aria-hidden` box, so a
        // listener is read nothing rather than a heading over a void. An
        // ordinary load's first frame lands at 174–277 ms, so a sentence here
        // would be a promise the next frame breaks.
        expect(readable(container)).toBe("");

        act(() => {
          vi.advanceTimersByTime(SAY_NOTHING_ARRIVED_AFTER_MS);
        });

        expect(screen.getByText("No return yet.")).toBeTruthy();
        // The region's own sentence takes the terminal stop the in-region
        // absences do not, and it is the **sixth** honest-nothing noun in this
        // product rather than the fifth this story's Design work section says.
        expect(readable(container)).toBe("No return yet.");
      });
    });

    it("3 — a payload with zero bars for this symbol says so, in words", () => {
      // **CI's permanent state**: 516 securities, zero bars, `provider=none`,
      // so the trailing window never holds an entry and this is what every
      // gated run renders, for ever.
      const { container } = draw({
        symbolReturn: { symbol: "NVDA", figure: refused("nothing-observed") },
      });

      expect(readable(container)).toBe(
        "5-minute return / No bars observed yet",
      );
      // And it is NOT state 1: the sentence is the frame's, drawn in the
      // figure's own slot, rather than the region's over held room.
      expect(screen.queryByText("No return yet.")).toBeNull();
    });

    it("4 — one bar held, and the earlier endpoint absent, states its instant", () => {
      // **The refusal this story exists for**, and the clause is what keeps it
      // off state 3. Without the instant and the count, *we hold one bar and
      // there is no pair* and *we have heard nothing* are a four-word
      // difference in one sentence with identical blank room beneath.
      const { container } = draw({
        symbolReturn: {
          symbol: "NVDA",
          figure: refused("no-earlier-endpoint", SEEN_ONE),
        },
      });

      expect(readable(container)).toBe(
        "5-minute return / No bar five minutes back / Oct 14 · 14:06 EDT · observed 1 of 5 minutes",
      );
    });

    it("3 and 4 do not read alike — the assertion, not the eye", () => {
      const { container: three } = draw({
        symbolReturn: { symbol: "NVDA", figure: refused("nothing-observed") },
      });
      const { container: four } = draw({
        symbolReturn: {
          symbol: "NVDA",
          figure: refused("no-earlier-endpoint", SEEN_ONE),
        },
      });

      expect(readable(three)).not.toBe(readable(four));
      // Not only different: the one that held a bar says **when**, and the one
      // that held nothing says nothing further, because it has nothing to say.
      expect(readable(four)).toContain("observed 1 of 5 minutes");
      // **`of 5 minutes` rather than `observed`**, because *No bars observed
      // yet* contains the word: a predicate that cannot see the clause it is
      // written about is Task 4.8.9's defect, and the first draft of this line
      // had it.
      expect(readable(three)).not.toContain("of 5 minutes");
    });

    it("5 — a legitimate partial draws the figure and states what it saw", () => {
      // §7.6 measured IEX covering 65.1% of minutes for a median symbol, so
      // `observed 3 of 5 minutes` is the ordinary case rather than a degraded
      // one.
      const { container } = draw();

      expect(readable(container)).toBe(
        "5-minute return / up +0.42% / Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT · observed 3 of 5 minutes / Measured on IEX",
      );
    });

    it("6 — the whole span observed, in the same grammar", () => {
      const { container } = draw({
        symbolReturn: {
          symbol: "NVDA",
          figure: { ...MEASURED, observed: 5 },
        },
      });

      // `observed 5 of 5 minutes`, never *all five*: a second grammar at the
      // complete end is two sentences for one fact and destroys the scan
      // between two securities.
      expect(readable(container)).toContain("observed 5 of 5 minutes");
      expect(readable(container)).not.toMatch(/all|complete|whole/iu);
    });

    it("7 — a return of exactly zero is a reading, not a refusal", () => {
      // **The one state the no-dash rule reads backwards.** `—` in the figure
      // slot is `PriceChange`'s `unchanged`, which is why a refusal may never
      // draw one — and is exactly the glyph a span in which the price did not
      // move owes. What tells a reader it is a reading is everything a refusal
      // does not have: a signed figure, the spoken direction, both instants
      // and the tape.
      const { container } = draw({
        symbolReturn: { symbol: "NVDA", figure: { ...MEASURED, percent: 0 } },
      });

      expect(readable(container)).toBe(
        "5-minute return / unchanged 0.00% / Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT · observed 3 of 5 minutes / Measured on IEX",
      );
      for (const refusal of [
        "No bars observed yet",
        "No bar five minutes back",
        "No basis for a percentage",
        "No return yet.",
      ]) {
        expect(screen.queryByText(refusal)).toBeNull();
      }
    });

    it("8 — a window that ended forty minutes ago says the SAME thing", () => {
      // **Nothing changes, and that is AC 6 rather than an omission.** The
      // instant is the age: no threshold, no verdict, no connection word. The
      // measured ordinary maximum gap between one security's bars is 187
      // minutes, which is what any threshold here would have had to spare —
      // and the one home for *the feed has stopped* is the status bar.
      const { container } = draw({
        symbolReturn: {
          symbol: "NVDA",
          figure: {
            ...MEASURED,
            from: { ...MEASURED.from, at: "2026-10-14T17:21:00.000Z" },
            to: { ...MEASURED.to, at: "2026-10-14T17:26:00.000Z" },
          },
        },
      });

      expect(readable(container)).toBe(
        "5-minute return / up +0.42% / Oct 14 · 13:21 EDT → Oct 14 · 13:26 EDT · observed 3 of 5 minutes / Measured on IEX",
      );
      expect(readable(container)).not.toMatch(
        /\b(?:ago|old|stale|behind|late|since)\b/iu,
      );
    });

    it("carries no placeholder VALUE in the accessibility tree, in any state", () => {
      // Done-when 5. A reserved row holds `\u00a0` and nothing else, so a
      // listener is never read a dash, a zero or an `unknown` standing in for
      // a figure — and in the held states the whole geometry is one
      // `aria-hidden` box, so the ladder of empty rows is not read either.
      const states: (WireSymbolReturn | undefined)[] = [
        undefined,
        refused("nothing-observed"),
        refused("no-earlier-endpoint", SEEN_ONE),
        refused("no-basis", SEEN_ONE),
        MEASURED,
      ];

      for (const figure of states) {
        const { container } = draw({
          symbolReturn:
            figure === undefined ? undefined : { symbol: "NVDA", figure },
        });

        const spoken = readable(container);
        expect(spoken).not.toMatch(/—|unknown|n\/a|null|undefined/iu);
        // A figure is claimed only where one exists: no `%` in any of the four
        // states that have no percentage.
        if (figure?.measured !== true) {
          expect(spoken).not.toContain("%");
        }
      }
    });
  });

  it("states a word where the figure would be, and never a dash", () => {
    draw({
      symbolReturn: {
        symbol: "NVDA",
        figure: refused("no-earlier-endpoint", SEEN_ONE),
      },
    });

    expect(screen.getByText("No bar five minutes back")).toBeTruthy();
    // `—` is `unchanged` in `PriceChange`, so a dash in the figure slot would
    // assert a zero return. The label still draws: the band is there and has
    // no figure, which is a different thing from the band being absent.
    expect(screen.getByText("5-minute return")).toBeTruthy();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("claims no tape on a refusal", () => {
    draw({
      symbolReturn: {
        symbol: "NVDA",
        figure: refused("nothing-observed"),
      },
    });

    // ADR 0029: a fully-formed provenance line about no figure is a false
    // impression rather than a courtesy.
    expect(screen.queryByText(/Measured on/u)).toBeNull();
  });

  it("holds the band's room before any frame arrives", () => {
    // The sentence itself is behind the proxy strip's 2,000 ms floor, so what
    // is asserted is that the region drew its own geometry hidden rather than
    // collapsing to nothing.
    const { container } = draw({ symbolReturn: undefined });

    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/%/u);
  });

  it("DRAWS, rather than holding, when the frame said there is no pair", () => {
    // **The state every gated run is permanently in**, and it is not the state
    // above: CI's store is 516 securities and zero bars, so the window is
    // empty and the frame carries `nothing-observed`. *Nothing has reached us*
    // and *we heard, and there is no pair* are different facts — `/` paid for
    // collapsing two of those once already.
    draw({
      symbolReturn: {
        symbol: "NVDA",
        figure: refused("nothing-observed"),
      },
    });

    const absent = screen.getByText("No bars observed yet");

    // And it is not inside the reserved box: in the held state the whole band
    // sits under one `aria-hidden` element, which is the assertion that tells
    // the two apart in a renderer with no layout.
    expect(absent.closest('[aria-hidden="true"]')).toBeNull();
  });

  it("holds the room for a figure about ANOTHER security", () => {
    const { container } = draw({
      symbol: "AMD",
      symbolReturn: { symbol: "NVDA", figure: MEASURED },
    });

    expect(container.textContent).not.toMatch(/0\.42/u);
  });

  it("speaks no feed word, no venue claim and no connection word", () => {
    const { container } = draw();

    // AC 6. `IEX` is a tape and is invariant 6's field; `All US exchanges`
    // beside this figure would be a coverage claim about a return measured at
    // one venue.
    expect(container.textContent).not.toMatch(
      /live|stale|disconnect|all us exchanges/iu,
    );
  });

  // --- The percentile, the first figure here that compares (Task 5.3.3) ---
  describe("the percentile", () => {
    const ranked = (over: Partial<WireReturnPercentile> = {}) =>
      draw({
        symbolReturn: {
          symbol: "NVDA",
          figure: { ...MEASURED, percentile: { ...PERCENTILE, ...over } },
        },
      });

    it("draws beside the figure, with the sample it was taken against", () => {
      const { container } = ranked();

      // Two cells on one row, then the sample, then **two** tapes. The
      // percentile is in the figure's own block, which is why it joins that
      // line rather than making a fifth.
      expect(readable(container)).toBe(
        "5-minute return / up +0.42% 99th percentile / " +
          "Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT · observed 3 of 5 minutes / " +
          "of 4,620 5-minute returns · all times of day pooled / " +
          "Measured on IEX · baseline on All US exchanges",
      );
    });

    it("states the counted `n` and no `%` near the ordinal", () => {
      // The count is read off the frame: the measured range over this universe
      // is 737 to 4,620, so a sentence quoting AC 3's nominal 4,680 would be
      // wrong for almost every security on the list.
      ranked({ sampleCount: 737 });

      expect(screen.getByText("99th percentile")).toBeTruthy();
      expect(
        screen.getByText("of 737 5-minute returns · all times of day pooled"),
      ).toBeTruthy();
      // AC 7, as a reader meets it: the only `%` on the band belongs to the
      // change.
      expect(screen.getByText("99th percentile").textContent).not.toContain(
        "%",
      );
    });

    it("says the venue claim about the BASELINE, never about the figure", () => {
      // Invariant 6 with Gate 1's false premise 5: the numerator is one venue
      // and the baseline is the consolidated tape, so the clause names which
      // is which. What must not happen is `All US exchanges` standing alone
      // where a reader would read it as the figure's.
      const { container } = ranked();

      expect(container.textContent).toContain(
        "Measured on IEX · baseline on All US exchanges",
      );
      expect(container.textContent).not.toMatch(/live|stale|disconnect/iu);
    });

    it("draws `>99th` at the ceiling and never a `100th`", () => {
      const { container } = ranked({ aboveSample: true });

      expect(screen.getByText(">99th percentile")).toBeTruthy();
      expect(container.textContent).not.toContain("100th");
    });

    it("states the opening bias from the figure's own instants", () => {
      // AC 8, and **no fake timers are needed to prove it reads no clock**:
      // 13:38Z is 09:38 EDT, eight minutes after the bell, and the clause is a
      // function of that instant for ever — including when the page is opened
      // at 11:00, and under a replay.
      const { container } = draw({
        symbolReturn: {
          symbol: "NVDA",
          figure: {
            ...MEASURED,
            from: { ...MEASURED.from, at: "2026-10-14T13:38:00.000Z" },
            to: { ...MEASURED.to, at: "2026-10-14T13:43:00.000Z" },
            percentile: PERCENTILE,
          },
        },
      });

      expect(container.textContent).toContain(
        "opening 30 minutes, the fattest-tailed bucket — pooled, this reads high",
      );
    });

    it("holds the two new rows\u2019 room, and says nothing in them, with no baseline", () => {
      // Every state, one height: the sample row reserves whether or not it
      // draws, and a reserved row holds a no-break space rather than a dash, a
      // zero or an `unknown` standing in for a figure.
      const { container } = draw();

      expect(readable(container)).not.toContain("percentile");
      expect(readable(container)).not.toContain("returns");
      expect(readable(container)).not.toContain("baseline");
      expect(readable(container)).not.toMatch(/—|unknown|n\/a|null/iu);
    });
  });
});
