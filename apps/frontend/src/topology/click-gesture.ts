/**
 * **When a press-and-release on the canvas is a CLICK rather than a pan** (Task
 * 6.4.2).
 *
 * The renderer's `pointerdown` handler started a pan unconditionally from Task
 * 6.2.3 until this task, with no movement threshold at all — which was correct
 * while a press could only ever mean *drag the market*, and is wrong the moment
 * a press can also mean *select this security*. The two gestures arrive through
 * exactly the same three events, so something has to tell them apart, and a
 * pointer that moved 60 px must not select whatever node it happened to finish
 * over.
 *
 * ## It is a pure function in its own module so that it is testable at all
 *
 * jsdom has no 2d context, so `mountCanvasTopology` throws there
 * (`MarketTopology.test.tsx`'s own note) and nothing below `pnpm e2e` can drive
 * the renderer's pointer handlers. A predicate over two numbers is the half of
 * this decision a unit test can hold, and the browser spec then exercises the
 * wiring rather than the arithmetic.
 *
 * ## Both bounds, not either
 *
 * **Distance** is the one that matters and is the one a reader produces: a pan
 * is tens of pixels. **Time** is the second clause because a press held still
 * for several seconds and released is not an act of selection either — it is a
 * reader who pressed, thought better of it, and let go; a drag of zero pixels
 * is indistinguishable from it by distance alone. Both must hold.
 */

/**
 * How far the pointer may travel between `pointerdown` and `pointerup` and
 * still count as a click, in **CSS pixels**.
 *
 * 4 rather than 0: a mouse button press on a real hand moves the pointer by a
 * pixel or two, and a threshold of zero would make selection fail
 * intermittently in a way that reads as the feature not working. It is well
 * inside the 8 px target radius `topologyTargetRadius` gives the smallest mark
 * at zoom 1, so a click that passes this bound hit-tests to the same node it
 * started on.
 */
export const TOPOLOGY_CLICK_MAX_TRAVEL_PX = 4;

/**
 * How long the press may last and still count as a click, in milliseconds.
 *
 * 400 — comfortably past an ordinary click (tens of milliseconds) and short of
 * the ~500 ms a press-and-hold reads as a deliberate hold. See the module
 * docblock for why there is a time bound at all.
 */
export const TOPOLOGY_CLICK_MAX_DURATION_MS = 400;

/** One press, measured. */
export interface TopologyPressGesture {
  /** How far the pointer travelled, in CSS pixels. */
  readonly travelPx: number;
  /** How long the press lasted, in milliseconds. */
  readonly elapsedMs: number;
}

/**
 * Whether this press was a click — see the module docblock.
 *
 * **Inclusive at both bounds**, so the constants above read as *this much is
 * still a click* rather than as a value nothing can reach. `NaN` on either
 * input answers `false`, which is the safe direction: an unmeasurable press
 * selects nothing rather than selecting whatever it finished over.
 */
export function isTopologyClick({
  travelPx,
  elapsedMs,
}: TopologyPressGesture): boolean {
  return (
    travelPx <= TOPOLOGY_CLICK_MAX_TRAVEL_PX &&
    elapsedMs <= TOPOLOGY_CLICK_MAX_DURATION_MS
  );
}
