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
