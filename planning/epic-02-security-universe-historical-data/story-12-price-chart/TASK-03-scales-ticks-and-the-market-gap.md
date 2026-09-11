# Task 2.12.3 — Scales, ticks and the market gap, as functions with no DOM

**Status:** Not started
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
