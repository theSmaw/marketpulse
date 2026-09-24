# Task 3.10.5 — The edge that stopped, and the gap in the middle

**Status:** Not started
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.2

## Objective

The chart's two degraded shapes, which Story 3.9 built the surface for and
deliberately left undrawn.

## What the user can see when this lands

**A chart that stopped extending says so**, and a chart with a hole in the
middle stops drawing a straight line across it as though nothing were missing.

## The two shapes, and they are different problems

### 1. The stopped edge

Story 3.9's close: _the line simply stops growing, and nothing says so._ There
is no marker, no fade and no gap — **the plot ends at the last bar that arrived
and looks exactly like a chart of a window that ended there.**

Task 3.9.3 took that deliberately, with three noes, on the reasoning that
nothing should be drawn until there is a vocabulary for it. **You are the
vocabulary.**

Two facts sharpen it:

- **The chrome already speaks.** The feed cell says `STALE` or `DISCONNECTED`
  and the chart says nothing — two surfaces, one fact, one of them silent. That
  is this file's own recurring defect shape.
- **The reading strip keeps answering.** A reading **holds its instant** (Task
  3.9.6), so a crosshair parked on the last bar reports it correctly and
  indefinitely after the feed dies. That is right, and it means the strip is
  **not** where a reader would learn the feed stopped.

### 2. The gap in the middle — and its reversal trigger has FIRED

Task 3.5.5 refused to invent missing minutes, on the grounds that _a reconnect
that silently invents them is worse than one that plainly resumes_. **Its
recorded trigger is a condition: the first surface where a gap in the middle is
visibly wrong rather than merely absent — a chart drawing a straight line across
four missing minutes.** Story 3.9 built that surface. The trigger has fired.

**The axis closes gaps up by design** (session-ordinal, ADR 0027), which is
correct for a weekend and wrong for a dropout. `CHARTING.md` §3's own reversal
trigger was evaluated by Task 3.9.1 and had **not** fired then. **Re-evaluate
it here**, because the input has changed.

## The trap the store hands you

**Nothing in the store tells a dropout from a quiet security** (Story 3.8's
close). `bar_coverage` is extended to the last bar seen, so a disconnection
between 10:00 and 11:30 leaves ninety minutes **inside a covered window with no
rows in them** — indistinguishable from ninety minutes in which nothing traded,
which on IEX is ordinary.

**Only this story knows the connection dropped**, and only while the page is
open: **after a reload the page has no memory of it at all.** A reader who
reloads during a gap sees a thin chart and no explanation. Decide what that
reader gets, explicitly.

## Work

- The stopped edge's treatment, argued against the real thing on a real screen
  the way Task 3.4.4 argued the arrival mark
- The gap-in-the-middle treatment, and `CHARTING.md` §3's trigger re-evaluated
- What a reader who reloads during a gap is told, decided rather than defaulted
- Both drawn on both plots, since they share one axis and one reading
- Browser assertions against a produced disconnection, using 3.10.2's harness
- `pnpm probe` at four viewports if either plot's shape moves

## Done when

1. A stopped edge is distinguishable from a finished window, asserted
2. A gap in the middle is not a straight line, or the decision not to change it
   is written down with its trigger
3. The reload case has an answer
