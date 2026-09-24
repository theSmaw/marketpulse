# Task 3.9.6 — What the crosshair reads at a minute that is not finished

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.4, 3.9.5

## Objective

Criterion 7: the reading strip, the crosshair and the keyboard walk all work at
the live edge, **including on the partial final bar** — which is a reading whose
subject changes underneath the reader.

## What the user can see when this lands

**The last bar can be read like any other**, by pointer or by keyboard, and what
it says about itself is honest about being unfinished.

## The three things that make this harder than it sounds

**1. The reading is a snapshot of a moving thing.** `End` walks to the last bar;
a minute later that bar has different numbers and there is a newer last bar.
Whether the reading follows the edge or stays on the instant it was taken is a
decision, and both are defensible — _stays_ is a reading of a bar, _follows_ is a
reading of "now". Take it explicitly.

**2. The spoken sentence is already 25 words against a 1,500 ms pacing floor.**
`docs/GAPS.md` carries a standing item — **a listening pass with a real screen
reader, four entries, owner: a person with a screen reader** — and the chart's
bar sentence is the entry with the figure on it. A live edge that re-announces
on every burst would put a fifth entry on that list. Whether the reading strip
is a live region at all, and what happens when its subject changes while a
listener is mid-sentence, is readable from neither the DOM nor a timing.
**Add the entry rather than inventing an answer**, and say what was designed.

**3. `toBarSeries`'s ascending rule reaches here too.** A reading keyed on slot
index against a series that gained a bar is a reading of a different bar.

## Work

- Decide and document whether a reading follows the edge or holds its instant
- Pointer, keyboard (`Home`, `End`, arrows, `Escape`) and the strip, all working
  at the edge, asserted in a browser
- The spoken string for a partial minute, written down in full, with its word
  count beside the existing 25
- A `docs/GAPS.md` entry for whatever only a listener can settle, with a
  re-measure and a named owner
- The one tab stop and the one crosshair are unchanged — this adds no second
  focus target

## Done when

1. The edge is readable by pointer and by keyboard, asserted
2. The follow-or-hold decision is written down with its alternative
3. The listening question is in `docs/GAPS.md` rather than answered by guess
