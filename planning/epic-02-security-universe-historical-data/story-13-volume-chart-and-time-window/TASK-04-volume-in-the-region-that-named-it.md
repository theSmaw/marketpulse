# Task 2.13.4 — Volume, in the region that has been naming this story

**Status:** Complete — 2026-09-13
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.2, 2.13.3

## Objective

Draw traded volume beneath the price chart at the default window, in the
**Volume** region of the Security Explorer — a region that has existed since
2026-09-11 and whose placeholder names this story by number.

This is the story's first visible payoff and it is deliberately early, before the
window control. One series in one window, on an axis that is already right, is a
smaller problem than a control that changes both; doing it in this order means the
control arrives with something to move.

## What the user can see when this lands

**Volume beneath the price, for a real security, aligned to the line above it.**
`/securities/NVDA` shows the same five sessions twice — closes as a line, traded
volume as columns beneath — sharing one x-axis, one coverage edge and one set of
session seams. The epic's exit criterion reads _"recent historical price **and
volume** data"_, and this is the task that makes the second noun true.

What they still cannot do: change the window (2.13.6), or read a single bar's
volume by pointing at it (2.13.5).

## Work

- **It fills the region; it does not add a panel.** `SecurityExplorer.tsx` places
  §8.3's seven contents once, and the concrete defect here is a second panel beside
  the region that has been holding the space. This is the same defect 2.12.4 was
  warned about and `e2e/specs/security-price-chart.spec.ts` exists to catch: jsdom
  computes no layout, so **every unit and component test is green either way**.

- **Amend the region's `filledBy` in the same commit as the drawing.** It currently
  reads _"Traded volume across the same window as the price above it, which is why
  it sits directly beneath at the same width"_ and is followed by
  `<RegionPlaceholder filledBy="Story 2.13 — Volume Chart" />`. A region that says
  it holds a plan while holding a chart is the live claim `CLAUDE.md` says to amend
  rather than leave standing — and `RegionPlaceholder`'s own stories use this
  region's sentence as fixture text, so grep before editing.

- **Count the marks, do not loop the bars.** `CHARTING.md` §1's constraint is a
  count: one element per bar at the 9,750-bar cap is **9,790 plot elements and five
  main-thread tasks of 137–254 ms**, and at the default window it is **no long task
  at all** — which is precisely why a unit test must assert a **shape** rather than
  a duration. `PriceChart.test.tsx`'s _draws no element per bar, at sixty-five
  times the bars_ is the guard to copy: equal element counts at 30 bars and at
  1,950, plus evidence the bodies actually differed, so a pair of equal counts
  cannot come from a pair of equal inputs.

- **Honour the coverage rule, per plot.** The bars stop at the coverage edge; the
  axis rule, gridlines, seams and tick labels run the full frame because the reader
  asked for that window; the uncovered ground is painted in this plot too, not
  inherited from the one above. **Two plots must stop at the same pixel** (§17.5
  item 4).

- **The bars are fills, which is the one geometric trap here.** §14.5: a fill is
  opaque where a stroke is not, and the plot's bottom border **is** the axis rule,
  so `getBoundingClientRect()` reports a box one pixel taller than the drawable
  area. `usePlotSize`'s `offsetHeight - clientHeight` subtraction is what corrects
  it, it is held by one assertion in `e2e/specs/security-price-chart.spec.ts`, and
  **jsdom implements neither property** so the correction is zero there. A volume
  bar drawn to the measured height paints over the axis.

- **Do not lift state.** The read position lives in a sibling component
  specifically so a pointer move does not rebuild the frame, and
  `PriceChart.test.tsx` counts **zero** frame recomputations across forty arrow
  presses and verifies its own counter in the same test. Adding a second plot is
  exactly the change that tempts somebody to "lift state up" into a common parent.
  Lifting it costs **17× the CPU on the pointer path** at the cap and produces **no
  long task at all**, so §28's criterion cannot see it; that unit test is the only
  thing that can.

- **Where the component lives, and what it is called.** `components/PriceChart/`
  holds `PriceChart`, `ChartReading`, `chart-geometry` and `chart-alternative`.
  Decide whether volume is a sibling component in a new directory or a second plot
  inside the existing one, and record the argument — the two plots share a frame
  and a reading, which is an argument for one directory, while `src/components/`'s
  rule is one component per file. Note that a `.tsx` under `src/components/` **owes
  stories**, enforced by `pnpm stories`.

- **CSS, and the two silent failures.** A CSS Module class-name typo typechecks,
  lints, builds and renders unstyled, and nothing in `pnpm verify` catches it. And
  any grid change must restate its spans at every breakpoint: a `span N` item wider
  than the explicit grid **grows implicit columns** rather than clamping — measured
  at `134px 134px 676px`, a visibly broken page under 1184px, with `verify` and all
  browser tests green.

## Done when

- Volume renders in the Volume region at the default window, for a real security,
  on the deployed-shaped default request
- The region's placeholder and its `filledBy` sentence are gone or amended, and the
  grep for that sentence found every copy
- A unit test asserts the element count is flat in the bar count, and proves its own
  inputs differed
- A browser test asserts the chart is **inside** the Volume region at all three
  viewports, and counts marks rather than calling `toBeVisible()` on them — a
  horizontal line is zero pixels tall and reports `hidden`
- A browser test asserts both plots' marks stop at the same x, and that the volume
  fill does not paint over the axis rule
- The frame-recomputation test still reports zero across forty arrow presses
- Stories exist for the plot and `pnpm stories` passes
- `pnpm verify` and `pnpm e2e` pass

## Notes

The likeliest scope leak is the **reading**. Volume is most useful when a reader
can point at one bar, the crosshair already exists, and extending it to a second
series is a ten-line change that turns into the whole of 2.13.5's announcement
pacing, reserved height and keyboard path. Draw the series; leave the reading.

The second is the **window control**. Nothing here is keyed on a window being
changeable, and that is deliberate: if this task finds itself wanting the control
in order to demonstrate the axis, the axis was not handed over as one object and
2.13.3 is incomplete.

One thing to expect rather than discover: on a developer's store the default window
is an honest `partial` and draws §6.2's uncovered ground in public, while the
deployed store answers it in full. **Both photographs are correct** (§11.3), and
the deployed environment is the one place the coverage treatment is not under
observation.

---

## Amended 2026-09-13 by Task 2.13.2 — the marks are specified, and this task inherits three obligations it did not have

This task had **no amendment from 2.13.1** and two of the items below are owed
from that task rather than from 2.13.2. They are collected here because this is
the task that pays them.

### What the plot draws, now decided rather than open

[`VOLUME-AND-WINDOW.md`](VOLUME-AND-WINDOW.md) §9.4 settles what volume keeps and
what it drops, and two of those are not in this task's Work section at all:

- **No gridlines**, and **no intraday times** — the x labels are the **first and
  last session date only**, which is `chart-density.ts`'s existing
  `sessionLabels: "ends"` reused. **Reused, not branched**: there is no viewport
  test and no media query here, for `CHARTING.md` §11.1's reason.
- **One value label** — the window's peak, abbreviated — **top-aligned to the
  plot rather than centred on its edge**, because centred it collides with the
  price scale's lowest label above it. And **volume keeps the full
  `--chart-gutter`** for that one label: the two plots share a gutter width so
  their seams land on the same x across a panel boundary, and alignment outranks
  tightness.
- **The seams are drawn under the bars.** A 1.70:1 dashed rule crossing a 3.50:1
  filled column is the column's pixel. On the price plot the two never overlap,
  because a line is a line.

Geometry: **88 px** at `--chart-volume-height`, **68 px** compact — the compact
pair keeps the **ratio**, not the height. Ink: `--chart-volume`, `#848995`, which
clears 3:1 against all four grounds a column can stand on.

### Owed from 2.13.1: the volume plot reads `provenance.sources`

§5(c), and it never reached this task file. **The plot must read
`provenance.sources` rather than a single feed label**, because Story 2.14 draws
a seam there and a plot built against one feed string has to be rebuilt to tell
the truth.

The reason it is sharper for volume than for price: every bar this store holds is
consolidated SIP, but Epic 3's live tail is **IEX only** — and an IEX _price_ is
approximately the market's price while an IEX _volume_ is a small fraction of the
market's volume rather than a sample of it. A stitched series therefore has a
step change at the seam that is an artefact of the feed and **would read as a
collapse in trading**. This task does not draw the seam; it must not make the
seam unsayable.

### Owed from 2.12.5: the high–low extent band, measured rather than judged

`CHARTING.md` §12.2 declined the band at `1m` and named **Story 2.13's `1d`
windows** as when it returns. 2.13.2 could not settle it — no `1d` response body
has been recorded, and the whole question is whether a session's range is thick
enough to see, which is a measurement against real data rather than a drawing.

**So it lands here, as a measurement:** once a `1d` window draws, read the band's
height in pixels at 3M and at 1Y and decide from the number. `--price-unchanged-wash`
is still reserved for it and still has no application consumer. Note the `1d`
body itself is **2.13.6's** to record, so if this task runs first the measurement
is deferred to whichever task has a `1d` body in hand — say which, rather than
letting it fall between them.

### The fill trap has an existing instrument; confirm it covers the second plot

The Work bullet on `usePlotSize`'s `offsetHeight - clientHeight` subtraction is
right and incomplete. That correction is held by **one assertion** in
`e2e/specs/security-price-chart.spec.ts` — the uncovered ground's painted box must
end above the plot's own bottom edge, by more than nothing and less than two
pixels — and that assertion is about the **price** plot. The volume columns are
the second fill this axis carries and `CHARTING.md` §17.5 item 4 names them as
such. **Confirm the assertion covers this plot too, or add its pair.**

Add to **Done when**:

- The plot draws no gridlines and no intraday times, carries the first and last
  session date via `sessionLabels: "ends"`, and keeps the full `--chart-gutter`
- The plot reads `provenance.sources` and not a single feed label
- The extent band is measured at `1d` and decided from the number, or explicitly
  handed to the task holding the `1d` body
- The axis-rule-pixel assertion covers the volume plot, break-verified

---

## Amended 2026-09-13 by Task 2.13.3 — the arithmetic exists, so this task is a renderer; and it inherits a wrapper question one task early

Everything below is a **narrowing**. Nothing was added to this task's scope and
nothing was taken out of it, but four of its Work bullets now resolve to a named
function rather than to a decision, and two things want stating before they are
discovered.

### What to call, and the one call this task replaces

`chart-geometry.ts` now has three functions where it had one:

```
timeFrame(width, density, subject) -> TimeFrame     // the only thing that takes a window
priceFrame(time, height, bars)     -> PricePlot
volumeFrame(time, height, bars)    -> VolumePlot
```

**Neither plot function is handed a `TimeRange` or a `Timeframe`**, so neither can
build an axis — which is the structural form of this task's _"two plots must stop
at the same pixel"_ bullet. `chartFrame(plot, density, subject)` survives as the
composition of the first two, and **this task is what replaces it**: one
`timeFrame` call, then a plot frame per region. Delete the composition when the
last caller goes.

`VolumePlot` carries four fields and no others: `columns` (the whole plot as one
path string, or `null`), `columnWidth` (the `stroke-width`, fractional),
`stems` (how many, for tests) and `peak` (the gutter's one label, or `null`).
`market/index.ts` also exports `volumeDomain`, `volumePeak`, `volumePeakLabel`,
`formatVolume`, `formatVolumeExact` and `spokenVolume`.

### The coverage clip is this task's, and the baseline is not a mark

Two halves of §13.1 resolved differently, and the second is a correction to the
canvas:

- **The clip is the renderer's.** `TimeFrame.coverage` is one object shared by both
  plots, so the two stop at the same pixel by arithmetic — but `volumeFrame` does
  no clipping itself. Clip the columns with `coverage.covered` the way
  `PriceChart` already clips the line and the two washes, and paint the uncovered
  ground **in this plot** rather than inheriting the one above.
- **There is no separate volume baseline to clip.** §13.1 lists "the volume
  baseline" among the marks that stop at the coverage edge and §9.4 says volume's
  axis rule **is** its true zero. Those are the same line; it is derived from the
  window, so **it runs the full frame** like every other mark of that kind. What
  stops at the coverage edge is the columns. Do not go looking for a second mark.

### The element-count guard, now that the shape is known

The geometry emits **one `<path>` whatever the window**, and the stem count is
bounded by the plot's width rather than by the bar count. So the guard to copy
from `PriceChart.test.tsx` asserts that the rendered element count is identical at
30 bars and at 1,950 **and that the path strings differ**, which is the "evidence
the inputs differed" half. `chart-geometry.test.ts` already holds the arithmetic
half of this; what is owed here is the same claim about **rendered elements**,
break-verified by drawing one `<rect>` per bar and watching it go red.

### Two things measured while building the geometry, both of which you will see

- **A 1 px gap is measured against the pitch, not against a bar's share of the
  plot**, and §10.3's table divides by the wrong one of the two. At 30 bars on an
  867 px plot a column of `width / slots − 1` leaves a **2.0 px** gap, and at 3M's
  63 bars a **1.22 px** one, against §10.2's stated 1 px. The geometry now divides
  by `slots − 1`; above a few hundred bars the two are the same number to three
  decimal places, and the table's figures stand as a description rather than as an
  input. No action here — recorded so the figure is not re-derived from the table.
- **The first and last columns are half-clipped, and that is a judgement this task
  can see and the geometry cannot.** `scaleSlot` puts the first bar at x = 0 and
  the last at x = width, so a 27.9 px column centred on either end has half of
  itself outside the plot. At 1,950 bars it is invisible; at a 30-bar window it is
  two visibly narrow columns. The price line has the same property and it does not
  show, because a line has no width. **Look at it at 3M on screen and decide**: an
  inset x-domain for the volume plot would fix it and would break the shared-axis
  property, so the honest options are to accept it or to inset **both** plots —
  which is a change to the price chart and wants saying out loud. `CHARTING.md`
  §12.6 is the precedent for a rendering a simulation cannot fault and a person
  can.

### And the wrapper arrives here rather than in 2.13.5

`VOLUME-AND-WINDOW.md` §15.1 hands 2.13.5 a **wrapper that renders `children`
through unchanged**, so the read position re-renders the two reading overlays and
**neither frame owner**. Whatever component this task writes to call `timeFrame`
once and hand it to both plots **is that wrapper's frame half**. Build it as a
component that owns the shared frame and renders two regions' plots, and 2.13.5
adds the read position to it; build it as a `useMemo` inside `SecurityExplorer`
and 2.13.5 starts by moving it. Naming it now costs nothing and the alternative is
a refactor inside the task that has the pointer-path regression in it.

Add to **Done when**:

- `chartFrame`'s last caller is gone, one `timeFrame` serves both plots, and a grep
  finds no second `timeAxis` call in a component
- The volume columns are clipped to the **shared** `coverage.covered`, and the
  uncovered ground is painted in this plot rather than inherited
- A rendered-element guard asserts the count is flat in the bar count, with
  evidence the inputs differed, break-verified
- The half-clipped end columns are looked at on screen at 3M and the answer is
  written down either way

---

## What was built — 2026-09-13

### The shape it took, and the one decision that was open

The task file left one thing genuinely open — _"decide whether volume is a sibling
component in a new directory or a second plot inside the existing one"_ — and
2.13.3's amendment added a second, the wrapper that owns the shared frame. They
resolved together.

**One directory, `components/PriceChart/`, and three new components in it.** The
directory already held two components (`PriceChart` and `ChartReading`), so
`src/components/`'s _one component per file_ rule is satisfied and its
_one component per directory_ habit was already not a rule here. What decided it
is that the volume plot shares four modules with the price plot —
`chart-geometry`, `chart-alternative`, `chart-subject` and `use-plot-box` — and a
second directory would have put two halves of one instrument in two places joined
by an import that says nothing about why. **The directory name is now the chart
layer's rather than one chart's**, which is a stale name; renaming it to
`components/Chart/` was weighed and declined, because it moves six files' imports
to buy a word, and `CLAUDE.md`'s rule about renaming — remap every reference in
the same change — makes that a change worth doing when there is a second reason,
not as a side effect of this one.

| New file                 | What it is                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `ChartAxis.tsx`          | The wrapper: one `timeFrame` call, `children` rendered through unchanged                                 |
| `chart-axis-context.ts`  | The context, the `ChartPlotRole` type, and `useChartAxis` — which **throws** outside a provider          |
| `VolumeChart.tsx`        | The plot                                                                                                 |
| `chart-subject.ts`       | `chartSubject` / `drawsAFrame`, moved out of `PriceChart.tsx` so both plots read the state union one way |
| `use-plot-box.ts`        | `usePlotSize`, extracted unchanged, because the axis-rule pixel must not exist in two versions           |
| `chart-marks.module.css` | The marks both plots draw — canvas, seam, uncovered ground, coverage edge, tick labels                   |

**`chartFrame` is gone**, as the amendment required. Its last three callers were
tests and stories; `chart-geometry.test.ts` composes it locally instead, under a
comment saying why the shipped version could not survive — a function taking a
whole `PlotBox` is a function that can build an axis out of one plot's height,
which is precisely what a second plot must not be able to do.

### Why a context and not a parent component

The obvious shape — one component rendering both regions — is unavailable, and
that is a property of the page rather than a preference. `PRODUCT_SPEC.md` §8.3's
reading order puts the **Abnormal-move** region between Price and Volume in the
DOM, and `VOLUME-AND-WINDOW.md` §9.1 already records that at one column the two
plots are unavoidably a screen apart. A component rendering them as siblings
would have reordered the page to suit its own implementation.

So `ChartAxis` wraps the grid in `SecurityExplorer` and renders `children`
through. That is also §15.1's required shape for 2.13.5 arriving one task early:
the read position goes into this same component, and React then re-renders the
two reading overlays and **neither frame owner**.

### The measurement, and the one thing that is not obvious about it

Both plots measure their own box. **Only the width is shared** — each plot draws
at `frame.width` and at its own measured height, which is what makes "two plots
stop at the same pixel" arithmetic rather than two elements happening to be laid
out identically. Two equal-width elements measured a frame apart are two
different numbers for one render.

`ChartAxis` keeps **two measurement slots with a stated precedence**, price
first. Both plots report; the price plot wins where it exists. That is not
defending against a disagreement — they are the same width by construction — it
is avoiding two components with no ordering between them writing the same state
on every resize. It also means a volume plot can be reviewed on its own in the
workshop, and that Epic 11's agent, which can open a chart of its choosing, is
not obliged to open two.

`useChartAxis` **throws** outside a provider rather than falling back to a
private frame. A fallback's failure mode is the quiet one: two plots that each
built their own axis look right at every width where they agree. The cost is that
`PriceChart`, `BarSeriesPanel` and `VolumeChart` are only renderable inside a
`ChartAxis` — so their tests and stories wrap, which is the real arrangement
rather than a convenience.

### Three things found by doing it

**1. The end columns paint _outside_ the plot, and that is a defect rather than
the trade-off 2.13.3 described.** `scaleSlot` puts the first bar at x = 0 and the
last at x = width, so a column centred on either end has half of itself outside
the frame — and `.canvas` declares `overflow: visible`, which every other mark on
this axis needs. At a thirty-bar window that is up to **14 px of near-grey
painted into the panel's padding**. The columns are therefore clipped to the plot
box, with a second `clipPath` on a wrapping `<g>` because an element takes one
`clip-path` and the path already spends its on the coverage span.

**2. The half-width end columns are accepted — looked at, not reasoned about.**
With the clip in place they render at half width. Reviewed in the workshop at
thirty bars (`Market/VolumeChart → Wide`) and at the compact width, which is the
density §10.3 says it is visible at. The answer is **accept**, for three reasons:
the height is the datum and the height is exact; a column clipped by the frame it
sits on the edge of is the ordinary convention for this chart, not an artefact;
and the only repair that keeps the shared axis insets **both** plots, which would
move the price chart's first and last points off the frame's edges and make the
coverage edge stop somewhere other than where the window does — a real change to
a shipped chart, to round two columns. **Re-look at 2.13.6's 3M and 1Y windows**,
where the column is 12.8 px rather than 28.9 and the proportion changes.

**3. A workshop fixture is a live claim too.** The task file warned that
`RegionPlaceholder`'s stories use the Volume region's sentence as fixture text.
They did, and they also carried `filledBy="Story 2.13 — Volume Chart"` — so
filling the region would have left a workshop page saying the product still plans
something it had shipped. The Volume entry was removed from that list rather than
edited, and the list's comment now says why it is five.

### What was measured on the running page

Taken 2026-09-13 in Chromium at 1440×1000, against a developer's store (which
answers the default five-session window four-fifths short — the honest `partial`
that the deployed store does not show):

| Property                         | Price plot                        | Volume plot       |
| -------------------------------- | --------------------------------- | ----------------- |
| SVG x / width                    | 104 / 928.66                      | **104 / 928.66**  |
| Uncovered ground x / width       | 289.8 / 742.9                     | **289.8 / 742.9** |
| Vertical marks (seams + edge), x | 185.8, 371.7, 557.5, 743.3, 185.8 | **identical**     |
| Ground's bottom vs plot's bottom | 1 px                              | **1 px**          |

186 stems for 390 held bars, which is the **silhouette regime** and is correct:
the axis is the five-session window's 1,950 slots, so the pitch is 0.48 px and the
plot draws one stem per covered pixel. The default window this product opens at is
therefore the regime that proves the rendering decision, not the one that avoids
the question.

### The obligations this task inherited

- **`provenance.sources`, owed from 2.13.1** — done. The volume plot's text
  alternative reuses `chart-alternative.ts`'s `feedClause`, which already reads
  the sources array and names every distinct feed. Nothing here reads a single
  feed label, so Story 2.14's seam does not need this plot rebuilt to tell the
  truth about an IEX tail whose volume is a fraction of the market's rather than a
  sample of it.
- **The axis-pixel assertion covers the second fill** — done, as its own test,
  and **break-verified**: setting `axisRule` to zero in `use-plot-box.ts` takes
  _the uncovered ground stops above the axis rule_ and _the volume columns stop
  above the axis rule_ red **together**, and leaves the other 101 green.
- **The high–low extent band (§13.3) is handed to 2.13.6, by name.** It cannot be
  measured here: the measurement is the band's height in pixels at 3M and 1Y
  against a real `1d` body, no `1d` body has been recorded, and §2.3 makes
  recording one **2.13.6's**. This is the "say which, rather than letting it fall
  between them" the amendment asked for. `--price-unchanged-wash` still has no
  application consumer.

### What is checked, and by what

| Claim                                                           | Held by                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Element count is flat in the bar count, inputs proved different | `VolumeChart.test.tsx` — break-verified at **1,951 against 31**                                        |
| The columns are clipped to the plot                             | `VolumeChart.test.tsx` — break-verified                                                                |
| No gridlines, no intraday times, one peak label                 | `VolumeChart.test.tsx`                                                                                 |
| The chart is **inside** the Volume region, at three viewports   | `e2e/specs/security-price-chart.spec.ts`                                                               |
| Both plots' marks stop at the same x                            | the same spec — box, every vertical mark, and both grounds                                             |
| The volume fill does not paint over the axis rule               | the same spec — break-verified                                                                         |
| Marks are **counted**, never `toBeVisible()`                    | the same spec; a vertical seam is zero pixels wide                                                     |
| The frame recomputes zero times across forty arrow presses      | `PriceChart.test.tsx`, its counter **re-pointed at `timeFrame` and `priceFrame`** rather than replaced |

`pnpm verify` and `pnpm e2e` both pass — 775 unit/component tests and 103 browser
tests. One note on the browser suite rather than a clean claim: on the first full
run after this change, `the shell has no axe violations at 640px` reported one
`color-contrast` violation and passed on both subsequent full runs and in
isolation. That is the shape of the pre-existing `settleAnimations` race the axe
helper documents — the universe table's entrance read mid-fade — rather than a
finding about this chart, and it is recorded here rather than smoothed over
because it was seen once.

---

## For the stakeholder — what this actually means

**The short version: the Volume panel on a security's page is no longer a promise.
It draws.**

Open `/securities/NVDA` and there are now two pictures where there was one. The
top one is the price line that arrived last week. Directly beneath it, at the same
width and on the same timeline, is how much of that security actually changed
hands, minute by minute. That is the second half of what this stage of the project
promised to deliver — _"recent historical price **and volume** data"_ — and it is
the first thing MarketPulse has drawn that shows one mark per minute of trading
rather than a single continuous line.

**Why volume matters enough to build a whole panel for it.** MarketPulse's job is
to spot market behaviour that is unusual and then help a person work out why.
"Unusual" is very often a volume statement rather than a price one: a share that
moves 2% on a normal day's trading is noise, and the same 2% on four times the
usual volume is something happening. The headline claim in the product
demonstration we are building towards — _"volume 3.8× normal"_ — is a claim a user
has to be able to **check by looking**. This panel is where they look. Everything
the anomaly scoring does later hangs off it.

**Three decisions worth knowing about, and why they went the way they did.**

_We made the two pictures physically share one timeline, rather than two pictures
that agree._ This sounds like an implementation detail and is the single most
important thing in the task. If the price chart and the volume chart each worked
out their own timeline from the same request, they would agree almost always — and
disagree by a few pixels whenever one of them was measured a fraction of a second
after the other, or whenever the window changed. A volume spike sitting slightly
to the left of the price move it caused is worse than no volume chart at all: it
is a chart that lies quietly. So there is now exactly one timeline, computed once,
handed to both. They cannot drift, because there is nothing to drift from. We
measured it on the real page: every shared mark on the two charts lands on the
identical pixel.

_We kept the volume chart deliberately quiet._ No gridlines, no second row of
clock times, no colour on the bars, and a value scale of exactly one number — the
busiest minute in the window. Every one of those was a default we turned off. The
volume chart is a supporting act: its job is to let you see, at a glance, where
the trading was heavy, and then get out of the way of the price chart above it.
A second full set of chart furniture underneath the first would double the visual
noise for the less important of the two pictures. It is a third of the height of
the price chart for the same reason, and that third is a calculated number rather
than a guess — it is the height at which a normal day's bar is still clearly
readable when there is a 3.8× spike in the same window pushing the scale up.

_We did not colour the bars green and red._ This is worth flagging because it is
the thing people expect, and it is the thing we deliberately declined. Colour on
its own is not readable by everyone — roughly one man in twelve cannot reliably
separate red from green — so this product's standing rule is that colour is never
the only thing carrying a meaning. The price chart obeys that by using _position_:
the line finishing above or below a dashed marker is what tells you the direction,
and the colour just repeats it. A volume bar has no position left to spend — it
starts at the bottom and its height already means "how much". So colouring it
would have been colour carrying a meaning on its own, which is exactly what we
don't do. Volume is a quantity, and it is drawn as one.

**The performance problem underneath it, solved.** The default view holds nearly
two thousand minutes of trading, and the widest view this story will offer holds
over eight thousand. Drawing one shape per minute would put roughly ten thousand
objects on the page and freeze the browser for a fifth of a second at a time —
which we know because we measured it doing exactly that. So the chart draws the
whole thing as **one** object, and at densities where several minutes share a
single pixel it draws one mark per pixel carrying the busiest minute in it. The
picture is pixel-for-pixel identical; the cost stops growing. There is an
automated test that fails if anyone ever changes this back, and we deliberately
broke the code to confirm the test actually catches it.

**What a user still cannot do, and when they will be able to.** They cannot yet
point at a volume bar and read its exact figure — that is the next task, which
extends the existing crosshair to answer for both charts. And they cannot yet
change the period: today everything shows the last five trading sessions, and the
control that offers a day, a month, three months and a year is two tasks away. It
is deliberately in that order. One picture on a timeline that is already correct
is a smaller problem than a control that changes both at once, and building it
this way round means the control arrives with something real to move.

**Where the project is.** The security page now has two of its seven panels
filled, both of them drawing real market data from the 48 million bars we hold.
The remaining five name the later stage of work that fills them, honestly, on the
screen. After the next three tasks this stage of the project is functionally
complete: a person can find a company, open it, choose a period, and inspect its
price and volume history against primary data — which is the foundation everything
else in MarketPulse is built on top of.
