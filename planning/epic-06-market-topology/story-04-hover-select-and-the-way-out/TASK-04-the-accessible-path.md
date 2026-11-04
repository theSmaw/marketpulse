# Task 6.4.4 — The accessible path

**Status:** Not started
**Story:** [6.4 Hover, Select, & the Way Out](STORY.md)
**Depends on:** 6.4.3

## Objective

Everything built so far draws correctly and is keyboard-operable — but
nothing yet tells a screen-reader user that a selection changed. AC5 needs
a real answer, not just "the structural sentence is still there": a reader
who cannot see the graph must be able to reach and activate any of the 516
securities, with the same way out a sighted keyboard user gets from Task
6.4.3.

**This is the live-region reversal trigger firing a second time, named by
Story 6.3's own close.** `MarketTopology`'s accessible sentence is written
once per draw and never announced — Task 6.3.4 restated that decision
rather than reversing it, three days before this story began. A
hover/selection change is a second, independent firing of the same
condition (_the first change to this region a reader must be told about
without having asked_), and the answer settled while shaping this story is
the same shape anticipated in advance: **a second element**, never a write
into the paragraph `applyAnomalyBands` already mutates imperatively — two
writers on one node is the collision that paragraph's own safety argument
depends on not happening.

## What the user can see when this lands

Nothing new visually — this task is almost entirely about what a screen
reader announces. Selecting a node (by click or keyboard) is spoken as one
sentence carrying the same four facts the visual readout shows. Hovering
(pointer-only, no keyboard equivalent) announces nothing — a pointer user
is not a listener, and announcing at pointer-move cadence would be
unusable. Clearing a selection is spoken too, since clearing is something
the reader did.

## Work

- **A second, persistent, visually-hidden `role="status"` paragraph**,
  sibling to the existing structural sentence, empty on mount, never the
  canvas's `aria-labelledby` target. Written **only** on a selection
  change (not on hover) — the same four facts Task 6.4.1's readout shows,
  as one sentence.
- Confirm by test that this paragraph and the one `applyAnomalyBands`
  writes to never collide — a live band update landing while a node is
  selected must leave both sentences correct.
- **`Region`'s existing dropped-focus backstop** (focuses its own
  `<section>` when the last-focused element is removed while
  `document.activeElement` is the body) needs no new code here, but
  confirm by test that it still fires correctly now that the canvas and
  the one anchor are both focusable things inside the region.
- Confirm `axe` stays clean on `/` with this region in every state this
  story adds — and record explicitly (per this repository's own rule)
  that an axe pass is not accessibility coverage, only a floor.
- Add the remaining AC7 browser spec: pointer and keyboard **interleaved**
  in one spec (hover node X by pointer, then Tab+arrow to node Y, then
  Enter) — asserting the final navigation goes to Y, not X, which is the
  one state-collision case nothing below a browser can see.
- **Sideways sweep, due at this task rather than left to the close**: the
  `one-item/six-entry` screen-reader listening gap (`CLAUDE.md`'s own
  running list) gains a seventh entry here — whether an unprompted polite
  announcement queues behind or replaces a sentence already in progress is
  unanswerable from a DOM, a timing, or an agent. Write it into
  `docs/GAPS.md` with the same shape as the existing six, owned by a
  person with a real screen reader before Epic 11.

## Done when

1. A selection change is announced via a dedicated, persistent `role="status"`
   paragraph, distinct from the existing structural sentence, with no
   write-collision between the two.
2. Hovering announces nothing; selecting and clearing a selection both do.
3. `axe` is clean on every state this story adds, with that explicitly
   recorded as a floor rather than as coverage.
4. A browser spec drives interleaved pointer and keyboard input and
   asserts the correct final destination.
5. `docs/GAPS.md` carries the seventh screen-reader-listening entry.
