# Task 2.12.9 — Measured against fifty milliseconds, at the largest series this epic serves

**Status:** **Complete — 2026-09-12.**
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

---

## Amended 2026-09-12 by Task 2.12.4 — one question in the amendments above is answered, and the prediction table needs a third correction

### "Does the calendar walk run once per render or once per request?" — **once per render**

2.12.3's amendment asked 2.12.4 to check this and said the repair, if needed,
belonged in that component. **It is per render and 2.12.4 did not take the
repair.** `PriceChart` calls `chartFrame(...)` in its render body with no
`useMemo`, and `chartFrame` calls `timeAxis`, which steps day by day through the
trading calendar.

**Two things make that a measured fact rather than an inference**, and the first
is worth knowing generally:

- **The React Compiler is not installed.** `apps/frontend/vite.config.ts` records
  that all three of `@vitejs/plugin-react`'s transformer peers — including
  `babel-plugin-react-compiler` — are optional and none is installed. So the
  compiler's _rules_ are linted and its _auto-memoisation is absent_. Any
  reasoning anywhere in this story that assumed a render-body computation was
  memoised for free is wrong.
- **Nothing re-renders the chart yet.** Its only state is the measured box behind
  an equality guard, so today `chartFrame` runs on mount, on resize and on a view
  change. That is why it is not a defect at 2.12.4 and is why this task would
  measure nothing if it measured today.

**The repair has moved to
[Task 2.12.6](TASK-06-reading-a-point-crosshair-hover-and-keyboard.md)**, which is
the task that introduces a render per pointer move — and it is amended there with
the two ways to take it. What this task owes is unchanged and now has a target:
**trace continuous pointer movement after 2.12.6 lands**, which is still the
genuinely unmeasured surface and is now also the one with a known unmemoised
recomputation behind it.

### The prediction table, corrected a third time

| Prediction (2026-09-11 spike)    | 2026-09-11 correction   | What 2.12.4 actually shipped                                      |
| -------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| DOM nodes in the plot: ~11, flat | "roughly two dozen"     | See below — **fewer than two dozen, and two of them are not SVG** |
| Bundle cost: +279 B gzipped      | + CSS half, + 5 modules | Unmeasured; now measurable against a real component               |

**Two of the elements 2.12.2's correction listed are not in the drawing at all.**
The **axis rule** is a CSS `border-bottom` on the plot element and the **plot's
ground** is the panel's own surface — neither is an SVG node. The uncovered rect,
the wash path, the coverage edge, the crosshair and its disc do not exist yet
(2.12.5, 2.12.6, 2.12.7). What is in the plot today is: gridlines, session seams,
and one `<path>`.

So **state the figure as a shape rather than a number**, which 2.12.2's amendment
already recommended and which this confirms: `O(sessions + breakpoint)`, `O(1)` in
bars. The seam count scales with **sessions** — four at the default window,
about twenty-four at the `1m` cap — and nothing scales with the bar count. That
clause is §1's constraint and it is intact.

### Two instrument breaks are now cheaper than the amendments above describe

- **"Build the axis from `series.bars` instead of `coverage.requested`"** —
  2.12.3's suggested break. It is now held by **two** tests rather than one:
  `market/chart-time-axis.test.ts` as recorded, and
  `components/PriceChart/chart-geometry.test.ts`'s _stops the line short when the
  shortfall is made of trading minutes_, which asserts a pixel rather than an
  axis. Break it and confirm **both** go red; a break that reddens only the
  arithmetic has not proved the renderer is wired to it.
- **A new one, closer to a real mistake than either.** `chart-geometry.ts`
  answers a zero-sized plot box with an empty frame rather than a throw, because
  `linearScale` refuses a zero-width range on purpose. **Remove that guard** and
  the chart throws on its own first frame — before `ResizeObserver` has reported —
  taking the region's error boundary with it. It is one `if`, it is invisible to
  every unit test that does not stub a measurement, and it is exactly the kind of
  line a later reader deletes as redundant.

### One thing that got cheaper to measure

`timeAxis` is called from `chart-geometry.ts`, which is **pure and has no DOM in
it**. Timing it at the cap needs no browser and no component — which is what the
2.12.3 amendment asked for, and it is now a two-line test rather than a trace.

---

## Amended 2026-09-12 by Task 2.12.5 — a fixture at the real density now exists, the greps are three, and the instrument-break warning has a proven instance

### There is a recorded body at the default window's density, and it changes what "measure the real thing" costs

The Work section says to measure at the largest series this API serves. That is
still the **10,000-bar cap** and nothing here discharges it. What changed is the
step below it: `apps/frontend/src/fixtures/bar-series/dense.json` holds **1,950
real bars over five sessions, `loaded`** — the density the product actually opens
at, 0.47 px per bar at the measured 923 px region — and it did not exist before,
because no recorded body had more than 150.

So the measurement has a floor and a ceiling rather than only a ceiling: **the
default window is the `routine` case** in `PRODUCT_SPEC.md` §28's sense, and the
cap is the worst case. A report that measures only the cap has measured the case
almost nobody is in.

It also makes `timeAxis` timeable without constructing anything, which 2.12.3's
amendment asked for: the fixture carries a real five-session window, and the cap
version is the same call with a wider range.

### The renderer builds a second 1,950-point string in JavaScript and hands the DOM one copy of it

> **Corrected hours later on 2026-09-12, by the wash split.** This section read
> _"the largest string the renderer builds roughly doubled &mdash; the renderer now
> hands the DOM two paths of 1,950 points instead of one"_. **The DOM half is
> wrong**, and it would have sent this task looking for a cost that is not there.

2.12.5 added the directional area, and it is **the close line's own `d` with two
segments and a close appended** — deliberately, rather than a second walk over the
bars. Since the split it is defined **once** in `<defs>` and drawn through two
clipped `<use>` elements, so:

- **JavaScript** builds a second 1,950-point string per call to `chartFrame`,
  which is in the render body and unmemoised (2.12.6 owns that repair).
- **The DOM** parses that string **once**, however many times it is drawn.

So the thing to measure is a **string build**, not a second parse. It is still the
one part of this chart whose cost is genuinely linear in the bar count, and the
obvious "optimisation" — deriving the area from the bars in its own loop, or
splitting it into two geometrically-clamped paths — would make it worse rather
than better while looking like a tidy-up.

**And there is a new cost shape worth a look**, because it is not a string at all:
a `<use>` instantiates a shadow tree and a `clipPath` is a rasterisation step. Two
of each, constant in bar count — but clipping a 1,950-point filled path twice is
not obviously free, and no figure in this repository covers it. If anything in the
paint phase surprises this task, that is the first place to look.

### The prediction table, corrected a fourth time

| Row                              | Status                                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOM nodes in the plot: ~11, flat | Today: gridlines, seams, **two `<path>`s — one in `<defs>` — two `<use>`, two `<clipPath>`/`<rect>` pairs**, and the reference rule. 2.12.6 adds two, 2.12.7 adds two |
| Shape                            | **Unmoved, and it is the clause that matters**: `O(sessions + breakpoint)`, `O(1)` in bars                                                                            |
| Bundle cost: +279 B gzipped      | Still unmeasured. 2.12.5 added no token, no module and no dependency — two CSS rules and one function — so it is small                                                |

### The fixture-leak greps are **three**, not two

The Work section says _"`CLAUDE.md` names the two greps"_. It names three, and the
new one is the largest thing on the list:

```
grep -o "2026-09-04T13:3[0-9]"  apps/frontend/dist/assets/*.js   # bar-series bodies
grep -o "Agilent Technologies"  apps/frontend/dist/assets/*.js   # the recorded universe, 190,736 B
grep -o "2026-08-31T13:3[0-9]"  apps/frontend/dist/assets/*.js   # dense.json, 221,603 B
```

All three found nothing on 2026-09-12. Re-take them rather than citing this line —
and note the Work section's own reasoning now applies harder than when it was
written: this story imports fixtures into stories and tests more heavily than any
before it, and one of them is now **222 KB**.

### The instrument-break warning is no longer hypothetical, and the example is worth reading

The Work section asks that _"a `break` in whatever performance assertion you add
actually goes red, because a break that does not go red is equally evidence the
break did not land."_ The 2.12.1 amendment makes the same point about a confirming
measurement being indistinguishable from one never taken.

**2.12.5 produced a live instance of exactly that, in a correctness test rather
than a performance one.** A browser spec asserting the directional wash was
painted stayed **green with the ink class deleted**, because SVG's initial `fill`
is black — so the assertion "it is filled with some colour" was true of the broken
chart too. It was rewritten to read three channels, and _that_ version was verified
red by restoring the break.

The transferable part, and it is aimed squarely at this task: **a break that is
loud in the wrong dimension passes a test looking in the right one.** For a
performance assertion the analogue is a break that costs memory rather than main
thread, or that moves work into a layer the trace does not cover. Pick the break
so that it fails the specific thing being asserted, not merely so that it is a
break.

### One suggested break is now cheaper than the amendments above describe

2.12.3's suggestion — build the axis from `series.bars` instead of
`coverage.requested` — is held by **three** tests now rather than two.
`chart-geometry.test.ts` gained _keeps the rule inside the frame at the default
window's density_, which runs against `dense.json` and would move with the domain.
Confirm all three go red; a break that reddens only the arithmetic has not proved
the renderer is wired to it.

### One more instrument break, and it is the cheapest on this list

The wash split at the rule is **two clip rectangles that must meet exactly**: one
from the top of the plot to the reference, one from the reference to the bottom.
Change either by a pixel and the chart grows a hairline band that is either
uncoloured or double-painted, right across the plot at the one y a reader is
looking at.

It is one number in `PriceChart.tsx`, and the assertion holding it lives inside
`PriceChart.test.tsx`'s _draws the reference rule and the wash together, never one
alone_ — the block checking that the two clip rects' heights sum to the plot and
that the lower one starts where the upper one ends. Confirm it goes red, because a
one-pixel seam is exactly the sort of thing that renders, survives a screenshot
review and is invisible in a trace.

---

## Amended 2026-09-12 by Task 2.12.7 — the element count grew by a known amount, and the fixture-leak greps are four

Three corrections, none of which changes what this task measures.

### The plot's element count, restated

2.12.7 adds, at most: **two `<rect>`** for the uncovered spans (one in the
ordinary case, two only where the store is missing the start of the window as
well), **one `<clipPath>` with one `<rect>` in it**, and **one `<line>`** per
coverage edge. All of them are constant in the bar count — nothing here scales
with the series — so §1's constraint is untouched and the corrected figure this
task measures against is _roughly two dozen plus four_.

**Two of them are conditional on the state and that matters for what is being
timed.** A `loaded` answer carries none of it, because the covered span is the
frame and the arithmetic produces no wash, no edge and no clip. So the densest
window (`dense`, 1,950 bars, fully covered) and the emptiest state are at
opposite ends of both axes, and a measurement taken only on `dense` measures the
element count at its lowest.

### One clip is now shared by three marks, which is cheaper than it looks

The series, the wash group and the reference rule all reference **one**
`clipPath`. That is one more paint-time clip than before and **not** three: the
group around the two `<use>` elements is what carries it for both washes, because
an element takes one `clip-path` and each `<use>` already spends its own on the
split at the reference rule.

### The fixture-leak grep is four, not two, and not three

The Work section says two. The sixth review's amendment said three. It is
**four**: `dense.json` at 222 KB, `uncovered.json` at **147 KB** (added by
2.12.7), the securities corpus at 191 KB, and the original bar-timestamp grep.
`CLAUDE.md`'s entry carries all four by name.

### The clip is nested over a 1,950-point fill, which is the specific shape nothing has measured

Sharpening the section above rather than adding to it, because "one more clip" is
not the interesting part. 2.12.5's amendment already flagged that a `clipPath` is
a rasterisation step and that clipping a 1,950-point filled path twice is not
obviously free. What 2.12.7 added is that the same fill is now clipped
**twice over**: the coverage clip on the group, and each `<use>`'s own clip at the
reference rule inside it.

So at the default window in the ordinary `partial` state the paint phase carries
a nested clip over a 1,950-point path, twice, plus a third reference to the same
clip on the line and a fourth on the rule. All constant in bar count — the
**shape** is unmoved — but if anything in the paint phase surprises this task,
this is now the first place to look rather than the second.

### The fixture to measure the routine case on has changed, and it is not `dense`

2.12.5's amendment says `dense.json` is the routine case and the cap is the worst
case. That is still true of **density** and is now false of **element count**:
`dense` is fully covered, so it carries no wash, no edge and no clip and
exercises none of what 2.12.7 added.

The body with both real density and the full mark set is `uncovered.json` — 780
bars, 990 slots, `partial`. Measure the routine case on **that**, and keep
`dense` for the density ceiling. A trace taken only on `dense` measures the
densest series this product opens at with the fewest elements it ever draws,
which is neither end of anything.

---

## Amended 2026-09-12 by Task 2.12.8 — the calendar walk gained a **second caller inside one render**, and the pointer path gained work

Three things, and the first two are additions to what this task measures rather
than corrections to it. The first is the one that matters: 2.12.8 is the only
task in this story that added cost to a surface the amendments above already name
as the unmeasured one.

### The trading-calendar walk now runs **twice per render of `PriceChart`**

2.12.3's amendment records that `timeAxis` — which steps **day by day** through
the trading calendar, the same algorithm Task 2.9.9 measured at **20.6 ms** on the
server over the whole stored depth — gained a caller in the browser, on the main
thread, inside a render. 2.12.4's amendment answers the question it left open:
**once per render, unmemoised, and the React Compiler is not installed**, so there
is no auto-memoisation to rescue it.

**`chart-alternative.ts` is a second call in the same render.** The text
alternative's coverage clause has to count the axis's own slots, and it derives
its own axis rather than reading the frame's — deliberately, because the frame's
coverage is in **pixels**, which are zero everywhere below a browser, so a
sentence built from them would be empty in exactly the environment that tests it.
`CHARTING.md` §15.3 carries that argument and `CLAUDE.md`'s gap list carries the
consequence: the two agree only by both calling `timeAxis` and
`positionOfInstant`.

What this task owes because of it:

- **Time `timeAxis` at the cap and then double it**, which is the honest figure
  for a render today. The 2.12.3 amendment asked for the single figure and it is
  still the right measurement; what has changed is the multiplier.
- **Say whether the second call is worth removing, and measure before answering.**
  There are three shapes and none is obviously right: leave it (two walks of five
  sessions is nothing at this story's windows), have `chartFrame` return the axis
  it already built and hand it to the alternative (one walk, but it makes the
  sentence depend on the frame, which is the coupling §15.3 avoided on purpose),
  or memoise `timeAxis` itself on the window (which pays for **all three** callers
  including the server's, and is the `packages/shared` repair 2.9.9 already argued
  for once).
- **It is not on the pointer path**, and that is measured rather than assumed:
  `PriceChart.test.tsx` counts `chartFrame` calls across forty arrow presses and
  expects zero, and the alternative sits in the same render body, so it runs zero
  times too. The cost is per **answer** and per **resize**, not per move.

The window where this stops being free is the one the Notes already name and
2.12.3's amendment repeats: **a `1d` window offering "1 year" or "max"**, which is
Story 2.13's. It is now two walks of hundreds of calendar days rather than one.

### The readout is rendered **twice per pointer move**, which lands on the one surface this task is pointed at

The Work section says continuous pointer movement is the case most likely to
produce a _routine_ long task and is the genuinely unmeasured surface. 2.12.8 put
work there, and it is small, constant in the bar count, and worth measuring rather
than waving through.

The reserved-height repair (`CHARTING.md` §15.4) makes the readout a one-cell grid
holding **two** rows: the live reading and a hidden reading of the last bar that
sizes the row. `ChartReading` re-renders on every pointer move and neither row is
memoised, so per move the component now:

- renders **two** `BarFigures` subtrees instead of one — roughly **40 elements
  reconciled rather than 20**, all of them constant in the bar count;
- runs `formatBarInstant` **twice**, which is two `Intl.DateTimeFormat.formatToParts`
  calls rather than one. The formatters themselves are module-cached in
  `packages/shared/src/market-time.ts`, so this is a format call and not a
  constructor — but it is the only `Intl` work anywhere on the pointer path, and
  `CALENDAR.md` §6 is the reason to look at it rather than assume it.

**The hidden row's output never changes**, so React reconciles it and touches no
DOM. That is the reason to expect this to measure as nothing, and it is exactly
the reason the Work section's warning applies: a confirming measurement and one
never taken produce the same report. Measure the pointer path **with and without
the sizer** — commenting it out is a two-line change — so the delta is a number
rather than an argument.

### The prediction table, corrected a fifth time, and a new break worth having

| Row                      | What 2.12.8 did to it                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOM nodes in the plot    | **+1 outside the SVG** — one visually hidden `<p>`. Nothing was added to the drawing                                                                              |
| DOM nodes in the readout | **roughly doubled**, to ~40, half of them `visibility: hidden`. Constant in bars, and on the pointer path                                                         |
| Shape                    | **Unmoved**: `O(sessions + breakpoint)`, `O(1)` in bars. The alternative's own cost is `O(sessions)` through `timeAxis`, which is the same term the frame carries |
| Bundle cost              | One new module, `chart-alternative.ts`, plus one CSS rule. No token, no dependency. Attribute it separately from the five arithmetic modules                      |

**A new instrument break, and it is the cheapest on any of these lists.** Move
`ChartReading`'s `useState` up into `PriceChart` — the repair 2.12.6 took
structurally and 2.12.4's amendment warned would be undone by a well-meant "lift
state up". It puts **two** calendar walks and a 1,950-point path build on every
pointer move, which is the shape §28's word _routine_ is about. `PriceChart.test.tsx`'s
_recomputes the frame zero times across forty arrow presses_ should go red, and so
should the trace. Confirm both: a break that reddens only the unit test has not
shown that the trace can see it, which is this story's own recorded lesson about a
break being loud in the wrong dimension.

---

## What this task found — 2026-09-12

**The subject document is [`CHARTING.md`](CHARTING.md) §16**, which carries every
figure with the machine and the method it was taken on. This section is the
summary and the decisions; do not cite a number from here that §16 states.

### The headline, in one line each

- **Criterion 5 is met.** The chart produces **no main-thread task over 50 ms**
  in any state, at any density this API can serve — cold at the **9,750-bar
  cap**, under 120 continuous pointer moves, and under 40 arrow presses. 8,970
  extra bars cost about **5 ms and no elements**.
- **The page it sits on does breach §28**, and it is **not the chart**. There is
  one task of **50–66 ms on every cold load** of `/securities` **and**
  `/securities/:symbol`, it is the **518-row tracked universe**, and it is proved
  by the two ends: present on `/securities` where no chart exists, absent with a
  20-row universe while the cap-sized chart is still drawn. Raised rather than
  absorbed — see below.
- **The bundle cost of the decision is 6,552 B gzipped, 4.2% of the artefact**
  (5,901 JS + 651 CSS), against 2.12.1's prediction of **+279 B** for a spike's
  one `<path>` and a scale. §1 is untouched: the rejected library was
  **+94,809 B gzipped on its own**, so the whole hand-built chart including its
  arithmetic costs **6.9%** of what Recharts would have cost before drawing
  anything.
- **The calendar walk is the number to carry forward**, and it belongs to Story
  2.13: `timeAxis` is **0.202 ms** at today's default window and **23.051 ms**
  over the whole stored depth at `1d` — **twice per render**, so **46 ms of a
  50 ms budget** at a "max" window, before a pixel is drawn. Task 2.9.9 measured
  the same walk at 20.6 ms on the server; two runtimes, one algorithm, 12% apart.
- **The memoisation repair 2.12.6 took structurally is worth ~17× on the pointer
  path and breaks nothing if undone at today's windows** — which is a reason to
  keep it and a warning about what a trace can and cannot see.
- **The four fixture-leak greps found nothing**, and no fixture was added: the
  two cap-sized bodies recorded here (1.1 MB and 972 kB) live in a scratch
  directory and are not checked in.

### The decisions this task took, rather than deferred

**1. The 518-row table is raised, not repaired.** §28 is breached by a surface
Story 2.11 built; the repair is virtualisation or deferred rendering of a table
this story does not own, and smuggling it into a measurement task is how a
story's scope stops meaning anything. `CLAUDE.md`'s precedent for this exact
shape is Task 2.9.9's — _raise it rather than absorb it_. It is recorded in
[`SEARCH-AND-SELECTION.md`](../story-11-security-search-and-selection/SEARCH-AND-SELECTION.md)
§10 with the measurement and three repair options, named in Story 2.14's close as
a decision that epic owes, and on `CLAUDE.md`'s gap list. **Trigger:** the first
time a second surface renders per-row markup at universe scale.

**2. `chart-alternative.ts`'s second call to `timeAxis` stays.** Removing it
would buy 0.2 ms at today's windows and spend §15.3's separation — the sentence
would start deriving from the frame, which is the coupling it exists to avoid.
The repair that actually pays is memoising the walk in `packages/shared`, which
serves all three callers including the server's. **Trigger:** the first window
control offering a range wider than three months at `1d`.

**3. No wall-clock assertion was added to `pnpm verify`.** A timing gate in
`pnpm test` measures the runner, and a flaky performance gate is how a suite
stops being believed. What was added instead is the **shape** the timings follow
from: `PriceChart.test.tsx`'s _draws no element per bar, at sixty-five times the
bars_ — identical paths, rects and `<use>` counts at 30 bars and at 1,950, lines
differing by exactly the three extra session seams, a ceiling of forty elements,
and the series path string asserted to have grown twentyfold so that a pair of
equal counts cannot come from a pair of equal bodies.

### The instrument was broken on purpose, twice, and one break did not go red

- **One `<rect>` per bar** — the break §1's constraint is about. At the cap:
  **9,790 plot elements** and **five tasks of 137–254 ms**, reproducing the
  spike's 296 ms in the real component. It also takes the new unit test red at
  `expected 1952 to be 32`, verified by performing it. At the **default** window
  the same break produces **no long task**, which is §2's threshold argument
  arriving from the other end.
- **Lifting the reading's state into `PriceChart`** — verified to have landed
  (121 re-renders for 121 pointer moves, read off the DOM), measured at 17× the
  CPU on the pointer path, and it produced **no long task at all**. A real
  regression, invisible to §28's own criterion. The unit test is what catches it.
- **And the instrument itself was wrong first**: the initial pointer pass
  recorded **zero** move-to-paint samples across 121 real moves, because the
  listener sat on the plot's container and the crosshair's overlay is its
  sibling. The long-task and frame figures from that run were sound; the latency
  column was empty and would have been reported as "nothing to see". Check the
  instrument is live **in the dimension it reports on**.

### What was not done, and why

- **No repair was shipped to the chart**, because nothing in it exceeded the
  budget. The Work section's own prediction — _"the expected outcome of this task
  is that it finds nothing"_ — held for the chart and failed for the page, which
  is the more useful outcome.
- **The `1d` windows were timed but not traced in a browser**, because no window
  control offers them yet. `timeAxis` is pure, so the figure that matters exists
  before Story 2.13 needs it, which is what 2.12.3's amendment asked for.

---

## For the stakeholders — what happened here, in plain terms

**Nothing on the screen changed this week, and that was the expected outcome.**
This piece of work was a measurement: the product has a published promise that
nothing it does should freeze the screen for more than a twentieth of a second,
and the price chart we finished last week is the first thing MarketPulse draws
that could plausibly break it. So we measured it, properly, in a real browser,
against the largest amount of data the system is able to serve — roughly ten
thousand price points, a month of minute-by-minute trading.

**The chart passed, comfortably, and it passed at every size.** Drawing ten
thousand points costs about five thousandths of a second more than drawing eight
hundred, and moving the pointer across the chart to read individual bars holds a
steady sixty frames a second — the same smoothness as scrolling a well-built
website. The reason is a decision taken deliberately back at the start of this
chart's work: the price line is drawn as **one shape**, not as ten thousand
little ones. We tested that decision by deliberately breaking it — drawing one
mark per bar — and the screen immediately froze for a quarter of a second at a
time. That is the difference the original choice bought, and we can now put a
number on it rather than a claim.

**The measurement did find a real problem, and it is not in the chart.** Every
time you open a security's page, the list of all 518 tracked companies
underneath it takes the browser about a twentieth of a second to build — just
over the line we set ourselves. It is not dramatic and most people would read it
as "the page took a moment", but it is over budget, it happens on every visit,
and it will get worse as we add more columns to that table in later epics. We
proved it is the table and not the chart by loading the biggest possible chart
with a short list (no delay at all) and by loading the list with no chart at all
(the delay was still there).

**We deliberately did not fix it in this piece of work.** Fixing it means
changing how that table renders — a real change to a part of the product a
different piece of work owns — and quietly widening a measurement task into a
rebuild is how estimates stop meaning anything. Instead it is written down with
the measurement, the three possible fixes, and a specific condition that says
when it must be done. That is the same thing we did earlier in this epic when a
measurement found a slow piece of date arithmetic on the server: record it, name
the trigger, and don't let it be forgotten.

**We also priced the decision not to use an off-the-shelf charting library.**
Everything we hand-built — the chart, the crosshair, the keyboard controls, the
spoken description for screen-reader users, and all the maths behind the axes —
adds about 6.5 KB to what a visitor downloads, roughly 4% of the application.
The library we turned down would have added 95 KB on its own, before we wrote a
single line, and it would have come with its own appearance to fight and no
screen-reader support to speak of. So the hand-built route cost about seven
percent of the alternative and gave us complete control of how it looks and how
it is read aloud. That is a good trade, recorded with the receipts.

**And we found the number that will matter next.** The chart works out which
days the market was actually open by walking the calendar day by day. Over five
days that takes a fifth of a millisecond — nothing. Over two years, which is
what a "maximum range" button would ask for, it takes 23 milliseconds, and the
chart does it twice, so 46 milliseconds of our 50-millisecond budget would be
gone before anything is drawn. The next piece of work adds exactly that kind of
time-range control, so it now starts with the answer in hand and a named fix
(remember the calendar rather than re-walking it) instead of discovering the
problem with a user watching.

**Where this leaves the product.** The price chart is finished, correct,
accessible, and now proven fast at the largest data set the system can produce.
One task remains before this chapter closes: deploying it, applying the four
"does this look like a real product" tests to what is on screen, and writing the
architecture decision record that the next four epics of charts — anomaly
markers, comparisons, and charts opened by the AI itself — will inherit.
