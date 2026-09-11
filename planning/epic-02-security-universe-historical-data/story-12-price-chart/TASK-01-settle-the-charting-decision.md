# Task 2.12.1 — Settle how MarketPulse draws, measured, shipping no chart

**Status:** Not started
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** Story 2.11 (complete)

## Objective

Take this story's three open decisions — **library or hand-built**, **line or
candlestick**, and **how the x-axis handles market gaps** — plus two more that
this story cannot avoid and no later task should be left to take by accident,
and write them down in **`CHARTING.md`** in this directory before a pixel is
drawn.

Tasks 2.9.1, 2.10.1 and 2.11.1 are the precedent and the argument is stronger
here than it was for any of them: **this decision is inherited by Epic 5's
anomaly markers, Epic 6's topology, Epic 8's comparison charts and Epic 11's
agent-opened charts.** A renderer chosen for one line on one page is a renderer
four epics are then stuck with, and the way that goes wrong is not that the
wrong one is picked — it is that nobody records what it was picked against.

The document is named `CHARTING.md` rather than `PRICE-CHART.md` deliberately.
Only a fraction of what is settled here is about price.

## What the user can see when this lands

**Nothing.** No chart, no axis, no line. The payoff is Task 2.12.4, which puts
the first chart in MarketPulse on screen. Say "nothing visible" plainly when
reporting it and name that task, which is this repository's rule rather than a
turn of phrase.

The spike written to take the measurements below is **throwaway** and is deleted
in this task, not carried into 2.12.4. What survives it is figures in a
document.

## Work

Settle each of the following in `CHARTING.md`, each with the alternatives that
were weighed and a **reversal trigger that is a condition rather than a story
number**.

- **Open decision 1 — library or hand-built.** Measure it the way Story 1.5
  measured the router and Story 1.4 measured its component library, because
  criterion 7 asks for exactly that shape:
  - **Bundle cost**, gzipped and as a share of the current bundle. Take the
    current figure rather than citing one — `pnpm build` and read `dist/`.
  - **What the output is.** SVG, canvas or WebGL, and whether the marks are in
    the accessibility tree at all. A canvas chart has no DOM to describe, which
    decides how Task 2.12.8's text alternative has to be built.
  - **Whether it types well** under `exactOptionalPropertyTypes` and
    `nodenext`. A library whose types force `any` at the seam is a library that
    has defeated the reason this repository is typed.
  - **What it does at the point counts §28 implies** — 10,000 bars is what this
    API can serve — and whether that is a first-paint cost or a per-frame one.
  - **What its default appearance costs to undo.** The story's own bar says a
    chart is the single easiest place to ship a library's defaults; a renderer
    whose look can only be changed by fighting it is a renderer that fails test
    2 of the four.

  Whichever is chosen, **it goes behind a wrapper in `src/components/<Name>/`
  with our vocabulary in its props**, exactly as `Popover` wraps Base UI. That
  part is not open.

- **Open decision 2 — line or candlestick for V1**, and whether that is a
  per-timeframe answer. The bars are already stored with all four prices, and
  `PopulatedBarSeries` carries them, so this is a design and legibility question
  rather than a data one. Note what 780 candles at the width of a full-width
  region actually looks like before answering; a candle body narrower than a
  device pixel is a line drawn expensively.

- **Open decision 3 — the market gap.** A continuous time axis draws a flat
  weekend into every chart; a session-ordinal axis draws none and stops being a
  real time axis. Say which, say what the tick labels then mean, and say what
  happens to Epic 9's filing markers, which are events at instants and have to
  land somewhere on whichever axis this is.

- **Decision 4, which the story does not list and this task adds — the default
  window.** `SecurityExplorer.DEFAULT_SESSIONS` is 5 at `1m` today and was
  chosen so the panel would have bars in it. A chart is a different consumer:
  [`MARKET-DATA-API.md`](../story-09-market-data-api/MARKET-DATA-API.md) §12 and
  this story's own 2.9.9 amendment record that a month of minute bars is ~1 MB
  and ~2.5 s from the UK, and that **nothing on the path compresses**. Decide
  the default this chart opens at, and record that §28's 500 ms is satisfied by
  the frame and axes painting immediately rather than by a fast response. The
  **window control itself is Story 2.13's** — this is the default, not a
  control.

- **Decision 5 — what happens to the stated facts.** `BarSeriesPanel` today
  renders the window asked for against the window held, the bar count, the four
  prices and the feed. A chart replaces the _drawing_ of the series; it does not
  replace **coverage and provenance**, which invariant 6 and §36 both require
  and which are the reason that panel is honest. Say which facts move into the
  chart's own chrome, which stay beside it, and which stop being rendered — and
  if anything stops, say why it is no longer needed rather than that it did not
  fit.

- **Two things you inherit and must not re-take.** A window is **named and
  resolved by the server**, never computed from the browser's clock
  ([`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
  §3 and the route's own comment). And **`partial` is an answer**: a chart must
  be able to draw a series that stops before its own x-axis does. Record both
  where the next seven tasks will read them.

- **Read the design surface against
  [`VISUAL-LANGUAGE.md`](../../epic-01-application-foundation/story-04-ui-component-library-and-styling-conventions/VISUAL-LANGUAGE.md)
  and [ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md),
  and record what is a question for Task 2.12.2 rather than answering it here.**
  The canvas is the source of truth for the language; this document is the
  source of truth for the mechanism. Where a value is wanted — axis ink,
  gridline weight, the up/down pair — that is 2.12.2's, and the list of what it
  is being asked for belongs here.

## Done when

- `CHARTING.md` exists and settles five decisions, each with alternatives and a
  reversal trigger that is a condition
- The library-or-hand-built decision carries **measured** bundle, output, typing
  and point-count figures, taken in this repository today, not cited
- The spike used to take them is deleted — verified by `git status`
- The default window decision states the payload size and latency it was taken
  against, and names where the figure came from
- Decision 5 says what happens to every fact `BarSeriesPanel` renders today
- Nothing is added to `apps/frontend/src` that ships
- `pnpm verify` passes, which for a documentation task means `pnpm links` in
  particular

## Notes

The likeliest scope leak is drawing something while deciding what to draw with.
A spike that renders a line to take a measurement is the point; a spike that
acquires states, tokens and a story is Task 2.12.4 happening early, in a file
that will be deleted.

The second likeliest is settling the volume chart here because it shares the
axis. It does share it, and that is why the axis module in Task 2.12.3 is built
as one — but **Story 2.13 owns volume and the window control**, and a decision
taken here on volume's behalf is taken without volume on screen to take it
against.
