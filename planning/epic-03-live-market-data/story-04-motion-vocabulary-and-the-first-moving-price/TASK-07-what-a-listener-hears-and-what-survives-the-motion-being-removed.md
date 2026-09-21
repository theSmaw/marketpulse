# Task 3.4.7 — What a listener hears, and what survives the motion being removed

**Status:** Not started
**Amended:** 2026-09-21 after Task 3.4.6 — the spoken qualifier is now **three clauses**, and three of the five greyscale states are already checked.
**Amended:** 2026-09-21 after Task 3.4.4 — the quiet minute is the one state where the mark is the SOLE signal, and reduced motion erases exactly that one. Check the qualifier's instant first; it may already be the survivor.
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

> **AMENDED 2026-09-21 — Task 3.4.4's decision creates exactly one state where
> that sentence bites, and it was not foreseeable before the decision.**

**On a minute where the price MOVED, criterion 3 is satisfied without doing
anything**: the digits are different, the percentage is different and the
arrow may be different, all of them present with the motion removed. The mark
only says _look_.

**On a QUIET minute it is not.** The owner chose to fire the mark on **every bar
arrival**, including one that changes nothing — and on that minute the mark is
the **only** signal, because by definition no digit moved. Under reduced motion
the mark does not run. **So a reader who asked for less motion gets nothing at
all on precisely the minute the mark exists to report.**

**Check the qualifier before designing anything**, because the survivor may
already be there: the line carries the bar's own instant, and on a real arrival
that instant **advances** whether or not the price did. If it does, criterion 3
is met by a fact already on the screen and this task's answer is to **say so and
assert it** rather than to invent a static fallback. If it does not, the hole is
real and it is this task's to fill.

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

> **AMENDED 2026-09-21 after Task 3.4.6 — the DOM text got a third clause, and
> that is a change to the thing this task is actually about.**

The qualifier now reads **three clauses rather than two** when a price comes
from outside the regular session:

```text
Sep 16 · 07:42 EDT · pre-market · change from 2026-09-04's close
```

**A listener is handed the concatenation**, so this is not a cosmetic addition —
it is the spoken sentence getting longer, on a surface that changes **once a
minute**, against a pacing floor this repository has already measured at
**1,500 ms**. Three things follow and none of them is decidable from a DOM:

- **How the `·` is spoken**, or whether it is spoken at all, differs by screen
  reader. A separator that reads as _dot_ three times in one line is a different
  sentence from one that reads as a pause.
- **Whether the clause order survives being heard.** Task 3.4.6 asserted the
  order — _when · what kind of when · what it is measured from_ — because it
  reads as a sentence. That was checked as **text**, not as speech.
- **Whether it is announced at all.** The default is that it is not, and the
  qualifier is not a live region. **Check that is still true** now that it has
  a clause that only appears sometimes: an element that appears and disappears
  is the shape that gets a region added to it by accident.

**Two things Task 3.4.5 left you, both concrete:**

- **`[data-arrival]` is the handle.** The mark carries it and it is stable; the
  two `data-` hooks that task was told to keep were deleted instead, because
  once the treatment moved inside the module nothing read them. If a browser
  assertion wants another handle it adds one **with a stated reason**.
- **The mark is already `aria-hidden="true"`**, asserted in the component
  suite — so the live-region decision here is about **the DOM text**, and the
  default of announcing nothing is already what the tree does rather than
  something this task has to impose.

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
- **Check the whole set in greyscale**: a tick up, a tick down, **an unchanged
  tick — which DOES draw**, settled by Task 3.4.4 rather than left conditional —
  an extended-hours mark and a correction. Five states, one screenshot.
  **Three of the five are already done** (Task 3.4.6, on the running page: the
  arrival mark is `--ink-primary`, the extended-hours word is text, and `▼`
  still carries direction), so **confirm rather than re-derive** — what has
  never been in a greyscale frame is the **correction**, and the workshop's
  `ExtendedHours` story set is where the other two already are.
- **Add the listening entry** to the open list, naming what nobody has heard.

## Done when

- Under `prefers-reduced-motion` a price change is **still perceivable** and
  direction survives — asserted rather than argued
- **Under `prefers-reduced-motion`, an UNCHANGED tick is still perceivable** —
  the state where the mark is the sole signal, asserted separately because the
  moved case passes without it
- **The mark is INVISIBLE under the preference rather than permanent** — the
  defect Task 3.4.5 shipped and repaired, now `docs/GAPS.md` entry 11 and owned
  here. Assert it in the browser with `reducedMotion: "reduce"`, because no
  level below one can read a computed opacity
- Direction is never carried by hue alone, **checked in greyscale**
- The live-region decision is written down with its default and its trigger
- The listening backlog names this surface
- `pnpm verify` passes
