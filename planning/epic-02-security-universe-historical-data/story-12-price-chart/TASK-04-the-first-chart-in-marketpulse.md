# Task 2.12.4 — The first chart in MarketPulse

**Status:** Complete — 2026-09-12
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

---

## What was built — 2026-09-12

### Where the code is

| File                                                  | What it is                                                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `components/PriceChart/chart-geometry.ts`             | **What to draw, in pixels, as plain data.** Pure; knows nothing about React or the DOM                          |
| `components/PriceChart/PriceChart.tsx`                | The renderer of that value, and the one thing that measures                                                     |
| `components/PriceChart/PriceChart.module.css`         | The frame, the gutter and the axis row. Every value a token; **no media query**                                 |
| `components/PriceChart/*.test.ts(x)`, `*.stories.tsx` | Criterion 1 at the only level that can check it, the wiring at the level that can, and five states side by side |
| `e2e/specs/security-price-chart.spec.ts`              | The six facts no other level can see                                                                            |
| `e2e/specs/security-series.spec.ts`                   | **The fence, changed rather than deleted**                                                                      |
| `styles/tokens.css`                                   | One token added: `--chart-filing-lane`                                                                          |

`BarSeriesPanel` keeps the region and gained the drawing. The arrangement is
[`CHARTING.md`](CHARTING.md) §5's: **reading → drawing → stated facts**, with the
headline moved up into the chart's chrome and **none of the eight facts
dropped**.

### The fence, taken down in this commit

Three artefacts asserted that nothing was drawn and all three were **changed to
assert what is now true rather than deleted**, because an instrument removed when
it goes green stops being an instrument:

- `e2e/specs/security-series.spec.ts` — now asserts an `<svg>`, still no
  `<canvas>` (which is `CHARTING.md` §1 showing through), gridlines whatever the
  answer was, and exactly one `<path>` where there are bars.
- `BarSeriesPanel.test.tsx` — now asserts the drawing is **above** the facts and
  that the facts are all still there.
- `BarSeriesPanel.tsx`'s header and `SecurityExplorer.tsx`'s `filledBy` — the
  second was a live claim that became false the moment the chart rendered, and it
  was amended in the same commit.

### Four decisions worth the reader's time

**1. The component measures; it reads no token.** A deviation from
[Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)'s amendment, taken
deliberately and argued in [`CHARTING.md`](CHARTING.md) §11.1. `getTokens()`
throws where no stylesheet is applied, so a component that called it would take
its own jsdom tests down; and the measurement _is_ the token after the density
class has selected which of the pair applies. The dividend is that the 600px
breakpoint is now spelled **once** and `CLAUDE.md`'s §10.3 entry is discharged.

**2. The gutter is structural rather than remembered.** `slotScale` is built
against the **plot** element, and the gutter is a sibling grid column that
element never contains. There is no subtraction anybody has to keep doing.

**3. Two states draw no frame at all.** `refused` and `failed` have no window to
be about, and a frame under either would be a picture of a window nobody asked
for — the panel beneath already says what happened in a sentence. `empty` **does**
draw one: a 200 with nothing in it is an answer about a real window, and that is
also what CI's store returns for every request, which is what lets the browser
spec assert the frame unconditionally. No `state not yet drawn` placeholder was
needed; the allowance for one went unused.

**4. The SVG is `aria-hidden`.** Every fact the picture shows is stated in text
beneath it, so a `role="img"` with a name invented here would be a promise this
task has not earned.
[Task 2.12.8](TASK-08-the-text-alternative-and-the-screen-reader-walk.md) owns
the text alternative and the walk that proves it.

### The design artefact

The canvas gained a third file, **`Price region.dc.html`**, beside
`Price chart.dc.html` and `Universe navigation.dc.html`
([ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md)'s
amendment made a second file the way to add to it). `Price chart.dc.html`
settled every mark on the plot and deliberately did not settle what the _region_
is once a chart is in it. The new file takes those three: the assembled
composition, the requested-window rule drawn as a right-and-wrong pair, and the
frame before there is an answer. Its series is **real** — NVDA's 390 stored
minute bars on the five-session window, so the canvas shows the same
one-fifth-full frame the product does.

### Done-when, against what was actually run

| Criterion                                    | Evidence                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `/securities/NVDA` renders a correct series  | Looked at in Chromium, and verified against the store below                       |
| The fence's spec asserts something is drawn  | `security-series.spec.ts`, with the reason in the diff                            |
| Component, stories, view whole, fetches none | `components/PriceChart/`; `pnpm stories` green                                    |
| The frame renders before the series          | Three tests, and `PriceChart.stories.tsx`'s `Waiting`                             |
| Verified against stored bars, not by eye     | `chart-geometry.test.ts` against the recorded body; and the live spot check below |
| A browser spec at all three viewports        | `security-price-chart.spec.ts`, 1440 / 1024 / 390                                 |
| axe reads zero violations                    | Seven existing axe runs cover this route with the chart on it; all green          |
| `pnpm verify`                                | Green. `pnpm e2e`: **87 passed**                                                  |

**The spot check against the database**, which is the half a fixture cannot give.
`GET /market-data/bars?symbol=NVDA&timeframe=1m&sessions=5` against the local
store returns **390 bars**, covered `2026-09-04T13:30Z → 20:00Z`, requested
`2026-09-04T13:30Z → 2026-09-11T20:00Z`, first close 230.1875 and last 230.345.
The screen states 390 bars, `Held` through 16:00:00 EDT, a close of 230.34, and
draws a line that stops one fifth of the way across its frame. Those are the same
facts.

### What this found, and where it is recorded

[`CHARTING.md`](CHARTING.md) §11, in three parts: the token deviation and the
duplication it collapsed (§11.1); that **a `<line>` is invisible to a browser
test**, which cost two red specs and which Story 2.13's volume chart will meet
next (§11.2); and that **a developer's store draws §6.2 in public on the first
run** — the default window is genuinely `partial` with a shortfall made of
trading time, so [Task 2.12.7](TASK-07-every-chart-state-drawn.md) has the real
state to build `--chart-uncovered` against rather than the recorded fixture §10.1
warns it off. `CLAUDE.md` gained three entries and lost one.

### Left standing on purpose

`STORY.md`'s 2026-09-11 amendment quotes the old `filledBy` sentence "verbatim".
It is a **dated historical record of what the region said when that amendment was
written**, and correcting it would destroy the record rather than fix a claim.
The live sentence was amended; this one is left.

`CLAUDE.md`'s _Current state_ was amended for the Price region only. The
paragraph that closes Story 2.12 as a whole is
[Task 2.12.10](TASK-10-deployed-verify-document-and-adr.md)'s, and claiming the
story here would be over-claiming a chart that cannot yet be read by pointer,
keyboard or screen reader.

---

## For the stakeholders — what changed, in plain terms

### The short version

**MarketPulse has a chart.** Open a security and you see its price drawn — a
line, a scale, dates along the bottom. Until today this screen told you the truth
in numbers and made you assemble the picture yourself. Now the picture is there,
and the numbers are still underneath it.

This is the moment the product starts looking like the thing it is meant to be.
Everything built over the last several weeks — the database, the list of
companies we follow, the trading calendar that knows which days the market is
open, the seven million minutes of price history, the service that serves it, the
code that fetches it — all of it has to be right for one line to be drawn
correctly. It is the first screenshot of this project worth showing somebody
without explaining what it will become.

### What you are looking at

Open NVIDIA and the Price panel now shows, top to bottom: the **current value**
and how far it moved; the **chart**; and then the same exact figures the panel
showed before — the window we asked for, the window we hold, the open, high, low
and close, and which market feed the prices came from.

**We deliberately kept every one of those numbers.** It would have been easy, and
it would have looked tidier, to delete them now that there is a picture. We did
not, for a reason that matters to how this product earns trust: **a chart is an
approximation and this product states facts.** The scale on the right is rounded
to readable numbers, so it has no mark at the true high of the day. The dates
along the bottom are a sample, so none of them is the exact first minute. The
figures below the chart are the real ones. The picture is for reading at a
glance; the numbers are for being right.

### The decision worth understanding, because it looks like a bug

The line you see today stops about a fifth of the way across. **That is correct,
and making it fill the frame would have been the mistake.**

Here is why. We ask the service for the last five trading days. Our price history
is topped up overnight and in batches, so today it holds one of those five days
in full and none of the rest. There are two ways to draw that. We could size the
picture to the data we have, which would produce a full, confident-looking chart
— and it would be quietly lying, because the reader would have no way to know
they were looking at one day when they asked for five. Or we can size the picture
to the **question that was asked**, draw only what we actually hold, and let the
empty space say the rest.

We chose the second. The empty space on the right is the product telling you, in
the same breath as the sentence directly beneath it, that we hold prices through
Friday and asked for prices through the following Friday. Nobody has to trust a
caption; the shape of the chart says it too.

That principle is why this task was fenced off from the more obviously exciting
work of colouring the chart in and making it interactive: the honesty has to be
built into the geometry, not added on top of it later. Every future chart in this
product — volume, comparisons, and the ones the AI will open on your behalf —
inherits it.

### The other thing we insisted on: the chart appears before the data does

The frame, the scale and the gridlines are drawn from the size of the space, not
from the prices. So the moment the page opens there is a chart there, waiting,
and the line fills in when it arrives. Right now the data comes back in about
four tenths of a second, so you may barely notice. We built it this way anyway,
because the next story adds a control for asking for a whole month — which takes
three times as long — and the replay feature later on will ask for windows nobody
has measured yet. **A screen that goes blank while it thinks feels broken; one
that shows you the shape of the answer and then fills it in feels fast.**

### How we know the line is right

Not by looking at it. A chart is the easiest thing in software to get subtly and
invisibly wrong — upside down, shifted by a day, plausible and false. So the
picture's coordinates are checked by automated tests against a **recorded
response from the real service**, including one test whose only job is to catch a
chart drawn upside down, and we cross-checked what the screen says against a
direct query to the database: 390 price bars, a closing price of 230.34, history
through 16:00 on the fourth of September. The screen says the same three things.

### On looks

This is a house style rather than a charting library's factory settings, and the
difference is deliberate — a default-looking chart is the fastest way to make a
serious product look like a prototype. The frame is **one hairline along the
bottom**, not a box on four sides. The value scale sits on the **right**, where
the latest price is. The line is **near-black whether the day was up or down**,
because when a line is drawn from two thousand points, colour is the wrong place
to put meaning — and because our green and our red are, measured, almost
identical in greyscale and to a colour-blind reader. Where a night passes between
one trading day and the next, a **dashed vertical rule** marks it, and the label
underneath changes from a time to a date. That is the only vertical line on the
plot, and it exists because the chart skips weekends and closed days rather than
drawing four flat empty gaps into every picture.

All of it was designed on our shared design canvas before it was built, and the
canvas gained a new page for this work showing the assembled panel, the
stops-short rule as a right-and-wrong comparison, and the waiting state.

### Where this leaves the project

Story 2.12 is four tasks into ten. What is left on the chart itself: the
direction shown as shape rather than colour; being able to point at the chart —
or tab to it — and read a single minute's four prices; every other state drawn as
a designed state rather than an answer; a proper description for screen-reader
users; and a performance measurement. Then Story 2.13 adds volume beneath it and
the control that lets you change the time window, and Epic 2 closes.

After that the product gets live prices (Epic 3), then the unusual-activity
detection that is the whole point of it (Epic 5) — and both of those hang their
markers on exactly the axis that was built today.

**What you cannot do yet:** read a specific minute off the chart, see volume,
change the window, or watch a price move. Those are named tasks with owners, not
omissions.
