# Task 4.1.7 — The 390 question, asked with a phone in hand

**Status:** Not started
**Story:** [4.1 The Decisions & the Overview Shell](STORY.md)
**Depends on:** 4.1.3

## Objective

**Epic 4's own `EPIC.md` says this is owed a person BEFORE this epic ships a
screen**, and this story is the screen.

> _"Because the connection has one home and that home is sticky at the foot of
> the viewport, at 390 the distinction between the feed stopped and the market
> is shut is below the fold. No check can see it. This epic is where it matters
> most."_

**And one thing is already known that narrows it**, measured on 2026-09-25 by
Task 3.11.8: at **390 × 780 the status bar is on screen**, sticky at the foot,
about four wrapped lines. So _below the fold_ is the wrong description of the
shipped page, and the question is not presence but **noticing**: whether a
reader looking at figures at the top of a phone screen registers a change in a
four-line strip at the bottom.

**That is not answerable from a screenshot**, which is why it is a task with a
person in it rather than a spec.

## What the user can see when this lands

**Either nothing, or a repair to the one thing that tells them their numbers
have stopped being true** — and which of those is the honest output rather than
a foregone conclusion.

## Work

- The deployed site opened **on a real phone during a session**, on `/`
- The feed interrupted, and **the time to notice recorded** — by the person,
  not inferred
- The result written down whichever way it goes, including _nobody noticed and
  we are changing nothing_, with the reason
- **If a repair is needed, the constraint it must not break is stated first**:
  the connection has one home, and a second surface reporting it is the defect
  this product has produced four times. A repair that adds a second connection
  word needs a measurement and a decision, not a hunch
- `docs/GAPS.md`'s entry re-verdicted with what was learned

## Done when

1. A person has looked, on a phone, during a session
2. The time to notice is a number or an explicit _did not notice_
3. The entry says what is now known, and any repair carries the one-home rule
   in its reasoning

## Amended by Task 4.1.6 — 2026-09-25: one session serves both, and it is already running

**The coverage instrument is live and covers today's session** — started 07:13
ET for 560 minutes, through the close. **This task needs the same session**, and
Epic 3's most-repeated scheduling lesson is that the scarce thing is the sitting
rather than anybody's attention.

**So take them together.** Nothing else has to be started: the curve is
collecting itself, and what this task adds is a person with a phone during the
same hours.

### And one thing is already known that narrows the question

Task 3.11.8 measured that **at 390 × 780 the status bar is on screen**, sticky
at the foot, about four wrapped lines. So _below the fold_ is the wrong
description of the shipped page.

**The question is noticing, not presence** — and since Task 4.1.3 the landing
page at 390 is **seven stacked regions**, which is a taller scroll than the page
that measurement was taken against. **A reader at the top of that scroll is
further from the status bar than they were**, which is the case this task should
actually test: not _can you see it_ but _do you notice it change while you are
reading a figure_.
