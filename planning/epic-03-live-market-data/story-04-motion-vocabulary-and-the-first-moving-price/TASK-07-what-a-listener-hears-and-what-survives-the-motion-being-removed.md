# Task 3.4.7 — What a listener hears, and what survives the motion being removed

**Status:** Not started
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.6

## Objective

The two readers a motion vocabulary can silently exclude: the one who cannot see
it, and the one who has asked for less of it.

## What the user can see when this lands

**Nothing new on a default screen**, and that is the point — the change is
entirely in what a _different_ reader gets.

## What is already decided and must not be re-taken

- **`prefers-reduced-motion` is answered at the token layer.** Durations resolve
  to `0ms` under the preference. **What this task owes is the consequence:** a
  flash that is the **only** signal of a change is a change **invisible** to
  that reader — so whatever carries direction must survive the motion being
  removed. Criterion 3 is that sentence.
- **Colour is never the sole encoding of anything**, and criterion 4 says it is
  checked in **greyscale rather than argued**. The price palette differs by
  1.04:1 in greyscale, so hue is the entire difference.
- **Do not announce a price change by default.** The story says it in as many
  words: **decide it, and write down what was decided and what nobody has heard
  yet.**

## The listening question, and the honest limit on answering it

A region that changes on its own is a live-region question, and this repository
already has a **known, unshipped repair** in that area: the spoken bar sentence
is 25 words against a 1,500 ms pacing floor, and **whether a region changing
every 477 ms queues or replaces is readable from neither the DOM nor a timing
nor by an agent.**

A price changing **once a minute** is a gentler case than that one and is the
same question.

**What can be decided here:** whether the region is live at all, what politeness
it would take, and what a listener is handed when the price changes — which is
the **DOM text**, not the treatment.

**What cannot be decided here:** whether the result is pleasant to listen to.
That is owed by **a person with a screen reader**, is owned by them rather than
by a story, and this task **adds to that backlog rather than discharging it** —
which the story says explicitly, so recording a new entry is success rather than
a shortfall.

## Work

- **Decide the live-region question and write it down**, including the default
  (announce nothing) and what would change it.
- **Make direction survive `prefers-reduced-motion`**, and assert it — a test
  that only exercises the default preference is a test that cannot see this.
- **Check the whole set in greyscale**: a tick up, a tick down, an unchanged
  tick if one draws, an extended-hours mark and a correction. Five states, one
  screenshot.
- **Add the listening entry** to the open list, naming what nobody has heard.

## Done when

- Under `prefers-reduced-motion` a price change is **still perceivable** and
  direction survives — asserted rather than argued
- Direction is never carried by hue alone, **checked in greyscale**
- The live-region decision is written down with its default and its trigger
- The listening backlog names this surface
- `pnpm verify` passes
