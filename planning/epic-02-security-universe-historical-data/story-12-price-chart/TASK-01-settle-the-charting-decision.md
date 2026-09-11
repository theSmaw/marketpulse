# Task 2.12.1 — Settle how MarketPulse draws, measured, shipping no chart

**Status:** Complete — 2026-09-11. Subject document: [`CHARTING.md`](CHARTING.md).
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

  > **Amended 2026-09-11 while doing this task: the premise in this bullet is
  > stale and the instruction is not.** _"Nothing on the path compresses"_ and
  > the ~1 MB / ~2.5 s figures came from Task 2.9.9 on 2026-09-10 and were
  > invalidated the same day by Task 2.9.10, which registered
  > `@fastify/compress`. Live, deployed from the UK: **a month is 154,480 B and
  > ~1,210 ms**, **five sessions is 29,072 B and ~399 ms** (§12.8's re-take).
  > The recording this bullet asks for was still made — see
  > [`CHARTING.md`](CHARTING.md) §4 — because the month Story 2.13 will offer
  > still costs 1.2 s.

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

---

## What was actually done — 2026-09-11

**Status: complete.** The subject document is [`CHARTING.md`](CHARTING.md), in
this directory. Five decisions, each with the alternatives that lost and a
reversal trigger that is a condition. The throwaway spike was built outside the
repository and has been deleted; `git status` shows three planning files and
nothing else. No dependency was added, and nothing was added to
`apps/frontend/src`.

The five decisions, in one line each:

1. **Hand-built SVG, no charting library** — 279 bytes against Recharts' 94,809.
2. **A line, not candlesticks** — a candle would be 0.47 px wide at the default window.
3. **A session-ordinal x-axis with real market timestamps as labels** — a
   continuous axis would be two-thirds empty.
4. **The chart opens at five sessions of minute bars** — 399 ms deployed, inside
   §28's 500 ms.
5. **Nothing `BarSeriesPanel` states today stops being stated** — an axis is
   rounded, so it never replaces an exact figure.

Plus one correction swept upward: see §8 of `CHARTING.md` and the dated
amendments in [`STORY.md`](STORY.md) and in Decision 4's bullet above.

---

## A status report for whoever is paying for this

_Non-technical. What this task was, why it cost a day with nothing on screen at
the end of it, and what it unlocks._

### Where the product is

MarketPulse watches the US stock market, points at the things behaving oddly, and
helps a person work out why — against real evidence rather than an opinion.

Today you can open it and use it. You can type `nv`, see NVDA come up, and land
on its page. That page shows real market data for one of 518 companies we track:
the last price, how much it moved, how many minutes of trading we hold, and which
exchanges the figures came from. All of it is real — roughly 48 million actual
minute-by-minute price records sitting in a database, not a demo dataset.

**What you cannot do is see a picture of any of it.** The price page is honest and
complete and entirely made of words and numbers. It even says so: there is a
sentence on it reading _"the chart itself arrives with Story 2.12."_ That is the
piece of work this task begins.

### What this task actually was

It decided **how MarketPulse draws** — and then deliberately drew nothing.

That sounds like a day spent not building something, so here is why it was worth
it. The way a product draws a chart is not one decision about one chart. The same
machinery has to carry, over the next several months of work: markers showing
where a company behaved unusually; several companies compared on one chart;
markers showing when a company filed a document with the regulator; and — the
feature this whole product is built around — charts that the AI assistant opens
and changes on your behalf while it investigates something for you.

If we pick the drawing machinery to suit one line on one page and get it wrong,
we do not find out now. We find out in four months, with four features built on
top of it, when the cost of changing our minds is enormous. So the decision was
taken once, deliberately, with the reasoning written down — including what we
would have to see happen to change our minds about each choice.

### How the decisions were taken — measured, not argued

We did not pick based on reputation or preference. We built a throwaway test
project, put four well-known charting libraries into it alongside two hand-built
approaches, and measured all six doing the same real job. Then we threw the test
project away and kept the numbers.

**Decision 1 — build it ourselves rather than use a charting library.**

Three things decided it.

_Download size._ Everything a chart library does has to be downloaded by every
visitor before the page works. The most popular option, Recharts, would have made
the application **71% larger**. A hand-built chart costs **279 bytes** — about
0.2%. That is not a close call.

_Speed._ We tested each option drawing the largest amount of data the system can
serve, roughly 10,000 price points. Our own performance standard says no single
piece of work should block the screen for more than a twentieth of a second.
Recharts took **nearly a quarter of a second** — almost five times over — and
stayed slow on repeat draws. The hand-built version never registered as slow at
all.

_Blind users, and everything we need to add later._ This is the one that actually
settled it, and it is the least obvious. Chart libraries broadly split into two
kinds: ones that paint a picture (fast, but the result is a flat image a screen
reader cannot describe and a keyboard cannot navigate) and ones that build the
chart out of real, describable page elements. The fastest library we tested,
TradingView's, paints onto **seven separate picture surfaces** — nothing a screen
reader can see. We are legally and ethically committed to this product working
without a mouse and without sight, and we have four future features that need to
attach things to the chart. Building it ourselves gives us a chart made of real
elements we control.

There was a fourth finding worth mentioning because it was a genuine surprise:
**three of the four libraries do not type-check cleanly against our settings.**
This project runs the strictest available safety checks on its own code —
deliberately, because they catch whole classes of bug before anyone runs the
program. Three of the four libraries fail those checks at the exact point where
you tell the chart what colour to be. It is fixable, but it is friction on every
single setting, forever.

**Decision 2 — draw a line, not the candlesticks a finance app usually shows.**

Financial charts traditionally use "candlesticks" — a small shape per time
period showing the price at the start, the end, the highest and the lowest. An
analyst expects them, and we already store all four numbers, so this looked like
an easy yes.

We measured it instead. We opened the real page in a real browser at six
different window sizes and measured how wide the price area actually is. On a
typical laptop it is **923 pixels**. The chart opens showing five days of
minute-by-minute data — **1,950 price points**. That is **less than half a pixel
per candle**. A candlestick half a pixel wide is not a candlestick; it is a line,
drawn in the most expensive possible way. We confirmed the expense too: drawing
them that way produced a **quarter-second freeze**.

So: a line. But **the four prices are not lost** — they move to where they are
actually useful. When you hover over or keyboard-focus a point on the chart, you
will get all four numbers for that moment, read out properly. That is how a person
actually reads an individual bar anyway: by pointing at it, not by squinting at a
half-pixel rectangle.

And we wrote down the condition for changing our minds: once the product offers a
"last six months" view, each candle becomes about 7 pixels wide and candlesticks
become the right answer for that view. That is a real prospect in the very next
piece of work.

**Decision 3 — the chart skips nights and weekends.**

Markets are shut most of the time. If the chart treated time continuously, the
default view would be **roughly two-thirds empty space** — flat lines across every
evening and every weekend. So we squash the closed periods out, which is what
essentially every professional financial chart does.

It has one honest cost, and we wrote it down now rather than discovering it later:
companies very often file documents with the regulator **after the market closes**,
which is precisely the time our chart no longer has anywhere to put. So when that
feature arrives, those markers sit on the seam between two days and must clearly
show their real timestamp. Recording that now is the difference between a designed
behaviour and a bug someone finds later.

**Decision 4 — the chart opens showing five days, and we corrected a stale figure
along the way.**

This is worth reading because it is an example of a habit this project has that
genuinely pays.

The instructions for this task told me to design around a hard fact: a month of
data is about a megabyte and takes about two and a half seconds to arrive in the
UK, and **nothing on the route compresses it**. That was measured carefully and
written down on 10 September.

It stopped being true **later the same day**. A different piece of work switched
compression on. So a month of data is now **154 kilobytes and 1.2 seconds** — a
seven-fold improvement — and two documents were still telling anyone who read them
to design around the old number.

I checked the live figures rather than trusting the instruction, chose the default
window against the real numbers (**five days: 29 kilobytes, 0.4 seconds — inside
our half-second responsiveness target**), and then went back and corrected both
documents with a dated note explaining what changed and when. The original text is
left visible rather than quietly rewritten, so the record of what we believed and
when stays intact.

The underlying instruction still stands, and I kept it: **the chart must draw its
frame, its labels and its loading state instantly and fill the data in when it
arrives.** The default window no longer needs that rescue, but the "one month"
view still takes 1.2 seconds, and it is coming in the next piece of work.

**Decision 5 — the numbers stay when the picture arrives.**

The obvious thing to do is replace the page's block of figures with the chart. We
are not going to, and the reason is a principle this product is built on: **a
chart is rounded and a number is exact.** The chart's scale is deliberately
rounded to tidy values, so it never actually shows the true high or the true low.
The written figures do.

More importantly, two things beside the chart are non-negotiable: the label saying
**which exchanges the data came from** (we are on a free data plan with real
coverage limits, and pretending otherwise would mislead people about a market),
and the sentence saying **exactly how much of the requested period we actually
hold** — because holding less than you asked for is the normal case here, not an
error.

So nothing is removed. The picture is added, the headline price moves into it, and
the exact figures sit beneath it.

### The single most valuable sentence in the document

If the rest of this is forgotten, this one is worth keeping, because it prevents a
bug that would otherwise certainly have shipped and would have been almost
impossible to spot:

> **The chart's time axis must be built from the period that was _requested_, not
> from the data we actually received.**

If you build the axis from the data you have, then when we only hold part of the
period — which is normal, every night, for every company — the line quietly
stretches to fill the whole chart and **looks complete**. It would not be an
error. Nothing would go red. No automated test could catch it. It would just be a
chart that is subtly, confidently wrong, on a product whose entire purpose is
being trustworthy about evidence.

Building the axis from what was asked for makes the missing part show up as
visible empty space at the right-hand edge — which is exactly what the sentence
beside it already says in words.

### What this unlocks, and when you will see something

This was the last of the "decide before building" work. The next nine pieces of
work build the chart, and **seven of them change something you can see** — the
first of them is only three steps away.

- **Next**: what the chart looks like, designed properly on our shared design
  canvas rather than styled after the fact.
- **Then**: the arithmetic of the axes, built and tested on its own.
- **Then — the payoff**: the first chart in MarketPulse, real NVDA price data,
  drawn, in the space on the page that has been reserved and labelled for it.

That fourth step is the one worth watching for. It is the moment the product stops
being a well-built system that describes a market and starts being one that
**shows** you a market — and it is the screen the whole five-minute demonstration
runs through. Everything built since the start of this epic — the database, the
company list, the trading calendar, the market data provider, the price history,
the interface that serves it, the search — has to be correct for that one line to
be drawn truthfully.

### The honest caveat

Everything above is a constraint, and none of it is a design. The measurements say
what is _possible_; they say nothing about whether the chart will be any good. The
test for that is applied at the end of this story, against a screenshot, and it is
deliberately a demanding one: would a stranger believe this is a real funded
product, does it look designed rather than default, is there a moment in it worth
showing somebody, and does it feel alive. A chart can pass every measurement in
this document and still fail all four.
