import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { WireSymbolReturn } from "@marketpulse/shared";

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

const MEASURED: WireSymbolReturn = {
  measured: true,
  percent: 0.4201680672268908,
  from: { at: "2026-10-14T18:01:00.000Z", price: 119, feed: "iex" },
  to: { at: "2026-10-14T18:06:00.000Z", price: 119.5, feed: "iex" },
  observed: 3,
  spanMinutes: 5,
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

  it("states a word where the figure would be, and never a dash", () => {
    draw({
      symbolReturn: {
        symbol: "NVDA",
        figure: { measured: false, refusal: "no-earlier-endpoint" },
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
        figure: { measured: false, refusal: "nothing-observed" },
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
        figure: { measured: false, refusal: "nothing-observed" },
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

    // AC 6. `IEX` is a tape and is invariant 6's field; `All US exchanges` on
    // this surface would be a coverage claim about a figure measured at one
    // venue.
    expect(container.textContent).not.toMatch(
      /live|stale|disconnect|all us exchanges/iu,
    );
  });
});
