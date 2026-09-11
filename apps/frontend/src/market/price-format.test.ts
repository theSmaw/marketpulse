import { describe, expect, it } from "vitest";

import {
  PRICE_DIRECTIONS,
  directionOf,
  formatChangePercent,
  formatPrice,
} from "./price-format.js";

// How this product spells a price and a direction, tested with no DOM.
//
// **These tests arrived with the functions** (Task 2.12.3), from
// `UniverseTable/last-close.test.ts` and `BarSeriesPanel/series-facts.test.ts`,
// which each held a copy. They are kept rather than rewritten: what they assert
// is the behaviour two shipped screens already depend on, and a rewrite at the
// moment of a move is how a move quietly becomes a change.

describe("formatPrice", () => {
  it.each([
    [230.36, "230.36"],
    // The store is `numeric(18, 6)` and those places are real. Two is a display
    // decision, and the rounded value is never fed back into anything.
    [230.364_9, "230.36"],
    [230.365_1, "230.37"],
    // A whole number still gets its places, so the column does not develop a
    // ragged decimal point on the one row that closed evenly.
    [770, "770.00"],
    // A sub-dollar security, where the two places carry the whole figure.
    [0.42, "0.42"],
  ])("renders %s as %s", (price, expected) => {
    expect(formatPrice(price)).toBe(expected);
  });

  it("uses no grouping separator, so four-figure prices keep the column", () => {
    // `Intl.NumberFormat` would give `1,234.56` here and `1.234,56` to a reader
    // in another locale — two widths for one number, which is exactly what
    // `tabular-nums` was bought to prevent. See the module header.
    expect(formatPrice(1234.56)).toBe("1234.56");
  });
});

describe("formatChangePercent", () => {
  it.each([
    [0.836, "+0.84%"],
    [-2.51, "−2.51%"],
    [0, "0.00%"],
  ])("renders %s as %s", (percent, expected) => {
    expect(formatChangePercent(percent)).toBe(expected);
  });

  it("uses a real minus sign rather than a hyphen", () => {
    // A hyphen-minus is a different width from the digits around it, so a
    // column of negative figures stops aligning with the positive ones — which
    // undoes what `tabular-nums` is there for (Task 1.4.3 measured a 14.3px
    // spread). Asserted on the code point, because the two are hard to tell
    // apart by eye in a diff.
    expect(formatChangePercent(-1.5).codePointAt(0)).toBe(0x2212);
    expect(formatChangePercent(-1.5)).not.toContain("-");
  });

  // A move that rounds away carries no sign, because `+0.00%` claims a
  // direction the rounding discarded.
  it("drops the sign from a move that rounds to nothing", () => {
    expect(formatChangePercent(0.001)).toBe("0.00%");
    expect(formatChangePercent(-0.001)).toBe("0.00%");
  });
});

describe("directionOf", () => {
  it.each([
    [0.836, "positive"],
    [-2.51, "negative"],
    [0, "unchanged"],
  ])("calls %s %s", (percent, expected) => {
    expect(directionOf(percent)).toBe(expected);
  });

  // **The reason this is a function and not `percent > 0`.** By sign these are
  // a rise and a fall; rendered they are both `0.00%`. A `positive` here would
  // put an up arrow, a green tint and a figure saying nothing moved in the one
  // component built so its channels cannot disagree.
  it("agrees with the figure, not with the raw sign", () => {
    expect(directionOf(0.001)).toBe("unchanged");
    expect(directionOf(-0.001)).toBe("unchanged");
  });

  it("still calls a move that rounds to two places directional", () => {
    expect(directionOf(0.005)).toBe("positive");
    expect(directionOf(-0.005)).toBe("negative");
  });
});

describe("PRICE_DIRECTIONS", () => {
  // The vocabulary and the function that produces it now live in one file, so
  // this is checkable rather than a convention: every direction `directionOf`
  // can return is a member, and there is no fourth member nothing produces.
  it("is exactly what directionOf returns", () => {
    expect(new Set(PRICE_DIRECTIONS)).toEqual(
      new Set([directionOf(1), directionOf(-1), directionOf(0)]),
    );
  });
});
