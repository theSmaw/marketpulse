# Story 2.12 — Price Chart

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.11
**Epic scope covered:** Basic price chart

## Description

Render a security's price history. This is the story that answers a question this
repository has deferred since Story 1.4: **how MarketPulse draws a chart** — and it
answers it for the whole product, because Epic 6's WebGL topology, Epic 8's comparison
charts and Epic 11's AI-opened charts all inherit whatever is chosen.

## What the user can see when this story lands

**The first chart in MarketPulse, and the moment the product looks like the thing it is
meant to be.** A security's price history, drawn, on its own page, from real market data.

Concretely: open NVDA and see its price over a recent window, with a correct time axis that
skips weekends and holidays because Story 2.5 exists, labelled with the feed it came from
because invariant 6 requires it, and honest about where the data stops rather than drawing a
line to the edge.

**This is the story to demonstrate.** Everything from 2.1 to 2.11 is visible in it: the
database, the universe, the calendar, the provider, the backfill, the API, the state layer
and the security page all have to be right for one line to be drawn correctly.

What the user still cannot do: see volume, or change the time window. Story 2.13.

## Why it sits here in the sequence

It needs data, a contract, a state layer and a security to be about — all of which now
exist. It precedes the volume chart because volume shares its x-axis and its interaction
model, and building the second one first would settle those decisions by accident.

## Scope

- The charting decision: library or hand-built SVG/canvas, measured the way Story 1.4
  measured its component library — bundle cost, accessibility of the output, whether it
  types well, and how it behaves at the point counts §28 implies
- The chart itself: price over time, axes, gridlines, and a reading of the current value
- **Series type.** A line is cheap and honest for a daily series; a candlestick carries
  open/high/low/close, which is what makes an unusual session visible at a glance and is
  what an analyst expects. The bars are already stored with all four values
- Interaction: hover or focus to read a point, and the crosshair that makes a chart legible
  rather than decorative
- **Accessibility, which is where charts usually fail.** Colour must not be the only
  encoding (invariant from Story 1.4, measured: this palette's red and green are 1.05:1
  apart in greyscale). A chart needs a text alternative that says something true — the
  range, the change, the period — and its interactive parts need to be reachable by
  keyboard
- Number and date formatting: tabular figures, the alignment property Story 1.4 measured at
  a 14.3 px spread, and market timestamps through Story 2.5
- The states, again as product states rather than exceptions: loading, no data for this
  security, partial data, and a failed load that leaves the rest of the page intact
- Performance: the render cost at the largest series this epic serves, against §28's
  no-main-thread-task-over-50 ms target

## Out of scope, and who owns it

- Volume — Story 2.13, deliberately, so this story is not two charts
- Time-window controls — Story 2.13
- Anomaly markers and abnormal-move indicators — Epic 5
- Comparison and overlay of multiple securities — Epic 8
- Live updating — Epic 3
- Charts opened by an agent command — Epic 11, which is a reason to keep this component's
  props a declarative description of what to draw

## Open decisions — settle with the user

1. **Library or hand-built.** The repository's precedent cuts both ways: it threw away two
   schema libraries and an error-boundary library, and it kept `@fastify/cors` because the
   hand-rolled version fails invisibly. A chart is closer to the first — the drawing is not
   hard — but axis ticks, time scales with market gaps, and accessible interaction are more
   work than they look. Whichever is chosen, it goes behind a wrapper in
   `src/components/<Name>/` with **our** vocabulary in its props, exactly as `Popover`
   wraps Base UI, because Epic 6 and Epic 11 will both push on it
2. **Line or candlestick for V1**, and whether that is a per-timeframe answer
3. **How the x-axis handles market gaps.** A continuous time axis draws a flat weekend gap
   into every chart; a session-ordinal axis draws none and stops being a real time axis.
   Most financial charts choose the second and it surprises people who expect the first

## Design surface

Substantial. This is the product's first data visualisation and the thing a demo audience
looks at longest. It should carry `VISUAL-LANGUAGE.md`'s language — near-black hairlines
rather than grey borders, the warm ground, restraint with colour — and it must reserve
room for what arrives later: Epic 5's anomaly markers, Epic 8's comparison series, Epic 9's
filing markers on the time axis.

## Acceptance criteria

1. Opening NVDA shows a correct price series, verified against the stored bars rather than
   by eye
2. The chart is readable and operable without a mouse, and conveys direction without colour
3. axe reports no violations on the security page, and the contrast check that the CI gate
   asserts still passes
4. Every state renders correctly, and a failed chart does not take the page with it
5. Rendering the largest series this epic serves produces no main-thread task over 50 ms,
   measured
6. The component has stories per state and passes `pnpm stories`
7. The bundle cost of the decision is recorded, in the shape Story 1.5 recorded the router's
8. `pnpm verify` passes

## What this story hands forward

The charting foundation Epics 5, 8 and 11 build on, and a wrapper that keeps the choice
reversible.
