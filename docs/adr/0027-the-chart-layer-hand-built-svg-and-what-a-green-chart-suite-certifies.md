# ADR 0027 — The chart layer: hand-built SVG, a session-ordinal axis, and what a green chart suite certifies

**Status:** Accepted
**Date:** 2026-09-12
**Delivered by:** Epic 2, Story 2.12 (Tasks 2.12.1–2.12.10)

## Context

This is the product's first data visualisation, and it is the decision with the
longest reach taken in Epic 2. **Epic 5's anomaly markers, Epic 8's comparison
series, Epic 9's filing markers and Epic 11's agent-opened charts all inherit
it** — not as a style but as a coordinate system, a state vocabulary and an
interaction contract. A chart is also the single easiest place in a product to
accept a library's defaults and ship something that looks like every other
chart, which is `PRODUCT_SPEC.md` §5.6's second test failed exactly.

It is worth an ADR rather than a story record for three reasons.

**The renderer question was open across the whole product and is now closed for
half of it.** `PRODUCT_SPEC.md` §27 and `CLAUDE.md`'s _Intended stack_ commit the
market topology to Sigma.js/WebGL against 500 nodes and 5,000 edges at 60 FPS.
Nothing said what draws a **2-D chart**, and the natural reading — that the
topology's renderer is the product's renderer — is wrong. There are now two
rendering decisions, taken against different problems, and this records the
second.

**Several of the decisions below are held by one browser spec and by nothing
else.** A chart is layout, colour and timing, and this repository's test levels
can see none of the three below `pnpm e2e`: jsdom applies no stylesheet, computes
no layout, and implements neither `offsetHeight` nor `clientHeight`. That is
stated in _What a green chart suite certifies_ rather than discovered later.

**One decision was taken, shipped, and revised the same day on a screenshot.**
The directional wash was a single tint chosen by where the line finished, every
greyscale simulation passed against it, and it painted a window that dipped and
recovered entirely green. A person looking at the page found it. The mechanism
that let it through is recorded here because it generalises well beyond charts.

The working record is
[`CHARTING.md`](../../planning/epic-02-security-universe-historical-data/story-12-price-chart/CHARTING.md),
which carries every alternative, every measurement and every reversal trigger.
**Every figure in it is dated 2026-09-11 or 2026-09-12 and is an observation
rather than a fact** — its §0 says to re-take rather than cite, and this document
cites it deliberately rather than restating its numbers.

## Decisions

### 1. Hand-built SVG, behind a wrapper. No charting library.

Four candidates were built and driven from real Chromium (`CHARTING.md` §1).
The decision was taken on bundle, on the type seam under this repository's flags,
and on what each one does to the accessibility tree — and the bundle was
decisive: the cost of the decision as shipped is **6,552 B gzipped, 4.2% of the
artefact**, against the nearest rejected candidate's **+94,809 B** (§16.6).

**What actually constrains the renderer is a count, not a library.** Measured in
the real component: drawing **one element per bar** at the 9,750-bar cap puts
9,790 elements in the plot and produces main-thread tasks of **137–254 ms**,
against `PRODUCT_SPEC.md` §28's ceiling of no routine main-thread task over
50 ms — and the same break at the default window produces **none** (§16.7). That
one measurement is both the constraint on this decision and the threshold behind
decision 2. Any renderer would have to satisfy it; what a library would have
added is 94 kB and a vocabulary that is not ours.

**It goes behind a wrapper**, exactly as `Popover` wraps Base UI: the props are
this product's vocabulary, so Epic 11's agent commands describe _what to draw_
rather than reaching a renderer's API. The reversal trigger is a condition, not
a story number — see §1's own.

### 2. A line of closes for V1. Candlesticks have a measured threshold they do not meet.

The bars carry all four prices and the OHLC values are **stated beneath the
chart**, so nothing is discarded — what is deferred is drawing four marks per
bar, which is the shape §16.7 priced at 137–254 ms. A candle is legible at a
bar width the default window does not offer: at 1,950 bars the default window
is **0.47 px per bar**. Candlesticks return with a window that makes them
readable, which is Story 2.13's control and `CHARTING.md` §2's trigger.

### 3. The axis is session-ordinal. The labels are temporal.

A continuous time axis draws a flat weekend into every chart; a session-ordinal
axis draws none and stops being a real time axis. This product chooses the
second and **says so in the picture**: a dashed rule at each session boundary,
because the axis is ordinal and a reader is owed the seam.

The consequence is inherited rather than local. Epic 9's filing markers land on
this axis, and a filing that arrives **outside** trading hours has no ordinal
position — §3 designs that consequence rather than leaving it to be discovered,
and `--chart-filing-lane` reserves the room for it now.

### 4. The window is named and resolved by the server; the x-domain comes from what was **asked for**

Not from the bars. This is the decision with the worst failure shape in the
story: a short answer whose axis came from its own bars **rescales to fill the
frame and looks complete** — no error, nothing red, and a picture that silently
disagrees with the coverage sentence printed directly beneath it.

`loaded` is the one state where both derivations agree, so anything built or
tested against it alone proves nothing.

### 5. One coverage rule decides all six states

**A mark derived from the window runs the full frame; a mark derived from the
bars stops at the coverage edge.** That single rule replaced four state-by-state
decisions (§14.1). The frame itself never shrinks — the axis rule, the
gridlines, the seams and every tick label run the whole width, because the
reader asked for that window — and the span that was asked for and is not held
carries a ground at 1.107:1, the quietest mark in this language, because a short
answer is a normal state and not a fault.

`empty` is the same treatment at **coverage zero** rather than a sixth one, which
is what tells it apart on screen from `loading`. `refused` and `failed` draw **no
frame at all**, deliberately: neither carries a series, so neither carries a
window, and a frame under either would have to invent one.

### 6. Colour is never the encoding. The geometry is, and the tint repeats it.

The two directional washes differ by **1.009:1 under `grayscale(1)`** — cover the
hue and they are the same picture. What carries direction is a dashed reference
rule at the price the window opened at, and the side of it the line finishes on.

**The washes split at the rule**: green above it, red below it, within one
window. This was a same-day revision (§12.6). The first version chose one tint
for the whole area by where the line _finished_, which painted a window that
dipped and recovered entirely green — **and every greyscale simulation passed
against it**, because removing the hue removes the disagreement. The instrument
was structurally incapable of seeing the defect it was pointed at. A person
looking at the screen found it.

There is therefore no neutral wash and no third state, and
`--price-unchanged-wash` has no consumer today — deferred by name to the
high–low extent band at `1d`, which was drawn, measured and **declined** at `1m`.

### 7. The reading is one tab stop, and the text alternative is one sentence

The chart is **one tab stop and never one per bar**. `Tab` opens on the last bar
so focus is never empty, the arrows step **bars** rather than slots, `Home` and
`End` reach the ends, and `Escape` clears the reading and keeps focus. A pointer
announces nothing; a key press announces the bar, paced by search's own two-number
rate.

The plot, the value scale and the time labels are all **out of the accessibility
tree** — the scale and the labels because they are sampled and niced, so neither
states an exact figure and read aloud they are a dozen bare numbers with no
subject. What replaces them is one sentence reached two ways: a hidden paragraph
in the picture's place in reading order, and the description on the chart's tab
stop.

**It counts coverage in the axis's own trading minutes**, which is the fact a
sighted reader gets from the ground changing behind the plot and a listener has
no other channel for. It is built from `coverage` rather than from the window
asked for, so a short answer never claims a whole one; where the shortfall is a
weekend the axis gives no width to, it says _that_ instead — because the picture
there is complete and the answer is not.

## What a green chart suite certifies here, and what it does not

### What it certifies

- **That the series is the stored bars**, verified against the store rather than
  by eye.
- **That the geometry is the arithmetic.** `chart-geometry.ts` and its tests hold
  the x-domain derivation, the coverage clip and the directional split as pure
  functions with no DOM.
- **That the chart draws no element per bar.** `PriceChart.test.tsx`'s _draws no
  element per bar, at sixty-five times the bars_ asserts the paths, rects and
  `<use>` counts are identical at 30 bars and at 1,950, that the lines differ by
  exactly the session seams, and that the series path string grew twentyfold —
  so a pair of equal counts cannot come from a pair of equal bodies.
  Break-verified at `expected 1952 to be 32`.
- **That a pointer move does not recompute the frame.** Counted across forty
  arrow presses and expected **zero**, with the counter verified live in the same
  test — because a zero from an instrument wired to nothing is indistinguishable
  from a working repair.
- **That every state is producible from a recorded body** collapsed through the
  real transition, rather than from one somebody typed. Fourteen bodies, all of
  them `1m`.
- **That the chart is inside the Price region at every viewport**, and that the
  readout strip reserves its height at three of them — the middle one being the
  instrument, because 1440 is the one width where it could not fail.

### What it does NOT certify

- **That any colour is what this document says it is.** No test in `pnpm verify`
  can see a colour at all: no stylesheet is applied in the test environment, so
  `getTokens()` throws there, which is why "do not assert on colour" is
  structural rather than a discipline. **The greyscale property is held by
  `chart-geometry.ts`'s `DirectionalArea` making the pair one value, and by two
  simulation stories a person reads.** Nothing mechanical can see it.
- **That the instrument pointed at a property can see that property.** §12.6 is
  the counter-example and it is the most transferable finding in the story: four
  greyscale simulations passed against a chart whose direction was wrong,
  because the transform they applied removed the evidence. A green simulation
  certifies that the _simulation_ agrees with itself.
- **That a spec asserting a mark is visible is asserting anything.** Playwright's
  visibility check is a non-empty bounding box and a horizontal gridline is zero
  pixels tall, so `toBeVisible()` reports `hidden` against a chart that is
  correct and on screen. Both chart specs were written the obvious way first and
  both went red; marks are **counted**. Equally, SVG's initial `fill` is black,
  so "is it filled with some colour" was true of a chart whose wash class had
  been deleted — that spec was green against the break until it was rewritten.
- **That the performance figures hold anywhere but where they were taken.**
  §16's timings are 2026-09-12 on one M-series laptop against a fulfilled body.
  No wall-clock assertion was added anywhere, deliberately: a timing gate in
  `pnpm test` measures the runner. What is checked is the _shape_ those timings
  follow from.
- **That §28's own criterion can see a regression of this kind.** Lifting the
  reading's state back into `PriceChart` costs **17× the CPU on the pointer
  path** and produces **no long task at all** (§16.7). A `longtask` observer is
  structurally blind to it; one unit test is not.
- **That the security page produces no long task.** It does produce one — 50–66 ms
  on every cold load — and **it is the 518-row universe table rather than the
  chart** (§16.1), attributed from both ends. The chart is clean at the cap; the
  page is not. That breach is raised in `SEARCH-AND-SELECTION.md` §10 and owed an
  answer at Story 2.14's close.
- **That the deployed chart is the chart that was measured.** The deployed store
  is backfilled nightly and answers the default window in full; a developer's
  store answers it four-fifths short. Both are correct, both are the same
  treatment, and a screenshot means little without saying which one it came from.

## Consequences

- **The product has two rendering decisions, not one.** Sigma.js/WebGL for the
  topology (`PRODUCT_SPEC.md` §27), hand-built SVG for the 2-D chart layer
  (here). A reader who assumes the first governs the second will reach for the
  wrong tool; both governing documents now carry a pointer to this one.
- **Four epics inherit a coordinate system rather than a component.** The
  session-ordinal axis, the coverage rule, the density flag and the reading
  contract are what Epic 5, Epic 8, Epic 9 and Epic 11 build against.
- **Story 2.13 inherits the coverage rule as its sharpest hazard.** Two plots
  sharing one x-domain must stop at **the same pixel**, and the uncovered ground
  is drawn once per plot rather than once per region. Volume's marks are also the
  first **fills** this axis carries, which is what §14.5's one-pixel finding was
  about — the measurement error was invisible for three tasks because every mark
  before it was a stroke.
- **A `packages/shared` repair now has three callers.** `timeAxis` walks the
  trading calendar and costs **23.051 ms** over the whole stored depth at `1d`,
  **twice per render** — 46 ms of a 50 ms budget before a pixel is drawn. Task
  2.9.9 measured the same walk at 20.6 ms on the server. Story 2.13's window
  control is the first thing that will pay for it.
- **The chart vocabulary is sixteen tokens and all sixteen have an application
  consumer**, audited at the close. `--price-unchanged-wash` is the one token in
  the price palette with none, and it is deferred by name rather than unshipped.
- **The design bar was applied to the deployed page and passed three of four.**
  Test 4 — _does it feel alive?_ — is answered "not yet, and not from here" for
  the second time, deliberately: `VISUAL-LANGUAGE.md` defers the motion
  vocabulary to Epic 3 against real moving numbers, and a chart that animates its
  own first paint is decoration rather than a market moving. §16.3 records that
  the crosshair holds 60 FPS at the cap, so the chart's interaction is not what
  stands in its way.

## Related

- [ADR 0026](0026-the-design-canvas-as-the-source-of-truth.md) — the canvas the
  chart was drawn on before it was built, and the chain this story's tokens
  travelled; the standing exception fired again here
- [ADR 0023](0023-the-frontend-state-layer-the-cache-with-no-clock-and-what-a-green-frontend-suite-certifies.md)
  — the six-member state union the chart renders, and `partial` as an answer
  rather than a failure
- [ADR 0024](0024-search-selection-and-the-security-explorer-shell.md) — the
  shell whose Price region this fills, and the live-region rule the chart's
  fourth region obeys
- [ADR 0021](0021-the-market-data-wire-the-grain-of-provenance-and-what-a-cached-response-certifies.md)
  — the wire the bars arrive on, and the provenance the chart is required to label
- [ADR 0017](0017-the-trading-calendar-market-time-and-what-a-correct-calendar-certifies.md)
  — the calendar the session-ordinal axis walks, and the cost decision 3 inherits
- [`CHARTING.md`](../../planning/epic-02-security-universe-historical-data/story-12-price-chart/CHARTING.md)
  — the working record: five decisions, the measurements behind them, the
  accessibility walk, the performance figures, and every reversal trigger
