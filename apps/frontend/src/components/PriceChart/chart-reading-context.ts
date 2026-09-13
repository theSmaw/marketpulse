import { createContext, useContext } from "react";

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
  readonly source: ReadingSource;
}

/** Nobody is pointing at either plot. */
export const NO_READING: ChartRead = { index: null, source: "pointer" };

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
