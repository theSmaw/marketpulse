// The non-colour encoding, asserted on the thing a user actually perceives.
//
// The rule this file exists to protect was measured in Task 1.4.4: under
// `grayscale(1)` the positive and negative price colours differ by **1.05:1**,
// so hue carries the entire difference and nothing about direction survives
// desaturation. What carries it instead is the arrow glyph and a visually
// hidden word — and the word is the half a test can assert, because it is in
// the accessible name.
//
// **Do not add an assertion on colour here.** The class name is available and
// it would be easy; it would also pass on a stylesheet that renders both
// directions identically, which is precisely the failure this component was
// built to prevent.

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PRICE_DIRECTIONS, PriceChange } from "./PriceChange.js";
import type { PriceDirection } from "./PriceChange.js";

const WORD: Readonly<Record<PriceDirection, string>> = {
  positive: "up",
  negative: "down",
  unchanged: "unchanged",
};

describe("PriceChange", () => {
  it.each(PRICE_DIRECTIONS)(
    "reads as a direction word plus the figure when %s",
    (direction) => {
      const { container } = render(
        <PriceChange change="+12.40" direction={direction} />,
      );

      // Asserted on the rendered text as a whole rather than with
      // `getByText("up +12.40")`, which fails — and the failure is worth
      // recording, because it is a property of the component rather than of
      // the query. The word lives in its own visually-hidden `<span>` and the
      // figure is a sibling text node, so no single element holds both;
      // Testing Library says so explicitly ("the text is broken up by multiple
      // elements"). What a screen reader is handed is the concatenation, which
      // is what this reads.
      const text = container.textContent;
      expect(text).toContain(WORD[direction]);
      expect(text).toContain("+12.40");
      // Order matters: the direction has to arrive before the figure, or it is
      // a correction rather than a reading.
      expect(text.indexOf(WORD[direction])).toBeLessThan(
        text.indexOf("+12.40"),
      );
    },
  );

  it("hides the glyph from assistive technology and shows it otherwise", () => {
    const { container } = render(
      <PriceChange change="+12.40" direction="positive" />,
    );

    const glyph = container.querySelector('[aria-hidden="true"]');
    expect(glyph?.textContent).toBe("▲");
    // Three arrows, three directions — a shared glyph would be a colour-only
    // encoding wearing a decoration.
    expect(glyph?.textContent).not.toBe("▼");
  });

  it("gives each direction a distinct glyph", () => {
    const glyphs = PRICE_DIRECTIONS.map((direction) => {
      const { container, unmount } = render(
        <PriceChange change="0.00" direction={direction} />,
      );
      const glyph =
        container.querySelector('[aria-hidden="true"]')?.textContent ?? "";
      unmount();
      return glyph;
    });

    expect(new Set(glyphs).size).toBe(PRICE_DIRECTIONS.length);
  });
});
