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

## The design bar

**PRODUCT_SPEC.md §5.6 and `VISUAL-LANGUAGE.md`'s _The bar_ apply to this story, and they
are acceptance criteria rather than polish.** Correct and accessible is the floor. Before
this story is called done, apply the four tests to a screenshot of what it built: would a
stranger believe this is a real funded product; does it look designed rather than
defaulted; is there a moment in it worth showing somebody; and does it feel alive. If the
answer to any of them is no, the story is not finished — and "we will polish it in Epic 15"
is not available, because Epic 15 is a release epic and polish deferred is polish never.

**This is the story with the most at stake on that bar in the whole epic.** It is the first
chart, and PRODUCT_SPEC.md §38's demonstration runs through it. A chart is also the single
easiest place to accept a library's default appearance and ship something that looks like
every other chart — which is test 2 failed exactly. Whatever renderer is chosen, its
defaults are a starting point rather than an outcome.

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

---

## What Task 2.9.9 measured for you — added 2026-09-10

Its own notes said this was the task most likely to change your plan. It did not
change the API, and it changed three things about how this story should be
built. Every figure is in `MARKET-DATA-API.md` §12; take it from there rather
than from here, and re-take it if it matters.

**1. Your default window is a design decision with a second of latency in it.**
The API refuses nothing you are likely to ask for — the cap admits 25 sessions of
minute bars and a month is 24 — but the payloads are not small, **and nothing on
the path compresses** (§12.5). A month of minute bars is **1,060,490 bytes**, and
measured from the United Kingdom against the deployed backend that is **~2.5 s**
end to end, of which ~0.5 s is connection and ~1.9 s is the body. One session is
44,701 bytes and ~0.6 s. **Neither is a server problem and no server tuning
fixes them**: §28's "visible feedback within 500 ms" is satisfied by the chart
drawing its frame, axes and loading state immediately and filling in when the
series lands, which §36 requires of you anyway. Design for that, not for a fast
response.

**2. Criterion 5 has a head start.** The largest body this API can emit —
9,750 bars at the cap — **parses in 2.8 ms** (§12.3), so `JSON.parse` is not what
will break your 50 ms budget. Whatever does will be in the renderer.

**3. One window is slower than it looks, and it is one you will want.** A daily
series over the whole stored depth is 671 bars and 77 kB — the _smallest_ 200
this API serves — and it takes **31.4 ms locally**, of which **20.6 ms is the
cap check walking 672 sessions of the trading calendar** before the query runs
(§12.4). It is the dominant cost of that request and it is paid on every cache
hit. If your window control offers "1 year" or "max" at `1d`, that walk is what
you are paying for, and §12.4 names the repair and the condition for taking it.
It is a `packages/shared` change with its own argument, so raise it rather than
absorb it.

**And one thing you inherit working.** A window ending _now_ stitches stored bars
to a freshly fetched tail, the response carries both sources with their own
`retrievedAt`, and the join costs **under 20 ms** (§12.6). Story 2.14 renders the
seam; you can rely on it being there and being cheap.
