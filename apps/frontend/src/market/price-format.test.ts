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

  // **The same rule reaching the only other input with no direction to
  // claim** (Task 4.4.2). `directionOf` answers `undefined` for a non-finite
  // figure, so no sign is spelled — `NaN%` is byte-identical to what this
  // function returned before the move, and `Infinity%` is the one output that
  // changed: it was `+Infinity%`. Neither is reachable from a surface, because
  // `changePercent` and `changeFromClose` both answer `null` rather than
  // dividing by a zero close; these are asserted so the shape is recorded
  // rather than discovered.
  it("spells a non-finite figure without claiming a sign", () => {
    expect(formatChangePercent(Number.NaN)).toBe("NaN%");
    expect(formatChangePercent(Infinity)).toBe("Infinity%");
    expect(formatChangePercent(-Infinity)).toBe("Infinity%");
  });
});

// **`directionOf` and `PRICE_DIRECTIONS` were tested here until 2026-10-07**
// (Task 4.4.2). Those two blocks moved, unedited, to
// `packages/shared/src/price-direction.test.ts` with the functions they are
// about — a test left behind by a move is a test of a re-export, which is what
// the block at the top of this file is for and all it claims.

// **The re-export is asserted rather than assumed** (Task 4.4.2). The
// direction left this module for `packages/shared/src/price-direction.ts` and
// is published from here so that no component's import changed; a re-export
// that silently stopped resolving would leave every assertion below green,
// because nothing in this file would notice the names were gone.
describe("the direction, re-exported", () => {
  it("is still reachable under the names this module published", () => {
    expect(PRICE_DIRECTIONS).toEqual(["positive", "negative", "unchanged"]);
    expect(directionOf(1)).toBe("positive");
  });

  // The behaviour itself is asserted beside the function, in
  // `packages/shared/src/price-direction.test.ts`. Repeating it here would be
  // a second copy of a rule that has just been given one home.
  it("is the shared one and not a local copy", () => {
    expect(directionOf(Number.NaN)).toBeUndefined();
  });
});
