# Task 2.13.9 — Measured: per-bar fills, the window change, and fifty milliseconds

**Status:** Not started
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.8

## Objective

Trace what this story added against `PRODUCT_SPEC.md` §28 — **no routine
main-thread task over 50 ms** — in real Chromium, and record the figures where the
next story reads them.

Task 2.12.9 is the precedent and it found nothing wrong with the chart and something
wrong with **this story's window**. This story has three candidates of its own, and
all three are things §28's own criterion may not be able to see:

1. **Volume's marks are the first on this axis that are per bar.** One element per bar
   at the cap was measured at **9,790 plot elements and five main-thread tasks of
   137–254 ms**, and at the default window at **no long task at all** — which is
   exactly why the guard in `pnpm test` asserts a shape and not a duration.
2. **A window change is the first interaction in this product that replaces a whole
   dataset**, and the widest window it offers is the one 2.12.9 measured the calendar
   walk against.
3. **The memoisation landed in `packages/shared`** and a repair reported rather than
   re-measured is the thing `CHARTING.md` §0 exists to refuse.

## What the user can see when this lands

**Nothing, unless it finds something** — in which case what it finds is either fixed
here or raised with a named owner and a condition, the way the universe table's
50–66 ms task was.

## Work

- **Re-take the calendar-walk table after the repair**, in the same method as 2.12.9
  — pure function, Node 24, 200 iterations — and put the new column beside the old
  one rather than replacing it. The old figures are: **0.202 / 0.932 / 0.849 / 8.762
  / 23.051 ms** per call at 5, 25, ~24, 253 and 672 sessions, doubled per render.
  A figure that has moved looks exactly like a figure that was mis-recorded, so
  state the method both were taken with.
- **Measure the server's half too.** The same walk costs **20.6 ms** in the cap check
  on every request (`MARKET-DATA-API.md` §12.4). The repair was justified on paying
  three callers; measure that it paid all three, or say which it did not.
- **Attribute from both ends.** 2.12.9's method is the one to copy and it is what made
  its conclusion trustworthy: the long task was found **with no chart at all** and
  **gone with a trimmed universe while a 9,750-bar chart was still drawn**. Do the
  same for volume — the page with the volume plot removed, and the volume plot at the
  cap with the universe trimmed.
- **Measure the window change as an interaction**, not as a load: CPU on the change,
  whether any task crosses 50 ms, and what the widest offered window costs cold. Then
  measure a **rapid sequence** of changes, which is the pattern 2.13.7 exercised and
  nothing has timed.
- **And the pointer path, at the cap, with two plots.** 2.12.6's structural repair
  costs **17× the CPU on the pointer path** when undone and produces **no long task
  at all**, so §28 cannot see it; `PriceChart.test.tsx`'s zero-recomputation test is
  the only instrument. Confirm it still is, with two plots on the frame.
- **Add no wall-clock assertion to `pnpm test`.** A timing gate there measures the
  runner. What goes in is a **shape** guard: element counts flat in the bar count,
  with evidence the inputs differed, break-verified by actually drawing one element
  per bar and watching it go red.
- **Re-take the bundle.** `CHARTING.md` §16.6 records the hand-built chart at
  **6,552 B gzipped** against the rejected library's **+94,809 B**, and the original
  prediction was falsified by 21× without falsifying the decision. Say what volume,
  the control and the formatter added.
- **Say what CI cannot measure.** CI's store has 518 securities and **zero bars**, so
  any figure taken there is a duration on a shared runner. This is why the browser
  suite asserts counts and the timings are prose — and why the prose has a date and a
  machine in it.
- **And do not absorb what is not this story's.** The security page's **50–66 ms**
  cold-load task is the 518-row universe table, not the chart; it is raised in
  `SEARCH-AND-SELECTION.md` §10 with three candidate repairs and owed an answer at
  Story 2.14's close. Re-take it, because this story adds a control and a plot to the
  same page, and report it **separately** rather than folding it into a new number.

## Done when

- The calendar-walk table is re-taken with the method stated, beside the old figures,
  for all three callers
- Volume's cost is attributed from both ends, at the default window and at the cap
- A window change and a rapid sequence of them are timed, with the widest window's
  cold cost recorded
- The zero-recomputation guard is confirmed live with two plots, and the element-count
  guard is break-verified
- The bundle delta for this story is recorded
- The universe table's long task is re-taken and reported separately
- Anything over 50 ms is either repaired here or raised with a condition and a named
  owner
- `pnpm verify` passes, with no timing assertion added to it

## Notes

The fence is repairing what the measurement merely reveals. 2.12.9 measured and
**raised** rather than absorbing, which is why `SEARCH-AND-SELECTION.md` §10 exists;
a measurement task that turns into an optimisation task stops being a measurement
task and its figures stop being comparable to the ones before it.

The trap is the warm floor. §0.1 of `CHARTING.md` records how these figures are
taken; a cold first run and a warm tenth are different measurements and saying which
one you have is most of the value.
