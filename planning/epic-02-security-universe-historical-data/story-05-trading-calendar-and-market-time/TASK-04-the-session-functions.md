# Task 2.5.4 — The session functions, and the named dates that prove them

**Status:** Not started
**Story:** [2.5 Trading Calendar & Market Time Handling](STORY.md)
**Depends on:** Tasks 2.5.2 and 2.5.3

## Objective

Turn the boundary and the table into the small set of functions the rest of the product
consumes, and assert every one of them against the named dates Task 2.5.1 chose — including
acceptance criterion 3, which is that **"the last N sessions" returns sessions rather than
calendar days**.

This is the task the whole story exists for. Three later stories and one epic call these
functions.

## What the user can see when this lands

**Nothing on screen**, and this is the last task in the story of which that is true.
Task 2.5.5 is the visible one.

What can be demonstrated is worth a line in the write-up anyway: after this, the question
"how many trading days between two dates" has one answer in this codebase instead of three.

## Work

- **Write the smallest set that covers the four known consumers**, and write down which
  consumer each exists for, so a fifth function has to justify itself:
  - `isMarketOpen(instant)` — or rather, the session **state** at an instant, because the
    boolean loses the distinction between closed-for-the-night, closed-for-a-holiday and
    early-closed, and Task 2.5.5 renders that difference
  - the session **bounds** for a market date — open and close as instants, honouring half
    days, which is Story 2.8's "which minutes should have bars"
  - previous and next session from a date
  - sessions between two dates, and **the last N sessions**, which is Story 2.13's window
    control and criterion 3
- **Return a session as an object rather than a pair of times.** A half day is a session
  whose close is 13:00, and a caller that gets two instants has to be told separately that
  it was early. `market_bars` in Story 2.8 will want to say "this session should have 210
  bars, not 390" without re-deriving it
- **Every function takes an instant or a market date and never reads the clock.** That is
  Task 2.5.1's decision applied: the wall clock is read in exactly one place, which is Task
  2.5.5's, and everything here is a pure function of its arguments. It is also what makes
  these tests fast and what makes Epic 13's substitution a change to one module
- **Assert against the named-date list rather than against reasoning**, which is criterion 1
  and is worded that way deliberately. At minimum, and each as its own named test so a
  failure says which case broke:
  - a full holiday — and Good Friday separately, because it is the one a rule set misses
  - a half day, asserting the 13:00 close and the shortened bar count
  - a weekend, and the Friday and Monday either side
  - **both DST transitions**, asserting that the session is 6.5 hours on both days and that
    the UTC open moves by an hour between them — which is the assertion that fails if
    anything anywhere did arithmetic on instants
  - a holiday observed on the Friday before, and one on the Monday after
- **Assert the arithmetic check Task 2.5.3 named**: a full year counts to 252 sessions (or
  whatever the covered years genuinely are — count them, do not assume 252 for every year).
  It is one line and it catches a missing or invented holiday that every individual named
  date passes
- **Make the interesting ones fail before believing them.** Removing Good Friday from the
  table, and making the half-day close 16:00, should each take a named test red. A green
  suite on a calendar nobody broke is not evidence

## Done when

- Every named date from Task 2.5.1's list is asserted, each in a test named for its case
- "The last N sessions" returns sessions and is proved across a holiday week — the test that
  distinguishes it from `N` calendar days
- A half day's bounds and its expected bar count are both available to a caller
- No function in the module reads `Date.now()`
- Two deliberate breaks were each seen to fail and reverted
- `pnpm verify` passes with no database running

## Notes

The reason this is a separate task from 2.5.3 is that the data and the questions asked of it
fail differently: a wrong date in the table is a wrong answer on one day of the year, and a
wrong `nextSession` is a wrong answer every weekend. Keeping them apart means a red test
names which.
