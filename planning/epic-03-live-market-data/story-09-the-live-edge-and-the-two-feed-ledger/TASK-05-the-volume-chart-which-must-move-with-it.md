# Task 3.9.5 — The volume chart, which must move with it

**Status:** **Complete — 2026-09-24, and it needed no wiring.** Both plots and the shared axis read **one** value, so Task 3.9.2's single join reached all three — the volume chart has been extending since that task landed and nobody had asserted it. What this task actually owed was the **assertion** and the **trigger**, and both are done: **ADR 0023's trigger has NOT fired**, and the live edge is evidence for the decision rather than against it.
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

## What was done — 2026-09-24

### The wiring was already there, and that is the decision paying out

`ChartAxis` computes the shared frame **once**, in a `useMemo`, and provides it
through context; `PriceChart` and `VolumeChart` both call `useChartAxis()`. Both
also take `view={series.screen.shown}` — the same value, from the same
producer. So Task 3.9.2's single join reached three consumers, and the volume
plot has been extending since that task landed.

That is `VOLUME-AND-WINDOW.md` §13.1's decision paying out two epics later:
_two plots stop at the same pixel_ made **arithmetic rather than coincidence**.
What this task owed was to prove it rather than to build it.

### The assertion, and the two things it does not say

`security-live-edge.spec.ts` gains _the volume plot gains the same minute, and
both stop at the same pixel_. It pushes a held-back recorded bar and asserts:

1. **The volume plot gains a column** — subpath count + 1. The columns are
   **one path**, not one `<rect>` each, because `CHARTING.md` §1 forbids the
   obvious implementation outright at the 9,750-bar cap; so counting columns is
   counting `M` commands.
2. **The two plots agree within one slot**, before and after.

**They do not stop at the same _pixel_, and the first draft asserting that was
wrong.** Measured: 724.9 against 724.5, one slot pitch apart. A volume column
has **width** where a price point has none, and the canvas accepted half-width
end columns years before this
(`Volume and window.dc.html` §06). So the tolerance is **one slot, measured off
the plot in the test** rather than a number argued into it — `CLAUDE.md`'s rule
about tolerances applied to an assertion rather than to a layout.

**And the volume plot's right EDGE does not advance**, which the second draft
asserted and which is also wrong: a column spans its slot, so the rightmost
edge was already at the boundary the new column now fills. The column **count**
is the volume's evidence; the right edge is evidence about the shared axis.
Asserting both would be asserting one thing twice and getting it wrong once.

### ADR 0023's reversal trigger — evaluated, and it has NOT fired

> the first piece of state two features must agree about that neither owns

**The axis is not that.** It is state **one component owns** —
`ChartAxis` — and two consume through its context. There is no agreement to
reach, no synchronisation, and no second copy: a disagreement is
unrepresentable rather than prevented.

**And the live edge is evidence _for_ the no-store position rather than
against it.** The thing this task was written to watch for — an axis whose
extent stops being derived from a request and starts being derived from data
that keeps arriving — happened, and produced **no coordination problem at
all**, because the arriving data reaches the axis through the same single value
the plots read. A growing series found nothing to coordinate.

> **The trigger stands, unchanged, with the condition sharpened.** What would
> fire it is a **second surface that needs this axis and is not inside
> `ChartAxis`'s provider** — Epic 5's anomaly lane in its own region, Epic 8's
> comparison chart, or a pane an agent opens beside the chart. At that point
> two features would need to agree about a window neither owns, which is
> exactly the sentence.

### `pnpm probe` — not run, and why

The task says _at four viewports if either plot's shape moves_. **Neither
moves**: nothing is added to either plot, no element is drawn that was not drawn
before, and the arriving column occupies a slot the axis had already reserved —
measured at **0.00 px** of horizontal movement in every existing point and
column (Task 3.9.3). A probe would photograph the same four pictures Task 2.13
photographed. Task 3.9.9 owns the probe **with the feed running**, which is a
different question and still owed.

### The canvas

**The source of truth was amended rather than a new artefact invented**, which
is ADR 0026's chain the right way round and the first time this story has been
able to run it — `Volume and window.dc.html` §08 already owned _two plots, one
coverage edge_, and owned it for an edge that **sits still**.

It gains **§14 — The coverage edge MOVES**: the pair moving together as §08's
decision paying out rather than a new one; the measured slot pitch per window
(14.1 px, 2.1 px, 0.4 px) and the 0.00 px behind it; what the pair deliberately
does **not** draw, with Task 3.9.3's three noes; and the asymmetry worth
knowing — **the price plot re-ranges when a new extreme arrives and the volume
plot only when a new peak does**, so the same arriving bar moves one plot a
lot and the other not at all. Neither is a mark and neither is animated.

No new preview card: the `Design System` project's `Price chart` group already
carries the live edge, and a second card about the same edge would be the
duplication this library exists to prevent.

## For a stakeholder — a status report, 2026-09-24

### What this was

**The volume chart underneath the price chart also moves now — and we did not
write a line of code to make it.** This task turned out to be about proving
something rather than building it.

### Why it came free

The two charts on the security page — prices on top, trading volume beneath —
share a single timeline. That was a deliberate decision made two epics ago, for
a plain reason: if the two ever disagreed about where the trading day ends,
somebody pointing at a bar on one would be reading the wrong moment on the
other.

The way we made that impossible was to have both charts, and the timeline they
share, read from **one** value. So when we taught that value to grow yesterday,
all three grew. **A decision made a long time ago for correctness turned out to
pay for a feature today.**

That is worth noting because it is the opposite of the usual story. Most
shortcuts taken early cost more later.

### What we actually did

We wrote the test that proves it, and the writing of that test was the
interesting part — because **two of our first three attempts at the assertion
were wrong in ways that looked right**.

We first asserted that both charts stop at exactly the same pixel. They stop
**0.4 of a pixel** apart, and that is correct: a volume bar has _width_ where a
price point has none, so the last column extends half a bar further than the
last point. Our own design record accepted that years ago. The test now allows
one bar's width — a tolerance **measured from the chart in the test** rather
than a number somebody guessed.

We then asserted that the volume chart's right-hand edge moves forward when a
minute arrives. It does not, and that is also correct: the new column fills
space the chart had already reserved for it. We removed the assertion and wrote
down why, because an assertion that is wrong in a confident way is worse than
no assertion.

### A decision we were told to re-examine, and did

Our charts deliberately do **not** use a heavyweight state-management library.
That decision came with a written condition for revisiting it: _the first piece
of information two parts of the screen must agree about that neither of them
owns._

This task existed partly to check whether a growing chart was that. **It is
not.** One component owns the timeline and hands it to both charts; there is
nothing for them to agree about. And the thing we were watching for — data
arriving continuously rather than in one fetch — happened and caused **no
coordination problem whatsoever**.

So the condition stands, unchanged, and we have sharpened what would actually
trigger it: a _third_ surface needing the same timeline from outside the
component that owns it, which is what the anomaly indicators and the comparison
charts will be.

### Where the product stands

**Four of nine tasks done.** The last three each removed work rather than
adding it: one found a third of the story already built, one deleted a task
outright, and this one found its own feature already shipped.

**What you can see:** during trading hours, both charts on a security page
extend together, minute by minute, without a refresh.

**What is next:** making that newest minute readable — by crosshair and by
keyboard — and the ledger that says which data came from where.
