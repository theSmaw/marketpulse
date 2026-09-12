# CHARTING.md — how MarketPulse draws

**Settled:** 2026-09-11, by [Task 2.12.1](TASK-01-settle-the-charting-decision.md)
**Story:** [2.12 Price Chart](STORY.md) · **Epic:** [Epic 2](../EPIC.md)
**Status:** Accepted. Nothing in this document ships; it is the argument the next
nine tasks build against.

This document is named for drawing rather than for price because only a fraction
of what it settles is about price. The five decisions below are inherited by
**Epic 5's anomaly markers, Epic 8's comparison series and Epic 11's
agent-opened charts**, and the failure mode this document exists to prevent is
not picking the wrong renderer — it is nobody recording what it was picked
against.

**One thing it does not govern.** Task 2.12.1's brief names Epic 6's topology as
an inheritor. It is not one: `PRODUCT_SPEC.md` §27 and `CLAUDE.md`'s _Intended
stack_ both already commit the topology to **Sigma.js/WebGL** with the graph
model kept separate from the renderer. That is a decision taken elsewhere, about
a different problem — 500 nodes and 5,000 edges at 60 FPS — and nothing here
reopens it. **This document governs the 2-D chart layer**, which is price,
volume, comparison and whatever Epic 5 and Epic 9 hang on a time axis.

---

## 0. How the figures below were taken

**Every number in this document was measured on 2026-09-11 in this repository,
and is a dated observation rather than a fact.** Re-take rather than cite.

The spike was a throwaway Vite project outside the repository, with seven
entries built and driven from real Chromium through Playwright 1.62.1 (the
version the browser suite pins, so the browser binary is the one `pnpm e2e`
uses). **It has been deleted.** What survives it is this section.

- **Bundle** — each candidate built as its own entry doing a minimal _real_ use,
  gzipped at level 9, and reported as a delta over a React-and-ReactDOM-only
  baseline of **60,701 B gzipped**. The share column is against this
  application's current bundle, taken the same day from `pnpm build`:
  `dist/assets/index-*.js` is **421,931 B raw / 134,210 B gzipped** (the CSS is
  a further 41,675 / 8,136 and no candidate touches it).
- **Render** — Chromium at 1440×900, `PerformanceObserver` on `longtask`, which
  reports only tasks over 50 ms and is therefore §28's criterion directly rather
  than a proxy for it. **Cold** is the first draw at that size on a freshly
  loaded page, median of five separate pages. **Warm** is a redraw of the same
  size, median of the last five of ten.
- **Typing** — each library's seam compiled under this repository's own flags
  (`module`/`moduleResolution: nodenext`, `strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`).
- **Region width** — measured against the real `/securities/NVDA` route in a
  browser, by accessible role, at six viewports.

### 0.1 A warm floor that is not a cost

Every warm reading below is ~32 ms. **That is two `requestAnimationFrame`s at
60 Hz (33.4 ms) and not work.** The instrument waits two frames to include
paint, so 32 ms is the floor it can report. Read the `>50 ms task` column for
cost; read the warm column only to confirm nothing exceeds the floor.

---

## 1. Decision 1 — hand-built SVG, behind a wrapper. No charting library.

### What was measured

Bundle, gzipped, as a delta over the React-only baseline:

| Candidate                    | Raw delta | **Gzip delta** | Share of the app's 134,210 B |
| ---------------------------- | --------: | -------------: | ---------------------------: |
| **Hand-built SVG**           |   +0.5 kB |     **+279 B** |                     **0.2%** |
| Hand-built canvas            |   +0.4 kB |         +228 B |                         0.1% |
| `d3-scale` + `d3-shape`      |  +25.8 kB |      +10,074 B |                         7.5% |
| uPlot 1.6.32 (incl. its CSS) |  +54.0 kB |      +24,193 B |                        18.0% |
| lightweight-charts 5.2.1     | +167.3 kB |      +54,035 B |                        40.2% |
| Recharts 3.10.1              | +316.3 kB |      +94,809 B |                        70.6% |

Two sub-measurements, because "use d3" is not one choice:

- **`d3-array`'s `ticks` + `nice`** — the nice-number algorithm, which is the one
  genuinely fiddly thing a hand-built chart would miss — builds standalone to
  **1,167 B gzipped**.
- **`d3-scale`'s `scaleLinear`** builds standalone to **8,328 B gzipped**, because
  it drags in `d3-interpolate`, `d3-color` and `d3-format`. The extra ~7 kB over
  `d3-array` buys linear interpolation between two ranges, which is one line of
  arithmetic.

What the output is, and whether the marks reach the accessibility tree — DOM
node count in the document after one draw:

| Candidate                   | Output                  | Nodes @780 | Nodes @9,750 | Marks in the DOM? |
| --------------------------- | ----------------------- | ---------: | -----------: | ----------------- |
| Hand-built SVG (line)       | SVG, one `<path>`       |         11 |           11 | **Yes**           |
| Hand-built canvas           | canvas                  |         11 |           11 | No                |
| Hand-built SVG (candles)    | SVG, 2 els per bar      |      2,350 |   **29,260** | **Yes**           |
| Hand-built canvas (candles) | canvas                  |          8 |            8 | No                |
| `d3-scale` + `d3-shape`     | SVG (we still write it) |         18 |           18 | **Yes**           |
| uPlot                       | canvas                  |         35 |           35 | No                |
| lightweight-charts          | **7 canvases** + 1 svg  |         41 |           41 | No                |
| Recharts                    | SVG                     |        143 |          143 | **Yes**           |

Render cost, cold / warm to paint in ms, and the long-task column that is §28's
actual criterion:

| Candidate                   | 780 cold/warm |   9,750 cold/warm | **>50 ms task @9,750**            |
| --------------------------- | ------------: | ----------------: | --------------------------------- |
| Hand-built SVG (line)       |   26.7 / 32.7 |       26.3 / 32.9 | **none**                          |
| Hand-built canvas           |   25.7 / 32.7 |       25.7 / 32.9 | **none**                          |
| Hand-built SVG (candles)    |   26.7 / 32.8 |   **73.6** / 32.4 | intermittent; **296 ms** observed |
| Hand-built canvas (candles) |   21.1 / 32.9 |       21.8 / 32.6 | **none**                          |
| `d3-scale` + `d3-shape`     |   27.2 / 32.3 |       26.2 / 32.5 | **none**                          |
| uPlot                       |   26.8 / 32.5 |       21.9 / 32.4 | **none**                          |
| lightweight-charts          |   29.1 / 32.0 |       34.3 / 32.2 | **none**                          |
| Recharts                    |   35.7 / 32.7 | **234.4 / 148.0** | **232 ms**                        |

Typing, under this repository's flags. **Three of the four libraries fail at
exactly the seam the brief predicted** — an options object holding a value that
may legitimately be absent:

| Candidate                            | Result                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `d3-array` / `d3-scale` / `d3-shape` | **Clean.**                                                               |
| uPlot                                | `TS2375` — `{ stroke: string \| undefined }` against `Series`            |
| lightweight-charts                   | `TS2379` — against `DeepPartial<LineStyleOptions & SeriesOptionsCommon>` |
| Recharts                             | `TS2769` — no overload matches, `stroke` incompatible                    |

**This is `exactOptionalPropertyTypes` behaving correctly, not a defect in any
library**, and none of the three is fatal — the wrapper branches and builds the
object two ways, which is what `CLAUDE.md` already says about this setting. But
it is a real, recurring cost at every optional prop, and the reason `d3` escapes
it is structural rather than lucky: **a function API has no options bag to
collide with.** Worth knowing before reaching for the next options-bag library.

> One error in the probe was mine rather than a finding: the Recharts entry also
> reported `TS7016` on `react/jsx-runtime`, because the throwaway project had no
> `@types/react` installed. It is discarded. The `TS2769` above is real and was
> reported independently of it.

### The decision

**Hand-built SVG.** One `<path>` for the line, elements for the frame, axes and
gridlines, and **no charting dependency at all** — not even `d3-array`.

### Why, against each alternative

**Recharts is eliminated on two independent measurements.** It is a 70.6%
increase in this application's bundle _and_ it spends **232 ms cold and 148 ms
warm** on a cap-sized series — roughly 4.7× over §28's 50 ms budget, in the one
column that measures §28 directly. Either figure alone would decide it.

**lightweight-charts is eliminated on output and on ownership.** It performs
well and it is a real financial-charting product, which is the problem: it
paints to **seven canvases**, so there is nothing in the accessibility tree to
describe, and it brings its own crosshair, its own legend and its own look.
Task 2.12.8 has to build a text alternative, Task 2.12.6 has to make points
reachable by keyboard, and Epic 5 and Epic 9 have to hang marks on the axis —
in this library all four go through _its_ plugin surface rather than ours, and
its default appearance is undone by fighting it. That is the story's own bar
(_"a chart is the single easiest place to accept a library's default
appearance"_) failed at the point of choosing. 40.2% of the bundle is the
smaller objection.

**uPlot is the strongest library candidate and is still declined.** 18% of the
bundle, excellent render cost, small and sober. But it is canvas: **zero marks
in the accessibility tree**, and this product has to put a filing marker, an
anomaly marker and a keyboard-reachable point on this chart within four epics.
Bespoke hit-testing and a parallel offscreen DOM to describe the picture is more
work than drawing the picture in the DOM in the first place.

**`d3-scale` + `d3-shape` is the closest call, and it was priced apart rather
than taken as a lump.** It is not a renderer — we would still write every SVG
element ourselves — so what it actually buys is scales, a path-string generator,
and nice-number ticks. The path generator is string concatenation. `scaleLinear`
is `(v - lo) / span * range`. **The only part worth paying for is `ticks`/`nice`,
and that is 1,167 B, not 10,074 B.**

So the real question was hand-built-with-`d3-array` against hand-built-with-nothing,
and the repository's own test settles it. `CLAUDE.md` records the precedent as:
keep the library where the hand-rolled version **fails invisibly** (`@fastify/cors`),
throw it away where the hand-rolled version fails visibly (two schema libraries,
an error-boundary library). **A wrong axis tick is visible** — badly spaced or
ugly-numbered ticks are the first thing anybody notices on a chart, and
[Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md) exists specifically to
build scales, domains and ticks as pure functions with tests of their own.

And the decisive asymmetry: **`d3-array` can only tick the y-axis.** The x-axis
here is market sessions, which no library knows anything about — it is
`packages/shared`'s trading calendar. Taking a dependency that handles one of
two axes, while the other is hand-built anyway, is the worst of both.

**Hand-built SVG also wins the fifth criterion outright: there is no default
appearance to undo.** 279 bytes, 0.2% of the bundle, and every pixel is a
decision [Task 2.12.2](TASK-02-the-chart-on-the-canvas.md) gets to take on the
design canvas.

### The one measurement that constrains this decision

**SVG does not scale to one element per bar.** 9,750 candle groups is 29,260 DOM
nodes, 73.6 ms cold at the median and a **296 ms** main-thread task observed —
clearly over §28. Canvas is flat at 8 nodes and shows nothing.

This is not a dodge, because §2 sets the same threshold independently for
legibility: **per-bar marks are only ever drawn when there are few enough of
them to be worth looking at.** The line itself is one `<path>` regardless of
point count — 26.3 ms cold at 9,750, no long task — so the O(n) case only arises
where §2 has already forbidden it.

### Not open: it goes behind a wrapper

Whatever is chosen, it goes in `src/components/<Name>/` with **our** vocabulary
in its props, exactly as `Popover` wraps Base UI. That was not open and is not
reopened. The props are a **declarative description of what to draw** — a series,
a window, a mark type — because Epic 11 opens charts through a typed
`WorkspaceCommand` and invariant 2 forbids the model producing anything else.

### Reversal trigger — a condition

**The first chart this product needs that draws more than ~2,000 individually
styled marks at once.** Measured above: 2,350 nodes at 780 bars is comfortable,
29,260 at 9,750 is not. At that point the _plot layer_ moves to canvas while the
frame, axes and text alternative stay in the DOM — which is why the wrapper's
props are a description of what to draw rather than a handle on an SVG element.

A second, independent trigger: **the first time a hand-built axis produces ticks
a reviewer calls wrong twice.** That is the "fails visibly" test failing, and the
repair is 1,167 B of `d3-array`, already priced.

---

## 2. Decision 2 — a line of closes for V1, and candlesticks have a measured threshold they do not meet

### What was measured

The chart does not live on a page; it lives in the **Price region** of the
Security Explorer grid, which Story 2.11 already placed and sized. Measured
against the real route:

| Viewport  | **Price region** | px per bar @390 | @780 | @1,950 (the default) | @9,750 |
| --------- | ---------------: | --------------: | ---: | -------------------: | -----: |
| 1920×1080 |         1,019 px |            2.61 | 1.31 |             **0.52** |  0.105 |
| 1440×900  |       **923 px** |            2.37 | 1.18 |             **0.47** |  0.095 |
| 1280×800  |           816 px |            2.09 | 1.05 |                 0.42 |  0.084 |
| 1024×800  |           480 px |            1.23 | 0.62 |                 0.25 |  0.049 |
| 768×800   |           352 px |            0.90 | 0.45 |                 0.18 |  0.036 |
| 390×780   |           342 px |            0.88 | 0.44 |                 0.18 |  0.035 |

A candle needs a body, a wick and a gap to read as a candle — call it **5 px of
pitch** (a 3 px body and 2 px of air), which is already mean. At the 923 px
region that is **~184 bars**; at the narrowest region it is **~68**.

### The decision

**A line of closes, for every window this epic serves.** It is a per-timeframe
answer in principle, and at V1's windows the answer is the same one everywhere.

### Why

**The default window is 5 sessions of minute bars — 1,950 bars — which is 0.47 px
per bar at 1440.** A candle body there is under half a CSS pixel and about one
device pixel: it is a line, drawn with two elements per bar and 29,000 DOM nodes
at the cap. The brief said it in advance and the measurement confirms it: _a
candle body narrower than a device pixel is a line drawn expensively._

Even a **single session** of minute bars — 390 bars, the smallest window this API
serves — is 2.37 px per bar. Still under the threshold. **There is no window in
Story 2.12's scope where candlesticks are legible.**

### OHLC is not discarded, and this is the important half

The bars carry all four prices and `PopulatedBarSeries` keeps them. A line of
closes throws that away _visually_; it does not throw it away _from the product_:

- **[Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md)**
  renders the session's **extent** — a high–low band behind the close line, which
  works at 0.47 px per bar because it is one filled area rather than thousands of
  marks — and the direction encoding that survives greyscale.

  > **Corrected 2026-09-11, the same day, while reviewing the task list against
  > these decisions.** This bullet first read _"that is where open-against-close
  > lives"_, and that over-promised 2.12.5: at 0.47 px per bar there is no body to
  > fill or hollow, so **per-bar open-against-close is 2.12.6's readout**, below.
  > What 2.12.5 draws is the high and the low, which a band can carry at any
  > density.

- **[Task 2.12.6](TASK-06-reading-a-point-crosshair-hover-and-keyboard.md)**'s
  crosshair readout gives **all four prices for the bar under the cursor or the
  focus ring**, which is how an analyst actually reads an individual bar — by
  pointing at it, not by measuring a 0.47 px rectangle.

So OHLC reaches the user through the readout rather than the mark. That is a
better answer at this density than a candlestick, not a lesser one.

### Reversal trigger — a condition

**The first window this product offers whose bar count is under ~180 at the
region's measured width.** That is a real prospect and nearly here:
[Story 2.13](../story-13-volume-chart-and-time-window/STORY.md)'s window control can ask for
`1d`, and `1d` over six months is ~126 sessions — **7.3 px per candle at 923 px**,
comfortably legible. At that point the wrapper takes a `mark` prop and the
decision becomes genuinely per-timeframe.

The threshold belongs in code as a named constant when that happens, derived
from the **measured region width at render time** rather than from the viewport,
because §2's table shows the region is 480 px at a 1024 px viewport and 342 px at
390 px — the chart's breakpoints are the region's, and `pnpm verify` cannot see
either number.

---

## 3. Decision 3 — the axis is **session-ordinal**. The labels are temporal.

### The decision

The x-axis positions bars by **index**, not by instant. Bar `i` sits at
`i / (n - 1)` of the plot width. There is no gap between Friday's last bar and
Monday's first.

**The tick labels are real market timestamps**, formatted through
`packages/shared/src/market-time.ts` — the one module allowed to convert UTC to
market time. So the axis is ordinal and the labels are temporal, and that
sentence is the whole of the decision.

### Why — the arithmetic on the actual default window

A continuous time axis over 5 sessions of minute bars spans roughly 4 calendar
days end to end, or ~5,760 wall-clock minutes, of which **1,950 are trading
minutes**. So about **two-thirds of the chart would be empty**, and the moment
the window contains a weekend it is worse. The product's own default window
would open on a picture that is mostly nothing.

The brief is right that this surprises people who expect the first, and the
honest mitigation is not to draw the gap — it is to **label the seam**. Where the
axis crosses from one session to the next, the tick label changes date, and
Task 2.12.2 owns whether that seam gets a visible rule.

### What Epic 9's filing markers inherit — and the consequence that must be designed

Filing markers are **events at instants**, and an ordinal axis has no position
for an instant that falls outside a session. This is not a corner case: **8-K
filings are routinely made after the close**, so _most_ filing markers will land
in a gap this axis does not draw.

The rule, recorded here so Epic 9 inherits it rather than rediscovering it:

1. An instant **inside** a bar's half-open interval is positioned proportionally
   within that bar's slot.
2. An instant **between** sessions has **no position on this axis**. It is placed
   on the **boundary** between the session it follows and the session it
   precedes, and **it must carry its true timestamp in its label** — because the
   axis is now lying about _when_ by design, and the label is the only place the
   truth survives.

Rule 2 is a real cost of this decision and is stated rather than discovered.

### Alternatives weighed

- **A continuous time axis.** Honest about elapsed time, and two-thirds empty at
  the default window. Rejected on the arithmetic above.
- **A broken axis** — continuous within a session, with an explicit break drawn
  between sessions. This is the most truthful option and it is genuinely
  attractive, but it makes every scale non-monotonic in time, complicates every
  future mark's positioning, and buys legibility that the ordinal axis with
  date-changing labels mostly delivers already. Not rejected on principle; not
  worth its complexity at one chart.

### Reversal trigger — a condition

**The first series this product draws whose gaps carry meaning.** The concrete
case is Epic 3's live feed and a **trading halt**: a halt is an absence of bars,
and on an ordinal axis the surrounding bars simply close up, so _the halt becomes
invisible_. The day MarketPulse has to show a halt, an intraday gap has become
information and this axis can no longer represent it.

---

## 4. Decision 4 — the chart opens at 5 sessions of `1m`, unchanged, and now with a reason

### First: a stale premise this task was handed, corrected

Both [`STORY.md`](STORY.md)'s Task 2.9.9 amendment and this task's own brief
instruct that _"a month of minute bars is ~1 MB and ~2.5 s from the UK, and
nothing on the path compresses"_.

**That was true when it was written on 2026-09-10 and false by the end of the
same day.** Task 2.9.10 registered `@fastify/compress`; the section it cites —
`MARKET-DATA-API.md` §12.5, titled _"Nothing on this path compresses"_ — carries
a dated block saying its own title is now false, and the re-taken figures are in
§12.1 and §12.8. The amendment's own escape hatch (_"take it from there rather
than from here"_) is what caught this. §7 below records the sweep.

### The live figures the decision was taken against

`MARKET-DATA-API.md` §12.8's re-take: deployed, from the United Kingdom, `gzip`
arm, n=10, median.

| Window                             |         Wire | Cold miss    | Warm hit   | 304 floor |
| ---------------------------------- | -----------: | ------------ | ---------- | --------: |
| `1m`, one session (390)            |      7,353 B | **333 ms**   | 286 ms     |    310 ms |
| **`1m`, five sessions (~1,950)**   | **29,072 B** | **399 ms**   | **306 ms** |    293 ms |
| `1m`, one month (~9,000)           |    154,480 B | **1,210 ms** | 783 ms     |    413 ms |
| `1d`, the whole stored depth (671) |     16,437 B | **456 ms**   | 507 ms     |    435 ms |

### The decision

**`DEFAULT_SESSIONS = 5` at `1m` stands.** It was chosen in Story 2.11 so the
panel would have bars in it; it survives as the chart's default on its own merits.

### Why

- **399 ms cold, 306 ms warm — inside §28's 500 ms, measured, at the worst
  vantage this product has been measured from.** Against a 293 ms conditional
  floor that is almost entirely the transatlantic link, the window costs about
  100 ms of actual payload. There is no cheaper window that shows more than one
  day.
- **1,950 bars is 0.47 px per bar at 1440** (§2) — dense enough that the line has
  real shape, and the density that makes candlesticks impossible is what makes a
  line worth drawing.
- **A month is the alternative and it costs 1,210 ms.** Three times the budget,
  for a window Story 2.13's control can offer deliberately. Opening there would
  spend the product's first impression on a spinner.

### §28's 500 ms is satisfied by the frame, not by the response, and that rule still stands

This is recorded because it would otherwise be quietly lost now that 5 sessions
comes in under 500 ms on its own. **It must not be.** Story 2.13's control will
offer a month at 1,210 ms, and Epic 13's replay will ask for windows nobody has
measured.

The rule: **the chart paints its frame, its axes, its region and its loading
state immediately, and fills the series in when it lands.** §36 requires this
anyway — a failure or a wait is a product state, not a blank box — and it is what
makes a 1,210 ms window acceptable rather than broken. The chart must never wait
for data to draw itself.

### Reversal trigger — a condition

**The first time the default window's deployed cold miss is measured over
500 ms.** The figure moves with the store's depth, the link and the coding; it is
not a constant. Re-take it, don't cite it.

### One thing raised rather than absorbed

`MARKET-DATA-API.md` §12.4: a `1d` series over the whole stored depth is the
_smallest_ 200 this API serves (671 bars, 16,437 B) and among the slowest —
**20.6 ms of it is the cap check walking 672 sessions of the trading calendar**,
paid on every cache hit. Story 2.13's window control is where "1 year" and "max"
at `1d` would appear, and that walk is what they cost. §12.4 names the repair and
the condition. **It is a `packages/shared` change with its own argument and it is
not Story 2.12's to take.**

---

## 5. Decision 5 — what happens to the facts `BarSeriesPanel` states today

### The governing principle, which decides every row below

**An axis is sampled and it is niced; it therefore never states an exact fact.**
A y-axis whose domain has been rounded to nice numbers deliberately does _not_
have a tick at the true high or the true low, and an x-axis with six or eight
ticks across 1,950 bars deliberately does not have one at the first or the last
instant.

So: **drawing a fact is not the same as stating it, and this product states
facts.** Invariant 6 requires provenance displayed rather than implied; §36
requires coverage honest rather than assumed; §5.2 requires the evidence easier
to inspect than the prose. A chart is prose by comparison.

### The disposition, fact by fact

| Fact `BarSeriesPanel` renders today                                                                  | Disposition                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Headline: last close, change**                                                                     | **Moves into the chart's chrome** as the current-value reading the story's scope asks for — and stays a number in the DOM, in the data face, never a label on the line.                                         |
| **Open / High / Low / Close** of the window                                                          | **Stays stated, beside the chart.** The axis shows the _rounded_ extent; these are the exact figures, and they are different values. Per-**bar** OHLC is a separate thing and arrives on Task 2.12.6's readout. |
| **Asked for / Held** (the two windows)                                                               | **Stays, unchanged.** This is `partial`'s whole content and §6 makes it structural to the drawing.                                                                                                              |
| **Bars — `N × timeframe`**                                                                           | **Stays.** Nothing on a chart says how many points are in it, and at 0.47 px per bar nobody can count them.                                                                                                     |
| **First → last**                                                                                     | **Stays**, for the axis-is-sampled reason.                                                                                                                                                                      |
| **The coverage sentence** (_"Holding all N bars…"_ / _"Holding N bars, through 15:42 — less than…"_) | **Stays, unchanged and un-abbreviated.** §36, and `partial` is the normal case here.                                                                                                                            |
| **Market feed provenance**                                                                           | **Stays, unchanged.** Invariant 6 and `PRODUCT_SPEC.md` §7.1. It is the one row here that is not negotiable at all, and Story 2.14 adds a _second_ label to it when the stitch is drawn.                        |
| **The `Untracked` badge**                                                                            | **Stays.** It is a fact about the security, not about the series.                                                                                                                                               |

### So: nothing stops being rendered, and one thing is added

That is the honest answer and it is deliberate rather than a failure to
economise. **No fact is dropped**, so there is no row owing the _"why it is no
longer needed"_ the brief asks for. What changes is arrangement: the headline
becomes the chart's own reading, and the rest becomes a **stated-facts block
beneath the drawing** rather than instead of it.

The temptation this resolves in advance: a chart makes the numbers beside it look
redundant, and they are not — they are the exact values the picture rounds. A
future task that deletes them to tidy the region is deleting the thing that makes
the region honest.

### What Task 2.12.4 must take down deliberately

`BarSeriesPanel` states that it draws nothing, and
`e2e/specs/security-series.spec.ts` asserts it: **no `<canvas>` and no `<svg>` in
the Price region.** Story 2.10 built that fence so this story would take the
charting decision against a data layer already known to be right. It has served
its purpose — that is what §0's measurements were taken against. **The spec
changes first, in the same commit as the chart, with a reason in the diff.**

### Reversal trigger — a condition

**The first time the stated-facts block is measured taller than the drawing it
accompanies at any of §2's six region widths.** At that point the block has
stopped accompanying the chart and has become the page, and the repair is
progressive disclosure of the _exact_ figures — not deletion of them.

---

## 6. Two things this story inherits and must not re-take

Recorded here because the next seven tasks will read this file and not
[`FRONTEND-STATE.md`](../story-10-frontend-market-data-layer/FRONTEND-STATE.md).

### 6.1 A window is named and resolved by the server, never computed from the browser's clock

Send `sessions=N`. The server resolves it against the market date and reports
what it meant in `coverage.requested`. `FRONTEND-STATE.md` §3 and
`bar-series-query.ts`'s header both hold the argument: a browser in Singapore at
09:00 local is still on the previous market date in New York, so a client
resolving "the last five sessions" itself is off by one session for roughly half
the world for several hours of every day. **It produces a chart that is plausible
and shifted rather than an error anybody sees** — which is the worst shape a
defect can have on a chart.

The mechanism already prevents it: `SeriesWindow`'s named member has no instants
in it, and neither `bar-series-query.ts` nor `api-client.ts` constructs a `Date`.
**The chart must not be the first thing that does.**

### 6.2 `partial` is an answer, and it decides where the x-domain comes from

Bars covering less than the window asked for is the **normal** case here — the
store is backfilled nightly and the free plan withholds the most recent ~15
minutes — and a chart must be able to draw a series that stops before its own
x-axis does.

**The single most important consequence, stated here because it is the defect
that will otherwise ship:**

> **The x-axis domain comes from `coverage.requested`. It does not come from the
> bars.**

Derive the domain from the bars and a `partial` series silently rescales to fill
the frame and **looks complete**. The line reaches the right-hand edge, the axis
ends at 15:42 with no indication it was asked for 16:00, and nothing anywhere
goes red — `pnpm verify` cannot see it and neither can a reader. Take the domain
from `requested`, draw the line only across `covered`, and **the difference
becomes visible space at the right-hand edge**, which is exactly what the
coverage sentence beside it says in words.

Two further rules inherited whole:

- **`view` is taken as a union, never spread into props.** A component receives
  the state and renders the member it is given.
- **A held answer stays on screen, marked, while the next one loads, and the mark
  never touches a number** — no dim, no blur, no fade, no skeleton over a price.
  A chart that redraws a held series _in a second style_ is
  `FRONTEND-STATE.md` §2's stated reversal trigger for promoting `stale` from a
  flag to a seventh union member. **If Task 2.12.7 needs that, it is taken there,
  not locally.**
- **Eleven recorded response bodies exist**, and `barSeriesFixtureView(name)`
  returns the state built through the real transition. **Do not construct a state
  by hand**: a hand-built `partial` whose coverage disagrees with its bars is
  unreachable in the real layer, and a chart tuned against one draws the real
  thing wrongly.

---

## 7. The design surface — what is being asked of Task 2.12.2, not answered here

> **Answered 2026-09-11 by Task 2.12.2.** This section is preserved as the
> question it was. The answers, and the three things the canvas and this
> repository each knew that the other did not, are in **§7.1** below.

[ADR 0026](../../../docs/adr/0026-the-design-canvas-as-the-source-of-truth.md)
fixes the chain: **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components.**
This document is the source of truth for the **mechanism**; the canvas is the
source of truth for the **language**. Where a value is wanted, it is 2.12.2's.

**What exists today:** `--price-positive` (`#0f7b50`), `--price-negative`
(`#c5221f`), `--price-unchanged`, the `--rule-*` family, the surfaces, and
`--font-data`. **There is no chart vocabulary at all.**

The list 2.12.2 is being asked for:

1. **Axis ink** and **tick-label ink** — and whether they are one value or two.
2. **Gridline weight and colour.** `--rule-hairline` measures **1.27:1** against
   `--surface-raised` today, which is right for a table rule and may be wrong
   behind data.
3. **The plot area's surface** — whether the chart sits on `--surface-raised`
   unchanged, or on its own ground.
4. **The series line's own ink and weight**, at the six region widths in §2.
   A 1 px line at 342 px and at 1,019 px are different-looking objects.
5. **The up/down pair for [Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md).**
   Measured today, by luminance ratio: `--price-positive` against
   `--price-negative` is **1.096:1** — for practical purposes indistinguishable
   without hue. `CLAUDE.md` records the same finding by a different method
   (1.04:1 in greyscale); the substance is identical and is load-bearing.
   **Colour is never the sole encoding**, so 2.12.2 must supply the **shape,
   sign, glyph or word** that carries direction, not just the hue. (Both inks
   clear 5:1 against both surfaces, so the contrast floor is not the issue —
   telling them apart from each other is.)
6. **The crosshair's treatment**, and whether it differs under pointer and under
   keyboard focus.
7. **The `partial` region's treatment** — what the visible space at the
   right-hand edge in §6.2 actually looks like. It must not read as a rendering
   failure and it must not read as flat data.
8. **The focus ring on a chart point.** `--focus-*` is a global
   `:focus-visible` rule designed for controls on a surface; a ring on a point on
   a line is a question the token layer has not been asked.
9. **The session seam** — whether the boundary §3 creates gets a visible rule, a
   date-changing label only, or both.
10. **Tabular figures on axis labels**, so the y-axis does not shimmer as values
    change width. Story 1.4 measured a 14.3 px spread on this.
11. **Density at the six measured region widths** — how many ticks, how much
    padding, and at what width the chart stops showing an axis at all.

---

## 7.1 The eleven answers — added 2026-09-11 by Task 2.12.2

The section above was written to be answered elsewhere and it was: the positions
were taken on **`Price chart.dc.html`**, a third file in the
`Component library for MarketPulse` project, and the reasoning behind each one is
in `VISUAL-LANGUAGE.md`'s _The chart_ section. This table is the index, so a
reader of this document does not have to open three artefacts to find out what
was decided.

| §7's question                 | The answer                                                                                                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Axis ink / tick-label ink  | **Two values.** `--chart-axis` is the structural near-black; tick labels are `--ink-secondary` at `--font-size-micro` in `--font-data`. The micro-label idiom's size and ink are adopted, its uppercase and letterspacing are **not** — a number has no case |
| 2. Gridline weight and colour | `--chart-grid`, the hairline value, **horizontal only**, 1px. The 1.27:1 that §7 flagged as an open question behind data was kept                                                                                                                            |
| 3. The plot's surface         | `--surface-raised`, unchanged. **No chart ground**, and no token for one                                                                                                                                                                                     |
| 4. Series ink and weight      | `--chart-series` (near-black, never coloured by direction) at **1.5px**, measured against both ends of the region range                                                                                                                                      |
| 5. The up/down pair           | The non-colour channel is **the reference rule and the side of it the line finishes on**. See below — this is the one that moved furthest from what §7 anticipated                                                                                           |
| 6. The crosshair              | **One treatment for pointer and keyboard.** A `--chart-crosshair` vertical rule and a white disc with a near-black ring on the line                                                                                                                          |
| 7. The `partial` region       | `--chart-uncovered` behind it, a dashed vertical at the coverage edge, and the series **clipped** there rather than drawn to the frame                                                                                                                       |
| 8. The focus ring on a point  | **The existing global ring. No new token.** The disc is hollow so a near-black outline has something to sit outside of                                                                                                                                       |
| 9. The session seam           | **Both** — a dashed vertical rule, and the tick label there changes to a date while everything between stays a time. It is the only vertical rule this chart draws                                                                                           |
| 10. Tabular figures           | Yes, by construction: every figure is `--font-data`                                                                                                                                                                                                          |
| 11. Density                   | Four breakpoints on the **region's** width, 280px/220px plot heights, 5→3 gridlines, and **the axis never disappears**                                                                                                                                       |

### The three places the canvas and this repository met something the other did not know

ADR 0026's exception is for a canvas value that fails a measured accessibility
floor. **It did not fire here** — nothing was overridden — and these three are
recorded because they are the same _shape_ of event and would otherwise read as
unrecorded divergence.

1. **`#c4c6cf` was adopted for the session seam**, and it is the value that
   exception previously _rejected_ for an input boundary at 1.70:1 against WCAG
   1.4.11's 3:1. Nothing is reversed: 1.4.11 is about identifying a control, and
   a gridline behind data is not one. Worth stating plainly, because a reader who
   finds the same hex on both sides of a recorded deviation will otherwise
   conclude one of them is a mistake.
2. **The washes are decorative by measurement, not by choice.**
   `--price-positive-wash` and `--price-negative-wash` differ by **1.009:1 under
   `grayscale(1)`** — the inks they are drawn from differ by 1.096:1, and washed
   back to a fill they are the same colour. That is stronger than the 1.04:1
   `CLAUDE.md` records for the inks. No floor was failed, because a decorative
   fill has no floor; what the measurement forced is the ordering — geometry
   first, hue second — rather than a different value.
3. **The extent envelope was drawn and declined.** §2's amendment left the
   high–low band as a live design question and gave 2.12.5 the decision. Drawing
   it on the canvas settled the half this task owns and produced a finding worth
   having before 2.12.5 starts: **at `1m` a bar's high and low sit within a few
   hundredths of a percent of its close, so the envelope is a hairline around the
   line and is effectively invisible.** It earns its space at `1d`, which Story
   2.13's window control is what brings. If 2.12.5 ships it, it is
   `--price-unchanged-wash`, beneath the directional fill, and off at `1m`.

### One thing §7 asked for that the answer made unnecessary

§7's question 5 says 2.12.2 "must supply the **shape, sign, glyph or word** that
carries direction". It supplies none of those **on the plot**, and that is the
answer rather than a gap: the plot carries direction as **position** — above or
below a rule at the window's opening close — and the sign and the glyph are
already on `PriceChange`, which `CHARTING.md` §5 moves into the chart's chrome as
the current-value reading. Adding a fifth encoding to a mark that already has
three would be noise.

### What this did not decide

The volume chart, which inherits this axis and this frame; motion, which
`VISUAL-LANGUAGE.md` defers to Epic 3 against something that actually moves; and
whether the extent band ships at all, which is 2.12.5's. **Nothing was drawn in
the application** — the tokens exist, one Storybook specimen shows the marks, and
Task 2.12.4 is still the first chart.

---

## 8. The sweep this task owed upward

`CLAUDE.md`: _a measurement that falsifies a governing document is swept the same
day, and falsification travels upward._ §4 found one.

`STORY.md`'s Task 2.9.9 amendment instructs this story against a payload figure
and a compression claim that Task 2.9.10 invalidated on the same day it was
written. **`MARKET-DATA-API.md` already carries its own dated correction** —
§12.5's title is marked false in place and §12.1 and §12.8 hold the re-taken
figures — so the subject document is not wrong. What was still standing was the
**instruction to this story**, in `STORY.md` and in this task's own brief.

**Every instruction site has been given a dated amendment beside the stale
sentence rather than a rewrite**, per `CLAUDE.md`'s rule that story and task
files record what was true when they were written. This document's §4 carries
the live figures.

There are **three**, and the third is the interesting one:

1. `STORY.md`'s Task 2.9.9 amendment.
2. **This task's own brief**, whose Decision 4 bullet repeated the claim.
3. **[Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md)'s _Paint the frame
   immediately_ bullet** — _"~0.6 s for one session and ~2.5 s for a month from
   the UK, with nothing on the path compressing."_

> **Amended 2026-09-11, later the same day.** This section originally said there
> were two sites and that _"nothing else in the tree repeats the claim"_. **That
> was wrong**, and it was found by reviewing the nine downstream task files
> against these decisions rather than by the grep — because the grep was run, and
> the third site **was in its output**. The claim was written from the two sites
> that had been corrected rather than from what the output actually showed.
>
> This is precisely the failure `CLAUDE.md` names — _"recording a correction and
> propagating it are two obligations"_ — occurring **inside the task that swept
> the correction**, and one file away from the task whose own Notes warn about
> it. It is recorded rather than quietly fixed because the lesson is not "run the
> grep"; the grep ran. It is **read the grep's output to the end before writing
> down what it found.**

### What the grep actually found, and why most of it is correct as it stands

`CLAUDE.md` warns that a duplicated sentence must be **counted with a grep before
it is corrected**, and that a live claim must be told apart from a historical
record. Doing that here changed the answer, so it is recorded rather than
summarised:

- `grep -rn "on th[ie]s* path compresses" --include="*.md"` finds **nine** sites.
  Seven are in Story 2.9's own documents, where they are the historical record of
  what Task 2.9.9 measured — including `MARKET-DATA-API.md` §12.5's title, which
  Task 2.9.10 already marked false **in place** and deliberately left standing,
  and `TASK-11`, which records that it was left standing on purpose. **Those are
  correct as they are and were not touched.** The two live ones are the two
  amended above.
- `grep -rn "1,060,490" --include="*.md"` finds **thirteen** sites, and **almost
  none of them is wrong.** 1,060,490 B is still the exact _identity_ body of a
  month of minute bars — §12.1's re-take reports it unchanged in the "Wire,
  identity" column. Story 2.10's uses (`FRONTEND-STATE.md`, ADR 0023, two task
  files) are about the **conditional request collapsing a body to zero**, and
  that claim is unaffected by a coding: what changed is only that the body it
  collapses is now 154,480 B on the wire.

So the defect was **narrower than the grep count suggests**: one inference, drawn
twice, in two documents instructing this story. The figure itself was never
wrong — it was being used to mean _what crosses the link_, which it stopped
meaning on 2026-09-10.

---

## 9. What a settled `CHARTING.md` does and does not certify

**It certifies** that five decisions were taken against figures measured in this
repository on 2026-09-11, with the alternatives that lost and a condition that
would reverse each one.

**It does not certify** that the chart will be good. Every figure here is a
constraint; none of them is a design. The story's bar — would a stranger believe
this is a real funded product, does it look designed rather than defaulted, is
there a moment in it worth showing somebody, does it feel alive — is applied to a
screenshot at [Task 2.12.10](TASK-10-deployed-verify-document-and-adr.md), and a
renderer with a 279-byte bundle cost and a clean type seam can still fail all
four.

**It also does not certify a vendor.** Four libraries were measured at four
versions on one machine in one browser on one day. A candidate rejected on 40%
of a bundle is rejected against _this_ bundle, which grows through eleven more
epics.

The decisions are recorded in **ADR 0027** at
[Task 2.12.10](TASK-10-deployed-verify-document-and-adr.md), which is also where
this document is reconciled against what was actually built.

---

## 10. What building the arithmetic found — added 2026-09-11 by Task 2.12.3

[Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)'s brief says that if a
decision there appears to force the shape of the component, that is a finding to
record here rather than a licence to start drawing. Four did. None of them
reverses a decision above; three of them are things a renderer would otherwise
discover by being wrong.

### 10.1 §6.2's visible space does not appear when the shortfall is not trading time

**This is the one that changes what
[Task 2.12.7](TASK-07-every-chart-state-drawn.md) is drawing.** §6.2 says the
x-domain comes from `coverage.requested`, so a `partial` answer stops short of
the right-hand edge and the difference becomes visible space. That is true — and
it is true **only of a shortfall made of trading minutes**.

The recorded `partial` fixture is the counter-example, and it is not a contrived
one: it holds 60 bars covering Friday 15:00–16:00 ET against a window requested
to Saturday 16:00 ET. On a **session-ordinal** axis that window has exactly 60
slots in it, because Saturday contributes none — so the bars fill the frame and
there is no space to draw.

That is the ordinal axis being _more_ honest than a continuous one, not §6.2
being broken: a shortfall made of a weekend is not a shortfall a chart should
leave a hole for. But it means **`partial` is not a synonym for "the line stops
early"**, and a task that builds `--chart-uncovered` against that fixture alone
will build a treatment nothing exercises. The state that does show space is a
window whose _trading_ minutes are uncovered — the ordinary one, since the free
plan withholds the most recent ~15 minutes of a session in progress.

### 10.2 The reserved anomaly-marker lane has 2.3 px of headroom at the compact height

§7.1 and `VISUAL-LANGUAGE.md` put Epic 5's markers in a 16 px lane inside the
plot's top padding, and 2.12.2 stated the pad as 10% of the data's extent. Those
two are in different units and the arithmetic connecting them was not taken.

It is: the padded domain is `1.2 ×` the extent, so the top pad is
`plotHeight / 12` — **23.3 px at `--chart-height` (280) and 18.3 px at
`--chart-height-compact` (220)**. Both clear 16 px, and the condition that ends
that is **a plot shorter than 192 px**, which is below every height the density
table defines. The pad is therefore spent, not spare, and
`chart-value-axis.ts`'s constant carries the arithmetic beside it so a later
tightening is a visible trade rather than a tidy-up.

### 10.3 The density table splits into a flag and a pair of tokens, not a number

§7.1's answer 11 is four breakpoints on the region's width carrying tick counts
**and** plot heights **and** gutter widths. Only the first is arithmetic: the
heights and the gutters are `tokens.css` values, and `CLAUDE.md`'s rule is that
CSS is the source of truth for a token.

So `chartDensity(regionWidth)` returns the counts and a `compact` **flag**, and
the component reads the token pair the flag selects and hands the numbers to the
scales. The consequence is that **the 600 px boundary is now spelled twice** —
once in a media query, once in that module — and nothing can check they agree,
because no stylesheet is applied in the test environment and jsdom computes no
layout. It is the same class of gap as the Security Explorer's column count and
it is recorded on `CLAUDE.md`'s list.

### 10.4 `d3-array` was not needed, and the trigger has not fired

§1 pre-approved 1,167 B of `d3-array` if this task disagreed with the decision to
hand-build, and named the condition: _a hand-built axis producing ticks a
reviewer calls wrong twice_. The nice-number selection is **28 lines**, it is
verified against the recorded fixture rather than by eye, and the two failures
the brief named by hand — a label past the last bar, and a tick every 7 minutes —
are each a test. The dependency stays declined and the trigger stands unfired at
zero.

One thing was added that `d3` would not have supplied: **the step is floored at
a cent**, because prices are rendered to two decimals and a finer step produces
two gridlines carrying the same label. Choosing the step and rounding the label
have to agree, which is the rule `directionOf` already follows for a percentage.

---

## 11. What drawing it found — added 2026-09-12 by Task 2.12.4

[Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md) is the first task in
this story to put a mark on a screen. Three things came out of it that are not
in §10, and none of them reverses a decision above. Two are corrections to
instructions §10 gave, taken with their reasons; the third is the one worth
reading if you only read one.

### 11.1 The component reads no token, and that is a deviation from §10.3 taken deliberately

§10.3 says `chartDensity` returns a flag and the component "reads the token pair
the flag selects and hands the numbers to the scales". **It does not.** It sets
a density class and **measures the elements the stylesheet sized**, with one
`ResizeObserver` watching the chart and the plot.

Three reasons, and the first is disqualifying on its own:

1. **`getTokens()` throws in the test environment.** No stylesheet is applied
   there — which `CLAUDE.md` records as the structural reason "do not assert on
   colour" is not merely a discipline — so a component that called it would take
   every one of its own jsdom tests down with it.
2. **The measurement _is_ the token, resolved.** The plot element's height is
   whatever `--chart-height` says after the density class has chosen which of the
   pair applies. Reading the token and re-deriving the box would be the second
   spelling of a value CSS already owns.
3. **The gutter stops being something to remember.** §10's amendment warns that a
   scale built against the region width draws a line under its own labels. Here
   the measured element is the plot and the gutter is a sibling column it never
   contains, so the rule holds by construction rather than by a subtraction
   somebody has to keep doing.

**And it collapses the gap §10.3 recorded**, which is the part that matters
beyond this component. §10.3 says the 600px boundary is "now spelled twice —
once in a media query, once in that module — and nothing can check they agree."
It is spelled **once**, in `chart-density.ts`. There is no media query in
`PriceChart.module.css` at all; the stylesheet keys on a class the component
sets from that module's answer. `CLAUDE.md`'s corresponding entry is amended
rather than deleted, because the duplication it warns about is exactly what a
later author would reintroduce by reaching for a media query.

### 11.2 A `<line>` is invisible to a browser test, and two specs were written wrongly first

Playwright's visibility check is a non-empty bounding box. **A horizontal
gridline is zero pixels tall**, so every mark this chart draws except the series
reports `hidden` — and `expect(gridline).toBeVisible()` goes red against a chart
that is on the screen and correct.

Recorded because it is not a quirk to route around once: it is a property of
SVG that every later chart spec meets, Story 2.13's volume chart is the next one
to meet it, and the failure looks exactly like a chart that did not render. The
instrument is a **count**.

### 11.3 The default window on a developer's store is the honest `partial`, and it draws §6.2 in public

The local store answers `sessions=5` with **390 bars covering one session of the
five**, because the backfill is paced and sequential and had reached 2026-09-04.
So the first chart this product ever drew is a line occupying a fifth of its own
frame with four empty sessions to the right of it.

That is §6.2 working, in the browser, on the first run — and it is worth saying
plainly because it is the opposite of what a reviewer expects to see and the
temptation to "fix" it is real. **The fix would be the defect.** A domain taken
from the bars would have filled the frame, looked complete, and disagreed
silently with the sentence directly beneath it, which says we hold through
2026-09-04 and asked through 2026-09-11.

It also corrects §10.1's implication in one direction worth stating: §10.1 warns
that the recorded `partial` **fixture** exercises none of the uncovered
treatment, because its shortfall is a weekend. True — and the **live** default
window is the ordinary case that does, on any store the backfill has not caught
up to the current session. Task 2.12.7 has a real state to build against without
constructing one; it is what `/securities/NVDA` shows today.

---

## 12. What direction found — added 2026-09-12 by Task 2.12.5

[Task 2.12.5](TASK-05-what-a-session-did-and-direction-without-colour.md) drew
the dashed reference rule and the directional wash, which were the last two
marks §7.1 decided and nothing had built. Four findings, and the first is a
decision the task was explicitly handed rather than something it discovered.

### 12.1 The rule sits at the first held bar's **open**, and that is one turn past the question

§7.1 settled the rule's position as _"the window's opening close"_. Task 2.12.4's
amendment then spotted that the phrase has one meaning while the answer is
`loaded` and two while it is `partial` — which is the normal case on this screen
— because `covered.start` is not obliged to equal `requested.start` and there may
be **no bar at the requested window's opening instant at all**. It named two
candidates and said candidate 1 was almost certainly right and must still be
taken deliberately.

**Taken, and sharpened.** The rule is at **the first bar this system holds**, and
at that bar's **`open`**.

- **The first _held_ bar**, because it keeps the rule on the line, always, so the
  reading — _the side of the rule the line finishes on_ — always works. The
  alternative floats a datum at a price nobody observed, or suppresses the
  channel exactly when coverage is short.
- **Its `open` and not its close**, which the amendment did not ask about and
  which turns out to be the load-bearing half. `series-facts.ts` computes the
  reading above the plot as `(lastClose − firstOpen) / firstOpen`, and the design
  canvas names the stated `Open` figure as _the same fact_ the rule draws. Put
  the rule at the first bar's close and the picture and the figure are one bar
  apart: invisible at `1m` in almost every window, and visible in exactly the one
  that matters — a window whose first bar straddles its own final close reads as
  up in one channel and down in the other.

The same number in both, or the channels are not repeating each other; two
channels disagreeing is worse than either being wrong alone. It is held by a test
that imports `BarSeriesPanel`'s own arithmetic rather than re-deriving the open,
because the invariant spans two components and a test that re-implemented it
would be asserting that one file agrees with itself.

**The canvas was corrected in place**, since it is the source of truth and the
phrase originated there. `Price chart.dc.html`'s §04 now says _the price the
window opened at_ and names the refinement with its date.

### 12.2 The extent band is declined, and the decision is in the component

§7.1's third finding drew the high–low envelope and found it a hairline at `1m`.
This task's obligation was **a stated decision rather than an absence**: a chart
that silently draws no band and a chart that decided not to are the same picture
and different artefacts.

**It is not drawn, at any window this story serves**, and the argument is
unchanged from the canvas's: at `1m` a bar's high and low sit within a few
hundredths of a percent of its close. `CHARTING.md` §5 keeps High and Low as
_stated facts_ beneath the plot precisely because the picture rounds them, and
that remains the honest place for them until a timeframe arrives where a
session's range is a real distance. **Story 2.13's window control brings `1d`**,
and when it does the band is `--price-unchanged-wash` beneath the directional
fill — decided, so 2.13 does not re-take it. The frame already fits it: §10's
price domain is taken over the bars' `high` and `low` rather than their closes.

### 12.3 The wash's trap is the `--marker-color` trap upside down — it fails **loudly**

`CLAUDE.md` records that `Marker` renders nothing visible unless its row sets
`--marker-color`: a fill whose ink is a consumer's responsibility, failing
silently. This chart's fill looked like the same shape and the component answers
it structurally — a total `Record` over the three directions, so a fourth
direction is a compile error rather than an invisible area.

**The browser spec written to catch it was green against the break.** Asserting
_the area is filled with some colour_ passed with the ink class deleted, because
**SVG's initial `fill` is black**. So the failure here is not an invisible area
at all; it is a plot flooded with near-black, which is loud and which nobody
would ship. The spec now reads the fill as three channels and asserts every one
of them is above `0xd0` — the class of colour a wash is, rather than a second
copy of `market.css` — and **that version was verified red by restoring the
break**.

Worth recording beyond this chart: _a fill and a mark are different traps_. A
`<use>` of a silhouette inherits `currentColor` and disappears; a `<path>`
defaults to black and shouts. Reaching for the recorded trap by analogy produced
a test that tested nothing.

### 12.4 The density bullet is discharged, and it cost one 222 KB fixture

The task's Work section asks what happens as marks overlap. §1 and §2 had already
largely answered it — the line is one `<path>` at any point count — and the area
adds no marks: **it is the line's own `d` with two segments and a close appended**
rather than a second walk over the bars, so 1,950 points stay 1,950 points twice
rather than four times.

What could not be answered by argument is whether the thing _reads_ at 0.47 px
per bar, and no recorded body had more than 150 bars — 3.5 px at the measured
923 px region, which is the comfortable end. A fixture was recorded at the real
density: `dense.json`, **1,950 bars over five sessions, `loaded`, 222 KB**. It is
now the largest single file in `apps/frontend/src/fixtures/`, larger than the
recorded universe, and `CLAUDE.md`'s _must not reach the shipped bundle_ entry
names it with its own re-measure command.

It earns the weight. It is the only artefact in this repository that shows what
this product actually opens at — five sessions, four seams, the wash passing
under every gridline and every seam — and Task 2.12.9 measures against it rather
than constructing one.

### 12.5 The verification is a rendering, not a claim

The task asks for simulation rather than reasoning, which is how Task 1.4.4
verified the palette. Four windows — rose, fell, flat, dense — are stories in the
workshop, and **the same four again under `grayscale(1)` and under a Machado
deuteranopia matrix**.

Read on 2026-09-12 in Chromium at the 1,019 px region:

- Under `grayscale(1)` the positive, negative and neutral washes are **three
  indistinguishable greys**, exactly as the 1.009:1 measurement predicts. Every
  window's direction is still readable, because the line finishes above the rule,
  below it, or on it.
- Under the deuteranopia matrix the positive and negative washes collapse toward
  **one warm off-white** while the neutral stays faintly cool. The two that carry
  meaning are the two that become identical — which is the finding stated as a
  picture rather than as a ratio.
- The flat window is the one worth having drawn. HD's hour wandered 66 cents and
  ended where it began, so the fill has real area on **both** sides of the rule
  and the reading is _neither_ — a state that is legible rather than degenerate.

A filter in a story rather than a screenshot in a document, deliberately: a
screenshot goes stale the first time a token moves, and a story is re-read every
time somebody opens the workshop.

### 12.6 The wash splits at the rule — revised 2026-09-12, the same day, on a screenshot

**§12.5's greyscale reading was right and it was not the whole review.** Looking
at the chart in colour, at the stakeholder's prompting, found something the
simulations could not: the early part of a window that dips below its opening
price and recovers was painted **green**, because the whole area took one tint
chosen by where the line **finished**.

That is the rule this story exists to enforce, broken by the mark built to
enforce it. Hue and position agreed at exactly one point — the last one — and
contradicted each other everywhere the line was under the rule. It is a
window-level fact painted over regions that locally disagree with it.

**The area is now split at the rule: `--price-positive-wash` above,
`--price-negative-wash` below.** The tint is a function of _position_, which is
the channel that survives the hue being removed — so this is **strictly stronger**
against §12.5's 1.009:1 measurement rather than a change of taste. What the hue
repeats is now exactly what the geometry says, at every point.

#### What it cost, and what it did not

- **The neutral state is gone.** A split has no third case: every point is above
  or below. `--price-unchanged-wash` therefore has **no consumer in the
  application**, and keeps exactly one documented future one — the high–low
  extent band, if Story 2.13's `1d` window brings it (§12.2). It is not deleted,
  and [Task 2.12.10](TASK-10-deployed-verify-document-and-adr.md)'s token audit
  should read it as _deferred_ rather than as a task that did not ship.
- **`DirectionalArea` lost its third field.** It carried the window's direction
  to pick the ink; there is no ink to pick. It is a rule's `y` and a path, and
  the pairing §12 opens with is untouched.
- **The point string did not double.** The area is defined **once** in `<defs>`
  and drawn through two `<use>` elements clipped above and below the rule. The
  obvious implementation — two geometrically-split paths, clamping the line to
  the reference in each direction — would have doubled both the arithmetic and
  the DOM parse of the one thing on this chart that is linear in bar count.
- **The three channels still agree.** The headline still states the _window's_
  direction with a glyph, a sign and words, and the line still finishes on one
  side of the rule. What stopped being a window-level claim is only the fill.

#### The finding, stated generally

**A simulation proves the encoding survives a transform; it cannot tell you the
encoding was answering the right question.** Greyscale and deuteranopia both
passed against a chart whose colour was locally wrong, because removing the hue
removes the disagreement. The instrument that found this was a person looking at
it in colour — which is the fourth of `VISUAL-LANGUAGE.md`'s four tests, applied
by the stakeholder rather than by a test suite.

---

## 13. What reading a point found — added 2026-09-12 by Task 2.12.6

The crosshair, the readout, and the keyboard path to the same reading. Six
findings, and the first two are decisions Task 2.12.3 explicitly left open.

### 13.1 A slot with no bar: the crosshair **snaps**, and the timestamp is what makes that honest

Task 2.12.3 handed this task the choice and said both answers were defensible:
over a slot with no bar, snap to the nearest _placed_ bar, or show no reading at
all.

**It snaps**, and the deciding argument is not smoothness. It is that
`nearestPlaced` returns an **index** and the readout leads with **that bar's own
market timestamp**, so a reader is always told which minute they are reading.
A snap that names what it landed on cannot mislead; the alternative's honesty is
purchased with a blank readout across the entire uncovered span of a `partial`
answer — which is the normal state of this screen — and with `→` presses that
visibly do nothing.

The crosshair is therefore drawn at the **bar's** pixel rather than at the
pointer's, so the vertical rule and the disc can never disagree about which bar
is being read.

### 13.2 The arrows step **bars**, not slots

The same decision from the other end. Stepping slots means a press can land on
nothing; stepping bars means the crosshair travels an uneven distance on some
presses. At the density this chart opens at — **0.47 px per bar** — that
distance is invisible, and where it is visible the gap _is_ the missing data.

### 13.3 No recorded body in this fixture set has a hole in it

**A finding rather than a decision**, and it is why §13.1's arithmetic is tested
one level below the geometry. Two obvious assertions were written in
`chart-geometry.test.ts` first and both went red:

- _the last reading stops short of the frame on a `partial`_ — false, because
  this recording's shortfall is **overnight**, which §10.1 already recorded;
- _a short answer holds fewer readings than the axis has slots_ — false too:
  **60 bars on 60 slots**.

That is not a gap in the fixtures. It is what a liquid S&P 500 security's stored
minutes actually look like. So the case the crosshair would read wrongly — a
minute with no prints, shifting every reading after it by one — **cannot be
reached from a recording**, and `chart-time-axis.test.ts` holds it with written
objects. The rule this repository usually applies (record, never write) is
inverted here deliberately and for a stated reason.

### 13.4 The announcement rate: two numbers, both search's, and the second is the one that matters here

`READING_ANNOUNCEMENT_DELAY_MS` is **400** and
`READING_ANNOUNCEMENT_MIN_GAP_MS` is **1,500** — the same pair Task 2.11.9
settled for search, adopted rather than re-derived, which is a judgement
inheriting a measurement and is said plainly here rather than dressed up.

What differs is which of the two does the work. Search's problem was a slow
typist making every keystroke look like the last one. **A held arrow key is that
failure with the brakes off**: a browser repeats at roughly 30 a second once the
initial delay elapses, so the delay never fires and the floor is the whole
mechanism. Holding `→` across a session announces the bar the crosshair is on
_now_, at most about twice a second, rather than a backlog of the ones it has
left.

**And a pointer announces nothing at all.** A live region driven per
pointer-move is actively hostile, and the person moving a mouse is not the person
listening. The reversal trigger is search's: somebody reporting that it speaks
over them or arrives late.

### 13.5 The focus ring lands on the **plot**, which corrects the canvas

`Price chart.dc.html` and `VISUAL-LANGUAGE.md` both said the disc is hollow _"so
the focus ring can land on it"_. **The hollow disc is kept and its reason is
unchanged** — a near-black ring around a near-black filled dot on a near-black
line is invisible. Where the ring lands is wrong, and building it is what showed
why.

With **one tab stop** — which §1's element-count constraint requires, since the
alternative is 1,950 — the point a ring would sit on **may not exist**: a person
arriving by `Tab` has focus before they have a reading. So the ring is the
existing global one, on the plot, because the plot is the control. Two
consequences that are load-bearing rather than incidental:

- **Arriving by keyboard opens on the last bar**, so focus is never a state with
  nothing in it, and the reading a person lands on is the same figure the
  headline above the plot already shows.
- **`Escape` clears the reading and keeps focus**, which is only legible because
  the ring is on the plot rather than on a disc that has just gone.

`Price reading.dc.html` §04 carries the drawing and the argument; the canvas and
`VISUAL-LANGUAGE.md` were both corrected the same day, in that order.

### 13.6 The readout is a reserved strip under the axis, and the reservation is load-bearing

Three placements were drawn and two declined (`Price reading.dc.html` §01). Over
the plot needs collision-avoidance logic and moves while a number is being read;
a column beside the plot does not survive **342 px**, which is the Price region's
width at a 390 viewport, so it would need a second layout — the same argument
that gave this chart one crosshair rather than two.

The strip's height is held whether or not there is a reading in it, and **that
was verified by breaking it**: setting `min-height: 0` moves the stated `Open`
figure beneath it, and `e2e/specs/security-price-chart.spec.ts` goes red on the
exact pixel. At rest the row carries **the invitation** — which is the only
affordance this chart has, and the only thing anywhere on the page that says the
keyboard path exists.

### 13.7 The memoisation repair, measured after rather than reported

Task 2.12.4's amendment assigned this task the unmemoised `chartFrame` call and
offered two repairs, saying the second was structurally stronger: memoise the
frame, or keep the crosshair's state out of the component that computes it.

**The second was taken.** `ChartReading` is a sibling of the plot rather than a
branch of `PriceChart`, so a pointer move re-renders the reading layer and the
frame's owner does not render at all. A `useMemo` would have made the
recomputation _conditional_ on a dependency array somebody has to keep right;
this makes the re-render not happen.

**Measured**, because the amendment's own instruction is that a repair must not
be reported without one: `PriceChart.test.tsx` counts calls to `chartFrame`
across **forty arrow presses** and the difference is **zero**. The counter is
verified live in the same test by a render the component genuinely has to answer
— a zero from an instrument wired to nothing looks exactly like a zero from a
working repair.

---

## 14. What every state found — added 2026-09-12 by Task 2.12.7

[Task 2.12.7](TASK-07-every-chart-state-drawn.md) is the first task in this story
that had to be right about the states the chart is in when it has **less than it
asked for**, which is most of the time. Six things came out of it. Two reverse
nothing and settle a decision that had been open since §12; two are corrections
to claims this file's own reviews made; and the last one is a rendering defect
that only existed because a fill is opaque and a stroke is not.

### 14.1 One rule replaced four state-by-state decisions

The treatment was specified state by state — §7.1's answer 7 for `partial`, a
bare labelled axis for `empty`, an unlabelled scale for `loading`, nothing for
the two failures. Built, it collapses to one sentence:

> **A mark derived from the window runs the full frame. A mark derived from the
> bars stops at the coverage edge.**

The axis rule, the gridlines, the seams and every tick label come from
`coverage.requested`; the line, the two washes and the reference rule come from
the bars and share one `clipPath`. Everything else falls out of a single number
— how much of the window is held — rather than out of a branch on the state:

- `loaded` — the covered span **is** the frame, so the arithmetic produces no
  wash and no edge, with no special case for it.
- `partial` — the ordinary case.
- `empty` — coverage zero, which is one uncovered span across the whole plot.
  **Not a fourth treatment**, and it is what tells the state apart from
  `loading` on screen, which is the same frame with the wash absent.
- `loading` — nothing is _known_ to be missing before anything has been
  answered, which is a different value from "all of it is missing" rather than
  the same absence.

The uncovered spans are derived from `coverage.covered` against the axis and
**never from where the last bar landed**. That is what makes §10.1 fall out
rather than needing a case of its own: the recorded `partial` fixture's
shortfall is a Saturday, a session-ordinal axis gives Saturday no slots, so
`positionOfInstant` puts its covered end at the frame's own right-hand side and
the one-pixel floor drops the difference. A treatment keyed on the last bar
would have washed a sliver there — and would also wash one on a **complete**
answer whose final minute never traded.

### 14.2 The reference rule is clipped, and the argument for keeping it was vacuous

This was the open decision [STORY.md](STORY.md)'s fifth review handed here, with
two defensible readings. It is **clipped**, and one of the two readings turned
out not to be a reading at all.

The case for leaving it full width was that it carries the seam where the two
washes meet: they differ by 1.013:1, so the boundary between them is the dashed
rule sitting exactly on it, and clipping the rule would leave that boundary
invisible wherever coverage is short. **That is false, and the error is worth
recording because it survived three reviews.** The washes are the close line's
own path closed back to the rule, so they exist _only_ where the bars do — which
is precisely the side of the coverage edge the rule survives on. Clipping it
removes it from the uncovered span, where there is no wash for it to separate.

What actually decided it is the pair of contrasts. `--chart-reference` is 4.48:1
and `--chart-uncovered` is 1.107:1, so an unclipped rule puts the loudest mark on
the plot inside the quietest region — the one thing §7.1's answer 7 says that
treatment must not become. And the line and the wash already stop at the edge, so
a rule that did not would be a third convention for one boundary.

### 14.3 The coverage edge and a session seam coincide most of the time

Not rarely, and not a contrived case: **a store caught up to a previous session's
close stops exactly on a session boundary**, which is precisely where a seam is
drawn. On the recorded body this task added, the coverage edge and the third
session seam are the same pixel to one decimal place, and on `/securities/NVDA`
today they are the same pixel too.

So a third dashed vertical could not be told from the second by being dashed. It
is told apart by ink and rhythm — 4.05:1 and `6 3` against the seam's 1.54:1 and
`3 3` — and it is drawn **last** so it is the one on top. What actually carries
the boundary is neither dash: it is the ground changing behind it.

### 14.4 The pair the edge exists for, measured directly rather than inferred

STORY.md's fifth review predicted this pair from two figures taken against white
— 1.107:1 and 1.15:1 — and called them "within a few hundredths of each other".
Taken directly, they are closer than that:

| Pair meeting at the coverage edge                   | Contrast    | Under `grayscale(1)` |
| --------------------------------------------------- | ----------- | -------------------- |
| `--chart-uncovered` against `--price-positive-wash` | **1.038:1** | 1.036:1              |
| `--chart-uncovered` against `--price-negative-wash` | **1.051:1** | 1.046:1              |
| `--chart-uncovered` against `--surface-raised`      | 1.107:1     | 1.110:1              |
| `--chart-coverage-edge` against `--chart-uncovered` | 4.045:1     | 4.036:1              |
| `--chart-grid` crossing the uncovered wash          | 1.146:1     | 1.146:1              |
| `--chart-seam` crossing it                          | 1.539:1     | 1.539:1              |

Two things follow. **The edge is load-bearing rather than a nicety** — without
it, the boundary between held and unheld is invisible exactly where the wash is,
which is the left-hand side of it. And **the whole treatment carries no hue**:
every row moves by less than a hundredth of a ratio under `grayscale(1)`, so
there is nothing in it for a colour-vision difference to take away. That is a
stronger claim than the directional wash can make and it is worth stating
plainly, because it is the one part of this chart where the greyscale story is
confirming rather than defending.

A single chart can present the first two rows at once, one above the rule and
one below, wherever the line crosses its own opening price near the edge.

### 14.5 A fill is opaque and a stroke is not, which is how the axis vanished

The defect this task shipped for about an hour, found by looking at the running
page rather than by any test:

> **The uncovered ground painted over the axis rule**, so the frame appeared to
> stop at the coverage edge — the exact impression this whole treatment exists to
> prevent, arriving as a rendering artefact rather than as a decision.

The cause is one pixel and it had been there since 2.12.4. `PriceChart` measures
the plot with `getBoundingClientRect()`, and the plot's **bottom border _is_ the
axis rule**, so the measured height is one pixel taller than the area there is to
draw in. Every mark before this task tolerated that, because a stroke a pixel low
lands under a near-black rule and is invisible. A fill does not.

The repair is `offsetHeight - clientHeight`, subtracted once at the measurement —
the border as an integer, and zero in jsdom where neither property is
implemented, so the component's own tests are unaffected. The transferable form:
**a latent measurement error is exposed by the first mark whose failure mode is
opacity rather than position**, and Story 2.13's volume bars are the next fills
this axis will carry.

### 14.6 The fixture set is fourteen bodies, and the fourteenth is the state the product is in

`uncovered.json` — NVDA over Thursday 2026-09-03 to Tuesday 2026-09-08, 780 bars
against a window of 990 trading minutes. It is owed to this task for the reason
§10.1 gave: the `partial` fixture exercises none of this treatment, so a _story_
could not reach the state the running page has been in since 2.12.4.

Worth stating that the judgement was **not** taken on it. The running page is
where the wash, the edge and the clip were reviewed, because a developer's store
is already four sessions short of the default window; the recording is what keeps
that reviewable afterwards and in CI. And CI itself exercises the other end of
the same treatment for free: `verify.yml` runs no backfill, so every chart there
is `empty`, which is coverage zero.
