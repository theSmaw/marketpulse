# Task 3.4.8 — The measurements this story owes

**Status:** Not started
**Amended:** 2026-09-21 after Task 3.4.4 — the layout figure is already taken and only needs a production re-take; the mark's firing RATE is a new measurement, because the reversal trigger's second clause is a number.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.7

## Objective

Three figures, each of which is an acceptance criterion and none of which any
existing check produces.

## What the user can see when this lands

**Nothing.** Numbers in a document.

## What is already decided and must not be re-taken

- **§28: event → application state under 250 ms p95**, excluding provider
  latency, **measured rather than assumed**. That clock starts at
  _server-received_ and ends at _application state_ — so it spans the gateway,
  the wire and the browser's reducer, and it is not the same thing as a render.
- **§28: no routine main-thread task over 50 ms.** The product knowingly misses
  this in two places and both are the 518-row universe table, owned by Epic 14.
  **This story must not add a third.**
- **A value that changes width must not move anything around it.** The numerals
  are tabular for this reason and **the reason is now load-bearing** rather than
  typographic.
- **Amended 2026-09-21 by Task 3.4.4 — one figure is already taken and this
  task CONFIRMS rather than derives it.** The mark sits in space the figure's own
  box already occupies, and was measured at **0 layout shift and no horizontal
  overflow at 1440, 1024, 768 and 390**, with 26 px of room to the left of the
  digits at the narrowest. That was taken in the workshop against a development
  build, so **the production re-take is the only part still owed** — the
  arithmetic does not need redoing.
- **And there is now a rate to measure rather than assume.** The mark fires on
  **every bar arrival**, so on this surface that is once a minute per security —
  but the reversal trigger's second clause is a **measurable**: _the first
  surface where it fires more than once a second._ Record the rate this story
  produces, so Story 3.6 has a figure to compare 518 rows against rather than an
  argument.

## Two ways to take these figures wrong, both already paid for once

- **A development build is not the product.** Task 3.3.5's sweep measured 141 ms
  long tasks twice against `pnpm dev` and **zero** against a production build —
  Vite's unminified React, not the feature. §28's figures are production ones
  and a dev number is not comparable to them. **Build first.**
- **`buffered: true` on a `longtask` observer measures the COLD LOAD.** The same
  sweep's first run returned `[76, 118, 117, 120]`, every one of them predating
  the observer and belonging to Epic 14's known breach — arriving inside a
  measurement about something else entirely.

## Work

- **Instrument the p95 end to end**, at the two ends §28 names. The burst is the
  case that matters: **332 bars inside 243 ms**, once a minute (§7.4) — a figure
  taken against one observation at a time is a figure taken against the case
  that does not occur.
- **Long tasks and layout**, on a **production** build, with the observer
  unbuffered. The layout half is the one nothing else can see: assert that the
  price's box does not move when its digits change.
- **Record every figure with what it was taken against** — build, provider,
  speed multiplier, viewport. A figure without those is not re-measurable, and
  this repository's rule is _measure rather than cite_.

## Done when

- **250 ms p95 event → application state**, measured under a burst, recorded
  with its conditions
- **No routine main-thread task over 50 ms** attributable to this story, on a
  production build
- **No layout thrash**: the price's neighbours do not move when it changes **or
  when the mark fires**, asserted in a browser because nothing below one can see
  it — confirming Task 3.4.4's figure on a production build. **`[data-arrival]`
  is the handle**, and Task 3.4.5 measured the mark clearing the block's left
  edge by **142px** at all four widths against a development build
- **The mark's rate is recorded**, so the reversal trigger's second clause has a
  number behind it rather than an argument
- **The animation's own cost is attributed**, on a production build. It is an
  `opacity` animation on an absolutely-positioned 8px element, so the expected
  answer is _nothing measurable_ — record it as a measurement rather than as an
  assumption, because _expected to be free_ is how a cost gets inherited by five
  stories
- Every figure carries what it was taken against
- `pnpm verify` passes
