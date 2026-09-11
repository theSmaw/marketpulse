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
looks at longest. It should carry `VISUAL-LANGUAGE.md`'s language — the near-black
**structural** rule, the cool ground, the data face on every figure, restraint with
colour — and it must reserve
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

> **Amended 2026-09-11 by Task 2.12.1 — paragraph 1's premise expired the day it
> was written, and its conclusion survives.** _"Nothing on the path compresses"_
> and the 1,060,490-byte figure were true when Task 2.9.9 measured them on
> 2026-09-10 and false by the end of that same day: **Task 2.9.10 registered
> `@fastify/compress`.** §12.5's own title is marked false in place and the
> re-taken figures are in §12.1 and §12.8 — which is this amendment's own
> paragraph working, since it says to take figures from §12 rather than from
> here.
>
> Live, deployed from the United Kingdom with the coding on: **a month of minute
> bars is 154,480 bytes and ~1,210 ms**, not 1 MB and ~2.5 s; **five sessions is
> 29,072 bytes and ~399 ms**; one session is 7,353 bytes and ~333 ms, against a
> conditional floor of ~290 ms that is almost entirely the link.
>
> **The instruction is unchanged and was not weakened by this.** The default
> window now comes in under §28's 500 ms on its own — [`CHARTING.md`](CHARTING.md)
> §4 settles it at **5 sessions of `1m`** for that reason — but the chart still
> paints its frame, axes and loading state immediately and fills the series in
> when it lands, because Story 2.13's control will offer the month that still
> costs 1.2 s and Epic 13's replay will ask for windows nobody has measured.

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

---

## Amended 2026-09-10 by Task 2.10.9, after Story 2.10 closed — the layer you draw from

The subject document is
[`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md)
and the decisions are ADR 0023.

**The data layer is done and the fence was held for you.**
`components/BarSeriesPanel` renders a real series as **stated facts and no
drawing** — no axis, no line, no candle, no sparkline, and a browser spec
asserting the region contains no `<canvas>` and no `<svg>`. That fence exists so
this story takes the charting decision against a data layer already known to be
right, rather than debugging both at once. **Removing it is your call to make
deliberately**, and the spec that asserts it is the thing to change first, in the
same commit, with a reason.

**What you get.** `useBarSeries(request)` returns `{ view, retry }`. `view` is a
six-member discriminated union taken **whole** — never spread into props — and
three of its members are answers rather than failures. The one that will surprise
a charting library is **`partial`**: bars covering less than the window asked for
is the _normal_ case here, not an error, so a chart must be able to draw a series
that stops before its own x-axis does and say so.

**Three rules you inherit rather than re-take.**

- **Never resolve a window from the browser's clock.** Send `sessions=N`; the
  server resolves it and reports back what it meant in `coverage.requested`. A
  client that computes "the last five sessions" is off by one session for roughly
  half the world for several hours of every day, and it produces a chart that is
  plausible and shifted rather than an error anybody sees.
- **A held answer stays on screen, marked, while the next one loads**
  (`FRONTEND-STATE.md` §2's amendment). The mark must never touch a number:
  motion must never make a value harder to read, so no dim, no blur, no fade and
  no skeleton over a price. A chart that redraws a held series in a second style
  is the first thing that would turn `stale` from a flag into a seventh union
  member — that is §2's stated reversal trigger, so if you need it, take it there
  rather than locally.
- **Eleven recorded response bodies exist** in `apps/frontend/src/fixtures/`, with
  `barSeriesFixtureView(name)` returning the state built through the real
  transition. **Do not construct a state by hand**: a hand-built `partial` whose
  coverage disagrees with its bars is unreachable in the real layer, and a chart
  tuned against one draws the real thing wrongly.

**And the constraint on measurement, so it is not discovered late.** A cap-sized
series is 10,000 bars, 2.43 MB of parsed heap, and 4.6–8.7 ms to parse against
§28's 50 ms main-thread budget. The parse is not the problem; whatever you draw
with is where that budget will actually go.

## Amended 2026-09-11 by Story 2.11's close — **this story fills a region that already exists and already names it**

Written before the Security Explorer shell existed, this file describes a chart
arriving "on its own page". It is not; it is arriving into a **named, sized,
already-placed region**, and the concrete defect is a chart dropped into a fresh
panel beside the one that has been waiting for it since 2026-09-11.

`SecurityExplorer.tsx` renders `PRODUCT_SPEC.md` §8.3's seven contents once, on a
grid of spans. The **Price** region is the first of them and its placeholder
reads, verbatim:

> One security's minute bars, stated rather than drawn. The chart itself arrives
> with Story 2.12.

So this story's work is to **replace the contents of that region**, and the grid,
the heading, the span and the region's landmark name are all inherited rather than
chosen. The same is true of the reading of "its own page": the route is
`/securities/:symbol`, the chart is one region of eight, and the tracked universe
is still underneath it (`SEARCH-AND-SELECTION.md` §1's amendment).

Two consequences worth having before the first line of it is drawn: the region is
**full width** on the two-column grid and narrows with the viewport, so the chart's
own breakpoints are the region's rather than the page's; and a green
`pnpm verify` cannot see either fact, because nothing below `pnpm e2e` computes a
layout (`CLAUDE.md`, _Frontend_).

---

## Tasks — added 2026-09-11

Ten tasks, sequential. The shape follows Stories 2.9, 2.10 and 2.11: **the
decisions are settled first and ship nothing** (2.12.1, 2.12.2), the arithmetic
that needs no screen is built and tested on its own (2.12.3), and the chart
lands as early as the dependency graph allows rather than at the end.

**Seven of the ten change something a person can see, and the first of those is
fourth.** That is the same arrangement Story 2.11 used and for the same reason:
a run of tasks with nothing on screen is how a product stops being demonstrable,
and this is the story the demonstration runs through.

**2.12.1 and 2.12.2 are split because they are different decisions.** The first
is the mechanism — library or hand-built, series type, the market gap — measured
the way Story 1.5 measured the router. The second is the instrument: what the
chart looks like, taken on the design canvas that has been the source of truth
since ADR 0026, with its tokens landed in the chain the ADR fixes. Drawing first
and styling second is how a chart ends up wearing a renderer's defaults with our
colours substituted, which is test 2 of the four failed exactly.

**2.12.4 is the payoff and 2.12.7 is what makes it honest.** They are split on
purpose, as 2.11.4 and 2.11.6 were. The first is about a correct series in a
correct frame; the second is about every way the answer can be something other
than a full one — `partial` above all, which is the normal case here and the
state a charting library will not expect.

**2.12.4 also takes down a fence deliberately.** `BarSeriesPanel` states that it
draws nothing and `e2e/specs/security-series.spec.ts` asserts it — no `<canvas>`,
no `<svg>` in the Price region. Story 2.10 built that fence so this story would
take the charting decision against a data layer already known to be right. The
spec changes first, in the same commit, with a reason.

**2.12.8 and 2.12.9 are the two criteria a green `pnpm verify` cannot see.** A
text alternative that says something true, a tab stop that does not land behind
the sticky chrome, contrast, greyscale — and a renderer's cost against §28's
50 ms, which is where that budget will actually go, since parsing the largest
body this API serves takes 2.8 ms.

| Task                                                                 | What it does                                                             | Visible?                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------- |
| [2.12.1](TASK-01-settle-the-charting-decision.md)                    | Library or hand-built, series type, the market gap, the default window   | No                            |
| [2.12.2](TASK-02-the-chart-on-the-canvas.md)                         | What it looks like, on the canvas, and the tokens it needs               | **In the workshop**           |
| [2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)                 | Scales, domains, ticks and sessions — as pure functions                  | No                            |
| [2.12.4](TASK-04-the-first-chart-in-marketpulse.md)                  | The first chart in MarketPulse, in the region that named it              | **Yes — the payoff**          |
| [2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md) | The high–low band, and direction that survives greyscale                 | **Yes**                       |
| [2.12.6](TASK-06-reading-a-point-crosshair-hover-and-keyboard.md)    | Crosshair, readout, and the keyboard path to the same reading            | **Yes**                       |
| [2.12.7](TASK-07-every-chart-state-drawn.md)                         | Every state from a recorded body, `partial` above all                    | **Yes**                       |
| [2.12.8](TASK-08-the-text-alternative-and-the-screen-reader-walk.md) | A text alternative that says something true, and the walk that proves it | **Yes**                       |
| [2.12.9](TASK-09-measured-against-fifty-milliseconds.md)             | The render cost at the cap, and the bundle cost of the decision          | No, unless it finds something |
| [2.12.10](TASK-10-deployed-verify-document-and-adr.md)               | Deployed, the four tests applied, `CHARTING.md`, ADR 0027                | **Yes — deployed**            |

**The subject document is `CHARTING.md`**, not `PRICE-CHART.md`. Only a fraction
of what this story settles is about price: Epic 5's markers, Epic 6's topology,
Epic 8's comparisons and Epic 11's agent-opened charts all inherit it.

---

## Amended 2026-09-11 by Task 2.12.1 — what the settled decisions did to the nine tasks below

The task list was reviewed against [`CHARTING.md`](CHARTING.md) once the
decisions existed. **No task was added, none was deleted, and the order is
unchanged.** Seven were amended in place, each with a dated block at the foot of
its own file. The two largest effects:

- **2.12.3 got bigger, not smaller.** Its Notes anticipated _"if 2.12.1 chose a
  library, this task is smaller"_. It chose **no library and no dependency**, so
  that task now owns the scale, its inverse and nice-number tick selection
  outright. Its amendment also settles that the arithmetic lives in the existing
  **`market` module** — no second feature module, which collapses the most
  dangerous item on 2.12.10's sweep list.
- **2.12.5 got smaller and partly moved.** With a line chosen over candlesticks,
  there is no per-bar body, so **per-bar open-against-close moved to 2.12.6's
  readout** — which makes that readout load-bearing rather than a convenience,
  since §2 justifies the line decision partly on its existing. What 2.12.5 keeps
  is the **high–low band** and the non-colour direction encoding. Its amendment
  says plainly that if it collapses further in practice it should be folded into
  2.12.4 rather than padded.

**The one ordering question that was genuinely open**, and the answer: 2.12.5 and
2.12.6 are now independent of each other, and 2.12.6 carries more of the
product's honesty about the four prices than 2.12.5 does — which is an argument
for swapping them. It was **declined**: the readout naturally reads the high and
the low that the band has already put on the plot, which mildly favours band
first, and renumbering costs every reference in this directory for a marginal
gain. Recorded so the question is not reopened as though it had been missed.
