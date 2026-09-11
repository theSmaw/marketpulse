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

---

## Amended 2026-09-11 by Task 2.12.1 — the task these decisions changed most

**Read this before the Work section above.**

[`CHARTING.md`](CHARTING.md) §2 chose **a line of closes, not candlesticks**, and
it took the `If it was a line for V1` branch of the Work section's first bullet.
The measurement: the Price region is **923 px at 1440**, the default window is
**1,950 bars**, so a candle is **0.47 px wide** — and 9,750 SVG candle groups was
29,260 DOM nodes and a **296 ms** main-thread task. There is no window in this
story's scope where a candle is legible.

**So the per-bar half of this task is gone, and it did not go nowhere.**

### What moved out

**Per-bar open-against-close is now [Task 2.12.6](TASK-06-reading-a-point-crosshair-hover-and-keyboard.md)'s
readout**, not a mark on the plot. That is where an analyst reads an individual
bar's four prices — by pointing at it or arrowing to it — and at 0.47 px per bar
it is the only place the reading can honestly happen.

> `CHARTING.md` §2 says _"Task 2.12.5 renders what a session did, with direction
> that survives greyscale — that is where open-against-close lives."_ **That
> sentence over-promises this task** and has been corrected in place: at this
> density, open-against-close lives in 2.12.6's readout. This task renders the
> session's **extent**, not its open-to-close direction per bar.

### What this task is now

Two things, and both are real:

1. **The high–low band.** The bars carry `high` and `low` and the line of closes
   throws them away visually. A band between the session high and the low, behind
   the close line, is **what a session did** at a density where a candle cannot
   be — it works at 0.47 px per bar because it is a filled area rather than
   thousands of marks, so it stays one `<path>` and does not reopen §1's
   element-count constraint.

   Decide it rather than assume it: a band that is too strong buries the line, and
   a series whose high and low hug the close draws a band nobody can see. **"We
   draw no band, and here is why"** is an acceptable outcome — but it has to be
   argued against the alternative, because `CHARTING.md` §5 keeps High and Low as
   _stated facts_ precisely on the grounds that the plot rounds them, and a band
   is the one thing that would put them on the plot honestly.

2. **Direction without colour, which is unchanged and is still the load-bearing
   half.** What changed is _what_ is directional. There is no per-bar body to
   fill or hollow, so the second channel attaches to the **window's** change —
   the current-value reading, the headline, and whatever 2.12.2 settled — rather
   than to 1,950 marks.

   Measured 2026-09-11 by luminance ratio: `--price-positive` against
   `--price-negative` is **1.096:1**, which is indistinguishable without hue.
   (`CLAUDE.md` records 1.04:1 by a greyscale-conversion method; the substance is
   the same and both are load-bearing.) Both inks clear **5:1** against both
   surfaces, so the contrast floor is not the problem — telling the two apart from
   each other is.

### What this does to the Work section above

- The first bullet's candlestick branch — body/wick geometry, minimum body
  height, sub-pixel bar width — **does not apply.** The line branch does.
- **The density bullet is largely discharged by §1 and §2 already.** The line is
  one `<path>` at any point count (26.3 ms cold at 9,750 bars, no long task
  measured), so the thinning/aggregating/switching decision it asks for is not
  forced. What still needs saying in `CHARTING.md` is what the **band** does at
  the densities Story 2.13 will hand it.
- `Marker` and its `--marker-color` trap are **less likely to apply**, because
  there is no per-bar mark to place. If nothing reaches for `Marker`, say so —
  the trap is silent and the note exists so it is not tripped, not so it is used.
- **Stories** still cover a rising, falling, flat and dense series. A flat series
  is now more interesting than it was: it is the case where the band has zero
  height and the line has a zero-height domain, which is
  [Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)'s divide-by-zero case
  seen from the other end.

### Is this still a task?

**Yes, and it is worth checking rather than assuming.** It is a smaller one than
it was written to be — the band is one decision and one `<path>`, and the
direction channel is mostly 2.12.2's answer being implemented. If it collapses in
practice, the right move is to fold it into
[Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md) rather than to pad it,
and to say so. It is kept separate for now because "the chart is correct" and
"the chart says what the data says" have failed independently before, and
2.12.4 is already the largest task in the story.

---

## Amended 2026-09-11 by Task 2.12.2 — smaller a second time, and the fold question was re-asked rather than inherited

The amendment above ends by asking whether this is still a task and answering
"yes, and it is worth checking rather than assuming". Task 2.12.2 changed both of
its halves, so the question was asked again rather than treated as settled. **The
answer is still yes, and the reasons have changed.**

### The band was drawn, and it is declined at this story's windows

§2's amendment left the high–low band as this task's decision and gave 2.12.2
"what it looks like if it does". Drawing it on the canvas answered the other half
by accident, which is the argument for drawing rather than specifying:

> **At `1m` a bar's high and low sit within a few hundredths of a percent of its
> close, so the envelope is a hairline around the line.** It was rendered at the
> default window, at the measured region width, and it is effectively invisible.

So the Work section's warning — "a series whose high and low hug the close draws
a band nobody can see" — is not a risk to design around. It is the measured case,
at the only timeframe this story serves. **The band does not ship at `1m`**, and
the "we draw no band, and here is why" outcome the amendment above called
acceptable is the one that was argued for and reached.

It earns its space at `1d`, where a session's range is a real distance, and
**Story 2.13's window control is what brings that timeframe**. If it ships then it
is `--price-unchanged-wash`, beneath the directional fill — decided, so 2.13 does
not re-take it.

What this task still owes on the band: **a stated decision in the component**, not
an absence. `CHARTING.md` §5 keeps High and Low as stated facts on the grounds
that the plot rounds them; a chart that silently draws no band and a chart that
decided not to are the same picture and different artefacts.

### The direction channel is decided, and implementing it is the real remaining work

2.12.2 settled it: a dashed `--chart-reference` rule at the **window's opening
close**, the area between the line and that rule filled with
`--price-positive-wash` / `--price-negative-wash` / `--price-unchanged-wash`, and
**the side of the rule the line finishes on is the direction**.

The measurement that forced that ordering, and it is stronger than the one this
task was written against: **the two washes differ by 1.009:1 under
`grayscale(1)`**. The inks they are drawn from differ by 1.096:1; washed back to
a fill they are, for practical purposes, the same colour.

Three consequences, and they are this task's whole content:

1. **The rule and the fill are one mechanism and ship together.** The Work
   section's "the second channel is a mechanism, not a note" now has a concrete
   failure: a component that renders the tint without the reference rule has
   shipped a chart whose direction is carried by 1.009:1. A consumer must not be
   able to get one without the other, and
   [Task 2.12.4](TASK-04-the-first-chart-in-marketpulse.md)'s amendment draws the
   boundary from the other side for the same reason.
2. **Three states, not two.** A window that closed where it opened takes the
   neutral wash. This is also the case where
   [Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)'s zero-height domain
   and a zero-area fill meet, which is the "flat series" story with something
   actually at stake in it.
3. **The wash is dropped when a second series arrives.** One filled area cannot
   serve _n_ series, so the tint is a single-series treatment — stated on the
   canvas as what Epic 8 **displaces**. Encode that as a property of the
   component rather than as a sentence, or Epic 8 discovers it by drawing mud.

### `Marker` is not reached for, and that is now a statement

The amendment above says the `--marker-color` trap is "less likely to apply" and
asks for it to be said either way. **Nothing in this chart reaches for `Marker`.**
The plot's only per-point mark is the crosshair's focused disc, which is
[Task 2.12.6](TASK-06-reading-a-point-crosshair-hover-and-keyboard.md)'s and is a
`<circle>` with its own stroke rather than a silhouette primitive. The trap does
not fire in this story.

### The ordering question, reopened once and closed for the right reason

2.12.1 declined swapping this task with 2.12.6, on the ground that "the readout
naturally reads the high and the low that the band has already put on the plot,
which mildly favours band first". **That reason has expired** — the band is not
on the plot at this story's windows, so it puts nothing there for the readout to
read.

The decision stands anyway, on the remaining ground alone: **renumbering costs
every reference in this directory**, 2.12.6 and 2.12.7 both declare a dependency
on this task, and the gain is marginal. Recorded so the question is not reopened
a third time as though it had been missed — and recorded honestly, because a
decision resting on a reason that has since become false is worth knowing about.

### Is it still a task? Yes, and here is the line

It is now **the smallest task in the story**, and it is kept separate because its
failure mode is the one 2.12.4's is not: 2.12.4 ships a chart that is _wrong_,
this one ships a chart that is _right and says less than the data it drew from,
in a way that is invisible to everyone who can see colour_. If in practice it
turns out to be one `<path>` and a `<line>`, fold it into 2.12.4 **in that
commit**, say so here, and do not renumber anything.
