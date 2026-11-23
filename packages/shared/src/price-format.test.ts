import { describe, expect, it } from "vitest";

import {
  MINUS,
  formatChangePercent,
  formatCount,
  formatPrice,
  formatSignedCount,
  formatSignedPoints,
} from "./price-format.js";

// **The three that MOVED here on 2026-11-23 are covered by
// `apps/frontend/src/market/price-format.test.ts`**, which still imports them
// through that module's re-export — so their behaviour is asserted at exactly
// the call shape every component uses, and nothing about this move needed a
// second copy of those tests. What this file holds is the pair that is NEW
// (Task 7.3.1), plus the one property the move itself could break: that the
// re-exported names still resolve to functions with the same output.

describe("the formatters that moved, through this module directly", () => {
  it("spells a price at two decimals, with no grouping separator", () => {
    expect(formatPrice(1234.5678)).toBe("1234.57");
  });

  it("spells a percentage with its sign, and no sign at all for a rounded zero", () => {
    expect(formatChangePercent(0.84)).toBe("+0.84%");
    expect(formatChangePercent(-1.24)).toBe(`${MINUS}1.24%`);
    expect(formatChangePercent(0.001)).toBe("0.00%");
  });

  it("spells a signed count with no decimals", () => {
    expect(formatSignedCount(132)).toBe("+132");
    expect(formatSignedCount(-78)).toBe(`${MINUS}78`);
    expect(formatSignedCount(0)).toBe("0");
  });
});

describe("formatSignedPoints", () => {
  it("spells a difference between two percentages in POINTS, never as a percentage", () => {
    // A security down 4.2% against a sector down 6.0% is *ahead while
    // falling* — the excess is a difference in percentage points and this
    // product has said so in words since Story 5.1. The unit is in the
    // string so no surface has to supply it.
    expect(formatSignedPoints(3.1)).toBe("+3.10 pts");
    expect(formatSignedPoints(-1.24)).toBe(`${MINUS}1.24 pts`);
  });

  it("claims no direction for a difference that rounds to zero", () => {
    // `formatChangePercent`'s rule at a second input: a `+0.00` over two
    // moves the rounding made equal claims a direction the subtraction did
    // not find.
    expect(formatSignedPoints(0)).toBe("0.00 pts");
    expect(formatSignedPoints(0.001)).toBe("0.00 pts");
  });

  it("uses a real minus sign rather than a hyphen", () => {
    expect(formatSignedPoints(-3.1).startsWith(MINUS)).toBe(true);
    expect(formatSignedPoints(-3.1).startsWith("-")).toBe(false);
  });

  it("prints at the precision of its own operands and no finer", () => {
    // Two percentages at `PERCENT_DISPLAY_DECIMALS`; a difference printed
    // finer than its inputs is a precision the inputs cannot support.
    expect(formatSignedPoints(3.14159)).toBe("+3.14 pts");
  });
});

describe("formatCount", () => {
  it("groups thousands with the locale NAMED, so two machines agree", () => {
    expect(formatCount(4620)).toBe("4,620");
    expect(formatCount(0)).toBe("0");
    expect(formatCount(501)).toBe("501");
  });

  it("is the one figure in this product where a separator buys something", () => {
    // `formatPrice` refuses a separator deliberately — `1234.56` and
    // `1,234.56` are different widths in a right-aligned column. A sample
    // size is prose rather than a column, and `4620` reads as a year.
    expect(formatPrice(4620)).toBe("4620.00");
    expect(formatCount(4620)).toBe("4,620");
  });
});
