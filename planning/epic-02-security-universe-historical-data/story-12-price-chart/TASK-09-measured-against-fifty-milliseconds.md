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

---

## Amended 2026-09-11 by Task 2.12.1 — you now have predictions, and a prediction is what makes a surprise legible

`CHARTING.md` §0 and §1 measured the chosen approach in real Chromium before it
was chosen. **This task's job is now partly to falsify those figures against the
real component**, which is more useful than measuring in a vacuum — a spike
drawing one `<path>` is not a chart with axes, gridlines, a crosshair and React
around it.

What 2.12.1 predicts, so a disagreement is visible rather than absorbed:

| Prediction (spike, 2026-09-11)         |                         Figure |
| -------------------------------------- | -----------------------------: |
| Bundle cost of the decision, gzipped   | **+279 B**, ~0.2% of 134,210 B |
| Cold first paint at 9,750 bars         |                    **26.3 ms** |
| Longest main-thread task at 9,750 bars |            **none over 50 ms** |
| DOM nodes in the plot                  |   **~11**, flat in point count |

**So the expected outcome of this task is that it finds nothing** — and that is
precisely why the Work section's warning about a break that does not go red
matters more here than usual. A measurement that confirms a prediction and a
measurement that was never actually taken produce the same report. **Verify the
instrument by breaking the thing on purpose** — draw one element per bar and
confirm the trace goes over 50 ms, which the spike measured at 9,750 SVG candle
groups as 73.6 ms cold and up to **296 ms** observed.

Two refinements to what to point it at:

- **The bundle figure is a prediction about a spike, not about the component.**
  +279 B was one `<path>` and a scale. The real component carries axes, ticks,
  formatting, a crosshair and states. If it comes in at several kilobytes that is
  not a falsification of §1 — the comparison that decided §1 was against
  Recharts' **+94,809 B** — but say which number moved and why.
- **Continuous pointer movement is still the case most likely to break the
  budget**, and it is the one the spike did **not** measure at all. The spike drew
  once; §28's word is _routine_. This is the genuinely unmeasured surface and it
  should get the most attention.

---

## Amended 2026-09-11 by Task 2.12.2 — one prediction in the table above is falsified in **shape**, and the bundle figure grew a second half

Neither finding threatens §1 or this task's expected outcome. Both are recorded
because an unnoticed drift in a prediction is what makes a confirming measurement
indistinguishable from one that was never taken.

### "~11 DOM nodes, flat in point count" — the second clause is the one that survives

2.12.2's instrument puts roughly **two dozen** elements in the plot: an uncovered
rect, the wash path, the gridlines, the session seams, the reference rule, the
series path, the coverage edge, the axis rule, the crosshair, its disc, and the
axis labels.

**And the count is not flat.** The seams scale with the number of **sessions** —
four at the default window, twenty-four at the 9,750-bar cap — and the gridline
and label counts step with the region's width. What _is_ flat in point count, and
is the thing §1's constraint was actually about, is that **nothing scales with the
bar count**: there is still no per-bar element. Re-take the figure and state it as
"O(sessions + breakpoint), O(1) in bars" rather than as a number, because a number
here was always going to drift.

Two dozen elements is not a performance finding. It is a correction to a figure
this task exists to measure against.

### The bundle prediction is now half CSS, and the CSS half is not in `dist/assets/*.js`

+279 B was one `<path>` and a scale. The component will carry axes, ticks,
formatting, a crosshair and states — **and 2.12.2 added eighteen custom
properties plus twelve entries in `TOKEN_NAMES`**, which land in the CSS bundle
and in the JS bundle respectively. Measure both and say which moved. A report
that quotes only the JS delta is measuring the smaller half of what this story
added.

### One thing worth breaking on purpose, beyond the one already named

The Work section says to verify the instrument by drawing one element per bar and
confirming the trace goes over 50 ms. There is now a cheaper and more relevant
break available: **make the seam count scale with bars instead of sessions.** It
is a one-character change to a loop bound, it produces 9,750 dashed verticals at
the cap, and it is much closer to the mistake somebody would actually make than
9,750 candle groups are.

---

## Amended 2026-09-11 by Task 2.12.3 — a new client-side cost surface, and a third component in the bundle delta

Neither of these changes what this task expects to find. Both are things it will
otherwise not point at.

### The trading-calendar walk is now on the client too

The Notes above already flag the daily series and quote Task 2.9.9: a `1d` series
over the whole stored depth is dominated by a **20.6 ms trading-calendar walk on
the server**, paid on every cache hit, and the repair is a `packages/shared`
change to raise rather than absorb.

**That walk now has a second caller, in the browser, on the main thread.**
`timeAxis` builds the x-domain by calling `marketSessionsBetween` over the
requested window, which steps **day by day** through the calendar — the same
algorithm the server pays for, run inside a render.

It is nowhere near a problem at this story's windows: the default is five
sessions over seven calendar days, and even the `1m` cap of 10,000 bars is about
twenty-five sessions. It becomes interesting at exactly the point the Notes
already name — **a window control offering "1 year" or "max"**, which is Story
2.13's — where a `1d` axis walks hundreds or thousands of calendar days.

What this task owes, and it is cheap:

- **Time `timeAxis` at the cap**, separately from the paint, so the figure exists
  before 2.13 needs it. It is a pure function with no DOM in it, so this is the
  one part of the chart measurable without a browser.
- **Check whether it runs once per render or once per request.** A calendar walk
  repeated on every pointer move is the shape of defect §28's word _routine_ is
  about, and the repair — memoise on the request identity — belongs in
  [Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md)'s component rather
  than in the arithmetic.
- **If it is material, raise it rather than absorb it**, the same way 2.9.9 did.
  The two callers now share one algorithm, so a `packages/shared` repair would
  pay twice — which strengthens the case that was already made once.

### The bundle delta has three parts, not two

2.12.2's amendment says to measure both halves — the JS and the eighteen custom
properties in CSS. There is now a third: **five arithmetic modules in
`src/market/`**, which are plain TypeScript with no dependency behind them and
which the tree-shaker cannot drop, because the chart imports all of them.

Say which of the three moved. A report attributing the whole delta to "the
charting decision" is measuring `CHARTING.md` §1's prediction of **+279 B for one
`<path>` and a scale** against something that is not that — the comparison that
decided §1 was against Recharts' **+94,809 B**, and the arithmetic this story
hand-built is precisely the part a library would have supplied.

### One more instrument break worth having

The Work section asks for a break that goes red, and 2.12.2 added a cheaper one.
A third, cheaper still and closer to a real mistake: **build the axis from
`series.bars` instead of from `coverage.requested`**. It is a one-argument change,
it produces a `partial` chart that fills its frame and looks complete, and
`market/chart-time-axis.test.ts` should go red on it — _comes from the requested
window and not from the bars_. Confirm it does, because that test is the only
thing standing between §6.2 and a chart that lies convincingly.
