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

## Amended by Task 4.1.1 — 2026-09-25: the decision is taken, and this task supplies its one number

**The owner chose a stated freshness window**, so the question this task answers
is narrower than it was written: not _what shape should the denominator be_ but
**what should M be**.

> _"Of the 518 we track, N were heard from in the last M minutes."_

**So the curve is the deliverable and M is the output**, and the windows to
sample are the ones a sentence could plausibly carry: **1, 2, 5, 15 and 60
minutes**. What makes M defensible is the **shape across a session** — a window
that covers 90% at the open and 60% over lunch is a window that will embarrass
this screen at 12:30.

## Amended by Task 4.1.5 — 2026-09-25: the sentence this task drafts has a constraint, and the instrument has a deadline

### The wording is bounded, and the boundary is a shipped check

This task drafts the words the screen will use, and Task 4.1.5 established what
they may not be.

**The denominator must not reach for `live`, `stale` or `disconnected`.** Those
are a three-member vocabulary with one home, guarded by
`one-home-for-the-feed-words`, and a coverage sentence borrowing them **would
trip a check that exists for a different reason — and would deserve to.**

**The reason is not the check, it is what the two statements mean.** The chrome
says whether data is **arriving**; the denominator says how much of the market
**one figure could see**. They can legitimately disagree — a healthy `LIVE` feed
with 341 of 518 names heard from in five minutes is the ordinary state of IEX —
and a reader who reads the denominator as a fault report has been told something
false by a true sentence.

**So draft it as a qualification of a figure**, in the register the source note
uses for an adjustment: stated once, calmly, beside the thing it qualifies.

### And the instrument has a deadline the measurement does not

**Write and rehearse the instrument against the shut market, before the bell.**

This is Epic 3's most expensive lesson, learned at the end of it: Task 3.11.8's
sitting instrument was written and run against a closed market first, and that
rehearsal found **four faults in the instrument** — a broken import, two lint
rules, an observer self-test polluting its own figures, and a screenshot
answering the wrong question — every one of which would otherwise have been
discovered at the one moment nobody could retry it.

**`scripts/session-sitting.mjs` already wraps a page's socket, counts frames by
URL and drains them on a tick.** Check it before writing anything: this task may
be an extension of an instrument that exists rather than a new one, and the
existing one is already rehearsed.
