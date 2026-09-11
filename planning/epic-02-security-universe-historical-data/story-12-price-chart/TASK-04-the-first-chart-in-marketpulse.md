# Task 2.12.4 — The first chart in MarketPulse

**Status:** Not started
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.2, 2.12.3

## Objective

Draw it. Put a security's real price history on screen, in the **Price** region
of the Security Explorer that has been waiting for it since 2026-09-11, and take
down the fence that has kept it empty.

This is the story's payoff and, by the story's own words, **the moment the
product looks like the thing it is meant to be**. Everything from 2.1 to 2.11 is
visible in one line being correct: the database, the universe, the calendar, the
provider, the backfill, the API, the state layer and the security page.

## What the user can see when this lands

**A chart.** Open `/securities/NVDA` and see its price over the default window,
drawn, with a time axis that skips weekends and holidays because Story 2.5
exists, gridlines, a price axis, a reading of the current value, and the feed it
came from because invariant 6 requires it.

**This is the thing to demonstrate**, and the first screenshot of this
repository that is worth showing somebody without explaining what it will become.

What a user still cannot do: see volume, or change the window. Story 2.13.

## Work

- **Take the fence down deliberately, and in this commit.** Two artefacts assert
  that nothing is drawn: `BarSeriesPanel.tsx`'s header states it, and
  `e2e/specs/security-series.spec.ts`'s last test asserts the region contains no
  `<canvas>` and no `<svg>`. Story 2.10 wrote that the removal is this story's
  call to make deliberately and that **the spec is the thing to change first,
  with a reason**. Change it to assert what is now true — that the region draws
  a series — rather than deleting it, so the instrument survives the fence.

- **Replace the contents of the region, not the page around it.** The grid, the
  heading, the span and the region's landmark name are inherited from Task
  2.11.7 (`SecurityExplorer.tsx`). The region is **full width** and narrows with
  the viewport, so **the chart's breakpoints are the region's, not the page's**
  — and nothing below `pnpm e2e` can see either fact, because jsdom computes no
  layout.

- **The component, behind our vocabulary.** `src/components/<Name>/` with
  `<Name>.tsx`, `<Name>.module.css` and `<Name>.stories.tsx`, props that are a
  **declarative description of what to draw** rather than a renderer's
  configuration — which is the shape Epic 11 needs, because an agent command
  will one day produce them.

  It takes the `BarSeriesView` **whole and never spread**
  ([`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
  §1), it fetches nothing, and `useBarSeries` stays where it is — in the route —
  so the workshop can render it with no backend running.

- **The happy path and whatever it cannot render without.** `loaded` is this
  task; every other member of the union is Task 2.12.7's, deliberately, and the
  two are different kinds of work. A placeholder that says "state not yet drawn"
  is acceptable for exactly one task and is named as temporary in the code.

- **Coverage and provenance stay on screen**, in whatever arrangement Task
  2.12.1's decision 5 settled. A chart that draws a line and drops "we hold 780
  of the minutes you asked for, through 16:00" has made the product less honest
  in exchange for looking better, which is the one trade this repository does
  not make.

- **Paint the frame immediately.** The measured reality is ~0.6 s for one
  session and ~2.5 s for a month from the UK, with nothing on the path
  compressing. §28's "visible feedback within 500 ms" is satisfied by the frame,
  the axes and the loading treatment being there before the series is — design
  for that, which §36 requires anyway. The loading treatment itself is 2.12.7's
  to finish; what this task owes is that the frame is not conditional on the
  data.

- **Verify the line against the store, not by eye** — acceptance criterion 1.
  A test that asserts the rendered marks correspond to the fixture's bars, and a
  spot check against the database for the deployed symbol.

## Done when

- `/securities/NVDA` renders a correct price series in the Price region
- The browser spec that asserted nothing was drawn now asserts something is, and
  its change carries the reason in the commit
- The component lives under `src/components/<Name>/`, has stories, takes the view
  whole, and fetches nothing
- The frame and axes render before the series arrives
- The series is verified against stored bars rather than by eye
- A browser spec asserts the chart is inside the Price region at all three
  viewports — the only level that can see it
- axe reads zero violations on the page
- `pnpm verify` passes

## Notes

Three fences, all of them things that will feel natural to do here.

**Every other state is 2.12.7's.** This task is about the chart being right;
that one is about it being honest, and combining them is how the second half
gets shortened.

**Interaction is 2.12.6's.** A hover that reads a point is not a small addition
to a static chart — it is a keyboard model, a readout, and a live region, and it
has a task.

**The window control is Story 2.13's.** The default window is a constant this
chart reads, not a control it renders.
