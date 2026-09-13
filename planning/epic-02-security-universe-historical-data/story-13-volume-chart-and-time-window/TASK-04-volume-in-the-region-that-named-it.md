# Task 2.13.4 — Volume, in the region that has been naming this story

**Status:** Not started
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
