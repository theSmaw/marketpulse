import { createContext, useContext } from "react";

import type { ChartPoint } from "./chart-geometry.js";

// **The read position, once, for every plot on the axis** (Task 2.13.5).
//
// `ChartAxis` owns two pieces of state and hands them out through **two
// contexts**. That is the whole of the risk in this task, and it is invisible:
// a read position added to `ChartAxisValue` would be handed to every
// `useChartAxis()` caller, and **both frame owners are callers**. A pointer
// move would then re-render `PriceChart` and `VolumeChart` on every mouse
// event — rebuilding a 1,950-point path string and a 726-stem silhouette to
// move one vertical rule. The page would look perfect, and `CLAUDE.md` records
// the same regression at **17× the CPU on the pointer path with no long task at
// all**, which is to say invisible to `PRODUCT_SPEC.md` §28's own criterion.
//
// So the consumers of this context are the two reading overlays and nothing
// else, and `PriceChart.test.tsx`'s zero-recomputation guard is what checks it
// — by counting all three frame builders while both plots are on screen, rather
// than by anybody remembering the rule.
//
// ## Why the position is an index rather than a slot or a bar
//
// Both plots place their bars with the same `placeBars(axis, bars)` on the same
// bars, so the `readings` arrays are the same bars in the same order: **one
// index addresses one bar in both**. A slot would have to be resolved to a bar
// twice, by two components, with two chances to resolve it differently at the
// edges; a `Bar` would be an object identity travelling through a context, and
// a plot that had re-derived its bars would hold one that matched nothing.
//
// Each overlay still reads it through a bounds check, because `readings` is
// rebuilt whenever the window or the box changes and an index held across that
// is a stale position into a new array.

/** Where a reading came from, which decides whether it is spoken. */
export type ReadingSource = "pointer" | "keyboard";

/** Which bar is being read, and how it was reached. */
export interface ChartRead {
  /** An index into either plot's `readings`, or `null` for no reading. */
  readonly index: number | null;

  /**
   * The market instant of the bar that index addressed, in epoch milliseconds,
   * or `null` for no reading.
   *
   * **Added by Task 2.13.7, and it is what survives a window change.** The
   * index alone does not: both `readings` arrays are rebuilt when the window
   * moves, and index 300 of five sessions of minutes and index 300 of a year of
   * sessions are not adjacent facts — they are different years. See
   * {@link resolveRead} for what is done with it and why clearing was declined.
   *
   * A number rather than a `Date`, for `chart-geometry.ts`'s reason and one
   * more: this value is compared on every render, and two `Date`s are two
   * objects — `===` on them asks whether they are the same object rather than
   * the same moment, which is the comparison that would make the fast path
   * never hit.
   */
  readonly at: number | null;

  readonly source: ReadingSource;
}

/** Nobody is pointing at either plot. */
export const NO_READING: ChartRead = {
  index: null,
  at: null,
  source: "pointer",
};

/**
 * Where a held reading lands in the bars that are on screen **now**.
 *
 * ## The default this overrides, which is not one of the two obvious options
 *
 * A window change replaces the series, rebuilds both `readings` arrays and does
 * not touch the read position. So without this function the built behaviour is:
 * a **shorter** new window renders no reading, because the index is out of
 * range; a new window **as long or longer** renders a reading of a different
 * bar, silently and plausibly. The crosshair lands somewhere real, the strips
 * state a real instant and a real volume, and nothing is wrong on screen except
 * the answer.
 *
 * It has not been seen because both input paths clear the reading on the way to
 * the control — a pointer travelling upward fires `onPointerLeave`, and a
 * keyboard user tabbing to it blurs the plot. That is **a coincidence of
 * layout, and a coincidence of layout is not a decision**: Epic 11's
 * `setTimeWindow` changes the window with nobody touching anything, and a rapid
 * sequence of presses lands a second change while the first answer is in
 * flight.
 *
 * ## What is decided: re-anchor by instant, clear only outside
 *
 * The bar's instant is kept and the **nearest placed bar** in the new window is
 * found; a reading whose instant falls outside the new window is cleared. The
 * cheap alternative — clear on every change — was declined because **four of
 * the five windows overlap in time**, so the instant a reader was looking at is
 * usually still in the new picture, and throwing it away answers a question
 * nobody asked. Crossing from `1m` to `1d` re-anchors to the *session*
 * containing the minute, which is the same day at the granularity the new
 * window has.
 *
 * Nothing here touches focus, which is the other half of the decision: a
 * reading cleared by a window change leaves focus exactly where a reading
 * cleared by `Escape` does.
 *
 * ## Why it returns an index rather than a point
 *
 * The keyboard steps from wherever the reading actually **is**, so the caller
 * needs the resolved position and not only the bar at it. Handing back a point
 * would leave `ChartReading` stepping from a stale index on the first press
 * after a change.
 *
 * Both overlays call this rather than one of them resolving and publishing,
 * because a write during render is the shape the React Compiler's `refs` rule
 * exists to refuse — and the two cannot disagree: `readings` is
 * `placeBars(axis, bars)` on the same bars in both, so this is the same
 * function over the same input twice.
 */
export function resolveRead(
  readings: readonly ChartPoint[],
  read: ChartRead,
): number | null {
  if (read.index === null || read.at === null) return null;

  // The fast path, and the one that runs on every pointer move: the index still
  // addresses the bar it was set for. No search, no allocation.
  if (readings[read.index]?.bar.startsAt.getTime() === read.at) {
    return read.index;
  }

  return nearestInstant(readings, read.at);
}

/**
 * The nearest bar to one instant, or `null` when the instant is outside the
 * bars altogether.
 *
 * The instant-space sibling of `nearestPlaced`, which does the same search in
 * slot space. They are two functions rather than one because the keys are two
 * different things — a slot is an axis position and an instant is a market
 * moment — and a generic comparator would have to be handed one of them by a
 * caller that could hand it the other.
 *
 * **Outside is `null` rather than the first or last bar**, and that is the half
 * of the decision that keeps it honest: clamping would answer *1Y → 1D* with
 * the earliest bar of a single session, which is a reading of a bar the reader
 * never asked about, presented as the one they were looking at.
 */
function nearestInstant(
  readings: readonly ChartPoint[],
  at: number,
): number | null {
  const first = readings[0]?.bar.startsAt.getTime();
  const last = readings.at(-1)?.bar.startsAt.getTime();
  if (first === undefined || last === undefined) return null;
  if (at < first || at > last) return null;

  let low = 0;
  let high = readings.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    // `?? Infinity` is unreachable — `middle` is inside the array — and is what
    // `noUncheckedIndexedAccess` costs. A comparison that cannot pick a wrong
    // side rather than a non-null assertion, which is `nearestPlaced`'s idiom.
    if ((readings[middle]?.bar.startsAt.getTime() ?? Infinity) < at) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const here = readings[low]?.bar.startsAt.getTime();
  const before = readings[low - 1]?.bar.startsAt.getTime();
  if (here === undefined) return null;
  if (before === undefined) return low;

  return at - before <= here - at ? low - 1 : low;
}

export interface ChartReadingValue {
  readonly read: ChartRead;
  readonly setRead: (next: ChartRead) => void;
}

const ChartReadingContext = createContext<ChartReadingValue | null>(null);

export const ChartReadingProvider = ChartReadingContext.Provider;

/**
 * The shared read position, from the nearest `ChartAxis`.
 *
 * **Throws outside one**, for `useChartAxis`'s reason: a fallback to private
 * state is two plots that each answer a pointer and neither of which knows what
 * the other is pointing at — two crosshairs that agree at every pixel a person
 * has not yet moved to.
 */
export function useChartReading(): ChartReadingValue {
  const value = useContext(ChartReadingContext);

  if (value === null) {
    throw new Error(
      "A chart reading must be rendered inside a <ChartAxis>, which owns the " +
        "one read position both plots answer.",
    );
  }

  return value;
}
