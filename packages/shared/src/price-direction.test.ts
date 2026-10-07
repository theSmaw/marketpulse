import { describe, expect, it } from "vitest";

import {
  PRICE_DIRECTIONS,
  directionOf,
  displayedPercent,
} from "./price-direction.js";

// Which bucket a move falls into, tested in the package both processes read.
//
// **The first three blocks arrived with the function** (Task 4.4.2), moved
// verbatim from `apps/frontend/src/market/price-format.test.ts`, which is the
// same discipline that file's own header records: *what they assert is the
// behaviour two shipped screens already depend on, and a rewrite at the moment
// of a move is how a move quietly becomes a change.* The fourth block is new,
// and is the one defect this task closed rather than carried.

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
  // component built so its channels cannot disagree — and, since Story 4.4, it
  // would put that security in the advancing count beside a row reading
  // `0.00%`.
  it("agrees with the figure, not with the raw sign", () => {
    expect(directionOf(0.001)).toBe("unchanged");
    expect(directionOf(-0.001)).toBe("unchanged");
  });

  it("still calls a move that rounds to two places directional", () => {
    expect(directionOf(0.005)).toBe("positive");
    expect(directionOf(-0.005)).toBe("negative");
  });

  // **The defect this task closed.** Until 2026-10-07 all three of these were
  // `"unchanged"`, by accident rather than by decision: `NaN > 0` and
  // `NaN < 0` are both false, so the final `return` caught them. On one row
  // that is nearly invisible; in a **count** it is the sentence *"518
  // unchanged, 0 advancing, 0 declining"* — a confident claim that the market
  // did not move, from figures that said nothing at all.
  it.each([Number.NaN, Infinity, -Infinity])(
    "refuses to give %s a direction",
    (percent) => {
      expect(directionOf(percent)).toBeUndefined();
      expect(directionOf(percent)).not.toBe("unchanged");
    },
  );

  // The guard is in front of the rounding and has to be: `displayedPercent`
  // hands a non-finite figure straight back, and both comparisons below it are
  // false.
  it("would round a non-finite figure to a non-finite figure", () => {
    expect(displayedPercent(Number.NaN)).toBeNaN();
    expect(displayedPercent(Infinity)).toBe(Infinity);
  });
});

describe("PRICE_DIRECTIONS", () => {
  // The vocabulary and the function that produces it live in one file, so this
  // is checkable rather than a convention: every direction `directionOf` can
  // *name* is a member, and there is no fourth member nothing produces.
  //
  // **`undefined` is deliberately not a member.** A non-finite figure has no
  // direction, and a fourth word for it would be a value every `Record` over
  // this type — the colour, the glyph and the spoken word in `PriceChange` —
  // would have to render.
  it("is exactly what directionOf returns", () => {
    expect(new Set(PRICE_DIRECTIONS)).toEqual(
      new Set([directionOf(1), directionOf(-1), directionOf(0)]),
    );
  });

  it("does not contain whatever a non-finite figure gets", () => {
    expect(PRICE_DIRECTIONS).not.toContain(directionOf(Number.NaN));
  });
});

describe("displayedPercent", () => {
  it.each([
    [0.836_4, 0.84],
    [-2.514_9, -2.51],
    [0.001, 0],
    [-0.001, -0],
  ])("rounds %s to %s", (percent, expected) => {
    expect(displayedPercent(percent)).toBe(expected);
  });

  // The one rounding, and the thing that made two copies of it a hazard rather
  // than a tidiness point: it is what `formatChangePercent` prints, what the
  // sector comparator refuses to swap on, and what `directionOf` classifies.
  it("is the precision the figure is shown to", () => {
    expect(displayedPercent(1.234_5)).toBe(Number((1.234_5).toFixed(2)));
  });
});
