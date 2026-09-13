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

---

## Amended 2026-09-12 by Task 2.13.1 — measure the windows this product offers

Two corrections to the figures this task is told to re-take.

**The widest offered window is 252 sessions, not 672.** "Max" was declined
([`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §1.2), so the 23.051 ms / 46.1 ms
row describes a window nothing in the product can ask for. Re-take the table at
the windows the control **offers** — 1, 5, 21, 63 and 252 sessions — and carry
§16.5's 672-session row as a historical figure rather than as a live claim. The
widest live figure is **17.0 ms per render at 1Y**, a third of the budget.

**2.13.1 already re-took that table once, before the repair, and it is the
baseline to compare against** rather than §16.5's: 0.058 / 0.222 / 0.735 / 2.858
/ 8.500 ms per call at 1, 5, 21, 63 and 252 sessions, taken 2026-09-12 in the
frontend's own runner, 200 iterations after 50 warm-up calls. It corroborates
§16.5 to within 4% at every shared point, which is what makes the two comparable
at all. **State the method both were taken with**: a figure that has moved looks
exactly like a figure that was mis-recorded.

The rest of this task is unchanged, including the instruction not to absorb the
universe table's 50–66 ms into a new number.

---

## Amended 2026-09-13 by Task 2.13.2 — a fourth candidate, and it is a different axis from the other three

This task's three candidates are all about **element counts and CPU**.
[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §10.4 raised a fourth that none of
them would catch, and it is raised rather than absorbed exactly as 2.12.9 raised
the universe table.

**`CHARTING.md` §1's constraint is a count. This is a single element whose
attribute is six figures long.**

Taken 2026-09-13 from the real series at a 726 px plot, the volume mark's
per-pixel rule holds its path string at **16.8 kB** from 5D upward, against
**158 kB** for one stem per bar at 1M — a 9.4× reduction that is also a ceiling,
because it is bounded by the plot's width rather than by the bar count.

**The price line has no such ceiling.** By the same arithmetic it is **24.5 kB at
today's 1,950-bar default and about 103 kB at 1M's 8,190 bars**, and a line
**cannot** take the per-pixel repair without first deciding what a downsampled
line means — which is a product question about whether a chart may omit a datum,
not a rendering one.

Nothing in this repository has measured the parse, memory or paint cost of a path
attribute that size, and **1M is the window this story makes reachable**. Measure
it at 1M rather than at the cap: 1M is the widest window at minute resolution,
and 3M and 1Y are two orders of magnitude smaller in points, so the curve has its
knee inside the offered set.

If it is under budget, say so with the figure — a cost measured and found
acceptable is a different artefact from a cost nobody looked at, and the next
window control will want the number.

Add to **Done when**:

- The path-string cost is measured at 1M for **both** marks — the volume
  silhouette and the price line — with parse or paint attributed, not only the
  byte count
- Either it is under budget with the figure stated, or it is raised with a
  condition and a named owner

---

## Amended 2026-09-13 by Task 2.13.3 — candidate 3 is half-discharged, and what is left of it is the half only a browser can take

### The calendar-walk table is re-taken, in the runner rather than in the browser

This task's first Work bullet and its first Done-when item said _re-take the
calendar-walk table after the repair_. **2.13.3 took it, in the same method as
2.12.9 and 2.13.1 — pure function, 200 iterations after 50 warm-up calls — and the
figures are in its own Outcome §6.1 beside the old ones**, with `CHARTING.md`
§16.5 and `MARKET-DATA-API.md` §12.4 carrying dated amendments. Headline: 1Y goes
from **8.431 ms to 0.423 ms** per call, so **17.0 ms per render to 0.8**; the
server's cap check at the full daily depth goes from **20.62 ms to 0.906 ms** warm.
All three callers were measured and all three paid.

**So candidate 3 is not a re-take any more. What is left of it is three things a
vitest runner cannot see:**

- **The cold walk, in a browser, at first paint.** The memo does **not** make the
  first walk cheaper: measured cold on untouched dates, a year of `1d` costs
  **9.5 ms** for one `timeAxis` call and **0.44 ms** for the next (21.5 ms on the
  very first call anywhere, which also builds the `Intl` formatters and the calendar
  index). That is once per process and it lands **inside a cold load of 1Y**, on the
  same main thread as the 518-row universe table's 50–66 ms. Whether the two
  coincide is exactly what this task's attribution method is for, and it is
  unmeasured.
- **Whether a resize tick is now free.** The repair's whole shape is that the
  repetition went, and a resize storm was the second half of "per answer and per
  resize tick". Nothing has timed one.
- **Whether the memo changes the rapid-sequence figure.** A rapid sequence of window
  changes walks four of the five windows' dates, so the second pass through any of
  them is warm. That is the pattern 2.13.7 exercises and this task times.

### The path-string figure moved, and in the right direction

§10.4 predicted the volume silhouette's `d` attribute at **16.8 kB** on a 726 px
plot. **Measured off the built geometry it is 10.6 kB** — 726 stems of
`M<x> <baseline>V<top>`, because a vertical-line command carries one coordinate
where a line-to carries two. The ceiling property is unchanged and is the point:
it is bounded by the plot's width, so 1M is the same 10.6 kB as 5D.

**The price line's figure is untouched and is still this task's** — about 103 kB at
1M's 8,190 points against 24.5 kB at today's default — and it is still the one
without a ceiling. Measure both; one of them has a knee inside the offered set and
the other cannot.

Amend **Done when** — the first item is replaced rather than added to:

- ~~The calendar-walk table is re-taken with the method stated, beside the old
  figures, for all three callers~~ → **done by 2.13.3; confirm the figures in a
  browser at a cold 1Y load, time a resize tick, and say whether the ~9.5 ms cold
  walk lands in the same frame as the universe table's task**
- The volume silhouette's measured 10.6 kB is checked against the browser's parse
  and paint, not only re-counted

---

## Amended 2026-09-13 by Task 2.13.4 — candidate 1 is half-discharged, and a **fifth** candidate arrived with the shared axis

### Candidate 1's shape guard exists and is break-verified; its wall-clock half does not

This task's Work bullet _"add no wall-clock assertion; what goes in is a shape
guard … break-verified by actually drawing one element per bar and watching it go
red"_ is **done for volume**. `VolumeChart.test.tsx`'s _draws no element per bar,
at sixty-five times the bars_ asserts identical element counts at 30 and 1,950
bars with the path strings proved to differ, and the break was performed: one
`<rect>` per bar takes it red at **1,951 against 31**.

So candidate 1 is now the same shape as the price line's — a property held
mechanically, with the **timings** still owed here and still only takeable in a
browser. Do not re-derive the guard; measure what it stands in for.

### The fifth candidate: **a resize tick now re-renders both plots, through a provider**

This is new with 2.13.4 and none of the other four candidates would find it.

The shared axis is a context. `ChartAxis` holds the measurement state, and every
`useChartAxis()` consumer re-renders when it changes — which is **both** frame
owners today and, after 2.13.5, both frame owners **and** two reading overlays.
Before 2.13.4 a resize tick rebuilt one frame; it now rebuilds two, one of which
walks the bars again to build a silhouette.

That lands squarely on this task's existing _"whether a resize tick is now free"_
bullet from the 2.13.3 amendment, which was written about the calendar memo. It is
now two questions with one method: the memo made the **walk** cheap, and the
provider made the **fan-out** wider. Time a resize storm at 1Y and at the default
window, and attribute between them.

Two things that bound it before anybody panics, and both should be stated with the
figure rather than instead of it: `ChartAxis` renders `children` through
unchanged, so `SecurityExplorer` and the 518-row table are **not** in the fan-out;
and both plots keep an equality guard, so a resize that does not change a box sets
no state.

### And the thing that must still be zero

`PriceChart.test.tsx`'s zero-recomputation guard was **re-pointed at `timeFrame`
and `priceFrame`** by 2.13.4 and does **not** yet count `volumeFrame` or render
the pair — 2.13.5 owes both. This task's _"confirm it still is, with two plots on
the frame"_ bullet is therefore a real check rather than a formality: confirm the
instrument counts all three builders and is pointed at a rendered pair, because a
guard aimed at a component that is not on screen reports zero for the same reason
a counter wired to nothing does.

Add to **Done when**:

- A resize storm is timed with the pair on screen, at the default window and at
  1Y, and the cost is attributed between the calendar walk and the provider's
  fan-out
- The zero-recomputation guard is confirmed to count `timeFrame`, `priceFrame`
  **and** `volumeFrame` against a rendered pair before it is trusted

---

## Amended 2026-09-13 by Task 2.13.5 — the zero that had to be confirmed is now mechanical, and the pointer path is finally measurable as a pair

### "The thing that must still be zero" is discharged, and this task checks a grep rather than an instrument

2.13.4's amendment left this task a real check: the zero-recomputation guard
counted `timeFrame` and `priceFrame`, rendered only the price chart, and was
therefore blind to the volume side. **2.13.5 finished it.**
`PriceChart.test.tsx` now counts all three builders, renders **both** plots inside
one `ChartAxis`, still reports zero across forty arrow presses, and still verifies
its own counter live — and the break was performed: putting the read position on
`ChartAxisValue` takes it to **120**, which is three builders × forty presses and
is therefore evidence that both plots were on screen and all three were counted.

So this task's item becomes a **confirmation by grep** rather than a check to
design: the three names are in the mock and the harness renders the pair. Spend
the time on the wall-clock halves instead, which are still only takeable in a
browser.

### The pointer path is now two overlays, which is what the fifth candidate was written about

The Work bullet _"the pointer path, at the cap, with two plots"_ was written
before there was a second reading layer. There is one now, and the shape is the
one 2.13.4's fifth candidate anticipated with one correction worth stating before
the measurement:

- **A resize tick fans out to both plots and, through them, to both overlays** —
  the overlays are children of the frame owners, so they re-render when their
  parent does. That is the fifth candidate unchanged.
- **A pointer move fans out to the two overlays and to nothing else.** The read
  position is a **second context** (§27), so neither frame owner consumes it. The
  guard proves no frame is rebuilt; it does **not** prove the render is cheap, and
  what each overlay now does per pointer move includes `formatVolumeExact` and
  `formatBarInstant` on the snapped bar.

Those are two different fan-outs with two different causes, and the existing
bullets already ask for both. What is new is that they can now be told apart in a
profile, because one of them touches `timeFrame` and the other cannot.

### And one number that did not exist when this task was written

The reading's DOM grew: each strip lays out **every state it can be in** — the
price strip two, the volume strip three — in one grid cell, to reserve its height
at the real width. That is a fixed handful of spans per plot and does not scale
with the bar count, so it is not a candidate. It is stated so that a profile
showing more layout under the charts than last time has an explanation that is
already written down.

Add to **Done when**:

- The zero-recomputation guard is confirmed by **grep** — three builder names in
  the mock, the pair in the harness — rather than re-derived
- The resize fan-out and the pointer fan-out are measured and attributed
  **separately**, and the profile says which one touched a frame builder

---

## Amended 2026-09-13 by Task 2.13.6 — a **sixth** candidate, and the windows this task measures are now real rather than hypothetical

### The sixth candidate: `marketDateAt`, once per bar, on every frame build at `1d`

New with the `1d` placement repair
([`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §30.1) and none of the other five
would find it, because it is neither an element count nor a string length.

On a daily axis a slot **is** a session, so `positionOfInstant` resolves an
instant by its **market date** — `marketDateAt(instant)`, which is two `Intl`
operations — and `placeBars` calls it once per bar. Both plots place their own
bars, so a `1Y` frame build is **2 × 252 = 504** calls, and a resize storm
multiplies that by the tick count.

Three things bound it and should be stated **with** the figure rather than instead
of it: it is off the pointer path (the read position is a second context, and the
zero-recomputation guard holds), it is bounded by the session count rather than by
the bar count — so it is **252 at the widest window and 5 at the default**, the
opposite shape from every other candidate here — and `1m` windows do not reach the
branch at all. Measure it at `1Y` cold and in a resize storm; if it is under
budget, say so with the number, because the next per-bar placement rule will want
it.

### The windows are reachable now, which changes how three existing bullets are taken

- **1M is no longer a projected figure.** The path-string candidate (2.13.2's
  amendment) says to measure at 1M because the curve's knee is inside the offered
  set. It is now a button: `?sessions=21` on the running page is 6,630 bars on a
  developer's store and 8,190 on a caught-up one. Take the measurement there
  rather than by construction.
- **The rapid sequence has a driver.** _"A rapid sequence of window changes"_ was
  written before anything could produce one; five cells and a keyboard now can,
  and 2.13.7 exercises it. Note the keyboard path is **manual activation** (§32),
  so a keyboard-driven rapid sequence is `→ Space → Space` rather than four
  arrows — which is a different request pattern from the mouse's and worth timing
  as itself.
- **A window change is a `1m` → `1d` change in two of its five cases**, and those
  two replace the silhouette with per-session columns and the intraday ticks with
  dates. That is a different amount of work from a `5D` → `1M` change, and folding
  them into one "window change" figure would average two different things.

### And one figure this task no longer has to establish

The `1d` windows are **small** in points: 63 and 252 against 1M's 8,190. So the
price line's path string — the one candidate without a ceiling — has its maximum
at **1M and not at the widest window**, which is the opposite of the intuition and
is worth writing beside the number. The knee is where 2.13.2 predicted it.

Add to **Done when**:

- `marketDateAt`'s per-bar cost at `1d` is measured cold at 1Y and under a resize
  storm, and either shown under budget with the figure or raised with a condition
- The window-change figure separates a same-timeframe change from a `1m` → `1d`
  one
- The keyboard-driven rapid sequence is timed as well as the pointer-driven one

---

## Amended 2026-09-13 by Task 2.13.7 — the rapid sequence has a recorded shape, a **seventh** candidate, and a warning that invalidates the measurement environment

### The measurement environment first, because it silently zeroes the thing this task measures

**A browser tab driven over CDP reports `document.visibilityState === "hidden"`,
which pauses `requestAnimationFrame` — and `ResizeObserver` delivery with it.**
Measured 2026-09-13: a freshly constructed observer on a laid-out **939 × 221**
element fired **zero times in 500 ms**.

For this task that is worse than a nuisance. Every figure here is a browser
figure; a resize storm in a non-painting tab is **no storm at all**, a cold 1Y
load measures a chart that never got a box, and the numbers would be plausible,
small and meaningless. `CLAUDE.md`'s gap list carries it. **Say in the record
which browser each figure was taken in and that it was visible** — Playwright's
page is, a devtools-driven tab may not be.

### The rapid sequence is no longer hypothetical, and its shape is recorded

This task's _"measure a rapid sequence of changes, which is the pattern 2.13.7
exercised and nothing has timed"_ now has a driver and an observed behaviour to
time against: three presses inside one answer's flight settle on the last, the
address ends on the last, and **one** rail is on screen throughout because what is
on screen never changed. `e2e/specs/security-window-change.spec.ts` is the harness
and it stalls the answers deliberately rather than racing them.

Two things that changes about the measurement:

- **A rapid sequence now paints the previous window's charts for its whole
  duration** rather than a skeleton. So the CPU under a sequence is _render of a
  held frame_ plus _n_ superseded fetches, not _n_ frame builds — which is the
  opposite of what the bullet was written expecting, and is worth stating with the
  figure because it is the shape the design chose.
- **The keyboard-driven sequence is `→ → Space`**, not four presses (2.13.6's
  amendment), and it reaches the change with the plot blurred and no reading live.
  The pointer-driven one may have a reading live. Time both; they are different
  amounts of work.

### The seventh candidate: `resolveRead`'s search, which is bounded but is on a path nothing has profiled

`ChartRead` now carries the bar's **instant**, and `resolveRead` resolves it
against the current `readings` (§38). Its shape:

- **The fast path is an index hit and an integer comparison**, and it is what runs
  on every pointer move. No allocation, no search.
- **The search runs once per window change**, per overlay — so **twice** per
  change — and it is a binary search over `readings`, which is at most 9,750 at
  the cap and 252 at 1Y.

That is bounded and off the pointer path by construction, which is why 2.13.7 did
not measure it. **What is worth confirming rather than assuming** is the fast
path: it is inside both reading overlays' render, and 2.13.5's amendment already
asks for the pointer fan-out to be measured separately from the resize fan-out.
If a profile shows `resolveRead` on the pointer path doing anything but the index
comparison, something upstream is rebuilding `readings` per move and the guard
that should have caught it is looking at the wrong thing.

### Two small additions to the fan-out picture, so a profile has them written down

- **`useBarSeries` holds one state object rather than two**, and derives a
  `BarSeriesScreen` per render — four field reads and a `switch`. Named so that a
  profile showing a second object allocated per render in the hook has an
  explanation already on paper rather than becoming a candidate.
- **`usePlotBox` holds the two plot elements as state.** The elements are set once
  per attachment, so this adds one render per plot on mount and none afterwards;
  the effect's dependencies now include them, which is the repair §40 records. It
  does **not** change the resize path. Stated for the same reason.

Add to **Done when**:

- Every browser figure records that the page was **visible**, with the method
  stated
- The rapid sequence is timed in both its driven forms, and the figure is stated
  as _held frame plus n superseded fetches_ rather than as _n frame builds_
- `resolveRead`'s fast path is confirmed on the pointer profile to be an index
  comparison and nothing else

---

## Amended 2026-09-13 by Task 2.13.8 — an **eighth** candidate, which this task's own predecessor introduced, and two bodies that make two existing measurements easier

### The eighth candidate: the text alternative now walks the calendar too, on the resize path

**New with 2.13.8 and none of the other seven would find it**, because it is not
an element count, not a string length and not a per-bar call — it is a _second_
call to a function this story has already made cheap.

`chart-alternative.ts` gained `frameClause`, which states the window as its
resolved session count ([`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §44.4).
It is derived from `timeAxis` deliberately — that is the whole point of it, and
`CLAUDE.md`'s gap list carries the derivation as a live hazard — but it is a
**second** `timeAxis` call in a module that already made one in `axisSpan`. Both
sentences are built in the render body of their plot, unmemoised:

|               | `timeAxis` calls per render of the pair            |
| ------------- | -------------------------------------------------- |
| Before 2.13.8 | **2** — one per sentence, through `axisSpan`       |
| After         | **4** — `frameClause` and `axisSpan`, per sentence |

Against 2.13.3's measured 0.423 ms per warm call at 252 sessions, that is about
**+0.85 ms per render at 1Y** — and the render it lands on is the one the
**fifth** candidate is about, because a resize tick fans out to both frame owners
and both sentences are rebuilt with them. A resize storm therefore pays it per
tick.

Three things bound it and should be stated **with** the figure rather than
instead of it: the memo means every call after the first on a given date is the
warm figure, so this is 0.42 ms and not 9.5; it is off the pointer path, because
neither frame owner consumes the read position; and at the default window it is
0.05 ms, which is nothing.

**If it matters, the collapse is trivial and is named here so the measurement
does not have to invent it**: build the axis once per sentence and pass it to
both clauses. That is a smaller change than it sounds — both call sites are in
one module, six lines apart — and it is **deliberately not done in 2.13.8**,
because this task's own Notes fence is repairing what a measurement merely
reveals, and a figure taken after an unmeasured optimisation is not comparable to
the one before it.

Add to **Done when**:

- The alternative's `timeAxis` calls are counted in a profile at 1Y, cold and
  under a resize storm, and either shown under budget with the figure or
  collapsed to one call per sentence **after** the figure is recorded

### One addition that is bounded and is stated so a profile is not surprised by it

`timeTicks` now filters the intraday ticks against the session dates already
placed (`MIN_TICK_SEPARATION`, §43.3). It is at most six times eight comparisons
on a `1m` axis and zero on a `1d` one, it allocates one array of numbers, and it
runs once per tick build rather than per bar. **It is not a candidate.** It is
named for the reason 2.13.7's amendment named `useBarSeries`' derived screen: a
profile showing an unfamiliar frame under `timeTicks` should find its explanation
already written down rather than turning into a ninth candidate.

### Two recorded bodies that make two existing measurements cheaper

- **`holiday-week.json` — 1,770 bars, `1m`, and `loaded` rather than `partial`.**
  It is the only recorded body between the default window's 1,950 and `1M`'s
  8,190 that covers its window **completely**, so the path-string measurement
  (2.13.2's amendment) can be taken on a frame with no uncovered ground in it and
  compared against `dense`, which is the same density and the same state. It is
  also the only body whose **sessions are not all the same width** — 210 slots
  against 390 — which the density arithmetic has never been measured against.
  Neither is a new candidate; both are instruments this task did not have.
- And the reason that matters for a timing task: it is served by
  `e2e/specs/security-holiday-week.spec.ts` through `page.route`, which is a
  **fulfilled** response rather than a store read. A figure taken against it
  excludes network and server time by construction, which is useful for
  attributing render cost and misleading for anything else. Say which.
