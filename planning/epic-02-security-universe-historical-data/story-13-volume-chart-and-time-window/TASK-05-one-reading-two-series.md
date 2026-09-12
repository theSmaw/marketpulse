# Task 2.13.5 — One reading, two series

**Status:** Not started
**Story:** [2.13 Volume Chart & Time-Window Selection](STORY.md)
**Depends on:** 2.13.4

## Objective

Make the chart's existing reading answer for **both** plots: hovering or focusing a
moment states that bar's prices **and its volume**, through one crosshair, one
readout and one keyboard path.

The story's scope calls this "shared interaction", and the word that matters is
_one_. Two readouts, two crosshairs or two tab stops would be the same
information at twice the cost, and a screen reader would meet it twice.

## What the user can see when this lands

**Volume joins the reading.** Move a pointer across either plot and the crosshair
follows in both; the strip under the axis states the bar's market instant, its four
prices, its own change labelled `BAR` — and now its traded volume. The same reading
arrives by keyboard: still **one tab stop**, still `Tab` onto the last bar, arrows
to step, `Home`/`End`, `Escape` to clear and keep focus.

## Work

- **One crosshair across two plots.** Decide whether the vertical rule spans both
  plots as one mark or is drawn per plot at the same x. Either answer is
  defensible; what is not is two marks that can disagree, which is the same
  structural argument 2.13.3 made about the axis.

- **The snap, unchanged.** §13.1: a slot with no bar makes the crosshair **snap**,
  and the timestamp is what makes that honest. §13.2: the arrows step **bars**, not
  slots. Both are already right and neither is re-taken — but a second series means
  the snap now has to produce a volume for the snapped bar rather than for the slot
  the pointer was over.

- **The strip, and what it must not become.** §13.6's readout is a reserved strip
  under the axis, and §15.4 found the reservation itself defective: a `min-height`
  token held at 1440 and nowhere else, so the figures below the chart jumped
  **14–32 px at every other viewport** with `pnpm verify` and all 96 browser tests
  green. The reservation is now a **hidden reading of the last bar in the same grid
  cell** — a measurement of the real thing at the real width. Adding a volume
  figure makes the reading wider and therefore changes where it wraps, so the sizer
  must carry it too. **The middle viewport is the instrument**; a spec that runs
  only at 1440 cannot fail.

- **Announcement pacing, unchanged and not re-derived.** §13.4: a pointer announces
  nothing; a key press announces the bar, paced by two numbers. Volume is another
  clause in the same sentence, not a second announcement — and a live region
  belongs to a **subject** whose sentences name it (`FRONTEND-STATE.md` §7). This
  page already carries four regions; a fifth, or an unnamed clause, is the failure
  that matters and **nothing anywhere catches it**.

- **Volume's words, not its glyphs.** The written figure abbreviates; the spoken one
  is the form 2.13.3 settled. A reading that says "4.1M" aloud is not English, and
  the exact figure is the thing a listener has no other channel for.

- **Focus, and what it is on.** §13.5: the ring lands on the **plot**, correcting
  the canvas. If volume is a second focusable thing, the chart has two tab stops
  where it had one — decide deliberately, and note the bar the product is held to:
  the chart is **one tab stop and never one per bar**, `Tab` opens on the last bar
  so focus is never empty.

- **The React Compiler will have opinions.** Its rules first fired on Story 2.11's
  combobox and both catches were correct, with repairs **simpler** than the code
  they replaced. A reading shared between two plots is the shape they dislike
  (`refs` written during render, `set-state-in-effect`). Treat a firing as a design
  note.

- **No frame recomputation, still.** The reading's state stays in the sibling; the
  counter test stays at zero across forty arrow presses. This is the task where
  "both plots need the reading, so let's hold it in the parent" is the obvious
  thought, and it is the one regression §28's own criterion cannot see.

## Done when

- One crosshair, one readout and one tab stop serve both plots
- The readout states volume for the bar the crosshair snapped to, written and
  spoken, with the exact figure available
- The strip's reservation measures a reading that **includes** volume, and its spec
  runs at all three viewports
- A key press announces one sentence naming its subject; a pointer announces nothing
- The frame-recomputation test still reports zero, and verifies its own counter
- Stories cover the reading at rest, on a bar, and at the ends; `pnpm stories` passes
- `pnpm verify` and `pnpm e2e` pass

## Notes

The fence is the **window**. A reading that survives a window change is 2.13.7's
subject — the reading must clear or re-anchor when the series underneath it is
replaced, and that is a state question rather than an interaction one.

The second fence is Epic 5. _"Volume 3.8× normal"_ belongs on this plot eventually
and the baseline that computes it does not exist; a readout clause comparing this
bar to anything is a number this product is not yet entitled to state.
