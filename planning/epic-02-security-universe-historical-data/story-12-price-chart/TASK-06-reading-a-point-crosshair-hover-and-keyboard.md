# Task 2.12.6 — Reading a point: the crosshair, and the keyboard path to it

**Status:** Not started
**Story:** [2.12 Price Chart](STORY.md)
**Depends on:** 2.12.5

## Objective

Make the chart readable rather than decorative: move a pointer across it and
read the bar under it — and reach the same reading with a keyboard, which is
where charts usually fail.

## What the user can see when this lands

**A crosshair that tracks the cursor and a readout that says what that bar was**
— its time in market terms, its four prices, and its change. This is the second
thing in the product that responds to a person, after search, and the first that
responds continuously.

**And it works without a mouse.** Tab to the chart, arrow along the bars, and
the same readout follows.

## Work

- **The crosshair and readout**, in the form Task 2.12.2 settled. Constraints
  that outrank taste: **motion must never make a number harder to read**, the
  readout must not cover the mark it describes, and its numbers are the data
  face with tabular figures so they do not jitter as the pointer moves.

- **Pixels back to a bar** goes through Task 2.12.3's inverse scale. Nothing
  here re-derives a mapping from an element's bounding box; that is a second
  spelling of the scale, and the two will disagree at the edges.

- **The keyboard model, built to a pattern rather than to a resemblance of one.**
  The chart is one tab stop, not 780. Left and Right move the read position by a
  bar, Home and End reach the ends, and Escape clears the reading and leaves the
  chart focused. A page of arrow-reachable marks is the thing to avoid and it is
  the naive implementation.

  The story owns implementing this; **Task 2.12.8 walks and proves it
  end-to-end**, which is Task 2.11.9's relationship to the combobox.

- **Announcing a moving value without shouting.** A live region driven per
  pointer-move or per arrow-press is actively hostile, and this page already has
  regions belonging to other subjects — `FRONTEND-STATE.md` §7's rule is that a
  region belongs to a subject and its sentences name it. Settle the rate the way
  `SEARCH-ANNOUNCEMENT_DELAY_MS` was settled for search, and prefer a readout
  that is _readable_ over one that is _spoken continuously_.

- **Pointer, touch and precision.** The nearest bar rather than the exact one
  under the pixel; no reading at all when the pointer is outside the plot; and a
  `prefers-reduced-motion` answer that is already given once at the token layer
  rather than re-answered here.

- **`useId` for anything that needs an id**, and no test asserts one — that is
  on `CLAUDE.md`'s list of things a test must not assert.

## Done when

- Hovering reads the nearest bar; leaving the plot clears the reading
- The chart is one tab stop, and arrows, Home, End and Escape behave as above
- The reading is produced by the same scale that drew the marks, inverted
- Component tests cover the keyboard path and the cleared state; a browser spec
  covers the pointer path, which jsdom cannot
- The announcement rate is settled, named, and recorded in `CHARTING.md`
- axe reads zero violations
- `pnpm verify` passes

## Notes

The fence is that **every failed and empty state is 2.12.7's**. A crosshair over
an empty chart is a state, and it is that task's.

The other fence is comparison. Reading two series at one instant is Epic 8's,
and the shape of this readout should not foreclose it — one more reason the
readout is a component with props rather than a string built inline.

---

## Amended 2026-09-11 by Task 2.12.1 — **this task got more important, not just more defined**

[`CHARTING.md`](CHARTING.md) §2 chose a line of closes over candlesticks, on the
measurement that a candle would be **0.47 px wide** at the default window. The
bars still carry open, high, low and close, and the plot no longer shows three of
them.

**So this readout is where a bar's four prices actually reach the user**, and
that is a load-bearing role rather than a convenience. `CHARTING.md` §2 justifies
the line decision partly _on the grounds that this readout exists_ — "OHLC
reaches the user through the readout rather than the mark" — so a readout that
ships showing only the close would retroactively make the series-type decision
wrong.

What that adds to the Work section above, which otherwise stands unchanged:

- **The readout states all four prices**, plus the bar's market time and its
  change. The Work section already said so; this amendment is why it is not
  negotiable.
- **The inverse scale returns a bar index, not an instant** — the axis is
  ordinal ([Task 2.12.3](TASK-03-scales-ticks-and-the-market-gap.md)'s
  amendment). "Nearest bar" is therefore `round()` on a fraction of the plot
  width, which is simpler than the time-based nearest-neighbour search the
  original bullet implies.
- **The chart is one tab stop and the marks are not in the tab order**, which is
  easy here and would not have been: the base chart is one `<path>`, so there is
  no per-bar element that could accidentally become focusable. Keep it that way —
  §1's element-count constraint and this are the same constraint.

---

## Amended 2026-09-11 by Task 2.12.2 — the form is settled, and one claim in the amendment above is now inaccurate

The Work section's "in the form Task 2.12.2 settled" now has an answer.

- **One crosshair, identical under the pointer and under keyboard focus.** A
  vertical `--chart-crosshair` rule (`--ink-secondary`'s value, quieter than the
  data it points at) and a **white disc with a near-black ring** on the line. Two
  treatments were considered and declined: they are two things to keep correct
  and a promise that the keyboard path is the lesser one.
- **The focus ring is the existing global one and there is no new token.** The
  disc is hollow _so that the ring can land on it_ — a near-black outline around
  a near-black filled dot on a near-black line is invisible. `--focus-*` is
  unchanged, and ADR 0026's declined box-shadow ring stays declined.
- **The readout sits beside the plot, not over it.** Drawn on the canvas as a
  panel carrying the bar's market timestamp, its four prices with the close
  emphasised, and its change with a glyph and a sign. That satisfies the Work
  section's "must not cover the mark it describes" by placement rather than by
  collision-avoidance logic, which is the cheaper of the two by a long way and is
  the one that survives a narrow region.

### One claim above is now inaccurate, and correcting it does not change the conclusion

The 2.12.1 amendment says: _"the base chart is one `<path>`, so there is no
per-bar element that could accidentally become focusable."_

**The first clause is no longer true.** The plot as 2.12.2 draws it carries
roughly two dozen elements — an uncovered rect, the wash path, gridlines, the
session seams, the reference rule, the series path, the coverage edge, the axis
rule, the crosshair, its disc, and the labels.

**The second clause is unaffected and is the one doing the work.** None of those
scales with the _bar_ count: the seams scale with the number of **sessions** and
the gridlines and labels are fixed per breakpoint. So there is still no per-bar
element, the chart is still one tab stop, and §1's element-count constraint still
holds. The correction matters because
[Task 2.12.9](TASK-09-measured-against-fifty-milliseconds.md) carries "~11 DOM
nodes, flat in point count" as a prediction to measure against, and a reader
arriving from here would otherwise import a figure that has moved.
