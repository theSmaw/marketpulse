# Task 4.1.6 — The measurement the denominator decision cannot be taken without

**Status:** Not started
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.1

## Objective

**Four stories compute an aggregate over a map that is partially observed, and
nobody has measured the shape of the hole.**

What is already known, first-hand and dated: IEX live coverage is **65.1%
median per symbol and 2.1% worst case**, an ordinary gap of **187 minutes** has
been measured, and about **332 of 518** names have a bar in a median minute
(`LIVE-DATA.md` §7.6, §11.2).

**What is not known is the only thing the decision needs**: given a freshness
window of N minutes, **how many of the 518 have an observation inside it**, and
how that number moves across a session — at the open, mid-morning, over lunch,
and into the close.

> **A denominator chosen without that curve is a number chosen because it
> sounded round.** And `EPIC.md` is explicit that the denominator is a decision
> this epic takes **and states on screen**, not an implementation detail.

## What the user can see when this lands

**Nothing** — and the four regions that follow have a defensible denominator
rather than a plausible one.

## Work

- A throwaway instrument against the **deployed** gateway during a session,
  sampling `observations` and counting, per sample: how many of 518 have an
  observation within 1, 2, 5, 15 and 60 minutes
- Run across a whole session if possible, because the interesting part is the
  **shape** — lunchtime thinness is the case a round number gets wrong
- **Quote at least one frame, body or row verbatim** in the findings, which is
  this repository's rule for a throwaway instrument and was measured at 12 of
  14 needed frames the last time it was honoured
- The curve recorded in the story's document, with its n and its date
- The instrument deleted, and `session-sitting.mjs` checked first — it already
  wraps the page's socket and may need extending rather than replacing

## Done when

1. The curve exists for at least five windows, across a session
2. The denominator decision is taken **against it**, with the alternatives and
   a reversal trigger written as a condition
3. The words the screen will use are drafted here, because a denominator
   nobody can phrase is a denominator that will not be shown
