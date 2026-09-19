# Task 3.4.5 — The two marks this story acquired after it was written

**Status:** Not started
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.4

## Objective

Two vocabulary items this story did not originally owe, both handed here by
Task 3.1.4 out of `LIVE-DATA.md` §7.11 — **an extended-hours mark**, and a
treatment for _this corrected_ that is not the treatment for _this moved_.

## What the user can see when this lands

**A price that says when it came from outside the regular session**, and a
correction that does not pretend to be a tick.

## What is already decided and must not be re-taken

### 1. Extended-hours bars are RENDERED and MARKED, not filtered

§7.11. **Nothing on the frame distinguishes them** (§7.7) — the vendor sends a
pre-market bar and a regular-session bar identically — so **the mark is entirely
ours to invent**, and it is derived from the bar's own instant against Story
2.5's calendar rather than from anything the wire says.

**Stories 3.6, 3.7 and 3.9 consume this mark**, so it is a vocabulary item
rather than a detail of one screen.

### 2. A correction is NOT a price movement

The product subscribes `updatedBars` (§7.11), so **a displayed number can be
replaced about thirty seconds later by a corrected one for the same minute**
(§7.8). Fourteen revisions were measured and **three of them changed the close
price by a few cents**.

**Under a "price moved" animation that reads as a real tick that never
happened.** A reader watching the identity block would see the market move; it
did not. That is the product telling a lie in its own motion vocabulary, which
is the thing this story exists to get right.

So `this corrected` needs a treatment that is **distinguishable from `this
moved`** — or a decided absence of one, argued.

## Work

- **Derive the session mark** from the observation's instant through
  `packages/shared`'s calendar. It is **not** a field on the wire and must not
  become one by accident.
- **Tell a revision from a movement** in the browser. The protocol carries the
  bar's own minute; a second observation for a minute already seen is a
  correction and a first observation for a new minute is a tick. **Decide where
  that distinction is made** — the reducer is the obvious home and the renderer
  is the wrong one.
- **Give each its treatment, or argue the absence.** A correction that looks
  like nothing is a defensible answer; a correction that looks like a tick is
  not.
- **Check both in greyscale**, for the rule that has already caught a real
  defect here.

## Done when

- An extended-hours observation is marked, derived from the calendar rather than
  the wire
- A correction is **told apart from a movement** in state, not in a renderer
- A correction does not render as a price movement — asserted
- Both treatments are in `VISUAL-LANGUAGE.md` and the canvas, because three
  later stories consume them
- `pnpm verify` passes
