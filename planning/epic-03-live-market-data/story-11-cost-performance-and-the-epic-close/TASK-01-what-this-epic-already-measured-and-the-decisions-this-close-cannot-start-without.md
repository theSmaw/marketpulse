# Task 3.11.1 — What this epic already measured, and the four decisions this close cannot start without

**Status:** Not started
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** nothing

## Objective

**Build nothing.** Read the eleven hand-off sections this story has accumulated,
mark each as _already answered_, _still owed_ or _no longer true_, and put the
four decisions to the owner.

## What the user can see when this lands

**Nothing.** This is the task that stops the other nine doing work that has
already been done — which in Story 3.10 removed most of two tasks and corrected
a premise three others were built on.

## Why this comes first, with the evidence

Story 3.10's equivalent task found that **§36's sentence already shipped**, that
**two of its eight criteria were already met**, and that the stopped chart edge
it was written to add **had been drawn since Story 2.12**. The pattern held
six times across that story: _looking first removed work._

This story is the most exposed to it, because it has been collecting hand-offs
from **eleven** sources over ten days and several of them have been superseded
by the story that wrote them.

## The eleven sections, each to be marked rather than re-read later

`STORY.md` carries hand-offs from Story 3.3's close, Task 3.1.6, Task 3.1.9's
weekend hold, Task 3.2.5, the slot question, Task 3.4.8, Story 3.5's close,
Task 3.6.4, Task 3.6.5, Story 3.7's close, Story 3.8's close, Story 3.9's close
and Story 3.10's close.

**At least three are known to have moved already**, which is the argument for
this task rather than a hypothesis:

- **Story 3.5's hand-off says §28's p95 is unmeasurable.** It is not, since
  2026-09-22: `sentAt` ships on every frame and Task 3.6.4 took the figure. The
  section says so itself, in an amendment. What survives is the **re-take**.
- **Task 3.1.6's cost premise halved** on 2026-09-17, from **$19.04** to
  **$9.26**, because minute bars arrive as a burst once a minute and a
  per-second threshold barely notices. The estimate this story measures against
  is the second number.
- **Task 3.4.8's §28 figure** was taken from Asia/Singapore over a 271–311 ms
  round trip production does not have.

## The four decisions, each with what constrains it

### 1. The budget, re-decided against a real reading

`marketpulse-monthly` is **$20** with alerts at 50/80/100%. The measured
estimate is **$9.26/month**, so the 50% alert at $10 sits **eight percent above
the total** and is already primed. §9.6's reversal trigger is **the first month
whose actual bill exceeds $12**.

**Epic 1 could read no bill at all** — both billing APIs refused, then answered
`[]` and `429`. This story is the first that can try.

### 2. Whether the deployed check asserts liveness

`check-deployed.mjs` runs after every merge, **at any hour**. It cannot assert a
live feed on a Sunday. The honest options: a criterion that asserts out of hours
only what is assertable out of hours, or **a scheduled check inside a session**,
which is a new mechanism rather than an assertion.

### 3. Whether CI holds a credential

Handed here by Story 3.3's close with two measured consequences: a spec
asserting an **absence** passed for four days after the words it forbade became
real, because they do not appear on an unconfigured deployment; and **no browser
test in this epic has ever watched a real vendor frame reach a screen.**

**It is a cost decision as much as a testing one** — a credential in CI is quota
on every push, against a free plan whose **single connection is already
contended** between the deployment and any developer.

### 4. What _watched_ means in the exit criterion

`LIVE-REHEARSAL.md` has dated rows for six of eleven stories and **not one was
watched by a person** — every row was a headless browser or a Node client, which
each row states on its face. The epic's exit criterion says _watched_. Decide
whether that is met, and if not, what Task 3.11.8's sitting has to do.

## Work

- Every hand-off section marked, in the file, with a date
- The four decisions put to the owner and written down with their rejected
  alternatives
- A correction to `STORY.md` for anything it asserts that is no longer true
- The list of figures criterion 1 has to re-take, extracted into one table
  rather than left across eleven sections

## Done when

1. Every hand-off section carries a verdict
2. The four decisions are answered and recorded
3. Criterion 1's re-take list exists as a table, with the instrument named for
   each figure
