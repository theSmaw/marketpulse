# Task 2.12.5 — What a session actually did, and direction without colour

**Status:** Not started
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.4

## Objective

Render the series in the form Task 2.12.1 chose — the open, high, low and close
a bar already carries, rather than only its close — and make **direction
survive greyscale**.

Split from 2.12.4 on purpose. That task is about a correct series inside a
correct frame; this one is about the marks carrying what an analyst actually
reads, which is a different problem with a different failure mode: a chart that
is right and says less than the data it drew from.

## What the user can see when this lands

**An unusual session becomes visible at a glance.** A day that opened high and
closed at its low looks different from a quiet day with the same close — which
is the whole reason the store keeps four prices per bar and the reason an
analyst expects a candle rather than a line.

And it reads correctly **in greyscale and under a deuteranopia simulation**,
which roughly one man in twelve needs and which this repository has measured
rather than assumed: the positive green and the negative red are 1.04:1 apart in
greyscale, so hue is the entire difference and something else has to carry it.

## Work

- **Implement 2.12.1's series-type decision**, and 2.12.2's non-colour channel
  for direction. If the decision was a candlestick, the body/wick geometry, the
  minimum body height at a price that barely moved, and what happens when the
  bar width falls below a device pixel. If it was a line for V1, then what
  carries high and low — a band, session extremes, or an explicit statement that
  they are not drawn and why.

- **The second channel is a mechanism, not a note.** `Marker` is the precedent
  and so is `PriceChange`: the rule that colour is never the sole encoding is
  held by components rather than by authors remembering. Whatever this chart
  uses — a filled versus hollow body, a sign, a glyph, a border — is part of the
  component, and a consumer cannot render a directional mark without it.

  Note the trap recorded in `CLAUDE.md`: **`Marker` renders nothing visible
  unless its row sets `--marker-color`.** If this chart reaches for it, that
  custom property is the thing to get right, and getting it wrong is silent.

- **Verify by simulation rather than by reasoning**, which is how Task 1.4.4
  verified the palette: read the rendered chart under `grayscale(1)` and under a
  deuteranopia matrix, and record what was read. A claim that the encoding works
  is not the same artefact as a screenshot that shows it working.

- **Density.** A candle per minute over five sessions is ~1,950 marks in a
  region a few hundred pixels wide. Decide what happens as they overlap —
  thinning, aggregating, or switching form — and say it in `CHARTING.md`,
  because Story 2.13's window control will hand this chart every density between
  one session and the store's whole depth.

## Done when

- The chosen series type renders, including the degenerate cases: a bar that
  barely moved, a single-bar series, and a density where marks would overlap
- Direction is conveyed without colour, by a mechanism inside the component
- The result is read under greyscale and a colour-vision simulation, and what
  was read is recorded
- Stories cover a rising session, a falling session, a flat one and a dense one
- `pnpm verify` passes

## Notes

The fence is the window control, again, because density is exactly where the
temptation to add one appears. It is Story 2.13's; what this task owes is a
chart that does not break when 2.13 hands it ten times the bars.

The other fence is anomaly encoding. A session that was _unusual_ is Epic 5's
score, not this chart's judgement — this task makes a session's **shape**
legible and says nothing about whether it was strange.
