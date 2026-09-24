# Task 3.9.5 — The volume chart, which must move with it

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.2

## Objective

**Two plots, one axis, one reading.** A live edge that reached the price chart
and not the volume chart would be a visible defect and an accessibility one —
the two share a time axis and answer one reading from one crosshair, and a
reader who walks the axis would find the two disagreeing about where the session
ends.

## What the user can see when this lands

**The volume chart extends with the price chart**, on the same axis, with the
last column arriving at the same moment as the last point.

## Why this is its own task rather than a line in 3.9.2

Because the axis is **shared state neither plot owns**, and that is the exact
condition ADR 0023 named as the reversal trigger for having no state library:
_the first piece of state two features must agree about that neither owns._ It
has not fired yet — the window is in the URL and both plots read it — and a
growing edge is the first thing that changes the axis' **extent** from something
derived from a request into something derived from data that keeps arriving.
Evaluate the trigger in writing here, whichever way it goes.

Note also `CHARTING.md`'s coverage rule, which is about to do real work for the
second time: _a mark derived from the window runs the full frame while a mark
derived from the bars stops at the coverage edge._ A live edge **is** the
coverage edge moving.

## Work

- The volume plot extends from the same merged series, without a second merge —
  one function, two readers
- The shared axis recomputed once per burst rather than once per plot
- ADR 0023's trigger evaluated in writing: fired or not, and why
- A browser assertion that both plots end at the same instant after a bar lands
- `pnpm probe` at four viewports if either plot's shape moves

## Done when

1. Both plots extend together, asserted in a browser
2. The axis is computed once and the trigger is evaluated in writing
3. `pnpm verify` passes
