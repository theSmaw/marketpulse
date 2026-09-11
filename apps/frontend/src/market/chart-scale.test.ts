import { describe, expect, it } from "vitest";

import {
  clampToRange,
  linearScale,
  nearestSlot,
  scaleSlot,
  scaleValue,
  slotScale,
  unscaleSlot,
  unscaleValue,
} from "./chart-scale.js";

// The two scales, both directions, with no DOM anywhere (Task 2.12.3).
//
// **The round trips are the point of this file.** The task brief names the
// defect they exist to prevent: an inverse written later against a forward
// function written earlier is where an off-by-a-half-pixel lives, and by the
// time Task 2.12.6's crosshair calls `unscale*` the forward function will be on
// screen and correct-looking, which makes a disagreement invisible from either
// end.

describe("linearScale", () => {
  it("maps a domain across a range, both ways", () => {
    const scale = linearScale([100, 200], [0, 500]);

    expect(scaleValue(scale, 100)).toBe(0);
    expect(scaleValue(scale, 150)).toBe(250);
    expect(scaleValue(scale, 200)).toBe(500);

    expect(unscaleValue(scale, 0)).toBe(100);
    expect(unscaleValue(scale, 250)).toBe(150);
    expect(unscaleValue(scale, 500)).toBe(200);
  });

  it("handles the descending range a price axis actually uses", () => {
    // SVG's y grows downwards, so the domain's high is pixel 0 and its low is
    // the plot's height. This is the ordinary case, not a trick.
    const scale = linearScale([229.82, 234.6], [280, 0]);

    expect(scaleValue(scale, 234.6)).toBe(0);
    expect(scaleValue(scale, 229.82)).toBe(280);
    // The midpoint of a descending range is still the middle of the plot.
    expect(scaleValue(scale, (229.82 + 234.6) / 2)).toBeCloseTo(140, 10);
  });

  it("returns the value it was given, after a round trip", () => {
    const scale = linearScale([229.82, 234.6], [280, 0]);

    for (const value of [229.82, 230.1875, 232, 234.55, 234.6]) {
      expect(unscaleValue(scale, scaleValue(scale, value))).toBeCloseTo(
        value,
        10,
      );
    }
  });

  it("positions a value outside the domain outside the range", () => {
    // Deliberately not clamped: a mark above the domain belongs above the plot,
    // where the frame clips it. Clamping would pin it to the edge and tell the
    // reader the price went there.
    const scale = linearScale([100, 200], [0, 500]);
    expect(scaleValue(scale, 250)).toBe(750);
    expect(scaleValue(scale, 50)).toBe(-250);
  });

  it.each([
    ["a zero-height domain", [100, 100] as const],
    ["a reversed domain", [200, 100] as const],
    ["an infinite domain", [0, Number.POSITIVE_INFINITY] as const],
  ])("refuses %s rather than painting NaN", (_name, domain) => {
    // A NaN in an SVG path attribute draws *nothing*, so the symptom of this
    // arithmetic failing is an empty plot inside a correct frame.
    expect(() => linearScale(domain, [0, 500])).toThrow(RangeError);
  });

  it("refuses a range with no pixels in it", () => {
    // What an unmeasured element produces. Refusing turns a blank chart into an
    // error naming the input.
    expect(() => linearScale([100, 200], [0, 0])).toThrow(RangeError);
  });
});

describe("clampToRange", () => {
  it("holds a pixel inside a descending range", () => {
    const scale = linearScale([100, 200], [280, 0]);

    expect(clampToRange(scale, -40)).toBe(0);
    expect(clampToRange(scale, 400)).toBe(280);
    expect(clampToRange(scale, 140)).toBe(140);
  });
});

describe("slotScale", () => {
  it("puts the first slot at the start and the last at the end", () => {
    const scale = slotScale(30, [0, 963]);

    expect(scaleSlot(scale, 0)).toBe(0);
    expect(scaleSlot(scale, 29)).toBe(963);
  });

  it("takes a fractional slot, for an instant inside one", () => {
    // `CHARTING.md` §3's rule 1: an instant inside a bar is positioned
    // proportionally within that bar's slot.
    const scale = slotScale(3, [0, 100]);
    expect(scaleSlot(scale, 0.5)).toBe(25);
    expect(scaleSlot(scale, 1.5)).toBe(75);
  });

  it("returns the slot it was given, after a round trip", () => {
    const scale = slotScale(150, [0, 963]);

    for (const slot of [0, 1, 59, 60, 149]) {
      expect(unscaleSlot(scale, scaleSlot(scale, slot))).toBeCloseTo(slot, 10);
    }
  });

  it("places a lone slot at the start of the range", () => {
    // `i / (slots - 1)` is `0 / 0` at one slot, so the answer is chosen rather
    // than computed — and the start is what every other slot does: a slot marks
    // where its interval *begins*.
    const scale = slotScale(1, [0, 963]);

    expect(scaleSlot(scale, 0)).toBe(0);
    expect(unscaleSlot(scale, 700)).toBe(0);
    expect(nearestSlot(scale, 700)).toBe(0);
  });

  it("refuses an axis with no slots in it", () => {
    expect(() => slotScale(0, [0, 963])).toThrow(RangeError);
    expect(() => slotScale(2.5, [0, 963])).toThrow(RangeError);
  });
});

describe("nearestSlot", () => {
  const scale = slotScale(30, [0, 290]);

  it("rounds to the nearest whole slot", () => {
    expect(nearestSlot(scale, 0)).toBe(0);
    expect(nearestSlot(scale, 14)).toBe(1);
    expect(nearestSlot(scale, 16)).toBe(2);
    expect(nearestSlot(scale, 290)).toBe(29);
  });

  it("clamps a pointer dragged past either edge", () => {
    // The opposite of `scaleValue`'s rule, and deliberately: a crosshair beyond
    // the plot still means the nearest point, whereas a *mark* beyond the
    // domain belongs outside the frame.
    expect(nearestSlot(scale, -500)).toBe(0);
    expect(nearestSlot(scale, 5000)).toBe(29);
  });
});
