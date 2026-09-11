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

- **Paint the frame immediately.** ~~The measured reality is ~0.6 s for one
  session and ~2.5 s for a month from the UK, with nothing on the path
  compressing.~~ §28's "visible feedback within 500 ms" is satisfied by the frame,
  the axes and the loading treatment being there before the series is — design
  for that, which §36 requires anyway. The loading treatment itself is 2.12.7's
  to finish; what this task owes is that the frame is not conditional on the
  data.

  > **Amended 2026-09-11 by Task 2.12.1 — the struck figures are stale, the
  > instruction is not.** `@fastify/compress` was registered by Task 2.9.10 on
  > 2026-09-10, the same day the figures above were taken. Live, deployed from
  > the UK: **the default window is 29,072 B and ~399 ms**, one session is
  > ~333 ms, a month is 154,480 B and ~1,210 ms
  > ([`CHARTING.md`](CHARTING.md) §4).
  >
  > **The instruction stands and is not weakened.** The default window now
  > clears 500 ms on its own, which is exactly why this bullet matters: it would
  > be easy to conclude the frame-first rule is no longer needed. It is —
  > Story 2.13's control offers the month that still costs 1.2 s, and Epic 13's
  > replay will ask for windows nobody has measured. **The frame is never
  > conditional on the data.**

- **The x-axis domain comes from `coverage.requested`, and this is the task that
  decides it.** [`CHARTING.md`](CHARTING.md) §6.2 is emphatic about this and it
  is easy to read as 2.12.7's problem because `partial` is the state that makes
  it visible. It is not — it is a line of code in _this_ task, and getting it
  wrong here means 2.12.7 retrofits the axis rather than drawing a state.

  Derive the domain from the bars and a `partial` series silently rescales to
  fill the frame and **looks complete**: no error, nothing red, and no test below
  `pnpm e2e` able to see it. `loaded` is the one member where the two derivations
  agree, so building against `loaded` alone will not reveal the difference.

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

---

## Amended 2026-09-11 by Task 2.12.2 — the instrument is decided, so this task implements rather than chooses

The Work section says the chart is drawn "in whatever arrangement Task 2.12.1's
decision 5 settled" and leaves its appearance open. It is no longer open:
[`CHARTING.md`](CHARTING.md) §7.1 indexes the answers and
`VISUAL-LANGUAGE.md`'s _The chart_ section carries the reasoning. The tokens are
in `tokens.css`, `market.css` and `styles/tokens.ts` already.

**What to build, as a list rather than as a search:**

- **One rule, along the bottom.** `--chart-axis`. No left spine, no right spine,
  no top, no surrounding box. The plot keeps `--surface-raised` — there is no
  chart ground and no token for one.
- **A right-hand gutter** of `--chart-gutter` (56px, 46px below 600px of region)
  for the value scale. **Not labels inside the plot**: drawn that way on the
  canvas at the measured 1,019px region, the topmost label sat on the series.
- **`--chart-height` / `--chart-height-compact`** — 280px and 220px, switching at
  600px **of region**.
- **Horizontal gridlines only**, `--chart-grid`. The one vertical rule is the
  **session seam**, `--chart-seam`, dashed, full plot height — and the tick label
  there carries the date while everything between carries the time.
- **The series** is `--chart-series` at `--chart-series-width`, achromatic,
  whatever the window did.
- **Axis labels** are `--font-data` at `--font-size-micro` in `--ink-secondary`.
  The micro-label idiom's size and ink are adopted; its uppercase and
  letterspacing are **not** — a number has no case.

**Two boundaries this amendment draws, because both are now easy to cross by
accident:**

1. **The dashed reference rule and the directional wash are
   [Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md)'s**,
   not this one's. They look like frame and they are not: they are the mechanism
   that carries direction without colour, and 2.12.5's own fence is that the pair
   is inseparable. Drawing the rule here and the fill there is how a chart ships
   with a tint and no geometry under it.
2. **`--chart-uncovered` and the dashed coverage edge are
   [Task 2.12.7](TASK-07-every-chart-state-drawn.md)'s.** What _is_ this task's is
   the x-domain coming from `coverage.requested` — which the Work section already
   says, and which is still the line of code that decides whether 2.12.7 draws a
   state or retrofits an axis.

**And one thing the frame-first rule now has a shape for.** "The frame is never
conditional on the data" is a stronger instruction than it looks once the frame
is this specific: the bottom rule, the gutter, the gridlines and the plot height
are all computable from the region's width alone. Only the _labels_ need a
domain. So the loading state is a real frame with an empty scale, not a box.

---

## Amended 2026-09-11 by Task 2.12.3 — what is already built, so this task draws rather than derives

All of the arithmetic is in `src/market/` and leaves it through `index.ts`. The
three calls this task makes:

- **`timeAxis(view.series.coverage.requested, timeframe)`** — the x-domain,
  session-ordinal, weekends and holidays already absent. This _is_ §6.2's rule;
  there is no separate line to remember. Then `placeBars(axis, series.bars)` for
  the points and `seamSlots(axis)` for the dashed verticals.
- **`priceDomain(series.bars)`** then `linearScale(domain, [plotHeight, 0])` — the
  descending range is the ordinary case, and the flat series is already handled.
- **`chartDensity(regionWidth)`** — tick counts, the label policy, and a
  `compact` flag. **It does not return pixels**: read `--chart-gutter` /
  `--chart-gutter-compact` and `--chart-height` / `--chart-height-compact`
  through `styles/tokens.ts` and hand the numbers in, because CSS is the source
  of truth for a token.

**The gutter is an input to the horizontal range, not padding applied
afterwards.** `slotScale(axis.slots, [0, regionWidth - gutter])`. A scale built
against the region width draws a line that runs under its own labels, and
nothing below `pnpm e2e` can see it.

`formatPrice` for the value labels and the tick's own `label` for the time axis —
both already formatted, and neither is a second spelling to write here.
