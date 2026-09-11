# Task 2.12.9 — Measured against fifty milliseconds, at the largest series this epic serves

**Status:** Not started
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.7

## Objective

Measure what this chart costs to draw, against PRODUCT_SPEC.md §28's **no
routine main-thread task over 50 ms**, at the largest series this API can serve
— and record the bundle cost of the decision in the shape Story 1.5 recorded the
router's, which is acceptance criterion 7.

## What the user can see when this lands

**Nothing new, unless the measurement finds something** — in which case they see
a chart that stays responsive at a window that used to stall it. Report it that
way: the visible outcome of a measurement task is usually the absence of a
defect, and this repository says "nothing visible" plainly rather than dressing
it up.

## Work

- **You already know where the budget does not go.** Story 2.10 measured a
  cap-sized series at 10,000 bars, 2.43 MB of parsed heap and **4.6–8.7 ms** to
  parse; Task 2.9.9 measured the largest body parsing in **2.8 ms**. `JSON.parse`
  is not the problem. **Whatever breaks the budget is in the renderer**, which is
  what this task is pointed at.

- **Measure the real thing, in a real browser.** A performance trace over a
  first paint at the cap, over a symbol change, and over continuous pointer
  movement across the plot — that last one is the case most likely to produce a
  _routine_ long task, which is what §28's word means. jsdom cannot see any of
  this.

- **Take today's figures rather than citing these.** `CLAUDE.md`'s standing
  rule, and it applies with force to a figure taken on a different machine
  against a different renderer.

- **Record the bundle cost in Story 1.5's shape**: what the decision added,
  gzipped, as a share of the bundle, measured on `dist/` — and against the
  figure Task 2.12.1 predicted, because a prediction that was wrong is the
  interesting finding.

- **If something exceeds the budget**, the repair belongs here and its
  alternatives belong in `CHARTING.md`: fewer marks, a different mark, canvas
  instead of DOM, or work moved off the main thread — §28 names Web Workers
  where beneficial. Do not report a repair you did not measure after.

- **Two things to check because they are cheap and silent.** That the recorded
  response bodies in `apps/frontend/src/fixtures/` still do not reach the
  shipped bundle — `CLAUDE.md` names the two greps, and this story imports those
  fixtures into stories and tests more heavily than any before it. And that a
  `break` in whatever performance assertion you add actually goes red, because a
  break that does not go red is equally evidence the break did not land.

## Done when

- A first paint at the cap-sized series is traced and the longest main-thread
  task is recorded, with the machine and browser it was taken on
- Continuous pointer movement over the plot is traced and recorded
- The bundle cost is measured on `dist/` and recorded against 2.12.1's
  prediction
- Anything over 50 ms is repaired and re-measured, or recorded as accepted with
  the argument and a reversal trigger
- The fixture-leak greps find nothing
- `pnpm verify` passes

## Notes

The trap in a task like this one is measuring the thing that is easy to measure.
A first paint is easy; the cost that will actually be felt is a redraw while a
person is moving a pointer, and it is the one §28's "routine" is about.

The other trap is the daily series. Task 2.9.9 recorded that a `1d` series over
the whole stored depth is dominated by a **20.6 ms trading-calendar walk on the
server**, paid on every cache hit, and that the repair is a `packages/shared`
change with its own argument — **raise it rather than absorb it**. It only
becomes this product's problem when a window control offers "1 year" or "max",
which is Story 2.13's.
