// **The half of the click/pan decision a unit test can reach** (Task 6.4.2).
//
// jsdom has no 2d context, so `mountCanvasTopology` throws there and nothing
// below `pnpm e2e` can drive the renderer's `pointerdown`/`pointerup` pair —
// `MarketTopology.test.tsx`'s own note at the top says why that is structural
// rather than an omission. What is checkable here is the **predicate**: a
// pure function over two numbers, which is the reason it is its own module.
//
// The browser spec then exercises the WIRING — a real drag across the canvas
// selecting neither the node it started on nor the one it ended over — and
// this file exercises the arithmetic. Neither substitutes for the other: a
// predicate that is right about every pair of numbers is still wrong if the
// renderer measures travel from the wrong point.

import { describe, expect, it } from "vitest";

import {
  TOPOLOGY_CLICK_MAX_DURATION_MS,
  TOPOLOGY_CLICK_MAX_TRAVEL_PX,
  isTopologyClick,
} from "./click-gesture.js";

describe("isTopologyClick", () => {
  it("accepts a press that did not move, which is what a click is", () => {
    expect(isTopologyClick({ travelPx: 0, elapsedMs: 40 })).toBe(true);
  });

  it("accepts the hand-tremor a real mouse press carries", () => {
    // The reason the threshold is not zero: a mouse button press moves the
    // pointer by a pixel or two, and a bound of zero would make selection fail
    // intermittently in a way that reads as the feature not working.
    expect(isTopologyClick({ travelPx: 2.5, elapsedMs: 90 })).toBe(true);
  });

  it("refuses a pan — the gesture this predicate exists to tell apart", () => {
    // A drag across a cluster. Done-when 2: a drag that ends over a node must
    // not select it.
    expect(isTopologyClick({ travelPx: 63, elapsedMs: 220 })).toBe(false);
  });

  it("refuses a press held still and released, which is not an act of selection", () => {
    // The clause distance alone cannot express: zero travel over four seconds
    // is indistinguishable from a click by distance, and is a reader who
    // pressed, thought better of it, and let go.
    expect(isTopologyClick({ travelPx: 0, elapsedMs: 4_000 })).toBe(false);
  });

  it("requires BOTH bounds, so neither one alone admits a gesture", () => {
    // Each of these satisfies exactly one clause. If the implementation ever
    // becomes an `||`, both of these flip and this is the test that says so.
    expect(isTopologyClick({ travelPx: 0, elapsedMs: 10_000 })).toBe(false);
    expect(isTopologyClick({ travelPx: 400, elapsedMs: 10 })).toBe(false);
  });

  it("is inclusive at both bounds, so each constant reads as still-a-click", () => {
    expect(
      isTopologyClick({
        travelPx: TOPOLOGY_CLICK_MAX_TRAVEL_PX,
        elapsedMs: TOPOLOGY_CLICK_MAX_DURATION_MS,
      }),
    ).toBe(true);

    // And a hair past either one is not.
    expect(
      isTopologyClick({
        travelPx: TOPOLOGY_CLICK_MAX_TRAVEL_PX + 0.01,
        elapsedMs: 10,
      }),
    ).toBe(false);
    expect(
      isTopologyClick({
        travelPx: 0,
        elapsedMs: TOPOLOGY_CLICK_MAX_DURATION_MS + 0.01,
      }),
    ).toBe(false);
  });

  it("answers false for an unmeasurable press rather than selecting whatever it finished over", () => {
    // `Math.hypot` over a `NaN` client coordinate, or a clock that moved
    // backwards. The safe direction is to select nothing.
    expect(isTopologyClick({ travelPx: Number.NaN, elapsedMs: 10 })).toBe(
      false,
    );
    expect(isTopologyClick({ travelPx: 0, elapsedMs: Number.NaN })).toBe(false);
  });

  it("keeps the travel bound well inside the smallest mark's own target radius", () => {
    // **A property rather than a figure**, and it is what makes the predicate
    // safe to hit-test at the UP position rather than the down one: a press
    // that passes this bound cannot have crossed out of the node it started
    // on. `topologyTargetRadius("equity", 1)` is 8 px — `hit-test.ts`'s own
    // table — so the bound has to stay comfortably under it.
    expect(TOPOLOGY_CLICK_MAX_TRAVEL_PX).toBeLessThan(8);
  });
});
