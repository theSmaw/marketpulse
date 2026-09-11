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

If Task 2.12.1 chose a library, this task is **smaller and not empty**: whatever
the library's own scale does, the market gap, the session-aware ticks and the
formatting are still ours, and they are still tested here rather than through a
rendered chart.
