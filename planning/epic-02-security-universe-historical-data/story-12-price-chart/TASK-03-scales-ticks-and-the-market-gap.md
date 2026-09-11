# Task 2.12.3 — Scales, ticks and the market gap, as functions with no DOM

**Status:** Complete (2026-09-11)
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.1

## Objective

Build the arithmetic a chart needs — domain to pixels, which ticks to draw, and
what a time axis does about the gaps between sessions — **as pure functions in
the `market` module, tested with no DOM at all**.

Task 2.11.2 is the precedent: the matcher was built and tested before anything
rendered it, and the result was that the control in 2.11.4 was about the
control. The same split buys more here, because axis arithmetic is the part of a
chart that is genuinely easy to get subtly wrong and completely invisible when
it is — a tick every 7 minutes, an axis whose last label is past the last bar, a
price scale that clips a high.

## What the user can see when this lands

**Nothing.** No chart, no axis on screen. Task 2.12.4 is the payoff, and it is
the next one.

## Work

- **The scales.** A value-to-pixel mapping for price and one for time, built
  from a domain and a range and nothing else — no element, no measurement, no
  `window`. Invertible, because Task 2.12.6's crosshair needs pixels back to a
  bar and a price, and an inverse written later against a forward function
  written earlier is where an off-by-a-half-pixel lives.

- **The price domain.** What the vertical extent actually is: the series' low
  to its high, padded — and say what the padding is and why, because a chart
  whose line touches its own frame reads as clipped. A **flat series is a real
  case** and a zero-height domain divides by zero; decide what it does.

- **The time axis and the market gap**, implementing Task 2.12.1's decision 3
  rather than re-taking it. Either way this is the module that knows about
  sessions, and it reaches them through `packages/shared`'s calendar and
  `market-time.ts` — **the one module that converts UTC to market time**,
  enforced by lint. Nothing here constructs an `Intl.DateTimeFormat` or spells
  the market's timezone; that is a `no-restricted-syntax` error outside that
  file and it is holding an acceptance criterion from Story 2.5.

- **Tick selection that a person would have chosen.** Prices on round numbers
  rather than on whatever the domain divided into five; times on session
  boundaries, on the hour, or on the day depending on how much is on screen.
  The test is whether the labels are ones an analyst would write down.

- **Formatting, through what already exists.** `series-facts.ts` in
  `BarSeriesPanel` already holds `formatPrice`, `formatMarketInstant` and
  `formatMarketRange`. Reuse or move them — do not write a second spelling of a
  price. If they move, they move into the `market` module and out through its
  `index.ts`, which is the only thing outside that directory may import
  (`eslint.config.mjs` enforces it).

- **Tabular figures are not optional on an axis.** Story 1.4 measured the
  proportional-versus-tabular spread at 14.3 px; an axis of proportional numerals
  is an axis whose labels jitter as the window moves.

## Done when

- Scales, domain calculation, tick selection and gap handling live in
  `src/market/` and leave it only through `index.ts`
- Unit tests cover: a flat series, a single-bar series, a series spanning a
  weekend, a series spanning a holiday the calendar knows about, and a domain
  whose high and low are equal
- No file in this task imports React, touches the DOM, or reads a clock
- Ticks are verified against a stored fixture series rather than by eye
- `pnpm verify` passes

## Notes

The fence is rendering. This task produces numbers; 2.12.4 turns them into
marks. If a decision here appears to force the shape of the component — it
probably will, at least once — that is a finding to record in `CHARTING.md`
rather than a licence to start drawing.

~~If Task 2.12.1 chose a library, this task is **smaller and not empty**: whatever
the library's own scale does, the market gap, the session-aware ticks and the
formatting are still ours, and they are still tested here rather than through a
rendered chart.~~

---

## Amended 2026-09-11 by Task 2.12.1 — this task got **bigger**, and it inherits two settled answers

The note above anticipated the wrong branch. [`CHARTING.md`](CHARTING.md) §1
chose **hand-built SVG with no charting dependency — not even `d3-array`** — so
nothing arrives with a scale already written. **This task now owns all of it**,
and that was decided knowing the cost:

- **`scaleLinear` and its inverse** are this task's, both directions, written
  together rather than the inverse retrofitted for 2.12.6.
- **Nice-number tick selection** is this task's. It is the one genuinely fiddly
  piece and it is the reason `d3-array` was priced at all: **1,167 B gzipped**,
  measured, and declined because a wrong tick fails _visibly_ — which is this
  repository's own stated test for when to keep a library. **That price is
  pre-approved if this task disagrees with it**, and §1's second reversal
  trigger is the condition: _a hand-built axis producing ticks a reviewer calls
  wrong twice._ Take it rather than grinding, and record that the trigger fired.

**The x-axis is session-ordinal** (§3, settled — do not re-take it). Bar `i` sits
at `i / (n - 1)` of the plot width; there is no gap between Friday's last bar and
Monday's first. **The labels are real market timestamps** through
`market-time.ts`. So the scale is ordinal and the formatting is temporal, and the
tick _selection_ problem on this axis is "which bar indices get a label", not
"which instants".

Two consequences that belong to this task rather than to a renderer:

- **The inverse on an ordinal axis is a bar index, not an instant.** Task
  2.12.6's crosshair wants a bar; returning an instant and re-finding the bar is
  the second spelling of the scale the Work section already warns about.
- **Epic 9's filing markers need an instant-to-position function this task is
  the natural home for**, including §3's rule 2: an instant falling _between_
  sessions has no position, and is placed on the boundary carrying its true
  timestamp. Building it now is speculative; **knowing the ordinal scale will be
  asked for it** is what stops the inverse being written in a shape that cannot.

### Where it lives — settled, because the default had a trap attached

**The `market` module, as the Work section says, and this story creates no second
feature module.** That was worth confirming rather than assuming, because
`PRODUCT_SPEC.md` §26 names a `charts/` module and reaching for it here would be
the natural move.

It is the wrong move: the rendering lives in `src/components/<Name>/`, and what
this task produces is arithmetic about **sessions and prices**, which is market
domain. A `charts/` module would be a directory named after the consumer rather
than the subject.

**The reason it matters beyond tidiness** is the most dangerous entry on
`CLAUDE.md`'s _What `pnpm verify` does not cover_ list: a second feature module's
`no-restricted-imports` pattern must live **inside the browser boundary's own
`patterns` array**, because ESLint flat config resolves to the **last** matching
configuration — a new block _replaces_ rather than adds, and the failure is the
browser boundary silently disappearing. Staying in `market` means **this story
never goes near it**, which also collapses that item in Task 2.12.10's sweep.

---

## Amended 2026-09-11 by Task 2.12.2 — four inputs this task was going to have to invent are now given

[`CHARTING.md`](CHARTING.md) §7.1 and `VISUAL-LANGUAGE.md`'s _The chart_ section
settle the instrument. Four of their positions are arithmetic rather than
appearance, so they land here rather than on a renderer.

- **The range is the plot's width, which is not the region's.** The value scale
  sits in a **right-hand gutter** — `--chart-gutter`, 56px, and 46px below 600px
  of region — so the horizontal range is `regionWidth - gutter`. A scale built
  against the region width is wrong by 56px at every point, draws a line that
  runs under its own labels, and **nothing goes red**: jsdom computes no layout
  and the error is a plausible chart rather than a broken one. Take the gutter as
  an input to the scale, not as padding a stylesheet applies afterwards.

  (The gutter is on the right because that is where the latest price is. Labels
  drawn _inside_ the plot were tried on the canvas and abandoned — at the
  measured 1,019px region the topmost one sat on top of the series.)

- **The price domain's padding is 10% at both ends, and the upper pad is not
  free.** The Work section asks this task to say what the padding is and why; the
  answer is given. Its top half is **Epic 5's anomaly-marker lane** — 16px inside
  the plot's top padding, stated on the canvas so the markers do not arrive as a
  retrofit. A later task that tightens the pad to make the line fill more of the
  frame is spending a lane that has already been allocated, so the constant wants
  a comment rather than just a value.

- **The seam is a required tick, which changes the x problem's shape.** Every
  session-boundary index gets a label — the date — and intraday ticks fall
  _between_ them and carry the time. So x-tick selection is not one nice-number
  problem over `[0, n)`; it is a fixed set from the calendar plus a
  density-dependent choice inside each session. The fixed set comes from where
  the bars change session, which this module already has to compute for §3's
  ordinal positioning.

- **The tick counts are decided, per region width, and the axis never
  disappears.** ≥900px: 5 value gridlines, every seam labelled, plus intraday
  ticks. 600–899: 4, seam labels only. 400–599: 3, seam **rules** stay and seam
  labels reduce to first and last. <400: 3, first and last date. A plot with no
  axis is a sparkline; this chart does not become one at any width.

**What is still this task's to decide, unchanged.** The nice-number algorithm
itself; the inverse; the single-bar series; and the **zero-height domain** on a
flat series — 2.12.2 answered what a flat _window_ looks like
(`--price-unchanged-wash`, three states rather than two) and said nothing about
what a flat _domain_ divides by, which is still the divide-by-zero this task
owns.

---

## What was built — 2026-09-11

Five modules in `src/market/`, all of them pure, none of them importing React,
touching the DOM or reading a clock. They leave the module through `index.ts`
and nothing else, which `eslint.config.mjs` enforces.

| File                  | What it owns                                                            |
| --------------------- | ----------------------------------------------------------------------- |
| `chart-scale.ts`      | `linearScale` and the ordinal `slotScale`, **each with its inverse**    |
| `chart-value-axis.ts` | The price domain, its padding, the flat case, and nice-number gridlines |
| `chart-time-axis.ts`  | Sessions, slots, the market gap, bar placement, seams and the x labels  |
| `chart-density.ts`    | `VISUAL-LANGUAGE.md`'s four region-width breakpoints                    |
| `price-format.ts`     | The price and direction vocabulary, **moved** — see below               |

**86 unit tests**, in five files beside their subjects. `pnpm verify` passes, and
the browser suite was run as well because the move below touched eight shipped
components: **81 browser tests pass**.

### The decisions this task had left to take

- **A scale is plain data and a pair of functions, not a closure.**
  `FRONTEND-STATE.md` §1's rule 4 — the shapes this application passes around
  stay describable — and it makes a scale printable in a test failure.
- **Both directions were written together.** The brief's reason, restated because
  it is the kind of instruction that reads as tidiness: an inverse written later
  against a forward function written earlier is where an off-by-a-half-pixel
  lives, and by the time Task 2.12.6 calls it the forward function will be on
  screen and correct-looking.
- **The inverse of the ordinal axis is a slot, not an instant** — 2.12.1's
  amendment, implemented rather than re-taken. `nearestSlot` clamps, because a
  pointer past the edge still means the nearest point; `scaleValue` does **not**,
  because a mark above the domain belongs above the plot where the frame clips
  it. Two opposite rules, stated as two functions.
- **The price domain is taken over the bars' highs and lows, not their closes.**
  The line is a line of closes, but a close always sits inside its own bar, the
  panel beside the chart already prints **High** and **Low** for the same window,
  and 2.12.5's envelope has to fit a frame that already exists. A frame excluding
  a figure printed next to it is the product disagreeing with itself.
- **A flat series gets a domain of ±0.5%**, floored at a cent so a zero price
  cannot produce a zero-height one. The failure this prevents is specific: a
  zero-height domain divides by zero, SVG draws `NaN` as _nothing_, and the
  symptom is a correct, empty frame rather than an error.
- **A one-slot axis puts its bar at the left edge.** `i / (n - 1)` is `0 / 0`
  there, so the answer is chosen: a slot marks where its interval _begins_, and
  the alternative would make a one-bar chart the only chart whose mark means
  something else.
- **A window starting mid-minute snaps back to the minute it is inside.**
  Rounding the other way shifts every bar in the session one slot left, which is
  a chart that is plausible and shifted rather than an error anybody sees.
- **`1d` has no seams.** A seam marks a discontinuity _inside_ a run of slots; on
  a daily axis every slot is already a session, so a rule between each pair is a
  rule between every bar.
- **An axis with no trading minute in it throws.** Only reachable through a
  request this application does not make — the server resolves `sessions=N`
  against the calendar — and the alternative is an empty frame, which is
  indistinguishable from a security that did not trade.

### The formatting move, which a trigger asked for

`series-facts.ts`'s closing note named a condition — _the third consumer that
formats a price or a percentage_ — and this task's value axis is it: every
gridline is a price. Five values and the `PriceDirection` vocabulary moved out of
`UniverseTable/last-close.ts` and `BarSeriesPanel/series-facts.ts` into
`market/price-format.ts`, with their tests, and eight components now import them
from the module. **`changePercent` did not move**, and the reason is in the new
file's header: the two copies compute over two unrelated record types and one
function over both would be a module named after a shape rather than a meaning.

### What this leaves for the tasks after it

- **Task 2.12.4** gets `timeAxis(coverage.requested, timeframe)` as one call, so
  §6.2's rule is a line of code that already exists rather than one to remember.
  It reads `--chart-gutter` and `--chart-height` and hands the numbers in; the
  gutter is an **input to the scale**, so a line cannot run under its own labels.
- **Task 2.12.5** gets `directionOf` in the same module, and a frame the
  high–low envelope already fits inside.
- **Task 2.12.6** gets `nearestSlot` and `unscaleValue`, written and round-tripped
  here rather than retrofitted there.
- **Task 2.12.7** gets a finding it would otherwise have built against the wrong
  fixture — see [`CHARTING.md`](CHARTING.md) §10.1.
- **Epic 9** gets `positionOfInstant`, including §3's rule 2: an instant between
  sessions has no position and is placed on the seam, carrying its true timestamp.

### One thing nothing checks, now recorded

**`chartDensity`'s 600 px boundary and the stylesheet's media query must agree,
and nothing compares them.** No stylesheet is applied in the test environment and
jsdom computes no layout, so a module reading the breakpoint from CSS could not
be tested at all. It is on `CLAUDE.md`'s _What `pnpm verify` does not cover_ list
with the re-measure. Re-measure: change one of the two and confirm the chart
switches its gutter at a width where it still draws five gridlines.

---

## For the people paying for this — what this week's work actually did

**In one sentence: we built the maths a chart is made of, and nothing appeared on
screen.** That is the honest headline, and it is deliberate rather than a slip.

### What a stranger would see if they opened MarketPulse today

Exactly what they saw yesterday. The Security Explorer, NVDA's real minute bars
written out as facts, the tracked universe of 518 securities, the search box. The
Price region still says what it will hold and which story brings it. **Nobody can
see a chart yet — that is the next task, and it is the one worth watching.**

### So why spend a task on something invisible?

Because a chart is two different jobs wearing one coat, and they fail in
different ways.

The **drawing** is the easy half: lines, labels, colours. If it is wrong you can
see it instantly.

The **arithmetic** is the half that decides what the picture _means_ — where on
the screen a 2:47 pm price belongs, which prices get a labelled line beside them,
and what happens to the fourteen hours between Friday's close and Monday's open.
If that is wrong, the chart still looks completely fine. It is a beautiful,
confident picture of the wrong thing. For a product whose entire purpose is
telling an analyst what is unusual, that is the worst possible failure, because
it is a failure nobody catches by looking.

So we built the arithmetic on its own, first, and tested it against **real
recorded market data** rather than made-up numbers — 150 actual NVDA bars that
happen to span a weekend _and_ Labor Day, which is precisely the case a chart
gets wrong. Eighty-six tests now hold it. When the chart is drawn next, if it
looks right it will be right, rather than the two being the same sentence.

### The three problems that were genuinely hard, in plain terms

**1. What do you do about the nights?** The market is open six and a half hours a
day. If you draw time honestly across five days, two-thirds of the chart is blank
— a picture that is mostly nothing. Every professional trading platform solves
this by simply pushing Friday's last price up against Monday's first, and we do
too. But that quietly hides something real: a night passed. So we draw a dashed
line exactly where one day becomes the next, and the label there switches from a
time to a date. The reader is told what the chart chose not to draw.

**2. Which prices deserve a line beside them?** An analyst wants to see 231, 232,
233 — round numbers they can hold in their head. Naive software divides the range
into five and writes 230.83, 231.79, 232.75. There is a well-known library that
solves this for about a kilobyte of download, and we had pre-approved buying it.
We did not need it: the hand-written version is twenty-eight lines, it is checked
against recorded bars rather than by eye, and it now does one thing the library
would not have — it refuses to put two lines closer together than a penny, since
both would carry the same label and the chart would appear to have drawn the same
price twice.

**3. What about a stock that did not move?** A price that never changes has a
range of zero, and dividing by zero produces nonsense coordinates that browsers
draw as _nothing at all_. You would get a perfect empty chart frame with no
error — the product silently saying "no data" about a security we hold every
minute of. A flat security now gets a small window either side of its price, and
the line sits across the middle, which is what "nothing happened" should look
like.

### A finding worth knowing about, because it changes a later task

We had a standing rule that when we hold less data than was asked for, the chart
should leave visible empty space rather than stretching the line to fill the
frame — because a stretched line _looks complete_ and quietly lies. Building this
showed the rule has a limit we had not spotted: if the missing part is a weekend,
there is correctly no space to leave, because a weekend was never trading time in
the first place. That is the chart being more honest, not less — but it means the
task that draws the "we only have part of this" treatment has to be tested
against a gap in a _trading day_, not against the weekend example we had to hand.
That is now written down where that task will read it, rather than discovered by
shipping the wrong thing.

### Where this sits on the road

Story 2.12 is the first chart in MarketPulse and, in the story's own words, _the
moment the product looks like the thing it is meant to be_ — it is the screen the
five-minute demonstration runs through. Ten tasks; this was the third. The first
two settled how we draw and what it looks like. **The fourth one draws it.**

Everything built since the beginning of the epic is about to become visible in a
single line: the database, the 518-security universe, the trading calendar, the
market-data provider, the forty-eight million stored bars, the API, and the state
layer all have to be right for that line to be correct. This task is the piece
that decides whether it is correct, or merely convincing.
